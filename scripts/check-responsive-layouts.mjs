import {chromium,webkit,expect} from '@playwright/test'
import {mkdir,writeFile} from 'node:fs/promises'
const url=process.env.FIT_PICKER_URL||'http://127.0.0.1:5174/'
const output=process.env.FIT_PICKER_REPORT_DIR||'docs/responsive-audit'
await mkdir(output,{recursive:true})
const configurations=[
 ['iphone-se',320,568],['iphone-small',375,667],['iphone',390,844],['iphone-large',430,932],
 ['ipad-mini',768,1024],['ipad',820,1180],['ipad-landscape',1024,768],['iphone-landscape',844,390],['short-viewport',390,320],
]
const results=[],errors=[]
const visible=(page,name)=>page.getByRole('button',{name,exact:true}).first()
async function unobscured(locator){
 let lastState
 try{await expect.poll(async()=>{
  await locator.evaluate(e=>e.scrollIntoView({block:'end',inline:'nearest',behavior:'instant'}))
  lastState=await locator.evaluate(e=>{
  const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)
  const nav=document.querySelector('.mobile-nav'),navRect=nav?.getBoundingClientRect()
  const navVisible=nav&&getComputedStyle(nav).visibility!=='hidden'&&navRect.height>0
  const navClear=!navVisible||r.bottom<=navRect.top-1||nav.contains(e)
  return {visible:r.width>0&&r.height>0&&r.top>=-1&&r.bottom<=innerHeight+1&&navClear&&Boolean(hit&&e.contains(hit)),target:e.textContent?.trim().slice(0,80),top:r.top,bottom:r.bottom,height:innerHeight,navTop:navVisible?navRect.top:null,hit:hit?.outerHTML.slice(0,180)}
 });return lastState}).toMatchObject({visible:true})}catch(error){throw new Error(`Unreachable control: ${JSON.stringify(lastState)}`,{cause:error})}
}
async function fits(page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)}
async function dialogFits(page,selector){
 const box=await page.locator(selector).boundingBox()
 const viewport=page.viewportSize()
 expect(box.x).toBeGreaterThanOrEqual(-1);expect(box.y).toBeGreaterThanOrEqual(-1)
 expect(box.x+box.width).toBeLessThanOrEqual(viewport.width+1)
 expect(box.y+box.height).toBeLessThanOrEqual(viewport.height+1)
 expect(await page.locator(selector).evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true)
}
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch()
 try{
  for(const [name,width,height] of configurations){
   if(process.env.FIT_PICKER_LAYOUT_CASES&&!process.env.FIT_PICKER_LAYOUT_CASES.split(',').includes(name))continue
   console.log(`Checking ${engine}/${name} (${width}×${height})`)
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:true,isMobile:true})
   const page=await context.newPage();page.on('pageerror',e=>errors.push(`${engine}/${name}: ${e.message}`))
   await page.addInitScript(()=>localStorage.setItem('fit-picker:saved:v1',JSON.stringify([{id:'layout-check',name:'SavedLook'.repeat(7),items:{tops:'navy-shirt',layers:'brown-overshirt',bottoms:'grey-slacks',shoes:'adidas-black'},saved:'2026-11-16'}])))
   await page.goto(url);await page.evaluate(()=>document.fonts.ready)
   await fits(page)
   const save=visible(page,'Save look')
   await unobscured(save)
   await save.click()
   await dialogFits(page,'.modal[open]')
   await unobscured(page.getByRole('button',{name:'Save this look',exact:true}))
   const modalCloseBox=await page.getByRole('button',{name:'Close dialog',exact:true}).boundingBox()
   expect(modalCloseBox.width).toBeGreaterThanOrEqual(44);expect(modalCloseBox.height).toBeGreaterThanOrEqual(44)
   await unobscured(page.getByRole('button',{name:'Close dialog',exact:true}))
   await page.getByRole('button',{name:'Close dialog',exact:true}).click()
   await unobscured(page.locator('.garment-grid .garment-card .garment-name').last())
   await page.getByRole('group',{name:'Outfit recommendation filters'}).scrollIntoViewIfNeeded()
   await page.getByRole('button',{name:'With friends',exact:true}).click()
   await page.getByRole('combobox',{name:'Season',exact:true}).selectOption('Summer')
   await fits(page)
   await visible(page,'My wardrobe').click();await fits(page)
   await unobscured(page.locator('.wardrobe-item').last().getByRole('button',{name:'Try in studio',exact:true}))
   await visible(page,'Saved looks').click();await fits(page)
   await unobscured(page.getByRole('button',{name:'Wear it again',exact:true}))
   await page.getByRole('button',{name:'Edit saved look',exact:true}).click()
   await dialogFits(page,'.modal[open]')
   await page.getByRole('button',{name:'Change pieces',exact:true}).click();await fits(page)
   await visible(page,'My wardrobe').click()
   await page.getByRole('button',{name:'Add garment',exact:true}).click()
   await dialogFits(page,'.editor-dialog')
   await unobscured(page.getByRole('button',{name:'Save garment',exact:true}))
   if(name==='short-viewport')await page.screenshot({path:`${output}/${engine}-${name}-editor.png`,animations:'disabled'})
   const close=page.getByRole('button',{name:'Close garment editor',exact:true})
   const closeBox=await close.boundingBox();expect(closeBox.width).toBeGreaterThanOrEqual(44);expect(closeBox.height).toBeGreaterThanOrEqual(44)
   await expect(close).toBeInViewport()
   await unobscured(close);await close.click()
   await page.getByRole('button',{name:'View style guides',exact:true}).click()
   await dialogFits(page,'.modal[open]')
   await unobscured(page.locator('.source-guides a > span').last())
   await expect(page.getByRole('button',{name:'Close dialog',exact:true})).toBeInViewport()
   await page.getByRole('button',{name:'Close dialog',exact:true}).click()
   if(name==='iphone'||name==='ipad'||name==='iphone-landscape'){
    await visible(page,'Outfit studio').click()
    await page.screenshot({path:`${output}/${engine}-${name}.png`,animations:'disabled'})
   }
   results.push({engine,name,width,height,allPagesFit:true,saveButtonAboveNav:true,lastWardrobeActionReachable:true,savedLookActionReachable:true,dialogActionsReachable:true,stickyEditorClose:true})
   await context.close()
  }
  // Synthetic insets exercise safe-area arithmetic that desktop emulators do
  // not reproduce, including the home indicator and a landscape notch.
  for(const [name,width,height,insets] of [['home-indicator',390,844,{bottom:34,top:47,left:0,right:0}],['landscape-notch',844,390,{bottom:21,top:0,left:47,right:47}]]){
   if(process.env.FIT_PICKER_LAYOUT_CASES&&!process.env.FIT_PICKER_LAYOUT_CASES.split(',').includes(name))continue
   console.log(`Checking ${engine}/${name} (${width}×${height})`)
   const page=await browser.newPage({viewport:{width,height}});await page.goto(url)
   await page.evaluate(insets=>{for(const [side,value] of Object.entries(insets))document.documentElement.style.setProperty(`--safe-area-${side}`,`${value}px`)},insets)
   await fits(page);await unobscured(visible(page,'Save look'))
   if(width<700){
    const nav=await page.locator('.mobile-nav').boundingBox()
    expect(nav.height).toBeGreaterThanOrEqual(78+insets.bottom)
    await expect.poll(()=>page.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom))).toBeGreaterThanOrEqual(nav.height+15)
   }
   await visible(page,'Save look').click();await dialogFits(page,'.modal[open]')
   const box=await page.locator('.modal[open]').boundingBox()
   expect(box.x).toBeGreaterThanOrEqual(insets.left+11)
   expect(box.y).toBeGreaterThanOrEqual(insets.top+11)
   expect(box.y+box.height).toBeLessThanOrEqual(height-insets.bottom-11)
   results.push({engine,name,width,height,insets,clearance:true,dialogSafeArea:true});await page.close()
  }
 }finally{await browser.close()}
}
expect(errors).toEqual([])
await writeFile(`${output}/verification.json`,JSON.stringify({url,results,errors,limits:'Chromium/WebKit desktop device emulation plus synthetic safe areas. Real iPhone keyboard, home indicator and browser chrome still require a physical-device check.'},null,2)+'\n')
console.log(`PASS: ${results.length} Chromium/WebKit layout scenarios, no navbar occlusion or unreachable dialog actions.`)
