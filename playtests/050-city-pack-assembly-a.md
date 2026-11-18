ticket: 050-city-pack-assembly-a
verdict: pass
regressions: 0

## What the ticket meant to change
Section A adds pure recipe data and assembly for city-pack stacks in a new `src/render3d/stacks.ts`, with no change to play.

## What I ran
Nothing: the replay was not run (stopped early, by design). The diff against `main` is `src/render3d/stacks.ts`, `src/render3d/stacks.test.ts` and the ticket file only.

## Intended differences, snapshots updated
none

## Regressions
none. The harness loads `loadPuzzle`, `createGrid` and `createMapPlay`, plus the Relight plan and the audio cues. None of those reaches `src/render3d/`. `stacks.ts` is imported by no non-test file (grep over `src/`: only `stacks.test.ts`; `streets.test.ts` matches the word in a test title). It only imports from `core`, `render/city`, `render3d/models` and `render3d/town`, and edits none of them. No `puzzles/`, `src/grid/`, `src/play/`, `src/night/`, `src/core/` or `tests/` file changed, so the traces cannot move.

## Added to the harness
nothing

## Noticed
- The new module is dead code until section B or C wires it in. Rerun the playtest after C, which changes `models.ts` and `models3d.ts`. Those two still don't touch play behaviour.
