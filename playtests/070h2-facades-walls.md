ticket: 070h2-facades-walls
verdict: pass
regressions: 0

## What the ticket meant to change
The pipeline's facades stage gains fire escapes, door canopies, wall air-conditioners and window planters (and a plain shop bay under each escape), with nothing changing in 3D or on the puzzle maps.

## What I ran
`npm run playtest -- --maxWorkers=2` at 6afc055: 130 tests (every ladder map), 130 passed, 0 differed. No browser.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing (the ticket adds no control, fault or cue a replay can reach; its changes are in `src/city/facades/` and test files only, and `git diff --stat goal/city-style...HEAD` shows only the ticket's listed files).

## Noticed
- The ticket's whole surface is the pipeline stage's own output, which its unit tests and pins own; the play harness cannot reach it.
