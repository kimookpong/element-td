/* ============================================================
 *  โมเดล 3D ของป้อม (procedural) — รวม mesh ตามวัสดุผ่าน Rig
 *  แต่ละระดับ (1/2/3) มีขนาดและรูปทรงต่างกันชัดเจน
 *  แม่แบบถูกแคชต่อชนิด/ระดับ แล้ว clone ให้แต่ละป้อม
 * ============================================================ */
import * as THREE from 'three';
import { ELEMENTS, BASIC } from './data.js';
import { std, glow } from './gfx.js';
import { brickTexture } from './textures.js';
import { Rig, G, xf } from './modelkit.js';
import { ELEMENT_HEADS } from './towerHeads.js';

const PI = Math.PI;
const SHADOW_ROLES = new Set(['stone', 'stoneDark', 'marble', 'wood', 'roof', 'iron', 'rock', 'bronze', 'thatch', 'brick', 'copper', 'obsidian', 'sand', 'bone']);
const TIER_SCALE = [1.0, 1.06, 1.14];
// หัวป้อมระดับต้นขยายใหญ่ขึ้น ให้ดูสมน้ำสมเนื้อกับมอนสเตอร์
const HEAD_SCALE = [1.3, 1.15, 1.0];

/* ---------------- วัสดุตาม role ---------------- */
const FIXED = {
  stone: () => std(0x8a8c98, { map: brickTexture('stone'), roughness: 0.85 }),
  stoneDark: () => std(0x4c4e5c, { roughness: 0.85, flatShading: true }),
  slab: () => std(0x9497a6, { roughness: 0.6, flatShading: true }),
  rock: () => std(0x8a7350, { roughness: 0.95, flatShading: true }),
  marble: () => std(0xeeeae0, { roughness: 0.3 }),
  wood: () => std(0x8a5c36, { roughness: 0.85 }),
  woodDark: () => std(0x4a3220, { roughness: 0.85 }),
  thatch: () => std(0xc9a25a, { roughness: 0.95, flatShading: true }),
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
  brick: () => std(0x4a3a36, { map: brickTexture('stone'), roughness: 0.9 }),
  copper: () => std(0xc8743a, { metalness: 0.85, roughness: 0.28 }),
  obsidian: () => std(0x1c1624, { roughness: 0.18, metalness: 0.3, flatShading: true }),
  blackSun: () => new THREE.MeshBasicMaterial({ color: 0x050008 }),
  abyssWater: () => std(0x14061e, { roughness: 0.05, emissive: 0x3a0a6a, emissiveIntensity: 0.8 }),
  lava: () => std(0xff5a1e, { emissive: 0xff4a10, emissiveIntensity: 1.8, roughness: 0.6 }),
  steam: () => std(0xffffff, { transparent: true, opacity: 0.45, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.3, depthWrite: false }),
  mud: () => std(0x4e3620, { roughness: 0.35, metalness: 0.05 }),
  moss: () => std(0x5a8a3a, { roughness: 0.9 }),
  sand: () => std(0xd8b878, { roughness: 0.95, flatShading: true }),
  sandDark: () => std(0xa8844a, { roughness: 0.9 }),
  mirror: () => std(0xfff4c8, { metalness: 0.5, roughness: 0.2, emissive: 0xffc040, emissiveIntensity: 0.9, side: THREE.DoubleSide }),
  blade: () => std(0xdde6ea, { metalness: 0.8, roughness: 0.25, side: THREE.DoubleSide }),
};
function towerMat(role) {
  if (FIXED[role]) return FIXED[role]();
  const [kind, col] = role.split(':');
  if (kind === 'glow') return glow(col, 2.6);
  if (kind === 'crystal') return std(col, { flatShading: true, roughness: 0.15, metalness: 0.1, emissive: col, emissiveIntensity: 0.65, transparent: true, opacity: 0.93 });
  if (kind === 'banner') return std(col, { side: THREE.DoubleSide, roughness: 0.8, emissive: col, emissiveIntensity: 0.15 });
  return std(0xff00ff);
}

const ring = (n, r, fn) => { for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2; fn(Math.cos(a) * r, Math.sin(a) * r, a, i); } };

/* ---------------- ฐานป้อม (ต่างกันตามระดับ) ---------------- */
function buildPad(rig, t, cols, T) {
  const pad = rig.bone('pad');
  const rim = (y, half) => {
    for (let i = 0; i < 4; i++) {
      const a = (i * PI) / 2;
      rig.add(pad, t.kind === 'basic' ? 'glow:#ffcf7a' : 'glow:' + cols[i % cols.length], G.box(0.022, 0.025, half * 2 - 0.02, { x: Math.cos(a) * half, y, z: Math.sin(a) * half, ry: a }));
    }
  };
  if (T === 1) {
    rig.add(pad, 'stoneDark', G.box(0.84, 0.07, 0.84, { y: 0.035 }));
    rig.add(pad, 'slab', G.box(0.74, 0.04, 0.74, { y: 0.09 }));
    rim(0.075, 0.405);
    return 0.11;
  }
  if (T === 2) {
    rig.add(pad, 'stoneDark', G.box(0.96, 0.07, 0.96, { y: 0.035 }));
    rig.add(pad, 'stone', G.box(0.86, 0.12, 0.86, { y: 0.13 }));
    rig.add(pad, 'slab', G.box(0.8, 0.04, 0.8, { y: 0.21 }));
    rim(0.185, 0.435);
    ring(4, 0.56, (x, z, a) => {
      const rx = Math.cos(a + PI / 4) * 0.56, rz = Math.sin(a + PI / 4) * 0.56;
      rig.add(pad, 'stone', G.box(0.11, 0.16, 0.11, { x: rx, y: 0.29, z: rz }));
      rig.add(pad, 'slab', G.cone(0.085, 0.08, { x: rx, y: 0.41, z: rz, ry: PI / 4 }, 4));
    });
    return 0.23;
  }
  // ระดับ 3: ฐานสามชั้นประดับทอง เสาสูงพร้อมคริสตัลลอย
  rig.add(pad, 'stoneDark', G.box(1.0, 0.08, 1.0, { y: 0.04 }));
  rig.add(pad, 'stone', G.box(0.92, 0.12, 0.92, { y: 0.14 }));
  rig.add(pad, 'gold', G.box(0.94, 0.02, 0.94, { y: 0.21 }));
  rig.add(pad, 'stone', G.box(0.8, 0.08, 0.8, { y: 0.26 }));
  rig.add(pad, 'slab', G.box(0.74, 0.03, 0.74, { y: 0.315 }));
  rim(0.2, 0.465);
  ring(4, 0.6, (x, z, a) => {
    const rx = Math.cos(a + PI / 4) * 0.6, rz = Math.sin(a + PI / 4) * 0.6;
    rig.add(pad, 'stone', G.box(0.13, 0.36, 0.13, { x: rx, y: 0.26, z: rz }));
    rig.add(pad, 'gold', G.box(0.15, 0.025, 0.15, { x: rx, y: 0.3, z: rz }), G.box(0.15, 0.025, 0.15, { x: rx, y: 0.44, z: rz }));
    rig.add(pad, 'gold', G.cone(0.1, 0.12, { x: rx, y: 0.51, z: rz, ry: PI / 4 }, 4));
  });
  const orbs = rig.bone('padOrbs', pad);
  ring(4, 0.6, (x, z, a, i) => {
    rig.add(orbs, 'crystal:' + cols[i % cols.length], G.octa(0.055, { x: Math.cos(a + PI / 4) * 0.6, y: 0.68, z: Math.sin(a + PI / 4) * 0.6, s: [0.8, 1.7, 0.8] }));
  });
  return 0.33;
}

/* ---------------- หัวป้อมแต่ละชนิด: build(rig, head, tier) ---------------- */
const HEADS_BASE = {
  arrow: {
    build(rig, h, T) {
      if (T === 1) {
        // หอไม้ยามเล็ก ๆ หลังคามุงจาก
        ring(4, 0.17, (x, z) => rig.add(h, 'wood', G.box(0.04, 0.4, 0.04, { x, y: 0.2, z })));
        rig.add(h, 'woodDark', G.box(0.38, 0.035, 0.38, { y: 0.32, ry: PI / 4 }));
        rig.add(h, 'thatch', G.cone(0.3, 0.24, { y: 0.56, ry: PI / 4 }, 4));
        const aim = rig.bone('aim', h, { y: 0.38 });
        rig.add(aim, 'wood', G.box(0.22, 0.03, 0.035));
        for (const s of [-1, 1]) rig.add(aim, 'woodDark', G.tube([[0.09, 0, 0], [0.07, 0.005, s * 0.08]], [0.01, 0.006], {}, 4, 4));
        return { aim: 'aim' };
      }
      const tall = T === 3;
      const baseH = tall ? 0.52 : 0.28;
      rig.add(h, 'stone', G.cyl(tall ? 0.26 : 0.25, tall ? 0.31 : 0.28, baseH, { y: baseH / 2 }, 12));
      if (tall) {
        ring(4, 0.27, (x, z, a) => rig.add(h, 'iron', G.box(0.02, 0.1, 0.05, { x, y: 0.3, z, ry: -a })));
        rig.add(h, 'gold', G.torus(0.275, 0.012, { y: 0.2, rx: PI / 2 }));
      }
      ring(tall ? 10 : 8, tall ? 0.25 : 0.235, (x, z, a) => rig.add(h, 'stone', G.box(0.08, 0.07, 0.06, { x, y: baseH + 0.035, z, ry: -a })));
      const py = baseH + 0.02;
      rig.add(h, 'woodDark', G.cyl(0.3, 0.3, 0.035, { y: py }, 12));
      ring(4, 0.23, (x, z) => rig.add(h, 'wood', G.box(0.04, 0.34, 0.04, { x: x * Math.SQRT1_2 - z * Math.SQRT1_2, y: py + 0.18, z: x * Math.SQRT1_2 + z * Math.SQRT1_2 })));
      rig.add(h, 'roof', G.cone(tall ? 0.44 : 0.4, tall ? 0.36 : 0.3, { y: py + (tall ? 0.53 : 0.5) }, 8));
      if (tall) rig.add(h, 'roof', G.cone(0.2, 0.22, { y: py + 0.82 }, 8));
      rig.add(h, 'woodDark', G.torus(tall ? 0.41 : 0.37, 0.018, { y: py + 0.36, rx: PI / 2 }));
      const topY = py + (tall ? 0.95 : 0.66);
      rig.add(h, 'gold', G.sphere(0.035, { y: topY }, 8));
      rig.add(h, 'woodDark', G.cyl(0.01, 0.01, 0.25, { y: topY + 0.12 }, 5));
      const flag = rig.bone('flag', h, { y: topY + 0.18 });
      rig.add(flag, 'banner:#c0392b', G.sheet([[0, 0], [0.16, 0.01], [0.13, 0.05], [0.17, 0.09], [0, 0.09]], { rx: -PI / 2 }));
      if (tall) {
        for (const s of [-1, 1]) {
          const f2 = rig.bone('flag' + (s > 0 ? 'L' : 'R'), h, { x: 0, y: 0.45, z: s * 0.28 });
          rig.add(f2, 'banner:#c0392b', G.sheet([[0, 0], [0.012, 0], [0.012, -0.2], [0, -0.24]], { rx: -PI / 2, ry: PI / 2 }));
        }
      }
      const aim = rig.bone('aim', h, { y: py + 0.13 });
      const bows = tall ? [-0.06, 0.06] : [0];
      for (const off of bows) {
        rig.add(aim, 'wood', G.box(0.36, 0.04, 0.05, { x: 0.02, z: off }), G.box(0.06, 0.08, 0.08, { x: -0.14, y: -0.03, z: off }));
        for (const s of [-1, 1]) rig.add(aim, 'woodDark', G.tube([[0.14, 0, off], [0.13, 0.01, off + s * 0.1], [0.08, 0.015, off + s * 0.18]], [0.014, 0.008], {}, 6, 5));
        rig.add(aim, 'iron', G.cyl(0.006, 0.006, 0.3, { x: 0.05, y: 0.03, z: off, rz: PI / 2 }, 4), G.cone(0.016, 0.05, { x: 0.22, y: 0.03, z: off, rz: -PI / 2 }, 4));
      }
      return { aim: 'aim' };
    },
    anim(B, t) {
      if (B.flag) B.flag.rotation.y = Math.sin(t * 3) * 0.3;
      if (B.flagL) B.flagL.rotation.x = Math.sin(t * 2.4) * 0.1;
      if (B.flagR) B.flagR.rotation.x = Math.sin(t * 2.4 + 1) * 0.1;
    },
  },
  cannon: {
    build(rig, h, T) {
      if (T === 1) {
        // กำแพงซุงล้อมปืนใหญ่ขนาดเล็ก
        ring(7, 0.24, (x, z, a) => rig.add(h, 'wood', G.cyl(0.05, 0.05, 0.2, { x, y: 0.09, z }, 7)));
        const aim = rig.bone('aim', h, { y: 0.08 });
        rig.add(aim, 'woodDark', G.box(0.18, 0.06, 0.12, { y: 0.03 }));
        rig.add(aim, 'bronze', G.tube([[-0.08, 0.08, 0], [0.18, 0.1, 0]], [0.055, 0.045], {}, 6, 10));
        rig.add(aim, 'gold', G.torus(0.05, 0.01, { x: 0.18, y: 0.1, ry: PI / 2 }));
        return { aim: 'aim' };
      }
      const big = T === 3;
      const r0 = big ? 0.34 : 0.3, hh = big ? 0.32 : 0.22;
      rig.add(h, 'stone', G.cyl(r0, r0 + 0.03, hh, { y: hh / 2 }, 14));
      rig.add(h, 'slab', G.cyl(r0 - 0.04, r0 - 0.04, 0.02, { y: hh + 0.005 }, 14));
      ring(big ? 12 : 10, r0 - 0.01, (x, z, a) => rig.add(h, 'stone', G.box(0.07, 0.07, 0.07, { x, y: hh + 0.035, z, ry: -a })));
      if (big) {
        ring(4, 0.36, (x, z, a) => {
          const rx = Math.cos(a + PI / 4) * 0.36, rz = Math.sin(a + PI / 4) * 0.36;
          rig.add(h, 'stone', G.cyl(0.08, 0.09, 0.46, { x: rx, y: 0.23, z: rz }, 8));
          rig.add(h, 'roof', G.cone(0.11, 0.16, { x: rx, y: 0.54, z: rz }, 8));
        });
      }
      const aim = rig.bone('aim', h, { y: hh + 0.05 });
      for (const s of [-1, 1]) {
        rig.add(aim, 'wood', G.box(0.24, 0.1, 0.03, { y: 0.04, z: s * (big ? 0.12 : 0.08) }));
        rig.add(aim, 'woodDark', G.cyl(0.075, 0.075, 0.03, { x: -0.02, y: 0.03, z: s * (big ? 0.15 : 0.11), rx: PI / 2 }, 12));
        rig.add(aim, 'gold', G.cyl(0.02, 0.02, 0.04, { x: -0.02, y: 0.03, z: s * (big ? 0.15 : 0.11), rx: PI / 2 }, 6));
      }
      const barrels = big ? [-0.055, 0.055] : [0];
      for (const z of barrels) {
        const len = big ? 0.36 : 0.3;
        rig.add(aim, 'bronze', G.tube([[-0.13, 0.1, z], [0.08, 0.12, z], [len, 0.15, z]], [big ? 0.07 : 0.085, big ? 0.05 : 0.06], {}, 10, 12));
        for (const x of [-0.06, 0.08, 0.22]) rig.add(aim, 'gold', G.torus((big ? 0.06 : 0.072) - x * 0.05, 0.011, { x, y: 0.105 + x * 0.12, z, ry: PI / 2, rx: 0.12 }));
        rig.add(aim, 'gold', G.torus(big ? 0.054 : 0.064, 0.015, { x: len, y: 0.15, z, ry: PI / 2, rx: 0.12 }));
      }
      rig.add(aim, 'gold', G.sphere(0.045, { x: -0.16, y: 0.1 }, 10));
      return { aim: 'aim' };
    },
    anim() {},
  },
  light: {
    build(rig, h, T) {
      if (T === 1) {
        rig.add(h, 'slab', G.cyl(0.14, 0.18, 0.12, { y: 0.06 }, 8));
        rig.add(h, 'gold', G.torus(0.13, 0.01, { y: 0.12, rx: PI / 2 }));
        const cry = rig.bone('crystal', h, { y: 0.36 });
        rig.add(cry, 'crystal:#fff0a0', G.octa(1, { s: [0.09, 0.2, 0.09] }));
        rig.add(cry, 'glow:#ffffff', G.octa(1, { s: [0.03, 0.08, 0.03] }));
        return {};
      }
      const big = T === 3;
      const H = big ? 0.75 : 0.52;
      rig.add(h, 'marble', G.lathe([[0.22, 0], [0.2, 0.05], [0.13, 0.1], [0.1, H - 0.12], [0.13, H - 0.04], [0.06, H], [0, H]], {}, 12));
      for (const y of [0.08, H * 0.55, H - 0.06]) rig.add(h, 'gold', G.torus(0.13 - y * 0.05, 0.012, { y, rx: PI / 2 }));
      const fin = big ? 1.6 : 1;
      ring(4, 1, (c, s, a) => {
        const aa = a + PI / 4;
        rig.add(h, 'goldSheet', xf(G.sheet([[0, 0], [0.06, 0.08], [0.16, 0.12], [0.12, 0.2], [0.03, 0.28], [0, 0.2]].map(([x, y]) => [x * fin, y * fin])), { rx: -PI / 2, ry: -aa, x: Math.cos(aa) * 0.1, y: H * 0.42, z: Math.sin(aa) * 0.1 }));
      });
      const cy = H + (big ? 0.42 : 0.36);
      const cry = rig.bone('crystal', h, { y: cy });
      const cs = big ? 1.35 : 1;
      rig.add(cry, 'crystal:#fff0a0', G.octa(1, { s: [0.17 * cs, 0.38 * cs, 0.17 * cs] }));
      rig.add(cry, 'glow:#ffffff', G.octa(1, { s: [0.06 * cs, 0.16 * cs, 0.06 * cs] }));
      const sats = rig.bone('sats', h, { y: cy });
      ring(big ? 5 : 3, big ? 0.38 : 0.3, (x, z) => rig.add(sats, 'crystal:#ffe35a', G.octa(1, { x, z, s: [0.035, 0.08, 0.035] })));
      const halo = rig.bone('halo', h, { y: cy });
      rig.add(halo, 'glow:#fff2a0', G.torus(big ? 0.34 : 0.27, 0.01, { rx: PI / 2 }));
      if (big) rig.add(halo, 'glow:#ffe35a', G.torus(0.42, 0.008, { rx: PI / 2 + 0.3 }));
      return {};
    },
    anim(B, t) {
      B.crystal.rotation.y = t * 0.8;
      if (B.sats) B.sats.rotation.y = -t * 1.4;
      if (B.halo) B.halo.scale.setScalar(1 + Math.sin(t * 3) * 0.06);
    },
  },
};

const HEADS = { ...HEADS_BASE, ...ELEMENT_HEADS };

/* ---------------- แม่แบบ ---------------- */
const templates = new Map();
const templateKey = (t) => (t.kind === 'basic' ? `b:${t.base}:${t.tier}` : `e:${t.elements.join('+')}:${t.tier}`);

function buildTemplate(t) {
  const rig = new Rig();
  const T = Math.min(3, t.tier);
  const cols = t.kind === 'basic' ? [BASIC[t.base].color] : t.elements.map((e) => ELEMENTS[e].color);
  const top = buildPad(rig, t, cols, T);
  const head = rig.bone('head', rig.root, { y: top });
  const style = t.kind === 'basic' ? t.base : t.elements.slice().sort().join('+');
  const meta = HEADS[style].build(rig, head, T);
  const n = t.kind === 'basic' ? 0 : t.elements.length;
  head.scale.setScalar(HEAD_SCALE[T - 1]);
  const extraH = (meta.height || { 1: 0.45, 2: 0.6, 3: 0.85 }[T]) * HEAD_SCALE[T - 1];
  const root = rig.finalize();
  root.traverse((o) => {
    if (o.isMesh) {
      const role = o.userData.role;
      o.material = towerMat(role);
      o.castShadow = SHADOW_ROLES.has(role) && o.parent && ['pad', 'head', 'aim'].includes(o.parent.name);
      o.receiveShadow = !role.startsWith('glow:') && role !== 'waterSheet';
    }
  });
  root.scale.setScalar(TIER_SCALE[T - 1]);
  const wrap = new THREE.Group();
  wrap.add(root);
  root.name = 'model';
  return { root: wrap, style, n, aim: meta.aim || null, top, extraH, height: (top + extraH + (meta.height ? 0.05 : 0.4)) * TIER_SCALE[T - 1] };
}

export function buildTowerModel(t) {
  const key = templateKey(t);
  if (!templates.has(key)) templates.set(key, buildTemplate(t));
  const tpl = templates.get(key);
  const group = tpl.root.clone(true);
  const B = {};
  group.traverse((o) => { if (o.name) B[o.name] = o; });
  const def = HEADS[tpl.style];
  const anims = [(tt, dt, boost) => def.anim(B, tt, dt, boost)];
  const bob = (name, base, amp, sp) => { if (B[name]) anims.push((tt) => { B[name].position.y = base + Math.sin(tt * sp) * amp; }); };
  if (B.crystal) bob('crystal', B.crystal.position.y, 0.05, 2);
  if (B.sats) bob('sats', B.sats.position.y, 0.05, 2);
  if (B.halo) bob('halo', B.halo.position.y, 0.05, 2);
  if (B.orb) bob('orb', B.orb.position.y, 0.04, 2.3);
  if (B.drops) bob('drops', B.drops.position.y, 0.04, 2.3);
  if (B.orbit) bob('orbit', B.orbit.position.y, 0.04, 2);
  if (B.embers) bob('embers', B.embers.position.y, 0.05, 2);
  if (B.padOrbs) anims.push((tt) => { B.padOrbs.rotation.y = tt * 0.8; B.padOrbs.position.y = Math.sin(tt * 2) * 0.03; });
  const aimTarget = (tpl.aim && B[tpl.aim]) || new THREE.Group();
  return { group, head: B.head, model: B.model, aim: aimTarget, anims, height: tpl.height };
}
