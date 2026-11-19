import { describe, expect, it } from 'vitest'
import { garments, outfits } from '../data/wardrobe'
import { seasonalOutfits } from '../data/seasonal-outfits'
import { recommendOutfits } from './recommendations'
import { mergeWardrobe, ownedSelection } from './wardrobe'
import { garmentPhoto, hasBackPhoto } from './garment-photos'

describe('user wardrobe corrections', () => {
  it('keeps removed items out even when an old edit or backup claims ownership', () => {
    const removed = ['black-rain-jacket', 'brown-tee', 'cream-graphic-tee', 'navy-overshirt', 'navy-tee', 'white-longsleeve', 'white-shirt', 'yellow-tee']
    const oldEdits = garments.filter(g => removed.includes(g.id)).map(g => ({ ...g, ownership: 'confirmed' as const }))
    const merged = mergeWardrobe(garments, oldEdits)
    expect(merged.filter(g => g.ownership === 'not-owned').map(g => g.id).sort()).toEqual(removed)
    for (const season of ['Autumn','Winter','Spring','Summer'] as const) {
      for (const occasion of ['Everyday','Dinner','Date night','With friends','Outdoors'] as const) {
        const looks = recommendOutfits([...outfits,...seasonalOutfits], merged, season, occasion)
        expect(looks.length, `${season}/${occasion}`).toBeGreaterThan(0)
        expect(looks.some(look => Object.values(look.items).some(id => removed.includes(id)))).toBe(false)
      }
    }
  })

  it('removes just the unowned slot from an old look, preserving the remaining clothes', () => {
    expect(ownedSelection({ tops: 'white-shirt', bottoms: 'grey-slacks', shoes: 'adidas-black' }, garments))
      .toEqual({ bottoms: 'grey-slacks', shoes: 'adidas-black' })
    expect(ownedSelection({ tops: 'brown-tee', bottoms: 'grey-slacks', shoes: 'adidas-striped' }, garments))
      .toEqual({ bottoms: 'grey-slacks', shoes: 'adidas-striped' })
    expect(ownedSelection({ tops: 'cream-graphic-tee', layers: 'white-shirt', bottoms: 'olive-wide' }, garments))
      .toEqual({ bottoms: 'olive-wide' })
  })

  it('uses corrected front and back photos consistently while preserving uploaded front photos', () => {
    const white = garments.find(g => g.id === 'white-graphic-tee')!
    expect(garmentPhoto(white)).toBe('/garments/white-graphic-tee-v2.webp')
    expect(garmentPhoto(white,'back')).toBe('/garments/white-graphic-tee-back-v2.webp')
    expect(garmentPhoto({...white,photo:'data:image/webp;base64,abc'})).toContain('data:image/')
    expect(hasBackPhoto(white)).toBe(true)
    expect(hasBackPhoto(garments.find(g => g.id === 'ukiyoe-tee')!)).toBe(true)
    expect(hasBackPhoto(garments.find(g => g.id === 'navy-shirt')!)).toBe(false)
  })

  it('inherits the confirmed cream pocket and colour while retaining earlier personal edits', () => {
    const cream = garments.find(g => g.id === 'cream-tee')!
    const {chestPocket: _oldDetail, ...old} = cream
    const updated = mergeWardrobe(garments,[{...old,color:'#e9e1ce',warmth:'medium'}]).find(g=>g.id===cream.id)!
    expect(updated.chestPocket).toBe(true)
    expect(updated.color).toBe('#d1c2a3')
    expect(updated.warmth).toBe('medium')
    expect(garmentPhoto(updated)).toBe('/garments/cream-tee-v2.webp')
  })
})
