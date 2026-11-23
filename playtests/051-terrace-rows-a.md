ticket: 051-terrace-rows-a
verdict: pass
regressions: 0

## What the ticket meant to change
Section A adds a dev-only street camera (`&cam=street`) in `src/render3d/streetcam.ts`, read in `renderer.ts` behind `import.meta.env.DEV`; play, layout and picks stay as on `main`.

## What I ran
Nothing: stopped early by analysis. `git diff --stat main...ticket/051-terrace-rows-a` touches only `src/render3d/renderer.ts`, `streetcam.ts`, `streetcam.test.ts` and tickets/050-053 (planning docs). No file in `puzzles/`, `src/core`, `src/grid`, `src/play`, `src/render`, `src/audio` or `tests/` changed.

## Intended differences, snapshots updated
none

## Regressions
none. The harness (`tests/playtest/`) imports only `src/core`, `src/grid`, `src/play`, `src/render` (2D) and `src/audio/cues`; none of them import `src/render3d/` (grep confirms no `render3d` reference outside its own folder reaches them). The renderer.ts change runs only in a DEV build with `cam=street` in the address; with it off the 3D path is the same apart from `fov` staying `FOV_DEG`. The headless replay uses the 2D fake renderer, so grid state, play, Relight plan and audio cues cannot differ.

## Added to the harness
nothing

## Noticed
- Criterion 4 (`npm run build` leaves no `street camera:` string in `dist/`) is the main session's check; I did not run it.
- The `import.meta.env.DEV` guards and the hitTest/camera-matrix behaviour are unit-test territory (criteria 1 to 3), not the harness.
