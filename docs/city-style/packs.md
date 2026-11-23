# City style: Packs

standard: yes
Scope: which Synty packs the 3D town draws from, how their models are licensed, and how a pack is added.
Read by: asset-scout, renderer
Depends on: `docs/city-style/buildings.md` (the model table, fronts and corners), `docs/city-style/facades.md` (door steps), `docs/city-style/exclusions.md` (the never-used pieces)

## Rules

## 13. Packs in the mix

- **Rule [D-043b]**: the target style is the POLYGON City Pack and Town Pack. SIMPLE Town is the placeholder and fallback until POLYGON buildings are in, and stays the working set until a ticket adopts POLYGON buildings.
- **Default [D-048n]**: the mix is City Pack stacks on `large` and `tall` lots, the Town Pack's twelve whole houses on the types they fill (chapter 5), and SIMPLE Town on the types neither fills and wherever the packs are absent. No whole City Pack building is placed, because no ruling names one. The Church and the City Hall are held back for the landmark places. Lots are not resized for either pack: a later ticket does that; the terrace is ticket 051's.
- The City Pack's stack pieces are in `BUILDING_FRONTS` and its stacks in `STACK_STYLES`. None of it is in `MODEL_TABLE`, so the pack table's "in use" for it comes from the recipes. Its roads, pavements and city hall are not used. The Town Pack's whole houses are in `MODEL_TABLE` with their doors in `BUILDING_FRONTS`; `polygon.test.ts` pins both. Which City Pack pieces are never used, and why, is in `docs/city-style/exclusions.md`.

| Pack id | Style | Converter scale | Status | What it supplies |
| --- | --- | --- | --- | --- |
| apocalypse-power | POLYGON Apocalypse (the power subset) | 1 | in use | pole `SM_Prop_Powerpole_01`, lamp post `SM_Prop_LightPole_01` |
| simple-town | SIMPLE Town | 100 | in use | every building today (placeholder style); `scaleOverrides` for two stations and one road tile |
| town-pack | POLYGON Town Pack | 1 | in use | twelve whole houses and a garage (048: `SM_Bld_House_Preset_01` to `_11`, `SM_Bld_House_Preset_Garage_01`); a church, a shed and props are not placed, except the house concrete steps (055 F, 16.10) |
| city-pack | POLYGON City Pack | 100 | in use | stacked buildings (050 C): shops, apartment and office floors and roofs, assembled from `STACK_STYLES`; roads, pavements and a city hall are not used |

The converter's `scale` is each pack's `pack.json` value, which the drift test checks against `assets/private/out/manifest.json` when that is present. The manifest readings are in `docs/city-style/evaluation.md`.

## 14. Licence handling

- **Rule [D-039a]**: GLBs reach a web build only if end users cannot get them and the site is behind a password. Josh copies `assets/private/out/` to the site himself. No script, workflow or agent uploads a GLB.
- **Rule [D-038a]**: everything under `assets/private/` is gitignored and never committed. `git ls-files assets/private` is empty. No `.glb`, `manifest.json` or `private` path appears in `dist/`. The loader fetches the manifest and GLBs at run time and never bundles them.
- **Default (039)**: with no manifest, or any missing or broken file, the view falls back to the placeholder shapes with one console info line and no error.
- Model names are not licensed content and may appear in code and in this guide. Meshes, textures and the manifest are not. The subscription ends access for new work when it lapses (the asset-scout's note in `assets/candidates/synty-store.md`).

## 15. Adding a pack, step by step

Steps 1 to 4 are Josh's. Steps 5 to 9 are a renderer ticket.

1. Unpack the FBX source under `assets/private/in/<pack-id>/`.
2. Write `pack.json` (`scale`, `scaleOverrides`, `textures`, `textureAliases`), per `tools/blender/README.md`.
3. Run `npm run assets:convert <pack-id>`.
4. Read the manifest for `scale-suspect`, `missing-texture` and failures. Fix them in `pack.json` and convert again.
5. Calibrate every building's door side by clicking each door in the gallery. `fronts=1` still works over a whole town. Until a pack is promoted into code, its door sides live in the saved file on Josh's PC. A pack is promoted by hand: the renderer reads the saved file (read only), copies each of the pack's entries into `BUILDING_FRONTS` as a `pack:name` line and each Shift+clicked one into `BUILDING_EXCLUDE`, writes the file's `savedAt` in a code comment and in chapter 6, and lists every line in its report for Josh to check. The saved file keeps overriding in a dev build with identical values.
6. Check the families (`meshFamily`).
7. Add rows to `MODEL_TABLE`. Lot types are computed from bounds, never hand-set.
8. Add any exclusions to `BUILDING_EXCLUDE` (as `pack:name` keys).
9. Update the pack table above in the same branch; the drift test fails if `MODEL_TABLE` and the table disagree.
10. A modular pack (Base, Floor, Roof, Corner pieces) is assembled instead of listed whole: write a recipe in `stacks.ts` (a `StackStyle` per look, by role, with its `pitch_m`), check its floor ranges against `STACK_LOT_TYPES` and `STACK_FLOORS`, look at it in the stack gallery and fix any door or `open` side by clicking, then promote the pack's fronts (step 5). A type uses the stacks when enough styles reach `POLYGON_MIN_FAMILIES` (chapter 5).

The pack gallery is `/?puzzle=09-shrine-circuit&view=3d&gallery=<pack-id>` (an empty value is `simple-town`); the stack gallery adds `&stacks=1` and `gallery=city-pack` (code in `stackgallery.ts` and `stacks.ts`). Both are dev only, never a pick target and never part of a playtest. A click on a door copy saves its front. How the galleries read is in `docs/city-style/evaluation.md`.

Gotchas converting the POLYGON packs:

- The City Pack needs `"scale": 100` in its `pack.json`.
- The Town Pack needs `textureAliases`: its materials point at Photoshop files and renamed images that are not in the pack. Alias keys are normalised, so give one key per file-name stem; a `.png` and a `.psd` of the same stem collide, and the converter refuses the pair.
- The converter has no include filter: it converts every FBX under the pack folder. For a buildings-only GLB, copy only the buildings (and their `Textures/`) into a smaller pack folder.
- City Pack buildings are modular and need assembling from parts, unless a whole variant is used.
- `SM_Bld_Station_01.fbx` and `SM_Env_Flower_01.fbx` in the City Pack are ASCII FBX, which Blender cannot import, so they do not convert.
- Duplicate file names across subfolders fail to convert (the Town Pack's characters).
- A converted pack's pivots are centred, so a door side is never in the data.

## Open questions

- **Open**: whether `small` and `house` lots go City Pack stacks too, whether the outer blocks and the circuit's streets may differ, and whether SIMPLE Town stays anywhere once POLYGON covers every type. The stacks' doors and corner sides are still provisional (chapters 6 and 7), and the terrace and the dressing are later tickets. Waits for: a ruling from Josh.
- **Open**: whole-building `MODEL_TABLE` rows for any other pack, their door sides, their lot types from bounds and any exclusions (chapter 15, steps 5 to 8); for a modular pack the stack recipes (step 10) replace the rows. Waits for: a POLYGON adoption ticket.
