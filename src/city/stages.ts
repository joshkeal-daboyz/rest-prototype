/**
 * The stages built so far, and the runner that runs them (ticket 070). This file is the only one that imports every stage; `pipeline/run.ts` imports none, and no stage imports this file or the pipeline's index,
 * so adding a stage is one line here and creates no cycle.
 */

import type { CityPlanOptions, CityPlanRun, CityPlanStage } from "../core";
import { edgeStage } from "./edge/stage";
import { facadesStage } from "./facades/stage";
import { landStage } from "./land/stage";
import { buildingsStage } from "./buildings/stage";
import { massStage } from "./mass/stage";
import { runStages } from "./pipeline/run";
import type { CityStageDef } from "./pipeline/types";
import { clampBlocks } from "./streets/layout";
import { streetsStage } from "./streets/stage";

/** The stages built so far, in `CITY_STAGES` order. Stages not yet built are absent. */
export const BUILT_STAGES: readonly CityStageDef[] = [streetsStage as CityStageDef, landStage as CityStageDef, massStage as CityStageDef, edgeStage as CityStageDef, buildingsStage as CityStageDef, facadesStage as CityStageDef];

/** `runStages` on `stages` (default `BUILT_STAGES`), with the options normalised: block counts clamped, the seed an integer (default 1). */
export function runCity(options: Partial<CityPlanOptions> = {}, until?: CityPlanStage, stages: readonly CityStageDef[] = BUILT_STAGES): CityPlanRun {
  const norm: CityPlanOptions = {
    blocksX: clampBlocks(options.blocksX),
    blocksZ: clampBlocks(options.blocksZ),
    seed: options.seed !== undefined && Number.isFinite(options.seed) ? Math.trunc(options.seed) : 1,
  };
  return runStages(norm, until, stages);
}
