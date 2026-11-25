/**
 * The Relight in 3D, as pure data (ticket 037 C3): the same schedule as the 2D view, from the same planner. No three, no DOM.
 * The line fraction and the lamp ignition test live here (the 2D renderer they once mirrored is gone, ticket 081 X1c).
 */

import type { Puzzle } from "../core";
import type { GridState } from "../grid";
import { easeGlow, glowTarget } from "./relightplan";
import { clamp01 } from "./motion";
import { planRelight, type RelightPlan } from "./relightplan";

export interface RelightClock {
  /**
   * The plan while a Relight runs, else null. The first defined `relT` plans from that state and the plan is kept
   * (a state change mid-Relight does not re-plan) until `relT` is undefined again. Null once `relT` reaches its duration.
   */
  update(state: GridState, relT: number | undefined): RelightPlan | null;
}

export function createRelightClock(puzzle: Puzzle): RelightClock {
  let plan: RelightPlan | null = null;
  return {
    update(state, relT) {
      if (relT === undefined) {
        plan = null;
        return null;
      }
      if (!plan) plan = planRelight(puzzle, state);
      return relT < plan.duration ? plan : null;
    },
  };
}

/** How much of the line (by length, from its flow-from end) is lit at `relT`: 0..1. A line that is not powered stays 0. */
export function lineFraction(plan: RelightPlan, lineIndex: number, relT: number): number {
  const s = plan.lineStart[lineIndex]!;
  const e = plan.lineEnd[lineIndex]!;
  return e > s ? clamp01((relT - s) / (e - s)) : relT >= e ? 1 : 0;
}

/** Whether power has reached the node. */
export function nodeArrived(plan: RelightPlan, nodeIndex: number, relT: number): boolean {
  return relT >= plan.nodeArrive[nodeIndex]!;
}

export interface LampIgnition {
  on: boolean;
  /** Seconds since ignition; -1 when the lamp is not on. */
  flareAge: number;
}

/** A lamp is dark until it is lit and the power has reached it; then it is fully lit and flares for FLARE_SECONDS. Writes into `out` if given. */
export function lampIgnition(plan: RelightPlan, state: GridState, lampId: string, nodeIndex: number, relT: number, out: LampIgnition = { on: false, flareAge: -1 }): LampIgnition {
  const arrive = plan.nodeArrive[nodeIndex]!;
  if (state.lit.has(lampId) && relT >= arrive) {
    out.on = true;
    out.flareAge = relT - arrive;
  } else {
    out.on = false;
    out.flareAge = -1;
  }
  return out;
}

const relScratch = { t: 0, arriveAt: 0 };

/**
 * One frame of a place's glow: eases toward 2D's target (0 in a brownout and before the lamp's arrival, else 1).
 * `dt < 0` (the first frame) snaps. `plan` is null in ordinary play.
 */
export function placeGlowStep(current: number, lampId: string, state: GridState, plan: RelightPlan | null, nodeIndex: number, relT: number, dt: number): number {
  let rel: typeof relScratch | null = null;
  if (plan) {
    relScratch.t = relT;
    relScratch.arriveAt = plan.nodeArrive[nodeIndex]!;
    rel = relScratch;
  }
  const target = glowTarget(lampId, state, rel);
  return dt < 0 ? target : easeGlow(current, target, dt);
}
