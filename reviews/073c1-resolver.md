ticket: 073c1-resolver
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section C1 of ticket 073. It asks for a pure `resolvePlan(plan, era)` that meets section A's contract, and an era runner `runCityEra` that leaves `runCity` as it is (X-7). It asks for T-1 and T-2 (`t1Failures`, `t2Failures`, `t1CleanClashes`) under the B-Q3 and B-Q5 readings, and for the pass helpers. This is round 2: I checked the one round-1 must-fix and the could-improve items the builder took up in a4702b7.

## Does the branch do it?
I ran `npx vitest run --maxWorkers=1 src/city/pipeline/` on a4702b7: 9 files, 122 tests, all pass (118 in round 1, plus 4 new). Following the load note, I did not run the typecheck or the whole suite. The main session's gate ran both; its one failure, `powerkit.test.ts` fitLine, is also on the base and is outside this section.

1. **resolvePlan meets A's contract.** No change since round 1. `resolve.ts` and `resolve.test.ts` cover each change kind on each list, a change by id, and all five failure kinds, each with the stage named. Met.
2. **clean is the plan itself on the 20 named runs.** `named.test.ts` still asserts `toBe(plan)` and `toEqual(plan)` on 6 x 6 seeds 1 to 10, one-way on and off. Met.
3. **The era runner.** Round-1 must-fix 1 is fixed. `runEraStages` in `eras.ts` now drops every stage whose index in `CITY_ERA_STAGES` is above the index of `CITY_ERA_LAST[era]`, and only then sorts. The old `break` on the stage name is gone, so a missing pass can no longer let the run overshoot. The new test in `eras.test.ts` ("the era's last stage bounds the run") runs `tech` with `[history, holdout]` and asserts that the only layer written is `history`. The `clean` era still returns before this code, so the `-1` index can't come up. The X-7 tests from round 1 are untouched. Met.
4. **T-1 and T-2.** No reading changed. The builder took up could-improve 1: in `readable.ts`, an era add with no `size` and no bounds now throws and names its id. A swapped piece with no bounds entry for its new key now throws and names its reference, where before it fell back to the old key's `size`. The `useBounds && kb === undefined` return in `place()` enforces this. `readable.test.ts` covers both, including a `bounds` that returns `undefined`. Clean pieces with no footprint are still skipped quietly. That is fine, because those pieces are never failed. Met.
5. **Pass helpers.** No change. `resolveBefore` and `assertEraReadable` are tested as in round 1. Met.
6. **No pipeline file imports a stage folder.** No new imports in the round-2 diff. Met.

The builder also took up could-improve 4: `named.test.ts` now collects `t1CleanClashes` per run and logs it rather than asserting `[]`, which matches "reported per run in the hand-back, not asserted". The `erafixtures.ts` `add` now returns `CityEraPiece<never>` with `kind: "thing" as never`. That is a typing change to the fixture only.

All the touched files are inside `src/city/pipeline/`.

## Rule conflicts and risks
- No hard-rule break, no GDD Decided rule changed, no new dependency, nothing in `src/grid/` or `src/night/`.
- The new throws in `readable.ts` are plain `Error`s. Called from inside a pass, the era runner will report them as "bug:", not as a `CityStageError`. That fits: a missing bounds table is a wiring bug, not a T-1 failure.

## Must fix
none

## Could improve
1. `named.test.ts`, "the clean clash report": `expect(clashes.every((n) => n >= 0))` is always true. It also depends on the earlier `it` blocks having run, so it logs an empty list when run alone with `-t`. Either drop the assertion and keep the log, or compute the counts inside that test.
2. Round-1 could-improve 2 (the drop-end check widens by 0.15 m, which B-Q3 does not say) and 3 (a turned tree's canopy radius is taken after the turn) are still open. Each can be fixed in one line, or covered by a doc comment saying it is intended.
3. Round-1 could-improve 5 (a test that guards criterion 6 by scanning imports) and 6 (`erafixtures.ts` has a source-file name) are still open.
