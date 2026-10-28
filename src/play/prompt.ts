/**
 * Pure: what the pointer is over, and what a click would do. No DOM.
 * The prompt strings are the ones ticket 004 lists; the UI shows them verbatim.
 */
import { FAULT_RULES, type Puzzle } from "../core";
import type { GridState } from "../grid";

export type Intent =
  | { kind: "breaker"; id: string }
  | { kind: "switch"; id: string }
  | { kind: "battery"; id: string }
  | { kind: "repair"; id: string }
  | null;

/** What a click on `id` would try. Unreadable faults and a finished job give null. */
export function intentFor(puzzle: Puzzle, state: GridState, id: string | null): Intent {
  if (id === null || state.complete) return null;
  const node = puzzle.nodes.find((n) => n.id === id);
  if (node?.type === "breaker") return { kind: "breaker", id };
  if (node?.type === "switch") return { kind: "switch", id };
  if (node?.type === "battery") return { kind: "battery", id };
  const fault = state.faults.find((f) => f.at === id);
  if (fault && state.readableFaults.has(fault.id)) return { kind: "repair", id };
  return null;
}

export function needsText(part: string, count: number): string {
  return `Needs: ${part} × ${count}`;
}

/** The prompt for the element under the pointer, or null. */
export function promptFor(puzzle: Puzzle, state: GridState, id: string | null): string | null {
  const intent = intentFor(puzzle, state, id);
  if (!intent) return null;
  if (intent.kind === "breaker") return "Throw breaker";
  if (intent.kind === "switch") {
    const n = puzzle.nodes.find((x) => x.id === intent.id);
    return n?.type === "switch" && n.relay && !state.powered.has(intent.id) ? "No power — relay stuck" : "Throw switch";
  }
  if (intent.kind === "battery") {
    const b = state.batteries.get(intent.id);
    if (!b) return null;
    return b.released
      ? `Running: ${Math.ceil(b.charge)} s left — Stop`
      : `Charge: ${Math.floor(b.charge)} / ${b.capacity} — Release`;
  }
  const fault = state.faults.find((f) => f.at === intent.id);
  if (!fault) return null;
  const rule = FAULT_RULES[fault.kind];
  const have = state.parts.filter((p) => p === rule.part).length;
  return have < rule.count ? needsText(rule.part, rule.count) : `Repair (${rule.part})`;
}
