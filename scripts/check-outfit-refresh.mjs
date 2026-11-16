import {chromium,expect} from '@playwright/test'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {wardrobeData} from './lib/wardrobe-data.mjs'
const url=process.env.FIT_PICKER_URL||'http://127.0.0.1:5174/'
const dir=process.env.FIT_PICKER_REPORT_DIR||'docs/artwork/outfits/wardrobe-refresh'
const brief=JSON.parse(await readFile('docs/artwork/outfits/wardrobe-refresh/prompts.json','utf8'))
const {garments,outfits,seasonalOutfits,outfitSummary}=await wardrobeData()
const all=[...seasonalOutfits,...outfits],owned=new Set(garments.filter(g=>g.ownership==='confirmed').map(g=>g.id))
const active=all.filter(o=>Object.values(o.items).every(id=>owned.has(id)))
const browser=await chromium.launch()
const errors=[],requests=[],checked=[]
const page=await browser.newPage({viewport:{width:1176,height:826}})
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()))
await mkdir(dir,{recursive:true})
try{
 await page.goto(url)
 await expect(page.locator('.preview-panel .outfit-canvas')).toBeVisible()
 expect(requests.some(r=>/\/models\/|\/prints\/|Mannequin-|\/draco\//.test(r))).toBe(false)
 for(const season of ['Autumn','Winter','Spring','Summer']){
  await page.getByRole('combobox',{name:'Season',exact:true}).selectOption(season)
  const targets=brief.entries.filter(entry=>all.find(o=>o.id===entry.id).seasons.includes(season))
  for(const entry of targets){
   const selector=`.outfit-card[data-outfit-id="${entry.id}"]`
   while(!await page.locator(selector).count()){
    const more=page.getByRole('button',{name:/Show \d+ more looks/})
    await expect(more).toBeVisible();await more.click()
   }
   const card=page.locator(selector),photo=card.locator('.outfit-photograph')
   await photo.scrollIntoViewIfNeeded()
   await expect.poll(()=>photo.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true)
   expect(await photo.evaluate(img=>img.currentSrc)).toContain(`${entry.id}-wardrobe-v2.webp`)
   await expect(card.locator('.outfit-content>p').first()).toHaveText(outfitSummary(all.find(o=>o.id===entry.id),garments))
   if(!checked.includes(entry.id))checked.push(entry.id)
  }
  const shown=await page.locator('.outfit-card').evaluateAll(cards=>cards.map(c=>c.dataset.outfitId))
  expect(shown.every(id=>active.some(o=>o.id===id))).toBe(true)
 }
 expect(checked.sort()).toEqual(brief.entries.map(e=>e.id).sort())
 for(const width of [390,822,1176]){
  await page.setViewportSize({width,height:826})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  const pink=page.locator('.outfit-card[data-outfit-id="styled-summer-edit02-21"]')
  await pink.screenshot({path:`${dir}/pink-outfit-${width}.png`,style:'.mobile-nav,.toast{visibility:hidden}'})
 }
 const cream=page.locator('.outfit-card[data-outfit-id="styled-summer-03"]')
 await cream.screenshot({path:`${dir}/cream-outfit-1176.png`,style:'.mobile-nav,.toast{visibility:hidden}'})
 await cream.getByRole('button',{name:'Try this look',exact:true}).click()
 await expect(page.locator('.outfit-canvas__top')).toHaveAttribute('src','/garments/cream-tee-v2.webp')
 await expect(page.locator('.selection-strip')).toContainText('Cream pocket tee')
 // A personal edit must invalidate the stock portrait and update its caption.
 await page.getByRole('button',{name:'My wardrobe',exact:true}).first().click()
 await page.locator('.wardrobe-item[data-garment-id="cream-tee"]').getByRole('button',{name:'Edit piece',exact:true}).click()
 await page.getByRole('textbox',{name:'Name',exact:true}).fill('My oatmeal pocket tee')
 await page.getByRole('button',{name:'Save garment',exact:true}).click()
 await page.getByRole('button',{name:'Outfit studio',exact:true}).first().click()
 const changed=page.locator('.outfit-card[data-outfit-id="styled-summer-03"]')
 await expect(changed.locator('.outfit-photograph')).toHaveCount(0)
 await expect(changed.locator('.outfit-canvas')).toBeVisible()
 await expect(changed.locator('.outfit-content>p').first()).toContainText('My oatmeal pocket tee')
 expect(errors).toEqual([])
 const report={date:'2026-11-16',url,activeOutfits:active.length,refreshedPortraits:checked.length,checked,liveCaptions:true,tryLookMatches:true,stalePortraitFallback:true,threeDDeferred:true,responsiveWidths:[390,822,1176],errors}
 await writeFile(`${dir}/browser-verification.json`,JSON.stringify(report,null,2)+'\n')
 console.log('PASS',JSON.stringify(report))
}finally{await browser.close()}
