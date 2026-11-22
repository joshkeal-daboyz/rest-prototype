/**
 * Stage 11: wall tech (ticket 073 D1; the D1 pre-check's section 2; D1-Q3 and D1-Q5; X-11: pieces as the pack shows them). Small boxes, air-conditioners and cameras on the walls above the ground storey, signs over
 * storey 1's street faces, tall vents and electronics on bare side walls. Every piece hangs on a wall (its back on the wall plane): the pack shows these as bolt-ons, never out of the ground.
 *
 * - **A storey face** is one open side of a column at one storey above the ground (storeys 1 to `storeys - 1`; storey k stands at y = 3 k). It is cut into thirds of 1.67 m.
 * - **A free third** has nothing of stage 7 (`s7Boxes`, every dressing piece counting, the ones a shopfront removes too) entering a box over it, `WALL_ZONE_M` out from the wall, over the whole storey; and no drop's wall point within it (T-1:
 *   on storey 1 the middle third over a drop is never free, and a piece above one would stand over the drop's first stretch).
 * - **Per face** (DT, by the district's `tech` only: X-6): from `SIGN_FROM_TECH`, a storey 1 street face takes a sign with chance `P_SIGN` x `tech` (tried first); then a bolt-on with chance `P_BOLT_ON` x `tech`,
 *   a camera one time in four on storey 1 (`CAMERA_SHARE`; cameras are on walls at the first floor, never on the pavement, D1-Q5). Each takes a different free third.
 * - **Tall pieces** (D1-Q3): a bare side wall is a side of a column that is not open, over a built neighbour with fewer storeys, at the storeys above that neighbour's roof. When the whole face (all three thirds) is free it takes
 *   a tall piece with chance `P_TALL` x `tech`. Vents and the tall electronics are a storey high, so they never go on an open face over windows. `Prop_Pipes_01` is not in the kit (it cannot stand vertical, see `kit.ts`).
 * - Every piece keeps T-1 against the circuit (`coversCircuit`) and never overlaps another piece of the pass. The add's `cell` is the column it is mounted on, so its district is that cell's.
 */

import type { CalibrationKey, CitySide } from "../../core";
import { CityStageError } from "../pipeline/error";
import type { StageRand } from "../pipeline/seeds";
import { boxHit, type S7Box } from "./boxes";
import { coversCircuit } from "./circuit";
import { BOLT_ON_BASE_M, CAMERA_BASE_M, CAMERA_SHARE, CELL_M, EPS, P_BOLT_ON, P_SIGN, P_TALL, SIGN_BASE_M, ROOF_DECK_M, SIGN_FROM_TECH, STOREY_M, TALL_BASE_M, THIRDS, THIRD_M, WALL_ZONE_M } from "./constants";
import { districtOf, type TechCtx } from "./context";
import { Grid, SIDE_VEC, SIDE_YAW, cellKey, overlaps, turned, type Rect } from "./geom";
import { indexOf, unitOf } from "./hash";
import { BOLT_ONS, CAMERAS, SIGNS, TALLS, boundsOf } from "./kit";
import type { TechPiece } from "./pavement";

export interface WallStats {
  /** Storey faces above the ground, and those with a free third. */
  faces: number;
  facesFree: number;
  /** Storey 1 street faces with a free third (the sign places). */
  signPlaces: number;
  /** Bare side walls above a lower neighbour, and those wholly free. */
  sideWalls: number;
  sideFree: number;
  boltOns: number;
  cameras: number;
  signs: number;
  talls: number;
  /** A piece refused after a free third was found (the circuit, or another piece of the pass), by reason. */
  refused: Record<string, number>;
}
export const newWallStats = (): WallStats => ({ faces: 0, facesFree: 0, signPlaces: 0, sideWalls: 0, sideFree: 0, boltOns: 0, cameras: 0, signs: 0, talls: 0, refused: {} });

/** The rectangle on a cell's wall that faces `side`: laterally from `l0` to `l1` along the wall (from the cell's low edge), and from `o0` to `o1` out from the wall plane. */
export function onWall(i: number, j: number, side: CitySide, l0: number, l1: number, o0: number, o1: number): Rect {
  const x0 = i * CELL_M;
  const z0 = j * CELL_M;
  switch (side) {
    case "+x":
      return { x0: x0 + CELL_M + o0, x1: x0 + CELL_M + o1, z0: z0 + l0, z1: z0 + l1 };
    case "-x":
      return { x0: x0 - o1, x1: x0 - o0, z0: z0 + l0, z1: z0 + l1 };
    case "+z":
      return { x0: x0 + l0, x1: x0 + l1, z0: z0 + CELL_M + o0, z1: z0 + CELL_M + o1 };
    default:
      return { x0: x0 + l0, x1: x0 + l1, z0: z0 - o1, z1: z0 - o0 };
  }
}

interface Own extends Rect {
  readonly y0: number;
  readonly y1: number;
}

const SIDES: readonly CitySide[] = ["+x", "-x", "+z", "-z"];

/** Wall pieces for every column, in `buildings.columns` order. `boxes` is stage 7's boxes. */
export function layoutWalls(ctx: TechCtx, boxes: Grid<S7Box>, rand: StageRand, stats: WallStats): TechPiece[] {
  const out: TechPiece[] = [];
  const own = new Grid<Own>();
  const u = (...key: readonly (string | number)[]): number => unitOf(rand(...key));

  /** Tries to hang `key` on the third `t` (or, with `centre`, the middle of the whole face) of a face at storey `k`; adds it and returns true when it holds. */
  const hang = (kind: TechPiece["kind"], key: CalibrationKey, id: string, i: number, j: number, side: CitySide, k: number, lateral: number, base: number, district: string): boolean => {
    const e = boundsOf(key);
    const rect = onWall(i, j, side, lateral - e.w / 2, lateral + e.w / 2, 0, e.d);
    const y0 = k * STOREY_M + base;
    const y1 = y0 + e.h;
    const hit = coversCircuit(ctx.circuit, rect, true);
    if (hit !== null) {
      stats.refused[`T-1 ${hit.split(" ")[0]}`] = (stats.refused[`T-1 ${hit.split(" ")[0]}`] ?? 0) + 1;
      return false;
    }
    for (const o of own.near(rect)) {
      if (overlaps(rect, o) && o.y0 < y1 - EPS && o.y1 > y0 + EPS) {
        stats.refused["own"] = (stats.refused["own"] ?? 0) + 1;
        return false;
      }
    }
    own.add({ ...rect, y0, y1 });
    const yaw = SIDE_YAW[side];
    const size = turned(e.w, e.d, yaw);
    out.push({
      id,
      kind,
      district,
      cell: { i, j },
      placement: { key, x_m: (rect.x0 + rect.x1) / 2, y_m: y0, z_m: (rect.z0 + rect.z1) / 2, yaw_deg: yaw },
      size: { x_m: size.x, z_m: size.z, h_m: e.h },
    });
    return true;
  };

  /** A zone is free of stage 7's boxes over the heights `y0` to `y1` and of a drop's wall point. */
  const free = (i: number, j: number, side: CitySide, l0: number, l1: number, y0: number, y1: number): boolean => {
    const zone = onWall(i, j, side, l0, l1, 0, WALL_ZONE_M);
    if (boxHit(boxes, zone, y0, y1) !== null) return false;
    return coversCircuit(ctx.circuit, onWall(i, j, side, l0, l1, 0, 0.05), true) === null;
  };

  for (const col of ctx.columns.values()) {
    const cell = ctx.built.get(cellKey(col.i, col.j));
    const building = ctx.buildings.get(col.building);
    if (!cell || !building) throw new CityStageError(`tech: column (${col.i}, ${col.j}) has no built cell or building`, [{ i: col.i, j: col.j }]);
    const district = districtOf(ctx, cell.block);
    const tech = district.tech;
    const storeys = building.storeys;
    const open = new Set<CitySide>(cell.open.map((o) => o.side));

    for (const o of cell.open) {
      for (let k = 1; k <= storeys - 1; k++) {
        const face = `${col.building}|${col.i},${col.j}|${o.side}|${k}`;
        stats.faces++;
        let thirds: number[] = [];
        for (let t = 0; t < THIRDS; t++) if (free(col.i, col.j, o.side, t * THIRD_M, (t + 1) * THIRD_M, k * STOREY_M, (k + 1) * STOREY_M)) thirds.push(t);
        if (thirds.length === 0) continue;
        stats.facesFree++;
        const isSign = k === 1 && o.faces === "street";
        if (isSign) stats.signPlaces++;
        const lateralOf = (t: number): number => (t + 0.5) * THIRD_M;
        // from the hashed third round, each third once
        const order = (salt: string, list: readonly number[]): number[] => {
          const at = indexOf(rand(face, salt), list.length);
          return [...list.slice(at), ...list.slice(0, at)];
        };
        if (isSign && tech >= SIGN_FROM_TECH && u(face, "sign") < P_SIGN * tech) {
          const key = SIGNS[indexOf(rand(face, "sign-key"), SIGNS.length)]!;
          for (const t of order("sign-third", thirds)) {
            if (hang("sign", key, `tech:sign:${face}|${t}`, col.i, col.j, o.side, k, lateralOf(t), SIGN_BASE_M, district.id)) {
              stats.signs++;
              thirds = thirds.filter((x) => x !== t);
              break;
            }
          }
        }
        if (thirds.length > 0 && u(face, "bolt") < P_BOLT_ON * tech) {
          const camera = k === 1 && u(face, "camera") < CAMERA_SHARE;
          const keys = camera ? CAMERAS : BOLT_ONS;
          const key = keys[indexOf(rand(face, "bolt-key"), keys.length)]!;
          for (const t of order("bolt-third", thirds)) {
            if (hang(camera ? "camera" : "bolt-on", key, `tech:${camera ? "camera" : "bolt-on"}:${face}|${t}`, col.i, col.j, o.side, k, lateralOf(t), camera ? CAMERA_BASE_M : BOLT_ON_BASE_M, district.id)) {
              if (camera) stats.cameras++;
              else stats.boltOns++;
              break;
            }
          }
        }
      }
    }

    // bare side walls: a side that is not open, over a built neighbour with fewer storeys
    for (const side of SIDES) {
      if (open.has(side)) continue;
      const [vx, vz] = SIDE_VEC[side];
      const nCol = ctx.columns.get(cellKey(col.i + vx, col.j + vz));
      const nb = nCol ? ctx.buildings.get(nCol.building) : undefined;
      if (!nb || nb.storeys >= storeys) continue;
      for (let k = nb.storeys; k <= storeys - 1; k++) {
        stats.sideWalls++;
        // the first storey over the lower roof stands on its deck; a piece stays under its own roof
        const base = k === nb.storeys ? ROOF_DECK_M : TALL_BASE_M;
        if (!free(col.i, col.j, side, 0, CELL_M, k * STOREY_M + base, k * STOREY_M + base + STOREY_M)) continue;
        stats.sideFree++;
        const face = `${col.building}|${col.i},${col.j}|${side}|${k}`;
        if (!(u(face, "tall") < P_TALL * tech)) continue;
        const fits = TALLS.filter((q) => base + boundsOf(q).h <= (storeys - k) * STOREY_M + EPS);
        if (fits.length === 0) continue;
        const key = fits[indexOf(rand(face, "tall-key"), fits.length)]!;
        if (hang("tall", key, `tech:tall:${face}`, col.i, col.j, side, k, CELL_M / 2, base, district.id)) stats.talls++;
      }
    }
  }
  return out;
}
