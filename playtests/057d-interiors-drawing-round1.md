ticket: 057d-interiors-drawing
verdict: pass
regressions: 0

## What the ticket meant to change
Section D draws the block interiors (apron, courts, greens, paths, alleys, parks, gates, props) in the tile city view only; the puzzle path stays as it was.

## What I ran
`npm run playtest` (tsc check, then vitest with maxWorkers 2) at 03fd43d on the detached checkout: 64 map traces, 130 tests, 130 passed, 0 differed.

Nothing in the diff could have moved play. The branch touches only `src/render3d/` (facade, models3d, tileslots, tilecity3d and their tests, plus the new packpin and tileinterior tests). The harness builds `loadPuzzle -> createGrid -> createMapPlay` and does not import `render3d`. The green run is the expected result.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing (no control, fault or cue was added that a replay can reach)

## Noticed
- The gate worktree shows `src/audio/__snapshots__/notSoftened.test.ts.snap` as modified, with git warning about an LF to CRLF change. This is not in the branch diff and I did not touch it; the main session may want to reset it before the merge.
- `models3d.ts` change (load interior keys only when the tile view asks, puzzle path unchanged) is a unit-test question for `src/render3d/`, not something a replay reaches.
