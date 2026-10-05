import { G } from './modelkit.js';
import { ARCHITECTURE } from './towerArchitecture.js';
/* Low foundation stones sit under the complete building, rather than a tall
 * display plinth. The building owns its walls, stairs, debris and tier growth. */
export function buildRunicPad(rig,tower,colors,tier){
  const key=tower.kind==='basic'?tower.base:tower.elements.slice().sort().join('+'),s=ARCHITECTURE[key],pad=rig.bone('pad'),top=0.025;
  if(['stilt','camp','bell','mine','windmill','tree','siege'].includes(s.kind)) {
    for(const x of [-s.r,s.r])for(const z of [-s.r,s.r])rig.add(pad,'rock',G.ico(0.063,{x,y:0.019,z,s:[1.25,0.4,1]},0));
  } else rig.add(pad,s.wall,G.cyl(s.r*1.4,s.r*1.5,top,{y:top/2,ry:Math.PI/4},s.plan));
  return top;
}
