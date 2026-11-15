import { describe, expect, it } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Outfit, Season } from '../types'
import { garments, outfits as guideOutfits } from './wardrobe'
import { seasonalOutfits } from './seasonal-outfits'
import { recommendOutfits } from '../lib/recommendations'

const seasons: Season[] = ['Autumn', 'Winter', 'Spring', 'Summer']
const byId = new Map(garments.map(piece => [piece.id, piece]))
const composition = (look: Outfit) => (['tops', 'layers', 'bottoms', 'shoes'] as const)
  .map(slot => look.items[slot] || '')
  .join('|')

describe('seasonal styling edit', () => {
  it('adds three complete looks per season with occasion coverage', () => {
    const firstEdit = seasonalOutfits.filter(look => look.sourceLabel.endsWith('Edit 01'))
    expect(firstEdit).toHaveLength(12)
    for (const season of seasons) {
      const looks = firstEdit.filter(look => look.seasons.includes(season))
      expect(looks, season).toHaveLength(3)
      expect(looks.every(look => look.seasons.length === 1 && look.items.tops && look.items.bottoms && look.items.shoes)).toBe(true)
      for (const occasion of ['Everyday', 'Dinner', 'Date night', 'With friends', 'Outdoors'] as const) {
        expect(recommendOutfits(seasonalOutfits, garments, season, occasion).length, `${season} / ${occasion}`).toBeGreaterThan(0)
      }
    }
  })

  it('resolves compatible pieces and seasons, retaining unowned archive records outside recommendations', () => {
    for (const look of seasonalOutfits) {
      for (const [slot, id] of Object.entries(look.items)) {
        const piece = byId.get(id)
        expect(piece, `${look.id}: missing ${id}`).toBeDefined()
        expect(['confirmed', 'not-owned'], `${look.id}: unconfirmed ${id}`).toContain(piece!.ownership)
        expect(piece!.category === slot || piece!.wearableAs?.some(role => role === slot), `${look.id}: invalid ${slot}`).toBe(true)
        expect(piece!.seasons, `${look.id}: wrong season for ${id}`).toContain(look.seasons[0])
      }
    }
  })

  it('adds new combinations without repeating the source guides or another new look', () => {
    const guideCompositions = new Set(guideOutfits.map(composition))
    const newCompositions = seasonalOutfits.map(composition)
    expect(new Set(newCompositions).size).toBe(seasonalOutfits.length)
    for (const look of seasonalOutfits) {
      expect(guideCompositions.has(composition(look)), `${look.id} repeats a guide combination`).toBe(false)
      expect(new Set(Object.values(look.items)).size).toBe(Object.values(look.items).length)
    }
  })

  it('identifies new styling separately and points to dedicated images instead of source crops', () => {
    expect(new Set([...guideOutfits, ...seasonalOutfits].map(look => look.id)).size).toBe(guideOutfits.length + seasonalOutfits.length)
    for (const look of seasonalOutfits) {
      expect(look.origin).toBe('styled')
      expect(look.sourceIndex).toBe(-1)
      if (look.image) expect(look.image).toBe(`/outfits/${look.id}.webp`)
      expect(look.sourceLabel).toMatch(new RegExp(`^Styled from your wardrobe · ${look.seasons[0]} · Edit \\d+$`))
      expect(look.note).toBeTruthy()
    }
  })

  it('keeps the indoor winter flannel look out of outdoor recommendations', () => {
    const looks = recommendOutfits(seasonalOutfits, garments, 'Winter', 'Outdoors')
    expect(looks.map(look => look.id)).toContain('styled-winter-03')
    expect(looks.map(look => look.id)).not.toContain('styled-winter-02')
    expect(seasonalOutfits.find(look => look.id === 'styled-winter-02')!.note).toContain('indoor get-togethers')
  })

  it('ships a real WebP asset for every styling image instead of an unresolved URL', () => {
    for (const look of seasonalOutfits.filter(look => look.image)) {
      const file = fileURLToPath(new URL(`../../public${look.image}`, import.meta.url))
      expect(statSync(file).size, `${look.id}: empty image`).toBeGreaterThan(10_000)
      const bytes = readFileSync(file)
      expect(bytes.toString('ascii', 0, 4), `${look.id}: not a WebP container`).toBe('RIFF')
      expect(bytes.toString('ascii', 8, 12), `${look.id}: invalid WebP file`).toBe('WEBP')
    }
  })

  it('adds 24 genuinely new combinations per season with several choices for every occasion', () => {
    const edit = seasonalOutfits.filter(look => look.sourceLabel.endsWith('Edit 02'))
    expect(edit).toHaveLength(96)
    for (const season of seasons) {
      expect(edit.filter(look => look.seasons.includes(season))).toHaveLength(24)
      for (const occasion of ['Everyday', 'Dinner', 'Date night', 'With friends', 'Outdoors'] as const) {
        expect(recommendOutfits(edit, garments, season, occasion).length, `${season} / ${occasion}`).toBeGreaterThanOrEqual(4)
      }
    }
    expect(edit.every(look => !look.image)).toBe(true)
  })
})
