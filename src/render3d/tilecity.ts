/**
 * The tile-street city (ticket 055, section A), as pure data. No three, no DOM, no assets, no circuit.
 *
 * Josh, 18 Nov 2026: the City Pack's roads are 5 m square tiles, so a city of them has to be laid on a 90 degree street grid. This file lays that grid:
 * every street, junction, pavement, crossing and parking bay is a whole cell of `TILE_M` (or, for the parking lines, two cells along its street), and the result is
 * handed on as a normal `Town` (map units, times `WORLD_PER_METRE`) so the rest of the pipeline can run on it. Terraces, lots and parking lots are section B;
 * drawing is section C. Here the town has roads, kerbs, pavements, pads (the junction boxes) and blocks, and nothing else.
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
 *   corner's two kerb edges are on its +x and +z sides, 90 its +x and -z, 180 its -x and -z, 270 its -x and +z. A two-cell piece is 2 cells along its street
 *   (local x along the street) and its (x_m, z_m) is the middle of the pair, on a cell edge.
 * - Every choice is a `stableHash` of a key with the seed, so a size and a seed give one city every time.
 */

import type { CityRect } from "../render/city";
import { stableHash } from "../render/city";
import { WORLD_PER_METRE, type Kerb, type Pad, type Pavement, type Pt, type Road, type Town, type TownBlock } from "./town";

// ---- constants (ticket 055) ----

/** One tile, metres: the City Pack's road and pavement tiles are 5 m squares. */
export const TILE_M = 5;
/** The sidewalk tile's height: the carriageway surface sits this far below the pavement top (design item 7). */
export const SIDEWALK_TOP_M = 0.3;
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
/** Bays in one `ParkingLines_01` tile (10 m by 5 m); eye-confirmed on the sheet (section C). */
export const BAYS_PER_PARKING_TILE = 2;
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

  // ---- kerbside parking: runs of parking cells between two junction boxes become pairs, except the cells next to each box ----
  const pair = new Uint8Array(W * H); // 1 first cell of a ParkingLines tile, 2 its second
  const bays: ParkingBay[] = [];
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
  for (const s of streets) {
    const n = s.bands.length;
    const intervals = s.axis === "x" ? cols.blocks : rows.blocks;
    for (let k = 0; k < n; k++) {
      if (s.bands[k] !== "parking") continue;
      const across = s.axis === "x" ? s.across0 + k : s.across0 + n - 1 - k;
      const coordSign = s.centre_m > (across + 0.5) * TILE_M ? -1 : 1;
      const yaw = yawOfBand(s, across);
      intervals.forEach((iv, alongIdx) => {
        const a0 = iv.first + BAY_JUNCTION_CLEAR;
        const m = iv.len - 2 * BAY_JUNCTION_CLEAR;
        const block = blockIdAt(s, coordSign, alongIdx);
        for (let p = 0; p + 2 <= m; p += 2) {
          const c0 = a0 + p;
          if (s.axis === "x") {
            pair[across * W + c0] = 1;
            pair[across * W + c0 + 1] = 2;
          } else {
            pair[c0 * W + across] = 1;
            pair[(c0 + 1) * W + across] = 2;
          }
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
      });
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
      if (r === "lane" || r === "parking" || r === "parkingPlain") {
        yaw = yawOfBand(own!, own!.axis === "x" ? j : i);
        if (r === "lane") {
          const firstLane = own!.bands.indexOf("lane");
          variant = bandIdx[idx]! - firstLane;
          if (hashOf(seed, "patch", i, j) % PATCH_ONE_IN === 0) variant |= LANE_PATCH;
        }
      } else if (r === "pavement") {
        yaw = yawToward(own!.axis, own!.carriage.lo_m > (own!.axis === "x" ? cz : cx) ? 1 : -1);
        const h = hashOf(seed, "pave", i, j);
        variant = h % GRATE_ONE_IN === 0 ? PAVEMENT_GRATE : (h >>> 8) & 1;
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
    // One kerb segment per pavement side per block, from corner to corner, on the carriageway's edge.
    const intervals = s.axis === "x" ? cols.blocks : rows.blocks;
    for (const e of [1, -1] as const) {
      const coordSign = s.axis === "x" ? e : -e;
      const at = (coordSign > 0 ? s.carriage.hi_m : s.carriage.lo_m) * u;
      for (const iv of intervals) {
        const p0 = iv.first * TILE_M * u;
        const p1 = (iv.first + iv.len) * TILE_M * u;
        kerbs.push(s.axis === "x" ? { road: s.id, side: e, ax: p0, az: at, bx: p1, bz: at } : { road: s.id, side: e, ax: at, az: p0, bx: at, bz: p1 });
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

  // ---- pavements: every pavement and corner cell once ----
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
  for (const s of xStreets) {
    for (const k of [0, s.bands.length - 1]) {
      const j = s.across0 + k;
      let start = -1;
      for (let i = 0; i <= W; i++) {
        const r = i < W ? role[j * W + i] : null;
        const on = r === "pavement" || r === "pavementCorner";
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
        const r = j < H ? role[j * W + i] : null;
        const on = r === "pavement";
        if (on && start < 0) start = j;
        if (!on && start >= 0) {
          pavements.push(rect(s.id, i, start, i + 1, j));
          start = -1;
        }
      }
    }
  }

  // ---- pole slots (reserved, nothing stands in them yet) ----
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
    lots: [],
    terraces: [],
    openLots: [],
    places: [],
    ring: { ...bounds },
    window: { ...bounds },
  };
  return deepFreeze({ blocksX, blocksZ, seed, cells, streets, bays, poleSlots, blocks: tileBlocks, town });
}
