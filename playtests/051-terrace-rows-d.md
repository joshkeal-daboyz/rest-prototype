ticket: 051-terrace-rows
verdict: pass
regressions: 0

## What the ticket meant to change
Section D: the 3D town places packed terrace stacks in place of the placeholder runs (models3d/models/terrace/scene in `src/render3d/`), with the far gap measured to the real corner wall.

## What I ran
Nothing. `npm run playtest` not run: the harness cannot reach the changed code (reasoning below).

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- The harness imports only `src/audio/cues`, `src/core`, `src/grid`, `src/play`, `src/render` (plus its own files). None of `src/audio`, `src/core`, `src/grid`, `src/night`, `src/play`, `src/render` imports `src/render3d` (grep: no matches in code; `calibration.ts` mentions it only in a comment). `src/main.ts` loads it by dynamic import and the harness never imports `main.ts`.
- `git diff --name-only main...HEAD` outside `src/render3d/`, `docs/`, `tickets/`, `reviews/`, `playtests/` is empty: no change to grid, play, Relight plan, audio cues, `puzzles/` or `tests/`. Grid, play state, Relight plan and cues are therefore byte-identical to main for every map.
- Terrace placement and the stack cap are pure 3D layout; any check on them belongs to the render3d unit tests.
