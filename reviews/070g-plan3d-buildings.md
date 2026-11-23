ticket: 070g-plan3d-buildings
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section G of ticket 070: the assemble view (`?view=3d&city=plan&stage=assemble`) runs the pipeline to stage 5 and swaps E's grey mass for City Pack pieces. Each piece is cloned at the `CityPlacement` stage 5 wrote, one group per building painted in its colourway. One grey `InstancedMesh` holds the ground slots, with a whole-column grey fallback wherever a model is missing. Render3d makes no choice of its own, and only `plan3d.ts` and its test change.

## Does the branch do it?
1. **The run goes to stage 5.** Done. `createPlanAssembleRenderer3d` now calls `runCity(..., "buildings")`. A failed run still goes through `planFailureText`, and a new test case covers a failure at stage `buildings`: nothing is drawn and the text is right. `planview.ts` and `planview.test.ts` are not in the diff. One gap: every renderer test passes `opts.run`, so no test exercises the default `runCity` call itself (could improve 1).
2. **Pieces from placements only.** Done.
   - `planPieceDraws` is pure and returns the listed fields. `buildingBoxes` builds one `building:<id>` group per building and one `piece:<key>` wrapper per piece. Each wrapper gets the placement's position times `WORLD_PER_METRE`, `yaw_deg` in radians and scale `S`, plus a `clone(true)` of the root with raycast off.
   - `paintStack` is used as it is, with one `createColourwayCache` per draw, freed by `buildings.dispose`.
   - The grey `InstancedMesh` has one instance per column: the ground slot when all of the column's roots are present, otherwise 0 to the roof's `y_m`.
   - The tests match the ticket's list. "draws one wrapper per piece…" checks world matrices against placements and checks that the corner yaws are {0, 90, 180, 270}. "paints a building…" covers painted, base and not-loaded buildings, with each count asserted above 0 so the test cannot pass empty, and checks that the source material is untouched. "with empty roots…" covers all-grey at full height, the ground slot when all roots load, and one key missing (the most-used key) making exactly its columns fall back.
   - render3d reads no kit table, style table or `BODY_M`. `allStackKeys` is used only for the stop rule's "a stack key the page loads", which the ticket names.
3. **Draws only; the digest-diff test.** Done. The 20-run test checks all five digests before and after, exactly-once listing (by placement identity) with the building's own colourway, one grey instance per column, E's counts, and the Ls' columns drawn from their own pieces (with `ls > 0` asserted). The full Three.js group is built on the default city and the four pin cities. The failing fixtures are built in the test, not pinned: one piece dropped, one piece listed twice, a built cell's column removed (`PlanStopError` naming that cell, checked in `buildingBoxes` against `mass.built`), and no `columns`. Two extra stops are also covered: no roof, and a non-stack key.
4. **Draw calls.** Done.
   - The tile and interior caps are asserted as in E, and the grey boxes are asserted as one InstancedMesh. No cap is added.
   - The `it.skipIf(!HAVE_GLB)` report reads the GLB lazily. I ran it here (`-t "reports the building draw calls"`). 6 x 6 s1: before 1, after 7669 (7668 pieces, one primitive each; floor 3620, floor3 1408, roof 2640). 6 x 6 s3: 7811.
   - The console line now carries building groups, pieces cloned, fallback columns and `gl.info.render.calls`. It prints on the first frame drawn after the swap, which is right because `gl.info` resets per render.
   - The `city=tiles` comparison is not in the code. The ticket lets the builder report it or say it can't; I can't see the builder's report (could improve 2).
5. **Nothing else changes.** Done. The diff is `plan3d.ts`, `plan3d.test.ts`, and the playtester's own `playtests/070g-plan3d-buildings.md`. `planInput` adds `stackRoots(set)` and `set.colourways`, both exported from `models3d.ts` and read as they are. No load is added, and `models3d.ts`, `tilecity3d.ts`, `renderer.ts` and `planview.ts` are untouched. There is a test for `planInput`.
6. and 7. **Browser checks and screenshots.** Main session only. Not judged here.
8. **Test load.** The main session's gate was green on d8fd481. The heavy blocks have a 120 s timeout and the named runs share a module cache.

## Rule conflicts and risks
- No hard-rule break found. Nothing in `src/grid/`, `src/night/`, `src/city/` or `src/core/` is touched, there is no new dependency, and no GDD rule changes.
- R-7: `buildingBoxes` and `planPieceDraws` do one pass over the columns, with Set and Map lookups. That is linear.
- Performance risk for criterion 6: about 7,700 draw calls on the default city, one per cloned piece. The ticket expects this and sends it to Josh, with instancing as a later ticket. The main session should watch the frame rate closely on a phone.
- A malformed layer, such as a column with no ground slot, would throw a TypeError rather than `PlanStopError`. F2's types make that impossible today.

## Must fix
none

## Could improve
1. `plan3d.test.ts`: add one renderer case without `opts.run` (or with a spy on `runCity`) so criterion 1's `"buildings"` argument is checked by a test and not only by reading the code.
2. Put the `city=tiles` stack-mesh comparison into the skipIf report, or have the builder's report state that it cannot be done from exported functions, as criterion 4 asks.
3. The 20-run digest test calls `plan3dGroups` with empty roots only, so painting and cloning never run under the digest check. Running it once with `stackRoots()` and `LOADED_WAYS` on the pin cities (already built there) would close that.
