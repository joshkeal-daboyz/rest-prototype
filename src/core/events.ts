/**
 * The events agents hand work through. Names match the GDD's contracts table,
 * plus the panel minigame's probe and fuse events. Payloads are plain data.
 */

import type { Part } from "./schema";

export interface GridEvents {
  /** Power or readability changed anywhere. Listeners re-read the GridState. */
  "grid:changed": { reason: "probe" | "breaker" | "switch" | "repair" | "fuse" | "night" | "load" };
  /** The player probed a node or line and learned whether it is live. */
  "probe:read": { at: string; live: boolean };
  "breaker:thrown": { nodeId: string; closed: boolean };
  "switch:thrown": { nodeId: string; selected: 0 | 1 };
  /** A fuse carried more than its rating when power returned and blew (a new blown-fuse fault). */
  "fuse:blown": { nodeId: string; faultId: string; load: number; rating: number };
  "repair:started": { faultId: string; at: string; live: boolean };
  "repair:completed": { faultId: string; at: string; part: Part };
  "repair:cancelled": { faultId: string; at: string; reason: "released" | "paused" | "shock" };
  /** Every load is lit with the breaker on. The Relight starts and cannot be interrupted. */
  "job:completed": { puzzleId: string; nightsTaken: number };
}

export interface NightEvents {
  "night:started": { night: number; minutes: number };
  "night:paused": { paused: boolean };
  /** A miss on a live repair. `count` is this night's total. */
  "player:shocked": { count: number; fatal: boolean };
  /** Dawn: the night is lost, repairs stay. */
  "night:dawn": { night: number; repairsKept: readonly string[] };
  /** Death: the night is lost, this night's repairs are rolled back. */
  "night:death": { night: number; repairsUndone: readonly string[] };
}

export type Events = GridEvents & NightEvents;
export type EventName = keyof Events;

export type Listener<K extends EventName> = (payload: Events[K]) => void;

/** A small typed emitter. Pure; safe to use from src/grid and src/night. */
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
