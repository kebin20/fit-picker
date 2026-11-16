import sharp from 'sharp'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {wardrobeData} from './lib/wardrobe-data.mjs'
const {garments,outfits,seasonalOutfits,outfitAppearance}=await wardrobeData()
const looks=new Map([...outfits,...seasonalOutfits].map(o=>[o.id,o]))
const brief=JSON.parse(await readFile('docs/artwork/outfits/wardrobe-refresh/prompts.json','utf8'))
const manifest=JSON.parse(await readFile('src/data/outfit-photo-manifest.json','utf8'))
// Initialize the audited legacy baseline once. Future runs preserve it so a
// changed wardrobe cannot silently mark an old photo as matching again.
for(const [id,photo] of Object.entries(manifest))photo.appearance ??= outfitAppearance(looks.get(id),garments)
const report=[]
for(const entry of brief.entries){
 const look=looks.get(entry.id)
 if(!look||JSON.stringify(look.items)!==JSON.stringify(entry.items))throw Error(`Combination changed: ${entry.id}`)
 const filename=`${entry.id}-${brief.revision}`
 const sizes=[]
 for(const [width,quality] of [[1024,86],[400,80],[800,84]]){
  const folder=width===1024?'public/outfits':`public/outfits/${width}`
  await mkdir(folder,{recursive:true})
  const result=await sharp(entry.original).rotate().resize({width,height:width*1.5,fit:'contain',background:'#f2efe8'}).webp({quality}).toFile(`${folder}/${filename}.webp`)
  sizes.push({width,height:result.height,bytes:result.size})
 }
 manifest[entry.id]={width:1024,height:1536,revision:brief.revision,appearance:outfitAppearance(look,garments)}
 report.push({id:entry.id,items:look.items,sizes})
}
await writeFile('src/data/outfit-photo-manifest.json',JSON.stringify(manifest,null,2)+'\n')
await writeFile('docs/artwork/outfits/wardrobe-refresh/sizes.json',JSON.stringify(report,null,2)+'\n')
console.log(`${report.length} refreshed portraits prepared with 400/800/1024px variants; appearance checks recorded for ${Object.keys(manifest).length} photos`)
