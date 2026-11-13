// Extract individual transparent product assets from the generated atlas masters.
// Usage: node scripts/prepare-garment-atlases.mjs /absolute/path/to/inputs.json
// Input: [{"id":"tops-a","path":"/absolute/path/to/generated.png"}, ...]
import { chromium } from '@playwright/test'
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const manifest = JSON.parse(await readFile('docs/artwork/garments/catalogue-briefs.json', 'utf8'))
const inputs = JSON.parse(await readFile(process.argv[2], 'utf8'))
await mkdir('public/garments', { recursive: true })
await mkdir('docs/artwork/garments', { recursive: true })
const browser = await chromium.launch()
const output = []
try {
  const page = await browser.newPage()
  for (const input of inputs) {
    const atlas = manifest.atlases.find(item => item.id === input.id)
    if (!atlas) throw new Error(`Unknown atlas: ${input.id}`)
    await copyFile(input.path, `docs/artwork/garments/${atlas.id}-master.png`)
    await page.goto(pathToFileURL(path.resolve(input.path)).href)
    const images = await page.evaluate(async atlas => {
      const image = document.querySelector('img')
      await image.decode()
      const width = image.naturalWidth / atlas.columns
      const height = image.naturalHeight / atlas.rows
      if (Math.abs(width / height - 1) > .03) throw new Error(`Wrong atlas aspect: ${image.naturalWidth}×${image.naturalHeight}`)
      if (width < 250) throw new Error('Atlas resolution is too low for garment cards')
      return atlas.cells.filter(cell => cell.id).map(cell => {
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(width)
        canvas.height = Math.round(height)
        const context = canvas.getContext('2d', { willReadFrequently: true })
        context.drawImage(image, (cell.column - 1) * width, (cell.row - 1) * height, width, height, 0, 0, canvas.width, canvas.height)
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        const pixels = imageData.data
        // The generator may leave isolated matte flecks outside the products.
        // Retain the garment's connected silhouette, or both silhouettes for a
        // shoe pair, rather than carrying those stray pixels into every card.
        const visited = new Uint8Array(canvas.width * canvas.height)
        const components = []
        for (let start = 0; start < visited.length; start++) {
          if (visited[start] || pixels[start * 4 + 3] <= 24) continue
          const queue = [start]; visited[start] = 1
          for (let index = 0; index < queue.length; index++) {
            const at = queue[index], x = at % canvas.width, y = Math.floor(at / canvas.width)
            const neighbors = [x > 0 ? at - 1 : -1, x < canvas.width - 1 ? at + 1 : -1, y > 0 ? at - canvas.width : -1, y < canvas.height - 1 ? at + canvas.width : -1]
            for (const neighbor of neighbors) if (neighbor >= 0 && !visited[neighbor] && pixels[neighbor * 4 + 3] > 24) { visited[neighbor] = 1; queue.push(neighbor) }
          }
          components.push(queue)
        }
        components.sort((a, b) => b.length - a.length)
        const shoePair = /adidas|skechers|converse/.test(cell.id)
        const retained = new Uint8Array(visited.length)
        for (const component of components.slice(0, shoePair ? 2 : 1)) for (const pixel of component) retained[pixel] = 1
        for (let pixel = 0; pixel < retained.length; pixel++) if (!retained[pixel]) pixels[pixel * 4 + 3] = 0
        context.putImageData(imageData, 0, 0)
        let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1, opaque = 0
        for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
          if (pixels[(y * canvas.width + x) * 4 + 3] > 24) {
            minX = Math.min(minX, x); minY = Math.min(minY, y)
            maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); opaque++
          }
        }
        if (maxX < 0 || opaque < width * height * .015) throw new Error(`Missing garment: ${cell.id}`)
        if (opaque > width * height * .88) throw new Error(`Background is not transparent: ${cell.id}`)
        const pad = Math.max(12, Math.round(Math.max(maxX - minX, maxY - minY) * .05))
        const left = Math.max(0, minX - pad), top = Math.max(0, minY - pad)
        const right = Math.min(canvas.width, maxX + pad + 1), bottom = Math.min(canvas.height, maxY + pad + 1)
        const trimmed = document.createElement('canvas')
        trimmed.width = right - left; trimmed.height = bottom - top
        trimmed.getContext('2d').drawImage(canvas, left, top, trimmed.width, trimmed.height, 0, 0, trimmed.width, trimmed.height)
        return { id: cell.id, width: trimmed.width, height: trimmed.height, data: trimmed.toDataURL('image/webp', .96).split(',')[1] }
      })
    }, atlas)
    for (const image of images) {
      await writeFile(`public/garments/${image.id}.webp`, Buffer.from(image.data, 'base64'))
      output.push({ id: image.id, width: image.width, height: image.height, atlas: atlas.id })
    }
    console.log(`${atlas.id}: ${images.length} transparent garment photographs extracted`)
  }
  await writeFile('docs/artwork/garments/image-sizes.json', JSON.stringify(output, null, 2) + '\n')
} finally { await browser.close() }
