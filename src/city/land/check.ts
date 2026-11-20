/**
 * Stage 2's checks, run on the layer: V3 (alleys) and V4 (parks), ported from `blockVariety` and `evaluateVariety` in `src/render3d/frontage.ts` with their thresholds unchanged, and M4a (no part has a short
 * side of 3 to 5 cells, grammar rule 4; and, from B2, no lane leaves a court part with a long side under 8). V3 and V4 are counted from the layer's cells alone: an alley is an edge-connected set of lane cells, a park an edge-connected set of park cells. Pure.
 */

import type { CityBlock, CityCell, CityLandLayer, CityPlanStreet } from "../../core";
import { ALLEY_CELLS, ALLEY_ONE_IN_BLOCKS, COURT_LONG_MIN_CELLS, PARK_ONE_IN_BLOCKS } from "./constants";
import { partSideOk, type PlanBlock } from "./plan";
import { bandsOf, facesJunction, isServed } from "./reach";

export type LandCheckId = "V3" | "V4" | "M4a";

/** What each check allows: V3 and V4, how many alleys and parks short of the rate; M4a, how many parts with a short side of 3 to 5 cells (or under 2). */
export const LAND_CHECK: Readonly<Record<LandCheckId, number>> = { V3: 0, V4: 0, M4a: 0 };

export interface LandVerdict {
  readonly id: LandCheckId;
  readonly value: number;
  readonly pass: boolean;
}

/** The cells of every lane, and of every park. */
export function laneCells(layer: Pick<CityLandLayer, "lanes">, blocks: readonly CityBlock[]): CityCell[] {
  const out: CityCell[] = [];
  const byId = new Map(blocks.map((x) => [x.id, x] as const));
  for (const l of layer.lanes) {
    const b = byId.get(l.block);
    if (!b) continue;
    if (l.axis === "z") for (let j = b.j0; j < b.j1; j++) for (let i = l.at; i < l.at + ALLEY_CELLS; i++) out.push({ i, j });
    else for (let i = b.i0; i < b.i1; i++) for (let j = l.at; j < l.at + ALLEY_CELLS; j++) out.push({ i, j });
  }
  return out;
}

export function parkCells(layer: Pick<CityLandLayer, "parks">): CityCell[] {
  const out: CityCell[] = [];
  for (const p of layer.parks) for (let j = p.j0; j < p.j1; j++) for (let i = p.i0; i < p.i1; i++) out.push({ i, j });
  return out;
}

/** The edge-connected sets of a list of cells. */
export function components(cells: readonly CityCell[]): number {
  const left = new Set(cells.map((c) => `${c.i},${c.j}`));
  let n = 0;
  for (const start of [...left]) {
    if (!left.has(start)) continue;
    n++;
    const todo = [start];
    left.delete(start);
    while (todo.length > 0) {
      const [i, j] = todo.pop()!.split(",").map(Number) as [number, number];
      for (const k of [`${i + 1},${j}`, `${i - 1},${j}`, `${i},${j + 1}`, `${i},${j - 1}`]) if (left.delete(k)) todo.push(k);
    }
  }
  return n;
}

export interface LandVariety {
  readonly blocks: number;
  readonly alleys: number;
  readonly alleysNeeded: number;
  readonly parks: number;
  readonly parksNeeded: number;
  /** The parts whose short side is not 2 and not 6 or more. */
  readonly badParts: readonly string[];
  /** B2: the court parts a lane leaves whose long side is under `COURT_LONG_MIN_CELLS` (no drive fits). A whole block no lane cuts is not judged here. */
  readonly cramped: readonly string[];
}

/** The numbers behind V3, V4 and M4a, read from the layer's cells alone (never from the code that chose the alleys and parks). */
export function landVariety(layer: CityLandLayer, blocks: readonly CityBlock[]): LandVariety {
  const n = blocks.length;
  return {
    blocks: n,
    alleys: components(laneCells(layer, blocks)),
    alleysNeeded: Math.ceil(n / ALLEY_ONE_IN_BLOCKS),
    parks: components(parkCells(layer)),
    parksNeeded: Math.ceil(n / PARK_ONE_IN_BLOCKS),
    badParts: layer.parts.filter((p) => !partSideOk(Math.min(p.i1 - p.i0, p.j1 - p.j0))).map((p) => p.id),
    cramped: layer.parts.filter((p) => p.shape === "court" && Object.values(p.edges).includes("lane") && Math.max(p.i1 - p.i0, p.j1 - p.j0) < COURT_LONG_MIN_CELLS).map((p) => p.id),
  };
}

/** V3, V4 and M4a against `LAND_CHECK`. A city with no blocks fails V3 and V4 (value 1). V3 and V4's value is how many alleys and parks the city is short. */
export function evaluateLand(m: LandVariety): LandVerdict[] {
  const v3 = Math.max(0, m.alleysNeeded - m.alleys) + (m.blocks === 0 ? 1 : 0);
  const v4 = Math.max(0, m.parksNeeded - m.parks) + (m.blocks === 0 ? 1 : 0);
  const m4a = m.badParts.length + m.cramped.length;
  return [
    { id: "V3", value: v3, pass: v3 <= LAND_CHECK.V3 },
    { id: "V4", value: v4, pass: v4 <= LAND_CHECK.V4 },
    { id: "M4a", value: m4a, pass: m4a <= LAND_CHECK.M4a },
  ];
}

/** S6 for lanes: the lanes whose mouth lies in a junction-facing stretch of a side it opens on, widened by `BAY_JUNCTION_CLEAR`. Each entry names the block and the side. */
export function laneMouthsAtJunctions(layer: Pick<CityLandLayer, "lanes">, blocks: readonly PlanBlock[]): string[] {
  const byId = new Map(blocks.map((x) => [x.id, x] as const));
  const out: string[] = [];
  for (const l of layer.lanes) {
    const b = byId.get(l.block);
    if (!b) continue;
    for (const side of l.axis === "z" ? (["-z", "+z"] as const) : (["-x", "+x"] as const)) if (facesJunction(b.sides[side], l.at)) out.push(`${l.block} ${side}`);
  }
  return out;
}

/** The served park: the blocks laid as a whole park that no parking band across one of their streets serves. */
export function unservedWholeParks(layer: Pick<CityLandLayer, "parks">, blocks: readonly PlanBlock[], streets: readonly Pick<CityPlanStreet, "id" | "bands">[]): string[] {
  const byId = new Map(blocks.map((x) => [x.id, x] as const));
  const bands = bandsOf(streets);
  return layer.parks.filter((p) => p.kind === "whole" && !(byId.has(p.block) && isServed(byId.get(p.block)!, bands))).map((p) => p.block);
}
