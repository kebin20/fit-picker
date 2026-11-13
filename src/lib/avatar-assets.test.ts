import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { garments } from '../data/wardrobe'
import { avatarGarment } from './avatar-assets'
import { fitCoatLength, hideCoveredFaces } from './avatar-scene'

const modelRoot = new URL('../../public/models/', import.meta.url)
const parse = (file: string) => {
  const bytes = readFileSync(fileURLToPath(new URL(file, modelRoot)))
  expect(bytes.toString('ascii', 0, 4), file).toBe('glTF')
  expect(bytes.readUInt32LE(4), file).toBe(2)
  expect(bytes.readUInt32LE(8), file).toBe(bytes.length)
  return JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString())
}

describe('fitted glTF model assets', () => {
  it('ships licensed model data with a pinned source and embedded textures', () => {
    const manifest = JSON.parse(readFileSync(fileURLToPath(new URL('manifest.json', modelRoot)), 'utf8'))
    expect(manifest.license).toBe('CC0-1.0')
    expect(manifest.sourceCommit).toMatch(/^[a-f0-9]{40}$/)
    for (const asset of manifest.assets) {
      const gltf = parse(asset.file)
      expect(gltf.meshes.length, asset.file).toBeGreaterThan(0)
      expect((gltf.images || []).every((image: { uri?: string; bufferView?: number }) => !image.uri && image.bufferView !== undefined), asset.file).toBe(true)
      expect(gltf.meshes.every((mesh: { primitives: { targets?: unknown[] }[] }) => mesh.primitives.every(part => !part.targets)), asset.file).toBe(true)
    }
    const body = parse('base_body.glb')
    const primitive = body.meshes.find((mesh: { name: string }) => mesh.name === 'base' || mesh.name === 'Body')?.primitives[0] || body.meshes[0].primitives[0]
    expect(body.accessors[primitive.attributes.POSITION].count).toBeGreaterThan(10_000)
  })

  it('resolves every supported clothing slot to an existing fitted model', () => {
    for (const garment of garments) {
      for (const slot of [garment.category, ...(garment.wearableAs || [])]) {
        const asset = avatarGarment(garment, slot)
        expect(asset.zone).toBeGreaterThan(0)
        expect(parse(asset.file).asset.version).toBe('2.0')
      }
    }
    expect(avatarGarment(garments.find(piece => piece.id === 'navy-shirt')!, 'tops').kind).toBe('shirt-short')
    expect(avatarGarment(garments.find(piece => piece.id === 'navy-sweatshirt')!, 'tops').kind).toBe('sweater')
  })

  it('gives open shirt layers their own lightweight mesh and matching sleeve coverage', () => {
    const overshirt = avatarGarment(garments.find(piece => piece.id === 'brown-overshirt')!, 'layers')
    const short = avatarGarment(garments.find(piece => piece.id === 'navy-shirt')!, 'layers')
    expect(overshirt).toEqual({ file: 'clothing_overshirt.glb', zone: 512, kind: 'overshirt' })
    expect(short).toEqual({ file: 'clothing_overshirt.glb', zone: 8, kind: 'overshirt-short' })
    expect(readFileSync(fileURLToPath(new URL(overshirt.file, modelRoot))).length).toBeLessThan(300_000)
  })

  it('uses the long authored coat model and keeps a knee-length hem', () => {
    const coat = avatarGarment(garments.find(piece => piece.id === 'beige-coat')!, 'layers')
    const jacket = avatarGarment(garments.find(piece => piece.id === 'navy-bomber')!, 'layers')
    expect(coat).toEqual({ file: 'clothing_trenchcoat.glb', zone: 16, kind: 'coat' })
    expect(coat.file).not.toBe(jacket.file)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, .08, 0, .1, .96, 0, 0, 1.5, 0], 3))
    fitCoatLength(geometry)
    const positions = geometry.getAttribute('position')
    expect(positions.getY(0)).toBeGreaterThan(.48)
    expect(positions.getY(0)).toBeLessThan(.54)
    expect(positions.getY(1)).toBeCloseTo(.96)
    expect(positions.getY(2)).toBeCloseTo(1.5)
    geometry.dispose()
  })

  it('hides covered body faces while retaining boundary faces for garment seams', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(18), 3))
    geometry.setAttribute('_cczone', new THREE.BufferAttribute(new Uint16Array([8, 8, 8, 8, 0, 8]), 1))
    geometry.setIndex([0, 1, 2, 3, 4, 5])
    hideCoveredFaces(geometry, 8)
    expect(Array.from(geometry.getIndex()!.array)).toEqual([3, 4, 5])
    geometry.dispose()
  })
})
