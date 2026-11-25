ticket: 081-W1-building-targets
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
The fit and the city check (`tools/`) gain W0's rules as Josh answered them. Every city lamp sits on a building, fed by its drop. Every line reads outward (`READ_BACK_M` 3 m, with ring lines measured from where they take power). No job roof span comes within `FEED_CLEAR_M` 6 m of the feed's pole or its entering span (the far-end reading), and no two job spans cross. The fit applies these rules inside the search and gains `--avoid`.

## Does the branch do it?
Round 2. Round 1 is in this file's history (commit c6ab9d8). The builder's fix is a89e13e, which changes only `tools/fit.test.ts` (6 lines, no new case). I read the diff against `origin/main`; the local `main` is stale. `npx vitest run --maxWorkers=2 tools/fit.test.ts`: 15 passed, 6.6 s total, 4.3 s of tests.

Criteria 1, 2, 4, 5, 6, 7 and 8 are unchanged since round 1 and still met (see round 1). Criterion 9 is the builder's reply, not the branch, so the main session should check it.

**Criterion 3, the round 1 must-fix: not fixed.** The new `apart` search takes pairs that share no pole, and keeps only those where `distToSegment(at.get(E.a), R.a, R.b) < FEED_CLEAR_M`. In `job(E, R, true)`, `E.a` is where the feed is placed. So every pair it finds is a roof span within 6 m of the **feed's pole**. `feedClearance` then fails it on its first term (`dist = distToSegment(F, ra, rb)`), and the over-the-span term `segDist(ra, rb, ea, eb)` is never needed. I checked this by mutating the code. I changed `tools/fit.ts` line 208 to `if (shared === undefined) return dist;`, which removes the over-the-span branch. Then I ran `-t "criterion 3"` and it passed. I restored the file with `git checkout tools/fit.ts`, and the worktree is clean. So the test still cannot see the case Josh raised (P2a's 03): a roof span passing over the entering span away from the feed's pole. The new test name says it covers that case, but it doesn't.

The sharing-pole pass half and the crossing half are unchanged and real.

Count: 5 `it(` added against main, 0 rewritten. The fix added none.

## Rule conflicts and risks
- No change to `src/grid/` or `src/night/`, no dependency, nothing outside the listed files.
- Carried from round 1, not blocking: a roof span that shares the feed's **own** pole always fails at 0 m, so a second line out of the feed may be refused. That may occur, not checked. It is Josh's or the architect's call if a pilot hits it.

## Must fix
1. `tools/fit.test.ts`, the criterion 3 case's `apart` filter: pick a pair the over-the-span branch alone must fail. That means no shared pole, the roof span crossing or within `FEED_CLEAR_M` of the entering span (`crossesInPlan(R.a, R.b, E.a, E.b)` or the segment-to-segment distance), **and** `distToSegment(at.get(E.a)!, R.a, R.b) >= FEED_CLEAR_M`, so the span is clear of the feed's pole. Expected effect: with line 208 of `tools/fit.ts` reduced to `return dist;`, the case fails. Same case count.

## Could improve
1. The criterion 3 "passes" half could assert that the found span's far end is at least `FEED_CLEAR_M` from the entering span, so the threshold is tested directly.
2. `check.ts` runs `cityCheckProblems` twice. A one-line comment on why the first, lenient pass is there would help the next reader.
