# Free 3D asset evaluation — 16 November 2026

The user chose free/openly licensed assets only. No paid models, subscriptions or API purchases are part of this update.

## Previous assets (v0.12)

Before v0.13, the standing body, hair and garment seeds were the pinned MakeHuman-derived CC0 exports recorded in [the avatar notice](licenses/avatar-model-assets.md). The independent Blender authoring scripts also produce CC0 derivative garments. v0.12 repairs the pilot outfit's overshirt opening/inner-shirt overlap, single pocket, material contrast and lighting. Those are targeted improvements to the current avatar, not a replacement human model.

## Inspected replacement foundation

- Publisher: Blender Studio and community.
- Asset: Human Base Meshes v1.4.1, CC0.
- [Official listing](https://www.blender.org/download/demo-files/).
- [Official direct archive](https://mirror.blender.org/demo/asset-bundles/human-base-meshes/human-base-meshes-bundle-v1.4.1.zip).
- [Blender repository's source/CC0 record](https://projects.blender.org/blender/blender/commit/4c4293010c2e21122b54681cd22556b727efbb11).
- Download SHA-256: `811f43accbb31a88266d932f8f5563b2d13586fca0ba2693aad1f5fe582b3515`.

The 48.2 MiB archive was downloaded into ignored `.cache/human-base-meshes-v1.4.1.zip`, extracted locally and inspected with Blender 4.5.9 LTS with automatic embedded script execution disabled. The realistic male body object (`GEO-body_male_realistic`) has 10,582 source vertices and no material slots. It provides useful anatomy/topology, but does not supply the finished skin, hair, four fitted garments or ready-to-use wardrobe rig needed to match the approved photographic study. The archive is not shipped to phones or added to the repository.

The separate Blender Studio realistic-human training base uses CC-BY, not this bundle's CC0; their provenance must not be conflated. No commercial game character geometry has been extracted.

## Implemented replacement — v0.13.0

The app now loads the Blender Studio form with a relaxed standing pose and
neutral sculpted materials/eyes. It uses a retail display mannequin style, with
no photorealistic skin/hair character claimed. Eighteen CC0 garment constructions
and footwear are refitted from the existing MakeHuman-derived sewn source meshes.
Sleeves use their source arm weights; coat skirt shortening preserves the cuffs.

The lightweight 2D view is rendered from the same geometry/pose and supports
front/back, open layers, printed backs, bare forearms and shorts. It no longer
uses the vector body with stretched product cutouts. The optional interactive
view uses the new form and textures; model photos remain separate.

The shared photo-texture cache is bounded and reference-counted. Fitting, body
coverage, material projection and source-image provenance are checked before
release. These static forms illustrate combinations, rather than measured fit
or live cloth behaviour. Unseen back details remain approximate.

See [the complete source/asset notice](../public/models/tailored/NOTICE.md) and
[the reproducible authoring workflow](../scripts/tailored-avatar/README.md).
