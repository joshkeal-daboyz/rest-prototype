ticket: 075-style-judge
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section A adds a style rubric (S1 to S10, verbatim), a read-only `style-judge` agent, its hook lines and a written protocol for an unattended judge-and-refine loop. Section B is the first run of that loop, on seed 1 in the ruin era, at most three rounds. The refiners change only which keys their pass picks, how many and where. Clean digests, clean checks, T-1/T-2 and kit pins stay unchanged, and no test is loosened.

## Does the branch do it?
This is round 2. I checked the two round-1 must-fix items against the commits since e6d8b87: 1bc5e22, 3aefd7c and b79c196. `git diff e6d8b87 HEAD` touches only:
- `src/city/ruin/kit.ts` and `src/city/ruin/kit.test.ts`
- `src/render3d/ruinpin.test.ts` and `src/render3d/holdoutpin.test.ts`
- `judgements/075-run.md`, the archived review and the playtest

All of these are in the ticket's file lists.

`npx tsc --noEmit` is clean. I ran six files with `--maxWorkers=2`: ruin kit, grow and named, ruinpin, holdoutpin and holdout kit. All 89 tests passed. There was one vitest worker RPC timeout (`onTaskUpdate`), which is load, not a failure, and the same as the main session's gate saw.

**Must-fix 1 (B3, kit pins): done.**
- **Ruin.** `src/city/ruin/kit.ts` puts the four `Tree_Birch_*` rows back in `KIT` and adds `UNPICKED_KEYS`. `SAPLING_KEYS` is the sapling list without them, so the pick lists Round trees only, in the same order as before.
- `src/render3d/ruinpin.test.ts` is back to `KIT_KEYS.size` 42, identical to `goal/city-transformations`. The Birch rows are back in the trunk pin in `src/city/ruin/kit.test.ts`, with their original values.
- `TREE_KEYS` uses the full sapling list, as on the base.
- The ruin `named.test.ts` and `grow.test.ts` digests are untouched since e6d8b87 and they pass. So placements did not move, as the fix intended.
- **Hold-out.** `src/render3d/holdoutpin.test.ts` now asserts that the table holds all 18 clutter rows, and keeps the `CLUTTER_KEYS` 17 line beside it. That is not the base file byte for byte. It does pin the full kit table again, and it is stricter than before, not looser. I accept it as meeting the item.

**Must-fix 2 (B4, loosened floors): settled by Josh.** The two hold-out floors were lowered in 83df52f: adds now `> 250` and roofs `> 40`. Commit b79c196 records his words, "Keep lowered floors" (23 Nov 2026, in chat). The record is in `judgements/075-run.md` too, along with the measured values (lowest named city 297 adds; the fixture has 70 roof items). The floors are no longer an unapproved loosening. The main session must carry those words into the merge commit.

The other criteria are as in round 1, and the new commits did not change any of them:
- A1 to A5 are met.
- B1, B2 and B5 are met. B2 still carries the stop-point reading noted below.
- B4 file scope is clean, and nothing reads `cam`, `at`, `dir` or `light`.
- B6 is Josh's to check.

## Rule conflicts and risks
- `src/grid/`, `src/night/` and `src/core/` are untouched. There is no new dependency, and no GDD Decided rule is changed.
- **Stop point (carried from round 1).** The run ended after r2, so the r1 below-bar list was not re-routed into an r3. That is defensible under "at most three rounds", but Josh should know that one reading of step 6 allows another round. `judgements/075-run.md` still doesn't name the reading it took.
- **The judge's file (carried from round 1).** The judgements were saved by the main session from the judge's hand-back, not written by the judge. The record says so honestly.
- **The hold-out pick lists now hide removed keys.** `src/city/holdout/kit.test.ts` now asserts the filtered pick lists: camps 6, containers 6, clutter 17, roof items Solar_Panel_02 only. Nothing in that file now pins the hold-out table's full camp, container and roof rows. The full table is still asserted only for clutter, in holdoutpin.

## Must fix
none

## Could improve
1. `src/city/holdout/kit.test.ts`: add one line per kind pinning the full table counts (7 camps, 7 containers, 3 roof items) beside the picked counts, as `src/city/ruin/kit.test.ts` now does for saplings. Then a row dropped from `KIT` would show.
2. (From round 1, still open.) Name a test for the rule "a key in `UNPICKED_KEYS` is never placed", in each of the ruin, hold-out and tech passes. Today the rule rests on the digests.
3. (From round 1, still open.) Rename the `src/city/holdout/stage.test.ts` test that still says "Solar_Panel_02 and Fabric_01 or _02 only".
4. (From round 1, still open.) Add a fixture test for the new `grow.ts` rule that keeps saplings off a frontage pavement cell.
5. (From round 1, still open.) In `judgements/075-run.md`, add one line saying which reading of "at most three rounds" the run took.
