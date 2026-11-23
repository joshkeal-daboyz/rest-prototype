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

