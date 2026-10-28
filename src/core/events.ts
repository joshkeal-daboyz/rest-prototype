/**
 * The events agents hand work through. Names match the GDD's contracts table,
 * plus the map minigame's capacity events. Payloads are plain data.
 */

import type { Part } from "./schema";

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
  "fuse:blown": { nodeId: string; faultId: string; load: number; rating: number; culprit: string | null; path: readonly string[] };
  "repair:completed": { faultId: string; at: string; part: Part; count: number };
  /** The lit load went over capacity (true) or came back under it (false). */
  "grid:brownout": { brownout: boolean; load: number; capacity: number };
  /** Every target lamp is lit with no brownout. The Relight starts and cannot be interrupted. */
  "job:completed": { puzzleId: string; actions: number };
}

/** Street scope, later. */
export interface NightEvents {
  "night:started": { night: number; minutes: number };
  "night:paused": { paused: boolean };
  "player:shocked": { count: number; fatal: boolean };
  "night:dawn": { night: number; repairsKept: readonly string[] };
  "night:death": { night: number; repairsUndone: readonly string[] };
}

export type Events = GridEvents & NightEvents;
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
