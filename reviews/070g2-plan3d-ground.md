ticket: 070g2-plan3d-ground
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section G2 of ticket 070: the plan's 3D view runs the pipeline to stage 7 (facades). It draws every `CityGroundPiece` of `facades.ground` once, cloned, placed and painted the way G's floor pieces are, in its own building's group. The grey ground-slot boxes stay only where a ground piece's model is missing, and G's whole-column fallback is kept. The two corner-door keys are loaded by name. Only `plan3d.ts` and `plan3d.test.ts` change, and no layer is written.

## Does the branch do it?
Diff against `goal/city-style` 455db33: only `src/render3d/plan3d.ts` and `src/render3d/plan3d.test.ts`, as the ticket's Files list. I ran `npx vitest run --maxWorkers=2 src/render3d/plan3d.test.ts`: 39 passed. The GLB is present on this machine, so the draw-call test ran too.

1. **The run goes to stage 7.** Met in code. `createPlanAssembleRenderer3d` now defaults to `runCity(..., "facades")` (plan3d.ts ~line 694). Failures still go through the stage-agnostic `planFailureText` path. The 20 named runs in the test file are built with `runCity(opts, "facades")` (and the off-way stages list gains `facadesStage`), so a facades run succeeds and draws. Neither the default run nor a failure *at* `facades` has its own test. The existing failure tests use `mass` and `buildings` with an injected `run`. See Could improve 1.
2. **Ground pieces from placements only.** Met.
   - `planGroundDraws` (a sibling list, named) returns every ground piece in facades order, with its own building's colourway. It throws `PlanStopError` with the cells named in four cases: a column filled zero times or twice, a piece on a column of another building, an unknown building, or a key the page does not load.
   - `placedClone` is the floor pieces' wrapper code, moved into a helper and reused. So ground wrappers named `piece:<key>` are placed, turned, scaled, cloned and painted (the same `paintStack` pass over the group) exactly as G's are.
   - Grey boxes are still one `InstancedMesh`, with `mesh.count = used`:
     - a whole column with its ground piece drawn has no box;
     - a ground piece whose root is missing leaves a ground-slot box on each of its cells;
     - a column missing an above-ground root is one full-height box, and its ground piece is not cloned (`drawn` requires every cell's column to be whole).
   - Tests:
     - "draws every ground wrapper at its placement's position, turn and scale (all four turns)…" checks each world matrix through `expectWrapper`, that turns {0, 90, 180, 270} all occur, that a shopDouble is one wrapper over two cells, that corner doors are present, and that the colourway reaches the ground wrappers;
     - "with one ground key's root missing only the slots that use it are grey (both columns of a shopDouble)";
     - the rewritten empty / full / partial test, which now also asserts that a fallback column's ground piece is not cloned.
3. **The keys load.** Met. `PLAN_DOOR_CORNERS` is added to `planKeys()`, which goes to `sharedTileModels(planKeys())`. `planDress` plans them from the manifest by name, and `planInput`'s `tileInput` brings their roots. The test "loads the two corner doors by name: planKeys() names them and allStackKeys() does not" covers the list. The GLB draw-call test finds a mesh count > 0 for every ground key, corner doors included. No re-cut was needed. The keys also join `tileGroupOf`'s key list. That is harmless: only keys with cells add instanced meshes or count toward the cap, as with `PLAN_ARROW` already.
4. **Draws only.** Met. On the 20 named runs:
   - the digests of every layer, facades included, are equal to the plan's own before and after `plan3dGroups`;
   - `groundListedOnce` holds, each ground draw has its building's colourway, the cells summed over ground draws equal the column count, and G's counts still hold.
   Failing fixtures on the default city:
   - the exactly-once check fails with one piece dropped and with one listed twice;
   - `plan3dGroups` throws `PlanStopError`, naming exactly the dropped piece's cell, on a facades layer missing one column's ground piece. It also throws on a column filled twice, a facades layer with no `ground`, an unknown key, and a plan with no facades layer.
5. **Draw calls (reported, not capped).** Met. The test runs inside `it.skipIf(!HAVE_GLB)` on seeds 1 and 3 and prints building calls after G and after G2, plus ground pieces by kind:
   - seed 1: 7669 → 10279 calls, 2610 ground pieces;
   - seed 3: 7811 → 10427 calls, 2616 ground pieces.
   The console line gains "N of M ground pieces cloned … ground slots are grey". No cap was added or raised.
6. **Nothing else changes.** Met as far as the diff shows. `tilecity3d.ts`, `models3d.ts`, `renderer.ts`, `planview.ts` and their tests are untouched, and nothing under `src/city/` or `src/core/` changed. I did not rerun `planview.test.ts` or `tilecity3d.test.ts`; the gate's green run covers them. The ladder is the playtester's to confirm.
7. **Screenshots.** This is the main session's job, not reviewable here.
8. **R-8, R-10, R-11.** The diff stays inside Files. There is no new dependency and no `src/core` change. The gate is green as reported.

## Rule conflicts and risks
- None found against the hard rules. `src/render3d/` is not one of the pure folders, no puzzle or locked file is touched, and no GDD rule is in play (a drawing-only section).
- Risk: a shopDouble whose partner column falls back to a whole grey box leaves the other column with a ground-slot box and its floors drawn. The ticket does not name this case, and the builder's choice (no hole, a grey slot) is the safe one. It is documented in `buildingBoxes`' comment, but no test covers it.
- Risk, as the ticket itself notes: about 2600 extra clones per 6 x 6 city (~10.3k building calls). The frame rate is for instancing later (Q20), not this section.

## Must fix
none

## Could improve
1. `plan3d.test.ts`: add a renderer test with an injected `{ ok: false, failure: { stage: "facades", … } }` run, asserting no `plan3d` group and the `stage "facades"` text. Optionally also assert the default run's stage (e.g. by spying or by a `run`-less construction on a small city). As things stand, reverting the `"facades"` default to `"buildings"` would pass every test; only the browser would catch it.
2. `plan3d.test.ts`: one fixture for the shopDouble-with-a-fallback-partner case (drop an above-ground key used by exactly one column of a double). It would assert that the double is not cloned and the other column shows its ground slot.
