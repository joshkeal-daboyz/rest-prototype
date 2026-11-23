ticket: 078-test-yields
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
Stop the intermittent `onTaskUpdate` rpc timeout by letting the test worker's event loop turn: one `afterEach` pause for every file through a vitest `setupFiles` entry (section A, with an opt-in stretch log), and an awaited `yieldToWorker()` between loop steps inside each long test in B's table. No assertion, name, timeout, pin, city list, loop bound or test count changes. This was a light check, as Josh asked on 23 Nov 2026: no gate or playtest. I ran only `yield.test.ts` and `tsc --noEmit`.

## Does the branch do it?
**Section A**
- `yieldToWorker()` resolves after a macrotask. `src/city/testing/yield.ts` uses `setTimeout(resolve, 0)`. The test "resolves only after a macrotask: a setImmediate queued just before has run" in `yield.test.ts` covers it. Met.
- The setup file has exactly one `afterEach`, and the loop turns between two synchronous tests. `yield.setup.ts` has `afterEach(() => yieldToWorker())`. The `yield.test.ts` tests "test 1 queues a setImmediate…" / "test 2 starts after the event loop has turned" prove the loop turns, and a text check counts one `afterEach(`. Met.
- The stretch log is off when unset and writes one line per file when set. `stretch.ts` returns a no-op `stop` before it creates any timer or touches `fs` when `REST_STRETCH_LOG` is empty. When the variable is set, it uses an unref'd 50 ms `setInterval`, cleared in `stop`, and `afterAll(() => log.stop())` calls `stop`. It writes one line, `file\tms\tname`, and is guarded against a double stop. Tests: "unset: starts no timer…" (spies on `setInterval`) and "set: appends one line…" (a 200 ms busy loop, asserting at least 190 ms, exactly one line, and the test name). Met. The unset test does not check for a file directly, but with an empty env there is no path to write to.
- Import guard: the existing test in `namedcities.test.ts` ("every non-test file in src/city/testing/ imports only…, and none mentions .biome") scans every non-test `.ts` in the folder, so it covers `yield.ts`, `yield.setup.ts` and `stretch.ts`. Those files import only `vitest`, `node:fs`, `node:perf_hooks` and each other. `namedcities.test.ts` itself is unchanged on the branch. Met (I did not run it).
- `vite.config.ts`: the only change is the `setupFiles: ["src/city/testing/yield.setup.ts"]` line plus a one-line comment above it. No timeout, pool or worker setting. Met.
- My run: `npx vitest run --maxWorkers=1 src/city/testing/yield.test.ts` gave 6/6 passed in 809 ms. `npx tsc --noEmit` came back clean.

**Section B, from the diff.** I filtered `git diff -U0 main...HEAD` outside `src/city/testing/`. After removing `+import { yieldToWorker } from …` and `+    await yieldToWorker();` lines, only two kinds of line remain:
- `it(` lines whose sole change is `() =>` becoming `async () =>`, each name byte-identical;
- the two `vite.config.ts` lines.

No `expect`, `describe`, name, timeout, pin, city list or loop bound changed, and no line was removed except the `it(` lines being re-made as async. So the `expect(` and `it(` counts are unchanged in every file.

Each pause sits at the top or the end of a whole iteration (cities, maps or runs), never between two lines that share a half-built value. In B1 (`ruin/named.test.ts`), the first test's pause comes after `ms` is measured, so the timing is unaffected. F1b3 pauses after `on`, after `off` and after each city, as the ticket asked. `stage.test.ts` keeps its own TR1 `afterEach`, as the ticket said it should.

Rows covered: B1, B2 (`furniture.test.ts` and the 5 `plan3d.test.ts` tests), B3 (the five reports and the 4 `stage.test.ts` tests), B4, B5, B6.
**Not covered:** B2's `src/render3d/terracepack.test.ts` (12.0 s in the gate) and B7's `src/city/traffic/report.test.ts` (11.1 s and 11.0 s). Nothing on the branch says those rows were dropped. The commit log has "B2 (1/3)" and "B2 (2/3)" but no 3/3, and no B7 commit. See Must fix 1.

**CI safety.** With `REST_STRETCH_LOG` unset, the setup file costs one `setTimeout(0)` per test and nothing else: no interval, no fs. The stretch test writes only under `os.tmpdir()` and removes its folder in `afterAll`. It has no Windows paths. Its one timing assertion is a lower bound on a 200 ms busy loop, so a slower runner can only make it pass more easily.

Section C's measuring runs and the two green CI runs are the main session's job. Josh waived the local runs. GitHub CI on the PR is the full run.

## Rule conflicts and risks
- Folders: B's files lie outside the planner's folder, but G1 Q1 waived that rule for exactly B's table. No file outside the table was touched, except `src/city/testing/` (A) and `vite.config.ts`. The `tickets/077…` and `tickets/078…` files in the diff come from the main session's G1-log merge, not the builder.
- `src/grid/` and `src/night/` are not touched. No new dependency. No GDD rule is involved.
- Risk: in a setup file, `expect.getState().testPath` is read at module top level. If it were ever undefined, the log would say "(unknown file)" and nothing would break. It only matters when the log is on.

## Must fix
1. B2's `src/render3d/terracepack.test.ts` ("packTerrace over every run on every map") and B7's `src/city/traffic/report.test.ts` (the two 6 × 4 outside-city tests) are rows in the ticket's table but are not on the branch. Either add the `async` and the `await yieldToWorker();` between loop steps in those tests, the same pattern as the other rows, or record in the ticket why they were left out (for example, if section A's log showed them under 10 s). Leaving them out unrecorded leaves part of B unmet. The risk to CI is small, since they run about 12 s against a 60 s rpc timeout and the setup `afterEach` already covers the gaps between tests.

## Could improve
1. The "unset" stretch-log test could also assert that no file appears in a temp folder, to match the ticket's "writes nothing" wording literally.
2. The comment line added above `setupFiles` in `vite.config.ts` goes slightly past "one line". It is harmless.
