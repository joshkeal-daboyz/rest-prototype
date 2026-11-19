ticket: 061-fire-escape-rank
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Replace 058's per-block coin toss for fire escapes with a map-level, pure choice (`escapeBlocks`). It gives exactly `ceil(share x qualifying)` escapes, ranked by `stableHash(key + "escape")`, never on two neighbouring blocks of a run, and reports a truthful `escapeShort` when the neighbour rule cannot reach the target. The share is the map's R7 floor: 0.5 on the ladder and 0.4 on the tile city. How an escape is built (058) does not change, and the rest of a block's dressing does not change either.

## Does the branch do it?
Reviewed `git diff 0e11827 5ba3e68` in the gate worktree. The gate is green: tsc clean, 2534 passed, 11 skipped, 15 more tests than the base.

1. **A pure selection: met.** `escapeBlocks(sites, share)` and `escapeRank` are in `src/render3d/escapes.ts`, which has no three import and no `src/render` import. `dressTown` runs `probeEscapes` and then `escapeBlocks` before it dresses any block. It passes `run.escape = chosen.has(i)` into `dressBlock`, which now returns no escape when `run.escape === false`.
   - The probe is `dressBlock(..., probe=true)` with `escape: true`. It stops right after the escape is decided, so `hosts` means "would really show one". The escape computation does not read `used` or anything later in the block, so the probe's pieces match the real pass.
   - `expectGuarantee` checks that the chosen count, the built-escape count and the qualifying-with-escape count all equal `target`. Only chosen blocks can get an escape, so the built set is the chosen set.
2. **At least the floor: met.** `escapes.test.ts`, "the guaranteed share…", covers the default tile city, 3x3 seeds 1 to 20 and 6x4 seeds 1 to 10 at 0.4, and the three protocol maps at 0.5, with `escapeShort` 0 and chosen = target. The fixture sweep (shares 0.4 and 0.5, 1 to 4 runs, 1 to 12 blocks, uniform and mixed lengths, 192 cases) asserts exact target, no shortfall and no neighbours.
3. **No two neighbours: met.** `adjacent` is checked on every real map and `neighbours()` on every fixture.
4. **Deterministic: met, with a substitute.** Each map is chosen twice and the two choices are deep-equal. `tilecity.ts` is off limits, so the blockLens-key half is replaced by re-keying every lot key (`k0 + "~"`). That changes the rank's own input directly, asserts `moved > 0`, and R7 stays at or over the floor. The floor across different layouts, which is what a blockLens key change would produce, is already covered by the 30-seed sweep. I count this as honest evidence.
5. **The worst case: met.** One run of 12 at 0.5 gets 6 with no neighbours (alternation is forced). A 5-run fixture is built so that greedy takes positions 1 and 3. It is repaired to exactly {b0, b2, b4}. A 6-run even case is repaired to 3.
6. **Failing fixtures: met, with a substitute.** 057 F's first key cannot be reproduced without editing `blockLens`. The test copy of the 058 coin toss (`dressUnit(key,"escape") < 0.6`, none after an escape) runs on 400 nine-block maps.
   - It asserts that some maps fall under 0.4. It also asserts that the rank choice holds the floor on every one of the same maps.
   - The copy is faithful to the old rule. The under-floor result is not trivial: with p = 0.6 and alternation, three or fewer of nine is common.
   - The shortfall fixture has 10 qualifying blocks, 3 of which can host (indices 0, 4, 8). It gives target 5, chosen {q0, q4, q8} and `escapeShort` 2, and its share is under 0.5.
   - Both "the check fails" claims are a direct share comparison, not `evaluateCity` (could improve 2).
7. **The callers: met.** `cityApplyOptions` returns `escapeShare: TILE_CITY_R7_MIN` (`tilecity3d.ts`). `applyModels` forwards it to `dressPlacements` and then `dressTown` (`models3d.ts:1283`). The puzzle path passes `{}`, so it uses `ESCAPE_SHARE_LADDER`.
   - `tileintegrate.test.ts` pins the option's value and checks R7 from the applied dressing on the puzzle path and on the tile cities.
   - The existing R7 tests in `tilecity.test.ts` (around line 1248 and the test at 1289) still pass. They call `dressTown` with no option, so they run the tile city at 0.5 rather than 0.4. They still read the real dressing with no tuned key.
8. **Ladder maps unchanged apart from escapes: met by the code; the test is weaker than the wording.**
   - The protocol maps get exactly `ceil(0.5 q)`.
   - With no option, `dressTown` deep-equals the run at 0.5.
   - Blocks with an escape are compared with and without it, and differ only in escape pieces and that column.
   - From the code: a block that has no escape runs exactly as before (`escape` is null and nothing is reserved). `RunUsed` only loses `escapePrev`, and the ATM, billboard and novelty threading are untouched. A block that had an escape before and still has one gets the same dressing. `accept` is all-or-nothing against a sum cap, so if roof props plus the escape weight fit in the old order, each roof group still fits when the escape reserves its column first.
   - The test leaves out the whole escape column, where the criterion says "its ground row". See could improve 1.
   - The playtest snapshot part is the main session's and the playtester's.
9. **Guide: met.**
   - 16.11 has the Decided bullet with Josh's words and the how-many, which-blocks, shortfall, placed-first and Info bullets. 16.5 points to 16.11.
   - In the Numbers table, `P_ESCAPE` is gone and `ESCAPE_SHARE_LADDER` is added. The 055 R7 entry under "Decided, not yet built" is updated.
   - The one existing check edited in `styleguide.test.ts` is the 16.11 tag check's ticket pattern (`058` became `(058|061)`). That is the edit the criterion allows.
   - The extra Numbers row `NO_USED | 0 x 0 x 0` is forced by the records-of-numbers drift check, because `NO_USED` now holds only numbers. It is in `docs/`, which is in Files, so it is acceptable.
10. Screenshots are the main session's job.
11. The diff stays inside Files. `tilecity.ts`, `citymetrics.ts`, `townpin.test.ts`, `tests/`, `puzzles/` and `src/core` are untouched.

**The algorithm (question 1).** I traced `escapeBlocks`:
- **Runs.** Segments are runs of hostable, qualifying blocks in run order, and a non-hosting block of the same run closes the segment (`open.delete`). Blocks of other runs in between do not break it.
- **Capacity and goal.** `capacity = Σ ceil(len/2)` is the true maximum under the neighbour rule, because a path holds at most ceil(k/2) non-neighbouring picks. `goal = min(target, capacity)`.
- **Greedy pass.** It picks in rank order, with `order` breaking ties, so equal hashes are still deterministic.
- **Repair.** It re-lays each segment below ceil(k/2) with a full alternation. Odd lengths start from index 0. Even lengths start from the better-ranked end. Each re-laid segment holds exactly ceil(k/2), and `count += want - have` stays exact because greedy can never put more than ceil(k/2) in a segment. After every segment is repaired, count = capacity ≥ goal.
- **Trim.** The surplus is removed from the worst-ranked picks. Removing a pick can never create neighbours.
- **Result.** Chosen = goal exactly, and `escapeShort = max(0, target − capacity)`, which is truthful.
- **Target rounding.** `ceil(share*q − 1e-9)` stops 0.4 x 15 = 6.000…01 from rounding up to 7, and R7's check already allows 1e-9.

I found no off-by-one and no re-lay that breaks the neighbour rule.

**The rank pin (question 4).** `escapeRank` is FNV-1a over `key + "escape"`. The test asserts it equals `stableHash` on five keys (empty, short, tile, terrace and puzzle-lot shapes), so any change to either function would fail it.

**058 invariants (question 6).**
- The escape is built exactly as before: `planEscape`, the ladder to the walk, the code-drawn fallback and the weight by 052's piece count.
- The ground row stays plain whenever an escape is decided.
- The existing "every escape of the town passes the check" tests run on the new choice through `dressTown`'s default and pass.
- Escapes are still on a mid, non-door, non-corner column with a roof.

**CI safety.** The new tests use the file's fixture `ENTRIES`, and the `SET` in `tileintegrate` comes from a fixture manifest and a stub GLB. Puzzle JSON is read inside `it`. No asset reads at describe level, no Windows paths, and the timeouts are generous (300 s).

## Rule conflicts and risks
- No `src/grid/`, `src/night/` or `src/core/` change, no new dependency, no locked puzzle touched, and no threshold loosened. `CITY_CHECK.R7` and `TILE_CITY_R7_MIN` are unchanged.
- **The gallery changes visibly.** `dressStack` treats a lone block as chosen, so every qualifying gallery cell (`gallery.ts:702`) now shows an escape, where the coin toss showed one on about 60%. This matches criterion 1 and the guide ("a block dressed alone counts as chosen"), but the ticket does not name it as an intended change. Josh may notice it.
- **The town can go over `DRESS_MAX`.** Chosen escapes are kept past the cap, so the town's total can now exceed `DRESS_MAX` by the remaining escapes' pieces. The ticket asks for this. The old "whole town ≤ DRESS_MAX" test now runs at share 0, and a new test checks that non-escape pieces stay at or under the cap. This is an escape-case edit in `dressing.test.ts`, which the ticket allows, not a loosened check.
- **A narrow difference from 058.** A block that would have lost its escape to `DRESS_PER_BAY_MAX` under 058 now keeps the escape and drops that column's later roof props instead. The ticket asks for this ("never drop one"). It is the one way a block's escape column could change above the ground row. I do not expect it on today's pack, because the escape weight is at most 3 or 4 and the roof props are at most 3.

## Must fix
none

## Could improve
1. In `escapes.test.ts`, "a block with an escape differs … only in its escape pieces and its escape column", compare the escape column's pieces above the ground row too. Exclude only `slot === "escape"` and the ground-row shop pieces of that column (glass, awning, sign), so roof props in the escape column are pinned as the criterion words it. Then fix the guide's Info sentence to match: it now says "its escape column's pieces", which is looser than criterion 8's "ground row".
2. In the criterion 6 tests, run the share through `evaluateCity`, or through the same R7 item that criterion 2's check uses, instead of a hand-written `share < floor`. That way "the check fails on it" is literally the check.
3. In `tileintegrate.test.ts` "stands at least the tile floor…", assert `withEscape === ceil(0.4 x qualifying)`. At `>= 0.4` the test would also pass if `applyModels` dropped the option and dressed at 0.5, so the forwarding is not really pinned.
4. In `dressing.test.ts`, about line 535, an empty `if (…) { }` was left where `escQual` and `escHit` were counted. Remove it.
5. `tilecity.test.ts` (about lines 1248 and 1286) still dresses the tile city at the ladder share, and its comment still cites `P_ESCAPE`. That file is outside this ticket's Files, so record it for the next tile-city ticket rather than changing it here.
6. Tell Josh about the gallery's change to one escape on every qualifying cell (see Rule conflicts and risks).
