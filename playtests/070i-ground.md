ticket: 070i-ground
verdict: pass
regressions: 0

## What the ticket meant to change
Add the pure stage 8 (ground dressing) to the city pipeline's built stages, with no change to any map's play.

## What I ran
`npm run playtest` (same two commands, vitest --maxWorkers=2) at 4ae2a41: 130 tests, 130 passed, 0 differed. No snapshot touched.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing (the ticket adds no control, fault or cue a replay can reach, and touches no puzzles/)

## Noticed
- Diff stat vs goal/city-style ff47cce: 30 files, all in the ticket's Files list (src/city/ground/ incl. extra modules geom.ts, props.ts, stats.ts, which the ticket lets the builder split inside the folder), stages.ts, the three named one-line test edits, and src/render3d/furnpin.test.ts. Nothing outside.
- The harness covers puzzle maps, not the city pipeline; stage 8's own behaviour is the unit tests' and the main session's screenshot (criterion 11).
