ticket: 074a-asset-catalogue
verdict: pass
regressions: 0

## What the ticket meant to change
Section A adds a pure asset catalogue (packs, pieces, uses, notes, page query) that changes nothing Josh can see.

## What I ran
`npm run playtest -- --maxWorkers=1` at 05b2168: 130 tests, 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
The branch commit touches only `src/render3d/assetcatalogue.ts` and its test, which is within the ticket's Files. `git diff --stat main...branch` shows 619 files because the branch is based on goal/city-transformations, not main. Nothing in the catalogue is reachable from a replay.
