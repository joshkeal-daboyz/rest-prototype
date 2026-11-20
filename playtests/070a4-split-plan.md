ticket: 070a4-split-plan
verdict: pass
regressions: 0

## What the ticket meant to change
Stage 1 (streets) becomes the split plan with T-junctions; round 2 only re-indexes the street, T and junction lookups (review R-7), with no behaviour change asked for.

## What I ran
Not run, by instruction (stop early if nothing the harness loads changed). The round 2 commit touches only `src/city/streets/` (check.ts, split.ts, stage.ts, split.test.ts). The harness imports `src/audio`, `src/core`, `src/grid`, `src/play` and `src/render`; none reads `src/city`. 0 maps could differ.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
Nothing for the harness. Round 1 regressions: none were raised, so nothing to re-check.
