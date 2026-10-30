/** The session log: every action in order, exportable as JSON. Pure. */

export type LogKind = "throw-breaker" | "throw-switch" | "repair" | "repair-refused" | "battery-release" | "battery-stop" | "battery-flat" | "undo" | "reset";

export interface LogEntry {
  /** 1, 2, 3, ... never reused and never reset (a reset is itself an entry). */
  step: number;
  /** Wall-clock ms since the epoch. */
  time: number;
  /** Game seconds since the map opened (the play tick accumulator); present on battery entries. */
  gameTime?: number;
  kind: LogKind;
  /** Node or line id acted on (absent for undo/reset). */
  target?: string;
  /** Whether the grid accepted it. */
  ok: boolean;
  /** Why it was refused: the grid's reason. */
  reason?: string;
  needs?: { part: string; count: number; have: number };
  /** battery-flat: true if the player stopped it early, false if it ran out. */
  stopped?: boolean;
  /** Fault id repaired. */
  fault?: string;
}

export interface SessionLog {
  add(entry: Omit<LogEntry, "step" | "time">): LogEntry;
  entries(): readonly LogEntry[];
  /** The most recent entry, or undefined on an empty log. O(1). */
  lastEntry(): LogEntry | undefined;
  toJSON(puzzleId: string): string;
}

export function createSessionLog(now: () => number = Date.now): SessionLog {
  const list: LogEntry[] = [];
  let step = 0;
  return {
    add(entry) {
      const e: LogEntry = { step: ++step, time: now(), ...entry };
      list.push(e);
      return e;
    },
    entries: () => list,
    lastEntry: () => list[list.length - 1],
    toJSON: (puzzleId) => JSON.stringify({ puzzle: puzzleId, entries: list }, null, 2),
  };
}
