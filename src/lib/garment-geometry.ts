import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

/** Coincident UV-seam vertices must share a displacement direction. Otherwise
 * normal padding separates them and opens visible cracks in the garment. */
export function smoothTextureSeams(geometry: THREE.BufferGeometry) {
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

interface Vertex { p: THREE.Vector3; uv: THREE.Vector2 }
const mix = (a: Vertex, b: Vertex, t: number): Vertex => ({ p: a.p.clone().lerp(b.p, t), uv: a.uv.clone().lerp(b.uv, t) })

/** Clip triangles at their actual intersection, preserving UVs and clean edges.
 * Removing whole triangles by their centres leaves a visibly jagged placket. */
function clip(poly: Vertex[], distance: (vertex: Vertex) => number): Vertex[] {
  const result: Vertex[] = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    const da = distance(a), db = distance(b)
    if (da >= 0) result.push(a)
    if ((da > 0 && db < 0) || (da < 0 && db > 0)) result.push(mix(a, b, da / (da - db)))
  }
  return result
}

function clipGeometry(source: THREE.BufferGeometry, regions: (poly: Vertex[]) => Vertex[][]) {
  const positions = source.getAttribute('position'), uv = source.getAttribute('uv'), indices = source.getIndex()
  const output: number[] = [], texcoords: number[] = []
  const emit = (poly: Vertex[]) => {
    for (let i = 1; i + 1 < poly.length; i++) {
      const triangle = [poly[0], poly[i], poly[i + 1]]
      const area = triangle[1].p.clone().sub(triangle[0].p).cross(triangle[2].p.clone().sub(triangle[0].p)).lengthSq()
      if (area < 1e-15) continue
      triangle.forEach(v => { output.push(v.p.x, v.p.y, v.p.z); texcoords.push(v.uv.x, v.uv.y) })
    }
  }
  const count = indices?.count || positions.count
  for (let face = 0; face < count; face += 3) {
    const poly = [0, 1, 2].map(offset => {
      const vertex = indices ? indices.getX(face + offset) : face + offset
      return { p: new THREE.Vector3().fromBufferAttribute(positions, vertex), uv: new THREE.Vector2(uv.getX(vertex), uv.getY(vertex)) }
    })
    regions(poly).forEach(emit)
  }
  const raw = new THREE.BufferGeometry()
  raw.setAttribute('position', new THREE.Float32BufferAttribute(output, 3))
  raw.setAttribute('uv', new THREE.Float32BufferAttribute(texcoords, 2))
  const geometry = mergeVertices(raw, 1e-6)
  raw.dispose()
  geometry.computeVertexNormals()
  return geometry
}

/** Derive a light open overshirt from the authored fitted shirt, rather than
 * substituting the bulky four-pocket jacket. Applied offline after pose bake. */
export function openOvershirt(source: THREE.BufferGeometry) {
  const gap = (v: Vertex) => .037 + (1.18 - v.p.y) * .025
  return clipGeometry(source, poly => {
    // Disjoint right, left and back regions preserve the entire shirt back.
    const rest = clip(poly, v => gap(v) - v.p.x)
    return [clip(poly, v => v.p.x - gap(v)), clip(rest, v => -v.p.x - gap(v)),
      clip(clip(rest, v => v.p.x + gap(v)), v => .045 - v.p.z)]
  })
}

/** Complement the authored long overshirt's opening with exact intersections.
 * A vertex-only coverage mask leaves visible inner-shirt triangles protruding
 * across the seam. Keep its collar and the fabric inside the real opening.
 */
export function innerShirtOpening(source: THREE.BufferGeometry) {
  // An overlap allowance keeps the lining/skin behind curled seam edges hidden.
  const gap = (v: Vertex) => .060 + Math.max(0, 1.30 - v.p.y) * .025
  return clipGeometry(source, poly => {
    const belowCollar = clip(poly, v => 1.425 - v.p.y)
    const opening = (panel: Vertex[]) => clip(clip(clip(panel, v => gap(v) - v.p.x), v => gap(v) + v.p.x), v => v.p.z - .035)
    return [clip(poly, v => v.p.y - 1.425),
      opening(clip(belowCollar, v => 1.30 - v.p.y)),
      opening(clip(belowCollar, v => v.p.y - 1.30))]
  })
}

/** Intersect sleeve triangles at the cuff instead of deleting whole triangles.
 * Keep the central torso below the cuff plane. Used by both shirt templates. */
export function shortenSleeves(source: THREE.BufferGeometry) {
  return clipGeometry(source, poly => [
    clip(clip(poly, v => v.p.x + .185), v => .185 - v.p.x),
    clip(clip(poly, v => v.p.x - .185), v => v.p.y - 1.21),
    clip(clip(poly, v => -.185 - v.p.x), v => v.p.y - 1.21),
  ])
}

/** One offline linear subdivision gives the authored garment enough samples for
 * small resting folds without adding a cloth solver or per-frame deformation. */
export function subdivideCloth(source: THREE.BufferGeometry) {
  const pos = source.getAttribute('position'), uv = source.getAttribute('uv'), index = source.getIndex()!
  const positions = Array.from(pos.array), texcoords = Array.from(uv.array), indices: number[] = []
  const edges = new Map<string, number>()
  const midpoint = (a: number, b: number) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`
    const cached = edges.get(key)
    if (cached !== undefined) return cached
    const vertex = positions.length / 3
    for (let axis = 0; axis < 3; axis++) positions.push((positions[a * 3 + axis] + positions[b * 3 + axis]) / 2)
    for (let axis = 0; axis < 2; axis++) texcoords.push((texcoords[a * 2 + axis] + texcoords[b * 2 + axis]) / 2)
    edges.set(key, vertex)
    return vertex
  }
  for (let face = 0; face < index.count; face += 3) {
    const a = index.getX(face), b = index.getX(face + 1), c = index.getX(face + 2)
    const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a)
    indices.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(texcoords, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export function restOvershirt(geometry: THREE.BufferGeometry) {
  smoothTextureSeams(geometry)
  const p = geometry.getAttribute('position'), n = geometry.getAttribute('normal')
  const ridge = (value: number, centre: number, width: number) => Math.exp(-Math.pow((value - centre) / width, 2))
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const torso = 1 - THREE.MathUtils.smoothstep(Math.abs(x), .16, .23)
    const front = THREE.MathUtils.smoothstep(z, .035, .1)
    const hem = ridge(y, 1.01, .065)
    const elbow = ridge(y, 1.18, .065) * (1 - torso)
    const folds = front * torso * (.0025 * ridge(y + Math.abs(x) * .4, 1.18, .016) - .0018 * ridge(y + Math.abs(x) * .4, 1.205, .018))
      + elbow * Math.sin((y + x * .15) * 90) * .002
      + hem * Math.sin(x * 44) * .0016
    const ease = .008 + folds
    p.setXYZ(i, x + n.getX(i) * ease, y + n.getY(i) * folds, z + n.getZ(i) * ease)
  }
  p.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
}

export type TrouserCut = 'slim' | 'regular' | 'wide' | 'barrel' | 'ankle'
export function trouserCut(id: string): TrouserCut {
  if (id.includes('barrel')) return 'barrel'
  if (id === 'olive-wide') return 'wide'
  if (id === 'grey-slacks') return 'slim'
  if (id === 'black-ankle') return 'ankle'
  return 'regular'
}

/** Add room below the hips around each authored leg's own centre. The hips and
 * waist stay fitted; inner thighs retain a gap instead of crossing each other. */
export function fitTrouserCut(geometry: THREE.BufferGeometry, cut: TrouserCut) {
  const p = geometry.getAttribute('position')
  const rings = Array.from({ length: 19 }, () => ({ min: Infinity, max: -Infinity, zmin: Infinity, zmax: -Infinity }))
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), x = Math.abs(p.getX(i))
    if (x < .008) continue
    const ring = rings[Math.min(18, Math.max(0, Math.round(y / .055)))]
    ring.min = Math.min(ring.min, x); ring.max = Math.max(ring.max, x)
    ring.zmin = Math.min(ring.zmin, p.getZ(i)); ring.zmax = Math.max(ring.zmax, p.getZ(i))
  }
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const ring = rings[Math.min(18, Math.max(0, Math.round(y / .055)))]
    if (!Number.isFinite(ring.min)) continue
    const centre = (ring.min + ring.max) / 2, zCentre = (ring.zmin + ring.zmax) / 2
    const ease = 1 - THREE.MathUtils.smoothstep(y, .70, .94)
    const amount = cut === 'slim' || cut === 'ankle' ? .32 + .15 * (1 - THREE.MathUtils.smoothstep(y, .35, .65)) : cut === 'barrel' ? .68 + .25 * Math.sin(Math.PI * THREE.MathUtils.clamp(y / .85, 0, 1)) : cut === 'wide' ? .9 : .5
    const expanded = Math.abs(x) < .008 ? Math.abs(x) : Math.max(.012, centre + (Math.abs(x) - centre) * (1 + amount * ease))
    const crease = cut === 'slim' || cut === 'ankle' || cut === 'regular'
      ? .006 * Math.exp(-Math.pow((Math.abs(x) - centre) / .017, 2)) * THREE.MathUtils.smoothstep(z - zCentre, 0, .04)
        * THREE.MathUtils.smoothstep(y, .08, .15) * (1 - THREE.MathUtils.smoothstep(y, .74, .89))
      : 0
    const depth = zCentre + (z - zCentre) * (1 + .14 * ease) + crease
    const ankle = cut === 'ankle' ? .045 * (1 - THREE.MathUtils.smoothstep(y, .065, .3)) : 0
    p.setXYZ(i, Math.sign(x) * expanded, y + ankle, depth)
  }
  p.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
}
