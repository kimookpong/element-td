import { G } from './modelkit.js';
import { GRAND_TOWERS } from './grandTowerArchitecture.js';
/* Low foundation stones sit under the complete building, rather than a tall
 * display plinth. The building owns its walls, stairs, debris and tier growth. */
export function buildRunicPad(rig,tower,colors,tier){
  const key=tower.kind==='basic'?tower.base:tower.elements.slice().sort().join('+'),[,wall,,plan,radius]=GRAND_TOWERS[key],pad=rig.bone('pad'),top=0.025;
  rig.add(pad,wall,G.cyl(radius*1.1,radius*1.16,top,{y:top/2,ry:Math.PI/4},Math.max(3,plan)));
  return top;
}
