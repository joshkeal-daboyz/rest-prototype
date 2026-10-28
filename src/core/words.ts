// Pure: no DOM, no imports at all (ticket 017). The one place the player-facing level words are built.
// Map captions (src/render/labels.ts), hover text (src/play/prompt.ts) and the HUD/notices (src/ui/logic.ts)
// all ask this module for them, so the parts cannot drift apart.

/** The things that carry a level, and their screen names. A later thing is one entry here. */
export const THING_NAMES = { lamp: "Lamp", fuse: "Fuse", powersource: "Powersource" } as const;
export type LevelThing = keyof typeof THING_NAMES;

/** Shown after a live total with no limit, everywhere (Josh, 017): `using 3 (no limit)`. */
export const NO_LIMIT = "(no limit)";

/** `Lv3 Fuse`; just `Fuse` when there is no level (null or undefined). `Lv` + number, no space; numbers print as given. */
export function levelLabel(thing: LevelThing, level: number | null | undefined): string {
  const name = THING_NAMES[thing];
  return level === null || level === undefined ? name : `Lv${level} ${name}`;
}

/** `Lv2 Lamp`. */
export function lampLabel(load: number): string {
  return levelLabel("lamp", load);
}

/** `Lv3 Fuse`, or `Fuse` when unrated. */
export function fuseLabel(rating: number | undefined): string {
  return levelLabel("fuse", rating);
}

/** `Lv4 Powersource`, or `Powersource` when capacity is null (no limit). */
export function powersourceLabel(capacity: number | null): string {
  return levelLabel("powersource", capacity);
}

/**
 * A feed's live total: `using 3 of 4`, or `using 3 (no limit)` when capacity is null.
 * The no-limit form is the same on the map and in the HUD (Josh, 017).
 */
export function usingText(load: number, capacity: number | null): string {
  return capacity === null ? `using ${load} ${NO_LIMIT}` : `using ${load} of ${capacity}`;
}

// ---- which powersource (ticket 015; Josh's answer 1 on 017: the dot separator everywhere) ----

/** Between a feed's name and its level, and between a lamp's level and its carrier: ` · `. */
export const NAME_SEP = " · ";

/** A feed's display name: its `name`, else its id with underscores as spaces (`north_feed` → `north feed`). */
export function powersourceName(id: string, name?: string): string {
  return name !== undefined && name.length > 0 ? name : id.replace(/_/g, " ");
}

/** `North · Lv4 Powersource`, or `North · Powersource` with no limit. Used on multi-feed maps only. */
export function namedPowersourceLabel(name: string, capacity: number | null): string {
  return `${name}${NAME_SEP}${powersourceLabel(capacity)}`;
}

/** Which feed carries a lamp: `on North`. */
export function onPowersourceText(name: string): string {
  return `on ${name}`;
}

/** `Lv2 Lamp · on North`: a healthy lamp's hover on a multi-feed map. */
export function lampOnLabel(load: number, feedName: string): string {
  return `${lampLabel(load)}${NAME_SEP}${onPowersourceText(feedName)}`;
}

/** A fusebox's live total: `carrying 2 of 3`, or `carrying 2` when there is no rating to compare with. */
export function carryingText(load: number, rating: number | null | undefined): string {
  return rating === null || rating === undefined ? `carrying ${load}` : `carrying ${load} of ${rating}`;
}
