# 078 · No long uninterrupted city tests: the test worker answers vitest at least every 10 s

owner: planner, with the folder rule waived for the files in the table below (Q1 option 1). Under Q1 option 2: the planner for section A, then each folder's owner for its rows in B.
status: open
branch: `ticket/078-test-yields` (Q1 option 1). Under option 2: `ticket/078a-yield-helper`, then one `ticket/078b-<folder>` per owner.

## Josh's words (23 Nov 2026, in chat)
Context: GitHub CI on `main` fails although all 223 test files pass, because vitest reports `[vitest-worker]: Timeout calling "onTaskUpdate"` (run 45197616087; the same error is in the local gate at fb8392a, `D:\rest-prototype-073gate\gate-fb8392a.txt`). He was shown option 2: "Split the longest test files into smaller ones, or give them short pauses between tests. That directly prevents the worker timeout and spreads the load across workers." He answered:
> "Cut tickets for options one and two"

Option 1 is ticket 077. He gives G1 before any build. Open PR #3 (one eraview test gets a 30 s timeout) is the other session's, and this ticket does not touch it.

## What the architect found (read 23 Nov 2026 on `design/077-078-test-speed` at 86ee932)

**Why the error happens (read in `node_modules/vitest` 3.2.7 and `@vitest/runner`).**
- The worker reports test progress to the main process with `onTaskUpdate`, sent at most every 100 ms (`sendTasksUpdateThrottled`). Each call is a birpc request with a **60 s timeout** (`DEFAULT_TIMEOUT = 6e4`) that starts when the worker sends it.
- The main process's reply can only be read when the worker's event loop reaches I/O.
- **Between tests in one file the runner awaits only promises (microtasks).** It never yields to the event loop. So a file made of synchronous tests runs as **one uninterrupted stretch**, however many tests it has, unless something in it waits on a timer.
- When the stretch ends, the reply and the 60 s timer are both due. Which one runs first depends on the event-loop phase, so the error is intermittent: it shows up on CI's slower runners, and sometimes locally.
- What matters is therefore **the longest stretch between two event-loop turns**, not the longest test. Two files already yield after or before each test: TR1's `afterEach` in `src/city/facades/stage.test.ts` and a `beforeEach` in `src/render3d/plan3d.test.ts`.

**The longest stretches today** (from the gate at fb8392a, `--maxWorkers=2`: per-file and per-test times; on CI, `ruin/named.test.ts` took 146.7 s against 114.5 s locally):

- With no yield, a file's stretch is its whole run. **35 files run longer than 10 s.** The worst: `ruin/named` 114.5 s, `facades/stage` 68.0 s (it yields), `ground/report` 47.5, `render3d/furniture` 42.2, `testing/namedcities` 39.3, `buildings/columns` 37.9, the five facades reports 29.7 to 35.6, `traffic/report` 33.5, `edge/kerb` 24.4, `holdout/named` 23.2, `buildings/report` 23.2 and `pipeline/named` 20.2.
- With a yield between tests, the stretch is the longest single test. **25 tests run longer than 10 s, in 15 files:**

| Row | File | Test (short name) | Gate (s) | What it loops over |
| --- | --- | --- | --- | --- |
| B1 | `src/city/ruin/named.test.ts` | F1b3: the hand-placed circuit reports | 70.5 (121.7 alone) | 4 pin cities × 2 `buildRuin` calls with a circuit, about 9 to 15 s **per call** |
| B1 | `src/city/ruin/named.test.ts` | builds the 20 named cities through the era runner | 30.9 | 20 cities: an era run and 2 `buildRuin` calls each |
| B2 | `src/render3d/furniture.test.ts` | pavement furniture on every map | 36.5 | the ladder maps |
| B3 | `src/city/facades/dressreport.test.ts` | prints the outside cities | 27.4 | outside cities, uncached |
| B3 | `src/city/facades/escapereport.test.ts` | prints the outside cities | 27.1 | outside cities |
| B3 | `src/city/facades/roofreport.test.ts` | prints the outside cities | 27.0 | outside cities |
| B3 | `src/city/facades/partyreport.test.ts` | prints the outside cities | 26.9 | outside cities |
| B3 | `src/city/facades/report.test.ts` | prints the outside cities | 26.1 | outside cities |
| B3 | `src/city/facades/stage.test.ts` | 4 tests over the 20 named runs | 19.0, 13.7, 13.6, 13.5 | 20 named runs |
| B4 | `src/city/ground/report.test.ts` | outside cities (3 × 3 and 6 × 4, seeds 1 to 20); the 20 named runs | 26.8, 20.6 | 40 outside cities; 20 named |
| B2 | `src/render3d/plan3d.test.ts` | the kerb on the line; ground wrappers; the full group; draws only (2) | 19.2, 13.5, 12.8, 12.0, 11.7 | 20 named runs, or the default and pin cities |
| B5 | `src/city/holdout/named.test.ts` | builds the 20 named cities through the era runner | 16.5 | 20 cities |
| B6 | `src/city/buildings/report.test.ts` | prints the outside cities | 13.6 | outside cities |
| B6 | `src/city/buildings/columnreport.test.ts` | prints the outside cities | 11.1 | outside cities |
| B2 | `src/render3d/terracepack.test.ts` | packTerrace over every run on every map | 12.0 | the ladder maps' runs |
| B7 | `src/city/traffic/report.test.ts` | outside cities 6 × 4, one-way on; and off | 11.1, 11.0 | 20 outside cities each |

Times are per test and leave out hooks. `src/city/traffic/` has `beforeAll` hooks in 5 files, and section A's log catches them too.

**The choice, per kind of file (decided here; Josh can overrule in Q2):**
1. **Every file: one short pause after every test**, the TR1 yield, registered once in a vitest `setupFiles` entry (`src/city/testing/yield.setup.ts`) instead of in 35 files one by one. This fixes all 35 "whole file is one stretch" cases, and any future file. It costs one timer turn per test: 4 908 tests at about 1 ms each is about 5 s of summed time, about 2.5 s of wall time on two workers. TR1's and `plan3d`'s own hooks stay as they are, because a second yield is harmless and the rule here is no test-file churn.
2. **Each test over 10 s: an awaited pause inside its loop**, between cities, maps or runs (`await yieldToWorker()`), with the test made `async`. No assertion, name, city list or count changes, and each stretch becomes one loop step (at most about 2 s, except B1's).
3. **Not a split into smaller files.** A split does not shorten a single long test, and these files share state between tests. `ruin/named.test.ts` fills `runs` and `pinned` in its first test and reads them in the next eight, so a split would have to rebuild that state in each new file and add file and collect overhead. Turning a loop over 20 cities into 20 tests would change the test count. The brief says the count stays, so that needs Josh's word (Q3).
4. **The one exception: B1's F1b3.** One `buildRuin(plan, rand, { circuit })` call takes about 9 to 15 s by itself. That is the ruin pass's own cost with a circuit, and no test-side pause can split one call. The pauses go between the calls (after `on`, after `off`, after each city), so its longest stretch is one call: about 15 s at worst locally, well under the 60 s timeout. Making that call faster is a ruin-pass code change, out of scope here (Q4).

**Why 10 s.** CI ran `ruin/named` 1.3 times slower than the local gate, and the rpc timeout is 60 s. With every stretch at 10 s locally, that leaves about 4.5 times headroom on CI, and about 3 times for B1's exception.

## Goal
`npm test` on GitHub CI finishes with no `onTaskUpdate` error. During a run, no test worker goes more than about 10 s (B1's single ruin calls excepted, at most about 15 s) without letting vitest's messages through. The tests, their assertions and their count are the same, and the full local gate passes as before.

## Sections

### A · The pause and the stretch log (planner)
Goes first.

Acceptance criteria:
- [ ] (Vitest, `src/city/testing/yield.test.ts`) `yieldToWorker()` resolves only after a macrotask: a `setImmediate` callback queued just before the call has run by the time the await returns.
- [ ] (Vitest) The setup file registers exactly one `afterEach` that awaits `yieldToWorker()`. A test proves the event loop turns between two synchronous tests in one file: a `setImmediate` queued in test 1 has run when test 2 starts.
- [ ] (Vitest) With `REST_STRETCH_LOG` unset, the stretch log starts no timer and writes nothing. With it naming a file, each test file appends one line: the file, the longest gap in ms between two event-loop turns (sampled by an unref'd 50 ms interval timer, cleared in `afterAll`), and the name of the test or hook running when the gap began.
- [ ] (Vitest, from 076's guard) The new files in `src/city/testing/` import only `vitest`, node built-ins, `src/core/` and `src/city/`, and none mentions `.biome`. The existing import test in `namedcities.test.ts` must still pass unchanged.
- [ ] `vite.config.ts` gains one line, `setupFiles: ["src/city/testing/yield.setup.ts"]` under `test` (Q2). Nothing else in it changes. No `testTimeout`, `hookTimeout`, pool or worker setting.
- [ ] (Builder) Runs `npx vitest run --maxWorkers=2 src/city/testing/` once and one `npx tsc --noEmit`. No full gate, no dev server, no browser.

Files: `src/city/testing/` (new files `yield.ts`, `yield.setup.ts`, `stretch.ts` and their tests) and the one line in `vite.config.ts`.

### B · The pauses inside the long tests (after A merges)
Each row adds `async` to the named tests and `await yieldToWorker()` between loop steps, plus the import. Nothing else changes.

| Row | Owner (Q1 option 2) | Files |
| --- | --- | --- |
| B1 | ruin-pass | `src/city/ruin/named.test.ts` (both tests; F1b3 also between its `on` and `off` calls) |
| B2 | renderer | `src/render3d/furniture.test.ts`, `plan3d.test.ts` (the 5 tests), `terracepack.test.ts` |
| B3 | facades | `src/city/facades/dressreport.test.ts`, `escapereport.test.ts`, `roofreport.test.ts`, `partyreport.test.ts`, `report.test.ts`, `stage.test.ts` (the 4 tests) |
| B4 | landscape | `src/city/ground/report.test.ts` |
| B5 | holdout-pass | `src/city/holdout/named.test.ts` |
| B6 | buildings | `src/city/buildings/report.test.ts`, `columnreport.test.ts` |
| B7 | streetscape | `src/city/traffic/report.test.ts` (and any `beforeAll` hook in `src/city/traffic/` that section A's log shows over 10 s) |

Any other test or hook that section A's log shows over 10 s, in the main session's run on A's result (C, second criterion), is added to its folder's row before B starts. The architect re-cuts the table, and it does not grow without being written down.

Acceptance criteria, every row:
- [ ] (Reviewer, from the diff) In each file touched, the only changes are imports, `async` on the named tests or hooks, and `await yieldToWorker();` lines between loop steps. No `expect`, `it`, `describe`, test name, timeout, threshold, pin, city list or loop bound changes. The count of `expect(` and of `it(` in each file is unchanged.
- [ ] (Reviewer) No pause is placed inside a step whose state the next line reads half-built. Pauses go between whole iterations, or between whole calls in B1.
- [ ] (Vitest) The row's files pass with the same test count, each file run once by the builder with `REST_STRETCH_LOG` set (`npx vitest run --maxWorkers=2 <file>`, one file at a time). No full gate, no browser.
- [ ] (Builder report) Each touched file's longest stretch before (from C's run on A's result) and after, from that log. Each is at most 10 s, except B1's single `buildRuin` calls, each reported with its number.

Files: the row's files only.

### C · Measure and CI (main session)
- [ ] (Before A starts) The full gate on `main` (with #3 merged, if it has merged by then), alone on the machine, `--maxWorkers=2`, with `--reporter=default --reporter=json`: the wall time, the test count, and every file's and test's time. This is the "before". With no yield in most files, a file's stretch there is its whole run.
- [ ] (After A merges, before B starts) The same run on A's result with `REST_STRETCH_LOG` set. It lists every stretch still over 10 s once the pause after each test is in, and so fixes B's table (see B's note on re-cutting).
- [ ] (After the last B row) The same run on the result: **no file's longest stretch over 10 s**, apart from B1's single calls, each under 20 s. The test count is the same plus exactly the tests section A adds. Every pin and digest test passes unchanged. The wall time is reported. Expected: within a few seconds of before, plus about 2.5 s for the pauses, minus whatever 077 or L2d removed meanwhile.
- [ ] (CI, after #3 is in `main`) A PR from the branch to `main`: the GitHub Actions run is **green twice in a row**, the first run and one re-run of the same commit, and `gh run view <id> --log` contains no `onTaskUpdate` in either.
- [ ] Nothing global loosened: no `testTimeout` or `hookTimeout` change anywhere, no per-test timeout added or raised, no test skipped, no city dropped. The one config change is A's `setupFiles` line.
- [ ] Load: one heavy step at a time. The two measuring runs are never run together or alongside a builder, reviewer or playtester run, and always at `--maxWorkers=2`.

## Files
- A: `src/city/testing/` (new files only) and one line of `vite.config.ts`.
- B: the test files in B's table, and nothing else. No non-test `.ts` file, no stage code, no `src/core/`.

## Interfaces
No new `src/core/` types. Test support, in `src/city/testing/`, which no stage imports:

```ts
// src/city/testing/yield.ts
/** Resolves after one macrotask (setTimeout 0), so the worker reads vitest's replies. */
export function yieldToWorker(): Promise<void>;

// src/city/testing/yield.setup.ts: a vitest setup file
// afterEach(() => yieldToWorker()); and, when REST_STRETCH_LOG names a file, starts the stretch log (stretch.ts)

// src/city/testing/stretch.ts: node:fs, node:perf_hooks only
/** Off unless REST_STRETCH_LOG is set. Samples event-loop gaps; one line per test file at afterAll. */
export function startStretchLog(file: string): { readonly stop: () => void };
```

`vite.config.ts`: `setupFiles: ["src/city/testing/yield.setup.ts"]` under `test` (Q2). **No new dependency.** `node:perf_hooks` and `node:fs` are built-ins, and `afterEach` / `afterAll` in a setup file are vitest 3 features that are already installed.

## Open questions (for Josh)
- **Q1, who builds section B.**
  - **Option 1 (recommended, cheaper in tokens and time):** the planner does A and all of B on one branch, because each B row is a handful of `async` and `await` lines. This needs Josh's word to waive the CLAUDE.md rule "Each agent stays in its folder" for the files in B's table and this ticket only, as he did for 076 (Q1, "Yes to all recommendations"). The reviewer checks B row by row in one review.
  - **Option 2 (no rule waived):** A by the planner, then seven rows by seven owners (ruin-pass, renderer, facades, landscape, holdout-pass, buildings, streetscape), each on its own branch with its own review.
- **Q2, the one setup-file line in `vite.config.ts`.**
  - **Option 1 (recommended):** one `setupFiles` entry gives every test file the pause after every test, at about 2.5 s of wall time. It is one line in a file with no owner (076 Q2's precedent), and it covers future files too.
  - **Option 2:** no config change. The TR1 `afterEach` line is added by hand to the 35 files over 10 s instead. That is more files touched, and a new long file is not covered.
- **Q3, one test per city instead of a loop.** Recommended: **no**. The count stays as the brief asks, and the in-loop pause gives the same stretch. If Josh prefers per-city tests (clearer failures, one test per city in the report), the count rises by about 19 per converted loop and that needs his word.
- **Q4, the ruin pass's slow call with a circuit (B1's F1b3: about 9 to 15 s for one `buildRuin` call, four times slower than without a circuit).** Recommended: **leave it** for now. It stays under 20 s, which is well inside the 60 s limit. A ruin-pass ticket could profile it when K2's real circuit lands, because by then every named run will have a circuit, and this cost will matter for every era build and not just one report.

## Not in this ticket
- Ticket 077 (the 3D view's cache and the old tile tests). It is independent, and either may go first. 078 is the one that fixes CI.
- PR #3's eraview timeout (the other session's).
- Raising vitest's rpc timeout. It has no supported config option, and it would loosen a check.

## Within approved scope?
Yes, once Josh gives G1. It is test support and test-body pauses only. No stage, pass, schema, pin, Decided rule or dependency changes. No rule in "Rules carried over" is touched, so `tickets/rules-coverage.md` is unchanged.
