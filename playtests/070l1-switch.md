ticket: 070l1-switch
verdict: pass
regressions: 0

## What the ticket meant to change
Criterion 6 (R-8): `city=tiles` opens the pipeline's city and the guide, grammar and legend catch up, with no change to any ladder map's play.

## What I ran
`npm run playtest` (vitest --maxWorkers=2) at 6a8eb65: 130 tests, 130 passed, 0 differed. Diff stat vs goal/city-style 12fc1f9 touches only docs/ and src/render3d/ (the ticket's files); nothing in grid, play, ui, render or core.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
Nothing to add. The ticket's criteria 1 to 5 are unit tests in src/render3d and the browser check is Josh's.
