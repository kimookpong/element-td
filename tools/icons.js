/* ============================================================
 *  ตัวสร้างไอคอน PNG ของ Element TD
 *  - ไอคอน UI: วาดเวกเตอร์ด้วย canvas (สไตล์ทองมีขอบเข้ม)
 *  - ตราธาตุ: ลูกแก้วเรืองแสงพร้อมสัญลักษณ์
 *  - ภาพป้อม/สัตว์: render จากโมเดล 3D จริงของเกม
 *  ใช้งาน: เปิด /tools/icons.html แล้วสคริปต์ export จะอ่าน window.ICONS
 * ============================================================ */
import * as THREE from 'three';
import { buildCreatureModel } from '../src/creatures.js';
import { buildTowerModel } from '../src/models.js';
import { TOWERS } from '../src/towers.js';

const S = 128;
const ICONS = {};
const PI = Math.PI;

function canvas(size = S) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

/* ---------------- สไตล์ glyph ---------------- */
const PAL = {
  gold: ['#fff4c2', '#f2c14e', '#a8701e'],
  silver: ['#ffffff', '#c9d2e0', '#6f7a8c'],
  red: ['#ffb0b0', '#ff4a5a', '#9a1626'],
  purple: ['#f0d0ff', '#b46aff', '#5a1aa0'],
  blue: ['#e0f4ff', '#58b4ff', '#1a5aa8'],
  green: ['#e0ffd0', '#6fe08a', '#1f7a3a'],
  orange: ['#fff0b0', '#ff9a3a', '#a8400e'],
  mint: ['#e8fff6', '#5affc8', '#178a64'],
  yellow: ['#fffbe0', '#ffe14a', '#b08a10'],
  bone: ['#ffffff', '#efe6cf', '#9a8f74'],
};

// draw(api) เรียก F(path) = รูปทึบ, L(path, w) = เส้น
function glyph(name, pal, draw, opts = {}) {
  const c = canvas();
  const g = c.getContext('2d');
  const ops = [];
  draw({ F: (p, col) => ops.push({ t: 'f', p, col }), L: (p, w = 10, col) => ops.push({ t: 'l', p, w, col }) });
  g.lineJoin = 'round';
  g.lineCap = 'round';
  // เงา/ขอบนอก
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.55)';
  g.shadowBlur = 6;
  g.shadowOffsetY = 3;
  for (const o of ops) {
    g.strokeStyle = '#1e1306';
    if (o.t === 'f') { g.lineWidth = 9; g.stroke(o.p); g.fillStyle = '#1e1306'; g.fill(o.p); }
    else { g.lineWidth = o.w + 9; g.stroke(o.p); }
  }
  g.restore();
  for (const o of ops) {
    const P = PAL[o.col || pal];
    const gr = g.createLinearGradient(0, 14, 0, 114);
    gr.addColorStop(0, P[0]); gr.addColorStop(0.45, P[1]); gr.addColorStop(1, P[2]);
    if (o.t === 'f') { g.fillStyle = gr; g.fill(o.p); }
    else { g.strokeStyle = gr; g.lineWidth = o.w; g.stroke(o.p); }
  }
  // ประกายด้านบน
  if (!opts.noShine) {
    g.save();
    g.globalCompositeOperation = 'source-atop';
    const sh = g.createLinearGradient(0, 0, 0, 64);
    sh.addColorStop(0, 'rgba(255,255,255,0.35)');
    sh.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sh;
    g.fillRect(0, 0, S, 60);
    g.restore();
  }
  if (opts.after) opts.after(g);
  ICONS[name] = c.toDataURL('image/png');
}

const P = () => new Path2D();
function star(cx, cy, ro, ri, n = 5, rot = -PI / 2) {
  const p = P();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? ri : ro;
    const a = rot + (i / (n * 2)) * PI * 2;
    i ? p.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : p.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  p.closePath();
  return p;
}
function circle(cx, cy, r) { const p = P(); p.arc(cx, cy, r, 0, PI * 2); return p; }
function rrect(x, y, w, h, r) { const p = P(); p.roundRect(x, y, w, h, r); return p; }
function P2(pts) { const p = P(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); return p; }
function poly(pts) { const p = P(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); return p; }
function line(pts) { const p = P(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); return p; }
function heartPath(cx = 64, cy = 64, k = 1) {
  const p = P();
  const T = (x, y) => [cx + (x - 64) * k, cy + (y - 64) * k];
  p.moveTo(...T(64, 108));
  p.bezierCurveTo(...T(18, 78), ...T(10, 46), ...T(30, 30));
  p.bezierCurveTo(...T(46, 16), ...T(60, 26), ...T(64, 40));
  p.bezierCurveTo(...T(68, 26), ...T(82, 16), ...T(98, 30));
  p.bezierCurveTo(...T(118, 46), ...T(110, 78), ...T(64, 108));
  p.closePath();
  return p;
}
function flamePath(cx = 64, cy = 64, k = 1) {
  const p = P();
  const T = (x, y) => [cx + (x - 64) * k, cy + (y - 64) * k];
  p.moveTo(...T(64, 112));
  p.bezierCurveTo(...T(30, 110), ...T(24, 80), ...T(38, 60));
  p.bezierCurveTo(...T(44, 72), ...T(50, 74), ...T(52, 70));
  p.bezierCurveTo(...T(46, 48), ...T(56, 28), ...T(70, 14));
  p.bezierCurveTo(...T(70, 34), ...T(84, 44), ...T(90, 56));
  p.bezierCurveTo(...T(94, 50), ...T(96, 46), ...T(96, 40));
  p.bezierCurveTo(...T(110, 60), ...T(108, 108), ...T(64, 112));
  p.closePath();
  return p;
}
function dropPath(cx = 64, cy = 64, k = 1) {
  const p = P();
  const T = (x, y) => [cx + (x - 64) * k, cy + (y - 64) * k];
  p.moveTo(...T(64, 14));
  p.bezierCurveTo(...T(80, 42), ...T(100, 62), ...T(100, 80));
  p.bezierCurveTo(...T(100, 102), ...T(84, 114), ...T(64, 114));
  p.bezierCurveTo(...T(44, 114), ...T(28, 102), ...T(28, 80));
  p.bezierCurveTo(...T(28, 62), ...T(48, 42), ...T(64, 14));
  p.closePath();
  return p;
}
function skullPath(cx = 64, cy = 60, k = 1) {
  const p = P();
  const T = (x, y) => [cx + (x - 64) * k, cy + (y - 60) * k];
  p.moveTo(...T(64, 16));
  p.bezierCurveTo(...T(96, 16), ...T(108, 40), ...T(104, 62));
  p.bezierCurveTo(...T(102, 74), ...T(94, 78), ...T(90, 82));
  p.lineTo(...T(90, 98)); p.lineTo(...T(38, 98)); p.lineTo(...T(38, 82));
  p.bezierCurveTo(...T(34, 78), ...T(26, 74), ...T(24, 62));
  p.bezierCurveTo(...T(20, 40), ...T(32, 16), ...T(64, 16));
  p.closePath();
  return p;
}
function swordPath() {
  const p = P();
  p.moveTo(58, 14); p.lineTo(64, 6); p.lineTo(70, 14); p.lineTo(70, 82); p.lineTo(58, 82); p.closePath();
  return p;
}

/* ---------------- ไอคอน UI ---------------- */
function buildUI() {
  glyph('gold', 'gold', ({ F, L }) => {
    F(circle(64, 66, 46));
    L(circle(64, 66, 34), 4, 'orange');
    F(star(64, 66, 20, 9, 5), 'yellow');
  });
  glyph('heart', 'red', ({ F }) => F(heartPath()));
  glyph('swords', 'silver', ({ F }) => {
    for (const s of [-1, 1]) {
      const m = new DOMMatrix().translate(64, 64).rotate(s * 40).translate(-64, -64);
      const blade = new Path2D(); blade.addPath(swordPath(), m); F(blade);
      const guard = new Path2D(); guard.addPath(rrect(44, 80, 40, 9, 4), m); F(guard, 'gold');
      const grip = new Path2D(); grip.addPath(rrect(59, 88, 10, 20, 3), m); F(grip, 'orange');
      const pom = new Path2D(); pom.addPath(circle(64, 112, 6), m); F(pom, 'gold');
    }
  });
  glyph('essence', 'purple', ({ F, L }) => {
    F(poly([[64, 10], [96, 40], [86, 104], [42, 104], [32, 40]]));
    L(line([[64, 10], [64, 104]]), 3, 'bone');
    L(line([[32, 40], [64, 56], [96, 40]]), 3, 'bone');
  });
  glyph('play', 'gold', ({ F }) => F(poly([[38, 24], [104, 64], [38, 104]])));
  glyph('pause', 'gold', ({ F }) => { F(rrect(34, 24, 22, 80, 6)); F(rrect(72, 24, 22, 80, 6)); });
  glyph('speed', 'gold', ({ F }) => { F(poly([[20, 30], [62, 64], [20, 98]])); F(poly([[62, 30], [104, 64], [62, 98]])); });
  const speaker = () => poly([[18, 50], [40, 50], [66, 26], [66, 102], [40, 78], [18, 78]]);
  glyph('sound', 'gold', ({ F, L }) => {
    F(speaker());
    const a = P(); a.arc(66, 64, 22, -0.8, 0.8); L(a, 8);
    const b = P(); b.arc(66, 64, 40, -0.8, 0.8); L(b, 8);
  });
  glyph('mute', 'gold', ({ F, L }) => {
    F(speaker());
    L(line([[82, 46], [110, 82]]), 9, 'red');
    L(line([[110, 46], [82, 82]]), 9, 'red');
  });
  glyph('quality', 'yellow', ({ F }) => { F(star(60, 66, 46, 12, 4, 0)); F(star(98, 30, 18, 5, 4, 0)); });
  glyph('quality_low', 'yellow', ({ F }) => F(poly([[72, 8], [30, 70], [60, 70], [50, 120], [98, 52], [66, 52]])));
  glyph('camera', 'silver', ({ F }) => {
    F(rrect(14, 40, 72, 52, 10));
    F(poly([[86, 54], [116, 38], [116, 94], [86, 78]]));
    F(circle(36, 30, 14), 'gold'); F(circle(66, 30, 14), 'gold');
  });
  glyph('settings', 'silver', ({ F }) => {
    const pts = [];
    const n = 8;
    for (let i = 0; i < n * 4; i++) {
      const a = (i / (n * 4)) * PI * 2 - PI / 2;
      const r = (i % 4 === 0 || i % 4 === 1) ? 54 : 40;
      pts.push([64 + Math.cos(a) * r, 64 + Math.sin(a) * r]);
    }
    F(poly(pts));
    F(circle(64, 64, 18), 'gold');
  });
  glyph('music', 'purple', ({ F, L }) => {
    F(poly([[46, 24], [104, 12], [104, 30], [46, 42]]));
    L(P2([[46, 30], [46, 92]]), 10);
    L(P2([[104, 20], [104, 80]]), 10);
    F(circle(34, 94, 16)); F(circle(92, 82, 16));
  });
  glyph('music_off', 'silver', ({ F, L }) => {
    F(poly([[46, 24], [104, 12], [104, 30], [46, 42]]));
    L(P2([[46, 30], [46, 92]]), 10);
    L(P2([[104, 20], [104, 80]]), 10);
    F(circle(34, 94, 16)); F(circle(92, 82, 16));
    L(P2([[18, 18], [112, 112]]), 10, 'red');
  });
  glyph('help', 'gold', ({ F }) => F(circle(64, 64, 50)), {
    after: (g) => { g.font = 'bold 76px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#3a2208'; g.fillText('?', 64, 70); },
  });
  const corners = (inward) => {
    const out = [];
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = 64 + sx * 40, cy = 64 + sy * 40;
      const d = inward ? -1 : 1;
      out.push(line([[cx, cy - sy * 26 * d * (inward ? -1 : 1)], [cx, cy], [cx - sx * 26 * (inward ? -1 : 1) * d, cy]]));
    }
    return out;
  };
  glyph('fullscreen', 'gold', ({ L }) => {
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = 64 + sx * 42, cy = 64 + sy * 42;
      L(line([[cx, cy - sy * 26], [cx, cy], [cx - sx * 26, cy]]), 11);
    }
  });
  glyph('fullscreen_exit', 'gold', ({ L }) => {
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = 64 + sx * 18, cy = 64 + sy * 18;
      L(line([[cx, cy + sy * 26], [cx, cy], [cx + sx * 26, cy]]), 11);
    }
  });
  void corners;
  glyph('panel', 'gold', ({ F }) => { for (const y of [28, 58, 88]) F(rrect(20, y, 88, 14, 7)); });
  glyph('save', 'blue', ({ F }) => {
    F(poly([[18, 18], [94, 18], [110, 34], [110, 110], [18, 110]]));
    F(rrect(34, 18, 52, 30, 3), 'silver');
    F(rrect(32, 66, 64, 44, 4), 'bone');
  });
  glyph('trash', 'silver', ({ F }) => {
    F(rrect(20, 26, 88, 14, 5));
    F(rrect(50, 14, 28, 14, 4));
    F(poly([[28, 44], [100, 44], [92, 114], [36, 114]]));
  });
  glyph('lock', 'gold', ({ F, L }) => {
    const a = P(); a.arc(64, 50, 24, PI, 0); L(a, 12, 'silver');
    L(line([[40, 50], [40, 60]]), 12, 'silver'); L(line([[88, 50], [88, 60]]), 12, 'silver');
    F(rrect(26, 56, 76, 58, 10));
    F(circle(64, 82, 8), 'orange');
  });
  glyph('star', 'yellow', ({ F }) => F(star(64, 68, 52, 22)));
  glyph('star_empty', 'silver', ({ L }) => L(star(64, 68, 48, 20), 8), { noShine: true });
  glyph('scroll', 'bone', ({ F }) => {
    F(rrect(26, 24, 76, 82, 6));
    F(rrect(16, 14, 96, 20, 10), 'orange');
    F(rrect(16, 96, 96, 20, 10), 'orange');
  }, { after: (g) => { g.strokeStyle = 'rgba(90,60,20,0.7)'; g.lineWidth = 4; for (const y of [48, 62, 76]) { g.beginPath(); g.moveTo(40, y); g.lineTo(88, y); g.stroke(); } } });
  glyph('trophy', 'gold', ({ F, L }) => {
    F(poly([[30, 16], [98, 16], [92, 56], [78, 72], [50, 72], [36, 56]]));
    const a = P(); a.arc(30, 36, 16, PI * 0.5, PI * 1.5); L(a, 8);
    const b = P(); b.arc(98, 36, 16, -PI * 0.5, PI * 0.5); L(b, 8);
    F(rrect(56, 70, 16, 20, 3)); F(rrect(36, 90, 56, 20, 5));
  });
  glyph('skull', 'bone', ({ F }) => F(skullPath()), {
    after: (g) => { g.fillStyle = '#2a1a10'; for (const x of [46, 82]) { g.beginPath(); g.ellipse(x, 60, 11, 13, 0, 0, PI * 2); g.fill(); } g.beginPath(); g.moveTo(64, 70); g.lineTo(58, 82); g.lineTo(70, 82); g.fill(); },
  });
  glyph('warning', 'orange', ({ F }) => F(poly([[64, 10], [120, 110], [8, 110]])), {
    after: (g) => { g.fillStyle = '#2a1206'; g.fillRect(57, 40, 14, 40); g.beginPath(); g.arc(64, 94, 8, 0, PI * 2); g.fill(); },
  });
  glyph('clock', 'gold', ({ F, L }) => {
    F(circle(64, 64, 50));
    L(line([[64, 64], [64, 32]]), 8, 'orange'); L(line([[64, 64], [88, 74]]), 8, 'orange');
  });
  glyph('hammer', 'silver', ({ F }) => {
    const m = new DOMMatrix().translate(64, 64).rotate(-40).translate(-64, -64);
    const h = new Path2D(); h.addPath(rrect(58, 36, 12, 82, 5), m); F(h, 'orange');
    const head = new Path2D(); head.addPath(rrect(30, 18, 68, 26, 6), m); F(head);
  });
  glyph('upgrade', 'green', ({ F }) => { F(poly([[64, 10], [108, 56], [82, 56], [82, 76], [46, 76], [46, 56], [20, 56]])); F(rrect(46, 86, 36, 12, 4)); F(rrect(46, 104, 36, 12, 4)); });
  glyph('sell', 'gold', ({ F }) => {
    F(poly([[44, 30], [84, 30], [76, 44], [52, 44]]), 'orange');
    const b = P(); b.moveTo(52, 44); b.bezierCurveTo(10, 60, 18, 116, 64, 116); b.bezierCurveTo(110, 116, 118, 60, 76, 44); b.closePath(); F(b, 'orange');
    F(circle(64, 84, 18));
  });
  glyph('target', 'red', ({ L }) => {
    L(circle(64, 64, 42), 8); L(circle(64, 64, 20), 8);
    L(line([[64, 8], [64, 34]]), 8, 'gold'); L(line([[64, 94], [64, 120]]), 8, 'gold');
    L(line([[8, 64], [34, 64]]), 8, 'gold'); L(line([[94, 64], [120, 64]]), 8, 'gold');
  });
  glyph('sign', 'orange', ({ F }) => {
    F(rrect(58, 30, 12, 88, 4), 'orange');
    F(poly([[20, 20], [100, 20], [114, 38], [100, 56], [20, 56]]), 'gold');
    F(poly([[28, 62], [96, 62], [96, 92], [28, 92], [14, 77]]), 'gold');
  });
  glyph('map_maze', 'bone', ({ F, L }) => {
    F(rrect(14, 14, 100, 100, 10), 'silver');
    L(line([[30, 30], [98, 30], [98, 98], [46, 98], [46, 46], [82, 46], [82, 82], [62, 82]]), 9, 'gold');
  });
  glyph('map_lane', 'green', ({ F, L }) => {
    F(rrect(14, 14, 100, 100, 10), 'green');
    L(line([[22, 40], [50, 40], [50, 88], [80, 88], [80, 40], [106, 40]]), 12, 'bone');
  });
  glyph('check', 'green', ({ L }) => L(line([[22, 66], [50, 94], [106, 34]]), 16));
  glyph('plus', 'green', ({ L }) => { L(line([[64, 22], [64, 106]]), 18); L(line([[22, 64], [106, 64]]), 18); });
  glyph('close', 'red', ({ L }) => { L(line([[28, 28], [100, 100]]), 16); L(line([[100, 28], [28, 100]]), 16); });
  glyph('crown', 'gold', ({ F }) => F(poly([[16, 96], [22, 36], [46, 64], [64, 26], [82, 64], [106, 36], [112, 96]])));
  glyph('sparkle', 'yellow', ({ F }) => F(star(64, 64, 54, 12, 4, 0)));
}

/* ---------------- ไอคอนผลพิเศษ ---------------- */
function buildFx() {
  glyph('fx_splash', 'orange', ({ F }) => F(star(64, 64, 56, 26, 9)));
  glyph('fx_burn', 'orange', ({ F }) => F(flamePath()));
  glyph('fx_slow', 'blue', ({ L }) => {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI;
      const dx = Math.cos(a) * 50, dy = Math.sin(a) * 50;
      L(line([[64 - dx, 64 - dy], [64 + dx, 64 + dy]]), 9);
      for (const s of [-1, 1]) {
        const bx = 64 + dx * 0.6 * s, by = 64 + dy * 0.6 * s;
        L(line([[bx + Math.cos(a + 2.4) * 14 * s, by + Math.sin(a + 2.4) * 14 * s], [bx, by], [bx + Math.cos(a - 2.4) * 14 * s, by + Math.sin(a - 2.4) * 14 * s]]), 6);
      }
    }
  });
  glyph('fx_stun', 'yellow', ({ F, L }) => {
    const sp = P(); for (let i = 0; i <= 40; i++) { const a = i * 0.32; const r = 4 + i * 0.9; i ? sp.lineTo(64 + Math.cos(a) * r, 70 + Math.sin(a) * r * 0.6) : sp.moveTo(64, 70); } L(sp, 6, 'silver');
    F(star(26, 30, 16, 7)); F(star(100, 34, 14, 6)); F(star(64, 16, 12, 5));
  });
  glyph('fx_multi', 'green', ({ F, L }) => {
    for (const a of [-0.5, 0, 0.5]) {
      const m = new DOMMatrix().translate(64, 112).rotate((a * 180) / PI).translate(-64, -112);
      const sh = new Path2D(); sh.addPath(line([[64, 108], [64, 34]]), m); L(sh, 7, 'orange');
      const hd = new Path2D(); hd.addPath(poly([[64, 12], [78, 38], [50, 38]]), m); F(hd, 'silver');
    }
  });
  glyph('fx_knock', 'mint', ({ L }) => {
    const a = P(); a.moveTo(14, 44); a.bezierCurveTo(60, 44, 90, 40, 90, 24); a.bezierCurveTo(90, 12, 74, 12, 72, 24); L(a, 9);
    const b = P(); b.moveTo(14, 70); b.bezierCurveTo(70, 70, 110, 66, 110, 50); b.bezierCurveTo(110, 38, 94, 38, 92, 50); L(b, 9);
    const c = P(); c.moveTo(14, 96); c.bezierCurveTo(50, 96, 80, 100, 80, 110); L(c, 9);
  });
  glyph('fx_pierce', 'yellow', ({ F, L }) => {
    L(line([[12, 100], [96, 32]]), 12);
    F(poly([[118, 14], [88, 24], [104, 40]]), 'silver');
    F(circle(40, 78, 12), 'red'); F(circle(68, 55, 12), 'red');
  });
  glyph('fx_curse', 'purple', ({ F }) => F(skullPath(64, 62, 0.95)), {
    after: (g) => { g.fillStyle = '#1a0a2a'; for (const x of [47, 81]) { g.beginPath(); g.ellipse(x, 62, 10, 12, 0, 0, PI * 2); g.fill(); } g.fillStyle = '#e8a0ff'; for (const x of [47, 81]) { g.beginPath(); g.arc(x, 63, 4, 0, PI * 2); g.fill(); } },
  });
  glyph('fx_percent', 'red', ({ F }) => F(dropPath()), {
    after: (g) => { g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff0f0'; g.fillText('%', 64, 84); },
  });
}

/* ---------------- ตราธาตุ ---------------- */
const EL = {
  fire: { c: ['#fff0a0', '#ff6a1e', '#7a1a04'], sym: (g) => { g.fill(flamePath(64, 66, 0.62)); } },
  water: { c: ['#e0f6ff', '#2f8fff', '#0a2a7a'], sym: (g) => { g.fill(dropPath(64, 66, 0.6)); } },
  earth: { c: ['#ffe8b0', '#c08a42', '#4a2a10'], sym: (g) => { g.fill(poly([[24, 92], [52, 46], [64, 60], [80, 36], [106, 92]])); } },
  wind: { c: ['#e8fff6', '#2fd8a0', '#0a5a40'], sym: (g) => {
    g.lineWidth = 8; g.lineCap = 'round';
    for (const [y, w] of [[48, 44], [66, 54], [84, 36]]) { g.beginPath(); g.moveTo(64 - w / 2 - 6, y); g.bezierCurveTo(64, y - 6, 64 + w / 2, y + 8, 64 + w / 2 + 6, y - 6); g.stroke(); }
  } },
  light: { c: ['#ffffff', '#ffd83a', '#9a6a00'], sym: (g) => { g.fill(star(64, 64, 34, 13, 8)); } },
  dark: { c: ['#e8c8ff', '#8a3dff', '#1a0640'], sym: (g) => { const p = P(); p.arc(64, 64, 30, 0, PI * 2); p.arc(78, 56, 26, 0, PI * 2, true); g.fill(p, 'evenodd'); } },
};
function buildElements() {
  for (const [name, d] of Object.entries(EL)) {
    const c = canvas();
    const g = c.getContext('2d');
    // แสงรอบ
    const halo = g.createRadialGradient(64, 64, 30, 64, 64, 64);
    halo.addColorStop(0, d.c[1] + 'aa'); halo.addColorStop(1, d.c[1] + '00');
    g.fillStyle = halo; g.fillRect(0, 0, S, S);
    // ลูกแก้ว
    const orb = g.createRadialGradient(48, 42, 4, 64, 64, 50);
    orb.addColorStop(0, d.c[0]); orb.addColorStop(0.45, d.c[1]); orb.addColorStop(1, d.c[2]);
    g.fillStyle = orb; g.beginPath(); g.arc(64, 64, 48, 0, PI * 2); g.fill();
    // ขอบทอง
    const rim = g.createLinearGradient(0, 16, 0, 112);
    rim.addColorStop(0, '#fff4c2'); rim.addColorStop(0.5, '#e2b048'); rim.addColorStop(1, '#8a5a14');
    g.strokeStyle = rim; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 49, 0, PI * 2); g.stroke();
    // สัญลักษณ์
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 6; g.shadowOffsetY = 2;
    g.fillStyle = 'rgba(255,255,255,0.95)'; g.strokeStyle = 'rgba(255,255,255,0.95)';
    d.sym(g);
    g.restore();
    // ประกาย
    g.fillStyle = 'rgba(255,255,255,0.45)';
    g.beginPath(); g.ellipse(48, 36, 18, 9, -0.5, 0, PI * 2); g.fill();
    ICONS['el_' + name] = c.toDataURL('image/png');
  }
}

/* ---------------- ภาพจากโมเดล 3D ---------------- */
async function buildPortraits() {
  const size = 256;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(size, size);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404060, 1.4));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.4);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xa0c8ff, 1.2);
  rim.position.set(-4, 2, -3);
  scene.add(rim);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  const down = canvas();
  const dg = down.getContext('2d');

  const shoot = (name, obj, { yaw = 0.6, pitch = 0.32, fill = 1.0 } = {}) => {
    scene.add(obj);
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const center = box.getCenter(new THREE.Vector3());
    const sz = box.getSize(new THREE.Vector3());
    const r = Math.max(sz.x, sz.y, sz.z) * 0.62 / fill;
    const d = r / Math.tan((cam.fov * PI) / 360);
    cam.position.set(center.x + Math.sin(yaw) * Math.cos(pitch) * d, center.y + Math.sin(pitch) * d, center.z + Math.cos(yaw) * Math.cos(pitch) * d);
    cam.lookAt(center);
    renderer.render(scene, cam);
    dg.clearRect(0, 0, S, S);
    dg.imageSmoothingQuality = 'high';
    dg.drawImage(renderer.domElement, 0, 0, S, S);
    ICONS[name] = down.toDataURL('image/png');
    scene.remove(obj);
  };

  const creatures = [
    ['wolf', 'normal', 'water'], ['unicorn', 'fast', 'light'], ['turtle', 'armored', 'earth'], ['hydra', 'regen', 'wind'],
    ['kitsune', 'split', 'fire'], ['phoenix', 'undead', 'fire'], ['griffin', 'flying', 'water'], ['dragon', 'boss', 'dark'],
  ];
  for (const [name, ability, element] of creatures) {
    const m = buildCreatureModel({ ability, element, size: 12 });
    m.anim(0.016, 1.3, 1);
    m.group.children.forEach((ch) => { if (ch.geometry && ch.geometry.type === 'TorusGeometry') ch.visible = false; });
    // หันหน้าไปทางกล้อง (+X ของโมเดล = ด้านหน้า)
    m.group.rotation.y = 0.9;
    shoot('c_' + name, m.group, { yaw: 0, pitch: 0.25, fill: 1.22 });
  }
  // ป้อมพื้นฐาน + ป้อมธาตุทั้ง 25 แบบ (ระดับสูงสุด) · x_* = ภาพตรวจระดับ ไม่ถูกบันทึกเป็นไฟล์
  const towers = [
    ['arrow', { kind: 'basic', base: 'arrow', elements: [], tier: 2 }], ['cannon', { kind: 'basic', base: 'cannon', elements: [], tier: 2 }],
    ...Object.keys(TOWERS).map((k) => {
      const els = k.split('+');
      return [k.replace(/\+/g, '_'), { kind: 'element', elements: els, tier: els.length === 3 ? 2 : 3 }];
    }),
  ];
  if (new URLSearchParams(location.search).has('tiers')) {
    for (const e of ['light', 'dark', 'water', 'fire', 'wind', 'earth']) for (const tier of [1, 2]) towers.push([`x_${e}_${tier}`, { kind: 'element', elements: [e], tier }]);
  }
  for (const [name, t] of towers) {
    const m = buildTowerModel(t);
    for (const a of m.anims) a(1.2, 0.016, 0);
    m.aim.rotation.y = -0.6;
    shoot(name.startsWith('x_') ? name : 't_' + name, m.group, { yaw: 0.5, pitch: 0.42, fill: 1.12 });
  }
  renderer.dispose();
}

/* ---------------- รันทั้งหมด ---------------- */
async function main() {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  buildUI();
  buildFx();
  buildElements();
  await buildPortraits();
  const grid = document.getElementById('grid');
  for (const [name, url] of Object.entries(ICONS)) {
    const f = document.createElement('figure');
    f.innerHTML = `<img src="${url}"><figcaption>${name}</figcaption>`;
    grid.appendChild(f);
  }
  window.ICONS = ICONS;
  window.ICONS_READY = true;
}
main();
