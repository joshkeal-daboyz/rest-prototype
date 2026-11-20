/**
 * Stage 2's constants. The alley and park rates are moved from `src/render3d/tilecity.ts` (ticket 070 B) with their values unchanged; the old file keeps its own copies until section L.
 * A stage never imports another stage's folder (R-1), so the lattice cell is copied here too.
 */

/** One tile, metres: the lattice cell (the same value as stage 1's). */
export const TILE_M = 5;
/** An alley (a lane) is one cell (5 m) wide. */
export const ALLEY_CELLS = 1;
/** Every city has at least one alley per this many blocks (19.6). */
export const ALLEY_ONE_IN_BLOCKS = 4;
/** A block with a side of this many metres or more (14 cells) gets an alley whatever its type; a long block always does (19.6). */
export const ALLEY_SIDE_LONG_M = 70;
/** A block needs a side of at least this many cells to be split (9 cells, 45 m). Under grammar rule 4 a 9-cell side is cut into 2, lane, 6. */
export const ALLEY_SIDE_MIN_CELLS = 9;
/** There is at least one park per this many blocks (19.6). */
export const PARK_ONE_IN_BLOCKS = 6;
/** A block needs a short side of at least this many cells (45 m) to give a half to a park: the park gets half the short side (rounded down) and the built half the rest. */
export const PARK_HALF_SIDE_MIN_CELLS = 9;
/** Grammar rule 4: a part's short side is exactly this many cells (a strip: two rows back to back) ... */
export const STRIP_CELLS = 2;
/** ... or at least this many (a court block: ring 1, ring 2 and an interior of at least 2 cells). 3, 4 and 5 are never laid. */
export const COURT_PART_MIN_CELLS = 6;
