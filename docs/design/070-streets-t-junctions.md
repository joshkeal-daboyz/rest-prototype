# 070 streets: T junctions, and a street plan that is not one lattice

## Josh's answer (20 Nov 2026, in chat)

Asked "Which street plan do you want for stage 1?" (question 1 below: C the split plan, B staggered rows, or A knock-outs), Josh answered: "C, split plan".

Asked "Do you approve 2 to 5 as recommended ("Yes, all four"), or do you want to take them one at a time?", Josh answered: "Yes, all four".

So:

- Stage 1 is designed as option C, the split plan (question 1).
- The pipeline's cities may stop matching `city=tiles`, which keeps today's grid until section L (question 2).
- `blocks=3x3` means the size of the city, not an exact block count (question 3).
- Nothing a car enters faces a T: no alley mouth, court drive or frontage lot directly opposite a street that ends there (question 4, rule S6).
- The streets go first: stage 1 is rebuilt and shown as the flat picture, Land, Mass and Edge are measured on the new plans, and only then D2 and the grey boxes (question 5).

The two provisional numbers (S3's 7 cells, S5's half) are not decided; they wait for the pre-check and his eye. The `lead-architect` re-cuts from here.

Design note for Josh, 20 Nov 2026, on `goal/city-style` at 7d28123 (A1, A2, A3, B, B2, C1, C2 and D1 merged; D2 held). Design only: no code, no ticket, no rule changed. Nothing here is Decided until Josh says so in chat.

## Josh's words (20 Nov 2026, in chat)

> "I want you to create a fable thread and ask it to update the design so that roads can feature T junctions and the city looks more like a city. Right now the whole design is at the mercy of the first rectangle."

His earlier ruling, which this builds on (style guide 19.5, Decided, 18 Nov 2026): "Keep in mind, 90 degrees does not mean a grid of squares. You can have varying widths for blocks, alleyways, parks... etc"

Everything stays at 90 degrees and on the 5 m lattice of cells. What changes is which cells are street.

## 1. Where the first rectangle governs

**The cause is one line of stage 1.** `blockSizes` (`src/city/streets/layout.ts`) draws one list of widths and one list of depths. Every street then runs the whole city, and block (bi, bj) is `widths[bi]` by `depths[bj]`. So:

- every block in a column has the same width, and every block in a row the same depth;
- every junction is a four-way crossing, apart from the city's edge;
- nine blocks have only six free numbers, and a 6 x 4 city of 24 blocks has ten.

**Where each stage leans on it.** Checked by reading the code; nothing was run.

| Where | What it assumes | How deep |
| --- | --- | --- |
| `streets/layout.ts`, `layStreets` | streets are whole rows and columns of the lattice; blocks are the product of two lists | the cause |
| `core/cityplan.ts`, `CityStreet` | a street is a `line` number with no ends: it spans the city | type |
| `core/cityplan.ts`, `CityBlock` | `bi`, `bj` and the id `block:<bi>:<bj>` are grid coordinates | type |
| `core/cityplan.ts`, `CityStreetsLayer.sizes` | the city is `widths` by `depths` | type |
| `streets/check.ts`, V1 | reads one width per column and one depth per row | wording |
| `land/` (B, B2) | nothing. It reads each block's own rectangle, type and id | none |
| `mass/lots.ts` line 180 | the block across a street is (bi ± 1, bj) or (bi, bj ± 1) | one lookup |
| `mass/check.ts` line 249 (P2) | two blocks are neighbours when their grid coordinates differ by one | one lookup |
| `mass/` rings, openings, M3 to M5, G2, G3, R1 | nothing. They work on a part's cells | none |
| `edge/band.ts` lines 110 to 162 | a parking band is (street line, side, column or row index); a block's four sides are streets `x:<bj>`, `z:<bi+1>`, `x:<bj+1>`, `z:<bi>`; each side faces exactly one block | the band table |
| `edge/check.ts` lines 55 and 125 to 130 | neighbours by grid coordinates; the outer side of the city is line 0 or the last line | two lookups |
| `edge/` allocator (`tryAdd`, the first pass, the order) | nothing, once it is handed bands and sides | none |
| ticket 070, A1 criterion 6 and R-3's exception | stage 1 equals the old tile city's streets exactly | rule |
| ticket 070, "the two must agree on the named cities" | the old path and the pipeline lay the same city | rule |

**What does not assume it.** The grammar's rules 1 to 9, 11 and 12 are about cells, parts and open sides. A block is still a rectangle with a street on all four sides in every option below, so Land and Mass keep their rules. The stages not yet built (D2, E, F1 onward) read cells and parts, never grid coordinates.

**One thing a T adds that no stage knows today.** Where a street ends on another, the block on the far side has a junction in front of the middle of its side. That stretch has crossings landing on its pavement and no parking in front of it. Section 3 says what follows.

## 2. Three options for stage 1

Common to all three: every street keeps rule 10's section (5 cells, 15 m carriageway, no avenue), every block is a rectangle with a side of 6 to 16 cells (`BLOCK_TILES`, unchanged), every street ends on another street, and the city keeps a street all round its edge.

```
Today            A knock-outs
+----+---+--+    +----+---+--+
| a  | b |c |    | a  | b |c |
+----+---+--+    +----+---+  +
| d  | e |f |    | d  | e |  |
+----+---+--+    +----+---+--+
| g  | h |i |    | g      |i |
+----+---+--+    +--------+--+

B staggered      C split plan
+----+---+---+   +----+---+---+
| a  | b | c |   | a  | b |   |
+--+-+--++---+   +--+-+---+ c |
|d |  e | f  |   |d | e   |   |
+--+-+--+-+--+   |  +--+--+---+
| g  | h  |i |   |  |f | g| h |
+----+----+--+   +--+--+--+---+
```

### Option A. Knock-outs

Lay today's lattice, then remove some street stretches between two blocks, by hash. The two blocks become one, and each end of the removed stretch is a T.

- **Cost in stage 1.** Small: one pass after `layStreets`.
- **It breaks a number.** Two blocks and the street between them are at least 6 + 5 + 6 = 17 cells, above `BLOCK_TILES.max` (16, 80 m). So either the maximum rises (a number for Josh), or only a few pairs qualify.
- **It does not answer the complaint.** Every street still lies on one of the first draw's lines. It reads as the same grid with holes.

### Option B. Staggered rows

Streets one way run the whole city. Between each pair of them, the cross streets are drawn on their own, row by row. A cross street ends on the through streets above and below it, at a T, unless it happens to line up with the one in the next row.

- **Cost in stage 1.** One widths draw per row, each summing to the same city width.
- **What it gives.** Most inner junctions are Ts. Blocks in a row still share a depth, so it is half a lattice: free one way, fixed the other.
- **The first draw still sets** the rows, so the depths are "the first rectangle" still.

### Option C. Split plan (recommended)

Start from the city's outline: the land inside the edge streets. Cut it in two with a street, by hash. Cut each piece again, across or along, until every piece is a block of 6 to 16 cells a side. Each cut ends on the streets that bound its piece, so it ends in a T, unless it lines up with a cut on the other side (then it is a crossroads, as today).

- **Cost in stage 1.** A new layout function, about the size of today's. A piece 17 cells or longer can always be cut into two legal pieces (6, street, and the rest), so it always finishes.
- **What it gives.** No draw governs the others. Streets of different lengths, blocks of different widths and depths side by side, Ts and some crossroads. Option B is the special case where the first cuts all run one way.
- **The outline** comes from today's `blockSizes` draw for the asked size, so a `3x3` city covers the same ground as today (the default is 51 by 57 cells).
- **The block count is no longer fixed.** `blocks=3x3` then means "a city the size of nine blocks". A seed may give seven or eleven.

### What all three share

Everything downstream of stage 1 costs the same under A, B and C, because later stages see only streets with ends, rectangular blocks, and which block is across which street. The options differ only inside stage 1 and in how the city looks. So the choice is about the look, not the cost.

## 3. Proposed rules (for B or C; A needs S1 to S3 as well)

All **Proposed**. The numbers marked provisional are for the pre-check to measure and for Josh's eye on the flat picture.

- **S1. Every street ends on a street.** No dead end. Each end of a street is a corner of the city's edge, a T, or a crossroads.
- **S2. A T is laid like a crossroads with one arm missing.**
  - The junction is still 3 by 3 cells (rule 10).
  - Crossings: one across the ending street, two across the through street, either side of the ending street.
  - On the ending street's side: two pavement corners, as today.
  - On the far side: the through street's pavement runs straight past. Its kerb dips where the two crossings land (`Sidewalk_Dip_01`, in the kit).
  - No parking-band cell stands in a junction or a crossing, as today.
- **S3. Junction spacing.** Two streets that end on the same street from opposite sides either line up exactly (one crossroads) or stand at least `JUNCTION_GAP_MIN_CELLS` apart (provisional: 7 cells, 35 m, between centre lines). No near-miss.
- **S4. Every block is a rectangle with a street on all four sides,** each side 6 to 16 cells. `blockSizesWork`'s two tests keep their numbers, counted over blocks.
- **S5. Ts are common.** At least `T_SHARE_MIN` of the junctions inside the city are Ts (provisional: half). Without it a seed could still come out as a lattice.
- **S6. Nothing a car enters faces a junction.** No lane mouth, court drive or frontage lot opens on the stretch of a block side that has a junction in front of it (the 5 cells opposite the ending street, and `BAY_JUNCTION_CLEAR` either side). Otherwise a lane opposite a T makes a crossroads with no rule for it, and its kerb cut lands on a crossing. Walk-throughs, plazas and parks may face a T.

**What stage 1 must publish for the later stages** (the architect's to shape, in `src/core/cityplan.ts`):

- each street's two ends, in cells along it;
- each junction: its cells, its kind (corner, T, crossroads), and the streets that meet there;
- each block's four sides: the street on that side, the blocks across it (now a list, since two blocks may face one long side), and any stretch that faces a junction (S6).

`bi`, `bj`, `line` and `sizes` stop meaning grid coordinates. Ids stay stable strings; their form is the architect's call.

## 4. What each merged section costs (options B and C)

| Section | Re-opens? | What changes |
| --- | --- | --- |
| `src/core/cityplan.ts` | yes (architect) | `CityStreet` gains ends; a junction list; block sides with their neighbours; `sizes` goes or becomes the outline |
| A1 streets | **yes, the layout** | The new layout and S1 to S5. Today's lattice functions stay as they are, exported, because `city=tiles` imports them (A2, R-9). A1's "equal to today" test keeps running on those old functions. The four street digest pins are re-taken |
| A2, A3 | no | They import the old functions and draw pictures from cells |
| B, B2 land | small | A lane's place also keeps off a junction-facing stretch (S6). The rules, quotas and M4a are unchanged. V3 and V4 are measured again. Pins re-taken |
| C1, C2 mass | small in code | Drive and frontage-lot sites keep off junction-facing stretches (S6). Two neighbour lookups read the block's side list. Pins re-taken. **P2 is measured again on new cities** |
| D1 edge | **yes, the band table** | Bands and a block's sides are built from stage 1's side list, not from line numbers. A side facing a T has two band stretches. The allocator, the first pass and every constant are untouched. **P1 to P6 are measured again on new cities** |
| D2 (held) | not built | Gains one clause: on the far side of a T the kerb line runs straight past and dips at the two crossings |
| E onward | not built | No change. They read cells, parts and placements |
| stage 6, circuit (059, not re-cut) | not built | It would have followed lattice lines. Streets with ends are a better base for wires, and this is the cheapest moment to change |

Option A re-opens the same sections, a little less of A1, and adds the block-size number.

**The real cost is the measuring, not the code.** Every named city becomes a different city. C2 stopped once on parking (P2) and D1's pre-check found P1 failing; both were settled on today's cities, with thin margins (D1's lowest supply is 0.757 against a floor of 0.75). Those margins are not known for the new plans. So the order should be: the architect types the layer, stage 1 is rebuilt, then a pre-check runs Land, Mass and Edge as merged on the new plans and reports before any of them is re-cut.

## 5. Checks and rules that need rewording

No threshold changes in any option except A's block maximum.

| Check or rule | Change |
| --- | --- |
| street width (grammar 10) | none |
| V1 | "on each axis the sizes' variation" becomes "over all blocks, the variation of their widths, and of their depths". On a lattice the two give the same number, so today's cities score as before. Threshold unchanged |
| V2 | none |
| V3, V4, M4a | none in wording; measured again |
| M3, M4b, G2, G3, R1 | none |
| M5 | gains S6: no vehicle mouth faces a junction |
| P2 | "the neighbour across its longest street" and "adjacent" mean blocks that share a street side |
| P1 | none in wording |
| P3 | a "street side" is a band stretch between junctions. A block side facing a T is two stretches, each with its own share cap. This is stricter than one cap for the whole side, never looser |
| P4, P5, P6 | none in wording |
| kerb line (grammar 10) | "one unbroken kerb line from junction to junction" becomes "from block corner to block corner"; plus D2's far-side clause |
| G4 | none |
| R-3's exception | "stage 1 keeps today's keys so the default city stays exactly as it is" ends for the pipeline's layout. It still holds for the old functions `city=tiles` uses |
| R-4 | every pin of streets, land, mass and edge is re-taken, once, and named as moved by this change |
| R-7 | the 6 x 6 run stays; "6 x 6" is a size, not a block count, under C |
| A1 criterion 6 | holds for the old lattice functions only |
| "the two must agree on the named cities" (checks table) | becomes: the same thresholds and constants on both paths. The cities themselves differ until L |
| the named cities | the same thirteen sizes and seeds; different cities |
| grammar rule 10, "A junction is 3 by 3 cells" | stands. One line added for the T (S2) |
| grammar rules 4, 6 and 7 | stand. A T's two corners are corners like any other |

## 6. Not verified

- **Nothing was run.** Every claim about Land, Mass and Edge on the new plans is from reading the code.
- **Parking on the new plans.** P1 and P2 may not hold. A side facing a T loses about 7 cells of band, and P3's cap per stretch is stricter. If they do not hold, that comes back to Josh with numbers; nothing is tuned.
- **The road kit at a T.** I have not looked at the road tiles. If a junction's 3 by 3 cells are plain asphalt with crossings round them, a T needs no new piece. The far side's dipped kerb is in the kit (grammar appendix B).
- **The two provisional numbers** (7 cells between junctions, half of junctions as Ts) are guesses for Josh's eye.
- **How it looks.** Josh judges it on the flat picture, `?view=3d&city=plan&stage=streets`, before anything else is rebuilt.

## 7. Questions for Josh (recommendation first)

1. **Which street plan?**
   Recommended: C, the split plan. The city's land is cut in two by a street, then each piece again, until every piece is a block. Streets end in Ts, and blocks beside each other differ in width and depth.
   Or B, staggered rows: long streets one way, and the cross streets shifted row by row.
   Or A, knock-outs: today's grid with some street stretches removed (needs blocks longer than 80 m).

2. **May the pipeline's cities stop matching `city=tiles`?**
   Recommended: yes. Any of the three makes the default city and every test city a new city. `city=tiles` itself keeps today's grid until the switch (section L). Every pinned number of stages 1 to 4 is re-taken once.

3. **May `blocks=3x3` mean the size of the city, not an exact count?** (Only for C.)
   Recommended: yes. The city covers the same ground as today's 3 x 3, and a seed gives roughly seven to eleven blocks.

4. **May nothing a car enters face a T?** That is: no alley mouth, court drive or frontage lot directly opposite a street that ends there.
   Recommended: yes. Otherwise an alley opposite a T makes a crossroads, and its kerb cut lands on a crossing.

5. **Do the streets go first?**
   Recommended: yes. Rebuild stage 1, show you the flat picture, measure Land, Mass and Edge on the new plans, and only then go on to D2 (kerbs) and the 3D grey boxes. The other way, D2 and E are built on the grid and partly redone.
