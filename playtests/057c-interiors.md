ticket: 057c-interiors
verdict: pass
regressions: 0

## What the ticket meant to change
Section C of 057: frontage and block interiors in the 3D view (src/render3d/ only); no play behaviour.

## What I ran
Round 2. `git diff a6af444..8b398eb --stat`: only src/render3d/frontage.ts, frontage.test.ts, tilecity.ts, tilecity.test.ts (all render3d, within the ticket). `npm run playtest` at 8b398eb: 130 checks, 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
Round 1 had 0 regressions; the fix touches only the 3D renderer, which the headless replay does not reach.
