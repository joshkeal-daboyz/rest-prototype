ticket: 073a4-ruin-kinds
verdict: pass
regressions: 0

## What the ticket meant to change
Type the ruin's growth kinds and steps and reword `CityEraPiece.cell`'s comment, in `src/core/cityera.ts` only; no play behaviour.

## What I ran
`npm run playtest -- --maxWorkers=1` at 0cc097c on `ticket/073a4-ruin-kinds`: 130 tests, 130 passed, 0 differed. Diff of the ticket's own commit: `src/core/cityera.ts` and the ticket file only, as the Files section says.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- `git diff --stat main...HEAD` is huge (539 files) because the branch is cut from `goal/city-transformations`, not `main`; the ticket's own commit is the two files above.
