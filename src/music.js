/* ============================================================
 *  เพลงประกอบ (ไฟล์ใน public/music) — เล่นวนซ้ำ เฟดข้ามเพลง
 *  เพิ่มเพลงใหม่: ใส่ไฟล์ใน public/music แล้วเพิ่มชื่อใน TRACKS
 *  ชื่อเพลงที่เกมเรียกใช้: menu · <id แผนที่> · boss (มังกรโบราณ) · guardian (ภูตพิทักษ์ธาตุ) · victory · defeat
 * ============================================================ */
const BASE = `${import.meta.env.BASE_URL}music/`;

export const TRACKS = {
  menu: { file: 'main-theme.mp3', vol: 0.5 },
  // เพลงประจำแผนที่ (เบากว่าเล็กน้อย ให้ได้ยินเสียงเอฟเฟกต์ชัด)
  meadow: { file: 'meadow.mp3', vol: 0.42 },
  ruins: { file: 'ruins.mp3', vol: 0.42 },
  canyon: { file: 'canyon.mp3', vol: 0.42 },
  spiral: { file: 'spiral.mp3', vol: 0.42 },
  volcano: { file: 'volcano.mp3', vol: 0.42 },
  river: { file: 'river.mp3', vol: 0.42 },
  clouds: { file: 'clouds.mp3', vol: 0.42 },
  underground: { file: 'underground.mp3', vol: 0.42 },
  boss: { file: 'boss-dragon.mp3', vol: 0.5 },
  guardian: { file: 'guardian.mp3', vol: 0.5 },
  victory: { file: 'victory.mp3', vol: 0.55, loop: false },
  defeat: { file: 'defeat.mp3', vol: 0.55, loop: false },
};

export const Music = (() => {
  let muted = false;
  let volume = 0.8;
  try {
    muted = localStorage.getItem('etd_music_muted') === '1';
    const v = parseFloat(localStorage.getItem('etd_music_vol'));
    if (v >= 0 && v <= 1) volume = v;
  } catch (e) { /* ignore */ }
  let unlocked = false;   // เบราว์เซอร์อนุญาตให้เล่นเสียงแล้วหรือยัง
  let hidden = false;
  let cur = null;         // { name, el, vol }

  function fade(el, to, ms, done) {
    if (el._fade) cancelAnimationFrame(el._fade);
    const from = el.volume, t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k < 1) el._fade = requestAnimationFrame(step);
      else { el._fade = 0; if (done) done(); }
    };
    el._fade = requestAnimationFrame(step);
  }

  function startCurrent(ms = 1500) {
    if (!cur || muted || hidden) return;
    const { el, vol } = cur;
    const p = el.play();
    if (p && p.then) {
      p.then(() => { unlocked = true; fade(el, vol * volume, ms); }).catch(() => { /* รอผู้ใช้แตะหน้าจอก่อน */ });
    }
  }

  function play(name) {
    if (cur && cur.name === name) { if (cur.el.paused) startCurrent(); return; }
    if (cur) {
      const old = cur.el;
      fade(old, 0, 900, () => { old.pause(); old.src = ''; });
      cur = null;
    }
    const t = TRACKS[name];
    if (!t) return; // ยังไม่มีเพลงนี้ → เงียบ
    const el = new Audio(BASE + t.file);
    el.loop = t.loop !== false;
    el.preload = 'auto';
    el.volume = 0;
    cur = { name, el, vol: t.vol ?? 0.5 };
    startCurrent();
  }

  return {
    play,
    // เรียกเมื่อผู้ใช้แตะ/กดปุ่มครั้งแรก (นโยบาย autoplay ของเบราว์เซอร์)
    unlock() { if (!unlocked && cur && cur.el.paused) startCurrent(); },
    setMuted(m) {
      muted = m;
      try { localStorage.setItem('etd_music_muted', m ? '1' : '0'); } catch (e) { /* ignore */ }
      if (!cur) return;
      if (m) { const el = cur.el; fade(el, 0, 300, () => el.pause()); } else startCurrent(600);
    },
    // ซ่อนแท็บ → หยุดเพลงชั่วคราว
    setHidden(h) {
      hidden = h;
      if (!cur) return;
      if (h) cur.el.pause(); else startCurrent(800);
    },
    setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      try { localStorage.setItem('etd_music_vol', String(volume)); } catch (e) { /* ignore */ }
      if (cur && !cur.el.paused) { if (cur.el._fade) cancelAnimationFrame(cur.el._fade); cur.el.volume = cur.vol * volume; }
    },
    get muted() { return muted; },
    get volume() { return volume; },
    get current() { return cur ? cur.name : null; },
    get element() { return cur ? cur.el : null; },
  };
})();
