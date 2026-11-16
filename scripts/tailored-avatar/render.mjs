import {chromium} from '@playwright/test'
import {mkdir,writeFile,readdir,unlink,readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
const root='public/mannequin/v2'
await mkdir(root,{recursive:true})
for(const file of await readdir(root))if(file.endsWith('.webp'))await unlink(`${root}/${file}`)
const hash=bytes=>createHash('sha256').update(bytes).digest('hex').slice(0,12)
async function save(png,name){const bytes=await sharp(Buffer.from(png,'base64')).webp({quality:85,alphaQuality:100}).toBuffer();const file=`${name}-${hash(bytes)}.webp`;await writeFile(`${root}/${file}`,bytes);return `/mannequin/v2/${file}`}
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']})
try{
 const p=await browser.newPage()
 await p.route('**/__render_form__',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Offline mannequin renders</title>'}))
 await p.goto(new URL('__render_form__',process.env.FIT_PICKER_URL||'http://127.0.0.1:5201/').href)
 const list=await p.evaluate(async()=> (await import('/scripts/tailored-avatar/render.ts')).renderList())
 const models=await readFile('public/models/tailored/manifest.json')
 const rendererSources=Buffer.concat(await Promise.all(['src/lib/tailored-avatar.ts','scripts/tailored-avatar/render.ts'].map(file=>readFile(file))))
 const manifest={revision:2,width:600,height:900,geometrySha256:hash(models),rendererSha256:hash(rendererSources),garments:{},body:{}}
 for(const bodyRegion of ['full','head','hands','forearms','legs','feet']){
  manifest.body[bodyRegion]={}
  for(const side of ['front','back']){
   const png=await p.evaluate(async({side,bodyRegion})=>(await import('/scripts/tailored-avatar/render.ts')).renderPart('',side,bodyRegion==='full'?undefined:bodyRegion),{side,bodyRegion})
   manifest.body[bodyRegion][side]=await save(png,`form-${bodyRegion}-${side}`)
  }
 }
 for(const garment of list){
  const record={...garment}
  record.sourceFiles=await Promise.all([...new Set([garment.frontSource,garment.backSource].filter(Boolean))].map(async file=>({file,sha256:hash(await readFile(`public${file}`))})))
  for(const side of ['front','back']){
   const png=await p.evaluate(async({id,side})=>(await import('/scripts/tailored-avatar/render.ts')).renderPart(id,side),{id:garment.id,side})
   record[side]=await save(png,`${garment.id}-${side}`)
  }
  if(garment.category!=='layers'&&garment.wearableAs?.includes('layers')){
   record.asLayer={}
   for(const side of ['front','back']){
    const png=await p.evaluate(async({id,side})=>(await import('/scripts/tailored-avatar/render.ts')).renderPart(id,side,undefined,true),{id:garment.id,side})
    record.asLayer[side]=await save(png,`${garment.id}-layer-${side}`)
   }
  }
  manifest.garments[garment.id]=record;console.log('Rendered',garment.id)
 }
 await writeFile('src/data/mannequin-renders.json',JSON.stringify(manifest,null,2)+'\n')
 console.log('Prepared',list.length,'garments and body regions, front and back.')
}finally{await browser.close()}
