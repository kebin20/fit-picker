import { describe, expect, it } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { garments, outfits } from './wardrobe'
import { seasonalOutfits } from './seasonal-outfits'
import { guideQuickIdeas } from './guide-quick-ideas'
import { outfitPhoto } from '../lib/outfit-photos'
import manifest from './outfit-photo-manifest.json'
import refreshed from '../../docs/artwork/outfits/wardrobe-refresh/prompts.json'
import { outfitAppearance, outfitSummary } from '../lib/outfit-appearance'
import type { Garment } from '../types'

const owned = new Set(garments.filter(piece => piece.ownership === 'confirmed').map(piece => piece.id))
const selectable = [...seasonalOutfits, ...outfits].filter(look => Object.values(look.items).every(id => owned.has(id)))
const archivedPhotos = [...seasonalOutfits, ...outfits].filter(look => Object.values(look.items).every(id => garments.some(g => g.id === id && g.ownership !== 'recommended')))
const newPortraits = guideQuickIdeas.filter(look => look.id !== 'aw-quick-4')

describe('complete model-photo library', () => {
  it('covers every selectable new and original guide combination', () => {
    expect(selectable).toHaveLength(132)
    // Preserve original IDs/photos as historical assets when ownership changes.
    expect(Object.keys(manifest).sort()).toEqual([...archivedPhotos, ...newPortraits].map(look => look.id).sort())
    for (const look of [...selectable, ...guideQuickIdeas]) expect(outfitPhoto(look), look.id).toBeDefined()
    const flannel = guideQuickIdeas.find(look => look.id === 'aw-quick-4')!
    expect(outfitPhoto(flannel)?.src).toBe(outfitPhoto(seasonalOutfits.find(look => look.id === 'styled-autumn-edit02-20')!)?.src)
    const sourceOnly = outfits.find(look => look.id === 'aw-core-8')!
    expect(outfitPhoto(sourceOnly)).toBeUndefined()
  })

  it('ships decodable responsive WebPs with matching portrait dimensions', async () => {
    for (const look of [...selectable, ...newPortraits]) {
      const photo = outfitPhoto(look)!
      expect(photo.width, look.id).toBe(1024)
      expect(photo.height, look.id).toBeGreaterThanOrEqual(1500)
      for (const width of [400, 800, 1024]) {
        const relative = width === 1024 ? photo.src : photo.src.replace('/outfits/', `/outfits/${width}/`)
        const file = fileURLToPath(new URL(`../../public${relative}`, import.meta.url))
        const bytes = readFileSync(file)
        expect(bytes.toString('ascii', 0, 4), relative).toBe('RIFF')
        expect(bytes.toString('ascii', 8, 12), relative).toBe('WEBP')
        const dimensions = await sharp(file).metadata()
        expect(dimensions.width, relative).toBe(width)
        expect(dimensions.height! / dimensions.width!, relative).toBeCloseTo(photo.height / photo.width, 2)
        if (width === 400) expect(statSync(file).size, relative).toBeLessThan(80_000)
      }
    }
  })

  it('refreshes every active combination using a corrected tee and preserves its clothing IDs', () => {
    const corrected = new Set(['cream-tee','pink-tee','black-cat-tee','white-graphic-tee','ukiyoe-tee','burton-tee','black-tee'])
    const affected = selectable.filter(look => Object.values(look.items).some(id => corrected.has(id)))
    expect(affected).toHaveLength(20)
    expect(refreshed.entries.map(entry => entry.id).sort()).toEqual(affected.map(look => look.id).sort())
    for (const look of affected) {
      const entry = refreshed.entries.find(entry => entry.id === look.id)!
      expect(entry.items).toEqual(look.items)
      expect(outfitPhoto(look)?.src).toBe(`/outfits/${look.id}-wardrobe-v2.webp`)
      expect(manifest[look.id as keyof typeof manifest].appearance).toBe(outfitAppearance(look,garments))
    }
  })

  it('falls back to the current garments after a visual edit instead of showing an outdated portrait', () => {
    const look = selectable.find(look => look.id === 'styled-summer-03')!
    for (const patch of [{color:'#665544'},{chestPocket:false},{style:'hoodie'},{photo:'data:image/webp;base64,abc'},{ownership:'not-owned'}] as Partial<Garment>[]) {
      const changed = garments.map(g => g.id === 'cream-tee' ? {...g,...patch} : g)
      expect(outfitPhoto(look,changed),JSON.stringify(patch)).toBeUndefined()
    }
    expect(outfitPhoto({...look,items:{...look.items,shoes:'adidas-black'}})).toBeUndefined()
    const notes = garments.map(g => ({...g,note:'Personal washing note'}))
    expect(outfitPhoto(look,notes)).toBeDefined()
    const renamed = garments.map(g => g.id === 'cream-tee' ? {...g,name:'My oatmeal pocket tee'} : g)
    expect(outfitSummary(look,renamed)).toContain('My oatmeal pocket tee')
    expect(outfitPhoto(look,renamed)).toBeUndefined()
  })
})
