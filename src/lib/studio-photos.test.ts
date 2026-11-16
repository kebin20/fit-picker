import { describe, expect, it } from 'vitest'
import { studioPhoto } from './studio-photos'
import { garments, outfits } from '../data/wardrobe'
import { seasonalOutfits } from '../data/seasonal-outfits'

const looks = [...seasonalOutfits, ...outfits]
const selection = seasonalOutfits[0].items

describe('prepared studio photos', () => {
  it('offers all three approved angles only for the approved appearance', () => {
    expect(studioPhoto(selection, garments, looks)).toMatchObject({
      src: '/previews/navy-after-hours-quality-v1.webp', angles: ['front', 'side', 'back'], triptych: true,
    })
    // A renamed saved look still matches its pieces; an ID/name is not a photo key.
    expect(studioPhoto({ ...selection }, garments, looks)?.triptych).toBe(true)
  })
  it('never reuses an outdated portrait after recolouring or uploading a piece', () => {
    for (const change of [{ color: '#123456' }, { photo: 'data:image/webp;base64,AA==' }, { name: 'Different shirt' }]) {
      const edited = garments.map(g => g.id === selection.tops ? { ...g, ...change } : g)
      expect(studioPhoto(selection, edited, looks)).toBeUndefined()
    }
  })
  it('does not invent other angles for front-only portraits', () => {
    const photo = studioPhoto(seasonalOutfits[1].items, garments, looks)
    expect(photo?.src).toMatch(/^\/outfits\//)
    expect(photo?.angles).toEqual(['front'])
    expect(photo?.triptych).toBe(false)
  })
  it('falls back for unprepared mixes and removed belongings', () => {
    expect(studioPhoto({ ...selection, layers: undefined, shoes: 'skechers-taupe' }, garments, looks)).toBeUndefined()
    expect(studioPhoto(selection, garments.map(g => g.id === selection.tops ? { ...g, ownership: 'not-owned' } : g), looks)).toBeUndefined()
  })
})
