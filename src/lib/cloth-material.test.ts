import { expect, it } from 'vitest'
import { clothMaterial } from './cloth-material'
import { garments } from '../data/wardrobe'
import { DataTexture, MeshStandardMaterial } from 'three'

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

it('retains a garment’s baked cloth normals when applying its wardrobe colour', () => {
  const baked = new DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1)
  const source = new MeshStandardMaterial({ normalMap: baked })
  source.normalScale.set(.8, .8)
  const material = clothMaterial(garments.find(piece => piece.id === 'brown-flannel')!, source)
  expect(material.normalMap).toBe(baked)
  expect(material.normalScale.toArray()).toEqual([.52, .52])
  expect(material.color.getHexString()).toBe('75523a')
  material.dispose(); source.dispose(); baked.dispose()
})
