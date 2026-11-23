# City style: Parking

standard: yes
Scope: how many parking spaces the tile city gives a home and a shop, which go on the street and which in lots, and the caps.
Read by: streetscape, planner
Depends on: `docs/city-style/numbers.md` (the constants), `docs/city-style/block-interiors.md` and `docs/city-style/alleys-and-parks.md` (courts, 19.4 and 19.6), `docs/city-style/evaluation.md` (the checks P1 to P6, 18.8)

## Rules

## 18. Parking

The tile city (`city=tiles`) is made by the pipeline, stage by stage (`docs/city-grammar.md` and `tickets/070-city-pipeline.md` give the stages). Stage 3's lots and units are in `src/city/mass/`, stage 4's parking band, kerb bays and build-outs are in `src/city/edge/`, and `plan3d.ts` draws them. The checks P1 and P3 to P6 are stage 4's (`src/city/edge/check.ts`) and P2 is stage 3's (`src/city/mass/check.ts`). `tilecity.ts`, `parkmetrics.ts` and `tilecity3d.ts` are the old path's (`city=tiles-old`, until L2), and the measured tables of 18.8 are that path's numbers. The ladder's town (chapter 4) keeps its hash lots, and `town.ts` has only the option that switches them off for the tile city.


### 18.1 Who parks where

- **Rule [D-056b]**: the guide fixes how much parking is on the streets and how much is in parking lots, for residential and for business units (18.1 to 18.6).
- **Rule [D-056d]**: shoppers park at the kerb, residents park off the street. A **shop** gets `PARK_PER_SHOP` (one third) short-stay kerbside bays, on its own block's sides. Residents never count on kerb bays, and shoppers never count on lot stalls.
- **Rule [D-056g]**: a **home** gets `PARK_PER_HOME` (0.075) stalls in a parking lot, in its own block or across one street.
- **Default [D-056e]**: a block's lots are interior courts in place of frontage lots (19.4), where each court fits. The quota of 18.4 and every check stay, and chapter 19 takes over the placement.


### 18.2 Units

- **Default (056)**: units are counted per block from the nominal terrace lots of its finished rows (after the parking lots took their frontage), so the layout can place parking before anything is packed. `TileBlock.units` holds them.
  - Columns are the 5 m cells of the lattice (grammar rule 5), counted by stage 3 from the mass's cells.
  - Shops are the columns minus one door column per terrace lot.
  - Homes are floor(columns x `UNIT_FLOORS_NOMINAL` / `HOME_COLUMN_FLOORS`), where a block's upper floors are nominally 3 over the base.
  - A shop is one ground bay that is a shop or a shop corner (the `groundRow` kinds of `citymetrics.ts`); the two-column shop counts once.
- **Rule [D-056d]**: a home is two column-floors of one 5 m cell each (so 2 x 5.0 m x 5.0 m = 50 m2).
- **Default (056)**: the layout's numbers stay within 10% of the packed plan's. A test compares them on the default city and seeds 1 to 10 at 3 x 3.


### 18.3 Kerbside bays (shoppers)

- **Default (056)**: a block's quota is `max(BAY_TILES_PER_BLOCK_MIN, round(shops x PARK_PER_SHOP / BAYS_PER_PARKING_TILE))` `ParkingLines_01` tiles, each of `BAYS_PER_PARKING_TILE` bays (10 m of kerb). That is one to three tiles per block, three to nine bays.
- **Default (056)**: where the bays go.
  - They go on the block's own sides that have a parking band: the hash side of a street.
  - Longer sides fill first, with ties by id; the sides of an avenue would fill before them, and the tile city has no avenue.
  - The fill is round-robin: one run per side before any side takes a second.
  - A run is centred on its side's free stretch, offset by hash.
- **Default (056)**: run and gap limits.
  - A run is at most `BAY_RUN_TILES_MAX` tiles (20 m, 6 bays).
  - Two runs on one side have at least `KERB_GAP_MIN_M` of kerb without bays between them.
  - The `BAY_JUNCTION_CLEAR` cell next to each crossing never holds a bay, and neither does the cell in front of a kerb cut.
- **Default (056)**: caps.
  - A side's bay length is at most `KERB_BAY_SHARE_MAX` of its kerb: the first field for an avenue, the second for a street. The tile city has only streets, so the first field is unused.
  - The city has at most `BAYS_PER_100M_MAX` bays per 100 m of block kerb.
- **Default (056)**: the outer side of an edge street faces yard. It holds no bay, and its parking band is plain.


### 18.4 Lots (residents)

- **Default (056)**: a block wants `clamp(round(homes x PARK_PER_HOME / LOT_STALLS), 1, LOTS_PER_BLOCK_MAX)` parking lots. `LOT_STALLS` is twice `BAYS_PER_PARKING_TILE`: a lot is two `ParkingLines_01` tiles. Each lot is the mouth of a residents' court inside the block (19.4), and an alley block's own court answers one of its lots (19.6).
- **Default (056)**: every lot is placed by demand, through the lot runs of 055 B. The terrace fill's hash lot (`PARKING_ONE_IN`, chapter 4) is switched off in the tile city (`parkByHash` false in the terrace options; the ladder's town keeps it).
- **Default (056)**: a lot's 10 m opening in the row stays on the tile grid with a kerb cut, and the cut's parking cells stay plain asphalt so cars can turn in. The opening is the court's drive, and the lot's stalls are in the court behind it (19.4); a lot whose court does not fit is a 10 x 10 m frontage lot. A run shorter than `TILE_PARK_MIN_RUN_M` cannot hold a lot.
- **Rule [D-056d]**: every lot stall is a record, so a later cars ticket has every space: `TileCity.lotStalls` holds `LOT_STALLS` per lot (per court) in the same shape as a kerb bay.


### 18.5 The parking band without bays

- **Rule [D-056d]**: a parking-band cell that holds no bay and is not in front of a kerb cut becomes a **build-out**: pavement level, a sidewalk tile (the role `buildout`, the one plain straight `Straight_02` the pavement uses), with a street tree on every `BUILDOUT_TREE_EVERY`th build-out cell along a stretch, which is one every 10 m.
  - The kerb follows the build-out's edge.
  - A build-out next to a crossing is the classic corner bulb-out, and it shortens the crossing.
  - No tree stands on a cell next to a crossing.
  - In front of a kerb cut the cell stays `parkingPlain`, and so does every cell on an edge street's outer side.
- Every parking-band cell is exactly one of three things: half of a `ParkingLines_01` tile, `parkingPlain` (in front of a kerb cut, or on an outer side), or a build-out. Check P5 measures it. Pole slots do not move.


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

- **Rule [D-056f]**: R6 (the share of shop bays with a sign, 16.8) has a floor of `TILE_CITY_R6_MIN` on the tile city, as R7 has its own. The ladder's `CITY_CHECK` and `citymetrics.ts` are unchanged (R6 stays 0.5 there).

## Open questions

- **Open**: the guide has no chapter 17. When it is written, its parking paragraph defers to this chapter and says nothing that disagrees with it, and the check T6 (parking on every block) is satisfied by P1 and P2 of 18.8 [D-056a]. Waits for: the ticket that writes chapter 17.
