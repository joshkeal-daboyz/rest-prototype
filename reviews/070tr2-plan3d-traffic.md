ticket: 070tr2-plan3d-traffic
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
TR2 draws every stage 9 `traffic.pieces` entry at its placement in J's one stage 8 instancer call, dark, with the stop sign painted from `01_A` fetched into its own `ModelSet.signColourways`. It also gives R12 a typed allowance for Q33's five signal keys on their own kinds only, and adds the guide's two 16.6 lines and grammar rule 13. It adds no rule, number or cap.

## Does the branch do it?
Reviewed at f6c0d1f against base 525342c. I ran `styleguide.test.ts` and `colourway.test.ts` (113 passed). The main session's gate covers the rest.

1. **Run to stage 9.** `createPlanAssembleRenderer3d` calls `runCity(..., "traffic")`. The source regex now reads `"traffic"` and refuses `"facades"` and `"ground"`. A new case in the routing test gives the renderer a failure at `traffic`: nothing is drawn, `planFailureText` names the stage, and the info line is checked. The module cache runs through `"traffic"`, and `offStages()` gains `trafficStage`. Met.
2. **Pieces from placements, one call.**
   - `planTrafficDraws` is pure. It stops with `PlanStopError` on a missing layer and on a key outside `planKeys()`, with the cell named.
   - `furnitureStages` sends props first, then traffic, through a single `instancedOf(... FURN_DRAW_CALLS_MAX)`. Each piece goes through `furniturePlacement` with `{pavement_m:0, yard_m:0}`, `lift = y_m`, `flat:false` and yaw in radians, so TR2 types no level of its own.
   - Each stage's summary is cut from the shared group by key. `propStage` now delegates to it, and J's existing tests pass unedited.
   - Tests:
     - all seven kinds at all four turns, against `dressMatrix`, including fixed pieces;
     - one key's root missing at a time: only that key is lost, and stage 8's counts are unchanged;
     - empty roots draw none.

   Met.
3. **Draws only, exactly once.**
   - On the 20 named runs: listed once, in order; full stub pack with no key left out; per-key instance count equals the listed count; the cap holds.
   - On the default city and the four pin cities: digests from streets to traffic are unchanged before and after `plan3dGroups`, every cap holds, and there is one shared group.
   - Failing fixtures: a piece dropped, a piece listed twice, no traffic layer, and `SM_Prop_Sign_GiveWay_01` (cell named).

   Met.
4. **Dark.** The stub roots have emissive colours and emissive maps. Every traffic InstancedMesh comes out with emissive 0 and no map, the root's material is untouched, and the `Light` count is the same (0) with and without traffic. The GLB check behind `skipIf(!HAVE_GLB)` reads the glTF JSON lazily. Met.
5. **Stop sign from `01_A`.**
   - `STOP_SIGN_COLOURWAY` is exported and the pool comment corrected. `COLOURWAY_POOL` is unchanged.
   - `LoadDeps.signColourways` and `ModelSet.signColourways` are added, and `loadColourways` gains optional `ids` and label parameters. Ids that are not colourway ids, or are in the pool, are refused with one line each.
   - `sharedTileModels` gains its second parameter. `planInput` returns `stopAtlas`.
   - `plan3dGroups` clones the stop root, paints the clone with `paintStack` through a cache freed in `dispose`, and swaps it into the roots only for the instancer call.
   - Tests:
     - only the stop sign meshes take `01_A`;
     - other traffic, stage 7 and stage 8 maps are unchanged;
     - root materials and maps keep their identity;
     - buildings are identical with and without the atlas;
     - no atlas or no root gives the base map;
     - `colourway.test.ts` adds new cases (one more fetch, which lands in `signColourways`; the pool still says "7 of 7"; refusals; manifest and failed-load drops).

   The one existing line changed in `colourway.test.ts` is an import. Met.
6. **Keys load.** `planKeys()` equals the old list plus the seven, and the old prefix is unchanged. `PLAN_TRAFFIC_KEYS` equals the kit's `KEY_OF_KIND`, imported only by the test. The seven are in none of `dressKeys`, `furnitureKeys`, `allStackKeys` or `planTileKeys`. Every listed key on the 20 runs is loaded, and the stage 8 and stage 9 keys are disjoint. Met. Whether the keys load in the browser is the main session's check.
7. **R12.**
   - `planAudit` reads `traffic.pieces`.
   - `PLAN_TRAFFIC_ALLOWED` is one typed table, checked against the layer, the kind and the key. A test shows it equals `TRAFFIC_ALLOWED` as a set and `KEY_OF_KIND` for the five kinds. `CITY_NEVER_USED` is unchanged.
   - The audit is empty on the 20 runs.
   - Fixtures, each naming exactly that piece and stopping `plan3dGroups` with an R12 error: the four the ticket lists (a prop re-keyed to the mast, a stop sign re-keyed to `TrafficLight_01`, the arm key on a mast, `Lights_01` on an arm), plus a fifth (the mast key on a walk head).

   Met.
8. **Draw calls.** The stub-pack cap check runs on the 20 runs. Behind `skipIf`: the per-key bounds against `TRAFFIC_BOUNDS` and `MAST.axis`, and the calls and triangles stage 9 adds on seeds 1 and 3. The console line gains stage 9's drawn and listed counts, its calls, "stop sign on 01_A", and left-out keys. The line does not say how many of the seven keys loaded. The ticket asks only for "drawn out of listed, calls, 01_A, keys left out", so that is fine. Met.
9. **Guide and grammar.** The `SM_Prop_LightPole_*` row and the 16.6 Default line match the ticket's words. Rule 13 and the check-table row are present. The four new `styleguide.test.ts` cases cover the five keys and Q33, the stem staying on the never-used list, the TrafficLight row unchanged, the old line gone, Q35 and Q42, the rule 13 ids, Q numbers and four numbers, the Check line, and the table row. Met. The two edits outside the Files are covered under Rule conflicts.
10. **Nothing else.** The diff touches only the listed files. `planview.ts`, `tilecity3d.ts`, `dressing.ts`, `furniture.ts`, `escapes.ts`, `citymetrics.ts`, `renderer.ts`, `lighting.ts`, their tests and `trafficpin.test.ts` are not edited. The ladder is the playtester's. Met as far as code goes.
11 and 12 are the main session's. A no-browser report test names a signal-junction address and an all-way-stop address for seeds 1 and 3.
13 is the builder's run, plus the gate (green).

## Rule conflicts and risks
- **`styleguide.test.ts` line 135 (outside "new cases only").** The "tags every rule" regex gains `07[0-9]`. This does not loosen the check. It still demands a three-digit ticket number of the project's form inside the bullet's parentheses. The ticket itself dictates the text `**Default (070 TR)**`, which the old regex (037 to 069) could not accept, so the cut forced the edit. The widening to 071 to 079 is the same allowance `06[0-9]` gave before 069 existed. Acceptable.
- **Guide Numbers row `STOP_SIGN_COLOURWAY.length | 4 | colourway.ts` (outside "the two 16.6 lines only").** This is forced by the existing 054 C test, which wants a Numbers row covering every non-function export of `colourway.ts`. It adds a check and loosens none. The pin is weak: it checks the id's length, not "01_A". The id itself is pinned by `colourway.test.ts` and by the 16.6 text test. Acceptable. The ticket should have listed it.
- **Merge with goal/city-style (L2c at cf254e7).** `styleguide.test.ts` will conflict at the end of the file. L2c appends `describe("the guide's L1 leftovers are marked (ticket 070 L2c)")` after the same closing `});` at line 1023 where TR2 appends its describe. The fix is to keep both blocks, in either order. L2c's new `CELL_M` import (line 31) and TR2's regex edit (line 135) are in separate hunks, so no conflict is expected there. `docs/city-style-guide.md` has separate hunks: L2c at lines 656 and 797, TR2 at 359, 389 and 1177. So does `docs/city-grammar.md`: L2c at 70, 136 and 184, TR2 at 273 and 309. Neither should conflict. I could not dry-run the merge (the hook blocks `git merge-tree`), so this comes from the hunks.
- goal/city-style has also gained 94cc701 (TR1c cut: stop-sign keep-out measured from the post). If TR1c later moves stop-sign placements, TR2's tests should hold, because they count against the layer rather than pinning positions. The skipIf bounds test is unaffected.
- No hard-rule break: nothing in `src/grid/`, `src/night/`, `src/city/` or `src/core/` is touched. `plan3d.ts` imports nothing from `src/city/traffic/`. No new dependency.

## Must fix
none

## Could improve
1. `plan3d.ts` exports `PLAN_TRAFFIC_KEYS`, `furnitureStages` and `PlanFurnitureStages`, which are not in the ticket's Interfaces list. They are reasonable (the test compares `PLAN_TRAFFIC_KEYS` with `KEY_OF_KIND`, and `furnitureStages` is the shared call). The next cut should name them, or they should stay unexported apart from what the tests need.
2. The console line could also say how many of the seven traffic keys loaded. That would make criterion 11's "seven keys loaded" readable from one line, without working it out from "keys left out" and the tile line.
3. The `STOP_SIGN_COLOURWAY.length` Numbers row pins a string's length. A note in the guide's Numbers preamble, or a test that refuses `.length` rows on string exports, would stop this from passing as a meaningful pin.
