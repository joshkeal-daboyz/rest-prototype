/**
 * Test support for the traffic tests (ticket 070 TR1): the named cities, each built once per test file through a module-level cache, with stages 1 to 9. Imported by tests only, never by the stage.
 */
import type { CityEdgeLayer, CityFacadesLayer, CityGroundLayer, CityMassLayer, CityPlanRun, CityStreetsLayer, CityTrafficLayer } from "../../core";
import { BUILT_STAGES, runCity } from "../stages";
import type { CityStageDef } from "../pipeline/types";
import { streetsStageWith } from "../streets/stage";
import type { TrafficInput } from "./trafficcheck";

export interface City {
  readonly blocksX: number;
  readonly blocksZ: number;
  readonly seed: number;
  readonly way: "on" | "off";
}

/** The 20 named runs: 6 x 6 seeds 1 to 10, one-way off and on (Q17). */
export const NAMED: readonly City[] = (["on", "off"] as const).flatMap((way) => Array.from({ length: 10 }, (_, n) => ({ blocksX: 6, blocksZ: 6, seed: n + 1, way })));
export const DEFAULT: City = { blocksX: 6, blocksZ: 6, seed: 1, way: "on" };
/** The four pin cities (R-4): 6 x 6 seeds 1, 2, 3 and 8, one-way on. */
export const PINNED: readonly City[] = [1, 2, 3, 8].map((seed) => ({ blocksX: 6, blocksZ: 6, seed, way: "on" as const }));
export const label = (o: City): string => `${o.blocksX} x ${o.blocksZ} seed ${o.seed} one-way ${o.way}`;

/** The built stages (through traffic), with stage 1 swapped for the one-way-off variant when `way` is "off", and a stage replaced by name when `swap` is given. */
export const stagesOf = (way: "on" | "off", swap?: CityStageDef): CityStageDef[] => {
  const all = way === "on" ? [...BUILT_STAGES] : [streetsStageWith(0) as unknown as CityStageDef, ...BUILT_STAGES.slice(1)];
  return swap ? all.map((s) => (s.name === swap.name ? swap : s)) : all;
};

const cache = new Map<string, CityPlanRun>();
/** The city, run through stage 9 once per test file. */
export function cityOf(o: City): CityPlanRun {
  const k = `${o.blocksX}x${o.blocksZ}:${o.seed}:${o.way}`;
  if (!cache.has(k)) cache.set(k, runCity({ blocksX: o.blocksX, blocksZ: o.blocksZ, seed: o.seed }, undefined, stagesOf(o.way)));
  return cache.get(k)!;
}

export interface Layers {
  readonly streets: CityStreetsLayer;
  readonly mass: CityMassLayer;
  readonly edge: CityEdgeLayer;
  readonly facades: CityFacadesLayer;
  readonly ground: CityGroundLayer;
  readonly traffic: CityTrafficLayer;
}
/** The layers of a city that must be ok. */
export function layersOf(o: City): Layers {
  const r = cityOf(o);
  if (!r.ok) throw new Error(`${label(o)} failed at ${r.failure.stage}: ${r.failure.reason}`);
  return r.plan.layers as unknown as Layers;
}

/** What `trafficFailures` reads of a city's layers. */
export function inputOf(l: Layers): TrafficInput {
  return { streets: l.streets, mass: l.mass, edge: l.edge, facades: l.facades, ground: l.ground };
}

/** Build the cities one at a time, yielding to the event loop between them, so a worker answers the runner's messages during a file's long setup (a 17 s synchronous block made vitest report a worker timeout). */
export async function warm(list: readonly City[]): Promise<void> {
  for (const o of list) {
    cityOf(o);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}
