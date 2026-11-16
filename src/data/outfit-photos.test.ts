import { describe, expect, it } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { garments, outfits } from './wardrobe'
import { seasonalOutfits } from './seasonal-outfits'
import { outfitPhoto } from '../lib/outfit-photos'
import manifest from './outfit-photo-manifest.json'

const owned = new Set(garments.filter(piece => piece.ownership === 'confirmed').map(piece => piece.id))
const selectable = [...seasonalOutfits, ...outfits].filter(look => Object.values(look.items).every(id => owned.has(id)))
const archivedPhotos = [...seasonalOutfits, ...outfits].filter(look => Object.values(look.items).every(id => garments.some(g => g.id === id && g.ownership !== 'recommended')))

describe('complete model-photo library', () => {
  it('covers every selectable new and original guide combination', () => {
    expect(selectable).toHaveLength(133)
    // Preserve original IDs/photos as historical assets when ownership changes.
    expect(Object.keys(manifest).sort()).toEqual(archivedPhotos.map(look => look.id).sort())
    for (const look of selectable) expect(outfitPhoto(look), look.id).toBeDefined()
    const sourceOnly = outfits.find(look => look.id === 'aw-core-8')!
    expect(outfitPhoto(sourceOnly)).toBeUndefined()
  })

  it('ships decodable responsive WebPs with matching portrait dimensions', async () => {
    for (const look of selectable) {
      const photo = outfitPhoto(look)!
      expect(photo.width, look.id).toBe(1024)
      expect(photo.height, look.id).toBeGreaterThanOrEqual(1500)
      for (const width of [400, 800, 1024]) {
        const relative = width === 1024 ? photo.src : `/outfits/${width}/${look.id}.webp`
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
})
