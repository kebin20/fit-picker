// Loads CC0 data only. This app does not import CharacterCreator's GPL code.
import { chromium } from '@playwright/test'
import { mkdir, writeFile, readFile } from 'node:fs/promises'

const commit = '852e48f316b90a0937234886630e4fb4cdfd1f78'
const files = ['base_body.glb', 'hair_short02.glb', 'clothing_tshirt.glb', 'clothing_shirt.glb', 'clothing_hoodie.glb', 'clothing_jeans.glb', 'clothing_shorts.glb', 'clothing_shoes.glb', 'clothing_jacket.glb', 'clothing_trenchcoat.glb', 'clothing_briefs.glb']
await mkdir('.cache/avatar-source', { recursive: true })
await mkdir('public/models', { recursive: true })
for (const file of [...files, 'clothing.json', 'asset_licenses.json']) {
  try { await readFile(`.cache/avatar-source/${file}`) } catch {
    const response = await fetch(`https://raw.githubusercontent.com/kblood/CharacterCreator/${commit}/output/${file}`)
    if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`)
    await writeFile(`.cache/avatar-source/${file}`, Buffer.from(await response.arrayBuffer()))
  }
}
const browser = await chromium.launch()
const manifest = { source: `https://github.com/kblood/CharacterCreator/tree/${commit}/output`, sourceCommit: commit, license: 'CC0-1.0', build: 'Adult male morph; relaxed standing pose; static morph/skin bake; skin textures capped at 1024 px; alpha-preserving hair texture capped at 512 px; unused garment textures removed. Open overshirt derived from the fitted shirt with clean polygon clipping and baked resting folds. No upstream application code copied.', assets: [] }
try {
  const page = await browser.newPage()
  const baseURL = process.env.FIT_PICKER_URL || 'http://127.0.0.1:5173/'
  await page.route('**/__avatar_build__', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Avatar asset preparation</title>' }))
  await page.goto(new URL('__avatar_build__', baseURL).href)
  const outputs = [...files.map(file => ({ file, source: file })), { file: 'clothing_overshirt.glb', source: 'clothing_shirt.glb', variant: 'overshirt' }]
  for (const entry of outputs) {
    const file = entry.file
    const result = await page.evaluate(async entry => {
      const builder = await import('/scripts/avatar-build-client.ts')
      return builder.bakeAvatarAsset(entry.source, entry.variant)
    }, entry)
    await writeFile(`public/models/${file}`, Buffer.from(result.data, 'base64'))
    manifest.assets.push({ file, bytes: result.bytes, bounds: result.bounds, meshes: result.meshes })
    console.log(`${file}: ${result.bytes} bytes, ${result.meshes.length} meshes`)
  }
  const clothes = JSON.parse(await readFile('.cache/avatar-source/clothing.json', 'utf8'))
  await writeFile('public/models/clothing.json', JSON.stringify(clothes, null, 2) + '\n')
  await writeFile('public/models/manifest.json', JSON.stringify(manifest, null, 2) + '\n')
} finally { await browser.close() }
