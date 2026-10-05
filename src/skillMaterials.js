import * as THREE from 'three';

export function zoneSurface(kind, texture) {
  const palettes={lava:[0x841f12,0xffd38a],mud:[0x372819,0xb89565],abyss:[0x210c43,0xc38aff],void:[0x060a1c,0x7ecbff]};
  const palette=palettes[kind]||palettes.abyss;
  return new THREE.ShaderMaterial({
    uniforms:{surface:{value:texture},time:{value:0},opacity:{value:0},base:{value:new THREE.Color(palette[0])},rim:{value:new THREE.Color(palette[1])},energy:{value:kind==='mud'?0.28:1.1},vortex:{value:kind==='void'||kind==='abyss'?1:0},lava:{value:kind==='lava'?1:0}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`
      uniform sampler2D surface;uniform float time,opacity,energy,vortex,lava;uniform vec3 base,rim;varying vec2 vUv;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=noise(p)*a;p=p*2.03+vec2(17.3,9.1);a*=.5;}return v;}
      void main(){
        vec2 p=vUv*2.-1.;float r=length(p),a=atan(p.y,p.x);
        float flow=fbm(p*6.+vec2(time*.12,-time*.08));
        float curls=fbm(vec2(a*2.5-r*8.+time*.65,r*10.-time*.3));
        float edge=1.-smoothstep(.72+flow*.14,.98,r);
        float spiral=pow(.5+.5*sin(a*5.-r*19.+time*2.+curls*4.),7.);
        float cracks=1.-smoothstep(.015,.075,abs(fbm(p*9.+flow*.7)-.48));
        float crust=smoothstep(.4,.63,fbm(p*12.-time*.03));
        float ring=exp(-abs(r-.77)*95.)+exp(-abs(r-.64)*120.)*.35;
        float glyph=step(.82,fract(a*12./6.28318+r*.8))*(1.-smoothstep(.012,.04,abs(r-.705)));
        vec4 tex=texture2D(surface,vUv);
        vec3 liquid=mix(base,rim,flow*.28)+rim*(cracks*.8+crust*.08)*lava;
        vec3 nebula=mix(base,rim,curls*.22)+rim*spiral*(.35+smoothstep(.1,.5,r));
        vec3 col=mix(liquid,nebula,vortex)+rim*(ring*.35+glyph*.22)*energy;
        float sigil=exp(-abs(r-.88)*110.)*step(.52,fract(a*16./6.28318));
        col+=rim*sigil*.35;col=mix(col,tex.rgb,.14);
        col*=mix(1.,smoothstep(.03,.2,r),vortex);
        gl_FragColor=vec4(col,edge*opacity*mix(.85,1.,flow));
      }`,transparent:true,depthWrite:false,side:THREE.DoubleSide,
  });
}

export function terrainLava() {
  return new THREE.ShaderMaterial({
    uniforms:{time:{value:0}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`uniform float time;varying vec2 vUv;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<4;i++){n+=noise(p)*a;p=p*2.04+13.1;a*=.5;}return n;}
      void main(){vec2 p=vUv*9.+vec2(time*.09,-time*.04);float n=fbm(p);float seam=1.-smoothstep(.018,.06,abs(n-.49));float hot=pow(seam,3.);vec3 crust=mix(vec3(.075,.035,.027),vec3(.24,.065,.026),n);vec3 col=crust+vec3(1.5,.32,.04)*seam+vec3(.5,.35,.1)*hot;gl_FragColor=vec4(col,1.);}`,side:THREE.DoubleSide,
  });
}
