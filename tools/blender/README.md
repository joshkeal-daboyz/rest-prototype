# Asset pipeline: Synty FBX packs to GLB (ticket 038)

Turns purchased FBX packs into one GLB per pack, plus a manifest, with headless Blender.
This only makes the files. The 3D view doesn't load them yet.

**Nothing in `assets/private/` may ever be committed.** The repo is public and the Synty licence forbids sharing
the source files. `assets/private/` is in `.gitignore`; `git status` must show nothing under it.

## Install Blender (once)

Blender 4.2 or newer (free): https://www.blender.org/download/ or `winget install BlenderFoundation.Blender`.
The script finds it in this order: the `BLENDER_PATH` environment variable (a path to `blender.exe`), then
`blender` on `PATH`, then (Windows) the newest `C:\Program Files\Blender Foundation\Blender <version>\`.

    setx BLENDER_PATH "C:\Program Files\Blender Foundation\Blender 4.2\blender.exe"

Without Blender the command says so and exits 2. Nothing else in the repo needs it.

## Lay a pack out

    assets/private/in/<pack>/**/*.fbx       the pack's FBX files (any subfolders)
    assets/private/in/<pack>/Textures/..    its atlas image, e.g. PolygonTown_Texture_01_A.png
    assets/private/in/<pack>/pack.json      optional

`pack.json` (both keys optional):

    { "atlas": "Textures/PolygonTown_Texture_01_A.png", "scale": 1 }

- `atlas`: path from the pack folder. Every mesh in the pack gets one material using it. Without it the
  imported materials stay and every model is marked `no-atlas`.
- `scale`: multiplied on import. Use `0.01` or `100` if the manifest shows `scale-suspect`.

You choose what is converted by which FBX files you copy in.

## Run

    npm run assets:convert              every pack in assets/private/in/, in name order
    npm run assets:convert polygon-town only the named packs (other packs keep their manifest entries)
    npm run assets:selftest             two generated boxes through the normal path; prints "selftest ok"

Output (all gitignored):

    assets/private/out/<pack>.glb
    assets/private/out/manifest.json            name, bounds (metres, glTF Y up, base centre at the origin), triangles, warnings
    assets/private/out/reports/<pack>.json      what the Blender script reported
    assets/private/selftest/                    the self-test's scratch files

Exit codes: 0 all packs converted; 1 a pack failed (the other packs still make it into the manifest) or a bad
argument; 2 Blender missing or older than 4.2.

Warnings in the manifest: `scale-suspect` (largest dimension outside 0.05 m to 60 m), `no-uv` (a mesh has no UV
map, so the atlas can't map onto it), `no-atlas`.

## What the script does (`convert_fbx.py`)

Per FBX: import with the file's own units, drop animations, cameras, lights and armatures, bake transforms,
move the pivot to the base centre, put the meshes under one root named after the file, assign the shared atlas
material. Then one GLB export (Y up, textures embedded, no animations). Run by hand if you need to:

    blender --background --factory-startup --python tools/blender/convert_fbx.py -- --in <packDir> --out <glb> --report <json> [--atlas <png>] [--scale <n>]
