ticket: 070e-plan3d-massing
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
Section E of 070: at `?view=3d&city=plan&stage=assemble` (or `stage=9`), draw the pipeline's plan in 3D. The street pieces come from `edge.ground`, with one-way lanes on `Road_Lines_01`, arrows from `Road_Arrow_01` and dropped kerbs from `Sidewalk_Dip_01`. The kerb faces come from `edge.kerb`, the interiors from `mass.cells` and courts, and each built cell is a grey box. `tilecity3d.ts` gets `tileGroupOf` and `interiorGroupOf` split out, with no change to `city=tiles`. The one principle over all of it: assemble only draws and decides nothing. Where a layer doesn't say what to draw, the builder stops and reports the cells.

## Does the branch do it?
- **Criterion 1 (two entries, no change to the `TileCity` path): met.**
  - In `tilecity3d.ts`, `tileGroup` and `interiorGroup` now call `tileGroupOf` and `interiorGroupOf`. `tileGroupOf` takes a `TileGroupInput` with `cells`, `buildoutTrees`, `seed`, `keys`, `keyOf` and `kerb`, plus an optional `fronts`.
  - `fronts` is not in the ticket's list, but `PLAN_FRONTS` needs it, and `tileFront` already took a `fronts` argument. `tileslots.ts` is not edited.
  - `plan3d.test.ts` "tileGroupOf and interiorGroupOf (criterion 1)" pins hashes of counts, instances per key and every matrix, in code and from a pack, on the default tile city. The listed old test files are unedited: the diff touches 4 files only.
- **Criterion 2 (plan to scene): met.**
  - `planKeyOf` handles all three exceptions to `tileKeyOf`.
  - `planKerbPlan` and `kerbSegFaces` turn each seg into faces with no line recomputed: edge, dip and crossingDip get the piece's face, an `under` cell is shifted one cell in, flank and return are code strips, opening gets nothing.
  - `KIND_OF_USE` matches the ticket's table row for row. `massInteriorItems` pairs stall runs and stops on an odd run, aisles on both sides or neither, or a run that is not one row.
  - `massBoxes` is one `InstancedMesh` of `CITY_STOREYS.min * STOREY_M`.
  - The "draws only" test checks every layer's digest before and after on all 20 named runs, plus one draw per ground record, open cell and built cell.
- **Criterion 3 (kerb on the line, 20 named runs): met.**
  - `problems()` checks face-on-line within `KERB_TOL_M`, gaps over `KERB_GAP_MAX_M` and lip height. It runs both code-drawn and with the pack keys.
  - The failing fixtures (one return removed, one crossingDip removed) fail it.
  - Every `pavementDip` record is drawn from the dip, and no one-way lane from `YellowLines`.
- **Criterion 4 (paving through both rings): met.** The test "draws a drive, a walk-through and a lane mouth as the paved inlet" covers both the slab present and the slab absent (code pavement).
- **Criterion 5 (one-way streets and arrows): met, except for the patch (see Must fix).**
  - The arrow was measured as a whole 5 m tile: 25 m2, flat, the paint's head on +z. `PLAN_FRONTS[PLAN_ARROW] = 90`, pinned inside `it.skipIf(!have)`.
  - `arrowYaw` plus the turn is checked on all four sides, and on every arrow of the 20 runs against its street's `flow` and `axis`.
  - `planKeys()` is `tileKeys()` plus the arrow. `Road_Lines_01` is already in `TILE_SHEET_EXTRA`, so the loaded set is what the ticket names.
  - I agree with measuring the arrow as a whole tile that replaces the lane piece: the ticket allows that outcome explicitly.
- **Criterion 6 (draw calls): met in code and with a full fake pack, on seeds 1 and 3.** The pack numbers are the builder's to report.
- **Criterion 7 (routing): met, with one deviation I accept.**
  - `renderer.ts` routes `assemble` ahead of `planViewRequested` and returns after the WebGL renderer is made. Only routing is added.
  - The defaults come from `planViewRequested`: 6 x 6 seed 1. The light comes from `lightModeFor("tiles", ...)`, and there is a day toggle. `createCityRenderer3d` is not edited.
  - A failed run draws nothing and shows `planFailureText` (stage, seed, size, reason). Showing it as a DOM overlay in `src/render3d/` is fine: no purity rule applies there, and the text plus a `console.info` is what was asked.
  - **Street camera deviation.** The ticket says to build from tilecity3d's street camera. `createStreetView` needs a `Town` with terraces, and a plan has none, so the builder wrote a minimal `planStreetPose` that uses streetcam.ts's numbers (`cam=street&at=i,j&dir=`). This is a camera position, not a layout choice, so it doesn't break "decides nothing". It is a deviation from the letter of criterion 7, so I note it under Could improve rather than Must fix.
- **Criterion 8:** screenshots, the main session's job.
- **Criterion 9:** the main session's gate is green on 3ec919b. I did not re-run it.

### The builder's decisions, against "decides nothing"
- **Minimal street pose:** acceptable (above).
- **frontLot cells drawn bare:** this is the ticket's table (`frontLot` → `bare`). The mass layer also gives a frontage lot's court empty `stallCells` (`src/city/mass/sites.ts`: `if (kind === "frontLot") return { drive, stalls: [], ... }`). So there is no row to line, and nothing is decided. The `use === "stalls"` filter in `massInteriorItems` is a no-op on today's layer. See Could improve 2.
- **Failure text as a DOM overlay:** fine.
- **Arrow as a whole 5 m tile, head on local +z, `PLAN_FRONTS` 90:** measured and pinned. Fine.
- **No pothole patch on arrow cells:** this is a decision. `planCells` clears `LANE_PATCH` from the copy of an arrow cell (`cell.variant &= ~LANE_PATCH`), and the test even asserts "no patch over an arrow". The edge layer put a patch on that cell. Nothing in the streets or edge layers says to drop it. The ticket's stop rule says such a gap is a re-cut of the layer's section, "never a choice made in `src/render3d/`". The layer is not mutated (the digests hold), but the drawing overrides what the layer holds.

## Rule conflicts and risks
- **The patch drop on arrow cells breaks section E's "decides nothing" rule (stage 9).** See Must fix 1.
- `planKeyOf` sends a pavement cell that has both `pavementDip` and `pavementFlush` to the slab, not the dip.
  - On the 20 named runs no such cell exists: the test asserts that every dip record draws from `Sidewalk_Dip_01`. So nothing is decided in practice.
  - It is still a silent rule for a case D2 says cannot happen. A stop would be more honest.
- No hard-rule breaks:
  - The diff stays within E's Files (`plan3d.ts`, `plan3d.test.ts`, `renderer.ts` routing, `tilecity3d.ts` split).
  - `src/city/` and `src/core/` are not edited, and there is no new dependency.
  - The only GLB read is inside `it.skipIf`, with forward-slash `join` paths.
- R-7: `planCells`, `cellLookup`, `planKerbPlan` and `massInteriorItems` are each linear in records.

## Must fix
1. **`src/render3d/plan3d.ts`, `planCells`: remove `cell.variant &= ~LANE_PATCH;` and draw what the edge layer says.**
   - Also drop the "no patch over an arrow" assertion in `plan3d.test.ts`.
   - If a pothole decal over a painted arrow looks wrong, report it with the cells, as a re-cut for D2: the edge layer should not give `lanePatch` to a `streets.arrows` cell.
   - Expected effect: every record in `edge.ground` is drawn with the role, variant and patch the layer gave it. The arrow cell's yaw is still set from `toward`, as criterion 5 requires.

## Could improve
1. **Street camera.** Write the street-camera deviation into the builder's report for Josh: `planStreetPose` replaces the town's `createStreetView` because a plan has no terraces. It defaults to the first arrow, which is a camera choice. Once G has buildings, consider moving to the town's camera.
2. **Stall filter.** In `massInteriorItems`, stop (`PlanStopError`) on any court stall cell whose mass use is not `stalls`, rather than filtering it out. Today the filter is a no-op, but a future mismatch would otherwise vanish silently. The frontLot fixture in the test puts frontLot cells in `stallCells`, which the real layer never does. A fixture with empty `stallCells` would match C3.
3. **Dip with flush.** In `planKeyOf`, a `pavementDip` cell that also carries `pavementFlush` should throw `PlanStopError`, not fall back to the slab.
4. **Seg count in the draws-only test.** The test checks that the kerb has more than 0 faces. The next block's per-seg sum covers the exact count, but only on two cities. Folding the sum into the 20-run loop would cost little.
