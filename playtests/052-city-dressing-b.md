ticket: 052-city-dressing-b
verdict: pass
regressions: 0

## What the ticket meant to change
Section B: load dressing keys into an optional `ModelSet.dress` slot and draw them instanced in the 3D scene, with pick targets and the scene unchanged when there is no `city-pack`.

## What I ran
`npm run playtest` not run, deliberately. At branch revision HEAD (ticket/052-city-dressing-b) `git diff main...HEAD` over `src/core src/render src/grid src/night src/play src/ui src/main.ts tests puzzles tools package.json public index.html` is empty. The harness (`tests/playtest`) imports only `src/audio/cues`, `src/core`, `src/grid`, `src/play` and `src/render`; none of those import `src/render3d`. The only importer of `src/render3d` outside its folder is `src/main.ts`, by dynamic import, and the harness does not load it. Nothing the harness replays (grid, play, Relight plan, audio cues) can have changed: 0 maps differed by construction.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- The branch diff against main also carries earlier sections' reports, reviews, tickets and docs (050, 051, 052 A), all outside code the harness loads.
- The 3D-only checks (ray test with and without dressing, draw-call cap, no emissive dressing) are criteria 5 to 7 and belong in `src/render3d/` unit tests, not the harness.
