import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

await mkdir('public/guide-previews', { recursive: true })
for (const id of ['aw-core', 'aw-updated', 'ss']) {
  await sharp(`src/assets/guides/${id}.png`).resize({ width: 640 }).webp({ quality: 84 }).toFile(`public/guide-previews/${id}.webp`)
}
console.log('Three small guide previews prepared; full-size originals unchanged')
