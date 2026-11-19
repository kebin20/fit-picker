import {chromium,expect} from '@playwright/test'
import {mkdir,writeFile} from 'node:fs/promises'
const url=process.env.FIT_PICKER_URL||'http://127.0.0.1:5175/'
const output=process.env.FIT_PICKER_REPORT_DIR||'docs/artwork/tailored-avatar'
await mkdir(output,{recursive:true})
const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']})
try{
 const p=await b.newPage({viewport:{width:390,height:844}}),errors=[],requests=[]
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader/i.test(m.text()))errors.push(m.text())});p.on('request',r=>requests.push(r.url()))
 await p.addInitScript(() => {
  localStorage.setItem('fit-picker:personal:v1', JSON.stringify({
   focusPieces: [], unavailable: [], history: [], pinned: [], hidden: [], temperature: '', rain: false,
   edits: [{ id: 'custom-shell', name: 'Test shell', category: 'layers', style: 'raincoat', color: '#252a29', colorName: 'Black', seasons: ['Autumn'], source: 'ss' }],
  }))
 })
 await p.goto(url);await expect(p.locator('.rendered-mannequin')).toHaveAttribute('data-model-revision','studio-v2')
 await p.locator('.rendered-mannequin img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())))
 expect(requests.some(u=>/\/models\/|\/draco\//.test(u))).toBe(false)
 await p.getByRole('button',{name:'3D preview',exact:true}).click();const canvas=p.locator('canvas')
 await expect(canvas).toHaveAttribute('data-model-revision','studio-v2',{timeout:45000})
 const pick=async(tab,id)=>{
  await p.getByRole('button',{name:tab,exact:true}).click();const card=p.locator(`[data-garment-id="${id}"]`),name=await card.locator('.garment-name').innerText();await card.click();await expect(canvas).toHaveAttribute('aria-label',new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),{timeout:30000})
 }
 await p.getByRole('combobox',{name:'Selected outerwear',exact:true}).selectOption('')
 for(const id of ['rust-tee','ainu-longsleeve','navy-sweatshirt','white-hoodie','navy-shirt','brown-flannel'])await pick('Tops',id)
 for(const id of ['beige-shorts','grey-slacks','beige-trousers','olive-wide','white-barrel','black-ankle'])await pick('Bottoms',id)
 await pick('Tops','navy-shirt');await pick('Bottoms','grey-slacks')
 for(const id of ['brown-overshirt','teal-shirt','navy-bomber','black-puffer','beige-coat','custom-shell']){
  const selector=p.getByRole('combobox',{name:'Selected outerwear',exact:true}),name=await selector.locator(`option[value="${id}"]`).innerText()
  await selector.selectOption(id);await expect(canvas).toHaveAttribute('aria-label',new RegExp(name),{timeout:30000})
  if(['brown-overshirt','beige-coat','black-puffer'].includes(id)){
   for(const side of ['Front','Back']){await p.getByRole('button',{name:`${side} view`,exact:true}).click();await p.locator('.mannequin-area').screenshot({path:`${output}/${id}-${side.toLowerCase()}.png`,style:'.mobile-nav{visibility:hidden!important}'})}
  }
 }
 await p.getByRole('combobox',{name:'Selected outerwear',exact:true}).selectOption('brown-overshirt')
 await expect(canvas).toHaveAttribute('aria-label',/Brown overshirt/,{timeout:30000})
 await p.getByRole('button',{name:'Front view',exact:true}).click();await p.getByRole('button',{name:'Reset view',exact:true}).click()
 await p.waitForLoadState('networkidle')
 await expect(canvas).toHaveAttribute('data-render-pending','false',{timeout:30000})
 const modelRequests=requests.filter(u=>/\/models\/.+\.glb/.test(u)),files=[...new Set(modelRequests.map(u=>new URL(u).pathname))]
 expect(files).toHaveLength(20);expect(files.every(u=>u.startsWith('/models/tailored/'))).toBe(true)
 expect(modelRequests.every(u=>/^[a-f0-9]{12}$/.test(new URL(u).searchParams.get('v')||'')),'Updated model geometry should bypass earlier browser copies').toBe(true)
 expect(Number(await canvas.getAttribute('data-textures'))).toBeLessThanOrEqual(26)
 expect(Number(await canvas.getAttribute('data-triangles'))).toBeLessThan(120000)
 await p.waitForTimeout(300);const frame=await canvas.getAttribute('data-rendered-frames');await p.waitForTimeout(1000);expect(await canvas.getAttribute('data-rendered-frames')).toBe(frame)
 expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([])
 await writeFile(`${output}/verification.json`,JSON.stringify({testedAt:new Date().toISOString(),modelRevision:'studio-v2',files,errors,textureCount:Number(await canvas.getAttribute('data-textures')),idleRenders:0},null,2)+'\n')
 console.log('PASS replacement avatar: all 20 new body/garment files; 18 garment constructions; front/back, bounded textures, no idle renders or legacy model requests.')
}finally{await b.close()}
