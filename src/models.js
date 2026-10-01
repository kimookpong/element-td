/* ============================================================
 *  โมเดล 3D ของป้อม (procedural) — รวม mesh ตามวัสดุผ่าน Rig
 *  แม่แบบถูกแคชต่อชนิด/ระดับ แล้ว clone ให้แต่ละป้อม
 * ============================================================ */
import * as THREE from 'three';
import { ELEMENTS, BASIC } from './data.js';
import { std, glow } from './gfx.js';
import { brickTexture, runeTexture } from './textures.js';
import { Rig, G, xf } from './modelkit.js';

const PI = Math.PI;
const SHADOW_ROLES = new Set(['stone', 'stoneDark', 'marble', 'wood', 'roof', 'iron', 'rock', 'bronze']);

/* ---------------- วัสดุตาม role ---------------- */
const FIXED = {
  stone: () => std(0x8a8c98, { map: brickTexture('stone'), roughness: 0.85 }),
  stoneDark: () => std(0x4c4e5c, { roughness: 0.85, flatShading: true }),
  slab: () => std(0x9497a6, { roughness: 0.6, flatShading: true }),
  rock: () => std(0x8a7350, { roughness: 0.95, flatShading: true }),
  marble: () => std(0xeeeae0, { roughness: 0.3 }),
  wood: () => std(0x8a5c36, { roughness: 0.85 }),
  woodDark: () => std(0x4a3220, { roughness: 0.85 }),
  roof: () => std(0xa8442a, { roughness: 0.7, flatShading: true }),
  gold: () => std(0xe6b13e, { metalness: 0.9, roughness: 0.22 }),
  goldSheet: () => std(0xe6b13e, { metalness: 0.75, roughness: 0.3, side: THREE.DoubleSide }),
  bronze: () => std(0x9a6a3a, { metalness: 0.8, roughness: 0.32 }),
  iron: () => std(0x2a2830, { metalness: 0.6, roughness: 0.42 }),
  bone: () => std(0xeae2cc, { roughness: 0.5 }),
  cloth: () => std(0xf0e6cc, { roughness: 0.9, side: THREE.DoubleSide }),
  water: () => std(0x3aa0ff, { roughness: 0.05, metalness: 0.15, emissive: 0x1260ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.86 }),
  waterSheet: () => std(0x8fd8ff, { roughness: 0.05, emissive: 0x2a8aff, emissiveIntensity: 0.6, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }),
  voidOrb: () => std(0x120820, { emissive: 0x8a3dff, emissiveIntensity: 1.5, roughness: 0.2 }),
};
function towerMat(role) {
  if (FIXED[role]) return FIXED[role]();
  const [kind, col] = role.split(':');
  if (kind === 'glow') return glow(col, 2.6);
  if (kind === 'crystal') return std(col, { flatShading: true, roughness: 0.15, metalness: 0.1, emissive: col, emissiveIntensity: 0.65, transparent: true, opacity: 0.93 });
  if (kind === 'banner') return std(col, { side: THREE.DoubleSide, roughness: 0.8, emissive: col, emissiveIntensity: 0.15 });
  return std(0xff00ff);
}

/* ---------------- ฐานป้อม ---------------- */
function buildPad(rig, t, cols) {
  const pad = rig.bone('pad');
  rig.add(pad, 'stoneDark', G.box(0.96, 0.07, 0.96, { y: 0.035 }));
  rig.add(pad, 'stone', G.box(0.86, 0.12, 0.86, { y: 0.13 }));
  rig.add(pad, 'slab', G.box(0.8, 0.04, 0.8, { y: 0.21 }));
  const k = t.kind === 'basic' ? 1.4 : 2.6;
  for (let i = 0; i < 4; i++) {
    const a = (i * PI) / 2;
    rig.add(pad, t.kind === 'basic' ? 'glow:#ffcf7a' : 'glow:' + cols[i % cols.length], G.box(0.025, 0.03, 0.82, { x: Math.cos(a) * 0.435, y: 0.185, z: Math.sin(a) * 0.435, ry: a }));
  }
  void k;
  // เสาหัวมุม
  for (let i = 0; i < 4; i++) {
    const a = (i * PI) / 2 + PI / 4;
    const x = Math.cos(a) * 0.56, z = Math.sin(a) * 0.56;
    rig.add(pad, 'stone', G.box(0.11, 0.16, 0.11, { x, y: 0.29, z }));
    rig.add(pad, t.tier >= 2 ? 'gold' : 'slab', G.cone(0.085, 0.08, { x, y: 0.41, z, ry: PI / 4 }, 4));
    if (t.tier >= 2) rig.add(pad, 'gold', G.box(0.125, 0.02, 0.125, { x, y: 0.33, z }));
  }
  if (t.tier >= 3) {
    const orbs = rig.bone('padOrbs', pad);
    for (let i = 0; i < 4; i++) {
      const a = (i * PI) / 2 + PI / 4;
      rig.add(orbs, 'crystal:' + cols[i % cols.length], G.octa(0.05, { x: Math.cos(a) * 0.56, y: 0.52, z: Math.sin(a) * 0.56, s: [0.8, 1.6, 0.8] }));
    }
  }
  return 0.23;
}

/* ---------------- หัวป้อมแต่ละชนิด ---------------- */
const HEADS = {
  arrow: {
    build(rig, h) {
      rig.add(h, 'stone', G.cyl(0.25, 0.28, 0.28, { y: 0.14 }, 10));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * PI * 2;
        rig.add(h, 'stone', G.box(0.08, 0.07, 0.06, { x: Math.cos(a) * 0.235, y: 0.315, z: Math.sin(a) * 0.235, ry: -a }));
      }
      rig.add(h, 'woodDark', G.cyl(0.3, 0.3, 0.035, { y: 0.3 }, 12));
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * PI * 2 + PI / 4;
        rig.add(h, 'wood', G.box(0.04, 0.34, 0.04, { x: Math.cos(a) * 0.23, y: 0.48, z: Math.sin(a) * 0.23 }));
        rig.add(h, 'woodDark', G.box(0.03, 0.03, 0.34, { x: Math.cos(a) * 0.23, y: 0.62, z: Math.sin(a) * 0.23, ry: -a + PI / 2 }));
      }
      rig.add(h, 'roof', G.cone(0.4, 0.3, { y: 0.79 }, 8));
      rig.add(h, 'woodDark', G.torus(0.37, 0.018, { y: 0.66, rx: PI / 2 }));
      rig.add(h, 'gold', G.sphere(0.035, { y: 0.96 }, 8));
      rig.add(h, 'woodDark', G.cyl(0.01, 0.01, 0.25, { y: 1.08 }, 5));
      const flag = rig.bone('flag', h, { y: 1.14 });
      rig.add(flag, 'banner:#c0392b', G.sheet([[0, 0], [0.16, 0.01], [0.13, 0.05], [0.17, 0.09], [0, 0.09]], { rx: -PI / 2 }));
      const aim = rig.bone('aim', h, { y: 0.43 });
      rig.add(aim, 'wood', G.box(0.36, 0.04, 0.05, { x: 0.02 }), G.box(0.06, 0.08, 0.08, { x: -0.14, y: -0.03 }));
      for (const s of [-1, 1]) rig.add(aim, 'woodDark', G.tube([[0.14, 0, 0], [0.13, 0.01, s * 0.1], [0.08, 0.015, s * 0.18]], [0.014, 0.008], {}, 6, 5));
      rig.add(aim, 'iron', G.tube([[0.08, 0.015, 0.18], [-0.06, 0.02, 0], [0.08, 0.015, -0.18]], 0.003, {}, 8, 3));
      rig.add(aim, 'iron', G.cyl(0.006, 0.006, 0.3, { x: 0.05, y: 0.03, rz: PI / 2 }, 4), G.cone(0.016, 0.05, { x: 0.22, y: 0.03, rz: -PI / 2 }, 4));
      return { aim: 'aim' };
    },
    anim(B, t) { B.flag.rotation.y = Math.sin(t * 3) * 0.3; },
  },
  cannon: {
    build(rig, h) {
      rig.add(h, 'stone', G.cyl(0.3, 0.33, 0.22, { y: 0.11 }, 12));
      rig.add(h, 'slab', G.cyl(0.26, 0.26, 0.02, { y: 0.225 }, 12));
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * PI * 2;
        rig.add(h, 'stone', G.box(0.07, 0.07, 0.07, { x: Math.cos(a) * 0.29, y: 0.255, z: Math.sin(a) * 0.29, ry: -a }));
      }
      const aim = rig.bone('aim', h, { y: 0.27 });
      for (const s of [-1, 1]) {
        rig.add(aim, 'wood', G.box(0.24, 0.1, 0.03, { y: 0.04, z: s * 0.08 }));
        rig.add(aim, 'woodDark', G.cyl(0.075, 0.075, 0.03, { x: -0.02, y: 0.03, z: s * 0.11, rx: PI / 2 }, 12));
        rig.add(aim, 'gold', G.cyl(0.02, 0.02, 0.04, { x: -0.02, y: 0.03, z: s * 0.11, rx: PI / 2 }, 6));
      }
      rig.add(aim, 'bronze', G.tube([[-0.13, 0.1, 0], [0.08, 0.12, 0], [0.3, 0.15, 0]], [0.085, 0.06], {}, 10, 12));
      for (const x of [-0.06, 0.08, 0.22]) rig.add(aim, 'gold', G.torus(0.072 - x * 0.06, 0.012, { x, y: 0.105 + x * 0.12, ry: PI / 2, rx: 0.12 }));
      rig.add(aim, 'gold', G.torus(0.064, 0.016, { x: 0.3, y: 0.15, ry: PI / 2, rx: 0.12 }), G.sphere(0.045, { x: -0.16, y: 0.1 }, 10));
      rig.add(aim, 'iron', G.cyl(0.048, 0.048, 0.01, { x: 0.305, y: 0.15, rz: PI / 2 - 0.12 }, 12));
      return { aim: 'aim' };
    },
    anim() {},
  },
  fire: {
    build(rig, h) {
      rig.add(h, 'stone', G.lathe([[0.18, 0], [0.16, 0.05], [0.1, 0.12], [0.09, 0.22], [0.13, 0.28], [0.15, 0.3], [0, 0.3]], {}, 12));
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * PI * 2;
        const c = Math.cos(a), s = Math.sin(a);
        rig.add(h, 'gold', G.tube([[c * 0.08, 0.26, s * 0.08], [c * 0.22, 0.34, s * 0.22], [c * 0.24, 0.46, s * 0.24], [c * 0.2, 0.52, s * 0.2]], [0.026, 0.012], {}, 10, 6));
        rig.add(h, 'gold', G.cone(0.014, 0.06, { x: c * 0.205, y: 0.54, z: s * 0.205, rx: s * 0.6, rz: -c * 0.6 }, 4));
      }
      rig.add(h, 'gold', G.lathe([[0.06, 0], [0.14, 0.02], [0.24, 0.09], [0.28, 0.17], [0.265, 0.18], [0.22, 0.1], [0.12, 0.05], [0, 0.05]], { y: 0.36 }, 16));
      rig.add(h, 'gold', G.torus(0.275, 0.016, { y: 0.535, rx: PI / 2 }));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * PI * 2;
        rig.add(h, 'gold', G.cone(0.016, 0.07, { x: Math.cos(a) * 0.275, y: 0.57, z: Math.sin(a) * 0.275, rx: Math.sin(a) * 0.3, rz: -Math.cos(a) * 0.3 }, 4));
      }
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * PI * 2;
        rig.add(h, i % 2 ? 'glow:#ff5a1e' : 'glow:#ffb030', G.ico(0.06, { x: Math.cos(a) * 0.12, y: 0.47, z: Math.sin(a) * 0.12 }));
      }
      const fl = rig.bone('flames', h, { y: 0.52 });
      rig.add(fl, 'glow:#ffa030', G.sphere(0.14, { y: 0.1 }, 14));
      const tongues = rig.bone('tongues', fl);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * PI * 2;
        rig.add(tongues, i % 2 ? 'glow:#ff5a1e' : 'glow:#ffc24a', G.cone(0.07, 0.34 + (i % 3) * 0.06, { x: Math.cos(a) * 0.1, y: 0.25, z: Math.sin(a) * 0.1, rx: Math.sin(a) * 0.2, rz: -Math.cos(a) * 0.2 }, 6));
      }
      rig.add(tongues, 'glow:#ffe08a', G.cone(0.08, 0.5, { y: 0.32 }, 8));
      const emb = rig.bone('embers', h, { y: 0.7 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * PI * 2;
        rig.add(emb, 'glow:#ffcf4a', G.octa(0.022, { x: Math.cos(a) * 0.33, y: Math.sin(i * 2) * 0.08, z: Math.sin(a) * 0.33 }));
      }
      return {};
    },
    anim(B, t) {
      B.tongues.scale.set(1, 1 + Math.sin(t * 13) * 0.1, 1);
      B.tongues.rotation.y = t * 1.8;
      B.flames.scale.setScalar(1 + Math.sin(t * 9) * 0.04);
      B.embers.rotation.y = -t * 1.2;
      B.embers.position.y = 0.7 + Math.sin(t * 2) * 0.05;
    },
  },
  water: {
    build(rig, h) {
      rig.add(h, 'stone', G.lathe([[0.36, 0], [0.37, 0.04], [0.35, 0.14], [0.31, 0.15], [0.3, 0.06], [0, 0.06]], {}, 18));
      rig.add(h, 'water', G.cyl(0.31, 0.31, 0.02, { y: 0.12 }, 20));
      rig.add(h, 'marble', G.lathe([[0.09, 0], [0.07, 0.1], [0.05, 0.25], [0.08, 0.32], [0.05, 0.36], [0, 0.36]], { y: 0.06 }, 12));
      rig.add(h, 'marble', G.lathe([[0.04, 0], [0.12, 0.02], [0.2, 0.06], [0.21, 0.09], [0.18, 0.07], [0, 0.07]], { y: 0.4 }, 16));
      rig.add(h, 'gold', G.torus(0.205, 0.01, { y: 0.49, rx: PI / 2 }));
      rig.add(h, 'water', G.cyl(0.18, 0.18, 0.015, { y: 0.47 }, 16));
      const falls = rig.bone('falls', h);
      rig.add(falls, 'waterSheet', G.cyl(0.21, 0.29, 0.34, { y: 0.31 }, 18));
      const orb = rig.bone('orb', h, { y: 0.85 });
      rig.add(orb, 'water', G.sphere(0.17, {}, 20));
      rig.add(orb, 'glow:#d8f4ff', G.sphere(0.06, {}, 10));
      const r1 = rig.bone('ring1', orb);
      rig.add(r1, 'glow:#8fdcff', G.torus(0.27, 0.012));
      const r2 = rig.bone('ring2', orb);
      rig.add(r2, 'glow:#5ab8ff', G.torus(0.23, 0.01));
      const drops = rig.bone('drops', h, { y: 0.85 });
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * PI * 2;
        rig.add(drops, 'glow:#bfeaff', G.sphere(0.03, { x: Math.cos(a) * 0.32, y: Math.sin(i * 3) * 0.06, z: Math.sin(a) * 0.32, s: [1, 1.4, 1] }, 8));
      }
      return {};
    },
    anim(B, t) {
      B.orb.position.y = 0.85 + Math.sin(t * 2.4) * 0.04;
      B.ring1.rotation.set(t * 1.5, t * 0.8, 0);
      B.ring2.rotation.set(-t * 0.9, 0, t * 1.3);
      B.drops.rotation.y = t * 1.6;
      B.falls.scale.set(1 + Math.sin(t * 6) * 0.02, 1, 1 + Math.sin(t * 6) * 0.02);
    },
  },
  earth: {
    build(rig, h) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * PI * 2 + 0.3;
        rig.add(h, 'rock', G.ico(0.1 + (i % 2) * 0.03, { x: Math.cos(a) * 0.24, y: 0.07, z: Math.sin(a) * 0.24, rx: i, ry: i * 2 }, 0));
      }
      rig.add(h, 'rock', G.ico(0.17, { y: 0.1, s: [1, 0.7, 1] }, 0));
      const cr = [['#9ccf4a', 0, 0.42, 0, 0, 0, 0.09, 0.4], ['#c6f06a', 0.11, 0.3, 0.05, 0.3, -0.45, 0.06, 0.26], ['#e0a040', -0.1, 0.3, 0.07, 0.4, 0.5, 0.065, 0.24],
        ['#9ccf4a', 0.02, 0.28, -0.12, -0.5, 0.1, 0.055, 0.22], ['#e0a040', -0.05, 0.26, -0.08, -0.35, 0.5, 0.05, 0.18], ['#c6f06a', 0.08, 0.25, -0.05, -0.3, -0.5, 0.05, 0.2]];
      for (const [col, x, y, z, rx, rz, w, len] of cr) rig.add(h, 'crystal:' + col, G.octa(1, { x, y, z, rx, rz, s: [w, len, w] }));
      const orbit = rig.bone('orbit', h, { y: 0.45 });
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * PI * 2;
        const x = Math.cos(a) * 0.38, z = Math.sin(a) * 0.38;
        rig.add(orbit, 'slab', G.box(0.075, 0.12, 0.04, { x, z, ry: -a + PI / 2 }));
        rig.add(orbit, 'glow:#ffd27a', G.box(0.05, 0.016, 0.046, { x, y: 0.02, z, ry: -a + PI / 2 }), G.box(0.016, 0.07, 0.046, { x, z, ry: -a + PI / 2 }));
      }
      return {};
    },
    anim(B, t) {
      B.orbit.rotation.y = t * 0.9;
      B.orbit.position.y = 0.45 + Math.sin(t * 2) * 0.04;
    },
  },
  wind: {
    build(rig, h) {
      rig.add(h, 'marble', G.lathe([[0.17, 0], [0.15, 0.06], [0.1, 0.2], [0.08, 0.5], [0.1, 0.62], [0.07, 0.68], [0, 0.68]], {}, 12));
      for (const y of [0.06, 0.34, 0.6]) rig.add(h, 'gold', G.torus(0.12 - y * 0.05, 0.012, { y, rx: PI / 2 }));
      const swirl = rig.bone('swirl', h);
      for (let k = 0; k < 2; k++) {
        const pts = [];
        for (let i = 0; i <= 24; i++) {
          const a = (i / 24) * PI * 3 + k * PI;
          pts.push([Math.cos(a) * (0.25 - i * 0.004), 0.05 + i * 0.025, Math.sin(a) * (0.25 - i * 0.004)]);
        }
        rig.add(swirl, 'glow:#7affd0', G.tube(pts, (t) => 0.012 * Math.sin(t * PI) + 0.002, {}, 48, 4));
      }
      const aim = rig.bone('aim', h, { y: 0.7 });
      rig.add(aim, 'gold', G.sphere(0.05, { x: 0.06 }, 10), G.cyl(0.02, 0.02, 0.12, { x: 0.02, rz: PI / 2 }, 6));
      const rotor = rig.bone('rotor', aim, { x: 0.1 });
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * PI * 2;
        const c = Math.cos(a), s = Math.sin(a);
        rig.add(rotor, 'wood', G.box(0.015, 0.36, 0.015, { y: c * 0.18, z: s * 0.18, rx: -a }));
        rig.add(rotor, 'cloth', xf(G.sheet([[0, 0.05], [0.0, 0.34], [0.1, 0.34], [0.08, 0.06]]), { rx: -a + PI / 2, ry: PI / 2, x: 0.005 }));
      }
      return { aim: 'aim' };
    },
    anim(B, t, dt, boost) {
      B.rotor.rotation.x += dt * (6 + boost * 22);
      B.swirl.rotation.y = -t * 2.5;
    },
  },
  light: {
    build(rig, h) {
      rig.add(h, 'marble', G.lathe([[0.22, 0], [0.2, 0.05], [0.13, 0.1], [0.1, 0.4], [0.13, 0.48], [0.06, 0.52], [0, 0.52]], {}, 12));
      for (const y of [0.08, 0.3, 0.46]) rig.add(h, 'gold', G.torus(0.13 - y * 0.06, 0.012, { y, rx: PI / 2 }));
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * PI * 2 + PI / 4;
        rig.add(h, 'goldSheet', xf(G.sheet([[0, 0], [0.06, 0.08], [0.16, 0.12], [0.12, 0.2], [0.03, 0.28], [0, 0.2]]), { rx: -PI / 2, ry: -a, x: Math.cos(a) * 0.1, y: 0.22, z: Math.sin(a) * 0.1 }));
      }
      const cry = rig.bone('crystal', h, { y: 0.88 });
      rig.add(cry, 'crystal:#fff0a0', G.octa(1, { s: [0.17, 0.38, 0.17] }));
      rig.add(cry, 'glow:#ffffff', G.octa(1, { s: [0.06, 0.16, 0.06] }));
      const sats = rig.bone('sats', h, { y: 0.88 });
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * PI * 2;
        rig.add(sats, 'crystal:#ffe35a', G.octa(1, { x: Math.cos(a) * 0.3, z: Math.sin(a) * 0.3, s: [0.035, 0.08, 0.035] }));
      }
      const halo = rig.bone('halo', h, { y: 0.88 });
      rig.add(halo, 'glow:#fff2a0', G.torus(0.27, 0.01, { rx: PI / 2 }));
      return {};
    },
    anim(B, t) {
      const y = 0.88 + Math.sin(t * 2) * 0.05;
      B.crystal.position.y = y; B.sats.position.y = y; B.halo.position.y = y;
      B.crystal.rotation.y = t * 0.8;
      B.sats.rotation.y = -t * 1.4;
      B.halo.scale.setScalar(1 + Math.sin(t * 3) * 0.06);
    },
  },
  dark: {
    build(rig, h) {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * PI * 2;
        rig.add(h, 'iron', G.tube([[Math.cos(a) * 0.26, 0, Math.sin(a) * 0.26], [Math.cos(a) * 0.2, 0.2, Math.sin(a) * 0.2], [Math.cos(a) * 0.17, 0.4, Math.sin(a) * 0.17]], [0.022, 0.016], {}, 8, 6));
        const sa = a + PI / 3;
        rig.add(h, 'bone', G.sphere(0.045, { x: Math.cos(sa) * 0.3, y: 0.045, z: Math.sin(sa) * 0.3 }, 10));
        for (const d of [-1, 1]) rig.add(h, 'iron', G.sphere(0.012, { x: Math.cos(sa) * 0.338 + Math.cos(sa + PI / 2) * d * 0.016, y: 0.055, z: Math.sin(sa) * 0.338 + Math.sin(sa + PI / 2) * d * 0.016 }, 6));
      }
      rig.add(h, 'iron', G.lathe([[0.05, 0], [0.2, 0.04], [0.27, 0.14], [0.26, 0.26], [0.22, 0.31], [0.235, 0.33], [0.21, 0.33], [0, 0.3]], { y: 0.16 }, 18));
      rig.add(h, 'iron', G.torus(0.225, 0.02, { y: 0.49, rx: PI / 2 }));
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * PI * 2 + 0.5;
        for (let k = 0; k < 3; k++) rig.add(h, 'iron', G.torus(0.018, 0.005, { x: Math.cos(a) * 0.235, y: 0.45 - k * 0.03, z: Math.sin(a) * 0.235, ry: k % 2 ? 0 : PI / 2 }));
      }
      rig.add(h, 'glow:#a84dff', G.cyl(0.2, 0.2, 0.01, { y: 0.475 }, 18));
      for (let i = 0; i < 4; i++) {
        const b = rig.bone('bub' + i, h);
        rig.add(b, 'glow:#d09aff', G.sphere(0.035, {}, 8));
      }
      const orb = rig.bone('orb', h, { y: 0.92 });
      rig.add(orb, 'voidOrb', G.sphere(0.12, {}, 16));
      const r1 = rig.bone('ring1', orb);
      rig.add(r1, 'glow:#b070ff', G.torus(0.21, 0.012));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * PI * 2;
        rig.add(r1, 'glow:#b070ff', G.cone(0.015, 0.06, { x: Math.cos(a) * 0.21, y: Math.sin(a) * 0.21, rz: a - PI / 2 }, 4));
      }
      const r2 = rig.bone('ring2', orb);
      rig.add(r2, 'glow:#7a3dff', G.torus(0.17, 0.01));
      return {};
    },
    anim(B, t) {
      const y = 0.92 + Math.sin(t * 2) * 0.04;
      B.orb.position.y = y;
      B.ring1.rotation.set(t * 1.2, t * 0.6, 0);
      B.ring2.rotation.set(-t * 0.8, 0, t * 1.5);
      for (let i = 0; i < 4; i++) {
        const k = (t * 0.6 + i / 4) % 1;
        B['bub' + i].position.set(Math.cos(i * 2.3) * 0.11, 0.48 + k * 0.3, Math.sin(i * 2.3) * 0.11);
        B['bub' + i].scale.setScalar(1 - k);
      }
    },
  },
};

/* ---------------- แม่แบบ ---------------- */
const templates = new Map();

function templateKey(t) {
  return t.kind === 'basic' ? `b:${t.base}:${t.tier}` : `e:${t.elements.join('+')}:${t.tier}`;
}

function buildTemplate(t) {
  const rig = new Rig();
  const cols = t.kind === 'basic' ? [BASIC[t.base].color] : t.elements.map((e) => ELEMENTS[e].color);
  const top = buildPad(rig, t, cols);
  const head = rig.bone('head', rig.root, { y: top });
  const style = t.kind === 'basic' ? t.base : t.elements[0];
  const def = HEADS[style];
  const meta = def.build(rig, head);
  const n = t.kind === 'basic' ? 0 : t.elements.length;
  if (n >= 2) {
    const others = t.elements.slice(1);
    const orbit = rig.bone('orbit2', rig.root, { y: top + 0.62 });
    const per = others.length * 2;
    for (let i = 0; i < per; i++) {
      const a = (i / per) * PI * 2;
      rig.add(orbit, 'crystal:' + ELEMENTS[others[i % others.length]].color, G.octa(1, { x: Math.cos(a) * 0.46, z: Math.sin(a) * 0.46, s: [0.05, 0.11, 0.05] }));
    }
    others.forEach((e, i) => rig.add(rig.root, 'glow:' + ELEMENTS[e].color, G.torus(0.5 + i * 0.05, 0.012, { y: 0.26 + i * 0.05, rx: PI / 2 })));
    if (n === 3) {
      const crown = rig.bone('crown', rig.root, { y: top + 1.12 });
      rig.add(crown, 'gold', G.torus(0.16, 0.014, { rx: PI / 2 }));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * PI * 2;
        rig.add(crown, 'gold', G.cone(0.025, 0.1, { x: Math.cos(a) * 0.16, y: 0.05, z: Math.sin(a) * 0.16 }, 4));
        rig.add(crown, 'crystal:' + ELEMENTS[t.elements[i % 3]].color, G.octa(0.02, { x: Math.cos(a) * 0.16, y: 0.11, z: Math.sin(a) * 0.16 }));
      }
    }
  }
  const root = rig.finalize();
  root.traverse((o) => {
    if (o.isMesh) {
      const role = o.userData.role;
      o.material = towerMat(role);
      // เฉพาะชิ้นใหญ่ที่ทอดเงา เพื่อลด draw call ในรอบเงา
      o.castShadow = SHADOW_ROLES.has(role) && o.parent && ['pad', 'head', 'aim'].includes(o.parent.name);
      o.receiveShadow = !role.startsWith('glow:') && role !== 'waterSheet';
    }
  });
  // วงรูนบนฐาน (ป้อมธาตุ)
  if (t.kind !== 'basic') {
    const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshBasicMaterial({ map: runeTexture(), color: new THREE.Color(cols[0]).multiplyScalar(0.9), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    rune.name = 'rune';
    rune.rotation.x = -PI / 2;
    rune.position.y = top + 0.003;
    root.add(rune);
  }
  return { root, style, n, aim: meta.aim || null, top };
}

export function buildTowerModel(t) {
  const key = templateKey(t);
  if (!templates.has(key)) templates.set(key, buildTemplate(t));
  const tpl = templates.get(key);
  const group = tpl.root.clone(true);
  const B = {};
  group.traverse((o) => { if (o.name) B[o.name] = o; });
  const head = B.head;
  const aim = tpl.aim ? B[tpl.aim] : head;
  const def = HEADS[tpl.style];
  const anims = [(tt, dt, boost) => def.anim(B, tt, dt, boost)];
  if (B.rune) anims.push((tt) => { B.rune.rotation.z = tt * 0.4; });
  if (B.padOrbs) anims.push((tt) => { B.padOrbs.rotation.y = tt * 0.8; B.padOrbs.position.y = Math.sin(tt * 2) * 0.03; });
  if (B.orbit2) anims.push((tt) => { B.orbit2.rotation.y = tt * 1.8; B.orbit2.position.y = tpl.top + 0.62 + Math.sin(tt * 2.5) * 0.05; });
  if (B.crown) anims.push((tt) => { B.crown.rotation.y = tt; B.crown.position.y = tpl.top + 1.12 + Math.sin(tt * 2) * 0.04; });
  if (tpl.n >= 2) head.scale.setScalar(1 + (tpl.n - 1) * 0.07);
  // ป้อมที่ไม่มีส่วนเล็งเฉพาะ จะไม่หมุนทั้งหัว (สวยกว่า) — ใช้กลุ่มเปล่าแทน
  const aimTarget = tpl.aim ? aim : new THREE.Group();
  return { group, head, aim: aimTarget, anims };
}
