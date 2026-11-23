# 081 B1 · CK17, the street rule and roof structures

## Josh's answers (23 Nov 2026, on question cards in chat)

1. Which pieces may stand on a roof: **"Anything"**.
2. Over an intersection, roof to roof only or down to a tall ground pole too: **"Tall poles too"**.
3. Roof structures where the live puzzle uses them, or on every corner roof: **"On every corner roof"**.
4. Corner roofs only, or mid-row too: **"Mid-row as well"**.
5. T-2 for roof pieces: **"On foot or by a climb (Recommended)"**.
6. Roofs outside the puzzle's district: **"Neighbouring blocks too"**.


23 Nov 2026, puzzle-designer, branch `ticket/081b1-roof-spans` (from a2f819e). Ticket 081, section B1. A note, no code.

**Status.** Everything marked **Proposed** is the designer's and is nothing until Josh answers section 9 in chat. Parts marked **Josh's (23 Nov 2026)** quote his answers 5 and 6a to 6c (ticket 081, "Josh's answers") and are not up for change here. The K1 rules (`docs/design/070-K1-circuit.md`, CK1 to CK16) hold as Josh answered them on 21 Nov, except where answers 5 and 6 change them.

**Numbers.** A sketch, by a throwaway probe outside the repo (section 10) on 6 x 6 seed 1, one-way on, stages 1 to 7 as merged at a2f819e. Numbers marked "(by hand)" are geometry worked from the K1 slot rule, not measured. The pre-check (B1p) measures them on the 20 named runs and is the record.

**Josh's words this note serves** (23 Nov 2026, in chat): "I want to have all of the power lines and the puzzle pieces work within the street structure of the city. If there are power lines that are diagonal across streets, then they have to be attached to structures on top of buildings."

## 1. The answers this note holds

| Answer | Josh's pick | What it fixes here |
| --- | --- | --- |
| 5, carriers | "lines cannot bend, they are runs that go from one structure to another"; "Just carriers (Recommended)" | A line is a chain of straight spans. A roof structure between two spans of a line is a carrier, as a pole is. CK13 as changed. |
| 6a, over an intersection | "Yes, roofs may cross one" | A roof span may pass over a junction. Q45 ("never over a junction") still binds every pole span. |
| 6b, nodes on roofs | "Roofs may hold nodes" | A breaker, a switch or a fuse box may stand on a roof structure. K1 Q9 ("on poles only") is lifted for roof structures only. |
| 6c, where a diagonal ends | "Roof or pole" | A roof span runs roof to roof or roof to pole. No span runs pole to pole on a diagonal. |

## 2. On the streets today (Josh's "within the street structure")

**Nothing breaks it today.** Every span stage 6 lays follows the streets:
- **Along spans** (CK4) run on the pole pavement, from pole to neighbouring pole, never over a carriageway.
- **Corner spans** (CK5) are the one diagonal in plan, 45 degrees over the block's own `pavementCorner` cell. They cross no street and no carriageway.
- **Crossings** (CK6) are square to their street, 2.5 m past the corner cell, outside every junction square and its crossing cells.
- **Drops** (CK9) run from a pole to a wall on the pole's own side. **Lamp leads** (CK11) are underground.

The K1 pre-check measured all of this on the 20 named runs: 0 along spans over 20 m, 0 crossings inside a junction square or on a crossing cell, 0 drops across a carriageway, one network per run (`docs/design/070-K1-precheck.md`, section 2). This probe added no pole code, so it did not re-measure them. K2a's checks hold them for good.

**One wording to fix, not a question.** The ticket's "Rules this ticket holds" says CK6's crossings are "square, mid-block". Josh's K1 answer 3 put them "2.5 m past the corner, right after the crosswalk, rather than in the middle of the block". Read "mid-block" as "between junctions", which is Q45's wording. For the architect at the next re-cut.

## 3. When a line wants a roof span

Answer 5 already lets a line run round corners on carrier poles. So a roof span is wanted only where the poles cannot do the job:

1. **A node that needs more lines than any pole has attachments.** A node's lines must each leave on their own span or drop, because no two lines share a span. On seed 1 no pole has more than 4 attachments, and only 33 have 4 (K1, CK12).
   - In the pilot, puzzle 04's junction has **5 lines**, so it fits on no pole of the city.
   - Ten junctions in eight puzzles (one each in 03, 05, 07, 09, 11 and 12; two each in 13 and 15) have 4 lines, so each needs one of the 33 four-attachment poles, inside its district.
   - A corner roof structure has up to 4 roof spans down to its own block's pole lines (CK17c). It can be the hub, and the lines run out from the poles it reaches.
2. **A link between two district blocks that are diagonal across a junction** (6a). A 2-to-4-block district can join its blocks over the junction instead of using two crossings and a corner.
3. **A link across a street that a square crossing doesn't serve.** For example, a node on one block and its line's far end on the facing block, away from where the crossing lands.
4. **The feed's span.** CK14 allows "one span that enters from outside per feed". That span may be a roof span from a district roof to the feed's pole outside, so even a one-block job may bring its feed in on a diagonal.

**What a one-block job can't have.** CK14 gives a job only its own blocks' pole lines. The far pavement is outside the district: its crossing poles are feed places, not node places. So in a one-block district a roof span can only go down to the block's own poles (case 1) or bring in the feed (case 4). **A diagonal across a street appears only in districts of 2 to 4 blocks**, unless question 5 is answered the other way.

**How often P1's fit wants one on the pilot (by hand).** P1 (the fit tool) is not built, and its reply is the record (P1 criterion 8). From the files:
- **04** does not fit on poles at all. It needs a roof hub, or a rework (answer 4), and possibly a second block (section 4, CK17c).
- **03, 05, 07, 09, 11, 12, 13 and 15** fit on poles only if their district has enough four-attachment poles (13 and 15 need two each). Where it does not, a roof hub is the way out.
- **01, 02, 06, 08, 10, 14 and 16** have no node with more than 3 lines, so they should not need a roof.
- **None of 01 to 16 has a battery.** Question 1 can therefore leave batteries off roofs at no cost to the pilot.

## 4. The rule

### CK17 · Roof structures and roof spans

**(a) Where a roof structure stands.**
- **The rule.** A roof structure (`roofMast`, the component Josh will pick in D) stands only on a **street corner roof**: a `corner` column (`CityColumn.kind`) whose two open sides both face a street (`CityBuiltCell.open[*].faces` "street"). That is the corner building at a block's street corner, at most one roof structure per column.
- **Where on the roof.** It stands on the deck, `ROOF_MAST_INSET_M` **0.6 m** in from both street walls, at the corner the two open sides share. That is inside H3's `ROOF_EDGE_M` 0.3 m deck edge and inside the 0.744 m rim of roof styles 2 and 3. Its base is the roof piece's base plus `ROOF_DECK_M` 0.5 m (H3's RT).
- **Why corners only.**
  - Stage 7 never puts a big roof prop (water tower, roof exit, billboard or novelty sign) on a corner column: H3 places them on mid and blind columns only (RX). So a corner place never displaces one.
  - A corner reaches both its streets and the junction it faces.
  - The alternative, any street-front roof column, gives many more places, but mid columns hold 277 exits, 48 water towers and 52 billboards on seed 1, and H4 would have to move them.
- **Height.** The decks on seed 1 are **9.5 m** (3 storeys: 37 places), **12.5 m** (4 storeys: 43) and **15.5 m** (5 storeys: 44). The wire attaches at the deck plus the pick's own attachment height (the kit's, as for poles, 071), which must be at least `ROOF_MAST_ATTACH_MIN_M` **2.0 m**. So the lowest roof attachment is **11.5 m**, about twice CK7's 4.2 m floor and 5.6 m over the lowest ground pole's 5.86 m.
- **Stage 7 (H3, H3b, H4).** On seed 1 there are 0 big props on corner columns. 86 of the 124 places carry small props (114 pieces), and **14** of those stand within 1.4 m of the place's point. H4 keeps every roof piece's bounds outside the roof structure's footprint, a `ROOF_MAST_KEEP_M` **1.2 m** half-width square round its point, clipped to the deck. It does that on every place, used or not, so no play-time step ever moves a stage 7 piece. A small prop that does not fit moves to the column's other half, or is dropped. R8's first number counts buildings with any roof piece, and the pre-check re-measures it.
- **Numbers on seed 1.**
  - **124** street corner roofs on 35 of 38 blocks: 23 blocks have 4, 8 have 3, 4 have 2, and 3 have none.
  - `block:6:6`, the worked map's block, has all 4, every one at 12.5 m: `roof:54:47`, `roof:67:47`, `roof:54:62` and `roof:67:62`. Their points are (270.6, 235.6), (339.4, 235.6), (270.6, 314.4) and (339.4, 314.4) m.
  - Of the 124 corner buildings, **30** have a roof exit (H3) somewhere on their roof (section 6).
- **Reads:** `CityBuildingsLayer.columns` (`kind`, `front`, `side`, its roof piece's placement), `CityMassLayer.built` (`open`), `CityBuildingsLayer.buildings` (`block`).
- **Status:** **Proposed** (the corner-only rule, the inset, the attachment floor, the keep square). That roofs carry structures is Josh's (his words, and 6a to 6c).

**(b) What a roof span is (6c, 6a).**
- **Its ends.** A roof span has at least one end on a roof structure. The other end is a roof structure or a pole (6c, Josh's). A span with two pole ends is an along, corner or crossing span as CK4 to CK6 say, never a diagonal across a street.
- **Where it may pass.** It crosses at most **one** street or **one** junction, never a block. In plan it lies over street cells only (pavement, parking, lane, junction, crossing), apart from the corner cell of its own roof end or ends.
- **Over a junction.** A roof span may pass over a junction (6a, Josh's). A pole span never does (Q45 holds).
- **Its three kinds, by what it passes over:**
  - **`down`**: from the roof to a pole of its own block's pole line at that corner, over the pavement only;
  - **`street`**: across one street to the facing block, square or on any angle;
  - **`junction`**: over the junction it faces, to the diagonally opposite block.
- **Length.** No longer than `ROOF_SPAN_MAX_M` **40 m**.
- **Lengths on seed 1:**
  - **`junction`, roof to roof:** 15 of 62 junctions have street corner roofs on two opposite corners (20 pairs), at 30.80, 33.70 and **37.05 m** (two two-way streets, 26.2 m by 26.2 m). Most junctions can't have one: 42 of the 62 are T junctions, whose through-street side has no corner.
  - **`junction`, roof to pole (by hand):** to the opposite block's end slot over two two-way streets, 34.69 m.
  - **`street`, square, to the facing pole line (by hand):** 21.35 m across a two-way street (25 m wall to wall), 16.35 m across a one-way street, 11.35 m across a bare one-way street. Offset along by a, it is √(21.35² + a²).
  - **`down` (by hand):** 5.21 m to the end slot, which is the K1 worked map's figure. To the next pole along, at the K1 pitch of 10 to 12.5 m, it is 12.8 to 15.2 m.
- **Reads:** the roof structures, the poles, `CityStreetsLayer` (cells, junctions, blocks' `sides[*].across`).
- **Status:** the ends (roof to roof or roof to pole) and the junction crossing are **Josh's (23 Nov 2026)**, 6c and 6a. The one-street-or-one-junction limit, the three kinds, `ROOF_SPAN_MAX_M` and the street-cells-only rule are **Proposed**.

**(c) Which roof spans stage 6 offers.** Each roof structure gets these span places:
- **`down`:** to the **two nearest poles** of each of its own block's two pole lines at that corner, which are the end slot and the next pole along. That gives 4 where both sides are pole lines (all four corners of `block:6:6`), 2 where one side is, and 0 where neither is.
- **`street` and `junction`:**
  - to every street corner roof on the facing or diagonally opposite block within 40 m;
  - to that block's fixed poles (end slots, landings, crossing poles) within 40 m, on the pavement that faces this corner.

  Mid-line slots are not offered. That keeps the choice small for P1 and keeps a diagonal readable.

Every place must pass (d). A job uses some of them, subject to CK14 (section 7).
- **Status:** **Proposed.**

**(d) Clearance, in plan and in height.**
- **The floor (CK7).** A roof span's lowest point is at least **4.2 m** (Josh's walk floor, card 7, which the ticket keeps for every span over a street). At `SAG_RATIO` 0.04 this always holds, because both ends are at 5.86 m or more (by hand):
  - a 37.05 m roof-to-roof span sags 1.48 m and stays over 10 m;
  - a roof-to-pole span from 11.5 m to 5.86 m over 34.69 m is lowest at its pole end.
- **Over a junction.** Stage 9 puts signal masts (`SM_Prop_LightPole_Base_01`, 6.48 m, 2.6 m in from each kerb edge of every `pavementCorner`, TR1d) and arms (base 5.38 m) round signal junctions. A `junction` span lies almost exactly over the near corner's mast in plan. So over the junction square, and every street cell within `CELL_M` of it, a roof span keeps `ROOF_JUNCTION_FLOOR_M` **7.5 m** (6.48 m plus 1 m). Stage 6 runs before stage 9, so stage 6 can't read the pieces. It keeps a fixed floor instead, and the pre-check measures the floor against the merged stage 9 pieces.
  - **Roof to roof always clears it:** the lowest is about 10 m.
  - **Roof to pole over a two-way junction (by hand):** at a 2.0 m attachment, from a 3-storey roof the span is about 6.3 m at the square's far edge (fails). From a 4-storey roof it is about 7.1 m (fails). From a 5-storey roof it is about 7.9 m (passes).

  So 6c's roof-to-pole over a junction is offered where the roof is tall enough. Stage 6 does not offer the others. This narrows no answer of Josh's: a roof-to-pole place is still allowed wherever it clears.
- **Over pole spans.** Where a roof span passes over a pole span in plan (a `junction` span crosses both corners' corner spans; a `street` span may cross a crossing), it is at least `ROOF_CLEAR_M` **1.0 m** above it there. By hand, a `junction` span is about 11.1 m where it crosses its own corner span, which hangs at 8.54 m at most (Palm's attachment), so the gap is at least 2.5 m.
- **Near poles.** In plan, a roof span passes no pole, street light or lamp-post place within 1.0 m, except at its own end.
- **Between roof spans.** Among the roof spans one job uses, no two cross in plan, and none passes within 1.0 m of a roof structure it does not end at. So over one junction a job uses at most one `junction` span. Offered places may cross each other, because only used ones stand (question 3).
- **Stage 7.** A roof span leaves its roof at the corner, outwards. It passes over no deck but its own corner's, so no water tower, exit or billboard is under it.
  - The one stage 7 risk is a `down` span. It descends past the corner's two faces, where H1c's face novelty signs may rise to the roof and blade signs stand out about 1 m.
  - **Reported, not failed**, as CK16 does for drops and corner spans (Josh, K1 card 1), until Josh says otherwise.
- **Status:** **Proposed** (`ROOF_JUNCTION_FLOOR_M`, `ROOF_CLEAR_M` and the plan rules). The 4.2 m floor is **Josh's (21 Nov 2026**, K1 card 7, kept for roof spans by the ticket).

**(e) Nodes on a roof structure (6b).**

| Node | On a roof structure | Attachments it needs (its roof span places the job may use) |
| --- | --- | --- |
| `breaker` | **Yes** (6b, Josh's) | 2 or more |
| `fusebox` | **Yes** (6b, Josh's) | 2 or more |
| `switch`, `relay`, `spring` | **Yes** (6b, Josh's) | 3 or more |
| `junction` | **Open: question 1** (recommended yes) | as many as its lines, at least 3, the same as on a pole where the job uses it |
| `battery`, `lamp`, `feed` | **Open: question 1** (recommended no) | none |

- **Attachments** are the roof structure's span places the job may use under CK14. In a one-block district, only its `down` places count, plus the feed's span where that is the one entering span.
- **One node per roof structure.** A roof structure with no node in a line is a carrier (answer 5).
- **On seed 1.** Each corner of `block:6:6` has 4 `down` places, so each may hold a switch even in a one-block job, and a 4-line junction if question 1 says yes.
- **The 2D map and the overlay** draw a roof node at its point's plan metres (CK15 step 3, with "for a roof structure, its point").
- **Status:** the three kinds on roofs are **Josh's (23 Nov 2026)**, 6b. The attachment counts and one node per roof are **Proposed**.

**(f) A roof span in a line (CK13 as changed).** A line's `run.spans` may hold roof spans anywhere in its chain, for example pole, `down`, roof (a carrier), `junction`, roof (a carrier), `down`, pole.
- A `damaged-cable` fault may name a roof span as its cut. P2's designer prefers a ground span where both read from the default camera, because a cut 12 m up reads worst (and D's damaged-line prop has to hang there).
- **Status:** **Proposed**, within answer 5.

**K2 checks (K2d; one line each, so the architect can write at most 10 cases):**
1. Every roof structure stands on a `corner` column with both open sides on streets, at 0.6 m from both walls, its base at the roof piece's base plus 0.5 m.
2. Every roof span has at least one roof end, and its other end is a roof structure or a pole (6c).
3. Every roof span is at most 40 m long and lies over street cells only, apart from its ends' corner cells.
4. Every roof span crosses at most one street or one junction. A span over a junction is a roof span, and no pole span passes over a junction (6a, Q45).
5. Every roof span's lowest point is at least 4.2 m, and at least 7.5 m over the junction square and the street cells within one cell of it.
6. Where a roof span passes over a pole span in plan it is 1.0 m or more above it, and it passes no pole, light or post place within 1.0 m in plan except its own end.
7. The `down` places are exactly the two nearest poles of each own-block pole line at the corner.
8. `nodePlaceProblems`: a breaker or a fuse box needs 2 roof attachments, a switch 3, a junction as question 1 says; a battery, a lamp or a feed on a roof fails (until question 1 says otherwise).
9. In one job, no two roof spans cross in plan, and every roof structure it uses is on a district block (question 5). Its roof span ends are in the district, except the feed's one entering span.
10. `roofKeep` holds every roof structure's 1.2 m keep square, for H4.

**Fails:**
- a roof structure on a mid column, or on a corner column with a lane or park side;
- a diagonal span with two pole ends;
- a roof span over two streets, or over a block;
- a pole crossing over a junction;
- a roof-to-pole span from a 3-storey roof over a two-way junction (under 7.5 m at the square's edge);
- a 45 m span;
- a switch on a roof structure with 2 `down` places in a one-block job;
- a battery on a roof;
- two `junction` spans over one junction in one job.

## 5. Ids and fields, for the architect (before K2d)

The recommended shape is a separate type, not a `CityPoleKind`. `CityPole`'s `street`, `pavement`, `along_m`, `side` and `nudged_m` don't apply to a roof. If one `poles` list is wanted, the alternative is the kind `"roof"` with those fields nullable. Either way:

```ts
/** CK17a: a roof structure place on a street corner roof. A place: it stands only when the live job uses it (question 3). */
interface CityRoofMast {
  readonly id: string;              // "roof:<i>:<j>", the corner column's cell
  readonly building: string;        // CityBuilding.id
  readonly block: string;
  readonly cell: CityCell;
  readonly sides: readonly [CitySide, CitySide]; // its two street sides, in CitySide order
  readonly x_m: number;
  readonly z_m: number;
  readonly deck_y_m: number;        // roof piece base + ROOF_DECK_M; the attachment is the kit's (071)
}

type CityWireSpanKind = "along" | "corner" | "cross" | "roof";
// CityWireSpan for kind "roof": a and b are pole or roof ids (sorted), as now; and
//   over: "pavement" | "street" | "junction"   (CK17b's down, street, junction)
//   street: the street it crosses ("street"), or null; junction: the junction id ("junction"), or null

type CityNodePlace = { pole: string } | { building: string } | { post: string } | { roof: string };

// CityCircuitLayer gains:
//   roofs: readonly CityRoofMast[];             // places (CK17a)
//   roofSpans: readonly CityWireSpan[];         // places (CK17c), kind "roof"; apart from `spans`, which is all built scenery
//   roofKeep: readonly { x_m; z_m; half_m }[];  // H4's squares (CK17a), one per roof structure
```

- **Span ids** keep CK15's form, `span:<a>~<b>` with the two ids sorted. "pole:..." sorts before "roof:...", so a roof-to-pole id is `span:pole:...~roof:...`.
- **Constants** (Proposed, `src/city/circuit/`): `ROOF_MAST_INSET_M` 0.6, `ROOF_MAST_ATTACH_MIN_M` 2.0, `ROOF_MAST_KEEP_M` 1.2, `ROOF_SPAN_MAX_M` 40, `ROOF_JUNCTION_FLOOR_M` 7.5, `ROOF_CLEAR_M` 1.0.
- **`keep`** (stage 8 and stage 9's ground points) does not change: a roof structure is not on the ground.
- **The validator (C1).** `validateCityPuzzle` counts `{ roof }` as a fourth place kind once typed.

## 6. Reach and reading

**In this prototype no reach rule binds a roof node.** It is played by its overlay icon (E1, E2), through the same `src/play/` calls as the 2D map, exactly as a pole node is.

**For the street layer later:**
- **073's T-2** ("From any pole a job could use, there is a way on foot along pavement or road to every other pole of its district") names poles and the ground. A roof node meets it only by a climb. A building's roof exit (H3's `SM_Bld_Roof_Access_01`) is a door onto the roof, not a way up from the street, and only 30 of the 124 corner buildings on seed 1 have one. **So T-2 needs a roof clause: question 2.**
- **073's T-1** ("No piece of any pass covers a stage 6 pole, node place or street light from above") already covers roof structures if their places count as node places. It then keeps the tech and hold-out passes' roof storeys and crowded roofs (B10) off all 124 places. That is a reading for 073 D2's owner, not a question. 073's own rooftop power net (Sci-Fi City `Powerpoll_01/02`, roof to roof) is the tech pass's and stays separate from stage 6 (073, section 5).
- **The schema's `overhead`** ("needs a climb to repair", street scope) is the existing word for it. In a street-scope city puzzle, every line with a roof span would be `overhead`.
- **The brief's "Later: the street".**
  - **The lamp's reach:** Enoch's light reaches a node 11.5 to 17.5 m up only from the street below, so its state reads by its glow rather than up close.
  - **The breaker walk:** a breaker on a roof adds the climb to every throw. That is a cost a street map could use on purpose.
- **No GDD Decided rule covers where a node stands.** The brief's "Rules carried over" (flow, breakers, switches, parts, signatures, faults hide faults, the Relight) say nothing of places. Where nodes stand is Josh's K1 rulings and answer 6b. So no Decided rule clashes with CK17.

## 7. Against each rule it touches

- **CK5 (corner spans never over a carriageway):** unchanged. Roof spans are their own kind, and no corner span moves.
- **CK6 and Q45:** pole crossings stay square, between junctions and never over one. Q45 is lifted for roof spans only (6a).
- **CK7:** the 4.2 m floor holds for every roof span. It always clears it, from the 11.5 m lowest roof attachment. CK17d adds the 7.5 m floor over junctions.
- **CK9, Q4 and Q12:** unchanged. No drop crosses a street, and a roof span is not a drop. A roof lamp, which would light a building across the street by another name, is kept off roofs by question 1's recommendation.
- **CK12 and Q9:** lifted for roof structures only, for breakers, switches and fuse boxes (6b). Junctions, batteries, lamps and the feed are question 1. Q10 (the feed on a pole outside the district) holds under the recommendation.
- **CK13 as changed (answer 5):** a roof structure is a carrier when it holds no node. Roof spans join chains like any span. No two lines share a span.
- **CK14:**
  - Can a roof structure on a block next to the district carry the job? That is **question 5**; the recommendation is no.
  - The feed's one entering span may be a roof span (a reading of "one span that enters from outside per feed").
- **CK15:** a fourth place kind `{ roof }`, whose `pos` is its point over `CELL_M`. Roof spans go to the 3D view by id, as other spans do. `decor` draws no unused roof place.
- **CK16:** roof structures meet stage 7's small props (H4 moves them, 14 near on seed 1) and never a big prop. `down` spans pass corner faces, reported as CK16 reports drops. Roof spans pass over stage 9's masts and arms, held by the 7.5 m floor. Stage 8 is not met, since nothing of a roof structure is on the ground.

## 8. What this note does not decide

- The roof structure's model: Josh's card in D (`roofMast`). 071's Sci-Fi City `Powerpoll_01/02` is an obvious candidate by his own words ("intended to be atop buildings"), and D1 measures it; this note recommends nothing.
- How the 3D view draws an unused roof place (by question 3's recommendation, not at all) and a dead roof span.
- The street layer's climb, its time and its risk.

## 9. Questions for Josh (recommended answer first)

1. **Besides breakers, switches and fuse boxes (your 6b), may a roof structure hold a junction, a battery, a lamp or the feed?** **Junctions yes; batteries, lamps and the feed no.**
   - A roof junction is the hub that puzzle 04's five-line junction needs, since no pole in the city has more than 4 wires. It also helps the ten four-line junctions in the pilot.
   - No pilot puzzle has a battery.
   - A roof lamp would light a building from a wire across the street, which is a drop across the street in all but name, and you kept drops on the pole side (K1 Q12).
   - The feed stays a transformer on a pole outside the district (K1 Q10). Its wire may still come in to a roof.

   The alternatives are to allow all four, or junctions too but nothing else.
2. **For the street layer later, does a node on a roof count as reachable by a climb, so that 073's T-2 gains "or by a climb at its building", and its lines are `overhead` (a climb to repair)?** **Yes.** It needs nothing now, because the prototype plays roof nodes through the overlay. Tying reach to the roof exits instead would leave 30 of the 124 corner roofs on seed 1 usable. The alternative is that T-2 stays ground-only and roof nodes are allowed in map scope only.
3. **Do roof structures and their spans stand only where the live job uses them (as puzzle lamp posts do), not across the whole city?** **Yes.** Your rule is that a diagonal must hang from a roof. With this answer the city shows a diagonal only where a job needs one, so the town keeps its street-wire look and the job's roof wires stand out. The alternative is a fixed roof net in the city: 124 roof structures and their spans on seed 1, drawn as dead scenery.
4. **Roof structures only on the corner buildings at street corners, never mid-row?** **Yes.** The roof stage never puts a water tower, roof exit or billboard on a corner, so nothing has to move. A corner reaches both its streets and the junction, and the corners give 124 places on seed 1, on 35 of 38 blocks. The alternative is any street-front roof, which means moving water towers, exits and billboards off those roofs.
5. **May a job's lines use a roof structure on a block outside its district (as a carrier or a node)?** **No.** A job stays on its own 1 to 4 blocks, as you ruled (K1 Q7). A diagonal over a junction joins two of its blocks, and a one-block job can still bring its feed in on a roof span. The alternative is to allow roofs on the blocks facing the district's streets: one-block jobs would then get diagonals, and the district edge would blur.

## 10. The probe

A throwaway TypeScript probe in the session's scratchpad (`b1probe/probe.ts`) imported the merged `runCity` from this worktree read-only and built 6 x 6 seed 1 through stage 7. It read the corner columns, their open sides, roof piece bases and roof pieces, and the junctions, then placed CK17a's points. It laid no pole: the pole and span numbers above are K1's, or by hand where marked. Nothing of it is in the repo. Its numbers are a sketch; B1p's are the record.
