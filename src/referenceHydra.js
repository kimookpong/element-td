import { G } from './modelkit.js';

export function sculptReferenceHydra(rig) {
  for(const p of rig.parts.values())p.geos.forEach(g=>g.dispose());rig.parts.clear();
  const B=rig.bones,b=B.body,add=(bone,role,...geos)=>rig.add(bone,role,...geos);
  const fin=(bone,x,y,h,z=0)=>{
    add(bone,'mane',G.sheet([[0,0],[-.07,h*.75],[-.12,h*.2],[-.045,-.018]],{x,y,z,rx:Math.PI/2}));
    add(bone,'shell2',G.tube([[x,y,z],[x-.07,y+h*.75,z],[x-.12,y+h*.2,z]],[.012,.003],{},4,4));
  };
  add(b,'body',G.ell(.29,.17,.18,{x:-.07,y:.32},14),G.ell(.17,.17,.19,{x:.13,y:.35},12));
  add(b,'belly',G.ell(.23,.065,.145,{y:.215},12));
  for(const side of [-1,1])for(let row=0;row<3;row++)for(let i=0;i<9;i++)add(b,'shell2',G.scalePlate(.065,.056,{x:.2-i*.061,y:.3+row*.045,z:side*(.17-row*.023),ry:side<0?Math.PI:0,rx:side*.35}));
  for(let i=0;i<7;i++)fin(b,.13-i*.072,.48,.09);
  for(let k=0;k<3;k++) {
    const a=B['neckA'+k],n=B['neckB'+k],h=B['hhead'+k],jaw=B['hjaw'+k],center=k===1;
    const height=center?.26:.2;
    a.position.set(.13,.39,(k-1)*.16);a.rotation.y=-(k-1)*.32;a.userData.rest.y=a.rotation.y;
    n.position.set(.038,height,0);h.position.set(.08,height*.86,0);
    for(const [bone,end,r] of [[a,[.038,height,0],.102],[n,[.08,height*.86,0],.075]]) {
      add(bone,'body',G.tube([[0,-.025,0],[-.012,end[1]*.45,0],end],[r,r*.72],{},10,8));
      for(let row=0;row<5;row++) {
        const t=row/5,x=end[0]*t,y=end[1]*t;
        add(bone,'belly',G.ell(.033,.029,r*.82,{x:x+r*.73,y},8));
        for(const side of [-1,1])add(bone,'shell2',G.scalePlate(.048,.061,{x:x-.025,y,z:side*r*.86,ry:side<0?Math.PI:0,rz:.25}));
        if(row%2===0)fin(bone,x-r*.72,y,.065);
      }
    }
    add(h,'body',G.ell(.085,.054,.065,{},10),G.tube([[.027,-.007,0],[.1,-.02,0],[.155,-.025,0]],[.046,.027],{},6,6));
    add(h,'shell2',G.ell(.065,.016,.054,{x:.025,y:.043},8));
    for(const side of [-1,1]) {
      add(h,'horn',G.cone(.012,.062,{x:-.026,y:.061,z:side*.038,rz:.6},4));
      add(h,'mane',G.sheet([[0,0],[-.09,.05],[-.065,-.03]],{x:-.025,y:-.018,z:side*.06,rx:Math.PI/2}));
      for(let i=0;i<6;i++)add(h,'horn',G.cone(.004,.024,{x:.025+i*.022,y:-.043,z:side*(.035-i*.002),rz:Math.PI},4));
    }
    jaw.position.set(.023,-.052,0);
    add(jaw,'belly',G.tube([[0,0,0],[.065,-.01,0],[.125,-.004,0]],[.032,.022],{},6,6));
    add(jaw,'mouth',G.ell(.055,.005,.023,{x:.057,y:.008},10));
    for(const side of [-1,1])for(let i=0;i<5;i++)add(jaw,'horn',G.cone(.004,.023,{x:.018+i*.023,y:.017,z:side*.023},4));
  }
  for(const name of ['fl','fr','bl','br']) {
    const hip=B[name],knee=B[name+'K'],side=name.endsWith('l')?1:-1,back=name.startsWith('b');
    hip.position.set(back?-.19:.13,.27,side*.165);
    add(hip,'body',G.ell(.074,.075,.065,{y:-.023},10),G.tube([[0,0,0],[.015,-.07,side*.025],[.008,-.12,0]],[.059,.039],{},6,6));
    add(knee,'belly',G.tube([[0,0,0],[.015,-.075,0],[.031,-.13,0]],[.039,.027],{},6,6));
    add(knee,'gold',G.ell(.058,.031,.05,{x:.035,y:-.13},8));
    for(const z of [-.035,0,.035])add(knee,'horn',G.tube([[.06,-.13,z],[.103,-.135,z],[.123,-.153,z]],[.018,.001],{},4,4));
  }
  for(let i=0;i<3;i++) {
    const t=B['tail'+i],r=.075-i*.021;
    if(i===0)t.position.set(-.32,.32,0);else t.position.set(-.15,0,0);
    add(t,'body',G.tube([[.01,0,0],[-.07,0,0],[-.16,0,0]],[r,Math.max(.007,r-.023)],{},6,7));
    add(t,'belly',G.tube([[0,-r*.67,0],[-.08,-r*.67,0],[-.16,-r*.43,0]],[r*.45,r*.28],{},6,6));
    fin(t,-.02,r,.075);fin(t,-.09,r,.065);
    if(i===2)for(const side of [-1,1])add(t,'mane',G.sheet([[0,0],[-.1,side*.11],[-.22,side*.07],[-.15,0]],{x:-.07,y:.005}));
  }
}
