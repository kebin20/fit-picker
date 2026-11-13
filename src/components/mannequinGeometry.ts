import * as THREE from 'three'

export type Ring = [y: number, width: number, depth: number]
export type Point = [number, number, number]
export type SweepPoint = [x: number, y: number, z: number, width: number, depth: number]

// Shape-preserving cubic interpolation: this removes the straight sections and
// abrupt profile changes of stacked cylinders without overshooting at cuffs.
function spline(xs: number[], values: number[]) {
  const slopes = xs.slice(1).map((x, i) => (values[i + 1] - values[i]) / (x - xs[i]))
  const tangents = values.map((_, i) => {
    if (i === 0) return slopes[0]
    if (i === values.length - 1) return slopes[slopes.length - 1]
    if (slopes[i - 1] * slopes[i] <= 0) return 0
    const before = xs[i] - xs[i - 1]
    const after = xs[i + 1] - xs[i]
    const w1 = 2 * after + before
    const w2 = after + 2 * before
    return (w1 + w2) / (w1 / slopes[i - 1] + w2 / slopes[i])
  })
  return (x: number) => {
    let i = 0
    while (i < xs.length - 2 && x > xs[i + 1]) i++
    const h = xs[i + 1] - xs[i]
    const t = THREE.MathUtils.clamp((x - xs[i]) / h, 0, 1)
    return (2 * t ** 3 - 3 * t ** 2 + 1) * values[i]
      + (t ** 3 - 2 * t ** 2 + t) * h * tangents[i]
      + (-2 * t ** 3 + 3 * t ** 2) * values[i + 1]
      + (t ** 3 - t ** 2) * h * tangents[i + 1]
  }
}

function gridGeometry(positions: number[], uvs: number[], rows: number, cols: number, reverse = false, closed = false) {
  const indices: number[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const a = row * (cols + 1) + col
      const b = a + cols + 1
      if (reverse) indices.push(a, b, a + 1, b, b + 1, a + 1)
      else indices.push(a, a + 1, b, b, a + 1, b + 1)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  if (closed) {
    const normals = geometry.getAttribute('normal')
    const normal = new THREE.Vector3()
    const other = new THREE.Vector3()
    for (let row = 0; row <= rows; row++) {
      const first = row * (cols + 1)
      const last = first + cols
      normal.fromBufferAttribute(normals, first)
      other.fromBufferAttribute(normals, last)
      normal.add(other).normalize()
      normals.setXYZ(first, normal.x, normal.y, normal.z)
      normals.setXYZ(last, normal.x, normal.y, normal.z)
    }
  }
  return geometry
}

export function shell(rings: Ring[], gap = 0, folds = 0) {
  const samples = 88
  const segments = 64
  const ys = rings.map(([y]) => -y)
  const widthAt = spline(ys, rings.map(([, width]) => width))
  const depthAt = spline(ys, rings.map(([, , depth]) => depth))
  const positions: number[] = []
  const uvs: number[] = []
  const top = rings[0][0]
  const bottom = rings[rings.length - 1][0]
  for (let row = 0; row <= samples; row++) {
    const t = row / samples
    const y = THREE.MathUtils.lerp(top, bottom, t)
    const width = widthAt(-y)
    const depth = depthAt(-y)
    for (let col = 0; col <= segments; col++) {
      const angle = Math.PI / 2 + gap / 2 + col / segments * (Math.PI * 2 - gap)
      const drape = folds * Math.sin(Math.PI * Math.min(1, t * 1.4)) ** 2
        * (0.6 * Math.sin(angle * 7 + t * 2.1) + 0.4 * Math.sin(angle * 11 - t * 1.3))
      positions.push(Math.cos(angle) * (width + drape), y, Math.sin(angle) * (depth + drape))
      uvs.push(col / segments, t)
    }
  }
  return gridGeometry(positions, uvs, samples, segments, false, gap === 0)
}

// A single continuous surface follows the relaxed arm; there are no elbow
// joints, shoulder balls, or cylinder end-caps in the sleeve silhouette.
export function sweep(points: SweepPoint[], folds = 0) {
  const rows = 64
  const segments = 40
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'centripetal')
  const values = points.map((_, i) => i / (points.length - 1))
  const widthAt = spline(values, points.map(([, , , width]) => width))
  const depthAt = spline(values, points.map(([, , , , depth]) => depth))
  const positions: number[] = []
  const uvs: number[] = []
  const tangent = new THREE.Vector3()
  const across = new THREE.Vector3()
  const forward = new THREE.Vector3()
  const reference = new THREE.Vector3(0, 0, 1)
  for (let row = 0; row <= rows; row++) {
    const t = row / rows
    const center = curve.getPoint(t)
    tangent.copy(curve.getTangent(t)).normalize()
    across.crossVectors(tangent, reference).normalize()
    forward.crossVectors(across, tangent).normalize()
    const width = Math.max(0.001, widthAt(t))
    const depth = Math.max(0.001, depthAt(t))
    for (let col = 0; col <= segments; col++) {
      const angle = col / segments * 2 * Math.PI
      const fold = folds * Math.sin(Math.PI * t) ** 2 * Math.sin(angle * 5 + t * 11)
      const point = center.clone().addScaledVector(across, Math.cos(angle) * (width + fold)).addScaledVector(forward, Math.sin(angle) * (depth + fold))
      positions.push(point.x, point.y, point.z)
      uvs.push(col / segments, t)
    }
  }
  return gridGeometry(positions, uvs, rows, segments, true, true)
}

export function trousers(side: number, wide: boolean, shorts: boolean, ankle: boolean) {
  const rows = 100
  const segments = 64
  const hem = shorts ? 1.29 : ankle ? 0.34 : 0.245
  const positions: number[] = []
  const uvs: number[] = []
  const profile = shorts
    ? [[2.01, 0.165, 0.185], [1.85, 0.178, 0.21], [1.60, 0.178, 0.198], [hem, 0.171, 0.179]]
    : wide
      ? [[2.01, 0.16, 0.187], [1.85, 0.19, 0.212], [1.57, 0.187, 0.211], [1.18, 0.183, 0.195], [0.83, 0.177, 0.184], [0.44, 0.158, 0.162], [hem, 0.147, 0.153]]
      : [[2.01, 0.16, 0.184], [1.85, 0.177, 0.202], [1.55, 0.161, 0.185], [1.02, 0.132, 0.15], [0.65, 0.119, 0.133], [hem, 0.105, 0.115]]
  const ys = profile.map(([y]) => -y)
  const widthAt = spline(ys, profile.map(([, w]) => w))
  const depthAt = spline(ys, profile.map(([, , d]) => d))
  for (let row = 0; row <= rows; row++) {
    const t = row / rows
    const y = THREE.MathUtils.lerp(2.01, hem, t)
    const branching = THREE.MathUtils.smoothstep(2.01 - y, 0.26, 0.39)
    const width = widthAt(-y)
    const depth = depthAt(-y)
    const center = 0.194 + Math.sin(t * Math.PI) * 0.008
    for (let col = 0; col <= segments; col++) {
      const angle = col / segments * Math.PI * 2
      // At the waist the two leg surfaces describe complementary half-ellipses.
      // They open gradually at the crotch into full, independent trouser legs.
      const hipWidth = 0.335 + 0.034 * Math.sin(THREE.MathUtils.clamp((2.01 - y) / 0.43, 0, 1) * Math.PI)
      const waistX = angle <= Math.PI ? hipWidth * Math.sin(angle) : 0
      const legX = center + width * Math.sin(angle)
      const x = side * THREE.MathUtils.lerp(waistX, legX, branching)
      const fold = (shorts ? 0.004 : 0.007) * Math.sin(Math.PI * t) * Math.sin(angle * 6 + t * 3.3)
      const z = Math.cos(angle) * (depth + fold) + Math.sin(t * Math.PI) * 0.011
      positions.push(x, y, z)
      uvs.push(col / segments, t)
    }
  }
  return gridGeometry(positions, uvs, rows, segments, side > 0, true)
}

export function shoeHull(sole = false, toe = false) {
  const rows = 64
  const segments = 40
  const zs = [-0.18, -0.155, -0.10, -0.025, 0.07, 0.16, 0.224, 0.255, 0.265]
  const widthAt = spline(zs, [0.002, 0.074, 0.093, 0.096, 0.101, 0.103, 0.088, 0.042, 0.002])
  const centerAt = spline(zs, sole ? zs.map(() => 0.041) : [0.115, 0.12, 0.137, 0.137, 0.115, 0.098, 0.089, 0.084, 0.084])
  const heightAt = spline(zs, sole ? [0.001, 0.025, 0.026, 0.026, 0.026, 0.025, 0.022, 0.01, 0.001] : [0.003, 0.06, 0.09, 0.088, 0.067, 0.048, 0.035, 0.017, 0.001])
  const positions: number[] = []
  const uvs: number[] = []
  for (let row = 0; row <= rows; row++) {
    const t = row / rows
    const z = THREE.MathUtils.lerp(toe ? 0.135 : zs[0], zs[zs.length - 1], t)
    for (let col = 0; col <= segments; col++) {
      const angle = col / segments * Math.PI * 2
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      positions.push(cos * widthAt(z) * (sole ? 1.035 : 1), centerAt(z) + Math.sign(sin) * Math.abs(sin) ** 0.72 * heightAt(z), z)
      uvs.push(col / segments, t)
    }
  }
  return gridGeometry(positions, uvs, rows, segments, false, true)
}
