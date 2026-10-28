/**
 * Pure: the map's caption strings. The level words themselves are built by src/core/words.ts
 * (ticket 017); this module keeps the render-side names and adds the alarm form.
 */
import { fuseLabel, lampLabel, namedPowersourceLabel, powersourceLabel, usingText } from "../core";

/** `Lv2 Lamp`. */
export function lampCaption(load: number): string {
  return lampLabel(load);
}

/** `Lv3 Fuse`; an unrated fusebox has no caption (""). */
export function fuseCaption(rating: number | undefined): string {
  return rating === undefined ? "" : fuseLabel(rating);
}

/** The feed's name line: `Lv4 Powersource`, or `Powersource` when capacity is null (no limit). */
export function feedName(capacity: number | null): string {
  return powersourceLabel(capacity);
}

/** The feed's live total: `using 3 of 4`, or `using 3 (no limit)` with no limit. */
export function feedUsing(load: number, capacity: number | null): string {
  return usingText(load, capacity);
}

/** The brownout form of the live total: `! using 5 of 4 !`. */
export function feedAlarm(load: number, capacity: number | null): string {
  return `! ${feedUsing(load, capacity)} !`;
}

/** The name line above a feed on a multi-feed map: `North` (the name comes from `puzzleFeeds`). */
export function feedHeading(name: string): string {
  return name;
}

/** The full named form (`North · Lv4 Powersource`), for callers that want one line. */
export function feedNamedCaption(name: string, capacity: number | null): string {
  return namedPowersourceLabel(name, capacity);
}
