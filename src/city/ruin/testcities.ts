/**
 * Test support for stage 13 (ticket 073 F1): the named cities run through the clean stages and the eras before the ruin, once per test file. Imported by tests only, never by the stage.
 */
import type { CityEraPlan, CityEraRun, CityHistoryLayer } from "../../core";
import { deepFreeze } from "../pipeline/run";
import { sharedEra } from "../testing/namedcities";

export interface City {
  readonly blocksX: number;
  readonly blocksZ: number;
  readonly seed: number;
  readonly way: "on" | "off";
}

/** The 20 named runs: 6 x 6 seeds 1 to 10, one-way off and on. */
export const NAMED: readonly City[] = (["on", "off"] as const).flatMap((way) => Array.from({ length: 10 }, (_, n) => ({ blocksX: 6, blocksZ: 6, seed: n + 1, way })));
/** The four pin cities: 6 x 6 seeds 1, 2, 3 and 8, one-way on. */
export const PINNED: readonly City[] = [1, 2, 3, 8].map((seed) => ({ blocksX: 6, blocksZ: 6, seed, way: "on" as const }));
export const label = (o: City): string => `${o.blocksX} x ${o.blocksZ} seed ${o.seed} one-way ${o.way}`;

/** The city run through the clean stages and the eras up to and including `era`. Throws on a failed stage, naming it. */
export function eraRun(o: City, era: "tech" | "holdout" | "ruin" | "ruin"): Extract<CityEraRun, { ok: true }> {
  const r = sharedEra(o, era);
  if (!r.ok) throw new Error(`${label(o)} failed at ${r.failure.stage}: ${r.failure.reason}`);
  return r;
}

/** The plan the ruin reads: the clean stages, history, and the tech and hold-out eras' layers. */
export const beforeRuin = (o: City): CityEraPlan => eraRun(o, "holdout").plan;

/** The same plan with every district's `wild` replaced (the districts and their blocks are kept). */
export function withWild(plan: CityEraPlan, wild: (index: number) => number): CityEraPlan {
  const h = plan.layers.history!;
  const history: CityHistoryLayer = { stage: "history", districts: h.districts.map((d, n) => ({ ...d, wild: wild(n) })) };
  return deepFreeze({ plan: plan.plan, layers: { ...plan.layers, history }, digests: plan.digests });
}
