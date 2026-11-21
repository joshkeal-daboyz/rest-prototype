ticket: 070h1b-facades-shopfronts
verdict: pass
regressions: 0

## What the ticket meant to change
The pipeline's `facades` stage gains shopfront dressing (glass, awnings, signs, ATMs) as pure data; nothing changes in 3D and no puzzle map is touched.

## What I ran
`npm run playtest` (maxWorkers=2) at 3f1a260: 130 harness tests, 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- The diff is confined to `src/city/facades/` and one new test, `src/render3d/shopfrontpin.test.ts`; no puzzle, grid, night or play code moved. The map harness cannot reach the city stage, so a green run here says only that the puzzle maps are unchanged. The dressing's own rules (LG, X1, T1, R4 to R6 on the 20 runs) belong to the folder's unit tests and the reviewer.
