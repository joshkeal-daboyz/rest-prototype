ticket: 073f1-ruin-growth
verdict: pass
regressions: 0

## What the ticket meant to change
Add the `ruin` era's growth stage (stage 13: ground, walls, vines; roofs off behind `RUIN_ROOF_GROWTH`) as an `ERA_STAGES` entry, writing only `adds`, so the clean city and earlier eras stay unchanged.

## What I ran
`npm run playtest -- --maxWorkers=1` at 9284f14: 130 tests, 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing. The diff is `src/city/ruin/*`, one line in `src/city/stages.ts` and `src/render3d/ruinpin.test.ts`, all inside the ticket's scope. None of it is reachable from the circuit-map replays.

## Noticed
- The harness replays circuit maps only. It cannot see the city pipeline, so "clean city and earlier eras unchanged" rests on the city folder's own pins (`ruinpin.test.ts`).
