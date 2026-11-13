# Personal-use performance review

Initial audit 13 November 2026; live before/after verification 14 November 2026 (Japan time). Baseline production commit: `72fd3fe` (v0.4.0). Measurements use a cold Chromium context with iPhone 13 viewport/device scale, disabled HTTP cache, no network/CPU throttling and software WebGL. Transfer totals include response headers; local `blob:` image decoding contributes no network bytes. These are resource measurements, not benchmarks of a physical phone or battery life.

## Baseline loading

| Action | Requests | Transferred bytes |
| --- | ---: | ---: |
| Open default 2D studio | 45 | 1,188,465 |
| Images within that startup | 39 | 1,021,524 |
| JavaScript within that startup | 1 | 92,122 |
| Fonts within that startup | 2 | 62,055 |
| Open 3D preview afterwards | 7 network resources | 3,559,999 additional |

Only six images intersected the initial phone viewport, but all 48 image elements had decoded. The entire top picker, composed recommendation images and three large model photos were loaded. Garment assets are already roughly 300 pixels wide; indiscriminately shrinking them further would hurt phone clarity. Model photos need responsive alternatives because current files are over 1000 pixels wide.

The initial 2D page correctly avoids the Three.js chunk and all GLBs. Source-guide imports resolve to URLs: the three large PNG guides are not requested until their dialog opens. The existing six-card pagination and on-demand 3D rendering are also worth retaining.

## Verified live release comparison — 14 November 2026

The same script measured Cloudflare production immediately before and after v0.5.0, in fresh phone contexts with HTTP caching disabled. Full results are in `performance-metrics-v0.5.0.json`; reproduce with `FIT_PICKER_URL=https://fit-picker.kaikei-app.workers.dev/ node scripts/measure-mobile.mjs`.

| Initial phone load | v0.4.0 | v0.5.0 |
| --- | ---: | ---: |
| Network requests | 45 | 11 |
| Transferred bytes | 1,188,498 | 285,662 |
| Image requests | 39 | 5 |
| Image bytes | 1,021,517 | 117,327 |

Initial transfer fell **76.0%** (about 1.19 MB to 0.29 MB), while the library expanded to 161 model photographs. No outfit portraits, 3D assets or full-size guide PNGs were fetched on startup. The selected 2D outfit remains eager. Card images use a 200-pixel near-viewport loading window and 400/800/1024-pixel WebP alternatives; the phone selected the 800-pixel photo when browsing. Guide previews total about 0.29 MB instead of loading 7.04 MB of originals in the dialog; full-size original links remain available.

The mobile drawing buffer measured 528×600 pixels for a 352×400 CSS-pixel stage, confirming the 1.5 pixel-ratio cap. The complete unit suite (26 tests), full browser checks, responsive layouts and model/image failure fallbacks passed. These figures measure downloaded resources in emulation, not physical-phone load times or battery use.

## Implemented glTF optimizations

The export pipeline removes garment textures that runtime materials were already discarding, and caps the alpha-preserving hair texture at 512 pixels. Skin textures retain the previous 1024-pixel cap. No authored geometry, UVs, indices or garment coverage attributes changed; binary accessor hashes were compared with the baseline for all eleven assets.

| Asset group | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| All shipped GLBs | 3,999,364 B | 2,579,008 B | 35.5% |
| Six GLBs in the default outfit | 3,389,024 B | 2,266,416 B | 33.1% |
| Hair GLB | 860,792 B | 295,196 B | 65.7% |
| All garment GLBs | 1,462,316 B | 607,556 B | 58.5% |

On screens at most 700 CSS pixels wide, the renderer caps pixel ratio at 1.5 rather than 2 and uses a 1024-square shadow map rather than 2048-square. At the measured 352×400 CSS-pixel preview this changes the drawing buffer from 704×800 to 528×600: 43.75% fewer pixels per rendered frame. The shadow texture has 75% fewer pixels. Desktop retains its previous profile. These pixel reductions do not imply the same percentage change in total GPU time or battery use.

Old/new model assets were rendered at the same mobile quality profile and visually compared; clothing, skin and hair appearance remained consistent. The optimized files loaded without page errors. The complete unit suite passed (24 tests at that point, including the coat regression).

## Loading choices and further improvements

1. Keep 2D as the default and 3D as an explicit choice. Render the 3D scene only after changes, as it already does. Avoid automatic rotation or an idle animation loop. [Three.js rendering on demand](https://threejs.org/manual/pages/rendering-on-demand.html).
2. Implemented: responsive model photos with `srcset`/`sizes` and explicit offscreen deferral. The visible selected outfit stays eager. All model photos are static, pre-generated assets; no generation service runs during phone use. [Responsive images](https://web.dev/learn/design/responsive-images), [image loading and decoding](https://web.dev/learn/performance/image-performance).
3. Implemented: the font request now uses an early stylesheet link and preconnects instead of CSS `@import`. Local WOFF2 subsets remain an option if later measurement supports them. Current font bytes are modest; discovery/connection delay is the relevant issue. [Font loading guidance](https://web.dev/articles/font-best-practices).
4. Keep explicit disposal when a model is replaced or 3D closes. Textures have independent lifetimes; the bounded shared template cache is deliberate, while renderer resources should be released when unused. [Three.js disposal](https://threejs.org/manual/pages/how-to-dispose-of-objects.html).
5. If offline support is added, cache a small app shell and favourites first. Avoid precaching the full photo/model library on installation.

## Useful additions for a single owner

Prioritize export/import backup for saved looks (currently browser-local), a worn/recently-worn marker, a laundry/unavailable toggle per garment, and hiding disliked suggestions. A temperature/rain filter or a short packing list can follow. These can start as local data and do not need social features, multi-user accounts or an AI service running inside the app.

## Natural garment preview — v0.6.0

The oversized field-jacket substitution for overshirts is replaced with a shirt-derived open mesh, with a clipped placket and small offline-baked resting folds. Trouser width and a restrained front crease are adapted once when a selection changes. Short sleeves intersect triangles at the cuff rather than dropping whole faces. None of these operations run on each rendered frame.

The new overshirt is about 0.27 MB, replacing the 0.09 MB jacket request for that outfit. This adds about 0.18 MB when opening a 3D outfit with an overshirt; initial 2D loading is unaffected. Both templates remain available because bombers and puffers still use the jacket. Two shared 128×128 RGBA normal/roughness maps use about 0.17 MB including mipmaps, with no network downloads or per-garment texture copies. MeshPhysicalMaterial enables fabric sheen, which adds shader work per rendered pixel; clearcoat, transmission and other optional physical features remain disabled. The existing phone pixel/shadow caps and rendering on demand remain in place. [Three.js fabric sheen and material cost](https://threejs.org/docs/pages/MeshPhysicalMaterial.html).

These changes improve a stylised preview. More convincing drape requires garment-specific modelling or offline cloth simulation, retopology and baked normal maps exported as compact GLBs; adding a live cloth solver would work against the phone budget. Runtime performance still needs physical-device testing before making frame-rate or battery claims.

Live verification of source commit `694121a` on 14 November 2026 passed: 33 unit tests, the browser regression suite and focused live garment/camera/outerwear checks. Cloudflare version: `d4af31ae-d51b-4b98-a92a-391eedbbc80c`. Raw resource measurements are in `performance-metrics-v0.6.0.json`.

| Cold phone startup | v0.5.0 | v0.6.0 |
| --- | ---: | ---: |
| Network requests | 11 | 11 |
| Transferred bytes | 285,662 | 285,715 |
| Image requests | 5 | 5 |
| Initial 3D model / module requests | 0 | 0 |

The 53-byte transfer difference includes response headers and is immaterial. The mobile drawing buffer remains 528×600 for a 352×400 CSS-pixel stage. The six model files in the default 3D outfit now total 2,444,644 bytes, up 178,228 bytes from v0.5.0 because the overshirt has its own mesh. The old jacket remains available for other outerwear. Shared fabric maps add no network requests. The seam fix averages displacement directions across coincident UV vertices before applying ease, keeping those edges joined. [Actual render comparison](mockups/garment-comparison.png).
