import * as THREE from 'three'
import { buildTailoredAvatar,releaseAvatarTextures } from '../../src/lib/tailored-avatar'
import { garments } from '../../src/data/wardrobe'
import type { Garment } from '../../src/types'
import { garmentPhoto,hasBackPhoto } from '../../src/lib/garment-photos'

const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true})
renderer.setSize(600,900);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95
const scene=new THREE.Scene()
scene.add(new THREE.HemisphereLight('#ffffff','#d5d6d0',1.3))
for(const [x,y,z,power] of [[-2,3,4,2.2],[2,2,2,.6]] as const){const light=new THREE.DirectionalLight('#fffaf5',power);light.position.set(x,y,z);scene.add(light)}
const camera=new THREE.OrthographicCamera(-.65,.65,.975,-.975,.1,20)
const dispose=(root:THREE.Object3D)=>{releaseAvatarTextures(root);root.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){m.geometry.dispose();(Array.isArray(m.material)?m.material:[m.material]).forEach(m=>m.dispose())}})}
const region:(name:string,x:number,y:number,z:number)=>boolean=(name,x,y)=>{
 if(name==='head')return y>1.56||(y>1.505&&Math.abs(x)<.07)
 if(name==='hands')return Math.abs(x)>.215&&y<.94
 if(name==='forearms')return Math.abs(x)>.215&&y<1.245
 if(name==='legs')return Math.abs(x)<.22&&y<.605&&y>.135
 if(name==='feet')return y<.15
 return true
}
export async function renderPart(id:string,side:'front'|'back',bodyRegion?:string,asLayer=false) {
 const garment=garments.find(g=>g.id===id)
 const slot=asLayer?'layers':garment?.category
 const selection=garment&&slot?{[slot]:id}:{}
 const root=await buildTailoredAvatar(garments,selection)
 for(const group of root.children){
  if(garment){
   group.visible=group.userData.slot===slot
   // With the body/base top behind an open layer, the interior back panel is
   // occluded. Preserve that aperture in a compositable transparent front pass.
   if(group.visible&&side==='front'&&slot==='layers')group.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;const g=m.geometry,p=g.getAttribute('position'),ix=g.getIndex();if(!ix)return;const kept:number[]=[];for(let i=0;i<ix.count;i+=3){const vertices=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)];if(!vertices.every(v=>p.getZ(v)<.04&&Math.abs(p.getX(v))<.105&&p.getY(v)<1.55))kept.push(...vertices)}g.setIndex(kept)})
  }
  else if(bodyRegion){group.traverse(o=>{const mesh=o as THREE.Mesh;if(!mesh.isMesh)return;const g=mesh.geometry,p=g.getAttribute('position'),ix=g.getIndex();if(!ix)return;const kept:number[]=[];for(let i=0;i<ix.count;i+=3){const a=ix.getX(i),b=ix.getX(i+1),c=ix.getX(i+2);if([a,b,c].some(v=>region(bodyRegion,p.getX(v),p.getY(v),p.getZ(v))))kept.push(a,b,c)}g.setIndex(kept)})}
 }
 root.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh)(Array.isArray(m.material)?m.material:[m.material]).forEach(m=>{m.side=THREE.DoubleSide})})
 // A modest downward angle reveals the sneaker vamp and sole. A level
 // orthographic camera collapsed the feet to dark, boot-like silhouettes.
 camera.position.set(0,1.36,side==='front'?5:-5);camera.lookAt(0,.925,0);scene.add(root);renderer.render(scene,camera)
 const png=renderer.domElement.toDataURL('image/png').split(',')[1]
 scene.remove(root);dispose(root)
 return png
}
export function renderList(){return garments.filter(g=>g.ownership!=='not-owned').map((g:Garment)=>({id:g.id,category:g.category,color:g.color,style:g.style,pattern:g.pattern,chestPocket:g.chestPocket,wearableAs:g.wearableAs,frontSource:garmentPhoto(g),backSource:hasBackPhoto(g)?garmentPhoto(g,'back'):undefined}))}
