import { useState } from 'react'
import type { Outfit } from '../types'
import { garments } from '../data/wardrobe'
import GarmentArt from './GarmentArt'

const byId = new Map(garments.map(g => [g.id, g]))

/** New edits use individual full-size assets; guide looks stay sharp as vectors. */
export default function OutfitPreview({ outfit }: { outfit: Outfit }) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  if (outfit.image && failedSource !== outfit.image) return <img
    className="outfit-photograph"
    src={outfit.image}
    alt={`${outfit.name}: ${outfit.subtitle}. Generated styling illustration.`}
    loading="lazy"
    decoding="async"
    onError={() => setFailedSource(outfit.image!)}
  />
  return <div className="outfit-flat-preview" role="img" aria-label={`${outfit.name}: ${outfit.subtitle}`}>
    {Object.entries(outfit.items).map(([slot, id]) => {
      const garment = byId.get(id)
      return garment ? <div key={slot} className={`preview-garment preview-${slot}`}><GarmentArt garment={garment}/></div> : null
    })}
    {outfit.image && <small className="preview-fallback-label">Outfit overview</small>}
  </div>
}
