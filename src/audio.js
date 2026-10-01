/* เสียงเอฟเฟกต์สังเคราะห์ด้วย WebAudio (ไม่ต้องโหลดไฟล์เสียง) */
export const Sound = (() => {
  let ctx = null;
  let master = null;
  let muted = false;
  const lastPlay = {};

  try { muted = localStorage.getItem('etd_muted') === '1'; } catch (e) { /* ignore */ }

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
    return ctx;
  }

  function tone({ freq = 440, to = null, dur = 0.12, type = 'sine', vol = 1, noise = false }) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    g.connect(master);
    if (noise) {
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = freq;
      src.connect(f);
      f.connect(g);
      src.start(t);
      return;
    }
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    o.connect(g);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  const presets = {
    fire:    () => tone({ freq: 900, dur: 0.18, noise: true, vol: 0.7 }),
    water:   () => tone({ freq: 700, to: 300, dur: 0.12, type: 'sine', vol: 0.6 }),
    earth:   () => tone({ freq: 140, to: 60, dur: 0.2, type: 'triangle', vol: 1 }),
    wind:    () => tone({ freq: 2400, dur: 0.05, noise: true, vol: 0.35 }),
    light:   () => tone({ freq: 1200, to: 1800, dur: 0.15, type: 'sine', vol: 0.4 }),
    dark:    () => tone({ freq: 220, to: 110, dur: 0.2, type: 'sawtooth', vol: 0.3 }),
    build:   () => tone({ freq: 440, to: 880, dur: 0.12, type: 'square', vol: 0.35 }),
    upgrade: () => { tone({ freq: 523, dur: 0.1, type: 'square', vol: 0.3 }); setTimeout(() => tone({ freq: 784, dur: 0.15, type: 'square', vol: 0.3 }), 90); },
    fuse:    () => { [392, 523, 659, 784].forEach((f, i) => setTimeout(() => tone({ freq: f, dur: 0.2, type: 'triangle', vol: 0.5 }), i * 80)); },
    sell:    () => tone({ freq: 660, to: 330, dur: 0.15, type: 'square', vol: 0.3 }),
    leak:    () => tone({ freq: 200, to: 80, dur: 0.35, type: 'sawtooth', vol: 0.6 }),
    wave:    () => { tone({ freq: 330, dur: 0.15, type: 'triangle', vol: 0.5 }); setTimeout(() => tone({ freq: 495, dur: 0.25, type: 'triangle', vol: 0.5 }), 140); },
    boss:    () => tone({ freq: 90, to: 45, dur: 0.9, type: 'sawtooth', vol: 0.8 }),
    error:   () => tone({ freq: 150, dur: 0.12, type: 'square', vol: 0.3 }),
    win:     () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone({ freq: f, dur: 0.3, type: 'triangle', vol: 0.5 }), i * 150)); },
    lose:    () => { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone({ freq: f, dur: 0.35, type: 'triangle', vol: 0.5 }), i * 200)); },
  };

  return {
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    play(name, throttleMs = 0) {
      if (muted || !ctx || !presets[name]) return;
      const now = performance.now();
      if (throttleMs && lastPlay[name] && now - lastPlay[name] < throttleMs) return;
      lastPlay[name] = now;
      presets[name]();
    },
    toggle() {
      muted = !muted;
      try { localStorage.setItem('etd_muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
      return muted;
    },
    get muted() { return muted; },
  };
})();
