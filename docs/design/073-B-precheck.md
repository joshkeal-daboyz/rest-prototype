# 073 B pre-check: districts, stories, and T-1 and T-2 on the clean city

21 Nov 2026, pipeline-designer. Measured on `design/073-transformations`, whose `src/` is `goal/city-style` at 103ce43 (stages 1 to 5 and 7 to 9 merged; stage 6 not built). Not committed. Nothing here is decided until Josh says so in chat.

**This is a sketch.** A throwaway probe, outside the repo, ran the merged stages on the 20 named runs (6 x 6 seeds 1 to 10, one-way on and off). Stage 6 is not built, so the probe laid K1's CK1 to CK11 from `070-K1-circuit.md`'s words, as K1's pre-check did. On 6 x 6 seed 1 on, it gives K1's numbers: 562 poles (478 slots, 10 landings, 74 crossing poles), 126 corner spans, 250 drops, 386 lamp-post places and 291 switch places. Over the 20 runs it gives K1's 477 to 643 poles. The one difference is street lights: 95 to 124 a run, where K1's pre-check had 88 to 117, because its "none stands" skipped a few more. So the light numbers below are an upper bound. K2's and B's numbers are the record.

The district and story rules below are the probe's proposal (the ticket asks for one). Every number is measured on that proposal.

## 1. What holds, and what does not

- **Districts hold.** On 20/20 runs every block is in exactly one district, and each district has 1 to 4 blocks that touch across a street.
- **Stories hold** as proposed. Every value is in 0 to 1, and `wild` follows `held` closely (r = −0.97).
- **Jobs.** 329 of 348 districts can hold a job: a switch place, two buildings with drops, and a feed. Every district has open ground for a plant.
- **T-2 holds on the clean city.** On every run, each district's poles reach each other on foot.
- **T-1 does not hold on the clean city as worded, on 20/20 runs**, if it judges clean pieces too. There are three causes, all clean:
  1. **Drop ends under facade pieces.** Fire escapes and face signs stand over the first 2 m of a drop at 5.5 m, on 11 to 25 drops a run. These are the clashes Josh accepted on K1's card 1: "Leave the clashes". Window planters add 20 to 39 a run.
  2. **Street furniture on poles and lights, and tree canopies over wires.** This is stage 8 as merged, which keeps no distance from stage 6 yet.
     - K's planned I2, which re-runs stage 8 with poles and lights kept clear, clears the poles and lights to 0.
     - It leaves 8 to 22 pavement trees a run whose canopy is over a wire.
  3. **Lamp-post places.** 6 to 17 a run are under a tree or have a hydrant, bus stop, bollard or meter on them, even after I2. CK15's keep list holds poles and lights, not lamp-post places.
- **No pass is built,** so nothing here fails a pass. This is the case the ticket says goes to Josh before any pass, without tuning.

## 2. Districts (the proposed rule, and two others)

**The rule (A).**
- Take the blocks in a hashed order (`history:<seed>:order:<block>`).
- Each block not yet in a district starts one. Its size is hashed: 1 block 20%, 2 blocks 30%, 3 blocks 25%, 4 blocks 25%.
- It grows onto the free neighbour (across a street) with the longest shared stretch of street. On a tie, the least id.
- It stops at its size, or when no neighbour is free.
- Its id is `district:<least block id>`.
- It reads only `streets.blocks` (`sides[*].across`) and the hash. It reads no `bi`, `bj` or `line` (R-7).

| Rule | Districts a run (20 runs) | Sizes 1/2/3/4 blocks (all runs) | Single blocks with no free neighbour | Time a city |
| --- | --- | --- | --- | --- |
| **A. hashed 20/30/25/25** | **12 to 23 (348)** | **117 / 111 / 65 / 55** | **1 to 5 a run (52)** | **0.2 to 0.8 ms** |
| B. always try 4 | 9 to 14 (230) | 33 / 28 / 11 / 158 | 0 to 4 (33) | 0.2 to 1.9 ms |
| C. even 25/25/25/25 | 12 to 25 (358) | 141 / 94 / 67 / 56 | 0 to 5 (52) | 0.2 to 1.1 ms |

- The city has 31 to 47 blocks. A "single with no free neighbour" is a block whose hashed size was 2 to 4, but every neighbour was already taken.
- **Why A:** about a third of its districts are single blocks. K1's first jobs are one block (Josh, card 4), so the designer has 1-block districts on every city. The rest are bigger stories.
- The time is the `history` step only, the mean of 50 repeats. The clean build before it takes 0.8 to 2.8 s.

## 3. Stories (the proposed rule)

**The rule:**
- **`tech`.** The centre is the district holding the hashed-first inner block (a block with no side on an edge street). Each district's step is the fewest streets crossed from the centre district's blocks to one of its own. `tech` = 1 − step / (most steps + 1), ± 0.1 by hash.
- **`held`.** A hash u in 0 to 1. Where u < 0.25, `held` is 0: the district was left at once, so it gets no plant, and its feed is a pole just outside it (Q11, Josh). Otherwise `held` = (u − 0.25) / 0.75.
- **`wild`.** 1 − `held`, ± 0.15 by hash.
- Every value is rounded to 2 decimals and clamped to 0 to 1.

| | Over the 348 districts |
| --- | --- |
| `tech` | 0.05 to 1 (median 0.61, quartiles 0.41 / 0.78) |
| `held` | 0 to 0.99 (median 0.33); 91 at exactly 0 (1 to 10 a run), 118 under 0.1 |
| `wild` | 0 to 1 (median 0.65, quartiles 0.33 / 0.92) |
| `wild` against `held` | r = −0.97 |
| The most steps a city | 4 to 7 |

**How `tech` falls off from the centre** (the mean at each step):

| Step | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mean `tech` | 0.97 | 0.83 | 0.65 | 0.48 | 0.34 | 0.24 | 0.20 | 0.09 |
| Districts | 20 | 90 | 79 | 74 | 54 | 23 | 7 | 1 |

## 4. Jobs (Q6) and the plant's ground, per district

These come from the probe's sketch of CK12 on option A's districts. A pole belongs to the block whose pavement it stands on.

| Per district (348) | Result |
| --- | --- |
| Switch places (a pole with 3 or more attachments) | 0 to 47; median 10 to 21 a run. 8 districts have none |
| Breaker, fuse box and battery places (2 or more) | every district with a pole |
| Buildings with a drop (lamps) | 0 to 41. 19 districts have none |
| No pole at all | 5 districts, all single blocks: K1's blocks whose four sides face far pavements |
| `held` 0 and no crossing entering it (no feed anywhere) | 3 |
| **Can hold a job** (a switch place, 2 or more drops, and a plant ground or an entering crossing) | **329 of 348** (12 to 22 a run). Single blocks: 100 of 117 |
| **Largest open place** (court, park, frontage lot, plaza, in whole cells) | 8 to 128 cells, medians 30 to 64 a run. **0 districts have none.** It is a court in about 3 of 4 districts and a park in the rest. A lot or a plaza is never a district's largest |
| A held district (`held` above 0) with no open place | 0 |

- Whether a plant fits its place, and is reached on foot, is E1's pre-check, not this one.

## 5. T-1 on the clean city

**How "covers" was measured** (proposed for C1):
- **A solid piece** covers a pole, a street light or a lamp-post place when its plan footprint (its kit bounds at its placement, after its turn), widened by 0.15 m for the pole's own width, contains the point. Its height does not matter: a piece on the spot or over it both hide it.
- **A building's lamp place** (the drop's wall point) is covered when a piece whose top is over 5.5 m stands over any point of the drop's first 2 m from the wall.
- **A canopy** is a disc of half the tree key's wider bound. It covers a point within its radius (plus 0.15 m). It "closes over a pole line" when it meets an along, corner or crossing span in plan.
- **Wires never cover** (Q13, Josh).

The table has stage 8 two ways: as merged, and re-run with K1's poles and lights as its keep points, which is what K's planned I2 does.

| Point | Clean pieces over or on it, a run (20 runs) | After I2 (keep points: poles and lights) |
| --- | --- | --- |
| Poles | 5 to 18, every run: bollards, hydrants, bus stops, meters on the spot; pavement-tree canopies 0 to 7 | 0. But on 3 runs a face novelty sign's box comes within 0.08 m of a pole (inside the 0.15 m; 0 at no width) |
| Street lights | 1 to 8, every run | 0 |
| Lamp-post places | 5 to 16, every run | **6 to 17, every run**: canopies 2 to 11, hydrants, bus stops, bollards, meters 3 to 10 |
| Drop ends (first 2 m) | escapes 7 to 19, face signs 3 to 8 (11 to 25 drops); window planters 20 to 39 | the same (stage 7) |
| Canopies over a pole line | 17 to 32 pavement trees | **8 to 22** |
| Stage 4 build-out trees, stage 9 masts, arms and signs | 0 | 0 |
| The drop's wall point itself | 0 (escapes stand 0.25 m off the wall) | 0 |

- **Pavement trees are 3.8 to 4.7 m tall,** all over `FURN_MAX_H_M` 3.2 m. Each of the 8 to 22 left over the wires has its kit bounds over a span in plan.
  - So if I2 keeps a tall item's bounds off the spans in plan, its planned rule clears them. That is an **estimate**: I2 is not cut.
- **Putting lamp-post places in the keep list too** (measured): lamp-post places 0 or 1 a run, and canopies over wires 0 to 6 a run.
  - **Cost:** 506 to 612 props a run, against 553 to 667 with I2's poles and lights and 585 to 701 as merged. That is about 48 more props a run taken out, beyond I2's planned 39.

## 6. T-2 on the clean city

**The walk graph (proposed for C1):**
- **Walkable:** every stage 1 street cell (`streets.cells`: pavement, pavement corner, kerb cut, crossing, parking band, lane, junction), joined to its four neighbours.
- **Closed:** a cell where a piece standing on the ground (base under 2 m) covers the cell's centre, on the resolved plan, clean pieces included.
- **Never in the graph:** service lanes, walks, plazas, courts and parks (Josh's "along pavement or road").
- A pole's own cell is its start.

| Over the 20 runs | Result |
| --- | --- |
| Street cells closed by clean pieces | 1 to 9 a run |
| Walk components | 1 on every run, with and without the closed cells |
| Districts whose poles do not all reach each other | **0** |

- The centre rule is coarse. A barricade that leaves a gap beside a cell's centre still closes it. E2's pre-check, which places the barricades, can refine it.

## 7. Options for T-1 on the clean city, measured

| Option | Runs where a pass could pass T-1 | What it moves |
| --- | --- | --- |
| **A. T-1 judges what a pass adds or swaps. Clean clashes are reported each run, never failed** | 20/20 | Nothing. It is X-1's "a pass is never judged by a clean check" |
| B. T-1 judges the whole resolved plan | 0/20 today. After I2 still 0/20: the drop ends (Josh's accepted clashes) and the lamp-post places | H2 and H1c re-opened (Josh declined on card 1), and the lamp-post places added to I2's keep list |
| C. As A, and lamp-post places join I2's keep list | 20/20 | about 48 more props a run, in K's planned I2 re-pin |

## 8. Recommendation

- **District rule A** (hashed sizes 20/30/25/25, grown along the longest shared street).
- **The story rule in section 3.**
- **T-1 by option A.** A pass is judged on what it adds and swaps, against every pole, light, lamp-post place and drop end, with the "covers" reading of section 5. Each run reports the clean clashes.
  - **Lamp-post places:** the designer (and K2's place list) skips a covered one. About 2 to 4 in 100 are covered, so nothing in the clean city moves.
  - **For K's architect, not a question:** I2's span rule should read a tall item's kit bounds in plan. The canopies over wires then clear (estimate).
- **T-2 by the walk graph in section 6.**
- **Cost:** no merged section, digest, pin or approved number moves. B's acceptance criterion 2 takes the story rule. C1's criterion 4 takes the two readings and section 5's clean numbers.

## 9. Questions for Josh (recommended answer first)

1. **"Cut each city into districts by giving each block a random size of 1 to 4 blocks (1 in 5 single, then 30, 25, 25 in 100) and growing it into the neighbour it shares the most street with. That gives about 17 districts a city, a third of them single blocks for the first jobs. Yes, or always try 4 blocks (about 12 a city, mostly 4)?"** **Recommended: yes.**
2. **"District stories: technology highest in one district near the middle, dropping about a sixth with each street you cross; a quarter of districts left at once (no power plant, so their job's feed is a pole just outside); overgrowth the opposite of how long they held out, give or take a little. Yes?"** **Recommended: yes.**
3. **"Today's clean city already breaks 'nothing covers the circuit' on every test city: the fire escapes and face signs over drops you chose to leave, street furniture on poles until the ground stage is re-run with the circuit, and furniture on about 1 in 30 lamp-post spots. Judge only what the three new passes add, and keep reporting the clean clashes?"** **Recommended: yes.** The alternative stops every pass until the clean city is fixed.
4. **"Lamp-post spots that a tree or hydrant already covers: the puzzle designer skips them, or move the furniture (about 48 more props a city)?"** **Recommended: skip them.** Nothing in the clean city moves.
5. **"'Reachable on foot' means through street cells only (pavement, crossings, road, parking, junctions), and a cell is blocked when something standing covers its middle. Yes?"** **Recommended: yes.** Every district passes on the clean city.

## 10. What the orchestrator does for each answer

- **1 yes / 2 yes.** The architect writes rule A and the story rule into B's criterion 2, with a hand-worked fixture. If Josh says 4 blocks, B uses rule B's weights instead. Nothing else moves.
- **3 yes.** C1's criterion 4: `t1Failures` judges the adds and swaps of the era's passes, and returns the clean clashes as a report. Its clean-city numbers are section 5's.
  - **3 no.** T-1 cannot hold on any run until H2 and H1c re-open, which Josh declined on card 1. The architect puts that to Josh before C1 is cut.
- **4 skip.** K2's place list (or the designer's place table) marks covered lamp-post places. This is a line for K's architect, not this ticket.
  - **4 move.** K's architect adds lamp-post places to CK15's `keep` list. I2's planned re-pin absorbs it.
- **5 yes.** C1's `t2Failures` uses section 6's graph. **5 no:** Josh's words give the graph, and the probe is re-run.
- **In every case:** B can be built once A merges. The D1 pre-check may read this note's option A districts.

## 11. The other cities

3 x 3 and 6 x 4 were not run (Josh, 21 Nov 2026: best effort, report only, no energy spent on them).

## 12. The probe

`b073pre/` in this session's scratchpad (`C:\Users\Josh\AppData\Local\Temp\claude\1513c4d561c80576\d0203065-6e92-41b9-a4fa-2af6c426fba3\scratchpad\b073pre\probe.ts`).
- It is a `tsx` script over a copy of `src/core` and `src/city` from 103ce43, run as one process at a time (about 55 s for the 20 runs).
- Nothing of it is in the repo. The scratchpad may be cleared; the probe can be rebuilt from this note and K1's.
