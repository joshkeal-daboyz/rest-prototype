ticket: 070d1b-edge-split
verdict: pass
regressions: 0

## What the ticket meant to change
Split the edge band stage (src/city/edge/) to the new plan; no play behaviour.

## What I ran
No `npm run playtest` (round 2). The fix commit 7e0e82f changes only `src/city/edge/report.test.ts` and `stage.test.ts`. The harness imports core, grid, play, render, audio and `puzzles/`, none changed, so no map can play differently. Round 1 found 0 regressions.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
nothing
