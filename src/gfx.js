/* ============================================================
 *  ตัวช่วยกราฟิกที่ใช้ร่วมกัน: แคชวัสดุ/เรขาคณิต, แปลงพิกัด
 * ============================================================ */
import * as THREE from 'three';
import { TILE, COLS, ROWS } from './data.js';

export const FLOOR = -0.42;          // ความสูงพื้นทางเดินที่ลึกลงไป
export const FLY_HEIGHT = 1.25;      // ความสูงของมอนสเตอร์บินได้

export const wx = (x) => x / TILE - COLS / 2;
export const wz = (y) => y / TILE - ROWS / 2;
export const tileX = (c) => c + 0.5 - COLS / 2;
export const tileZ = (r) => r + 0.5 - ROWS / 2;
export const rand = (a, b) => a + Math.random() * (b - a);

const geoCache = new Map();
const matCache = new Map();

export function geo(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}

export function mat(key, make) {
  if (!matCache.has(key)) matCache.set(key, make());
  return matCache.get(key);
}

export function std(hex, opts = {}) {
  const key = `s${typeof hex === 'number' ? hex : String(hex)}${JSON.stringify(opts, (k, v) => (v && v.isTexture ? v.uuid : v))}`;
  return mat(key, () => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.65, metalness: 0.05, ...opts }));
}

// วัสดุเรืองแสง (สว่างเกิน 1 เพื่อให้ bloom จับ)
export function glow(hex, k = 3, opacity = 1) {
  return mat(`g${hex}${k}${opacity}`, () => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k * 0.55) });
    if (opacity < 1) {
      m.transparent = true;
      m.opacity = opacity;
      m.depthWrite = false;
      m.blending = THREE.AdditiveBlending;
    }
    return m;
  });
}

export function mesh(g, m, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1, shadow = true } = {}) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.rotation.set(rx, ry, rz);
  if (typeof s === 'number') o.scale.setScalar(s); else o.scale.set(s[0], s[1], s[2]);
  o.castShadow = shadow;
  o.receiveShadow = shadow;
  return o;
}

export const G = {
  box: () => geo('box1', () => new THREE.BoxGeometry(1, 1, 1)),
  sph: () => geo('sph', () => new THREE.SphereGeometry(1, 20, 14)),
  sphLo: () => geo('sphLo', () => new THREE.SphereGeometry(1, 10, 8)),
  ico: () => geo('ico0', () => new THREE.IcosahedronGeometry(1, 0)),
  ico1: () => geo('ico1', () => new THREE.IcosahedronGeometry(1, 1)),
  octa: () => geo('octa', () => new THREE.OctahedronGeometry(1, 0)),
  dode: () => geo('dode', () => new THREE.DodecahedronGeometry(1, 0)),
  cyl: () => geo('cyl', () => new THREE.CylinderGeometry(1, 1, 1, 12)),
  cyl6: () => geo('cyl6', () => new THREE.CylinderGeometry(1, 1, 1, 6)),
  cone: () => geo('cone', () => new THREE.ConeGeometry(1, 1, 8)),
  cone4: () => geo('cone4', () => new THREE.ConeGeometry(1, 1, 4)),
  torus: () => geo('torus', () => new THREE.TorusGeometry(1, 0.06, 8, 40)),
};
