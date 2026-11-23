/**
 * Stage 6: the circuit (ticket 081 K2a; the rules are ticket 070 K1's, `docs/design/070-K1-circuit.md`). Lays every pole and span of the city: CK1 to CK6. Reads `streets` and `edge`, writes only `circuit`. Drops, street lights and
 * lamp-post places are K2b's, so those lists are empty here; `keep` holds every pole. `circuitProblems` judges the layer before it returns (R-2).
 */

import type { CityCircuitLayer, CityPicture, CityPlan } from "../../core";
import { CityStageError } from "../pipeline/error";
import { makePicture, type LegendEntry } from "../pipeline/picture";
import type { CityStageDef } from "../pipeline/types";
import { circuitProblems, type CircuitInput } from "./check";
import { CELL_M } from "./constants";
import { layPoles } from "./lay";

/** Pure: poles and spans from the streets and the edge. */
export function buildCircuit(input: CircuitInput): CityCircuitLayer {
  const { poles, spans } = layPoles(input);
  return { stage: "circuit", poles, spans, drops: [], lights: [], posts: [], keep: poles.map((p) => ({ x_m: p.x_m, z_m: p.z_m })) };
}

function run(plan: CityPlan): CityCircuitLayer {
  const { streets, edge } = plan.layers;
  if (!streets || !edge) throw new CityStageError("circuit: the plan is missing a layer stage 6 reads");
  const input = { streets, edge } satisfies CircuitInput;
  const layer = buildCircuit(input);
  const problems = circuitProblems(layer, input);
  if (problems.length > 0) throw new CityStageError(`${problems[0]!.rule}: ${problems[0]!.reason} (${problems[0]!.id}; ${problems.length} problems)`);
  return layer;
}

export const CIRCUIT_LEGEND: readonly LegendEntry[] = [
  { name: "nothing", rgb: 0x2b2d31 },
  { name: "pole on the pavement", rgb: 0xe0a040 },
  { name: "street a crossing spans", rgb: 0x4a78d0 },
  { name: "pole", rgb: 0xf0e060 },
  { name: "crossing pole", rgb: 0xff7070 },
];

function picture(plan: CityPlan): CityPicture {
  const layer = plan.layers.circuit;
  const streets = plan.layers.streets;
  if (!layer || !streets) throw new CityStageError("picture: the plan has no circuit layer");
  const at = new Map<string, number>();
  const byStreet = new Map(streets.streets.map((s) => [s.id, s] as const));
  for (const s of layer.spans) {
    if (s.kind !== "cross") continue;
    const pa = layer.poles.find((p) => p.id === s.a)!;
    const st = byStreet.get(pa.street)!;
    const k = Math.floor(pa.along_m / CELL_M);
    for (let n = 0; n < st.bands.length; n++) at.set(st.axis === "x" ? `${k},${st.across0 + n}` : `${st.across0 + n},${k}`, 2);
  }
  for (const p of layer.poles) at.set(`${Math.floor(p.x_m / CELL_M)},${Math.floor(p.z_m / CELL_M)}`, 1);
  const points = layer.poles.map((p) => ({ x_m: p.x_m, z_m: p.z_m, legend: p.kind === "crossing" ? 4 : 3 }));
  return makePicture("circuit", streets.w, streets.h, CIRCUIT_LEGEND, (i, j) => at.get(`${i},${j}`) ?? 0, points);
}

export const circuitStage: CityStageDef<"circuit"> = { name: "circuit", run, picture };
