/* ============================================================
 *  Element TD — ตรรกะเกม (ไม่ขึ้นกับการเรนเดอร์)
 *  พิกัดเป็นพิกเซลบนกระดาน 800×480 (TILE = 40)
 *  ฝั่งเรนเดอร์อ่าน state และ events เพื่อแสดงผล
 * ============================================================ */
import {
  TILE, COLS, ROWS, ELEMENTS, ELEMENT_ORDER, elementMultiplier,
  BASIC, ELEMENT_TOWER, MAX_TIER, MAX_ELEMENT_LEVEL,
  ABILITIES, WAVE_PATTERN, MAPS, DIFFICULTIES, TOTAL_WAVES, MAP_AFFINITY_CHANCE, MAP_AFFINITY_BONUS,
  ELEMENT_POINT_EVERY, START_ELEMENT_POINTS, LEAK_LIVES, BOSS_LIFE_REWARD, SELL_RATIO, INTEREST_RATE,
  FIRST_WAVE_DELAY, CLEAR_GAP, BUILD_TIME, upgradeTime, ELEMENTAL_HP, mineGold,
} from './data.js';
import { towerDef } from './towers.js';
import { t as tt, tr, elName } from './i18n.js';

const EN_ = (el) => elName(ELEMENTS[el]);

export const TARGET_MODES = ['first', 'last', 'strong', 'close'];
export const SAVE_VERSION = 1;
export const TARGET_LABEL = { get first() { return tt('target.first'); }, get last() { return tt('target.last'); }, get strong() { return tt('target.strong'); }, get close() { return tt('target.close'); } };

const N = COLS * ROWS;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
export const idx = (c, r) => r * COLS + c;
export const tileCenter = (i) => ({ x: (i % COLS) * TILE + TILE / 2, y: Math.floor(i / COLS) * TILE + TILE / 2 });

/* ---------------- แผนที่ ---------------- */
export function parseMap(def) {
  const tiles = def.layout.map((row) => row.split(''));
  if (tiles.length !== ROWS || tiles.some((r) => r.length !== COLS)) throw new Error(`map ${def.id}: bad size`);
  const walk = new Uint8Array(N);
  const build = new Uint8Array(N);
  let spawn = -1, core = -1;
  const cps = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = tiles[r][c];
      const i = idx(c, r);
      if (ch === '.') { walk[i] = 1; build[i] = 1; }
      else if (ch === '#') build[i] = 1;
      else if (ch === '=') walk[i] = 1;
      else if (ch === 'S') { walk[i] = 1; spawn = i; }
      else if (ch === 'C') { walk[i] = 1; core = i; }
      else if (ch >= '1' && ch <= '9') { walk[i] = 1; cps.push([Number(ch), i]); }
    }
  }
  cps.sort((a, b) => a[0] - b[0]);
  const goals = [...cps.map((x) => x[1]), core];
  const outward = (i) => {
    const c = i % COLS, r = Math.floor(i / COLS);
    if (c === 0) return { x: -1, y: 0 };
    if (c === COLS - 1) return { x: 1, y: 0 };
    if (r === 0) return { x: 0, y: -1 };
    if (r === ROWS - 1) return { x: 0, y: 1 };
    return { x: 0, y: 0 };
  };
  return { def, tiles, walk, build, spawn, core, goals, spawnOut: outward(spawn), coreOut: outward(core) };
}

const DIRS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

/* Dijkstra จากเป้าหมาย → ได้ระยะทางและช่องถัดไปของทุกช่อง */
function computeField(map, blocked, goal) {
  const dist = new Float32Array(N).fill(Infinity);
  const next = new Int16Array(N).fill(-1);
  const done = new Uint8Array(N);
  const pass = (i) => map.walk[i] && !blocked[i];
  dist[goal] = 0;
  const open = [goal];
  while (open.length) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (dist[open[k]] < dist[open[bi]]) bi = k;
    const cur = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    if (done[cur]) continue;
    done[cur] = 1;
    const c = cur % COLS, r = Math.floor(cur / COLS);
    for (const [dc, dr, cost] of DIRS) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
      const ni = idx(nc, nr);
      if (!pass(ni) || done[ni]) continue;
      if (dc && dr && (!pass(idx(c + dc, r)) || !pass(idx(c, r + dr)))) continue;
      const nd = dist[cur] + cost;
      if (nd < dist[ni]) {
        dist[ni] = nd;
        next[ni] = cur;
        open.push(ni);
      }
    }
  }
  return { dist, next };
}

/* ---------------- HP ตามเวฟ ----------------
 * เวฟ 1–30: สูตรเดิม (+17% ต่อเวฟ)
 * เวฟ 31+: โตตาม "ทองสะสมที่หาได้" (ราว n^2.1) เพราะ DPS ของผู้เล่นโตตามทอง
 *          — โตเร็วช่วงต้น (~7%/เวฟ) แล้วค่อย ๆ ชะลอ (~2%/เวฟ ช่วงเวฟ 90–100)
 *          บวกความยากอีก 30% ภายในเวฟ 100 (ป้อมสามธาตุคุ้มทองกว่า) — เวฟ 100 ≈ 16 เท่าของเวฟ 30
 *          (จำนวนมอนสเตอร์ไม่ต้องหักออก เพราะปล่อยทีละตัวห่างเท่าเดิม เวฟยาวขึ้นแทน)
 */
const HP_KNEE = 30;
const waveCount = (n) => 10 + Math.floor(n * 0.35);
export function waveBaseHp(n) {
  const early = (k) => 32 * Math.pow(1.17, k - 1) + k * 6;
  if (n <= HP_KNEE) return early(n);
  const gold = Math.pow(n / HP_KNEE, 2.1);
  const ramp = 1 + 0.3 * Math.min(1, (n - HP_KNEE) / 70);
  return early(HP_KNEE) * gold * ramp;
}

/* ---------------- ค่าสถานะป้อม ---------------- */
export function towerStats(t) {
  if (t.kind === 'basic') {
    const B = BASIC[t.base];
    const L = t.tier - 1;
    if (B.support) {
      // ป้อมสนับสนุน: ไม่โจมตี
      const sp = B.support;
      const support = { kind: sp.kind };
      if (sp.amt) support.amt = sp.amt[L];
      if (sp.every) support.every = sp.every[L];
      if (sp.mul) support.mul = sp.mul[L];
      return { dps: 0, rate: 0, dmg: 0, range: B.range || 0, support };
    }
    const rate = B.rate * (1 + 0.1 * L);
    const dps = B.dps[L];
    const s = { dps, rate, dmg: dps / rate, range: B.range * (1 + 0.08 * L) };
    if (B.splash) s.splash = B.splash[L];
    return s;
  }
  const n = t.elements.length;
  const def = towerDef(t.elements);
  const dps = ELEMENT_TOWER[n].dps[t.tier - 1] * def.dpsF;
  const rate = def.rate;
  const dmg = dps / rate;
  const lv = Math.min(MAX_ELEMENT_LEVEL, t.tier + n - 1);
  const range = def.range >= 1000 ? def.range : def.range * (1 + 0.08 * (t.tier - 1));
  return { dps, rate, dmg, range, atk: def.atk, ...def.fx(lv, dps, dmg) };
}

export function towerName(t) {
  if (t.kind === 'basic') return tr(BASIC[t.base], 'th');
  const d = towerDef(t.elements);
  return d ? tr(d, 'th') : '?';
}

export function comboName(els) {
  const d = towerDef(els);
  return d ? tr(d, 'th') : '?';
}

export const buildCost = (type) => (BASIC[type] ? BASIC[type].cost[0] : ELEMENT_TOWER[1].cum[0]);
export const sellValue = (t) => Math.floor(t.spent * SELL_RATIO);

function maxTier(t) { return t.kind === 'basic' ? 3 : MAX_TIER[t.elements.length]; }

/* ============================================================ */
export class Game {
  constructor(mapIndex, diffKey) {
    this.mapIndex = mapIndex;
    this.diffKey = diffKey;
    this.diff = DIFFICULTIES[diffKey];
    this.map = parseMap(MAPS[mapIndex]);
    this.gold = this.diff.gold;
    this.lives = this.diff.lives;
    this.wave = 0;
    this.spawnQueue = [];
    this.waveInfo = {};
    this.nextWaveIn = FIRST_WAVE_DELAY;
    this.towers = [];
    this.creeps = [];
    this.projectiles = [];
    this.zones = [];
    this.movers = [];
    this.delayed = [];
    this.over = false;
    this.won = false;
    this.endless = false;
    this.time = 0;
    this.kills = 0;
    this.nextId = 1;
    this.events = [];
    this.towerGrid = new Array(N).fill(null);
    this.blocked = new Uint8Array(N);
    this.elemPoints = START_ELEMENT_POINTS;
    this.elemLevel = Object.fromEntries(ELEMENT_ORDER.map((e) => [e, 0]));
    this.lastElement = null;
    this.routeVersion = 0;
    this.recomputeFields();
    this.flyPath = this.computeFlyPath();
    this.nextWaveData = this.makeWave(1);
    this.pendingElem = {};
  }

  // มีมอนสเตอร์ในสนามหรือรอออกมาอยู่หรือไม่
  get waveActive() { return this.spawnQueue.length > 0 || this.creeps.some((e) => e.alive); }

  /* ---------- บันทึก / โหลดเกม ----------
   * บันทึกเฉพาะช่วงระหว่างเวฟ (ไม่มีมอนสเตอร์อยู่ในสนาม) เพื่อให้สถานะสมบูรณ์เสมอ
   */
  serialize() {
    return {
      v: SAVE_VERSION,
      mapIndex: this.mapIndex,
      diffKey: this.diffKey,
      gold: this.gold,
      lives: this.lives,
      wave: this.wave,
      kills: this.kills,
      endless: this.endless,
      won: this.won,
      elemPoints: this.elemPoints,
      elemLevel: { ...this.elemLevel },
      lastElement: this.lastElement,
      nextWaveData: this.nextWaveData,
      nextId: this.nextId,
      nextWaveIn: this.nextWaveIn,
      runId: this.runId || null,
      playTime: Math.round(this.time),
      towers: this.towers.map((t) => ({
        c: t.c, r: t.r, kind: t.kind, base: t.base, elements: t.elements.slice(), tier: t.tier,
        spent: t.spent, mode: t.mode, kills: t.kills, dmgDealt: Math.round(t.dmgDealt),
        build: t.build ? { ...t.build } : null, charge: t.charge || 0,
      })),
    };
  }

  static restore(data) {
    if (!data || data.v !== SAVE_VERSION || !MAPS[data.mapIndex] || !DIFFICULTIES[data.diffKey]) return null;
    const g = new Game(data.mapIndex, data.diffKey);
    for (const k of ['gold', 'lives', 'wave', 'kills', 'endless', 'won', 'elemPoints', 'lastElement', 'nextId', 'nextWaveIn', 'runId']) {
      if (data[k] !== undefined) g[k] = data[k];
    }
    for (const e of ELEMENT_ORDER) g.elemLevel[e] = Math.max(0, Math.min(MAX_ELEMENT_LEVEL, data.elemLevel?.[e] | 0));
    if (data.nextWaveData) g.nextWaveData = data.nextWaveData;
    if (data.playTime > 0) g.time = data.playTime;
    for (const s of data.towers || []) {
      if (s.c < 0 || s.c >= COLS || s.r < 0 || s.r >= ROWS) continue;
      const i = idx(s.c, s.r);
      if (!g.map.build[i] || g.towerGrid[i]) continue;
      const t = {
        id: g.nextId++, c: s.c, r: s.r, i,
        x: s.c * TILE + TILE / 2, y: s.r * TILE + TILE / 2,
        kind: s.kind === 'basic' ? 'basic' : 'element', base: s.base || null,
        elements: (s.elements || []).filter((e) => ELEMENTS[e]), tier: s.tier || 1,
        spent: s.spent || 0, cd: 0.3, angle: -Math.PI / 2,
        mode: TARGET_MODES.includes(s.mode) ? s.mode : 'first', kills: s.kills || 0, dmgDealt: s.dmgDealt || 0, version: 0,
        build: s.build && s.build.t > 0 ? { t: s.build.t, total: s.build.total || s.build.t, kind: s.build.kind || 'build' } : null,
        charge: s.charge || 0,
      };
      if (t.kind === 'basic' && !BASIC[t.base]) continue;
      if (t.kind === 'element' && !t.elements.length) continue;
      while (t.kind === 'element' && t.elements.length > 1 && !towerDef(t.elements)) t.elements.pop();
      if (t.kind === 'element') t.tier = Math.min(t.tier, MAX_TIER[t.elements.length]);
      t.stats = towerStats(t);
      g.towers.push(t);
      g.towerGrid[i] = t;
      if (g.map.walk[i]) g.blocked[i] = 1;
    }
    if (typeof g.nextWaveIn !== 'number' || g.nextWaveIn < 0) g.nextWaveIn = CLEAR_GAP * 2;
    g.recomputeFields();
    return g;
  }

  emit(type, data = {}) { this.events.push({ type, ...data }); }
  sound(name, throttle = 0) { this.emit('sound', { name, throttle }); }
  toast(text, ms = 1200) { this.emit('toast', { text, ms }); }
  floater(x, y, text, color, size = 12, h = 0) { this.emit('floater', { x, y, text, color, size, h }); }

  /* ---------- เส้นทาง ---------- */
  recomputeFields() {
    this.fields = this.map.goals.map((g) => computeField(this.map, this.blocked, g));
    this.routeVersion += 1;
  }

  // เส้นทางจากจุดเกิดผ่านทุกจุดตรวจ (สำหรับแสดงผล)
  getRoute() {
    const pts = [];
    let cur = this.map.spawn;
    pts.push(cur);
    for (let s = 0; s < this.fields.length; s++) {
      const f = this.fields[s];
      let guard = 0;
      while (cur !== this.map.goals[s] && guard++ < N) {
        cur = f.next[cur];
        if (cur < 0) return pts;
        pts.push(cur);
      }
    }
    return pts;
  }

  // เส้นทางบิน: แผนที่เขาวงกตบินตรงผ่านจุดตรวจ, แผนที่ทางตายตัวบินตามมุมของถนน
  computeFlyPath() {
    const m = this.map;
    const isMaze = m.tiles.some((row) => row.includes('.'));
    if (isMaze) return [m.spawn, ...m.goals];
    const route = this.getRoute();
    const pts = [route[0]];
    for (let k = 1; k < route.length - 1; k++) {
      const a = route[k - 1], b = route[k], c = route[k + 1];
      if (b - a !== c - b) pts.push(b);
    }
    pts.push(route[route.length - 1]);
    return pts;
  }

  tileAt(x, y) {
    const c = Math.floor(x / TILE), r = Math.floor(y / TILE);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return -1;
    return idx(c, r);
  }

  /* ตรวจว่าวางป้อมที่ช่องนี้ได้หรือไม่ (รวมถึงห้ามปิดทาง) */
  checkBuild(c, r) {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return { ok: false, reason: tt('sim.outside') };
    const i = idx(c, r);
    const m = this.map;
    if (!m.build[i]) return { ok: false, reason: tt('sim.cantBuild') };
    if (this.towerGrid[i]) return { ok: false, reason: tt('sim.occupied') };
    if (!m.walk[i]) return { ok: true };
    const { x, y } = tileCenter(i);
    for (const e of this.creeps) {
      if (e.alive && !e.flying && Math.abs(e.x - x) < TILE * 0.85 && Math.abs(e.y - y) < TILE * 0.85) {
        return { ok: false, reason: tt('sim.creepHere') };
      }
    }
    this.blocked[i] = 1;
    const fields = m.goals.map((g) => computeField(m, this.blocked, g));
    this.blocked[i] = 0;
    for (let s = 0; s < fields.length; s++) {
      const start = s === 0 ? m.spawn : m.goals[s - 1];
      if (!Number.isFinite(fields[s].dist[start])) return { ok: false, reason: tt('sim.blockPath') };
    }
    for (const e of this.creeps) {
      if (!e.alive || e.flying) continue;
      const ti = this.tileAt(e.x, e.y);
      if (ti >= 0 && !Number.isFinite(fields[e.stage].dist[ti])) return { ok: false, reason: tt('sim.trap') };
    }
    return { ok: true, fields };
  }

  /* ---------- ธาตุ ---------- */
  buyElement(el) {
    if (this.elemPoints <= 0) { this.sound('error'); this.toast(tt('sim.noEssence'), 900); return false; }
    if (this.elemLevel[el] >= MAX_ELEMENT_LEVEL) { this.sound('error'); return false; }
    if (this.pendingElem[el]) { this.sound('error'); this.toast(tt('sim.guardianAlive', { el: EN_(el) }), 1100); return false; }
    // ใช้ผลึก = เรียกภูตพิทักษ์ธาตุ ต้องกำจัดให้ได้ก่อนจึงปลดล็อก/อัปเลเวล
    this.elemPoints -= 1;
    const lv = this.elemLevel[el] + 1;
    this.pendingElem[el] = lv;
    const hp = this.waveHp(this.wave + 1) * ELEMENTAL_HP[lv - 1];
    this.spawnCreep({ ability: 'elemental', element: el, wave: -1, unlock: lv }, hp);
    this.toast(tt('sim.guardianSpawn', { icon: ELEMENTS[el].icon, el: EN_(el), lv }), 2000);
    this.sound('boss');
    this.emit('changed');
    return true;
  }

  // ภูตธาตุถูกกำจัด → ได้เลเวลธาตุ
  elementalDefeated(e) {
    const el = e.element, lv = e.unlock;
    delete this.pendingElem[el];
    this.elemLevel[el] = Math.max(this.elemLevel[el], lv);
    this.toast(tt('sim.guardianDown', { icon: ELEMENTS[el].icon, el: EN_(el), lv }), 1800);
    this.emit('elementUp', { el, lv });
    this.sound('fuse');
    this.emit('changed');
  }

  /* ---------- ป้อม ---------- */
  canBuildType(type) {
    if (BASIC[type]) {
      const max = BASIC[type].max;
      if (max && this.towers.filter((t) => t.base === type).length >= max) return { ok: false, reason: tt('sim.maxBuilt', { n: max }) };
      return { ok: true };
    }
    if (this.elemLevel[type] < 1) return { ok: false, reason: tt(this.pendingElem[type] ? 'sim.killGuardian' : 'sim.summonGuardian', { el: EN_(type) }) };
    return { ok: true };
  }

  placeTower(type, c, r) {
    const req = this.canBuildType(type);
    if (!req.ok) { this.sound('error'); this.toast(req.reason, 1100); return false; }
    const cost = buildCost(type);
    if (this.gold < cost) { this.sound('error'); this.toast(tt('sim.noGold'), 900); return false; }
    const chk = this.checkBuild(c, r);
    if (!chk.ok) { this.sound('error'); this.toast(chk.reason, 1100); return false; }
    this.gold -= cost;
    const i = idx(c, r);
    const basic = !!BASIC[type];
    const t = {
      id: this.nextId++, c, r, i,
      x: c * TILE + TILE / 2, y: r * TILE + TILE / 2,
      kind: basic ? 'basic' : 'element', base: basic ? type : null,
      elements: basic ? [] : [type], tier: 1,
      spent: cost, cd: 0.3, angle: -Math.PI / 2,
      mode: 'first', kills: 0, dmgDealt: 0, version: 0,
      build: { t: basic ? BUILD_TIME.basic : BUILD_TIME.element, total: basic ? BUILD_TIME.basic : BUILD_TIME.element, kind: 'build' },
    };
    t.stats = towerStats(t);
    this.towers.push(t);
    this.towerGrid[i] = t;
    if (this.map.walk[i]) {
      this.blocked[i] = 1;
      this.fields = chk.fields;
      this.routeVersion += 1;
    }
    this.emit('build', { tower: t });
    this.sound('build');
    this.emit('changed');
    return true;
  }

  /* ตัวเลือกอัปเกรดของป้อม */
  upgradeOptions(t) {
    const opts = [];
    const lvOk = (els, need) => els.every((e) => this.elemLevel[e] >= need);
    if (t.tier < maxTier(t)) {
      let cost, need = null;
      if (t.kind === 'basic') cost = BASIC[t.base].cost[t.tier];
      else {
        const T = ELEMENT_TOWER[t.elements.length];
        cost = T.cum[t.tier] - T.cum[t.tier - 1];
        if (!lvOk(t.elements, t.tier + 1)) need = tt('sim.needLv', { els: t.elements.map(EN_).join('+'), lv: t.tier + 1 });
      }
      opts.push({ type: 'tier', cost, ok: !need, reason: need, label: tt('sim.upTo', { n: t.tier + 1 }) });
    }
    if (t.kind === 'element' && t.elements.length < 3) {
      const n = t.elements.length;
      const newTier = Math.min(t.tier, MAX_TIER[n + 1]);
      for (const e of ELEMENT_ORDER) {
        if (t.elements.includes(e)) continue;
        const els = [...t.elements, e];
        if (!towerDef(els)) continue;
        const cost = ELEMENT_TOWER[n + 1].cum[newTier - 1] - ELEMENT_TOWER[n].cum[t.tier - 1];
        const ok = lvOk(els, newTier);
        opts.push({
          type: 'add', el: e, els, tier: newTier, cost, ok,
          reason: ok ? null : tt('sim.needElLv', { el: EN_(e), lv: newTier }) + (newTier > 1 ? tt('sim.needSame') : ''),
          label: comboName(els),
        });
      }
    }
    return opts;
  }

  applyUpgrade(t, opt) {
    if (t.build) { this.sound('error'); this.toast(tt('sim.building'), 1000); return false; }
    if (!opt.ok) { this.sound('error'); this.toast(opt.reason, 1400); return false; }
    if (this.gold < opt.cost) { this.sound('error'); this.toast(tt('sim.noGold'), 900); return false; }
    this.gold -= opt.cost;
    t.spent += opt.cost;
    const bt = upgradeTime(opt.type, t.tier, t.elements.length);
    if (opt.type === 'tier') t.tier += 1;
    else { t.elements = opt.els; t.tier = opt.tier; }
    t.stats = towerStats(t);
    t.version += 1;
    t.build = { t: bt, total: bt, kind: 'upgrade' };
    if (opt.type === 'add') {
      this.emit('fuse', { tower: t, els: t.elements });
      this.toast(tt('sim.fusing', { name: towerName(t) }), 1600);
      this.sound('fuse');
    } else {
      this.emit('upgrade', { tower: t });
      this.sound('upgrade');
    }
    this.emit('changed');
    return true;
  }

  upgradeTier(t) {
    const o = this.upgradeOptions(t).find((x) => x.type === 'tier');
    return o ? this.applyUpgrade(t, o) : false;
  }

  sellTower(t) {
    // ขายระหว่างสร้างครั้งแรก ได้เงินคืนเต็มจำนวน
    const v = t.build && t.build.kind === 'build' ? t.spent : sellValue(t);
    this.gold += v;
    this.towers = this.towers.filter((x) => x !== t);
    this.towerGrid[t.i] = null;
    if (this.blocked[t.i]) {
      this.blocked[t.i] = 0;
      this.recomputeFields();
    }
    this.floater(t.x, t.y, `+${v}`, '#ffcf4a', 14);
    this.emit('sell', { tower: t });
    this.sound('sell');
    this.emit('changed');
  }

  cycleMode(t) {
    t.mode = TARGET_MODES[(TARGET_MODES.indexOf(t.mode) + 1) % TARGET_MODES.length];
    this.emit('changed');
  }

  /* ---------- เวฟ ---------- */
  /* HP มอนสเตอร์ต่อตัวของเวฟ n — ช่วงต้นโตเร็ว (เหมือนเดิมถึงเวฟ 30) แล้วค่อย ๆ ชะลอให้เล่นได้ถึงเวฟ 100 */
  waveHp(n) { return waveBaseHp(n) * this.diff.hp; }

  makeWave(n) {
    let ability;
    if (n <= 3) ability = n === 2 ? 'fast' : 'normal';
    else ability = WAVE_PATTERN[(n - 1) % WAVE_PATTERN.length];
    if (n > TOTAL_WAVES && n % 5 === 0) ability = 'boss';
    let element;
    const home = this.map.def.element;
    if (home && this.lastElement !== home && Math.random() < MAP_AFFINITY_CHANCE) element = home;
    else do { element = pick(ELEMENT_ORDER); } while (element === this.lastElement);
    this.lastElement = element;
    const hpScale = this.waveHp(n);
    const entries = [];
    let t = 0;
    const add = (ab, gap) => { entries.push({ ability: ab, element, t }); t += gap; };
    if (ability === 'boss') {
      for (let i = 0; i < 6; i++) add('normal', 0.9);
      t += 2;
      add('boss', 0);
    } else {
      const count = Math.round(waveCount(n) * (ability === 'flying' ? 0.7 : 1));
      const gap = { fast: 0.45, armored: 1.0, split: 1.1, flying: 0.75 }[ability] || 0.8;
      for (let i = 0; i < count; i++) add(ability, gap);
    }
    return { n, element, ability, entries, hpScale, count: entries.length };
  }

  startWave() {
    if (this.over) return false;
    if (this.wave >= TOTAL_WAVES && !this.endless) return false;
    this.wave += 1;
    const n = this.wave;
    const w = this.nextWaveData || this.makeWave(n);
    for (const e of w.entries) this.spawnQueue.push({ ...e, t: this.time + e.t, wave: n, hpScale: w.hpScale });
    this.spawnQueue.sort((a, b) => a.t - b.t);
    this.waveInfo[n] = { pending: w.entries.length, alive: 0 };
    this.nextWaveData = this.makeWave(n + 1);
    this.nextWaveIn = null;
    const A = ABILITIES[w.ability];
    if (w.ability === 'boss') {
      this.sound('boss');
      this.toast(tt('sim.bossWave', { el: EN_(w.element) }), 2200);
    } else {
      this.sound('wave');
      this.toast(tt('sim.wave', { n, icon: A.icon, creature: tr(A, 'creature'), el: EN_(w.element) }), 1500);
    }
    this.emit('waveStart', { n });
    this.emit('changed');
    return true;
  }

  // เมื่อมอนสเตอร์ของเวฟหนึ่งหมดสนาม
  creepRemoved(e) {
    const info = this.waveInfo[e.wave];
    if (!info) return;
    info.alive -= 1;
    if (info.alive <= 0 && info.pending <= 0) {
      delete this.waveInfo[e.wave];
      this.waveCleared(e.wave);
    }
  }

  waveCleared(n) {
    if (this.over) return;
    const bonus = 20 + n * 4;
    const interest = Math.floor(Math.min(this.gold * INTEREST_RATE, 20 + n * 5));
    this.gold += bonus + interest;
    this.emit('waveEnd', { n, bonus, interest });
    this.supportPayout(n);
    if (n % ELEMENT_POINT_EVERY === 0) {
      this.elemPoints += 1;
      this.emit('elementPoint');
      this.sound('win');
    }
    if (n >= TOTAL_WAVES && !this.endless && !this.won && !this.waveActive) {
      this.won = true;
      this.sound('win');
      this.emit('win');
    }
    this.emit('changed');
  }

  /* ป้อมสนับสนุนหลังเคลียร์เวฟ: เหมืองทองให้ทอง · ศาลหัวใจสะสมจนได้ชีวิต */
  supportPayout(n) {
    for (const t of this.towers) {
      const sp = t.stats.support;
      if (!sp || (t.build && t.build.kind === 'build')) continue;
      if (sp.kind === 'gold') {
        const g = mineGold(sp.mul, n);
        this.gold += g;
        this.floater(t.x, t.y, `+${g} :gold:`, '#ffcf4a', 14, 1);
      } else if (sp.kind === 'life') {
        t.charge = (t.charge || 0) + 1;
        if (t.charge >= sp.every) {
          t.charge = 0;
          this.lives += 1;
          this.floater(t.x, t.y, '+1 :heart:', '#7dff9a', 18, 1);
          this.toast(tt('sim.shrineLife'), 1400);
        }
      }
    }
  }

  /* บัฟจากธงศึก/กลองศึก (ไม่ซ้อนกัน ใช้ค่าสูงสุดที่ครอบคลุม) */
  refreshBuffs() {
    const auras = this.towers.filter((t) => t.stats.support && t.stats.range > 0 && !(t.build && t.build.kind === 'build'));
    for (const t of this.towers) {
      t.buffDmg = 0; t.buffRate = 0;
      if (t.stats.support) continue;
      for (const a of auras) {
        if (dist2(a.x, a.y, t.x, t.y) > a.stats.range * a.stats.range) continue;
        if (a.stats.support.kind === 'dmg') t.buffDmg = Math.max(t.buffDmg, a.stats.support.amt);
        else if (a.stats.support.kind === 'rate') t.buffRate = Math.max(t.buffRate, a.stats.support.amt);
      }
    }
  }

  continueEndless() {
    this.endless = true;
    if (this.nextWaveIn == null || this.nextWaveIn <= 0) this.nextWaveIn = CLEAR_GAP;
    this.emit('changed');
  }

  /* ---------- มอนสเตอร์ ---------- */
  spawnCreep(entry, hpScale, from = null) {
    const A = ABILITIES[entry.ability];
    const hp = A.hp * hpScale;
    const m = this.map;
    const sc = tileCenter(m.spawn);
    const e = {
      id: this.nextId++, ability: entry.ability, element: entry.element, model: A.model,
      boss: entry.ability === 'boss' || entry.ability === 'elemental', unlock: entry.unlock || 0,
      hp, maxHp: hp, speed: A.speed * rand(0.95, 1.05), size: A.size,
      reward: entry.ability === 'elemental' ? 10 + this.wave * 2 : Math.max(1, Math.round((3 + this.wave * 0.5) * A.reward)),
      x: sc.x + m.spawnOut.x * TILE * 0.45, y: sc.y + m.spawnOut.y * TILE * 0.45,
      angle: Math.atan2(-m.spawnOut.y, -m.spawnOut.x),
      stage: 0, wp: 0, flying: entry.ability === 'flying', progress: 0,
      slowT: 0, slowF: 1, stunT: 0, burnT: 0, burnDps: 0, burnSrc: null,
      rootT: 0, freezeT: 0, freezeImm: 0, silenceT: 0, chill: 0, chillT: 0, wetT: 0,
      corrodeT: 0, corrodePct: 0, corrodeCap: 0, corrodeSrc: null, soulT: 0, soulDps: 0, soulSrc: null,
      exposeT: 0, exposeAmp: 1, shredT: 0, shredAmp: 1, marks: 0, markT: 0, erosion: 0, poolT: 0, mudT: 0, zoneF: 1, pullT: 0, pullImm: 0,
      alive: true, flash: 0, revived: false, moving: 1,
      lane: rand(-0.27, 0.27), // ช่องเดินด้านข้าง (หน่วยช่อง) ให้เดินเหลื่อมกันไม่ต่อแถวทับกัน
      wave: entry.wave || (from && from.wave) || this.wave,
    };
    if (from) {
      e.x = from.x + rand(-8, 8); e.y = from.y + rand(-8, 8);
      e.stage = from.stage; e.wp = from.wp; e.angle = from.angle;
    }
    if (this.waveInfo[e.wave]) this.waveInfo[e.wave].alive += 1;
    this.creeps.push(e);
    this.emit('spawn', { creep: e });
    return e;
  }

  /* ---------- สถานะ ----------
   * มึนงง/แช่แข็ง = หยุดเดิน + ใช้สกิลไม่ได้ · ตรึง = หยุดเดินอย่างเดียว · เงียบ = ใช้สกิลไม่ได้
   * สกิลของมอนสเตอร์: ฟื้นฟู (ไฮดรา) และฟื้นคืนชีพ (ฟีนิกซ์)
   */
  isImmune(e) { return e.ability === 'armored' && !(e.shredT > 0); }
  silenced(e) { return e.silenceT > 0 || e.stunT > 0 || e.freezeT > 0; }
  ccMul(e) { return e.boss ? 0.3 : 1; }

  setSlow(e, factor, dur) {
    if (this.isImmune(e)) return;
    const f = e.boss ? Math.sqrt(factor) : factor;
    e.slowF = e.slowT > 0 ? Math.min(e.slowF, f) : f;
    e.slowT = Math.max(e.slowT, dur);
  }
  setStun(e, dur) {
    if (this.isImmune(e)) return;
    e.stunT = Math.max(e.stunT, dur * this.ccMul(e));
  }
  setBurn(e, burn, src) {
    e.burnDps = Math.max(e.burnT > 0 ? e.burnDps : 0, burn.dps);
    e.burnT = Math.max(e.burnT, burn.dur);
    e.burnSrc = src;
  }

  applyHit(e, t, mul = 1) {
    if (!e.alive) return;
    const s = t.stats;
    // แช่แข็งอยู่แล้วโดนซ้ำ → น้ำแข็งแตก
    if (s.shatter && e.freezeT > 0) {
      e.freezeT = 0;
      e.freezeImm = Math.max(e.freezeImm, s.chill ? s.chill.imm : 2);
      const r = s.shatter.r;
      for (const o of this.creeps) {
        if (o.alive && dist2(o.x, o.y, e.x, e.y) <= (r + o.size * 0.5) ** 2) this.dealDamage(o, s.dmg * s.shatter.mul, t, { direct: true });
      }
      this.emit('shatter', { x: e.x, y: e.y, r, fly: e.flying });
      this.sound('water', 60);
      if (!e.alive) return;
    }
    this.dealDamage(e, s.dmg * mul, t, { direct: true });
    if (!e.alive) return;
    const immune = this.isImmune(e);
    if (s.wet) { this.setSlow(e, s.wet.factor, s.wet.dur); e.wetT = s.wet.dur; }
    if (s.slow) this.setSlow(e, s.slow.factor, s.slow.dur);
    if (s.burn) this.setBurn(e, s.burn, t);
    if (s.stun && Math.random() < s.stun.chance * mul) this.setStun(e, s.stun.dur);
    if (s.corrode) {
      e.corrodePct = Math.max(e.corrodeT > 0 ? e.corrodePct : 0, s.corrode.pct);
      e.corrodeCap = Math.max(e.corrodeT > 0 ? e.corrodeCap : 0, s.corrode.cap);
      e.corrodeT = s.corrode.dur;
      e.corrodeSrc = t;
    }
    if (s.soul) {
      e.soulDps = Math.max(e.soulT > 0 ? e.soulDps : 0, s.soul.dps);
      e.soulT = s.soul.dur;
      e.soulSrc = t;
    }
    if (s.root && !immune) e.rootT = Math.max(e.rootT, s.root.dur * this.ccMul(e));
    if (s.expose) { e.exposeAmp = Math.max(e.exposeT > 0 ? e.exposeAmp : 1, s.expose.amp); e.exposeT = s.expose.dur; }
    if (s.shred) { e.shredAmp = Math.max(e.shredT > 0 ? e.shredAmp : 1, s.shred.amp); e.shredT = s.shred.dur; }
    if (s.chill && e.freezeT <= 0 && e.freezeImm <= 0 && !immune) {
      e.chill += s.chill.add * mul * (e.boss ? 0.5 : 1);
      e.chillT = 1.5;
      if (e.chill >= 100) {
        e.chill = 0;
        e.freezeT = s.chill.freeze * (e.boss ? 0.35 : 1);
        e.freezeImm = e.freezeT + s.chill.imm;
        this.emit('freeze', { creep: e });
      }
    }
    if (s.marks) {
      e.marks = (e.markT > 0 ? e.marks : 0) + 1;
      e.markT = s.marks.dur;
      if (e.marks >= s.marks.need) {
        e.marks = 0;
        const dmg = Math.min((e.maxHp - e.hp) * s.marks.pct * (e.boss ? 0.5 : 1), s.marks.cap);
        this.emit('eclipse', { x: e.x, y: e.y, fly: e.flying });
        if (dmg > 0) this.dealDamage(e, dmg, t, { direct: true, big: true });
        if (!e.alive) return;
      }
    }
    if (s.erosion) {
      e.erosion += 1;
      if (e.erosion >= s.erosion.need) {
        e.erosion = 0;
        e.silenceT = Math.max(e.silenceT, s.erosion.silence);
        this.setStun(e, s.erosion.stun);
        this.floater(e.x, e.y - 6, tt('fx.interrupt'), '#ffd27a', 12, e.flying ? 1 : 0);
      }
    }
  }

  // คืนค่าตัวคูณธาตุที่ใช้ · direct = การโจมตีโดยตรง (ได้ผลจากเปิดเผยจุดอ่อน) · quiet = ไม่แสดงตัวเลข
  dealDamage(e, amount, tower, opts = {}) {
    if (!e.alive) return 1;
    const atkElements = tower ? tower.elements : null;
    let mult = 1;
    if (atkElements && atkElements.length) {
      mult = 0;
      for (const a of atkElements) mult = Math.max(mult, elementMultiplier(a, e.element));
    }
    let dmg = amount * mult;
    if (tower && tower.buffDmg) dmg *= 1 + tower.buffDmg; // บัฟจากธงศึก
    if (opts.direct && e.exposeT > 0) dmg *= e.exposeAmp;
    if (atkElements && this.map.def.element && atkElements.includes(this.map.def.element)) dmg *= MAP_AFFINITY_BONUS;
    if (e.shredT > 0) dmg *= e.shredAmp;
    if (this.isImmune(e)) dmg *= 0.8;
    e.hp -= dmg;
    if (!opts.quiet) e.flash = 0.08;
    if (tower) tower.dmgDealt += dmg;
    if (!opts.quiet && atkElements && dmg >= 1) {
      const col = mult > 1 ? '#ffe45a' : mult < 1 ? '#9aa0b8' : '#ffffff';
      this.floater(e.x + rand(-6, 6), e.y, Math.round(dmg).toString(), opts.big ? '#ff9af0' : col, opts.big ? 17 : mult > 1 ? 14 : 11, e.flying ? 1 : 0);
    }
    if (e.hp <= 0) this.killCreep(e, tower);
    return mult;
  }

  killCreep(e, tower) {
    if (!e.alive) return;
    if (e.ability === 'undead' && !e.revived && !this.silenced(e)) {
      e.revived = true;
      e.hp = e.maxHp * 0.5;
      e.burnT = 0; e.soulT = 0; e.corrodeT = 0;
      this.emit('revive', { creep: e });
      return;
    }
    e.alive = false;
    this.gold += e.reward;
    this.kills += 1;
    if (tower) tower.kills += 1;
    this.emit('death', { creep: e });
    this.floater(e.x, e.y, `+${e.reward}`, '#ffcf4a', 13, e.flying ? 1 : 0);
    // ไฟวิญญาณแพร่ต่อไปยังตัวใกล้เคียง
    if (e.soulT > 0 && e.soulSrc && e.soulSrc.stats.soul) {
      const sp = e.soulSrc.stats.soul;
      const near = this.creeps
        .filter((o) => o.alive && o !== e && dist2(o.x, o.y, e.x, e.y) <= sp.jump * sp.jump)
        .sort((a, b) => dist2(a.x, a.y, e.x, e.y) - dist2(b.x, b.y, e.x, e.y))
        .slice(0, sp.spread);
      for (const o of near) {
        o.soulDps = Math.max(o.soulT > 0 ? o.soulDps : 0, e.soulDps);
        o.soulT = Math.max(o.soulT, e.soulT, sp.dur * 0.6);
        o.soulSrc = e.soulSrc;
      }
      if (near.length) this.emit('soulSpread', { x: e.x, y: e.y, fly: e.flying, to: near.map((o) => ({ x: o.x, y: o.y, fly: o.flying })) });
    }
    if (e.ability === 'split') {
      for (let k = 0; k < 2; k++) {
        const ch = this.spawnCreep({ ability: 'child', element: e.element }, 1, e);
        ch.hp = ch.maxHp = e.maxHp * 0.45;
      }
    }
    if (e.ability === 'boss') {
      // ฆ่าบอสมังกรได้ ได้ชีวิตคืน
      this.lives += BOSS_LIFE_REWARD;
      this.floater(e.x, e.y, `+${BOSS_LIFE_REWARD} :heart:`, '#7dff9a', 18, 1);
      this.toast(tt('sim.bossDown', { n: BOSS_LIFE_REWARD }), 1800);
      this.emit('changed');
    }
    if (e.ability === 'elemental') this.elementalDefeated(e);
    this.creepRemoved(e);
  }

  // เดินไปยังตำแหน่งใหม่ได้หรือไม่ (ตัวบินไปได้ทุกที่)
  canStand(e, x, y) {
    if (e.flying) return x >= 0 && y >= 0 && x <= COLS * TILE && y <= ROWS * TILE;
    const ti = this.tileAt(x, y);
    return ti >= 0 && this.map.walk[ti] && !this.blocked[ti];
  }

  // ผลักถอยหลังตามทางที่เดินมา
  pushBack(e, dist) {
    const steps = Math.ceil(dist / 4);
    const bx = -Math.cos(e.angle), by = -Math.sin(e.angle);
    for (let i = 0; i < steps; i++) {
      const nx = e.x + bx * 4, ny = e.y + by * 4;
      if (!this.canStand(e, nx, ny)) break;
      e.x = nx; e.y = ny;
    }
  }

  updateCreep(e, dt) {
    e.flash = Math.max(0, e.flash - dt);
    for (const k of ['slowT', 'stunT', 'rootT', 'freezeT', 'freezeImm', 'silenceT', 'exposeT', 'shredT', 'markT', 'wetT', 'chillT', 'pullImm']) {
      if (e[k] > 0) e[k] -= dt;
    }
    if (e.chillT <= 0 && e.chill > 0) e.chill = Math.max(0, e.chill - 25 * dt);
    if (e.poolT > 0) e.poolT = Math.max(0, e.poolT - dt);
    if (e.mudT > 0) e.mudT = Math.max(0, e.mudT - dt);
    if (e.ability === 'regen' && !this.silenced(e)) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.025 * dt);
    if (e.burnT > 0) {
      e.burnT -= dt;
      this.dealDamage(e, e.burnDps * dt, e.burnSrc, { quiet: true });
      if (!e.alive) return;
    }
    if (e.soulT > 0) {
      e.soulT -= dt;
      this.dealDamage(e, e.soulDps * dt, e.soulSrc, { quiet: true });
      if (!e.alive) return;
    }
    if (e.corrodeT > 0) {
      e.corrodeT -= dt;
      const d = Math.min(e.hp * e.corrodePct * (e.boss ? 0.3 : 1), e.corrodeCap);
      this.dealDamage(e, d * dt, e.corrodeSrc, { quiet: true });
      if (!e.alive) return;
    }
    let v = e.speed;
    if (e.slowT > 0) v *= e.slowF;
    v *= e.zoneF;
    if (e.stunT > 0 || e.rootT > 0 || e.freezeT > 0) v = 0;
    e.moving = v / e.speed;
    const m = this.map;
    const goals = m.goals;

    let tx, ty, arrive = false;
    if (e.flying) {
      const wps = this.flyPath;
      const target = tileCenter(wps[Math.min(e.wp, wps.length - 1)]);
      tx = target.x; ty = target.y;
      // ถึงจุดเลี้ยวเมื่อเข้าใกล้ราวครึ่งช่อง (กว้างพอให้ฝูงที่ถูกดันแยกกันผ่านไปได้ ไม่ติดค้าง)
      if (dist2(e.x, e.y, tx, ty) < (TILE * 0.5) ** 2) {
        if (e.wp >= wps.length - 1) arrive = true;
        else e.wp += 1;
      }
      const rem = Math.hypot(tx - e.x, ty - e.y) / TILE;
      e.progress = e.wp * 1000 - rem;
    } else {
      const ti = this.tileAt(e.x, e.y);
      if (ti < 0) {
        const sc = tileCenter(m.spawn);
        tx = sc.x; ty = sc.y;
        e.progress = -1;
      } else {
        const goal = goals[e.stage];
        const f = this.fields[e.stage];
        if (ti === goal) {
          const gc = tileCenter(goal);
          tx = gc.x; ty = gc.y;
          // เข้าช่องจุดตรวจแล้ว ถือว่าผ่าน (ถ้ารอให้ถึงกลางช่อง ฝูงที่ถูกดันแยกกันอาจติดค้าง)
          if (e.stage >= goals.length - 1) arrive = true;
          else e.stage += 1;
        } else {
          const nx = f.next[ti];
          const target = nx >= 0 ? tileCenter(nx) : tileCenter(goal);
          tx = target.x; ty = target.y;
        }
        // เลื่อนจุดหมายไปด้านข้างตามช่องเดินของตัวเอง (ตั้งฉากกับทิศที่จะไป)
        if (e.lane) {
          const cc = tileCenter(ti);
          let ux = tx - cc.x, uy = ty - cc.y;
          let ul = Math.hypot(ux, uy);
          if (ul < 1) { ux = Math.cos(e.angle); uy = Math.sin(e.angle); ul = 1; }
          tx += (-uy / ul) * e.lane * TILE; ty += (ux / ul) * e.lane * TILE;
        }
        const d = Number.isFinite(f.dist[ti]) ? f.dist[ti] : 99;
        e.progress = e.stage * 1000 + 500 - d;
      }
    }
    if (arrive) {
      // หลุดถึงประตูแกนกลาง: เสียชีวิต แล้ววนกลับไปเริ่มที่ประตูทางเข้าใหม่
      this.lives -= LEAK_LIVES;
      this.sound('leak');
      this.emit('leak', { lives: LEAK_LIVES, creep: e });
      this.floater(e.x, e.y, `-${LEAK_LIVES} :heart:`, '#ff5a6a', 18);
      if (this.lives <= 0) { this.lives = 0; this.gameOver(); }
      const sc = tileCenter(m.spawn);
      e.x = sc.x + m.spawnOut.x * TILE * 0.45; e.y = sc.y + m.spawnOut.y * TILE * 0.45;
      e.angle = Math.atan2(-m.spawnOut.y, -m.spawnOut.x);
      e.stage = 0; e.wp = 0; e.progress = 0;
      e.laps = (e.laps || 0) + 1;
      this.emit('loop', { creep: e });
      this.emit('changed');
      return;
    }
    const dx = tx - e.x, dy = ty - e.y;
    const d = Math.hypot(dx, dy);
    const step = v * dt;
    if (d > 0.001) {
      const want = Math.atan2(dy, dx);
      let diff = want - e.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      e.angle += diff * Math.min(1, dt * 10);
      if (d <= step) { e.x = tx; e.y = ty; }
      else { e.x += (dx / d) * step; e.y += (dy / d) * step; }
    }
  }

  /* ดันมอนสเตอร์ที่ซ้อนกันให้แยกออกจากกัน (แยกพวกเดินดินกับพวกบิน) — ใช้ตารางช่องเพื่อให้เร็ว */
  separateCreeps(dt) {
    const grid = new Map();
    for (const e of this.creeps) {
      if (!e.alive) continue;
      const k = (Math.floor(e.x / TILE) + 2) * 64 + Math.floor(e.y / TILE) + 2 + (e.flying ? 1e5 : 0);
      let b = grid.get(k);
      if (!b) grid.set(k, (b = []));
      b.push(e);
    }
    const k = Math.min(1, dt * 12);
    for (const e of this.creeps) {
      if (!e.alive) continue;
      const cx = Math.floor(e.x / TILE) + 2, cy = Math.floor(e.y / TILE) + 2, fl = e.flying ? 1e5 : 0;
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
        const b = grid.get((cx + ox) * 64 + cy + oy + fl);
        if (!b) continue;
        for (const o of b) {
          if (o.id <= e.id || !o.alive) continue;
          const min = (e.size + o.size) * 1.0;
          let dx = o.x - e.x, dy = o.y - e.y;
          let d = Math.hypot(dx, dy);
          if (d >= min) continue;
          if (d < 0.01) { const a = (e.id * 2.39996) % (Math.PI * 2); dx = Math.cos(a); dy = Math.sin(a); d = 1; }
          const push = (min - d) * 0.5 * k;
          const ux = dx / d, uy = dy / d;
          const we = o.size * o.size / (e.size * e.size + o.size * o.size); // ตัวใหญ่ขยับน้อยกว่า
          this.nudge(e, -ux * push * 2 * we, -uy * push * 2 * we);
          this.nudge(o, ux * push * 2 * (1 - we), uy * push * 2 * (1 - we));
        }
      }
    }
  }

  // ขยับเล็กน้อยโดยไม่ทะลุกำแพง/ป้อม (เผื่อขอบจากกำแพง)
  nudge(e, dx, dy) {
    if (!dx && !dy) return;
    const l = Math.hypot(dx, dy), m = 9;
    const nx = e.x + dx, ny = e.y + dy;
    if (this.canStand(e, nx + (dx / l) * m, ny + (dy / l) * m)) { e.x = nx; e.y = ny; return; }
    // ลองขยับทีละแกน
    if (dx && this.canStand(e, e.x + dx + Math.sign(dx) * m, e.y)) e.x += dx;
    else if (dy && this.canStand(e, e.x, e.y + dy + Math.sign(dy) * m)) e.y += dy;
  }

  gameOver() {
    if (this.over) return;
    this.over = true;
    this.sound('lose');
    this.emit('lose');
  }

  /* ---------- การโจมตี ---------- */
  findTargets(t, count) {
    const s = t.stats;
    const list = [];
    for (const e of this.creeps) {
      if (!e.alive) continue;
      const rr = s.range + e.size * 0.5;
      if (dist2(t.x, t.y, e.x, e.y) <= rr * rr) list.push(e);
    }
    if (!list.length) return list;
    switch (t.mode) {
      case 'last': list.sort((a, b) => a.progress - b.progress); break;
      case 'strong': list.sort((a, b) => b.hp - a.hp); break;
      case 'close': list.sort((a, b) => dist2(t.x, t.y, a.x, a.y) - dist2(t.x, t.y, b.x, b.y)); break;
      default: list.sort((a, b) => b.progress - a.progress);
    }
    return list.slice(0, count);
  }

  updateTower(t, dt) {
    if (t.build) {
      t.build.t -= dt;
      if (t.build.t <= 0) {
        t.build = null;
        t.cd = 0.2;
        this.emit('built', { tower: t });
        this.sound('upgrade');
        this.emit('changed');
      }
      return;
    }
    const s = t.stats;
    if (s.support) return; // ป้อมสนับสนุนไม่โจมตี
    t.cd -= dt * (1 + (t.buffRate || 0));
    const targets = this.findTargets(t, s.multi || 1);
    if (targets.length) {
      const main = targets[0];
      const want = Math.atan2(main.y - t.y, main.x - t.x);
      let diff = want - t.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      t.angle += diff * Math.min(1, dt * 14);
    } else if (s.ramp) {
      t.rampTarget = null;
      t.rampT = 0;
    }
    if (t.cd > 0 || !targets.length) return;
    t.cd = 1 / s.rate;
    const target = targets[0];
    switch (s.atk) {
      case 'beam': this.hitBeam(t, target); break;
      case 'pierce': this.fireLine(t, target); break;
      case 'chain': this.fireChain(t, target); break;
      case 'ramp': this.fireRamp(t, target); break;
      case 'pulse': this.firePulse(t); break;
      case 'cone': this.fireCone(t, target); break;
      case 'tornado': this.spawnTornado(t, target); break;
      case 'erupt': this.addDelayed({ kind: 'erupt', x: target.x, y: target.y, t: s.erupt.delay, tower: t, fly: target.flying }); break;
      case 'meteor': this.fireMeteors(t, target); break;
      default: for (const tg of targets) this.fireProjectile(t, tg);
    }
    if (s.gust) {
      t.gustN = (t.gustN || 0) + 1;
      if (t.gustN >= s.gust.every) {
        t.gustN = 0;
        for (const e of this.creeps) {
          if (!e.alive || e.boss || this.isImmune(e)) continue;
          if (dist2(t.x, t.y, e.x, e.y) <= (s.range + e.size * 0.5) ** 2) this.pushBack(e, s.gust.dist);
        }
        this.emit('gust', { x: t.x, y: t.y, r: s.range });
        this.sound('wind', 80);
      }
    }
    if (s.atk !== 'ramp' || Math.random() < 0.25) this.emit('shot', { tower: t });
    const snd = t.kind === 'basic' ? (t.base === 'arrow' ? 'wind' : 'earth') : t.elements[t.elements.length - 1];
    if (s.atk === 'ramp') { if (Math.random() < 0.2) this.sound(snd, 120); } else this.sound(snd, 70);
  }

  towerColor(t) { return t.kind === 'basic' ? BASIC[t.base].color : ELEMENTS[t.elements[t.elements.length - 1]].color; }
  towerColors(t) { return t.kind === 'basic' ? [BASIC[t.base].color] : t.elements.map((e) => ELEMENTS[e].color); }

  fireProjectile(t, target) {
    const def = t.kind === 'basic' ? null : towerDef(t.elements);
    const style = t.kind === 'basic' ? t.base : (def.proj || (t.stats.zone ? 'lob' : t.elements[0]));
    const speeds = { arrow: 520, cannon: 280, fire: 210, water: 380, earth: 260, wind: 560, dark: 340, lob: 300 };
    this.projectiles.push({
      id: this.nextId++,
      x: t.x, y: t.y, sx: t.x, sy: t.y,
      tx: target.x, ty: target.y, target, tower: t,
      speed: (def && def.speed) || speeds[style] || 400, style, elements: t.elements.slice(),
      colors: this.towerColors(t),
      fly: target.flying,
    });
  }

  // ลำแสงตรงไปยังเป้าเดียว
  hitBeam(t, target) {
    this.applyHit(target, t, 1);
    this.emit('beam', {
      tower: t, x1: t.x, y1: t.y, x2: target.x, y2: target.y, fly: target.flying,
      colors: this.towerColors(t), width: t.stats.global ? 2.6 + t.tier * 0.4 : 1.4 + t.tier * 0.25,
      life: t.stats.global ? 0.4 : 0.22, style: t.stats.global ? 'sun' : 'eclipse',
    });
  }

  // ลำแสงทะลุแนว
  fireLine(t, target) {
    const s = t.stats;
    const ang = Math.atan2(target.y - t.y, target.x - t.x);
    const len = s.range + 20;
    const x2 = t.x + Math.cos(ang) * len, y2 = t.y + Math.sin(ang) * len;
    const hit = new Set([target]);
    for (const e of this.creeps) {
      if (e.alive && distToSegment(e.x, e.y, t.x, t.y, x2, y2) <= e.size + 6) hit.add(e);
    }
    for (const e of hit) this.applyHit(e, t, 1);
    this.emit('beam', {
      tower: t, x1: t.x, y1: t.y, x2, y2, fly: target.flying,
      colors: this.towerColors(t), width: 1.2 + t.tier * 0.25, life: 0.25, style: s.chill ? 'frost' : 'arrow',
    });
  }

  // ลำแสงหักเหชิ่งไปยังตัวถัดไป
  fireChain(t, target) {
    const c = t.stats.chain;
    const hit = [target];
    let cur = target, mul = 1;
    this.applyHit(target, t, 1);
    for (let b = 0; b < c.bounces; b++) {
      let best = null, bd = c.jump * c.jump;
      for (const e of this.creeps) {
        if (!e.alive || hit.includes(e)) continue;
        const d = dist2(e.x, e.y, cur.x, cur.y);
        if (d < bd) { bd = d; best = e; }
      }
      if (!best) break;
      mul *= c.falloff;
      hit.push(best);
      this.applyHit(best, t, mul);
      cur = best;
    }
    this.emit('chain', { tower: t, pts: hit.map((e) => ({ x: e.x, y: e.y, fly: e.flying })), colors: this.towerColors(t) });
  }

  // ลำแสงต่อเนื่อง ยิ่งยิงเป้าเดิมนานยิ่งแรง
  fireRamp(t, target) {
    const r = t.stats.ramp;
    // เปลี่ยนเป้า: พลังสะสมเหลือครึ่งหนึ่ง
    if (t.rampTarget !== target) { t.rampTarget = target; t.rampT = (t.rampT || 0) * 0.5; }
    t.rampT += 1 / t.stats.rate;
    const k = Math.min(1, t.rampT / r.time);
    const mul = r.min + (r.max - r.min) * k;
    this.applyHit(target, t, mul);
    this.emit('beam', {
      tower: t, x1: t.x, y1: t.y, x2: target.x, y2: target.y, fly: target.flying,
      colors: this.towerColors(t), width: 1 + k * 2.4, life: 0.2, style: 'solar', heat: k,
    });
  }

  // คลื่นรอบป้อม
  firePulse(t) {
    const s = t.stats;
    for (const e of this.creeps) {
      if (e.alive && dist2(t.x, t.y, e.x, e.y) <= (s.range + e.size * 0.5) ** 2) this.applyHit(e, t, 1);
    }
    this.emit('pulse', { x: t.x, y: t.y, r: s.range, color: this.towerColor(t), tower: t });
  }

  // กรวยทราย
  fireCone(t, target) {
    const s = t.stats;
    const ang = Math.atan2(target.y - t.y, target.x - t.x);
    for (const e of this.creeps) {
      if (!e.alive) continue;
      const rr = s.range + e.size * 0.5;
      if (dist2(t.x, t.y, e.x, e.y) > rr * rr) continue;
      let d = Math.atan2(e.y - t.y, e.x - t.x) - ang;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      if (Math.abs(d) <= s.cone.spread || e === target) this.applyHit(e, t, 1);
    }
    this.emit('cone', { tower: t, x: t.x, y: t.y, angle: ang, r: s.range, spread: s.cone.spread, color: '#e8c27a' });
  }

  fireMeteors(t, target) {
    const m = t.stats.meteor;
    this.addDelayed({ kind: 'meteor', big: true, x: target.x, y: target.y, t: m.delay, tower: t, fly: target.flying });
    for (let i = 0; i < m.count; i++) {
      const a = Math.random() * Math.PI * 2, d = rand(m.area * 0.3, m.area);
      this.addDelayed({ kind: 'meteor', big: false, x: target.x + Math.cos(a) * d, y: target.y + Math.sin(a) * d, t: m.delay + 0.12 * (i + 1), tower: t, fly: target.flying });
    }
  }

  addDelayed(d) {
    d.id = this.nextId++;
    d.total = d.t;
    this.delayed.push(d);
  }

  resolveDelayed(d) {
    const t = d.tower;
    const s = t.stats;
    if (d.kind === 'meteor') {
      const m = s.meteor;
      const r = d.big ? m.mainR : m.r;
      for (const e of this.creeps) {
        if (!e.alive || dist2(e.x, e.y, d.x, d.y) > (r + e.size * 0.5) ** 2) continue;
        this.applyHit(e, t, d.big ? 1 : m.small);
        if (d.big && e.alive) { e.silenceT = Math.max(e.silenceT, m.silence); this.setStun(e, m.stun); }
      }
      this.emit('explosion', { x: d.x, y: d.y, r, color: '#ff7a2a', fly: false, big: d.big });
      if (d.big) this.emit('quake', { s: 0.12 });
      this.sound('fire', 60);
    } else if (d.kind === 'erupt') {
      const er = s.erupt;
      for (const e of this.creeps) {
        if (!e.alive || dist2(e.x, e.y, d.x, d.y) > (er.r + e.size * 0.5) ** 2) continue;
        this.applyHit(e, t, 1);
        if (e.alive) this.setStun(e, er.stun);
      }
      this.addZone({ kind: 'lava', ...er.lava, x: d.x, y: d.y, tower: t });
      this.emit('explosion', { x: d.x, y: d.y, r: er.r, color: '#ff5a1e', fly: false, big: true });
      this.emit('quake', { s: 0.2 });
      this.sound('earth', 60);
    }
  }

  addZone(z) {
    z.id = this.nextId++;
    z.t = z.dur;
    this.zones.push(z);
  }

  updateZone(z, dt) {
    z.t -= dt;
    const t = z.tower;
    for (const e of this.creeps) {
      if (!e.alive || dist2(e.x, e.y, z.x, z.y) > (z.r + e.size * 0.5) ** 2) continue;
      const immune = this.isImmune(e);
      let d = z.dps;
      if (z.kind === 'abyss') {
        e.poolT = Math.min(10, (e.poolT || 0) + dt * 2);
        const pct = Math.min(z.capPct, z.pct + z.grow * e.poolT) * (e.boss ? 0.25 : 1);
        d += Math.min(e.hp * pct, z.cap);
      } else if (z.kind === 'lava') {
        if (!immune) e.zoneF = Math.min(e.zoneF, e.boss ? Math.max(z.sticky, 0.7) : z.sticky);
        if (z.burn) this.setBurn(e, z.burn, t);
      } else if (z.kind === 'mud') {
        e.mudT = Math.min(4, (e.mudT || 0) + dt * 2);
        const f = Math.max(z.minF, 1 - z.sink * e.mudT);
        e.zoneF = Math.min(e.zoneF, e.boss ? Math.max(f, 0.7) : immune ? Math.sqrt(f) : f);
      } else if (z.kind === 'void') {
        // ถูกดึงต่อเนื่อง 0.8 วิ แล้วต้านแรงดึง 2 วิ
        const k = e.boss ? 0.15 : immune ? 0.25 : 1;
        const dx = z.x - e.x, dy = z.y - e.y, dd = Math.hypot(dx, dy);
        if (e.pullImm <= 0) {
          e.pullT = (e.pullT || 0) + dt;
          if (e.pullT >= 0.8) { e.pullT = 0; e.pullImm = 2; }
        }
        if (dd > 4 && e.pullImm <= 0) {
          const step = Math.min(dd, z.pull * k * dt);
          const nx = e.x + (dx / dd) * step, ny = e.y + (dy / dd) * step;
          if (this.canStand(e, nx, ny)) { e.x = nx; e.y = ny; }
        }
      }
      this.dealDamage(e, d * dt, t, { quiet: true });
    }
    return z.t > 0;
  }

  /* ---------- พายุเคลื่อนตามทาง (ย้อนสวนทางมอนสเตอร์) ---------- */
  routePoints() {
    if (this._routeV !== this.routeVersion) {
      this._routeV = this.routeVersion;
      this._route = this.getRoute().map((i) => tileCenter(i));
    }
    return this._route;
  }

  spawnTornado(t, target) {
    const tn = t.stats.tornado;
    const pts = this.routePoints();
    let ri = 0, bd = Infinity;
    pts.forEach((p, i) => { const d = dist2(p.x, p.y, target.x, target.y); if (d < bd) { bd = d; ri = i; } });
    this.movers.push({
      id: this.nextId++, kind: tn.trail ? 'lavastorm' : 'firestorm',
      x: target.x, y: target.y, ri, t: tn.dur, max: tn.dur, tower: t, drop: 0,
    });
  }

  updateMover(m, dt) {
    m.t -= dt;
    const t = m.tower;
    const tn = t.stats.tornado;
    if (!tn) return false;
    const pts = this.routePoints();
    let step = tn.speed * dt;
    while (step > 0 && m.ri >= 0 && pts[m.ri]) {
      const p = pts[m.ri];
      const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy);
      if (d <= step) { m.x = p.x; m.y = p.y; step -= d; m.ri -= 1; }
      else { m.x += (dx / d) * step; m.y += (dy / d) * step; step = 0; }
    }
    for (const e of this.creeps) {
      if (!e.alive || dist2(e.x, e.y, m.x, m.y) > (tn.r + e.size * 0.5) ** 2) continue;
      this.dealDamage(e, tn.dps * dt, t, { quiet: true });
      if (e.alive && tn.burn) this.setBurn(e, tn.burn, t);
    }
    if (tn.trail) {
      m.drop -= dt;
      if (m.drop <= 0) {
        m.drop = tn.trail.every;
        this.addZone({ kind: 'lava', ...tn.trail, x: m.x, y: m.y, tower: t });
      }
    }
    return m.t > 0;
  }

  updateProjectile(p, dt) {
    if (p.target && p.target.alive) { p.tx = p.target.x; p.ty = p.target.y; }
    const dx = p.tx - p.x, dy = p.ty - p.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (d <= step + 2) { this.impact(p); return false; }
    p.x += (dx / d) * step;
    p.y += (dy / d) * step;
    return true;
  }

  impact(p) {
    const t = p.tower;
    const s = t.stats;
    const color = this.towerColor(t);
    if (s.zone) {
      this.addZone({ ...s.zone, x: p.tx, y: p.ty, tower: t });
      this.emit('hit', { x: p.tx, y: p.ty, color, fly: false });
    } else if (s.splash) {
      for (const e of this.creeps) {
        if (!e.alive) continue;
        const rr = s.splash + e.size * 0.5;
        if (dist2(e.x, e.y, p.tx, p.ty) <= rr * rr) this.applyHit(e, t, e === p.target ? 1 : 0.5);
      }
      this.emit('explosion', { x: p.tx, y: p.ty, r: s.splash, color: t.kind === 'basic' ? '#ffb060' : color, fly: p.fly });
    } else if (p.target && p.target.alive) {
      this.applyHit(p.target, t, 1);
      this.emit('hit', { x: p.tx, y: p.ty, color, fly: p.fly });
    }
  }

  /* ---------- ลูปหลัก ---------- */
  update(dt) {
    this.time += dt;
    // ปล่อยมอนสเตอร์ตามคิว (อาจมีหลายเวฟซ้อนกัน)
    while (this.spawnQueue.length && this.spawnQueue[0].t <= this.time) {
      const entry = this.spawnQueue.shift();
      const info = this.waveInfo[entry.wave];
      if (info) info.pending -= 1;
      this.spawnCreep(entry, entry.hpScale);
    }
    // นับถอยหลังเวฟถัดไป
    if (!this.over) {
      // เวฟถัดไปปล่อยเมื่อสนามว่างเท่านั้น (รวมภูตธาตุ) — ระหว่างนั้นการนับถอยหลังหยุดไว้
      if (!this.waveActive) {
        if (this.nextWaveIn == null) this.nextWaveIn = CLEAR_GAP;
        if (this.wave < TOTAL_WAVES || this.endless) {
          this.nextWaveIn -= dt;
          if (this.nextWaveIn <= 0) this.startWave();
        }
      }
    }
    for (const e of this.creeps) e.zoneF = 1;
    if (!this.over) {
      this.zones = this.zones.filter((z) => this.updateZone(z, dt));
      this.movers = this.movers.filter((m) => this.updateMover(m, dt));
      this.delayed = this.delayed.filter((d) => {
        d.t -= dt;
        if (d.t > 0) return true;
        this.resolveDelayed(d);
        return false;
      });
    }
    for (const e of this.creeps) if (e.alive) this.updateCreep(e, dt);
    this.separateCreeps(dt);
    if (this.over) {
      this.creeps = this.creeps.filter((e) => e.alive);
      return;
    }
    this.refreshBuffs();
    for (const t of this.towers) this.updateTower(t, dt);
    this.projectiles = this.projectiles.filter((p) => this.updateProjectile(p, dt));
    this.creeps = this.creeps.filter((e) => e.alive);
  }

}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let k = ((px - ax) * dx + (py - ay) * dy) / l2;
  k = Math.max(0, Math.min(1, k));
  return Math.hypot(px - (ax + dx * k), py - (ay + dy * k));
}
