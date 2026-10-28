/**
 * Pure presentation logic for the overlay: which prompt or banner to show for a state, and the
 * text for the parts, capacity and target readouts. No DOM, no game rules: every number and
 * boolean arrives from src/grid or src/play.
 */

import {
  AUDIO_PREFS_KEY,
  carryingText,
  DEFAULT_AUDIO_PREFS,
  fuseLabel,
  namedPowersourceLabel,
  powersourceLabel,
  usingText,
  type AudioPrefs,
  type FeedInfo,
  type FeedReadout,
  type Part,
} from "../core";
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

/**
 * "Lv4 Powersource — using 3 of 4", or "Powersource — using 3 (no limit)" when capacity is null.
 * The capacity is a fixed level; the load is a live total, so it reads as a plain number.
 * "Brownout" is added as text (never colour alone) when the section is browned out.
 */
export function capacityReadout(load: number, capacity: number | null, brownout: boolean): string {
  const base = `${powersourceLabel(capacity)} — ${usingText(load, capacity)}`;
  return brownout ? `${base} · Brownout` : base;
}

/** One HUD readout row: its text, and whether it carries the alarm (a red border and colour, with the word Brownout). */
export interface CapacityRow {
  text: string;
  alarm: boolean;
}

/**
 * The capacity readout rows. A one-feed map (or no feed list) gets the single 014 row from `capacityReadout`,
 * unchanged. A multi-feed map gets one row per feed in file order: `North · Lv4 Powersource — using 3 of 4`,
 * with ` · Brownout` on the rows that are over. Each row's alarm is its own feed's `over`.
 */
export function capacityRows(
  state: { load: number; capacity: number | null; brownout: boolean; feeds: ReadonlyMap<string, FeedReadout> },
  feeds: readonly FeedInfo[],
): CapacityRow[] {
  if (feeds.length < 2) return [{ text: capacityReadout(state.load, state.capacity, state.brownout), alarm: state.brownout }];
  const rows: CapacityRow[] = [];
  for (const feed of feeds) {
    const readout = state.feeds.get(feed.id);
    if (!readout) continue;
    const base = `${namedPowersourceLabel(feed.name, readout.capacity)} — ${usingText(readout.load, readout.capacity)}`;
    rows.push({ text: readout.over ? `${base} · Brownout` : base, alarm: readout.over });
  }
  return rows;
}

/**
 * The brownout notices on a multi-feed map: one per over feed, in file order, e.g.
 * `Brownout: North · Lv4 Powersource using 5 of 4`. Empty when the section is not browned out.
 */
export function brownoutNotices(
  brownout: boolean,
  over: readonly string[],
  feeds: readonly FeedInfo[],
  readouts: ReadonlyMap<string, FeedReadout>,
): string[] {
  if (!brownout) return [];
  const notices: string[] = [];
  for (const feed of feeds) {
    if (!over.includes(feed.id)) continue;
    const readout = readouts.get(feed.id);
    if (!readout) continue;
    notices.push(`Brownout: ${namedPowersourceLabel(feed.name, readout.capacity)} ${usingText(readout.load, readout.capacity)}`);
  }
  return notices;
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
      return `${fuseLabel(event.rating)} blew: ${carryingText(event.load, undefined)}`;
    case "grid:brownout":
      return event.brownout ? `Brownout: ${powersourceLabel(event.capacity)} ${usingText(event.load, event.capacity)}` : null;
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

// ---- sound controls (ticket 019 B) ----

/** The slice of localStorage the prefs use. Any Storage fits; tests pass a plain object. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** A finite volume clamped to 0..1. NaN (not a number at all) gives the default volume. */
export function clampVolume(volume: number): number {
  if (Number.isNaN(volume)) return DEFAULT_AUDIO_PREFS.volume;
  return Math.min(1, Math.max(0, volume));
}

/**
 * Parses the raw localStorage string under AUDIO_PREFS_KEY. Missing, junk JSON, a wrong shape, a
 * non-boolean `muted` or a volume outside 0..1 all give DEFAULT_AUDIO_PREFS. Never throws.
 */
export function parseAudioPrefs(raw: string | null | undefined): AudioPrefs {
  const fallback: AudioPrefs = { muted: DEFAULT_AUDIO_PREFS.muted, volume: DEFAULT_AUDIO_PREFS.volume };
  if (typeof raw !== "string") return fallback;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return fallback;
  }
  if (typeof data !== "object" || data === null) return fallback;
  const { muted, volume } = data as { muted?: unknown; volume?: unknown };
  if (typeof muted !== "boolean") return fallback;
  if (typeof volume !== "number" || !Number.isFinite(volume) || volume < 0 || volume > 1) return fallback;
  return { muted, volume };
}

/** The string written under AUDIO_PREFS_KEY. */
export function serializeAudioPrefs(prefs: AudioPrefs): string {
  return JSON.stringify({ muted: prefs.muted, volume: prefs.volume });
}

/** Reads the saved prefs. No storage, or storage that throws, gives the defaults. */
export function readAudioPrefs(storage: StorageLike | null | undefined): AudioPrefs {
  if (!storage) return parseAudioPrefs(null);
  try {
    return parseAudioPrefs(storage.getItem(AUDIO_PREFS_KEY));
  } catch {
    return parseAudioPrefs(null);
  }
}

/** Writes the prefs. Returns false (and does not throw) when storage is missing or refuses the write. */
export function writeAudioPrefs(storage: StorageLike | null | undefined, prefs: AudioPrefs): boolean {
  if (!storage) return false;
  try {
    storage.setItem(AUDIO_PREFS_KEY, serializeAudioPrefs(prefs));
    return true;
  } catch {
    return false;
  }
}

/** The mute button's text: it names the state. "Sound on" while audible, "Sound off" while muted. */
export function soundToggleLabel(muted: boolean): string {
  return muted ? "Sound off" : "Sound on";
}

/** The volume slider's position (0..100) for a volume (0..1). */
export function volumeToSlider(volume: number): number {
  return Math.round(clampVolume(volume) * 100);
}

/** The volume (0..1) for a slider value. A value that is not a number leaves nothing to set: null. */
export function sliderToVolume(value: string | number): number | null {
  if (value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return clampVolume(n / 100);
}
