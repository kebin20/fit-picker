import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { garments } from '../data/wardrobe'
import { avatarGarment } from './avatar-assets'
import { hideCoveredFaces, hideLayerFaces } from './avatar-scene'

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
    expect(avatarGarment(garments.find(piece => piece.id === 'navy-sweatshirt')!, 'tops').kind).toBe('sweatshirt')
  })

  it('gives open shirt layers their own lightweight mesh and matching sleeve coverage', () => {
    const overshirt = avatarGarment(garments.find(piece => piece.id === 'brown-overshirt')!, 'layers')
    const short = avatarGarment(garments.find(piece => piece.id === 'navy-shirt')!, 'layers')
    expect(overshirt).toMatchObject({ file: 'garments/overshirt-long.glb', zone: 512, kind: 'overshirt-long', baked: true })
    expect(short).toMatchObject({ file: 'garments/overshirt-short.glb', zone: 8, kind: 'overshirt-short', baked: true })
    expect(overshirt.file).not.toBe(short.file)
    expect(readFileSync(fileURLToPath(new URL(overshirt.file, modelRoot))).length).toBeLessThan(300_000)
  })

  it('uses the long authored coat model and keeps a knee-length hem', () => {
    const coat = avatarGarment(garments.find(piece => piece.id === 'beige-coat')!, 'layers')
    const jacket = avatarGarment(garments.find(piece => piece.id === 'navy-bomber')!, 'layers')
    expect(coat).toMatchObject({ file: 'garments/coat.glb', zone: 16, kind: 'coat', baked: true })
    expect(coat.file).not.toBe(jacket.file)
    const gltf = parse(coat.file)
    const minY = Math.min(...gltf.meshes.flatMap((mesh: { primitives: { attributes: { POSITION: number } }[] }) => mesh.primitives.map(part => gltf.accessors[part.attributes.POSITION].min[1])))
    expect(minY).toBeGreaterThan(.4)
    expect(minY).toBeLessThan(.56)
  })

  it('assigns independent constructions to puffer, bomber and rain jacket', () => {
    const files = ['black-puffer', 'navy-bomber', 'black-rain-jacket'].map(id => avatarGarment(garments.find(piece => piece.id === id)!, 'layers').file)
    expect(new Set(files).size).toBe(3)
    expect(files).toEqual(['garments/puffer.glb', 'garments/bomber.glb', 'garments/rain-jacket.glb'])
  })

  it('hides covered body faces while retaining boundary faces for garment seams', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(18), 3))
    // The static glTF exporter prefixes custom attribute names a second time.
    geometry.setAttribute('__cczone', new THREE.BufferAttribute(new Uint16Array([8, 8, 8, 8, 0, 8]), 1))
    geometry.setIndex([0, 1, 2, 3, 4, 5])
    hideCoveredFaces(geometry, 8)
    expect(Array.from(geometry.getIndex()!.array)).toEqual([3, 4, 5])
    geometry.dispose()
  })

  it('removes covered inner fabric while retaining faces at the visible opening', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(18), 3))
    geometry.setIndex([0, 1, 2, 3, 4, 5])
    hideLayerFaces(geometry, new Uint8Array([0b101111]))
    expect(Array.from(geometry.getIndex()!.array)).toEqual([3, 4, 5])
    geometry.dispose()
  })
})
