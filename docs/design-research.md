# Fit Picker — design direction

A personal wardrobe studio, with an interactive mannequin, a clear garment picker and source-guide outfit photography. Warm ivory, forest green and muted olive keep the focus on Kevin’s earthy wardrobe. Manrope headings, DM Sans interface text and restrained serif accents distinguish outfit exploration from a shopping catalogue.

## References researched

- [Closetly, Andrey Klimenkov — Behance](https://www.behance.net/gallery/240575227/Closetly-AI-Powered-Virtual-Wardrobe-App): mannequin stage, category selection, garment rail, save collection. Full Behance fetch was restricted; indexed imagery and [Dprofile mirror](https://dprofile.ru/case/161840/closetly-ai-powered-virtual-wardrobe-app) informed the research.
- [Virtual Wardrobe App UI — Dribbble](https://dribbble.com/shots/20848416-Virtual-Wardrobe-App-UI): relevant virtual-wardrobe concept; image CDN unavailable, so no detailed visual claims are based on this source.
- [AI Fashion Shopping App — Dribbble](https://dribbble.com/shots/27541260-AI-Fashion-Shopping-App-Modern-UX-Design): indexed imagery suggests named outfits and a prominent Save Look action. Shopping and social features were outside this prototype’s scope.
- [Stilny product case — Webist](https://webist.agency/works/stilny): wardrobe-first organisation, photo import distinct from finding an outfit.
- [Pureple](https://pureple.com/): distinction between wardrobe pieces, complete looks and illustrative model previews.
- [Wardob](https://wardob.com/): indexed page describes a figure with clothing slots and a garment strip. Full-page fetch unavailable.

These are inspiration sources, not copied templates. Layouts, icon concept and interface code were created for Fit Picker.

## Responsive behaviour

- Desktop: persistent navigation and season filters; mannequin and garment picker side by side; three-column outfit suggestions.
- Tablet: compact icon navigation; mannequin and picker remain side by side when space permits; two/three-column content grids.
- Mobile: stacked mannequin and garment picker, scrollable occasion tabs, persistent bottom navigation; two-column outfit cards.
- Garment selection, rotate/zoom buttons, reset, flat view, save dialog, search, source guides and navigation all work by keyboard or touch. Respect reduced motion. No automatic character rotation.

## Source fidelity

49 confirmed catalogue pieces, 2 suggested sweatshirts and 54 guide combinations. Updated Autumn/Winter collection takes precedence where the guides overlap. Ambiguous mappings are recorded in garment notes in `src/data/wardrobe.ts` and visible in My wardrobe. The original guide images remain available in the interface. Occasion and season metadata are editorial interpretations; no model fit, live-weather, inferred ownership or AI confidence claims are made.

3D geometry is procedural and stylised. It approximates colour and silhouette, without reproducing exact prints, measurements or fabric drape. The Flat lay view and source photos support comparison. Suggested grey and olive sweatshirts are excluded from recommendations until ownership is confirmed.

## Icon

Built-in ImageGen produced the master at `public/app-icon-master.png`; exported PNG sizes cover favicon, Apple touch icon and web app manifest. Prompt: “One polished square app icon for Fit Picker: a distinctive simple ivory clothes hanger whose angled shoulders suggest a tailored lapel, a tiny muted-lime four-point styling sparkle at upper right, deep forest-green edge-to-edge background, flat geometric vector-like design, crisp rounded strokes, small-size legibility, generous safe area. No text, letters, gradients, shadows, mockup, device or multiple options.”

## Mockups

`docs/mockups/desktop.png`, `tablet.png` and `mobile.png` are browser captures of the implemented interface, rather than separate static concepts. They use the same wardrobe data and interactions as the deployed prototype.

## Seasonal Edit 01 — November 13, 2026

Browser feedback identified unclear source-image previews and an overly segmented mannequin. The revised experience removes the sidebar tagline, replaces the Winter/Spring placeholder circles with meaningful season icons, and separates new styling edits from original guide combinations.

The first edit adds twelve new compositions: three per season, using only confirmed, season-appropriate catalogue items. Each has an independent 1024×1536 generated image, a dedicated full-resolution WebP asset and a short styling explanation. Original generated PNGs, prompts and the contact sheet are in `docs/artwork/outfits/`. These illustrate outfits rather than documenting exact garment prints or the owner’s likeness. Each image was generated individually using the built-in ImageGen tool, then encoded as WebP without changing its dimensions or composition. Future edits can be appended in `src/data/seasonal-outfits.ts` using new stable IDs.

Original guide looks now use sharp vector garment overviews instead of magnifying tiny portions of a composite image. The original guides use build-verified image imports with content-hashed production URLs; an unavailable image shows a useful fallback rather than a broken-image icon.

The mannequin uses interpolated garment profiles and continuous curved sleeves, smoother shoulders, a single sculpted head, relaxed hands, curved collars, unified trouser shapes and rounded shoes. It remains an illustrative model, with no claim to fit simulation.

## Photographic wardrobe and composed 2D outfit — November 13, 2026

Further feedback showed that improved procedural geometry still did not provide the natural appearance the owner wanted. The default is now a 2D clothing-only outfit composition, using realistic transparent product photographs. Tops, bottoms and shoes align vertically; an optional layer sits beside the outfit so it does not conceal the chosen shirt. The stage's background slogan has been removed. The prior 3D model is an optional preview rather than the primary experience.

Four photographic asset atlases were created with the built-in ImageGen tool. Their 51 garment images were extracted as separate transparent WebP files and are used consistently across the app. Exact prompts, source-informed briefs, master PNGs, actual extracted image sizes and a contact sheet are retained in `docs/artwork/garments/`. Images represent the catalogue's colours and styles, not verified exact prints or fit. The brown flannel correction takes precedence over inconsistent guide illustrations: it is solid brown, and the earlier generated winter outfit was edited to remove its check.

For a future natural-looking 3D experience, the recommended asset pipeline is a professionally authored, proportionate body with individually fitted garment meshes and realistic fabric materials, loaded using the [Three.js glTF workflow](https://threejs.org/manual/pages/load-gltf.html). Smooth normals alone cannot replace the underlying garment shapes, folds and fit. This is a separate modelling phase rather than another adjustment to the current mannequin.

## Fitted glTF workflow and recommendation scope — November 13, 2026

The user approved beginning the glTF workflow. The procedural mannequin is now replaced by a cached asset-based renderer. CC0 human, hair and fitted clothing DATA are sourced from [CharacterCreator’s exported MakeHuman-based assets](https://github.com/kblood/CharacterCreator/tree/852e48f316b90a0937234886630e4fb4cdfd1f78/output), pinned to commit `852e48f316b90a0937234886630e4fb4cdfd1f78`. The author explicitly licenses those exports as CC0 separately from the GPL application code. No upstream program code is included. A preparation helper applies an adult male morph and relaxed standing pose, bakes it into static GLB files, and reduces unused morph data and texture sizes. Runtime uses authored coverage zones and cloned materials to fit the selected templates and colours.

This is the initial asset-based fitting implementation. The generic body is not the owner’s likeness or measurements. Exact wardrobe cuts, prints and sneaker brands are not fully modelled: several styles share a template. Source, preparation and limitations are in `public/models/NOTICE.md` and `docs/licenses/avatar-model-assets.md`.

Season/occasion filters now sit below the recommendation heading. The manual outfit builder always exposes the confirmed wardrobe independently; changing recommendation filters does not modify the selected pieces or available builder cards. Wardrobe browsing has a separate season filter. “Try this look” remains the explicit action that changes the current outfit.

Edit 02 adds 96 distinct curated compositions: 24 per season, with at least four choices per occasion in every season. The combinations are built from bounded editorial garment/palette templates with season and ownership checks, not a full cartesian wardrobe expansion. They use a responsive 2D garment-photo composition as previews. All looks are available by default, with collection filters and six-at-a-time expansion.

## Complete model-photo library and phone loading — November 14, 2026

The outer slot is now labelled Outerwear, with a persistent selector and explicit removal action. The selected outerwear name stays visible even when browsing tops or shoes. The separate coat mesh retains its tailored upper shape and now reaches clearly to the knee; other categories still use generic fitted templates.

All 161 selectable combinations now have dedicated model photographs: the existing 12 Edit 01 images, 96 Edit 02 images and 53 confirmed original-guide combinations. The source-only suggested-grey-sweatshirt look remains excluded. Each new portrait was generated separately with the built-in ImageGen tool from a garment-level brief. Prompts and four contact sheets are recorded alongside optimized deliverables; images illustrate styling and do not claim exact prints or the owner's likeness.

Phone loading uses explicit near-viewport image deferral and responsive WebP sizes; the selected 2D outfit remains eager. Guide previews are small WebPs with full-size original links. Unused garment textures are removed from glTF exports and the hair texture is reduced while preserving alpha and geometry. The optional phone renderer uses a smaller drawing buffer and shadow map. The performance review records measured asset savings and the remaining priorities.
