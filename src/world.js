/* ============================================================
 *  สร้างฉากของแผนที่: ภูมิประเทศ, ทางเดินหินที่ลึกลงไปพร้อมกำแพงอิฐ,
 *  พอร์ทัล, จุดตรวจ, ต้นไม้ ตะเกียง และของตกแต่งรอบ ๆ
 * ============================================================ */
import { t } from './i18n.js';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COLS, ROWS, ELEMENTS, ELEMENT_ORDER } from './data.js';
import { idx } from './sim.js';
import { FLOOR, tileX, tileZ, rand, std, glow, mesh, G, geo } from './gfx.js';
import { grassTexture, cobbleTexture, brickTexture, glowTexture } from './textures.js';

export const THEMES = {
  meadow: {
    sky: [0x5aa8ff, 0xdcefff], fog: 0xcde6ff, grass: 'meadow', stone: 'stone', deco: 'forest', water: true,
    sun: 0xfff0d2, sunI: 2.1, hemiSky: 0xcfe8ff, hemiGround: 0x4f5f2a, hemiI: 0.85, lantern: 0.6,
  },
  ruins: {
    sky: [0x4f9ef5, 0xe2f2ff], fog: 0xd2e8ff, grass: 'ruins', stone: 'stone', deco: 'ruins', water: true,
    sun: 0xfff2d8, sunI: 2.15, hemiSky: 0xd4ecff, hemiGround: 0x4a5a28, hemiI: 0.85, lantern: 0.6,
  },
  desert: {
    sky: [0x5aa6f0, 0xfff1d2], fog: 0xf5e2b6, grass: 'desert', stone: 'sandstone', deco: 'desert', water: true,
    sun: 0xfff0c8, sunI: 2.35, hemiSky: 0xfff2d8, hemiGround: 0x8a6a3a, hemiI: 0.9, lantern: 0.5,
  },
  volcano: {
    sky: [0x2a0a06, 0xff7a3a], fog: 0x4a2018, grass: 'volcano', stone: 'basalt', deco: 'volcano', water: false, hazard: 'lava',
    sun: 0xffc090, sunI: 2.0, hemiSky: 0xffa070, hemiGround: 0x3a1a10, hemiI: 0.9, lantern: 1.0,
  },
  river: {
    sky: [0x3f9cff, 0xd8f0ff], fog: 0xcfe8ff, grass: 'river', stone: 'mossy', deco: 'river', water: false, floor: 'water',
    sun: 0xfff2d8, sunI: 2.1, hemiSky: 0xcfe8ff, hemiGround: 0x3f5a2a, hemiI: 0.9, lantern: 0.6,
  },
  sky: {
    sky: [0x2a78f0, 0x7ab8ff], fog: 0xbcd8ff, grass: 'sky', stone: 'cloud', deco: 'sky', water: false, hazard: 'void',
    sun: 0xfff6e8, sunI: 1.55, hemiSky: 0xdceaff, hemiGround: 0x6a84b8, hemiI: 0.75, lantern: 0.5,
  },
  cave: {
    sky: [0x060504, 0x1c1610], fog: 0x0e0b08, grass: 'cave', stone: 'cave', deco: 'cave', water: false, pointLights: true,
    sun: 0xd8b898, sunI: 1.25, hemiSky: 0xb0a090, hemiGround: 0x2a2018, hemiI: 0.85, lantern: 1.9,
  },
  canyon: {
    sky: [0xe9874a, 0xffe3b8], fog: 0xf2c79a, grass: 'canyon', stone: 'sand', deco: 'canyon', water: false,
    sun: 0xffd6a0, sunI: 2.2, hemiSky: 0xffe0c0, hemiGround: 0x6a4a2a, hemiI: 0.8, lantern: 0.5,
  },
  night: {
    sky: [0x07081c, 0x2b2d63], fog: 0x1d1f45, grass: 'night', stone: 'night', deco: 'night', water: true,
    sun: 0x9fb0ff, sunI: 0.95, hemiSky: 0x5a6aaa, hemiGround: 0x101425, hemiI: 0.55, lantern: 1.6,
  },
};

/* ---------- ตัวช่วยสร้างเรขาคณิตแบบรวม ---------- */
class QuadBuilder {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.ind = []; }
  push(verts, n, uvs) {
    const base = this.pos.length / 3;
    for (let k = 0; k < 4; k++) {
      this.pos.push(...verts[k]);
      this.nor.push(...n);
      this.uv.push(...uvs[k]);
    }
    this.ind.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  // พื้นแนวนอนหันขึ้น
  flat(x0, z0, x1, z1, y, s) {
    this.push(
      [[x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0]],
      [0, 1, 0],
      [[x0 * s, -z0 * s], [x0 * s, -z1 * s], [x1 * s, -z1 * s], [x1 * s, -z0 * s]],
    );
  }
  // ผนังแนวตั้ง จาก (ax,az) ถึง (bx,bz) หันไปทาง normal n
  wall(ax, az, bx, bz, y0, y1, n, s) {
    const ex = bx - ax, ez = bz - az;
    // ตรวจทิศการหมุนให้ด้านหน้าหันตาม normal
    if (-ez * n[0] + ex * n[2] < 0) { [ax, bx] = [bx, ax]; [az, bz] = [bz, az]; }
    const u0 = (ax + az) * s, u1 = (bx + bz) * s;
    this.push(
      [[ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az]],
      n,
      [[u0, y0 * s], [u1, y0 * s], [u1, y1 * s], [u0, y1 * s]],
    );
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.ind);
    return g;
  }
}

function instanced(g, m, items, place, { shadow = true, colors = null } = {}) {
  const im = new THREE.InstancedMesh(g, m, Math.max(1, items.length));
  im.count = items.length;
  const d = new THREE.Object3D();
  const c = new THREE.Color();
  items.forEach((it, i) => {
    d.position.set(0, 0, 0); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1);
    place(d, it, i);
    d.updateMatrix();
    im.setMatrixAt(i, d.matrix);
    if (colors) im.setColorAt(i, c.set(colors(it, i)));
  });
  im.castShadow = shadow;
  im.receiveShadow = true;
  return im;
}

/* ---------- เรขาคณิตของต้นไม้/หญ้า (สร้างครั้งเดียว) ---------- */
function foliageGeometry() {
  return geo('foliage', () => {
    const parts = [
      [0, 0, 0, 0.55], [0.32, 0.12, 0.1, 0.4], [-0.28, 0.08, -0.14, 0.42], [0.05, 0.42, 0, 0.4], [-0.08, 0.1, 0.32, 0.36],
    ].map(([x, y, z, s]) => {
      const g = new THREE.IcosahedronGeometry(s, 1);
      g.translate(x, y, z);
      return g;
    });
    return mergeGeometries(parts);
  });
}

function pineGeometry() {
  return geo('pine', () => mergeGeometries([
    new THREE.ConeGeometry(0.5, 0.75, 7).translate(0, 0.55, 0),
    new THREE.ConeGeometry(0.4, 0.65, 7).translate(0, 0.9, 0),
    new THREE.ConeGeometry(0.27, 0.55, 7).translate(0, 1.22, 0),
  ]));
}

function tuftGeometry() {
  return geo('tuft', () => {
    const blades = [];
    for (let k = 0; k < 5; k++) {
      const g = new THREE.BufferGeometry();
      const h = 0.12 + Math.random() * 0.1, w = 0.025;
      g.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, 0, w, 0, 0, 0, h, 0], 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute([0.35, 0.55, 0.2, 0.35, 0.55, 0.2, 1, 1, 0.75], 3));
      g.computeVertexNormals();
      g.rotateZ((Math.random() - 0.5) * 0.6);
      g.rotateY((k / 5) * Math.PI + Math.random() * 0.4);
      g.translate((Math.random() - 0.5) * 0.08, 0, (Math.random() - 0.5) * 0.08);
      blades.push(g);
    }
    return mergeGeometries(blades);
  });
}

/* ---------- พอร์ทัล ---------- */
function swirlMaterial(color) {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, color: { value: new THREE.Color(color) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform float time; uniform vec3 color; varying vec2 vUv;
      void main(){
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float a = atan(p.y, p.x);
        float s = sin(a * 3.0 + r * 14.0 - time * 5.0) * 0.5 + 0.5;
        float s2 = sin(a * 5.0 - r * 9.0 + time * 3.0) * 0.5 + 0.5;
        float core = smoothstep(0.55, 0.0, r);
        vec3 c = color * (0.6 + s * 0.9 + s2 * 0.4) + vec3(1.0) * core * 0.9;
        float alpha = smoothstep(1.0, 0.85, r);
        gl_FragColor = vec4(c * 1.15, alpha);
      }`,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

function makePortal(color, stoneTint) {
  const g = new THREE.Group();
  const stone = std(0x8a8478, { roughness: 0.9, flatShading: true, map: brickTexture(stoneTint) });
  g.add(mesh(G.box(), stone, { y: 0.06, s: [1.5, 0.12, 0.55] }));
  g.add(mesh(G.box(), stone, { x: -0.62, y: 0.25, s: [0.3, 0.3, 0.45] }));
  g.add(mesh(G.box(), stone, { x: 0.62, y: 0.25, s: [0.3, 0.3, 0.45] }));
  const ring = mesh(geo('portalRing', () => new THREE.TorusGeometry(0.55, 0.13, 6, 16)), std(0x7d776c, { roughness: 0.85, flatShading: true }), { y: 0.82 });
  g.add(ring);
  for (let k = 0; k < 5; k++) {
    const a = Math.PI / 2 + ((k - 2) / 2) * 1.2;
    g.add(mesh(G.box(), glow(color, 3), { x: Math.cos(a) * 0.55, y: 0.82 + Math.sin(a) * 0.55, z: 0.1, s: 0.07, rz: a, shadow: false }));
  }
  const sw = swirlMaterial(color);
  const disc = new THREE.Mesh(geo('portalDisc', () => new THREE.CircleGeometry(0.48, 48)), sw);
  disc.position.y = 0.82;
  g.add(disc);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(color).multiplyScalar(0.8), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.y = 0.82;
  halo.scale.setScalar(1.6);
  g.add(halo);
  const light = new THREE.PointLight(color, 2.5, 4, 1.6);
  light.position.set(0, 0.9, 0.4);
  g.add(light);
  return { group: g, swirl: sw, light, halo };
}

/* ============================================================ */
export function buildWorld(map, themeKey) {
  const theme = THEMES[themeKey] || THEMES.meadow;
  const group = new THREE.Group();
  const anim = [];
  const walk = (c, r) => c >= 0 && c < COLS && r >= 0 && r < ROWS && map.walk[idx(c, r)];

  const grassMat = std(0xffffff, { map: grassTexture(theme.grass), roughness: 0.95 });
  const cobbleTex = cobbleTexture(theme.stone);
  const cobbleMat = std(0xffffff, { map: cobbleTex, bumpMap: cobbleTex, bumpScale: 2.5, roughness: 0.9 });
  const brickTex = brickTexture(theme.stone);
  const brickMat = std(0xffffff, { map: brickTex, bumpMap: brickTex, bumpScale: 2, roughness: 0.92 });
  const CAPS = { basalt: 0x2e2422, cloud: 0xf4f8ff, cave: 0x4a3e34, mossy: 0x7f8c6c };
  const capMat = std(CAPS[theme.stone] || (theme.stone === 'sand' ? 0xcbb388 : theme.stone === 'sandstone' ? 0xe6cc92 : theme.stone === 'night' ? 0x5c5f80 : 0x9a948a), { roughness: 0.85, flatShading: true });

  // ---- พื้นหญ้า (บนกระดาน + รอบนอก) ----
  const grass = new QuadBuilder();
  const B = { x0: -COLS / 2, x1: COLS / 2, z0: -ROWS / 2, z1: ROWS / 2 };
  const E = 60;
  grass.flat(-E, -E, E, B.z0, 0, 0.25);
  grass.flat(-E, B.z1, E, E, 0, 0.25);
  grass.flat(-E, B.z0, B.x0, B.z1, 0, 0.25);
  grass.flat(B.x1, B.z0, E, B.z1, 0, 0.25);
  const floor = new QuadBuilder();
  const walls = new QuadBuilder();
  const caps = [];
  const hazards = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x0 = tileX(c) - 0.5, z0 = tileZ(r) - 0.5;
      if (!walk(c, r)) {
        if (map.tiles[r][c] === 'X' && theme.hazard) { hazards.push({ c, r }); continue; }
        grass.flat(x0, z0, x0 + 1, z0 + 1, 0, 0.25);
        continue;
      }
      floor.flat(x0, z0, x0 + 1, z0 + 1, FLOOR, 0.36);
      // กำแพงกันดินรอบช่องที่ลึกลงไป
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (walk(c + dc, r + dr)) continue;
        const cx = tileX(c) + dc * 0.5, cz = tileZ(r) + dr * 0.5;
        const ax = cx - (dr ? 0.5 : 0), az = cz - (dc ? 0.5 : 0);
        const bx = cx + (dr ? 0.5 : 0), bz = cz + (dc ? 0.5 : 0);
        walls.wall(ax, az, bx, bz, FLOOR, 0, [-dc, 0, -dr], 0.9);
        caps.push({ x: cx + dc * 0.07, z: cz + dr * 0.07, horiz: !!dr });
      }
    }
  }
  const grassMesh = new THREE.Mesh(grass.build(), grassMat);
  grassMesh.receiveShadow = true;
  group.add(grassMesh);
  const floorMesh = new THREE.Mesh(floor.build(), cobbleMat);
  floorMesh.receiveShadow = true;
  group.add(floorMesh);
  // ---- ผิวน้ำแม่น้ำ (มอนสเตอร์เดินลุยน้ำ) ----
  if (theme.floor === 'water') {
    const wq = new QuadBuilder();
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (walk(c, r)) wq.flat(tileX(c) - 0.5, tileZ(r) - 0.5, tileX(c) + 0.5, tileZ(r) + 0.5, FLOOR + 0.17, 0.5);
    const wtex = rippleTexture();
    const water = new THREE.Mesh(wq.build(), new THREE.MeshStandardMaterial({ color: 0x4ab4ff, map: wtex, transparent: true, opacity: 0.72, roughness: 0.08, metalness: 0.25, emissive: 0x0a3a6a, emissiveIntensity: 0.35, depthWrite: false }));
    water.renderOrder = 2;
    group.add(water);
    anim.push((t) => { wtex.offset.set(t * 0.05, -t * 0.12); });
  }
  // ---- ช่องอันตรายบนกระดาน: ธารลาวา / ช่องโหว่ในเมฆ ----
  if (hazards.length) buildHazards(group, hazards, theme, anim, capMat);

  const wallMesh = new THREE.Mesh(walls.build(), brickMat);
  wallMesh.receiveShadow = true;
  wallMesh.castShadow = true;
  group.add(wallMesh);
  // หินครอบขอบกำแพง
  group.add(instanced(G.box(), capMat, caps, (d, it) => {
    d.position.set(it.x, 0.03, it.z);
    d.scale.set(it.horiz ? 1.06 : 0.16, 0.07 + Math.random() * 0.02, it.horiz ? 0.16 : 1.06);
  }));
  // ขอบเขตกระดาน
  const curb = [];
  for (let c = 0; c < COLS; c++) {
    if (!walk(c, 0)) curb.push({ x: tileX(c), z: B.z0 - 0.08, horiz: true });
    if (!walk(c, ROWS - 1)) curb.push({ x: tileX(c), z: B.z1 + 0.08, horiz: true });
  }
  for (let r = 0; r < ROWS; r++) {
    if (!walk(0, r)) curb.push({ x: B.x0 - 0.08, z: tileZ(r), horiz: false });
    if (!walk(COLS - 1, r)) curb.push({ x: B.x1 + 0.08, z: tileZ(r), horiz: false });
  }
  group.add(instanced(G.box(), capMat, curb, (d, it) => {
    d.position.set(it.x, 0.05, it.z);
    d.scale.set(it.horiz ? 1.02 : 0.16, 0.1, it.horiz ? 0.16 : 1.02);
  }));

  // ---- สิ่งกีดขวางบนกระดาน ----
  const rocks = [];
  const ruinBlocks = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = map.tiles[r][c];
      if (ch === 'R') {
        const n = 3 + Math.floor(Math.random() * 3);
        for (let k = 0; k < n; k++) {
          const s = k === 0 ? rand(0.28, 0.38) : rand(0.1, 0.22);
          rocks.push({ x: tileX(c) + rand(-0.28, 0.28), z: tileZ(r) + rand(-0.28, 0.28), s });
        }
      } else if (ch === 'W') {
        const h = rand(0.22, 0.42);
        ruinBlocks.push({ x: tileX(c), z: tileZ(r), h, w: 0.94 });
        if (Math.random() < 0.35) ruinBlocks.push({ x: tileX(c) + rand(-0.2, 0.2), z: tileZ(r) + rand(-0.2, 0.2), h: h + rand(0.15, 0.35), w: rand(0.3, 0.45), y0: h });
      }
    }
  }
  const ROCKS = { basalt: 0x2c2422, cave: 0x5a4a3c, mossy: 0x7a7a6a, cloud: 0xd8e2f4 };
  const rockMat = std(ROCKS[theme.stone] || (theme.stone === 'sand' ? 0xb08a5c : theme.stone === 'sandstone' ? 0xd2aa6a : theme.stone === 'night' ? 0x4b4e70 : 0x8f8b84), { flatShading: true, roughness: 0.95 });
  if (rocks.length) {
    group.add(instanced(G.dode(), rockMat, rocks, (d, it) => {
      d.position.set(it.x, it.s * 0.55, it.z);
      d.rotation.set(rand(0, 3), rand(0, 3), 0);
      d.scale.set(it.s, it.s * rand(0.7, 1), it.s);
    }));
  }
  if (rocks.length && theme.deco === 'cave') {
    const pal = [0x5ac8ff, 0xb070ff, 0xffb040, 0x5affa0];
    group.add(instanced(G.octa(), new THREE.MeshBasicMaterial({ color: 0xffffff }), rocks.filter((it) => it.s > 0.25), (d, it) => {
      d.position.set(it.x, it.s * 1.2, it.z);
      d.rotation.set(rand(-0.3, 0.3), rand(0, 3), rand(-0.3, 0.3));
      d.scale.set(0.09, 0.3, 0.09);
    }, { shadow: false, colors: () => new THREE.Color(pal[Math.floor(Math.random() * pal.length)]).multiplyScalar(1.6).getHex() }));
  }
  if (ruinBlocks.length) {
    const ruinMat = std(0xd6d0c4, { map: brickTex, bumpMap: brickTex, bumpScale: 2, roughness: 0.9 });
    group.add(instanced(G.box(), ruinMat, ruinBlocks, (d, it) => {
      const y0 = it.y0 || 0;
      d.position.set(it.x, y0 + (it.h - y0) / 2, it.z);
      d.scale.set(it.w, it.h - y0, it.w);
    }));
  }

  // ---- พอร์ทัล ----
  const placePortal = (tile, out, color) => {
    const p = makePortal(color, theme.stone);
    const c = tile % COLS, r = Math.floor(tile / COLS);
    p.group.position.set(tileX(c) + out.x * 0.42, FLOOR, tileZ(r) + out.y * 0.42);
    p.group.rotation.y = Math.atan2(-out.x, -out.y);
    group.add(p.group);
    anim.push((t) => {
      p.swirl.uniforms.time.value = t;
      p.halo.material.opacity = 0.35 + Math.sin(t * 3) * 0.1;
    });
    return p;
  };
  const spawnPortal = placePortal(map.spawn, map.spawnOut, 0x3a9bff);
  const corePortal = placePortal(map.core, map.coreOut, 0xff3048);
  // ผลึกแกนกลางลอยเหนือพอร์ทัลแดง
  const coreGem = new THREE.Group();
  coreGem.position.set(0, 1.75, 0);
  const coreCrystal = mesh(G.octa(), glow(0xffd8e0, 1.6), { s: [0.2, 0.32, 0.2], shadow: false });
  coreGem.add(coreCrystal);
  ELEMENT_ORDER.forEach((el, i) => {
    const a = (i / 6) * Math.PI * 2;
    coreGem.add(mesh(G.octa(), glow(ELEMENTS[el].color, 3), { x: Math.cos(a) * 0.38, z: Math.sin(a) * 0.38, s: 0.07, shadow: false }));
  });
  corePortal.group.add(coreGem);
  anim.push((t) => {
    coreGem.rotation.y = t * 0.9;
    coreGem.position.y = 1.75 + Math.sin(t * 2) * 0.08;
  });

  // ---- ป้ายบอกทางผู้สร้างเกม (กึ่งกลางด้านบนกระดาน) ----
  const spot = [(COLS - 1) / 2, -0.95];
  const creatorSign = makeCreatorSign();
  creatorSign.position.set(tileX(spot[0]), 0, tileZ(spot[1]));
  group.add(creatorSign);

  // ---- ของตกแต่งรอบนอก ----
  decorate(group, map, theme, walk, anim, [{ x: tileX(spot[0]), z: tileZ(spot[1]) }]);

  // ---- ท้องฟ้า ----
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(150, 24, 12),
    new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color(theme.sky[0]) }, bottom: { value: new THREE.Color(theme.sky[1]) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y * 1.6 + 0.1, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, h), 1.0); }',
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    }),
  );
  group.add(sky);
  if (theme.deco === 'night') {
    const stars = [];
    for (let i = 0; i < 400; i++) {
      const a = Math.random() * Math.PI * 2, e = Math.random() * 1.2 + 0.15;
      stars.push(Math.cos(a) * Math.cos(e) * 140, Math.sin(e) * 140, Math.sin(a) * Math.cos(e) * 140);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
    group.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, fog: false })));
  }

  return {
    group, theme, anim,
    spawnPortal, corePortal, coreCrystal, creatorSign,
    update(t) { for (const a of anim) a(t); },
  };
}

/* ---------- ของตกแต่ง ---------- */
function decorate(group, map, theme, walk, anim, extraPts = []) {
  const B = { x0: -COLS / 2, x1: COLS / 2, z0: -ROWS / 2, z1: ROWS / 2 };
  const inBoard = (x, z, m = 0.5) => x > B.x0 - m && x < B.x1 + m && z > B.z0 - m && z < B.z1 + m;
  const portals = [map.spawn, map.core].map((i) => ({ x: tileX(i % COLS), z: tileZ(Math.floor(i / COLS)) }));
  const signPts = extraPts;
  const nearPortal = (x, z, d = 2.2) => portals.some((p) => Math.hypot(p.x - x, p.z - z) < d) || signPts.some((p) => Math.hypot(p.x - x, p.z - z) < 1.4);
  const scatter = (n, minD, maxD, margin = 0.9) => {
    const pts = [];
    let guard = 0;
    while (pts.length < n && guard++ < n * 40) {
      const x = rand(B.x0 - maxD, B.x1 + maxD), z = rand(B.z0 - maxD * 0.8, B.z1 + maxD * 0.6);
      const dx = Math.max(B.x0 - x, 0, x - B.x1), dz = Math.max(B.z0 - z, 0, z - B.z1);
      const d = Math.hypot(dx, dz);
      if (inBoard(x, z, margin) || d < minD || nearPortal(x, z)) continue;
      pts.push({ x, z, d });
    }
    return pts;
  };

  const night = theme.deco === 'night';
  const desert = theme.deco === 'desert';
  const barren = ['volcano', 'sky', 'cave'].includes(theme.deco); // ฉากพิเศษ: ไม่มีหญ้า/ต้นไม้ปกติ
  const canyon = theme.deco === 'canyon' || desert || barren; // ฉากแห้งแล้ง: ไม่มีดอกไม้/ต้นไม้ใบเขียว

  // หญ้าเป็นกอ (ทั้งบนเนินในกระดานและรอบนอก)
  const tufts = scatter(barren ? 0 : desert ? 500 : 2600, 0, 16, 0.2);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (walk(c, r) || map.tiles[r][c] === 'W') continue;
      for (let k = 0; k < (barren ? 0 : desert ? 1 : 4); k++) tufts.push({ x: tileX(c) + rand(-0.45, 0.45), z: tileZ(r) + rand(-0.45, 0.45) });
    }
  }
  const tuftMat = std(0xffffff, { vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
  const tuftBase = desert ? 0xb8a560 : canyon ? 0xc9b067 : night ? 0x4d8a8f : 0x7fbf45;
  group.add(instanced(tuftGeometry(), tuftMat, tufts, (d, it) => {
    d.position.set(it.x, 0, it.z);
    d.rotation.y = rand(0, 6);
    d.scale.setScalar(rand(0.8, 1.6));
  }, { shadow: false, colors: () => new THREE.Color(tuftBase).offsetHSL(rand(-0.03, 0.03), 0, rand(-0.08, 0.06)).getHex() }));

  // ดอกไม้
  if (!canyon) {
    const fl = scatter(500, 0, 12, 0.3);
    const pal = night ? [0x7af0ff, 0xc08aff, 0x8affc8] : [0xffffff, 0xffe14a, 0xff7ab0, 0xb48aff, 0xff6a4a];
    group.add(instanced(G.sphLo(), night ? glow(0xffffff, 1.2) : std(0xffffff, { roughness: 0.6 }), fl, (d, it) => {
      d.position.set(it.x, 0.08, it.z);
      d.scale.setScalar(rand(0.025, 0.045));
    }, { shadow: false, colors: () => pal[Math.floor(Math.random() * pal.length)] }));
  }

  // ต้นไม้
  const treeSpots = scatter(desert || barren ? 0 : canyon ? 30 : 150, 1.2, 15);
  const trunkMat = std(night ? 0x3a2a30 : 0x6b4a2b, { roughness: 0.9 });
  if (desert) buildDesert(group, scatter, nearPortal, B);
  if (theme.deco === 'volcano') buildVolcano(group, scatter, B, anim);
  if (theme.deco === 'sky') buildSky(group, scatter, B, anim);
  if (theme.deco === 'cave') buildCave(group, scatter, B, anim);
  if (theme.deco === 'river') buildRiver(group, scatter, B, anim, map, walk);
  if (canyon && !desert && !barren) {
    const mesas = scatter(40, 2, 18);
    group.add(instanced(geo('mesa', () => new THREE.CylinderGeometry(0.5, 0.65, 1, 7)), std(0xffffff, { flatShading: true, roughness: 0.95, map: brickTexture('sand') }), mesas, (d, it) => {
      const h = rand(0.6, 2.8) * (0.5 + it.d * 0.1), s = rand(0.6, 1.6);
      d.position.set(it.x, h / 2, it.z);
      d.scale.set(s, h, s);
      d.rotation.y = rand(0, 3);
    }, { colors: () => new THREE.Color(0xd08a50).offsetHSL(0, 0, rand(-0.1, 0.06)).getHex() }));
    const cacti = scatter(45, 0.8, 12);
    group.add(instanced(geo('cactus', () => mergeGeometries([
      new THREE.CapsuleGeometry(0.09, 0.5, 4, 8).translate(0, 0.33, 0),
      new THREE.CapsuleGeometry(0.06, 0.2, 4, 8).rotateZ(Math.PI / 2).translate(0.12, 0.35, 0),
      new THREE.CapsuleGeometry(0.05, 0.18, 4, 8).translate(0.2, 0.45, 0),
    ])), std(0x5c9a3e, { roughness: 0.7 }), cacti, (d, it) => {
      d.position.set(it.x, 0, it.z);
      d.rotation.y = rand(0, 6);
      d.scale.setScalar(rand(0.8, 1.5));
    }));
  }
  const pines = treeSpots.filter((_, i) => i % (night ? 1 : 3) === 0);
  const leafy = night ? [] : treeSpots.filter((_, i) => i % 3 !== 0);
  if (leafy.length) {
    const sizes = leafy.map(() => rand(0.9, 1.7));
    group.add(instanced(geo('trunk', () => new THREE.CylinderGeometry(0.07, 0.12, 1, 6)), trunkMat, leafy, (d, it, i) => {
      d.position.set(it.x, 0.45 * sizes[i], it.z);
      d.scale.set(sizes[i], sizes[i] * 0.9, sizes[i]);
    }));
    const leafBase = canyon ? 0x8a9a3a : 0x3f8f32;
    group.add(instanced(foliageGeometry(), std(0xffffff, { flatShading: true, roughness: 0.85 }), leafy, (d, it, i) => {
      d.position.set(it.x, 1.05 * sizes[i], it.z);
      d.rotation.y = rand(0, 6);
      d.scale.setScalar(sizes[i]);
    }, { colors: () => new THREE.Color(leafBase).offsetHSL(rand(-0.04, 0.05), rand(-0.1, 0.05), rand(-0.07, 0.07)).getHex() }));
  }
  if (pines.length && !canyon) {
    const sizes = pines.map(() => rand(1, 2));
    group.add(instanced(geo('pineTrunk', () => new THREE.CylinderGeometry(0.06, 0.09, 0.4, 6).translate(0, 0.2, 0)), trunkMat, pines, (d, it, i) => {
      d.position.set(it.x, 0, it.z);
      d.scale.setScalar(sizes[i]);
    }));
    const pineBase = night ? 0x1f4a50 : 0x2a6a38;
    group.add(instanced(pineGeometry(), std(0xffffff, { flatShading: true, roughness: 0.85 }), pines, (d, it, i) => {
      d.position.set(it.x, 0, it.z);
      d.rotation.y = rand(0, 6);
      d.scale.setScalar(sizes[i]);
    }, { colors: () => new THREE.Color(pineBase).offsetHSL(rand(-0.03, 0.03), 0, rand(-0.06, 0.06)).getHex() }));
  }

  // พุ่มไม้และก้อนหิน
  if (!canyon) {
    const bushes = scatter(120, 0.5, 12);
    group.add(instanced(G.ico1(), std(0xffffff, { flatShading: true, roughness: 0.85 }), bushes, (d, it) => {
      const s = rand(0.18, 0.4);
      d.position.set(it.x, s * 0.6, it.z);
      d.scale.set(s * 1.3, s, s * 1.2);
    }, { colors: () => new THREE.Color(night ? 0x24585c : 0x3e8a30).offsetHSL(0, 0, rand(-0.06, 0.08)).getHex() }));
  }
  const rocks = scatter(theme.deco === 'sky' ? 0 : 110, 0.6, 15);
  group.add(instanced(G.dode(), std(theme.deco === 'volcano' ? 0x2a2220 : theme.deco === 'cave' ? 0x4e4034 : desert ? 0xd2aa6a : canyon ? 0xb88a5a : night ? 0x45486a : 0x8d8a84, { flatShading: true, roughness: 0.95 }), rocks, (d, it) => {
    const s = rand(0.15, 0.6);
    d.position.set(it.x, s * 0.45, it.z);
    d.rotation.set(rand(0, 3), rand(0, 3), 0);
    d.scale.set(s, s * rand(0.6, 1), s);
  }));

  // คริสตัลเรืองแสงและเห็ด (ฉากกลางคืน)
  if (night) {
    const cr = scatter(70, 0.5, 13);
    const pal = [0x5ac8ff, 0xb070ff, 0x5affd0, 0xff70d0];
    group.add(instanced(G.octa(), new THREE.MeshBasicMaterial({ color: 0xffffff }), cr, (d, it) => {
      const s = rand(0.1, 0.35);
      d.position.set(it.x, s, it.z);
      d.rotation.set(rand(-0.3, 0.3), rand(0, 3), rand(-0.3, 0.3));
      d.scale.set(s * 0.5, s * 1.8, s * 0.5);
    }, { shadow: false, colors: () => new THREE.Color(pal[Math.floor(Math.random() * pal.length)]).multiplyScalar(rand(0.7, 1.4)).getHex() }));
  }

  // บ่อน้ำ
  if (theme.water) {
    const spots = scatter(1, 4, 7);
    for (const p of spots) {
      const pond = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshStandardMaterial({ color: night ? 0x1a3a6a : 0x3a8fd0, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.85 }));
      pond.rotation.x = -Math.PI / 2;
      pond.position.set(p.x, 0.02, p.z);
      pond.scale.set(2.2, 1.5, 1);
      pond.receiveShadow = true;
      group.add(pond);
      const rim = [];
      for (let k = 0; k < 22; k++) {
        const a = (k / 22) * Math.PI * 2;
        rim.push({ x: p.x + Math.cos(a) * 2.25, z: p.z + Math.sin(a) * 1.55 });
      }
      group.add(instanced(G.dode(), std(desert ? 0xcfae78 : 0x8a8680, { flatShading: true }), rim, (d, it) => {
        const s = rand(0.12, 0.25);
        d.position.set(it.x, s * 0.4, it.z);
        d.rotation.set(rand(0, 3), rand(0, 3), 0);
        d.scale.setScalar(s);
      }));
      if (desert) buildPalms(group, p);
      const pads = [];
      for (let k = 0; k < (desert ? 0 : 6); k++) pads.push({ x: p.x + rand(-1.4, 1.4), z: p.z + rand(-0.9, 0.9) });
      group.add(instanced(geo('lily', () => new THREE.CircleGeometry(0.15, 10, 0.4, Math.PI * 1.8)), std(0x4a9a3a, { side: THREE.DoubleSide }), pads, (d, it) => {
        d.position.set(it.x, 0.035, it.z);
        d.rotation.set(-Math.PI / 2, 0, rand(0, 6));
      }, { shadow: false }));
    }
  }

  // ซากปรักหักพังรอบนอก (โค้งหิน เสาหัก)
  if (theme.deco === 'ruins' || theme.deco === 'forest' || desert) {
    const pillars = scatter(theme.deco === 'ruins' ? 22 : desert ? 12 : 8, 0.8, 7);
    const stoneMat = std(desert ? 0xf0dcae : 0xd2ccc0, { map: brickTexture(desert ? 'sandstone' : 'stone'), roughness: 0.9 });
    group.add(instanced(G.box(), stoneMat, pillars, (d, it) => {
      const h = rand(0.5, 1.6);
      d.position.set(it.x, h / 2, it.z);
      d.scale.set(0.32, h, 0.32);
      d.rotation.y = rand(0, 1);
    }));
  }

  // ตะเกียงรอบขอบกระดาน
  const lanterns = [];
  for (let c = 1; c < COLS; c += 4) {
    lanterns.push({ x: tileX(c), z: B.z0 - 0.45 }, { x: tileX(c), z: B.z1 + 0.45 });
  }
  for (let r = 2; r < ROWS; r += 4) {
    lanterns.push({ x: B.x0 - 0.45, z: tileZ(r) }, { x: B.x1 + 0.45, z: tileZ(r) });
  }
  const lanternSpots = lanterns.filter((p) => !nearPortal(p.x, p.z, 1.3));
  const woodMat = std(0x3a2a1e, { roughness: 0.85 });
  group.add(instanced(G.box(), woodMat, lanternSpots, (d, it) => { d.position.set(it.x, 0.55, it.z); d.scale.set(0.07, 1.1, 0.07); }));
  group.add(instanced(G.box(), woodMat, lanternSpots, (d, it) => { d.position.set(it.x, 1.08, it.z); d.scale.set(0.3, 0.05, 0.05); }));
  group.add(instanced(G.box(), glow(0xffb84a, 2.2), lanternSpots, (d, it) => { d.position.set(it.x + 0.12, 0.96, it.z); d.scale.set(0.09, 0.13, 0.09); }, { shadow: false }));
  const sprMat = new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(0xffa040).multiplyScalar(theme.lantern), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  lanternSpots.forEach((p) => {
    const s = new THREE.Sprite(sprMat);
    s.position.set(p.x + 0.12, 0.96, p.z);
    s.scale.setScalar(0.7);
    group.add(s);
  });
  if (night || theme.pointLights) {
    lanternSpots.filter((_, i) => i % 3 === 0).slice(0, 6).forEach((p) => {
      const l = new THREE.PointLight(0xffa850, 2.2, 5, 1.6);
      l.position.set(p.x, 1.1, p.z);
      group.add(l);
    });
  }

  // ถังไม้และลังใกล้แกนกลาง
  const cp = portals[1];
  const props = [];
  for (let k = 0; k < 5; k++) props.push({ x: cp.x + rand(-2.5, 2.5), z: cp.z + rand(-2.5, 2.5) });
  const okProps = props.filter((p) => !inBoard(p.x, p.z, 0.6) && !nearPortal(p.x, p.z, 1.2));
  group.add(instanced(geo('barrel', () => new THREE.CylinderGeometry(0.16, 0.14, 0.38, 10)), std(0x7a5232, { roughness: 0.8 }), okProps, (d, it) => {
    d.position.set(it.x, 0.19, it.z);
  }));
}

/* ---------- ป้ายไม้แนะนำ (หันหากล้องเสมอ) ---------- */
/* ---------- พื้นผิวเคลื่อนไหว: ระลอกน้ำ / ลาวา ---------- */
const texMemo = {};
function rippleTexture() {
  if (texMemo.ripple) return texMemo.ripple;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#7fc8ff'; g.fillRect(0, 0, 128, 128);
  g.lineCap = 'round';
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 128, y = Math.random() * 128, w = 10 + Math.random() * 26;
    g.strokeStyle = Math.random() < 0.6 ? 'rgba(255,255,255,0.75)' : 'rgba(30,90,170,0.5)';
    g.lineWidth = 1 + Math.random() * 1.5;
    for (const ox of [0, -128, 128]) for (const oy of [0, -128, 128]) {
      g.beginPath(); g.moveTo(x + ox, y + oy); g.quadraticCurveTo(x + ox + w / 2, y + oy - 4, x + ox + w, y + oy); g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return (texMemo.ripple = t);
}
function lavaTexture() {
  if (texMemo.lava) return texMemo.lava;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 128, 128); gr.addColorStop(0, '#ff7a1a'); gr.addColorStop(1, '#ff4a0a');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const blob = (x, y, r, col) => { for (const ox of [0, -128, 128]) for (const oy of [0, -128, 128]) {
    const rg = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(x + ox, y + oy, r, 0, Math.PI * 2); g.fill(); } };
  for (let i = 0; i < 18; i++) blob(Math.random() * 128, Math.random() * 128, 6 + Math.random() * 14, 'rgba(255,235,140,0.9)');
  for (let i = 0; i < 14; i++) blob(Math.random() * 128, Math.random() * 128, 5 + Math.random() * 12, 'rgba(60,14,6,0.85)');
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return (texMemo.lava = t);
}

// อนุภาคลอยขึ้น (ถ่านไฟ / ฝุ่นถ้ำ)
function floaters(group, anim, { n, x0, x1, z0, z1, y0 = 0, y1 = 6, color, size = 0.12, speed = 0.6, additive = true }) {
  const pos = new Float32Array(n * 3), vel = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = rand(x0, x1); pos[i * 3 + 1] = rand(y0, y1); pos[i * 3 + 2] = rand(z0, z1); vel[i] = rand(0.5, 1.5) * speed;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geom, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.85, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, map: glowTexture() }));
  pts.frustumCulled = false;
  group.add(pts);
  let last = 0;
  anim.push((t) => {
    const dt = Math.min(0.05, t - last); last = t;
    for (let i = 0; i < n; i++) {
      pos[i * 3 + 1] += vel[i] * dt;
      pos[i * 3] += Math.sin(t * 0.7 + i) * 0.004;
      if (pos[i * 3 + 1] > y1) pos[i * 3 + 1] = y0;
    }
    geom.attributes.position.needsUpdate = true;
  });
}

/* ---------- ช่องอันตรายบนกระดาน ---------- */
function buildHazards(group, list, theme, anim, capMat) {
  const set = new Set(list.map((h) => h.r * COLS + h.c));
  const isH = (c, r) => set.has(r * COLS + c);
  const lava = theme.hazard === 'lava';
  const depth = lava ? 0.2 : 0.8;
  const walls = new QuadBuilder();
  const caps = [];
  const bottom = new QuadBuilder();
  for (const { c, r } of list) {
    const x0 = tileX(c) - 0.5, z0 = tileZ(r) - 0.5;
    bottom.flat(x0, z0, x0 + 1, z0 + 1, -depth + 0.06, 0.5);
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (isH(c + dc, r + dr)) continue;
      const cx = tileX(c) + dc * 0.5, cz = tileZ(r) + dr * 0.5;
      const ax = cx - (dr ? 0.5 : 0), az = cz - (dc ? 0.5 : 0);
      const bx = cx + (dr ? 0.5 : 0), bz = cz + (dc ? 0.5 : 0);
      walls.wall(ax, az, bx, bz, -depth, 0, [-dc, 0, -dr], 0.9);
      caps.push({ x: cx, z: cz, horiz: !!dr });
    }
  }
  const wallMat = lava ? std(0xffffff, { map: brickTexture('basalt'), roughness: 0.9 }) : std(0xc8d8f4, { roughness: 1 });
  group.add(new THREE.Mesh(walls.build(), wallMat));
  if (lava) {
    const tex = lavaTexture();
    const lavaMesh = new THREE.Mesh(bottom.build(), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.6, 1.25, 1.1) }));
    group.add(lavaMesh);
    anim.push((t) => { tex.offset.set(t * 0.03, t * 0.05); });
    group.add(instanced(G.dode(), std(0x221a18, { flatShading: true, roughness: 0.6 }), caps, (d, it) => {
      d.position.set(it.x, 0.04, it.z);
      d.rotation.set(rand(0, 3), rand(0, 3), 0);
      d.scale.set(it.horiz ? 0.32 : 0.16, 0.1, it.horiz ? 0.16 : 0.32);
    }));
    // ฟองลาวาผุด
    const bubbles = list.flatMap(({ c, r }) => [0, 1].map(() => ({ x: tileX(c) + rand(-0.35, 0.35), z: tileZ(r) + rand(-0.35, 0.35), p: rand(0, 6) })));
    const bm = new THREE.InstancedMesh(G.sphLo(), glow(0xffd070, 2.4), bubbles.length);
    const d = new THREE.Object3D();
    group.add(bm);
    anim.push((t) => {
      bubbles.forEach((b, i) => {
        const k = ((t * 0.6 + b.p) % 1);
        d.position.set(b.x, -depth + 0.08 + k * 0.05, b.z);
        d.scale.setScalar(0.06 * Math.sin(k * Math.PI));
        d.updateMatrix(); bm.setMatrixAt(i, d.matrix);
      });
      bm.instanceMatrix.needsUpdate = true;
    });
    floaters(group, anim, { n: list.length * 6, x0: -COLS / 2, x1: COLS / 2, z0: -ROWS / 2, z1: ROWS / 2, y0: -0.1, y1: 2.5, color: 0xff8a3a, size: 0.1, speed: 0.5 });
  } else {
    // ขอบเมฆฟู ๆ รอบช่องโหว่ + หมอกจาง ๆ ด้านล่าง
    group.add(instanced(G.sph(), std(0xffffff, { roughness: 1, emissive: 0xcfdcff, emissiveIntensity: 0.25 }), caps, (d, it) => {
      d.position.set(it.x + rand(-0.1, 0.1), rand(-0.02, 0.06), it.z + rand(-0.1, 0.1));
      d.scale.set(rand(0.14, 0.22), rand(0.06, 0.1), rand(0.14, 0.22));
    }, { shadow: false }));
    const mist = new THREE.Mesh(bottom.build(), new THREE.MeshBasicMaterial({ color: 0x5a9cf0, transparent: true, opacity: 0.85, depthWrite: false }));
    mist.position.y = -1.6;
    group.add(mist);
  }
}

/* ---------- ฉากภูเขาไฟ ---------- */
function makeVolcanoCone(h, r) {
  const g = new THREE.Group();
  const prof = [[r, 0], [r * 0.8, h * 0.25], [r * 0.55, h * 0.6], [r * 0.32, h * 0.92], [r * 0.26, h], [r * 0.2, h * 0.94], [0, h * 0.9]];
  const cone = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 14), std(0x3a2a24, { flatShading: true, roughness: 0.95 }));
  cone.castShadow = true;
  g.add(cone);
  const crater = new THREE.Mesh(new THREE.CircleGeometry(r * 0.2, 16), glow(0xff7a2a, 2.6));
  crater.rotation.x = -Math.PI / 2; crater.position.y = h * 0.93;
  g.add(crater);
  // ธารลาวาไหลลงข้างภูเขา
  for (let k = 0; k < 4; k++) {
    const a = k * 1.6 + 0.4;
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8, y = h * (0.92 - t * 0.9);
      const rr = r * (0.24 + t * 0.6) + 0.05;
      pts.push(new THREE.Vector3(Math.cos(a + Math.sin(t * 5) * 0.12) * rr, y, Math.sin(a + Math.sin(t * 5) * 0.12) * rr));
    }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.12 + r * 0.01, 5), glow(0xff5a1a, 2.2)));
  }
  return g;
}
function buildVolcano(group, scatter, B, anim) {
  const big = makeVolcanoCone(9, 8);
  big.position.set(3, 0, B.z0 - 16);
  group.add(big);
  const small = makeVolcanoCone(5, 4.5);
  small.position.set(-14, 0, B.z0 - 9);
  group.add(small);
  // ควันพวยพุ่งจากปล่อง
  const smoke = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(G.sphLo(), new THREE.MeshStandardMaterial({ color: 0x3a3030, transparent: true, opacity: 0.5, roughness: 1, depthWrite: false }));
    m.userData.p = i / 14;
    group.add(m); smoke.push(m);
  }
  anim.push((t) => smoke.forEach((m) => {
    const k = (t * 0.06 + m.userData.p) % 1;
    m.position.set(3 + Math.sin(k * 4 + m.userData.p * 9) * (1 + k * 3) + k * 4, 8.6 + k * 12, B.z0 - 16 + Math.cos(m.userData.p * 7) * k * 2);
    m.scale.setScalar(0.8 + k * 3.5);
    m.material.opacity = 0.55 * (1 - k);
  }));
  // หินออบซิเดียนแหลม
  const spikes = scatter(55, 0.8, 14);
  group.add(instanced(geo('spike', () => new THREE.ConeGeometry(0.25, 1, 5).translate(0, 0.5, 0)), std(0x14101a, { metalness: 0.6, roughness: 0.2, flatShading: true }), spikes, (d, it) => {
    const h = rand(0.5, 1.8);
    d.position.set(it.x, 0, it.z);
    d.rotation.set(rand(-0.25, 0.25), rand(0, 3), rand(-0.25, 0.25));
    d.scale.set(rand(0.6, 1.3), h, rand(0.6, 1.3));
  }));
  // บ่อลาวานอกกระดาน
  const pools = scatter(7, 2, 12);
  const tex = lavaTexture();
  pools.forEach((p) => {
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.6, 1.25, 1.1) }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(p.x, 0.02, p.z);
    pool.scale.set(rand(0.9, 1.8), rand(0.6, 1.2), 1);
    group.add(pool);
  });
  floaters(group, anim, { n: 260, x0: -22, x1: 22, z0: -18, z1: 14, y0: 0, y1: 8, color: 0xff7a2a, size: 0.13, speed: 0.7 });
}

/* ---------- ฉากเกาะเมฆ ---------- */
function buildSky(group, scatter, B, anim) {
  const cloudMat = std(0xffffff, { roughness: 1, emissive: 0xd8e4ff, emissiveIntensity: 0.3, flatShading: false });
  const puffs = [];
  scatter(90, 1.5, 22).forEach((c) => {
    const n = 3 + Math.floor(Math.random() * 4), s = rand(0.6, 1.6) * (0.6 + c.d * 0.06);
    for (let k = 0; k < n; k++) puffs.push({ x: c.x + rand(-1.2, 1.2) * s, y: rand(-0.6, 0.25) * s, z: c.z + rand(-0.8, 0.8) * s, s: s * rand(0.6, 1.1) });
  });
  group.add(instanced(G.sph(), cloudMat, puffs, (d, it) => { d.position.set(it.x, it.y, it.z); d.scale.set(it.s * 1.3, it.s * 0.75, it.s); }, { shadow: false }));
  // เกาะลอยฟ้า
  const islands = [[-15, 4, -10], [16, 5.5, -9], [-19, 3, 6], [20, 3.5, 7], [4, 7, -20]];
  islands.forEach(([x, y, z], i) => {
    const g = new THREE.Group();
    const s = 0.8 + (i % 3) * 0.35;
    const rock = new THREE.Mesh(new THREE.ConeGeometry(1.6 * s, 2.6 * s, 7).rotateX(Math.PI), std(0x8a7a6a, { flatShading: true }));
    rock.position.y = -1.3 * s;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.65 * s, 1.6 * s, 0.25 * s, 7), std(0x6ac04a, { flatShading: true }));
    const tree = new THREE.Mesh(foliageGeometry(), std(0x3f9a3a, { flatShading: true }));
    tree.position.set(0.3 * s, 0.9 * s, 0); tree.scale.setScalar(s);
    const trunk = new THREE.Mesh(G.cyl(), std(0x6b4a2b)); trunk.position.set(0.3 * s, 0.45 * s, 0); trunk.scale.set(0.08 * s, 0.7 * s, 0.08 * s);
    g.add(rock, top, trunk, tree);
    g.position.set(x, y, z);
    group.add(g);
    anim.push((t) => { g.position.y = y + Math.sin(t * 0.5 + i) * 0.25; g.rotation.y = Math.sin(t * 0.1 + i) * 0.2; });
  });
  // สายรุ้ง
  const cols = [0xff4a4a, 0xff9a3a, 0xffe14a, 0x5ae05a, 0x4aa8ff, 0x8a5aff];
  cols.forEach((c, i) => {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(26 - i * 0.55, 0.28, 6, 64, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.32, depthWrite: false, fog: false }));
    arc.position.set(6, -2, B.z0 - 30);
    group.add(arc);
  });
  // สายลมพัด
  const streaks = [];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(geo('streak', () => new THREE.PlaneGeometry(2.4, 0.05)), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    m.userData = { y: rand(0.6, 3), z: rand(-12, 12), p: Math.random(), s: rand(0.6, 1.4) };
    group.add(m); streaks.push(m);
  }
  anim.push((t) => streaks.forEach((m) => {
    const k = (t * 0.05 * m.userData.s + m.userData.p) % 1;
    m.position.set(-26 + k * 52, m.userData.y + Math.sin(t + m.userData.p * 6) * 0.2, m.userData.z);
    m.material.opacity = 0.5 * Math.sin(k * Math.PI);
  }));
}

/* ---------- ฉากถ้ำใต้ดิน ---------- */
function buildCave(group, scatter, B, anim) {
  const rockM = std(0x4a3c30, { flatShading: true, roughness: 0.95 });
  const stal = scatter(140, 0.8, 16);
  group.add(instanced(geo('stal', () => new THREE.ConeGeometry(0.3, 1, 6).translate(0, 0.5, 0)), rockM, stal, (d, it) => {
    const h = rand(0.5, 1.6) * (1 + it.d * 0.18);
    d.position.set(it.x, 0, it.z);
    d.rotation.y = rand(0, 3);
    d.scale.set(rand(0.7, 1.5) * (1 + it.d * 0.05), h, rand(0.7, 1.5) * (1 + it.d * 0.05));
  }));
  // ผนังถ้ำ (ก้อนหินยักษ์ล้อมรอบไกล ๆ)
  const walls = scatter(70, 7, 20);
  group.add(instanced(G.dode(), std(0x2e261f, { flatShading: true, roughness: 1 }), walls, (d, it) => {
    const s = rand(1.5, 4) * (0.5 + it.d * 0.08);
    d.position.set(it.x, s * 0.4, it.z);
    d.rotation.set(rand(0, 3), rand(0, 3), 0);
    d.scale.set(s, s * rand(0.8, 1.6), s);
  }));
  // กลุ่มคริสตัลเรืองแสง
  const pal = [0x5ac8ff, 0xb070ff, 0xffb040, 0x5affa0, 0xff6ad0];
  const clusters = scatter(46, 0.6, 13);
  const shards = [];
  clusters.forEach((c) => { const n = 3 + Math.floor(Math.random() * 3), col = pal[Math.floor(Math.random() * pal.length)]; for (let k = 0; k < n; k++) shards.push({ x: c.x + rand(-0.3, 0.3), z: c.z + rand(-0.3, 0.3), s: rand(0.12, 0.38), col }); });
  group.add(instanced(G.octa(), new THREE.MeshBasicMaterial({ color: 0xffffff }), shards, (d, it) => {
    d.position.set(it.x, it.s, it.z);
    d.rotation.set(rand(-0.4, 0.4), rand(0, 3), rand(-0.4, 0.4));
    d.scale.set(it.s * 0.45, it.s * 1.9, it.s * 0.45);
  }, { shadow: false, colors: (it) => new THREE.Color(it.col).multiplyScalar(rand(1.1, 1.8)).getHex() }));
  clusters.slice(0, 5).forEach((c, i) => {
    const l = new THREE.PointLight(pal[i % pal.length], 2.4, 7, 1.6);
    l.position.set(c.x, 1, c.z);
    group.add(l);
  });
  // เห็ดเรืองแสง
  const shrooms = scatter(70, 0.4, 11);
  group.add(instanced(G.cyl(), std(0xd8d0c0), shrooms, (d, it) => { d.position.set(it.x, 0.08, it.z); d.scale.set(0.025, 0.16, 0.025); }, { shadow: false }));
  group.add(instanced(G.sph(), new THREE.MeshBasicMaterial({ color: 0xffffff }), shrooms, (d, it) => { d.position.set(it.x, 0.17, it.z); d.scale.set(0.09, 0.05, 0.09); },
    { shadow: false, colors: () => new THREE.Color(Math.random() < 0.6 ? 0x4affd8 : 0xb070ff).multiplyScalar(1.5).getHex() }));
  floaters(group, anim, { n: 160, x0: -18, x1: 18, z0: -14, z1: 12, y0: 0.2, y1: 4, color: 0x9affd8, size: 0.07, speed: 0.12 });
}

/* ---------- ฉากแม่น้ำ ---------- */
function buildRiver(group, scatter, B, anim, map, walk) {
  // กกริมน้ำ
  const reeds = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (walk(c, r)) continue;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!walk(c + dc, r + dr) || Math.random() > 0.35) continue;
      for (let k = 0; k < 4; k++) reeds.push({ x: tileX(c) + dc * 0.36 + rand(-0.12, 0.12) * (dr ? 4 : 1), z: tileZ(r) + dr * 0.36 + rand(-0.12, 0.12) * (dc ? 4 : 1) });
    }
  }
  group.add(instanced(G.cyl6(), std(0x5a8a2a, { roughness: 0.8 }), reeds, (d, it) => {
    const h = rand(0.25, 0.5);
    d.position.set(it.x, h / 2, it.z); d.rotation.set(rand(-0.2, 0.2), 0, rand(-0.2, 0.2)); d.scale.set(0.015, h, 0.015);
  }, { shadow: false }));
  group.add(instanced(G.cyl6(), std(0x6a4a2a), reeds.filter((_, i) => i % 3 === 0), (d, it) => {
    d.position.set(it.x, 0.48, it.z); d.scale.set(0.03, 0.1, 0.03);
  }, { shadow: false }));
  // ใบบัวบนผิวน้ำ
  const pads = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (walk(c, r) && Math.random() < 0.12) pads.push({ x: tileX(c) + rand(-0.3, 0.3), z: tileZ(r) + rand(-0.3, 0.3) });
  group.add(instanced(geo('lily', () => new THREE.CircleGeometry(0.15, 10, 0.4, Math.PI * 1.8)), std(0x4a9a3a, { side: THREE.DoubleSide }), pads, (d, it) => {
    d.position.set(it.x, FLOOR + 0.19, it.z); d.rotation.set(-Math.PI / 2, 0, rand(0, 6));
  }, { shadow: false }));
  // น้ำตกต้นสายด้านหลังพอร์ทัลเกิด
  const sc = map.spawn % COLS, sr = Math.floor(map.spawn / COLS);
  const wx0 = tileX(sc) - 2.4, wz0 = tileZ(sr);
  const cliff = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.4, 3.2), std(0x7a7466, { flatShading: true, roughness: 0.95, map: brickTexture('mossy') }));
  cliff.position.set(wx0 - 0.6, 1.7, wz0); cliff.castShadow = true;
  group.add(cliff);
  const ftex = rippleTexture().clone(); ftex.needsUpdate = true; ftex.repeat.set(1, 3);
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.4), new THREE.MeshBasicMaterial({ map: ftex, color: 0xcfeaff, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
  fall.rotation.y = Math.PI / 2; fall.position.set(wx0 + 0.12, 1.5, wz0);
  group.add(fall);
  anim.push((t) => { ftex.offset.y = t * 0.8; });
  floaters(group, anim, { n: 40, x0: wx0, x1: wx0 + 1.4, z0: wz0 - 0.8, z1: wz0 + 0.8, y0: 0, y1: 1.2, color: 0xffffff, size: 0.18, speed: 0.4 });
  // บึงน้ำใหญ่รอบนอก
  const lakes = scatter(3, 4, 9);
  lakes.forEach((p) => {
    const lake = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshStandardMaterial({ color: 0x3a9ad8, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.85 }));
    lake.rotation.x = -Math.PI / 2; lake.position.set(p.x, 0.02, p.z); lake.scale.set(rand(2, 3.2), rand(1.3, 2), 1);
    group.add(lake);
  });
}

/* ---------- ฉากทะเลทราย: พีระมิด สฟิงซ์ เสาโอเบลิสก์ ต้นปาล์ม เนินทราย ---------- */
function sandstoneMat(tint = 0xf0d8a4) { return std(tint, { map: brickTexture('sandstone'), roughness: 0.9, flatShading: true }); }

function makePyramid(size, h) {
  const g = new THREE.Group();
  // ขั้นบันไดบาง ๆ ให้ดูเป็นก้อนหินเรียง + ยอดทอง
  const body = new THREE.Mesh(new THREE.ConeGeometry(size * Math.SQRT1_2, h, 4, 1).rotateY(Math.PI / 4).translate(0, h / 2, 0), sandstoneMat());
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);
  const steps = 7;
  for (let k = 1; k < steps; k++) {
    const y = (k / steps) * h, w = size * (1 - k / steps);
    const ring = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.05, w + 0.08), std(0xc9a464, { roughness: 0.95 }));
    ring.position.y = y;
    g.add(ring);
  }
  const capH = h * 0.12;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(size * Math.SQRT1_2 * 0.12, capH, 4).rotateY(Math.PI / 4), std(0xffcf40, { metalness: 0.9, roughness: 0.2, emissive: 0x6a4a00, emissiveIntensity: 0.4 }));
  cap.position.y = h - capH / 2 + 0.01;
  g.add(cap);
  return g;
}

function makeSphinx() {
  const S = (w, h, d, x, y, z, o = {}) => {
    const geom = new THREE.BoxGeometry(w, h, d);
    if (o.rx) geom.rotateX(o.rx);
    if (o.ry) geom.rotateY(o.ry);
    return geom.translate(x, y, z);
  };
  // ลำตัวหันไปทาง +z
  const body = mergeGeometries([
    S(2.0, 0.22, 4.0, 0, 0.11, -0.2),            // ฐาน
    S(1.05, 0.75, 2.4, 0, 0.6, -0.55),           // ลำตัว
    S(1.15, 0.95, 0.9, 0, 0.62, -1.55),          // สะโพก
    S(0.95, 1.0, 0.65, 0, 0.9, 0.55),            // อก
    S(0.3, 0.26, 1.25, -0.34, 0.35, 1.05),       // ขาหน้าซ้าย
    S(0.3, 0.26, 1.25, 0.34, 0.35, 1.05),        // ขาหน้าขวา
    S(0.62, 0.68, 0.6, 0, 1.68, 0.72),           // หัว
    S(0.12, 0.18, 0.1, 0, 1.6, 1.06),            // จมูก
    S(0.2, 0.2, 0.12, 0, 1.24, 1.0),             // เครา
    S(0.12, 0.12, 0.9, 0, 0.42, -2.1, { rx: 0.3 }), // หาง
  ]);
  const nemes = mergeGeometries([
    new THREE.CylinderGeometry(0.38, 0.62, 0.85, 4, 1).rotateY(Math.PI / 4).translate(0, 1.72, 0.58),
    S(0.2, 0.7, 0.18, -0.4, 1.2, 0.78),
    S(0.2, 0.7, 0.18, 0.4, 1.2, 0.78),
  ]);
  const stripes = mergeGeometries([0, 1, 2, 3].map((k) => S(0.005 + 0.66 + k * 0.06, 0.05, 0.62 + k * 0.05, 0, 1.98 - k * 0.17, 0.6)));
  const g = new THREE.Group();
  const add = (geom, mat) => { const m = new THREE.Mesh(geom, mat); m.castShadow = true; m.receiveShadow = true; g.add(m); };
  // หินทรายเนื้อเรียบ (ไม่ใช้ลายอิฐ) ให้ดูเป็นรูปสลัก
  add(body, std(0xe2c286, { roughness: 0.85, flatShading: true }));
  add(nemes, std(0xecd29a, { roughness: 0.8, flatShading: true }));
  add(stripes, std(0x2c4f9a, { roughness: 0.6 }));
  // ตา
  for (const x of [-0.14, 0.14]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.02), std(0x1a1a2a));
    eye.position.set(x, 1.78, 1.03);
    g.add(eye);
  }
  return g;
}

function buildDesert(group, scatter, nearPortal, B) {
  // พีระมิด 3 หลังด้านหลังกระดาน
  for (const [x, dz, size, h] of [[-3.5, 10.5, 7, 5.6], [5.5, 13.5, 9.5, 7.4], [13.5, 9.5, 5, 4]]) {
    const p = makePyramid(size, h);
    p.position.set(x, 0, B.z0 - dz);
    group.add(p);
  }
  // สฟิงซ์หน้าพีระมิด หันเข้าหากระดาน
  const sphinx = makeSphinx();
  sphinx.position.set(1.2, 0, B.z0 - 3.9);
  sphinx.scale.setScalar(1.15);
  group.add(sphinx);
  // เสาโอเบลิสก์
  const obMat = sandstoneMat(0xf2dcae);
  const gold = std(0xffcf40, { metalness: 0.9, roughness: 0.2 });
  for (const [x, z] of [[-1.6, B.z0 - 3.2], [4.0, B.z0 - 3.2], [B.x0 - 2.6, 4.2], [B.x1 + 2.6, -3.5]]) {
    if (nearPortal(x, z, 1.5)) continue;
    const ob = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2.4, 4).rotateY(Math.PI / 4).translate(0, 1.2, 0), obMat);
    ob.position.set(x, 0, z); ob.castShadow = true;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.32, 4).rotateY(Math.PI / 4), gold);
    tip.position.set(x, 2.56, z);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), obMat);
    base.position.set(x, 0.09, z);
    group.add(ob, tip, base);
  }
  // เนินทรายไกล ๆ
  // เนินทรายไกล ๆ (เว้นพื้นที่พีระมิด/สฟิงซ์)
  const dunes = scatter(40, 6, 22).filter((p) => !(p.z < B.z0 + 1 && p.x > -10 && p.x < 19)).slice(0, 24);
  group.add(instanced(G.sph(), std(0xe0bf78, { roughness: 1 }), dunes, (d, it) => {
    d.position.set(it.x, -0.45, it.z);
    d.scale.set(rand(2.5, 6), rand(0.6, 1.4), rand(1.5, 3.5));
    d.rotation.y = rand(0, 3);
  }, { shadow: false, colors: () => new THREE.Color(0xe0bf78).offsetHSL(0, 0, rand(-0.04, 0.03)).getHex() }));
  // ต้นปาล์มกระจาย
  const palms = scatter(14, 1.2, 9);
  palms.forEach((p) => buildPalms(group, p, 1, 0));
}

// ต้นปาล์มรอบโอเอซิส (หรือ 1 ต้นเมื่อ n=1)
function buildPalms(group, center, n = 6, ring = 2.6) {
  const trunkMat = std(0x8a6a42, { roughness: 0.9, flatShading: true });
  const leafMat = std(0x4f9a3a, { roughness: 0.8, side: THREE.DoubleSide, flatShading: true });
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rand(-0.3, 0.3);
    const x = center.x + Math.cos(a) * ring * rand(0.9, 1.15), z = center.z + Math.sin(a) * ring * 0.75 * rand(0.9, 1.15);
    const h = rand(1.4, 2.2), lean = rand(-0.25, 0.25), dir = rand(0, Math.PI * 2);
    const palm = new THREE.Group();
    palm.position.set(x, 0, z);
    palm.rotation.y = dir;
    const segs = 6;
    for (let i = 0; i < segs; i++) {
      const t = i / segs;
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.06 - t * 0.015, 0.075 - t * 0.015, h / segs * 1.05, 6), trunkMat);
      seg.position.set(lean * t * t * h, (t + 0.5 / segs) * h, 0);
      seg.rotation.z = -lean * t * 1.2;
      seg.castShadow = true;
      palm.add(seg);
    }
    const top = new THREE.Group();
    top.position.set(lean * h, h, 0);
    for (let f = 0; f < 7; f++) {
      const fa = (f / 7) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.13, 1.0, 3).rotateX(Math.PI / 2).translate(0, 0, 0.5).scale(1, 0.25, 1), leafMat);
      leaf.rotation.set(0.45 + rand(-0.1, 0.15), fa, 0, 'YXZ');
      leaf.castShadow = true;
      top.add(leaf);
    }
    for (let c = 0; c < 3; c++) {
      const nut = new THREE.Mesh(G.sphLo(), std(0x5a3a1e));
      nut.position.set(Math.cos(c * 2.1) * 0.07, -0.06, Math.sin(c * 2.1) * 0.07);
      nut.scale.setScalar(0.045);
      top.add(nut);
    }
    palm.add(top);
    group.add(palm);
  }
}

/* ---------- ป้ายผู้สร้างเกม: รูปโปรไฟล์ GitHub + คลิกไปหน้าเว็บ ---------- */
export const CREATOR = { name: 'kimookpong', url: 'https://kimookpong.github.io/', avatar: `${import.meta.env.BASE_URL}creator.png` };

// แผ่นป้ายรูปลูกศร (dir = 1 ชี้ขวา, -1 ชี้ซ้าย) — คืนจุดยอดในหน่วย 0..1
function arrowOutline(dir, aspect) {
  const p = Math.min(0.28, 0.5 / aspect); // ความยาวปลายลูกศร (สัดส่วนความกว้าง)
  const n = p * 0.45;                    // รอยบากท้ายลูกศร
  const pts = [[0, 1], [1 - p, 1], [1, 0.5], [1 - p, 0], [0, 0], [n, 0.5]];
  return dir > 0 ? pts : pts.map(([x, y]) => [1 - x, y]);
}

function drawArrowBoard(c, dir, wood, content) {
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  const pts = arrowOutline(dir, W / H).map(([x, y]) => [6 + x * (W - 12), 6 + (1 - y) * (H - 12)]);
  const path = () => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  g.clearRect(0, 0, W, H);
  path();
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, wood[0]); gr.addColorStop(0.55, wood[1]); gr.addColorStop(1, wood[2]);
  g.fillStyle = gr; g.fill();
  g.save(); path(); g.clip();
  g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
  g.strokeStyle = 'rgba(255,220,160,0.08)'; g.lineWidth = 2;
  for (let i = 0; i < 26; i++) { const y = (i * 29) % H; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(W / 3, y + 5, (2 * W) / 3, y - 5, W, y + 2); g.stroke(); }
  g.restore();
  path(); g.lineJoin = 'round'; g.lineWidth = 9; g.strokeStyle = '#d9b45a'; g.stroke();
  path(); g.lineWidth = 3; g.strokeStyle = '#4a2a10'; g.stroke();
  // ตะปูยึดกับเสา (ฝั่งท้ายลูกศร)
  const nx = dir > 0 ? 34 : W - 34;
  for (const y of [H * 0.28, H * 0.72]) { g.fillStyle = '#e8c870'; g.beginPath(); g.arc(nx, y, 6, 0, Math.PI * 2); g.fill(); g.fillStyle = '#6a4a20'; g.beginPath(); g.arc(nx, y, 2.5, 0, Math.PI * 2); g.fill(); }
  g.textBaseline = 'middle';
  content(g, W, H);
}

const signText = (g, str, x, y, font, fill, align = 'left', sw = 5) => {
  g.font = font; g.textAlign = align; g.lineJoin = 'round';
  g.lineWidth = sw; g.strokeStyle = 'rgba(30,15,0,0.85)'; g.strokeText(str, x, y);
  g.fillStyle = fill; g.fillText(str, x, y);
};
const SIGN_FONT = 'Kanit, "Noto Sans Thai", sans-serif';

// แผ่นป้ายลูกศร 3 มิติ (หนา + ลายไม้ด้านหน้า)
function arrowPlank(w, h, dir, tex) {
  const g = new THREE.Group();
  const pts = arrowOutline(dir, w / h).map(([x, y]) => new THREE.Vector2((x - 0.5) * w, (y - 0.5) * h));
  const shape = new THREE.Shape(pts);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false }), std(0x4a2e18, { roughness: 0.9 }));
  body.position.z = -0.06;
  body.castShadow = true;
  const faceGeo = new THREE.ShapeGeometry(shape);
  const uv = faceGeo.attributes.uv, pos = faceGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  const face = new THREE.Mesh(faceGeo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, transparent: true, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.14 }));
  face.position.z = 0.002;
  g.add(body, face);
  return g;
}

function makeCreatorSign() {
  const g = new THREE.Group();
  let img = null;
  const boards = [];
  const addBoard = (w, h, dir, y, ry, wood, content) => {
    const c = document.createElement('canvas');
    c.height = 220; c.width = Math.round(220 * (w / h));
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const draw = () => { drawArrowBoard(c, dir, wood, content); tex.needsUpdate = true; };
    const plank = arrowPlank(w, h, dir, tex);
    plank.position.set(dir * (w / 2 - 0.05), y, 0.07);
    const pivot = new THREE.Group();
    pivot.rotation.y = ry;
    pivot.add(plank);
    g.add(pivot);
    boards.push(draw);
  };
  // ป้ายบน: รูปโปรไฟล์ + ชื่อ (ชี้ขวา)
  addBoard(1.75, 0.62, 1, 1.5, -0.12, ['#9a6436', '#7a4c28', '#5e3a1e'], (gc, W, H) => {
    const cx = 120, cy = H / 2, R = 72;
    gc.save(); gc.beginPath(); gc.arc(cx, cy, R, 0, Math.PI * 2); gc.fillStyle = '#2a1a0c'; gc.fill(); gc.clip();
    if (img) gc.drawImage(img, cx - R, cy - R, R * 2, R * 2);
    gc.restore();
    gc.lineWidth = 7; gc.strokeStyle = '#e8c870'; gc.beginPath(); gc.arc(cx, cy, R + 2, 0, Math.PI * 2); gc.stroke();
    signText(gc, t('sign.l1'), 212, H * 0.3, `500 26px ${SIGN_FONT}`, '#fbf0d8');
    signText(gc, CREATOR.name, 212, H * 0.62, `700 52px ${SIGN_FONT}`, '#ffe08a', 'left', 6);
  });
  // ป้ายกลาง: ชวนติดต่อ (ชี้ซ้าย)
  addBoard(1.45, 0.42, -1, 0.96, 0.16, ['#8a5a30', '#6c4222', '#523018'], (gc, W, H) => {
    signText(gc, t('sign.l3'), W * 0.56, H * 0.5, `700 40px ${SIGN_FONT}`, '#b6ffb0', 'center', 6);
  });
  // ป้ายล่าง: ลิงก์ (ชี้ขวา)
  addBoard(1.55, 0.36, 1, 0.52, -0.08, ['#7a4e2a', '#5e3a1e', '#462a14'], (gc, W, H) => {
    signText(gc, t('sign.l4'), W * 0.08 + 30, H * 0.5, `600 30px ${SIGN_FONT}`, '#fbf0d8');
  });
  const redraw = () => boards.forEach((d) => d());
  redraw();
  const im = new Image();
  im.onload = () => { img = im; redraw(); };
  im.src = CREATOR.avatar;
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
  // เสาไม้ + ฐานหิน
  const woodM = std(0x5a3a20, { roughness: 0.9 });
  g.add(mesh(G.cyl(), woodM, { y: 0.95, s: [0.07, 1.9, 0.07] }));
  g.add(mesh(G.cone(), std(0xd9b45a, { metalness: 0.6, roughness: 0.35 }), { y: 1.98, s: [0.1, 0.16, 0.1] }));
  g.add(mesh(G.cyl(), std(0x3e2614, { roughness: 0.9 }), { y: 0.25, s: [0.085, 0.04, 0.085] }));
  g.add(mesh(G.dode(), std(0x8a8478, { flatShading: true }), { y: 0.06, s: [0.32, 0.12, 0.28] }));
  for (const [x, z] of [[0.22, 0.1], [-0.2, 0.14], [0.05, -0.2]]) g.add(mesh(G.dode(), std(0x7a746a, { flatShading: true }), { x, y: 0.05, z, s: 0.1 }));
  g.userData.link = CREATOR.url;
  g.userData.redraw = redraw;
  g.scale.setScalar(1.3);
  return g;
}

