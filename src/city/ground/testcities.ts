/**
 * Test support for the ground tests (ticket 070 I): the named cities, each built once per test file through a module-level cache, with stages 1 to 8. Imported by tests only, never by the stage.
 */
import type { CityBuildingsLayer, CityEdgeLayer, CityFacadesLayer, CityGroundLayer, CityLandLayer, CityMassLayer, CityPlanRun, CityStreetsLayer } from "../../core";
import { BUILT_STAGES } from "../stages";
import { sharedCity } from "../testing/namedcities";
import type { CityStageDef } from "../pipeline/types";
import { streetsStageWith } from "../streets/stage";

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

/** The built stages through ground (stage 9, traffic, is left out: every ground test runs the stages it ran before TR1), with stage 1 swapped for the one-way-off variant when `way` is "off", and a stage replaced by name when `swap` is given. */
export const stagesOf = (way: "on" | "off", swap?: CityStageDef): CityStageDef[] => {
  const all = (way === "on" ? [...BUILT_STAGES] : [streetsStageWith(0) as unknown as CityStageDef, ...BUILT_STAGES.slice(1)]).filter((s) => s.name !== "traffic");
  return swap ? all.map((s) => (s.name === swap.name ? swap : s)) : all;
};

/** The city, run through stage 8: built at most once per worker per test run and shared across the test files (ticket 076; deep-frozen, as a direct build is). */
export function cityOf(o: City): CityPlanRun {
  return sharedCity(o, "ground");
}

export interface Layers {
  readonly streets: CityStreetsLayer;
  readonly land: CityLandLayer;
  readonly mass: CityMassLayer;
  readonly edge: CityEdgeLayer;
  readonly buildings: CityBuildingsLayer;
  readonly facades: CityFacadesLayer;
  readonly ground: CityGroundLayer;
}
/** The layers of a city that must be ok. */
export function layersOf(o: City): Layers {
  const r = cityOf(o);
  if (!r.ok) throw new Error(`${label(o)} failed at ${r.failure.stage}: ${r.failure.reason}`);
  return r.plan.layers as unknown as Layers;
}
