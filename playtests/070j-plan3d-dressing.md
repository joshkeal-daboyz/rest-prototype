ticket: 070j-plan3d-dressing
verdict: pass
regressions: 0

## What the ticket meant to change
`city=plan&stage=assemble` now runs to stage 8 and draws the stage 7 dressing and stage 8 props through the tile city's instancer, plus the R12 whole-plan audit; no puzzle or play behaviour.

## What I ran
`npm run playtest` equivalent (tsc on the playtest project, then vitest with --maxWorkers=2) at f799495: 130 tests, 130 passed, 0 differed. Diff vs goal/city-style 9ae060c touches only `src/render3d/plan3d.ts` and `plan3d.test.ts`, which is within the ticket's files.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- The playtest harness does not reach the plan3d renderer (no puzzle map touches it); the 3D frame rate (criterion 8) is the main session's browser check, not mine.
