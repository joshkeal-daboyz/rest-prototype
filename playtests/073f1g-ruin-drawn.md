ticket: 073f1g-ruin-drawn
verdict: pass
regressions: 0

## What the ticket meant to change
Draw F1's ruin growth in the renderer (plan:ruin, draw-only tree yaw); no play behaviour.

## What I ran
`npm run playtest` (maxWorkers=1) at b4595bd: 130 tests, 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
Ticket file tickets/073f1g-*.md does not exist; criteria were taken from section F1g of tickets/073-city-transformations.md. Diff against goal/city-transformations touches only src/render3d (models3d.ts, plan3d.ts, ruindraw.test.ts); diff against main is huge only because main is behind the goal branch.
