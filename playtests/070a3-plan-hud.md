ticket: 070a3-plan-hud
verdict: pass
regressions: 0

## What the ticket meant to change
Section A3 / R-8: in the view=3d branch, hide the #ui root when the plan view hides the HUD (new pure `planHidesHud`).

## What I ran
Did not run `npm run playtest`. Diff abeb95f..5e13b97 touches only src/main.ts (1 line), src/render3d/index.ts, planview.ts and its test. The harness imports only src/audio/cues, core, grid, play and render, and keeps its own copy of main.ts's relightCues, so nothing it loads changed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
The harness cannot see main.ts's view=3d branch. That is browser territory (Josh).
