import manifest from '../data/outfit-photo-manifest.json'
import type { Outfit } from '../types'
import type { Garment } from '../types'
import { garments as baseGarments } from '../data/wardrobe'
import { outfitAppearance } from './outfit-appearance'

const photos: Record<string, { width: number; height: number; appearance?: string; revision?: string }> = manifest
const sharedPortraits = new Map([['aw-quick-4', 'styled-autumn-edit02-20']])

/** Only advertise photos that have been prepared and checked into the library. */
export function outfitPhoto(outfit: Outfit, garments: Garment[] = baseGarments) {
  const photoId = sharedPortraits.get(outfit.id) ?? outfit.id
  const dimensions = photos[photoId]
  if (!dimensions || !dimensions.appearance || dimensions.appearance !== outfitAppearance(outfit, garments)) return undefined
  if (Object.values(outfit.items).some(id => !garments.some(piece => piece.id === id && piece.ownership === 'confirmed'))) return undefined
  const filename = `${photoId}${dimensions.revision ? `-${dimensions.revision}` : ''}`
  return {
    ...dimensions,
    src: `/outfits/${filename}.webp`,
    srcSet: `/outfits/400/${filename}.webp 400w, /outfits/800/${filename}.webp 800w, /outfits/${filename}.webp 1024w`,
  }
}
