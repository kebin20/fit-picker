// Real service-worker regression: partial/malformed releases must keep offline
// favourites and the previous bootable shell, then accept a complete release.
import {chromium,expect} from '@playwright/test'
import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
const base=process.env.FIT_PICKER_URL||'http://127.0.0.1:5174/'
const originalHTML=await(await fetch(base)).text()
const originalJS=originalHTML.match(/src="(\/assets\/index[^" ]+\.js)"/)[1]
const nextJS='/assets/index-offline-audit.js'
const nextHTML=originalHTML.replace(originalJS,nextJS)
let release='original'
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://fixture.test').pathname
  res.setHeader('cache-control','no-store')
  if(pathname==='/sw.js'){res.setHeader('content-type','application/javascript');res.end(await readFile('public/sw.js'));return}
  if(pathname==='/'){res.setHeader('content-type','text/html');res.end(release==='original'?originalHTML:nextHTML);return}
  if(pathname===nextJS&&release==='interrupted'){res.writeHead(503,{'content-type':'text/plain'});res.end('Interrupted release');return}
  if(pathname===nextJS&&release==='spa-fallback'){res.setHeader('content-type','text/html');res.end(originalHTML);return}
  const upstream=await fetch(new URL(pathname===nextJS?originalJS:req.url,base))
  // Module requests carry Origin; precache requests do not. Exercise this
  // legitimate response variation even when the upstream host omits Vary.
  res.setHeader('vary','Origin')
  res.writeHead(upstream.status,{'content-type':upstream.headers.get('content-type')||'application/octet-stream'})
  res.end(Buffer.from(await upstream.arrayBuffer()))
 }catch(error){res.writeHead(500);res.end(String(error))}
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const url=`http://127.0.0.1:${server.address().port}/`
const browser=await chromium.launch()
try{
 const context=await browser.newContext({viewport:{width:390,height:844}})
 const page=await context.newPage()
 await page.goto(url)
 await page.getByRole('button',{name:'Keep outfit offline',exact:true}).click()
 await expect(page.getByRole('status')).toContainText('saved for offline',{timeout:20000})
 const cachedHTML=()=>page.evaluate(async()=>await(await(await caches.open('fit-picker-offline-v1')).match('/')).text())
 expect(await cachedHTML()).toBe(originalHTML)
 for(const mode of ['interrupted','spa-fallback']){
  release=mode
  await page.reload()
  await expect(page.locator('.preview-panel .rendered-mannequin')).toBeVisible()
  expect(await cachedHTML()).toBe(originalHTML)
  await context.setOffline(true);await page.reload()
  await expect(page.locator('.preview-panel .rendered-mannequin')).toBeVisible()
  await context.setOffline(false)
 }
 release='complete'
 await page.reload()
 await expect.poll(cachedHTML).toBe(nextHTML)
 await context.setOffline(true);await page.reload()
 await expect(page.locator('.preview-panel .rendered-mannequin')).toBeVisible()
 const decoded=await page.locator('.preview-panel .rendered-mannequin img').evaluateAll(async images=>{await Promise.all(images.map(img=>img.decode()));return images.every(img=>img.naturalWidth>0)})
 expect(decoded).toBe(true)
 const keys=await page.evaluate(async()=>await(await caches.open('fit-picker-offline-v1')).keys().then(keys=>keys.map(key=>new URL(key.url).pathname)))
 expect(keys.some(key=>key.startsWith('/models/')||key.includes('Mannequin-')||key.startsWith('/outfits/'))).toBe(false)
 expect(keys).toContain('/previews/navy-after-hours-quality-v1.webp')
 const directImage = await page.goto(new URL('/previews/navy-after-hours-quality-v1.webp',url).href)
 expect(directImage.headers()['content-type']).toMatch(/^image\/webp/i)
 await page.goto(url)
 await expect(page.locator('.preview-panel .rendered-mannequin')).toBeVisible()
 expect(await cachedHTML()).toBe(nextHTML)
 console.log('PASS offline updates: interrupted releases retain bootable shell; cached outfit/model photos survive; 3D and unrequested portraits are not cached.')
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
