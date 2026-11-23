ticket: 073e2g-holdout-drawn
verdict: pass
regressions: 0

## What the ticket meant to change
Draw the hold-out era (plan:holdout, dark, own cap) and add each pass's flat picture (stage=tech|holdout|ruin), in src/render3d/ only.

## What I ran
`npm run playtest` (--maxWorkers=1) at 1220431: 130 tests, 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
Diff against goal/city-transformations touches only src/render3d/ (eraview, holdoutdraw tests, models3d, plan3d, planview) plus the ticket file; no play-layer files, so no map could move.
