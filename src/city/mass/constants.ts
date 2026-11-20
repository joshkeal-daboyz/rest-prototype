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
