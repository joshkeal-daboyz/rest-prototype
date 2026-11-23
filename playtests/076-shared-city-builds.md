ticket: 076-shared-city-builds
verdict: pass
regressions: 0

## What the ticket meant to change
Sections A and B: share built test cities across test files through an on-disk cache, with no change to the game's behaviour.

## What I ran
`npm run playtest -- --maxWorkers=1` at fb8392a (ticket/076a-city-cache): 130 tests, 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- The diff touches only `src/city/testing/`, `src/city/*/testcities.ts`, test files and one `vite.config.ts` line, so no play behaviour could move. The playtest harness covers the puzzle maps only, not the city pipeline. Whether the switched city tests still check the same things is for the reviewer and the gate.
- The playtest config uses `tests/playtest/vitest.config.ts`, which has no `globalSetup`. Nothing in the harness imports the cache.
