ticket: 070a4d-six-by-six
verdict: pass
regressions: 0

## What the ticket meant to change
Split-plan street constants and split.ts for a six-by-six layout, all under src/city/streets.

## What I ran
No suite run. The diff touches only src/city/** (constants.ts, split.ts and tests). Nothing in the harness path (loadPuzzle, createGrid, createMapPlay) imports src/city, so no map's trace can move. Revision 03797ee.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
none
