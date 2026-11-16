# Outfit library refresh — v0.10.0

The five unowned catalogue items were already excluded. This update replaces the 20 active model portraits whose tees still showed earlier designs, colour or pocket details. All 133 active combinations retain their garment IDs, occasion/season tags, favourites and saved-look references.

The **built-in image_gen tool** edited each existing full-body model portrait using the corrected product cutout as its second reference. Identity, pose, outerwear, trousers/shorts, shoes and studio setting were preserved. The exact [prompts and reference paths](prompts.json) are recorded per image. Small print details and fit remain illustrative; the white front logo is a small circular mark because its wording is unknown.

## Updated images

[Before](before.png) · [Review all 20 updated portraits](contact-sheet.png). Final assets have responsive 400/800/1024 px versions; [dimensions and encoded sizes](sizes.json) are recorded. PNG masters are retained locally in ignored `originals/`.

| Outfit ID | Corrected tee | Full-size portrait |
| --- | --- | --- |
| styled-spring-02 | cream-tee | [Image](../../../../public/outfits/styled-spring-02-wardrobe-v2.webp) |
| styled-summer-03 | cream-tee | [Image](../../../../public/outfits/styled-summer-03-wardrobe-v2.webp) |
| styled-spring-edit02-01 | cream-tee | [Image](../../../../public/outfits/styled-spring-edit02-01-wardrobe-v2.webp) |
| styled-spring-edit02-02 | cream-tee | [Image](../../../../public/outfits/styled-spring-edit02-02-wardrobe-v2.webp) |
| styled-spring-edit02-03 | cream-tee | [Image](../../../../public/outfits/styled-spring-edit02-03-wardrobe-v2.webp) |
| styled-spring-edit02-04 | cream-tee | [Image](../../../../public/outfits/styled-spring-edit02-04-wardrobe-v2.webp) |
| styled-summer-edit02-21 | pink-tee | [Image](../../../../public/outfits/styled-summer-edit02-21-wardrobe-v2.webp) |
| styled-summer-edit02-22 | pink-tee | [Image](../../../../public/outfits/styled-summer-edit02-22-wardrobe-v2.webp) |
| styled-summer-edit02-23 | pink-tee | [Image](../../../../public/outfits/styled-summer-edit02-23-wardrobe-v2.webp) |
| styled-summer-edit02-24 | pink-tee | [Image](../../../../public/outfits/styled-summer-edit02-24-wardrobe-v2.webp) |
| aw-autumn-6 | ukiyoe-tee | [Image](../../../../public/outfits/aw-autumn-6-wardrobe-v2.webp) |
| aw-winter-8 | black-cat-tee | [Image](../../../../public/outfits/aw-winter-8-wardrobe-v2.webp) |
| ss-r1 | black-cat-tee | [Image](../../../../public/outfits/ss-r1-wardrobe-v2.webp) |
| ss-r4 | pink-tee | [Image](../../../../public/outfits/ss-r4-wardrobe-v2.webp) |
| ss-c1 | cream-tee | [Image](../../../../public/outfits/ss-c1-wardrobe-v2.webp) |
| ss-f1 | white-graphic-tee | [Image](../../../../public/outfits/ss-f1-wardrobe-v2.webp) |
| ss-f2 | burton-tee | [Image](../../../../public/outfits/ss-f2-wardrobe-v2.webp) |
| ss-f4 | black-tee | [Image](../../../../public/outfits/ss-f4-wardrobe-v2.webp) |
| ss-h1 | white-graphic-tee | [Image](../../../../public/outfits/ss-h1-wardrobe-v2.webp) |
| ss-h4 | cream-tee | [Image](../../../../public/outfits/ss-h4-wardrobe-v2.webp) |

## Keeping combinations consistent

The card caption and image alternative text resolve the current garment names, including the cream pocket tee and Burton chest-logo tee. The product/2D/3D views continue to use those same stable garment IDs. No unowned garment was substituted into a source combination.

Each portrait has a small appearance fingerprint covering clothing IDs, names, cut/type, colour, pattern, pocket and current product-photo URL. Changes to an actual pictured garment, or a personal uploaded photo, switch that card to the current garment composition. Notes, weather and season filters do not change the photo fingerprint. This prevents an older portrait from silently showing superseded clothes.

Refreshed URLs use `-wardrobe-v2`, including the 400/800 px variants. No live image-generation service, account or API call was added to the app. All portraits remain lazy loaded, and the optional 3D module remains deferred.

## Rebuild and verify

After restoring the local masters:

```sh
node scripts/prepare-refreshed-outfit-photos.mjs
npm test
npm run build
node scripts/check-outfit-refresh.mjs
```

The general `prepare-photo-library.mjs` preserves revised metadata and does not overwrite these edits with older masters. Existing appearance fingerprints are retained until an explicitly refreshed image is prepared.

The browser check decodes all 20 revised portraits, checks live captions and Try this look, excludes unowned combinations, verifies phone/tablet/desktop reflow and exercises the fallback after a personal edit. It writes screenshots and `browser-verification.json` here. These are Chromium checks rather than physical phone testing.
