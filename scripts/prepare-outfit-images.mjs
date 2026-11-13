// Lossless geometry/size preservation; encode generated PNGs as efficient WebP.
// Usage: node scripts/prepare-outfit-images.mjs /absolute/path/to/input.json
// Input: [{ "id": "styled-autumn-01", "path": "/path/to/generated.png" }]
import { chromium } from '@playwright/test'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const input = JSON.parse(await readFile(process.argv[2], 'utf8'))
await mkdir('public/outfits', { recursive: true })
await mkdir('docs/artwork/outfits', { recursive: true })
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  for (const entry of input) {
    if (!/^styled-(autumn|winter|spring|summer)-\d+$/.test(entry.id)) throw new Error('Invalid outfit ID')
    await copyFile(entry.path, `docs/artwork/outfits/${entry.id}.png`)
    await page.goto(pathToFileURL(path.resolve(entry.path)).href)
    const encoded = await page.evaluate(async () => {
      const image = document.querySelector('img')
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      canvas.getContext('2d').drawImage(image, 0, 0)
      return { width: canvas.width, height: canvas.height, data: canvas.toDataURL('image/webp', .94).split(',')[1] }
    })
    if (encoded.width < 1000 || encoded.height < 1000) throw new Error(`Image too small: ${entry.id}`)
    const output = `public/outfits/${entry.id}.webp`
    await writeFile(output, Buffer.from(encoded.data, 'base64'))
    console.log(`${entry.id}: ${encoded.width}×${encoded.height}, full-size WebP saved`)
  }
} finally { await browser.close() }
