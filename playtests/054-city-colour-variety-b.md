ticket: 054-city-colour-variety-b
verdict: pass
regressions: 0

## What the ticket meant to change
Section B: each City Pack block in the 3D view is painted from its own colourway atlas (neighbours differ), plus a gallery `colourway=` option; nothing in play, the grid or the audio.

## What I ran
Nothing. `npm run playtest` was not run: the harness cannot reach the changed code (reasoning below). No unit tests re-run.

Why it cannot differ:
- Section B's commit f34db97 touches only `src/render3d/colourway.ts`, `colourway.test.ts`, `models3d.ts` and `gallery.ts`.
- `tests/playtest/*.ts` imports only `src/core`, `src/grid` and `src/render` (the 2D renderer, replaced by a fake renderer and a recording bus). None of them imports `src/render3d`.
- `src/core` has no `render3d` import (the one match in `calibration.ts` is a comment). The only code that loads `src/render3d` is a dynamic `import("./render3d")` in `src/main.ts`, which the harness does not load.
- Section B changes nothing in `src/core`, `src/grid`, `src/night`, `src/play` or `src/audio` (the only core change on the branch, `src/core/assets.ts`, is the optional `AssetColourway` type, cut by the architect before B).
- So the grid, play, Relight plan and audio cues the harness records cannot move, and the map snapshots stay as on `main`.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- `git diff --stat main...<branch>` shows 65 files because the branch sits on the stacked goal branch (tickets 050 to 053); section B's own commit is the 4 files above, all within the ticket's Files for B.
