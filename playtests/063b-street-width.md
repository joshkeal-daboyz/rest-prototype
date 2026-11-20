ticket: 063b-street-width
verdict: pass
regressions: 0

## What the ticket meant to change
Section B (with B2): every street becomes the 5-cell profile with a 15 m carriageway (no avenues), and the parking allocator is re-cut so P1 holds again. This is the 3D tile city only; no criterion asks for any change to play behaviour.

## What I ran
`npm run playtest` at 6a565fe (detached gate worktree, no other vitest or playtest process running): 1 file, 130 tests, 130 passed, 0 differed. Every map's trace and Relight snapshot matches `main`.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- Diff from the branch's base (0a1df7c, the last goal/city-style merge) to 6a565fe is inside the ticket's area: `src/render3d/tilecity.ts`, `alleys.test.ts`, `parkmetrics.test.ts`, `tilecity.test.ts`, plus `docs/` and `tickets/`. Nothing in `src/core`, `src/grid`, `src/night`, `puzzles/` or `tests/playtest/`. So the green replay is what you would expect.
- The gate worktree shows `src/audio/__snapshots__/notSoftened.test.ts.snap` modified and an untracked `gate-out.txt`. I did not touch either. The modified snapshot is not part of the commit; worth a look from the main session.
