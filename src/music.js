/* ============================================================
 *  เพลงประกอบ (ไฟล์ใน public/music) — เล่นวนซ้ำ เฟดข้ามเพลง
 *  เพิ่มเพลงใหม่: ใส่ไฟล์ใน public/music แล้วเพิ่มชื่อใน TRACKS
 *  ชื่อเพลงที่เกมเรียกใช้: menu · <id แผนที่> (meadow/ruins/canyon/spiral) · boss · victory · defeat
 * ============================================================ */
const BASE = `${import.meta.env.BASE_URL}music/`;

export const TRACKS = {
  menu: { file: 'main-theme.mp3', vol: 0.5 },
};

export const Music = (() => {
  let muted = false;
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
      p.then(() => { unlocked = true; fade(el, vol, ms); }).catch(() => { /* รอผู้ใช้แตะหน้าจอก่อน */ });
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
      if (!cur) return;
      if (m) { const el = cur.el; fade(el, 0, 300, () => el.pause()); } else startCurrent(600);
    },
    // ซ่อนแท็บ → หยุดเพลงชั่วคราว
    setHidden(h) {
      hidden = h;
      if (!cur) return;
      if (h) cur.el.pause(); else startCurrent(800);
    },
    get current() { return cur ? cur.name : null; },
    get element() { return cur ? cur.el : null; },
  };
})();
