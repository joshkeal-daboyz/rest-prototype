import type { Fault, Part } from "../core";

export interface GridState {
  /** Node and line ids carrying current (including the node or line where it stops at a fault or open breaker). */
  powered: ReadonlySet<string>;
  /** Powered line id -> node id the current enters it from. */
  flowFrom: ReadonlyMap<string, string>;
  /** Lamps with power and no fault (even in brownout; see `brownout`). */
  lit: ReadonlySet<string>;
  /** Fault ids that current reaches. */
  readableFaults: ReadonlySet<string>;
  /** Line ids with a readable damaged-cable. */
  sparking: ReadonlySet<string>;
  /** Per fusebox: total load of lamps lit by the feed's own flow downstream of it (the number the blow check compares to `rating`); 0 when unpowered or blown. */
  fuseLoad: ReadonlyMap<string, number>;
  faults: readonly Fault[];
  breakers: ReadonlyMap<string, boolean>;
  switches: ReadonlyMap<string, 0 | 1>;
  /** Per battery node: charge held (seconds), capacity, released (a source for its far side), charging now. */
  batteries: ReadonlyMap<string, { charge: number; capacity: number; released: boolean; charging: boolean }>;
  parts: readonly Part[];
  targets: readonly string[];
  load: number;
  capacity: number | null;
  brownout: boolean;
  complete: boolean;
  actions: number;
}

export type RepairResult =
  | { ok: true; fault: Fault }
  | { ok: false; reason: "no-fault" | "unreadable" | "needs-parts"; needs?: { part: Part; count: number; have: number } };

export interface Grid {
  state(): GridState;
  throwBreaker(nodeId: string): boolean;
  throwSwitch(nodeId: string): boolean;
  /** Release a battery (a source for its far side while it has charge), or stop a released one early. False if not a battery or empty. */
  release(nodeId: string): boolean;
  /** The only time input. Charges and drains batteries; changes nothing on a map without one. */
  advance(dtSeconds: number): void;
  repairAt(at: string): RepairResult;
  undo(): boolean;
  reset(): void;
}
