ticket: 057d-interiors-drawing
verdict: pass
regressions: 0

## What the ticket meant to change
Section D draws the block interiors (apron, courts, greens, paths, alleys, parks, gates, props) in the tile city view only; the puzzle path stays as it was.

## What I ran
`npm run playtest` (tsc check, then vitest, one test file) at cf5d8fd on the detached checkout: 64 map traces, 130 tests, 130 passed, 0 differed from main's snapshots. Round 1 fixes (03fd43d to cf5d8fd) touch src/render3d/ only (a furniture filter for court lots, plus tests).

Nothing in the diff could have moved play. The harness builds `loadPuzzle -> createGrid -> createMapPlay` and does not import `render3d`. The green run is the expected result.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
Nothing. The court-lot furniture filter and the align-reaches-packTown test belong to src/render3d/ unit tests, where they already are.
