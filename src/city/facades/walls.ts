/**
 * Stage 7, H2: door canopies and the upper-wall props (ticket 070 H2 criterion 4; readings WP1 to WP3, RQ). The tile city's `dressBlock` door canopy, wall air-conditioner and window planter rules on the pipeline's
 * cells, after the escape and H1b's dressing. Pure: it reads `mass`, `buildings`, the stage's own ground pieces and dressing, and the stage's `rand`.
 * - **WP1** storey k of a building (2 up to its top) stands at y = 3 k; an air-conditioner (`WALL_AC_OFFSET_M` left or right of its column's centre by hash) at 3 k + `WALL_AC_LIFT_M`, a planter (centred) at
 *   3 k + `PLANTER_LIFT_M`, its back on the host floor piece's bounds front. Up to `WALL_PROPS_PER_BLOCK` a building, storey by storey and column by column; none on the escape column.
 * - **WP2** a prop stands on a `mid` or `corner` column's front only, never on a blind column, street and quiet fronts alike.
 * - **WP3** a canopy stands over a `door` piece (street or quiet), at `DOOR_CANOPY_Y_M` over the piece's base, raised by its level (L1); a `doorCorner` takes none (Josh, 21 Nov 2026, Q23 answer 5).
 * - **RQ** no piece's outer face stands more than `CELL_M` past its column's front cell edge.
 * A column holds at most `DRESS_PER_BAY_MAX` pieces counting H1b's dressing and the escape's weight; a piece that would pass it is not placed.
 * Every choice is `rand("wall", slot, building id, ...)` through `unitOf`.
 */

import type { CalibrationKey, CityBuildingsLayer, CityCell, CityPlacement, CityColumn, CityDressingPiece, CityGroundPiece, CityMassLayer, CityWallPiece } from "../../core";
import type { StageRand } from "../pipeline/seeds";
import { CELL_M } from "./constants";
import { bayFrame, hostFront, placementOf, type BayFrame } from "./dress";
import { DRESS_PER_BAY_MAX } from "./dresskit";
import { type DecidedEscape, columnWidth, escapeWeight, floorFront, floorOver, frameOfColumn, fromFrame } from "./escape";
import { type Ctx, makeCtx } from "./facts";
import { unitOf } from "./hash";
import { keyOf } from "./place";
import { DOOR_CANOPIES, DOOR_CANOPY_Y_M, PLANTER_LIFT_M, P_CANOPY, P_PLANTER, P_WALL_AC, WALL_ACS, WALL_AC_LIFT_M, WALL_AC_OFFSET_M, WALL_MIN_LEVEL, WALL_PLANTERS, WALL_PROPS_PER_BLOCK, wallBounds } from "./wallkit";

const EPS = 1e-9;
const HALF = CELL_M / 2;
const norm = (n: number): number => (n === 0 ? 0 : n);

export interface WallStats {
  readonly canopies: number;
  /** Door corners left bare (WP3). */
  readonly doorCornersBare: number;
  readonly aircons: number;
  readonly planters: number;
  /** Pieces the column cap turned away. */
  readonly capTurnedAway: number;
  /** Pieces a fit or reach turned away. */
  readonly noFit: number;
  /** Buildings that reached `WALL_PROPS_PER_BLOCK`. */
  readonly buildingsAtPropCap: number;
}

/** The frame of any ground piece's bay (a street or a quiet door too), as H1b's `baysOf` makes it. */
export function frameOfGround(ctx: Ctx, g: CityGroundPiece): BayFrame {
  const cols = g.cells.map((c) => ctx.col.get(keyOf(c))!);
  const col = cols[0]!;
  return bayFrame({ g, yaw: col.yaw, floors: cols.map((c) => c.pieces[0]!.placement), topM: col.ground.top_m });
}

/** A front-face piece in a bay's frame: back on its host's front, centred on `x` and clamped inside [left, right], base at `y`; null when wider than the span or past `CELL_M` beyond the front cell edge (RQ). */
function onFaceOf(f: BayFrame, key: CalibrationKey, x: number, y: number): { x: number; z: number } | null {
  const e = wallBounds(key);
  if (e.w > f.right - f.left + EPS) return null;
  const xx = Math.min(Math.max(x, f.left + e.w / 2), f.right - e.w / 2);
  const z = hostFront(f, y) + e.d / 2;
  if (z + e.d / 2 - HALF > CELL_M + EPS) return null;
  return { x: xx, z };
}

/** A door canopy's placement over its door's bay (WP3): centred on the door, its back on the ground piece's front, `DOOR_CANOPY_Y_M` over its base, raised by its level (L1); null when it does not fit or reaches too far (RQ). */
export function placeCanopy(f: BayFrame, key: CalibrationKey): CityPlacement | null {
  const at = onFaceOf(f, key, f.gx, DOOR_CANOPY_Y_M);
  return at ? placementOf(f, key, at.x, DOOR_CANOPY_Y_M, at.z) : null;
}

/**
 * An upper-wall prop's placement (WP1): on its column's front, its back on the host floor piece's bounds front, centred on `x` in the column's frame (clamped inside the column), its base `lift` over the floor of `storey`
 * (the floors do not move: no level is added); null when it is wider than the column or reaches past `CELL_M` beyond the front cell edge (RQ).
 */
export function placeProp(col: CityColumn, key: CalibrationKey, storey: number, x: number, lift: number): CityPlacement | null {
  const host = floorOver(col, storey);
  if (!host) return null;
  const e = wallBounds(key);
  const f = frameOfColumn(col);
  const half = columnWidth(col) / 2;
  if (e.w > 2 * half + EPS) return null;
  const xx = Math.min(Math.max(x, -half + e.w / 2), half - e.w / 2);
  const z = floorFront(f, host) + e.d / 2;
  if (z + e.d / 2 - HALF > CELL_M + EPS) return null;
  const at = fromFrame(f, xx, z);
  return { key, x_m: at.x, y_m: norm(col.ground.top_m * storey + lift), z_m: at.z, yaw_deg: col.yaw };
}

/**
 * The canopies and wall props of every building, in `buildings.buildings` order: its escape's pieces bottom up, then its canopies along the row, then its props storey by storey and along the row in each.
 * `escapes` is the stage's decision (building id to its escape); `dressing` is H1b's, whose counts the caps start from.
 */
export function buildWalls(
  mass: Pick<CityMassLayer, "cells" | "built">,
  buildings: Pick<CityBuildingsLayer, "rows" | "columns" | "buildings">,
  ground: readonly CityGroundPiece[],
  dressing: readonly CityDressingPiece[],
  escapes: ReadonlyMap<string, DecidedEscape>,
  rand: StageRand,
): { walls: CityWallPiece[]; stats: WallStats } {
  const ctx = makeCtx(mass, buildings);
  const groundOf = new Map<string, CityGroundPiece[]>();
  for (const g of ground) (groundOf.get(g.building) ?? groundOf.set(g.building, []).get(g.building)!).push(g);
  const dressOf = new Map<string, number>();
  for (const p of dressing) dressOf.set(keyOf(p.cell), (dressOf.get(keyOf(p.cell)) ?? 0) + 1);
  const unit = (...salt: (string | number)[]): number => unitOf(rand("wall", ...salt));
  const pickOf = <T>(xs: readonly T[], ...salt: (string | number)[]): T => xs[Math.min(xs.length - 1, Math.floor(unit(...salt) * xs.length))]!;
  const rotated = <T>(xs: readonly T[], ...salt: (string | number)[]): T[] => {
    const s = Math.min(xs.length - 1, Math.floor(unit(...salt) * xs.length));
    return [...xs.slice(s), ...xs.slice(0, s)];
  };
  const out: CityWallPiece[] = [];
  let canopies = 0;
  let doorCornersBare = 0;
  let aircons = 0;
  let planters = 0;
  let capTurnedAway = 0;
  let noFit = 0;
  let buildingsAtPropCap = 0;

  for (const b of buildings.buildings) {
    const esc = escapes.get(b.id);
    const used = new Map<string, number>();
    for (const c of b.cells) used.set(keyOf(c), dressOf.get(keyOf(c)) ?? 0);
    if (esc) {
      out.push(...esc.result.pieces);
      const w = escapeWeight(esc.col, esc.result.pieces);
      if (w <= DRESS_PER_BAY_MAX) used.set(keyOf(esc.col), (used.get(keyOf(esc.col)) ?? 0) + w);
    }
    const take = (c: CityCell): boolean => {
      const n = (used.get(keyOf(c)) ?? 0) + 1;
      if (n > DRESS_PER_BAY_MAX) {
        capTurnedAway++;
        return false;
      }
      used.set(keyOf(c), n);
      return true;
    };

    // ---- door canopies ----
    for (const g of groundOf.get(b.id) ?? []) {
      if (g.kind === "doorCorner") {
        doorCornersBare++;
        continue;
      }
      if (g.kind !== "door") continue;
      const first = g.cells[0]!;
      if (unit("canopy", b.id, b.cells.findIndex((c) => keyOf(c) === keyOf(first))) >= P_CANOPY) continue;
      const f = frameOfGround(ctx, g);
      for (const key of rotated(DOOR_CANOPIES, "canopykey", b.id)) {
        const placement = placeCanopy(f, key);
        if (!placement) {
          noFit++;
          continue;
        }
        if (!take(first)) continue;
        out.push({ kind: "canopy", building: b.id, cell: { i: first.i, j: first.j }, face: ctx.col.get(keyOf(first))!.front, storey: 0, span: 1, placement, scaleY: 1, boxes: [] });
        canopies++;
        break;
      }
    }

    // ---- wall air-conditioners and window planters on the upper storeys ----
    let walls = 0;
    for (let level = WALL_MIN_LEVEL; level <= b.storeys - 1 && walls < WALL_PROPS_PER_BLOCK; level++) {
      for (let n = 0; n < b.cells.length && walls < WALL_PROPS_PER_BLOCK; n++) {
        const col: CityColumn = ctx.col.get(keyOf(b.cells[n]!))!;
        if (col.kind === "blind" || (esc !== undefined && keyOf(esc.col) === keyOf(col))) continue;
        const u = unit("prop", b.id, n, level);
        let key: CalibrationKey;
        let kind: "aircon" | "planter";
        let x = 0;
        let lift: number;
        if (u < P_WALL_AC) {
          key = pickOf(WALL_ACS, "ackey", b.id, n, level);
          kind = "aircon";
          x = (unit("side", b.id, n, level) < 0.5 ? -1 : 1) * WALL_AC_OFFSET_M;
          lift = WALL_AC_LIFT_M;
        } else if (u < P_WALL_AC + P_PLANTER) {
          key = pickOf(WALL_PLANTERS, "plkey", b.id, n, level);
          kind = "planter";
          lift = PLANTER_LIFT_M;
        } else continue;
        const placement = placeProp(col, key, level, x, lift);
        if (!placement) {
          noFit++;
          continue;
        }
        if (!take(col)) continue;
        out.push({ kind, building: b.id, cell: { i: col.i, j: col.j }, face: col.front, storey: level, span: 1, placement, scaleY: 1, boxes: [] });
        if (kind === "aircon") aircons++;
        else planters++;
        walls++;
      }
    }
    if (walls >= WALL_PROPS_PER_BLOCK) buildingsAtPropCap++;
  }
  return { walls: out, stats: { canopies, doorCornersBare, aircons, planters, capTurnedAway, noFit, buildingsAtPropCap } };
}
