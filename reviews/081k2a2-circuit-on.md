ticket: 081k2a2-circuit-on
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section K2a2 of ticket 081: switch stage 6 (circuit) on in `BUILT_STAGES` and the shared profiles. Then rewrite only the tests that said "circuit is not built" or assumed no circuit (stage lists, the unbuilt-stage throw, the era passes' pins and stale baselines), at most 15 cases, with no non-test file changed in the six owners' folders.

## Does the branch do it?
This is round 2. Round 1 was assessed partly, with 1 must-fix. Since then the branch has one new commit, 403b29d, which touches `src/city/ruin/named.test.ts` and `src/city/holdout/named.test.ts`, comment and assertion lines only. I re-ran those two files with `--maxWorkers=2`: 2 files, 22 tests passed in 31 s, and the output shows `seed 1: growth 24c55727`. The other five changed test files are unchanged since round 1, when they passed.

1. **`BUILT_STAGES`** (`src/city/stages.ts`): circuit sits between buildings and facades. Met, unchanged since round 1.
2. **`PROFILE_STAGES`** (`src/city/testing/namedcities.ts`): circuit is added to `facades`, `ground` and `clean` only. Met, unchanged.
3. **The circuit-not-built tests** in facades, ground, traffic and `pipeline/run.test.ts` are rewritten and keep their other assertions. Met, unchanged.
4. **Later digest pins** did not move. Met.
5. **The era passes see the circuit.**
   - The pins are re-taken: hold-out settle `f4f14a15` to `1d4f5972`, ruin growth `578cd93e` to `24c55727`. Both pairs are now in the doc comments and in the 403b29d commit message.
   - The hold-out T-2 fixture cases build their free run with `EMPTY_CIRCUIT`, and every assertion keeps its strength.
   - **Round 1's must-fix is fixed.** The ruin under-span case now finds the default city's run (`runs.find((x) => x.city.seed === DEFAULT.seed && x.city.way === DEFAULT.way)`, `ruin/named.test.ts:149`) and asserts 19 on that run only. `DEFAULT` is the `NAMED` entry in `npm test`, and it is one of `ALL_NAMED` in a full run, so the lookup finds a run in both modes. The case now states what its name says, and it will not go red on the other 19 cities on a release.
6. **`?city=plan&stage=6`**: browser, for Josh.

**Count.** No case was added in round 2. The fix edits the body of a case already counted, so the total stays at 15, within the cap.

## Rule conflicts and risks
- `src/grid/` and `src/night/` are not touched. There is no new dependency.
- The only non-test files changed are `stages.ts` and `namedcities.ts`, both listed.
- `"assemble" as never` in four tests is still a cast past the `until` type. It is harmless at runtime (see could-improve 1).

## Must fix
none

## Could improve
1. The four `"assemble" as never` casts could name the unbuilt stage through a typed constant, so the type says why it throws. This is optional.
2. The ruin case could also assert `skippedCircuit:*` > 0 on seed 1, as a positive check that the pass keeps clear of real poles. Not done. It is still optional.
