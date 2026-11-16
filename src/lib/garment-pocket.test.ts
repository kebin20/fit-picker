import {describe,it,expect} from 'vitest'
import * as THREE from 'three'
import {addChestPocket} from './garment-pocket'
import {garments} from '../data/wardrobe'

describe('fitted chest pocket',()=>{
  const cream=garments.find(g=>g.id==='cream-tee')!
  it('fits a raised patch and hem to visible fabric, and skips a masked surface',()=>{
    const group=new THREE.Group()
    const fabric=new THREE.Mesh(new THREE.PlaneGeometry(.4,.4).translate(0,1.33,.13),new THREE.MeshStandardMaterial())
    group.add(fabric)
    addChestPocket(group,cream)
    const pocket=group.children.find(o=>o.userData.chestPocket)!
    expect(pocket).toBeDefined()
    const patch=pocket.children[0] as THREE.Mesh
    const vertices=patch.geometry.getAttribute('position')
    for(let i=0;i<vertices.count;i++)expect(vertices.getZ(i)).toBeCloseTo(.1325,4)
    expect(patch.geometry.getIndex()?.count).toBe(15)
    const masked=new THREE.Group()
    // A remaining back panel must not acquire a pocket through the masked front.
    masked.add(new THREE.Mesh(new THREE.PlaneGeometry(.4,.4).translate(0,1.33,-.1),new THREE.MeshStandardMaterial({side:THREE.DoubleSide})))
    addChestPocket(masked,cream)
    expect(masked.children.some(o=>o.userData.chestPocket)).toBe(false)
  })
})
