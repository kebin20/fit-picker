import { describe, expect, it } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { garments } from './wardrobe'
import { garmentPhoto, hasBackPhoto } from '../lib/garment-photos'
import sharp from 'sharp'

describe('photographic wardrobe assets', () => {
  it('ships an individual real WebP file for every catalogue piece, including suggestions', () => {
    for (const garment of garments) {
      const file = fileURLToPath(new URL(`../../public${garmentPhoto(garment)}`, import.meta.url))
      expect(statSync(file).size, `${garment.id}: missing photo content`).toBeGreaterThan(1000)
      const bytes = readFileSync(file)
      expect(bytes.toString('ascii', 0, 4), garment.id).toBe('RIFF')
      expect(bytes.toString('ascii', 8, 12), garment.id).toBe('WEBP')
    }
  })

  it('ships small transparent front/back cutouts and optional 3D print textures', async () => {
    for (const garment of garments.filter(g => ['pink-tee','black-cat-tee','white-graphic-tee','ukiyoe-tee','burton-tee','black-tee'].includes(g.id))) {
      const sides = hasBackPhoto(garment) ? ['front','back'] as const : ['front'] as const
      for (const side of sides) {
        const file = fileURLToPath(new URL(`../../public${garmentPhoto(garment,side)}`, import.meta.url))
        const image = await sharp(file).metadata()
        expect(Math.max(image.width!,image.height!)).toBeLessThanOrEqual(640)
        expect(image.hasAlpha).toBe(true)
        const print = fileURLToPath(new URL(`../../public/prints/${garment.id}-${side}-v2.webp`, import.meta.url))
        expect(statSync(print).size).toBeLessThan(100_000)
        expect((await sharp(print).metadata()).hasAlpha).toBe(true)
      }
    }
  })
})
