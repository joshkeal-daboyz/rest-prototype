/**
 * Stage 13, section F1: plan geometry for the ruin pass (the hold-out's, copied: a stage folder imports no other stage folder). Rectangles in metres, the lattice's cells, a spatial index of obstacles. Pure; imports `src/core/` only.
 */

import type { CityCell } from "../../core";
import { CELL_M } from "./constants";

const EPS = 1e-6;

/** An axis-aligned rectangle in plan, metres (x to x1, z0 to z1). */
export interface Rect {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
}

/** The rectangle of a piece centred at (cx, cz) with the given plan extents (after the turn). */
export const rectAt = (cx: number, cz: number, w: number, d: number): Rect => ({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 });

export const grow = (r: Rect, m: number): Rect => ({ x0: r.x0 - m, x1: r.x1 + m, z0: r.z0 - m, z1: r.z1 + m });

/** True when the interiors overlap (touching edges do not). */
export const overlaps = (a: Rect, b: Rect): boolean => a.x0 < b.x1 - EPS && b.x0 < a.x1 - EPS && a.z0 < b.z1 - EPS && b.z0 < a.z1 - EPS;

/** True when `inner` lies inside `outer` (touching allowed). */
export const inside = (inner: Rect, outer: Rect): boolean => inner.x0 >= outer.x0 - EPS && inner.x1 <= outer.x1 + EPS && inner.z0 >= outer.z0 - EPS && inner.z1 <= outer.z1 + EPS;

export const containsPoint = (r: Rect, x: number, z: number): boolean => x >= r.x0 - EPS && x <= r.x1 + EPS && z >= r.z0 - EPS && z <= r.z1 + EPS;

/** A piece's plan extents after a turn (a quarter turn swaps width and depth). */
export function turned(w: number, d: number, yaw: number): { readonly x: number; readonly z: number } {
  const quarter = Math.round(yaw / 90) % 2 !== 0;
  return quarter ? { x: d, z: w } : { x: w, z: d };
}

/** Rounds a position to a decimetre, so a hashed position is a clean number. */
export const snap = (v: number): number => Math.round(v * 10) / 10;

export const cellKey = (i: number, j: number): number => (i + 1000) * 100000 + (j + 1000);
export const cellOfPoint = (x: number, z: number): CityCell => ({ i: Math.floor(x / CELL_M), j: Math.floor(z / CELL_M) });
export const cellRect = (i: number, j: number): Rect => ({ x0: i * CELL_M, x1: (i + 1) * CELL_M, z0: j * CELL_M, z1: (j + 1) * CELL_M });

/** The lattice cells a rectangle's interior touches. */
export function cellsOver(r: Rect): CityCell[] {
  const out: CityCell[] = [];
  const i0 = Math.floor((r.x0 + EPS) / CELL_M);
  const i1 = Math.floor((r.x1 - EPS) / CELL_M);
  const j0 = Math.floor((r.z0 + EPS) / CELL_M);
  const j1 = Math.floor((r.z1 - EPS) / CELL_M);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) out.push({ i, j });
  return out;
}

/** A spatial index over rectangles: add with a tag, ask which tagged rectangles overlap a rectangle. */
export class RectIndex<T> {
  private readonly cells = new Map<number, { readonly rect: Rect; readonly tag: T }[]>();

  add(rect: Rect, tag: T): void {
    const entry = { rect, tag };
    for (const c of cellsOver(grow(rect, EPS * 10))) {
      const k = cellKey(c.i, c.j);
      const list = this.cells.get(k);
      if (list === undefined) this.cells.set(k, [entry]);
      else list.push(entry);
    }
  }

  /** Every entry whose rectangle overlaps `r` (each once). */
  query(r: Rect): { readonly rect: Rect; readonly tag: T }[] {
    const seen = new Set<{ readonly rect: Rect; readonly tag: T }>();
    for (const c of cellsOver(r)) {
      for (const entry of this.cells.get(cellKey(c.i, c.j)) ?? []) {
        if (!seen.has(entry) && overlaps(entry.rect, r)) seen.add(entry);
      }
    }
    return [...seen];
  }

  any(r: Rect): boolean {
    for (const c of cellsOver(r)) for (const entry of this.cells.get(cellKey(c.i, c.j)) ?? []) if (overlaps(entry.rect, r)) return true;
    return false;
  }
}
