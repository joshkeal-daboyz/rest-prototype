/**
 * Ticket 057: the checks on the tile city's frontage, pure (no three, no DOM, no assets). Section A holds G1, B adds G2, C adds G3 and G4; F adds V1 and V2 (block variety, at the bottom of the file) and G will add V3 and V4.
 *
 * G3, no void (19.4; Josh, 18 Nov 2026: "Grass and pavement should fill the blank areas."): each block is rasterised at `VOID_RASTER_M` (0.25 m) and every sample must be a building (its columns' ground
 * footprint), a plaza or lot cell, an interior cell (apron, court, drive, green or path) or a gated passage's floor. At most `VOID_MAX_SHARE` (1%) of a block may be left, in no square over
 * `VOID_PATCH_MAX_M` (1 m) on a side. G4, courts reached: every court touches a drive, and every drive's outer neighbour is a kerb cut.
 *
 * G2, no gap in the frontage (19.2): along every block side the pavement's back edge is a wall, a corner flank, a seam (0.1 m or less), an overshoot into the next corner block (at most
 * `END_OVERLAP_MAX_M`), a gated passage (`PASSAGE_W_M`), a parking lot or a plaza, within `FRONTAGE_TOL_M`. `edgeCoverage` below lays each side's covered stretches end to end.
 *
 * G1, no recess (19.1): on every terrace column, the street-level wall plane (`facade.ts`) stands between the pavement's back edge and `OVERLAP_MAX_M` onto the pavement. Josh, 18 Nov 2026:
 * "It's okay if the buildings rest on top of the sidewalk and overlap a little bit. It is not okay if the buildings sit recessed from the sidewalk and leave a gap of nothing between them."
 * A recess is a wall behind the edge by more than `RECESS_MAX_M` (0) and `FRONTAGE_TOL_M`. A sill, frame or sign may stand past the wall (`WALL_REACH_M`, the same 0.6 m) and is not measured here.
 *
 * Where the wall plane of a piece is: `z + d / 2 - wallOffset(key, street)` in the lot frame (z is the piece's centre, d its depth after the turn, z = 0 the lot's front line), less the run's
 * `frame.wall_m` (where the pavement's back edge stands in front of the front line: 0 for every tile-city run). A key with no measured wall counts as its front bound.
 */

import { WALL_FRONT_M, WALL_REACH_M, WALL_SIDE_M, wallOffset } from "./facade";
import { BUILDING_FRONTS, type FrontTable } from "./models";
import { TERRACE_SEAM_M, nextTerraceRun, type PackResult, type PackedBlock } from "./terrace";
import type { Stack } from "./stacks";
import { BLOCK_CV_MIN, BLOCK_NONSQUARE_MIN, END_OVERLAP_MAX_M, PASSAGE_FLOOR_DEPTH_M, PASSAGE_W_M, TILE_M, type TileBlock, type TileCity, type TilePassage, type TileYaw } from "./tilecity";
import { WORLD_PER_METRE } from "./town";

export { END_OVERLAP_MAX_M, PASSAGE_W_M };

/** The most a street-level wall may stand onto the pavement, metres (and the most a sill, frame or sign may stand past the wall: `WALL_REACH_M`). */
export const OVERLAP_MAX_M = WALL_REACH_M;
/** The most a street-level wall may stand behind the pavement's back edge, metres. */
export const RECESS_MAX_M = 0;
/** How far from the limits a wall may be and still pass, metres (float noise, and the 0.01 m the ticket allows). */
export const FRONTAGE_TOL_M = 0.01;

/** The most of a block that may be left unfilled, as a share of its area (G3), and the largest unfilled square, metres on a side. */
export const VOID_MAX_SHARE = 0.01;
export const VOID_PATCH_MAX_M = 1.0;
/** G3 rasterises every block at this pitch, metres. */
export const VOID_RASTER_M = 0.25;

export type FrontageCheckId = "G1" | "G2" | "G3" | "G4";

/**
 * What each check allows: G1, how many street-level columns may stand off the wall line (behind the edge, or over the overlap limit); G2, how many stretches of a block side's pavement back edge
 * may be left with no wall, flank, seam, overshoot, gated passage, parking lot or plaza on them (and how many far ends may overshoot by more than `END_OVERLAP_MAX_M`).
 */
export const FRONTAGE_CHECK: Readonly<Record<FrontageCheckId, number>> = { G1: 0, G2: 0, G3: 0, G4: 0 };

/** How a run's far end closed (19.2), counted by `frontageMetrics`. `slit` is a gap of 0.1 to 1.0 m, `wide` one over a column wide; both are open. */
export interface FarEnds {
  runs: number;
  seam: number;
  overshoot: number;
  passage: number;
  slit: number;
  wide: number;
  /** Overshoots past `END_OVERLAP_MAX_M` (+ tolerance). */
  overshootBad: number;
  /** The deepest overshoot, metres. */
  overshootMax_m: number;
}

/** A stretch of a block side's pavement back edge that nothing covers: where, and how long, metres from the side's start corner (clockwise, as `terraceBlockRows` lays the sides). */
export interface FrontageGap {
  block: string;
  side: 0 | 1 | 2 | 3;
  from_m: number;
  to_m: number;
}

/** One block's raster (G3): its area, what is left unfilled, that as a share, and the side of the largest unfilled square, metres. */
export interface BlockVoid {
  block: string;
  area_m2: number;
  unfilled_m2: number;
  share: number;
  patch_m: number;
}

/** G3 and G4: how well the blocks' insides are filled, and whether the courts are reached. */
export interface InteriorMetrics {
  blocks: number;
  voids: readonly BlockVoid[];
  /** Blocks left with more than `VOID_MAX_SHARE` unfilled, or with an unfilled square over `VOID_PATCH_MAX_M`. */
  voidBlocks: number;
  shareMax: number;
  shareMean: number;
  patchMax_m: number;
  /** Court components (the court cells, edge-connected) and those that touch no drive. */
  courts: number;
  courtsUnreached: number;
  /** Drive cells and those whose neighbour outside the block is not a kerb cut. */
  drives: number;
  drivesNoKerbCut: number;
  /** Blocks that kept a frontage lot (`TileCity.frontLots`). */
  frontLots: number;
}

export interface FrontageMetrics {
  /** Terrace runs, and the columns and street-level pieces measured on them. */
  runs: number;
  columns: number;
  groundPieces: number;
  /** The most recessed street-level wall (negative: behind the pavement's back edge) and the one furthest onto the pavement, metres. 0 and 0 with nothing measured. */
  wallMin_m: number;
  wallMax_m: number;
  /** Street-level pieces whose wall is behind the edge by more than `RECESS_MAX_M` + `FRONTAGE_TOL_M`, and those over the pavement by more than `OVERLAP_MAX_M` + `FRONTAGE_TOL_M`. */
  recessed: number;
  overlapped: number;
  /** The most recessed upper-storey wall and the furthest-out one, metres (information: the storeys stand on the same line as the ground floor). */
  upperMin_m: number;
  upperMax_m: number;
  /** The farthest any piece's front bound stands onto the pavement, metres (a sill, frame, sign or cornice: information). */
  frontMax_m: number;
  /** Street-level pieces whose key has no measured wall in `facade.ts` (aligned on their front bound), by key. */
  unmeasured: readonly string[];
  /** G2: the block sides measured, the stretches of their back edges nothing covers (and the first few of them), and the longest one, metres. */
  sides: number;
  uncovered: number;
  uncoveredMax_m: number;
  gaps: readonly FrontageGap[];
  /** G2: how the runs' far ends closed, and the gated passages they leave (see `TileCity.passages`). */
  farEnds: FarEnds;
  passages: readonly TilePassage[];
  /** G3 and G4 (057 C). */
  interior: InteriorMetrics;
}

/**
 * How far behind its front bound a piece's street-level face stands, metres, for a key and the face on the road ("front" or "open"). `wallOffset` (the table the stacks align on) is the
 * default; a test passes a second, independently pinned source so G1 does not just agree with the table it aligned on (057 A review).
 */
export type FaceOffset = (key: `${string}:${string}`, street: "front" | "open") => number;

/** The wall plane of a piece, metres from the lot's front line toward the road. */
const wallZ = (p: { z: number; d: number; key: `${string}:${string}`; street: "front" | "open" }, face: FaceOffset): number => p.z + p.d / 2 - face(p.key, p.street);

/**
 * Where every street-level wall of a packed tile city stands against its pavement's back edge. `packed` is `packTown`'s result for the city (the map is keyed by run id); `fronts` as for
 * `assembleStack`. Pure: nothing is read but the packed stacks and the wall table.
 */
export function frontageMetrics(city: Pick<TileCity, "town"> & Partial<Pick<TileCity, "cells" | "interior" | "blocks" | "frontLots" | "passages">>, packed: ReadonlyMap<string, PackResult>, fronts: FrontTable = BUILDING_FRONTS, faceOffset?: FaceOffset): FrontageMetrics {
  const face: FaceOffset = faceOffset ?? ((key, street) => wallOffset(key, street, fronts));
  let runs = 0;
  let columns = 0;
  let groundPieces = 0;
  let wallMin = Infinity;
  let wallMax = -Infinity;
  let recessed = 0;
  let overlapped = 0;
  let upperMin = Infinity;
  let upperMax = -Infinity;
  let frontMax = -Infinity;
  const unmeasured = new Set<string>();
  const edge = edgeCoverage(city, packed);
  for (const run of city.town.terraces) {
    const blocks = packed.get(run.id)?.blocks ?? [];
    if (blocks.length === 0) continue;
    runs++;
    const edge = run.frame?.wall_m ?? 0;
    for (const b of blocks) {
      columns += b.stack.columns.length;
      for (const p of b.stack.pieces) {
        const onto = wallZ(p, face) - edge;
        frontMax = Math.max(frontMax, p.z + p.d / 2 - edge);
        if (p.role === "base") {
          groundPieces++;
          wallMin = Math.min(wallMin, onto);
          wallMax = Math.max(wallMax, onto);
          if (onto < -RECESS_MAX_M - FRONTAGE_TOL_M) recessed++;
          if (onto > OVERLAP_MAX_M + FRONTAGE_TOL_M) overlapped++;
          if (!hasWall(p.key, p.street)) unmeasured.add(p.key);
        } else if (p.role === "floor") {
          upperMin = Math.min(upperMin, onto);
          upperMax = Math.max(upperMax, onto);
        }
      }
    }
  }
  const fin = (v: number): number => (Number.isFinite(v) ? v : 0);
  return {
    runs,
    columns,
    groundPieces,
    wallMin_m: fin(wallMin),
    wallMax_m: fin(wallMax),
    recessed,
    overlapped,
    upperMin_m: fin(upperMin),
    upperMax_m: fin(upperMax),
    frontMax_m: fin(frontMax),
    unmeasured: [...unmeasured].sort(),
    ...edge,
    interior: interiorMetrics(city, packed),
  };
}

// ---- G2: the pavement's back edge is covered along every block side (19.2) ----

const U = WORLD_PER_METRE;
const EPS = 1e-9;
/** Stretches of a side reported by `FrontageMetrics.gaps` (the count is complete). */
const GAPS_LISTED = 12;

/** One side of a block as `terraceBlockRows` lays it: where it starts, which way it runs, which way is into the block, and its length; map units. */
interface SideLine {
  ax: number;
  az: number;
  ux: number;
  uz: number;
  mx: number;
  mz: number;
  span: number;
}

/** The four sides of a block, clockwise from the top (the order `tileCity` and `terraceBlockRows` use). */
function sidesOfBlock(b: { minX: number; minZ: number; maxX: number; maxZ: number }): [SideLine, SideLine, SideLine, SideLine] {
  return [
    { ax: b.minX, az: b.minZ, ux: 1, uz: 0, mx: 0, mz: 1, span: b.maxX - b.minX },
    { ax: b.maxX, az: b.minZ, ux: 0, uz: 1, mx: -1, mz: 0, span: b.maxZ - b.minZ },
    { ax: b.maxX, az: b.maxZ, ux: -1, uz: 0, mx: 0, mz: -1, span: b.maxX - b.minX },
    { ax: b.minX, az: b.maxZ, ux: 0, uz: -1, mx: 1, mz: 0, span: b.maxZ - b.minZ },
  ];
}

/** Where a footprint (corner points, map units) touches a side's back edge: its extent along the side in metres from the side's start, or null when it stands off the edge. */
function onEdge(pts: readonly { x: number; z: number }[], s: SideLine): [number, number] | null {
  let tLo = Infinity;
  let tHi = -Infinity;
  let pLo = Infinity;
  for (const p of pts) {
    const dx = p.x - s.ax;
    const dz = p.z - s.az;
    const t = (dx * s.ux + dz * s.uz) / U;
    const perp = (dx * s.mx + dz * s.mz) / U;
    tLo = Math.min(tLo, t);
    tHi = Math.max(tHi, t);
    pLo = Math.min(pLo, perp);
  }
  return Math.abs(pLo) <= FRONTAGE_TOL_M ? [tLo, tHi] : null;
}

/**
 * How far behind the wall line the corner column's street-level back stands, metres: its ground piece (`base`), not the deepest piece of the stack (a roof is up to 0.75 m deeper). A stack with no
 * corner column, or no ground piece in it, is measured by its whole depth.
 */
export function groundDepth_m(stack: Pick<Stack, "columns" | "pieces" | "depth_m">): number {
  const col = stack.columns.findIndex((c) => c.corner !== null);
  const ground = stack.pieces.filter((p) => p.role === "base" && p.column === col);
  return col < 0 || ground.length === 0 ? stack.depth_m : Math.max(...ground.map((p) => p.d / 2 - p.z));
}

const yawDegrees = (rad: number): TileYaw => ((((Math.round(rad / (Math.PI / 2)) * 90) % 360) + 360) % 360) as TileYaw;

/**
 * G2: along every block side, what stands on the pavement's back edge. A building's footprint (its columns across, its stack's depth back from the front line), a plaza or a parking lot
 * covers the stretch it touches; a corner block of the next row covers the end of the side with its flank (its footprint touches the side's line there only when it stands flush: an inset
 * leaves a stretch bare); a run's far gap of at most `TERRACE_SEAM_M` is a seam and one of `PASSAGE_W_M` a gated passage. Whatever is left bare, beyond `FRONTAGE_TOL_M`, is a gap in the
 * frontage. An overshoot into the next corner block needs no cover (the blocks overlap) but is held to `END_OVERLAP_MAX_M`.
 */
function edgeCoverage(city: Pick<TileCity, "town">, packed: ReadonlyMap<string, PackResult>): Pick<FrontageMetrics, "sides" | "uncovered" | "uncoveredMax_m" | "gaps" | "farEnds" | "passages"> {
  const t = city.town;
  const farEnds: FarEnds = { runs: 0, seam: 0, overshoot: 0, passage: 0, slit: 0, wide: 0, overshootBad: 0, overshootMax_m: 0 };
  const passages: TilePassage[] = [];
  const gaps: FrontageGap[] = [];
  let uncovered = 0;
  let uncoveredMax = 0;
  let sides = 0;
  const inside = (b: { minX: number; minZ: number; maxX: number; maxZ: number }, x: number, z: number): boolean => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ;
  for (const b of t.blocks) {
    const lines = sidesOfBlock(b);
    const spans: [number, number][][] = [[], [], [], []];
    const cover = (pts: readonly { x: number; z: number }[]): void => {
      lines.forEach((s, k) => {
        const e = onEdge(pts, s);
        if (e) spans[k]!.push([Math.max(0, e[0]), Math.min(s.span / U, e[1])]);
      });
    };
    // Parking lots and plazas standing in this block.
    for (const o of t.openLots) {
      if (!inside(b, o.x, o.z)) continue;
      const fx = Math.sin(o.yaw);
      const fz = Math.cos(o.yaw);
      const rx = Math.cos(o.yaw);
      const rz = -Math.sin(o.yaw);
      const frontX = o.x + (fx * o.d) / 2;
      const frontZ = o.z + (fz * o.d) / 2;
      cover([-1, 1].flatMap((a) => [0, 1].map((d) => ({ x: frontX + rx * (a * o.w) / 2 - fx * d * o.d, z: frontZ + rz * (a * o.w) / 2 - fz * d * o.d }))));
    }
    // Buildings: every packed block of every run of this block.
    for (const run of t.terraces) {
      if (run.block !== b.id) continue;
      const res = packed.get(run.id);
      if (!res || res.blocks.length === 0) continue;
      let s0 = 0;
      for (const pb of res.blocks) {
        const l = pb.lot;
        const fx = Math.sin(l.yaw);
        const fz = Math.cos(l.yaw);
        const rx = Math.cos(l.yaw);
        const rz = -Math.sin(l.yaw);
        const frontX = l.x + (fx * l.d) / 2;
        const frontZ = l.z + (fz * l.d) / 2;
        // A corner block's flank is the street-level wall of its corner column, not its deepest piece (the roof stands further back): 057 A's ground-face rule.
        const depth = (pb.corner ? groundDepth_m(pb.stack) : pb.stack.depth_m) * U;
        cover([-1, 1].flatMap((a) => [0, 1].map((d) => ({ x: frontX + (rx * a * l.w) / 2 - fx * d * depth, z: frontZ + (rz * a * l.w) / 2 - fz * d * depth }))));
        s0 += pb.stack.width_m;
      }
      // The far end: from the last building's pieces to the wall, lot or plaza beyond.
      farEnds.runs++;
      const k = lines.findIndex((s) => Math.abs(s.ux - run.ux) + Math.abs(s.uz - run.uz) < 1e-6);
      // The packer closes a corner end to the next corner block's deepest piece (`wallTo`); the flank at street level stands `flank` metres nearer the corner, so the real opening is that much wider.
      const nxt = run.endAbuts === "corner" ? nextTerraceRun(t.terraces, run) : undefined;
      const nb = nxt && nxt.startCorner !== null ? packed.get(nxt.id)?.blocks[0] : undefined;
      const flank = nb && nb.corner ? Math.max(0, nb.stack.depth_m - groundDepth_m(nb.stack)) : 0;
      const real = res.farGap_m - (res.farOvershoot_m ?? 0) + flank;
      const g = Math.max(0, real);
      const over = Math.max(0, -real);
      let kind: "seam" | "overshoot" | "passage" | "open" = "open";
      if (over > EPS) {
        kind = "overshoot";
        farEnds.overshoot++;
        farEnds.overshootMax_m = Math.max(farEnds.overshootMax_m, over);
        if (over > END_OVERLAP_MAX_M + FRONTAGE_TOL_M) farEnds.overshootBad++;
      } else if (g <= TERRACE_SEAM_M + EPS) {
        kind = "seam";
        farEnds.seam++;
      } else if (g >= PASSAGE_W_M.min - EPS && g <= PASSAGE_W_M.max + EPS) {
        kind = "passage";
        farEnds.passage++;
      } else if (g < PASSAGE_W_M.min) farEnds.slit++;
      else farEnds.wide++;
      if (k < 0) continue;
      const s = lines[k]!;
      const t0 = ((run.ax - s.ax) * s.ux + (run.az - s.az) * s.uz) / U;
      const from = t0 + s0 + res.farOverhang_m;
      // The overhang of the last block's pieces covers the stretch it stands over, as the blocks' own extents do not reach it.
      spans[k]!.push([t0 + s0, from]);
      if (kind === "seam" || kind === "passage") spans[k]!.push([from, from + g]);
      if (kind === "passage") {
        const mid = (from + g / 2) * U;
        const l = res.blocks[res.blocks.length - 1]!.lot;
        const px = (s.ax + s.ux * mid) / U;
        const pz = (s.az + s.uz * mid) / U;
        // The floor: the passage wide along the edge, `PASSAGE_FLOOR_DEPTH_M` in from it (the lot's front points at the street, so inward is -f).
        const fx = Math.sin(l.yaw);
        const fz = Math.cos(l.yaw);
        const rx = Math.cos(l.yaw);
        const rz = -Math.sin(l.yaw);
        const xs = [-g / 2, g / 2].flatMap((a) => [0, -PASSAGE_FLOOR_DEPTH_M].map((back) => px + rx * a + fx * back));
        const zs = [-g / 2, g / 2].flatMap((a) => [0, -PASSAGE_FLOOR_DEPTH_M].map((back) => pz + rz * a + fz * back));
        passages.push({ x_m: px, z_m: pz, w_m: g, yaw: yawDegrees(l.yaw), run: run.id, floor: { minX_m: Math.min(...xs), minZ_m: Math.min(...zs), maxX_m: Math.max(...xs), maxZ_m: Math.max(...zs) } });
      }
    }
    lines.forEach((s, k) => {
      sides++;
      const span = s.span / U;
      const list = spans[k]!.slice().sort((p, q) => p[0] - q[0]);
      let at = 0;
      const open = (a: number, c: number): void => {
        uncovered++;
        uncoveredMax = Math.max(uncoveredMax, c - a);
        if (gaps.length < GAPS_LISTED) gaps.push({ block: b.id, side: k as 0 | 1 | 2 | 3, from_m: a, to_m: c });
      };
      for (const [lo, hi] of list) {
        if (lo > at + FRONTAGE_TOL_M) open(at, lo);
        at = Math.max(at, hi);
      }
      if (span - at > FRONTAGE_TOL_M) open(at, span);
    });
  }
  return { sides, uncovered, uncoveredMax_m: uncoveredMax, gaps, farEnds, passages };
}

// ---- G3 and G4: the blocks' insides (19.4) ----

/** The ground footprint of each column of a packed block, as rectangles in the lot frame: across (metres along the road, from the lot's centre line) and how far back from the front line. */
function columnFootprints(pb: PackedBlock): { x0: number; x1: number; depth: number }[] {
  const base = pb.stack.pieces.filter((p) => p.role === "base");
  return pb.stack.columns.map((c) => {
    const x0 = c.x - c.w / 2;
    const x1 = c.x + c.w / 2;
    let depth = Infinity;
    for (const p of base) {
      // A piece belongs to every column it covers by more than a sliver (a shop two columns wide stands in both).
      if (Math.min(x1, p.x + p.w / 2) - Math.max(x0, p.x - p.w / 2) > 0.05) depth = Math.min(depth, p.d / 2 - p.z);
    }
    return { x0, x1, depth: Number.isFinite(depth) ? depth : pb.stack.depth_m };
  });
}

/** The side of the largest square of ones in a raster of `nx` by `nz` samples (0 where none). */
function largestEmptySquare(empty: Uint8Array, nx: number, nz: number): number {
  let prev = new Int32Array(nx + 1);
  let cur = new Int32Array(nx + 1);
  let best = 0;
  for (let j = 0; j < nz; j++) {
    cur[0] = 0;
    for (let i = 0; i < nx; i++) {
      if (empty[j * nx + i] === 0) cur[i + 1] = 0;
      else {
        cur[i + 1] = 1 + Math.min(prev[i]!, prev[i + 1]!, cur[i]!);
        if (cur[i + 1]! > best) best = cur[i + 1]!;
      }
    }
    [prev, cur] = [cur, prev];
  }
  return best;
}

/**
 * G3 and G4 of a packed tile city (see the file header). The gated passages' floors are read from `city.passages` (`withPassages(city, tilePassages(...))`), never from the packing. The cells that count as filled are read from `city.cells` (plazas
 * and frontage lots) and `city.interior`, never from the code that laid them, so a layout with no interior fails.
 */
export function interiorMetrics(city: Pick<TileCity, "town"> & Partial<Pick<TileCity, "cells" | "interior" | "blocks" | "frontLots" | "passages">>, packed: ReadonlyMap<string, PackResult>): InteriorMetrics {
  const t = city.town;
  const cells = city.cells ?? [];
  const interior = city.interior ?? [];
  const blocks = city.blocks ?? [];
  const res = VOID_RASTER_M;
  const voids: BlockVoid[] = [];
  const cellsOf = new Map<string, { i: number; j: number }[]>();
  const add = (block: string, i: number, j: number): void => {
    const l = cellsOf.get(block);
    if (l) l.push({ i, j });
    else cellsOf.set(block, [{ i, j }]);
  };
  const blockOfCell = (i: number, j: number): string | undefined => blocks.find((b) => i >= b.i0 && i < b.i1 && j >= b.j0 && j < b.j1)?.id;
  for (const c of cells) {
    if (c.role !== "lotSurface" && c.role !== "plaza") continue;
    const id = blockOfCell(c.i, c.j);
    if (id !== undefined) add(id, c.i, c.j);
  }
  for (const c of interior) add(c.block, c.i, c.j);
  const floors = (city.passages ?? []).map((q) => q.floor);
  for (const b of t.blocks) {
    const x0 = b.minX / U;
    const z0 = b.minZ / U;
    const nx = Math.round((b.maxX - b.minX) / U / res);
    const nz = Math.round((b.maxZ - b.minZ) / U / res);
    const empty = new Uint8Array(nx * nz).fill(1);
    /** Marks the samples whose middles lie in the rectangle (metres, absolute). */
    const fill = (ax0: number, ax1: number, az0: number, az1: number): void => {
      const i0 = Math.max(0, Math.ceil((Math.min(ax0, ax1) - x0 - 1e-6) / res - 0.5));
      const i1 = Math.min(nx - 1, Math.floor((Math.max(ax0, ax1) - x0 + 1e-6) / res - 0.5));
      const j0 = Math.max(0, Math.ceil((Math.min(az0, az1) - z0 - 1e-6) / res - 0.5));
      const j1 = Math.min(nz - 1, Math.floor((Math.max(az0, az1) - z0 + 1e-6) / res - 0.5));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) empty[j * nx + i] = 0;
    };
    for (const c of cellsOf.get(b.id) ?? []) fill(c.i * TILE_M, (c.i + 1) * TILE_M, c.j * TILE_M, (c.j + 1) * TILE_M);
    // Buildings: each column's ground footprint, from the pavement's back edge (the lot's front line) back to the column's own back wall.
    for (const run of t.terraces) {
      if (run.block !== b.id) continue;
      for (const pb of packed.get(run.id)?.blocks ?? []) {
        const l = pb.lot;
        const fx = Math.sin(l.yaw);
        const fz = Math.cos(l.yaw);
        const rx = Math.cos(l.yaw);
        const rz = -Math.sin(l.yaw);
        const frontX = (l.x + (fx * l.d) / 2) / U;
        const frontZ = (l.z + (fz * l.d) / 2) / U;
        for (const c of columnFootprints(pb)) {
          const xs = [c.x0, c.x1].flatMap((a) => [0, -c.depth].map((back) => frontX + rx * a + fx * back));
          const zs = [c.x0, c.x1].flatMap((a) => [0, -c.depth].map((back) => frontZ + rz * a + fz * back));
          fill(Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs));
        }
      }
    }
    // Gated passages: the floor each passage records (`TilePassage.floor`, apron pavement from the edge inward); a passage with no recorded floor leaves its slot unfilled. The raster clips to this block.
    for (const f of floors) fill(f.minX_m, f.maxX_m, f.minZ_m, f.maxZ_m);
    let left = 0;
    for (let k = 0; k < empty.length; k++) left += empty[k]!;
    const area = nx * nz * res * res;
    voids.push({ block: b.id, area_m2: area, unfilled_m2: left * res * res, share: area > 0 ? (left * res * res) / area : 0, patch_m: largestEmptySquare(empty, nx, nz) * res });
  }
  const voidBlocks = voids.filter((v) => v.share > VOID_MAX_SHARE + 1e-9 || v.patch_m > VOID_PATCH_MAX_M + 1e-9).length;

  // G4: every court touches a drive, and every drive's neighbour outside its block is a kerb cut.
  const key = (i: number, j: number): string => `${i},${j}`;
  const roleAt = new Map(interior.map((c) => [key(c.i, c.j), c.role] as const));
  const kerbCut = new Set(cells.filter((c) => c.role === "kerbCut").map((c) => key(c.i, c.j)));
  const seen = new Set<string>();
  let courts = 0;
  let courtsUnreached = 0;
  const near = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;
  for (const c of interior) {
    if (c.role !== "court" || seen.has(key(c.i, c.j))) continue;
    courts++;
    let touches = false;
    const todo = [{ i: c.i, j: c.j }];
    seen.add(key(c.i, c.j));
    while (todo.length > 0) {
      const q = todo.pop()!;
      for (const [di, dj] of near) {
        const k = key(q.i + di, q.j + dj);
        const r = roleAt.get(k);
        if (r === "drive") touches = true;
        if (r === "court" && !seen.has(k)) {
          seen.add(k);
          todo.push({ i: q.i + di, j: q.j + dj });
        }
      }
    }
    if (!touches) courtsUnreached++;
  }
  const driveCells = interior.filter((c) => c.role === "drive");
  let drivesNoKerbCut = 0;
  for (const d of driveCells) {
    const b = blocks.find((q) => q.id === d.block);
    if (!b) {
      drivesNoKerbCut++;
      continue;
    }
    const outs: [number, number][] = [];
    if (d.i === b.i0) outs.push([d.i - 1, d.j]);
    if (d.i === b.i1 - 1) outs.push([d.i + 1, d.j]);
    if (d.j === b.j0) outs.push([d.i, d.j - 1]);
    if (d.j === b.j1 - 1) outs.push([d.i, d.j + 1]);
    if (!outs.some(([i, j]) => kerbCut.has(key(i, j)))) drivesNoKerbCut++;
  }
  const shares = voids.map((v) => v.share);
  return {
    blocks: voids.length,
    voids,
    voidBlocks,
    shareMax: shares.length > 0 ? Math.max(...shares) : 0,
    shareMean: shares.length > 0 ? shares.reduce((a, b) => a + b, 0) / shares.length : 0,
    patchMax_m: voids.length > 0 ? Math.max(...voids.map((v) => v.patch_m)) : 0,
    courts,
    courtsUnreached,
    drives: driveCells.length,
    drivesNoKerbCut,
    frontLots: (city.frontLots ?? []).length,
  };
}

/** The gated passages of a packed tile city (`TileCity.passages` once `withPassages` has them): where a run's far end closes with a gap of `PASSAGE_W_M`. */
export function tilePassages(city: Pick<TileCity, "town">, packed: ReadonlyMap<string, PackResult>): TilePassage[] {
  return [...edgeCoverage(city, packed).passages];
}

/** Whether `facade.ts` has a measured wall for the piece's street face (a key with none aligns on its front bound). */
function hasWall(key: string, street: "front" | "open"): boolean {
  return Object.prototype.hasOwnProperty.call(street === "front" ? WALL_FRONT_M : WALL_SIDE_M, key);
}

export interface FrontageVerdict {
  id: FrontageCheckId;
  /** The number the check is judged on (a count of columns off the wall line). */
  value: number;
  pass: boolean;
}

/**
 * Each check against `FRONTAGE_CHECK`. G1 counts the street-level pieces behind the pavement's back edge or over the overlap limit, and a city with no street-level piece measured at all
 * fails (value 1): a city with nothing packed has not shown its walls on the pavement.
 */
export function evaluateFrontage(m: FrontageMetrics): FrontageVerdict[] {
  const g1 = m.recessed + m.overlapped + (m.groundPieces === 0 ? 1 : 0);
  const g2 = m.uncovered + m.farEnds.overshootBad + (m.sides === 0 ? 1 : 0);
  const g3 = m.interior.voidBlocks + (m.interior.blocks === 0 ? 1 : 0);
  const g4 = m.interior.courtsUnreached + m.interior.drivesNoKerbCut + (m.interior.blocks === 0 ? 1 : 0);
  return [
    { id: "G1", value: g1, pass: g1 <= FRONTAGE_CHECK.G1 },
    { id: "G2", value: g2, pass: g2 <= FRONTAGE_CHECK.G2 },
    { id: "G3", value: g3, pass: g3 <= FRONTAGE_CHECK.G3 },
    { id: "G4", value: g4, pass: g4 <= FRONTAGE_CHECK.G4 },
  ];
}

// ---- block variety (ticket 057 F, 19.5): V1 and V2 ----

export { BLOCK_CV_MIN, BLOCK_NONSQUARE_MIN };

/**
 * Josh, 18 Nov 2026: "Keep in mind, 90 degrees does not mean a grid of squares. You can have varying widths for blocks, alleyways, parks... etc". V1, block sizes vary: on each axis the sizes of the
 * blocks along it (the spacing between its street lines, less the street, in cells) have a coefficient of variation (standard deviation over mean) of at least `BLOCK_CV_MIN`, and the city has at least
 * ceil(blocks / 2) distinct footprints (a footprint is the block's pair of sides, so 50 x 60 m and 60 x 50 m are one). V2, not square: at least `BLOCK_NONSQUARE_MIN` of the blocks are not square.
 * An axis with fewer than two blocks has nothing to vary and is not held to V1's CV. V3 (alleys) and V4 (parks) are section G's.
 */
export type VarietyCheckId = "V1" | "V2";

/** What each check allows: V1, how many of its parts may fail (an axis under `BLOCK_CV_MIN`, too few footprints); V2, how many blocks over the square allowance. */
export const VARIETY_CHECK: Readonly<Record<VarietyCheckId, number>> = { V1: 0, V2: 0 };

/** The part of a block `blockVariety` reads: its place in the city's grid of blocks and its cells. */
export type VarietyBlock = Pick<TileBlock, "bi" | "bj" | "i0" | "i1" | "j0" | "j1">;

export interface BlockVariety {
  blocks: number;
  /** The block sizes along x (one per column of blocks, in cells) and along z (one per row of blocks). */
  widths: readonly number[];
  depths: readonly number[];
  /** Each axis's coefficient of variation; 0 for an axis with fewer than two blocks (which V1 does not hold). */
  cvX: number;
  cvZ: number;
  /** Distinct footprints, and how many V1 asks for: ceil(blocks / 2). */
  footprints: number;
  footprintsNeeded: number;
  /** Square blocks, and the share that are not. */
  square: number;
  nonSquareShare: number;
}

const cvOf = (a: readonly number[]): number => {
  if (a.length < 2) return 0;
  const m = a.reduce((x, y) => x + y, 0) / a.length;
  return m > 0 ? Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length) / m : 0;
};

/** The numbers behind V1 and V2, read from the blocks' cells alone (never from the code that drew the sizes). */
export function blockVariety(city: { blocks: readonly VarietyBlock[] }): BlockVariety {
  const widthAt = new Map<number, number>();
  const depthAt = new Map<number, number>();
  const shapes = new Set<string>();
  let square = 0;
  for (const b of city.blocks) {
    const w = b.i1 - b.i0;
    const d = b.j1 - b.j0;
    widthAt.set(b.bi, w);
    depthAt.set(b.bj, d);
    shapes.add(`${Math.min(w, d)}x${Math.max(w, d)}`);
    if (w === d) square++;
  }
  const widths = [...widthAt].sort((p, q) => p[0] - q[0]).map(([, v]) => v);
  const depths = [...depthAt].sort((p, q) => p[0] - q[0]).map(([, v]) => v);
  const n = city.blocks.length;
  return { blocks: n, widths, depths, cvX: cvOf(widths), cvZ: cvOf(depths), footprints: shapes.size, footprintsNeeded: Math.ceil(n / 2), square, nonSquareShare: n > 0 ? (n - square) / n : 0 };
}

export interface VarietyVerdict {
  id: VarietyCheckId;
  value: number;
  pass: boolean;
}

/** V1 and V2 against `VARIETY_CHECK`. A city with no blocks fails both (value 1): nothing has shown any variety. */
export function evaluateVariety(m: BlockVariety): VarietyVerdict[] {
  const cvLow = (axis: readonly number[], cv: number): number => (axis.length >= 2 && cv < BLOCK_CV_MIN - 1e-9 ? 1 : 0);
  const v1 = cvLow(m.widths, m.cvX) + cvLow(m.depths, m.cvZ) + (m.footprints < m.footprintsNeeded ? 1 : 0) + (m.blocks === 0 ? 1 : 0);
  const allowed = Math.floor(m.blocks * (1 - BLOCK_NONSQUARE_MIN) + 1e-9);
  const v2 = Math.max(0, m.square - allowed) + (m.blocks === 0 ? 1 : 0);
  return [
    { id: "V1", value: v1, pass: v1 <= VARIETY_CHECK.V1 },
    { id: "V2", value: v2, pass: v2 <= VARIETY_CHECK.V2 },
  ];
}
