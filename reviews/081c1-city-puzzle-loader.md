ticket: 081c1-city-puzzle-loader
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section C1 of ticket 081: a shape-only validator `validateCityPuzzle` and a throwing `loadCityPuzzle` in `src/core/load.ts` for `puzzles/city/<id>.city.json` files (city, district, places instead of `pos`, runs, fault spans, map scope, plus every `pos`-free check `validatePuzzle` already makes), `loadPuzzle` still refusing the city shape, and a "City puzzles (ticket 081)" section in `puzzles/SCHEMA.md`. Six tests.

## Does the branch do it?
The section's own work is commit 24de03e (`src/core/load.ts`, `src/core/load.test.ts`, `puzzles/SCHEMA.md`). The rest of `git diff main...HEAD` is the ticket cut (a2f819e, 59d2eb7, c83972f: the ticket file, `citycircuit.ts`, `cityplan.ts`, `index.ts`, the agent file, pointer lines), which this section's branch is cut from as the ticket says ("from this branch until it is on `main`"). I judged C1 against 24de03e.

1. **`validateCityPuzzle` returns every problem.** `validatePuzzle`'s body became `checkPuzzle(json, city)`, which collects every message, so both validators share it.
   - `city`: four fields checked, `blocksX`/`blocksZ` positive integers, `seed` non-negative integer, `oneWay` boolean. `district`: 1 to 4 strings, no repeats.
   - Node `place`: exactly one key, one of pole/building/post, naming a string. A `pos` is an error.
   - Line `run`: must be an object, `spans` a list of strings, `drop`/`lead` strings, at most one of them, `spans` empty only with a drop or lead.
   - Fault `span`: only on `damaged-cable`, and in its line's `runSpans`.
   - Scope must be `"map"`. The street-layer fields and `decor` are refused (`NOT_CITY`), which matches the `Omit` in `CityPuzzle`.
   - Every other check (ids, types, breakers, switches, batteries, feeds, degree, faults, targets) runs unchanged.
   - Tests: "a well-formed city puzzle validates" (the good file), then one case for each group: "city, district and scope", "nodes: a place of exactly one kind and no pos; the schematic checks still run" (which also asserts `breaker br: closed`), and "runs and fault spans". That is 4 cases, as asked. Each bad case asserts the specific message, so a broken check fails its test. **Met.**
2. **`loadCityPuzzle` throws with the messages.** "loadCityPuzzle throws with every message listed" asserts both the scope and the district messages in one throw, and that a good file loads. **Met.**
3. **`loadPuzzle` refuses the city shape.** "loadPuzzle still refuses the city shape" expects `node feed: pos must be [x, y]`. The schematic path is unchanged (`street = !city && …`; the `pos` check sits under `!city`). **Met.**
4. **SCHEMA.md section.** "City puzzles (ticket 081)" is added at the end, with nothing else in the file edited. It covers the example, the fields, the ids, CK13 as changed with Josh's words, the folder and the `.city.json` name. **Met.**

Tests: 6 new `it(` in the diff against main (all in `load.test.ts`), which is the ticket's number. They are on a hand-built fixture, not a city.

Gate: `tsc --noEmit` is clean. `npm run gate` (`--changed origin/main`) ran 186 files, because `origin/main` has moved on (080 B2c merged) and `src/core/index.ts` reaches nearly everything. It gave 11 failures, all I read being 5000 ms timeouts, for example `src/city/holdout/stage.test.ts` "the circuit guard (T-1)". I re-ran the same change set from the merge base (3823f0d) with `--maxWorkers=2`: 186 files and 3919 tests passed. I read the failures as load, not this branch.

## Rule conflicts and risks
- No `src/grid/` or `src/night/` change. No new dependency. No GDD Decided rule touched. Files are within C1's list (`load.ts`, `load.test.ts`, SCHEMA.md new section only). `citycircuit.ts` was listed but is not edited in 24de03e.
- The section validates `from` as a string, which the criteria didn't list. It is small, it matches the type and SCHEMA.md, and it is harmless.
- The gate reaches the whole suite for this ticket's branches, because the cut's `src/core/index.ts` re-export is in every diff against main. With uncapped workers that produces timeout failures (above). This is for the main session to run the gate at 2 workers or after rebasing on `origin/main`. It is not a code issue.
- `CityPuzzleNode` still allows type-specific fields (e.g. battery `input`). The shared checks cover them, so nothing is lost.

## Must fix
none

## Could improve
1. `src/core/load.ts`: a `damaged-cable` fault whose `span` is not a string gets the "is not in line X's run" message. A separate "span must be a span id" message would read more clearly. This is optional.
2. A city node with `place` but an unknown key and a string value (e.g. `{ "roof": "r1" }`) gets the generic "exactly one of" message. When B1 types roof places, `PLACE_KINDS` is the one line to extend. A comment there pointing at K2d would help the next builder.
