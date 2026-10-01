/* ============================================================
 *  โมเดล 3D ของป้อมและมอนสเตอร์ (สร้างจาก primitive ทั้งหมด)
 *  แกน +X ของโมเดลคือ "ด้านหน้า"
 * ============================================================ */
import * as THREE from 'three';
import { ELEMENTS, BASIC } from './data.js';
import { std, glow, mesh, G, geo, rand } from './gfx.js';
import { brickTexture, runeTexture } from './textures.js';

/* ============================================================
 *  ป้อม
 * ============================================================ */
function towerColors(t) {
  if (t.kind === 'basic') return [BASIC[t.base].color];
  return t.elements.map((e) => ELEMENTS[e].color);
}

// ฐานหินสี่เหลี่ยมพร้อมขอบเรืองแสง
function buildPad(t, group, anims) {
  const cols = towerColors(t);
  const stone = std(0x55576a, { map: brickTexture('stone'), roughness: 0.85 });
  const slab = std(0x6d7084, { roughness: 0.7, flatShading: true });
  group.add(mesh(G.box(), stone, { y: 0.09, s: [0.92, 0.18, 0.92] }));
  group.add(mesh(G.box(), slab, { y: 0.2, s: [0.8, 0.05, 0.8] }));
  // ขอบเรืองแสง แต่ละด้านไล่สีตามธาตุ
  const rimG = G.box();
  const k = t.kind === 'basic' ? 1.4 : 2.6;
  for (let i = 0; i < 4; i++) {
    const c = cols[i % cols.length];
    const a = (i * Math.PI) / 2;
    group.add(mesh(rimG, glow(c, k), { x: Math.cos(a) * 0.44, y: 0.185, z: Math.sin(a) * 0.44, ry: a, s: [0.025, 0.03, 0.86], shadow: false }));
  }
  if (t.kind !== 'basic') {
    const rune = new THREE.Mesh(geo('padRune', () => new THREE.PlaneGeometry(0.72, 0.72)),
      new THREE.MeshBasicMaterial({ map: runeTexture(), color: new THREE.Color(cols[0]).multiplyScalar(0.9), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    rune.rotation.x = -Math.PI / 2;
    rune.position.y = 0.228;
    group.add(rune);
    anims.push((tt) => { rune.rotation.z = tt * 0.4; });
  }
  const gold = std(0xe0b44a, { metalness: 0.85, roughness: 0.25 });
  if (t.tier >= 2) {
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      group.add(mesh(G.box(), gold, { x: Math.cos(a) * 0.6, y: 0.21, z: Math.sin(a) * 0.6, s: [0.1, 0.1, 0.1] }));
    }
  }
  if (t.tier >= 3) {
    const orb = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      orb.add(mesh(G.octa(), glow(cols[i % cols.length], 3), { x: Math.cos(a) * 0.62, y: 0.42, z: Math.sin(a) * 0.62, s: [0.04, 0.08, 0.04], shadow: false }));
    }
    group.add(orb);
    anims.push((tt) => { orb.rotation.y = tt * 0.8; orb.position.y = Math.sin(tt * 2) * 0.03; });
  }
  return 0.225;
}

const HEADS = {
  arrow(h, anims, aim) {
    const wood = std(0x7a5233, { roughness: 0.85 });
    const dark = std(0x4a3220, { roughness: 0.85 });
    for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) {
      h.add(mesh(G.box(), wood, { x, y: 0.28, z, s: [0.07, 0.56, 0.07] }));
    }
    h.add(mesh(G.box(), dark, { y: 0.58, s: [0.6, 0.06, 0.6] }));
    h.add(mesh(G.box(), wood, { y: 0.25, s: [0.5, 0.04, 0.04], ry: Math.PI / 4 }));
    h.add(mesh(G.cone4(), std(0xa8442a, { roughness: 0.7, flatShading: true }), { y: 1.05, ry: Math.PI / 4, s: [0.5, 0.32, 0.5] }));
    for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) {
      h.add(mesh(G.box(), wood, { x, y: 0.75, z, s: [0.05, 0.32, 0.05] }));
    }
    aim.position.y = 0.68;
    aim.add(mesh(G.box(), dark, { s: [0.38, 0.05, 0.06] }));
    aim.add(mesh(geo('bow', () => new THREE.TorusGeometry(0.17, 0.018, 6, 16, Math.PI)), wood, { x: 0.14, rz: -Math.PI / 2, ry: Math.PI / 2 }));
    aim.add(mesh(G.box(), std(0xd8d8d8, { metalness: 0.6 }), { x: 0.1, y: 0.03, s: [0.32, 0.012, 0.012] }));
  },
  cannon(h, anims, aim) {
    h.add(mesh(G.cyl(), std(0x7c7f88, { roughness: 0.8, flatShading: true, map: brickTexture('stone') }), { y: 0.16, s: [0.34, 0.32, 0.34] }));
    h.add(mesh(G.torus(), std(0xe0b44a, { metalness: 0.8, roughness: 0.3 }), { y: 0.32, rx: Math.PI / 2, s: 0.34 }));
    aim.position.y = 0.42;
    const bronze = std(0x8a6a3a, { metalness: 0.75, roughness: 0.35 });
    aim.add(mesh(G.sph(), std(0x2a2a30, { metalness: 0.6, roughness: 0.4 }), { s: 0.16 }));
    aim.add(mesh(G.cyl(), std(0x2a2a30, { metalness: 0.6, roughness: 0.4 }), { x: 0.2, y: 0.05, rz: -Math.PI / 2 + 0.2, s: [0.09, 0.42, 0.09] }));
    aim.add(mesh(G.torus(), bronze, { x: 0.36, y: 0.085, ry: Math.PI / 2, rx: 0.2, s: 0.1 }));
    aim.add(mesh(G.torus(), bronze, { x: 0.12, y: 0.035, ry: Math.PI / 2, rx: 0.2, s: 0.11 }));
  },
  fire(h, anims) {
    h.add(mesh(G.cyl(), std(0x6a6c7a, { flatShading: true, roughness: 0.8 }), { y: 0.18, s: [0.14, 0.36, 0.14] }));
    const gold = std(0xe6b13e, { metalness: 0.9, roughness: 0.22 });
    h.add(mesh(geo('bowl', () => new THREE.CylinderGeometry(0.3, 0.14, 0.16, 14)), gold, { y: 0.42 }));
    h.add(mesh(G.torus(), gold, { y: 0.5, rx: Math.PI / 2, s: 0.3 }));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      h.add(mesh(G.cone(), gold, { x: Math.cos(a) * 0.27, y: 0.6, z: Math.sin(a) * 0.27, s: [0.035, 0.18, 0.035] }));
    }
    const core = mesh(G.sph(), glow(0xffa030, 3.2), { y: 0.68, s: 0.17, shadow: false });
    h.add(core);
    const flames = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const f = mesh(G.cone(), glow(i % 2 ? 0xff5a1e : 0xffc24a, 3), { x: Math.cos(a) * 0.1, y: 0.75, z: Math.sin(a) * 0.1, s: [0.08, 0.32, 0.08], shadow: false });
      h.add(f);
      flames.push(f);
    }
    const top = mesh(G.cone(), glow(0xffe08a, 3.5), { y: 0.86, s: [0.09, 0.4, 0.09], shadow: false });
    h.add(top);
    anims.push((t) => {
      core.scale.setScalar(0.17 + Math.sin(t * 9) * 0.015);
      flames.forEach((f, i) => { f.scale.y = 0.3 + Math.sin(t * 12 + i * 1.7) * 0.08; });
      top.scale.y = 0.4 + Math.sin(t * 15) * 0.08;
      top.rotation.y = t * 3;
    });
  },
  water(h, anims) {
    const stone = std(0x7d8495, { flatShading: true, roughness: 0.75 });
    h.add(mesh(geo('basin', () => new THREE.CylinderGeometry(0.34, 0.26, 0.2, 12)), stone, { y: 0.1 }));
    h.add(mesh(geo('basinTop', () => new THREE.CylinderGeometry(0.3, 0.3, 0.02, 24)), std(0x3aa0ff, { roughness: 0.05, metalness: 0.2, emissive: 0x0a4aaa, emissiveIntensity: 0.6 }), { y: 0.205 }));
    h.add(mesh(G.cyl(), stone, { y: 0.35, s: [0.06, 0.3, 0.06] }));
    const orb = mesh(G.sph(), std(0x52b8ff, { roughness: 0.04, metalness: 0.1, emissive: 0x1a6aff, emissiveIntensity: 0.9, transparent: true, opacity: 0.85 }), { y: 0.72, s: 0.2 });
    h.add(orb);
    const rings = [0, 1].map((i) => {
      const r = mesh(G.torus(), glow(0x8fdcff, 2.5), { y: 0.72, s: 0.3 + i * 0.05, shadow: false });
      h.add(r);
      return r;
    });
    const drops = [];
    for (let i = 0; i < 3; i++) {
      const d = mesh(G.sphLo(), glow(0xbfeaff, 2.2), { s: 0.035, shadow: false });
      h.add(d);
      drops.push(d);
    }
    anims.push((t) => {
      const y = 0.72 + Math.sin(t * 2.4) * 0.04;
      orb.position.y = y;
      rings[0].position.y = y; rings[1].position.y = y;
      rings[0].rotation.set(t * 1.5, t * 0.8, 0);
      rings[1].rotation.set(-t * 0.9, 0, t * 1.3);
      drops.forEach((d, i) => {
        const a = t * 2 + (i / 3) * Math.PI * 2;
        d.position.set(Math.cos(a) * 0.26, y + Math.sin(t * 3 + i) * 0.08, Math.sin(a) * 0.26);
      });
    });
  },
  earth(h, anims) {
    h.add(mesh(G.dode(), std(0x8a7350, { flatShading: true, roughness: 0.95 }), { y: 0.16, s: [0.26, 0.2, 0.26] }));
    const shards = std(0x9ccf4a, { flatShading: true, roughness: 0.3, metalness: 0.2, emissive: 0x4a7a10, emissiveIntensity: 0.5 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const tilt = 0.45 + (i % 2) * 0.15;
      const len = 0.28 + (i % 3) * 0.06;
      const m = mesh(G.octa(), shards, { s: [0.07, len, 0.07] });
      m.position.set(Math.cos(a) * 0.12, 0.3 + len * 0.5, Math.sin(a) * 0.12);
      m.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
      h.add(m);
    }
    h.add(mesh(G.octa(), std(0xc6f06a, { flatShading: true, roughness: 0.25, emissive: 0x6aaa20, emissiveIntensity: 0.8 }), { y: 0.62, s: [0.09, 0.32, 0.09] }));
    const orbit = new THREE.Group();
    orbit.position.y = 0.5;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      orbit.add(mesh(G.dode(), std(0xa58457, { flatShading: true }), { x: Math.cos(a) * 0.36, z: Math.sin(a) * 0.36, s: 0.07 }));
    }
    h.add(orbit);
    anims.push((t) => { orbit.rotation.y = t * 1.2; orbit.position.y = 0.5 + Math.sin(t * 2) * 0.04; });
  },
  wind(h, anims, aim) {
    h.add(mesh(geo('windMast', () => new THREE.CylinderGeometry(0.06, 0.12, 0.7, 8)), std(0xe8f4ee, { roughness: 0.4 }), { y: 0.35 }));
    h.add(mesh(G.torus(), std(0xe0b44a, { metalness: 0.8, roughness: 0.3 }), { y: 0.12, rx: Math.PI / 2, s: 0.12 }));
    aim.position.y = 0.72;
    aim.add(mesh(G.sph(), glow(0x5fffc0, 2.6), { x: 0.08, s: 0.07, shadow: false }));
    const rotor = new THREE.Group();
    rotor.position.x = 0.1;
    const blade = std(0xbff5e0, { roughness: 0.35 });
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group();
      arm.rotation.x = (i / 4) * Math.PI * 2;
      arm.add(mesh(G.box(), blade, { y: 0.19, ry: 0.35, s: [0.02, 0.36, 0.1] }));
      rotor.add(arm);
    }
    aim.add(rotor);
    const swirl = new THREE.Group();
    const sg = geo('swirl', () => new THREE.TorusGeometry(0.28, 0.012, 6, 32, Math.PI * 1.3));
    swirl.add(mesh(sg, glow(0x7affd0, 2.5), { y: 0.15, rx: Math.PI / 2, shadow: false }));
    swirl.add(mesh(sg, glow(0x7affd0, 2.5), { y: 0.4, rx: Math.PI / 2, rz: 2, s: 0.75, shadow: false }));
    h.add(swirl);
    anims.push((t, dt, boost) => {
      rotor.rotation.x += dt * (7 + boost * 25);
      swirl.rotation.y = -t * 3;
    });
  },
  light(h, anims) {
    const gold = std(0xe6b13e, { metalness: 0.9, roughness: 0.22 });
    h.add(mesh(geo('lightBase', () => new THREE.CylinderGeometry(0.2, 0.26, 0.14, 8)), std(0xe9e4d6, { roughness: 0.4 }), { y: 0.07 }));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const claw = mesh(G.cone4(), gold, { s: [0.04, 0.3, 0.04] });
      claw.position.set(Math.cos(a) * 0.17, 0.27, Math.sin(a) * 0.17);
      claw.rotation.set(Math.sin(a) * -0.4, 0, Math.cos(a) * 0.4);
      h.add(claw);
    }
    const crystal = mesh(G.octa(), std(0xfff4b0, { flatShading: true, roughness: 0.1, metalness: 0.1, emissive: 0xffd84a, emissiveIntensity: 1.1, transparent: true, opacity: 0.92 }), { y: 0.72, s: [0.17, 0.36, 0.17] });
    h.add(crystal);
    const inner = mesh(G.octa(), glow(0xffffff, 2.4), { y: 0.72, s: [0.07, 0.16, 0.07], shadow: false });
    h.add(inner);
    const halo = mesh(G.torus(), glow(0xfff2a0, 2.8), { y: 0.72, rx: Math.PI / 2, s: 0.27, shadow: false });
    h.add(halo);
    anims.push((t) => {
      const y = 0.72 + Math.sin(t * 2) * 0.05;
      crystal.position.y = y; inner.position.y = y; halo.position.y = y;
      crystal.rotation.y = t * 0.9;
      halo.scale.setScalar(0.27 + Math.sin(t * 3) * 0.02);
    });
  },
  dark(h, anims) {
    const iron = std(0x24222c, { metalness: 0.6, roughness: 0.45 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      h.add(mesh(G.cyl(), iron, { x: Math.cos(a) * 0.18, y: 0.1, z: Math.sin(a) * 0.18, s: [0.03, 0.2, 0.03] }));
    }
    h.add(mesh(geo('cauldron', () => new THREE.SphereGeometry(0.28, 16, 10, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65)), iron, { y: 0.4 }));
    h.add(mesh(G.torus(), iron, { y: 0.52, rx: Math.PI / 2, s: 0.235 }));
    h.add(mesh(geo('brew', () => new THREE.CircleGeometry(0.22, 20)), glow(0xa84dff, 2.2), { y: 0.5, rx: -Math.PI / 2, shadow: false }));
    const bubbles = [];
    for (let i = 0; i < 4; i++) {
      const b = mesh(G.sphLo(), glow(0xd09aff, 2.4), { s: 0.035, shadow: false });
      h.add(b);
      bubbles.push({ b, off: i / 4 });
    }
    const orb = mesh(G.sph(), std(0x120820, { emissive: 0x8a3dff, emissiveIntensity: 1.5, roughness: 0.2 }), { y: 0.88, s: 0.12 });
    h.add(orb);
    const r1 = mesh(G.torus(), glow(0xb070ff, 2.4), { y: 0.88, s: 0.22, shadow: false });
    const r2 = mesh(G.torus(), glow(0x7a3dff, 2.4), { y: 0.88, s: 0.18, shadow: false });
    h.add(r1, r2);
    anims.push((t) => {
      const y = 0.88 + Math.sin(t * 2) * 0.04;
      orb.position.y = y; r1.position.y = y; r2.position.y = y;
      r1.rotation.set(t * 1.3, t * 0.7, 0);
      r2.rotation.set(-t * 0.9, 0, t * 1.6);
      bubbles.forEach(({ b, off }) => {
        const k = (t * 0.6 + off) % 1;
        b.position.set(Math.cos(off * 9) * 0.12, 0.5 + k * 0.3, Math.sin(off * 9) * 0.12);
        b.scale.setScalar(0.035 * (1 - k));
      });
    });
  },
};

export function buildTowerModel(t) {
  const group = new THREE.Group();
  const anims = [];
  const top = buildPad(t, group, anims);
  const head = new THREE.Group();
  head.position.y = top;
  group.add(head);
  const aim = new THREE.Group();
  head.add(aim);
  const style = t.kind === 'basic' ? t.base : t.elements[0];
  HEADS[style](head, anims, aim);
  const n = t.kind === 'basic' ? 0 : t.elements.length;
  if (n >= 2) {
    // ป้อมหลายธาตุ: ผลึกธาตุอื่นโคจรรอบ + วงแหวน
    const others = t.elements.slice(1);
    const orbit = new THREE.Group();
    orbit.position.y = top + 0.55;
    const per = others.length * 2;
    for (let i = 0; i < per; i++) {
      const c = ELEMENTS[others[i % others.length]].color;
      const a = (i / per) * Math.PI * 2;
      orbit.add(mesh(G.octa(), glow(c, 3.2), { x: Math.cos(a) * 0.42, z: Math.sin(a) * 0.42, s: [0.05, 0.1, 0.05], shadow: false }));
    }
    group.add(orbit);
    others.forEach((e, i) => {
      group.add(mesh(G.torus(), glow(ELEMENTS[e].color, 2.4), { y: 0.26 + i * 0.05, rx: Math.PI / 2, s: 0.5 + i * 0.05, shadow: false }));
    });
    if (n === 3) {
      const crown = new THREE.Group();
      crown.position.y = top + 1.05;
      const gold = std(0xe6b13e, { metalness: 0.9, roughness: 0.22 });
      crown.add(mesh(G.torus(), gold, { rx: Math.PI / 2, s: 0.16 }));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        crown.add(mesh(G.cone(), gold, { x: Math.cos(a) * 0.16, y: 0.05, z: Math.sin(a) * 0.16, s: [0.025, 0.1, 0.025] }));
      }
      group.add(crown);
      anims.push((tt) => { crown.rotation.y = tt; crown.position.y = top + 1.05 + Math.sin(tt * 2) * 0.04; });
    }
    anims.push((tt) => { orbit.rotation.y = tt * 1.8; orbit.position.y = top + 0.55 + Math.sin(tt * 2.5) * 0.05; });
    head.scale.setScalar(1 + (n - 1) * 0.08);
  }
  return { group, head, aim, anims };
}

/* ============================================================
 *  มอนสเตอร์
 * ============================================================ */
function creatureMats(e) {
  const el = ELEMENTS[e.element];
  const bone = e.ability === 'undead';
  const body = new THREE.MeshStandardMaterial({
    color: bone ? 0xe6dfcf : new THREE.Color(el.color).lerp(new THREE.Color(0xffffff), 0.08),
    emissive: new THREE.Color(el.color), emissiveIntensity: bone ? 0.08 : 0.15,
    roughness: 0.3, metalness: 0.3, flatShading: true,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: bone ? 0x9a9284 : new THREE.Color(el.color).multiplyScalar(0.45),
    roughness: 0.5, metalness: 0.2, flatShading: true,
  });
  return { body, dark, glowM: glow(el.glow, 3.2), eye: glow(bone ? el.color : 0xffffff, 3.5), mats: [body, dark] };
}

function legGroup(parent, x, y, z, len, thick, m) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.add(mesh(G.cyl(), m, { y: -len / 2, s: [thick, len, thick] }));
  g.add(mesh(G.box(), m, { y: -len, x: 0.02, s: [thick * 2.6, thick * 1.4, thick * 2.4] }));
  parent.add(g);
  return g;
}

function wolf(e, M) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  body.add(mesh(G.sph(), M.body, { y: 0.34, s: [0.3, 0.15, 0.14] }));
  body.add(mesh(G.sph(), M.body, { x: 0.17, y: 0.37, s: [0.17, 0.16, 0.15] }));
  const head = new THREE.Group();
  head.position.set(0.32, 0.45, 0);
  head.add(mesh(G.box(), M.body, { s: [0.17, 0.13, 0.13] }));
  head.add(mesh(G.box(), M.body, { x: 0.12, y: -0.025, s: [0.13, 0.07, 0.085] }));
  head.add(mesh(G.box(), M.dark, { x: 0.18, y: -0.01, s: [0.03, 0.03, 0.04] }));
  for (const z of [-0.045, 0.045]) {
    head.add(mesh(G.cone4(), M.dark, { x: -0.03, y: 0.1, z, s: [0.035, 0.1, 0.035] }));
    head.add(mesh(G.sphLo(), M.eye, { x: 0.075, y: 0.025, z: z * 1.2, s: 0.018, shadow: false }));
  }
  body.add(head);
  const legs = [
    legGroup(body, 0.17, 0.3, 0.08, 0.28, 0.03, M.dark),
    legGroup(body, 0.17, 0.3, -0.08, 0.28, 0.03, M.dark),
    legGroup(body, -0.17, 0.3, 0.08, 0.28, 0.035, M.dark),
    legGroup(body, -0.17, 0.3, -0.08, 0.28, 0.035, M.dark),
  ];
  const tail = new THREE.Group();
  tail.position.set(-0.28, 0.38, 0);
  tail.add(mesh(G.cone(), M.body, { x: -0.13, rz: Math.PI / 2 + 0.5, s: [0.05, 0.28, 0.05] }));
  body.add(tail);
  for (let i = 0; i < 4; i++) {
    body.add(mesh(G.cone4(), M.glowM, { x: 0.15 - i * 0.1, y: 0.5 - Math.abs(i - 1) * 0.01, s: [0.025, 0.09 - i * 0.012, 0.025], shadow: false }));
  }
  let phase = Math.random() * 6;
  const fast = e.ability === 'fast';
  if (fast) body.scale.set(1.1, 0.88, 0.9);
  return {
    root, height: 0.62,
    anim(dt, t, moving) {
      phase += dt * (fast ? 16 : 11) * moving;
      const s = Math.sin(phase) * 0.65 * moving;
      legs[0].rotation.z = s; legs[3].rotation.z = s;
      legs[1].rotation.z = -s; legs[2].rotation.z = -s;
      body.position.y = Math.abs(Math.cos(phase)) * 0.025 * moving;
      tail.rotation.y = Math.sin(t * 6) * 0.4;
      head.rotation.z = Math.sin(phase) * 0.05;
    },
  };
}

function golem(e, M) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  body.add(mesh(G.box(), M.body, { y: 0.5, s: [0.3, 0.34, 0.36] }));
  body.add(mesh(G.box(), M.dark, { y: 0.32, s: [0.26, 0.08, 0.3] }));
  body.add(mesh(G.box(), M.body, { x: 0.06, y: 0.74, s: [0.16, 0.14, 0.16] }));
  for (const z of [-0.04, 0.04]) body.add(mesh(G.box(), M.eye, { x: 0.145, y: 0.76, z, s: [0.01, 0.025, 0.03], shadow: false }));
  body.add(mesh(G.octa(), M.glowM, { x: 0.155, y: 0.52, s: [0.02, 0.07, 0.06], shadow: false }));
  for (const z of [-1, 1]) body.add(mesh(G.octa(), M.glowM, { x: -0.04, y: 0.72, z: z * 0.2, s: [0.04, 0.1, 0.04], rx: z * 0.4, shadow: false }));
  const arms = [-1, 1].map((z) => {
    const g = new THREE.Group();
    g.position.set(0, 0.62, z * 0.24);
    g.add(mesh(G.box(), M.body, { y: -0.17, s: [0.12, 0.34, 0.12] }));
    g.add(mesh(G.box(), M.dark, { y: -0.36, s: [0.15, 0.12, 0.15] }));
    body.add(g);
    return g;
  });
  const legs = [-1, 1].map((z) => {
    const g = new THREE.Group();
    g.position.set(0, 0.33, z * 0.1);
    g.add(mesh(G.box(), M.dark, { y: -0.15, s: [0.13, 0.3, 0.13] }));
    body.add(g);
    return g;
  });
  let phase = Math.random() * 6;
  return {
    root, height: 0.85,
    anim(dt, t, moving) {
      phase += dt * 6 * moving;
      const s = Math.sin(phase) * 0.45 * moving;
      legs[0].rotation.z = s; legs[1].rotation.z = -s;
      arms[0].rotation.z = -s * 0.8; arms[1].rotation.z = s * 0.8;
      body.position.y = Math.abs(Math.sin(phase)) * 0.03 * moving;
      body.rotation.x = Math.sin(phase) * 0.04 * moving;
    },
  };
}

function slime(e, M) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const jelly = new THREE.MeshStandardMaterial({
    color: M.body.color.clone(), emissive: M.body.emissive.clone(), emissiveIntensity: 0.35,
    roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.82,
  });
  M.mats.push(jelly);
  M.body = jelly;
  const blob = mesh(G.sph(), jelly, { y: 0.22, s: [0.26, 0.22, 0.26] });
  body.add(blob);
  body.add(mesh(G.octa(), M.glowM, { y: 0.22, s: 0.07, shadow: false }));
  for (const z of [-0.08, 0.08]) {
    body.add(mesh(G.sphLo(), glow(0xffffff, 2), { x: 0.2, y: 0.3, z, s: 0.04, shadow: false }));
    body.add(mesh(G.sphLo(), std(0x111111), { x: 0.235, y: 0.3, z, s: 0.022, shadow: false }));
  }
  let phase = Math.random() * 6;
  return {
    root, height: 0.5,
    anim(dt, t, moving) {
      phase += dt * 7 * Math.max(0.3, moving);
      const k = Math.sin(phase);
      body.scale.set(1 + k * 0.1, 1 - k * 0.14, 1 + k * 0.1);
      body.position.y = Math.max(0, k) * 0.06 * moving;
    },
  };
}

function wingGeometry() {
  return geo('wing', () => {
    const g = new THREE.BufferGeometry();
    const v = [
      0, 0, 0, 0.18, 0, 0.12, -0.05, 0, 0.55,
      0, 0, 0, -0.05, 0, 0.55, -0.22, 0, 0.42,
      0, 0, 0, -0.22, 0, 0.42, -0.3, 0, 0.12,
    ];
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.computeVertexNormals();
    return g;
  });
}

function drake(e, M, boss = false) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const wingM = new THREE.MeshStandardMaterial({ color: M.dark.color.clone().lerp(new THREE.Color(ELEMENTS[e.element].color), 0.4), roughness: 0.6, side: THREE.DoubleSide, emissive: new THREE.Color(ELEMENTS[e.element].color), emissiveIntensity: 0.15 });
  M.mats.push(wingM);
  body.add(mesh(G.sph(), M.body, { y: 0.4, s: [0.3, 0.15, 0.15] }));
  body.add(mesh(G.cone(), M.body, { x: 0.3, y: 0.48, rz: -Math.PI / 2 - 0.5, s: [0.08, 0.26, 0.08] }));
  const head = new THREE.Group();
  head.position.set(0.44, 0.58, 0);
  head.add(mesh(G.box(), M.body, { s: [0.16, 0.1, 0.11] }));
  head.add(mesh(G.box(), M.body, { x: 0.1, y: -0.02, s: [0.1, 0.06, 0.08] }));
  for (const z of [-0.04, 0.04]) {
    head.add(mesh(G.cone4(), M.dark, { x: -0.07, y: 0.07, z, rz: Math.PI / 2 + 0.9, s: [0.025, 0.14, 0.025] }));
    head.add(mesh(G.sphLo(), M.eye, { x: 0.06, y: 0.02, z: z * 1.3, s: 0.017, shadow: false }));
  }
  body.add(head);
  const tail = new THREE.Group();
  tail.position.set(-0.27, 0.4, 0);
  tail.add(mesh(G.cone(), M.body, { x: -0.2, rz: Math.PI / 2, s: [0.07, 0.42, 0.07] }));
  tail.add(mesh(G.cone4(), M.glowM, { x: -0.43, rz: Math.PI / 2, s: [0.05, 0.08, 0.05], shadow: false }));
  body.add(tail);
  for (let i = 0; i < 4; i++) body.add(mesh(G.cone4(), M.glowM, { x: 0.15 - i * 0.11, y: 0.55, s: [0.022, 0.08, 0.022], shadow: false }));
  const wings = [-1, 1].map((side) => {
    const g = new THREE.Group();
    g.position.set(0.05, 0.47, side * 0.08);
    const w = mesh(wingGeometry(), wingM, { s: [1.3, 1, side * 1.3] });
    g.add(w);
    g.add(mesh(G.cyl(), M.dark, { x: -0.02, z: side * 0.28, rx: Math.PI / 2, s: [0.012, 0.56, 0.012] }));
    body.add(g);
    return { g, side };
  });
  let legs = [];
  if (boss) {
    legs = [
      legGroup(body, 0.15, 0.36, 0.1, 0.3, 0.04, M.dark),
      legGroup(body, 0.15, 0.36, -0.1, 0.3, 0.04, M.dark),
      legGroup(body, -0.15, 0.36, 0.1, 0.3, 0.045, M.dark),
      legGroup(body, -0.15, 0.36, -0.1, 0.3, 0.045, M.dark),
    ];
    for (const z of [-0.05, 0.05]) head.add(mesh(G.cone(), std(0xf0ead8, { roughness: 0.4 }), { x: -0.05, y: 0.1, z, rz: Math.PI / 2 + 1.1, s: [0.03, 0.2, 0.03] }));
  }
  let phase = Math.random() * 6;
  return {
    root, height: boss ? 0.75 : 0.65,
    anim(dt, t, moving) {
      phase += dt * (boss ? 7 : 1) * Math.max(0.3, moving);
      const flap = boss ? Math.sin(t * 2.5) * 0.35 + 0.25 : Math.sin(t * 11) * 0.7;
      wings.forEach(({ g, side }) => { g.rotation.x = side * flap; });
      tail.rotation.y = Math.sin(t * 3) * 0.3;
      if (boss) {
        const s = Math.sin(phase) * 0.5 * moving;
        legs[0].rotation.z = s; legs[3].rotation.z = s;
        legs[1].rotation.z = -s; legs[2].rotation.z = -s;
        head.rotation.z = Math.sin(t * 1.5) * 0.08;
      } else {
        body.position.y = Math.sin(t * 3) * 0.05;
      }
    },
  };
}

export function buildCreatureModel(e) {
  const M = creatureMats(e);
  let m;
  switch (e.model) {
    case 'golem': m = golem(e, M); break;
    case 'slime': m = slime(e, M); break;
    case 'drake': m = drake(e, M); break;
    case 'dragon': m = drake(e, M, true); break;
    default: m = wolf(e, M);
  }
  const scale = (e.size / 12) * (e.model === 'dragon' ? 1.05 : 1.1);
  const group = new THREE.Group();
  m.root.scale.setScalar(scale);
  group.add(m.root);
  if (e.ability === 'boss') {
    const aura = mesh(G.torus(), glow(ELEMENTS[e.element].color, 3), { rx: Math.PI / 2, y: 0.08, s: scale * 0.55, shadow: false });
    group.add(aura);
    const prev = m.anim;
    m.anim = (dt, t, mv) => { prev(dt, t, mv); aura.rotation.z = t; aura.scale.setScalar(scale * (0.55 + Math.sin(t * 3) * 0.03)); };
  }
  return { group, anim: m.anim, mats: M.mats, body: M.body, height: m.height * scale, scale };
}
