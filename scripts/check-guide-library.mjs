import { chromium, expect, webkit } from '@playwright/test'
import { wardrobeData } from './lib/wardrobe-data.mjs'

const url = process.env.FIT_PICKER_URL || 'http://127.0.0.1:5175/'
const { garments, outfits, curatedOutfitIds } = await wardrobeData()
const wardrobe = new Map(garments.map(piece => [piece.id, piece]))
const seasons = ['Autumn', 'Winter', 'Spring', 'Summer']

function ownedInSeason(look, season) {
  return look.seasons.includes(season) && Object.values(look.items).every(id => {
    const piece = wardrobe.get(id)
    return piece?.ownership === 'confirmed' && piece.seasons.includes(season)
  })
}

async function revealAll(page) {
  const cards = page.locator('.recommendation-section .outfit-card')
  const total = Number.parseInt(await page.locator('.recommendation-section .outlined-count').innerText(), 10)
  expect(Number.isInteger(total)).toBe(true)
  const more = page.getByRole('button', { name: /Show \d+ more looks/ })
  for (let shown = 6; shown < total; shown += 6) {
    await more.click()
    await expect(cards).toHaveCount(Math.min(shown + 6, total))
  }
  await expect(more).toHaveCount(0)
  await expect(cards).toHaveCount(total)
  return cards.evaluateAll(looks => looks.map(look => look.dataset.outfitId))
}

const layouts = [
  { engine: webkit, width: 390, height: 844, navigation: 'Mobile navigation' },
  { engine: chromium, width: 820, height: 1180, navigation: 'Main navigation' },
]

for (const { engine, width, height, navigation } of layouts) {
  const browser = await engine.launch()
  try {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const cards = page.locator('.recommendation-section .outfit-card')
    const seasonFilter = page.getByRole('combobox', { name: 'Season', exact: true })
    const guideOccasion = page.getByRole('combobox', { name: 'Guide occasion', exact: true })
    const firstPiece = page.getByRole('combobox', { name: 'First piece', exact: true })
    const guidesTab = page.getByRole('button', { name: 'From your guides', exact: true })
    const curatedTab = page.getByRole('button', { name: /^Curated picks\b/ })
    const guideHeading = page.getByRole('heading', { name: 'Outfits from your guides', exact: true })

    await page.goto(url)
    await seasonFilter.selectOption('Winter')
    await page.getByRole('group', { name: 'Outfit recommendation filters' }).getByRole('button', { name: 'Outdoors', exact: true }).click()
    const curatedIds = await revealAll(page)
    expect(curatedIds.length).toBeGreaterThan(0)
    expect(curatedIds.every(id => curatedOutfitIds.includes(id))).toBe(true)
    expect(curatedIds).not.toContain('aw-winter-1')

    // Opening from outside the studio should close the dialog and bring the
    // destination heading into view without altering the chosen season.
    await page.getByRole('navigation', { name: navigation }).getByRole('button', { name: 'My wardrobe', exact: true }).click()
    await page.getByRole('button', { name: 'View style guides', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Browse guide outfits', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    await expect(guidesTab).toHaveAttribute('aria-pressed', 'true')
    await expect(guideHeading).toBeFocused()
    await expect(guideHeading).toBeInViewport()
    await expect(seasonFilter).toHaveValue('Winter')
    await expect(guideOccasion.locator('option:checked')).toHaveText('All occasions')

    for (const season of seasons) {
      await seasonFilter.selectOption(season)
      // Load more must reset when the season changes, even after reaching the
      // end of the preceding season's listing.
      await expect(cards).toHaveCount(6)
      const ids = await revealAll(page)
      const sourceIds = outfits.filter(look => ownedInSeason(look, season)).map(look => look.id)
      const quickIdeas = season === 'Autumn' ? ['aw-quick-1', 'aw-quick-2', 'aw-quick-3', 'aw-quick-4'] : []
      expect(ids.sort(), season).toEqual([...sourceIds, ...quickIdeas].sort())
      for (const id of quickIdeas) {
        const portrait = cards.and(page.locator(`[data-outfit-id="${id}"]`)).locator('.outfit-photograph')
        await portrait.scrollIntoViewIfNeeded()
        await expect(portrait).toHaveAttribute('src', /\/outfits\//)
        await portrait.evaluate(image => image.decode())
      }
    }

    await guideOccasion.selectOption({ label: 'Dinner' })
    const dinnerIds = await revealAll(page)
    const summerDinners = outfits.filter(look => ownedInSeason(look, 'Summer') && look.occasions.includes('Dinner'))
    expect(dinnerIds.sort()).toEqual(summerDinners.map(look => look.id).sort())
    const brownAndBeige = cards.filter({ has: page.getByRole('heading', { name: 'Brown & beige', exact: true }) })
    await brownAndBeige.getByRole('button', { name: 'Try this look', exact: true }).click()
    await expect(page.locator('.current-look h2')).toHaveText('Brown & beige')
    await expect(page.locator('.selection-strip')).toContainText('Brown short-sleeve shirt')
    await expect(page.locator('.selection-strip')).toContainText('Beige trousers')

    await curatedTab.click()
    const summerCurated = await revealAll(page)
    expect(summerCurated.length).toBeGreaterThan(0)
    expect(summerCurated.every(id => curatedOutfitIds.includes(id))).toBe(true)
    expect(summerCurated).not.toContain('ss-s3')
    await guidesTab.click()
    await expect(guideHeading).toBeVisible()

    await guideOccasion.selectOption({ label: 'All occasions' })
    await seasonFilter.selectOption('Autumn')
    await firstPiece.selectOption('brown-flannel')
    await expect(guidesTab).toHaveAttribute('aria-pressed', 'true')
    expect((await revealAll(page)).sort()).toEqual(['aw-autumn-2', 'aw-core-1', 'aw-core-6', 'aw-quick-4'])

    const nav = page.getByRole('navigation', { name: navigation })
    await nav.getByRole('button', { name: 'My wardrobe', exact: true }).click()
    await page.getByRole('textbox', { name: 'Search wardrobe' }).fill('Solid brown flannel shirt')
    await page.locator('.wardrobe-item[data-garment-id="brown-flannel"]').getByRole('button', { name: 'In laundry / unavailable', exact: true }).click()
    await nav.getByRole('button', { name: 'Outfit studio', exact: true }).click()
    await expect(guideHeading).toBeVisible()
    await expect(firstPiece).toHaveValue('brown-flannel')
    await expect(cards).toHaveCount(0)
    await page.getByRole('button', { name: 'Clear pieces', exact: true }).click()
    const availableIds = await revealAll(page)
    expect(availableIds.length).toBeGreaterThan(0)
    expect(availableIds.filter(id => ['aw-autumn-2', 'aw-core-1', 'aw-core-6', 'aw-quick-4'].includes(id))).toEqual([])

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(errors).toEqual([])
    console.log(`PASS ${engine.name()}/${width}px: full guide library across four seasons, pagination, modal focus, applying a guide outfit, and occasion, piece and laundry filters`)
  } finally {
    await browser.close()
  }
}
