/* ============================================================
 *  Element TD — UI, อินพุต และลูปหลัก
 * ============================================================ */
import './style.css';
import {
  COLS, ROWS, ELEMENTS, ELEMENT_ORDER, BEATS, BASIC, DUALS, TRIPLES, ABILITIES,
  MAPS, DIFFICULTIES, TOTAL_WAVES, MAX_ELEMENT_LEVEL, ELEMENT_TOWER, MAX_TIER,
} from './data.js';
import { Sound } from './audio.js';
import {
  Game, parseMap, towerStats, towerName, buildCost, sellValue, TARGET_LABEL,
} from './sim.js';
import { Renderer3D } from './render3d.js';

const $ = (id) => document.getElementById(id);
const BUILD_TYPES = ['arrow', 'cannon', ...ELEMENT_ORDER];

const view = {
  game: null,
  hover: null,
  hoverCheck: null,
  selectedBuild: null,
  selectedTower: null,
  menu: true,
  paused: false,
  speed: 1,
  mapIndex: 0,
  diffKey: 'normal',
};

let renderer;
try {
  renderer = new Renderer3D($('stage'), $('floaters'));
} catch (err) {
  console.error(err);
  $('stage').innerHTML = '<div class="nogl">เบราว์เซอร์นี้ไม่รองรับ WebGL — ลองเปิดด้วย Chrome, Edge, Firefox หรือ Safari รุ่นใหม่</div>';
  throw err;
}
renderer.loadMap(view.mapIndex);

/* ---------------- สถิติสูงสุด ---------------- */
function loadBest() {
  try { return JSON.parse(localStorage.getItem('etd_best') || '{}'); } catch (e) { return {}; }
}
function saveBest(wave) {
  const best = loadBest();
  const key = MAPS[view.mapIndex].id + ':' + view.diffKey;
  if (!best[key] || wave > best[key]) {
    best[key] = wave;
    try { localStorage.setItem('etd_best', JSON.stringify(best)); } catch (e) { /* ignore */ }
  }
}

/* ---------------- บันทึกเกมอัตโนมัติ ---------------- */
const SAVE_KEY = 'etd_save';
let saveTimer = null;

function readSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; }
}
function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
}
// บันทึกเฉพาะตอนไม่มีเวฟกำลังเล่น — ถ้ารีเฟรชกลางเวฟ จะกลับไปเริ่มเวฟนั้นใหม่
function saveGame() {
  const g = view.game;
  if (!g || g.over || g.waveActive) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...g.serialize(), savedAt: Date.now() }));
    const badge = $('saveBadge');
    badge.classList.add('show');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => badge.classList.remove('show'), 1500);
  } catch (e) { /* พื้นที่เต็มหรือถูกบล็อก — เล่นต่อได้ตามปกติ */ }
}

function resumeGame() {
  const g = Game.restore(readSave());
  if (!g) { clearSave(); renderMenu(); showToast('ไฟล์บันทึกเสียหาย — เริ่มเกมใหม่', 1600); return; }
  view.mapIndex = g.mapIndex;
  view.diffKey = g.diffKey;
  startWithGame(g);
  showToast(`▶ เล่นต่อเวฟ ${g.wave + 1} — ${MAPS[g.mapIndex].name}`, 1800);
}

/* ---------------- เริ่มเกม / เมนู ---------------- */
function newGame() {
  if (readSave() && !confirm('เริ่มเกมใหม่จะเขียนทับเกมที่บันทึกไว้ ต้องการเริ่มใหม่หรือไม่?')) return;
  clearSave();
  startWithGame(new Game(view.mapIndex, view.diffKey));
  showToast(MAPS[view.mapIndex].name, 1600);
}

function startWithGame(game) {
  view.game = game;
  view.selectedBuild = null;
  view.selectedTower = null;
  view.paused = false;
  view.menu = false;
  view.speed = 1;
  view.hoverCheck = null;
  renderer.loadMap(view.mapIndex);
  renderer.clearDynamic();
  renderer.resetCamera();
  ui.speed.textContent = '1×';
  ui.pause.textContent = '⏸';
  $('pauseOverlay').classList.remove('show');
  hideOverlays();
  refreshAll();
  saveGame();
}

function openMenu() {
  view.game = null;
  view.menu = true;
  renderer.clearDynamic();
  renderer.loadMap(view.mapIndex);
  hideOverlays();
  $('menu').classList.add('show');
  renderMenu();
}

function startWave() {
  const g = view.game;
  if (!g || view.menu) return;
  Sound.unlock();
  g.startWave();
}

/* ---------------- ลูปหลัก ---------------- */
let last = performance.now();
function frame(now) {
  const realDt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const g = view.game;
  if (g && !view.paused && !view.menu) {
    let remaining = realDt * view.speed;
    while (remaining > 1e-6) {
      const step = Math.min(remaining, 1 / 60);
      g.update(step);
      remaining -= step;
    }
  }
  if (g) processEvents(g);
  renderer.frame(view.paused ? 0 : realDt, view);
  if (g) updateHud(false);
  requestAnimationFrame(frame);
}

function processEvents(g, visuals = true) {
  let changed = false;
  for (const ev of g.events) {
    switch (ev.type) {
      case 'sound': if (visuals) Sound.play(ev.name, ev.throttle); break;
      case 'toast': if (visuals) showToast(ev.text, ev.ms); break;
      case 'changed': changed = true; break;
      case 'waveEnd':
        saveBest(g.wave);
        if (visuals) showToast(`เวฟ ${g.wave} ผ่าน! +${ev.bonus} 🪙${ev.interest ? `  ดอกเบี้ย +${ev.interest}` : ''}`, 1600);
        changed = true;
        break;
      case 'elementPoint':
        if (visuals) setTimeout(() => showToast('🔮 ได้รับผลึกธาตุ! เลือกธาตุที่แผงด้านข้าง', 2200), 1700);
        break;
      case 'win': if (visuals) showEnd(true); break;
      case 'lose':
        clearSave();
        saveBest(Math.max(0, g.wave - 1));
        if (visuals) setTimeout(() => showEnd(false), 900);
        break;
      default:
        if (visuals) renderer.handleEvent(ev);
    }
  }
  g.events.length = 0;
  if (changed) saveGame();
  if (changed) {
    if (view.selectedTower && !g.towers.includes(view.selectedTower)) view.selectedTower = null;
    view.hoverCheck = null;
    if (view.hover) updateHoverCheck();
    refreshAll();
  }
}

function refreshAll() {
  renderElements();
  renderBuild();
  renderInfo();
  renderNextWave();
  updateHud(true);
}

/* ---------------- HUD ---------------- */
const ui = {
  gold: $('gold'), lives: $('lives'), wave: $('wave'), waveTotal: $('waveTotal'), points: $('points'),
  btnWave: $('btnWave'), speed: $('btnSpeed'), pause: $('btnPause'), mute: $('btnMute'),
  quality: $('btnQuality'), info: $('infoPanel'), build: $('buildGrid'), elems: $('elemGrid'),
  next: $('nextWave'), toast: $('toast'),
};
const hudCache = {};

function setText(el, key, val) {
  if (hudCache[key] !== val) { hudCache[key] = val; el.textContent = val; }
}

function updateHud(force) {
  const g = view.game;
  if (!g) return;
  if (force) for (const k in hudCache) delete hudCache[k];
  setText(ui.gold, 'gold', String(Math.floor(g.gold)));
  setText(ui.lives, 'lives', String(g.lives));
  setText(ui.wave, 'wave', String(g.wave));
  setText(ui.points, 'points', String(g.elemPoints));
  setText(ui.waveTotal, 'wt', g.endless ? ' ∞' : `/${TOTAL_WAVES}`);
  setText(ui.btnWave, 'wbtn', g.waveActive ? `⚔️ เวฟ ${g.wave} …` : `▶ เริ่มเวฟ ${g.wave + 1}`);
  const disabled = g.waveActive || g.over;
  if (hudCache.wdis !== disabled) { hudCache.wdis = disabled; ui.btnWave.disabled = disabled; }
  const goldKey = Math.floor(g.gold);
  if (hudCache.goldBtns !== goldKey) {
    hudCache.goldBtns = goldKey;
    refreshAffordability();
  }
}

// ปรับสถานะปุ่มตามทองที่มี โดยไม่สร้าง DOM ใหม่
function refreshAffordability() {
  const g = view.game;
  if (!g) return;
  document.querySelectorAll('[data-cost]').forEach((b) => {
    b.disabled = b.dataset.ok === '0' || g.gold < Number(b.dataset.cost);
  });
}

/* ---------------- แผงธาตุ ---------------- */
function renderElements() {
  const g = view.game;
  if (!g) return;
  const badge = $('pointsBadge');
  badge.textContent = g.elemPoints;
  badge.classList.toggle('zero', g.elemPoints === 0);
  document.querySelector('.stat.essence').classList.toggle('pulse', g.elemPoints > 0);
  ui.elems.innerHTML = '';
  for (const el of ELEMENT_ORDER) {
    const e = ELEMENTS[el];
    const lv = g.elemLevel[el];
    const can = g.elemPoints > 0 && lv < MAX_ELEMENT_LEVEL;
    const b = document.createElement('button');
    b.className = `elemOrb lv${lv}${can ? ' can' : ''}`;
    b.style.setProperty('--c', e.color);
    b.title = `${e.th} (${e.name}) เลเวล ${lv}/${MAX_ELEMENT_LEVEL}\n${e.desc}\nชนะทาง: ${ELEMENTS[BEATS[el]].th}${can ? '\nคลิกเพื่อใช้ผลึกธาตุ 1 ชิ้น' : ''}`;
    b.innerHTML = `<span class="orb">${e.icon}</span><span class="nm">${e.th}</span><span class="pips">${[1, 2, 3].map((i) => `<i class="${i <= lv ? 'on' : ''}"></i>`).join('')}</span>`;
    b.disabled = !can;
    b.addEventListener('click', () => { Sound.unlock(); g.buyElement(el); });
    ui.elems.appendChild(b);
  }
}

/* ---------------- ปุ่มสร้างป้อม ---------------- */
function renderBuild() {
  const g = view.game;
  ui.build.innerHTML = '';
  BUILD_TYPES.forEach((type, i) => {
    const basic = BASIC[type];
    const e = basic || ELEMENTS[type];
    const locked = !basic && (!g || g.elemLevel[type] < 1);
    const cost = buildCost(type);
    const b = document.createElement('button');
    b.className = `buildBtn${locked ? ' locked' : ''}${view.selectedBuild === type ? ' active' : ''}`;
    b.style.borderColor = e.color;
    b.dataset.cost = cost;
    b.dataset.ok = locked ? '0' : '1';
    b.title = `${basic ? basic.th : 'ป้อม' + e.th} — ${e.desc}${locked ? `\n🔒 ต้องปลดล็อกธาตุ${e.th}ด้วยผลึกธาตุ` : ''}`;
    b.innerHTML = `<span class="k">${i + 1}</span><span class="e">${e.icon}</span><span class="n">${basic ? basic.th.replace('ป้อม', '') : e.th}</span><span class="c">🪙${cost}</span>`;
    b.addEventListener('click', () => selectBuild(type));
    ui.build.appendChild(b);
  });
  refreshAffordability();
}

function selectBuild(type) {
  const g = view.game;
  if (!g) return;
  if (!BASIC[type] && g.elemLevel[type] < 1) {
    showToast(`🔒 ปลดล็อกธาตุ${ELEMENTS[type].th}ก่อน (ใช้ผลึกธาตุ)`, 1400);
    Sound.play('error');
    return;
  }
  view.selectedBuild = view.selectedBuild === type ? null : type;
  view.selectedTower = null;
  view.hoverCheck = null;
  if (view.hover) updateHoverCheck();
  renderBuild();
  renderInfo();
}

function clearBuild() {
  view.selectedBuild = null;
  for (const btn of ui.build.children) btn.classList.remove('active');
}

/* ---------------- แผงข้อมูลป้อม ---------------- */
const fmt = (n) => (n >= 100 ? Math.round(n).toString() : (Math.round(n * 10) / 10).toString());

function effectLines(s) {
  const out = [];
  if (s.splash) out.push(`💥 ระเบิดรัศมี ${Math.round(s.splash)}`);
  if (s.burn) out.push(`🔥 เผา ${fmt(s.burn.dps)}/วิ (${s.burn.dur} วิ)`);
  if (s.slow) out.push(`❄️ ชะลอ ${Math.round((1 - s.slow.factor) * 100)}% (${fmt(s.slow.dur)} วิ)`);
  if (s.stun) out.push(`💫 มึนงง ${Math.round(s.stun.chance * 100)}%`);
  if (s.multi) out.push(`🎯 ยิง ${s.multi} เป้าพร้อมกัน`);
  if (s.knock) out.push(`💨 ผลักถอย ${Math.round(s.knock.chance * 100)}%`);
  if (s.pierce) out.push('☄️ ลำแสงทะลุแนว');
  if (s.curse) out.push(`☠️ สาป รับดาเมจ ×${fmt(s.curse.amp)}`);
  if (s.percent) out.push(`🩸 +${fmt(s.percent * 100)}% ของ HP สูงสุด`);
  return out.join('<br>');
}

const strongAgainst = (els) => (els.length ? [...new Set(els.map((e) => BEATS[e]))].map((e) => ELEMENTS[e].icon).join(' ') : '— (กลาง)');
const stars = (n, max) => '★'.repeat(n) + '☆'.repeat(Math.max(0, max - n));

function renderInfo() {
  const g = view.game;
  const t = view.selectedTower;
  if (!g) { ui.info.innerHTML = ''; return; }
  if (view.selectedBuild && !t) {
    const type = view.selectedBuild;
    const basic = BASIC[type];
    const e = basic || ELEMENTS[type];
    const s = towerStats(basic ? { kind: 'basic', base: type, tier: 1 } : { kind: 'element', elements: [type], tier: 1 });
    ui.info.innerHTML = `
      <div class="title"><span>${e.icon}</span><span>${basic ? basic.th : 'ป้อม' + e.th}</span><span class="lv">🪙${buildCost(type)}</span></div>
      <div class="effects">${e.desc}</div>
      <table>
        <tr><td>ดาเมจ/นัด</td><td>${fmt(s.dmg)}</td></tr>
        <tr><td>ความเร็วยิง</td><td>${fmt(s.rate)}/วิ</td></tr>
        <tr><td>ระยะ</td><td>${Math.round(s.range)}</td></tr>
        <tr><td>ชนะทาง (×2)</td><td>${strongAgainst(basic ? [] : [type])}</td></tr>
      </table>
      <div class="effects">${effectLines(s)}</div>
      <div class="hint">${view.hoverCheck && !view.hoverCheck.ok && view.hoverCheck.reason ? `⚠️ ${view.hoverCheck.reason}<br>` : ''}คลิกเพื่อวาง · วางในลานหินเพื่อสร้างเขาวงกต · Esc ยกเลิก</div>`;
    return;
  }
  if (!t) {
    ui.info.innerHTML = `<div class="hint">🏹 เลือกป้อมแล้วคลิกบนพื้นเพื่อวาง<br>🧱 วางในลานหินเพื่อบังคับให้มอนสเตอร์เดินอ้อม (ลูกศรสีฟ้าคือเส้นทาง)<br>🔮 ใช้ผลึกธาตุปลดล็อกธาตุ แล้วอัปเกรด/เพิ่มธาตุให้ป้อม<br>🖱️ คลิกขวาลาก = หมุนกล้อง · ล้อเมาส์ = ซูม</div>`;
    return;
  }
  const s = t.stats;
  const icons = t.kind === 'basic' ? BASIC[t.base].icon : t.elements.map((e) => ELEMENTS[e].icon).join('');
  const maxT = t.kind === 'basic' ? 3 : MAX_TIER[t.elements.length];
  const opts = g.upgradeOptions(t);
  const tierOpt = opts.find((o) => o.type === 'tier');
  const addOpts = opts.filter((o) => o.type === 'add');
  let preview = null;
  if (tierOpt) preview = towerStats({ ...t, tier: t.tier + 1 });
  const up = (b, f = fmt) => (preview ? ` <span class="up">→ ${f(b)}</span>` : '');
  const kindLabel = t.kind === 'basic' ? 'ป้อมพื้นฐาน' : ['', 'ธาตุเดี่ยว', 'สองธาตุ', 'สามธาตุ'][t.elements.length];
  ui.info.innerHTML = `
    <div class="title"><span>${icons}</span><span>${towerName(t)}</span><span class="lv" title="ระดับ">${stars(t.tier, maxT)}</span></div>
    <div class="effects">${kindLabel} · ระดับ ${t.tier}/${maxT}</div>
    <table>
      <tr><td>ดาเมจ/นัด</td><td>${fmt(s.dmg)}${up(preview && preview.dmg)}</td></tr>
      <tr><td>ความเร็วยิง</td><td>${fmt(s.rate)}/วิ${up(preview && preview.rate)}</td></tr>
      <tr><td>ระยะ</td><td>${Math.round(s.range)}${up(preview && preview.range, Math.round)}</td></tr>
      <tr><td>ชนะทาง (×2)</td><td>${strongAgainst(t.elements)}</td></tr>
      <tr><td>กำจัด / ดาเมจรวม</td><td>${t.kills} / ${Math.round(t.dmgDealt)}</td></tr>
    </table>
    <div class="effects">${effectLines(s)}</div>
    <div class="btnRow">
      ${tierOpt ? `<button id="bUp" class="full primary" data-cost="${tierOpt.cost}" data-ok="${tierOpt.ok ? 1 : 0}" title="${tierOpt.reason || ''}">⬆ อัปเกรดระดับ ${t.tier + 1} (🪙${tierOpt.cost})${tierOpt.ok ? '' : ' 🔒'}</button>` : '<button class="full" disabled>ระดับสูงสุดแล้ว</button>'}
    </div>
    ${tierOpt && !tierOpt.ok ? `<div class="effects" style="margin-top:4px">🔒 ${tierOpt.reason}</div>` : ''}
    ${addOpts.length ? `<div class="sect">✦ เพิ่มธาตุ → ${t.elements.length === 1 ? 'ป้อมสองธาตุ' : 'ป้อมสามธาตุ'}</div><div class="addGrid" id="addGrid"></div>` : ''}
    <div class="btnRow" style="margin-top:8px">
      <button id="bMode">🎯 ${TARGET_LABEL[t.mode]}</button>
      <button id="bSell" class="danger">ขาย 🪙${sellValue(t)}</button>
    </div>`;
  if (tierOpt) $('bUp').addEventListener('click', () => g.applyUpgrade(t, tierOpt));
  const grid = $('addGrid');
  if (grid) {
    for (const o of addOpts) {
      const b = document.createElement('button');
      b.className = `addBtn${o.ok ? '' : ' need'}`;
      b.dataset.cost = o.cost;
      b.dataset.ok = o.ok ? 1 : 0;
      b.title = o.ok ? `${o.label} ระดับ ${o.tier}` : o.reason;
      b.innerHTML = `<span class="i">${ELEMENTS[o.el].icon}</span><span><span class="nm">${o.label}</span><span class="c">🪙${o.cost}</span>${o.ok ? '' : ' 🔒'}</span>`;
      b.addEventListener('click', () => g.applyUpgrade(t, o));
      grid.appendChild(b);
    }
  }
  $('bMode').addEventListener('click', () => g.cycleMode(t));
  $('bSell').addEventListener('click', () => g.sellTower(t));
  refreshAffordability();
}

/* ---------------- เวฟถัดไป ---------------- */
function renderNextWave() {
  const g = view.game;
  const w = g && g.nextWaveData;
  if (!w || g.over) { ui.next.innerHTML = ''; return; }
  const e = ELEMENTS[w.element];
  const a = ABILITIES[w.ability];
  const hp = Math.round(a.hp * w.hpScale);
  ui.next.innerHTML = `
    <div class="lbl">เวฟถัดไป · ${w.n}</div>
    <div class="row">
      <span class="orb" style="--c:${e.color}">${e.icon}</span>
      <div><b>${a.icon} ${a.creature}</b> <span style="opacity:.8">(${a.th})</span> ธาตุ<b style="color:${e.color}">${e.th}</b> ×${w.count}
      <div class="desc">${w.ability === 'boss' ? '<span class="boss">⚠️ บอส!</span> ' : ''}HP ${hp.toLocaleString()} · ${a.desc} · แพ้ทาง ${Object.keys(BEATS).filter((k) => BEATS[k] === w.element).map((k) => ELEMENTS[k].icon).join('')}</div></div>
    </div>`;
}

let toastTimer = null;
function showToast(text, ms) {
  ui.toast.textContent = text;
  ui.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('show'), ms);
}

/* ---------------- อินพุต ---------------- */
const canvas = renderer.canvas;
const pointers = new Map();
let gesture = null;

function updateHoverCheck() {
  const g = view.game;
  const h = view.hover;
  if (!g || !h || !view.selectedBuild) { view.hoverCheck = null; return; }
  const type = view.selectedBuild;
  let res = g.canBuildType(type);
  if (res.ok && g.gold < buildCost(type)) res = { ok: false, reason: 'ทองไม่พอ' };
  if (res.ok) {
    const chk = g.checkBuild(h.c, h.r);
    res = { ok: chk.ok, reason: chk.reason };
  }
  view.hoverCheck = { ...res, c: h.c, r: h.r };
}

canvas.addEventListener('pointerdown', (ev) => {
  pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (pointers.size === 1) {
    gesture = { x: ev.clientX, y: ev.clientY, t: performance.now(), button: ev.button, multi: false, moved: false };
  } else if (gesture) {
    gesture.multi = true;
  }
});

canvas.addEventListener('pointermove', (ev) => {
  if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (gesture && Math.hypot(ev.clientX - gesture.x, ev.clientY - gesture.y) > 8) gesture.moved = true;
  if (ev.pointerType !== 'mouse' || !view.game) return;
  const h = renderer.pickTile(ev.clientX, ev.clientY);
  const changed = !h !== !view.hover || (h && (h.c !== view.hover.c || h.r !== view.hover.r));
  view.hover = h;
  if (changed) {
    const prevOk = view.hoverCheck && view.hoverCheck.ok;
    updateHoverCheck();
    if (view.selectedBuild && !view.selectedTower && (view.hoverCheck && view.hoverCheck.ok) !== prevOk) renderInfo();
  }
});

const endPointer = (ev) => {
  pointers.delete(ev.pointerId);
  if (!gesture || pointers.size > 0) return;
  const g = gesture;
  gesture = null;
  if (ev.type === 'pointercancel' || g.multi || g.moved || performance.now() - g.t > 600) return;
  if (g.button === 2) { cancelAll(); return; }
  if (g.button === 0) handleTap(ev.clientX, ev.clientY);
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('pointerleave', () => { view.hover = null; view.hoverCheck = null; });
canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
renderer.controls.addEventListener('start', () => { renderer.userMovedCamera = true; });

function handleTap(x, y) {
  const g = view.game;
  if (!g || view.menu || view.paused) return;
  Sound.unlock();
  const h = renderer.pickTile(x, y);
  view.hover = h;
  if (!h) { cancelAll(); return; }
  const tower = g.towerGrid[h.r * COLS + h.c];
  if (view.selectedBuild && !tower) {
    g.placeTower(view.selectedBuild, h.c, h.r);
    updateHoverCheck();
    return;
  }
  if (tower) {
    clearBuild();
    view.selectedTower = view.selectedTower === tower ? null : tower;
  } else {
    view.selectedTower = null;
  }
  renderBuild();
  renderInfo();
}

function cancelAll() {
  clearBuild();
  view.selectedTower = null;
  view.hoverCheck = null;
  renderBuild();
  renderInfo();
}

document.addEventListener('keydown', (ev) => {
  if (!view.game || view.menu) return;
  const k = ev.key.toLowerCase();
  if (k >= '1' && k <= '8') { selectBuild(BUILD_TYPES[Number(k) - 1]); return; }
  const t = view.selectedTower;
  switch (k) {
    case ' ': ev.preventDefault(); startWave(); break;
    case 'escape': cancelAll(); break;
    case 'u': if (t) view.game.upgradeTier(t); break;
    case 's': if (t) view.game.sellTower(t); break;
    case 't': if (t) view.game.cycleMode(t); break;
    case 'f': cycleSpeed(); break;
    case 'p': togglePause(); break;
    case 'm': toggleMute(); break;
    case 'h': openHelp(); break;
    case 'c': renderer.resetCamera(); break;
    case 'b': togglePanel(); break;
    case 'z': toggleFullscreen(); break;
    default: break;
  }
});

function cycleSpeed() {
  view.speed = view.speed >= 3 ? 1 : view.speed + 1;
  ui.speed.textContent = `${view.speed}×`;
}
function togglePause() {
  if (!view.game || view.game.over) return;
  view.paused = !view.paused;
  ui.pause.textContent = view.paused ? '▶' : '⏸';
  $('pauseOverlay').classList.toggle('show', view.paused);
}
function toggleMute() { ui.mute.textContent = Sound.toggle() ? '🔇' : '🔊'; }
function updateQualityLabel() {
  const high = renderer.quality === 'high';
  ui.quality.textContent = high ? '✨' : '⚡';
  ui.quality.title = high ? 'กราฟิก: สูง (เงา + แสงเรือง) — กดเพื่อสลับเป็นโหมดประหยัด' : 'กราฟิก: ประหยัด — กดเพื่อสลับเป็นคุณภาพสูง';
}

ui.btnWave.addEventListener('click', startWave);
ui.speed.addEventListener('click', cycleSpeed);
ui.pause.addEventListener('click', togglePause);
ui.mute.addEventListener('click', toggleMute);
ui.mute.textContent = Sound.muted ? '🔇' : '🔊';
ui.quality.addEventListener('click', () => {
  renderer.setQuality(renderer.quality === 'high' ? 'low' : 'high');
  updateQualityLabel();
});
updateQualityLabel();
$('btnCamera').addEventListener('click', () => renderer.resetCamera());

/* ---------------- เลย์เอาต์เต็มจอ ---------------- */
// วัดพื้นที่ที่ HUD/แผงบังอยู่ เพื่อให้กล้องจัดกระดานไว้กลางส่วนที่มองเห็น
function updateLayout() {
  const hud = $('hud');
  const side = $('side');
  const hudBottom = hud.offsetTop + hud.offsetHeight;
  document.documentElement.style.setProperty('--hudBottom', `${hudBottom + 8}px`);
  const W = window.innerWidth, H = window.innerHeight;
  const ins = { top: hudBottom + 6, right: 0, bottom: 0, left: 0 };
  if (!document.body.classList.contains('panelHidden')) {
    if (matchMedia('(max-width: 980px)').matches) ins.bottom = H - side.offsetTop + 6;
    else ins.right = W - side.offsetLeft + 6;
  }
  renderer.setInsets(ins);
}

function togglePanel() {
  document.body.classList.toggle('panelHidden');
  try { localStorage.setItem('etd_panel', document.body.classList.contains('panelHidden') ? '0' : '1'); } catch (e) { /* ignore */ }
  updateLayout();
}

function toggleFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement) {
    (el.requestFullscreen || el.webkitRequestFullscreen || (() => Promise.reject())).call(el)?.catch?.(() => showToast('เบราว์เซอร์นี้ไม่รองรับโหมดเต็มจอ', 1200));
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  }
}

try { if (localStorage.getItem('etd_panel') === '0') document.body.classList.add('panelHidden'); } catch (e) { /* ignore */ }
$('btnPanel').addEventListener('click', togglePanel);
$('btnFull').addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', () => {
  $('btnFull').textContent = document.fullscreenElement ? '🗗' : '⛶';
  setTimeout(updateLayout, 50);
});
window.addEventListener('resize', updateLayout);
new ResizeObserver(updateLayout).observe($('hud'));
updateLayout();
$('btnHelp').addEventListener('click', openHelp);

/* ---------------- หน้าจอซ้อน ---------------- */
let pausedByHelp = false;
function openHelp() {
  if (view.game && !view.menu && !view.paused) { view.paused = true; pausedByHelp = true; }
  $('help').classList.add('show');
}
$('btnCloseHelp').addEventListener('click', () => {
  $('help').classList.remove('show');
  if (pausedByHelp) { view.paused = false; pausedByHelp = false; }
});
$('btnHowTo').addEventListener('click', openHelp);

function hideOverlays() {
  for (const id of ['menu', 'endScreen', 'help']) $(id).classList.remove('show');
}

function showEnd(won) {
  const g = view.game;
  if (!g) return;
  $('endTitle').textContent = won ? '🏆 ชัยชนะ!' : '💀 แกนกลางถูกทำลาย';
  $('endText').innerHTML = won
    ? `คุณปกป้องแกนกลางได้ครบ ${TOTAL_WAVES} เวฟ!<br>กำจัดมอนสเตอร์ ${g.kills} ตัว · ชีวิตเหลือ ${g.lives}`
    : `คุณผ่านไปได้ ${Math.max(0, g.wave - 1)} เวฟ · กำจัดมอนสเตอร์ ${g.kills} ตัว`;
  $('btnContinue').style.display = won ? '' : 'none';
  $('endScreen').classList.add('show');
}

$('btnContinue').addEventListener('click', () => {
  view.game.endless = true;
  $('endScreen').classList.remove('show');
  updateHud(true);
});
$('btnRetry').addEventListener('click', () => { Sound.unlock(); newGame(); });
$('btnMenu').addEventListener('click', openMenu);
$('btnStart').addEventListener('click', () => { Sound.unlock(); newGame(); });
$('btnResume').addEventListener('click', () => { Sound.unlock(); resumeGame(); });
$('btnDiscard').addEventListener('click', () => {
  if (!confirm('ลบเกมที่บันทึกไว้?')) return;
  clearSave();
  renderMenu();
});
// บันทึกครั้งสุดท้ายก่อนปิด/สลับแท็บ (ถ้าอยู่ระหว่างเวฟ)
window.addEventListener('pagehide', saveGame);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });

function drawThumb(def) {
  const c = document.createElement('canvas');
  c.width = 200; c.height = 120;
  const g = c.getContext('2d');
  const m = parseMap(def);
  const s = 10;
  const colors = { '.': '#8a8378', '#': '#4f8f35', '=': '#a89a80', R: '#5a5a5a', W: '#6a5f50', S: '#3a9bff', C: '#ff3048' };
  for (let r = 0; r < ROWS; r++) {
    for (let col = 0; col < COLS; col++) {
      const ch = m.tiles[r][col];
      g.fillStyle = colors[ch] || '#ffd65a';
      g.fillRect(col * s, r * s, s, s);
    }
  }
  g.strokeStyle = 'rgba(0,0,0,0.15)';
  for (let x = 0; x <= COLS; x++) { g.beginPath(); g.moveTo(x * s, 0); g.lineTo(x * s, ROWS * s); g.stroke(); }
  return c;
}

function renderMenu() {
  $('menuElems').innerHTML = ELEMENT_ORDER.map((el) => {
    const e = ELEMENTS[el];
    return `<span class="chip" style="--c:${e.color}">${e.icon} ${e.th}</span>`;
  }).join('');
  const mapList = $('mapList');
  mapList.innerHTML = '';
  MAPS.forEach((m, i) => {
    const b = document.createElement('button');
    b.className = 'choice' + (i === view.mapIndex ? ' selected' : '');
    const maze = m.layout.some((row) => row.includes('.'));
    b.innerHTML = `<b>${m.name}</b><span>${m.desc}</span><span class="tag${maze ? '' : ' lane'}">${maze ? '🧱 สร้างเขาวงกต' : '🛤️ ทางตายตัว'}</span>`;
    b.appendChild(drawThumb(m));
    b.addEventListener('click', () => {
      view.mapIndex = i;
      renderer.loadMap(i);
      renderMenu();
    });
    mapList.appendChild(b);
  });
  const diffList = $('diffList');
  diffList.innerHTML = '';
  Object.entries(DIFFICULTIES).forEach(([key, d]) => {
    const b = document.createElement('button');
    b.className = 'choice' + (key === view.diffKey ? ' selected' : '');
    b.innerHTML = `<b>${d.th}</b><span>ทอง ${d.gold} · ชีวิต ${d.lives} · HP ×${d.hp}</span>`;
    b.addEventListener('click', () => { view.diffKey = key; renderMenu(); });
    diffList.appendChild(b);
  });
  const save = readSave();
  const box = $('resumeBox');
  if (save && MAPS[save.mapIndex] && DIFFICULTIES[save.diffKey]) {
    box.hidden = false;
    const when = save.savedAt ? new Date(save.savedAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '';
    $('resumeText').textContent = `${MAPS[save.mapIndex].name} · ${DIFFICULTIES[save.diffKey].th} · ผ่านแล้ว ${save.wave} เวฟ · ❤️ ${save.lives} · 🪙 ${Math.floor(save.gold)}${when ? ` · ${when}` : ''}`;
  } else {
    box.hidden = true;
  }
  const best = loadBest()[MAPS[view.mapIndex].id + ':' + view.diffKey];
  $('bestScore').textContent = best ? `🏅 สถิติสูงสุด: เวฟ ${best}` : '';
}

function renderHelpTables() {
  $('elemTable').innerHTML = ELEMENT_ORDER.map((el) => {
    const e = ELEMENTS[el];
    const b = ELEMENTS[BEATS[el]];
    return `<div style="border-color:${e.color}"><b>${e.icon} ${e.th} (${e.name})</b><br>${e.desc}<br><small>ชนะทาง: ${b.icon} ${b.th}</small></div>`;
  }).join('');
  const icons = (k) => k.split('+').map((e) => ELEMENTS[e].icon).join('');
  const entries = [
    ...Object.entries(DUALS).map(([k, d]) => `<div><span class="ic">${icons(k)}</span>${d.th} <small>${d.name}</small></div>`),
    ...Object.entries(TRIPLES).map(([k, d]) => `<div><span class="ic">${icons(k)}</span>${d.th} <small>${d.name}</small></div>`),
  ];
  $('compendium').innerHTML = entries.join('');
}

function drawCycle() {
  const c = $('cycleCanvas');
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  const cx = c.width / 2, cy = c.height / 2, R = 88;
  const pos = {};
  ELEMENT_ORDER.forEach((el, i) => {
    const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
    pos[el] = [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
  });
  for (const [a, b] of Object.entries(BEATS)) {
    const [x1, y1] = pos[a], [x2, y2] = pos[b];
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const sx = x1 + Math.cos(ang) * 24, sy = y1 + Math.sin(ang) * 24;
    const ex = x2 - Math.cos(ang) * 24, ey = y2 - Math.sin(ang) * 24;
    g.strokeStyle = ELEMENTS[a].color; g.fillStyle = ELEMENTS[a].color; g.lineWidth = 3;
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
    g.beginPath();
    g.moveTo(ex, ey);
    g.lineTo(ex - Math.cos(ang - 0.45) * 11, ey - Math.sin(ang - 0.45) * 11);
    g.lineTo(ex - Math.cos(ang + 0.45) * 11, ey - Math.sin(ang + 0.45) * 11);
    g.closePath(); g.fill();
  }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const [el, [x, y]] of Object.entries(pos)) {
    const gr = g.createRadialGradient(x - 6, y - 6, 2, x, y, 21);
    gr.addColorStop(0, '#ffffffcc');
    gr.addColorStop(0.45, ELEMENTS[el].color);
    gr.addColorStop(1, '#000000aa');
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, 20, 0, Math.PI * 2); g.fill();
    g.font = '18px sans-serif';
    g.fillText(ELEMENTS[el].icon, x, y + 1);
  }
  g.fillStyle = '#f3d98a';
  g.font = '600 13px Kanit, sans-serif';
  g.fillText('×2', cx, cy);
}

/* ---------------- เริ่มต้น ---------------- */
renderHelpTables();
drawCycle();
renderBuild();
renderMenu();
requestAnimationFrame(frame);

// เปิดให้ทดสอบ/ดีบักผ่าน console
window.ETD = {
  view,
  renderer,
  newGame,
  refreshAll,
  get game() { return view.game; },
  simulate(seconds) {
    const g = view.game;
    for (let t = 0; t < seconds && !g.over; t += 1 / 60) {
      g.update(1 / 60);
      if (g.events.length > 500) processEvents(g, false);
    }
    processEvents(g, false);
  },
};
