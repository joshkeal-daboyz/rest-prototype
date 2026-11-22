/**
 * Stage 11: tech (ticket 073 D1; Josh, 21 Nov 2026: the Sci-Fi City pack is "the iterative process on which humans build upon their city", "augmented with the sci-fi city assets", and its poles "are intended to be atop
 * buildings and other objects they are not intended to come out of the ground"). The tech era's walls, signs, shopfronts and pavement. It adds pieces (`adds`) and lists typed changes against earlier layers (`changes`,
 * which here are only the `remove`s of a shopfront's face dressing: no swap, no state). It never edits a layer (X-2), never draws, and reads each district's `tech` only (X-6).
 *
 * - **Reads** the plan at the era before its own, `resolveBefore(plan, "tech")` (the clean plan), and the history layer.
 * - **Order:** the shopfronts first, then the wall pieces, then the pavement pieces (which count the panels in the clear walk).
 * - **Ends** with C1's `assertEraReadable` on its own layer, with this kit's bounds and no tree (X-4): T-1 and T-2 hold or the stage throws `CityStageError`.
 * - **The circuit.** Stage 6 is empty until K2, so the circuit keeps find nothing on the named runs; `TechOptions.circuit` hands the stage a circuit (fixtures). Its tech digests are re-pinned when K2 lands.
 *
 * `techStage` is a `CityEraStageDef<"tech">`, registered in `ERA_STAGES` in `src/city/stages.ts`. A clean run never runs it (X-7).
 */

import type { CityEraPicture, CityEraPlan, CityResolvedPlan, CityTechLayer } from "../../core";
import { resolveBefore, assertEraReadable, type CityEraStageDef } from "../pipeline/eras";
import { CityStageError } from "../pipeline/error";
import { makePicture, type LegendEntry } from "../pipeline/picture";
import { circuitPoints, type CircuitPoints } from "../pipeline/readable";
import type { StageRand } from "../pipeline/seeds";
import { TECH_SHOPFRONTS } from "./constants";
import { buildContext } from "./context";
import { cellKey } from "./geom";
import { techBoundsOf, techIsTree } from "./kit";
import { PaveState, layoutPavements, newPavementStats, type PavementStats } from "./pavement";
import { layoutShops, newShopStats, type ShopStats } from "./shops";
import { layoutWalls, newWallStats, type WallStats } from "./walls";

export interface TechOptions {
  /** Whether the top band adds shopfronts; default `TECH_SHOPFRONTS`. A test sets it here, never by editing the constant. */
  readonly shopfronts?: boolean;
  /** The circuit to keep clear of; default what stage 6 gives (nothing until K2). */
  readonly circuit?: CircuitPoints;
}

export interface TechStats {
  readonly walls: WallStats;
  readonly shops: ShopStats;
  readonly pavement: PavementStats;
}

export interface TechBuild {
  readonly layer: CityTechLayer;
  readonly stats: TechStats;
  readonly resolved: CityResolvedPlan;
}

/** The tech layer of an era plan (which holds the clean plan and the history layer), with the numbers it was made with. Throws `CityStageError` (R-2, X-4). */
export function buildTech(plan: CityEraPlan, rand: StageRand, options: TechOptions = {}): TechBuild {
  const before = resolveBefore(plan, "tech");
  const circuit = options.circuit ?? circuitPoints(before);
  const ctx = buildContext(before, plan.layers.history, circuit);
  const state = new PaveState();
  const stats: TechStats = { walls: newWallStats(), shops: newShopStats(), pavement: newPavementStats() };

  const shops = layoutShops(ctx, state, rand, stats.shops, options.shopfronts ?? TECH_SHOPFRONTS);
  // the dressing a panel removes still counts as a box: the pieces beside it do not depend on whether the shopfronts are on (the switch changes the shopfronts and their removes, and what the panels crowd)
  const walls = layoutWalls(ctx, ctx.boxesAll, rand, stats.walls);
  const pavement = layoutPavements(ctx, ctx.boxesAll, state, rand, stats.pavement);

  const layer: CityTechLayer = { stage: "tech", adds: [...shops.adds, ...walls, ...pavement], changes: shops.changes };
  const ids = new Set<string>();
  for (const a of layer.adds) {
    if (ids.has(a.id)) throw new CityStageError(`R-1: the tech pass wrote the id ${a.id} twice`);
    ids.add(a.id);
  }
  const resolved = assertEraReadable(plan, "tech", layer, { bounds: techBoundsOf, isTree: techIsTree, circuit });
  return { layer, stats, resolved };
}

// ---- the picture (R-5) ----

const LEGEND: readonly LegendEntry[] = [
  { name: "nothing", rgb: 0x2b2d31 },
  { name: "wall tech: bolt-ons, cameras, signs, tall pieces", rgb: 0x4a78d0 },
  { name: "pavement tech", rgb: 0xe0a040 },
  { name: "shopfront", rgb: 0xd05080 },
];

/** The flat picture of the layer: each cell is the highest of what the layer adds there, shopfront over pavement over wall. A pavement piece is in its pavement cell, a wall piece or shopfront in the cell it is mounted on. */
export function techPicture(plan: CityEraPlan, layer: CityTechLayer): CityEraPicture {
  const streets = plan.plan.layers.streets;
  if (!streets) throw new CityStageError("picture: the plan has no streets layer");
  const at = new Map<string, number>();
  for (const a of layer.adds) {
    const rank = a.kind === "shopfront" ? 3 : a.kind === "pavement" ? 2 : 1;
    const k = cellKey(a.cell.i, a.cell.j);
    if ((at.get(k) ?? 0) < rank) at.set(k, rank);
  }
  return { ...makePicture("streets", streets.w, streets.h, LEGEND, (i, j) => at.get(cellKey(i, j)) ?? 0), stage: "tech" };
}

/** The era stage, as the era runner (C1) takes it. */
export const techStage: CityEraStageDef<"tech"> = {
  name: "tech",
  run: (plan, rand) => buildTech(plan, rand).layer,
  picture: (plan) => {
    const layer = plan.layers.tech;
    if (!layer) throw new CityStageError("picture: the plan has no tech layer");
    return techPicture(plan, layer);
  },
};
