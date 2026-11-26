ticket: 081-Y3-harness-floor
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
Replace the "scripts" case's `IDS.length >= 17` floor in `tests/playtest/playtest.test.ts` with two checks. The first is that `IDS` is not empty. The second is that the `sNN-` series runs from s01 to the highest present with no gap and no doubled number, and fails by naming the numbers. The aim is that at a release the harness fails by name when a series stage goes missing or is doubled. The cut named the case the old floor missed: every series stage deleted, with 17 ids left and the old floor still passing.

## Does the branch do it?
The commit (cd768a8) touches only `tests/playtest/playtest.test.ts`, and within it only the "scripts" case. 1 case is rewritten and none is added.

**Y3.1, the floor replaced: partly.**
- The empty check is as specified: `expect(IDS.length, "no city puzzles under puzzles/city/").toBeGreaterThan(0)`.
- The series check groups ids by `/^s(\d\d)-/` and names the missing and doubled numbers as `sNN` in one `toEqual({ missing: [], doubled: [] })`, so a failure reads by name. Pilots (`01-` to `16-`), `city-two-ways-round` and `tb-two-clocks` do not match the pattern and are not counted. On the current `puzzles/city/` (s01 to s10, all present once), it gives `{ missing: [], doubled: [] }`.
- The gap is in the bound: `const top = Math.max(0, ...seen.keys())`. With no `sNN-` id at all, `top` is 0, `missing` is [] and the case passes. The builder reports this himself. It is the exact case the ticket's "Where it comes from" gives as the reason for Y3: "The floor would still pass if every series stage were deleted". If s01 to s10 were all deleted, `IDS` would still hold the 16 pilots and `city-two-ways-round`, so the new check passes just as the old floor did. The criterion says the series runs "from s01", and the goal says the harness "fails by name when a series stage goes missing". A check that accepts a series with no s01 meets neither. This defeats the aim, so it is must-fix 1.
- A smaller limit, inherent in "to the highest present": deleting only the top stage (s10 today) passes too. The criterion allows this. Pinning a fixed top would need an edit as N3 to N5 land, which the goal rules out. So it is not a finding.

**Y3.2, not run on this branch: met.** I ran only `npx tsc --noEmit -p tests/playtest/tsconfig.json`, which exited 0. I did not run `npm run playtest` or the playtest config. The case first runs at the next release Josh calls.

## Rule conflicts and risks
- No `src/`, `puzzles/`, `tools/`, `playtests/`, `ladder.ts`, `replay.ts` or `__snapshots__/` change. No dependency, and no Decided rule touched.
- The case cannot be run until a release, so the empty-series gap would only show when someone reads the code. That is one more reason to close it now.

## Must fix
1. `tests/playtest/playtest.test.ts`, the "scripts" case: the series must start at s01 even when no `sNN-` id is present. Change `const top = Math.max(0, ...seen.keys());` to `Math.max(1, ...seen.keys())`, or an equivalent. Then a `puzzles/city/` with no series stages fails with `missing: ["s01"]` instead of passing. Nothing else changes: the present s01 to s10 still give `{ missing: [], doubled: [] }`, pilots and `tb-` puzzles are still not counted, and no edit is needed as stages are added. Re-run only the playtest typecheck.

## Could improve
1. The comment above the check could say that a deleted top stage is not caught by design (the top is "the highest present"). Then nobody reads the check as a guard on the series' length.
