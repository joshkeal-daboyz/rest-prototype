/**
 * Stage 3's constants. Moved from `src/render3d/tilecity.ts` and `town.ts` (ticket 070 C1) with their values unchanged; the old files keep their own copies until section L.
 * A stage never imports another stage's folder (R-1), so nothing here is read from stage 1 or 2.
 */

/** Rings of apron cells inside a court part, from ring 3 on (grammar rule 5, 19.4); the green starts after them. */
export const APRON_CELLS = 1;
/** A court part's two outer rings are built (grammar rule 4): ring 1 faces out, ring 2 faces in. A cell at distance less than this from its part's edge is built. */
export const BUILT_RINGS = 2;
/** The most green cells in a row or column before a path crosses them: 6 (30 m). */
export const GREEN_SPAN_MAX_CELLS = 6;
/** The pavement edge round a park's cells, in cells. */
export const PARK_EDGE_CELLS = 1;
/** A corner plaza takes one court part's corner in `PLAZA_ONE_IN` (town.ts, by hash of the part's id): one in four. */
export const PLAZA_ONE_IN = 4;
/** A plaza's side on the lattice, cells: two (`TILE_PLAZA_W_M` 10 m). */
export const PLAZA_CELLS = 2;
/** A row stretch between two openings, or between an opening and a corner, is at least this many cells: one building (grammar rule 6, `TERRACE_BAYS.min`). */
export const ROW_STRETCH_MIN_CELLS = 2;
/**
 * The tile city's floor for R1 (the share of the frontage that buildings cover): Josh, 19 Nov 2026, "Tile-city R1 floor 0.88". Here the share is counted from cells (see `frontageShare`).
 */
export const TILE_CITY_R1_MIN = 0.88;

// ---- units, lots and courts (ticket 070 C2). Moved from src/render3d/tilecity.ts with their values unchanged; the old file keeps its own copies until section L. ----

/** Short-stay stalls a home calls for in a lot (18.1). Josh's Q5 default: unchanged by the ring-2 homes (grammar rule 5). */
export const PARK_PER_HOME = 0.15;
/** A home is this many column-floors, and a block's upper floors are nominally this many over the base (18.2). */
export const HOME_COLUMN_FLOORS = 2;
export const UNIT_FLOORS_NOMINAL = 3;
/** A run of street frontage has one door column per this many columns, rounded up (`TERRACE_BAYS.max`, town.ts: a terrace is 2 to 4 columns, and each has one door). */
export const TERRACE_BAYS_MAX = 4;
/** A block holds at most this many lots, its own and borrowed together (18.4). Not raised here: that is Josh's call (grammar Q5). */
export const LOTS_PER_BLOCK_MAX = 2;
/** Stalls in a lot: two `ParkingLines_01` tiles of three (18.4). */
export const LOT_STALLS = 6;
/** The band the city's lot stalls must lie in, as a multiple of the demand (homes x `PARK_PER_HOME`): check P2. */
export const PARK_SUPPLY_BAND = { lo: 0.75, hi: 1.5 } as const;
/** The most blocks, as a share of the city, whose court did not fit and kept a frontage lot (19.4). */
export const CITY_FRONT_LOT_BLOCKS_MAX = 1 / 9;
/** At most one block in this many may be left short of its lots (18.6): `ceil(blocks / 9)`. */
export const SHORT_BLOCKS_ONE_IN = 9;
/** A drive, and a frontage lot, is this many cells wide along the part's edge, through both rings (grammar rule 6). */
export const DRIVE_CELLS = 2;
/** A court is `w` cells along the edge and `d` cells deep from ring 3: a row of stalls, an aisle and a row of stalls (19.4; 065 criterion 3: "stalls and aisle at rings 3 to 5"). */
export const COURT_CELLS = { w: 2, d: 3 } as const;
