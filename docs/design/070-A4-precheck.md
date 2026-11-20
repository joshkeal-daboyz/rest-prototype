# 070 A4 pre-check: Land, Mass and Edge on the split plan, one-way streets off and on

Pipeline designer, 20 Nov 2026, on `ticket/070a4-split-plan` at c938c9c (A4 and A4b merged into it; B, B2, C1, C2 and D1 as merged on `goal/city-style`). This is a sketch probe. The builders' numbers are the record.

Nothing here is decided. Josh's answers go at the top of this note.

## 0. Verdict: does not hold

**The re-cut's known content is not enough, and one part of it makes things worse.**

- **Mass holds.** With the two neighbour lookups read from the side list, M3, M4b, M5, G2, G3, R1 and P2 hold on all 13 named cities, one-way off and on, S6 off and on.
- **Land mostly holds.** V3 and M4a hold everywhere. V4 fails on 3 named cities with one-way on.
- **Edge does not hold.** P1 fails on 6 of 13 named cities (one-way off) and 7 of 13 (on), with D1b as the ticket cuts it. P3 to P6 hold everywhere.
- **D1b's per-stretch cap is the main cause.** It splits the kerb on the far side of a T into stretches, and caps each one on its own. A stretch under 7 cells then holds no bay. 72 of the 357 bands are that short (one-way off), 86 of 375 (on). The old rule capped the whole block side.
- **S6 costs nothing measurable.** It moves 44 vehicle mouths (one-way off) and 48 (on) off junction-facing stretches. No check moves because of it.

## 1. What is wrong: each cause in a sentence or two

1. **Merged code fails every run on the new plans.** Of the 26 runs (13 cities, one-way off and on), edge throws on 22. The cause is `band.ts`'s `colsOf`, `rowsOf` and `blockIdAt`, and `check.ts`'s outer test. The other 4 stop earlier: P2 on 3 x 3 s3 (off), and V4 on 3 x 3 s4, s8 and s10 (on). Mass's grid lookups do not throw, but they are wrong. With them, P2 fails on 3 x 3 s3 (off), and P1 counts 3 to 27 bays per city as served by a far block.
2. **P3 per stretch (D1b's text) starves the kerb.** S3 allows two Ts from opposite sides at 7 cells between centre lines. A4's placement lands on exactly 7 on 12 of 13 named cities. That leaves 2 cells of kerb between the two crossings. A stretch under 7 cells has a cap of floor(0.3 x len / 2) = 0. On 3 x 3 s2 (16 Ts, no crossroads), supply falls to 0.56 of demand.
3. **Some whole-block parks cannot be served.** A whole park has no kerb bays of its own (19.6). On some plans, all four of its streets carry their parking on the park's side, so no band across a street faces it. The park then gets no tile, so P1 fails. This happens on 3 x 3 s3 (2 parks), 3 x 3 s10 and 6 x 4 s1 (one-way off), and on 6 x 4 s2 (on).
4. **V4 is fragile on the split plan.** Land's parks need a small block (40 m or less) or a large one (short side 55 m or more). The split's pieces are 6 to 16 cells, and most come out medium or long. With one-way on, 3 x 3 s4, s8 and s10 have one park place for the two V4 needs. Outside the named cities, 4 of 27 fail V4 with one-way off, and 2 of 27 with it on. So this is the plan, not the one-way streets.
5. **Supply is room-bound on the most T-heavy plans.** Even with one cap per side, the 2-to-3-cell stretches between near-miss Ts have no room for a bay. 3x3 s2 stays at 0.70 (off) and 0.74 (on), and 3 x 3 s3 (on) at 0.73. The floor is 0.75.
6. **With one-way on, two blocks lose their tile to the first pass's order.** Their neighbours take each band's one tile first. On 6 x 4 s2 these are block:2:2 and block:9:1; on 3 x 3 s9, block:0:0. This is the D1 pre-check's mechanism. Short sides on one-way streets make it bite again.

## 2. Options, measured (S6 on, side-list lookups, named cities)

"Side cap" means one P3 cap per block side, shared by its stretches; that is what D1 as merged does. "Park" means Land puts a whole park only on a block with a parking band across one of its streets. "V4 guard" means stage 1 redraws a split that leaves fewer than ceil(blocks / 6) park places.

| Option | One-way off: pass | One-way on: pass | Lowest supply (off / on) | What still fails |
| --- | --- | --- | --- | --- |
| A. As merged (grid lookups) | 0 / 13 | 0 / 13 | n/a | Edge throws on 22 of 26 runs; the other 4 stop on P2 or V4 |
| B. D1b as cut (per-stretch cap) | 7 / 13 | 3 / 13 | 0.56 / 0.64 | P1 on 6 (off) and 7 (on) cities; V4 on 3 (on) |
| C. Side cap | 9 / 13 | 6 / 13 | 0.70 / 0.73 | P1 parks (off); V4, supply, order (on) |
| **D. Side cap + park** | **12 / 13** | 6 / 13 | 0.70 / 0.73 | off: 3 x 3 s2 supply 0.70. On: V4 on s4, s8, s10; supply on s2, s3; order on s9, 6 x 4 s2 |
| E. D + V4 guard | 12 / 13 | 8 / 13 | 0.70 / 0.73 | On: V4 fixed on s4 and s8, but s10 then finds no stage 1 draw in 65 (S5) |
| F. S3 gap 9, 10 or 12, or "two Ts leave 4 or 7 cells of kerb" | 0 to 1 / 13 | 0 / 13 | n/a | A4's cut placement then finds no draw with enough Ts: S5 or S3 fails on every named city |
| G. One-way share 0.1, 0.2 or 0.3 with D | n/a | 8 / 13 each | 0.73 | A different 5 cities each time (V4, supply). Any share above 0 draws new plans |

Supply is bays over demand; the floor is `PARK_SUPPLY_BAND.lo` 0.75. Every option keeps P2 to P6 at 0 violations. P6 peaks at 3.24 bays per 100 m (the cap is 6).

**Outside the named cities** (reported for information, not designed for): 3 x 3 seeds 11 to 20 and 6 x 4 seeds 4 to 20, 27 cities.

| Option | Off: failing | On: failing |
| --- | --- | --- |
| B. D1b as cut | 10 (V4 on 4, P1 on 6, one city both; 3 x 3 s12's stage 1 throw) | 11 (P1 on 9, V4 on 2, one city both; 3 x 3 s19's stage 1 throw) |
| D. Side cap + park | 6 (V4 x 4, 6 x 4 s16 supply 0.72, s12 streets) | 4 (V4 x 2, 6 x 4 s16 0.69, 3 x 3 s19 streets) |
| E. D + V4 guard | 2 (6 x 4 s16 supply 0.72, s12 streets) | 3 (3 x 3 s18 P1, s19 streets, 6 x 4 s16 0.69) |

The stage 1 throws on 3 x 3 s12 (off) and s19 (on) were in A4b's note already. They are stage 1's, not Land's.

**Per named city, P1** (failing terms; bays / demand = supply; S6 on, side-list lookups):

| City | Off, D1b as cut | Off, D | On, D1b as cut | On, D |
| --- | --- | --- | --- | --- |
| 3 x 3 s1 | 0 (0.93) | 0 (0.93) | **2** (0.79, 2 no tile) | 0 (0.97) |
| 3 x 3 s2 | **1** (36/64.3, 0.56) | **1** (45/64.3, 0.70) | **1** (0.69) | **1** (48/65, 0.74) |
| 3 x 3 s3 | **2** (0.79, 2 parks no tile) | 0 (0.97) | **1** (0.69) | **1** (54/74, 0.73) |
| 3 x 3 s4 | 0 (0.84) | 0 (0.89) | 0 (0.82) | 0 (0.86) |
| 3 x 3 s5 | 0 (0.91) | 0 (0.96) | 0 (0.78) | 0 (0.86) |
| 3 x 3 s6 | **1** (0.74) | 0 (0.84) | **1** (0.71) | 0 (0.78) |
| 3 x 3 s7 | 0 (0.86) | 0 (0.91) | 0 (0.86) | 0 (0.91) |
| 3 x 3 s8 | 0 (0.92) | 0 (0.97) | 0 (0.89) | 0 (0.89) |
| 3 x 3 s9 | 0 (0.81) | 0 (0.85) | **1** (0.79, 1 no tile) | **1** (0.79, 1 no tile) |
| 3 x 3 s10 | **1** (0.90, park no tile) | 0 (0.91) | 0 (0.80) | 0 (0.89) |
| 6 x 4 s1 | **1** (0.75, park no tile) | 0 (0.86) | **1** (0.79, 1 no tile) | 0 (0.88) |
| 6 x 4 s2 | **1** (0.73) | 0 (0.81) | **3** (0.64, 2 no tile) | **1** (0.78, 1 no tile) |
| 6 x 4 s3 | 0 (0.77) | 0 (0.84) | 0 (0.81) | 0 (0.84) |

**Per named city, Land and Mass** (S6 on; the last column is how many vehicle mouths S6 moves):

| City | Off: blocks, Ts / crossroads, P2 stalls / wanted | Off: alleys, parks (have / need) | On: blocks, P2 | On: alleys, parks | S6 moves (off / on) |
| --- | --- | --- | --- | --- | --- |
| 3 x 3 s1 | 9, 12/2, 66/66.8 | 5/3, 2/2 | 10, 78/70.9 | 5/3, 2/2 | 3 / 4 |
| 3 x 3 s2 | 9, 16/0, 72/63.9 | 5/3, 2/2 | 9, 72/67.3 | 5/3, 2/2 | 6 / 0 |
| 3 x 3 s3 | 9, 12/2, 78/64.8 | 7/3, 2/2 | 9, 66/69.5 | 4/3, 2/2 | 3 / 3 |
| 3 x 3 s4 | 9, 12/2, 78/72.7 | 7/3, 2/2 | 9, 78/74.3 | 4/3, **1/2** | 3 / 4 |
| 3 x 3 s5 | 9, 12/2, 72/69.1 | 5/3, 2/2 | 9, 66/70.0 | 4/3, 2/2 | 0 / 2 |
| 3 x 3 s6 | 10, 14/2, 102/95.4 | 6/3, 2/2 | 12, 90/92.3 | 6/3, 2/2 | 2 / 2 |
| 3 x 3 s7 | 9, 12/2, 72/63.0 | 5/3, 2/2 | 9, 72/63.0 | 5/3, 2/2 | 3 / 3 |
| 3 x 3 s8 | 9, 12/2, 66/58.3 | 4/3, 2/2 | 9, 66/66.4 | 4/3, **1/2** | 2 / 3 |
| 3 x 3 s9 | 9, 12/2, 72/67.5 | 5/3, 2/2 | 10, 78/70.2 | 6/3, 2/2 | 3 / 1 |
| 3 x 3 s10 | 9, 12/2, 66/63.2 | 6/3, 2/2 | 10, 84/69.1 | 7/3, **1/2** | 1 / 2 |
| 6 x 4 s1 | 24, 28/9, 210/196.4 | 14/6, 4/4 | 23, 198/204.3 | 14/6, 4/4 | 5 / 7 |
| 6 x 4 s2 | 25, 32/8, 186/187.0 | 15/7, 5/5 | 28, 204/200.0 | 12/7, 5/5 | 9 / 8 |
| 6 x 4 s3 | 26, 34/8, 198/202.9 | 9/7, 5/5 | 28, 216/217.6 | 17/7, 5/5 | 4 / 9 |

- **P2:** stalls over wanted run 0.94 to 1.22 (the band is 0.75 to 1.5). It holds on all 13, both ways. R1's lowest share is 0.895.
- **M checks:** M3, M4b, M5, G2 and G3 have 0 failures in every side-list run.

**The streets as A4b laid them** (`ONE_WAY_SHARE` 0.4 and `ONE_WAY_BARE_SHARE` 1/3 are PROVISIONAL, for Josh's eye):

- **One-way streets:** 36 over the 13 named cities, 7 of them bare (19%). S10 refused a bare street once each on 3 x 3 s6 and 6 x 4 s3.
- **Per city,** as street, cells, direction and length:
  - 3 x 3 s1: x:1 4 +x 49; x:4 4 -x 16; x:5 4 -x 16.
  - s2: z:2 4 +z 34.
  - s3: x:1 3 -x 35; x:4 3 -x 16.
  - s4 and s7: none.
  - s5: z:3 4 -z 32.
  - s6: x:2 4 +x 38; x:4 4 -x 38; z:2 3 -z 18.
  - s8: x:1 4 +x 51; z:1 4 -z 15.
  - s9: x:1 3 +x 20; x:3 4 -x 20; z:1 4 -z 54.
  - s10: x:1 4 +x 21.
  - 6 x 4 s1: x:2, x:3 (100, +x and -x); z:6 4, z:7 3 (-z, 17); z:8, z:9 (+z, 21 and 22).
  - 6 x 4 s2: x:2, x:3 (109, +x and -x); z:8 3, z:9 3 (-z); z:10 4 +z, z:11 4 -z (65).
  - 6 x 4 s3: x:3, x:4, x:5, x:6 (37 and 72, both ways); z:1, z:2, z:8, z:11 (4 cells).
- **S3's smallest gap** between opposite ends that do not line up: 7 cells on 12 of 13 named cities (8 on 3 x 3 s4) one-way off, and 7 or 7.5 on. That is exactly the floor.
- **S5's inner T share:** 0.57 to 1.0 one-way off, and 0.5 to 1.0 on.

## 3. Recommendation, and what it costs

1. **Keep P3's cap per block side (Q1: Yes).**
   - It is the rule D1 has today. Its threshold does not change.
   - It moves P1 from 7 to 9 of 13 (off) and from 3 to 6 (on).
   - D1b's text changes: "a band stretch between junctions, each with its own cap" becomes "each stretch is its own band, the cap is the block side's".
2. **A whole park only where a band across a street can serve it (Q2: Yes).**
   - It is a new Land rule, in B3.
   - It fixes 3 named cities (off) and does not move V4 on them.
3. **A V4 guard in stage 1 (Q3: Yes).**
   - It re-opens A4 for one held rule: a split must leave at least ceil(blocks / 6) park places.
   - Outside the named cities it cuts the V4 failures from 4 to 0 (off) and from 2 to 0 (on).
   - On the named cities with one-way on, it fixes 3 x 3 s4 and s8. On s10, stage 1 then finds no draw in 65.
4. **Supply on the T-heavy plans goes back to stage 1 (Q4: A).**
   - 3 x 3 s2's kerb is too short because its near-miss Ts leave 2-cell stretches. No allocator change gives it room.
   - Lowering the floor (B) would fit a threshold to one named city. That is what R-2 forbids, unless Josh's own words allow it.
   - A costs a re-design of A4's cut placement. Just raising S3's gap is measured not to work (option F): A4's placement then finds no draw on any named city. So A is a new design note and a new pre-check, not a number.
5. **B3, C3 and D1b do not start yet.** On every option measured, at least one named city fails, so each builder would stop on R-2. Their code content is known now (section 4) and does not depend on the answers, apart from Q1 and Q2.

**What it moves:** A4's held merge stays held. A4's four stage 1 pins move again under Q3 or Q4-A. No merged threshold moves under Q1 to Q3.

## 4. What B3, C3 and D1b must change (independent of the answers unless marked)

**B3 (land).**

- **S6 for lanes.** A lane's place keeps its two mouths off every `junctions` span on the two sides it opens on, plus `BAY_JUNCTION_CLEAR` (1) either side. B2's "no place, no alley" counts S6 too.
- **Measured:** V3 holds on all 13 both ways (alleys 4 to 17 against 3 to 7 needed), and S6 leaves no lane mouth on a junction-facing stretch.
- **Q2:** the served-park rule, if Josh says Yes.

**C3 (mass).**

- **S6 for drives and frontage lots** on street sides; a lane-side drive is not judged. M5 gains "no vehicle mouth faces a junction".
- **`lots.ts` line 180.** The neighbour across the longest street becomes each `across` block of that side, longest shared span first.
- **`check.ts` line 249 (P2's `adjacent`).** Two blocks are adjacent when one lists the other in a side's `across`.
- **Measured:** with grid lookups, P2 fails on 3 x 3 s3 (off). With side lookups, every mass check holds on all 13.

**D1b (edge).**

- **The band table** is built from `CityPlanBlock.sides`: one band per (block side, across entry). It spans that entry's span, on the row next to the block's pavement, and only where `ownBand` holds. An empty `across` is one band over the side's span.
- **The outer side of an edge street** is found from `CityPlanStreet.outer`: its parking cells in runs, facing "outer".
- **`sidesOfBlock`** lists one entry per (side, across entry). The first pass and the greedy pass read it unchanged.
- **The cap** follows Q1: per block side (recommended), or per stretch.
- **`check.ts`:**
  - `adjacent` (line 55) reads the side list.
  - The outer test (lines 125 to 130) reads `outer`.
  - **Not in the ticket: the band scan (lines 118 to 150) must run only over the street's own `span` and its own cells.** Today it walks the whole lattice line. On the split plan that line runs into other streets' pavements and lanes, and counts them as bad band cells (P5).
  - P3's share uses the same unit as the cap.
- **Measured:** every mouth cell gets its kerb cut on one-way streets too (0 throws). A bare one-way street has no band.

All three end with the grep test for `bi`, `bj` and `line`, as the ticket says.

## 5. Questions for Josh

1. "On a block side that faces a T, the kerb is in two stretches. Should the 30% cap on kerb bays count over the whole block side, as today (Yes), or over each stretch on its own, as the re-cut says (No)?" (Yes / No)
2. "Some whole-block parks get no kerb parking, because every street round them has its parking on the park's side. Should Land only make a whole park of a block that has a parking band across one of its streets (Yes / No)?" (Yes / No)
3. "Some split plans leave Land no place for its second park (V4 fails on 3 x 3 seeds 4, 8 and 10 with one-way streets on). Should stage 1 redraw a split that leaves too few park places (Yes / No)?" (Yes / No)
4. "On 3 x 3 seed 2 the kerb parking stays at 0.70 of demand (the floor is 0.75), because Ts that nearly line up leave kerb stretches too short for a bay. Re-design how stage 1 places its cuts so such Ts stand further apart, with its own pre-check (A), or lower P1's floor from 0.75 to 0.69 (B)?" (A / B)

## 6. What the orchestrator does for each answer

- **Q1 Yes:** the architect re-cuts D1b's P3 wording (cap per block side). **No:** D1b keeps per-stretch caps. Expect P1 failing on 6 or more named cities; a new pre-check is needed after Q4.
- **Q2 Yes:** B3 gains the served-park rule (the architect adds a criterion and a failing fixture: a small block whose four streets all park on its side takes no whole park). **No:** P1's park failures stay; they come back as a stop.
- **Q3 Yes:** A4 re-opens for one held rule (stage 1's `held`, with a failing fixture); stage 1's pins are re-taken. **No:** V4 failures stay possible on any plan; B3 would stop on them.
- **Q4 A:** a design note on A4's cut placement (Ts that do not line up leave room for a bay between them, with S5 still met), then the architect re-cuts A4 (A4c), then this pre-check runs again before B3, C3 and D1b. **B:** the architect writes the new floor into P1 (Josh's words quoted), and this pre-check is re-run once with it and Q1 to Q3. One-way on still fails on 3 x 3 s9, s10 and 6 x 4 s2 (order and V4 guard), so that run decides whether one-way stays on.
- **In every case** B3, C3 and D1b wait for the re-run, then branch from A4's branch as planned.

## 7. Not verified

- The probe's band table is my reading of D1b. P4 and P5 at 0 violations on every run show it matches the cells, but the builder's code is the record.
- The levers "side cap", "park", "V4 guard" and "kerb gap" are sketches of rules not yet worded by the architect.
- The first-pass order fix for the 3 one-way-on cities (s9, 6 x 4 s2) was not measured.
- No picture was looked at.

## 8. The probe

`C:\Users\Josh\AppData\Local\Temp\claude\d5f474b7a5a52e12\c96b25ec-f0db-4c0d-8fac-f82300d945b2\scratchpad\a4probe`

- **What it is:** a copy of `src/core` and `src/city` at c938c9c, with `node_modules` linked. Each lever is a switch in `src/city/probe.ts`.
- **What it changes:**
  - `land/plan.ts` (S6 on lane places; the served-park filter);
  - `mass/sites.ts` (S6 on street drives and frontage lots);
  - `mass/lots.ts` and `mass/check.ts` (grid or side-list neighbours);
  - `edge/band.ts` (the side-list band table; the side cap; diagnostics);
  - `edge/check.ts` (side-list adjacency, `outer`, the span-limited band scan, P3 per stretch or per side);
  - `streets/constants.ts` (S3's gap as a switch).
- **Files:**
  - `probe/measure.ts` measures one city. It runs Land, Mass and Edge directly, so every check is counted, not just the first throw.
  - The runs are `probe/asmerged.test.ts`, `main.test.ts`, `gap.test.ts`, `levers.test.ts`, `park.test.ts`, `best.test.ts`, `share.test.ts` and `kerb.test.ts`.
  - Their output is in `probe/*.json`.
- **How it was run:** each run on its own, with `npx vitest run --maxWorkers=2`. Each took under 3 s.
