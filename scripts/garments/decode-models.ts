import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import type { Mesh } from 'three'

// Build tool only: preserve the exact vertex/primitive ordering used by the app.
export async function decodedGarments() {
  const catalogue = await (await fetch('/models/garments/catalogue.json')).json()
  const decoder = new DRACOLoader().setDecoderPath('/draco/').setWorkerLimit(2)
  const loader = new GLTFLoader().setDRACOLoader(decoder)
  const wanted = ['tee', 'longsleeve', 'sweatshirt', 'hoodie', 'shirt-short', 'shirt-long', 'overshirt-short', 'overshirt-long', 'bomber', 'puffer', 'rain-jacket', 'coat']
  const result: Record<string, unknown> = {}
  try {
    for (const family of wanted) {
      const asset = catalogue.assets.find((a: { family: string }) => a.family === family)
      if (!asset) throw new Error(`Missing garment: ${family}`)
      const model = await loader.loadAsync(`/models/${asset.file}`)
      const primitives: { positions: number[]; indices: number[] }[] = []
      model.scene.traverse(object => {
        const mesh = object as Mesh
        if (!mesh.isMesh) return
        const p = mesh.geometry.getAttribute('position'), index = mesh.geometry.getIndex()!
        primitives.push({ positions: Array.from(p.array), indices: Array.from(index.array) })
      })
      result[family] = { sha256: asset.sha256, primitives }
    }
    return result
  } finally { decoder.dispose() }
}
