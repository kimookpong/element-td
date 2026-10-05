import * as THREE from 'three';
import { G } from './modelkit.js';

// Faceted anatomy follows the existing animated skeleton; no eye meshes.
export function sculptReferenceDragon(rig) {
  for(const part of rig.parts.values()) part.geos.forEach(g=>g.dispose());
  rig.parts.clear();
  const B=rig.bones, body=B.body;
  const add=(bone,role,...geos)=>rig.add(bone,role,...geos);
  add(body,'body',G.ell(.29,.19,.17,{x:-.07,y:.4},8),G.ell(.17,.23,.18,{x:.12,y:.46,rz:-.2},8));
  for(let i=0;i<6;i++) add(body,'belly',G.ell(.04,.023,.125,{x:.2-i*.066,y:.32-Math.sin(i/5*Math.PI)*.045},6));
  for(let i=0;i<7;i++) add(body,'shell2',G.cone(.038,.12,{x:.16-i*.072,y:.61-Math.abs(i-2)*.018,rz:.5,s:[1,1,.55]},4));
  B.neckA.position.set(.2,.51,0); B.neckB.position.set(.045,.18,0); B.head.position.set(.07,.18,0);
  for(const [name,end,r] of [['neckA',[.045,.18,0],.104],['neckB',[.07,.18,0],.078]]) {
    const neck=B[name];
    add(neck,'body',G.tube([[0,-.025,0],[-.015,.08,0],end],[r,r*.73],{},5,6));
    for(let i=0;i<4;i++) {
      const t=i/4;
      add(neck,'belly',G.ell(.039,.029,r*.96,{x:end[0]*t+r*.75,y:end[1]*t,rz:-.2},6));
      add(neck,'shell2',G.cone(.025,.085,{x:end[0]*t-r*.85,y:end[1]*t,rz:.85,s:[1,1,.6]},4));
    }
  }
  const head=B.head;
  add(head,'body',G.ell(.105,.075,.084,{},6),G.tube([[.025,-.01,0],[.12,-.037,0],[.18,-.064,0]],[.064,.027],{},4,5));
  add(head,'shell2',G.crystal(.05,.17,{x:.024,y:.067,rz:-.35,s:[1,1,.55]}));
  for(const side of [-1,1]) {
    add(head,'horn',G.tube([[-.045,.045,side*.055],[-.095,.15,side*.079],[-.115,.25,side*.085],[-.073,.34,side*.085]],[.032,.001],{},5,5));
    for(let i=0;i<3;i++) add(head,'shell2',G.cone(.032,.13-i*.017,{x:-.05-i*.035,y:.018-i*.028,z:side*.065,rz:.95,rx:side*.5},4));
    add(head,'dark',G.tube([[.07,-.052,side*.04],[.13,-.065,side*.028],[.17,-.068,side*.017]],.003,{},3,4));
  }
  add(B.jaw,'body',G.tube([[0,0,0],[.065,-.015,0],[.125,-.012,0]],[.035,.02],{},4,5));
  for(const side of [-1,1])for(let i=0;i<3;i++) add(B.jaw,'horn',G.cone(.007,.026,{x:.025+i*.03,y:.019,z:side*.022},4));
  for(const name of ['fl','fr','bl','br']) {
    const hip=B[name],knee=B[name+'K'],back=name.startsWith('b');
    hip.position.z=Math.sign(hip.position.z)*.15;
    add(hip,'body',G.ell(back?.105:.072,.115,.073,{y:-.045,x:back?-.025:0},6),G.tube([[0,0,0],[.018,-.09,0],[.008,-.17,0]],[.063,.032],{},4,5));
    add(hip,'shell2',G.crystal(.046,.13,{x:.035,y:-.06,rz:.3}));
    const lower=back?.2:.18;
    add(knee,'body',G.tube([[0,0,0],[-.016,-lower*.5,0],[.025,-lower,0]],[.043,.025],{},4,5),G.ell(.057,.032,.05,{x:.035,y:-lower},6));
    for(const z of [-.032,0,.032]) add(knee,'dark',G.tube([[.05,-lower,z],[.09,-lower-.009,z],[.112,-lower-.033,z]],[.019,.001],{},3,4));
  }
  for(const name of ['wingL','wingR']) {
    const wing=B[name],s=wing.userData.side;
    wing.position.set(.04,.57,s*.12); wing.scale.setScalar(1);
    const root=[0,0,0],elbow=[-.08,.32,s*.31];
    const tips=[[-.18,.39,s*.72],[-.38,.15,s*.65],[-.5,-.04,s*.46],[-.38,-.13,s*.19]];
    add(wing,'body',G.tube([root,[-.02,.16,s*.14],elbow],[.041,.025],{},4,5));
    for(let i=0;i<tips.length;i++) {
      const tip=tips[i];
      add(wing,'body',G.tube([elbow,[(elbow[0]+tip[0])*.5,(elbow[1]+tip[1])*.5,(elbow[2]+tip[2])*.5],tip],[.023,.006],{},4,5));
      if(i<tips.length-1) {
        const next=tips[i+1],notch=[(tip[0]+next[0])*.5+.045,(tip[1]+next[1])*.5+.065,(tip[2]+next[2])*.5];
        const center=[(elbow[0]+tip[0]+next[0])/3,(elbow[1]+tip[1]+next[1])/3-.015,(elbow[2]+tip[2]+next[2])/3];
        const outline=[elbow,tip,notch,next],vertices=[];
        for(let j=0;j<4;j++)vertices.push(...center,...outline[j],...outline[(j+1)%4]);
        const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();
        add(wing,i===2?'belly':'membrane',g);
      }
    }
    add(wing,'horn',G.cone(.02,.105,{x:elbow[0],y:elbow[1]+.047,z:elbow[2],rz:.2},4));
  }
  const lengths=[.16,.16,.15,.14,.13];
  for(let i=0;i<5;i++) {
    const tail=B['tail'+i],len=lengths[i],r=.082-i*.014;
    if(i===0)tail.position.set(-.3,.4,0);else tail.position.set(-lengths[i-1],0,0);
    tail.rotation.z=i===0?.5:-.48;
    add(tail,'body',G.tube([[.01,0,0],[-len*.5,0,0],[-len,0,0]],[r,Math.max(.006,r-.017)],{},4,6));
    add(tail,'belly',G.tube([[0,-r*.65,0],[-len*.5,-r*.65,0],[-len,-r*.48,0]],[r*.43,r*.28],{},4,5));
    for(let j=0;j<2;j++)add(tail,'shell2',G.cone(.026-i*.003,.082-i*.009,{x:-len*(.2+j*.5),y:r+.023,rz:.4,s:[1,1,.5]},4));
    if(i===4)add(tail,'shell2',G.crystal(.027,.105,{x:-len-.035,rz:Math.PI/2}));
  }
}
