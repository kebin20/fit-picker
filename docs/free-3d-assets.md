# Free 3D asset evaluation — 16 November 2026

The user chose free/openly licensed assets only. No paid models, subscriptions or API purchases are part of this update.

## Current shipped assets

The standing body, hair and garment seeds remain the pinned MakeHuman-derived CC0 exports recorded in [the avatar notice](licenses/avatar-model-assets.md). The independent Blender authoring scripts also produce CC0 derivative garments. v0.12 repairs the pilot outfit's overshirt opening/inner-shirt overlap, single pocket, material contrast and lighting. Those are targeted improvements to the current avatar, not a replacement human model.

## Inspected replacement foundation

- Publisher: Blender Studio and community.
- Asset: Human Base Meshes v1.4.1, CC0.
- [Official listing](https://www.blender.org/download/demo-files/).
- [Official direct archive](https://mirror.blender.org/demo/asset-bundles/human-base-meshes/human-base-meshes-bundle-v1.4.1.zip).
- [Blender repository's source/CC0 record](https://projects.blender.org/blender/blender/commit/4c4293010c2e21122b54681cd22556b727efbb11).
- Download SHA-256: `811f43accbb31a88266d932f8f5563b2d13586fca0ba2693aad1f5fe582b3515`.

The 48.2 MiB archive was downloaded into ignored `.cache/human-base-meshes-v1.4.1.zip`, extracted locally and inspected with Blender 4.5.9 LTS with automatic embedded script execution disabled. The realistic male body object (`GEO-body_male_realistic`) has 10,582 source vertices and no material slots. It provides useful anatomy/topology, but does not supply the finished skin, hair, four fitted garments or ready-to-use wardrobe rig needed to match the approved photographic study. The archive is not shipped to phones or added to the repository.

The separate Blender Studio realistic-human training base uses CC-BY, not this bundle's CC0; their provenance must not be conflated. No commercial game character geometry has been extracted.

## Remaining work for a replacement avatar

1. Author the new generic adult body/head, UVs, skin/eye/hair materials and relaxed pose using documented open sources. The base mesh alone is not a finished character.
2. Fit the first outfit to that body: collared navy shirt, open brown overshirt with one patch pocket, grey slacks and black sneakers. Approve front, side and back silhouettes against the generated visual target.
3. Bake the cloth folds and normal/roughness maps offline; retopologise and compress for mobile. Recompute every body and inner-layer coverage mask against the actual exported topology. Current masks cannot be transferred to a new body.
4. Verify rotation, layering, print placement, bare limbs, clipping, loading failures and phone memory/render costs before replacing the current viewer. Expand the remaining wardrobe after that pilot passes visual review.

MakeHuman's [official asset catalogue](https://static.makehumancommunity.org/assets/assetpacks.html) lists CC0 male skin, eyebrow and garment packs that may help the authoring phase. Its community packs have different licences; each used file must be checked and recorded individually. No uninspected pack is bundled by this release.
