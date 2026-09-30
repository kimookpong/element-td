'use strict';
/* ============================================================
 *  Element TD — เอนจินเกมหลัก
 * ============================================================ */

(() => {
  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d');

  const TARGET_MODES = ['first', 'last', 'strong', 'close'];
  const TARGET_LABEL = { first: 'หัวแถว', last: 'ท้ายแถว', strong: 'HP มากสุด', close: 'ใกล้สุด' };
  const DMG_BY_LEVEL = [1, 1.7, 2.8];
  const MAX_STAR = 3;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;

  /* ---------------- สถานะเกม ---------------- */
  const state = {
    mapIndex: 0,
    diffKey: 'normal',
    running: false,
  };

  let map = null;        // ข้อมูลเส้นทางที่คำนวณแล้ว
  let bgCanvas = null;   // พื้นหลังที่เรนเดอร์ไว้ล่วงหน้า
  let nextId = 1;

  function loadBest() {
    try { return JSON.parse(localStorage.getItem('etd_best') || '{}'); } catch (e) { return {}; }
  }
  function saveBest(wave) {
    const best = loadBest();
    const key = MAPS[state.mapIndex].id + ':' + state.diffKey;
    if (!best[key] || wave > best[key]) {
      best[key] = wave;
      try { localStorage.setItem('etd_best', JSON.stringify(best)); } catch (e) { /* ignore */ }
    }
  }

  /* ---------------- แผนที่ / เส้นทาง ---------------- */
  function buildMap(def) {
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
    for (let i = 0; i < def.points.length - 1; i++) {
      let [c1, r1] = def.points[i];
      const [c2, r2] = def.points[i + 1];
      const dc = Math.sign(c2 - c1), dr = Math.sign(r2 - r1);
      for (;;) {
        if (c1 >= 0 && c1 < COLS && r1 >= 0 && r1 < ROWS) grid[r1][c1] = 1;
        if (c1 === c2 && r1 === r2) break;
        c1 += dc; r1 += dr;
      }
    }
    return { def, pts, segs, total, grid };
  }

  function posAt(d) {
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

  // สุ่มแบบกำหนด seed เพื่อให้ของตกแต่งเหมือนเดิมทุกครั้ง
  function seeded(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function renderBackground(m, w = WIDTH, h = HEIGHT) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const sx = w / WIDTH;
    g.scale(sx, sx);
    const def = m.def;
    for (let r = 0; r < ROWS; r++) {
      for (let col = 0; col < COLS; col++) {
        g.fillStyle = def.grass[(r + col) % 2];
        g.fillRect(col * TILE, r * TILE, TILE, TILE);
      }
    }
    const rnd = seeded(def.id.length * 977 + def.points.length * 31);
    // หญ้า/หิน ตกแต่ง
    for (let i = 0; i < 160; i++) {
      const x = rnd() * WIDTH, y = rnd() * HEIGHT;
      const col = Math.floor(x / TILE), row = Math.floor(y / TILE);
      if (m.grid[row] && m.grid[row][col] === 1) continue;
      g.fillStyle = `rgba(255,255,255,${0.03 + rnd() * 0.05})`;
      g.beginPath();
      g.arc(x, y, 1 + rnd() * 2.5, 0, Math.PI * 2);
      g.fill();
    }
    // เส้นทาง
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = TILE * 0.92 + 6;
    strokePath(g, m.pts);
    g.strokeStyle = def.path;
    g.lineWidth = TILE * 0.92;
    strokePath(g, m.pts);
    g.strokeStyle = 'rgba(255,255,255,0.12)';
    g.lineWidth = 2;
    g.setLineDash([8, 10]);
    strokePath(g, m.pts);
    g.setLineDash([]);
    // เส้นตาราง
    g.strokeStyle = 'rgba(0,0,0,0.08)';
    g.lineWidth = 1;
    for (let col = 1; col < COLS; col++) { g.beginPath(); g.moveTo(col * TILE, 0); g.lineTo(col * TILE, HEIGHT); g.stroke(); }
    for (let r = 1; r < ROWS; r++) { g.beginPath(); g.moveTo(0, r * TILE); g.lineTo(WIDTH, r * TILE); g.stroke(); }
    return c;
  }

  function strokePath(g, pts) {
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.stroke();
  }

  /* ---------------- ค่าสถานะป้อม ---------------- */
  function singleStats(el, level) {
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

  function computeStats(t) {
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

  function towerName(t) {
    if (t.elements.length === 1) {
      const e = ELEMENTS[t.elements[0]];
      return `ป้อม${e.th}`;
    }
    const f = FUSIONS[fusionKey(t.elements[0], t.elements[1])];
    return `${f.th} (${f.name})`;
  }

  function upgradeCost(t) {
    if (t.elements.length === 1) {
      if (t.level >= MAX_LEVEL) return null;
      const base = ELEMENTS[t.elements[0]].cost;
      return Math.round(base * (t.level === 1 ? 0.9 : 1.5));
    }
    if (t.star >= MAX_STAR) return null;
    return 250 * (t.star + 1);
  }

  const sellValue = (t) => Math.floor(t.spent * 0.7);

  /* ---------------- การสร้างเวฟ ---------------- */
  function makeWave(n) {
    const diff = DIFFICULTIES[state.diffKey];
    const hpScale = (28 * Math.pow(1.17, n - 1) + n * 4) * diff.hp;
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
      const bossEl = pick(els);
      entries.push({ type: 'boss', element: bossEl, t });
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

  /* ---------------- เริ่มเกม ---------------- */
  function newGame() {
    const diff = DIFFICULTIES[state.diffKey];
    map = buildMap(MAPS[state.mapIndex]);
    bgCanvas = renderBackground(map);
    Object.assign(state, {
      running: true,
      over: false,
      won: false,
      endless: false,
      gold: diff.gold,
      lives: diff.lives,
      wave: 0,
      waveActive: false,
      waveTime: 0,
      spawnQueue: [],
      towers: [],
      enemies: [],
      projectiles: [],
      beams: [],
      particles: [],
      floaters: [],
      speed: 1,
      paused: false,
      selectedBuild: null,
      selectedTower: null,
      fuseMode: false,
      hover: null,
      time: 0,
      nextWaveData: null,
      kills: 0,
    });
    state.towerGrid = [];
    for (let r = 0; r < ROWS; r++) state.towerGrid.push(new Array(COLS).fill(null));
    state.nextWaveData = makeWave(1);
    ui.speed.textContent = '1×';
    ui.pause.textContent = '⏸';
    hideOverlays();
    renderInfo();
    updateHud(true);
    renderNextWave();
    showToast(MAPS[state.mapIndex].name, 1600);
  }

  function startWave() {
    if (!state.running || state.over || state.waveActive) return;
    state.wave += 1;
    const w = state.nextWaveData || makeWave(state.wave);
    state.currentWave = w;
    state.waveActive = true;
    state.waveTime = 0;
    state.spawnQueue = w.entries.map((e) => ({ ...e }));
    state.nextWaveData = makeWave(state.wave + 1);
    if (w.isBoss) {
      Sound.play('boss');
      showToast('⚠️ บอสธาตุกำลังมา!', 2000);
    } else {
      Sound.play('wave');
      showToast(`เวฟ ${state.wave}`, 1100);
    }
    renderNextWave();
    updateHud(true);
  }

  function endWave() {
    state.waveActive = false;
    const bonus = 20 + state.wave * 3;
    state.gold += bonus;
    addFloater(WIDTH / 2, HEIGHT / 2 + 40, `+${bonus} โบนัสจบเวฟ`, '#ffcf4a', 1.6, 18);
    saveBest(state.wave);
    if (state.wave >= TOTAL_WAVES && !state.endless && !state.won) {
      state.won = true;
      Sound.play('win');
      showEnd(true);
    }
    renderNextWave();
    updateHud(true);
    renderInfo();
  }

  /* ---------------- ป้อม ---------------- */
  function canBuildAt(c, r) {
    return c >= 0 && c < COLS && r >= 0 && r < ROWS && map.grid[r][c] === 0 && !state.towerGrid[r][c];
  }

  function placeTower(el, c, r) {
    const cost = ELEMENTS[el].cost;
    if (!canBuildAt(c, r)) { Sound.play('error'); return false; }
    if (state.gold < cost) { Sound.play('error'); flashMsg('ทองไม่พอ!'); return false; }
    state.gold -= cost;
    const t = {
      id: nextId++, c, r,
      x: c * TILE + TILE / 2, y: r * TILE + TILE / 2,
      elements: [el], level: 1, star: 0,
      spent: cost, cd: 0.2, angle: -Math.PI / 2,
      mode: 'first', kills: 0, dmgDealt: 0, pulse: 1,
    };
    t.stats = computeStats(t);
    state.towers.push(t);
    state.towerGrid[r][c] = t;
    burst(t.x, t.y, ELEMENTS[el].color, 14, 90);
    Sound.play('build');
    updateHud(true);
    return true;
  }

  function upgradeTower(t) {
    const cost = upgradeCost(t);
    if (cost == null) return;
    if (state.gold < cost) { Sound.play('error'); flashMsg('ทองไม่พอ!'); return; }
    state.gold -= cost;
    t.spent += cost;
    if (t.elements.length === 1) t.level += 1; else t.star += 1;
    t.stats = computeStats(t);
    t.pulse = 1;
    burst(t.x, t.y, '#ffe680', 20, 120);
    Sound.play('upgrade');
    renderInfo();
    updateHud(true);
  }

  function sellTower(t) {
    const v = sellValue(t);
    state.gold += v;
    state.towers = state.towers.filter((x) => x !== t);
    state.towerGrid[t.r][t.c] = null;
    addFloater(t.x, t.y - 10, `+${v}`, '#ffcf4a');
    burst(t.x, t.y, '#aaa', 12, 70);
    Sound.play('sell');
    if (state.selectedTower === t) state.selectedTower = null;
    state.fuseMode = false;
    renderInfo();
    updateHud(true);
  }

  function canFuse(a, b) {
    return a && b && a !== b &&
      a.elements.length === 1 && b.elements.length === 1 &&
      a.level === MAX_LEVEL && b.level === MAX_LEVEL &&
      a.elements[0] !== b.elements[0];
  }

  function fuseTowers(a, b) {
    if (!canFuse(a, b)) return;
    if (state.gold < FUSION_COST) { Sound.play('error'); flashMsg('ทองไม่พอ!'); return; }
    state.gold -= FUSION_COST;
    const els = [a.elements[0], b.elements[0]];
    a.elements = els;
    a.star = 0;
    a.spent += b.spent + FUSION_COST;
    a.kills += b.kills;
    a.dmgDealt += b.dmgDealt;
    a.stats = computeStats(a);
    a.pulse = 1.5;
    state.towers = state.towers.filter((x) => x !== b);
    state.towerGrid[b.r][b.c] = null;
    // เอฟเฟกต์พลังงานไหลจาก b ไป a
    for (let i = 0; i < 30; i++) {
      const k = i / 30;
      state.particles.push({
        x: b.x + (a.x - b.x) * k, y: b.y + (a.y - b.y) * k,
        vx: rand(-40, 40), vy: rand(-40, 40), life: 0.6 + k * 0.4, max: 1,
        color: ELEMENTS[els[i % 2]].color, size: 3,
      });
    }
    burst(a.x, a.y, ELEMENTS[els[0]].color, 24, 160);
    burst(a.x, a.y, ELEMENTS[els[1]].color, 24, 160);
    const f = FUSIONS[fusionKey(els[0], els[1])];
    showToast(`✦ หลอมรวม: ${f.th} ✦`, 1600);
    Sound.play('fuse');
    state.fuseMode = false;
    state.selectedTower = a;
    renderInfo();
    updateHud(true);
  }

  function findTargets(t, count) {
    const s = t.stats;
    const list = [];
    for (const e of state.enemies) {
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

  function updateTower(t, dt) {
    t.cd -= dt;
    if (t.pulse > 0) t.pulse = Math.max(0, t.pulse - dt * 2);
    const s = t.stats;
    const targets = findTargets(t, s.multi || 1);
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
    const primary = t.elements[0];
    for (const target of targets) {
      if (s.pierce) fireBeam(t, target);
      else fireProjectile(t, target);
    }
    Sound.play(t.elements.length > 1 ? t.elements[1] : primary, 70);
  }

  function fireProjectile(t, target) {
    const el = t.elements[0];
    const speeds = { fire: 330, water: 380, earth: 260, wind: 560, light: 600, dark: 340 };
    const sizes = { fire: 5, water: 4, earth: 7, wind: 3, light: 4, dark: 5 };
    state.projectiles.push({
      x: t.x + Math.cos(t.angle) * 14, y: t.y + Math.sin(t.angle) * 14,
      tx: target.x, ty: target.y, target, tower: t,
      speed: speeds[el], size: sizes[el] + (t.elements.length > 1 ? 2 : 0),
      colors: t.elements.map((e) => ELEMENTS[e].color),
      trail: [],
    });
  }

  function fireBeam(t, target) {
    const s = t.stats;
    const ang = Math.atan2(target.y - t.y, target.x - t.x);
    const len = s.range + 20;
    const x2 = t.x + Math.cos(ang) * len, y2 = t.y + Math.sin(ang) * len;
    const hit = new Set();
    for (const e of state.enemies) {
      if (!e.alive) continue;
      if (distToSegment(e.x, e.y, t.x, t.y, x2, y2) <= e.size + 6) hit.add(e);
    }
    hit.add(target);
    for (const e of hit) applyHit(e, t, 1);
    if (s.splash) {
      for (const e of state.enemies) {
        if (!e.alive || hit.has(e)) continue;
        if (dist2(e.x, e.y, target.x, target.y) <= s.splash * s.splash) applyHit(e, t, 0.5);
      }
      explosion(target.x, target.y, s.splash, ELEMENTS.fire.color);
    }
    state.beams.push({
      x1: t.x, y1: t.y, x2, y2, life: 0.22, max: 0.22,
      colors: t.elements.map((e) => ELEMENTS[e].color),
      width: 4 + (t.elements.length > 1 ? 3 : 0) + t.level,
    });
  }

  function distToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy;
    let k = ((px - ax) * dx + (py - ay) * dy) / l2;
    k = Math.max(0, Math.min(1, k));
    return Math.hypot(px - (ax + dx * k), py - (ay + dy * k));
  }

  function updateProjectile(p, dt) {
    if (p.target && p.target.alive) { p.tx = p.target.x; p.ty = p.target.y; }
    const dx = p.tx - p.x, dy = p.ty - p.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 6) p.trail.shift();
    if (d <= step + 2) {
      impact(p);
      return false;
    }
    p.x += (dx / d) * step;
    p.y += (dy / d) * step;
    return true;
  }

  function impact(p) {
    const t = p.tower;
    const s = t.stats;
    if (s.splash) {
      for (const e of state.enemies) {
        if (!e.alive) continue;
        const rr = s.splash + e.size * 0.5;
        if (dist2(e.x, e.y, p.tx, p.ty) <= rr * rr) applyHit(e, t, e === p.target ? 1 : 0.5);
      }
      explosion(p.tx, p.ty, s.splash, p.colors[0]);
    } else if (p.target && p.target.alive) {
      applyHit(p.target, t, 1);
      burst(p.tx, p.ty, p.colors[p.colors.length - 1], 4, 50);
    }
  }

  /* ---------------- ศัตรู ---------------- */
  function spawnEnemy(entry, hpScale) {
    const T = ENEMY_TYPES[entry.type];
    const hp = T.hp * hpScale;
    const p = posAt(0);
    state.enemies.push({
      id: nextId++, type: entry.type, element: entry.element,
      hp, maxHp: hp, speed: T.speed * rand(0.95, 1.05), size: T.size,
      reward: Math.max(1, Math.round((2 + state.wave * 0.25) * T.reward)),
      lives: T.lives, d: 0, x: p.x, y: p.y, angle: p.angle,
      slowT: 0, slowF: 1, stunT: 0, burnT: 0, burnDps: 0, burnSrc: null,
      curseT: 0, curseAmp: 1, alive: true, flash: 0, wobble: Math.random() * 10,
    });
  }

  function applyHit(e, t, mul) {
    if (!e.alive) return;
    const s = t.stats;
    let base = s.dmg * mul;
    // ดาเมจตาม % HP จำกัดไม่เกิน 3 เท่าของดาเมจพื้นฐาน เพื่อไม่ให้แรงเกินในเวฟท้าย ๆ
    if (s.percent) base += Math.min(e.maxHp * s.percent * (e.type === 'boss' ? 0.25 : 1), s.dmg * 3) * mul;
    const m = dealDamage(e, base, t.elements, t);
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
  function dealDamage(e, amount, atkElements, tower) {
    let mult = 1;
    if (atkElements) {
      mult = 0;
      for (const a of atkElements) mult = Math.max(mult, elementMultiplier(a, e.element));
    }
    const dmg = amount * mult * (e.curseT > 0 ? e.curseAmp : 1);
    e.hp -= dmg;
    e.flash = 0.08;
    if (tower) tower.dmgDealt += dmg;
    if (atkElements && dmg >= 1 && state.floaters.length < 50) {
      const col = mult > 1 ? '#ffe45a' : mult < 1 ? '#9aa0b8' : '#ffffff';
      addFloater(e.x + rand(-6, 6), e.y - e.size - 4, Math.round(dmg).toString(), col, 0.6, mult > 1 ? 13 : 11);
    }
    if (e.hp <= 0) killEnemy(e, tower);
    return mult;
  }

  function killEnemy(e, tower) {
    if (!e.alive) return;
    e.alive = false;
    state.gold += e.reward;
    state.kills += 1;
    if (tower) tower.kills += 1;
    burst(e.x, e.y, ELEMENTS[e.element].color, e.type === 'boss' ? 60 : 12, e.type === 'boss' ? 200 : 100);
    addFloater(e.x, e.y - 8, `+${e.reward}`, '#ffcf4a', 0.9, 12);
    if (e.type === 'boss') showToast('บอสถูกกำจัด!', 1400);
  }

  function updateEnemy(e, dt) {
    e.flash = Math.max(0, e.flash - dt);
    if (e.slowT > 0) e.slowT -= dt;
    if (e.stunT > 0) e.stunT -= dt;
    if (e.curseT > 0) e.curseT -= dt;
    if (e.burnT > 0) {
      e.burnT -= dt;
      dealDamage(e, e.burnDps * dt, null, e.burnSrc);
      if (!e.alive) return;
      if (Math.random() < dt * 12) {
        state.particles.push({ x: e.x + rand(-5, 5), y: e.y, vx: rand(-10, 10), vy: rand(-50, -20), life: 0.4, max: 0.4, color: '#ff8a3a', size: 2.5 });
      }
    }
    let v = e.speed;
    if (e.slowT > 0) v *= e.slowF;
    if (e.stunT > 0) v = 0;
    e.d += v * dt;
    if (e.d >= map.total) {
      e.alive = false;
      state.lives -= e.lives;
      Sound.play('leak');
      shake = 0.3;
      addFloater(e.x - 20, e.y - 10, `-${e.lives} ❤️`, '#ff5a6a', 1.2, 16);
      if (state.lives <= 0) {
        state.lives = 0;
        gameOver();
      }
      return;
    }
    const p = posAt(e.d);
    e.x = p.x; e.y = p.y; e.angle = p.angle;
  }

  function gameOver() {
    if (state.over) return;
    state.over = true;
    saveBest(Math.max(0, state.wave - 1));
    Sound.play('lose');
    setTimeout(() => showEnd(false), 700);
  }

  /* ---------------- เอฟเฟกต์ ---------------- */
  let shake = 0;

  function burst(x, y, color, n, spd) {
    for (let i = 0; i < n && state.particles.length < 500; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = rand(spd * 0.3, spd);
      const life = rand(0.3, 0.7);
      state.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, color, size: rand(1.5, 3.5) });
    }
  }

  function explosion(x, y, r, color) {
    state.beams.push({ ring: true, x, y, r, life: 0.3, max: 0.3, color });
    burst(x, y, color, 8, 90);
  }

  function addFloater(x, y, text, color, life = 0.9, size = 12) {
    state.floaters.push({ x, y, text, color, life, max: life, size });
  }

  /* ---------------- ลูปหลัก ---------------- */
  function update(dt) {
    state.time += dt;
    if (state.waveActive) {
      state.waveTime += dt;
      while (state.spawnQueue.length && state.spawnQueue[0].t <= state.waveTime) {
        spawnEnemy(state.spawnQueue.shift(), state.currentWave.hpScale);
      }
    }
    for (const e of state.enemies) if (e.alive) updateEnemy(e, dt);
    if (state.over) {
      state.enemies = state.enemies.filter((e) => e.alive);
      return;
    }
    for (const t of state.towers) updateTower(t, dt);
    state.projectiles = state.projectiles.filter((p) => updateProjectile(p, dt));
    state.enemies = state.enemies.filter((e) => e.alive);

    for (const p of state.particles) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.94; p.vy *= 0.94;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
    for (const b of state.beams) b.life -= dt;
    state.beams = state.beams.filter((b) => b.life > 0);
    for (const f of state.floaters) { f.life -= dt; f.y -= 28 * dt; }
    state.floaters = state.floaters.filter((f) => f.life > 0);

    if (state.waveActive && !state.spawnQueue.length && !state.enemies.length) endWave();
  }

  let last = performance.now();
  function frame(now) {
    const realDt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state.running && !state.paused) {
      let remaining = realDt * state.speed;
      while (remaining > 0) {
        const step = Math.min(remaining, 1 / 60);
        update(step);
        remaining -= step;
      }
    }
    if (shake > 0) shake = Math.max(0, shake - realDt);
    if (state.running) {
      render();
      updateHud(false);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- เรนเดอร์ ---------------- */
  function render() {
    ctx.save();
    if (shake > 0) ctx.translate(rand(-3, 3) * shake * 3, rand(-3, 3) * shake * 3);
    ctx.drawImage(bgCanvas, 0, 0);
    drawPortalAndCore();

    // ช่องที่เมาส์ชี้ / ระยะยิง
    const sel = state.selectedTower;
    if (sel) drawRange(sel.x, sel.y, sel.stats.range, 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0.5)');

    if (state.fuseMode && sel) {
      for (const t of state.towers) {
        if (canFuse(sel, t)) {
          ctx.strokeStyle = `rgba(255,230,120,${0.5 + 0.4 * Math.sin(state.time * 8)})`;
          ctx.lineWidth = 3;
          ctx.strokeRect(t.c * TILE + 2, t.r * TILE + 2, TILE - 4, TILE - 4);
        }
      }
    }

    for (const t of state.towers) drawTower(t);
    for (const e of state.enemies) drawEnemy(e);
    for (const p of state.projectiles) drawProjectile(p);
    for (const b of state.beams) drawBeam(b);

    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    drawGhost();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of state.floaters) {
      ctx.globalAlpha = Math.min(1, f.life / f.max * 2);
      ctx.font = `bold ${f.size}px sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    if (state.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText('⏸ หยุดชั่วคราว', WIDTH / 2, HEIGHT / 2);
    }
    ctx.restore();
  }

  function drawRange(x, y, r, fill, stroke) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawPortalAndCore() {
    const start = { x: Math.max(TILE / 2, Math.min(WIDTH - TILE / 2, map.pts[0].x)), y: map.pts[0].y };
    if (map.pts[0].x < 0) start.x = 6;
    if (map.pts[0].x > WIDTH) start.x = WIDTH - 6;
    const tt = state.time;
    // พอร์ทัล
    ctx.save();
    ctx.translate(start.x, start.y);
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `hsla(${(tt * 80 + i * 60) % 360},90%,65%,0.8)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, 8 + i * 3, 16 + i * 3, 0, tt * 2 + i, tt * 2 + i + Math.PI * 1.3);
      ctx.stroke();
    }
    ctx.restore();
    // แกนกลาง (คริสตัลหกธาตุ)
    const end = map.pts[map.pts.length - 1];
    const cx = Math.max(TILE / 2, Math.min(WIDTH - 18, end.x));
    const cy = end.y;
    ctx.save();
    ctx.translate(cx, cy);
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 30);
    glow.addColorStop(0, 'rgba(255,255,255,0.9)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(tt * 0.6);
    ELEMENT_ORDER.forEach((el, i) => {
      ctx.fillStyle = ELEMENTS[el].color;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 15, (i / 6) * Math.PI * 2, ((i + 1) / 6) * Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    });
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function drawTower(t) {
    const x = t.x, y = t.y;
    const fused = t.elements.length > 1;
    const c1 = ELEMENTS[t.elements[0]].color;
    const c2 = fused ? ELEMENTS[t.elements[1]].color : ELEMENTS[t.elements[0]].glow;
    // ฐาน
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(x, y + 14, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = fused ? '#3a3350' : '#3b3f55';
    roundRect(x - 16, y - 16, 32, 32, 7);
    ctx.fill();
    ctx.strokeStyle = fused ? '#ffe680' : 'rgba(255,255,255,0.18)';
    ctx.lineWidth = fused ? 2 : 1;
    ctx.stroke();

    // ออร่า (ป้อมหลอมรวม)
    if (fused) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(state.time * 1.5);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = c1;
      ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI); ctx.stroke();
      ctx.strokeStyle = c2;
      ctx.beginPath(); ctx.arc(0, 0, 19, Math.PI, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // แกนธาตุ
    const r = 11 + (fused ? 2 : t.level);
    const g = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, r);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.35, c2);
    g.addColorStop(1, c1);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    if (fused) {
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = c2;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
      ctx.restore();
    }

    // ลำกล้อง
    ctx.strokeStyle = 'rgba(20,20,30,0.85)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(t.angle) * 6, y + Math.sin(t.angle) * 6);
    ctx.lineTo(x + Math.cos(t.angle) * 17, y + Math.sin(t.angle) * 17);
    ctx.stroke();
    ctx.strokeStyle = c2;
    ctx.lineWidth = 2;
    ctx.stroke();

    // ไอคอน
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ELEMENTS[t.elements[fused ? 1 : 0]].icon, x, y + 1);
    if (fused) {
      ctx.font = '10px sans-serif';
      ctx.fillText(ELEMENTS[t.elements[0]].icon, x - 9, y - 9);
    }

    // เลเวล
    if (fused) {
      ctx.fillStyle = '#ffe680';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('★'.repeat(t.star + 1), x, y + 13);
    } else {
      for (let i = 0; i < t.level; i++) {
        ctx.fillStyle = '#ffe680';
        ctx.beginPath();
        ctx.arc(x - (t.level - 1) * 4 + i * 8, y + 13, 2.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (t.pulse > 0) {
      ctx.strokeStyle = `rgba(255,240,150,${t.pulse / 1.5})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, 18 + (1.5 - t.pulse) * 16, 0, Math.PI * 2); ctx.stroke();
    }
    if (state.selectedTower === t) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      roundRect(x - 19, y - 19, 38, 38, 8);
      ctx.stroke();
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawEnemy(e) {
    const el = ELEMENTS[e.element];
    const s = e.size;
    const bob = Math.sin(state.time * 8 + e.wobble) * 1.2;
    const x = e.x, y = e.y + bob;

    // เงา
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(e.x, e.y + s * 0.8, s * 0.9, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();

    if (e.curseT > 0) {
      ctx.fillStyle = 'rgba(155,77,255,0.25)';
      ctx.beginPath(); ctx.arc(x, y, s + 6 + Math.sin(state.time * 10) * 2, 0, Math.PI * 2); ctx.fill();
    }
    if (e.type === 'boss') {
      const g = ctx.createRadialGradient(x, y, s * 0.5, x, y, s * 2);
      g.addColorStop(0, el.color + '88');
      g.addColorStop(1, el.color + '00');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, s * 2, 0, Math.PI * 2); ctx.fill();
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : el.color;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    switch (e.type) {
      case 'runner':
        ctx.rotate(e.angle);
        ctx.moveTo(s * 1.2, 0);
        ctx.lineTo(-s * 0.8, s * 0.85);
        ctx.lineTo(-s * 0.4, 0);
        ctx.lineTo(-s * 0.8, -s * 0.85);
        ctx.closePath();
        break;
      case 'tank':
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
          ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
        }
        ctx.closePath();
        break;
      case 'boss': {
        ctx.rotate(state.time * 0.8);
        const spikes = 8;
        for (let i = 0; i < spikes * 2; i++) {
          const a = (i / (spikes * 2)) * Math.PI * 2;
          const rr = i % 2 ? s * 0.7 : s;
          ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
        break;
      }
      default:
        ctx.arc(0, 0, s, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // ตาหรือไอคอน
    if (e.type === 'boss' || e.type === 'tank') {
      ctx.font = `${e.type === 'boss' ? 18 : 12}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(el.icon, x, y + 1);
    } else if (e.type !== 'runner') {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      const ex = Math.cos(e.angle) * s * 0.35, ey = Math.sin(e.angle) * s * 0.35;
      ctx.beginPath();
      ctx.arc(x + ex - ey * 0.6, y + ey + ex * 0.6, Math.max(1.3, s * 0.18), 0, Math.PI * 2);
      ctx.arc(x + ex + ey * 0.6, y + ey - ex * 0.6, Math.max(1.3, s * 0.18), 0, Math.PI * 2);
      ctx.fill();
    }

    // สถานะ
    if (e.slowT > 0) {
      ctx.strokeStyle = 'rgba(140,210,255,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, s + 3, 0, Math.PI * 2); ctx.stroke();
    }
    if (e.stunT > 0) {
      ctx.fillStyle = '#ffe45a';
      for (let i = 0; i < 3; i++) {
        const a = state.time * 6 + (i / 3) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * (s + 2), y - s - 4 + Math.sin(a) * 3, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // แถบ HP
    if (e.hp < e.maxHp || e.type === 'boss') {
      const w = e.type === 'boss' ? 46 : Math.max(18, s * 2.2);
      const hy = y - s - (e.type === 'boss' ? 14 : 8);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(x - w / 2 - 1, hy - 1, w + 2, 5);
      const k = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = k > 0.5 ? '#57e08a' : k > 0.25 ? '#ffcf4a' : '#ff5a6a';
      ctx.fillRect(x - w / 2, hy, w * k, 3);
    }
  }

  function drawProjectile(p) {
    const c = p.colors[p.colors.length - 1];
    for (let i = 0; i < p.trail.length; i++) {
      const tr = p.trail[i];
      ctx.globalAlpha = (i / p.trail.length) * 0.5;
      ctx.fillStyle = p.colors[i % p.colors.length];
      ctx.beginPath(); ctx.arc(tr.x, tr.y, p.size * (i / p.trail.length), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 1.8);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.4, c);
    g.addColorStop(1, c + '00');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 1.8, 0, Math.PI * 2); ctx.fill();
  }

  function drawBeam(b) {
    const k = b.life / b.max;
    if (b.ring) {
      ctx.strokeStyle = b.color;
      ctx.globalAlpha = k;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (1.1 - k * 0.6), 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = b.color;
      ctx.globalAlpha = k * 0.2;
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }
    ctx.lineCap = 'round';
    ctx.globalAlpha = k;
    b.colors.forEach((c, i) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = b.width * k * (1 - i * 0.4);
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    });
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = Math.max(1, b.width * 0.3 * k);
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawGhost() {
    const h = state.hover;
    if (!h || !state.selectedBuild || state.fuseMode) return;
    const el = ELEMENTS[state.selectedBuild];
    const ok = canBuildAt(h.c, h.r) && state.gold >= el.cost;
    const x = h.c * TILE + TILE / 2, y = h.r * TILE + TILE / 2;
    drawRange(x, y, el.range, ok ? 'rgba(255,255,255,0.08)' : 'rgba(255,60,60,0.08)', ok ? 'rgba(255,255,255,0.5)' : 'rgba(255,80,80,0.6)');
    ctx.fillStyle = ok ? 'rgba(255,255,255,0.18)' : 'rgba(255,60,60,0.3)';
    ctx.fillRect(h.c * TILE, h.r * TILE, TILE, TILE);
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = el.color;
    ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(el.icon, x, y + 1);
    ctx.globalAlpha = 1;
  }

  /* ---------------- UI ---------------- */
  const ui = {
    gold: $('gold'), lives: $('lives'), wave: $('wave'), waveTotal: $('waveTotal'),
    btnWave: $('btnWave'), speed: $('btnSpeed'), pause: $('btnPause'), mute: $('btnMute'),
    info: $('infoPanel'), build: $('buildGrid'), next: $('nextWave'), toast: $('toast'),
  };
  const hudCache = {};

  function setText(el, key, val) {
    if (hudCache[key] !== val) { hudCache[key] = val; el.textContent = val; }
  }

  function updateHud(force) {
    if (force) for (const k in hudCache) delete hudCache[k];
    setText(ui.gold, 'gold', String(Math.floor(state.gold)));
    setText(ui.lives, 'lives', String(state.lives));
    setText(ui.wave, 'wave', String(state.wave));
    setText(ui.waveTotal, 'wt', state.endless ? ' ∞' : `/${TOTAL_WAVES}`);
    const waveLabel = state.waveActive ? `เวฟ ${state.wave} กำลังดำเนิน…` : `▶ เริ่มเวฟ ${state.wave + 1}`;
    setText(ui.btnWave, 'wbtn', waveLabel);
    const disabled = state.waveActive || state.over;
    if (hudCache.wdis !== disabled) { hudCache.wdis = disabled; ui.btnWave.disabled = disabled; }
    const goldKey = Math.floor(state.gold);
    if (hudCache.goldBtns !== goldKey) {
      hudCache.goldBtns = goldKey;
      for (const btn of ui.build.children) {
        btn.disabled = state.gold < ELEMENTS[btn.dataset.el].cost;
      }
      refreshInfoButtons();
    }
  }

  function buildButtons() {
    ui.build.innerHTML = '';
    ELEMENT_ORDER.forEach((el, i) => {
      const e = ELEMENTS[el];
      const b = document.createElement('button');
      b.className = 'buildBtn';
      b.dataset.el = el;
      b.style.borderColor = e.color;
      b.title = `${e.th} (${e.name}) — ${e.desc}`;
      b.innerHTML = `<span class="k">${i + 1}</span><span class="e">${e.icon}</span><span class="n">${e.th}</span><span class="c">🪙${e.cost}</span>`;
      b.addEventListener('click', () => selectBuild(el));
      ui.build.appendChild(b);
    });
  }

  function selectBuild(el) {
    if (!state.running) return;
    state.selectedBuild = state.selectedBuild === el ? null : el;
    state.selectedTower = null;
    state.fuseMode = false;
    for (const btn of ui.build.children) btn.classList.toggle('active', btn.dataset.el === state.selectedBuild);
    renderInfo();
  }

  function clearBuild() {
    state.selectedBuild = null;
    for (const btn of ui.build.children) btn.classList.remove('active');
  }

  function fmt(n) { return n >= 100 ? Math.round(n).toString() : (Math.round(n * 10) / 10).toString(); }

  function effectLines(s) {
    const out = [];
    if (s.splash) out.push(`💥 ระเบิดรัศมี ${Math.round(s.splash)}`);
    if (s.burn) out.push(`🔥 เผา ${fmt(s.burn.dps)}/วิ (${s.burn.dur} วิ)`);
    if (s.slow) out.push(`❄️ ชะลอ ${Math.round((1 - s.slow.factor) * 100)}% (${fmt(s.slow.dur)} วิ)`);
    if (s.stun) out.push(`💫 มึนงง ${Math.round(s.stun.chance * 100)}%`);
    if (s.multi) out.push(`🎯 ยิง ${s.multi} เป้าพร้อมกัน`);
    if (s.knock) out.push(`💨 ผลักถอย ${Math.round(s.knock.chance * 100)}%`);
    if (s.pierce) out.push(`☄️ ลำแสงทะลุแนว`);
    if (s.curse) out.push(`☠️ สาป รับดาเมจ ×${fmt(s.curse.amp)}`);
    if (s.percent) out.push(`🩸 +${Math.round(s.percent * 100)}% ของ HP สูงสุด`);
    return out.join('<br>');
  }

  function strongAgainst(elements) {
    const set = new Set(elements.map((e) => BEATS[e]));
    return [...set].map((e) => ELEMENTS[e].icon).join(' ');
  }

  function renderInfo() {
    const t = state.selectedTower;
    if (state.selectedBuild && !t) {
      const e = ELEMENTS[state.selectedBuild];
      const s = singleStats(state.selectedBuild, 1);
      ui.info.innerHTML = `
        <div class="title"><span>${e.icon}</span><span>ป้อม${e.th} <small>(${e.name})</small></span><span class="lv">🪙${e.cost}</span></div>
        <div class="effects">${e.desc}</div>
        <table>
          <tr><td>ดาเมจ</td><td>${fmt(s.dmg)}</td></tr>
          <tr><td>ความเร็วยิง</td><td>${fmt(s.rate)}/วิ</td></tr>
          <tr><td>ระยะ</td><td>${Math.round(s.range)}</td></tr>
          <tr><td>ชนะทาง</td><td>${strongAgainst([state.selectedBuild])}</td></tr>
        </table>
        <div class="effects">${effectLines(s)}</div>
        <div class="hint">คลิกบนพื้นหญ้าเพื่อวาง · คลิกขวา/Esc เพื่อยกเลิก</div>`;
      return;
    }
    if (!t) {
      ui.info.innerHTML = `<div class="hint">เลือกธาตุแล้วคลิกบนพื้นหญ้าเพื่อวางป้อม<br>คลิกที่ป้อมเพื่ออัปเกรด / หลอมรวม<br><br>💡 ป้อมเลเวล 3 สองธาตุ หลอมรวมเป็น <b>ป้อมหลอมรวม</b> ได้ 15 แบบ!</div>`;
      return;
    }
    const s = t.stats;
    const fused = t.elements.length > 1;
    const icons = t.elements.map((e) => ELEMENTS[e].icon).join('');
    const upCost = upgradeCost(t);
    let preview = null;
    if (upCost != null) {
      preview = computeStats(fused ? { ...t, star: t.star + 1 } : { ...t, level: t.level + 1 });
    }
    const up = (a, b, f = fmt) => (preview ? ` <span class="up">→ ${f(b)}</span>` : '');
    const lvLabel = fused ? `${'★'.repeat(t.star + 1)}` : `Lv.${t.level}`;
    const fuseInfo = !fused && t.level === MAX_LEVEL
      ? `<button id="bFuse" class="full">${state.fuseMode ? '✖ ยกเลิกการหลอมรวม' : `✦ หลอมรวม (🪙${FUSION_COST})`}</button>`
      : '';
    const upLabel = upCost == null
      ? (fused ? 'พลังสูงสุดแล้ว' : 'เลเวลสูงสุด')
      : `${fused ? '⬆ ปลุกพลัง' : '⬆ อัปเกรด'} (🪙${upCost})`;
    ui.info.innerHTML = `
      <div class="title"><span>${icons}</span><span>${towerName(t)}</span><span class="lv">${lvLabel}</span></div>
      <table>
        <tr><td>ดาเมจ</td><td>${fmt(s.dmg)}${up(s.dmg, preview && preview.dmg)}</td></tr>
        <tr><td>ความเร็วยิง</td><td>${fmt(s.rate)}/วิ${up(s.rate, preview && preview.rate)}</td></tr>
        <tr><td>ระยะ</td><td>${Math.round(s.range)}${up(s.range, preview && preview.range, Math.round)}</td></tr>
        <tr><td>ชนะทาง</td><td>${strongAgainst(t.elements)}</td></tr>
        <tr><td>กำจัด / ดาเมจรวม</td><td>${t.kills} / ${Math.round(t.dmgDealt)}</td></tr>
      </table>
      <div class="effects">${effectLines(s)}</div>
      ${state.fuseMode ? '<div class="effects" style="color:#ffe680">เลือกป้อมเลเวล 3 ต่างธาตุที่กระพริบเพื่อหลอมรวม</div>' : ''}
      <div class="btnRow">
        <button id="bUp" class="full">${upLabel}</button>
        ${fuseInfo}
        <button id="bMode">🎯 ${TARGET_LABEL[t.mode]}</button>
        <button id="bSell" class="danger">ขาย 🪙${sellValue(t)}</button>
      </div>`;
    $('bUp').addEventListener('click', () => upgradeTower(t));
    $('bMode').addEventListener('click', () => cycleMode(t));
    $('bSell').addEventListener('click', () => sellTower(t));
    const bf = $('bFuse');
    if (bf) bf.addEventListener('click', () => toggleFuse());
    refreshInfoButtons();
  }

  function refreshInfoButtons() {
    const t = state.selectedTower;
    if (!t) return;
    const bUp = $('bUp');
    if (bUp) {
      const c = upgradeCost(t);
      bUp.disabled = c == null || state.gold < c;
    }
    const bf = $('bFuse');
    if (bf && !state.fuseMode) bf.disabled = state.gold < FUSION_COST;
  }

  function cycleMode(t) {
    t.mode = TARGET_MODES[(TARGET_MODES.indexOf(t.mode) + 1) % TARGET_MODES.length];
    renderInfo();
  }

  function toggleFuse() {
    const t = state.selectedTower;
    if (!t || t.elements.length > 1 || t.level < MAX_LEVEL) return;
    state.fuseMode = !state.fuseMode;
    if (state.fuseMode && !state.towers.some((o) => canFuse(t, o))) {
      state.fuseMode = false;
      flashMsg('ต้องมีป้อมเลเวล 3 ธาตุอื่นอีก 1 ป้อม');
      Sound.play('error');
    }
    renderInfo();
  }

  function renderNextWave() {
    const w = state.nextWaveData;
    if (!w || state.over) { ui.next.innerHTML = ''; return; }
    const tags = w.els.map((e) => `<span class="tag" style="background:${ELEMENTS[e].color}">${ELEMENTS[e].icon} ${ELEMENTS[e].th}</span>`).join('');
    const types = Object.entries(w.summary).map(([k, v]) => `${ENEMY_TYPES[k].th}×${v}`).join(' · ');
    ui.next.innerHTML = `เวฟถัดไป (${w.n})${w.isBoss ? ' ⚠️<b>บอส</b>' : ''}: ${tags}<br><small>${types}</small>`;
  }

  let toastTimer = null;
  function showToast(text, ms) {
    ui.toast.textContent = text;
    ui.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove('show'), ms);
  }
  function flashMsg(text) { showToast(text, 900); }

  /* ---------------- อินพุต ---------------- */
  function eventToTile(ev) {
    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * WIDTH;
    const y = ((ev.clientY - rect.top) / rect.height) * HEIGHT;
    return { x, y, c: Math.floor(x / TILE), r: Math.floor(y / TILE) };
  }

  canvas.addEventListener('pointermove', (ev) => {
    if (!state.running) return;
    state.hover = eventToTile(ev);
  });
  canvas.addEventListener('pointerleave', () => { state.hover = null; });
  canvas.addEventListener('contextmenu', (ev) => { ev.preventDefault(); cancelAll(); });

  canvas.addEventListener('pointerdown', (ev) => {
    if (!state.running || ev.button !== 0) return;
    Sound.unlock();
    const h = eventToTile(ev);
    state.hover = h;
    if (h.r < 0 || h.r >= ROWS || h.c < 0 || h.c >= COLS) return;
    const tower = state.towerGrid[h.r][h.c];

    if (state.fuseMode && state.selectedTower) {
      if (tower && canFuse(state.selectedTower, tower)) fuseTowers(state.selectedTower, tower);
      else { state.fuseMode = false; renderInfo(); }
      return;
    }
    if (state.selectedBuild && !tower) {
      placeTower(state.selectedBuild, h.c, h.r);
      return;
    }
    if (tower) {
      clearBuild();
      state.selectedTower = state.selectedTower === tower ? null : tower;
    } else {
      state.selectedTower = null;
    }
    renderInfo();
  });

  function cancelAll() {
    clearBuild();
    state.selectedTower = null;
    state.fuseMode = false;
    renderInfo();
  }

  document.addEventListener('keydown', (ev) => {
    if (ev.target && ev.target.tagName === 'INPUT') return;
    if (!state.running) return;
    const k = ev.key.toLowerCase();
    if (k >= '1' && k <= '6') { selectBuild(ELEMENT_ORDER[Number(k) - 1]); return; }
    switch (k) {
      case ' ': ev.preventDefault(); Sound.unlock(); startWave(); break;
      case 'escape': cancelAll(); break;
      case 'u': if (state.selectedTower) upgradeTower(state.selectedTower); break;
      case 's': if (state.selectedTower) sellTower(state.selectedTower); break;
      case 't': if (state.selectedTower) cycleMode(state.selectedTower); break;
      case 'f': cycleSpeed(); break;
      case 'p': togglePause(); break;
      case 'm': toggleMute(); break;
      case 'h': openHelp(); break;
      default: break;
    }
  });

  function cycleSpeed() {
    state.speed = state.speed >= 3 ? 1 : state.speed + 1;
    ui.speed.textContent = `${state.speed}×`;
  }
  function togglePause() {
    if (!state.running || state.over) return;
    state.paused = !state.paused;
    ui.pause.textContent = state.paused ? '▶' : '⏸';
  }
  function toggleMute() {
    const m = Sound.toggle();
    ui.mute.textContent = m ? '🔇' : '🔊';
  }

  ui.btnWave.addEventListener('click', () => { Sound.unlock(); startWave(); });
  ui.speed.addEventListener('click', cycleSpeed);
  ui.pause.addEventListener('click', togglePause);
  ui.mute.addEventListener('click', toggleMute);
  ui.mute.textContent = Sound.muted ? '🔇' : '🔊';
  $('btnHelp').addEventListener('click', openHelp);

  /* ---------------- หน้าจอเมนู / จบเกม ---------------- */
  let pausedByHelp = false;
  function openHelp() {
    if (state.running && !state.paused) { state.paused = true; pausedByHelp = true; }
    $('help').classList.add('show');
  }
  $('btnCloseHelp').addEventListener('click', () => {
    $('help').classList.remove('show');
    if (pausedByHelp) { state.paused = false; pausedByHelp = false; }
  });
  $('btnHowTo').addEventListener('click', openHelp);

  function hideOverlays() {
    for (const id of ['menu', 'endScreen', 'help']) $(id).classList.remove('show');
  }

  function showEnd(won) {
    $('endTitle').textContent = won ? '🏆 ชัยชนะ!' : '💀 แกนกลางถูกทำลาย';
    $('endText').innerHTML = won
      ? `คุณปกป้องแกนกลางได้ครบ ${TOTAL_WAVES} เวฟ!<br>กำจัดศัตรู ${state.kills} ตัว · ชีวิตเหลือ ${state.lives}`
      : `คุณผ่านไปได้ ${Math.max(0, state.wave - 1)} เวฟ · กำจัดศัตรู ${state.kills} ตัว`;
    $('btnContinue').style.display = won ? '' : 'none';
    $('endScreen').classList.add('show');
  }

  $('btnContinue').addEventListener('click', () => {
    state.endless = true;
    $('endScreen').classList.remove('show');
    updateHud(true);
  });
  $('btnRetry').addEventListener('click', () => { Sound.unlock(); newGame(); });
  $('btnMenu').addEventListener('click', openMenu);

  function openMenu() {
    state.running = false;
    hideOverlays();
    $('menu').classList.add('show');
    renderMenu();
  }

  function renderMenu() {
    const elems = $('menuElems');
    elems.innerHTML = ELEMENT_ORDER.map((el) => {
      const e = ELEMENTS[el];
      return `<span class="chip" style="background:${e.color}">${e.icon} ${e.th}</span>`;
    }).join('');

    const mapList = $('mapList');
    mapList.innerHTML = '';
    MAPS.forEach((m, i) => {
      const b = document.createElement('button');
      b.className = 'choice' + (i === state.mapIndex ? ' selected' : '');
      b.innerHTML = `<b>${m.name}</b><span>${m.desc}</span>`;
      const thumb = renderBackground(buildMap(m), 200, 120);
      b.appendChild(thumb);
      b.addEventListener('click', () => { state.mapIndex = i; renderMenu(); });
      mapList.appendChild(b);
    });

    const diffList = $('diffList');
    diffList.innerHTML = '';
    Object.entries(DIFFICULTIES).forEach(([key, d]) => {
      const b = document.createElement('button');
      b.className = 'choice' + (key === state.diffKey ? ' selected' : '');
      b.innerHTML = `<b>${d.th}</b><span>ทอง ${d.gold} · ชีวิต ${d.lives} · HP ศัตรู ×${d.hp}</span>`;
      b.addEventListener('click', () => { state.diffKey = key; renderMenu(); });
      diffList.appendChild(b);
    });

    const best = loadBest()[MAPS[state.mapIndex].id + ':' + state.diffKey];
    $('bestScore').textContent = best ? `สถิติสูงสุด: เวฟ ${best}` : '';
  }

  $('btnStart').addEventListener('click', () => { Sound.unlock(); newGame(); });

  function renderElementTable() {
    $('elemTable').innerHTML = ELEMENT_ORDER.map((el) => {
      const e = ELEMENTS[el];
      return `<div style="border-color:${e.color}"><b>${e.icon} ${e.th} (${e.name})</b> — 🪙${e.cost}<br>${e.desc}<br><small>ชนะทาง: ${ELEMENTS[BEATS[el]].icon} ${ELEMENTS[BEATS[el]].th}</small></div>`;
    }).join('');
  }

  function drawCycle() {
    const c = $('cycleCanvas');
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    const pos = {
      fire: [70, 22], wind: [118, 75], earth: [70, 128], water: [22, 75],
      light: [185, 35], dark: [185, 115],
    };
    const arrow = (a, b, color) => {
      const [x1, y1] = pos[a], [x2, y2] = pos[b];
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const sx = x1 + Math.cos(ang) * 18, sy = y1 + Math.sin(ang) * 18;
      const ex = x2 - Math.cos(ang) * 18, ey = y2 - Math.sin(ang) * 18;
      g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 2;
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
      g.beginPath();
      g.moveTo(ex, ey);
      g.lineTo(ex - Math.cos(ang - 0.4) * 8, ey - Math.sin(ang - 0.4) * 8);
      g.lineTo(ex - Math.cos(ang + 0.4) * 8, ey - Math.sin(ang + 0.4) * 8);
      g.closePath(); g.fill();
    };
    arrow('fire', 'wind', ELEMENTS.fire.color);
    arrow('wind', 'earth', ELEMENTS.wind.color);
    arrow('earth', 'water', ELEMENTS.earth.color);
    arrow('water', 'fire', ELEMENTS.water.color);
    // แสง ⇄ มืด
    g.strokeStyle = '#ddd'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(180, 55); g.lineTo(180, 95); g.stroke();
    g.beginPath(); g.moveTo(190, 55); g.lineTo(190, 95); g.stroke();
    g.fillStyle = ELEMENTS.light.color;
    g.beginPath(); g.moveTo(180, 97); g.lineTo(176, 89); g.lineTo(184, 89); g.fill();
    g.fillStyle = ELEMENTS.dark.color;
    g.beginPath(); g.moveTo(190, 53); g.lineTo(186, 61); g.lineTo(194, 61); g.fill();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const [el, [x, y]] of Object.entries(pos)) {
      g.fillStyle = ELEMENTS[el].color;
      g.beginPath(); g.arc(x, y, 16, 0, Math.PI * 2); g.fill();
      g.font = '16px sans-serif';
      g.fillText(ELEMENTS[el].icon, x, y + 1);
    }
  }

  /* ---------------- เริ่มต้น ---------------- */
  buildButtons();
  renderElementTable();
  drawCycle();
  renderMenu();
  requestAnimationFrame(frame);

  // เปิดให้ทดสอบ/ดีบักผ่าน console
  window.ETD = {
    state, startWave, placeTower, upgradeTower, fuseTowers, newGame, makeWave, canBuildAt,
    simulate(seconds) {
      for (let t = 0; t < seconds && !state.over; t += 1 / 60) update(1 / 60);
    },
  };
})();
