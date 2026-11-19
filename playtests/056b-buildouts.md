ticket: 056-parking-rules (section B, build-outs drawn, R6 floor)
verdict: pass
regressions: 0

## What the ticket meant to change
B draws the `buildout` cell and its street trees in the tile city, and lowers the tile city's R6 floor to 0.45 (`TILE_CITY_R6_MIN`); nothing in puzzle play.

## What I ran
`npm run playtest` at ab10ba0: 130 tests, 130 passed, 0 differed. The playtest snapshots are identical to main's (`git diff main HEAD -- tests/playtest` is empty).

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing. B's files (`tilecity3d.ts`, `tileslots.ts`, `tilecity.ts` and tests) are all in `src/render3d/`, which the headless replay (puzzle, grid, night, play layers) never reaches. The section's own commit touches nothing in `src/core`, `src/grid`, `src/night`, `src/game`, `src/ui` or `puzzles/`, so there was nothing to expect to move.

## Noticed
- The commit also edits `src/render3d/tileintegrate.test.ts` (R6 and ATM checks), which is not in B's Files list (`tileslots.test.ts`, `tilecity3d.test.ts`, `tilecity.test.ts`). It is a test-only edit that follows from the R6 floor change, but the ticket's Files should be widened or the reviewer told. The other criteria (carriageway stance, fallback, the sheet) are unit or eye checks, not the harness's.
- `git diff --stat main...branch` shows 111 files because the branch sits on `goal/city-style`, which is ahead of main; the section's own commit is 7 files, all in `src/render3d/`.
