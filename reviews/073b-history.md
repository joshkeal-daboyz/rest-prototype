ticket: 073b-history
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section B of ticket 073: a pure stage 10, `history`, in `src/city/history/`. It cuts every named city into districts of 1 to 4 touching blocks by the district rule and gives each a `tech`, `held` and `wild` story by the story rule. It draws an R-5 picture, holds R-1 to R-7, X-1 and X-7, and registers `historyStage` with one line in `src/city/stages.ts` behind C1's era runner.

## Does the branch do it?
This is round 2. Round 1 had one must-fix (criterion 5). The branch has since merged C1 (`goal/city-transformations` at 5a0ad0f) and added commit 6af6342. I reviewed the diff against `goal/city-transformations`. I ran `npx vitest run --maxWorkers=1 src/city/history/ src/city/pipeline/`: 11 files, 140 tests, all pass. I did not run typecheck or the whole suite, because of the load note. The main session's gate ran both on this commit. Its one failure, `powerkit.test.ts` fitLine, is also on the base and outside this section.

1. **Districts on the 20 named runs: met.** Unchanged from round 1. `stage.test.ts` "criterion 1" checks this with `historyFailures` and with an independent check. The tests now call `runHistory`.
2. **District rule and story rule: met.** Unchanged. The hand-worked 3 x 3 fixture and the independent checks on the named runs are still in place.
3. **Picture (R-5): met.** Unchanged. `historyPicture(plan, layer)` is still the drawing function. `historyStage.picture(eraPlan)` now reads `plan.layers.history` and fails with a `CityStageError` if the layer is missing.
4. **R-1 to R-7: met.**
   - The R-7 Proxy test now drives `runHistory`. `historyStage.run` is `(plan) => runHistory(plan.plan)`, so the test still covers what the era runner calls.
   - The source scan now also allows `layers.history`. Only the picture reads that layer.
   - The new import `../pipeline/eras` is a pipeline import, not a stage folder, so it is within AC4.
5. **`historyStage` registered: met (round 1 must-fix 1, done).**
   - `historyStage` is now typed `CityEraStageDef<"history">`, with `run(plan: CityEraPlan)` and `picture(plan: CityEraPlan)`, which is the shape C1's runner takes.
   - `src/city/stages.ts` has one import and one entry: `ERA_STAGES = [historyStage as CityEraStageDef]`.
   - X-7 still holds:
     - `ERA_STAGES` is not in `BUILT_STAGES`;
     - the new test "X-7: era "clean" runs no era stage" checks that a clean era run writes no era layer;
     - C1's `eras.test.ts` still checks that no clean stage carries an era name.
   - The new "criterion 5" test runs `runCityEra(..., "tech")` on 6 x 6 seed 1. It checks:
     - the history layer is written and frozen;
     - its digest equals the R-4 pin for seed 1 (`11f95e7f`), so the era run and the direct run agree;
     - the picture's legend has one entry per district plus "nothing";
     - the clean plan gains no `history` key.
6. **The numbers, reported: met.** My run printed the same numbers as round 1: sizes 101 / 104 / 75 / 55, `tech` median 0.62, r = −0.97, 0.37 ms a city.
7. **Phone screenshot: can't tell, and not this branch's to give.** As in round 1, `src/render3d/planview.ts` is outside B's files, so `?city=plan&stage=history` does not draw yet. This is for the main session or C2.

## Rule conflicts and risks
- No hard-rule break found:
  - `src/grid/` and `src/night/` are untouched.
  - No new dependency.
  - No GDD Decided rule touched.
- `src/city/pipeline/eras.test.ts` (C1's file, not in B's file list) has a one-line change. `expect(ERA_STAGES).toEqual([])` became `expect(ERA_STAGES.map((s) => s.name)).toEqual(["history"])`. Registering history, which the ticket asks for, makes the old assertion false, so the change is forced and the smallest one possible. I accept it. The main session may want to note it when C1's owner next touches that file.
- `[historyStage as CityEraStageDef]`: the cast widens `CityEraStageDef<"history">` to the default union. It is harmless, but a cast on a registry line can hide a real shape mismatch later (see Could improve 1).
- Round 1's notes still stand: `testcities.ts` imports other stage folders (070's convention), and the X-1 double is thin.

## Must fix
none

## Could improve
1. Try `ERA_STAGES: readonly CityEraStageDef[] = [historyStage]` without the `as` cast. If it typechecks (method parameters are bivariant, so it likely does), the registry line then shows a real shape error when a pass is added wrong.
2. Make the X-1 test double a real one now that C1's runner exists. Register a double `history` stage through `runEraStages` and check that the clean plan's digests stay equal. The current one only digests an empty layer.
3. Round 1's could-improve items 2 and 3 are still open and still optional: compare ids numerically on the growth tie-break, and add a note on the `makePicture("streets", ...)` re-stamp.
