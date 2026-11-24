/**
 * The named cities and their shared builds (ticket 076 A). Test support only: a stage never imports it.
 *
 * `sharedCity(o, profile)` is the run a test file used to build for itself, with the exact stage list that file used (a profile), built at most once per worker per test run and read from the run's disk cache
 * otherwise (`cache.ts`). `sharedEra(o, era)` is `runCityEra` over the shared clean plan. Both are deep-frozen and `toStrictEqual` a direct build. Only the default stage lists are shared; a test that swaps, doubles or
 * writes a stage, or calls `runCity` / `runCityEra` to test the runner, builds for itself as before.
 */
import type { CityEraRun, CityPlanRun, CityPlanStage } from "../../core";
import { deepFreeze } from "../pipeline/run";
import { runEraStages } from "../pipeline/eras";
import type { CityStageDef } from "../pipeline/types";
import { BUILT_STAGES, ERA_STAGES, runCity } from "../stages";
import { streetsStageWith } from "../streets/stage";
import { cached } from "./cache";

export interface NamedCity {
  readonly blocksX: number;
  readonly blocksZ: number;
  readonly seed: number;
  readonly way: "on" | "off";
}

/** The 20 named runs: 6 x 6 seeds 1 to 10, one-way on then off. Read directly only by a test that names a city other than seed 1 on. */
export const ALL_NAMED: readonly NamedCity[] = (["on", "off"] as const).flatMap((way) => Array.from({ length: 10 }, (_, n) => ({ blocksX: 6, blocksZ: 6, seed: n + 1, way })));
/** The four pin cities: 6 x 6 seeds 1, 2, 3 and 8, one-way on. */
export const PINNED: readonly NamedCity[] = [1, 2, 3, 8].map((seed) => ({ blocksX: 6, blocksZ: 6, seed, way: "on" as const }));
export const DEFAULT: NamedCity = { blocksX: 6, blocksZ: 6, seed: 1, way: "on" };
/** True when the run asked for every named city: REST_CITIES is "all" (`npm run gate:full`, `npm run report`). Ticket 079. */
export const FULL_CITIES: boolean = process.env["REST_CITIES"] === "all";
/** The cities a whole-city check runs on: [DEFAULT] in `npm test`, ALL_NAMED in a full run. */
export const NAMED: readonly NamedCity[] = FULL_CITIES ? ALL_NAMED : [DEFAULT];
/** NAMED with one-way on only, for the stage 1 to 3 tests that build one-way on: [DEFAULT], or seeds 1 to 10 on. */
export const NAMED_ON: readonly NamedCity[] = FULL_CITIES ? ALL_NAMED.filter((o) => o.way === "on") : [DEFAULT];
/** For a check that depends on how cities vary: PINNED in `npm test`, ALL_NAMED in a full run. */
export const VARIED: readonly NamedCity[] = FULL_CITIES ? ALL_NAMED : PINNED;
export const label = (o: NamedCity): string => `${o.blocksX} x ${o.blocksZ} seed ${o.seed} one-way ${o.way}`;

export type CityProfile = "buildings" | "edge" | "facades" | "ground" | "clean";

/** The exact stage names each profile runs, in order; the last is `until`. */
export const PROFILE_STAGES: Readonly<Record<CityProfile, readonly CityPlanStage[]>> = {
  buildings: ["streets", "land", "mass", "buildings"],
  edge: ["streets", "land", "mass", "edge"],
  facades: ["streets", "land", "mass", "edge", "buildings", "circuit", "facades"],
  ground: ["streets", "land", "mass", "edge", "buildings", "circuit", "facades", "ground"],
  clean: ["streets", "land", "mass", "edge", "buildings", "circuit", "facades", "ground", "traffic"],
};

/** The stage definitions a profile runs, with stage 1 the one-way-off variant when `way` is "off". */
export function stagesOfProfile(profile: CityProfile, way: "on" | "off"): CityStageDef[] {
  return PROFILE_STAGES[profile].map((name) => {
    if (name === "streets" && way === "off") return streetsStageWith(0) as unknown as CityStageDef;
    const def = BUILT_STAGES.find((s) => s.name === name);
    if (def === undefined) throw new Error(`no built stage named ${name}`);
    return def;
  });
}

const keyOf = (o: NamedCity): string => `${o.blocksX}x${o.blocksZ}:${o.seed}:${o.way}`;

/** The same run as `runCity({ blocksX, blocksZ, seed }, undefined, stagesOfProfile(profile, way))`, built at most once per worker per test run, deep-frozen. */
export function sharedCity(o: NamedCity, profile: CityProfile): CityPlanRun {
  return cached(`${profile}:${keyOf(o)}`, () => runCity({ blocksX: o.blocksX, blocksZ: o.blocksZ, seed: o.seed }, undefined, stagesOfProfile(profile, o.way)));
}

/** What an era entry keeps on disk: the era layers, their digests and the outcome. The clean plan is re-attached from the clean entry. */
type EraParts = { readonly ok: true; readonly layers: object; readonly digests: object } | { readonly ok: false; readonly layers: object; readonly digests: object; readonly failure: object };

/** The same run as `runCityEra({ blocksX, blocksZ, seed }, era, ERA_STAGES, <the clean stages>)`, built at most once per worker per test run, deep-frozen. */
export function sharedEra(o: NamedCity, era: "tech" | "holdout" | "ruin"): CityEraRun {
  const k = `${era}:${keyOf(o)}`;
  const known = assembled.get(k);
  if (known !== undefined) return known;
  const made = assembleEra(o, era);
  assembled.set(k, made);
  return made;
}

const assembled = new Map<string, CityEraRun>();
function assembleEra(o: NamedCity, era: "tech" | "holdout" | "ruin"): CityEraRun {
  const clean = sharedCity(o, "clean");
  if (!clean.ok) return deepFreeze({ ok: false, plan: { plan: clean.plan, layers: {}, digests: {} }, failure: clean.failure }) as CityEraRun;
  const parts = cached<EraParts>(`era-${era}:${keyOf(o)}`, () => {
    const r = runEraStages(clean.plan, era, ERA_STAGES);
    return r.ok ? { ok: true, layers: r.plan.layers, digests: r.plan.digests } : { ok: false, layers: r.plan.layers, digests: r.plan.digests, failure: r.failure };
  });
  const plan = { plan: clean.plan, layers: parts.layers, digests: parts.digests } as unknown as CityEraRun["plan"];
  const run = (parts.ok ? { ok: true, plan } : { ok: false, plan, failure: parts.failure }) as CityEraRun;
  return deepFreeze(run);
}
