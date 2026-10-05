import { G } from './modelkit.js';

export function sculptReferenceUnicorn(rig) {
  for(const [key,p] of rig.parts)if(!/^(fl|fr|bl|br)(K)?$/.test(p.bone.name)){p.geos.forEach(g=>g.dispose());rig.parts.delete(key);}
  const B=rig.bones,b=B.body,add=(bone,role,...geos)=>rig.add(bone,role,...geos);
  add(b,'body',G.ell(.255,.145,.125,{y:.5},24),G.ell(.13,.16,.13,{x:.15,y:.51},22),G.ell(.14,.145,.13,{x:-.17,y:.51},22));
  B.neck.position.set(.19,.55,0);B.head.position.set(.035,.25,0);B.head.rotation.z=-.48;
  add(B.neck,'body',G.tube([[-.035,-.045,0],[-.022,.11,0],[.035,.25,0]],[.099,.053],{},18,12));
  const h=B.head;
  add(h,'body',G.ell(.073,.065,.055,{},22),G.ell(.071,.042,.043,{x:.075,y:-.018,rz:-.13},22));
  add(h,'belly',G.ell(.033,.031,.044,{x:.128,y:-.024},18));
  for(const side of [-1,1]) {
    add(h,'body',G.tube([[-.038,.036,side*.033],[-.045,.105,side*.045],[-.025,.137,side*.05]],[.023,.001],{},8,7));
    add(h,'dark',G.tube([[-.032,.052,side*.049],[-.038,.101,side*.057],[-.027,.121,side*.059]],[.012,.001],{},7,6));
    add(h,'dark',G.ell(.007,.009,.003,{x:.119,y:-.01,z:side*.041},10));
    add(h,'belly',G.tube([[.092,-.044,side*.032],[.127,-.045,side*.026],[.14,-.039,side*.018]],.002,{},6,4));
  }
  add(h,'gold',G.tube([[.004,.054,0],[.024,.16,0],[.056,.28,0]],[.022,.001],{},24,10));
  const helix=[];for(let i=0;i<=100;i++){const t=i/100,a=t*Math.PI*14,r=.022*(1-t);helix.push([.004+.052*t+Math.cos(a)*r,.054+.226*t,Math.sin(a)*r]);}
  add(h,'horn',G.tube(helix,t=>.0035*(1-t)+.0005,{},100,4));
  for(let i=0;i<11;i++) {
    const t=i/10,z=.014+(i%3)*.01;
    add(B.neck,i%3===0?'feather2':'mane',G.tube([[-.015,.265-t*.024,z],[-.075,.245-t*.025,z+.035],[-.076+Math.sin(t*8)*.012,.165-t*.018,z+.048],[-.035,.11-t*.019,z+.055]],u=>.019*(1-u*.85),{},14,7));
  }
  for(let i=0;i<5;i++)add(h,i%2?'mane':'feather2',G.tube([[-.038,.069,(i-2)*.016],[.018,.087,(i-2)*.018],[.057,.042,(i-2)*.016],[.054,.005,(i-2)*.015]],[.016,.002],{},12,7));
  for(let i=0;i<3;i++) {
    const tail=B['tail'+i];tail.rotation.z=0;tail.userData.rest.z=0;
    if(i===0)tail.position.set(-.275,.555,0);else tail.position.set(-.07,-.105,0);
    for(let j=0;j<7;j++) {
      const z=(j-3)*.011;
      const pts=i===0?[[0,0,z],[-.078,.025,z*1.15],[-.11,-.038,z*1.2],[-.07,-.105,z]]:i===1?[[0,0,z],[-.002,-.048,z*1.2],[-.048,-.075,z],[-.07,-.105,z]]:[[0,0,z],[-.02,-.07,z],[-.105,-.098,z],[-.142,-.054,z]];
      add(tail,j%3===0?'feather2':j%3===1?'mane':'cloth',G.tube(pts,u=>.022*(1-u*(i===2?.97:.2)),{},14,8));
    }
  }
}
