ticket: 073a3-pass-kinds
verdict: pass
regressions: 0

## What the ticket meant to change
Type-only: narrow the tech kinds, add the hold-out kinds and steps in `src/core/cityera.ts`; no play behaviour.

## What I ran
`npm run playtest -- --maxWorkers=1` at da29c9e: 130 tests (all maps), 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- Beyond the ticket's Files (`cityera.ts`), the branch diff since the last review also touches `src/city/pipeline/resolve.ts` (5 lines, C1's follow-up for criterion 3, I assume). Play-neutral; the reviewer should confirm.
- The branch carries the B merge (`src/city/history/`), which is outside A3 too; no puzzle or play code is touched.
