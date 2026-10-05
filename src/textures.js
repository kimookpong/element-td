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
      desert: { base: '#e0bf78', pal: ['#d4b06a', '#e8c987', '#f0d494', '#c9a45e', '#dcb874', '#ecd09a'], blot: ['#f2d79e', '#c49c58'] },
      volcano: { base: '#2e2624', pal: ['#3a302c', '#262020', '#443834', '#1e1a1a'], blot: ['#4a3a32', '#181414'] },
      river: { base: '#4f9a3a', pal: ['#3f8a2a', '#5fb046', '#6fc252', '#357a24', '#7ad35a', '#4a9a34'], blot: ['#6abf4a', '#2f6a20'] },
      sky: { base: '#dfe9fb', pal: ['#ffffff', '#d2def4', '#eef4ff', '#c2d2ee'], blot: ['#ffffff', '#b8cae8'] },
      cave: { base: '#4a3e32', pal: ['#56483a', '#3e3328', '#625240', '#3a3026'], blot: ['#6a5a46', '#2e261e'] },
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
    if (tint === 'volcano') {
      // หินบะซอลต์ + รอยแตกเรืองแสงลาวา
      for (let i = 0; i < 3000; i++) { g.fillStyle = P.pal[Math.floor(rnd() * P.pal.length)]; g.fillRect(rnd() * size, rnd() * size, 2, 2); }
      for (let i = 0; i < 26; i++) {
        let x = rnd() * size, y = rnd() * size;
        g.strokeStyle = rnd() < 0.5 ? 'rgba(255,110,30,0.55)' : 'rgba(255,170,60,0.35)';
        g.lineWidth = 1 + rnd() * 2;
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 5; k++) { x += (rnd() - 0.5) * 50; y += (rnd() - 0.5) * 50; g.lineTo(x, y); }
        g.stroke();
      }
      return toTexture(c);
    }
    if (tint === 'sky') {
      // ผิวเมฆนุ่ม ๆ
      for (let i = 0; i < 160; i++) {
        const x = rnd() * size, y = rnd() * size, r = 12 + rnd() * 40;
        wrapped(size, x, y, r, (px, py) => {
          const gr = g.createRadialGradient(px, py - r * 0.3, 0, px, py, r);
          gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.7, 'rgba(235,242,255,0.5)'); gr.addColorStop(1, 'rgba(200,215,240,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill();
        });
      }
      return toTexture(c);
    }
    if (tint === 'cave') {
      // ดินถ้ำ + กรวด
      for (let i = 0; i < 5000; i++) { g.fillStyle = P.pal[Math.floor(rnd() * P.pal.length)]; g.globalAlpha = 0.6 + rnd() * 0.4; g.fillRect(rnd() * size, rnd() * size, 2, 2); }
      g.globalAlpha = 1;
      for (let i = 0; i < 90; i++) {
        const x = rnd() * size, y = rnd() * size, r = 2 + rnd() * 5;
        g.fillStyle = rnd() < 0.5 ? '#5e5044' : '#2a221c';
        wrapped(size, x, y, r, (px, py) => { g.beginPath(); g.ellipse(px, py, r, r * 0.7, rnd() * 3, 0, Math.PI * 2); g.fill(); });
      }
      return toTexture(c);
    }
    if (tint === 'desert') {
      // ระลอกทรายจากลม + เม็ดทราย
      for (let i = 0; i < 260; i++) {
        const x = rnd() * size, y = rnd() * size, len = 30 + rnd() * 70;
        g.strokeStyle = rnd() < 0.5 ? 'rgba(170,125,60,0.28)' : 'rgba(255,240,200,0.35)';
        g.lineWidth = 1.5 + rnd() * 1.5;
        wrapped(size, x, y, len, (px, py) => {
          g.beginPath(); g.moveTo(px, py);
          g.bezierCurveTo(px + len * 0.3, py - 6, px + len * 0.6, py + 6, px + len, py);
          g.stroke();
        });
      }
      for (let i = 0; i < 6000; i++) {
        g.fillStyle = P.pal[Math.floor(rnd() * P.pal.length)];
        g.globalAlpha = 0.5 + rnd() * 0.5;
        g.fillRect(rnd() * size, rnd() * size, 1.5, 1.5);
      }
      g.globalAlpha = 1;
      return toTexture(c);
    }
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
    if (tint !== 'canyon' && tint !== 'night' && tint !== 'river') {
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
      sandstone: { mortar: '#9a7a4a', hue: 40, sat: 42, lmin: 60, lmax: 76 },
      basalt: { mortar: '#1a1210', hue: 12, sat: 10, lmin: 18, lmax: 30 },
      cloud: { mortar: '#7a8cb0', hue: 215, sat: 30, lmin: 64, lmax: 80 },
      cave: { mortar: '#2a221c', hue: 28, sat: 16, lmin: 34, lmax: 50 },
      mossy: { mortar: '#3a4a30', hue: 95, sat: 12, lmin: 36, lmax: 52 },
      night: { mortar: '#26283c', hue: 235, sat: 12, lmin: 32, lmax: 48 },
    }[tint];
    const size = 512;
    const c = canvas(size);
    const g = c.getContext('2d');
    const rnd = seeded(97 + tint.length);
    g.fillStyle = P.mortar;
    g.fillRect(0, 0, size, size);
    // Hand-cut flagstones: narrow joints, chipped corners and fine mineral veins.
    const rows = 8, h = size / rows, w = size / 4;
    for (let row = 0; row < rows; row++) for (let col = -1; col < 5; col++) {
      const x = col * w + (row % 2) * w / 2, y = row * h;
      const inset = 2.5, chip = 4 + rnd() * 5;
      const l = (P.lmin + P.lmax) / 2 + (rnd() - 0.5) * 7;
      const verts = [[inset + chip,inset],[w-inset-chip,inset],[w-inset,inset+chip],
        [w-inset,h-inset-chip],[w-inset-chip,h-inset],[inset+chip,h-inset],[inset,h-inset-chip],[inset,inset+chip]];
      wrapped(size, x + w / 2, y + h / 2, w, (cx, cy) => {
        const px = cx - w / 2, py = cy - h / 2;
        g.beginPath();
        verts.forEach(([vx,vy],i) => i ? g.lineTo(px+vx,py+vy) : g.moveTo(px+vx,py+vy));
        g.closePath();
        g.fillStyle = `hsl(${P.hue},${P.sat}%,${l}%)`; g.fill();
        g.save(); g.clip();
        const gr = g.createLinearGradient(px,py,px+w,py+h);
        gr.addColorStop(0,'rgba(255,255,255,0.12)'); gr.addColorStop(1,'rgba(0,0,0,0.12)');
        g.fillStyle=gr; g.fillRect(px,py,w,h);
        for(let v=0;v<3;v++) {
          g.strokeStyle='rgba(235,225,210,0.07)'; g.lineWidth=0.8;
          g.beginPath(); g.moveTo(px+v*37,py);
          g.bezierCurveTo(px+20+v*26,py+18,px+50+v*19,py+30,px+v*36+30,py+h); g.stroke();
        }
        g.restore();
        g.strokeStyle='rgba(15,20,26,0.2)'; g.lineWidth=1; g.stroke();
      });
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
      sandstone: { mortar: '#8a6a3e', hue: 38, sat: 45, lmin: 56, lmax: 72 },
      basalt: { mortar: '#ff5a1a', hue: 10, sat: 8, lmin: 16, lmax: 26 },
      cloud: { mortar: '#a8b8d8', hue: 220, sat: 25, lmin: 80, lmax: 92 },
      cave: { mortar: '#16120e', hue: 25, sat: 12, lmin: 22, lmax: 34 },
      mossy: { mortar: '#2a3a22', hue: 90, sat: 14, lmin: 32, lmax: 46 },
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

/* Fine surface structure for the new sculpted models. Shared, neutral-color maps. */
export function surfaceTexture(kind = 'stone') {
  return memo(`surface-${kind}`, () => {
    const c = canvas(256), g = c.getContext('2d'), rnd = seeded(853 + kind.length * 17);
    g.fillStyle = '#dedbd4'; g.fillRect(0, 0, 256, 256);
    for(let i=0;i<5500;i++) {
      const a=0.035+rnd()*0.07;g.fillStyle=rnd()<0.5?`rgba(15,22,30,${a})`:`rgba(255,255,255,${a})`;
      g.fillRect(rnd()*256,rnd()*256,0.6+rnd()*2.2,0.6+rnd()*2.2);
    }
    for(let k=0;k<24;k++) {
      g.strokeStyle=kind==='wood'?'rgba(60,33,15,0.15)':'rgba(255,255,255,0.1)';
      g.lineWidth=kind==='metal'?0.4:0.9;g.beginPath();
      const x=k/24*256;g.moveTo(x,0);
      g.bezierCurveTo(x+Math.sin(k)*18,80,x-Math.cos(k)*16,175,x,256);g.stroke();
    }
    return toTexture(c);
  });
}
