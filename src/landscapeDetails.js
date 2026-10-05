import * as THREE from 'three';
import { COLS, ROWS } from './data.js';
import { FLOOR, tileX, tileZ, std, glow, geo } from './gfx.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const PALETTE = {
  meadow: [0xaaa99a, 0xe2b883, 0xffe0a0], ruins: [0xa0b8a0, 0xbca574, 0x9ae8cc],
  desert: [0xf0d8aa, 0xbd8443, 0xffd774], canyon: [0xc6a482, 0x94643f, 0xffbc77],
  volcano: [0x584a50, 0x966259, 0xff713d], river: [0x94bebc, 0x688e8c, 0x83e6ff],
  sky: [0xe4edff, 0xb9b5dc, 0xbcecff], cave: [0x776b82, 0x62577a, 0xac93ff],
  night: [0x78879e, 0x635879, 0xaadfff],
};
function batch(group, geometry, material, entries) {
  if (!entries.length) return;
  const mesh = new THREE.InstancedMesh(geometry, material, entries.length);
  const dummy = new THREE.Object3D();
  entries.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, p.a || 0, 0);
    dummy.scale.set(...(p.s || [1, 1, 1]));
    dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.receiveShadow = true;
  group.add(mesh);
}
export function buildLandscapeDetails(group, map, themeKey, anim) {
  const [stone, metal, accent] = PALETTE[themeKey] || PALETTE.meadow;
  const walk = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS && map.walk[r * COLS + c];
  const blocks = [], inlays = [], studs = [], paving = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (!walk(c, r)) continue;
    const x = tileX(c), z = tileZ(r);
    // Low-relief stepping stones give the route a readable rhythm.
    if ((c * 7 + r * 3) % 13 === 0) paving.push({ x, y: FLOOR + 0.008, z, a: ((c * 7 + r * 3) % 5 - 2) * 0.045, s: [0.32, 0.012, 0.32] });
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (walk(c + dc, r + dr)) continue;
      const a = dc ? Math.PI / 2 : 0;
      const ex = x + dc * 0.51, ez = z + dr * 0.51;
      blocks.push({ x: ex, y: -0.14, z: ez, a, s: [0.085, 0.26, 0.1] });
      inlays.push({ x: ex, y: -0.15, z: ez, a, s: [0.033, 0.12, 0.018] });
      if ((c + r) % 3 === 0) studs.push({ x: ex + dc * 0.025, y: 0.075, z: ez + dr * 0.025, s: [0.026, 0.032, 0.026] });
    }
  }
  const box = geo('landscapeBlock', () => new THREE.BoxGeometry(1, 1, 1));
  batch(group, box, std(stone, { roughness: 0.76 }), blocks);
  batch(group, box, std(metal, { metalness: 0.5, roughness: 0.4 }), inlays);
  batch(group, geo('landscapeStud', () => new THREE.OctahedronGeometry(1)), glow(accent, 1.5), studs);
  if (themeKey !== 'river') batch(group, box, std(stone, { roughness: 0.94 }), paving);

  // Four carved boundary monuments frame the battlefield without using build tiles.
  const monumentGeo = geo('boundaryMonument', () => mergeGeometries([
    new THREE.CylinderGeometry(0.26, 0.34, 0.12, 8).translate(0, 0.06, 0),
    new THREE.CylinderGeometry(0.13, 0.2, 0.48, 6).translate(0, 0.34, 0),
    new THREE.CylinderGeometry(0.22, 0.15, 0.08, 8).translate(0, 0.62, 0),
  ]));
  const corners = [-1, 1].flatMap(sx => [-1, 1].map(sz => ({ x: sx * (COLS / 2 + 0.65), y: 0, z: sz * (ROWS / 2 + 0.65) })));
  batch(group, monumentGeo, std(stone, { roughness: 0.72 }), corners);
  const gems = new THREE.Group();
  corners.forEach((p, i) => {
    const gem = new THREE.Mesh(geo('boundaryGem', () => new THREE.OctahedronGeometry(0.12)), std(accent, { emissive: accent, emissiveIntensity: 0.6, roughness: 0.18, metalness: 0.2 }));
    gem.position.set(p.x, 0.82, p.z); gem.scale.y = 1.5; gems.add(gem);
    const halo = new THREE.Mesh(geo('boundaryHalo', () => new THREE.TorusGeometry(0.2, 0.009, 5, 28)), std(metal, { metalness: 0.7, roughness: 0.3 }));
    halo.position.set(p.x, 0.8, p.z); halo.rotation.x = Math.PI / 2; gems.add(halo);
    anim.push(t => { gem.rotation.y = t * 0.4 + i; gem.position.y = 0.82 + Math.sin(t * 1.4 + i) * 0.04; });
  });
  group.add(gems);
}

/* Layered landforms and botanical silhouettes outside the usable board. */
export function buildBiomeLandscape(group, map, themeKey, anim) {
  const [stone, metal, accent] = PALETTE[themeKey] || PALETTE.meadow;
  let seed=9817+themeKey.length*21;
  const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const barren=['desert','volcano','cave','canyon','sky'].includes(themeKey);
  const portalPositions=[map.spawn,map.core].map(i=>[tileX(i%COLS),tileZ(Math.floor(i/COLS))]);
  const spots=[];
  for(let i=0;i<160;i++) {
    const x=(rnd()-0.5)*(COLS+18),z=(rnd()-0.5)*(ROWS+14);
    if(Math.abs(x)<COLS/2+0.8&&Math.abs(z)<ROWS/2+0.8)continue;
    if(portalPositions.some(([px,pz])=>Math.hypot(px-x,pz-z)<2.5))continue;
    spots.push({x,y:0,z,a:rnd()*Math.PI*2,s:[0.5+rnd()*0.5,0.5+rnd()*0.5,0.5+rnd()*0.5]});
  }
  const pebble=geo('weatheredPebble',()=>{
    const g=new THREE.IcosahedronGeometry(0.22,2),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const d=1+Math.sin(x*37+z*21)*0.12;p.setXYZ(i,x*d,y*0.65*d,z*d);}
    g.computeVertexNormals();return g;
  });
  batch(group,pebble,std(stone,{roughness:0.97}),spots);
  if(!barren) {
    const fern=geo('sculptedFern',()=>{
      const parts=[];
      for(let frond=0;frond<7;frond++) {
        const a=frond*Math.PI*2/7;
        for(let leaf=1;leaf<=7;leaf++)for(const side of [-1,1]) {
          const t=leaf/8,span=0.12*Math.sin(t*Math.PI);
          const g=new THREE.SphereGeometry(1,7,4);
          g.scale(span,0.006,0.022);g.rotateY(a+side*0.7);
          g.translate(Math.cos(a)*t*0.38,Math.sin(t*Math.PI)*0.18+0.025,Math.sin(a)*t*0.38);parts.push(g);
        }
      }
      return mergeGeometries(parts);
    });
    batch(group,fern,std(themeKey==='night'?0x43888e:0x537e56,{roughness:0.86}),spots.filter((_,i)=>i%2===0));
  }
  // The distant silhouette is continuous land, rather than a collection of cones.
  const ridge=new THREE.PlaneGeometry(85,28,100,32);ridge.rotateX(-Math.PI/2);
  const p=ridge.attributes.position;
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),z=p.getZ(i);const depth=(z+14)/28;
    const envelope=Math.sin(depth*Math.PI);
    const waves=2.5+Math.sin(x*0.18)*1.1+Math.cos(x*0.41+z*0.15)*0.7+Math.sin(x*0.75+z*0.37)*0.32;
    const factor=themeKey==='cave'?2.4:themeKey==='volcano'?1.8:themeKey==='sky'?0.7:1;
    p.setY(i,envelope*waves*factor-0.16);
  }
  ridge.computeVertexNormals();
  const hill=new THREE.Mesh(ridge,std(barren?stone:themeKey==='night'?0x284f5f:0x688c69,{roughness:0.98}));
  hill.position.z=-29;hill.receiveShadow=true;group.add(hill);
  const stones=[];
  for(let i=0;i<24;i++) {
    const x=-27+i*2.35,z=-18-rnd()*5,h=1.2+rnd()*3;
    stones.push({x,y:h*0.4,z,a:rnd()*6,s:[2+rnd()*2,h*3,1.7+rnd()*2]});
  }
  if(barren) batch(group,pebble,std(stone,{roughness:0.9}),stones);
  // Carved pylons beyond the corners add a memorable architectural frame.
  const arch=geo('biomeArch',()=>mergeGeometries([
    new THREE.CylinderGeometry(0.18,0.27,1.4,12).translate(-0.55,0.7,0),
    new THREE.CylinderGeometry(0.18,0.27,1.4,12).translate(0.55,0.7,0),
    new THREE.TorusGeometry(0.55,0.16,8,24,Math.PI).translate(0,1.4,0),
  ]));
  const arches=[{x:-COLS/2-2.4,y:0,z:-ROWS/2-1.5,a:Math.PI/8},{x:COLS/2+2.4,y:0,z:-ROWS/2-1.5,a:-Math.PI/8}];
  batch(group,arch,std(stone,{roughness:0.8}),arches);
  const archInlays=[];
  for(const arch of arches)for(let k=0;k<7;k++) {
    const a=k/6*Math.PI;
    archInlays.push({x:arch.x+Math.cos(a)*0.55,y:1.4+Math.sin(a)*0.55,z:arch.z+0.16,s:[0.022,0.055,0.025]});
  }
  batch(group,geo('archSeal',()=>new THREE.OctahedronGeometry(1)),glow(accent,1.9),archInlays);
}
