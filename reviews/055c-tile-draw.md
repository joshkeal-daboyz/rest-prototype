ticket: 055c-tile-draw
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section C of 055: draw the pure tile city (from A) in 3D, with one InstancedMesh per City Pack key, a per-role code-drawn fallback, a puzzle-free `SceneBundle` that `applyModels` can run on, a labelled tile sheet, and a dev-only `city=tiles` switch in `renderer.ts`. All of this must stay CI-safe and must leave every puzzle map's path untouched (design items 11 and 12, criteria 13 to 16, plus "Every section").

## Does the branch do it?
I diffed against `ticket/055a-tile-grid`. The branch touches `models3d.ts`, `renderer.ts`, new `tileslots.ts` with its test, and new `tilecity3d.ts` with its test. All of these are in C's Files list. `tilecity.ts` is not touched, and no file in the must-not-touch list is. `npx vitest run --maxWorkers=2` on `tilecity.test.ts`, `tilecity3d.test.ts` and `tileslots.test.ts` gives 85 passed, and `npx tsc --noEmit` is clean. The main session's gate was green.

- **13, per-role fallback: met.** `tilecity3d.test.ts` "per-role fallback":
  - With the whole pack, `codeDrawn` is 0. Each key's instance count equals the cells that want it, and the test computes those counts with its own `wantKey`, written from the ticket's rule rather than from `tileKeyOf`.
  - One generated case per role removes that role's keys, and only that role's cells become code-drawn. The exception is `junction`/`lotSurface`, which share `Road_Bare_01` as the ticket itself designs. The test handles that honestly with the `lost` set, and `tileslots.test.ts` pins that this is the only shared key.
  - With no entries, every cell is code-drawn in 3 meshes or fewer, and the bundle's tile meshes stay within `TILE_DRAW_CALLS_MAX`.
  - There are extra tests for a partial role (one pavement key missing), a root with no mesh, and the draw-call cap dropping the keys with the fewest cells.
- **14, levels and seams: met.**
  - "puts every pack tile at its cell centre…" decomposes every instance matrix and compares it to a composed expectation.
  - "stands the carriageway at -SIDEWALK_TOP_M…" covers every road role at -0.30 m, every pavement role with its top at 0, and the shared `Road_Bare_01` at two levels. The code-drawn quads and boxes are checked at the same cells and levels, and the kerb strips against a neighbour map built independently.
  - The real-manifest check sits inside an `it` and returns when the file is absent. This worktree has `assets/private/out/manifest.json`, so it ran here and passed: every role key is in the city-pack entry at 5 or 10 by 5 m, and the sidewalks are 0.30 m high.
  - Tolerance is 1e-6 on scale and 1e-5 on elements where the criterion says 1e-9; see Could improve 1.
- **15, the switch: met.**
  - `tileslots.test.ts` "cityTilesRequested" covers: null without `city=tiles`; the 3 x 3 / seed 1 default; `blocks` clamped to 1..6; integer seed only; `sheet=1` only.
  - The source tests in "the dev switch" show the read sits behind `import.meta.env.DEV`, comes after the gallery and before `buildScene(puzzle` / `createCameraRig(puzzle`, and that no other line of `renderer.ts` names the city.
  - `hitTest: () => null` is in the renderer. A raycast test through 120 tiles, the ground, the yards and the placeholders hits nothing. The models `applyModels` adds later already no-op `raycast` in `models3d.ts`.
- **16, puzzle-free bundle: met.**
  - "has no wires, places, poles, hardware, captions or node parts" checks exactly that.
  - "applyModels swaps the terrace placeholders for packed stacks as on a ladder map" uses a town carrying 01-first-light's terrace rows (B has not landed yet) and the stack fixture plan, and checks styles and yaws against `packTown`. `remove()` restores the placeholders.
  - "with no City Pack applyModels leaves the placeholders" covers the no-pack case.
- **17 and 18** are the main session's (screenshots and the `dist/` string check). I did not run them. The code has the right shape: the sheet labels each piece with its role, its turn and what its front must show, with an arrow along +z (and +x for corners). The `console.info` line is exactly the ticket's. The DEV guard is the same `DEV && … ? … : null` pattern the street camera already uses, so Vite should fold it to `null` and drop the module. Only the 18 check confirms that.
- **21 and 22, every section:** the Files are respected and nothing under `assets/` is touched. `src/core/`, `src/render/`, grid, night, play, ui, `tests/`, `puzzles/` and `tools/` are not edited. `tilecity3d.ts` imports one type and one constant from `src/render/`, as ten other `render3d` files already do. That is not an edit.

**The builder's reported deviations:**
1. **Its own camera for the city instead of the gallery rig.**
   - Design item 12 says the city is shown "on the gallery's rig (`createGalleryRig`, pan and zoom, framing the whole city at start)". The branch uses the gallery rig only for the sheet. The city gets a new `createCityRig`: the play camera's elevation and FOV, a fit-to-frame by bisection, pan, dolly zoom and reset. The reason given in the code is that the gallery rig looks along a line from 15 degrees up and pans along x only, which cannot judge a street grid from above.
   - No acceptance criterion names the rig. What criterion 17 needs (the whole city framed, pan and zoom) is delivered, and `createCityRig` has its own tests for framing in three aspect ratios, pan round-trip, zoom, reset and insets. `gallery.ts` and `camera.ts` are only imported, not edited.
   - So this deviation from the design text is not against a criterion, and the reason looks sound to me. It should be put to Josh as a deviation and recorded in chapter 17 (section D); see Could improve 2.
2. **Signatures differ from the Interfaces list.**
   - `buildCityScene(city)` has no `opts` and returns a `CityScene` (a `SceneBundle` plus `tileDraw`/`useTiles`).
   - `tileGroup` matches the listed signature, adds an optional `maxCalls`, and returns a superset of the listed result.
   - `tileSheet(roots, entries): Group` became `buildSheetScene(roots, entries, opts): SheetScene`.
   - The Interfaces section says "the builder may rename", and every listed field is still there. Acceptable.
3. **Its own key choices.**
   - `parkingPlain` → `SM_Env_Road_01` is what design item 5 already says ("plain `Road_01`").
   - `crossing` → `Road_Crossing_01` is item 4's key.
   - `plaza` → `Sidewalk_Panel_01` is the builder's choice; the ticket names no plaza key. Panel_01 is the 5 x 0.30 x 5 slab, so it sits on the pavement level like the other sidewalk tiles, and the real-manifest check confirms 0.30 m. Reasonable, but see Could improve 3.
   - None of these is excluded by `CITY_NEVER_USED`.

**GDD rules.** None is touched: this is rendering only, and there is no puzzle in the view. The "Rules carried over" (lamps as leaves, letting go, death rollback, dawn, pause) are not in scope here.

**3D-game portability.** `src/grid/` and `src/night/` are not touched.

## Rule conflicts and risks
- **Copied placeholder code.** `tilecity3d.ts` re-implements `scene.ts`'s private placeholder layout and `pitchedRoof` (`placeholdersOf`) so that `applyModels` finds and blanks them as it does on a ladder map. This is needed because `scene.ts` is must-not-touch. The risk is drift: if `scene.ts` changes the placeholder group layout, the tile city's placeholders and `applyModels` could disagree silently. The test "is the town's lots and terrace runs" only checks the terrace group's child count.
- **Code-drawn kerb strip.** It stands from 0 to `KERB_H` on top of the pavement (a raised lip at the kerb edge), not as a face between the carriageway and the pavement. It is "today's kerb strip", but it may read oddly in the CI/no-pack view. That is for the eye in criterion 17.
- **Criterion 18 is unverified until the main session builds.** `tilecity3d.ts` is imported statically by `renderer.ts`, so the `tile city:` string leaves `dist/` only if tree-shaking drops the module. The street camera's pattern suggests it will.
- **`cam=street` before B merges.** On this branch the tile town has no terraces, so `cam=street` logs "no row of buildings to look along yet" and stays overhead. That is expected for C alone, but the criterion-17 street URLs only become meaningful once B is in.

## Must fix
none

## Could improve
1. `tilecity3d.test.ts` "puts every pack tile at its cell centre…": criterion 14 says the scale is 1 within 1e-9. The test reads float32 instance matrices, so 1e-9 cannot be reached there; the 1e-9 check is only on `tileMatrix` (float64), in the patch test. Add one line that checks `tileMatrix`'s decomposed scale / `WORLD_PER_METRE` within 1e-9 for every cell, so the criterion's number is tested where it can hold.
2. Record the city rig deviation (design item 12 named `createGalleryRig`) where Josh will see it: in the main session's summary to him, and in chapter 17 when D writes it.
3. Note in `tileslots.ts` (or in chapter 17 in D) why `plaza` is `Sidewalk_Panel_01` and not 052 C's `_Panel_02`: same level as the other sidewalk tiles, 0.30 m slab. Then the choice reads as intended, not as a typo against 052 C.
4. Add a test that pins the placeholder group layout `placeholdersOf` must match (group names and four InstancedMeshes per type) against what `scene.ts`'s `buildScene` produces for one ladder map. Drift would then fail a test instead of passing silently.
5. The real-manifest test uses `return` when the file is absent, so it reports a pass. `it.skipIf(!existsSync(file))` (or `ctx.skip()`) would report it as skipped, which is what the CI-safe rule says.
