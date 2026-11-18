ticket: 045-click-to-calibrate-fronts-c
verdict: pass
regressions: 0

## What the ticket meant to change
Section C: click-to-calibrate in the dev-only 3D model gallery, with the gallery gated on `import.meta.env.DEV` and its how-to added to the style guide.

## What I ran
Nothing re-run (stopped early by design). `git diff --stat main...ticket/045-click-to-calibrate-fronts-c`: `src/render3d/gallery.ts`, `gallery.test.ts`, `renderer.ts` (3 lines), `docs/city-style-guide.md`. All inside the ticket's Section C Files. `npm run playtest` not run: 0 maps run, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- The harness chain (`loadPuzzle`, `createGrid`, `createMapPlay`, fake renderer, recording bus) never imports `src/render3d/` (grep of `tests/playtest` finds no `render3d`). The only behavioural line touched is the gallery guard in `renderer.ts`, which only decides whether `?gallery=` opens the gallery; the town, grid, play, Relight plan and audio cues are untouched. Nothing a replay can reach moved, so the snapshots cannot differ.
- Gallery save code and its tests belong to the render3d unit tests, not the harness.
