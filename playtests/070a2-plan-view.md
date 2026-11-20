ticket: 070a2-plan-view
verdict: pass
regressions: 0

## What the ticket meant to change
Move the street code into src/city/streets/ (no behaviour change), add a dev-only flat viewer behind ?city=plan, and a city=plan route in renderer.ts.

## What I ran
Import trace only, no `npm run playtest` (base 7d49e76 to 5ffcbca). The harness imports only src/audio, src/core, src/grid, src/play and src/render (the 2D map renderer). None of these reach src/city/ or src/render3d/ (the only src/core hits are calibration.ts and cityplan.ts, which the diff does not touch). The changed files are src/city/streets/stage.*, src/render3d/{planview,renderer,tilecity}* and the ticket; the ladder maps cannot move.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
src/city/streets/stage.ts drops the "none" legend entry and renumbers the roles (a city-pipeline change, outside the ladder). Its unit tests are updated in the diff.
