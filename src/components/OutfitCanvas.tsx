import { useEffect, useRef, useState } from 'react'
import type { Category, Garment, Selection } from '../types'
import './outfit-canvas.css'
import { garmentPhoto } from '../lib/garment-photos'
import { useImageFailure } from '../lib/use-image-failure'
import RenderedMannequin from './RenderedMannequin'
import { mannequinPhoto } from '../lib/mannequin-renders'

interface Props {
  selection: Selection
  garments: Garment[]
  compact?: boolean
  side?: 'front' | 'back'
}

const pieceLabels: Record<Category, string> = {
  tops: 'Top',
  layers: 'Outerwear',
  bottoms: 'Bottoms',
  shoes: 'Shoes',
}

function ProductPhoto({ garment, className = '', lazy = false, side = 'front' }: { garment: Garment; className?: string; lazy?: boolean; side?: 'front' | 'back' }) {
  const source = garmentPhoto(garment,side)
  const {failed,fail} = useImageFailure(source)
  return failed
    ? <span className={`outfit-canvas__photo-unavailable ${className}`}>{garment.name}<small>Photo unavailable</small></span>
    : <img
        key={source}
        className={`outfit-canvas__photo ${className}`}
        src={source}
        alt={`${garment.name}${side === 'back' ? ' (back)' : ''}`}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        draggable={false}
        onError={fail}
      />
}

/** The studio uses aligned renders of its fitted 3D display form.
 * Compact/custom fallbacks retain the product-photo composition. */
export default function OutfitCanvas({ selection, garments, compact = false, side = 'front' }: Props) {
  const arrangement = useRef<HTMLDivElement>(null)
  const assembly = useRef<HTMLDivElement>(null)
  const get = (category: Category) => garments.find(garment => garment.id === selection[category])
  const top = get('tops')
  const layer = get('layers')
  const bottoms = get('bottoms')
  const shoes = get('shoes')
  const [presentation, setPresentation] = useState<'mannequin' | 'pieces'>('mannequin')
  const [hiddenLayer, setHiddenLayer] = useState<string>()
  const [failedRender,setFailedRender] = useState('')
  const renderKey=JSON.stringify([selection,side,garments.filter(g=>Object.values(selection).includes(g.id)).map(g=>[g.color,Boolean(g.photo),g.style,g.pattern,g.chestPocket])])
  const supported=Object.entries(selection).every(([slot,id])=>{const g=garments.find(g=>g.id===id);return !!g&&!!mannequinPhoto(g,side,slot as Category)})
  useEffect(() => { setHiddenLayer(undefined) }, [layer?.id])
  useEffect(()=>{const retry=()=>setFailedRender('');window.addEventListener('online',retry);return()=>window.removeEventListener('online',retry)},[])
  const mannequin = !compact && presentation === 'mannequin' && supported && failedRender!==renderKey
  // Only the selected top has a supplied back photograph. Show it uncovered.
  const wornLayer = mannequin && layer?.id !== hiddenLayer ? layer : undefined
  const selected = (['tops', 'layers', 'bottoms', 'shoes'] as Category[])
    .map(category => ({ category, garment: get(category) }))
    .filter((piece): piece is { category: Category; garment: Garment } => Boolean(piece.garment))

  useEffect(() => {
    const container = arrangement.current
    const content = assembly.current
    if (!container || !content) return
    const resize = () => {
      const width = mannequin ? 360 : layer ? 344 : 210
      const height = mannequin ? 540 : bottoms?.style === 'shorts' ? 365 : 390
      const scale = Math.min(1, Math.max(.15, (container.clientWidth - 12) / width), Math.max(.15, (container.clientHeight - 12) / height))
      content.style.setProperty('--outfit-scale', String(scale))
      content.style.transform = `translate(-50%, -50%) scale(${scale})`
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    resize()
    return () => observer.disconnect()
  }, [Boolean(layer), bottoms?.style, compact, selected.length, mannequin])

  if (!selected.length) return <div className="outfit-canvas outfit-canvas--empty"><p>Your outfit starts with one piece.</p><span>Choose a top, bottoms and shoes to bring it together.</span></div>

  return <figure className={`outfit-canvas${compact ? ' outfit-canvas--compact' : ''}${layer ? ' outfit-canvas--layered' : ''}${bottoms?.style === 'shorts' ? ' outfit-canvas--shorts' : ''}${mannequin ? ' outfit-canvas--mannequin outfit-canvas--rendered' : ''}${wornLayer ? ' outfit-canvas--wearing-layer' : ''}`} data-top-style={top?.style} data-top-id={top?.id} aria-label={mannequin ? 'Your selected outfit on a 2D mannequin' : 'Your selected outfit in 2D'}>
    <div className="outfit-canvas__arrangement" ref={arrangement}>
      <div className="outfit-canvas__assembly" ref={assembly}>
        {mannequin ? <RenderedMannequin selection={selection} garments={garments} side={side} layerVisible={Boolean(wornLayer)} onUnavailable={()=>setFailedRender(renderKey)}/> : <><div className="outfit-canvas__base">
          {shoes && <ProductPhoto key={shoes.id} garment={shoes} lazy={compact} className="outfit-canvas__shoes"/>}
          {bottoms && <ProductPhoto key={bottoms.id} garment={bottoms} lazy={compact} className="outfit-canvas__bottoms"/>}
          {top && <ProductPhoto key={top.id} garment={top} side={side} lazy={compact} className="outfit-canvas__top"/>}
          {wornLayer && <div className={`outfit-canvas__worn-layer outfit-canvas__worn-layer--${wornLayer.style}`}><ProductPhoto garment={wornLayer}/></div>}
        </div>
        {layer && !mannequin && <div className="outfit-canvas__layer">
          <span className="outfit-canvas__layer-label">The finishing layer</span>
          <ProductPhoto key={layer.id} garment={layer} lazy={compact}/>
          <span className="outfit-canvas__layer-name">{layer.name}</span>
        </div>}</>}
      </div>
    </div>
    {!compact && <div className="outfit-canvas__view-tools" role="group" aria-label="2D presentation">
      <button aria-pressed={mannequin} disabled={!supported||failedRender===renderKey} onClick={() => setPresentation('mannequin')}>Mannequin</button>
      <button aria-pressed={!mannequin} onClick={() => setPresentation('pieces')}>Pieces</button>
      {mannequin && layer && <button className="outfit-canvas__layer-switch" onClick={() => setHiddenLayer(wornLayer ? layer.id : undefined)}>{wornLayer ? 'Show base outfit' : 'Show outerwear'}</button>}
      {mannequin && layer && !wornLayer && <span>Base outfit · outerwear hidden</span>}
      {!supported&&<span>Custom piece: view your photos here or use the 3D preview.</span>}
      {failedRender===renderKey&&<span>Mannequin image unavailable. Showing your garment photos.</span>}
    </div>}
    <figcaption className="outfit-canvas__caption">
      <span className="outfit-canvas__caption-title">Your combination</span>
      <ul aria-label="Selected clothes">
        {selected.map(({ category, garment }) => <li key={category}>
          <span className="outfit-canvas__swatch" style={{ backgroundColor: garment.color }} aria-hidden="true"/>
          <span><span className="outfit-canvas__piece-label">{pieceLabels[category]}<span aria-hidden="true"> · </span></span>{garment.name}</span>
        </li>)}
      </ul>
    </figcaption>
  </figure>
}
