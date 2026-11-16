import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { fitTrouserCut, openOvershirt, restOvershirt, shortenSleeves, subdivideCloth, innerShirtOpening } from './garment-geometry'

function shirtPanels() {
  const geometry = new THREE.BufferGeometry()
  const positions: number[] = [], uvs: number[] = []
  for (const z of [.12, -.1]) for (const y of [.9, 1.5]) for (const x of [-.2, .2]) {
    positions.push(x, y, z); uvs.push((x + .2) / .4, (y - .9) / .6)
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex([0, 1, 2, 1, 3, 2, 4, 6, 5, 5, 6, 7])
  geometry.computeVertexNormals()
  return geometry
}

function trouserLegs() {
  const geometry = new THREE.BufferGeometry(), positions: number[] = [], indices: number[] = []
  for (const side of [-1, 1]) for (const y of [.1, .3, .5, .7, .96]) for (let angle = 0; angle < 8; angle++) {
    positions.push(side * (.20 - y * .1 + .055 * Math.cos(angle * Math.PI / 4)), y, .06 * Math.sin(angle * Math.PI / 4))
  }
  for (let leg = 0; leg < 2; leg++) for (let ring = 0; ring < 4; ring++) for (let a = 0; a < 8; a++) {
    const first = leg * 40 + ring * 8, b = (a + 1) % 8
    indices.push(first + a, first + b, first + a + 8, first + b, first + b + 8, first + a + 8)
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

describe('garment fitting geometry', () => {
  it('intersects inner shirt faces at the outer opening while retaining the collar and UVs', () => {
    const source = shirtPanels(), inner = innerShirtOpening(source)
    const positions = inner.getAttribute('position'), uv = inner.getAttribute('uv')
    let collar = false, opening = false
    for (let vertex = 0; vertex < positions.count; vertex++) {
      const y = positions.getY(vertex)
      if (y < 1.425 - 1e-6) {
        expect(Math.abs(positions.getX(vertex))).toBeLessThanOrEqual(.060 + Math.max(0, 1.30 - y) * .025 + 1e-6)
        expect(positions.getZ(vertex)).toBeGreaterThanOrEqual(.035 - 1e-6)
        opening = true
      } else collar = true
      expect(Number.isFinite(uv.getX(vertex)) && Number.isFinite(uv.getY(vertex))).toBe(true)
    }
    expect(collar && opening).toBe(true)
    expect(inner.getIndex()!.count).toBeGreaterThan(0)
    source.dispose(); inner.dispose()
  })
  it('cuts sleeves exactly at the cuff while retaining the lower torso', () => {
    const source = shirtPanels(), short = shortenSleeves(source)
    const p = short.getAttribute('position'), index = short.getIndex()!
    let lowerTorso = false, cuffEdge = false
    for (let vertex = 0; vertex < p.count; vertex++) {
      if (Math.abs(p.getX(vertex)) > .185 + 1e-6) expect(p.getY(vertex)).toBeGreaterThanOrEqual(1.21 - 1e-6)
      if (p.getY(vertex) < 1.21 - 1e-6) lowerTorso = true
      if (Math.abs(p.getY(vertex) - 1.21) < 1e-6) cuffEdge = true
    }
    expect(lowerTorso).toBe(true); expect(cuffEdge).toBe(true)
    expect(index.count).toBeGreaterThan(0)
    source.dispose(); short.dispose()
  })

  it('opens only the shirt front, keeping a clean edge, valid UVs and the whole back', () => {
    const source = shirtPanels(), opened = openOvershirt(source)
    const p = opened.getAttribute('position'), uv = opened.getAttribute('uv'), index = opened.getIndex()!
    let backArea = 0, frontArea = 0
    for (let face = 0; face < index.count; face += 3) {
      const vertices = [0, 1, 2].map(offset => new THREE.Vector3().fromBufferAttribute(p, index.getX(face + offset)))
      const area = new THREE.Triangle(...vertices as [THREE.Vector3, THREE.Vector3, THREE.Vector3]).getArea()
      expect(area).toBeGreaterThan(1e-8)
      if (vertices[0].z < 0) backArea += area
      else {
        frontArea += area
        const centre = vertices.reduce((v, point) => v.add(point), new THREE.Vector3()).multiplyScalar(1 / 3)
        expect(Math.abs(centre.x)).toBeGreaterThanOrEqual(.037 + (1.18 - centre.y) * .025 - 1e-6)
      }
    }
    expect(backArea).toBeCloseTo(.24, 5)
    expect(frontArea).toBeGreaterThan(.18); expect(frontArea).toBeLessThan(.22)
    for (let vertex = 0; vertex < p.count; vertex++) {
      expect(uv.getX(vertex)).toBeCloseTo((p.getX(vertex) + .2) / .4, 5)
      expect(uv.getY(vertex)).toBeCloseTo((p.getY(vertex) - .9) / .6, 5)
    }
    source.dispose(); opened.dispose()
  })

  it('bakes small resting folds without unbounded geometry growth or invalid normals', () => {
    const source = openOvershirt(shirtPanels()), detailed = subdivideCloth(source)
    expect(detailed.getIndex()!.count).toBe(source.getIndex()!.count * 4)
    const before = detailed.getAttribute('position').array.slice()
    restOvershirt(detailed)
    const p = detailed.getAttribute('position'), n = detailed.getAttribute('normal')
    for (let vertex = 0; vertex < p.count; vertex++) {
      const distance = new THREE.Vector3(p.getX(vertex) - before[vertex * 3], p.getY(vertex) - before[vertex * 3 + 1], p.getZ(vertex) - before[vertex * 3 + 2]).length()
      expect(distance).toBeLessThan(.015)
    }
    expect([...n.array].every(Number.isFinite)).toBe(true)
    source.dispose(); detailed.dispose()
  })

  it('keeps coincident UV-seam vertices joined when folds ease the cloth surface', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([.15, 1.2, .1, .15, 1.2, .1, .1, 1.3, .1], 3))
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute([1, 0, 0, 0, 0, 1, 0, 1, 0], 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 1, .5, .5], 2))
    geometry.setIndex([0, 1, 2])
    restOvershirt(geometry)
    const p = geometry.getAttribute('position')
    expect([p.getX(0), p.getY(0), p.getZ(0)]).toEqual([p.getX(1), p.getY(1), p.getZ(1)])
    geometry.dispose()
  })

  it('gives wide legs more room than slim ones, preserves the waist and keeps inner legs apart', () => {
    const slim = trouserLegs(), wide = slim.clone(), ankle = slim.clone()
    const waist = Array.from(slim.getAttribute('position').array).slice(32 * 3, 40 * 3)
    fitTrouserCut(slim, 'slim'); fitTrouserCut(wide, 'wide'); fitTrouserCut(ankle, 'ankle')
    const slimP = slim.getAttribute('position'), wideP = wide.getAttribute('position')
    const span = (p: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => Math.abs(p.getX(8) - p.getX(12))
    expect(span(wideP)).toBeGreaterThan(span(slimP))
    expect(Array.from(wideP.array).slice(32 * 3, 40 * 3)).toEqual(waist)
    for (let vertex = 0; vertex < wideP.count; vertex++) expect(Math.abs(wideP.getX(vertex))).toBeGreaterThanOrEqual(.012 - 1e-6)
    expect(ankle.getAttribute('position').getY(0)).toBeGreaterThan(slimP.getY(0))
    expect([...wide.getAttribute('normal').array].every(Number.isFinite)).toBe(true)
    slim.dispose(); wide.dispose(); ankle.dispose()
  })
})
