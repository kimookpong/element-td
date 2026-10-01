/* ============================================================
 *  Element TD — UI, อินพุต และลูปหลัก
 * ============================================================ */
import './style.css';
import {
  COLS, ROWS, ELEMENTS, ELEMENT_ORDER, BEATS, FUSION_COST, MAX_LEVEL,
  ENEMY_TYPES, MAPS, DIFFICULTIES, TOTAL_WAVES,
} from './data.js';
import { Sound } from './audio.js';
import {
  Game, buildMap, singleStats, computeStats, upgradeCost, sellValue, towerName, canFuse, TARGET_LABEL,
} from './sim.js';
import { Renderer3D } from './render3d.js';

const $ = (id) => document.getElementById(id);

const view = {
  game: null,
  hover: null,
  selectedBuild: null,
  selectedTower: null,
  fuseMode: false,
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

/* ---------------- เริ่มเกม / เมนู ---------------- */
function newGame() {
  view.game = new Game(view.mapIndex, view.diffKey);
  view.selectedBuild = null;
  view.selectedTower = null;
  view.fuseMode = false;
  view.paused = false;
  view.menu = false;
  view.speed = 1;
  renderer.loadMap(view.mapIndex);
  renderer.clearDynamic();
  renderer.resetCamera();
  ui.speed.textContent = '1×';
  ui.pause.textContent = '⏸';
  $('pauseOverlay').classList.remove('show');
  for (const btn of ui.build.children) btn.classList.remove('active');
  hideOverlays();
  renderInfo();
  updateHud(true);
  renderNextWave();
  showToast(MAPS[view.mapIndex].name, 1600);
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
        if (visuals) showToast(`เวฟ ${g.wave} ผ่าน! +${ev.bonus} 🪙`, 1400);
        changed = true;
        break;
      case 'win': if (visuals) showEnd(true); break;
      case 'lose':
        saveBest(Math.max(0, g.wave - 1));
        if (visuals) setTimeout(() => showEnd(false), 900);
        break;
      default:
        if (visuals) renderer.handleEvent(ev);
    }
  }
  g.events.length = 0;
  if (changed) {
    if (view.selectedTower && !g.towers.includes(view.selectedTower)) {
      view.selectedTower = null;
      view.fuseMode = false;
    }
    renderInfo();
    updateHud(true);
    renderNextWave();
  }
}

/* ---------------- UI ---------------- */
const ui = {
  gold: $('gold'), lives: $('lives'), wave: $('wave'), waveTotal: $('waveTotal'),
  btnWave: $('btnWave'), speed: $('btnSpeed'), pause: $('btnPause'), mute: $('btnMute'),
  quality: $('btnQuality'),
  info: $('infoPanel'), build: $('buildGrid'), next: $('nextWave'), toast: $('toast'),
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
  setText(ui.waveTotal, 'wt', g.endless ? ' ∞' : `/${TOTAL_WAVES}`);
  setText(ui.btnWave, 'wbtn', g.waveActive ? `เวฟ ${g.wave} กำลังดำเนิน…` : `▶ เริ่มเวฟ ${g.wave + 1}`);
  const disabled = g.waveActive || g.over;
  if (hudCache.wdis !== disabled) { hudCache.wdis = disabled; ui.btnWave.disabled = disabled; }
  const goldKey = Math.floor(g.gold);
  if (hudCache.goldBtns !== goldKey) {
    hudCache.goldBtns = goldKey;
    for (const btn of ui.build.children) btn.disabled = g.gold < ELEMENTS[btn.dataset.el].cost;
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
  if (!view.game) return;
  view.selectedBuild = view.selectedBuild === el ? null : el;
  view.selectedTower = null;
  view.fuseMode = false;
  for (const btn of ui.build.children) btn.classList.toggle('active', btn.dataset.el === view.selectedBuild);
  renderInfo();
}

function clearBuild() {
  view.selectedBuild = null;
  for (const btn of ui.build.children) btn.classList.remove('active');
}

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
  if (s.percent) out.push(`🩸 +${Math.round(s.percent * 100)}% ของ HP สูงสุด`);
  return out.join('<br>');
}

const strongAgainst = (elements) => [...new Set(elements.map((e) => BEATS[e]))].map((e) => ELEMENTS[e].icon).join(' ');

function renderInfo() {
  const t = view.selectedTower;
  if (view.selectedBuild && !t) {
    const e = ELEMENTS[view.selectedBuild];
    const s = singleStats(view.selectedBuild, 1);
    ui.info.innerHTML = `
      <div class="title"><span>${e.icon}</span><span>ป้อม${e.th} <small>(${e.name})</small></span><span class="lv">🪙${e.cost}</span></div>
      <div class="effects">${e.desc}</div>
      <table>
        <tr><td>ดาเมจ</td><td>${fmt(s.dmg)}</td></tr>
        <tr><td>ความเร็วยิง</td><td>${fmt(s.rate)}/วิ</td></tr>
        <tr><td>ระยะ</td><td>${Math.round(s.range)}</td></tr>
        <tr><td>ชนะทาง</td><td>${strongAgainst([view.selectedBuild])}</td></tr>
      </table>
      <div class="effects">${effectLines(s)}</div>
      <div class="hint">คลิก/แตะบนพื้นหญ้าเพื่อวาง · Esc เพื่อยกเลิก</div>`;
    return;
  }
  if (!t) {
    ui.info.innerHTML = `<div class="hint">เลือกธาตุแล้วคลิกบนพื้นหญ้าเพื่อวางป้อม<br>คลิกที่ป้อมเพื่ออัปเกรด / หลอมรวม<br>🖱️ คลิกขวาลาก = หมุนกล้อง · ล้อเมาส์ = ซูม<br>📱 สองนิ้ว = หมุน/ซูม<br><br>💡 ป้อมเลเวล 3 สองธาตุ หลอมรวมเป็น <b>ป้อมหลอมรวม</b> ได้ 15 แบบ!</div>`;
    return;
  }
  const s = t.stats;
  const fused = t.elements.length > 1;
  const icons = t.elements.map((e) => ELEMENTS[e].icon).join('');
  const upCost = upgradeCost(t);
  const preview = upCost != null ? computeStats(fused ? { ...t, star: t.star + 1 } : { ...t, level: t.level + 1 }) : null;
  const up = (b, f = fmt) => (preview ? ` <span class="up">→ ${f(b)}</span>` : '');
  const lvLabel = fused ? '★'.repeat(t.star + 1) : `Lv.${t.level}`;
  const fuseBtn = !fused && t.level === MAX_LEVEL
    ? `<button id="bFuse" class="full">${view.fuseMode ? '✖ ยกเลิกการหลอมรวม' : `✦ หลอมรวม (🪙${FUSION_COST})`}</button>`
    : '';
  const upLabel = upCost == null
    ? (fused ? 'พลังสูงสุดแล้ว' : 'เลเวลสูงสุด')
    : `${fused ? '⬆ ปลุกพลัง' : '⬆ อัปเกรด'} (🪙${upCost})`;
  ui.info.innerHTML = `
    <div class="title"><span>${icons}</span><span>${towerName(t)}</span><span class="lv">${lvLabel}</span></div>
    <table>
      <tr><td>ดาเมจ</td><td>${fmt(s.dmg)}${up(preview && preview.dmg)}</td></tr>
      <tr><td>ความเร็วยิง</td><td>${fmt(s.rate)}/วิ${up(preview && preview.rate)}</td></tr>
      <tr><td>ระยะ</td><td>${Math.round(s.range)}${up(preview && preview.range, Math.round)}</td></tr>
      <tr><td>ชนะทาง</td><td>${strongAgainst(t.elements)}</td></tr>
      <tr><td>กำจัด / ดาเมจรวม</td><td>${t.kills} / ${Math.round(t.dmgDealt)}</td></tr>
    </table>
    <div class="effects">${effectLines(s)}</div>
    ${view.fuseMode ? '<div class="effects" style="color:#ffe680">เลือกป้อมเลเวล 3 ต่างธาตุที่มีกรอบสีทองเพื่อหลอมรวม</div>' : ''}
    <div class="btnRow">
      <button id="bUp" class="full">${upLabel}</button>
      ${fuseBtn}
      <button id="bMode">🎯 ${TARGET_LABEL[t.mode]}</button>
      <button id="bSell" class="danger">ขาย 🪙${sellValue(t)}</button>
    </div>`;
  $('bUp').addEventListener('click', () => view.game.upgradeTower(t));
  $('bMode').addEventListener('click', () => view.game.cycleMode(t));
  $('bSell').addEventListener('click', () => view.game.sellTower(t));
  const bf = $('bFuse');
  if (bf) bf.addEventListener('click', toggleFuse);
  refreshInfoButtons();
}

function refreshInfoButtons() {
  const t = view.selectedTower;
  const g = view.game;
  if (!t || !g) return;
  const bUp = $('bUp');
  if (bUp) {
    const c = upgradeCost(t);
    bUp.disabled = c == null || g.gold < c;
  }
  const bf = $('bFuse');
  if (bf && !view.fuseMode) bf.disabled = g.gold < FUSION_COST;
}

function toggleFuse() {
  const t = view.selectedTower;
  const g = view.game;
  if (!t || t.elements.length > 1 || t.level < MAX_LEVEL) return;
  view.fuseMode = !view.fuseMode;
  if (view.fuseMode && !g.towers.some((o) => canFuse(t, o))) {
    view.fuseMode = false;
    showToast('ต้องมีป้อมเลเวล 3 ธาตุอื่นอีก 1 ป้อม', 1200);
    Sound.play('error');
  }
  renderInfo();
}

function renderNextWave() {
  const g = view.game;
  const w = g && g.nextWaveData;
  if (!w || g.over) { ui.next.innerHTML = ''; return; }
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

/* ---------------- อินพุต ---------------- */
const canvas = renderer.canvas;
const pointers = new Map();
let gesture = null;

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
  if (ev.pointerType === 'mouse') view.hover = view.game ? renderer.pickTile(ev.clientX, ev.clientY) : null;
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
canvas.addEventListener('pointerleave', () => { view.hover = null; });
canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
renderer.controls.addEventListener('start', () => { renderer.userMovedCamera = true; });

function handleTap(x, y) {
  const g = view.game;
  if (!g || view.menu || view.paused) return;
  Sound.unlock();
  const h = renderer.pickTile(x, y);
  view.hover = h;
  if (!h) { cancelAll(); return; }
  const tower = g.towerGrid[h.r][h.c];

  if (view.fuseMode && view.selectedTower) {
    if (tower && canFuse(view.selectedTower, tower)) g.fuseTowers(view.selectedTower, tower);
    else { view.fuseMode = false; renderInfo(); }
    return;
  }
  if (view.selectedBuild && !tower) {
    g.placeTower(view.selectedBuild, h.c, h.r);
    return;
  }
  if (tower) {
    clearBuild();
    view.selectedTower = view.selectedTower === tower ? null : tower;
  } else {
    view.selectedTower = null;
  }
  view.fuseMode = false;
  renderInfo();
}

function cancelAll() {
  clearBuild();
  view.selectedTower = null;
  view.fuseMode = false;
  renderInfo();
}

document.addEventListener('keydown', (ev) => {
  if (!view.game || view.menu) return;
  const k = ev.key.toLowerCase();
  if (k >= '1' && k <= '6') { selectBuild(ELEMENT_ORDER[Number(k) - 1]); return; }
  const t = view.selectedTower;
  switch (k) {
    case ' ': ev.preventDefault(); startWave(); break;
    case 'escape': cancelAll(); break;
    case 'u': if (t) view.game.upgradeTower(t); break;
    case 's': if (t) view.game.sellTower(t); break;
    case 't': if (t) view.game.cycleMode(t); break;
    case 'f': cycleSpeed(); break;
    case 'p': togglePause(); break;
    case 'm': toggleMute(); break;
    case 'h': openHelp(); break;
    case 'c': renderer.resetCamera(); break;
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
function toggleMute() {
  ui.mute.textContent = Sound.toggle() ? '🔇' : '🔊';
}
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
    ? `คุณปกป้องแกนกลางได้ครบ ${TOTAL_WAVES} เวฟ!<br>กำจัดศัตรู ${g.kills} ตัว · ชีวิตเหลือ ${g.lives}`
    : `คุณผ่านไปได้ ${Math.max(0, g.wave - 1)} เวฟ · กำจัดศัตรู ${g.kills} ตัว`;
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

function drawThumb(def) {
  const c = document.createElement('canvas');
  c.width = 200; c.height = 120;
  const g = c.getContext('2d');
  const m = buildMap(def);
  const s = 10;
  for (let r = 0; r < ROWS; r++) {
    for (let col = 0; col < COLS; col++) {
      g.fillStyle = def.grass[(r + col) % 2];
      g.fillRect(col * s, r * s, s, s);
    }
  }
  g.strokeStyle = def.path;
  g.lineWidth = s * 0.9;
  g.lineJoin = 'round';
  g.beginPath();
  m.pts.forEach((p, i) => (i ? g.lineTo(p.x / 4, p.y / 4) : g.moveTo(p.x / 4, p.y / 4)));
  g.stroke();
  return c;
}

function renderMenu() {
  $('menuElems').innerHTML = ELEMENT_ORDER.map((el) => {
    const e = ELEMENTS[el];
    return `<span class="chip" style="background:${e.color}">${e.icon} ${e.th}</span>`;
  }).join('');

  const mapList = $('mapList');
  mapList.innerHTML = '';
  MAPS.forEach((m, i) => {
    const b = document.createElement('button');
    b.className = 'choice' + (i === view.mapIndex ? ' selected' : '');
    b.innerHTML = `<b>${m.name}</b><span>${m.desc}</span>`;
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
    b.innerHTML = `<b>${d.th}</b><span>ทอง ${d.gold} · ชีวิต ${d.lives} · HP ศัตรู ×${d.hp}</span>`;
    b.addEventListener('click', () => { view.diffKey = key; renderMenu(); });
    diffList.appendChild(b);
  });

  const best = loadBest()[MAPS[view.mapIndex].id + ':' + view.diffKey];
  $('bestScore').textContent = best ? `สถิติสูงสุด: เวฟ ${best}` : '';
}

function renderElementTable() {
  $('elemTable').innerHTML = ELEMENT_ORDER.map((el) => {
    const e = ELEMENTS[el];
    const b = ELEMENTS[BEATS[el]];
    return `<div style="border-color:${e.color}"><b>${e.icon} ${e.th} (${e.name})</b> — 🪙${e.cost}<br>${e.desc}<br><small>ชนะทาง: ${b.icon} ${b.th}</small></div>`;
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
  view,
  renderer,
  newGame,
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
