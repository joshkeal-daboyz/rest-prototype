ticket: 055c-tile-draw
verdict: pass
regressions: 0

## What the ticket meant to change
Section C (criteria 13 to 16) adds a dev-only, puzzle-free tile city drawn from City Pack ground tiles (`city=tiles`), leaving the puzzle path and every map unchanged (criterion 22: `npm run playtest` green with no snapshot change).

## What I ran
`npm run playtest` at 81e163f (worktree D:\rest-prototype-055c): 64 maps, 64 passed, 0 differed (130 tests: 64 trace replays, 64 frame-draw checks, 2 script checks). `git diff --stat ticket/055a-tile-grid...HEAD` touches only the section's files: `models3d.ts`, `renderer.ts`, new `tilecity3d.ts`, `tileslots.ts` and their two tests. Nothing outside the ticket's C Files list.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing (the section adds no control, fault or cue a replay can reach)

## Noticed
- Can `models3d.ts` change play on the puzzle path? No, from the diff. `LoadDeps.tileKeys` defaults to none, so `tilePlan` is null and no extra GLB is read. `set.tile` is only assigned when `tileKeys` is non-empty. `sharedModels()` now calls `loadPageModels({})`, which passes the same `loadModels` arguments as before (the `table` override and `tileKeys` are absent). The new `sharedTileModels` and `tileInput` are called only from the tile view. `meshParts` is only newly exported. It is also pure 3D loading and drawing, which the headless harness never imports, so it cannot move a trace.
- Can `renderer.ts` change play on the puzzle path? No, from the diff. The branch is guarded by `import.meta.env.DEV` and by `cityTilesRequested(location.search)` returning non-null, which needs `city=tiles`. With no `city=` the function falls through to today's code. Note it sits after the gallery branch and before the street camera, and in a dev build with `city=tiles` the puzzle passed in is ignored (as the ticket says). The harness never touches the renderer, so criterion 15's source test, not a replay, is the guard for this.
- Criteria 17 and 18 (screenshots, the `npm run build` string check) are the main session's and a browser's; I did not run them.
- Not a harness matter: the tile-metrics checks T1 to T9 (section D) belong to `tilemetrics.test.ts`.
