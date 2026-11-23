ticket: 057a-frontage
verdict: pass
regressions: 0

## What the ticket meant to change
Section A: measured wall planes (facade.ts), an `align: "back" | "wall"` option on `assembleStack`/`packTown` used only by the tile city, and the G1 no-recess check (frontage.ts); every ladder stack stays as it was.

## What I ran
Round 2. `npm run playtest` at 2bfbebc (detached, D:\rest-prototype-gate): 64 maps, 64 passed, 0 differed (130 tests incl. the harness's own). Snapshots untouched. `git diff 7dc79de..2bfbebc --stat`: facade.ts, facade.test.ts, frontage.ts, frontage.test.ts, tilecity.ts (a comment), all in the ticket's Files.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing. No control, fault or cue was added that a replay reaches.

## Noticed
- The headless harness never loads render3d, so it cannot see the "ladder stacks unchanged" claim; that one belongs to the deep-equal unit tests on the protocol maps (criterion 2), not here. A green playtest says nothing about the round-1 fix to facade.ts and frontage.ts.
- The gate worktree has an unrelated modified `src/audio/__snapshots__/notSoftened.test.ts.snap` and an untracked `gate-out.txt` (gate run leftovers).
