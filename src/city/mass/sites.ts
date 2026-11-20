/**
 * Lot sites (ticket 070 C2): where a drive, and the court behind it, can stand in a court part. A site is a part, a side of it, an offset `t` along that side and a kind: a "court" (a 2-cell drive through both
 * rings, then a row of stalls, an aisle and a row of stalls from ring 3, grammar rule 6 and 19.4) or a "frontLot" (the same 2 by 2 opening, laid as stalls, for a part whose interior has no room for a court).
 * Pure geometry: the planner (`plan.ts`) lays a chosen site, the lot planner (`lots.ts`) chooses.
 */

import type { CityCell, CityPart, CitySide } from "../../core";
import { stretchProblems } from "./check";
import { BUILT_RINGS, COURT_CELLS, DRIVE_CELLS, ROW_STRETCH_MIN_CELLS, YARD_DEPTH_CELLS, YARD_SIDE_MIN_CELLS } from "./constants";
import { SIDES, cellKey, ringOf } from "./geometry";

/** A "court" (stalls, aisle, stalls from ring 3), a "yard" court (a part whose yard is 2 deep: an aisle row, then one row of stalls) or a "frontLot". */
export type LotKind = "court" | "yard" | "frontLot";

export interface LotSite {
  readonly part: string;
  /** The block whose part holds the lot. */
  readonly block: string;
  /** The block its stalls count toward: the host's own, or a neighbour's across a street (18.6). */
  readonly serves: string;
  readonly kind: LotKind;
  /** The side of the part the drive opens on, and its offset along that side. */
  readonly side: CitySide;
  readonly t: number;
}

type PartBox = Pick<CityPart, "i0" | "i1" | "j0" | "j1">;

/** The length of the side of the part, in cells, and how deep the part is across it. */
export const lengthOf = (p: PartBox, side: CitySide): number => (side === "-z" || side === "+z" ? p.i1 - p.i0 : p.j1 - p.j0);
export const depthOf = (p: PartBox, side: CitySide): number => (side === "-z" || side === "+z" ? p.j1 - p.j0 : p.i1 - p.i0);

/** The cell `t` along `side` of the part and `d` in from it (d = 0 is ring 1; d = -1 is the cell beyond the part's edge). */
export function cellOnSide(p: PartBox, side: CitySide, t: number, d: number): CityCell {
  switch (side) {
    case "-z":
      return { i: p.i0 + t, j: p.j0 + d };
    case "+z":
      return { i: p.i0 + t, j: p.j1 - 1 - d };
    case "-x":
      return { i: p.i0 + d, j: p.j0 + t };
    case "+x":
      return { i: p.i1 - 1 - d, j: p.j0 + t };
  }
}

export interface SiteCells {
  /** The drive's cells (rings 1 and 2), or a frontage lot's. */
  readonly drive: CityCell[];
  /** A court's two rows of stalls, and its aisle: empty for a frontage lot. */
  readonly stalls: CityCell[];
  readonly aisle: CityCell[];
  /** The cells beside the aisle's two ends, paved so a car reaches it from the apron (057 G's `apronPad`). */
  readonly pads: CityCell[];
}

/** The cells of a lot at (`side`, `t`). */
export function siteCells(p: PartBox, side: CitySide, t: number, kind: LotKind): SiteCells {
  const at = (u: number, d: number): CityCell => cellOnSide(p, side, u, d);
  const across = Array.from({ length: COURT_CELLS.w }, (_, k) => t + k);
  const drive: CityCell[] = [];
  for (let d = 0; d < DRIVE_CELLS; d++) for (const u of across) drive.push(at(u, d));
  if (kind === "frontLot") return { drive, stalls: [], aisle: [], pads: [] };
  const row = (d: number): CityCell[] => across.map((u) => at(u, d));
  const first = DRIVE_CELLS;
  // a yard court: the near row of the yard is the aisle, the far row the six stalls (two tiles, one each side of the drive's line); the yard is apron already, so it needs no pads
  if (kind === "yard") return { drive, stalls: row(first + YARD_DEPTH_CELLS - 1), aisle: row(first), pads: [] };
  return { drive, stalls: [...row(first), ...row(first + COURT_CELLS.d - 1)], aisle: row(first + 1), pads: [at(t - 1, first + 1), at(t + COURT_CELLS.w, first + 1)] };
}

/** Whether every cell of the court lies in the part's interior (ring 3 or deeper, so it never reaches the buildings of either ring). */
function courtInside(p: PartBox, c: SiteCells): boolean {
  return [...c.stalls, ...c.aisle].every((q) => q.i >= p.i0 && q.i < p.i1 && q.j >= p.j0 && q.j < p.j1 && ringOf(p, q.i, q.j) >= DRIVE_CELLS);
}

/**
 * Whether a lot of `kind` at (`side`, `t`) can be laid in the part beside `existing` lots and the plaza's cells: its cells are free, the court has room, and every row stretch of the two outer rings stays at
 * least one building long (`stretchProblems`: that also keeps the ring-2 corners blind).
 */
export function siteFits(p: CityPart, plaza: readonly CityCell[], existing: readonly LotSite[], side: CitySide, t: number, kind: LotKind): boolean {
  const len = lengthOf(p, side);
  // a drive is never at a row's end: a whole building stands between it and each block corner (as a walk-through's offset keeps)
  if (t < ROW_STRETCH_MIN_CELLS || t + DRIVE_CELLS > len - ROW_STRETCH_MIN_CELLS) return false;
  const cells = siteCells(p, side, t, kind);
  if (kind === "court" && !courtInside(p, cells)) return false;
  // a yard court is only for a part whose yard (inside ring 2) is exactly 2 deep from the drive's side, on a side of at least 8
  if (kind === "yard" && (depthOf(p, side) - 2 * BUILT_RINGS !== YARD_DEPTH_CELLS || len < YARD_SIDE_MIN_CELLS || !courtInside(p, cells))) return false;
  const taken = new Map<string, string>();
  for (const c of plaza) taken.set(cellKey(c), "plaza");
  const used = new Set<string>();
  existing.forEach((s, n) => {
    const e = siteCells(p, s.side, s.t, s.kind);
    for (const c of e.drive) taken.set(cellKey(c), `lot${n}`);
    for (const c of [...e.drive, ...e.stalls, ...e.aisle]) used.add(cellKey(c));
  });
  for (const c of cells.drive) {
    if (taken.has(cellKey(c))) return false;
    taken.set(cellKey(c), "lot");
  }
  for (const c of [...cells.drive, ...cells.stalls, ...cells.aisle]) if (used.has(cellKey(c))) return false;
  return stretchProblems(p, (i, j) => taken.get(`${i},${j}`) ?? null).length === 0;
}

/** Every offset along `side` where a lot of `kind` fits, in order; empty for a side that is not a street or a lane. */
export function offsetsOf(p: CityPart, plaza: readonly CityCell[], existing: readonly LotSite[], side: CitySide, kind: LotKind): number[] {
  if (p.edges[side] === "park" || p.shape !== "court") return [];
  const out: number[] = [];
  for (let t = 0; t + DRIVE_CELLS <= lengthOf(p, side); t++) if (siteFits(p, plaza, existing, side, t, kind)) out.push(t);
  return out;
}

export const SIDE_ORDER: readonly CitySide[] = SIDES;
