ticket: 070d1b-edge-split
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section D1b of ticket 070: stage 4 (Edge) on the split plan. Bands come from the block sides and outer sides from `outer`. P3's cap counts over the whole block side. `check.ts` scans each street's own span. P1's floor is 0.69 on the pipeline. The first pass is a best fit (M), and a whole park nothing across can serve takes one tile on its own kerb (PB). P1 to P6 hold on the 20 named runs. Only `src/city/edge/` changes.

## Does the branch do it?
Round 2. Round 1 (`reviews/070d1b-edge-split-round1.md`) found criteria 1 to 3 and 5 to 13 met, and criterion 4 partly met, with one must-fix: no test pinned the shared side cap. Fix commit 7e0e82f touches only `src/city/edge/stage.test.ts` and `src/city/edge/report.test.ts`.

- **Must fix 1 (criterion 4's fixture): done.** The test "some block side has two stretches (a T's far side), and the bands on them share one cap (criteria 1 and 4)" now does the following:
  - For every `across` stretch on every block side of the 20 named runs, it computes the stretch's own cap, `floor(KERB_BAY_SHARE_MAX[profile] x stretchLen / 2)`.
  - It counts the tiles of that block and street that fall inside any stretch whose own cap is 0, and asserts that count is above 0.
  - The along-axis coordinate is right: `i` for an "x" street and `j` for a "z" street, as `src/core/cityplan.ts` line 114 defines it. The span is high-end exclusive, matching the test's `a < e.span.hi`.
  - Every tile, the first pass's and PB's included, goes through `tryAdd`. Under per-stretch caps no tile could sit on such a stretch, so reverting to per-stretch caps (the option Josh's "1. yes" declined) now fails this test.
  - It is the "at minimum" form the round 1 item allowed, on real cities rather than a typed 14-cell side, which is acceptable.
- **Could improve 1 from round 1: done.** `report.test.ts` builds `NAMED` with "on" first, so the default city (6 x 6 seed 1, one-way on) comes first, as criterion 8 says.
- Nothing from round 1 was undone. I ran `npx vitest run --maxWorkers=2 src/city/edge/stage.test.ts` on 7e0e82f: 219 passed. The main session's gate covered tsc and the city and plan-view folders.

## Rule conflicts and risks
- No new conflicts. The fix only edits tests in `src/city/edge/`, with no new imports outside `src/core` and `src/city/`, and no dependency.
- Risk carried from round 1: P1's thin margin on 6 x 6 seed 8 one-way on (0.718 against 0.69).

## Must fix
none

## Could improve
1. `src/city/edge/stage.test.ts`: add `onZeroCapStretch` to the existing `console.log` line, so the report shows how many tiles rely on the shared cap and not only that some do.
2. Round 1's could-improve items 2 and 3 (comments on `ownSides` counting sides, and on `bestFit` being a max-flow) still stand, optional.
