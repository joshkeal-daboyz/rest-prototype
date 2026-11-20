ticket: 070a4-split-plan
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
Rebuild stage 1 as the split plan. Keep today's outline and edge streets, then cut the ground with 5-cell streets until every piece is a 6-to-16 block, so that streets end in Ts. Publish streets with ends, junctions, block sides (`across`, `junctions`) and the outline, checked by S1 to S5 and the reworded V1. The old lattice functions stay as they are for `city=tiles`.

## Does the branch do it?
- **0 (architect).** In commit 1d35551, `src/core/cityplan.ts` deletes the old `CityStreetsLayer` and renames `CityStreetsLayerA4` to take its place, with `outline` replacing `sizes`. The mass fixes in `src/city/mass/fixtures.test.ts` and `src/city/mass/lots.test.ts` change only the types: one `as unknown as` cast in `streetsOf` each, and no assertion changes. Met.
- **1.** `layout.ts` is not in the diff, and neither is `tilecity.ts`. `equal.test.ts` now compares `layStreets` to `tileCity` on the same 16 cities with the same three deep-equals. Met.
- **2.** `laySplit` takes its outline from `blockSizes` and `layoutAxis`. split.test.ts "the outline (criterion 2)" checks w, h, the four edge streets' `across0`, `bands` and `profile`, and `outline` with its draw, on all 13 named cities. Met.
- **3.** `cutOutline` keys its draws `"split", draw, ...` through `hashOf`, which is stage 1's own `"tile:<seed>:..."` rand. It cuts any side of 17 cells or more (`CUT_MIN_CELLS`). `mergeCuts` joins collinear cuts. A missed draw is retried up to `BLOCK_DRAWS_MAX`, and when every draw misses it throws `CityStageError` naming the rule (the fixture test checks "65 draws"). There is no fallback list. Met.
- **4 (S1).** `s1Failures` is checked on the named cities, plus two failing fixtures (a dangling street, and a junction whose streets disagree with its kind). Met.
- **5 (S2).** The S2 test checks the 3x3 junction, the 9 crossings, the 2 pavement corners and the 5 far-side pavement cells at every T. Met (see could-improve 1).
- **6 (S3).** Checked on the named cities, plus a fixture at gap-1 (fails, names both streets) and at gap (passes). The test reads the constant by name. Met.
- **7 (S4).** `blockSizeFailures`, `coverageProblems`, and the rank and id checks. Met.
- **8 (S5).** Checked on the named cities, and the lattice fixture fails. Met.
- **9.** Five tests, one per bullet: the sides, the span cover, the `across` symmetry, the T-facing spans, and the street spans with `outer`. Met.
- **10.** `streetsVariety` now works over all blocks. On the lattice the new and old readings give the same number (checked against `cvOf`). The uniform 10x10 fixture is kept in check.test.ts. Met.
- **11, 12.** The legend is unchanged and the picture test asserts no block count. The four pins are re-taken in a describe block that names A4. The 6x6 run asserts no block count. Met.
- **13.** This is the builder's report, which is not on the branch. Not judged here.
- **14.** Main session's job. Not judged here.
- **15 / R-7.** Partly met: see Must fix 1. R-1, R-2, R-3, R-5 and R-6 hold. `split.ts` and `check.ts` import only `src/core` and `src/city`, and use no `Math.random` or clock.
- split.test.ts: 27 passed. I did not re-run the rest of the gate (the main session's gate is green).

## Rule conflicts and risks
- No hard-rule break. Every changed file is in the ticket's Files list. No new dependency. `src/render3d/`, `pipeline/`, `stages.ts`, `land/` and `edge/` are untouched.
- R-7 ("per-block work reads only that block ... whole-city passes are linear in cells. The reviewer checks this") is not held. Details in Must fix 1.

## Must fix
1. **R-7 locality and linearity.**
   - In `src/city/streets/split.ts` `layBlocks`, each block side scans every T in the city (`for (const t of ts)`), and each side's `streetOf` scans every street.
   - `findJunctions` tries every pair of an x street and a z street.
   - `s3Failures` in `check.ts` tries every pair of Ts.
   - Fix: index the Ts by `through|arm` and the streets by `axis:across0`, and look up only the side's own street. Find junctions by one pass over the street-ownership grid (`layCells` already builds it) or over each street's crossing squares. Group Ts by through street in `s3Failures`.
   - Effect: per-block work reads only that block's streets, and the whole-city passes are linear in cells. The layer and digests should not change.

## Could improve
1. split.test.ts line 154 can never fail: a cell whose role is junction or crossing is never `parkingPlain`. Lines 145 and 148 already cover the rule, so line 154 can be dropped or replaced with a real check.
2. `layBlocks` and `layCells` can throw `CityStageError` (S1 overlap, S4 no street) after a draw has passed `splitFailures`, and that draw is not retried. Either fold those checks into the held test or note that they cannot happen.
3. `stage.ts` ignores the `rand` it is handed and calls `hashOf` instead. The two are equal today, but passing `rand` into `laySplit` would make R-3 hold by construction.
4. split.test.ts uses literal 7 and 10 (lines 208, 212 and 213). Use `BLOCK_LONG_ENOUGH_CELLS` and `BLOCK_MEAN_MIN_CELLS` instead.
