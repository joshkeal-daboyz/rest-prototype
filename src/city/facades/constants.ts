/**
 * Stage 7, facades (ticket 070 H1): the typed-in thresholds the stage and its checks read (R-6). Each is a copy of the buildings stage's or the old path's, pinned equal by `src/render3d/groundpin.test.ts` while both exist
 * (this folder cannot import `src/city/buildings/`, R-1). `GROUND_GAP_MAX_M` is new and Decided (Josh, 20 Nov 2026, Q21 answer 1: "Yez, all three").
 */

/** The metres one lattice cell covers (the grammar's 5 m lattice). */
export const CELL_M = 5;
/** M1's number (grammar): a ground body's planes stand on its cells' edges within this, metres; a copy of the buildings stage's. */
export const WALL_JOINT_TOL_M = 0.02;
/** G1: a wall may stand this far past its cell edge, metres (and, for the deep keys, their back plane past the back edge: D5); a copy of frontage.ts' `OVERLAP_MAX_M`. */
export const OVERLAP_MAX_M = 0.6;
/** G1: a wall may stand this far behind its cell edge, metres; a copy of frontage.ts' `RECESS_MAX_M`. */
export const RECESS_MAX_M = 0;
/** G1: the tolerance on both, metres; a copy of frontage.ts' `FRONTAGE_TOL_M`. */
export const FRONTAGE_TOL_M = 0.01;
/** S1 (Decided, Josh, 20 Nov 2026, Q21 answer 1): a ground piece may stop up to this far short of the first floor, metres (the same size as `FRONTAGE_TOL_M`). */
export const GROUND_GAP_MAX_M = 0.01;
/** 062's door numbers, copies of sills.ts': a door sill is from `SILL_UNDER_M` under the walk to `SILL_MAX_M` over it; a ground piece's top stays `LIFT_CLEAR_M` under the first floor's lowest window sill. */
export const SILL_MAX_M = 0.15;
export const SILL_UNDER_M = 0.05;
export const LIFT_CLEAR_M = 0.05;
/** The slack the level checks allow for floating-point noise, metres. */
export const LEVEL_EPS_M = 1e-9;
