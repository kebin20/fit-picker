import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { avatarGarment } from './avatar-assets'
import { fitTrouserCut, trouserCut, shortenSleeves, smoothTextureSeams } from './garment-geometry'
import { clothMaterial } from './cloth-material'
import type { Garment, Selection } from '../types'
import layerCoverage from '../data/garment-layer-coverage.json'

const decoder = new DRACOLoader().setDecoderPath('/draco/').setDecoderConfig({ type: 'wasm' }).setWorkerLimit(1)
const loader = new GLTFLoader().setDRACOLoader(decoder)
const cache = new Map<string, Promise<GLTF>>()
const layerMasks = layerCoverage.coverage as Record<string, Record<string, string[]>>

const decodedMasks = new Map<string, Uint8Array>()
function maskBytes(encoded: string) {
  if (!decodedMasks.has(encoded)) decodedMasks.set(encoded, Uint8Array.from(atob(encoded), char => char.charCodeAt(0)))
  return decodedMasks.get(encoded)!
}

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

function asset(file: string) {
  if (!cache.has(file)) cache.set(file, loader.loadAsync(`/models/${file}`).catch(error => { cache.delete(file); throw error }))
  return cache.get(file)!
}

/** Drop only faces fully inside an authored coverage zone. Keep seam edges. */
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
  if (kind === 'shirt-short' || kind === 'overshirt-short') {
    const clipped = shortenSleeves(geometry)
    geometry.dispose()
    geometry = clipped
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

function instantiate(source: THREE.Object3D, options: { garment?: Garment; hideMask?: number; kind?: string; padding?: number; baked?: boolean; coverage?: Uint8Array[]; layerMask?: Uint8Array[] } = {}) {
  const group = new THREE.Group()
  let primitive = 0
  source.traverse(object => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    const geometry = options.baked ? mesh.geometry.clone() : tailor(mesh.geometry.clone(), options.kind)
    hideLayerFaces(geometry, options.layerMask?.[primitive++])
    hideCoveredFaces(geometry, options.hideMask || 0, options.coverage)
    if (!options.baked && options.kind === 'trousers' && options.garment) fitTrouserCut(geometry, trouserCut(options.garment.id))
    if (options.padding) {
      smoothTextureSeams(geometry)
      const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal')
      for (let vertex = 0; vertex < positions.count; vertex++) {
        positions.setXYZ(vertex, positions.getX(vertex) + normals.getX(vertex) * options.padding, positions.getY(vertex) + normals.getY(vertex) * options.padding, positions.getZ(vertex) + normals.getZ(vertex) * options.padding)
      }
    }
    if (!options.baked && options.kind === 'coat') fitCoatLength(geometry)
    if (!options.baked) smoothTextureSeams(geometry)
    const cloneMaterial = (input: THREE.Material) => {
      if (options.garment && options.garment.category !== 'shoes') {
        const fabric = clothMaterial(options.garment, input)
        fabric.name = input.name
        return fabric
      }
      const material = input.clone() as THREE.MeshStandardMaterial
      material.envMapIntensity = .45
      if (options.garment && material.color) {
        // Do not transfer the source jeans' faded denim colour into plain slacks.
        // Shoe colours stay neutral; clothing uses the shared fabric material.
        material.normalMap = null
        material.roughnessMap = null
        material.bumpMap = null
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
  const top = selected.find(piece => piece.slot === 'tops')
  const bulkyTop = top && ['hoodie', 'sweatshirt', 'longsleeve'].includes(top.garment.style)
  const files = ['base_body.glb', 'hair_short02.glb', ...selected.map(piece => piece.asset.file)]
  if (!selection.bottoms) files.push('clothing_briefs.glb')
  const loaded = new Map(await Promise.all([...new Set(files)].map(async file => [file, await asset(file)] as const)))
  const root = new THREE.Group()
  root.name = 'glTF fitted wardrobe avatar'
  const mask = selected.reduce((bits, piece) => piece.asset.bodyCoverage ? bits : bits | piece.asset.zone, 32)
  const coverage = selected.flatMap(piece => piece.asset.bodyCoverage ? [maskBytes(piece.asset.bodyCoverage)] : [])
  const body = instantiate(loaded.get('base_body.glb')!.scene, { hideMask: mask, coverage })
  const bounds = new THREE.Box3().setFromObject(body)
  root.add(body)
  root.add(instantiate(loaded.get('hair_short02.glb')!.scene))
  if (!selection.bottoms) root.add(instantiate(loaded.get('clothing_briefs.glb')!.scene))
  for (const piece of selected) {
    root.add(instantiate(loaded.get(piece.asset.file)!.scene, {
      garment: piece.garment,
      kind: piece.asset.kind,
      baked: piece.asset.baked,
      layerMask: piece.slot === 'tops' && layer ? layerMasks[piece.asset.kind]?.[layer.asset.kind]?.map(maskBytes) : undefined,
      padding: piece.slot === 'layers'
        ? (piece.asset.baked ? (bulkyTop ? .005 : 0) : .012)
        : piece.slot === 'tops' && bulkyTop && layer?.asset.kind.startsWith('overshirt') ? -.008 : 0,
      hideMask: piece.slot === 'tops' && layer && !layer.asset.kind.startsWith('overshirt') ? layer.asset.zone : 0,
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
