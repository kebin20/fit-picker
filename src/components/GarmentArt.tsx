import { useState } from 'react'
import type { Garment } from '../types'
import { useDeferredImage } from '../lib/use-deferred-image'

/** Source-inspired product photographs, shared by every wardrobe surface. */
export default function GarmentArt({ garment, className = '' }: { garment: Garment; className?: string }) {
  const [failedId, setFailedId] = useState<string | null>(null)
  const source = garment.photo || `/garments/${garment.id}.webp`
  const { ref, ready } = useDeferredImage(source)
  if (failedId === source) return <span className={`garment-art garment-photo-unavailable ${className}`} role="img" aria-label={garment.name}>Photo unavailable</span>
  return <img
    className={`garment-art garment-photograph ${className}`}
    ref={ref}
    src={ready ? source : undefined}
    alt={garment.name}
    loading="lazy"
    decoding="async"
    draggable={false}
    onError={() => setFailedId(source)}
  />
}
