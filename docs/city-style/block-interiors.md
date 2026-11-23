# City style: Block interiors

standard: yes
Scope: what fills the inside of every block: the apron, the residents' court and its drive, the green, and what the fill is made of.
Read by: landscape, planner
Depends on: `docs/city-style/numbers.md` (the constants), `docs/city-style/frontage-and-interiors.md` (19 and 19.2, the rings and the gate), `docs/city-style/alleys-and-parks.md` (19.6), `docs/city-style/interior-drawing.md` (19.8, what is drawn), `docs/city-style/parking.md` (18.1 and 18.4, the court's stalls), `docs/city-style/evaluation.md` (what the interiors are made of)

## Rules

### 19.4 The block interior

- **Rule [D-057l]**: grass and pavement fill the blank areas inside a block.
- **Default (057)**: nothing inside a block is left unfilled. `frontage.ts` rasterises each block at `VOID_RASTER_M` (0.25 m); at most `VOID_MAX_SHARE` of it may be unfilled, in no square over `VOID_PATCH_MAX_M` on a side (check G3).

The interior is laid on the 5 m grid (`TILE_M`). Ring 1, the outer band of cells, is the terraces' and is not an interior cell. The cells inside it are `TileCity.interior`, each with a role of `InteriorRole`: `apron`, `court`, `drive`, `green`, `greenPath`, and from 19.6 `alley` and `parkEdge`. The roles are kept apart from `TileRole`, because a court's drive and its first row of stalls are also the `lotSurface` cells of 056 and `tileslots.ts`'s table is exhaustive over `TileRole`.

- **Default (057)**: the interior is, in this order:
  1. **The rear apron (pavement).** `APRON_CELLS` rings (1) of whole cells, inside the buildings' two rings. This is a continuous paved apron round the inside of the block, joining the court drive and the court. On the pipeline ring 2 is buildings (grammar rule 5), so the old path's ragged ring-2 strip (`variant` `APRON_STRIP`) and its gated passages are retired there.
  2. **The residents' court**, which takes over the lots of 18.4, on the apron.
  3. **The green** is every other interior cell: grass.
     - A path one cell wide (`greenPath`) runs along the green's longer axis, and cross paths cut it wherever a row of green would run past `GREEN_SPAN_MAX_CELLS`, so the green never stretches further than that without a path.
     - Benches beside each path and trees on one green cell in `GREEN_TREE_ONE_IN` (by hash, at a cell's middle, a bench `BENCH_FROM_PATH_M` from its path's edge) are optional dressing, in `TileCity.greenProps`. Nothing else (no playground, fountain or hedge) is required.
  4. **Plazas** (the corner plazas of the street layer) stay as they are, on the street.
- **Default (057)**: the residents' court. A block's lot quota (18.4) becomes interior courts in place of frontage lots.
  - A court unit is `COURT_CELLS` (2 x 3 cells, 10 m wide and 15 m deep): a row of three stalls (a `ParkingLines_01` tile), a 5 m aisle (`COURT_AISLE`) and a second row of stalls (`COURT_STALLS`), six stalls (`LOT_STALLS`). The aisle's two ends open on the apron beside the court, so a car reaches it over pavement.
  - It is reached by a **drive**: `DRIVE_CELLS` cells (2, 10 m) through the terrace row, with the kerb cut of 18.4 on the street and plain parking cells in front, laid by demand as 18.4 lays them.
  - `TileCity.courts` holds each court's cells, and `TileCity.lotStalls` lists the courts' stalls.
  - A lot whose court would leave its block part or cross another keeps the frontage lot of 18.4, and its block is in `TileCity.frontLots`. At most `CITY_FRONT_LOT_BLOCKS_MAX` (one in nine) of a city's blocks may be there.
- **Default [D-057m]**: the old path (`city=tiles-old`) keeps 0.15 stalls per home. On the pipeline `PARK_PER_HOME` is 0.075 (18.1), with six stalls per court and one or two courts per block.
- **Default [D-057n]**: the apron is `APRON_CELLS` 1 deep, so the interiors are mostly pavement. 0 would drop the apron to the strip alone and give about half the interior to grass: one constant.
- **Default (057)**: the fill uses the City Pack and code only, each with a code-drawn fallback: `SM_Env_Grass_01` for the greens, `SM_Env_Sidewalk_01` for the apron, paths and park edges, `SM_Env_Tree_01` to `_03` and `SM_Prop_ParkBench_01` for the dressing. No Town Pack piece is used: the passage gate is code-drawn (19.2).
- **Default (057)**: the drive is two cells (`DRIVE_CELLS`), the whole of the fixed 10 m parking-lot opening that `terraceBlockRows` in `town.ts` lays; one cell would need a `parkW_m` option there (a re-cut). So the frontage cost of the parking lots stays about 90 m.
- **Default (057)**: every interior role is drawn (19.8).

## Open questions

None here.
