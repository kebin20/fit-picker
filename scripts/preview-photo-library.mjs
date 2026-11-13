import sharp from 'sharp'
import { mkdir, readFile } from 'node:fs/promises'

const ids = Object.keys(JSON.parse(await readFile('src/data/outfit-photo-manifest.json', 'utf8')))
await mkdir('docs/artwork/outfits/contact-sheets', { recursive: true })
for (let offset = 0; offset < ids.length; offset += 42) {
  const subset = ids.slice(offset, offset + 42)
  const composites = await Promise.all(subset.map(async (id, index) => {
    const photo = await sharp(`public/outfits/400/${id}.webp`).resize(160, 240, { fit: 'contain', background: '#f2f0e9' }).png().toBuffer()
    const label = Buffer.from(`<svg width="160" height="24" xmlns="http://www.w3.org/2000/svg"><rect width="160" height="24" fill="#f8f8f2"/><text x="5" y="15" font-family="sans-serif" font-size="9" fill="#263d32">${id}</text></svg>`)
    const left = (index % 6) * 160, top = Math.floor(index / 6) * 264
    return [{ input: photo, left, top }, { input: label, left, top: top + 240 }]
  }))
  await sharp({ create: { width: 960, height: Math.ceil(subset.length / 6) * 264, channels: 3, background: '#f2f0e9' } })
    .composite(composites.flat()).webp({ quality: 88 }).toFile(`docs/artwork/outfits/contact-sheets/library-${String(offset / 42 + 1).padStart(2, '0')}.webp`)
}
console.log(`${ids.length} portraits previewed across ${Math.ceil(ids.length / 42)} contact sheets`)
