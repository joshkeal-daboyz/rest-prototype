ticket: 055b-tile-lots
verdict: pass
regressions: 0

## What the ticket meant to change
Terrace and open-lot fill on the tile city, the extracted `terraceBlockRows`, and the optional `frame` on `TerraceRun` (criteria 9 to 12), with the ladder maps unchanged.

## What I ran
`npm run playtest` at 7e291ff (round 2; branch head, detached in the gate worktree): 130 checks across every ladder map's trace, 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing (B adds no control, fault or cue a replay can reach; the harness covers circuit play, and `town.ts`/`furniture.ts`/`dressing.ts` do not feed it)

## Noticed
- The playtest harness does not render terraces or furniture, so the ladder-town guarantee of criteria 9 and 12 rests on `townpin.test.ts` and the frame-absent deep-equal tests (unit tests, not mine; not re-run).
- The criterion 10 far-gap share (about 14% vs 85%) and R6/R7 are tile-city checks outside the harness; I did not judge them.
- The worktree had an unrelated modified `src/audio/__snapshots__/notSoftened.test.ts.snap` and an untracked `gate-out.txt`; neither is on the branch.
