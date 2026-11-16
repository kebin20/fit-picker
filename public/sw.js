const CACHE = 'fit-picker-offline-v1'
const EXTRAS = ['/icon-192.png', '/manifest.webmanifest']
const assetPath = path => /^\/assets\/[^/]+\.(?:js|css)$/.test(path)
const validAsset = (response, path) => response?.ok && (path.split('?')[0].endsWith('.css')
  ? /text\/css/i.test(response.headers.get('content-type') || '')
  : /javascript|ecmascript/i.test(response.headers.get('content-type') || ''))
const validPhoto = response => response?.ok && /^image\/webp/i.test(response.headers.get('content-type') || '')
async function cachedResponse(request) {
  // Shell and garment files are stored under a same-origin URL-only key.
  // Match that key again: crossorigin module requests include Origin, unlike
  // the precache fetch, so matching the full request can miss Vary: Origin.
  const key = typeof request === 'string' ? request : (() => {
    const url = new URL(request.url)
    return url.pathname + url.search
  })()
  try { return await (await caches.open(CACHE)).match(key) } catch { return undefined }
}

// Hash-named assets are immutable. Publish HTML only after every entry asset is
// safely stored, so an interrupted release cannot replace the offline shell
// with HTML referring to missing JavaScript. Keep the cache/garment keys intact.
async function storeShell(response) {
  if (!response.ok) throw Error('App unavailable')
  const html = await response.clone().text()
  const files = [...new Set([...html.matchAll(/\b(?:src|href)=["'](\/assets\/[^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)].map(match => match[1]))]
  if (!files.some(file => file.split('?')[0].endsWith('.js'))) throw Error('App shell is incomplete')
  const cache = await caches.open(CACHE)
  await Promise.all(files.map(async file => {
    const cached = await cache.match(file)
    if (validAsset(cached, file)) return
    const asset = await fetch(file, { cache: 'reload' })
    if (!validAsset(asset, file)) throw Error('App asset unavailable')
    await cache.put(file, asset)
  }))
  await cache.put('/', response)
}

self.addEventListener('install', event => event.waitUntil((async () => {
  await storeShell(await fetch('/', { cache: 'reload' }))
  const cache = await caches.open(CACHE)
  await Promise.allSettled(EXTRAS.map(async file => {
    const response = await fetch(file)
    if (response.ok) await cache.put(file, response)
  }))
  await self.skipWaiting()
})()))
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('fit-picker-offline-') && key !== CACHE) await caches.delete(key)
  await self.clients.claim()
})()))

self.addEventListener('message', event => {
  if (event.data?.type !== 'CACHE_LOOK') return
  event.waitUntil((async () => {
    let success = true
    try {
      const cache = await caches.open(CACHE)
      for (const path of (event.data.urls || []).slice(0, 4)) {
        if (typeof path !== 'string' || !/^\/garments\/[a-z0-9-]+\.webp$/.test(path)) { success = false; continue }
        if (validPhoto(await cache.match(path))) continue
        try {
          const response = await fetch(path)
          if (!validPhoto(response)) { success = false; continue }
          await cache.put(path, response)
        } catch { success = false }
      }
    } catch { success = false }
    event.source?.postMessage({ type: 'LOOK_CACHED', success })
  })())
})

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (url.origin !== location.origin || event.request.method !== 'GET') return
  // Standalone visual studies are not the offline app shell.
  if (url.pathname.startsWith('/previews/')) return
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      let response
      try {
        response = await fetch(event.request)
        await storeShell(response.clone())
        return response
      } catch { return await cachedResponse('/') || response || Response.error() }
    })())
    return
  }
  if (assetPath(url.pathname)) {
    event.respondWith((async () => {
      const cached = await cachedResponse(event.request)
      if (validAsset(cached, url.pathname)) return cached
      // Uncached 3D/lazy modules stay network-only; shell entries are already
      // written atomically by storeShell, rather than caching the whole app.
      return fetch(event.request)
    })())
    return
  }
  if (url.pathname.startsWith('/garments/')) {
    event.respondWith((async () => {
      const cached = await cachedResponse(event.request)
      return validPhoto(cached) ? cached : fetch(event.request)
    })())
    return
  }
  if (EXTRAS.includes(url.pathname)) event.respondWith(cachedResponse(event.request).then(cached => cached || fetch(event.request)))
})
