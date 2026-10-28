/**
 * Pure presentation logic for the overlay: which prompt or banner to show for a state, and the
 * text for the parts, capacity and target readouts. No DOM, no game rules: every number and
 * boolean arrives from src/grid or src/play.
 */

import type { Part } from "../core";

export const WIN_TEXT = "Every target is lit, and the circuit holds.";

/** The prompt to show, or null. Nothing is offered once the Relight has started (it cannot be interrupted). */
export function promptToShow(view: { prompt: string | null; relightT: number | null }): string | null {
  if (view.relightT !== null) return null;
  return view.prompt;
}

/** The win banner shows whenever the grid reports the job complete; otherwise no banner. */
export function bannerText(state: { complete: boolean }): string | null {
  return state.complete ? WIN_TEXT : null;
}

const PART_ORDER: readonly Part[] = ["bulb", "fuse", "wire"];
const PART_WORDS: Record<Part, { one: string; many: string }> = {
  bulb: { one: "bulb", many: "bulbs" },
  fuse: { one: "fuse", many: "fuses" },
  wire: { one: "wire", many: "wires" },
};

export function partCounts(parts: readonly Part[]): Record<Part, number> {
  const counts: Record<Part, number> = { bulb: 0, fuse: 0, wire: 0 };
  for (const p of parts) counts[p] += 1;
  return counts;
}

/** "On hand: 1 bulb, 0 fuses, 2 wires". All three kinds always appear, so an empty kind reads as 0. */
export function partsSummary(parts: readonly Part[]): string {
  const counts = partCounts(parts);
  const items = PART_ORDER.map((p) => {
    const n = counts[p];
    return `${n} ${n === 1 ? PART_WORDS[p].one : PART_WORDS[p].many}`;
  });
  return `On hand: ${items.join(", ")}`;
}

/** "Load 3 / 4", with "Brownout" added as text (never colour alone) when the section is browned out. */
export function capacityReadout(load: number, capacity: number | null, brownout: boolean): string {
  const base = capacity === null ? `Load ${load} (no limit)` : `Load ${load} / ${capacity}`;
  return brownout ? `${base} · Brownout` : base;
}

export interface TargetRow {
  id: string;
  lit: boolean;
  text: string;
}

/** One row per target lamp. A lamp counts as lit only when it is lit and the section is not browned out. */
export function targetRows(targets: readonly string[], lit: ReadonlySet<string>, brownout: boolean): TargetRow[] {
  return targets.map((id) => {
    const on = lit.has(id) && !brownout;
    return { id, lit: on, text: `${id.replace(/_/g, " ")}: ${on ? "lit" : "dark"}` };
  });
}

/** Map picker label; locked maps are marked in words. */
export function mapLabel(map: { name: string; locked: boolean }): string {
  return map.locked ? `${map.name} (locked)` : map.name;
}
