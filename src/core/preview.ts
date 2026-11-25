/**
 * The load preview's contract (ticket 081 V2 to V4; Josh, 25 Nov 2026: "each breaker should showcase the load that would be applied as a number if flipped. Each broken wire should
 * show the load that would be added if repaired"). Types only: `src/grid/` computes it (`loadPreview`), the page (`src/main.ts`) asks for it on each state change and hands it to the
 * renderer (`MapRenderer3d.setLoadPreview`), which draws each entry by its icon.
 *
 * What the number counts (V-Q2 "Visible load (Recommended)", V-Q6 "Keep counting it (Recommended)", V0 `docs/design/081-V0-load-preview.md`): the what-if is run with every fault the
 * player cannot read now and has never read treated as sound, so the Decided "Faults hide faults" holds; a fault readable now, or read at any earlier state of this play (`known`), is
 * counted as it is.
 */

/** What an entry previews: throwing a breaker, throwing a switch to its other line, or repairing a readable fault (whether or not the parts hold its part). */
export type LoadPreviewKind = "breaker" | "switch" | "repair";

export interface LoadPreviewEntry {
  readonly kind: LoadPreviewKind;
  /**
   * The load the move puts on, in lamp-loads (the HUD's units, scenery included), counted before any fuse blows (V0 R2; Josh, V-Q4: "+3, load added (Recommended)"): the visible load of
   * the lamps the move would newly light, less that of the lamps it would darken, over every feed. Negative for a move that sheds load. An integer, as every load is.
   */
  readonly delta: number;
  /**
   * Red (V0 R1): after the move, with its blows, some feed ends over its capacity (whether or not it was over before), or a fuse box blows. Each feed is judged on its own (015 A).
   */
  readonly over: boolean;
  /** The fuse box ids the move would blow, in the grid's order; empty when none. */
  readonly blows: readonly string[];
}

/**
 * One state's preview: an entry per breaker and switch node id, and per readable fault id (the break icon's). A fault current does not reach has no entry ("Only when readable"), and no
 * hidden id (081 S1) is ever a key.
 */
export type LoadPreview = ReadonlyMap<string, LoadPreviewEntry>;
