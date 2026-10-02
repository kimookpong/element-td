/* ============================================================
 *  สัตว์ในเทพนิยาย — โมเดล procedural พร้อมโครงกระดูกและแอนิเมชัน
 *  แกน +X = ด้านหน้า, ขนาดอ้างอิงที่ size 12 (ยาวราว 0.7 ช่อง)
 *
 *  normal  → หมาป่าคริสตัล (Fenrir)     fast    → ยูนิคอร์น
 *  armored → เต่ามังกร                  regen   → ไฮดรา 3 หัว
 *  split   → คิทสึเนะ 3 หาง (ร่างแยก 1 หาง)
 *  undead  → ฟีนิกซ์                    flying  → กริฟฟิน
 *  boss    → มังกรโบราณ
 * ============================================================ */
import * as THREE from 'three';
import { ELEMENTS } from './data.js';
import { Rig, G, xf } from './modelkit.js';

const PI = Math.PI;

/* ---------------- ชิ้นส่วนที่ใช้ซ้ำ ---------------- */
function leg(rig, parent, name, [x, y, z], o) {
  const { upper, lower, r1, r2, foot = 'paw', thigh = 0, role = 'body', splay = 0 } = o;
  const hip = rig.bone(name, parent, { x, y, z, rx: splay });
  rig.add(hip, role, G.tube([[0, 0.01, 0], [0.012, -upper * 0.5, 0], [0.008, -upper, 0]], [r1, r1 * 0.78], {}, 8, 7));
  if (thigh) rig.add(hip, role, G.ell(thigh * 1.05, thigh * 1.35, thigh * 0.85, { x: -0.01, y: -upper * 0.22 }, 12));
  const knee = rig.bone(name + 'K', hip, { x: 0.008, y: -upper });
  rig.add(knee, role, G.sphere(r1 * 0.8, {}, 8));
  rig.add(knee, role, G.tube([[0, 0, 0], [-0.012, -lower * 0.5, 0], [0, -lower, 0]], [r1 * 0.75, r2], {}, 8, 7));
  const fy = -lower;
  if (foot === 'hoof') {
    rig.add(knee, 'dark', G.cyl(r2 * 1.15, r2 * 1.4, r2 * 1.5, { y: fy - r2 * 0.4 }, 10));
    rig.add(knee, 'fur', G.cyl(r2 * 1.5, r2 * 1.1, r2 * 1.2, { y: fy + r2 * 0.6 }, 10));
  } else if (foot === 'talon') {
    rig.add(knee, 'gold', G.sphere(r2 * 1.1, { y: fy }, 8));
    for (const a of [-0.45, 0, 0.45]) {
      rig.add(knee, 'dark', G.tube([[0, fy, 0], [r2 * 2.2 * Math.cos(a), fy - r2 * 0.6, r2 * 2.2 * Math.sin(a)], [r2 * 3 * Math.cos(a), fy - r2 * 1.6, r2 * 3 * Math.sin(a)]], [r2 * 0.45, 0.001], {}, 6, 5));
    }
  } else {
    rig.add(knee, 'dark', G.ell(r2 * 1.7, r2 * 0.75, r2 * 1.35, { x: r2 * 0.5, y: fy - r2 * 0.2 }, 10));
    for (const zz of [-1, 0, 1]) {
      rig.add(knee, foot === 'claw' ? 'horn' : 'dark', G.cone(r2 * 0.32, r2 * (foot === 'claw' ? 1.6 : 0.9), { x: r2 * 1.9, y: fy - r2 * 0.4, z: zz * r2 * 0.65, rz: -PI / 2 - 0.4 }, 5));
    }
  }
  return { hip, knee };
}

function walk(legs, phase, amp, moving) {
  for (const l of legs) {
    const s = Math.sin(phase + l.off);
    l.hip.rotation.z = s * amp * moving;
    l.knee.rotation.z = (l.back ? 1 : -1) * Math.max(0, Math.cos(phase + l.off)) * amp * 0.9 * moving;
  }
}

// ขนเป็นกระจุก (กรวยเรียงเป็นวงรอบแกน X)
function ruff(rig, bone, role, { x, y, r, n = 12, len = 0.12, rad = 0.035, tilt = 0.6 }) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2;
    rig.add(bone, role, G.cone(rad, len, { x, y: y + Math.sin(a) * r, z: Math.cos(a) * r, rx: PI / 2 - a, rz: tilt }, 5));
  }
}

// หางเป็นปล้องต่อกัน
function tailChain(rig, parent, name, start, segs, build) {
  let p = rig.bone(name + '0', parent, start);
  const bones = [p];
  for (let i = 0; i < segs; i++) {
    build(p, i);
    if (i < segs - 1) {
      p = rig.bone(name + (i + 1), p, { x: -build.len(i) });
      bones.push(p);
    }
  }
  return bones;
}

// ปีกขนนก (ฝั่ง side = 1 ซ้าย / -1 ขวา)
function featherWing(rig, bone, span, { n = 11, len = 0.16, w = 0.03, roleA = 'feather', roleB = 'feather2', arm = 'body', tipGlow = true }) {
  const m = (g) => xf(g, { s: [1, 1, bone.userData.side] });
  rig.add(bone, arm, m(G.tube([[0, 0, 0], [0.02, 0.02, span * 0.45], [-0.02, 0.025, span]], [0.024, 0.008], {}, 10, 6)));
  for (let k = 0; k < n; k++) {
    const s = k / (n - 1);
    const l = len * (0.65 + 0.7 * Math.sin(s * PI * 0.85));
    rig.add(bone, k % 2 ? roleB : roleA, m(G.feather(l, w, { x: -0.005 - s * 0.03, y: 0.015 - k * 0.0006, z: 0.02 + s * span * 0.95, ry: -PI / 2 + s * 1.05 })));
  }
  // ขนชั้นในทับอีกแถว
  for (let k = 0; k < n - 3; k++) {
    const s = k / (n - 1);
    rig.add(bone, roleB, m(G.feather(len * 0.55, w * 0.9, { x: -0.005, y: 0.022, z: 0.03 + s * span * 0.8, ry: -PI / 2 + s * 0.6 })));
  }
  if (tipGlow) rig.add(bone, 'glow', m(G.octa(0.018, { x: -0.03, y: 0.03, z: span, s: [1, 1, 2.5] })));
}

/* ============================================================
 *  แบบจำลองแต่ละตัว: build(rig, variant) → ข้อมูล, anim(B, st, dt, t, mv)
 * ============================================================ */
const DEFS = {
  /* ---------- หมาป่าคริสตัล ---------- */
  wolf: {
    tint: 0.12,
    build(rig) {
      const body = rig.bone('body');
      rig.add(body, 'body',
        G.ell(0.25, 0.125, 0.115, { y: 0.37 }),
        G.ell(0.15, 0.145, 0.125, { x: 0.13, y: 0.385 }),
        G.ell(0.13, 0.12, 0.11, { x: -0.15, y: 0.375 }));
      rig.add(body, 'belly', G.ell(0.19, 0.07, 0.09, { y: 0.3 }));
      ruff(rig, body, 'fur', { x: 0.17, y: 0.42, r: 0.105, n: 14, len: 0.13 });
      ruff(rig, body, 'fur', { x: 0.1, y: 0.43, r: 0.09, n: 10, len: 0.1 });
      for (let i = 0; i < 5; i++) rig.add(body, 'glow', G.octa(0.026, { x: 0.08 - i * 0.075, y: 0.5 - Math.abs(i - 1.5) * 0.008, s: [0.9, 2.8 - i * 0.3, 0.9] }));
      const neck = rig.bone('neck', body, { x: 0.22, y: 0.43 });
      rig.add(neck, 'body', G.tube([[-0.04, -0.02, 0], [0.05, 0.03, 0], [0.1, 0.06, 0]], [0.078, 0.062], {}, 8, 8));
      const head = rig.bone('head', neck, { x: 0.11, y: 0.07 });
      rig.add(head, 'body', G.ell(0.088, 0.074, 0.078), G.tube([[0.02, -0.005, 0], [0.09, -0.022, 0], [0.165, -0.036, 0]], [0.052, 0.03], {}, 8, 8));
      rig.add(head, 'dark', G.sphere(0.02, { x: 0.168, y: -0.03 }, 8));
      rig.add(head, 'body', G.ell(0.04, 0.018, 0.035, { x: 0.05, y: 0.055, z: 0.03 }), G.ell(0.04, 0.018, 0.035, { x: 0.05, y: 0.055, z: -0.03 }));
      for (const s of [-1, 1]) {
        rig.add(head, 'body', G.cone(0.034, 0.11, { x: -0.025, y: 0.085, z: s * 0.045, rz: 0.25, rx: -s * 0.25 }, 6));
        rig.add(head, 'glow', G.cone(0.018, 0.075, { x: -0.018, y: 0.08, z: s * 0.047, rz: 0.25, rx: -s * 0.25 }, 5));
        rig.add(head, 'eye', G.sphere(0.017, { x: 0.068, y: 0.025, z: s * 0.05 }, 8));
        rig.add(head, 'fur', G.cone(0.025, 0.08, { x: -0.03, y: -0.02, z: s * 0.065, rx: -s * 1.2, rz: 1.1 }, 5));
      }
      const jaw = rig.bone('jaw', head, { x: 0.03, y: -0.045 });
      rig.add(jaw, 'belly', G.tube([[0, 0, 0], [0.07, -0.006, 0], [0.12, -0.008, 0]], [0.034, 0.02], {}, 6, 7));
      for (const s of [-1, 1]) rig.add(jaw, 'horn', G.cone(0.007, 0.03, { x: 0.105, y: 0.016, z: s * 0.014 }, 4));
      const legs = [
        { ...leg(rig, body, 'fl', [0.15, 0.33, 0.07], { upper: 0.15, lower: 0.15, r1: 0.04, r2: 0.022 }), off: 0 },
        { ...leg(rig, body, 'fr', [0.15, 0.33, -0.07], { upper: 0.15, lower: 0.15, r1: 0.04, r2: 0.022 }), off: PI },
        { ...leg(rig, body, 'bl', [-0.16, 0.34, 0.07], { upper: 0.14, lower: 0.17, r1: 0.042, r2: 0.022, thigh: 0.07 }), off: PI, back: true },
        { ...leg(rig, body, 'br', [-0.16, 0.34, -0.07], { upper: 0.14, lower: 0.17, r1: 0.042, r2: 0.022, thigh: 0.07 }), off: 0, back: true },
      ];
      const lens = [0.12, 0.13, 0.12];
      const b = (bone, i) => {
        const r = [0.042, 0.055, 0.05][i];
        rig.add(bone, 'fur', G.tube([[0.03, 0, 0], [-lens[i] / 2, 0, 0], [-lens[i] - 0.03, 0, 0]], (t) => r * (0.75 + 0.35 * Math.sin(t * PI)) * (i === 2 ? 1 - t * 0.85 : 1), {}, 8, 9));
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * PI * 2 + i;
          rig.add(bone, 'fur', G.cone(r * 0.4, r * 1.4, { x: -lens[i] * 0.6, y: Math.sin(a) * r * 0.7, z: Math.cos(a) * r * 0.7, rx: PI / 2 - a, rz: 1.2 }, 4));
        }
        if (i === 2) rig.add(bone, 'glow', G.cone(0.03, 0.08, { x: -lens[i] - 0.04, rz: PI / 2 }, 6));
      };
      b.len = (i) => lens[i];
      tailChain(rig, body, 'tail', { x: -0.27, y: 0.4, rz: -0.55 }, 3, b);
      return { height: 0.64, legs: legs.map((l) => ({ hip: l.hip.name, knee: l.knee.name, off: l.off, back: !!l.back })) };
    },
    anim(B, st, dt, t, mv, info, fast) {
      st.phase += dt * (fast ? 15 : 11) * mv;
      walk(st.legs, st.phase, 0.62, mv);
      B.body.position.y = Math.abs(Math.cos(st.phase)) * 0.022 * mv;
      for (let i = 0; i < 3; i++) B['tail' + i].rotation.y = Math.sin(t * 6 - i * 0.6) * 0.25;
      B.head.rotation.z = Math.sin(st.phase * 2) * 0.04 * mv + Math.sin(t * 0.7) * 0.06;
      B.jaw.rotation.z = -Math.max(0, Math.sin(t * 2.3)) * 0.18;
    },
  },

  /* ---------- ยูนิคอร์น ---------- */
  unicorn: {
    tint: 0.62,
    build(rig) {
      const body = rig.bone('body');
      rig.add(body, 'body',
        G.ell(0.24, 0.115, 0.1, { y: 0.5 }),
        G.ell(0.13, 0.13, 0.105, { x: 0.15, y: 0.51 }),
        G.ell(0.125, 0.12, 0.105, { x: -0.16, y: 0.515 }));
      rig.add(body, 'belly', G.ell(0.17, 0.055, 0.08, { y: 0.44 }));
      const neck = rig.bone('neck', body, { x: 0.2, y: 0.55 });
      rig.add(neck, 'body', G.tube([[-0.03, -0.03, 0], [0.05, 0.08, 0], [0.09, 0.19, 0]], [0.072, 0.045], {}, 10, 8));
      for (let i = 0; i < 8; i++) {
        const k = i / 7;
        rig.add(neck, 'mane', G.box(0.012, 0.075 - k * 0.02, 0.05 + Math.sin(k * PI) * 0.03, { x: 0.02 + k * 0.06 - 0.06, y: k * 0.18 + 0.02, z: (i % 2 ? 0.012 : -0.012), rz: 0.55 }));
      }
      const head = rig.bone('head', neck, { x: 0.095, y: 0.2, rz: -0.75 });
      rig.add(head, 'body', G.ell(0.07, 0.056, 0.05), G.ell(0.075, 0.046, 0.043, { x: 0.085, y: -0.012 }));
      rig.add(head, 'dark', G.sphere(0.009, { x: 0.155, y: -0.005, z: 0.02 }, 6), G.sphere(0.009, { x: 0.155, y: -0.005, z: -0.02 }, 6));
      for (const s of [-1, 1]) {
        rig.add(head, 'body', G.cone(0.02, 0.07, { x: -0.03, y: 0.05, z: s * 0.03, rz: 0.35, rx: -s * 0.2 }, 6));
        rig.add(head, 'eye', G.sphere(0.013, { x: 0.035, y: 0.02, z: s * 0.045 }, 8));
      }
      rig.add(head, 'gold', G.tube([[0.0, 0.045, 0], [0.04, 0.12, 0], [0.085, 0.21, 0]], (t) => 0.019 * (1 - t) * (0.82 + 0.18 * Math.sin(t * 44)), {}, 24, 6));
      rig.add(head, 'glow', G.octa(0.016, { x: 0.088, y: 0.215 }));
      for (let i = 0; i < 4; i++) rig.add(head, 'mane', G.box(0.01, 0.06, 0.045, { x: -0.045 - i * 0.012, y: 0.05 - i * 0.012, z: (i % 2 ? 0.01 : -0.01), rz: 0.9 }));
      const legs = [
        { ...leg(rig, body, 'fl', [0.15, 0.44, 0.06], { upper: 0.2, lower: 0.21, r1: 0.032, r2: 0.018, foot: 'hoof' }), off: 0 },
        { ...leg(rig, body, 'fr', [0.15, 0.44, -0.06], { upper: 0.2, lower: 0.21, r1: 0.032, r2: 0.018, foot: 'hoof' }), off: 0.35 },
        { ...leg(rig, body, 'bl', [-0.17, 0.45, 0.06], { upper: 0.19, lower: 0.22, r1: 0.036, r2: 0.018, foot: 'hoof', thigh: 0.06 }), off: PI, back: true },
        { ...leg(rig, body, 'br', [-0.17, 0.45, -0.06], { upper: 0.19, lower: 0.22, r1: 0.036, r2: 0.018, foot: 'hoof', thigh: 0.06 }), off: PI + 0.35, back: true },
      ];
      const b = (bone, i) => {
        rig.add(bone, 'mane', G.tube([[0, 0, 0], [-0.05, -0.02, 0.01], [-0.11, -0.04, 0]], [0.034 - i * 0.006, 0.026 - i * 0.006], {}, 8, 7));
        if (i === 2) rig.add(bone, 'glow', G.ell(0.03, 0.02, 0.02, { x: -0.12, y: -0.04 }, 8));
      };
      b.len = () => 0.11;
      tailChain(rig, body, 'tail', { x: -0.27, y: 0.55, rz: 0.55 }, 3, b);
      return { height: 0.85, legs: legs.map((l) => ({ hip: l.hip.name, knee: l.knee.name, off: l.off, back: !!l.back })) };
    },
    anim(B, st, dt, t, mv) {
      st.phase += dt * 12 * mv;
      walk(st.legs, st.phase, 0.75, mv);
      B.body.position.y = Math.abs(Math.sin(st.phase)) * 0.04 * mv;
      B.body.rotation.z = Math.sin(st.phase) * 0.06 * mv;
      B.neck.rotation.z = Math.sin(st.phase + 1) * 0.08 * mv;
      for (let i = 0; i < 3; i++) B['tail' + i].rotation.z = B['tail' + i].userData.rest.z + Math.sin(t * 5 - i) * 0.2;
    },
  },

  /* ---------- เต่ามังกร ---------- */
  turtle: {
    tint: 0.1,
    build(rig) {
      const body = rig.bone('body');
      rig.add(body, 'shell', G.lathe([[0, 0], [0.3, 0], [0.33, 0.04], [0.31, 0.1], [0.26, 0.17], [0.17, 0.225], [0.06, 0.25], [0, 0.255]], { y: 0.2, s: [1, 1, 0.86] }, 18));
      rig.add(body, 'dark', G.torus(0.315, 0.028, { y: 0.215, rx: PI / 2, s: [1, 0.86, 1] }));
      rig.add(body, 'belly', G.ell(0.3, 0.07, 0.25, { y: 0.2 }));
      // แผ่นเกล็ดหกเหลี่ยม + หนาม
      const plates = [[0, 0.452, 0, 0, 0]];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * PI * 2 + PI / 6;
        plates.push([Math.cos(a) * 0.19, 0.4, Math.sin(a) * 0.165, Math.sin(a) * 0.55, -Math.cos(a) * 0.55]);
      }
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * PI * 2;
        plates.push([Math.cos(a) * 0.28, 0.3, Math.sin(a) * 0.24, Math.sin(a) * 1.0, -Math.cos(a) * 1.0]);
      }
      plates.forEach(([x, y, z, rx, rz], k) => {
        const big = k < 7;
        rig.add(body, 'shell2', G.cyl(big ? 0.075 : 0.048, big ? 0.085 : 0.055, 0.03, { x, y, z, rx, rz }, 6));
        if (big) rig.add(body, 'horn', G.cone(0.025, 0.08, { x: x * 1.08, y: y + 0.04, z: z * 1.08, rx: rx * 1.2, rz: rz * 1.2 }, 6));
      });
      const neck = rig.bone('neck', body, { x: 0.3, y: 0.26 });
      rig.add(neck, 'body', G.tube([[-0.06, -0.02, 0], [0.05, 0.03, 0], [0.12, 0.07, 0]], [0.085, 0.062], {}, 8, 8));
      const head = rig.bone('head', neck, { x: 0.13, y: 0.075 });
      rig.add(head, 'body', G.ell(0.09, 0.072, 0.078), G.ell(0.085, 0.05, 0.062, { x: 0.085, y: -0.018 }));
      rig.add(head, 'dark', G.ell(0.06, 0.02, 0.05, { x: 0.04, y: 0.055 }));
      for (const s of [-1, 1]) {
        rig.add(head, 'horn', G.tube([[-0.02, 0.05, s * 0.04], [-0.08, 0.1, s * 0.07], [-0.16, 0.11, s * 0.08]], [0.02, 0.001], {}, 10, 6));
        rig.add(head, 'glow', G.tube([[0.14, -0.025, s * 0.03], [0.2, -0.05, s * 0.09], [0.26, -0.03, s * 0.13]], [0.007, 0.002], {}, 8, 4));
        rig.add(head, 'eye', G.sphere(0.016, { x: 0.06, y: 0.03, z: s * 0.055 }, 8));
      }
      const legs = [
        { ...leg(rig, body, 'fl', [0.17, 0.2, 0.19], { upper: 0.1, lower: 0.1, r1: 0.06, r2: 0.045, foot: 'claw', splay: -0.35 }), off: 0 },
        { ...leg(rig, body, 'fr', [0.17, 0.2, -0.19], { upper: 0.1, lower: 0.1, r1: 0.06, r2: 0.045, foot: 'claw', splay: 0.35 }), off: PI },
        { ...leg(rig, body, 'bl', [-0.17, 0.2, 0.19], { upper: 0.1, lower: 0.1, r1: 0.06, r2: 0.045, foot: 'claw', splay: -0.35 }), off: PI, back: true },
        { ...leg(rig, body, 'br', [-0.17, 0.2, -0.19], { upper: 0.1, lower: 0.1, r1: 0.06, r2: 0.045, foot: 'claw', splay: 0.35 }), off: 0, back: true },
      ];
      const tail = rig.bone('tail0', body, { x: -0.3, y: 0.22 });
      rig.add(tail, 'body', G.tube([[0.03, 0, 0], [-0.1, -0.02, 0], [-0.24, -0.06, 0]], [0.06, 0.004], {}, 10, 7));
      for (let i = 0; i < 3; i++) rig.add(tail, 'horn', G.cone(0.016, 0.05, { x: -0.05 - i * 0.06, y: 0.035 - i * 0.012 }, 5));
      return { height: 0.56, legs: legs.map((l) => ({ hip: l.hip.name, knee: l.knee.name, off: l.off, back: !!l.back })) };
    },
    anim(B, st, dt, t, mv) {
      st.phase += dt * 5 * mv;
      walk(st.legs, st.phase, 0.38, mv);
      B.body.rotation.x = Math.sin(st.phase) * 0.03 * mv;
      B.head.rotation.y = Math.sin(t * 0.8) * 0.3;
      B.neck.rotation.z = Math.sin(t * 1.3) * 0.08;
      B.tail0.rotation.y = Math.sin(t * 2) * 0.3;
    },
  },

  /* ---------- ไฮดรา 3 หัว ---------- */
  hydra: {
    tint: 0.08,
    build(rig) {
      const body = rig.bone('body');
      rig.add(body, 'body', G.ell(0.24, 0.13, 0.15, { y: 0.3 }), G.ell(0.13, 0.12, 0.14, { x: 0.13, y: 0.32 }));
      rig.add(body, 'belly', G.ell(0.2, 0.07, 0.11, { y: 0.24 }));
      for (const s of [-1, 1]) rig.add(body, 'glow', G.tube([[0.15, 0.32, s * 0.13], [0, 0.3, s * 0.15], [-0.18, 0.31, s * 0.12]], 0.008, {}, 10, 4));
      for (let i = 0; i < 6; i++) rig.add(body, 'horn', G.cone(0.022, 0.07 - i * 0.006, { x: 0.12 - i * 0.065, y: 0.43 - Math.abs(i - 2) * 0.01, rz: 0.3 }, 5));
      const legs = [
        { ...leg(rig, body, 'fl', [0.13, 0.27, 0.12], { upper: 0.12, lower: 0.13, r1: 0.045, r2: 0.028, foot: 'claw', splay: -0.35 }), off: 0 },
        { ...leg(rig, body, 'fr', [0.13, 0.27, -0.12], { upper: 0.12, lower: 0.13, r1: 0.045, r2: 0.028, foot: 'claw', splay: 0.35 }), off: PI },
        { ...leg(rig, body, 'bl', [-0.14, 0.28, 0.12], { upper: 0.12, lower: 0.14, r1: 0.05, r2: 0.028, foot: 'claw', splay: -0.35, thigh: 0.06 }), off: PI, back: true },
        { ...leg(rig, body, 'br', [-0.14, 0.28, -0.12], { upper: 0.12, lower: 0.14, r1: 0.05, r2: 0.028, foot: 'claw', splay: 0.35, thigh: 0.06 }), off: 0, back: true },
      ];
      for (let k = 0; k < 3; k++) {
        const z = (k - 1) * 0.1;
        const n1 = rig.bone('neckA' + k, body, { x: 0.2, y: 0.36, z, ry: -(k - 1) * 0.7, rz: k === 1 ? 0.15 : 0 });
        rig.add(n1, 'body', G.tube([[-0.03, -0.01, 0], [0.05, 0.05, 0], [0.1, 0.1, 0]], [0.058, 0.046], {}, 8, 8));
        const n2 = rig.bone('neckB' + k, n1, { x: 0.1, y: 0.1 });
        rig.add(n2, 'body', G.tube([[0, 0, 0], [0.05, 0.05, 0], [0.09, 0.07, 0]], [0.046, 0.038], {}, 8, 8));
        rig.add(n2, 'mane', G.sheet([[0, 0], [0.03, 0.05], [0.07, 0.01], [0.09, 0.04], [0.1, 0]], { x: -0.01, y: 0.03, rx: -PI / 2 }));
        const h = rig.bone('hhead' + k, n2, { x: 0.09, y: 0.07 });
        rig.add(h, 'body', G.ell(0.065, 0.048, 0.05), G.tube([[0.02, -0.005, 0], [0.12, -0.02, 0]], [0.04, 0.022], {}, 6, 7));
        for (const s of [-1, 1]) {
          rig.add(h, 'horn', G.tube([[-0.01, 0.035, s * 0.025], [-0.06, 0.07, s * 0.045]], [0.012, 0.001], {}, 6, 5));
          rig.add(h, 'eye', G.sphere(0.012, { x: 0.045, y: 0.02, z: s * 0.038 }, 6));
          rig.add(h, 'mane', G.sheet([[0, 0], [-0.06, 0.02], [-0.04, 0.05]], { x: -0.03, y: 0, z: s * 0.045 }));
        }
        const jaw = rig.bone('hjaw' + k, h, { x: 0.02, y: -0.03 });
        rig.add(jaw, 'belly', G.tube([[0, 0, 0], [0.1, -0.008, 0]], [0.028, 0.016], {}, 6, 6));
      }
      const lens = [0.12, 0.12, 0.11];
      const b = (bone, i) => {
        rig.add(bone, 'body', G.tube([[0.02, 0, 0], [-0.06, 0, 0], [-lens[i] - 0.01, 0, 0]], [0.065 - i * 0.02, 0.048 - i * 0.02], {}, 6, 7));
        rig.add(bone, 'horn', G.cone(0.014, 0.04, { x: -0.06, y: 0.05 - i * 0.012 }, 4));
      };
      b.len = (i) => lens[i];
      tailChain(rig, body, 'tail', { x: -0.22, y: 0.3, rz: 0.15 }, 3, b);
      return { height: 0.62, legs: legs.map((l) => ({ hip: l.hip.name, knee: l.knee.name, off: l.off, back: !!l.back })) };
    },
    anim(B, st, dt, t, mv) {
      st.phase += dt * 8 * mv;
      walk(st.legs, st.phase, 0.5, mv);
      for (let k = 0; k < 3; k++) {
        B['neckA' + k].rotation.z = Math.sin(t * 2 + k * 1.7) * 0.18;
        B['neckA' + k].rotation.y = B['neckA' + k].userData.rest.y + Math.sin(t * 1.4 + k * 2.1) * 0.22;
        B['neckB' + k].rotation.z = Math.sin(t * 2.6 + k) * 0.2;
        B['hjaw' + k].rotation.z = -Math.max(0, Math.sin(t * 3 + k * 2)) * 0.35;
      }
      for (let i = 0; i < 3; i++) B['tail' + i].rotation.y = Math.sin(t * 3 - i * 0.7) * 0.3;
    },
  },

  /* ---------- คิทสึเนะ ---------- */
  kitsune: {
    tint: 0.18,
    build(rig, variant) {
      const tails = variant === 'child' ? 1 : 3;
      const body = rig.bone('body');
      rig.add(body, 'body', G.ell(0.2, 0.095, 0.085, { y: 0.31 }), G.ell(0.11, 0.1, 0.085, { x: 0.12, y: 0.325 }), G.ell(0.1, 0.09, 0.08, { x: -0.12, y: 0.315 }));
      rig.add(body, 'belly', G.ell(0.15, 0.05, 0.07, { y: 0.265 }), G.ell(0.06, 0.07, 0.07, { x: 0.18, y: 0.33 }));
      for (const s of [-1, 1]) {
        rig.add(body, 'glow', G.sheet([[0, 0], [0.04, 0.012], [0.08, -0.004], [0.04, 0.03]], { x: -0.16, y: 0.33, z: s * 0.082, rx: s * PI / 2 }));
      }
      const neck = rig.bone('neck', body, { x: 0.18, y: 0.35 });
      rig.add(neck, 'body', G.tube([[-0.03, -0.01, 0], [0.03, 0.03, 0], [0.065, 0.055, 0]], [0.05, 0.042], {}, 6, 7));
      const head = rig.bone('head', neck, { x: 0.07, y: 0.06 });
      rig.add(head, 'body', G.ell(0.068, 0.058, 0.064), G.tube([[0.02, -0.005, 0], [0.08, -0.02, 0], [0.145, -0.03, 0]], [0.042, 0.012], {}, 8, 7));
      rig.add(head, 'dark', G.sphere(0.012, { x: 0.147, y: -0.028 }, 6));
      for (const s of [-1, 1]) {
        rig.add(head, 'body', G.cone(0.04, 0.13, { x: -0.01, y: 0.085, z: s * 0.04, rz: 0.15, rx: -s * 0.22 }, 6));
        rig.add(head, 'glow', G.cone(0.022, 0.095, { x: -0.002, y: 0.08, z: s * 0.042, rz: 0.15, rx: -s * 0.22 }, 5));
        rig.add(head, 'eye', G.ell(0.017, 0.01, 0.012, { x: 0.05, y: 0.022, z: s * 0.048, rz: 0.3 }, 8));
        rig.add(head, 'belly', G.cone(0.022, 0.07, { x: -0.01, y: -0.02, z: s * 0.058, rx: -s * 1.3, rz: 1 }, 5));
        rig.add(head, 'glow', G.sheet([[0, 0], [0.03, 0.006], [0.05, 0]], { x: 0.06, y: 0.04, z: s * 0.05, rx: s * PI / 2 }));
      }
      const legs = [
        { ...leg(rig, body, 'fl', [0.12, 0.28, 0.055], { upper: 0.13, lower: 0.13, r1: 0.028, r2: 0.016 }), off: 0 },
        { ...leg(rig, body, 'fr', [0.12, 0.28, -0.055], { upper: 0.13, lower: 0.13, r1: 0.028, r2: 0.016 }), off: PI },
        { ...leg(rig, body, 'bl', [-0.13, 0.29, 0.055], { upper: 0.12, lower: 0.15, r1: 0.03, r2: 0.016, thigh: 0.055 }), off: PI, back: true },
        { ...leg(rig, body, 'br', [-0.13, 0.29, -0.055], { upper: 0.12, lower: 0.15, r1: 0.03, r2: 0.016, thigh: 0.055 }), off: 0, back: true },
      ];
      const lens = [0.11, 0.13, 0.12];
      for (let k = 0; k < tails; k++) {
        const b = (bone, i) => {
          const r = [0.04, 0.058, 0.066][i];
          if (i < 2) rig.add(bone, 'fur', G.tube([[0.03, 0, 0], [-lens[i] / 2, 0, 0], [-lens[i] - 0.03, 0, 0]], (t) => r * (0.8 + 0.3 * Math.sin(t * PI)), {}, 8, 9));
          else {
            rig.add(bone, 'fur', G.tube([[0.03, 0, 0], [-0.05, 0, 0], [-0.09, 0, 0]], (t) => r * (0.85 + 0.2 * Math.sin(t * PI)), {}, 6, 9));
            rig.add(bone, 'belly', G.tube([[-0.08, 0, 0], [-0.15, 0, 0], [-0.21, 0, 0]], (t) => r * Math.cos(t * PI / 2) * 1.05 + 0.002, {}, 8, 9));
            rig.add(bone, 'glow', G.cone(0.028, 0.1, { x: -0.24, rz: PI / 2 }, 6));
          }
        };
        b.len = (i) => lens[i];
        tailChain(rig, body, 'tail' + k + '_', { x: -0.2, y: 0.34, z: (k - (tails - 1) / 2) * 0.03, rz: -0.75, ry: (k - (tails - 1) / 2) * 0.55 }, 3, b);
      }
      return { height: 0.56, tails, legs: legs.map((l) => ({ hip: l.hip.name, knee: l.knee.name, off: l.off, back: !!l.back })) };
    },
    anim(B, st, dt, t, mv, info) {
      st.phase += dt * 13 * mv;
      walk(st.legs, st.phase, 0.65, mv);
      B.body.position.y = Math.abs(Math.cos(st.phase)) * 0.02 * mv;
      for (let k = 0; k < info.tails; k++) {
        for (let i = 0; i < 3; i++) {
          const bn = B['tail' + k + '_' + i];
          bn.rotation.z = bn.userData.rest.z + Math.sin(t * 3 + k * 1.3 - i * 0.6) * 0.18;
          bn.rotation.y = bn.userData.rest.y + Math.sin(t * 2.2 + k - i * 0.5) * 0.15;
        }
      }
    },
  },

  /* ---------- ฟีนิกซ์ ---------- */
  phoenix: {
    tint: 0.05,
    build(rig) {
      const body = rig.bone('body', rig.root, { y: 0.55 });
      rig.add(body, 'body', G.ell(0.15, 0.095, 0.095), G.ell(0.06, 0.06, 0.07, { x: -0.12, y: 0.01 }));
      rig.add(body, 'belly', G.ell(0.1, 0.085, 0.085, { x: 0.055, y: -0.015 }));
      rig.add(body, 'gold', G.cone(0.012, 0.09, { x: 0.02, y: -0.12, z: 0.03, rz: 0.4 }, 5), G.cone(0.012, 0.09, { x: 0.02, y: -0.12, z: -0.03, rz: 0.4 }, 5));
      const neck = rig.bone('neck', body, { x: 0.1, y: 0.04 });
      rig.add(neck, 'body', G.tube([[-0.02, -0.01, 0], [0.04, 0.05, 0], [0.08, 0.085, 0]], [0.05, 0.034], {}, 8, 7));
      const head = rig.bone('head', neck, { x: 0.085, y: 0.09 });
      rig.add(head, 'body', G.ell(0.05, 0.044, 0.04));
      rig.add(head, 'gold', G.tube([[0.035, 0, 0], [0.075, -0.008, 0], [0.098, -0.03, 0]], [0.017, 0.002], {}, 8, 6));
      for (const s of [-1, 1]) rig.add(head, 'eye', G.sphere(0.01, { x: 0.025, y: 0.015, z: s * 0.034 }, 6));
      for (let i = 0; i < 4; i++) {
        rig.add(head, i % 2 ? 'glow' : 'feather2', G.tube([[0, 0.03, (i - 1.5) * 0.012], [-0.05, 0.09 + i * 0.01, (i - 1.5) * 0.02], [-0.12 - i * 0.015, 0.12 + i * 0.01, (i - 1.5) * 0.025]], [0.012, 0.001], {}, 8, 5));
      }
      for (const side of [1, -1]) {
        const w = rig.bone(side > 0 ? 'wingL' : 'wingR', body, { x: 0.02, y: 0.05, z: side * 0.06 });
        w.userData.side = side;
        featherWing(rig, w, 0.34, { n: 12, len: 0.17, w: 0.032 });
      }
      for (let k = 0; k < 3; k++) {
        const b = (bone, i) => {
          rig.add(bone, i ? 'glow' : 'feather', G.tube([[0, 0, 0], [-0.08, -0.01, 0], [-0.17, 0.0, 0]], [0.014 - i * 0.004, 0.006 - i * 0.003], {}, 8, 5));
          if (i === 1) rig.add(bone, 'feather2', G.feather(0.09, 0.03, { x: -0.17, ry: -PI / 2 }));
        };
        b.len = () => 0.17;
        tailChain(rig, body, 'tail' + k + '_', { x: -0.16, y: 0.0, z: (k - 1) * 0.025, ry: (k - 1) * 0.3, rz: 0.15 }, 2, b);
      }
      return { height: 0.85 };
    },
    anim(B, st, dt, t) {
      const flap = Math.sin(t * 4.2) * 0.55 + 0.15;
      B.wingL.rotation.x = -flap;
      B.wingR.rotation.x = flap;
      B.body.position.y = 0.55 + Math.sin(t * 4.2 + 1.2) * 0.04;
      B.body.rotation.z = Math.sin(t * 1.3) * 0.05;
      for (let k = 0; k < 3; k++) for (let i = 0; i < 2; i++) B['tail' + k + '_' + i].rotation.y = B['tail' + k + '_' + i].userData.rest.y * (i ? 0 : 1) + Math.sin(t * 3 + k - i) * 0.15;
      B.head.rotation.z = Math.sin(t * 2) * 0.06;
    },
  },

  /* ---------- กริฟฟิน ---------- */
  griffin: {
    tint: 0.12,
    build(rig) {
      const body = rig.bone('body', rig.root, { y: 0.15 });
      rig.add(body, 'body', G.ell(0.22, 0.105, 0.1), G.ell(0.12, 0.1, 0.095, { x: -0.15 }));
      rig.add(body, 'belly', G.ell(0.12, 0.12, 0.1, { x: 0.13, y: 0.015 }));
      ruff(rig, body, 'belly', { x: 0.2, y: 0.06, r: 0.085, n: 14, len: 0.1, rad: 0.03 });
      const neck = rig.bone('neck', body, { x: 0.2, y: 0.07 });
      rig.add(neck, 'belly', G.tube([[-0.03, -0.01, 0], [0.04, 0.035, 0], [0.07, 0.065, 0]], [0.068, 0.052], {}, 8, 8));
      const head = rig.bone('head', neck, { x: 0.075, y: 0.07 });
      rig.add(head, 'belly', G.ell(0.066, 0.058, 0.055));
      rig.add(head, 'gold', G.tube([[0.045, 0.005, 0], [0.1, -0.005, 0], [0.128, -0.045, 0]], [0.026, 0.003], {}, 10, 7));
      for (const s of [-1, 1]) {
        rig.add(head, 'eye', G.sphere(0.012, { x: 0.04, y: 0.02, z: s * 0.045 }, 6));
        rig.add(head, 'dark', G.ell(0.025, 0.008, 0.012, { x: 0.042, y: 0.034, z: s * 0.045, rz: -0.3 }, 6));
        rig.add(head, 'feather', G.feather(0.07, 0.016, { x: -0.03, y: 0.04, z: s * 0.03, ry: -PI / 2 - s * 0.3, rz: 0.4 }));
      }
      for (const side of [1, -1]) {
        const w = rig.bone(side > 0 ? 'wingL' : 'wingR', body, { x: 0.06, y: 0.06, z: side * 0.07 });
        w.userData.side = side;
        featherWing(rig, w, 0.42, { n: 13, len: 0.2, w: 0.036, arm: 'belly', tipGlow: true });
      }
      const fl = leg(rig, body, 'fl', [0.14, -0.03, 0.05], { upper: 0.1, lower: 0.1, r1: 0.028, r2: 0.016, foot: 'talon', role: 'gold' });
      const fr = leg(rig, body, 'fr', [0.14, -0.03, -0.05], { upper: 0.1, lower: 0.1, r1: 0.028, r2: 0.016, foot: 'talon', role: 'gold' });
      const bl = leg(rig, body, 'bl', [-0.15, -0.02, 0.06], { upper: 0.1, lower: 0.11, r1: 0.035, r2: 0.02, thigh: 0.055 });
      const br = leg(rig, body, 'br', [-0.15, -0.02, -0.06], { upper: 0.1, lower: 0.11, r1: 0.035, r2: 0.02, thigh: 0.055 });
      for (const l of [fl, fr]) { l.hip.rotation.z = 0.9; l.knee.rotation.z = -1.4; l.hip.userData.rest.z = 0.9; }
      for (const l of [bl, br]) { l.hip.rotation.z = -1.1; l.knee.rotation.z = 0.9; l.hip.userData.rest.z = -1.1; }
      const b = (bone, i) => {
        rig.add(bone, 'body', G.tube([[0.01, 0, 0], [-0.06, 0, 0], [-0.13, 0, 0]], [0.018, 0.013], {}, 6, 6));
        if (i === 1) rig.add(bone, 'feather2', G.ell(0.05, 0.03, 0.03, { x: -0.14 }, 8));
      };
      b.len = () => 0.13;
      tailChain(rig, body, 'tail', { x: -0.25, y: 0.02, rz: 0.2 }, 2, b);
      return { height: 0.45 };
    },
    anim(B, st, dt, t) {
      const flap = Math.sin(t * 6.5) * 0.7 + 0.1;
      B.wingL.rotation.x = -flap;
      B.wingR.rotation.x = flap;
      B.body.position.y = 0.15 - Math.sin(t * 6.5) * 0.035;
      B.body.rotation.z = Math.sin(t * 6.5 + 1) * 0.04;
      for (let i = 0; i < 2; i++) B['tail' + i].rotation.y = Math.sin(t * 3 - i) * 0.35;
      B.head.rotation.y = Math.sin(t * 0.9) * 0.25;
    },
  },

  /* ---------- มังกรโบราณ (บอส) ---------- */
  dragon: {
    tint: 0.06,
    build(rig) {
      const body = rig.bone('body');
      rig.add(body, 'body',
        G.ell(0.27, 0.14, 0.14, { y: 0.42 }),
        G.ell(0.16, 0.15, 0.14, { x: 0.17, y: 0.44 }),
        G.ell(0.14, 0.13, 0.13, { x: -0.18, y: 0.42 }));
      for (let i = 0; i < 8; i++) rig.add(body, 'belly', G.ell(0.034, 0.022, 0.1 - Math.abs(i - 3.5) * 0.008, { x: 0.24 - i * 0.065, y: 0.3 + Math.abs(i - 3.5) * 0.006 }, 10));
      for (let i = 0; i < 7; i++) rig.add(body, i % 2 ? 'glow' : 'horn', G.cone(0.035, 0.1 - Math.abs(i - 3) * 0.01, { x: 0.2 - i * 0.07, y: 0.57 - Math.abs(i - 2) * 0.012, s: [1, 1, 0.35], rz: 0.25 }, 4));
      rig.add(body, 'glow', G.sphere(0.04, { x: 0.29, y: 0.43 }, 10));
      rig.add(body, 'dark', G.ell(0.24, 0.05, 0.07, { y: 0.545 }), G.ell(0.12, 0.05, 0.065, { x: 0.18, y: 0.57 }));
      for (let i = 0; i < 10; i++) for (const s of [-1, 1]) rig.add(body, 'shell2', G.ell(0.03, 0.022, 0.012, { x: 0.22 - i * 0.05, y: 0.45 + Math.sin(i) * 0.02, z: s * (0.135 - Math.abs(i - 4.5) * 0.004), rx: s * 0.3 }, 6));
      const n1 = rig.bone('neckA', body, { x: 0.28, y: 0.5 });
      rig.add(n1, 'body', G.tube([[-0.04, -0.02, 0], [0.06, 0.05, 0], [0.12, 0.1, 0]], [0.088, 0.07], {}, 8, 9));
      rig.add(n1, 'horn', G.cone(0.025, 0.06, { x: 0.03, y: 0.1, s: [1, 1, 0.35], rz: 0.4 }, 4));
      const n2 = rig.bone('neckB', n1, { x: 0.12, y: 0.1 });
      rig.add(n2, 'body', G.tube([[0, 0, 0], [0.06, 0.05, 0], [0.1, 0.08, 0]], [0.07, 0.06], {}, 8, 9));
      rig.add(n2, 'horn', G.cone(0.022, 0.055, { x: 0.03, y: 0.075, s: [1, 1, 0.35], rz: 0.5 }, 4));
      const head = rig.bone('head', n2, { x: 0.1, y: 0.085 });
      rig.add(head, 'body', G.ell(0.1, 0.07, 0.078), G.tube([[0.04, -0.008, 0], [0.12, -0.025, 0], [0.2, -0.032, 0]], [0.06, 0.035], {}, 10, 9));
      rig.add(head, 'dark', G.ell(0.06, 0.022, 0.06, { x: 0.05, y: 0.06 }), G.sphere(0.01, { x: 0.2, y: -0.012, z: 0.02 }, 6), G.sphere(0.01, { x: 0.2, y: -0.012, z: -0.02 }, 6));
      for (const s of [-1, 1]) {
        rig.add(head, 'horn', G.tube([[-0.03, 0.05, s * 0.04], [-0.1, 0.1, s * 0.07], [-0.19, 0.12, s * 0.085], [-0.26, 0.085, s * 0.075]], [0.026, 0.001], {}, 14, 7));
        rig.add(head, 'horn', G.tube([[-0.04, 0.02, s * 0.06], [-0.1, 0.03, s * 0.1]], [0.014, 0.001], {}, 6, 5));
        rig.add(head, 'horn', G.cone(0.012, 0.05, { x: 0.02, y: -0.03, z: s * 0.07, rx: -s * 1.4 }, 4));
        rig.add(head, 'eye', G.ell(0.02, 0.012, 0.012, { x: 0.075, y: 0.032, z: s * 0.058, rz: 0.2 }, 8));
        rig.add(head, 'membrane', G.sheet([[0, 0], [-0.05, 0.03], [-0.1, 0.0], [-0.06, -0.02]], { x: -0.04, y: -0.02, z: s * 0.07, rx: s * PI / 2 }));
      }
      const jaw = rig.bone('jaw', head, { x: 0.04, y: -0.048 });
      rig.add(jaw, 'belly', G.tube([[0, 0, 0], [0.08, -0.01, 0], [0.15, -0.012, 0]], [0.045, 0.024], {}, 8, 8));
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) rig.add(jaw, 'horn', G.cone(0.007, 0.03, { x: 0.07 + i * 0.03, y: 0.02, z: s * 0.02 }, 4));
      for (const side of [1, -1]) {
        const w = rig.bone(side > 0 ? 'wingL' : 'wingR', body, { x: 0.08, y: 0.55, z: side * 0.1 });
        const m = (g) => xf(g, { s: [1, 1, side] });
        const E = [-0.05, 0.1, 0.26];
        rig.add(w, 'dark', m(G.tube([[0, 0, 0], [-0.02, 0.08, 0.12], E], [0.026, 0.016], {}, 10, 7)));
        const tips = [[-0.12, 0.07, 0.52], [-0.25, 0.03, 0.47], [-0.35, 0.01, 0.32]];
        for (const T of tips) rig.add(w, 'dark', m(G.tube([E, [(E[0] + T[0]) / 2, (E[1] + T[1]) / 2 + 0.01, (E[2] + T[2]) / 2], T], [0.014, 0.004], {}, 8, 5)));
        rig.add(w, 'horn', m(G.cone(0.012, 0.05, { x: E[0], y: E[1] + 0.03, z: E[2] }, 4)));
        rig.add(w, 'membrane', m(G.sheet([[0, 0.02], [-0.04, 0.27], [-0.115, 0.52], [-0.15, 0.4], [-0.245, 0.47], [-0.255, 0.34], [-0.35, 0.32], [-0.29, 0.22], [-0.25, 0.13], [-0.14, 0.07], [-0.06, 0.02]], { y: 0.06 })));
        for (const T of tips) rig.add(w, 'glow', m(G.sphere(0.008, { x: T[0], y: T[1], z: T[2] }, 6)));
        w.userData.side = side;
      }
      const legs = [
        { ...leg(rig, body, 'fl', [0.2, 0.38, 0.11], { upper: 0.17, lower: 0.18, r1: 0.055, r2: 0.035, foot: 'claw', thigh: 0.065 }), off: 0 },
        { ...leg(rig, body, 'fr', [0.2, 0.38, -0.11], { upper: 0.17, lower: 0.18, r1: 0.055, r2: 0.035, foot: 'claw', thigh: 0.065 }), off: PI },
        { ...leg(rig, body, 'bl', [-0.2, 0.4, 0.11], { upper: 0.17, lower: 0.2, r1: 0.06, r2: 0.035, foot: 'claw', thigh: 0.09 }), off: PI, back: true },
        { ...leg(rig, body, 'br', [-0.2, 0.4, -0.11], { upper: 0.17, lower: 0.2, r1: 0.06, r2: 0.035, foot: 'claw', thigh: 0.09 }), off: 0, back: true },
      ];
      const lens = [0.13, 0.13, 0.12, 0.11, 0.1];
      const b = (bone, i) => {
        const r0 = 0.075 - i * 0.012, r1 = 0.063 - i * 0.012;
        rig.add(bone, 'body', G.tube([[0.02, 0, 0], [-lens[i] / 2, 0, 0], [-lens[i] - 0.01, 0, 0]], [r0, Math.max(0.012, r1)], {}, 6, 8));
        rig.add(bone, i % 2 ? 'glow' : 'horn', G.cone(0.025 - i * 0.003, 0.07 - i * 0.008, { x: -lens[i] / 2, y: r0 * 0.9, s: [1, 1, 0.35], rz: 0.3 }, 4));
        if (i === 4) rig.add(bone, 'horn', G.sheet([[0, 0], [-0.05, 0.05], [-0.12, 0], [-0.05, -0.05]], { x: -0.1, rx: PI / 2 }));
      };
      b.len = (i) => lens[i];
      tailChain(rig, body, 'tail', { x: -0.3, y: 0.43, rz: 0.12 }, 5, b);
      return { height: 0.82, legs: legs.map((l) => ({ hip: l.hip.name, knee: l.knee.name, off: l.off, back: !!l.back })) };
    },
    anim(B, st, dt, t, mv) {
      st.phase += dt * 6 * mv;
      walk(st.legs, st.phase, 0.5, mv);
      B.body.position.y = Math.abs(Math.sin(st.phase)) * 0.02 * mv;
      const flap = Math.sin(t * 2.2) * 0.28 + 0.12;
      B.wingL.rotation.x = -flap;
      B.wingR.rotation.x = flap;
      B.neckA.rotation.z = Math.sin(t * 1.1) * 0.1;
      B.neckA.rotation.y = Math.sin(t * 0.7) * 0.15;
      B.neckB.rotation.z = Math.sin(t * 1.4 + 1) * 0.12;
      B.head.rotation.y = Math.sin(t * 0.9 + 2) * 0.2;
      B.jaw.rotation.z = -Math.max(0, Math.sin(t * 1.6)) * 0.35;
      for (let i = 0; i < 5; i++) B['tail' + i].rotation.y = Math.sin(t * 2 - i * 0.6) * 0.18;
    },
  },
};

/* ability → แบบจำลอง */
const MODEL_OF = {
  normal: 'wolf', fast: 'wolf', armored: 'turtle', regen: 'hydra', split: 'kitsune', child: 'kitsune',
  undead: 'phoenix', flying: 'griffin', boss: 'dragon', elemental: 'dragon',
};
MODEL_OF.fast = 'unicorn';

/* ---------------- แม่แบบ (สร้างครั้งเดียวต่อชนิด) ---------------- */
const templates = new Map();
function getTemplate(model, variant) {
  const key = model + ':' + (variant || '');
  if (!templates.has(key)) {
    const rig = new Rig();
    const info = DEFS[model].build(rig, variant);
    const root = rig.finalize();
    templates.set(key, { root, info });
  }
  return templates.get(key);
}

/* ---------------- วัสดุตามธาตุ ---------------- */
const matCache = new Map();
function roleMaterials(element, model) {
  const key = element + ':' + model;
  if (matCache.has(key)) return matCache.get(key);
  const el = ELEMENTS[element];
  const ec = new THREE.Color(el.color);
  const gc = new THREE.Color(el.glow);
  const white = new THREE.Color(0xffffff);
  const base = ec.clone().lerp(white, DEFS[model].tint);
  const M = {
    body: new THREE.MeshPhysicalMaterial({ color: base, roughness: 0.42, metalness: 0.05, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.5, sheenColor: gc, emissive: ec, emissiveIntensity: 0.12 }),
    fur: new THREE.MeshStandardMaterial({ color: base.clone().lerp(white, 0.25), roughness: 0.75, emissive: ec, emissiveIntensity: 0.1 }),
    belly: new THREE.MeshStandardMaterial({ color: base.clone().lerp(white, 0.62), roughness: 0.6 }),
    dark: new THREE.MeshStandardMaterial({ color: ec.clone().multiplyScalar(0.22), roughness: 0.45, metalness: 0.2 }),
    horn: new THREE.MeshStandardMaterial({ color: 0xf1e7cf, roughness: 0.35, metalness: 0.05 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xf2c25a, roughness: 0.25, metalness: 0.9 }),
    shell: new THREE.MeshStandardMaterial({ color: ec.clone().lerp(new THREE.Color(0x5a4028), 0.5), roughness: 0.55, metalness: 0.1 }),
    shell2: new THREE.MeshStandardMaterial({ color: ec.clone().lerp(new THREE.Color(0xd8c090), 0.45), roughness: 0.5, metalness: 0.1 }),
    mane: new THREE.MeshStandardMaterial({ color: gc, emissive: ec, emissiveIntensity: 0.75, roughness: 0.4, side: THREE.DoubleSide }),
    membrane: new THREE.MeshStandardMaterial({ color: ec.clone().lerp(gc, 0.35), emissive: ec, emissiveIntensity: 0.3, roughness: 0.55, side: THREE.DoubleSide, transparent: true, opacity: 0.72, depthWrite: false }),
    feather: new THREE.MeshStandardMaterial({ color: base, roughness: 0.6, side: THREE.DoubleSide, emissive: ec, emissiveIntensity: 0.15 }),
    feather2: new THREE.MeshStandardMaterial({ color: base.clone().lerp(gc, 0.6), roughness: 0.55, side: THREE.DoubleSide, emissive: ec, emissiveIntensity: 0.35 }),
    glow: new THREE.MeshBasicMaterial({ color: gc.clone().multiplyScalar(1.6) }),
    eye: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff6c0).multiplyScalar(1.9) }),
  };
  if (model === 'phoenix') {
    M.feather.emissiveIntensity = 0.45;
    M.feather2.emissiveIntensity = 0.7;
  }
  matCache.set(key, M);
  return M;
}

/* ============================================================
 *  สร้างโมเดลสำหรับมอนสเตอร์ 1 ตัว
 *  คืนค่า { group, anim(dt, t, moving), mats, body, height, scale }
 * ============================================================ */
export function buildCreatureModel(e) {
  const model = MODEL_OF[e.ability] || 'wolf';
  const variant = e.ability === 'child' ? 'child' : '';
  const { root, info } = getTemplate(model, variant);
  const inst = root.clone(true);
  const shared = roleMaterials(e.element, model);
  const body = shared.body.clone();
  const B = {};
  inst.traverse((o) => {
    if (o.name) B[o.name] = o;
    if (o.isMesh) o.material = o.userData.role === 'body' ? body : shared[o.userData.role] || shared.body;
  });
  const st = { phase: Math.random() * 6, legs: (info.legs || []).map((l) => ({ hip: B[l.hip], knee: B[l.knee], off: l.off, back: l.back })) };
  const scale = (e.size / 12) * (model === 'dragon' ? 0.88 : 0.86);
  const group = new THREE.Group();
  inst.scale.setScalar(scale);
  group.add(inst);
  const def = DEFS[model];
  const anim = (dt, t, mv) => def.anim(B, st, dt, t, mv, info, e.ability === 'fast');
  return { group, anim, mats: [body], body, height: info.height * scale, scale, model };
}

export { MODEL_OF };
