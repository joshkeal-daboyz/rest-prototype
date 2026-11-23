/**
 * Stage 8: plan geometry on the lattice, metres (cell (i, j) covers x in [i, i+1) * 5 m, z in [j, j+1) * 5 m). Rectangles, a bucket grid for the near-neighbour tests, the quarter turns (three.js's: at 90 a piece's own +z faces +x),
 * and the sides' vectors. Pure; no stage folder is imported.
 */

import type { CityCell, CitySide } from "../../core";
import { CELL_M, TOL } from "./constants";

/** An axis-aligned rectangle on the ground, metres. */
export interface Rect {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
}

/** The distance between two rectangles (0 where they touch or overlap). */
export const rectDist = (a: Rect, b: Rect): number => Math.hypot(Math.max(0, a.x0 - b.x1, b.x0 - a.x1), Math.max(0, a.z0 - b.z1, b.z0 - a.z1));

/** Do the two rectangles overlap, or lie closer than `margin` along both axes, by more than `TOL`? (`furniture.ts`' `overlaps`; footprints that only touch do not overlap.) */
export const overlaps = (a: Rect, b: Rect, margin = 0): boolean => a.x0 < b.x1 + margin - TOL && b.x0 < a.x1 + margin - TOL && a.z0 < b.z1 + margin - TOL && b.z0 < a.z1 + margin - TOL;

/** A bucket grid of rectangles by 5 m cell, so the tests look only at the neighbours. */
export class Grid<T extends Rect> {
  private readonly cells = new Map<string, T[]>();
  readonly items: T[] = [];

  add(r: T): void {
    this.items.push(r);
    for (let i = Math.floor(r.x0 / CELL_M); i <= Math.floor((r.x1 - 1e-9) / CELL_M); i++) {
      for (let j = Math.floor(r.z0 / CELL_M); j <= Math.floor((r.z1 - 1e-9) / CELL_M); j++) {
        const key = `${i},${j}`;
        const list = this.cells.get(key);
        if (list) list.push(r);
        else this.cells.set(key, [r]);
      }
    }
  }

  /** Every item that may lie within `reach` metres of `r` (a superset; the caller tests). */
  near(r: Rect, reach = 0): T[] {
    const seen = new Set<T>();
    for (let i = Math.floor((r.x0 - reach) / CELL_M); i <= Math.floor((r.x1 + reach) / CELL_M); i++) {
      for (let j = Math.floor((r.z0 - reach) / CELL_M); j <= Math.floor((r.z1 + reach) / CELL_M); j++) for (const x of this.cells.get(`${i},${j}`) ?? []) seen.add(x);
    }
    return [...seen];
  }
}

/** The unit vector out of a cell through a side. */
export const SIDE_VEC: Readonly<Record<CitySide, readonly [number, number]>> = { "+x": [1, 0], "-x": [-1, 0], "+z": [0, 1], "-z": [0, -1] };

/** The turn, degrees, that brings a key's own +z front onto a side. */
export const SIDE_YAW: Readonly<Record<CitySide, 0 | 90 | 180 | 270>> = { "+z": 0, "+x": 90, "-z": 180, "-x": 270 };

/** The turn as a quarter count 0 to 3. */
export const quarterOf = (yaw: number): number => ((Math.round(yaw / 90) % 4) + 4) % 4;

/** The turn, degrees, as one of 0, 90, 180, 270. */
export const normYaw = (yaw: number): 0 | 90 | 180 | 270 => (quarterOf(yaw) * 90) as 0 | 90 | 180 | 270;

/** A footprint of w by d (own x by own z) after a quarter turn: world x then world z. */
export const turned = (w: number, d: number, yaw: number): { readonly x: number; readonly z: number } => (quarterOf(yaw) & 1 ? { x: d, z: w } : { x: w, z: d });

/** A point turned by `yaw` (a quarter): three.js's turn about y, x' = x cos + z sin, z' = -x sin + z cos, exact. */
export function rotate(yaw: number, x: number, z: number): { x: number; z: number } {
  const n = (v: number): number => (v === 0 ? 0 : v);
  switch (quarterOf(yaw)) {
    case 0:
      return { x: n(x), z: n(z) };
    case 1:
      return { x: n(z), z: n(-x) };
    case 2:
      return { x: n(-x), z: n(-z) };
    default:
      return { x: n(-z), z: n(x) };
  }
}

/** The rectangle of a w by d footprint (own axes) centred at (x, z) after a quarter turn. */
export function rectAt(x: number, z: number, w: number, d: number, yaw: number): Rect {
  const s = turned(w, d, yaw);
  return { x0: x - s.x / 2, x1: x + s.x / 2, z0: z - s.z / 2, z1: z + s.z / 2 };
}

/** The cell a point is in. */
export const cellOfPoint = (x: number, z: number): CityCell => ({ i: Math.floor(x / CELL_M), j: Math.floor(z / CELL_M) });

/** The rectangle of a cell. */
export const cellRect = (c: CityCell): Rect => ({ x0: c.i * CELL_M, x1: (c.i + 1) * CELL_M, z0: c.j * CELL_M, z1: (c.j + 1) * CELL_M });

export const cellKey = (i: number, j: number): string => `${i},${j}`;
