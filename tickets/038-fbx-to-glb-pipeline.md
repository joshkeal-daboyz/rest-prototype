# 038 · A Blender pipeline that turns purchased Synty FBX packs into GLB files for the 3D view

owner: grid-simulator (owns `tools/`; see Open question 5)
status: open (amendment B; amendment A built at b374830, gate green; re-opened for texture aliases)
branch: `ticket/038-fbx-to-glb-pipeline`

## Josh's words
> "can we build a blender conversion pipeline?"

After the first real run (amendment A, below):
> "Fix textures first"

After amendment A's real run left 99 models `missing-texture` (amendment B, below):
> "Add alias map"

## Goal
Josh drops a Synty pack's FBX files and its atlas texture into `assets/private/in/<pack>/`, runs `npm run assets:convert`, and gets one GLB per pack in `assets/private/out/` plus `assets/private/out/manifest.json` listing each model's name, base-centred bounds in metres and triangle count. A headless Blender run does the conversion. If Blender isn't installed, the command says how to install it and stops. None of these files is ever committed, because the repo is public and Synty's licence forbids sharing source files. A fresh clone without them builds, tests and runs exactly as now. **This ticket makes the files only. The renderer doesn't load them yet:** the loader (`GLTFLoader`, mapping names to poles, lamps, buildings and props, falling back to the placeholder shapes) is a follow-up `renderer` ticket, cut after this one is merged and Josh has seen a manifest from a real pack.

## Background (from `assets/candidates/synty-store.md`)
- Synty packs ship FBX, a Unity package, an Unreal project and sometimes a Godot project. None ships glTF. Three.js's `FBXLoader` is known to mangle atlas textures, so the usual route is to import in Blender and export GLB.
- Expect Unity-authored units (centimetres, so a 100x or 0.01x slip), pivots that are usually but not always at the base, and one shared atlas per pack (`<Pack>_Texture_01_A.png` style), often not linked from the FBX itself. **Wrong for some packs:** the first real run (SIMPLE Town) found per-model textures and units 100x smaller; see amendment A.
- Licence: commercial use is allowed. "You must not share the source files of any Assets outside your team." Browser builds aren't addressed (Open question 1).

## The pipeline (what the builder makes)
1. **`tools/blender/convert_fbx.py`**: run as `blender --background --factory-startup --python tools/blender/convert_fbx.py -- --in <packDir> --out <glbPath> --report <json> [--atlas <png>] [--scale <n>]`. For one pack it:
   - starts from an empty scene and imports every `*.fbx` under `--in` (recursive, sorted by path) with `bpy.ops.import_scene.fbx`, using Blender's unit handling (`use_manual_orientation` off, `global_scale` = `--scale`, default 1). Each file becomes one root object named after the file's stem, with its child meshes under it. Animations, cameras, lights and armatures are dropped.
   - applies transforms, then moves each root so its pivot is the **base centre** (bounds min z = 0 in Blender's Z-up, x/y centred).
   - if `--atlas` is given, makes **one** material (Principled BSDF, base colour = the atlas, roughness 1, metallic 0, no emission) and assigns it to every mesh, so every asset in the pack shares one material and one texture. With no atlas, the imported materials stay and each material's texture is found in the pack (**amended, see amendment A**; `no-atlas` is gone).
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

## Amendment A: per-model textures (Josh, after the first real run: "Fix textures first")

**What the first real run showed** (Blender 5.3, SIMPLE Town in `assets/private/in/simple-town/`, FBX under `SIMPLE_Town_SourceFiles/SourceFiles/Fbx/`, images under `.../SourceFiles/Textures/`, 176 FBX):
- Selftest passes on 5.3. 173 of 176 FBX convert into one GLB (74k tris) with `pack.json` `{ "scale": 100 }` (this pack's units are 100x smaller than the cm assumption; already supported).
- This pack has no shared atlas. Each model is authored for its own image (`Building01a.png`, `House_01.png`, `Town_Hall_a.png`, `Props.png`, `Vehicle_*.png`, ...). Forcing `SimpleTown.png` on everything gives rainbow stripes.
- With no atlas, most models came out textured, but the town hall, memorial, graves and bin came out grey. Why (from the FBX files): `memorial_mesh`, `grave_small_mesh` and `bin_mesh` reference `props.png` by an absolute path on the artist's disk (`C:/Users/synty/Dropbox/.../props.png`), which doesn't exist here; the file is `Textures/Props.png`. `town_hall_mesh` has one material, `lambert1`, with no texture reference at all.
- Every model got `no-atlas`, which is noise.
- Three FBX (`fire_truck_mesh`, `roadLane_NoLines_straight_mesh`, `road_crossing_mesh`) are FBX version 6100, which Blender's importer rejects. The pack has same-named OBJ copies in `SourceFiles/Obj/`.

**Two texture modes.** `pack.json` `"atlas"` set: **atlas mode**, exactly as in step 1 above (one shared material, for the POLYGON-style packs). No `"atlas"`: **per-model mode**, the default, described here. Per-model mode adds no warning just for being per-model.

**`pack.json`** gains two optional keys (the wrapper reads them and passes them on; both are refused before spawning if they resolve outside the pack folder):
- `"textures": "<dir>"`: the folder searched for images, relative to the pack. Default: the whole pack folder. Passed as `--textures <abs dir>`.
- `"textureOverrides": { "<model stem>": "<image path relative to the pack>" }`: pins a model's texture. An override naming a file that doesn't exist is an error naming the pack, the model and the path. Passed as one `--texture-override <stem>=<abs image>` per entry, sorted by stem.

**Finding each material's image (per-model mode, in `convert_fbx.py`).** The script indexes every `.png .jpg .jpeg .tga .tif .tiff .bmp` under the textures folder (recursive, sorted by relative path with forward slashes). Then, for each material on each model's meshes, the first rule that gives a file wins:
1. **Override.** The model's stem is in the overrides. Every material on that model uses that image.
2. **The reference as it stands.** The material's image texture node points at a file that exists **and** lies inside the pack folder.
3. **The referenced file name.** Take the basename of the referenced path (split on `/` and `\`). Look it up in the index: exact name, then case-insensitive name, then case-insensitive stem with any image extension. (This fixes `props.png` -> `Textures/Props.png`.)
4. **The material name.** Normalise the material name (drop a Blender `.001`-style suffix, lowercase, remove everything that isn't a letter or digit) and compare it to each indexed file's normalised stem. Generic names are skipped: `lambert<N>`, `phong<N>`, `blinn<N>`, `material`, `defaultmaterial`, `initialshadinggroup`, `none`, and anything empty after normalising.
5. **The model's name (a guess).** Only for a material with **no** image reference. Strip an `SM_` prefix and a `_mesh` / `mesh` suffix from the model's stem, normalise it the same way, and take the first indexed file whose normalised stem equals it or starts with it. (This gives `town_hall_mesh` -> `Town_Hall_a.png`.) The model gets `texture-guessed`.

If several files match at one step, the first in sorted path order wins. A found image is loaded once per file (`bpy.data.images.load(path, check_existing=True)`) and wired to the material's Principled BSDF Base Color (reusing the existing image node, or adding one). In the GLB each image file is embedded once, however many materials use it.

**When nothing is found:**
- A material that **references** an image that no rule finds: the model gets `missing-texture`, and `missingTextures` lists the referenced basename (e.g. `props.png`).
- A material with **no** reference that no rule finds stays its plain colour, with no warning, as long as some other material on the same model got a texture. If the whole model ends up with no texture, it gets `missing-texture`, and `missingTextures` lists `material:<name>` for each such material.
- `no-uv`: in atlas mode, any mesh with no UV map. In per-model mode, a mesh with no UV map that has a material with an image.
- `no-atlas` is removed.

**The report and manifest** gain, per asset, `textures` (embedded image paths relative to the pack, forward slashes, sorted, unique; `[atlas]` in atlas mode) and `missingTextures`. The types are already in `src/core/assets.ts` (see Interfaces).

**Old FBX files.** An FBX that fails to import still goes in `failures` and the run carries on (default; see Open question 7). When the file's header shows a version below 7100, the `error` says so and names the version, e.g. `FBX version 6100 is older than Blender's importer accepts (7100+)`. If a file with the same stem and a `.obj` extension (case-insensitive) exists anywhere in the pack, the error also says `an OBJ copy exists: <path relative to pack> (not converted)`.

**Selftest additions** (all generated in code, in `assets/private/selftest/`, nothing committed). The selftest pack runs in per-model mode, with its images in a `Textures/` subfolder written by Blender (small solid-colour PNGs). It adds these boxes:
- `ref_case`: its material references `C:/nowhere/TEX_Crate.PNG`, and the file is `Textures/tex_crate.png`. Expect `textures` = `["Textures/tex_crate.png"]` and no texture warning.
- `mat_name`: material `Sign_Board`, no reference, and the file is `Textures/Sign_Board.png`. Expect that texture and no warning.
- `guess_mesh`: material `lambert1`, no reference, and the files are `Textures/Guess_a.png` and `Textures/Guess_b.png`. Expect `Textures/Guess_a.png` and `texture-guessed`.
- `lost_ref`: its material references `nowhere.png`, which isn't present. Expect `missing-texture` and `missingTextures` = `["nowhere.png"]`.
- The existing no-UV box gets a material that references a present image, so it still carries `no-uv`.
- The fake pole has no texture and gets no texture warning.

### Acceptance criteria (amendment A)

**Wrapper** (Vitest, in the gate, no Blender)
- [ ] **Vitest: pack.json texture keys.** `{ "scale": 100, "textures": "Src/Textures", "textureOverrides": { "town_hall_mesh": "Src/Textures/Town_Hall_b.png", "a_mesh": "x/A.png" } }` gives spawn arguments ending `--scale 100 --textures <abs Src/Textures> --texture-override a_mesh=<abs x/A.png> --texture-override town_hall_mesh=<abs …Town_Hall_b.png>`. Overrides are sorted by stem, and paths with spaces are kept as single array items. With no `atlas`, there is no `--atlas`.
- [ ] **Vitest: texture paths stay in the pack.** A `textures` or override value that resolves outside the pack folder (`../x`, or an absolute path elsewhere) is refused before spawning, and the error names the pack and the key. An override naming a missing file is an error naming the pack, model and path.
- [ ] **Vitest: manifest texture fields.** `buildManifest` carries `textures` and `missingTextures` through from report fixtures. It is a clear error naming the pack and field when: `textures` or `missingTextures` is missing or not an array of strings; a `textures` entry is absolute, contains `..` or a backslash; `missing-texture` is in `warnings` while `missingTextures` is empty, or the other way round; or a warning is `no-atlas` (now an unknown warning).
- [ ] **Vitest: selftest checker.** The function that checks the selftest report passes on a fixture holding the expected results above, and fails with a message naming the box and the field when one is wrong (say, `guess_mesh` without `texture-guessed`, or `ref_case` with no texture).
- [ ] **Vitest: fixtures updated.** No fixture or test still uses `no-atlas`. The per-model default produces no warnings in a clean-pack fixture.

**With Blender** (the builder runs these and puts the numbers in its report. They aren't in the gate.)
- [ ] **Builder checks: selftest.** `npm run assets:selftest` prints `selftest ok` on Blender 5.3, with the new boxes as listed.
- [ ] **Builder checks: the real pack.** Run `npm run assets:convert simple-town` against `assets/private/in/simple-town/` in this worktree, with `pack.json` `{ "scale": 100 }`. You may add `"textures": "SIMPLE_Town_SourceFiles/SourceFiles/Textures"`; say whether you did. Blender is at `C:\Program Files\Blender Foundation\Blender 5.3\blender.exe`. In the manifest:
  - `town_hall_mesh` has a `Town_Hall_*.png` in `textures`.
  - `memorial_mesh`, `grave_small_mesh` and `bin_mesh` each have `.../Textures/Props.png` in `textures`, with no `missing-texture`.
  - `grave_medium_mesh` and `grave_large_mesh` are textured too.
  - The models that were already right still have the same image: lamp, traffic light, hydrant, and one house and one shop (name the ones you checked).
  - No asset lists `SimpleTown.png` unless its own FBX references it.
  - No asset carries `no-atlas`.
  - 173 assets and 3 failures, and each failure's `error` names FBX version 6100 and its OBJ copy under `SourceFiles/Obj/`.
  - The report lists every asset still carrying `missing-texture` or `texture-guessed`, with its `missingTextures`, so Josh can pin those with `textureOverrides`.
- [ ] **Builder checks: textures really are embedded.** Re-import the GLB in a headless Blender (a throwaway script in the scratchpad, not committed) and confirm that each of `town_hall_mesh`, `memorial_mesh`, `grave_small_mesh` and `bin_mesh` has a material whose Base Color is an image with packed data. Also confirm that the number of images in the GLB equals the number of distinct `textures` paths in the pack's manifest (each embedded once). Optionally, render those four to PNGs in the scratchpad for Josh.
- [ ] **Josh checks:** opens `assets/private/out/simple-town.glb` in https://gltf-viewer.donmccurdy.com/ (or Blender). Buildings show their own textures, with no rainbow stripes. The town hall, memorial, graves and bin are textured, not grey.

**Unchanged:** every earlier criterion still holds, except that the `no-atlas` wording in step 1 and Interfaces is replaced by this amendment. The earlier real-pack criterion (POLYGON, atlas mode) still applies to atlas packs.

## Amendment B: texture aliases (Josh, after amendment A's real run: "Add alias map")

**What amendment A's run showed** (b374830, gate green, SIMPLE Town, `pack.json` `{ "scale": 100 }`): 99 of 173 models are `missing-texture`. Their FBX materials reference Photoshop source files that aren't in the pack: `MasterTexture02.psd` (63 models: the `Building_*`, `Env_*`, `Prop_*` family), `Andrew_MasterTexture.psd` (13), `plants2.psd` (7: bushes, grass, hedge, trees), `SimpleAirport_Mike.psd` (1), one `.psd` per vehicle (`ambulance`, `bus`, `family`, `Police`, `firetruck`, `RubishTruck`, `Taxi`, `ute`, `vantex`), and two models with only a generic untextured material (`road_cornerLines_mesh`: `material:lambert1`; `Env_Road_Ramp_Straight`: `material:lambert2`). The images these stand for are probably already in `Textures/` (`SimpleTown.png`, `SimpleTown_Texture_Update.png`, `Props.png`, `Road.png`, `Nature_Trees.png`, `Vehicle_*.png`, ...) under other names. Today only `Env_Road_Corner`/`Ramp` reference `SimpleTown.png`, and `ST_Veh_*_Z`, `PetrolStation` and `PoliceStation` reference `SimpleTown_Texture_Update.png`.

**`pack.json` gains one optional key**, read by the wrapper and passed on:
- `"textureAliases": { "<key>": "<image path relative to the pack>" }`. A key is either
  - a **file name** (no `/` or `\`), matched against the basename of a material's referenced path **case-insensitively and ignoring the extension**: the key and the referenced basename are both reduced to their lowercased stem (everything before the last `.`, or the whole name if there is none). So `MasterTexture02.psd`, `mastertexture02.PNG` and `MasterTexture02` are the same key, and all match a reference to `C:/art/MasterTexture02.psd`; or
  - `material:<name>`, matched against a material's name after dropping a Blender `.001`-style suffix, case-insensitively. It matches every material of that name in the pack, whether or not it references an image.
- Passed as one `--texture-alias <normalised key>=<abs image>` per entry, sorted by normalised key. The normalised key is the lowercased stem for file keys and `material:<lowercased name>` for material keys. The script splits each argument on its first `=`.
- **Refused before Blender runs** (exit 1, nothing spawned, the error names the pack and the key): `textureAliases` isn't an object; a value isn't a string; a value resolves outside the pack folder (`../x`, or an absolute path elsewhere); a value doesn't end in one of the indexed image extensions (`.png .jpg .jpeg .tga .tif .tiff .bmp`, case-insensitive); a file key contains `/`, `\` or `=`, or is empty; a `material:` key has an empty name; two keys normalise to the same key (the error names both as written). An alias naming a file that doesn't exist is an error naming the pack, the key and the path.

**The lookup order (per-model mode, replaces amendment A's list).** For each material on each model's meshes, the first rule that gives a file wins:
1. **Override** (`textureOverrides`, unchanged). The model's stem is in the overrides. Every material on that model uses that image. Overrides still beat everything, aliases included.
2. **The reference as it stands** (unchanged).
3. **The referenced file name** (unchanged: exact name, case-insensitive name, case-insensitive stem with any image extension, in the index).
4. **Alias (new).** First a file-name alias matching the referenced basename (only for a material that references something), then a `material:` alias matching the material's name. The first that matches gives the file.
5. **The material name** (amendment A's rule 4, unchanged).
6. **The model's name, a guess** (amendment A's rule 5, unchanged; still only for a material with no image reference, still `texture-guessed`).

A model whose materials resolve through rules 1 to 5 carries **no** texture warning; an alias is a statement of fact by Josh, not a guess. The "when nothing is found" rules, `no-uv`, the report fields and the embed-once rule are unchanged; an aliased image is indexed and embedded like any other. After the run the script prints one line per alias that matched no material (`texture alias <key> matched no material`) to stdout; it isn't a report field or a warning (no type change).

**Watch the generic names.** A `material:lambert1` alias matches **every** `lambert1` in the pack, including `town_hall_mesh`'s, which then stops being guessed. Use a `material:` alias only when it's right for every model with that material; for one model, use `textureOverrides`. The builder says which it used for `road_cornerLines_mesh` and `Env_Road_Ramp_Straight`, and checks the town hall still gets `Town_Hall_*.png`.

**Two small fixes folded in:**
- **(a) OBJ hint.** For an FBX older than 7100, the "an OBJ copy exists" hint also accepts a `.obj` whose stem is the FBX's stem followed by one or more digits, case-insensitive (`road_crossing_mesh.fbx` -> `road_crossing_mesh1.obj`). An exact-stem copy wins over a digits copy; among several of one kind, the first in sorted relative path order wins. The message is unchanged otherwise.
- **(b) `scale-suspect`, report only.** The builder looks at the three buildings that carry `scale-suspect` on the real pack and reports, for each, its manifest size in metres, what the model is, a plausible real-world size, and a verdict: genuinely oversized (the pack's `scale` is wrong for it), or a fair size that the `ASSET_SANE_SIZE_MAX` (60 m) threshold flags wrongly. **No change to the threshold or to `src/core/assets.ts`.** If the threshold looks wrong, the builder says so and the architect turns it into an open question for Josh.

**Selftest additions** (generated in code, nothing committed). The selftest run passes aliases as the wrapper would for a `pack.json` with `"textureAliases": { "Master_Src.PNG": "Textures/alias_atlas.png", "material:Painted_Metal": "Textures/metal_sheet.png", "tex_crate.psd": "Textures/alias_atlas.png" }`. New boxes:
- `alias_ref`: material references `C:/art/Master_Src.psd`; no `Master_Src.*` file exists. Expect `textures` = `["Textures/alias_atlas.png"]` and no texture warning (file-name alias, case and extension ignored).
- `alias_mat`: material `Painted_Metal.001`, no reference; no file named like the material. Expect `["Textures/metal_sheet.png"]` and no warning (material alias, suffix dropped).
- `alias_order`: material references `C:/nowhere/tex_crate.psd`, and `Textures/tex_crate.png` exists. Expect `["Textures/tex_crate.png"]`: rule 3 beats the `tex_crate.psd` alias.
- Every amendment A box keeps its expected result (in particular `guess_mesh` is still `texture-guessed`, and `lost_ref` still `missing-texture` with `["nowhere.png"]`).

### Acceptance criteria (amendment B)

**Wrapper** (Vitest, in the gate, no Blender)
- [ ] **Vitest: alias arguments.** `{ "scale": 100, "textureAliases": { "MasterTexture02.psd": "Tex/SimpleTown.png", "material:Lambert1": "Tex/Road.png", "plants2.PSD": "Tex/Nature Trees.png" } }` gives spawn arguments ending `--texture-alias mastertexture02=<abs Tex/SimpleTown.png> --texture-alias material:lambert1=<abs Tex/Road.png> --texture-alias plants2=<abs Tex/Nature Trees.png>` (sorted by normalised key; the path with a space is one array item). With overrides too, the order is `--scale`, `--textures`, the `--texture-override` items, then the `--texture-alias` items. No `textureAliases` means no `--texture-alias`.
- [ ] **Vitest: alias validation.** Each refusal listed above (not an object, non-string value, outside the pack, non-image extension, key with `/` `\` `=` or empty, empty `material:` name, two keys normalising alike such as `A.psd` and `a.png`, missing file) is an error before spawning, naming the pack and the key (and the path, for a missing file), and `spawn` is never called.
- [ ] **Vitest: selftest checker.** Passes on a fixture holding the expected results of every selftest box, the three new ones included, and fails naming the box and field when one is wrong (say, `alias_ref` with `missing-texture`, or `alias_order` with `Textures/alias_atlas.png`).
- [ ] `npm run gate` is green and the test count grew by this amendment's tests.

**With Blender** (the builder runs these and puts the numbers and evidence in its report; not in the gate)
- [ ] **Builder checks: selftest.** `npm run assets:selftest` prints `selftest ok` on Blender 5.3 with the new boxes.
- [ ] **Builder checks: work out the aliases for SIMPLE Town, by evidence.** For each `.psd` name in the list above (and the two `lambert` materials), find which existing image in the pack it stands for. Evidence, in this order:
  1. **Primary: the OBJ/MTL copies** in `SIMPLE_Town_SourceFiles/SourceFiles/Obj/`. For each model in a `.psd` family that has an OBJ copy, read its `.mtl` (`map_Kd` and friends) and record which image it names. If the MTLs name real PNGs, that settles the family.
  2. The pack's demo and source scenes (e.g. `Simple_Town_Demo.ma`: Maya ASCII `file` nodes' `.fileTextureName`, and which shading groups the family's meshes are in), and any ICON/preview image in the pack.
  3. Experiment: render previews with headless Blender (a throwaway script in the scratchpad, not committed) of a few models from each family with the candidate image, and compare against the ICON/demo images. A wrong atlas shows as stripes or wrong colours; reject it. If `SimpleTown.png` and `SimpleTown_Texture_Update.png` both fit, prefer the one the MTL names; failing that, the one that renders correctly for every model in the family, with per-model exceptions pinned by `textureOverrides`.
  Write the result into `assets/private/in/simple-town/pack.json` as `textureAliases` (plus any `textureOverrides` needed). That file is gitignored, so also record it in `tools/blender/README.md` as the worked example for this pack: the full `pack.json`, and one line per alias saying what evidence settled it (which MTL, scene node or render).
- [ ] **Builder checks: the real pack with aliases.** `npm run assets:convert simple-town` in this worktree:
  - The `missing-texture` count, before (99) and after. Get it as close to 0 as the evidence allows, without guessing: an alias with no evidence isn't written. Every model still `missing-texture` or `texture-guessed` is listed with its `missingTextures` and why it's left (no candidate image, candidates render wrong, no evidence).
  - Every amendment A real-pack check still holds (town hall, memorial, graves, bin, the already-right models, no `no-atlas`, 173 assets and 3 failures), except that "no asset lists `SimpleTown.png` unless its own FBX references it" now reads "... unless its own FBX references it or an alias with recorded evidence maps it there".
  - Fix (a): all three failures (`fire_truck_mesh`, `roadLane_NoLines_straight_mesh`, `road_crossing_mesh`) name FBX version 6100 and an OBJ copy, `road_crossing_mesh`'s being `road_crossing_mesh1.obj` (or an exact-stem copy if one exists).
  - Fix (b): the `scale-suspect` report for the three buildings, as described above.
  - Renders (scratchpad PNGs, for Josh) of at least one model per alias family, plus the town hall, so he can see they're textured right.
- [ ] **Builder checks: still embedded once.** The number of images in the GLB equals the number of distinct `textures` paths in the pack's manifest.
- [ ] **Josh checks:** opens `assets/private/out/simple-town.glb` in https://gltf-viewer.donmccurdy.com/ (or Blender). The houses, shops, canals, beach pieces, trees and vehicles are textured, with no rainbow stripes.

**Unchanged:** every earlier criterion still holds, apart from the lookup order above (which replaces amendment A's numbered list) and the `SimpleTown.png` wording just given. The allowed files are the same; the local `assets/private/in/simple-town/pack.json` isn't a repo file (gitignored) and may be edited.

## Files
- **`tools/assets/`** (new): `convert.ts`, `blender.ts`, `manifest.ts`, their `*.test.ts`, and `fixtures/` (hand-written report JSON only).
- **`tools/blender/`** (new): `convert_fbx.py` and a short `README.md` (install Blender, the folder layout, `pack.json`, the two commands, and that nothing in `assets/private/` may be committed).
- **`.gitignore`**: one declared block, `# Purchased asset packs and their conversions: licence forbids sharing; repo is public` and `assets/private/`.
- **`package.json`**: two script lines only, `"assets:convert": "tsx tools/assets/convert.ts"` and `"assets:selftest": "tsx tools/assets/convert.ts --selftest"`. No dependency changes.
- It imports types from `src/core/` (`../../src/core/assets`) and changes nothing there. If it needs a field or a warning that isn't in `src/core/assets.ts`, it stops and asks for a re-cut.
- Out of scope: `src/` (all of it, `src/render3d/` included), `tests/`, `puzzles/`, `index.html`, `vite.config.ts`, `tsconfig.json`, the docs, `assets/candidates/`.

## Interfaces
- **Written into `src/core/` before the build:** `src/core/assets.ts`, exported from `src/core/index.ts`. It holds `ASSET_MANIFEST_VERSION` (1), `Vec3`, `AssetBounds`, `AssetWarning` (`"scale-suspect" | "no-uv" | "missing-texture" | "texture-guessed"`; amendment A dropped `no-atlas`), `AssetEntry.textures` and `AssetEntry.missingTextures` (amendment A), `ASSET_SANE_SIZE_MIN` (0.05 m) and `ASSET_SANE_SIZE_MAX` (60 m), `AssetEntry`, `AssetFailure`, `AssetPack` and `AssetManifest`. The Python script writes JSON in this shape, and the follow-up renderer ticket reads it.
- **Folder layout** (all gitignored): `assets/private/in/<pack>/…` (FBX, textures, optional `pack.json`), `assets/private/out/<pack>.glb`, `assets/private/out/manifest.json`, `assets/private/out/reports/<pack>.json`, `assets/private/selftest/`.
- **No new npm dependencies.** The wrapper uses `node:child_process`, `node:fs` and `node:path` only, and `tsx` is already a devDependency.
- **Local tool, not a dependency:** Blender 4.2 or newer, found as in "Finding Blender". It isn't needed for the gate, the build or dev.
- **Proposed, not included (Josh decides; it would be its own ticket):** `@gltf-transform/cli` (devDependency) to deduplicate the atlas, weld and quantise meshes, and optionally Draco/meshopt-compress the GLB. Why: smaller downloads if the GLB is ever served from the web build. It isn't needed for a local prototype, where Blender's export is enough.
- **Docs that conflict, for the main session or Josh (not the builder):** the brief's "Folders and owners" row for `tools/` says "The analyzer CLI". It should read "The analyzer CLI and the asset pipeline (`tools/assets/`, `tools/blender/`)". `.claude/agents/grid-simulator.md` says it owns `tools/analyze.ts`, and it should say `tools/` as a whole, with Python allowed in `tools/blender/` only.

## Open questions for Josh (the defaults apply if you just approve)
1. **Licence for the web build (unresolved, yours to decide).** Synty's licence doesn't say whether GLB files served from a public browser build (GitHub Pages) count as "sharing source files". **Default: local builds only.** The follow-up loader ticket won't copy GLBs into `dist/` or `public/`, and the Pages deploy keeps the placeholder shapes until Synty answers in writing (licensing@syntystudios.com, per the research note). Ask before buying, if you want certainty.
2. **One GLB per pack, or one per asset?** **Default: one per pack**, with every asset a named root node sharing one atlas material (one fetch, one texture, ready for `InstancedMesh`); in per-model mode (amendment A) the one GLB holds each texture once. The alternative is one GLB per asset, which is simpler to pick from but repeats the atlas in every file. Easy to switch later.
3. **Convert everything, or a pick list?** **Default: everything in `in/<pack>/`.** You choose which props to keep by which FBX you copy in. A `pack.json` `include` list could come later.
4. **Optimiser.** `@gltf-transform/cli` is proposed above, not added. **Default: no.**
5. **Owner.** **Default: `grid-simulator`**, because the brief gives it `tools/`. The agent is written for pure grid logic, and this is a Blender script plus a Node CLI, so the alternative is to give it to `renderer`, which will write the loader that reads the manifest. Either way, the ticket's files stay the same.
6. **Decided rules.** None are touched. This is tooling only, with no rule, schema, payload or puzzle change. No `rules-coverage.md` row changes.
7. **OBJ fallback for old FBX (amendment A).** Three SIMPLE Town FBX files are version 6100, which Blender won't import, and the pack has OBJ copies. The fallback would be small: when an FBX fails and a same-stem `.obj` exists, import that with `bpy.ops.wm.obj_import` and add an `obj-fallback` warning. But OBJ brings its own axis and unit conventions, plus `.mtl` texture lookups, for a fire truck and two road pieces. **Default: no fallback.** They're reported as failures, named, with the OBJ path in the message. Say so if you want the fallback, and it becomes a small follow-up ticket with a new warning type.
8. **Guessing a texture from the model's name (amendment A, rule 5).** This is what textures the town hall, which references nothing. It can pick the wrong variant (`Town_Hall_a` vs `_b`), so it's flagged `texture-guessed`, and `textureOverrides` pins the right one. **Default: guess and flag.** The alternative is no guessing: the model gets `missing-texture` until you write an override.
9. **Amendment B adds no type, warning or dependency.** Aliased models carry no warning (an alias is your statement, not a guess), so `src/core/assets.ts` is unchanged. The alternative is a new `texture-aliased` warning so the manifest shows which models came through an alias; that would be a `src/core/` change by the architect before the build. **Default: no warning.**
10. **`scale-suspect` threshold (amendment B, fix b).** Left as it is (60 m). The builder reports whether the three flagged SIMPLE Town buildings are really oversized. If the threshold is what's wrong, it comes back to you as a question then.
