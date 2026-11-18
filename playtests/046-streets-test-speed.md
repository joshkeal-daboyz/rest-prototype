ticket: 046-streets-test-speed
verdict: pass
regressions: 0

## What the ticket meant to change
Make `src/render3d/streets.test.ts` run faster; no play behaviour.

## What I ran
No replay, by instruction. `git diff --stat main...ticket/046-streets-test-speed` at 875881c: one file changed, `src/render3d/streets.test.ts` (1 insertion, 3 deletions).

## Intended differences, snapshots updated
none

## Regressions
none. A test file cannot change how any map plays, so the replay was skipped.

## Added to the harness
nothing

## Noticed
Nothing.
