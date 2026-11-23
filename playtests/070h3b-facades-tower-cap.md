ticket: 070h3b-facades-tower-cap
verdict: pass
regressions: 0

## What the ticket meant to change
Cap water towers at one per 16 buildings on each street block (facades roofs only, with a bare-run roof-exit top-up), nothing else.

## What I ran
`npm run playtest -- --maxWorkers=2` at 4308d88: 64 maps (130 tests), 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing (the ticket adds no control, fault or cue a map replay can reach)

## Noticed
- The diff vs goal/city-style 65fa9d3 stays inside src/city/facades/ plus src/render3d/roofpin.test.ts; no files beyond the ticket's Files. None of it touches grid, night, puzzles or the map renderer, so the harness has nothing to see here; the tower cap, TC check and digest re-pin belong to the facades unit tests.
