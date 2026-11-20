ticket: 070d1b-edge-split
verdict: pass
regressions: 0

## What the ticket meant to change
Split the edge band stage (src/city/edge/) to the new plan; no play behaviour.

## What I ran
No `npm run playtest`. Diff against ticket/070a4-split-plan touches only `src/city/edge/*` (band, check, constants and tests). The harness imports only core, grid, play, render, audio and `puzzles/`, none changed, so no map can play differently.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
nothing
