/* ============================================================
 *  สร้างโลโก้ Element TD (canvas 1024×1024 พื้นโปร่งใส)
 *  องค์ประกอบ: วงโค้งลูกแก้วธาตุ 6 ธาตุ · หอคอยหิน · เกาะลอยฟ้า
 *               ตัวอักษร ELEMENT ลายหิน + TD สีทอง
 *  ใช้: node tools/export-logo.cjs  → public/logo.png, public/logo-256.png
 * ============================================================ */
const S = 1024;
const PI = Math.PI;
const cv = document.getElementById('c');
const g = cv.getContext('2d');

// สุ่มแบบกำหนด seed เพื่อให้ได้ภาพเดิมทุกครั้ง
let seed = 20261001;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const R = (a, b) => a + rnd() * (b - a);

const ELEMENTS = [ // ลำดับตามวงจรธาตุ: ลม → ดิน → แสง → มืด → น้ำ → ไฟ
  ['wind', '#3fe0a8'], ['earth', '#e0a050'], ['light', '#ffd84a'], ['dark', '#a24dff'], ['water', '#3a9bff'], ['fire', '#ff5a2a'],
];

const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

function poly(pts) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }

/* ---------------- ลูกแก้วธาตุ + สายพลัง ---------------- */
function orbPositions() {
  const cx = 512, cy = 446, r = 352;
  return ELEMENTS.map(([name, col], i) => {
    const a = ((165 - i * 30) * PI) / 180;
    return { name, col, x: cx + Math.cos(a) * r, y: cy - Math.sin(a) * r, a };
  });
}

function drawRibbons(orbs) {
  g.save();
  g.lineCap = 'round';
  for (let i = 0; i < orbs.length - 1; i++) {
    const a = orbs[i], b = orbs[i + 1];
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    // โค้งออกด้านนอกวง
    const ox = (mx - 512) * 0.28, oy = (my - 446) * 0.28;
    const grad = g.createLinearGradient(a.x, a.y, b.x, b.y);
    grad.addColorStop(0, a.col); grad.addColorStop(1, b.col);
    for (const [w, al, blur] of [[26, 0.25, 30], [14, 0.6, 18], [5, 0.95, 6]]) {
      g.globalAlpha = al; g.strokeStyle = grad; g.lineWidth = w; g.shadowColor = a.col; g.shadowBlur = blur;
      g.beginPath(); g.moveTo(a.x, a.y); g.quadraticCurveTo(mx + ox, my + oy, b.x, b.y); g.stroke();
    }
  }
  g.restore();
}

function drawSparks(orbs) {
  g.save();
  for (const o of orbs) {
    g.fillStyle = o.col; g.shadowColor = o.col; g.shadowBlur = 14;
    for (let k = 0; k < 7; k++) {
      const a = o.a + R(-1.4, 1.4), d = R(80, 125), s = R(5, 13);
      const x = o.x + Math.cos(a) * d, y = o.y - Math.sin(a) * d;
      g.save(); g.translate(x, y); g.rotate(R(0, PI)); g.globalAlpha = R(0.5, 1);
      poly([[0, -s * 1.6], [s * 0.6, 0], [0, s * 1.6], [-s * 0.6, 0]]); g.fill();
      g.restore();
    }
  }
  g.restore();
}

function drawOrbs(orbs, imgs) {
  for (const o of orbs) {
    const r = 74;
    g.save();
    // กรอบหินหกเหลี่ยม
    g.shadowColor = o.col; g.shadowBlur = 40;
    const hex = (rr) => poly(Array.from({ length: 8 }, (_, i) => [o.x + Math.cos((i / 8) * PI * 2 + PI / 8) * rr, o.y + Math.sin((i / 8) * PI * 2 + PI / 8) * rr]));
    hex(r + 14); g.fillStyle = '#16141a'; g.fill();
    g.shadowBlur = 0;
    hex(r + 8);
    const sg = g.createLinearGradient(o.x, o.y - r, o.x, o.y + r);
    sg.addColorStop(0, '#9a94a0'); sg.addColorStop(1, '#4e4a56');
    g.fillStyle = sg; g.fill();
    g.lineWidth = 3; g.strokeStyle = '#2a2730'; g.stroke();
    g.drawImage(imgs[o.name], o.x - r, o.y - r, r * 2, r * 2);
    g.restore();
  }
}

/* ---------------- หอคอยหิน ---------------- */
function stoneFill(x0, y0, x1, y1) {
  const sg = g.createLinearGradient(x0, y0, x1, y1);
  sg.addColorStop(0, '#8d8a92'); sg.addColorStop(0.5, '#6e6b74'); sg.addColorStop(1, '#4a4750');
  return sg;
}
function drawTower() {
  g.save();
  g.lineJoin = 'round';
  // ตัวหอ (สอบขึ้นด้านบน)
  const body = [[402, 600], [622, 600], [592, 352], [432, 352]];
  poly(body); g.fillStyle = stoneFill(402, 0, 622, 0); g.fill();
  g.lineWidth = 10; g.strokeStyle = '#1b1920'; g.stroke();
  // แนวก้อนหิน
  g.save(); poly(body); g.clip();
  g.strokeStyle = 'rgba(25,22,30,0.75)'; g.lineWidth = 5;
  for (let y = 380, row = 0; y < 600; y += 46, row++) {
    g.beginPath(); g.moveTo(380, y); g.lineTo(650, y); g.stroke();
    for (let x = 400 + (row % 2) * 40; x < 640; x += 80) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 46); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.08)';
    for (let x = 400 + (row % 2) * 40; x < 640; x += 80) g.fillRect(x + 4, y + 4, 70, 8);
  }
  g.restore();
  // ปีกยอดหอ
  poly([[382, 300], [642, 300], [632, 362], [392, 362]]);
  g.fillStyle = stoneFill(382, 0, 642, 0); g.fill(); g.lineWidth = 10; g.strokeStyle = '#1b1920'; g.stroke();
  g.strokeStyle = 'rgba(25,22,30,0.7)'; g.lineWidth = 5;
  for (const x of [452, 512, 572]) { g.beginPath(); g.moveTo(x, 302); g.lineTo(x, 360); g.stroke(); }
  // ใบเสมา
  for (const [x, w] of [[386, 70], [477, 70], [568, 70]]) {
    poly([[x, 300], [x + w, 300], [x + w - 2, 236], [x + 2, 236]]);
    g.fillStyle = stoneFill(x, 0, x + w, 0); g.fill(); g.lineWidth = 10; g.strokeStyle = '#1b1920'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x + 8, 244, w - 16, 10);
  }
  // หน้าต่างเรืองแสง
  g.shadowColor = '#ffcc40'; g.shadowBlur = 40;
  g.beginPath(); g.moveTo(492, 560); g.lineTo(492, 470); g.quadraticCurveTo(512, 432, 532, 470); g.lineTo(532, 560); g.closePath();
  const wg = g.createLinearGradient(0, 440, 0, 560); wg.addColorStop(0, '#fff3b0'); wg.addColorStop(1, '#ffb020');
  g.fillStyle = wg; g.fill();
  g.shadowBlur = 0; g.lineWidth = 8; g.strokeStyle = '#1b1920'; g.stroke();
  g.restore();
}

/* ---------------- เกาะลอยฟ้า ---------------- */
function drawIsland() {
  g.save();
  g.lineJoin = 'round';
  const top = 640;
  const pts = [[180, top], [844, top], [800, 760], [730, 850], [640, 920], [560, 975], [480, 950], [400, 900], [300, 820], [220, 740]];
  poly(pts);
  const rg = g.createLinearGradient(0, top, 0, 980);
  rg.addColorStop(0, '#6f6a72'); rg.addColorStop(1, '#2f2c34');
  g.fillStyle = rg; g.fill(); g.lineWidth = 12; g.strokeStyle = '#141218'; g.stroke();
  // รอยแตกหิน
  g.save(); poly(pts); g.clip();
  g.strokeStyle = 'rgba(20,18,24,0.8)'; g.lineWidth = 6;
  for (let i = 0; i < 14; i++) {
    const x = R(220, 800), y = R(700, 940);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + R(-40, 40), y + R(30, 70)); g.lineTo(x + R(-30, 30), y + R(70, 120)); g.stroke();
  }
  g.fillStyle = 'rgba(255,255,255,0.07)';
  for (let i = 0; i < 18; i++) { g.beginPath(); g.ellipse(R(230, 790), R(690, 900), R(20, 50), R(8, 16), R(-0.4, 0.4), 0, PI * 2); g.fill(); }
  g.restore();
  // หญ้าด้านบนพร้อมหยดย้อย
  g.beginPath(); g.moveTo(170, top - 18);
  for (let x = 170; x <= 854; x += 34) {
    const drip = rnd() < 0.45 ? R(30, 70) : R(10, 24);
    g.lineTo(x + 8, top + drip); g.lineTo(x + 20, top + drip - 6); g.lineTo(x + 30, top + 8);
  }
  g.lineTo(854, top - 18); g.closePath();
  const gg = g.createLinearGradient(0, top - 20, 0, top + 70);
  gg.addColorStop(0, '#9be04a'); gg.addColorStop(1, '#3f8a24');
  g.fillStyle = gg; g.fill(); g.lineWidth = 8; g.strokeStyle = '#163010'; g.stroke();
  // เศษหินลอย
  for (const [x, y, s] of [[230, 900, 30], [790, 905, 24], [330, 970, 18], [690, 980, 20], [150, 820, 16], [880, 800, 18]]) {
    g.save(); g.translate(x, y); g.rotate(R(0, PI));
    poly([[-s, -s * 0.4], [-s * 0.2, -s], [s, -s * 0.5], [s * 0.7, s * 0.6], [-s * 0.5, s * 0.8]]);
    g.fillStyle = '#5a5660'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#141218'; g.stroke();
    g.restore();
  }
  // หินแหลมสองข้างหลังตัวอักษร
  for (const [x, dir] of [[268, -1], [756, 1]]) {
    poly([[x - 70 * dir, 640], [x + 10 * dir, 520], [x + 60 * dir, 640]]);
    g.fillStyle = '#6a6670'; g.fill(); g.lineWidth = 10; g.strokeStyle = '#141218'; g.stroke();
  }
  g.restore();
}

/* ---------------- ตัวอักษร ---------------- */
function drawWord(text, cx, cy, size, fills, outline, extrude, tracking = 0) {
  g.save();
  g.font = `${size}px "Luckiest Guy"`;
  g.textAlign = 'left'; g.textBaseline = 'middle';
  g.lineJoin = 'round';
  // วางตัวอักษรทีละตัว (ปรับระยะห่าง + เอียงตามแนวโค้งเล็กน้อย)
  const widths = [...text].map((ch) => g.measureText(ch).width + tracking);
  const total = widths.reduce((a, b) => a + b, 0) - tracking;
  let x = cx - total / 2;
  const letters = [...text].map((ch, i) => {
    const w = widths[i];
    const t = (x + w / 2 - cx) / (total / 2);
    const L = { ch, x, w, y: cy + t * t * size * 0.06, rot: t * 0.05 };
    x += w;
    return L;
  });
  const each = (fn) => letters.forEach((L) => { g.save(); g.translate(L.x + L.w / 2, L.y); g.rotate(L.rot); g.translate(-(L.x + L.w / 2), -L.y); fn(L); g.restore(); });
  // ขอบนอกเข้ม + ความหนาแบบ 3 มิติ
  each((L) => { g.lineWidth = size * 0.15; g.strokeStyle = outline; for (let d = extrude; d >= 0; d -= 3) g.strokeText(L.ch, L.x, L.y + d); });
  each((L) => { g.fillStyle = fills.side; for (let d = extrude; d > 0; d -= 2) { g.lineWidth = size * 0.06; g.strokeStyle = fills.side; g.strokeText(L.ch, L.x, L.y + d); g.fillText(L.ch, L.x, L.y + d); } });
  // หน้าตัวอักษร
  each((L) => {
    const gr = g.createLinearGradient(0, L.y - size * 0.45, 0, L.y + size * 0.4);
    fills.face.forEach(([k, c]) => gr.addColorStop(k, c));
    g.lineWidth = size * 0.05; g.strokeStyle = fills.rim; g.strokeText(L.ch, L.x, L.y);
    g.fillStyle = gr; g.fillText(L.ch, L.x, L.y);
    // รอยแตก/ลายบนผิว (เฉพาะในตัวอักษร)
    g.save();
    g.globalCompositeOperation = 'source-atop';
    g.strokeStyle = fills.crack; g.lineWidth = size * 0.022;
    g.lineWidth = size * 0.012;
    if (rnd() < 0.6) {
      const sx = L.x + R(0.25, 0.75) * L.w, sy = L.y + R(-0.25, 0.05) * size;
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + R(-0.05, 0.05) * size, sy + R(0.07, 0.12) * size); g.lineTo(sx + R(-0.08, 0.08) * size, sy + R(0.14, 0.2) * size); g.stroke();
    }
    // ขอบล่างเงาเข้มให้ดูนูน
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(L.x, L.y + size * 0.24, L.w, size * 0.2);
    g.fillStyle = 'rgba(255,255,255,0.28)';
    g.fillRect(L.x, L.y - size * 0.46, L.w, size * 0.1);
    g.restore();
  });
  g.restore();
}

async function main() {
  const font = new FontFace('Luckiest Guy', 'url(./fonts/luckiest-guy.woff2)');
  await font.load();
  document.fonts.add(font);
  const imgs = {};
  for (const [name] of ELEMENTS) imgs[name] = await loadImg(`../public/icons/el_${name}.png`);
  g.clearRect(0, 0, S, S);
  // ย่อทั้งภาพเล็กน้อยให้มีขอบว่างรอบด้าน
  g.save();
  g.translate(512, 515); g.scale(0.9, 0.9); g.translate(-512, -480);
  const orbs = orbPositions();
  drawRibbons(orbs);
  drawSparks(orbs);
  g.save(); g.translate(0, 700); g.scale(1, 0.8); g.translate(0, -640); drawIsland(); g.restore();
  g.save(); g.translate(0, -44); drawTower(); g.restore();
  drawOrbs(orbs, imgs);
  // แสงเรืองหลังตัวอักษร
  g.save();
  const halo = g.createRadialGradient(512, 720, 40, 512, 720, 460);
  halo.addColorStop(0, 'rgba(255,190,80,0.18)'); halo.addColorStop(1, 'rgba(255,190,80,0)');
  g.globalCompositeOperation = 'destination-over'; g.fillStyle = halo; g.fillRect(0, 0, S, S);
  g.restore();
  drawWord('ELEMENT', 512, 640, 180, {
    face: [[0, '#fbfaf6'], [0.55, '#d6d1c8'], [1, '#a59f95']], side: '#5c5862', rim: '#f6f2ea', crack: 'rgba(90,84,80,0.55)',
  }, '#141218', 14, 4);
  drawWord('TD', 512, 812, 270, {
    face: [[0, '#fff27a'], [0.5, '#ffc13a'], [1, '#f08a1a']], side: '#a0501a', rim: '#fff4b0', crack: 'rgba(160,80,20,0.5)',
  }, '#1a1008', 20, 0);
  g.restore();
  window.LOGO = cv.toDataURL('image/png');
  const scaled = (n) => {
    const c = document.createElement('canvas');
    c.width = c.height = n;
    const sg = c.getContext('2d');
    sg.imageSmoothingQuality = 'high';
    sg.drawImage(cv, 0, 0, n, n);
    return c.toDataURL('image/png');
  };
  window.LOGO_MED = scaled(640);
  window.LOGO_SMALL = scaled(256);
  window.LOGO_READY = true;
}
main();
