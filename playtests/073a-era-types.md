ticket: 073a-era-types
verdict: pass
regressions: 0

## What the ticket meant to change
Add era types in src/core/cityera.ts (exported from core/index.ts) with no circuit or play behaviour change.

## What I ran
`npm run playtest` (maxWorkers=2) at 252838b: 130 tests, 130 passed, 0 differed. Branch diff from its parent is cityera.ts, core/index.ts and the ticket file only; no play code touched.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
Nothing.
