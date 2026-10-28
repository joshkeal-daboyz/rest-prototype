/**
 * Pure presentation logic for the overlay: which prompt or banner to show for a state, and the
 * text for the parts, capacity and target readouts. No DOM, no game rules: every number and
 * boolean arrives from src/grid or src/play.
 */

import type { Part } from "../core";
import type { LogEntry } from "../play";

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

/**
 * Where to put a box of `box` size beside the pointer, relative to the overlay `bounds`.
 * The box sits `offset` to the right and below the pointer, and is pulled back so it stays
 * `margin` inside the bounds. Coordinates are in the same space as `pointer` (both viewport or both local).
 */
export function promptPosition(
  pointer: { x: number; y: number },
  bounds: { width: number; height: number },
  box: { width: number; height: number },
  offset = 16,
  margin = 8,
): { left: number; top: number } {
  const maxLeft = Math.max(margin, bounds.width - box.width - margin);
  const maxTop = Math.max(margin, bounds.height - box.height - margin);
  return {
    left: Math.min(Math.max(margin, pointer.x + offset), maxLeft),
    top: Math.min(Math.max(margin, pointer.y + offset), maxTop),
  };
}

/**
 * "Battery: 4 s" for the lowest charge among released batteries, rounded up to whole seconds.
 * Null when no battery is released, so the countdown is hidden.
 */
export function batteryCountdown(state: {
  batteries: ReadonlyMap<string, { charge: number; released: boolean }>;
}): string | null {
  let lowest: number | null = null;
  for (const battery of state.batteries.values()) {
    if (!battery.released) continue;
    if (lowest === null || battery.charge < lowest) lowest = battery.charge;
  }
  return lowest === null ? null : `Battery: ${Math.ceil(lowest)} s`;
}

/** Map picker label; locked maps are marked in words. */
export function mapLabel(map: { name: string; locked: boolean }): string {
  return map.locked ? `${map.name} (locked)` : map.name;
}

// ---- event notices: short text lines near the top of the map, each fading after a few seconds ----

/** How long a notice stays on screen, and how much of that is the fade out. */
export const NOTICE_LIFETIME_MS = 4000;
export const NOTICE_FADE_MS = 1000;
/** Most notices shown at once; the oldest is dropped first. */
export const NOTICE_MAX = 4;

/** The events the notice strip reacts to, as plain data. */
export type NoticeEvent =
  | { kind: "fuse:blown"; load: number; rating: number }
  | { kind: "grid:brownout"; brownout: boolean; load: number; capacity: number }
  | { kind: "battery:flat"; stopped: boolean }
  /** A click that the play log recorded as a refused throw of `entry`; `relays` are the relay switch ids of the map. */
  | { kind: "relay-refused"; entry: LogEntry; relays: ReadonlySet<string> };

/** The notice text for an event, or null when it should not show one. Text, never colour alone. */
export function noticeFor(event: NoticeEvent): string | null {
  switch (event.kind) {
    case "fuse:blown":
      return `Fuse blew: ${event.load} load through a ≤${event.rating} fuse`;
    case "grid:brownout":
      return event.brownout ? `Brownout: load ${event.load} over capacity ${event.capacity}` : null;
    case "battery:flat":
      return event.stopped ? null : "Battery flat";
    case "relay-refused": {
      const { entry, relays } = event;
      const refused = entry.kind === "throw-switch" && !entry.ok && entry.target !== undefined && relays.has(entry.target);
      return refused ? "No power at that relay" : null;
    }
  }
}

/** Opacity of a notice `ageMs` old: full until the fade starts, then linear down to 0 at the lifetime. */
export function noticeOpacity(ageMs: number): number {
  if (ageMs >= NOTICE_LIFETIME_MS) return 0;
  const fadeStart = NOTICE_LIFETIME_MS - NOTICE_FADE_MS;
  if (ageMs <= fadeStart) return 1;
  return (NOTICE_LIFETIME_MS - ageMs) / NOTICE_FADE_MS;
}

/** The notices still on screen at `nowMs`: not past their lifetime, and at most `max` (the newest). Keeps input order. */
export function liveNotices<T extends { born: number }>(notices: readonly T[], nowMs: number, max = NOTICE_MAX): T[] {
  const alive = notices.filter((n) => nowMs - n.born < NOTICE_LIFETIME_MS);
  return alive.length > max ? alive.slice(alive.length - max) : alive;
}
