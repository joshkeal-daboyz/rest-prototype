/**
 * The tile-street city (ticket 055, section A), as pure data. No three, no DOM, no assets, no circuit.
 *
 * Josh, 18 Nov 2026: the City Pack's roads are 5 m square tiles, so a city of them has to be laid on a 90 degree street grid. This file lays that grid:
 * every street, junction, pavement, crossing and parking bay is a whole cell of `TILE_M` (or, for the parking lines, two cells along its street), and the result is
 * handed on as a normal `Town` (map units, times `WORLD_PER_METRE`) so the rest of the pipeline can run on it. Section B adds the blocks' terraces and open lots
 * (`terraceBlockRows` from town.ts, on the pavement's back edge with no setback), a kerb cut and lot surface for every parking lot, and the furniture keep-outs; drawing is
 * section C. The town has roads, kerbs, pavements, pads (the junction boxes), blocks, terrace lots and runs and open lots, and no place.
 *
 * Parking (ticket 056 A, chapter 18 of the style guide): how much parking a block gets is a rule of its units, not of its kerb. Shoppers park at the kerb: a block's shops (a column that is not a
 * lot's door column) call for `PARK_PER_SHOP` bays each, laid as short runs of `ParkingLines_01` tiles on the block's own parking sides (avenues first), or on the band across its longest street when
 * it has none with room. Residents park off the street: a block's homes call for `PARK_PER_HOME` stalls each, laid as one or two 10 m parking lots in its rows (or a neighbour's across a street).
 * The rest of the parking band is a `buildout` (a pavement-level tile with a street tree on every second cell of a stretch), except the cells in front of a kerb cut and the outer side of an
 * edge street, which stay plain asphalt. `parkmetrics.ts` holds the layout to those rules (checks P1 to P6).
 *
 * Conventions (everything below is in metres unless a name says map units):
 * - The city starts at (0, 0). Cell (i, j) covers x in [i, i+1) * TILE_M and z in [j, j+1) * TILE_M. Streets run on every grid line, the four edges included.
 * - A street's `axis` is the axis it runs along: an "x" street runs along +x on grid row `line` (counted from z = 0), a "z" street runs along +z on grid column `line`
 *   (counted from x = 0). Its `bands` are its cross-section, kerb to kerb, listed from its left looking along +x or +z. Looking along +x (z grows toward the viewer) the
 *   left is -z; looking along +z the left is +x. So an "x" street's band k is cell row `across0 + k` and a "z" street's band k is cell column `across0 + n - 1 - k`.
 * - A cell's `yaw` is the turn about y (the `Lot` convention: local +z, the front, points at `(sin yaw, cos yaw)` in the world) that the piece takes before section C's
 *   `TILE_FRONTS` offset for the real model. Its meaning by role, so the offset is one number per key:
 *   lane, parking, parkingPlain: front toward the street's centre line; pavement: front toward the carriageway (the kerb side); crossing: front along the walkers'
 *   direction (across the carriageway of the street it lies in, toward +across); junction: 0; pavementCorner: the corner points at the junction: yaw 0 means the
 *   corner's two kerb edges are on its +x and +z sides, 90 its +x and -z, 180 its -x and -z, 270 its -x and +z; kerbCut: as a pavement (front toward the carriageway); buildout: as a pavement (its kerb edge toward the street's centre line, the parking band's own yaw);
 *   lotSurface and plaza (section B, cells inside a block): front toward the street the lot faces. A two-cell piece is 2 cells along its street
 *   (local x along the street) and its (x_m, z_m) is the middle of the pair, on a cell edge.
 * - Every choice is a `stableHash` of a key with the seed, so a size and a seed give one city every time.
 */

import type { CityRect } from "../render/city";
import { stableHash } from "../render/city";
import { METERS, type FurniturePiece, type Rect } from "./furniture";
import { WORLD_PER_METRE, terraceBlockRows, terraceRunKey, type CornerSide, type Kerb, type Lot, type OpenLot, type Pad, type Pavement, type Pt, type Road, type TerraceBox, type TerraceRun, type TerraceSide, type Town, type TownBlock } from "./town";

// ---- constants (ticket 055) ----

/** One tile, metres: the City Pack's road and pavement tiles are 5 m squares. */
export const TILE_M = 5;
/** The sidewalk tile's bounding height (its kerb lip): what the manifest's bounds say and what criterion 14's manifest check reads. The levels use `SIDEWALK_WALK_M`. */
export const SIDEWALK_TOP_M = 0.3;
/**
 * The sidewalk tile's walking surface, measured from the converted GLB (E, criterion 28, 18 Nov 2026): 0.23 m, with a 0.30 m lip on its kerb edge. The carriageway sits this far below the
 * walk (design item 7), and every sidewalk-family tile stands on the carriageway, so its walk is at 0 (shopfronts, yards and lots are flush with it) and its lip 0.07 m above.
 */
export const SIDEWALK_WALK_M = 0.23;
/** The most blocks along either axis (tests build 6 x 6 at the most). */
export const CITY_BLOCKS_MAX = 6;
/** The blocks along each axis when none are asked for. */
export const CITY_BLOCKS_DEFAULT = 3;
/** A block's side, in cells (40 to 60 m). */
export const BLOCK_TILES = { min: 8, max: 12 } as const;
/** One interior grid line in this many is an avenue, by hash. */
export const AVENUE_ONE_IN = 3;
/** Parking cells next to a junction box (the cross street's whole cross-section) that hold no bay. */
export const BAY_JUNCTION_CLEAR = 1;
/** Bays in one `ParkingLines_01` tile (10 m by 5 m): 3, from the GLB (E, 18 Nov 2026: its dividers stand at x of about -5, -1.75, +1.6 and +5, so three bays of about 3.3 m). */
export const BAYS_PER_PARKING_TILE = 3;
/** One pavement cell in this many is a `Sidewalk_Grate_01`, by hash. */
export const GRATE_ONE_IN = 6;
/** One lane cell in this many carries a `Road_Patch_01` decal, by hash. */
export const PATCH_ONE_IN = 12;
/** A pole slot stands this far in from the kerb face, on the pavement. */
export const POLE_SLOT_FROM_KERB_M = 0.75;
/** Pole slots are this far apart along a pavement side: one `Power_Cables_01` span (12.45 m) and a pole. */
export const POLE_SLOT_PITCH_M = 12.5;
/** The first slot of a side is this far from the side's first corner, and the last this far from its second. */
export const POLE_SLOT_END_CLEAR_M = 2.5;
/** The row-fit numbers (see `tileRowInset_m`): the corner block's depth, the alley left at a row's far end, and the width the row's columns are fitted to, metres. */
export const TILE_CORNER_DEPTH_M = 5.75;
export const TILE_ALLEY_M = 1.25;
export const TILE_COLUMN_M = 5.2;
/** The widest column the inset fits to when 5.2 m columns would leave an inset over `TILE_INSET_MAX_M` (the widest apartment column is 5.281 m). */
export const TILE_COLUMN_WIDE_M = 5.28;
/** The most a row stands back from its corner, metres: a margin of 0.25 m under the ladder's `CORNER_GAP` (0.5 map units, 2.78 m), so the first lot still meets the cross street. */
export const TILE_INSET_MAX_M = 2.5;
/** The tile city's floor for R7 (the share of qualifying blocks with a fire escape): Josh, 18 Nov 2026, "Just choose the recommended option for now". The ladder's `CITY_CHECK.R7` stays 0.5. */
export const TILE_CITY_R7_MIN = 0.4;
/**
 * How far in from its corner a row of a tile city starts, metres, for a block side of `side_m`. A side is a whole number of cells, so `side - 6` (a row's length) is never a length the
 * packer's 5.0 to 5.28 m columns can close to a seam or an alley (chapter 16.2): the wall at the far end is `side - corner depth`, and n columns reach only 5.0n to 5.28n of it.
 * The row therefore stands back from its first corner by the rest: with n columns of `TILE_COLUMN_M` and an alley of `TILE_ALLEY_M` at the far end, the inset is what is left of
 * `side - corner depth`. It is 0 when the columns need no help, and stays inside `CORNER_GAP` of the cross street, so the first lot is still a corner lot.
 */
export function tileRowInset_m(side_m: number, endsAtPlaza = false, startsAfterPlaza = false): number {
  const base = side_m - (startsAfterPlaza ? TILE_PLAZA_W_M : 0) - (endsAtPlaza ? TILE_PLAZA_W_M : TILE_CORNER_DEPTH_M) - TILE_ALLEY_M;
  const n = Math.max(1, Math.floor(base / 5));
  const inset = Math.max(0, base - n * TILE_COLUMN_M);
  // Where the usual columns would leave too much, fit to the widest ones instead (never more than `TILE_INSET_MAX_M`).
  return inset <= TILE_INSET_MAX_M ? inset : Math.min(TILE_INSET_MAX_M, Math.max(0, base - n * TILE_COLUMN_WIDE_M));
}
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
/**
 * Which of two runs of about the same length takes a block's lot (a hash of the run and this number). The number itself carries no meaning: it was chosen so that the dressing's own statistics on the
 * ladder of test cities (the default and seeds 1 to 10 at 3 x 3: R6, the share of signed shops, at least 0.5, and R7 at the tile city's floor) hold with the lots where 056 puts them, as they did with
 * 055 B's three. Any layout change that moves the lots may need another number.
 */
const LOT_RUN_SALT = 46;
/** A run shorter than this, metres, cannot hold a snapped parking lot with a lot before it and two bays after it, so a forced lot is not tried on it. */
export const TILE_PARK_MIN_RUN_M = 35;

/** `TileCell.variant` of a lane cell: bit 0 is 0 for the lane on the street's left (first in `bands`) and 1 for its right; bit 1 is set when a patch decal lies on it. */
export const LANE_RIGHT = 1;
export const LANE_PATCH = 2;
/** `TileCell.variant` of a pavement cell: 0 is `Sidewalk_Straight_01`, 1 is `_02`, 2 is `Sidewalk_Grate_01`. */
export const PAVEMENT_STRAIGHT_2 = 1;
export const PAVEMENT_GRATE = 2;

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

export type TileBand = "pavement" | "parking" | "lane";
export type TileYaw = 0 | 90 | 180 | 270;

export interface TileCell {
  /** The cell's column and row (the first of the two for a 2-cell piece: the lower i along an "x" street, the lower j along a "z" street). */
  i: number;
  j: number;
  cells: 1 | 2;
  role: TileRole;
  /** Which model of the role's set (see `LANE_RIGHT`, `LANE_PATCH`, `PAVEMENT_STRAIGHT_2`, `PAVEMENT_GRATE`); 0 for every other role. */
  variant: number;
  /** The piece's centre, metres: (i + 0.5) * TILE_M, or a cell edge along the street for a 2-cell piece. */
  x_m: number;
  z_m: number;
  yaw: TileYaw;
  /** The street the cell belongs to: a band cell's own street, a crossing's carriageway street; null for a junction or a corner (two streets). */
  street: string | null;
}

export interface TileStreet {
  /** "x:<line>" or "z:<line>". */
  id: string;
  axis: "x" | "z";
  line: number;
  profile: "avenue" | "street";
  bands: readonly TileBand[];
  /** The first cell (row for an "x" street, column for a "z" street) of its cross-section. */
  across0: number;
  /** The carriageway (parking and lanes), kerb to kerb, as coordinates across the street (z for an "x" street, x for a "z" street), metres. */
  carriage: { readonly lo_m: number; readonly hi_m: number };
  /** The centre line, between the two lanes, same coordinate. */
  centre_m: number;
}

export interface ParkingBay {
  x_m: number;
  z_m: number;
  yaw: number;
  /** Along the street, and across it. */
  w_m: number;
  d_m: number;
  street: string;
  /** The block the bay's side faces (`block:<bi>:<bj>`), or "outer" on the outside of an edge street (056 lays no bay there). */
  block: string;
  /**
   * The block whose quota the bay counts toward: usually `block`. A block with no parking side of its own, or none with room, is served from the band across its longest street (18.6),
   * and for a lot stall the block it serves may be a neighbour of the block the lot stands in.
   */
  serves: string;
}

export interface PoleSlot {
  x_m: number;
  z_m: number;
  street: string;
  /** Which side of the street's centre line, as `Kerb.side`: the sign along the normal (-uz, ux) of the street's direction (+x or +z). */
  side: 1 | -1;
}

/** A block in cells: columns `i0` to `i1` and rows `j0` to `j1`, both ends exclusive on the high side. Its id is `Town.blocks`'s. */
export interface TileBlock {
  id: string;
  bi: number;
  bj: number;
  i0: number;
  i1: number;
  j0: number;
  j1: number;
  /** What the block holds, counted from its nominal terrace lots (18.2, before any parking lot is laid): columns (5.2 m bays), shops (columns less one door column per lot) and homes. */
  units: { columns: number; shops: number; homes: number };
  /** What the quotas could not place (18.6): stalls of the block's lots and bays of its kerb quota; both 0 when met. */
  parkingShort: { stalls: number; bays: number };
  /** Parking lots serving this block: its own and borrowed from a neighbour across a street. */
  lots: number;
}

/** A street tree on a build-out cell, at the cell's centre, metres. */
export interface BuildoutTree {
  x_m: number;
  z_m: number;
  street: string;
}

export interface TileCity {
  blocksX: number;
  blocksZ: number;
  seed: number;
  cells: readonly TileCell[];
  streets: readonly TileStreet[];
  bays: readonly ParkingBay[];
  /** Every stall of every parking lot (6 per lot: two rows of three), the same record shape as a bay: `street` is the lot's street, `block` the block it stands in, `serves` the block it counts toward. */
  lotStalls: readonly ParkingBay[];
  /** One tree on every `BUILDOUT_TREE_EVERY`-th cell of each stretch of build-outs, never next to a crossing. */
  buildoutTrees: readonly BuildoutTree[];
  poleSlots: readonly PoleSlot[];
  blocks: readonly TileBlock[];
  town: Town;
}

// ---- cross-sections ----

const AVENUE_BANDS: readonly TileBand[] = ["pavement", "parking", "lane", "lane", "parking", "pavement"];
const STREET_BANDS_LEFT: readonly TileBand[] = ["pavement", "parking", "lane", "lane", "pavement"];
const STREET_BANDS_RIGHT: readonly TileBand[] = ["pavement", "lane", "lane", "parking", "pavement"];

/** The band of `street` at cell row (x street) or column (z street) `across`, or null when the cell is outside its cross-section. */
export function streetBandAt(street: Pick<TileStreet, "axis" | "bands" | "across0">, across: number): TileBand | null {
  const n = street.bands.length;
  const o = across - street.across0;
  if (o < 0 || o >= n) return null;
  return street.bands[street.axis === "x" ? o : n - 1 - o] ?? null;
}

// ---- layout of one axis ----

interface AxisStreet {
  line: number;
  first: number;
  profile: "avenue" | "street";
  bands: readonly TileBand[];
}
interface AxisLayout {
  streets: AxisStreet[];
  blocks: { first: number; len: number }[];
  total: number;
}

const hashOf = (seed: number, ...key: (string | number)[]): number => stableHash(`tile:${seed}:${key.join(":")}`);

/** `streetAxis` is the axis the streets of this layout run along ("z" streets stand at columns, so their layout counts cells along x). */
function layoutAxis(seed: number, streetAxis: "x" | "z", blocks: number): AxisLayout {
  const lines = blocks + 1;
  const avenue: boolean[] = [];
  for (let l = 0; l < lines; l++) avenue.push(l > 0 && l < lines - 1 && hashOf(seed, streetAxis, "avenue", l) % AVENUE_ONE_IN === 0);
  if (lines >= 3 && !avenue.some(Boolean)) {
    let best = 1;
    let bh = Infinity;
    for (let l = 1; l < lines - 1; l++) {
      const h = hashOf(seed, streetAxis, "avenue", l);
      if (h < bh) {
        bh = h;
        best = l;
      }
    }
    avenue[best] = true;
  }
  const out: AxisLayout = { streets: [], blocks: [], total: 0 };
  let pos = 0;
  for (let l = 0; l < lines; l++) {
    const bands = avenue[l] ? AVENUE_BANDS : hashOf(seed, streetAxis, "park", l) % 2 === 0 ? STREET_BANDS_LEFT : STREET_BANDS_RIGHT;
    out.streets.push({ line: l, first: pos, profile: avenue[l] ? "avenue" : "street", bands });
    pos += bands.length;
    if (l < blocks) {
      const len = BLOCK_TILES.min + (hashOf(seed, streetAxis, "block", l) % (BLOCK_TILES.max - BLOCK_TILES.min + 1));
      out.blocks.push({ first: pos, len });
      pos += len;
    }
  }
  out.total = pos;
  return out;
}

// ---- helpers ----

/** A block's cells, before the parking rules have said what it holds. */
type BlockBase = Omit<TileBlock, "units" | "parkingShort" | "lots">;

/** What a block holds, from its nominal terrace lots (18.2): `columns` is the lots' bays, a shop is a column that is not a lot's door column, a home is `HOME_COLUMN_FLOORS` column-floors of the `UNIT_FLOORS_NOMINAL` over the base. */
const unitsOf = (columns: number, lots: number): TileBlock["units"] => ({ columns, shops: Math.max(0, columns - lots), homes: Math.floor((columns * UNIT_FLOORS_NOMINAL) / HOME_COLUMN_FLOORS) });

const clampBlocks = (v: number | undefined): number => {
  if (v === undefined || !Number.isFinite(v)) return CITY_BLOCKS_DEFAULT;
  return Math.min(CITY_BLOCKS_MAX, Math.max(1, Math.floor(v)));
};

/** The yaw that points a piece's front toward +across (sign 1) or -across (sign -1) of a street running along `axis`. */
function yawToward(axis: "x" | "z", sign: number): TileYaw {
  if (axis === "x") return sign > 0 ? 0 : 180;
  return sign > 0 ? 90 : 270;
}

/** A corner's yaw from the signs (along x, along z) toward the junction it points at. */
function cornerYaw(sx: number, sz: number): TileYaw {
  if (sx > 0) return sz > 0 ? 0 : 90;
  return sz > 0 ? 270 : 180;
}

/** The side (`Kerb.side`) a coordinate direction across a street is: an "x" street's normal is +z, a "z" street's is -x. */
const sideOf = (axis: "x" | "z", coordSign: number): 1 | -1 => ((axis === "x" ? coordSign : -coordSign) > 0 ? 1 : -1);

function deepFreeze<T>(o: T): T {
  if (typeof o === "object" && o !== null && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}

// ---- the city ----

/** A city of tile streets on a 90 degree grid: `blocksX` by `blocksZ` blocks (each 1 to `CITY_BLOCKS_MAX`, default 3), `seed` (an integer, default 1). Pure, deterministic and frozen. */
export function tileCity(opts: { blocksX?: number; blocksZ?: number; seed?: number } = {}): TileCity {
  const blocksX = clampBlocks(opts.blocksX);
  const blocksZ = clampBlocks(opts.blocksZ);
  const seed = opts.seed !== undefined && Number.isFinite(opts.seed) ? Math.trunc(opts.seed) : 1;
  const u = WORLD_PER_METRE;

  // Columns hold the "z" streets (which run along z) and the block widths; rows hold the "x" streets and the block depths.
  const cols = layoutAxis(seed, "z", blocksX);
  const rows = layoutAxis(seed, "x", blocksZ);
  const W = cols.total;
  const H = rows.total;

  const streets: TileStreet[] = [];
  const mkStreet = (axis: "x" | "z", a: AxisStreet): TileStreet => {
    const n = a.bands.length;
    // Pavements are the first and last band of every profile, so the carriageway is the cells between them, in either direction.
    const lo = (a.first + 1) * TILE_M;
    const hi = (a.first + n - 1) * TILE_M;
    const lane0 = a.bands.indexOf("lane");
    const centre = axis === "x" ? (a.first + lane0 + 1) * TILE_M : (a.first + n - 1 - lane0) * TILE_M;
    return { id: `${axis}:${a.line}`, axis, line: a.line, profile: a.profile, bands: a.bands, across0: a.first, carriage: { lo_m: lo, hi_m: hi }, centre_m: centre };
  };
  const xStreets = rows.streets.map((a) => mkStreet("x", a));
  const zStreets = cols.streets.map((a) => mkStreet("z", a));
  streets.push(...xStreets, ...zStreets);

  // Which street and band each column and row belongs to.
  const colStreet = new Int16Array(W).fill(-1);
  const colBand = new Int16Array(W).fill(-1);
  const rowStreet = new Int16Array(H).fill(-1);
  const rowBand = new Int16Array(H).fill(-1);
  for (const a of cols.streets) {
    const n = a.bands.length;
    for (let k = 0; k < n; k++) {
      colStreet[a.first + n - 1 - k] = a.line;
      colBand[a.first + n - 1 - k] = k;
    }
  }
  for (const a of rows.streets) {
    for (let k = 0; k < a.bands.length; k++) {
      rowStreet[a.first + k] = a.line;
      rowBand[a.first + k] = k;
    }
  }

  // ---- the role of every cell: the band rule ----
  const role: (TileRole | null)[] = new Array<TileRole | null>(W * H).fill(null);
  /** A cell's own street index (a band cell) or the carriageway street a crossing lies in; -1 for a junction or a corner. */
  const owner = new Array<TileStreet | null>(W * H).fill(null);
  /** The cell's band index in its street (single-street cells). */
  const bandIdx = new Int16Array(W * H).fill(-1);
  const isCarriage = (b: TileBand): boolean => b === "lane" || b === "parking";
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const idx = j * W + i;
      const zs = colStreet[i]! >= 0 ? zStreets[colStreet[i]!]! : null;
      const xs = rowStreet[j]! >= 0 ? xStreets[rowStreet[j]!]! : null;
      if (!zs && !xs) continue;
      const vb = zs ? zs.bands[colBand[i]!]! : null;
      const hb = xs ? xs.bands[rowBand[j]!]! : null;
      if (vb && !hb) {
        role[idx] = vb === "parking" ? "parkingPlain" : vb;
        owner[idx] = zs;
        bandIdx[idx] = colBand[i]!;
      } else if (hb && !vb) {
        role[idx] = hb === "parking" ? "parkingPlain" : hb;
        owner[idx] = xs;
        bandIdx[idx] = rowBand[j]!;
      } else if (vb && hb) {
        if (isCarriage(vb) && isCarriage(hb)) role[idx] = "junction";
        else if (isCarriage(vb)) {
          role[idx] = "crossing";
          owner[idx] = zs;
        } else if (isCarriage(hb)) {
          role[idx] = "crossing";
          owner[idx] = xs;
        } else role[idx] = "pavementCorner";
      }
    }
  }

  // ---- blocks ----
  const tileBlocks: BlockBase[] = [];
  const townBlocks: TownBlock[] = [];
  for (let bj = 0; bj < blocksZ; bj++) {
    for (let bi = 0; bi < blocksX; bi++) {
      const cb = cols.blocks[bi]!;
      const rb = rows.blocks[bj]!;
      const id = `block:${bi}:${bj}`;
      tileBlocks.push({ id, bi, bj, i0: cb.first, i1: cb.first + cb.len, j0: rb.first, j1: rb.first + rb.len });
      townBlocks.push({ id, minX: cb.first * TILE_M * u, minZ: rb.first * TILE_M * u, maxX: (cb.first + cb.len) * TILE_M * u, maxZ: (rb.first + rb.len) * TILE_M * u });
    }
  }

  // ---- kerbside parking: runs of parking cells between two junction boxes become pairs, except the cells next to each box and the ones in front of a kerb cut ----
  const blockIdAt = (s: TileStreet, coordSign: number, alongIdx: number): string => {
    let bi: number;
    let bj: number;
    if (s.axis === "x") {
      bi = alongIdx;
      bj = coordSign < 0 ? s.line - 1 : s.line;
    } else {
      bi = coordSign > 0 ? s.line : s.line - 1;
      bj = alongIdx;
    }
    return bi < 0 || bi >= blocksX || bj < 0 || bj >= blocksZ ? "outer" : `block:${bi}:${bj}`;
  };
  const yawOfBand = (s: TileStreet, acrossCell: number): TileYaw => yawToward(s.axis, s.centre_m > (acrossCell + 0.5) * TILE_M ? 1 : -1);
  /** One parking band of one street along one block interval: where a tile city's kerbside bays, build-outs and plain cells lie (056). */
  interface Band {
    /** `<street>|<side>|<alongIdx>`: side is `Kerb.side` of the block the band faces, alongIdx the block's index along the street. */
    key: string;
    s: TileStreet;
    /** The band's row (an "x" street) or column (a "z" street). */
    across: number;
    /** The interval's first cell along the street and one past its last: the first and last cells are next to the crossings. */
    a0: number;
    a1: number;
    yaw: TileYaw;
    /** The block the band faces, or "outer" on the outside of an edge street. */
    block: string;
  }
  const bandList: Band[] = [];
  const bandCell = (b: Band, a: number): number => (b.s.axis === "x" ? b.across * W + a : a * W + b.across);
  for (const s of streets) {
    const n = s.bands.length;
    const intervals = s.axis === "x" ? cols.blocks : rows.blocks;
    for (let k = 0; k < n; k++) {
      if (s.bands[k] !== "parking") continue;
      const across = s.axis === "x" ? s.across0 + k : s.across0 + n - 1 - k;
      const coordSign = s.centre_m > (across + 0.5) * TILE_M ? -1 : 1;
      intervals.forEach((iv, alongIdx) => {
        bandList.push({
          key: `${s.id}|${sideOf(s.axis, coordSign)}|${alongIdx}`,
          s,
          across,
          a0: iv.first,
          a1: iv.first + iv.len,
          yaw: yawOfBand(s, across),
          block: blockIdAt(s, coordSign, alongIdx),
        });
      });
    }
  }

  // ---- terraces on every block, and the parking lots (design item 8) ----
  interface Rows {
    lots: Lot[];
    runs: TerraceRun[];
    openLots: OpenLot[];
  }
  const frame = { wall_m: 0, kerb_m: TILE_M };
  /** All blocks' rows, once. `park` names the runs that take a parking lot whatever their hash. Every block is laid on its own, with the rules of a tile city: inside its edge, clear of the lots already laid. */
  const layoutRows = (park: ReadonlySet<string>): Rows => {
    const out: Rows = { lots: [], runs: [], openLots: [] };
    const counters = { slots: new Map<string, number>(), runs: new Map<string, number>() };
    tileBlocks.forEach((b, k) => {
      const tb = townBlocks[k]!;
      const placed: { x0: number; x1: number; z0: number; z1: number }[] = [];
      const bounds = (box: TerraceBox): { x0: number; x1: number; z0: number; z1: number } => {
        const hx = (Math.abs(box.fz) * box.w + Math.abs(box.fx) * box.d) / 2;
        const hz = (Math.abs(box.fx) * box.w + Math.abs(box.fz) * box.d) / 2;
        return { x0: box.x - hx, x1: box.x + hx, z0: box.z - hz, z1: box.z + hz };
      };
      const clears = (box: TerraceBox): boolean => {
        const r = bounds(box);
        if (r.x0 < tb.minX - 1e-9 || r.x1 > tb.maxX + 1e-9 || r.z0 < tb.minZ - 1e-9 || r.z1 > tb.maxZ + 1e-9) return false;
        return !placed.some((p) => r.x0 < p.x1 - 1e-9 && p.x0 < r.x1 - 1e-9 && r.z0 < p.z1 - 1e-9 && p.z0 < r.z1 - 1e-9);
      };
      const sides: [TerraceSide, TerraceSide, TerraceSide, TerraceSide] = [
        { road: `x:${b.bj}`, side: sideOf("x", 1), ax: tb.minX, az: tb.minZ, ux: 1, uz: 0, mx: 0, mz: 1, span: tb.maxX - tb.minX },
        { road: `z:${b.bi + 1}`, side: sideOf("z", -1), ax: tb.maxX, az: tb.minZ, ux: 0, uz: 1, mx: -1, mz: 0, span: tb.maxZ - tb.minZ },
        { road: `x:${b.bj + 1}`, side: sideOf("x", -1), ax: tb.maxX, az: tb.maxZ, ux: -1, uz: 0, mx: 0, mz: -1, span: tb.maxX - tb.minX },
        { road: `z:${b.bi}`, side: sideOf("z", 1), ax: tb.minX, az: tb.maxZ, ux: 0, uz: -1, mx: 1, mz: 0, span: tb.maxZ - tb.minZ },
      ];
      const r = terraceBlockRows({ id: b.id }, sides, {
        frontOff: 0,
        startInset_m: (row, endsAtPlaza, startsAfterPlaza) => tileRowInset_m(sides[row]!.span / u, endsAtPlaza, startsAfterPlaza),
        clears,
        claim: (box) => placed.push(bounds(box)),
        snap_m: TILE_M,
        plazaW_m: TILE_PLAZA_W_M,
        parkRuns: park,
        parkByHash: false,
        counters,
        lotBase: out.lots.length,
        frame,
      });
      // A run that starts at its row's corner starts at a corner (the ladder's rule: the first lot's side edge meets the cross street's pavement, here exactly): the first lot
      // is a corner lot on the side toward the run's start, and the run says so. A run that starts after a plaza or a lot, or after a clearance gap, does not.
      const cross = [`z:${b.bi}`, `x:${b.bj}`, `z:${b.bi + 1}`, `x:${b.bj + 1}`];
      for (const run of r.runs) {
        const k = sides.findIndex((sd) => sd.road === run.road && sd.side === run.side);
        const sd = sides[k]!;
        const rowRuns = r.runs.filter((q) => q.road === run.road && q.side === run.side);
        const endsAtPlaza = rowRuns[rowRuns.length - 1]!.endAbuts === "plaza";
        if (Math.abs(Math.hypot(run.ax - sd.ax, run.az - sd.az) - tileRowInset_m(sd.span / u, endsAtPlaza, false) * u) > 1e-9) continue;
        const first = r.lots[run.lots[0]! - out.lots.length]!;
        const toStart: CornerSide["side"] = Math.cos(first.yaw) * run.ux - Math.sin(first.yaw) * run.uz < 0 ? "+x" : "-x";
        const cs: CornerSide = { side: toStart, road: cross[k]! };
        first.corner = true;
        first.cornerSides = [cs];
        run.startCorner = cs;
      }
      out.lots.push(...r.lots);
      out.runs.push(...r.runs);
      out.openLots.push(...r.openLots);
    });
    return out;
  };
  const parkingOf = (r: Rows): OpenLot[] => r.openLots.filter((o) => o.kind === "parking");
  /** Every run's `parkRuns` name: block, side and its place among that side's runs in its block. */
  const keysOf = (r: Rows): Map<string, string> => {
    const n = new Map<string, number>();
    const out = new Map<string, string>();
    for (const run of r.runs) {
      const k = `${run.block}|${run.road}:${run.side}`;
      const i = n.get(k) ?? 0;
      n.set(k, i + 1);
      out.set(run.id, terraceRunKey(run.block, run.road, run.side, i));
    }
    return out;
  };
  // ---- units (18.2): columns are the bays of a block's terrace lots, a shop is a column that is not a lot's door column, a home is HOME_COLUMN_FLOORS column-floors of the nominal floors ----
  const blockById = new Map(tileBlocks.map((b) => [b.id, b] as const));
  const unitsOfRows = (rows: Rows): Map<string, TileBlock["units"]> => {
    const runBlock = new Map(rows.runs.map((r) => [r.id, r.block] as const));
    const columns = new Map<string, number>();
    const lotCount = new Map<string, number>();
    for (const l of rows.lots) {
      const id = runBlock.get(l.terrace?.run ?? "");
      if (id === undefined) continue;
      columns.set(id, (columns.get(id) ?? 0) + (l.terrace?.bays ?? 0));
      lotCount.set(id, (lotCount.get(id) ?? 0) + 1);
    }
    return new Map(tileBlocks.map((b) => [b.id, unitsOf(columns.get(b.id) ?? 0, lotCount.get(b.id) ?? 0)] as const));
  };
  /** A block wants clamp(round(homes x PARK_PER_HOME / LOT_STALLS), 1, LOTS_PER_BLOCK_MAX) lots. */
  const lotQuota = (homes: number): number => Math.min(LOTS_PER_BLOCK_MAX, Math.max(1, Math.round((homes * PARK_PER_HOME) / LOT_STALLS)));

  /** One side of a block: its street, which side of it the block lies on (`Kerb.side`), its length in cells and the block across the street (null at the city's edge). */
  interface BSide {
    road: string;
    side: 1 | -1;
    len: number;
    neigh: string | null;
  }
  const sidesOfBlock = (b: BlockBase): BSide[] => [
    { road: `x:${b.bj}`, side: 1, len: b.i1 - b.i0, neigh: b.bj > 0 ? `block:${b.bi}:${b.bj - 1}` : null },
    { road: `z:${b.bi + 1}`, side: 1, len: b.j1 - b.j0, neigh: b.bi + 1 < blocksX ? `block:${b.bi + 1}:${b.bj}` : null },
    { road: `x:${b.bj + 1}`, side: -1, len: b.i1 - b.i0, neigh: b.bj + 1 < blocksZ ? `block:${b.bi}:${b.bj + 1}` : null },
    { road: `z:${b.bi}`, side: -1, len: b.j1 - b.j0, neigh: b.bi > 0 ? `block:${b.bi - 1}:${b.bj}` : null },
  ];
  /** The block's index along a street it faces: its column along an "x" street, its row along a "z" one. */
  const alongOf = (b: BlockBase, road: string): number => (road.startsWith("x:") ? b.bi : b.bj);
  const bandKey = (road: string, side: number, alongIdx: number): string => `${road}|${side}|${alongIdx}`;
  const longestFirst = (p: BSide, q: BSide): number => q.len - p.len || (p.road < q.road ? -1 : p.road > q.road ? 1 : 0);
  const bandByKey = new Map(bandList.map((b) => [b.key, b] as const));
  /** Runs within 5 m of each other in length are as good as each other; among them the choice is a hash of the run and `LOT_RUN_SALT`. */
  const bucket = (len: number): number => Math.floor(len / u / 5);
  const runHash = (id: string): number => hashOf(seed, "lotrun", LOT_RUN_SALT, id);

  // ---- the parking lots (18.4, 18.6): every one is placed by demand, through `parkRuns` ----
  // Each round asks every block still short for the best run not yet tried: a run on a side with no parking band first (a lot's kerb cut takes two cells of the band), then the longest,
  // then by hash. A block with no run that can hold a lot asks a neighbour across its longest street. The rows start without a lot, and a lot takes frontage, so the units of the
  // finished rows are a little under the nominal ones: the quotas are asked again of those until they stand still (at most a few times).
  interface LotPlan {
    laid: Rows;
    /** The blocks a host block laid lots for, in the order the lots were won. */
    lend: Map<string, string[]>;
  }
  const nominalRows = layoutRows(new Set());
  const planLots = (wanted: ReadonlyMap<string, number>): LotPlan => {
    let laid = nominalRows;
    const tried = new Set<string>();
    const lend = new Map<string, string[]>();
    const lotsIn = (): Map<string, number> => {
      const runBlock = new Map(laid.runs.map((r) => [r.id, r.block] as const));
      const m = new Map<string, number>();
      for (const o of parkingOf(laid)) m.set(runBlock.get(o.run)!, (m.get(runBlock.get(o.run)!) ?? 0) + 1);
      return m;
    };
    const candidates = (b: BlockBase): string[] => {
      const keys = keysOf(laid);
      return laid.runs
        .filter((r) => r.block === b.id && r.endAbuts !== "parking" && r.len / u >= TILE_PARK_MIN_RUN_M && !tried.has(keys.get(r.id)!))
        .map((r) => ({ key: keys.get(r.id)!, len: r.len, parked: bandByKey.has(bandKey(r.road, r.side, alongOf(b, r.road))) ? 1 : 0, id: r.id }))
        .sort((p, q) => p.parked - q.parked || bucket(q.len) - bucket(p.len) || runHash(p.id) - runHash(q.id) || (p.id < q.id ? -1 : 1))
        .map((c) => c.key);
    };
    /** One trial layout with every lot so far and one more run flagged for each request (at most one per host); a flag that took no lot is never asked again. */
    const lotRound = (reqs: readonly { host: string; serves: string }[]): boolean => {
      const keysNow = keysOf(laid);
      const batch: { host: string; serves: string; key: string }[] = [];
      for (const r of reqs) {
        const key = candidates(blockById.get(r.host)!)[0];
        if (key !== undefined) batch.push({ ...r, key });
      }
      if (batch.length === 0) return false;
      const trial = layoutRows(new Set([...parkingOf(laid).map((o) => keysNow.get(o.run)!), ...batch.map((r) => r.key)]));
      const trialKeys = keysOf(trial);
      const got = new Set(parkingOf(trial).map((o) => trialKeys.get(o.run)));
      for (const r of batch) {
        if (!got.has(r.key)) tried.add(r.key);
        else if (r.host !== r.serves) lend.set(r.host, [...(lend.get(r.host) ?? []), r.serves]);
      }
      laid = trial;
      return true;
    };
    for (let guard = 0; guard < 16; guard++) {
      const have = lotsIn();
      const reqs = tileBlocks.filter((b) => (have.get(b.id) ?? 0) < wanted.get(b.id)! && candidates(b).length > 0).map((b) => ({ host: b.id, serves: b.id }));
      if (reqs.length === 0 || !lotRound(reqs)) break;
    }
    /** How many lots serve a block now: its own that were not lent out, and the ones neighbours laid for it. */
    const servedNow = (id: string): number => {
      let n = Math.max(0, (lotsIn().get(id) ?? 0) - (lend.get(id)?.length ?? 0));
      for (const l of lend.values()) n += l.filter((x) => x === id).length;
      return n;
    };
    for (let guard = 0; guard < 16; guard++) {
      const have = lotsIn();
      const used = new Set<string>();
      const reqs: { host: string; serves: string }[] = [];
      for (const b of tileBlocks) {
        if (servedNow(b.id) >= wanted.get(b.id)!) continue;
        for (const sd of sidesOfBlock(b).sort(longestFirst)) {
          const n = sd.neigh;
          if (n === null || used.has(n) || (have.get(n) ?? 0) >= LOTS_PER_BLOCK_MAX || candidates(blockById.get(n)!).length === 0) continue;
          used.add(n);
          reqs.push({ host: n, serves: b.id });
          break;
        }
      }
      if (reqs.length === 0 || !lotRound(reqs)) break;
    }
    return { laid, lend };
  };
  const nominalUnits = unitsOfRows(nominalRows);
  let wantedLots = new Map(tileBlocks.map((b) => [b.id, lotQuota(nominalUnits.get(b.id)!.homes)] as const));
  let plan = planLots(wantedLots);
  let unitsById = unitsOfRows(plan.laid);
  for (let round = 0; round < 3; round++) {
    const next = new Map(tileBlocks.map((b) => [b.id, lotQuota(unitsById.get(b.id)!.homes)] as const));
    if (tileBlocks.every((b) => next.get(b.id) === wantedLots.get(b.id))) break;
    wantedLots = next;
    plan = planLots(wantedLots);
    unitsById = unitsOfRows(plan.laid);
  }
  // The quotas the finished rows' units call for: where a round did not settle, the shortfall below is measured against these.
  wantedLots = new Map(tileBlocks.map((b) => [b.id, lotQuota(unitsById.get(b.id)!.homes)] as const));
  const laid = plan.laid;
  const lend = plan.lend;
  /** The block each lot counts toward: a host's own demand first, then the neighbours it lent to. */
  const lotServes = new Map<OpenLot, string>();
  {
    const runBlock = new Map(laid.runs.map((r) => [r.id, r.block] as const));
    const perHost = new Map<string, OpenLot[]>();
    for (const o of parkingOf(laid)) {
      const h = runBlock.get(o.run)!;
      perHost.set(h, [...(perHost.get(h) ?? []), o]);
    }
    for (const [host, list] of perHost) {
      const lent = (lend.get(host) ?? []).slice(0, list.length);
      const own = list.length - lent.length;
      list.forEach((o, i) => lotServes.set(o, i < own ? host : lent[i - own]!));
    }
  }
  const lotsServing = new Map<string, number>();
  for (const id of lotServes.values()) lotsServing.set(id, (lotsServing.get(id) ?? 0) + 1);

  // ---- the kerb cut of every parking lot, and the cells under the open lots ----
  const blocked = new Set<number>();
  const lotCells: TileCell[] = [];
  const cellOfMetres = (m: number): number => Math.floor(m / TILE_M + 1e-9);
  const yawDeg = (rad: number): TileYaw => ((((Math.round(rad / (Math.PI / 2)) * 90) % 360) + 360) % 360) as TileYaw;
  const streetOfRun = new Map(laid.runs.map((r) => [r.id, r.road] as const));
  for (const o of laid.openLots) {
    const cx = o.x / u;
    const cz = o.z / u;
    if (o.kind === "parking") {
      // The street edge: the two pavement cells across the lot's front, and the parking cells in front of them.
      const fx = Math.round(Math.sin(o.yaw));
      const fz = Math.round(Math.cos(o.yaw));
      for (const along of [-TILE_M / 2, TILE_M / 2]) {
        const pi = fz !== 0 ? cellOfMetres(cx + along) : cellOfMetres(cx + fx * (o.d / u / 2 + TILE_M / 2));
        const pj = fz !== 0 ? cellOfMetres(cz + fz * (o.d / u / 2 + TILE_M / 2)) : cellOfMetres(cz + along);
        const pIdx = pj * W + pi;
        if (role[pIdx] === "pavement") role[pIdx] = "kerbCut";
        const ni = pi + fx;
        const nj = pj + fz;
        if (role[nj * W + ni] === "parkingPlain") blocked.add(nj * W + ni);
      }
    }
    for (const dz of [-TILE_M / 2, TILE_M / 2]) {
      for (const dx of [-TILE_M / 2, TILE_M / 2]) {
        const i = cellOfMetres(cx + dx);
        const j = cellOfMetres(cz + dz);
        lotCells.push({
          i,
          j,
          cells: 1,
          role: o.kind === "parking" ? "lotSurface" : "plaza",
          variant: 0,
          x_m: (i + 0.5) * TILE_M,
          z_m: (j + 0.5) * TILE_M,
          yaw: yawDeg(o.yaw),
          street: o.kind === "parking" ? (streetOfRun.get(o.run) ?? null) : null,
        });
      }
    }
  }

  // ---- the stalls of every lot: two rows of three (two `ParkingLines_01` tiles), the same record as a bay ----
  const lotStalls: ParkingBay[] = [];
  {
    const runBlock = new Map(laid.runs.map((r) => [r.id, r.block] as const));
    for (const o of parkingOf(laid)) {
      const cx = o.x / u;
      const cz = o.z / u;
      const fx = Math.sin(o.yaw);
      const fz = Math.cos(o.yaw);
      const tx = fz;
      const tz = -fx;
      const w = o.w / u / BAYS_PER_PARKING_TILE;
      const d = o.d / u / 2;
      for (let row = 0; row < 2; row++) {
        for (let k = 0; k < BAYS_PER_PARKING_TILE; k++) {
          const front = d / 2 - row * d;
          const along = (k - (BAYS_PER_PARKING_TILE - 1) / 2) * w;
          lotStalls.push({
            x_m: cx + fx * front + tx * along,
            z_m: cz + fz * front + tz * along,
            yaw: yawDeg(o.yaw),
            w_m: w,
            d_m: d,
            street: streetOfRun.get(o.run) ?? "",
            block: runBlock.get(o.run)!,
            serves: lotServes.get(o)!,
          });
        }
      }
    }
  }

  // ---- kerbside bays (18.3, 18.6): short runs of `ParkingLines_01` tiles on the sides that have a parking band ----
  const pair = new Uint8Array(W * H); // 1 first cell of a ParkingLines tile, 2 its second
  const bays: ParkingBay[] = [];
  /** A band with its free stretch (the longest run of cells that no kerb cut's front takes, less the cells next to the crossings), its cap in tiles, and the runs laid so far (each tile names the block it serves). */
  interface BandState {
    band: Band;
    sa: number;
    sb: number;
    cap: number;
    runs: string[][];
  }
  const states = new Map<string, BandState>();
  for (const band of bandList) {
    if (band.block === "outer") continue;
    let sa = 0;
    let sb = 0;
    let a = band.a0 + BAY_JUNCTION_CLEAR;
    const end = band.a1 - BAY_JUNCTION_CLEAR;
    while (a < end) {
      if (blocked.has(bandCell(band, a))) {
        a++;
        continue;
      }
      let e = a;
      while (e < end && !blocked.has(bandCell(band, e))) e++;
      if (e - a > sb - sa) {
        sa = a;
        sb = e;
      }
      a = e;
    }
    // A tile is 10 m of the side's kerb: the side may hold floor(share x length / 10 m) of them.
    states.set(band.key, { band, sa, sb, cap: Math.floor((KERB_BAY_SHARE_MAX[band.s.profile] * (band.a1 - band.a0)) / 2 + 1e-9), runs: [] });
  }
  const gapCells = Math.ceil(KERB_GAP_MIN_M / TILE_M);
  /** Where each run starts (a cell along the street) if the band holds `runs`, or null when they do not fit with `KERB_GAP_MIN_M` between them. One run is centred on the free stretch, offset by hash; several are spread evenly. */
  const startsOf = (st: BandState, runs: readonly (readonly string[])[]): number[] | null => {
    const R = runs.length;
    const need = runs.reduce((n, r) => n + 2 * r.length, 0);
    const slack = st.sb - st.sa - need - gapCells * (R - 1);
    if (slack < 0) return null;
    let lead: number;
    let inner = gapCells;
    if (R === 1) {
      const m = Math.floor(slack / 4);
      lead = Math.floor(slack / 2) + (hashOf(seed, "bay", st.band.key) % (2 * m + 1)) - m;
    } else {
      const g = Math.floor(slack / (R + 1));
      inner += g;
      lead = Math.floor((slack - g * (R - 1)) / 2);
    }
    const out: number[] = [];
    let at = st.sa + lead;
    for (const r of runs) {
      out.push(at);
      at += 2 * r.length + inner;
    }
    return out;
  };
  const kerbTotal_m = tileBlocks.reduce((n, b) => n + 2 * (b.i1 - b.i0 + b.j1 - b.j0) * TILE_M, 0);
  const bayCap = Math.floor((BAYS_PER_100M_MAX * kerbTotal_m) / 100 + 1e-9);
  let bayCount = 0;
  /** One more tile on a band for `serves`: the first run with room grows, else a new run starts; false when the side's cap, the city's cap or the room says no. */
  const tryAdd = (st: BandState, serves: string): boolean => {
    if (st.runs.reduce((n, r) => n + r.length, 0) + 1 > st.cap || bayCount + BAYS_PER_PARKING_TILE > bayCap) return false;
    const options: string[][][] = [];
    const grow = st.runs.findIndex((r) => r.length < BAY_RUN_TILES_MAX);
    if (grow >= 0) options.push(st.runs.map((r, k) => (k === grow ? [...r, serves] : r)));
    options.push([...st.runs, [serves]]);
    for (const o of options) {
      if (startsOf(st, o) === null) continue;
      st.runs = o;
      bayCount += BAYS_PER_PARKING_TILE;
      return true;
    }
    return false;
  };
  const shortTiles = new Map<string, number>();
  const ownStates = (b: BlockBase): BandState[] =>
    sidesOfBlock(b)
      .map((sd) => states.get(bandKey(sd.road, sd.side, alongOf(b, sd.road))))
      .filter((st): st is BandState => st !== undefined);
  // The blocks with the fewest parking sides of their own go first (a block with none can only be served from the band across a street, and that band must not be full by then); ties by id.
  const order = tileBlocks.map((b) => ({ b, n: ownStates(b).length })).sort((p, q) => p.n - q.n || (p.b.id < q.b.id ? -1 : p.b.id > q.b.id ? 1 : 0));
  for (const { b } of order) {
    // Own sides first: avenue sides, then longer sides, ties by id. One tile at a time, side by side: every side has a run before any side has a second.
    const own = ownStates(b).sort((p, q) => (p.band.s.profile === "avenue" ? 0 : 1) - (q.band.s.profile === "avenue" ? 0 : 1) || q.band.a1 - q.band.a0 - (p.band.a1 - p.band.a0) || (p.band.key < q.band.key ? -1 : 1));
    let need = Math.max(BAY_TILES_PER_BLOCK_MIN, Math.round((unitsById.get(b.id)!.shops * PARK_PER_SHOP) / BAYS_PER_PARKING_TILE));
    for (let progress = true; need > 0 && progress; ) {
      progress = false;
      for (const st of own) {
        if (need > 0 && tryAdd(st, b.id)) {
          need--;
          progress = true;
        }
      }
    }
    // Still short: the band across its longest street serves it (that band faces the neighbour, and each tile there says whom it serves).
    for (const sd of sidesOfBlock(b).sort(longestFirst)) {
      if (need <= 0) break;
      const st = sd.neigh === null ? undefined : states.get(bandKey(sd.road, -sd.side, alongOf(b, sd.road)));
      if (!st || st.band.block !== sd.neigh) continue;
      while (need > 0 && tryAdd(st, b.id)) need--;
    }
    shortTiles.set(b.id, need);
  }
  for (const st of states.values()) {
    if (st.runs.length === 0) continue;
    const starts = startsOf(st, st.runs)!;
    const s = st.band.s;
    st.runs.forEach((run, ri) => {
      run.forEach((serves, t) => {
        const c0 = starts[ri]! + 2 * t;
        pair[bandCell(st.band, c0)] = 1;
        pair[bandCell(st.band, c0 + 1)] = 2;
        for (let b = 0; b < BAYS_PER_PARKING_TILE; b++) {
          const along = (c0 + (b + 0.5) * (2 / BAYS_PER_PARKING_TILE)) * TILE_M;
          const acr = (st.band.across + 0.5) * TILE_M;
          bays.push({
            x_m: s.axis === "x" ? along : acr,
            z_m: s.axis === "x" ? acr : along,
            yaw: st.band.yaw,
            w_m: (2 * TILE_M) / BAYS_PER_PARKING_TILE,
            d_m: TILE_M,
            street: s.id,
            block: st.band.block,
            serves,
          });
        }
      });
    });
  }

  // ---- the rest of the band (18.5): a build-out, pavement level, with a tree on every BUILDOUT_TREE_EVERY-th cell of a stretch (never next to a crossing); the cells in front of a kerb cut and on an edge street's outer side stay plain ----
  const buildoutTrees: BuildoutTree[] = [];
  for (const band of bandList) {
    if (band.block === "outer") continue;
    let stretch = 0;
    for (let a = band.a0; a < band.a1; a++) {
      const idx = bandCell(band, a);
      if (pair[idx] !== 0 || blocked.has(idx)) {
        stretch = 0;
        continue;
      }
      role[idx] = "buildout";
      stretch++;
      if (stretch % BUILDOUT_TREE_EVERY === 0 && a >= band.a0 + BAY_JUNCTION_CLEAR && a < band.a1 - BAY_JUNCTION_CLEAR) {
        const along = (a + 0.5) * TILE_M;
        const acr = (band.across + 0.5) * TILE_M;
        buildoutTrees.push({ x_m: band.s.axis === "x" ? along : acr, z_m: band.s.axis === "x" ? acr : along, street: band.s.id });
      }
    }
  }

  // ---- emit the cells ----
  const cells: TileCell[] = [];
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const idx = j * W + i;
      let r = role[idx] ?? null;
      if (r === null || pair[idx] === 2) continue;
      const two = pair[idx] === 1;
      if (two) r = "parking";
      const own = owner[idx];
      const zs = colStreet[i]! >= 0 ? zStreets[colStreet[i]!]! : null;
      const xs = rowStreet[j]! >= 0 ? xStreets[rowStreet[j]!]! : null;
      const cx = (i + 0.5) * TILE_M;
      const cz = (j + 0.5) * TILE_M;
      let yaw: TileYaw = 0;
      let variant = 0;
      if (r === "lane" || r === "parking" || r === "parkingPlain" || r === "buildout") {
        yaw = yawOfBand(own!, own!.axis === "x" ? j : i);
        // A build-out is a sidewalk tile in the parking band: its kerb edge faces the centre line, and it takes one of the two plain straights.
        if (r === "buildout") variant = (hashOf(seed, "pave", i, j) >>> 8) & 1;
        if (r === "lane") {
          const firstLane = own!.bands.indexOf("lane");
          variant = bandIdx[idx]! - firstLane;
          if (hashOf(seed, "patch", i, j) % PATCH_ONE_IN === 0) variant |= LANE_PATCH;
        }
      } else if (r === "pavement" || r === "kerbCut") {
        yaw = yawToward(own!.axis, own!.carriage.lo_m > (own!.axis === "x" ? cz : cx) ? 1 : -1);
        if (r === "pavement") {
          const h = hashOf(seed, "pave", i, j);
          variant = h % GRATE_ONE_IN === 0 ? PAVEMENT_GRATE : (h >>> 8) & 1;
        }
      } else if (r === "crossing") {
        yaw = yawToward(own!.axis, 1);
      } else if (r === "pavementCorner") {
        yaw = cornerYaw(zs!.carriage.lo_m > cx ? 1 : -1, xs!.carriage.lo_m > cz ? 1 : -1);
      }
      let x = cx;
      let z = cz;
      if (two) {
        if (own!.axis === "x") x += TILE_M / 2;
        else z += TILE_M / 2;
      }
      cells.push({ i, j, cells: two ? 2 : 1, role: r, variant, x_m: x, z_m: z, yaw, street: r === "junction" || r === "pavementCorner" ? null : own!.id });
    }
  }
  cells.push(...lotCells);

  // ---- roads, pads, kerbs ----
  const Wm = W * TILE_M;
  const Hm = H * TILE_M;
  const roads: Road[] = [];
  const kerbs: Kerb[] = [];
  for (const s of streets) {
    const cc = (s.carriage.lo_m + s.carriage.hi_m) / 2;
    const half = (s.carriage.hi_m - s.carriage.lo_m) / 2;
    const len = s.axis === "x" ? Wm : Hm;
    const a: Pt = s.axis === "x" ? { x: 0, z: cc * u } : { x: cc * u, z: 0 };
    const b: Pt = s.axis === "x" ? { x: len * u, z: cc * u } : { x: cc * u, z: len * u };
    // Direction (ux, uz) is +x or +z, the normal (-uz, ux) is therefore +z or -x, as `townLayout` does it.
    const mx = s.axis === "x" ? 0 : -half * u;
    const mz = s.axis === "x" ? half * u : 0;
    roads.push({
      id: s.id,
      kind: "grid",
      line: null,
      lineFrom: a,
      lineTo: b,
      side: 0,
      ax: a.x,
      az: a.z,
      bx: b.x,
      bz: b.z,
      w: 2 * half * u,
      corners: [
        { x: a.x + mx, z: a.z + mz },
        { x: a.x - mx, z: a.z - mz },
        { x: b.x - mx, z: b.z - mz },
        { x: b.x + mx, z: b.z + mz },
      ],
    });
  }
  // Kerbs: one segment per stretch of cell edges between a pavement or a build-out and a carriageway cell (a lane or a parking-band cell), on each side of each street. A kerb cut breaks a
  // stretch (it is neither), and no kerb lies against a crossing or a junction. Edges that touch end to end on one line are one segment.
  {
    const isPave = (r: TileRole | null | undefined): boolean => r === "pavement" || r === "buildout";
    const isCar = (r: TileRole | null | undefined): boolean => r === "lane" || r === "parkingPlain";
    const groups = new Map<string, { road: string; side: 1 | -1; horizontal: boolean; line: number; at: number[] }>();
    const addEdge = (a: number, b: number, horizontal: boolean, line: number, at: number): void => {
      const pave = isPave(role[a]) && isCar(role[b]) ? a : isPave(role[b]) && isCar(role[a]) ? b : -1;
      if (pave < 0) return;
      const s = owner[pave]!;
      const across = ((s.axis === "x" ? Math.floor(pave / W) : pave % W) + 0.5) * TILE_M;
      const side = sideOf(s.axis, across > s.centre_m ? 1 : -1);
      const key = `${s.id}|${side}|${horizontal ? "h" : "v"}|${line}`;
      const g = groups.get(key);
      if (g) g.at.push(at);
      else groups.set(key, { road: s.id, side, horizontal, line, at: [at] });
    };
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        if (i > 0) addEdge(j * W + i - 1, j * W + i, false, i, j);
        if (j > 0) addEdge((j - 1) * W + i, j * W + i, true, j, i);
      }
    }
    for (const g of groups.values()) {
      g.at.sort((p, q) => p - q);
      let from = g.at[0]!;
      for (let n = 1; n <= g.at.length; n++) {
        if (n < g.at.length && g.at[n] === g.at[n - 1]! + 1) continue;
        const to = g.at[n - 1]! + 1;
        const p0 = from * TILE_M * u;
        const p1 = to * TILE_M * u;
        const l = g.line * TILE_M * u;
        kerbs.push(g.horizontal ? { road: g.road, side: g.side, ax: p0, az: l, bx: p1, bz: l } : { road: g.road, side: g.side, ax: l, az: p0, bx: l, bz: p1 });
        from = g.at[n]!;
      }
    }
  }
  const pads: Pad[] = [];
  for (const xs of xStreets) {
    for (const zs of zStreets) {
      const x0 = zs.carriage.lo_m * u;
      const x1 = zs.carriage.hi_m * u;
      const z0 = xs.carriage.lo_m * u;
      const z1 = xs.carriage.hi_m * u;
      pads.push({
        id: `pad:${xs.id}:${zs.id}`,
        node: null,
        pts: [
          { x: x0, z: z0 },
          { x: x1, z: z0 },
          { x: x1, z: z1 },
          { x: x0, z: z1 },
        ],
        roads: [xs.id, zs.id],
      });
    }
  }

  // ---- pavements: every pavement, kerb-cut and corner cell once ----
  // An "x" street's pavement rows run on across the corners (the corner cells close the pavement); a "z" street's columns hold the cells between them.
  const pavements: Pavement[] = [];
  const rect = (id: string, i0: number, j0: number, i1: number, j1: number): Pavement => ({
    road: id,
    service: false,
    pts: [
      { x: i0 * TILE_M * u, z: j0 * TILE_M * u },
      { x: i1 * TILE_M * u, z: j0 * TILE_M * u },
      { x: i1 * TILE_M * u, z: j1 * TILE_M * u },
      { x: i0 * TILE_M * u, z: j1 * TILE_M * u },
    ],
  });
  const paved = (r: TileRole | null | undefined): boolean => r === "pavement" || r === "pavementCorner" || r === "kerbCut";
  for (const s of xStreets) {
    for (const k of [0, s.bands.length - 1]) {
      const j = s.across0 + k;
      let start = -1;
      for (let i = 0; i <= W; i++) {
        const on = i < W && paved(role[j * W + i]);
        if (on && start < 0) start = i;
        if (!on && start >= 0) {
          pavements.push(rect(s.id, start, j, i, j + 1));
          start = -1;
        }
      }
    }
  }
  for (const s of zStreets) {
    const n = s.bands.length;
    for (const k of [0, n - 1]) {
      const i = s.across0 + n - 1 - k;
      let start = -1;
      for (let j = 0; j <= H; j++) {
        const on = j < H && (role[j * W + i] === "pavement" || role[j * W + i] === "kerbCut");
        if (on && start < 0) start = j;
        if (!on && start >= 0) {
          pavements.push(rect(s.id, i, start, i + 1, j));
          start = -1;
        }
      }
    }
  }

  // ---- pole slots (reserved, nothing stands in them yet): never on a corner, a crossing landing or a kerb cut ----
  const poleSlots: PoleSlot[] = [];
  for (const s of streets) {
    const intervals = s.axis === "x" ? cols.blocks : rows.blocks;
    for (const coordSign of [-1, 1] as const) {
      const across = coordSign < 0 ? s.carriage.lo_m - POLE_SLOT_FROM_KERB_M : s.carriage.hi_m + POLE_SLOT_FROM_KERB_M;
      const acrossCell = Math.floor(across / TILE_M);
      for (const iv of intervals) {
        const s0 = iv.first * TILE_M;
        const s1 = (iv.first + iv.len) * TILE_M;
        for (let p = s0 + POLE_SLOT_END_CLEAR_M; p <= s1 - POLE_SLOT_END_CLEAR_M + 1e-9; p += POLE_SLOT_PITCH_M) {
          const alongCell = Math.floor(p / TILE_M);
          const at = s.axis === "x" ? role[acrossCell * W + alongCell] : role[alongCell * W + acrossCell];
          if (at !== "pavement") continue;
          poleSlots.push({ x_m: s.axis === "x" ? p : across, z_m: s.axis === "x" ? across : p, street: s.id, side: sideOf(s.axis, coordSign) });
        }
      }
    }
  }

  const bounds: CityRect = { minX: 0, minY: 0, maxX: Wm * u, maxY: Hm * u };
  const town: Town = {
    roads,
    kerbs,
    pavements,
    pads,
    blocks: townBlocks,
    lots: laid.lots,
    terraces: laid.runs,
    openLots: laid.openLots,
    places: [],
    ring: { ...bounds },
    window: { ...bounds },
  };
  const blocksOut: TileBlock[] = tileBlocks.map((b) => {
    const served = lotsServing.get(b.id) ?? 0;
    return { ...b, units: unitsById.get(b.id)!, parkingShort: { stalls: Math.max(0, wantedLots.get(b.id)! - served) * LOT_STALLS, bays: (shortTiles.get(b.id) ?? 0) * BAYS_PER_PARKING_TILE }, lots: served };
  });
  return deepFreeze({ blocksX, blocksZ, seed, cells, streets, bays, lotStalls, buildoutTrees, poleSlots, blocks: blocksOut, town });
}

// ---- furniture on the tile city (ticket 055 B, design item 9) ----

/** The keep-outs `furnitureLayout` takes for a tile city, world units: every pole slot (a point) and every kerb-cut and corner cell (a rectangle: a kerb cut is a driveway, a corner cell is where the crossings land). */
export function tileKeepouts(city: TileCity): { keepPoints: Pt[]; keepRects: Rect[] } {
  const u = WORLD_PER_METRE;
  const keepPoints = city.poleSlots.map((p) => ({ x: p.x_m * u, z: p.z_m * u }));
  const keepRects: Rect[] = [];
  for (const c of city.cells) {
    if (c.role !== "kerbCut" && c.role !== "pavementCorner") continue;
    keepRects.push({ minX: c.i * TILE_M * u, minZ: c.j * TILE_M * u, maxX: (c.i + 1) * TILE_M * u, maxZ: (c.j + 1) * TILE_M * u });
  }
  return { keepPoints, keepRects };
}

/**
 * The pavement furniture of a tile city with the parking meters that do not stand beside a kerbside bay taken out (design item 9: meters on the kerb line stand beside bays, and in lots).
 * A meter is beside a bay when a bay of its run's own block side is level with it along the street. Lot meters (`kind` "parking") are not touched. Pure.
 */
export function bayMeters(city: TileCity, pieces: readonly FurniturePiece[]): FurniturePiece[] {
  const u = WORLD_PER_METRE;
  const runs = new Map(city.town.terraces.map((r) => [r.id, r] as const));
  const bayList = new Map<string, ParkingBay[]>();
  for (const b of city.bays) {
    const k = `${b.street}|${b.block}`;
    const l = bayList.get(k);
    if (l) l.push(b);
    else bayList.set(k, [b]);
  }
  return pieces.filter((p) => {
    if (p.kind !== "pavement" || !METERS.includes(p.key)) return true;
    const run = runs.get(p.run);
    if (!run) return false;
    const along = run.road.startsWith("x:") ? p.x / u : p.z / u;
    return (bayList.get(`${run.road}|${run.block}`) ?? []).some((b) => Math.abs(along - (run.road.startsWith("x:") ? b.x_m : b.z_m)) <= b.w_m / 2 + 1e-6);
  });
}
