ticket: 073f1b1-t1-ruin-trees
verdict: pass
regressions: 0

## What the ticket meant to change
F1b1: in the ruin era only, T-1 stops judging a tree crown. F1b2: ruin trees are placed under spans, and ruin roof growth is switched on (clear of rooftop poles and lines).

## What I ran
`npm run playtest -- --maxWorkers=1` at 75f4171 (F1b1 and F1b2): 130 tests (every map), 130 passed, 0 differed. The branch touches only `src/city/` (pipeline, ruin) plus its tests, review and playtest files; no play, grid, night or puzzle code.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
The harness does not reach the city pipeline, so the ruin's growth pins and the era checks are the unit tests' job, not a playtest verdict.
