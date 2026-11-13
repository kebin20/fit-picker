# Fit Picker

A personal wardrobe studio for Kevin. Build outfits on a stylised 3D mannequin, browse seasonal/occasion suggestions drawn from the supplied style guides, and save favourite combinations on your browser.

[Open the Cloudflare prototype](https://fit-picker.kaikei-app.workers.dev)

## Prototype

- React, TypeScript and Vite.
- Three.js procedural mannequin with interchangeable tops, layers, trousers/shorts and shoes, rotation, zoom and reset.
- Flat outfit view and automatic fallback when WebGL is unavailable.
- 49 confirmed garment entries, 2 clearly separated suggested sweatshirts, and 54 combinations transcribed from three source images.
- Seasonal Edit 01: 12 new combinations (three per season), with independent high-resolution styling photographs and why-it-works notes.
- Separate collections for new styling edits and original guide combinations. Original combinations use crisp garment illustrations instead of enlarged guide crops.
- Exact season/occasion filtering over confirmed garments; no AI API, accounts or live-weather dependency.
- Searchable wardrobe, source guide viewer, local saved looks and responsive desktop/tablet/mobile navigation.
- Original app icon, favicon, touch icon and web app manifest.
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

The originals are in `src/assets/guides/` and are imported through `src/data/source-guides.ts`, so missing files fail the build and production uses versioned image URLs. Catalogue and original outfit records live in `src/data/wardrobe.ts`; IDs preserve each guide’s outfit order. Overlapping pieces are deduplicated conservatively, with uncertainty notes visible in My wardrobe. The updated Autumn/Winter collection takes priority for shared items. Grey and olive sweatshirts are recommendations from the older guide, not confirmed belongings, so the engine excludes them. One source combination containing an unconfirmed sweatshirt remains in the data for provenance.

New seasonal combinations live separately in `src/data/seasonal-outfits.ts`. Edit 01 adds 12 genuinely new combinations, with confirmed, season-appropriate garments and no duplicate compositions. Add future edits with stable IDs and image paths; existing saved looks and source IDs remain unchanged. These images are generated styling illustrations, rather than actual photographs of Kevin or exact garment prints. Full-size WebP assets are in `public/outfits/`, with original generated PNGs and generation briefs in `docs/artwork/outfits/`.

Season and occasion tags are editorial interpretations of the source combinations. The 3D view approximates colour, cut and layering, and is not a sizing or drape simulation. Prints and details are illustrative. The complete original outfit photos are available beside recommendations and the original guides can be opened from the interface.

Saved looks use browser local storage and do not sync across devices. Fonts are served by Google Fonts with system fallbacks. This public prototype contains the user-supplied guide images.

## Design and assets

[Research and design rationale](docs/design-research.md) records Dribbble, Behance and product references, original layout decisions and the app icon’s generation prompt. Implemented responsive mockups:

- [Desktop](docs/mockups/desktop.png)
- [Tablet](docs/mockups/tablet.png)
- [Mobile](docs/mockups/mobile.png)

The generated icon master is `public/app-icon-master.png`; production sizes are exported beside it. User-provided reference assets remain attributed to the supplied guides; no third-party design assets were copied from inspiration sites.
