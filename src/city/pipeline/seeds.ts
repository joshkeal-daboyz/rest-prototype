import type { CityPlanStage } from "../../core";
import { stableHash } from "./hash";

export type StageRand = (...key: readonly (string | number)[]) => number;

/**
 * The key prefix of each stage's hash (R-3): "<stage>:<seed>:<key>". Stage 1 alone keeps today's tile-city prefix, "tile", so the default city stays exactly as it is.
 */
const PREFIX: Partial<Record<CityPlanStage, string>> = { streets: "tile" };

/** A stage's own source of randomness: `rand(...key)` is `stableHash("<stage>:<seed>:<key joined by :>")`. No state is kept between calls. */
export function stageRand(stage: CityPlanStage, seed: number): StageRand {
  const prefix = PREFIX[stage] ?? stage;
  return (...key) => stableHash(`${prefix}:${seed}:${key.join(":")}`);
}
