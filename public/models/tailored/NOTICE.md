# Replacement fitted mannequin (v0.13.1)

The model geometry in this directory is CC0-1.0. Source data and transformations:

- Body: Blender Studio/community Human Base Meshes v1.4.1, object `GEO-body_male_realistic`. Source: https://www.blender.org/download/demo-files/ and https://mirror.blender.org/demo/asset-bundles/human-base-meshes/human-base-meshes-bundle-v1.4.1.zip . Archive SHA-256: 811f43accbb31a88266d932f8f5563b2d13586fca0ba2693aad1f5fe582b3515 . The standing pose, featureless display head, subdivision/retopology and export are authored by Fit Picker.
- Garment seeds: MakeHuman-derived CC0 model data exported by Kasper Olesen's CharacterCreator, pinned at 852e48f316b90a0937234886630e4fb4cdfd1f78. Source: https://github.com/kblood/CharacterCreator/tree/852e48f316b90a0937234886630e4fb4cdfd1f78/output . Explicit data licence: https://github.com/kblood/CharacterCreator/blob/852e48f316b90a0937234886630e4fb4cdfd1f78/LICENSE-NOTES.md#generated-files-owner-decision-2026-10-03 . No upstream GPL application/build code is included.
- Independent fitting code adjusts the sewn garment geometry to the replacement form, with arm-weight-aware sleeve/coat treatment, separate short/long/open constructions, trouser cuts and pocket/button/collar details. The derivative geometry is also provided under CC0-1.0.

These files contain static geometry and plain materials, without embedded garment photography. At runtime the app applies its existing wardrobe images as illustrative textures. Photographs, brand artwork and generated styling renders retain their own provenance/permissions; this geometry dedication does not relicense them.

This is a neutral retail display mannequin, not a scan of Kevin, a photorealistic game character, a measured clothing reconstruction or a live cloth/sizing simulation. Front/back 2D images are prepared from the same geometry using the independent renderer in `scripts/tailored-avatar/`. Unseen garment construction is approximate.
