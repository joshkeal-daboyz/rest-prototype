/**
 * Stage 8: ground dressing (ticket 070 I; style guide 16.5's furniture, 19.4's greens, 19.6's lanes; grammar rules 5, 9 and 10; the checklist's R10). The tile city's ground dressing moved onto the pipeline's cells: the tile city's street
 * furniture on the pavements in front of its terrace runs (`pavement.ts`), the bins against the walls of the lanes (`lanes.ts`), trees and benches on every green (`greens.ts`), and the plazas and frontage lots dressed (`lots.ts`).
 * Reads `streets` (the blocks of the lanes), `land`, `mass`, `edge`, `buildings` and `facades` (nothing of `circuit`: it places no lamp, NL). Writes only `ground`. `groundFailures` judges the layer before it returns (R-2).
 */

import type { CityGroundLayer, CityGroundProp, CityGroundPropKind, CityPicture, CityPlan } from "../../core";
import { CityStageError } from "../pipeline/error";
import { makePicture, type LegendEntry } from "../pipeline/picture";
import type { StageRand } from "../pipeline/seeds";
import type { CityStageDef } from "../pipeline/types";
import { cellKey } from "./geom";
import { groundFailures } from "./groundcheck";
import { layoutGreens } from "./greens";
import { buildKeepouts, type KeepPoint } from "./keepout";
import { layoutLanes } from "./lanes";
import { layoutLots } from "./lots";
import { layoutPavements } from "./pavement";
import { buildRuns, plainRun } from "./runs";
import { newStats, type GroundStats } from "./stats";
import { unitOf } from "./hash";

type Layers = Required<Pick<CityPlan["layers"], "streets" | "land" | "mass" | "edge" | "buildings" | "facades">>;

/** The layer and what its placement counted. */
export interface GroundBuild {
  readonly layer: CityGroundLayer;
  readonly stats: GroundStats;
  readonly keepPoints: readonly KeepPoint[];
}

/** Place every prop. Pure; fails with `CityStageError` where the layers cannot be read (R-2). `keepPoints` is what stage 6 will place (empty today, NL). */
export function buildGround(layers: Layers, rand: StageRand, keepPoints: readonly KeepPoint[] = []): GroundBuild {
  const { streets, land, mass, edge, buildings, facades } = layers;
  const stats = newStats();
  const keep = buildKeepouts({ mass, edge, facades }, keepPoints);
  const unit = (...key: readonly (string | number)[]): number => unitOf(rand(...key));
  const runs = buildRuns(mass, edge, buildings);
  const props: CityGroundProp[] = [
    ...layoutPavements(runs, keep, unit, edge.bays, stats),
    ...layoutLanes(land, streets.blocks, mass, keep, unit, stats),
    ...layoutLots({ mass, edge, buildings }, keep, rand, unit, stats),
    ...layoutGreens(mass, rand, stats),
  ];
  return { layer: { stage: "ground", runs: runs.map(plainRun), props }, stats, keepPoints };
}

function run(plan: CityPlan, rand: StageRand): CityGroundLayer {
  const { streets, land, mass, edge, buildings, facades } = plan.layers;
  if (!streets || !land || !mass || !edge || !buildings || !facades) throw new CityStageError("ground: the plan is missing a layer stage 8 reads");
  const { layer } = buildGround({ streets, land, mass, edge, buildings, facades }, rand);
  const failures = groundFailures(layer, { mass, edge, facades });
  if (failures.length > 0) throw new CityStageError(`${failures[0]!.check}: ${failures[0]!.reason}`, failures[0]!.cells);
  return layer;
}

// ---- the picture ----

export const GROUND_LEGEND: readonly LegendEntry[] = [
  { name: "nothing", rgb: 0x2b2d31 },
  { name: "pavement run", rgb: 0x6a6e76 },
  { name: "tree", rgb: 0x3c9a4a },
  { name: "bench", rgb: 0xb88a4a },
  { name: "bin", rgb: 0x8a8f98 },
  { name: "planter or pot plant", rgb: 0x80c070 },
  { name: "mailbox or newspaper box", rgb: 0x4a78d0 },
  { name: "meter", rgb: 0xe0c040 },
  { name: "hydrant", rgb: 0xd04040 },
  { name: "bus stop", rgb: 0x40b0d0 },
  { name: "bollard", rgb: 0xf0f0f0 },
  { name: "lot piece", rgb: 0xa0a0c8 },
  { name: "plaza piece", rgb: 0xe090c0 },
];

/** The legend index of a prop's point. */
export function legendOf(p: Pick<CityGroundProp, "kind" | "on">): number {
  const kind: CityGroundPropKind = p.kind;
  switch (kind) {
    case "tree":
      return 2;
    case "bench":
      return 3;
    case "bin":
      return 4;
    case "planter":
    case "potPlant":
      return 5;
    case "mailbox":
    case "newspaper":
      return 6;
    case "meter":
      return 7;
    case "hydrant":
      return 8;
    case "busStop":
      return 9;
    case "bollard":
      return 10;
    case "lotLines":
    case "barrier":
    case "lotMeter":
    case "billboardPole":
    case "billboardBoard":
      return 11;
    default:
      return 12;
  }
}

function picture(plan: CityPlan): CityPicture {
  const layer = plan.layers.ground;
  const streets = plan.layers.streets;
  if (!layer || !streets) throw new CityStageError("picture: the plan has no ground layer");
  const at = new Set<string>();
  for (const r of layer.runs) for (const c of r.pavement) at.add(cellKey(c.i, c.j));
  const points = layer.props.map((p) => ({ x_m: p.placement.x_m, z_m: p.placement.z_m, legend: legendOf(p) }));
  return makePicture("ground", streets.w, streets.h, GROUND_LEGEND, (i, j) => (at.has(cellKey(i, j)) ? 1 : 0), points);
}

export const groundStage: CityStageDef<"ground"> = { name: "ground", run, picture };
