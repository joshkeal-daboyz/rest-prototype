ticket: 070h1c-facades-novelty
verdict: pass
regressions: 0

## What the ticket meant to change
Facades (pure city pipeline) gain shop kinds and novelty signs (face and roof), with the facades digest re-pinned; nothing in the circuit game is meant to change.

## What I ran
`npm run playtest` (vitest, --maxWorkers=2) at 97fb0f8: 130 tests, 130 passed, 0 differed. Changed files are all under `src/city/facades/` plus `src/render3d/noveltypin.test.ts`; none touch the circuit maps, `puzzles/` or the game layers.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
The harness does not cover the city pipeline (shops, novelty, digests); those are the folder's unit tests and the gate's.
