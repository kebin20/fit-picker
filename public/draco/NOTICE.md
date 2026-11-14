# Draco decoder

These two decoder files are the glTF WebAssembly decoder bundled with Three.js 0.181.2 (`examples/jsm/libs/draco/gltf/`), from Google's Draco project. They are distributed under the included Apache License 2.0. See https://github.com/google/draco.

Fit Picker serves them locally, only when its optional 3D preview first encounters a compressed garment. The app uses one decoder worker. There is no decoder CDN request. Unsupported or failed 3D loading returns to the 2D outfit view.
