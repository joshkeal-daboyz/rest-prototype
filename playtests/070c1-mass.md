ticket: 070c1-mass
verdict: pass
regressions: 0

## What the ticket meant to change
Section C1 and rule R-8: add the mass stage under src/city/mass/ and register it in src/city/stages.ts.

## What I ran
Did not run `npm run playtest` at 10b1b41. The harness imports nothing from src/city/ or src/render3d/ (grep of tests/playtest found only unrelated "capacity" matches in replay.ts). The diff against goal/city-style at 7b6ad46 touches src/city/, one test line in src/render3d/planview.test.ts, and the ticket. It does not touch the loadPuzzle, createGrid or createMapPlay path. Stopped early as instructed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
none
