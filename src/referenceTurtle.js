import { G } from './modelkit.js';

export function sculptReferenceTurtle(rig) {
  for(const p of rig.parts.values())p.geos.forEach(g=>g.dispose());rig.parts.clear();
  const B=rig.bones,b=B.body,add=(bone,role,...geos)=>rig.add(bone,role,...geos);
  add(b,'body',G.ell(.34,.125,.25,{y:.2},20));
  add(b,'belly',G.ell(.32,.105,.23,{y:.16},18));
  add(b,'shell',G.ell(.35,.235,.275,{y:.285},24));
  add(b,'shell2',G.torus(.31,.027,{y:.245,rx:Math.PI/2,s:[1.16,.91,1]}));
  // Broad pyramidal scutes sit on a dark dome, leaving visible seams.
  for(let row=-2;row<=2;row++)for(let col=-2;col<=2;col++) {
    const x=col*.117+(Math.abs(row)%2)*.045,z=row*.101;
    const q=(x/.34)**2+(z/.27)**2;if(q>.9)continue;
    const y=.285+.232*Math.sqrt(1-q),h=.045+(1-q)*.055;
    add(b,'shell2',G.cyl(.072,.089,.035,{x,y,z,rx:z*1.8,rz:-x*1.6},5),G.cone(.086,h,{x,y:y+h*.42,z,rx:z*1.8,rz:-x*1.6,s:[1,1,.94]},5));
  }
  for(let i=0;i<12;i++) {
    const a=i/12*Math.PI*2;
    add(b,'shell2',G.cone(.034,.062,{x:Math.cos(a)*.335,y:.26,z:Math.sin(a)*.262,rx:Math.sin(a)*.8,rz:-Math.cos(a)*.8},4));
  }
  B.neck.position.set(.29,.24,0);B.head.position.set(.17,.07,0);
  add(B.neck,'body',G.tube([[-.04,-.01,0],[.06,.025,0],[.17,.07,0]],[.108,.082],{},14,10));
  for(let i=0;i<4;i++)add(B.neck,'belly',G.ell(.027,.018,.075,{x:.015+i*.043,y:-.064+i*.015,rz:.3},12));
  const h=B.head;
  add(h,'body',G.ell(.105,.077,.083,{},16),G.tube([[.035,.004,0],[.108,-.006,0],[.155,-.028,0]],[.069,.036],{},8,7));
  add(h,'shell2',G.ell(.083,.022,.069,{x:.025,y:.062},10),G.tube([[.1,.028,0],[.15,.01,0],[.165,-.045,0]],[.032,.009],{},6,6));
  add(h,'mouth',G.ell(.075,.021,.053,{x:.068,y:-.04},12));
  for(const side of [-1,1]) {
    add(h,'shell2',G.tube([[-.043,.03,side*.052],[-.12,.057,side*.074],[-.21,.044,side*.082]],[.019,.001],{},8,5));
    add(h,'shell2',G.ell(.026,.028,.02,{x:-.03,y:-.002,z:side*.078},8));
    for(let i=0;i<6;i++)add(B.neck,'shell2',G.ell(.009,.005,.012,{x:.015+i*.025,y:.068+i*.003,z:side*.05},8));
  }
  const jaw=rig.bone('jaw',h,{x:.008,y:-.052});
  add(jaw,'body',G.tube([[0,0,0],[.065,-.012,0],[.147,-.003,0]],[.057,.027],{},8,7));
  add(jaw,'mouth',G.ell(.061,.009,.043,{x:.068,y:.016},12));
  add(jaw,'belly',G.ell(.072,.021,.042,{x:.07,y:-.027},12));
  for(const name of ['fl','fr','bl','br']) {
    const hip=B[name],knee=B[name+'K'];
    add(hip,'body',G.ell(.092,.103,.084,{y:-.025},14),G.tube([[0,0,0],[.01,-.06,0],[.008,-.1,0]],[.08,.057],{},8,8));
    add(knee,'body',G.tube([[0,0,0],[.008,-.045,0],[.024,-.1,0]],[.06,.048],{},8,8),G.ell(.068,.027,.06,{x:.035,y:-.1},12));
    for(const z of [-.037,0,.037])add(knee,'horn',G.tube([[.057,-.1,z],[.095,-.105,z],[.113,-.119,z]],[.017,.001],{},5,5));
    for(let row=0;row<3;row++)for(let i=0;i<5;i++) {
      const a=i/5*Math.PI*2;add(hip,'body',G.ell(.013,.014,.006,{x:Math.cos(a)*.077,y:-.017-row*.027,z:Math.sin(a)*.075,ry:-a},7));
    }
  }
  add(B.tail0,'body',G.tube([[.015,0,0],[-.12,-.013,0],[-.29,-.032,0]],[.052,.001],{},12,8));
  for(let i=0;i<6;i++)add(B.tail0,'shell2',G.ell(.011,.006,.009,{x:-.025-i*.034,y:.037-i*.005},8));
}
