ticket: 070a4d-six-by-six
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section A4d of ticket 070. Re-take stages 1 to 3's tests and digest pins on the new named cities (6 x 6 seeds 1 to 10, one-way off and on). Give stage 1's split its own limit, `SPLIT_DRAWS_MAX` 128. Add `PLAN_BLOCKS_DEFAULT` 6. Land's and mass's code must not change.

## Does the branch do it?
Diff `4c1bd2a...03797ee`: 9 files, all inside `src/city/streets/`, `src/city/land/` (tests) and `src/city/mass/` (tests). `layout.ts`, `equal.test.ts`, edge, `stages.ts`, render3d and core are untouched.

1. **Split limit.** `constants.ts` adds `SPLIT_DRAWS_MAX = 128`. Its comment is Decided and quotes Josh's Q18 "yes, yes" with the date. `split.ts`'s draw loop and its `CityStageError` message now read it. S11's misses are counted in that same loop, so they count within the new limit. `BLOCK_DRAWS_MAX` stays 64.
   - `split.test.ts` has a new test that pins 128 and 64 and names the ruling. Its "draw at most" check now reads `SPLIT_DRAWS_MAX`.
   - The fail-all-draws fixture now expects "129 draws". This is exactly criterion 1's "`SPLIT_DRAWS_MAX + 1` draws". The fixture uses a `held` that fails every draw, so its assertion is about the error text, not a city's result. It may stay on 3 x 3 under criterion 3's carve-out. A literal 129 is a stronger pin than a computed value. Correct.
2. **Default size.** `PLAN_BLOCKS_DEFAULT = 6` is added, and its comment names Josh's Q17 "yes". It is exported through `index.ts`'s `export * from "./constants"`. `streets/stage.test.ts` pins it to 6 and to at most `CITY_BLOCKS_MAX`, and pins `CITY_BLOCKS_DEFAULT` to 3. Nothing in `src/city/` reads it.
3. **Named lists.** `NAMED` is 6 x 6 seeds 1 to 10, seed 1 first, in all seven files the ticket names. Each "are 13" test now reads "are 10, the default 6 x 6 seed 1 first".
   - All 20 runs (one-way on and off) are covered in each folder:
     - streets: `check.test.ts`, which now loops both ways, and `parkplaces.test.ts`.
     - land: the `on`/`off` loops, through `cacheOff`.
     - mass: the `on`/`off` loops at lines 380 and 419.
   - Fixtures that moved:
     - `oneway.test.ts`'s 3 x 3 seed 6 moved to 6 x 6 seed 6.
     - The picture cities moved to 6 x 6 seeds 1 and 9, and seeds 1, 2, 3 and 8.
     - `split.test.ts`'s old-lattice fixtures (`layStreets(1, 6, 6)`) moved too. They test the old layout function, not a named pipeline city. The V1 test's `blocks` is now widths × depths instead of a literal 9, which suits R-7 (no block count). Acceptable.
4. **Checks on the 20 runs.**
   - Stage 1, one-way on: S1, S3, S4, S5 and V1/V2 in `split.test.ts`; S7 to S10 in `oneway.test.ts`.
   - Stage 1, one-way off: S11 is asserted in `parkplaces.test.ts`, and width/V1/V2 in `check.test.ts`. S1, S3, S4, S5, S7, S8 and S9 are covered only through `splitFailures`, which every accepted draw must pass, plus `r.ok`. That is the same set of functions, so it is enforced, if not asserted on its own (see Could improve 2).
   - Land and mass: their named loops assert their checks both ways.
   - Thresholds: unchanged.
   - Tests run: I ran `oneway.test.ts`, which passed 42/42. For the other files I rely on the main session's gate (451 passed).
5. **R-4.** Stage 1's, land's and mass's pins are re-taken on 6 x 6 seeds 1, 2, 3 and 8, one-way on. Each test name says "moved by A4d (the 6 x 6 named cities, the split limit 128)". No 3 x 3 or 6 x 4 pin is left. The test-double checks moved to 6 x 6 seed 2.
6. **Report.** No report file is on the branch. If it exists, it is in the builder's message, which I did not read. I can't tell whether the 80 outside runs were reported (see Could improve 1).
7. **R-1 to R-7.**
   - No production imports changed (R-6 holds).
   - The R-7 tests now reuse the module cache.
   - Stage 1's R-7 test now asserts that 6 x 6 seed 1 is `ok`, as Q17 requires.

**Judgement calls.**
- **S9 cell-walk fix (03797ee).** Only the test oracle changed: `s9Failures` and `oneWayNeighbours` are untouched. Before the fix, the walk skipped any street cell of the other axis (junctions, the crossing street's lane). So two same-axis streets could be read as adjacent across a stretch where the column runs inside a crossing street, with other parallel streets' junction cells hidden in it. S9 (Josh's Q3) is about neighbours on one axis, which the design note orders by `across0`. A column that passes through a crossing street is not a block between two parallel streets.
  - Marking such cells as a barrier ("#") cannot hide a pair `oneWayNeighbours` reports, because the test asserts the two sets are equal. Real pairs are still seen in the columns where they face each other across a block.
  - The first S9 test still asserts that pairs exist (`pairs > 0`), so the check is not vacuous.
  - I agree it was a test bug.
- **Oneway criterion 3, digests replaced.** The old A4 digests described 13 cities that are now outside cities, and no A4 head exists on the 6 x 6 list. The structural assertion (every street two-way, five bands, no arrows, the stage option) keeps what A4b criterion 3 means. Acceptable under A4d criteria 3 and 5. R-4 pins are one-way on only.

## Rule conflicts and risks
- No hard-rule break was found. Files are within the ticket's list, there is no new dependency, and production code changed only in `streets/constants.ts` and `streets/split.ts`.
- `runCity({})` still defaults to 3 x 3 (`CITY_BLOCKS_DEFAULT`). This is as the ticket says: the plan view moves to 6 x 6 in A2b, not here. Until A2b, `city=plan` with no size still shows 3 x 3.

## Must fix
none

## Could improve
1. Criterion 6 and the ticket's Heavy note ("the outside report (80 runs) is its own file") suggest a report file like `edge/report.test.ts`. None was added. The main session should check that the builder's message has the per-run numbers for all 20 named runs and the 80 outside runs, including seed 2's actual split draw. If it doesn't, criterion 6 is unmet.
2. `split.test.ts`'s S1/S3/S5 checks on the named cities run one-way on only. Calling `eachCity` with share 0 as well would assert the off runs directly, not just through the generator's own gate.
3. The S9 fix's comment could name the city and pair the old walk flagged, so the reason for the barrier can be checked later.
4. The fail-all-draws fixture could also assert `${SPLIT_DRAWS_MAX + 1}` next to the literal 129, to tie it to the constant.
