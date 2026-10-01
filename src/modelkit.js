/* ============================================================
 *  ชุดเครื่องมือปั้นโมเดล procedural
 *  - Rig: โครงกระดูก (bone = Group) ที่รวม mesh ตาม "role" ของวัสดุ
 *    เพื่อลด draw call (1 mesh ต่อ bone ต่อ role)
 *  - G: ฟังก์ชันสร้างเรขาคณิต (ทรงรี, ท่อเรียว, ทรงกลึง, แผ่นปีก ฯลฯ)
 * ============================================================ */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _v = new THREE.Vector3();

/* แปลงตำแหน่ง/หมุน/สเกลของเรขาคณิต (คืนสำเนาใหม่) */
export function xf(g, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1 } = {}) {
  const sc = Array.isArray(s) ? s : [s, s, s];
  _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sc[0], sc[1], sc[2]));
  return g.clone().applyMatrix4(_m);
}

/* ทำให้เรขาคณิตรวมกันได้: non-indexed และมีแค่ position/normal/uv */
function normalize(g) {
  let out = g.index ? g.toNonIndexed() : g;
  for (const name of Object.keys(out.attributes)) {
    if (!['position', 'normal', 'uv'].includes(name)) out.deleteAttribute(name);
  }
  if (!out.attributes.normal) out.computeVertexNormals();
  if (!out.attributes.uv) out.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(out.attributes.position.count * 2), 2));
  return out;
}

export class Rig {
  constructor() {
    this.root = new THREE.Group();
    this.parts = new Map();
    this.bones = {};
  }

  bone(name, parent = this.root, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0 } = {}) {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    g.rotation.set(rx, ry, rz);
    g.userData.rest = { x: rx, y: ry, z: rz };
    parent.add(g);
    this.bones[name] = g;
    return g;
  }

  add(bone, role, ...geos) {
    const key = bone.uuid + '|' + role;
    if (!this.parts.has(key)) this.parts.set(key, { bone, role, geos: [] });
    const p = this.parts.get(key);
    for (const g of geos) p.geos.push(normalize(g));
    return this;
  }

  finalize() {
    for (const { bone, role, geos } of this.parts.values()) {
      const merged = mergeGeometries(geos);
      merged.computeBoundingSphere();
      const m = new THREE.Mesh(merged);
      m.userData.role = role;
      m.castShadow = false;
      m.receiveShadow = false;
      bone.add(m);
      for (const g of geos) g.dispose();
    }
    this.parts.clear();
    return this.root;
  }
}

/* ---------------- เรขาคณิต ---------------- */
export const G = {
  ell(rx, ry, rz, o = {}, seg = 18) {
    return xf(new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7)), { ...o, s: [rx, ry, rz] });
  },
  sphere(r, o = {}, seg = 12) { return xf(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), o); },
  box(w, h, d, o = {}) { return xf(new THREE.BoxGeometry(w, h, d), o); },
  cyl(rt, rb, h, o = {}, seg = 10) { return xf(new THREE.CylinderGeometry(rt, rb, h, seg), o); },
  cone(r, h, o = {}, seg = 8) { return xf(new THREE.ConeGeometry(r, h, seg), o); },
  octa(r, o = {}) { return xf(new THREE.OctahedronGeometry(r, 0), o); },
  ico(r, o = {}, d = 0) { return xf(new THREE.IcosahedronGeometry(r, d), o); },
  torus(r, t, o = {}, arc = Math.PI * 2) { return xf(new THREE.TorusGeometry(r, t, 6, 20, arc), o); },

  /* ทรงกลึงจากโปรไฟล์ [[รัศมี, ความสูง], ...] */
  lathe(profile, o = {}, seg = 16) {
    return xf(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg), o);
  },

  /* ท่อเรียวตามเส้นโค้ง: radius เป็นตัวเลข, [r0, r1] หรือฟังก์ชัน t→r */
  tube(points, radius, o = {}, ts = 16, rs = 8) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
    const g = new THREE.TubeGeometry(curve, ts, 1, rs, false);
    const rf = typeof radius === 'function' ? radius
      : Array.isArray(radius) ? (t) => radius[0] + (radius[1] - radius[0]) * t
      : () => radius;
    const pos = g.attributes.position;
    for (let i = 0; i <= ts; i++) {
      const c = curve.getPointAt(i / ts);
      const r = Math.max(0.0005, rf(i / ts));
      for (let j = 0; j <= rs; j++) {
        const k = i * (rs + 1) + j;
        _v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
        pos.setXYZ(k, _v.x, _v.y, _v.z);
      }
    }
    g.computeVertexNormals();
    return xf(g, o);
  },

  /* แผ่นแบนจากเส้นขอบ 2 มิติ (x, y) → วางในระนาบ XZ (y→z) */
  sheet(outline, o = {}) {
    const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ShapeGeometry(shape, 4);
    g.rotateX(Math.PI / 2);
    return xf(g, o);
  },

  /* ขนนก (ใบยาวปลายมน) วางตามแกน +Z */
  feather(len, width, o = {}) {
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      pts.push([Math.sin(t * Math.PI) * width * (1 - t * 0.3), t * len]);
    }
    for (let i = 8; i >= 0; i--) {
      const t = i / 8;
      pts.push([-Math.sin(t * Math.PI) * width * 0.6 * (1 - t * 0.3), t * len]);
    }
    return G.sheet(pts, o);
  },
};
