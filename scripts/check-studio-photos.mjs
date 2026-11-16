import { chromium, webkit, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const url = process.env.FIT_PICKER_URL || 'http://127.0.0.1:5175/'
await mkdir('docs/mockups', { recursive: true })
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch()
  try {
    for (const width of [320, 390, 820, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } })
      const errors = [], requests = []
      page.on('pageerror', e => errors.push(e.message))
      page.on('request', r => requests.push(r.url()))
      await page.goto(url)
      await expect(page.getByRole('button', { name: 'Model photos', exact: true })).toHaveAttribute('aria-pressed', 'true')
      const photo = page.locator('.preview-panel .studio-photo')
      await photo.locator('img').evaluate(img => img.decode())
      for (const angle of ['front', 'side', 'back']) {
        await page.getByRole('group', { name: 'Photo angle', exact: true }).getByRole('button', { name: `${angle} view`, exact: false }).click()
        await expect(photo).toHaveAttribute('data-angle', angle)
        expect(await photo.evaluate(el => {
          const frame = el.querySelector('.studio-photo__frame').getBoundingClientRect()
          const area = el.closest('.mannequin-area').getBoundingClientRect()
          const img = el.querySelector('img').getBoundingClientRect()
          return frame.bottom <= area.bottom && frame.top >= area.top && Math.abs(img.height - frame.height) < 1 && Math.abs(img.width - frame.width * 3) < 1
        })).toBe(true)
      }
      expect(requests.some(u => /\/models\/|\/draco\/|\/assets\/Mannequin-/.test(u))).toBe(false)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (engine === 'chromium' && [390, 820].includes(width)) {
        await page.getByRole('group', { name: 'Photo angle' }).getByRole('button', { name: 'Front view', exact: true }).click()
        await page.locator('.preview-panel').screenshot({ path: `docs/mockups/studio-photo-${width}.png`, style: '.mobile-nav { visibility: hidden !important; }' })
      }
      await page.locator('[data-garment-id="ukiyoe-tee"]').click()
      await page.getByRole('combobox', { name: 'Selected outerwear', exact: true }).selectOption('black-puffer')
      await page.getByRole('button', { name: 'Bottoms', exact: true }).click()
      await page.locator('[data-garment-id="beige-shorts"]').click()
      await expect(photo).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Model photos', exact: true })).toBeDisabled()
      await expect(page.locator('.preview-panel .outfit-canvas')).toBeVisible()
      await expect(page.locator('.preview-panel .drag-hint')).toContainText('No model photo for this combination')
      await page.locator('.app-version').scrollIntoViewIfNeeded()
      const version = await page.locator('.app-version').boundingBox()
      const nav = await page.locator('.mobile-nav').boundingBox()
      if (nav && nav.height > 0) expect(version.y + version.height).toBeLessThanOrEqual(nav.y)
      expect(errors).toEqual([])
      await page.close()
      console.log(`PASS ${engine}/${width}px: three full photo angles, no initial 3D downloads, custom mix fallback, footer above navigation`)
    }
    const page = await browser.newPage()
    await page.route('**/previews/navy-after-hours-quality-v1.webp', route => route.abort())
    await page.goto(url)
    await expect(page.locator('.preview-panel .outfit-canvas')).toBeVisible()
    await expect(page.locator('.preview-panel .drag-hint')).toContainText('Photo unavailable')
    await expect(page.getByRole('button', { name: 'Save look', exact: true })).toBeEnabled()
    await page.close()
  } finally { await browser.close() }
}
