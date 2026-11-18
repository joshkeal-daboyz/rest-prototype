ticket: 051-terrace-rows-c
verdict: pass
regressions: 0

## What the ticket meant to change
Section C adds a terrace packer and lets the stack code take a lot's own frontage and cap; `townClears` is exposed from `town.ts`. Play, pools and picks are meant to stay untouched (criteria 19 and 20).

## What I ran
No `npm run playtest` (round 2, HEAD 2ce5648): the suite could not have changed, so I stopped early. `git diff --name-only main...HEAD` outside `src/render3d/` lists only docs, tickets, reviews, playtests and `tickets/usage.md`; no `src/core`, `src/grid`, `src/play`, `src/render`, `src/audio` or `tests/playtest` file is in the diff. The harness imports only those layers, and nothing in `tests/playtest/` imports `src/render3d`. Outside `src/render3d/` only `src/main.ts` (a lazy `import("./render3d")`, not reached by a headless replay) and a comment in `src/core/calibration.ts` mention it. So the grid, the play, the Relight plan and the audio cues are the same code as on main.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
Nothing.
