/**
 * Stage 9: traffic control (ticket 070 TR1; Josh, 21 Nov 2026, Q32 to Q44: "I will take all of the recommendations"). Every junction of the city is controlled as a town's would be: the busy crossroads have traffic signals on their corners (dark
 * scenery, never powered), the side streets stop at their Ts and at the quiet crossroads (`control.ts`, `signals.ts`, `signs.ts`). Reads `streets`, `mass`, `edge`, `facades` and `ground` (nothing of `circuit`: it places nothing stage 6 owns, and the
 * keep points stage 6 will place are an empty list today). Writes only `traffic`. `trafficFailures` judges the layer before it returns (R-2).
 */

import type { CityEdgeLayer, CityPicture, CityPlan, CityStreetsLayer, CityTrafficLayer, CityTrafficPiece } from "../../core";
import { CityStageError } from "../pipeline/error";
import { makePicture, type LegendEntry } from "../pipeline/picture";
import type { StageRand } from "../pipeline/seeds";
import type { CityStageDef } from "../pipeline/types";
import { cellKey, poleOf, type KeepPoint } from "./clear";
import { buildControl, edgeInfoOf } from "./control";
import { signalPieces } from "./signals";
import { stopSigns } from "./signs";
import { trafficFailures } from "./trafficcheck";

export type Layers = Required<Pick<CityPlan["layers"], "streets" | "mass" | "edge" | "facades" | "ground">>;

/** Place every piece. Pure; fails with `CityStageError` where the layers cannot be read (R-2). `keepPoints` is what stage 6 will place (empty today). */
export function buildTraffic(layers: { readonly streets: Pick<CityStreetsLayer, "streets" | "junctions">; readonly edge: Pick<CityEdgeLayer, "cells" | "ground"> }, rand: StageRand): CityTrafficLayer {
  const { streets, edge } = layers;
  const junctions = buildControl(streets);
  const info = edgeInfoOf(edge);
  const byId = new Map(streets.junctions.map((j) => [j.id, j] as const));
  const pieces: CityTrafficPiece[] = [];
  for (const t of junctions) {
    const j = byId.get(t.junction)!;
    if (t.control === "signals") pieces.push(...signalPieces(j, t, info, rand));
    else pieces.push(...stopSigns(j, t, info));
  }
  return { stage: "traffic", junctions, pieces };
}

function run(plan: CityPlan, rand: StageRand, keepPoints: readonly KeepPoint[] = []): CityTrafficLayer {
  const { streets, mass, edge, facades, ground } = plan.layers;
  if (!streets || !mass || !edge || !facades || !ground) throw new CityStageError("traffic: the plan is missing a layer stage 9 reads");
  const layer = buildTraffic({ streets, edge }, rand);
  const input = { streets, mass, edge, facades, ground, keepPoints } satisfies TrafficLayersInput;
  const failures = trafficFailures(layer, input);
  if (failures.length > 0) throw new CityStageError(`${failures[0]!.check}: ${failures[0]!.reason}`, failures[0]!.cells);
  return layer;
}

type TrafficLayersInput = Parameters<typeof trafficFailures>[1];

// ---- the picture ----

export const TRAFFIC_LEGEND: readonly LegendEntry[] = [
  { name: "nothing", rgb: 0x2b2d31 },
  { name: "signal junction", rgb: 0xe0a040 },
  { name: "all-way stop", rgb: 0xd04040 },
  { name: "T, side street stops", rgb: 0x4a78d0 },
  { name: "corner, no control", rgb: 0x6a6e76 },
  { name: "signal mast", rgb: 0xf0e060 },
  { name: "stop sign", rgb: 0xff7070 },
  { name: "signal box", rgb: 0x40b0d0 },
];

/** The legend index of a grounded piece's point. */
export function legendOf(p: Pick<CityTrafficPiece, "kind">): number {
  return p.kind === "signalMast" ? 5 : p.kind === "stopSign" ? 6 : 7;
}

function picture(plan: CityPlan): CityPicture {
  const layer = plan.layers.traffic;
  const streets = plan.layers.streets;
  if (!layer || !streets) throw new CityStageError("picture: the plan has no traffic layer");
  const at = new Map<string, number>();
  const control = new Map(layer.junctions.map((t) => [t.junction, t.control] as const));
  for (const j of streets.junctions) {
    const c = control.get(j.id);
    const index = c === "signals" ? 1 : c === "allStop" ? 2 : c === "stop" ? 3 : 4;
    for (const cell of j.cells) at.set(cellKey(cell.i, cell.j), index);
  }
  const points = layer.pieces.filter((p) => p.grounded).map((p) => {
    const at = p.kind === "signalMast" ? poleOf(p) : { x: p.placement.x_m, z: p.placement.z_m };
    return { x_m: at.x, z_m: at.z, legend: legendOf(p) };
  });
  return makePicture("traffic", streets.w, streets.h, TRAFFIC_LEGEND, (i, j) => at.get(cellKey(i, j)) ?? 0, points);
}

export const trafficStage: CityStageDef<"traffic"> = { name: "traffic", run: (plan, rand) => run(plan, rand), picture };
