# City style: Numbers

## Numbers

The drift test (`styleguide.test.ts`) reads this table. Each row names an export of the file in its last column. A value is a number (within 1e-9), a colour as `0x` hex (exactly), or `a x b x c` for a record, in the record's field order. `LOT_TYPES` is frontage x depth x cap in metres and `PLACE_SIZES` is width x depth in metres. `STACK_STYLES[i].pitch_m` is base x floor x roof in metres (the storey heights a recipe counts floors by; the roof is the height reserved under the cap), in the order `apartment-01`, `-02`, `-03`, `office-old-small`, `office-old-large`, `office-octagon`. `STACK_FLOORS` is the fewest floors over the base. `TINTS[i]` is the i-th wall tint. `CITY_CHECK` is the threshold of R1 to R13 in that order (a share to reach, or a count not to pass, chapter 16.8) and `CITY_STOREYS` is the fewest and most storeys. Changing a constant in code or a value here fails the test. Since ticket 053 the test also fails when `stacks.ts`, `terrace.ts`, `dressing.ts`, `furniture.ts`, `streetcam.ts` or `citymetrics.ts` exports a number that has no row here, and when `town.ts` does for a `TERRACE_*`, `PARKING_*` or `PLAZA_*` name. Since ticket 054 the test also fails when `colourway.ts` exports a constant (not a function) that has no row here; `COLOURWAY_POOL` is pinned by its length, and its ids are the table in 16.9. Since ticket 060 the same holds for `lighting.ts`: every number in `LIGHT_MODES` and every numeric export has a row (the mode's words, `toneMapping`, `shadows` and `nightLights`, are in 16.12). Since ticket 056 the test also fails when a constant of chapter 18 (the rows for `tilecity.ts` at the end of the table) is missing or changed, and when `parkmetrics.ts` exports a constant (not a function) that has no row; `KERB_BAY_SHARE_MAX` is avenue x street, `PARK_SUPPLY_BAND` is floor x ceiling and `PARK_CHECK` is P1 to P6 in that order. Since ticket 058 the test also fails when `escapes.ts` exports a number or a record of numbers that has no row here; `ESCAPE_SCALE_Y` is min x max, and `CODE_ESCAPE` is `w`, `d`, `deck`, `rail`, `bar`, `tread`, `riser`, `hatch0`, `hatch1`, `stair0`, `stair1`, `ladderX0`, `ladderX1`, `ladderZ`, in metres (16.11). Since ticket 055 F the test also fails when `sills.ts` exports a number or a record of numbers that has no row here; `STEPS_SCALE_Y` is min x max (16.10; the constants of ticket 062 A and B, from `SILL_DEPTH_MAX_M` to `RECESS_DOOR_HALF_M` and `SILL_BAND_M`, `SILL_UNDER_M` and `LIFT_CLEAR_M`, are rows too). Colours are `0x` hex. Since ticket 057 D the rows for `tileslots.ts` (the draw-call caps and the gate's size and colour) are checked as well. Since ticket 057 the test also fails when `facade.ts` or `frontage.ts` exports a number or a record of numbers that has no row here (a constant that `frontage.ts` re-exports from `tilecity.ts` is covered by the `tilecity.ts` row), and when a constant that chapter 19 names from `tilecity.ts` has none. `WALL_FRONT_M` and `WALL_SIDE_M` are the exceptions: they hold a distance per piece, which `facade.test.ts` pins as a fixture, so only their constants are rows. `BLOCK_TILES` is min x max, `PASSAGE_W_M` is min x max, `COURT_CELLS` is w x d, and `FRONTAGE_CHECK` and `VARIETY_CHECK` are G1 to G4 and V1 to V4 in that order. The `tilecity.ts` rows from `TILE_M` to `PARK_HALF_SIDE_MIN_CELLS` are the constants of chapter 19. Since ticket 070 L1 the rows `PARK_PER_HOME` (0.075) and `PARK_SUPPLY_BAND` (the kerb floor 0.69, and stage 3's lot band 0.75) name the pipeline's stage modules in their File cell (mass/constants.ts and edge/constants.ts, the constants files of the folders `src/city/mass/` and `src/city/edge/`), and the old `tilecity.ts` rows for them are gone: the old path's 0.15 and 0.75 are not pinned here.

| Constant | Value | File |
| --- | --- | --- |
| `WORLD_PER_METRE` | 0.18 | town.ts |
| `WORLD_PER_METRE` | 0.18 | models.ts |
| `STREET_MIN_LEN` | 2.5 | town.ts |
| `ROAD_W` | 1.1 | town.ts |
| `KERB_OFFSET` | 0.4 | town.ts |
| `KERB_H` | 0.03 | town.ts |
| `PAVE_W` | 0.45 | town.ts |
| `RING_MARGIN` | 4 | town.ts |
| `BLOCK_PITCH` | 12 | town.ts |
| `OUTER_RINGS` | 1 | town.ts |
| `SETBACK` | 0.15 | town.ts |
| `LOT_GAP` | 0.1 | town.ts |
| `WIRE_CLEAR` | 0.25 | town.ts |
| `FILL_STEP` | 0.25 | town.ts |
| `PLACE_STEP` | 0.1 | town.ts |
| `CORNER_GAP` | 0.5 | town.ts |
| `CORNER_ANGLE_MAX` | 45 | town.ts |
| `ROW_MIN_SMALLS` | 2 | town.ts |
| `PLACE_REACH` | 2.5 | town.ts |
| `STOREY_M` | 3.2 | town.ts |
| `PLACE_STOREYS` | 2 | town.ts |
| `OCCLUDE_SLOPE` | 2.1445069205 | town.ts |
| `NODE_TOP_Y` | 1.6 | town.ts |
| `LAMP_HEAD_Y` | 1.65 | town.ts |
| `LOT_TYPES.small` | 12 x 13 x 12 | town.ts |
| `LOT_TYPES.house` | 16 x 19 x 15 | town.ts |
| `LOT_TYPES.large` | 25 x 28 x 16 | town.ts |
| `LOT_TYPES.tall` | 14 x 16 x 28 | town.ts |
| `PLACE_SIZES.whole` | 10 x 10 | town.ts |
| `PLACE_SIZES.quarter` | 6 x 6 | town.ts |
| `PLACE_SIZES.home` | 6 x 8 | town.ts |
| `TERRACE_BAY_M` | 5.2 | town.ts |
| `TERRACE_DEPTH_M` | 6 | town.ts |
| `TERRACE_BAYS` | 2 x 4 | town.ts |
| `TERRACE_CAPS_M[0]` | 16 | town.ts |
| `TERRACE_CAPS_M[1]` | 13 | town.ts |
| `TERRACE_CAPS_M[2]` | 10 | town.ts |
| `PARKING_W_M` | 10 | town.ts |
| `PARKING_D_M` | 10 | town.ts |
| `PARKING_MIN_RUN_BAYS` | 8 | town.ts |
| `PARKING_ONE_IN` | 3 | town.ts |
| `PLAZA_W_M` | 10.4 | town.ts |
| `PLAZA_ONE_IN` | 4 | town.ts |
| `TERRACE_SEAM_M` | 0.1 | terrace.ts |
| `TERRACE_SLACK_M` | 0.15 | terrace.ts |
| `ALLEY_MIN_M` | 1 | terrace.ts |
| `ALLEY_MAX_M` | 1.5 | terrace.ts |
| `STACK_FLOORS.small` | 1 | stacks.ts |
| `STACK_FLOORS.house` | 1 | stacks.ts |
| `STACK_FLOORS.large` | 2 | stacks.ts |
| `STACK_FLOORS.tall` | 5 | stacks.ts |
| `STACK_STYLES[0].pitch_m` | 3 x 3 x 0.5 | stacks.ts |
| `STACK_STYLES[1].pitch_m` | 3 x 3 x 0.75 | stacks.ts |
| `STACK_STYLES[2].pitch_m` | 3 x 3 x 0.75 | stacks.ts |
| `STACK_STYLES[3].pitch_m` | 6 x 3.19 x 4.22 | stacks.ts |
| `STACK_STYLES[4].pitch_m` | 6 x 3.19 x 4.23 | stacks.ts |
| `STACK_STYLES[5].pitch_m` | 3.9 x 3 x 5.38 | stacks.ts |
| `STOREY_ALIGN_TOL_M` | 0.03 | stacks.ts |
| `BODY_REPORT_M` | 0.1 | stacks.ts |
| `NEIGHBOUR_GAP` | 0.5 | models.ts |
| `STREET_REPEAT_GAP` | 3 | models.ts |
| `FAMILY_SHARE_MAX` | 0.25 | models.ts |
| `POLYGON_MIN_FAMILIES.small` | 4 | models.ts |
| `POLYGON_MIN_FAMILIES.house` | 4 | models.ts |
| `POLYGON_MIN_FAMILIES.large` | 4 | models.ts |
| `POLYGON_MIN_FAMILIES.tall` | 3 | models.ts |
| `POLE_HEIGHT` | 1.6 | layout.ts |
| `POLE_SPACING` | 3 | layout.ts |
| `SAG_RATIO` | 0.04 | layout.ts |
| `WIRE_RADIUS` | 0.03 | layout.ts |
| `PHASE_OFFSET` | 0.22 | layout.ts |
| `BREAK_GAP` | 0.3 | layout.ts |
| `HANG_DROP` | 0.6 | layout.ts |
| `WIRE_PICK_RADIUS` | 0.3 | layout.ts |
| `DROP_REACH` | 2.5 | layout.ts |
| `DROP_DROP` | 0.2 | layout.ts |
| `DROP_END_Y` | 0.5 | layout.ts |
| `CAN_OFFSET` | 0.1 | layout.ts |
| `CAN_DROP` | 0.3 | layout.ts |
| `ELEVATION` | 0.7853981634 | camera.ts |
| `FOV_DEG` | 40 | camera.ts |
| `GROUND` | 0x0e131d | scene.ts |
| `YARD` | 0x141c29 | scene.ts |
| `STREET` | 0x1a2331 | scene.ts |
| `PAVEMENT` | 0x3d4658 | scene.ts |
| `KERB` | 0x9aa4b6 | scene.ts |
| `CENTRE_LINE` | 0x7a7863 | scene.ts |
| `PLACE` | 0x3a4a68 | scene.ts |
| `POLE_WOOD` | 0x8b6b4a | scene.ts |
| `FOOT` | 0x080b11 | scene.ts |
| `METAL` | 0x5d6b84 | scene.ts |
| `DEAD_WIRE` | 0x2a3445 | scene.ts |
| `LIVE_WIRE` | 0x4fd1ff | scene.ts |
| `LIVE_GLOW` | 0x2aa9d8 | scene.ts |
| `REPAIRED_WIRE` | 0x5a6f92 | scene.ts |
| `WARM` | 0xffd37a | scene.ts |
| `TARGET` | 0xffe9a8 | scene.ts |
| `SCORCH` | 0x1a0f0c | scene.ts |
| `RIBBON` | 0xff3df0 | scene.ts |
| `INSULATOR` | 0x8fa99a | scene.ts |
| `CAN` | 0x7d8794 | scene.ts |
| `DROP_COLOR` | 0x39414f | scene.ts |
| `TINTS[0]` | 0x4a566e | placeholders.ts |
| `TINTS[1]` | 0x5a5472 | placeholders.ts |
| `TINTS[2]` | 0x4a6478 | placeholders.ts |
| `TINTS[3]` | 0x686678 | placeholders.ts |
| `ROOF_SHADE` | 0.6 | placeholders.ts |
| `CAP_M` | 0.3 | placeholders.ts |
| `PITCH_M` | 1.8 | placeholders.ts |
| `P_AWNING` | 0.75 | dressing.ts |
| `P_SIGN` | 0.6 | dressing.ts |
| `P_ATM` | 0.3 | dressing.ts |
| `ATM_PER_RUN` | 2 | dressing.ts |
| `P_CANOPY` | 0.5 | dressing.ts |
| `ESCAPE_SHARE_LADDER` | 0.5 | dressing.ts |
| `ESCAPE_MIN_BAYS` | 3 | dressing.ts |
| `P_WALL_AC` | 0.15 | dressing.ts |
| `P_PLANTER` | 0.1 | dressing.ts |
| `WALL_PROPS_PER_BLOCK` | 4 | dressing.ts |
| `P_ROOF_SMALL` | 0.7 | dressing.ts |
| `ROOF_SMALL_PER_BAY` | 2 | dressing.ts |
| `P_ROOF_LARGE` | 0.5 | dressing.ts |
| `DRESS_PER_BAY_MAX` | 6 | dressing.ts |
| `DRESS_MAX` | 6000 | dressing.ts |
| `NO_USED` | 0 x 0 x 0 | dressing.ts |
| `ROOF_EDGE_M` | 0.3 | dressing.ts |
| `AWNING_KERB_M` | 0.3 | dressing.ts |
| `GLASS_INSET_M` | 0.05 | dressing.ts |
| `GLASS_SILL_M` | 0.3 | dressing.ts |
| `DRESS_DRAW_CALLS_MAX` | 120 | dressing.ts |
| `P_BLADE` | 0.25 | dressing.ts |
| `P_ROOF_SECOND` | 0.4 | dressing.ts |
| `KERB_FROM_FRONT_M` | 3.3333333333 | dressing.ts |
| `GLASS_WRAP_DEPTH_M` | 1 | dressing.ts |
| `AWNING_BASE_M` | 2.85 | dressing.ts |
| `SIGN_BASE_M` | 2.85 | dressing.ts |
| `DOOR_CANOPY_Y_M` | 2.3 | dressing.ts |
| `ATM_Y_M` | 0.6 | dressing.ts |
| `ATM_PIER_M` | 0.35 | dressing.ts |
| `WALL_MIN_LEVEL` | 2 | dressing.ts |
| `WALL_AC_LIFT_M` | 1 | dressing.ts |
| `PLANTER_LIFT_M` | 0.9 | dressing.ts |
| `WALL_AC_OFFSET_M` | 1.5 | dressing.ts |
| `BILLBOARD_SIGN_Y_M` | 0.9 | dressing.ts |
| `BLADE_INSET_M` | 0.1 | dressing.ts |
| `FURN_KERB_M` | 0.5 | furniture.ts |
| `FURN_WALL_M` | 0.4 | furniture.ts |
| `FURN_PITCH_M` | 7 | furniture.ts |
| `TREE_PITCH_M` | 12 | furniture.ts |
| `BUS_STOP_MIN_RUN_M` | 40 | furniture.ts |
| `FURN_KEEP_M` | 1.5 | furniture.ts |
| `FURN_CORNER_M` | 4 | furniture.ts |
| `FURN_MAX_H_M` | 3.2 | furniture.ts |
| `P_FURN` | 0.7 | furniture.ts |
| `FURN_GAP_SPAN_M` | 6 | furniture.ts |
| `FURN_GAP_M` | 0.3 | furniture.ts |
| `P_BOLLARD` | 0.5 | furniture.ts |
| `BOLLARD_PER_RUN` | 2 | furniture.ts |
| `HYDRANT_PER_RUN` | 1 | furniture.ts |
| `MAILBOX_PER_RUN` | 1 | furniture.ts |
| `NEWSPAPER_PER_RUN` | 2 | furniture.ts |
| `BUS_STOP_PER_RUN` | 1 | furniture.ts |
| `P_ALLEY` | 0.85 | furniture.ts |
| `P_ALLEY_SECOND` | 0.5 | furniture.ts |
| `P_PARKING_BILLBOARD` | 0.6 | furniture.ts |
| `BILLBOARD_BOARD_LIFT_M` | 4.55 | furniture.ts |
| `SLAB_MAX_M` | 0.2 | furniture.ts |
| `FURN_DRAW_CALLS_MAX` | 80 | furniture.ts |
| `WALL_EDGE_M` | 0.8333333333 | furniture.ts |
| `KERB_M` | 3.3333333333 | furniture.ts |
| `STREET_CAM_BACK_M` | 26 | streetcam.ts |
| `STREET_CAM_EYE_M` | 9 | streetcam.ts |
| `STREET_CAM_LOOK_M` | 6 | streetcam.ts |
| `STREET_CAM_YAW_DEG` | 35 | streetcam.ts |
| `STREET_CAM_FOV_DEG` | 50 | streetcam.ts |
| `STREET_CAM_FOV_MAX_DEG` | 85 | streetcam.ts |
| `CITY_CHECK` | 0.9 x 1 x 1 x 1 x 0.55 x 0.5 x 0.5 x 0.9 x 0 x 0 x 1 x 0 x 1 | citymetrics.ts |
| `CITY_ATM_BLOCKS_MIN` | 0.15 | citymetrics.ts |
| `CITY_BIG_ROOF_RUNS_MIN` | 0.5 | citymetrics.ts |
| `CITY_RUN_FRONTAGE` | 0.9 | citymetrics.ts |
| `CITY_STOREYS` | 3 x 5 | citymetrics.ts |
| `COLOURWAY_POOL.length` | 8 | colourway.ts |
| `STOP_SIGN_COLOURWAY.length` | 4 | colourway.ts |
| `LIGHT_MODES.night.background` | 0x0b0f17 | lighting.ts |
| `LIGHT_MODES.night.ambient.color` | 0x4a5a7a | lighting.ts |
| `LIGHT_MODES.night.ambient.intensity` | 1.1 | lighting.ts |
| `LIGHT_MODES.night.moon.color` | 0x8fa6d0 | lighting.ts |
| `LIGHT_MODES.night.moon.intensity` | 0.7 | lighting.ts |
| `LIGHT_MODES.night.moon.position[0]` | -6 | lighting.ts |
| `LIGHT_MODES.night.moon.position[1]` | 12 | lighting.ts |
| `LIGHT_MODES.night.moon.position[2]` | 4 | lighting.ts |
| `LIGHT_MODES.night.exposure` | 1 | lighting.ts |
| `LIGHT_MODES.night.surfaces.ground` | 0x0e131d | lighting.ts |
| `LIGHT_MODES.night.surfaces.yard` | 0x141c29 | lighting.ts |
| `LIGHT_MODES.night.surfaces.street` | 0x1a2331 | lighting.ts |
| `LIGHT_MODES.night.surfaces.pavement` | 0x3d4658 | lighting.ts |
| `LIGHT_MODES.night.surfaces.kerb` | 0x9aa4b6 | lighting.ts |
| `LIGHT_MODES.night.surfaces.grass` | 0x141c29 | lighting.ts |
| `LIGHT_MODES.day.background` | 0xa9c7e6 | lighting.ts |
| `LIGHT_MODES.day.key.color` | 0xfff6ea | lighting.ts |
| `LIGHT_MODES.day.key.intensity` | 1.4 | lighting.ts |
| `LIGHT_MODES.day.key.elevation_deg` | 55 | lighting.ts |
| `LIGHT_MODES.day.key.azimuth_deg` | 135 | lighting.ts |
| `LIGHT_MODES.day.hemi.sky` | 0xe6efff | lighting.ts |
| `LIGHT_MODES.day.hemi.ground` | 0x9a8c78 | lighting.ts |
| `LIGHT_MODES.day.hemi.intensity` | 1.8 | lighting.ts |
| `LIGHT_MODES.day.exposure` | 1 | lighting.ts |
| `LIGHT_MODES.day.surfaces.ground` | 0x7d8471 | lighting.ts |
| `LIGHT_MODES.day.surfaces.yard` | 0x7d8471 | lighting.ts |
| `LIGHT_MODES.day.surfaces.street` | 0x55595f | lighting.ts |
| `LIGHT_MODES.day.surfaces.pavement` | 0xa7abb1 | lighting.ts |
| `LIGHT_MODES.day.surfaces.kerb` | 0xd0d4da | lighting.ts |
| `LIGHT_MODES.day.surfaces.grass` | 0x6f8f4e | lighting.ts |
| `SUN_DISTANCE` | 20 | lighting.ts |
| `PARK_PER_SHOP` | 0.333333333333 | tilecity.ts |
| `PARK_PER_HOME` | 0.075 | mass/constants.ts |
| `HOME_COLUMN_FLOORS` | 2 | tilecity.ts |
| `UNIT_FLOORS_NOMINAL` | 3 | tilecity.ts |
| `BAY_TILES_PER_BLOCK_MIN` | 1 | tilecity.ts |
| `BAY_RUN_TILES_MAX` | 2 | tilecity.ts |
| `KERB_GAP_MIN_M` | 10 | tilecity.ts |
| `KERB_BAY_SHARE_MAX` | 0.4 x 0.3 | tilecity.ts |
| `BAYS_PER_100M_MAX` | 6 | tilecity.ts |
| `LOTS_PER_BLOCK_MAX` | 2 | tilecity.ts |
| `LOT_STALLS` | 6 | tilecity.ts |
| `PARK_SUPPLY_BAND` | 0.69 x 1.5 | edge/constants.ts |
| `PARK_SUPPLY_BAND` | 0.75 x 1.5 | mass/constants.ts |
| `BUILDOUT_TREE_EVERY` | 2 | tilecity.ts |
| `BAYS_PER_PARKING_TILE` | 3 | tilecity.ts |
| `BAY_JUNCTION_CLEAR` | 1 | tilecity.ts |
| `TILE_PARK_MIN_RUN_M` | 35 | tilecity.ts |
| `TILE_CITY_R6_MIN` | 0.45 | tilecity.ts |
| `TILE_M` | 5 | tilecity.ts |
| `AVENUE_ONE_IN` | 0 | tilecity.ts |
| `TILE_CITY_R7_MIN` | 0.4 | tilecity.ts |
| `TILE_CITY_R1_MIN` | 0.88 | tilecity.ts |
| `TILE_ROW_INSET_M` | 0 | tilecity.ts |
| `END_OVERLAP_MAX_M` | 1 | tilecity.ts |
| `PASSAGE_W_M` | 1 x 5.3 | tilecity.ts |
| `PASSAGE_FLOOR_DEPTH_M` | 5 | tilecity.ts |
| `COURT_CELLS` | 2 x 3 | tilecity.ts |
| `DRIVE_CELLS` | 2 | tilecity.ts |
| `PAVEMENT_GRATE` | 1 | tilecity.ts |
| `PAVEMENT_RETURN_NEAR` | 2 | tilecity.ts |
| `PAVEMENT_RETURN_FAR` | 4 | tilecity.ts |
| `PAVEMENT_FLUSH` | 8 | tilecity.ts |
| `POLE_SLOT_FROM_KERB_M` | 0.75 | tilecity.ts |
| `GRATE_ONE_IN` | 6 | tilecity.ts |
| `APRON_CELLS` | 1 | tilecity.ts |
| `APRON_STRIP` | 1 | tilecity.ts |
| `COURT_STALLS` | 0 | tilecity.ts |
| `COURT_AISLE` | 1 | tilecity.ts |
| `GREEN_SPAN_MAX_CELLS` | 6 | tilecity.ts |
| `GREEN_TREE_ONE_IN` | 3 | tilecity.ts |
| `BENCH_FROM_PATH_M` | 1 | tilecity.ts |
| `CITY_FRONT_LOT_BLOCKS_MAX` | 0.111111111111 | tilecity.ts |
| `BLOCK_TILES` | 6 x 16 | tilecity.ts |
| `BLOCK_STEP_MIN_CELLS` | 2 | tilecity.ts |
| `BLOCK_CV_MIN` | 0.15 | tilecity.ts |
| `BLOCK_NONSQUARE_MIN` | 0.7 | tilecity.ts |
| `BLOCK_DRAWS_MAX` | 64 | tilecity.ts |
| `BLOCK_MEAN_MIN_CELLS` | 10 | tilecity.ts |
| `BLOCK_SMALL_MAX_M` | 40 | tilecity.ts |
| `BLOCK_LONG_MIN_M` | 60 | tilecity.ts |
| `BLOCK_LONG_SHORT_MAX_M` | 45 | tilecity.ts |
| `BLOCK_LARGE_MIN_M` | 55 | tilecity.ts |
| `BLOCK_FALLBACK_WIDTHS[0]` | 13 | tilecity.ts |
| `BLOCK_FALLBACK_WIDTHS[1]` | 9 | tilecity.ts |
| `BLOCK_FALLBACK_WIDTHS[2]` | 15 | tilecity.ts |
| `BLOCK_FALLBACK_WIDTHS[3]` | 11 | tilecity.ts |
| `BLOCK_FALLBACK_WIDTHS[4]` | 16 | tilecity.ts |
| `BLOCK_FALLBACK_WIDTHS[5]` | 12 | tilecity.ts |
| `BLOCK_FALLBACK_DEPTHS[0]` | 10 | tilecity.ts |
| `BLOCK_FALLBACK_DEPTHS[1]` | 14 | tilecity.ts |
| `BLOCK_FALLBACK_DEPTHS[2]` | 8 | tilecity.ts |
| `BLOCK_FALLBACK_DEPTHS[3]` | 13 | tilecity.ts |
| `BLOCK_FALLBACK_DEPTHS[4]` | 15 | tilecity.ts |
| `BLOCK_FALLBACK_DEPTHS[5]` | 9 | tilecity.ts |
| `ALLEY_ONE_IN_BLOCKS` | 4 | tilecity.ts |
| `ALLEY_CELLS` | 1 | tilecity.ts |
| `ALLEY_BIN_EVERY_M` | 10 | tilecity.ts |
| `ALLEY_BIN_OFFSET_M` | 3.3 | tilecity.ts |
| `ALLEY_SIDE_LONG_M` | 70 | tilecity.ts |
| `ALLEY_SIDE_MIN_CELLS` | 9 | tilecity.ts |
| `ALLEY_COURT_PART_MIN_CELLS` | 6 | tilecity.ts |
| `ALLEY_COURT_LANE_MIN_CELLS` | 6 | tilecity.ts |
| `PARK_ONE_IN_BLOCKS` | 6 | tilecity.ts |
| `PARK_EDGE_CELLS` | 1 | tilecity.ts |
| `PARK_HALF_SIDE_MIN_CELLS` | 9 | tilecity.ts |
| `PARK_CHECK` | 0 x 0 x 0 x 0 x 0 x 6 | parkmetrics.ts |
| `ESCAPE_DECK_BELOW_SILL_M` | 0.15 | escapes.ts |
| `ESCAPE_DECK_TOL_M` | 0.05 | escapes.ts |
| `ESCAPE_JOINT_TOL_M` | 0.02 | escapes.ts |
| `ESCAPE_GROUND_TOL_M` | 0.02 | escapes.ts |
| `ESCAPE_SCALE_Y` | 0.8 x 1.2 | escapes.ts |
| `LADDER_RUNG_PITCH_M` | 0.3 | escapes.ts |
| `LADDER_RAIL_M` | 0.04 | escapes.ts |
| `LADDER_RUNG_M` | 0.03 | escapes.ts |
| `CODE_ESCAPE` | 3.25 x 1.64 x 0.08 x 0.9 x 0.05 x 0.25 x 0.2 x -0.9 x 1 x 0.07 x 0.67 x 0.853 x 1.303 x 0.83 | escapes.ts |
| `SILL_MIN_AREA_M2` | 1 | escapes.ts |
| `SILL_MAX_M` | 0.15 | sills.ts |
| `SILL_WINDOW_CLEAR_M` | 0.3 | sills.ts |
| `STEPS_RISE_M` | 0.5 | sills.ts |
| `STEPS_SCALE_Y` | 0.5 x 1.5 | sills.ts |
| `STEPS_W_M` | 1.2 | sills.ts |
| `STEPS_D_M` | 0.9 | sills.ts |
| `STEPS_TUCK_M` | 0.05 | sills.ts |
| `STEPS_FIT_M` | 0.05 | sills.ts |
| `SILL_DEPTH_M` | 1 | sills.ts |
| `SILL_CEIL_M` | 1.5 | sills.ts |
| `DOOR_MIN_AREA_M2` | 0.2 | sills.ts |
| `SILL_DOOR_HALF_M` | 0.45 | sills.ts |
| `SILL_LEVEL_GAP_M` | 0.03 | sills.ts |
| `SILL_JOIN_GAP_M` | 0.1 | sills.ts |
| `SILL_DEPTH_MAX_M` | 4 | sills.ts |
| `SILL_BAND_M` | 0.16 | sills.ts |
| `SILL_UNDER_M` | 0.05 | sills.ts |
| `LIFT_CLEAR_M` | 0.05 | sills.ts |
| `STEP_MIN_M` | 0.05 | sills.ts |
| `STEP_BELOW_FLOOR_M` | 0.1 | sills.ts |
| `RECESS_MIN_M` | 0.05 | sills.ts |
| `RECESS_AREA_M2` | 0.3 | sills.ts |
| `RECESS_FLAT_M` | 0.02 | sills.ts |
| `RECESS_JOIN_M` | 0.03 | sills.ts |
| `WINDOW_DEPTH_M` | 4 | sills.ts |
| `RECESS_ABOVE_FLOOR_M` | 0.05 | sills.ts |
| `RECESS_DOOR_HALF_M` | 0.75 | sills.ts |
| `WALL_REACH_M` | 0.6 | facade.ts |
| `WALL_FLOOR_REACH_M` | 0.5 | facade.ts |
| `WALL_GROUND_Y_M` | 0.3 | facade.ts |
| `WALL_BAND_M` | 3.5 | facade.ts |
| `WALL_MIN_AREA_M2` | 0.5 | facade.ts |
| `WALL_PLANE_TOL_M` | 0.02 | facade.ts |
| `WALL_FACE_COS` | 0.99 | facade.ts |
| `WALL_OCTAGON_BASE_M` | 0.174 | facade.ts |
| `OPEN_DEPTH_M` | 1 | facade.ts |
| `OPEN_STEP_M` | 0.05 | facade.ts |
| `OPEN_MARGIN` | 4 | facade.ts |
| `ROOF_BASE_BAND_M` | 0.1 | facade.ts |
| `ROOF_BASE_MIN_SPAN_M` | 1 | facade.ts |
| `ROOF_SPAN_TIE_M` | 0.05 | facade.ts |
| `OVERLAP_MAX_M` | 0.6 | frontage.ts |
| `RECESS_MAX_M` | 0 | frontage.ts |
| `FRONTAGE_TOL_M` | 0.01 | frontage.ts |
| `VOID_MAX_SHARE` | 0.01 | frontage.ts |
| `VOID_PATCH_MAX_M` | 1 | frontage.ts |
| `VOID_RASTER_M` | 0.25 | frontage.ts |
| `FRONTAGE_CHECK` | 0 x 0 x 0 x 0 | frontage.ts |
| `VARIETY_CHECK` | 0 x 0 x 0 x 0 | frontage.ts |
| `TILE_DRAW_CALLS_MAX` | 40 | tileslots.ts |
| `INTERIOR_DRAW_CALLS_MAX` | 24 | tileslots.ts |
| `PAVING_SLAB_COLOUR` | 0x8c8987 | tileslots.ts |
| `STALL_LINES_LIFT_M` | 0.01 | tileslots.ts |
| `GATE_H_M` | 2.2 | tileslots.ts |
| `GATE_SMALL_H_M` | 1.3 | tileslots.ts |
| `GATE_POST_W_M` | 0.2 | tileslots.ts |
| `GATE_POST_EXTRA_H_M` | 0.25 | tileslots.ts |
| `GATE_THICK_M` | 0.12 | tileslots.ts |
| `GATE_ALLEY_REACH_M` | 1 | tileslots.ts |
| `GATE_COLOUR` | 0x6b4b32 | tileslots.ts |
| `KERB_INSET_M` | 0.66 | tileslots.ts |
| `KERB_LIP_TOP_M` | 0.3 | tileslots.ts |
| `KERB_LIP_W_M` | 0.39 | tileslots.ts |
| `KERB_STRIP_COLOUR` | 0x7b7b79 | tileslots.ts |
| `KERB_TOL_M` | 0.03 | tileslots.ts |
| `KERB_HEIGHT_TOL_M` | 0.02 | tileslots.ts |
| `KERB_GAP_MAX_M` | 0.05 | tileslots.ts |

Night's global lighting as written in the table of `lighting.ts` (the rig reads it; since ticket 060 `scene.ts` holds no light literal of its own), pinned by the exact source text as well:

| Part | Source text |
| --- | --- |
| background | `background: 0x0b0f17,` |
| ambient light | `ambient: { color: 0x4a5a7a, intensity: 1.1 },` |
| moon light | `moon: { color: 0x8fa6d0, intensity: 0.7, position: [-6, 12, 4] },` |
