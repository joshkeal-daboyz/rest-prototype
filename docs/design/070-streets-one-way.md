# 070 streets: one-way streets on the split plan

## Josh's answer

Not yet. His answers go here, in his words, when he gives them. Then the `lead-architect` re-cuts.

Design note for Josh, 20 Nov 2026, on `design/070-one-way`, cut from `ticket/070a4-split-plan` at 76db703 (A4 built, under review, held on its branch). Design only: no code, no ticket, no rule changed. Nothing here is Decided until Josh says so in chat.

## Josh's words (20 Nov 2026, in chat)

> "I think it looks great. Create an opus session to add 1 way streets."

He said this after seeing the split-plan street pictures (A4). Today every street is two-way with one parking band (grammar rule 10). Two of his rulings bound this note:

- **Decided (19 Nov 2026, Q7):** "Yes, no avenues", so every street is 25 m with a 15 m carriageway.
- **Decided (20 Nov 2026):** "C, split plan"; and "Yes, all four" (S6: nothing a car enters faces a T; the streets go first).

## 1. What I measured

This was a sketch probe, outside the repo: one Vitest file in the scratchpad, run with `--maxWorkers=2`. It imports A4's `laySplit` from this worktree, unchanged. It ran on the 13 named cities, plus 3 x 3 seeds 11 to 40, 6 x 4 seeds 4 to 20 and 6 x 6 seed 1. That is 59 cities that lay (3 x 3 seeds 12 and 34 throw in stage 1 itself; see section 8).

**Reachability.** I built the junction graph: a node is a junction; an edge is a street stretch between two junctions in a row, in one direction or both. A city "works" when the graph is strongly connected: every junction can reach every other, so every block side can be reached and left.

| Test | Orientations | Not strongly connected |
| --- | --- | --- |
| Every inner street one-way, random directions; the four edge streets two-way | 11,800 (200 per city) | **0** |
| The same, with the four edge streets one-way too, random directions | 11,800 | **10,329** (88%) |
| Option W1 below (40% of the eligible streets, alternating directions) | 59 | 0 |

**Why the first row is 0.** On the split plan every street ends on a street that was there before it, because a cut ends on the streets that bound its piece. Follow any street in its direction and you reach its end, on an older street. Follow that one and you reach its end too. You go down that way until you reach the edge ring, which is two-way and joins up all round. Going backwards works the same way. So with a two-way ring, **any** choice of one-way streets and directions keeps the city strongly connected. Merged cuts (one street through a crossroads) do not change this in any of the 11,800 tests. I have not proved it for them; the check in section 6 holds each city to it.

**Why the second row fails.** A corner is where two edge streets both end. If both point into it, it is a dead end for traffic. If both point out, nothing can reach it. With random directions that happens on about 14 of every 16 cities.

**A junction never becomes impossible.** A street that passes through a junction gives it one way in and one way out, even when it is one-way. Only a corner has no street passing through it, and corners are on the two-way ring. So no T and no crossroads can have every arm pointing in, or every arm pointing out.

**What there is to choose from** (named cities; lengths in cells, junction squares included):

| City | Inner streets | Edge to edge | Eligible (W1) | W1 picks | Their lengths | Parking-band cells: today, then added by X1 |
| --- | --- | --- | --- | --- | --- | --- |
| 3 x 3 s1 (default) | 6 | 2 | 4 | 2 | 31, 21 | 262, +31 (12%) |
| 3 x 3 s2 | 8 | 2 | 6 | 1 | 16 | 244, +8 (3%) |
| 3 x 3 s3 | 6 | 2 | 4 | 2 | 29, 22 | 254, +30 (12%) |
| 3 x 3 s4 | 6 | 3 | 3 | 1 | 22 | 270, +14 (5%) |
| 3 x 3 s5 | 6 | 2 | 4 | 3 | 22, 35, 22 | 262, +50 (19%) |
| 3 x 3 s6 | 7 | 3 | 4 | 2 | 21, 24 | 320, +29 (9%) |
| 3 x 3 s7 | 6 | 2 | 4 | 1 | 31 | 250, +18 (7%) |
| 3 x 3 s8 | 6 | 2 | 4 | 2 | 21, 30 | 242, +30 (12%) |
| 3 x 3 s9 | 6 | 3 | 3 | 3 | 18, 16, 21 | 258, +31 (12%) |
| 3 x 3 s10 | 6 | 3 | 3 | 1 | 16 | 254, +8 (3%) |
| 6 x 4 s1 | 14 | 5 | 9 | 4 | 39, 47, 47, 47 | 634, +113 (18%) |
| 6 x 4 s2 | 16 | 4 | 12 | 5 | 20, 30, 30, 20, 16 | 638, +66 (10%) |
| 6 x 4 s3 | 17 | 5 | 12 | 4 | 24, 18, 18, 24 | 673, +52 (8%) |

- "Edge to edge" is an inner street with both ends on the edge ring: the split's long first cuts, the town's through streets.
- Over the other 46 cities, W1 picks 1 to 11 streets. On 6 x 6 seed 1 it picks 11, and adds 221 band cells to 916.
- "Added by X1" counts the second parking band a one-way street gets under option X1: the cells of its first band, since the second runs beside it. Most of these cells become build-outs with trees, as 18.5 lays them. Bays are laid only to demand.

## 2. The section: three options

All three keep the 5 m lattice. Only X1 and X2 keep the Decided 15 m carriageway.

```
two-way today (rule 10)   X1 one lane, parking both sides   X2 two lanes, one way   X3 narrower (4 cells)
| pav | park | ln | ln | pav |   | pav | park | ln | park | pav |   | pav | park | ln | ln | pav |   | pav | park | ln | pav |
        <-    ->                         ->                            ->   ->                         ->
```

### X1. One lane, parking on both sides (recommended)

The bands are pavement, parking, lane, parking, pavement. That is still 5 cells and 25 m, with a 15 m carriageway kerb to kerb.

- **What stays the same:**
  - the street-width check and rule 10's 15 m;
  - the 3 by 3 junction, so S2 (the T's crossings and corners), S3's gap and the 17-cell cut;
  - every block size, and the outline;
  - every cell role, so the picture legend and `CityStreetCell`.
- **What it gives:**
  - It reads as a quieter, narrower street: one 5 m traffic lane, with bays and bulb-outs on both kerbs.
  - Both blocks along it get a parking side of their own. Today only the block on the hash side does. That helps P1, which is thinnest where a block has few own sides; D1's lowest margin is 0.757 against a 0.75 floor.
- **What it costs:**
  - Stage 1 picks the streets, sets their bands and direction, and gets the check of section 6.
  - The `bands` list already allows two parking bands. Avenues had two, and D1's `band.ts` and `check.ts` still loop over every parking band of a street. So edge needs no new code path. Its numbers move, and are measured.
  - The lane cell needs a different road piece and an arrow in 3D (section 4).
- **A detail for the architect:** a street's `centre_m` is worked out as the edge of its first lane cell. On X1 that cell is the only lane, so `centre_m` falls on a kerb edge rather than the middle of the lane. D1's side test (`centre_m` against the band cell) still sorts both bands correctly either way. Even so, `centre_m` should be defined as the middle of the carriageway for a one-way street.

### X2. Two lanes, both one way

The bands are as today (pavement, parking, lane, lane, pavement); only the direction is new.

- **Cost:** the least. Stage 1 sets a direction field, and the 3D view paints a white dashed divider instead of the yellow centre line, plus arrows. Land, Mass and Edge see no change at all, and no parking number moves.
- **What it gives:** little to see. From above it is today's street with arrows. A 10 m one-way carriageway on 30 to 80 m blocks reads as a through route, not a side street.

### X3. Narrower: a 4-cell one-way street

The bands would be pavement, parking, lane, pavement: 20 m, with a 10 m carriageway. Or pavement, pavement, parking, lane, pavement (5 cells), which has the same 10 m carriageway.

- **It changes a Decided rule:** "every street is 25 m with a 15 m carriageway" (Q7). Only Josh's own words can do that.
- **It reaches every stage:**
  - Where a 4-cell street meets a 5-cell one, the junction is 2 by 3 cells, not 3 by 3. So rule 10, S2's crossing counts, S3, `CUT_MIN_CELLS` (17) and the block arithmetic all gain a second case.
  - D2's corners and crossing pieces get a new shape.
- **Cost:** the largest by far, for a few metres of width.

## 3. Which streets, and which way

**Always two-way: the four edge streets.** This is what makes every city reachable (section 1). It is also what keeps the corners possible.

### W1. Side streets by hash, through streets kept two-way (recommended)

- A street is **eligible** when it is inner and does not run edge to edge. These are the split's later, shorter cuts, which end in Ts on inner streets. Lengths on the named cities are 16 to 47 cells (80 to 235 m).
- Each eligible street is one-way when `rand("oneway", street)` falls under `ONE_WAY_SHARE` (provisional: 0.4).
- Every city that has an eligible street gets at least one one-way street (provisional: `ONE_WAY_MIN` 1), so Josh sees one on every seed. No named city has zero eligible streets.
- On the named cities this gives 1 to 3 one-way streets at 3 x 3 and 4 or 5 at 6 x 4.
- **Cost:** a filter and a hash in stage 1.

### W2. By length

- Eligible streets of at most `ONE_WAY_LEN_MAX` cells are one-way (for example 24 cells, 120 m): the short connectors.
- It is more predictable, but whole seeds then have none (3 x 3 s1's eligible streets are 21 and 31 cells, so only one would qualify). And it ties the look to the split's numbers.
- **Cost:** the same as W1.

### W3. Every street one-way except the ring

- This is the most "downtown" look: every inner street is one-way, with no share.
- Reachability still holds (section 1: 0 failures in 11,800).
- **What it costs:**
  - About a fifth to two-fifths more band cells per city, and so the most change to Edge's numbers.
  - The through streets lose their two-way look.

**The direction rule (for W1 to W3).**

- **Alternating (recommended).** Along each axis, the one-way streets in order of `across0` alternate: +, -, +. Two neighbouring parallel one-ways then run opposite ways, as one-way pairs do in real towns. With two-way streets between them, a driver can go round any block.
- **By hash.** `rand("oneway", "dir", street)`. Also always reachable (section 1), but two neighbours may run the same way.
- A street merged through a crossroads is one street, so it has one direction.

## 4. What it changes, piece by piece (X1, W1)

| Piece | Change |
| --- | --- |
| **Junctions (T and crossroads)** | None in cells. 3 by 3, the same roles. A one-way street gives a junction one arm in or one arm out instead of both. No junction can have all arms in or all out (section 1). |
| **Crossings** | None in cells. A crossing still spans the 3 carriageway cells. On X1 that is parking, lane, parking, so the build-out next to each crossing (18.5's bulb-out) shortens the walk to one lane on both sides. Today that happens only on the parking side. |
| **Kerb cuts** | None in the rule. On a one-way street every cut has a parking cell behind it, which stays `parkingPlain` (`CityKerbCut.plain` set). Today the cuts on the non-parking side have a traffic lane behind them. D1 already handles both. |
| **Drives, lane mouths, frontage lots (Land, Mass)** | No layout change. A car leaving a drive or alley onto a one-way street turns only with the traffic. That is a rule for a later cars ticket, which reads the street's direction. S6 is unchanged. |
| **Alleys (lanes, 1 cell)** | Not touched. They are unmarked and have no direction. (Making them one-way is a later question, if any.) |
| **The parking band (D1)** | Each side of a one-way street is a band stretch with its own block, in the band table D1b builds from `CityPlanBlock.sides`. The allocator, the first pass, the order and every constant stay as they are. What moves: blocks gain own parking sides, so the block order (fewest own sides first) and the supply move. P1 to P6 are measured again. P3's cap applies per stretch, as D1b says. P6's cap (6 bays per 100 m) is about demand, so it should barely move: bays are laid to quota, and the extra band becomes build-outs. |
| **Build-outs and trees** | More of both, on the second band (most of the 3 to 19% of new band cells). |
| **The kerb line (D2)** | No new clause. Both kerbs of a one-way street step round build-outs, as the parking side does today. |
| **Pole slots, circuit (K)** | None. Slots are on the pavement. |
| **The flat picture (stage 1)** | The one-way lane cell gets its own legend entry ("one-way lane") and an arrow point per stretch (R-5's points for things smaller than a cell), so Josh can see direction on his phone. That is one entry more than A4's criterion 11 ("legend unchanged") allows, so A4b says so. |
| **3D (E, renderer)** | The lane cell: today's lanes are `Road_YellowLines_01`/`_02` (a yellow centre line). A one-way lane takes `Road_Lines_01` (white edges on both sides, no centre mark), which reads as one lane between two parking bands. The arrow: I found no arrow road piece named in the repo's docs or code, and the GLB is not in this worktree. If the kit has none, the arrow is code-drawn: a flat white quad shape, like the code-drawn kerb strips. Place one after each junction exit and one every few cells, all in one `InstancedMesh`. That is one draw call more than E's criterion 2 (`TILE_DRAW_CALLS_MAX` + 1 becomes + 2). A one-way sign post is not in this note: no sign piece for it is named in the repo. |
| **`city=tiles` (old path)** | Untouched (R-9). |

## 5. What re-opens, and the cheapest place

The order today is A4 (under review), then the A4 pre-check, then the B3, C3 and D1b re-cut, then D2, then E.

**Recommended: A4b, on A4's branch, right after A4's review settles and before the A4 pre-check.**

- Stage 1's pins are already moving on that branch. No Land, Mass or Edge pin has been re-taken on the split plan yet. So one-way streets fold into the one measuring round that is already planned: the pre-check runs Land, Mass and Edge on split plans that already have one-way streets.
- B3, C3 and D1b then re-cut once.

| Section | Re-opens? | What changes (X1, W1) |
| --- | --- | --- |
| `src/core/cityplan.ts` (architect) | yes, small | `CityPlanStreet` gains a direction (for example `flow: "both" \| "+" \| "-"`, along its axis). `profile` stays `"street"`, so `KERB_BAY_SHARE_MAX` and every profile-keyed constant are unchanged. `centre_m` is defined for a one-way street. |
| A4b streets (planner) | yes: a new section on A4's branch | Picks the streets (W1), sets bands and flow, adds S7 and S8 (section 6), adds the legend entry and arrow points, and re-takes stage 1's four pins once more, naming them moved by A4b. The provisional numbers go in `constants.ts`, commented PROVISIONAL with this note's name. |
| A4 pre-check | widened, not added | It runs on A4b's plans. It also reports, per named city, the one-way streets and P1's supply/demand with and without them. |
| B3 land | no new content | Measured as planned |
| C3 mass | no new content | Measured as planned. P2 reads lots, not the kerb, so it does not move. |
| D1b edge | no new content | Its side-list band table already gives each side its own stretch. Measured as planned. |
| D2 | no new clause | |
| E | yes, small | The one-way lane's piece, the arrows, and one more draw call |
| K, cars (later) | reads `flow` | |

**Other places, and what they cost:**

- **After the re-cut merges, before D2.** A separate section. It re-takes the pins of streets, land, mass and edge a second time and re-measures P1 to P6 a second time, on cities Josh has already seen. Twice the measuring.
- **After E, or at L.** The same, plus E's drawing is redone.

## 6. New checks

- **S7. Every junction reaches every other.** The junction graph, with each street stretch one way or both, is strongly connected: one search forwards and one backwards from any junction, linear in junctions. A draw that fails S7 is repeated like any other (A4's draw loop, R-2). On the 59 measured cities none fails.
  - Failing fixture: a corner whose two edge streets both point into it fails S7, with the junction named.
- **S8. The four edge streets are two-way.**
  - Failing fixture: a city with one edge street one-way fails S8.
- **S9. One-way streets are as W1 says** (provisional numbers): only eligible streets are one-way; at least `ONE_WAY_MIN` per city with an eligible street; directions alternate per axis.
- **The street-width check** stays as it is: X1's carriageway is 15 m.
- **The report** (A4b's builder, per named city): the one-way streets, their lengths and directions, and the share of eligible streets that are one-way.

**Provisional numbers, for Josh's eye on the flat picture:** `ONE_WAY_SHARE` 0.4 of eligible streets and `ONE_WAY_MIN` 1. Nothing pins them; the pre-check reports what they do to P1.

## 7. What it might do to parking (not measured)

I did not run Land, Mass or Edge. The pre-check does that.

- **Expected:** P1 gets easier. More blocks have an own side, and the blocks with fewest own sides were the ones left short.
- **Risk:** P5 and P6 do not move by design. P3 is per stretch. The only way I see a number getting worse is the greedy order changing which block borrows across a street. The pre-check measures it with one-way off and on, like S6.

## 8. Not verified

- **Nothing in Land, Mass or Edge was run.** Section 7 is from reading `band.ts`, `check.ts` and the D1 pre-check.
- **The road kit.**
  - That `Road_Lines_01` reads well as a single lane between two parking bands. This is from `tileslots.ts`'s description of the piece, not from a render.
  - Whether the City Pack has a road arrow or a one-way sign. The GLB is not in this worktree.
- **How it looks.** Josh judges it on `?view=3d&city=plan&stage=streets`.
- **Seen in passing, not this note's subject:** `laySplit` throws on 3 x 3 seeds 12 and 34. Neither is a named city. A4's review may already know.
- **The probe** is in `C:\Users\Josh\AppData\Local\Temp\claude\56b8fba0bedb55d2\f6afb8b7-24f6-402c-b71c-26b0040c602b\scratchpad\oneway` (`probe.test.ts`, output in `out.json`). It is not committed. The scratchpad may be cleared.

## 9. Questions for Josh (recommendation first)

1. **What does a one-way street look like?**
   Recommended: one traffic lane with parking on both sides, the same 25 m street (X1).
   Or two lanes both going one way, today's street with arrows (X2).
   Or a narrower street, which would undo your "15 m carriageway" ruling (X3).

2. **Which streets become one-way?**
   Recommended: the side streets only. The four edge streets and any street that runs edge to edge stay two-way, and about 4 in 10 of the other streets are one-way, at least one per city (W1). That is 1 to 3 on a 3 x 3 city.
   Or only the short ones (W2).
   Or every street but the edge ring (W3).

3. **Which way do they run?**
   Recommended: neighbouring parallel one-way streets alternate directions, so you can always drive round a block.
   Or each street by chance.

4. **When is it built?**
   Recommended: now, on the street branch (A4) before Land, Mass and Edge are measured, so they are measured and re-cut once.
   Or after the street re-cut merges (everything measured twice).

5. **Arrows in 3D?**
   Recommended: white arrows painted on the road, drawn in code if the kit has none, plus a plain white-edged lane piece.
   Or no arrows until a cars ticket.
