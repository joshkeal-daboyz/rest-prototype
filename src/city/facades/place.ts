/**
 * Stage 7, H1: where a ground piece stands (ticket 070 H1 criterion 3; grammar rule 1; readings S1 and D5). Pure maths on the ground kit table: a turn by a quarter, a piece's body box in the plan, the pivot that puts a body
 * front-aligned on its cell (or its two cells), and the level S1 gives a key. The turn is three.js's (`CityPlacement`): at 90 a piece's own +z faces +x (x' = x cos + z sin, z' = -x sin + z cos). Nothing is scaled.
 * Copies of the buildings stage's maths (this folder cannot import it, R-1).
 */

import type { CalibrationKey, CityCell, CityPlacement, CitySide, CityYaw } from "../../core";
import { CELL_M, GROUND_GAP_MAX_M, LEVEL_EPS_M, LIFT_CLEAR_M, SILL_MAX_M, SILL_UNDER_M } from "./constants";
import { groundEntry, type GroundEntry } from "./kit";

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

export const OPPOSITE: Readonly<Record<CitySide, CitySide>> = { "+x": "-x", "-x": "+x", "+z": "-z", "-z": "+z" };

/** The cell key `"i,j"`. */
export const keyOf = (c: CityCell): string => `${c.i},${c.j}`;

/** The centre of a cell, metres. */
export const centreOf = (c: CityCell): Vec => ({ x: (c.i + 0.5) * CELL_M, z: (c.j + 0.5) * CELL_M });

/** A cell's four edges as a box. */
export const cellBox = (c: CityCell): Box => ({ x0: c.i * CELL_M, x1: (c.i + 1) * CELL_M, z0: c.j * CELL_M, z1: (c.j + 1) * CELL_M });

/** The smallest box over several cells' edges. */
export function cellsBox(cells: readonly CityCell[]): Box {
  const boxes = cells.map(cellBox);
  return { x0: Math.min(...boxes.map((b) => b.x0)), x1: Math.max(...boxes.map((b) => b.x1)), z0: Math.min(...boxes.map((b) => b.z0)), z1: Math.max(...boxes.map((b) => b.z1)) };
}

/** The coordinate of a box's plane on `side` (x for "+x" and "-x", z for "+z" and "-z"). */
export function planeOf(b: Box, side: CitySide): number {
  return side === "+x" ? b.x1 : side === "-x" ? b.x0 : side === "+z" ? b.z1 : b.z0;
}

/** A piece's body, in its own frame (its pivot at the origin): the box its four wall planes enclose. */
export function ownBody(e: GroundEntry): Box {
  return { x0: -e.w / 2 + e.body.nx, x1: e.w / 2 - e.body.px, z0: -e.d / 2 + e.body.back, z1: e.d / 2 - e.body.front };
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

/** The body box of a placed ground piece, in the plan. */
export function bodyBoxOf(p: CityPlacement): Box {
  return turnedBox(ownBody(groundEntry(p.key)), p.yaw_deg, { x: p.x_m, z: p.z_m });
}

/**
 * Front-aligned (Josh, Q21 answer 2): the pivot that puts a ground piece's body, across the row, centred on its cell (a "shopDouble": on the midpoint of its two cells), and, front to back, its front plane on the cells'
 * front edge (the side `front` of the cell). A deep key's extra depth then runs back past the back edge; every other key's back plane lies on the back edge. `y_m` is the piece's level (S1).
 */
export function placeGround(key: CalibrationKey, cells: readonly CityCell[], front: CitySide, yaw: CityYaw, y_m: number): CityPlacement {
  const e = groundEntry(key);
  const b = ownBody(e);
  const fv = SIDE_VEC[front];
  const mx = cells.reduce((s, c) => s + centreOf(c).x, 0) / cells.length;
  const mz = cells.reduce((s, c) => s + centreOf(c).z, 0) / cells.length;
  const target = { x: mx + (CELL_M / 2) * fv.x, z: mz + (CELL_M / 2) * fv.z };
  const own = rotate(yaw, (b.x0 + b.x1) / 2, b.z1);
  return { key, x_m: norm(target.x - own.x), y_m: norm(y_m), z_m: norm(target.z - own.z), yaw_deg: yaw };
}

/**
 * S1: the level of a key over a slot that runs from the walk (y 0) to `top_m`, with `windowSill` the first floor's lowest window sill above it; null when the window is empty. The window:
 * - the door is from `SILL_UNDER_M` under the walk to `SILL_MAX_M` over it (a key with no door has no such limit);
 * - the top (`y` plus the key's height) is at or above `top_m` less `GROUND_GAP_MAX_M`;
 * - the top is at most `top_m` plus `windowSill` less `LIFT_CLEAR_M`.
 * The level is the value in the window nearest -sill (its door at the walk); a key with no door stands at 0 if 0 is in the window.
 */
export function levelOf(e: GroundEntry, top_m: number, windowSill: number): number | null {
  const lo0 = top_m - e.h - GROUND_GAP_MAX_M;
  const hi0 = top_m + windowSill - LIFT_CLEAR_M - e.h;
  if (e.sill === null) return lo0 <= LEVEL_EPS_M && -LEVEL_EPS_M <= hi0 ? 0 : null;
  const lo = Math.max(lo0, -SILL_UNDER_M - e.sill);
  const hi = Math.min(hi0, SILL_MAX_M - e.sill);
  if (lo > hi + LEVEL_EPS_M) return null;
  return norm(Math.min(hi, Math.max(lo, -e.sill)));
}
