ticket: 056a-parking-layout
verdict: pass
regressions: 0

## What the ticket meant to change
Section A moves the tile city's parking layout (bays, lots, build-out cells, units, checks P1 to P6) to demand-based rules, adds an opt-in `parkByHash` option to `town.ts` (default true), and touches no puzzle, game or night code.

## What I ran
Round 2: `npm run playtest` at a9ad38f (detached in D:\rest-prototype-gate): 130 tests, 130 passed, 0 differed. `git diff 66b40b6..a9ad38f` is tests, comments in `tilecity.ts` (salt note, `units` doc) and a spacing fix in `town.ts`; no code path moved. Round 1 was the same at 66b40b6: 130 passed, 0 differed. `git diff --stat 793bbf7 HEAD` (A's base) touches only `src/render3d/`; nothing in `src/core`, `src/grid`, `src/night`, `src/play`, `src/render`, `src/ui`, `puzzles/` or `tests/`.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing. The ladder replay reaches no render3d code, and a change to the tile city's layout cannot show in a map's trace.

## Noticed
- Files beyond A's list in the ticket: `tileslots.ts` (3 lines: the `buildout` entry in three role tables, B's file) and `tilecity3d.test.ts` and `tileslots.test.ts` (B's tests). The last commit says it is only to keep the gate green. The reviewer should decide whether it is a re-cut or acceptable.
- `town.ts` default `parkByHash ?? true` keeps the ladder's old behaviour. The missing space is fixed in round 2. A unit test that `parkByHash` unset equals `true` belongs in `town.test.ts` (outside A's files, so the builder's call).
- Not mine: the gate worktree has an untracked `gate-out.txt` and a modified `src/audio/__snapshots__/notSoftened.test.ts.snap`. Neither is in the branch.
