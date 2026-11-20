ticket: 070d1-edge-band
verdict: pass
regressions: 0

## What the ticket meant to change
Add stage 4 (edge band) of the city pipeline: new `src/city/edge/` and its registration in `src/city/stages.ts`.

## What I ran
No `npm run playtest`. The branch diff against goal/city-style touches only `src/city/edge/*`, `src/city/stages.ts` and `src/city/pipeline/run.test.ts`. The harness imports only `src/core`, `src/grid`, `src/play`, `src/render`, `src/audio` and `puzzles/`, none of which changed, so no map can play differently.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
Nothing for the harness; the edge band is not reachable by a map replay.
