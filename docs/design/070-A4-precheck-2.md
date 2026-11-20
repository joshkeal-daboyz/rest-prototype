# 070 A4 pre-check, re-run after Josh's answers

## Josh's answers (20 Nov 2026, in chat)

- Q1 (stage 1 redraws a split that leaves a block no kerb place): after a worked example (3 x 3 s9's corner block), Josh answered: "No, we need to stop basing these tests on a 3x3. Start basing them on 6x6 or greater." So lever K is not adopted.
- Q2 (the first pass as a best fit over the city): "yes" (lever M).
- Q3 (3 x 3 s12 an honest failure, reported, not pinned): "3x3 seeds are too small. They're going to result in regular failures because they cannot accommodate for all of changes I suggested. Yes".
- The named cities: asked which cities the new named list should be (6 x 6 seeds 1 to 10 plus 8 x 8 seeds 1 to 3 suggested), he answered "6x6". Asked whether the default city should become 6 x 6 seed 1, he answered "yes".

So the named cities become 6 x 6 cities only (the orchestrator's reading: 6 x 6 seeds 1 to 10, the default being 6 x 6 seed 1), replacing the default 3 x 3, 3 x 3 seeds 1 to 10 and 6 x 4 seeds 1 to 3. 3 x 3 and 6 x 4 runs become outside cities: reported, not required. Every stage is measured again on the new list before D1b.

Pipeline designer, 20 Nov 2026, on `ticket/070a4-split-plan` at 85c7236 (A4, A4b, A4c merged; `T_SHARE_MIN` 0.30). This is a sketch probe. The builders' numbers are the record. Nothing here is decided. Josh's answers go at the top of this note.

**What was run.** B3, C3 and D1b as the ticket now cuts them (d9314cf onward), on stage 1 as built:

- S6 on lanes, drives and frontage lots;
- the served park, read as A4c's `farBand`;
- side-list lookups in Land, Mass and Edge;
- one band per (side, across entry);
- P3's cap over the whole block side;
- the band scan kept inside the street's span;
- P1's floor at 0.69.

It was run on the 13 named cities and the 27 outside them, one-way off (`oneWayShare` 0) and on (0.4). Stage 1's draws match A4c's stop note, section 0, on all 26 named runs.

## 0. Verdict: holds with one-way off; with one-way on as built, 2 named cities fail P1

| | One-way off | One-way on, as built |
| --- | --- | --- |
| Named cities passing every check | **13 / 13** | **11 / 13** (P1 fails on 3 x 3 s9 and 6 x 4 s2) |
| V3 alleys (have / need, tightest) | 3/3 (3 x 3 s3) | 3/3 (3 x 3 s8) |
| V4 parks (have / need) | equal on all 13 | equal on all 13 |
| M4a, M3, M4b, M5, G2, G3 | 0 failures | 0 failures |
| P2 stalls / wanted | 0.93 to 1.14 | 0.95 to 1.22 |
| R1 (floor 0.88), lowest | 0.895 (3 x 3 s1) | 0.884 (3 x 3 s8) |
| S6: mouths left facing a junction | 0 | 0 |
| P1 supply (floor 0.69), lowest | **0.699** (3 x 3 s2) | 0.730 (3 x 3 s3) |
| P1 blocks without a kerb tile | 0 | 1 on 3 x 3 s9, 1 on 6 x 4 s2 |
| P3, P4, P5 violations | 0 | 0 |
| P6 peak (cap 6 per 100 m) | 3.33 | 3.24 |
| Kerb-cut throws | 0 | 0 |
| Outside the list (27) | 26 pass. 3 x 3 s12 fails in stage 1 (S5; Q16, open) | 25 pass. 3 x 3 s19: supply 0.646. 6 x 4 s7: a park without a tile |

**Margins.** 3 x 3 s2 with one-way off clears P1's new floor by 0.009 (45 bays for a demand of 64.3; 0.69 needs 44.4). R1 on 3 x 3 s8 with one-way on clears 0.88 by 0.004.

**So one-way streets cannot stay on as built.** They can stay on with the two changes in section 2: all 13 named cities then pass, one-way off and on.

## 1. What is wrong (one-way on only); two causes, both new kinds

1. **3 x 3 s9 (draw 3): a block with no place for a kerb tile.**
   - Block 0:0 is a corner block, 6 cells wide.
   - Its own parking bands are on its two 6-cell sides (z:0 and the one-way z:1). P3's cap there is floor(0.3 x 6 / 2) = 0 tiles.
   - Its other two streets give it nothing. x:0 parks on the outer side only. x:1 is a bare one-way street (no band). Across z:1, the one-way's only band is on 0:0's own side.
   - So no allocator can give it a tile. S10 does not catch it: the block has own bands, but they are too short to hold a bay.
2. **6 x 4 s2 (draw 1): the first pass's order.**
   - Block 2:2 has two own bands (13-cell sides on z:3 and z:7), each with a cap of 1.
   - Its other two sides face one-way streets whose bands are on the far side. Those stretches are 2 and 3 cells long, too short for a tile.
   - The ownless blocks 0:2 and 6:2 go first in the first pass. They take the only tiles of 1:2 and 4:2. Then 1:2 and 4:2 take 2:2's two tiles from across the street, so 2:2 is left with none.
   - A different assignment gives every block a tile (section 2, lever M). This is the D1 pre-check's mechanism again, made worse by one-way streets.

**Outside the list (information only, nothing designed for them):**

- **6 x 4 s7, one-way on:** a whole park is "served" by a 6-cell stretch whose cap is 0. The served-park rule counts a band that can hold no tile.
- **3 x 3 s19, one-way on:** supply is 0.646, below 0.69.

## 2. Options, measured (one-way on; the off column is shown so nothing regresses)

"Moved" counts named cities whose stage 1 draw changes. Stage 1's pins are 3 x 3 s1, s2 and s3 and 6 x 4 s1. 3 x 3 s9 is not pinned.

| Lever | Named, on | Named, off | Draws moved | Outside (on / off) | What it changes |
| --- | --- | --- | --- | --- | --- |
| As cut | 11 / 13 | 13 / 13 | none | 25 / 26 | |
| K. Stage 1 redraws a split that leaves a block no kerb place (sketch: an own band on a side with a cap of 1 or more and room for a tile, or such a band across a street facing it) | 12 / 13 (6 x 4 s2 fails) | 13 / 13 | 1 (3 x 3 s9 on: draw 3 to 15) | 25 / 26 | A new stage 1 rule, beside S10 and S11. Re-opens stage 1 (A4c's files). No pin moves |
| M. The first pass as a best-fit matching (blocks to band stretches; each stretch holds its room, each block side its cap; own bands listed before across) | 12 / 13 (3 x 3 s9 fails) | 13 / 13 | none | 25 / 26 | D1's first pass (its order, not its rule: every block still takes one tile before any takes a second). Bays change on 3 x 3 s1 off (60 to 57, supply 0.93 to 0.88), 3 x 3 s5 off (66 to 69), 3 x 3 s9 on and 6 x 4 s2 on. Edge's pins are re-taken in D1b anyway |
| **K + M** | **13 / 13** | **13 / 13** | 1 (3 x 3 s9 on) | 25 / 26 | Both of the above. Lowest supply 0.699 (off) and 0.730 (on), as before |
| O. Own-band round first (every block on its own bands, then across) | 10 / 13 | 12 / 13 | none | 21 / 18 | Worse: blocks with many bands take tiles their ownless neighbours needed |
| One-way off (`ONE_WAY_SHARE` 0) | n/a | 13 / 13 | every "on" plan goes | 26 | Removes what A4b built at Josh's request |

Not measured: raising P3's cap to 1 tile on a 6-cell side. A 10 m tile on 30 m of kerb is 33%, over the 30% cap, so that is a threshold change.

## 3. Recommendation, and what it costs

**K + M. One-way stays on.**

- **K is a stage 1 rule** (call it S12, or an extension of S10: "every block has a kerb place").
  - It moves only 3 x 3 s9 with one-way on (draw 3 to 15). No pin moves, and no threshold changes.
  - It re-opens stage 1 for one held rule, as A4c did, with a failing fixture: a 6-wide corner block whose long sides face a bare one-way street and an outer edge.
- **M re-words D1's first pass.** The rule Josh approved ("every block takes one tile before any takes a second", option B of the D1 pre-check) stays. What changes is how each block's first tile is chosen: a matching over all blocks, own bands first, instead of block by block.
  - It goes into D1b as a new criterion.
  - No threshold changes. Edge's pins move, and D1b re-takes them anyway.
- **B3 and C3 hold as cut.** Start them now; neither depends on the answers.
- **D1b holds as cut with one-way off.** With one-way on, it needs M (and K in stage 1).

## 4. Questions for Josh

1. "With one-way streets on, 3 x 3 seed 9 has a corner block whose only parking sides are 6 cells long, too short for a bay under the 30% cap, and its other streets park away from it. Should stage 1 redraw a split that leaves a block no place for a kerb bay, as it already does for bare one-way streets (Yes / No)?"
2. "With one-way streets on, 6 x 4 seed 2 has one block left with no kerb bay, because its neighbours take its only two first. Should the first pass hand out every block's first bay as a best fit over the whole city (own street first), instead of one block at a time (Yes / No)?"
3. "If No to either: turn one-way streets off, which then holds on all 13 cities (A), or keep them on and leave those cities failing, which the stop rule forbids unless you say so (B)?" (A / B)

## 5. What the orchestrator does for each answer

- **Q1 Yes:** the architect cuts the rule into stage 1 (A4c's files: `streets/check.ts`, `split.ts`, a failing fixture). The builder reports 3 x 3 s9 on at draw 15 and that the pins stand. **No:** see Q3.
- **Q2 Yes:** the architect adds a criterion to D1b (the first pass as a matching, with a failing fixture modelled on 6 x 4 s2's block 2:2). **No:** see Q3.
- **Q1 and Q2 Yes:** B3, then C3, then D1b, as planned. D1b's stop rule expects 13 / 13 both ways.
- **Q3 A:** the architect sets `ONE_WAY_SHARE` 0 in stage 1 (Josh's words quoted). Stage 1's pins are re-taken. B3, C3 and D1b run as cut. **B:** R-2 is changed for those cities in Josh's words, in the ticket.
- **In every case** B3 and C3 can start now.

## 6. Not verified

- K and M are sketches of rules the architect has not worded. My matching is a simple augmenting search, not a proven maximum. On these cities it gives every block a tile.
- "Bays changed" is a proxy (bay counts per city). Tile positions may also move on other cities.
- No picture was looked at.

## 7. The probe

`C:\Users\Josh\AppData\Local\Temp\claude\d5f474b7a5a52e12\c96b25ec-f0db-4c0d-8fac-f82300d945b2\scratchpad\a4probe2`

- **What it is:** `src/core` and `src/city/streets` from 85c7236 (line endings made LF). Land, Mass, Edge and the pipeline come from the first probe (c938c9c; those folders are unchanged since then).
- **What it changes:**
  - `probe.ts`'s served park now reads as `farBand`;
  - P1's floor in `edge/constants.ts` is 0.69;
  - `split.ts` gains `PROBE_HOOK` (lever K);
  - `edge/band.ts` gains `matchFirst` (lever M) and `ownRound` (lever O).
- **Runs,** each alone with `npx vitest run --maxWorkers=2`:
  - `probe/rerun.test.ts`, output `rerun.json`;
  - `probe/levers.test.ts`, output `levers.json`, summarised by `probe/summ.cjs`;
  - `probe/why.test.ts`.
