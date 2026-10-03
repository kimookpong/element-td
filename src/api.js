/* ============================================================
 *  เชื่อมต่อ API บน Cloudflare Worker (/api/*)
 *  ถ้าเปิดเกมจากที่ที่ไม่มี API (เช่น GitHub Pages) จะเล่นแบบ Guest อย่างเดียว
 * ============================================================ */
const BASE = './api';
const TOKEN_KEY = 'etd_token';
const USER_KEY = 'etd_user';
const PENDING_KEY = 'etd_pending';

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
};

let token = store.get(TOKEN_KEY);
let user = null;
try { user = JSON.parse(store.get(USER_KEY) || 'null'); } catch (e) { user = null; }
if (!token) user = null;
let config = null;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());

async function call(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body) headers['content-type'] = 'application/json';
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  if (res.status === 401 && token && path !== '/auth/google') setSession(null, null);
  if (!res.ok) { const err = new Error((data && data.error) || `http_${res.status}`); err.status = res.status; throw err; }
  return data;
}

function setSession(t, u) {
  token = t; user = u;
  store.set(TOKEN_KEY, t);
  store.set(USER_KEY, u ? JSON.stringify(u) : null);
  emit();
}

// ผลเกมที่ส่งไม่สำเร็จ (เน็ตหลุด) เก็บไว้ส่งใหม่ภายหลัง
function pending() { try { return JSON.parse(store.get(PENDING_KEY) || '[]'); } catch (e) { return []; } }
function savePending(list) { store.set(PENDING_KEY, list.length ? JSON.stringify(list.slice(-10)) : null); }

export const Api = {
  get ready() { return !!config; },
  get online() { return !!config; },
  get loginEnabled() { return !!config && (!!config.googleClientId || !!config.devLogin); },
  get config() { return config; },
  get user() { return user; },
  get loggedIn() { return !!token && !!user; },
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  async init() {
    try { config = await call('/config'); } catch (e) { config = null; emit(); return false; }
    emit();
    this.flushPending();
    return true;
  },

  async loginWithGoogle(credential) {
    const data = await call('/auth/google', { method: 'POST', body: { credential } });
    setSession(data.token, data.user);
    this.flushPending();
    return data.user;
  },
  async logout() {
    try { await call('/auth/logout', { method: 'POST' }); } catch (e) { /* ignore */ }
    setSession(null, null);
  },
  async rename(name) {
    const data = await call('/me', { method: 'PATCH', body: { name } });
    setSession(token, data.user);
    return data.user;
  },
  me() { return call('/me'); },
  leaderboard(map) { return call(`/leaderboard?map=${encodeURIComponent(map)}`); },
  summary() { return call('/summary'); },

  async startRun(map, diff, version) {
    if (!this.loggedIn) return null;
    try { return (await call('/runs', { method: 'POST', body: { map, diff, version } })).runId; } catch (e) { return null; }
  },
  // ส่งผลเกม: คืน { score, rank, ... } หรือ { queued: true } ถ้าเน็ตมีปัญหา
  async finishRun(runId, result) {
    if (!runId || !this.loggedIn) return null;
    try {
      return await call(`/runs/${runId}/finish`, { method: 'POST', body: result });
    } catch (e) {
      if (e.status && e.status < 500) return { error: e.message };
      savePending([...pending().filter((p) => p.runId !== runId), { runId, result }]);
      return { queued: true };
    }
  },
  async flushPending() {
    if (!this.loggedIn) return;
    const list = pending();
    if (!list.length) return;
    const left = [];
    for (const p of list) {
      try { await call(`/runs/${p.runId}/finish`, { method: 'POST', body: p.result }); } catch (e) { if (!e.status || e.status >= 500) left.push(p); }
    }
    savePending(left);
  },
};
