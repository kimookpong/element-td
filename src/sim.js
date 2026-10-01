/* ============================================================
 *  Element TD — ตรรกะเกม (ไม่ขึ้นกับการเรนเดอร์)
 *  พิกัดเป็นพิกเซลบนกระดาน 800×480 (TILE = 40)
 *  ฝั่งเรนเดอร์อ่าน state และ events เพื่อแสดงผล
 * ============================================================ */
import {
  TILE, COLS, ROWS, ELEMENTS, ELEMENT_ORDER, elementMultiplier, elementEffects,
  BASIC, ELEMENT_TOWER, MAX_TIER, MAX_ELEMENT_LEVEL, DUALS, TRIPLES, comboKey,
  ABILITIES, WAVE_PATTERN, MAPS, DIFFICULTIES, TOTAL_WAVES,
  ELEMENT_POINT_EVERY, START_ELEMENT_POINTS, SELL_RATIO, INTEREST_RATE,
  FIRST_WAVE_DELAY, WAVE_GAP, CLEAR_GAP, BUILD_TIME, upgradeTime,
} from './data.js';

export const TARGET_MODES = ['first', 'last', 'strong', 'close'];
export const SAVE_VERSION = 1;
export const TARGET_LABEL = { first: 'หัวแถว', last: 'ท้ายแถว', strong: 'HP มากสุด', close: 'ใกล้สุด' };

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

/* ---------------- ค่าสถานะป้อม ---------------- */
export function towerStats(t) {
  if (t.kind === 'basic') {
    const B = BASIC[t.base];
    const L = t.tier - 1;
    const rate = B.rate * (1 + 0.1 * L);
    const dps = B.dps[L];
    const s = { dps, rate, dmg: dps / rate, range: B.range * (1 + 0.08 * L) };
    if (B.splash) s.splash = B.splash[L];
    return s;
  }
  const n = t.elements.length;
  const els = t.elements.map((e) => ELEMENTS[e]);
  const avg = (k) => els.reduce((a, e) => a + e[k], 0) / n;
  const dps = ELEMENT_TOWER[n].dps[t.tier - 1] * avg('dpsF');
  const rate = avg('rate');
  const s = {
    dps, rate, dmg: dps / rate,
    range: Math.max(...els.map((e) => e.range)) * (1 + 0.08 * (t.tier - 1)) + (n - 1) * 8,
  };
  const lv = Math.min(MAX_ELEMENT_LEVEL, t.tier + n - 1);
  for (const e of t.elements) Object.assign(s, elementEffects(e, lv, dps));
  return s;
}

export function towerName(t) {
  if (t.kind === 'basic') return BASIC[t.base].th;
  if (t.elements.length === 1) return `ป้อม${ELEMENTS[t.elements[0]].th}`;
  const k = comboKey(t.elements);
  const d = t.elements.length === 2 ? DUALS[k] : TRIPLES[k];
  return `${d.th} (${d.name})`;
}

export function comboName(els) {
  if (els.length === 1) return `ป้อม${ELEMENTS[els[0]].th}`;
  const d = (els.length === 2 ? DUALS : TRIPLES)[comboKey(els)];
  return d.th;
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
      towers: this.towers.map((t) => ({
        c: t.c, r: t.r, kind: t.kind, base: t.base, elements: t.elements.slice(), tier: t.tier,
        spent: t.spent, mode: t.mode, kills: t.kills, dmgDealt: Math.round(t.dmgDealt),
        build: t.build ? { ...t.build } : null,
      })),
    };
  }

  static restore(data) {
    if (!data || data.v !== SAVE_VERSION || !MAPS[data.mapIndex] || !DIFFICULTIES[data.diffKey]) return null;
    const g = new Game(data.mapIndex, data.diffKey);
    for (const k of ['gold', 'lives', 'wave', 'kills', 'endless', 'won', 'elemPoints', 'lastElement', 'nextId', 'nextWaveIn']) {
      if (data[k] !== undefined) g[k] = data[k];
    }
    for (const e of ELEMENT_ORDER) g.elemLevel[e] = Math.max(0, Math.min(MAX_ELEMENT_LEVEL, data.elemLevel?.[e] | 0));
    if (data.nextWaveData) g.nextWaveData = data.nextWaveData;
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
      };
      if (t.kind === 'basic' && !BASIC[t.base]) continue;
      if (t.kind === 'element' && !t.elements.length) continue;
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
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return { ok: false, reason: 'นอกพื้นที่' };
    const i = idx(c, r);
    const m = this.map;
    if (!m.build[i]) return { ok: false, reason: 'สร้างตรงนี้ไม่ได้' };
    if (this.towerGrid[i]) return { ok: false, reason: 'มีป้อมอยู่แล้ว' };
    if (!m.walk[i]) return { ok: true };
    const { x, y } = tileCenter(i);
    for (const e of this.creeps) {
      if (e.alive && !e.flying && Math.abs(e.x - x) < TILE * 0.85 && Math.abs(e.y - y) < TILE * 0.85) {
        return { ok: false, reason: 'มีมอนสเตอร์ขวางอยู่' };
      }
    }
    this.blocked[i] = 1;
    const fields = m.goals.map((g) => computeField(m, this.blocked, g));
    this.blocked[i] = 0;
    for (let s = 0; s < fields.length; s++) {
      const start = s === 0 ? m.spawn : m.goals[s - 1];
      if (!Number.isFinite(fields[s].dist[start])) return { ok: false, reason: 'ห้ามปิดทางเดินทั้งหมด!' };
    }
    for (const e of this.creeps) {
      if (!e.alive || e.flying) continue;
      const ti = this.tileAt(e.x, e.y);
      if (ti >= 0 && !Number.isFinite(fields[e.stage].dist[ti])) return { ok: false, reason: 'ห้ามขังมอนสเตอร์!' };
    }
    return { ok: true, fields };
  }

  /* ---------- ธาตุ ---------- */
  buyElement(el) {
    if (this.elemPoints <= 0) { this.sound('error'); this.toast('ไม่มีผลึกธาตุเหลือ', 900); return false; }
    if (this.elemLevel[el] >= MAX_ELEMENT_LEVEL) { this.sound('error'); return false; }
    this.elemPoints -= 1;
    this.elemLevel[el] += 1;
    const lv = this.elemLevel[el];
    this.toast(`:${ELEMENTS[el].icon}: ธาตุ${ELEMENTS[el].th} เลเวล ${lv}!`, 1400);
    this.emit('elementUp', { el, lv });
    this.sound('fuse');
    this.emit('changed');
    return true;
  }

  /* ---------- ป้อม ---------- */
  canBuildType(type) {
    if (BASIC[type]) return { ok: true };
    if (this.elemLevel[type] < 1) return { ok: false, reason: `ต้องปลดล็อกธาตุ${ELEMENTS[type].th}ก่อน` };
    return { ok: true };
  }

  placeTower(type, c, r) {
    const req = this.canBuildType(type);
    if (!req.ok) { this.sound('error'); this.toast(req.reason, 1100); return false; }
    const cost = buildCost(type);
    if (this.gold < cost) { this.sound('error'); this.toast('ทองไม่พอ!', 900); return false; }
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
        if (!lvOk(t.elements, t.tier + 1)) need = `ต้องมีธาตุ ${t.elements.map((e) => ELEMENTS[e].th).join('+')} เลเวล ${t.tier + 1}`;
      }
      opts.push({ type: 'tier', cost, ok: !need, reason: need, label: `อัปเกรดเป็นระดับ ${t.tier + 1}` });
    }
    if (t.kind === 'element' && t.elements.length < 3) {
      const n = t.elements.length;
      const newTier = Math.min(t.tier, MAX_TIER[n + 1]);
      for (const e of ELEMENT_ORDER) {
        if (t.elements.includes(e)) continue;
        const els = [...t.elements, e];
        const cost = ELEMENT_TOWER[n + 1].cum[newTier - 1] - ELEMENT_TOWER[n].cum[t.tier - 1];
        const ok = lvOk(els, newTier);
        opts.push({
          type: 'add', el: e, els, tier: newTier, cost, ok,
          reason: ok ? null : `ต้องมีธาตุ${ELEMENTS[e].th} เลเวล ${newTier}${newTier > 1 ? ' (และธาตุเดิมเลเวลเท่ากัน)' : ''}`,
          label: comboName(els),
        });
      }
    }
    return opts;
  }

  applyUpgrade(t, opt) {
    if (t.build) { this.sound('error'); this.toast('ป้อมกำลังก่อสร้างอยู่', 1000); return false; }
    if (!opt.ok) { this.sound('error'); this.toast(opt.reason, 1400); return false; }
    if (this.gold < opt.cost) { this.sound('error'); this.toast('ทองไม่พอ!', 900); return false; }
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
      this.toast(`กำลังหลอมรวม: ${towerName(t)}`, 1600);
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
  makeWave(n) {
    let ability;
    if (n <= 3) ability = n === 2 ? 'fast' : 'normal';
    else ability = WAVE_PATTERN[(n - 1) % WAVE_PATTERN.length];
    if (n > TOTAL_WAVES && n % 5 === 0) ability = 'boss';
    let element;
    do { element = pick(ELEMENT_ORDER); } while (element === this.lastElement);
    this.lastElement = element;
    const hpScale = (32 * Math.pow(1.17, n - 1) + n * 6) * this.diff.hp;
    const entries = [];
    let t = 0;
    const add = (ab, gap) => { entries.push({ ability: ab, element, t }); t += gap; };
    if (ability === 'boss') {
      for (let i = 0; i < 6; i++) add('normal', 0.9);
      t += 2;
      add('boss', 0);
    } else {
      const count = Math.round((10 + Math.floor(n * 0.35)) * (ability === 'flying' ? 0.7 : 1));
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
      this.toast(`:warning: มังกรโบราณธาตุ${ELEMENTS[w.element].th}กำลังมา!`, 2200);
    } else {
      this.sound('wave');
      this.toast(`เวฟ ${n}: :${A.icon}: ${A.creature}ธาตุ${ELEMENTS[w.element].th}`, 1500);
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

  continueEndless() {
    this.endless = true;
    if (this.nextWaveIn == null || this.nextWaveIn <= 0) this.nextWaveIn = WAVE_GAP;
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
      hp, maxHp: hp, speed: A.speed * rand(0.95, 1.05), size: A.size,
      reward: Math.max(1, Math.round((3 + this.wave * 0.5) * A.reward)),
      lives: A.lives,
      x: sc.x + m.spawnOut.x * TILE * 0.45, y: sc.y + m.spawnOut.y * TILE * 0.45,
      angle: Math.atan2(-m.spawnOut.y, -m.spawnOut.x),
      stage: 0, wp: 0, flying: entry.ability === 'flying', progress: 0,
      slowT: 0, slowF: 1, stunT: 0, burnT: 0, burnDps: 0, burnSrc: null,
      curseT: 0, curseAmp: 1, alive: true, flash: 0, revived: false, moving: 1,
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

  isImmune(e) { return e.ability === 'armored'; }

  applyHit(e, t, mul) {
    if (!e.alive) return;
    const s = t.stats;
    let base = s.dmg * mul;
    // ดาเมจตาม % HP จำกัดไม่เกิน 3 เท่าของดาเมจพื้นฐาน
    if (s.percent) base += Math.min(e.maxHp * s.percent * (e.ability === 'boss' ? 0.25 : 1), s.dmg * 3) * mul;
    const m = this.dealDamage(e, base, t.elements, t);
    if (!e.alive) return;
    const boss = e.ability === 'boss';
    const immune = this.isImmune(e);
    if (s.slow && !immune) {
      const f = boss ? Math.sqrt(s.slow.factor) : s.slow.factor;
      e.slowF = e.slowT > 0 ? Math.min(e.slowF, f) : f;
      e.slowT = Math.max(e.slowT, s.slow.dur);
    }
    if (s.burn) {
      e.burnDps = Math.max(e.burnT > 0 ? e.burnDps : 0, s.burn.dps * m);
      e.burnT = s.burn.dur;
      e.burnSrc = t;
    }
    if (s.stun && !immune && Math.random() < s.stun.chance * mul) {
      e.stunT = Math.max(e.stunT, s.stun.dur * (boss ? 0.3 : 1));
    }
    if (s.knock && !boss && !immune && !e.flying && Math.random() < s.knock.chance * mul) {
      const bx = e.x - Math.cos(e.angle) * s.knock.dist, by = e.y - Math.sin(e.angle) * s.knock.dist;
      const ti = this.tileAt(bx, by);
      if (ti >= 0 && this.map.walk[ti] && !this.blocked[ti]) { e.x = bx; e.y = by; }
    }
    if (s.curse) {
      e.curseAmp = Math.max(e.curseT > 0 ? e.curseAmp : 1, s.curse.amp);
      e.curseT = s.curse.dur;
    }
  }

  // คืนค่าตัวคูณธาตุที่ใช้
  dealDamage(e, amount, atkElements, tower) {
    let mult = 1;
    if (atkElements && atkElements.length) {
      mult = 0;
      for (const a of atkElements) mult = Math.max(mult, elementMultiplier(a, e.element));
    }
    let dmg = amount * mult * (e.curseT > 0 ? e.curseAmp : 1);
    if (this.isImmune(e)) dmg *= 0.8;
    e.hp -= dmg;
    e.flash = 0.08;
    if (tower) tower.dmgDealt += dmg;
    if (atkElements && dmg >= 1) {
      const col = mult > 1 ? '#ffe45a' : mult < 1 ? '#9aa0b8' : '#ffffff';
      this.floater(e.x + rand(-6, 6), e.y, Math.round(dmg).toString(), col, mult > 1 ? 14 : 11, e.flying ? 1 : 0);
    }
    if (e.hp <= 0) this.killCreep(e, tower);
    return mult;
  }

  killCreep(e, tower) {
    if (!e.alive) return;
    if (e.ability === 'undead' && !e.revived) {
      e.revived = true;
      e.hp = e.maxHp * 0.5;
      e.burnT = 0;
      this.emit('revive', { creep: e });
      return;
    }
    e.alive = false;
    this.gold += e.reward;
    this.kills += 1;
    if (tower) tower.kills += 1;
    this.emit('death', { creep: e });
    this.floater(e.x, e.y, `+${e.reward}`, '#ffcf4a', 13, e.flying ? 1 : 0);
    if (e.ability === 'split') {
      for (let k = 0; k < 2; k++) {
        const ch = this.spawnCreep({ ability: 'child', element: e.element }, 1, e);
        ch.hp = ch.maxHp = e.maxHp * 0.45;
      }
    }
    if (e.ability === 'boss') this.toast('บอสถูกกำจัด!', 1400);
    this.creepRemoved(e);
  }

  updateCreep(e, dt) {
    e.flash = Math.max(0, e.flash - dt);
    if (e.slowT > 0) e.slowT -= dt;
    if (e.stunT > 0) e.stunT -= dt;
    if (e.curseT > 0) e.curseT -= dt;
    if (e.ability === 'regen') e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.025 * dt);
    if (e.burnT > 0) {
      e.burnT -= dt;
      this.dealDamage(e, e.burnDps * dt, null, e.burnSrc);
      if (!e.alive) return;
    }
    let v = e.speed;
    if (e.slowT > 0) v *= e.slowF;
    if (e.stunT > 0) v = 0;
    e.moving = v / e.speed;
    const m = this.map;
    const goals = m.goals;

    let tx, ty, arrive = false;
    if (e.flying) {
      const wps = this.flyPath;
      const target = tileCenter(wps[Math.min(e.wp, wps.length - 1)]);
      tx = target.x; ty = target.y;
      if (dist2(e.x, e.y, tx, ty) < 36) {
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
          if (dist2(e.x, e.y, tx, ty) < 100) {
            if (e.stage >= goals.length - 1) arrive = true;
            else e.stage += 1;
          }
        } else {
          const nx = f.next[ti];
          const target = nx >= 0 ? tileCenter(nx) : tileCenter(goal);
          tx = target.x; ty = target.y;
        }
        const d = Number.isFinite(f.dist[ti]) ? f.dist[ti] : 99;
        e.progress = e.stage * 1000 + 500 - d;
      }
    }
    if (arrive) {
      e.alive = false;
      this.lives -= e.lives;
      this.sound('leak');
      this.emit('leak', { lives: e.lives, creep: e });
      this.floater(e.x, e.y, `-${e.lives} :heart:`, '#ff5a6a', 18);
      if (this.lives <= 0) { this.lives = 0; this.gameOver(); }
      this.creepRemoved(e);
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
    t.cd -= dt;
    const s = t.stats;
    const targets = this.findTargets(t, s.multi || 1);
    if (targets.length) {
      const main = targets[0];
      const want = Math.atan2(main.y - t.y, main.x - t.x);
      let diff = want - t.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      t.angle += diff * Math.min(1, dt * 14);
    }
    if (t.cd > 0 || !targets.length) return;
    t.cd = 1 / s.rate;
    for (const target of targets) {
      if (s.pierce) this.fireBeam(t, target);
      else this.fireProjectile(t, target);
    }
    this.emit('shot', { tower: t });
    this.sound(t.kind === 'basic' ? (t.base === 'arrow' ? 'wind' : 'earth') : t.elements[t.elements.length - 1], 70);
  }

  fireProjectile(t, target) {
    const style = t.kind === 'basic' ? t.base : t.elements[0];
    const speeds = { arrow: 520, cannon: 280, fire: 330, water: 380, earth: 260, wind: 560, dark: 340 };
    this.projectiles.push({
      id: this.nextId++,
      x: t.x, y: t.y, sx: t.x, sy: t.y,
      tx: target.x, ty: target.y, target, tower: t,
      speed: speeds[style] || 400, style, elements: t.elements.slice(),
      fly: target.flying,
    });
  }

  fireBeam(t, target) {
    const s = t.stats;
    const ang = Math.atan2(target.y - t.y, target.x - t.x);
    const len = s.range + 20;
    const x2 = t.x + Math.cos(ang) * len, y2 = t.y + Math.sin(ang) * len;
    const hit = new Set();
    for (const e of this.creeps) {
      if (!e.alive) continue;
      if (distToSegment(e.x, e.y, t.x, t.y, x2, y2) <= e.size + 6) hit.add(e);
    }
    hit.add(target);
    for (const e of hit) this.applyHit(e, t, 1);
    if (s.splash) {
      for (const e of this.creeps) {
        if (!e.alive || hit.has(e)) continue;
        if (dist2(e.x, e.y, target.x, target.y) <= s.splash * s.splash) this.applyHit(e, t, 0.5);
      }
      this.emit('explosion', { x: target.x, y: target.y, r: s.splash, color: ELEMENTS.fire.color, fly: target.flying });
    }
    this.emit('beam', {
      tower: t, x1: t.x, y1: t.y, x2, y2, fly: target.flying,
      colors: t.elements.map((e) => ELEMENTS[e].color),
      width: 1 + (t.elements.length - 1) * 0.7 + t.tier * 0.25,
    });
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
    const color = t.kind === 'basic' ? BASIC[t.base].color : ELEMENTS[t.elements[t.elements.length - 1]].color;
    if (s.splash) {
      for (const e of this.creeps) {
        if (!e.alive) continue;
        const rr = s.splash + e.size * 0.5;
        if (dist2(e.x, e.y, p.tx, p.ty) <= rr * rr) this.applyHit(e, t, e === p.target ? 1 : 0.5);
      }
      this.emit('explosion', { x: p.tx, y: p.ty, r: s.splash, color: t.kind === 'basic' ? '#ffb060' : ELEMENTS[t.elements[0]].color, fly: p.fly });
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
      const lastInfo = this.waveInfo[this.wave];
      if (this.nextWaveIn == null && (!lastInfo || lastInfo.pending <= 0)) this.nextWaveIn = WAVE_GAP;
      if (this.nextWaveIn != null && (this.wave < TOTAL_WAVES || this.endless)) {
        if (this.wave > 0 && !this.waveActive) this.nextWaveIn = Math.min(this.nextWaveIn, CLEAR_GAP);
        this.nextWaveIn -= dt;
        if (this.nextWaveIn <= 0) this.startWave();
      }
    }
    for (const e of this.creeps) if (e.alive) this.updateCreep(e, dt);
    if (this.over) {
      this.creeps = this.creeps.filter((e) => e.alive);
      return;
    }
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
