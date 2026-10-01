/* ============================================================
 *  พื้นผิวแบบ procedural (วาดด้วย canvas) — ไม่ต้องโหลดไฟล์ภาพ
 *  ทุกพื้นผิวต่อกันได้ไร้รอยต่อ (tileable)
 * ============================================================ */
import * as THREE from 'three';

const cache = new Map();

function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

// วาดซ้ำที่ขอบเพื่อให้ต่อกันได้
function wrapped(size, x, y, r, fn) {
  for (const dx of [-size, 0, size]) {
    for (const dy of [-size, 0, size]) {
      const px = x + dx, py = y + dy;
      if (px + r < 0 || px - r > size || py + r < 0 || py - r > size) continue;
      fn(px, py);
    }
  }
}

function toTexture(c, { repeat = 1, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function memo(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

/* หญ้า */
export function grassTexture(tint = 'meadow') {
  return memo(`grass-${tint}`, () => {
    const P = {
      meadow: { base: '#5d9b35', pal: ['#4a8a26', '#6db23c', '#7fc548', '#3f7a22', '#8fd352', '#5a9a30'], blot: ['#7bbf45', '#3f7424'] },
      ruins: { base: '#5a9433', pal: ['#478524', '#69ab3a', '#7bbf44', '#3d7521', '#8bcb4d', '#6a9d2e'], blot: ['#86c24c', '#3a6e22'] },
      canyon: { base: '#a58a45', pal: ['#8f7a3a', '#b89a50', '#c7a85c', '#7d6a33', '#9aa048', '#b08f45'], blot: ['#c9ac62', '#7a6430'] },
      night: { base: '#2d4a52', pal: ['#26424a', '#35585f', '#3e6670', '#1f3a40', '#46707a', '#2f4f58'], blot: ['#43707a', '#1c343a'] },
    }[tint];
    const size = 512;
    const c = canvas(size);
    const g = c.getContext('2d');
    const rnd = seeded(tint.length * 1337);
    g.fillStyle = P.base;
    g.fillRect(0, 0, size, size);
    for (let i = 0; i < 70; i++) {
      const x = rnd() * size, y = rnd() * size, r = 30 + rnd() * 80;
      const col = P.blot[i % 2];
      wrapped(size, x, y, r, (px, py) => {
        const gr = g.createRadialGradient(px, py, 0, px, py, r);
        gr.addColorStop(0, col + '55');
        gr.addColorStop(1, col + '00');
        g.fillStyle = gr;
        g.fillRect(px - r, py - r, r * 2, r * 2);
      });
    }
    g.lineCap = 'round';
    for (let i = 0; i < 9000; i++) {
      const x = rnd() * size, y = rnd() * size;
      const len = 3 + rnd() * 8;
      const a = -Math.PI / 2 + (rnd() - 0.5) * 1.2;
      g.strokeStyle = P.pal[Math.floor(rnd() * P.pal.length)];
      g.globalAlpha = 0.55 + rnd() * 0.4;
      g.lineWidth = 1 + rnd() * 1.2;
      wrapped(size, x, y, len, (px, py) => {
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len);
        g.stroke();
      });
    }
    g.globalAlpha = 1;
    if (tint !== 'canyon' && tint !== 'night') {
      const fl = ['#ffffff', '#ffe46a', '#ff9ec7', '#c9a2ff'];
      for (let i = 0; i < 40; i++) {
        const x = rnd() * size, y = rnd() * size;
        g.fillStyle = fl[i % fl.length];
        wrapped(size, x, y, 3, (px, py) => { g.beginPath(); g.arc(px, py, 1.6 + rnd(), 0, Math.PI * 2); g.fill(); });
      }
    }
    return toTexture(c);
  });
}

/* หินปูถนน (cobblestone) */
export function cobbleTexture(tint = 'stone') {
  return memo(`cobble-${tint}`, () => {
    const P = {
      stone: { mortar: '#5a534b', hue: 30, sat: 7, lmin: 36, lmax: 56 },
      sand: { mortar: '#7a6646', hue: 35, sat: 22, lmin: 48, lmax: 66 },
      night: { mortar: '#26283c', hue: 235, sat: 12, lmin: 32, lmax: 48 },
    }[tint];
    const size = 512;
    const c = canvas(size);
    const g = c.getContext('2d');
    const rnd = seeded(97 + tint.length);
    g.fillStyle = P.mortar;
    g.fillRect(0, 0, size, size);
    const n = 6;
    const cell = size / n;
    for (let gy = 0; gy < n; gy++) {
      for (let gx = 0; gx < n; gx++) {
        const cx = (gx + 0.5 + (gy % 2) * 0.5 + (rnd() - 0.5) * 0.25) * cell;
        const cy = (gy + 0.5 + (rnd() - 0.5) * 0.25) * cell;
        const rad = cell * (0.5 + rnd() * 0.06);
        const verts = [];
        const k = 8 + Math.floor(rnd() * 3);
        for (let v = 0; v < k; v++) {
          const a = (v / k) * Math.PI * 2 + rnd() * 0.3;
          const rr = rad * (0.82 + rnd() * 0.22);
          verts.push([Math.cos(a) * rr * 1.08, Math.sin(a) * rr * (0.82 + rnd() * 0.18)]);
        }
        const l = P.lmin + rnd() * (P.lmax - P.lmin);
        const fill = `hsl(${P.hue + (rnd() - 0.5) * 16}, ${P.sat}%, ${l}%)`;
        wrapped(size, cx, cy, rad, (px, py) => {
          g.beginPath();
          verts.forEach(([vx, vy], i) => (i ? g.lineTo(px + vx, py + vy) : g.moveTo(px + vx, py + vy)));
          g.closePath();
          g.fillStyle = fill;
          g.fill();
          const gr = g.createRadialGradient(px - rad * 0.35, py - rad * 0.35, 1, px, py, rad * 1.1);
          gr.addColorStop(0, 'rgba(255,255,255,0.22)');
          gr.addColorStop(0.6, 'rgba(255,255,255,0)');
          gr.addColorStop(1, 'rgba(0,0,0,0.28)');
          g.fillStyle = gr;
          g.fill();
          g.strokeStyle = 'rgba(0,0,0,0.35)';
          g.lineWidth = 2;
          g.stroke();
        });
      }
    }
    // จุดสีเล็ก ๆ ให้ดูมีพื้นผิว
    for (let i = 0; i < 4000; i++) {
      g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)';
      g.fillRect(rnd() * size, rnd() * size, 1.5, 1.5);
    }
    // ตะไคร่น้ำตามร่อง
    if (tint === 'stone') {
      for (let i = 0; i < 160; i++) {
        const x = rnd() * size, y = rnd() * size;
        g.fillStyle = `rgba(90,140,50,${0.15 + rnd() * 0.2})`;
        wrapped(size, x, y, 6, (px, py) => { g.beginPath(); g.arc(px, py, 2 + rnd() * 4, 0, Math.PI * 2); g.fill(); });
      }
    }
    return toTexture(c);
  });
}

/* อิฐหินสำหรับกำแพง */
export function brickTexture(tint = 'stone') {
  return memo(`brick-${tint}`, () => {
    const P = {
      stone: { mortar: '#3c3632', hue: 28, sat: 8, lmin: 34, lmax: 50 },
      sand: { mortar: '#5c4a34', hue: 30, sat: 25, lmin: 45, lmax: 62 },
      night: { mortar: '#1d1e2e', hue: 235, sat: 12, lmin: 26, lmax: 40 },
    }[tint];
    const size = 512;
    const c = canvas(size);
    const g = c.getContext('2d');
    const rnd = seeded(31 + tint.length);
    g.fillStyle = P.mortar;
    g.fillRect(0, 0, size, size);
    const rows = 8;
    const h = size / rows;
    for (let r = 0; r < rows; r++) {
      let x = r % 2 ? -64 : 0;
      while (x < size) {
        const w = 96 + Math.floor(rnd() * 64);
        const l = P.lmin + rnd() * (P.lmax - P.lmin);
        g.fillStyle = `hsl(${P.hue + (rnd() - 0.5) * 12}, ${P.sat}%, ${l}%)`;
        const bx = x + 3, by = r * h + 3, bw = w - 6, bh = h - 6;
        for (const dx of [0, size]) {
          g.fillRect(bx - dx, by, bw, bh);
          const gr = g.createLinearGradient(0, by, 0, by + bh);
          gr.addColorStop(0, 'rgba(255,255,255,0.15)');
          gr.addColorStop(1, 'rgba(0,0,0,0.25)');
          g.fillStyle = gr;
          g.fillRect(bx - dx, by, bw, bh);
          g.fillStyle = `hsl(${P.hue}, ${P.sat}%, ${l}%)`;
        }
        x += w;
      }
    }
    for (let i = 0; i < 5000; i++) {
      g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.07)';
      g.fillRect(rnd() * size, rnd() * size, 2, 2);
    }
    if (tint === 'stone') {
      for (let i = 0; i < 90; i++) {
        g.fillStyle = `rgba(80,130,45,${0.2 + rnd() * 0.25})`;
        const x = rnd() * size, y = rnd() * size;
        g.beginPath(); g.ellipse(x, y, 4 + rnd() * 10, 2 + rnd() * 4, 0, 0, Math.PI * 2); g.fill();
      }
    }
    return toTexture(c);
  });
}

/* วงเวทย์รูน (โปร่งใส ใช้กับวัสดุแบบ additive) */
export function runeTexture() {
  return memo('rune', () => {
    const size = 256;
    const c = canvas(size);
    const g = c.getContext('2d');
    const m = size / 2;
    g.strokeStyle = '#fff';
    g.lineWidth = 4;
    g.beginPath(); g.arc(m, m, 118, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 2;
    g.beginPath(); g.arc(m, m, 100, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(m, m, 56, 0, Math.PI * 2); g.stroke();
    // ดาวหกแฉก
    g.lineWidth = 3;
    for (let k = 0; k < 2; k++) {
      g.beginPath();
      for (let i = 0; i <= 3; i++) {
        const a = (i / 3) * Math.PI * 2 + k * Math.PI / 3 - Math.PI / 2;
        const x = m + Math.cos(a) * 96, y = m + Math.sin(a) * 96;
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.stroke();
    }
    // อักษรรูนรอบวง
    const rnd = seeded(7);
    g.lineWidth = 2.5;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.save();
      g.translate(m + Math.cos(a) * 109, m + Math.sin(a) * 109);
      g.rotate(a + Math.PI / 2);
      g.beginPath();
      for (let s = 0; s < 3; s++) {
        g.moveTo((rnd() - 0.5) * 10, (rnd() - 0.5) * 10);
        g.lineTo((rnd() - 0.5) * 10, (rnd() - 0.5) * 10);
      }
      g.stroke();
      g.restore();
    }
    const t = toTexture(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/* จุดแสงฟุ้ง สำหรับ sprite */
export function glowTexture() {
  return memo('glow', () => {
    const size = 128;
    const c = canvas(size);
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    const t = toTexture(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/* ป้ายตัวเลข/ข้อความบน canvas */
export function labelTexture(text, color = '#ffe680') {
  return memo(`label-${text}-${color}`, () => {
    const c = canvas(128);
    const g = c.getContext('2d');
    g.font = 'bold 84px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 10;
    g.strokeStyle = 'rgba(0,0,0,0.7)';
    g.strokeText(text, 64, 68);
    g.fillStyle = color;
    g.fillText(text, 64, 68);
    const t = toTexture(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}
