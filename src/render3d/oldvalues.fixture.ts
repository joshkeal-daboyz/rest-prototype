/**
 * Test-only fixture (ticket 070 L2c): the old tile city's constants that the pins compare `src/city/` against, typed as values so no test imports `tilecity.ts` for them.
 * Source of each: `src/render3d/tilecity.ts` at b42b65f (the line numbers are that file's).
 */
/** tilecity.ts line 141: the share of qualifying street buildings that must carry an escape (R7). */
export const TILE_CITY_R7_MIN = 0.4;
/** tilecity.ts line 146: the shopfront share floor (R6, Josh, 18 Nov 2026). */
export const TILE_CITY_R6_MIN = 0.45;
/** tilecity.ts line 205: one green cell in this many holds a tree. */
export const GREEN_TREE_ONE_IN = 3;
/** tilecity.ts line 216: a bin beside an alley lane every this many metres. */
export const ALLEY_BIN_EVERY_M = 10;
/** tilecity.ts line 233: a bench's distance from the path's edge, metres. */
export const BENCH_FROM_PATH_M = 1.0;
/** tilecity.ts line 66 re-exports `TILE_M` from stage 1 (`CELL_M`, 5 m): the cell edge. */
export const TILE_M = 5;
/** tilecity.ts line 133: the old city's stack alignment, and the options `cityApplyOptions` passed besides its keep-outs (tilecity3d.ts line 1389): the wall alignment, the body footprint and R7's share. */
export const TILE_APPLY = { align: "wall", footprint: "body", escapeShare: TILE_CITY_R7_MIN } as const;
