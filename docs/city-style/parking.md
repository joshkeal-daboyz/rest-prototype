# City style: Parking

## 18. Parking

How many parking spaces the tile city (`city=tiles`) gives a home and a shop, which go on the street and which in lots, and the caps. The tile city is made by the pipeline, stage by stage (ticket 070; `docs/city-grammar.md` and `tickets/070-city-pipeline.md` give the stages): stage 3's lots and units are in `src/city/mass/`, stage 4's parking band, kerb bays and build-outs are in `src/city/edge/`, and `plan3d.ts` draws them. The checks P1 and P3 to P6 are stage 4's (`src/city/edge/check.ts`) and P2 is stage 3's (`src/city/mass/check.ts`). `tilecity.ts`, `parkmetrics.ts` and `tilecity3d.ts` are the old path's (`city=tiles-old`, until L2; ticket 056 A, B and C wrote them), and the measured tables of 18.8 are that path's numbers. Nothing on the ladder maps changes: the ladder's town (chapter 4) keeps its hash lots, and `town.ts` gained only the option that switches them off for the tile city.

- **Info (056)**: chapter 17 (ticket 055 D) does not exist yet. When it does, its parking paragraph defers to this chapter and says nothing that disagrees with it, and 055 D's check T6 ("parking on every block") is satisfied by P1 and P2 of 18.8.


### 18.1 Who parks where

- **Decided (056, Josh 18 Nov 2026, after looking at the tile city of 055 A to C)**: "Roads look good, parking spaces are overwhelming. Too many parking spaces. We should create rules in the style sheet that indicate how much parking should be available on the streets vs parking lots for residential and business style units."
- **Default (056)**: shoppers park at the kerb, residents park off the street.
  - A **shop** gets `PARK_PER_SHOP` (one third) short-stay kerbside bays, on its own block's sides.
  - A **home** gets `PARK_PER_HOME` (0.075) stalls in a parking lot, in its own block or across one street. 056 had 0.15; Josh's ruling of 19 Nov 2026, asked whether to approve all four rulings as recommended or keep 0.15, was: "Yes, all four".
  - Residents never count on kerb bays, and shoppers never count on lot stalls.
- **Info (056)**: these are drawn spaces, about half of what a real dense terraced core provides. A real core has about 0.3 spaces per home, and about 1 per 40 m2 of shop, which here is about 0.7 per 31 m2 shop bay. The camera reads every drawn stall at full size, and Josh found the full count overwhelming.
- **Info (056, Josh 18 Nov 2026, "I approve one through three")**: Josh approved ticket 056 with its six open questions at their defaults, so each default below stands as written: the ratios of 18.1 (the alternative, double both, is not taken); build-outs in the parking band (18.5); a space record for every lot stall as well as every bay (`TileCity.lotStalls`); no residents at the kerb; and a home of two column-floors (18.2).
- **Default (056, 057 C)**: from 057 on, a block's lots are interior courts in place of frontage lots (19.4), where each court fits. The quota of 18.4 and every check stay, and chapter 19 takes over the placement. This replaces 056 Q3's answer (rear courts: no), which Josh approved with the others at their defaults before he gave the 057 rulings.


### 18.2 Units

- **Default (056)**: units are counted per block from the nominal terrace lots of its finished rows (after the parking lots took their frontage), so the layout can place parking before anything is packed. `TileBlock.units` holds them.
  - Columns are the 5 m cells of the lattice (grammar rule 5), counted by stage 3 from the mass's cells. The old path counted the lots' 5.2 m bays.
  - Shops are the columns minus one door column per terrace lot.
  - Homes are floor(columns x `UNIT_FLOORS_NOMINAL` / `HOME_COLUMN_FLOORS`): a home is two column-floors of one 5 m cell each (grammar rule 5: a column is a 5.0 m cell, so 2 x 5.0 m x 5.0 m = 50 m2), and a block's upper floors are nominally 3 over the base. The old path's figure was 2 x 5.2 m x 6 m, about 62 m2 (`city=tiles-old`, until L2d).
  - A shop is one ground bay that is a shop or a shop corner (the `groundRow` kinds of `citymetrics.ts`); the two-column shop counts once.
- **Default (056)**: the layout's numbers stay within 10% of the packed plan's. The test packs the fixture stacks and compares the city-wide shop count and the homes (column-floors over `HOME_COLUMN_FLOORS`) with the layout's sums, on the default city and seeds 1 to 10 at 3 x 3.
- **Info (056, measured 18 Nov 2026 on the merged layout; the test, not this line, is the record)**: the default city packs 95 stacks of 255 columns and 775 column-floors, 3.04 floors over the base on average. The layout counts 255 columns, 160 shops (the plan has 152, 5% under) and 379 homes (the plan has 387.5, 2% over). Per block that is 15 to 21 shops and 34 to 49 homes. Seeds 1 to 10 at 3 x 3 have 255 to 285 columns, 160 to 180 shops and 379 to 424 homes.


### 18.3 Kerbside bays (shoppers)

- **Default (056)**: a block's quota is `max(BAY_TILES_PER_BLOCK_MIN, round(shops x PARK_PER_SHOP / BAYS_PER_PARKING_TILE))` `ParkingLines_01` tiles, each of `BAYS_PER_PARKING_TILE` bays (10 m of kerb). That is one to three tiles per block, three to nine bays.
- **Default (056)**: where the bays go.
  - They go on the block's own sides that have a parking band: the hash side of a street (and, before 063 B, both sides of an avenue: the tile city has no avenue now).
  - Avenue sides fill first, then longer sides, with ties by id. With no avenue (063 B) that is the longer sides first.
  - The fill is round-robin: one run per side before any side takes a second.
  - A run is centred on its side's free stretch, offset by hash.
- **Default (056)**: run and gap limits.
  - A run is at most `BAY_RUN_TILES_MAX` tiles (20 m, 6 bays).
  - Two runs on one side have at least `KERB_GAP_MIN_M` of kerb without bays between them.
  - The `BAY_JUNCTION_CLEAR` cell next to each crossing never holds a bay, and neither does the cell in front of a kerb cut.
- **Default (056)**: caps.
  - A side's bay length is at most `KERB_BAY_SHARE_MAX` of its kerb: the first field for an avenue, the second for a street. Every street is a street since 063 B, so the first field is unused.
  - The city has at most `BAYS_PER_100M_MAX` bays per 100 m of block kerb.
- **Default (056)**: the outer side of an edge street faces yard. It holds no bay, and its parking band is plain.


### 18.4 Lots (residents)

- **Default (056)**: a block wants `clamp(round(homes x PARK_PER_HOME / LOT_STALLS), 1, LOTS_PER_BLOCK_MAX)` parking lots. `LOT_STALLS` is twice `BAYS_PER_PARKING_TILE`: a lot is two `ParkingLines_01` tiles. From 057 C each lot is the mouth of a residents' court inside the block (19.4), and an alley block's own court answers one of its lots (19.6).
- **Default (056)**: every lot is placed by demand, through the lot runs of 055 B. The terrace fill's hash lot (`PARKING_ONE_IN`, chapter 4) is switched off in the tile city (`parkByHash` false in the terrace options; the ladder's town keeps it).
- **Default (056, 057 C)**: a lot's 10 m opening in the row stays on the tile grid with a kerb cut (055 B), and the cut's parking cells stay plain asphalt so cars can turn in. From 057 C the opening is the court's drive, and the lot's stalls are in the court behind it (19.4); a lot whose court does not fit keeps 056's 10 x 10 m frontage lot. A run shorter than `TILE_PARK_MIN_RUN_M` cannot hold a lot.
- **Default (056, 057 C)**: every lot stall is a record, so a later cars ticket has every space: `TileCity.lotStalls` holds `LOT_STALLS` per lot (from 057 C, per court) in the same shape as a kerb bay.
- **Info (057 C)**: the court's drive is as wide as 056's lot, so the frontage that parking lots cost stays about 90 m of the 1,800 m; the saving of about 45 m that the 057 draft counted would need a one-cell drive (19.4).


### 18.5 The parking band without bays

- **Default (056)**: a parking-band cell that holds no bay and is not in front of a kerb cut becomes a **build-out**: pavement level, a sidewalk tile (the role `buildout`, the one plain straight `Straight_02` the pavement uses, 063 A), with a street tree on every `BUILDOUT_TREE_EVERY`th build-out cell along a stretch, which is one every 10 m.
  - The kerb follows the build-out's edge.
  - A build-out next to a crossing is the classic corner bulb-out, and it shortens the crossing.
  - No tree stands on a cell next to a crossing.
  - In front of a kerb cut the cell stays `parkingPlain`, and so does every cell on an edge street's outer side.
- **Info (056)**: so every parking-band cell is exactly one of three things: half of a `ParkingLines_01` tile, `parkingPlain` (in front of a kerb cut, or on an outer side), or a build-out. Check P5 measures it. Pole slots do not move.


### 18.6 Too little, too much

- **Default (056)**: too little room for lots. This is a block where no run of at least `TILE_PARK_MIN_RUN_M` can take a lot.
  - Its lot quota moves to the neighbour across its longest street, up to that neighbour's `LOTS_PER_BLOCK_MAX`.
  - If no neighbour can take it, the shortfall is recorded on the block (`TileBlock.parkingShort`).
  - At most one block in nine (`ceil(blocks / 9)`) may be short.
- **Default (056)**: too little room for bays. This is a block with no parking side, or one where every side is at its cap.
  - Its shoppers' bays go in the parking band across its longest street, and are recorded as serving it (`ParkingBay.serves`).
  - Each run there still obeys 18.3's limits.
- **Default (056)**: too much. Bays past a block's quota, or past a cap, are never laid, and their cells are build-outs. A block never holds more than `LOTS_PER_BLOCK_MAX` lots, its own and borrowed together.


### 18.7 The tile city's R6 floor

- **Decided (056, Josh 18 Nov 2026, "Lower it to 0.45 (Recommended)")**: R6 (the share of shop bays with a sign, 16.8) has a floor of `TILE_CITY_R6_MIN` on the tile city, as R7 has its own. The ladder's `CITY_CHECK` and `citymetrics.ts` are unchanged (R6 stays 0.5 there).
- **Info (056 B)**: R6 sits at 0.49 to 0.55 on the tile city whatever the layout, by the dressing's own sign chance. The floor lets a later layout change pass without a re-tune, so the lot-run salt that 056 A had tuned to hold R6 at 0.5 is gone.

