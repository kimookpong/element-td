import * as THREE from 'three';
import { Renderer3D, Particles } from '../src/render3d.js';
import { buildTowerModel } from '../src/models.js';
import { buildCreatureModel } from '../src/creatures.js';
import { TOWERS } from '../src/towers.js';
import { BASIC, TILE, COLS, ROWS } from '../src/data.js';
import { attackProfile } from '../src/towerAttackArt.js';
const pixel=(x,z)=>({x:(x+COLS/2)*TILE,y:(z+ROWS/2)*TILE});
export function buildAttackStage(key,tier) {
  const group=new THREE.Group(),def=TOWERS[key],t={id:1,...(def?{kind:'element',elements:key.split('+')}:{kind:'basic',base:key,elements:[]}),tier,c:0,r:0,...pixel(-1.8,0),stats:def?def.fx(tier,100,100):{}};
  const tower=buildTowerModel(t);tower.group.position.x=-1.8;group.add(tower.group);
  const profile=attackProfile(t),targets=[];
  for(let i=0;i<3;i++) {
    const creature=buildCreatureModel({ability:'normal',element:'earth',size:18});
    creature.group.position.set(1.5+i*0.7,0,(i-1)*0.8);group.add(creature.group);targets.push({view:creature,...pixel(1.5+i*0.7,(i-1)*0.8),fly:false});
  }
  const fx=Object.create(Renderer3D.prototype);Object.assign(fx,{dynamic:new THREE.Group(),effects:[],projViews:new Map(),towerViews:new Map([[1,tower]]),particles:new Particles(800),time:0,tileGround:()=>0,groundAt:()=>0});group.add(fx.dynamic,fx.particles.points);
  const game={time:0,projectiles:[],zones:[],movers:[],delayed:[]};let cooldown=0,id=1;
  function fire() {
    const dst=targets[0],base={tower:t,x1:t.x,y1:t.y,x2:dst.x,y2:dst.y,colors:[profile.color,profile.accent],fly:false,width:2,life:0.35};
    fx.addTowerBurst(t,new THREE.Vector3(-1.8,tower.height*0.85,0),'muzzle');
    const atk=def?.atk||'proj';
    if(['beam','ramp','pierce'].includes(atk))fx.addBeam({...base,style:profile.kind==='sun'?'sun':profile.kind==='eclipse'?'eclipse':profile.kind==='solar'?'solar':profile.kind==='frost'?'frost':'arrow',heat:(Math.sin(game.time*0.7)+1)/2});
    else if(atk==='chain')fx.addChain({tower:t,colors:base.colors,pts:targets});
    else if(atk==='pulse')fx.addPulse({tower:t,x:t.x,y:t.y,r:120});
    else if(atk==='cone')fx.addCone({tower:t,x:t.x,y:t.y,r:170,spread:0.55,angle:0});
    else if(atk==='tornado')game.movers.push({id:id++,kind:profile.kind==='lavastorm'?'lavastorm':'firestorm',x:t.x,y:t.y,t:2.3,max:2.3});
    else if(atk==='meteor'||atk==='erupt')for(let i=0;i<(atk==='meteor'?4:1);i++)game.delayed.push({id:id++,kind:atk==='meteor'?'meteor':'erupt',tower:t,x:dst.x+i*12,y:dst.y+i*15,t:0.9+i*0.12,total:0.9+i*0.12,big:i===0});
    else for(const target of (key==='wind'?targets:[dst]))game.projectiles.push({id:id++,tower:t,style:atk==='zone'?'lob':def?.proj||key,x:t.x,y:t.y,sx:t.x,sy:t.y,tx:target.x,ty:target.y,fly:false,age:0});
  }
  return {group,update(dt,time){
    game.time=fx.time=time;cooldown-=dt;if(cooldown<=0){fire();cooldown=def?.atk==='ramp'?0.17:1.8;}
    tower.anims.forEach(fn=>fn(time,dt,0));targets.forEach(e=>e.view.anim(dt,time,0));
    game.projectiles=game.projectiles.filter(p=>{p.age+=dt;const k=Math.min(1,p.age/0.75);p.x=p.sx+(p.tx-p.sx)*k;p.y=p.sy+(p.ty-p.sy)*k;if(k<1)return true;fx.addTowerBurst(t,fx.vpt(p.tx,p.ty,false),'impact');if(def?.atk==='zone')game.zones.push({id:id++,kind:t.stats.zone.kind,x:p.tx,y:p.ty,r:t.stats.zone.r,t:2.4,dur:2.4});return false;});
    game.movers=game.movers.filter(m=>{m.t-=dt;m.x+=dt*TILE*1.4;return m.t>0;});
    game.delayed=game.delayed.filter(d=>{d.t-=dt;if(d.t>0)return true;fx.addTowerBurst(t,fx.vpt(d.x,d.y,false),'impact');fx.addShockwave((d.x/TILE-COLS/2),0,(d.y/TILE-ROWS/2),profile.color,0.7);if(d.kind==='erupt')game.zones.push({id:id++,kind:'lava',x:d.x,y:d.y,r:40,t:2,dur:2});return false;});
    game.zones=game.zones.filter(z=>{z.t-=dt;return z.t>0;});
    fx.syncProjectiles(game,dt);fx.syncZones(game,dt);fx.syncMovers(game,dt);fx.syncDelayed(game,dt);
    fx.effects=fx.effects.filter(e=>{e.life-=dt;if(e.life<=0){fx.dynamic.remove(e.obj);if(e.dispose)e.dispose();else e.obj.traverse(o=>o.material?.dispose());return false;}e.update(e.life/e.max);return true;});fx.particles.update(dt);
  },dispose(){for(const v of fx.projViews.values()){v.art.dispose();v.ribbon.dispose();}for(const e of fx.effects){if(e.dispose)e.dispose();else e.obj.traverse(o=>o.material?.dispose());}fx.clearVfx();targets.forEach(e=>e.view.mats.forEach(m=>m.dispose()));fx.particles.geometry.dispose();fx.particles.material.dispose();}};
}
