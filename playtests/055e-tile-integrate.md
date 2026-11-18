ticket: 055e-tile-integrate
verdict: pass
regressions: 0

## What the ticket meant to change
Section E wires the tile city's integration (keep-outs, frame-aware dressing and R10, walking level, yellow centre line, readable sheet, daylight) and, by criterion 22, changes no ladder map's play and no snapshot.

## What I ran
`npm run playtest` equivalent (vitest on tests/playtest, 2 workers) at 1027153: 64 map snapshots, 130 tests, 130 passed, 0 differed. No snapshot touched.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing (E adds no control, fault or cue a replay can reach; it touches only `src/render3d/` rendering and the dev-only tile view)

## Noticed
- E's own diff (dd63dc9..1027153) is only citymetrics.ts, models3d.ts, tilecity.ts, tilecity3d.ts, tileslots.ts and their tests, all inside E's Files. Nothing in src/play, src/core, src/grid, src/night, puzzles or tests/ moved in E.
- The gate worktree shows `src/audio/__snapshots__/notSoftened.test.ts.snap` modified (a line-ending warning, LF to CRLF) and an untracked `gate-out.txt`. Neither is E's; clean them before any commit from that worktree.
- The harness does not draw the 3D scene, so it cannot see the ladder's dressing, R10 or keep-out changes in `models3d.ts` and `citymetrics.ts`. Those are covered by the unit suites (render3d ladder suites stay unedited per Files), not here.
