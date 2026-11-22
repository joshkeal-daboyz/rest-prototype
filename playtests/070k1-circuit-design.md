ticket: 070k1-circuit-design
verdict: pass
regressions: 0

## What the ticket meant to change
Add the off-ladder city map puzzles/city-two-ways-round.json (with its note) and leave the ladder as it was (criterion 7).

## What I ran
`npm run playtest` at 5e061dc: 65 ladder maps plus harness checks, 130 tests, 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing. The harness only plays NN-prefixed ladder maps (README: off-ladder files like lamp-row are not on it), so the new map's check block is not replayed here.

## Noticed
- The diff against goal/city-style touches no ladder puzzle file and no src/ file beyond two render3d tests (town.test.ts, townpin.test.ts), which are the reviewer's to judge.
- The new map's check block is covered only by the schema/analyzer path in the gate, not replayed.
