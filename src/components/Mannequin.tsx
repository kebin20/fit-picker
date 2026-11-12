import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Garment, Selection } from '../types'

interface Props {
  garments: Garment[]
  selection: Selection
  rotation: number
  zoom: number
  onUnavailable?: () => void
}

type Ring = [y: number, width: number, depth: number]
type Point = [number, number, number]

// Elliptical sections give the clothing a tailored silhouette without loading
// heavyweight models. The front of the figure faces positive Z.
function shell(rings: Ring[], gap = 0) {
  const segments = 64
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  for (let row = 0; row < rings.length; row++) {
    const [y, width, depth] = rings[row]
    for (let col = 0; col <= segments; col++) {
      const angle = Math.PI / 2 + gap / 2 + (col / segments) * (Math.PI * 2 - gap)
      positions.push(Math.cos(angle) * width, y, Math.sin(angle) * depth)
      uvs.push(col / segments, row / (rings.length - 1))
    }
  }
  for (let row = 0; row < rings.length - 1; row++) {
    for (let col = 0; col < segments; col++) {
      const a = row * (segments + 1) + col
      const b = a + segments + 1
      indices.push(a, a + 1, b, b, a + 1, b + 1)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
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
  const skin = new THREE.MeshStandardMaterial({ color: '#c8bda9', roughness: 0.77, metalness: 0.02 })

  const material = (color: string, roughness = 0.92) => {
    const surface = new THREE.MeshStandardMaterial({ color, roughness, side: THREE.DoubleSide })
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
  const segment = (from: Point, to: Point, radiusTop: number, radiusBottom: number, surface: THREE.Material, parent: THREE.Object3D = figure) => {
    const start = new THREE.Vector3(...from)
    const end = new THREE.Vector3(...to)
    const object = mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, start.distanceTo(end), 32), surface, parent)
    object.position.copy(start).add(end).multiplyScalar(0.5)
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), start.sub(end).normalize())
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
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3))
    geometry.setIndex([0, 1, 2, 0, 2, 3])
    geometry.computeVertexNormals()
    const object = mesh(geometry, surface, parent)
    object.castShadow = false
    return object
  }

  // The sculpted mannequin stays neutral so the wardrobe remains the focus.
  ellipsoid([0, 3.36, 0.015], [0.205, 0.29, 0.205], skin)
  ellipsoid([0, 3.22, 0.036], [0.158, 0.16, 0.167], skin)
  segment([0, 3.17, 0], [0, 2.96, 0], 0.097, 0.125, skin)
  mesh(shell([[3.01, 0.16, 0.12], [2.92, 0.435, 0.19], [2.71, 0.44, 0.21], [2.35, 0.32, 0.17], [1.95, 0.30, 0.175]]), skin)
  mesh(shell([[2.0, 0.30, 0.175], [1.81, 0.35, 0.20], [1.65, 0.30, 0.16]]), skin)
  for (const side of [-1, 1]) {
    ellipsoid([side * 0.415, 2.80, 0], [0.13, 0.13, 0.14], skin)
    segment([side * 0.45, 2.82, 0], [side * 0.56, 2.25, 0.015], 0.118, 0.087, skin)
    ellipsoid([side * 0.56, 2.25, 0.015], [0.087, 0.092, 0.09], skin)
    segment([side * 0.56, 2.25, 0.015], [side * 0.63, 1.72, 0.075], 0.086, 0.059, skin)
    const hand = ellipsoid([side * 0.633, 1.585, 0.087], [0.071, 0.137, 0.081], skin)
    hand.rotation.z = side * 0.08
    ellipsoid([side * 0.581, 1.61, 0.136], [0.032, 0.073, 0.038], skin)
    segment([side * 0.174, 1.78, 0], [side * 0.183, 0.91, 0.005], 0.175, 0.116, skin)
    segment([side * 0.183, 0.95, 0.005], [side * 0.183, 0.19, 0.02], 0.12, 0.067, skin)
    ellipsoid([side * 0.183, 0.12, 0.115], [0.09, 0.075, 0.198], skin)
  }

  if (bottoms) {
    const fabric = material(bottoms.color)
    const stitching = darker(bottoms.color, 0.73)
    const shorts = bottoms.style === 'shorts'
    const wide = /barrel|wide|chef/i.test(bottoms.name)
    const ankle = /ankle/i.test(bottoms.name)
    mesh(shell([[2.01, 0.319, 0.188], [1.92, 0.359, 0.213], [1.73, 0.366, 0.22], [1.59, 0.307, 0.191]]), fabric)
    ellipseSeam(2.012, 0.322, 0.192, stitching)
    ellipseSeam(1.961, 0.348, 0.207, stitching)
    for (const side of [-1, 1]) {
      const leg = mesh(shell(shorts
        ? [[1.83, 0.19, 0.21], [1.55, 0.187, 0.197], [1.29, 0.174, 0.177]]
        : wide
          ? [[1.83, 0.196, 0.214], [1.5, 0.208, 0.215], [1.05, 0.203, 0.201], [0.77, 0.188, 0.187], [0.33, 0.16, 0.167], [0.245, 0.158, 0.167]]
          : [[1.83, 0.188, 0.214], [1.5, 0.181, 0.196], [1.05, 0.151, 0.166], [0.77, 0.137, 0.151], [0.36, 0.123, 0.132], [ankle ? 0.34 : 0.245, 0.123, 0.132]]), fabric)
      leg.position.x = side * 0.186
      const hem = shorts ? 1.3 : ankle ? 0.35 : 0.265
      ellipseSeam(hem, shorts ? 0.175 : wide ? 0.16 : 0.124, shorts ? 0.18 : wide ? 0.169 : 0.134, stitching, 0, leg)
      if (!shorts) seam([[side * 0.30, 1.7, 0.143], [side * 0.30, 1.05, 0.118], [side * 0.28, 0.29, 0.095]], stitching, 0.0025)
      seam([[side * 0.30, 1.92, 0.152], [side * 0.252, 1.80, 0.205], [side * 0.232, 1.76, 0.206]], stitching)
      // Small waistband belt loops read as tailoring without adding logos.
      segment([side * 0.19, 2.015, 0.163], [side * 0.19, 1.947, 0.188], 0.012, 0.012, fabric)
    }
    seam([[0, 1.96, 0.213], [0.012, 1.85, 0.223], [0, 1.73, 0.224]], stitching)
    ellipsoid([0, 1.981, 0.204], [0.014, 0.014, 0.008], material('#8e877c', 0.45))
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
    const thickness = isLayer ? (puff ? 0.062 : 0.035) : 0
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
    const edge = material(darker(garment.color, 0.76))
    const softEdge = lighter(garment.color, 0.06)
    const rings: Ring[] = [[3.02, neck + thickness * 0.4, 0.13 + thickness], [2.955, 0.38 + thickness, 0.19 + thickness], [2.87, 0.465 + thickness, 0.224 + thickness], [2.64, 0.425 + thickness, 0.235 + thickness], [2.28, 0.352 + thickness, depth], [2.01, width, depth]]
    if (longCoat) {
      // A coat hangs outside the combined volume of both trouser legs; simply
      // extending the waist ellipse would let wide trousers poke through it.
      rings[rings.length - 1] = [2.01, width + 0.024, depth + 0.035]
      rings.push([1.7, width + 0.06, depth + 0.055], [hemY, width + 0.075, depth + 0.065])
    }
    else rings.push([hemY, width, depth])
    mesh(shell(rings, gap), fabric, group)
    ellipseSeam(hemY + 0.015, longCoat ? width + 0.075 : width, longCoat ? depth + 0.065 : depth, softEdge, gap, group)
    if (!hasCollar && style !== 'hoodie') ellipseSeam(3.02, neck + thickness * 0.4, 0.134 + thickness, darker(garment.color, 0.76), gap, group)
    for (const side of [-1, 1]) {
      const shoulder: Point = [side * (0.447 + thickness * 0.4), 2.864, 0]
      const elbow: Point = [side * 0.563, 2.25, 0.015]
      const end: Point = shortSleeve ? [side * 0.51, 2.53, 0.006] : [side * 0.63, 1.74, 0.073]
      const sleeveRadius = (shortSleeve ? 0.146 : 0.14) + thickness * 0.55
      ellipsoid([side * (0.432 + thickness * 0.4), 2.827, 0], [sleeveRadius + 0.018, 0.112 + thickness * 0.3, 0.15 + thickness], fabric, group)
      if (shortSleeve) {
        segment(shoulder, end, sleeveRadius, 0.136, fabric, group)
        segment([end[0], end[1] + 0.022, end[2]], end, 0.138, 0.138, edge, group)
      } else {
        segment(shoulder, elbow, sleeveRadius, 0.112 + thickness, fabric, group)
        ellipsoid(elbow, [0.112 + thickness, 0.12, 0.116 + thickness], fabric, group)
        segment(elbow, end, 0.111 + thickness, 0.081 + thickness * 0.6, fabric, group)
        segment([side * 0.623, 1.81, 0.065], end, 0.083 + thickness * 0.6, 0.079 + thickness * 0.6, edge, group)
      }
      if (hasCollar) {
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
      const base = mesh(new THREE.CapsuleGeometry(0.108, 0.225, 8, 28), sole, group)
      base.rotation.x = Math.PI / 2
      base.position.set(0, 0.06, 0.055)
      base.scale.set(1.02, 1, 0.39)
      ellipsoid([0, 0.112, 0.035], [0.104, 0.088, 0.213], upper, group)
      ellipsoid([0, 0.153, -0.067], [0.096, canvas ? 0.10 : 0.084, 0.101], upper, group)
      if (canvas) ellipsoid([0, 0.112, 0.174], [0.10, 0.061, 0.077], sole, group)
      seam([[-0.095, 0.091, 0.14], [-0.103, 0.088, -0.03], [0, 0.09, -0.158], [0.103, 0.088, -0.03], [0.095, 0.091, 0.14]], '#b8b6ad', 0.003, group)
      if (!slipon) {
        for (let i = 0; i < 4; i++) {
          const z = -0.038 + i * 0.034
          seam([[-0.045, 0.195 - i * 0.01, z], [0, 0.20 - i * 0.01, z + 0.013], [0.045, 0.195 - i * 0.01, z]], '#e3dfd6', 0.006, group)
        }
        const stripeColor = new THREE.Color(shoes.color).getHSL({ h: 0, s: 0, l: 0 }).l > 0.5 ? '#292d29' : '#e7e1d3'
        for (const edge of [-1, 1]) {
          if (shoes.pattern === 'stripes') {
            for (let i = 0; i < 3; i++) seam([[edge * 0.102, 0.085, -0.016 + i * 0.041], [edge * 0.098, 0.148, 0.01 + i * 0.041]], stripeColor, 0.01, group)
          } else panel([[edge * 0.105, 0.1, -0.069], [edge * 0.105, 0.143, -0.044], [edge * 0.105, 0.12, 0.101], [edge * 0.105, 0.106, 0.111]], detail, group)
        }
      } else {
        seam([[-0.071, 0.159, 0.0], [0, 0.195, 0.022], [0.071, 0.159, 0.0]], darker(shoes.color, 0.72), 0.005, group)
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
    scene.add(new THREE.HemisphereLight('#fff8eb', '#c6c0b1', 2.8))
    const key = new THREE.DirectionalLight('#fff7e7', 3.6)
    key.position.set(-3.5, 6, 4)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.left = -2
    key.shadow.camera.right = 2
    key.shadow.camera.top = 4
    key.shadow.camera.bottom = -2
    key.shadow.normalBias = 0.025
    key.shadow.bias = -0.0002
    key.shadow.radius = 4
    scene.add(key)
    const fill = new THREE.DirectionalLight('#e8edff', 1.1)
    fill.position.set(3, 3, 3)
    scene.add(fill)
    const rim = new THREE.DirectionalLight('#ffffff', 2.0)
    rim.position.set(2, 4, -3)
    scene.add(rim)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ color: '#61594d', opacity: 0.13 }))
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
