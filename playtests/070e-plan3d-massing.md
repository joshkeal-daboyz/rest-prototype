ticket: 070e-plan3d-massing
verdict: pass
regressions: 0

## What the ticket meant to change
Add plan3d massing and route it through src/render3d/ (3D view only).

## What I ran
No `npm run playtest` at 682a0d3: stopped early. Round 2 touches only src/render3d/plan3d.ts and plan3d.test.ts; the harness does not import render3d. 0 maps replayed.

## Intended differences, snapshots updated
none

## Regressions
none (round 1 had none)

## Added to the harness
nothing

## Noticed
Nothing the harness can reach changed.
