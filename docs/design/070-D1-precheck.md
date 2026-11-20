# 070 D1 pre-check: the parking band on the pipeline's mass

Pipeline designer, 20 Nov 2026, on `goal/city-style` at 50c7f27 (A1, A2, A3, B, B2, C1, C2 merged). This is a sketch probe. The builder's numbers are the record.

## 1. What is wrong: D1 as written does not hold

**The premise is out of date.** D1 criterion 4 says P1 to P6 "hold there on the old path at 2edac93", so a move holds them too. That stopped being enough when C2 merged. Demand now comes from `mass.units`, and C2's shop count runs about 25% above the old path's on every city. On the default city it is 214 shops against 171, so demand is 71.3 bays against 57.

| Check | Named cities passing (D1 as written) | Where it breaks |
| --- | --- | --- |
| P1 | **11 of 13** | 6 x 4 seed 1: P1 = 2 (block:2:0, block:4:1 get no bay). 6 x 4 seed 2: P1 = 1 (block:1:2 gets no bay) |
| P3, P4, P5 | 13 of 13 (0 violations on all 40 cities run) | none |
| P6 | 13 of 13 (at most 3.46 bays per 100 m; the cap is 6) | none |

In both failures, P1's supply band still holds: supply/demand is 0.84 and 0.93, and the floor is 0.75. The only failing term is "blocks with no tile".

**Cause (one mechanism, measured).** The greedy order serves the blocks with the fewest own parking sides first. A block with four own sides goes last. By its turn, each neighbour has already overflowed onto the band that faces it, across the street. Here is how block:4:1 on 6 x 4 seed 1 ends up with nothing:

- It has four bands, each 7 to 9 cells long. The 30% share caps each one at 1 tile.
- Blocks 4:0, 4:2, 3:1 and 5:1 each took that one tile first.

With the old demand, the neighbours stopped before they overflowed. With 25% more demand, they do not.

**Levers, measured alone and combined (P1 failures on the 13 named cities):**

| Lever | Named P1 fails | Min supply/demand (named) |
| --- | --- | --- |
| Old path (old shops, old kerb cuts) | 0 | 0.96 |
| Pipeline kerb cuts only (old shops) | 0 | 0.96 |
| Pipeline shops only (old cuts) | 1 (6 x 4 s1) | 0.84 |
| **D1 as written (both)** | **2 (6 x 4 s1, s2)** | 0.84 |
| D1 as written, without the street drives' cuts | 1 (6 x 4 s1) | 0.84 |

So the shop count is the main cause. C2's drives add 6 x 4 seed 2: there, neither lever alone fails, and the two together do. There are 7 street drives on the default city, and 4 to 21 per named city.

**Kerb cuts (criterion 1) are well posed:**

- Every mouth cell of every vehicle opening has a pavement cell in front of it: 0 misses on 40 cities.
- Every cut that has a parking cell behind it makes that cell plain.
- The other cuts face a street side with no parking band. Behind them is a traffic lane, so there is nothing to make plain.
- Cuts per city: the default has 24 on the pipeline against 22 on the old path. That is 7 street drives x 2, plus 5 lanes x 2 mouths.

## 2. Options, measured

| Option | Named passing | Numbers | What stops it |
| --- | --- | --- | --- |
| A. D1 as written | 11 / 13 | P1 2 and 1 on 6 x 4 s1, s2 | R-2 stop rule: the builder would stop |
| B. Add a first pass: every block gets one tile (own sides first, else across its longest street) before the greedy pass | **13 / 13** | P3 to P6 unchanged (0; P6 at most 3.46). Min supply/demand 0.757 (3 x 3 s5), floor 0.75 | It is a change to the allocator, and D1 says "Nothing is added to it". It is Q6's fix, which is Josh's call. The margin on 3 x 3 seed 5 is thin |
| C. Demand as the old path counted it | 13 / 13 (the "cuts only" row) | min 0.96 | Not buildable: the old count comes from the old path's terrace lots. It would re-open C2 criterion 1, the units of record |
| D. Pin 6 x 4 s1 and s2 as exceptions | n/a | n/a | Forbidden by R-2. Only Josh's own words could allow it |

Not measured, because it would be a threshold change: a lower `PARK_PER_SHOP`, or a larger kerb share.

**For information only: the old-path P1 shortfall list.** These are 3 x 3 seeds 11 to 20 and 6 x 4 seeds 4 to 20. The old path at HEAD reproduces the 2edac93 list exactly.

| Path | 3 x 3 failing | 6 x 4 failing |
| --- | --- | --- |
| Old path | 12, 15, 17, 18, 19 | 5, 7, 11, 12, 15, 16, 18 |
| Pipeline, D1 as written | 12, 15, 17, 18, 19 | 5, 7, 9, 12, 15, 16, 18, 19 (11 passes; 9 and 19 join; named 1 and 2 also fail) |
| Pipeline, option B | 12, 15, 17, 18, 19 | 5, 12, 15, 18 |

**Named cities, per city:**

| City | Old P1 | Old bays/demand | D1 P1 | D1 bays/demand | B P1 | B supply/demand | Cuts old / pipe | Drives (on a street) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3 x 3 s1 (default) | 0 | 57/57 | 0 | 63/71.3 (0.88) | 0 | 0.88 | 22 / 24 | 11 (7) |
| 3 x 3 s2 | 0 | 54/51 | 0 | 54/64 (0.84) | 0 | 0.80 | 20 / 18 | 12 (5) |
| 3 x 3 s3 | 0 | 57/51.3 | 0 | 60/62.3 (0.96) | 0 | 0.82 | 20 / 24 | 11 (7) |
| 3 x 3 s4 | 0 | 60/55 | 0 | 66/66.7 (0.99) | 0 | 0.94 | 22 / 28 | 12 (6) |
| 3 x 3 s5 | 0 | 54/54.7 | 0 | 60/71.3 (0.84) | 0 | 0.76 | 22 / 18 | 11 (4) |
| 3 x 3 s6 | 0 | 66/68 | 0 | 84/89.3 (0.94) | 0 | 0.94 | 26 / 22 | 15 (5) |
| 3 x 3 s7 | 0 | 51/51.3 | 0 | 63/63.7 (0.99) | 0 | 0.94 | 18 / 22 | 10 (7) |
| 3 x 3 s8 | 0 | 54/49.3 | 0 | 57/60.3 (0.95) | 0 | 0.85 | 18 / 24 | 11 (8) |
| 3 x 3 s9 | 0 | 57/54.7 | 0 | 63/68.7 (0.92) | 0 | 0.87 | 22 / 24 | 11 (7) |
| 3 x 3 s10 | 0 | 51/53 | 0 | 60/66.3 (0.90) | 0 | 0.90 | 18 / 22 | 11 (7) |
| 6 x 4 s1 | 0 | 150/153.7 | **2** | 162/193.7 (0.84) | 0 | 0.84 | 58 / 60 | 31 (17) |
| 6 x 4 s2 | 0 | 156/156.7 | **1** | 174/186.7 (0.93) | 0 | 0.90 | 54 / 68 | 32 (20) |
| 6 x 4 s3 | 0 | 165/166.7 | 0 | 192/203.7 (0.94) | 0 | 0.90 | 56 / 62 | 36 (16) |

## 3. Recommendation

Option B: put the first-tile pass into D1. This answers Q6 as "fix", for the named cities. Of the 40 cities run, it fixes 13 of 13 named and 31 of 40 overall. Without it, D1 stops on its own stop rule.

What it costs:

- **D1 is no longer a pure move.** Its bay positions differ from the old path on cities where both pass. While both paths exist, the two still agree on P1 on the named cities: both give 0.
- **The supply margin is thin:** 0.757 against 0.75 on 3 x 3 seed 5. If the builder's figure lands below 0.75, P1 fails there on the band term. The rule would then go back to Josh, not be tuned.
- **What does not move:** no merged section re-opens, no threshold changes, no digest pin moves (edge has none yet), and the old path is untouched (R-9).
- **Nine cities outside the named list still fall short.** They are reported, not pinned. Fixing them is not designed here.

## 4. Questions for Josh

1. "On the pipeline, two named 6 x 4 cities (seeds 1 and 2) leave a block with no kerb parking, because the new shop count is about 25% higher. Should D1 give every block its first kerb tile before the rest are shared out (Yes), or stop as written (No)?" (Yes / No)

## 5. What the orchestrator does for each answer

- **Yes:**
  - The lead-architect re-cuts D1. Criterion 2 becomes "moved, plus one first pass: a tile for every block, own sides first, else across its longest street". Criterion 4's premise is replaced with this note's numbers.
  - Q6 is recorded as answered "fix, in D1", with the residual list reported, not pinned.
  - The builder starts D1 from the re-cut. No other section re-opens.
- **No:** D1 cannot be built as written: it would stop on R-2 on 6 x 4 seeds 1 and 2. The orchestrator takes Josh one of two other routes:
  - re-open C2's shop count (architect, then a new pre-check);
  - change a threshold (`PARK_PER_SHOP` or the kerb share), which only Josh's own words can do.

## 6. The probe

`C:\Users\Josh\AppData\Local\Temp\claude\11ac1dc7c4963db6\47704da6-e428-4a70-bb56-b7ff758f9b44\scratchpad\d1probe`

- It is a copy of `src/` at 50c7f27, with `node_modules` linked to the repo.
- In its copy of `src/render3d/tilecity.ts`, a hook takes over three things just before the 056 allocator: the kerb cuts (from `mass.openings[].mouth`), the shops (from `mass.units`) and the whole parks (from `land.parks`, which are the same on all 40 cities). A `firstTile` switch turns on option B.
- `parkmetrics.ts` judges the result unchanged.
- Files: `probe/d1.test.ts` and `probe/levers.test.ts`, with their output in `probe/out.json` and `probe/levers.json`.
- Each was run on its own with `npx vitest run --maxWorkers=2`.
