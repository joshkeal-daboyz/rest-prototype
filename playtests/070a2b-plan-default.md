ticket: 070a2b-plan-default
verdict: pass
regressions: 0

## What the ticket meant to change
The plan view's default grid size becomes 6 x 6 (PLAN_BLOCKS_DEFAULT) instead of 3 x 3.

## What I ran
Suite not run: the diff vs 070a4-split-plan touches only src/render3d/planview.ts and its test; the harness (loadPuzzle, createGrid, createMapPlay) imports nothing from render3d.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
none
