/**
 * Stage 11: what the pass reads, worked out once (ticket 073 D1). The clean plan as `resolveBefore(plan, "tech")` gives it, indexed by cell, building and block, with the district of every block (X-6: a piece's density
 * reads its district's `tech` only), stage 7's boxes, stage 4's keep-outs, the pavement runs and every stage 8 and 9 footprint. Reads no stage folder and no `bi`, `bj` or street `line`.
 */

import type { CityBuilding, CityBuiltCell, CityColumn, CityDistrict, CityGroundProp, CityHistoryLayer, CityResolvedPlan } from "../../core";
import { CityStageError } from "../pipeline/error";
import { s7Boxes, buildDoors, buildKo, type DoorStrip, type KoRect, type S7Box } from "./boxes";
import { Grid, cellKey, rectAt, type Rect } from "./geom";
import { geoOf, type RunGeo } from "./runs";
import type { CircuitPoints } from "../pipeline/readable";

/** A stage 8 or 9 footprint, with what stage 8's pitch rule needs. */
export interface Foot extends Rect {
  readonly src: string;
  /** Stage 8's pavement prop: the pavement run it belongs to. */
  readonly host: string | null;
  readonly flat: boolean;
}

export interface TechCtx {
  readonly resolved: CityResolvedPlan;
  readonly built: ReadonlyMap<string, CityBuiltCell>;
  readonly columns: ReadonlyMap<string, CityColumn>;
  readonly buildings: ReadonlyMap<string, CityBuilding>;
  /** Block id to its district. */
  readonly districtOfBlock: ReadonlyMap<string, CityDistrict>;
  readonly runs: readonly RunGeo[];
  readonly ko: Grid<KoRect>;
  readonly doors: Grid<DoorStrip>;
  /** Stage 7's boxes with every dressing piece (the shopfronts' eligibility reads it). */
  readonly boxesAll: Grid<S7Box>;
  /** Stage 8's pavement props by run id, and every stage 8 and 9 footprint by 5 m cell. */
  readonly propsOfRun: ReadonlyMap<string, readonly CityGroundProp[]>;
  readonly feet: Grid<Foot>;
  readonly circuit: CircuitPoints;
}

/** The context of a clean resolved plan and a circuit. Throws a `CityStageError` when a layer the pass reads is missing (R-2). */
export function buildContext(resolved: CityResolvedPlan, history: CityHistoryLayer | undefined, circuit: CircuitPoints): TechCtx {
  const L = resolved.plan.layers;
  const { mass, buildings, edge, facades, ground, traffic } = L;
  if (!mass || !buildings || !edge || !facades || !ground || !traffic) throw new CityStageError("tech: the plan lacks a layer the pass reads (mass, buildings, edge, facades, ground or traffic)");
  if (!buildings.columns) throw new CityStageError("tech: the buildings layer has no columns");
  if (!facades.dressing || !facades.walls || !facades.roofs || !facades.novelty) throw new CityStageError("tech: the facades layer is missing its dressing, walls, roofs or novelty");
  if (history === undefined) throw new CityStageError("tech: the plan has no history layer (X-6: density reads the district's tech)");
  const districtOfBlock = new Map<string, CityDistrict>();
  for (const d of history.districts) for (const b of d.blocks) districtOfBlock.set(b, d);

  const propsOfRun = new Map<string, CityGroundProp[]>();
  const feet = new Grid<Foot>();
  for (const p of ground.props) {
    const r: Rect = { x0: p.placement.x_m - p.size.x_m / 2, x1: p.placement.x_m + p.size.x_m / 2, z0: p.placement.z_m - p.size.z_m / 2, z1: p.placement.z_m + p.size.z_m / 2 };
    const host = p.on === "pavement" ? p.host : null;
    feet.add({ ...r, src: `ground:${p.kind}`, host, flat: p.flat });
    if (host !== null) {
      const list = propsOfRun.get(host);
      if (list) list.push(p);
      else propsOfRun.set(host, [p]);
    }
  }
  for (const p of traffic.pieces) {
    feet.add({ ...rectAt(p.placement.x_m, p.placement.z_m, p.size.x_m, p.size.z_m, 0), src: `traffic:${p.kind}`, host: null, flat: false });
  }
  return {
    resolved,
    built: new Map(mass.built.map((c) => [cellKey(c.i, c.j), c] as const)),
    columns: new Map(buildings.columns.map((c) => [cellKey(c.i, c.j), c] as const)),
    buildings: new Map(buildings.buildings.map((b) => [b.id, b] as const)),
    districtOfBlock,
    runs: ground.runs.map(geoOf),
    ko: buildKo(edge),
    doors: buildDoors(mass, facades),
    boxesAll: s7Boxes({ facades }),
    propsOfRun,
    feet,
    circuit,
  };
}

/** The district of a block, or a `CityStageError` (every block is in exactly one, B). */
export function districtOf(ctx: TechCtx, block: string): CityDistrict {
  const d = ctx.districtOfBlock.get(block);
  if (!d) throw new CityStageError(`tech: block ${block} is in no district`);
  return d;
}
