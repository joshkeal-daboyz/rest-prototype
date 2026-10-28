// TEMPORARY: types only, from tickets/002-grid-map.md. The real src/grid/ replaces this file at merge.
import type { Fault, Part } from "../core";

export interface GridState {
  powered: ReadonlySet<string>;
  flowFrom: ReadonlyMap<string, string>;
  lit: ReadonlySet<string>;
  readableFaults: ReadonlySet<string>;
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
