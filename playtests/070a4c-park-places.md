ticket: 070a4c-park-places
verdict: pass
regressions: 0

## What the ticket meant to change
Section A4c: park places and stop checks in the city streets stage (src/city/streets only).

## What I ran
Not run. The diff touches only src/city/streets, its tests, a design note and the ticket. The harness (loadPuzzle, createGrid, createMapPlay) does not load src/city, so no map's play can change.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
Nothing.
