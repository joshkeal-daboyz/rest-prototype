ticket: 070h1-facades-ground
verdict: pass
regressions: 0

## What the ticket meant to change
H1 adds the city pipeline's facades stage (every ground slot gets a keyed, placed piece) in new `src/city/facades/`, plus a render3d pin test; no puzzle-map play behaviour.

## What I ran
`npm run playtest` (maxWorkers 2) at 80bc0e9 (H1 with F3 merged): 130 tests, 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- The diff outside `src/city/` is only `src/render3d/groundpin.test.ts` and the ticket file; no file the puzzle-play path uses moved, so a green replay is the expected result.
- The harness does not reach the city pipeline; its checks belong to the facades/buildings unit tests.
