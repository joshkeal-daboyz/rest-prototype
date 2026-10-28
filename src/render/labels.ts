/** Pure: the map's caption strings, the one place the player-facing level words live (ticket 014). */

/** `Lv2 Lamp`. */
export function lampCaption(load: number): string {
  return `Lv${load} Lamp`;
}

/** `Lv3 Fuse`; an unrated fusebox has no caption (""). */
export function fuseCaption(rating: number | undefined): string {
  return rating === undefined ? "" : `Lv${rating} Fuse`;
}

/** The feed's name line: `Lv4 Powersource`, or `Powersource` when capacity is null (no limit). */
export function feedName(capacity: number | null): string {
  return capacity === null ? "Powersource" : `Lv${capacity} Powersource`;
}

/** The feed's live total: `using 3 of 4`, or `using 3` with no limit. */
export function feedUsing(load: number, capacity: number | null): string {
  return capacity === null ? `using ${load}` : `using ${load} of ${capacity}`;
}

/** The brownout form of the live total: `! using 5 of 4 !`. */
export function feedAlarm(load: number, capacity: number | null): string {
  return `! ${feedUsing(load, capacity)} !`;
}
