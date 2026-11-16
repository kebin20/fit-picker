import {describe,expect,it} from 'vitest'
import vm from 'node:vm'
import {readFileSync} from 'node:fs'
const origin='https://fit.test'
const oldHTML='<script src="/assets/index-old.js"></script><link href="/assets/index-old.css" rel="stylesheet">'
const newHTML='<script src="/assets/index-new.js"></script><link href="/assets/index-new.css" rel="stylesheet">'
const response=(body:string,type='text/html')=>new Response(body,{headers:{'content-type':type}})
function worker(network:(path:string)=>Promise<Response>, unavailable=false){
 const contents=new Map<string,Response>(),listeners:Record<string,(e:any)=>void>={}
 const key=(input:any)=>new URL(typeof input==='string'?input:input.url,origin).pathname
 const cache={async match(input:any){return contents.get(key(input))?.clone()},async put(input:any,value:Response){contents.set(key(input),value.clone())}}
 const messages:any[]=[];let requests:string[]=[]
 const sandbox={self:{addEventListener:(type:string,fn:(e:any)=>void)=>listeners[type]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}},location:{origin},URL,Response,caches:{open:async()=>{if(unavailable)throw Error('Cache unavailable');return cache},keys:async()=>['fit-picker-offline-v1'],delete:async()=>true},fetch:async(input:any)=>{const path=key(input);requests.push(path);return network(path)}}
 vm.runInNewContext(readFileSync(new URL('../../public/sw.js',import.meta.url),'utf8'),sandbox)
 return {cache,contents,requests,messages,async navigate(){let result:Promise<Response>|undefined;listeners.fetch({request:{url:origin+'/',method:'GET',mode:'navigate'},respondWith:(p:Promise<Response>)=>result=p});return result!},async message(urls:string[]){let pending:Promise<unknown>|undefined;listeners.message({data:{type:'CACHE_LOOK',urls},waitUntil:(p:Promise<unknown>)=>pending=p,source:{postMessage:(m:any)=>messages.push(m)}});await pending},async asset(path:string){let result:Promise<Response>|undefined;listeners.fetch({request:{url:origin+path,method:'GET',mode:'cors'},respondWith:(p:Promise<Response>)=>result=p});return result!}}
}
async function seed(w:ReturnType<typeof worker>){await w.cache.put('/',response(oldHTML));await w.cache.put('/assets/index-old.js',response('old JS','text/javascript'));await w.cache.put('/assets/index-old.css',response('old CSS','text/css'))}
describe('offline service-worker shell integrity',()=>{
 it('retains and serves the complete previous app after an interrupted shell update',async()=>{
  const w=worker(async path=>{if(path==='/')return response(newHTML);if(path.endsWith('.css'))return response('new CSS','text/css');throw Error('Interrupted download')})
  await seed(w)
  expect(await (await w.navigate()).text()).toBe(oldHTML)
  expect(await (await w.cache.match('/'))!.text()).toBe(oldHTML)
  expect(await (await w.asset('/assets/index-old.js')).text()).toBe('old JS')
 })
 it('commits a complete new shell and reuses its hash-named assets without refetching',async()=>{
  const w=worker(async path=>path==='/'?response(newHTML):response(path,path.endsWith('.css')?'text/css':'text/javascript'))
  await seed(w);expect(await (await w.navigate()).text()).toBe(newHTML)
  const before=w.requests.length;await w.asset('/assets/index-new.js');expect(w.requests.length).toBe(before)
  expect(await (await w.cache.match('/'))!.text()).toBe(newHTML)
 })
 it('rejects SPA fallback HTML masquerading as a missing JavaScript file or garment image',async()=>{
  const w=worker(async path=>response(path==='/'?newHTML:'<html>Not an asset</html>'))
  await seed(w);expect(await (await w.navigate()).text()).toBe(oldHTML)
  await w.message(['/garments/missing.webp'])
  expect(w.messages.at(-1)).toMatchObject({type:'LOOK_CACHED',success:false})
  expect(await w.cache.match('/garments/missing.webp')).toBeUndefined()
 })
 it('keeps the online app usable if browser cache storage is unavailable',async()=>{
  const w=worker(async path=>path==='/'?response(newHTML):response('network script','text/javascript'),true)
  expect(await(await w.navigate()).text()).toBe(newHTML)
  expect(await(await w.asset('/assets/index-new.js')).text()).toBe('network script')
  await w.message(['/garments/cream-tee-v2.webp'])
  expect(w.messages.at(-1)).toMatchObject({type:'LOOK_CACHED',success:false})
 })
 it('preserves existing offline garment photos when a new shell is installed',async()=>{
  const w=worker(async path=>path==='/'?response(newHTML):response(path,path.endsWith('.css')?'text/css':'text/javascript'))
  await seed(w);await w.cache.put('/garments/cream-tee-v2.webp',response('cached picture','image/webp'))
  await w.navigate();expect(await (await w.cache.match('/garments/cream-tee-v2.webp'))!.text()).toBe('cached picture')
 })
})
