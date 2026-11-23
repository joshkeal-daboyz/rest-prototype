ticket: 079a-city-switch
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
PR 1 of ticket 079 (sections M, A, B, C, E). One switch in `src/city/testing/namedcities.ts` makes whole-city checks run on 6 x 6 seed 1 one-way on in `npm test`, and on all 20 named cities in `--mode full`. Reports move to `*.report.test.ts`, which `npm test` skips and `npm run report` runs. No threshold, expected value or pin may change.

## Does the branch do it?
Round 2. Round 1 (`reviews/079a-city-switch.round1.md`) passed every criterion with 0 must-fix. This round reads only commit 7318439, which acts on round 1's could-improve items 1 to 3 on Josh's "Yes, split them (Recommended)". I re-ran nothing. The main session reports tsc clean and the 6 touched files passing (109 tests).

**The seven tests that were full-run-only now run in `npm test` again.** Only their 20-city totals sit behind `if (FULL_CITIES)`:
- `traffic/signals`, three TR1d tests:
  - The per-junction checks (`expect(bad).toEqual([])`) run over `NAMED` every time.
  - Behind `FULL_CITIES`: masts 884, buttons 1768, boxes 221, groups 884 and heads 884 x 2.
- `traffic/signs`, "every stop approach":
  - Per-approach checks run every time.
  - Behind `FULL_CITIES`: `signs` 1054.
- `traffic/control`, "every control kind":
  - The kind sets and `outbound > 0` run every time.
  - Behind `FULL_CITIES`: `signalJunctions` 221.
  - Because the kind sets now pass on the default city, that city has signal, stop and all-stop junctions. So the signals and signs loops above are not vacuous in `npm test`.
- `edge/kerb`, "the report's numbers":
  - The ratio checks (`sidesOnePath`, `dips`, `bareFlanks` 0, returns and junction rects) run every time.
  - Behind `FULL_CITIES`: `sides > 2000` and `ts > 300`.
- `buildings/columns`, "rowId ...":
  - Runs over `VARIED`, the four pinned cities, with a one-line reason: Ls are rare.
  - In a full run it keeps `bends` 8.
  - Otherwise it asserts `bends > 0`. That is an added non-vacuity check, not a changed pin.

No threshold, expected value or pin changed in this commit. Each pin is word for word what it was, now inside a guard.

**Round 1 could-improve items:**
1. Done. `edge/stage`'s first test name no longer says 20.
2. Done, in this branch rather than a later ticket, on Josh's word.
3. Moot. The `warm(NAMED)` in `beforeAll` is read again now that the tests run.

**Test count against main (rule 0).** Unchanged at 13. The same seven tests are rewritten; only their bodies changed between rounds.

## Rule conflicts and risks
- No change to `src/grid/` or `src/night/`, no new dependency, no GDD rule touched.
- Round 1's main risk, that TR1d and stop-sign placement no longer ran in `npm test`, is resolved.
- `traffic/signals`: outside a full run nothing asserts `masts > 0` in that file. Non-vacuity rests on `control.test.ts`'s kind check, in another file.

## Must fix
none

## Could improve
1. `src/city/edge/kerb.test.ts`: the test is still named "the report's numbers over the 20 named runs", but it now runs on one city in `npm test`. Something like "the D2 totals on the named runs" would be accurate.
2. `src/city/traffic/signals.test.ts`: add `else expect(masts).toBeGreaterThan(0)` (and the same for `groups` and `heads`), as `columns` does. Then each test proves itself non-vacuous without leaning on `control.test.ts`. Optional; it adds no new test case.
