ticket: 070d2-edge-kerb
verdict: pass
regressions: 0

## What the ticket meant to change
Section D2 adds kerb/ground checks to the city edge stage (src/city/edge/ only).

## What I ran
Not run: the diff touches only src/city/edge/; the harness (loadPuzzle, createGrid, createMapPlay) imports nothing from src/city, so no map's play can have moved.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
Kerb checks are covered by kerb.test.ts in the folder; none belong in the harness.
