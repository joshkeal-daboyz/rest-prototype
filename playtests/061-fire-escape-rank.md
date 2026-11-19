ticket: 061-fire-escape-rank
verdict: pass
regressions: 0

## What the ticket meant to change
Which blocks of the 3D city get a fire escape (chosen by hash rank to a guaranteed R7 share instead of a coin toss); criterion 8 says the playtest snapshots must not change.

## What I ran
`npm run playtest` (vitest --maxWorkers=2) at 5ba3e68: 10 maps (130 tests), 130 passed, 0 differed. The diff against goal/city-style 0e11827 touches only the ticket's Files (9 files, all in src/render3d/ and docs/city-style-guide.md).

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing. The branch adds no control, fault or cue a replay can reach, and no puzzle changed.

## Noticed
- Nothing in src/render3d/ is imported by the playtest harness (it replays loadPuzzle, createGrid and createMapPlay), so no play behaviour could have changed. The green run confirms this.
- The escape-share target, no-neighbour rule and ladder-map R7 are unit-test territory (escapes.test.ts, tileintegrate.test.ts), not the harness.
