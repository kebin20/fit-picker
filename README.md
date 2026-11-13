# Fit Picker

A personal wardrobe studio for Kevin. Assemble outfits with realistic photographic garment cutouts, browse seasonal/occasion suggestions drawn from the supplied style guides, and save favourite combinations on your browser.

[Open the Cloudflare prototype](https://fit-picker.kaikei-app.workers.dev)

## Prototype

- React, TypeScript and Vite.
- A composed 2D outfit view is the default: the selected top, bottoms and shoes form an outfit, with the optional outer layer alongside.
- 51 individual transparent product-style garment photographs replace the former SVG drawings throughout the wardrobe, picker, outfit overviews and saved looks.
- The optional Three.js 3D preview loads a fitted human body, hair and separate clothing models through `GLTFLoader`, with clothing swaps, rotation, zoom and reset. Model/WebGL failures return to 2D. A persistent Outerwear selector changes/removes the outer layer from any builder tab; the separate coat model has a knee-length hem.
- 49 confirmed garment entries, 2 clearly separated suggested sweatshirts, and 54 combinations transcribed from three source images.
- Seasonal Edit 01: 12 new combinations (three per season), with independent high-resolution styling photographs and why-it-works notes.
- Seasonal Edit 02: 96 additional combinations (24 per season), each with its own generated full-body model photograph. Every season/occasion has multiple choices; all compositions are distinct from the existing guides and edit.
- 161 model photographs cover every selectable combination: 108 seasonal edits and 53 original guide looks. The source-only look containing an unconfirmed sweatshirt remains excluded. Original guide PNGs are preserved in the source viewer.
- Recommendation filters live under “Right for the occasion”. They change the suggested looks only; the outfit builder shows the confirmed wardrobe independently. Wardrobe browsing has its own season filter.
- Exact season/occasion filtering over confirmed garments; no AI API, accounts or live-weather dependency.
- Searchable wardrobe, source guide viewer, local saved looks and responsive desktop/tablet/mobile navigation.
- Original app icon, favicon, touch icon and web app manifest.
- Responsive 400/800/1024-pixel WebP model images, deferred offscreen garment photos and eager selected pieces. The v0.5 asset optimization reduced the original glTF set by 35.5%; the later open-overshirt mesh adds about 0.27 MB to the library, loaded only for that garment in 3D. Phone previews cap pixel ratio at 1.5 with 1024-pixel shadows. The 3D module remains opt-in and renders on demand.
- Cloudflare Workers static-assets configuration. No server/database required.

## Run locally

Use **Node 24 LTS** (`nvm use` reads `.nvmrc`).

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

Browser integration checks and mockup export:

```sh
npx playwright install chromium
node scripts/browser-check.mjs
```

The default check target is `http://127.0.0.1:5173/`. Set `FIT_PICKER_URL` to test a preview or deployed URL. This verifies clothing selection, camera controls, local save/reload/delete, search, source dialog, seasonal recommendations, undo, mobile navigation, responsive overflow and WebGL fallback, and exports the three mockups.

## Deploy to your Cloudflare account

```sh
npx wrangler login
npm run deploy
```

Wrangler uploads `dist/` as static assets using `wrangler.jsonc`, with SPA fallback. Choose the desired account at deployment if your login has several. No secrets are needed in this repository. Cloudflare Git builds can use `npm ci && npm run build` and deploy command `npx wrangler deploy` with Node 24. GitHub Actions checks every push/PR; it does not deploy automatically without your Cloudflare account’s Git integration or deployment credentials.

## Source fidelity and limits

The originals are in `src/assets/guides/` and are imported through `src/data/source-guides.ts`, so missing files fail the build and production uses versioned image URLs. The guide dialog loads 640-pixel WebP previews (about 0.29 MB combined) instead of all 7 MB of original PNGs; each card still opens its full-size original. Rebuild previews with `node scripts/prepare-guide-previews.mjs`. Catalogue and original outfit records live in `src/data/wardrobe.ts`; IDs preserve each guide’s outfit order. Overlapping pieces are deduplicated conservatively, with uncertainty notes visible in My wardrobe. The updated Autumn/Winter collection takes priority for shared items. Grey and olive sweatshirts are recommendations from the older guide, not confirmed belongings, so the engine excludes them. One source combination containing an unconfirmed sweatshirt remains in the data for provenance.

New seasonal combinations live in `src/data/seasonal-outfits.ts` and `src/data/seasonal-edit-02.ts`. Edit 01 contains 12 combinations with generated model images; Edit 02 adds 96 curated garment/palette combinations with dedicated model photographs. Another 53 model photographs illustrate the confirmed original guide combinations. The shared photo manifest only advertises assets that have been prepared; image-load failures fall back to the garment composition. Every combination uses confirmed, season-appropriate pieces and has a stable ID. The original guide records and saved-look IDs remain unchanged. Model images are styling illustrations, rather than actual photographs of Kevin or exact garment prints. Full-size WebP assets are in `public/outfits/`, with generation briefs in `docs/artwork/outfits/`. New PNG masters are kept in the ignored local `docs/artwork/outfits/originals/` directory; optimized deliverables and responsive variants are committed. Exact prompts for all 149 new photos are in `docs/artwork/outfits/library-prompts.json`.

Season and occasion tags are editorial interpretations of the source combinations. Garment product images are generated, source-informed representations rather than photographs of the exact owned items; prints and small details remain approximate. The brown flannel is user-confirmed solid brown, with no checks or stripes; its catalogue data, product image, optional 3D appearance and winter outfit image reflect that correction. Original guide images remain available from the interface.

The 2D view illustrates a combination, not garment fit or fabric drape. The 3D view now uses authored CC0 human and fitted garment mesh data from MakeHuman / CharacterCreator through the [Three.js glTF workflow](https://threejs.org/manual/pages/load-gltf.html). The old procedural mannequin is removed. The generic body is not Kevin’s likeness or measurements; clothing templates approximate cuts and several wardrobe styles share a model. Open overshirts now use a separate, thinner shirt-derived mesh with baked resting folds, rather than the bulky field jacket. Clean sleeve cuts, different trouser widths, subtle creases and shared fabric normal/roughness maps improve the preview. Exact brands, prints, puffer construction and shoe shapes still require item-specific modelling. This is a working glTF asset pipeline, not a physical cloth or sizing simulation.

### Rebuild the glTF assets

With the dev server running:

```sh
node scripts/prepare-avatar-assets.mjs
```

The script downloads exported CC0 DATA from pinned source commit `852e48f316b90a0937234886630e4fb4cdfd1f78` into ignored `.cache/avatar-source/`. A browser-side build helper applies an adult male morph and relaxed pose, bakes skin/morph data, retains 1024 px skin and 512 px alpha-preserving hair textures, removes unused garment maps, derives an open overshirt with clean polygon clipping and small baked folds, and writes `public/models/*.glb` plus a provenance manifest. It does not import the source project’s GPL application/build code. Source/licence details and silhouette limitations are recorded in [the model notice](public/models/NOTICE.md).

Runtime templates and coverage zones are resolved in `src/lib/avatar-assets.ts`. `avatar-scene.ts` clones the cached glTF data, hides covered faces, applies wardrobe colours and small shared fabric maps, fits trouser cuts around each leg, leaves room for thick inner layers, and derives clean short sleeves / hood-free sweaters / a knee-length coat from the fitted meshes. Mesh and material instances are disposed when selections change; shared template textures remain in a bounded asset cache.

### Prepare responsive outfit photos

After generating the masters described in `docs/artwork/outfits/library-prompts.json` with the built-in ImageGen tool:

```sh
node scripts/prepare-photo-library.mjs
```

The script preserves the 1024-pixel full images, writes 400/800-pixel WebP variants and updates `src/data/outfit-photo-manifest.json`. `--available` supports local work in progress; a full run requires every master. Generation is a development task, with no AI API or generation service in the deployed app.

Product images are in `public/garments/`. The generation briefs, original transparent image atlases, exact generation prompts and a contact sheet are in `docs/artwork/garments/`. `scripts/prepare-garment-atlases.mjs` extracts separate WebP images and removes disconnected transparency specks outside the garment silhouettes. No API calls are made by the deployed app.

[Measured performance changes and further recommendations](docs/performance-review.md) and [personal-use feature suggestions](docs/personal-roadmap.md) document the next priorities.

Saved looks use browser local storage and do not sync across devices. Fonts are served by Google Fonts with system fallbacks. This public prototype contains the user-supplied guide images.

## Design and assets

[Research and design rationale](docs/design-research.md) records Dribbble, Behance and product references, original layout decisions and the app icon’s generation prompt. Implemented responsive mockups:

- [Desktop](docs/mockups/desktop.png)
- [Tablet](docs/mockups/tablet.png)
- [Mobile](docs/mockups/mobile.png)

The generated icon master is `public/app-icon-master.png`; production sizes are exported beside it. User-provided reference assets remain attributed to the supplied guides; no third-party design assets were copied from inspiration sites.
