import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import catalogue from '../data/garment-model-manifest.json'
import layers from '../data/garment-layer-coverage.json'

function glb(file: string) {
  const bytes = readFileSync(new URL(`../../public/models/${file}`, import.meta.url))
  const jsonBytes = bytes.readUInt32LE(12)
  return { bytes, data: JSON.parse(bytes.subarray(20, 20 + jsonBytes).toString()), binaryOffset: 28 + jsonBytes }
}

describe('garment-specific asset library', () => {
  it('ships all 18 complete static constructions within the phone asset budgets', () => {
    expect(catalogue.assets).toHaveLength(18)
    expect(catalogue.runtimeSimulation).toBe(false)
    for (const asset of catalogue.assets) {
      const { bytes, data } = glb(asset.file)
      expect(bytes.length, asset.family).toBe(asset.bytes)
      expect(createHash('sha256').update(bytes).digest('hex'), asset.family).toBe(asset.sha256)
      expect(bytes.length, asset.family).toBeLessThan(650_000)
      expect(asset.triangles, asset.family).toBeLessThan(11_000)
      expect(asset.clothFrames, asset.family).toBeGreaterThanOrEqual(24)
      expect(asset.drapeRmsMetres, asset.family).toBeGreaterThan(.001)
      expect(data.extensionsRequired, asset.family).toContain('KHR_draco_mesh_compression')
      expect(data.animations || [], asset.family).toHaveLength(0)
      expect(data.skins || [], asset.family).toHaveLength(0)
    }
  })

  it('embeds each high/low cloth normal bake at its declared resolution', () => {
    for (const asset of catalogue.assets) {
      const { bytes, data, binaryOffset } = glb(asset.file)
      const fabric = data.materials.find((material: { normalTexture?: unknown }) => material.normalTexture)
      expect(fabric, asset.family).toBeDefined()
      const image = data.images[data.textures[fabric.normalTexture.index].source]
      expect(image.uri, asset.family).toBeUndefined()
      expect(image.mimeType).toBe('image/png')
      const view = data.bufferViews[image.bufferView]
      const start = binaryOffset + (view.byteOffset || 0)
      expect(bytes.readUInt32BE(start + 16), asset.family).toBe(asset.normalMapSize)
      expect(bytes.readUInt32BE(start + 20), asset.family).toBe(asset.normalMapSize)
      expect(view.byteLength, asset.family).toBeGreaterThan(5000)
    }
  })

  it('has pose-verified body masks and complete layer masks for the exact shipped assets', () => {
    expect(catalogue.bodyPositionErrorMetres).toBeLessThan(1e-6)
    expect(catalogue.bodyPositionSha256).toMatch(/^[a-f0-9]{64}$/)
    const body = glb('base_body.glb')
    const position = body.data.accessors[body.data.meshes[0].primitives[0].attributes.POSITION]
    const view = body.data.bufferViews[position.bufferView]
    const start = body.binaryOffset + (view.byteOffset || 0) + (position.byteOffset || 0)
    const positions = Buffer.alloc(position.count * 12)
    for (let vertex = 0; vertex < position.count; vertex++) body.bytes.copy(positions, vertex * 12, start + vertex * (view.byteStride || 12), start + vertex * (view.byteStride || 12) + 12)
    expect(createHash('sha256').update(positions).digest('hex')).toBe(catalogue.bodyPositionSha256)
    for (const asset of catalogue.assets) {
      expect(asset.bodyVertexCount).toBe(14517)
      expect(Buffer.from(asset.bodyCoverage, 'base64').length, asset.family).toBe(Math.ceil(14517 / 8))
      expect(asset.coveredBodyVertices, asset.family).toBeGreaterThan(100)
    }
    const sources = new Map(catalogue.assets.map(asset => [asset.family, asset]))
    expect(Object.keys(layers.sourceAssets)).toHaveLength(12)
    for (const [family, sha] of Object.entries(layers.sourceAssets)) expect(sources.get(family)?.sha256, family).toBe(sha)
    expect(Object.keys(layers.coverage)).toHaveLength(6)
    for (const [inner, outerMasks] of Object.entries(layers.coverage)) {
      const data = glb(sources.get(inner)!.file).data
      const counts = data.meshes.flatMap((mesh: { primitives: { attributes: { POSITION: number } }[] }) => mesh.primitives.map(part => data.accessors[part.attributes.POSITION].count))
      expect(Object.keys(outerMasks), inner).toHaveLength(6)
      for (const masks of Object.values(outerMasks)) {
        expect(masks, inner).toHaveLength(counts.length)
        masks.forEach((mask: string, index: number) => expect(Buffer.from(mask, 'base64').length, inner).toBe(Math.ceil(counts[index] / 8)))
      }
    }
  })
})
