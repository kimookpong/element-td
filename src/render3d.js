/* ============================================================
 *  Element TD — ตัวเรนเดอร์ 3D (Three.js)
 *  1 หน่วย = 1 ช่องตาราง, กระดานอยู่บนระนาบ XZ
 * ============================================================ */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { TILE, COLS, ROWS, ELEMENTS, BASIC, MAPS } from './data.js';
import { parseMap, tileCenter } from './sim.js';
import { FLOOR, FLY_HEIGHT, wx, wz, tileX, tileZ, rand, glow, mesh, G, geo, std } from './gfx.js';
import { buildWorld } from './world.js';
import { buildTowerModel } from './models.js';
import { buildCreatureModel } from './creatures.js';
import { withIcons } from './icons.js';
import { installVfx } from './vfx.js';
import { TOWERS } from './towers.js';

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
    this.floorY = new Float32Array(max);
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
          gl_FragColor = vec4(vColor * 1.5, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, this.material);
    this.points.frustumCulled = false;
    this.tmp = new THREE.Color();
  }

  emit(x, y, z, vx, vy, vz, color, life, size, grav = -4, floorY = FLOOR) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.tmp.set(color);
    this.col[i * 3] = this.tmp.r; this.col[i * 3 + 1] = this.tmp.g; this.col[i * 3 + 2] = this.tmp.b;
    this.life[i] = life; this.maxLife[i] = life;
    this.baseSize[i] = size; this.size[i] = size;
    this.grav[i] = grav;
    this.floorY[i] = floorY;
    this.alpha[i] = 1;
  }

  burst(x, y, z, color, n, spd, size = 0.16, grav = -5, floorY = FLOOR) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const up = Math.random();
      const v = rand(spd * 0.3, spd);
      const h = Math.sqrt(1 - up * up);
      this.emit(x, y, z, Math.cos(a) * v * h, up * v + 0.5, Math.sin(a) * v * h, color, rand(0.35, 0.8), size * rand(0.6, 1.3), grav, floorY);
    }
  }

  clear() { this.life.fill(0); this.alpha.fill(0); }

  update(dt) {
    const drag = Math.pow(0.2, dt);
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
      this.vel[i * 3 + 1] += this.grav[i] * dt;
      this.vel[i * 3] *= drag; this.vel[i * 3 + 2] *= drag;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] = Math.max(this.floorY[i] + 0.02, this.pos[i * 3 + 1] + this.vel[i * 3 + 1] * dt);
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
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);
    this.renderer = renderer;
    this.canvas = renderer.domElement;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.worldGroup = new THREE.Group();
    this.dynamic = new THREE.Group();
    this.root.add(this.worldGroup, this.dynamic);

    this.hemi = new THREE.HemisphereLight(0xdfefff, 0x3a2a1a, 1);
    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.position.set(-8, 16, 9);
    this.sun.castShadow = true;
    const sc = this.sun.shadow.camera;
    sc.left = -15; sc.right = 15; sc.top = 11; sc.bottom = -11; sc.near = 1; sc.far = 45;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.025;
    this.scene.add(this.hemi, this.sun, this.sun.target);

    const controls = new OrbitControls(this.camera, this.canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.screenSpacePanning = false; // เลื่อนขนานพื้น
    controls.minDistance = 6;
    controls.maxDistance = 40;
    controls.minPolarAngle = 0.15;
    controls.maxPolarAngle = 1.2;
    // คลิกซ้ายค้างลาก = เลื่อนกระดาน · คลิกขวาลาก = หมุน · มือถือ: นิ้วเดียวลาก = เลื่อน, สองนิ้ว = หมุน/ซูม
    controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    controls.autoRotateSpeed = 0.5;
    this.controls = controls;

    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.5, 0.45, 0.92);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.particles = new Particles(3500);
    this.root.add(this.particles.points);

    this.towerViews = new Map();
    this.creepViews = new Map();
    this.projViews = new Map();
    this.effects = [];
    this.floaters = [];
    this.time = 0;
    this.shake = 0;
    this.raycaster = new THREE.Raycaster();
    this.tmpV = new THREE.Vector3();

    this.buildHelpers();
    this.applyQuality();
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
  }

  /* ---------- ความสูงของพื้น ---------- */
  groundAt(x, y) {
    if (!this.map) return 0;
    const c = Math.floor(x / TILE), r = Math.floor(y / TILE);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return FLOOR;
    return this.map.walk[r * COLS + c] ? FLOOR : 0;
  }
  tileGround(c, r) { return this.map && this.map.walk[r * COLS + c] ? FLOOR : 0; }

  /* ---------- ตัวช่วยแสดงผล ---------- */
  buildHelpers() {
    const h = new THREE.Group();
    this.dynamic.add(h);
    this.helpers = h;
    this.range = new THREE.Group();
    this.rangeFill = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, depthWrite: false }));
    this.rangeEdge = new THREE.Mesh(new THREE.RingGeometry(0.975, 1, 96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false }));
    this.range.add(this.rangeFill, this.rangeEdge);
    this.range.rotation.x = -Math.PI / 2;
    this.range.visible = false;
    this.range.renderOrder = 2;
    h.add(this.range);

    this.hoverTile = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }));
    this.hoverTile.rotation.x = -Math.PI / 2;
    this.hoverTile.visible = false;
    h.add(this.hoverTile);

    this.selRing = new THREE.Mesh(new THREE.RingGeometry(0.56, 0.64, 4, 1, Math.PI / 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe680).multiplyScalar(2), transparent: true, opacity: 0.95, depthWrite: false }));
    this.selRing.rotation.x = -Math.PI / 2;
    this.selRing.visible = false;
    h.add(this.selRing);

    // ลูกศรแสดงเส้นทางของมอนสเตอร์
    const shape = new THREE.Shape();
    shape.moveTo(0.14, 0); shape.lineTo(-0.08, 0.12); shape.lineTo(-0.02, 0); shape.lineTo(-0.08, -0.12); shape.closePath();
    const chevG = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2);
    this.chevMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9fe6ff).multiplyScalar(1.4), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
    this.chevrons = new THREE.InstancedMesh(chevG, this.chevMat, 400);
    this.chevrons.count = 0;
    this.chevrons.frustumCulled = false;
    h.add(this.chevrons);
    this.routePts = null;
    this.routeVersion = -1;

    this.ghosts = {};
  }

  getGhost(type) {
    if (!this.ghosts[type]) {
      const basic = !!BASIC[type];
      const { group } = buildTowerModel({ kind: basic ? 'basic' : 'element', base: basic ? type : null, elements: basic ? [] : [type], tier: 1 });
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
      this.helpers.add(group);
      this.ghosts[type] = group;
    }
    return this.ghosts[type];
  }

  /* ---------- คุณภาพ ---------- */
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

  // พื้นที่ที่ถูก UI บังอยู่ (px) — กล้องจะจัดกระดานให้อยู่กลางส่วนที่มองเห็น
  setInsets(ins) {
    const prev = this.insets || {};
    this.insets = { top: 0, right: 0, bottom: 0, left: 0, ...ins };
    if (['top', 'right', 'bottom', 'left'].every((k) => Math.round(prev[k] || 0) === Math.round(this.insets[k]))) return;
    this.resize();
  }

  applyViewOffset() {
    const w = this.width, h = this.height;
    const ins = this.insets || { top: 0, right: 0, bottom: 0, left: 0 };
    const sx = (ins.left - ins.right) / 2, sy = (ins.top - ins.bottom) / 2;
    const fullW = w + 2 * Math.abs(sx), fullH = h + 2 * Math.abs(sy);
    this.camera.aspect = fullW / fullH;
    this.camera.setViewOffset(fullW, fullH, Math.abs(sx) - sx, Math.abs(sy) - sy, w, h);
    this.camera.updateProjectionMatrix();
    const ph = fullH * this.renderer.getPixelRatio();
    this.particles.material.uniforms.scale.value = ph / (2 * Math.tan((this.camera.fov * Math.PI) / 360));
  }

  resize(forceCamera = false) {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.width = w;
    this.height = h;
    this.applyViewOffset();
    if (!this.userMovedCamera || forceCamera === true) this.resetCamera();
  }

  resetCamera() {
    // ขอบเขตส่วนที่มองเห็นในพิกัด NDC (หักพื้นที่ที่ UI บัง)
    const ins = this.insets || { top: 0, right: 0, bottom: 0, left: 0 };
    const w = this.width || 1, h = this.height || 1;
    const xmin = (2 * ins.left) / w - 1 + 0.02, xmax = 1 - (2 * ins.right) / w - 0.02;
    const ymin = (2 * ins.bottom) / h - 1 + 0.03, ymax = 1 - (2 * ins.top) / h - 0.03;
    // จอแนวตั้ง (มือถือ): หมุนกล้องให้กระดานด้านยาวอยู่แนวตั้ง มอนสเตอร์เดินจากบนลงล่าง
    const visAspect = ((xmax - xmin) * w) / Math.max(1, (ymax - ymin) * h);
    const portrait = visAspect < 0.95;
    const polar = portrait ? 0.5 : 0.74;
    const target = portrait ? new THREE.Vector3(0.3, -0.2, 0) : new THREE.Vector3(0, -0.2, 0.3);
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => new THREE.Vector3(sx * (COLS / 2 + 0.2), 0, sz * (ROWS / 2 + 0.2)));
    const dir = portrait ? new THREE.Vector3(Math.sin(polar), Math.cos(polar), 0) : new THREE.Vector3(0, Math.cos(polar), Math.sin(polar));
    let lo = 4, hi = 80;
    for (let i = 0; i < 26; i++) {
      const d = (lo + hi) / 2;
      this.camera.position.copy(target).addScaledVector(dir, d);
      this.camera.lookAt(target);
      this.camera.updateMatrixWorld();
      const fits = corners.every((c) => {
        const p = c.clone().project(this.camera);
        return p.x >= xmin && p.x <= xmax && p.y >= ymin && p.y <= ymax;
      });
      if (fits) hi = d; else lo = d;
    }
    this.camera.position.copy(target).addScaledVector(dir, hi);
    this.controls.target.copy(target);
    this.controls.maxDistance = Math.max(40, hi * 1.4);
    this.controls.update();
    this.userMovedCamera = false;
  }

  /* ---------- แผนที่ ---------- */
  loadMap(mapIndex) {
    if (this.loadedMap === mapIndex) return;
    this.loadedMap = mapIndex;
    for (const child of [...this.worldGroup.children]) this.worldGroup.remove(child);
    const def = MAPS[mapIndex];
    this.map = parseMap(def);
    this.world = buildWorld(this.map, def.theme);
    this.worldGroup.add(this.world.group);
    const th = this.world.theme;
    this.scene.fog = new THREE.Fog(th.fog, 30, 85);
    this.hemi.color.set(th.hemiSky);
    this.hemi.groundColor.set(th.hemiGround);
    this.hemi.intensity = th.hemiI;
    this.sun.color.set(th.sun);
    this.sun.intensity = th.sunI;
    this.routeVersion = -1;
    this.routePts = null;
  }

  /* ---------- การเลือกช่อง ---------- */
  pickTile(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const at = (y) => {
      const hit = this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), this.tmpV);
      if (!hit) return null;
      const c = Math.floor(hit.x + COLS / 2), r = Math.floor(hit.z + ROWS / 2);
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
      return { c, r };
    };
    const top = at(0);
    if (top && this.map && !this.map.walk[top.r * COLS + top.c]) return top;
    const low = at(FLOOR);
    if (low && this.map && this.map.walk[low.r * COLS + low.c]) return low;
    return top || low;
  }

  // ลิงก์ที่อยู่ใต้ตำแหน่งเมาส์ (ป้ายผู้สร้างเกม)
  pickLink(clientX, clientY) {
    const sign = this.world && this.world.creatorSign;
    if (!sign || !sign.visible) return null;
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.raycaster.intersectObject(sign, true).length ? sign.userData.link : null;
  }

  /* ---------- เหตุการณ์จากระบบเกม ---------- */
  creepY(e) { return e.flying ? FLY_HEIGHT : FLOOR; }

  handleEvent(ev) {
    const P = this.particles;
    switch (ev.type) {
      case 'build': {
        const t = ev.tower;
        const y = this.tileGround(t.c, t.r);
        P.burst(wx(t.x), y + 0.2, wz(t.y), t.kind === 'basic' ? '#ffe0a0' : ELEMENTS[t.elements[0]].color, 30, 2.5, 0.16, -5, y);
        this.addRing(wx(t.x), y + 0.05, wz(t.y), 0.8, '#ffffff', 0.4);
        break;
      }
      case 'upgrade': {
        const t = ev.tower;
        const y = this.tileGround(t.c, t.r);
        this.addRing(wx(t.x), y + 0.05, wz(t.y), 1, '#ffe680', 0.5);
        P.burst(wx(t.x), y + 0.5, wz(t.y), '#ffe680', 35, 3, 0.16, -5, y);
        break;
      }
      case 'fuse': {
        const t = ev.tower;
        const y = this.tileGround(t.c, t.r);
        ev.els.forEach((el, i) => {
          P.burst(wx(t.x), y + 0.7, wz(t.y), ELEMENTS[el].color, 45, 4, 0.2, -4, y);
          this.addRing(wx(t.x), y + 0.06, wz(t.y), 1.4 + i * 0.3, ELEMENTS[el].color, 0.6);
        });
        for (let i = 0; i < 40; i++) {
          const a = Math.random() * Math.PI * 2;
          P.emit(wx(t.x) + Math.cos(a) * 1.2, y + 0.2, wz(t.y) + Math.sin(a) * 1.2, -Math.cos(a) * 2, rand(1, 2.5), -Math.sin(a) * 2, ELEMENTS[ev.els[i % ev.els.length]].color, 0.6, 0.18, -1, y);
        }
        break;
      }
      case 'built': {
        const t = ev.tower;
        const y = this.tileGround(t.c, t.r);
        this.addRing(wx(t.x), y + 0.05, wz(t.y), 0.9, '#fff2c0', 0.45);
        P.burst(wx(t.x), y + 0.4, wz(t.y), t.kind === 'basic' ? '#ffe0a0' : ELEMENTS[t.elements[0]].color, 26, 2.5, 0.15, -4, y);
        break;
      }
      case 'sell': {
        const t = ev.tower;
        const y = this.tileGround(t.c, t.r);
        P.burst(wx(t.x), y + 0.3, wz(t.y), '#ffcf4a', 25, 2.5, 0.14, -5, y);
        break;
      }
      case 'spawn': {
        const e = ev.creep;
        P.burst(wx(e.x), this.creepY(e) + 0.4, wz(e.y), ELEMENTS[e.element].color, 12, 1.5, 0.14, -2);
        break;
      }
      case 'death': {
        const e = ev.creep;
        const y = this.creepY(e);
        const boss = e.boss;
        P.burst(wx(e.x), y + 0.3, wz(e.y), ELEMENTS[e.element].color, boss ? 140 : 26, boss ? 5 : 2.8, boss ? 0.24 : 0.16, -5, FLOOR);
        P.burst(wx(e.x), y + 0.3, wz(e.y), '#ffffff', boss ? 40 : 6, 2, 0.12, -3, FLOOR);
        if (boss) { this.addRing(wx(e.x), FLOOR + 0.06, wz(e.y), 3, ELEMENTS[e.element].color, 0.8); this.shake = 0.4; }
        break;
      }
      case 'revive': {
        const e = ev.creep;
        P.burst(wx(e.x), this.creepY(e) + 0.3, wz(e.y), '#b6ffb0', 30, 2.2, 0.16, 1);
        this.addRing(wx(e.x), this.creepY(e) + 0.05, wz(e.y), 0.8, '#b6ffb0', 0.5);
        break;
      }
      case 'hit':
        P.burst(wx(ev.x), (ev.fly ? FLY_HEIGHT : FLOOR) + 0.35, wz(ev.y), ev.color, 6, 1.5, 0.13, -5);
        break;
      case 'explosion': {
        const y = ev.fly ? FLY_HEIGHT : FLOOR;
        const gy = ev.fly ? y : this.groundAt(ev.x, ev.y);
        this.addRing(wx(ev.x), gy + 0.06, wz(ev.y), ev.r / TILE, ev.color, ev.big ? 0.5 : 0.35);
        P.burst(wx(ev.x), gy + 0.3, wz(ev.y), ev.color, ev.big ? 40 : 16, ev.big ? 4.5 : 3, ev.big ? 0.26 : 0.2, -5, gy);
        P.burst(wx(ev.x), gy + 0.3, wz(ev.y), '#ffd27a', ev.big ? 18 : 6, 2, 0.14, -5, gy);
        break;
      }
      case 'beam':
        this.addBeam(ev);
        break;
      case 'chain': this.addChain(ev); break;
      case 'pulse': this.addPulse(ev); break;
      case 'cone': this.addCone(ev); break;
      case 'gust': this.addGust(ev); break;
      case 'shatter': this.addShatter(ev); break;
      case 'eclipse': this.addEclipse(ev); break;
      case 'soulSpread': this.addSoulSpread(ev); break;
      case 'quake': this.shake = Math.max(this.shake, ev.s); break;
      case 'freeze': {
        const e = ev.creep;
        P.burst(wx(e.x), this.creepY(e) + 0.3, wz(e.y), '#dff6ff', 16, 2, 0.14, -4);
        break;
      }
      case 'shot': {
        const v = this.towerViews.get(ev.tower.id);
        if (v) v.recoil = 1;
        break;
      }
      case 'loop': {
        // มอนสเตอร์ที่หลุดวนกลับมาเกิดที่ประตูทางเข้า
        const e = ev.creep;
        P.burst(wx(e.x), this.creepY(e) + 0.4, wz(e.y), '#7ac0ff', 24, 2.2, 0.16, -2);
        this.addRing(wx(e.x), this.creepY(e) + 0.05, wz(e.y), 0.9, '#7ac0ff', 0.5);
        break;
      }
      case 'leak':
        this.shake = 0.35;
        this.coreHit = 1;
        break;
      case 'floater':
        this.addFloater(ev);
        break;
      default:
        break;
    }
  }

  addRing(x, y, z, r, color, life) {
    const m = new THREE.Mesh(geo('fxRing', () => new THREE.RingGeometry(0.82, 1, 48)),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.4), transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    this.dynamic.add(m);
    this.effects.push({
      obj: m, life, max: life,
      update(k) { m.scale.setScalar(r * (0.25 + 0.75 * (1 - k))); m.material.opacity = k; },
    });
  }

  addFloater(ev) {
    if (this.floaters.length > 45) {
      const old = this.floaters.shift();
      old.el.remove();
    }
    const el = document.createElement('div');
    el.className = 'floater';
    el.innerHTML = withIcons(ev.text);
    el.style.color = ev.color;
    el.style.fontSize = `${ev.size}px`;
    this.floaterLayer.appendChild(el);
    const baseY = ev.h ? FLY_HEIGHT : this.groundAt(ev.x, ev.y);
    this.floaters.push({ el, x: wx(ev.x), z: wz(ev.y), y: baseY + 0.9, life: 0.9, max: 0.9 });
  }

  clearDynamic() {
    for (const v of this.towerViews.values()) { this.dynamic.remove(v.group); this.dynamic.remove(v.scaffold); this.dynamic.remove(v.bar); }
    for (const v of this.creepViews.values()) { if (v.shadow) this.dynamic.remove(v.shadow); this.removeCreepView(v); }
    for (const v of this.projViews.values()) this.dynamic.remove(v.mesh);
    for (const fx of this.effects) this.dynamic.remove(fx.obj);
    for (const f of this.floaters) f.el.remove();
    this.towerViews.clear();
    this.creepViews.clear();
    this.projViews.clear();
    this.effects = [];
    this.floaters = [];
    this.particles.clear();
    this.clearVfx();
    this.routeVersion = -1;
    this.chevrons.count = 0;
  }

  makeBlobMat() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)');
    gr.addColorStop(0.6, 'rgba(0,0,0,0.3)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    return new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  }

  removeCreepView(v) {
    this.dynamic.remove(v.group);
    this.dynamic.remove(v.bar);
    for (const m of v.mats) m.dispose();
  }

  /* ---------- ซิงก์วัตถุ ---------- */
  syncTowers(game, dt) {
    const seen = new Set();
    for (const t of game.towers) {
      seen.add(t.id);
      let v = this.towerViews.get(t.id);
      if (!v || v.version !== t.version) {
        if (v) { this.dynamic.remove(v.group); this.dynamic.remove(v.scaffold); this.dynamic.remove(v.bar); }
        const built = buildTowerModel(t);
        v = { ...built, version: t.version, recoil: 0 };
        v.group.position.set(wx(t.x), this.tileGround(t.c, t.r), wz(t.y));
        this.dynamic.add(v.group);
        v.scaffold = this.makeScaffold(built.height);
        v.scaffold.position.copy(v.group.position);
        v.bar = this.makeProgressBar();
        this.dynamic.add(v.scaffold, v.bar);
        this.towerViews.set(t.id, v);
      }
      // ระหว่างก่อสร้าง: นั่งร้าน + แถบความคืบหน้า + ป้อมค่อย ๆ โผล่ขึ้นจากพื้น
      const b = t.build;
      const k = b ? 1 - Math.max(0, b.t) / b.total : 1;
      v.scaffold.visible = !!b;
      v.bar.visible = !!b;
      if (b) {
        const grow = b.kind === 'build' ? 0.12 + 0.88 * (1 - Math.pow(1 - k, 2)) : 1;
        v.group.scale.set(1, grow, 1);
        v.bar.position.set(v.group.position.x, v.group.position.y + v.height + 0.25, v.group.position.z);
        v.bar.userData.fg.scale.x = v.bar.userData.w * k;
        v.bar.userData.fg.material = b.kind === 'build' ? this.progMats.build : this.progMats.upgrade;
        if (Math.random() < dt * 8) {
          this.particles.emit(v.group.position.x + rand(-0.4, 0.4), v.group.position.y + 0.05, v.group.position.z + rand(-0.4, 0.4), rand(-0.2, 0.2), rand(0.3, 0.8), rand(-0.2, 0.2), b.kind === 'build' ? '#d8c6a0' : '#ffe680', 0.6, 0.14, -0.5, v.group.position.y);
        }
      } else {
        v.group.scale.set(1, 1, 1);
      }
      v.aim.rotation.y = -t.angle;
      v.recoil = Math.max(0, v.recoil - dt * 6);
      v.aim.position.x = -Math.cos(t.angle) * v.recoil * 0.04;
      v.aim.position.z = -Math.sin(t.angle) * v.recoil * 0.04;
      if (!b || b.kind === 'upgrade') for (const a of v.anims) a(this.time, dt, v.recoil);
    }
    for (const [id, v] of this.towerViews) {
      if (!seen.has(id)) { this.dynamic.remove(v.group); this.dynamic.remove(v.scaffold); this.dynamic.remove(v.bar); this.towerViews.delete(id); }
    }
  }

  makeScaffold(height) {
    const g = new THREE.Group();
    const wood = std(0xa07a4a, { roughness: 0.9 });
    const pole = geo('scafPole', () => new THREE.BoxGeometry(0.035, 1, 0.035));
    const h = Math.max(0.6, height * 0.85);
    for (const [x, z] of [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]) {
      g.add(mesh(pole, wood, { x, y: h / 2, z, s: [1, h, 1] }));
    }
    for (const y of [0.25, h * 0.6, h - 0.04]) {
      for (const [x, z, ry] of [[0, -0.42, 0], [0, 0.42, 0], [-0.42, 0, Math.PI / 2], [0.42, 0, Math.PI / 2]]) {
        g.add(mesh(pole, wood, { x, y, z, rz: Math.PI / 2, ry, s: [1, 0.86, 1] }));
      }
    }
    for (const [x, z, ry] of [[0, -0.42, 0], [0, 0.42, 0], [-0.42, 0, Math.PI / 2], [0.42, 0, Math.PI / 2]]) {
      g.add(mesh(pole, wood, { x, y: h * 0.42, z, ry, rz: 0.75, s: [1, 1.05, 1] }));
    }
    g.visible = false;
    return g;
  }

  makeProgressBar() {
    if (!this.progMats) {
      const sm = (c, o = 1) => new THREE.SpriteMaterial({ color: c, transparent: o < 1, opacity: o, depthTest: false });
      this.progMats = { bg: sm(0x000000, 0.7), build: sm(0xffc94a), upgrade: sm(0x6ad8ff) };
    }
    const w = 0.7;
    const g = new THREE.Group();
    const bg = new THREE.Sprite(this.progMats.bg);
    bg.center.set(0, 0.5);
    bg.scale.set(w + 0.05, 0.11, 1);
    bg.position.x = -w / 2 - 0.025;
    const fg = new THREE.Sprite(this.progMats.build);
    fg.center.set(0, 0.5);
    fg.scale.set(0.001, 0.07, 1);
    fg.position.x = -w / 2;
    bg.renderOrder = 10;
    fg.renderOrder = 11;
    g.add(bg, fg);
    g.userData = { fg, w };
    g.visible = false;
    return g;
  }

  syncCreeps(game, dt) {
    const seen = new Set();
    for (const e of game.creeps) {
      if (!e.alive) continue;
      seen.add(e.id);
      let v = this.creepViews.get(e.id);
      if (!v) {
        v = buildCreatureModel(e);
        v.bar = this.makeBar(e);
        v.r = e.size / TILE;
        // เงาแบบวงกลมนุ่ม (ถูกกว่าเงาจริงมาก เมื่อมีมอนสเตอร์จำนวนมาก)
        v.shadow = new THREE.Mesh(geo('blob', () => new THREE.CircleGeometry(1, 24)), this.blobMat || (this.blobMat = this.makeBlobMat()));
        v.shadow.rotation.x = -Math.PI / 2;
        v.shadow.scale.set(v.r * 2.4, v.r * 1.7, 1);
        v.shadow.renderOrder = 1;
        this.dynamic.add(v.shadow);
        this.dynamic.add(v.group, v.bar);
        this.creepViews.set(e.id, v);
      }
      const g = v.group;
      const baseY = this.creepY(e);
      g.position.set(wx(e.x), baseY, wz(e.y));
      g.rotation.y = -e.angle;
      v.anim(dt, this.time, e.moving);
      if (v.shadow) {
        v.shadow.position.set(g.position.x, this.groundAt(e.x, e.y) + 0.015, g.position.z);
        v.shadow.rotation.z = e.angle;
      }
      if (e.ability === 'undead' && Math.random() < dt * 18) {
        const c = ELEMENTS[e.element];
        this.particles.emit(g.position.x + rand(-0.15, 0.15), baseY + v.height * rand(0.4, 0.9), g.position.z + rand(-0.15, 0.15), rand(-0.2, 0.2), rand(0.4, 1.0), rand(-0.2, 0.2), Math.random() < 0.5 ? c.color : c.glow, 0.5, 0.11, 1.2);
      }
      const mtl = v.body;
      if (e.flash > 0) { mtl.emissive.setRGB(1, 1, 1); mtl.emissiveIntensity = 0.22; }
      else if (e.freezeT > 0) { mtl.emissive.setRGB(0.55, 0.85, 1); mtl.emissiveIntensity = 0.7; }
      else if (e.slowT > 0) { mtl.emissive.setRGB(0.3, 0.7, 1); mtl.emissiveIntensity = 0.45; }
      else { mtl.emissive.set(ELEMENTS[e.element].color); mtl.emissiveIntensity = 0.12; }
      const r = v.r;
      const px = g.position.x, pz = g.position.z;
      this.statusFx(v, 'slow', e.slowT > 0 && e.freezeT <= 0, () => mesh(G.torus(), glow(0x9ad8ff, 2.5), { rx: Math.PI / 2, y: 0.05, s: r + 0.15, shadow: false }));
      this.statusFx(v, 'freeze', e.freezeT > 0, () => mesh(G.ico1(), std(0xcff4ff, { transparent: true, opacity: 0.5, roughness: 0.05, metalness: 0.2, emissive: 0x6ac8ff, emissiveIntensity: 0.5, flatShading: true, depthWrite: false }), { y: v.height * 0.5, s: [Math.max(r * 1.7, 0.3), Math.max(v.height * 0.62, 0.25), Math.max(r * 1.7, 0.3)], shadow: false }));
      const root = this.statusFx(v, 'root', e.rootT > 0, () => {
        const rg = new THREE.Group();
        for (let i = 0; i < 2; i++) rg.add(mesh(G.torus(), glow(0x7a3dff, 1.8), { rx: Math.PI / 2, y: 0.06 + i * 0.12, s: r + 0.08 - i * 0.03, shadow: false }));
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          rg.add(mesh(G.cyl6(), std(0x1a1024, { metalness: 0.6, roughness: 0.4 }), { x: Math.cos(a) * (r + 0.2), y: 0.1, z: Math.sin(a) * (r + 0.2), rz: Math.cos(a) * 0.9, rx: -Math.sin(a) * 0.9, s: [0.015, 0.32, 0.015], shadow: false }));
        }
        return rg;
      });
      if (root && root.visible) root.rotation.y = this.time * 0.8;
      this.statusFx(v, 'expose', e.exposeT > 0, () => mesh(G.torus(), glow(0xffd34a, 2.6), { rx: Math.PI / 2, y: 0.02, s: r + 0.25, shadow: false }));
      this.statusFx(v, 'shred', e.shredT > 0, () => mesh(geo('shredRing', () => new THREE.TorusGeometry(1, 0.07, 4, 10)), glow(0xff3a2a, 2.2), { rx: Math.PI / 2, y: 0.03, s: r + 0.2, shadow: false }));
      const marks = this.statusFx(v, 'marks', e.marks > 0 && e.markT > 0, () => {
        const mg = new THREE.Group();
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          mg.add(mesh(G.sphLo(), glow(i % 2 ? 0xffd34a : 0x8a3dff, 2.4), { x: Math.cos(a) * (r + 0.12), z: Math.sin(a) * (r + 0.12), s: 0.045, shadow: false }));
        }
        mg.position.y = v.height + 0.05;
        return mg;
      });
      if (marks && marks.visible) { marks.rotation.y = this.time * 3; marks.children.forEach((c, i) => { c.visible = i < e.marks; }); }
      const stun = this.statusFx(v, 'stun', e.stunT > 0 || e.silenceT > 0, () => {
        const sg = new THREE.Group();
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2;
          sg.add(mesh(G.octa(), glow(0xffe45a, 3), { x: Math.cos(a) * (r + 0.05), z: Math.sin(a) * (r + 0.05), s: 0.05, shadow: false }));
        }
        sg.position.y = v.height + 0.1;
        return sg;
      });
      if (stun && stun.visible) stun.rotation.y = this.time * 6;
      const puff = (rate, cols, up, size, grav) => {
        if (Math.random() < dt * rate) this.particles.emit(px + rand(-0.12, 0.12), baseY + v.height * rand(0.3, 1), pz + rand(-0.12, 0.12), rand(-0.2, 0.2), up, rand(-0.2, 0.2), cols[Math.random() < 0.5 ? 0 : 1], 0.45, size, grav);
      };
      if (e.burnT > 0) puff(25, ['#ff7a2a', '#ffcf4a'], rand(0.8, 1.6), 0.13, 1);
      if (e.soulT > 0) puff(22, ['#ff3aa0', '#9a4dff'], rand(0.8, 1.5), 0.13, 1);
      if (e.corrodeT > 0) puff(14, ['#9a4dff', '#4a1a6a'], rand(0.3, 0.7), 0.12, 0.3);
      if (e.wetT > 0) puff(10, ['#8fd3ff', '#2f8fff'], -0.5, 0.09, -4);
      if (e.chill > 0 && e.freezeT <= 0) puff(e.chill / 8, ['#dff6ff', '#8fdcff'], 0.2, 0.09, -0.5);
      if (e.ability === 'regen' && Math.random() < dt * 6) {
        this.particles.emit(g.position.x + rand(-0.2, 0.2), baseY + 0.1, g.position.z + rand(-0.2, 0.2), 0, rand(0.5, 1), 0, '#7dff7a', 0.8, 0.12, 0);
      }
      const showBar = e.hp < e.maxHp || e.boss;
      v.bar.visible = showBar;
      if (showBar) {
        v.bar.position.set(g.position.x, baseY + v.height + 0.22, g.position.z);
        const k = Math.max(0, e.hp / e.maxHp);
        const fg = v.bar.userData.fg;
        fg.scale.x = v.bar.userData.w * k;
        fg.material = k > 0.5 ? this.barMats.good : k > 0.25 ? this.barMats.mid : this.barMats.low;
      }
    }
    for (const [id, v] of this.creepViews) {
      if (!seen.has(id)) {
        if (v.shadow) this.dynamic.remove(v.shadow);
        this.removeCreepView(v);
        this.creepViews.delete(id);
      }
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
      this.barMats = { bg: sm(0x000000, 0.7), good: sm(0x57e08a), mid: sm(0xffcf4a), low: sm(0xff5a6a) };
    }
    const w = e.boss ? 1.2 : Math.max(0.45, (e.size / TILE) * 1.9);
    const g = new THREE.Group();
    const bg = new THREE.Sprite(this.barMats.bg);
    bg.center.set(0, 0.5);
    bg.scale.set(w + 0.05, 0.11, 1);
    bg.position.x = -w / 2 - 0.025;
    const fg = new THREE.Sprite(this.barMats.good);
    fg.center.set(0, 0.5);
    fg.scale.set(w, 0.07, 1);
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
        const st = p.style;
        const t = p.tower;
        const color = t.kind === 'basic' ? BASIC[t.base].color : ELEMENTS[p.elements[p.elements.length - 1]].color;
        let m;
        if (st === 'arrow') {
          m = new THREE.Group();
          m.add(mesh(G.cyl(), std(0x8a6a40), { rz: Math.PI / 2, s: [0.012, 0.3, 0.012], shadow: false }));
          m.add(mesh(G.cone4(), std(0xdddddd, { metalness: 0.7 }), { x: 0.17, rz: -Math.PI / 2, s: [0.025, 0.06, 0.025], shadow: false }));
        } else if (st === 'cannon') {
          m = mesh(G.sph(), std(0x222228, { metalness: 0.6, roughness: 0.4 }), { s: 0.08 });
        } else if (st === 'earth') {
          m = mesh(G.dode(), std(0x8a6a45, { flatShading: true }), { s: 0.12 });
        } else if (st === 'shell') {
          m = new THREE.Group();
          m.add(mesh(G.sph(), std(0x2a2830, { metalness: 0.7, roughness: 0.35, emissive: 0xff5a1e, emissiveIntensity: 0.6 }), { s: 0.09, shadow: false }));
        } else if (st === 'ice') {
          m = mesh(G.octa(), glow(0xcff4ff, 2.6), { s: [0.07, 0.12, 0.07], shadow: false });
        } else if (st === 'chain') {
          m = new THREE.Group();
          m.add(mesh(G.sphLo(), glow(0x7a3dff, 3), { s: 0.07, shadow: false }));
          m.add(mesh(G.torus(), glow(0xb070ff, 2.5), { s: 0.11, shadow: false }));
        } else if (st === 'lob') {
          m = mesh(G.sphLo(), glow(color, 3), { s: 0.1, shadow: false });
        } else if (st === 'wind') {
          m = mesh(geo('crescent', () => new THREE.TorusGeometry(0.1, 0.02, 4, 12, Math.PI)), glow(0x7affd0, 3), { rx: Math.PI / 2, shadow: false });
        } else {
          const size = { fire: 0.13, water: 0.09, dark: 0.1, soul: 0.11 }[st] || 0.08;
          m = mesh(G.sphLo(), glow(color, 3.5), { s: size * (p.elements.length > 1 ? 1.35 : 1), shadow: false });
        }
        const ty = this.tileGround(t.c, t.r);
        v = { mesh: m, trail: t.kind === 'basic' ? (st === 'cannon' ? '#9a9a9a' : null) : st === 'soul' ? '#ff3aa0' : st === 'ice' ? '#ffffff' : color, total: Math.hypot(p.tx - p.sx, p.ty - p.sy) || 1, y0: ty + 0.85 };
        this.dynamic.add(m);
        this.projViews.set(p.id, v);
      }
      const remain = Math.hypot(p.tx - p.x, p.ty - p.y);
      v.total = Math.max(v.total, remain);
      const k = Math.min(1, Math.max(0, 1 - remain / v.total));
      const y1 = (p.fly ? FLY_HEIGHT : FLOOR) + 0.3;
      const lob = ['earth', 'cannon', 'shell', 'lob'].includes(p.style) ? 1 : 0.15;
      const y = v.y0 + (y1 - v.y0) * k + Math.sin(k * Math.PI) * lob;
      const prev = v.mesh.position.clone();
      v.mesh.position.set(wx(p.x), y, wz(p.y));
      if (p.style === 'arrow') {
        const d = v.mesh.position.clone().sub(prev);
        if (d.lengthSq() > 1e-6) v.mesh.rotation.set(0, Math.atan2(-d.z, d.x), Math.atan2(d.y, Math.hypot(d.x, d.z)));
      } else if (p.style === 'wind') v.mesh.rotation.z += dt * 20;
      else if (p.style === 'earth' || p.style === 'ice' || p.style === 'chain') { v.mesh.rotation.x += dt * 8; v.mesh.rotation.z += dt * 6; }
      if (v.trail && Math.random() < 0.85) {
        this.particles.emit(v.mesh.position.x, v.mesh.position.y, v.mesh.position.z, 0, 0.1, 0, v.trail, 0.28, p.style === 'wind' ? 0.08 : 0.13, 0);
      }
    }
    for (const [id, v] of this.projViews) {
      if (!seen.has(id)) { this.dynamic.remove(v.mesh); this.projViews.delete(id); }
    }
  }

  /* ---------- ลูกศรเส้นทาง ---------- */
  updateRoute(game, view) {
    if (game.routeVersion !== this.routeVersion) {
      this.routeVersion = game.routeVersion;
      const tiles = game.getRoute();
      const pts = tiles.map((i) => { const c = tileCenter(i); return new THREE.Vector3(wx(c.x), FLOOR + 0.03, wz(c.y)); });
      const segs = [];
      let total = 0;
      for (let k = 0; k < pts.length - 1; k++) {
        const len = pts[k].distanceTo(pts[k + 1]);
        segs.push({ a: pts[k], b: pts[k + 1], len, start: total });
        total += len;
      }
      this.routePts = { segs, total };
    }
    const show = !!view.selectedBuild || !game.waveActive;
    const target = view.selectedBuild ? 0.75 : show ? 0.4 : 0;
    this.chevMat.opacity += (target - this.chevMat.opacity) * 0.15;
    if (this.chevMat.opacity < 0.02 || !this.routePts || !this.routePts.segs.length) { this.chevrons.count = 0; return; }
    const { segs, total } = this.routePts;
    const spacing = 0.5;
    const off = (this.time * 0.9) % spacing;
    const d = new THREE.Object3D();
    let n = 0, si = 0;
    for (let s = off; s < total && n < 400; s += spacing) {
      while (si < segs.length - 1 && s > segs[si].start + segs[si].len) si++;
      const sg = segs[si];
      const k = (s - sg.start) / sg.len;
      d.position.lerpVectors(sg.a, sg.b, k);
      d.rotation.set(0, Math.atan2(-(sg.b.z - sg.a.z), sg.b.x - sg.a.x), 0);
      d.updateMatrix();
      this.chevrons.setMatrixAt(n++, d.matrix);
    }
    this.chevrons.count = n;
    this.chevrons.instanceMatrix.needsUpdate = true;
  }

  /* ---------- วาดเฟรม ---------- */
  frame(dt, view) {
    this.time += dt;
    const game = view.game;
    this.controls.autoRotate = !!view.menu;
    this.controls.update();
    // จำกัดการเลื่อนไม่ให้กระดานหลุดออกนอกจอ
    const tg = this.controls.target;
    const cx = Math.max(-COLS / 2, Math.min(COLS / 2, tg.x)), cz = Math.max(-ROWS / 2, Math.min(ROWS / 2, tg.z));
    if (cx !== tg.x || cz !== tg.z || tg.y !== 0) {
      this.camera.position.x += cx - tg.x; this.camera.position.z += cz - tg.z; this.camera.position.y -= tg.y;
      tg.set(cx, 0, cz);
    }
    // ปรับระยะหมอกตามระยะกล้อง เพื่อไม่ให้ฉากจางเมื่อซูมออกไกล
    if (this.scene.fog) {
      const d = this.camera.position.distanceTo(this.controls.target);
      this.scene.fog.near = d + 6;
      this.scene.fog.far = d + 55;
    }
    if (this.world) this.world.update(this.time);

    if (game) {
      this.syncTowers(game, dt);
      this.syncCreeps(game, dt);
      this.syncProjectiles(game, dt);
      this.syncZones(game, dt);
      this.syncMovers(game, dt);
      this.syncDelayed(game, dt);
      this.updateRoute(game, view);
    } else {
      this.chevrons.count = 0;
    }
    this.updateHelpers(view);

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

    // ป้ายแนะนำหันหากล้อง
    // ป้ายผู้สร้างเกมหันหากล้อง (ซ่อน/แสดงด้วยปุ่มป้าย)
    if (this.world && this.world.creatorSign) {
      const cs = this.world.creatorSign;
      cs.visible = view.showSigns !== false;
      cs.rotation.y = Math.atan2(this.camera.position.x - cs.position.x, this.camera.position.z - cs.position.z);
    }
    if (this.world) {
      this.coreHit = Math.max(0, (this.coreHit || 0) - dt * 2);
      const cp = this.world.corePortal;
      cp.light.intensity = 1.2 + this.coreHit * 6;
      this.world.coreCrystal.material = this.coreHit > 0 ? glow(0xff3a4a, 3) : glow(0xffd8e0, 1.6);
      for (const [p, col] of [[this.world.spawnPortal, '#7ac0ff'], [cp, '#ff6a7a']]) {
        if (Math.random() < dt * 14) {
          const g = p.group.position;
          this.particles.emit(g.x + rand(-0.5, 0.5), g.y + rand(0.2, 1.3), g.z + rand(-0.5, 0.5), 0, rand(0.3, 0.8), 0, col, 0.8, 0.12, 0);
        }
      }
    }

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

    this.shake = Math.max(0, this.shake - dt);
    if (this.shake > 0) this.root.position.set(rand(-1, 1) * this.shake * 0.3, 0, rand(-1, 1) * this.shake * 0.3);
    else this.root.position.set(0, 0, 0);

    if (this.quality === 'high') this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }

  updateHelpers(view) {
    const { game, hover, selectedBuild, selectedTower, hoverCheck } = view;
    this.range.visible = false;
    this.hoverTile.visible = false;
    this.selRing.visible = false;
    for (const g of Object.values(this.ghosts)) g.visible = false;
    if (!game) return;

    if (selectedTower) {
      const y = this.tileGround(selectedTower.c, selectedTower.r);
      if (selectedTower.stats.range < 1000) this.showRange(wx(selectedTower.x), y, wz(selectedTower.y), selectedTower.stats.range / TILE, true);
      this.selRing.visible = true;
      this.selRing.position.set(wx(selectedTower.x), y + 0.04, wz(selectedTower.y));
      this.selRing.scale.setScalar(1 + Math.sin(this.time * 5) * 0.04);
    }
    if (hover && selectedBuild) {
      const range = BASIC[selectedBuild] ? BASIC[selectedBuild].range : TOWERS[selectedBuild].range;
      const ok = hoverCheck && hoverCheck.ok;
      const x = tileX(hover.c), z = tileZ(hover.r), y = this.tileGround(hover.c, hover.r);
      this.hoverTile.visible = true;
      this.hoverTile.position.set(x, y + 0.025, z);
      this.hoverTile.material.color.set(ok ? 0xffffff : 0xff4040);
      if (range < 1000) this.showRange(x, y, z, range / TILE, ok); else this.range.visible = false;
      if (ok) {
        const gh = this.getGhost(selectedBuild);
        gh.visible = true;
        gh.position.set(x, y, z);
      }
    } else if (hover && !selectedBuild && game.towerGrid[hover.r * COLS + hover.c]) {
      this.hoverTile.visible = true;
      this.hoverTile.position.set(tileX(hover.c), this.tileGround(hover.c, hover.r) + 0.025, tileZ(hover.r));
      this.hoverTile.material.color.set(0xffffff);
    }
  }

  showRange(x, y, z, r, ok) {
    this.range.visible = true;
    this.range.position.set(x, y + 0.03, z);
    this.range.scale.setScalar(r);
    const c = ok ? 0xffffff : 0xff4040;
    this.rangeFill.material.color.set(c);
    this.rangeEdge.material.color.set(c);
  }
}

installVfx(Renderer3D);
