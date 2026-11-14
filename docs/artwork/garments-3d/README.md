# Garment constructions — v0.7

The app now uses 18 independently built garment families, with appropriate shared cuts for related wardrobe pieces. Sizing remains illustrative. The existing generic adult male avatar remains the fitting reference.

| Construction | Visible geometry/detail |
| --- | --- |
| Tee / long-sleeve tee | Cotton drape and separate sleeve lengths |
| Sweatshirt | Crew neckline, rib cuffs and hem, heavier fabric |
| Hoodie | Down hood, kangaroo pocket, drawcords and rib bands |
| Short / long shirt | Collar, placket, buttons, chest pocket and clean cuffs |
| Short / long overshirt | Open front, more room over a top, pockets and buttons |
| Bomber | Short, fuller shell, rib collar/cuffs/hem and zip/welt pockets |
| Puffer | Volumetric quilt channels, insulated stand collar and zip opening |
| Rain jacket | Lightweight hooded shell, zip and welt pockets |
| Coat | Connected flared knee-length skirt, notched lapels, single button row and welt pockets |
| Shorts | Short hem and cotton drape |
| Slim / regular / wide / barrel / ankle trousers | Separate cut, drape and hem treatment |

The Blender pipeline starts from already posed CC0 DATA, welds garment UV seams, establishes the outward orientation of open panels, and tailors the construction. Anatomical arm weights from the source data keep sleeve tailoring separate from the torso. The coat skirt is a connected mesh. Fabric ease, mass and bending differ by garment; shoulder/neck and cuff anchors keep the static standing fit stable. A 32-frame offline cloth solve settles the cloth. High-detail geometry is baked into a compact normal map on the decimated mesh. Details are separate material roles so applying wardrobe colours does not erase the baked normals or turn a zipper into cloth.

The app receives static, compressed meshes. It does not simulate cloth, generate images or call an AI API. Each garment is 88–404 KB, uses fewer than 11,000 triangles, and embeds a 256-pixel normal map (512 pixels for coat/puffer). The complete new library is 2,974,808 bytes. The default six GLBs total 2,462,100 bytes, versus 2,444,644 in v0.6; the decoder is an additional first-use download shared by all garments. It uses one worker and is served from this app.

Body masks use the actual final meshes and original anatomical boundaries. Imported body vertex positions are verified against the body glTF before producing bitsets. The runtime recognizes the exporter's double-prefixed custom zone attribute. Layer masks are generated against the exact primitives decoded by the app's loader, retaining openings/collars/cuffs and removing hidden inner fabric. Only the resulting bitsets run on the phone.

Run `npm run models:build` with Blender 4.5 LTS and the Vite dev server running; set `FIT_PICKER_BLENDER` when Blender is not in its usual location. Editable `.blend` files and build maps stay in ignored `.cache/garment-build/`. `npm run models:check` validates committed assets and updates the provenance registry. `npm run test:garments` exercises all constructions, 18 layered outfits, camera views and idle rendering, and captures the images in `review/`.

- [Before/after comparison](comparison.png)
- [Browser verification](browser-verification.json)
- Model records: `public/models/garments/catalogue.json`
- Scripts: `scripts/garments/`

These are illustrative cuts based on the supplied wardrobe, not scans or measurements of the owned clothes. Exact prints, brand construction and physical fit remain approximate. Reference documentation: [Blender cloth caching](https://docs.blender.org/manual/en/latest/physics/cloth/settings/cache.html), [glTF evaluated-mesh export](https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html), [Three.js glTF and Draco loading](https://threejs.org/docs/pages/GLTFLoader.html).
