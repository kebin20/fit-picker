import * as THREE from 'three'
import type { Garment } from '../types'
import { clothMaterial } from './cloth-material'

/** A small raised patch fitted to the already-masked tee surface. */
export function addChestPocket(group: THREE.Group, garment: Garment) {
  if (!garment.chestPocket) return
  const cloth = group.children.find(object => (object as THREE.Mesh).isMesh) as THREE.Mesh | undefined
  if (!cloth) return
  cloth.updateMatrixWorld(true)
  const ray = new THREE.Raycaster()
  const sample = (x: number, y: number) => {
    ray.set(new THREE.Vector3(x, y, .45), new THREE.Vector3(0, 0, -1))
    const hit = ray.intersectObject(cloth, false)[0]
    return hit && hit.point.z > .04 ? hit.point.clone().addScaledVector(hit.normal || hit.face!.normal, .0025) : null
  }
  // The open top, two sides and shaped bottom use the garment's real curvature.
  const outline = [[.035,1.37],[.035,1.30],[.0825,1.285],[.13,1.30],[.13,1.37]]
  const edge = outline.map(([x,y]) => sample(x,y))
  const middle = sample(.0825,1.33)
  if (!middle || edge.some(point => !point)) return // Covered by outerwear.
  const points = [middle,...edge as THREE.Vector3[]]
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(points.flatMap(p=>p.toArray()),3))
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(points.flatMap(p=>[(p.x-.035)/.095,(p.y-1.285)/.085]),2))
  geometry.setIndex([0,1,2,0,2,3,0,3,4,0,4,5,0,5,1])
  geometry.computeVertexNormals()
  const fabric = clothMaterial(garment)
  fabric.color.multiplyScalar(.96)
  const patch = new THREE.Mesh(geometry,fabric)
  patch.receiveShadow = true
  const pocket = new THREE.Group()
  pocket.name = 'Chest patch pocket'
  pocket.userData.chestPocket = true
  pocket.add(patch)
  const seamMaterial = new THREE.MeshStandardMaterial({color:new THREE.Color(garment.color).multiplyScalar(.78),roughness:1})
  const seam = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge as THREE.Vector3[]),20,.00065,3,false),seamMaterial)
  const hem = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(edge[0]!,edge[4]!),8,.0012,4,false),seamMaterial.clone())
  pocket.add(seam,hem)
  group.add(pocket)
}
