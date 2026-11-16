import { useState } from 'react'
import type { Outfit, Garment } from '../types'
import { garments as baseGarments } from '../data/wardrobe'
import OutfitCanvas from './OutfitCanvas'
import { outfitPhoto } from '../lib/outfit-photos'
import { outfitSummary } from '../lib/outfit-appearance'
import { useDeferredImage } from '../lib/use-deferred-image'

/** Every new combination can be previewed directly from its exact garment photos. */
export default function OutfitPreview({ outfit, garments = baseGarments }: { outfit: Outfit; garments?: Garment[] }) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const photo = outfitPhoto(outfit, garments)
  const summary = outfitSummary(outfit, garments)
  const { ref, ready } = useDeferredImage(photo?.src)
  if (photo && failedSource !== photo.src) return <img
    className="outfit-photograph"
    ref={ref}
    src={ready ? photo.src : undefined}
    srcSet={ready ? photo.srcSet : undefined}
    sizes="(max-width: 700px) calc(100vw - 38px), (max-width: 960px) calc((100vw - 150px) / 2), (max-width: 1190px) calc((100vw - 280px) / 3), (max-width: 1600px) calc((100vw - 350px) / 3), 430px"
    width={photo.width}
    height={photo.height}
    alt={`${outfit.name}: ${summary}. Generated styling illustration.`}
    loading="lazy"
    decoding="async"
    onError={() => setFailedSource(photo.src)}
  />
  return <div className="outfit-flat-preview outfit-flat-preview--composed" role="group" aria-label={`${outfit.name}: ${summary}`}>
    <OutfitCanvas selection={outfit.items} garments={garments} compact/>
  </div>
}
