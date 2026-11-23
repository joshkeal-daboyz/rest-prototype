ticket: 079d-facades-rest
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
PR 4 finishes section D. `facades/testcities.ts` re-exports `NAMED` and `VARIED` from the one switch and drops its own 20-city list. The tests in `roof`, `rooffixtures` and `stage` that fail on one city get the totals guard (`if (FULL_CITIES)` on the 20-city total only, threshold unchanged). The fixed indexes name their city from `ALL_NAMED` or search `VARIED`. All of this within 15 rewritten cases, with no threshold, expected value or pin changed.

## Does the branch do it?
I diffed with `git diff -M origin/main...bdf3267`. The worktree's local `main` is stale and shows PR 3 and ticket 080 as well. The real diff is 4 files, all in `src/city/facades/`.

- **testcities re-export.** `src/city/facades/testcities.ts` now has `export { NAMED, VARIED } from "../testing/namedcities"`, and the local `NAMED` is deleted. The order is the same as before (on seeds 1 to 10, then off), so `ALL_NAMED[i]` is the old `NAMED[i]`. `DEFAULT`, `label` and `City` stay local, as the Interfaces section allows. tsc is clean, so `City` and `NamedCity` line up. Met.
- **Totals guard, `roof.test.ts`.** Five tests each keep their per-city `expect`s unguarded and wrap only the totals in `if (FULL_CITIES)`, with the same numbers:
  - `dishes`, `flipped` and `two` stay `> 1000`.
  - `seen` stays `> 2000`.
  - `blind` stays `> 100` and `mid` stays `> 1000`.
  - `exercised` stays `> 500` and `under` stays `>= 1`.
  - In TF, `blind`, `mid` and `none` keep their thresholds.

  This matches the main session's note on the totals guard. Met.
- **Fixed index, `roof.test.ts`.** R-3 "every choice is the stage's rand" now uses `ALL_NAMED[1]` (seed 2 on). That is the same city as the old `NAMED[1]`. Met.
- **`rooffixtures.test.ts`.** The search is now `[...VARIED, ...ALL_NAMED].find(small)`. In `npm test` it looks at the four pinned cities first, then all 20, so it can't come up empty the way a one-city `NAMED.find` could. The `toBeDefined` assert is unchanged. Met.
- **`stage.test.ts`.** Four tests: `seen > 500`, `cornerDoors` and `midDoors > 1000`, `deep > 10000` and `corners > 5000` are each guarded with the threshold unchanged. The per-placement checks still run on the one city. Met.
- **Nothing loosened.** In the diff, every `toBeGreaterThan` / `toBeGreaterThanOrEqual` keeps its number. No pin or expected value moved. In a full run (`FULL_CITIES` true, `NAMED` = `VARIED` = `ALL_NAMED`, same order), every changed test behaves exactly as it did on main. So `gate:full` keeps the old coverage.
- **Leftover fixed indexes.** I grepped facades for `NAMED[1-9]`, `NAMED.length` and `toHaveLength(20)`. The only hits are `novelty.test.ts`'s `ALL_NAMED[11]` (from PR 3), the two report files (which run with all cities) and `FACADES_LEGEND`'s length (a legend count, not a city list). None is left over.
- **Optional items.** `dress`, `escape` and `novelty` still import `NAMED` from `../testing/namedcities` rather than `./testcities`. The note says "may", so this is not required.
- **Gate.** Already verified green by the main session (12 files, 186 passed); I did not rerun it.

## Rule conflicts and risks
- **Case count.** By my count, 11 `it` cases are rewritten (roof 6, rooffixtures 1, stage 4), which is within the cap of 15. No test is added, and none is near-duplicated.
- **Purity and scope.** No `src/grid/` or `src/night/` change. No file outside `src/city/facades/`. No new dependency. No GDD rule touched.
- **A guarded test can pass on nothing (accepted risk).** In `npm test`, a guarded test now passes even if its loop never reaches the case it checks on seed 1 (for example, zero `exercised` water-tower caps). This is the trade the main session ruled on (Josh's card "Yes, split them"). The full run still catches it.

## Must fix
none

## Could improve
1. `src/city/facades/rooffixtures.test.ts`: if seed 1 and the four pinned cities all lack a block under 16 buildings, the `[...VARIED, ...ALL_NAMED]` search builds up to 16 more cities in `npm test`. It passed green, so a pinned city or `DEFAULT` must be small enough. Adding a comment naming which city it finds would make a future slowdown easy to explain.
2. The builder reports a full-mode run of the six report files. Section D asks that its touched files (`roof`, `rooffixtures`, `stage`) each be run once in full mode too. By reading the code, behaviour in full mode is identical to main, so I don't treat this as a blocker. One `npx vitest run --mode full --maxWorkers=2` per file would confirm it.
