import { describe, expect, it } from 'vitest'
import { garments } from '../data/wardrobe'
import type { Garment, Outfit } from '../types'
import { adaptFocusOutfits, canWearTogether } from './focus-outfits'

const piece = (id: string) => garments.find(garment => garment.id === id)!
const recipe: Outfit = {
  id: 'test-bomber-look',
  name: 'Test bomber look',
  subtitle: '',
  items: { tops: 'white-tee', layers: 'navy-bomber', bottoms: 'grey-slacks', shoes: 'adidas-striped' },
  seasons: ['Autumn'],
  occasions: ['Everyday'],
  source: 'aw-updated',
  sourceLabel: 'Fixture',
  sourceIndex: 0,
  vibe: 'Clean casual',
  image: '/outfits/test-photo.webp',
  note: 'Describes the original pieces.',
}

describe('focused outfit variations', () => {
  it('supports wearable-as roles without allowing duplicate or incompatible anchors', () => {
    expect(canWearTogether(piece('brown-flannel'), piece('white-tee'))).toBe(true)
    expect(canWearTogether(piece('white-tee'), piece('rust-tee'))).toBe(false)
    expect(canWearTogether(piece('navy-bomber'), piece('black-rain-jacket'))).toBe(false)
    expect(canWearTogether(piece('brown-flannel'), piece('brown-flannel'))).toBe(false)
  })

  it('changes only the requested pieces, removes outdated photos, and deduplicates recipes', () => {
    const lightTee: Garment = { ...piece('white-tee'), id: 'stone-tee', name: 'Stone tee', color: '#e2dfda' }
    const custom = [...garments, lightTee]
    const focus = ['stone-tee', 'skechers-white']
    const looks = adaptFocusOutfits([recipe, { ...recipe, id: 'duplicate' }], custom, focus)
    expect(looks).toHaveLength(1)
    expect(looks[0]).toMatchObject({
      items: { ...recipe.items, tops: 'stone-tee', shoes: 'skechers-white' },
      origin: 'styled',
      image: undefined,
      note: undefined,
    })
    expect(adaptFocusOutfits([recipe], custom, [...focus].reverse())[0].id).toBe(looks[0].id)
    expect(adaptFocusOutfits([recipe, looks[0]], custom, focus)).toHaveLength(0)
  })

  it('preserves the look’s palette, cut and pattern choices', () => {
    const wide = { ...piece('grey-slacks'), id: 'wide-grey', name: 'Wide grey trousers' }
    const patterned: Garment = { ...piece('white-tee'), id: 'white-print', pattern: 'graphic' }
    const wardrobe = [...garments, wide, patterned]
    for (const id of ['green-bomber', 'wide-grey', 'white-print', 'rust-tee']) {
      expect(adaptFocusOutfits([recipe], wardrobe, [id]), id).toHaveLength(0)
    }
  })
})
