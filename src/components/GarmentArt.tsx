import { useState } from 'react'
import type { Garment } from '../types'

/** Source-inspired product photographs, shared by every wardrobe surface. */
export default function GarmentArt({ garment, className = '' }: { garment: Garment; className?: string }) {
  const [failedId, setFailedId] = useState<string | null>(null)
  if (failedId === garment.id) return <span className={`garment-art garment-photo-unavailable ${className}`} role="img" aria-label={garment.name}>Photo unavailable</span>
  return <img
    className={`garment-art garment-photograph ${className}`}
    src={`/garments/${garment.id}.webp`}
    alt={garment.name}
    decoding="async"
    draggable={false}
    onError={() => setFailedId(garment.id)}
  />
}
