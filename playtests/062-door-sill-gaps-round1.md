ticket: 062-door-sill-gaps
verdict: pass
regressions: 0

## What the ticket meant to change
Every placeable building gets a measured door sill, mixed-sill terrace stacks lift each ground piece so every door meets the walk, and windows are measured on single-material models; criterion 9 says `npm run playtest` has no snapshot change.

## What I ran
`npm run playtest` (typecheck plus vitest, maxWorkers 2) at 8728bd4: 64 snapshot files (one per ladder map), 130 tests, 130 passed, 0 differed. Nothing could have changed: the ticket's changes are in `src/render3d/` (sills, stacks, models3d, tests) and the guide, and the harness replays `grid`, `play` and `night` through a fake renderer with no 3D layer. `main` also lacks the goal/city-style work this branch merged in, so the `main...branch` stat is large; I took the ticket's files from its own commits and found none in `puzzles/`, `src/grid/`, `src/night/`, `src/play/` or `tests/`. The only non-render3d `src/` difference from `main` is `src/core/assets.ts` (+21 lines), which comes from the merged goal/city-style work and does not touch play.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- The harness cannot see anything the ticket changed. Criteria 5 to 8 (lift, band, dressing, failing fixtures) and 11 (screenshots) belong to `src/render3d/` unit tests and Josh's eyes.
- An untracked `gate-out.txt` sits in the gate checkout. I did not create it and left it alone.
