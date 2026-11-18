ticket: 048-polygon-buildings
verdict: pass
regressions: 0

## What the ticket meant to change
Building models in the 3D view switch to POLYGON town-pack names per lot type (SIMPLE Town kept as fallback), with no change to layout, lot types or play.

## What I ran
`npm run playtest` not run, by design: nothing the harness loads could have changed. Branch diff (main...ticket/048-polygon-buildings) is 7 files: `src/render3d/models.ts`, four `src/render3d/*.test.ts` files (one new), and `docs/city-style-guide.md`. All are within the ticket's Files list.
The harness (`tests/playtest/`) imports only `src/core`, `src/grid`, `src/play`, `src/render` (fake) and `src/audio/cues`. None of these imports `src/render3d`. Only `src/main.ts` does, and the harness doesn't load it. `src/core/calibration.ts` mentions render3d in a comment only, and `src/core` is untouched on the branch. `puzzles/` is untouched.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
Everything in this ticket (model choice, fallback, calibration keys) is render3d-internal, so the render3d unit tests cover it. The headless harness has no view on it.
