import data from '../data/mannequin-renders.json'
import type { Category, Garment, Selection } from '../types'
import { garments as catalogue } from '../data/wardrobe'
import { garmentPhoto } from './garment-photos'

export type MannequinSide='front'|'back'
const base=new Map(catalogue.map(g=>[g.id,g]))
const renders=data.garments as Record<string,{front:string;back:string;frontSource?:string;color:string;style:string;pattern?:string;chestPocket?:boolean;asLayer?:{front:string;back:string}}>
export const formRenders=data.body
export function mannequinPhoto(garment:Garment,side:MannequinSide='front',slot?:Category) {
 const record=renders[garment.id],original=base.get(garment.id)
 if(!record||!original||garment.photo||record.frontSource!==garmentPhoto(garment)||garment.color!==record.color||garment.style!==record.style||garment.pattern!==record.pattern||Boolean(garment.chestPocket)!==Boolean(record.chestPocket))return undefined
 return slot==='layers'&&garment.category!=='layers'?record.asLayer?.[side]:record[side]
}
export function formRegions(selection:Selection,garments:Garment[]) {
 const top=garments.find(g=>g.id===selection.tops),layer=garments.find(g=>g.id===selection.layers),bottoms=garments.find(g=>g.id===selection.bottoms),visible=layer||top
 if(!visible||!bottoms)return ['full'] as const
 const short=visible.style==='tee'||['navy-shirt','teal-shirt','brown-shirt','white-shirt'].includes(visible.id)
 return ['head',short?'forearms':'hands',...(bottoms.style==='shorts'?['legs']:[]),...(!selection.shoes?['feet']:[])] as (keyof typeof formRenders)[]
}
export function mannequinOfflineUrls(selection:Selection,garments:Garment[]) {
 const selected=Object.entries(selection).flatMap(([slot,id])=>{const g=garments.find(g=>g.id===id);return g?[{g,slot:slot as Category}]:[]})
 if(selected.some(({g,slot})=>!mannequinPhoto(g,'front',slot)))return []
 const regions=formRegions(selection,garments)
 return [...new Set([...regions.flatMap(region=>[formRenders[region].front,formRenders[region].back]),...selected.flatMap(({g,slot})=>[mannequinPhoto(g,'front',slot)!,mannequinPhoto(g,'back',slot)!])])]
}
