# 070 A4c stop: 3 x 3 seed 10 finds no split with one-way streets on

Pipeline designer, 20 Nov 2026, on `ticket/070a4c-park-places` at aa2aa72. This is a sketch probe; the builder's numbers are the record. Nothing here is decided. Josh's answers go at the top of this note.

## 1. What is wrong

The probe reproduces the builder's misses exactly (3 x 3 s10, one-way on, 65 draws: S3 7, S4 17, S5 53, V1 38, S11 2, V2 8).

1. **S11 rejects the only two draws that pass everything else.** With one-way on, 2 of 65 draws pass S1 to V2. Both leave Land 1 park place where 2 are needed:

   | Draw | Blocks | One-way streets | Small (served) | Large | Places / needed |
   | --- | --- | --- | --- | --- | --- |
   | 3 (A4b took it) | 10 | 1 | 1 (1) | 0 | 1 / 2 |
   | 17 | 10 | 2 | 0 | 1 | 1 / 2 |

   With one-way off, 3 draws pass (11, 37, 52), all with 2 or 3 places. A4c takes draw 11.
2. **S5 and V1 are not one-way's doing.** They miss as often with one-way off: S5 55 and V1 46 (off), against 53 and 38 (on). A 3 x 3 split rarely makes Ts: on average 0.75 to 1.2 inner Ts of about 4.5 inner junctions, off or on.
3. **What one-way adds is S4 (1 miss off, 17 on) and S3 (1 off, 7 on).** A one-way cut is 3 or 4 cells, not 5. That leaves a piece of 17 cells or more, which is cut again. Then 10 to 12 blocks share a 40 x 46 cell outline, and the mean block depth (or width) drops under 10 cells (S4's `BLOCK_MEAN_MIN_CELLS`). All 17 S4 misses are this; none has a side outside 6 to 16.
4. **So it is a thin pass rate, not one bad rule.** Over 256 draws, 3 x 3 s10 has 17 good draws one-way off (6.6%) and 12 on (4.7%). At 4.7%, 65 draws all miss about 4% of the time (an estimate from that rate). Over all 40 cities x 256 draws, one-way on halves the share of draws that pass S1 to V2 (15.0% off, 7.5% on). S11 then rejects 10% of those (off) and 8% (on).

**The two cities outside the named list are not S11:**

- **3 x 3 s19, on:** no draw of 65 passes S1 to V2 (S5 51, V1 36, S4 15, S3 14), so S11 is never reached. The first good draw is 78.
- **3 x 3 s12, off:** its outline is 40 x 40. Every one of 1024 draws cuts it into today's 3 x 3 grid: 9 blocks, 4 crossroads, 0 Ts, so S5 always fails. With one-way on it is ok (draw 31). It was in A4b's note already.

## 2. Options, measured

"Moved" counts named cities whose draw changes. Stage 1's pins are 3 x 3 s1, s2, s3 and 6 x 4 s1, all one-way on.

| Option | Named, on | Named, off | Draws moved / pins moved | 3 x 3 s19 on | 3 x 3 s12 off | What stops it |
| --- | --- | --- | --- | --- | --- | --- |
| As built (65 draws) | 12 / 13 | 13 / 13 | none | fails | fails | s10 on |
| **A. 129 split draws** (new `SPLIT_DRAWS_MAX` 128) | **13 / 13** (s10 at draw 89) | 13 / 13 | **0 / 0** | ok (78) | fails | nothing named; s12 off is structural |
| B. One-way choice retried 4 times on each split, before the next | 13 / 13 (s10 at draw 11, retry 2) | 13 / 13 | 9 of 13 on / 3 of 4 | ok | fails | moves most named plans and three pins |
| C. One-way choice retried up to 7 times, only after all 65 draws fail | 13 / 13 (s10 at draw 3, retry 4) | 13 / 13 | 0 / 0 | ok (13, retry 6) | fails | a second search after the first; reads close to a fallback (R-2) |
| D. Count more blocks as places | 12 / 13 | 13 / 13 | none | fails | fails | see below: no reading within Land's rules gives s10 a second place |
| E. S11 a guard that never fails (best draw kept) | stage 1 ok on 13 | 13 / 13 | 0 / 0 | fails | fails | s10 on takes draw 3 (1 of 2), so V4 fails in B3: the stop moves to Land |
| F. `ONE_WAY_SHARE` 0.1 / 0.2 / 0.3 | s10 ok at 39 / 39 / fails | 13 / 13 | the draw alone moves on 9, 7 and 6 of 13 on, and every plan's one-way choice changes / pins move | ok at 15 / 60 / fails | fails | moves most plans; the A4 pre-check showed other failures follow |
| G. One-way off (share 0) | n/a | 13 / 13 | every "on" plan goes | n/a | fails | removes what A4b built at Josh's request |
| H. Leave s10 on failing | 12 / 13 | 13 / 13 | none | fails | fails | pins a named city as an exception (R-2) |

**On option D.** Draw 3 has one small block (served) and no large one. Draw 17 has one large and no small. Counting an unserved small block adds nothing (draw 3's is served; draw 17 has none). A large block is already one place; it cannot hold two parks under Land's rules. Draw 3 has one medium block with a short side of 10. A half park there leaves 10 - 5 = 5 cells built, under Land's 6 (`COURT_PART_MIN_CELLS`). A short side needs 11 cells to leave 6, and 11 cells is exactly "large". So every relaxation that would help is a change to Land's park rules, not to S11's count.

**On option A's margin.** It needs no rule change, only a number. In 1024 draws, 3 x 3 s10 on passes on 48 (4.7%) and s19 on on 84 (8.2%). The fewest good draws of any 3 x 3 city in 256, one-way on, are s12's 1 (it still finds draw 31) and s8's 11. Any draw limit is a matter of odds. 128 is the smallest power of two that covers s10's draw 89. Picking it for that reason fits a number to a named city, which only Josh's own words can allow.

## 3. Recommendation, and what it costs

**A: a split-only draw limit, `SPLIT_DRAWS_MAX` 128 (129 draws), with `BLOCK_DRAWS_MAX` left at 64.**

- `BLOCK_DRAWS_MAX` is also the old lattice's limit (`blockSizes`, R-9). `tilecity.test.ts` pins it at 64, so it must not change. A4c's criterion 2 ("within the same `BLOCK_DRAWS_MAX` (64, unchanged)") is re-worded to the new constant.
- **Moves nothing merged:** no named city's draw changes, one-way on or off, so A4c's four pins stand. No rule or threshold changes.
- **Fixes** 3 x 3 s10 on (draw 89) and s19 on (78).
- **Leaves** 3 x 3 s12 off failing: no draw limit helps it. It is outside the named list and fails one-way off only. It is an honest R-2 failure, reported, not pinned.
- **Cost:** a failing city now tries 129 draws before it throws, not 65 (about twice the time of today's failing run, an estimate; not timed).

**C is the second choice** if Josh would rather not raise a number. It also moves nothing named. It is a new search order, though, and close to the "no fallback" line of R-2.

## 4. Questions for Josh

1. "3 x 3 seed 10 with one-way streets on finds no street plan: in 65 tries only 2 pass every street rule, and both leave room for 1 park where 2 are needed. Should stage 1 try up to 129 street plans instead of 65, with a limit of its own (128 more tries), leaving the old grid's limit at 64? It changes no other named city's plan. (Yes / No)"
2. "If No: should stage 1 instead, only after all 65 tries fail, try the one-way choice again on each plan up to 7 more times (A), take one-way streets off (B), or leave 3 x 3 seed 10 failing with one-way on (C)? (A / B / C)"
3. "3 x 3 seed 12 with one-way streets off never finds a plan with enough T-junctions: its square ground always cuts into a plain grid of crossroads (0 of 1024 tries). It is not a named city. Leave it as an honest failure, reported and not pinned? (Yes / No)"

## 5. What the orchestrator does for each answer

- **Q1 Yes:** the architect re-cuts A4c criterion 2 with `SPLIT_DRAWS_MAX` 128 (Josh's words quoted) in `src/city/streets/constants.ts`. `BLOCK_DRAWS_MAX` stays 64 for `blockSizes`. The builder resumes on this branch: `laySplit` and `split.test.ts` read the new constant. It reports s10 on at draw 89, and pins stand. Then the A4 pre-check re-run, as A4c criterion 4 says.
- **Q2 A:** the architect cuts the retry (sub-draw keys for "oneway", "bare" and "flow", 7 retries, only after the 65 draws miss). The builder resumes; pins stand. **B:** A4b's one-way streets are turned off by `ONE_WAY_SHARE` 0; the pins are re-taken; the pre-check re-runs one-way off only. **C:** R-2 is changed for that one city, in Josh's words, in the ticket; B3 must then not assume it.
- **Q3 Yes:** the architect adds a line to A4c's report criterion: 3 x 3 s12 off is a known stage 1 failure outside the named cities. **No:** a design note on how stage 1 cuts a square outline (with its own pre-check), before B3.

## 6. Not verified

- The retries (B, C) are my sketch: sub-draw keys `"<draw>.<k>"` for "oneway", "bare" and the flows, with the "split" keys unchanged. A one-way choice changes cut widths, so the cut places can move too.
- Option A's numbers come from running the built loop longer. The probe did not change any constant in the repo.
- No picture was looked at. Land, Mass and Edge were not run on the new draws (the pre-check re-run does that).

## 7. The probe

`C:\Users\Josh\AppData\Local\Temp\claude\d5f474b7a5a52e12\c96b25ec-f0db-4c0d-8fac-f82300d945b2\scratchpad\a4cprobe`

- A copy of `src/core` and `src/city` at aa2aa72, with `node_modules` linked to the worktree.
- `src/city/streets/split.ts` has `probeSplit`: the built loop, reporting every draw. It has a draw limit, retries of the one-way choice, and park-place counts (small, served, large, medium). `split.orig.ts` is the branch's file.
- Runs, each alone with `npx vitest run --maxWorkers=2`: `probe/one.test.ts` (the three cities' draws, `one.json`), `probe/levers.test.ts` (every option on the 40 cities, `levers.json`), and `probe/rates.test.ts` (pass rates over 256 draws, the outlines).
