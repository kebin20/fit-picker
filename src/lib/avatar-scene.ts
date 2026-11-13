import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { avatarGarment } from './avatar-assets'
import type { Garment, Selection } from '../types'

const loader = new GLTFLoader()
const cache = new Map<string, Promise<GLTF>>()
const weavePixels = new Uint8Array(32 * 32 * 4)
for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
  const offset = (y * 32 + x) * 4
  const value = (x + y) % 2 ? 130 : 126
  weavePixels.set([value, value, value, 255], offset)
}
const weave = new THREE.DataTexture(weavePixels, 32, 32, THREE.RGBAFormat)
weave.wrapS = weave.wrapT = THREE.RepeatWrapping
weave.repeat.set(16, 16)
weave.needsUpdate = true

function smoothTextureSeams(geometry: THREE.BufferGeometry) {
  const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal')
  const groups = new Map<string, { vertices: number[]; normal: THREE.Vector3 }>()
  for (let vertex = 0; vertex < positions.count; vertex++) {
    const key = [positions.getX(vertex), positions.getY(vertex), positions.getZ(vertex)].map(value => value.toFixed(5)).join('|')
    const group = groups.get(key) || { vertices: [], normal: new THREE.Vector3() }
    group.vertices.push(vertex)
    group.normal.add(new THREE.Vector3(normals.getX(vertex), normals.getY(vertex), normals.getZ(vertex)))
    groups.set(key, group)
  }
  for (const group of groups.values()) {
    group.normal.normalize()
    for (const vertex of group.vertices) normals.setXYZ(vertex, group.normal.x, group.normal.y, group.normal.z)
  }
  normals.needsUpdate = true
}
function asset(file: string) {
  if (!cache.has(file)) cache.set(file, loader.loadAsync(`/models/${file}`).catch(error => { cache.delete(file); throw error }))
  return cache.get(file)!
}

/** Drop only faces fully inside an authored coverage zone. Keep seam edges. */
export function hideCoveredFaces(geometry: THREE.BufferGeometry, mask: number) {
  const zones = geometry.getAttribute('_cczone') || geometry.getAttribute('_CCZONE')
  const index = geometry.getIndex()
  if (!zones || !mask || !index) return
  const kept: number[] = []
  for (let face = 0; face < index.count; face += 3) {
    const a = index.getX(face), b = index.getX(face + 1), c = index.getX(face + 2)
    if ((zones.getX(a) & mask) && (zones.getX(b) & mask) && (zones.getX(c) & mask)) continue
    kept.push(a, b, c)
  }
  geometry.setIndex(kept)
}

function removeHood(geometry: THREE.BufferGeometry) {
  const positions = geometry.getAttribute('position'), index = geometry.getIndex()
  if (!index) return
  const parent = Array.from({ length: positions.count }, (_, vertex) => vertex)
  const find = (vertex: number): number => { while (parent[vertex] !== vertex) { parent[vertex] = parent[parent[vertex]]; vertex = parent[vertex] }; return vertex }
  const union = (a: number, b: number) => { parent[find(a)] = find(b) }
  const seen = new Map<string, number>()
  for (let vertex = 0; vertex < positions.count; vertex++) {
    const key = [positions.getX(vertex), positions.getY(vertex), positions.getZ(vertex)].map(value => value.toFixed(5)).join('|')
    if (seen.has(key)) union(vertex, seen.get(key)!)
    else seen.set(key, vertex)
  }
  for (let face = 0; face < index.count; face += 3) { union(index.getX(face), index.getX(face + 1)); union(index.getX(face), index.getX(face + 2)) }
  const counts = new Map<number, number>()
  for (let vertex = 0; vertex < positions.count; vertex++) { const root = find(vertex); counts.set(root, (counts.get(root) || 0) + 1) }
  const body = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0]
  const kept: number[] = []
  for (let face = 0; face < index.count; face += 3) if (find(index.getX(face)) === body) kept.push(index.getX(face), index.getX(face + 1), index.getX(face + 2))
  geometry.setIndex(kept)
}

function tailor(geometry: THREE.BufferGeometry, kind?: string) {
  if (kind === 'sweater') removeHood(geometry)
  if (kind === 'shirt-short') {
    const positions = geometry.getAttribute('position'), index = geometry.getIndex()!
    const kept: number[] = []
    for (let face = 0; face < index.count; face += 3) {
      const vertices = [index.getX(face), index.getX(face + 1), index.getX(face + 2)]
      const x = vertices.reduce((sum, vertex) => sum + positions.getX(vertex), 0) / 3
      const y = vertices.reduce((sum, vertex) => sum + positions.getY(vertex), 0) / 3
      if (Math.abs(x) > .185 && y < 1.21) continue
      kept.push(...vertices)
    }
    geometry.setIndex(kept)
  }
  return geometry
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

function instantiate(source: THREE.Object3D, options: { garment?: Garment; hideMask?: number; kind?: string; padding?: number } = {}) {
  const group = new THREE.Group()
  source.traverse(object => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    const geometry = tailor(mesh.geometry.clone(), options.kind)
    hideCoveredFaces(geometry, options.hideMask || 0)
    if (options.padding) {
      const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal')
      for (let vertex = 0; vertex < positions.count; vertex++) {
        positions.setXYZ(vertex, positions.getX(vertex) + normals.getX(vertex) * options.padding, positions.getY(vertex) + normals.getY(vertex) * options.padding, positions.getZ(vertex) + normals.getZ(vertex) * options.padding)
      }
    }
    if (options.kind === 'coat') fitCoatLength(geometry)
    smoothTextureSeams(geometry)
    const cloneMaterial = (input: THREE.Material) => {
      const material = input.clone() as THREE.MeshStandardMaterial
      material.envMapIntensity = .45
      if (options.garment && material.color) {
        // Do not transfer the source jeans' faded denim colour into plain slacks.
        // Retain the authored surface detail as subtle relief, not as a print.
        material.normalMap = null
        material.roughnessMap = null
        material.bumpMap = weave
        material.bumpScale = .00006
        material.map = null
        material.color.set(options.garment.color)
        material.roughness = options.garment.category === 'shoes' ? .72 : .9
        material.metalness = 0
        material.side = THREE.DoubleSide
      } else if (material.name === 'Skin') {
        material.color.set('#bd8e73')
        material.roughness = .62
      }
      return material
    }
    const material = Array.isArray(mesh.material) ? mesh.material.map(cloneMaterial) : cloneMaterial(mesh.material)
    const result = new THREE.Mesh(geometry, material)
    result.name = mesh.name
    result.castShadow = true
    result.receiveShadow = true
    group.add(result)
  })
  return group
}

export async function buildAvatar(garments: Garment[], selection: Selection) {
  const selected = Object.entries(selection).flatMap(([slot, id]) => {
    const garment = garments.find(piece => piece.id === id)
    return garment ? [{ slot, garment, asset: avatarGarment(garment, slot) }] : []
  })
  const layer = selected.find(piece => piece.slot === 'layers')
  const files = ['base_body.glb', 'hair_short02.glb', ...selected.map(piece => piece.asset.file)]
  if (!selection.bottoms) files.push('clothing_briefs.glb')
  const loaded = new Map(await Promise.all([...new Set(files)].map(async file => [file, await asset(file)] as const)))
  const root = new THREE.Group()
  root.name = 'glTF fitted wardrobe avatar'
  const mask = selected.reduce((bits, piece) => bits | piece.asset.zone, 32)
  const body = instantiate(loaded.get('base_body.glb')!.scene, { hideMask: mask })
  const bounds = new THREE.Box3().setFromObject(body)
  root.add(body)
  root.add(instantiate(loaded.get('hair_short02.glb')!.scene))
  if (!selection.bottoms) root.add(instantiate(loaded.get('clothing_briefs.glb')!.scene))
  for (const piece of selected) {
    root.add(instantiate(loaded.get(piece.asset.file)!.scene, {
      garment: piece.garment,
      kind: piece.asset.kind,
      padding: piece.slot === 'layers' ? .012 : 0,
      hideMask: piece.slot === 'tops' && layer ? layer.asset.zone : 0,
    }))
  }
  const scale = 1.8 / (bounds.max.y - bounds.min.y)
  root.scale.setScalar(scale)
  root.position.y = -bounds.min.y * scale
  root.userData.assetFormat = 'glTF 2.0'
  root.userData.licensedSource = 'MakeHuman / CharacterCreator CC0 exports'
  root.userData.files = files
  return root
}

/** Instances own geometry/materials; the bounded template cache owns textures. */
export function disposeAvatar(root: THREE.Object3D) {
  root.traverse(object => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.geometry.dispose()
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    materials.forEach(material => material.dispose())
  })
}
