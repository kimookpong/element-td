/* ============================================================
 *  Element TD 3D: Cloudflare Worker
 *  เสิร์ฟไฟล์เกมจาก dist/ (assets) และ API ที่ /api/*
 *  ข้อมูลเก็บใน D1 (binding DB) · ล็อกอินด้วย Google Identity Services (ID token)
 * ============================================================ */
import { computeScore, checkResult, MAP_IDS, DIFF_MULT } from '../src/score.js';

const SESSION_DAYS = 60;
const MAX_RUNS_PER_HOUR = 40;
const now = () => Math.floor(Date.now() / 1000);

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
const fail = (status, error) => json({ error }, status);

function randomId(bytes = 24) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function readJson(req) {
  try { return await req.json(); } catch { return null; }
}

/* ---------------- ตรวจ Google ID token (RS256) ---------------- */
let jwksCache = { keys: null, exp: 0 };
async function googleKeys() {
  if (jwksCache.keys && jwksCache.exp > Date.now()) return jwksCache.keys;
  const res = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  const data = await res.json();
  const m = /max-age=(\d+)/.exec(res.headers.get('cache-control') || '');
  jwksCache = { keys: data.keys, exp: Date.now() + (m ? Number(m[1]) : 3600) * 1000 };
  return data.keys;
}

const b64urlBytes = (s) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '='));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const b64urlJson = (s) => JSON.parse(new TextDecoder().decode(b64urlBytes(s)));

async function verifyGoogleToken(token, clientId) {
  const parts = String(token).split('.');
  if (parts.length !== 3) throw new Error('bad_token');
  const header = b64urlJson(parts[0]);
  const payload = b64urlJson(parts[1]);
  const jwk = (await googleKeys()).find((k) => k.kid === header.kid);
  if (!jwk || header.alg !== 'RS256') throw new Error('unknown_key');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!ok) throw new Error('bad_signature');
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)) throw new Error('bad_issuer');
  if (payload.aud !== clientId) throw new Error('bad_audience');
  if (!payload.exp || payload.exp < now()) throw new Error('expired');
  return payload;
}

/* ---------------- session ---------------- */
async function currentUser(req, env) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  return env.DB.prepare(
    'SELECT u.id, u.name, u.avatar FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?',
  ).bind(token, now()).first();
}

const cleanName = (s) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 20);

async function login(req, env) {
  const body = await readJson(req);
  if (!body || !body.credential) return fail(400, 'missing_credential');
  let sub, name, avatar;
  if (env.DEV_LOGIN === '1' && String(body.credential).startsWith('dev:')) {
    // ใช้ตอนทดสอบในเครื่องเท่านั้น (wrangler dev + .dev.vars)
    [, sub, name] = String(body.credential).split(':');
    avatar = '';
  } else {
    if (!env.GOOGLE_CLIENT_ID) return fail(503, 'login_disabled');
    let p;
    try { p = await verifyGoogleToken(body.credential, env.GOOGLE_CLIENT_ID); } catch (e) { return fail(401, e.message); }
    sub = p.sub; name = p.given_name || p.name || 'Player'; avatar = p.picture || '';
  }
  const id = `g:${sub}`;
  const existing = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
  if (existing) await env.DB.prepare('UPDATE users SET avatar = ? WHERE id = ?').bind(avatar, id).run();
  else await env.DB.prepare('INSERT INTO users (id, name, avatar, created_at) VALUES (?, ?, ?, ?)').bind(id, cleanName(name) || 'Player', avatar, now()).run();
  const token = randomId(32);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND expires_at < ?').bind(id, now()),
    env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').bind(token, id, now() + SESSION_DAYS * 86400),
  ]);
  const user = await env.DB.prepare('SELECT id, name, avatar FROM users WHERE id = ?').bind(id).first();
  return json({ token, user: publicUser(user) });
}

const publicUser = (u) => ({ name: u.name, avatar: u.avatar || '' });

async function logout(req, env) {
  const token = (req.headers.get('authorization') || '').slice(7);
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  return json({ ok: true });
}

/* ---------------- อันดับ ---------------- */
// คะแนนที่ดีที่สุดของแต่ละคนในแผนที่หนึ่ง
const BEST_SQL = `
  WITH best AS (
    SELECT user_id, score, cleared, diff, won, created_at,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY score DESC, created_at ASC) AS rn
    FROM games WHERE map = ?1
  )
  SELECT b.user_id, b.score, b.cleared, b.diff, b.won, u.name, u.avatar
  FROM best b JOIN users u ON u.id = b.user_id
  WHERE b.rn = 1
  ORDER BY b.score DESC, b.created_at ASC`;

async function myRank(env, map, userId) {
  const mine = await env.DB.prepare('SELECT MAX(score) AS s FROM games WHERE map = ? AND user_id = ?').bind(map, userId).first();
  if (!mine || mine.s == null) return null;
  const above = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM (SELECT user_id, MAX(score) AS s FROM games WHERE map = ? GROUP BY user_id) WHERE s > ?',
  ).bind(map, mine.s).first();
  return { rank: above.n + 1, score: mine.s };
}

async function leaderboard(url, env, user) {
  const map = url.searchParams.get('map');
  if (!MAP_IDS.includes(map)) return fail(400, 'bad_map');
  const { results } = await env.DB.prepare(`${BEST_SQL} LIMIT 5`).bind(map).all();
  const top = results.map((r, i) => ({ rank: i + 1, name: r.name, avatar: r.avatar || '', score: r.score, cleared: r.cleared, diff: r.diff, won: !!r.won, me: !!user && r.user_id === user.id }));
  const me = user ? await myRank(env, map, user.id) : null;
  return json({ map, top, me });
}

// อันดับ 1 ของทุกแผนที่ + คะแนนดีที่สุดของตัวเอง (ใช้บนการ์ดเลือกแผนที่)
async function summary(env, user) {
  const { results } = await env.DB.prepare(`
    WITH ranked AS (
      SELECT g.map, g.score, g.cleared, u.name,
             ROW_NUMBER() OVER (PARTITION BY g.map ORDER BY g.score DESC, g.created_at ASC) AS rn
      FROM games g JOIN users u ON u.id = g.user_id
    ) SELECT map, score, cleared, name FROM ranked WHERE rn = 1`).all();
  const out = {};
  for (const r of results) out[r.map] = { top: { name: r.name, score: r.score, cleared: r.cleared } };
  if (user) {
    const mine = await env.DB.prepare('SELECT map, MAX(score) AS score FROM games WHERE user_id = ? GROUP BY map').bind(user.id).all();
    for (const r of mine.results) (out[r.map] = out[r.map] || {}).mine = r.score;
  }
  return json(out);
}

/* ---------------- โปรไฟล์ ---------------- */
async function me(env, user) {
  const recent = await env.DB.prepare(
    'SELECT map, diff, score, cleared, lives, kills, won, duration, created_at FROM games WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
  ).bind(user.id).all();
  const best = await env.DB.prepare(`
    SELECT map, score, cleared, diff FROM (
      SELECT map, score, cleared, diff, ROW_NUMBER() OVER (PARTITION BY map ORDER BY score DESC) AS rn
      FROM games WHERE user_id = ?) WHERE rn = 1`).bind(user.id).all();
  const stats = await env.DB.prepare(
    'SELECT COUNT(*) AS games, COALESCE(MAX(cleared), 0) AS bestWave, COALESCE(SUM(won), 0) AS wins, COALESCE(MAX(score), 0) AS topScore FROM games WHERE user_id = ?',
  ).bind(user.id).first();
  const bestByMap = {};
  for (const b of best.results) bestByMap[b.map] = { score: b.score, cleared: b.cleared, diff: b.diff, rank: (await myRank(env, b.map, user.id))?.rank || null };
  return json({
    user: publicUser(user),
    stats,
    recent: recent.results.map((g) => ({ ...g, won: !!g.won })),
    best: bestByMap,
  });
}

async function rename(req, env, user) {
  const body = await readJson(req);
  const name = cleanName(body && body.name);
  if (name.length < 2) return fail(400, 'bad_name');
  await env.DB.prepare('UPDATE users SET name = ? WHERE id = ?').bind(name, user.id).run();
  return json({ user: { name, avatar: user.avatar || '' } });
}

/* ---------------- รอบเล่นและผลเกม ---------------- */
async function startRun(req, env, user) {
  const body = await readJson(req);
  if (!body || !MAP_IDS.includes(body.map) || !DIFF_MULT[body.diff]) return fail(400, 'bad_run');
  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM runs WHERE user_id = ? AND started_at > ?').bind(user.id, now() - 3600).first();
  if (recent.n >= MAX_RUNS_PER_HOUR) return fail(429, 'too_many_runs');
  const id = randomId(16);
  await env.DB.prepare('INSERT INTO runs (id, user_id, map, diff, started_at, version) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, user.id, body.map, body.diff, now(), String(body.version || '').slice(0, 16)).run();
  return json({ runId: id });
}

async function finishRun(req, env, user, runId) {
  const run = await env.DB.prepare('SELECT * FROM runs WHERE id = ? AND user_id = ?').bind(runId, user.id).first();
  if (!run) return fail(404, 'no_run');
  const body = await readJson(req);
  if (!body) return fail(400, 'bad_body');
  const r = { map: run.map, diff: run.diff, cleared: body.cleared, lives: body.lives, kills: body.kills };
  const elapsed = now() - run.started_at;
  const bad = checkResult(r, elapsed);
  if (bad) return fail(422, bad);
  const score = computeScore(r); // คิดคะแนนเองที่เซิร์ฟเวอร์ ไม่ใช้ตัวเลขจากเกม
  const won = body.won ? 1 : 0;
  const duration = Math.max(0, Math.min(Number(body.duration) | 0, elapsed));
  await env.DB.prepare(`
    INSERT INTO games (run_id, user_id, map, diff, score, cleared, lives, kills, won, duration, version, created_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
    ON CONFLICT(run_id) DO UPDATE SET score = ?5, cleared = ?6, lives = ?7, kills = ?8, won = MAX(games.won, ?9), duration = ?10, created_at = ?12
    WHERE ?5 > games.score`)
    .bind(runId, user.id, run.map, run.diff, score, r.cleared, r.lives, r.kills, won, duration, run.version, now()).run();
  const rank = await myRank(env, run.map, user.id);
  const saved = await env.DB.prepare('SELECT score FROM games WHERE run_id = ?').bind(runId).first();
  return json({ score, saved: saved ? saved.score : score, best: rank ? rank.score : score, rank: rank ? rank.rank : null });
}

/* ---------------- router ---------------- */
async function api(req, env, url) {
  const path = url.pathname.replace(/^\/api/, '');
  const method = req.method;
  if (path === '/config' && method === 'GET') {
    // จำนวนผู้เล่นที่ลงทะเบียน (โชว์ที่ footer) ถ้า DB มีปัญหาให้ config ยังใช้ได้
    const n = await env.DB.prepare('SELECT count(*) AS n FROM users').first().catch(() => null);
    return json({ googleClientId: env.GOOGLE_CLIENT_ID || '', devLogin: env.DEV_LOGIN === '1', users: n ? n.n : 0 });
  }
  if (path === '/auth/google' && method === 'POST') return login(req, env);
  const user = await currentUser(req, env);
  if (path === '/leaderboard' && method === 'GET') return leaderboard(url, env, user);
  if (path === '/summary' && method === 'GET') return summary(env, user);
  if (!user) return fail(401, 'login_required');
  if (path === '/auth/logout' && method === 'POST') return logout(req, env);
  if (path === '/me' && method === 'GET') return me(env, user);
  if (path === '/me' && method === 'PATCH') return rename(req, env, user);
  if (path === '/runs' && method === 'POST') return startRun(req, env, user);
  const m = /^\/runs\/([a-f0-9]{32})\/finish$/.exec(path);
  if (m && method === 'POST') return finishRun(req, env, user, m[1]);
  return fail(404, 'not_found');
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) {
      try { return await api(req, env, url); } catch (e) { console.error(e); return fail(500, 'server_error'); }
    }
    return env.ASSETS.fetch(req);
  },
};
