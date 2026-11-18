ticket: 047-exclude-video-store
verdict: pass
regressions: 0

## What the ticket meant to change
The 3D town stops placing the simple-town video rental store (`store_small_mesh`) by adding it to `BUILDING_EXCLUDE`; nothing in play changes.

## What I ran
Nothing. `npm run playtest` not run: the diff touches only `src/render3d/models.ts` (one constant and its comment), three `src/render3d/*.test.ts` files, `docs/city-style-guide.md` and the ticket. `grep -rn render3d tests/playtest` finds no import, so the headless harness (loadPuzzle, createGrid, createMapPlay, Relight plan, audio cues, fake renderer) never loads that code. Files match the ticket's May-touch list.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
Which buildings the 3D town places is covered by the render3d unit tests (criteria 1-6), not by this harness.
