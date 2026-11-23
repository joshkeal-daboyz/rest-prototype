# City style: Scale and lots

standard: yes
Scope: the one scale of the town, and how lots, terrace rows and runs are laid and kept clear.
Read by: buildings, planner
Depends on: `docs/city-style/numbers.md` (the constants), `docs/city-style/streets-and-blocks.md` (the pinwheel), `docs/city-style/buildings.md` (stacks and corner blocks)

## Rules

## 2. Scale

- **Default (041)**: one scale, `WORLD_PER_METRE`, for every building. One map unit is about 5.6 m. The constant is defined in both `town.ts` and `models.ts`, and the drift test keeps the two equal.
- **Rule [D-041c]**: no building model is ever shrunk or grown to fit a lot. A model is its true size in metres times `WORLD_PER_METRE`. Lots are sized to buildings, not the reverse.
- **Default (041)**: poles and lamp posts are the exception. They are fitted to `POLE_HEIGHT`, because the wires attach there (about 9 m at building scale).
- The circuit is dense, so inside the ring buildings are sparse and low. Most of the city is in the blocks round it.


## 4. Lots

- **Default (041)**: a lot is one of four types in `LOT_TYPES` (frontage x depth x height cap, metres; see Numbers), exactly that size times `WORLD_PER_METRE`. Its front edge lies on its pavement's outer edge plus `SETBACK`, and its yaw turns its front to its road.
- **Default (041)**: frontage fill goes along every road side in a fixed order: the ring road's inside, then the outer blocks (pinwheel), then the circuit's streets in file order (a line's road has frontage on its far side only), then decor. At each step the lot type is chosen by `stableHash` of the road side and slot index from the types allowed there. If no type fits, the cursor moves on by `FILL_STEP`.
- **Default (041)**: the types allowed on a ring or grid side are those whose depth, plus the `small` depth and `LOT_GAP`, fits the block's inside. `tall` lots are outside the ring only, and are never on circuit streets.
- **Default (041)**: a lot is kept only if it clears these.
  - Every road, pad, pavement and node square.
  - Every other lot, by `LOT_GAP`, and every place.
  - Every wire span, by `WIRE_CLEAR` horizontally.
  - The occlusion rule. For every wire point, node top (`NODE_TOP_Y`) and lamp head (`LAMP_HEAD_Y`) north of the lot, the distance must be at least (the lot's height cap minus the point's height) times `OCCLUDE_SLOPE`. `OCCLUDE_SLOPE` follows the camera (`ELEVATION`, `FOV_DEG`), and `town.test.ts` pins it to `camera.ts`.
- **Default (041)**: a model's lot type is computed from its bounds by `lotTypeOf` (the first type in `small`, `house`, `large`, `tall` order that holds its front-turned footprint and height). It is never hand-set. A model that fits no type is not used.
- Placeholder buildings (no model for a type, or no `assets/private/`) are boxes with storeys of `STOREY_M`, a roof and one of four dark tints, never over the lot's cap. Nothing in them is lit. They follow the same neighbour rule as models.
- **Default (051)**: the rows of the outer blocks are terraces. This replaces the outer-block step of frontage fill above: the pinwheel order, each row starting at its own corner, and the bands stay, but every side's band is `TERRACE_DEPTH_M`, and a row runs on to the next row's corner block with no gap on the street (short of it by under one bay at most; the packer, `terrace.ts`, closes the rest). A row is a run of lots that abut (gap 0). Each lot is `bays` x `TERRACE_BAY_M` wide, `bays` in `TERRACE_BAYS` by `stableHash` of its key, and `TERRACE_DEPTH_M` deep. It is type `large` and takes the highest of `TERRACE_CAPS_M` (5, 4 and 3 storeys) that clears the rules above at that cap. The ring road's inside, the circuit's streets and decor are filled as before.
- A terrace lot's placeholder fills its whole lot (no 0.8 or 0.9 footprint), so the boxes of a run touch. With the City Pack absent (CI, a fresh checkout) the terrace is those boxes. With the City Pack present each run's boxes give way to its packed stacks, one `stack:<style>` group per block, and no whole model ever stands on a terrace lot (`pickBuildings` does not see one, so the terrace blocks are not among `large`'s families). Each apartment style is 20% to 50% of the terrace blocks.
- The packer, the dressing of the open lots and the alleys, and the checklist a generated street is judged by are in chapter 16 (16.2 and 16.8).


### 16.2 Lots and runs

- **Default (051)**: a row becomes runs. A run starts at a corner (the row's start, when a cross street meets it), after a plaza, or after a parking lot. It ends at the next row's corner block, at a plaza, at a parking lot, or where the next slot clears no height cap, and the next run then starts `FILL_STEP` on. The details of the pinwheel and the corner block are chapter 4 and chapter 7.
- **Default (051)**: a run is cut into nominal lots first (chapter 4). The nominal lots fix only the heights and the extent. The packer replaces them.
- **Default (051)**: open lots are part of the grammar, not leftovers. A run of at least `PARKING_MIN_RUN_BAYS` nominal bays has one parking lot (`PARKING_W_M` by `PARKING_D_M`) about its middle where `stableHash` of the run id modulo `PARKING_ONE_IN` is 0; the run ends at it and a new one starts after it. One outer block in `PLAZA_ONE_IN` (by `stableHash` of its id) has a plaza (`PLAZA_W_M` square) at one row's start in place of that row's corner block. A plaza is recorded against the run that starts after it, a parking lot against the run it ends, so one run can carry one of each. Open lots are in `Town.openLots` and never in `Town.lots`, so no building, drop or pick uses them. They clear the rules of chapter 4 at height 0.
- **Default (051)**: blocks are packed flush. The packer lays each block from the run's start, as wide as its columns, and the next starts where the last ends: blocks abut exactly. No model is scaled to close a gap.
- **Default (051)**: the far end of a run closes by one rule: seam, or alley, never a slit. A gap up to `TERRACE_SEAM_M` is a seam; a gap from `ALLEY_MIN_M` to `ALLEY_MAX_M` is an alley between blocks (dressed in chapter 16); a gap between the two is a slit and is never chosen. The packer first looks for a choice of styles and column counts that leaves a seam, then aims for an alley; only if neither is possible does it take the smallest gap above `ALLEY_MAX_M` (within `TERRACE_SLACK_M` of the smallest, the first in the preference order: least-used style first). It measures to the next row's corner block's real back wall (that block's own stack depth, by the shops and roof corners it draws, not the style's deepest piece), or to a plaza's or parking lot's edge. `packTown` packs a block's runs together so each row closes to the corner block the next row really got, so the corner block it closes to is searched, not taken from the hash. Neighbours never share a style or a floor count; no building model is scaled to close a gap.

## Open questions

- **Open**: a place model (chapter 8) may scale below `WORLD_PER_METRE`, down to `PLACE_MIN_SCALE`. Waits for: the place-model work of chapter 8.
