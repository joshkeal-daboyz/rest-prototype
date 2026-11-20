/**
 * Stage 1 (streets): the street network, the street cells' base roles and the block rectangles. Moved from `tileCity` in `src/render3d/tilecity.ts` (ticket 070 A1):
 * the function bodies are the tile city's, unchanged, apart from the types (`CityStreet` for `TileStreet`, `CityStreetBand` for `TileBand`) and the output shape.
 * Pure: no three, no DOM.
 */

import type { CityBlock, CityBlockType, CityStreet, CityStreetBand, CityStreetCell, CityStreetRole } from "../../core";
import { stageRand } from "../pipeline/seeds";
import {
  AVENUE_ONE_IN,
  BLOCK_CV_MIN,
  BLOCK_DRAWS_MAX,
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
  KERB_BAY_SHARE_MAX,
  TILE_M,
} from "./constants";

// ---- cross-sections ----

const AVENUE_BANDS: readonly CityStreetBand[] = ["pavement", "parking", "lane", "lane", "parking", "pavement"];
const STREET_BANDS_LEFT: readonly CityStreetBand[] = ["pavement", "parking", "lane", "lane", "pavement"];
const STREET_BANDS_RIGHT: readonly CityStreetBand[] = ["pavement", "lane", "lane", "parking", "pavement"];

/** The band of `street` at cell row (x street) or column (z street) `across`, or null when the cell is outside its cross-section. */
export function streetBandAt(street: Pick<CityStreet, "axis" | "bands" | "across0">, across: number): CityStreetBand | null {
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
  bands: readonly CityStreetBand[];
}
interface AxisLayout {
  streets: AxisStreet[];
  blocks: { first: number; len: number }[];
  total: number;
}

/** Stage 1's hash is today's `hashOf`: `stableHash("tile:<seed>:<key>")`, which is `stageRand("streets", seed)` (R-3). */
export const hashOf = (seed: number, ...key: (string | number)[]): number => stageRand("streets", seed)(...key);

/** `streetAxis` is the axis the streets of this layout run along ("z" streets stand at columns, so their layout counts cells along x). */
export function layoutAxis(seed: number, streetAxis: "x" | "z", blocks: number, lens: readonly number[]): AxisLayout {
  const lines = blocks + 1;
  const avenue: boolean[] = [];
  for (let l = 0; l < lines; l++) avenue.push(AVENUE_ONE_IN > 0 && l > 0 && l < lines - 1 && hashOf(seed, streetAxis, "avenue", l) % AVENUE_ONE_IN === 0);
  // With avenues on, every axis of three or more lines gets at least one; with them off (AVENUE_ONE_IN = 0) none does.
  if (AVENUE_ONE_IN > 0 && lines >= 3 && !avenue.some(Boolean)) {
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
      const len = lens[l]!;
      out.blocks.push({ first: pos, len });
      pos += len;
    }
  }
  out.total = pos;
  return out;
}

/**
 * The sizes, in cells, of the `n` blocks along one axis, in order (19.5): each by hash from `BLOCK_TILES`, at least `BLOCK_STEP_MIN_CELLS` from the one before, and not one already used while a size
 * that is still free exists. `draw` is the draw number: 0 first, and a draw that misses the variety rules (`blockSizesVary`) is repeated with the next. Pure.
 */
export function blockLens(seed: number, streetAxis: "x" | "z", n: number, draw: number): number[] {
  // The key "width" is one of a few that were tried (057 F): R7 is noise on the dressing's own escape chance. Changing it moves every city, and R7 with it.
  const out: number[] = [];
  for (let l = 0; l < n; l++) {
    const prev = l > 0 ? out[l - 1]! : null;
    const apart: number[] = [];
    for (let v = BLOCK_TILES.min; v <= BLOCK_TILES.max; v++) if (prev === null || Math.abs(v - prev) >= BLOCK_STEP_MIN_CELLS) apart.push(v);
    const fresh = apart.filter((v) => !out.includes(v));
    const pool = fresh.length > 0 ? fresh : apart;
    out.push(pool[hashOf(seed, streetAxis, "width", l, draw) % pool.length]!);
  }
  return out;
}

export const cvOf = (a: readonly number[]): number => {
  const m = a.reduce((x, y) => x + y, 0) / a.length;
  return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length) / m;
};

/**
 * Whether a city's column widths and row depths can be laid (ticket 057 F): a block needs one side long enough to hold a tile of kerbside bays inside a street side's share cap (056's P3: a 10 m tile in
 * `KERB_BAY_SHARE_MAX.street` of the side, so 7 cells, 35 m), or P1 (every block has bays serving it) could not be met for a 6 by 6 block on streets; and `BLOCK_MEAN_MIN_CELLS` on each axis.
 */
export function blockSizesWork(widths: readonly number[], depths: readonly number[]): boolean {
  const longEnough = Math.ceil((2 * TILE_M) / KERB_BAY_SHARE_MAX.street / TILE_M - 1e-9);
  for (const w of widths) for (const d of depths) if (Math.max(w, d) < longEnough) return false;
  const mean = (a: readonly number[]): number => a.reduce((x, y) => x + y, 0) / a.length;
  return mean(widths) >= BLOCK_MEAN_MIN_CELLS && mean(depths) >= BLOCK_MEAN_MIN_CELLS;
}

/** Whether a city's column widths and row depths meet the variety rules V1 and V2 hold (see `BLOCK_CV_MIN`); an axis with fewer than two blocks has nothing to vary. */
export function blockSizesVary(widths: readonly number[], depths: readonly number[]): boolean {
  if (widths.length >= 2 && cvOf(widths) < BLOCK_CV_MIN) return false;
  if (depths.length >= 2 && cvOf(depths) < BLOCK_CV_MIN) return false;
  const total = widths.length * depths.length;
  const footprints = new Set<number>();
  let square = 0;
  for (const w of widths) {
    for (const d of depths) {
      footprints.add(Math.min(w, d) * 100 + Math.max(w, d));
      if (w === d) square++;
    }
  }
  return footprints.size >= Math.ceil(total / 2) && (total - square) / total >= BLOCK_NONSQUARE_MIN;
}

/**
 * A layout of block sizes that holds every rule at every city size up to `CITY_BLOCKS_MAX` blocks a side, used when all `BLOCK_DRAWS_MAX` draws of a seed miss (057 G).
 */
export const BLOCK_FALLBACK_WIDTHS: readonly number[] = [13, 9, 15, 11, 16, 12];
export const BLOCK_FALLBACK_DEPTHS: readonly number[] = [10, 14, 8, 13, 15, 9];

/**
 * The widths (one per column of blocks) and depths (one per row) of a city, in cells: the first draw of `blockLens` that holds the variety rules and can be laid, at most `BLOCK_DRAWS_MAX` draws after it, else the
 * known-good fallback above (cut to the city's size). `accept` is the test the draws must pass. Pure.
 */
export function blockSizes(
  seed: number,
  blocksX: number,
  blocksZ: number,
  accept: (widths: readonly number[], depths: readonly number[]) => boolean = (w, d) => blockSizesVary(w, d) && blockSizesWork(w, d),
): { widths: number[]; depths: number[]; draw: number | null } {
  for (let draw = 0; draw <= BLOCK_DRAWS_MAX; draw++) {
    const widths = blockLens(seed, "z", blocksX, draw);
    const depths = blockLens(seed, "x", blocksZ, draw);
    if (accept(widths, depths)) return { widths, depths, draw };
  }
  return { widths: BLOCK_FALLBACK_WIDTHS.slice(0, blocksX), depths: BLOCK_FALLBACK_DEPTHS.slice(0, blocksZ), draw: null };
}

/** A block's type (19.5) from its sides in cells: small, long, large, else medium (the first three cannot overlap: small needs both sides at most 40 m, long one at least 60 m, large both at least 55 m). */
export function blockType(wCells: number, dCells: number): CityBlockType {
  const lo = Math.min(wCells, dCells) * TILE_M;
  const hi = Math.max(wCells, dCells) * TILE_M;
  if (hi <= BLOCK_SMALL_MAX_M) return "small";
  if (hi >= BLOCK_LONG_MIN_M && lo <= BLOCK_LONG_SHORT_MAX_M) return "long";
  if (lo >= BLOCK_LARGE_MIN_M) return "large";
  return "medium";
}

export const clampBlocks = (v: number | undefined): number => {
  if (v === undefined || !Number.isFinite(v)) return CITY_BLOCKS_DEFAULT;
  return Math.min(CITY_BLOCKS_MAX, Math.max(1, Math.floor(v)));
};

// ---- the street part of the city ----

/** The street a layout street is, from its axis. */
export const mkStreet = (axis: "x" | "z", a: AxisStreet): CityStreet => {
  const n = a.bands.length;
  // Pavements are the first and last band of every profile, so the carriageway is the cells between them, in either direction.
  const lo = (a.first + 1) * TILE_M;
  const hi = (a.first + n - 1) * TILE_M;
  const lane0 = a.bands.indexOf("lane");
  const centre = axis === "x" ? (a.first + lane0 + 1) * TILE_M : (a.first + n - 1 - lane0) * TILE_M;
  return { id: `${axis}:${a.line}`, axis, line: a.line, profile: a.profile, bands: a.bands, across0: a.first, carriage: { lo_m: lo, hi_m: hi }, centre_m: centre };
};

export interface StreetsLayout {
  readonly w: number;
  readonly h: number;
  readonly streets: CityStreet[];
  readonly cells: CityStreetCell[];
  readonly blocks: CityBlock[];
  readonly sizes: { widths: number[]; depths: number[]; draw: number | null };
}

/** `tileCity`'s street and block part: the streets, the base role of every street cell (a cell not listed is inside a block) and the block rectangles. `blocksX` and `blocksZ` are already clamped. */
export function layStreets(seed: number, blocksX: number, blocksZ: number): StreetsLayout {
  // Columns hold the "z" streets (which run along z) and the block widths; rows hold the "x" streets and the block depths.
  const { widths, depths, draw } = blockSizes(seed, blocksX, blocksZ);
  const cols = layoutAxis(seed, "z", blocksX, widths);
  const rows = layoutAxis(seed, "x", blocksZ, depths);
  const W = cols.total;
  const H = rows.total;

  const streets: CityStreet[] = [];
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
  const role: (CityStreetRole | null)[] = new Array<CityStreetRole | null>(W * H).fill(null);
  /** A cell's own street index (a band cell) or the carriageway street a crossing lies in; -1 for a junction or a corner. */
  const owner = new Array<CityStreet | null>(W * H).fill(null);
  /** The cell's band index in its street (single-street cells). */
  const bandIdx = new Int16Array(W * H).fill(-1);
  const isCarriage = (b: CityStreetBand): boolean => b === "lane" || b === "parking";
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

  // ---- the street cells, once each, row by row ----
  const cells: CityStreetCell[] = [];
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const idx = j * W + i;
      const r = role[idx] ?? null;
      if (r === null) continue;
      const own = owner[idx];
      cells.push({ i, j, role: r, street: r === "junction" || r === "pavementCorner" ? null : own!.id, band: bandIdx[idx]! });
    }
  }

  // ---- blocks ----
  const blocks: CityBlock[] = [];
  for (let bj = 0; bj < blocksZ; bj++) {
    for (let bi = 0; bi < blocksX; bi++) {
      const cb = cols.blocks[bi]!;
      const rb = rows.blocks[bj]!;
      const id = `block:${bi}:${bj}`;
      blocks.push({ id, type: blockType(cb.len, rb.len), bi, bj, i0: cb.first, i1: cb.first + cb.len, j0: rb.first, j1: rb.first + rb.len });
    }
  }

  return { w: W, h: H, streets, cells, blocks, sizes: { widths, depths, draw } };
}
