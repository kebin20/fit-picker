import { chromium, expect } from '@playwright/test'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })
try {
  const page = await browser.newPage({ viewport: { width: 787, height: 826 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(process.env.FIT_PICKER_URL || 'http://127.0.0.1:5173/')
  await page.getByRole('combobox', { name: 'Selected outerwear', exact: true }).selectOption('beige-coat')
  await page.getByRole('button', { name: '3D preview', exact: true }).click()
  await expect(page.locator('canvas')).toHaveAttribute('aria-label', /Beige single-breasted coat/, { timeout: 30000 })
  await page.locator('.preview-panel').screenshot({ path: 'docs/mockups/gltf-coat.png' })
  await page.getByRole('combobox', { name: 'Selected outerwear', exact: true }).selectOption('black-puffer')
  await expect(page.locator('canvas')).toHaveAttribute('aria-label', /Black GU puffer/, { timeout: 30000 })
  await page.getByRole('button', { name: '2D outfit', exact: true }).click()
  await page.getByRole('button', { name: 'From your guides', exact: true }).click()
  const photo = page.locator('.outfit-photograph').first()
  await photo.scrollIntoViewIfNeeded()
  await expect(photo).toHaveAttribute('src', /outfits/)
  await photo.evaluate(image => image.decode())
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'My wardrobe', exact: true }).click()
  await page.getByRole('button', { name: 'Shoes', exact: true }).click()
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  const padding = await page.getByRole('combobox', { name: 'Wardrobe season', exact: true }).evaluate(select => getComputedStyle(select).paddingRight)
  expect(parseInt(padding)).toBeGreaterThanOrEqual(30)
  await page.locator('.garment-photograph[src]').evaluateAll(images => Promise.all(images.map(image => image.decode())))
  await page.screenshot({ path: 'docs/mockups/wardrobe.png' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(pathToFileURL(path.resolve('docs/mockups/preview.html')).href)
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())))
  await page.screenshot({ path: 'docs/mockups/responsive-overview.png', fullPage: true })
  console.log('PASS: coat/puffer switching, guide model photo, padded dropdown and tablet navigation; detail mockups refreshed.')
} finally { await browser.close() }
