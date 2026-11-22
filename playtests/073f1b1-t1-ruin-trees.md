ticket: 073f1b1-t1-ruin-trees
verdict: pass
regressions: 0

## What the ticket meant to change
In the ruin era only, T-1 stops judging a tree crown (spans, poles, lights, lamp-post places, drop ends); solid pieces and other eras are unchanged.

## What I ran
`npm run playtest -- --maxWorkers=1` at 3296013: 130 tests (every map), 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
Files changed are only src/city/pipeline/readable.ts and its test (vs goal/city-transformations), within the ticket. The harness replays circuit maps and does not reach city-pipeline ruin output, so the era-scoping of the exemption (clean/tech/hold-out trees and solid pieces still judged) rests on the unit tests in src/city/pipeline/.
