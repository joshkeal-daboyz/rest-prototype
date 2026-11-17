ticket: 042-buildings-face-variety-lit-places-pack-streets-a
verdict: pass
regressions: 0

## What the ticket meant to change
Section A: every placed building faces its road, models vary by family, and corner models stand only on corner lots. This is 3D look only, and the section's criteria are all Vitest in `src/render3d/`.

## What I ran
Did not run `npm run playtest`; stopped early by design. `git diff --stat main...ticket/042-buildings-face-variety-lit-places-pack-streets-a` (tip 0727d50) touches only `src/render3d/` (models, models3d, town, renderer, debug3d and their tests), which is inside the ticket's Files for A. Nothing in `tests/playtest/` imports `render3d`, and the only importer outside the folder is `src/main.ts`, which the harness doesn't load. The harness path (`loadPuzzle -> createGrid -> createMapPlay`) cannot reach any changed file, so every snapshot would match by construction.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- The facing, variety and corner criteria are unit-level and belong in `src/render3d/` tests, where `facing.test.ts` and `debug3d.test.ts` already put them.
- Facing calibration ("+z" starting guess) needs Josh's one browser pass with `fronts=1`, as the ticket's Q2 says. No headless check can cover it.

## Round 2

verdict: pass (not re-run)
regressions: 0

Stopped early by instruction. `git diff --stat fb94dfe..6dad0ab` touches only `src/render3d/` (debug3d.ts, debug3d.test.ts, facing.test.ts, models.ts, town.ts). The harness (`tests/playtest/`) loads `core`, `grid`, `play`, `render` and `audio/cues`. None of them import `render3d`. The only importer outside the folder is `src/main.ts`, a dynamic import the harness never loads. The 3D view cannot change a replayed trace, so I did not run `npm run playtest`. Round 1 (pass, 0 regressions at 0727d50) stands. No snapshots or scripts changed.
