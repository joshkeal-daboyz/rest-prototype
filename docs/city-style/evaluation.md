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

- **Info (070 L1)**: the pipeline's checks run in `src/city/mass/` and `src/city/edge/` on its own named cities (6 x 6 seeds 1 to 10). The old path's parking measuring code, its tables and its ranges went with the old tile city (ticket 081 A1).
- **Default (056)**: each check gives one verdict, as `evaluateCity` does for the buildings, and allows 0 violations, and for P6 the most bays per 100 m of block kerb.

| Check | What it holds |
| --- | --- |
| P1 | shoppers at the kerb: city kerb bays within `PARK_SUPPLY_BAND` x shops x `PARK_PER_SHOP` (the first field is the floor, the second the ceiling; on the pipeline the floor is 0.69, not 0.75, for kerb bays only: Josh, 20 Nov 2026, "yes lower it"), every block with at least `BAY_TILES_PER_BLOCK_MIN` tiles serving it, its own or across one street |
| P2 | residents in lots: city lot stalls within stage 3's own `PARK_SUPPLY_BAND` (still 0.75 to 1.5) x homes x `PARK_PER_HOME`; every block has a lot or a neighbour's across one street; none has more than `LOTS_PER_BLOCK_MAX`; at most ceil(blocks / 9) blocks are short |
| P3 | kerb share: every side within its profile's `KERB_BAY_SHARE_MAX`, counted over the whole block side and not stretch by stretch (Josh, 20 Nov 2026, "1. yes"), and no bay on an outer side |
| P4 | runs: every run at most `BAY_RUN_TILES_MAX` tiles, every gap between runs on a side at least `KERB_GAP_MIN_M`, no bay in a cell next to a crossing |
| P5 | the band: the three-way rule of 18.5, and the tree pitch |
| P6 | not overwhelming: bays per 100 m of block kerb at most `BAYS_PER_100M_MAX` |

- **Info (063 B)**: P1 is less robust without avenues, so the layout has a weakness the named cities do not show. An avenue gave a block a second parking band and a cap of 0.4. A street gives one band to each side of its two blocks, and a side of up to 12 cells (60 m) holds one tile (the 0.3 cap). A block with no parking side of its own asks the bands across its streets, and its neighbours may take their only tile first. P1 then fails by one block ("no tile of bays serves it"). Over seeds 1 to 20 it fails on 6 x 4 seeds 5, 7, 11, 12, 15, 16 and 18, and on 3 x 3 seeds 12, 15, 17, 18 and 19; before B it failed on 6 x 4 seed 18 only, and on no 3 x 3 seed. The cities the ticket names pass. A first tile for every block by matching (a re-cut of 056's allocator) would mend it; B did not touch the allocator.


### 19.7 The checks, and what they measured

- **Info (070 L1)**: the pipeline's checks run in their stages' folders on its own named cities (6 x 6 seeds 1 to 10). The old path's frontage measuring code, its tables and its ranges went with the old tile city (ticket 081 A1).
- **Default (057)**: each check gives a verdict (G1 to G4 and V1 to V4), and every check allows 0.

- **Decided (057, Josh 19 Nov 2026, "Tile-city R1 floor 0.88 (Recommended)")**: R1 (the frontage share, 16.8) has a floor of `TILE_CITY_R1_MIN` on the tile city, beside `TILE_CITY_R6_MIN` (0.45, 18.7) and `TILE_CITY_R7_MIN` (0.4). The alleys cut R1 to 0.897 to 0.903 on 3 x 3 cities against the ladder's 0.90, which stays in `CITY_CHECK` (`citymetrics.ts` is unchanged).



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

- From 18.2: The old path's figure was 2 x 5.2 m x 6 m, about 62 m2 (the old tile city's, deleted in ticket 081 A1).

- From 18.2: The test packs the fixture stacks and compares the city-wide shop count and the homes (column-floors over `HOME_COLUMN_FLOORS`) with the layout's sums, on the old path's default city and seeds 1 to 10 at 3 x 3 (deleted in ticket 081 A1); the pipeline's checks run on 6 x 6 seeds 1 to 10.

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

- **Info (063 F, measured 19 Nov 2026)**: the pack's sidewalk pieces have the kerb face 0.66 m inside the cell's edge, not on it (`KERB_FACES_M`: `Straight_02` 0.66 m, `Grate_01` 0.65 m, `Dip_01` 0.66 m; the lip is 0.30 m above the road, 0.07 m above the walk, and 0.39 m wide), and the 0.65 m outside the face is the piece's own gutter and ramp at road level. A straight has no face on its two ends: the open, unkerbed edge of every build-out stretch. The layout's kerbs (`Town.kerbs`, `TileStreet.carriage`) stay on the cell edge, and a pole slot (`POLE_SLOT_FROM_KERB_M`, 0.75 m from the edge) stands 0.09 m behind the pack's face: 059 reads it and keeps it (the rule's record is `docs/design/070-K1-circuit.md`). `Sidewalk_Dip_Corner_01` is a pedestrian ramp, not a kerb return: each of its two legs has only about 1.1 m of full-height kerb, at the leg's far end, and the rest of the corner falls to the road on a diagonal ramp, so it cannot carry the kerb round an inlet. A test reads the GLB and re-measures every face within 0.02 m.

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

## Moved from facades.md and frontage-and-interiors.md, and the files split from them (ticket 080 B2, third batch): readings and history

Text moved out of `docs/city-style/facades.md` and `docs/city-style/frontage-and-interiors.md`, and the files split from them (`docs/city-style/facades.md`, `docs/city-style/furniture.md`, `docs/city-style/door-sills.md`, `docs/city-style/sill-lift.md`, `docs/city-style/fire-escapes.md`, `docs/city-style/frontage-and-interiors.md`, `docs/city-style/block-interiors.md`, `docs/city-style/alleys-and-parks.md`, `docs/city-style/interior-drawing.md`), unchanged. It records measurements, run results, history and walkthroughs; it is not a rule. A line that starts "From" is the part of a bullet that left it.

### From facades.md and furniture.md (16.5)

- From the ATM bullet of 16.5: The ticket put it on a shop pier; a shop's glass leaves none.

### From door-sills.md and sill-lift.md (16.10)

How a sill is measured, and the readings of the table.

- **Info (055 F)**: how a sill is measured (`measureDoor`, from the converted GLB's geometry). The front face is the model's furthest vertex along the front `BUILDING_FRONTS` names; `v` is the depth behind it. A door floor is a horizontal, upward-facing surface up to `SILL_CEIL_M` high that starts within `SILL_DEPTH_M` behind the front face. Surfaces within `SILL_LEVEL_GAP_M` in height are one level, and those on a level within `SILL_JOIN_GAP_M` along the front are one cluster; a cluster under `DOOR_MIN_AREA_M2` is a fitting (a door's kick plate, a stair nosing), not a floor. The door is at the front's centre when a floor cluster covers it, else at the centre of the nearest floor cluster (a house's threshold slab, an office's lobby). The sill is the highest floor cluster within `SILL_DOOR_HALF_M` either side of the door's centre. `window_m` is the lowest vertex of the glass triangles within `SILL_DEPTH_M` of the front face; a model with no glass material takes the window method of the 062 A rule below. A model the geometry cannot settle has an entry typed in or a reason in `NO_STREET_DOOR` (below).

- From the steps bullet of 16.10: ; 1.19 x 0.513 x 0.871 in the GLB

- From the every-building bullet of 16.10: That settles `SM_Bld_House_Preset_10` and `_11` (2.57 m back, 3 m search, 1.05 m), the SIMPLE Town shops, stores, `Building_House_05` to `_08`, the gym, the coffee shop (1.08 to 3.49 m back) and the stoop houses `Building_House_09`, `_010` and `_011` (their door floor, 0.64 m, is 1.24 m back behind two stoop steps).

- From the typed-in bullet of 16.10: `SM_Bld_House_Preset_04` (its 1.15 m threshold, 5.05 m back in a deep porch) and the Town Pack's `SM_Bld_House_Preset_Garage_01` (1.052 m: it sinks like its houses, by the same sill, so no plinth is left beside them).; the SIMPLE Town garages (vehicle bays at ground level), `Building_PetrolStation` (a forecourt), `house_mesh` (its door is at the back) and the City Pack's `SM_Bld_Shop_06` (a flat front with no floor).

- From the front-step bullet of 16.10: On the table this holds for `Building_House_01` to `_04` (a 0.60 m step before a 1.04 m floor), `Building_House_09` to `_011`, `Building_House_012` to `_015` and the three SIMPLE Town offices.

- From the table bullet of 16.10: from the GLBs of 18 Nov 2026; 57 entries, 6 more keys with a reason in `NO_STREET_DOOR`

- **Info (055 F, 062 A)**: what it does on the real table. The Town Pack houses (now eleven and the garage) stand 1.05 to 1.17 m over their base with their lowest window 0.70 m over their sill, so each sinks by its whole sill and none takes steps: `Preset_10` and the garage now sink like the rest, so the plinths of 16.8 are gone. The SIMPLE Town houses with a front step sink to that step and take the concrete steps for the rest; `Building_PoliceStation` (a reveal 0.53 m up, sill 0.40) is limited by its window and takes the smallest steps. No building leaves a rise out of reach (`leavesGap`). A stack still sinks by its largest ground sill (a block with a `Shop_05` sinks 0.361 m, the `OfficeOld` bases 0.915 m).

- From the lift bullet of 16.10: (0.35 m at most with today's pieces, `Door_01` in a `Corner_02` block)

- From the window-rule bullet of 16.10: (058's `WINDOW_SILL_M`, by `sillOf`; the lowest over the columns a piece covers)

- From the dressing bullet of 16.10: (058's escapes stand on mid, non-door columns, and their joints and ladder foot still pass `escapeCheck`)

- **Info (055 F, 062 B)**: what it does with today's pieces. `Door_01` in a `Corner_02` block is inside the window rule (a 0.347 m lift against apartment 02's window sill of 0.417 m, which allows 0.367 m), so it needs no band. The pieces that need one are the 3.17 to 3.30 m shops (`Shop_02`, `Shop_04`, and `Shop_03` on apartment 02) beside a high-sill piece: `Shop_02` may be lifted only 0.067 m under apartment 02's window sill, so beside a `Shop_05` its door would end 0.22 m under the walk. In the low band the same shop's door ends at most 0.021 m under the walk. On the default tile city 10 of 97 blocks are assembled again within a band; on `01-first-light` 30 of 111, `09-shrine-circuit` 27 of 122 and `64-the-whole-chain` 32 of 163. Layout, the lots, the furniture and the pieces above the ground row, in x and y, are as they were. In z they are as they were on the tile city (wall-aligned: the wall plane is on the lot's line whatever stands under it). On the ladder maps (back-aligned: every back face on one line and the frontmost face on the lot's front line) a ground piece of another depth moves the floors and the roof of the block back or forward by up to 0.4 m: 21 of the 30 banded blocks on `01-first-light`, 18 of 27 on `09-shrine-circuit` and 19 of 32 on `64-the-whole-chain`. The metrics now count the banded ground rows (`shopsGlassed` and `dressPieces`, before and after): default tile city 139 and 878 to 145 and 884, `01-first-light` 172 and 1046 to 179 and 1052, `09-shrine-circuit` 184 and 1117 to 189 and 1121, `64-the-whole-chain` 242 and 1467 to 247 and 1472; the verdicts of R1 to R13 are as they were.
- **Info (055 F, 062 B)**: considered and not chosen: sinking each column by its own sill with the floors above following. That breaks the terrace's level window rows and roof line by up to 0.35 m from column to column.
- **Info (055 F, 062 B)**: what 062 closed. The 22 keys with no sill each have one (a per-key depth, a typed value) or a reason in `NO_STREET_DOOR`; the stoop houses `Building_House_09` to `_011` read their door floor at 0.639 m, sink no further than their stoop's lowest step (0.213 m) and take the concrete steps for the rest; and a mixed-sill terrace block has every door at the walk. The plinths of 16.8 on `Preset_10` and the garage are gone.

### From fire-escapes.md (16.11)

- From the one-run bullet of 16.11: A piece's bound runs from its lowest leg to its highest rail, so stacking by bounds (3.802 and 3.609 m against a 3.0 m storey, ticket 052) left each platform higher than its floor by 0.80 m and then 1.41 m, left each flight short of the deck above, and left the top storey of a four-storey block with no platform.; the first landing 1.08 m to one side of them, 4.84 m across in all, centred on its 5 m column

- From the drop-ladder bullet of 16.11: The first piece's ladder starts 0.099 m above the piece's base, which put its foot 3 m in the air.

- From the pack's-piece bullet of 16.11: On today's City Pack no piece is scaled: the three apartment styles' storeys are all 3.0 m and each style's sill is the same on every storey, so every scale is 1.

- From the eligibility bullet of 16.11: eligibility is 052's:; Which column is unchanged.

- From the share bullet of 16.11: This replaces 052's escape chance (0.6, a coin toss per block), which left R7 at 0.43 to 0.50 on the tile city and 0.53 to 0.58 on the ladder, moving in ninths with nine blocks, and made 057 F try several hash keys in `blockLens` to keep every seed over the floor.

- From the how-many bullet of 16.11: If Josh wants today's density back, the share is one constant each (for example 0.55 and 0.45).

- From the which-blocks bullet of 16.11: (so no two neighbouring blocks of a run both have one, as before;

- From the chosen-first bullet of 16.11: How an escape is built (058) is unchanged.

- **Info (061)**: what changed on the ladder. Which blocks have an escape changes on the three maps, which is the intended change; R7 there is ceil(0.5 x qualifying) / qualifying (0.508 on 01-first-light) where chance gave 0.53 to 0.58. With and without its escape, a block differs only in its escape pieces and its escape column's pieces. The tile city's R7 is ceil(0.4 x qualifying) / qualifying (0.400 to 0.415 on the seeds checked), at its floor by construction, and `blockLens`' key (057 F) no longer matters to R7. Playtest snapshots are not affected: the harness replays the puzzle grid, not the 3D dressing.

- From the column-cap bullet of 16.11: The ticket's criteria 3 (a platform, so a piece, on every storey) and 7 (every other piece of dressing unchanged on the three maps) cannot both hold under 052's cap of `DRESS_PER_BAY_MAX` pieces per column; one piece more than 052's stacking by bounds used; So against the cap an escape counts the pieces 052 used

- **Info (058)**: what was measured, from `city-pack.glb` of 18 Nov 2026, in metres in the piece's own centred frame (y up, x along the road). The deck is the largest upward-facing horizontal surface; the flight is the run of tread faces (small, narrow and deep, above the deck), its foot the deck's surface and its top the highest vertex over the treads (the stringer's end, level with the deck above); the ladder is whatever stands past the deck's front edge; a hatch is the hole in the deck where a flight from below arrives. Every flight rises 3.000 m, the storey pitch of every apartment style.

| Piece | Deck top | Flight foot to top | Flight x, foot to top | Hatch x | Ladder foot | Rail top |
| --- | --- | --- | --- | --- | --- | --- |
| `SM_Bld_FireEscape_01` (top) | 0.609 | none | none | -0.939 | none | 1.492 |
| `SM_Bld_FireEscape_02` (middle) | 0.609 | 0.609 to 3.609 | 0.867 to -0.939 | -0.939 | none | 1.492 |
| `SM_Bld_FireEscape_03` (first landing) | 0.609 | 0.609 to 3.609 | -0.215 to -2.02 | none | 0.099 | 1.492 |

- **Info (058)**: the window sills, from the front-facing planes of each floor piece of at least `SILL_MIN_AREA_M2`, cut where they stop overlapping along x. A cut piece is window glass when no deeper piece stands over any of its x extent (a window's frame and reveal stand in front of its glass; the wall and a pilaster in front of both), so a shallower window beside a deeper one still counts. The sill of a storey is the lowest point of the glass in that 3 m band (`measureSills`), the lowest window opening of the front. Where each style's first piece then stands: a piece's deck is 0.609 m over its base, so the base is the floor's start plus the sill less 0.15 less 0.609.

| Style | Sill over the floor | Deck over the floor | First piece's base against its floor |
| --- | --- | --- | --- |
| apartment 01 | 0.756 | 0.606 | 0.003 m under |
| apartment 02 | 0.417 | 0.267 | 0.342 m under (its legs hang in front of the shop's top) |
| apartment 03 | 0.517 | 0.367 | 0.242 m under |

- From the check bullet of 16.11: It fails on the placement of ticket 052 (decks 0.80 and 1.41 m up, a storey missing), on a flight 0.1 m short, and on a ladder foot 0.5 m up.

- From the what-changed bullet of 16.11: Only the escape pieces and how they are drawn: the pieces of every other kind of dressing, `packTown`, the furniture and `evaluateCity` are as they were on the three maps, and so is every block that has an escape, so R7 is as it was (0.404 to 0.500 on the tile city against its floor of 0.4, 0.529 to 0.580 on the three maps against 0.5).

- **Default (058)**: Apartment_03 has a wide central window (1.72 m, sill 0.517) and two narrow side windows (0.49 m each, sill 0.854). The deck is under the lowest, the central window's sill, 0.15 m, which puts it 0.49 m under the side windows' sills: a person still climbs out of those, and the slab never crosses the bottom of the style's biggest window.

### From frontage-and-interiors.md (19 and 19.1)

- From the introduction of chapter 19: (ticket 057, sections A to G, in `facade.ts`, `tilecity.ts` and `terrace.ts`, and the old path's frontage measuring code (deleted in ticket 081 A1)); the drawing of the interiors is section D (`tilecity3d.ts`, `tileslots.ts` and `models3d.ts`), also built, and 19.8 records it.

- **Info (057)**: the draft of this chapter was written before sections A to G were built. Where the code differs from the draft, the line says "as built", and the code is the record.

- From the overlap bullet of 19.1: The first draft said 0.5 m, and it was raised after the 057 A review because the real City Pack shop pieces stand up to 0.557 m (`Shop_04`), 0.529 m (`Apartment_Door_01`) and 0.520 m (`Shop_06`) in front of their wall.

- **Info (057 A, as built; measured by 057 E on 19 Nov 2026 on the default city)**: with "wall" alignment every street-level wall plane stands exactly on the pavement's back edge (within 1e-15 m), so the walls rest on the edge and never behind it, and what overlaps the pavement is the pieces' own sills and signs: the furthest bound stands 0.557 m onto it, inside `OVERLAP_MAX_M`.
- **Info (057 A, as built)**: how `WALL_FRONT_M` was measured (`measureWallPlane`, run on the converted `city-pack.glb`).
  - The wall of a **ground** piece (a base, shop, door or corner) is the frontmost front-facing plane that reaches the ground (its lowest vertex at most `WALL_GROUND_Y_M` up), within `WALL_REACH_M` of the piece's front bound.
  - The wall of a **floor** piece is the largest front-facing plane within `WALL_FLOOR_REACH_M` of the bound, with no ground test: an office floor is set back on purpose.
  - A plane counts only from triangles below `WALL_BAND_M`, within `WALL_FACE_COS` of the face's direction, grouped when their centroids are within `WALL_PLANE_TOL_M`, and with an area of at least `WALL_MIN_AREA_M2`.
  - This replaced the draft's "largest front-facing planar area below 3.5 m", which picked the back wall of a shop's interior (1.0 to 2.8 m behind the front) or a sign band.

- From the wall-side bullet of 19.1: (-x, `OPEN_SIDE_MEASURED`; 063 E1 re-measured it there, it had been measured on the +x party wall)

- From the octagon bullet of 19.1: before any office style is aligned on "wall"; The rule of 19.1 finds two ground planes on its front, 0.174 m behind the bound (4.87 m2) and 0.595 m behind it (5.01 m2), and picks the bigger, which stands 0.42 m further back; the 057 A review took the 0.174 m plane for the building's face.

- From the explicit-alignment bullet of 19.1: taken at the merge of 057 G

### From frontage-and-interiors.md (19.2)

- From the flush bullet of 19.2: 055 B's inset function and its 2.5 m cap are gone.

- **Info (057 B, as built; measured by 057 E on 19 Nov 2026)**: passages are not the rare third choice the draft pictured, because most row lengths fall in the packer's dead band (N unscaled columns span only 5.0 N to about 5.28 N metres) and a seam needs a gap of 0.1 m or less. On the default city, 52 runs close as 50 passages and 2 overshoots (0.415 m at most), with no seam, no slit and no wide gap; seeds 1 to 5 at 3 x 3 close 44 to 52 runs as 44 to 50 passages and 2 to 4 overshoots; 6 x 4, seed 1 closes 138 runs as 130 passages and 8 overshoots. So nearly every row's end is a gate onto the interior.

- From the far-gap bullet of 19.2: retires 056 A's temporary far-gap floors

- From the gate bullet of 19.2: As built, not as drafted:

### From block-interiors.md and alleys-and-parks.md (19.4 and 19.6)

- From the interior bullet of 19.4: The draft said `TileRole` would gain these; as built they are kept apart, because

- From the court bullet of 19.4: Measured: none on the default city and on four of the five seeds at 3 x 3; one block on seed 5.

- From the fill bullet of 19.4: The draft named `Sidewalk_Panel_01` for the paving, but that piece has a kerb on one edge (a 0.23 m drop to the road level every 5 m), which would cross an apron; 057 D drew `Sidewalk_Panel_02`, the flat slab with two inset service plates, and 063 D replaced it with the plain `Sidewalk_01` (19.8).

- **Info (057 C, as built)**: the drive is two cells, not the drafted one. 056's parking lot is a fixed 10 m opening laid by `terraceBlockRows` in `town.ts`, which 057 may not touch, so the drive takes the whole opening. One cell needs a `parkW_m` option in `town.ts` (a re-cut). So the frontage does not gain the drafted 45 m: the nine 10 m lots of 056 are nine 10 m drives, and the frontage cost of the parking lots stays about 90 m.
- **Info (057 C and G, measured by 057 E on 19 Nov 2026)**: what the interiors are made of on the default city (3 x 3, seed 1), in m2 of block area (28,675 m2 in all). The remaining 8,225 m2 (28.7%) is the terrace band: buildings, plazas and frontage lots.

| Interior role | m2 | Share of interior |
| --- | --- | --- |
| `apron` | 11,225 | 54.9% |
| `court` | 1,650 | 8.1% |
| `drive` | 550 | 2.7% |
| `green` | 2,725 | 13.3% |
| `greenPath` | 1,375 | 6.7% |
| `parkEdge` | 1,800 | 8.8% |
| `alley` | 1,125 | 5.5% |
| All | 20,450 | 100% (71.3% of block area) |

- **Info (057 C, measured by 057 E)**: over seeds 1 to 5 at 3 x 3 and 6 x 4 seed 1, the interior is 70.7% to 73.1% of block area, grass is 12.0% to 14.5% of the interior (8.5% to 10.5% of block area), and pavement in all its roles is the rest. At most 0.28% of any block is unfilled, in squares of 0.25 m at most.

- From the alley bullet of 19.6: (056 counts them on the block the alley splits)

- From the alley bullet of 19.6, rear doors: and fire escapes are 058's

- **Info (057 G, measured by 057 E on 19 Nov 2026)**: the default city has five alleys and two parks, both half-block (it has no small block: its narrowest, 30 x 45 m, has a side over 40 m); seeds 1 to 5 at 3 x 3 have 4 to 7 alleys and 2 parks; 6 x 4, seed 1 has 13 alleys and 4 parks, with 32 bins in all.

### From interior-drawing.md (19.8)

The drawing walkthrough: what each kind of surface is drawn with.

  - **Grass:** `SM_Env_Grass_01` cells, turned a quarter at a time by hash so a lawn is not one tile repeated, with the origin 0.11 m down so the blades stand 0.01 m over the walk; or flat quads in `lighting.ts`'s `surfaces.grass` colour.
  - **Pavement** (the apron, the paths, the park edge, and since 063 D the ring-2 strip `APRON_STRIP`): `SM_Env_Sidewalk_01`, the plain flat slab, with its origin 0.01 m down so its top is the walk's; or flat quads in the slab's colour (`PAVING_SLAB_COLOUR`). **The passage floors** are the same slab, one whole 5 m cell at a time laid from the floor's low corner, and a part cell (under 5 m) is a code quad in the slab's own colour, `PAVING_SLAB_COLOUR` (`#8c8987`, sampled from the pack's atlas at the slab's walking faces by a test), so a floor drawn in code reads the same as one laid from the slab; nothing is scaled. A passage is 1.0 to 5.3 m wide, so nearly every real floor is a part cell. The code quad is not a light-rig surface key, so it takes the day and night light as the textured slab does.
  - **The court:** `SM_Env_Road_Bare_01` (the bare road) under the cells, with `SM_Env_Road_ParkingLines_01` over each row of stalls, lifted by `STALL_LINES_LIFT_M` so the two do not fight for the pixel; the aisle is bare road. With no lines piece the dividers are drawn in code. **The drive:** the kerb cut and lot surface of 056, which the street layer already draws, so it is not drawn twice; the drive's two cells are paved (below).
  - **The alley lane:** `SM_Env_Road_Bare_01`, or street-coloured quads, except its two mouth cells in ring 1, which are paved (below). **The gates** (19.2) are code-drawn.
  - **Props** (optional dressing, pack pieces only): the trees and the bench of the greens and the bins of the alleys (`SM_Prop_Trashbin_01` and `_02`), each chosen by a hash of the city's seed and its point, so the same city gives the same props. A prop whose piece is missing, or lost to the draw-call cap, is not drawn.
  - **Pad cells** beside an alley court's aisle are apron cells and are drawn as apron.

- From the interior-paving bullet of 19.8: (5 x 0.034 x 5 m, opaque, only the walk's slab and joint colours); The strip and the floors were code-drawn flat quads in `PAVEMENT` colour, which read near-white in the sun, paler than the apron beyond; they are now the same tiles as the apron, with the code quad as their fallback only.

- From the inlets bullet of 19.8: The kerb's return along each side of the opening (063 F) is not drawn yet.

- From the kerb-line bullet of 19.8: (`Sidewalk_Dip_01`, as before)

- From the returns bullet of 19.8: (measured: a ramp, see chapter 10); so it is a 0.07 m ridge on the pavement and the 0.30 m kerb where it meets the road

- From the draw-calls bullet of 19.8: the main session reports 12 draw calls on the default city, which 057 E did not re-measure

- From the sheet bullet of 19.8: The two new pieces made the wide sheet five columns at a 14 m pitch (it was four), and the tall sheet's row pitch went from 12 m to 14 m.

### Ticket references cut from the domains (ticket 080 B2, third batch)

Each is a question number or a ticket reference that stood in a tag or a sentence of the old text; the tag now names the ticket only, or the row in `docs/city-style/decisions.md`.

- From 16.5: the tags Default (052, 058) (fire escapes), Info (054) (the base atlas, now a plain sentence), and, in the roofs bullet, the reference "(H3, H3b, H1c; Josh, 21 Nov 2026, Q26: "Yes, all four")" (its row is D-052a).
- From 16.10: the tags Decided (055 F, ...) and Decided (055 F, 062, ...) (rows D-055h and D-055i), Default (055 F, Q10) to Default (055 F, Q13), Default (055 F, 062 A), Default (055 F, 062 B), Info (055 F) and Info (055 F, 062 A) (the plain sentences), and Open (waits for Josh's eye on ticket 062 criterion 11).
- From 16.11: the tags Decided (058, ...) and Decided (061, ...) (rows D-058b and D-061a), Default (058, 061), Default (058, a change to a 052 default), Info (058), Info (061) and Open (waits for Josh's eye on the street views of ticket 058 criterion 9).
- From chapter 19: the tags Info (057), Info (057 A), Info (057 A, as built), Info (057 B, as built), Info (057 B and C, as built), Info (057 C, as built), Info (057 C and G, measured by 057 E on 19 Nov 2026), Info (057 G, as built), Info (057 G, measured by 057 E on 19 Nov 2026), Info (070 L1), Info (057 D), Default (057 Q4), Default (057 Q3), Default (057 Q1), Default (057 Q6, as built by 057 D), Default (057 A), Default (057 B), Default (057 C), Default (057 D), Default (057 G), Default (057 D, changed by 063 D), Default (057 D, changed by 063 H) and Default (057 D, changed by 063 F); and, in the parks and whole-park lines, the references (D1b criterion 13; Josh, 20 Nov 2026, "yes, yes") and (D1b criterion 12; Josh, 20 Nov 2026, "yes") (the rows D-057p and D-057s hold the old lines).
