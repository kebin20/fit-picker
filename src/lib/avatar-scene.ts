import * as THREE from 'three'
import { releaseAvatarTextures } from './tailored-avatar'
export { buildTailoredAvatar as buildAvatar } from './tailored-avatar'

// Legacy geometry helpers remain exported for archived asset verification.
export function hideLayerFaces(geometry: THREE.BufferGeometry, bits?: Uint8Array) {
  if (!bits) return
  const index = geometry.getIndex()
  if (!index) return
  const covered = (vertex: number) => Boolean(bits[vertex >> 3] & (1 << (vertex & 7)))
  const kept: number[] = []
  for (let face = 0; face < index.count; face += 3) {
    const a = index.getX(face), b = index.getX(face + 1), c = index.getX(face + 2)
    if (!covered(a) || !covered(b) || !covered(c)) kept.push(a, b, c)
  }
  geometry.setIndex(kept)
}

export function hideCoveredFaces(geometry: THREE.BufferGeometry, mask: number, coverage: Uint8Array[] = []) {
  const zoneName = Object.keys(geometry.attributes).find(name => name.replace(/^_+/, '').toLowerCase() === 'cczone')
  const zones = zoneName ? geometry.getAttribute(zoneName) : undefined
  const index = geometry.getIndex()
  if (!zones || (!mask && !coverage.length) || !index) return
  const kept: number[] = []
  const covered = (vertex: number) => Boolean(zones.getX(vertex) & mask) || coverage.some(bits => Boolean(bits[vertex >> 3] & (1 << (vertex & 7))))
  for (let face = 0; face < index.count; face += 3) {
    const a = index.getX(face), b = index.getX(face + 1), c = index.getX(face + 2)
    if (covered(a) && covered(b) && covered(c)) continue
    kept.push(a, b, c)
  }
  geometry.setIndex(kept)
}

export function fitCoatLength(geometry: THREE.BufferGeometry) {
  // The authored coat has a floor-length skirt. Preserve the waist and upper
  // tailoring while bringing its hem to the knee (rather than jacket length).
  const positions = geometry.getAttribute('position')
  const waist = .96, hem = .48
  for (let vertex = 0; vertex < positions.count; vertex++) {
    const y = positions.getY(vertex)
    if (y < waist) positions.setY(vertex, hem + y * (waist - hem) / waist)
  }
  positions.needsUpdate = true
  geometry.computeVertexNormals()
}

export function disposeAvatar(root: THREE.Object3D) {
  releaseAvatarTextures(root)
  root.traverse(object => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.geometry.dispose()
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    materials.forEach(material => material.dispose())
  })
}
