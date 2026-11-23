/**
 * Stage 4's constants (ticket 070 D1). Typed-in copies of `src/render3d/tilecity.ts`'s parking constants, each pinned equal to it by `constants.test.ts`; the old file keeps its own copies until section L.
 * A stage never imports another stage's folder (R-1), so nothing here is read from stage 1 to 3.
 */

/** A lattice cell, metres. */
export const TILE_M = 5;
/** Bays a `ParkingLines_01` tile holds (18.3): two band cells along the street, three bays. */
export const BAYS_PER_PARKING_TILE = 3;
/** Bays a shop calls for (18.1). Demand is `mass.units`' shops times this. */
export const PARK_PER_SHOP = 1 / 3;
/** A block is served by at least this many tiles of bays (18.6). */
export const BAY_TILES_PER_BLOCK_MIN = 1;
/** A run of bays is at most this many tiles (20 m, 6 bays), and two runs on one side have at least `KERB_GAP_MIN_M` of kerb without bays between them. */
export const BAY_RUN_TILES_MAX = 2;
export const KERB_GAP_MIN_M = 10;
/** At most this share of a block side's kerb is bays, by the street's profile; and the city has at most `BAYS_PER_100M_MAX` bays per 100 m of block kerb. */
export const KERB_BAY_SHARE_MAX = { avenue: 0.4, street: 0.3 } as const;
export const BAYS_PER_100M_MAX = 6;
/** No bay in the band cell next to a crossing, a junction or a corner. */
export const BAY_JUNCTION_CLEAR = 1;
/** A tree on every this many cells of a stretch of build-outs, never next to a crossing (18.5). */
export const BUILDOUT_TREE_EVERY = 2;
/**
 * The band the city's kerb bays must lie in, as a multiple of the demand (shops x `PARK_PER_SHOP`): check P1. From D1b the floor is 0.69 on the pipeline only (Josh, 20 Nov 2026, on the A4 pre-check's question 4:
 * "Lower P1's floor", then "yes lower it"); the old tile city keeps 0.75 until section L. `hi` is unchanged.
 */
export const PARK_SUPPLY_BAND = { lo: 0.69, hi: 1.5 } as const;

/** One pavement cell in this many is a grate (`Sidewalk_Grate_01`) and one lane cell in this many carries a patch decal. Typed-in copies of the tile city's (ticket 070 D2), pinned equal by `constants.test.ts`. */
export const GRATE_ONE_IN = 6;
export const PATCH_ONE_IN = 12;
/** A return's end lies within this of the wall plane of the built cell beside the opening (grammar rule 10's second addition, 065 criterion 10). */
export const RETURN_WALL_TOL_M = 0.05;
