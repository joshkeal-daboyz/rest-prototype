/**
 * The era runner's pieces (ticket 073, section C1): the era stage's shape, the run of the era stages over a clean plan, and the helpers a pass calls (the plan at the era before its own, and the two
 * readability checks on its own era). Imports `src/core/` and this folder only; `src/city/stages.ts` holds the era list and `runCityEra`.
 */

import {
  CITY_ERA_LAST,
  CITY_ERA_STAGES,
  type CityDigest,
  type CityEra,
  type CityEraLayers,
  type CityEraPicture,
  type CityEraPlan,
  type CityEraRun,
  type CityEraStage,
  type CityEraStageFailure,
  type CityPassStage,
  type CityPlan,
  type CityResolvedPlan,
} from "../../core";
import { digestOf } from "./digest";
import { CityStageError } from "./error";
import { CityResolveError, resolvePlan } from "./resolve";
import { t1Failures, t2Failures, type ReadableOptions } from "./readable";
import { deepFreeze } from "./run";
import { stageRand, type StageRand } from "./seeds";

/** An era stage: a pure function from the plan so far (the clean plan and the era layers before it) to its own layer, and the flat picture of that layer. */
export interface CityEraStageDef<S extends CityEraStage = CityEraStage> {
  readonly name: S;
  run(plan: CityEraPlan, rand: StageRand): CityEraLayers[S];
  picture(plan: CityEraPlan): CityEraPicture;
}

/**
 * Runs `eraStages` over the clean plan, in `CITY_ERA_STAGES` order, up to and including the era's last stage (`CITY_ERA_LAST`). "clean" runs none (X-7). A stage that is not in the list is skipped, so an era
 * run works while a pass is unbuilt. Each stage is handed a frozen `CityEraPlan` and its layer is deep-frozen with its digest recorded (R-1, R-4). A `CityStageError` ends the run as a failure naming the stage;
 * any other throw is a failure whose reason begins "bug:".
 */
export function runEraStages(clean: CityPlan, era: CityEra, eraStages: readonly CityEraStageDef[]): CityEraRun {
  let layers: Partial<CityEraLayers> = {};
  let digests: Partial<Record<CityEraStage, CityDigest>> = {};
  const snapshot = (): CityEraPlan => deepFreezeShallow({ plan: clean, layers: { ...layers }, digests: { ...digests } });
  if (era === "clean") return { ok: true, plan: snapshot() };
  const lastAt = CITY_ERA_STAGES.indexOf(CITY_ERA_LAST[era] as CityEraStage);
  const ordered = eraStages.filter((s) => CITY_ERA_STAGES.indexOf(s.name) <= lastAt).sort((a, b) => CITY_ERA_STAGES.indexOf(a.name) - CITY_ERA_STAGES.indexOf(b.name));
  for (const stage of ordered) {
    try {
      const layer = deepFreeze(stage.run(snapshot(), stageRand(stage.name, clean.options.seed)));
      layers = { ...layers, [stage.name]: layer };
      digests = { ...digests, [stage.name]: digestOf(layer) };
    } catch (e) {
      const failure: CityEraStageFailure = {
        stage: stage.name,
        seed: clean.options.seed,
        blocksX: clean.options.blocksX,
        blocksZ: clean.options.blocksZ,
        reason: e instanceof CityStageError ? e.reason : `bug: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`,
        cells: e instanceof CityStageError ? e.cells : [],
      };
      return { ok: false, plan: snapshot(), failure };
    }
  }
  return { ok: true, plan: snapshot() };
}

/** Freezes the era plan's own containers; the clean plan inside is already frozen and each era layer is deep-frozen when it is written. */
function deepFreezeShallow(p: CityEraPlan): CityEraPlan {
  Object.freeze(p.layers);
  Object.freeze(p.digests);
  return Object.freeze(p);
}

/** The era each pass's stage reads: the plan as it stands before the pass. */
export const ERA_BEFORE: Readonly<Record<CityPassStage, CityEra>> = { tech: "clean", holdout: "tech", ruin: "holdout" };

/** The plan at the era before `stage` (C1, criterion 5): what the pass builds on. */
export function resolveBefore(plan: CityEraPlan, stage: CityPassStage): CityResolvedPlan {
  return resolve(plan, ERA_BEFORE[stage], stage);
}

function resolve(plan: CityEraPlan, era: CityEra, stage: CityPassStage): CityResolvedPlan {
  try {
    return resolvePlan(plan, era);
  } catch (e) {
    if (e instanceof CityResolveError) throw new CityStageError(`X-2: ${stage} cannot resolve at ${era}: ${e.message}`);
    throw e;
  }
}

/**
 * A pass calls this on the layer it is about to return (C1, criterion 5): resolves the plan with that layer at its own era, runs `t1Failures` and `t2Failures` on it, and throws `CityStageError` naming
 * the rule on a failure (X-4, R-2). A change that cannot apply throws it too (X-2). Returns the resolved plan.
 */
export function assertEraReadable<S extends CityPassStage>(plan: CityEraPlan, stage: S, layer: CityEraLayers[S], options: ReadableOptions = {}): CityResolvedPlan {
  const own: CityEraPlan = { plan: plan.plan, layers: { ...plan.layers, [stage]: layer }, digests: plan.digests };
  const resolved = resolve(own, stage, stage);
  const t1 = t1Failures(resolved, options);
  if (t1.length > 0) throw new CityStageError(`T-1: ${t1.length} circuit points covered; first: ${t1[0]!.piece} ${t1[0]!.reason}`);
  const t2 = t2Failures(resolved, options);
  if (t2.length > 0) throw new CityStageError(`T-2: ${t2.length} poles sealed in; first: ${t2[0]!.reason}`);
  return resolved;
}

