import { spawn } from 'node:child_process'
import { access, readFile, writeFile, copyFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const candidates = [process.env.FIT_PICKER_BLENDER, '/Applications/Blender.app/Contents/MacOS/Blender', '/private/tmp/fit-picker-blender/Blender.app/Contents/MacOS/Blender'].filter(Boolean)
let blender
for (const file of candidates) { try { await access(file); blender = file; break } catch {} }
const args = process.argv.slice(2)
const run = (binary, args) => new Promise((resolve, reject) => {
  const child = spawn(binary, args, { stdio: 'inherit' })
  child.once('error', reject)
  child.once('exit', code => code === 0 ? resolve() : reject(new Error(`Asset build exited ${code}`)))
})
const native = (script, args = []) => run(blender, ['--background', '--factory-startup', '--python-exit-code', '1', '--python', `scripts/garments/${script}`, '--', ...args])
if (!args.includes('--verify-only')) {
  if (!blender) throw new Error('Set FIT_PICKER_BLENDER to a Blender 4.5 LTS executable. This is an offline asset build; the app does not need Blender.')
  await native('build_models.py', args)
  await native('build_coverage.py')
  await run(process.execPath, ['scripts/garments/decode-models.mjs'])
  await native('build_layer_coverage.py')
}
const catalogue = JSON.parse(await readFile('public/models/garments/catalogue.json', 'utf8'))
if (catalogue.assets.length !== 18 || !catalogue.bodyPositionSha256) throw new Error('The complete 18-family library and verified body coverage are required.')
for (const asset of catalogue.assets) {
  const bytes = await readFile(`public/models/${asset.file}`)
  if (bytes.length !== asset.bytes || createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new Error(`Asset does not match its record: ${asset.family}`)
  if (asset.normalMapSize < 256 || asset.clothFrames < 24 || !asset.bodyCoverage || asset.bodyVertexCount !== 14517) throw new Error(`Draft or incomplete garment: ${asset.family}`)
  if (bytes.length > 650_000 || asset.triangles > 11_000) throw new Error(`Garment exceeds the phone asset budget: ${asset.family}`)
}
const baseFile = 'public/models/manifest.json'
const manifest = JSON.parse(await readFile(baseFile, 'utf8'))
manifest.assets = [...manifest.assets.filter(asset => !asset.file.startsWith('garments/')), ...catalogue.assets]
manifest.garmentBuild = { generator: catalogue.generator, catalogue: 'garments/catalogue.json', staticClothBake: true, runtimeSimulation: false, families: catalogue.assets.length }
await writeFile(baseFile, JSON.stringify(manifest, null, 2) + '\n')
await copyFile('public/models/garments/catalogue.json', 'src/data/garment-model-manifest.json')
console.log(`Verified ${catalogue.assets.length} baked garment models and updated the provenance manifest.`)
