import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })
const output = 'docs/artwork/garments-3d/review'
await mkdir(output, { recursive: true })
try {
  const page = await browser.newPage({ viewport: { width: 600, height: 1000 } })
  const errors = [], requests = new Set()
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => { if (request.url().includes('/models/garments/')) requests.add(request.url().split('/').pop()) })
  await page.goto(process.env.FIT_PICKER_URL || 'http://127.0.0.1:5173/')
  await page.getByRole('button', { name: '3D preview', exact: true }).click()
  const canvas = page.locator('canvas')
  await expect(canvas).toHaveAttribute('data-model-format', 'gltf', { timeout: 30000 })
  const pick = async (tab, id) => {
    await page.getByRole('button', { name: tab, exact: true }).click()
    const card = page.locator(`[data-garment-id="${id}"]`)
    const name = await card.locator('.garment-name').innerText()
    await card.click()
    await expect(canvas).toHaveAttribute('aria-label', new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), { timeout: 30000 })
  }
  await page.getByRole('combobox', { name: 'Selected outerwear', exact: true }).selectOption('')
  for (const id of ['rust-tee', 'ainu-longsleeve', 'navy-sweatshirt', 'white-hoodie', 'navy-shirt', 'brown-flannel']) {
    await pick('Tops', id)
    await page.locator('.mannequin-area').screenshot({ path: `${output}/${id}.png` })
  }
  for (const id of ['beige-shorts', 'grey-slacks', 'beige-trousers', 'olive-wide', 'white-barrel', 'black-ankle']) {
    await pick('Bottoms', id)
    await page.locator('.mannequin-area').screenshot({ path: `${output}/${id}.png` })
  }
  await pick('Bottoms', 'grey-slacks')
  for (const id of ['brown-overshirt', 'teal-shirt', 'navy-bomber', 'black-puffer', 'beige-coat', 'black-rain-jacket']) {
    for (const top of ['navy-shirt', 'white-hoodie', 'navy-sweatshirt']) {
      await pick('Tops', top)
      const selector = page.getByRole('combobox', { name: 'Selected outerwear', exact: true })
      const name = await selector.locator(`option[value="${id}"]`).innerText()
      await selector.selectOption(id)
      await expect(canvas).toHaveAttribute('aria-label', new RegExp(name), { timeout: 30000 })
      await page.locator('.mannequin-area').screenshot({ path: `${output}/${id}-${top}.png` })
    }
  }
  await pick('Tops', 'navy-shirt')
  await page.getByRole('combobox', { name: 'Selected outerwear', exact: true }).selectOption('beige-coat')
  await expect(canvas).toHaveAttribute('aria-label', /Beige single-breasted coat/)
  for (const view of ['side', 'back']) {
    for (let turn = 0; turn < 3; turn++) await page.getByRole('button', { name: 'Rotate right', exact: true }).click()
    await page.locator('.mannequin-area').screenshot({ path: `${output}/coat-${view}.png` })
  }
  await page.getByRole('button', { name: 'Reset view', exact: true }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForLoadState('networkidle')
  const frame = await canvas.getAttribute('data-rendered-frames')
  await page.waitForTimeout(1200)
  expect(await canvas.getAttribute('data-rendered-frames')).toBe(frame)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(requests.size).toBe(18)
  expect(errors).toEqual([])
  const metrics = await canvas.evaluate(canvas => ({ renderedFrames: canvas.dataset.renderedFrames, triangles: canvas.dataset.triangles, drawCalls: canvas.dataset.drawCalls, width: canvas.width, height: canvas.height }))
  await writeFile('docs/artwork/garments-3d/browser-verification.json', JSON.stringify({ testedAt: new Date().toISOString(), url: process.env.FIT_PICKER_URL || 'http://127.0.0.1:5173/', garmentFiles: [...requests].sort(), layerCombinations: 18, idleRenders: 0, phone: metrics, errors }, null, 2) + '\n')
  console.log('PASS: all 18 compressed garment constructions, 18 layer combinations, side/back views, phone width and no idle render loop; no page errors.')
} finally { await browser.close() }
