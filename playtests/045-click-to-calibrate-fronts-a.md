ticket: 045-click-to-calibrate-fronts-a
verdict: pass
regressions: 0

## What the ticket meant to change
The 3D gallery lets Josh click a model to mark its front or exclude it, saved per pack:name (section A: models, gallery, loader, guide; section B: dev-server save plugin).

## What I ran
Nothing. `npm run playtest` was not run at e397ad4 (A) because nothing the harness loads can have changed (reasoning below). B was not checked out; per the brief it touches only `tools/calibration/` and `vite.config.ts`.

Reasoning:
- `git diff --stat main...HEAD` touches `src/render3d/` (models, models3d, gallery, new calibration.ts, test files), `src/core/calibration.ts` (+ test), and `docs/city-style-guide.md`. All of it is within the ticket's Files list (sections 0 and A). `playtests/` and `reviews/` files are the earlier reports.
- The harness (`loadPuzzle -> createGrid -> createMapPlay`, fake renderer, recording bus) imports nothing from `src/render3d/` or `calibration`; grep of `tests/playtest/` found none.
- No file in `src/grid/`, `src/night/`, `src/play/`, `src/ui/`, `src/render/` or `src/audio/` references `calibration` or `render3d`; grep found none. None of those folders is in the diff.
- `src/core/calibration.ts` gained pure helpers (key build/parse, validate, apply patch) used only by the calibration code. `src/core/index.ts` only re-exports it (already on main). No puzzle, grid, play, Relight or cue type changed.
- No `puzzles/`, `tests/`, `package.json` changes, so no map or script needed updating.
- Section B (`tools/calibration/`, `vite.config.ts`) is dev-server only and does not load into the harness.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing (the ticket adds no control, fault or cue a replay can reach)

## Noticed
- The key re-key (bare name to `pack:name`) and the gallery click rules belong in `src/render3d/` unit tests, which the ticket already adds; none belongs in the harness.
