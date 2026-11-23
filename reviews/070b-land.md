ticket: 070b-land
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section B of ticket 070, stage 2 (`land`, in `src/city/land/`), under R-1 to R-11. This is round 2. I judged the round-2 commit 4eabf0e (`git diff ccc5562 4eabf0e`) against round 1's must-fix and could-improve items, and checked that nothing else regressed. The merge of goal/city-style in a895c63 was reviewed on its own and is not re-reviewed here.

## Does the branch do it?
- **Round 1 must-fix 1 (R-7, `laneCells` was quadratic): done.** `src/city/land/check.ts`, `laneCells`, now builds `byId = new Map(blocks.map(...))` once and calls `byId.get(l.block)` for each lane. That makes the V3 pass and the picture linear in cells. The output is the same: block ids are unique, so `find` and the Map return the same block. The digests pinned on the four cities still pass in the gate, which confirms nothing moved.
- **Round 1 could-improve 2 (silent court fallback) is now a loud failure (R-2).** In `src/city/land/plan.ts`, a block chosen for an alley with no lane position now throws `CityStageError("M4a: block … chosen for an alley but no lane place …", [first cell])`. That matches the existing constructor `(reason, cells)` in `pipeline/error.ts`. The runner (`pipeline/run.ts:43-44`) turns it into a failure that keeps its "M4a:" reason and its cell, so the run ends as a named failure and not as "bug:". The new import `../pipeline/error` is allowed by the R-6 import rule (`./`, `../../core`, `../pipeline/`). As round 1 found, `planBlocks` only picks blocks with a side of 9 or more, so this branch should never run on today's cities, and outputs are unchanged.
- **Round 1 could-improve 1 (`shapeOf`): done.** A part is now `"strip"` only when its short side is exactly `STRIP_CELLS`. If a part ever had a short side of 1, it would be labelled `"court"` and M4a would fail it. The old `<=` labelled it a strip, which was the wrong word for it.
- **Round 1 could-improve 4 (docstring): done.** The `CityRunError` docstring in `pipeline/error.ts` now names `runStages`.
- **Nothing else regressed.** The round-2 diff is 7 added and 4 removed lines in three files, all in the planner's folders. The merge in a895c63 changes none of `src/city/land/`, `src/city/stages.ts` or `src/city/pipeline/`. The gate on a895c63 is green, as reported (tsc clean, 2844 passed). Every acceptance criterion judged met in round 1 stays met.

## Rule conflicts and risks
- None found. `src/grid/`, `src/night/` and `src/core/` are untouched, there is no new dependency, and no Decided rule changed.
- An unrelated note: the gate worktree has `src/audio/__snapshots__/notSoftened.test.ts.snap` modified. It is not in this branch's commits; the gate run most likely rewrote it. Discard it, don't commit it with the review.

## Must fix
none

## Could improve
1. The new alley-with-no-lane `CityStageError` in `plan.ts` has no test. A one-block fixture in `plan.test.ts` would pin its "M4a:" reason. That fixture has to force the alley choice, for example by calling `planLand` with a hand-made 8-wide block and a stub `rand`.
2. Round 1's could-improve 3 is still open: the R-7 6x6 test could log whether the run ended ok or as a failure.
