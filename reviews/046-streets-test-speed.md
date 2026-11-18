ticket: 046-streets-test-speed
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Remove the 3000 ms wall-clock assertion from the streets "centre lines" purity test so CI and Josh's loaded PC go green. Keep the purity and determinism check, don't lose any tests, touch only `src/render3d/streets.test.ts`.

## Does the branch do it?
- **Wall-clock assertion removed, test renamed:** yes. `src/render3d/streets.test.ts:167` drops `performance.now()` and the `toBeLessThan(3000)`, and the test is now "is pure and deterministic on every map". No `performance`/`Date.now` remains in the file.
- **Purity and determinism unchanged:** yes. The loop body (`townLayout(load(f))`, then `dashLayout(town)` twice, `toEqual`) is unchanged.
- **Test count does not shrink:** yes. The file still has 12 tests (I ran `npx vitest run --maxWorkers=2 src/render3d/streets.test.ts` and all 12 passed). No other test was touched. The diff is 1 file, +1/-3.
- **Builder timing report:** this goes in the builder's report, not the branch, so I can't check it here. No timing script was committed, which is correct.
- **Builder ran only the named commands:** I can't check this from the branch. Nothing in the diff contradicts it.
- **CI green after merge:** the main session checks this after merge. See Could improve 1 for a risk to it.

## Rule conflicts and risks
- No hard-rule conflicts: the change is one test file, inside the ticket's scope, with no source, dependency or GDD rule touched.
- Risk: Vitest's default per-test timeout is 5000 ms, and `vitest.config.ts` sets no `testTimeout`. The test took 2358 ms on my run. The ticket says the same loop took about 4.2 s on the GitHub runner, and that figure included the removed assertion. That leaves under 1 s of margin under the default timeout, which is the same kind of tight timer the ticket exists to remove. On a slower runner it could fail as a timeout instead of an assertion.

## Must fix
none

## Could improve
1. In `src/render3d/streets.test.ts`, give this one test a loose per-test timeout, e.g. `it("is pure and deterministic on every map", () => { ... }, 30_000);`, with a comment that it only catches a runaway loop. This fits the ticket's own allowance for a ceiling of at least 30 000 ms, stays in the one allowed file, and removes the hidden 5 s limit so the ticket's goal (CI green under load) holds. I strongly recommend doing it before merge.
