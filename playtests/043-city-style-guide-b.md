ticket: 043-city-style-guide-b
verdict: pass
regressions: 0

## What the ticket meant to change
Section B adds a debug-only `?gallery=<pack-id>` 3D view that lays out every building of one pack (plus a guide edit), so calibration is one look per pack.

## What I ran
Nothing. Stopped early, `npm run playtest` not run, at 3514cd3: the diff touches only `docs/city-style-guide.md` and `src/render3d/` (debug3d.ts, gallery.ts, gallery.test.ts, renderer.ts). The harness imports only `src/core`, `src/grid`, `src/play`, `src/render` and `src/audio/cues`. The one non-render3d importer of render3d is `src/main.ts`, by dynamic import, and the harness does not load it. No map can play differently.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- The 3D gallery view and the `?gallery=` switch in `renderer.ts` need a browser look from Josh; the harness cannot see them.
