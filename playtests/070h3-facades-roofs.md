ticket: 070h3-facades-roofs
verdict: pass
regressions: 0

## What the ticket meant to change
The `facades` stage gains `roofs` (roof props, one big prop on about half the buildings, roof exits on the roof facing away from open sides); nothing in the map game or 3D changes.

## What I ran
`npm run playtest` (vitest with --maxWorkers=2) at 12f8959 against goal/city-style 7d0fba1: 130 tests, 130 passed, 0 differed. Diff stat is src/city/facades/ (new roofs, roofkit, roofcheck and tests; stage.ts, index.ts, stage.test.ts edited) plus src/render3d/roofpin.test.ts; nothing outside the ticket's files.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing (the city pipeline is not reachable from a map replay)

## Noticed
- The harness replays puzzle maps only; city-plan output (the roofs layer, R8, exit placement) is covered by the ticket's own unit tests and criterion 8's reports, not here.
