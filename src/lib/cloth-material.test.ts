import { expect, it } from 'vitest'
import { clothMaterial } from './cloth-material'
import { garments } from '../data/wardrobe'
import type { DataTexture } from 'three'

it('shares small fabric maps across clothes without adding a print to the solid flannel', () => {
  const flannel = clothMaterial(garments.find(piece => piece.id === 'brown-flannel')!)
  const trousers = clothMaterial(garments.find(piece => piece.id === 'grey-slacks')!)
  expect(flannel.map).toBeNull()
  expect(flannel.normalMap).toBe(trousers.normalMap)
  expect(flannel.roughnessMap).toBe(trousers.roughnessMap)
  const image = (flannel.normalMap as DataTexture).image
  expect(image.width).toBeLessThanOrEqual(128)
  expect(image.height).toBeLessThanOrEqual(128)
  expect(flannel.metalness).toBe(0)
  expect(flannel.clearcoat).toBe(0); expect(flannel.transmission).toBe(0)
  flannel.dispose(); trousers.dispose()
})
