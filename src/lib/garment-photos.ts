import type { Garment } from '../types'

// Versioned filenames also replace older copies in offline wardrobes.
const revised = new Set(['pink-tee', 'black-cat-tee', 'white-graphic-tee', 'ukiyoe-tee', 'burton-tee', 'black-tee'])
const twoSided = new Set(['white-graphic-tee', 'ukiyoe-tee'])

export function garmentPhoto(garment: Garment, side: 'front' | 'back' = 'front') {
  if (side === 'front' && garment.photo) return garment.photo
  if (side === 'back' && twoSided.has(garment.id)) return `/garments/${garment.id}-back-v2.webp`
  return `/garments/${garment.id}${revised.has(garment.id) ? '-v2' : ''}.webp`
}

export function hasBackPhoto(garment: Garment) { return twoSided.has(garment.id) }
