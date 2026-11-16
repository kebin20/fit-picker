import type { Garment } from '../types'
import { useDeferredImage } from '../lib/use-deferred-image'
import { garmentPhoto } from '../lib/garment-photos'
import { useImageFailure } from '../lib/use-image-failure'

/** Source-inspired product photographs, shared by every wardrobe surface. */
export default function GarmentArt({ garment, className = '', side = 'front' }: { garment: Garment; className?: string; side?: 'front' | 'back' }) {
  const source = garmentPhoto(garment, side)
  const {failed,fail} = useImageFailure(source)
  const { ref, ready } = useDeferredImage(source)
  if (failed) return <span className={`garment-art garment-photo-unavailable ${className}`} role="img" aria-label={garment.name}>Photo unavailable</span>
  return <img
    key={source}
    className={`garment-art garment-photograph ${className}`}
    ref={ref}
    src={ready ? source : undefined}
    alt={`${garment.name}${side === 'back' ? ' (back)' : ''}`}
    loading="lazy"
    decoding="async"
    draggable={false}
    onError={fail}
  />
}
