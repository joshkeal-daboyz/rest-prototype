import type { CityLayers, CityPicture, CityPlan, CityPlanStage } from "../../core";
import type { StageRand } from "./seeds";

/** One stage: a pure function from the plan so far to its own layer, and the flat picture of that layer. */
export interface CityStageDef<S extends CityPlanStage = CityPlanStage> {
  readonly name: S;
  run(plan: CityPlan, rand: StageRand): CityLayers[S];
  picture(plan: CityPlan): CityPicture;
}
