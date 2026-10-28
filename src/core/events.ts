/**
 * The events agents hand work through. Names match the GDD's contracts table,
 * plus the map minigame's capacity events. Payloads are plain data.
 */

import type { Part } from "./schema";

/** A lamp whose load counted toward a fuse when it blew, and the line ids from the fuse to it, in order. */
export interface BlownLamp {
  id: string;
  path: readonly string[];
}

export interface GridEvents {
  /** Power, load or readability changed anywhere. Listeners re-read the GridState. */
  "grid:changed": { reason: "breaker" | "switch" | "repair" | "fuse" | "reset" | "undo" | "battery" | "time" };
  /** The player released a battery; it is now a source for its far side. */
  "battery:released": { nodeId: string; charge: number };
  /** A released battery ran out, or the player stopped it. */
  "battery:flat": { nodeId: string; stopped: boolean };
  "breaker:thrown": { nodeId: string; closed: boolean };
  /** `spring: true` when a spring switch returned to its file position on losing power (not a player action). Absent for a throw. */
  "switch:thrown": { nodeId: string; selected: 0 | 1; spring?: true };
  /**
   * A fuse carried more than its rating when power returned and blew (a new blown-fuse fault).
   * `culprit` is the lamp newly powered through this fuse by the action that caused the blow
   * (largest load if several); `path` is the line ids from the fuse to it, in order. The renderer
   * runs the shock along `path` before the fuse pops.
   */
  "fuse:blown": {
    nodeId: string;
    faultId: string;
    load: number;
    rating: number;
    culprit: string | null;
    path: readonly string[];
    /**
     * Every lamp whose load counted toward `load`, in flow discovery order (culprit included):
     * powered by the feed's flow, downstream of this fusebox, not faulted, load > 0. Each `path`
     * runs from the fuse to that lamp. The renderer shocks each (ticket 016). Optional so older
     * payloads still type-check; the grid simulator always fills it.
     */
    lamps?: readonly BlownLamp[];
  };
  "repair:completed": { faultId: string; at: string; part: Part; count: number };
  /**
   * The lit load went over capacity (true) or came back under it (false). Fired only on a map with at least one
   * limited feed. One-feed map: `load`/`capacity` are the feed's, and `over` is absent (the key is not set).
   * Multi-feed map (ticket 015): `over` lists the ids of the feeds over their own capacity, in file order (empty
   * when cleared), and the event also fires when the set of over feeds changes while the section stays browned
   * out (North clears as South goes over); `load` is the total feed-carried load and `capacity` the sum of the limited feeds' capacities,
   * a summary for old readers only. Per-feed numbers are in `GridState.feeds`.
   */
  "grid:brownout": { brownout: boolean; load: number; capacity: number; over?: readonly string[] };
  /** Every target lamp is lit with no brownout. The Relight starts and cannot be interrupted. */
  "job:completed": { puzzleId: string; actions: number };
}

/** Why src/play emitted `play:click`. */
export type PlayClickKind = "refused" | "undo" | "reset";

/** Player input the grid's own events don't voice (ticket 019). Emitted by src/play only. */
export interface PlayEvents {
  /**
   * One per player input that gets only an acknowledging click:
   * - `refused`: a click on an actionable element (breaker, switch, relay, battery, readable fault) that the grid
   *   turned down (throwBreaker/throwSwitch/release returned false, or repairAt was not ok: a relay or spring switch
   *   with no power, an empty battery, a repair without its parts). `target` is the clicked id. Not for clicks on
   *   nothing, and nothing while the Relight runs.
   * - `undo`: play.undo() was called while the job is not complete (whether or not there was a step to undo).
   * - `reset`: play.reset() was called (always).
   * `target` is set only for `refused` (the key is absent otherwise). The audio plays the same quiet click for all three.
   */
  "play:click": { kind: PlayClickKind; target?: string };
}

/** Street scope, later. */
export interface NightEvents {
  "night:started": { night: number; minutes: number };
  "night:paused": { paused: boolean };
  "player:shocked": { count: number; fatal: boolean };
  "night:dawn": { night: number; repairsKept: readonly string[] };
  "night:death": { night: number; repairsUndone: readonly string[] };
}

export type Events = GridEvents & PlayEvents & NightEvents;
export type EventName = keyof Events;

export type Listener<K extends EventName> = (payload: Events[K]) => void;

/** A small typed emitter. Pure; safe to use from src/grid. */
export class EventBus {
  private readonly listeners = new Map<EventName, Set<(p: unknown) => void>>();

  on<K extends EventName>(name: K, fn: Listener<K>): () => void {
    let set = this.listeners.get(name);
    if (!set) {
      set = new Set();
      this.listeners.set(name, set);
    }
    set.add(fn as (p: unknown) => void);
    return () => set?.delete(fn as (p: unknown) => void);
  }

  emit<K extends EventName>(name: K, payload: Events[K]): void {
    const set = this.listeners.get(name);
    if (!set) return;
    for (const fn of [...set]) fn(payload);
  }
}
