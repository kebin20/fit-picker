import type { Garment, Occasion, Outfit, Season } from '../types'

/**
 * Filter the supplied source combinations. Season and occasion are editorial
 * tags; this deliberately makes no claims about live weather or physical fit.
 * No substitute or invented combinations are generated on an empty match.
 */
export function recommendOutfits(
  outfits: Outfit[], garments: Garment[], season: Season, occasion: Occasion,
): Outfit[] {
  const available = new Set(garments
    .filter(piece => piece.ownership === 'confirmed' && piece.seasons.includes(season))
    .map(piece => piece.id))
  return outfits.filter(look =>
    look.seasons.includes(season)
    && look.occasions.includes(occasion)
    && Object.values(look.items).every(id => available.has(id)),
  )
}
