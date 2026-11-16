# Runtime and offline audit — 16 November 2026

These checks cover the v0.10.0 baseline and the local audit changes. Chromium uses an iPhone 13 device profile, a cold context, disabled HTTP cache, no CPU/network throttling and software WebGL. This establishes requests, transferred resources and rendering behavior; it does not measure physical iPhone frame rate, thermal limits or battery life.

## Confirmed bugs and fixes

**Interrupted offline updates.** The old service worker replaced cached HTML before caching the JavaScript/CSS referenced by that HTML. An interrupted new release therefore left the next offline visit with missing entry assets. The worker now validates and stores every shell entry before publishing its HTML. A malformed HTTP 200 SPA fallback is rejected when its MIME type is HTML instead of JavaScript, CSS or WebP. Existing saved garment photos keep their cache keys.

**Offline module requests with `Vary: Origin`.** The preview host sends this header. Cache entries created by `fetch('/assets/file')` have a URL-only request, while the page's `crossorigin` module and stylesheet requests include `Origin`. Matching the full browser request missed valid cached files and produced an empty offline page. Reproducing the personal flow showed cached HTML/JS/CSS present, no JavaScript exceptions, and failed JS/CSS requests. Preserving `Vary: Origin` in the isolated update fixture reproduced the same failure. The worker now uses the same URL-only same-origin key when storing and retrieving these immutable files. Browser cache-storage failures also fall through to the network while online.

**3D quality after resizing.** Pixel ratio and shadow resolution were chosen only when the renderer mounted. A tablet resized into a narrow split view retained the larger render target, and a landscape touch phone could receive tablet quality. Resize handling now reapplies the phone profile, releases replaced shadow maps, and restores tablet quality when appropriate. The scene remains event driven.

## Resource measurements

| Cold phone flow | Live v0.10.0 baseline | Local audit build |
| --- | ---: | ---: |
| Initial network requests | 11 | 11 |
| Initial transferred bytes | 295,556 | 291,156 |
| Initial image requests | 5 | 5 |
| Initial image bytes | 117,329 | 116,094 |
| Browse first portrait, then open 3D: total bytes | 3,163,835 | 3,283,600 |
| Default 3D triangles / draw calls | 45,746 / 19 | 45,746 / 19 |
| Idle renders over one settled second | 0 | 0 |

The local figures were captured before the final offline key normalization and final CSS adjustment. Origin, headers and compression differ between local preview and Cloudflare, so these columns are **not a before/after speed comparison**. Repeat the script against the deployed release for a like-for-like resource comparison. Both runs fetched no avatar models, 3D module, Draco decoder, source-guide originals or outfit portraits during startup. The first 3D flow is still the largest optional download. A DPR-3 phone correctly selected the full 1024-pixel portrait for a full-width card; the measurement assertion now accepts that valid responsive-image choice.

Reproduce resource checks with:

```sh
FIT_PICKER_URL=http://127.0.0.1:5174/ node scripts/measure-mobile.mjs
```

## Regression evidence

Five worker unit cases cover interrupted updates, complete updates/cache reuse, MIME fallback rejection, cache-storage failure and preservation of saved garment photos. `scripts/check-offline-updates.mjs` uses a real Chromium service worker with a local HTTP fixture that deliberately serves `Vary: Origin`. It tests an unavailable new entry script, an HTML fallback masquerading as that script, and a complete release; each required offline reload succeeds and cached garment images decode. Models, decoder and portrait libraries are excluded from the offline cache. The fixture tests the local service-worker source and uses the built app at `FIT_PICKER_URL`.

`scripts/check-3d-quality-resize.mjs` verified these transitions in one mounted renderer:

| Viewport | CSS stage width | Drawing-buffer width | Shadow resolution |
| --- | ---: | ---: | ---: |
| 1024 × 768 tablet | 392 | 784 (DPR 2) | 2048 |
| 390 × 844 phone | 352 | 528 (DPR 1.5) | 1024 |
| 844 × 390 touch landscape | 716 | 1074 (DPR 1.5) | 1024 |
| Return to 1024 × 768 | 392 | 784 (DPR 2) | 2048 |

After settling, the renderer produced zero new frames during the one-second idle observation. The proxy fixture uses a random loopback port and standard Node HTTP APIs; the CI wrapper supplies its own production-preview URL.

## Further options

1. **Profile an actual older iPhone before reducing visual quality.** The current 2D default, deferred 3D and idle rendering behavior already avoid much unnecessary work. A user-selected low-quality 3D mode could reduce pixel ratio or shadows further if that device shows jank. Fabric sheen has an extra per-pixel cost; a simpler material may help but requires visual review. [Three.js material cost](https://threejs.org/docs/pages/MeshPhysicalMaterial.html).
2. **Consider self-hosted font subsets.** The page already uses early stylesheet discovery, preconnect and `display=swap`. Local WOFF2 subsets could remove the external font discovery/connection path; measure that latency before prioritizing it. [Web font loading](https://web.dev/articles/font-best-practices).
3. **Manage optional offline storage over time.** The current cache preserves offline garments and older hashed shell assets. A future storage view could show download usage, remove selected cached photos and prune obsolete shell generations while retaining a complete current shell. Cache entries do not expire automatically. Keep saved-look data separate from cache cleanup. [MDN Cache lifetime](https://developer.mozilla.org/en-US/docs/Web/API/Cache).
4. **Keep cloth preparation offline.** Further avatar/body LOD and texture reductions could reduce the first 3D download. Any reduction needs visual comparison against the garment realism requested for this app; a live cloth solver would add work on the phone.

No runtime dependency, full-library precache or continuous animation was introduced by these audit fixes.
