import * as THREE from 'three';
import { BATTLE_LOOK } from '../src/battleFantasy.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildTowerModel } from '../src/models.js';
import { buildCreatureModel } from '../src/creatures.js';
import { TOWER_KEYS, TOWERS } from '../src/towers.js';
import { BASIC, ELEMENT_ORDER, MAPS } from '../src/data.js';
import { parseMap } from '../src/sim.js';
import { buildWorld } from '../src/world.js';
import { zoneTexture } from '../src/vfx.js';
import { buildAttackStage } from './attack-preview.js';
import { zoneSurface } from '../src/skillMaterials.js';
const host=document.querySelector('#view'),modeControl=document.querySelector('#mode'),itemControl=document.querySelector('#item'),tierControl=document.querySelector('#tier');
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=BATTLE_LOOK.exposure;
renderer.shadowMap.enabled=true;host.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x111a24);
const env=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),envTarget=pmrem.fromScene(env,0.04);
scene.environment=envTarget.texture;scene.environmentIntensity=0.5;env.dispose();pmrem.dispose();
const camera=new THREE.PerspectiveCamera(38,1,0.1,400);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=1;controls.maxDistance=100;
const hemi=new THREE.HemisphereLight(0xd7e8ff,0x37443b,BATTLE_LOOK.studioHemi);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffecd2,BATTLE_LOOK.studioSun);sun.position.set(-6,12,7);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-16,right:16,top:12,bottom:-12,far:40});sun.shadow.normalBias=0.018;scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0x1b2835,roughness:0.8}));floor.rotation.x=-Math.PI/2;floor.position.y=-0.03;floor.receiveShadow=true;scene.add(floor);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));composer.addPass(new UnrealBloomPass(new THREE.Vector2(512,512),BATTLE_LOOK.bloom,0.35,BATTLE_LOOK.bloomThreshold));composer.addPass(new OutputPass());
const abilities=['normal','fast','armored','regen','split','child','undead','flying','boss','elemental'];
const creatureLabels=['Fenrir · หมาป่าผลึก','Celestial Unicorn · ยูนิคอร์น','Dragon Turtle · เต่ามังกร','Hydra · ไฮดรา','Kitsune · จิ้งจอกเก้าหาง','Kitsune · ร่างลูก','Phoenix · ฟีนิกซ์','Griffin · กริฟฟิน','Ancient Dragon · มังกรโบราณ','Elemental Dragon · ภูตธาตุ'];
let display=new THREE.Group(),animate=[],owned=[],mapMode=false;scene.add(display);
const worlds=new Map();
let attackStage=null;
function options() {
  const mode=modeControl.value;
  let entries=(mode==='towers'||mode==='attacks'||mode==='progression')?[...Object.keys(BASIC).map(key=>[key,BASIC[key].th||key]),...TOWER_KEYS.map(key=>[key,TOWERS[key].th])]:mode==='creatures'?abilities.map((key,i)=>[key,creatureLabels[i]]):mode==='maps'?MAPS.map((map,i)=>[String(i),map.name]):['lava','mud','abyss','void'].map(key=>[key,key]);
  itemControl.replaceChildren();
  if(mode==='attacks')entries=entries.filter(([key])=>TOWERS[key]||['arrow','cannon'].includes(key));
  if(mode!=='maps'&&mode!=='attacks'&&mode!=='progression')entries=[['all','ทั้งหมด'],...entries];
  for(const [value,text] of entries){const o=document.createElement('option');o.value=value;o.textContent=text;itemControl.appendChild(o);}
  itemControl.value=(mode==='towers'||mode==='attacks'||mode==='progression')?'light':mode==='creatures'?'boss':mode==='zones'?'all':'0';
  document.querySelector('#tierLabel').hidden=mode!=='towers'&&mode!=='attacks';
}
function label(text,x,z) {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=64;
  const ctx=canvas.getContext('2d');ctx.font='24px system-ui';ctx.fillStyle='#eadfc8';ctx.textAlign='center';ctx.fillText(text,256,42);
  const texture=new THREE.CanvasTexture(canvas),material=new THREE.SpriteMaterial({map:texture,depthWrite:false});owned.push(texture,material);
  const sprite=new THREE.Sprite(material);sprite.position.set(x,0.025,z+0.85);sprite.scale.set(2.1,0.27,1);display.add(sprite);
}
function rebuild() {
  attackStage?.dispose();attackStage=null;
  scene.remove(display);owned.forEach(o=>o.dispose());owned=[];animate=[];display=new THREE.Group();scene.add(display);
  const tier=Number(tierControl.value),mode=modeControl.value,item=itemControl.value;
  mapMode=mode==='maps';floor.visible=!mapMode;scene.fog=null;
  hemi.color.set(0xd7e8ff);hemi.groundColor.set(0x695848);hemi.intensity=BATTLE_LOOK.studioHemi;sun.color.set(0xffecd2);sun.intensity=BATTLE_LOOK.studioSun;
  const status=document.querySelector('#status');
  if(mode==='progression') {
    for(let level=1;level<=3;level++){
      const spec=BASIC[item]?{kind:'basic',base:item,tier:level}:{kind:'element',elements:item.split('+'),tier:level};
      const view=buildTowerModel(spec),x=(level-2)*1.5;view.group.position.set(x,0,0);display.add(view.group);animate.push((dt,t)=>view.anims.forEach(fn=>fn(t,dt,0)));label('Level '+level,x,0);
    }status.textContent=(TOWERS[item]?.th||BASIC[item]?.th||item)+' · อาคารระดับ 1 → 2 → 3';
  } else if(mode==='attacks') {
    attackStage=buildAttackStage(item,tier);display.add(attackStage.group);animate.push((dt,t)=>attackStage.update(dt,t));
    status.textContent=(TOWERS[item]?.th||BASIC[item]?.th||item)+' · ระดับ '+tier+'\n'+(TOWERS[item]?.attack||'กระสุนจริง พร้อมรอยทางและแรงกระทบ');
  } else if(mode==='towers') {
    const keys=[...Object.keys(BASIC),...TOWER_KEYS].filter(key=>item==='all'||key===item);
    keys.forEach((key,i)=>{
      const spec=BASIC[key]?{kind:'basic',base:key,tier}:{kind:'element',elements:key.split('+'),tier};
      const view=buildTowerModel(spec),x=item==='all'?(i%7-3)*2.2:0,z=item==='all'?(Math.floor(i/7)-2)*2.5:0;
      view.group.position.set(x,0,z);display.add(view.group);animate.push((dt,t)=>view.anims.forEach(fn=>fn(t,dt,0)));
      if(item==='all')label(key,x,z);
    });
    status.textContent=item==='all'?`31 แบบ · ระดับ ${tier}`:`${TOWERS[item]?.th||BASIC[item]?.th||item}\nระดับ ${tier} · สถาปัตยกรรมและกลไกใหม่`;
  } else if(mode==='creatures') {
    abilities.forEach((ability,i)=>{
      if(item!=='all'&&item!==ability)return;
      const view=buildCreatureModel({ability,element:ELEMENT_ORDER[i%6],size:18});
      view.group.position.set(item==='all'?(i%5-2)*2.4:0,0,item==='all'?(Math.floor(i/5)-0.5)*3:0);view.group.traverse(o=>{if(o.isMesh){o.castShadow=!['glow','eye','membrane'].includes(o.userData.role);o.receiveShadow=true;}});display.add(view.group);owned.push(...view.mats);
      animate.push((dt,t)=>view.anim(dt,t,1));if(item==='all')label(view.model,view.group.position.x,view.group.position.z);
    });
    status.textContent=item==='all'?'8 สายพันธุ์ · 10 รูปแบบ':`${creatureLabels[abilities.indexOf(item)]}\nกายวิภาค เกล็ด ขน และใบหน้าใหม่`;
  } else if(mode==='maps') {
    const index=Number(item),def=MAPS[index];
    if(!worlds.has(index))worlds.set(index,buildWorld(parseMap(def),def.theme));
    const world=worlds.get(index);display.add(world.group);animate.push((dt,t)=>world.update(t));
    const th=world.theme;scene.fog=new THREE.Fog(th.fog,30,85);hemi.color.set(th.hemiSky);hemi.groundColor.set(th.hemiGround);hemi.intensity=th.hemiI;sun.color.set(th.sun);sun.intensity=th.sunI;
    status.textContent=def.name+'\nภูมิประเทศและพืชพรรณหลายชั้น';
  } else {
    const kinds=['lava','mud','abyss','void'].filter(kind=>item==='all'||kind===item);
    kinds.forEach((kind,i)=>{
      const mat=zoneSurface(kind,zoneTexture(kind));mat.uniforms.opacity.value=0.96;
      const geometry=new THREE.PlaneGeometry(2.7,2.7);owned.push(mat,geometry);
      const mesh=new THREE.Mesh(geometry,mat);mesh.rotation.x=-Math.PI/2;mesh.position.set(item==='all'?(i-1.5)*3:0,0.03,0);display.add(mesh);
      animate.push((dt,t)=>mat.uniforms.time.value=t);if(item==='all')label(kind,mesh.position.x,0.9);
    });status.textContent='ลาวา · โคลน · คำสาป · วังวนสูญญะ';
  }
  frameDisplay();
}
function frameDisplay() {
  const bounds=mapMode?new THREE.Box3(new THREE.Vector3(-12,-0.5,-8),new THREE.Vector3(12,2,8)):new THREE.Box3().setFromObject(display);
  const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  const distance=Math.max(size.x/camera.aspect,size.z,size.y*1.4,itemControl.value==='all'?7:1.7)/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))*(mapMode?1.12:1.32);
  controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(mapMode?0.15:1,mapMode?1.3:0.7,1.6).normalize().multiplyScalar(distance));controls.update();
}
function resize(){renderer.setSize(host.clientWidth,host.clientHeight);composer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();if(display.children.length)frameDisplay();}
modeControl.onchange=()=>{options();rebuild();};itemControl.onchange=rebuild;tierControl.onchange=rebuild;
const params=new URLSearchParams(location.search);if(params.has('mode'))modeControl.value=params.get('mode');options();if(params.has('item'))itemControl.value=params.get('item');if(params.has('tier'))tierControl.value=params.get('tier');
window.addEventListener('resize',resize);resize();rebuild();
let previous=performance.now(),time=0;
renderer.setAnimationLoop(()=>{const now=performance.now(),dt=Math.min((now-previous)/1000,0.05);previous=now;time+=dt;animate.forEach(fn=>fn(dt,time));controls.update();composer.render(dt);});
