import type { Category, Garment, Occasion, Outfit, Season } from '../types'

/**
 * Filter the supplied source combinations. Season and occasion are editorial
 * tags; this deliberately makes no claims about live weather or physical fit.
 * No substitute or invented combinations are generated on an empty match.
 */
export function recommendOutfits(
  outfits: Outfit[], garments: Garment[], season: Season, occasion: Occasion,
): Outfit[] {
  const available = new Map(garments
    .filter(piece => piece.ownership === 'confirmed' && piece.seasons.includes(season))
    .map(piece => [piece.id, piece]))
  return outfits.filter(look =>
    look.seasons.includes(season)
    && look.occasions.includes(occasion)
    && Boolean(look.items.tops && look.items.bottoms && look.items.shoes)
    && new Set(Object.values(look.items)).size === Object.values(look.items).length
    && Object.entries(look.items).every(([slot,id]) => {
      const piece = available.get(id)
      return piece && (piece.category === slot || piece.wearableAs?.includes(slot as Category))
    }),
  )
}
