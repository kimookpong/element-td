/* ============================================================
 *  Element TD — ตรรกะเกม (ไม่ขึ้นกับการเรนเดอร์)
 *  พิกัดในระบบจำลองเป็นพิกเซลบนกระดาน 800×480 (TILE = 40)
 *  ฝั่งเรนเดอร์อ่าน state และ events เพื่อแสดงผล
 * ============================================================ */
import {
  TILE, COLS, ROWS, ELEMENTS, ELEMENT_ORDER, BEATS, elementMultiplier,
  FUSIONS, FUSION_COST, MAX_LEVEL, fusionKey, ENEMY_TYPES, MAPS, DIFFICULTIES, TOTAL_WAVES,
} from './data.js';

export const TARGET_MODES = ['first', 'last', 'strong', 'close'];
export const TARGET_LABEL = { first: 'หัวแถว', last: 'ท้ายแถว', strong: 'HP มากสุด', close: 'ใกล้สุด' };
const DMG_BY_LEVEL = [1, 1.7, 2.8];
export const MAX_STAR = 3;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;

/* ---------------- แผนที่ / เส้นทาง ---------------- */
export function buildMap(def) {
  const pts = def.points.map(([c, r]) => ({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 }));
  const segs = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    segs.push({ a, b, len, start: total, angle: Math.atan2(b.y - a.y, b.x - a.x) });
    total += len;
  }
  const grid = [];
  for (let r = 0; r < ROWS; r++) grid.push(new Array(COLS).fill(0));
  const pathTiles = [];
  for (let i = 0; i < def.points.length - 1; i++) {
    let [c1, r1] = def.points[i];
    const [c2, r2] = def.points[i + 1];
    const dc = Math.sign(c2 - c1), dr = Math.sign(r2 - r1);
    for (;;) {
      if (c1 >= 0 && c1 < COLS && r1 >= 0 && r1 < ROWS) grid[r1][c1] = 1;
      if (!pathTiles.some(([c, r]) => c === c1 && r === r1)) pathTiles.push([c1, r1]);
      if (c1 === c2 && r1 === r2) break;
      c1 += dc; r1 += dr;
    }
  }
  return { def, pts, segs, total, grid, pathTiles };
}

export function posAt(map, d) {
  const segs = map.segs;
  if (d <= 0) return { x: segs[0].a.x, y: segs[0].a.y, angle: segs[0].angle };
  for (const s of segs) {
    if (d <= s.start + s.len) {
      const t = (d - s.start) / s.len;
      return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t, angle: s.angle };
    }
  }
  const last = segs[segs.length - 1];
  return { x: last.b.x, y: last.b.y, angle: last.angle };
}

/* ---------------- ค่าสถานะป้อม ---------------- */
export function singleStats(el, level) {
  const e = ELEMENTS[el];
  const L = level - 1;
  const m = DMG_BY_LEVEL[L];
  const s = {
    dmg: e.dmg * m,
    range: e.range * (1 + 0.1 * L),
    rate: e.rate * (1 + 0.15 * L),
  };
  if (e.splash) s.splash = e.splash + 6 * L;
  if (e.burn) s.burn = { dps: e.burn.dps * m, dur: e.burn.dur };
  if (e.slow) s.slow = { factor: e.slow.factor - 0.06 * L, dur: e.slow.dur + 0.2 * L };
  if (e.stun) s.stun = { chance: e.stun.chance + 0.05 * L, dur: e.stun.dur };
  if (e.multi) s.multi = e.multi + L;
  if (e.knock) s.knock = { chance: e.knock.chance + 0.04 * L, dist: e.knock.dist };
  if (e.pierce) s.pierce = true;
  if (e.curse) s.curse = { amp: e.curse.amp + 0.1 * L, dur: e.curse.dur };
  if (e.percent) s.percent = e.percent + 0.01 * L;
  return s;
}

export function computeStats(t) {
  if (t.elements.length === 1) return singleStats(t.elements[0], t.level);
  const A = singleStats(t.elements[0], MAX_LEVEL);
  const B = singleStats(t.elements[1], MAX_LEVEL);
  const starMul = 1 + 0.45 * t.star;
  const rate = (A.rate + B.rate) / 2;
  const dps = (A.dmg * A.rate + B.dmg * B.rate) * 1.2 * starMul;
  const s = Object.assign({}, A, B);
  s.rate = rate;
  s.dmg = dps / rate;
  s.range = Math.max(A.range, B.range) * (1.05 + 0.04 * t.star);
  if (s.multi) s.multi = 3;
  if (s.burn) s.burn = { dps: s.burn.dps * 1.3 * starMul, dur: s.burn.dur };
  if (s.splash) s.splash *= 1.15;
  return s;
}

export function towerName(t) {
  if (t.elements.length === 1) return `ป้อม${ELEMENTS[t.elements[0]].th}`;
  const f = FUSIONS[fusionKey(t.elements[0], t.elements[1])];
  return `${f.th} (${f.name})`;
}

export function upgradeCost(t) {
  if (t.elements.length === 1) {
    if (t.level >= MAX_LEVEL) return null;
    const base = ELEMENTS[t.elements[0]].cost;
    return Math.round(base * (t.level === 1 ? 0.9 : 1.5));
  }
  if (t.star >= MAX_STAR) return null;
  return 250 * (t.star + 1);
}

export const sellValue = (t) => Math.floor(t.spent * 0.7);

export function canFuse(a, b) {
  return !!(a && b && a !== b &&
    a.elements.length === 1 && b.elements.length === 1 &&
    a.level === MAX_LEVEL && b.level === MAX_LEVEL &&
    a.elements[0] !== b.elements[0]);
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let k = ((px - ax) * dx + (py - ay) * dy) / l2;
  k = Math.max(0, Math.min(1, k));
  return Math.hypot(px - (ax + dx * k), py - (ay + dy * k));
}

/* ============================================================ */
export class Game {
  constructor(mapIndex, diffKey) {
    const diff = DIFFICULTIES[diffKey];
    this.mapIndex = mapIndex;
    this.diffKey = diffKey;
    this.diff = diff;
    this.map = buildMap(MAPS[mapIndex]);
    this.gold = diff.gold;
    this.lives = diff.lives;
    this.wave = 0;
    this.waveActive = false;
    this.waveTime = 0;
    this.spawnQueue = [];
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.over = false;
    this.won = false;
    this.endless = false;
    this.time = 0;
    this.kills = 0;
    this.nextId = 1;
    this.events = [];
    this.towerGrid = [];
    for (let r = 0; r < ROWS; r++) this.towerGrid.push(new Array(COLS).fill(null));
    this.currentWave = null;
    this.nextWaveData = this.makeWave(1);
  }

  emit(type, data = {}) { this.events.push({ type, ...data }); }
  sound(name, throttle = 0) { this.emit('sound', { name, throttle }); }
  toast(text, ms = 1200) { this.emit('toast', { text, ms }); }
  floater(x, y, text, color, size = 12) { this.emit('floater', { x, y, text, color, size }); }

  /* ---------- เวฟ ---------- */
  makeWave(n) {
    const hpScale = (28 * Math.pow(1.17, n - 1) + n * 4) * this.diff.hp;
    const basic = ['fire', 'water', 'earth', 'wind'];
    const pool = n >= 5 ? ELEMENT_ORDER : basic;
    const numEl = n <= 4 ? 1 : n < 18 ? 2 : 3;
    const els = [];
    while (els.length < numEl) {
      const e = pick(pool);
      if (!els.includes(e)) els.push(e);
    }
    const entries = [];
    let t = 0;
    const count = 8 + Math.floor(n * 0.9);
    const pattern = n % 5;
    const push = (type, gap) => {
      entries.push({ type, element: pick(els), t });
      t += gap;
    };
    const isBoss = n % 10 === 0;
    if (isBoss) {
      for (let i = 0; i < Math.floor(count / 2); i++) push(i % 3 === 0 ? 'tank' : 'grunt', 0.8);
      t += 1.5;
      entries.push({ type: 'boss', element: pick(els), t });
      t += 2;
    } else if (pattern === 1) {
      for (let i = 0; i < count; i++) push('grunt', 0.85);
    } else if (pattern === 2) {
      for (let i = 0; i < count; i++) push(i % 3 === 2 ? 'grunt' : 'runner', 0.55);
    } else if (pattern === 3) {
      for (let i = 0; i < count * 2; i++) push('swarm', 0.3);
    } else if (pattern === 4) {
      for (let i = 0; i < count; i++) push(i % 3 === 0 ? 'tank' : 'grunt', i % 3 === 0 ? 1.4 : 0.8);
    } else {
      for (let i = 0; i < count; i++) push(pick(['grunt', 'runner', 'tank', 'swarm', 'swarm']), 0.6);
    }
    if (n > TOTAL_WAVES && !isBoss && n % 5 === 0) {
      entries.push({ type: 'boss', element: pick(els), t: t + 1 });
    }
    const summary = {};
    for (const e of entries) summary[e.type] = (summary[e.type] || 0) + 1;
    return { n, els, entries, hpScale, summary, isBoss: entries.some((e) => e.type === 'boss') };
  }

  startWave() {
    if (this.over || this.waveActive) return false;
    this.wave += 1;
    const w = this.nextWaveData || this.makeWave(this.wave);
    this.currentWave = w;
    this.waveActive = true;
    this.waveTime = 0;
    this.spawnQueue = w.entries.map((e) => ({ ...e }));
    this.nextWaveData = this.makeWave(this.wave + 1);
    if (w.isBoss) {
      this.sound('boss');
      this.toast('⚠️ บอสธาตุกำลังมา!', 2000);
    } else {
      this.sound('wave');
      this.toast(`เวฟ ${this.wave}`, 1100);
    }
    this.emit('changed');
    return true;
  }

  endWave() {
    this.waveActive = false;
    const bonus = 20 + this.wave * 3;
    this.gold += bonus;
    this.emit('waveEnd', { bonus });
    if (this.wave >= TOTAL_WAVES && !this.endless && !this.won) {
      this.won = true;
      this.sound('win');
      this.emit('win');
    }
    this.emit('changed');
  }

  /* ---------- ป้อม ---------- */
  canBuildAt(c, r) {
    return c >= 0 && c < COLS && r >= 0 && r < ROWS && this.map.grid[r][c] === 0 && !this.towerGrid[r][c];
  }

  placeTower(el, c, r) {
    const cost = ELEMENTS[el].cost;
    if (!this.canBuildAt(c, r)) { this.sound('error'); return false; }
    if (this.gold < cost) { this.sound('error'); this.toast('ทองไม่พอ!', 900); return false; }
    this.gold -= cost;
    const t = {
      id: this.nextId++, c, r,
      x: c * TILE + TILE / 2, y: r * TILE + TILE / 2,
      elements: [el], level: 1, star: 0,
      spent: cost, cd: 0.2, angle: -Math.PI / 2,
      mode: 'first', kills: 0, dmgDealt: 0, version: 0,
    };
    t.stats = computeStats(t);
    this.towers.push(t);
    this.towerGrid[r][c] = t;
    this.emit('burst', { x: t.x, y: t.y, color: ELEMENTS[el].color, n: 24, spd: 2.5 });
    this.sound('build');
    this.emit('changed');
    return true;
  }

  upgradeTower(t) {
    const cost = upgradeCost(t);
    if (cost == null) return false;
    if (this.gold < cost) { this.sound('error'); this.toast('ทองไม่พอ!', 900); return false; }
    this.gold -= cost;
    t.spent += cost;
    if (t.elements.length === 1) t.level += 1; else t.star += 1;
    t.stats = computeStats(t);
    t.version += 1;
    this.emit('upgrade', { tower: t });
    this.emit('burst', { x: t.x, y: t.y, color: '#ffe680', n: 30, spd: 3 });
    this.sound('upgrade');
    this.emit('changed');
    return true;
  }

  sellTower(t) {
    const v = sellValue(t);
    this.gold += v;
    this.removeTower(t);
    this.floater(t.x, t.y, `+${v}`, '#ffcf4a', 14);
    this.emit('burst', { x: t.x, y: t.y, color: '#bbbbbb', n: 18, spd: 2 });
    this.sound('sell');
    this.emit('changed');
  }

  removeTower(t) {
    this.towers = this.towers.filter((x) => x !== t);
    this.towerGrid[t.r][t.c] = null;
  }

  fuseTowers(a, b) {
    if (!canFuse(a, b)) return false;
    if (this.gold < FUSION_COST) { this.sound('error'); this.toast('ทองไม่พอ!', 900); return false; }
    this.gold -= FUSION_COST;
    const els = [a.elements[0], b.elements[0]];
    a.elements = els;
    a.star = 0;
    a.spent += b.spent + FUSION_COST;
    a.kills += b.kills;
    a.dmgDealt += b.dmgDealt;
    a.stats = computeStats(a);
    a.version += 1;
    this.removeTower(b);
    this.emit('fuse', { tower: a, fromX: b.x, fromY: b.y, els });
    const f = FUSIONS[fusionKey(els[0], els[1])];
    this.toast(`✦ หลอมรวม: ${f.th} ✦`, 1600);
    this.sound('fuse');
    this.emit('changed');
    return true;
  }

  cycleMode(t) {
    t.mode = TARGET_MODES[(TARGET_MODES.indexOf(t.mode) + 1) % TARGET_MODES.length];
    this.emit('changed');
  }

  findTargets(t, count) {
    const s = t.stats;
    const list = [];
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const rr = s.range + e.size * 0.5;
      if (dist2(t.x, t.y, e.x, e.y) <= rr * rr) list.push(e);
    }
    if (!list.length) return list;
    switch (t.mode) {
      case 'last': list.sort((a, b) => a.d - b.d); break;
      case 'strong': list.sort((a, b) => b.hp - a.hp); break;
      case 'close': list.sort((a, b) => dist2(t.x, t.y, a.x, a.y) - dist2(t.x, t.y, b.x, b.y)); break;
      default: list.sort((a, b) => b.d - a.d);
    }
    return list.slice(0, count);
  }

  updateTower(t, dt) {
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
    this.sound(t.elements.length > 1 ? t.elements[1] : t.elements[0], 70);
  }

  fireProjectile(t, target) {
    const el = t.elements[0];
    const speeds = { fire: 330, water: 380, earth: 260, wind: 560, light: 600, dark: 340 };
    this.projectiles.push({
      id: this.nextId++,
      x: t.x + Math.cos(t.angle) * 14, y: t.y + Math.sin(t.angle) * 14,
      sx: t.x, sy: t.y,
      tx: target.x, ty: target.y, target, tower: t,
      speed: speeds[el], el, elements: t.elements.slice(),
    });
  }

  fireBeam(t, target) {
    const s = t.stats;
    const ang = Math.atan2(target.y - t.y, target.x - t.x);
    const len = s.range + 20;
    const x2 = t.x + Math.cos(ang) * len, y2 = t.y + Math.sin(ang) * len;
    const hit = new Set();
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (distToSegment(e.x, e.y, t.x, t.y, x2, y2) <= e.size + 6) hit.add(e);
    }
    hit.add(target);
    for (const e of hit) this.applyHit(e, t, 1);
    if (s.splash) {
      for (const e of this.enemies) {
        if (!e.alive || hit.has(e)) continue;
        if (dist2(e.x, e.y, target.x, target.y) <= s.splash * s.splash) this.applyHit(e, t, 0.5);
      }
      this.emit('explosion', { x: target.x, y: target.y, r: s.splash, color: ELEMENTS.fire.color });
    }
    this.emit('beam', {
      x1: t.x, y1: t.y, x2, y2,
      colors: t.elements.map((e) => ELEMENTS[e].color),
      width: 1 + (t.elements.length > 1 ? 0.8 : 0) + t.level * 0.25,
    });
  }

  updateProjectile(p, dt) {
    if (p.target && p.target.alive) { p.tx = p.target.x; p.ty = p.target.y; }
    const dx = p.tx - p.x, dy = p.ty - p.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (d <= step + 2) {
      this.impact(p);
      return false;
    }
    p.x += (dx / d) * step;
    p.y += (dy / d) * step;
    return true;
  }

  impact(p) {
    const t = p.tower;
    const s = t.stats;
    const color = ELEMENTS[p.elements[p.elements.length - 1]].color;
    if (s.splash) {
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const rr = s.splash + e.size * 0.5;
        if (dist2(e.x, e.y, p.tx, p.ty) <= rr * rr) this.applyHit(e, t, e === p.target ? 1 : 0.5);
      }
      this.emit('explosion', { x: p.tx, y: p.ty, r: s.splash, color: ELEMENTS[p.elements[0]].color });
    } else if (p.target && p.target.alive) {
      this.applyHit(p.target, t, 1);
      this.emit('burst', { x: p.tx, y: p.ty, color, n: 6, spd: 1.5, h: 0.35 });
    }
  }

  /* ---------- ศัตรู ---------- */
  spawnEnemy(entry, hpScale) {
    const T = ENEMY_TYPES[entry.type];
    const hp = T.hp * hpScale;
    const p = posAt(this.map, 0);
    this.enemies.push({
      id: this.nextId++, type: entry.type, element: entry.element,
      hp, maxHp: hp, speed: T.speed * rand(0.95, 1.05), size: T.size,
      reward: Math.max(1, Math.round((2 + this.wave * 0.25) * T.reward)),
      lives: T.lives, d: 0, x: p.x, y: p.y, angle: p.angle,
      slowT: 0, slowF: 1, stunT: 0, burnT: 0, burnDps: 0, burnSrc: null,
      curseT: 0, curseAmp: 1, alive: true, flash: 0,
    });
  }

  applyHit(e, t, mul) {
    if (!e.alive) return;
    const s = t.stats;
    let base = s.dmg * mul;
    // ดาเมจตาม % HP จำกัดไม่เกิน 3 เท่าของดาเมจพื้นฐาน เพื่อไม่ให้แรงเกินในเวฟท้าย ๆ
    if (s.percent) base += Math.min(e.maxHp * s.percent * (e.type === 'boss' ? 0.25 : 1), s.dmg * 3) * mul;
    const m = this.dealDamage(e, base, t.elements, t);
    if (!e.alive) return;
    const boss = e.type === 'boss';
    if (s.slow) {
      const f = boss ? Math.sqrt(s.slow.factor) : s.slow.factor;
      e.slowF = e.slowT > 0 ? Math.min(e.slowF, f) : f;
      e.slowT = Math.max(e.slowT, s.slow.dur);
    }
    if (s.burn) {
      e.burnDps = Math.max(e.burnT > 0 ? e.burnDps : 0, s.burn.dps * m);
      e.burnT = s.burn.dur;
      e.burnSrc = t;
    }
    if (s.stun && Math.random() < s.stun.chance * mul) {
      e.stunT = Math.max(e.stunT, s.stun.dur * (boss ? 0.3 : 1));
    }
    if (s.knock && !boss && Math.random() < s.knock.chance * mul) {
      e.d = Math.max(0, e.d - s.knock.dist);
    }
    if (s.curse) {
      e.curseAmp = Math.max(e.curseT > 0 ? e.curseAmp : 1, s.curse.amp);
      e.curseT = s.curse.dur;
    }
  }

  // คืนค่าตัวคูณธาตุที่ใช้
  dealDamage(e, amount, atkElements, tower) {
    let mult = 1;
    if (atkElements) {
      mult = 0;
      for (const a of atkElements) mult = Math.max(mult, elementMultiplier(a, e.element));
    }
    const dmg = amount * mult * (e.curseT > 0 ? e.curseAmp : 1);
    e.hp -= dmg;
    e.flash = 0.08;
    if (tower) tower.dmgDealt += dmg;
    if (atkElements && dmg >= 1) {
      const col = mult > 1 ? '#ffe45a' : mult < 1 ? '#9aa0b8' : '#ffffff';
      this.floater(e.x + rand(-6, 6), e.y, Math.round(dmg).toString(), col, mult > 1 ? 14 : 11);
    }
    if (e.hp <= 0) this.killEnemy(e, tower);
    return mult;
  }

  killEnemy(e, tower) {
    if (!e.alive) return;
    e.alive = false;
    this.gold += e.reward;
    this.kills += 1;
    if (tower) tower.kills += 1;
    const boss = e.type === 'boss';
    this.emit('burst', { x: e.x, y: e.y, color: ELEMENTS[e.element].color, n: boss ? 120 : 20, spd: boss ? 5 : 2.5, h: 0.3 });
    this.floater(e.x, e.y, `+${e.reward}`, '#ffcf4a', 13);
    if (boss) this.toast('บอสถูกกำจัด!', 1400);
  }

  updateEnemy(e, dt) {
    e.flash = Math.max(0, e.flash - dt);
    if (e.slowT > 0) e.slowT -= dt;
    if (e.stunT > 0) e.stunT -= dt;
    if (e.curseT > 0) e.curseT -= dt;
    if (e.burnT > 0) {
      e.burnT -= dt;
      this.dealDamage(e, e.burnDps * dt, null, e.burnSrc);
      if (!e.alive) return;
    }
    let v = e.speed;
    if (e.slowT > 0) v *= e.slowF;
    if (e.stunT > 0) v = 0;
    e.d += v * dt;
    if (e.d >= this.map.total) {
      e.alive = false;
      this.lives -= e.lives;
      this.sound('leak');
      this.emit('leak', { lives: e.lives, x: e.x, y: e.y });
      this.floater(e.x, e.y, `-${e.lives} ❤️`, '#ff5a6a', 18);
      if (this.lives <= 0) {
        this.lives = 0;
        this.gameOver();
      }
      this.emit('changed');
      return;
    }
    const p = posAt(this.map, e.d);
    e.x = p.x; e.y = p.y; e.angle = p.angle;
  }

  gameOver() {
    if (this.over) return;
    this.over = true;
    this.sound('lose');
    this.emit('lose');
  }

  /* ---------- ลูปหลัก ---------- */
  update(dt) {
    this.time += dt;
    if (this.waveActive) {
      this.waveTime += dt;
      while (this.spawnQueue.length && this.spawnQueue[0].t <= this.waveTime) {
        this.spawnEnemy(this.spawnQueue.shift(), this.currentWave.hpScale);
      }
    }
    for (const e of this.enemies) if (e.alive) this.updateEnemy(e, dt);
    if (this.over) {
      this.enemies = this.enemies.filter((e) => e.alive);
      return;
    }
    for (const t of this.towers) this.updateTower(t, dt);
    this.projectiles = this.projectiles.filter((p) => this.updateProjectile(p, dt));
    this.enemies = this.enemies.filter((e) => e.alive);
    if (this.waveActive && !this.spawnQueue.length && !this.enemies.length) this.endWave();
  }

  strongAgainst(elements) {
    return [...new Set(elements.map((e) => BEATS[e]))];
  }
}
