ticket: 070d1-edge-band
verdict: pass
regressions: 0

## What the ticket meant to change
Add stage 4 (edge band) of the city pipeline: new `src/city/edge/` and its registration in `src/city/stages.ts`.

## What I ran
Round 2. No `npm run playtest`. Diff against goal/city-style still touches only `src/city/edge/*`, `src/city/stages.ts`, `src/city/pipeline/run.test.ts` (plus review/playtest notes). The harness imports only `src/core`, `src/grid`, `src/play`, `src/render`, `src/audio` and `puzzles/`, none changed, so no map can play differently. Round 1 had no regressions to re-check.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
Nothing for the harness; the edge band is not reachable by a map replay.
