/* ============================================================
 *  Element TD — ตัวเรนเดอร์ 3D (Three.js)
 *  1 หน่วยในโลก 3D = 1 ช่องตาราง, กระดานอยู่บนระนาบ XZ
 *  แกน +X ของโมเดลคือทิศ "ด้านหน้า"
 * ============================================================ */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { TILE, COLS, ROWS, ELEMENTS, ELEMENT_ORDER, MAPS } from './data.js';
import { buildMap, canFuse } from './sim.js';

const wx = (x) => x / TILE - COLS / 2;
const wz = (y) => y / TILE - ROWS / 2;
const rand = (a, b) => a + Math.random() * (b - a);
const TOWER_SCALE = 1.18;
const ENEMY_SCALE = 1.15;

const THEMES = {
  meadow: {
    sky: 0x9fd0ff, fog: 0xb4dcff, grassA: 0x62a84a, grassB: 0x5a9f44, path: 0xd8b57a,
    soil: 0x4a3420, outer: 0x4f8f3a, deco: 'tree', sun: 0xfff1d6, sunI: 1.7, hemiI: 0.75,
  },
  canyon: {
    sky: 0xf4c49a, fog: 0xf0bf94, grassA: 0xbf8a55, grassB: 0xb5814e, path: 0xead6aa,
    soil: 0x5a3520, outer: 0xa66e3e, deco: 'rock', sun: 0xffe2bd, sunI: 1.7, hemiI: 0.7,
  },
  spiral: {
    sky: 0x14122e, fog: 0x1c1a3c, grassA: 0x3b3e6c, grassB: 0x363964, path: 0x8b90c8,
    soil: 0x15142a, outer: 0x25264a, deco: 'crystal', sun: 0xb8b0ff, sunI: 1.1, hemiI: 0.55,
  },
};

/* ---------------- แคชวัสดุ / เรขาคณิต ---------------- */
const geoCache = new Map();
const matCache = new Map();
function geo(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}
function mat(key, make) {
  if (!matCache.has(key)) matCache.set(key, make());
  return matCache.get(key);
}
function std(hex, opts = {}) {
  const key = `s${hex}${JSON.stringify(opts)}`;
  return mat(key, () => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.6, metalness: 0.05, ...opts }));
}
// วัสดุเรืองแสง (สว่างเกิน 1 เพื่อให้ bloom จับ)
function glow(hex, k = 3, opacity = 1) {
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

function mesh(g, m, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1, shadow = true } = {}) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.rotation.set(rx, ry, rz);
  if (typeof s === 'number') o.scale.setScalar(s); else o.scale.set(s[0], s[1], s[2]);
  o.castShadow = shadow;
  o.receiveShadow = shadow;
  return o;
}

/* ---------------- ระบบอนุภาค ---------------- */
class Particles {
  constructor(max) {
    this.max = max;
    this.cursor = 0;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.alpha = new Float32Array(max);
    this.size = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.baseSize = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('pcolor', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    g.setAttribute('psize', new THREE.BufferAttribute(this.size, 1));
    this.geometry = g;
    this.material = new THREE.ShaderMaterial({
      uniforms: { scale: { value: 500 } },
      vertexShader: `
        attribute vec3 pcolor; attribute float alpha; attribute float psize;
        uniform float scale; varying vec3 vColor; varying float vAlpha;
        void main() {
          vColor = pcolor; vAlpha = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = psize * scale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.05, d) * vAlpha;
          gl_FragColor = vec4(vColor * 1.4, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, this.material);
    this.points.frustumCulled = false;
    this.tmp = new THREE.Color();
  }

  emit(x, y, z, vx, vy, vz, color, life, size, grav = -4) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.tmp.set(color);
    this.col[i * 3] = this.tmp.r; this.col[i * 3 + 1] = this.tmp.g; this.col[i * 3 + 2] = this.tmp.b;
    this.life[i] = life; this.maxLife[i] = life;
    this.baseSize[i] = size; this.size[i] = size;
    this.grav[i] = grav;
    this.alpha[i] = 1;
  }

  burst(x, y, z, color, n, spd, size = 0.16, grav = -5) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const up = Math.random();
      const v = rand(spd * 0.3, spd);
      const h = Math.sqrt(1 - up * up);
      this.emit(x, y, z, Math.cos(a) * v * h, up * v + 0.5, Math.sin(a) * v * h, color, rand(0.35, 0.8), size * rand(0.6, 1.3), grav);
    }
  }

  update(dt) {
    const drag = Math.pow(0.2, dt);
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
      this.vel[i * 3 + 1] += this.grav[i] * dt;
      this.vel[i * 3] *= drag; this.vel[i * 3 + 2] *= drag;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] = Math.max(0.02, this.pos[i * 3 + 1] + this.vel[i * 3 + 1] * dt);
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const k = this.life[i] / this.maxLife[i];
      this.alpha[i] = k;
      this.size[i] = this.baseSize[i] * (0.4 + 0.6 * k);
    }
    const a = this.geometry.attributes;
    a.position.needsUpdate = true;
    a.pcolor.needsUpdate = true;
    a.alpha.needsUpdate = true;
    a.psize.needsUpdate = true;
  }
}

/* ---------------- โมเดลป้อมแต่ละธาตุ ---------------- */
// คืนค่า { group, anim(t, dt) }
const TOWER_MODELS = {
  fire(head, anims) {
    head.add(mesh(geo('fireBowl', () => new THREE.CylinderGeometry(0.25, 0.15, 0.2, 12)), std(0x3b3130, { metalness: 0.5, roughness: 0.4 }), { y: 0.1 }));
    head.add(mesh(geo('fireRim', () => new THREE.TorusGeometry(0.25, 0.035, 8, 24)), std(0x9a4b26, { metalness: 0.6, roughness: 0.35 }), { y: 0.2, rx: Math.PI / 2 }));
    const outer = mesh(geo('flameO', () => new THREE.ConeGeometry(0.18, 0.46, 10)), glow(0xff5a1e, 3), { y: 0.42, shadow: false });
    const inner = mesh(geo('flameI', () => new THREE.ConeGeometry(0.1, 0.32, 8)), glow(0xffd04a, 4), { y: 0.37, shadow: false });
    head.add(outer, inner);
    anims.push((t) => {
      const f = 1 + Math.sin(t * 18) * 0.08 + Math.sin(t * 31) * 0.05;
      outer.scale.set(1 / f, f, 1 / f);
      inner.scale.set(1, 1 + Math.sin(t * 25) * 0.12, 1);
      outer.rotation.y = t * 2;
    });
  },
  water(head, anims) {
    head.add(mesh(geo('waterStand', () => new THREE.CylinderGeometry(0.08, 0.13, 0.22, 10)), std(0x5a7fa8, { metalness: 0.5, roughness: 0.3 }), { y: 0.11 }));
    const orb = mesh(geo('sph20', () => new THREE.SphereGeometry(1, 24, 16)),
      std(0x3aa6ff, { emissive: 0x1a6fff, emissiveIntensity: 0.9, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.88 }),
      { y: 0.38, s: 0.19 });
    head.add(orb);
    head.add(mesh(geo('nozzle', () => new THREE.CylinderGeometry(0.045, 0.06, 0.16, 8)), std(0x5a7fa8, { metalness: 0.5 }), { x: 0.22, y: 0.38, rz: -Math.PI / 2 }));
    const ring = mesh(geo('ring27', () => new THREE.TorusGeometry(0.28, 0.022, 8, 40)), glow(0x8fd8ff, 2.5), { y: 0.38, rx: Math.PI / 2 + 0.35, shadow: false });
    head.add(ring);
    anims.push((t) => {
      ring.rotation.z = t * 2.2;
      orb.position.y = 0.38 + Math.sin(t * 3) * 0.025;
    });
  },
  earth(head, anims) {
    head.add(mesh(geo('earthBody', () => new THREE.BoxGeometry(0.4, 0.28, 0.4)), std(0x8d6a43, { flatShading: true, roughness: 0.9 }), { y: 0.14 }));
    head.add(mesh(geo('earthBarrel', () => new THREE.CylinderGeometry(0.08, 0.11, 0.42, 10)), std(0x4a3a2c, { metalness: 0.3 }), { x: 0.24, y: 0.22, rz: -Math.PI / 2 }));
    const rockG = geo('dode', () => new THREE.DodecahedronGeometry(1, 0));
    const rockM = std(0xa58457, { flatShading: true, roughness: 0.95 });
    head.add(mesh(rockG, rockM, { x: -0.12, y: 0.33, z: 0.12, s: 0.11 }));
    head.add(mesh(rockG, rockM, { x: -0.1, y: 0.32, z: -0.13, s: 0.09, ry: 1 }));
    const core = mesh(geo('box1', () => new THREE.BoxGeometry(1, 1, 1)), glow(0xffa53a, 2.5), { x: 0.02, y: 0.29, s: [0.16, 0.03, 0.16], shadow: false });
    head.add(core);
    anims.push((t) => { core.scale.y = 0.03 + Math.max(0, Math.sin(t * 4)) * 0.02; });
  },
  wind(head, anims) {
    head.add(mesh(geo('windMast', () => new THREE.CylinderGeometry(0.05, 0.08, 0.42, 8)), std(0xd8f3ea, { roughness: 0.4 }), { y: 0.21 }));
    head.add(mesh(geo('sph20', () => new THREE.SphereGeometry(1, 24, 16)), glow(0x5fffc0, 2.5), { x: 0.07, y: 0.43, s: 0.07, shadow: false }));
    const rotor = new THREE.Group();
    rotor.position.set(0.1, 0.43, 0);
    const bladeG = geo('blade', () => new THREE.BoxGeometry(0.025, 0.34, 0.1));
    const bladeM = std(0x9ff0d2, { roughness: 0.35 });
    for (let i = 0; i < 3; i++) {
      const arm = new THREE.Group();
      arm.rotation.x = (i / 3) * Math.PI * 2;
      arm.add(mesh(bladeG, bladeM, { y: 0.17, ry: 0.3 }));
      rotor.add(arm);
    }
    head.add(rotor);
    const swirl = new THREE.Group();
    const swirlG = geo('swirl', () => new THREE.TorusGeometry(0.24, 0.012, 6, 32, Math.PI * 1.3));
    swirl.add(mesh(swirlG, glow(0x7affd0, 2.5), { y: 0.08, rx: Math.PI / 2, shadow: false }));
    swirl.add(mesh(swirlG, glow(0x7affd0, 2.5), { y: 0.2, rx: Math.PI / 2, rz: 2, s: 0.8, shadow: false }));
    head.add(swirl);
    anims.push((t, dt, boost) => {
      rotor.rotation.x += dt * (8 + boost * 20);
      swirl.rotation.y = -t * 3;
    });
  },
  light(head, anims) {
    head.add(mesh(geo('obelisk', () => new THREE.CylinderGeometry(0.035, 0.13, 0.55, 4)), std(0xf3efe2, { roughness: 0.3 }), { y: 0.27, ry: Math.PI / 4 }));
    head.add(mesh(geo('band', () => new THREE.CylinderGeometry(0.115, 0.125, 0.04, 4)), std(0xd4a840, { metalness: 0.8, roughness: 0.25 }), { y: 0.1, ry: Math.PI / 4 }));
    const tip = mesh(geo('octa', () => new THREE.OctahedronGeometry(1, 0)), glow(0xffe35a, 4), { y: 0.68, s: 0.1, shadow: false });
    const halo = mesh(geo('halo', () => new THREE.TorusGeometry(0.17, 0.012, 6, 32)), glow(0xfff2a0, 3), { y: 0.68, rx: Math.PI / 2, shadow: false });
    head.add(tip, halo);
    anims.push((t) => {
      tip.rotation.y = t * 2;
      tip.position.y = 0.68 + Math.sin(t * 2.5) * 0.04;
      halo.position.y = tip.position.y;
      halo.scale.setScalar(1 + Math.sin(t * 4) * 0.1);
    });
  },
  dark(head, anims) {
    head.add(mesh(geo('darkStand', () => new THREE.CylinderGeometry(0.13, 0.06, 0.18, 6)), std(0x2b2140, { metalness: 0.4, roughness: 0.4 }), { y: 0.09 }));
    const orb = mesh(geo('sph20', () => new THREE.SphereGeometry(1, 24, 16)),
      std(0x150a26, { emissive: 0x8a3dff, emissiveIntensity: 1.6, roughness: 0.2 }), { y: 0.4, s: 0.15 });
    const r1 = mesh(geo('ring25', () => new THREE.TorusGeometry(0.26, 0.016, 6, 40)), glow(0xb070ff, 2.5), { y: 0.4, shadow: false });
    const r2 = mesh(geo('ring25', () => new THREE.TorusGeometry(0.26, 0.016, 6, 40)), glow(0x7a3dff, 2.5), { y: 0.4, s: 0.82, shadow: false });
    head.add(orb, r1, r2);
    anims.push((t) => {
      const y = 0.4 + Math.sin(t * 2) * 0.04;
      orb.position.y = y; r1.position.y = y; r2.position.y = y;
      r1.rotation.set(t * 1.3, t * 0.7, 0);
      r2.rotation.set(-t * 0.9, 0, t * 1.6);
    });
  },
};

function buildTowerModel(t) {
  const group = new THREE.Group();
  const anims = [];
  const fused = t.elements.length > 1;
  const level = fused ? 3 : t.level;
  const stone = std(fused ? 0x6e6290 : 0x8e93a3, { roughness: 0.85, flatShading: true });
  const gold = std(0xe2b84a, { metalness: 0.85, roughness: 0.25 });
  const ped = geo('ped', () => new THREE.CylinderGeometry(0.36, 0.43, 0.22, 8));
  group.add(mesh(ped, stone, { y: 0.11 }));
  let top = 0.22;
  if (level >= 2) {
    group.add(mesh(geo('ped2', () => new THREE.CylinderGeometry(0.3, 0.34, 0.12, 8)), stone, { y: top + 0.06 }));
    group.add(mesh(geo('band2', () => new THREE.TorusGeometry(0.345, 0.025, 6, 24)), gold, { y: 0.21, rx: Math.PI / 2 }));
    top += 0.12;
  }
  if (level >= 3) {
    const spikeG = geo('spike', () => new THREE.ConeGeometry(0.05, 0.18, 5));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      group.add(mesh(spikeG, gold, { x: Math.cos(a) * 0.33, y: 0.3, z: Math.sin(a) * 0.33 }));
    }
  }
  const head = new THREE.Group();
  head.position.y = top;
  group.add(head);
  const el = t.elements[0];
  TOWER_MODELS[el](head, anims);
  if (fused) {
    const c2 = ELEMENTS[t.elements[1]].color;
    head.scale.setScalar(1.1);
    group.add(mesh(geo('fuseRing', () => new THREE.TorusGeometry(0.42, 0.03, 6, 40)), glow(c2, 2.5), { y: 0.05, rx: Math.PI / 2, shadow: false }));
    const orbit = new THREE.Group();
    orbit.position.y = top + 0.4;
    const sph = geo('sph20', () => new THREE.SphereGeometry(1, 24, 16));
    for (let i = 0; i < 2; i++) {
      const o = mesh(sph, glow(c2, 3.5), { x: Math.cos(i * Math.PI) * 0.36, z: Math.sin(i * Math.PI) * 0.36, s: 0.065, shadow: false });
      orbit.add(o);
    }
    group.add(orbit);
    const starG = geo('octa', () => new THREE.OctahedronGeometry(1, 0));
    const stars = [];
    for (let i = 0; i <= t.star; i++) {
      const s = mesh(starG, glow(0xffe680, 3), { s: 0.045, shadow: false });
      group.add(s);
      stars.push(s);
    }
    anims.push((tt) => {
      orbit.rotation.y = tt * 2.5;
      orbit.position.y = top + 0.4 + Math.sin(tt * 3) * 0.05;
      stars.forEach((s, i) => {
        const a = tt * 1.2 + (i / stars.length) * Math.PI * 2;
        s.position.set(Math.cos(a) * 0.48, 0.12, Math.sin(a) * 0.48);
        s.rotation.y = tt * 3;
      });
    });
  } else {
    const pipG = geo('pip', () => new THREE.SphereGeometry(0.035, 8, 6));
    for (let i = 0; i < t.level; i++) {
      const a = Math.PI / 2 + (i - (t.level - 1) / 2) * 0.45;
      group.add(mesh(pipG, glow(0xffe680, 2.5), { x: Math.cos(a) * 0.42, y: 0.16, z: Math.sin(a) * 0.42, shadow: false }));
    }
  }
  return { group, head, anims };
}

/* ---------------- โมเดลศัตรู ---------------- */
function buildEnemyModel(e) {
  const color = ELEMENTS[e.element].color;
  const r = e.size / TILE;
  const flat = e.type !== 'grunt' && e.type !== 'runner';
  const material = new THREE.MeshStandardMaterial({
    color, emissive: new THREE.Color(color), emissiveIntensity: 0.18, roughness: 0.45, metalness: 0.1, flatShading: flat,
  });
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  let main;
  switch (e.type) {
    case 'runner':
      main = mesh(geo('runnerG', () => new THREE.ConeGeometry(0.7, 1.9, 8)), material, { rz: -Math.PI / 2, s: r });
      break;
    case 'tank': {
      main = mesh(geo('icoTank', () => new THREE.IcosahedronGeometry(1, 0)), material, { s: r });
      const hornM = std(0xeeeadd, { roughness: 0.4 });
      const hornG = geo('horn', () => new THREE.ConeGeometry(0.25, 0.8, 6));
      body.add(mesh(hornG, hornM, { x: r * 0.3, y: r * 0.7, z: r * 0.45, rx: 0.5, s: r }));
      body.add(mesh(hornG, hornM, { x: r * 0.3, y: r * 0.7, z: -r * 0.45, rx: -0.5, s: r }));
      break;
    }
    case 'swarm':
      main = mesh(geo('octa', () => new THREE.OctahedronGeometry(1, 0)), material, { s: r });
      break;
    case 'boss': {
      main = mesh(geo('icoBoss', () => new THREE.IcosahedronGeometry(1, 1)), material, { s: r });
      const spikeG = geo('bossSpike', () => new THREE.ConeGeometry(0.18, 0.7, 6));
      const ico = new THREE.IcosahedronGeometry(1, 0);
      const p = ico.attributes.position;
      const seen = new Set();
      const up = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < p.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(p, i).normalize();
        const key = v.toArray().map((n) => n.toFixed(2)).join();
        if (seen.has(key)) continue;
        seen.add(key);
        const s = mesh(spikeG, std(0x241c2e, { roughness: 0.5, metalness: 0.4 }), { s: r });
        s.position.copy(v).multiplyScalar(r * 0.95);
        s.quaternion.setFromUnitVectors(up, v);
        main.add(s);
        s.position.divideScalar(r);
        s.scale.setScalar(1);
      }
      ico.dispose();
      const aura = mesh(geo('auraRing', () => new THREE.TorusGeometry(1, 0.04, 6, 48)), glow(color, 3), { rx: Math.PI / 2, s: r * 1.5, shadow: false });
      group.add(aura);
      group.userData.aura = aura;
      break;
    }
    default:
      main = mesh(geo('sph20', () => new THREE.SphereGeometry(1, 24, 16)), material, { s: [r, r * 0.9, r] });
  }
  body.add(main);
  // ดวงตา
  if (e.type !== 'swarm') {
    const eyeW = std(0xffffff, { roughness: 0.3 });
    const eyeB = std(0x111111, { roughness: 0.3 });
    const eg = geo('eye', () => new THREE.SphereGeometry(1, 10, 8));
    const ex = e.type === 'runner' ? r * 0.35 : r * 0.78;
    const ey = e.type === 'runner' ? r * 0.3 : r * 0.25;
    const er = Math.max(0.035, r * 0.2);
    for (const sz of [-1, 1]) {
      body.add(mesh(eg, eyeW, { x: ex, y: ey, z: sz * r * 0.35, s: er, shadow: false }));
      body.add(mesh(eg, eyeB, { x: ex + er * 0.6, y: ey, z: sz * r * 0.35, s: er * 0.55, shadow: false }));
    }
  }
  return { group, body, main, material, r };
}

/* ============================================================ */
export class Renderer3D {
  constructor(container, floaterLayer) {
    this.container = container;
    this.floaterLayer = floaterLayer;
    this.quality = 'high';
    try { this.quality = localStorage.getItem('etd_quality') || (matchMedia('(pointer: coarse)').matches ? 'low' : 'high'); } catch (e) { /* ignore */ }

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);
    this.renderer = renderer;
    this.canvas = renderer.domElement;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.world = new THREE.Group();
    this.dynamic = new THREE.Group();
    this.root.add(this.world, this.dynamic);

    // แสง
    this.hemi = new THREE.HemisphereLight(0xdfefff, 0x3a2a1a, 1);
    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.position.set(7, 15, 8);
    this.sun.castShadow = true;
    const sc = this.sun.shadow.camera;
    sc.left = -14; sc.right = 14; sc.top = 10; sc.bottom = -10; sc.near = 1; sc.far = 40;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.hemi, this.sun, this.sun.target);

    // กล้อง
    const controls = new OrbitControls(this.camera, this.canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 7;
    controls.maxDistance = 40;
    controls.minPolarAngle = 0.15;
    controls.maxPolarAngle = 1.2;
    controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    controls.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE };
    controls.autoRotateSpeed = 0.6;
    this.controls = controls;

    // โพสต์โพรเซส
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.45, 0.4, 0.95);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.particles = new Particles(3000);
    this.root.add(this.particles.points);

    this.towerViews = new Map();
    this.enemyViews = new Map();
    this.projViews = new Map();
    this.effects = [];
    this.floaters = [];
    this.time = 0;
    this.shake = 0;
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.tmpV = new THREE.Vector3();

    this.buildHelpers();
    this.applyQuality();
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
  }

  /* ---------- ตัวช่วยแสดงผล: ระยะยิง, ช่องที่ชี้, ป้อมตัวอย่าง ---------- */
  buildHelpers() {
    const h = new THREE.Group();
    this.dynamic.add(h);
    this.range = new THREE.Group();
    this.rangeFill = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.09, depthWrite: false }));
    this.rangeEdge = new THREE.Mesh(new THREE.RingGeometry(0.975, 1, 96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false }));
    this.range.add(this.rangeFill, this.rangeEdge);
    this.range.rotation.x = -Math.PI / 2;
    this.range.position.y = 0.03;
    this.range.visible = false;
    h.add(this.range);

    this.hoverTile = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false }));
    this.hoverTile.rotation.x = -Math.PI / 2;
    this.hoverTile.position.y = 0.02;
    this.hoverTile.visible = false;
    h.add(this.hoverTile);

    this.selRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.58, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe680).multiplyScalar(2), transparent: true, opacity: 0.9, depthWrite: false }));
    this.selRing.rotation.x = -Math.PI / 2;
    this.selRing.position.y = 0.03;
    this.selRing.visible = false;
    h.add(this.selRing);

    this.fuseMarks = [];
    this.fuseMarkGeo = new THREE.RingGeometry(0.58, 0.68, 4, 1, Math.PI / 4);
    this.fuseMarkMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd84a).multiplyScalar(2.5), transparent: true, opacity: 0.9, depthWrite: false });
    this.helpers = h;

    this.ghosts = {};
    this.ghost = null;
  }

  getGhost(el) {
    if (!this.ghosts[el]) {
      const { group } = buildTowerModel({ elements: [el], level: 1, star: 0 });
      const ghostMats = new Map();
      group.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = false;
        if (!ghostMats.has(o.material)) {
          const m = o.material.clone();
          m.transparent = true;
          m.opacity = 0.55;
          m.depthWrite = false;
          ghostMats.set(o.material, m);
        }
        o.material = ghostMats.get(o.material);
      });
      group.visible = false;
      group.scale.setScalar(TOWER_SCALE);
      this.helpers.add(group);
      this.ghosts[el] = group;
    }
    return this.ghosts[el];
  }

  /* ---------- คุณภาพกราฟิก ---------- */
  setQuality(q) {
    this.quality = q;
    try { localStorage.setItem('etd_quality', q); } catch (e) { /* ignore */ }
    this.applyQuality();
  }

  applyQuality() {
    const high = this.quality === 'high';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, high ? 2 : 1.25));
    this.renderer.shadowMap.enabled = high;
    this.sun.shadow.mapSize.set(high ? 2048 : 512, high ? 2048 : 512);
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    this.resize();
  }

  resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const ph = h * this.renderer.getPixelRatio();
    this.particles.material.uniforms.scale.value = ph / (2 * Math.tan((this.camera.fov * Math.PI) / 360));
    this.width = w;
    this.height = h;
    if (!this.userMovedCamera) this.resetCamera();
  }

  resetCamera() {
    // หาระยะกล้องที่ทำให้มุมทั้งสี่ของกระดานอยู่ในจอพอดี
    const polar = 0.72;
    const target = new THREE.Vector3(0, 0, 0.35);
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => new THREE.Vector3(sx * (COLS / 2 + 0.3), 0, sz * (ROWS / 2 + 0.3)));
    const dir = new THREE.Vector3(0, Math.cos(polar), Math.sin(polar));
    let lo = 5, hi = 60;
    for (let i = 0; i < 24; i++) {
      const d = (lo + hi) / 2;
      this.camera.position.copy(target).addScaledVector(dir, d);
      this.camera.lookAt(target);
      this.camera.updateMatrixWorld();
      const fits = corners.every((c) => {
        const p = c.clone().project(this.camera);
        return Math.abs(p.x) <= 0.97 && Math.abs(p.y) <= 0.95;
      });
      if (fits) hi = d; else lo = d;
    }
    this.camera.position.copy(target).addScaledVector(dir, hi);
    this.controls.target.copy(target);
    this.controls.maxDistance = Math.max(40, hi * 1.4);
    this.controls.update();
    this.userMovedCamera = false;
  }

  /* ---------- สร้างฉากของแผนที่ ---------- */
  loadMap(mapIndex) {
    if (this.loadedMap === mapIndex) return;
    this.loadedMap = mapIndex;
    for (const child of [...this.world.children]) {
      this.world.remove(child);
      if (child.isInstancedMesh) child.dispose();
    }
    const def = MAPS[mapIndex];
    const theme = THEMES[def.id] || THEMES.meadow;
    this.theme = theme;
    const m = buildMap(def);
    this.map = m;

    this.scene.background = new THREE.Color(theme.sky);
    this.scene.fog = new THREE.Fog(theme.fog, 28, 70);
    this.hemi.color.set(theme.sky).lerp(new THREE.Color(0xffffff), 0.5);
    this.hemi.groundColor.set(theme.soil);
    this.hemi.intensity = theme.hemiI;
    this.sun.color.set(theme.sun);
    this.sun.intensity = theme.sunI;

    // พื้นรอบนอก
    const outer = mesh(new THREE.PlaneGeometry(140, 140), std(theme.outer, { roughness: 1 }), { rx: -Math.PI / 2, y: -0.16 });
    outer.castShadow = false;
    this.world.add(outer);
    const under = mesh(new THREE.PlaneGeometry(COLS + 0.1, ROWS + 0.1), std(theme.soil, { roughness: 1 }), { rx: -Math.PI / 2, y: -0.155 });
    under.castShadow = false;
    this.world.add(under);
    // ขอบกระดาน
    const borderM = std(0x6f6a62, { roughness: 0.9, flatShading: true });
    const bw = 0.25;
    for (const [x, z, sx, sz] of [
      [0, -ROWS / 2 - bw / 2, COLS + bw * 2, bw], [0, ROWS / 2 + bw / 2, COLS + bw * 2, bw],
      [-COLS / 2 - bw / 2, 0, bw, ROWS], [COLS / 2 + bw / 2, 0, bw, ROWS],
    ]) {
      this.world.add(mesh(geo('box1', () => new THREE.BoxGeometry(1, 1, 1)), borderM, { x, y: -0.05, z, s: [sx, 0.22, sz] }));
    }

    // ช่องหญ้าที่วางป้อมได้ และทางเดิน
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    const free = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (m.grid[r][c] === 0) free.push([c, r]);
    const grass = new THREE.InstancedMesh(geo('tileG', () => new THREE.BoxGeometry(0.94, 0.3, 0.94)), std(0xffffff, { roughness: 0.95 }), free.length);
    free.forEach(([c, r], i) => {
      dummy.position.set(c + 0.5 - COLS / 2, -0.15 + Math.random() * 0.02, r + 0.5 - ROWS / 2);
      dummy.updateMatrix();
      grass.setMatrixAt(i, dummy.matrix);
      col.set((c + r) % 2 ? theme.grassA : theme.grassB).offsetHSL(rand(-0.01, 0.01), rand(-0.03, 0.03), rand(-0.025, 0.025));
      grass.setColorAt(i, col);
    });
    grass.receiveShadow = true;
    this.world.add(grass);

    const pathTiles = m.pathTiles.slice();
    // ต่อทางออกนอกกระดานให้ยาวขึ้นเล็กน้อย
    const extend = (p0, p1) => {
      const dc = Math.sign(p0[0] - p1[0]), dr = Math.sign(p0[1] - p1[1]);
      for (let k = 1; k <= 3; k++) pathTiles.push([p0[0] + dc * k, p0[1] + dr * k]);
    };
    extend(def.points[0], def.points[1]);
    const n = def.points.length;
    const lastP = def.points[n - 1];
    if (lastP[0] < 0 || lastP[0] >= COLS || lastP[1] < 0 || lastP[1] >= ROWS) extend(lastP, def.points[n - 2]);
    const path = new THREE.InstancedMesh(geo('tileP', () => new THREE.BoxGeometry(1, 0.3, 1)), std(0xffffff, { roughness: 1 }), pathTiles.length);
    pathTiles.forEach(([c, r], i) => {
      dummy.position.set(c + 0.5 - COLS / 2, -0.21, r + 0.5 - ROWS / 2);
      dummy.updateMatrix();
      path.setMatrixAt(i, dummy.matrix);
      col.set(theme.path).offsetHSL(0, rand(-0.03, 0.03), rand(-0.03, 0.03));
      path.setColorAt(i, col);
    });
    path.receiveShadow = true;
    this.world.add(path);
    // ก้อนกรวดบนทาง
    const pebbles = new THREE.InstancedMesh(geo('dode', () => new THREE.DodecahedronGeometry(1, 0)), std(new THREE.Color(theme.path).multiplyScalar(0.75).getHex(), { flatShading: true }), pathTiles.length * 2);
    pathTiles.forEach(([c, r], i) => {
      for (let k = 0; k < 2; k++) {
        dummy.position.set(c + rand(0.1, 0.9) - COLS / 2, -0.06, r + rand(0.1, 0.9) - ROWS / 2);
        dummy.scale.setScalar(rand(0.025, 0.05));
        dummy.rotation.set(rand(0, 3), rand(0, 3), 0);
        dummy.updateMatrix();
        pebbles.setMatrixAt(i * 2 + k, dummy.matrix);
      }
    });
    dummy.scale.setScalar(1);
    dummy.rotation.set(0, 0, 0);
    this.world.add(pebbles);

    this.buildDecorations(theme, pathTiles);
    this.buildPortalAndCore(m);
  }

  buildDecorations(theme, pathTiles) {
    const spots = [];
    const blocked = (x, z) => {
      if (Math.abs(x) < COLS / 2 + 0.8 && Math.abs(z) < ROWS / 2 + 0.8) return true;
      return pathTiles.some(([c, r]) => Math.abs(c + 0.5 - COLS / 2 - x) < 1.4 && Math.abs(r + 0.5 - ROWS / 2 - z) < 1.4);
    };
    let guard = 0;
    while (spots.length < 170 && guard++ < 4000) {
      const x = rand(-COLS / 2 - 14, COLS / 2 + 14);
      const z = rand(-ROWS / 2 - 12, ROWS / 2 + 9);
      if (!blocked(x, z)) spots.push([x, z]);
    }
    const dummy = new THREE.Object3D();
    const add = (g, m, list, fn) => {
      const im = new THREE.InstancedMesh(g, m, list.length);
      list.forEach((p, i) => { fn(dummy, p, i); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
      im.castShadow = true;
      im.receiveShadow = true;
      this.world.add(im);
      return im;
    };
    const rocks = spots.filter((_, i) => i % 3 === 0);
    const main = spots.filter((_, i) => i % 3 !== 0);
    add(geo('dode', () => new THREE.DodecahedronGeometry(1, 0)), std(theme.deco === 'crystal' ? 0x4a4870 : 0x8d8a82, { flatShading: true, roughness: 0.95 }), rocks, (d, [x, z]) => {
      const s = rand(0.15, 0.5);
      d.position.set(x, -0.1 + s * 0.4, z);
      d.scale.set(s, s * rand(0.6, 1), s);
      d.rotation.set(rand(0, 3), rand(0, 3), 0);
    });
    if (theme.deco === 'tree') {
      const sizes = main.map(() => rand(0.7, 1.4));
      add(geo('trunk', () => new THREE.CylinderGeometry(0.07, 0.1, 0.5, 6)), std(0x6b4a2b), main, (d, [x, z]) => {
        d.position.set(x, 0.09, z); d.scale.setScalar(1); d.rotation.set(0, 0, 0);
      });
      const foliage = add(geo('cone', () => new THREE.ConeGeometry(0.42, 1, 7)), std(0xffffff, { flatShading: true, roughness: 0.9 }), main, (d, [x, z], i) => {
        const s = sizes[i];
        d.position.set(x, 0.3 + 0.5 * s, z); d.scale.set(s, s * 1.15, s); d.rotation.set(0, rand(0, 3), 0);
      });
      const c = new THREE.Color();
      main.forEach((_, i) => foliage.setColorAt(i, c.set(0x2f7a3a).offsetHSL(rand(-0.03, 0.04), 0, rand(-0.06, 0.06))));
    } else if (theme.deco === 'rock') {
      const mesa = add(geo('mesa', () => new THREE.CylinderGeometry(0.5, 0.6, 1, 6)), std(0xffffff, { flatShading: true, roughness: 0.95 }), main, (d, [x, z]) => {
        const h = rand(0.4, 2.2), s = rand(0.4, 1.1);
        d.position.set(x, -0.16 + h / 2, z); d.scale.set(s, h, s); d.rotation.set(0, rand(0, 3), 0);
      });
      const c = new THREE.Color();
      main.forEach((_, i) => mesa.setColorAt(i, c.set(0xb06a3a).offsetHSL(rand(-0.02, 0.02), 0, rand(-0.08, 0.06))));
      const cactus = main.filter((_, i) => i % 4 === 0).map(([x, z]) => [x + 0.8, z + 0.5]);
      add(geo('cactus', () => new THREE.CapsuleGeometry(0.08, 0.4, 4, 8)), std(0x4f8a3a), cactus, (d, [x, z]) => {
        d.position.set(x, 0.15, z); d.scale.setScalar(rand(0.8, 1.3)); d.rotation.set(0, 0, 0);
      });
    } else {
      const crystals = add(geo('octa', () => new THREE.OctahedronGeometry(1, 0)), new THREE.MeshBasicMaterial({ color: 0xffffff }), main, (d, [x, z]) => {
        const s = rand(0.15, 0.55);
        d.position.set(x, s * 1.2 - 0.1, z); d.scale.set(s * 0.6, s * 1.8, s * 0.6); d.rotation.set(rand(-0.3, 0.3), rand(0, 3), rand(-0.3, 0.3));
      });
      const c = new THREE.Color();
      const palette = [0x7a4dff, 0x3fa9ff, 0xc04dff, 0x4dffd9];
      main.forEach((_, i) => crystals.setColorAt(i, c.set(palette[i % palette.length]).multiplyScalar(rand(0.5, 1.1))));
      crystals.castShadow = false;
    }
  }

  buildPortalAndCore(m) {
    const p0 = m.pts[0];
    const ang0 = m.segs[0].angle;
    const portal = new THREE.Group();
    portal.position.set(wx(p0.x) - Math.cos(ang0) * 0.4, 0, wz(p0.y) - Math.sin(ang0) * 0.4);
    portal.rotation.y = -ang0 + Math.PI / 2;
    const stoneM = std(0x55505e, { flatShading: true, roughness: 0.9 });
    portal.add(mesh(geo('pillar', () => new THREE.BoxGeometry(0.22, 1.3, 0.22)), stoneM, { x: -0.62, y: 0.5 }));
    portal.add(mesh(geo('pillar', () => new THREE.BoxGeometry(0.22, 1.3, 0.22)), stoneM, { x: 0.62, y: 0.5 }));
    portal.add(mesh(geo('lintel', () => new THREE.BoxGeometry(1.5, 0.22, 0.26)), stoneM, { y: 1.18 }));
    const swirl = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xa040ff).multiplyScalar(1.8), transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    swirl.position.y = 0.55;
    swirl.scale.set(1, 1.15, 1);
    portal.add(swirl);
    const rings = [];
    for (let i = 0; i < 3; i++) {
      const rg = mesh(geo('portalRing', () => new THREE.TorusGeometry(0.5, 0.02, 6, 40, Math.PI * 1.4)), glow([0xff5a36, 0x2f8fff, 0x9b4dff][i], 3), { y: 0.55, s: 0.6 + i * 0.18, shadow: false });
      portal.add(rg);
      rings.push(rg);
    }
    this.world.add(portal);
    this.portal = { group: portal, rings, swirl };

    const pe = m.pts[m.pts.length - 1];
    const core = new THREE.Group();
    const ex = Math.min(COLS / 2 + 0.3, wx(pe.x));
    core.position.set(ex, 0, wz(pe.y));
    core.add(mesh(geo('corePed', () => new THREE.CylinderGeometry(0.55, 0.7, 0.3, 6)), std(0xd8d4ea, { flatShading: true, roughness: 0.4, metalness: 0.2 }), { y: 0.0 }));
    core.add(mesh(geo('corePed2', () => new THREE.CylinderGeometry(0.4, 0.5, 0.2, 6)), std(0xe2b84a, { metalness: 0.8, roughness: 0.25 }), { y: 0.22 }));
    const crystal = mesh(geo('octa', () => new THREE.OctahedronGeometry(1, 0)), glow(0xdff4ff, 1.4), { y: 1.0, s: [0.28, 0.45, 0.28], shadow: false });
    core.add(crystal);
    const gems = new THREE.Group();
    gems.position.y = 1.0;
    ELEMENT_ORDER.forEach((el, i) => {
      const a = (i / 6) * Math.PI * 2;
      gems.add(mesh(geo('octa', () => new THREE.OctahedronGeometry(1, 0)), glow(ELEMENTS[el].color, 3), { x: Math.cos(a) * 0.55, z: Math.sin(a) * 0.55, s: 0.1, shadow: false }));
    });
    core.add(gems);
    const light = new THREE.PointLight(0xffffff, 2, 4, 1.5);
    light.position.y = 1.1;
    core.add(light);
    this.world.add(core);
    this.core = { group: core, crystal, gems, light, hit: 0 };
  }

  /* ---------- แปลงพิกัด ---------- */
  pickTile(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, this.tmpV);
    if (!hit) return null;
    const c = Math.floor(hit.x + COLS / 2);
    const r = Math.floor(hit.z + ROWS / 2);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
    return { c, r };
  }

  /* ---------- เหตุการณ์จากระบบเกม ---------- */
  handleEvent(ev) {
    const P = this.particles;
    switch (ev.type) {
      case 'burst':
        P.burst(wx(ev.x), ev.h ?? 0.3, wz(ev.y), ev.color, ev.n, ev.spd);
        break;
      case 'explosion':
        this.addRing(wx(ev.x), wz(ev.y), ev.r / TILE, ev.color, 0.35);
        P.burst(wx(ev.x), 0.3, wz(ev.y), ev.color, 14, 3, 0.2);
        P.burst(wx(ev.x), 0.3, wz(ev.y), '#ffd27a', 6, 2, 0.14);
        break;
      case 'beam':
        this.addBeam(ev);
        break;
      case 'shot': {
        const v = this.towerViews.get(ev.tower.id);
        if (v) v.recoil = 1;
        break;
      }
      case 'upgrade': {
        this.addRing(wx(ev.tower.x), wz(ev.tower.y), 0.9, '#ffe680', 0.5);
        break;
      }
      case 'fuse': {
        const t = ev.tower;
        const ax = wx(t.x), az = wz(t.y), bx = wx(ev.fromX), bz = wz(ev.fromY);
        for (let i = 0; i < 60; i++) {
          const k = Math.random();
          const c = ELEMENTS[ev.els[i % 2]].color;
          P.emit(bx + (ax - bx) * k, 0.3 + Math.sin(k * Math.PI) * 1.2, bz + (az - bz) * k, rand(-0.4, 0.4), rand(0.5, 2), rand(-0.4, 0.4), c, rand(0.5, 1), 0.2, -1);
        }
        P.burst(ax, 0.6, az, ELEMENTS[ev.els[0]].color, 50, 4, 0.22);
        P.burst(ax, 0.6, az, ELEMENTS[ev.els[1]].color, 50, 4, 0.22);
        this.addRing(ax, az, 1.6, ELEMENTS[ev.els[0]].color, 0.6);
        this.addRing(ax, az, 1.2, ELEMENTS[ev.els[1]].color, 0.5);
        break;
      }
      case 'leak':
        this.shake = 0.35;
        if (this.core) this.core.hit = 1;
        break;
      case 'floater':
        this.addFloater(ev);
        break;
      default:
        break;
    }
  }

  addRing(x, z, r, color, life) {
    const m = new THREE.Mesh(geo('fxRing', () => new THREE.RingGeometry(0.82, 1, 48)),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.4), transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.06, z);
    this.dynamic.add(m);
    this.effects.push({
      obj: m, life, max: life,
      update(k) { m.scale.setScalar(r * (0.25 + 0.75 * (1 - k))); m.material.opacity = k; },
    });
  }

  addBeam(ev) {
    const a = new THREE.Vector3(wx(ev.x1), 0.75, wz(ev.y1));
    const b = new THREE.Vector3(wx(ev.x2), 0.3, wz(ev.y2));
    const dir = b.clone().sub(a);
    const len = dir.length();
    const g = new THREE.Group();
    g.position.copy(a).add(b).multiplyScalar(0.5);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    const cyl = geo('beamCyl', () => new THREE.CylinderGeometry(1, 1, 1, 8, 1, true));
    const parts = ev.colors.map((c, i) => {
      const m = new THREE.Mesh(cyl, new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.scale.set(0.04 * ev.width * (1 - i * 0.3), len, 0.04 * ev.width * (1 - i * 0.3));
      return m;
    });
    const core = new THREE.Mesh(cyl, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    core.scale.set(0.022 * ev.width, len, 0.022 * ev.width);
    parts.push(core);
    g.add(...parts);
    this.dynamic.add(g);
    const base = parts.map((p) => p.scale.x);
    this.effects.push({
      obj: g, life: 0.22, max: 0.22,
      update(k) {
        parts.forEach((p, i) => {
          p.material.opacity = k;
          p.scale.x = p.scale.z = base[i] * (0.4 + 0.6 * k);
        });
      },
    });
    for (let i = 0; i < 6; i++) {
      const k = Math.random();
      this.particles.emit(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, a.z + (b.z - a.z) * k, rand(-0.3, 0.3), rand(0.2, 0.8), rand(-0.3, 0.3), ev.colors[0], 0.4, 0.12, 0);
    }
  }

  addFloater(ev) {
    if (this.floaters.length > 45) {
      const old = this.floaters.shift();
      old.el.remove();
    }
    const el = document.createElement('div');
    el.className = 'floater';
    el.textContent = ev.text;
    el.style.color = ev.color;
    el.style.fontSize = `${ev.size}px`;
    this.floaterLayer.appendChild(el);
    this.floaters.push({ el, x: wx(ev.x), z: wz(ev.y), y: 0.9, life: 0.9, max: 0.9 });
  }

  clearDynamic() {
    for (const v of this.towerViews.values()) this.dynamic.remove(v.group);
    for (const v of this.enemyViews.values()) this.removeEnemyView(v);
    for (const v of this.projViews.values()) this.dynamic.remove(v.mesh);
    for (const fx of this.effects) this.dynamic.remove(fx.obj);
    for (const f of this.floaters) f.el.remove();
    this.towerViews.clear();
    this.enemyViews.clear();
    this.projViews.clear();
    this.effects = [];
    this.floaters = [];
    for (let i = 0; i < this.particles.max; i++) { this.particles.life[i] = 0; this.particles.alpha[i] = 0; }
  }

  removeEnemyView(v) {
    this.dynamic.remove(v.group);
    this.dynamic.remove(v.bar);
    v.material.dispose();
  }

  /* ---------- ซิงก์วัตถุจาก state ---------- */
  syncTowers(game, dt) {
    const seen = new Set();
    for (const t of game.towers) {
      seen.add(t.id);
      let v = this.towerViews.get(t.id);
      if (!v || v.version !== t.version) {
        if (v) this.dynamic.remove(v.group);
        const built = buildTowerModel(t);
        v = { ...built, version: t.version, recoil: 0, spawn: v ? 1 : 0 };
        v.group.position.set(wx(t.x), 0, wz(t.y));
        this.dynamic.add(v.group);
        this.towerViews.set(t.id, v);
      }
      v.spawn = Math.min(1, v.spawn + dt * 4);
      const pop = v.spawn < 1 ? 1 - Math.pow(1 - v.spawn, 3) : 1;
      v.group.scale.setScalar(pop * TOWER_SCALE);
      v.head.rotation.y = -t.angle;
      v.recoil = Math.max(0, v.recoil - dt * 6);
      const hs = (t.elements.length > 1 ? 1.1 : 1) * (1 + v.recoil * 0.1);
      v.head.scale.setScalar(hs);
      for (const a of v.anims) a(this.time, dt, v.recoil);
    }
    for (const [id, v] of this.towerViews) {
      if (!seen.has(id)) { this.dynamic.remove(v.group); this.towerViews.delete(id); }
    }
  }

  syncEnemies(game, dt) {
    const seen = new Set();
    for (const e of game.enemies) {
      if (!e.alive) continue;
      seen.add(e.id);
      let v = this.enemyViews.get(e.id);
      if (!v) {
        v = buildEnemyModel(e);
        v.group.scale.setScalar(ENEMY_SCALE);
        v.group.position.set(wx(e.x), 0, wz(e.y));
        v.bar = this.makeBar(e);
        this.dynamic.add(v.group, v.bar);
        this.enemyViews.set(e.id, v);
      }
      const g = v.group;
      g.position.x = wx(e.x);
      g.position.z = wz(e.y);
      g.rotation.y = -e.angle;
      const stunned = e.stunT > 0;
      const bob = stunned ? 0 : Math.abs(Math.sin(this.time * (e.type === 'runner' ? 16 : 9) + e.id)) * 0.06;
      v.body.position.y = v.r * 0.95 + bob;
      if (e.type === 'swarm') v.main.rotation.y += dt * 6;
      if (e.type === 'boss') {
        v.main.rotation.y += dt * 0.8;
        if (g.userData.aura) {
          g.userData.aura.rotation.z = this.time;
          g.userData.aura.position.y = v.r * 0.4 + Math.sin(this.time * 2) * 0.1;
        }
      }
      // สถานะผิดปกติ
      const mtl = v.material;
      if (e.flash > 0) { mtl.emissive.setRGB(1, 1, 1); mtl.emissiveIntensity = 0.35; }
      else if (e.slowT > 0) { mtl.emissive.setRGB(0.3, 0.7, 1); mtl.emissiveIntensity = 0.45; }
      else { mtl.emissive.set(ELEMENTS[e.element].color); mtl.emissiveIntensity = 0.18; }
      this.statusFx(v, 'slow', e.slowT > 0, () => mesh(geo('slowRing', () => new THREE.TorusGeometry(1, 0.08, 6, 32)), glow(0x9ad8ff, 2.5), { rx: Math.PI / 2, y: 0.05, s: v.r + 0.12, shadow: false }));
      this.statusFx(v, 'curse', e.curseT > 0, () => mesh(geo('sph20', () => new THREE.SphereGeometry(1, 24, 16)), glow(0x9b4dff, 1.6, 0.28), { y: v.r, s: v.r * 1.55, shadow: false }));
      const stun = this.statusFx(v, 'stun', stunned, () => {
        const sg = new THREE.Group();
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2;
          sg.add(mesh(geo('octa', () => new THREE.OctahedronGeometry(1, 0)), glow(0xffe45a, 3), { x: Math.cos(a) * (v.r + 0.08), z: Math.sin(a) * (v.r + 0.08), s: 0.05, shadow: false }));
        }
        sg.position.y = v.r * 2 + 0.12;
        return sg;
      });
      if (stun && stun.visible) stun.rotation.y = this.time * 6;
      if (e.burnT > 0 && Math.random() < dt * 25) {
        this.particles.emit(g.position.x + rand(-0.12, 0.12), v.r * rand(0.6, 1.6), g.position.z + rand(-0.12, 0.12), rand(-0.2, 0.2), rand(0.8, 1.6), rand(-0.2, 0.2), Math.random() < 0.5 ? '#ff7a2a' : '#ffcf4a', 0.45, 0.13, 1);
      }
      // แถบพลังชีวิต
      const showBar = e.hp < e.maxHp || e.type === 'boss';
      v.bar.visible = showBar;
      if (showBar) {
        v.bar.position.set(g.position.x, v.r * 2 * ENEMY_SCALE + (e.type === 'boss' ? 0.55 : 0.28), g.position.z);
        const k = Math.max(0, e.hp / e.maxHp);
        const fg = v.bar.userData.fg;
        fg.scale.x = v.bar.userData.w * k;
        fg.material = k > 0.5 ? this.barMats.good : k > 0.25 ? this.barMats.mid : this.barMats.low;
      }
    }
    for (const [id, v] of this.enemyViews) {
      if (!seen.has(id)) { this.removeEnemyView(v); this.enemyViews.delete(id); }
    }
  }

  statusFx(v, key, on, make) {
    v.fx = v.fx || {};
    if (on && !v.fx[key]) { v.fx[key] = make(); v.group.add(v.fx[key]); }
    if (v.fx[key]) v.fx[key].visible = on;
    return v.fx[key];
  }

  makeBar(e) {
    if (!this.barMats) {
      const sm = (c, o = 1) => new THREE.SpriteMaterial({ color: c, transparent: o < 1, opacity: o, depthTest: false });
      this.barMats = { bg: sm(0x000000, 0.65), good: sm(0x57e08a), mid: sm(0xffcf4a), low: sm(0xff5a6a) };
    }
    const w = e.type === 'boss' ? 1.1 : Math.max(0.45, (e.size / TILE) * 1.9);
    const g = new THREE.Group();
    const bg = new THREE.Sprite(this.barMats.bg);
    bg.center.set(0, 0.5);
    bg.scale.set(w + 0.04, 0.1, 1);
    bg.position.x = -w / 2 - 0.02;
    const fg = new THREE.Sprite(this.barMats.good);
    fg.center.set(0, 0.5);
    fg.scale.set(w, 0.065, 1);
    fg.position.x = -w / 2;
    bg.renderOrder = 10;
    fg.renderOrder = 11;
    g.add(bg, fg);
    g.userData = { fg, w };
    g.visible = false;
    return g;
  }

  syncProjectiles(game, dt) {
    const seen = new Set();
    for (const p of game.projectiles) {
      seen.add(p.id);
      let v = this.projViews.get(p.id);
      if (!v) {
        const el = p.el;
        const color = ELEMENTS[p.elements[p.elements.length - 1]].color;
        let m;
        if (el === 'earth') {
          m = mesh(geo('dode', () => new THREE.DodecahedronGeometry(1, 0)), std(0x8a6a45, { flatShading: true }), { s: 0.12 });
        } else {
          const size = { fire: 0.11, water: 0.09, wind: 0.06, light: 0.07, dark: 0.1 }[el] || 0.08;
          m = mesh(geo('sph8', () => new THREE.SphereGeometry(1, 10, 8)), glow(color, 4), { s: size * (p.elements.length > 1 ? 1.4 : 1), shadow: false });
        }
        v = { mesh: m, color, trailColor: ELEMENTS[p.elements[0]].color, total: Math.hypot(p.tx - p.sx, p.ty - p.sy) || 1 };
        this.dynamic.add(m);
        this.projViews.set(p.id, v);
      }
      const remain = Math.hypot(p.tx - p.x, p.ty - p.y);
      const k = Math.min(1, Math.max(0, 1 - remain / Math.max(v.total, remain)));
      const arc = p.el === 'earth' ? Math.sin(k * Math.PI) * 0.9 : Math.sin(k * Math.PI) * 0.15;
      v.mesh.position.set(wx(p.x), 0.75 + (0.3 - 0.75) * k + arc, wz(p.y));
      if (p.el === 'earth') { v.mesh.rotation.x += dt * 8; v.mesh.rotation.z += dt * 6; }
      if (Math.random() < 0.8) {
        this.particles.emit(v.mesh.position.x, v.mesh.position.y, v.mesh.position.z, 0, 0.1, 0, p.el === 'earth' ? '#8a6a45' : v.trailColor, 0.25, p.el === 'wind' ? 0.08 : 0.13, 0);
      }
    }
    for (const [id, v] of this.projViews) {
      if (!seen.has(id)) { this.dynamic.remove(v.mesh); this.projViews.delete(id); }
    }
  }

  /* ---------- วาดเฟรม ---------- */
  frame(dt, view) {
    this.time += dt;
    const game = view.game;
    this.controls.autoRotate = !!view.menu;
    this.controls.update();

    if (game) {
      this.syncTowers(game, dt);
      this.syncEnemies(game, dt);
      this.syncProjectiles(game, dt);
    }
    this.updateHelpers(view);

    // เอฟเฟกต์ชั่วคราว
    this.effects = this.effects.filter((fx) => {
      fx.life -= dt;
      if (fx.life <= 0) {
        this.dynamic.remove(fx.obj);
        fx.obj.traverse((o) => { if (o.material) o.material.dispose(); });
        return false;
      }
      fx.update(fx.life / fx.max);
      return true;
    });
    this.particles.update(dt);

    // พอร์ทัลและแกนกลาง
    if (this.portal) {
      this.portal.rings.forEach((r, i) => { r.rotation.z = this.time * (1.5 + i * 0.6) * (i % 2 ? -1 : 1); });
      this.portal.swirl.material.opacity = 0.55 + Math.sin(this.time * 3) * 0.2;
      if (Math.random() < dt * 20) {
        const pg = this.portal.group;
        this.particles.emit(pg.position.x + rand(-0.4, 0.4), rand(0.1, 1), pg.position.z + rand(-0.4, 0.4), 0, rand(0.3, 0.8), 0, '#b070ff', 0.8, 0.12, 0);
      }
    }
    if (this.core) {
      const c = this.core;
      c.hit = Math.max(0, c.hit - dt * 2);
      c.crystal.rotation.y = this.time * 0.8;
      c.crystal.position.y = 1.0 + Math.sin(this.time * 2) * 0.08;
      c.gems.rotation.y = -this.time * 1.2;
      c.crystal.material = c.hit > 0 ? glow(0xff3a4a, 3) : glow(0xdff4ff, 1.4);
      c.light.color.setRGB(1, 1 - c.hit * 0.7, 1 - c.hit * 0.7);
    }

    // ตัวเลขลอย
    const w = this.width, h = this.height;
    this.floaters = this.floaters.filter((f) => {
      f.life -= dt;
      if (f.life <= 0) { f.el.remove(); return false; }
      f.y += dt * 0.9;
      this.tmpV.set(f.x, f.y, f.z).project(this.camera);
      f.el.style.transform = `translate(${((this.tmpV.x + 1) / 2) * w}px, ${((1 - this.tmpV.y) / 2) * h}px) translate(-50%, -50%)`;
      f.el.style.opacity = Math.min(1, (f.life / f.max) * 2).toFixed(2);
      return true;
    });

    // สั่นจอ
    this.shake = Math.max(0, this.shake - dt);
    if (this.shake > 0) this.root.position.set(rand(-1, 1) * this.shake * 0.3, 0, rand(-1, 1) * this.shake * 0.3);
    else this.root.position.set(0, 0, 0);

    if (this.quality === 'high') this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }

  updateHelpers(view) {
    const { game, hover, selectedBuild, selectedTower, fuseMode } = view;
    this.range.visible = false;
    this.hoverTile.visible = false;
    this.selRing.visible = false;
    for (const g of Object.values(this.ghosts)) g.visible = false;
    for (const m of this.fuseMarks) m.visible = false;
    if (!game) return;

    if (selectedTower) {
      this.showRange(wx(selectedTower.x), wz(selectedTower.y), selectedTower.stats.range / TILE, true);
      this.selRing.visible = true;
      this.selRing.position.x = wx(selectedTower.x);
      this.selRing.position.z = wz(selectedTower.y);
      this.selRing.scale.setScalar(1 + Math.sin(this.time * 5) * 0.05);
    }
    if (fuseMode && selectedTower) {
      let i = 0;
      for (const t of game.towers) {
        if (!canFuse(selectedTower, t)) continue;
        if (!this.fuseMarks[i]) {
          const m = new THREE.Mesh(this.fuseMarkGeo, this.fuseMarkMat);
          m.rotation.x = -Math.PI / 2;
          m.position.y = 0.04;
          this.helpers.add(m);
          this.fuseMarks.push(m);
        }
        const m = this.fuseMarks[i++];
        m.visible = true;
        m.position.x = wx(t.x);
        m.position.z = wz(t.y);
        m.scale.setScalar(1 + Math.sin(this.time * 8) * 0.08);
      }
    }
    if (hover && selectedBuild && !fuseMode) {
      const el = ELEMENTS[selectedBuild];
      const ok = game.canBuildAt(hover.c, hover.r) && game.gold >= el.cost;
      const x = hover.c + 0.5 - COLS / 2, z = hover.r + 0.5 - ROWS / 2;
      this.hoverTile.visible = true;
      this.hoverTile.position.x = x;
      this.hoverTile.position.z = z;
      this.hoverTile.material.color.set(ok ? 0xffffff : 0xff4040);
      this.showRange(x, z, el.range / TILE, ok);
      if (ok) {
        const gh = this.getGhost(selectedBuild);
        gh.visible = true;
        gh.position.set(x, 0, z);
      }
    } else if (hover && !selectedBuild && game.towerGrid[hover.r] && game.towerGrid[hover.r][hover.c]) {
      this.hoverTile.visible = true;
      this.hoverTile.position.x = hover.c + 0.5 - COLS / 2;
      this.hoverTile.position.z = hover.r + 0.5 - ROWS / 2;
      this.hoverTile.material.color.set(0xffffff);
    }
  }

  showRange(x, z, r, ok) {
    this.range.visible = true;
    this.range.position.x = x;
    this.range.position.z = z;
    this.range.scale.setScalar(r);
    const c = ok ? 0xffffff : 0xff4040;
    this.rangeFill.material.color.set(c);
    this.rangeEdge.material.color.set(c);
  }
}
