import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { avatarGarment } from './avatar-assets'
import { garmentPhoto, hasBackPhoto } from './garment-photos'
import { clothMaterial } from './cloth-material'
import { garments as catalogue } from '../data/wardrobe'
import { addChestPocket } from './garment-pocket'
import type { Garment, Selection } from '../types'
import fittedModels from '../../public/models/tailored/manifest.json'

const decoder = new DRACOLoader().setDecoderPath('/draco/').setDecoderConfig({type:'wasm'}).setWorkerLimit(1)
const loader = new GLTFLoader().setDRACOLoader(decoder)
const models = new Map<string, Promise<GLTF>>()
type TextureEntry={promise:Promise<THREE.Texture|undefined>;refs:number}
const maps = new Map<string, TextureEntry>()
const base = new Map(catalogue.map(g => [g.id,g]))
const modelHashes = new Map(fittedModels.assets.map(asset=>[asset.family,asset.sha256.slice(0,12)]))
export const tailoredRevision = 'studio-v2'
export function tailoredFamily(garment: Garment, slot: string) {
  const kind = avatarGarment(garment,slot).kind
  return kind === 'shorts' ? 'trousers-shorts' : kind === 'shoes' ? 'sneakers' : kind
}
function model(family: string) {
  const file = `/models/tailored/${family}.glb?v=${modelHashes.get(family)}`
  if (!models.has(file)) models.set(file,loader.loadAsync(file).catch(e=>{models.delete(file);throw e}))
  return models.get(file)!
}
async function photo(path: string,owned:Map<string,TextureEntry>) {
  if (!maps.has(path)) maps.set(path,{refs:0,promise:new THREE.TextureLoader().loadAsync(path).then(t=>{
    t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=2;return t
  }).catch(()=>{maps.delete(path);return undefined})})
  const entry=maps.get(path)!
  maps.delete(path);maps.set(path,entry)
  if(!owned.has(path)){entry.refs++;owned.set(path,entry)}
  return entry.promise
}
export function releaseAvatarTextures(root:THREE.Object3D) {
  for(const entry of (root.userData.textureEntries||[]) as TextureEntry[])entry.refs=Math.max(0,entry.refs-1)
  root.userData.textureUrls=[]
  root.userData.textureEntries=[]
  for(const [path,entry] of maps){if(maps.size<=16)break;if(!entry.refs){maps.delete(path);entry.promise.then(texture=>texture?.dispose())}}
}

/** The same standing form and pose are used for every construction and 2D render. */
export function bodyCovered(x: number,y: number,z: number,selection: Selection,garments: Garment[]) {
  const get=(slot:string)=>garments.find(g=>g.id===selection[slot as keyof Selection])
  const top=get('tops'),layer=get('layers'),bottoms=get('bottoms'),shoes=get('shoes')
  if (y>1.56) return false
  if (shoes && y<.15) return true
  const arm=Math.abs(x)>.215 && y>.72 && y<1.44
  if (bottoms && !arm && y<1.017 && (bottoms.style!=='shorts'||y>.605)) return true
  const outer=layer||top
  if (!outer) return false
  const short=['navy-shirt','teal-shirt','brown-shirt','white-shirt'].includes(outer.id)||outer.style==='tee'
  if (arm) return y>(short ? 1.23 : .875)
  const hem=outer.style==='coat' ? .565 : .975
  if (y<hem) return false
  if (y>1.505 && Math.abs(x)<.07) return false
  // Through an open outer layer with no base top, show the display form.
  if (layer&&!top&&z>.04&&Math.abs(x)<.055&&y<1.48) return false
  return true
}
function filterFaces(geometry: THREE.BufferGeometry,hidden:(x:number,y:number,z:number)=>boolean) {
  const p=geometry.getAttribute('position'),index=geometry.getIndex()
  if (!index) return
  const hide=(v:number)=>hidden(p.getX(v),p.getY(v),p.getZ(v)),kept:number[]=[]
  for(let i=0;i<index.count;i+=3){const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);if(!(hide(a)&&hide(b)&&hide(c)))kept.push(a,b,c)}
  geometry.setIndex(kept)
}
function shirtUVs(geometry:THREE.BufferGeometry,family:string,back:boolean,plainBack=false) {
  const p=geometry.getAttribute('position'),uv=new Float32Array(p.count*2)
  const trousers=family.startsWith('trousers'),hem=family==='coat'?.57:family==='trousers-shorts'?.61:trousers?.075:1.0
  for(let i=0;i<p.count;i++){
    let x=p.getX(i),h=p.getY(i),u:number,v:number
    if(back)x=-x
    if(trousers){const centre=x<0?-.1:.1;u=(x<0?.35:.65)+(x-centre)*.9;v=.12+(h-hem)/(1.015-hem)*.78}
    else if(Math.abs(x)>.215&&h<1.40){u=.38+Math.max(-.03,Math.min(.03,p.getZ(i)*.20));v=.17+(h-.88)*.05}
    else{u=.5+x/.46*.40;v=.13+(h-hem)/(1.535-hem)*.70}
    // Sample unprinted cloth for inferred plain backs, keeping front buttons
    // and chest pockets off the spine. Supplied back graphics use full UVs.
    if(back&&plainBack&&!trousers&&Math.abs(x)<.215&&h>1.0)u=.31+((x/.16+10)%1)*.14
    uv[i*2]=Math.max(.20,Math.min(.80,u));uv[i*2+1]=Math.max(.08,Math.min(.88,v))
  }
  return new THREE.BufferAttribute(uv,2)
}
function splitSides(geometry:THREE.BufferGeometry) {
  // UVs differ on the back so printed lettering reads correctly from behind.
  const nonIndexed=geometry.toNonIndexed();geometry.dispose()
  const attr=nonIndexed.getAttribute('position'),f:number[]=[],b:number[]=[]
  for(let i=0;i<attr.count;i+=3)((attr.getZ(i)+attr.getZ(i+1)+attr.getZ(i+2))/3>.025?f:b).push(i,i+1,i+2)
  nonIndexed.setIndex([...f,...b]);nonIndexed.clearGroups();nonIndexed.addGroup(0,f.length,0);nonIndexed.addGroup(f.length,b.length,1)
  return nonIndexed
}
function fillPhotoEdges(material:THREE.MeshPhysicalMaterial,garment:Garment) {
  material.onBeforeCompile=shader=>{
    shader.uniforms.fabricFallback={value:new THREE.Color(base.get(garment.id)?.color||garment.color)}
    shader.fragmentShader='uniform vec3 fabricFallback;\n'+shader.fragmentShader
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',THREE.ShaderChunk.map_fragment.replace('diffuseColor *= sampledDiffuseColor;', 'sampledDiffuseColor.rgb = mix(fabricFallback, sampledDiffuseColor.rgb, sampledDiffuseColor.a); sampledDiffuseColor.a = 1.0; diffuseColor *= sampledDiffuseColor;'))
  }
  material.customProgramCacheKey=()=> 'wardrobe-photo-fabric-v1'
}
export async function buildTailoredAvatar(garments:Garment[],selection:Selection) {
  const ownedTextures=new Map<string,TextureEntry>()
  const selected=Object.entries(selection).flatMap(([slot,id])=>{const g=garments.find(g=>g.id===id);return g?[{slot,g,family:tailoredFamily(g,slot)}]:[]})
  const files=['body',...selected.map(p=>p.family),...(!selection.bottoms?['trousers-shorts']:[])]
  const templates=new Map(await Promise.all([...new Set(files)].map(async f=>[f,await model(f)] as const)))
  const root=new THREE.Group();root.name='Blender Studio fitted display form';root.userData.slot='body'
  const body=new THREE.Group();body.name='Sculpted retail mannequin';body.userData.slot='body'
  templates.get('body')!.scene.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;const geo=m.geometry.clone();filterFaces(geo,(x,y,z)=>bodyCovered(x,y,z,selection,garments)||(!selection.bottoms&&y>.79&&y<1.02&&Math.abs(x)<.19));const material=new THREE.MeshPhysicalMaterial({color:'#d8d4c9',roughness:.55,metalness:0,sheen:.08,sheenRoughness:.8,envMapIntensity:.4});const part=new THREE.Mesh(geo,material);part.castShadow=part.receiveShadow=true;body.add(part)})
  root.add(body)
  if(!selection.bottoms){const modesty=new THREE.Group();modesty.userData.slot='body';templates.get('trousers-shorts')!.scene.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;const geo=m.geometry.clone();filterFaces(geo,(_x,y)=>y<.83);const part=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:'#bdb9af',roughness:1,side:THREE.DoubleSide}));modesty.add(part)});root.add(modesty)}
  await Promise.all(selected.map(async ({slot,g,family})=>{
    const group=new THREE.Group();group.name=g.name;group.userData.slot=slot
    const shoe=slot==='shoes'
    const front=shoe?undefined:await photo(garmentPhoto(g),ownedTextures)
    const back=!shoe&&hasBackPhoto(g)?await photo(garmentPhoto(g,'back'),ownedTextures):undefined
    templates.get(family)!.scene.traverse(o=>{
      const m=o as THREE.Mesh;if(!m.isMesh)return
      let geo=m.geometry.clone()
      const layer=selected.find(s=>s.slot==='layers')
      if(slot==='tops'&&layer){
        const outerShort=layer.family==='overshirt-short',outerHem=layer.family==='coat'?.57:.975
        filterFaces(geo,(x,y,z)=>{
          if(g.style==='hoodie'&&y>1.49)return false
          if(outerShort&&Math.abs(x)>.215&&y<1.245)return false
          if(y<outerHem+.005)return false
          return !(z>.04&&Math.abs(x)<.06+.024*Math.max(0,1.3-y)&&y<1.52)
        })
      }
      const source=(Array.isArray(m.material)?m.material[0]:m.material)
      const material=clothMaterial(g,source)
      const role=source.name.toLowerCase(),fabric=!role.startsWith('buttons')&&!role.startsWith('zipper')
      if(shoe){material.color.set(g.color);material.roughness=.8;if(role.startsWith('sneaker outsole'))material.color.multiplyScalar(.78);if(role.startsWith('sneaker laces'))material.color.lerp(new THREE.Color('#bcbdb7'),.17)}
      if(front&&fabric&&!shoe){
        geo=splitSides(geo)
        const frontUV=shirtUVs(geo,family,false),backUV=shirtUVs(geo,family,true,!hasBackPhoto(g)),index=geo.getIndex()!,uv=frontUV.clone()
        for(let i=geo.groups[1].start;i<index.count;i++){const vertex=index.getX(i);uv.setXY(vertex,backUV.getX(vertex),backUV.getY(vertex))}
        geo.setAttribute('uv',uv)
        const frontMat=material,backMat=material.clone();frontMat.map=front
        const original=base.get(g.id),tint=new THREE.Color(g.color)
        if(original){const old=new THREE.Color(original.color);tint.r/=Math.max(.01,old.r);tint.g/=Math.max(.01,old.g);tint.b/=Math.max(.01,old.b)}else tint.set('#ffffff')
        frontMat.color.copy(tint);backMat.map=back||(!g.pattern?front:undefined)||null
        if(backMat.map)backMat.color.copy(tint)
        frontMat.normalMap=backMat.normalMap=null;frontMat.roughnessMap=backMat.roughnessMap=null
        fillPhotoEdges(frontMat,g);fillPhotoEdges(backMat,g)
        const part=new THREE.Mesh(geo,[frontMat,backMat]);part.castShadow=part.receiveShadow=true;group.add(part)
        // Keep geometry ownership explicit; template buffers/textures stay shared.
      }else{const part=new THREE.Mesh(geo,material);part.castShadow=part.receiveShadow=true;group.add(part)}
    })
    if(g.chestPocket)addChestPocket(group,g)
    root.add(group)
  }))
  root.userData.assetFormat='glTF 2.0';root.userData.revision=tailoredRevision;root.userData.licensedSource='Blender Studio Human Base Meshes CC0 / independently authored fitted clothes'
  root.userData.textureUrls=[...ownedTextures.keys()];root.userData.textureEntries=[...ownedTextures.values()]
  root.userData.files=[...new Set(files)].map(f=>`tailored/${f}.glb`)
  root.userData.prints=selected.some(s=>s.g.pattern==='graphic')?['front',...(selected.some(s=>hasBackPhoto(s.g))?['back']:[])]:[]
  root.userData.chestPockets=0;root.traverse(o=>{if(o.userData.chestPocket)root.userData.chestPockets++})
  return root
}
