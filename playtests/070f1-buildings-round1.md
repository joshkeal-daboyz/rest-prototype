ticket: 070f1-buildings
verdict: pass
regressions: 0

## What the ticket meant to change
F1 adds the city buildings stage (src/city/buildings/), one line in stages.ts and a run test tweak, plus a render3d style pin test.

## What I ran
Not run, per instruction. The harness (tests/playtest) imports nothing from src/city or src/render3d, and the diff touches no grid, night, core, puzzles or map-play files: 15 files, all under src/city and one render3d test.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
none
