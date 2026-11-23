/**
 * Stage 8, ground dressing: every number the stage uses (ticket 070 I; R-6). Each ported number keeps the value of its tile-city original and is pinned equal to it by `src/render3d/furnpin.test.ts` while both paths exist (R-9).
 * `HALF_CELL_M` and `LANE_BIN_FIRST_M` are not ported: they are Josh's Q28 answer 3 (the lane walk centred on a building bay).
 */

/** One lattice cell, metres (grammar: 5 m). */
export const CELL_M = 5;

// ---- the pavements (src/render3d/furniture.ts) ----
/** A kerb-line item's front stands this far in from the kerb edge. `furniture.ts` FURN_KERB_M. */
export const FURN_KERB_M = 0.5;
/** A wall-line item's back stands this far out from the wall edge. `furniture.ts` FURN_WALL_M. */
export const FURN_WALL_M = 0.4;
/** Items on one line of a run are at least this far apart, centre to centre. `furniture.ts` FURN_PITCH_M. */
export const FURN_PITCH_M = 7;
/** Trees of one run are at least this far apart. `furniture.ts` TREE_PITCH_M. */
export const TREE_PITCH_M = 12;
/** A bus stop needs a run at least this long. `furniture.ts` BUS_STOP_MIN_RUN_M. */
export const BUS_STOP_MIN_RUN_M = 40;
/** The keep-out round a kerb cut, a corner cell, a dip, a keep point and (new on the pipeline) a residents' door's strip. `furniture.ts` FURN_KEEP_M. */
export const FURN_KEEP_M = 1.5;
/** Nothing stands within this of a run's ends. `furniture.ts` FURN_CORNER_M. */
export const FURN_CORNER_M = 4;
/** An item taller than this keeps clear of wire spans (stage 6's, not read yet). `furniture.ts` FURN_MAX_H_M. */
export const FURN_MAX_H_M = 3.2;
/** The share of candidate places along a line that get an item. `furniture.ts` P_FURN. */
export const P_FURN = 0.7;
/** Past the pitch, a hashed gap of up to this many metres before the next candidate. `furniture.ts` FURN_GAP_SPAN_M. */
export const FURN_GAP_SPAN_M = 6;
/** Clear space between two items' footprints, metres. `furniture.ts` FURN_GAP_M. */
export const FURN_GAP_M = 0.3;
/** The share of run ends that get a bollard just beyond the corner keep-out. `furniture.ts` P_BOLLARD. */
export const P_BOLLARD = 0.5;
/** The most bollards a run takes. `furniture.ts` BOLLARD_PER_RUN. */
export const BOLLARD_PER_RUN = 2;
/** `furniture.ts` HYDRANT_PER_RUN. */
export const HYDRANT_PER_RUN = 1;
/** `furniture.ts` MAILBOX_PER_RUN. */
export const MAILBOX_PER_RUN = 1;
/** `furniture.ts` NEWSPAPER_PER_RUN. */
export const NEWSPAPER_PER_RUN = 2;
/** `furniture.ts` BUS_STOP_PER_RUN. */
export const BUS_STOP_PER_RUN = 1;

// ---- the open lots (src/render3d/furniture.ts) ----
/** A parking lot's pole billboard: its share. `furniture.ts` P_PARKING_BILLBOARD. */
export const P_PARKING_BILLBOARD = 0.6;
/** The billboard board's base height on its pole, metres. `furniture.ts` BILLBOARD_BOARD_LIFT_M. */
export const BILLBOARD_BOARD_LIFT_M = 4.55;
/** A piece lower than this (a parking tile) is ground: things stand on it. `furniture.ts` SLAB_MAX_M. */
export const SLAB_MAX_M = 0.2;

// ---- the greens and the lanes (src/render3d/tilecity.ts) ----
/** One green cell in this many carries a tree, by hash. `tilecity.ts` GREEN_TREE_ONE_IN. */
export const GREEN_TREE_ONE_IN = 3;
/** A bench's pivot stands this far from its path's edge, metres. `tilecity.ts` BENCH_FROM_PATH_M. */
export const BENCH_FROM_PATH_M = 1.0;
/** A lane bin every this many metres along the lane. `tilecity.ts` ALLEY_BIN_EVERY_M. */
export const ALLEY_BIN_EVERY_M = 10;

// ---- not ported (Josh, Q28 answer 3) ----
/** Half a cell: the lane walk is moved onto a building bay's middle by this. New on the pipeline; the tile city's walk puts every bin on a cell edge. */
export const HALF_CELL_M = CELL_M / 2;
/** The first lane bin's place along the lane: `CELL_M + ALLEY_BIN_EVERY_M / 2 + HALF_CELL_M` = 12.5 m from the lane's low end. */
export const LANE_BIN_FIRST_M = CELL_M + ALLEY_BIN_EVERY_M / 2 + HALF_CELL_M;

/** A tolerance on exact comparisons, metres. */
export const EPS = 1e-9;
/** A tolerance on overlap tests: two footprints that only touch do not overlap. */
export const TOL = 1e-6;
