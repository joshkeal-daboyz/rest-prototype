ticket: 073e2b-facade-clear
verdict: pass
regressions: 0

## What the ticket meant to change
Hold-out pieces keep 0.3 m clear of stage 7's facade pieces (city generation only; no circuit or map play is meant to change).

## What I ran
`npm run playtest -- --maxWorkers=1` at e97b3f9: 1 file, 130 tests, 130 passed, 0 differed. Diff against goal/city-transformations touches only src/city/holdout/* and src/render3d/holdoutpin.test.ts (9 files), none of which the map replays reach.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
The 0.3 m clearance and pin digests are unit-test territory (holdout/named.test.ts, holdoutpin.test.ts), already touched by the builder.
