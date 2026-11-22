/**
 * The stages built so far, and the runner that runs them (ticket 070). This file is the only one that imports every stage; `pipeline/run.ts` imports none, and no stage imports this file or the pipeline's index,
 * so adding a stage is one line here and creates no cycle.
 */

import type { CityEra, CityEraRun, CityPlanOptions, CityPlanRun, CityPlanStage } from "../core";
import { runEraStages, type CityEraStageDef } from "./pipeline/eras";
import { historyStage } from "./history/stage";
import { holdoutStage } from "./holdout/stage";
import { edgeStage } from "./edge/stage";
import { facadesStage } from "./facades/stage";
import { groundStage } from "./ground/stage";
import { trafficStage } from "./traffic/stage";
import { landStage } from "./land/stage";
import { buildingsStage } from "./buildings/stage";
import { massStage } from "./mass/stage";
import { runStages } from "./pipeline/run";
import type { CityStageDef } from "./pipeline/types";
import { clampBlocks } from "./streets/layout";
import { streetsStage } from "./streets/stage";

/** The stages built so far, in `CITY_STAGES` order. Stages not yet built are absent. */
export const BUILT_STAGES: readonly CityStageDef[] = [streetsStage as CityStageDef, landStage as CityStageDef, massStage as CityStageDef, edgeStage as CityStageDef, buildingsStage as CityStageDef, facadesStage as CityStageDef, groundStage as CityStageDef, trafficStage as CityStageDef];

/** `runStages` on `stages` (default `BUILT_STAGES`), with the options normalised: block counts clamped, the seed an integer (default 1). */
export function runCity(options: Partial<CityPlanOptions> = {}, until?: CityPlanStage, stages: readonly CityStageDef[] = BUILT_STAGES): CityPlanRun {
  const norm: CityPlanOptions = {
    blocksX: clampBlocks(options.blocksX),
    blocksZ: clampBlocks(options.blocksZ),
    seed: options.seed !== undefined && Number.isFinite(options.seed) ? Math.trunc(options.seed) : 1,
  };
  return runStages(norm, until, stages);
}

/**
 * The era stages built so far (ticket 073), in `CITY_ERA_STAGES` order. `history` (ticket 073 B) and `holdout` (ticket 073 E2) are registered; each pass adds its line here when it merges. Not part of `BUILT_STAGES`,
 * so a clean run never reaches one (X-7).
 */
export const ERA_STAGES: readonly CityEraStageDef[] = [historyStage as CityEraStageDef, holdoutStage as CityEraStageDef];

/**
 * The plan at an era: the clean stages (`runCity`), then, for an era above "clean", `history` and the passes up to the era's last stage. "clean" runs no era stage. A failed clean stage is returned as the run's
 * failure with an empty era plan.
 */
export function runCityEra(options: Partial<CityPlanOptions> = {}, era: CityEra = "clean", eraStages: readonly CityEraStageDef[] = ERA_STAGES, stages: readonly CityStageDef[] = BUILT_STAGES): CityEraRun {
  const clean = runCity(options, undefined, stages);
  if (!clean.ok) return { ok: false, plan: { plan: clean.plan, layers: {}, digests: {} }, failure: clean.failure };
  return runEraStages(clean.plan, era, eraStages);
}
