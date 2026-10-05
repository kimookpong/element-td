/* Each tower has its own construction recipe and silhouette. Shared helpers build
 * small parts only; there is no shared weapon/architecture recipe. */
import { G } from './modelkit.js';
import { buildGrandTowerArchitecture } from './grandTowerArchitecture.js';
const PI=Math.PI,TAU=2*PI;
const around=(n,r,fn)=>{for(let i=0;i<n;i++){const a=i*TAU/n;fn(Math.cos(a)*r,Math.sin(a)*r,a,i);}};
export const TOWER_IDENTITIES = {
  arrow:['wood','Crossbow carriage'],cannon:['iron','Wheeled siege mortar'],banner:['wood','War standard'],drum:['wood','Suspended war gong'],shrine:['marble','Heart sanctuary'],mine:['stoneDark','Mine derrick'],
  light:['marble','Solar reflector'],dark:['obsidian','Watcher claw'],water:['marble','Spiral aqueduct'],fire:['brick','Blast furnace'],wind:['iron','Vertical wind sails'],earth:['rock','Stone sentinel'],
  'dark+light':['obsidian','Crescent gate'],'light+water':['marble','Prismatic fan'],'fire+light':['copper','Solar lens array'],'light+wind':['marble','Winged spear launcher'],'earth+light':['sand','Runic stepped pyramid'],
  'dark+water':['obsidian','Hanging cursed cauldron'],'dark+fire':['bone','Soul skull altar'],'dark+wind':['obsidian','Floating broken spiral'],'dark+earth':['stoneDark','Chained sarcophagus'],
  'fire+water':['brick','Lava crucible'],'water+wind':['marble','Snowflake spire'],'earth+water':['moss','Mangrove bog'],'fire+wind':['copper','Jet rotor'],'earth+fire':['iron','Rail shell forge'],'earth+wind':['sand','Sand hourglass'],
  'fire+water+wind':['copper','Steam cyclone engine'],'earth+fire+water':['rock','Eruption fissure'],'earth+water+wind':['stoneDark','Glacier arch'],'earth+fire+wind':['rock','Meteor trebuchet'],
};
const palette={light:'#ffe187',dark:'#b782ed',water:'#81dff3',fire:'#ff8144',wind:'#9ef5ce',earth:'#e6b56c'};
function box(r,b,role,w,h,d,x=0,y=h/2,z=0,extra={}){r.add(b,role,G.bevelBox(w,h,d,{x,y,z,...extra},Math.min(w,h,d)*0.16));}
function tube(r,b,role,points,width=0.025){r.add(b,role,G.tube(points,width,{},16,7));}
function gem(r,b,c,x,y,z=0,w=0.055,h=0.2){r.add(b,'crystal:'+c,G.crystal(w,h,{x,y,z}));r.add(b,'glow:'+c,G.crystal(w*0.23,h*0.7,{x,y,z}));}
function band(r,b,role,radius,y,z=0,extra={}){r.add(b,role,G.torus(radius,0.008,{y,z,rx:PI/2,...extra}));}
function rivets(r,b,x,y,z,n=5,spacing=0.06){for(let i=0;i<n;i++)r.add(b,'gold',G.sphere(0.008,{x:x+i*spacing,y,z},8));}
function pillar(r,b,role,x,z,h){box(r,b,role,0.065,h,0.065,x,h/2,z);box(r,b,'gold',0.09,0.025,0.09,x,h,z);}
function beam(r,b,role,a,c,w=0.035){tube(r,b,role,[a,c],w);}
function leaf(r,b,role,len,w,x,y,z,ry=0){r.add(b,role,G.feather(len,w,{x,y,z,ry}));}
const builders={
  arrow(r,b,t,c){
    for(const z of [-0.2,0.2]){box(r,b,'woodDark',0.7,0.07,0.08,0,0.08,z);box(r,b,'wood',0.08,0.22,0.08,-0.16,0.17,z);}
    const aim=r.bone('aim',b,{y:0.3});box(r,aim,'wood',0.67,0.055,0.07,0.05,0);
    for(const s of [-1,1]){tube(r,aim,'woodDark',[[0.22,0,0],[0.14,0.04,s*0.18],[-0.05,0.02,s*0.36]],0.026);beam(r,aim,'iron',[-0.05,0.02,s*0.36],[-0.17,0.02,0],0.003);}
    box(r,aim,'iron',0.17,0.02,0.055,-0.16,0.04);rivets(r,aim,-0.18,0.033,0.041);return [0.5,'aim'];
  },
  cannon(r,b,t,c){
    box(r,b,'iron',0.32,0.08,0.28,0,0.04);
    const aim=r.bone('aim',b,{y:0.14});
    r.add(aim,'iron',G.lathe([[0.08,-0.16],[0.11,-0.09],[0.085,0.25],[0.11,0.32],[0.065,0.32],[0.054,0.16]],{y:0.1,rz:-PI/2},24));
    for(const x of [-0.1,0.07,0.29])r.add(aim,'bronze',G.torus(0.096,0.008,{x,y:0.1,ry:PI/2}));
    for(const z of [-0.12,0.12])box(r,aim,'iron',0.19,0.14,0.04,-0.06,0.045,z);return [0.45,'aim'];
  },
  banner(r,b,t,c){
    box(r,b,'woodDark',0.45,0.06,0.16,0,0.03);r.add(b,'gold',G.cyl(0.014,0.025,0.95,{y:0.5},12));
    beam(r,b,'gold',[-0.27,0.79,0],[0.27,0.79,0],0.014);const cloth=r.bone('cloth',b,{y:0.8});
    r.add(cloth,'banner:#b63846',G.sheet([[-0.25,0],[0.25,0],[0.21,-0.46],[0,-0.39],[-0.21,-0.46]]));gem(r,cloth,'#edc46e',0,-0.18,0.007,0.035,0.13);
    for(const s of [-1,1])beam(r,b,'iron',[0,0.63,0],[s*0.22,0.06,0.1],0.003);gem(r,b,'#ffe4a4',0,1,0,0.025,0.12);return [1.12];
  },
  drum(r,b,t,c){
    for(const x of [-0.29,0.29])pillar(r,b,'woodDark',x,0,0.67);beam(r,b,'wood',[-0.34,0.7,0],[0.34,0.7,0],0.045);
    r.add(b,'bronze',G.cyl(0.25,0.25,0.045,{y:0.36,rx:PI/2},32));r.add(b,'gold',G.sphere(0.085,{y:0.36,z:0.035,s:[1,1,0.3]},20));band(r,b,'gold',0.22,0.36,0,{rx:0});
    for(const x of [-0.15,0.15])beam(r,b,'iron',[x,0.58,0],[x,0.69,0],0.006);const sticks=r.bone('sticks',b,{y:0.4});beam(r,sticks,'wood',[0.1,-0.13,0.18],[-0.1,0.03,0.18],0.012);return [0.78];
  },
  shrine(r,b,t,c){
    for(const x of [-0.21,0.21])pillar(r,b,'marble',x,0,0.56);box(r,b,'marble',0.58,0.05,0.36,0,0.57);
    r.add(b,'roof',G.cone(0.4,0.25,{y:0.73,ry:PI/4},4));gem(r,b,'#ff91bb',0,0.32,0,0.1,0.26);
    for(const s of [-1,1])tube(r,b,'gold',[[s*0.25,0.03,0.1],[s*0.22,0.19,0.12],[s*0.1,0.24,0.08]],0.016);return [0.89];
  },
  mine(r,b,t,c){
    box(r,b,'stoneDark',0.4,0.15,0.4,0,0.075);for(const s of [-1,1])beam(r,b,'woodDark',[s*0.21,0.1,0],[s*0.1,0.95,0],0.034);
    beam(r,b,'wood',[-0.1,0.91,0],[0.1,0.91,0],0.03);band(r,b,'iron',0.075,0.89,0,{rx:0});beam(r,b,'iron',[0,0.88,0],[0,0.31,0],0.003);
    box(r,b,'iron',0.22,0.14,0.2,0,0.25);around(7,0.11,(x,z,a,i)=>gem(r,b,'#ffd777',x,0.31,z,0.026,0.12));box(r,b,'wood',0.12,0.06,0.4,0.24,0.05);return [1];
  },
  light(r,b,t,c){
    // One broad concave reflector on a slender yoke, not an orbiting sphere.
    for(const x of [-0.2,0.2])pillar(r,b,'marble',x,0,0.55);const aim=r.bone('aim',b,{y:0.61});
    r.add(aim,'mirror',G.lathe([[0,0],[0.09,0.025],[0.22,0.09],[0.34,0.18],[0.34,0.2],[0.22,0.11],[0.08,0.045]],{rx:PI/2},32));
    band(r,aim,'gold',0.34,0,0.19,{rx:0});gem(r,aim,c,0,0,0.22,0.04,0.12);
    around(8+t,0.32,(x,y,a)=>box(r,aim,'gold',0.022,0.055,0.035,x,y,0.18,{rz:a}));return [1.02,'aim'];
  },
  dark(r,b,t,c){
    around(3,0.21,(x,z,a)=>tube(r,b,'obsidian',[[x,0,z],[x*1.7,0.32,z*1.7],[x*1.2,0.68,z*1.2],[x*0.4,0.78,z*0.4]],[0.065,0.008]));
    const core=r.bone('energyCore',b,{y:0.63});gem(r,core,c,0,0,0,0.11,0.27);return [0.88];
  },
  water(r,b,t,c){
    // A stepped spiral watercourse with no central bowl.
    for(let i=0;i<12+t*2;i++){const a=i*0.42,y=0.05+i*0.042;box(r,b,'marble',0.19,0.035,0.11,Math.cos(a)*0.2,y,Math.sin(a)*0.2,{ry:-a});box(r,b,'water',0.15,0.014,0.07,Math.cos(a)*0.2,y+0.023,Math.sin(a)*0.2,{ry:-a});}
    const flow=r.bone('flow',b);tube(r,flow,'waterSheet',[[0.2,0.78,0],[0.29,0.54,0.06],[0.21,0.06,0.22]],0.022);gem(r,b,c,-0.02,0.71,0,0.035,0.15);return [0.85];
  },
  fire(r,b,t,c){
    box(r,b,'brick',0.43,0.48,0.36,0,0.24);box(r,b,'iron',0.18,0.24,0.015,0,0.18,0.188);box(r,b,'glow:'+c,0.13,0.17,0.008,0,0.18,0.199);
    for(let i=0;i<5;i++)box(r,b,'iron',0.009,0.19,0.02,-0.055+i*0.027,0.18,0.21);
    for(const x of [-0.13,0.13]){r.add(b,'copper',G.cyl(0.055,0.065,0.38,{x,y:0.62,z:-0.09},12));band(r,b,'iron',0.063,0.76,-0.09,{x});}
    const aim=r.bone('aim',b,{y:0.39});tube(r,aim,'iron',[[0,0,0],[0.12,0.04,0],[0.29,0.06,0]],0.065);return [0.9,'aim'];
  },
  wind(r,b,t,c){
    const rotor=r.bone('rotor',b,{y:0.5});r.add(b,'iron',G.cyl(0.025,0.05,0.9,{y:0.45},12));
    around(3,0.19,(x,z,a)=>{tube(r,rotor,'blade',[[x,-0.36,z],[x*1.45,0,z*1.45],[x,0.36,z]],0.035);beam(r,rotor,'gold',[0,-0.3,0],[x,-0.3,z],0.008);beam(r,rotor,'gold',[0,0.3,0],[x,0.3,z],0.008);});gem(r,b,c,0,0.96,0,0.04,0.1);return [1.05];
  },
  earth(r,b,t,c){
    for(const x of [-0.11,0.11])box(r,b,'rock',0.15,0.2,0.22,x,0.1);box(r,b,'rock',0.31,0.32,0.25,0,0.36);box(r,b,'rock',0.23,0.17,0.21,0,0.63);
    box(r,b,'rock',0.19,0.25,0.19,-0.27,0.43,0,{rz:0.3});box(r,b,'rock',0.24,0.23,0.24,0.26,0.36);gem(r,b,c,0,0.4,0.13,0.045,0.15);return [0.77];
  },
  'dark+light'(r,b,t,c){
    r.add(b,'obsidian',G.torus(0.38,0.075,{y:0.43},PI*1.55));r.add(b,'gold',G.torus(0.38,0.01,{y:0.43,z:0.067},PI*1.55));
    const core=r.bone('energyCore',b,{y:0.43});r.add(core,'blackSun',G.sphere(0.14,{},24));band(r,core,'glow:#eed99c',0.15,0,0,{rx:0});gem(r,b,c,-0.3,0.68,0,0.04,0.18);return [0.9];
  },
  'light+water'(r,b,t,c){
    box(r,b,'marble',0.48,0.12,0.18,0,0.06);for(let i=0;i<5;i++){const a=(i-2)*0.36;gem(r,b,i%2?'#ffe5a0':c,Math.sin(a)*0.23,0.36+Math.cos(a)*0.14,0,0.065,0.47-Math.abs(i-2)*0.045);}
    beam(r,b,'gold',[-0.29,0.23,0],[0.29,0.23,0],0.012);return [0.87];
  },
  'fire+light'(r,b,t,c){
    box(r,b,'copper',0.24,0.56,0.24,0,0.28);gem(r,b,c,0,0.64,0,0.1,0.23);
    around(5,0.27,(x,z,a)=>{pillar(r,b,'iron',x,z,0.43);r.add(b,'mirror',G.cyl(0.115,0.115,0.016,{x,y:0.47,z,rx:0.6*Math.cos(a),rz:0.6*Math.sin(a)},6));});band(r,b,'glow:'+c,0.17,0.59);return [0.87];
  },
  'light+wind'(r,b,t,c){
    const aim=r.bone('aim',b,{y:0.4});box(r,b,'marble',0.14,0.38,0.12,0,0.19);
    box(r,aim,'gold',0.68,0.07,0.09,0.03,0);gem(r,aim,c,0.23,0.035,0,0.03,0.33);
    for(const s of [-1,1])for(let i=0;i<4;i++)leaf(r,aim,'blade',0.32-i*0.035,0.055,-0.12,0.03,s*(0.08+i*0.055),-s*0.7);return [0.69,'aim'];
  },
  'earth+light'(r,b,t,c){
    for(let i=0;i<5;i++)box(r,b,'sand',0.58-i*0.09,0.095,0.58-i*0.09,0,0.05+i*0.095);gem(r,b,c,0,0.57,0,0.07,0.25);
    for(let i=0;i<5;i++)box(r,b,'glow:'+c,0.045,0.018,0.009,(i%2?1:-1)*0.07,0.08+i*0.083,0.3-i*0.045,{rz:i*0.5});return [0.76];
  },
  'dark+water'(r,b,t,c){
    for(const x of [-0.26,0.26])pillar(r,b,'obsidian',x,0,0.85);beam(r,b,'iron',[-0.29,0.86,0],[0.29,0.86,0],0.025);
    r.add(b,'obsidian',G.lathe([[0.13,0.16],[0.24,0.25],[0.25,0.44],[0.21,0.52],[0.18,0.52],[0.18,0.3]],{},24));r.add(b,'abyssWater',G.cyl(0.18,0.18,0.016,{y:0.49},24));
    for(const x of [-0.17,0.17])for(let i=0;i<7;i++)r.add(b,'iron',G.torus(0.018,0.004,{x,y:0.51+i*0.05,rx:i%2*PI/2}));gem(r,b,c,0,0.7,0,0.04,0.13);return [0.94];
  },
  'dark+fire'(r,b,t,c){
    box(r,b,'obsidian',0.53,0.1,0.35,0,0.05);r.add(b,'bone',G.ell(0.24,0.22,0.19,{y:0.34},24));box(r,b,'bone',0.3,0.08,0.16,0,0.17,0.11);
    for(let i=0;i<6;i++)box(r,b,'bone',0.03,0.055,0.025,-0.1+i*0.04,0.22,0.2);
    for(const s of [-1,1])tube(r,b,'obsidian',[[s*0.17,0.48,0],[s*0.27,0.67,-0.03],[s*0.3,0.79,-0.08]],[0.06,0.004]);return [0.83];
  },
  'dark+wind'(r,b,t,c){
    const spin=r.bone('rotor',b,{y:0.49});for(let i=0;i<9;i++){const a=i*0.62;box(r,spin,'obsidian',0.19,0.04,0.075,Math.cos(a)*0.23,(i-4)*0.065,Math.sin(a)*0.23,{ry:-a,rz:0.2});gem(r,spin,c,Math.cos(a)*0.24,(i-4)*0.065,Math.sin(a)*0.24,0.016,0.05);}
    r.add(b,'blackSun',G.sphere(0.075,{y:0.47},16));return [0.9];
  },
  'dark+earth'(r,b,t,c){
    box(r,b,'stoneDark',0.32,0.2,0.68,0,0.1);box(r,b,'obsidian',0.35,0.065,0.64,0,0.25,0,{rz:0.12});gem(r,b,c,0,0.29,0,0.045,0.17);
    for(const z of [-0.25,0.25])for(let i=0;i<10;i++)r.add(b,'iron',G.torus(0.025,0.005,{x:-0.25+i*0.055,y:0.33-Math.sin(i/9*PI)*0.05,z,ry:PI/2,rx:i%2*PI/2}));for(const x of [-0.24,0.24])pillar(r,b,'stoneDark',x,0,0.42);return [0.49];
  },
  'fire+water'(r,b,t,c){
    for(const x of [-0.21,0.21])box(r,b,'brick',0.1,0.28,0.36,x,0.14);r.add(b,'copper',G.lathe([[0.17,0.2],[0.22,0.32],[0.3,0.51],[0.3,0.54],[0.26,0.54],[0.12,0.3]],{rz:0.15},24));r.add(b,'lava',G.cyl(0.22,0.22,0.02,{y:0.48},24));
    tube(r,b,'copper',[[0.27,0.43,0],[0.35,0.37,0],[0.36,0.12,0]],0.03);tube(r,b,'glow:'+c,[[0.31,0.39,0],[0.35,0.25,0],[0.36,0.08,0]],0.012);return [0.63];
  },
  'water+wind'(r,b,t,c){
    gem(r,b,c,0,0.55,0,0.07,0.88);for(let i=0;i<6;i++){const a=i*TAU/6,x=Math.cos(a),z=Math.sin(a);beam(r,b,'crystal:'+c,[0,0.48,0],[x*0.32,0.48,z*0.32],0.017);for(const side of [-1,1])beam(r,b,'crystal:'+c,[x*0.18,0.48,z*0.18],[x*0.26+z*side*0.07,0.54,z*0.26-x*side*0.07],0.012);}
    around(6,0.16,(x,z,a)=>gem(r,b,c,x,0.12,z,0.025,0.18));return [1.07];
  },
  'earth+water'(r,b,t,c){
    r.add(b,'mud',G.cyl(0.33,0.36,0.045,{y:0.025},20));tube(r,b,'woodDark',[[0,0,0],[-0.06,0.28,0],[0.04,0.52,-0.02],[0.14,0.69,0]],[0.09,0.025]);
    around(6,0.29,(x,z,a)=>tube(r,b,'woodDark',[[x,0.02,z],[x*0.65,0.12,z*0.65],[0,0.29,0]],[0.02,0.04]));for(const s of [-1,1]){tube(r,b,'woodDark',[[0,0.4,0],[s*0.23,0.58,0.03]],[0.025,0.007]);r.add(b,'moss',G.ell(0.18,0.055,0.13,{x:s*0.2,y:0.6},18));}return [0.76];
  },
  'fire+wind'(r,b,t,c){
    const aim=r.bone('aim',b,{y:0.34});for(const z of [-0.18,0.18])box(r,b,'iron',0.11,0.32,0.1,0,0.16,z);
    r.add(aim,'copper',G.lathe([[0.12,-0.27],[0.18,-0.12],[0.18,0.18],[0.12,0.32],[0.09,0.32],[0.12,0]],{rz:PI/2},24));const rotor=r.bone('rotor',aim,{x:-0.2,ry:PI/2});
    around(7,0.09,(x,z,a)=>leaf(r,rotor,'iron',0.1,0.025,x,z,0,-a));for(const z of [-0.12,0.12])leaf(r,aim,'copper',0.38,0.09,0,0.07,z,z>0?-0.5:0.5);gem(r,aim,c,0.25,0,0,0.045,0.16);return [0.64,'aim'];
  },
  'earth+fire'(r,b,t,c){
    const aim=r.bone('aim',b,{y:0.22});for(const z of [-0.14,0.14]){box(r,b,'iron',0.7,0.07,0.09,0,0.05,z);box(r,aim,'iron',0.7,0.07,0.05,0.08,0.07,z);box(r,aim,'glow:'+c,0.49,0.012,0.01,0.13,0.105,z);}
    box(r,aim,'copper',0.18,0.24,0.38,-0.22,0.12);for(let i=0;i<5;i++)box(r,aim,'iron',0.014,0.15,0.42,-0.3+i*0.04,0.12);rivets(r,aim,-0.3,0.19,0.22);return [0.53,'aim'];
  },
  'earth+wind'(r,b,t,c){
    for(const y of [0.08,0.81])box(r,b,'sand',0.45,0.075,0.45,0,y);around(4,0.24,(x,z,a)=>pillar(r,b,'sand',x,z,0.83));
    r.add(b,'crystal:#d9eced',G.lathe([[0.18,0.15],[0.21,0.21],[0.03,0.43],[0.21,0.65],[0.18,0.76]],{},24));r.add(b,'sandDark',G.cone(0.13,0.2,{y:0.27},16));tube(r,b,'glow:'+c,[[0,0.61,0],[0,0.39,0],[0,0.31,0]],0.008);return [0.91];
  },
  'fire+water+wind'(r,b,t,c){
    r.add(b,'copper',G.sphere(0.24,{y:0.3},24));for(const s of [-1,1])tube(r,b,'iron',[[s*0.2,0.2,0],[s*0.33,0.31,0],[s*0.31,0.56,0],[s*0.15,0.69,0]],0.036);
    const rotor=r.bone('rotor',b,{y:0.77});r.add(rotor,'iron',G.cyl(0.04,0.12,0.2,{},16));around(4,0.12,(x,z,a)=>leaf(r,rotor,'copper',0.25,0.045,x,0,z,-a));gem(r,b,c,0,0.88,0,0.05,0.21);band(r,b,'gold',0.22,0.3);return [1.03];
  },
  'earth+fire+water'(r,b,t,c){
    for(let i=0;i<7;i++){const a=i*TAU/7;box(r,b,'rock',0.22,0.2+(i%3)*0.1,0.24,Math.cos(a)*0.19,0.1+(i%3)*0.05,Math.sin(a)*0.19,{ry:a,rz:0.15});}
    r.add(b,'lava',G.cyl(0.16,0.17,0.03,{y:0.12},16));for(let i=0;i<3;i++){const x=(i-1)*0.13;tube(r,b,'glow:'+c,[[x,0.14,0],[x*0.8,0.34,0],[x*0.4,0.6+i*0.1,0]],[0.035,0.003]);}return [0.84];
  },
  'earth+water+wind'(r,b,t,c){
    tube(r,b,'crystal:'+c,[[-0.31,0,0],[-0.3,0.48,0],[-0.16,0.8,0],[0.08,0.84,0],[0.29,0.56,0],[0.32,0.04,0]],[0.09,0.06]);
    for(let i=0;i<7;i++){const x=-0.24+i*0.08;gem(r,b,c,x,0.7-Math.abs(x)*0.5,0,0.025,0.23+(i%3)*0.06);}box(r,b,'stoneDark',0.65,0.045,0.18,0,0.02);return [0.98];
  },
  'earth+fire+wind'(r,b,t,c){
    for(const z of [-0.2,0.2]){box(r,b,'woodDark',0.65,0.07,0.09,0,0.04,z);beam(r,b,'woodDark',[-0.18,0.08,z],[0.03,0.65,z],0.036);beam(r,b,'woodDark',[0.23,0.08,z],[0.03,0.65,z],0.036);}
    const aim=r.bone('aim',b,{y:0.62});beam(r,aim,'iron',[-0.24,-0.3,0],[0.27,0.39,0],0.026);box(r,aim,'rock',0.18,0.17,0.21,-0.24,-0.27);tube(r,aim,'iron',[[0.27,0.39,0],[0.34,0.19,0],[0.33,0.07,0]],0.004);r.add(aim,'rock',G.ico(0.12,{x:0.33,y:0.06},1));band(r,aim,'glow:'+c,0.105,0.06,0,{x:0.33});return [1.08,'aim'];
  },
};
export function buildSculptedTower(rig,head,style,tier){
  const identity=TOWER_IDENTITIES[style];if(!identity)throw Error('Missing tower identity: '+style);
  const color=palette[style.split('+')[0]]||'#ffda9d';const architecture=buildGrandTowerArchitecture(rig,head,style,tier,color);
  const mechanism=rig.bone('mechanism',head,{y:architecture.deck,z:architecture.weaponZ});
  const [height,aim]=builders[style](rig,mechanism,tier,color);
  // Tier scale is applied by models.js; recipe-specific details use tier above.
  mechanism.scale.setScalar(architecture.weaponScale);
  return {height:Math.max(architecture.height,architecture.deck+height*architecture.weaponScale),aim:aim||null};
}
export function animateSculptedTower(B,t,dt,boost=0){
  if(B.energyCore){B.energyCore.rotation.y=t*0.45;B.energyCore.position.y=B.energyCore.userData.restY+Math.sin(t*2)*0.025;}
  if(B.rotor)B.rotor.rotation.y=t*1.8;
  if(B.flow)B.flow.scale.y=1+Math.sin(t*3)*0.04;
  if(B.cloth)B.cloth.rotation.y=Math.sin(t*2)*0.12;
  if(B.sticks)B.sticks.rotation.z=Math.sin(t*5)*0.15;
  if(B.grandHalo)B.grandHalo.rotation.y=t*.18;
  if(B.grandSatellite)B.grandSatellite.rotation.y=-t*.24;
  for(const side of [0,1])if(B['elementWind'+side])B['elementWind'+side].rotation.z=t*.8;
}
