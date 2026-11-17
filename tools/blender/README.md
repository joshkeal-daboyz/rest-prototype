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
    assets/private/in/<pack>/Textures/..    its image(s): one atlas (POLYGON-style) or one per model (SIMPLE-style)
    assets/private/in/<pack>/pack.json      optional

`pack.json` (every key optional):

    { "atlas": "Textures/PolygonTown_Texture_01_A.png", "scale": 1 }
    { "scale": 100, "textures": "Src/Textures", "textureOverrides": { "town_hall_mesh": "Src/Textures/Town_Hall_b.png" } }

- `atlas`: path from the pack folder. **Atlas mode**: every mesh in the pack gets one material using it.
- `scale`: multiplied on import. Use `0.01` or `100` if the manifest shows `scale-suspect` (SIMPLE Town needs `100`).
- `textures`: the folder searched for images, relative to the pack. Default: the whole pack folder.
- `textureOverrides`: `{ "<model stem>": "<image, relative to the pack>" }` pins a model's image. A missing file is an error.
- Every path stays inside the pack folder, or the pack is refused.

With no `atlas` the pack runs in **per-model mode** (the default): each model keeps its own materials, and each
material's image is looked up in the pack, the first rule that finds a file wins:

1. the model's override;
2. the image the FBX points at, if that file exists inside the pack;
3. the referenced file name in the pack (exact, then any case, then any image extension: `props.png` finds `Textures/Props.png`);
4. the material's name against the image file names (generic names such as `lambert1` are skipped);
5. the model's name (`town_hall_mesh` finds `Town_Hall_a.png`). This is a guess, and the model gets `texture-guessed`.

Each image file is loaded once and embedded once in the GLB, however many models use it.

You choose what is converted by which FBX files you copy in.

## Run

    npm run assets:convert              every pack in assets/private/in/, in name order
    npm run assets:convert polygon-town only the named packs (other packs keep their manifest entries)
    npm run assets:selftest             generated boxes (a pole, a no-UV box, one per texture rule) through the normal path; prints "selftest ok"

Output (all gitignored):

    assets/private/out/<pack>.glb
    assets/private/out/manifest.json            name, bounds (metres, glTF Y up, base centre at the origin), triangles, warnings
    assets/private/out/reports/<pack>.json      what the Blender script reported
    assets/private/selftest/                    the self-test's scratch files

Exit codes: 0 all packs converted; 1 a pack failed (the other packs still make it into the manifest) or a bad
argument; 2 Blender missing or older than 4.2.

Each asset in the manifest lists `textures` (the images embedded for it) and `missingTextures`.
Warnings: `scale-suspect` (largest dimension outside 0.05 m to 60 m); `no-uv` (a mesh that should carry an image has no UV
map); `missing-texture` (a material's image was not found; `missingTextures` names it, and a `textureOverrides` entry fixes it);
`texture-guessed` (rule 5; check it, or pin it with an override).

An FBX that fails to import goes in the pack's `failures` and the run carries on. A file older than FBX 7100 (Blender
refuses these) says so, and names a same-name `.obj` in the pack if there is one. OBJ files are not converted.

## What the script does (`convert_fbx.py`)

Per FBX: import with the file's own units, drop animations, cameras, lights and armatures, bake transforms,
move the pivot to the base centre, put the meshes under one root named after the file, then assign the shared atlas
material (atlas mode) or find each material's image (per-model mode). Then one GLB export (Y up, textures embedded, no animations). Run by hand if you need to:

    blender --background --factory-startup --python tools/blender/convert_fbx.py -- --in <packDir> --out <glb> --report <json> [--atlas <png>] [--scale <n>] [--textures <dir>] [--texture-override <stem>=<image> ...]
