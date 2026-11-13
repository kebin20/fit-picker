import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Garment, Selection } from '../types'
import { shell, sweep, trousers, shoeHull, type Ring, type Point, type SweepPoint } from './mannequinGeometry'

interface Props {
  garments: Garment[]
  selection: Selection
  rotation: number
  zoom: number
  onUnavailable?: () => void
}

function disposeTree(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    geometries.add(object.geometry)
    const list = Array.isArray(object.material) ? object.material : [object.material]
    list.forEach((material) => {
      materials.add(material)
      if (material instanceof THREE.MeshStandardMaterial && material.map) textures.add(material.map)
    })
  })
  geometries.forEach((geometry) => geometry.dispose())
  textures.forEach((texture) => texture.dispose())
  materials.forEach((material) => material.dispose())
}

function makeMannequin(garments: Garment[], selection: Selection) {
  const figure = new THREE.Group()
  const get = (slot: keyof Selection) => garments.find((garment) => garment.id === selection[slot])
  const top = get('tops')
  const layer = get('layers')
  const bottoms = get('bottoms')
  const shoes = get('shoes')
  const skin = new THREE.MeshStandardMaterial({ color: '#c8c0b5', roughness: 0.58, metalness: 0.025 })

  const material = (color: string, roughness = 0.92) => {
    const surface = new THREE.MeshPhysicalMaterial({ color, roughness, side: THREE.DoubleSide, sheen: 0.24, sheenRoughness: 0.82, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ebe6dc'), 0.22) })
    // Thin garment shells should not shadow themselves through their front face.
    surface.shadowSide = THREE.BackSide
    return surface
  }
  const darker = (color: string, factor = 0.68) => `#${new THREE.Color(color).multiplyScalar(factor).getHexString()}`
  const lighter = (color: string, factor = 0.13) => `#${new THREE.Color(color).lerp(new THREE.Color('#ffffff'), factor).getHexString()}`
  const mesh = (geometry: THREE.BufferGeometry, surface: THREE.Material, parent: THREE.Object3D = figure) => {
    const object = new THREE.Mesh(geometry, surface)
    object.castShadow = true
    object.receiveShadow = true
    parent.add(object)
    return object
  }
  const ellipsoid = (position: Point, scale: Point, surface: THREE.Material, parent: THREE.Object3D = figure) => {
    const object = mesh(new THREE.SphereGeometry(1, 40, 32), surface, parent)
    object.position.set(...position)
    object.scale.set(...scale)
    return object
  }
  const seam = (points: Point[], color: string, radius = 0.004, parent: THREE.Object3D = figure) => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)))
    const object = mesh(new THREE.TubeGeometry(curve, Math.max(points.length * 3, 12), radius, 6, false), material(color), parent)
    object.castShadow = false
    return object
  }
  const ellipseSeam = (y: number, width: number, depth: number, color: string, gap = 0, parent: THREE.Object3D = figure) => {
    const points: Point[] = []
    for (let i = 0; i <= 64; i++) {
      const angle = Math.PI / 2 + gap / 2 + i / 64 * (2 * Math.PI - gap)
      points.push([Math.cos(angle) * width, y, Math.sin(angle) * depth])
    }
    seam(points, color, 0.003, parent)
  }
  const panel = (points: Point[], surface: THREE.Material, parent: THREE.Object3D = figure) => {
    // A bilinear patch shades as folded fabric rather than two flat triangles.
    const steps = 10
    const positions: number[] = []
    const indices: number[] = []
    const [a, b, c, d] = points.map(point => new THREE.Vector3(...point))
    for (let row = 0; row <= steps; row++) {
      const v = row / steps
      for (let col = 0; col <= steps; col++) {
        const u = col / steps
        const point = a.clone().lerp(b, u).lerp(d.clone().lerp(c, u), v)
        point.z += Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * 0.006
        positions.push(point.x, point.y, point.z)
      }
    }
    for (let row = 0; row < steps; row++) for (let col = 0; col < steps; col++) {
      const start = row * (steps + 1) + col
      indices.push(start, start + 1, start + steps + 1, start + 1, start + steps + 2, start + steps + 1)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    const object = mesh(geometry, surface, parent)
    object.castShadow = false
    return object
  }

  // One smoothly sculpted head profile replaces the separate head/chin balls.
  const head = mesh(shell([[3.657, 0.004, 0.004], [3.625, 0.108, 0.12], [3.55, 0.174, 0.177], [3.43, 0.19, 0.196], [3.31, 0.179, 0.177], [3.22, 0.149, 0.142], [3.145, 0.103, 0.108], [3.122, 0.042, 0.052], [3.117, 0.002, 0.003]]), skin)
  head.position.z = 0.008
  mesh(shell([[3.19, 0.086, 0.087], [3.10, 0.093, 0.095], [3.02, 0.11, 0.107], [2.96, 0.15, 0.124]]), skin)
  mesh(shell([[3.025, 0.116, 0.104], [2.98, 0.235, 0.142], [2.9, 0.365, 0.18], [2.78, 0.406, 0.20], [2.55, 0.366, 0.196], [2.25, 0.29, 0.167], [1.96, 0.29, 0.17], ...(!bottoms ? [[1.76, 0.32, 0.19], [1.61, 0.275, 0.163]] as Ring[] : [])]), skin)
  for (const side of [-1, 1]) {
    ellipsoid([side * 0.181, 3.345, -0.006], [0.024, 0.052, 0.032], skin)
    mesh(sweep([
      [side * 0.31, 2.86, 0, 0.07, 0.09],
      [side * 0.423, 2.78, 0, 0.107, 0.12],
      [side * 0.493, 2.54, 0.008, 0.099, 0.109],
      [side * 0.548, 2.29, 0.028, 0.076, 0.083],
      [side * 0.581, 2.06, 0.058, 0.085, 0.085],
      [side * 0.612, 1.74, 0.096, 0.047, 0.049],
      [side * 0.614, 1.68, 0.102, 0.044, 0.042],
    ]), skin)
    // A relaxed, flattened palm and four individually tapered fingers retain
    // human proportions while keeping the anonymous display-mannequin style.
    ellipsoid([side * 0.615, 1.619, 0.109], [0.06, 0.09, 0.039], skin)
    for (let finger = 0; finger < 4; finger++) {
      const x = side * (0.576 + finger * 0.025)
      const length = [0.098, 0.125, 0.118, 0.092][finger]
      mesh(sweep([[x, 1.584, 0.109, 0.014, 0.018], [x + side * 0.004, 1.53, 0.119, 0.012, 0.015], [x + side * 0.004, 1.584 - length, 0.128, 0.008, 0.01], [x + side * 0.004, 1.577 - length, 0.127, 0.001, 0.002]]), skin)
    }
    mesh(sweep([[side * 0.575, 1.662, 0.12, 0.025, 0.023], [side * 0.553, 1.61, 0.151, 0.019, 0.019], [side * 0.565, 1.566, 0.164, 0.013, 0.014], [side * 0.571, 1.558, 0.164, 0.002, 0.002]]), skin)
    const legSkin: SweepPoint[] = !bottoms
      ? [[side * 0.17, 1.82, 0, 0.157, 0.173], [side * 0.19, 1.47, 0, 0.148, 0.163]]
      : bottoms.style === 'shorts'
        ? [[side * 0.19, 1.34, 0.01, 0.126, 0.141]]
        : []
    if (!bottoms || bottoms.style === 'shorts') legSkin.push([side * 0.198, 0.99, 0.025, 0.105, 0.111], [side * 0.191, 0.68, 0.022, 0.099, 0.111])
    legSkin.push([side * 0.183, 0.36, 0.035, 0.062, 0.065], [side * 0.183, 0.22, 0.035, 0.061, 0.064])
    mesh(sweep(legSkin), skin)
    if (!shoes) ellipsoid([side * 0.183, 0.105, 0.12], [0.083, 0.072, 0.187], skin)
  }

  if (bottoms) {
    const fabric = material(bottoms.color)
    const stitching = darker(bottoms.color, 0.85)
    const shorts = bottoms.style === 'shorts'
    const wide = /barrel|wide|chef/i.test(bottoms.name)
    const ankle = /ankle/i.test(bottoms.name)
    // Each leg flows directly from half of the waistband through the crotch;
    // there is no horizontal hip cylinder or intersecting thigh end-cap.
    mesh(shell([[1.77, 0.29, 0.185], [1.72, 0.26, 0.13], [1.68, 0.20, 0.05], [1.64, 0.12, 0.001]]), fabric)
    for (const side of [-1, 1]) {
      mesh(trousers(side, wide, shorts, ankle), fabric)
      seam([[side * 0.283, 1.94, 0.112], [side * 0.248, 1.85, 0.166], [side * 0.233, 1.78, 0.188]], stitching, 0.0025)
    }
    ellipseSeam(1.992, 0.337, 0.19, stitching)
    seam([[0, 1.98, 0.189], [0.012, 1.88, 0.209], [0, 1.77, 0.21]], stitching, 0.0025)
    ellipsoid([0, 1.988, 0.192], [0.011, 0.011, 0.004], material('#8e877c', 0.45))
  }

  function dress(garment: Garment, isLayer: boolean) {
    const group = new THREE.Group()
    figure.add(group)
    const style = garment.style
    const open = isLayer && ['coat', 'overshirt', 'raincoat', 'bomber', 'puffer', 'shirt'].includes(style)
    const longCoat = style === 'coat'
    const puff = style === 'puffer'
    const hasCollar = ['shirt', 'overshirt', 'coat', 'raincoat'].includes(style)
    const shortSleeve = style === 'tee' || (style === 'shirt' && (garment.id === 'navy-shirt' || /short.sleeve/i.test(garment.name) || (garment.seasons.includes('Summer') && !garment.seasons.includes('Winter'))))
    const underLayerBulk = isLayer && top && ['hoodie', 'sweatshirt'].includes(top.style) ? 0.012 : 0
    const thickness = isLayer ? (puff ? 0.070 : 0.045) + underLayerBulk : 0
    const neck = style === 'hoodie' ? 0.168 : 0.145
    const hemY = longCoat ? 1.36 : (style === 'tee' || style === 'shirt' ? 1.99 : 1.93)
    const width = 0.343 + thickness
    const depth = 0.215 + thickness
    const gap = open ? (style === 'coat' ? 0.95 : 0.68) : 0
    const fabric = material(garment.color, puff ? 0.65 : 0.92)
    if (garment.pattern === 'check') {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 256
      const context = canvas.getContext('2d')
      if (context) {
        context.fillStyle = '#fff'
        context.fillRect(0, 0, 256, 256)
        context.fillStyle = 'rgba(35,29,26,.19)'
        for (let i = 0; i < 256; i += 64) {
          context.fillRect(i, 0, 28, 256)
          context.fillRect(0, i, 256, 28)
        }
        context.strokeStyle = 'rgba(45,30,15,.47)'
        context.lineWidth = 3
        for (let i = 0; i < 256; i += 64) {
          context.beginPath(); context.moveTo(i + 41, 0); context.lineTo(i + 41, 256); context.stroke()
          context.beginPath(); context.moveTo(0, i + 41); context.lineTo(256, i + 41); context.stroke()
        }
        const texture = new THREE.CanvasTexture(canvas)
        texture.colorSpace = THREE.SRGBColorSpace
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping
        texture.repeat.set(2, 2)
        fabric.map = texture
      }
    }
    const softEdge = lighter(garment.color, 0.06)
    const rings: Ring[] = [[3.025, neck + thickness * 0.4, 0.13 + thickness], [2.998, 0.235 + thickness * 0.6, 0.153 + thickness], [2.95, 0.35 + thickness, 0.19 + thickness], [2.867, 0.433 + thickness, 0.218 + thickness], [2.70, 0.417 + thickness, 0.228 + thickness], [2.47, 0.382 + thickness, 0.222 + thickness], [2.24, 0.347 + thickness, depth], [2.01, width, depth]]
    if (longCoat) {
      // A coat hangs outside the combined volume of both trouser legs; simply
      // extending the waist ellipse would let wide trousers poke through it.
      rings[rings.length - 1] = [2.01, width + 0.024, depth + 0.035]
      rings.push([1.7, width + 0.06, depth + 0.055], [hemY, width + 0.075, depth + 0.065])
    }
    else rings.push([hemY, width, depth])
    mesh(shell(rings, gap, puff ? 0.003 : 0.006), fabric, group)
    ellipseSeam(hemY + 0.015, longCoat ? width + 0.075 : width, longCoat ? depth + 0.065 : depth, softEdge, gap, group)
    if (!hasCollar && style !== 'hoodie') ellipseSeam(3.02, neck + thickness * 0.4, 0.134 + thickness, darker(garment.color, 0.76), gap, group)
    for (const side of [-1, 1]) {
      const sleeveRadius = (shortSleeve ? 0.139 : 0.134) + thickness * 0.72
      const sleeve: SweepPoint[] = [
        [side * (0.30 + thickness * 0.3), 2.893, 0, 0.065 + thickness * 0.5, 0.10 + thickness],
        [side * (0.429 + thickness * 0.35), 2.79, 0.003, sleeveRadius, 0.148 + thickness],
      ]
      if (shortSleeve) sleeve.push(
        [side * 0.487, 2.62, 0.013, 0.133 + thickness * 0.7, 0.14 + thickness],
        [side * 0.517, 2.505, 0.02, 0.127 + thickness * 0.7, 0.132 + thickness],
      )
      else sleeve.push(
        [side * 0.503, 2.55, 0.016, 0.123 + thickness * 0.8, 0.132 + thickness],
        [side * 0.556, 2.30, 0.038, 0.108 + thickness * 0.8, 0.115 + thickness],
        [side * 0.589, 2.07, 0.066, 0.105 + thickness * 0.75, 0.108 + thickness],
        [side * 0.613, 1.82, 0.093, 0.080 + thickness * 0.6, 0.082 + thickness * 0.7],
        [side * 0.615, 1.765, 0.10, 0.079 + thickness * 0.6, 0.080 + thickness * 0.7],
      )
      mesh(sweep(sleeve, puff ? 0.004 : 0.003), fabric, group)
      if (hasCollar && (!layer || isLayer)) {
        // Folded collar/lapel faces catch the key light at a different angle.
        const lapelMaterial = material(lighter(garment.color, 0.06))
        const outer = isLayer ? 0.30 : 0.25
        panel(longCoat
          ? [[side * 0.10, 3.025, 0.15 + thickness], [side * outer, 2.91, 0.23 + thickness], [side * 0.15, 2.61, 0.26 + thickness], [side * 0.125, 2.85, 0.255 + thickness]]
          : [[side * 0.097, 3.035, 0.13 + thickness], [side * outer, 2.95, 0.20 + thickness], [side * 0.179, open ? 2.70 : 2.83, 0.25 + thickness], [side * 0.09, 2.89, 0.23 + thickness]], lapelMaterial, group)
      }
      if (open) {
        const angle = Math.PI / 2 + side * gap / 2
        seam([[Math.cos(angle) * (neck + thickness * 0.4), 3.02, 0.14 + thickness], [Math.cos(angle) * (0.43 + thickness), 2.7, Math.sin(angle) * (0.237 + thickness)], [Math.cos(angle) * (longCoat ? width + 0.024 : width), 2.01, Math.sin(angle) * (longCoat ? depth + 0.035 : depth)], [Math.cos(angle) * (longCoat ? width + 0.075 : width), hemY, Math.sin(angle) * (longCoat ? depth + 0.065 : depth)]], darker(garment.color, 0.72), 0.004, group)
      }
    }
    if (puff) {
      for (let y = 2.12; y < 2.84; y += 0.145) ellipseSeam(y, (y > 2.5 ? 0.426 : 0.37) + thickness, 0.236 + thickness, darker(garment.color, 0.70), gap, group)
    }
    if (style === 'hoodie') {
      ellipsoid([0, 2.96, -0.16 - thickness], [0.22, 0.245, 0.16], fabric, group)
      ellipseSeam(3.025, 0.172, 0.15, darker(garment.color), 0, group)
      for (const side of [-1, 1]) seam([[side * 0.105, 2.99, 0.145], [side * 0.102, 2.79, 0.255], [side * 0.09, 2.64, 0.25]], '#b7afa2', 0.006, group)
      panel([[-0.21, 2.28, depth + 0.007], [0.21, 2.28, depth + 0.007], [0.24, 2.06, depth + 0.007], [-0.24, 2.06, depth + 0.007]], material(lighter(garment.color, 0.035)), group)
      seam([[-0.21, 2.28, depth + 0.012], [-0.24, 2.06, depth + 0.012], [0.24, 2.06, depth + 0.012], [0.21, 2.28, depth + 0.012]], darker(garment.color, 0.8), 0.003, group)
    }
    if (style === 'shirt' || style === 'overshirt') {
      const x = open ? -0.14 : 0
      if (!open) seam([[0, 2.87, 0.221], [0, 2.60, 0.241], [0, 2.28, depth + 0.006], [0, hemY, depth + 0.006]], softEdge, 0.009, group)
      for (let y = 2.12; y < 2.85; y += 0.15) ellipsoid([x, y, (y > 2.5 ? 0.241 : depth + 0.008) + thickness * 0.5], [0.011, 0.011, 0.005], material('#d4cabb', 0.55), group)
      seam([[0.18, 2.67, 0.22 + thickness], [0.30, 2.67, 0.198 + thickness], [0.29, 2.48, 0.204 + thickness], [0.18, 2.47, 0.227 + thickness], [0.18, 2.67, 0.22 + thickness]], darker(garment.color, 0.83), 0.003, group)
    }
    if (longCoat) {
      for (const side of [-1, 1]) {
        seam([[side * 0.20, 2.02, depth - 0.025], [side * 0.30, 1.91, depth - 0.055]], darker(garment.color, 0.67), 0.012, group)
        for (const y of [2.23, 1.95]) ellipsoid([side * 0.205, y, depth - 0.016], [0.02, 0.02, 0.009], material(darker(garment.color, 0.50)), group)
      }
    }
    if (garment.pattern === 'graphic') {
      const mark = material(lighter(garment.color, 0.72))
      panel([[-0.105, 2.72, 0.24], [0.105, 2.72, 0.24], [0.105, 2.65, 0.244], [-0.105, 2.65, 0.244]], mark, group)
      panel([[-0.073, 2.62, 0.246], [0.073, 2.62, 0.246], [0.073, 2.59, 0.246], [-0.073, 2.59, 0.246]], mark, group)
    }
  }

  if (top) dress(top, false)
  if (layer) dress(layer, true)

  if (shoes) {
    const canvas = shoes.style === 'canvas'
    const slipon = shoes.style === 'slipons'
    const upper = material(shoes.color, 0.83)
    const sole = material(shoes.id === 'adidas-black' ? '#202321' : '#e1ded3', 0.86)
    const detail = material(darker(shoes.color, 0.60))
    for (const side of [-1, 1]) {
      const group = new THREE.Group()
      group.position.set(side * 0.193, 0, 0.07)
      group.rotation.y = side * 0.075
      figure.add(group)
      mesh(shoeHull(true), sole, group)
      mesh(shoeHull(), upper, group)
      if (canvas) {
        const toe = mesh(shoeHull(false, true), sole, group)
        toe.position.y = 0.002
        toe.scale.x = 1.005
        toe.castShadow = false
      }
      seam([[-0.095, 0.068, 0.145], [-0.098, 0.068, -0.025], [0, 0.068, -0.168], [0.098, 0.068, -0.025], [0.095, 0.068, 0.145]], '#b8b6ad', 0.002, group)
      if (!slipon) {
        for (let i = 0; i < 4; i++) {
          const z = -0.038 + i * 0.034
          const y = [0.224, 0.218, 0.205, 0.188][i]
          seam([[-0.041, y - 0.007, z], [0, y + 0.003, z + 0.01], [0.041, y - 0.007, z]], '#e3dfd6', 0.004, group)
        }
        const stripeColor = new THREE.Color(shoes.color).getHSL({ h: 0, s: 0, l: 0 }).l > 0.5 ? '#292d29' : '#e7e1d3'
        for (const edge of [-1, 1]) {
          if (shoes.pattern === 'stripes') {
            for (let i = 0; i < 3; i++) seam([[edge * 0.102, 0.085, -0.016 + i * 0.041], [edge * 0.098, 0.148, 0.01 + i * 0.041]], stripeColor, 0.01, group)
          } else panel([[edge * 0.105, 0.1, -0.069], [edge * 0.105, 0.143, -0.044], [edge * 0.105, 0.12, 0.101], [edge * 0.105, 0.106, 0.111]], detail, group)
        }
      } else {
        seam([[-0.071, 0.178, -0.02], [0, 0.224, -0.01], [0.071, 0.178, -0.02]], darker(shoes.color, 0.82), 0.003, group)
      }
    }
  }
  return figure
}

interface Stage {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  model?: THREE.Group
  render: () => void
}

export default function Mannequin({ garments, selection, rotation, zoom, onUnavailable }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const stage = useRef<Stage | null>(null)
  const unavailable = useRef(onUnavailable)
  useEffect(() => { unavailable.current = onUnavailable }, [onUnavailable])

  useEffect(() => {
    const container = host.current
    if (!container) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
    } catch {
      unavailable.current?.()
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0xffffff, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.16
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    const canvas = renderer.domElement
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', 'Interactive stylised outfit mannequin. Use the rotate and zoom controls to change the view.')
    container.appendChild(canvas)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30)
    camera.position.set(0, 2.04, 6.7)
    const controls = new OrbitControls(camera, canvas)
    controls.target.set(0, 1.84, 0)
    controls.enableDamping = false
    controls.enablePan = false
    controls.enableZoom = false
    controls.minPolarAngle = Math.PI * 0.36
    controls.maxPolarAngle = Math.PI * 0.57
    controls.rotateSpeed = 0.55
    controls.update()
    scene.add(new THREE.HemisphereLight('#fffaf2', '#bcbeb8', 2.4))
    const key = new THREE.DirectionalLight('#fffaf0', 3.1)
    key.position.set(-3.8, 7, 5)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.left = -2
    key.shadow.camera.right = 2
    key.shadow.camera.top = 4
    key.shadow.camera.bottom = -2
    key.shadow.normalBias = 0.025
    key.shadow.bias = -0.0002
    key.shadow.radius = 6
    scene.add(key)
    const fill = new THREE.DirectionalLight('#e8edff', 1.1)
    fill.position.set(3, 3, 3)
    scene.add(fill)
    const rim = new THREE.DirectionalLight('#ffffff', 2.0)
    rim.position.set(2, 4, -3)
    scene.add(rim)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ color: '#61594d', opacity: 0.085 }))
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.01
    floor.receiveShadow = true
    scene.add(floor)
    let disposed = false
    let failed = false
    let frame = 0
    const fail = () => {
      if (!failed && !disposed) {
        failed = true
        unavailable.current?.()
      }
    }
    const render = () => {
      if (disposed || failed || frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        if (disposed || failed) return
        try { renderer.render(scene, camera) } catch { fail() }
      })
    }
    const onLost = (event: Event) => { event.preventDefault(); fail() }
    canvas.addEventListener('webglcontextlost', onLost)
    controls.addEventListener('change', render)
    const resize = () => {
      const width = container.clientWidth
      const height = container.clientHeight
      if (!width || !height) return
      camera.aspect = width / height
      // In narrow containers, pull back enough to retain the hands and sleeves.
      camera.fov = width / height < 0.56 ? 40 : 34
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      render()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    stage.current = { scene, camera, renderer, controls, render }
    resize()
    return () => {
      disposed = true
      stage.current = null
      observer.disconnect()
      if (frame) window.cancelAnimationFrame(frame)
      controls.removeEventListener('change', render)
      controls.dispose()
      canvas.removeEventListener('webglcontextlost', onLost)
      disposeTree(scene)
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    }
  }, [])

  useEffect(() => {
    const current = stage.current
    if (!current) return
    if (current.model) {
      current.scene.remove(current.model)
      disposeTree(current.model)
    }
    try {
      const model = makeMannequin(garments, selection)
      model.rotation.y = rotation * Math.PI / 180 - 0.12
      current.model = model
      current.scene.add(model)
      const names = (Object.keys(selection) as (keyof Selection)[]).map((slot) => garments.find((garment) => garment.id === selection[slot])?.name).filter(Boolean)
      current.renderer.domElement.setAttribute('aria-label', `Stylised mannequin wearing ${names.join(', ') || 'no selected garments'}. Use the rotate and zoom controls to change the view.`)
      current.render()
    } catch {
      unavailable.current?.()
    }
  }, [garments, selection])

  useEffect(() => {
    const current = stage.current
    if (!current) return
    if (current.model) current.model.rotation.y = rotation * Math.PI / 180 - 0.12
    current.camera.zoom = Math.min(1.3, Math.max(0.8, zoom))
    current.camera.updateProjectionMatrix()
    current.render()
  }, [rotation, zoom])

  return <div ref={host} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }} />
}
