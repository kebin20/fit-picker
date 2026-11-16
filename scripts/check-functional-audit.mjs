import {chromium, expect} from '@playwright/test'
import {mkdir, writeFile} from 'node:fs/promises'

const url=process.env.FIT_PICKER_URL||'http://127.0.0.1:5174/'
const personalKey='fit-picker:personal:v1', savedKey='fit-picker:saved:v1'
const empty={locks:[],unavailable:[],history:[],pinned:[],hidden:[],edits:[],temperature:'',rain:false}
const custom={id:'custom-audit-top',name:'Audit cotton top',category:'tops',style:'tee',color:'#526149',colorName:'Olive',seasons:['Autumn','Winter','Spring','Summer'],source:'ss',ownership:'confirmed'}
const combinationA={tops:custom.id,bottoms:'grey-slacks',shoes:'adidas-black'}
const combinationB={tops:'white-tee',bottoms:'olive-wide',shoes:'converse-black'}
const saved=(id,name,items)=>({id,name,items,saved:'2026-11-16T00:00:00Z'})
const browser=await chromium.launch(), results=[]
async function check(name,run,seed={personal:{...empty},saved:[]},viewport={width:390,height:844}){
 if(process.env.AUDIT_CASE&&!name.includes(process.env.AUDIT_CASE))return
 const context=await browser.newContext({viewport,reducedMotion:'reduce'})
 const page=await context.newPage(), errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.addInitScript(({personalKey,savedKey,seed})=>{if(!sessionStorage.getItem('audit-seeded')){localStorage.setItem(personalKey,JSON.stringify(seed.personal));localStorage.setItem(savedKey,JSON.stringify(seed.saved));sessionStorage.setItem('audit-seeded','1')}},{personalKey,savedKey,seed})
 const nav=name=>page.getByRole('navigation',{name:viewport.width>=1100?'Main navigation':'Mobile navigation'}).getByRole('button',{name,exact:true}).click()
 try{await page.goto(url);await run({page,nav,context});expect(errors).toEqual([]);results.push({name,passed:true});console.log(`PASS ${name}`)}
 catch(error){await page.screenshot({path:`test-results/functional-${name.replaceAll(' ','-')}.png`,fullPage:true});throw error}
 finally{await context.close()}
}
const read=page=>page.evaluate(({personalKey,savedKey})=>({personal:JSON.parse(localStorage.getItem(personalKey)),saved:JSON.parse(localStorage.getItem(savedKey))}),{personalKey,savedKey})
const uploadBackup=(page,backup)=>page.getByLabel('Import backup',{exact:true}).setInputFiles({name:'audit.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))})
try{
 await check('editor keyboard and focus return',async({page,nav})=>{
  await nav('My wardrobe')
  const opener=page.locator('[data-garment-id="black-tee"]').getByRole('button',{name:'Edit piece',exact:true})
  await opener.click();const editor=page.getByRole('dialog',{name:'Edit garment',exact:true})
  await expect(editor.getByLabel('Name',{exact:true})).toBeFocused()
  expect(await page.locator('.main-shell').evaluate(e=>e.inert)).toBe(true)
  expect(await page.evaluate(()=>document.body.style.position)).toBe('fixed')
  const previousY=await page.evaluate(()=>-Number.parseFloat(document.body.style.top))
  await editor.getByRole('button',{name:'Close garment editor'}).focus();await page.keyboard.press('Shift+Tab')
  await expect(editor.getByRole('button',{name:'Save garment',exact:true})).toBeFocused()
  await page.keyboard.press('Tab');await expect(editor.getByRole('button',{name:'Close garment editor'})).toBeFocused()
  await page.keyboard.press('Escape');await expect(editor).toHaveCount(0);await expect(opener).toBeFocused()
  expect(await page.locator('.main-shell').evaluate(e=>e.inert)).toBe(false)
  expect(await page.evaluate(()=>document.body.style.position)).toBe('')
  expect(Math.abs(await page.evaluate(()=>scrollY)-previousY)).toBeLessThan(2)
  await nav('Saved looks');expect(await page.evaluate(()=>scrollY)).toBe(0);await expect(page.locator('h1')).toBeFocused()
  await page.locator('footer').scrollIntoViewIfNeeded();await nav('Saved looks');expect(await page.evaluate(()=>scrollY)).toBe(0)
 })
 await check('native dialog focus and scroll return',async({page})=>{
  const opener=page.getByRole('button',{name:'Save look',exact:true});await opener.click()
  await expect(page.getByLabel('Look name',{exact:true})).toBeFocused()
  const y=await page.evaluate(()=>-Number.parseFloat(document.body.style.top))
  await page.getByRole('button',{name:'Close dialog',exact:true}).click()
  await expect(opener).toBeFocused();expect(Math.abs(await page.evaluate(()=>scrollY)-y)).toBeLessThan(2)
 })
 await check('desktop inspiration navigation',async({page,nav})=>{
  await nav('Saved looks');await page.getByRole('button',{name:'Outfit inspiration',exact:true}).click()
  await expect(page.locator('.recommendation-section')).toBeVisible()
  await expect.poll(()=>page.locator('.recommendation-section').evaluate(e=>Math.abs(e.getBoundingClientRect().top))).toBeLessThan(24)
 },undefined,{width:1176,height:826})
 await check('saved dedup and restore transaction',async({page,nav})=>{
  await nav('Saved looks');const card=name=>page.locator('.saved-card').filter({has:page.getByRole('heading',{name,exact:true})})
  await card('Look A').getByRole('button',{name:'Edit saved look',exact:true}).click();await page.getByRole('button',{name:'Change pieces',exact:true}).click()
  await page.locator('[data-garment-id="white-tee"]').click();await page.getByRole('button',{name:'Bottoms',exact:true}).click();await page.locator('[data-garment-id="olive-wide"]').click()
  await page.getByRole('button',{name:'Shoes',exact:true}).click();await page.locator('[data-garment-id="converse-black"]').click()
  await page.getByRole('button',{name:'Update look',exact:true}).click();await page.getByRole('button',{name:'Save this look',exact:true}).click()
  let state=await read(page);expect(state.saved).toHaveLength(2);expect(state.saved.find(s=>s.id==='look-a')?.items).toEqual(combinationB);expect(state.saved.some(s=>s.id==='look-b')).toBe(false)
  await nav('Saved looks');await card('Look C').getByRole('button',{name:'Delete Look C',exact:true}).click();await expect(page.getByRole('button',{name:'Undo delete',exact:true})).toBeVisible()
  await card('Look A').getByRole('button',{name:'Edit saved look',exact:true}).click();await page.getByRole('button',{name:'Change pieces',exact:true}).click()
  await page.getByRole('button',{name:'Tops',exact:true}).click();await page.locator(`[data-garment-id="${custom.id}"]`).click();await page.locator('[data-garment-id="rust-tee"]').click()
  await expect(page.getByRole('button',{name:'Undo last change',exact:true})).toBeVisible()
  await nav('Saved looks')
  const backup={version:1,personal:{...empty,draft:combinationB},saved:[saved('restored','Restored look',combinationB)]}
  await uploadBackup(page,{...backup,saved:[...backup.saved,...backup.saved]});await expect(page.getByRole('status')).toContainText('Duplicate saved look IDs');expect((await read(page)).saved[0].id).toBe('look-a')
  await uploadBackup(page,backup);await page.getByRole('button',{name:'Replace with this backup',exact:true}).click()
  await expect(page.getByRole('button',{name:'Undo delete',exact:true})).toHaveCount(0);await expect(page.locator('.saved-card')).toHaveCount(1)
  await nav('Outfit studio');await expect(page.getByRole('button',{name:'Undo last change',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Cancel editing',exact:true})).toHaveCount(0)
  await page.locator('[data-garment-id="rust-tee"]').click();await page.getByRole('button',{name:'Save look',exact:true}).click();await page.getByLabel('Look name',{exact:true}).fill('After restore');await page.getByRole('button',{name:'Save this look',exact:true}).click()
  state=await read(page);expect(state.personal.edits).toEqual([]);expect(state.saved).toHaveLength(2);expect(state.saved.some(s=>['look-a','look-b','look-c'].includes(s.id))).toBe(false)
 },{personal:{...empty,edits:[custom],draft:combinationA},saved:[saved('look-a','Look A',combinationA),saved('look-b','Look B',combinationB),saved('look-c','Look C',{tops:custom.id,bottoms:'beige-shorts',shoes:'skechers-taupe'})]})
 await check('failed undo actions allow retry',async({page,nav})=>{
  await nav('Saved looks')
  await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===window.auditFailedKey)throw Error('Storage test quota exceeded');return original.call(this,k,v)}})
  const fail=key=>page.evaluate(key=>{window.auditFailedKey=key},key)
  const undoDelete=page.getByRole('button',{name:'Undo delete',exact:true}),undoRestore=page.getByRole('button',{name:'Undo restore',exact:true})
  await page.getByRole('button',{name:'Delete Original look',exact:true}).click()
  await fail(savedKey);await undoDelete.click();await expect(undoDelete).toBeVisible();expect((await read(page)).saved).toHaveLength(0)
  await fail(null);await undoDelete.click();await expect(undoDelete).toHaveCount(0);await expect(page.getByRole('heading',{name:'Original look',exact:true})).toBeVisible()
  const backup={version:1,personal:{...empty,draft:{tops:'rust-tee',bottoms:'beige-trousers',shoes:'adidas-striped'}},saved:[saved('replacement','Imported look',{tops:'rust-tee',bottoms:'beige-trousers',shoes:'adidas-striped'})]}
  await uploadBackup(page,backup)
  const replace=page.getByRole('button',{name:'Replace with this backup',exact:true})
  await fail(personalKey);await replace.click();await expect(replace).toBeVisible();await expect(undoRestore).toHaveCount(0);expect((await read(page)).saved[0].id).toBe('original')
  await fail(null);await replace.click();await expect(undoRestore).toBeVisible();expect((await read(page)).saved[0].id).toBe('replacement')
  await fail(savedKey);await undoRestore.click();await expect(undoRestore).toBeVisible();expect((await read(page)).saved[0].id).toBe('replacement');expect((await read(page)).personal.draft.tops).toBe('rust-tee')
  await fail(null);await undoRestore.click();await expect(undoRestore).toHaveCount(0);expect((await read(page)).saved[0].id).toBe('original');expect((await read(page)).personal.draft).toEqual(combinationB)
 },{personal:{...empty,draft:combinationB},saved:[saved('original','Original look',combinationB)]})
 const today=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
 await check('wear history compares slots',async({page})=>{
  await page.getByRole('button',{name:'Wore this today',exact:true}).click()
  expect((await read(page)).personal.history).toHaveLength(1)
 },{personal:{...empty,draft:combinationB,history:[{date:today,items:{shoes:combinationB.shoes,tops:combinationB.tops,bottoms:combinationB.bottoms}}]},saved:[]})
 await check('editor reports storage failure',async({page,nav})=>{
  await nav('My wardrobe');await page.getByRole('button',{name:'Add garment',exact:true}).click();const editor=page.getByRole('dialog',{name:'Add garment',exact:true})
  await editor.getByLabel('Name',{exact:true}).fill('Storage failure test')
  await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(window.auditStorageFailure&&k==='fit-picker:personal:v1')throw Error('Storage test quota exceeded');return original.call(this,k,v)};window.auditStorageFailure=true})
  await editor.getByRole('button',{name:'Save garment',exact:true}).click();await expect(editor.getByRole('alert')).toHaveText('Storage test quota exceeded');expect((await read(page)).personal.edits).toHaveLength(0)
  await page.evaluate(()=>{window.auditStorageFailure=false});await page.keyboard.press('Escape')
 })
 await check('save dialog reports storage failure',async({page})=>{
  await page.getByRole('button',{name:'Save look',exact:true}).click()
  await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='fit-picker:saved:v1')throw Error('Storage test quota exceeded');return original.call(this,k,v)}})
  await page.getByRole('button',{name:'Save this look',exact:true}).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('could not save the look')
  expect((await read(page)).saved).toHaveLength(0)
 })
 await check('newest photo wins upload race',async({page,nav})=>{
  await page.evaluate(()=>{const original=window.createImageBitmap.bind(window);let n=0;window.createImageBitmap=async(...args)=>{await new Promise(r=>setTimeout(r,++n===1?700:0));return original(...args)}})
  await nav('My wardrobe');await page.getByRole('button',{name:'Add garment',exact:true}).click()
  const upload=page.getByLabel('Your garment photo');await upload.setInputFiles('public/icon-192.png');await upload.setInputFiles('public/garments/rust-tee.webp')
  await expect.poll(()=>page.locator('.editor-photo').evaluate(img=>img.naturalWidth)).toBe(300)
  const source=await page.locator('.editor-photo').getAttribute('src');await page.waitForTimeout(900)
  await expect(page.locator('.editor-photo')).toHaveAttribute('src',source)
  await upload.setInputFiles('public/icon-192.png');await page.getByRole('button',{name:'Remove photo',exact:true}).click();await page.waitForTimeout(200);await expect(page.locator('.editor-photo')).toHaveCount(0)
 })
 await mkdir('test-results',{recursive:true});await writeFile('test-results/functional-audit.json',JSON.stringify(results,null,2))
 console.log(`PASS ${results.length} isolated functional browser regressions`)
}finally{await browser.close()}
