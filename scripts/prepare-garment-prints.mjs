// Crop, remove low-alpha matte flecks, and compress the generated flat ink maps.
import sharp from 'sharp'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
const jobs=JSON.parse(await readFile('docs/artwork/garments/corrections/prints/prompts.json','utf8')).assets
await mkdir('public/prints',{recursive:true})
const records=[]
for(const {id} of jobs){
 const {data,info}=await sharp(`docs/artwork/garments/corrections/prints/${id}-master.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 for(let i=3;i<data.length;i+=4)if(data[i]<=24)data[i]=0
 const trimmed=await sharp(data,{raw:info}).trim({threshold:10}).png().toBuffer()
 const result=await sharp(trimmed).resize({width:512,height:512,fit:'inside',withoutEnlargement:true}).webp({quality:92,alphaQuality:100}).toFile(`public/prints/${id}-v2.webp`)
 records.push({id,width:result.width,height:result.height,bytes:result.size})
}
await writeFile('docs/artwork/garments/corrections/prints/sizes.json',JSON.stringify(records,null,2)+'\n')
console.log(records)
