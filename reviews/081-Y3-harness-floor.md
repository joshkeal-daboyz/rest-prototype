ticket: 081-Y3-harness-floor
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Replace the "scripts" case's `IDS.length >= 17` floor in `tests/playtest/playtest.test.ts` with two checks. The first is that `IDS` is not empty. The second is that the `sNN-` series runs from s01 to the highest present with no gap and no doubled number, and names the numbers when it fails. This is round 2. Round 1 found one must-fix: with no `sNN-` id present, the series check passed. Commit 0474c5d is meant to fix it.

## Does the branch do it?
The code diff against `main` is still one file, `tests/playtest/playtest.test.ts`, and only the "scripts" case in it. 1 case is rewritten and none is added. The branch also carries the round 1 review file.

**Round 1 must-fix 1: fixed.** Commit 0474c5d changes `Math.max(0, ...seen.keys())` to `Math.max(1, ...seen.keys())`. With no `sNN-` id, `top` is now 1 and `missing` is `[1]`, so the case fails with `missing: ["s01"]`. Deleting every series stage (17 non-series ids left) now fails by name, which was the case the ticket gave as the reason for Y3. The fix changes nothing else in round 1's reading.

**Y3.1, the floor replaced: met.**
- The empty check uses the ticket's message: `toBeGreaterThan(0)` with "no city puzzles under puzzles/city/".
- The series check groups ids by `/^s(\d\d)-/`. It checks every number from 1 to the top, and it lists each number seen more than once. Both lists come back as `sNN` in a single `toEqual({ missing: [], doubled: [] })`, so a failure names the stages.
- Ids without the `sNN-` form are not counted: the pilots, `city-two-ways-round` and `tb-two-clocks`. On the branch's `puzzles/city/`, s01 to s10 are each present once (I listed them), so the check gives `{ missing: [], doubled: [] }`.
- The check needs no edit when N3 to N5 add stages or a pilot is retired.

**Y3.2, not run on this branch: met.** I ran only `npx tsc --noEmit -p tests/playtest/tsconfig.json`, which exited 0. I did not run `npm run playtest` or the playtest config.

## Rule conflicts and risks
- No change to `src/`, `puzzles/`, `tools/`, `playtests/`, `ladder.ts`, `replay.ts` or `__snapshots__/`. No new dependency, and no Decided rule touched.
- This case runs only at a release, so the fix has only been checked by reading it and by the typecheck. That is what the ticket asks for.

## Must fix
none

## Could improve
1. (Carried from round 1, not taken up.) The comment could say that a deleted top stage is not caught by design, because the top is "the highest present". Then nobody reads the check as a guard on how long the series is.
