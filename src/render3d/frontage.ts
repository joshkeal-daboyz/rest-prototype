/**
 * Ticket 057: the checks on the tile city's frontage, pure (no three, no DOM, no assets). Section A holds G1, B adds G2; C to G add G3, G4 and V1 to V4 here.
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
import { TERRACE_SEAM_M, nextTerraceRun, type PackResult } from "./terrace";
import type { Stack } from "./stacks";
import { END_OVERLAP_MAX_M, PASSAGE_W_M, type TileCity, type TilePassage, type TileYaw } from "./tilecity";
import { WORLD_PER_METRE } from "./town";

export { END_OVERLAP_MAX_M, PASSAGE_W_M };

/** The most a street-level wall may stand onto the pavement, metres (and the most a sill, frame or sign may stand past the wall: `WALL_REACH_M`). */
export const OVERLAP_MAX_M = WALL_REACH_M;
/** The most a street-level wall may stand behind the pavement's back edge, metres. */
export const RECESS_MAX_M = 0;
/** How far from the limits a wall may be and still pass, metres (float noise, and the 0.01 m the ticket allows). */
export const FRONTAGE_TOL_M = 0.01;

export type FrontageCheckId = "G1" | "G2";

/**
 * What each check allows: G1, how many street-level columns may stand off the wall line (behind the edge, or over the overlap limit); G2, how many stretches of a block side's pavement back edge
 * may be left with no wall, flank, seam, overshoot, gated passage, parking lot or plaza on them (and how many far ends may overshoot by more than `END_OVERLAP_MAX_M`).
 */
export const FRONTAGE_CHECK: Readonly<Record<FrontageCheckId, number>> = { G1: 0, G2: 0 };

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
export function frontageMetrics(city: Pick<TileCity, "town">, packed: ReadonlyMap<string, PackResult>, fronts: FrontTable = BUILDING_FRONTS, faceOffset?: FaceOffset): FrontageMetrics {
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
    ...edgeCoverage(city, packed),
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
        passages.push({ x_m: (s.ax + s.ux * mid) / U, z_m: (s.az + s.uz * mid) / U, w_m: g, yaw: yawDegrees(l.yaw), run: run.id });
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
  return [
    { id: "G1", value: g1, pass: g1 <= FRONTAGE_CHECK.G1 },
    { id: "G2", value: g2, pass: g2 <= FRONTAGE_CHECK.G2 },
  ];
}
