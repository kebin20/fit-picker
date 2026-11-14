import * as THREE from 'three'
import type { Garment } from '../types'

// Small shared, non-colour maps. No photographic texture downloads, colour
// prints or per-garment copies; filtering removes subpixel weave at a distance.
const size = 128
const normals = new Uint8Array(size * size * 4)
const roughness = new Uint8Array(size * size * 4)
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  const offset = (y * size + x) * 4
  const warp = Math.sin(x * Math.PI / 2), weft = Math.sin(y * Math.PI / 2)
  const grain = Math.sin(x * 17.71 + y * 31.37) * Math.sin(x * 5.13 - y * 11.19)
  normals.set([128 + Math.round(warp * 12 + grain * 3), 128 + Math.round(weft * 12 - grain * 3), 254, 255], offset)
  const value = 239 + Math.round(grain * 9 + (warp * weft) * 5)
  roughness.set([value, value, value, 255], offset)
}
function map(data: Uint8Array) {
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(16, 16)
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}
const fibreNormals = map(normals), fibreRoughness = map(roughness)

export function clothMaterial(garment: Garment, template?: THREE.Material) {
  const shell = garment.style === 'puffer' || garment.style === 'raincoat' || garment.style === 'bomber'
  const brushed = garment.style === 'coat' || garment.style === 'sweatshirt' || garment.style === 'hoodie' || garment.id === 'brown-flannel'
  const color = new THREE.Color(garment.color)
  const source = template as THREE.MeshStandardMaterial | undefined
  const role = template?.name.toLowerCase() || ''
  const metal = role.startsWith('zipper metal')
  const button = role.startsWith('buttons')
  if (role.startsWith('rib knit')) color.multiplyScalar(.84)
  if (role.startsWith('detail fabric')) color.multiplyScalar(.96)
  if (metal) color.lerp(new THREE.Color('#777c7a'), .45)
  if (button) color.set(garment.style === 'coat' ? '#614b36' : '#b8ad99')
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: metal ? .65 : 0,
    roughness: metal ? .42 : button ? .65 : shell ? .75 : .92,
    roughnessMap: metal || button ? null : fibreRoughness,
    // Preserve each garment's offline high/low cloth bake. Replacing this with
    // a shared weave would erase the drape detail that the asset pipeline made.
    normalMap: metal || button ? null : source?.normalMap || fibreNormals,
    normalScale: source?.normalMap ? source.normalScale.clone().multiplyScalar(.65) : new THREE.Vector2(.3, .3),
    sheen: metal || button ? 0 : shell ? .08 : brushed ? .45 : .28,
    sheenColor: color.clone().lerp(new THREE.Color('#e4e0d4'), .12),
    sheenRoughness: .85,
    specularIntensity: .25,
    envMapIntensity: .35,
    side: THREE.DoubleSide,
    shadowSide: THREE.FrontSide,
  })
}
