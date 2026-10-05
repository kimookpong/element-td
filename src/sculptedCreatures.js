import { G } from './modelkit.js';
import { sculptReferenceDragon } from './referenceDragon.js';
import { sculptReferenceGriffin } from './referenceGriffin.js';
import { sculptReferencePhoenix } from './referencePhoenix.js';
import { sculptReferenceKitsune } from './referenceKitsune.js';
import { sculptReferenceHydra } from './referenceHydra.js';
import { sculptReferenceUnicorn } from './referenceUnicorn.js';
import { sculptReferenceTurtle } from './referenceTurtle.js';
import { sculptReferenceWolf } from './referenceWolf.js';
const PI=Math.PI;
function clearRoles(rig,bone,roles=null) {
  for(const [key,part] of rig.parts) if(part.bone===bone&&(!roles||roles.includes(part.role))) {
    part.geos.forEach(g=>g.dispose());rig.parts.delete(key);
  }
}
function tuft(rig,bone,x,y,z,len,width,role='fur',side=1) {
  rig.add(bone,role,G.tube([[x,y,z],[x-len*0.45,y+width*0.2,z+side*width*0.4],[x-len,y-width*0.25,z+side*width*0.6]],t=>Math.sin((t*0.85+0.15)*PI)*width*(1-t*0.8),{},7,5));
}
function scales(rig,bone,{x0=-0.23,y=0.35,length=0.48,width=0.14,rows=4,cols=9}) {
  for(const side of [-1,1]) for(let row=0;row<rows;row++) for(let col=0;col<cols;col++) {
    const x=x0+col*length/cols+(row%2)*length/cols/2;
    const angle=(row/(rows-1)-0.5)*1.9;
    const yy=y+Math.sin(angle)*width*0.65, z=side*Math.cos(angle)*width;
    rig.add(bone,row%2?'shell2':'body',G.scalePlate(length/cols*1.18,width/rows*1.15,{x,y:yy,z,rx:side*angle,ry:side===-1?PI:0,rz:-0.1}));
    if(row===0&&col%2===0)rig.add(bone,'glow',G.crystal(0.009,0.026,{x,y:yy+0.013,z}));
  }
}
function face(rig,head,model) {
  clearRoles(rig,head);
  const bird=model==='phoenix'||model==='griffin';
  const horse=model==='unicorn';
  const reptile=['dragon','hydra','turtle'].includes(model);
  const width=model==='dragon'?0.074:horse?0.049:0.056;
  rig.add(head,'body',G.ell(0.076,0.059,width,{x:-0.012},24),G.ell(0.056,0.042,width*0.94,{x:0.046,y:-0.014},20));
  if(bird) {
    rig.add(head,'horn',G.tube([[0.04,0,0],[0.085,-0.005,0],[0.125,-0.035,0]],[0.029,0.001],{},12,10));
    for(let i=0;i<6;i++)tuft(rig,head,-0.02,0.04+i*0.003,(i-2.5)*0.013,0.13+i*0.012,0.012,'feather2',i%2?1:-1);
  } else {
    const muzzle=horse?0.115:reptile?0.125:0.1;
    rig.add(head,'body',G.tube([[0.025,-0.015,0],[0.07,-0.028,0],[muzzle,-0.037,0]],[width*0.7,width*0.44],{},12,10));
    rig.add(head,'dark',G.ell(0.015,0.011,width*0.48,{x:muzzle+0.003,y:-0.035},14));
    for(const side of [-1,1]) {
      rig.add(head,'dark',G.tube([[0.035,-0.042,side*width*0.64],[0.075,-0.045,side*width*0.51],[muzzle,-0.043,side*width*0.4]],0.0025,{},7,4));
      if(!horse)for(let k=0;k<3;k++)rig.add(head,'horn',G.cone(0.003,0.014,{x:0.055+k*0.02,y:-0.047,z:side*width*0.5,rz:PI},6));
    }
  }
  for(const side of [-1,1]) {
    if(reptile) {
      rig.add(head,'horn',G.tube([[-0.025,0.028,side*width*0.64],[-0.08,0.12,side*width*1.1],[-0.17,0.16,side*width*0.95]],[0.019,0.001],{},16,8));
      for(let k=0;k<5;k++)rig.add(head,'shell2',G.ell(0.014,0.005,0.016,{x:-0.048+k*0.022,y:0.048,z:side*0.017},10));
    } else if(!bird) {
      rig.add(head,'body',G.tube([[-0.041,0.04,side*0.035],[-0.054,0.11,side*0.052],[-0.068,0.145,side*0.055]],[0.025,0.001],{},10,7));
      rig.add(head,'belly',G.tube([[-0.045,0.052,side*0.047],[-0.057,0.112,side*0.057]],[0.013,0.001],{},8,5));
      for(let k=0;k<4;k++)tuft(rig,head,-0.02,0.005-k*0.018,side*width,0.075,0.018,'fur',side);
    }
  }
  if(horse) {
    rig.add(head,'horn',G.tube([[0.005,0.048,0],[0.037,0.16,0],[0.07,0.29,0]],t=>0.019*(1-t)*(0.9+0.1*Math.cos(t*90)),{},30,10));
    rig.add(head,'gold',G.torus(0.027,0.005,{x:0.005,y:0.058,rx:PI/2}));
    rig.add(head,'glow',G.crystal(0.014,0.065,{x:0.07,y:0.29}));
  }
  if(model==='kitsune') {
    rig.add(head,'gold',G.tube([[-0.03,0.042,-0.026],[0.012,0.051,0],[ -0.03,0.042,0.026]],0.004,{},8,5));
    rig.add(head,'glow',G.crystal(0.014,0.038,{x:0.007,y:0.057}));
  }
}
function featherWings(rig,model) {
  for(const name of ['wingL','wingR']) {
    const wing=rig.bones[name];if(!wing)continue;
    const side=wing.userData.side;
    clearRoles(rig,wing);
    const span=model==='griffin'?0.52:0.48;
    rig.add(wing,'body',G.tube([[0,0,0],[0.06,0.04,side*span*0.5],[-0.04,0.015,side*span]],[0.036,0.009],{},16,8));
    for(let layer=0;layer<3;layer++)for(let i=0;i<14-layer*3;i++) {
      const t=i/(13-layer*3), z=side*(0.03+t*span*(1-layer*0.12));
      const len=(0.2+Math.sin(t*PI*0.7)*0.16)*(1-layer*0.24),x=0.03-layer*0.035;
      rig.add(wing,i%3?'feather':'feather2',G.feather(len,0.022,{x,y:0.015+layer*0.01,z,ry:-side*(PI/2-t*0.7)}));
      rig.add(wing,'gold',G.tube([[x,0.018+layer*0.01,z],[x-len*0.55,0.02+layer*0.01,z+side*len*0.15],[x-len*0.85,0.013+layer*0.01,z+side*len*0.22]],0.0018,{},5,4));
    }
  }
}
export function resculptCreature(rig,model,variant) {
  if(model==='dragon') { sculptReferenceDragon(rig); return; }
  if(model==='griffin') { sculptReferenceGriffin(rig); return; }
  if(model==='phoenix') { sculptReferencePhoenix(rig); return; }
  if(model==='kitsune') { sculptReferenceKitsune(rig,variant); return; }
  if(model==='hydra') { sculptReferenceHydra(rig); return; }
  if(model==='unicorn') { sculptReferenceUnicorn(rig); return; }
  if(model==='turtle') { sculptReferenceTurtle(rig); return; }
  if(model==='wolf') { sculptReferenceWolf(rig); return; }
  const body=rig.bones.body;
  clearRoles(rig,body);
  const fur=['wolf','unicorn','kitsune'].includes(model);
  const bird=model==='phoenix'||model==='griffin';
  const y={wolf:0.37,unicorn:0.5,kitsune:0.32,turtle:0.25,hydra:0.3,dragon:0.41,phoenix:0,griffin:0.12}[model];
  const length=model==='dragon'?0.32:model==='turtle'?0.31:model==='phoenix'?0.17:0.25;
  const width=model==='turtle'?0.23:model==='dragon'?0.16:model==='hydra'?0.15:0.12;
  rig.add(body,'body',G.ell(length,0.12,width,{y},26),G.ell(length*0.53,0.15,width*1.08,{x:length*0.52,y:y+0.02},24),G.ell(length*0.44,0.13,width,{x:-length*0.68,y:y+0.005},24));
  rig.add(body,'belly',G.ell(length*0.77,0.055,width*0.77,{y:y-0.073},22));
  // Shoulders and haunches have separate anatomical masses, rather than a uniform capsule.
  for(const side of [-1,1]) {
    rig.add(body,'body',G.ell(0.085,0.11,0.05,{x:0.13,y:y-0.01,z:side*width*0.74,rz:-0.25},20),G.ell(0.09,0.095,0.055,{x:-0.16,y:y-0.02,z:side*width*0.7,rz:0.2},20));
    if(fur)for(let row=0;row<3;row++)for(let k=0;k<10;k++) {
      const x=length*0.65-k*length*1.4/10;
      tuft(rig,body,x,y+0.055-row*0.038,side*(width*0.79+row*0.009),0.055+(k%3)*0.012,0.013, row===0?'fur':'body',side);
    }
  }
  if(model==='wolf') {
    for(let k=0;k<9;k++)crystalSpine(rig,body,0.16-k*0.055,y+0.105,0.05+Math.sin(k/8*PI)*0.09);
    for(const side of [-1,1])for(let k=0;k<9;k++)tuft(rig,rig.bones.neck,-0.02,0.025-k*0.015,side*0.065,0.11,0.022,'fur',side);
  } else if(model==='unicorn') {
    const neck=rig.bones.neck;clearRoles(rig,neck,['mane']);
    for(let k=0;k<14;k++)tuft(rig,neck,-0.01+k*0.005,0.015+k*0.014,(k%2?1:-1)*0.01,0.13,0.009,'mane',k%2?1:-1);
    rig.add(body,'gold',G.torus(0.14,0.008,{x:0.12,y:0.49,ry:PI/2,s:[1,1.1,1]}));
  } else if(model==='turtle') {
    rig.add(body,'shell',G.ell(0.34,0.21,0.27,{y:0.29},30));
    for(let row=-2;row<=2;row++)for(let col=-2;col<=2;col++) {
      const x=col*0.107+(Math.abs(row)%2)*0.044,z=row*0.093;
      if(Math.hypot(x/0.31,z/0.25)>0.95)continue;
      const yy=0.3+0.205*Math.sqrt(Math.max(0,1-(x/0.35)**2-(z/0.28)**2));
      rig.add(body,'shell2',G.cyl(0.054,0.06,0.025,{x,y:yy,z,rx:z*1.6,rz:-x*1.3},6));
      rig.add(body,'gold',G.torus(0.045,0.003,{x,y:yy+0.015,z,rx:PI/2,s:[1,1,1]}));
      if(col===0)crystalSpine(rig,body,x,yy+0.02,0.07);
    }
    rig.add(body,'dark',G.torus(0.32,0.022,{y:0.26,rx:PI/2,s:[1,0.83,1]}));
  } else if(model==='hydra'||model==='dragon') {
    scales(rig,body,{y,length:length*1.9,x0:-length,width,rows:5,cols:11});
    for(let k=0;k<9;k++)rig.add(body,'horn',G.tube([[0.22-k*0.06,y+0.1,0],[0.19-k*0.06,y+0.18+(k%2)*0.025,0],[0.16-k*0.06,y+0.2,0]],[0.02,0.001],{},8,6));
    for(let k=0;k<8;k++)rig.add(body,'belly',G.ell(0.035,0.011,width*0.75,{x:0.2-k*0.06,y:y-0.112},12));
  } else if(bird) {
    for(let row=0;row<4;row++)for(let k=0;k<10;k++) {
      const a=k/10*PI*2;
      tuft(rig,body,0.13-row*0.065,y+Math.cos(a)*0.105,Math.sin(a)*0.09,0.09,0.013,k%3?'feather':'feather2',Math.sin(a)>0?1:-1);
    }
    featherWings(rig,model);
  }
  for(const [name,bone] of Object.entries(rig.bones)) if(name.startsWith('neck')) {
    const next=bone.children.find(child=>child.isGroup);
    if(next) {
      clearRoles(rig,bone,['body']);
      const {x,y,z}=next.position;
      const r=model==='dragon'?0.068:model==='unicorn'?0.052:model==='hydra'?0.043:0.05;
      rig.add(bone,'body',G.tube([[-0.02,-0.015,0],[x*0.4,y*0.4,z*0.4],[x,y,z]],[r*1.22,r],{},18,14));
      for(const side of [-1,1])for(let k=0;k<5;k++) {
        const t=k/5;
        if(!fur&&!bird)rig.add(bone,'belly',G.scalePlate(0.024,0.03,{x:x*t,y:y*t-r*0.72,z:side*r*0.53,rx:side*0.8,ry:side<0?PI:0}));
      }
    }
  }
  for(const [name,bone] of Object.entries(rig.bones))if(name==='jaw'||name.startsWith('hjaw')) {
    clearRoles(rig,bone);
    rig.add(bone,'body',G.tube([[0,0,0],[0.04,-0.004,0],[0.085,-0.004,0]],[0.025,0.015],{},12,10));
    for(const side of [-1,1])for(let k=0;k<3;k++)rig.add(bone,'horn',G.cone(0.003,0.012,{x:0.015+k*0.02,y:0.018,z:side*0.018},6));
  }
  // Species-specific battlefield equipment, attached to the animated skeleton.
  if(['wolf','unicorn','griffin','dragon','turtle'].includes(model)) {
    const heavy=model==='turtle'||model==='dragon';
    for(const side of [-1,1]) {
      const z=side*(width+0.012);
      rig.add(body,'armor',G.scalePlate(heavy?0.16:0.12,heavy?0.15:0.11,{x:0.12,y:y+0.06,z,rx:side*0.35,ry:side<0?PI:0}));
      rig.add(body,'trim',G.tube([[0.18,y+0.12,z],[0.12,y+0.015,z*1.05],[0.06,y+0.08,z]],0.004,{},8,4));
      if(model==='wolf'||heavy)for(let k=0;k<3;k++)rig.add(body,'armor',G.cone(0.012,0.08+k*0.013,{x:0.14-k*0.045,y:y+0.15,z:side*width*0.75,rz:0.35},5));
    }
    for(const x of [-0.1,0.08])rig.add(body,'leather',G.torus(width*1.05,0.009,{x,y,ry:PI/2,s:[1,0.65,1]}));
  }
  if(model==='hydra')for(let k=0;k<4;k++)rig.add(body,'armor',G.scalePlate(0.095,0.11,{x:-0.13+k*0.075,y:y+0.135,rx:PI/2}));
  if(model==='kitsune')rig.add(body,'trim',G.torus(0.11,0.009,{x:0.14,y:y+0.03,ry:PI/2}));
  const heads=model==='hydra' ?[0,1,2].map(i=>rig.bones['hhead'+i]):[rig.bones.head];
  heads.forEach(head=>face(rig,head,model));
  // Fine scales on animated neck segments and thigh plates keep details attached during movement.
  if(model==='dragon'||model==='hydra')for(const [name,bone] of Object.entries(rig.bones))if(name.startsWith('neck')) {
    for(let k=0;k<5;k++)for(const side of [-1,1])rig.add(bone,'shell2',G.scalePlate(0.028,0.022,{x:k*0.019,y:0.02+k*0.015,z:side*(0.046-k*0.003),ry:side===-1?PI:0}));
  }
  for(const name of ['fl','fr','bl','br']) {
    const limb=rig.bones[name];if(!limb)continue;
    for(let k=0;k<3;k++)rig.add(limb,fur?'fur':'shell2',G.ell(0.04-k*0.007,0.025,0.033-k*0.005,{x:0.01,y:-0.025-k*0.032,z:0.005},12));
  }
  if(model==='dragon')for(const name of ['wingL','wingR']) {
    const wing=rig.bones[name],side=wing.userData.side;
    // New longer wing silhouette, with sculpted branching membrane veins.
    wing.scale.set(1.08,1,1.23);
    for(let finger=0;finger<4;finger++)for(let k=0;k<4;k++) {
      const z=side*(0.13+k*0.075),x=-0.03-finger*0.06-k*0.012;
      rig.add(wing,'body',G.tube([[x,0.065,z],[x-0.04,0.065,z+side*0.02],[x-0.075,0.06,z+side*0.03]],[0.003,0.001],{},5,4));
    }
  }
  if(model==='kitsune'&&variant==='child') body.scale.setScalar(0.86);
}
function crystalSpine(rig,bone,x,y,h) {
  rig.add(bone,'shell2',G.crystal(0.022,h,{x,y:y+h*0.35,rz:0.22}));
  rig.add(bone,'glow',G.crystal(0.006,h*0.7,{x,y:y+h*0.35,rz:0.22}));
}
