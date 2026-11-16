import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { buildAvatar, disposeAvatar } from '../lib/avatar-scene'
import type { Garment, Selection } from '../types'

interface Props { garments: Garment[]; selection: Selection; rotation: number; zoom: number; viewRevision: number; onUnavailable?: () => void }
interface Stage { scene: THREE.Scene; camera: THREE.PerspectiveCamera; controls: OrbitControls; renderer: THREE.WebGLRenderer; model?: THREE.Group; render: (afterPaint?:()=>void) => void }

export default function Mannequin({ garments, selection, rotation, zoom, viewRevision, onUnavailable }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const stage = useRef<Stage | null>(null)
  const unavailable = useRef(onUnavailable)
  const pose = useRef({ rotation, zoom })
  const [loading, setLoading] = useState(true)
  unavailable.current = onUnavailable
  pose.current = { rotation, zoom }

  useEffect(() => {
    const container = host.current
    if (!container) return
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }) }
    catch { unavailable.current?.(); return }
    const phoneQuality = () => window.matchMedia('(max-width: 700px)').matches || window.matchMedia('(pointer: coarse) and (max-height: 500px)').matches
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, phoneQuality() ? 1.5 : 2))
    renderer.setClearColor(0xffffff, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = .75
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    const canvas = renderer.domElement
    canvas.style.cssText = 'display:block;width:100%;height:100%'
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', '3D fitting preview loading')
    container.appendChild(canvas)
    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    const room = new RoomEnvironment()
    const environment = pmrem.fromScene(room, .04)
    scene.environment = environment.texture
    scene.environmentIntensity = .5
    room.dispose()
    pmrem.dispose()
    const camera = new THREE.PerspectiveCamera(32, 1, .05, 20)
    camera.position.set(0, 1.03, 3.8)
    const controls = new OrbitControls(camera, canvas)
    controls.target.set(0, .94, 0)
    controls.enablePan = false
    controls.enableZoom = false
    controls.enableDamping = false
    controls.minPolarAngle = Math.PI * .36
    controls.maxPolarAngle = Math.PI * .57
    controls.rotateSpeed = .55
    controls.update()
    controls.saveState()
    scene.add(new THREE.HemisphereLight('#ffffff', '#b8b8b2', .55))
    const key = new THREE.DirectionalLight('#fffaf4', 1.1)
    key.position.set(-3, 5, 4)
    key.castShadow = true
    const shadowSize = phoneQuality() ? 1024 : 2048
    key.shadow.mapSize.set(shadowSize, shadowSize)
    key.shadow.camera.left = -1.4
    key.shadow.camera.right = 1.4
    key.shadow.camera.top = 2.5
    key.shadow.camera.bottom = -.5
    key.shadow.normalBias = .004
    key.shadow.bias = -.0001
    scene.add(key)
    const fill = new THREE.DirectionalLight('#edf1ff', .35)
    fill.position.set(3, 2, 3)
    scene.add(fill)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.ShadowMaterial({ color: '#68745a', opacity: .16 }))
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -.008
    floor.receiveShadow = true
    scene.add(floor)
    let disposed = false, failed = false, frame = 0
    const afterPaint: (()=>void)[] = []
    const fail = () => { if (!disposed && !failed) { failed = true; unavailable.current?.() } }
    const render = (done?:()=>void) => {
      if (disposed || failed) return
      if (done) afterPaint.push(done)
      if (frame) return
      canvas.dataset.renderPending = 'true'
      frame = requestAnimationFrame(() => {
        frame = 0
        if (disposed || failed) return
        try {
          renderer.render(scene, camera)
          canvas.dataset.renderedFrames = String(renderer.info.render.frame)
          canvas.dataset.triangles = String(renderer.info.render.triangles)
          canvas.dataset.drawCalls = String(renderer.info.render.calls)
          canvas.dataset.textures = String(renderer.info.memory.textures)
          canvas.dataset.renderPending = 'false'
          afterPaint.splice(0).forEach(done=>done())
        } catch { canvas.dataset.renderPending='false';fail() }
      })
    }
    const lost = (event: Event) => { event.preventDefault(); fail() }
    canvas.addEventListener('webglcontextlost', lost)
    const controlsChanged=()=>render()
    controls.addEventListener('change', controlsChanged)
    const resize = () => {
      const width = container.clientWidth, height = container.clientHeight
      if (!width || !height) return
      const phone = phoneQuality()
      const ratio = Math.min(devicePixelRatio || 1, phone ? 1.5 : 2)
      if (renderer.getPixelRatio() !== ratio) renderer.setPixelRatio(ratio)
      const shadowResolution = phone ? 1024 : 2048
      if (key.shadow.mapSize.x !== shadowResolution) {
        key.shadow.map?.dispose()
        key.shadow.map = null
        key.shadow.mapSize.set(shadowResolution, shadowResolution)
        key.shadow.needsUpdate = true
      }
      canvas.dataset.shadowResolution = String(shadowResolution)
      camera.aspect = width / height
      camera.fov = width / height < .6 ? 37 : 32
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      render()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    stage.current = { scene, camera, controls, renderer, render }
    resize()
    return () => {
      disposed = true
      stage.current = null
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
      afterPaint.length=0
      controls.removeEventListener('change', controlsChanged)
      controls.dispose()
      canvas.removeEventListener('webglcontextlost', lost)
      if (scene.children.length) scene.children.forEach(child => { if (child !== floor && child.type === 'Group') disposeAvatar(child) })
      floor.geometry.dispose(); floor.material.dispose(); environment.dispose(); key.shadow.map?.dispose()
      renderer.dispose(); renderer.forceContextLoss(); canvas.remove()
    }
  }, [])

  useEffect(() => {
    const current = stage.current
    if (!current) return
    let cancelled = false
    setLoading(true)
    buildAvatar(garments, selection).then(model => {
      if (cancelled || stage.current !== current) { disposeAvatar(model); return }
      if (current.model) { current.scene.remove(current.model); disposeAvatar(current.model) }
      model.rotation.y = pose.current.rotation * Math.PI / 180
      current.model = model
      current.scene.add(model)
      const names = Object.values(selection).map(id => garments.find(piece => piece.id === id)?.name).filter(Boolean)
      current.renderer.domElement.setAttribute('aria-label', `Loaded glTF avatar wearing ${names.join(', ')}. Use the rotate and zoom controls to change the view.`)
      current.renderer.domElement.dataset.modelFormat = 'gltf'
      current.renderer.domElement.dataset.modelRevision = String(model.userData.revision)
      current.renderer.domElement.dataset.loadedModels = String(model.userData.files.length)
      current.renderer.domElement.dataset.garmentPrints = model.userData.prints.join(',')
      current.renderer.domElement.dataset.chestPockets = String(model.userData.chestPockets)
      current.render(()=>{if(!cancelled&&stage.current===current)setLoading(false)})
    }).catch(error => { if (!cancelled) { console.warn('Fitted avatar could not load', error); unavailable.current?.() } })
    return () => { cancelled = true }
  }, [garments, selection])

  useEffect(() => {
    const current = stage.current
    if (!current) return
    if (current.model) current.model.rotation.y = rotation * Math.PI / 180
    current.camera.zoom = Math.min(1.3, Math.max(.8, zoom))
    current.camera.updateProjectionMatrix()
    current.render()
  }, [rotation, zoom])

  useEffect(() => {
    const current = stage.current
    if (!current) return
    current.controls.reset()
    current.camera.zoom = pose.current.zoom
    current.camera.updateProjectionMatrix()
    current.render()
  }, [viewRevision])

  return <div className="gltf-avatar" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}><div ref={host} style={{ position: 'absolute', inset: 0 }}/>{loading && <div className="avatar-loading" role="status"><span className="avatar-loading-dot"/>Fitting your selected pieces…</div>}</div>
}
