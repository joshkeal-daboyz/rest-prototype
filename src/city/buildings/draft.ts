/**
 * The stage's working building (a `CityBuilding` still being filled in), and the two relations every step of the stage shares: row neighbours, and the heights M4c ties together (N2).
 */

import type { CityBuiltCell, CityCell } from "../../core";
import { keyOf } from "./rows";

export interface Draft {
  id: string;
  rowId: string;
  bend: string | null;
  row: "outer" | "inner";
  front: "+x" | "-x" | "+z" | "-z";
  cells: CityCell[];
  lead: boolean;
  /** A following building's partner building id; null on a leading one. */
  partner: string | null;
  style: string;
  colourway: string;
  storeys: number;
  back: "through" | "another" | null;
}

interface HasRow {
  readonly id: string;
  readonly rowId: string;
  readonly bend: string | null;
  readonly cells: readonly CityCell[];
}

/**
 * Row neighbours: two buildings of one row whose end cells are side by side along it, no opening between. A building is in its `rowId` row and, for an L, in its `bend` row too (by the cells it has on that row's line).
 * Returned row by row, each pair in order along the row.
 */
export function neighbourPairs<T extends HasRow>(buildings: readonly T[], positions: (rowId: string) => ReadonlyMap<string, number> | undefined): [T, T][] {
  const byRow = new Map<string, T[]>();
  const add = (rowId: string, b: T): void => {
    const l = byRow.get(rowId);
    if (l) l.push(b);
    else byRow.set(rowId, [b]);
  };
  for (const b of buildings) {
    add(b.rowId, b);
    if (b.bend) add(b.bend, b);
  }
  const out: [T, T][] = [];
  for (const [rowId, list] of byRow) {
    const pos = positions(rowId);
    if (!pos) continue;
    const ext: { b: T; lo: number; hi: number }[] = [];
    for (const b of list) {
      const at = b.cells.map((c) => pos.get(keyOf(c))).filter((x): x is number => x !== undefined);
      if (at.length > 0) ext.push({ b, lo: Math.min(...at), hi: Math.max(...at) });
    }
    ext.sort((a, b) => a.lo - b.lo);
    for (let x = 1; x < ext.length; x++) if (ext[x]!.lo === ext[x - 1]!.hi + 1) out.push([ext[x - 1]!.b, ext[x]!.b]);
  }
  return out;
}

/** Union-find over building ids: `find` gives a class's representative. */
export function heightClasses(buildings: readonly { readonly id: string; readonly cells: readonly CityCell[] }[], built: ReadonlyMap<string, CityBuiltCell>): (id: string) => string {
  const parent = new Map<string, string>(buildings.map((b) => [b.id, b.id] as const));
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    let y = x;
    while (parent.get(y) !== r) {
      const nx = parent.get(y)!;
      parent.set(y, r);
      y = nx;
    }
    return r;
  };
  const of = new Map<string, string>();
  for (const b of buildings) for (const c of b.cells) of.set(keyOf(c), b.id);
  for (const b of buildings) {
    for (const c of b.cells) {
      const partner = built.get(keyOf(c))?.partner;
      if (!partner) continue;
      const other = of.get(keyOf(partner));
      if (other === undefined) continue;
      const x = find(b.id);
      const y = find(other);
      if (x !== y) parent.set(x, y);
    }
  }
  return find;
}
