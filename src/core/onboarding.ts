/**
 * Ticket 084 (first play): the shared words of the onboarding layer. Types only. The renderer reports which symbols it drew and where (`SymbolAnchor`); the ui decides which
 * first-time callout or guide step is due and draws it (`src/ui/`); a city puzzle file may carry a guide for its first plays (`CityPuzzle.guide`, s01 to s03).
 *
 * Josh, 28 Nov 2026, on cards: "First-time labels (Recommended)", "Marker over building (Recommended)", "Idle pulse (Recommended)", "Both (Recommended)".
 */

/**
 * A symbol the overlay can show, as the first-time callouts name it (084 C). The renderer classifies each drawn icon, label and marker into exactly one:
 * - `feed`: the feed's icon. `feed-load`: the feed's "x of y" label. `fuse-load`: a rated fuse box's "x of y" label.
 * - `load-delta`: a preview number ("+2", "−1") by a control or a readable break.
 * - `breaker`: a breaker the player throws. `timer`: a timed breaker (its clock throws it).
 * - `switch`: a plain switch. `relay`: a switch with `relay` (with or without `spring`). `spring`: a switch with `spring` and no `relay`.
 * - `fusebox`: a fuse box that is not blown. `blown-fuse`: one with a readable blown fuse.
 * - `junction`: a junction that is not faulted. `dead-junction`: one with a readable fault.
 * - `battery`: a battery's icon.
 * - `building`: a file lamp's icon that is not a target and not faulted. `dead-lamp`: a file lamp with a readable dead bulb, target or not.
 * - `goal`: a target building's goal marker (084 B), on screen or as its edge arrow.
 * - `break`: a readable damaged-cable break icon.
 */
export type SymbolKind =
  | "feed"
  | "feed-load"
  | "fuse-load"
  | "load-delta"
  | "breaker"
  | "timer"
  | "switch"
  | "relay"
  | "spring"
  | "fusebox"
  | "blown-fuse"
  | "junction"
  | "dead-junction"
  | "battery"
  | "building"
  | "dead-lamp"
  | "goal"
  | "break";

/**
 * One symbol drawn on the last frame, and the point a callout aims at, in CSS px from the canvas's top-left.
 * `id` is the node id, or the fault id for a `break` (and for a `load-delta` by a break); a label's `id` is its icon's node id. A `goal` marker's `id` is its target lamp's id.
 * `onScreen` is false only for a `goal` drawn as an edge arrow (its point is the arrow's).
 */
export interface SymbolAnchor {
  readonly kind: SymbolKind;
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly onScreen: boolean;
}

/**
 * What a guide step waits for before the next one shows (084 D). Exactly one key:
 * - `next`: the player presses the step's Next button;
 * - `throw`: the player throws that breaker or switch (a `breaker:thrown` or `switch:thrown` that is not a timer's flip or a spring's return);
 * - `repair`: the fault at that node or line id is repaired (`repair:completed`);
 * - `lit`: that file lamp is lit and the section is not browned out;
 * - `complete`: the job completes.
 */
export type GuideUntil =
  | { readonly next: true }
  | { readonly throw: string }
  | { readonly repair: string }
  | { readonly lit: string }
  | { readonly complete: true };

/**
 * One step of a puzzle's guide (084 D): point at `at`, say `text`, wait for `until`.
 * `at` is a node id or a line id of the file (a line with a damaged-cable fault points at its break icon), or null for a bubble with no pointer. A target lamp's `at` points at its goal marker.
 * `text` is one or two short plain sentences, at most `GUIDE_TEXT_MAX` characters, naming buildings by their generic names ("Building 1", 084 A).
 */
export interface GuideStep {
  readonly at: string | null;
  readonly text: string;
  readonly until: GuideUntil;
}

/** The longest a guide step's text may be, in characters (084 A1 checks it). */
export const GUIDE_TEXT_MAX = 140;
