ticket: 084-a1-names-core
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section A1 of ticket 084: a pure `buildingNames(target, priority, lampIds)` and `buildingName(n)` in `src/core/words.ts` that give each file lamp its generic name, numbered as *How a building is numbered* says. `validateCityPuzzle` also has to check a city puzzle's optional `guide` against `GuideStep`, with one `guide step N: ...` message per problem. Two test cases are added.

## Does the branch do it?
Against `origin/main`, the branch has the architect's cut commit (c07d5c4: the ticket, `src/core/onboarding.ts`, the `guide` field on `CityPuzzle`, the `index.ts` export, two rows of `rules-coverage.md`) plus the builder's commit 0bb2ca7. The builder's commit touches only the four files A1 lists: `words.ts`, `load.ts`, `words.test.ts`, `load.test.ts`.

1. **`buildingNames` / `buildingName`: met.** `src/core/words.ts` still has no imports. `buildingNames` numbers in three passes: the targets (or every lamp when `target` is absent or empty), then the priority lamps, then every lamp in file order. Each pass skips ids that are not in `lampIds` or already have a number, so the numbers have no gaps. Lamps not passed in (the hidden scenery lamps) get no name. `placeName` is untouched. Test: `words.test.ts` "numbers targets in target order, then priority, then the rest in file order; a stray id gets none; no target means every lamp". Its fixture is exactly the one the criterion asks for. The targets `["c", "ghost", "a"]` are out of node order and include a stray id. The priority lamp is `d` and the other lamp is `b`. It asserts the whole map, in order (c 1, a 2, d 3, b 4, no `ghost`). With an empty target it asserts every lamp in node order, keys and values. A wrong order, a gap after the stray id, or an extra entry would each fail it.
2. **`guide` check: met.** In `src/core/load.ts`, `checkGuide` runs only when `guide` is present. A schematic (`city` false) gets "guide is only for a city puzzle", so `validatePuzzle` does not take one. The checks are:
   - the list has 1 to 12 steps;
   - each step has exactly the keys `at`, `text`, `until`;
   - `at` is null, a node id (`nodeById`) or a line id (`lineIds`);
   - `text` passes `isStr`, which requires a non-empty string, and is at most `GUIDE_TEXT_MAX` characters;
   - `until` has exactly one of the five keys;
   - `next` and `complete` must be `true`;
   - `throw` must be a breaker with `timer === undefined`, or a switch;
   - `repair` must be the `at` of a file fault (`faultAt`, the same set the fault checks build), or a fuse box with a `rating`;
   - `lit` must be a lamp.
   
   Messages are prefixed `guide step N:` and go into the file's error list. Test: `load.test.ts` "guide (084 A1): ...". The valid two-step guide on the existing `good()` fixture gives `[]`. Steps 3 to 5 add an unknown `at`, a two-key `until` and a `throw` on the lamp `house`. The test asserts exactly those three messages with `toEqual`, so a missing, extra or wrongly numbered message fails it.

I ran `npx vitest run --maxWorkers=2 src/core/words.test.ts src/core/load.test.ts`: 2 files and 138 tests passed. The test count is 2 `it(` added against `origin/main` (the third `it(` match in the diff is ticket prose), as the ticket says.

## Rule conflicts and risks
- None found. `src/grid/` and `src/night/` are not touched. The change has no new dependency and changes no GDD Decided rule. `load.ts` importing the `GUIDE_TEXT_MAX` constant from `./onboarding` stays inside `src/core/`, and `onboarding.ts` has no imports.
- The PR also carries the architect's cut (ticket file, `onboarding.ts`, `CityPuzzle.guide`), because `ticket/084-first-play` has not merged on its own. That is the cut, not scope the builder added. It is worth knowing when the merge commit is written.

## Must fix
none

## Could improve
1. `src/core/load.ts`, `checkGuide`: a step that is missing a key (for example no `at`) gets two messages, "must have exactly the keys ..." and `at "undefined" is not ...`. The same goes for a missing `text`. The criterion says each problem is one message. The tested cases are right, and an author still gets told, but checking the per-key fields only when they are present would keep it to one message.
2. `buildingNames`: a non-empty `target` made only of stray ids (`["ghost"]`) falls through to file order, so lamp 1 is no target. That follows the ticket's rule as written ("absent or empty"). A2 and B should know this case exists; a validated city file can't reach it, because `target` ids are checked.
