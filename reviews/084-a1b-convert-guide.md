ticket: 084-a1b-convert-guide
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
`convertCityPuzzle` should take `guide` and `tips` out of the city file before spreading the rest into the plain map, so a city puzzle with either converts, and the `Puzzle` that `src/grid/` runs never carries them. One added test in `convert.test.ts`. (Section text read from PR #137's copy of `tickets/084-first-play.md`.)

## Does the branch do it?
1. **Dropped in the conversion.** Met. `src/city/circuit/convert.ts:92-95` adds `guide: _guide` to the existing destructure and takes `tips` out in a second destructure through `kept as typeof kept & { tips?: unknown }`, because `CityPuzzle.tips` reaches main only with #137. The comment says why and says the cast does no harm once T lands. The test is `convert.test.ts`, "084 A1b: a city file with a guide and a tips box converts, and the plain map has neither key". It uses P0 (`puzzles/city/city-two-ways-round.city.json`, the file the suite already loads at line 25), adds a two-step guide (`next`, then `complete`) and a tips box in memory, converts it, and asserts that neither key is on `puzzle`. The test catches the real bug: `convertCityPuzzle` calls `validatePuzzle(out)` (line 101), which on main refuses a `guide` with CK15, so without the fix the call throws. Without the fix the `tips` assertion fails too, because `tips` would be spread through. I ran `npx vitest run --maxWorkers=2 src/city/circuit/convert.test.ts`: 16 passed, 2.6 s in an existing file.
2. **D1 unblocked.** The ticket marks this "no test". The main session checks it when it merges main into D1, so it is not judged here. The branch does not touch D1's branch.

Count: 1 added case, as the ticket says. Files: only `convert.ts` and `convert.test.ts`, both listed.

## Rule conflicts and risks
- No conflict with a hard rule. `src/grid/`, `src/night/` and `src/core/` are untouched, nothing new is imported, and no dependency is added.
- Once #137 merges, `kept`'s type already has `tips` and the intersection does nothing. Whoever merges second can leave it or fold `tips: _tips` into the first destructure.

## Must fix
none

## Could improve
1. After #137 merges, fold `tips: _tips` into the single destructure and drop the cast and its comment line. It is cosmetic.
