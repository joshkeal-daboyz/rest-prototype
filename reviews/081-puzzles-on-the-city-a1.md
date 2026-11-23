ticket: 081-puzzles-on-the-city-a1
assessment: partly
must-fix: 2

## What the ticket asked for, as I understood it
Section A1 carries out 070 L2d: delete the old tile city (generator, scene, `frontage.ts`, `parkmetrics.ts`, the old kerb line, `oldTilesRequested`, the `tiles-old` route) and its tests. Keep `city=tiles` (the pipeline) and `city=tiles&sheet=1` (the sheet) as they are. Take the old path out of the split guide (`docs/city-style/`) and the grammar, and leave `decisions.md` alone.

## Does the branch do it?
I reviewed against `origin/main` (3025b82). Local `main` is behind it. The A1 work is 8aed112 plus the merge 62e8751. The ticket file and the `src/core/` types in the diff come from the cut branch.

- **L2d 1 (deleted).** Met.
  - `frontage.ts` and `parkmetrics.ts` are deleted.
  - `tilecity.ts` keeps only the types and constants (its exports list starts at line 42). `tileCity`, `planBlocks`, `withPassages`, `tileKeepouts` and `bayMeters` are gone.
  - `tilecity3d.ts` has lost `buildCityScene` and the city branch. `createCityRenderer3d` now serves only the sheet.
  - `kerbline.ts` keeps only its types.
  - In `tileslots.ts`, `oldTilesRequested`, `inletCells`, `interiorItems`, `alleyMouths`, `gatePlan` and `passageFloors` are gone. `cityTilesRequested` now answers only for `sheet=1`.
  - `renderer.ts` has lost the `tiles-old` route and the `?? oldTilesRequested` call.
- **L2d 2 (kept).** Met.
  - `tsc --noEmit` passes, so every name `plan3d.ts` reads is still there.
  - `terrace.ts`, `plan3d.ts`, `models3d.ts` and the rest of the must-not list are not in the diff.
  - The sheet is kept: `buildSheetScene` is still imported and tested in `tilecity3d.test.ts`.
  - `PASSAGE_FLOOR_DEPTH_M` moved inside `tilecity.ts` with the same value.
- **A1 2 / L2d 3 (the grep).** Met by `tileslots.test.ts` "the old tile city is gone (ticket 081 A1)". The case scans `src/` for the old names and modules. Its positive fixture string shows the check is not vacuous. It allows for the pipeline's own `planBlocks`.
- **A1 3 / L2d 4 (the routes).** Met in two rewritten cases:
  - `tileslots.test.ts` "cityTilesRequested (ticket 081 A1: the routes)": the sheet parses as before, and `?city=tiles`, `?city=tiles-old` and `?city=tiles-old&sheet=1` are null.
  - `plan3d.test.ts` "is null for sheet=1, city=plan, city=tiles-old and no city" and "renderer.ts has no tiles-old route".
  - `city=tiles` itself is held by the unchanged "the bare city=tiles is the 6 x 6 seed 1 overhead view".
  - `planview.test.ts` still treats `tiles-old` as a HUD view. That is right now that it falls through to the ladder's view.
- **A1 4 (tests go with their code).** Met.
  - The seven listed files are deleted.
  - In `tilecity3d.test.ts`, the old-city and `applyModels` cases are gone. The rest now run `tileGroupOf` on the pipeline's 6 x 6 seed 1 cells.
  - `styleguide.test.ts` lost its parkmetrics and frontage drift checks.
  - The forced edits to `daytoggle`, `lightrig`, `stacks`, `kitpin` and `groundpin` tests are L2c kind (b) removals, or literals standing in for the deleted `frontage.ts` imports.
- **A1 1 / L2d 6 (the guide and the grammar).** Partly met.
  - Done: the 18.8 and 19.7 old-path tables, ranges and Info lines are gone from `evaluation.md`; the listed `tiles-old` pointers in `frontage-and-interiors.md`, `parking.md` and `evaluation.md` are gone; the `PARK_CHECK` and nine `frontage.ts` Numbers rows are gone; `decisions.md` is untouched.
  - Still to do: two `tiles-old` pointers, the pole-slot pointer to K1's note, and three lines that name the old 3 x 3 cities for a check (Must fix 1).
- **A1 5 (R-8 by the gate).** `townpin.test.ts` and `packpin.test.ts` are not in the diff.
  - Typecheck passed.
  - `vitest run --changed origin/main` ran 177 files: 3515 passed, 1 failed. The failure was a timeout in `stacks.test.ts:578` ("holds on eleven ladder maps' towns packed wall-aligned ...", over 5000 ms).
  - Run alone (`--maxWorkers=2`), that test passes in 2270 ms, and `stacks.test.ts` plus `tilecity3d.test.ts` pass 99 of 99. The branch only deleted a case from that file. I read the timeout as load from running 177 files at once, not a break; see Risks.
- **A1 6 (browser).** This is for Josh and the main session.

Test count against `origin/main`: 11 `it(` cases added or rewritten, within 15.

## Rule conflicts and risks
- `src/grid/` and `src/night/` are not touched. There is no new dependency and no GDD rule change.
- The branch edits five test files outside L2d's Files list: `daytoggle`, `groundpin`, `kitpin`, `lightrig` and `stacks` tests. Each edit is forced by a deleted import or a deleted function, and none is on the must-not list. Acceptable.
- The gate timeout in `stacks.test.ts` comes from a test this branch did not change, and it passes alone in 2.3 s. If the main session's gate run was green, it is noise. If it was red, the cause is the test's 5 s budget under load, not this branch.

## Must fix
1. **Finish criterion 6 in the split guide** (`docs/city-style/`). Each line below I looked at on the branch:
   - Two `tiles-old` pointers remain. `block-interiors.md:29` ([D-057m]) has "the old path (`city=tiles-old`) keeps 0.15 stalls per home". `interior-drawing.md:12` has "at `city=tiles-old` until L2". Rewrite both as the old path that went in 081 A1, as the branch did for [D-057s].
   - L2d 6 asks for two pointers to `docs/design/070-K1-circuit.md` as the rule's record, and neither is there. One is the pole-slot sentence of the 063 F Info line (`evaluation.md:202`). The other is the `POLE_SLOT_FROM_KERB_M` row (`numbers.md:255`), for example in the table's intro or a line beside the row, since the drift test reads the row.
   - Three check texts still name the old named cities (3 x 3 seeds 1 to 10) for tests that went with the old path:
     - `parking.md:31` ("A test compares them on the default city and seeds 1 to 10 at 3 x 3");
     - `evaluation.md:152` ("From 18.2: The test packs ... seeds 1 to 10 at 3 x 3");
     - `fire-escapes.md:28` (`escapes.test.ts` "on the default tile city, seeds 1 to 10 at 3 x 3"; since L2c that test reads ladder towns, per `escapes.test.ts:702`).

   For each, name the pipeline's check and city, or say that the old check went in 081 A1.

   With all three done, the guide describes only the pipeline, as the goal asks.
2. **One whole city in `tilecity3d.test.ts`** (test policy rule 2; the ticket names 6 x 6 seed 1 for whole-city checks). The rewritten case "turns every build-out's kerb edge ... on the fixture and on 6 x 6 seed 3" builds a second whole pipeline city (`fixtureOf(6, 3)`). The rule does not depend on how cities vary, and the ticket does not ask for one. Drop seed 3 and keep `city` (6 x 6 seed 1 plus the extra cells). This saves one city build per run.

## Could improve
1. Reword the `tileslots.ts` header and the `cityTilesRequested` doc comment, which still describe `blocks` and `seed` as "the tile city's". They now only size the sheet, which ignores the request (`_req`). The two fields could later be dropped with the sheet's parser, but not in this section.
2. `kerbline.ts` gained a new import line from `./tileslots`, and its header was rewritten. The Files list says "deletions only" for this file. This is harmless, but the report should say so.
