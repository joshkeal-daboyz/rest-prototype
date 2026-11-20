/**
 * Stage 4: the street edge (ticket 070 D1): the kerb cuts at vehicle openings, the parking band (bays, build-outs, plain), the build-out trees, and P1, P3, P4, P5 and P6. D2 adds the kerb line and the ground pieces.
 */

import type { CityEdgeLayer, CityEdgeRole, CityPicture, CityPlan } from "../../core";
import { CityStageError } from "../pipeline/error";
import { makePicture, type LegendEntry } from "../pipeline/picture";
import type { StageRand } from "../pipeline/seeds";
import type { CityStageDef } from "../pipeline/types";
import { buildEdge } from "./band";
import { edgeFailures } from "./check";

/** Index 0 is a block cell: nothing of this layer. Index 10 is for the build-out trees, which are points. */
export const EDGE_LEGEND: readonly LegendEntry[] = [
  { name: "block", rgb: 0x6f8a5a },
  { name: "bay", rgb: 0x5b6fa8 },
  { name: "build-out", rgb: 0x7fb069 },
  { name: "plain", rgb: 0x5b6068 },
  { name: "kerb cut", rgb: 0xe08a3c },
  { name: "pavement", rgb: 0xa7a39a },
  { name: "pavement corner", rgb: 0xc4bfb2 },
  { name: "crossing", rgb: 0xd9d9d0 },
  { name: "junction", rgb: 0x2b2d31 },
  { name: "lane", rgb: 0x3a3d42 },
  { name: "tree", rgb: 0x2f6b2f },
];

export const EDGE_LEGEND_OF_ROLE: Readonly<Record<CityEdgeRole, number>> = { parking: 1, buildout: 2, parkingPlain: 3, kerbCut: 4, pavement: 5, pavementCorner: 6, crossing: 7, junction: 8, lane: 9 };
const LEGEND_TREE = 10;

function run(plan: CityPlan, rand: StageRand): CityEdgeLayer {
  const { streets, land, mass } = plan.layers;
  if (!streets || !land || !mass) throw new CityStageError("edge: the plan has no streets, land or mass layer");
  const layer = buildEdge(streets, land, mass, plan.options, rand);
  const failures = edgeFailures(layer, streets, mass, plan.options);
  if (failures.length > 0) throw new CityStageError(failures[0]!.reason);
  return layer;
}

function picture(plan: CityPlan): CityPicture {
  const layer = plan.layers.edge;
  const streets = plan.layers.streets;
  if (!layer || !streets) throw new CityStageError("picture: the plan has no edge layer");
  const at = new Map<number, number>();
  for (const c of layer.cells) at.set(c.j * streets.w + c.i, EDGE_LEGEND_OF_ROLE[c.role]);
  const points = layer.buildoutTrees.map((t) => ({ x_m: t.x_m, z_m: t.z_m, legend: LEGEND_TREE }));
  return makePicture("edge", streets.w, streets.h, EDGE_LEGEND, (i, j) => at.get(j * streets.w + i) ?? 0, points);
}

export const edgeStage: CityStageDef<"edge"> = { name: "edge", run, picture };
