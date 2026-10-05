import { G } from './modelkit.js';

export function sculptReferenceWolf(rig) {
  for(const p of rig.parts.values())p.geos.forEach(g=>g.dispose());rig.parts.clear();
  const B=rig.bones,b=B.body,add=(bone,role,...geos)=>rig.add(bone,role,...geos);
  const tuft=(bone,x,y,z,len,r,side=0)=>add(bone,'fur',G.tube([[x,y,z],[x-len*.45,y+r*.45,z+side*r*.35],[x-len,y+r*.8,z+side*r*.6]],[r,.001],{},3,4));
  add(b,'body',G.ell(.26,.145,.135,{y:.36},7),G.ell(.15,.17,.145,{x:.14,y:.375},7),G.ell(.125,.125,.12,{x:-.18,y:.365},7));
  add(b,'belly',G.ell(.18,.055,.09,{y:.268},6));
  for(let i=0;i<8;i++)tuft(b,.2-i*.065,.48-Math.abs(i-2)*.009,0,.075,.033+i%2*.006);
  for(const side of [-1,1])for(let row=0;row<3;row++)for(let i=0;i<4;i++)tuft(b,.2-i*.032,.435-row*.043,side*(.097+row*.012),.095,.032,side);
  B.neck.position.set(.215,.385,0);B.head.position.set(.105,.035,0);
  add(B.neck,'body',G.tube([[-.04,-.02,0],[.036,.015,0],[.105,.035,0]],[.104,.076],{},4,6));
  const h=B.head;
  add(h,'body',G.ell(.096,.075,.077,{},6),G.tube([[.024,-.01,0],[.108,-.028,0],[.183,-.043,0]],[.06,.029],{},4,5));
  add(h,'dark',G.ico(.027,{x:.179,y:-.04,s:[.65,.65,1]}));
  add(h,'mouth',G.ell(.066,.01,.032,{x:.091,y:-.052},6));
  for(const side of [-1,1]) {
    add(h,'body',G.cone(.037,.125,{x:-.026,y:.092,z:side*.049,rx:-side*.25,rz:.26},4));
    add(h,'dark',G.cone(.021,.081,{x:-.014,y:.092,z:side*.067,rx:-side*.25,rz:.26},4));
    for(let i=0;i<3;i++)tuft(h,-.029,.02-i*.032,side*.065,.085,.03,side);
    for(let i=0;i<4;i++)add(h,'horn',G.cone(i===0?.007:.004,i===0?.035:.016,{x:.055+i*.027,y:-.053,z:side*.028,rz:Math.PI},4));
  }
  add(B.jaw,'body',G.tube([[0,0,0],[.075,-.009,0],[.135,-.012,0]],[.033,.018],{},4,5));
  for(const side of [-1,1])for(let i=0;i<4;i++)add(B.jaw,'horn',G.cone(.005,i===3?.028:.017,{x:.018+i*.031,y:.015,z:side*.023},4));
  for(const name of ['fl','fr','bl','br']) {
    const hip=B[name],knee=B[name+'K'],back=name.startsWith('b'),lower=back?.17:.15;
    hip.position.z=(name.endsWith('l')?1:-1)*.105;
    add(hip,'body',G.ell(back?.077:.058,back?.1:.078,.053,{x:back?-.016:0,y:-.028},6),G.tube([[0,0,0],[.014,-.07,0],[.008,back?-.14:-.15,0]],[.046,.028],{},3,5));
    add(knee,'body',G.tube([[0,0,0],[-.015,-lower*.5,0],[.014,-lower,0]],[.027,.018],{},3,5));
    add(knee,'body',G.ell(.043,.022,.034,{x:.025,y:-lower},6));
    for(const z of [-.023,0,.023])add(knee,'dark',G.cone(.008,.035,{x:.058,y:-lower-.005,z,rz:-Math.PI/2-.2},4));
    tuft(hip,-.016,-.015,.018,.065,.025);
  }
  for(let i=0;i<3;i++) {
    const t=B['tail'+i],r=[.043,.062,.051][i];
    t.rotation.z=i===0?-.2:-.45;
    add(t,'fur',G.tube([[.01,0,0],[-.06,.014,0],[-.135,.024,0]],u=>r*(.8+.3*Math.sin(u*Math.PI))*(i===2?1-u*.99:1),{},4,5));
    for(const side of [-1,1])tuft(t,-.035,.022,side*r*.7,.075,r*.4,side);
  }
}
