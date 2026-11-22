ticket: 07x-cleanup
verdict: pass
regressions: 0

## What the ticket meant to change
Tickets 073 E2c (barricade yaw regression tests) and 074 (gallery notes sync) plus docs; no play behaviour.

## What I ran
`npm run playtest -- --maxWorkers=1` at design/07x-cleanup 9741c6f: 130 tests, 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
`git diff main...` is 636 files because main is far behind this branch. Only src/core gained files (cityplan, cityera, assets) among the play layers; grid, night, play and puzzles are untouched.
