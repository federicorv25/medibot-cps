// @ts-nocheck -- escena procedural portada desde la vista 3D independiente; pendiente tiparla por partes.
/*
 * Complejo hospitalario 3D de MediBot CPS (vista independiente).
 * Tres torres en U alrededor de un patio, fachada por torre, interior por plantas,
 * circuito del robot y recorrido animado que sale y vuelve a la estación MediBot
 * (Torre Oeste, planta baja). Complejo ficticio con fines ilustrativos.
 */
import './campus.css'
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ================= datos ================= */
const CAT = {
  emg:{n:'Emergencias',c:0xf4bcb1}, far:{n:'Farmacia',c:0x83cab1}, dx:{n:'Diagnóstico',c:0x9cc6d1},
  qx:{n:'Quirófanos',c:0xa5b9e2}, uci:{n:'Cuidados intensivos',c:0xc4b9e4}, int:{n:'Internación',c:0xa7cdde},
  amb:{n:'Consulta externa',c:0xcfe3f5}, lab:{n:'Laboratorio',c:0xd9cff0}, mat:{n:'Maternidad',c:0xf3d2e6},
  adm:{n:'Administración',c:0xf5e3b8}, srv:{n:'Núcleo y servicios',c:0xd8d4cc}
};
const FH = 4;
// u = eje largo de la torre (x local), v = eje corto (z local). face: lado del patio en v.
const TOWERS = [
 { id:'B', name:'Torre Oeste', x:-34, z:3, rot:-Math.PI/2, L:34, S:16, face:-1, floors:[
   ['Farmacia central','far',['Farmacia Central','Estación MediBot','Recepción de insumos','Despacho','Admisión']],
   ['Consulta externa','amb',['Consultorios A','Consultorios B','Odontología','Vacunas','Enfermería']],
   ['Internación clínica','int',['Internación clínica','Hab. 201–206','Hab. 207–212','Enfermería','Ropería']],
   ['Pediatría','int',['Pediatría','Hab. pediátricas','Lactario','Juegos','Enfermería']] ]},
 { id:'A', name:'Torre Central', x:0, z:-22, rot:0, L:40, S:16, face:1, floors:[
   ['Emergencias y admisión','emg',['Urgencias','Triaje','Observación','Admisión','Afiliación']],
   ['Diagnóstico','dx',['Diagnóstico','Tomografía','Ecografía','Rayos X','Informes']],
   ['Quirófanos','qx',['Quirófanos','Recuperación','Esterilización','Prelavado','Anestesia']],
   ['Cuidados intensivos','uci',['Cuidados intensivos','Terapia intermedia','Neonatología','Aislamiento','Enfermería']],
   ['Internación','int',['Internación','Hab. 401–406','Hab. 407–412','Sala de médicos','Utilería']] ]},
 { id:'C', name:'Torre Este', x:34, z:3, rot:-Math.PI/2, L:34, S:16, face:1, floors:[
   ['Laboratorio y rehabilitación','lab',['Laboratorio','Toma de muestras','Banco de sangre','Rehabilitación','Fisioterapia']],
   ['Maternidad','mat',['Maternidad','Sala de partos','Neonatos','Hab. maternas','Enfermería']],
   ['Internación quirúrgica','int',['Internación quirúrgica','Hab. 201–206','Hab. 207–212','Curaciones','Enfermería']],
   ['Administración','adm',['Dirección','Administración','Recursos humanos','Sistemas','Sala de reuniones']] ]},
];
const BY = Object.fromEntries(TOWERS.map(t=>[t.id,t]));
document.getElementById('leg').innerHTML = Object.values(CAT).map(k=>`<span><i style="background:#${k.c.toString(16).padStart(6,'0')}"></i>${k.n}</span>`).join('')+'<span><i style="background:#3fe0b5"></i>Circuito</span>';

/* ================= escena ================= */
const canvas=document.getElementById('c');
const renderer=new T.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
renderer.shadowMap.enabled=false;
const scene=new T.Scene(); scene.background=new T.Color(0xece8e2);
scene.add(new T.HemisphereLight(0xfffdf7,0x9a9488,2.1));
const sun=new T.DirectionalLight(0xfff4e2,2.2); sun.position.set(-60,110,70); scene.add(sun);
const fill=new T.DirectionalLight(0xdcefff,.55); fill.position.set(70,40,-60); scene.add(fill);
const camera=new T.PerspectiveCamera(34,1,1,1500);
camera.position.set(78,78,118);
const controls=new OrbitControls(camera,canvas); controls.enableDamping=true; controls.maxPolarAngle=Math.PI*.47; controls.minDistance=25; controls.maxDistance=330;
controls.target.set(0,6,-2);

/* ---- utilidades de geometría con color por vértice ---- */
class Builder{
  constructor(){this.parts=[]}
  add(geo,color,x=0,y=0,z=0){
    let g=geo.index?geo.toNonIndexed():geo; if(g===geo)g=geo.clone();
    g.deleteAttribute('uv'); g.translate(x,y,z);
    const c=new T.Color(color), n=g.attributes.position.count, arr=new Float32Array(n*3);
    for(let i=0;i<n;i++){arr[i*3]=c.r;arr[i*3+1]=c.g;arr[i*3+2]=c.b}
    g.setAttribute('color',new T.BufferAttribute(arr,3)); this.parts.push(g); geo.dispose?.(); return this;
  }
  box(w,h,d,x,y,z,color){return this.add(new T.BoxGeometry(w,h,d),color,x,y,z)}
  mesh(mat){ if(!this.parts.length) return new T.Group(); const m=new T.Mesh(mergeGeometries(this.parts),mat); this.parts.forEach(p=>p.dispose()); this.parts=[]; return m; }
}
const vc=(o={})=>new T.MeshStandardMaterial(Object.assign({vertexColors:true,roughness:.85},o));
function sprite(text,accent,scale=1,dark=false){
  const cv=document.createElement('canvas');cv.width=512;cv.height=100;const g=cv.getContext('2d');
  g.fillStyle=dark?'#17322c':'#fbfaf6';g.beginPath();g.roundRect(4,4,504,92,22);g.fill();
  if(!dark){g.strokeStyle='#d3ccbf';g.lineWidth=4;g.stroke();}
  g.fillStyle='#'+accent.toString(16).padStart(6,'0');g.beginPath();g.roundRect(22,36,28,28,7);g.fill();
  g.fillStyle=dark?'#e9fff8':'#1f3530';g.font='600 38px system-ui';g.textBaseline='middle';g.fillText(text,64,52,430);
  const tx=new T.CanvasTexture(cv);tx.colorSpace=T.SRGBColorSpace;
  const s=new T.Sprite(new T.SpriteMaterial({map:tx,depthTest:false,transparent:true}));s.scale.set(6.4*scale,1.25*scale,1);s.renderOrder=20;return s;
}
const lighten=(c,f)=>{const a=new T.Color(c);a.lerp(new T.Color(0xffffff),f);return a.getHex()};

/* ================= terreno, patio y jardín ================= */
const site=new Builder();
function rounded(w,d,r){const s=new T.Shape(),x=-w/2,y=-d/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+d-r);s.quadraticCurveTo(x+w,y+d,x+w-r,y+d);s.lineTo(x+r,y+d);s.quadraticCurveTo(x,y+d,x,y+d-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s}
{ const base=new T.ExtrudeGeometry(rounded(118,92,14),{depth:1.6,bevelEnabled:false,curveSegments:10}); base.rotateX(-Math.PI/2); site.add(base,0xcfcac0,0,-1.6,3);
  const grass=new T.ExtrudeGeometry(rounded(114,88,12),{depth:.12,bevelEnabled:false,curveSegments:10}); grass.rotateX(-Math.PI/2); site.add(grass,0x9fbe7a,0,0,3);
}
// patio pavimentado frente a las torres
site.box(52,.1,30,0,.12,3.5,0xe3dccf);
site.add(new T.CylinderGeometry(15.5,15.5,.14,64),0xd9d1c2,0,.14,2);
site.add(new T.CylinderGeometry(10.5,10.5,.18,64),0xa7c483,0,.16,2);
site.add(new T.CylinderGeometry(6,6,.2,48),0xe8e1d4,0,.18,2);
site.add(new T.CylinderGeometry(2.6,2.8,.7,32),0xcfc7b8,0,.45,2);
site.add(new T.CylinderGeometry(2.3,2.3,.1,32),0x86a660,0,.82,2);
// bancas
for(const a of [0.5,2.2,3.9,5.5]){const x=Math.cos(a)*4.6,z=2+Math.sin(a)*4.6;const g=new T.BoxGeometry(2.6,.45,.8);g.rotateY(-a+Math.PI/2);site.add(g,0xbfb6a6,x,.45,z);const s=new T.BoxGeometry(2.4,.12,.6);s.rotateY(-a+Math.PI/2);site.add(s,0xa0743f,x,.72,z)}
// jardineras
for(const [x,z,w,d] of [[-9,-2,5,3],[9,-2,5,3],[-9,7,4,3],[9,7,4,3],[-19,16,10,4],[19,16,10,4]]){site.box(w,.6,d,x,.4,z,0xcfc7b8);site.box(w-.4,.15,d-.4,x,.75,z,0x7f9f55)}
scene.add(site.mesh(vc()));

/* árboles: tajibo amarillo, jacarandá y verdes */
const trees=new Builder();
function tree(x,z,kind='g',s=1){
  const col={g:[0x6e9a45,0x5d8a3a,0x7fa955],j:[0x9b80cf,0x8a6fc0,0xae95d9],t:[0xe9c33c,0xdcb22f,0xf0d25c],d:[0x4f7b3b,0x5d8a43,0x46703a]}[kind];
  trees.add(new T.CylinderGeometry(.22*s,.32*s,2.4*s,7),0x7a5a3c,x,1.2*s,z);
  const blobs=[[0,3.1,0,1.7],[.9,2.7,.4,1.2],[-.8,2.8,-.3,1.25],[.2,3.6,-.6,1.1]];
  blobs.forEach(([bx,by,bz,r],i)=>{const g=new T.IcosahedronGeometry(r*s,1);trees.add(g,col[i%3],x+bx*s,by*s,z+bz*s)});
}
function bush(x,z,kind='d',s=1){const col={d:0x547f3e,p:0x9b80cf,y:0xd8b839}[kind];trees.add(new T.IcosahedronGeometry(.8*s,1),col,x,.6*s,z);trees.add(new T.IcosahedronGeometry(.6*s,1),0x5f8b45,x+.7*s,.5*s,z+.3*s)}
tree(0,2,'t',1.25);
[[-14,-6,'j'],[14,-7,'g'],[-23,24,'g'],[23,25,'j'],[-50,-20,'g'],[50,-22,'g'],[-50,30,'g'],[50,32,'g'],[-12,30,'j'],[12,34,'g'],[-30,-33,'j'],[30,-33,'g'],[0,-38,'g'],[-46,10,'t'],[46,8,'j']].forEach(([x,z,k])=>tree(x,z,k,1));
[[-9,-2,'p'],[9,-2,'d'],[-9,7,'y'],[9,7,'p'],[-19,16,'d'],[19,16,'y'],[-17,16,'p'],[21,16,'d'],[-6,24,'d'],[8,22,'p'],[-36,26,'d'],[36,26,'y'],[-40,-16,'d'],[40,-17,'p']].forEach(([x,z,k])=>bush(x,z,k,1));
scene.add(trees.mesh(vc({flatShading:true,roughness:.9})));

/* ================= camino exterior del robot ================= */
const RING_R=13, RING_C=[0,2];
const ringPt=a=>[RING_C[0]+RING_R*Math.cos(a), RING_C[1]+RING_R*Math.sin(a)];
const DOORS={ A:{ang:-Math.PI/2, door:[0,-14]}, B:{ang:Math.PI, door:[-26,3]}, C:{ang:0, door:[26,3]} };
const BASE={ang:Math.PI/2, pts:[[0,15],[3,19],[6,24],[4,30],[-2,36],[-3,41]]}; // hacia la estación de carga
function ribbon(points,width,y,color,b){
  const g=new T.BufferGeometry(), pos=[];
  for(let i=0;i<points.length-1;i++){
    const [x0,z0]=points[i],[x1,z1]=points[i+1]; const dx=x1-x0,dz=z1-z0,l=Math.hypot(dx,dz)||1, nx=-dz/l*width/2, nz=dx/l*width/2;
    pos.push(x0+nx,y,z0+nz, x0-nx,y,z0-nz, x1+nx,y,z1+nz, x1+nx,y,z1+nz, x0-nx,y,z0-nz, x1-nx,y,z1-nz);
  }
  g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.computeVertexNormals(); b.add(g,color);
}
function smooth(pts,n=12){const c=new T.CatmullRomCurve3(pts.map(([x,z])=>new T.Vector3(x,0,z)));return c.getPoints(pts.length*n).map(v=>[v.x,v.z])}
function offsetLine(points,off){const out=[];for(let i=0;i<points.length;i++){const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;out.push([points[i][0]-dz/l*off,points[i][1]+dx/l*off])}return out}
const ringPts=[];for(let i=0;i<=96;i++)ringPts.push(ringPt(i/96*Math.PI*2));
const spurs={};for(const id of ['A','B','C']){const p=ringPt(DOORS[id].ang);spurs[id]=[p,DOORS[id].door]}
const basePts=smooth(BASE.pts,10);
const walk=new Builder();
ribbon(ringPts,2.8,.2,0xd6cdbd,walk); ribbon(basePts,2.8,.2,0xd6cdbd,walk);
for(const id in spurs) ribbon(spurs[id],2.8,.2,0xd6cdbd,walk);
scene.add(walk.mesh(vc()));
const glowMat=new T.MeshBasicMaterial({color:0x6ff0cf});
const glow=new T.Group(); scene.add(glow);
function glowLine(points,y=.26,r=.07){ if(points.length<2)return; const c=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,y,z)),false,'catmullrom',0);
  glow.add(new T.Mesh(new T.TubeGeometry(c,Math.max(8,points.length*2),r,5,false),glowMat)); }
for(const off of [-1.3,1.3]){ glowLine(offsetLine(ringPts,off)); for(const id in spurs) glowLine(offsetLine(spurs[id],off)); }
// balizas
const bol=new Builder();
for(let i=0;i<basePts.length;i+=9){const [x,z]=offsetLine(basePts,(i/9)%2?1.9:-1.9)[i];bol.add(new T.CylinderGeometry(.16,.18,1.1,10),0x3f6e62,x,.75,z);bol.add(new T.CylinderGeometry(.17,.17,.18,10),0x9ff5dd,x,1.38,z)}
for(let i=0;i<96;i+=12){const [x,z]=offsetLine(ringPts,1.9)[i];bol.add(new T.CylinderGeometry(.16,.18,1.1,10),0x3f6e62,x,.75,z);bol.add(new T.CylinderGeometry(.17,.17,.18,10),0x9ff5dd,x,1.38,z)}
scene.add(bol.mesh(vc({emissive:0x113a30,emissiveIntensity:.4})));

/* ================= torres ================= */
const toWorld=(t,u,v)=>[t.x+u*Math.cos(t.rot)+v*Math.sin(t.rot), t.z-u*Math.sin(t.rot)+v*Math.cos(t.rot)];
function layout(t){ // salas por planta
  const n=Math.floor(t.L/6.8), seg=t.L/n, rd=(t.S-3)/2, m=Math.floor(n/2);
  return {n,seg,rd,m, uOf:i=>-t.L/2+seg*(i+.5), vRow:s=>s*(1.5+rd/2)};
}
let sep=1, sepTarget=1;
for(const t of TOWERS){
  const g=new T.Group(); g.position.set(t.x,0,t.z); g.rotation.y=t.rot; scene.add(g); t.group=g;
  const lay=layout(t); t.lay=lay;
  t.interior=[]; t.facadeFloors=[]; t.labels=[];
  t.mat={ facade:vc({transparent:true,roughness:.6}), glass:new T.MeshStandardMaterial({color:0x2e6d70,roughness:.15,metalness:.35,transparent:true,opacity:.92}),
          warm:new T.MeshStandardMaterial({color:0xf3dfb2,emissive:0xf0c878,emissiveIntensity:.55,roughness:.4,transparent:true,opacity:.9}) };
  for(const m of Object.values(t.mat)) m.userData.base=m.opacity;
  t.stations=[];
  t.floors.forEach(([fname,cat,names],k)=>{
    /* ---- interior ---- */
    const b=new Builder(), fg=new T.Group(); g.add(fg); fg.userData.k=k;
    b.box(t.L+.6,.35,t.S+.6,0,-.18,0,0x6b7f78);
    b.box(t.L,.08,t.S,0,.02,0,0xf3f1ec);
    b.box(t.L,.06,3,0,.08,0,0xfbfaf7);
    const color=CAT[cat].c; let ni=0;
    const rooms=[];
    for(const s of [-1,1]) for(let i=0;i<lay.n;i++){
      let name, rc;
      const isLift = s===-t.face && i===lay.m, isStair = s===-t.face && i===lay.n-1, isHall = s===t.face && i===lay.m;
      if(isLift){name='Ascensor';rc=0xb9b6d6} else if(isStair){name='Escaleras';rc=CAT.srv.c} else if(isHall){name=k===0?'Hall de acceso':'Sala de espera';rc=0xf1ede4}
      else { name=names[ni % names.length]; rc= ni===0?color:lighten(color,.45); ni++; }
      const u=lay.uOf(i), v=lay.vRow(s), w=lay.seg, d=lay.rd;
      rooms.push({name,u,v,s,isLift,station:ni===1&&!isLift&&!isStair&&!isHall&&name===names[0]});
      if(name==='Estación MediBot'){ rc=0x8fe3c8; t.base={u,v,k}; }
      b.box(w-.12,.1,d-.12,u,.1,v,rc);
      const wallC=0xe9ece8, H=1.3;
      // muro trasero y laterales
      b.box(w,H,.14,u,H/2,v+s*d/2,wallC);
      b.box(.14,H,d,u-w/2,H/2,v,wallC); b.box(.14,H,d,u+w/2,H/2,v,wallC);
      // muro hacia el pasillo con puerta (el hall queda abierto)
      if(!isHall){const gap=isLift?2.2:1.7, side=(w-gap)/2; b.box(side,H,.14,u-(gap+side)/2,H/2,v-s*d/2,wallC); b.box(side,H,.14,u+(gap+side)/2,H/2,v-s*d/2,wallC);}
      if(!isLift&&!isStair&&!isHall&&name!=='Estación MediBot'){ for(const o of [-1,1]) b.box(1.3,.6,1.8,u+o*w*.22,.4,v+s*d*.18,0xdfe7e3); }
      if(isLift) b.box(w*.6,.12,d*.6,u,.16,v,0x7b78a6);
      if(name==='Estación MediBot'){ b.box(3.2,.08,3.2,u,.17,v,0x2fbf94); b.box(.5,1.6,.9,u,.9,v+s*(d/2-.6),0x3a4a48); b.box(.52,.2,.6,u,1.5,v+s*(d/2-.85),0x47f0b8); }
    }
    t.stations[k]=rooms.find(r=>r.name===names[0]);
    t.liftRoom=rooms.find(r=>r.isLift);
    const im=b.mesh(vc()); fg.add(im); t.interior.push(fg);
    // rótulos
    const st=t.stations[k]; const lab=sprite(names[0],color,.9); lab.position.set(st.u,2.6,st.v); fg.add(lab); t.labels.push(lab);
    if(t.base && t.base.k===k){ const bl=sprite('Estación MediBot',0x2fbf94,.9); bl.position.set(t.base.u,2.6,t.base.v); fg.add(bl); t.labels.push(bl); }
    const ft=sprite((k===0?'PB':'P'+k)+' · '+fname,0x1f5c4e,1.2,true); ft.position.set(-t.L/2-4,1.8,0); fg.add(ft); t.labels.push(ft);

    /* ---- fachada de la planta ---- */
    const fb=new Builder(), gb=new Builder(), wb=new Builder();
    const off=.45, HL=t.L/2+off, HS=t.S/2+off, y0=k*FH;
    const sides=[[0,-HS,2*HL,'u',-1],[0,HS,2*HL,'u',1],[-HL,0,2*HS,'v',-2],[HL,0,2*HS,'v',2]];
    const white=0xf3f1ec, cream=0xe7e2d8, green=0x8fbfa6;
    for(const [cx,cz,len,ax,sideId] of sides){
      const along=ax==='u';
      const B=(w,h,d,x,y,z,c)=>fb.box(along?w:d,h,along?d:w,along?x:cx,y,along?cz:z,c);
      if(k===0){
        // planta baja vidriada con interior cálido
        if(along) wb.box(len-.4,FH-.9,.12,cx,y0+(FH-.9)/2+.2,cz,0xffffff); else wb.box(.12,FH-.9,len-.4,cx,y0+(FH-.9)/2+.2,cz,0xffffff);
        B(len+.3,.5,.6,0,y0+FH-.45,0,0x2f8075);
        const nm=Math.round(len/3); for(let i=0;i<=nm;i++){const o=-len/2+i*len/nm; if(along) fb.box(.22,FH-.7,.3,cx+o,y0+(FH-.7)/2,cz,0x2f8075); else fb.box(.3,FH-.7,.22,cx,y0+(FH-.7)/2,cz+o,0x2f8075)}
        B(len+.2,.25,.7,0,y0+.12,0,0x3b6d64);
      } else {
        B(len,1.05,.4,0,y0+.52,0,white);
        if(along) gb.box(len-.2,FH-1.2,.12,cx,y0+1.05+(FH-1.2)/2,cz,0xffffff); else gb.box(.12,FH-1.2,len-.2,cx,y0+1.05+(FH-1.2)/2,cz,0xffffff);
        const nm=Math.round(len/2.6); for(let i=0;i<=nm;i++){const o=-len/2+i*len/nm; if(along) fb.box(.24,FH-1.05,.36,cx+o,y0+1.05+(FH-1.05)/2,cz,cream); else fb.box(.36,FH-1.05,.24,cx,y0+1.05+(FH-1.05)/2,cz+o,cream)}
        // alero (parasol) en el lado del patio
        if(sideId===t.face) B(len+.6,.18,1.4,0,y0+FH-.05,(along? t.face*.7:0),white);
      }
    }
    // pilares de esquina
    for(const [x,z] of [[-HL,-HS],[HL,-HS],[-HL,HS],[HL,HS]]) fb.box(.9,FH,.9,x,y0+FH/2,z,k===0?0x2f8075:white);
    // panel verde vertical en la cara del patio
    if(k>0){ const gu=t.id==='A'?-8:-t.L/2+6; fb.box(5,FH,.6,gu,y0+FH/2,t.face*(HS+.15),green); for(let i=0;i<5;i++) fb.box(.18,FH,.3,gu-2+i,y0+FH/2,t.face*(HS+.5),0x7fb096); }
    // núcleo azul de escaleras en un extremo
    const cu = t.id==='A' ? -HL-1.4 : HL+1.4; fb.box(2.8,FH,t.S*.55,cu,y0+FH/2,-t.face*t.S*.18,0x2b3f66);
    const ff=new T.Group(); g.add(ff);
    ff.add(fb.mesh(t.mat.facade)); const gm=gb.mesh(t.mat.glass); gm.renderOrder=2; ff.add(gm); const wm=wb.mesh(t.mat.warm); wm.renderOrder=2; ff.add(wm);
    t.facadeFloors.push(ff);
  });
  // azotea
  const rb=new Builder(), top=t.floors.length*FH, HL=t.L/2+.45, HS=t.S/2+.45;
  rb.box(2*HL+.8,.5,2*HS+.8,0,top+.25,0,0xe6e2da);
  for(const [w,d,x,z] of [[2*HL+.8,.4,0,-HS-.2],[2*HL+.8,.4,0,HS+.2],[.4,2*HS+.8,-HL-.2,0],[.4,2*HS+.8,HL+.2,0]]) rb.box(w,1,d,x,top+1,z,0xf3f1ec);
  rb.box(9,2.2,5,t.L*.08,top+1.6,0,0xc9c6bf); for(let i=0;i<8;i++) rb.box(.1,1.9,5.1,t.L*.08-4+i*1.15,top+1.6,0,0x9e9b94);
  const cu = t.id==='A' ? -HL-1.4 : HL+1.4; rb.box(2.8,FH,t.S*.55,cu,top+FH/2,-t.face*t.S*.18,0x2b3f66);
  const roof=rb.mesh(t.mat.facade); g.add(roof); t.roof=roof;
  // caja invisible para elegir la torre
  const hit=new T.Mesh(new T.BoxGeometry(t.L+2,top+2,t.S+2),new T.MeshBasicMaterial({visible:false})); hit.position.y=top/2; hit.userData.tower=t.id; g.add(hit); t.hit=hit;
}
// galerías vidriadas que unen las torres en planta baja
const gal=new Builder(), galGlass=new Builder();
for(const sx of [-1,1]){ const x=sx*23, z=-14.5; gal.box(7,.5,6,x,FH-.25,z,0xf3f1ec); galGlass.box(7,FH-.6,.12,x,(FH-.6)/2,z+3,0xffffff); galGlass.box(7,FH-.6,.12,x,(FH-.6)/2,z-3,0xffffff); gal.box(7,.25,6.2,x,.12,z,0x3b6d64);}
scene.add(gal.mesh(vc())); { const m=galGlass.mesh(new T.MeshStandardMaterial({color:0xf3dfb2,emissive:0xf0c878,emissiveIntensity:.5,transparent:true,opacity:.85})); m.renderOrder=2; scene.add(m); }

/* ================= robot ================= */
const robot=new T.Group();{
  const rb=new Builder();
  for(const s of [-1,1]){ rb.box(.32,.42,1.5,s*.62,.24,0,0x232a2a); for(const z of [-.5,0,.5]) rb.add(new T.CylinderGeometry(.13,.13,.04,12).rotateZ(Math.PI/2),0x6f7c79,s*.8,.25,z); }
  rb.box(1.15,.75,1.15,0,.82,0,0xf2b630); rb.box(1.1,.12,1.1,0,1.24,0,0xffd36b); rb.box(.66,.36,.06,0,.82,.6,0x1d2b2a);
  rb.box(.5,.08,.04,0,.95,.63,0x47f0b8); rb.box(.2,.3,.2,0,1.44,-.1,0x6f7c79); rb.box(.8,.3,.4,0,1.68,-.05,0x232a2a);
  rb.box(.16,.12,.05,-.18,1.68,.17,0x47f0b8); rb.box(.16,.12,.05,.18,1.68,.17,0x47f0b8);
  robot.add(rb.mesh(vc({roughness:.6})));
  const ring=new T.Mesh(new T.RingGeometry(1.15,1.28,40),new T.MeshBasicMaterial({color:0x3fe0b5,transparent:true,opacity:.8,side:T.DoubleSide})); ring.rotation.x=-Math.PI/2; ring.position.y=.08; robot.add(ring);
  robot.scale.setScalar(1.5);
}
scene.add(robot);

/* ================= circuito interior ================= */
const routeGroup=new T.Group(); scene.add(routeGroup);
const routeMat=new T.MeshBasicMaterial({color:0x22c79a});
function floorY(k){return k*FH*sep}
function tube(pts,r=.12){ if(pts.length<2) return null; const c=new T.CatmullRomCurve3(pts,false,'catmullrom',0); return new T.Mesh(new T.TubeGeometry(c,pts.length*3,r,6,false),routeMat) }
function buildRoutes(){
  routeGroup.traverse(o=>o.geometry?.dispose()); routeGroup.clear();
  for(const t of TOWERS){
    const uMin=-t.L/2+1.5, uMax=t.L/2-1.5, lift=t.liftRoom;
    const W=(u,v,k)=>{const [x,z]=toWorld(t,u,v);return new T.Vector3(x,floorY(k)+.28,z)};
    const grp=new T.Group(); grp.userData.tower=t.id; routeGroup.add(grp);
    t.floors.forEach((_,k)=>{
      const add=m=>m&&grp.add(m);
      add(tube([W(uMin,0,k),W(uMax,0,k)]));
      const st=t.stations[k]; add(tube([W(st.u,0,k),W(st.u,st.v*0.9,k)]));
      add(tube([W(lift.u,0,k),W(lift.u,lift.v*.7,k)]));
      if(k===0) add(tube([W(0,0,0),W(0,t.face*(t.S/2+.6),0)]));
      if(k>0) add(tube([W(lift.u,lift.v*.7,k-1),W(lift.u,lift.v*.7,k)],.1));
    });
  }
}
buildRoutes();

/* ================= estado y selección ================= */
const ORDER=['B','A','C'];
let selected=new Set(['A','B','C']);
let facadeOn=true, routesOn=true, followOn=true;
const tl={A:1,B:1,C:1}; // nivel de fachada por torre (0..1)
const chips=document.getElementById('towerChips');
function renderChips(){
  chips.innerHTML='';
  const all=document.createElement('button');all.className='chip';all.textContent='Todas';all.setAttribute('aria-pressed',selected.size===3);all.onclick=()=>{selected=new Set(ORDER);update(true)};chips.appendChild(all);
  for(const id of ORDER){const b=document.createElement('button');b.className='chip';b.textContent=BY[id].name;b.setAttribute('aria-pressed',selected.has(id));
    b.onclick=()=>{ if(selected.has(id)&&selected.size>1) selected.delete(id); else selected.add(id); update(true) }; chips.appendChild(b);}
}
const tog=(id,fn)=>{const b=document.getElementById(id);b.onclick=()=>{if(b.disabled)return;const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',on);fn(on);update(false)}};
tog('tFacade',v=>{facadeOn=v; if(v){sepTarget=1;document.getElementById('tSep').setAttribute('aria-pressed','false')}});
tog('tSep',v=>{sepTarget=v?1.9:1});
tog('tRoute',v=>routesOn=v);
tog('tFollow',v=>followOn=v);
function setToggle(id,on){document.getElementById(id).setAttribute('aria-pressed',on)}
const goBtn=document.getElementById('go');
function update(refocus){
  renderChips();
  document.getElementById('tSep').disabled=facadeOn;
  const names=ORDER.filter(id=>selected.has(id)).map(id=>BY[id].name);
  if(!tour) goBtn.textContent='▶ Iniciar recorrido · '+(selected.size===3?'todo el complejo':names.join(' + '));
  showInfo();
  if(refocus) focusSelection();
}
function showInfo(){
  const info=document.getElementById('info'); const list=ORDER.filter(id=>selected.has(id));
  if(list.length!==1){ info.style.display='none'; return; }
  const t=BY[list[0]]; info.style.display='block';
  info.innerHTML=`<b>${t.name}</b><div style="color:#66736f">${t.floors.length} plantas · ${t.L} × ${t.S} m</div><ol>${t.floors.map((f,k)=>`<li><span>${k===0?'PB':'P'+k}</span><span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#${CAT[f[1]].c.toString(16).padStart(6,'0')}"></i> ${f[0]}</span></li>`).slice().reverse().join('')}</ol>`;
}
// enfoque de cámara
let camGoal=null;
function focusSelection(){
  const box=new T.Box3(); for(const id of selected){ box.expandByObject(BY[id].hit) }
  const c=box.getCenter(new T.Vector3()), size=box.getSize(new T.Vector3()).length();
  const dir=camera.position.clone().sub(controls.target).normalize();
  const dist=Math.max(45,size*1.25);
  camGoal={target:new T.Vector3(c.x,Math.min(c.y,8),c.z), pos:new T.Vector3(c.x,Math.min(c.y,8),c.z).add(dir.multiplyScalar(dist))};
}
// clic en torres
const ray=new T.Raycaster(), mouse=new T.Vector2(); let down=null;
canvas.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);
canvas.addEventListener('pointerup',e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  mouse.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1); ray.setFromCamera(mouse,camera);
  const hit=ray.intersectObjects(TOWERS.map(t=>t.hit))[0];
  if(!hit) return;
  const id=hit.object.userData.tower;
  if(e.ctrlKey||e.shiftKey||e.metaKey){ if(selected.has(id)&&selected.size>1) selected.delete(id); else selected.add(id); }
  else selected=new Set([id]);
  update(true);
});

/* ================= recorrido ================= */
let tour=null, paused=false;
function floorsPath(t){ // desde el centro de la planta baja, recorre todas las plantas y vuelve
  const uMin=-t.L/2+1.5, uMax=t.L/2-1.5, lift=t.liftRoom, P=[];
  const p=(u,v,k,label,wait)=>P.push({t:t.id,u,v,k,label,wait});
  t.floors.forEach(([fname],k)=>{
    const st=t.stations[k], lab=(k===0?'Planta baja':'Piso '+k)+' · '+fname;
    if(k===0) p(0,0,0,lab); else { p(lift.u,lift.v*.7,k,`Ascensor: llegó al piso ${k}`); p(lift.u,0,k,lab); }
    p(st.u,0,k); p(st.u,st.v*.9,k,`Entrega en ${st.name}`,1400); p(st.u,0,k);
    const far = st.u<0 ? uMax : uMin, near = st.u<0 ? uMin : uMax;
    p(near,0,k,'Recorriendo el pasillo'); p(far,0,k);
    p(lift.u,0,k); p(lift.u,lift.v*.7,k, k<t.floors.length-1?'Tomando el ascensor':'Bajando a planta baja');
  });
  p(lift.u,lift.v*.7,0,'Ascensor: planta baja'); p(lift.u,0,0); p(0,0,0);
  return P;
}
const doorIn=t=>({t:t.id,u:0,v:t.face*(t.S/2+.6),k:0});
function outdoorPath(fromAng,toAng){ // por el anillo del patio, camino más corto
  let d=toAng-fromAng; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI;
  const n=Math.max(2,Math.ceil(Math.abs(d)/(Math.PI/18))), P=[];
  for(let i=0;i<=n;i++){const [x,z]=ringPt(fromAng+d*i/n); P.push({x,z})}
  return P;
}
const HOME='B';
function buildTour(ids){
  const H=BY[HOME], base=H.base, pts=[];
  const out=(x,z,label)=>pts.push({x,z,label});
  pts.push({t:HOME,u:base.u,v:base.v,k:0,label:'Saliendo de la estación MediBot'});
  pts.push({t:HOME,u:base.u,v:0,k:0}); pts.push({t:HOME,u:0,v:0,k:0});
  let inside=HOME;
  const move=(to)=>{ // salir de la torre actual, cruzar el patio y entrar a la siguiente
    if(inside===to) return;
    const from=BY[inside], A=DOORS[inside], B=DOORS[to], t=BY[to];
    pts.push({...doorIn(from),label:`Saliendo de ${from.name}`});
    out(A.door[0],A.door[1]); const [ax,az]=ringPt(A.ang); out(ax,az,'Cruzando el patio');
    outdoorPath(A.ang,B.ang).forEach(q=>out(q.x,q.z));
    const [bx,bz]=ringPt(B.ang); out(bx,bz); out(B.door[0],B.door[1],`Camino a ${t.name}`);
    pts.push({...doorIn(t),label:`Entrando a ${t.name}`}); pts.push({t:to,u:0,v:0,k:0});
    inside=to;
  };
  for(const id of ids){ move(id); floorsPath(BY[id]).forEach(q=>pts.push(q)); }
  move(HOME);
  pts.push({t:HOME,u:base.u,v:0,k:0,label:'Regresando a la estación'});
  pts.push({t:HOME,u:base.u,v:base.v,k:0,label:'Recorrido completado · MediBot en su estación'});
  return pts;
}
function ptWorld(q){ if(q.t){ const t=BY[q.t]; const [x,z]=toWorld(t,q.u,q.v); return new T.Vector3(x,floorY(q.k)+.25,z) } return new T.Vector3(q.x,.25,q.z) }
function startTour(){
  const ids=ORDER.filter(id=>selected.has(id));
  tour={pts:buildTour(ids), i:0, s:0, wait:0, done:false, ids, total:0, travelled:0};
  // longitud estimada
  for(let i=1;i<tour.pts.length;i++) tour.total+=ptWorld(tour.pts[i-1]).distanceTo(ptWorld(tour.pts[i]));
  facadeOn=false; setToggle('tFacade',false); sepTarget=1.9; setToggle('tSep',true); routesOn=true; setToggle('tRoute',true);
  paused=false; document.getElementById('pause').textContent='Pausa';
  document.getElementById('ctl').style.display='flex'; document.getElementById('status').style.display='block';
  goBtn.disabled=true; goBtn.textContent='Recorrido en curso…';
  setStatus('Saliendo de la estación MediBot', 'Torre Oeste · Planta baja → '+ids.map(id=>BY[id].name).join(' → '));
  update(false);
}
function stopTour(msg){
  tour=null; goBtn.disabled=false; document.getElementById('ctl').style.display='none';
  if(msg) setStatus(msg,'Puedes elegir otras torres e iniciar de nuevo'); else document.getElementById('status').style.display='none';
  parkRobot(); update(false);
}
function setStatus(a,b){document.getElementById('stTitle').textContent=a; if(b!==undefined) document.getElementById('stSub').textContent=b;}
goBtn.onclick=startTour;
function parkRobot(){ robot.position.copy(ptWorld({t:HOME,u:BY[HOME].base.u,v:BY[HOME].base.v,k:0})); robot.rotation.y=0; }
parkRobot();
document.getElementById('pause').onclick=e=>{paused=!paused;e.target.textContent=paused?'Seguir':'Pausa'};
document.getElementById('stop').onclick=()=>stopTour('Recorrido detenido');
function stepTour(dt){
  if(!tour||paused) return;
  const speed=+document.getElementById('speed').value;
  let budget=dt*speed;
  while(budget>0 && tour){
    if(tour.wait>0){ const w=Math.min(tour.wait,budget); tour.wait-=w; budget-=w; continue; }
    const a=tour.pts[tour.i], b=tour.pts[tour.i+1];
    if(!b){ const last=tour.pts.at(-1); setStatus(last.label||'Recorrido completado'); document.getElementById('stBar').style.width='100%'; tour.done=true; tour=null; goBtn.disabled=false; document.getElementById('ctl').style.display='none'; update(false); return; }
    const A=ptWorld(a), B=ptWorld(b), len=A.distanceTo(B);
    const vertical=Math.abs(A.y-B.y)>.5 && Math.hypot(A.x-B.x,A.z-B.z)<.01;
    const v=vertical?2.2:6.5; // m/s
    const step=Math.min(len-tour.s, v*budget);
    tour.s+=step; budget-= step/v; tour.travelled+=step;
    const f=len?tour.s/len:1;
    robot.position.lerpVectors(A,B,f);
    if(!vertical && len>.01){ const h=Math.atan2(B.x-A.x,B.z-A.z); let d=h-robot.rotation.y; d=Math.atan2(Math.sin(d),Math.cos(d)); robot.rotation.y+=d*Math.min(1,dt*10); }
    if(tour.s>=len-1e-6){ tour.i++; tour.s=0; const q=tour.pts[tour.i]; if(q.label) setStatus(q.label, q.t? BY[q.t].name+(q.k!=null?' · '+(q.k===0?'Planta baja':'Piso '+q.k):'') : 'Patio exterior'); if(q.wait) tour.wait=q.wait/1000; }
  }
  if(tour) document.getElementById('stBar').style.width=Math.min(100,tour.travelled/tour.total*100).toFixed(1)+'%';
}

/* ================= bucle ================= */
const tagEl=document.getElementById('tag');
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}
addEventListener('resize',resize); resize();
const clock=new T.Clock(); let lastSep=sep;
update(false);
(function loop(){
  const dt=Math.min(clock.getDelta(),.1);
  // separación de plantas
  if(Math.abs(sep-sepTarget)>.001){ sep+=(sepTarget-sep)*Math.min(1,dt*6); if(Math.abs(sep-sepTarget)<.002) sep=sepTarget; }
  for(const t of TOWERS){
    const sel=selected.has(t.id), want = sel ? (facadeOn?1:0) : .16;
    tl[t.id]+= (want-tl[t.id])*Math.min(1,dt*5);
    const lv=tl[t.id], s = sel ? sep : 1;
    t.interior.forEach((fg,k)=>{ fg.position.y=k*FH*s; fg.visible = sel && lv<.97; });
    t.facadeFloors.forEach(ff=>{ ff.visible=lv>.02; }); // la fachada mantiene las plantas juntas
    t.roof.visible=lv>.02;
    for(const m of Object.values(t.mat)){ m.opacity=m.userData.base*lv; m.depthWrite=lv>.95; }
    t.labels.forEach(l=>l.visible= sel && lv<.3 && (sep>1.2 || l.parent.userData.k===t.floors.length-1));
  }
  if(Math.abs(lastSep-sep)>.01){ buildRoutes(); lastSep=sep; }
  routeGroup.children.forEach(g=>{ const t=BY[g.userData.tower]; g.visible=routesOn && selected.has(t.id) && tl[t.id]<.6; });
  glowMat.color.setHex(routesOn?0x6ff0cf:0xd6cdbd);
  stepTour(dt);
  // cámara
  if(camGoal){ controls.target.lerp(camGoal.target,Math.min(1,dt*3)); camera.position.lerp(camGoal.pos,Math.min(1,dt*3)); if(camera.position.distanceTo(camGoal.pos)<.5) camGoal=null; }
  if(tour && followOn){ const r=robot.position; const goal=new T.Vector3(r.x,r.y,r.z); const delta=goal.clone().sub(controls.target).multiplyScalar(Math.min(1,dt*2.5)); controls.target.add(delta); camera.position.add(delta); }
  controls.update();
  renderer.render(scene,camera);
  // etiqueta del robot
  { const p=robot.position.clone(); p.y+=3.2; p.project(camera); const onScreen=Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z<1; tagEl.style.display=onScreen?'block':'none'; tagEl.style.left=((p.x+1)/2*innerWidth)+'px'; tagEl.style.top=((1-p.y)/2*innerHeight)+'px';
    tagEl.textContent='MediBot · '+(tour?document.getElementById('stTitle').textContent:'En su estación · Torre Oeste, PB'); }
  requestAnimationFrame(loop);
})();
(window as unknown as { __ready: boolean }).__ready=true;
