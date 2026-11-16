// Prepare generated cutout masters without changing the garment artwork.
import sharp from 'sharp'
import { readFile, writeFile } from 'node:fs/promises'
const ids = ['pink-tee','black-cat-tee','white-graphic-tee','white-graphic-tee-back','ukiyoe-tee','ukiyoe-tee-back','burton-tee','black-tee','cream-tee']
const sizes = JSON.parse(await readFile('docs/artwork/garments/image-sizes.json','utf8'))
for (const id of ids) {
  const {data,info} = await sharp(`docs/artwork/garments/corrections/${id}-master.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  // Keep the connected garment silhouette, removing almost transparent matte
  // pixels and disconnected flecks left outside generated product cutouts.
  const visited=new Uint8Array(info.width*info.height), components=[]
  for(let start=0;start<visited.length;start++) {
    if(visited[start]||data[start*4+3]<=24) continue
    const queue=[start];visited[start]=1
    for(let n=0;n<queue.length;n++) {
      const at=queue[n],x=at%info.width,y=Math.floor(at/info.width)
      for(const next of [x?at-1:-1,x<info.width-1?at+1:-1,y?at-info.width:-1,y<info.height-1?at+info.width:-1]) {
        if(next>=0&&!visited[next]&&data[next*4+3]>24){visited[next]=1;queue.push(next)}
      }
    }
    components.push(queue)
  }
  components.sort((a,b)=>b.length-a.length)
  if(!components[0]||components[0].length<info.width*info.height*.1)throw Error(`Missing garment: ${id}`)
  const kept=new Uint8Array(visited.length)
  for(const at of components[0])kept[at]=1
  for(let at=0;at<kept.length;at++)if(!kept[at])data[at*4+3]=0
  const output=`public/garments/${id}-v2.webp`
  const padded=await sharp(data,{raw:info}).trim({threshold:10}).extend({top:20,bottom:20,left:20,right:20,background:'#00000000'}).png().toBuffer()
  const prepared=await sharp(padded).resize({width:640,height:640,fit:'inside',withoutEnlargement:true}).webp({quality:90,alphaQuality:100}).toFile(output)
  const entry={id,width:prepared.width,height:prepared.height,atlas:'correction-v2',file:`/garments/${id}-v2.webp`}
  const index=sizes.findIndex(item=>item.id===id)
  if(index<0)sizes.push(entry);else sizes[index]=entry
  console.log(`${output}: ${prepared.width}×${prepared.height}, ${prepared.size} bytes`)
}
await writeFile('docs/artwork/garments/image-sizes.json',JSON.stringify(sizes,null,2)+'\n')
