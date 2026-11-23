ticket: 070a4-split-plan
verdict: pass
regressions: 0

## What the ticket meant to change
Stage 1 (streets) becomes the split plan with T-junctions, a new `split.ts`, and `CityStreetsLayer` takes the new fields in `src/core/cityplan.ts`.

## What I ran
Not run, by instruction (stop early if nothing the harness loads changed). The diff against `goal/city-style` touches only `src/city/**`, `src/core/cityplan.ts` (interfaces only, no runtime code) and the ticket. The harness imports `src/audio`, `src/core`, `src/grid`, `src/play` and `src/render`; none of them reads `src/city`. 0 maps could differ.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
Nothing for the harness. R-8 (`npm run playtest` shows no ladder change) holds by inspection, not by replay.
