/**
 * Rows on cells (ticket 070 F1, N1; the comment above `CityBuildingRow` in src/core/cityplan.ts): the line of cells of one part along one of its sides, and the helpers every file of this stage shares.
 */

import type { CityBuildingRow, CityBuiltCell, CityCell, CityPart, CitySide } from "../../core";

export const keyOf = (c: CityCell): string => `${c.i},${c.j}`;

export const OPPOSITE: Readonly<Record<CitySide, CitySide>> = { "+x": "-x", "-x": "+x", "+z": "-z", "-z": "+z" };

/** A row as the stage sees it: its `CityBuildingRow` fields, its line (every position of the row, built or not), and whether its buildings lead. */
export interface RowDef {
  readonly id: string;
  readonly block: string;
  readonly part: string;
  readonly row: "outer" | "inner";
  readonly front: CitySide;
  /** Every position along the row in order (increasing i on a "-z"/"+z" front, increasing j on a "-x"/"+x" front), built or not. */
  readonly along: readonly CityCell[];
}

function cellsAlong(p: CityPart, side: CitySide, distance: number, inset: number): CityCell[] {
  const out: CityCell[] = [];
  if (side === "-z" || side === "+z") {
    const j = side === "-z" ? p.j0 + distance : p.j1 - 1 - distance;
    for (let i = p.i0 + inset; i <= p.i1 - 1 - inset; i++) out.push({ i, j });
  } else {
    const i = side === "-x" ? p.i0 + distance : p.i1 - 1 - distance;
    for (let j = p.j0 + inset; j <= p.j1 - 1 - inset; j++) out.push({ i, j });
  }
  return out;
}

/** The rows of a part, in a fixed order. A court part has an outer and an inner row for each side; a strip has its two long sides' rows (its short ends are not rows). */
export function rowsOfPart(p: CityPart): RowDef[] {
  const out: RowDef[] = [];
  if (p.shape === "court") {
    for (const s of ["-z", "+x", "+z", "-x"] as const) {
      out.push({ id: `${p.id}|outer|${s}`, block: p.block, part: p.id, row: "outer", front: s, along: cellsAlong(p, s, 0, 0) });
      out.push({ id: `${p.id}|inner|${OPPOSITE[s]}`, block: p.block, part: p.id, row: "inner", front: OPPOSITE[s], along: cellsAlong(p, s, 1, 1) });
    }
  } else {
    const w = p.i1 - p.i0;
    const h = p.j1 - p.j0;
    const sides: readonly [CitySide, CitySide] = h === 2 && w > 2 ? ["-z", "+z"] : ["-x", "+x"];
    for (const s of sides) out.push({ id: `${p.id}|outer|${s}`, block: p.block, part: p.id, row: "outer", front: s, along: cellsAlong(p, s, 0, 0) });
  }
  return out;
}

/** The position of each cell along each row of `rows`: row id to (cell key to index). */
export function positionsOf(rows: readonly RowDef[]): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>();
  for (const r of rows) out.set(r.id, new Map(r.along.map((c, n) => [keyOf(c), n] as const)));
  return out;
}

/** True when a built cell shows `side` as an open side. */
export const showsFront = (c: CityBuiltCell, side: CitySide): boolean => c.open.some((o) => o.side === side);

/** Re-export of a cell's row type for readers that only need the shape. */
export type RowSummary = Pick<CityBuildingRow, "id" | "block" | "part" | "row" | "front">;
