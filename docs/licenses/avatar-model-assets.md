# Fitted avatar asset notice

The character, hair and clothing model DATA are **CC0-1.0** exports from Kasper Olesen's CharacterCreator project, derived from MakeHuman CC0 system assets.

- Source: https://github.com/kblood/CharacterCreator/tree/852e48f316b90a0937234886630e4fb4cdfd1f78/output
- Pinned source commit: `852e48f316b90a0937234886630e4fb4cdfd1f78`
- Author's explicit CC0 dedication for generated GLBs and data: https://github.com/kblood/CharacterCreator/blob/852e48f316b90a0937234886630e4fb4cdfd1f78/LICENSE-NOTES.md#generated-files-owner-decision-2026-10-03
- CC0 terms: https://creativecommons.org/publicdomain/zero/1.0/
- MakeHuman system asset provenance: https://static.makehumancommunity.org/assets/assetpacks.html

Only exported model/data files were imported. No GPL application, plugin or build code from that project is included in Fit Picker. Fit Picker's loader, material handling, pose bake and coverage filtering are implemented separately.

The shipped GLBs contain a generic adult male body, short hair, a T-shirt, shirt, derived open overshirt, hoodie/sweater base, trousers, shorts, shoes, jacket, coat and an underlayer. The preparation script applies an adult male morph and a relaxed standing pose, bakes skin/morph deformation, removes unused morph data, keeps skin textures capped at 1024 pixels, caps alpha-preserving hair textures at 512 pixels, and removes unused garment textures that runtime materials replace with plain wardrobe colours. `manifest.json` lists the actual files and their sizes.

The open overshirt is derived from the fitted shirt: polygon clipping creates the front opening, one offline subdivision supports small resting folds, and the result is baked into its own GLB. Runtime layering adds room for thicker tops. Short sleeves use intersected cuff edges, and trouser cuts add leg room around each leg’s centre while preserving the waist. Clothing uses shared 128-pixel normal/roughness maps and a restrained fabric sheen; these maps add no colour prints or checks.

These are generic fitting templates, not scans of Kevin or measured models of his clothes. Several categories still share a silhouette: bomber and puffer use the fitted jacket template; sneaker shapes and trouser cuts remain approximate. Sweaters omit the hood component, and the coat hem is adapted to knee length. Static folds are not physical cloth simulation. Exact brand details, garment prints and physical sizing are not reproduced. Product photographs and the original guides remain the references for item identity.
