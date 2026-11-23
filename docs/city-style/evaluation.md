# City style: Evaluation

### 16.8 Evaluation protocol

- **Default (053)**: the protocol judges a generated city against the reference with three maps, a fixed set of views and the checklist R1 to R13. Most checklist items are checked by a test on every `npm test`; the rest are judged by eye from screenshots.
- **Default (053)**: the maps, all in `puzzles/`:

| Map | Why |
| --- | --- |
| `09-shrine-circuit` | the map 050 to 052 were built and tested on |
| `64-the-whole-chain` | the largest town: the most runs, and the map that must have a parking lot and a plaza |
| `01-first-light` | the smallest map, the other end of the range |

- **Default (053)**: the views are all `npm run dev`, with `view=3d`. Open each URL, wait for the console line `street camera:` (it appears after the models are applied and one frame is drawn through the street camera), then take the screenshot. `run=0`, `run=1` and `run=2` are the three longest rows (rows are sorted longest first), at the middle (`at=0.5`); `run=0` with `at=0` is the start of the longest row, a corner block where the row starts at a cross street. Each street view is judged at night and again with `light=day`: the reference is daylight, so form, density and variety are judged in day light, and the night views make sure the city still reads dark around the circuit. The play view must read exactly as on `main`. The stack gallery shows every recipe dressed.

| Map | View | URL |
| --- | --- | --- |
| `09-shrine-circuit` | play view | `/?puzzle=09-shrine-circuit&view=3d` |
| `09-shrine-circuit` | longest row, night | `/?puzzle=09-shrine-circuit&view=3d&cam=street&run=0&at=0.5` |
| `09-shrine-circuit` | second row, night | `/?puzzle=09-shrine-circuit&view=3d&cam=street&run=1&at=0.5` |
| `09-shrine-circuit` | third row, night | `/?puzzle=09-shrine-circuit&view=3d&cam=street&run=2&at=0.5` |
| `09-shrine-circuit` | corner block, night | `/?puzzle=09-shrine-circuit&view=3d&cam=street&run=0&at=0` |
| `09-shrine-circuit` | longest row, day | `/?puzzle=09-shrine-circuit&view=3d&cam=street&run=0&at=0.5&light=day` |
| `09-shrine-circuit` | second row, day | `/?puzzle=09-shrine-circuit&view=3d&cam=street&run=1&at=0.5&light=day` |
| `09-shrine-circuit` | third row, day | `/?puzzle=09-shrine-circuit&view=3d&cam=street&run=2&at=0.5&light=day` |
| `09-shrine-circuit` | corner block, day | `/?puzzle=09-shrine-circuit&view=3d&cam=street&run=0&at=0&light=day` |
| `09-shrine-circuit` | stack gallery, dressed | `/?puzzle=09-shrine-circuit&view=3d&gallery=city-pack&stacks=1&dress=1` |
| `64-the-whole-chain` | play view | `/?puzzle=64-the-whole-chain&view=3d` |
| `64-the-whole-chain` | longest row, night | `/?puzzle=64-the-whole-chain&view=3d&cam=street&run=0&at=0.5` |
| `64-the-whole-chain` | second row, night | `/?puzzle=64-the-whole-chain&view=3d&cam=street&run=1&at=0.5` |
| `64-the-whole-chain` | third row, night | `/?puzzle=64-the-whole-chain&view=3d&cam=street&run=2&at=0.5` |
| `64-the-whole-chain` | corner block, night | `/?puzzle=64-the-whole-chain&view=3d&cam=street&run=0&at=0` |
| `64-the-whole-chain` | longest row, day | `/?puzzle=64-the-whole-chain&view=3d&cam=street&run=0&at=0.5&light=day` |
| `64-the-whole-chain` | second row, day | `/?puzzle=64-the-whole-chain&view=3d&cam=street&run=1&at=0.5&light=day` |
| `64-the-whole-chain` | third row, day | `/?puzzle=64-the-whole-chain&view=3d&cam=street&run=2&at=0.5&light=day` |
| `64-the-whole-chain` | corner block, day | `/?puzzle=64-the-whole-chain&view=3d&cam=street&run=0&at=0&light=day` |
| `01-first-light` | play view | `/?puzzle=01-first-light&view=3d` |
| `01-first-light` | longest row, night | `/?puzzle=01-first-light&view=3d&cam=street&run=0&at=0.5` |
| `01-first-light` | second row, night | `/?puzzle=01-first-light&view=3d&cam=street&run=1&at=0.5` |
| `01-first-light` | third row, night | `/?puzzle=01-first-light&view=3d&cam=street&run=2&at=0.5` |
| `01-first-light` | corner block, night | `/?puzzle=01-first-light&view=3d&cam=street&run=0&at=0` |
| `01-first-light` | longest row, day | `/?puzzle=01-first-light&view=3d&cam=street&run=0&at=0.5&light=day` |
| `01-first-light` | second row, day | `/?puzzle=01-first-light&view=3d&cam=street&run=1&at=0.5&light=day` |
| `01-first-light` | third row, day | `/?puzzle=01-first-light&view=3d&cam=street&run=2&at=0.5&light=day` |
| `01-first-light` | corner block, day | `/?puzzle=01-first-light&view=3d&cam=street&run=0&at=0&light=day` |

- **Default (053)**: the checklist. **auto** items are checked by `citymetrics.test.ts` on the plan the game stands for each of the three maps (the thresholds are `CITY_CHECK`, `CITY_ATM_BLOCKS_MIN`, `CITY_BIG_ROOF_RUNS_MIN` and `CITY_STOREYS`, in the Numbers table), and each threshold is also shown to fail on a plan made to break it. **eye** items are judged from the screenshots above.

| Item | What the reference shows | How it is checked |
| --- | --- | --- |
| R1 | continuous frontage: no gap between neighbours, one open lot of each kind to a run, most of the frontage covered | auto: blocks abut, at most one parking lot and one plaza per run, the covered share of the map's frontage; eye: no gap in any street view |
| R2 | 3 to 5 storeys, neighbours differ | auto: the storey range, and every neighbour pair differs in style and floor count; eye: the skyline of each row looks varied |
| R3 | every ground bay is a shopfront, or the one door bay | auto: every base piece is a shop, a shop corner or a door, at most one door per block, no column without a base |
| R4 | glass in every shop | auto: every shop that has a glass key has its glass |
| R5 | awnings over most shop bays, one kind to a block | auto: the share of shop bays with an awning, and no block with two awning keys; eye: they read as awnings, not floating |
| R6 | a sign over most shopfronts, an ATM on some blocks | auto: the share of shop bays with a sign, and the share of blocks with an ATM |
| R7 | fire escapes on the street faces of most blocks of three bays or more | auto: the share of qualifying blocks with one; eye: they stand on the face, not through it |
| R8 | every roof dressed, a big roof prop on many rows | auto: the share of blocks with a roof prop, and of runs with a big one; eye: nothing floats, nothing is inside a wall |
| R9 | corner blocks on true corners only, with two street faces | auto: no corner column off a true corner; eye: the second face is on the cross street |
| R10 | street furniture spaced along the pavement, not cluttered | auto: pitch, corner and keep-out violations are none; eye: it reads busy, not noisy |
| R11 | a parking lot and a corner plaza on the map | auto: on `64-the-whole-chain` there is at least one of each |
| R12 | no people, animals or vehicles; nothing glows; the circuit reads as on `main` | auto: no never-used key in the plan, no emissive material in the drawn dressing; eye: the play view and the circuit are unchanged |
| R13 | neighbouring blocks differ in colour: red, green, cream-tan and teal side by side | auto: the share of adjacent block pairs in a run with different colourway ids, over the plan with a fixed fake set of 8 ids; eye: in the `cam=street&run=0&light=day` screenshot of each map at least four wall colours are visible |

- **Default (053)**: what "matches the reference" means: every auto item passes on all three maps, and every eye item passes on every screenshot listed. A fail names the item, the URL and what is wrong. The main session records the result as a table in the review it shows Josh, one row per item and map: the auto value, and for each eye item pass or fail with the URL.
- **Default (053 Q3)**: the eye items are judged by the main session, from screenshots, and recorded for Josh.
- **Open (waits for Josh's own verdict on the match)**: when Josh gives a verdict on how close a generated street is to his reference, it goes here as **Decided** with his words.


### 16.9 What matches the reference, and what does not yet

- **Info**: measured by `citymetrics.test.ts` on 18 Nov 2026 over the three maps (the numbers move when a rule does; the test, not this line, is the record). All three maps have 44 to 58 runs and 111 to 161 blocks; every auto item passes on all three. Blocks abut exactly. 3, 4 and 5 storeys are about a third each. Every neighbour pair differs in style and in floor count. Every ground bay is a shop or the one door; every shop with glass has it. Of the shop bays about 0.6 have an awning, about 0.5 a sign and about a third of blocks an ATM. A little over half of the qualifying blocks have a fire escape. More than nine blocks in ten have a roof prop. Every corner block is on a true corner. Furniture runs about one item in eight metres of frontage, with no spacing or keep-out violation. The largest map has 10 parking lots and 4 plazas. Nothing never-used is placed and nothing drawn glows.
- **Info**: the far gaps over the three maps: about one run in five closes to a seam, six to eight in ten to an alley, and none to a slit; the rest end in a wider gap of up to about 5 m.
- **Open (waits for a re-cut of ticket 051 C's packer)**: short runs close badly. The ticket asked every run to cover at least `CITY_RUN_FRONTAGE` of its frontage outside open lots. On the three maps 3 to 8 runs fall under it: short rows, 11 to 23 m, where one block is all that fits and 1.3 to 5.2 m is left. R1 is therefore checked as the map's covered share, which holds.
- **Open (waits for a re-cut of ticket 052 A's roof rules)**: roofs. The ticket asked every roof to be dressed and a big roof prop on every run. A few blocks in a hundred have no prop (the small prop is a probability per column), and only about three runs in five have a big one. R8 is checked at the lower thresholds in `CITY_CHECK` and `CITY_BIG_ROOF_RUNS_MIN`.
- **Open (waits for a re-cut of ticket 052 A's awning rule)**: the ticket asked 0.6 of shop bays to have an awning. One map measures a little under it (the escape column and the awnings that would pass the kerb are plain), so R5 is checked at the lower number in `CITY_CHECK`.
- **Open (waits for a re-cut of ticket 052 A's fire-escape rule)**: the alternate-block cap keeps the share of qualifying blocks near a half. The reference has them on most 3-bay blocks.
- **Open (waits for Josh's check in the stack gallery)**: the 34 City Pack fronts are unconfirmed "+z" guesses (chapter 6), and so are the corner pieces' `open` sides. A wrong door would show on the street views as a shop facing the wrong way; nobody has confirmed them by eye except the main session from screenshots.
- **Open (waits for the eye items of 16.8)**: none of the eye items has been judged by the builder of this chapter (no browser was run). The table of results in the review is where they are recorded.
- **Info**: what is deliberately not built: variety of awnings and rooftops by colour, lit windows, balconies and cornices, and every piece the pack lacks (16.6). None blocks the look; each is a line in 16.6 that a later ticket can close.


### 18.8 The checks, and what they measured

- **Info (070 L1)**: the two tables and the ranges below are the old path's numbers (`city=tiles-old`, until L2): `tilecity.ts` laid those cities and `parkmetrics.ts` measured them. The pipeline's checks run in `src/city/mass/` and `src/city/edge/` on its own named cities (6 x 6 seeds 1 to 10), and these tables are not re-taken.
- **Default (056)**: `parkingMetrics(city)` measures a tile city from its cells, bays, lot stalls and blocks (never from the code that laid them), and `evaluateParking(m)` gives one verdict per check, as `evaluateCity` does for the buildings. `PARK_CHECK` holds what each allows: 0 violations, and for P6 the most bays per 100 m of block kerb.

| Check | What it holds |
| --- | --- |
| P1 | shoppers at the kerb: city kerb bays within `PARK_SUPPLY_BAND` x shops x `PARK_PER_SHOP` (the first field is the floor, the second the ceiling; on the pipeline the floor is 0.69, not 0.75, for kerb bays only: Josh, 20 Nov 2026, "yes lower it"), every block with at least `BAY_TILES_PER_BLOCK_MIN` tiles serving it, its own or across one street |
| P2 | residents in lots: city lot stalls within stage 3's own `PARK_SUPPLY_BAND` (still 0.75 to 1.5) x homes x `PARK_PER_HOME`; every block has a lot or a neighbour's across one street; none has more than `LOTS_PER_BLOCK_MAX`; at most ceil(blocks / 9) blocks are short |
| P3 | kerb share: every side within its profile's `KERB_BAY_SHARE_MAX`, counted over the whole block side and not stretch by stretch (Josh, 20 Nov 2026, "1. yes"), and no bay on an outer side |
| P4 | runs: every run at most `BAY_RUN_TILES_MAX` tiles, every gap between runs on a side at least `KERB_GAP_MIN_M`, no bay in a cell next to a crossing |
| P5 | the band: the three-way rule of 18.5, and the tree pitch |
| P6 | not overwhelming: bays per 100 m of block kerb at most `BAYS_PER_100M_MAX` |

- **Default (056)**: each check passes on the default city, seeds 1 to 10 at 3 x 3 and seeds 1 to 3 at 6 x 4 (`parkmetrics.test.ts`). P1, P2, P3, P4 and P6 fail on a city laid by 055's rule (every parking cell paired); P5 fails on a city with one build-out turned to `parkingPlain` away from any kerb cut.
- **Info (056, measured 18 Nov 2026 on the merged layout; the tests, not these lines, are the record)**: the default city (3 x 3, seed 1) under 055's rule (today, before 056) and under these rules. Today's column is `parkmetrics.test.ts`'s copy of 055's pairing laid on the same cells, so its units are the same.

| | Today (055's pairing, 3 bays per tile) | Under these rules |
| --- | --- | --- |
| `ParkingLines_01` tiles | 122 | 18 |
| Kerb bays | 366 | 54 |
| Bays on the outer side of an edge street, facing yard and serving nobody | 66 | 0 |
| Bays per block (the bays at its sides) | 30 to 39, mean 33 | 6 for every block (2 tiles) |
| Block kerb, both sides of every street | 1,800 m | 1,800 m |
| Bays per 100 m of block kerb | 20.3 (one bay every 4.9 m) | 3.0 (cap 6) |
| Share of a side's kerb that is bay | 0.40 to 0.83 | 0.17 to 0.25 on the 18 sides that take a run; 0.10 over all the kerb (caps 0.4 and 0.3) |
| Longest run of bays | 5 tiles, 15 bays unbroken | 1 tile |
| Parking lots (10 x 10 m, 6 stalls each) | 3, so 18 stalls | 9, so 54 stalls |
| Units | 160 shops, 379 homes | the same |
| Shoppers' bays against demand (160 shops x 1/3 = 53) | 366, 6.9 times too many | 54 |
| Residents' stalls against demand (379 homes x 0.15 = 57) | 18, 0.32 of it | 54, 0.95 of it |
| Total spaces | 384, 95% at the kerb | 108, half at the kerb and half in lots: 72% fewer |
| Spaces per unit (539 units) | 0.71 | 0.20 |
| Lot frontage | 30 m | 90 m of the 1,800 m |
| Build-out cells, and their trees | 0 | 226 cells with 82 trees (plus 68 plain cells in front of kerb cuts and on outer sides) |

- **Info (056, measured 18 Nov 2026)**: the ranges over seeds 1 to 10 at 3 x 3, then seeds 1 to 3 at 6 x 4, under these rules:
  - 3 x 3: 18 or 19 tiles, 54 to 57 bays, 9 lots with 54 stalls, 2.9 to 3.1 bays per 100 m of block kerb, 1 to 3 tiles of bays per block, no side over 0.40 of its kerb, no bay on an outer side, no short block, 196 to 247 build-outs with 73 to 98 trees. Today's rule laid 110 to 132 tiles, 330 to 396 bays (66 to 78 of them outer), 18.0 to 21.0 bays per 100 m, and 18 stalls.
  - 6 x 4: 46 to 51 tiles, 138 to 153 bays, 23 or 24 lots with 138 to 144 stalls (one block short in one seed, within the one in nine allowed), 3.0 to 3.1 bays per 100 m. Today's rule laid 248 to 290 tiles, 744 to 870 bays and 18 stalls.
  - Per block both sizes hold about 42 homes and 18 shops, so the 6 x 4 city lands where the 3 x 3 does: one to three tiles of bays and one lot per block.
- **Info (057 E, measured 19 Nov 2026)**: the two tables above were measured on 056's layout, with block sides of 40 to 60 m. Since 057 F the blocks are 30 to 80 m and 057 G's alleys and parks change the blocks' quotas. On the default city (3 x 3, seed 1) the layout now has 57 bays and 11 courts with 66 court stalls (two blocks ask two lots, seven ask one), and no block keeps a frontage lot. P1 to P6 still pass on it (`parkmetrics.test.ts`); the tests, not these lines, are the record.

- **Info (063 B, measured 19 Nov 2026 with the avenues out; the tests, not these lines, are the record)**: what moved on the default city (3 x 3, seed 1), 063 A's layout against 063 B's.
  - The city is 51 x 57 cells (255 x 285 m), was 53 x 58. The nine blocks are the same sizes.
  - Kerb bays are 57 against 57 (demand 57), court stalls 66 against 66 (demand 60.15), P6 2.794 against 2.794. Build-outs fall from 259 to 158 cells and their trees from 105 to 64, because an avenue's second parking band was almost all build-out; the pole slots are 227 against 227.
  - Junction cells are 144 (16 boxes of 3 x 3), were 182; crossing cells 192, were 216.
  - Across 3 x 3 seeds 1 to 10 and 6 x 4 seeds 1 to 3, P1 to P6 all pass (kerb bays 51 to 66 against a demand of 49 to 68 at 3 x 3, and 150 to 165 against 154 to 167 at 6 x 4), with no threshold changed. `PARK_SUPPLY_BAND` is unchanged.
- **Info (063 B, measured 19 Nov 2026, before at e23a494 and after)**: the tile city's R-checks hold on the default city and the seeds, at their tile floors (R1 `TILE_CITY_R1_MIN` 0.88, R6 `TILE_CITY_R6_MIN` 0.45, R7 `TILE_CITY_R7_MIN` 0.4).
  - Default city: R1 0.897 before, 0.899 after; R6 0.529 and 0.520; R7 0.509 and 0.509. Its nine blocks are 14 x 13, 11 x 13, 6 x 13, 14 x 9, 11 x 9, 6 x 9, 14 x 15, 11 x 15 and 6 x 15 cells before and after: no block moves in size.
  - Over 3 x 3 seeds 1 to 10 and 6 x 4 seeds 1 to 3: R1 0.897 to 0.916 (the same before), R6 0.491 to 0.557 (was 0.491 to 0.551), R7 0.500 to 0.509 (was 0.500 to 0.510).
  - Kerb bays and court stalls on the default city are 57 and 66 before and after. On 3 x 3 seeds 2, 5, 9 and 10 the bays fall by 3 (60 to 54, 57 to 54, 60 to 57, 54 to 51), and on 6 x 4 seeds 1 and 2 by 9 and 3 (159 to 150, 159 to 156), because a block's shop count follows a hash that reads cell coordinates and the demand moves with it; P1 to P6 pass.
- **Info (063 B)**: P1 is less robust without avenues, so the layout has a weakness the named cities do not show. An avenue gave a block a second parking band and a cap of 0.4. A street gives one band to each side of its two blocks, and a side of up to 12 cells (60 m) holds one tile (the 0.3 cap). A block with no parking side of its own asks the bands across its streets, and its neighbours may take their only tile first. P1 then fails by one block ("no tile of bays serves it"). Over seeds 1 to 20 it fails on 6 x 4 seeds 5, 7, 11, 12, 15, 16 and 18, and on 3 x 3 seeds 12, 15, 17, 18 and 19; before B it failed on 6 x 4 seed 18 only, and on no 3 x 3 seed. The cities the ticket names pass. A first tile for every block by matching (a re-cut of 056's allocator) would mend it; B did not touch the allocator.


### 19.7 The checks, and what they measured

- **Info (070 L1)**: the tables and ranges of this part are the old path's numbers (`city=tiles-old`, until L2). The pipeline's checks run in their stages' folders on its own named cities (6 x 6 seeds 1 to 10).
- **Default (057)**: `frontageMetrics(city, packed)` measures a packed tile city from its cells, interior and packed stacks (never from the code that laid them), `evaluateFrontage(m)` gives a verdict per check (G1 to G4, against `FRONTAGE_CHECK`), and `blockVariety(city)` with `evaluateVariety(m)` gives V1 to V4 (against `VARIETY_CHECK`). Every check allows 0. Each holds on the default city, seeds 1 to 10 at 3 x 3 and seeds 1 to 3 at 6 x 4, and each fails on a fixture.

| Check | What it holds | Fails on |
| --- | --- | --- |
| G1, no recess | every street-level wall plane is between the pavement's back edge and `OVERLAP_MAX_M` onto it (no recess over `RECESS_MAX_M`, with `FRONTAGE_TOL_M`); a second, independently pinned table of the ground faces is read as well | the same city packed "back"-aligned |
| G2, no gap in the frontage | along every block side the back edge is covered by a wall, flank, seam, overshoot (within `END_OVERLAP_MAX_M`), gated passage, parking lot, plaza or court drive | the layout of `793bbf7` (today's insets and alleys) |
| G3, no void | each block rasterised at `VOID_RASTER_M`: at most `VOID_MAX_SHARE` unfilled, no square over `VOID_PATCH_MAX_M` | the layout of `793bbf7` (55 to 67% void) |
| G4, courts reached | every court touches a drive, every drive has its kerb cut (or opens on an alley lane), and every alley end has its kerb cut | a drive with its kerb cut removed |
| V1, block sizes vary | on each axis the sizes' coefficient of variation is at least `BLOCK_CV_MIN`, and the city has at least ceil(blocks / 2) distinct footprints | a uniform 10 x 10 cell grid |
| V2, not square | at least `BLOCK_NONSQUARE_MIN` of the blocks are not square | the same |
| V3, alleys | at least ceil(blocks / `ALLEY_ONE_IN_BLOCKS`) alleys, counted from the interior's `alley` cells | the same |
| V4, parks | at least ceil(blocks / `PARK_ONE_IN_BLOCKS`) parks, counted from the `parkEdge` cells | the same |

- **Decided (057, Josh 19 Nov 2026, "Tile-city R1 floor 0.88 (Recommended)")**: R1 (the frontage share, 16.8) has a floor of `TILE_CITY_R1_MIN` on the tile city, beside `TILE_CITY_R6_MIN` (0.45, 18.7) and `TILE_CITY_R7_MIN` (0.4). The alleys cut R1 to 0.897 to 0.903 on 3 x 3 cities against the ladder's 0.90, which stays in `CITY_CHECK` (`citymetrics.ts` is unchanged).
- **Info (057 E, measured on 19 Nov 2026, with the fixture stacks of `frontage.test.ts`, no browser)**: the default city (3 x 3, seed 1) before 057 (the architect's baseline of 18 Nov on `793bbf7`, bounds and not walls) and now (`goal/city-style` with 057 A, B, C, F and G merged). The tests, not these lines, are the record.

| | Before (`793bbf7`) | Now |
| --- | --- | --- |
| Street-level wall behind the pavement's back edge | up to 0.80 m, mean 0.26 m (by bounds; 11% of the frontage flush) | none: every wall plane on the edge; the furthest sill or sign 0.557 m onto the pavement |
| Corner inset at every block corner | 1.0 to 1.8 m, up to 2.5 m | 0 |
| How rows' far ends close | 81 to 85% a 1.0 to 1.5 m alley, 8 to 9% a seam, 5 to 9% a 1.5 to 4 m gap, 0 to 3% over 4 m | 50 of 52 gated passages and 2 overshoots (0.415 m at most); no seam, slit or wide gap |
| Uncovered stretches of a block side's back edge | many (the insets and far ends) | 0 of 46 sides |
| Empty yard in each block | 1,015 to 2,146 m2, 56 to 65% of the block | none: at most 0.28% of a block unfilled, in squares of 0.25 m at most |
| Blocks | 40 to 60 m each way, nine footprints, one square | 30 to 70 m by 45 to 75 m, nine footprints, none square |
| Alleys and parks | none | 5 alleys, 2 half-block parks |
| Residents' parking | 9 frontage lots, 54 stalls (056's layout on the old block sizes) | 11 courts with 66 stalls (the blocks' quotas on the new sizes), none on the frontage |

- **Info (057 E, measured on 19 Nov 2026)**: over seeds 1 to 5 at 3 x 3 and seed 1 at 6 x 4 every check above passes, every wall stands on the edge, 70.7% to 73.1% of block area is interior, 44 to 52 runs close as 44 to 50 passages and 2 to 4 overshoots at 3 x 3, and the frontage covers every block side. Seed 5 is the one city with a block that kept a frontage lot.



## Moved from docs/city-style/packs.md (ticket 080 B1): the manifest readings and the galleries

Text moved out of `docs/city-style/packs.md` unchanged. It records readings and describes dev tools; it is not a rule.

- **Info (manifest, 17 Nov 2026)**: `town-pack` has 704 entries and 9 failures (character files with duplicate names). Of its entries, 2 are `scale-suspect` (`SM_Bld_House_DeckSteps_01`, 0 x 0 x 0, and `POLYGON_Town_Demo`) and 62 carry `missing-texture`. Preassembled buildings: `SM_Bld_House_Preset_01` to `_11` (from 5.7 m to 18.2 m wide, 4 to 9.4 m high), `SM_Bld_House_Preset_Garage_01`, `SM_Bld_Church_01` (10.4 x 16.5 x 14.4 m) and `SM_Bld_GardenShed_01` (2.3 x 2.8 x 2.5 m, prop-sized). It also holds many loose wall, deck and door pieces that are not buildings.

- **Info (manifest, 17 Nov 2026)**: `city-pack` has 355 entries and 2 failures. Its 30 `scale-suspect` entries are the characters (`SK_Char*`), the vehicles (`SM_Veh_*`) and the skyline (`SM_Env_Skyline_*`), about 100 times too big at `"scale": 100`. A `scaleOverrides` factor of 0.01 would be needed for any of them. Its buildings are right at 100. Its roads are flat 5 m tiles (`SM_Env_Road_*`), with pavements `SM_Env_Sidewalk_*`. Its buildings are mostly modular: Base, Floor, Roof, Glass and Corner pieces of one tower (`SM_Bld_OfficeSquare_*`, `_OfficeRound_*`, `_OfficeOld_*`, `_OfficeOctagon_*`, `SM_Bld_Apartment_*`) that need assembling, with a few whole variants (for example `SM_Bld_OfficeSquare_01`) and one whole `SM_Bld_CityHall_01` (20.1 x 8.7 x 17.6 m). The City Pack's stack pieces are in `BUILDING_FRONTS` (chapters 6 and 7, provisional) and its stacks in `STACK_STYLES`; none of it is in `MODEL_TABLE`, so the pack table's "in use" for it comes from the recipes. Its roads, pavements and city hall are still not used.

- **Info (043 section B)**: the gallery is `/?puzzle=09-shrine-circuit&view=3d&gallery=<pack-id>` (an empty value is `simple-town`). It loads only that pack's GLB and shows every building-sized entry in one straight line along x, seen from a low camera. Each model stands four times side by side, turned so its side `+z`, `+x`, `-z` and `-x` faces you in turn, each captioned `door: f`. The copy whose real door faces you is the model's true front: name it (for example "Preset_03: -x") and that becomes its `BUILDING_FRONTS` line (`pack:name`). The copy that matches the front in force now is captioned `current` (the code's table), `current, saved` (the saved file) or `current ?` (no line anywhere: the "+z" guess), and has a green outline. The title says how many models of the pack are marked ("N of M marked"). Each group has one caption with the name, size in metres, lot type and any `corner` or `excluded` mark. Whole-looking buildings come first, modular parts after. Drag, the arrow keys, Home and End move along the line and the wheel zooms. `&page=N&per=N` pages it, off by default. It is off unless the flag is there, never a pick target and never part of a playtest.

- **Info (050 B)**: the stack gallery is `/?puzzle=09-shrine-circuit&view=3d&gallery=city-pack&stacks=1` (dev only, never in `npm run build`, never a pick target, never part of a playtest; the code is `stackgallery.ts` and `stacks.ts`). It shows every recipe assembled on each lot type it serves, at its most floors, as a mid-row stack and as a corner stack at each end, seen from the street. Each stack is captioned with its style, lot type, floors, height against the cap and every piece's key and front, marked `guess` unless the code's table or the saved file has the key. Below it, the click line shows the recipe's pieces (roofs included) four ways, and a click saves a front exactly as in the pack gallery. A saved "+z" counts as saved even when it came from a first click, so an unmarked piece still needs a look.

- **Info**: the converter has no include filter. It converts every FBX under the pack folder, so `town-pack` is a GLB of about 110 MB.


## Moved from scale-and-lots.md, parking.md, light-and-accessibility.md and testing-daylight.md (ticket 080 B2, first batch): readings and history

Text moved out of `docs/city-style/scale-and-lots.md`, `docs/city-style/parking.md`, `docs/city-style/light-and-accessibility.md` and `docs/city-style/testing-daylight.md` unchanged. It records readings and history; it is not a rule. A bullet that starts "From" names the line of the old guide it was cut from.

### From scale-and-lots.md

- **Info**: only the highest height tier ever occurs on the ladder, so every block's cap lets it have three to five storeys.

- From the far-end bullet of chapter 4 (the rule is now in 16.2): Where the pieces cannot (N unscaled columns span only 5.0 N to about 5.28 N metres, so most row lengths fall in a dead band), it aims for a gap from `ALLEY_MIN_M` to `ALLEY_MAX_M`, which reads as an alley between blocks (dressed in 052 C), and never for a 0.3 to 0.5 m slit

- From the far-end bullet of chapter 4: (that block's own stack depth, 5.62 to 5.92 m by the shops and roof corners it draws, not the style's deepest piece; `packTown` packs a block's runs together so each row closes to the corner block the next row really got; or a plaza's or parking lot's edge)

- From the flush bullet of 16.2: Whole columns span only a little more than the nominal bay, so most runs cannot close to the wall exactly.

- From the open-lots bullet of chapter 4: A later ticket (052 C) dresses them; until then they are bare yard.

- **Info (053)**: the packer, the dressing of the open lots and the alleys, and the checklist a generated street is judged by are in chapter 16 (16.2 and 16.8); the "bare yard" above was true until 052 C.

### From parking.md

- From the introduction of chapter 18: (ticket 056 A, B and C wrote them); Nothing on the ladder maps changes: the ladder's town (chapter 4) keeps its hash lots, and `town.ts` gained only the option that switches them off for the tile city.

- **Info (056)**: these are drawn spaces, about half of what a real dense terraced core provides. A real core has about 0.3 spaces per home, and about 1 per 40 m2 of shop, which here is about 0.7 per 31 m2 shop bay. The camera reads every drawn stall at full size, and Josh found the full count overwhelming. [D-056c]

- From 18.2: The old path counted the lots' 5.2 m bays.

- From 18.2: The old path's figure was 2 x 5.2 m x 6 m, about 62 m2 (`city=tiles-old`, until L2d).

- From 18.2: The test packs the fixture stacks and compares the city-wide shop count and the homes (column-floors over `HOME_COLUMN_FLOORS`) with the layout's sums, on the default city and seeds 1 to 10 at 3 x 3.

- **Info (056, measured 18 Nov 2026 on the merged layout; the test, not this line, is the record)**: the default city packs 95 stacks of 255 columns and 775 column-floors, 3.04 floors over the base on average. The layout counts 255 columns, 160 shops (the plan has 152, 5% under) and 379 homes (the plan has 387.5, 2% over). Per block that is 15 to 21 shops and 34 to 49 homes. Seeds 1 to 10 at 3 x 3 have 255 to 285 columns, 160 to 180 shops and 379 to 424 homes.

- From 18.3: (and, before 063 B, both sides of an avenue: the tile city has no avenue now); Avenue sides fill first, then longer sides, with ties by id. With no avenue (063 B) that is the longer sides first.; Every street is a street since 063 B, so the first field is unused.

- **Info (057 C)**: the court's drive is as wide as 056's lot, so the frontage that parking lots cost stays about 90 m of the 1,800 m; the saving of about 45 m that the 057 draft counted would need a one-cell drive (19.4).

- **Info (056 B)**: R6 sits at 0.49 to 0.55 on the tile city whatever the layout, by the dressing's own sign chance. The floor lets a later layout change pass without a re-tune, so the lot-run salt that 056 A had tuned to hold R6 at 0.5 is gone.

### From light-and-accessibility.md

- From 9: This reversed the 12% sag of 037 C-Q2, because heavy sag on short spans made the wires read as lines.

- **Info**: the code uses a `DROP_REACH` of 2.5, where 041 C5 wrote 2. At 2 almost no lot is reachable (the reason is in the `layout.ts` comment). The 041 C review raised the difference, and 041 merged with 2.5.

### From testing-daylight.md

- From 16.12, the one-owner bullet: a test reads the source to hold this.

- From 16.12, the night bullet: A test holds the three protocol maps' lights, background and every material colour equal to a snapshot taken before the rig existed.

- **Info (060)**: the earlier dev-only daylight (055 E) added one hemisphere light to a night scene, owned twice (`tilecity3d.ts` and `streetcam.ts`), and left the sky and the surfaces near black. Its three constants (the street camera's daylight sky, ground and intensity) are retired with it; their rows are gone from the Numbers table.

- **Info (060, 057 D)**: the grass colour (`surfaces.grass` of each light mode, a Numbers row) was held for a drawer. Since 057 D the greens of the block interiors are drawn (19.4): the City Pack's `SM_Env_Grass_01` tiles, sunk 0.11 m so the blades stand a hair over the walk, or, where the piece is absent, flat quads in the mode's grass colour. The tile view brings a material it swaps in later (the pack's tiles arriving) to the mode it is in.

### Ticket references cut from the domains (ticket 080 B2)

- From the introduction of chapter 18: (ticket 070; `docs/city-grammar.md` and `tickets/070-city-pipeline.md` give the stages)
- From 18.4: stays on the tile grid with a kerb cut (055 B)
- From 18.5: the one plain straight `Straight_02` the pavement uses, 063 A
- From 9: (neither pack had them; drops are 041 C5)
- From 16.2: The details of the pinwheel and the corner block are chapter 4 and chapter 7; this chapter does not repeat them.

## Moved from streets-and-blocks.md and buildings.md, and the files split from them (ticket 080 B2, second batch): readings and history

Text moved out of the two domains `docs/city-style/streets-and-blocks.md` and `docs/city-style/buildings.md` (`docs/city-style/streets-and-blocks.md`, `docs/city-style/block-grammar.md`, `docs/city-style/block-stacks.md`, `docs/city-style/buildings.md`, `docs/city-style/fronts.md`, `docs/city-style/corner-buildings.md`, `docs/city-style/colourways.md`), unchanged. It records readings, history and walkthroughs; it is not a rule. A line that starts "From" is the part of a bullet that left it. A bracketed id in front of a line is its row in `docs/city-style/decisions.md`.

### From streets-and-blocks.md (chapters 3 and 10)

- From the avenue bullet of chapter 3 (the rule is now [D-063f]): (0 is none; before, one interior line in 3 by hash, and at least one on every axis, was a 6-cell avenue with a 4-cell carriageway and a parking band on both sides).

- From the plain-pavement bullet of chapter 10 (the rule is now [D-063g]), the measurement that stands behind it, which was an Info line: **Info (063 A, measured 19 Nov 2026)**: the two straights were the same mesh and the same colour (the slab `#8c8987`, the lip and joints `#7b7b79`). The difference was the material: `Sidewalk_Straight_01` is the only piece the tile view used whose material is BLEND. The converter put it on the City Pack's second atlas copy, `PolygonCity_Texture_01_A`, whose alpha channel is mostly under 255 (102 and 44 of 255 at the slab), so it drew at 17 to 40% opacity and the sage ground or the asphalt showed through: the pale sage slabs and the dark build-outs. `Straight_01` is now in no role and is not loaded. A test reads the GLB and fails on any piece the tiles or the interiors load whose material is BLEND. The converter's handling of that atlas copy is a `tools/` matter (ticket 063's open item A1).

- From the interior-paving bullet of chapter 10 (the rule is now [D-063h]): which has two inset plates 0.04 m below its slab (3.8 m2 of dark green-grey, with studs) that read as plots; they are service covers the pack drew, not tree plots, and the texture was used correctly.

- From the grates bullet of chapter 10 (the rule is now [D-063j]): Josh did not answer these two in words; he said he does not want to approve each improvement ("I don't want to constantly approve all of these improvments."). If he objects on seeing them, each is one constant or one line.

- From the kerb bullet of chapter 10 (the rule is now [D-063k]): Josh's drawing is the rule: at an inlet the kerb turns in on each side of the opening and runs along it to the building line, with the dropped kerb of the mouth between the two returns.

- **Info (063 F, measured 19 Nov 2026)**: the pack's sidewalk pieces have the kerb face 0.66 m inside the cell's edge, not on it (`KERB_FACES_M`: `Straight_02` 0.66 m, `Grate_01` 0.65 m, `Dip_01` 0.66 m; the lip is 0.30 m above the road, 0.07 m above the walk, and 0.39 m wide), and the 0.65 m outside the face is the piece's own gutter and ramp at road level. A straight has no face on its two ends: the open, unkerbed edge of every build-out stretch. The layout's kerbs (`Town.kerbs`, `TileStreet.carriage`) stay on the cell edge, and a pole slot (`POLE_SLOT_FROM_KERB_M`, 0.75 m from the edge) stands 0.09 m behind the pack's face: 059 reads it and keeps it. `Sidewalk_Dip_Corner_01` is a pedestrian ramp, not a kerb return: each of its two legs has only about 1.1 m of full-height kerb, at the leg's far end, and the rest of the corner falls to the road on a diagonal ramp, so it cannot carry the kerb round an inlet. A test reads the GLB and re-measures every face within 0.02 m.

### From buildings.md (chapters 5 and 6, and the colourways)

- From the exclusions bullet of chapter 5 (the check is `styleguide.test.ts`): **Info**: the guide's check of this chapter: `BUILDING_EXCLUDE` lists `simple-town:store_small_mesh`, so the guide names that key.

- [D-048b] **Info (048)**: with Josh's fronts the Town Pack fills `small` (`SM_Bld_House_Preset_01`, `_02`, `_09` and `SM_Bld_House_Preset_Garage_01`) and `house` (`_03` to `_07` and `_10`). `_08` and `_11` are `large` (two families, under 4), so `large` and `tall` stay SIMPLE Town. With no Town Pack in the manifest, or its GLB failed to load, every type is SIMPLE Town and the town is as it was before 048 (a fresh checkout and CI).

- [D-048l] **Info (048)**: the Town Pack's other five lines are "-z", the default, so they are not in the table: `SM_Bld_House_Preset_02`, `_07`, `_10`, `_11` and `SM_Bld_House_Preset_Garage_01`. All fourteen were promoted by hand from Josh's saved file (`savedAt` 2026-11-18T03:10:05.703Z). The City Pack's stack pieces are the next bullet.

- [D-050b] **Info (050 C, provisional)**: the 34 City Pack stack pieces in `STACK_STYLES` have a `BUILDING_FRONTS` line each: 26 here and the 8 corner pieces in chapter 7. Josh's saved file (`savedAt` 2026-11-18T03:50:16.193Z) has 25 of them, every one "+z". A gallery click on the first copy saves "+z", so these are not shown to be doors he saw. The other nine (`Apartment_Corner_01`, `_03`, `Apartment_Door_01` and the six roofs) were not in the file and take the same "+z" guess. All 34 are provisional until Josh confirms them in the stack gallery (chapter 15); a fix is one line in `BUILDING_FRONTS`, and a saved front still overrides it in a dev build.

- **Info (045 section C, dev builds only)**: the gallery takes clicks. Click the copy whose door faces you: that side becomes the model's front and the choice is written at once to the saved file (`assets/private/calibration/fronts.json`) through the dev server; the copy's caption then reads `current, saved`. Clicking another copy changes your mind. Clicking the `current` copy when its front is only the code's table or the "+z" guess saves it as it stands; clicking one that is already `saved` does nothing. Shift+click sets that side and toggles `excluded` (a model you never want placed). Delete (or Backspace) clears the last-clicked model, so the code's table applies again. A press and release within 5 px is a click; further is a pan. If the dev server cannot write, the mark stays on screen with `not saved: <reason>` under the model's caption and in the title, and the next click retries. The line never reorders when you mark a model. A click does not reach the town, and none of this is in `npm run build`.

- From the fixture bullet of chapter 5: with the fixture sizes, `large` offers six styles (the three apartment styles, `office-old-small`, `office-old-large`, `office-octagon`) and `tall` four (the three apartment styles and `office-old-small`). (kept in chapter 5, as a fact).

- [D-063b] **Info (063 E1, measured 19 Nov 2026)**: the "+x" the eight City Pack corner pieces had was the 050 C recipe's guess ("no data says which end"). `measureOpenSide` (facade.ts) compares each side's profile with the front's: a street face is modelled like the front (the same window reveals, shop openings or cornice steps at the same depths), a party wall is a plain slab. On all eight pieces the street faces are **+z and -x** and the party walls **+x and -z**; the nearer side is 9 or more times nearer (`OPEN_MARGIN` is 4). The pack's `Shop_Corner_01_Glass`, `Shop_Corner_02_Glass` and the L awning `Shop_Cover_05` have their faces on +z and -x too, so they follow the corner's turn. `OPEN_SIDE_MEASURED` holds each piece's side and the reason; `facade.test.ts` re-measures it when the GLB is on the machine.

- From chapter 7, the `WALL_SIDE_M` sentence (the rule is now in `docs/city-style/corner-buildings.md`): `WALL_SIDE_M`, the wall of the open face, was measured on +x (the blank party wall) and is re-measured on -x (chapter 19.1); `wallOffset` reads the open side whichever it is, and gives 0 for a side other than the measured one, as a recalibrated front does.

- From 16.9 (the colourway rule): **Info (054)**: what changes on a block. 85.7% of the pack's building triangles sample the wall gradient block, where series 02 to 04 recolour the brick and the warm-brown trim columns; 6.5% sample blue panels that turn grey in 02 and 04 (likely door and window panels, accepted as more variety); none sample a sign. Cost: each atlas is 4 MiB decoded, 28 MiB for the 7 that load; materials grow by the distinct base-atlas materials on stack pieces times 7; draw calls and shader programs do not change.

- From the Open bullet of 16.9: Judged by eye by the main session on 18 Nov 2026: neighbouring blocks render in red, dark green, cream-tan and teal, and shopfronts and the grey styles look the same in every colourway.

- From the R13 bullet of 16.9: it passes at 1 because the rule steps off a repeat.

### From block-grammar.md and block-stacks.md (chapter 16 and 19)

- From the introduction of chapter 16 (the rule is now [D-053c]): Approvals for this goal were waived by Josh in the same chat.

- From 16.3 (the rule is now [D-063m]): what he saw is pieces of different true sizes, each centred by its bounds, so a roof stood 0.7 m behind the walls it covers at the front and 0.8 m past them at the back, and a corner's flank stepped in and out from storey to storey.

- From 16.3 (the body bullet, now [D-063n]), how a roof's body is measured: the outer face of its lowest cornice tier, the plane that runs furthest along the face, within `ROOF_BASE_BAND_M` of the foot, at least `ROOF_BASE_MIN_SPAN_M` long, the outermost on a tie within `ROOF_SPAN_TIE_M`

- From 16.3, the back sub-bullet: (a roof's foot is then about 0.1 m past the wall line at the front, 0.108 m at most, and its cornice top up to 0.8 m: what the piece really carries). 

- From 16.3, the `storeyAlignment` bullet: on the apartments `Apartment_Roof_02`'s foot (0.108 m past the wall at the front, over `apartment-02`), a turned `Apartment_Roof_Corner_03` (0.108 m wider than its floor, because its body is 5.108 m deep) and the two-bay `Shop_03` (0.142 m narrower on each side than the two floor bodies, which leave 0.28 m between them); and on the offices the small one's podium base (0.12 m beyond its floor's walls each side) and cornice (0.103 m each side, its foot 0.212 m past the front line), the large one's base (0.12 m) and its cornice's foot (0.135 m past the front), and the Octagon's base (0.205 m inside its floor's walls: a round roof has no body to report). The planes between `STOREY_ALIGN_TOL_M` and `BODY_REPORT_M` off the footprint (`slight`: a roof's foot 0.078 m past the front wall line, a corner roof's party-side flank 0.046 to 0.078 m, a turned `Shop_Corner_01`'s party-side flank 0.072 m) are reported the same way and not failed, so no difference over the tolerance goes unseen.

- **Info (063 E2, measured 19 Nov 2026)**: the pack may cross-pair its corner roofs. `Apartment_Roof_Corner_02` has `Apartment_Roof_03`'s body (front 0.421, back 0.125, sides 0.143 m inside the bounds) and `Apartment_Roof_Corner_03` has `Apartment_Roof_02`'s (0.285, 0.095, 0.115), and their depths agree (5.624 and 5.488 m). `STACK_STYLES` pairs corner roof _02 with apartment-02 and _03 with apartment-03. Swapping them would put each style's corner roof on the cornice depth of its mid roof, but a style may not borrow another style's roof (Q-E2, default "no") and nothing is re-paired here: it is Josh's to decide.

- **Info (063 E2, until section I)**: seating a shop corner's body on the corner floor's body leaves the shop corner's street-level flank 0.02 to 0.13 m back from the cross street (about 0.10 m on apartment-01 and -03, 0.02 m on apartment-02, up to 0.13 m when turned at the +x end), because the floor stays centred in its bounds-wide column and the shop's body is flush with its own bounds less 0.19 m. That is a recess against 19.1's law ("not okay if the buildings sit recessed from the sidewalk"), small enough that G2's flank cover tolerates it. Ticket 064 section I lays the columns on their bodies, which puts that flank on the cell edge; until it merges, this step-back is known. It does not re-pair roofs across styles: a style may not borrow another style's roof (the ticket's Q-E2, default "no"), though the pack's own `Roof_02` fits `Apartment_03` best.

- **Info (057)**: blocks whose terraces butt back to back would be about 12 m deep, two stacks of 5.2 to 5.9 m. On the 5 m grid that is 15 m, with a 3 m service strip. With 25 to 30 m streets between them, roads would take about three quarters of the city along that axis. They already took about 65% of the area (about 105 m of street to 150 m of blocks per axis on the default city at `793bbf7`).

- **Info (063 B, re-measured 19 Nov 2026)**: with no avenues the default city has 100 m of street on each axis (was 105 m and 110 m), and streets take 60.5% of its area (was 62.7%, over 53 x 58 cells). Over seeds 1 to 10 at 3 x 3 and seeds 1 to 3 at 6 x 4 the share is 55.2% to 62.6% (was 56.6% to 64.1%).

- **Info (057 F)**: what `tilecity.ts` varied before: every street line ran the city's full length, each column of blocks took one width and each row one depth from 8 to 12 cells (40 to 60 m, nine footprints on the default city, one of them square), and one interior line in `AVENUE_ONE_IN` was an avenue. But every block in a column shared its width, the range was a 1.5 to 1 ratio at most, and no block was split, so it still read as a regular grid.

- From the as-built bullet of 19.5, first rule: because the kerbside bays of 056 (P1) cannot be laid on a 6 x 6 block on streets.

- From the as-built bullet of 19.5, second rule: because R1 was borderline (0.887 to 0.90) on cities of mostly short sides.

- From the as-built bullet of 19.5, last rule: The hash key `"width"` in `blockLens` was chosen among a few tried, because R7 (the tile city's fire-escape floor) is noise on the dressing's own escape chance and moves in ninths with nine blocks. Ticket 061 (R7 by rank, 16.11) made it a guarantee: R7 no longer depends on that key.

- **Info (057 F, measured by 057 E on 19 Nov 2026)**: on the default city the columns are 70, 55 and 30 m wide and the rows 65, 45 and 75 m deep: nine different footprints, none square, a coefficient of variation of 0.32 along x and 0.20 along z. On 6 x 4, seed 1, 24 blocks have 24 different footprints.

### Ticket references cut from the domains (ticket 080 B2, second batch)

Each is a question number or a ticket reference that stood in a tag or a sentence of the old text; the tag now names the ticket only, or the row in `docs/city-style/decisions.md`.

- From chapter 3: the tags Default (041 Q1) (two bullets: the road beside a wire; the road's width and kerb), Default (041 Q2) (the 3D town builds its own streets), Default (042 Q7) (odd-angled pads), Default (041 Q8) (no street furniture) and Info (053) (terrace pavements); and the tag of the avenue bullet, Default (063 B).
- From chapter 10: the tags Default (042 Q7) (the straight tiles), Default (063 F) (the pack's kerb is not changed), Info (063 A, measured 19 Nov 2026), Info (063 F, measured 19 Nov 2026), and Pending (042 C, gated on Josh's converted road pack), which is now the Open question of `docs/city-style/streets-and-blocks.md`; the superseded rule's number in the first bullet, 041 Q7 ("roads code-drawn everywhere").
- From chapter 10, the tag of the grates bullet: Default (063 A, 063 H, the architect's recommendations adopted under Josh's goal waiver, 19 Nov 2026); of the return bullet: Default (063 F, the architect's recommendation adopted under Josh's goal waiver, 19 Nov 2026).
- From chapter 16 and 16.1: the tag Info on the reference, the pipeline and the grammar table.
- From 16.3: the tags Default (050 C) (doors), Default (063 E2, the architect's recommendation under Josh's goal waiver) (the body), Default (063 E2) (`storeyAlignment`), Info (063 E2, measured 19 Nov 2026), Info (063 E2, until section I); the question reference Q-E2 (default "no") in the roof-borrowing rule; the "measured, 063 E1: chapter 7" pointer stays in the domain.
- From 19.3: the tags Info (057), Info (063 B, re-measured 19 Nov 2026) and Default (057 Q2). From 19.5: the tags Default (057 F), Info (057 F), Info (057 F, as built), Info (057 F, measured by 057 E on 19 Nov 2026); the question reference 057 Q8 (streets that end at a T-junction); the phrase "of 056 (P1)" after "kerbside bays" in the 7-cell rule, now written as 18.3; Ticket 061 (R7 by rank, 16.11) in the hash-key bullet.
- From chapter 5: the tags Default (042 A, from 041), Default (041 B4, 042 A), Default (042 Q3, keys by 045 A), Default (041 Q4), Default (048 Q1; the reason is Josh's 18 Nov 2026 quote), Default (050 Q1, on Josh's 18 Nov 2026 quote), Info (050 C), Info (048), Info (053); "the 048 rule" in the 050 bullet, now "the Town Pack rule".
- From chapter 6: the tag Info on the door-side bullets, Info (048), Info (050 C, provisional), Info (043 section B), Info (045 section C, dev builds only) and Default (042 Q2); the table notes "calibrated by Josh, 042 A", "calibrated by Josh, 048", "provisional, 050 C: a first-click guess, not confirmed".
- From chapter 7: the tags Decided (042 A, implemented) (two bullets), Default (048 Q5), Info (063 E1), Info (053), Default (050 C, from the corner rule above); "(050 C)" after "The City Pack's eight corner pieces" and "(063 E1, below)" after "measured from the GLB".
- From 16.4 and 16.7: the tags Default (050 C) (stacks on the circuit's own lots) and Info (054); in 16.9 the tags Default (054 Q3), Default (054 Q1), Info (054) and Open (waits for a generated-recolour ticket, if the eye check finds too few colours).
- From the as-built bullet of 19.5 (the intro, now a plain sentence in `docs/city-style/block-grammar.md`): the block draw has three rules the draft did not have. They are tuning choices, and they narrow the effective spread of the 6 to 16 cell range.
