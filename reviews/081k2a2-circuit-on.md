ticket: 081k2a2-circuit-on
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
Section K2a2 of ticket 081: switch stage 6 (circuit) on in `BUILT_STAGES` and the shared profiles. Then rewrite only the tests that said "circuit is not built" or assumed no circuit (stage lists, the unbuilt-stage throw, the era passes' pins and stale baselines), at most 15 cases, with no non-test file changed in the six owners' folders.

## Does the branch do it?
Reviewed `git diff origin/main...ticket/081k2a2-circuit-on` (9 files, 26 lines in, 26 out). I ran the 7 changed test files with `--maxWorkers=2`: 7 files and 108 tests passed in 45 s, in the default (one-city) mode.

1. **`BUILT_STAGES`**: `src/city/stages.ts` adds `circuitStage` between buildings and facades, plus its import. Met. The stage-list assertions in the facades, ground and traffic tests hold it.
2. **`PROFILE_STAGES`**: `src/city/testing/namedcities.ts` adds "circuit" after "buildings" in `facades`, `ground` and `clean` only. `namedcities.test`, `eraview.test` and the tech, hold-out and ruin `named.test` files are not in the diff, so they are unedited. Met.
3. **The circuit-not-built tests** are rewritten. Each case kept its other assertions:
   - `facades/stage.test.ts`: 2 cases (the stage list and digest keys; the unbuilt-stage throw now asks for "assemble");
   - `ground/stage.test.ts`: 2 cases (the list and throw case, and the test-double list). The R-7 digest-key line is in a third case. It is a list edit inside a case, which the ticket's count allows for;
   - `traffic/stage.test.ts`: the same as ground;
   - `pipeline/run.test.ts`: 1 case, which still asserts `CityRunError`.

   Nothing else in those files moved. Met.
4. **Later digest pins.** None moved. The ground digest pins (seeds 1, 2, 3, 8) passed unedited. Met.
5. **The era passes see the circuit.**
   - The hold-out `PIN_PARTS` settle pin moved from `f4f14a15` to `1d4f5972`; power is unchanged. The ruin `PIN_GROWTH` moved from `578cd93e` to `24c55727`. The old and new values are visible in the diff, and the test output confirms `settle 1d4f5972`.
   - In `holdout/stage.test.ts`, both T-2 fixture cases now build their free run with `{ circuit: EMPTY_CIRCUIT }`. The second case builds it fresh, where it used to reuse `full`. Every assertion keeps its value and strength, including the `held ⊂ free` subset loop. Met.
   - The `ruin/named.test.ts` under-span case now asserts 19. It drops the old check that there were no `leftOutT2:` or `skippedCircuit:` stats. That check stated "no circuit", so with a real circuit, dropping it is the stale assumption going, not a loosening. **But the new assertion loops over every run in `runs` and expects 19 on each, while its name and the ticket say "on 6 x 6 seed 1".** `runs` is built from `NAMED`, which is `ALL_NAMED` (20 cities) when `REST_CITIES=all` (`src/city/testing/namedcities.ts:29-31`). The old value (0) held on every city. 19 is seed 1's count, so the release run will likely go red on other cities. This may occur, not checked: I did not run the 20 cities. See Must fix 1.
   - No T-1 or T-2 assertion failed against the real poles. The stop rule did not trigger.
6. **`?city=plan&stage=6`**: browser, for Josh.

**Count.** Cases added or rewritten against main: facades 2, ground 3, traffic 3, run 1, hold-out named 1 (the pin constant its one pin case reads), hold-out stage 2, ruin named 2. That is 15, at the cap, and none were added. Ground and traffic each count 3 because the R-7 digest-key line is in its own case.

## Rule conflicts and risks
- `src/grid/` and `src/night/` are not touched. There is no new dependency.
- The only non-test files changed are `stages.ts` (one entry plus its import) and `namedcities.ts` (`PROFILE_STAGES` only), both listed. `holdout/stage.ts`, `ruin/stage.ts` and `ruin/walk.ts` are unedited.
- The ruin under-span assertion is tied to one city's count but runs on every named city (above).
- `"assemble" as never` in four tests casts past the `until` type. It works, because the runner throws at runtime, but the type no longer states that assemble is unbuilt.

## Must fix
1. `src/city/ruin/named.test.ts`, "the real circuit on the named runs: the under-span set is 19 on 6 x 6 seed 1". Assert 19 only on the default city's run, for example `runs.find((r) => r.city.seed === DEFAULT.seed && r.city.way === DEFAULT.way)`, or the `pinned` entry's stats. Leave the other cities unasserted, or give them a rule that holds on any city. Expected effect: the case states what its name says, and it does not go red when `gate:full` runs the 20 cities on a release.

## Could improve
1. The commit message for 5fa429a lists nothing. Criterion 5 asks for the re-taken pins with their old and new values. Put the two pairs (settle `f4f14a15` to `1d4f5972`; growth `578cd93e` to `24c55727`) in the commit message or the PR body, so the merge records them.
2. The ruin case could also assert `skippedCircuit:*` > 0 on seed 1. It would replace the removed "nothing left out" line with a positive check that the pass now keeps clear of real poles, and it is not a new case.
3. The hold-out `PIN_PARTS` doc comment still ends "K2 re-takes them". It could say K2a2 re-took them on 23 Nov. The same goes for the ruin `PIN_GROWTH` comment.
