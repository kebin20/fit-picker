import { chromium, expect } from '@playwright/test'
import { mkdir, readFile } from 'node:fs/promises'

const baseURL = process.env.FIT_PICKER_URL || 'http://127.0.0.1:5173/'
await mkdir('docs/mockups', { recursive: true })
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })
const errors = []
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } })
page.setDefaultTimeout(30000)
page.on('pageerror', error => errors.push(error.message))
try {
  await page.goto(baseURL)
  console.log('Opened prototype; checking the default 2D outfit.')
  await expect(page.locator('.preview-panel .outfit-canvas')).toBeVisible()
  await expect(page.getByRole('button', { name: '2D outfit', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.stage-word')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Flat lay', exact: true })).toHaveCount(0)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(500)
  await expect(page.getByRole('heading', { name: /A good day starts/ })).toBeVisible()
  await expect(page.getByText('A LITTLE MORE YOU.', { exact: true })).toHaveCount(0)
  await expect(page.locator('.season-dot')).toHaveCount(0)
  await expect(page.locator('.recommendation-section>.context-bar')).toHaveCount(1)
  await expect(page.locator('main>.context-bar')).toHaveCount(0)
  const filterPosition = await page.evaluate(() => ({ filters: document.querySelector('.context-bar').getBoundingClientRect().top, builder: document.querySelector('.studio-grid').getBoundingClientRect().bottom, heading: document.querySelector('.recommendation-section h2').getBoundingClientRect().bottom }))
  if (filterPosition.filters <= filterPosition.builder || filterPosition.filters <= filterPosition.heading) throw new Error('Recommendation filters appear above the builder or recommendation heading')
  const selectedBeforeFilters = await page.locator('.preview-panel .outfit-canvas img').evaluateAll(images => images.map(image => image.src))
  const builderPieceCount = await page.locator('.garment-card').count()
  await page.getByRole('combobox', { name: 'Season', exact: true }).selectOption('Winter')
  await page.getByRole('button', { name: 'Outdoors', exact: true }).click()
  await expect(page.locator('.outfit-card')).toHaveCount(6)
  const winterIdeas = Number.parseInt(await page.locator('.outlined-count').innerText())
  if (winterIdeas < 24) throw new Error('Too few winter outdoor combinations')
  expect(await page.locator('.preview-panel .outfit-canvas img').evaluateAll(images => images.map(image => image.src))).toEqual(selectedBeforeFilters)
  await expect(page.locator('.garment-card')).toHaveCount(builderPieceCount)
  await page.getByRole('combobox', { name: 'Season', exact: true }).selectOption('Autumn')
  await page.getByRole('button', { name: 'Everyday', exact: true }).click()
  await page.getByRole('button', { name: '3D preview', exact: true }).click()
  await expect(page.locator('canvas')).toHaveAttribute('data-model-format', 'gltf', { timeout: 30000 })
  await page.getByRole('button', { name: 'Rotate right', exact: true }).click()
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await page.getByRole('button', { name: 'Reset view', exact: true }).click()
  await expect(page.locator('canvas')).toHaveAttribute('data-model-format', 'gltf', { timeout: 30000 })
  await page.locator('.preview-panel').screenshot({ path: 'docs/mockups/gltf-avatar.png' })
  await page.getByRole('button', { name: '2D outfit', exact: true }).click()
  await expect(page.locator('.preview-panel .outfit-canvas')).toBeVisible()
  for (const category of ['Tops', 'Layers', 'Bottoms', 'Shoes']) {
    await page.getByRole('button', { name: category, exact: true }).click()
    const card = page.locator('.garment-card').nth(category === 'Layers' ? 1 : 0)
    await card.click()
    await expect(card).toHaveAttribute('aria-pressed', 'true')
  }
  console.log('Clothing slots work; checking local saved looks.')
  await page.getByRole('button', { name: 'Save look', exact: true }).click()
  await page.getByRole('textbox', { name: 'Look name' }).fill('Browser check outfit')
  await page.getByRole('button', { name: 'Save this look', exact: true }).click()
  await page.getByRole('button', { name: /Saved looks/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Browser check outfit', exact: true })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: /Saved looks/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Browser check outfit', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Delete Browser check outfit' }).click()
  await expect(page.getByRole('heading', { name: 'Your favourites belong here.' })).toBeVisible()

  await page.getByRole('button', { name: 'My wardrobe', exact: true }).first().click()
  await page.getByRole('button', { name: 'Tops', exact: true }).click()
  await page.getByRole('textbox', { name: 'Search wardrobe' }).fill('rust')
  await expect(page.locator('.wardrobe-item')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Rust tee', exact: true })).toBeVisible()
  await page.getByRole('textbox', { name: 'Search wardrobe' }).fill('')
  await expect(page.getByRole('heading', { name: 'Grey sweatshirt', exact: true })).toHaveCount(0)
  await page.getByRole('checkbox', { name: 'Show suggested pieces' }).check()
  await expect(page.getByRole('heading', { name: 'Grey sweatshirt', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'View style guides', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.locator('.source-guides a')).toHaveCount(3)
  const guideImages = await page.locator('.source-guides img').evaluateAll(async images => Promise.all(images.map(async image => {
    await image.decode()
    return { width: image.naturalWidth, height: image.naturalHeight }
  })))
  if (guideImages.some(image => image.width < 1000 || image.height < 1000)) throw new Error('A source guide did not decode at full size')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()

  await page.getByRole('button', { name: 'Outfit studio', exact: true }).first().click()
  await page.getByRole('combobox', { name: 'Season', exact: true }).selectOption('Summer')
  await page.getByRole('button', { name: 'Dinner', exact: true }).click()
  await expect(page.locator('.outfit-card').first()).toBeVisible()
  await page.getByRole('button', { name: 'Try this look', exact: true }).first().click()
  await expect(page.locator('.current-look p')).toContainText('Summer · Styled from your wardrobe')
  await page.getByRole('button', { name: 'Undo last change', exact: true }).click()

  for (const season of ['Autumn', 'Winter', 'Spring', 'Summer']) {
    await page.getByRole('combobox', { name: 'Season', exact: true }).selectOption(season)
    await page.getByRole('button', { name: 'Everyday', exact: true }).click()
    await expect(page.locator('.outfit-card')).toHaveCount(6)
    await expect(page.locator('.outfit-photograph')).toHaveCount(3)
    const decoded = await page.locator('.outfit-photograph').evaluateAll(async images => Promise.all(images.map(async image => {
      image.loading = 'eager'
      await image.decode()
      return { src: image.currentSrc, width: image.naturalWidth, height: image.naturalHeight }
    })))
    if (decoded.some(image => image.width < 1000 || image.height < 1000)) throw new Error(`Small or broken styling image in ${season}`)
    console.log(`${season}: expanded combinations and original styling images verified`)
  }
  await page.getByRole('button', { name: /Show 6 more looks/ }).click()
  await expect(page.locator('.outfit-card')).toHaveCount(12)
  await page.getByRole('button', { name: 'From your guides', exact: true }).click()
  await expect(page.locator('.outfit-flat-preview').first()).toBeVisible()
  await expect(page.locator('.outfit-photograph')).toHaveCount(0)
  await page.getByRole('button', { name: 'Try this look', exact: true }).first().click()
  await expect(page.locator('.current-look p')).toContainText('Spring / Summer')

  const garmentBriefs = JSON.parse(await readFile('docs/artwork/garments/catalogue-briefs.json', 'utf8'))
  const garmentIds = garmentBriefs.atlases.flatMap(atlas => atlas.cells.filter(cell => cell.id).map(cell => cell.id))
  const garmentSizes = await page.evaluate(async ids => Promise.all(ids.map(async id => {
    const image = new Image()
    image.src = `/garments/${id}.webp`
    await image.decode()
    return { id, width: image.naturalWidth, height: image.naturalHeight }
  })), garmentIds)
  if (garmentSizes.length !== 51 || garmentSizes.some(image => image.width < 100 || image.height < 100)) throw new Error('Missing or low-resolution garment photo')
  console.log('All 51 photographic garment assets decoded')

  // Restore the clean default for comparable, reproducible mockups.
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.locator('.preview-panel .outfit-canvas')).toBeVisible()
  for (const [name, width, height] of [['desktop', 1440, 1080], ['tablet', 820, 1180], ['mobile', 390, 844]]) {
    await page.setViewportSize({ width, height })
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    await page.waitForTimeout(350)
    await page.locator('.outfit-photograph').evaluateAll(async images => Promise.all(images.map(async image => { image.loading = 'eager'; await image.decode() })))
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    if (overflow) throw new Error(`Horizontal overflow at ${width}px`)
    await page.screenshot({ path: `docs/mockups/${name}.png`, fullPage: true })
    console.log(`${name}: ${width}×${height}, no horizontal overflow, mockup captured`)
  }
  for (const width of [360, 700, 701, 768, 960, 1024, 1920]) {
    await page.setViewportSize({ width, height: 1000 })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    if (overflow) throw new Error(`Horizontal overflow at breakpoint ${width}px`)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('button', { name: 'My wardrobe', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Search wardrobe' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('button', { name: 'Outfit studio', exact: true }).click()
  await expect(page.locator('.preview-panel')).toBeVisible()

  // Simulate a device without WebGL; the outfit remains usable in flat view.
  const fallback = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await fallback.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      if (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl') return null
      return getContext.call(this, kind, ...args)
    }
  })
  await fallback.goto(baseURL)
  await expect(fallback.locator('.preview-panel .outfit-canvas')).toBeVisible()
  await fallback.getByRole('button', { name: '3D preview', exact: true }).click()
  await expect(fallback.getByRole('button', { name: '2D outfit', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(fallback.getByRole('button', { name: '3D preview', exact: true })).toBeDisabled()
  await expect(fallback.getByRole('button', { name: 'Save look', exact: true })).toBeEnabled()
  await fallback.close()
  const brokenImage = await browser.newPage()
  await brokenImage.route('**/outfits/*.webp', route => route.abort())
  await brokenImage.goto(baseURL)
  await brokenImage.locator('.recommendation-section').scrollIntoViewIfNeeded()
  await expect(brokenImage.locator('.outfit-flat-preview')).toHaveCount(6)
  await expect(brokenImage.locator('.outfit-photograph')).toHaveCount(0)
  await brokenImage.close()
  const missingModel = await browser.newPage()
  await missingModel.route('**/models/*.glb', route => route.abort())
  await missingModel.goto(baseURL)
  await missingModel.getByRole('button', { name: '3D preview', exact: true }).click()
  await expect(missingModel.getByRole('button', { name: '3D preview', exact: true })).toBeDisabled()
  await expect(missingModel.locator('.preview-panel .outfit-canvas')).toBeVisible()
  await missingModel.close()
  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`)
  console.log('PASS: default 2D outfit, loaded glTF assets and 3D controls, scoped recommendation filters, 96 additional outfits, 51 garment photos, all clothing slots, save/reload/delete, search, ownership, decoded source guides, 12 high-resolution seasonal images, original guide overview, try/undo, mobile navigation, responsive breakpoints, WebGL and image-error fallbacks; no page errors.')
} finally { await browser.close() }
