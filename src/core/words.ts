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

// ---- places (ticket 024): what each lamp lights, read from its id ----

/** The kinds of place a lamp can light. The city draws one footprint per kind; `streetlight` is a pool on the lane. */
export type PlaceKind =
  | "sacred"
  | "water"
  | "mill"
  | "gate"
  | "work"
  | "market"
  | "hall"
  | "homes"
  | "home"
  | "streetlight";

/** A lamp id's base name (lower case, trailing `_N` / `_NN` stripped) → its kind. A new lamp name is one entry here. */
export const PLACE_KINDS: Readonly<Record<string, PlaceKind>> = {
  shrine: "sacred", chapel: "sacred", bell: "sacred", tower: "sacred",
  well: "water",
  mill: "mill",
  gate: "gate",
  forge: "work", kiln: "work", ovens: "work", bakery: "work", tannery: "work", smithy: "work",
  market: "market", stall: "market", yard: "market",
  inn: "hall", hall: "hall", infirmary: "hall", lamphouse: "hall",
  home: "home", cottage: "home", house: "home",
  homes: "homes", houses: "homes",
  lantern: "streetlight", lane: "streetlight", flood: "streetlight", porch: "streetlight", lift: "streetlight",
  steps: "streetlight", stair: "streetlight", street: "streetlight", lamp: "streetlight",
};

/** The kind a name falls back to when its base is not in `PLACE_KINDS`. */
export const DEFAULT_PLACE_KIND: PlaceKind = "home";

/** A lamp id's base name: lower case, one trailing `_N` or `_NN` stripped (`home_2` → `home`, `lamp_07` → `lamp`). */
export function placeBase(lampId: string): string {
  return lampId.toLowerCase().replace(/_\d{1,2}$/, "");
}

/** The lamp id's base (trailing _N / _NN stripped) looked up in the place table; unknown → "home". */
export function placeKind(lampId: string): PlaceKind {
  const base = placeBase(lampId);
  return Object.prototype.hasOwnProperty.call(PLACE_KINDS, base) ? PLACE_KINDS[base]! : DEFAULT_PLACE_KIND;
}

/** The words for a lamp's place: the id with "_" as spaces, as the targets list shows today (`home_1` → `home 1`). */
export function placeName(lampId: string): string {
  return lampId.replace(/_/g, " ");
}
