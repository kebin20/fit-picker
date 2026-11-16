import {chromium,expect} from '@playwright/test'
import {mkdir,writeFile} from 'node:fs/promises'
const url=process.env.FIT_PICKER_URL||'http://127.0.0.1:5174/'
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']})
const errors=[], requests=[]
const page=await browser.newPage({viewport:{width:390,height:844}})
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()))
const dir='docs/artwork/garments/corrections'
await mkdir(dir,{recursive:true})
const nav=async(name)=>page.getByRole('button',{name,exact:true}).first().click()
const decode=async(locator)=>{await locator.scrollIntoViewIfNeeded();await expect.poll(()=>locator.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true)}
try{
 await page.goto(url)
 await expect(page.locator('.outfit-canvas')).toBeVisible()
 expect(requests.some(r=>/\/prints\/|\/models\/|Mannequin-|\/draco\/|-back-v2/.test(r))).toBe(false)
 const coldRequests=requests.length
 await nav('My wardrobe')
 await expect(page.locator('.wardrobe-art .item-season')).toHaveCount(0)
 await expect(page.locator('.wardrobe-item')).toHaveCount(22)
 await page.getByRole('checkbox',{name:'Show suggested pieces'}).check()
 await expect(page.locator('.wardrobe-item')).toHaveCount(24)
 for(const id of ['cream-graphic-tee','white-shirt','yellow-tee','navy-tee','white-longsleeve']) await expect(page.locator(`.wardrobe-item[data-garment-id="${id}"]`)).toHaveCount(0)
 for(const id of ['pink-tee','black-cat-tee','white-graphic-tee','ukiyoe-tee','burton-tee','black-tee','cream-tee']){
   const card=page.locator(`.wardrobe-item[data-garment-id="${id}"]`)
   const photo=card.locator('img');await decode(photo)
   await expect(photo).toHaveAttribute('src',`/garments/${id}-v2.webp`)
 }
 for(const id of ['white-graphic-tee','ukiyoe-tee']){
  const card=page.locator(`.wardrobe-item[data-garment-id="${id}"]`)
  expect(requests.some(r=>r.includes(`${id}-back-v2`))).toBe(false)
  await card.getByRole('button',{name:'Back',exact:true}).click();await decode(card.locator('img'))
  await expect(card.locator('img')).toHaveAttribute('src',`/garments/${id}-back-v2.webp`)
  await card.screenshot({path:`${dir}/${id}-wardrobe-back.png`})
  await card.getByRole('button',{name:'Front',exact:true}).click()
 }
 await page.locator('.wardrobe-item[data-garment-id="white-graphic-tee"]').getByRole('button',{name:'Try in studio'}).click()
 await page.getByRole('combobox',{name:'Selected outerwear'}).selectOption('')
 const otherPieces=await page.locator('.outfit-canvas__bottoms,.outfit-canvas__shoes').evaluateAll(imgs=>imgs.map(i=>i.getAttribute('src')))
 await page.getByRole('group',{name:'Top view'}).getByRole('button',{name:'Back view'}).click()
 await decode(page.locator('.outfit-canvas__top'))
 await expect(page.locator('.outfit-canvas__top')).toHaveAttribute('src','/garments/white-graphic-tee-back-v2.webp')
 expect(await page.locator('.outfit-canvas__bottoms,.outfit-canvas__shoes').evaluateAll(imgs=>imgs.map(i=>i.getAttribute('src')))).toEqual(otherPieces)
 await page.locator('.preview-panel').screenshot({path:`${dir}/white-2d-back-mobile.png`})
 await page.getByRole('button',{name:'3D preview',exact:true}).click()
 const canvas=page.locator('canvas')
 await expect(canvas).toHaveAttribute('data-garment-prints',/front,back|back,front/,{timeout:45000})
 for(const id of ['white-graphic-tee','ukiyoe-tee']){
  if(id==='ukiyoe-tee')await page.locator(`.garment-card[data-garment-id="${id}"]`).click()
  await expect(canvas).toHaveAttribute('aria-label',id==='white-graphic-tee'?/White graphic tee/:/Yellow Ukiyoe tee/,{timeout:45000})
  await expect(canvas).toHaveAttribute('data-garment-prints',/front,back|back,front/)
  for(const side of ['Front','Back']){
   await page.getByRole('group',{name:'Model view'}).getByRole('button',{name:`${side} view`}).click()
   await page.locator('.preview-panel').screenshot({path:`${dir}/${id}-3d-${side.toLowerCase()}-mobile.png`})
  }
 }
 const frames=await canvas.getAttribute('data-rendered-frames');await page.waitForTimeout(500)
 expect(await canvas.getAttribute('data-rendered-frames')).toBe(frames)
 // One-sided corrected tees still get the matching front artwork in 3D.
 for(const id of ['pink-tee','black-cat-tee','burton-tee','black-tee']){
  await page.locator(`.garment-card[data-garment-id="${id}"]`).click()
  await expect(page.locator('.avatar-loading')).toHaveCount(0,{timeout:45000})
  await expect(canvas).toHaveAttribute('data-garment-prints','front')
 }
 await page.locator('.garment-card[data-garment-id="cream-tee"]').click()
 await expect(canvas).toHaveAttribute('aria-label',/Cream pocket tee/,{timeout:45000})
 await expect(canvas).toHaveAttribute('data-chest-pockets','1')
 await page.getByRole('button',{name:'Front view',exact:true}).click()
 await page.locator('.preview-panel').screenshot({path:`${dir}/cream-pocket-3d.png`,style:'.toast,.mobile-nav{visibility:hidden}'})
 await page.getByRole('button',{name:'2D outfit',exact:true}).click()
 await decode(page.locator('.outfit-canvas__top'))
 await expect(page.locator('.outfit-canvas__top')).toHaveAttribute('src','/garments/cream-tee-v2.webp')
 await page.locator('.preview-panel').screenshot({path:`${dir}/cream-pocket-2d.png`,style:'.toast,.mobile-nav{visibility:hidden}'})
 for(const width of [320,390,511,784,820,1176]){
  await page.setViewportSize({width,height:826})
  for(const name of ['Outfit studio','My wardrobe','Saved looks']){
   await nav(name);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  }
 }
 // Older edits and backups must not restore items that the user does not own.
 const legacy=await browser.newPage({viewport:{width:390,height:844}})
 await legacy.addInitScript(()=>{
  const white={id:'white-shirt',name:'White shirt',category:'tops',style:'shirt',color:'#eeede6',colorName:'White',seasons:['Spring','Summer'],source:'ss',ownership:'confirmed',wearableAs:['layers']}
  const items={tops:'white-shirt',bottoms:'grey-slacks',shoes:'adidas-black'}
  localStorage.setItem('fit-picker:personal:v1',JSON.stringify({draft:items,locks:[],unavailable:[],pinned:[],hidden:[],history:[],edits:[white],temperature:'',rain:false}))
  localStorage.setItem('fit-picker:saved:v1',JSON.stringify([{id:'old-white-look',name:'Old white-shirt look',items,saved:'2026-11-01'}]))
 })
 await legacy.goto(url)
 await expect(legacy.locator('.selection-strip')).toContainText('Choose top')
 await expect(legacy.getByRole('button',{name:'Save look',exact:true})).toBeDisabled()
 await legacy.getByRole('button',{name:'Saved looks',exact:true}).click()
 await expect(legacy.getByRole('heading',{name:'Old white-shirt look'})).toBeVisible()
 await legacy.getByRole('button',{name:'Edit saved look',exact:true}).click()
 await expect(legacy.locator('.studio-grid')).toBeVisible()
 await expect(legacy.locator('.modal[open]')).toHaveCount(0)
 await legacy.locator('.garment-card[data-garment-id="navy-shirt"]').click()
 await legacy.getByRole('button',{name:'Update look',exact:true}).click()
 await legacy.getByRole('button',{name:'Save this look',exact:true}).click()
 expect(await legacy.evaluate(()=>JSON.parse(localStorage.getItem('fit-picker:saved:v1')))).toMatchObject([{id:'old-white-look',items:{tops:'navy-shirt',bottoms:'grey-slacks',shoes:'adidas-black'}}])
 await legacy.close()
 expect(errors).toEqual([])
 const report={date:'2026-11-16',url,removed:['cream-graphic-tee','white-shirt','yellow-tee','navy-tee','white-longsleeve'],owned:44,suggested:2,selectableOutfits:133,coldRequests,printsDeferred:true,backPhotosDeferred:true,frontBack2D:true,frontBack3D:true,idleRenders:0,legacySavedLookRepaired:true,creamPocket2D:true,creamPocket3D:true,responsiveWidths:[320,390,511,784,820,1176],errors}
 await writeFile(`${dir}/browser-verification.json`,JSON.stringify(report,null,2)+'\n')
 console.log('PASS',JSON.stringify(report))
}finally{await browser.close()}
