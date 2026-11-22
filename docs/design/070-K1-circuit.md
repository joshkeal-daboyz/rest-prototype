# 070 K1 · Stage 6, the circuit: where the power goes on the pipeline city

21 Nov 2026, puzzle-designer, branch `ticket/070k1-circuit-design` (from 54d4ddc). Ticket 070, section K1.

This note sets out the rules stage 6 (`circuit`) follows on the pipeline's cells: pole slots, spans, service drops, street lights, the places a puzzle's nodes may stand, the district a job takes, and how a puzzle laid on the circuit becomes a plain `Puzzle`. It also has one worked map: [`puzzles/city-two-ways-round.json`](../../puzzles/city-two-ways-round.json) and [its note](../../puzzles/city-two-ways-round.md).

- **Status.** Every rule marked **Proposed** is the designer's and is nothing until Josh answers section (i) in chat. Rules marked **Ruling** quote Josh and are not up for change here.
- **Numbers.** The numbers are a **sketch**, taken by a throwaway probe outside the repo on 6 x 6 seed 1, one-way on (section 10). The pipeline-designer's pre-check is the record.
- **Scope.** No code, no `src/core/` type, and no pack key. The pole, wire, lamp and component models belong to 071, K3 and K4.

## 1. The rulings this note quotes

| Ruling | Josh's words | What it fixes here |
| --- | --- | --- |
| **Q4**, stage 6's owners | "I think that's stage 6 should be the collaborative work between the puzzle designer and the electrical grid agent" (21 Nov 2026, in chat) | This note is the designer's half. K2 (the grid-simulator) builds stage 6 from it. |
| **071 Q12**, poles not street lights | "Yes to all recommendations" (21 Nov 2026, in chat), on "power poles, with street lights standing apart as lamps" | Lines hang from power poles. A street light is a separate post, in a slot that holds no pole. No line is strung from a street light, and a puzzle lamp is never a line support. |
| **Q45**, no corner poles | "Yes to all recommendations" (21 Nov 2026, in chat), on "Drop the corner poles, so the power lines turn round the block corners and cross streets between junctions, never over a junction" | No pole stands on a `pavementCorner`. A line turns round a block corner on the pavement poles either side of it. It crosses a street only between junctions, never over one. 059's corner poles and its 25 to 45 m junction spans no longer apply. |
| **Stage 9**, traffic control (Q36 to Q43) | "I will take all of the recommendations" (21 Nov 2026, in chat; `docs/design/070-TR-traffic-precheck.md`) | Signal masts stand on every `pavementCorner` of a signal junction, on the approach's far-left corner (Q37). A stop sign stands on the approach's kerbside pavement cell next to its near-right corner (Q40), at `SIGN_KERB_M` 0.5 m from the cell's kerb-side edge and `SIGN_CORNER_M` 1.0 m from its corner end, with `MAST_INSET_M` 0.75 (Q43). TR1's CL keeps `FURN_KEEP_M` from every point stage 6 places. |
| **059**, the approved defaults | "Approve 057, 058 and 059" (18 Nov 2026), every default applied | Poles on one side of a street, the side without the parking band. `WIRE_CLEAR_ROAD_M` 5.5 m over the carriageway. Street lights in slots that hold no pole, on the far side, one every 2 slots. Puzzle lamps and street lights never share a model. |
| **The brief's Rules** (Decided in the GDD) | | Unchanged. The worked map plays by them as written, so `tickets/rules-coverage.md` does not change. |

## 2. The old slot rule, restated (so L2 may delete its code)

This is `src/render3d/tilecity.ts` at b42b65f, lines 119 to 127 and 1741 to 1758:

- `POLE_SLOT_PITCH_M` **12.5 m**: a slot every 12.5 m, "one `Power_Cables_01` span (12.45 m) and a pole", along each side of every street (both pavements).
- `POLE_SLOT_FROM_KERB_M` **0.75 m**: the slot stands this far from the carriageway's edge onto the pavement. That is 0.09 m behind the pack's kerb face (`KERB_FACES_M`, 0.66 m inside the cell edge).
- `POLE_SLOT_END_CLEAR_M` **2.5 m**: along each block's extent, the first slot is 2.5 m from the block's start and the last at least 2.5 m from its end.
- A slot is kept only where the cell under it has role `pavement`. So it is never on a `pavementCorner`, a crossing landing or a `kerbCut`, and a slot that falls on one is dropped.
- Slots were reserved and nothing stood in them. `tileKeepouts` kept the old city's furniture `FURN_KEEP_M` (**1.5 m**) from each.

On 6 x 6 seed 1 the old rule gives **680 slots** (both pavements of all 152 block sides).

## 3. Words

- **Block side.** `CityPlanBlock.sides[side]`: one side of a block, its `street`, and its `span` along that street (cells, high end exclusive).
- **Pavement.** A street's two pavement bands. The **lo** pavement is the cell at `CityPlanStreet.across0`, and the **hi** pavement is the cell at `across0 + bands.length - 1`.
  - A block's `+z` or `+x` side faces the street's lo pavement. Its `-z` or `-x` side faces the hi pavement.
  - Take care: `bands` reads from the street's left looking along +axis. That is low j first on an `x` street, but **high i first on a `z` street**. CK1 reads the parking side from `CityEdgeCell`, not from `bands`' order.
- **Along, across.** Metres on the street's axis (x for an `x` street, z for a `z` street) and across it.
- **Pole line.** The poles along one block side's pavement, when that pavement is its street's pole pavement (CK1).
- **Run.** One or more spans between two node places (CK13).

All metres are in the plan's frame: cell (i, j) covers x in [5i, 5i + 5) and z in [5j, 5j + 5).

## 4. The rules

Each rule gives: the rule, the layer fields it reads, its status, the check K2 makes of it, and one case that fails the check.

### (a) Pole slots

**CK1 · The pole pavement.** Each street carries its poles on exactly one pavement:
- a street with a parking band (any `CityEdgeCell` of the street with role `parking`, `parkingPlain` or `buildout`): the pavement **not** next to that band;
- an edge street (`CityPlanStreet.outer` not null): its **inner** pavement, the one that faces blocks, whatever its parking;
- a `oneWayBare` street (no parking band): the pavement on the traffic's **left**. That is lo on an `x` street with `flow` "+", hi on an `x` street with "-", hi on a `z` street with "+", and lo on a `z` street with "-". The poles then stand away from that street's own stop signs, which keep right (DS, Q40).

| Section | Width | Pole pavement | On seed 1 |
| --- | --- | --- | --- |
| `twoWay`, 15 m carriageway | 25 m | the side without parking | 78 pole lines |
| `twoWay` edge street | 25 m | the inner side. On `z:0` and `x:14` that is the parking side, so their poles stand behind bays and build-outs (`pavementFlush` cells) | 4 streets |
| `oneWay`, 10 m | 20 m | the side without parking (parking is on either side, by stage 1's draw) | 9 pole lines |
| `oneWayBare`, 5 m | 15 m | the traffic's left | 2 pole lines |

- **Band.** Bays and build-outs are on the parking band, so on every inner street the pole pavement has no build-out in front of it. Only the two edge streets above and the crossing poles (CK6) stand on `pavementFlush` cells: 129 poles on seed 1.
- **Reads:** `CityPlanStreet.across0`, `bands`, `section`, `flow`, `outer`; `CityEdgeCell.role`, `street`, `band`.
- **Status:** **Ruling** (059's default: "the side without the parking band"), with two **Proposed** additions: the edge-street rule and the bare-street rule. Those cases are 059's "avenues on the side whose hash says so", and there are no avenues now (grammar rule 10).
- **K2 checks** that every street has poles on exactly one pavement, the one CK1 names.
- **Fails:** `x:4`'s poles moved to its lo pavement, beside its parking band.

**CK2 · Slots along a pole line.** Each block side whose pavement is the pole pavement is a pole line.
- **Fixed points.** The **end slots** stand `POLE_END_CLEAR_M` **2.5 m** in from each end of the side's `span`: the old rule's first slot, and now its last one too. A **landing** stands wherever a crossing lands (CK6).
- **Even pitch.** Between each pair of fixed points, slots are laid at an even pitch no longer than `POLE_PITCH_M` **12.5 m**: n = ceil(gap / 12.5) spans of gap / n each.
- **Offset.** Every slot stands `POLE_FROM_KERB_M` **0.75 m** from the carriageway's edge (the carriage's `lo_m` − 0.75 on the lo pavement, its `hi_m` + 0.75 on the hi pavement). That is the old number.
- **Nudge.** A slot that falls on a cell CK3 forbids moves along the pavement, in `POLE_NUDGE_M` **0.5 m** steps, the lower position first, to the nearest point that lies on a `pavement` cell and at least 0.5 m from any forbidden cell. It is never dropped.
- **What changes from the old rule:** the last slot is fixed, the pitch is even rather than fixed, and a slot is moved, not dropped. Both ends of a line then stand at the same place relative to the corner, so every corner span is the same length (CK5). No gap is left where a slot was dropped.
- On seed 1: **478 slots** (end slots included), 10 landings, and 49 slots nudged.
- **Reads:** `CityPlanBlock.sides[*].span`, `CityPlanStreet.carriage`, `axis`; `CityEdgeCell.role`; `CityGroundCell.variant` (for CK3).
- **Status:** **Proposed** (it changes the old rule; 071 (a) says K1 may choose its pitch).
- **K2 checks** that the end slots are 2.5 m from the side's ends, every slot is 0.75 m from the carriageway edge, and no along span is longer than `SPAN_ALONG_MAX_M` (**20 m**, Proposed; 18.5 m is the longest on the ten one-way-on runs).
- **Fails:** a line whose last slot is 9 m from the block's end, or a dropped slot that leaves a 25 m span.

**CK3 · What a slot never stands on:**
- a `pavementCorner` (Q45: the corners are the masts');
- a pavement cell with `CITY_GROUND_VARIANT.pavementDip` (a crossing lands there);
- a `kerbCut`;
- any cell that is not a pavement (a lane, parking, `parkingPlain`, a `buildout`, a junction, a crossing).

A `pavementFlush` cell (a build-out in front) is allowed: the pole stands on the pavement and the build-out tree is 3.25 m away (the closest on seed 1).

- **Reads:** `CityEdgeCell.role`; `CityGroundCell.variant`.
- **Status:** **Ruling** for the corner (Q45). The rest is the old rule, carried over.
- **K2 checks** each pole's cell role and variant.
- **Fails:** a pole on the dip cell opposite a T's ending street.

### (b) Spans

**CK4 · Along spans.** Neighbouring poles of one pole line are joined by an along span.
- Length 5.0 to 18.5 m on the ten one-way-on runs, and 5.00 to 18.50 m on seed 1.
- On seed 1: 13 spans are under 7.5 m, 14 are 7.5 to 10 m, 332 are 10 to 12.5 m, 31 are 12.5 to 15 m, and 9 are over 15 m.
- The short ones come from a landing 5 m from an end slot. The long ones come from a nudge round a kerb cut or a dip.
- An along span runs over the pavement only, past kerb cuts and dips, never over a carriageway.
- **Reads:** the poles.
- **Status:** **Proposed.**
- **K2 checks** that each along span joins two consecutive poles of one line and is no longer than `SPAN_ALONG_MAX_M`.
- **Fails:** a span that skips a pole.

**CK5 · Corner spans.** Where two adjacent sides of one block are both pole lines, their end slots at the shared corner are joined by a corner span. It runs diagonally over the `pavementCorner` cell, never over a carriageway.
- **Length.** Always **9.55 m**: (2.5 + 4.25) x √2.
- **Clearances.** Taking that corner's block corner as the origin:
  - the span passes 1.24 m from the building corner in plan;
  - it passes 5.08 m from a signal mast on that corner, which stands 0.75 m in from the kerb corner along the cell's diagonal (Q43).
- **Count.** 126 corner spans on seed 1.
- **Reads:** `CityPlanBlock.sides`.
- **Status:** **Ruling** that lines turn round block corners (Q45). The span's place is **Proposed**.
- **K2 checks** that every corner span joins the two end slots at one corner of one block, and that a block corner whose two sides are both pole lines has one.
- **Fails:** a corner span between two different blocks' end slots (that would cross a junction).

**CK6 · Crossings.** An end of a pole line with no corner span (an **open end**) crosses the adjacent street. This happens where the adjacent side's street has its poles on the far pavement.
- **The crossing pole.** A crossing pole stands on the block's own adjacent side, at that side's end slot position: 2.5 m from the corner and 0.75 m from the kerb, on the street's non-pole pavement. The open end's slot joins it by a corner span (CK5).
- **The crossing span.** From the crossing pole, a crossing span runs **square across** the street to the facing block's pole line, which is that street's pole pavement. It lands on that line's end slot when the facing block shares the corner, and otherwise on a landing (CK2) at the same along position.
- **Where it crosses.** The crossing is between junctions, never over one. It is 2.5 m past the corner cell, so 2.5 m beyond the crosswalk, outside the junction square.

| Section crossed | Span | On seed 1 |
| --- | --- | --- |
| `twoWay` (15 m carriageway) | **16.50 m** | 61 |
| `oneWay` (10 m) | **11.50 m** | 10 |
| `oneWayBare` (5 m) | **6.50 m** | 3 |

- **Results.** On seed 1 every open end found its crossing: 74 crossings, 0 failures. On all ten one-way-on runs there were 0 failures too.
- **Reads:** `CityPlanBlock.sides[*].across` (the facing block and its span), `CityPlanStreet.carriage`.
- **Status:** **Ruling** that a line crosses only between junctions (Q45). The crossing's place, at the block end rather than mid-block, is **Proposed**: see question 3.
- **K2 checks:**
  - every open end has exactly one crossing;
  - every crossing span is square to its street, starts and ends 0.75 m behind the kerbs, and lies outside every junction's carriageway square and its crossing cells;
  - its crossing pole passes CK3.
- **Fails:** a span from a line's end slot straight on over the junction to the next block's end slot on the same street (Q45's case).

**CK7 · Clearance.**
- A span over a carriageway (every crossing) has its lowest conductor at least `WIRE_CLEAR_ROAD_M` **5.5 m** above the carriageway. That is 059's number, kept.
- With 059's `SAG_RATIO` 0.04, a 16.5 m crossing sags 0.66 m, so its conductors must be fixed at **6.16 m** or higher at both poles. The attachment height is the kit's, not the layer's (071: "the layer gives spots and spans, and the kit gives poles and pieces").
- Along and corner spans are over the walk. They keep their lowest point above `FURN_MAX_H_M` 3.2 m plus 1 m (Proposed), the height stage 8 already names for "an item taller than this keeps clear of wire spans".
- **Reads:** the spans, and the kit's attachment heights (071 B).
- **Status:** **Ruling** for 5.5 m (059). The walk clearance is **Proposed**.
- **K2 checks** each crossing's lowest point against the kit's attachment table.
- **Fails:** a crossing hung on a pole whose conductors sit at 6.0 m (5.34 m over the road).

**CK8 · One network, fed per job.**
- **Network.** The city's spans make **one connected network**. On seed 1 all 562 poles are in one component. On seeds 1 to 10, one-way on, each run is one component (sketch).
- **Feed.** The network is **dead** until a job feeds it. Each puzzle has its own feed or feeds (CK12), standing at its district's edge (CK14). The rest of the city is never fed.
- **Reads:** the poles and spans.
- **Status:** **Proposed.**
- **K2 checks** that the city's network is connected, and that each city puzzle's lines are connected from its feed.
- **Fails:** a city whose crossings are left out at one T: two components.

### (c) Service drops

**CK9 · Drops.** Every building (`CityBuilding`) whose `front` open side faces a street (`CityBuiltCell.open[*].faces` "street" on its cells) takes **one drop** if that street's pole pavement is its own block side's pavement.
- **Where.** Take every pair of one of the building's front columns (a column of its `cells` with that open side) and one pole of that pole line. The drop runs between the pair that is closest in plan. It meets the wall at the centre of that column's front edge, at `DROP_WALL_Y_M` **5.5 m** (storey 1, between the ground storey's top at 3 m and storey 2 at 6 m).
- **Ties.** On a tie, the column earlier in `cells` is used, then the pole earlier along the line.
- **Never across a street.** A building on the non-pole pavement takes no drop. A drop across the street would need its pole end near 6.4 m for 5.5 m over the road, which is storey 2 at the wall.
- **Numbers.** On seed 1: **250 drops** for 426 street-front buildings (176 face a non-pole pavement), 4.25 to 5.20 m long in plan. In the worked district: 15 drops for 15 buildings.
- **Reads:** `CityBuildingsLayer.buildings` (`front`, `cells`, `block`); `CityMassLayer.built` (`open`); `CityBuildingsLayer.columns` (`kind`, `front`); the poles.
- **Status:** **Proposed.** See questions 4 and 5.
- **K2 checks** that each drop's building fronts its pole's line, the drop is no longer than `DROP_MAX_M` (**7.5 m**, Proposed), and no drop crosses a carriageway.
- **Fails:** a drop from a pole across the street, or one to a building that faces a park.

### (d) Street lights

**CK10 · Street lights.** Street lights stand on the **non-pole pavement** of each block side (059: "on the far side of the street from the poles").
- **Where.** They take CK2's slot positions as laid on that pavement (end slots at 2.5 m and an even pitch of 12.5 m or less), taking every second one, 1, 3, 5 and so on. The end positions are skipped, because crossing poles stand there.
- **None stands:**
  - on a cell CK3 forbids;
  - within `LIGHT_POLE_MIN_M` **3 m** of any pole (059's number);
  - in a slot that holds a pole (Q12).
- **What it is.** A street light carries no line. It is scenery: always the same, never a node, never a target.
- **Numbers.** On seed 1: **113 lights**, 20 to 50 m apart along a side. The closest light to a pole is 6.50 m, and the closest to a stop-sign spot is 11.29 m. Its model is K3's and 071's question.
- **Reads:** as CK2, on the non-pole pavement.
- **Status:** **Ruling** for the far side and every second slot (059), and for no line on a light (Q12). The skip at end positions is **Proposed**.
- **K2 checks** that no light is in a pole's slot or within 3 m of a pole, and that none is on a forbidden cell.
- **Fails:** a light on the crossing pole's spot.

**CK11 · A puzzle lamp is not a street light.** A puzzle lamp is a node (CK12). It is either a **building** at its drop's wall point, or a **lamp post** on the **pole** pavement at the midpoint of an along span of 7.5 m or more, 0.75 m from the kerb. A street light stands only on the far pavement. So a post on the pole side is always a puzzle lamp, and a post on the far side is always a street light.
- **The lead.** A lamp post's one line is a short underground lead from the nearer of its span's two poles (a run with no span, CK13). No wire hangs from it (Q12).
- **Numbers.** Lamp-post places on seed 1: 386.
- **Reads:** the spans and the drops.
- **Status:** **Proposed**, keeping 059's lamp table (model, light and halo are K3's).
- **K2 checks** that a lamp post stands at a span midpoint on the pole pavement, and that no street light is a node.
- **Fails:** a puzzle lamp at a street light's place.

### (e) Node places

**CK12 · Where each node type may stand.** **One node per pole.** A pole that holds a node keeps all its spans and drops. A building is at most one lamp. A span midpoint holds at most one lamp post. Attachments are a pole's spans plus its drops.

| Node | May stand | Places on seed 1 | In the district |
| --- | --- | --- | --- |
| `feed` | On a pole **outside** the district at the far end of a span that enters it: a crossing pole, or a pole on the far side of a corner span (CK14). It reads as a pole-mounted transformer, and its look is K3's. | 74 crossing poles, plus end slots | 8 crossing poles |
| `breaker` | On any pole with 2 or more attachments: it cuts its downstream runs. | 562 | 30 |
| `switch`, including `relay` and `spring` | On a pole with **3 or more** attachments: its input run and its two output runs. | 291 (258 with 3, 33 with 4) | 19 |
| `battery` | On a pole with 2 or more attachments: its `input` run and its far side. | 562 | 30 |
| `fusebox` | On a pole with 2 or more attachments, as a pole-mounted cutout. | 562 | 30 |
| `junction` | On any pole. It is required where a run bends or branches (CK13). | 562 | 30 |
| `lamp` | A building with a drop, at the drop's wall point; or a lamp post (CK11). | 250 buildings + 386 posts | 15 + 24 |

- **What is not a place:** a `pavementCorner`, a street light, and the carriageway. A pole on a corner would be stage 9's mast's place (Q45). A switch on a pole with only 2 attachments would have nowhere to send its second output.
- **Reads:** the circuit layer, `CityBuildingsLayer.buildings`.
- **Status:** **Proposed.** See question 9 for fuse boxes on walls.
- **K2 checks** each node's place against the table, and one node per place.
- **Fails:** a switch on an end slot with one along span and one corner span.

**CK13 · What a line is on the city.** A puzzle line is a **run**, which is one of:
- one or more consecutive along spans of one pole line;
- one corner span;
- one crossing span;
- one drop;
- one lamp post's lead.

A run's two ends are node places. Its interior poles hold no node, and at them the job uses no other attachment: whatever else hangs there is scenery (CK14). So every pole where a job's line bends (a corner) or branches (a drop it uses, a switch's outputs) is a node, usually a `junction`. That keeps every line straight in plan, and the 2D view draws it true.

A **damaged cable is one span** of its run. The fault names the line, and the conversion records which span (CK15) so the 3D view cuts that one.

- **Reads:** the spans and the drops.
- **Status:** **Proposed.**
- **K2 checks:**
  - every run is a chain of spans of one kind, as above;
  - its interior poles hold no node;
  - no two runs share a span;
  - a fault's span is in its line's run.
- **Fails:** a run that goes along, round a corner and on, with no junction at the bend.

### (f) The district

**CK14 · What one job takes.**
- **Extent.** A puzzle names its **district**: 1 to 4 blocks that touch across a street, and the streets round them, kerb to far pavement.
- **Lines.** Its lines may use:
  - the pole lines on those blocks' own pavements, and their corner spans;
  - the crossings between the district's blocks;
  - the drops and lamp posts on them;
  - one span that enters from outside per feed (the feed's span).
- **The edge.** Every other span that leaves the district is **open**: it is drawn, and dead.
- **While the job is played:**
  - the rest of the city's poles, spans, drops and street lights are scenery: drawn as built, dead (no pulse, no live glow, no cut look) and never picked;
  - inside the district, every pole, span and drop the job does not name is scenery too. A building the job does not name stays dark: it is not on the job.
- **The edge is the designer's choice.** The puzzle file lists the blocks, and K2 checks the rest.
- **The worked map** takes one block, `block:6:6`: 70 m by 80 m, a 318 m ring.
- **Reads:** `CityPlanBlock.sides[*].across`, the circuit layer.
- **Status:** **Proposed.** See question 7.
- **K2 checks:**
  - the district's blocks touch;
  - each line uses only the district's spans or its feed's span;
  - each feed stands outside the district, joined by exactly one span that enters it.
- **Fails:** a line that runs on past the district's edge into the next block.

### (g) The conversion

**CK15 · From a city puzzle to a plain `Puzzle`.** A city puzzle file is today's `Puzzle` with these changes.

New fields, **for the architect** (none is in the schema today, so the worked map has none and its note's place table carries them):

| Field | Holds |
| --- | --- |
| `city` (top level) | `{ blocksX, blocksZ, seed, oneWay }`, the city it is laid on |
| `district` (top level) | its block ids |
| `place` (on each node, instead of `pos`) | one of `{ pole: <pole id> }`, `{ building: <building id> }`, `{ post: <span id> }` |
| `run` (on each line) | its span ids, in order from `from` to `to`; or `{ drop: <building id> }`; or `{ lead: <span id> }` |
| `span` (on a `damaged-cable` fault) | which span of the run is cut; absent means the first |

Ids, stable for 071's hash:
- a pole: `pole:<street id>:<lo|hi>:<along_m, 2 decimals>`;
- a span: `span:<pole id a>~<pole id b>`, with the ids in sorted order;
- a drop: `drop:<building id>`.

The conversion (K2, pure) takes the city puzzle and the plan, and returns a `Puzzle` that `src/grid/` runs unchanged:
1. `id`, `name`, `version` (5), `scope` "map", capacities, `startingParts`, `target` and `priority` are copied.
2. **The origin** is the district's least corner: the least x and least z over every cell of the district's streets along its blocks.
3. **`pos`** for each node is ((x_m − x0) / `CELL_M`, (z_m − z0) / `CELL_M`), rounded to 4 decimals. For a pole that is the pole's metres. For a building it is its drop's wall point, at plan x and z. For a post it is the span's midpoint.
4. **Lines** keep their ids, with `from` and `to` as the run's end nodes. The run itself goes to the 3D view (K3) by its span ids, never into `src/grid/`.
5. **Faults** are copied. A `damaged-cable` fault's `span` goes to the 3D view.
6. **`decor`**: one decorative path per scenery span and drop that touches the district's poles (CK14), in `pos` units, so the 2D view shows the town round the job. The worked map does this by hand.

A layer to convert from, sketched **for the architect**. The names are free, but note that `CitySpan` is already taken in `cityplan.ts` (a stretch along a street):

```ts
interface CityPole { id; kind: "end" | "slot" | "landing" | "crossing"; street; pavement: "lo" | "hi"; along_m; x_m; z_m; block; side: CitySide; nudged_m }
interface CityWireSpan { id; kind: "along" | "corner" | "cross"; a: string; b: string; len_m; street: string | null }
interface CityDrop { id; pole; building; cell: CityCell; x_m; z_m; y_m }
interface CityStreetLight { id; street; pavement: "lo" | "hi"; along_m; x_m; z_m; block; side: CitySide }
interface CityCircuitLayer { stage: "circuit"; poles; spans; drops; lights; keep: readonly { x_m; z_m }[] }
```

- `keep` is every pole and light, for I2 and TR1's CL. It holds points, not spans: the spans' heights are the kit's.
- **Status:** **Proposed.**
- **K2 checks** that the converted `Puzzle` passes `validatePuzzle`, and that every node's `pos` equals its place's metres over `CELL_M` within 1e-4.
- **Fails:** a node whose `pos` was hand-moved off its pole.

### (h) Keep-clear

**CK16 · What the later stages already leave free.** Stage 6 runs after stages 1 to 5 and before 7, 8 and 9 (R-1). For each thing it places:

| What stage 6 places | Stage 7, facades (as merged) | Stage 8, ground (I, as merged) | Stage 9, traffic (TR1 as cut; not merged on this branch) |
| --- | --- | --- | --- |
| **Poles and crossing poles**, 0.75 m behind the kerb, 4.25 m from the wall | **No rule leaves room.** T1 lets a front-face piece reach `CELL_M` past the wall, and an awning `CELL_M` − `AWNING_KERB_M` = 4.7 m, past the poles' 4.25 m. Measured: **0** poles inside a stage 7 footprint on seed 1 (the deepest straight awning, `Shop_Cover_03`, reaches 3.5 m). Room in practice, not by rule: a pre-check item, and a re-open of H1b only if it ever fails. | **NL**: stage 8 keeps `FURN_KEEP_M` from `keepPoints`, which it passes empty today. **I2 fills it** (already in K's plan, not a re-open). On seed 1, 26 of 615 props stand within 1.5 m of a pole (bollards 14, hydrants 9, trees 2, a meter 1) and would move. | **CL** keeps `FURN_KEEP_M` from every stage 6 point (a list passed empty, as I's NL). Masts stand on `pavementCorner`s, and CK3 puts no point there. Stop signs: the nearest pole to any stop-sign spot (ST's numbers, both pavements, both ends of every side) is **1.521 m**, which clears 1.5 m by only 0.021 m. Room is left, but thin (question 2). |
| **Corner spans**, about 5.6 to 6.0 m up, 1.24 m from the building corner | **No rule.** On seed 1, **2** corner spans pass through a face novelty sign (H1c's F rule lets one rise to the roof). Needs H1c to re-open (face signs keep clear of a corner span), or it is accepted. | `FURN_MAX_H_M` (3.2 m): "an item taller than this keeps clear of wire spans (stage 6's, not read yet)". I2 reads the spans. | Masts are 5.08 m from the span in plan. The span never crosses the carriageway, so no arm meets it. |
| **Crossing spans**, over the carriageway, 2.5 m past the corner cell | Nothing of stage 7 is over the road. | Nothing over the road. The closest build-out tree to a crossing span is 5.00 m (stage 4 lays no tree beside a crossing). | Signal arms hang over the approach at the mast, 4.47 m back from the block's end on the corner cell. The crossing is 2.5 m into the block side, so the arm and the span are **6.97 m** apart. |
| **Drops**, from the pole to the wall at 5.5 m | **No rule.** On seed 1, **24 of 250** drops meet a stage 7 box: escapes 18 (H2, mid columns of qualifying buildings), face novelty signs 6 (H1c). At 5.0 m fascia signs join them too, so 5.5 m is the height. Needs **H2 and H1c to re-open**: the escape host (EH) and the face sign (F) skip a column that takes a drop, read from a keep list. | Over the walk at 5.5 m or more. I2 reads them for its tall items. | Not met. |
| **Street lights**, 0.75 m behind the kerb on the far pavement | As poles: **0** inside a stage 7 footprint on seed 1, and no rule. | NL (I2). | CL. The closest stop-sign spot is 11.29 m away. |
| **Lamp posts** (puzzle-only, mid-span on the pole pavement) | As poles. | NL (I2). | CL. Mid-span is at least 3.75 m from either pole and far from every corner. |

**The re-openings this note would cost** (each one Josh's call, never assumed; question 5):
- **H2** (escapes) and **H1c** (face novelty signs), to keep off drop columns and corner spans.
- **I2**, which is already planned.
- **TR1**, which already reads `circuit` and passes its keep list empty. It only fills it once the layer is typed, and its digest re-pins (TR's own note (a)).

## 5. (i) Questions for Josh (recommended answer first)

1. **Poles on one side of each street, the side without parking; on the four edge streets, the side that faces the town; on the one-lane bare streets, the traffic's left: yes?** **Yes.** It is your 059 default, with an answer for the cases it did not cover. On two edge streets the town side is the parking side, so their poles stand behind the bays.
2. **Keep the old 2.5 m from the block end for the first and last pole: yes?** **Yes.** Every corner turn is then the same 9.55 m. *Note:* the stop signs you approved stand 1.0 m from the corner, so the nearest pole is 1.52 m from a sign, just over the 1.5 m keep-out. The alternative is 3.0 m: the margin grows to about 2 m, and corner turns become 10.25 m.
3. **Lines cross a street 2.5 m past the corner, right after the crosswalk, rather than in the middle of the block: yes?** **Yes.** It is "between junctions, never over one", as you ruled, and it needs no extra poles. A true mid-block crossing would need a short second row of poles on the far pavement to reach it.
4. **Service drops only to buildings on the pole side of the street, none across a street: yes?** **Yes.** A drop across the road would hang below the 5.5 m road clearance unless it met the wall at the second floor. About 6 in 10 street buildings get a drop (250 of 426 on seed 1); the rest read as fed from behind.
5. **Drops meet the wall at the first floor, 5.5 m up, and the facade stage is re-opened so that fire escapes and the big face signs keep off a column with a drop (about 1 drop in 10 meets one today): yes?** **Yes.** It is the only way drops and escapes never cross, and the change to H2 and H1c is small: a skip list and a fixture each. The alternatives are to leave the 24 crossings in, or to have no drops until a later ticket.
6. **Street lights on the far side, one every second slot (about 25 m), never within 3 m of a pole: yes?** **Yes.** It is your 059 default with the crossing poles kept clear. 113 lights on seed 1.
7. **A job takes 1 to 4 neighbouring blocks, with the first city jobs at one block (about 320 m of line round it): yes?** **Yes.** One block already holds a ring, two targets and a choice. The rest of the city stays dark scenery while you play.
8. **Crossing spans need their wires at 6.2 m or more on the poles (16.5 m over a 15 m road, at the sag you approved, keeping 5.5 m clear): leave the pole's height to 071's pick, and if the pick is shorter, flatten the sag on crossings only: yes?** **Yes.** The short apocalypse pole (6.3 m) cannot carry a crossing at today's sag. The palm and sci-fi poles (7.9 to 10.8 m) can.
9. **Fuse boxes, breakers and switches only on poles for now, not on building walls: yes?** **Yes.** One kind of place keeps the 2D map and the overlay simple. Lamp Row's fuse box inside a shop is a street-layer idea, for later.
10. **Each city job brings its own feed (a transformer on a pole just outside the district), with the rest of the city's wires dead: yes?** **Yes.** It is the brief's "failing source" per section, and no job depends on another.

### The list the pre-check must measure (the 20 named runs)

1. CK1: every street has poles on exactly one pavement, by section and band. Count the poles on `pavementFlush` cells.
2. CK2 and CK3: no pole on a forbidden cell. Count the slots nudged, and the longest nudge.
3. CK4: along spans by length (the shortest and the longest), with a histogram as in section 6.
4. CK5: every corner span is 9.55 m. Its distance to the building corner and to the signal mast.
5. CK6: every open end has a crossing (0 failures). Lengths by section. Each crossing is outside every junction's carriageway square and crossing cells.
6. CK8: one connected network per run.
7. CK9: drops per run, their lengths, and the buildings left without one.
8. CK10: lights per run, their gaps, and their distance to poles.
9. CK12: in a one-block district of every run, at least one place of every node kind. Report the blocks with no switch place.
10. CK16 against the merged stages 4, 7 and 8 and TR1 as cut:
    - poles and lights inside stage 7 footprints;
    - spans through stage 7 boxes;
    - drops meeting stage 7 boxes, at 5.0, 5.5 and 6.0 m;
    - stage 8 props within `FURN_KEEP_M` of a point;
    - stage 8 items over `FURN_MAX_H_M` under a span;
    - build-out trees under or beside spans (canopy radius from the kit);
    - stop signs and masts against `FURN_KEEP_M`.
11. The worked map's places, re-measured on 6 x 6 seed 1, against its note's place table.

## 6. The numbers on 6 x 6 seed 1, one-way on (sketch)

The probe built the city through stage 8 with the merged code (read only), then laid CK1 to CK10.

| | Whole city | District `block:6:6` and its four streets |
| --- | --- | --- |
| Old rule's slots (both pavements) | 680 | |
| Block sides / pole lines | 152 / 89 (two-way 78, one-way 9, bare 2) | 4 / 4 |
| Poles | **562**: 478 slots (end slots included), 10 landings, 74 crossing poles | **38**: 30 on the block (8 end slots, 20 slots, 2 landings), 8 crossing poles across its streets |
| Along spans | 399, 5.00 to **18.50 m** | 26, 5.00 to 14.67 m |
| Corner spans | 126, all **9.55 m** | 4, 9.55 m |
| Crossing spans | 74: 61 at **16.50 m** (two-way), 10 at 11.50 m (one-way), 3 at 6.50 m (bare) | 8, 16.50 m |
| Network | one component, 0 open ends left | the block's ring, plus 8 crossings out |
| Drops | 250 of 426 street-front buildings, 4.25 to 5.20 m | 15 of 15, 4.25 to 4.63 m |
| Street lights | 113, 20 to 50 m apart | 8 |
| Feed places | 74 crossing poles, and end slots across a corner | 8 |
| Switch places (3 or more attachments) | 291 | 19 |
| Breaker, fuse box, battery and junction places | 562 | 30 |
| Lamp places | 250 buildings + 386 lamp-post spans | 15 + 24 |

**On the ten one-way-on runs** (seeds 1 to 10, connectivity only):
- one component each, 0 failures;
- along 4.83 to 18.50 m, corner 9.55 m, crossings 6.50, 11.50 and 16.50 m;
- 530 to 643 poles.

**Span lengths for 071 A (item 13, the city's spans)**, against its candidate pieces at 0.5x to `LINE_STRETCH_MAX` 1.25x:

| Piece | Fits | Along 5.0 m | Corner 9.55 m | Crossing 16.5 m | Along 18.5 m |
| --- | --- | --- | --- | --- | --- |
| City Pack `Power_Cables_03`, 13.49 m | 6.7 to 16.9 m | 0.37x, under | 0.71x | 1.22x | chain of 2, 0.69x |
| Sci-Fi Frontier `Cable_12..16`, about 12 m | 6 to 15 m | 0.42x, under | 0.80x | chain of 2, 0.69x | chain of 2, 0.77x |
| Palm `Powerline_*`, about 7.7 m | 3.9 to 9.6 m | 0.65x | 1.24x | chain of 2, 1.07x | chain of 2, 1.20x |

The 13 spans under 7.5 m on seed 1 are under 0.5x for the two long pieces. That is 071's call: allow 0.37x, or chain the short Palm piece there.

## 7. The worked map

[`puzzles/city-two-ways-round.json`](../../puzzles/city-two-ways-round.json) tests the brief's element 7 (*two wires, one job*) on the ring round `block:6:6`.

- **The map.** The feed is a crossing pole on `z:6`. The switch is on the landing pole where the feed's crossing comes in. The shrine (east) and the infirmary (south) are buildings on their drops. One wire is given, and there are two breaks.
- **Analyzer.** Solvable. Min clicks 2. 1 winning order. 1 winning configuration. No fuse blows. The obvious first move (mend the visible spark) is the one dead end.
- **The places.** Every node and line is traced to CK2, CK5, CK6, CK9, CK12 and CK13 in its note's place table, with the probe's metres.

## 8. What this note does not decide

- Any pack key: the pole, wire, transformer, street light and component models are 071's, K3's and K4's.
- How the 3D view draws a dead scenery wire next to a live one (K3, K4).
- The street layer (Enoch walking, salvage, the night clock). The worked map's walking numbers are given by hand.

## 9. Changes to rulings

None. Every change to the old slot rule and to 059's defaults is marked Proposed and asked in section (i).

## 10. The probe

A throwaway TypeScript probe in the session's scratchpad (`k1probe/`) imported the merged `runCity` from this worktree read-only and built one city at a time. It laid CK1 to CK10, then read stage 7's pieces with their kit bounds and stage 8's props. It is deleted after this note, and nothing of it is in the repo. Its numbers are a sketch; the pre-check's are the record.
