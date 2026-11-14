import { chromium } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  await page.route('**/__garment_build__', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Offline garment preparation</title>' }))
  await page.goto(new URL('__garment_build__', process.env.FIT_PICKER_URL || 'http://127.0.0.1:5173/').href)
  const data = await page.evaluate(async () => (await import('/scripts/garments/decode-models.ts')).decodedGarments())
  await writeFile('.cache/garment-build/layer-meshes.json', JSON.stringify(data))
  console.log('Decoded garment primitives for offline layer visibility; no WebGL rendering needed.')
} finally { await browser.close() }
