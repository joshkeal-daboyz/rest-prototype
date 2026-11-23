ticket: 079b-era-passes
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
PR 2 of ticket 079 (sections F, G, H). The tech, hold-out and ruin `named.test.ts` files run on the one switch's `NAMED` (6 x 6 seed 1 on in `npm test`). Their report `it`s move to `*.report.test.ts`. Their per-city pins keep only seed 1's row. No threshold, expected value or kept pin changes.

## Does the branch do it?
Diff read with `git diff -M main...ticket/079b-era-passes`. It is one commit, 7fe96de, and touches 9 files, all in `src/city/tech/`, `src/city/holdout/` and `src/city/ruin/`.

**F · Tech**
- `tech/testcities.ts` now re-exports `NAMED` from `../testing/namedcities` and drops its own 20-city list. `DEFAULT` and `PINNED` stay local and have the same values as before.
- "criterion 10, the numbers" moved to `tech/named.report.test.ts`. Its body is unchanged.
- Rule 4: "criterion 9, the digest pin" keeps seed 1's row, `[1, "365c9ce6"]`, unchanged. Rows 2, 3 and 8 are dropped, not re-taken. It loops over `[DEFAULT]`. Met.

**G · Hold-out**
- `holdout/testcities.ts` re-exports `DEFAULT` and `NAMED`. Criterion 10 moved to `holdout/named.report.test.ts`, which builds its own runs (`NAMED.map(runOf)`) through `eraRun`, and `eraRun` calls `sharedEra`.
- The first test asserts `toHaveLength(NAMED.length)` and fills `pinned` with the `DEFAULT` city only.
- "the same city twice" asserts `pinned.size` is 1.
- "every barricade line": the per-city `problems` asserts still run on every city. Only the `lines > 200` total is guarded with `if (FULL_CITIES)`, and its threshold is unchanged. This is the same pattern PR 1 merged with ("only their 20-city totals are guarded"). It is a little stricter than `it.runIf`, because the per-city checks still run in `npm test`.
- `PIN_PARTS` keeps seed 1's row unchanged. Met.
- One unlisted fallout rewrite: `checked > 6000` (a total over 20 cities) is guarded the same way, threshold unchanged. That is within the PR's spare.

**H · Ruin**
- `ruin/testcities.ts` re-exports `DEFAULT` and `NAMED`.
- F1b3 and criterion 13 moved to `ruin/named.report.test.ts`. F1b3 now builds the four `PINNED` plans itself through `eraRun`. Criterion 13 builds its runs from `NAMED` with the same `before` composition and `buildRuin` call as the stage test, so the numbers are the same.
- `handCircuit` is no longer imported by `named.test.ts`, so the about 70 s circuit builds have left `npm test`.
- The first test asserts `NAMED.length` and pins `DEFAULT` only. "the same city twice" asserts 1. `PIN_GROWTH` keeps `1: "578cd93e"` unchanged. Met.

**Green alone, and once in full mode.** The main session ran the scoped gate (tsc clean, 99 passed). I ran each touched named file once with `npx vitest run --mode full --maxWorkers=2`:
- tech: 8 passed, 27.6 s
- holdout: 11 passed, 29.4 s
- ruin: 11 passed, 43.6 s

So the guarded totals still hold on all 20 cities.

**Count against the 15 per PR (as instructed, adapted report moves count):**
- Rewritten in the named files: tech 1, hold-out 4 (first test, frozen/`checked`, barricade, `pinned.size`) and ruin 2 (first test, `pinned.size`), so 7.
- Adapted report moves: hold-out criterion 10, ruin F1b3 and ruin criterion 13, so 3.
- The tech report is moved with its body unchanged, so 0 under Q1. Even counted, the total is 11.
- Total: 10 (11 at most), under 15.

**Report files.** The report files total 10 after PR 2 (PR 1's 7 plus these 3), on track for 16 after PR 3. Each new report file ends `.report.test.ts`, so the R-6/R-7 folder walks skip it.

## Rule conflicts and risks
- No `src/grid/` or `src/night/` change, no new dependency, no file outside the three section folders, and no GDD rule touched.
- The seed 2, 3 and 8 pins (tech digest, hold-out power/settle, ruin growth) are now gone in full mode too, and R-3 determinism runs on seed 1 only even in `gate:full`. The ticket asked for exactly this ("dropped, not re-taken"), but it does narrow what a release checks. Josh may want to know.

## Must fix
none

## Could improve
1. `holdout/named.report.test.ts` and the criterion 13 block in `ruin/named.report.test.ts` iterate `NAMED`, not `ALL_NAMED` as section G says. Under the report config `NAMED` is `ALL_NAMED`, so the effect is the same. Importing `ALL_NAMED` would keep the reports whole if someone ran them without `REST_CITIES=all`.
2. Several titles and headers still say "the 20 named runs" or "the four pin cities":
   - the `tech/named.test.ts` describe
   - the hold-out and ruin pin `it` titles
   - the file headers, which also still say "the numbers are printed"

   Fix the headers in a later pass. Leave the `it` titles alone, since renaming them would count as rewrites.
