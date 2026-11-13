import { describe, expect, it } from 'vitest'
import briefs from '../../docs/artwork/garments/catalogue-briefs.json'
import { garments } from './wardrobe'

describe('product photography briefs', () => {
  it('covers every catalogue piece exactly once, including separately labelled suggestions', () => {
    const pieces = briefs.atlases.flatMap(atlas => atlas.cells).filter(cell => cell.id !== null)
    expect(pieces.map(piece => piece.id).sort()).toEqual(garments.map(piece => piece.id).sort())
    for (const brief of pieces) {
      const piece = garments.find(garment => garment.id === brief.id)!
      expect(brief.colorHex).toBe(piece.color)
      expect(brief.ownership).toBe(piece.ownership)
    }
  })

  it('keeps each atlas within sixteen cells with unambiguous row-major positions', () => {
    expect(briefs.atlases).toHaveLength(4)
    for (const atlas of briefs.atlases) {
      expect(atlas.cells.length).toBe(atlas.rows * atlas.columns)
      expect(atlas.cells.length).toBeLessThanOrEqual(16)
      atlas.cells.forEach((cell, index) => {
        expect(cell.index).toBe(index)
        expect(cell.row).toBe(Math.floor(index / atlas.columns) + 1)
        expect(cell.column).toBe(index % atlas.columns + 1)
      })
    }
  })
})
