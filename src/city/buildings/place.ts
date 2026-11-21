/**
 * Stage 5, F2: where a kit piece stands (ticket 070 F2 criterion 4; grammar rule 1). Pure maths on the kit table: a turn by a quarter, a piece's body box in the plan, and the pivot that puts a body on its cell.
 * The turn is three.js's (`CityPlacement`): at 90 a piece's own +z faces +x (x' = x cos + z sin, z' = -x sin + z cos). Nothing is scaled.
 */

import { CELL_M } from "./constants";
import type { CityCell, CityPlacement, CitySide, CityYaw } from "../../core";
import { kitEntry, type KitEntry } from "./kit";

export interface Vec {
  readonly x: number;
  readonly z: number;
}

/** A body box in the plan, metres. */
export interface Box {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
}

const norm = (n: number): number => (n === 0 ? 0 : n);

/** A point turned by `yaw` degrees (a quarter: exact, with no rounding noise). */
export function rotate(yaw: number, x: number, z: number): Vec {
  const q = ((Math.round(yaw / 90) % 4) + 4) % 4;
  switch (q) {
    case 0:
      return { x: norm(x), z: norm(z) };
    case 1:
      return { x: norm(z), z: norm(-x) };
    case 2:
      return { x: norm(-x), z: norm(-z) };
    default:
      return { x: norm(-z), z: norm(x) };
  }
}

/** The unit vector a side points along. */
export const SIDE_VEC: Readonly<Record<CitySide, Vec>> = { "+x": { x: 1, z: 0 }, "-x": { x: -1, z: 0 }, "+z": { x: 0, z: 1 }, "-z": { x: 0, z: -1 } };

/** The side whose unit vector is (x, z), or null when it is not one. */
export function sideOf(v: Vec): CitySide | null {
  if (v.x === 1 && v.z === 0) return "+x";
  if (v.x === -1 && v.z === 0) return "-x";
  if (v.x === 0 && v.z === 1) return "+z";
  if (v.x === 0 && v.z === -1) return "-z";
  return null;
}

/** The turn that puts a piece's own +z on `front`: +z 0, +x 90, -z 180, -x 270. */
export const YAW_OF_FRONT: Readonly<Record<CitySide, CityYaw>> = { "+z": 0, "+x": 90, "-z": 180, "-x": 270 };

/** The centre of a cell, metres. */
export const centreOf = (c: CityCell): Vec => ({ x: (c.i + 0.5) * CELL_M, z: (c.j + 0.5) * CELL_M });

/** A cell's four edges as a box. */
export const cellBox = (c: CityCell): Box => ({ x0: c.i * CELL_M, x1: (c.i + 1) * CELL_M, z0: c.j * CELL_M, z1: (c.j + 1) * CELL_M });

/** The coordinate of a box's plane on `side` (x for "+x" and "-x", z for "+z" and "-z"). */
export function planeOf(b: Box, side: CitySide): number {
  return side === "+x" ? b.x1 : side === "-x" ? b.x0 : side === "+z" ? b.z1 : b.z0;
}

/** A piece's body, in its own frame (its pivot at the origin): the box its four wall planes enclose. */
export function ownBody(e: KitEntry): Box {
  return { x0: -e.w / 2 + e.body.nx, x1: e.w / 2 - e.body.px, z0: -e.d / 2 + e.body.back, z1: e.d / 2 - e.body.front };
}

/** A piece's bounds, in its own frame. */
export function ownBounds(e: KitEntry): Box {
  return { x0: -e.w / 2, x1: e.w / 2, z0: -e.d / 2, z1: e.d / 2 };
}

function turnedBox(b: Box, yaw: number, at: Vec): Box {
  const p = [rotate(yaw, b.x0, b.z0), rotate(yaw, b.x1, b.z0), rotate(yaw, b.x0, b.z1), rotate(yaw, b.x1, b.z1)];
  return {
    x0: at.x + Math.min(...p.map((v) => v.x)),
    x1: at.x + Math.max(...p.map((v) => v.x)),
    z0: at.z + Math.min(...p.map((v) => v.z)),
    z1: at.z + Math.max(...p.map((v) => v.z)),
  };
}

/** The body box of a placed piece, in the plan. */
export function bodyBoxOf(p: CityPlacement): Box {
  return turnedBox(ownBody(kitEntry(p.key)), p.yaw_deg, { x: p.x_m, z: p.z_m });
}

/** The bounds box of a placed piece, in the plan. */
export function boundsBoxOf(p: CityPlacement): Box {
  return turnedBox(ownBounds(kitEntry(p.key)), p.yaw_deg, { x: p.x_m, z: p.z_m });
}

/** A floor piece (`floor` or `floor3`): its body's centre on the cell's centre, so each body plane is on its cell edge. `y_m` is where its lowest storey stands. */
export function placeFloor(key: KitEntry["key"], cell: CityCell, yaw: CityYaw, y_m: number): CityPlacement {
  const e = kitEntry(key);
  const b = ownBody(e);
  const own = rotate(yaw, (b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2);
  const c = centreOf(cell);
  return { key, x_m: norm(c.x - own.x), y_m, z_m: norm(c.z - own.z), yaw_deg: yaw };
}

/**
 * A roof (063 E2's `seatOnBody`): its body's back plane on the cell's back edge (the side opposite `front`); across, a mid or blind roof's body is centred on the cell, a corner roof's outer flank (its own -x, on `side`)
 * is on the cell's `side` edge. What stands past is the cornice.
 */
export function placeRoof(key: KitEntry["key"], cell: CityCell, front: CitySide, side: CitySide | null, yaw: CityYaw, y_m: number): CityPlacement {
  const e = kitEntry(key);
  const b = ownBody(e);
  const c = centreOf(cell);
  const fv = SIDE_VEC[front];
  const half = CELL_M / 2;
  let target: Vec = { x: c.x - half * fv.x, z: c.z - half * fv.z };
  let anchor: Vec = { x: (b.x0 + b.x1) / 2, z: b.z0 };
  if (e.corner && side !== null) {
    const sv = SIDE_VEC[side];
    target = { x: target.x + half * sv.x, z: target.z + half * sv.z };
    anchor = { x: b.x0, z: b.z0 };
  }
  const own = rotate(yaw, anchor.x, anchor.z);
  return { key, x_m: norm(target.x - own.x), y_m, z_m: norm(target.z - own.z), yaw_deg: yaw };
}
