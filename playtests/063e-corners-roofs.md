ticket: 063e-corners-roofs
verdict: pass
regressions: 0

## What the ticket meant to change
E1 and E2: corner pieces turn their open side onto the cross street, and a column's storeys, trims and roof share one body footprint, in the 3D tile city only (the ladder's packTown digests were deliberately re-taken).

## What I ran
`npm run playtest` at 9987f89 (round 2, gate worktree): 64 ladder maps replayed to the Relight (130 tests), 130 passed, 0 differed from the snapshots. `tests/playtest/` and `puzzles/` are untouched by the branch. Round-2 delta from the round-1 commit 99efe18 is `src/render3d/stacks.ts`, `tilecity3d.ts`, their tests, `packpin.test.ts` and `docs/city-style-guide.md`; none of it can reach play.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
`src/render3d/` imports none of `src/grid`, `src/night`, `src/play` or the 2D renderer, and the replay never loads it. A green playtest shows the other layers behave as on main, not that the 3D change is right. That is for the pin tests and Josh's screenshots (criteria 27 and 37).
The gate worktree shows `src/audio/__snapshots__/notSoftened.test.ts.snap` modified. It is not part of the branch commit. Someone should look at why a test run rewrote it.

## Round 1 note
Round 1 (at 99efe18): pass, 0 regressions, 130 of 130 passed. Round 2 gives the same result.
