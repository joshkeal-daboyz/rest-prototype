ticket: 073f1b3-crowns-from-trunk
verdict: pass
regressions: 0

## What the ticket meant to change
At the ruin era a tree is judged by its trunk only (crowns unconstrained); nothing outside `src/city/ruin/` and the ruin's growth pins moves.

## What I ran
`npm run playtest` (maxWorkers=1) at 4964d8b: 130 tests, 130 passed, 0 differed. Diff of the branch's own commit touches only `src/city/ruin/` (9 files), within the ticket's Files.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- The playtest harness covers the puzzle maps, not the city ruin pass; the ruin's pin changes (criterion 9) are the unit tests' and the gate's, not the harness's.
