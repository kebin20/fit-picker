import * as THREE from 'three'
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js'
import type { Garment } from '../types'

type Print = { side: 'front' | 'back'; x: number; y: number; width: number; height: number }
// Metres in the authored tee's local space. Back art uses its own outward
// projector, so letters are neither mirrored nor visible through the torso.
const prints: Record<string, Print[]> = {
  'pink-tee': [{ side: 'front', x: 0, y: 1.34, width: .24, height: .075 }],
  'black-cat-tee': [{ side: 'front', x: 0, y: 1.30, width: .19, height: .20 }],
  'white-graphic-tee': [
    { side: 'front', x: .085, y: 1.37, width: .04, height: .04 },
    { side: 'back', x: 0, y: 1.28, width: .24, height: .30 },
  ],
  'ukiyoe-tee': [
    { side: 'front', x: .085, y: 1.39, width: .036, height: .02 },
    { side: 'back', x: 0, y: 1.33, width: .23, height: .17 },
  ],
  'burton-tee': [{ side: 'front', x: .09, y: 1.29, width: .032, height: .25 }],
  'black-tee': [{ side: 'front', x: .085, y: 1.37, width: .055, height: .055 }],
}
const loader = new THREE.TextureLoader()
// Eight small textures, shared across outfit changes and loaded only in 3D.
const textures = new Map<string, Promise<THREE.Texture>>()
function texture(path: string) {
  if (!textures.has(path)) textures.set(path, loader.loadAsync(path).then(map => {
    map.colorSpace = THREE.SRGBColorSpace
    map.anisotropy = 2
    return map
  }).catch(error => { textures.delete(path); throw error }))
  return textures.get(path)!
}

export async function addGarmentPrints(group: THREE.Group, garment: Garment) {
  if (garment.photo) return // A user photo can replace the reference design.
  const designs = prints[garment.id]
  if (!designs) return
  // Project onto the visible fabric after layer/body masking. Covered parts of
  // a print disappear naturally beneath outerwear; no floating rectangular card.
  const mesh = group.children.find(object => (object as THREE.Mesh).isMesh) as THREE.Mesh | undefined
  if (!mesh) return
  mesh.updateMatrixWorld(true)
  await Promise.allSettled(designs.map(async design => {
    const map = await texture(`/prints/${garment.id}-${design.side}-v2.webp`)
    const geometry = new DecalGeometry(mesh,
      new THREE.Vector3(design.x, design.y, design.side === 'back' ? -.09 : .13),
      new THREE.Euler(0, design.side === 'back' ? Math.PI : 0, 0),
      new THREE.Vector3(design.width, design.height, .16))
    if (!geometry.getAttribute('position').count) { geometry.dispose(); return }
    const material = new THREE.MeshStandardMaterial({
      map, transparent: true, alphaTest: .03, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, roughness: .95,
      metalness: 0, side: THREE.FrontSide,
    })
    const decal = new THREE.Mesh(geometry, material)
    decal.name = `${garment.id} ${design.side} print`
    decal.userData.garmentPrint = design.side
    decal.receiveShadow = true
    group.add(decal)
  }))
}
