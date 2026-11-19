ticket: 055f-door-sills
verdict: pass
regressions: 0

## What the ticket meant to change
Section F measures each building's door sill and, in the 3D view only, sinks the building (or stands steps at a house door) so the sill meets the walk, on the tile city and the ladder maps; the replay should not move.

## What I ran
`npm run playtest` at d4f10f7 (detached, D:\rest-prototype-gate): 130 checks across the ladder maps, 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing (F adds no control, fault or cue a replay can reach; its commit touches only src/render3d/{sills,models3d,sills.test,dressdraw.test,styleguide.test}.ts and docs/city-style-guide.md, nothing in grid, night, puzzles or the play layer)

## Noticed
- The harness has no 3D layer, so the sink and steps are not covered here; sills.test.ts and dressdraw.test.ts own that.
- The working tree had an uncommitted change to src/audio/__snapshots__/notSoftened.test.ts.snap and an untracked gate-out.txt in the gate worktree; not from F's commit, not touched by me.
