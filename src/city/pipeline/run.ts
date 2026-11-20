import { CITY_STAGES, type CityLayers, type CityPlan, type CityPlanOptions, type CityPlanRun, type CityPlanStage, type CityStageFailure } from "../../core";
import { streetsStage } from "../streets/stage";
import { clampBlocks } from "../streets/layout";
import { digestOf } from "./digest";
import { CityRunError, CityStageError } from "./error";
import { stageRand } from "./seeds";
import type { CityStageDef } from "./types";

/** The stages built so far, in `CITY_STAGES` order. Stages not yet built are absent. */
export const BUILT_STAGES: readonly CityStageDef[] = [streetsStage as CityStageDef];

function deepFreeze<T>(o: T): T {
  if (typeof o === "object" && o !== null && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}

const orderOf = (s: CityPlanStage): number => CITY_STAGES.indexOf(s);

/**
 * Runs the stages in `CITY_STAGES` order, up to and including `until` (default: the last stage given). Each stage is handed a frozen plan holding only the layers before it; the layer it returns is
 * deep-frozen and its digest recorded (R-1, R-4). A `CityStageError` ends the run as a failure naming the stage; any other throw is a failure whose reason begins "bug:" (a stage that writes into an earlier,
 * frozen layer lands here). Throws `CityRunError` when `until` is a stage that is not in `stages`.
 */
export function runCity(options: Partial<CityPlanOptions> = {}, until?: CityPlanStage, stages: readonly CityStageDef[] = BUILT_STAGES): CityPlanRun {
  const norm: CityPlanOptions = {
    blocksX: clampBlocks(options.blocksX),
    blocksZ: clampBlocks(options.blocksZ),
    seed: options.seed !== undefined && Number.isFinite(options.seed) ? Math.trunc(options.seed) : 1,
  };
  const ordered = [...stages].sort((a, b) => orderOf(a.name) - orderOf(b.name));
  if (until !== undefined && !ordered.some((s) => s.name === until)) {
    throw new CityRunError(`runCity: stage "${until}" is not built (built: ${ordered.map((s) => s.name).join(", ") || "none"})`);
  }
  let layers: Partial<CityLayers> = {};
  let digests: Partial<Record<CityPlanStage, string>> = {};
  const snapshot = (): CityPlan => deepFreeze({ options: norm, layers: { ...layers }, digests: { ...digests } });
  for (const stage of ordered) {
    try {
      const layer = stage.run(snapshot(), stageRand(stage.name, norm.seed));
      deepFreeze(layer);
      layers = { ...layers, [stage.name]: layer };
      digests = { ...digests, [stage.name]: digestOf(layer) };
    } catch (e) {
      const failure: CityStageFailure = {
        stage: stage.name,
        seed: norm.seed,
        blocksX: norm.blocksX,
        blocksZ: norm.blocksZ,
        reason: e instanceof CityStageError ? e.reason : `bug: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`,
        cells: e instanceof CityStageError ? e.cells : [],
      };
      return { ok: false, plan: snapshot(), failure };
    }
    if (stage.name === (until ?? ordered[ordered.length - 1]!.name)) break;
  }
  return { ok: true, plan: snapshot() };
}
