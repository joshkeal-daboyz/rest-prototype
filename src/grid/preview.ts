/**
 * The load preview (ticket 081 V2; contract in src/core/preview.ts, rules in docs/design/081-V0-load-preview.md).
 * Pure: it reads a puzzle and a state and runs fresh grids; it changes nothing.
 */

import type { Fault, GridNode, LoadPreview, LoadPreviewEntry, Puzzle } from "../core";
import { createGrid } from "./grid";
import type { GridState } from "./types";

/**
 * The load each breaker, switch and readable fault would put on if the player made that move. Every fault the player cannot read now and has not read (`known`) is treated as sound, so
 * hidden faults never show in a number. `delta` is counted before any fuse blows; `over` and `blows` after.
 */
export function loadPreview(puzzle: Puzzle, state: GridState, known: ReadonlySet<string>): LoadPreview {
  const seen = (f: Fault): boolean => state.readableFaults.has(f.id) || known.has(f.id);
  const faults = state.faults.filter(seen);

  /** The puzzle as the player sees it: the state's breakers and switches, only the seen faults, optionally the rated fuses lifted. */
  const view = (flt: readonly Fault[], breakers: ReadonlyMap<string, boolean>, switches: ReadonlyMap<string, 0 | 1>, unrated: boolean): Puzzle => ({
    ...puzzle,
    startingParts: [],
    faults: flt.map((f) => ({ ...f })),
    nodes: puzzle.nodes.map((n): GridNode => {
      if (n.type === "breaker") return { ...n, closed: breakers.get(n.id) ?? n.closed };
      if (n.type === "switch") return { ...n, selected: switches.get(n.id) ?? n.selected };
      if (n.type === "fusebox" && unrated) return { ...n, rating: Infinity };
      return n;
    }),
  });

  const run = (flt: readonly Fault[], breakers: ReadonlyMap<string, boolean>, switches: ReadonlyMap<string, 0 | 1>) => {
    const lit = createGrid(view(flt, breakers, switches, true)).state();
    const real = createGrid(view(flt, breakers, switches, false)).state();
    return { load: lit.load, powered: lit.powered, real };
  };

  const base = run(faults, state.breakers, state.switches);
  const baseBlown = new Set(base.real.faults.filter((f) => f.kind === "blown-fuse").map((f) => f.id));

  const entry = (kind: LoadPreviewEntry["kind"], flt: readonly Fault[], breakers: ReadonlyMap<string, boolean>, switches: ReadonlyMap<string, 0 | 1>, repaired?: string): LoadPreviewEntry => {
    const after = run(flt, breakers, switches);
    // A repaired fuse that blows again carries the same id, so it counts as new.
    const blows = after.real.faults.filter((f) => f.kind === "blown-fuse" && (f.id === repaired || !baseBlown.has(f.id))).map((f) => f.at);
    // The lines the move makes live or dead, from the same fuses-lifted run as `delta`, in `puzzle.lines` order.
    const on = puzzle.lines.filter((l) => !base.powered.has(l.id) && after.powered.has(l.id)).map((l) => l.id);
    const off = puzzle.lines.filter((l) => base.powered.has(l.id) && !after.powered.has(l.id)).map((l) => l.id);
    return { kind, delta: after.load - base.load, over: after.real.brownout || blows.length > 0, blows, lines: { on, off } };
  };

  const out = new Map<string, LoadPreviewEntry>();
  for (const n of puzzle.nodes) {
    if (n.type === "breaker") {
      const b = new Map(state.breakers);
      b.set(n.id, !(state.breakers.get(n.id) ?? n.closed));
      out.set(n.id, entry("breaker", faults, b, state.switches));
    } else if (n.type === "switch") {
      const s = new Map(state.switches);
      s.set(n.id, (state.switches.get(n.id) ?? n.selected) === 0 ? 1 : 0);
      out.set(n.id, entry("switch", faults, state.breakers, s));
    }
  }
  for (const f of faults) {
    if (!state.readableFaults.has(f.id)) continue;
    out.set(f.id, entry("repair", faults.filter((x) => x.id !== f.id), state.breakers, state.switches, f.id));
  }
  return out;
}
