ticket: 079-trim-test-suite (PR 3, part: 079c-facades-render3d)
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
In PR 3, section D moves the six facades reports to `*.report.test.ts`, points the facades whole-city checks at the one switch, and rewrites the three fixed-index tests. Section I points `plan3d.test.ts`'s local 20-city list at the switch. No threshold, expected value or pin may change, and the PR stays at 15 added or rewritten cases or fewer. This branch says it is only part of D (the reports, `dress`, `escape`, `novelty`) plus all of I. `roof`, `rooffixtures`, `stage` and the `facades/testcities.ts` re-export are left for a PR 4.

## Does the branch do it?
**D, the renames (no test).** All six are done as pure renames at 100% similarity, so they count 0 under Q1: `report` to `h1.report`, and `dress`, `escape`, `novelty`, `party` and `roof` to `*.report`. The two fixture headers that named old files are updated (`dressfixtures.test.ts`, `escapefixtures.test.ts`). Nothing in `src/` still names an old report file. The only old name left is in `docs/handoff-2026-11-21-night.md`, a dated handoff, and it should stay as it is. `vite.config.ts` excludes `**/*.report.test.ts` and `vitest.report.config.ts` includes only those files (from PR 1), so the renamed files leave `npm test` and run under `npm run report`.

**D, the switch for `dress`, `escape` and `novelty`.** These three import `NAMED` (and `FULL_CITIES`, and `ALL_NAMED` in novelty) straight from `src/city/testing/namedcities.ts`, not through the facades `testcities.ts`. That follows from deferring the re-export to PR 4, and it puts these files on the switch now. The `NamedCity` and facades `City` types match in shape, and tsc is clean.

**D, the fixed-index rewrite (`novelty` "the same city twice").** `[NAMED[0]!, NAMED[11]!]` becomes `[NAMED[0]!, ALL_NAMED[11]!]`. In both modes that is seed 1 on and seed 2 off, the same two cities as on main. Correct. The other two fixed-index rewrites (`roof`, `rooffixtures`) are deferred, as stated.

**D, totals that fail on one city (Interfaces rule).** Every summed total in `dress` (9 asserts over 6 tests), `escape` (8 over 4) and `novelty` (2 over 1) is wrapped as `if (FULL_CITIES) expect(...)`, with its threshold unchanged. In `npm test` the per-city checks in those tests still run on the default city. In a full run every total runs exactly as on main. Nothing is loosened. The rule's wording is "try `VARIED`, else `it.runIf(FULL_CITIES)`". Gating a single assert is the same rule applied to the assert instead of the whole test, and it keeps more checking in `npm test`. I accept it; see could-improve 1.

**I, `plan3d.test.ts`.** The local 20-city `NAMED` is deleted, and the file imports `NAMED`, `VARIED` and `FULL_CITIES` from the switch. Following the Interfaces rule:
- "the buildings, on the 20 named runs" moves to `VARIED`. Its `ls > 0` needs a city with an L, which is variety, so `VARIED` is the right first step.
- The stage 9 traffic test's `pieces > 5000` is gated on `FULL_CITIES`.
- The `[DEFAULT, ...PINS]` tests are untouched, as the ticket asks.
- No other `render3d` file changes.

**The 14 count holds.** I counted `it` bodies changed in `git diff -M main...HEAD`:
- `dress.test.ts`: 6 (glass, awnings, LG, blades, ATM, quiet front)
- `escape.test.ts`: 4 (escapes, street and quiet, the EP meeting, canopies)
- `novelty.test.ts`: 2 (face and roof signs, the same city twice)
- `plan3d.test.ts`: 2 (buildings on `VARIED`, traffic pieces)

That makes 14. No `it` is added. The renames count 0. Import lines and the deleted list sit outside any `it`. That is under the cap of 15.

**Gate.** The main session reports tsc clean and 6 files with 151 tests passing on `--changed`. I did not re-run it, as instructed.

## Rule conflicts and risks
- No change to `src/grid/`, `src/night/`, `src/core/` or `package.json`, and no new dependency. Every file is in `src/city/facades/` or `src/render3d/`, the folders sections D and I list.
- No threshold, expected value or pin changed. Every gated assert keeps its number, and in full mode it runs as on main.
- Two `NAMED`s exist for now: the facades `testcities.ts` copy (still the 20 cities, used by `roof`, `party`, `stage` and the fixtures) and the switch's. That is expected until PR 4 finishes section D. Until then those facades files still build 20 cities in `npm test`, so this PR's saving is smaller than the ticket's PR 3 estimate.
- I could not tell whether the builder ran each touched file once in full mode. The gated asserts are unchanged from main, and the novelty cities are identical, so full-mode behaviour should match main (inferred, not run).

## Must fix
none

## Could improve
1. Ticket file (main session): record in `tickets/079-trim-test-suite.md` that a failing total may be gated per assert (`if (FULL_CITIES) expect(...)`) rather than through `it.runIf` on the whole test. PR 4 and the measurement should read the rule the same way.
2. PR 4, when `facades/testcities.ts` re-exports `NAMED` and `VARIED`: `dress`, `escape` and `novelty` could take `NAMED` from `./testcities` again, so the folder has one import path. Optional, since both resolve to the same list.
3. The ticket's "first try `VARIED`" step for the `dress` and `escape` totals isn't shown. With 20-city thresholds, four pin cities very likely fall short (inferred from the thresholds, not checked). One line per gated total in the builder's reply would close that.
