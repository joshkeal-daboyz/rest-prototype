# 081 B1 · CK17, the street rule and roof structures

## Josh's answers (23 Nov 2026, on question cards in chat)

1. Which pieces may stand on a roof: **"Anything"**.
2. Over an intersection, roof to roof only or down to a tall ground pole too: **"Tall poles too"**.
3. Roof structures where the live puzzle uses them, or on every corner roof: **"On every corner roof"**.
4. Corner roofs only, or mid-row too: **"Mid-row as well"**.
5. T-2 for roof pieces: **"On foot or by a climb (Recommended)"**.
6. Roofs outside the puzzle's district: **"Neighbouring blocks too"**.
7. Mid-row roof structures, always there or only where a puzzle uses one (ticket 081, open question 1; asked after the re-cut): **"Only when used (Recommended)"**. Corner roofs always carry a structure, as scenery. A mid-row roof carries one only while a puzzle that uses it is played. Roof spans are drawn only where a job uses them.
8. Mid-row roofs blocked by stage 7 props, use only clear ones or clear them all (asked after the B1q pre-check): **"Only where clear (Recommended)"**. Stage 7 never moves for a mid-row place; the city check rejects a job whose mid-row keep square meets a stage 7 piece.


23 Nov 2026, puzzle-designer, branch `ticket/081b1-roof-spans`. Ticket 081, sections B1 and B1b (CK17 amended to answers 1 to 7 and to the pre-check, `docs/design/081-B1-precheck.md`). A note, no code.

**Status.** Every question this note asked is answered (above, and section 9). Parts marked **Josh's (23 Nov 2026)** quote his answers and are not up for change here. Parts marked **Proposed** are the designer's working of those answers into numbers and checks; they are nothing until Josh has seen them, and B1q measures them. The K1 rules (`docs/design/070-K1-circuit.md`, CK1 to CK16) hold as Josh answered them on 21 Nov, except where ticket 081's answers 5 and 6 and the answers above change them.

**Numbers.** B1's first numbers were a sketch on 6 x 6 seed 1 (section 10). Where the pre-check (B1p, the 20 named runs) measured a number, its figure replaces the sketch's and says so. Numbers marked "(by hand)" are geometry worked from the K1 slot rule. Mid-row places, the real pole pick, roof nodes of every kind and neighbouring-block roofs are not yet measured: B1q does that, and its numbers are the record.

**Josh's words this note serves** (23 Nov 2026, in chat): "I want to have all of the power lines and the puzzle pieces work within the street structure of the city. If there are power lines that are diagonal across streets, then they have to be attached to structures on top of buildings."

## 1. The answers this note holds

| Answer | Josh's pick | What it fixes here |
| --- | --- | --- |
| 5, carriers | "lines cannot bend, they are runs that go from one structure to another"; "Just carriers (Recommended)" | A line is a chain of straight spans. A roof structure between two spans of a line is a carrier, as a pole is. CK13 as changed. |
| 6a, over an intersection | "Yes, roofs may cross one" | A roof span may pass over a junction. Q45 ("never over a junction") still binds every pole span. |
| 6b, nodes on roofs | "Roofs may hold nodes" | Nodes may stand on a roof structure. K1 Q9 ("on poles only") is lifted for roof structures. |
| 6c, where a diagonal ends | "Roof or pole" | A roof span runs roof to roof or roof to pole. No span runs pole to pole on a diagonal. |
| B1-Q1 | "Anything" | Every node type may stand on a roof structure: breaker, switch, fuse box, junction, battery, lamp, feed (CK17e). |
| B1p-A | "Tall poles too" | Over a junction a roof span may end on a ground pole whose **model** keeps it at 7.5 m (CK17d). Stage 6 reads the pole's model from PK1. |
| B1-Q3 | "On every corner roof" | A structure stands on every street corner roof, as scenery, used or not (CK17a). |
| B1-Q4 and answer 7 | "Mid-row as well"; "Only when used (Recommended)" | Mid-row street roofs are places too, but a structure stands on one only while a puzzle that uses it is played. Roof spans stand only where a job uses them (CK17a, CK17c). |
| B1-Q2 | "On foot or by a climb (Recommended)" | For the street layer, a roof node is reached by a climb at its building (section 6). |
| B1-Q5 | "Neighbouring blocks too" | A job may use roof structures on the blocks one street beyond its district (CK17g). |

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

1. **A node that needs more lines than any pole has spans.** A node's lines must each leave on their own span or drop, because no two lines share a span. **No pole on seed 1 has more than 3 spans** (B1p finding 2): K1's 33 "four-attachment" poles have 3 spans and a drop, and a drop serves only a lamp. So a junction with 4 or more lines to things other than lamps fits on no pole.
   - A roof structure's `down` spans end on poles, so a pole at a corner gains up to 2 more ports. That is how 03, 04, 07, 11 and 12 fit (B1p section 3).
   - A roof structure may also be the hub itself (answer 1, "Anything").
2. **A link between two district blocks that are diagonal across a junction** (6a). A 2-to-4-block district can join its blocks over the junction instead of using two crossings and a corner.
3. **A link across a street that a square crossing doesn't serve.** For example, a node on one block and its line's far end on the facing block, away from where the crossing lands.
4. **A link to a neighbouring block's roof** (answer 6). A one-block job may now use roofs one street beyond it, so a diagonal can appear even in a one-block job.
5. **The feed's span.** CK14 allows "one span that enters from outside per feed". That span may be a roof span, from a district roof or pole to a feed outside (CK17e, CK17g).

**The pilot (B1p section 3, a sketch search on 6 x 6 seed 1; P1's fit is the record).**
- **01, 02, 05, 06, 08, 13, 16:** on poles, on 1 block.
- **03, 07, 09, 10, 14:** on 1 block, using roofs.
- **04, 11, 12:** on 2 blocks, using roofs. B1q measures whether junctions on roofs and neighbouring-block roofs bring them to 1 block.
- **15:** fails CK14 however it is laid. Each of its two feeds has 2 lines, and K1 Q10 gives a feed one entering span. **It is a rework** under ticket 081's answer 4 ("Change the puzzle instead"), in P2a.
- Every roof fit found uses `down` spans; 04, 11 and 12 also use one `street` span each; none uses a `junction` span. Roofs in the pilot mostly add ports to poles.

## 4. The rule

### CK17 · Roof structures and roof spans

**(a) Where a roof structure stands.**
- **Corner places (`row: "corner"`).** A **street corner roof**: a `corner` column (`CityColumn.kind`) whose two open sides both face a street (`CityBuiltCell.open[*].faces` "street"), at most one structure per column.
  - **A structure stands on every one, as scenery, used or not** (Josh's, B1-Q3, "On every corner roof"). A job that uses one puts a node on it or runs its line through it; an unused one stands dead, as the city's other scenery does (CK14).
  - Where on the roof: on the deck, `ROOF_MAST_INSET_M` **0.6 m** in from both street walls, at the corner the two open sides share. That is inside H3's `ROOF_EDGE_M` 0.3 m deck edge and inside the 0.744 m rim of roof styles 2 and 3.
- **Mid-row places (`row: "mid"`).** A **mid-row street roof**: a `mid` column whose open front faces a street, at most one place per column (Josh's, B1-Q4, "Mid-row as well").
  - **A structure stands on one only while a puzzle that uses it is played** (Josh's, answer 7, "Only when used (Recommended)"). Stage 6 lists every mid-row place; the 3D view draws a mid-row structure only for the live job's places (K3).
  - Where on the roof: on the deck, 0.6 m in from the street wall, at the middle of the column's street front.
  - **Proposed: stage 7 is never moved for a mid-row place.** Mid columns hold most of the big roof props (on seed 1: 277 exits, 48 water towers, 52 billboards), and no play-time step may move a stage 7 piece. So a job may use a mid-row place only where stage 7 has left its 1.2 m keep square clear. The city check (K2c, P1's fit) rejects a job whose mid-row place meets a stage 7 piece. H4 clears corner places only. B1q measures how many mid-row places are clear on the 20 runs.
- **Not places:** a corner column with a lane or park side; a mid column whose front is not on a street; a blind column. **Proposed.**
- **Height.** The base is the roof piece's base plus `ROOF_DECK_M` 0.5 m (H3's RT). Decks on seed 1 are 9.5 m (3 storeys), 12.5 m (4) and 15.5 m (5). The wire attaches at the deck plus the pick's attachment height (the kit's, 071), at least `ROOF_MAST_ATTACH_MIN_M` **2.0 m**. So the lowest roof attachment is **11.5 m** (B1p: holds; the lowest point of any offered span is 5.85 m, at its ground-pole end).
- **The keep square (H4).** A `ROOF_MAST_KEEP_M` **1.2 m** half-width square round each place's point, clipped to the deck.
  - **Corner places:** H4 keeps every roof piece outside it, on every corner place, used or not, because a structure always stands there. B1p measured **26 small props** in the corner squares on seed 1 (not B1's 14, which counted pivots, not footprints), 24 to 48 a run, 697 on the 20 runs. Big props: **0** on every run. A small prop that does not fit moves to the column's other half, or is dropped. `roofKeep` lists these squares.
  - **Mid-row places:** H4 does not clear them (above). Their squares are on each `CityRoofMast`, for the city check.
- **Numbers.** Corner places: **99 to 152 a run, 2,490 on the 20 runs** (B1p); **124** on seed 1, on 35 of 38 blocks. `block:6:6`, the worked map's block, has all 4, each at 12.5 m: `roof:54:47`, `roof:67:47`, `roof:54:62` and `roof:67:62`, at (270.6, 235.6), (339.4, 235.6), (270.6, 314.4) and (339.4, 314.4) m. Mid-row places: unmeasured (B1q).
- **Reads:** `CityBuildingsLayer.columns` (`kind`, `front`, `side`, its roof piece's placement), `CityMassLayer.built` (`open`), `CityBuildingsLayer.buildings` (`block`).
- **Status:** corner structures as scenery and mid-row structures only when used are **Josh's (23 Nov 2026)**, B1-Q3, B1-Q4 and answer 7. The inset, the attachment floor, the keep square and "stage 7 never moves for a mid-row place" are **Proposed**.

**(b) What a roof span is (6c, 6a).**
- **Its ends.** A roof span has at least one end on a roof structure. The other end is a roof structure or a pole (6c, Josh's). A span with two pole ends is an along, corner or crossing span as CK4 to CK6 say, never a diagonal across a street.
- **Where it may pass.** It crosses at most **one** street or **one** junction, never a block. In plan it lies over street cells only (pavement, parking, lane, junction, crossing), apart from the cell of its own roof end or ends.
- **Over a junction.** A roof span may pass over a junction (6a, Josh's). A pole span never does (Q45 holds).
- **Its three kinds, by what it passes over:**
  - **`down`**: from the roof to a pole of its own block's pole line on that side, over the pavement only;
  - **`street`**: across one street to the facing block, square or on any angle;
  - **`junction`**: over the junction a corner place faces, to the diagonally opposite block. A mid-row place has no `junction` spans.
- **Length.** No longer than `ROOF_SPAN_MAX_M` **40 m** (B1p: the longest offered is 39.54 m; none runs over a block).
- **Lengths on seed 1 (B1, by hand where marked):** `junction` roof to roof 30.80 to **37.05 m**; `junction` roof to pole 34.69 m (by hand); `street` square to the facing pole line 21.35 m across a two-way street, 16.35 m one-way, 11.35 m bare one-way (by hand); `down` 5.21 m to the end slot, 12.8 to 15.2 m to the next pole along (by hand).
- **Built or not.** **No roof span is built scenery.** Roof spans are places, drawn only where a job uses them (Josh's, answer 7). The offered places cross one another, so a full net would tangle. A corner structure no job uses stands with no wire on it.
- **Status:** the ends, the junction crossing and "drawn only where a job uses them" are **Josh's (23 Nov 2026)**. The one-street-or-one-junction limit, the three kinds, `ROOF_SPAN_MAX_M` and the street-cells-only rule are **Proposed**.

**(c) Which roof spans stage 6 offers.** Each roof place, corner or mid-row, gets these span places:
- **`down`:** to the **two nearest poles** of each of its own block's pole lines on its street sides. A corner place gets the end slot and the next pole along on each side: 4 where both sides are pole lines, 2 where one is, 0 where neither is. A mid-row place gets the nearest pole either side of its point along its one street side: 2, or 0 where that side has no pole line.
  - B1p, corner places on the 20 runs: 4 `down` places on 824 roofs (33%), 2 on 1,205, 0 on 450 (18%). A roof with 0 can still carry a job through `street` or `junction` spans, now that neighbouring blocks count (CK17g).
- **`street` and `junction`:**
  - to every roof place on the facing block (and, for a corner place, the diagonally opposite block) within 40 m;
  - to that block's fixed poles (end slots, landings, crossing poles) within 40 m, on the pavement that faces this place.

  Mid-line slots are not offered. That keeps the choice small for P1 and keeps a diagonal readable.

Every place must pass (d). A job uses some of them, subject to CK14 and CK17g.
- **Not taken:** B1p's lever (`down` places also reaching the block's crossing pole at that corner, which raises one-block switch roofs from 831 to 2,040). Neighbouring-block roofs (CK17g) already give one-block jobs more ports; B1q can measure the lever if P2a needs it.
- **Status:** **Proposed.**

**(d) Clearance, in plan and in height.**
- **The floor (CK7).** A roof span's lowest point is at least **4.2 m** (Josh's walk floor, card 7). It always holds: the lowest offered point is 5.85 m (B1p).
- **Over a junction.** Stage 9 puts signal masts (`SM_Prop_LightPole_Base_01`, 6.48 m, TR1d) and arms (base 5.38 m) round signal junctions. So over the junction square, and over the **carriageway and crossing cells** within `CELL_M` of it, a roof span keeps `ROOF_JUNCTION_FLOOR_M` **7.5 m** (6.48 m plus 1 m). Pavement cells near the junction are not in the zone (B1p finding 3: reading them in cost 11 `down` places on seed 1 for no mast).
  - **Roof to roof always clears it:** the lowest is about 10 m.
  - **Roof to pole is tested on the pole's model** (Josh's, B1p-A, "Tall poles too"). The span's low point near the junction is at its pole end, so what decides is the pole's attachment height, not the roof's storeys. Stage 6 reads each pole's model from its own pick (K2d, `poleAt`'s rule on PK1's `GROUND_POLE_MIX`) and the height from `GROUND_POLE_ATTACH_UP_M`, and offers a roof-to-pole place only where the span's sag curve is at 7.5 m or more over the whole zone.
  - B1p, on `poleAt`'s pick: to a Palm pole (8.5 m) about two thirds of such places pass; to an Apocalypse pole (5.86 m) **none** does (0 of 1,801). The same floor applies to a `street` span whose pole end lands in the zone. B1q re-runs this on PK1's data.
  - Stage 6 runs before stage 9, so it keeps a fixed floor rather than reading the masts. B1p measured it: offered spans clear every stage 9 piece by 2.50 m or more, 0 through one.
- **Over pole spans.** Where a roof span passes over a pole span in plan, it is at least `ROOF_CLEAR_M` **1.0 m** above it there. A `junction` span is about 11.1 m where it crosses its own corner span, which hangs at 8.54 m at most, so the gap is at least 2.5 m (by hand).
- **Near poles.** In plan, a roof span passes no pole, street light or lamp-post place within 1.0 m, except at its own end.
- **Between roof spans.** Among the roof spans one job uses, no two cross in plan, and none passes within 1.0 m of a roof structure it does not end at. So over one junction a job uses at most one `junction` span. Offered places may cross each other, because a roof span stands only where a job uses it (answer 7). B1q checks that a span to a neighbouring roof never crosses another job's district edge in a way these checks miss.
- **Stage 7.** A roof span leaves its roof outwards and passes over no deck but its own, so no water tower, exit or billboard is under it. The one stage 7 risk is a `down` span past the building's face. B1p: 136 of 5,731 offered `down` places pass through a stage 7 piece (3 to 12 a run): escapes (170 boxes), air-conditioners (18), face signs (7), roof props (7), no blade signs. **Reported, not failed**, as CK16 does for drops (Josh, K1 card 1). They show only when a job uses one.
- **Status:** "Tall poles too" and the 4.2 m floor are **Josh's**. `ROOF_JUNCTION_FLOOR_M`, its zone, `ROOF_CLEAR_M` and the plan rules are **Proposed**.

**(e) Nodes on a roof structure (Josh's, 6b and B1-Q1, "Anything").**

| Node | On a roof structure | Attachments it needs (roof span places the job may use, CK17g) |
| --- | --- | --- |
| `breaker` | Yes | 2 or more |
| `fusebox` | Yes | 2 or more |
| `switch`, `relay`, `spring` | Yes | 3 or more |
| `junction` | Yes | as many as its lines, at least 3 |
| `battery` | Yes | as many as its lines, at least 2 (its `input` and one other) |
| `lamp` | Yes | 1 |
| `feed` | Yes, outside the district only (below) | 1, its one entering span |

- **A roof lamp is lit through its roof span.** Its one line arrives on a span to its structure; it is not a drop. Drops stay on the pole side (K1 Q12): a drop never leaves a roof, and a roof lamp never takes a drop. Answer 1 overrides B1's reason for keeping lamps off roofs, for roofs only.
- **A roof feed** stands outside the district, at the far end of the one span that enters it (K1 Q10's side kept). Its structure is on a neighbouring block (CK17g), since a roof span crosses at most one street or junction. It reads as the roof's transformer; its look is K3's. A feed on a district roof fails.
- **One node per roof structure.** A roof structure with no node in a line is a carrier (answer 5).
- **On seed 1.** Each corner of `block:6:6` has 4 `down` places, so each may hold any node of up to 4 lines in a one-block job, more with spans to neighbouring roofs.
- **The 2D map and the overlay** draw a roof node at its point's plan metres (CK15 step 3, with "for a roof structure, its point").
- **Status:** every node type on roofs is **Josh's (23 Nov 2026)**. The attachment counts and one node per roof are **Proposed**.

**(f) A roof span in a line (CK13 as changed).** A line's `run.spans` may hold roof spans anywhere in its chain, for example pole, `down`, roof (a carrier), `junction`, roof (a carrier), `down`, pole.
- A `damaged-cable` fault may name a roof span as its cut. P2's designer prefers a ground span where both read from the default camera, because a cut 12 m up reads worst.
- **Status:** **Proposed**, within answer 5.

**(g) CK14 for roofs: neighbouring blocks (Josh's, B1-Q5, "Neighbouring blocks too").**
- **How far "one street beyond" reaches.** A **neighbouring block** is a block outside the district that is:
  - across one district street from a district block (`sides[*].across`), or
  - diagonally across a junction at a district block's corner.
  Nothing further: a block two streets away, or across a junction from a neighbouring block only, is out.
- **What a job may use there.** Only roof structures, corner or mid-row, as carriers or nodes. Their poles, pole lines and drops stay out of the job: pole lines and drops stay inside the district. So a neighbouring roof's `down` places are never used.
- **Its spans.** Every roof span a job uses has at least one end on a district block. So a neighbouring roof is reached by a `street` or `junction` span from the district, and no job span runs between two neighbouring roofs.
- **The feed.** Yes, the feed's one entering span may start from a neighbouring roof: that is where a roof feed stands (CK17e). It may land on a district pole or a district roof. A feed on a pole stays as K1 Q10 says.
- **Status:** the reach to neighbouring blocks is **Josh's**. The two-way definition of "one street beyond", "at least one end in the district" and the feed reading are **Proposed**; B1q measures them against the pilot.

**K2 checks (K2d; one line each, for the architect's at most 13 cases):**
1. Every corner place is on a `corner` column with both open sides on streets, 0.6 m from both walls; every mid-row place on a `mid` column whose front is on a street, 0.6 m from that wall, mid-front; each base at the roof piece's base plus 0.5 m.
2. Every street corner roof has a corner place (all of them, as scenery); `roofKeep` holds exactly the corner places' 1.2 m squares.
3. Every roof span has at least one roof end, and its other end is a roof structure or a pole (6c). No roof span is in `spans` (built scenery).
4. Every roof span is at most 40 m and lies over street cells only, apart from its own ends' cells; it crosses at most one street or one junction; no pole span passes over a junction (6a, Q45).
5. Every roof span's lowest point is at least 4.2 m, and at least 7.5 m over the junction square and the carriageway and crossing cells within one cell of it, with each pole end at its model's height (`poleModels`, PK1).
6. Where a roof span passes over a pole span in plan it is 1.0 m or more above it, and it passes no pole, light or post place within 1.0 m in plan except its own end.
7. The `down` places are exactly the two nearest poles of each own-block pole line on the place's street sides; a mid-row place has no `junction` place.
8. `poleModels` names every pole, with the same pick as the renderer's `poleAt` (PK1 criterion 2).
9. `nodePlaceProblems` on a roof: a breaker, fuse box or battery needs 2 attachments, a switch 3, a junction its lines (at least 3), a lamp 1 with no drop; a feed only on a neighbouring roof, with its one entering span.
10. In one job, no two roof spans cross in plan; every roof structure used is on a district or neighbouring block; every roof span used has an end on a district block; no pole or drop of a neighbouring block is used.
11. In one job, a mid-row place is used only where no stage 7 piece meets its keep square (K2c or P1, after stage 7).

**Fails:**
- a roof place on a corner column with a lane or park side, or on a mid column whose front is not on a street;
- a street corner roof with no structure;
- a roof span listed in `spans`;
- a diagonal span with two pole ends;
- a roof span over two streets, or over a block;
- a pole crossing over a junction;
- a roof-to-pole span over a junction ending on an Apocalypse pole (5.86 m), from any roof (under 7.5 m at the zone's edge); the same span to a Palm pole where it clears passes;
- a `down` place over a pavement cell beside a junction counted in the 7.5 m zone (the zone is carriageway and crossing cells only);
- a 45 m span;
- a switch on a roof structure with 2 usable attachments in its job;
- a lamp on a roof fed by a drop;
- a feed on a roof structure on a district block;
- a job using a roof two streets from its district, or a neighbouring block's pole;
- two `junction` spans over one junction in one job;
- a job using a mid-row place whose keep square meets a roof exit.

## 5. Ids and fields, for the architect (before K2d)

The recommended shape is a separate type, not a `CityPoleKind`. `CityPole`'s `street`, `pavement`, `along_m`, `side` and `nudged_m` don't apply to a roof. Either way:

```ts
/** CK17a: a roof structure place. Corner places always stand, as scenery (B1-Q3); mid-row places stand only while a job that uses them is played (answer 7). */
interface CityRoofMast {
  readonly id: string;              // "roof:<i>:<j>", the column's cell
  readonly row: "corner" | "mid";
  readonly building: string;        // CityBuilding.id
  readonly block: string;
  readonly cell: CityCell;
  readonly sides: readonly CitySide[]; // its street sides, in CitySide order: 2 for a corner, 1 for mid-row
  readonly x_m: number;
  readonly z_m: number;
  readonly deck_y_m: number;        // roof piece base + ROOF_DECK_M; the attachment is the kit's (071)
  readonly keep_half_m: number;     // ROOF_MAST_KEEP_M; for a mid-row place, the city check's square (CK17a)
}

type CityWireSpanKind = "along" | "corner" | "cross" | "roof";
// CityWireSpan for kind "roof": a and b are pole or roof ids (sorted), as now; and
//   over: "pavement" | "street" | "junction"   (CK17b's down, street, junction)
//   street: the street it crosses ("street"), or null; junction: the junction id ("junction"), or null

type CityNodePlace = { pole: string } | { building: string } | { post: string } | { roof: string };

// CityCircuitLayer gains:
//   roofs: readonly CityRoofMast[];             // every place, corner and mid-row (CK17a)
//   roofSpans: readonly CityWireSpan[];         // places only (CK17c), kind "roof"; never built scenery, apart from `spans`
//   roofKeep: readonly { x_m; z_m; half_m }[];  // H4's squares: corner places only (CK17a)
//   poleModels: Readonly<Record<string, string>>; // pole id to GROUND_POLE_MIX key (PK1); CK17d reads it
```

- **Span ids** keep CK15's form, `span:<a>~<b>` with the two ids sorted. "pole:..." sorts before "roof:...", so a roof-to-pole id is `span:pole:...~roof:...`.
- **Constants** (Proposed, `src/city/circuit/`): `ROOF_MAST_INSET_M` 0.6, `ROOF_MAST_ATTACH_MIN_M` 2.0, `ROOF_MAST_KEEP_M` 1.2, `ROOF_SPAN_MAX_M` 40, `ROOF_JUNCTION_FLOOR_M` 7.5, `ROOF_CLEAR_M` 1.0. Pole heights come from PK1's `GROUND_POLE_ATTACH_UP_M`, not a constant here.
- **`keep`** (stage 8 and stage 9's ground points) does not change: a roof structure is not on the ground.
- **The validator (C1).** `validateCityPuzzle` counts `{ roof }` as a fourth place kind once typed.
- **K3 draws** every corner structure (Josh's `roofMast` pick, or a placeholder), the live job's mid-row structures, and the live job's roof spans only.

## 6. Reach and reading

**In this prototype no reach rule binds a roof node.** It is played by its overlay icon (E1, E2), through the same `src/play/` calls as the 2D map, exactly as a pole node is.

**For the street layer later (Josh's, B1-Q2, "On foot or by a climb (Recommended)"):**
- **073's T-2** for roof nodes reads: **"on foot along pavement or road, or by a climb at its building"**. A pointer line is in 073's ticket. The climb's time and risk are the street layer's.
- **The schema's `overhead`** ("needs a climb to repair", street scope): in a street-scope city puzzle, every line with a roof span is `overhead`.
- **073's T-1** ("No piece of any pass covers a stage 6 pole, node place or street light from above") covers corner places, since their structures always stand. Reading for 073 D2's owner, not a question: a mid-row place an era's pass covers is unusable in that era, and the city check rejects a job that uses it, as for stage 7 (CK17a).
- **The brief's "Later: the street".** Enoch's light reaches a node 11.5 to 17.5 m up only from the street below, so its state reads by its glow. A breaker on a roof adds the climb to every throw, a cost a street map could use on purpose.
- **No GDD Decided rule covers where a node stands.** The brief's "Rules carried over" say nothing of places. Where nodes stand is Josh's K1 rulings and his answers here. So no Decided rule clashes with CK17.

## 7. Against each rule it touches

- **CK5:** unchanged. Roof spans are their own kind.
- **CK6 and Q45:** pole crossings stay square, between junctions and never over one. Q45 is lifted for roof spans only (6a).
- **CK7:** the 4.2 m floor holds for every roof span. CK17d adds the 7.5 m floor over junctions, tested on the pole's model. CK7 itself moves to K2d (ticket 081).
- **CK9, Q4 and Q12:** unchanged. No drop crosses a street or leaves a roof; a roof span is not a drop; a roof lamp is lit by its span (answer 1).
- **CK12 and Q9:** lifted for roof structures, for every node type (6b, answer 1). Q10 holds: a feed stands outside the district, on a pole or a neighbouring roof.
- **CK13 as changed (answer 5):** a roof structure is a carrier when it holds no node. No two lines share a span.
- **CK14:** extended for roofs only to neighbouring blocks (CK17g). Pole lines and drops stay inside the district. The feed's one entering span may be a roof span. Puzzle 15 fails CK14's feeds and is a rework.
- **CK15:** a fourth place kind `{ roof }`, whose `pos` is its point over `CELL_M`. Roof spans go to the 3D view by id. Proposed: `decor` draws the unused corner structures on and next to the district as scenery dots, and no unused mid-row place or roof span.
- **CK16:** corner structures meet stage 7's small props (H4 moves about 26 on seed 1) and never a big prop. Mid-row places move nothing (CK17a). `down` spans past faces are reported, not failed. Roof spans pass over stage 9's masts, held by the 7.5 m floor. Stage 8 is not met.

## 8. What this note does not decide

- The roof structure's model: Josh's card in D (`roofMast`). 071's Sci-Fi City `Powerpoll_01/02` is an obvious candidate by his own words ("intended to be atop buildings"). For information (B1p): its 5.02 m attachment instead of 2.0 m cuts `down` spans through stage 7 from 136 to 26.
- How the 3D view draws a dead roof span (K3).
- The street layer's climb, its time and its risk.

## 9. Questions for Josh

All answered (top of this note). The note's B1-Q1 to Q5, the pre-check's question A and ticket 081's open question 1 are worked in above. **Nothing in CK17 is open for Josh.** The Proposed parts wait on B1q's measures, and any that do not hold go to him with its note.

## 10. The probe

A throwaway TypeScript probe in the session's scratchpad (`b1probe/probe.ts`) imported the merged `runCity` from this worktree read-only and built 6 x 6 seed 1 through stage 7. It read the corner columns, their open sides, roof piece bases and roof pieces, and the junctions, then placed CK17a's points. It laid no pole: the pole and span numbers above are K1's, or by hand where marked. Nothing of it is in the repo. Its numbers are a sketch; B1p's (`docs/design/081-B1-precheck.md`) replace them where marked.
