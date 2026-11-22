ticket: 073e2b-facade-clear
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
This is a follow-up to section E2 of ticket 073, found after E2 merged. Every hold-out piece must keep E2's 0.3 m clearance from stage 7's facade pieces: dressing other than glass, wall pieces with the escapes' ladder boxes, and face novelty signs. A probe had found 30 to 45 pieces a city running through escapes, canopies and awnings. The branch also re-takes the pins this moves: E2's settle digests and F1's growth digests.

## Does the branch do it?
- **Clearance, in plan and height.** `src/city/holdout/world.ts` builds `facadeBoxes` from the facades layer:
  - non-glass dressing;
  - face novelty signs;
  - walls, with each box of a non-code escape rotated as the tech pass's `rotate` does, and a code escape as its 3.25 x 1.64 footprint up to its highest ladder box;
  - party-wall pieces, tagged `party`.

  This copies `s7Boxes` in `src/city/tech/boxes.ts` and the F1 round-2 fix in `src/city/ruin/world.ts`. `meetsFacade` grows the footprint by `CLEAN_GAP_M` (0.3 m) and tests the height range widened by the same gap. It is called for every kind:
  - camps, water towers, containers and clutter, through `clearOfClean` in `settle.ts`;
  - farms, irrigators and stalls, which previously checked no clean piece at all;
  - roof items, with `roof = true`, so they also keep clear of party-wall pieces;
  - barricade walls, where a hit sets `blocked` in `barricade.ts`.
- **An unknown key throws.** A key missing from the copied bounds throws `CityStageError`, as the tech and ruin copies do (R-6).
- **The bounds copy is pinned.** `src/render3d/holdoutpin.test.ts` has two new tests. `FACADE_BOUNDS` must equal the non-glass `DRESS_BOUNDS` plus `WALL_BOUNDS`, with the code escape's key and footprint. `PARTY_BOUNDS` must equal the facades party kit less the billboard faces, and those faces must be in `CLEAN_ROOF_BOUNDS`. If the facades kit drifts, these fail.
- **The named runs prove it.** In `src/city/holdout/named.test.ts`, every hold-out add on all 20 runs (more than 6,000 checked) is tested against the tech pass's own `s7Boxes` and `boxHit`. The boxes are read from the facades layer resolved before the hold-out. Using the tech pass's code rather than the hold-out's own makes this a real cross-check.
- **Pins re-taken.** The settle digests on the four pin cities are re-taken, with the reason in the comment. The power part is unchanged, as it should be (still empty). `PIN_GROWTH` in `src/city/ruin/named.test.ts` is re-taken in its own commit, as F1's "re-pin when E2 changes what stands before it" asks.
- **Tests run.** I ran `src/city/holdout/`, `src/render3d/holdoutpin.test.ts` and `src/city/ruin/named.test.ts` at `--maxWorkers=1`: 5 files, 71 tests, all passed. F1's own named-run check (no non-patch add meets a stage 7 piece) still holds against the new hold-out layer. Following the load note, I did not run the whole suite or the typecheck; the main session's gate covered both.

## Rule conflicts and risks
- **E2 criterion 3, "one `Bld_Market_Stall_02` per plaza or front lot", is relaxed.** `stage.test.ts` now accepts between the number of squares minus 2 and that number, and skips a square with no stall. On the named runs, stall places are 3 to 13 a city and stalls placed are 2 to 12, so some plazas lose their stall to the clearance. This is a real choice between two of the ticket's rules (the 0.3 m clearance, and one stall per square). The builder kept the clearance, which is the safer reading: a stall through an awning is the bug being fixed. `STALL_TRIES` went from 8 to 24 to keep the losses small. It should still be named to Josh as a reading, not slipped in.
- **The named-run test checks overlap, not the 0.3 m gap.** `boxHit` is called with gap 0 and an epsilon shrink. The 0.3 m is applied only in `meetsFacade`, and no fixture pins that one piece at 0.2 m is refused while one at 0.4 m is placed.
- **A third copy of stage 7's bounds and box rules.** The tech, ruin and hold-out folders now each have their own copy, held equal by pin tests. That is the project's chosen pattern (no cross-stage imports), but the escape's box rules (code escape top, ladder rotation) are not pinned and could drift. The named-run cross-check against `s7Boxes` is the only guard.
- **Folders.** Hard rules and folders: nothing touches `src/grid/` or `src/night/`, nothing in `src/core/`, `src/city/pipeline/` or another stage's code, no new dependency. `named.test.ts` imports `../tech/boxes`, but the import-purity test reads only non-test files (line 191), so criterion 8 still holds.

## Must fix
none

## Could improve
1. In `src/city/holdout/stage.test.ts`, or in a short note on ticket 073's E2 section, state the stall reading: a square whose every try meets a stage 7 piece takes no stall. This lets Josh confirm or reverse it. In `named.test.ts`, report stalls placed against stall places per run (for example "stall places 3 to 13, placed 2 to 12, lost N in total"), so the cost of the clearance is a number rather than an inference from two ranges.
2. Add a fixture test for `meetsFacade`'s gap in `src/city/holdout/`. Use a canopy or escape box: a piece 0.2 m from it in plan is refused, one 0.4 m away is accepted, and one below it by more than 0.3 m in height is accepted. A party-wall box should stop a roof item but not a ground piece.
3. Optionally, give the named-run check a 0.3 m tolerance (grow the rect by `CLEAN_GAP_M - eps`), so it proves the clearance the commit message claims and not only no overlap.
