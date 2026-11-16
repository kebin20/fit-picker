# Replacement mannequin authoring

`build.py` exports the standing CC0 Blender Studio form and eighteen refitted
clothing constructions plus footwear. The garment data comes from the pinned
CC0 MakeHuman-derived seeds already documented in `public/models/NOTICE.md`.
Source-program GPL code is not imported. The garment helper imported from
`scripts/garments/build_models.py` is Fit Picker's own independent implementation.

The official body archive must be extracted to
`.cache/human-base-meshes/human-base-meshes-bundle-v1.4.1/`. Its download and
checksum are recorded in `public/models/tailored/NOTICE.md`. Blender 4.5 LTS is an
offline authoring tool only. With that executable available, run:

```sh
"$FIT_PICKER_BLENDER" --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/tailored-avatar/build.py -- --all
```

Run the Vite app on port 5201, then generate the lightweight 2D library:

```sh
FIT_PICKER_URL=http://127.0.0.1:5201/ node scripts/tailored-avatar/render.mjs
```

The renderer uses the same runtime geometry, pose, material projection and
front/back source photos. Shirt layers get separate open-front passes. Body
regions allow bare forearms and lower legs without leaking a hidden torso
through clothing. Filenames include content hashes; the manifest records source
photo checksums, 3D library provenance and renderer source hashes. Tests reject
stale 2D output after model/material/reference changes. Re-running replaces this
dedicated generated image directory.

The current body is a neutral sculpted display form. A textured human character
is a different asset/style; this pipeline does not claim to produce one. Cloth
rests in a static authored pose, with no browser cloth simulation or fit advice.
