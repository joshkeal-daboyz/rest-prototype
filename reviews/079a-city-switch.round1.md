ticket: 079a-city-switch
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
PR 1 of ticket 079 (sections M, A, B, C, E). One switch in `src/city/testing/namedcities.ts` makes every whole-city check in the planner, streetscape, buildings and ground folders run on 6 x 6 seed 1 one-way on in `npm test`, and on all 20 named cities in `--mode full`. The report files move to `*.report.test.ts`, which `npm test` skips and `npm run report` runs. No threshold, expected value or pin may change.

## Does the branch do it?
I read the diff `git diff -M main...ticket/079a-city-switch` at f9923a0. I did not re-run the gate: the main session reported it green (tsc clean, 4181 passed, 0 failed).

**M, config and CI**
- `vite.config.ts` is now `defineConfig(({ mode }) => ...)`. It adds `exclude: [...configDefaults.exclude, "**/*.report.test.ts"]` and `env: { REST_CITIES: mode === "full" ? "all" : "" }`, so `npm test` collects no report.
- `vitest.report.config.ts` includes only `src/**/*.report.test.ts` and always sets `REST_CITIES: "all"`. It keeps the global setup and the yield setup files. It does not use `mergeConfig`, which the ticket's Interfaces named. The file's comment gives the reason: a merge would concatenate the report exclude onto its own include list. That reason is correct, and the result is what the criterion asks for.
- `package.json`: `report` and `gate:full` are exactly as the ticket wrote them. `test` and `gate` are unchanged.
- `ci.yml`: the manual run gains a `cities` choice input (`all` by default, or `one`). `all` runs `npx vitest run --mode full`; `one` runs `npm test`. PR and push runs still use `--changed "$BASE"`.
- `docs/test-policy.md` rule 3 gains the one sentence naming `npm run report`.

I did not run `npx vitest list`; the ticket gives that check to the main session.

**A, the switch**
- `namedcities.ts` exports `ALL_NAMED` (the old list, same order), `FULL_CITIES`, `NAMED`, `NAMED_ON` and `VARIED`, exactly as specified.
- `namedcities.test.ts`, the rewritten list test, checks `ALL_NAMED`'s order, then the lists for the current setting. It then uses `vi.stubEnv`, `resetModules` and a fresh import to check the other setting. This is a real test: it fails if the switch or either list is wrong, in either mode.
- The cache round-trip loop runs every profile on `DEFAULT` and only `clean` on seed 1 one-way off. The `it(` line is unchanged.
- `history/testcities.ts` re-exports `NAMED`.
- `pipeline/named.test.ts`: `RUNS = NAMED.map(...)`.
- `streets/check`, `oneway`, `split`, `parkplaces`, `land/stage` and `mass/stage` import `NAMED_ON as NAMED` and drop their local lists.
- `streets/equal` is left alone.
- The four list-length tests (land, mass, oneway, split) are deleted. `split`'s `coverageProblems` line went with its test; the ticket notes that `eachCity` repeats that check.
- `history/stage`: "has the lattice's size" uses `ALL_NAMED[10]` (seed 1 off), and R-3 uses `ALL_NAMED[1]` (seed 2 on), as asked.
- `history/report` is renamed to `stage.report.test.ts` at 100% similarity.
- The clean clash report moves to the new `pipeline/named.report.test.ts`. Because it can no longer read the `clashes` array that `named.test.ts` filled, it builds its own runs.

**B, edge and traffic**
- `traffic/testcities.ts` re-exports `NAMED` and `VARIED`.
- `edge/stage` and `edge/kerb` import `NAMED`.
- `edge/stage` loses only its `toHaveLength(20)` line. Its default-digest check stays.
- Both reports are renamed at 100% similarity.
- `edge/report` was renamed unchanged rather than switched to `NAMED`. That is harmless: as a report it should cover all 20 cities, and it does.

**C, buildings**
- `columns` and `stage` import `NAMED`.
- `report` is renamed to `stage.report.test.ts` and `columnreport` to `columns.report.test.ts`, both at 100%.

**E, ground**
- `ground/testcities.ts` re-exports `NAMED` and `VARIED`.
- `report` is renamed to `stage.report.test.ts` at 100%.

**Fallout handled by the Interfaces rule.** Seven tests became `it.runIf(FULL_CITIES)`:
- `buildings/columns` "rowId ...": `bends` must be 8.
- `edge/kerb` "the report's numbers over the 20 named runs": `sides > 2000`, `ts > 300`.
- `traffic/control` "every control kind": `signalJunctions` must be 221.
- `traffic/signals`, three tests: totals 221 and 884, among others.
- `traffic/signs` "every stop approach": `signs` must be 1054.

I read each body. Every one asserts an exact or minimum total over the 20 runs, so it would fail on the four pinned cities too, and full-run-only is the ticket's stated fallback. No threshold, expected value or pin changed anywhere in the diff.

`streets/oneway` S9 moved from `eachCity` to `VARIED`, with a one-line reason: "not vacuous" depends on how cities vary.

**Test count against main (rule 0).** I count 13 added or rewritten cases, within the 15:
- 7 `runIf` rewrites
- `edge/stage` 1
- `history/stage` 2
- `namedcities` 1
- `oneway` S9 1
- the new `pipeline/named.report.test.ts` case, 1: it is not a rename and its body changed

The 7 renamed reports count 0 (Q1). Everything else is deletions.

## Rule conflicts and risks
- No change to `src/grid/` or `src/night/`, no new dependency, no GDD rule touched. Cross-folder edits are covered by Josh's Q3 waiver.
- Coverage moves from `npm test` to the full run. TR1d signal placement, the stop-sign placement and the kerb totals now run on zero cities in `npm test` and only in `gate:full`. Their per-junction "bad" lists would still be meaningful on one city; only the totals tie them to 20. This is allowed by the ticket's rule, but it is the largest real loss of everyday coverage in this PR.
- `streets/oneway` S9 in full mode: `VARIED` is `ALL_NAMED`, and `laid(o)` ignores `way`, so seeds 1 to 10 one-way on are laid twice (the second time from the cache). It is correct, just redundant.
- `traffic/signals` and `signs` still `warm(NAMED)` in `beforeAll` even though every named-run test in those blocks is now skipped in `npm test`. One default city is built for nothing in those files. It is cheap, since the cache is shared.
- I did not check that the builder ran each touched file once in `--mode full`, as the Sections paragraph asks, because its reply was not given to me. A list or index bug that shows only in full mode would surface at the first `gate:full`.

## Must fix
none

## Could improve
1. `src/city/edge/stage.test.ts`: the first test's name still says "and the named runs are 20". Its length assertion is gone, so the name now claims something the test doesn't check. Renaming it would make it a rewrite anyway, and it is already counted as one.
2. `src/city/traffic/signals.test.ts`, `signs.test.ts`, `control.test.ts`: a later ticket could split each test's per-junction "bad" loop, which holds on any city, from its 20-city total. The loop would then run on `DEFAULT` in `npm test` and the total stay full-only. That would cost rewrites, so it doesn't belong in this PR.
3. `src/city/traffic/signals.test.ts` and `signs.test.ts`: guard the `beforeAll(() => warm(NAMED))` with `FULL_CITIES` if nothing else in the block reads the warm cities.
4. The builder's reply should list each `runIf` test with its one-line reason (the ticket asks for this) and confirm the full-mode run of each touched file. Reading the bodies, I found the reasons: exact totals 8, 221, 884 and 1054, and minimums `> 2000` and `> 300`.
