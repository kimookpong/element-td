/* Stylized fantasy buildings: hand-set masonry, timber joints, openings,
 * roofs and tier-specific extensions. Weapons live on a real upper platform. */
import { G } from './modelkit.js';
const PI=Math.PI,TAU=2*PI;
export const ARCHITECTURE={
  arrow:{kind:'stilt',wall:'wood',roof:'thatch',plan:4,r:0.24,h:0.65,cap:'pagoda'},
  cannon:{kind:'keep',wall:'stone',roof:'roof',plan:4,r:0.29,h:0.7,cap:'dome'},
  banner:{kind:'camp',wall:'woodDark',roof:'banner:#b63846',plan:3,r:0.3,h:0.44,cap:'tent'},
  drum:{kind:'bell',wall:'woodDark',roof:'thatch',plan:4,r:0.28,h:0.55,cap:'gable'},
  shrine:{kind:'chapel',wall:'marble',roof:'roof',plan:6,r:0.24,h:0.66,cap:'pagoda'},
  mine:{kind:'mine',wall:'stoneDark',roof:'wood',plan:4,r:0.28,h:0.42,cap:'gable'},
  light:{kind:'lighthouse',wall:'marble',roof:'gold',plan:8,r:0.2,h:0.9,cap:'spire'},
  dark:{kind:'root',wall:'obsidian',roof:'obsidian',plan:5,r:0.24,h:0.7,cap:'crown'},
  water:{kind:'aqueduct',wall:'marble',roof:'crystal:#81dff3',plan:6,r:0.26,h:0.6,cap:'open'},
  fire:{kind:'factory',wall:'brick',roof:'iron',plan:4,r:0.28,h:0.48,cap:'gable'},
  wind:{kind:'windmill',wall:'wood',roof:'thatch',plan:6,r:0.21,h:0.85,cap:'spire'},
  earth:{kind:'bastion',wall:'rock',roof:'sandDark',plan:4,r:0.3,h:0.55,cap:'crown'},
  'dark+light':{kind:'gate',wall:'obsidian',roof:'gold',plan:4,r:0.23,h:0.8,cap:'spire'},
  'light+water':{kind:'observatory',wall:'marble',roof:'crystal:#81dff3',plan:6,r:0.26,h:0.62,cap:'dome'},
  'fire+light':{kind:'temple',wall:'sand',roof:'copper',plan:3,r:0.27,h:0.7,cap:'pagoda'},
  'light+wind':{kind:'bridge',wall:'marble',roof:'gold',plan:4,r:0.2,h:0.73,cap:'gable'},
  'earth+light':{kind:'ziggurat',wall:'sand',roof:'gold',plan:4,r:0.32,h:0.63,cap:'open'},
  'dark+water':{kind:'well',wall:'stoneDark',roof:'obsidian',plan:8,r:0.28,h:0.48,cap:'gable'},
  'dark+fire':{kind:'crypt',wall:'stoneDark',roof:'bone',plan:4,r:0.25,h:0.67,cap:'spire'},
  'dark+wind':{kind:'ruin',wall:'obsidian',roof:'obsidian',plan:3,r:0.22,h:0.9,cap:'open'},
  'dark+earth':{kind:'mausoleum',wall:'stoneDark',roof:'obsidian',plan:6,r:0.31,h:0.44,cap:'dome'},
  'fire+water':{kind:'foundry',wall:'brick',roof:'copper',plan:6,r:0.3,h:0.52,cap:'open'},
  'water+wind':{kind:'ice',wall:'marble',roof:'crystal:#81dff3',plan:6,r:0.19,h:0.94,cap:'spire'},
  'earth+water':{kind:'tree',wall:'woodDark',roof:'moss',plan:5,r:0.29,h:0.64,cap:'canopy'},
  'fire+wind':{kind:'hangar',wall:'iron',roof:'copper',plan:4,r:0.3,h:0.47,cap:'gable'},
  'earth+fire':{kind:'fort',wall:'stoneDark',roof:'iron',plan:4,r:0.32,h:0.67,cap:'crown'},
  'earth+wind':{kind:'desert',wall:'sand',roof:'sandDark',plan:8,r:0.24,h:0.79,cap:'dome'},
  'fire+water+wind':{kind:'boiler',wall:'brick',roof:'copper',plan:8,r:0.28,h:0.6,cap:'dome'},
  'earth+fire+water':{kind:'volcano',wall:'rock',roof:'rock',plan:7,r:0.34,h:0.48,cap:'open'},
  'earth+water+wind':{kind:'icegate',wall:'stoneDark',roof:'crystal:#81dff3',plan:4,r:0.23,h:0.83,cap:'gable'},
  'earth+fire+wind':{kind:'siege',wall:'rock',roof:'woodDark',plan:4,r:0.29,h:0.59,cap:'open'},
};
function block(r,b,role,w,h,d,x,y,z=0,o={}){r.add(b,role,G.bevelBox(w,h,d,{x,y,z,...o},Math.min(w,h,d)*0.15));}
function pole(r,b,role,points,w){r.add(b,role,G.tube(points,w,{},12,6));}
function masonry(r,b,s,h,tier){
  const rows=5+tier,step=h/rows,n=s.plan===4?4:s.plan;
  for(let row=0;row<rows;row++)for(let side=0;side<n;side++) {
    const a=side*TAU/n,rad=s.r*(1.07-row*0.022),pieces=s.plan===4?3:2;
    for(let k=0;k<pieces;k++){
      const u=(k-(pieces-1)/2)*(s.plan===4?s.r*0.6:s.r*0.42),x=Math.sin(a)*rad+Math.cos(a)*u,z=Math.cos(a)*rad-Math.sin(a)*u;
      // Front door and narrow slit windows remain actual openings between stones.
      if(side===0&&Math.abs(u)<0.06&&(row<3||row===rows-2))continue;
      const jitter=Math.sin(row*13+side*7+k*23)*0.008;
      block(r,b,row%3===0&&s.wall==='stone'?'slab':s.wall,s.plan===4?s.r*0.58:s.r*0.45,step*0.88,0.1,x,row*step+step/2+jitter,z,{ry:a,rz:jitter});
    }
  }
  // Substantial inner core, with a dark recessed door rather than a painted line.
  r.add(b,s.wall,G.cyl(s.r*0.77,s.r*0.91,h,{y:h/2,ry:PI/4},s.plan));
  block(r,b,'woodDark',0.105,0.22,0.014,0,0.12,s.r+0.02);
  for(let i=0;i<4;i++)block(r,b,'wood',0.017,0.19,0.009,-0.035+i*0.023,0.12,s.r+0.03);
  block(r,b,s.wall,0.04,0.23,0.065,-0.09,0.13,s.r+0.015);block(r,b,s.wall,0.04,0.23,0.065,0.09,0.13,s.r+0.015);
  r.add(b,s.wall,G.torus(0.09,0.028,{y:0.23,z:s.r+0.015},PI));
}
function timber(r,b,s,h,tier){
  for(let i=0;i<4;i++){
    const x=(i%2?1:-1)*s.r,z=(i<2?1:-1)*s.r;
    pole(r,b,'woodDark',[[x*1.12,0,z*1.1],[x,0.32,z],[x*0.93,h,z*0.93]],[0.033,0.025]);
    for(let j=0;j<3;j++)r.add(b,'bone',G.torus(0.035,0.005,{x,y:h*0.65+j*0.018,z,rx:PI/2},TAU));
    if(i<2)pole(r,b,'wood',[[x,0.14,z],[0,h*0.56,z]],0.015);
  }
  for(let i=0;i<7;i++)block(r,b,'wood',0.065,0.035,s.r*2.25,(i-3)*0.067,h*0.65,0);
  if(tier>1)for(let i=0;i<6;i++)block(r,b,i%2?'wood':'woodDark',0.067,h*0.3,0.023,(i-2.5)*0.066,h*0.84,-s.r);
  pole(r,b,'woodDark',[[-s.r,h,0],[s.r,h,0]],0.03);
}
function roof(r,b,s,y,tier){
  if(s.cap==='open'||s.cap==='crown')return;
  const rad=s.r*1.45,ht=s.cap==='spire'?0.4:s.cap==='dome'?0.23:0.25;
  const levels=s.cap==='pagoda'?tier:1;
  for(let level=0;level<levels;level++){
    const base=y+level*0.15,R=rad*(1-level*0.17);
    if(s.cap==='dome') {
      r.add(b,s.roof,G.lathe([[R,base],[R*0.98,base+0.06],[R*0.8,base+0.15],[R*0.45,base+0.23],[0.018,base+0.27]],{},s.plan*4));
      for(let row=0;row<3;row++)for(let k=0;k<s.plan*2;k++){const a=k*TAU/(s.plan*2),rr=R*(0.93-row*0.19);block(r,b,s.roof,0.055,0.028,0.08,Math.sin(a)*rr,base+0.05+row*0.072,Math.cos(a)*rr,{ry:a,rx:0.4});}
    }else{
      r.add(b,s.roof,G.cone(R,ht,{y:base+ht/2,ry:PI/4},s.cap==='gable'?4:s.plan));
      // Individual overlapping shingles/slats break the perfectly smooth cone.
      for(let row=0;row<3;row++)for(let k=0;k<s.plan*3;k++){
        const a=k*TAU/(s.plan*3),rr=R*(0.92-row*0.24),yy=base+row*ht*0.25;
        r.add(b,s.roof,G.feather(0.14,0.035,{x:Math.sin(a)*rr,y:yy,z:Math.cos(a)*rr,ry:PI/2-a,rz:0.24}));
      }
    }
    for(let k=0;k<s.plan;k++){const a=k*TAU/s.plan;pole(r,b,'woodDark',[[Math.sin(a)*R,base,Math.cos(a)*R],[Math.sin(a)*R*0.55,base+ht*0.5,Math.cos(a)*R*0.55],[0,base+ht,0]],0.008);}
  }
}
export function buildTowerArchitecture(r,b,key,tier,color){
  const s=ARCHITECTURE[key];if(!s)throw Error('Unknown architecture '+key);
  const h=s.h+(tier-1)*0.16,wood=['stilt','camp','bell','windmill','mine','tree','siege'].includes(s.kind),split=['gate','bridge','icegate'].includes(s.kind);
  // Ground debris and asymmetric footing give the building a grounded footprint.
  for(let i=0;i<8;i++){const a=i*TAU/8,rad=s.r+0.04+(i%3)*0.025;r.add(b,s.wall==='wood'?'rock':s.wall,G.ico(0.04+(i%3)*0.012,{x:Math.sin(a)*rad,y:0.035,z:Math.cos(a)*rad,s:[1.2,0.6,1]},0));}
  if(wood)timber(r,b,s,h,tier);
  else if(split){for(const x of [-0.2,0.2]){const pier=r.bone('pier'+x,b,{x});masonry(r,pier,{...s,r:0.095,plan:4},h,tier);}block(r,b,s.wall,0.56,0.09,0.24,0,h,0);}
  else if(s.kind==='ziggurat'){for(let i=0;i<6+tier;i++)block(r,b,s.wall,s.r*2-i*0.065,h/(6+tier),s.r*2-i*0.065,0,(i+0.5)*h/(6+tier));}
  else masonry(r,b,s,h,tier);
  // Belts stay architectural: rope on timber, carved cornices on stone.
  for(const yy of [h*0.43,h*0.92]) {
    if(wood)for(let k=0;k<3;k++)r.add(b,'bone',G.torus(s.r*1.08,0.007,{y:yy+k*0.015,rx:PI/2},TAU));
    else r.add(b,s.wall,G.cyl(s.r*1.16,s.r*1.16,0.045,{y:yy,ry:PI/4},s.plan));
  }
  const balcony=h+0.04;
  r.add(b,wood?'woodDark':s.wall,G.cyl(s.r*1.22,s.r*1.3,0.06,{y:balcony,ry:PI/4},s.plan));
  if(s.cap==='crown'||tier===1)for(let k=0;k<s.plan;k++){const a=k*TAU/s.plan;block(r,b,s.wall,0.09,0.11,0.09,Math.sin(a)*s.r*1.1,balcony+0.08,Math.cos(a)*s.r*1.1);}
  // A side roof/porch keeps the firing mechanism unobstructed on the deck.
  const porch=r.bone('porch',b,{z:-s.r*0.3,y:0});roof(r,porch,{...s,r:s.r*1.06},h-0.015,tier);
  if(tier>=2){
    for(const side of [-1,1]){
      const x=side*(s.r+0.05);pole(r,b,wood?'woodDark':s.wall,[[x*1.1,0,0],[x,0.28,0],[x*0.72,h*0.8,0]],[0.035,0.018]);
      if(['root','crypt','tree','ruin'].includes(s.kind))pole(r,b,'woodDark',[[x*1.25,0,0.1],[x,0.27,0],[x*0.7,h*0.74,-0.1],[x*1.05,h+0.17,-0.05]],[0.045,0.006]);
    }
    for(const x of [-0.1,0.1]){block(r,b,'iron',0.027,0.07,0.027,x,h*0.54,s.r+0.045);r.add(b,'glow:'+color,G.sphere(0.011,{x,y:h*0.55,z:s.r+0.062},8));}
  }
  if(tier===3){
    if(wood){const awning=r.bone('awning',b,{y:h*0.44,z:s.r});r.add(awning,'banner:#a73328',G.sheet([[-s.r*1.3,0],[-s.r*1.1,0.2],[0,0.24],[s.r*1.1,0.2],[s.r*1.3,0]],{rx:PI/2,rz:PI}));}
    else {const turret=r.bone('annex',b,{x:-s.r*0.85,z:-s.r*0.8});masonry(r,turret,{...s,r:s.r*0.48,plan:6},h*0.7,1);roof(r,turret,{...s,r:s.r*0.55,cap:'spire'},h*0.7,1);}
    r.add(b,'gold',G.cyl(0.006,0.01,0.19,{y:h+0.38,z:-s.r*0.65},8));r.add(b,'crystal:'+color,G.octa(0.025,{y:h+0.49,z:-s.r*0.65,s:[0.6,1.6,0.6]}));
  }
  // Battle-worn reinforcement and faction insignia.
  if(!wood)for(const side of [-1,1]) {
    block(r,b,'iron',0.045,h*0.42,0.05,side*s.r*0.92,h*0.45,s.r*0.85,{rz:side*0.09});
    for(let k=0;k<3;k++)r.add(b,'bronze',G.sphere(0.008,{x:side*s.r*0.92,y:h*0.28+k*h*0.12,z:s.r*0.89},8));
  }
  if(tier>1) {
    r.add(b,'iron',G.scalePlate(0.09,0.12,{y:h*0.7,z:s.r+0.065}));
    r.add(b,'glow:'+color,G.crystal(0.01,0.04,{y:h*0.7,z:s.r+0.083}));
  }
  // Family-specific features read from the main silhouette, not just a recolor.
  if(['factory','foundry','boiler','hangar'].includes(s.kind))for(let i=0;i<(tier===3?3:2);i++){const x=(i-0.5)*0.12;r.add(b,'iron',G.cyl(0.033,0.044,h*0.75,{x,y:h*0.75,z:-s.r},12));r.add(b,'copper',G.torus(0.038,0.007,{x,y:h*1.12,z:-s.r,rx:PI/2}));}
  if(['root','tree','well'].includes(s.kind))for(let k=0;k<5;k++){const a=k*TAU/5;pole(r,b,'woodDark',[[Math.sin(a)*(s.r+0.15),0,Math.cos(a)*(s.r+0.15)],[Math.sin(a)*s.r,0.25,Math.cos(a)*s.r],[Math.sin(a)*s.r*0.6,h*0.7,Math.cos(a)*s.r*0.6]],[0.035,0.008]);}
  if(s.kind==='ice'||s.kind==='icegate')for(let k=0;k<6;k++){const a=k*TAU/6;r.add(b,'crystal:'+color,G.crystal(0.025,0.14+(k%3)*0.055,{x:Math.sin(a)*s.r,y:0.07,z:Math.cos(a)*s.r}));}
  if(s.kind==='desert'){r.add(b,'banner:#d4a65e',G.sheet([[-0.16,0],[0.16,0],[0.12,-0.23],[-0.12,-0.23]],{y:h*0.65,z:s.r+0.045}));}
  return {deck:balcony+0.035,height:h+0.52,weaponScale:wood?0.59:0.61,weaponZ:s.cap==='open'||s.cap==='crown'?0:s.r*0.75};
}
