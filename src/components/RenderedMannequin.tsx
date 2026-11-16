import type { Garment, Selection } from '../types'
import { formRenders,formRegions,mannequinPhoto,type MannequinSide } from '../lib/mannequin-renders'

export default function RenderedMannequin({selection,garments,side,layerVisible,onUnavailable}:{selection:Selection;garments:Garment[];side:MannequinSide;layerVisible:boolean;onUnavailable:()=>void}) {
 const visible={...selection};if(!layerVisible)delete visible.layers
 const regions=formRegions(visible,garments)
 return <div className="rendered-mannequin" data-model-revision="studio-v2">
  <div className="rendered-mannequin__shadow"/>
  {regions.map(region=><img key={region} className={`outfit-mannequin rendered-mannequin__body rendered-mannequin__body--${region}`} src={formRenders[region][side]} alt="" aria-hidden="true" draggable={false} onError={onUnavailable}/>)}
  {(['bottoms','tops','layers','shoes'] as const).map(slot=>{
   const g=garments.find(g=>g.id===visible[slot]);const src=g&&mannequinPhoto(g,side,slot)
   return src&&g?<img key={`${slot}-${src}`} className={`rendered-mannequin__piece outfit-canvas__${slot==='layers'?'worn-layer outfit-canvas__worn-layer--'+g.style:slot==='tops'?'top':slot}`} src={src} alt={`${g.name} (${side}, fitted mannequin view)`} draggable={false} onError={onUnavailable}/>:null
  })}
 </div>
}
