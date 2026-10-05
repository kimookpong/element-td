import { G } from './modelkit.js';
const colors={light:'#ffe7a4',dark:'#a966d7',water:'#43bde4',fire:'#ff7029',wind:'#8bdcc2',earth:'#c9a16a'};

// Mixed towers carry physical motifs for every ingredient, rather than one color.
export function addElementArchitecture(r,parent,key,tier,R,H){
  const elements=key.split('+').filter(e=>colors[e]);
  elements.forEach((el,index)=>{
    const count=elements.length===1?2:1;
    for(let i=0;i<count;i++) {
      const angle=elements.length===1?(i===0?-Math.PI/2:Math.PI/2):index*Math.PI*2/elements.length+Math.PI/6;
      const x=Math.sin(angle)*R*.9,z=Math.cos(angle)*R*.9;
      const b=r.bone('elementFeature'+el+i,parent,{x,y:H*.32,z});
      const add=(role,...g)=>r.add(b,role,...g),c=colors[el],h=.24+tier*.035;
      if(el==='fire') {
        add('iron',G.cyl(.055,.036,.055,{y:.02},6));
        for(let j=0;j<3;j++)add(j===1?'glow:#ffb336':'crystal:'+c,G.tube([[(j-1)*.026,.04,0],[(j-1)*.018,h*.54,.012],[.017,h+(j===1?.045:0),0]],[j===1?.017:.024,.001],{},7,5));
        add('copper',G.torus(.047,.008,{y:.04,rx:Math.PI/2}));
      }else if(el==='water') {
        add('marble',G.cyl(.072,.082,.03,{y:.012},8),G.cyl(.049,.061,.024,{y:h},8));
        add('water',G.tube([[0,h,0],[.03,h*.64,.02],[-.02,h*.28,0],[0,.032,0]],[.026,.018],{},12,8));
        for(let j=0;j<3;j++)add('waterSheet',G.torus(.055-j*.009,.005,{y:.04+j*.006,rx:Math.PI/2}));
      }else if(el==='wind') {
        const rotor=r.bone('elementWind'+i,b,{y:h*.5});
        r.add(rotor,'iron',G.sphere(.02,{},8));
        for(let j=0;j<3;j++)r.add(rotor,'blade',G.feather(.12,.027,{rz:j*Math.PI*2/3,rx:-Math.PI/2}));
        add('iron',G.torus(.135,.008,{y:h*.5}));
        add('crystal:'+c,G.crystal(.018,.08,{y:.018}));
      }else if(el==='earth') {
        for(let j=0;j<3;j++)add(j===1?'sand':'rock',G.ico(.062,{x:(j-1)*.038,y:.05+j*.024,z:j%2*.02,s:[.72,1.5,.8]},0));
        add('crystal:'+c,G.crystal(.031,h*.62,{x:.015,y:h*.42}));
        add('bronze',G.tube([[-.073,.025,0],[-.055,h*.55,0],[.055,h*.55,0],[.073,.025,0]],.008,{},6,4));
      }else if(el==='light') {
        add('gold',G.torus(.082,.009,{y:h*.5}));
        for(let j=0;j<8;j++){const a=j*Math.PI/4;add('gold',G.cone(.011,.06,{x:Math.sin(a)*.108,y:h*.5+Math.cos(a)*.108,rz:-a},4));}
        add('crystal:'+c,G.crystal(.023,.10,{y:h*.5}));
      }else if(el==='dark') {
        add('obsidian',G.torus(.095,.025,{y:h*.5},Math.PI*1.45));
        add('obsidian',G.cone(.028,.085,{x:-.079,y:h*.5+.066,rz:.65},4));
        add('crystal:'+c,G.crystal(.021,.11,{y:h*.5}));
        for(const s of [-1,1])add('iron',G.tube([[s*.068,.025,0],[s*.053,h*.38,0],[s*.06,h*.8,0]],[.013,.004],{},6,4));
      }
    }
  });
}
