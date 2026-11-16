import {chromium,expect} from '@playwright/test'
const url=process.env.FIT_PICKER_URL||'http://127.0.0.1:5174/'
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']})
try{
 const context=await browser.newContext({viewport:{width:1024,height:768},deviceScaleFactor:3,isMobile:true,hasTouch:true})
 const page=await context.newPage();await page.goto(url)
 await page.getByRole('button',{name:'3D preview',exact:true}).click()
 const canvas=page.locator('canvas');await expect(canvas).toHaveAttribute('data-model-format','gltf',{timeout:45000})
 const metrics=[]
 for(const [width,height,ratio,shadow] of [[1024,768,2,2048],[390,844,1.5,1024],[844,390,1.5,1024],[1024,768,2,2048]]){
  await page.setViewportSize({width,height})
  await expect(canvas).toHaveAttribute('data-shadow-resolution',String(shadow))
  await expect.poll(()=>canvas.evaluate(c=>c.width/c.clientWidth)).toBeCloseTo(ratio,1)
  const current=await canvas.evaluate(c=>({cssWidth:c.clientWidth,bufferWidth:c.width,shadow:Number(c.dataset.shadowResolution)}))
  expect(current.bufferWidth/current.cssWidth).toBeCloseTo(ratio,1)
  metrics.push({width,height,...current})
 }
 await page.waitForTimeout(250)
 const frames=await canvas.getAttribute('data-rendered-frames');await page.waitForTimeout(1000)
 expect(await canvas.getAttribute('data-rendered-frames')).toBe(frames)
 console.log('PASS 3D quality resize',JSON.stringify({metrics,idleRenders:0}))
}finally{await browser.close()}
