/* Tower attack vocabulary, shared by the game and the live art preview.
 * Cached geometry is shared; materials and trail buffers belong to each shot. */
import * as THREE from 'three';
import { geo } from './gfx.js';
const PI=Math.PI;
export function attackProfile(t) {
  const key=t.kind==='basic'?t.base:t.elements.slice().sort().join('+');
  const profiles={
    arrow:['arrow','#decaaa','#ffffff'],cannon:['cannon','#c18a54','#ffe1a0'],
    light:['sun','#ffd366','#fff9d8'],dark:['curse','#8050d8','#edb3ff'],water:['water','#289dcc','#d6ffff'],fire:['fire','#ff6325','#ffe29b'],wind:['wind','#43d8aa','#d8fff2'],earth:['stone','#997147','#ffc86e'],
    'dark+light':['eclipse','#b17aff','#ffd875'],'light+water':['prism','#46cfe9','#fff6c5'],'fire+light':['solar','#ff8738','#fff4aa'],'light+wind':['lightArrow','#d4fbc4','#fff2a8'],'earth+light':['rune','#d9ad53','#fff5b8'],
    'dark+water':['abyss','#6040ad','#80c6e6'],'dark+fire':['soul','#c32b9a','#ffb370'],'dark+wind':['void','#764be0','#d9b4ff'],'dark+earth':['chain','#665185','#c99cf1'],
    'fire+water':['lava','#ee4b24','#ffcc59'],'water+wind':['ice','#68b7e4','#e6fcff'],'earth+water':['mud','#735332','#c6b481'],'fire+wind':['firestorm','#ff7328','#ffe5a0'],'earth+fire':['shell','#ff6e2c','#ffc470'],'earth+wind':['sand','#bc955d','#f2d9a0'],
    'fire+water+wind':['lavastorm','#ff6435','#ffe2a2'],'earth+fire+water':['eruption','#e94d20','#ffc772'],'earth+water+wind':['frost','#85c9e9','#edffff'],'earth+fire+wind':['meteor','#ed682f','#ffcf79'],
  };
  const [kind,color,accent]=profiles[key]||['rune','#d9b866','#fff4c4'];return {key,kind,color,accent,tier:t.tier||1};
}
const energy=(c,opacity=1)=>new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(1.05),transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
const solid=(c,metalness=0.1)=>new THREE.MeshStandardMaterial({color:c,roughness:0.42,metalness});
function part(g,shape,mat,scale,pos=[0,0,0],rot=[0,0,0]) {
  const m=new THREE.Mesh(shape,mat);m.scale.set(...scale);m.position.set(...pos);m.rotation.set(...rot);g.add(m);return m;
}
const sphere=()=>geo('attackSphere',()=>new THREE.SphereGeometry(1,16,10));
const crystal=()=>geo('attackCrystal',()=>new THREE.OctahedronGeometry(1));
const ring=()=>geo('attackRing',()=>new THREE.TorusGeometry(1,0.045,5,32));
const cone=()=>geo('attackCone',()=>new THREE.ConeGeometry(1,1,12));
const cylinder=()=>geo('attackCylinder',()=>new THREE.CylinderGeometry(1,1,1,10));
const arc=()=>geo('attackArc',()=>new THREE.TorusGeometry(1,0.055,5,32,PI*1.4));
export function disposeAttack(root) {
  const mats=new Set();root.traverse(o=>{if(o.material)for(const m of [].concat(o.material))mats.add(m);if(o.userData.ownedGeometry)o.geometry.dispose();});mats.forEach(m=>m.dispose());
}
export function buildAttackProjectile(t) {
  const profile=attackProfile(t),{kind,color,accent}=profile,g=new THREE.Group(),spinners=[];
  const hot=energy(color),bright=energy(accent),skin=solid(color),metal=solid('#343640',0.85);
  // Keep the X axis as the direction of travel, so every projectile follows its arc.
  if(['arrow','lightArrow'].includes(kind)) {
    part(g,cylinder(),kind==='arrow'?solid('#705032'):bright,[0.008,0.38,0.008],[0,0,0],[0,0,PI/2]);
    part(g,cone(),kind==='arrow'?solid('#c8d6de',0.8):bright,[0.035,0.09,0.025],[0.22,0,0],[0,0,-PI/2]);
    for(let i=0;i<3;i++)part(g,cone(),skin,[0.045,0.11,0.012],[-0.14,0,0],[i*PI*2/3,0,PI/2]);
  } else if(['cannon','shell','stone','meteor','mud','eruption'].includes(kind)) {
    const rock=['stone','meteor','mud','eruption'].includes(kind);
    part(g,rock?geo('attackRock',()=>new THREE.DodecahedronGeometry(1,1)):sphere(),rock?skin:metal,[0.115,0.09,0.09]);
    if(kind!=='cannon'&&kind!=='mud')for(let i=0;i<3;i++)spinners.push(part(g,arc(),hot,[0.105,0.105,0.105],[0,0,0],[i*PI/3,PI/2,0]));
    if(kind==='shell')part(g,cone(),bright,[0.045,0.08,0.045],[0.12,0,0],[0,0,-PI/2]);
  } else if(['ice','frost','prism'].includes(kind)) {
    part(g,crystal(),bright,[0.19,0.06,0.06]);
    for(let i=0;i<5;i++){const a=i*PI*2/5;part(g,crystal(),hot,[0.11,0.022,0.022],[-0.08,Math.cos(a)*0.085,Math.sin(a)*0.085]);}
  } else if(kind==='wind'||kind==='sand') {
    for(let i=0;i<3;i++)spinners.push(part(g,arc(),i===1?bright:hot,[0.11,0.11,0.11],[-i*0.045,0,0],[0,PI/2,i*PI*2/3]));
  } else if(kind==='chain') {
    part(g,crystal(),skin,[0.1,0.08,0.08]);
    for(let i=0;i<7;i++)part(g,ring(),i%2?metal:hot,[0.037,0.022,0.037],[-0.09-i*0.045,0,0],[i%2?PI/2:0,PI/2,0]);
  } else if(['curse','abyss','void','eclipse'].includes(kind)) {
    part(g,sphere(),solid('#120e28',0.4),[0.085,0.085,0.085]);
    for(let i=0;i<3;i++)spinners.push(part(g,arc(),i===2?bright:hot,[0.13+i*0.015,0.13+i*0.015,0.13+i*0.015],[0,0,0],[i*PI/3,PI/2,0]));
    for(let i=0;i<5;i++){const a=i*PI*2/5;part(g,crystal(),hot,[0.035,0.012,0.012],[0,Math.cos(a)*0.16,Math.sin(a)*0.16]);}
  } else if(kind==='water') {
    part(g,sphere(),new THREE.MeshPhysicalMaterial({color,metalness:0,roughness:0.12,transparent:true,opacity:0.78,clearcoat:1}),[0.13,0.085,0.085]);
    part(g,sphere(),bright,[0.06,0.022,0.028],[0.025,0.03,0.03]);
    for(let i=0;i<4;i++)part(g,sphere(),hot,[0.025,0.025,0.025],[-0.14-i*0.035,Math.sin(i)*0.05,Math.cos(i)*0.03]);
  } else {
    part(g,crystal(),bright,[0.11,0.065,0.065]);
    for(let i=0;i<5;i++){const a=i*PI*2/5;part(g,cone(),hot,[0.04,0.26,0.03],[-0.13,Math.cos(a)*0.055,Math.sin(a)*0.055],[a,0,PI/2]);}
  }
  // Unused role materials still belong to this instance, and must be released too.
  const used=new Set();g.traverse(o=>{if(o.material)used.add(o.material);});for(const mat of [hot,bright,skin,metal])if(!used.has(mat))mat.dispose();
  if(profile.key.split('+').includes('light'))g.traverse(o=>{if(o.material?.isMeshBasicMaterial)o.material.color.multiplyScalar(0.75);});
  g.scale.setScalar(0.85+profile.tier*0.12);
  return {group:g,profile,update(time){spinners.forEach((m,i)=>{m.rotation.x=time*(i%2?-5:5)+i;});},dispose(){disposeAttack(g);}};
}
export function buildAttackTrail(profile) {
  const geometry=new THREE.BufferGeometry(),positions=new Float32Array(18*6),colors=new Float32Array(18*6),head=new THREE.Color(profile.accent),tail=new THREE.Color(profile.color);
  for(let i=0;i<18;i++)for(let side=0;side<2;side++){const c=tail.clone().lerp(head,1-i/18).multiplyScalar(1-i/18);colors.set([c.r,c.g,c.b],i*6+side*3);}
  const indices=[];for(let i=0;i<17;i++){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setIndex(indices);
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0.46,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false}));mesh.frustumCulled=false;mesh.userData.ownedGeometry=true;
  if(profile.key.split('+').includes('light'))mesh.material.opacity*=0.75;
  const points=[];let accumulator=0;
  return {mesh,update(position,dt){accumulator+=dt;if(!points.length)for(let i=0;i<18;i++)points.push(position.clone());if(accumulator>=1/60){accumulator%=1/60;points.unshift(position.clone());points.length=18;}const width=['arrow','lightArrow'].includes(profile.kind)?0.012:0.038;for(let i=0;i<18;i++){const p=points[i],w=width*(1-i/18);positions.set([p.x,p.y-w,p.z,p.x,p.y+w,p.z],i*6);}geometry.attributes.position.needsUpdate=true;},dispose(){geometry.dispose();mesh.material.dispose();}};
}
export function buildAttackBurst(profile,position,phase='impact') {
  const g=new THREE.Group();g.position.copy(position);const bits=[],rings=[],inward=['curse','abyss','void','eclipse','chain'].includes(profile.kind),wet=['water','prism','ice','frost'].includes(profile.kind),muzzle=phase==='muzzle';
  const hot=energy(profile.color),bright=energy(profile.accent),dust=solid(profile.color);
  const burning=['fire','soul','lava','shell','meteor','eruption','solar','firestorm','lavastorm'].includes(profile.kind);
  const count=muzzle?6:profile.kind==='shell'?18:12;
  for(let i=0;i<count;i++) {
    const a=i/count*PI*2,dir=new THREE.Vector3(Math.cos(a),0.3+(i%3)*0.2,Math.sin(a));
    const m=part(g,wet?crystal():inward?cone():profile.kind==='stone'||profile.kind==='shell'?crystal():sphere(),i%3===0?bright:inward||burning?hot:dust,[0.025,wet?0.085:0.025,0.025]);m.rotation.set(a,0,a);bits.push({m,dir});
  }
  for(let i=0;i<(muzzle?1:2);i++)rings.push(part(g,ring(),i?bright:hot,[0.05,0.05,0.05],[0,0,0],[PI/2,0,0]));
  if(inward)rings[0].rotation.x=0;
  if(profile.kind==='stone'&&!muzzle)for(let i=0;i<5;i++) {
    const a=i*PI*2/5;part(g,crystal(),bright,[0.025,0.025,0.025],[Math.cos(a)*0.17,0.45,Math.sin(a)*0.17]);
  }
  if(profile.kind==='chain'&&!muzzle)for(let side=0;side<3;side++)for(let i=0;i<6;i++) {
    const a=side*PI*2/3,m=part(g,ring(),hot,[0.045,0.028,0.045],[Math.cos(a)*0.2,i*0.07-0.15,Math.sin(a)*0.2],[0,a,i%2*PI/2]);
    // Vertical chains encircle the target instead of radiating like a normal hit.
    m.userData.binding=true;
  }
  const used=new Set();g.traverse(o=>{if(o.material)used.add(o.material);});for(const mat of [hot,bright,dust])if(!used.has(mat))mat.dispose();
  if(profile.key.split('+').includes('light'))used.forEach(mat=>{if(mat.isMeshBasicMaterial)mat.color.multiplyScalar(0.75);});
  const life=muzzle?0.24:inward?0.7:0.5;
  return {obj:g,life,max:life,update(k){const t=1-k,r=muzzle?0.25:wet?0.65:0.5;bits.forEach(({m,dir},i)=>{m.position.copy(dir).multiplyScalar((inward?k:t)*r);m.position.y-=inward?0:t*t*0.3;m.rotation.z=t*3+i;});rings.forEach((m,i)=>{m.scale.setScalar(0.05+(inward?k:t)*r*(1+i*0.35));m.rotation.z=t*(i?3:-3);});used.forEach(m=>{m.transparent=true;m.opacity=k*k;});},dispose(){disposeAttack(g);}};
}
