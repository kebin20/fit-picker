import {chromium,expect} from '@playwright/test'
const browser=await chromium.launch()
const url=process.env.FIT_PICKER_URL||'http://127.0.0.1:5174/'
try{
 const context=await browser.newContext({viewport:{width:390,height:844}})
 const page=await context.newPage()
 let portraitsBlocked=true,navyBlocked=true,guidesBlocked=true
 await page.route('**/outfits/**',route=>portraitsBlocked?route.abort():route.continue())
 await page.route('**/garments/navy-shirt.webp',route=>navyBlocked?route.abort():route.continue())
 await page.route('**/guide-previews/aw-core.webp',route=>guidesBlocked?route.abort():route.continue())
 await page.goto(url)
 await expect(page.locator('.preview-panel .outfit-canvas__photo-unavailable')).toBeVisible()
 const card=page.locator('.outfit-card').first()
 await card.scrollIntoViewIfNeeded()
 await expect(card.locator('.outfit-flat-preview')).toBeVisible()
 portraitsBlocked=false;navyBlocked=false
 await context.setOffline(true);await context.setOffline(false)
 await expect(card.locator('.outfit-photograph')).toBeVisible()
 await expect.poll(()=>card.locator('.outfit-photograph').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true)
 await expect(page.locator('.preview-panel .outfit-canvas__photo-unavailable')).toHaveCount(0)
 await expect.poll(()=>page.locator('.outfit-canvas__top').first().evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true)
 await page.getByRole('button',{name:'View style guides',exact:true}).click()
 await expect(page.locator('.guide-load-fallback')).toBeVisible()
 guidesBlocked=false
 await context.setOffline(true);await context.setOffline(false)
 await expect(page.locator('.guide-load-fallback')).toHaveCount(0)
 await expect.poll(()=>page.locator('.source-guides img').first().evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true)
 console.log('PASS image recovery: selected garment, deferred portrait and guide preview recover after a real offline/online transition without reload.')
}finally{await browser.close()}
