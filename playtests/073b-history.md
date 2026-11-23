ticket: 073b-history
verdict: pass
regressions: 0

## What the ticket meant to change
Add a pure `src/city/history/` stage that cuts each city into districts with tech/held/wild stories, without touching any map's play.

## What I ran
`npm run playtest -- --maxWorkers=1` at 0e8f4f5: 130 tests (every map's replay), 130 passed, 0 differed. Diff against goal/city-transformations is only the 8 files in `src/city/history/`.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- Criterion 5 asks for `historyStage` in `src/city/stages.ts`; that file is not in the diff. The ticket says B may leave it to a separate era list if C1 isn't merged, so the builder or reviewer should confirm which.
- The harness doesn't reach `src/city/`, so this ticket's behaviour (districts, stories, digests) is covered only by its unit tests and the reviewer.
