ticket: 070j-plan3d-dressing
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section J of ticket 070 (re-cut at 9ae060c): the plan's 3D view runs the pipeline to stage 8. It draws every stage 7 piece (`facades.dressing`, `walls`, `roofs`, `novelty`) and every stage 8 prop (`ground.props`) at the placement its layer wrote, through the tile city's per-key instancer (`dressGroup`), with no colourway, no grey fallback and nothing emissive. It adds the R12 whole-plan audit (`planAudit`) with one allowance, the party pipe, and adds the party window and party pipe to `planKeys()`. Only `plan3d.ts` and `plan3d.test.ts` change.

## Does the branch do it?
Diff 9ae060c...f799495 touches only `src/render3d/plan3d.ts` and `src/render3d/plan3d.test.ts`. The gate was green on f799495 (reported by the main session). I did not re-run the suite.

1. **The run goes to stage 8.** `createPlanAssembleRenderer3d` now calls `runCity(..., "ground")`. The test "runs the pipeline to the ground stage when the page does not give a run" covers it. The renderer test also adds a failure at `stage: "ground"` that draws no `plan3d` and shows `planFailureText`. `planview.ts` is not edited. Met.
2. **Pieces from placements only, instanced per key.**
   - `planDressDraws` and `planPropDraws` are pure and carry list, index, building, cell, placement, and for a wall piece `scaleY` and `boxes`. For a prop they carry `on`, `flat` and `placement`.
   - `dressStage` makes one `dressGroup(..., DRESS_DRAW_CALLS_MAX)` call. Each placement uses the identity frame, the piece at `x_m`/`y_m`/`z_m`, the yaw in radians, `scaleY`, and boxes mapped to `EscapePart` (`partOf`).
   - `propStage` sends each prop through `furniturePlacement` with `{ pavement_m: 0, yard_m: 0 }` and `lift: placement.y_m`. It feeds `x_m * S`, which `furniturePlacement` divides back to metres, so the position is the placement's.
   - `expectDressPlaced`, `expectBoxes` and `expectPropsPlaced` check the instance matrix of every piece, not just a sample, against `dressMatrix` / `partMatrix`, on the default city and the four pins. They check the four turns (0, 90, 180, 270) and that some pieces are y-scaled and some have boxes.
   - The lotLines lift of 0.01 m and the billboardBoard at its `y_m` are tested.
   - The fallback rules are tested: a missing stage 7 key or stage 8 key loses only that key; a missing above-ground key drops only the pieces on the grey columns; a column grey only in its ground slot keeps its pieces; empty roots draw nothing. `BuildingsBuilt.whole` carries what the fallback reads.
   - The emissive swap is tested with glowing stub roots, and the test confirms the cached root's own material is not written. The base atlas on painted buildings is tested (no `stub-` colourway map on any J mesh).
   - Met. Weak spot: the test asserts at least 16 stage 7 kinds and 9 stage 8 kinds are present, not the named kinds (could-improve 1).
3. **Draws only, every piece once.** On all 20 named runs:
   - the layer digests are compared before and after, and against the run's own digests;
   - `dressListedOnce` / `propsListedOnce` and the order of each list are checked;
   - with a full stub pack, every piece is placed and drawn, `notDrawn` is empty and neither cap is passed;
   - G, G2 and E's counts are checked: `listedOnce`, `groundListedOnce`, one grey box per column with no roots, tile and interior totals and caps.
   - The full group with stub roots is built only on the default and the pins.

   The failing fixtures are there: one piece dropped from each list and from props, and one listed twice; the key left out by an oversized root, for both stages; `PlanStopError` with the cell named for an unloaded key in each list, an off-grid cell, an unloaded prop key, each missing list, and no ground layer. Met.
4. **R12.**
   - `planAudit` reads every list the ticket names plus the street and interior keys (`tileKeys`, the arrow, trees, `TILE_PROPS`, `INTERIOR_KEYS`). The corner doors are reached through `facades.ground`.
   - The allowance is one typed constant, `PLAN_AUDIT_ALLOWED = { key: PLAN_PARTY_PIPE, kind: "partyPipe" }`. `CITY_NEVER_USED` is not touched.
   - The audit is empty on all 20 runs, `_01` stands on none, and every `_03` is on a `partyPipe`.
   - All four fixtures (light pole on dressing, `_01` on a partyPipe, `_03` on a canopy, car prop) name exactly that piece and make `plan3dGroups` stop with "R12". `_02` is checked as well.
   - The GLB emissive check is inside `it.skipIf(!HAVE_GLB)` and reads the GLB inside the test. Met.
5. **The keys load.**
   - `planKeys()` is `planTileKeys()` plus the window and the pipe, and the test pins exactly that.
   - Neither key is in the dress, furniture or stack lists.
   - Every key placed on the 20 runs is loaded.
   - `tileGroupOf` now receives `planTileKeys()`, which is the old list, so E's street counts do not move. Met.
6. **Draw calls.** The stub-pack cap checks run on the 20 runs. The GLB report (calls before and after, the cost of cloning, `DRESS_MAX` overage, kinds, triangles) is inside `skipIf`. No cap moved and `DRESS_MAX` is not applied. The console line gains stage 7 and 8 drawn-of-listed and calls, the keys left out, and the next frame's calls; the renderer test asserts it. Met.
7. **Nothing else changes.** No other file is edited. `planview.test.ts` and `tilecity3d.test.ts` are untouched. The ladder is the playtester's to confirm. Met on the code side.
8–10. Criteria 8 and 9 are the main session's browser checks and screenshots. Criterion 10's runs are covered by the gate.

**The builder's correction (`dressInput` in `planInput`).** The correction is right. `propInput` (tilecity3d.ts:547) keeps only `TILE_PROPS`, so without it no stage 7 key and no stage 8 key outside `TILE_PROPS` would have a root in the browser, and the view would quietly draw nothing for J. `dressInput` is an existing export of `models3d.ts`, called read-only, and the change stays inside `plan3d.ts`. Merging all of `ModelSet.dress` into the roots map does not disturb the tile, interior or building groups, because each looks up only its own keys. A test covers it ("brings the dressing and furniture of a loaded set into the plan's input"), though thinly (could-improve 4). The two new keys come through `tileInput` (the tile list), as the ticket expected.

**The file-level `beforeEach` macrotask.** It is acceptable. It is a test-harness yield (`setTimeout(done, 0)`) with no assertion on timing, so it is not a tight timer. The file uses no fake timers, so it cannot hang. It leaves every test's behaviour unchanged and adds a negligible delay. It treats a symptom (long synchronous tests starving Vitest's reports to the main process), not a production problem, and the comment says so.

## Rule conflicts and risks
- No `src/grid/` or `src/night/` change, no new dependency, and no file outside the ticket's two. No Decided rule, cap, threshold or digest pin moves.
- In `plan3dGroups`, `planDressDraws` and `planPropDraws`, which can throw `PlanStopError`, run after `tileGroupOf`, `interiorGroupOf` and `buildingBoxes` have built their meshes. A stop on a missing list or an unloaded key leaves those groups undisposed. It costs a little memory on a stop path only, and the renderer draws nothing after a stop.
- `propKnown` also accepts `dressKeys()` and `TILE_PROPS` for a stage 8 prop. Both are loaded on the plan page, so this is not wrong, but it is wider than the ticket's list (`furnitureKeys()`, `dressKeys()`, `planKeys()`). The criterion 5 test still checks against the narrower set and passes.

## Must fix
none

## Could improve
1. `plan3d.test.ts`, the first J test: replace `kinds.size > 15` / `propKinds.size > 8` with the kinds criterion 2 names (glass, awning, each sign, ATM, each wall kind, each roof kind, face novelty, each stage 8 kind), so a kind that stops appearing fails the test instead of passing on the count.
2. `plan3d.ts` `plan3dGroups`: call `planDressDraws` and `planPropDraws` right after `planAudit`, before any Three.js group is built, so a stop builds nothing to leak.
3. `plan3d.ts` `propKnown`: drop `TILE_PROPS`, or say in the doc comment why a stage 8 prop may be a tile prop, so the stop matches the ticket's list exactly.
4. `plan3d.test.ts` `planInput` test: add a furniture key and a `TILE_PROPS` key to the stub set, so the test shows both stage 8 and tile-prop roots arrive (the gap the builder found was for furniture as much as dressing).
5. The file-level `beforeEach` could sit only on the heavy J describes, so the reason for it stays next to the tests that need it.
