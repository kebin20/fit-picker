# Personal-use performance review

Measured 13 November 2026. Baseline production commit: `72fd3fe` (v0.4.0). Measurements use a cold Chromium context with iPhone 13 viewport/device scale, disabled HTTP cache, no network/CPU throttling and software WebGL. Transfer totals include response headers; local `blob:` image decoding contributes no network bytes. These are resource measurements, not benchmarks of a physical phone or battery life.

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

## Further changes with the best trade-off

1. Keep 2D as the default and 3D as an explicit choice. Render the 3D scene only after changes, as it already does. Avoid automatic rotation or an idle animation loop. [Three.js rendering on demand](https://threejs.org/manual/pages/rendering-on-demand.html).
2. Serve model photos in several widths with accurate `srcset`/`sizes`, and defer offscreen garment cards. Keep the selected outfit's visible pieces eager. Prefer static, pre-generated images over generating them during phone use. [Responsive images](https://web.dev/learn/design/responsive-images), [image loading and decoding](https://web.dev/learn/performance/image-performance).
3. Move the Google Fonts request from CSS `@import` into an early stylesheet link with preconnects, or use local WOFF2 subsets if measurement supports it. Current font bytes are modest; discovery/connection delay is the relevant issue. [Font loading guidance](https://web.dev/articles/font-best-practices).
4. Keep explicit disposal when a model is replaced or 3D closes. Textures have independent lifetimes; the bounded shared template cache is deliberate, while renderer resources should be released when unused. [Three.js disposal](https://threejs.org/manual/pages/how-to-dispose-of-objects.html).
5. If offline support is added, cache a small app shell and favourites first. Avoid precaching the full photo/model library on installation.

## Useful additions for a single owner

Prioritize export/import backup for saved looks (currently browser-local), a worn/recently-worn marker, a laundry/unavailable toggle per garment, and hiding disliked suggestions. A temperature/rain filter or a short packing list can follow. These can start as local data and do not need social features, multi-user accounts or an AI service running inside the app.
