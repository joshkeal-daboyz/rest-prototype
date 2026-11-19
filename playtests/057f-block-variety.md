ticket: 057f-block-variety
verdict: pass
regressions: 0

## What the ticket meant to change
Section F: wider blocks (6 to 16 cells), a neighbour step, block types and checks V1/V2 in the pure tile-city layout, with no change to how any puzzle map plays.

## What I ran
`npm run playtest` at fa4b9a1: 130 tests, 130 passed, 0 differed. F's commit touches only `src/render3d/frontage.ts`, `tilecity.ts` and their tests. That is the 3D view, which no replay reaches (the replay is loadPuzzle, createGrid and createMapPlay).

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- `git diff --stat main...` shows 129 files because the goal branch is far ahead of main. I judged F by its own commit (HEAD~1..HEAD), which is the four files above.
