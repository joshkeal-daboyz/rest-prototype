/**
 * Pure helpers for the controls layout (ticket 030): the speaker and action icons, the speaker's label,
 * the sound popover's open and close rules, the Esc order, and the win splash's ceiling. No DOM.
 * The icon strings are fixed constants, set as innerHTML by index.ts and never built from data.
 */

import { clampVolume, volumeToSlider, type Rect } from "./logic";

/** Every control icon is a 24 × 24 inline SVG, in the family of the parts icons (021). */
export const CONTROL_ICON_VIEWBOX = "0 0 24 24";

export type SpeakerIcon = "muted" | "silent" | "low" | "high";

const SPEAKER_BODY =
  '<path d="M3.5 9.2H7.2L12 5.2V18.8L7.2 14.8H3.5Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>';
const FIRST_WAVE = '<path d="M15.2 9.3C16.5 10.8 16.5 13.2 15.2 14.7" fill="none" stroke="#f2b84b" stroke-width="1.7" stroke-linecap="round"/>';
const CROSS =
  '<path d="M15.8 9.4L21 14.6M21 9.4L15.8 14.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>';

/** The speaker's icon for each sound state. Amber is used only for the waves (sound on). */
export const SPEAKER_ICON_SVG: Record<SpeakerIcon, string> = {
  muted: SPEAKER_BODY + CROSS,
  silent: SPEAKER_BODY,
  low: SPEAKER_BODY + FIRST_WAVE,
  high:
    SPEAKER_BODY +
    '<path d="M15.2 9.3C16.5 10.8 16.5 13.2 15.2 14.7M17.9 6.8C20.6 9.6 20.6 14.4 17.9 17.2" fill="none" stroke="#f2b84b" stroke-width="1.7" stroke-linecap="round"/>',
};

/** The three HUD actions' icons (undo, reset, download log), in the same family as the speaker. */
export const ACTION_ICON_SVG: Record<"undo" | "reset" | "log", string> = {
  undo:
    '<path d="M8.5 5.5L4 10L8.5 14.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 10H14A5.5 5.5 0 0 1 14 21H9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  reset:
    '<path d="M19.5 12A7.5 7.5 0 1 1 16.8 6.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M17.5 2.8V6.8H13.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  log:
    '<path d="M12 3.5V14M7.5 9.8L12 14.3L16.5 9.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 16.5V19.5H19.5V16.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
};

/** The HUD action buttons, in the order they sit on screen. The label is the button's accessible name. */
export const CONTROL_ACTIONS: readonly { id: "undo" | "reset" | "log"; label: string }[] = [
  { id: "undo", label: "Undo" },
  { id: "reset", label: "Reset" },
  { id: "log", label: "Download log" },
];

/**
 * The speaker's icon: crossed out while muted (at any volume), no waves at volume 0, one wave up to half
 * volume, two above. The volume is read through clampVolume, so NaN and out-of-range values are handled there.
 */
export function speakerIcon(muted: boolean, volume: number): SpeakerIcon {
  if (muted) return "muted";
  const v = clampVolume(volume);
  if (v === 0) return "silent";
  return v <= 0.5 ? "low" : "high";
}

/** The speaker button's accessible name and tooltip: "Sound: muted", or "Sound: on, volume 50%" (whole percent). */
export function speakerLabel(muted: boolean, volume: number): string {
  if (muted) return "Sound: muted";
  return `Sound: on, volume ${volumeToSlider(volume)}%`;
}

/** What can happen to the sound popover. `inside` says whether the pointer or focus is within the sound dock. */
export type PopoverEvent =
  | { type: "toggle" }
  | { type: "escape" }
  | { type: "pointerdown"; inside: boolean }
  | { type: "focusout"; inside: boolean };

/** The popover's next state, and where focus goes (null: stay where it is). */
export interface PopoverResult {
  open: boolean;
  focus: "toggle" | "speaker" | null;
}

/**
 * The sound popover's rules. Opening from the speaker moves focus to the mute toggle. Closing by the speaker,
 * or by Esc, returns focus to the speaker. A press outside the dock, or focus leaving it, closes without moving focus.
 * A press or focus change inside the dock leaves the popover as it is.
 */
export function soundPopover(open: boolean, event: PopoverEvent): PopoverResult {
  switch (event.type) {
    case "toggle":
      return open ? { open: false, focus: "speaker" } : { open: true, focus: "toggle" };
    case "escape":
      return open ? { open: false, focus: "speaker" } : { open: false, focus: null };
    case "pointerdown":
      return event.inside ? { open, focus: null } : { open: false, focus: null };
    case "focusout":
      return event.inside ? { open, focus: null } : { open: false, focus: null };
  }
}

/**
 * Which overlay an Esc press belongs to. An open popover takes it first; the win splash takes the next one.
 * Null when neither is open.
 */
export function escapeTarget(popoverOpen: boolean, splashOpen: boolean): "popover" | "splash" | null {
  if (popoverOpen) return "popover";
  if (splashOpen) return "splash";
  return null;
}

/**
 * The lowest y the win splash may reach (its bottom edge must stay at or above it). `splash` is the splash's
 * box; `obstacles` are the panels in the bottom corners. Only obstacles that share a column with the splash
 * count: the ceiling is the top of the highest of them, less `gap`, or `rootHeight` when none shares a column.
 */
export function splashCeiling(rootHeight: number, splash: Rect, obstacles: readonly Rect[], gap = 8): number {
  let ceiling = rootHeight;
  for (const o of obstacles) {
    const sharesColumn = splash.left < o.left + o.width && splash.left + splash.width > o.left;
    if (sharesColumn) ceiling = Math.min(ceiling, o.top - gap);
  }
  return ceiling;
}
