/**
 * The load preview's page side (ticket 081 V4): which faults the player has read, what the numbers are computed for, and the V key.
 * Pure: `src/main.ts` calls it on each state change and hands the result to the renderer's `setLoadPreview`.
 */

import type { LoadPreview, Puzzle } from "../core";
import { loadPreview, type GridState } from "../grid";

/** One step of the preview: the faults read so far (carried into the next step) and the numbers for this state (null while relighting or after the win). */
export interface PreviewStep {
  readonly known: ReadonlySet<string>;
  readonly preview: LoadPreview | null;
}

/**
 * The preview for a state. Every fault readable now is added to `known` (V-Q6 "Keep counting it"), so a fault read at one state still counts after current is routed away.
 * Reset starts again from an empty `known`; Undo keeps it, since the player has seen what they have seen. No numbers while the Relight runs or once the puzzle is won.
 */
export function previewFor(puzzle: Puzzle, state: GridState, known: ReadonlySet<string>, relighting: boolean): PreviewStep {
  const seen = new Set(known);
  for (const id of state.readableFaults) seen.add(id);
  if (relighting || state.complete) return { known: seen, preview: null };
  return { known: seen, preview: loadPreview(puzzle, state, seen) };
}

/** The key that shows and hides the load numbers (V-Q5 "On, a key hides it"). */
export const LOAD_KEY = "v";

/** The keyboard event fields the key reads; `tagName` is the focused element's, when there is one. */
export interface LoadKeyEvent {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
  readonly repeat: boolean;
  readonly tagName?: string | undefined;
}

/** True for a plain V press (not held, not with a modifier) that is not typed into a picker or field. */
export function isLoadKey(e: LoadKeyEvent): boolean {
  if (e.key.toLowerCase() !== LOAD_KEY || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return false;
  return e.tagName !== "SELECT" && e.tagName !== "INPUT" && e.tagName !== "TEXTAREA";
}

/** The HUD's one line naming the key, and whether the numbers are shown. Text, so the state is not a colour alone. */
export function loadKeyText(on: boolean): string {
  return on ? "V: load numbers" : "V: load numbers (off)";
}
