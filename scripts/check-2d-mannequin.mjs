import {chromium,webkit,expect} from '@playwright/test'
import {mkdir} from 'node:fs/promises'

const url=process.env.FIT_PICKER_URL||'http://127.0.0.1:5174/'
await mkdir('docs/mockups',{recursive:true})
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch()
 try{
  for(const width of [320,390,792,1440]){
   const page=await browser.newPage({viewport:{width,height:844}})
   const errors=[],requests=[]
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()))
   await page.goto(url)
   await page.getByRole('button',{name:'2D outfit',exact:true}).click()
   const preview=page.locator('.preview-panel'), form=preview.locator('.outfit-canvas')
   const presentation=preview.getByRole('group',{name:'2D presentation'})
   await expect(form).toHaveClass(/outfit-canvas--mannequin/)
   await expect(preview.locator('.rendered-mannequin')).toHaveAttribute('data-model-revision','studio-v2')
   await expect(preview.locator('.outfit-canvas__worn-layer')).toHaveAttribute('src',/\/mannequin\/v2\/brown-overshirt-front-/)
   const selected=await page.locator('.selection-strip').innerText()
   await presentation.getByRole('button',{name:'Show base outfit',exact:true}).click()
   await expect(preview.locator('.outfit-canvas__worn-layer')).toHaveCount(0)
   expect(await page.locator('.selection-strip').innerText()).toBe(selected)
   await presentation.getByRole('button',{name:'Pieces',exact:true}).click()
   await expect(preview.locator('.outfit-mannequin')).toHaveCount(0)
   await expect(preview.locator('.outfit-canvas__layer img')).toHaveAttribute('src','/garments/brown-overshirt.webp')
   await presentation.getByRole('button',{name:'Mannequin',exact:true}).click()
   await page.getByRole('combobox',{name:'Selected outerwear',exact:true}).selectOption('beige-coat')
   await expect(preview.locator('.outfit-canvas__worn-layer--coat')).toBeVisible()
   await page.getByRole('combobox',{name:'Selected outerwear',exact:true}).selectOption('navy-bomber')
   await expect(preview.locator('.outfit-canvas__worn-layer--bomber')).toBeVisible()
   await page.locator('.garment-card[data-garment-id="ukiyoe-tee"]').click()
   await page.getByRole('button',{name:'Back view',exact:true}).click()
   await expect(preview.locator('.outfit-canvas__top')).toHaveAttribute('src',/\/mannequin\/v2\/ukiyoe-tee-back-/)
   await presentation.getByRole('button',{name:'Show base outfit',exact:true}).click()
   await expect(preview.locator('.outfit-canvas__worn-layer')).toHaveCount(0)
   await expect(presentation).toContainText('outerwear hidden')
   await page.getByRole('button',{name:'Bottoms',exact:true}).click()
   await page.locator('.garment-card[data-garment-id="beige-shorts"]').click()
   await expect(form).toHaveClass(/outfit-canvas--shorts/)
   await expect(preview.locator('.outfit-canvas__bottoms')).toHaveAttribute('src',/\/mannequin\/v2\/beige-shorts-back-/)
   await expect.poll(()=>preview.locator('.outfit-canvas__top').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true)
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
   expect(requests.some(u=>/\/models\/|\/draco\/|\/assets\/Mannequin-/.test(u))).toBe(false)
   const fit=await preview.locator('.rendered-mannequin').evaluate(el=>{const r=el.getBoundingClientRect(),area=el.closest('.outfit-canvas__arrangement').getBoundingClientRect();return r.width<=area.width&&r.height<=area.height})
   expect(fit).toBe(true)
   expect(errors).toEqual([])
   if(engine==='chromium'&&[390,792].includes(width)){
    await page.getByRole('button',{name:'Front view',exact:true}).click()
    await page.getByRole('combobox',{name:'Selected outerwear',exact:true}).selectOption('brown-overshirt')
    await page.getByRole('button',{name:'Tops',exact:true}).click()
    await page.locator('.garment-card[data-garment-id="navy-shirt"]').click()
    await page.getByRole('button',{name:'Bottoms',exact:true}).click()
    await page.locator('.garment-card[data-garment-id="grey-slacks"]').click()
    await expect(preview.locator('.outfit-canvas__worn-layer')).toHaveAttribute('src',/\/mannequin\/v2\/brown-overshirt-front-/)
    await preview.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())))
    await page.setViewportSize({width,height:1600})
    await preview.scrollIntoViewIfNeeded()
    await preview.screenshot({path:`docs/mockups/2d-mannequin-${width}.png`})
   }
   await page.close()
   console.log(`PASS ${engine}/${width}px: mannequin, pieces, layered/base outfits, long coat, back print, shorts, no WebGL downloads`)
  }
 }finally{await browser.close()}
}
