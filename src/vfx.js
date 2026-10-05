/* ============================================================
 *  เอฟเฟกต์การโจมตีพิเศษของป้อม: แอ่ง/บ่อ, พายุเคลื่อนที่, อุกกาบาต,
 *  จุดปะทุ, ลำแสงชิ่ง, กรวยทราย, คลื่น, น้ำแข็งแตก ฯลฯ
 *  ติดตั้งเป็นเมธอดของ Renderer3D ผ่าน installVfx()
 * ============================================================ */
import * as THREE from 'three';
import { zoneSurface } from './skillMaterials.js';
import { TILE } from './data.js';
import { FLY_HEIGHT, wx, wz, rand, geo } from './gfx.js';

const PI = Math.PI;
function cycloneRibbon(layer) {
  const positions=[],uvs=[],indices=[];
  for(let i=0;i<=80;i++) {
    const t=i/80,angle=t*PI*7+layer*PI*2/3,r=0.06+t*(0.4-layer*0.05);
    for(const side of [-1,1]) {
      const a=angle+side*(0.18+t*0.12);
      positions.push(Math.cos(a)*r,t*(1.5-layer*0.13),Math.sin(a)*r);
      uvs.push(side===-1?0:1,t*2);
    }
    if(i<80){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
const add = (c, k = 1.6) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

/* ---------------- พื้นผิวแอ่งต่าง ๆ (วาดด้วย canvas ครั้งเดียว) ---------------- */
const texCache = {};
export function zoneTexture(kind) {
  if (texCache[kind]) return texCache[kind];
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.scale(S / 128, S / 128);
  const blob = (x, y, r, col) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, col);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, PI * 2); g.fill();
  };
  let rnd = 7;
  const r = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
  // แอ่งรูปทรงอิสระ: ก้อนนุ่มหลายก้อนซ้อนกัน ขอบไม่เป็นวงกลม ไม่มีเส้นขอบ
  const base = (inner, outer) => {
    const lobes = 9;
    for (let i = 0; i < lobes; i++) {
      const a = (i / lobes) * PI * 2 + r() * 0.6, d = 14 + r() * 18;
      blob(64 + Math.cos(a) * d, 64 + Math.sin(a) * d * 0.85, 20 + r() * 14, outer);
    }
    blob(64, 64, 40, inner);
  };
  if (kind === 'lava') {
    base('rgba(255,170,40,1)', 'rgba(200,40,10,0.9)');
    for (let i = 0; i < 18; i++) {
      const a = r() * PI * 2, d = r() * 44;
      blob(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 6 + r() * 10, 'rgba(60,15,8,0.85)');
    }
    for (let i = 0; i < 10; i++) {
      const a = r() * PI * 2, d = r() * 40;
      blob(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 4 + r() * 6, 'rgba(255,240,150,0.9)');
    }
  } else if (kind === 'mud') {
    base('rgba(92,62,34,1)', 'rgba(62,42,24,0.95)');
    for (let i = 0; i < 26; i++) {
      const a = r() * PI * 2, d = r() * 46;
      blob(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 3 + r() * 9, r() < 0.5 ? 'rgba(40,26,14,0.8)' : 'rgba(130,96,56,0.6)');
    }
  } else {
    // abyss / void: แอ่งมืดรูปทรงอิสระ มีจุดประกายสีม่วง
    const dark = kind === 'void';
    base(dark ? 'rgba(12,0,24,1)' : 'rgba(26,8,48,1)', dark ? 'rgba(70,14,120,0.85)' : 'rgba(80,24,130,0.8)');
    for (let i = 0; i < 14; i++) {
      const a = r() * PI * 2, d = r() * 40;
      blob(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 5 + r() * 9, 'rgba(8,0,16,0.8)');
    }
    for (let i = 0; i < 12; i++) {
      const a = r() * PI * 2, d = r() * 42;
      blob(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 2 + r() * 4, dark ? 'rgba(220,160,255,0.9)' : 'rgba(180,110,255,0.85)');
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache[kind] = t;
  return t;
}

function stripeTexture() {
  if (texCache.stripe) return texCache.stripe;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    const gr = g.createLinearGradient(i * 8, 0, i * 8 + 8, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.9)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.save(); g.translate(i * 8, 0); g.transform(1, 0, 0.6, 1, 0, 0); g.fillRect(-20, 0, 8, 64); g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  texCache.stripe = t;
  return t;
}

const ZONE_STYLE = {
  lava: { particle: ['#ff6a1e', '#ffcf4a'], blend: THREE.NormalBlending, glowK: 1.4 },
  mud: { particle: ['#a87a44', '#6a4a2a'], blend: THREE.NormalBlending, glowK: 1 },
  abyss: { particle: ['#9a4dff', '#d6b3ff'], blend: THREE.NormalBlending, glowK: 1.2 },
  void: { particle: ['#b070ff', '#ffffff'], blend: THREE.NormalBlending, glowK: 1.2 },
};

export function installVfx(R) {
  const P = R.prototype;

  P.addShockwave = function (x, y, z, color, radius = 0.65, life = 0.42) {
    const g = new THREE.Group();
    g.position.set(x, y + 0.025, z);
    const rings = [0, 1].map(i => {
      const ring = new THREE.Mesh(geo('impactRing' + i, () => new THREE.RingGeometry(i ? 0.86 : 0.94, 1, 48)), add(color, i ? 1 : 1.7));
      ring.rotation.x = -PI / 2; g.add(ring); return ring;
    });
    this.dynamic.add(g);
    const update = k => rings.forEach((ring, i) => {
      ring.scale.setScalar(radius * (0.15 + (1 - k) * (i ? 0.78 : 1)));
      ring.material.opacity = k * k * (i ? 0.25 : 0.7);
    });
    update(1);
    this.effects.push({ obj: g, life, max: life, update });
  };

  P.vpt = function (x, y, fly, h = 0.35) {
    return new THREE.Vector3(wx(x), (fly ? FLY_HEIGHT : this.groundAt(x, y)) + h, wz(y));
  };

  /* ลำแสงตรงระหว่างสองจุด */
  P.addSegment = function (a, b, colors, width, life, coreCol = 0xffffff, style = 'prism', brightness = 1) {
    const dir = b.clone().sub(a);
    const len = dir.length();
    if (len < 1e-4) return;
    const g = new THREE.Group();
    g.position.copy(a).add(b).multiplyScalar(0.5);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    const cyl = geo('beamCyl', () => new THREE.CylinderGeometry(1, 1, 1, 8, 1, true));
    const parts = colors.map((c, i) => {
      const m = new THREE.Mesh(cyl, add(c, style === 'solar' ? 0.85 : 1.25));
      m.scale.set(0.025 * width * (1 - i * 0.25), len, 0.025 * width * (1 - i * 0.25));
      return m;
    });
    // Refracted strands, a solar helix, eclipse collars, or piercing frost shards.
    if (style === 'solar') {
      const spiral = geo('beamFilament',()=>{
        const points=[];for(let i=0;i<=48;i++){const t=i/48,a=t*PI*8;points.push(new THREE.Vector3(Math.cos(a),t-0.5,Math.sin(a)));}
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),48,0.06,4,false);
      });
      const filament = new THREE.Mesh(spiral,add(colors[0],1.2));
      filament.scale.set(0.065*width,len,0.065*width);parts.push(filament);
    } else if (style === 'sun' || style === 'eclipse') {
      for(let i=0;i<5;i++) {
        const collar=new THREE.Mesh(geo('beamCollar',()=>new THREE.TorusGeometry(1,0.04,5,32)),add(colors[i%colors.length]));
        collar.rotation.x=PI/2;collar.position.y=(i/4-0.5)*len;
        collar.scale.setScalar((style==='sun'?0.09:0.065)*width);parts.push(collar);
      }
    } else if (style === 'arrow' || style === 'frost') {
      for(let i=0;i<7;i++) {
        const shard=new THREE.Mesh(geo('beamShard',()=>new THREE.OctahedronGeometry(1)),add(colors[i%colors.length]));
        shard.position.y=(i/6-0.5)*len;shard.scale.set(0.045*width,style==='frost'?0.18:0.11,0.045*width);parts.push(shard);
      }
    } else {
      for(const side of [-1,1]) {
        const strand=new THREE.Mesh(cyl,add(colors[0],1.1));strand.position.x=side*0.045*width;
        strand.scale.set(0.007*width,len,0.007*width);parts.push(strand);
      }
    }
    const core = new THREE.Mesh(cyl, add(style === 'solar' ? '#ffcb83' : coreCol, 1.2));
    core.scale.set(0.014 * width, len, 0.014 * width);
    parts.push(core);
    parts.forEach(part => part.material.color.multiplyScalar(brightness));
    g.add(...parts);
    this.dynamic.add(g);
    const baseS = parts.map((p) => p.scale.x);
    this.effects.push({
      obj: g, life, max: life,
      update(k) {
        parts.forEach((p, i) => {
          p.material.opacity = k * (i < colors.length ? 0.55 : 0.85);
          p.scale.x = p.scale.z = baseS[i] * (0.4 + 0.6 * k);
        });
      },
    });
  };

  P.addBeam = function (ev) {
    const t = ev.tower;
    const base = this.tileGround(t.c, t.r);
    const v = this.towerViews.get(t.id);
    const a = new THREE.Vector3(wx(ev.x1), base + (v ? v.height * 0.85 : 0.95), wz(ev.y1));
    const b = this.vpt(ev.x2, ev.y2, ev.fly);
    let colors = ev.colors;
    let core = 0xffffff;
    if (ev.style === 'solar') {
      const k = ev.heat || 0;
      colors = [new THREE.Color('#ff7a1e').lerp(new THREE.Color('#fff6c0'), k), '#ffd34a'];
    } else if (ev.style === 'eclipse') {
      colors = ['#8a3dff', '#ffd34a'];
      core = 0x2a0a40;
    } else if (ev.style === 'frost') {
      colors = ['#8fdcff', '#ffffff'];
    }
    this.addSegment(a, b, colors, ev.width, ev.life || 0.22, core, ev.style, t.elements?.includes('light') ? 0.75 : 1);
    this.addShockwave(b.x, b.y - 0.25, b.z, colors[0], ev.style === 'sun' ? 0.65 : 0.3, 0.28);
    const P2 = this.particles;
    const n = ev.style === 'sun' ? 4 : 6;
    for (let i = 0; i < n; i++) {
      const k = Math.random();
      P2.emit(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, a.z + (b.z - a.z) * k, rand(-0.3, 0.3), rand(0.2, 0.8), rand(-0.3, 0.3), ev.style === 'frost' ? '#ffffff' : colors[0], 0.4, 0.12, 0);
    }
    if (ev.style === 'sun') {
      // ลำแสงชาร์จ: วาบที่ป้อมและแสงพุ่งที่เป้า
      P2.burst(b.x, b.y, b.z, '#fff6c0', 18, 2.6, 0.18, -3);
      P2.burst(a.x, a.y, a.z, '#ffe35a', 10, 1.4, 0.16, 0);
      this.addSegment(new THREE.Vector3(b.x, b.y + 6, b.z), b, ['#fff2a0'], ev.width * 0.6, 0.3, 0xffffff, 'sun', 0.75);
    }
  };

  P.addChain = function (ev) {
    const t = ev.tower;
    const v = this.towerViews.get(t.id);
    let prev = new THREE.Vector3(wx(t.x), this.tileGround(t.c, t.r) + (v ? v.height * 0.85 : 0.95), wz(t.y));
    ev.pts.forEach((p, i) => {
      const b = this.vpt(p.x, p.y, p.fly);
      this.addSegment(prev, b, ['#bff4ff', ev.colors[0]], Math.max(0.7, 1.8 - i * 0.3), 0.25, 0xffffff, 'prism', 0.75);
      this.particles.burst(b.x, b.y, b.z, i % 2 ? '#8fdcff' : '#fff6c0', 6, 1.6, 0.12, -3);
      prev = b;
    });
  };

  P.addPulse = function (ev) {
    const t = ev.tower;
    const y = this.tileGround(t.c, t.r);
    this.addShockwave(wx(ev.x), y, wz(ev.y), '#ffe7a2', (ev.r || 110) / TILE, 0.65);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * PI * 2;
      this.particles.emit(wx(ev.x), y + 0.3, wz(ev.y), Math.cos(a) * 4.5, rand(0.2, 0.8), Math.sin(a) * 4.5, '#ffe35a', 0.55, 0.16, 0, y);
    }
  };

  P.addCone = function (ev) {
    const t = ev.tower;
    const y = this.tileGround(t.c, t.r) + 0.1;
    const fan = geo('fan' + ev.spread.toFixed(2), () => new THREE.CircleGeometry(1, 20, -ev.spread, ev.spread * 2));
    const g = new THREE.Group();
    g.position.set(wx(ev.x), y, wz(ev.y));
    g.rotation.y = -ev.angle;
    const m = new THREE.Mesh(fan, add('#e8c27a', 1.1));
    m.rotation.x = -PI / 2;
    m.scale.setScalar(ev.r / TILE);
    g.add(m);
    this.dynamic.add(g);
    this.effects.push({ obj: g, life: 0.3, max: 0.3, update(k) { m.material.opacity = k * 0.55; m.scale.setScalar((ev.r / TILE) * (1.1 - k * 0.3)); } });
    for (let i = 0; i < 22; i++) {
      const a = ev.angle + rand(-ev.spread, ev.spread);
      const sp = rand(2, 4.5);
      this.particles.emit(wx(ev.x), y + 0.2, wz(ev.y), Math.cos(a) * sp, rand(0, 0.5), Math.sin(a) * sp, Math.random() < 0.5 ? '#e8c27a' : '#b08a4a', 0.5, 0.15, -1, y - 0.5);
    }
  };

  P.addGust = function (ev) {
    const y = this.groundAt(ev.x, ev.y);
    this.addShockwave(wx(ev.x), y, wz(ev.y), '#adffe3', 1.2, 0.4);
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * PI * 2;
      this.particles.emit(wx(ev.x) + Math.cos(a) * 0.3, y + rand(0.2, 0.8), wz(ev.y) + Math.sin(a) * 0.3, Math.cos(a) * 5, 0.3, Math.sin(a) * 5, '#b6ffe3', 0.5, 0.12, 0);
    }
  };

  P.addShatter = function (ev) {
    const c = this.vpt(ev.x, ev.y, ev.fly, 0.3);
    this.particles.burst(c.x, c.y, c.z, '#ffffff', 26, 4, 0.18, -6);
    this.particles.burst(c.x, c.y, c.z, '#8fdcff', 20, 3, 0.15, -6);
  };

  P.addEclipse = function (ev) {
    const c = this.vpt(ev.x, ev.y, ev.fly, 0.4);
    this.particles.burst(c.x, c.y, c.z, '#c890ff', 24, 3, 0.18, -2);
    this.particles.burst(c.x, c.y, c.z, '#ffd34a', 10, 2, 0.14, -2);
  };

  P.addSoulSpread = function (ev) {
    const a = this.vpt(ev.x, ev.y, ev.fly, 0.4);
    for (const p of ev.to) this.addSegment(a, this.vpt(p.x, p.y, p.fly, 0.4), ['#ff3aa0', '#8a3dff'], 1.1, 0.35);
  };

  /* ---------------- ซิงก์แอ่ง/พายุ/อุกกาบาต จาก sim ---------------- */
  P.syncZones = function (game, dt) {
    this.zoneViews = this.zoneViews || new Map();
    const seen = new Set();
    for (const z of game.zones) {
      seen.add(z.id);
      let v = this.zoneViews.get(z.id);
      const st = ZONE_STYLE[z.kind];
      if (!v) {
        const g = new THREE.Group();
        const disc = new THREE.Mesh(geo('zoneDisc', () => new THREE.PlaneGeometry(2, 2)),
          zoneSurface(z.kind, zoneTexture(z.kind)));
        disc.rotation.x = -PI / 2;
        g.add(disc);
        if (z.kind === 'void') {
          const core = new THREE.Mesh(geo('voidCore', () => new THREE.SphereGeometry(0.12, 16, 12)), new THREE.MeshBasicMaterial({ color: 0x050008 }));
          core.position.y = 0.45;
          g.add(core);
        }
        disc.renderOrder = 2;
        const R = z.r / TILE;
        g.scale.set(R, 1, R);
        g.position.set(wx(z.x), this.groundAt(z.x, z.y) + 0.035, wz(z.y));
        this.dynamic.add(g);
        v = { g, disc, R };
        this.zoneViews.set(z.id, v);
      }
      const k = Math.min(1, z.t / 0.4, (z.dur - z.t) / 0.25 + 0.2);
      v.disc.material.uniforms.opacity.value = (z.kind === 'mud' ? 0.92 : 0.85) * k;
      v.disc.material.uniforms.time.value = this.time;
      v.disc.rotation.z += dt * (z.kind === 'void' ? 3 : z.kind === 'abyss' ? 1 : 0.15);
      const pos = v.g.position;
      if (Math.random() < dt * (z.kind === 'void' ? 30 : 14) * v.R) {
        const a = Math.random() * PI * 2, d = Math.random() * v.R;
        const col = st.particle[Math.random() < 0.6 ? 0 : 1];
        if (z.kind === 'void') {
          const ex = pos.x + Math.cos(a) * v.R, ez = pos.z + Math.sin(a) * v.R;
          this.particles.emit(ex, pos.y + 0.1, ez, (pos.x - ex) * 2.2, 0.8, (pos.z - ez) * 2.2, col, 0.45, 0.12, 0, pos.y);
        } else {
          this.particles.emit(pos.x + Math.cos(a) * d, pos.y + 0.05, pos.z + Math.sin(a) * d, 0, z.kind === 'mud' ? 0.3 : rand(0.4, 1), 0, col, z.kind === 'abyss' ? 0.9 : 0.6, z.kind === 'mud' ? 0.14 : 0.12, z.kind === 'lava' ? -0.5 : 0.2, pos.y);
        }
      }
    }
    for (const [id, v] of this.zoneViews) {
      if (!seen.has(id)) {
        this.dynamic.remove(v.g);
        v.g.traverse(o => { if (o.material) o.material.dispose(); });
        this.zoneViews.delete(id);
      }
    }
  };

  P.syncMovers = function (game, dt) {
    this.moverViews = this.moverViews || new Map();
    const seen = new Set();
    for (const m of game.movers) {
      seen.add(m.id);
      let v = this.moverViews.get(m.id);
      const lava = m.kind === 'lavastorm';
      if (!v) {
        const g = new THREE.Group();
        const layers = [];
        const cols = lava ? ['#ff3a10', '#ff8a2a', '#ffd27a'] : ['#ff5a1e', '#ffa030', '#ffe08a'];
        cols.forEach((c, i) => {
          const mat = add(c, 1.5);
          mat.map = stripeTexture().clone();
          const cone = new THREE.Mesh(geo('sculptedTwister' + i, () => cycloneRibbon(i)), mat);
          cone.position.y = 0;
          layers.push(cone);
          g.add(cone);
        });
        g.position.set(wx(m.x), this.groundAt(m.x, m.y), wz(m.y));
        this.dynamic.add(g);
        v = { g, layers };
        this.moverViews.set(m.id, v);
      }
      v.g.position.set(wx(m.x), this.groundAt(m.x, m.y), wz(m.y));
      const k = Math.min(1, m.t / 0.4, (m.max - m.t) / 0.3 + 0.1);
      v.layers.forEach((c, i) => {
        c.rotation.y += dt * (9 + i * 4) * (i % 2 ? -1 : 1);
        c.material.opacity = 0.75 * k;
        c.material.map.offset.y -= dt * 0.8;
      });
      v.g.scale.setScalar(0.8 + 0.2 * k + Math.sin(this.time * 8) * 0.03);
      if (Math.random() < dt * 40) {
        const a = Math.random() * PI * 2, h = Math.random() * 1.3;
        const r = 0.15 + h * 0.25;
        this.particles.emit(v.g.position.x + Math.cos(a) * r, v.g.position.y + h, v.g.position.z + Math.sin(a) * r, -Math.sin(a) * 2, rand(0.5, 1.5), Math.cos(a) * 2, lava && Math.random() < 0.3 ? '#ffffff' : Math.random() < 0.5 ? '#ff7a2a' : '#ffcf4a', 0.5, 0.14, 0.5);
      }
    }
    for (const [id, v] of this.moverViews) {
      if (!seen.has(id)) {
        this.dynamic.remove(v.g);
        v.layers.forEach((c) => { c.material.map?.dispose(); c.material.dispose(); });
        this.moverViews.delete(id);
      }
    }
  };

  P.syncDelayed = function (game, dt) {
    this.delayViews = this.delayViews || new Map();
    const seen = new Set();
    for (const d of game.delayed) {
      seen.add(d.id);
      let v = this.delayViews.get(d.id);
      const gy = this.groundAt(d.x, d.y);
      if (!v) {
        const s = d.kind === 'erupt' ? d.tower.stats.erupt.r / TILE : (d.big ? d.tower.stats.meteor.mainR : d.tower.stats.meteor.r) / TILE;
        const warning = new THREE.Mesh(geo('skillWarning', () => new THREE.RingGeometry(0.91, 1, 48)), add('#ffac58', 1.2));
        warning.rotation.x = -PI / 2;
        warning.position.set(wx(d.x), gy + 0.025, wz(d.y));
        warning.scale.setScalar(s);
        this.dynamic.add(warning);
        v = { s, warning };
        if (d.kind === 'meteor') {
          const rock = new THREE.Group();
          rock.add(new THREE.Mesh(geo('meteorRockDetailed', () => { const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position; for(let i=0;i<p.count;i++){ const x=p.getX(i),y=p.getY(i),z=p.getZ(i),s=1+Math.sin(x*21+y*17+z*13)*0.11; p.setXYZ(i,x*s,y*s,z*s); } g.computeVertexNormals(); return g; }), new THREE.MeshStandardMaterial({ color: 0x3a2a20, emissive: 0xff4a10, emissiveIntensity: 0.9, flatShading: true })));
          for(let ring=0;ring<3;ring++) rock.add(new THREE.Mesh(geo('meteorFissure'+ring,()=>new THREE.TorusGeometry(0.94,0.018,5,32,PI*1.5).rotateX(ring*0.85).rotateY(ring*0.7)),add('#ffab53',2)));
          rock.scale.setScalar(d.big ? 0.26 : 0.15);
          this.dynamic.add(rock);
          v.rock = rock;
        }
        this.delayViews.set(d.id, v);
      }
      const k = 1 - Math.max(0, d.t) / d.total;
      v.warning.material.opacity = 0.15 + k * 0.5;
      v.warning.scale.setScalar(v.s * (0.92 + Math.sin(this.time * 9) * 0.04));
      if (v.rock) {
        const h = (1 - k) * 7;
        v.rock.position.set(wx(d.x) - (1 - k) * 2.2, gy + 0.2 + h, wz(d.y) - (1 - k) * 1.2);
        v.rock.rotation.x += dt * 6; v.rock.rotation.z += dt * 4;
        if (Math.random() < dt * 45) this.particles.emit(v.rock.position.x, v.rock.position.y, v.rock.position.z, rand(-0.2, 0.2), 0.3, rand(-0.2, 0.2), Math.random() < 0.5 ? '#ff6a1e' : '#ffcf4a', 0.4, d.big ? 0.24 : 0.16, 0);
      } else if (Math.random() < dt * 20) {
        const a = Math.random() * PI * 2, r = Math.random() * v.s * 0.8;
        this.particles.emit(wx(d.x) + Math.cos(a) * r, gy + 0.05, wz(d.y) + Math.sin(a) * r, 0, rand(0.6, 1.4), 0, Math.random() < 0.5 ? '#ffffff' : '#ff7a2a', 0.6, 0.15, 0.3, gy);
      }
    }
    for (const [id, v] of this.delayViews) {
      if (!seen.has(id)) {
        this.dynamic.remove(v.warning); v.warning.material.dispose();
        if (v.rock) { this.dynamic.remove(v.rock); v.rock.traverse(o=>o.material?.dispose()); }
        this.delayViews.delete(id);
      }
    }
  };

  P.clearVfx = function () {
    for (const m of [this.zoneViews, this.moverViews, this.delayViews]) {
      if (!m) continue;
      for (const v of m.values()) {
        for (const o of [v.g, v.rock, v.warning]) if (o) {
          this.dynamic.remove(o);
          o.traverse(child => { if (child.material) { if (v.layers) child.material.map?.dispose(); child.material.dispose(); } });
        }
      }
      m.clear();
    }
  };
}
