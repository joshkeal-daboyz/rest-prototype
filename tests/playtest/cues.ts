/**
 * The audio path, as the trace sees it. Two things are copied here because the game does not export them
 * (ticket 036, open question 2): main.ts's relightCues mapping, and the engine's SUBSCRIBED event list.
 * If either changes in the game, change it here too, or the trace stops showing that difference.
 */
import type { EventName, Puzzle } from "../../src/core";
import type { GridState } from "../../src/grid";
import { planRelight, type RelightPlan } from "../../src/render";
import { CueTracker, relightCues } from "../../src/audio/cues";

/** Copy of SUBSCRIBED in src/audio/engine.ts: the events the sound engine listens to. */
export const SUBSCRIBED: readonly EventName[] = [
  "switch:thrown",
  "breaker:thrown",
  "fuse:blown",
  "repair:completed",
  "grid:brownout",
  "battery:released",
  "battery:flat",
  "play:click",
];

export const at3 = (t: number): string => (Number.isFinite(t) ? t.toFixed(3) : String(t));

/** Cue names and times for the events a step produced, through one CueTracker per map (it remembers brownout). */
export class StepCues {
  private readonly tracker = new CueTracker();

  forEvents(events: readonly { name: EventName; payload: unknown }[]): string[] {
    const out: string[] = [];
    for (const e of events) {
      if (!SUBSCRIBED.includes(e.name)) continue;
      for (const c of this.tracker.cues(e.name, e.payload as never, 0)) out.push(`${c.name}@${at3(c.at)}`);
    }
    return out;
  }
}

/** Copy of relightCues in src/main.ts (the three-line mapping): each lit lamp's ignition time, and the cascade's length. */
export function relightTiming(puzzle: Puzzle, state: GridState): { plan: RelightPlan; igniteAt: number[]; duration: number } {
  const plan = planRelight(puzzle, state);
  const nodeIndex = new Map(puzzle.nodes.map((n, i) => [n.id, i] as const));
  const igniteAt = plan.lampOrder.map((id) => plan.nodeArrive[nodeIndex.get(id) ?? 0] ?? 0);
  return { plan, igniteAt, duration: plan.duration };
}

export function relightCueList(igniteAt: readonly number[], duration: number): string[] {
  return relightCues(igniteAt, duration).map((c) => `${c.name}@${at3(c.at)}`);
}
