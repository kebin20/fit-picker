const CACHE = 'fit-picker-offline-v1'
self.addEventListener('install', event => event.waitUntil((async () => {
 const cache=await caches.open(CACHE); const response=await fetch('/',{cache:'reload'});if(!response.ok)throw Error('App unavailable');const html=await response.clone().text(); await cache.put('/',response)
 const files=[...html.matchAll(/(?:src|href)="(\/assets\/(?:index)[^" ]+\.(?:js|css))"/g)].map(m=>m[1]);await cache.addAll([...new Set(files),'/icon-192.png','/manifest.webmanifest'])
})()))
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('fit-picker-offline-')&&key!==CACHE)await caches.delete(key);await self.clients.claim()})()))
self.addEventListener('message',event=>{if(event.data?.type!=='CACHE_LOOK')return;event.waitUntil((async()=>{const cache=await caches.open(CACHE);let success=true;for(const path of (event.data.urls||[]).slice(0,4)){if(typeof path!=='string'||!/^\/garments\/[a-z0-9-]+\.webp$/.test(path))continue;if(await cache.match(path))continue;try{const r=await fetch(path);if(r.ok)await cache.put(path,r);else success=false}catch{success=false}}event.source?.postMessage({type:'LOOK_CACHED',success})})())})
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(url.origin!==location.origin||event.request.method!=='GET')return
 if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).then(async r=>{if(r.ok)try{await(await caches.open(CACHE)).put('/',r.clone())}catch{}return r}).catch(()=>caches.open(CACHE).then(c=>c.match('/'))));return}
 if(/^\/assets\/index[^/]+\.(js|css)$/.test(url.pathname)){event.respondWith(fetch(event.request).then(async r=>{if(r.ok)try{await(await caches.open(CACHE)).put(event.request,r.clone())}catch{}return r}).catch(()=>caches.open(CACHE).then(c=>c.match(event.request))));return}
 if(url.pathname.startsWith('/garments/'))event.respondWith(caches.open(CACHE).then(async c=>await c.match(event.request)||fetch(event.request)))
})
