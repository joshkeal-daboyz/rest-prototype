/**
 * The tile kit's cell types and numbers (ticket 055), as pure data. No three, no DOM, no assets, no circuit.
 *
 * Josh, 18 Nov 2026: the City Pack's roads are 5 m square tiles, so a city of them is laid on a 90 degree street grid, every street, junction, pavement, crossing and parking bay a whole cell of `TILE_M`.
 * Since ticket 070 L1 the pipeline's stages (`src/city/`) lay that city; the old tile city that this file also generated (`tileCity`, `planBlocks`, `withPassages`, `tileKeepouts`, `bayMeters`) went in ticket 081 A1
 * (070 L2d). What stays is what the pipeline's drawing (`plan3d.ts`), the tile sheet and the style guide's Numbers table read: the cell and role types, the flag bits of a cell's variant, and the constants the guide names.
 *
 * Conventions (everything is in metres unless a name says map units):
 * - The city starts at (0, 0). Cell (i, j) covers x in [i, i+1) * TILE_M and z in [j, j+1) * TILE_M.
 * - A cell's `yaw` is the turn about y (local +z, the front, points at `(sin yaw, cos yaw)` in the world) that the piece takes before `TILE_FRONTS`' offset for the real model. Its meaning by role, so the offset is one number per key:
 *   lane, parking, parkingPlain: front toward the street's centre line; pavement: front toward the carriageway (the kerb side); crossing: front along the walkers'
 *   direction (across the carriageway of the street it lies in, toward +across); junction: 0; pavementCorner: the corner points at the junction: yaw 0 means the
 *   corner's two kerb edges are on its +x and +z sides, 90 its +x and -z, 180 its -x and -z, 270 its -x and +z; kerbCut: as a pavement (front toward the carriageway); buildout: as a pavement (its kerb edge toward the street's centre line, the parking band's own yaw);
 *   lotSurface and plaza (cells inside a block): front toward the street the lot faces. A two-cell piece is 2 cells along its street
 *   (local x along the street) and its (x_m, z_m) is the middle of the pair, on a cell edge.
 */

import {
  AVENUE_ONE_IN,
  BLOCK_CV_MIN,
  BLOCK_DRAWS_MAX,
  BLOCK_FALLBACK_DEPTHS,
  BLOCK_FALLBACK_WIDTHS,
  BLOCK_LARGE_MIN_M,
  BLOCK_LONG_MIN_M,
  BLOCK_LONG_SHORT_MAX_M,
  BLOCK_MEAN_MIN_CELLS,
  BLOCK_NONSQUARE_MIN,
  BLOCK_SMALL_MAX_M,
  BLOCK_STEP_MIN_CELLS,
  BLOCK_TILES,
  CITY_BLOCKS_DEFAULT,
  CITY_BLOCKS_MAX,
  TILE_M,
  blockSizes,
  blockType,
  streetBandAt,
} from "../city/streets";
import type { CityStreetBand } from "../core";

// Stage 1 (ticket 070 A2): these names moved to src/city/streets/ and are re-exported so every importer stays as it was.
export {
  AVENUE_ONE_IN,
  BLOCK_CV_MIN,
  BLOCK_DRAWS_MAX,
  BLOCK_FALLBACK_DEPTHS,
  BLOCK_FALLBACK_WIDTHS,
  BLOCK_LARGE_MIN_M,
  BLOCK_LONG_MIN_M,
  BLOCK_LONG_SHORT_MAX_M,
  BLOCK_MEAN_MIN_CELLS,
  BLOCK_NONSQUARE_MIN,
  BLOCK_SMALL_MAX_M,
  BLOCK_STEP_MIN_CELLS,
  BLOCK_TILES,
  CITY_BLOCKS_DEFAULT,
  CITY_BLOCKS_MAX,
  TILE_M,
  blockSizes,
  blockType,
  streetBandAt,
};

// ---- constants (ticket 055) ----

/** The sidewalk tile's bounding height (its kerb lip): what the manifest's bounds say and what criterion 14's manifest check reads. The levels use `SIDEWALK_WALK_M`. */
export const SIDEWALK_TOP_M = 0.3;
/**
 * The sidewalk tile's walking surface, measured from the converted GLB (E, criterion 28, 18 Nov 2026): 0.23 m, with a 0.30 m lip on its kerb edge. The carriageway sits this far below the
 * walk (design item 7), and every sidewalk-family tile stands on the carriageway, so its walk is at 0 (shopfronts, yards and lots are flush with it) and its lip 0.07 m above.
 */
export const SIDEWALK_WALK_M = 0.23;
// Stage 1's constants (TILE_M, CITY_BLOCKS_*, BLOCK_*, AVENUE_ONE_IN) live in src/city/streets/constants.ts since ticket 070 A2; their reasons are in that file and in this file's git history. They are re-exported above.
/** Parking cells next to a junction box (the cross street's whole cross-section) that hold no bay. */
export const BAY_JUNCTION_CLEAR = 1;
/** Bays in one `ParkingLines_01` tile (10 m by 5 m): 3, from the GLB (E, 18 Nov 2026: its dividers stand at x of about -5, -1.75, +1.6 and +5, so three bays of about 3.3 m). */
export const BAYS_PER_PARKING_TILE = 3;
/** One pavement cell in this many is a `Sidewalk_Grate_01`, by hash. */
export const GRATE_ONE_IN = 6;
/** One lane cell in this many carries a `Road_Patch_01` decal, by hash. */
export const PATCH_ONE_IN = 12;
/**
 * A pole slot stands this far in from the cell's kerb edge, on the pavement. The pack's kerb face stands 0.66 m inside that edge (063 F, `KERB_FACES_M`), so a pole stands 0.09 m behind the face (the ticket's 0.10 m): 059 reads this and
 * keeps it. The layout's own kerbs (`Town.kerbs`, `TileStreet.carriage`) stay on the cell edge.
 */
export const POLE_SLOT_FROM_KERB_M = 0.75;
/** Pole slots are this far apart along a pavement side: one `Power_Cables_01` span (12.45 m) and a pole. */
export const POLE_SLOT_PITCH_M = 12.5;
/** The first slot of a side is this far from the side's first corner, and the last this far from its second. */
export const POLE_SLOT_END_CLEAR_M = 2.5;
/**
 * How the tile city's terrace stacks line up in z (ticket 057 A, 19.1): on their measured wall plane (`facade.ts`), which is the lot's front line, which is the pavement's back edge, so a
 * shop or storey stands on the pavement or up to 0.6 m over it (0.557 m at most today) and never behind it. The ladder keeps "back" (this is `StackAlign`'s "wall"; the type is not imported here, so the file keeps to the imports its purity test allows). `packTown` takes this from the runs' `frame` below (every tile-city run has
 * one and no ladder run does), and the tests pass this constant to it as well.
 */
export const TILE_STACK_ALIGN = "wall" as const;
/**
 * The tile city's floor for R1 (the share of all runs' frontage that blocks cover): Josh, 19 Nov 2026, "Tile-city R1 floor 0.88 (Recommended)". Alleys and parks (057 G) cut the runs short (an alley's two rows end on
 * its lane and close as gated passages of about 3.7 m), and R1 sits at 0.897 to 0.916 on the cities of the ticket against the ladder's 0.9. The ladder's `CITY_CHECK.R1` stays 0.9; the other three conditions of R1 (no gap between
 * neighbours, at most one lot and one plaza to a run) are unchanged.
 */
export const TILE_CITY_R1_MIN = 0.88;
/** The tile city's floor for R7 (the share of qualifying blocks with a fire escape): Josh, 18 Nov 2026, "Just choose the recommended option for now". The ladder's `CITY_CHECK.R7` stays 0.5. */
export const TILE_CITY_R7_MIN = 0.4;
/**
 * The tile city's floor for R6 (the share of shop bays with a sign): Josh, 18 Nov 2026, "Lower it to 0.45 (Recommended)". R6 sits at 0.49 to 0.55 on the tile city whatever the layout, by the dressing's own sign
 * chance (dressing.ts) over about 170 shop bays, so the ladder's 0.5 would fail on a hair for a layout that moves a lot. The ladder's `CITY_CHECK.R6` stays 0.5; the ATM share (`CITY_ATM_BLOCKS_MIN`) is unchanged.
 */
export const TILE_CITY_R6_MIN = 0.45;
/**
 * How far in from its corner a row of a tile city starts, metres (ticket 057 B, 19.2): not at all. Josh, 18 Nov 2026: "It is not okay if the buildings sit recessed from the sidewalk and leave a gap of
 * nothing between them." This replaces 055 B's inset ("Keep the inset", `tileRowInset_m`, up to `TILE_INSET_MAX_M`), which left a strip of nothing at every block corner. The row's first block's flank
 * meets the cross street's pavement; the length that is left goes to the row's far end (the packer's seam, overshoot or gated passage, `terrace.ts`).
 */
export const TILE_ROW_INSET_M = 0;
/**
 * How far a run's last block may stand inside the next row's corner block, metres, to close the row's far end (an "overshoot": the two walls meet inside, where nothing shows; 19.2). The packer
 * (`terrace.ts`) takes it by default only for a run with a pavement frame (the tile city's); a ladder run has none, so it closes as it did. Kept here, not in `terrace.ts`, so the packer's own
 * exports are the ladder's.
 */
export const END_OVERLAP_MAX_M = 1.0;
/** A gated passage (19.2): whatever far gap is left, from 1.0 m to one column wide (5.3 m), closed at the wall line by a gate and posts. */
export const PASSAGE_W_M = { min: 1.0, max: 5.3 } as const;
/** How deep a gated passage's floor ran in from the pavement's back edge: one cell, to the apron strip behind it (the old city's `TilePassage`, gone in ticket 081 A1; the guide's Numbers table still names it). */
export const PASSAGE_FLOOR_DEPTH_M = TILE_M;
/** A plaza's side on the tile grid, metres: two cells (the ladder's is 10.4). */
export const TILE_PLAZA_W_M = 10;
/** Short-stay kerbside bays per shop (ticket 056, 18.1): one in three. Shoppers park at the kerb. */
export const PARK_PER_SHOP = 1 / 3;
/** Lot stalls per home (18.1): residents park off the street. About half of what a real dense terraced core provides, because the camera reads every drawn stall at full size. */
export const PARK_PER_HOME = 0.15;
/** A home is this many column-floors (2 x 5.2 m x 6 m, about 62 m2) and a block's upper floors are nominally this many over the base (18.2; the packed plan measures 2.97). */
export const HOME_COLUMN_FLOORS = 2;
export const UNIT_FLOORS_NOMINAL = 3;
/** Every block's shoppers get at least this many `ParkingLines_01` tiles of kerbside bays, its own or across one street (18.3). */
export const BAY_TILES_PER_BLOCK_MIN = 1;
/** A run of bays is at most this many tiles (20 m, 6 bays), and two runs on one side have at least `KERB_GAP_MIN_M` of kerb without bays between them. */
export const BAY_RUN_TILES_MAX = 2;
export const KERB_GAP_MIN_M = 10;
/** At most this share of a block side's kerb is bays, by the street's profile; and the city has at most `BAYS_PER_100M_MAX` bays per 100 m of block kerb. */
export const KERB_BAY_SHARE_MAX = { avenue: 0.4, street: 0.3 } as const;
export const BAYS_PER_100M_MAX = 6;
/** A block holds at most this many parking lots, its own and borrowed together, and a lot has `LOT_STALLS` stalls (two `ParkingLines_01` tiles, 18.4). */
export const LOTS_PER_BLOCK_MAX = 2;
export const LOT_STALLS = 2 * BAYS_PER_PARKING_TILE;
/** The band the city's kerb bays and lot stalls must lie in, as a multiple of the demand (shops x `PARK_PER_SHOP`, homes x `PARK_PER_HOME`): checks P1 and P2. */
export const PARK_SUPPLY_BAND = { lo: 0.75, hi: 1.5 } as const;
/** In a stretch of build-out cells, every this-many-th carries a street tree (one every 10 m), never one next to a crossing (18.5). */
export const BUILDOUT_TREE_EVERY = 2;
/** A run shorter than this, metres, cannot hold a snapped parking lot with a lot before it and two bays after it, so a forced lot is not tried on it. */
export const TILE_PARK_MIN_RUN_M = 35;

// ---- block interiors (ticket 057 C) ----

/**
 * A residents' court unit, in cells: `w` along the block's edge (10 m, the width of the opening in the row) and `d` away from it (15 m): a row of three stalls (a `ParkingLines_01` tile), a 5 m aisle and
 * a second row of stalls, behind the drive. Six stalls (`LOT_STALLS`). The aisle's two ends open on the apron beside the court, so a car reaches it over pavement.
 */
export const COURT_CELLS = { w: 2, d: 3 } as const;
/**
 * The drive through the row, in cells along the edge: 2 (10 m). The ticket drafted 1 (5 m), but 056's parking lot is a fixed 10 m opening of `terraceBlockRows` (town.ts, which 057 may not touch), so the
 * drive takes the whole opening; the kerb cut and the plain parking cells in front of it are 056's, unchanged. One cell needs a `parkW_m` option in town.ts (a re-cut).
 */
export const DRIVE_CELLS = 2;
/** Whole rings of apron cells inside the strip: ring 2 (the strip the terraces' backs stand over) is always apron, and this many more rings after it. 0 gives about half the interior to grass (Q1). */
export const APRON_CELLS = 1;
/** The most green cells in a row or column before a path crosses them: 6 (30 m). */
export const GREEN_SPAN_MAX_CELLS = 6;
/** One green cell in this many carries a tree, by hash (optional dressing; the draw may drop them). */
export const GREEN_TREE_ONE_IN = 3;
/** The most blocks, as a share of the city, whose court did not fit and kept 056's frontage lot. */
export const CITY_FRONT_LOT_BLOCKS_MAX = 1 / 9;

// ---- alleys and parks (ticket 057 G) ----

/** Every city has at least one alley per this many blocks (19.6): where too few blocks qualify, the longest blocks take one, in id order. */
export const ALLEY_ONE_IN_BLOCKS = 4;
/** An alley is one cell (5 m) wide. */
export const ALLEY_CELLS = 1;
/** A bin stands beside the lane every this many metres along it (19.6). Never in the lane, never in an end cell (the mouth and its kerb cut). */
export const ALLEY_BIN_EVERY_M = 10;
/** A bin stands this far from the lane's centre line: the lane's half width and 0.8 m, so on the apron beside it and clear of the lane by 0.3 m (a bin is under 1 m wide). */
export const ALLEY_BIN_OFFSET_M = (ALLEY_CELLS * TILE_M) / 2 + 0.8;
/** A block with a side of this many metres or more (14 cells) gets an alley whatever its type; a long block always does (19.6). */
export const ALLEY_SIDE_LONG_M = 70;
/** A block needs a side of at least this many cells to be split (9 cells, 45 m: each part is then 4 cells or more, room for a court), so the top-up ("the longest blocks take one") never splits a smaller one. */
export const ALLEY_SIDE_MIN_CELLS = 9;
/** A part of an alley block this many cells wide or more (from the lane to the far band's rear strip: 4 cells of court and 2 of margin) holds the block's alley court, and so does a lane this many cells long (2 cells of court between 2 of margin each end, less the band). */
export const ALLEY_COURT_PART_MIN_CELLS = 6;
export const ALLEY_COURT_LANE_MIN_CELLS = 6;
/** There is at least one park per this many blocks (19.6). */
export const PARK_ONE_IN_BLOCKS = 6;
/** A park's pavement edge is this many cells wide, round the whole of a whole-block park and round the half a large block gives (19.6). */
export const PARK_EDGE_CELLS = 1;
/** A block needs a short side of at least this many cells (45 m) to give a half to a park: the park gets half the short side (rounded down) and the built half the rest, at least 5 cells. */
export const PARK_HALF_SIDE_MIN_CELLS = 9;
/** A bench stands this far from its path's edge, metres (its own depth is under 1 m, so it is clear of the path by at least 0.5 m); a tree stands at a cell's middle, 2.5 m from every path. */
export const BENCH_FROM_PATH_M = 1.0;
/** `InteriorCell.variant` of an apron cell: 1 for ring 2, the strip the terraces' backs stand over (drawn in code, never a pack tile); 0 for a whole apron cell. */
export const APRON_STRIP = 1;
/** `InteriorCell.variant` of a court cell: 0 for a row of stalls, 1 for the aisle. */
export const COURT_STALLS = 0;
export const COURT_AISLE = 1;

/** `TileCell.variant` of a lane cell: bit 0 is 0 for the lane on the street's left (first in `bands`) and 1 for its right; bit 1 is set when a patch decal lies on it. */
export const LANE_RIGHT = 1;
export const LANE_PATCH = 2;
/**
 * `TileCell.variant` of a pavement cell: 0 is the plain `Sidewalk_Straight_02` (063 A: the one plain straight, so the sidewalk is one colour), 1 is `Sidewalk_Grate_01` (one cell in `GRATE_ONE_IN`). A build-out's variant is always 0.
 * 063 F (the kerb): three more bits, all on a plain cell (never a grate). `PAVEMENT_RETURN_NEAR` marks the pavement cell just before a kerb cut's first cell along its street (increasing x or z), `PAVEMENT_RETURN_FAR` the one just
 * after its last: the cells whose side edge carries the inlet's return kerb (kerbline.ts), from the street kerb to the building line. `PAVEMENT_FLUSH` marks a pavement cell whose carriageway side is a build-out: it has no kerb and no gutter,
 * and is drawn as a flat slab at the walk, so the pavement runs on, level, to the build-out. A cell can be flush and a return together.
 */
export const PAVEMENT_GRATE = 1;
export const PAVEMENT_RETURN_NEAR = 2;
export const PAVEMENT_RETURN_FAR = 4;
export const PAVEMENT_FLUSH = 8;

// ---- types ----

export type TileRole =
  | "lane"
  | "parking"
  | "parkingPlain"
  | "junction"
  | "crossing"
  | "pavement"
  | "pavementCorner"
  | "kerbCut"
  | "buildout"
  | "lotSurface"
  | "plaza";

export type TileBand = CityStreetBand;
export type TileYaw = 0 | 90 | 180 | 270;

export interface TileCell {
  /** The cell's column and row (the first of the two for a 2-cell piece: the lower i along an "x" street, the lower j along a "z" street). */
  i: number;
  j: number;
  cells: 1 | 2;
  role: TileRole;
  /** Which model of the role's set (see `LANE_RIGHT`, `LANE_PATCH`, `PAVEMENT_GRATE`); 0 for every other role. */
  variant: number;
  /** The piece's centre, metres: (i + 0.5) * TILE_M, or a cell edge along the street for a 2-cell piece. */
  x_m: number;
  z_m: number;
  yaw: TileYaw;
  /** The street the cell belongs to: a band cell's own street, a crossing's carriageway street; null for a junction or a corner (two streets). */
  street: string | null;
}

/**
 * What a block's inside is made of (057 C). `apron`, `court`, `drive`, `green` and `greenPath` partition every interior cell. They are kept apart from `TileCity.cells` and `TileRole` on purpose: a
 * court's drive and its first row of stalls are also the `lotSurface` cells 056 laid (the drawing still draws those), and `TILE_SLOTS` (tileslots.ts, section D's) is exhaustive over `TileRole`.
 */
export type InteriorRole = "apron" | "court" | "drive" | "green" | "greenPath" | "alley" | "parkEdge";

/** A street tree on a build-out cell, at the cell's centre, metres. */
export interface BuildoutTree {
  x_m: number;
  z_m: number;
  street: string;
}
