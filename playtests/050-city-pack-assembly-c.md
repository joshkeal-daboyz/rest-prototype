ticket: 050-city-pack-assembly-c
verdict: pass
regressions: 0

## What the ticket meant to change
Section C places the assembled stacks (models.ts plan and chain, models3d.ts placements, docs) in the 3D view only; nothing in play, the grid, the Relight plan or the audio cues.

## What I ran
Nothing: `npm run playtest` not run at 59a1044 (branch ticket/050-city-pack-assembly-c). Stopped early on the reasoning below.
- `git diff --stat main...HEAD` touches only `src/render3d/`, `docs/`, `tickets/`, `reviews/`, `playtests/`. No file under `src/` outside `src/render3d/`; `town.ts` is untouched.
- The harness (`tests/playtest/`) imports only `src/core`, `src/grid`, `src/play`, `src/render` (the fake renderer's types) and `src/audio/cues`. None of these imports `src/render3d/`; the only mention is a comment in `src/core/calibration.ts` (the diff does not touch that file).
- So grid, play, Relight plan and cues cannot differ from `main`, and the snapshots would be identical.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- The branch is stacked on sections A and B, so the diff against `main` also carries `gallery.ts`, `renderer.ts`, `streetcam.ts` and their tests. The ticket's Files list says `renderer.ts` must not be touched (it was changed by the earlier sections; not mine to judge, the reviewer has it).
- Section C's rendering checks (which lot gets a stack, front tables, placements) belong in the `src/render3d/` unit tests, not the harness.
