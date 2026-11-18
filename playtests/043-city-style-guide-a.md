ticket: 043-city-style-guide-a
verdict: pass
regressions: 0

## What the ticket meant to change
Section A adds `docs/city-style-guide.md` and a test pinning its numbers, packs and fronts, and puts `export` on existing constants in `src/render3d/scene.ts`. Play behaviour is not meant to change.

## What I ran
Stopped early, per the brief. I did not run `npm run playtest` at 9504aa0. The diff is `docs/city-style-guide.md`, `src/render3d/scene.ts` (only the `export` keyword added to 18 constants) and the new `src/render3d/styleguide.test.ts`. Nothing in `tests/playtest/` references render3d, and the only file in `src/` outside `src/render3d/` that imports it is `src/main.ts`, which the harness does not load. The harness path is `loadPuzzle -> createGrid -> createMapPlay`, so it cannot see this change.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- The diff stays inside the ticket's Section A file list (`placeholders.ts` is not touched, which is allowed).
