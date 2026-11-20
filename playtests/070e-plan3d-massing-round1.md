ticket: 070e-plan3d-massing
verdict: pass
regressions: 0

## What the ticket meant to change
Add plan3d massing and route it through src/render3d/renderer.ts and tilecity3d.ts (3D view only).

## What I ran
No `npm run playtest` at 3ec919b: stopped early. The diff touches only src/render3d/ (plan3d.ts, plan3d.test.ts, renderer.ts, tilecity3d.ts). The harness loads core, grid, play, audio and a fake renderer, and none of them import render3d (core mentions it in comments only). 0 maps replayed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
Nothing the harness can reach changed; 3D drawing is for Josh's eyes.
