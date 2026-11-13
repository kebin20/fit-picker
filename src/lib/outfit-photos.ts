import manifest from '../data/outfit-photo-manifest.json'
import type { Outfit } from '../types'

const photos: Record<string, { width: number; height: number }> = manifest

/** Only advertise photos that have been prepared and checked into the library. */
export function outfitPhoto(outfit: Outfit) {
  const dimensions = photos[outfit.id]
  if (!dimensions) return undefined
  return {
    ...dimensions,
    src: `/outfits/${outfit.id}.webp`,
    srcSet: `/outfits/400/${outfit.id}.webp 400w, /outfits/800/${outfit.id}.webp 800w, /outfits/${outfit.id}.webp 1024w`,
  }
}
