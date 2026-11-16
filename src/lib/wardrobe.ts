import type { Garment, Selection } from '../types'

/** Catalogue removals take precedence over older edits and imported backups. */
export function mergeWardrobe(base: Garment[], edits: Garment[]): Garment[] {
  const overrides = new Map(edits.map(piece => [piece.id, piece]))
  const baseIds = new Set(base.map(piece => piece.id))
  return [
    ...base.map(piece => {
      if (piece.ownership === 'not-owned') return piece
      const edit = overrides.get(piece.id)
      // Inherit newly confirmed details without losing personal warmth/notes.
      // A prior edit's original cream default should follow its corrected colour.
      return { ...piece, ...edit, ...(piece.id === 'cream-tee' && edit?.color === '#e9e1ce' ? { color: piece.color } : {}) }
    }),
    ...edits.filter(piece => !baseIds.has(piece.id)),
  ]
}

/** Leave the remaining slots intact when an older outfit uses a removed item. */
export function ownedSelection(selection: Selection, garments: Garment[]): Selection {
  const chosen: Selection = {}
  const used = new Set<string>()
  for (const slot of ['tops','layers','bottoms','shoes'] as const) {
    const id = selection[slot]
    const piece = garments.find(garment => garment.id === id)
    if (!piece || piece.ownership !== 'confirmed' || used.has(piece.id)) continue
    if (piece.category !== slot && !piece.wearableAs?.includes(slot)) continue
    chosen[slot] = piece.id
    used.add(piece.id)
  }
  return chosen
}

export function sameSelection(a: Selection, b: Selection) {
  return (['tops','layers','bottoms','shoes'] as const).every(slot => a[slot] === b[slot])
}

/** Backups may retain known unowned items, but never impossible clothing slots. */
export function selectionFits(selection: Selection, garments: Garment[]) {
  const ids = Object.values(selection)
  return new Set(ids).size === ids.length && Object.entries(selection).every(([slot,id]) => {
    const piece = garments.find(garment => garment.id === id)
    return piece && (piece.category === slot || piece.wearableAs?.some(role => role === slot))
  })
}
