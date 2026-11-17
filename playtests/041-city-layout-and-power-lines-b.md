ticket: 041-city-layout-and-power-lines-b
verdict: pass
regressions: 0

## What the ticket meant to change
Section B swaps the 3D view's block geometry, models and placeholders (`scene.ts`, `models.ts`, `models3d.ts`, `placeholders.ts`) onto the A-section town layout; play behaviour is not meant to change.

## What I ran
Did not run `npm run playtest`, by design: the branch diff against main touches only `src/render3d/**` (plus A's reports and `tickets/usage.md`), and the harness imports only `src/core`, `src/grid`, `src/play`, `src/render` and `src/audio/cues`. Nothing it loads changed, so every snapshot is unchanged by construction. Branch tip 3a7837e. No `tests/` file in the diff.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- The 3D view is outside what a headless replay can see; layout, models and placeholders belong to the `src/render3d` unit tests, and Josh's play in the browser covers the look.
