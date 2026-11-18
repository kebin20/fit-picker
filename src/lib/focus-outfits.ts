import type { Category, Garment, Outfit } from '../types'

const slots = ['tops', 'layers', 'bottoms', 'shoes'] as const

function canFill(garment: Garment, slot: Category) {
  return garment.category === slot || Boolean(garment.wearableAs?.includes(slot))
}

/** A shirt that can also be outerwear may pair with another top. */
export function canWearTogether(first: Garment, second: Garment) {
  return first.id !== second.id && slots.some(slot =>
    canFill(first, slot) && slots.some(other => other !== slot && canFill(second, other)),
  )
}

function trouserCut(garment: Garment) {
  if (/\b(barrel|wide|relaxed)\b/i.test(garment.name)) return 'wide'
  if (/\b(slim|skinny|ankle|tapered|slacks)\b/i.test(garment.name)) return 'tapered'
  return 'straight'
}

function warmth(garment: Garment) {
  if (garment.warmth) return garment.warmth
  if (garment.style === 'puffer' || garment.style === 'coat') return 'warm'
  if (garment.category === 'layers' || ['sweatshirt', 'hoodie', 'longsleeve'].includes(garment.style)) return 'medium'
  return 'light'
}

function colourDistance(first: string, second: string) {
  const a = Number.parseInt(first.slice(1), 16)
  const b = Number.parseInt(second.slice(1), 16)
  return Math.hypot(...[16, 8, 0].map(shift => (a >> shift & 255) - (b >> shift & 255)))
}

function substitutionDistance(original: Garment, chosen: Garment, slot: Category) {
  if (chosen.ownership !== 'confirmed' || !canFill(chosen, slot) || chosen.style !== original.style) return Infinity
  if (warmth(chosen) !== warmth(original)) return Infinity
  if (chosen.style === 'trousers' && trouserCut(chosen) !== trouserCut(original)) return Infinity
  if (original.waterproof && !chosen.waterproof) return Infinity
  // A graphic or check is a deliberate part of a recipe. Sneaker stripes are
  // small trim and can be kept or dropped when the shoe's main colour matches.
  const statement = (piece: Garment) => piece.pattern && (slot !== 'shoes' || piece.pattern !== 'stripes')
  if (statement(original) || statement(chosen)) return Infinity
  const distance = colourDistance(original.color, chosen.color)
  return distance <= 64 ? distance : Infinity
}

function composition(items: Outfit['items']) {
  return slots.map(slot => items[slot] ?? '').join('|')
}

function variationId(key: string) {
  // The ID follows the outfit across occasions and remains short enough for
  // saved suggestion preferences even when all four garments are custom.
  let hash = 2166136261
  for (let index = 0; index < key.length; index++) hash = Math.imul(hash ^ key.charCodeAt(index), 16777619)
  return `focus-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

/**
 * Adapt a curated look only where necessary to include the requested pieces.
 * The caller chooses context-appropriate recipes and limits the suggestions.
 */
export function adaptFocusOutfits(recipes: Outfit[], garments: Garment[], focus: readonly string[]): Outfit[] {
  if (!focus.length || focus.length > 2 || new Set(focus).size !== focus.length) return []
  const byId = new Map(garments.map(piece => [piece.id, piece]))
  const anchors = focus.flatMap(id => {
    const garment = byId.get(id)
    return garment?.ownership === 'confirmed' ? [garment] : []
  })
  if (anchors.length !== focus.length) return []
  if (anchors.length === 2 && !canWearTogether(anchors[0], anchors[1])) return []

  const existing = new Set(recipes.map(recipe => composition(recipe.items)))
  const variations = new Map<string, { look: Outfit; changed: number; distance: number }>()
  for (const recipe of recipes) {
    const missing = anchors.filter(piece => !Object.values(recipe.items).includes(piece.id))
    if (!missing.length) continue
    let variants = [{ items: recipe.items, distance: 0 }]
    for (const piece of missing) {
      variants = variants.flatMap(variant => slots.flatMap(slot => {
        const currentId = variant.items[slot]
        if (!currentId || focus.includes(currentId)) return []
        const original = byId.get(currentId)
        const distance = original ? substitutionDistance(original, piece, slot) : Infinity
        if (!Number.isFinite(distance)) return []
        return [{ items: { ...variant.items, [slot]: piece.id }, distance: variant.distance + distance }]
      }))
    }
    for (const { items, distance } of variants) {
      const key = composition(items)
      if (existing.has(key)) continue
      const previous = variations.get(key)
      if (previous && (previous.changed < missing.length || (previous.changed === missing.length && previous.distance <= distance))) continue
      const supporting = slots.flatMap(slot => {
        const id = items[slot]
        const garment = id && !focus.includes(id) ? byId.get(id) : undefined
        return garment ? [garment.name] : []
      })
      const name = `With ${supporting.slice(0, 2).join(' & ')}`
      variations.set(key, {
        changed: missing.length,
        distance,
        look: {
          ...recipe,
          items,
          id: variationId(key),
          name,
          origin: 'styled',
          sourceLabel: 'Built around your pieces',
          subtitle: '',
          sourceIndex: -1,
          image: undefined,
          note: undefined,
        },
      })
    }
  }
  return [...variations.values()]
    .sort((a, b) => a.changed - b.changed || a.distance - b.distance)
    .map(({ look }) => look)
}
