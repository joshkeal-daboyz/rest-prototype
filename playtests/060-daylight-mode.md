ticket: 060-daylight-mode
verdict: pass
regressions: 0

## What the ticket meant to change
A dev-only day lighting mode behind one light rig (the tile city opens in day), with night kept value for value and the puzzle maps and production game unchanged (criteria 3 and 4).

## What I ran
`npm run playtest` at bbf9489: 130 tests over the ladder maps (64 snapshot files), 130 passed, 0 differed. Diff stat of the branch's own commit touches only `src/render3d/` (lighting, lightrig, renderer, scene, streetcam, tilecity3d and their tests), the style guide and tickets; nothing in `src/play/`, `src/grid/`, `src/night/`, `src/core/`, `src/ui/` or `puzzles/`.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing (the replay has no render3d layer: a fake renderer, so light values and tile-view defaults are not reachable from it; no new control, fault or cue was added for a replay to reach)

## Noticed
- Criterion 3's value-for-value check of night lights, background, fog, tone mapping and material colours on the three protocol maps belongs in `src/render3d/` unit tests (lightrig.test.ts); the headless playtest cannot see it. Not checked by me.
- Criteria 7 and 9 (build contains no `light=`/button/L key; screenshots) are the main session's and not covered here.
