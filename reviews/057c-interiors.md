ticket: 057c-interiors
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section C of 057 (19.3, 19.4, criteria 7 to 9). Each block's 056 lot quota becomes interior courts behind drives, and the rest of the block's inside becomes apron, green and green paths, with nothing left unfilled. `frontage.ts` gains G3 (no void, rasterised at 0.25 m) and G4 (courts reached, drives kerb-cut). The ladder stays unchanged.

## Does the branch do it?
This is round 2. I reviewed 8b398eb on top of a6af444, checked out in `D:\rest-prototype-gate`. The commit touches only `tilecity.ts`, `frontage.ts` and their two test files. The `tilecity`, `frontage`, `parkmetrics` and `townpin` tests pass (119 tests), and the main session's gate is green (tsc clean, 2344 passed).

**Round 1 Must fix 1 (passage floor): closed.**
- `TilePassage` now has `floor`, an axis-aligned rectangle in metres (`tilecity.ts`). It is documented as apron pavement that section D must draw, and nothing else in the city lays it. `PASSAGE_FLOOR_DEPTH_M = TILE_M` (5 m).
- `edgeCoverage` in `frontage.ts` computes the floor when it finds a passage: the gap wide, running 5 m inward from the pavement's back edge along the lot's -front direction. `tilePassages` returns it, and `withPassages` freezes it into `city.passages`. A 5 m depth reaches ring 2, where the apron strip starts, so the way from the street to the apron has a recorded surface.
- `interiorMetrics` no longer takes a `passages` argument. It reads floors only from `city.passages` and fills them clipped to each block's raster. Blocks are separated by streets, so one block's floor cannot fill another block.
- Failing fixtures, all in the test "credits a gated passage's floor only where the city records it ...":
  - `passages: []` fails G3, with `voidBlocks > 0` and `patchMax_m > VOID_PATCH_MAX_M`;
  - a plain `cityOf` city with no `withPassages` also fails G3;
  - a floor shrunk by half raises the void share.
- The same test checks each recorded floor's shape: the passage wide by `PASSAGE_FLOOR_DEPTH_M`.
- The criterion 3 cities now go through `placedOf`, which applies `withPassages(city, tilePassages(...))`, and they pass G3 and G4 under 0.5%.

**Cheap fixes from round 1:**
- *Could improve 3 ("green with no path" checked nothing): done.* The court exemption is gone, so every block whose green is at least 2 cells wide must have a path (`tilecity.test.ts:1957`). The `tilecity.ts` fixes it needed are sound:
  - `layLine` now lays the free cells of a line and skips court cells, rather than dropping the whole line. It returns false only when no cell is free, which also removes the silent drop of a blocked cross path.
  - Court cells count as paved (`PAVED_INTERIOR` includes `court`), so a path that meets a court still ends on pavement. The per-cell "ends on paving along its own axis" check still passes.
  - Benches are now laid only where the cell they face is an actual path cell, so no bench faces a court gap.
- *Could improve 4 (test name): done.* The name now says `VOID_PATCH_MAX_M (1 m)`, which matches what the test asserts.
- *Could improve 5 (G4 throwing): done.* A drive whose block is missing now counts under `drivesNoKerbCut` instead of throwing. `evaluateFrontage` adds 1 to G4 when there are no blocks, as G3 already did. Test: "fails, and does not throw, on a city with no blocks".

**Ladder and P1 to P6:** `townpin.test.ts` passes, so the path changes did not move the ladder. The path changes touch only `interior` and `greenProps`, not `cells`, lots or terraces. The 056 P1 to P6 test ("holds 056's checks on courts") and parkmetrics' "counts the courts" both still pass.

**Criteria 7 to 9 overall:** criteria 7 and 8 stand as in round 1, with the same two recorded deviations, the 2-cell drive and `InteriorRole`. Neither was a must-fix and both remain for the main session. Criterion 9 is now fully met.

## Rule conflicts and risks
- Section D must draw `TilePassage.floor`. G3 credits it, and if D draws only the gate, a dark slot comes back unseen by the check. The doc comment says this, but D's ticket text should say it too.
- The 2-cell drive deviation (criterion 7, `DRIVE_CELLS = 2`) still needs Josh or the architect. It is unchanged from round 1.
- The worktree has `src/audio/__snapshots__/notSoftened.test.ts.snap` modified and `gate-out.txt` untracked. Neither is in the branch's commits. Don't commit them.

## Must fix
none

## Could improve
1. The half-floor fixture's comment says "a block fails the patch rule", but it asserts only a higher `shareMean`. Assert `voidBlocks > 0` as well, or reword the comment.
2. The test "measures per default-city block the area of its passage floors" asserts only that each area is greater than 0. It adds little beyond the floor-shape test, so drop it or give it a real bound.
3. Carried from round 1: put the 2-cell drive to Josh or the architect. Also tell D that drive and near-stall cells are both `InteriorCell`s and `lotSurface` cells, and that D must draw the passage floors.
