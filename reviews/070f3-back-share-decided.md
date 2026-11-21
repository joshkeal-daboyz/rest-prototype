ticket: 070f3-back-share-decided
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Record Josh's Q20 answer ("Yes to all, instancing later") by making `BACK_SAME_SHARE` 0.5 Decided in its comment and pinning it with a test, change nothing else, and (criterion 4) make buildings' R-4 test double replace the stage named `buildings` rather than drop the last built stage, so it holds once H1 appends `facadesStage`.

## Does the branch do it?
1. **Comment says Decided.** `src/city/buildings/constants.ts`: PROPOSED and "No test pins its value" are gone. The comment now reads DECIDED, with Josh, 20 Nov 2026, Q20, his words "Yes to all, instancing later", and a pointer to the test that pins it. It keeps grammar rule 4's wording and his 19 Nov "They can be either." Met.
2. **A test pins the value.** New `src/city/buildings/constants.test.ts`: "BACK_SAME_SHARE is Decided at 0.5 (Josh, 20 Nov 2026, Q20)" asserts `toBe(0.5)`. The decision is named in the test title. Met.
3. **Nothing else changes.** The diff against 962dccd touches only `constants.ts` (the comment), the new test file, and the one R-4 test in `stage.test.ts`. The value is unchanged and no digest pin is edited. On the branch, `npx tsc --noEmit` is clean, and `npx vitest run --maxWorkers=2` on `stage.test.ts` and `constants.test.ts` passes (2 files, 27 tests). As instructed, I did not run the rest of `src/city/buildings/`. The main session's gate on H1 with F3 merged in was green. Met.
4. **R-4 replaces by name.** `stage.test.ts`, "a test double for buildings leaves the digests ... (R-4)": `swap` maps each stage named `buildings` to the double, and `slice(0, -1)` is gone. The same five assertions run for `swap(BUILT_STAGES)` and for `swap([...BUILT_STAGES, standIn])`. `standIn` is named `facades`, which is a real `CityPlanStage` after buildings in `CITY_STAGES`, so it type-checks and sorts after buildings. It throws if it is run. Because `runStages` breaks at `until` = buildings, the stand-in never runs, and the run is still ok. The test is a real check. If the swap missed buildings, the buildings digest would equal the standard run's and the test would fail. If the run went past buildings, the stand-in's throw would make `d.ok` false. Met.

## Rule conflicts and risks
- None found. `src/city/buildings/` is not one of the pure folders `src/grid/` or `src/night/`, and nothing imports across folders that was not already imported. Every file is in the ticket's list. There is no new dependency. The branch records a decision Josh made in chat (Q20) and adds no rule.
- No GDD Decided rule is touched. Lamps, death, dawn and pause are not in this ticket.

## Must fix
none

## Could improve
1. The stand-in's throw message assumes the stage would see the double's empty layer. That holds for the swapped list, but it is a stand-in for any later stage. "stage after `until` ran" would describe what it guards more exactly. Cosmetic.
