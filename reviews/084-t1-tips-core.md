ticket: 084-t1-tips-core
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
T1 (`tickets/084-first-play.md`, section T): `validateCityPuzzle` checks an optional `tips` box (`{ title, lines }`, with title up to 40 characters, 1 to 4 lines, each line up to 160 characters, one `tips: ...` message per problem), and a plain map refuses it, with one test case. The PR also carries the architect's section T re-cut (A1b, the E2 widening, the A5 re-cut) and the core types `PuzzleTips`, the three `TIPS_*` limits and `CityPuzzle.tips?`.

## Does the branch do it?
Judged against `origin/main` (the local `main` in this worktree is stale; `git diff origin/main...HEAD` touches 6 files).

- **Criterion 1, `validateCityPuzzle` checks `tips`.** Met. `checkTips` in `src/core/load.ts` runs only when `p["tips"] !== undefined`, so an absent box is fine.
  - It checks for exactly the keys `title` and `lines`.
  - `title` must pass `isStr`, which means a non-empty string, and be at most `TIPS_TITLE_MAX` characters.
  - `lines` must be an array of 1 to `TIPS_MAX_LINES` items. Each item must be a non-empty string of at most `TIPS_LINE_MAX` characters.
  - Every message is prefixed `tips: `.
  - The plain-map refusal `"tips is only for a city puzzle"` is on the `!city` branch of `checkPuzzle`, mirroring `guide` exactly.
- **The test.** Met. `src/core/load.test.ts`: "tips (084 T1): a valid box loads; an extra key, an empty title and a fifth line are one message each".
  - It is the fixture case the ticket specifies: the two-line box loads clean.
  - The same box with `extra: 1`, `title: ""` and 2+3 = 5 lines gives exactly those three messages, in order, with `toEqual`.
  - It would fail on a missing key check, a missing empty-title check or a missing line-count bound.
  - Count: 1 added, as the ticket says.
- **Ran.** `npx vitest run --maxWorkers=2 src/core/load.test.ts`: 100 passed, 2.16 s for the file. Nothing is left running.
- **Core types, checked against the ticket's *Interfaces* and *Files* lines.**
  - `PuzzleTips { readonly title; readonly lines: readonly string[] }` and `TIPS_TITLE_MAX = 40`, `TIPS_LINE_MAX = 160`, `TIPS_MAX_LINES = 4` are in `src/core/onboarding.ts`. They are exported by the existing `export * from "./onboarding"` in `src/core/index.ts`.
  - `CityPuzzle.tips?: PuzzleTips` is in `src/core/citycircuit.ts`, type-only import.
  - The doc comments quote Josh's words and his card answers as the ticket records them.
- **Ticket re-cut.**
  - The section T table gives thirteen boxes. That matches the T-1 answer ("Leave them out (Recommended)" for s09 and s10).
  - The "one voice at a time" order matches T-2 (the clock holds) and T-3 ("Until won").
  - A1b's reason names the real gap: `convertCityPuzzle` spreads unknown keys into the plain map.
  - The PR table adds up: 28 cases, 16 added and 12 rewritten, none over 6.
  - `tickets/rules-coverage.md`'s Relight row names 084 T3 as the *Rules this ticket holds* line says.

## Rule conflicts and risks
- No `src/grid/` or `src/night/` change. There are no new imports beyond core-to-core type and constant imports, and no new dependency.
- Files touched are exactly T1's two (`load.ts`, `load.test.ts`) plus the cut's listed files (`tickets/084-first-play.md`, `onboarding.ts`, `citycircuit.ts`, `rules-coverage.md`). The guide checks and `words.ts` are untouched, as *Must not* asks.
- No GDD Decided rule changes.
- Known gap, owned by A1b, not this branch: until A1b merges, a city file that carries `tips` will pass `validateCityPuzzle` but fail conversion. The ticket already orders T2a and T2b after A1b.

## Must fix
none

## Could improve
1. The plain-map refusal ("tips is only for a city puzzle") has no case. It is one line mirroring `guide`'s, and the ticket asked for no test of it, so this is optional. If M1 or a later PR touches `load.test.ts` anyway, one `expect` on `validatePuzzle` inside an existing schematic case would cover it without a new case.
