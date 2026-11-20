/**
 * Stage 1's constants, moved from `src/render3d/tilecity.ts` (ticket 070 A1) with their values unchanged. `tilecity.ts` keeps its own copies until A2.
 * Their reasons are in that file's comments.
 */

/** One tile, metres: the lattice cell. */
export const TILE_M = 5;
/** The most blocks along either axis (tests build 6 x 6 at the most). */
export const CITY_BLOCKS_MAX = 6;
/** The blocks along each axis when none are asked for. */
export const CITY_BLOCKS_DEFAULT = 3;
/** A block's side, in cells (30 to 80 m). */
export const BLOCK_TILES = { min: 6, max: 16 } as const;
/** Neighbouring blocks on one axis differ by at least this many cells, by hash. */
export const BLOCK_STEP_MIN_CELLS = 2;
/** V1: on each axis with two or more blocks the sizes' coefficient of variation is at least this. V2: at least this share of the blocks are not square. */
export const BLOCK_CV_MIN = 0.15;
export const BLOCK_NONSQUARE_MIN = 0.7;
/** A seed whose first draw misses the variety rules draws again, this many times at the most, then the fallback lists are used. */
export const BLOCK_DRAWS_MAX = 64;
/** The mean block size on each axis is at least this many cells (50 m). */
export const BLOCK_MEAN_MIN_CELLS = 10;
/** Block types by size, metres: small, long, large, else medium. */
export const BLOCK_SMALL_MAX_M = 40;
export const BLOCK_LONG_MIN_M = 60;
export const BLOCK_LONG_SHORT_MAX_M = 45;
export const BLOCK_LARGE_MIN_M = 55;
/** One interior grid line in this many is an avenue; 0 is off, and it is off (063 B: grammar rule 10, "no avenue"). */
export const AVENUE_ONE_IN = 0;
/** The share of a street side's length one tile of kerbside bays may take (056's P3). Only `street` is read here, by `blockSizesWork`; the tile city's table also has `avenue`. */
export const KERB_BAY_SHARE_MAX = { street: 0.3 } as const;
/** Grammar rule 10: every carriageway, kerb to kerb, is this wide (3 cells, 15 m). */
export const CARRIAGE_M = 15;

// ---- the split plan (ticket 070 A4) ----

/** A street's cross-section, in cells (grammar rule 10: pavement, parking or lane, two lane, pavement). */
export const STREET_CELLS = 5;
/** A piece of land is cut by a street where a side is at least this long: a block, a street and a block (6 + 5 + 6 = 17 cells). */
export const CUT_MIN_CELLS = BLOCK_TILES.min * 2 + STREET_CELLS;
/**
 * S3, PROVISIONAL (docs/design/070-streets-t-junctions.md, "Proposed rules"; Josh has not decided it; it waits for the pre-check and his eye on the flat picture):
 * two streets that end on the same street from opposite sides either line up (one crossroads) or have centre lines at least this many cells apart (7 cells, 35 m).
 */
export const JUNCTION_GAP_MIN_CELLS = 7;
/**
 * S5, PROVISIONAL (same note; not decided): at least this share of the junctions inside the city (none of its streets an edge street) are Ts (half).
 */
export const T_SHARE_MIN = 0.5;

// ---- one-way streets (ticket 070 A4b; docs/design/070-streets-one-way.md) ----

/** A street's width in cells by section, kerb to kerb across (pavement, carriageway, pavement). Josh, 20 Nov 2026: a one-way carriageway is "a maximum of 2 tiles wide. 1 for parking (discretionary), 1 for the road". */
export const SECTION_CELLS = { twoWay: 5, oneWay: 4, oneWayBare: 3 } as const;
/** A one-way street's carriageway, kerb to kerb, metres: with a parking tile 10, bare 5 (a two-way street's is `CARRIAGE_M`). */
export const ONE_WAY_CARRIAGE_M = { parking: 10, bare: 5 } as const;
/**
 * PROVISIONAL (the one-way note, section 3; Josh: "it is the street designers discretion"; he judges it on the flat picture; nothing pins it):
 * the share of the candidate streets (inner, not running edge to edge) that are one-way.
 */
export const ONE_WAY_SHARE = 0.4;
/** PROVISIONAL (same note): the share of the one-way streets that go without parking, where S10 allows it. */
export const ONE_WAY_BARE_SHARE = 1 / 3;
/** PROVISIONAL (same note): one painted arrow every this many lane cells (30 m) after the first lane cell past a junction. */
export const ONE_WAY_ARROW_EVERY = 6;

// ---- park places (ticket 070 A4c; Josh, 20 Nov 2026, the A4 pre-check's Q3: "yes") ----

/** A typed-in copy of `tilecity.ts`'s `PARK_ONE_IN_BLOCKS` (a test pins them equal): V4 needs one park in this many blocks, so S11 asks for `ceil(blocks / PARK_ONE_IN_BLOCKS)` park places. */
export const PARK_ONE_IN_BLOCKS = 6;
