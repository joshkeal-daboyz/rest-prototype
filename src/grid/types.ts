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
  faults: readonly Fault[];
  breakers: ReadonlyMap<string, boolean>;
  switches: ReadonlyMap<string, 0 | 1>;
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
  repairAt(at: string): RepairResult;
  undo(): boolean;
  reset(): void;
}
