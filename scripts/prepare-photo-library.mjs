// Generate responsive, static card images from locally retained ImageGen masters.
// Run after generation; --available encodes only masters currently on disk.
import sharp from 'sharp'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import {wardrobeData} from './lib/wardrobe-data.mjs'

const partial = process.argv.includes('--available')
const original = JSON.parse(await readFile('docs/artwork/outfits/prompts.json', 'utf8'))
const library = JSON.parse(await readFile('docs/artwork/outfits/library-prompts.json', 'utf8')).entries
const previous = JSON.parse(await readFile('src/data/outfit-photo-manifest.json', 'utf8'))
const {garments,outfits,seasonalOutfits,outfitAppearance}=await wardrobeData()
const looks=new Map([...outfits,...seasonalOutfits].map(o=>[o.id,o]))
const manifest = {}
for (const width of [400, 800]) await mkdir(`public/outfits/${width}`, { recursive: true })
let encoded = 0
for (const entry of [...original, ...library]) {
  if(previous[entry.id]?.revision){manifest[entry.id]=previous[entry.id];continue}
  let source
  try { source = await stat(entry.original) }
  catch (error) { if (partial && error.code === 'ENOENT') continue; throw error }
  const targets = [
    { file: `public/outfits/${entry.id}.webp`, width: 1024, quality: 86 },
    { file: `public/outfits/400/${entry.id}.webp`, width: 400, quality: 80 },
    { file: `public/outfits/800/${entry.id}.webp`, width: 800, quality: 84 },
  ]
  for (const target of targets) {
    const current = await stat(target.file).catch(() => null)
    if (current && current.mtimeMs >= source.mtimeMs) continue
    await sharp(entry.original).rotate().resize({ width: target.width, withoutEnlargement: true }).webp({ quality: target.quality }).toFile(target.file)
    encoded++
  }
  const dimensions = await sharp(targets[0].file).metadata()
  manifest[entry.id] = { width: dimensions.width, height: dimensions.height, appearance: previous[entry.id]?.appearance || outfitAppearance(looks.get(entry.id),garments) }
}
await writeFile('src/data/outfit-photo-manifest.json', JSON.stringify(manifest, null, 2) + '\n')
console.log(`${Object.keys(manifest).length} model photographs ready; ${encoded} WebP files encoded`)
