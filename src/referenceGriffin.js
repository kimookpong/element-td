import { G } from './modelkit.js';

export function sculptReferenceGriffin(rig) {
  for(const part of rig.parts.values())part.geos.forEach(g=>g.dispose());
  rig.parts.clear();
  const B=rig.bones,b=B.body;
  const add=(bone,role,...geos)=>rig.add(bone,role,...geos);
  const plume=(bone,role,a,c,width)=>add(bone,role,G.tube([a,[(a[0]+c[0])*.5,(a[1]+c[1])*.5,(a[2]+c[2])*.5],c],t=>width*(1-t)*(.6+.65*Math.sin(t*Math.PI)),{},4,4));
  add(b,'body',G.ell(.27,.135,.125,{x:-.035},8),G.ell(.12,.19,.13,{x:.15,y:.065},8));
  B.neck.position.set(.18,.13,0); B.head.position.set(.045,.17,0);
  add(B.neck,'belly',G.tube([[0,-.03,0],[.015,.08,0],[.045,.17,0]],[.12,.076],{},5,6));
  add(B.head,'belly',G.ell(.092,.073,.073,{},7));
  add(B.head,'gold',G.ell(.054,.029,.052,{x:.067,y:-.003},6));
  add(B.head,'dark',G.tube([[.075,.005,0],[.135,-.02,0],[.15,-.068,0]],[.046,.005],{},4,5));
  for(let row=0;row<4;row++)for(let i=0;i<9;i++) {
    const angle=i/9*Math.PI*2,r=.077+row*.01;
    const a=[-.01-row*.02,.085-row*.04,0];
    a[1]+=Math.cos(angle)*r*.5;a[2]=Math.sin(angle)*r;
    plume(B.head,'belly',a,[a[0]-.105-row*.012,a[1]-.055-row*.027,a[2]*1.22],.026);
  }
  for(const side of [-1,1]) {
    for(let i=0;i<5;i++)plume(B.head,'belly',[-.02+i*.018,.052,side*.045],[-.12+i*.023,.095,side*.052],.022);
    for(let row=0;row<3;row++)for(let i=0;i<5;i++) {
      const z=side*(.015+i*.019);
      plume(B.neck,'belly',[.08,.115-row*.05,z],[.105,.015-row*.073,z*1.22],.025);
    }
  }
  for(const name of ['fl','fr','bl','br']) {
    const hip=B[name],knee=B[name+'K'],back=name.startsWith('b');
    hip.position.set(back?-.18:.16,-.035,(name.endsWith('l')?1:-1)*.095);
    hip.rotation.z=0;hip.userData.rest.z=0;knee.rotation.z=0;knee.position.y=-.13;
    add(hip,'body',G.ell(back?.075:.049,.085,.052,{y:-.033},6),G.tube([[0,0,0],[.012,-.07,0],[.008,-.13,0]],[.04,.027],{},4,5));
    add(knee,'body',G.tube([[0,0,0],[-.006,-.065,0],[.015,-.135,0]],[.026,.019],{},4,5));
    for(const y of [-.032,-.094])add(knee,'belly',G.cyl(.029,.03,.029,{y},6));
    add(knee,'dark',G.ell(.048,.024,.036,{x:.024,y:-.14},6));
    for(const z of [-.026,0,.026])add(knee,'dark',G.cone(.012,.055,{x:.07,y:-.146,z,rz:-Math.PI/2-.2},4));
  }
  for(const name of ['wingL','wingR']) {
    const w=B[name],side=w.userData.side;
    w.position.set(.015,.085,side*.1);
    add(w,'body',G.tube([[0,0,0],[-.015,.25,side*.17],[-.045,.54,side*.37]],[.045,.021],{},5,5));
    for(let layer=0;layer<3;layer++)for(let i=0;i<11;i++) {
      const t=i/10,a=[-.02-layer*.015,.13+t*.4,side*(.07+t*.31)];
      const len=(.23+Math.sin(t*Math.PI*.8)*.2)*(1-layer*.25);
      plume(w,layer===0?'feather':layer===1?'feather2':'body',a,[a[0]-len*.6,a[1]-len,a[2]+side*len*.44],layer===0?.035:.03);
    }
    for(let i=0;i<7;i++)plume(w,'belly',[-.04,.42+i*.017,side*(.25+i*.02)],[-.12,.35+i*.015,side*(.28+i*.025)],.021);
  }
  B.tail0.position.set(-.27,0,0);B.tail0.rotation.z=.3;
  B.tail1.position.set(-.18,-.045,0);B.tail1.rotation.z=-1.35;
  add(B.tail0,'body',G.tube([[0,0,0],[-.08,-.045,0],[-.18,-.045,0]],[.024,.017],{},5,5));
  add(B.tail1,'body',G.tube([[0,0,0],[-.09,0,0],[-.17,.035,0]],[.017,.012],{},5,5));
  add(B.tail1,'dark',G.ico(.043,{x:-.17,y:.035,s:[1.3,1,1]}));
  // Teal harness and suspended heraldic ornaments, separate from the plumage.
  add(b,'cloth',G.torus(.136,.017,{x:.125,ry:Math.PI/2,s:[1,1,1.18]}));
  for(const side of [-1,1]) {
    add(b,'cloth',G.box(.055,.24,.009,{x:.2,y:-.02,z:side*.14}));
    add(b,'gold',G.box(.012,.25,.012,{x:.17,y:-.02,z:side*.149}),G.box(.012,.25,.012,{x:.23,y:-.02,z:side*.149}),G.octa(.034,{x:.2,y:.043,z:side*.153,s:[.75,1,.25]}));
    add(b,'cloth',G.box(.028,.13,.007,{x:.2,y:-.2,z:side*.143}));
  }
}
