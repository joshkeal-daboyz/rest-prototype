ticket: 053-procedural-city-guide
verdict: pass
regressions: 0

## What the ticket meant to change
Add chapter 16 (the R1 to R12 evaluation protocol) to the city style guide, plus `citymetrics.ts` and its test and new drift checks in `styleguide.test.ts`; no play behaviour (criterion 7: `npm run playtest` green with no snapshot change).

## What I ran
`npm run playtest` was not run, on purpose. The harness imports only `src/core`, `src/grid`, `src/play`, `src/render` and `src/audio/cues`. The 053 commit (9926319) touches only `docs/city-style-guide.md`, `docs/overnight-city-goal-notes.md`, `src/render3d/citymetrics.ts`, `src/render3d/citymetrics.test.ts` and `src/render3d/styleguide.test.ts`. `citymetrics.ts` is imported only by its own test and `styleguide.test.ts`. Nothing under `tests/playtest/` imports `src/render3d`. The only `src/` files that name `render3d` are `src/main.ts` (a lazy `import("./render3d")`, which the harness never loads) and a comment in `src/core/calibration.ts`. So no map's lit lamps, loads, faults, parts, prompts, Relight plan or audio cues can differ from `main`. Not run: unit tests, typecheck, gate.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- `git diff --stat main...ticket/053-procedural-city-guide` is 59 files, because the branch sits on the unmerged 050 to 052 goal-branch work (more `src/render3d/` files, plus tickets, reviews and playtests). Criterion 7's check `git diff main -- src/` touching only the three 053 files will not hold until 050 to 052 are on `main`. The 053 commit alone does stay inside the ticket's Files list.
- The 050 to 052 `src/render3d/` changes also stay out of the harness's imports, so they need no replay either.
