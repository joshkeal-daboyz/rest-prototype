ticket: 084-m3-play-fixtures
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section M3 of `tickets/084-first-play.md`: the five `src/play/` test files read `09-shrine-circuit` and `21-wake-the-relay` from `puzzles/fixtures/` rather than `puzzles/`. Only the path lines change, no new test cases, and no `src/play/` code is touched.

## Does the branch do it?
Criterion 1 is met. `git diff origin/main...HEAD` touches exactly five files, each with a single changed line:
- `src/play/play.test.ts:11`, `elapsed.test.ts:11`, `lastentry.test.ts:15` and `pan.test.ts:194` now read `../../puzzles/fixtures/09-shrine-circuit.json`.
- In `src/play/click-event.test.ts:11`, `setup()` now joins `../../puzzles/fixtures` with its file argument. That covers both its default `09-shrine-circuit.json` and the `21-wake-the-relay.json` calls on lines 24 and 30.

I grepped `src/play/` for any `puzzles/` path that does not go through `fixtures` and found none. On `origin/main`, both fixture files are byte-identical to their `puzzles/` originals, so the tests still read the same maps. I ran the five files with `npx vitest run --maxWorkers=2`: 5 files, 67 tests, all passing in 2.6 s.

Count: there are no added `it(` or `test(` lines, which matches the ticket's 0.

## Rule conflicts and risks
- None found. No `src/play/` code changed, no `src/grid/` or `src/night/` code changed, nothing outside the five listed files changed, and no new dependency was added.

## Must fix
none

## Could improve
none
