import type { Garment, Outfit, Selection } from '../types'
import { outfitAppearance } from './outfit-appearance'
import { outfitPhoto } from './outfit-photos'

export type PhotoAngle = 'front' | 'side' | 'back'
export interface StudioPhoto {
  src: string
  srcSet?: string
  width: number
  height: number
  angles: readonly PhotoAngle[]
  triptych: boolean
}

// Approval applies to this exact appearance, including the garment image
// revisions. Renaming, recolouring or uploading a piece invalidates the study.
const studyAppearance = 'v1-87fe36d3'

export function studioPhoto(selection: Selection, garments: Garment[], outfits: Outfit[]): StudioPhoto | undefined {
  const outfit = outfits.find(outfit => (['tops', 'layers', 'bottoms', 'shoes'] as const)
    .every(slot => outfit.items[slot] === selection[slot]))
  if (!outfit) return undefined
  if (Object.values(selection).some(id => !garments.some(g => g.id === id && g.ownership === 'confirmed'))) return undefined
  if (outfitAppearance(outfit, garments) === studyAppearance) return {
    src: '/previews/navy-after-hours-quality-v1.webp',
    width: 1536, height: 1024, angles: ['front', 'side', 'back'], triptych: true,
  }
  const photo = outfitPhoto(outfit, garments)
  return photo ? { ...photo, angles: ['front'], triptych: false } : undefined
}
