# Fit Picker

A personal wardrobe studio for Kevin. Assemble outfits with realistic photographic garment cutouts, browse seasonal/occasion suggestions drawn from the supplied style guides, and save favourite combinations on your browser.

[Open the Cloudflare prototype](https://fit-picker.kaikei-app.workers.dev)

## Prototype

- React, TypeScript and Vite.
- A composed 2D outfit view is the default: the selected top, bottoms and shoes form an outfit, with the optional outer layer alongside.
- 46 active transparent product-style garment photographs replace the former SVG drawings throughout the wardrobe, picker, outfit overviews and saved looks.
- The optional Three.js 3D preview loads a fitted human body, hair and separate clothing models through `GLTFLoader`, with clothing swaps, rotation, zoom and reset. Model/WebGL failures return to 2D. A persistent Outerwear selector changes/removes the outer layer from any builder tab. Eighteen garment constructions have offline cloth drape and embedded normal maps: quilted puffer, ribbed bomber, rain shell, knee-length coat, shirts/overshirts, cotton tops and separate trouser cuts.
- 44 confirmed garment entries, 2 clearly separated suggested sweatshirts, 5 unowned archive records, and 54 original combinations transcribed from three source images.
- Seasonal Edit 01: 12 new combinations (three per season), with independent high-resolution styling photographs and why-it-works notes.
- Seasonal Edit 02: 96 additional combinations (24 per season), each with its own generated full-body model photograph. Every season/occasion has multiple choices; all compositions are distinct from the existing guides and edit.
- The library retains 161 model photographs. After the ownership corrections, 133 combinations are selectable: 91 seasonal edits and 42 original guide looks. Combinations using unowned garments or the suggested grey sweatshirt remain excluded; their source records and historical photos are preserved. Original guide PNGs are preserved in the source viewer.
- Recommendation filters live under “Right for the occasion”. They change the suggested looks only; the outfit builder shows the confirmed wardrobe independently. Wardrobe browsing has its own season filter.
- Exact season/occasion filtering over confirmed garments; no AI API, accounts or live-weather dependency.
- Searchable wardrobe, source guide viewer, local saved looks and responsive desktop/tablet/mobile navigation.
- Original app icon, favicon, touch icon and web app manifest.
- Responsive 400/800/1024-pixel WebP model images, deferred offscreen garment photos and eager selected pieces. The original glTF set was optimized in v0.5; v0.7 adds 18 compressed garment models totalling 2.97 MB, loaded by selection. The default six-model outfit totals 2.46 MB. A locally served Draco decoder loads once when 3D opens. Phone previews cap pixel ratio at 1.5 with 1024-pixel shadows. The 3D module remains opt-in and renders on demand.
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
npx playwright install chromium webkit
npm run build
npm run test:browser
```

The browser suite starts and closes its own production preview on port 5175. Set `FIT_PICKER_URL` to test an existing preview or deployed URL instead. It checks clothing selection, camera controls, saved looks, backup/restore, photo-upload ordering, keyboard focus, offline reload/update recovery, image/model failure fallbacks, and Chromium/WebKit phone/tablet layouts. The responsive checks include actual hit testing above the fixed navbar, short viewports and synthetic safe areas. On Linux, install browser dependencies with `npx playwright install --with-deps chromium webkit`. GitHub Actions runs the same unit/build/browser checks and keeps browser reports as an artifact. The original `node scripts/browser-check.mjs` still runs independently (default port 5173) and exports the three mockups.

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

The 2D view illustrates a combination, not garment fit or fabric drape. The optional 3D view uses an authored CC0 human with separate garment constructions. Blender cloth simulation, tailoring, pocket/collar/cuff geometry and high/low normal baking run offline. The app loads static, Draco-compressed GLBs; it does not run a cloth solver. Eighteen families cover the confirmed wardrobe, with shared cuts for related pieces and colours applied at runtime. These are wardrobe-informed fitting illustrations, not scans, measured personal sizing or exact brand replicas. Product photos and supplied guides remain the item references.

### Rebuild the 3D garments

Keep the Vite dev server running, and use Blender **4.5 LTS** for asset authoring. Blender is not needed to run or deploy the app. The original CC0 pose/seed preparation remains available:

```sh
node scripts/prepare-avatar-assets.mjs
FIT_PICKER_BLENDER=/path/to/blender npm run models:build
npm run models:check
npm run test:garments
```

The first command downloads only exported CC0 DATA from pinned source commit `852e48f316b90a0937234886630e4fb4cdfd1f78`. The garment builder uses those posed seeds, builds separate silhouettes and details, runs a 32-frame cloth solve, bakes normal maps, decimates and compresses the final meshes. Source code from CharacterCreator's GPL application/build pipeline is not copied. The original seed GLBs are retained for reproducible builds; new wardrobe clothing requests use `public/models/garments/`.

Editable Blender scenes and temporary maps live in ignored `.cache/garment-build/`. Committed GLBs embed 256-pixel normal maps (512 pixels for the coat and puffer). The complete garment library totals 2,974,808 bytes; individual files range from 88 to 404 KB. See [construction notes and review images](docs/artwork/garments-3d/README.md) and [asset/licence provenance](public/models/NOTICE.md).

Body masks are baked against the final meshes and checked against the exact body vertex positions. Layer masks retain visible fronts, collars, hoods and cuffs while removing covered inner fabric. The client only applies small bitsets at selection time. `src/lib/avatar-assets.ts` routes items to their construction; material handling preserves each normal bake while applying wardrobe colours. Geometry/material instances are disposed when outfits change. Template textures use a bounded cache, and one decoder worker handles compression. A failed model or decoder returns to 2D.

[Before/after garment comparison](docs/artwork/garments-3d/comparison.png) shows actual renders of the old shared jacket and the new separate outerwear.

### Prepare responsive outfit photos

After generating the masters described in `docs/artwork/outfits/library-prompts.json` with the built-in ImageGen tool:

```sh
node scripts/prepare-photo-library.mjs
```

The script preserves the 1024-pixel full images, writes 400/800-pixel WebP variants and updates `src/data/outfit-photo-manifest.json`. `--available` supports local work in progress; a full run requires every master. Generation is a development task, with no AI API or generation service in the deployed app.

Product images are in `public/garments/`. The generation briefs, original transparent image atlases, exact generation prompts and a contact sheet are in `docs/artwork/garments/`. `scripts/prepare-garment-atlases.mjs` extracts separate WebP images and removes disconnected transparency specks outside the garment silhouettes. No API calls are made by the deployed app.

[Measured performance changes and further recommendations](docs/performance-review.md) and [personal-use feature suggestions](docs/personal-roadmap.md) document the next priorities.

[The v0.10.1 app audit](docs/app-audit-2026-11-16.md) covers phone/tablet navbar clearance, dialog focus/scrolling, saved-look and backup integrity, photo-upload races, offline update recovery and recommendation ranking. [Runtime measurements and remaining performance options](docs/performance-audit-2026-11-16.md) distinguish local resource checks from physical-device performance.

Saved looks use browser local storage and do not sync across devices. Fonts are served by Google Fonts with system fallbacks. This public prototype contains the user-supplied guide images.

## Design and assets

[Research and design rationale](docs/design-research.md) records Dribbble, Behance and product references, original layout decisions and the app icon’s generation prompt. Implemented responsive mockups:

- [Desktop](docs/mockups/desktop.png)
- [Tablet](docs/mockups/tablet.png)
- [Mobile](docs/mockups/mobile.png)

The generated icon master is `public/app-icon-master.png`; production sizes are exported beside it. User-provided reference assets remain attributed to the supplied guides; no third-party design assets were copied from inspiration sites.

## Personal wardrobe tools (v0.8)

Lock selected clothing slots to filter recommendations around them, mark pieces unavailable/in laundry, and record “Wore this today”. Favourites rank first, with fewer matching looks worn within the last 14 days. Hidden suggestions can be restored. Manual temperature/rain controls use broad warmth rules and your garment settings; rain variations replace the outer layer with the confirmed rain jacket and use garment compositions rather than unrelated model photos.

The current draft, filters, locks and preferences persist locally. Saved looks can be renamed/updated without duplicates, and deletion has an undo. Export a JSON backup from Saved looks; importing previews counts and requires an explicit replacement action, with undo available until reload. Backups include garment edits, resized photos, availability and wear history. Import validation and storage rollback protect the existing data. This is manual transfer, not automatic cloud sync.

My wardrobe → Add garment / Edit piece supports photos, colour, garment type, seasons, warmth and notes. Photos are resized to at most 640 px and stored locally (max 180 KB encoded each); a failed storage write reports an error. New garments use the closest illustrative 3D family and can be assembled/saved in the builder. The curated recommendation library remains based on the original wardrobe.

“Keep outfit offline” or Saved looks → “Keep offline” stores that outfit’s garment images. On the first explicit offline request, a service worker caches the small app shell; it does not precache the full photo library or 3D models. Open the app online once before using offline favourites. Custom photos remain in local wardrobe data. Fonts use system fallbacks offline. Wardrobe searches are cleared when entering the studio. Baked wrinkle shading is softened without increasing model size.

Run `node scripts/check-personal.mjs` against the production preview on port 5174 (or set `FIT_PICKER_URL`) for isolated phone tests including actual offline reload, photo editing, backups and personal filters.

## Readability update (v0.8.1)

The studio subheading and sidebar wardrobe-message card have been removed. Main labels and controls use 16 px text, supporting copy uses 14–15 px, and small metadata has a 12 px floor. Muted text is darker, with more line spacing and less tracking on uppercase labels. The 2D outfit annotations retain their readable size when the garment composition scales.

Outfit/saved cards use a single column on phones, the builder stacks on narrower tablets, and garment names have more room to wrap. Form fields use at least 16 px text. The backup file picker also fits narrow phones. Responsive model-image sizes follow the wider phone cards; image loading and the optional 3D module remain deferred.

Verification: 41 unit tests and the production build passed; the browser regression passed; studio, wardrobe and saved pages were checked at 320, 390, 588, 787, 820, 960, 1024, 1176, 1440 and 1920 px with no horizontal page overflow or visible text below 12 px. Desktop/tablet/phone mockups above show the updated interface. These are Chromium checks, not a full accessibility audit or a physical-device test.

## Wardrobe corrections and both-side previews (v0.9.0)

The cream graphic tee and white collared shirt are excluded as unowned. Colour captions have been removed from wardrobe images. Six tee designs now follow the user’s corrections and product references. My wardrobe and the 2D builder offer front/back views for the white graphic and yellow fox tees. The optional 3D avatar has matching front/back prints and camera presets. Older saved looks remain available and can be repaired by choosing a replacement piece.

[Assets, exact generation prompts, source references and verification](docs/artwork/garments/corrections/README.md) document the changes. Product cutouts are capped at 640 px, optional 3D print maps at 512 px; back photos and print textures remain deferred. Full-body recommendation portraits remain styling illustrations and were not regenerated in this update.

## Additional ownership corrections (v0.9.1)

The plain yellow tee, navy crew-neck tee and white long-sleeve tee are excluded as unowned, leaving 44 confirmed pieces and 133 compatible outfit combinations. The yellow fox tee, navy collared shirt and navy sweatshirt remain owned. The cream tee has a darker warm cream colour and a chest patch pocket in its optimized photograph and optional 3D construction. Historical saved looks can still be opened and repaired.

## Outfit library refresh (v0.10.0)

All 20 active outfit portraits containing corrected tees have been replaced with reference-informed edits: the darker cream pocket tee, pink cursive adidas tee, Coffee cat tee, circular-front white graphic tee, fox-print yellow tee and both Burton tees. The 133 owned-wardrobe combinations and their stable IDs remain intact. Outfit-card captions resolve current catalogue names.

Portrait metadata now records the pictured clothing appearance. A later change to a garment’s image, colour, cut, pocket or name invalidates that portrait and shows the current garment composition until a matching portrait is prepared. Uploaded personal photos also use the garment composition. Weather/notes do not invalidate a matching portrait. Versioned 400/800/1024 px URLs replace stale cached copies while keeping lazy loading.

[Refreshed model photos, exact prompts, before/after review and verification](docs/artwork/outfits/wardrobe-refresh/README.md). Rebuild revised variants with `node scripts/prepare-refreshed-outfit-photos.mjs` after supplying the local PNG masters. The general photo-preparation script preserves revised portrait entries.
