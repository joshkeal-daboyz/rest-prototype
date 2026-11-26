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

/** Timed breakers whose flips are within this many seconds of each other are one moment (rule 6; TB3's SAME_MOMENT). */
const SAME_MOMENT = 1e-6;

const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** The timers' flip order: ids by `next`, the ids of one moment sorted together. The seconds themselves are not kept. */
function flipOrder(timers: GridState["timers"]): string[][] {
  const sorted = [...timers].sort(([ai, a], [bi, b]) => a.next - b.next || byText(ai, bi));
  const groups: string[][] = [];
  let start = 0;
  for (const [id, r] of sorted) {
    if (groups.length === 0 || r.next - start > SAME_MOMENT) {
      groups.push([]);
      start = r.next;
    }
    groups[groups.length - 1]!.push(id);
  }
  for (const g of groups) g.sort(byText);
  return groups;
}

/**
 * What the load numbers are computed from, as a string: the Relight and the win, every breaker's and switch's position, the faults and the readable ones, and the timers' flip order.
 * It ignores the clock, each `next` value, each battery's charge value and the load, so a state that only ran on since the last flip has the same key (ticket 081 TB1b3).
 * Each battery adds its id, whether it is released, and whether its charge is above 0 (ticket 081 BC2): a release, a stop, running flat and the first charge from 0 change the numbers.
 */
export function previewKey(state: GridState, relighting: boolean): string {
  const sortedPairs = <V>(m: ReadonlyMap<string, V>): Array<[string, V]> => [...m].sort(([a], [b]) => byText(a, b));
  const batteries = sortedPairs(state.batteries).map(([id, b]) => [id, b.released, b.charge > 0] as const);
  return JSON.stringify([
    relighting,
    state.complete,
    sortedPairs(state.breakers),
    sortedPairs(state.switches),
    state.faults.map((f) => f.id).sort(byText),
    [...state.readableFaults].sort(byText),
    flipOrder(state.timers),
    batteries,
  ]);
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
