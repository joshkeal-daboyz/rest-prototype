# City grammar: how a building, a row and a block are put together from the City Pack

Draft for Josh, 19 Nov 2026. Design only: no code, no puzzle, nothing under `src/grid/` or `src/night/` is touched by this file.

- **Status.** Nothing here is Decided until Josh says so in chat. So far he has answered one question: Q1, on 19 Nov 2026 (rule 7). Lines marked **Law** quote a Decided line of `docs/city-style-guide.md` or Josh's words in `docs/city-state-2026-11-19.md`; everything else is **Proposed**.
- **Scope.** The tile city (`city=tiles`) on `goal/city-style`. The ladder maps keep chapters 4 and 16 as they are (`packpin.test.ts` and `townpin.test.ts` hold).
- **Evidence.** The measurements are in the appendix. I took them today from `city-pack.glb` with a scratch script that is not committed. I have not seen a render, or Josh's reference image; where a rule leans on something only an eye can settle, it says so under **Not verified**.

## The one idea

**The pack is a 5 m kit, and a building column is one cell of it.** Every apartment and shop piece has a wall body of exactly 5.00 m by 5.00 m (appendix A). The road tiles and the sidewalk tiles are 5.00 m by 5.00 m. So the city is one lattice of 5 m cells, and a cell is a road tile, a sidewalk tile, a paving tile, a grass tile, or one building column.

Ticket 063's sections are symptoms of placing pieces by their outlines (5.0 to 5.9 m) on lots of 5.2 m by 6 m. On the lattice the sliver (I), the passages (057 B), the ragged backs (C) and the stepping storeys (E2) have one cause and one cure: put each body on its cell and let only the trim overhang.

Synty's page for the pack says the same in its own words: "Modular sections are easy to piece together in a variety of combinations", with a Modular Apartment Set, Modular Shop Fronts, a Modular Road Set and a Modular Park Set. It gives no grid size; the 5 m comes from the pieces.

Where each point of the brief is answered:

| Brief | Rules |
| --- | --- |
| 1 footprint | 1, 2 |
| 2 rows and blocks, what stays open | 4, 5 |
| 3 intentional gaps, closing the rest | 6 |
| 4 exposed faces, the party wall | 3, 8, 9 |
| 5 corners | 7 |
| 6 street cross-section | 10 |
| 7 roofs | 11 |
| 8 heights and styles | 8, 12 |
| 9 checks, and the guide checks that change | each rule, then "The checks" and "Guide checks that change" |

## A block, drawn

One court block, 16 by 9 cells, north at the top. Each letter is one 5 m cell.

```
  ═══════════════════════════════════  kerb line (rule 10)
   p p p p p p p p p p p p p p p p     pavement band, 1 cell
   C M M M M M c ░ ░ c M M M M M C     ring 1: faces out, onto the street
   M B m m m m c ░ ░ c m m m m B M     ring 2: faces in, onto the court
   M m . . . . . . . . . . . . m M     ring 3: paved apron
   M m . g g g . P P P . g g . m M     interior: greens g, parking court P
   M m . . . . . . . . . . . . m M
   M m . g g g g g g g g g g . m M
   M m . . . . . . . . . . . . m M
   M B m m m m m m m m m m m m B M
   C M M M M M M M M M M M M M M C
```

- `C` corner column: two open sides, a corner piece.
- `M` mid column on a street; `m` mid column on a court or lane.
- `c` corner column beside an opening.
- `B` blind column: no open side; only its roof is seen.
- `░` the court drive, an opening two cells wide through both rings.

A strip, 2 cells deep, between a street and a lane (rule 4):

```
   street   C M M M M M M C   street
            C m m m m m m C
            ─ ─ lane, 1 cell ─ ─
```

## The rules

### 1. The module

- **Rule.** A building column stands on exactly one cell. Its four wall planes are on the cell's four edges: the front wall on the edge it faces, the side walls on the side edges, the back wall on the back edge. The two-bay shop (`Shop_03`) stands on two cells. A building is 2 to 4 columns in a row (`TERRACE_BAYS`, unchanged) that share one style, one colourway and one floor count. Nothing is scaled and nothing stands off the lattice.
- **Why.**
  - Law: "the buildings are intended to be butted up against eachother."
  - Law (chapter 2): no building model is ever shrunk or grown.
  - Measured: every apartment and shop piece is a 5.00 by 5.00 m body; the corner pieces are too, 0.10 m off the centre of their bounds (appendix A).
- **Check M1, lattice fit** (pure, over the packed city). Every column's four body planes lie on its cell's edges within `WALL_JOINT_TOL_M` (0.02 m).
  - Fails today: a three-column `Apartment_02` building is laid 15.51 m wide by its bounds, so its side walls stand 0.17 m from its neighbours'. The tile city's rows are also cut in 5.2 m bays on a 6 m band (`TERRACE_BAY_M`, `TERRACE_DEPTH_M`).
- **Check M2, the kit holds** (`it.skipIf`, reads the GLB). Every piece of `STACK_STYLES` used by the tile city has a body of 5.00 by 5.00 m within 0.02 m (10.00 by 5.00 for `Shop_03`). A piece that fails is dropped from the tile city's styles; the lattice is not bent to fit it.
- **Open.** `Shop_04`'s back wall measures 0.27 m deeper than 5.00 behind the wall plane `WALL_FRONT_M` gives it (appendix A). Section E2 keeps "a base piece may stand deeper at the back, never shallower". The extra is then inside the column behind it and cannot be seen. E2's builder confirms.

### 2. Trim

- **Rule.** Everything outside the body is trim: sills, plinths, cornices, parapets, awnings, signs. Trim may reach up to `OVERLAP_MAX_M` (0.6 m, unchanged) over the next cell, whatever that cell is: pavement, lane, court, or a neighbour's trim. Trim is never used to measure, place or pack a piece.
- **Why.**
  - Law (19.1): "It's okay if the buildings rest on top of the sidewalk and overlap a little bit. It is not okay if the buildings sit recessed from the sidewalk and leave a gap of nothing between them."
  - Measured: trim reaches 0.05 to 0.14 m past the side walls and up to 0.557 m past the front wall.
- **Check.** G1 (19.7) with its numbers unchanged, now run on every open side of the built mass (lane and court faces as well as street faces).
- **Not verified.** Two neighbours' trims overlap by up to 0.28 m where they meet. Whether that shimmers needs a look.

### 3. The face rule (the party-wall rule)

- **Rule.** For each built cell, count its open sides: the sides whose neighbour cell is not built (pavement, lane, drive, court, apron, green, plaza, park edge).

| Open sides | Column | Pieces | What shows |
| --- | --- | --- | --- |
| 0 | blind | any floor pieces and a roof | the roof only |
| 1 | mid | mid pieces, front on the open side | one windowed face |
| 2, adjacent | corner | corner pieces, turned as rule 7 says | two windowed faces |
| 2 opposite, 3 or 4 | not allowed | none | the layout is wrong |

  Every other side of a column is a **party wall**: blank in the pack, so it must be against another building.
- **Why.**
  - Law: "the backs of buildings are also butted up against the backs of other buildings. Also intentional. Without this you end up with featurless walls."
  - Measured: a mid piece has windows on its front only; its two sides and its back are single blank planes of 13 to 15 m2. A corner piece has windows on its front and on one adjacent side (-x), and two blank faces. The kit has no piece with windows on opposite faces or on three faces (appendix A).
- **Check M3, the face rule** (pure, over the cell occupancy). No cell has opposite open sides or more than two. Every column's kind and yaw match its open sides.
  - Fails today: every mid column of the default city is open to the street and to the ring-2 apron (opposite sides), and a row end at a gated passage is open on three.
- **Open.** None. This is the kit's own constraint.

### 4. Back to back: rings, strips and block depth

- **Rule.** Buildings always stand in back-to-back pairs. A block part (a rectangle of cells bounded by streets, lanes and park edges) is one of two shapes, by its short side:

| Short side | Shape | What it is |
| --- | --- | --- |
| 2 cells | strip | two rows back to back, each facing its own edge; no interior |
| 6 cells or more | court block | ring 1 faces out, ring 2 faces in onto an interior of at least 2 cells |
| 3, 4 or 5 cells | not laid | 3 leaves a single row or a 5 m slot between blank backs; 4 and 5 are nearly all blind columns |

  - Ring 2's buildings are buildings of their own (rule 12 says how they vary). Each stands column for column behind a ring-1 building and has the same floor count, so the wall between the two never shows.
  - The four cells where ring 2 turns a corner are blind. Each takes the style, colourway and floor count of the ring-1 corner building it stands behind.
  - A ring-2 or lane-facing row is a row like any other: rules 1 to 3 and 6 to 12 apply to it.
- **Why.**
  - Law: the same words as rule 3. A single row always shows its blank back.
  - Measured: two bodies back to back are exactly 10.00 m, two cells. The 0.4 to 1.8 m "overshoot into ring 3" that section C allowed for was the outlines.
  - Josh offered thinner blocks himself on 18 Nov ("those squares of buildings be thinner so that the buildings are butted up right against each other"). A strip is that, as a part of a block, without making every block thin (19.3's road share stands).
- **Check M4, pairs** (pure). Every ring-1 column of a court block has a built cell behind it or a recorded opening (rule 6). Each ring-2 building has its partner's floor count and a different colourway. No part has a short side of 3 to 5 cells.
  - Fails today: ring 2 is apron (`APRON_STRIP`) on every block; an alley cuts a 9-cell side into two parts of 4.
- **Cost, by arithmetic on the default city's block sizes** (14, 11, 6 by 13, 9, 15 cells; alleys and parks ignored). Ring 1 is 372 cells and ring 2 is 300, of which 36 are blind. Buildings take 59% of block area and the interior 41% (71% today). The three 6-cell-wide blocks keep interiors 2 cells wide. Building draw calls roughly double (stacks are per-piece clones). Homes roughly double; rule 5 says what that does to parking.
- **Open.** Q2 (backs are other buildings, or the same building repeated) and Q6 (strips).

### 5. What stays open inside a block

- **Rule.** The interior of a court block starts at ring 3 and is filled as 19.4 fills it today, in the same order: the paved apron (ring 3, `APRON_CELLS` 1), the residents' court, then green with paths. The apron is the walk in front of ring 2's doors. Every interior is reached from outside by at least one opening (rule 6).
- **Why.**
  - Law (19.4): "Grass and pavement should fill the blank areas."
  - Law: "If you're going to have an inlet to areas between buildings it needs to be paved".
- **Check.** G3 (no void) and G4 (courts reached) with their numbers unchanged. G3 now credits rings 1 and 2 as buildings. New in M5: every interior touches an opening.
- **Parking.** The checks P1 to P6 and every threshold stay. Units are counted from cells: a column is a 5.0 m cell (18.2 says 5.2 m bays). Ring 2 and the lane rows add homes. My estimate for the default city is about 860 homes against 379 today, so about 129 stalls wanted. Two courts a block (`LOTS_PER_BLOCK_MAX`) give 108, which is 0.84 of demand and inside `PARK_SUPPLY_BAND`, but only if every block fits two courts, and the 6-cell-wide blocks may not. Section C1's builder measures it. If P2 does not hold it comes to Josh with the numbers (Q5); it is never met by widening the band.

### 6. Openings: the only gaps

- **Rule.** A gap in the built mass exists only as an **opening**: a whole number of cells, recorded in the layout, and paved or planted. This is the whole list.

| Opening | Size | Floor | Kerb |
| --- | --- | --- | --- |
| lane (alley) | 1 cell wide, street to street | bare road; its two mouth cells paved (063 H) | turns in, with returns (rule 10) |
| court drive | 2 cells wide, through both rings | paved (063 H) | turns in, with returns |
| frontage lot | 2 by 2 cells, at most one block in nine (19.4) | asphalt and stall lines | turns in, with returns |
| plaza | 2 by 2 cells at a block corner (`TILE_PLAZA_W_M`) | paving | runs straight past |
| park | a whole block or half of one (19.6) | green, with its pavement edge | runs straight past |
| walk-through | 1 cell wide, through both rings; only for an interior that has no drive and no lane | paved | runs straight past |

  - Between two openings, and between an opening and a block corner, a row is at least 2 cells long (one building).
  - **A row always closes.** Columns and openings are whole cells, so the stretch between them is a whole number of columns. There is no leftover to close. The tile city has no seam, no overshoot and no gated passage. If a row ever fails to close, the layout is wrong and the check fails; nothing is drawn to hide it.
- **Why.**
  - Law: "They can have gaps but those caps must be intentional (alley ways... etc)".
  - Measured: the passages come from the outlines. "N unscaled columns span only 5.0 N to about 5.28 N metres" (19.2), so 50 of the default city's 52 rows end in a passage of 1.0 to 5.3 m. On bodies, N columns span exactly 5 N metres.
- **Check M5, openings** (pure). Every cell of rings 1 and 2 is built or belongs to a recorded opening of the table. `TileCity.passages` is empty. Every interior touches an opening. No row stretch is 1 cell long.
  - Fails today: the default city has 50 passages, none a whole cell. A city with one opening's record removed also fails: an opening has to be laid to count (section I's fixture, kept).
- **Open.** Q4 (retire the gated passage; the walk-through).

### 7. Corners

- **Rule.** A corner piece stands in a corner column and nowhere else, and every corner column takes corner pieces from the ground to the roof.
  - **The turn is forced.** A corner piece's second windowed face is on the left of its front, seen from the street in front of it (measured: -x). A piece cannot be mirrored. So each corner has exactly one legal turn: the piece's front goes on the side from which the other open side is to the left. Either hand of corner can be served, because the other open side then takes the front.
  - **The body, not the bounds.** A corner piece's body is 0.10 m off its bounds' centre; it is placed by its body (rule 1).
  - **The ground piece.** Where at least one of the two open sides is a street or a park edge: a shop corner. Otherwise (lane and court, drive and court): the residents' corner door (`Apartment_Door_Corner_01`, `_02`, in the pack and not used today).
- **Why.**
  - Law (chapter 7): "Corner buildings should only be placed on corners. They must also have two sides facing the street."
  - Law (16.3): "the shop corners are intended to be base units for the larger structures."
  - Josh, 19 Nov: "corner store is not angled on the corner".
  - Measured: every corner piece I read (the three apartment corners, the two corner doors, the two shop corners) carries windows on +z and -x and is blank on +x and -z; the corner roofs' shaped edges are on the same two sides (appendix A). Section E1, in flight, pins the same.
- **Check M6, corner turn** (pure). Every corner column's two measured window faces lie on its two open sides; no corner piece stands in a mid or blind column (R9, unchanged in meaning); the roof corner is turned with its column. This is E1's criterion 25 run on every corner column of the city.
  - Fails today: every corner piece is turned on the guess "+x", so the windowed side faces the neighbouring column.
- **Decided (Josh, 19 Nov 2026, in chat).** Asked "May corner pieces stand wherever two open sides meet, not only where two streets meet?", he answered: "Yes, any corner". So a corner piece stands wherever two open sides meet: where two streets meet, at a lane mouth, a court drive, a plaza, and inside a court. This widens chapter 7's "two sides facing the street"; the rest of that ruling stands (corner pieces only on corners). The guide's chapter 7 and R9 take his words when section C1 lands.
- **Open.** None.

### 8. Heights, and the wall above a lower roof

- **Rule.** Heights are free between buildings in a row (3 to 5 storeys, neighbours differ: R2, unchanged). Where a building is taller than its neighbour, its party wall shows above the lower roof, 5 m wide and one or two storeys high. That is the only blank wall the grammar lets be seen, and it is dressed: every such storey face carries at least one piece of the **party-wall kit**, so no stretch of it longer than `BLANK_RUN_MAX_M` (3 m, section C's provisional number) is bare.

| Kit piece | Size | Fit |
| --- | --- | --- |
| `SM_Prop_Billboard_Sign_01` to `_07` (a painted board) | 4.19 by 2.03 m | one storey face, 0.4 m margins |
| `SM_Prop_Pipe_Present_01` to `_03` (a pipe run) | 2.8 to 4.5 m wide, 4.2 to 7.1 m high | one or two storeys |
| `SM_Prop_Window_01` (a window) | 1.30 by 2.31 m | two to a storey face |

  - By hash, with no key twice running along a row. A fire escape never stands on a party wall: it has no window to step out of (16.11's Law).
- **Why.**
  - Law: "This doesn't mean the buildings need to be the same height."
  - Law: "Without this you end up with featurless walls."
  - Measured: the kit's pieces are in the pack and fit a 5 by 3 m storey face (appendix C).
- **Check M7, no bare party wall** (pure; this is section C's `blankFaces`, defined on storey faces). For every column side that is a party wall, each storey above the neighbour's roof carries a kit piece lying on that face, and its widest bare stretch is at most `BLANK_RUN_MAX_M`. A party wall with an open cell beside it is M3's failure, not this check's.
  - Fails today: every joint between two buildings of a row steps in height (R2), and nothing dresses the step.
- **Open.** Q3. The pipe runs are in `CITY_NEVER_USED` with the reason "back walls only"; using them on party walls lifts them, which is Josh's call. Whether a painted board on most steps reads as too many adverts is for his eye.

### 9. Frontage kinds: what each open face carries

- **Rule.** Every open side of the built mass is a frontage of one of two kinds.

| Kind | Where | Ground row | Dressing |
| --- | --- | --- | --- |
| street | a street's pavement, a park's pavement edge, a plaza | shops, and one residents' door per building (R3, unchanged) | 16.5 unchanged: glass, awnings, signs, ATM, fire escapes, wall props |
| quiet | a lane, a court drive, a walk-through, the court | one residents' door per building; windowed floor pieces in the other columns; no shop | door canopy, wall air-conditioners, planters, fire escapes by 058's rules, bins against the wall clear of doors |

  - A windowed face needs nothing more to pass rule 3: the piece's own windows are its feature.
  - The alley side of a part is a quiet frontage with a row of its own. 19.6's "the side beside the alley is a rear, not a frontage" goes.
- **Why.**
  - Law (18.1): "shoppers park at the kerb"; a shop on a court or a lane has no kerb.
  - Josh's reference, as the brief records it: "every visible face carrying windows, fire escapes, awnings, signs".
- **Check M8, quiet rows** (pure). No shop, glass, awning, fascia sign or ATM stands on a quiet frontage; every building there has exactly one door. R3 to R6 keep their thresholds and count street frontages only, as today.
  - Fails on a fixture: a ring-2 building with a shop piece.
- **Open.** None blocking. The pack's washing lines (5.21 m, the width of a lane) would suit lanes and courts; a later dressing ticket.

### 10. The street cross-section and the kerb line

- **Rule, the sections.** In cells, across:

| Way | Cells | Carriageway |
| --- | --- | --- |
| street | pavement, parking band, lane, lane, pavement (5 cells, 25 m) | 3 cells, 15 m |
| lane (alley) | 1 cell, no pavement, no parking | 1 cell, 5 m |

  - There are no avenues (section B's option B1). A junction is 3 by 3 cells.
  - Every parking-band cell is one of three things, as 18.5 has it: a bay, a build-out, or plain in front of an opening's mouth.
- **Rule, one walk colour.** Every walked surface anywhere (pavement, build-out, inlet, apron, path, plaza, park edge) is an opaque kit piece in the one slab colour, `#8c8987` (063 A and D, built).
- **Rule, the kerb line.** Each block side has one unbroken kerb line from junction to junction.
  - It runs along the pavement's road edge.
  - It steps out round every stretch of build-outs.
  - At every opening a vehicle enters (lane, court drive, frontage lot) it turns in with a rounded return on each side, runs along that side of the opening, and ends on the wall of the corner column at the building line. The mouth between the two returns is the dipped kerb.
  - At a plaza, a park edge and a walk-through it runs straight past.
  - Every turn of the line has a pack piece (appendix B): the straight, the outer corner (`Sidewalk_Corner_01`, or `Sidewalk_Dip_Corner_01` at a crossing), the inner corner (`Sidewalk_Corner_02`), the dip (`Sidewalk_Dip_01`), and the plain slab (`Sidewalk_01`) behind a build-out.
- **Why.**
  - Law: "Make the side walk one uniform color." "The streets do not need to be 4 tiles wide."
  - Law: "the curb structures have to follow the curb"; at an inlet the kerb turns in with a rounded return along each side (his drawing, 063 F's worked example).
  - Measured: every kerb face stands 0.63 to 0.68 m inside its cell (063 F); the pack has both corner pieces.
- **Check.** Section F's tests (criteria 33 to 37c), in flight, with two additions: the line has no return at a plaza, park edge or walk-through, and each return ends within 0.05 m of a corner column's wall plane. Section B's criterion 8 pins every carriageway at 15 m.
  - Fails today: a kerb cut has plain straights beside it; one line in three is an avenue (`AVENUE_ONE_IN`).
- **Open.** Q7 (no avenues).
- **Not verified.** That `Sidewalk_Corner_02` is the inner corner: its only kerb lip is a 1 m square in one corner of the tile, which is what an inner corner looks like. A look at the tile sheet settles it.

### 11. Roofs and rooftop items

- **Rule.**
  - Every built cell has exactly one roof piece of its building's own style: the mid roof on mid and blind columns, the corner roof on corner columns, turned with its column. No roof is borrowed from another style (Q-E2's default).
  - The roof's base course sits on the body. Its cornice is trim (rule 2) and overhangs by what the piece carries.
  - Rooftop props stand `ROOF_EDGE_M` inside the body's edge, not the cornice's.
  - A roof exit stands wholly on its roof with its door away from every open side of its column and 1.2 m of clear deck in front (063 G). Where its building has a blind or court-side column, it stands there.
  - A roof billboard faces a street.
- **Why.**
  - Josh, 19 Nov: "The building roof tiles aren't properly scaled"; "roof top exists shouldn't open to the street. They should be on the roof."
  - Measured: each mid roof's base course is 5.02 m wide, on the 5.00 m body; the cornices flare to 5.25 to 5.31 m, and to 5.6 to 5.9 m on the corner roofs (appendix A).
- **Check M9, roofs** (pure). One roof piece per built cell, its kind matching the column's kind. E2's criterion 30 (storeys and roof aligned within `STOREY_ALIGN_TOL_M`) and G's criterion 40 stand as written.
  - Fails today: the red building, a corner roof 5.90 m wide centred over a 5.20 m outline.
- **Not verified.** All three roofs have their deck at 0.50 m. A ring-1 building and its ring-2 partner have the same height by rule 4, so their cornices overlap along the party line at the same level. If that shimmers, ring 2's roofs sit 0.02 m lower: a move, not a scale.

### 12. Variety

- **Rule.** Unchanged from 16.4 unless listed.
  - Row neighbours never share a style, a colourway or a floor count (R2, R13).
  - A ring-2 building's style is its own, by hash; its colourway differs from its partner's and its row neighbours'; its floor count is its partner's (rule 4).
  - Blocks differ by size (19.5), and by treatment: court block, alley cut, strip, half park, whole park (19.6).
  - An alley cuts a block only where each part it leaves has a short side of 2 or of 6 or more (rule 4). A 9-cell side becomes 2, lane, 6.
- **Why.** Law (19.5): "90 degrees does not mean a grid of squares. You can have varying widths for blocks, alleyways, parks... etc"
- **Check.** R2, R13 and V1 to V4, thresholds unchanged. V3 counts lanes as it does today.

### Not in this grammar yet

The pack's office sets are towers on whole cells with windows on all four faces: 10 m (2 by 2 cells), 15 m (3 by 3) and 20 m (4 by 4). A tower could stand anywhere in the mass with any number of open sides. No tile-city row uses one, and their bodies are not measured. A later ticket.

## The checks, in one table

| Check | Holds | Rule | Built by |
| --- | --- | --- | --- |
| M1 lattice fit | every body plane on its cell edge | 1 | I |
| M2 the kit holds | every piece's body is 5.00 by 5.00 m | 1 | E2 |
| M3 face rule | open sides 0, 1 or 2 adjacent; kind and yaw match | 3 | C1 |
| M4 pairs | every column backed; partner floors equal; no part 3 to 5 deep | 4 | C1 |
| M5 openings | whole cells, recorded; no passage; interiors reached | 6 | I (passages), C1 (the rest) |
| M6 corner turn | window faces on the two open sides | 7 | E1, extended by C1 |
| M7 no bare party wall | every exposed storey face dressed | 8 | C3 |
| M8 quiet rows | no shop on a lane or court; one door per building | 9 | C1 |
| M9 roofs | one roof per cell, kind and alignment | 11 | E2, G |
| kerb line | F's criteria, plus the two additions | 10 | F |
| street width | every carriageway 15 m | 10 | B |

Each runs on the default city, seeds 1 to 10 at 3 by 3 and seeds 1 to 3 at 6 by 4, as the guide's checks do, and each has the failing fixture named under its rule.

## Guide checks that change

No threshold is loosened. Stated plainly:

- **G2 is tightened.** A block side's back edge is covered only by a wall or by a recorded opening. Seam, overshoot and gated passage stop being accepted covers on the tile city. `PASSAGE_W_M`, `END_OVERLAP_MAX_M` and the gate's constants retire there. The ladder keeps chapter 4.
- **G1** keeps its numbers and now runs on lane and court faces too.
- **G3** keeps its numbers. Ring 2 is credited as building; `APRON_STRIP` retires.
- **G4** is unchanged; a drive is two rings deep.
- **R1** keeps Josh's floor of 0.88. The share should rise, because the passages go; the builder reports it. The floor is not raised without his word.
- **R2, R13** unchanged; they also run on ring-2 and lane rows.
- **R3 to R6** keep their thresholds and their count (street frontages). Quiet frontages get M8 instead. This is a scope, not a loosening: no bay counted today stops being counted.
- **R7** keeps its guaranteed share over the same qualifying blocks (street-facing). Escapes on court faces are extra and not counted.
- **R8** keeps its threshold over all buildings; the count grows with ring 2. The builder reports it.
- **R9** changes meaning, by Josh's answer to Q1 ("Yes, any corner", 19 Nov 2026): a "true corner" is any column with two adjacent open sides. It still fails on a corner piece anywhere else.
- **P1 to P6** keep their thresholds. Units are counted from 5.0 m cells and include ring 2 and lane rows (rule 5).
- **V1 to V4**, `escapeCheck`, the sill checks and the draw-call caps are unchanged. The stack draw calls roughly double. If the frame rate on Josh's PC cannot hold, that goes to Josh, and the remedy is instancing the stack pieces, not a higher cap.
- **Guide text that goes** when the sections land: 19.2's far-end order and its passages; 19.4's ring-2 strip; 19.6's alley rear; 18.2's 5.2 m bays; chapter 7's "+x" guesses.

## What changes in ticket 063

- **B (street width).** No change to its content. B1 (no avenues) is what rule 10 assumes. It is independent of the rest and moves row lengths, so it goes early.
- **E2 (one footprint).** Its rule stands. Three additions: check M2 (the kit holds); a roof's body is its base course, so the cornice overhangs evenly; a corner column's body is its cell, so "the outer flank on the column's outer edge" needs no special case.
- **I (walls touch) becomes "the lattice".**
  - `columns: "body"` stays, and the tile city's rows are cut in 5.0 m bays on a 5.0 m band. That needs a bay and a depth option in `terraceBlockRows`, and `town.ts` is on the ticket's must-not-touch list: the architect re-cuts I to allow those two options, defaulting to today's values so the ladder holds.
  - Criterion 49 ("the passage count is expected to drop sharply") becomes: the passage count is 0.
  - Criterion 51 (the order for a leftover gap) and Q-I2 go: a leftover is a failed check.
  - `wallJoints`' list of intentional openings loses the seam and the gated passage. The check is M1 plus M5's passage line.
- **C (backs) is re-cut on the lattice.**
  - C-rows stays. Ring 2 is exactly one cell deep, so `BACK_OVERSHOOT_MAX_M` goes, and `BACK_COVER_MIN` (0.9 of the strip) is replaced by M3 and M4, which are exact.
  - New in C1: blind corner columns; the drive runs through ring 2; lane rows on alley sides; quiet ground rows (M8); corner columns beside openings (Q1, decided).
  - `blankFaces` is M7, on storey faces. Q-C2 is answered: corner pieces at openings (Q1), the party-wall kit on height steps (Q3).
  - Three builds: **C1** the plan and M3, M4, M5, M8; **C2** the drawing; **C3** the party-wall dressing (M7), and strips if Q6 is yes.
- **F, G, A, D, H** are unchanged. F's returns end on corner columns once C1 lands.

**Order.** E1 and E2 (in flight), then B, then I, then C1, C2, C3, then G. F is independent and merges when it is ready. B is half a day and can run while Josh answers the questions below. I must precede C1, which lays ring 2 on I's cells.

## Decide first

Questions only Josh can answer, most important first. Q1 is answered; Q2 to Q7 are open.

1. **May corner pieces stand wherever two open sides meet?** That is: at a lane mouth, a court drive, a plaza and inside a court, as well as where two streets meet.
   - **Answered (Josh, 19 Nov 2026): "Yes, any corner".** Rule 7 records it.
2. **The backs: other buildings, or the same building repeated?**
   - **Recommended: other buildings** (ring 2 has buildings of its own style and colour, the same height as the one in front). His later words: "butted up against the backs of other buildings".
   - Alternative, his first words ("re use the stacked build blocks of the same type"): each building is 10 m deep, one style and colour through, with a street face and a court face.
3. **The wall above a lower neighbour's roof.**
   - **Recommended: dress it** with the party-wall kit, and lift the pack's pipe runs from the never-used list for party walls only.
   - Alternatives: leave it bare, as the one blank wall allowed; or let row neighbours differ by one storey at most, so there is less of it.
4. **Retire the gated passage.**
   - **Recommended: yes.** On the lattice no row needs one. An interior with no drive and no lane gets one 5 m walk-through, paved.
   - Alternative: leave such interiors sealed.
5. **Parking, once ring 2 is counted.** Homes roughly double.
   - **Recommended: keep 0.15 stalls a home and every threshold; measure in C1.** If two courts a block cannot hold P2, raise `LOTS_PER_BLOCK_MAX` to 3 on blocks at least 10 cells each way. That is a re-cut for his word, not a wider band.
6. **Strips** (a 10 m deep part cut off a block by a lane, two rows back to back).
   - **Recommended: yes, in C3.** Not needed for C1 or C2.
7. **No avenues** (section B's B1): every street 25 m with a 15 m carriageway.
   - **Recommended: yes.**

## Not verified

- No render was looked at. Every "reads as" in this file is a claim for Josh's eye.
- The handedness of the corner pieces (second face on the left) is read from the GLB's own frame. E1's screenshots confirm it in the scene.
- `Sidewalk_Corner_02` as the inner kerb corner (rule 10).
- Whether overlapping trims and roof decks shimmer (rules 2 and 11).
- `Shop_04`'s body depth (rule 1).
- The parking and draw-call numbers are arithmetic on block sizes, not a run.

## Appendix: what was measured

From `city-pack.glb`, 19 Nov 2026, in metres in each piece's own frame (front is +z, y up). A "body" is the box between the largest wall planes.

**A. Buildings.**

| Piece | Side walls (x) | Front wall, back wall (z) | Body | Faces with windows |
| --- | --- | --- | --- | --- |
| `Apartment_01` | -2.50, 2.50 | 2.40, -2.60 | 5.00 by 5.00 | +z |
| `Apartment_02` | -2.50, 2.50 | 2.48, -2.52 | 5.00 by 5.00 | +z |
| `Apartment_03` | -2.50, 2.50 | 2.40, -2.60 | 5.00 by 5.00 | +z |
| `Apartment_Corner_01` | -2.40, 2.60 | 2.40, -2.60 | 5.00 by 5.00 | +z and -x |
| `Apartment_Corner_02` | -2.48, 2.52 | 2.48, -2.52 | 5.00 by 5.00 | +z and -x |
| `Apartment_Corner_03` | -2.40, 2.60 | 2.40, -2.60 | 5.00 by 5.00 | +z and -x |
| `Apartment_Door_01` | -2.50, 2.50 | 2.26, -2.74 | 5.00 by 5.00 | +z |
| `Apartment_Door_02` | -2.50, 2.50 | 2.50, -2.50 | 5.00 by 5.00 | +z |
| `Apartment_Door_Corner_01` | -2.26, 2.74 | 2.26, -2.74 | 5.00 by 5.00 | +z and -x |
| `Apartment_Door_Corner_02` | -2.50, 2.50 | 2.50, -2.50 | 5.00 by 5.00 | +z and -x |
| `Shop_01` | -2.50, 2.50 | 2.23, -2.77 | 5.00 by 5.00 | +z |
| `Shop_02` | -2.50, 2.50 | 2.29, -2.71 | 5.00 by 5.00 | +z |
| `Shop_03` | -5.00, 5.00 | back -2.75 | 10.00 wide | +z |
| `Shop_04` | -2.50, 2.50 | back -2.88; planes at 2.12 and 2.39 | 5.00 or 5.27 deep | +z |
| `Shop_05` | -2.50, 2.50 | 2.48, -2.52 | 5.00 by 5.00 | +z |
| `Shop_06` | -2.50, 2.50 | 2.15, -2.85 | 5.00 by 5.00 | +z |
| `Shop_Corner_01` | +x 2.50 | back -2.55 | 5.0 (open faces are glass) | +z and -x |
| `Shop_Corner_02` | +x 2.50 | 2.50, -2.50 | 5.00 by 5.00 | +z and -x |

- A blank face is one flat plane of 11 to 15 m2, with at most a trim band above or below it.
- `Apartment_Stack_01` to `_03` are three floors in one piece (9 m) on the same bodies.
- Roofs: every mid roof's base course is x -2.51 to 2.51. Cornice tops: `Roof_01` 5.31 by 5.92, `Roof_02` 5.25 by 5.49, `Roof_03` 5.31 by 5.62, `Roof_Corner_01` 5.90 by 5.92, `_02` 5.62 by 5.62. All decks are at 0.50 m. The corner roofs' shaped edges are on +z and -x, as the corner floors' windows are.

**B. The kerb kit** (all 5.00 by 5.00 m; walk at 0.23 m, lip at 0.30 m).

| Piece | Kerb |
| --- | --- |
| `Sidewalk_Straight_02` | one side, the face 0.67 m inside the cell |
| `Sidewalk_Corner_01` | two adjacent sides, faces 0.67 and 0.86 m inside; an outer corner |
| `Sidewalk_Corner_02` | a 1 m square of lip in one corner only; an inner corner |
| `Sidewalk_Dip_01` | a dropped kerb |
| `Sidewalk_Dip_Corner_01` | two adjacent sides with crossing ramps |
| `Sidewalk_01` | none: the plain slab, 0.03 m thick |

**C. Pieces for walls** (width by height by depth): `Prop_Billboard_Sign_01` to `_07` 4.19 by 2.03 by 0.12; `Prop_Pipe_Present_01` 4.46 by 7.05 by 0.50, `_03` 2.83 by 4.24 by 0.50 (`_02` is 3.17 deep and stands off the wall); `Prop_Window_01` 1.30 by 2.31 by 0.37; `Prop_Door_01` 1.43 by 2.62 by 0.50, `_02` 1.54 by 2.62; `Prop_Washingline_01` to `_04` 5.21 wide; `Env_Fence_01` 5.00 by 2.14.

**D. Synty's page** (https://syntystore.com/products/polygon-city-pack, read 19 Nov 2026): "A low poly asset pack of characters, buildings, props, vehicles and environment assets to create a city based polygonal style game. Modular sections are easy to piece together in a variety of combinations." Sets: Modular Vintage Office Buildings, Modular Modern Office Buildings, Modular Apartment Set, Modular Road Set, Modular Shop Fronts, Modular Park Set. 331 unique assets with four alternative texture colours; among them fire escape stairs x3, rooftop access, shop covers x5, modular pipes x9, modular vents x7, billboards and signs x33. No grid size is stated.
