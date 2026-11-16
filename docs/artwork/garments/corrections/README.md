# Wardrobe corrections and front/back previews — v0.9.1

User corrections from 16 November 2026 override the older guide illustrations.

- Cream graphic tee, white collared shirt, plain yellow tee, navy crew-neck tee and white long-sleeve tee are not owned. All five are hidden from the wardrobe, builder and recommendations, including when suggested pieces are enabled. Historical IDs remain available for older saved looks, backups and guide provenance. An old saved look stays saved; opening it clears the removed clothing slot and lets the user replace that piece. Older edits/imports cannot silently re-enable either item.
- Colour captions have been removed from inside the wardrobe images. Suggested-purchase status remains below the corresponding garment name.
- Pink tee: white cursive adidas lettering, no symbol logo.
- Black cat tee: supplied Coffee/cat panel on the front.
- White graphic tee: small circular front mark, with wording intentionally unconfirmed; the supplied #Meow Monday illustration is on the back.
- Yellow UNIQLO 485667, colour 47: tiny fox above the front pocket and a walking fox carrying a pole/bundle on the back. No waves.
- Burton tee: the five vertically stacked symbols from the supplied product reference.
- Other black tee: a small square mountain/BURTON chest mark, as described by the user.

## Optimized assets

[Cream pocket tee](../../../../public/garments/cream-tee-v2.webp): darker warm cream with a plain chest pocket. Its matching small 3D patch follows the visible tee surface and is omitted where outerwear masks cover it. The [cream-pocket edit prompt](cream-pocket-prompt.json) records the latest correction.

The built-in **image_gen** tool produced the photographic cutouts and transparent ink maps. [Exact cutout prompts](prompts.json) and [exact print-texture prompts](prints/prompts.json) record the inputs and constraints. These are reference-informed representations; small print details and fabric cuts remain illustrative. The white front-logo wording was not supplied, so its ring is only an approximate mark.

Final cutouts (maximum 640 px):

- [Pink tee](../../../../public/garments/pink-tee-v2.webp)
- [Black cat tee](../../../../public/garments/black-cat-tee-v2.webp)
- [White tee front](../../../../public/garments/white-graphic-tee-v2.webp) and [back](../../../../public/garments/white-graphic-tee-back-v2.webp)
- [Yellow fox tee front](../../../../public/garments/ukiyoe-tee-v2.webp) and [back](../../../../public/garments/ukiyoe-tee-back-v2.webp)
- [Burton vertical-symbol tee](../../../../public/garments/burton-tee-v2.webp)
- [Burton chest-mark tee](../../../../public/garments/black-tee-v2.webp)

Eight transparent [3D print maps](../../../../public/prints/) are capped at 512 px. [Dimensions and encoded sizes](prints/sizes.json) are recorded separately. Masters remain in the ignored local `*-master.png` files beside these notes. Rebuild optimized files with `node scripts/prepare-garment-corrections.mjs` and `node scripts/prepare-garment-prints.mjs` after supplying the masters.

## Viewing both sides

My wardrobe has Front/Back buttons for the two tees with supplied back designs. In the 2D outfit builder, **Top view** changes only that tee photo; the separate trousers, footwear and outerwear remain visible. The 3D preview has Front/Back camera presets for the whole avatar, plus the existing drag/rotation controls. Presets reset a previously dragged camera without rebuilding the avatar.

The corrected tee prints project onto the existing cloth surface, after outerwear masks are applied. Front and back ink maps have independent outward-facing projectors. No runtime cloth simulation or new garment mesh is required. The generic tee cut and optional 3D body remain fitting illustrations, not measured personal sizing. The subsequent [outfit-library refresh](../../outfits/wardrobe-refresh/README.md) updates all 20 affected active model portraits to these corrected references. Exact fit and fine print details remain illustrative.

Back photos load on the first Back selection. 3D code, mesh files and the selected tee's print maps load only after opening 3D. At most eight small print textures are shared across outfit changes; the renderer remains event-driven. Offline favourites cache the revised front photos through the same shared photo resolver; back photos and 3D maps are not precached.

## References

User-provided links, downloaded only for authoring:

- [UNIQLO Ukiyo-e Animals UT 485667, colour 47](https://www.uniqlo.com/jp/ja/products/E485667-000/00?colorDisplayCode=47&sizeDisplayCode=005)
- [Black cat/coffee front](https://m.media-amazon.com/images/I/61RR-ImOQTL._SS568_.jpg)
- [White tee back](https://m.media-amazon.com/images/I/61kduDcot0L._SS568_.jpg)
- [Burton symbols tee](https://media2.locally.com/spec-640x640/170-808036-3162168-image-1289525.png)

## Verification

`npm test`, `npm run build` and `node scripts/check-wardrobe-corrections.mjs`. The focused browser check covers deferred requests, product/front/back image decoding, 3D print placement, idle rendering, six responsive widths and repair of a saved look containing an unowned item. Captured phone views and the machine-readable report are saved alongside these notes. Chromium emulation does not replace a physical phone test.
