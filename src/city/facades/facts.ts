/**
 * Stage 7, H1: what the stage and its checks read off the mass and buildings layers about one building (ticket 070 H1 criterion 2; readings D1 and D3; Josh's ruling 2, 19 Nov 2026: no door behind a stall).
 * One reader, shared: the stage chooses with it and the checks judge with it, from the mass (each column's open sides, and the use of the cell across each), never from the ground layer.
 */

import type { CityBuilding, CityBuildingsLayer, CityBuiltCell, CityCell, CityColumn, CityFrontage, CityMassLayer, CityMassUse, CitySide } from "../../core";
import { CityStageError } from "../pipeline/error";
import { keyOf, SIDE_VEC } from "./place";

export interface Ctx {
  readonly built: ReadonlyMap<string, CityBuiltCell>;
  readonly use: ReadonlyMap<string, CityMassUse>;
  readonly col: ReadonlyMap<string, CityColumn>;
  readonly rowFront: ReadonlyMap<string, CitySide>;
  readonly buildingOf: ReadonlyMap<string, CityBuilding>;
}

/** The lookups every reader needs. `buildings.columns` must be present (F2 writes it). */
export function makeCtx(mass: Pick<CityMassLayer, "cells" | "built">, buildings: Pick<CityBuildingsLayer, "rows" | "columns" | "buildings">): Ctx {
  if (!buildings.columns) throw new CityStageError("H1: the buildings layer has no columns");
  return {
    built: new Map(mass.built.map((b) => [keyOf(b), b] as const)),
    use: new Map(mass.cells.map((c) => [keyOf(c), c.use] as const)),
    col: new Map(buildings.columns.map((c) => [keyOf(c), c] as const)),
    rowFront: new Map(buildings.rows.map((r) => [r.id, r.front] as const)),
    buildingOf: new Map(buildings.buildings.map((b) => [b.id, b] as const)),
  };
}

/** True when an open side of the built cell faces a "stalls" cell (a residents' court's parked cars: no door opens there). */
export function facesStalls(ctx: Ctx, cell: CityCell): boolean {
  const b = ctx.built.get(keyOf(cell));
  if (!b) return false;
  return b.open.some((o) => ctx.use.get(`${cell.i + SIDE_VEC[o.side].x},${cell.j + SIDE_VEC[o.side].z}`) === "stalls");
}

/** True when an open side of the built cell is a street frontage (street, park edge, plaza). */
export function hasStreetSide(ctx: Ctx, cell: CityCell): boolean {
  return ctx.built.get(keyOf(cell))?.open.some((o) => o.frontage === "street") ?? false;
}

/** A column's frontage (grammar rule 9, as `CityGroundPiece` defines it): a mid's open side's; a corner "street" when either open side is, else "quiet"; a blind column none. */
export function columnFrontage(ctx: Ctx, col: CityCell & { readonly kind: string }): CityFrontage | null {
  if (col.kind === "blind") return null;
  const b = ctx.built.get(keyOf(col));
  if (!b || b.open.length === 0) return null;
  if (col.kind === "mid") return b.open[0]!.frontage;
  return b.open.some((o) => o.frontage === "street") ? "street" : "quiet";
}

export interface BuildingFacts {
  readonly cols: readonly CityColumn[];
  /** D3: the building's frontage, its row front's. */
  readonly frontage: CityFrontage;
  /** The building stands in ring 2 (every cell's mass row is "inner"). */
  readonly ring2: boolean;
  /** Indices into `cols` of the mid columns. */
  readonly mids: readonly number[];
  /** Indices of the quiet corners (no street open side), in row order. */
  readonly quietCorners: readonly number[];
  /** D1: the door places. A street building: its mid columns. A quiet one: its quiet corners with no open side onto stalls, and its mid columns with none. */
  readonly doorCorners: readonly number[];
  readonly doorMids: readonly number[];
}

/** D3 and D1 for one building: its frontage (a stage failure when its non-blind columns disagree, or none shows its row's front) and its door places. */
export function factsOf(ctx: Ctx, b: CityBuilding): BuildingFacts {
  const cols = b.cells.map((c) => {
    const col = ctx.col.get(keyOf(c));
    if (!col) throw new CityStageError(`H1: building ${b.id} has the cell (${c.i}, ${c.j}), which has no column`, [c]);
    return col;
  });
  const fronts = new Set<CityFrontage>();
  for (const col of cols) {
    if (col.kind === "blind") continue;
    const front = ctx.rowFront.get(col.rowId);
    const open = ctx.built.get(keyOf(col))?.open.find((o) => o.side === front);
    if (!open) throw new CityStageError(`D3: building ${b.id}: the column (${col.i}, ${col.j}) has no open side on its row's front ${front}`, [col]);
    fronts.add(open.frontage);
  }
  if (fronts.size !== 1) throw new CityStageError(`D3: building ${b.id}: its non-blind columns' row fronts have ${fronts.size === 0 ? "no frontage" : "both frontages"}`, cols);
  const frontage = [...fronts][0]!;
  const mids: number[] = [];
  const quietCorners: number[] = [];
  cols.forEach((col, n) => {
    if (col.kind === "mid") mids.push(n);
    else if (col.kind === "corner" && !hasStreetSide(ctx, col)) quietCorners.push(n);
  });
  const ring2 = b.cells.every((c) => ctx.built.get(keyOf(c))?.row === "inner");
  const free = (n: number): boolean => !facesStalls(ctx, cols[n]!);
  return {
    cols,
    frontage,
    ring2,
    mids,
    quietCorners,
    doorCorners: frontage === "quiet" ? quietCorners.filter(free) : [],
    doorMids: mids.filter(free),
  };
}
