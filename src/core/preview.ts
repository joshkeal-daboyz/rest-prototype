/**
 * The load preview's contract (ticket 081 V2 to V4; Josh, 25 Nov 2026: "each breaker should showcase the load that would be applied as a number if flipped. Each broken wire should
 * show the load that would be added if repaired"). Types only: `src/grid/` computes it (`loadPreview`), the page (`src/main.ts`) asks for it on each state change and hands it to the
 * renderer (`MapRenderer3d.setLoadPreview`), which draws each entry by its icon.
 *
 * What the number counts (V-Q2 "Visible load (Recommended)", V-Q6 "Keep counting it (Recommended)", V0 `docs/design/081-V0-load-preview.md`): the what-if is run with every fault the
 * player cannot read now and has never read treated as sound, so the Decided "Faults hide faults" holds; a fault readable now, or read at any earlier state of this play (`known`), is
 * counted as it is.
 */

/**
 * What an entry previews: throwing a breaker, throwing a switch to its other line, repairing a readable fault (whether or not the parts hold its part), or clicking a battery
 * (ticket 081 BC; Josh, 26 Nov 2026: "Approve BC (Recommended)").
 *
 * A `"battery"` entry (BC1, criterion 1) is the battery's click. Not released with charge above 0: the what-if is the battery released with the state's charge. Released: the what-if
 * is the battery stopped. Not released with charge 0: no entry (its click is refused). `delta`, `over`, `blows` and `lines` are measured against the base as for a throw; on a release,
 * `lines.on` is the far-side lines its current would reach. A released battery's current counts toward no feed, so `delta` is 0 unless the release moves a feed's own current (a spring
 * or relay it holds). The seconds drawn by a battery (BC-Q1: "Seconds it would light (Recommended)") are the state's (the charge in `GridState.batteries`), read live by the renderer;
 * they are not a field of the entry.
 */
export type LoadPreviewKind = "breaker" | "switch" | "repair" | "battery";

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
  /**
   * The lines the move would make live (`on`) and dead (`off`) (ticket 081 NC; Josh, 26 Nov 2026: "hovering or throwing one highlights exactly the wires it controls"): ids of
   * `puzzle.lines` in its order, from the same visible what-if as `delta` (fuses lifted, unread faults as sound). May hold hidden (S1) line ids; the renderer draws file lines only.
   * Set by `loadPreview` on every entry from NC1 on; absent reads as none.
   */
  readonly lines?: { readonly on: readonly string[]; readonly off: readonly string[] };
  /**
   * Set on a timed breaker's entry (ticket 081 TB): the entry is what its clock's next flip will do, not a click (the player cannot throw it). `kind` stays "breaker", and `delta`, `over`,
   * `blows` and `lines` read as for a throw. Absent on every other entry.
   */
  readonly timed?: true;
}

/**
 * One state's preview: an entry per breaker and switch node id, per readable fault id (the break icon's), and per battery node id whose click is not refused (081 BC: released, or
 * charge above 0). A fault current does not reach has no entry ("Only when readable"), and no hidden id (081 S1) is ever a key.
 */
export type LoadPreview = ReadonlyMap<string, LoadPreviewEntry>;
