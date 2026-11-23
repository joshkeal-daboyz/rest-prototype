ticket: 073e2-holdout-camps
verdict: pass
regressions: 0

## What the ticket meant to change
At the holdout era, held districts get camps, stores, clutter, roof panels, stalls, water towers, barricades and farms as adds (plus removes); the clean city is unchanged; no circuit or drawing.

## What I ran
`npm run playtest` equivalent (vitest, playtest config, --maxWorkers=1) at bbaf67b: 130 tests, 130 passed, 0 differed. Diff against goal/city-transformations touches only src/city/holdout/, src/city/stages.ts, src/city/pipeline/eras.test.ts and src/render3d/holdoutpin.test.ts; no puzzle, grid, night or play code.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- The ticket adds no control, fault or cue a map replay can reach.
