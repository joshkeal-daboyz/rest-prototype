ticket: 070e-plan3d-massing
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section E of 070: at `?view=3d&city=plan&stage=assemble` (or `stage=9`), draw the pipeline's plan in 3D: ground pieces from `edge.ground`, one-way lanes, arrows and dropped kerbs, kerb faces from `edge.kerb`, interiors from `mass.cells` and courts, a grey box per built cell, with `tileGroupOf`/`interiorGroupOf` split out of `tilecity3d.ts` and no change to `city=tiles`. Assemble draws only and decides nothing; where a layer does not say what to draw, it stops and reports the cells.

## Does the branch do it?
Round 2. I checked the changes since round 1 (48f8132..682a0d3: `src/render3d/plan3d.ts`, `src/render3d/plan3d.test.ts` only). My round-1 findings on criteria 1 to 9 stand (see `reviews/070e-plan3d-massing-round1.md`). The changes:

- **Round-1 must-fix 1 (patch dropped on arrow cells): done.** `planCells` no longer clears `LANE_PATCH`, the import is gone, the doc comment says the layer's patch bit stays, and the "no patch over an arrow" assertion is removed from the 20-run test. Arrow yaw is still set from `toward`, and the test still checks `toward` against the street's `flow` and `axis` (criterion 5).
- **Round-1 could-improve 3 (dip + flush): done.** `planKeyOf` throws `PlanStopError` naming the cell when a pavement cell has both bits. The test asserts the throw and that flush alone still draws a passage floor. The 20-run draws-only test still passes, so no named run has such a cell.
- **Round-1 could-improve 2 (stall filter): left as is.** I'm told a stop would fire on 6 of 10 seeds. I did not check that. If it holds, the layer really does put non-`stalls` cells in `stallCells`, and the filter is hiding a layer mismatch on those seeds. It is not blocking: the round-1 item was could-improve, and changing it now would make stage 9 fail on most seeds. But it should go to Josh as a D2 question, not stay silent (Could improve 1). The frontLot fixture now has empty `stallCells`, which matches the layer.
- **Browser bug (overhead view was all sky): fixed.** `createPlanAssembleRenderer3d` starts with `insets = {}`, and `setInsets` ignores its argument. The reason is in a comment: the page's insets measure the puzzle HUD, which the plan page doesn't have. New tests in `plan3d.test.ts`:
  - "the plan stands in the rendered scene and the overhead camera sees all of it": at 375x812 and 1280x720, the plan is under the rendered scene, all four ground corners are inside the frustum, and the far corner is inside `camera.far`.
  - "ignores the page's HUD insets": a HUD covering 95% of the height, passed both in options and through `setInsets`, still leaves the camera within `far/2` of the city centre. This is the regression test for the bug.
  - "the street camera stands over the city": the look point is inside the city and in the frustum, and at least one named mesh is seen.

  These are real tests: each pins a rule a player can see (the city is in view), not the code's own output.
- `npx vitest run --maxWorkers=2 src/render3d/plan3d.test.ts`: 25 passed. The main session's full gate on 682a0d3 was green (tsc clean, 3634 passed). I did not re-run it.

## Rule conflicts and risks
- No hard-rule breaks. The fixes touch only `src/render3d/plan3d.ts` and its test.
- The ignored insets are a decision about the camera, not the layout, so "decides nothing" doesn't apply. The risk is this: if the plan page ever gets its own HUD, it will draw over the city. That's acceptable for a dev-only view.
- The stall filter may be hiding a mass-layer mismatch on some seeds. I did not check this (see above).

## Must fix
none

## Could improve
1. **Stall filter, for the builder's report to Josh.** Say that `massInteriorItems` drops court stall cells whose mass use is not `stalls`, and name the seeds and cells where it happens. That is a D2 re-cut question: should the mass layer list them in `stallCells`?
2. **Street camera** (carried from round 1): `planStreetPose` stands in for the town's `createStreetView`. Note it for Josh.
3. **Seg count** (carried from round 1): fold the per-seg face-count sum into the 20-run loop.
