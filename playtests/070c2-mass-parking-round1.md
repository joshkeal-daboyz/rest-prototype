ticket: 070c2-mass-parking
verdict: pass
regressions: 0

## What the ticket meant to change
Parking in src/city/mass/, and CityOpening.mouth becoming a list (a type in src/core/cityplan.ts).

## What I ran
`npm run playtest` not run: stopped early by instruction. The harness (tests/playtest/) imports only src/core, grid, play, render and audio/cues. None import src/city/ or src/render3d/; the only link is src/core/index.ts re-exporting cityplan.ts, a type change with no runtime effect. No map's play can differ.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
Anything that reads CityOpening.mouth (src/render3d/planview.ts, tilecity.ts, src/city/pipeline/) is outside the harness; the unit tests and the browser cover it.
