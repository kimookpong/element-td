import { G } from './modelkit.js';

// Solid curved feathers retain volume from either side while the rig flaps.
export function sculptReferencePhoenix(rig) {
  for(const part of rig.parts.values())part.geos.forEach(g=>g.dispose());
  rig.parts.clear();
  const B=rig.bones,b=B.body;
  const add=(bone,role,...geos)=>rig.add(bone,role,...geos);
  const feather=(bone,role,points,w)=>add(bone,role,G.tube(points,t=>w*Math.sin(Math.PI*(.12+.88*t)),{},10,6));
  add(b,'body',G.ell(.16,.145,.09,{x:-.035,rz:-.45},16),G.ell(.09,.13,.092,{x:.045,y:.055},14));
  B.neck.position.set(.085,.13,0);B.head.position.set(.045,.16,0);
  add(B.neck,'body',G.tube([[0,-.02,0],[-.015,.08,0],[.045,.16,0]],[.063,.036],{},12,8));
  add(B.head,'body',G.ell(.061,.05,.044,{},14));
  add(B.head,'gold',G.tube([[.038,0,0],[.085,-.008,0],[.097,-.042,0]],[.023,.002],{},8,6));
  for(let i=0;i<5;i++) {
    const z=(i-2)*.015;
    feather(B.head,i%2?'gold':'feather2',[[.01,.033,z],[-.046,.062,z*1.2],[-.12-i*.009,.067,z*1.5],[-.145-i*.009,.11,z*1.5]],.019);
  }
  for(let row=0;row<5;row++)for(let i=0;i<10;i++) {
    const a=i/10*Math.PI*2,r=.065+row*.008;
    const y=.1-row*.047,x=.06-row*.012,z=Math.sin(a)*r;
    feather(B.neck,row<2?'gold':'feather2',[[x+Math.cos(a)*r*.3,y,z],[x-.013,y-.055,z*1.15],[x-.035,y-.11,z*1.12]],.018);
  }
  for(const side of [-1,1])for(let row=0;row<4;row++)for(let i=0;i<7;i++) {
    const x=.1-i*.039,y=.055-row*.033,z=side*(.064+Math.sin(i/6*Math.PI)*.015);
    feather(b,(row+i)%4===0?'feather2':'body',[[x,y,z],[x-.033,y-.015,z*1.12],[x-.074,y-.025,z]],.019);
  }
  for(const name of ['wingL','wingR']) {
    const w=B[name],s=w.userData.side;
    w.position.set(.015,.09,s*.055);
    add(w,'body',G.tube([[0,0,0],[-.045,.16,s*.19],[-.07,.36,s*.33]],[.035,.02],{},10,7));
    for(let i=0;i<13;i++) {
      const t=i/12,a=[-.02-t*.065,.055+t*.28,s*(.055+t*.27)];
      const len=.23+t*.28;
      feather(w,i%3===0?'feather2':'feather',[a,[a[0]-.06,a[1]+len*.28,a[2]+s*len*.3],[a[0]-.1,a[1]+len*.78,a[2]+s*len*.48],[a[0]-.09,a[1]+len,a[2]+s*len*.46]],.042);
    }
    for(let layer=0;layer<2;layer++)for(let i=0;i<12;i++) {
      const t=i/11,a=[.01-layer*.017,.035+t*.3,s*(.045+t*.29)];
      feather(w,layer===0?'gold':'feather2',[a,[a[0]-.034,a[1]+.035,a[2]+s*.07],[a[0]-.055,a[1]+.11,a[2]+s*.13]],.021);
    }
  }
  for(const side of [-1,1]) {
    add(b,'gold',G.tube([[.035,-.08,side*.036],[.024,-.165,side*.039],[.055,-.2,side*.042]],[.015,.012],{},6,6));
    for(let i=0;i<3;i++)add(b,'gold',G.tube([[.05,-.2,side*.04],[.085,-.208,side*.04+(i-1)*.02],[.079,-.236,side*.04+(i-1)*.02]],[.009,.002],{},6,5));
  }
  for(let k=0;k<3;k++) {
    const a=B['tail'+k+'_0'],c=B['tail'+k+'_1'],s=k-1;
    a.position.set(-.14,-.07,s*.035);a.rotation.z=0;
    c.position.set(-.12,-.16,0);c.rotation.z=0;
    for(let j=0;j<3;j++) {
      const z=(j-1)*.025;
      feather(a,j===1?'gold':'feather',[[0,0,z],[-.07,-.05,z+s*.012],[-.12,-.16,z+s*.025]],.021);
      feather(c,j===1?'feather2':'feather',[[0,0,z],[-.11,-.14,z+s*.02],[-.12,-.29,z+s*.05],[-.035,-.34,z+s*.055],[.02,-.28,z+s*.055]],.042);
    }
  }
}
