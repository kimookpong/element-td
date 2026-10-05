import { G } from './modelkit.js';
import { addElementArchitecture } from './towerElementArchitecture.js';
const PI=Math.PI,TAU=PI*2;
// Every entry sets its own structure, footprint, deck and weapon scale.
export const GRAND_TOWERS={
  arrow:['citadel','woodDark','bronze',4,.30,.58,.94],
  cannon:['arsenal','stoneDark','iron',6,.34,.40,1.15],
  banner:['pavilion','woodDark','gold',3,.32,.30,1.04],
  drum:['pavilion','wood','bronze',4,.31,.35,1.10],
  shrine:['cathedral','marble','gold',6,.28,.61,.97],
  mine:['arsenal','rock','copper',4,.33,.30,1.02],
  light:['cathedral','marble','gold',8,.26,.80,1.04],
  dark:['thorn','obsidian','bone',5,.30,.56,1.12],
  water:['cascade','marble','blade',6,.32,.44,1.12],
  fire:['arsenal','brick','copper',4,.33,.40,1.16],
  wind:['suspended','iron','blade',3,.27,.72,1.12],
  earth:['colossus','rock','bronze',4,.36,.33,1.15],
  'dark+light':['portal','obsidian','gold',2,.32,.62,1.12],
  'light+water':['suspended','marble','blade',6,.29,.60,1.13],
  'fire+light':['pavilion','sand','gold',3,.31,.58,1.17],
  'light+wind':['portal','marble','blade',4,.27,.52,1.15],
  'earth+light':['obelisk','sand','gold',4,.35,.56,1.02],
  'dark+water':['thorn','obsidian','iron',8,.34,.37,1.15],
  'dark+fire':['cathedral','stoneDark','bone',4,.29,.56,1.12],
  'dark+wind':['suspended','obsidian','iron',3,.28,.77,1.06],
  'dark+earth':['citadel','stoneDark','bone',6,.35,.34,1.15],
  'fire+water':['cascade','brick','copper',6,.35,.34,1.18],
  'water+wind':['ice','marble','blade',6,.27,.70,1.05],
  'earth+water':['grove','woodDark','moss',5,.36,.42,1.13],
  'fire+wind':['arsenal','iron','copper',3,.35,.37,1.20],
  'earth+fire':['citadel','stoneDark','iron',4,.37,.50,1.18],
  'earth+wind':['obelisk','sandDark','gold',8,.30,.58,1.06],
  'fire+water+wind':['arsenal','brick','copper',8,.34,.48,1.10],
  'earth+fire+water':['colossus','rock','copper',7,.39,.34,1.19],
  'earth+water+wind':['portal','stoneDark','blade',4,.31,.58,1.15],
  'earth+fire+wind':['colossus','rock','iron',3,.37,.32,1.17],
};
export function buildGrandTowerArchitecture(r,b,key,tier,color){
  const [form,stone,metal,n,R,baseH,scale]=GRAND_TOWERS[key];
  const H=baseH+(tier-1)*.09;
  const box=(role,w,h,d,x,y,z=0,o={})=>r.add(b,role,G.bevelBox(w,h,d,{x,y,z,...o},.009));
  const tube=(role,pts,width)=>r.add(b,role,G.tube(pts,width,{},8,6));
  const ring=(role,radius,y,thick=.012,bone=b,o={})=>r.add(bone,role,G.torus(radius,thick,{y,rx:PI/2,...o}));
  const gem=(x,y,z,h=.14,w=.028)=>r.add(b,'crystal:'+color,G.crystal(w,h,{x,y,z}));
  const each=(count,radius,fn)=>{for(let i=0;i<count;i++){const a=i*TAU/count;fn(Math.sin(a)*radius,Math.cos(a)*radius,a,i);}};
  const spire=(x,z,h,role=stone)=>{
    r.add(b,role,G.cyl(.028,.065,h*.65,{x,y:h*.325,z},5),G.cone(.066,h*.35,{x,y:h*.825,z},5));
    ring(metal,.044,h*.61,.007,b,{x,z});gem(x,h*.78,z,.07,.014);
  };
  // Monolithic foundation, engraved band and projecting corner feet.
  r.add(b,stone,G.cyl(R,R*1.12,.1,{y:.05,ry:PI/4},Math.max(3,n)));
  r.add(b,metal,G.cyl(R*1.025,R*1.04,.025,{y:.11,ry:PI/4},Math.max(3,n)));
  each(Math.max(3,n),R*.93,(x,z,a)=>box(stone,.09,.12,.14,x,.075,z,{ry:a}));
  if(form==='cathedral'){
    r.add(b,stone,G.lathe([[R*.75,.1],[R*.48,.19],[R*.43,H*.72],[R*.7,H-.03],[R*.78,H]],{},n));
    each(n,R*.8,(x,z,a)=>{
      tube(stone,[[x*1.12,.1,z*1.12],[x,.3,z],[x*.56,H*.9,z*.56]],[.032,.018]);
      spire(x,z,H*(key==='light'?1.12:.96));
      box(metal,.018,H*.45,.025,x*.61,H*.48,z*.61,{ry:a});
    });
  }else if(form==='citadel'){
    r.add(b,stone,G.cyl(R*.81,R*.95,H-.1,{y:H*.5+.05,ry:PI/4},n));
    each(n,R*.85,(x,z,a)=>{
      box(stone,.105,H,.105,x,H/2,z,{ry:a});
      box(metal,.122,.036,.122,x,H*.82,z,{ry:a});
      r.add(b,metal,G.cone(.063,.14,{x,y:H+.065,z},4));
      for(let j=0;j<3;j++)box(metal,.008,.052,.012,x*.95,.18+j*H*.18,z*.95,{ry:a});
    });
  }else if(form==='arsenal'){
    box(stone,R*1.45,H-.12,R*1.3,0,H*.5+.06);
    for(const s of [-1,1]){
      box(metal,.08,H*.8,R*1.7,s*R*.8,H*.46);
      for(let j=0;j<4;j++)box(metal,.11,.012,R*1.45,s*R*.8,.15+j*H*.16);
      tube(metal,[[s*R,.15,-R*.45],[s*R*.95,H*.75,-R*.5],[s*R*.6,H*.95,-R*.45]],[.036,.021]);
      r.add(b,metal,G.cyl(.028,.047,H*.8,{x:s*R*.6,y:H*.65,z:-R*.75},10));
      ring('iron',.038,H*1.04,.008,b,{x:s*R*.6,z:-R*.75});
    }
    each(6,R*.75,(x,z,a)=>r.add(b,metal,G.sphere(.011,{x,y:H-.025,z},6)));
  }else if(form==='pavilion'){
    each(n,R*.8,(x,z,a)=>{
      tube(stone,[[x,.1,z],[x*.9,H*.6,z*.9],[x,H,z]],[.039,.025]);
      box(metal,.073,.045,.073,x,H*.76,z);
      r.add(b,metal,G.cone(.036,.16,{x,y:H+.08,z},4));
    });
    // Sweeping rear canopy frames the weapon without covering its front.
    const roof=r.bone('grandCanopy',b,{z:-R*.64});
    for(let j=0;j<tier;j++)r.add(roof,metal,G.cone(R*(.8-j*.1),.16,{y:H+.1+j*.1,ry:PI/4},n===3?3:4));
    box(stone,R*1.7,.045,R*1.6,0,H*.9);
  }else if(form==='portal'){
    for(const s of [-1,1]){
      box(stone,.13,H,.19,s*R*.87,H/2);
      tube(metal,[[s*R,.1,0],[s*R,H*.78,0],[s*R*.65,H+.16,0]],[.026,.008]);
      r.add(b,stone,G.cone(.10,.21,{x:s*R*.87,y:H+.10},4));
      gem(s*R*.87,H*.64,.103,.14,.024);
    }
    box(metal,R*1.72,.045,.18,0,H*.88);
  }else if(form==='suspended'){
    each(n,R*.8,(x,z,a)=>{
      r.add(b,stone,G.crystal(.064,H*.66,{x,y:H*.38,z,rz:Math.sin(a)*.26,rx:Math.cos(a)*.26}));
      tube(metal,[[x*.85,.13,z*.85],[x*.7,H*.58,z*.7],[x*.5,H-.04,z*.5]],[.021,.008]);
    });
    r.add(b,stone,G.cyl(R*.7,R*.22,.13,{y:H-.06},n));
    const orbit=r.bone('grandHalo',b,{y:H*.56});
    ring(metal,R*.84,0,.012,orbit);each(n,R*.83,(x,z)=>r.add(orbit,'crystal:'+color,G.crystal(.018,.08,{x,z})));
  }else if(form==='thorn'||form==='grove'){
    const root=form==='grove'?'woodDark':stone;
    each(n,R*.91,(x,z,a)=>{
      tube(root,[[x*1.1,.05,z*1.1],[x*.62,H*.43,z*.62],[x*.72,H*.86,z*.72],[x*1.03,H+.19,z*1.03]],[.066,.004]);
      if(form==='grove')r.add(b,'moss',G.ell(.12,.047,.10,{x:x*.95,y:H+.12,z:z*.95},8));
      else r.add(b,'bone',G.cone(.022,.15,{x:x*.87,y:H+.12,z:z*.87,rz:Math.sin(a)*.4},4));
    });
    r.add(b,root,G.lathe([[R*.52,.08],[R*.38,H*.6],[R*.66,H]],{},n));
  }else if(form==='cascade'){
    r.add(b,stone,G.lathe([[R*.88,.1],[R*.55,.2],[R*.5,H*.5],[R*.88,H-.02],[R*.9,H]],{},n));
    each(n,R*.78,(x,z,a)=>{
      tube(metal,[[x,.1,z],[x*.7,H*.5,z*.7],[x,H,z]],[.026,.016]);
      tube(key==='fire+water'?'lava':'water',[[x,H-.035,z],[x*.79,H*.5,z*.79],[x,.14,z]],[.019,.01]);
    });
    ring(metal,R*.92,H,.015);
  }else if(form==='ice'){
    each(n,R*.75,(x,z,a)=>r.add(b,'crystal:'+color,G.crystal(.061,H+.14,{x,y:H*.48,z,rz:Math.sin(a)*.21,rx:Math.cos(a)*.21})));
    r.add(b,stone,G.cyl(R*.5,R*.9,H*.4,{y:H*.25},6));
  }else if(form==='obelisk'){
    r.add(b,stone,G.cyl(R*.36,R*.86,H-.08,{y:H*.5+.04,ry:PI/4},n));
    each(n,R*.62,(x,z,a)=>{
      box(metal,.028,H*.65,.018,x*.65,H*.51,z*.65,{ry:a});
      r.add(b,stone,G.crystal(.037,H*.65,{x,y:H*.42,z}));
    });
  }else if(form==='colossus'){
    r.add(b,stone,G.ico(R,{y:H*.43,s:[1.05,H/R,.92]},1));
    each(n,R*.9,(x,z,a)=>{
      r.add(b,stone,G.ico(.10,{x,y:.15,z,s:[.9,1.6,.8]},0));
      tube(metal,[[x,.05,z],[x*.95,H*.63,z*.95],[x*.72,H,z*.72]],[.031,.015]);
    });
  }
  // Open firing deck; the enlarged unique weapon remains the dominant silhouette.
  r.add(b,metal,G.cyl(R*.79,R*.88,.045,{y:H,ry:PI/4},Math.max(3,n)));
  if(tier>1) {
    each(Math.max(3,n),R*.78,(x,z,a,i)=>{
      gem(x,H+.04,z,.12,.019);
      box(metal,.026,.032,.075,x,H-.015,z,{ry:a});
    });
    for(const s of [-1,1]){
      const cloth=key.includes('dark')?'#653e78':key.includes('water')?'#2b748e':key.includes('fire')?'#a43527':'#b99a55';
      r.add(b,'banner:'+cloth,G.sheet([[-.045,0],[.045,0],[.035,-.19],[0,-.225],[-.035,-.19]],{x:s*R*.58,y:H*.72,z:R*.74}));
      box(metal,.11,.015,.025,s*R*.58,H*.73,R*.75);
    }
  }
  if(tier===3){
    const satellite=r.bone('grandSatellite',b,{y:H*.68});
    each(3,R*1.02,(x,z)=>r.add(satellite,'crystal:'+color,G.crystal(.025,.12,{x,z})));
  }
  addElementArchitecture(r,b,key,tier,R,H);
  return {deck:H+.025,height:H+.30,weaponScale:scale*(.88+tier*.06),weaponZ:0};
}
