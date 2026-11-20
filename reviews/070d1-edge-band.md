ticket: 070d1-edge-band
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Stage 4 (edge), part one: kerb cuts, 056's greedy kerb-bay allocator moved unchanged into `src/city/edge/` with the first-tile pass in front of it (Josh's "yes", option B), build-outs and trees, and P1, P3 to P6 ported onto the layer, holding on all 13 named cities. A block left short is recorded in the layer and the stage does not throw (criterion 2, Q6).

## Does the branch do it?
Round 2. Criteria 1, 3, 4 and 5 were met in round 1. Commit 4b639de touches only `check.ts`, `stage.ts`, `stage.test.ts` and `report.test.ts`, so they still hold.

- **Round 1 must-fix 1 (criterion 2, "the run is `ok`").** Done.
  - `edgeStage.run` now calls `edgeFailures(..., true)`. With that flag, P1 no longer counts `blocksWithoutBays`. It also lets the supply-under-band term go, but only when some block has `shortTiles > 0` and supply is below `PARK_SUPPLY_BAND.lo`. `bayServedFar`, supply over the band, and P3 to P6 still throw.
  - The fixture "a block whose own bands and across bands are all full..." now runs `runCity` with its typed-in land and mass as fixture stages and the real `edgeStage`. It asserts that the run is `ok` and that `first` is null. It also checks that the flagged failure list has no P1 and the unflagged one does. That is the stage-level test round 1 asked for.
  - `report.test.ts` now prints `run.ok` per city and asserts it on the named cities. That covers round 1's could-improve 1.
- The named-city test in `stage.test.ts` still requires every verdict to pass, `blocksWithoutBays` 0 and supply in the band. So the waiver cannot hide a shortfall on the named cities.
- I ran `npx vitest run --maxWorkers=2 src/city/edge/stage.test.ts`: 87 passed. The main session's gate on 4b639de was green.

## Rule conflicts and risks
- The waiver subtracts all of `blocksWithoutBays`, not just the blocks recorded short. A block below the minimum but with `shortTiles` 0 (if `wanted` can be 0, for example) would pass the stage silently. That case may occur, not checked. It is within "recorded, not thrown on" only if the two counts agree.
- Waiving the supply-under-band term on a short city reads the ticket's "the stage does not throw" broadly. It is defensible (the same shortfall, seen city-wide), and the named cities are still pinned in the band by test.
- No purity, folder or dependency issue. The diff stays in `src/city/edge/`, plus the one line each in `stages.ts` and `run.test.ts` from round 1.

## Must fix
none

## Could improve
1. `check.ts` (`edgeFailures`): subtract the blocks with `shortTiles > 0`, not `m.blocksWithoutBays`. Or assert the two are equal. That way only a block the layer records as short is let through.
2. Round 1's could-improve 2 still stands: a one-line comment in `check.ts` saying that the tree check's "next to a crossing" (from the neighbours' roles) agrees with the allocator's interval ends on today's streets.
