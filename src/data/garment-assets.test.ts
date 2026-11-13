import { describe, expect, it } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { garments } from './wardrobe'

describe('photographic wardrobe assets', () => {
  it('ships an individual real WebP file for every catalogue piece, including suggestions', () => {
    for (const garment of garments) {
      const file = fileURLToPath(new URL(`../../public/garments/${garment.id}.webp`, import.meta.url))
      expect(statSync(file).size, `${garment.id}: missing photo content`).toBeGreaterThan(1000)
      const bytes = readFileSync(file)
      expect(bytes.toString('ascii', 0, 4), garment.id).toBe('RIFF')
      expect(bytes.toString('ascii', 8, 12), garment.id).toBe('WEBP')
    }
  })
})
