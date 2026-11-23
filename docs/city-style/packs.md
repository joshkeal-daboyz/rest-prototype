# City style: Packs

## 13. Packs in the mix

- **Decided (043 Q4, Josh, 17 Nov 2026: "SIMPLE town was a test, the city stuff is higher detail")**: the target style is the POLYGON City Pack and Town Pack. SIMPLE Town is the placeholder and fallback until POLYGON buildings are in. This overtakes 041 Q4's "SIMPLE Town only", which stays the working set until a ticket adopts POLYGON buildings.
- **Default (048 Q1 to Q4, 050 C, on Josh's 17 and 18 Nov 2026 words above)**: the mix for now is City Pack stacks on `large` and `tall` lots, the Town Pack's twelve whole houses on the types they fill (chapter 5), and SIMPLE Town on the types neither fills and wherever the packs are absent. No whole City Pack building is placed, because Josh named none. The Church and the City Hall are held back for 042 E's landmark places. Lots are not resized for either pack (a later ticket does that: "lots are sized to buildings", 041; the terrace is 051).
- **Open (043 Q4, what 050 C leaves open)**: whether `small` and `house` lots go City Pack stacks too (050 Q1's alternative), whether the outer blocks and the circuit's streets may differ, and whether SIMPLE Town stays anywhere once POLYGON covers every type. The stacks' doors and corner sides are still provisional (chapters 6 and 7), and the terrace and the dressing are later tickets (chapter 15).
- **Info**: the pack table, from the manifest read on 17 Nov 2026 (`assets/private/out/manifest.json`; the converter's `scale` is each pack's `pack.json` value, which the drift test checks when the manifest is present).

| Pack id | Style | Converter scale | Status | What it supplies |
| --- | --- | --- | --- | --- |
| apocalypse-power | POLYGON Apocalypse (the power subset) | 1 | in use | pole `SM_Prop_Powerpole_01`, lamp post `SM_Prop_LightPole_01` |
| simple-town | SIMPLE Town | 100 | in use | every building today (placeholder style); `scaleOverrides` for two stations and one road tile |
| town-pack | POLYGON Town Pack | 1 | in use | twelve whole houses and a garage (048: `SM_Bld_House_Preset_01` to `_11`, `SM_Bld_House_Preset_Garage_01`); a church, a shed and props are not placed, except the house concrete steps (055 F, 16.10) |
| city-pack | POLYGON City Pack | 100 | in use | stacked buildings (050 C): shops, apartment and office floors and roofs, assembled from `STACK_STYLES`; roads, pavements and a city hall are not used |

- **Info (manifest, 17 Nov 2026)**: `town-pack` has 704 entries and 9 failures (character files with duplicate names). Of its entries, 2 are `scale-suspect` (`SM_Bld_House_DeckSteps_01`, 0 x 0 x 0, and `POLYGON_Town_Demo`) and 62 carry `missing-texture`. Preassembled buildings: `SM_Bld_House_Preset_01` to `_11` (from 5.7 m to 18.2 m wide, 4 to 9.4 m high), `SM_Bld_House_Preset_Garage_01`, `SM_Bld_Church_01` (10.4 x 16.5 x 14.4 m) and `SM_Bld_GardenShed_01` (2.3 x 2.8 x 2.5 m, prop-sized). It also holds many loose wall, deck and door pieces that are not buildings.
- **Info (manifest, 17 Nov 2026)**: `city-pack` has 355 entries and 2 failures. Its 30 `scale-suspect` entries are the characters (`SK_Char*`), the vehicles (`SM_Veh_*`) and the skyline (`SM_Env_Skyline_*`), about 100 times too big at `"scale": 100`. A `scaleOverrides` factor of 0.01 would be needed for any of them. Its buildings are right at 100. Its roads are flat 5 m tiles (`SM_Env_Road_*`), with pavements `SM_Env_Sidewalk_*`. Its buildings are mostly modular: Base, Floor, Roof, Glass and Corner pieces of one tower (`SM_Bld_OfficeSquare_*`, `_OfficeRound_*`, `_OfficeOld_*`, `_OfficeOctagon_*`, `SM_Bld_Apartment_*`) that need assembling, with a few whole variants (for example `SM_Bld_OfficeSquare_01`) and one whole `SM_Bld_CityHall_01` (20.1 x 8.7 x 17.6 m). The City Pack's stack pieces are in `BUILDING_FRONTS` (chapters 6 and 7, provisional) and its stacks in `STACK_STYLES`; none of it is in `MODEL_TABLE`, so the pack table's "in use" for it comes from the recipes. Its roads, pavements and city hall are still not used.
- **Info (048)**: the Town Pack's whole houses are in `MODEL_TABLE` (chapter 5) with their doors in `BUILDING_FRONTS` (chapter 6); `polygon.test.ts` pins both.
- **Pending (a POLYGON adoption ticket)**: whole-building `MODEL_TABLE` rows for any other pack, their door sides, their lot types from bounds and any exclusions (chapter 15, steps 5 to 8). For a modular pack the stack recipes (chapter 15, step 10) replace the rows.
- **Info (053)**: which pieces of the City Pack are used, which are never used and why, and which are missing against the reference are in chapter 16 (16.6).


## 14. Licence handling

- **Decided (039, Josh, 16 Nov 2026: "I have confirmed #4 is fine as long as the assets aren't available to the end user and I place the site behind a password" and "Testers may fetch it")**: GLBs reach a web build only if end users cannot get them and the site is behind a password. Josh copies `assets/private/out/` to the site himself. No script, workflow or agent uploads a GLB.
- **Decided (038, 039)**: everything under `assets/private/` is gitignored and never committed. `git ls-files assets/private` is empty. No `.glb`, `manifest.json` or `private` path appears in `dist/` (039's check). The loader fetches the manifest and GLBs at run time and never bundles them.
- **Info**: model names are not licensed content and may appear in code and in this guide. Meshes, textures and the manifest are not.
- **Info**: the subscription ends access for new work when it lapses (the asset-scout's note in `assets/candidates/synty-store.md`).
- **Default (039)**: with no manifest, or any missing or broken file, the view falls back to the placeholder shapes with one console info line and no error.


## 15. Adding a pack, step by step

- **Info**: steps 1 to 4 are Josh's. Steps 5 to 9 are a renderer ticket.
  1. Unpack the FBX source under `assets/private/in/<pack-id>/`.
  2. Write `pack.json` (`scale`, `scaleOverrides`, `textures`, `textureAliases`), per `tools/blender/README.md`.
  3. Run `npm run assets:convert <pack-id>`.
  4. Read the manifest for `scale-suspect`, `missing-texture` and failures. Fix them in `pack.json` and convert again.
  5. Calibrate every building's door side: click each door in the gallery (ticket 045). `fronts=1` still works over a whole town. Until a pack is promoted into code, its door sides live in the saved file on Josh's PC. A pack is promoted by hand (ticket 048): the renderer reads the saved file (read only), copies each of the pack's entries into `BUILDING_FRONTS` as a `pack:name` line and each Shift+clicked one into `BUILDING_EXCLUDE`, writes the file's `savedAt` in a code comment and in chapter 6, and lists every line in its report for Josh to check. The Town Pack was promoted this way from the file saved 2026-11-18T03:10:05.703Z. The saved file keeps overriding in a dev build with identical values.
  6. Check the families (`meshFamily`).
  7. Add rows to `MODEL_TABLE`. Lot types are computed from bounds, never hand-set.
  8. Add any exclusions to `BUILDING_EXCLUDE` (as `pack:name` keys).
  9. Update this guide's pack table in the same branch (the drift test fails if `MODEL_TABLE` and the table disagree).
  10. A modular pack (Base, Floor, Roof, Corner pieces) is assembled instead of listed whole: write a recipe in `stacks.ts` (a `StackStyle` per look, by role, with its `pitch_m`), check its floor ranges against `STACK_LOT_TYPES` and `STACK_FLOORS`, look at it in the stack gallery and fix any door or `open` side by clicking, then promote the pack's fronts (step 5). The town takes it from there: a type uses the stacks when enough styles reach `POLYGON_MIN_FAMILIES` (chapter 5).
- **Info (043 section B)**: the gallery is `/?puzzle=09-shrine-circuit&view=3d&gallery=<pack-id>` (an empty value is `simple-town`). It loads only that pack's GLB and shows every building-sized entry in one straight line along x, seen from a low camera. Each model stands four times side by side, turned so its side `+z`, `+x`, `-z` and `-x` faces you in turn, each captioned `door: f`. The copy whose real door faces you is the model's true front: name it (for example "Preset_03: -x") and that becomes its `BUILDING_FRONTS` line (`pack:name`). The copy that matches the front in force now is captioned `current` (the code's table), `current, saved` (the saved file) or `current ?` (no line anywhere: the "+z" guess), and has a green outline. The title says how many models of the pack are marked ("N of M marked"). Each group has one caption with the name, size in metres, lot type and any `corner` or `excluded` mark. Whole-looking buildings come first, modular parts after. Drag, the arrow keys, Home and End move along the line and the wheel zooms. `&page=N&per=N` pages it, off by default. It is off unless the flag is there, never a pick target and never part of a playtest.
- **Info (050 B)**: the stack gallery is `/?puzzle=09-shrine-circuit&view=3d&gallery=city-pack&stacks=1` (dev only, never in `npm run build`, never a pick target, never part of a playtest; the code is `stackgallery.ts` and `stacks.ts`). It shows every recipe assembled on each lot type it serves, at its most floors, as a mid-row stack and as a corner stack at each end, seen from the street. Each stack is captioned with its style, lot type, floors, height against the cap and every piece's key and front, marked `guess` unless the code's table or the saved file has the key. Below it, the click line shows the recipe's pieces (roofs included) four ways, and a click saves a front exactly as in the pack gallery. A saved "+z" counts as saved even when it came from a first click, so an unmarked piece still needs a look.
- **Info**: gotchas found converting the POLYGON packs (17 Nov 2026).
  - City Pack needed `"scale": 100` in its `pack.json`.
  - Town Pack needed `textureAliases` (its materials point at Photoshop files and renamed images that are not in the pack). Alias keys are normalised, so give one key per file-name stem: a `.png` and a `.psd` of the same stem collide, and the converter refuses the pair.
  - The converter has no include filter. It converts every FBX under the pack folder, so `town-pack` is a GLB of about 110 MB. To get a buildings-only GLB, copy only the buildings (and their `Textures/`) into a smaller pack folder.
  - City Pack buildings are modular (Base, Floor, Roof, Corner and Glass pieces) and need assembling from parts, unless a whole variant is used.
  - `SM_Bld_Station_01.fbx` and `SM_Env_Flower_01.fbx` in the City Pack are ASCII FBX, which Blender cannot import. They do not convert.
  - Duplicate file names across subfolders fail to convert (the Town Pack's characters).
  - A converted pack's pivots are centred, so a door side is never in the data.

