/**
 * Stage 5: buildings (ticket 070 F1; grammar rules 1, 4 and 12). The mass's built cells are grouped into buildings of 2 to 4 columns (the L at a tight corner aside), each with a style, a colourway and a storey
 * count; each ring-2 building stands behind a ring-1 building at the same height, "through" or "another". Reads `land` and `mass` (and `streets` only for the lattice's size, for the picture). F2 adds the pieces.
 */

import type { CityBuilding, CityBuildingRow, CityBuildingsLayer, CityBuiltCell, CityLandLayer, CityMassLayer, CityPicture, CityPlan } from "../../core";
import { CityStageError } from "../pipeline/error";
import { makePicture, type LegendEntry } from "../pipeline/picture";
import type { StageRand } from "../pipeline/seeds";
import type { CityStageDef } from "../pipeline/types";
import { assignPart } from "./assign";
import { buildingFailures } from "./check";
import { CELL_M, COLOURWAY_POOL, COLOURWAY_SWATCH, CITY_STOREYS } from "./constants";
import type { Draft } from "./draft";
import { groupPart } from "./group";
import { keyOf, positionsOf, rowsOfPart, type RowDef } from "./rows";

/** Group, style, colour and floor every built cell of `mass`: the layer, before the stage's own checks. Pure; fails with `CityStageError` where a part cannot be closed (rule 6). */
export function buildBuildings(land: Pick<CityLandLayer, "parts">, mass: Pick<CityMassLayer, "built">, rand: StageRand): CityBuildingsLayer {
  const built = new Map<string, CityBuiltCell>(mass.built.map((b) => [keyOf(b), b] as const));
  const order = new Map<string, number>(mass.built.map((b, n) => [keyOf(b), n] as const));
  const partIds = new Set(land.parts.map((p) => p.id));
  for (const b of mass.built) if (!partIds.has(b.part)) throw new CityStageError(`N1: built cell (${b.i}, ${b.j}) is in the part ${b.part}, which the land layer does not have`, [{ i: b.i, j: b.j }]);
  const byPart = new Map<string, CityBuiltCell[]>();
  for (const b of mass.built) (byPart.get(b.part) ?? byPart.set(b.part, []).get(b.part)!).push(b);

  const rows: { def: RowDef; first: number }[] = [];
  const drafts: Draft[] = [];
  const posOfRow = new Map<string, ReadonlyMap<string, number>>();
  for (const part of land.parts) {
    const cells = byPart.get(part.id);
    if (!cells || cells.length === 0) continue;
    const defs = rowsOfPart(part);
    const positions = positionsOf(defs);
    for (const [id, m] of positions) posOfRow.set(id, m);
    const lookup = (id: string): ReadonlyMap<string, number> | undefined => positions.get(id);
    const mine = groupPart(part, defs, built, rand, lookup, cells);
    assignPart(mine, built, rand, lookup);
    for (const d of mine) drafts.push(d);
    const mineRows = new Set(mine.flatMap((d) => (d.bend ? [d.rowId, d.bend] : [d.rowId])));
    for (const def of defs) {
      let first = Infinity;
      for (const c of def.along) first = Math.min(first, order.get(keyOf(c)) ?? Infinity);
      if (Number.isFinite(first) && mineRows.has(def.id)) rows.push({ def, first });
    }
  }
  rows.sort((a, b) => a.first - b.first);

  const lowest = (d: Draft, rowId: string): number => Math.min(...d.cells.map((c) => posOfRow.get(rowId)!.get(keyOf(c)) ?? Infinity));
  const inRow = new Map<string, Draft[]>();
  for (const d of drafts) for (const id of d.bend ? [d.rowId, d.bend] : [d.rowId]) (inRow.get(id) ?? inRow.set(id, []).get(id)!).push(d);
  const buildings: CityBuilding[] = [];
  const layerRows: CityBuildingRow[] = [];
  for (const { def } of rows) {
    const here = [...(inRow.get(def.id) ?? [])].sort((a, b) => lowest(a, def.id) - lowest(b, def.id));
    layerRows.push({ id: def.id, block: def.block, part: def.part, row: def.row, front: def.front, buildings: here.map((d) => d.id) });
    for (const d of here.filter((x) => x.rowId === def.id)) {
      buildings.push({
        id: d.id,
        block: def.block,
        part: def.part,
        rowId: d.rowId,
        row: d.row,
        front: d.front,
        cells: d.cells,
        bend: d.bend,
        style: d.style,
        colourway: d.colourway,
        storeys: d.storeys,
        partner: d.partner,
        back: d.back,
      });
    }
  }
  return { stage: "buildings", rows: layerRows, buildings };
}

function run(plan: CityPlan, rand: StageRand): CityBuildingsLayer {
  const { land, mass } = plan.layers;
  if (!land || !mass) throw new CityStageError("buildings: the plan has no land or mass layer");
  const layer = buildBuildings(land, mass, rand);
  const failures = buildingFailures(layer, { land, mass });
  if (failures.length > 0) throw new CityStageError(`${failures[0]!.check}: ${failures[0]!.reason}`, failures[0]!.cells);
  return layer;
}

// ---- the picture ----

const STOREY_COUNT = CITY_STOREYS.max - CITY_STOREYS.min + 1;

/** Blend `rgb` toward white (amount > 0) or black (amount < 0). */
function shade(rgb: number, amount: number): number {
  const to = amount > 0 ? 255 : 0;
  const a = Math.abs(amount);
  const mix = (v: number): number => Math.round(v + (to - v) * a);
  return (mix((rgb >> 16) & 255) << 16) | (mix((rgb >> 8) & 255) << 8) | mix(rgb & 255);
}

/** Index 0 is "not built". Then, for each colourway of the pool and each storey count, "<colourway>, <n> storeys" in the colourway's swatch, lighter at 3 storeys and darker at 5. Then the two dots. */
export const BUILDINGS_LEGEND: readonly LegendEntry[] = [
  { name: "not built", rgb: 0x2b2d31 },
  ...COLOURWAY_POOL.flatMap((cw) =>
    Array.from({ length: STOREY_COUNT }, (_, n) => ({ name: `${cw}, ${CITY_STOREYS.min + n} storeys`, rgb: shade(COLOURWAY_SWATCH[cw]!, n === 0 ? 0.3 : n === STOREY_COUNT - 1 ? -0.3 : 0) })),
  ),
  { name: "through", rgb: 0xffffff },
  { name: "another", rgb: 0x101010 },
];
const LEGEND_THROUGH = 1 + COLOURWAY_POOL.length * STOREY_COUNT;
const LEGEND_ANOTHER = LEGEND_THROUGH + 1;

/** The legend index of a building's cells. */
export function legendOf(colourway: string, storeys: number): number {
  return 1 + COLOURWAY_POOL.indexOf(colourway) * STOREY_COUNT + (storeys - CITY_STOREYS.min);
}

function picture(plan: CityPlan): CityPicture {
  const layer = plan.layers.buildings;
  const streets = plan.layers.streets;
  if (!layer || !streets) throw new CityStageError("picture: the plan has no buildings layer");
  const at = new Map<number, number>();
  const points: { x_m: number; z_m: number; legend: number }[] = [];
  for (const b of layer.buildings) {
    const index = legendOf(b.colourway, b.storeys);
    for (const c of b.cells) at.set(c.j * streets.w + c.i, index);
    if (b.back !== null) {
      const mid = b.cells[Math.floor(b.cells.length / 2)]!;
      points.push({ x_m: (mid.i + 0.5) * CELL_M, z_m: (mid.j + 0.5) * CELL_M, legend: b.back === "through" ? LEGEND_THROUGH : LEGEND_ANOTHER });
    }
  }
  return makePicture("buildings", streets.w, streets.h, BUILDINGS_LEGEND, (i, j) => at.get(j * streets.w + i) ?? 0, points);
}

export const buildingsStage: CityStageDef<"buildings"> = { name: "buildings", run, picture };
