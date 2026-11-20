ticket: 070b-land
verdict: pass
regressions: 0

## What the ticket meant to change
Add the land stage under src/city/ and move the stage list in the pipeline (section B, R-8); no play behaviour.

## What I ran
Not run. Diff 412a199..ccc5562 touches only src/city/. The harness imports src/core, grid, play, render (2D), audio; none import src/city/ (only src/render3d/ does, via planview and tilecity), and none import render3d.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
Nothing.
