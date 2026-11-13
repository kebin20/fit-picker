import { useState } from 'react'
import type { Outfit } from '../types'
import { garments } from '../data/wardrobe'
import OutfitCanvas from './OutfitCanvas'

/** Every new combination can be previewed directly from its exact garment photos. */
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
  return <div className="outfit-flat-preview outfit-flat-preview--composed" role="group" aria-label={`${outfit.name}: ${outfit.subtitle}`}>
    <OutfitCanvas selection={outfit.items} garments={garments} compact/>
  </div>
}
