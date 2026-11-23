# 079 · Trim the test suite to the test policy: reports on demand, whole-city checks on one city

owner: per section (main session, planner, streetscape, buildings, landscape, tech-pass, holdout-pass, ruin-pass, facades, renderer; see Sections)
status: open
branch: `ticket/079-trim-test-suite` (this file). One branch per pull request: `ticket/079a-city-switch`, `ticket/079b-era-passes`, `ticket/079c-facades-render3d`

## Josh's words (23 Nov 2026, in chat)
> "We need to adjust the pipeline. It should not reward this kind of test volume. It's not helpful and it has a major diminishing return. We need to strike a balance between performing tests that are productive and not wasting time on tests that will regularly succeed."

> "We should be performing no more than 10 to 15 tests per change" / "when I say change I mean pull request"

> "I would only like tests to be performed against objects that the changes directly impact"

He was shown the estimate (about 1,025 s of test CPU down to about 300 s; CI's test step from about 6.5 to about 2 to 2.5 min) and said:
> "go ahead and make the changes" / "Yes, do it"

That is the request, not G1. G1 is his word on this ticket. `docs/test-policy.md` (PR #9, merged before any build here) is in force: rule 0 caps each pull request at 15 added or rewritten `it(...)` cases; removed ones don't count.

## What the architect found (read 23 Nov 2026 on `main` at bbfc0a9, with the durations of main's last green CI run)

**Before:** 224 files, 4,709 tests, 1,025 s of summed file time on CI, about 6.5 min of CI test step. 49 files build the 20 named cities (794 s). The other 175 take 214 s.

**The 14-file "report-only" list is partly wrong.** Read file by file:
- **12 files really are reports.** Each `it` prints a table, and its only asserts are "the named runs are ok", which the stage tests already check, or a few pins the ticket also set (party, roof, escape, dress). They take 240 s: `buildings/report`, `buildings/columnreport`, `edge/report`, `facades/report`, `facades/dressreport`, `facades/escapereport`, `facades/noveltyreport`, `facades/partyreport`, `facades/roofreport`, `ground/report`, `traffic/report` and `history/report`. Three of these (`buildings/report`, `columnreport`, `edge/report`) were missing from the list.
- **4 files are mixed.** They hold real checks (R-1 to R-7, digest pins, T-1 and T-2) plus one or two report `it`s: `ruin/named` (13 tests, 37 asserts; its F1b3 report alone is about 70 s), `holdout/named` (12 and 37), `tech/named` (9 and 76) and `pipeline/named` (4 and 16). Only the report `it`s move out.
- **`render3d/trafficpin.test.ts` is not a report.** It has 67 asserts on kit bounds, plus one `console.log` inside an asserting test. It stays as it is.

**Why lists, not test cases.** 7 folders have a `testcities.ts` with its own copy of the 20-city list. 8 test files build their own list (`buildings/columns`, `buildings/stage`, `edge/stage`, `edge/kerb`, `land/stage`, `mass/stage`, the streets files, `render3d/plan3d`), and `pipeline/named` builds its `RUNS`. If every one reads one switch in `src/city/testing/namedcities.ts`, almost no `it(...)` changes. Only the tests below break when the list shrinks to one city, and each needs a rewrite or a deletion:
- **List-length checks:** `edge/stage` "the default city is ... the named runs are 20", `land/stage` and `mass/stage` "the named cities are 10", `streets/oneway` "covers the 10 named cities", `streets/split` "the named cities are 10" (its `coverageProblems` line repeats the `eachCity` check at line 229), and `testing/namedcities.test` "NAMED is the 20 runs".
- **Fixed indexes past 0:** `facades/novelty` "the same city twice ..." (`NAMED[11]`), `facades/roof` "every choice is the stage's rand" (`NAMED[1]`), `facades/rooffixtures` (`NAMED.find(small)`, may find none), `history/stage` "has the lattice's size" (`NAMED[10]`) and "R-3: the same city twice" (`NAMED[1]`).
- **Totals over 20 cities:** `holdout/named` "every barricade line" (`lines > 200`), `facades/roof` (`dishes > 1000` and its two neighbours), and very likely more in `facades/` and `ground/`. These are found by running the file once.
- **The per-city pins:** `ruin/named` and `holdout/named` fill `pinned` from the NAMED loop and assert `pinned.size` is 4.

**The render3d era files are already fine.** `daytoggle`, `eraview`, `holdoutdraw`, `ruindraw` and `techdraw` build only 6 x 6 seed 1, and nothing in them changes. `furniture`, `terracepack`, `sills` and `render/zoom` (about 70 s together) loop over the ladder maps, not the named cities, so they are out of scope here. They are candidates for a later ticket.

**How the switch reaches the tests.** npm scripts can't set an env var on Windows without a new dependency (`cross-env`). So the switch is a vitest `--mode`: `vite.config.ts` becomes `defineConfig(({ mode }) => ...)`, and its `test.env` sets `REST_CITIES: "all"` when `mode === "full"`. The report config sets it always. No new dependency.

**Why reports end in `.report.test.ts`.** At least ten tests walk their folder for files ending `.ts` but not `.test.ts` (R-6/R-7 import checks, land's `.biome` walk). A report named `*.report.ts` would be walked and fail them. A `*.report.test.ts` is skipped by every walk, the main config excludes it, and the report config includes only it.

## Goal
`npm test` (and the scoped `npm run gate`) runs no report, and runs each whole-city check on 6 x 6 seed 1 one-way on, or on the four pinned cities where the check depends on how cities vary. The suite drops from about 1,025 s to about 300 to 350 s of CPU, and the full CI run from about 6.5 to about 2 to 2.5 min. Josh and the pipeline-designer still get every number with `npm run report`. A release still checks all 20 named cities with `npm run gate:full`, which also runs the reports and so keeps their pins (Q2). No check is loosened: no threshold, expected value or pin is changed.

## Interfaces

No `src/core/` change and no new dependency.

**`src/city/testing/namedcities.ts` (planner, section A), the one switch.** Exports added beside `PINNED`, `DEFAULT` and `label`, which stay as they are:
```ts
/** The 20 named runs: 6 x 6 seeds 1 to 10, one-way on then off. Read directly only by a test that names a city other than seed 1 on. */
export const ALL_NAMED: readonly NamedCity[];
/** True when the run asked for every named city: process.env["REST_CITIES"] === "all" (`npm run gate:full`, `npm run report`). */
export const FULL_CITIES: boolean;
/** The cities a whole-city check runs on: [DEFAULT] in `npm test`, ALL_NAMED in a full run. */
export const NAMED: readonly NamedCity[];
/** NAMED with one-way on only, for the stage 1 to 3 tests that build one-way on: [DEFAULT], or seeds 1 to 10 on (today's 10-city lists). */
export const NAMED_ON: readonly NamedCity[];
/** For a check that depends on how cities vary: PINNED in `npm test`, ALL_NAMED in a full run. */
export const VARIED: readonly NamedCity[];
```
Every per-folder `testcities.ts` re-exports `NAMED` (and `VARIED` where it is used) from here and drops its own copy. A test file with a local list imports `NAMED` or `NAMED_ON` instead. These are changes at the top of a file, outside any `it`, so they rewrite no test case.

**Config (main session, section M):**
- `vite.config.ts` takes `mode`. Its `test` block gains `env: { REST_CITIES: mode === "full" ? "all" : "" }` and `exclude: [...configDefaults.exclude, "**/*.report.test.ts"]`.
- New `vitest.report.config.ts`: `mergeConfig` of the above with `include: ["src/**/*.report.test.ts"]` and `env: { REST_CITIES: "all" }`.
- `package.json`:
  - `"report": "vitest run --config vitest.report.config.ts"`
  - `"gate:full": "tsc --noEmit && vitest run --mode full && vitest run --config vitest.report.config.ts"` (Q2)
  - `test` and `gate` stay as PR #9 left them.

**The rule for a test that fails only because its list shrank** (every section): first try `VARIED`. If it still fails there, the test runs only in a full run (`it.runIf(FULL_CITIES)` or the same on its `describe`). Never change a threshold, an expected value or a pin to make it pass. Each such test counts as rewritten, and goes in the builder's reply with one line of reason.

## Sections

The order: PR 1 first (M before A, then B, C and E in any order). After it merges, PR 2 and PR 3 in either order; PR 2 first is recommended, since it saves the most. Each section's branch must be green alone: `npm test`, and its own touched files once in full mode (`npx vitest run --mode full --maxWorkers=2 <files>`, one file at a time; Josh's PC limits).

| PR | Branch | Sections | Fixed rewrites | Spare for list fallout |
| --- | --- | --- | --- | --- |
| 1 | `ticket/079a-city-switch` | M (main session), A (planner), B (streetscape), C (buildings), E (landscape) | 4 | 11 |
| 2 | `ticket/079b-era-passes` | F (tech-pass), G (holdout-pass), H ruin-pass | 6 | 9 |
| 3 | `ticket/079c-facades-render3d` | D (facades), I (renderer) | 3 | 12 |

A builder whose PR would pass 15 added or rewritten cases stops and reports. The architect then splits the PR; the rule is not stretched. Files moved unchanged into a report (a git rename, similarity 90% or more) count as 0 (Q1). The main session counts with `git diff -M origin/main...`.

### M · Config and CI (main session), PR 1, first
Files: `vite.config.ts`, `vitest.report.config.ts` (new), `package.json` scripts, `.github/workflows/ci.yml`, and one line in `docs/test-policy.md` rule 3 naming `npm run report`.
- [ ] (no test; main session checks with `npx vitest list`) `npm test` collects no `*.report.test.ts`. `npm run report` collects exactly the report files (16 by the end of PR 3) and runs them with `REST_CITIES=all`.
- [ ] (no test) `npm run gate:full` is typecheck, then the whole suite in full mode, then the reports.
- [ ] (no test) CI's manual "Run workflow" (PR #9) runs `vitest run --mode full`, with a `cities` input (`all` by default, or `one`) so the trimmed suite's CI time can be measured. PR and push runs stay `--changed`.

### A · The switch and the planner's folders (planner), PR 1
Files: `src/city/testing/`, `src/city/pipeline/`, `src/city/streets/`, `src/city/land/`, `src/city/mass/`, `src/city/history/`.
- [ ] (test: rewrite of `namedcities.test.ts` "NAMED is the 20 runs") `ALL_NAMED` is the 20 runs in today's order. In this run, `FULL_CITIES` is false, `NAMED` and `NAMED_ON` are `[DEFAULT]`, and `VARIED` is `PINNED`. With `vi.stubEnv("REST_CITIES", "all")` and a fresh import, `NAMED` and `VARIED` are `ALL_NAMED`, and `NAMED_ON` is seeds 1 to 10 on.
- [ ] (no test) `namedcities.test.ts`: the cache round-trip loop keeps all five profiles on `DEFAULT`, and only `clean` on seed 1 off. That deletes 4 generated cases and changes no `it(` line.
- [ ] (no test) `history/testcities.ts` re-exports `NAMED`. `pipeline/named.test.ts`'s `RUNS` becomes `NAMED`. The local lists in `streets/check`, `oneway`, `split` and `parkplaces`, `land/stage` and `mass/stage` become `NAMED_ON`. `streets/equal` (3 x 3 and 6 x 4 sizes, 0.1 s) is left alone, because it depends on size variety.
- [ ] (no test) Deleted: the list-length tests in `land/stage`, `mass/stage`, `streets/oneway` and `streets/split`, which repeat A's list test.
- [ ] (test: 2 rewrites) In `history/stage`, "has the lattice's size" and "R-3: the same city twice" name their second city from `ALL_NAMED` (seed 1 off, seed 2 on) instead of `NAMED[10]` and `NAMED[1]`.
- [ ] (no test) `history/report.test.ts` is renamed to `history/stage.report.test.ts`. `pipeline/named.test.ts`'s "the clean clash report" moves to `pipeline/named.report.test.ts`.

### B · Edge and traffic (streetscape), PR 1
Files: `src/city/edge/`, `src/city/traffic/`.
- [ ] (no test) `traffic/testcities.ts` re-exports `NAMED`. The local lists in `edge/stage`, `edge/kerb` and `edge/report` import `NAMED`. That deletes about 240 generated per-city cases in `kerb` and `stage`.
- [ ] (test: 1 rewrite) `edge/stage` "the default city is the 6 x 6 seed 1 city ..." loses its `toHaveLength(20)` line. Its default-digest check stays.
- [ ] (no test) `edge/report.test.ts` is renamed to `edge/stage.report.test.ts`, and `traffic/report.test.ts` to `traffic/stage.report.test.ts`.

### C · Buildings (buildings), PR 1
Files: `src/city/buildings/`.
- [ ] (no test) The local lists in `columns` and `stage` import `NAMED`. `report.test.ts` is renamed to `stage.report.test.ts`, and `columnreport.test.ts` to `columns.report.test.ts`.

### E · Ground (landscape), PR 1
Files: `src/city/ground/`.
- [ ] (no test) `ground/testcities.ts` re-exports `NAMED` and `VARIED`. `report.test.ts` is renamed to `stage.report.test.ts`.

### F · Tech (tech-pass), PR 2
Files: `src/city/tech/`.
- [ ] (no test) `tech/testcities.ts` re-exports `NAMED`. "criterion 10, the numbers" moves to `tech/named.report.test.ts`.
- [ ] (test: 1 rewrite) Rule 4: "criterion 9, the digest pins" pins seed 1 one-way on only. Its table keeps seed 1's row unchanged, and the other three rows are dropped, not re-taken.

### G · Hold-out (holdout-pass), PR 2
Files: `src/city/holdout/`.
- [ ] (no test) `holdout/testcities.ts` re-exports `NAMED`. "criterion 10: the numbers" moves to `holdout/named.report.test.ts`, which builds its own runs from `ALL_NAMED` through `sharedEra`.
- [ ] (test: 3 rewrites)
  - The first test asserts `runs` has `NAMED.length` entries, and fills `pinned` with `DEFAULT` only.
  - "the same city twice" asserts `pinned.size` is 1.
  - "every barricade line" goes to `VARIED` or full-run-only, per the Interfaces rule, and keeps `> 200`.
  - `PIN_PARTS` keeps seed 1's row unchanged.

### H · Ruin (ruin-pass), PR 2
Files: `src/city/ruin/`.
- [ ] (no test) `ruin/testcities.ts` re-exports `NAMED`. F1b3 "prints, per pin city ..." and "criterion 13: the numbers" move to `ruin/named.report.test.ts`. That takes the about 70 s circuit builds out of `npm test`.
- [ ] (test: 2 rewrites) The first test asserts `NAMED.length` and fills `pinned` with `DEFAULT` only. "the same city twice" asserts `pinned.size` is 1. `PIN_GROWTH` keeps seed 1's row unchanged.

### D · Facades (facades), PR 3
Files: `src/city/facades/`.
- [ ] (no test) `facades/testcities.ts` re-exports `NAMED` and `VARIED`. The six reports are renamed: `report` to `h1.report.test.ts`, `dressreport` to `dress.report.test.ts`, `escapereport` to `escape.report.test.ts`, `noveltyreport` to `novelty.report.test.ts`, `partyreport` to `party.report.test.ts`, and `roofreport` to `roof.report.test.ts`. The two fixture headers that name the old files are updated.
- [ ] (test: 3 rewrites) These name their other city from `ALL_NAMED` (or search `VARIED`) instead of a fixed index:
  - `novelty` "the same city twice ..." (`NAMED[11]`)
  - `roof` "every choice is the stage's rand" (`NAMED[1]`)
  - `rooffixtures` (`NAMED.find(small)`)
- [ ] (no test) Every total over the 20 runs that fails on one city (`roof`'s `> 1000` counts, at least) is handled by the Interfaces rule and listed in the reply.

### I · Render3d (renderer), PR 3
Files: `src/render3d/`.
- [ ] (no test) `plan3d.test.ts`'s local `NAMED` imports `NAMED` from `src/city/testing/namedcities`. Its `[DEFAULT, ...PINS]` tests stay on the four pinned cities: they search for a city with a feature, which depends on variety. No other render3d file changes.

### Measurement (main session, after each PR and at the end)
- [ ] (no test) Before: 1,025 s summed and about 6.5 min CI test step (main at bbfc0a9). After each PR: the summed file durations of `npx vitest run --reporter=json` in a detached worktree, run once. After PR 3: a manual CI run with `cities: one`, giving the test-step time, plus one `cities: all` run to show that `gate:full` still passes. All of these are reported to Josh with the before figures.

**Expected saving:**

| PR | Saving (s) | Where it comes from |
| --- | --- | --- |
| 1 | about 225 | reports about 98, list trims about 125 |
| 2 | about 180 | mostly `ruin/named`, 168 s to about 12 |
| 3 | about 285 | facades reports 143, facades trims about 85, `plan3d` about 55 |
| Total | about 690 | 1,025 s to about 300 to 350 s; CI test step about 2 to 2.5 min |

## Open questions
- **Q1.** Recommended: yes. A test moved unchanged into a `*.report.test.ts` file, out of `npm test`, counts as 0 against the 15 per PR, because it leaves the suite. If no, the 12 renamed reports alone (about 25 cases) would need two extra PRs.
- **Q2.** Recommended: yes. `npm run gate:full` also runs the reports, so their few pins (party, roof, escape, dress thresholds) still run at every release. If no, they run only when someone types `npm run report`.
- **Q3.** Recommended: yes. Waive "each agent stays in its folder" for this ticket, as in 076 and 078. The planner does sections A to I itself, one branch per PR, since all of it is mechanical list swaps and renames. That saves about eight agent spawns. If no, the owners above build their own sections.

## Josh's answers (23 Nov 2026, on cards)
- **G1:** "Approve (Recommended)".
- **Q1:** "Yes, counts 0 (Recommended)". A test moved unchanged into a `*.report.test.ts` file counts as 0 against the 15 per PR (counted with `git diff -M`).
- **Q2:** "Yes (Recommended)". `npm run gate:full` also runs the reports.
- **Q3:** "Yes, planner does all (Recommended)". The folder rule is waived for this ticket: the planner builds every section, section M's config and CI included, with one branch per PR (079a, 079b, 079c). The main session reviews M's CI and config changes like any other.
