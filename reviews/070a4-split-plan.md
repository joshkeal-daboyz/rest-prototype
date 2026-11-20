ticket: 070a4-split-plan
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Rebuild stage 1 as the split plan. Keep today's outline and edge streets, then cut the ground with 5-cell streets until every piece is a 6-to-16 block, so that streets end in Ts. Publish streets with ends, junctions, block sides and the outline, checked by S1 to S5 and the reworded V1. The old lattice functions stay as they are for `city=tiles`. Round 2: check the round 1 must-fix (R-7 locality) in 76db703.

## Does the branch do it?
- **Criteria 0 to 12.** These were met in round 1 (see `reviews/070a4-split-plan-round1.md`). The fix commit touches only `split.ts`, `check.ts`, `stage.ts` and `split.test.ts`, and it changes no assertion about the layer. `src/city/streets/split.test.ts`: 27 passed on 76db703. The main session's A4 gate (tsc clean; streets, pipeline, planview: 111 passed) includes the pinned digests, so the layer has not changed.
- **13.** This is the builder's report. Not judged here.
- **14.** Met per the main session: Josh saw the default 3x3 and 6x4 seed 3 screenshots and said "I think it looks great" (20 Nov 2026, in chat).
- **15 / R-7 (round 1 must-fix 1). Now met.**
  - `layBlocks`: `streetOf` looks up `streetsByLine` by `axis:across0` and no longer scans every street. Ts are indexed by `through|arm` (`tsOn`), so each block side reads only the Ts on its own street and side.
  - `findJunctions` now walks each x street's squares and looks up the z streets on that line. That is linear in street cells, not every x-z pair.
  - `s3Failures` (check.ts) groups Ts by through street and pairs only within a group. It sorts the found pairs back into the old all-pairs order, so the messages and their order are unchanged. The pairing within one street is bounded by that street's length over the junction gap, which keeps it linear in cells.
- Round 1's could-improve 1, 3 and 4 were also taken:
  - The S2 test's dead assertion is replaced by a real check that a parking cell lies on a parking band.
  - `laySplit` now takes the runner's `rand`, and `stage.ts` passes it in. It defaults to `hashOf`, which is `stageRand("streets", seed)` (layout.ts line 56), so R-3 holds by construction.
  - The literals 7 and 10 are replaced by `BLOCK_LONG_ENOUGH_CELLS` and `BLOCK_MEAN_MIN_CELLS`.

## Rule conflicts and risks
- No hard-rule break. Every changed file is in the ticket's Files list. No new dependency. The new import in `split.ts` is the type `StageRand` from `src/city/pipeline/seeds`, which is inside `src/city`.
- As the main session expects, Land's, Mass's and Edge's tests fail on this branch. I did not run them.

## Must fix
none

## Could improve
1. (Carried over from round 1, item 2.) `layBlocks` and `layCells` can still throw `CityStageError` (S1 overlap, S4 no street) after a draw has passed `splitFailures`, and that draw is not retried. Either fold those checks into the held test or note that they cannot happen.
