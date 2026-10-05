/* ============================================================
 *  โมเดล 3D ของป้อม (procedural) — รวม mesh ตามวัสดุผ่าน Rig
 *  แต่ละระดับ (1/2/3) มีขนาดและรูปทรงต่างกันชัดเจน
 *  แม่แบบถูกแคชต่อชนิด/ระดับ แล้ว clone ให้แต่ละป้อม
 * ============================================================ */
import * as THREE from 'three';
import { ELEMENTS, BASIC } from './data.js';
import { std, glow } from './gfx.js';
import { brickTexture, surfaceTexture } from './textures.js';
import { Rig } from './modelkit.js';
import { buildRunicPad } from './artDirection.js';
import { buildSculptedTower, animateSculptedTower } from './sculptedTowers.js';

const SHADOW_ROLES = new Set(['stone', 'stoneDark', 'marble', 'wood', 'roof', 'iron', 'rock', 'bronze', 'thatch', 'brick', 'copper', 'obsidian', 'sand', 'bone']);
const TIER_SCALE = [1.0, 1.06, 1.14];

/* ---------------- วัสดุตาม role ---------------- */
const FIXED = {
  stone: () => std(0x686d72, { roughness: 0.85 }),
  stoneDark: () => std(0x4c4e5c, { roughness: 0.85, flatShading: true }),
  slab: () => std(0x7d8285, { roughness: 0.6, flatShading: true }),
  rock: () => std(0x8a7350, { roughness: 0.95, flatShading: true }),
  marble: () => std(0xb9b8ad, { roughness: 0.3 }),
  wood: () => std(0x8a5c36, { roughness: 0.85 }),
  woodDark: () => std(0x4a3220, { roughness: 0.85 }),
  thatch: () => std(0xc9a25a, { roughness: 0.95, flatShading: true }),
  roof: () => std(0x733c30, { roughness: 0.7, flatShading: true }),
  gold: () => std(0xb89951, { metalness: 0.9, roughness: 0.22 }),
  goldSheet: () => std(0xb89951, { metalness: 0.75, roughness: 0.3, side: THREE.DoubleSide }),
  bronze: () => std(0x9a6a3a, { metalness: 0.8, roughness: 0.32 }),
  iron: () => std(0x2a2830, { metalness: 0.6, roughness: 0.42 }),
  bone: () => std(0xb9ad91, { roughness: 0.5 }),
  cloth: () => std(0xf0e6cc, { roughness: 0.9, side: THREE.DoubleSide }),
  water: () => std(0x3aa0ff, { roughness: 0.05, metalness: 0.15, emissive: 0x1260ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.86 }),
  waterSheet: () => std(0x8fd8ff, { roughness: 0.05, emissive: 0x2a8aff, emissiveIntensity: 0.6, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }),
  voidOrb: () => std(0x120820, { emissive: 0x8a3dff, emissiveIntensity: 1.5, roughness: 0.2 }),
  brick: () => std(0x795044, { roughness: 0.9 }),
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
const towerMaterials = new Map();
function towerMat(role) {
  if (towerMaterials.has(role)) return towerMaterials.get(role);
  if (FIXED[role]) {
    const m = FIXED[role]().clone();
    const kind = ['gold','goldSheet','bronze','iron','copper','blade'].includes(role) ? 'metal' : ['wood','woodDark'].includes(role) ? 'wood' : 'stone';
    if (!m.map && !['water','waterSheet','voidOrb','blackSun','lava','steam','abyssWater'].includes(role)) {
      m.map = surfaceTexture(kind); m.bumpMap = m.map; m.bumpScale = kind === 'metal' ? 0.0015 : 0.008;
    }
    m.envMapIntensity = kind === 'metal' ? 0.8 : 0.35;
    towerMaterials.set(role, m);
    return m;
  }
  const [kind, col] = role.split(':');
  if (kind === 'glow') return glow(col, 1.5);
  if (kind === 'crystal') return std(col, { flatShading: true, roughness: 0.15, metalness: 0.1, emissive: col, emissiveIntensity: 0.22, transparent: true, opacity: 0.93 });
  if (kind === 'banner') return std(col, { side: THREE.DoubleSide, roughness: 0.8, emissive: col, emissiveIntensity: 0.15 });
  return std(0xff00ff);
}

/* ---------------- แม่แบบ ---------------- */
const templates = new Map();
const templateKey = (t) => (t.kind === 'basic' ? `b:${t.base}:${t.tier}` : `e:${t.elements.join('+')}:${t.tier}`);

function buildTemplate(t) {
  const rig = new Rig();
  const T = Math.min(3, t.tier);
  const cols = t.kind === 'basic' ? [BASIC[t.base].color] : t.elements.map((e) => ELEMENTS[e].color);
  const top = buildRunicPad(rig, t, cols, T);
  const head = rig.bone('head', rig.root, { y: top });
  const style = t.kind === 'basic' ? t.base : t.elements.slice().sort().join('+');
  const meta = buildSculptedTower(rig, head, style, T);
  const n = t.kind === 'basic' ? 0 : t.elements.length;
  const extraH = (meta.height || { 1: 0.45, 2: 0.6, 3: 0.85 }[T]);
  const root = rig.finalize();
  root.traverse((o) => {
    if (o.isMesh) {
      const role = o.userData.role;
      o.material = towerMat(role);
      o.castShadow = SHADOW_ROLES.has(role);
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
  if (B.energyCore) B.energyCore.userData.restY = B.energyCore.position.y;
  const anims = [(tt, dt, boost) => animateSculptedTower(B, tt, dt, boost)];
  const aimTarget = (tpl.aim && B[tpl.aim]) || new THREE.Group();
  return { group, head: B.head, model: B.model, aim: aimTarget, anims, height: tpl.height };
}
