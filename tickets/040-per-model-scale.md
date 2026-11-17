# 040 · Per-model scale in the asset pipeline, and the transform-bake fix

owner: grid-simulator (owns `tools/`; Python allowed in `tools/blender/` only)
status: open
branch: `ticket/040-per-model-scale`

## Josh's words
> (the request, via the main session) a per-model scale in `pack.json`, because SIMPLE Town's `Building_PetrolStation` and `Building_PoliceStation` come out about 100x too big and `road_crossing_center_mesh` about 10x.

## Order
Independent of ticket 039. Either can land first: 039 reads the manifest's metre `bounds`, which this ticket corrects; it ignores the new `scale` fields. Once this lands and Josh re-converts, the corrected models lose `scale-suspect` and 039 starts using them.

## Goal
Josh adds `"scaleOverrides": { "Building_PetrolStation": 0.01 }` to a pack's `pack.json`, runs `npm run assets:convert`, and that one model is converted at the pack scale times 0.01, with the factor recorded in the manifest. First, though, the transform-bake bug the 038 review suspected is fixed, because it may be the real cause of the 100x, in which case fewer or no overrides are needed.

## The change
1. **Bake fix (038 review could-improve 1 and 2).** In `import_one`, snapshot every new mesh's `matrix_world` right after `view_layer.update()`, **before** any non-mesh object is deleted, and bake from the snapshot. Where a mesh is parented to its root, set `matrix_parent_inverse` to identity.
2. **`scaleOverrides`** (optional `pack.json` key): `{ "<model stem>": <factor> }`. The factor multiplies the pack's `scale` for that model (`global_scale = scale × factor`). Passed as one `--scale-override <stem>=<factor>` per entry, sorted by stem, after the `--texture-alias` items. Refused before spawning (exit 1, error names the pack and the key): not an object; a value that isn't a finite number > 0; an empty key or one containing `/`, `\` or `=`; a stem with no `.fbx` of that stem in the pack (found the way `convert` lists FBX, with `fs` injected).
3. **Recorded.** The report and manifest carry `AssetEntry.scale` (the factor used: pack scale × override, 1 by default) and `AssetPack.scale` (the pack's scale, default 1); `buildManifest` requires both from a report and passes them on. Types are already in `src/core/assets.ts`.
4. **Export safely (could-improve 7).** Export the GLB to a temporary file beside it in `assets/private/out/`, and move it over `<pack>.glb` only after the root-name check passes; on failure the temp file is removed and the old GLB stays.
5. **README.** `tools/blender/README.md`: `scaleOverrides` in the `pack.json` key list and the example; the SIMPLE Town worked example gains the overrides found below (if any), each with the evidence.

## Acceptance criteria

**Wrapper** (Vitest, `tools/assets/*.test.ts`, no Blender)
- [ ] **Arguments.** `{ "scale": 100, "scaleOverrides": { "road_crossing_center_mesh": 0.1, "Building_PetrolStation": 0.01 } }` gives arguments ending `--scale 100 --scale-override Building_PetrolStation=0.01 --scale-override road_crossing_center_mesh=0.1` (with aliases present, those come first). No key, no `--scale-override`.
- [ ] **Validation.** Each refusal in step 2 errors before spawning, naming pack and key, and `spawn` is never called.
- [ ] **Manifest.** `buildManifest` carries `scale` per asset and per pack from fixtures, and is a clear error naming pack and field when either is missing or not a positive number.
- [ ] **Selftest checker.** Passes on a fixture with the new boxes' expected results and fails naming the box and field when one is wrong.

**With Blender** (the builder runs these and reports the numbers; not in the gate)
- [ ] **Selftest** prints `selftest ok` with two new cases: (a) the fake pole parented under an empty with a 30° rotation and a 0.01 scale (could-improve 3) still comes out 0.4 × 3.0 × 0.4 m, base-centred; (b) `scaled_box`, a 1 m box with a `--scale-override scaled_box=10`, comes out 10 m with `scale` = 10 in the report, while the other boxes keep `scale` = 1.
- [ ] **SIMPLE Town, bake fix only** (no overrides): the sizes of `Building_PetrolStation`, `Building_PoliceStation` and `road_crossing_center_mesh` before and after, the `scale-suspect` count before and after, and every model whose bounds changed by more than 1%. If the fix alone brings them right, say so; no override is written without a size that doesn't fit a comparable model in the pack.
- [ ] **SIMPLE Town, with any overrides still needed**: those three are plausible against a comparable pack model (named), carry no `scale-suspect`, and `scale` shows the factor. 173 assets, 3 failures, 0 `missing-texture`, all as before.
- [ ] **Safe export:** with the root check forced to fail (a throwaway edit, not committed), the old `<pack>.glb` is unchanged and no temp file is left.

**Nothing else moves** (the main session checks)
- [ ] `npm run gate` green and the test count grown; `npm run playtest` green, no snapshot change; `git diff main -- src/ tests/ puzzles/` empty (the `src/core/assets.ts` fields are written by the architect on `main` before the build); `git ls-files assets/private` empty.

## Files
- `tools/assets/` (`convert.ts`, `manifest.ts`, their tests, `fixtures/`), `tools/blender/convert_fbx.py`, `tools/blender/README.md`. The local, gitignored `assets/private/in/simple-town/pack.json` may be edited.
- Out of scope: `src/` (all of it), `tests/`, `puzzles/`, `package.json`, and the 038 review items not listed above: `wire_image` repointing every image node at the base colour (could-improve 4; no pack with normal maps yet, cut it when one arrives), the atlas-mode selftest pass (3, second half), the kept-manifest GLB-exists check (5), and the README `Closest` line (6; ticket 039 sets NEAREST at load time).

## Interfaces
- **Written into `src/core/assets.ts` before the build:** optional `AssetEntry.scale` and `AssetPack.scale` (numbers). Optional so manifests written before this ticket still type and load; `ASSET_MANIFEST_VERSION` stays 1.
- No new dependency.

## Open questions for Josh (defaults apply if you just approve)
1. **Unknown stem in `scaleOverrides`.** Default: an error (a typo would otherwise leave a model 100x too big silently). Alternative: a log line like the alias-miss one.
2. **Decided rules.** None touched; tooling only. No `rules-coverage.md` change.
