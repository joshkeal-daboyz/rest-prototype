ticket: 058-fire-escapes
verdict: pass
regressions: 0

## What the ticket meant to change
Fire escapes in the 3D view get one platform per storey at the window sills, continuous flights, and a drop ladder to the walk (criterion 7 says `npm run playtest` has no snapshot change).

## What I ran
`npm run playtest` at 7502885 (round 2, detached worktree D:\rest-prototype-gate): every map on the ladder, 130 tests, 130 passed, 0 differed. The fix since round 1 (96658f2..7502885) touches only escapes.ts, escapes.test.ts, dressing.test.ts and the style guide: all in `src/render3d/` or docs, none feeding the play layers.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing. The ticket adds no control, fault or cue a replay can reach: the commit touches only `src/render3d/` (escapes.ts, dressing.ts, models3d.ts and their tests), the style guide and its drift test. All of those are in the ticket's Files, and none feeds `loadPuzzle`, `createGrid` or `createMapPlay`.

## Noticed
- The worktree has an uncommitted `src/audio/__snapshots__/notSoftened.test.ts.snap` and an untracked `gate-out.txt`. Neither is in the commit; the gate run probably left them. Don't let them into the merge.
- `git diff --stat main...HEAD` is 123 files because `main` is behind `goal/city-style`. I judged the ticket's own diff (HEAD~1..HEAD): 8 files, all within Files.
- Criteria 3, 4, 5 and 7's "other pieces deep-equal" are unit-test territory (escapes.test.ts, dressing.test.ts). Criterion 9 (screenshots) is the main session's.
