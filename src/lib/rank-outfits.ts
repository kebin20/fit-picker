import type { Outfit, Selection } from '../types'
import type { Wear } from './personal'

const slots = ['tops', 'layers', 'bottoms', 'shoes'] as const
const composition = (items: Selection) => JSON.stringify(slots.map(slot => items[slot] ?? null))

/** Count recent wears once, rather than scanning the whole history per comparison. */
export function rankOutfits(looks: Outfit[], pinned: readonly string[], history: readonly Wear[], now = Date.now()) {
  const cutoff = now - 14 * 86400000
  const counts = new Map<string, number>()
  for (const wear of history) {
    const date = Date.parse(wear.date)
    if (!Number.isFinite(date) || date <= cutoff) continue
    const key = composition(wear.items)
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  const favourites = new Set(pinned)
  return looks.map((look, index) => ({ look, index, pinned: Number(favourites.has(look.id)), wears: counts.get(composition(look.items)) || 0 }))
    .sort((a,b) => b.pinned - a.pinned || a.wears - b.wears || a.index - b.index)
    .map(entry => entry.look)
}
