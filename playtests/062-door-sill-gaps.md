ticket: 062-door-sill-gaps
verdict: pass
regressions: 0

## What the ticket meant to change
Every placeable building gets a measured door sill, mixed-sill terrace stacks lift each ground piece so every door meets the walk, and windows are measured on single-material models; criterion 9 says `npm run playtest` has no snapshot change.

## What I ran
Round 2. `npm run playtest` (typecheck plus vitest, maxWorkers 2) at 6e6d1ae: 64 snapshot files (one per ladder map), 130 tests, 130 passed, 0 differed. Nothing could have changed. The delta since round 1 (8728bd4) is `models3d.ts`, `sills.ts`, three `src/render3d/` test files and `docs/city-style-guide.md`. That is all 3D layer and docs, and the harness replays `grid`, `play` and `night` through a fake renderer with no 3D layer. No file in `puzzles/`, `src/grid/`, `src/night/`, `src/play/` or `tests/` changed in the delta. The `main...branch` stat is large only because `main` lacks the goal/city-style work this branch carries.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- The harness cannot see anything the ticket changed. Criteria 5 to 8 (lift, band, dressing, failing fixtures) and 11 (screenshots) belong to `src/render3d/` unit tests and Josh's eyes.
- An untracked `gate-out.txt` sits in the gate checkout. I did not create it and left it alone.
