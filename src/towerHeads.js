/* ============================================================
 *  หัวป้อมธาตุ (ตามคำบรรยายรูปลักษณ์ของป้อมแต่ละแบบ)
 *  build(rig, head, T) → { aim?, height? }   T = ระดับ 1–3
 *  anim(B, t, dt, boost) — B = ชื่อ bone → Object3D
 * ============================================================ */
import { G, xf } from './modelkit.js';

const PI = Math.PI;
const ring = (n, r, fn) => { for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2; fn(Math.cos(a) * r, Math.sin(a) * r, a, i); } };
const S3 = (T, a, b, c) => [a, b, c][T - 1];
// ตำแหน่งตั้งต้นของ bone (เก็บไว้ครั้งแรกที่ใช้)
const baseY = (b) => { if (b.userData.py == null) b.userData.py = b.position.y; return b.userData.py; };
const helix = (r, h, turns, n = 40, phase = 0, y0 = 0, shrink = 0) => {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const a = phase + k * turns * PI * 2;
    const rr = r * (1 - shrink * k);
    pts.push([Math.cos(a) * rr, y0 + k * h, Math.sin(a) * rr]);
  }
  return pts;
};
// โซ่ตามเส้น: ห่วงเล็กสลับแนว
function chain(rig, bone, role, pts, link = 0.03) {
  for (let s = 0; s < pts.length - 1; s++) {
    const [a, b] = [pts[s], pts[s + 1]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const n = Math.max(1, Math.round(len / (link * 1.6)));
    for (let i = 0; i < n; i++) {
      const k = (i + 0.5) / n;
      const p = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
      const yaw = Math.atan2(b[2] - a[2], b[0] - a[0]);
      const pitch = Math.atan2(b[1] - a[1], Math.hypot(b[0] - a[0], b[2] - a[2]));
      rig.add(bone, role, G.torus(link, link * 0.28, { x: p[0], y: p[1], z: p[2], ry: -yaw, rz: pitch, rx: (s * n + i) % 2 ? PI / 2 : 0 }));
    }
  }
}
const flameCones = (rig, bone, cols, n, r, h, k = 1) => {
  ring(n, r, (x, z, a, i) => rig.add(bone, 'glow:' + cols[i % cols.length], G.cone(0.05 * k, (h + (i % 3) * 0.05) * k, { x, y: (h * 0.5) * k, z, rx: Math.sin(a) * 0.2, rz: -Math.cos(a) * 0.2 }, 6)));
  rig.add(bone, 'glow:' + cols[cols.length - 1], G.cone(0.06 * k, h * 1.4 * k, { y: h * 0.7 * k }, 8));
};

export const ELEMENT_HEADS = {
  /* ================= ธาตุเดี่ยว ================= */

  // เตาอัคคี — เตาอิฐดำกับปืนใหญ่ทองแดง
  fire: {
    build(rig, h, T) {
      const k = S3(T, 0.8, 1, 1.18);
      if (T === 1) {
        rig.add(h, 'brick', G.box(0.38, 0.22, 0.38, { y: 0.11 }));
        rig.add(h, 'glow:#ff7a1e', G.box(0.14, 0.08, 0.02, { x: 0, y: 0.08, z: 0.19 }));
      } else {
        rig.add(h, 'brick', G.lathe([[0.3 * k, 0], [0.31 * k, 0.12], [0.27 * k, 0.26], [0.18 * k, 0.34], [0, 0.36]], {}, 12));
        ring(4, 0.29 * k, (x, z, a) => rig.add(h, 'glow:#ff6a1e', G.box(0.09, 0.06, 0.02, { x, y: 0.1, z, ry: -a + PI / 2 })));
        rig.add(h, 'iron', G.torus(0.3 * k, 0.014, { y: 0.02, rx: PI / 2 }), G.torus(0.29 * k, 0.012, { y: 0.2, rx: PI / 2 }));
        const chim = T === 3 ? [[-0.2, -0.16], [-0.2, 0.16]] : [[-0.2, 0]];
        for (const [x, z] of chim) {
          rig.add(h, 'brick', G.cyl(0.05, 0.06, 0.5 * k, { x: x * k, y: 0.3 * k, z: z * k }, 8));
          rig.add(h, 'iron', G.cyl(0.065, 0.065, 0.03, { x: x * k, y: 0.55 * k, z: z * k }, 8));
        }
        chim.forEach(([x, z], i) => {
          const fl = rig.bone(i ? 'flames2' : 'flames', h, { x: x * k, y: 0.56 * k, z: z * k });
          flameCones(rig, fl, ['#ff5a1e', '#ffb030', '#ffe08a'], 3, 0.02, 0.12, 1);
        });
        if (T === 3) {
          const emb = rig.bone('embers', h, { y: 0.7 });
          ring(6, 0.42, (x, z, a, i) => rig.add(emb, 'glow:#ffcf4a', G.octa(0.025, { x, y: Math.sin(i * 2) * 0.06, z })));
        }
      }
      const top = T === 1 ? 0.22 : 0.33 * k;
      const aim = rig.bone('aim', h, { y: top });
      rig.add(aim, 'iron', G.cyl(0.09 * k, 0.11 * k, 0.05, { y: 0.02 }, 10));
      const barrels = T === 3 ? [-0.06, 0.06] : [0];
      for (const z of barrels) {
        const len = S3(T, 0.26, 0.34, 0.4);
        rig.add(aim, 'copper', G.tube([[-0.1, 0.08, z], [0.08, 0.1, z], [len, 0.13, z]], [S3(T, 0.06, 0.075, 0.065), S3(T, 0.045, 0.055, 0.05)], {}, 10, 12));
        rig.add(aim, 'gold', G.torus(S3(T, 0.048, 0.058, 0.052), 0.012, { x: len, y: 0.13, z, ry: PI / 2, rx: 0.1 }));
        if (T > 1) rig.add(aim, 'gold', G.torus(0.07, 0.01, { x: 0.02, y: 0.09, z, ry: PI / 2 }));
        rig.add(aim, 'glow:#ff7a1e', G.cyl(0.035, 0.035, 0.01, { x: len + 0.005, y: 0.13, z, rz: PI / 2 - 0.1 }, 8));
      }
      return { aim: 'aim', height: top + 0.3 };
    },
    anim(B, t) {
      if (B.flames) B.flames.scale.set(1, 1 + Math.sin(t * 13) * 0.15, 1);
      if (B.flames2) B.flames2.scale.set(1, 1 + Math.sin(t * 13 + 1) * 0.15, 1);
      if (B.embers) B.embers.rotation.y = t * 1.2;
    },
  },

  // วังวนธารา — อ่างน้ำทรงเตี้ย มีเกลียวคลื่นลอยเหนือป้อม
  water: {
    build(rig, h, T) {
      const k = S3(T, 0.82, 1, 1.15);
      const R = 0.34 * k;
      rig.add(h, T === 3 ? 'marble' : 'stone', G.lathe([[R, 0], [R + 0.02, 0.04], [R, 0.12], [R - 0.04, 0.13], [R - 0.05, 0.05], [0, 0.05]], {}, 20));
      rig.add(h, 'water', G.cyl(R - 0.04, R - 0.04, 0.015, { y: 0.11 }, 20));
      if (T >= 2) rig.add(h, 'gold', G.torus(R + 0.005, 0.012, { y: 0.125, rx: PI / 2 }));
      if (T === 3) {
        ring(4, R + 0.06, (x, z) => {
          rig.add(h, 'marble', G.cyl(0.04, 0.05, 0.42, { x, y: 0.21, z }, 8));
          rig.add(h, 'gold', G.sphere(0.04, { x, y: 0.44, z }, 8));
        });
      }
      const sp = rig.bone('spiral', h, { y: 0.2 });
      const arms = S3(T, 1, 2, 3);
      const H = S3(T, 0.3, 0.42, 0.55);
      for (let a = 0; a < arms; a++) {
        rig.add(sp, 'water', G.tube(helix(0.2 * k, H, 1.3, 40, (a * 2 * PI) / arms, 0.05, 0.4), (t) => 0.035 * Math.sin(t * PI) * k + 0.006, {}, 48, 8));
        rig.add(sp, 'glow:#bfeaff', G.sphere(0.025, { ...(() => { const p = helix(0.2 * k, H, 1.3, 40, (a * 2 * PI) / arms, 0.05, 0.4)[40]; return { x: p[0], y: p[1], z: p[2] }; })() }, 8));
      }
      const orb = rig.bone('orb', h, { y: 0.2 + H * 0.55 });
      rig.add(orb, 'water', G.sphere(S3(T, 0.06, 0.08, 0.1), {}, 14));
      if (T >= 2) {
        const drops = rig.bone('drops', h, { y: 0.32 });
        ring(T === 3 ? 6 : 4, R + 0.04, (x, z, a, i) => rig.add(drops, 'glow:#bfeaff', G.sphere(0.025, { x, y: Math.sin(i * 3) * 0.05, z, s: [1, 1.4, 1] }, 8)));
      }
      return { height: 0.3 + H };
    },
    anim(B, t) {
      B.spiral.rotation.y = t * 1.6;
      B.spiral.position.y = 0.2 + Math.sin(t * 2) * 0.03;
      if (B.drops) B.drops.rotation.y = -t * 1.2;
    },
  },

  // จักรวายุ — ใบมีดสามชิ้นโคจรรอบแกนลม
  wind: {
    build(rig, h, T) {
      const k = S3(T, 0.8, 1, 1.15);
      const H = S3(T, 0.45, 0.62, 0.82);
      rig.add(h, 'marble', G.lathe([[0.14, 0], [0.11, 0.05], [0.05, 0.12], [0.035, H - 0.04], [0.05, H], [0, H]], {}, 10));
      rig.add(h, 'gold', G.torus(0.05, 0.01, { y: H * 0.5, rx: PI / 2 }));
      const core = rig.bone('core', h, { y: H * 0.62 });
      rig.add(core, 'glow:#7affd0', G.sphere(S3(T, 0.05, 0.065, 0.08), {}, 12));
      rig.add(core, 'glow:#b6ffe3', G.torus(0.1 * k, 0.006, { rx: PI / 2 }));
      const blade = (bone, r, y, len, flip) => {
        ring(3, r, (x, z, a) => {
          const pts = [];
          for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push([Math.sin(t * PI) * 0.035 + t * 0.01, t * len]); }
          for (let i = 6; i >= 0; i--) { const t = i / 6; pts.push([-0.012 + t * 0.005, t * len]); }
          rig.add(bone, 'blade', xf(G.sheet(pts), { rx: -PI / 2, rz: flip * 0.5, ry: -a + (flip > 0 ? 0 : PI), x, y, z }));
          rig.add(bone, 'glow:#7affd0', G.box(0.01, len * 0.7, 0.012, { x, y: y + len * 0.42, z, ry: -a, rz: flip * 0.5 }));
        });
      };
      const b1 = rig.bone('blades', h, { y: H * 0.62 });
      blade(b1, 0.2 * k, -0.12 * k, 0.26 * k, 1);
      if (T === 3) {
        const b2 = rig.bone('blades2', h, { y: H * 0.62 });
        blade(b2, 0.3, -0.14, 0.3, -1);
      }
      if (T >= 2) {
        const sw = rig.bone('swirl', h);
        rig.add(sw, 'glow:#7affd0', G.tube(helix(0.26 * k, H * 0.9, 1.5, 40, 0, 0.05, 0.3), (t) => 0.01 * Math.sin(t * PI) + 0.002, {}, 48, 4));
      }
      if (T === 3) rig.add(h, 'gold', G.cone(0.04, 0.12, { y: H + 0.06 }, 6));
      return { height: H + 0.15 };
    },
    anim(B, t, dt, boost) {
      B.blades.rotation.y += dt * (3 + boost * 10);
      if (B.blades2) B.blades2.rotation.y -= dt * (2.4 + boost * 8);
      B.core.scale.setScalar(1 + Math.sin(t * 6) * 0.08);
      if (B.swirl) B.swirl.rotation.y = -t * 2;
    },
  },

  // หมัดปฐพี — โกเลมหินหมัดใหญ่ มีผลึกอำพัน
  earth: {
    build(rig, h, T) {
      const k = S3(T, 0.75, 0.95, 1.15);
      const aim = rig.bone('aim', h);
      // ขา
      for (const s of [-1, 1]) rig.add(aim, 'rock', G.ico(0.08 * k, { x: -0.02, y: 0.07 * k, z: s * 0.1 * k, s: [1, 1.2, 1] }, 0));
      // ลำตัว
      rig.add(aim, 'rock', G.ico(0.17 * k, { y: 0.27 * k, s: [0.9, 1, 1.1] }, T === 1 ? 0 : 1));
      rig.add(aim, 'crystal:#ffb030', G.octa(0.06 * k, { x: 0.13 * k, y: 0.29 * k, s: [0.7, 1.2, 0.9] }));
      // หัว
      rig.add(aim, 'rock', G.ico(0.075 * k, { x: 0.03, y: 0.47 * k }, 0));
      rig.add(aim, 'glow:#ffb030', G.box(0.02, 0.02, 0.08 * k, { x: 0.09 * k, y: 0.48 * k }));
      if (T >= 2) {
        for (const s of [-1, 1]) rig.add(aim, 'rock', G.ico(0.07 * k, { y: 0.4 * k, z: s * 0.17 * k }, 0));
        rig.add(aim, 'glow:#ffd27a', G.box(0.01, 0.12 * k, 0.012, { x: 0.15 * k, y: 0.22 * k, z: 0.05 }));
      }
      if (T === 3) {
        for (const s of [-1, 1]) rig.add(aim, 'crystal:#ffb030', G.octa(0.05, { y: 0.5 * k, z: s * 0.18 * k, s: [0.7, 1.8, 0.7], rx: s * 0.3 }));
        rig.add(aim, 'crystal:#ffd27a', G.octa(0.04, { x: 0.02, y: 0.6 * k, s: [0.7, 1.6, 0.7] }));
      }
      // แขน + หมัดใหญ่
      for (const s of [-1, 1]) {
        const arm = rig.bone(s > 0 ? 'armR' : 'armL', aim, { y: 0.38 * k, z: s * 0.2 * k });
        rig.add(arm, 'rock', G.tube([[0, 0, 0], [0.04, -0.12 * k, s * 0.04], [0.08, -0.22 * k, s * 0.02]], [0.05 * k, 0.04 * k], {}, 6, 6));
        rig.add(arm, 'rock', G.ico(0.1 * k, { x: 0.1 * k, y: -0.28 * k, z: s * 0.02, s: [1.1, 0.9, 1] }, T === 1 ? 0 : 1));
        if (T >= 2) rig.add(arm, 'crystal:#ffb030', G.octa(0.03, { x: 0.18 * k, y: -0.26 * k, z: s * 0.02 }));
      }
      return { aim: 'aim', height: 0.62 * k };
    },
    anim(B, t, dt, boost) {
      if (B.armR) B.armR.rotation.z = -boost * 1.4 + Math.sin(t * 2) * 0.05;
      if (B.armL) B.armL.rotation.z = Math.sin(t * 2 + 1) * 0.05;
    },
  },

  // เนตรอเวจี — กรงเล็บหินดำโอบลูกแก้วม่วง
  dark: {
    build(rig, h, T) {
      const k = S3(T, 0.8, 1, 1.2);
      const n = S3(T, 3, 4, 5);
      rig.add(h, 'obsidian', G.cyl(0.18 * k, 0.24 * k, 0.1, { y: 0.05 }, 8));
      const oy = S3(T, 0.38, 0.5, 0.66);
      ring(n, 1, (c, s, a) => {
        const r0 = 0.2 * k, r1 = 0.24 * k, r2 = 0.13 * k;
        rig.add(h, 'obsidian', G.tube([[c * r0, 0.06, s * r0], [c * r1, oy * 0.6, s * r1], [c * (r1 - 0.02), oy * 0.95, s * (r1 - 0.02)], [c * r2, oy + 0.12 * k, s * r2]], [0.04 * k, 0.008], {}, 12, 6));
        if (T === 3) rig.add(h, 'obsidian', G.cone(0.02, 0.1, { x: c * r1 * 1.08, y: oy * 0.6, z: s * r1 * 1.08, rz: -c * 1.2, rx: s * 1.2 }, 4));
        rig.add(h, 'glow:#a84dff', G.box(0.008, 0.12 * k, 0.012, { x: c * (r1 + 0.03), y: oy * 0.55, z: s * (r1 + 0.03), ry: -a }));
      });
      const orb = rig.bone('orb', h, { y: oy });
      const R = S3(T, 0.1, 0.13, 0.16);
      rig.add(orb, 'voidOrb', G.sphere(R, {}, 18));
      const eye = rig.bone('eye', orb);
      rig.add(eye, 'glow:#e0b0ff', G.torus(R * 0.45, R * 0.12, { x: R * 0.86, ry: PI / 2 }));
      rig.add(eye, 'blackSun', G.sphere(R * 0.28, { x: R * 0.92, s: [0.4, 1, 1] }, 10));
      if (T >= 2) {
        const r1 = rig.bone('ring1', orb);
        rig.add(r1, 'glow:#b070ff', G.torus(R + 0.07, 0.008));
      }
      if (T === 3) {
        const shards = rig.bone('shards', h, { y: oy });
        ring(5, 0.38, (x, z, a, i) => rig.add(shards, 'obsidian', G.octa(0.035, { x, y: Math.sin(i * 2) * 0.06, z, s: [0.6, 1.6, 0.6] })));
      }
      return { aim: 'orb', height: oy + R + 0.1 };
    },
    anim(B, t) {
      if (B.ring1) B.ring1.rotation.set(t * 1.2, t * 0.6, 0);
      if (B.shards) B.shards.rotation.y = t * 0.9;
      B.eye.scale.setScalar(1 + Math.sin(t * 3) * 0.05);
    },
  },

  /* ================= สองธาตุ ================= */

  // คราสพิพากษา — วงแหวนทองล้อมดวงอาทิตย์ดำ
  'dark+light': {
    build(rig, h, T) {
      const k = S3(T, 0.85, 1, 1.18);
      rig.add(h, 'marble', G.lathe([[0.2, 0], [0.16, 0.06], [0.08, 0.14], [0.06, 0.3 * k], [0.1, 0.34 * k], [0, 0.34 * k]], {}, 12));
      rig.add(h, 'gold', G.torus(0.08, 0.012, { y: 0.2 * k, rx: PI / 2 }));
      const cy = 0.34 * k + 0.26 * k;
      const sun = rig.bone('sun', h, { y: cy });
      rig.add(sun, 'blackSun', G.sphere(0.13 * k, {}, 18));
      rig.add(sun, 'glow:#ffd34a', G.torus(0.145 * k, 0.012));
      const rays = rig.bone('rays', sun);
      ring(T === 3 ? 16 : 12, 0.17 * k, (x, y, a, i) => rig.add(rays, i % 2 ? 'glow:#ffe35a' : 'glow:#ff9a2a', G.cone(0.02, (i % 2 ? 0.08 : 0.12) * k, { x, y, rz: a - PI / 2 }, 4)));
      const r1 = rig.bone('ring1', sun);
      rig.add(r1, 'gold', G.torus(0.28 * k, 0.018, {}));
      ring(8, 0.28 * k, (x, y) => rig.add(r1, 'gold', G.sphere(0.022, { x, y }, 8)));
      if (T >= 2) {
        const r2 = rig.bone('ring2', sun);
        rig.add(r2, 'gold', G.torus(0.34 * k, 0.012, { rx: PI / 2 }));
        rig.add(r2, 'glow:#8a3dff', G.torus(0.34 * k, 0.005, { rx: PI / 2, y: 0.02 }));
      }
      if (T === 3) {
        const r3 = rig.bone('ring3', sun);
        rig.add(r3, 'gold', G.torus(0.4, 0.01, { ry: PI / 2 }));
      }
      return { height: cy + 0.35 * k };
    },
    anim(B, t) {
      B.rays.rotation.z = t * 0.8;
      B.ring1.rotation.set(0, t * 0.9, 0);
      if (B.ring2) B.ring2.rotation.set(Math.sin(t * 0.7) * 0.4, 0, t * 0.6);
      if (B.ring3) B.ring3.rotation.set(t * 0.5, 0, 0);
    },
  },

  // ปริซึมธารา — ผลึกใสล้อมด้วยหยดน้ำลอยตัว
  'light+water': {
    build(rig, h, T) {
      const k = S3(T, 0.85, 1, 1.18);
      rig.add(h, 'marble', G.lathe([[0.28 * k, 0], [0.29 * k, 0.04], [0.27 * k, 0.1], [0.23 * k, 0.11], [0.22 * k, 0.04], [0, 0.04]], {}, 18));
      rig.add(h, 'water', G.cyl(0.22 * k, 0.22 * k, 0.012, { y: 0.09 }, 18));
      const cy = 0.42 * k;
      const pr = rig.bone('prism', h, { y: cy });
      rig.add(pr, 'crystal:#e8fbff', G.cyl(0.07 * k, 0.07 * k, 0.32 * k, {}, 6));
      rig.add(pr, 'crystal:#e8fbff', G.cone(0.07 * k, 0.12 * k, { y: 0.22 * k }, 6), G.cone(0.07 * k, 0.12 * k, { y: -0.22 * k, rx: PI }, 6));
      rig.add(pr, 'glow:#ffffff', G.cyl(0.02, 0.02, 0.36 * k, {}, 6));
      if (T === 3) {
        for (const s of [-1, 1]) rig.add(pr, 'crystal:#bfefff', G.octa(0.05, { x: s * 0.13, y: -0.05, s: [0.6, 2, 0.6], rz: s * 0.4 }));
      }
      const drops = rig.bone('drops', h, { y: cy });
      ring(S3(T, 4, 6, 8), 0.24 * k, (x, z, a, i) => rig.add(drops, 'water', G.sphere(0.035, { x, y: Math.sin(i * 1.7) * 0.12 * k, z, s: [1, 1.3, 1] }, 10)));
      if (T >= 2) {
        const halo = rig.bone('halo', h, { y: cy });
        rig.add(halo, 'glow:#bfeaff', G.torus(0.3 * k, 0.006, { rx: PI / 2 + 0.3 }));
      }
      return { height: cy + 0.32 * k };
    },
    anim(B, t) {
      B.prism.rotation.y = t * 0.7;
      B.prism.position.y = baseY(B.prism) + Math.sin(t * 2) * 0.03;
      B.drops.rotation.y = -t * 1.1;
      if (B.halo) B.halo.rotation.y = t * 0.8;
    },
  },

  // สุริยะเผาผลาญ — หอรวมแสง มีแกนดวงอาทิตย์
  'fire+light': {
    build(rig, h, T) {
      const k = S3(T, 0.85, 1, 1.18);
      const H = 0.42 * k;
      rig.add(h, 'marble', G.lathe([[0.22, 0], [0.19, 0.05], [0.1, 0.12], [0.08, H - 0.05], [0.13, H], [0, H]], {}, 12));
      for (const y of [0.1, H * 0.6]) rig.add(h, 'gold', G.torus(0.1, 0.012, { y, rx: PI / 2 }));
      // จานสะท้อนแสงรอบแกน
      ring(S3(T, 4, 6, 8), 1, (c, s, a) => {
        rig.add(h, 'mirror', xf(G.sheet([[-0.04 * k, 0], [0.04 * k, 0], [0.07 * k, 0.14 * k], [0, 0.18 * k], [-0.07 * k, 0.14 * k]]), { rx: -PI / 2 + 0.55, ry: -a + PI / 2, x: c * 0.11, y: H - 0.04, z: s * 0.11 }));
      });
      const cy = H + 0.2 * k;
      const sun = rig.bone('sun', h, { y: cy });
      rig.add(sun, 'glow:#ffb030', G.sphere(0.1 * k, {}, 16));
      rig.add(sun, 'glow:#fff2a0', G.sphere(0.06 * k, {}, 12));
      const fl = rig.bone('flares', sun);
      ring(S3(T, 6, 8, 10), 0.11 * k, (x, y, a, i) => rig.add(fl, i % 2 ? 'glow:#ff7a1e' : 'glow:#ffd34a', G.cone(0.025 * k, 0.1 * k, { x, y, rz: a - PI / 2 }, 5)));
      if (T >= 2) {
        const orb = rig.bone('orbit', h, { y: cy });
        ring(3, 0.28 * k, (x, z) => rig.add(orb, 'glow:#ffcf4a', G.sphere(0.03, { x, z }, 8)));
      }
      return { height: cy + 0.18 * k };
    },
    anim(B, t, dt, boost) {
      B.flares.rotation.z = t * 1.5;
      B.sun.scale.setScalar(1 + Math.sin(t * 7) * 0.05 + boost * 0.1);
      if (B.orbit) B.orbit.rotation.y = t * 1.8;
    },
  },

  // ศรแสง — หน้าไม้ลอยตัว มีปีกลม
  'light+wind': {
    build(rig, h, T) {
      const k = S3(T, 1.1, 1.3, 1.5);
      rig.add(h, 'marble', G.cyl(0.07, 0.15, 0.12, { y: 0.06 }, 8));
      rig.add(h, 'gold', G.torus(0.1, 0.01, { y: 0.12, rx: PI / 2 }));
      const lift = rig.bone('lift', h);
      ring(3, 0.12, (x, z) => rig.add(lift, 'glow:#7affd0', G.cone(0.012, 0.18, { x, y: 0.22, z }, 4)));
      const aim = rig.bone('aim', h, { y: 0.36 + T * 0.05 });
      rig.add(aim, 'marble', G.box(0.34 * k, 0.045, 0.07, {}));
      rig.add(aim, 'gold', G.box(0.1 * k, 0.07, 0.09, { x: -0.13 * k }), G.box(0.06, 0.03, 0.08, { x: 0.15 * k }));
      for (const s of [-1, 1]) rig.add(aim, 'gold', G.tube([[0.12 * k, 0, 0], [0.11 * k, 0.012, s * 0.12 * k], [0.04 * k, 0.02, s * 0.22 * k]], [0.018, 0.009], {}, 8, 5));
      rig.add(aim, 'glow:#fff2a0', G.cyl(0.01, 0.01, 0.34 * k, { x: 0.02, y: 0.035, rz: PI / 2 }, 4));
      rig.add(aim, 'glow:#ffffff', G.cone(0.025, 0.07, { x: 0.2 * k, y: 0.035, rz: -PI / 2 }, 4));
      rig.add(aim, 'glow:#fff2a0', G.cyl(0.004, 0.004, 0.44 * k, { x: 0.04 * k, y: 0.02, rx: PI / 2 }, 3));
      for (const s of [-1, 1]) {
        const w = rig.bone(s > 0 ? 'wingR' : 'wingL', aim, { x: -0.06 * k, z: s * 0.04 });
        for (let f = 0; f < S3(T, 3, 4, 5); f++) rig.add(w, 'glow:#7affd0', xf(G.feather(0.2 * k - f * 0.025, 0.035), { ry: s > 0 ? -0.35 - f * 0.28 : PI + 0.35 + f * 0.28, x: -f * 0.015 }));
      }
      return { aim: 'aim', height: 0.5 + T * 0.05 };
    },
    anim(B, t, dt, boost) {
      B.aim.position.y = baseY(B.aim) + Math.sin(t * 2.2) * 0.025;
      if (B.wingR) B.wingR.rotation.x = Math.sin(t * 6) * 0.35 + boost * 0.3;
      if (B.wingL) B.wingL.rotation.x = -Math.sin(t * 6) * 0.35 - boost * 0.3;
      B.lift.rotation.y = t * 2;
    },
  },

  // เสาศิลารุ่งอรุณ — เสาหินรูน มีผลึกทองบนยอด
  'earth+light': {
    build(rig, h, T) {
      const k = S3(T, 0.85, 1, 1.15);
      const H = S3(T, 0.55, 0.72, 0.9);
      rig.add(h, 'stone', G.box(0.2 * k, H, 0.2 * k, { y: H / 2 }));
      rig.add(h, 'slab', G.box(0.26 * k, 0.05, 0.26 * k, { y: 0.025 }), G.box(0.25 * k, 0.04, 0.25 * k, { y: H }));
      for (let i = 0; i < 4; i++) {
        const a = (i * PI) / 2;
        for (let j = 0; j < S3(T, 2, 3, 4); j++) rig.add(h, 'glow:#ffd34a', G.box(0.05, 0.03, 0.01, { x: Math.cos(a) * 0.102 * k, y: 0.14 + j * 0.15, z: Math.sin(a) * 0.102 * k, ry: -a + PI / 2 }));
      }
      if (T === 3) {
        for (const s of [-1, 1]) {
          rig.add(h, 'stone', G.box(0.1, 0.38, 0.1, { x: s * 0.3, y: 0.19, z: -s * 0.12 }));
          rig.add(h, 'crystal:#ffd34a', G.octa(0.04, { x: s * 0.3, y: 0.44, z: -s * 0.12, s: [0.7, 1.5, 0.7] }));
        }
      }
      const cr = rig.bone('crystal', h, { y: H + 0.2 * k });
      rig.add(cr, 'crystal:#ffd34a', G.octa(1, { s: [0.1 * k, 0.2 * k, 0.1 * k] }));
      rig.add(cr, 'glow:#fff2a0', G.octa(1, { s: [0.035, 0.08, 0.035] }));
      const halo = rig.bone('halo', h, { y: H + 0.2 * k });
      rig.add(halo, 'glow:#ffe35a', G.torus(0.18 * k, 0.007, { rx: PI / 2 }));
      return { height: H + 0.42 * k };
    },
    anim(B, t, dt, boost) {
      B.crystal.rotation.y = t;
      B.halo.scale.setScalar(1 + Math.sin(t * 3) * 0.08 + boost * 0.5);
    },
  },

  // บ่ออาถรรพ์ — บ่อน้ำดำกับวังวนม่วง
  'dark+water': {
    build(rig, h, T) {
      const k = S3(T, 0.85, 1, 1.15);
      const R = 0.27 * k;
      ring(14, R, (x, z, a, i) => rig.add(h, 'stoneDark', G.box(0.1, 0.18 + (i % 2) * 0.02, 0.07, { x, y: 0.09, z, ry: -a + PI / 2 })));
      rig.add(h, 'abyssWater', G.cyl(R - 0.03, R - 0.03, 0.01, { y: 0.15 }, 18));
      for (const s of [-1, 1]) rig.add(h, 'woodDark', G.box(0.04, 0.5 * k, 0.04, { x: s * (R + 0.02), y: 0.25 * k }));
      rig.add(h, 'woodDark', G.box(0.04, 0.04, (R + 0.08) * 2, { y: 0.5 * k, ry: PI / 2 }));
      if (T >= 2) rig.add(h, 'iron', G.cyl(0.008, 0.008, 0.2, { y: 0.4 * k }, 4), G.cyl(0.04, 0.035, 0.05, { y: 0.29 * k }, 8));
      const vx = rig.bone('vortex', h, { y: 0.15 });
      for (let a = 0; a < S3(T, 2, 3, 4); a++) {
        rig.add(vx, 'glow:#b070ff', G.tube(helix(R - 0.05, 0.35 * k, 1.2, 36, (a * 2 * PI) / S3(T, 2, 3, 4), 0.01, 0.75), (t) => 0.014 * (1 - t) + 0.003, {}, 40, 4));
      }
      if (T === 3) {
        const skull = rig.bone('wisps', h, { y: 0.55 });
        ring(3, 0.35, (x, z) => rig.add(skull, 'glow:#d6b3ff', G.sphere(0.03, { x, z }, 8)));
      }
      return { height: 0.6 * k };
    },
    anim(B, t) {
      B.vortex.rotation.y = -t * 2.2;
      if (B.wisps) B.wisps.rotation.y = t * 0.8;
    },
  },

  // เพลิงวิญญาณ — เตาหัวกะโหลก มีไฟม่วงแดง
  'dark+fire': {
    build(rig, h, T) {
      const k = S3(T, 0.85, 1, 1.18);
      ring(3, 0.16 * k, (x, z) => rig.add(h, 'iron', G.tube([[x * 1.3, 0, z * 1.3], [x, 0.12 * k, z], [x * 0.7, 0.22 * k, z * 0.7]], [0.02, 0.014], {}, 6, 5)));
      const sk = rig.bone('skull', h, { y: 0.34 * k });
      rig.add(sk, 'bone', G.ell(0.17 * k, 0.15 * k, 0.16 * k, {}, 16));
      rig.add(sk, 'bone', G.box(0.18 * k, 0.07 * k, 0.16 * k, { x: 0.06 * k, y: -0.11 * k }));
      for (const s of [-1, 1]) {
        rig.add(sk, 'blackSun', G.sphere(0.04 * k, { x: 0.13 * k, y: 0.0, z: s * 0.06 * k }, 8));
        rig.add(sk, 'glow:#ff3aa0', G.sphere(0.02 * k, { x: 0.155 * k, y: 0.0, z: s * 0.06 * k }, 6));
      }
      rig.add(sk, 'blackSun', G.cone(0.025 * k, 0.04 * k, { x: 0.16 * k, y: -0.06 * k, rx: PI }, 3));
      for (let i = 0; i < 4; i++) rig.add(sk, 'bone', G.box(0.02, 0.03, 0.02, { x: 0.15 * k, y: -0.14 * k, z: (i - 1.5) * 0.03 * k }));
      rig.add(sk, 'glow:#8a2aff', G.cyl(0.1 * k, 0.1 * k, 0.01, { y: 0.13 * k }, 12));
      const fl = rig.bone('flames', sk, { y: 0.13 * k });
      flameCones(rig, fl, ['#ff3aa0', '#9a4dff', '#ff7ad0'], S3(T, 4, 6, 8), 0.06 * k, 0.16, k);
      if (T === 3) {
        for (const s of [-1, 1]) rig.add(sk, 'bone', G.cone(0.03, 0.14, { x: -0.04, y: 0.12, z: s * 0.13, rx: s * 0.6 }, 6));
      }
      return { height: 0.75 * k };
    },
    anim(B, t) {
      B.flames.scale.set(1, 1 + Math.sin(t * 12) * 0.15, 1);
      B.flames.rotation.y = t * 2;
      B.skull.rotation.y = Math.sin(t * 0.8) * 0.4;
    },
  },

  // วังวนสูญญะ — วงแหวนแตกโคจรรอบหลุมดำ
  'dark+wind': {
    build(rig, h, T) {
      const k = S3(T, 0.85, 1, 1.18);
      rig.add(h, 'obsidian', G.cyl(0.1, 0.18, 0.14, { y: 0.07 }, 6));
      const cy = 0.5 * k;
      const hole = rig.bone('hole', h, { y: cy });
      rig.add(hole, 'blackSun', G.sphere(0.1 * k, {}, 16));
      const disc = rig.bone('disc', hole);
      rig.add(disc, 'glow:#9a4dff', G.torus(0.17 * k, 0.03 * k, { rx: PI / 2, s: [1, 1, 0.25] }));
      rig.add(disc, 'glow:#e0b0ff', G.torus(0.13 * k, 0.012, { rx: PI / 2 }));
      const rings = S3(T, 1, 2, 3);
      for (let r = 0; r < rings; r++) {
        const b = rig.bone('frag' + r, hole);
        const rad = (0.27 + r * 0.07) * k;
        for (let i = 0; i < 4; i++) {
          rig.add(b, 'obsidian', G.torus(rad, 0.018, { rz: (i * PI) / 2 }, PI / 2 - 0.35));
          rig.add(b, 'glow:#b070ff', G.torus(rad, 0.006, { rz: (i * PI) / 2 + 0.05, z: 0.012 }, PI / 2 - 0.45));
        }
      }
      return { height: cy + 0.4 * k };
    },
    anim(B, t) {
      B.disc.rotation.y = t * 3;
      if (B.frag0) B.frag0.rotation.set(1.1, t * 1.2, 0);
      if (B.frag1) B.frag1.rotation.set(-0.6, -t * 0.9, 0.4);
      if (B.frag2) B.frag2.rotation.set(0.3, t * 0.7, 1.2);
    },
  },

  // สุสานพันธนาการ — หลุมศพหินดำ มีโซ่เงาจากพื้น
  'dark+earth': {
    build(rig, h, T) {
      const k = S3(T, 0.85, 1, 1.15);
      rig.add(h, 'rock', G.ell(0.28 * k, 0.07, 0.2 * k, { y: 0.02 }, 12));
      const H = S3(T, 0.36, 0.46, 0.58);
      rig.add(h, 'obsidian', G.box(0.06, H, 0.22 * k, { x: -0.08, y: H / 2 + 0.04 }));
      rig.add(h, 'obsidian', G.cyl(0.11 * k, 0.11 * k, 0.06, { x: -0.08, y: H + 0.04, rx: PI / 2, ry: PI / 2 }, 12));
      rig.add(h, 'glow:#9a4dff', G.box(0.065, 0.12, 0.02, { x: -0.08, y: H * 0.65 }), G.box(0.065, 0.02, 0.09, { x: -0.08, y: H * 0.72 }));
      const ch = rig.bone('chains', h);
      const anchors = S3(T, 2, 3, 4);
      for (let i = 0; i < anchors; i++) {
        const a = -PI / 2 + (i / Math.max(1, anchors - 1) - 0.5) * 2.4 + PI;
        const gx = Math.cos(a) * 0.36, gz = Math.sin(a) * 0.36;
        chain(rig, ch, 'iron', [[gx, 0.02, gz], [(gx - 0.08) * 0.5, H * 0.5, gz * 0.5], [-0.05, H * 0.78, gz * 0.15]], 0.022);
        rig.add(ch, 'glow:#7a3dff', G.torus(0.04, 0.008, { x: gx, y: 0.02, z: gz, rx: PI / 2 }));
      }
      if (T === 3) {
        for (const s of [-1, 1]) rig.add(h, 'obsidian', G.cone(0.04, 0.3, { x: 0.18, y: 0.15, z: s * 0.22 }, 4));
      }
      return { height: H + 0.25 };
    },
    anim(B, t) {
      if (B.chains) B.chains.position.y = Math.sin(t * 2) * 0.01;
    },
  },

  // บ่อลาวา — เตาภูเขาไฟ มีรางน้ำและลาวาไหล
  'fire+water': {
    build(rig, h, T) {
      const k = S3(T, 0.85, 1, 1.15);
      const H = 0.38 * k;
      rig.add(h, 'stone', G.torus(0.33 * k, 0.04, { y: 0.04, rx: PI / 2 }));
      rig.add(h, 'water', G.torus(0.33 * k, 0.025, { y: 0.07, rx: PI / 2, s: [1, 1, 0.5] }));
      rig.add(h, 'rock', G.lathe([[0.28 * k, 0], [0.24 * k, H * 0.4], [0.13 * k, H * 0.9], [0.1 * k, H], [0.07 * k, H - 0.03], [0, H - 0.04]], {}, 12));
      rig.add(h, 'lava', G.cyl(0.075 * k, 0.075 * k, 0.01, { y: H - 0.025 }, 12));
      ring(S3(T, 3, 4, 5), 1, (c, s, a) => {
        rig.add(h, 'lava', G.tube([[c * 0.09 * k, H - 0.01, s * 0.09 * k], [c * 0.16 * k, H * 0.65, s * 0.16 * k], [c * 0.25 * k, H * 0.2, s * 0.25 * k], [c * 0.3 * k, 0.06, s * 0.3 * k]], [0.022, 0.014], {}, 10, 5));
      });
      const sm = rig.bone('steam', h, { y: H + 0.05 });
      rig.add(sm, 'steam', G.sphere(0.07, { y: 0.06 }, 8), G.sphere(0.05, { x: 0.04, y: 0.15 }, 8));
      if (T === 3) {
        const emb = rig.bone('embers', h, { y: H + 0.1 });
        ring(5, 0.2, (x, z, a, i) => rig.add(emb, 'glow:#ffcf4a', G.octa(0.02, { x, y: Math.sin(i) * 0.05, z })));
      }
      return { height: H + 0.25 };
    },
    anim(B, t) {
      B.steam.position.y = baseY(B.steam) + ((t * 0.3) % 1) * 0.15;
      B.steam.scale.setScalar(0.7 + ((t * 0.3) % 1) * 0.6);
      if (B.embers) B.embers.rotation.y = t;
    },
  },

  // พายุเหมันต์ — ผลึกน้ำแข็งกลางวงพายุ
  'water+wind': {
    build(rig, h, T) {
      const k = S3(T, 0.85, 1, 1.15);
      rig.add(h, 'stone', G.cyl(0.14, 0.2, 0.08, { y: 0.04 }, 8));
      rig.add(h, 'crystal:#cff4ff', G.octa(0.06, { x: 0.08, y: 0.1, s: [0.7, 1.6, 0.7], rz: -0.4 }), G.octa(0.05, { x: -0.07, y: 0.09, z: 0.05, s: [0.7, 1.4, 0.7], rz: 0.4 }));
      const cy = 0.42 * k;
      const ice = rig.bone('ice', h, { y: cy });
      rig.add(ice, 'crystal:#dff8ff', G.octa(1, { s: [0.09 * k, 0.2 * k, 0.09 * k] }));
      ring(S3(T, 3, 4, 6), 0.06 * k, (x, z, a) => rig.add(ice, 'crystal:#bfefff', G.octa(1, { x, z, rx: Math.sin(a) * 0.8, rz: -Math.cos(a) * 0.8, s: [0.035, 0.1 * k, 0.035] })));
      rig.add(ice, 'glow:#ffffff', G.octa(1, { s: [0.03, 0.08, 0.03] }));
      const st = rig.bone('storm', h, { y: 0.12 });
      for (let a = 0; a < S3(T, 2, 3, 3); a++) {
        rig.add(st, 'glow:#dff6ff', G.tube(helix(0.3 * k, 0.55 * k, 1.1, 40, (a * 2 * PI) / 3, 0, 0.2), (t) => 0.012 * Math.sin(t * PI) + 0.002, {}, 44, 4));
      }
      const fl = rig.bone('flakes', h, { y: cy });
      ring(S3(T, 4, 6, 8), 0.34 * k, (x, z, a, i) => rig.add(fl, 'glow:#ffffff', G.octa(0.022, { x, y: Math.sin(i * 2.1) * 0.15, z })));
      return { height: cy + 0.3 * k };
    },
    anim(B, t) {
      B.ice.rotation.y = t * 0.6;
      B.storm.rotation.y = -t * 3;
      B.flakes.rotation.y = t * 2.2;
    },
  },

  // บึงดูด — บ่อโคลนล้อมด้วยเสาหิน
  'earth+water': {
    build(rig, h, T) {
      const k = S3(T, 0.85, 1, 1.15);
      const R = 0.3 * k;
      rig.add(h, 'rock', G.torus(R, 0.04, { y: 0.03, rx: PI / 2 }));
      rig.add(h, 'mud', G.cyl(R, R, 0.03, { y: 0.04 }, 18));
      const bub = rig.bone('bubbles', h, { y: 0.06 });
      ring(S3(T, 3, 4, 6), R * 0.5, (x, z, a, i) => rig.add(bub, 'mud', G.ell(0.03 + (i % 2) * 0.01, 0.02, 0.03 + (i % 2) * 0.01, { x, z }, 8)));
      ring(S3(T, 4, 5, 6), R + 0.07, (x, z, a, i) => {
        const hh = 0.24 + (i % 3) * 0.08 + (T - 1) * 0.06;
        rig.add(h, 'stone', G.box(0.07, hh, 0.06, { x, y: hh / 2, z, ry: -a, rz: (i % 2 ? 0.08 : -0.06) }));
        rig.add(h, 'moss', G.box(0.075, 0.02, 0.065, { x, y: hh, z, ry: -a }));
      });
      for (let i = 0; i < 5; i++) rig.add(h, 'moss', G.cyl(0.006, 0.004, 0.18, { x: Math.cos(i * 1.3) * R * 0.8, y: 0.12, z: Math.sin(i * 1.3) * R * 0.8, rz: (i % 2 ? 0.2 : -0.2) }, 4));
      return { height: 0.55 };
    },
    anim(B, t) {
      B.bubbles.children.forEach((c) => { c.scale.y = 0.6 + Math.abs(Math.sin(t * 2)) * 0.8; });
      B.bubbles.rotation.y = t * 0.3;
    },
  },

  // พายุเพลิง — กังหันโลหะโอบกรวยไฟ
  'fire+wind': {
    build(rig, h, T) {
      const k = S3(T, 0.85, 1, 1.15);
      const H = S3(T, 0.5, 0.62, 0.76);
      rig.add(h, 'iron', G.cyl(0.24 * k, 0.26 * k, 0.05, { y: 0.025 }, 14));
      const cone = rig.bone('fireCone', h, { y: 0.05 });
      rig.add(cone, 'glow:#ff7a1e', G.cyl(0.14 * k, 0.03, H * 0.95, { y: H * 0.47, }, 12));
      rig.add(cone, 'glow:#ffd27a', G.cyl(0.07 * k, 0.015, H * 0.8, { y: H * 0.4 }, 10));
      const tb = rig.bone('turbine', h, { y: 0.05 });
      ring(S3(T, 5, 6, 8), 1, (c, s, a) => {
        rig.add(tb, 'iron', G.tube([[c * 0.24 * k, 0, s * 0.24 * k], [Math.cos(a + 0.4) * 0.22 * k, H * 0.5, Math.sin(a + 0.4) * 0.22 * k], [Math.cos(a + 0.8) * 0.17 * k, H, Math.sin(a + 0.8) * 0.17 * k]], [0.018, 0.012], {}, 10, 4));
      });
      rig.add(tb, 'iron', G.torus(0.17 * k, 0.014, { y: H, rx: PI / 2 }), G.torus(0.23 * k, 0.012, { y: H * 0.5, rx: PI / 2 }));
      if (T === 3) rig.add(tb, 'copper', G.torus(0.25 * k, 0.012, { y: H * 0.2, rx: PI / 2 }));
      return { height: H + 0.15 };
    },
    anim(B, t, dt, boost) {
      B.turbine.rotation.y += dt * (2.5 + boost * 8);
      B.fireCone.rotation.y = -t * 4;
      B.fireCone.scale.set(1, 1 + Math.sin(t * 11) * 0.06, 1);
    },
  },

  // ปืนหลอมเกราะ — ปืนใหญ่เหล็กบนฐานเตาหิน
  'earth+fire': {
    build(rig, h, T) {
      const k = S3(T, 0.85, 1, 1.15);
      rig.add(h, 'stone', G.box(0.42 * k, 0.2 * k, 0.42 * k, { y: 0.1 * k }));
      rig.add(h, 'iron', G.box(0.44 * k, 0.03, 0.44 * k, { y: 0.2 * k }));
      for (let i = 0; i < 4; i++) {
        const a = (i * PI) / 2;
        rig.add(h, 'glow:#ff6a1e', G.box(0.12, 0.06, 0.01, { x: Math.cos(a) * 0.212 * k, y: 0.09 * k, z: Math.sin(a) * 0.212 * k, ry: -a + PI / 2 }));
        for (let b = -1; b <= 1; b++) rig.add(h, 'iron', G.box(0.008, 0.07, 0.012, { x: Math.cos(a) * 0.216 * k + Math.sin(a) * b * 0.035, y: 0.09 * k, z: Math.sin(a) * 0.216 * k - Math.cos(a) * b * 0.035, ry: -a + PI / 2 }));
      }
      if (T >= 2) rig.add(h, 'stone', G.cyl(0.04, 0.05, 0.3, { x: -0.16, y: 0.3, z: -0.16 }, 8));
      const aim = rig.bone('aim', h, { y: 0.24 * k });
      rig.add(aim, 'iron', G.cyl(0.12 * k, 0.14 * k, 0.06, {}, 12));
      for (const s of [-1, 1]) rig.add(aim, 'iron', G.box(0.18, 0.12, 0.025, { y: 0.07, z: s * 0.09 * k }));
      const len = S3(T, 0.34, 0.42, 0.5);
      rig.add(aim, 'iron', G.tube([[-0.14, 0.1, 0], [0.1, 0.12, 0], [len, 0.15, 0]], [S3(T, 0.075, 0.085, 0.095), S3(T, 0.06, 0.065, 0.07)], {}, 10, 12));
      for (const x of [-0.05, 0.12, len - 0.06]) rig.add(aim, 'iron', G.torus(0.085 - x * 0.04, 0.016, { x, y: 0.11 + x * 0.08, ry: PI / 2, rx: 0.1 }));
      rig.add(aim, 'glow:#ff7a1e', G.torus(S3(T, 0.06, 0.066, 0.072), 0.012, { x: len, y: 0.15, ry: PI / 2, rx: 0.1 }));
      rig.add(aim, 'glow:#ffb030', G.cyl(0.05, 0.05, 0.01, { x: len + 0.005, y: 0.15, rz: PI / 2 - 0.1 }, 10));
      return { aim: 'aim', height: 0.5 * k };
    },
    anim() {},
  },

  // พายุทราย — เสาหินทรายกับวงหินบด
  'earth+wind': {
    build(rig, h, T) {
      const k = S3(T, 0.85, 1, 1.15);
      const H = S3(T, 0.5, 0.66, 0.82);
      rig.add(h, 'sand', G.lathe([[0.16, 0], [0.12, 0.06], [0.1, H * 0.3], [0.08, H * 0.6], [0.1, H - 0.04], [0.13, H], [0, H]], {}, 8));
      for (const y of [0.15, H * 0.55]) rig.add(h, 'sandDark', G.torus(0.1, 0.012, { y, rx: PI / 2 }));
      rig.add(h, 'glow:#ffd27a', G.sphere(0.05, { y: H + 0.03 }, 10));
      const gr = rig.bone('grind', h, { y: H * 0.55 });
      ring(S3(T, 4, 6, 8), 0.28 * k, (x, z, a, i) => rig.add(gr, 'sand', G.ico(0.05 + (i % 2) * 0.015, { x, y: Math.sin(i * 1.7) * 0.05, z, rx: i, ry: i * 2 }, 0)));
      const sw = rig.bone('swirl', h);
      rig.add(sw, 'glow:#e8c27a', G.tube(helix(0.22 * k, H * 0.9, 1.4, 40, 0, 0.05, 0.3), (t) => 0.012 * Math.sin(t * PI) + 0.002, {}, 44, 4));
      if (T === 3) rig.add(sw, 'glow:#e8c27a', G.tube(helix(0.26, H * 0.8, 1.2, 40, PI, 0.08, 0.3), (t) => 0.01 * Math.sin(t * PI) + 0.002, {}, 44, 4));
      return { height: H + 0.1 };
    },
    anim(B, t, dt, boost) {
      B.grind.rotation.y += dt * (1.8 + boost * 4);
      B.swirl.rotation.y = -t * 2.6;
    },
  },

  /* ================= สามธาตุ ================= */

  // พายุลาวา — เกลียวลาวาหมุนรอบแกนไอน้ำ
  'fire+water+wind': {
    build(rig, h, T) {
      const k = S3(T, 0.9, 1, 1.18);
      const H = 0.8 * k;
      ring(8, 0.28 * k, (x, z, a, i) => rig.add(h, 'rock', G.ico(0.07, { x, y: 0.04, z, rx: i }, 0)));
      rig.add(h, 'lava', G.cyl(0.24 * k, 0.24 * k, 0.02, { y: 0.03 }, 16));
      rig.add(h, 'steam', G.cyl(0.06, 0.09, H, { y: H / 2 }, 12));
      rig.add(h, 'glow:#ffffff', G.cyl(0.02, 0.02, H, { y: H / 2 }, 6));
      const hx = rig.bone('helix', h);
      for (let a = 0; a < (T === 3 ? 3 : 2); a++) {
        rig.add(hx, 'lava', G.tube(helix(0.2 * k, H, 2, 60, (a * 2 * PI) / (T === 3 ? 3 : 2), 0.05, 0.25), (t) => 0.03 * (1 - t * 0.5), {}, 70, 6));
      }
      const top = rig.bone('steamTop', h, { y: H });
      rig.add(top, 'steam', G.sphere(0.1, {}, 10), G.sphere(0.07, { x: 0.07, y: 0.05 }, 8));
      return { height: H + 0.15 };
    },
    anim(B, t, dt, boost) {
      B.helix.rotation.y += dt * (2 + boost * 5);
      B.steamTop.scale.setScalar(1 + Math.sin(t * 3) * 0.12);
    },
  },

  // ปล่องปะทุ — เนินหินแตกร้าว มีลาวาและช่องไอน้ำ
  'earth+fire+water': {
    build(rig, h, T) {
      const k = S3(T, 0.9, 1, 1.18);
      const rocks = [[0, 0.12, 0, 0.22], [0.16, 0.08, 0.08, 0.13], [-0.15, 0.08, 0.1, 0.12], [0.05, 0.08, -0.17, 0.13], [-0.1, 0.07, -0.14, 0.11], [0.02, 0.28, 0.02, 0.14]];
      rocks.forEach(([x, y, z, r], i) => rig.add(h, 'rock', G.ico(r * k, { x: x * k, y: y * k, z: z * k, rx: i, ry: i * 2, s: [1, 0.85, 1] }, 0)));
      // รอยแตกลาวา
      for (let i = 0; i < 8; i++) {
        const a = i * 0.8;
        rig.add(h, 'lava', G.box(0.012, 0.16 * k, 0.012, { x: Math.cos(a) * 0.2 * k, y: 0.14 * k, z: Math.sin(a) * 0.2 * k, rx: Math.sin(a) * 0.6, rz: -Math.cos(a) * 0.6 }));
      }
      rig.add(h, 'lava', G.cyl(0.07 * k, 0.05 * k, 0.04, { x: 0.02, y: 0.4 * k, z: 0.02 }, 10));
      const vents = rig.bone('vents', h);
      for (const [x, z] of [[0.22, -0.05], [-0.18, -0.12], [-0.05, 0.22]]) {
        rig.add(h, 'stoneDark', G.cyl(0.03, 0.04, 0.08, { x: x * k, y: 0.06, z: z * k }, 6));
        rig.add(vents, 'steam', G.cone(0.04, 0.22, { x: x * k, y: 0.22, z: z * k, rx: PI }, 8));
      }
      const fl = rig.bone('flames', h, { x: 0.02, y: 0.42 * k, z: 0.02 });
      flameCones(rig, fl, ['#ff5a1e', '#ffb030', '#ffe08a'], 5, 0.03, 0.14, k);
      return { height: 0.75 * k };
    },
    anim(B, t) {
      B.flames.scale.set(1, 1 + Math.sin(t * 9) * 0.2, 1);
      B.vents.scale.set(1, 0.7 + Math.abs(Math.sin(t * 2.5)) * 0.5, 1);
    },
  },

  // ธารน้ำแข็ง — กังหันศิลาหุ้มผลึกน้ำแข็ง
  'earth+water+wind': {
    build(rig, h, T) {
      const k = S3(T, 0.9, 1, 1.18);
      const H = 0.6 * k;
      rig.add(h, 'slab', G.cyl(0.1, 0.18, H, { y: H / 2 }, 8));
      for (const y of [0.15, H * 0.6]) rig.add(h, 'crystal:#bfefff', G.torus(0.13 - y * 0.06, 0.015, { y, rx: PI / 2 }));
      rig.add(h, 'crystal:#cff4ff', G.octa(0.05, { x: 0.12, y: 0.12, s: [0.7, 1.6, 0.7], rz: -0.5 }), G.octa(0.045, { x: -0.1, y: 0.1, z: 0.09, s: [0.7, 1.5, 0.7], rz: 0.5 }));
      const aim = rig.bone('aim', h, { y: H });
      rig.add(aim, 'slab', G.box(0.18, 0.12, 0.12, { x: -0.02 }));
      rig.add(aim, 'slab', G.cyl(0.03, 0.03, 0.1, { x: 0.1, rz: PI / 2 }, 6));
      const rot = rig.bone('rotor', aim, { x: 0.16 });
      ring(T === 3 ? 4 : 3, 1, (c, s, a) => {
        const L = 0.34 * k;
        rig.add(rot, 'slab', G.box(0.04, L, 0.12, { y: c * L / 2, z: s * L / 2, rx: a }));
        for (let j = 0; j < 3; j++) rig.add(rot, 'crystal:#dff8ff', G.octa(0.04, { x: 0.03, y: c * (0.1 + j * 0.09) * k, z: s * (0.1 + j * 0.09) * k, rx: a, s: [0.8, 1.5, 0.8] }));
      });
      rig.add(rot, 'crystal:#bfefff', G.octa(0.05, { x: 0.03 }));
      const fr = rig.bone('frost', h, { y: H * 0.5 });
      ring(5, 0.3 * k, (x, z, a, i) => rig.add(fr, 'glow:#ffffff', G.octa(0.018, { x, y: Math.sin(i * 1.9) * 0.1, z })));
      return { aim: 'aim', height: H + 0.4 * k };
    },
    anim(B, t, dt, boost) {
      B.rotor.rotation.x += dt * (1.8 + boost * 8);
      B.frost.rotation.y = t * 1.4;
    },
  },

  // ฝนอุกกาบาต — วงหินลอยเหนือปล่องเพลิง
  'earth+fire+wind': {
    build(rig, h, T) {
      const k = S3(T, 0.9, 1, 1.18);
      rig.add(h, 'rock', G.lathe([[0.32 * k, 0], [0.3 * k, 0.1], [0.2 * k, 0.16], [0.14 * k, 0.15], [0.12 * k, 0.08], [0, 0.08]], {}, 12));
      rig.add(h, 'lava', G.cyl(0.13 * k, 0.13 * k, 0.01, { y: 0.13 }, 12));
      const fl = rig.bone('flames', h, { y: 0.13 });
      flameCones(rig, fl, ['#ff5a1e', '#ffb030', '#ffe08a'], 6, 0.07 * k, 0.16, k);
      const orb = rig.bone('rocks', h, { y: 0.62 * k });
      const n = T === 3 ? 7 : 6;
      ring(n, 0.3 * k, (x, z, a, i) => {
        rig.add(orb, 'rock', G.ico(0.06 * k + (i % 2) * 0.015, { x, y: Math.sin(i * 2) * 0.04, z, rx: i, ry: i * 2 }, 0));
        rig.add(orb, 'lava', G.box(0.01, 0.06, 0.01, { x: x * 1.05, y: Math.sin(i * 2) * 0.04, z: z * 1.05, rz: 0.6, ry: i }));
      });
      rig.add(orb, 'glow:#ff9a4a', G.torus(0.3 * k, 0.006, { rx: PI / 2 }));
      const core = rig.bone('meteorCore', h, { y: 0.62 * k });
      rig.add(core, 'rock', G.ico(0.09 * k, {}, 0));
      rig.add(core, 'lava', G.ico(0.095 * k, { s: [0.6, 1.05, 0.6] }, 0));
      return { height: 0.8 * k };
    },
    anim(B, t, dt, boost) {
      B.rocks.rotation.y = t * 0.9;
      B.rocks.rotation.x = Math.sin(t * 0.7) * 0.15;
      B.meteorCore.rotation.set(t * 1.3, t * 0.8, 0);
      B.flames.scale.set(1, 1 + Math.sin(t * 10) * 0.15 + boost * 0.4, 1);
    },
  },
};
