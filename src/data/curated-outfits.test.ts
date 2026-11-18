import { describe, expect, it } from 'vitest'
import { outfitPhoto } from '../lib/outfit-photos'
import { recommendOutfits } from '../lib/recommendations'
import { curatedOutfitIds } from './curated-outfits'
import { seasonalOutfits } from './seasonal-outfits'
import { garments, outfits } from './wardrobe'

const library = new Map([...seasonalOutfits, ...outfits].map(look => [look.id, look]))
const wardrobe = new Map(garments.map(piece => [piece.id, piece]))
const curated = curatedOutfitIds.map(id => {
  const look = library.get(id)
  if (!look) throw new Error(`Missing outfit in recommendation edit: ${id}`)
  return look
})

describe('curated outfit edit', () => {
  it('keeps distinct, owned outfit formulas with their matching portraits', () => {
    const formulas = curated.map(({ items }) => [items.tops, items.layers, items.bottoms].join('|'))
    expect(new Set(formulas).size).toBe(curated.length)
    for (const look of curated) {
      for (const id of Object.values(look.items)) {
        expect(wardrobe.get(id)?.ownership, look.id).toBe('confirmed')
        expect(wardrobe.get(id)?.seasons, look.id).toEqual(expect.arrayContaining(look.seasons))
      }
      expect(outfitPhoto(look), look.id).toBeDefined()
    }
  })

  it('keeps several choices for every season and occasion', () => {
    for (const season of ['Autumn', 'Winter', 'Spring', 'Summer'] as const) {
      for (const occasion of ['Everyday', 'Dinner', 'Date night', 'With friends', 'Outdoors'] as const) {
        expect(recommendOutfits(curated, garments, season, occasion).length, `${season} / ${occasion}`).toBeGreaterThanOrEqual(2)
      }
    }
  })
})
