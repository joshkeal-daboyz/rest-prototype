ticket: 040-per-model-scale
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Fix the transform bake in `convert_fbx.py` (snapshot world matrices before non-mesh objects are deleted, identity parent inverse under the root), then add an optional per-model `scaleOverrides` to `pack.json`. The wrapper validates it before spawning and passes it as sorted `--scale-override` args. The factor is recorded as `scale` per asset and per pack in the report and manifest. The GLB is exported to a temp file and only moved over once the root check passes. The README records the SIMPLE Town evidence.

## Does the branch do it?
I reviewed branch head 4097e6c. `npm test` passes (69 files, 1259 tests) and `npm run typecheck` is clean. `git diff main...branch -- src/ tests/ puzzles/ package.json` is empty, and no `assets/private` file is tracked.

**Wrapper criteria (Vitest)**
- **Arguments.** Met. `buildBlenderArgs` adds `--scale-override stem=factor` after the aliases (`tools/assets/convert.ts`). `readPackSettings` sorts the entries by stem with `compareNames`. The test "passes one --scale-override per entry, sorted by stem, after --scale (and after the aliases ...)" checks the exact ending the ticket gives, and a second case shows the aliases come first. "no scaleOverrides key, or an empty object, means no --scale-override" covers the no-key case. The self-test args test also gained `--scale-override scaled_box=10`.
- **Validation.** Met. The refusal test covers every refusal in step 2:
  - not an object (array, number, null, string)
  - a value that isn't a finite number above 0 (string, 0, -1, null, array, and 1e999 in its own test)
  - an empty key, or one with `/`, `\` or `=`
  - an unknown stem, including a typo and `Stem.fbx`
  
  Each case asserts exit 1, `Pack "<pack>" failed`, the key named, `conversions()` empty and no writes. `listFbxStems` mirrors the script's `find_files`: os.walk, extension in any case, stem cut at the last dot. It uses the injected `fs` deps, and the test "finds a model's FBX at any depth and with the extension in any case" covers it.
- **Manifest.** Met. `parsePackReport` now requires pack `scale` and asset `scale` through `scaleField`, and `buildManifest` passes both on. `manifest.test.ts` "ticket 040: scale, per pack and per asset" covers carrying the values from fixtures, a missing pack or asset scale (error names `pack "town": scale` / `assets[0].scale`), and non-positive or non-number values, including NaN and Infinity. `readPriorPacks` parses leniently (`requireScale: false`), so a manifest from before ticket 040 still loads. This matches the ticket's "optional so older manifests still type and load".
- **Selftest checker.** Met. `checkSelftest` checks the size of `SelfTest_ParentedPole` (0.4 x 3.0 x 0.4, base-centred) and of `scaled_box` (10 m). It also checks `scale` = 10 on `scaled_box`, 1 on every other box, and pack scale 1. The new describe block passes on `fixtures/report-selftest.json`. Each failure names the box and the field ("parented pole height", "scaled_box scale is 1, expected 10", "pack scale is 100, expected 1", "... is missing").

**Blender criteria (not in the gate; I can't run them)**
- **Bake fix.** In `import_one`, `worlds = {o.name: o.matrix_world.copy() ...}` is taken after `view_layer.update()` and before the non-mesh deletion loop. The bake reads `worlds[o.name]`, and `o.matrix_parent_inverse = Matrix.Identity(4)` follows `o.parent = root`. This is what step 1 asks.
- **Parented-pole self-test case.** The test pack has the empty rotated 30 degrees, scaled 0.01 and placed off the origin, with the mesh counter-rotated. That setup does separate a bake that reads the matrix after deletion (the pole would come out rotated and 100x too big) from a correct one.
- **SIMPLE Town numbers.** These are in `tools/blender/README.md`. The bake alone changed no model's bounds by more than 1%. With the three overrides, the sizes are plausible against named comparable models (`Building_Cinema`, `Building_AutoRepair`, `Building_House_05`, `roadLane_straight_Centered_mesh`). `scale-suspect` goes from 3 to 0, and `scale` shows 1, 1 and 10. The total is 173 models with 0 `missing-texture`. The numbers have to come from the builder's run; I take them as reported.
- **Safe export.** `convert()` exports to `temp_glb_path(out)` (`<pack>.tmp.glb` beside it). `install_glb` removes the temp file and leaves `out` alone when the root check fails, and on success calls `os.replace`. An exporter exception also removes the temp file. `check_install` tests this on real files in every self-test run. Whether the builder also did the throwaway forced-failure run is for its report.

**Nothing else moves.** Typecheck and tests are green. The test count grew: the new describe blocks in both test files. The playtest is the playtester's job.

## Rule conflicts and risks
- No rule conflicts. Only files under `tools/assets/` and `tools/blender/` changed, as the ticket lists. No dependency added, no Decided rule touched, `src/grid/` and `src/night/` untouched.
- Python behaviour is "tested" in Vitest by grepping `convert_fbx.py` source for exact strings: snapshot order, `install_glb` shape, self-test constants. These tests lock text, not behaviour. The real check is the Blender self-test, which is outside the gate. This is the pattern ticket 038 set, and here it is backed by `check_install` and the self-test cases, so it is acceptable.
- If Blender is killed mid-export, a leftover `<pack>.tmp.glb` can stay in `assets/private/out/`. It ends in `.glb`, so a loader that globs `*.glb` could pick it up. Ticket 039 reads GLB paths from the manifest, so this is low risk.

## Must fix
none

## Could improve
1. `tools/blender/convert_fbx.py` prints `scale override <stem> matched no model` when an override's FBX failed to import, but `convertPack` in `tools/assets/convert.ts` only echoes the `texture alias ... matched no material` lines. Echo the scale-override line too, so the user sees it.
2. The README's SIMPLE Town section states the bake-only result as "no model's bounds changed by more than 1%". The ticket asked for the `scale-suspect` count before and after the bake-only run, and for the three sizes before and after it. Stating "3 before, 3 after; sizes unchanged" outright would close that out. The 3 failures from the final run could be named there too.
3. `check_install` runs as part of every `--selftest`. That is a small step past the ticket, which asked for a one-off throwaway check. It is useful and cheap, so keep it, but the ticket's acceptance line could be read as satisfied by it rather than by a manual edit.
