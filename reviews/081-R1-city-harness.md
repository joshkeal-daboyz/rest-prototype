ticket: 081-R1-city-harness
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
R1 points the release playtest harness at the city puzzles only (X-Q1 "City puzzles only"). Each `puzzles/city/*.city.json` is loaded, converted on its own city, and played through `createGrid` and `createMapPlay` with a no-op renderer, using the note's check block as the script. Nothing is drawn, the 64 schematic snapshots are deleted, and no new snapshot is written on this branch (X-Q2 "Next release").

## Does the branch do it?
I reviewed R1's own commit (b9fac71). All 71 of its files are under `tests/playtest/`. The later merges of main and the goal branch change nothing in `tests/playtest/` after b9fac71 (`git diff b9fac71 HEAD -- tests/playtest` is empty).

1. **What it replays: met.**
   - `ladder.ts` `cityIds()` reads `puzzles/city/*.city.json`. `loadCityMap` calls `loadCityPuzzle`, then `convertCityPuzzle(city, cityPlanFor(city.city))`. `cityPlanFor` in `tools/fit.ts` memoises the plan per city key, which is the module cache. The file is imported and never edited.
   - The script is the note's check block (`parseCheckBlock`, then `validateCheck` against the converted puzzle). `solutions.ts` is deleted.
   - `replay.ts` runs `createGrid`, then `createMapPlay`, with `fakeRenderer()`, whose type is `MapRenderer` from `src/render3d/maprender`.
   - `playtest.test.ts` plays the solution, then each trap's moves followed by its recovery. It adds 2 `it(` cases (within the 8 allowed). The harness has its own config (`tests/playtest/vitest.config.ts`), and the root `vite.config.ts` collects only `src/**` and `tools/**`, so the harness is not in `npm test`.
2. **What a trace holds: met.** `stateLine` records lit lamps, feed loads, blown fuses, readable faults, parts, batteries, the prompt and cues. Lit lamps, blown fuses and readable faults are filtered by `hidden`. The Relight lamp list and the locked-input check also skip hidden ids. Win, actions and elapsed time are kept as before.
3. **No drawing: met.** `createMapRenderer` and the fake canvas are gone from `replay.ts` and `fakes.ts`. `cues.ts` imports `planRelight` from `src/render3d/relightplan`. A grep of `tests/playtest/*.ts` finds no import from `src/render`.
4. **Old snapshots: met.** The 64 `__snapshots__/*.trace.txt` files are deleted and the folder no longer exists. README lines 9 to 10 say why and quote Josh. `playtests/` is untouched, and no new snapshot is committed.
5. **Not run on this branch: met.**
   - `tsc --noEmit -p tests/playtest/tsconfig.json` passes.
   - I also ran the harness with `CI=true` and 2 workers, in about 5.6 s. The script check passed. The 17 replay cases (01 to 16 and city-two-ways-round) failed only with "Snapshot ... mismatched", which is expected because no snapshot exists yet. There were 17 errors in total, all snapshot errors, so no solution or trap stopped short and none failed to complete.
   - Afterwards `git status` was clean: nothing was written.

## Rule conflicts and risks
- No hard rule is broken: `src/`, `puzzles/` and `playtests/` are untouched, `tools/fit.ts` is only read, there is no new dependency, and no Decided rule changes.
- The harness now depends on `tools/fit.ts` (`cityPlanFor`) as well as `src/city/`. If the fit tool is reorganised, the harness breaks at typecheck, not silently. This is acceptable; I note it for X1c and later.
- Until the next release, `npm run playtest` fails on every replay case because there are no snapshots. This is intended (X-Q2), and the README says so.

## Must fix
none

## Could improve
1. `playtest.test.ts`: the check `IDS.length >= 17` will need no edit as P2b to P2d land, but a pilot that is deleted or renamed would trip it with a message about counts rather than names. Optional: drop the floor and rely on the per-puzzle `describe.each`.
