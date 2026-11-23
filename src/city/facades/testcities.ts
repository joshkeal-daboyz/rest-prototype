/**
 * Test support for the facades tests (ticket 070 H1): the named cities, each built once per test file through a module-level cache, with stages 1 to 7 (edge included). Imported by tests only, never by the stage.
 */
import type { CityBuildingsLayer, CityFacadesLayer, CityMassLayer, CityPlanRun } from "../../core";
import { BUILT_STAGES } from "../stages";
import { sharedCity } from "../testing/namedcities";
import { streetsStageWith } from "../streets/stage";
import type { CityStageDef } from "../pipeline/types";

export interface City {
  readonly blocksX: number;
  readonly blocksZ: number;
  readonly seed: number;
  readonly way: "on" | "off";
}

export { NAMED, VARIED } from "../testing/namedcities";
export const DEFAULT: City = { blocksX: 6, blocksZ: 6, seed: 1, way: "on" };
export const label = (o: City): string => `${o.blocksX} x ${o.blocksZ} seed ${o.seed} one-way ${o.way}`;

/** The built stages up to and including facades (stage 8 is not run here), with stage 1 swapped for the one-way-off variant when `way` is "off". */
export const stagesOf = (way: "on" | "off", swap?: CityStageDef): CityStageDef[] => {
  const upToFacades = BUILT_STAGES.slice(0, BUILT_STAGES.findIndex((s) => s.name === "facades") + 1);
  const all = way === "on" ? [...upToFacades] : [streetsStageWith(0) as unknown as CityStageDef, ...upToFacades.slice(1)];
  return swap ? all.map((s) => (s.name === swap.name ? swap : s)) : all;
};

/** The city, run through stage 7: built at most once per worker per test run and shared across the test files (ticket 076; deep-frozen, as a direct build is). */
export function cityOf(o: City): CityPlanRun {
  return sharedCity(o, "facades");
}

export interface Layers {
  readonly mass: CityMassLayer;
  readonly buildings: CityBuildingsLayer;
  readonly facades: CityFacadesLayer;
}
/** The layers of a city that must be ok. */
export function layersOf(o: City): Layers {
  const r = cityOf(o);
  if (!r.ok) throw new Error(`${label(o)} failed at ${r.failure.stage}: ${r.failure.reason}`);
  const l = r.plan.layers;
  return { mass: l.mass!, buildings: l.buildings!, facades: l.facades! };
}
