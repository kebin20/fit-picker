import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'

function aimBone(scene: THREE.Object3D, name: string, childName: string, direction: THREE.Vector3) {
  const bone = scene.getObjectByName(name)
  const child = scene.getObjectByName(childName)
  if (!bone || !child || !bone.parent) return
  scene.updateMatrixWorld(true)
  const from = bone.getWorldPosition(new THREE.Vector3())
  const current = child.getWorldPosition(new THREE.Vector3()).sub(from).normalize()
  const world = bone.getWorldQuaternion(new THREE.Quaternion())
  const delta = new THREE.Quaternion().setFromUnitVectors(current, direction.normalize())
  const parent = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert()
  bone.quaternion.copy(parent.multiply(delta.multiply(world)))
}

export async function bakeAvatarAsset(file: string) {
  const gltf = await new GLTFLoader().loadAsync(`/.cache/avatar-source/${file}`)
  const plainGarment = file.startsWith('clothing_')
  const scene = gltf.scene
  scene.traverse(object => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh || !mesh.morphTargetInfluences) return
    mesh.morphTargetInfluences.fill(0)
    const male = mesh.morphTargetDictionary?.gender_male
    if (male !== undefined) mesh.morphTargetInfluences[male] = 1
  })
  for (const side of ['l', 'r']) {
    const arm = scene.getObjectByName(`upperarm_${side}`)
    if (!arm) continue
    scene.updateMatrixWorld(true)
    const sign = Math.sign(arm.getWorldPosition(new THREE.Vector3()).x) || (side === 'l' ? 1 : -1)
    aimBone(scene, `upperarm_${side}`, `lowerarm_${side}`, new THREE.Vector3(sign * .23, -.97, .02))
    aimBone(scene, `lowerarm_${side}`, `hand_${side}`, new THREE.Vector3(sign * .08, -.99, .08))
  }
  scene.updateMatrixWorld(true)
  scene.traverse(object => { const skinned = object as THREE.SkinnedMesh; if (skinned.isSkinnedMesh) skinned.skeleton.update() })
  const output = new THREE.Group()
  const point = new THREE.Vector3()
  const meshes: { name: string; vertices: number; attributes: string[] }[] = []
  scene.traverse(object => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    const geometry = mesh.geometry.clone()
    const position = geometry.getAttribute('position')
    const baked = new Float32Array(position.count * 3)
    for (let index = 0; index < position.count; index++) {
      mesh.getVertexPosition(index, point)
      point.applyMatrix4(mesh.matrixWorld)
      point.toArray(baked, index * 3)
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(baked, 3))
    geometry.deleteAttribute('skinIndex')
    geometry.deleteAttribute('skinWeight')
    geometry.morphAttributes = {}
    geometry.computeVertexNormals()
    geometry.computeBoundingBox()
    const cloneMaterial = (source: THREE.Material) => {
      const material = source.clone() as THREE.MeshStandardMaterial
      if (plainGarment) {
        // Runtime applies solid wardrobe colours and its own tiny weave texture.
        // Avoid shipping/decoding source denim and shoe maps that it discards.
        material.map = material.normalMap = material.roughnessMap = material.metalnessMap = null
        material.bumpMap = material.alphaMap = material.aoMap = material.emissiveMap = null
      }
      return material
    }
    const material = Array.isArray(mesh.material) ? mesh.material.map(cloneMaterial) : cloneMaterial(mesh.material)
    const product = new THREE.Mesh(geometry, material)
    product.name = mesh.name
    output.add(product)
    meshes.push({ name: mesh.name, vertices: position.count, attributes: Object.keys(geometry.attributes) })
  })
  const buffer = await new GLTFExporter().parseAsync(output, { binary: true, maxTextureSize: file.startsWith('hair_') ? 512 : 1024, onlyVisible: true }) as ArrayBuffer
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let index = 0; index < bytes.length; index += 16384) binary += String.fromCharCode(...bytes.subarray(index, index + 16384))
  const box = new THREE.Box3().setFromObject(output)
  return { data: btoa(binary), meshes, bounds: { min: box.min.toArray(), max: box.max.toArray() }, bytes: bytes.length }
}
