import { chromium, devices, expect } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

const url = process.env.FIT_PICKER_URL || 'http://127.0.0.1:5173/'
const baseline = process.argv.includes('--baseline')
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })
try {
  const context = await browser.newContext(devices['iPhone 13'])
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
  const resources = new Map()
  cdp.on('Network.responseReceived', event => resources.set(event.requestId, { url: event.response.url, type: event.type, bytes: 0 }))
  cdp.on('Network.loadingFinished', event => { const entry = resources.get(event.requestId); if (entry) entry.bytes = event.encodedDataLength })
  const summary = () => {
    const entries = [...resources.values()].filter(entry => /^https?:/.test(entry.url))
    return { requests: entries.length, bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0), imageRequests: entries.filter(entry => entry.type === 'Image').length, imageBytes: entries.filter(entry => entry.type === 'Image').reduce((sum, entry) => sum + entry.bytes, 0) }
  }
  await page.goto(url)
  await page.waitForLoadState('networkidle')
  const startup = summary()
  const initialURLs = [...resources.values()].map(entry => entry.url)
  const deferred = {
    models: !initialURLs.some(source => source.includes('/models/') || source.includes('/assets/Mannequin-')),
    guides: !initialURLs.some(source => /\/assets\/(aw-core|aw-updated|ss)-.*\.png/.test(source)),
    outfitPhotos: !initialURLs.some(source => source.includes('/outfits/')),
  }
  if (!baseline) expect(deferred).toEqual({ models: true, guides: true, outfitPhotos: true })
  const photo = page.locator('.outfit-photograph').first()
  await photo.scrollIntoViewIfNeeded()
  await expect(photo).toHaveAttribute('src', /outfits/)
  await photo.evaluate(image => image.decode())
  const responsivePhoto = await photo.evaluate(image => image.currentSrc)
  if (!baseline) expect(responsivePhoto).toMatch(/\/outfits\/(400|800)\//)
  await page.getByRole('button', { name: '3D preview', exact: true }).click()
  await expect(page.locator('canvas')).toHaveAttribute('data-model-format', 'gltf', { timeout: 30000 })
  await page.waitForLoadState('networkidle')
  const canvas = await page.locator('canvas').evaluate(element => ({ width: element.width, height: element.height, cssWidth: element.clientWidth, cssHeight: element.clientHeight }))
  if (!baseline) expect(canvas.width / canvas.cssWidth).toBeLessThanOrEqual(1.51)
  const result = { measuredAt: new Date().toISOString(), url, coldCache: true, device: 'Chromium iPhone 13 emulation; no CPU/network throttling; software WebGL', startup, deferred, responsivePhoto, canvas, afterBrowsingAnd3D: summary() }
  const output = process.env.FIT_PICKER_METRICS
  if (output) await writeFile(output, JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify(result, null, 2))
} finally { await browser.close() }
