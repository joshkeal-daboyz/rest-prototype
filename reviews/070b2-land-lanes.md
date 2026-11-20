ticket: 070b2-land-lanes
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section B2 carries Josh's ruling 3 ("Yes, all four", 19 Nov 2026). Land puts a lane only where every court part it leaves has a long side of at least 8 cells, and a block with no such place takes no alley. M4a gets that clause and a failing fixture. V3 and V4 still hold at unchanged rates and thresholds. The land and mass digest pins are re-taken and named as moved by B2. The streets 6 x 6 test now stops at `"streets"`.

## Does the branch do it?
- **Criterion 1 (lane places): met.** `lanePositions(len, across)` in `src/city/land/plan.ts` now also calls the new `courtPartRoomy(depth, across)`. A part whose short side is under 6 (a strip) passes as in B. A court part needs `max(depth, across) >= COURT_LONG_MIN_CELLS` (8, in `constants.ts`). The two sides are the depth from the cut and the block's side across the cut, as the ticket says. The hash pick among the places left is unchanged. `planLand` passes `Math.max(w, d), Math.min(w, d)`, which matches the old `w >= d ? w : d`. Tests in `plan.test.ts`: "B2: a place is dropped when a court part it leaves has a long side under 8". It checks that 13 x 6 gives [2, 10] (6, lane, 6 dropped), 9 x 7 gives [], 12 x 6 gives [2, 9] and 14 x 7 gives [2, 11]. I checked each by hand and they follow from the rule.
- **Criterion 2 (no alley without a place): met.** `hasPlace` is added to `claimsAlley` and to the `rest` filter in `planBlocks`. `ALLEY_ONE_IN_BLOCKS`, `ALLEY_SIDE_*`, `PARK_*` and the quota formulas are not in the diff. The test "B2: a block with no lane place takes no alley, though its side is long" covers the claim path (a 9 x 7 long block gets no alley and the court treatment; 9 x 8 gets one) and the quota-fill path. In the quota-fill case, a 9 x 7 and a 9 x 8 medium have the same long side, so before B2 the id order would have picked `block:0:0`. The test therefore tells B2 apart from B. There are no small or large blocks in it, so no park hides the result.
  - One side effect: `claimsAlley` also orders large blocks for half parks. A large block has a short side of at least 9, though, so `courtPartRoomy` is always true for it and `hasPlace` is unchanged there. Park placement does not move.
- **Criterion 3 (M4a clause): met.** `landVariety` in `check.ts` gains `cramped`: court parts with a `"lane"` edge and a long side under 8. `evaluateLand` adds it to the M4a count. The failing fixture (6 x 13, cut 6, lane, 6) gives `badParts` [], `cramped` both parts and M4a `{ value: 2, pass: false }`. The clause is named by its own field, apart from `badParts`. In `stage.ts`, the throw message names the clause ("beside a lane and has a long side of N cells (8 or more, so a drive fits)"). The Q7 case is tested: a whole 6 x 6 block that no lane cuts is not counted in `cramped`.
- **Criterion 4 (V3, V4): met as far as code can show.** `LAND_CHECK` (V3 0, V4 0, M4a 0) and the V3/V4 named-city tests are not in the diff, and the gate is green. The per-city before/after report belongs to the builder's report, which I did not read.
- **Criterion 5 (R-4 pins): met.** In `land/stage.test.ts`, three of the four values moved. Seed 2 is unchanged, and the test name says so and names B2. In `mass/stage.test.ts`, only the same three values and the test name changed ("pins moved by B2, because mass reads land; C2 re-takes them again"). The test names and the case list are otherwise unchanged, so the pins are re-taken, not loosened. C1's mass checks are not in the diff and the gate passes, so they still hold.
- **Criterion 6 (streets 6 x 6): met.** The only change in that file is `runCity(..., "streets")`. The assertions are untouched.
- **Criterion 7 (R-1 to R-7): met.** There are no new imports outside `src/city/land/`, no stage folder imports another, no DOM, no clock, and no hard-coded sizes. `hasPlace` costs O(long side) per block, so it stays linear.
- **Fixture edits keep their intent.** The old `lanePositions` expectations gained an `across` of 8 or 9, at which nothing is dropped, so they still test the parts-of-2-or-6 rule. The for-loop uses `across` 12 for the same reason. The 9 x 7 fixtures became 9 x 8, because 9 x 7 now has no place. Their tests still check a strip plus a 6-cell court, the hash pick, and strip edges.

## Rule conflicts and risks
- None found. The diff stays inside B2's Files: `src/city/land/`, the `until` in the streets test, and the pin values and test name in the mass test. There is no new dependency and no GDD rule change. The ruling is quoted on `COURT_LONG_MIN_CELLS`.

## Must fix
none

## Could improve
1. `src/city/land/stage.ts`: the new throw for the long-side clause is not covered by any test. Add a test that swaps in a test-double planner and asserts `failure.reason` starts with "M4a: part ... beside a lane". That would test "this clause named" at the stage level, not only through `cramped`.
2. `src/city/land/check.ts`: the `cramped` filter repeats the `courtPartRoomy` rule inline. Reusing `courtPartRoomy` (or a helper over a part) would keep the planner and the check from drifting apart. The check reading the layer alone is deliberate, so this is optional.
