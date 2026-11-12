import { describe, expect, it } from 'vitest'
import { garments, outfits } from '../data/wardrobe'
import { recommendOutfits } from './recommendations'

describe('recommendOutfits', () => {
  it('returns source combinations matching both selected season and occasion', () => {
    const result = recommendOutfits(outfits, garments, 'Summer', 'Dinner')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every(look => look.seasons.includes('Summer') && look.occasions.includes('Dinner'))).toBe(true)
    expect(result.some(look => look.id === 'ss-s2')).toBe(true)
    expect(result.some(look => look.id === 'ss-r1')).toBe(false)
    expect(result.some(look => look.source === 'aw-updated')).toBe(false)
  })

  it('excludes the core grey-sweatshirt suggestion until ownership is confirmed', () => {
    const suggestions = recommendOutfits(outfits, garments, 'Winter', 'Outdoors')
    expect(suggestions.some(look => look.id === 'aw-core-8')).toBe(false)
    const confirmed = garments.map(piece => piece.id === 'grey-sweatshirt' ? { ...piece, ownership: 'confirmed' as const } : piece)
    expect(recommendOutfits(outfits, confirmed, 'Winter', 'Outdoors').some(look => look.id === 'aw-core-8')).toBe(true)
  })

  it('removes looks whose shoe or layer no longer exists instead of inventing a replacement', () => {
    const withoutCoat = garments.filter(piece => piece.id !== 'beige-coat')
    expect(recommendOutfits(outfits, withoutCoat, 'Autumn', 'Dinner').some(look => look.id === 'aw-autumn-1')).toBe(false)
    expect(recommendOutfits(outfits, [], 'Summer', 'Dinner')).toEqual([])
  })

  it('does not equate an unverified piece with a confirmed owned piece', () => {
    const unknown = garments.map(piece => ({ ...piece, ownership: undefined }))
    expect(recommendOutfits(outfits, unknown, 'Summer', 'Everyday')).toEqual([])
  })

  it('does not recommend a piece outside its season even if an outfit is mistagged', () => {
    const coldLook = outfits.find(look => look.id === 'aw-winter-1')!
    const mistagged = { ...coldLook, seasons: ['Summer' as const] }
    expect(recommendOutfits([mistagged], garments, 'Summer', 'Everyday')).toEqual([])
  })

  it('uses layered winter combinations rather than unlayered core autumn looks', () => {
    const winterLooks = recommendOutfits(outfits, garments, 'Winter', 'Everyday')
    expect(winterLooks).toHaveLength(8)
    expect(winterLooks.every(look => look.source === 'aw-updated' && look.items.layers)).toBe(true)
    expect(winterLooks.some(look => look.id === 'aw-core-2')).toBe(false)
  })
})

describe('source catalogue integrity', () => {
  it('keeps all guide positions and unique stable ids', () => {
    expect(new Set(garments.map(piece => piece.id)).size).toBe(garments.length)
    expect(new Set(outfits.map(look => look.id)).size).toBe(outfits.length)
    for (const [source, count] of [['aw-core', 8], ['aw-updated', 16], ['ss', 30]] as const) {
      expect(outfits.filter(look => look.source === source).map(look => look.sourceIndex).sort((a, b) => a - b)).toEqual(Array.from({ length: count }, (_, i) => i))
    }
  })

  it('resolves every component to a piece that can be worn in that slot', () => {
    for (const look of outfits) {
      for (const [slot, id] of Object.entries(look.items)) {
        const piece = garments.find(item => item.id === id)
        expect(piece, `${look.id}: missing ${id}`).toBeDefined()
        expect(piece!.category === slot || piece!.wearableAs?.some(role => role === slot), `${look.id}: ${id} cannot occupy ${slot}`).toBe(true)
      }
    }
  })

  it('confirms the updated navy sweatshirt without assuming grey and olive were purchased', () => {
    expect(garments.find(piece => piece.id === 'navy-sweatshirt')?.ownership).toBe('confirmed')
    expect(garments.filter(piece => piece.ownership === 'recommended').map(piece => piece.id).sort()).toEqual(['grey-sweatshirt', 'olive-sweatshirt'])
  })
})
