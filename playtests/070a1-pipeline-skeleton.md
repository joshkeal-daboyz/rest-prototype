ticket: 070a1-pipeline-skeleton
verdict: pass
regressions: 0

## What the ticket meant to change
A1 adds the staged city-pipeline skeleton as new files under src/city/ only; no play behaviour.

## What I ran
`npm run playtest` at df53211 (base 2edac93): 1 file, 130 tests, 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none. The diff is 20 new files, all under src/city/. Nothing outside src/city/ imports from it (the only "./city" imports are src/render/city.ts, a different module), so no map's play could have moved.

## Added to the harness
nothing

## Noticed
none
