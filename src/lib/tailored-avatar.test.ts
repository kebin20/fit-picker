import {describe,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import models from '../../public/models/tailored/manifest.json'
import renders from '../data/mannequin-renders.json'
import {garments} from '../data/wardrobe'
import {mannequinPhoto,mannequinOfflineUrls} from './mannequin-renders'
import {bodyCovered,tailoredFamily} from './tailored-avatar'
const read=(file:string)=>readFileSync(new URL(`../../${file}`,import.meta.url))
const hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex')
const garment=(id:string)=>garments.find(g=>g.id===id)!

describe('replacement fitted mannequin',()=>{
 it('ships a different body and every fitted construction within mobile budgets',()=>{
  expect(models.assets).toHaveLength(20)
  for(const asset of models.assets){
   const bytes=read(`public/models/${asset.file}`)
   expect(bytes.length,asset.family).toBe(asset.bytes)
   expect(hash(bytes),asset.family).toBe(asset.sha256)
   const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString())
   expect(doc.animations||[]).toHaveLength(0);expect(doc.skins||[]).toHaveLength(0)
   expect(bytes.length).toBeLessThan(400000)
   expect(asset.triangles).toBeLessThan(asset.family==='body'?40000:12000)
  }
  expect(hash(read('public/models/tailored/body.glb'))).not.toBe(hash(read('public/models/base_body.glb')))
  expect(models.assets.find(a=>a.family==='coat')!.bounds.min[1]).toBeLessThan(.65)
  expect(models.assets.find(a=>a.family==='bomber')!.bounds.min[1]).toBeGreaterThan(.80)
 })
 it('matches 2D geometry and rendering provenance to the current 3D library',()=>{
  expect(renders.geometrySha256).toBe(hash(read('public/models/tailored/manifest.json')).slice(0,12))
  expect(renders.rendererSha256).toBe(hash(Buffer.concat([read('src/lib/tailored-avatar.ts'),read('scripts/tailored-avatar/render.ts')])).slice(0,12))
 })
 it('covers every owned item and open-shirt role with real front/back renders',()=>{
  for(const g of garments.filter(g=>g.ownership==='confirmed')){
   const record=renders.garments[g.id as keyof typeof renders.garments]
   expect(record,g.id).toBeDefined()
   for(const side of ['front','back'] as const){
    const path=mannequinPhoto(g,side)!
    expect(path,g.id).toMatch(/^\/mannequin\/v2\/.+-[a-f0-9]{12}\.webp$/)
    const bytes=read(`public${path}`);expect(bytes.length).toBeGreaterThan(400)
    if(g.wearableAs?.includes('layers'))expect(mannequinPhoto(g,side,'layers')).not.toBe(path)
   }
   for(const source of record.sourceFiles)expect(hash(read(`public${source.file}`)).slice(0,12)).toBe(source.sha256)
  }
  expect(tailoredFamily(garment('beige-coat'),'layers')).toBe('coat')
 })
 it('preserves the head/hands and bare shins while hiding clothed body surfaces',()=>{
  const selection={tops:'navy-shirt',layers:'brown-overshirt',bottoms:'grey-slacks',shoes:'adidas-black'}
  expect(bodyCovered(0,1.7,.1,selection,garments)).toBe(false)
  expect(bodyCovered(.29,.80,.1,selection,garments)).toBe(false)
  expect(bodyCovered(0,1.3,.15,selection,garments)).toBe(true)
  expect(bodyCovered(.10,.3,.1,selection,garments)).toBe(true)
  expect(bodyCovered(.10,.3,.1,{...selection,layers:undefined,bottoms:'beige-shorts'},garments)).toBe(false)
 })
 it('invalidates rendered appearances after a personal colour/photo change',()=>{
  const g=garment('navy-shirt')
  expect(mannequinPhoto({...g,color:'#ff0000'})).toBeUndefined()
  expect(mannequinPhoto({...g,photo:'data:image/webp;base64,AA=='})).toBeUndefined()
  const urls=mannequinOfflineUrls({tops:'navy-shirt',layers:'brown-flannel',bottoms:'beige-shorts',shoes:'adidas-black'},garments)
  expect(urls.length).toBeLessThanOrEqual(24)
  expect(urls.some(u=>u.includes('brown-flannel-layer-front-'))).toBe(true)
  expect(urls.some(u=>u.includes('form-legs-back-'))).toBe(true)
 })
})
