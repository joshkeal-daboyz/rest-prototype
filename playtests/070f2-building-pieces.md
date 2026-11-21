ticket: 070f2-building-pieces
verdict: pass
regressions: 0

## What the ticket meant to change
Add building column pieces, kit, placement and column checks under src/city/buildings (section F2 of ticket 070).

## What I ran
Not run. The diff touches only src/city/buildings/** and one src/render3d test. The playtest harness (loadPuzzle, createGrid, createMapPlay) imports nothing from either folder, so no map's play can have moved. Branch revision 05643a6.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
none
