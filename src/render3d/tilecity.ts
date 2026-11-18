/**
 * The tile-street city (ticket 055, section A), as pure data. No three, no DOM, no assets, no circuit.
 *
 * Josh, 18 Nov 2026: the City Pack's roads are 5 m square tiles, so a city of them has to be laid on a 90 degree street grid. This file lays that grid:
 * every street, junction, pavement, crossing and parking bay is a whole cell of `TILE_M` (or, for the parking lines, two cells along its street), and the result is
 * handed on as a normal `Town` (map units, times `WORLD_PER_METRE`) so the rest of the pipeline can run on it. Section B adds the blocks' terraces and open lots
 * (`terraceBlockRows` from town.ts, on the pavement's back edge with no setback), a kerb cut and lot surface for every parking lot, and the furniture keep-outs; drawing is
 * section C. The town has roads, kerbs, pavements, pads (the junction boxes), blocks, terrace lots and runs and open lots, and no place.
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
 *   corner's two kerb edges are on its +x and +z sides, 90 its +x and -z, 180 its -x and -z, 270 its -x and +z; kerbCut: as a pavement (front toward the carriageway);
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
/** At least one parking lot per this many blocks in the city. */
export const CITY_LOTS_PER_BLOCKS = 4;
/** Every block has at least this many kerbside bays on its sides, or an open parking lot. */
export const CITY_BAYS_PER_BLOCK_MIN = 4;
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
  /** The block the bay's side faces (`block:<bi>:<bj>`), or "outer" on the outside of an edge street. */
  block: string;
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
}

export interface TileCity {
  blocksX: number;
  blocksZ: number;
  seed: number;
  cells: readonly TileCell[];
  streets: readonly TileStreet[];
  bays: readonly ParkingBay[];
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
  const tileBlocks: TileBlock[] = [];
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
  /** Pairs and bays, given the parking cells that must stay plain (indices `j * W + i`). */
  const pairBays = (blocked: ReadonlySet<number>): { pair: Uint8Array; bays: ParkingBay[] } => {
    const pair = new Uint8Array(W * H); // 1 first cell of a ParkingLines tile, 2 its second
    const bays: ParkingBay[] = [];
    for (const s of streets) {
      const n = s.bands.length;
      const intervals = s.axis === "x" ? cols.blocks : rows.blocks;
      for (let k = 0; k < n; k++) {
        if (s.bands[k] !== "parking") continue;
        const across = s.axis === "x" ? s.across0 + k : s.across0 + n - 1 - k;
        const coordSign = s.centre_m > (across + 0.5) * TILE_M ? -1 : 1;
        const yaw = yawOfBand(s, across);
        const at = (a: number): number => (s.axis === "x" ? across * W + a : a * W + across);
        intervals.forEach((iv, alongIdx) => {
          const a0 = iv.first + BAY_JUNCTION_CLEAR;
          const a1 = iv.first + iv.len - BAY_JUNCTION_CLEAR;
          const block = blockIdAt(s, coordSign, alongIdx);
          let a = a0;
          while (a < a1) {
            if (blocked.has(at(a))) {
              a++;
              continue;
            }
            let e = a;
            while (e < a1 && !blocked.has(at(e))) e++;
            for (let c0 = a; c0 + 2 <= e; c0 += 2) {
              pair[at(c0)] = 1;
              pair[at(c0 + 1)] = 2;
              for (let b = 0; b < BAYS_PER_PARKING_TILE; b++) {
                const along = (c0 + (b + 0.5) * (2 / BAYS_PER_PARKING_TILE)) * TILE_M;
                const acr = (across + 0.5) * TILE_M;
                bays.push({
                  x_m: s.axis === "x" ? along : acr,
                  z_m: s.axis === "x" ? acr : along,
                  yaw,
                  w_m: (2 * TILE_M) / BAYS_PER_PARKING_TILE,
                  d_m: TILE_M,
                  street: s.id,
                  block,
                });
              }
            }
            a = e;
          }
        });
      }
    }
    return { pair, bays };
  };

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
  let laid = layoutRows(new Set());
  {
    // At least one parking lot per CITY_LOTS_PER_BLOCKS blocks, and one in every block that has fewer than CITY_BAYS_PER_BLOCK_MIN kerbside bays: where the hash gives too few,
    // the longest run that can still hold one takes it (ties by id). A run that cannot is set aside and the next longest is tried.
    const nominal = pairBays(new Set()).bays;
    const bayCount = new Map<string, number>();
    for (const b of nominal) bayCount.set(b.block, (bayCount.get(b.block) ?? 0) + 1);
    const wanted = Math.ceil(tileBlocks.length / CITY_LOTS_PER_BLOCKS);
    const failed = new Set<string>();
    const forced = new Set<string>();
    for (let guard = 0; guard < 4 * tileBlocks.length + 8; guard++) {
      const runBlock = new Map(laid.runs.map((r) => [r.id, r.block] as const));
      const parks = parkingOf(laid);
      const withLot = new Set(parks.map((o) => runBlock.get(o.run)));
      const needy = tileBlocks.filter((b) => (bayCount.get(b.id) ?? 0) < CITY_BAYS_PER_BLOCK_MIN && !withLot.has(b.id) && laid.runs.some((r) => r.block === b.id && !failed.has(r.id) && r.endAbuts !== "parking"));
      if (needy.length === 0 && parks.length >= wanted) break;
      const pool = needy.length > 0 ? laid.runs.filter((r) => r.block === needy[0]!.id) : laid.runs;
      const cands = pool.filter((r) => r.endAbuts !== "parking" && !failed.has(r.id) && r.len / u >= TILE_PARK_MIN_RUN_M).sort((p, q) => q.len - p.len || (p.id < q.id ? -1 : 1));
      if (cands.length === 0) {
        if (needy.length > 0) {
          // This block cannot hold a lot: stop asking of it.
          for (const r of pool) failed.add(r.id);
          continue;
        }
        break;
      }
      const pick = cands[0]!;
      const pickKey = keysOf(laid).get(pick.id)!;
      const trial = layoutRows(new Set([...forced, pickKey]));
      const trialKeys = keysOf(trial);
      if (parkingOf(trial).some((o) => trialKeys.get(o.run) === pickKey)) {
        laid = trial;
        forced.add(pickKey);
      } else failed.add(pick.id);
    }
  }

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
  const { pair, bays } = pairBays(blocked);

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
      if (r === "lane" || r === "parking" || r === "parkingPlain") {
        yaw = yawOfBand(own!, own!.axis === "x" ? j : i);
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
    // One kerb segment per stretch of pavement cells on each side of each block, on the carriageway's edge: a kerb cut breaks it.
    const intervals = s.axis === "x" ? cols.blocks : rows.blocks;
    const n = s.bands.length;
    for (const e of [1, -1] as const) {
      const coordSign = s.axis === "x" ? e : -e;
      const at = (coordSign > 0 ? s.carriage.hi_m : s.carriage.lo_m) * u;
      const across = coordSign > 0 ? s.across0 + n - 1 : s.across0;
      for (const iv of intervals) {
        let start = -1;
        for (let a1 = iv.first; a1 <= iv.first + iv.len; a1++) {
          const on = a1 < iv.first + iv.len && role[s.axis === "x" ? across * W + a1 : a1 * W + across] === "pavement";
          if (on && start < 0) start = a1;
          if (!on && start >= 0) {
            const p0 = start * TILE_M * u;
            const p1 = a1 * TILE_M * u;
            kerbs.push(s.axis === "x" ? { road: s.id, side: e, ax: p0, az: at, bx: p1, bz: at } : { road: s.id, side: e, ax: at, az: p0, bx: at, bz: p1 });
            start = -1;
          }
        }
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
  return deepFreeze({ blocksX, blocksZ, seed, cells, streets, bays, poleSlots, blocks: tileBlocks, town });
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
