# 072 · Convert four new Synty packs: Sci-Fi Frontier, Palm City, Sci-Fi City, Nature

owner: grid-simulator (owns `tools/`; Python allowed in `tools/blender/` only)
status: open
branch: `ticket/072-convert-four-packs`

## Josh's words (21 Nov 2026, in chat)
> "I have downloaded a bunch of new packs. You can begin the conversion process for all of them. In tandom with development"

That is this ticket's go-ahead. It runs alongside the 070/071 work and touches none of it.

## What is in the packs (read 21 Nov 2026, `D:\rest-prototype-main\assets\private\in\`)
| pack folder | FBX that are models | FBX that must not be converted | textures |
|---|---|---|---|
| `sci-fi-frontier-pack` (632 MB) | 512 in `FBX/` | 239 in `FBX/Collision/` (`*_Collision`), 7 in `FBX/FX/` (flame, cones, tumbleweed) | `Textures/` (with `Normals/`, `Emissive/`, `Alts/` subfolders) |
| `palm-city-pack` (378 MB) | 1101 in `SourceFiles/Models/` | 139 in `SourceFiles/Models/Collision/` | `SourceFiles/Textures/` |
| `sci-fi-city-pack` (308 MB) | 602 in `Source_Files/FBX/` | 40 in `Source_Files/Characters/` (skinned, two copies of each), 2 demo scenes `Source_Files/SciFiCity_Demo.fbx`, `_Demo_02.fbx` | `Source_Files/Textures/` |
| `nature-pack` (919 MB) | 202 in `FBX/` | 1 demo scene `Unsupported/POLYGON_Nature_Demo_Scene.fbx` | `Textures/` |

- None of the model FBX are ASCII (first bytes checked), so the OBJ fallback should not be needed. The `OBJ/` folders stay where they are.
- Each pack has a `MaterialList_*.txt`. It names each model's albedo image, and it is the source for any `textureAliases` a pack turns out to need.

**Why a converter change.** `convert_fbx.py` converts every `.fbx` under the pack folder (`find_fbx`, recursive). It has no way to skip a folder. Without one, the four GLBs would carry about 380 collision hulls, the characters and three whole demo scenes. A `pack.json` key alone cannot fix that, and moving files inside `in/` would break the packs as Synty ships them.

**Where it runs.** `D:\rest-prototype-goal\assets\private\` has junctions for `out` and `calibration` only. There is no `in`. The converter takes its root from its own file. Run from this worktree without `in/`, it would see no packs. Worse, the manifest merge keeps a prior pack only if its `in/` folder exists (`convert.ts`, `readPriorPacks(...).filter(... available.includes(p.pack))`), so a run there would **drop every existing pack from the manifest**. Setup step 1 below fixes this.

## Goal
Josh has the four new packs as GLBs in `assets/private/out/`, listed in `manifest.json` next to the four existing packs, which stay untouched. Each GLB holds only the pack's real models, at metre scale. There is a short conversion report for each pack. No game code reads the new packs yet. Choosing pieces from them is a later ticket (for example 071's pole and wire kit, Q9).

## Acceptance criteria
### A. The converter can skip folders and files (code; Vitest)
- [ ] (Vitest, `convert.test.ts`) `pack.json` accepts an optional `"exclude"`: an array of paths relative to the pack folder, each a folder or a single `.fbx` file. Either slash is accepted. Each is passed to the script as one `--exclude <abs path>` argument, in sorted order, after the scale overrides (`buildBlenderArgs`).
- [ ] (Vitest) `readPackSettings` throws a plain message for each of these: `exclude` is not an array of non-empty strings; a path points outside the pack folder, or is the pack folder itself; a path does not exist; a file entry is not `.fbx`; two entries are the same path once normalised.
- [ ] (Vitest) `listFbxStems` skips excluded paths. A `scaleOverrides` key naming an excluded model fails with the existing "there is no <stem>.fbx in the pack" error.
- [ ] (Vitest) `USAGE` documents `"exclude"` and says that it affects only which FBX are converted, not the texture or OBJ search.
- [ ] (selftest, `npm run assets:selftest`, one Blender run) `find_fbx` in `convert_fbx.py` drops every FBX at or under an `--exclude` path. Texture and OBJ lookups still search the whole pack (or `--textures`). The selftest fixture gains one FBX in an excluded folder, and `checkSelftest` fails if it reaches the GLB or the report. Its Vitest test covers the new check.
- [ ] Without `exclude`, the arguments and behaviour are the same as today. The existing `tools/assets` tests pass unchanged.

### B. Per-pack setup (config; the builder checks, no browser)
- [ ] Before any conversion, create a junction `D:\rest-prototype-goal\assets\private\in` -> `D:\rest-prototype-main\assets\private\in`, the same way `out` and `calibration` are linked (`cmd /c mklink /J`). Check that `ls assets/private/in` lists all nine pack folders. Without it, do not convert.
- [ ] Write `assets/private/in/<pack>/pack.json` for each pack (gitignored, never committed). Starting values:
  - `sci-fi-frontier-pack`: `{ "textures": "Textures", "exclude": ["FBX/Collision", "FBX/FX"] }`
  - `palm-city-pack`: `{ "textures": "SourceFiles/Textures", "exclude": ["SourceFiles/Models/Collision"] }`
  - `sci-fi-city-pack`: `{ "textures": "Source_Files/Textures", "exclude": ["Source_Files/Characters", "Source_Files/SciFiCity_Demo.fbx", "Source_Files/SciFiCity_Demo_02.fbx"] }`
  - `nature-pack`: `{ "textures": "Textures", "exclude": ["Unsupported"] }`
- [ ] **Scale.** Start with no `"scale"`. If after a run more than 10% of a pack's models carry `scale-suspect` and their bounds read about 100x or 0.01x, set `"scale"` to 100 or 0.01 (city-pack needed 100, town-pack 1) and run that pack once more. Do not run it a third time. If it is still wrong, report it and move on.
- [ ] `textureAliases` are added only for names the report lists as `missing-texture` or `texture-guessed` and the pack's `MaterialList_*.txt` resolves (albedo images only, never `Normals/` or `Emissive/`). If a pack has more than 20 such models, stop adding aliases and report the list instead.

### C. The runs (the builder; Josh's PC freezes under load)
- [ ] First: `npx vitest run tools/assets --maxWorkers=2` passes, and `npm run assets:selftest` passes.
- [ ] Back up the manifest once, before the first pack: copy `assets/private/out/manifest.json` to `assets/private/out/manifest.json.bak-072`. Save the four existing entries (`apocalypse-power`, `city-pack`, `simple-town`, `town-pack`) for the check below.
- [ ] **One pack at a time**, smallest first: `sci-fi-city-pack`, `palm-city-pack`, `sci-fi-frontier-pack`, `nature-pack`. The command is `npm run assets:convert -- <pack>`, naming exactly one pack. Never run it with no pack names (that reconverts all nine). Run it in the background and wait for it to exit. While Blender runs, nothing else heavy runs: no Vitest, no dev server, no browser, no second convert.
- [ ] After each run, check that each existing pack's manifest entry is identical to its entry in the backup (a node one-liner comparing the JSON). Check also that `out/<pack>.glb` and `out/reports/<pack>.json` exist. If an existing entry changed, restore the backup and stop.
- [ ] The existing GLBs, `out/city-pack/colourways/` and `assets/private/calibration/` are not rewritten. Their modified times are unchanged.

### D. The report (in the builder's hand-back; no file)
- [ ] For each pack: models converted, failures (each with its error's first line), counts of each warning (`scale-suspect`, `no-uv`, `missing-texture`, `texture-guessed`), the scale used and how many runs, the GLB size in MB, and the Blender wall time.
- [ ] For each pack, the pieces that look relevant to 071 (poles, power lines, cables, power boxes), by manifest name with their bounds in metres. Palm City has `SM_Prop_Powerpole_01..03` and `SM_Prop_Powerline_01..09`. Sci-Fi Frontier has `SM_Prop_Power_Pole_01..03` and `SM_Prop_Cable_*`. Sci-Fi City has `SM_Prop_Powerpoll_01/02`.
- [ ] (Josh, optional, in the browser when he likes) `npm run dev`, `/?puzzle=09-shrine-circuit&view=3d&gallery=<pack>` for each new pack. Its building-sized pieces stand upright, at a plausible size, textured.

### E. Nothing else moves
- [ ] (Vitest, the existing suite) No file in `src/` changes. No `MODEL_TABLE` row, colourway table entry (`COLOURWAY_SOURCES`) or style-guide line names a new pack. The main session's `npm run gate` stays green with the same count plus this ticket's new tests.

## Files
- `tools/assets/convert.ts`, `tools/assets/convert.test.ts`, `tools/assets/fixtures/` (if the selftest check needs one)
- `tools/blender/convert_fbx.py` (`find_fbx`, argument parsing, selftest fixture), `tools/blender/README.md` (one line on `--exclude`)
- Not in git: `assets/private/in/{sci-fi-frontier-pack,palm-city-pack,sci-fi-city-pack,nature-pack}/pack.json`, the `assets/private/in` junction, `assets/private/out/` (written by the converter only), `assets/private/out/manifest.json.bak-072`
- Out of scope: `src/` (all of it), other packs' `pack.json`, `out/` files of existing packs, tickets 069, 070 and 071

## Interfaces
- No `src/core/` change. The manifest's `AssetPack` / `AssetEntry` shapes (`src/core/assets.ts`) are unchanged. The exclusions are not recorded in the manifest: an excluded file simply never becomes an entry.
- New script argument `--exclude <abs path>`, repeatable, internal to `tools/`.
- No new dependency.

## Open questions
1. **Skip the Sci-Fi Frontier `FBX/FX/` meshes?** Recommended: yes. They are effect shapes (a flame, cones, irrigator sprays, one tumbleweed), not town pieces, and dropping them later would mean another 632 MB run. Say no and the builder removes `"FBX/FX"` from that pack's `exclude` before its run.
2. **Characters.** Recommended: skip Sci-Fi City's characters, as above. `city-pack` did convert its nine characters (all `scale-suspect`: about 182 m tall at its scale 100), and nothing uses them. Say so if you want them kept for later.
