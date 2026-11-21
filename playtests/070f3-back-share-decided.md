ticket: 070f3-back-share-decided
verdict: pass
regressions: 0

## What the ticket meant to change
F3 marks `BACK_SAME_SHARE` as Decided (a comment) and makes buildings' R-4 test double replace buildings by name; no play behaviour.

## What I ran
`npm run playtest` (maxWorkers 2) at 28c31a3: 130 tests, 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- Diff is three files in `src/city/buildings/` (constants.ts, constants.test.ts, stage.test.ts); nothing the puzzle replay reaches.
