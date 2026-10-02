/* ============================================================
 *  Element TD — UI, อินพุต และลูปหลัก
 * ============================================================ */
import './style.css';
import {
  COLS, ROWS, ELEMENTS, ELEMENT_ORDER, BEATS, BASIC, ABILITIES,
  MAPS, DIFFICULTIES, TOTAL_WAVES, MAX_ELEMENT_LEVEL, MAX_TIER,
} from './data.js';
import { Sound } from './audio.js';
import { Music } from './music.js';
import { Game, parseMap, towerStats, towerName, buildCost, sellValue, TARGET_LABEL } from './sim.js';
import { Renderer3D } from './render3d.js';
import { ico, iconUrl, withIcons } from './icons.js';
import { TOWERS, towerDef } from './towers.js';
import { t as T, tr, elName, getLang, setLang } from './i18n.js';

const $ = (id) => document.getElementById(id);
const BUILD_TYPES = ['arrow', 'cannon', ...ELEMENT_ORDER];
const typeIcon = (type) => (BASIC[type] ? BASIC[type].icon : ELEMENTS[type].icon);
const towerIcon = (type) => (BASIC[type] ? BASIC[type].icon : 't_' + type);
const comboIcon = (els) => 't_' + els.slice().sort().join('_');
const towerPortrait = (t) => (t.kind === 'basic' ? BASIC[t.base].icon : comboIcon(t.elements));


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
  $('stage').innerHTML = `<div class="nogl">${T('nogl')}</div>`;
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
// บันทึกเฉพาะตอนไม่มีมอนสเตอร์ในสนาม — ถ้ารีเฟรชกลางเวฟ จะกลับไปก่อนเวฟนั้น
function saveGame() {
  const g = view.game;
  if (!g || g.over || g.waveActive) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...g.serialize(), savedAt: Date.now() }));
    const badge = $('saveBadge');
    badge.classList.add('show');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => badge.classList.remove('show'), 1500);
  } catch (e) { /* พื้นที่เต็มหรือถูกบล็อก */ }
}
function resumeGame() {
  const g = Game.restore(readSave());
  if (!g) { clearSave(); renderMenu(); showToast(T('toast.saveBroken'), 1600); return; }
  view.mapIndex = g.mapIndex;
  view.diffKey = g.diffKey;
  startWithGame(g);
  showToast(T('toast.resumed', { wave: g.wave, map: tr(MAPS[g.mapIndex], 'name') }), 1800);
}

/* ---------------- เริ่มเกม / เมนู ---------------- */
function newGame() {
  if (readSave() && !confirm(T('confirm.overwrite'))) return;
  clearSave();
  startWithGame(new Game(view.mapIndex, view.diffKey));
  const homeEl = MAPS[view.mapIndex].element;
  showToast(T('toast.mapStart', { map: tr(MAPS[view.mapIndex], 'name') }) + (homeEl ? `<br><small>${T('map.homeToast', { icon: ico(ELEMENTS[homeEl].icon), el: elName(ELEMENTS[homeEl]) })}</small>` : ''), 3200);
}

let endShown = false; // หน้าจอจบเกมกำลังแสดง (เล่นเพลงชนะ/แพ้อยู่)

function startWithGame(game) {
  view.game = game;
  view.selectedBuild = null;
  view.selectedTower = null;
  view.paused = false;
  view.menu = false;
  document.body.classList.remove('menuOpen');
  endShown = false;
  Music.play(MAPS[game.mapIndex].id);
  view.speed = 1;
  view.hoverCheck = null;
  renderer.loadMap(view.mapIndex);
  renderer.clearDynamic();
  renderer.resetCamera();
  hideOverlays();
  updatePauseUI();
  updateSpeedUI();
  refreshAll();
  saveGame();
}

function openMenu() {
  view.game = null;
  view.menu = true;
  document.body.classList.add('menuOpen');
  Music.play('menu');
  renderer.clearDynamic();
  renderer.loadMap(view.mapIndex);
  bgMapIndex = view.mapIndex;
  hideOverlays();
  $('menu').classList.add('show');
  $('infoCard').hidden = true;
  showMenuPage('main');
}

/* ---------------- แผนที่พื้นหลังเมนู (สลับอัตโนมัติ) ---------------- */
let menuPage = 'main';
let bgMapIndex = view.mapIndex;
let bgNext = 0; // เวลาจริง (ms) ที่จะสลับแผนที่ถัดไป
let bgFading = false;
const BG_INTERVAL = 8;
function swapBgMap(i) {
  if (bgFading) return;
  bgFading = true;
  const stage = $('stage');
  stage.classList.add('fadeOut');
  setTimeout(() => {
    bgMapIndex = i;
    if (view.menu) renderer.loadMap(i);
    stage.classList.remove('fadeOut');
    bgFading = false;
  }, 450);
}
function tickMenuBg(now) {
  if (!view.menu || menuPage !== 'main' || $('help').classList.contains('show')) { bgNext = now + BG_INTERVAL * 1000; return; }
  if (!bgNext) bgNext = now + BG_INTERVAL * 1000;
  if (now >= bgNext) { bgNext = now + BG_INTERVAL * 1000; swapBgMap((bgMapIndex + 1) % MAPS.length); }
}

// หน้าแรกของเมนู (3 ปุ่ม) ↔ หน้าเลือกแผนที่/ความยาก
function showMenuPage(page) {
  menuPage = page;
  // หน้าเลือกแผนที่: พื้นหลังเป็นแผนที่ที่เลือก · หน้าแรก: สลับแผนที่วนไปเรื่อย ๆ
  if (page === 'new' && bgMapIndex !== view.mapIndex) swapBgMap(view.mapIndex);
  bgNext = 0;
  $('menuMain').hidden = page !== 'main';
  $('menuNew').hidden = page !== 'new';
  $('menu').classList.toggle('isNew', page === 'new');
  renderMenu();
}

/* ---------------- เพลงระหว่างเล่น ----------------
 * มังกรโบราณอยู่ในสนาม → เพลงบอส · ภูตพิทักษ์ธาตุอยู่ในสนาม → เพลงภูต · นอกนั้นเพลงของแผนที่
 * (หน้าจอจบเกมเล่นเพลงชนะ/แพ้เอง) */
function updateBattleMusic(g) {
  if (endShown || g.over || view.menu) return;
  let track = MAPS[g.mapIndex].id;
  let guardian = false;
  for (const e of g.creeps) {
    if (!e.alive) continue;
    if (e.ability === 'boss') { track = 'boss'; guardian = false; break; }
    if (e.ability === 'elemental') guardian = true;
  }
  if (guardian) track = 'guardian';
  Music.play(track);
}

/* ---------------- ลูปหลัก ---------------- */
let last = performance.now();
function frame(now) {
  const realDt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tickMenuBg(now);
  const g = view.game;
  if (g && !view.paused && !view.menu) {
    let remaining = realDt * view.speed;
    while (remaining > 1e-6) {
      const step = Math.min(remaining, 1 / 60);
      g.update(step);
      remaining -= step;
    }
  }
  if (g) { processEvents(g); updateBattleMusic(g); }
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
        saveBest(ev.n);
        if (visuals) showToast(T('toast.waveDone', { n: ev.n, bonus: ev.bonus }) + (ev.interest ? T('toast.interest', { n: ev.interest }) : ''), 1600);
        changed = true;
        break;
      case 'elementPoint':
        if (visuals) setTimeout(() => showToast(T('toast.essence'), 2200), 1700);
        break;
      case 'win': if (visuals) { view.paused = true; updatePauseUI(); showEnd(true); } break;
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
  renderWaveChip(true);
  updateHud(true);
}

/* ---------------- HUD ---------------- */
const ui = {
  gold: $('gold'), lives: $('lives'), points: $('points'),
  pause: $('btnPause'), speed: $('btnSpeed'), 
  info: $('infoPanel'), card: $('infoCard'), build: $('buildGrid'), elems: $('elemGrid'),
  timer: $('waveTimer'), next: $('waveNext'), pop: $('wavePop'), toast: $('toast'),
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
  setText(ui.points, 'points', String(g.elemPoints));
  renderWaveChip(false);
  const goldKey = Math.floor(g.gold);
  if (hudCache.goldBtns !== goldKey) {
    hudCache.goldBtns = goldKey;
    refreshAffordability();
  }
  // อัปเดตแถบก่อสร้างในการ์ด
  const t = view.selectedTower;
  if (t && t.build) {
    const bar = document.querySelector('#infoPanel .building .bar i');
    if (bar) bar.style.width = `${Math.round((1 - t.build.t / t.build.total) * 100)}%`;
    const lbl = document.querySelector('#infoPanel .building .sec');
    if (lbl) lbl.textContent = T('sec', { n: Math.max(0, t.build.t).toFixed(1) });
  } else if (t && document.querySelector('#infoPanel .building')) {
    renderInfo();
  }
}

function refreshAffordability() {
  const g = view.game;
  if (!g) return;
  document.querySelectorAll('[data-cost]').forEach((b) => {
    b.disabled = b.dataset.ok === '0' || g.gold < Number(b.dataset.cost);
  });
}

/* ---------------- เวลาเวฟ ---------------- */
// เลขเวฟพร้อมจำนวนเวฟทั้งหมด เช่น 12/100 (โหมดไม่รู้จบแสดงแค่เลขเวฟ)
const waveNo = (g, n) => (g.endless ? String(n) : `${n}/${TOTAL_WAVES}`);
function renderWaveChip(force) {
  const g = view.game;
  if (!g) return;
  let label;
  if (g.over) label = T('wave.over');
  else if (g.waveActive) {
    const fromWave = g.creeps.some((e) => e.alive && e.ability !== 'elemental') || g.spawnQueue.length;
    label = fromWave ? T('wave.left', { n: waveNo(g, g.wave), left: g.creeps.filter((e) => e.alive && e.ability !== 'elemental').length + g.spawnQueue.length }) : T('wave.guardian');
  } else if (g.nextWaveIn != null && (g.wave < TOTAL_WAVES || g.endless)) label = g.wave === 0 ? T('wave.first', { s: Math.ceil(g.nextWaveIn) }) : T('wave.next', { n: waveNo(g, g.wave + 1), s: Math.ceil(g.nextWaveIn) });
  else label = T('wave.last');
  setText(ui.timer, 'timer', label);
  ui.timer.parentElement.classList.toggle('soon', !g.waveActive && g.nextWaveIn != null && g.nextWaveIn < 5);
  const w = g.nextWaveData;
  const key = w ? `${w.n}:${w.element}:${w.ability}:${getLang()}` : 'none';
  if (!force && hudCache.waveKey === key) return;
  hudCache.waveKey = key;
  if (!w || (g.wave >= TOTAL_WAVES && !g.endless)) { ui.next.innerHTML = ''; ui.pop.innerHTML = ''; return; }
  const e = ELEMENTS[w.element];
  const a = ABILITIES[w.ability];
  const hp = Math.round(a.hp * w.hpScale);
  const weak = Object.keys(BEATS).filter((k) => BEATS[k] === w.element);
  ui.next.innerHTML = `${g.wave > 0 ? `<span class="muted">${T('wave.upcoming')}</span>` : ""}${ico(e.icon)}${ico(a.icon)}<span class="txt">${w.ability === 'boss' ? `<span class="boss">${T('wave.boss')}</span>` : tr(a, 'creature')}</span> ×${w.count}`;
  ui.pop.innerHTML = `
    <div class="row">${ico(a.icon)}<div><b>${T('wave.popTitle', { n: w.n, creature: tr(a, 'creature') })}</b><br><span class="muted">${T('wave.popEl')}</span><b style="color:${e.color}"> ${elName(e)}</b> · ${tr(a, 'th')} · ×${w.count}</div></div>
    <div>${ico('heart')} ${T('wave.hp', { hp: hp.toLocaleString() })}</div>
    <div class="muted">${tr(a, 'desc')}</div>
    <div>${T('wave.weakTo')} ${weak.map((k) => `${ico(ELEMENTS[k].icon)} ${elName(ELEMENTS[k])}`).join(' ')}</div>`;
}

/* ---------------- ธาตุ ---------------- */
function renderElements() {
  const g = view.game;
  if (!g) return;
  document.querySelector('.stat.essence').classList.toggle('pulse', g.elemPoints > 0);
  ui.elems.innerHTML = '';
  for (const el of ELEMENT_ORDER) {
    const e = ELEMENTS[el];
    const lv = g.elemLevel[el];
    const pend = g.pendingElem[el];
    const can = g.elemPoints > 0 && lv < MAX_ELEMENT_LEVEL && !pend;
    const b = document.createElement('button');
    b.className = `elemOrb lv${lv}${can ? ' can' : ''}${pend ? ' pending' : ''}`;
    b.style.setProperty('--c', e.color);
    b.title = `${T('el.title', { el: elName(e), name: e.name, lv, max: MAX_ELEMENT_LEVEL })}\n${tr(e, 'desc')}\n${T('el.beats', { el: elName(ELEMENTS[BEATS[el]]) })}`
      + (pend ? `\n${T('el.pending', { el: elName(e), lv: pend })}` : can ? `\n${T('el.can', { el: elName(e), lv: lv + 1 })}` : '');
    b.innerHTML = `${ico(e.icon)}<span class="pips">${[1, 2, 3].map((i) => `<i class="${i <= lv ? 'on' : i === pend ? 'pend' : ''}"></i>`).join('')}</span>`;
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
    b.title = `${basic ? tr(basic, 'th') : tr(TOWERS[type], 'th')} (${i + 1}) — ${basic ? tr(basic, 'desc') : tr(TOWERS[type], 'attack')}${locked ? `\n${T('build.locked', { el: elName(e) })}` : ''}`;
    b.innerHTML = `<span class="k">${i + 1}</span>${ico(towerIcon(type))}${locked ? ico('lock', 'lockIco') : ''}<span class="c">${ico('gold')}${cost}</span>`;
    b.addEventListener('click', () => selectBuild(type));
    ui.build.appendChild(b);
  });
  refreshAffordability();
}

function selectBuild(type) {
  const g = view.game;
  if (!g) return;
  if (!BASIC[type] && g.elemLevel[type] < 1) {
    showToast(T('toast.unlockFirst', { el: elName(ELEMENTS[type]) }), 1400);
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

/* ---------------- การ์ดข้อมูล ---------------- */
const fmt = (n) => (n >= 100 ? Math.round(n).toString() : (Math.round(n * 10) / 10).toString());

function effectLines(s) {
  const out = [];
  const pct = (x) => Math.round(x * 100);
  if (s.global) out.push(`${ico('fx_pierce')} ${T('fx.global')}`);
  if (s.splash) out.push(`${ico('fx_splash')} ${T('fx.splash', { r: Math.round(s.splash) })}`);
  if (s.burn) out.push(`${ico('fx_burn')} ${T('fx.burn', { dps: fmt(s.burn.dps), dur: s.burn.dur })}`);
  if (s.wet) out.push(`${ico('fx_slow')} ${T('fx.wet', { p: pct(1 - s.wet.factor) })}`);
  if (s.slow) out.push(`${ico('fx_slow')} ${T('fx.slow', { p: pct(1 - s.slow.factor) })}`);
  if (s.stun) out.push(`${ico('fx_stun')} ${T('fx.stun', { p: pct(s.stun.chance), dur: s.stun.dur })}`);
  if (s.multi) out.push(`${ico('fx_multi')} ${T('fx.multi', { n: s.multi })}`);
  if (s.gust) out.push(`${ico('fx_knock')} ${T('fx.gust', { n: s.gust.every })}`);
  if (s.corrode) out.push(`${ico('fx_percent')} ${T('fx.corrode', { p: fmt(s.corrode.pct * 100) })}`);
  if (s.marks) out.push(`${ico('fx_curse')} ${T('fx.marks', { n: s.marks.need, p: pct(s.marks.pct) })}`);
  if (s.chain) out.push(`${ico('fx_multi')} ${T('fx.chain', { n: s.chain.bounces, p: pct(1 - s.chain.falloff) })}`);
  if (s.ramp) out.push(`${ico('fx_burn')} ${T('fx.ramp', { m: fmt(s.ramp.max) })}`);
  if (s.pierce) out.push(`${ico('fx_pierce')} ${T('fx.pierce')}`);
  if (s.expose) out.push(`${ico('target')} ${T('fx.expose', { m: fmt(s.expose.amp) })}`);
  if (s.soul) out.push(`${ico('fx_burn')} ${T('fx.soul', { dps: fmt(s.soul.dps), n: s.soul.spread })}`);
  if (s.root) out.push(`${ico('lock')} ${T('fx.root', { dur: fmt(s.root.dur) })}`);
  if (s.chill) out.push(`${ico('fx_slow')} ${T('fx.chill', { dur: fmt(s.chill.freeze) })}`);
  if (s.shatter) out.push(`${ico('fx_splash')} ${T('fx.shatter', { m: fmt(s.shatter.mul) })}`);
  if (s.shred) out.push(`${ico('fx_curse')} ${T('fx.shred', { m: fmt(s.shred.amp) })}`);
  if (s.cone) out.push(`${ico('fx_splash')} ${T('fx.cone')}`);
  if (s.erosion) out.push(`${ico('fx_stun')} ${T('fx.erosion', { n: s.erosion.need })}`);
  if (s.zone) {
    const z = s.zone;
    const label = T('fx.zone.' + z.kind, { p: z.sticky ? pct(1 - z.sticky) : 0 });
    out.push(`${ico('fx_splash')} ${label} · ${T('sec', { n: z.dur })}`);
  }
  if (s.tornado) out.push(`${ico('fx_burn')} ${T('fx.tornado', { dur: s.tornado.dur })}${s.tornado.trail ? T('fx.tornadoTrail') : ''}`);
  if (s.erupt) out.push(`${ico('fx_splash')} ${T('fx.erupt', { d: s.erupt.delay })}`);
  if (s.meteor) out.push(`${ico('fx_splash')} ${T('fx.meteor', { n: s.meteor.count + 1 })}`);
  return out.join('<br>');
}

const rangeText = (r) => (r >= 1000 ? T('info.global') : Math.round(r));
const descBlock = (def) => (def ? `<div class="effects desc">${tr(def, 'attack')}<br><span class="weak">${ico('warning')} ${tr(def, 'weak')}</span></div>` : '');

const strongAgainst = (els) => (els.length ? [...new Set(els.map((e) => BEATS[e]))].map((e) => ico(ELEMENTS[e].icon)).join(' ') : T('info.neutral'));
const stars = (n, max) => ico('star').repeat(n) + ico('star_empty').repeat(Math.max(0, max - n));

function renderInfo() {
  const g = view.game;
  const t = view.selectedTower;
  if (!g || (!t && !view.selectedBuild)) { ui.card.hidden = true; ui.info.innerHTML = ''; return; }
  ui.card.hidden = false;
  if (view.selectedBuild && !t) {
    const type = view.selectedBuild;
    const basic = BASIC[type];
    const e = basic || ELEMENTS[type];
    const s = towerStats(basic ? { kind: 'basic', base: type, tier: 1 } : { kind: 'element', elements: [type], tier: 1 });
    const hc = view.hoverCheck;
    ui.info.innerHTML = `
      <div class="title"><img class="portrait" src="${iconUrl(towerIcon(type))}" alt=""><span>${basic ? tr(basic, 'th') : tr(TOWERS[type], 'th')}</span><span class="lv">${ico('gold')} ${buildCost(type)}</span></div>
      ${basic ? `<div class="effects">${tr(basic, 'desc')}</div>` : descBlock(TOWERS[type])}
      <table>
        <tr><td>${T('info.dmg')}</td><td>${fmt(s.dmg)}</td></tr>
        <tr><td>${T('info.rate')}</td><td>${T('info.perSec', { n: fmt(s.rate) })}</td></tr>
        <tr><td>${T('info.range')}</td><td>${rangeText(s.range)}</td></tr>
        <tr><td>${T('info.strong')}</td><td>${strongAgainst(basic ? [] : [type])}</td></tr>
        <tr><td>${T('info.buildTime')}</td><td>${T('sec', { n: basic ? '2.5' : '3.5' })}</td></tr>
      </table>
      <div class="effects">${effectLines(s)}</div>
      <div class="hint">${hc && !hc.ok && hc.reason ? `${ico('warning')} ${hc.reason}<br>` : ''}${T('info.placeHint')}</div>`;
    return;
  }
  const s = t.stats;
  const maxT = t.kind === 'basic' ? 3 : MAX_TIER[t.elements.length];
  const opts = g.upgradeOptions(t);
  const tierOpt = opts.find((o) => o.type === 'tier');
  const addOpts = opts.filter((o) => o.type === 'add');
  const preview = tierOpt ? towerStats({ ...t, tier: t.tier + 1 }) : null;
  const up = (b, f = fmt) => (preview ? ` <span class="up">→ ${f(b)}</span>` : '');
  const kindLabel = t.kind === 'basic' ? T('info.basic') : T('info.k' + t.elements.length);
  const portrait = towerPortrait(t);
  const elIcons = t.elements.map((e) => ico(ELEMENTS[e].icon)).join('');
  const b = t.build;
  const building = b ? `<div class="building">${ico('hammer')} ${b.kind === 'build' ? T('info.building') : T('info.upgrading')} <span class="bar"><i style="width:${Math.round((1 - b.t / b.total) * 100)}%"></i></span><span class="sec">${T('sec', { n: b.t.toFixed(1) })}</span></div>` : '';
  ui.info.innerHTML = `
    <div class="title"><img class="portrait" src="${iconUrl(portrait)}" alt=""><span>${towerName(t)}<br><small style="color:var(--muted);font-weight:400">${kindLabel} ${elIcons}</small></span><span class="lv">${stars(t.tier, maxT)}</span></div>
    ${building}
    ${t.kind === 'basic' ? '' : descBlock(towerDef(t.elements))}
    <table>
      <tr><td>${T('info.dmg')}</td><td>${fmt(s.dmg)}${up(preview && preview.dmg)}</td></tr>
      <tr><td>${T('info.rate')}</td><td>${T('info.perSec', { n: fmt(s.rate) })}${up(preview && preview.rate)}</td></tr>
      <tr><td>${T('info.range')}</td><td>${rangeText(s.range)}${s.range < 1000 ? up(preview && preview.range, Math.round) : ''}</td></tr>
      <tr><td>${T('info.strong')}</td><td>${strongAgainst(t.elements)}</td></tr>
      <tr><td>${T('info.kills')}</td><td>${t.kills} / ${Math.round(t.dmgDealt)}</td></tr>
    </table>
    <div class="effects">${effectLines(s)}${MAPS[g.mapIndex].element && t.elements.includes(MAPS[g.mapIndex].element) ? `<br>${ico(ELEMENTS[MAPS[g.mapIndex].element].icon)} <b style="color:var(--gold2)">${T('info.home', { el: elName(ELEMENTS[MAPS[g.mapIndex].element]) })}</b>` : ''}</div>
    <div class="btnRow">
      ${tierOpt ? `<button id="bUp" class="full primary" data-cost="${tierOpt.cost}" data-ok="${tierOpt.ok && !b ? 1 : 0}" title="${tierOpt.reason || ''}">${ico('upgrade')} ${T('info.upgrade', { n: t.tier + 1 })} (${ico('gold')}${tierOpt.cost})${tierOpt.ok ? '' : ' ' + ico('lock')}</button>` : `<button class="full" disabled>${ico('crown')} ${T('info.maxed')}</button>`}
    </div>
    ${tierOpt && !tierOpt.ok ? `<div class="effects" style="margin-top:4px">${ico('lock')} ${tierOpt.reason}</div>` : ''}
    ${addOpts.length ? `<div class="sect">${ico('sparkle')} ${T('info.addEl', { kind: T(t.elements.length === 1 ? 'info.toDual' : 'info.toTriple') })}</div><div class="addGrid" id="addGrid"></div>` : ''}
    <div class="btnRow" style="margin-top:8px">
      <button id="bMode">${ico('target')} ${TARGET_LABEL[t.mode]}</button>
      <button id="bSell" class="danger">${ico('sell')} ${T('info.sell', { n: b && b.kind === 'build' ? t.spent : sellValue(t) })}</button>
    </div>`;
  if (tierOpt) $('bUp').addEventListener('click', () => g.applyUpgrade(t, tierOpt));
  const grid = $('addGrid');
  if (grid) {
    for (const o of addOpts) {
      const btn = document.createElement('button');
      btn.className = `addBtn${o.ok ? '' : ' need'}`;
      btn.dataset.cost = o.cost;
      btn.dataset.ok = o.ok && !b ? 1 : 0;
      btn.title = o.ok ? T('info.tierOf', { name: o.label, n: o.tier }) : o.reason;
      btn.title = `${o.label}${o.ok ? '' : ' — ' + o.reason}\n${tr(towerDef(o.els), 'attack')}`;
      btn.innerHTML = `${ico(comboIcon(o.els))}<span><span class="nm">${o.label}</span><span class="c">${ico('gold')}${o.cost}</span>${o.ok ? '' : ' ' + ico('lock')}</span>`;
      btn.addEventListener('click', () => g.applyUpgrade(t, o));
      grid.appendChild(btn);
    }
  }
  $('bMode').addEventListener('click', () => g.cycleMode(t));
  $('bSell').addEventListener('click', () => g.sellTower(t));
  refreshAffordability();
}

let toastTimer = null;
function showToast(text, ms) {
  ui.toast.innerHTML = withIcons(text);
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
  if (res.ok && g.gold < buildCost(type)) res = { ok: false, reason: T('info.noGold') };
  if (res.ok) {
    const chk = g.checkBuild(h.c, h.r);
    res = { ok: chk.ok, reason: chk.reason };
  }
  view.hoverCheck = { ...res, c: h.c, r: h.r };
}

canvas.addEventListener('pointerdown', (ev) => {
  pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (pointers.size === 1) gesture = { x: ev.clientX, y: ev.clientY, t: performance.now(), button: ev.button, multi: false, moved: false };
  else if (gesture) gesture.multi = true;
});
canvas.addEventListener('pointermove', (ev) => {
  if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (gesture && Math.hypot(ev.clientX - gesture.x, ev.clientY - gesture.y) > 8) gesture.moved = true;
  if (ev.pointerType !== 'mouse') return;
  canvas.style.cursor = renderer.pickLink(ev.clientX, ev.clientY) ? 'pointer' : '';
  if (!view.game) return;
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
  const link = renderer.pickLink(x, y);
  if (link) { window.open(link, '_blank', 'noopener'); return; }
  const g = view.game;
  if (!g || view.menu) return;
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
  if ($('settings').classList.contains('show')) { if (ev.key === 'Escape') closeSettings(); return; }
  if (!view.game || view.menu) return;
  const k = ev.key.toLowerCase();
  if (k >= '1' && k <= '8') { selectBuild(BUILD_TYPES[Number(k) - 1]); return; }
  const t = view.selectedTower;
  switch (k) {
    case ' ': ev.preventDefault(); togglePause(); break;
    case 'p': togglePause(); break;
    case 'escape': cancelAll(); break;
    case 'u': if (t) view.game.upgradeTier(t); break;
    case 's': if (t) view.game.sellTower(t); break;
    case 't': if (t) view.game.cycleMode(t); break;
    case 'f': cycleSpeed(); break;
    case 'm': toggleMute(); break;
    case 'o': openSettings(); break;
    case 'h': openHelp(); break;
    case 'c': renderer.resetCamera(); break;
    case 'z': toggleFullscreen(); break;
    case 'l': toggleLang(); break;
    default: break;
  }
});

/* ---------------- ปุ่มควบคุม ---------------- */
const setIcon = (btn, name) => { btn.querySelector('img').src = iconUrl(name); };
function updatePauseUI() {
  setIcon(ui.pause, view.paused ? 'play' : 'pause');
  ui.pause.title = view.paused ? T('btn.play') : T('btn.pause');
  $('pauseOverlay').classList.toggle('show', view.paused && !!view.game && !view.menu);
}
function updateSpeedUI() { $('speedLbl').textContent = `${view.speed}×`; }
function cycleSpeed() { view.speed = view.speed >= 3 ? 1 : view.speed + 1; updateSpeedUI(); }
function togglePause() {
  if (!view.game || view.game.over) return;
  Sound.unlock();
  view.paused = !view.paused;
  updatePauseUI();
}
// M = ปิด/เปิดเสียงทั้งหมด (เอฟเฟกต์ + เพลง)
function toggleMute() {
  const m = !(Sound.muted && Music.muted);
  Sound.setMuted(m);
  Music.setMuted(m);
  updateSettingsUI();
}
function toggleFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement) {
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) Promise.resolve(req.call(el)).catch(() => showToast(T('toast.noFullscreen'), 1200));
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  }
}

ui.pause.addEventListener('click', togglePause);
ui.speed.addEventListener('click', cycleSpeed);
Music.play('menu');
// นโยบาย autoplay: เริ่มเพลงเมื่อผู้ใช้แตะ/กดปุ่มครั้งแรก
for (const evName of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(evName, () => { Sound.unlock(); Music.unlock(); }, { passive: true });
$('btnCamera').addEventListener('click', () => renderer.resetCamera());

/* ---------------- หน้าตั้งค่า ---------------- */
let pausedBySettings = false;
function openSettings() {
  if (view.game && !view.menu && !view.paused) { view.paused = true; pausedBySettings = true; updatePauseUI(); }
  updateSettingsUI();
  $('settings').classList.add('show');
}
function closeSettings() {
  $('settings').classList.remove('show');
  if (pausedBySettings) { view.paused = false; pausedBySettings = false; updatePauseUI(); }
}
function updateSettingsUI() {
  const sw = (id, on) => { const b = $(id); b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); };
  sw('tglMusic', !Music.muted);
  sw('tglSfx', !Sound.muted);
  sw('tglFull', !!document.fullscreenElement);
  $('volMusic').value = Math.round(Music.volume * 100);
  $('volSfx').value = Math.round(Sound.volume * 100);
  $('volMusic').disabled = Music.muted;
  $('volSfx').disabled = Sound.muted;
  for (const b of document.querySelectorAll('#segQuality .seg')) b.classList.toggle('on', b.dataset.q === renderer.quality);
  for (const b of document.querySelectorAll('#segLang .seg')) b.classList.toggle('on', b.dataset.lang === getLang());
}
$('btnSettings').addEventListener('click', openSettings);
$('btnSettingsMenu').addEventListener('click', () => { Sound.unlock(); openSettings(); });
$('btnCloseSettings').addEventListener('click', closeSettings);
$('settings').addEventListener('click', (ev) => { if (ev.target.id === 'settings') closeSettings(); });
$('tglMusic').addEventListener('click', () => { Music.setMuted(!Music.muted); updateSettingsUI(); });
$('tglSfx').addEventListener('click', () => { Sound.setMuted(!Sound.muted); if (!Sound.muted) { Sound.unlock(); Sound.play('build'); } updateSettingsUI(); });
$('volMusic').addEventListener('input', (ev) => Music.setVolume(ev.target.value / 100));
$('volSfx').addEventListener('input', (ev) => Sound.setVolume(ev.target.value / 100));
$('volSfx').addEventListener('change', () => { Sound.unlock(); Sound.play('build'); });
for (const b of document.querySelectorAll('#segQuality .seg')) b.addEventListener('click', () => { renderer.setQuality(b.dataset.q); updateSettingsUI(); });
for (const b of document.querySelectorAll('#segLang .seg')) b.addEventListener('click', () => { if (b.dataset.lang !== getLang()) toggleLang(); updateSettingsUI(); });
$('tglFull').addEventListener('click', toggleFullscreen);
$('btnSetHelp').addEventListener('click', () => { closeSettings(); openHelp(); });
$('infoClose').addEventListener('click', cancelAll);
document.addEventListener('fullscreenchange', () => {
  updateSettingsUI();
  setTimeout(updateLayout, 60);
});

/* ---------------- เลย์เอาต์ ---------------- */
// พื้นที่ที่ HUD (บน) และแถบล่างบัง — กล้องจะจัดกระดานไว้ตรงกลางส่วนที่เหลือ
function updateLayout() {
  const hud = $('hud');
  const dock = $('dock');
  const H = window.innerHeight;
  const hudBottom = hud.offsetTop + hud.offsetHeight;
  document.documentElement.style.setProperty('--hudH', `${hudBottom}px`);
  const dockTop = dock.getBoundingClientRect().top;
  renderer.setInsets({ top: hudBottom - 6, bottom: Math.max(0, H - dockTop - 4), left: 0, right: 0 });
}
window.addEventListener('resize', updateLayout);
new ResizeObserver(updateLayout).observe($('hud'));
new ResizeObserver(updateLayout).observe($('dock'));

/* ---------------- หน้าจอซ้อน ---------------- */
let pausedByHelp = false;
function openHelp() {
  if (view.game && !view.menu && !view.paused) { view.paused = true; pausedByHelp = true; updatePauseUI(); }
  $('help').classList.add('show');
}
$('btnCloseHelp').addEventListener('click', () => {
  $('help').classList.remove('show');
  if (pausedByHelp) { view.paused = false; pausedByHelp = false; updatePauseUI(); }
});
$('btnHowTo').addEventListener('click', openHelp);

function hideOverlays() {
  for (const id of ['menu', 'endScreen', 'help']) $(id).classList.remove('show');
}

function showEnd(won) {
  endShown = true;
  Music.play(won ? 'victory' : 'defeat');
  const g = view.game;
  if (!g) return;
  $('endTitle').innerHTML = won ? `${ico('trophy')} ${T('end.win')}` : `${ico('skull')} ${T('end.lose')}`;
  $('endText').innerHTML = won
    ? T('end.winText', { n: TOTAL_WAVES, kills: g.kills, lives: g.lives })
    : T('end.loseText', { n: Math.max(0, g.wave - 1), kills: g.kills });
  $('btnContinue').style.display = won ? '' : 'none';
  $('endScreen').classList.add('show');
}

$('btnContinue').addEventListener('click', () => {
  view.game.continueEndless();
  endShown = false;
  view.paused = false;
  updatePauseUI();
  $('endScreen').classList.remove('show');
  updateHud(true);
});
$('btnRetry').addEventListener('click', () => { Sound.unlock(); clearSave(); startWithGame(new Game(view.mapIndex, view.diffKey)); });
$('btnMenu').addEventListener('click', openMenu);
$('btnStart').addEventListener('click', () => { Sound.unlock(); newGame(); });
$('btnResume').addEventListener('click', () => { Sound.unlock(); resumeGame(); });
$('btnNew').addEventListener('click', () => { Sound.unlock(); showMenuPage('new'); });
$('btnBack').addEventListener('click', () => showMenuPage('main'));
window.addEventListener('pagehide', saveGame);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); Music.setHidden(document.hidden); });

function drawThumb(def) {
  const c = document.createElement('canvas');
  c.width = 200; c.height = 120;
  const g = c.getContext('2d');
  const m = parseMap(def);
  const s = 10;
  const TH = {
    desert: { '.': '#c9a466', '#': '#e6c882', W: '#a8844e' },
    volcano: { '.': '#4a3a34', '#': '#2a2220', '=': '#4a3a34', X: '#ff6a1a', R: '#1a1414' },
    river: { '#': '#4f9a3a', '=': '#3a9ad8', R: '#7a7a6a' },
    sky: { '.': '#c8d8f0', '#': '#ffffff', X: '#5aa0ff' },
    cave: { '#': '#3a3028', '=': '#6a5a4a', R: '#a070ff' },
  }[def.theme] || {};
  const colors = { '.': '#8a8378', '#': '#4f8f35', '=': '#a89a80', R: '#5a5a5a', W: '#6a5f50', S: '#3a9bff', C: '#ff3048', ...TH };
  for (let r = 0; r < ROWS; r++) {
    for (let col = 0; col < COLS; col++) {
      g.fillStyle = colors[m.tiles[r][col]] || '#ffd65a';
      g.fillRect(col * s, r * s, s, s);
    }
  }
  g.strokeStyle = 'rgba(0,0,0,0.15)';
  for (let x = 0; x <= COLS; x++) { g.beginPath(); g.moveTo(x * s, 0); g.lineTo(x * s, ROWS * s); g.stroke(); }
  return c;
}

function renderMenu() {
  const mapList = $('mapList');
  mapList.innerHTML = '';
  MAPS.forEach((m, i) => {
    const b = document.createElement('button');
    b.className = 'mapCard' + (i === view.mapIndex ? ' selected' : '');
    b.appendChild(drawThumb(m));
    const name = document.createElement('b');
    name.textContent = tr(m, 'name');
    b.appendChild(name);
    if (m.element) {
      const badge = document.createElement('span');
      badge.className = 'mapEl';
      badge.title = T('map.home', { el: elName(ELEMENTS[m.element]) });
      badge.innerHTML = ico(ELEMENTS[m.element].icon);
      b.appendChild(badge);
    }
    b.addEventListener('click', () => { view.mapIndex = i; bgMapIndex = i; renderer.loadMap(i); renderMenu(); });
    mapList.appendChild(b);
  });
  const diffList = $('diffList');
  diffList.innerHTML = '';
  Object.entries(DIFFICULTIES).forEach(([key, d]) => {
    const b = document.createElement('button');
    b.className = 'seg' + (key === view.diffKey ? ' on' : '');
    b.textContent = tr(d, 'th');
    b.addEventListener('click', () => { view.diffKey = key; renderMenu(); });
    diffList.appendChild(b);
  });
  // ปุ่มเล่นต่อแสดงเฉพาะเมื่อมีเกมค้าง
  const save = readSave();
  const has = !!(save && MAPS[save.mapIndex] && DIFFICULTIES[save.diffKey]);
  const btn = $('btnResume');
  btn.hidden = !has;
  btn.title = has ? T('menu.resumeText', { map: tr(MAPS[save.mapIndex], 'name'), diff: tr(DIFFICULTIES[save.diffKey], 'th'), wave: save.wave }) : '';
}

function renderHelp() {
  const items = [['play', 'help.i1'], ['heart', 'help.i2'], ['hammer', 'help.i3'], ['essence', 'help.i4'], ['t_arrow', 'help.i5'], ['sparkle', 'help.i6'], ['map_maze', 'help.i7'], ['gold', 'help.i8'], ['sign', 'help.i9']].map(([i, k]) => [i, T(k)]);
  $('helpList').innerHTML = items.map(([i, t]) => `<li>${ico(i)}<span>${t}</span></li>`).join('');
  $('creatureTable').innerHTML = ['normal', 'fast', 'armored', 'regen', 'split', 'undead', 'flying', 'boss', 'elemental'].map((k) => {
    const a = ABILITIES[k];
    return `<div>${ico(a.icon)}<span><b>${tr(a, 'creature')}</b><br>${tr(a, 'th')} — ${tr(a, 'desc')}</span></div>`;
  }).join('');
  $('elemTable').innerHTML = ELEMENT_ORDER.map((el) => {
    const e = ELEMENTS[el];
    const b = ELEMENTS[BEATS[el]];
    const d = TOWERS[el];
    return `<div style="border-color:${e.color}"><b>${ico(e.icon)} ${T('help.elemCard', { el: elName(e), tower: tr(d, 'th') })}</b><br>${tr(d, 'attack')}<br><small>${ico('warning')} ${tr(d, 'weak')} · ${T('help.beats')}: ${ico(b.icon)} ${elName(b)}</small></div>`;
  }).join('');
  const icons = (k) => k.split('+').map((e) => ico(ELEMENTS[e].icon)).join('');
  const combos = Object.entries(TOWERS).filter(([k]) => k.includes('+'));
  $('compendium').innerHTML = combos.map(([k, d]) => `<div class="combo"><img class="portrait" src="${iconUrl(comboIcon(k.split('+')))}" alt=""><div><b>${tr(d, 'th')}</b> <span class="els">${icons(k)}</span><br><small class="look">${tr(d, 'look')}</small><br>${tr(d, 'attack')}<br><small class="weak">${ico('warning')} ${tr(d, 'weak')}</small></div></div>`).join('');
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
    const sx = x1 + Math.cos(ang) * 26, sy = y1 + Math.sin(ang) * 26;
    const ex = x2 - Math.cos(ang) * 26, ey = y2 - Math.sin(ang) * 26;
    g.strokeStyle = ELEMENTS[a].color; g.fillStyle = ELEMENTS[a].color; g.lineWidth = 3;
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
    g.beginPath(); g.moveTo(ex, ey);
    g.lineTo(ex - Math.cos(ang - 0.45) * 11, ey - Math.sin(ang - 0.45) * 11);
    g.lineTo(ex - Math.cos(ang + 0.45) * 11, ey - Math.sin(ang + 0.45) * 11);
    g.closePath(); g.fill();
  }
  for (const [el, [x, y]] of Object.entries(pos)) {
    const img = new Image();
    img.onload = () => g.drawImage(img, x - 24, y - 24, 48, 48);
    img.src = iconUrl(ELEMENTS[el].icon);
  }
  g.fillStyle = '#f3d98a';
  g.font = '600 14px Kanit, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('×2', cx, cy);
}

/* ---------------- ภาษา ---------------- */
function applyLang() {
  const L = getLang();
  document.documentElement.lang = L;
  document.title = T('doc.title');
  const md = document.querySelector('meta[name="description"]');
  if (md) md.content = T('doc.desc');
  for (const el of document.querySelectorAll('[data-i18n]')) el.innerHTML = T(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-title]')) el.title = T(el.dataset.i18nTitle);
  for (const el of document.querySelectorAll('#langLbl, .langLbl')) el.textContent = L === 'th' ? 'EN' : 'TH';
  updatePauseUI();
  updateSettingsUI();
  renderHelp();
  renderMenu();
  if (view.game) { refreshAll(); renderWaveChip(true); }
  if (renderer.world && renderer.world.creatorSign && renderer.world.creatorSign.userData.redraw) renderer.world.creatorSign.userData.redraw();
}
function toggleLang() {
  setLang(getLang() === 'th' ? 'en' : 'th');
  applyLang();
  showToast(T('toast.lang'), 1000);
}

/* ---------------- เริ่มต้น ---------------- */
applyLang();
renderHelp();
drawCycle();
renderBuild();
renderMenu();
updateLayout();
requestAnimationFrame(frame);

// เปิดให้ทดสอบ/ดีบักผ่าน console
window.ETD = {
  view,
  music: Music,
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
