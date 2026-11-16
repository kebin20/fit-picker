import type { Garment, Outfit } from '../types'
import { garmentPhoto } from './garment-photos'

const slots = ['tops', 'layers', 'bottoms', 'shoes'] as const

/** A small cache fingerprint of the actual pictured pieces, not styling tags. */
export function outfitAppearance(outfit: Outfit, garments: Garment[]) {
  const pieces = []
  for (const slot of slots) {
    const id = outfit.items[slot]
    if (!id) { pieces.push([slot, null]); continue }
    const garment = garments.find(piece => piece.id === id)
    // A personal upload is shown through the garment composition, never through
    // an older stock portrait. Do not hash or store its embedded image data.
    if (!garment || garment.photo) return undefined
    pieces.push([slot, id, garment.name, garment.style, garment.color,
      garment.pattern || '', Boolean(garment.chestPocket), garmentPhoto(garment)])
  }
  const source = JSON.stringify(pieces)
  let hash = 2166136261
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619)
  return `v1-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

/** Resolve live catalogue names so saved/curated combinations stay in sync. */
export function outfitSummary(outfit: Outfit, garments: Garment[]) {
  return slots.flatMap(slot => {
    const garment = garments.find(piece => piece.id === outfit.items[slot])
    return garment ? [garment.name] : []
  }).join(' + ')
}
