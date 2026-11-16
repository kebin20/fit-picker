import {performance} from 'node:perf_hooks'
import {writeFile} from 'node:fs/promises'
import {wardrobeData} from './lib/wardrobe-data.mjs'
const {garments,outfits,seasonalOutfits,rankOutfits}=await wardrobeData()
const owned=new Set(garments.filter(g=>g.ownership==='confirmed').map(g=>g.id))
const looks=[...seasonalOutfits,...outfits].filter(o=>Object.values(o.items).every(id=>owned.has(id)))
const now=Date.parse('2026-11-16T12:00:00Z')
const history=Array.from({length:2000},(_,i)=>({date:new Date(now-(i%14)*86400000).toISOString().slice(0,10),items:looks[(i*17)%looks.length].items}))
const cats=['tops','layers','bottoms','shoes'],pinned=[looks[100].id,looks[25].id]
const same=(items,look)=>cats.every(c=>items[c]===look.items[c])
const before=()=>[...looks].sort((a,b)=>Number(pinned.includes(b.id))-Number(pinned.includes(a.id))||history.filter(h=>Date.parse(h.date)>now-14*86400000&&same(h.items,a)).length-history.filter(h=>Date.parse(h.date)>now-14*86400000&&same(h.items,b)).length)
const elapsed=fn=>{const start=performance.now(),result=fn();return {ms:performance.now()-start,result}}
const old=elapsed(before),next=elapsed(()=>rankOutfits(looks,pinned,history,now))
if(JSON.stringify(old.result.map(o=>o.id))!==JSON.stringify(next.result.map(o=>o.id)))throw Error('Ranking changed')
const report={date:'2026-11-16',environment:'Node.js on development Mac; unthrottled, not an iPhone CPU measurement',outfits:looks.length,historyEntries:history.length,beforeMs:old.ms,afterMs:next.ms,orderingIdentical:true}
if(process.env.FIT_PICKER_RANKING_REPORT)await writeFile(process.env.FIT_PICKER_RANKING_REPORT,JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report,null,2))
