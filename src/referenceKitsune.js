import { G } from './modelkit.js';

export function sculptReferenceKitsune(rig,variant) {
  // Keep articulated legs, replace the torso, mask, mane and tail fans.
  for(const [key,p] of rig.parts)if(!/^(fl|fr|bl|br)(K)?$/.test(p.bone.name)) {p.geos.forEach(g=>g.dispose());rig.parts.delete(key);}
  const B=rig.bones,b=B.body,add=(bone,role,...geos)=>rig.add(bone,role,...geos);
  add(b,'body',G.ell(.23,.11,.105,{y:.32},16),G.ell(.11,.125,.105,{x:.13,y:.33},14),G.ell(.1,.11,.103,{x:-.15,y:.32},14));
  B.neck.position.set(.17,.36,0);B.head.position.set(.055,.095,0);
  add(B.neck,'body',G.tube([[0,-.03,0],[.025,.04,0],[.055,.095,0]],[.078,.05],{},10,8));
  for(let row=0;row<4;row++)for(let i=0;i<12;i++) {
    const a=i/12*Math.PI*2,r=.072+row*.008,y=.075-row*.039,z=Math.sin(a)*r,x=Math.cos(a)*r*.5;
    add(B.neck,'fur',G.tube([[x,y,z],[x-.022,y-.052,z*1.23],[x-.065,y-.095,z*1.12]],t=>.024*Math.sin(Math.PI*(.2+.8*t)),{},6,5));
  }
  const h=B.head;
  add(h,'body',G.ell(.072,.064,.067,{},14),G.tube([[.03,-.006,0],[.089,-.025,0],[.14,-.037,0]],[.039,.011],{},8,7));
  add(h,'shell2',G.ell(.012,.01,.014,{x:.143,y:-.035},8));
  for(const side of [-1,1]) {
    add(h,'body',G.cone(.04,.15,{x:-.02,y:.099,z:side*.043,rx:-side*.22,rz:.14},6));
    add(h,'dark',G.cone(.025,.108,{x:-.012,y:.101,z:side*.055,rx:-side*.22,rz:.14},5));
    add(h,'body',G.cone(.026,.078,{x:-.028,y:-.018,z:side*.066,rx:-side*1.15,rz:1.1},5));
    // Cheek brushwork stays below the blank mask, away from the eye position.
    add(h,'shell2',G.tube([[.095,-.032,side*.025],[.052,-.036,side*.055],[.012,-.026,side*.067],[-.023,-.008,side*.066]],.004,{},8,4));
    add(h,'shell2',G.tube([[-.02,.039,side*.04],[.005,.052,side*.025],[.022,.06,side*.01]],.004,{},6,4));
    const pts=[];for(let i=0;i<=24;i++){const t=i/24,ang=t*Math.PI*3,r=.041*(1-t)+.003;pts.push([-.145+Math.cos(ang)*r,.322+Math.sin(ang)*r,side*.107]);}
    add(b,'shell2',G.tube(pts,.004,{},24,4));
  }
  add(h,'shell2',G.crystal(.014,.036,{x:.023,y:.063,rz:Math.PI/2,s:[1,1,.35]}));
  for(let k=0;k<(variant==='child'?1:9);k++)for(let i=0;i<3;i++) {
    const t=B['tail'+k+'_'+i],angle=variant==='child'?0:(k-4)*.25;
    if(i===0){t.position.set(-.21,.34,(variant==='child'?0:k-4)*.012);t.rotation.set(0,angle,-.3-(k%3)*.15);}
    else {t.position.set(-.13,0,0);t.rotation.set(0,0,.12);}
    t.userData.rest.y=t.rotation.y;t.userData.rest.z=t.rotation.z;
    const r=i===0?.036:i===1?.045:.048;
    add(t,'body',G.tube([[.01,0,0],[-.065,.012,0],[-.145,0,0]],u=>r*(.8+.2*Math.sin(u*Math.PI)),{},8,7));
    for(let j=0;j<3;j++)add(t,'belly',G.ell(.031,.012,r*.94,{x:-.025-j*.044,y:r*.74,rz:-.14},8));
    if(i===2){
      add(t,'shell2',G.tube([[-.105,0,0],[-.185,-.013,0],[-.235,.027,0]],u=>r*(1-u)*.95+.001,{},10,7));
      for(const side of [-1,1])add(t,'body',G.tube([[-.126,.018,side*r*.76],[-.163,.017,side*r*.83],[-.174,-.013,side*r*.55],[-.151,-.016,side*r*.5]],.006,{},8,5));
    }
  }
  if(variant==='child')b.scale.setScalar(.86);
}
