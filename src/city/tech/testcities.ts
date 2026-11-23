/**
 * Test support for the tech tests (ticket 073 D1): the named cities, each built once per test file through a module-level cache (clean stages 1 to 9, then `history`), and the tech build of each, once. Imported by tests only, never by the stage.
 */
import type { CityEraPlan, CityPlan } from "../../core";
import { historyStage } from "../history/stage";
import { runEraStages } from "../pipeline/eras";
import { stageRand } from "../pipeline/seeds";
import { sharedCity } from "../testing/namedcities";
import { buildTech, type TechBuild, type TechOptions } from "./stage";

export interface City {
  readonly blocksX: number;
  readonly blocksZ: number;
  readonly seed: number;
  readonly way: "on" | "off";
}

export { NAMED } from "../testing/namedcities";
export const DEFAULT: City = { blocksX: 6, blocksZ: 6, seed: 1, way: "on" };
/** The four pin cities: 6 x 6 seeds 1, 2, 3 and 8, one-way on. */
export const PINNED: readonly City[] = [1, 2, 3, 8].map((seed) => ({ blocksX: 6, blocksZ: 6, seed, way: "on" as const }));
export const label = (o: City): string => `${o.blocksX} x ${o.blocksZ} seed ${o.seed} one-way ${o.way}`;

/** The city's clean plan (stages 1 to 9): built at most once per worker per test run and shared across the test files (ticket 076; deep-frozen, as a direct build is). */
export function cleanOf(o: City): CityPlan {
  const r = sharedCity(o, "clean");
  if (!r.ok) throw new Error(`${label(o)} failed at ${r.failure.stage}: ${r.failure.reason}`);
  return r.plan;
}

/** The era plan holding the clean plan and the history layer, which is all the tech pass reads. */
export function historyPlanOf(o: City): CityEraPlan {
  const p = cleanOf(o);
  const r = runEraStages(p, "tech", [historyStage as never]);
  if (!r.ok) throw new Error(`${label(o)} history failed: ${r.failure.reason}`);
  return r.plan;
}

const built = new Map<string, { build: TechBuild; ms: number }>();
/** The tech build of a city (default options), once per test file, with the time it took. */
export function techOf(o: City): { build: TechBuild; ms: number } {
  const k = `${o.blocksX}x${o.blocksZ}:${o.seed}:${o.way}`;
  if (!built.has(k)) {
    const plan = historyPlanOf(o);
    const t0 = Date.now();
    const build = buildTech(plan, stageRand("tech", o.seed));
    built.set(k, { build, ms: Date.now() - t0 });
  }
  return built.get(k)!;
}

/** A tech build with options (a fixture's), not cached. */
export const techWith = (o: City, options: TechOptions): TechBuild => buildTech(historyPlanOf(o), stageRand("tech", o.seed), options);
