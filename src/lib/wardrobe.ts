import type { Garment, Selection } from '../types'

/** Catalogue removals take precedence over older edits and imported backups. */
export function mergeWardrobe(base: Garment[], edits: Garment[]): Garment[] {
  const overrides = new Map(edits.map(piece => [piece.id, piece]))
  const baseIds = new Set(base.map(piece => piece.id))
  return [
    ...base.map(piece => piece.ownership === 'not-owned' ? piece : overrides.get(piece.id) || piece),
    ...edits.filter(piece => !baseIds.has(piece.id)),
  ]
}

/** Leave the remaining slots intact when an older outfit uses a removed item. */
export function ownedSelection(selection: Selection, garments: Garment[]): Selection {
  const owned = new Set(garments.filter(piece => piece.ownership === 'confirmed').map(piece => piece.id))
  return Object.fromEntries(Object.entries(selection).filter(([, id]) => owned.has(id)))
}
