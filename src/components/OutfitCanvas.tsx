import { useEffect, useRef, useState } from 'react'
import type { Category, Garment, Selection } from '../types'
import './outfit-canvas.css'

interface Props {
  selection: Selection
  garments: Garment[]
  compact?: boolean
}

const pieceLabels: Record<Category, string> = {
  tops: 'Top',
  layers: 'Outerwear',
  bottoms: 'Bottoms',
  shoes: 'Shoes',
}

function ProductPhoto({ garment, className = '', lazy = false }: { garment: Garment; className?: string; lazy?: boolean }) {
  const [unavailable, setUnavailable] = useState(false)
  useEffect(() => setUnavailable(false), [garment.photo, garment.id])
  return unavailable
    ? <span className={`outfit-canvas__photo-unavailable ${className}`}>{garment.name}<small>Photo unavailable</small></span>
    : <img
        className={`outfit-canvas__photo ${className}`}
        src={garment.photo || `/garments/${garment.id}.webp`}
        alt={garment.name}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        draggable={false}
        onError={() => setUnavailable(true)}
      />
}

/** A composed clothing-only outfit, using the same photographic product assets
 * as the wardrobe. The optional outer layer sits beside the base outfit so a
 * closed jacket never conceals the selected shirt. */
export default function OutfitCanvas({ selection, garments, compact = false }: Props) {
  const arrangement = useRef<HTMLDivElement>(null)
  const assembly = useRef<HTMLDivElement>(null)
  const get = (category: Category) => garments.find(garment => garment.id === selection[category])
  const top = get('tops')
  const layer = get('layers')
  const bottoms = get('bottoms')
  const shoes = get('shoes')
  const selected = (['tops', 'layers', 'bottoms', 'shoes'] as Category[])
    .map(category => ({ category, garment: get(category) }))
    .filter((piece): piece is { category: Category; garment: Garment } => Boolean(piece.garment))

  useEffect(() => {
    const container = arrangement.current
    const content = assembly.current
    if (!container || !content) return
    const resize = () => {
      const width = layer ? 344 : 210
      const height = bottoms?.style === 'shorts' ? 365 : 390
      const scale = Math.min(1, Math.max(.15, (container.clientWidth - 12) / width), Math.max(.15, (container.clientHeight - 12) / height))
      content.style.setProperty('--outfit-scale', String(scale))
      content.style.transform = `translate(-50%, -50%) scale(${scale})`
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    resize()
    return () => observer.disconnect()
  }, [Boolean(layer), bottoms?.style, compact, selected.length])

  if (!selected.length) return <div className="outfit-canvas outfit-canvas--empty"><p>Your outfit starts with one piece.</p><span>Choose a top, bottoms and shoes to bring it together.</span></div>

  return <figure className={`outfit-canvas${compact ? ' outfit-canvas--compact' : ''}${layer ? ' outfit-canvas--layered' : ''}${bottoms?.style === 'shorts' ? ' outfit-canvas--shorts' : ''}`} aria-label="Your selected outfit in 2D">
    <div className="outfit-canvas__arrangement" ref={arrangement}>
      <div className="outfit-canvas__assembly" ref={assembly}>
        <div className="outfit-canvas__base">
          {shoes && <ProductPhoto key={shoes.id} garment={shoes} lazy={compact} className="outfit-canvas__shoes"/>}
          {bottoms && <ProductPhoto key={bottoms.id} garment={bottoms} lazy={compact} className="outfit-canvas__bottoms"/>}
          {top && <ProductPhoto key={top.id} garment={top} lazy={compact} className="outfit-canvas__top"/>}
        </div>
        {layer && <div className="outfit-canvas__layer">
          <span className="outfit-canvas__layer-label">The finishing layer</span>
          <ProductPhoto key={layer.id} garment={layer} lazy={compact}/>
          <span className="outfit-canvas__layer-name">{layer.name}</span>
        </div>}
      </div>
    </div>
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
