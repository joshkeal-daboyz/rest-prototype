import { CITY_STAGES, type CityLayers, type CityPlan, type CityPlanOptions, type CityPlanRun, type CityPlanStage, type CityStageFailure } from "../../core";
import { digestOf } from "./digest";
import { CityRunError, CityStageError } from "./error";
import { stageRand } from "./seeds";
import type { CityStageDef } from "./types";


function deepFreeze<T>(o: T): T {
  if (typeof o === "object" && o !== null && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}

const orderOf = (s: CityPlanStage): number => CITY_STAGES.indexOf(s);

/**
 * The runner imports no stage and no stage imports it (`src/city/stages.ts` holds the built list and `runCity`, which normalises the options), so there is no cycle. Runs the given stages in `CITY_STAGES` order, up to and including `until` (default: the last stage given). Each stage is handed a frozen plan holding only the layers before it; the layer it returns is
 * deep-frozen and its digest recorded (R-1, R-4). A `CityStageError` ends the run as a failure naming the stage; any other throw is a failure whose reason begins "bug:" (a stage that writes into an earlier,
 * frozen layer lands here). Throws `CityRunError` when `until` is a stage that is not in `stages`.
 */
export function runStages(norm: CityPlanOptions, until: CityPlanStage | undefined, stages: readonly CityStageDef[]): CityPlanRun {
  const ordered = [...stages].sort((a, b) => orderOf(a.name) - orderOf(b.name));
  if (until !== undefined && !ordered.some((s) => s.name === until)) {
    throw new CityRunError(`runStages: stage "${until}" is not built (built: ${ordered.map((s) => s.name).join(", ") || "none"})`);
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
