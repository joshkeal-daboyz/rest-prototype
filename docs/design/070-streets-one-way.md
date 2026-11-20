# 070 streets: one-way streets on the split plan

## Josh's answer (20 Nov 2026, in chat, relayed by the orchestrator)

He was asked the five questions of the first version of this note (8a01272; they are at the end, under "The questions as first asked"). He answered:

> "1 - a single lane, parking on 1 side maximum - sometimes none. this isn't a hard rule. It's half the width of a normal road
> 2 - it is the street designers discretion
> 3 - there should always be a two way or one way street in the opposite direction between two one ways that share the same direction
> 4 - do what you recommend
> 5 - the kit has them, use them."

Asked whether, on 5 m cells, a "half-width" one-way street should be 20 m (pavement, parking, one lane, pavement) or 15 m without the parking, Josh answered (20 Nov 2026, in chat, relayed verbatim by the orchestrator):

> "I'm sorry, it should be a maximum of 2 tiles wide. 1 for parking (discretionary), 1 for the road."

He has not yet answered whether S10 (section 2) stands. It stays Proposed and open.

So:

- **Q1. A one-way street is narrower. Its carriageway is at most 2 tiles: 1 lane tile, plus 1 parking tile at the street stage's discretion.** That is 1 or 2 tiles, 5 m or 10 m, against a two-way street's 3 tiles (15 m).
  - **This changes his ruling of 19 Nov 2026 (Q7, "Yes, no avenues": "every street is 25 m with a 15 m carriageway") for one-way streets only.** A two-way street stays exactly as rule 10 has it: 5 cells, 25 m, 15 m carriageway.
  - "Half the width" is withdrawn: his second answer replaces it with the tile count.
  - **The reading taken: the 2 tiles are the carriageway.** The pavements stay one tile on each side, as on every street. So a one-way street is 4 cells overall with parking, or 3 without. Those are the two sections section 2 already had, so the sections stand; only the wording changes. Why this reading:
    - his "1 for parking, 1 for the road" names carriageway parts only;
    - every street in the grammar has a pavement and a kerb line on both sides (rule 10);
    - the pole slots, the street frontages' doors and shopfronts, and S2's pavement corners all stand on that pavement.

    Question 1 at the end asks him to confirm this in one line, because the other reading (no pavement, 2 cells overall) would change A4b's whole lattice.
  - "Discretionary": no check requires a one-way street to have parking, or to have none (section 2).
- **Q2.** Which streets are one-way is the street stage's choice. Section 3 says what must still hold.
- **Q3.** Between two one-way streets that run the same way there is always a two-way street, or a one-way street the other way. This is rule S9 (section 6).
- **Q4.** As recommended: a new section, A4b, on A4's branch, after A4's review settles and before the A4 pre-check (section 5).
- **Q5.** Use the kit's arrows: `SM_Env_Road_Arrow_01` and `SM_Env_Road_Arrow_02` in the City Pack (section 4).

Design note, 20 Nov 2026, on `design/070-one-way`, cut from `ticket/070a4-split-plan` at 76db703. Design only: no code, no ticket, no rule changed in code. The first version recommended a 5-cell one-way street; Josh chose a narrower one, and this version follows his answer.

## Josh's words (20 Nov 2026, in chat)

> "I think it looks great. Create an opus session to add 1 way streets."

He said this after seeing the split-plan street pictures (A4). Before this, every street is two-way with one parking band (grammar rule 10).

## 1. What I measured (first version, still holding)

This was a sketch probe, outside the repo: one Vitest file in the scratchpad, run with `--maxWorkers=2`, on A4's `laySplit`. It covered the 13 named cities, plus 3 x 3 seeds 11 to 40, 6 x 4 seeds 4 to 20 and 6 x 6 seed 1. That is 59 cities that lay.

The probe used A4's 5-cell cuts. Narrower one-way cuts move the streets a cell or two, but not how they connect, so the reachability results carry over. The counts in the second table will move a little.

**Reachability.** A junction is a node; a street stretch between two junctions in a row is an edge, one way or both. A city works when every junction can reach every other, so every block side can be reached and left.

| Test | Orientations | Junctions not reachable both ways |
| --- | --- | --- |
| Every inner street one-way, random directions; the four edge streets two-way | 11,800 (200 per city) | **0** |
| The same, with the edge streets one-way too | 11,800 | **10,329** (88%) |

**Why 0.**

- On the split plan every street ends on a street that was there before it: a cut ends on the streets that bound its piece.
- Follow any street in its direction to its end, on an older street, and on from there. You always reach the two-way edge ring. Going backwards works the same way.
- So with a two-way ring, any choice of one-way streets and directions works.
- I have not proved this for merged cuts (one street through a crossroads). The 11,800 tests include them, and check S7 holds every city to it.

**Why the ring must stay two-way.** A corner is where two edge streets both end. If both point into it, traffic cannot leave it. If both point out, traffic cannot reach it.

**No junction becomes impossible.** A street that passes through a junction gives it one way in and one way out, even when it is one-way. Only corners have no street passing through, and they are on the two-way ring.

**What there is to choose from** (A4's plans; lengths in cells, junction squares included):

| City | Inner streets | Edge to edge | Others | Band cells today | Of them on the streets a 40% pick would make one-way |
| --- | --- | --- | --- | --- | --- |
| 3 x 3 s1 (default) | 6 | 2 | 4 (31, 21, 31, 21) | 262 | 31 |
| 3 x 3 s2 to s10 | 6 to 8 | 2 or 3 | 3 to 6 | 242 to 320 | 8 to 50 |
| 6 x 4 s1 to s3 | 14 to 17 | 4 or 5 | 9 to 12 | 634 to 673 | 52 to 113 |

- A one-way street with parking keeps one parking band, as a two-way street has. So the right-hand column is the most parking band a city loses if every such one-way goes without parking: 3% to 19% of its band cells.

## 2. The one-way section on the lattice

### What his words say, cell by cell

A two-way street is pavement, parking, lane, lane, pavement: 5 cells, 25 m. Its carriageway is 15 m: parking and two lanes.

A one-way street's carriageway is "a maximum of 2 tiles wide. 1 for parking (discretionary), 1 for the road", with a pavement on each side as on every street. That gives two sections:

| Section | Cells, across | Street | Carriageway |
| --- | --- | --- | --- |
| one-way with parking | pavement, parking, lane, pavement (the parking on either side) | 4 cells, 20 m | 10 m |
| one-way without parking | pavement, lane, pavement | 3 cells, 15 m | 5 m |

**The other reading, not taken:** no pavement, so a one-way street is 2 cells overall (a parking tile and a lane tile, kerb to building line). It would mean:

- buildings fronting straight onto the carriageway;
- no pole slots, kerb line or pavement corners on that street;
- a junction with no crossings.

It is close to an alley (rule 6), which has no pavement and no parking. Question 1 asks Josh to rule it out.

**Ruled out by his words:** parking on both sides, and two lanes.

### How a check treats "discretionary"

- **What a check enforces:** the section's shape. A one-way street is one of the two sections above: a carriageway of at most 2 tiles, exactly one lane tile and at most one parking tile, with a pavement on each side.
  - The street-width check reads the carriageway from the section: 15 m (3 tiles) for two-way; 10 m (2 tiles) for one-way with parking, 5 m (1 tile) without.
  - It still fails an avenue, and any other shape.
- **What a check does not enforce:**
  - whether a one-way street has parking;
  - which side the parking is on;
  - how many go without.

  The street stage chooses: by hash, a share `ONE_WAY_BARE_SHARE` (provisional, 1 in 3) of one-way streets go without parking.
- **One guard, which is mine, not Josh's (Proposed, S10; asked as question 2, not yet answered).** A one-way street may go without parking only if every block along it still has a parking band of its own on another side. Stage 1 lays every band, so it can check this.
  - The reason: Edge's P1 margin is thin (lowest 0.757 against a floor of 0.75). P1 struggles most where a block has few parking sides of its own. S10 keeps a bare one-way street from taking any block's last one.
  - If no candidate passes S10, the one-way street keeps its parking. Nothing fails.

### What the lattice change touches

The edge ring stays two-way, so its four streets stay 5 cells. The city's outline (A4 criterion 2) does not move.

| Item | Today (A4) | With one-way streets |
| --- | --- | --- |
| Street width (grammar rule 10, street-width check) | every carriageway 15 m (`CARRIAGE_M`) | 15 m for two-way (unchanged); 10 m or 5 m for one-way. New constants, for example `ONE_WAY_CARRIAGE_M = { parking: 10, bare: 5 }` |
| `STREET_CELLS` (5) | one street width | becomes per section: 5, 4 or 3. Every use in `split.ts` takes the cut's own width (lines 76 to 90, 193, 195, 235 at 76db703) |
| Cut size, `CUT_MIN_CELLS` (17) | a piece is cut where a side is 17 cells or more | **The trigger stays 17**, so the split still always finishes and the blocks' spread stays as A4 has it. Once a piece is cut, the cut's section is drawn, and the cut needs 12 + its width (15, 16 or 17). A4's piece rule (`fine`: 8 to 16, or at least 2 x 8 + the street) uses the cut's width. Pieces of 15 or 16 cells are not cut by a one-way street. That would be a new kind of block split, and this note does not propose it |
| Junction (rule 10: "3 by 3 cells") | 3 x 3 | **the two carriageways' widths**: 3 x 3, 3 x 2, 3 x 1, 2 x 2, 2 x 1 or 1 x 1. `findJunctions` (lines 146 to 158) stops assuming 3 and finds the crossing street by its carriageway, not by `across0 = c0 - 1` |
| S2, the T | 9 crossing cells; 5 pavement cells opposite | crossings: one row across the ending street (its carriageway width) and one across the through street on each side of it (the through street's width). Two pavement corners on the ending side. The far side's straight pavement is the ending street's full width (3, 4 or 5 cells) |
| S6, `CityJunctionFacing.span` | "the 5 cells opposite it" | the ending street's width, 3 to 5 cells |
| S3's gap (`JUNCTION_GAP_MIN_CELLS`, 7, provisional) | between centre lines | unchanged, between centre lines. A 3-cell street's centre is mid-cell. "Lining up" means the same centre line and the same section, and two cuts that line up are one street (A4's merge), with one section and one direction. A later cut that lines up with an earlier one across a street takes the earlier one's section |
| Block sides (`BLOCK_TILES` 6 to 16), V1, V2, `BLOCK_MEAN_MIN_CELLS` | | unchanged. Blocks beside a narrow street get the 1 or 2 cells it does not use |
| A block's sides (`layBlocks`, lines 193 to 195) | the street before a block is found 5 cells back | the street whose pavement touches the block edge |
| `centre_m` (`mkStreet`) | the edge of the first lane cell, which on two lanes is the centre line | on a one-lane street that edge is a kerb. For one-way streets, define it as the middle of the lane. D1's side test sorts the parking band correctly either way |
| `profile` | `"street"` | stays `"street"`, so `KERB_BAY_SHARE_MAX` and every profile-keyed constant are unchanged. The direction is a new field |
| Kerb and parking constants (`BAY_JUNCTION_CLEAR`, `KERB_BAY_SHARE_MAX`, `BAY_RUN_TILES_MAX`, `KERB_GAP_MIN_M`, `BAYS_PER_100M_MAX`, `BUILDOUT_TREE_EVERY`, `PARK_SUPPLY_BAND`) | | unchanged. A one-way band is a street band like any other |
| Pavement, pole slots | 1 cell, slot 0.75 m from the kerb edge | unchanged |

## 3. Which streets are one-way (the street stage's choice, Q2)

Josh left this to the street designer. What the stage chooses, and what must hold whatever it chooses:

- **Must hold:**
  - S7 (every junction reaches every other);
  - S8 (the four edge streets are two-way: the simple way S7 holds, from section 1);
  - S9 (Josh's Q3 rule);
  - S10 (the parking guard);
  - every street-width and block rule.
- **The stage's starting choice** (its own, in `constants.ts`, PROVISIONAL with this note's name; nothing pins them):
  - A street is a candidate when it is inner and does not run edge to edge. The through streets stay two-way.
  - A candidate is one-way when `rand("oneway", ...)` falls under `ONE_WAY_SHARE` (provisional 0.4).
  - The decision is made when the cut is made, because the cut's width depends on it. A cut knows at that moment whether both its ends are on edge streets.
  - The builder may change these under Josh's "street designer's discretion" and report what it chose. Josh judges the look on the flat picture.

## 4. Directions, the T, kerbs, parking and the 3D view

**Directions (S9, Josh's Q3), chosen after the split.**

- Direction changes no cell, so it is a pass after the cuts.
- The one-way streets are taken in order of `across0` per axis. Each takes the direction that S9 allows against the one-way streets it already has as neighbours.
- If both directions break S9, the street becomes two-way, which S9 always allows. If it is a narrow cut, it is redrawn with the next draw, because a two-way street needs 5 cells.
- S7 holds whatever the directions (section 1).

**Junctions.** Rectangles, as in section 2. No junction can have every arm in or every arm out.

**Crossings.** One row of `crossing` cells across each arm's carriageway: 1 to 3 cells. A crossing on a bare one-way street is one lane wide, between two kerbs.

**Kerb cuts and drives.**

- No rule changes.
- On the parking side of a one-way street, a cut has a parking cell behind it, which stays plain. On the bare side, the cut opens straight onto the lane (`plain` null). D1 already does both.
- A car leaving a drive or alley onto a one-way street turns only with the traffic. That rule belongs to a later cars ticket, which reads the direction. S6 is unchanged.

**Parking (D1, P1 to P6).**

- A one-way street with parking gives one band stretch per block across it, as a two-way street does. A bare one-way gives none.
- The allocator, the first pass, the order and the constants stay as they are. The pre-check measures P1 to P6 with one-way streets on and off.

**Kerb line (D2).**

- Unchanged, except "a junction is 3 by 3" becomes "carriageway by carriageway".
- A bare one-way's kerb runs straight from block corner to block corner, with no build-outs.

**Alleys.** Not touched.

**3D (E, renderer): the kit's pieces (Q5).** The City Pack's converted manifest lists them (`assets/private/out/manifest.json`, pack `city-pack`, from `in/city-pack/FBX/`):

| Piece | Size | What it is |
| --- | --- | --- |
| `SM_Env_Road_Arrow_01` | 5 x 5 m, flat (54 triangles) | a whole road cell with an arrow, like `Road_Crossing_01`: laid in place of a lane cell |
| `SM_Env_Road_Arrow_02` | 5 x 5 m, flat (64 triangles) | a second arrow cell |
| `SM_Prop_Sign_Arrow_01` | 0.93 m wide, 2.28 m tall | a standing arrow sign (optional; see below) |

- **Placement.** One arrow cell on the first lane cell after each junction exit, pointing with the traffic, then one every `ONE_WAY_ARROW_EVERY` cells (provisional 6, 30 m).
- **The other lane cells** take `Road_Lines_01` (white edges, no centre mark) or `Road_Bare_01`, never the two-way's yellow centre-line pieces.
- **The renderer measures the pieces' turn,** as `tileslots.ts` does for the other road pieces: which way each arrow points in its own frame, and whether `_02` is straight or a turn.
- **Draw calls.** Each new key is one instanced mesh. The renderer reports whether E's draw-call cap still holds.
- **The sign** may stand on the pavement at a one-way street's entry. I have not seen it rendered, so it is not required.
- The Apocalypse pack has its own `SM_Env_Road_Arrow_01`/`_02`, and the Town Pack a small `SM_Prop_StreetSign_Arrow_01`; the City Pack's are the ones that match the road set.

**The flat picture (stage 1).**

- A one-way lane cell keeps its role (`lane`).
- The picture gets one legend entry more ("one-way lane") and one arrow point per stretch (R-5's points), so Josh sees directions on his phone.
- That is one entry more than A4 criterion 11 allows; A4b says so.

**`city=tiles`.** Untouched (R-9).

## 5. What re-opens, and where (Q4: A4b)

**A4b, on A4's branch, after A4's review settles and before the A4 pre-check.** The pre-check then measures Land, Mass and Edge once, on plans that already have one-way streets, and B3, C3 and D1b re-cut once.

| Section | Re-opens? | What changes |
| --- | --- | --- |
| `src/core/cityplan.ts` (architect) | yes, small | `CityPlanStreet` gains its direction (for example `flow: "both" \| "+" \| "-"`, along its axis). `bands` already allows the 3- and 4-cell sections. `centre_m` is defined for one lane. `CityJunction`'s and `CityJunctionFacing`'s comments stop saying 3 by 3 and 5 cells |
| A4b streets (planner) | yes, the larger part | Per-cut sections and widths (section 2); the junction finder, S2, S6's span and the block-side lookup for any width; the direction pass; S7 to S10; the street-width check per section; the legend entry and arrow points; stage 1's four pins re-taken once more and named as moved by A4b. A4's S2 test and its "5 pavement cells opposite" assertion become width-aware |
| A4 pre-check | widened | It runs on A4b's plans, with one-way streets on and off. It reports P1's supply and demand per named city, and the one-way streets with their sections and directions |
| B3 land | no new content | Measured as planned. A lane's S6 keep-off reads the narrower facing span |
| C3 mass | no new content | Measured as planned. P2 reads lots, not the kerb |
| D1b edge | no new content | Its band table from `CityPlanBlock.sides` already gives each band its own stretch. Measured as planned |
| D2 | one word | Rectangular junctions |
| E | yes, small | The arrow cells, the one-way lane piece, and the optional sign |
| Grammar rule 10, style guide 18 | text only, in L | Rule 10's table gains the two one-way rows and Josh's words. The docs are not edited before L (ticket's must-not-touch) |
| K, cars (later) | reads the direction | |

## 6. Checks

- **S7. Every junction reaches every other.** The junction graph is strongly connected: one search forwards and one backwards, linear in junctions.
  - Failing fixture: a corner whose two edge streets both point into it.
- **S8. The four edge streets are two-way.**
- **S9. Josh's rule (Q3): between two one-way streets that run the same way there is always a two-way street, or a one-way street the other way.**
  - How it is read: take any line straight across the streets of one axis, at any cell along it. In the order that line crosses them, no two one-way streets that run the same way are next to each other without a two-way street, or a one-way street the other way, between them.
  - It is checked on every lattice line, which is linear in cells.
  - Failing fixture: two parallel one-way streets, same direction, with no street between them.
- **S10. A bare one-way street leaves every block along it a parking band of its own** (Proposed, mine).
  - Failing fixture: a block whose only own band is on a bare one-way street.
- **Street width, per section:** 15 m two-way; 10 m or 5 m one-way; no other shape.
- **The report** (the A4b builder, per named city): the one-way streets, their sections, lengths and directions; the share of candidates made one-way; the share bare; and the junctions by size.

**Provisional numbers, for Josh's eye on the flat picture:** `ONE_WAY_SHARE` 0.4 of candidates, `ONE_WAY_BARE_SHARE` 1 in 3, `ONE_WAY_ARROW_EVERY` 6 cells. None is pinned.

## 7. Not verified

- **Nothing in Land, Mass or Edge was run.**
- **The narrower cuts were not probed.** The reachability results rest on how streets connect, which the cuts' width does not change.
- **The arrow pieces** come from the manifest's names and sizes only. Which way they point, and what `_02` shows, wait for the renderer's look. So does the sign.
- **How it looks.** Josh judges it on `?view=3d&city=plan&stage=streets`.
- **Seen in passing:** `laySplit` throws on 3 x 3 seeds 12 and 34 (not named cities).
- **The probe** is in `C:\Users\Josh\AppData\Local\Temp\claude\56b8fba0bedb55d2\f6afb8b7-24f6-402c-b71c-26b0040c602b\scratchpad\oneway`. It is not committed, and the scratchpad may be cleared.

## 8. Questions for Josh

1. **Do your "2 tiles" for a one-way street mean the road only, with the usual pavement still on each side?**
   Recommended: yes. The street is 4 tiles with parking or 3 without, and every block keeps its pavement and kerb.
   Or: no pavement, so the street is just the 2 tiles and buildings front straight onto it, like an alley.

2. **May a one-way street drop its parking only where every block along it still has parking on another side?**
   Recommended: yes. It protects the kerb-parking check, which is the closest to failing.
   Or: no, the street designer drops parking wherever it likes.

## The width question as asked (18ce938)

1. On 5 m cells, a half-width one-way street can be 20 m (pavement, parking, one lane, pavement) or 15 m without the parking. Is that the right reading of "half the width"? Recommended then: yes, both, with the street stage choosing which, and parking on either side. Or: always the 15 m street, with no parking on one-way streets.

## The questions as first asked (8a01272)

1. What does a one-way street look like? Recommended then: one lane with parking on both sides, the same 25 m street (X1). Or two lanes one way (X2). Or a narrower street, undoing the 15 m ruling (X3).
2. Which streets become one-way? Recommended then: side streets, about 4 in 10, at least one per city (W1). Or the short ones (W2). Or all but the edge ring (W3).
3. Which way do they run? Recommended then: neighbouring parallels alternate. Or by chance.
4. When is it built? Recommended then: now, on A4's branch, before the pre-check. Or after the re-cut.
5. Arrows in 3D? Recommended then: white arrows, code-drawn if the kit has none. Or none until a cars ticket.
