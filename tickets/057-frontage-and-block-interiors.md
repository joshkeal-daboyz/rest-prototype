# 057 · Tile city: walls on the pavement, frontage without gaps, and no empty block interiors

owner: renderer (src/render3d/, docs/city-style-guide.md)
status: approved (G1, Josh, 18 Nov 2026, in chat, relayed by the main session: "Approve 057, 058 and 059"; given on the main session's summary of the scope, before he saw this text). Every open question is at its default. Q1 was settled by his own words, "Grass and pavement should fill the blank areas".
- Sections F and G (block variety, alleys and parks) were added after that G1, on his clarification "Keep in mind, 90 degrees does not mean a grid of squares. You can have varying widths for blocks, alleyways, parks... etc".
- **F and G confirmed** (Josh, 18 Nov 2026, in chat, relayed by the main session: "Approved and confirmed").

Builds on `goal/city-style` after 056 A merges (see Dependencies). Sections A, B and C in order, then D and E (may run in parallel).
branch: one per section: `ticket/057a-wall-line`, `ticket/057b-frontage-ends`, `ticket/057c-block-interiors`, `ticket/057d-interior-draw`, `ticket/057e-frontage-guide`

## Josh's words (18 Nov 2026, in chat, after playing the merged tile city at `793bbf7`)
> "This is a great start. There are gaps between the buildings and the sidewalk. It's okay if the buildings rest on top of the sidewalk and overlap a little bit. It is not okay if the buildings sit recessed from the sidewalk and leave a gap of nothing between them. There are blank open areas where the buildings don't exist. Those need to be filled in with something. You could fill that with parking lots, parks, or you could have those squares of buildings be thinner so that the buildings are butted up right against each other."

His screenshots show two problems:
- **Street level:** a dark strip of nothing runs between the pavement tiles and the shopfront walls along a whole row.
- **Overhead:** one block's whole inside is a big dark empty yard.

His answer on the blank interiors, later the same day:
> "Grass and pavement should fill the blank areas."

His clarification on the grid, the same day:
> "Keep in mind, 90 degrees does not mean a grid of squares. You can have varying widths for blocks, alleyways, parks... etc"

No puzzle is in this ticket.

## Baseline
Measured by the architect on 18 Nov 2026 on `goal/city-style` at `793bbf7`, with no browser. `tileCity` was run, then `packTown` on the typed-in fixture stacks of `tilecity.test.ts` (piece bounds from the converted manifest). The default city is 3 x 3, seed 1. Seeds 1 to 5 at 3 x 3, and 6 x 4 seed 1, land in the same ranges.

### (a) The gap between the pavement and the walls

**Not the cause:** the lot line and the pavement.
- The tile city lays terraces with `frontOff: 0` and `frame.wall_m: 0`, and every lot's front line is on the pavement's back edge within 1e-6 (055 criterion 10).
- The sidewalk tile's walking surface runs to its back edge (z = -2.5 in `tileslots.ts`'s measurement).

**The cause of screenshot 2's strip:** how a stack is assembled. `assembleStack` (`stacks.ts`), in a "bay" style, puts every piece's **back** face on one line and the frontmost face of the deepest piece on the lot front. Every shallower piece therefore stands back by (deepest depth − its depth):
- the ground pieces are 5.22 to 5.89 m deep;
- the apartment floors are 5.20 to 5.50 m deep.

The street face of each column was measured by bounds as the frontmost piece below 3.5 m. Length-weighted on the default city:

| Recess behind the pavement edge | 0 | up to 0.1 m | 0.1 to 0.3 | 0.3 to 0.5 | 0.5 to 0.7 | 0.7 to 0.8 |
| --- | --- | --- | --- | --- | --- | --- |
| Share of frontage | 11% | 20% | 29% | 24% | 10% | 6% |

The mean recess is 0.26 m (0.25 to 0.27 over the seeds), and the maximum is **0.80 m**. Upper floors: 24 to 26% of their width stands 0.7 to 1.0 m back.

These are **bounds**. A bound includes the piece's sills, frames and cornices, so the wall plane itself stands further back than this, and the strip a walker sees is wider. Only the geometry can say by how much, as for 055 F's sills and C's `TILE_FRONTS`.

**Gaps along the street, in the frontage itself:**
- **Corner insets.** 055 B's `tileRowInset_m` sets the first block of every row 1.0 to 1.8 m back from the cross street's pavement (up to `TILE_INSET_MAX_M`, 2.5 m, on rows that end at a plaza). That is four slots of nothing per block, one at each corner.
- **Far ends.** At each row's far end:

  | Far-end gap | Share of runs |
  | --- | --- |
  | 1.0 to 1.5 m alley | 81 to 85% |
  | seam, 0.1 m or less | 8 to 9% |
  | 1.5 to 4 m | 5 to 9% |
  | over 4 m | 0 to 3% |

- Between neighbouring blocks inside a run: 0. The packer closes those.

### (b) The block interiors

| | Default city (3 x 3, seed 1) | 3 x 3, seeds 1 to 5 | 6 x 4, seed 1 |
| --- | --- | --- | --- |
| Block sides | 40 to 60 m (8 to 12 cells) | same | same |
| Terrace band, stack depth | 6 m band, stacks 5.2 to 5.9 m deep | same | same |
| Interior span | 28 to 48 m each way | same | same |
| Empty yard per block | 1,015 to 2,146 m², 13,835 m² over 9 blocks | 1,009 to 2,408 m² | 880 to 2,382 m² |
| Empty share of each block | **56 to 65%** | 56 to 67% | 55 to 66% |

Empty here means block area minus stack footprints minus open lots (parking lots and plazas).

**Roads already take about 65% of the city's area:** per axis about 105 m of street to 150 m of blocks on the default city, so blocks are (150 / 255)² ≈ 35% of the area.

### Pack pieces available for filling (checked in the converted manifest)
- **City Pack:**
  - `SM_Env_Grass_01` (5 x 5);
  - `SM_Env_GrassPath_Straight/Corner/T/Junction_01` (5 x 5);
  - `SM_Env_Path_*` (2.5 to 5 m);
  - `SM_Env_Tree_01..03`, `SM_Prop_ParkBench_01`, `SM_Prop_Planter_01/02`;
  - `SM_Env_Fence_01` (5.0 x 2.1 m) and `SM_Env_Fence_End_01`;
  - `SM_Env_Road_ParkingLines_01` (10 x 5, 3 bays).
- **Town Pack:**
  - `SM_Env_Grass_01/02` (5 x 5), `SM_Env_Hedge_01..03`, `SM_Env_Bush_01..04`;
  - `SM_Env_Fence_Wood_Straight_01` (2.5 m), `_Gate_01` (2.6 m), `_Post_01`;
  - `SM_Env_Garden_*` beds, `SM_Env_Gardenbox_*`, `SM_Env_FlowerPatch_*`;
  - trees: `SM_Env_Tree_01..03`, `_Tall_01/02`, `_Pine_01/02`;
  - `SM_Prop_Playground_Swing_01`, `_Slide_01`, `_Roundabout_01`, `_Fort_01`;
  - `SM_Prop_Fountain_01` with `_Base_01`;
  - `SM_Env_Road_Parking_01` (10 x 5).
- **Code-drawn** stays the fallback for every role, as in 055 C.

## The rules (draft text for a new guide chapter 19, "Frontage and block interiors"; E writes it)
- **Decided (Josh, 18 Nov 2026):** two rulings, in his own words:
  - "It's okay if the buildings rest on top of the sidewalk and overlap a little bit. It is not okay if the buildings sit recessed from the sidewalk and leave a gap of nothing between them."
  - "Grass and pavement should fill the blank areas."
  - "Keep in mind, 90 degrees does not mean a grid of squares. You can have varying widths for blocks, alleyways, parks... etc" (19.5 and 19.6)

### 19.1 The wall line
- **Default:** in the tile city, a terrace stack is aligned on its **wall plane**, not its back faces.
  - Each column's ground and floor pieces put their measured wall plane (`WALL_FRONT_M`, read from the GLB per key) on the pavement's back edge, or up to `OVERLAP_MAX_M` (0.6 m) onto the pavement (0.6 m, not the drafted 0.5 m, recorded 18 Nov 2026 after the 057 A review: the real City Pack shop pieces reach the ground up to 0.557 m in front of their wall (`Shop_04`), 0.529 (`Apartment_Door_01`) and 0.520 (`Shop_06`). Josh's "It's okay if the buildings rest on top of the sidewalk and overlap a little bit" covers it.).
  - Sills, frames, cornices and signs may stand further out, up to `OVERLAP_MAX_M` past the wall.
  - No street-level wall stands behind the pavement edge (`RECESS_MAX_M` 0, within 0.01 m).
  - The pieces' backs may then be ragged. They face the interior, and 19.4 fills it.

### 19.2 Corners and far ends
- **Default:** this re-cuts Josh's earlier "Keep the inset" (055 design item 8), because his new words forbid the strip it leaves.
  - Every row's first block stands **flush** with its corner: the inset is 0, and the corner block's flank meets the cross street's pavement.
  - The leftover length goes to the row's far end, where it closes in one of three ways, in this order:
    1. a **seam**: 0.1 m or less (`TERRACE_SEAM_M`);
    2. an **overshoot**: the packer takes one more column when that ends at most `END_OVERLAP_MAX_M` (1.0 m) inside the next row's corner block. The two walls meet inside, where nothing shows;
    3. a **gated passage**: whatever is left, 1.0 m to one column wide, closed at the wall line by a gate and posts (the Town Pack's `SM_Env_Fence_Wood_Gate_01`/`_Post_01`, or a code-drawn wall and gate in the run's colourway, one storey high). The passage leads to the interior (19.4).
  - Nothing else is allowed. Every metre of a block side's pavement back edge is one of:
    - a building wall;
    - a corner flank;
    - a seam;
    - a gated passage;
    - a deliberate opening: a parking lot, a plaza, or a court drive, each with its kerb cut where cars cross.

### 19.3 Thinner blocks: considered, not the default
- Blocks whose terraces butt back to back would be about 12 m deep: two 5.2 to 5.9 m stacks.
  - On the 5 m grid that is 15 m (3 cells), with a 3 m service strip.
  - With 25 to 30 m streets between them, roads would take about three quarters of the city along that axis. They already take about 65% of the area.
- **Default:** keep 40 to 60 m blocks and fill the interiors (19.4). Thinner blocks are Q2.

### 19.4 The block interior
**Default:** nothing inside a block is left unfilled. Rasterised at 0.25 m, the unfilled area is at most `VOID_MAX_SHARE` (1%) of the block, and no unfilled square is larger than `VOID_PATCH_MAX_M` (1 m) on a side. The interior is laid on the 5 m grid, in this order:
Josh's ruling sets the fill: **grass and pavement, nothing else required**.
1. **The rear apron (pavement).** The strip behind each terrace, from the stacks' backs to the first cell line inside the 6 m band, plus one full cell beyond it, is pavement.
   - This makes a continuous paved apron of `APRON_CELLS` (1) cell round the inside of the block, joining the backs, the gated passages, the court drive and the court.
   - The ragged strip is drawn as a code-drawn pavement surface. The full cells are City Pack sidewalk tiles (`Sidewalk_Panel_01`, the plaza piece), or code-drawn in today's `PAVEMENT` colour if missing.
2. **The residents' court.** This takes over 056's 18.4, and the court stands on pavement.
   - A block's lot quota (056: `round(homes x PARK_PER_HOME / LOT_STALLS)`, 1 or 2) becomes **interior courts** in place of frontage lots.
   - One court unit is 2 x 3 cells (10 m wide, 15 m deep): a 10 x 5 parking-lines tile, a 5 m aisle, and another tile. That is 2 x 3 = 6 stalls (`LOT_STALLS`), with a real aisle.
   - Two units sit side by side as 4 x 3 cells.
   - A court is reached by a **court drive**: one cell (5 m) through the terrace row, with a kerb cut on the street, in place of 056's 10 m frontage lot. The drive's parking cells stay plain, as 056 does for lots.
3. **The green** is every other interior cell: grass.
   - It is drawn as a code-drawn grass surface, or City Pack `SM_Env_Grass_01` tiles where the pack is present (Q6).
   - A pavement path one cell wide crosses it from the apron to the apron along the green's longer axis, so the green never stretches more than `GREEN_SPAN_MAX_CELLS` (6, 30 m) without a path.
   - Trees on one green cell in `GREEN_TREE_ONE_IN` (3) and a bench beside each path are **optional dressing**, which D draws when the keys are present. Nothing else (no playground, fountain or hedge) is required.
4. **Plazas** (055 B's corner plazas) stay as they are, on the street.

**Arithmetic on the default city:**

| | Area |
| --- | --- |
| Empty interior today | 13,835 m² over 9 blocks |
| Courts: one unit per block (056's quota: 37 to 52 homes at 0.15, so 5.6 to 7.8 stalls, so 1 lot) | 9 x 150 m² = 1,350 m² |
| Drives | 9 x 5 m x 6 m = 270 m² |
| Rear apron: about 2.5 m strip plus a 5 m cell, round about 160 m of terrace back per block | about 9 x 1,000 m² ≈ 9,000 m², pavement |
| Paths across the green | about 9 x 150 m² ≈ 1,350 m², pavement |
| Green | the rest: about 1,900 m², grass, about 14% of the interior (most in the larger blocks; a 40 x 40 m block may have almost none) |
| Left empty | 0 |

- So the interiors are about four fifths pavement and one fifth grass.
- If Josh finds them too grey, the apron can drop to the strip alone (`APRON_CELLS` 0). The green then grows to about 6,400 m², about half the interior, and that is one constant (Q1).

- The frontage gains 45 m: nine 5 m drives replace 056's nine 10 m lots.
- 056's totals are unchanged: 54 kerb bays and 54 stalls, now in courts.

### 19.5 Block variety: 90 degrees, not a grid of squares
**What `tilecity.ts` varies today** (measured on `793bbf7`):
- Every street line runs the city's full length.
- Each column of blocks takes one width, and each row one depth, from `BLOCK_TILES` (8 to 12 cells, 40 to 60 m) by hash. So blocks are already rectangles: on the default city they are 45, 50 and 55 m wide by 40, 50 and 60 m deep, nine different footprints, one of them square.
- One interior line in `AVENUE_ONE_IN` (3) is an avenue (30 m), the rest are streets (25 m).
- But every block in a column shares its width and every block in a row its depth, the range is narrow (a 1.5 to 1 ratio at most), and no block is split, so it still reads as a regular grid.

**New (Default):**
1. **A wider range:** `BLOCK_TILES` becomes 6 to 16 cells (30 to 80 m).
   - Neighbouring lines on one axis differ by at least `BLOCK_STEP_MIN_CELLS` (2) cells, by hash, so no two neighbouring columns (or rows) are the same size.
   - Every street keeps its profile (avenue or street, 055 design item 3) along its whole length, because lines stay straight and continuous: a block's size changes the spacing between lines, never a street's cross-section.
2. **Per-block variety inside the line grid:** alleys and parks (19.6) split or replace parts of blocks, so blocks in one column no longer look alike.
3. **Block types by size:**
   - **small:** both sides at most 40 m;
   - **long:** one side at least 60 m and the other at most 45 m;
   - **large:** both sides at least 55 m;
   - **medium:** the rest.

### 19.6 Alleys and parks
1. **Alleys.** An alley is a one-cell (5 m) service lane across a block, parallel to its short side, from street to street.
   - It enters through a one-cell gap in each row it crosses, with a `kerbCut` at each end. The gap is a deliberate opening under 19.2.
   - It is drawn as lane asphalt (`Road_Bare_01`, or code-drawn), between the rear aprons of the two parts of the block.
   - It is dressed as a lane: bins (`SM_Prop_Trashbin_01/02`) beside rear walls, at one in `ALLEY_BIN_EVERY_M` (10 m), and no furniture in the lane itself.
   - Rear doors and rear fire escapes are not drawn in this ticket: the City Pack has no rear-door piece, and fire escapes are 058's.
   - Each part of a split block is laid as its own block: its rows face the streets, and the alley side is a rear (apron), not a frontage.
   - Default rate: every **long** block, and every block with a side of 70 m or more, gets one alley at its middle. Every city has at least one alley per `ALLEY_ONE_IN_BLOCKS` (4) blocks: where too few blocks qualify, the longest blocks take one, in id order.
2. **Parks**, under Josh's grass-and-pavement fill (19.4):
   - **Whole-block park:** a **small** block can become all green, with crossing paths, trees on one cell in `GREEN_TREE_ONE_IN`, a bench beside each path, and a pavement edge on all four streets (its kerbs as 055).
   - **Half-block park:** a **large** block can give its half on one long side to green. The other half is laid as its own block, whose park-facing row faces a one-cell pavement along the park edge, so those buildings front the park.
   - Default rate: at least one park per `PARK_ONE_IN_BLOCKS` (6) blocks. Small blocks are chosen first for whole-block parks, then large blocks for half parks, by hash.
   - A park block carries no units, so it takes no 056 kerb-bay or lot quota. Its kerbside parking band is build-outs (056 18.5).
3. **Mix per block type (default):**

   | Block type | Default treatment |
   | --- | --- |
   | small | terraces; 1 in 3 of them is a whole-block park until the park quota is met |
   | medium | terraces with the interior fill of 19.4 |
   | long | terraces split by an alley |
   | large | terraces with interior fill; 1 in 3 gives half to a park |

4. **Checks (new, V1 to V4 in `frontage.ts`):**
   - **V1, block sizes vary:** on each axis the line spacings' coefficient of variation is at least `BLOCK_CV_MIN` (0.15), and the city has at least ceil(blocks / 2) distinct footprints.
   - **V2, not square:** at least 70% of blocks are not square.
   - **V3, alleys:** at least ceil(blocks / `ALLEY_ONE_IN_BLOCKS`) alleys.
   - **V4, parks:** at least ceil(blocks / `PARK_ONE_IN_BLOCKS`) parks.

   Each holds on the default city and seeds 1 to 10, at 3 x 3 and 6 x 4. Each fails on a fixture: a uniform 10 x 10-cell grid with no alley and no park fails all four.

## Goal
In a dev build, Josh opens `/?puzzle=<any>&view=3d&city=tiles` and sees:
- every shopfront and wall standing on the pavement's back edge or just over it, with no dark strip;
- corners flush;
- each row closed at its far end by a seam, a hidden overlap or a gated passage;
- inside every block, grass and pavement: a paved apron behind the terraces, a residents' parking court on it reached by a drive, and grass filling the rest, crossed by paths;
- blocks of clearly different widths and depths (30 to 80 m), long blocks cut by service alleys, and a park every few blocks.

Checks G1 to G4 hold the default city and seeds 1 to 10 to these rules. The ladder maps do not change.

## Sections (each at most a day)
- **A. The wall line** (about 1 day). `WALL_FRONT_M` is measured and pinned. The tile city's stacks align on it (19.1), and G1 checks it.
- **B. Corners and far ends** (about 1 day). Inset 0, the overshoot, gated passages (19.2), and G2. Needs A.
- **C. Interiors, pure** (about 1 day). The paved apron, courts and drives in place of 056's frontage lots, and the green with its paths (19.4), with G3 and G4. Needs B.
- **F. Block variety, pure** (about ½ day). 19.5: the wider `BLOCK_TILES`, the neighbour step, block types, and checks V1 and V2. Needs C.
- **G. Alleys and parks, pure** (about 1 day). 19.6: alleys, whole-block and half-block parks, and checks V3 and V4. Needs F.
- **D. Drawing** (about 1 day): the interiors, gates, alleys and parks. Needs G.
- **E. The guide** (about ½ day). Needs G; may run beside D.

The build order is A, B, C, F, G, then D and E. The letters F and G were added after A to E were written, and are kept so the criteria numbers stay stable.

## Acceptance criteria
**CI-safe rules (every section):**
- typed-in fixtures only, never `assets/private/` at module or `describe` level;
- real-geometry checks inside an `it` that skips without the converted GLB;
- no Windows paths and no timer under 1 s;
- the largest city a test builds is 6 x 6;
- `packTown` runs on at most the default city, seeds 1 to 10 at 3 x 3, and seeds 1 to 3 at 6 x 4.

### A (Vitest)
1. [ ] **Measured wall planes.** New `src/render3d/facade.ts`, pure, holds `WALL_FRONT_M: Readonly<Partial<Record<CalibrationKey, number>>>`.
   - **What is measured:** for every base, door, corner, shop, floor and `stack3` piece of every `STACK_STYLES` style, the distance from the piece's front bound back to its main wall plane on the `BUILDING_FRONTS` face.
   - **How (as built in 057 A, recorded 18 Nov 2026 after its review):** read from the converted GLB, not guessed. The wall is **the frontmost face that reaches the ground** (its lowest vertex at most 0.3 m above the piece's base) within **0.6 m** of the piece's front bound for ground pieces, and within **0.5 m** for floor pieces. This replaces the draft's "largest front-facing planar area below 3.5 m", which picked shops' interior back walls and signs.
   - **Tests:**
     - a CI-safe test pins every value as a typed-in fixture;
     - a real-geometry test inside an `it` re-measures each key within 0.02 m.
   - A key the geometry cannot settle gets no entry and is reported, and its pieces align on their bounds.
   - If 055 F has merged, the builder may put these values in F's per-model table instead; the test rules are the same.
2. [ ] **Aligned on the wall.** `assembleStack` gains an option `align?: "back" | "wall"`, default `"back"`, so every ladder stack is unchanged. With `"wall"`, each piece's wall plane lies on z = 0 of the lot frame, or up to `OVERLAP_MAX_M` in front of it. The tile city's packing passes `"wall"`. On the three protocol maps, `assembleStack`, `packTown` and `applyModels` stay deep-equal.
3. [ ] **G1, no recess.** New `src/render3d/frontage.ts`, pure: `frontageMetrics(city, packed)` and `FRONTAGE_CHECK`.
   - G1 passes when, on every terrace column, the street-level wall plane is between 0 and `OVERLAP_MAX_M` onto the pavement. That is, no recess above `RECESS_MAX_M` (0, with 0.01 m tolerance).
   - It passes on the default city and seeds 1 to 10 at 3 x 3, and on seeds 1 to 3 at 6 x 4.
   - It fails on today's back-aligned packing of the default city (the failing fixture: the same city with `align: "back"`).

### B (Vitest)
4. [ ] **Flush corners.** The tile city passes `startInset_m` 0 for every row. `TILE_INSET_MAX_M` and `tileRowInset_m` are removed from `tilecity.ts`, and the `TILE_INSET_MAX_M`/`CORNER_GAP`-margin test is replaced by "every run with a `startCorner` starts at its side's corner within 1e-6". Every first lot keeps its `cornerSides`, so the Decided corner rule (17 Nov) holds.
5. [ ] **Far ends close.** Every run's far end is a seam (at most `TERRACE_SEAM_M`), an overshoot of at most `END_OVERLAP_MAX_M` into the next row's corner block, or a gated passage of `PASSAGE_W_M` (1.0 m to one column, about 5.3 m) recorded in `TileCity.passages`.
   - The overshoot is a packer option, `farOverlap_m` in `packTerrace`/`packTown`, default 0, so the ladder is unchanged.
   - This replaces, for the tile city only, 055 criterion 10's far-gap share ("seam or alley on at least the ladder's share"). The ladder's rule is unchanged.
   - It also retires 056 A's temporary far-gap floors (0.75 over all runs, 0.70 over corner-ending runs, and the 0.85 test that excludes the first run after a lot; see the "From 056" note on 055 criterion 10). B restates the tile city's far-gap rule as this criterion and G2. The run after a parking lot, or after a court drive, closes like any other run.
6. [ ] **G2, no gap in the frontage.** Along every block side, the pavement's back edge is covered, within 0.01 m, by a wall, a corner flank, a seam, an overshoot, a gated passage, a parking lot, a plaza or a court drive.
   - It passes on the cities of criterion 3.
   - It fails on `793bbf7`'s layout: a fixture of the default city with today's insets and alleys.

### C (Vitest)
7. [ ] **Courts in place of frontage lots.** Each block's 056 lot quota is laid as interior court units (2 x 3 cells, `LOT_STALLS` each), each reached by one court drive.
   - A drive is one cell through the row, with `kerbCut` pavement cells and plain parking cells in front, laid with `parkRuns` and `parkByHash: false` as in 056.
   - `TileCity.lotStalls` (056) now lists the court stalls.
   - 056's P2 passes on courts. Its P1, P3 to P6 still pass.
   - No frontage parking lot remains in the tile city, unless a block's interior cannot hold a court. That block keeps 056's frontage lot, is recorded, and is counted against `CITY_FRONT_LOT_BLOCKS_MAX` (1 in 9).
8. [ ] **Grass and pavement.** Every block interior is partitioned into `apron`, `court`, `drive`, `green` and `greenPath` areas, and nothing else.
   - The apron covers from the stacks' backs to the first cell line plus `APRON_CELLS`.
   - The court stands on the apron or on pavement cells next to it.
   - Every remaining cell is `green`, except the path cells.
   - Paths: no run of green is longer than `GREEN_SPAN_MAX_CELLS` without one. Every passage and drive reaches the court over pavement.
   - Optional trees and benches follow 19.4's rates, inside green cells, clear of paths by 0.5 m.
   - `TileRole` gains the interior roles. 055 A's partition test (criterion 2) still covers the streets, and a new test covers the interiors.
9. [ ] **G3 and G4.** `frontage.ts` adds both checks:
   - **G3, no void:** rasterised at 0.25 m, each block's unfilled area is at most `VOID_MAX_SHARE` of the block, and no unfilled square is larger than `VOID_PATCH_MAX_M`.
   - **G4, courts reached:** every court touches a drive, and every drive has its kerb cut.

   Both pass on the cities of criterion 3. G3 fails on `793bbf7`'s layout (55 to 67% void), and G4 fails on a fixture with a drive's kerb cut removed.

### F (Vitest)
16. [ ] **Wider, uneven blocks.**
    - `BLOCK_TILES` is `{ min: 6, max: 16 }`, and neighbouring line spacings on an axis differ by at least `BLOCK_STEP_MIN_CELLS`.
    - Every street keeps one profile along its whole length.
    - 055 A's criteria 1 to 8 pass with the new range, their tests reading the constant and not the old numbers.
    - Each `TileBlock` carries its `type` (small, medium, long, large).
17. [ ] **V1 and V2.** In `frontage.ts`. They pass on the default city and seeds 1 to 10 at 3 x 3 and 6 x 4, and fail on the uniform-grid fixture. 056's P1 to P6 and G1 to G4 still pass on the new sizes.

- *As built in F (recorded 18 Nov 2026 after the 057 F review).* F added three layout rules the draft did not have:
  - **Minimum long side.** The block draw rejects a block whose longer side is under 7 cells (35 m), because P1 (056) fails for a 6 x 6-cell block on streets.
  - **Mean block size.** `BLOCK_MEAN_MIN_CELLS = 10` (a mean block size of 50 m per axis), because R1 was borderline at 0.887 to 0.90. This is a tuning choice, and it narrows the effective spread of the 6 to 16-cell range.
  - **Redraw.** The block sizes are redrawn, at most 64 times, until the variety rules hold.
- *A change to approved 056 behaviour, made in F:* 056's lot planner gained a ratchet. A block at a quota rounding edge asks for the larger of its last ask and its quota, so it can hold one lot over its final quota. 056's lot-quota test accepts that only within 10 homes of the quota edge. Recorded here, and to be noted in 056's chapter 18 when its section C writes it.
- *Seed selection (F).*
  - The hash key `"width"` in `blockLens` was chosen among a few keys tried, because R7 (the tile floor of 0.4) is noise on the dressing's own escape chance. The first key gave seed 3 an R7 of 0.373.
  - With 9 blocks R7 moves in ninths, so the floor is fragile, and section G will move it again.
- *Follow-up, now ticket 061 (Josh, 18 Nov 2026: "Yes, cut it (Recommended)"):* R7 should become a guarantee and not a chance. Escapes would be handed out by hash rank to ceil(0.4 x qualifying) blocks, keeping the no-two-neighbours rule. That is a change in 058's file (`dressing.ts`): a re-cut of 058 or a small ticket of its own.

### G (Vitest)
18. [ ] **Alleys.** Each alley is one cell wide and parallel to its block's short side.
    - It runs street to street, with a `kerbCut` and plain parking cells at both ends.
    - The rows it crosses end on it, as deliberate openings that G2 accepts.
    - Its sides are aprons. Bins stand at `ALLEY_BIN_EVERY_M` beside the rear walls and never in the lane.
    - A split block's parts are laid as blocks of their own, each with its 056 quotas and its 19.4 fill.
    - New role: `alley`.
19. [ ] **Parks.**
    - A whole-block park has no terrace lot, no unit and no kerb bay, and its interior is green, paths and pavement edge only.
    - In a half-block park, the built half's park-facing row fronts a one-cell pavement along the green.
    - G1 to G4 hold, with a park edge counted as a frontage where buildings face it.
    - New role: `parkEdge` (pavement), plus the green roles of 19.4.
*Could-improves carried from the 057 F review into G (G touches the same file):*
- `blockLens`' comment says that its hash key was chosen among keys tried, and why (R7). Once ticket 061 (escapes by rank, approved 18 Nov 2026) lands, the comment also says that R7 no longer depends on the key.
- `blockLens` gets a known-good fallback layout for when all 64 draws miss, with a test that forces the miss.
- A test shows that block sizes near both ends of the 6 to 16-cell range occur over seeds 1 to 20.

20. [ ] **V3 and V4.** They pass on the cities of criterion 17, and fail on the uniform-grid fixture.

### D (Vitest unless marked)
- *Carried from the 057 A review (could-improves, 18 Nov 2026), done in D:*
  - D passes the tile city's `"wall"` alignment to `packTown` explicitly, though a default (`alignOf`) exists, so the tile city does not depend on it.
  - D pins `SM_Bld_OfficeOctagon_Base_01` to its 0.174 m face in `WALL_FRONT_M` before any office style is aligned on `"wall"`.
  - D adds a committed pin (a digest test) of `packTown` on the three protocol maps, so the ladder's "unchanged" is checked on every run, not only at review.

  D's Files gain `tilecity.ts` (the explicit argument), `facade.ts` and `facade.test.ts` (the Octagon pin), and a new `packpin.test.ts`.
10. [ ] **Drawn.** `tilecity3d.ts` draws every interior role:
    - the parts:
      - grass: a code-drawn grass surface, or City Pack `SM_Env_Grass_01` cells when present;
      - pavement: the apron and paths as City Pack `Sidewalk_Panel_01`, or code-drawn in `PAVEMENT` colour, the ragged strip always code-drawn;
      - the court: `ParkingLines_01` on pavement-coloured `Road_Bare_01`;
      - the drive: a kerb cut and lot surface;
      - the passage gates;
      - the optional trees and benches;
      - the alley lane (`Road_Bare_01`, or code-drawn) and its bins;
      - park greens, paths and park edges;
    - one `InstancedMesh` per key, with a per-role code-drawn fallback when the keys are absent (CI);
    - levels: interior ground at 0, flush with the pavement walk;
    - `TILE_DRAW_CALLS_MAX`, raised by the builder with the count if needed, holds.

    No Town Pack piece in `CITY_NEVER_USED` is lifted without saying so in 16.6 (E).
11. [ ] **Sheet.** `&sheet=1` shows each new role once, labelled, under 055 criterion 30's rules.
12. [ ] (Main session, screenshots, `npm run dev`, each with and without `&light=day`) Check these URLs:
    - `/?puzzle=01-first-light&view=3d&city=tiles`, `&city=tiles&blocks=6x4&seed=3`, and `&city=tiles&cam=street&run=0&at=0`, `&run=1`, `&run=3`:
      - no dark strip between the pavement and any wall;
      - corners flush;
      - far ends closed by a seam or a gate;
      - every block's inside reads as grass and pavement, with the parking court and its drive, and no black void left;
      - the blocks visibly vary in width and depth;
      - at least one alley and one park are in view on the default city;
      - an alley reads as a service lane with bins, and a park reads as grass with paths and trees;
    - `&city=tiles&sheet=1`;
    - `/?puzzle=09-shrine-circuit&view=3d` reads exactly as on `goal/city-style`.

    Screenshots go to Josh.

### E (Vitest unless marked)
13. [ ] **Guide.** `docs/city-style-guide.md` gains chapter 19, "Frontage and block interiors": 19.1 to 19.6 as drafted, with Josh's three quotes as the **Decided** lines. The baseline goes in as **Info**, re-measured on the merged C.
    - *Guide test (added 18 Nov 2026):* `styleguide.test.ts`'s "has the sixteen chapters" check lists the chapter numbers, so it must be extended to include chapter 19. That one edit to an existing check is allowed. Every constant the new text names must be exported by a module the test reads.
    - Chapter 18 (056) records that residents' lots are interior courts from 057, which replaces 056 Q3's "no rear courts".
    - Chapter 17 (055 D), if present, records the flush corners in place of the inset deviation.
    - 16.6 records every Town Pack piece now placed.
    - The Numbers table gains rows for every constant of `facade.ts` and `frontage.ts` and the new `tilecity.ts` names. `styleguide.test.ts` gains a drift check for them only.

### Every section
14. [ ] (Builder) Runs only `npx vitest run --maxWorkers=2 src/render3d/` and one `npx tsc --noEmit`. No dev server, no browser. Writes nothing under `assets/`.
15. [ ] (Main session) Before review:
    - `npm run gate` green, and the test count grew;
    - `npm run playtest` green with **no snapshot change**;
    - the diff touches only the section's Files;
    - `git diff -- src/core/ src/render/ src/grid/ src/night/ src/play/ src/ui/ src/main.ts tests/ puzzles/ tools/ package.json public/ index.html vite.config.ts` is empty;
    - `git ls-files assets/private` is empty.

    **The ladder maps:** `townLayout`, `packTown`, `assembleStack`, `dressSites`, `furnitureLayout` and `evaluateCity` stay deep-equal on the three protocol maps, because every new option defaults to today.

## Files
- **A, may touch:** new `src/render3d/facade.ts`, `facade.test.ts`, `frontage.ts`, `frontage.test.ts`; `stacks.ts` (the `align` option only); `tilecity.ts` (pass `align`); `terrace.ts` (pass `align` through `packTown` only). If 055 F has merged: `sills.ts`, in place of `facade.ts`.
- **B, may touch:** `tilecity.ts`, `terrace.ts` (`farOverlap_m` only), `frontage.ts`, and their tests.
- **C, may touch:** `tilecity.ts`, `frontage.ts`, `parkmetrics.ts` (P2 counts courts; nothing else in it changes), and their tests.
- **F and G, may touch:** `tilecity.ts`, `frontage.ts`, `frontage.test.ts`, `tilecity.test.ts` (the existing criteria 1 to 8 tests may switch from literal block sizes to `BLOCK_TILES`), and new tests.
- **D, may touch:** `tileslots.ts`, `tilecity3d.ts`, `models3d.ts` (load the interior keys only when the tile view asks; the puzzle path unchanged), and their tests.
- **E, may touch:** `docs/city-style-guide.md` (chapters 16.6, 17 and 18 pointer lines, 19, Numbers), `styleguide.test.ts` (the new drift check only).
- **Must not touch (every section):**
  - `town.ts` (the tile city passes 0 to `startInset_m`; the option stays), `dressing.ts`, `furniture.ts`, `streetcam.ts`, `citymetrics.ts`, `layout.ts`, `relight3d.ts`, `pick.ts`, `camera.ts`, `scene.ts`, `colourway.ts`, `gallery.ts`, `calibration.ts`, `renderer.ts`;
  - `src/core/`, `src/render/`, `src/grid/`, `src/night/`, `src/play/`, `src/ui/`, `src/main.ts`;
  - `tests/`, `puzzles/`, `tools/`, `package.json`, `vite.config.ts`, `index.html`, `public/`, `assets/`, `tickets/`.

  A builder who needs one stops and asks for a re-cut.

## Dependencies
- **056 A is being built now** (`ticket/056a-parking-layout`). It changes bay counts, places lots by demand (`parkByHash: false`), adds `buildout` cells, and rewrites `tilecity.ts`'s parking.
  - **057 starts only after 056 A merges.** Every 057 section touches `tilecity.ts` or the city it lays.
  - 057 C then moves 056's frontage lots to interior courts and keeps 056's quotas, kerb bays, build-outs and P-checks.
  - 056 B (drawing build-outs) and 056 C (chapter 18) may land before or after 057. If 056 C has landed, 057 E adds the chapter 18 pointer. If not, 056 C writes 18.4 with courts.
- **What 057 replaces in 056** (recorded here; the architect adds the pointer lines in 056 when 057 C starts, so 056 A's builder is not disturbed mid-build):
  - Q3 "Rear courts: no" becomes yes: courts are where residents' lots go.
  - 18.4's "lots stay 10 x 10 m on the frontage" becomes 2 x 3-cell courts behind one-cell drives.
  - 056 criterion 4's lot clause is satisfied by courts.
  - The frontage lot cost of about 90 m becomes about 45 m.
- **What changes in 055:**
  - Design item 8's inset deviation ("Keep the inset", 18 Nov) is replaced by flush corners (19.2). `TILE_INSET_MAX_M` goes.
  - Criterion 10's far-gap share is replaced for the tile city by G2.
  - D's T4 ("pavements meet lot fronts with no slit") and T5 (frontage share) defer to G1 and G2.
  - F's sills apply after the wall alignment, and nothing in F changes.
  - Design item 2's `BLOCK_TILES` (8 to 12) becomes 6 to 16 with the neighbour step (19.5), so A's tests read the constant.

  The architect records these in 055 when 057 B starts.
- **No `src/core/` change, no schema or event change, no new dependency.**

## Interfaces
Everything is local to `src/render3d/`, and the builder may rename it.
- **`facade.ts`:** `WALL_FRONT_M`.
- **`frontage.ts`:**
  - constants: `OVERLAP_MAX_M = 0.6` (0.5 in the first draft; see 19.1), `RECESS_MAX_M = 0`, `END_OVERLAP_MAX_M = 1.0`, `PASSAGE_W_M = { min: 1.0, max: 5.3 }`, `VOID_MAX_SHARE = 0.01`, `VOID_PATCH_MAX_M = 1.0`;
  - `type FrontageCheckId = "G1" | "G2" | "G3" | "G4"`;
  - `FRONTAGE_CHECK`, `frontageMetrics(city, packed)`, `evaluateFrontage(m)`.
- **`stacks.ts`:** `AssembleOptions.align?: "back" | "wall"`.
- **`terrace.ts`:** `PackOptions.farOverlap_m?: number`; `packTown(..., opts?: { align?; farOverlap_m? })`.
- **`tilecity.ts`:**
  - constants: `COURT_CELLS = { w: 2, d: 3 }`, `DRIVE_CELLS = 1`, `APRON_CELLS = 1`, `GREEN_SPAN_MAX_CELLS = 6`, `GREEN_TREE_ONE_IN = 3`, `CITY_FRONT_LOT_BLOCKS_MAX = 1/9`;
  - for F and G: `BLOCK_TILES = { min: 6, max: 16 }`, `BLOCK_STEP_MIN_CELLS = 2`, `ALLEY_ONE_IN_BLOCKS = 4`, `ALLEY_BIN_EVERY_M = 10`, `PARK_ONE_IN_BLOCKS = 6`, and `TileBlock.type: "small" | "medium" | "long" | "large"`;
  - `frontage.ts` gains `BLOCK_CV_MIN = 0.15` and checks V1 to V4;
  - `TileRole` gains `"apron" | "court" | "drive" | "green" | "greenPath" | "alley" | "parkEdge"`;
  - `TileCity.passages: readonly { x_m; z_m; w_m; yaw; run: string }[]`;
  - `TileCity.greenProps: readonly { key: "tree" | "bench"; x_m; z_m; yaw }[]`.

## Open questions (answered 18 Nov 2026: every default applies, "Approve 057, 058 and 059")
1. **The interior mix.** Decided by Josh: "Grass and pavement should fill the blank areas". The default layout is a one-cell paved apron round the inside, the residents' court on pavement, and grass in the middle crossed by paths, with optional trees and benches. A tuning point remains: `APRON_CELLS` 0 gives more grass, about half the interior, if the eye check finds it too grey.
2. **Thinner blocks?** Default: **no.** Back-to-back terraces need 15 m blocks, and roads would take about three quarters of the city along that axis (they take about 65% of the area now). Alternative: one axis of thin 15 m blocks, which reads as rowhouse streets.
3. **More residents' parking, now that it is hidden inside.** Default: **keep 056's 0.15 stalls per home** (approved), so 6 stalls per block. Alternative: 0.3 per home, so 12 stalls (a 4 x 3-cell court) per block, with the green about 150 m² smaller.
4. **How far a building may overlap the pavement.** Default: walls up to **0.6 m** onto it (0.5 m in the first draft; raised after the 057 A review because shop pieces reach the ground up to 0.557 m out), and the same again for sills and signs. Alternative: walls exactly on the edge (0), with only sills and signs over it.
5. **Closing a row's far end.** Default: a seam, else a hidden overlap of up to 1 m into the next corner block, else a **gated passage** into the interior. Alternative: always a gated passage, with no hidden overlaps.
6. **Pack pieces inside the blocks.** Default: **the City Pack and code-drawn only**: `Grass_01`, `Sidewalk_Panel_01`, `Tree_*` and `ParkBench_01`, and a code-drawn gate. The one Town Pack piece is `SM_Env_Fence_Wood_Gate_01` for passage gates, where present. Alternative: the Town Pack's grass, hedges and trees for more variety (a second atlas).
8. **Streets that end (T-junctions).** Default: **no**: street lines stay straight and continuous, so the 055 band rule holds unchanged, and variety comes from spacing, alleys and parks. Alternative: a later ticket lets an interior line stop at a T-junction, merging two blocks into one long one.
7. **The ladder maps.** Default: **unchanged.** Every new option defaults to today, because the ladder's town is to be replaced by the tile city in the circuit ticket. Alternative: wall alignment (19.1) on the ladder stacks too.

Decided rules: none is touched (rendering only, no puzzle); `rules-coverage.md` does not change.
