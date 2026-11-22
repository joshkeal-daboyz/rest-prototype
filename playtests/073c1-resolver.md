ticket: 073c1-resolver
verdict: pass
regressions: 0

## What the ticket meant to change
Add a pure resolver, an era runner and the T-1/T-2 checks in `src/city/pipeline/` and `stages.ts` without changing how a clean run behaves (X-7).

## What I ran
`npm run playtest -- --maxWorkers=1` at a4702b7 (round 2): 130 tests, 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing (the circuit harness does not reach city planning).

## Noticed
- Round 2 changes only touch `src/city/pipeline/` eras, readable and fixtures plus their tests, so no circuit behaviour could move.
- `run.ts` and `seeds.ts` (one-line edits, not in the ticket's Files list as far as round 1 noted) are still for the reviewer to check against X-7; the harness cannot see city planning.
