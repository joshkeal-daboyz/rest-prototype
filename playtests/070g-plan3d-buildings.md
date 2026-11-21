ticket: 070g-plan3d-buildings
verdict: pass
regressions: 0

## What the ticket meant to change
At `?view=3d&city=plan&stage=assemble` the grey boxes become City Pack buildings drawn piece by piece from the stage 5 placements; nothing about map play.

## What I ran
`npm run playtest` equivalent (vitest, --maxWorkers=2) at d8fd481: 130 tests (every map's replay and Relight trace), 130 passed, 0 differed. Diff vs 445eb9c is `src/render3d/plan3d.ts` and `plan3d.test.ts` only; nothing in the harness imports render3d.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing (the plan view is not reachable by a map replay)

## Noticed
Plan3d drawing (wrappers, colourways, grey fallbacks, digest-diff) is covered by unit tests in `src/render3d/`; no harness check belongs here. Not judged: how it looks, which is Josh's call from screenshots.
