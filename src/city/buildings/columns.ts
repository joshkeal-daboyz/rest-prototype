/**
 * Stage 5, F2: columns, kinds, turns, pieces, roofs and placements (ticket 070 F2 criteria 2 to 4; grammar rules 1, 3, 7 and 11). One column per built cell: its kind from the mass, its turn from its open sides,
 * the ground storey's slot (kind and turn only; the piece is stage 7's), the floors above it and one roof, each placed on the cell from the kit table. Pure; fails with `CityStageError` where the open sides cannot be served.
 */

import type { CityBuilding, CityBuiltCell, CityColumn, CityGroundSlot, CityPiece, CitySide, CityYaw } from "../../core";
import { CityStageError } from "../pipeline/error";
import { BUILDING_STYLES, type BuildingStyle } from "./constants";
import { placeFloor, placeRoof, YAW_OF_FRONT } from "./place";
import { keyOf } from "./rows";

/** A corner column's forced turn (rule 7; measured, 063 E1: a corner piece's second face is its own -x). Keyed by its two open sides, sorted. */
export const CORNER_TURN: Readonly<Record<string, { front: CitySide; side: CitySide; yaw: CityYaw }>> = {
  "+z,-x": { front: "+z", side: "-x", yaw: 0 },
  "+x,+z": { front: "+x", side: "+z", yaw: 90 },
  "+x,-z": { front: "-z", side: "+x", yaw: 180 },
  "-x,-z": { front: "-x", side: "-z", yaw: 270 },
};

/** The corner key of a column's open sides, "<a>,<b>" sorted. */
export const sidesKey = (a: CitySide, b: CitySide): string => [a, b].sort().join(",");

const styleOf = (id: string): BuildingStyle => {
  const s = BUILDING_STYLES.find((x) => x.id === id);
  if (!s) throw new CityStageError(`F2: the style ${id} is not in the style table`);
  return s;
};

/**
 * The floor pieces above the ground, bottom up, for `storeys` storeys of a column of the given kind: a corner column one corner floor per storey 1 to `storeys - 1`; a mid or blind column a three-storey piece for each
 * whole run of three from storey 1 up, then a mid floor per storey left.
 */
export function floorPlan(corner: boolean, storeys: number): { role: "floor" | "floor3"; storey: number }[] {
  const out: { role: "floor" | "floor3"; storey: number }[] = [];
  let s = 1;
  if (!corner) {
    while (s + 2 <= storeys - 1) {
      out.push({ role: "floor3", storey: s });
      s += 3;
    }
  }
  for (; s <= storeys - 1; s++) out.push({ role: "floor", storey: s });
  return out;
}

/** One `CityColumn` per built cell of `mass`, in `mass.built` order. */
export function buildColumns(buildings: readonly CityBuilding[], built: readonly CityBuiltCell[]): CityColumn[] {
  const at = new Map<string, { b: CityBuilding; n: number }>();
  for (const b of buildings) b.cells.forEach((c, n) => at.set(keyOf(c), { b, n }));
  return built.map((cell) => {
    const found = at.get(keyOf(cell));
    if (!found) throw new CityStageError(`rule 1: built cell (${cell.i}, ${cell.j}) is in no building`, [cell]);
    const { b, n } = found;
    const style = styleOf(b.style);
    const sides = cell.open.map((o) => o.side);
    let front: CitySide;
    let side: CitySide | null = null;
    let yaw: CityYaw;
    if (cell.column === "mid") {
      if (sides.length !== 1) throw new CityStageError(`M3: mid cell (${cell.i}, ${cell.j}) has ${sides.length} open sides, not 1`, [cell]);
      front = sides[0]!;
      yaw = YAW_OF_FRONT[front];
    } else if (cell.column === "corner") {
      const turn = sides.length === 2 ? CORNER_TURN[sidesKey(sides[0]!, sides[1]!)] : undefined;
      if (!turn) throw new CityStageError(`M6: corner cell (${cell.i}, ${cell.j}) has open sides [${sides.join(", ")}], which are not two adjacent sides`, [cell]);
      ({ front, side, yaw } = turn);
    } else {
      if (sides.length !== 0) throw new CityStageError(`M3: blind cell (${cell.i}, ${cell.j}) has open sides`, [cell]);
      front = b.front;
      yaw = YAW_OF_FRONT[front];
    }
    const rowId = b.bend !== null && n === 2 ? b.bend : b.rowId;
    const corner = cell.column === "corner";
    const ground: CityGroundSlot = { kind: cell.column, yaw, y_m: 0, top_m: style.pitch_m.base };
    const pieces: CityPiece[] = [];
    for (const f of floorPlan(corner, b.storeys)) {
      const key = f.role === "floor3" ? style.floor.stack3[0]! : corner ? style.floor.corner[0]! : style.floor.mid[0]!;
      pieces.push({ role: f.role, storey: f.storey, span: f.role === "floor3" ? 3 : 1, placement: placeFloor(key, cell, yaw, style.pitch_m.floor * f.storey) });
    }
    const roofKey = corner ? style.roof.corner[0]! : style.roof.mid[0]!;
    pieces.push({ role: "roof", storey: b.storeys, span: 0, placement: placeRoof(roofKey, cell, front, side, yaw, style.pitch_m.floor * b.storeys) });
    return { i: cell.i, j: cell.j, building: b.id, rowId, kind: cell.column, front, side, yaw, ground, pieces };
  });
}
