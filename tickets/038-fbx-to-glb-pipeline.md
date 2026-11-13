# 038 · A Blender pipeline that turns purchased Synty FBX packs into GLB files for the 3D view

owner: grid-simulator (owns `tools/`; see Open question 5)
status: open
branch: `ticket/038-fbx-to-glb-pipeline`

## Josh's words
> "can we build a blender conversion pipeline?"

## Goal
Josh drops a Synty pack's FBX files and its atlas texture into `assets/private/in/<pack>/`, runs `npm run assets:convert`, and gets one GLB per pack in `assets/private/out/` plus `assets/private/out/manifest.json` listing each model's name, base-centred bounds in metres and triangle count. A headless Blender run does the conversion. If Blender isn't installed, the command says how to install it and stops. None of these files is ever committed, because the repo is public and Synty's licence forbids sharing source files. A fresh clone without them builds, tests and runs exactly as now. **This ticket makes the files only. The renderer doesn't load them yet:** the loader (`GLTFLoader`, mapping names to poles, lamps, buildings and props, falling back to the placeholder shapes) is a follow-up `renderer` ticket, cut after this one is merged and Josh has seen a manifest from a real pack.

## Background (from `assets/candidates/synty-store.md`)
- Synty packs ship FBX, a Unity package, an Unreal project and sometimes a Godot project. None ships glTF. Three.js's `FBXLoader` is known to mangle atlas textures, so the usual route is to import in Blender and export GLB.
- Expect Unity-authored units (centimetres, so a 100x or 0.01x slip), pivots that are usually but not always at the base, and one shared atlas per pack (`<Pack>_Texture_01_A.png` style), often not linked from the FBX itself.
- Licence: commercial use is allowed. "You must not share the source files of any Assets outside your team." Browser builds aren't addressed (Open question 1).

## The pipeline (what the builder makes)
1. **`tools/blender/convert_fbx.py`**: run as `blender --background --factory-startup --python tools/blender/convert_fbx.py -- --in <packDir> --out <glbPath> --report <json> [--atlas <png>] [--scale <n>]`. For one pack it:
   - starts from an empty scene and imports every `*.fbx` under `--in` (recursive, sorted by path) with `bpy.ops.import_scene.fbx`, using Blender's unit handling (`use_manual_orientation` off, `global_scale` = `--scale`, default 1). Each file becomes one root object named after the file's stem, with its child meshes under it. Animations, cameras, lights and armatures are dropped.
   - applies transforms, then moves each root so its pivot is the **base centre** (bounds min z = 0 in Blender's Z-up, x/y centred).
   - if `--atlas` is given, makes **one** material (Principled BSDF, base colour = the atlas, roughness 1, metallic 0, no emission) and assigns it to every mesh, so every asset in the pack shares one material and one texture. With no atlas, the imported materials stay and each asset gets `no-atlas`.
   - lays each root out at the world origin (the loader places them; spreading them out isn't needed) and exports **one GLB** with `bpy.ops.export_scene.gltf(export_format='GLB', export_yup=True, export_apply=True)`, textures embedded, no animations, no cameras, no lights.
   - writes `--report` as JSON: the pack's `assets` and `failures` (types in `src/core/assets.ts`), with bounds converted to glTF Y-up metres, and the warnings set by the thresholds in `src/core/assets.ts`. An FBX that fails to import goes in `failures` and the run carries on.
2. **`tools/assets/`** (TypeScript, run with `tsx`): `convert.ts` is the CLI behind `npm run assets:convert [pack…]`. It finds Blender (`blender.ts`), lists packs in `assets/private/in/` (each subfolder is a pack, and an optional `pack.json` gives `{ "atlas"?: string, "scale"?: number }`), runs the Python script once per pack via `child_process.spawn` (no shell), reads each report, and writes `manifest.json` (`manifest.ts`). Exit code 0 when every pack converted, 1 if any pack's Blender run failed, 2 when Blender is missing or too old.
3. **Finding Blender** (`blender.ts`), in this order: the `BLENDER_PATH` env var (must point at an existing file); then `blender` / `blender.exe` on `PATH`; then on Windows only, the newest `C:\Program Files\Blender Foundation\Blender <ver>\blender.exe`. Then it runs `blender --version` and needs **4.2 or newer** (4.2 LTS's glTF exporter). If none is found, it prints this and exits 2, writing nothing:
   ```
   Blender not found. The asset pipeline needs Blender 4.2 or newer (free).
   Install it from https://www.blender.org/download/ (or: winget install BlenderFoundation.Blender),
   then either add its folder to PATH or set BLENDER_PATH to blender.exe, e.g.
     setx BLENDER_PATH "C:\Program Files\Blender Foundation\Blender 4.2\blender.exe"
   ```
4. **Self-test with no purchased assets**: `npm run assets:selftest` runs the same Python script with `--selftest`. Blender builds two boxes in code: one 40 × 300 × 40 **centimetres** with its pivot 50 cm off the base (a fake Unity pole), and one with no UVs. It exports them to FBX in a temp folder under `assets/private/selftest/` with Unity-style settings, then converts that folder through the normal path. The wrapper checks the report. No model file is committed for this.

## Acceptance criteria

**The wrapper** (Vitest, in `tools/assets/*.test.ts`. No Blender, so these run in the gate on a clean clone. Blender, the file system and `spawn` are injected, so the tests never launch a process.)
- [ ] **Blender lookup order.** `findBlender({ env, platform, exists, listDir })` returns `BLENDER_PATH` when it's set and exists. Otherwise it returns the first `PATH` hit, and on `win32` only, the newest `Blender Foundation\Blender <ver>` folder (4.10 sorts above 4.9). A `BLENDER_PATH` that points at a missing file is an error that names the path. It doesn't silently fall through.
- [ ] **Missing Blender fails clearly.** With nothing found, `convert` exits 2, its stderr contains the install text above (the blender.org URL, `BLENDER_PATH` and `PATH`), and nothing is written under `assets/private/out/`.
- [ ] **Version gate.** `parseBlenderVersion("Blender 4.2.3 LTS\n...")` gives `[4, 2, 3]`. Versions below 4.2 exit 2 with a message naming the found version and the minimum.
- [ ] **Arguments.** For a pack with `pack.json` `{ "atlas": "Textures/T_01.png", "scale": 0.01 }`, the spawn arguments are exactly `--background --factory-startup --python <abs convert_fbx.py> -- --in <abs pack> --out <abs out/<pack>.glb> --report <abs report> --atlas <abs atlas> --scale 0.01`, passed as an array (no shell string). Paths containing spaces survive unquoted. A pack with no `pack.json` gets no `--atlas` and no `--scale`.
- [ ] **Packs.** With no arguments, every subfolder of `assets/private/in/` is converted in name order. With pack names given, only those are. An unknown pack name exits 1 and names it. An empty or missing `in/` folder prints how to lay a pack out and exits 0.
- [ ] **Output stays private.** The resolved `--out`, `--report` and `manifest.json` paths are all inside `assets/private/`. A test with a pack name like `../../src` is refused before spawning.
- [ ] **Manifest.** Given report fixtures (hand-written JSON in `tools/assets/fixtures/`, no model data), `buildManifest` returns an `AssetManifest` with `version` = `ASSET_MANIFEST_VERSION`, packs in name order, and each pack's `glb` relative to the manifest with forward slashes. A malformed report (missing `bounds`, a non-numeric `triangles`, a duplicate asset name in a pack) is a clear error naming the pack and field. A pack whose Blender run exited non-zero is left out, its error is printed, and the exit code is 1, while the other packs still make it into the manifest.
- [ ] **The ignore rule.** A test reads `.gitignore` and checks it contains `assets/private/`.

**With Blender** (Josh checks once, after installing Blender. These aren't in the gate.)
- [ ] Josh checks: `npm run assets:selftest` prints `selftest ok`. The fake pole's manifest bounds are 0.4 × 3.0 × 0.4 m (within 1 mm), with `min[1]` = 0 and the x/z centre at 0. The no-UV box carries `no-uv`. The GLB opens in https://gltf-viewer.donmccurdy.com/ (or Blender) upright, at its base.
- [ ] Josh checks (after buying a pack, or with the free POLYGON Starter Pack): unpack its FBX and atlas into `assets/private/in/<pack>/`, write `pack.json` with the atlas, and run `npm run assets:convert`. The manifest lists the props with plausible sizes (a door about 2 m tall), and few or no `scale-suspect` warnings. One model opened in the viewer shows atlas colours, not grey.

**Nothing leaks, nothing else moves** (the main session checks)
- [ ] `git status` after the self-test and a real conversion shows nothing under `assets/private/`, and `git ls-files assets/private` is empty.
- [ ] On a fresh clone with no `assets/private/` folder and no Blender: `npm ci`, `npm run gate` and `npm run build` are green, and `npm run dev` with `?puzzle=09-shrine-circuit&view=3d` shows the 3D view exactly as on `main`, with today's placeholder shapes.
- [ ] `npm run gate` is green and its test count grew by this ticket's tests. `npm run playtest` is green with no snapshot change. `git diff main -- src/ tests/ puzzles/` shows only `src/core/assets.ts` and the one export line in `src/core/index.ts`, both written by the architect before the build.

## Files
- **`tools/assets/`** (new): `convert.ts`, `blender.ts`, `manifest.ts`, their `*.test.ts`, and `fixtures/` (hand-written report JSON only).
- **`tools/blender/`** (new): `convert_fbx.py` and a short `README.md` (install Blender, the folder layout, `pack.json`, the two commands, and that nothing in `assets/private/` may be committed).
- **`.gitignore`**: one declared block, `# Purchased asset packs and their conversions: licence forbids sharing; repo is public` and `assets/private/`.
- **`package.json`**: two script lines only, `"assets:convert": "tsx tools/assets/convert.ts"` and `"assets:selftest": "tsx tools/assets/convert.ts --selftest"`. No dependency changes.
- It imports types from `src/core/` (`../../src/core/assets`) and changes nothing there. If it needs a field or a warning that isn't in `src/core/assets.ts`, it stops and asks for a re-cut.
- Out of scope: `src/` (all of it, `src/render3d/` included), `tests/`, `puzzles/`, `index.html`, `vite.config.ts`, `tsconfig.json`, the docs, `assets/candidates/`.

## Interfaces
- **Written into `src/core/` before the build:** `src/core/assets.ts`, exported from `src/core/index.ts`. It holds `ASSET_MANIFEST_VERSION` (1), `Vec3`, `AssetBounds`, `AssetWarning` (`"scale-suspect" | "no-uv" | "no-atlas"`), `ASSET_SANE_SIZE_MIN` (0.05 m) and `ASSET_SANE_SIZE_MAX` (60 m), `AssetEntry`, `AssetFailure`, `AssetPack` and `AssetManifest`. The Python script writes JSON in this shape, and the follow-up renderer ticket reads it.
- **Folder layout** (all gitignored): `assets/private/in/<pack>/…` (FBX, textures, optional `pack.json`), `assets/private/out/<pack>.glb`, `assets/private/out/manifest.json`, `assets/private/out/reports/<pack>.json`, `assets/private/selftest/`.
- **No new npm dependencies.** The wrapper uses `node:child_process`, `node:fs` and `node:path` only, and `tsx` is already a devDependency.
- **Local tool, not a dependency:** Blender 4.2 or newer, found as in "Finding Blender". It isn't needed for the gate, the build or dev.
- **Proposed, not included (Josh decides; it would be its own ticket):** `@gltf-transform/cli` (devDependency) to deduplicate the atlas, weld and quantise meshes, and optionally Draco/meshopt-compress the GLB. Why: smaller downloads if the GLB is ever served from the web build. It isn't needed for a local prototype, where Blender's export is enough.
- **Docs that conflict, for the main session or Josh (not the builder):** the brief's "Folders and owners" row for `tools/` says "The analyzer CLI". It should read "The analyzer CLI and the asset pipeline (`tools/assets/`, `tools/blender/`)". `.claude/agents/grid-simulator.md` says it owns `tools/analyze.ts`, and it should say `tools/` as a whole, with Python allowed in `tools/blender/` only.

## Open questions for Josh (the defaults apply if you just approve)
1. **Licence for the web build (unresolved, yours to decide).** Synty's licence doesn't say whether GLB files served from a public browser build (GitHub Pages) count as "sharing source files". **Default: local builds only.** The follow-up loader ticket won't copy GLBs into `dist/` or `public/`, and the Pages deploy keeps the placeholder shapes until Synty answers in writing (licensing@syntystudios.com, per the research note). Ask before buying, if you want certainty.
2. **One GLB per pack, or one per asset?** **Default: one per pack**, with every asset a named root node sharing one atlas material (one fetch, one texture, ready for `InstancedMesh`). The alternative is one GLB per asset, which is simpler to pick from but repeats the atlas in every file. Easy to switch later.
3. **Convert everything, or a pick list?** **Default: everything in `in/<pack>/`.** You choose which props to keep by which FBX you copy in. A `pack.json` `include` list could come later.
4. **Optimiser.** `@gltf-transform/cli` is proposed above, not added. **Default: no.**
5. **Owner.** **Default: `grid-simulator`**, because the brief gives it `tools/`. The agent is written for pure grid logic, and this is a Blender script plus a Node CLI, so the alternative is to give it to `renderer`, which will write the loader that reads the manifest. Either way, the ticket's files stay the same.
6. **Decided rules.** None are touched. This is tooling only, with no rule, schema, payload or puzzle change. No `rules-coverage.md` row changes.
