ticket: 073d1-tech-walls
verdict: pass
regressions: 0

## What the ticket meant to change
Add a city-era `tech` stage (src/city/tech/) that dresses walls, signs, shopfronts and pavement; every map's play is meant to stay as it was.

## What I ran
`npm run playtest -- --maxWorkers=1` at e776825 (round 2): 130 harness tests, 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- Diff against `goal/city-transformations` touches only src/city/tech/*, plus src/render3d/eraview.test.ts and techpin.test.ts (and stages.ts/stage test edits from round 1). Nothing under puzzles/, src/grid, src/night or circuit play, so replays could not move. (Diff against main is huge because the branch sits on the goal branch.)
- Tech digests and keep-outs belong to the folder's unit tests, not the harness.
