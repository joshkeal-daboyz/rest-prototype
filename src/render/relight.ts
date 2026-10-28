/**
 * The Relight, as pure data: when power reaches each powered line and node,
 * measured from the feed along powered lines by path distance. Lamps ignite
 * when it reaches them. No canvas.
 */

import type { Puzzle } from "../core";
import type { GridState } from "../grid";

/** Seconds for power to reach the farthest lamp. */
export const RELIGHT_TRAVEL_SECONDS = 2.4;
/** Seconds a lamp's flare lasts after ignition. */
export const FLARE_SECONDS = 0.6;
/** Seconds of stillness before the power starts to move. */
export const RELIGHT_LEAD_SECONDS = 0.25;

export interface RelightPlan {
  /** Per puzzle.lines index: seconds the power enters the line / reaches its far end. Infinity = never (not powered). */
  lineStart: Float64Array;
  lineEnd: Float64Array;
  /** Per puzzle.nodes index: seconds power reaches the node. Infinity = never. */
  nodeArrive: Float64Array;
  /** Lit lamp ids, in ignition order (ties keep puzzle order). */
  lampOrder: string[];
  /** Total seconds, including the last flare. */
  duration: number;
}

export function planRelight(puzzle: Puzzle, state: GridState): RelightPlan {
  const nodes = puzzle.nodes;
  const lines = puzzle.lines;
  const nodeIdx = new Map<string, number>();
  nodes.forEach((n, i) => nodeIdx.set(n.id, i));
  const pos = (id: string): readonly [number, number] => nodes[nodeIdx.get(id) ?? 0]!.pos;

  const dist = new Float64Array(nodes.length).fill(Infinity);
  const feedIdx = nodes.findIndex((n) => n.type === "feed");
  if (feedIdx >= 0) dist[feedIdx] = 0;

  const lineLen = lines.map((l) => {
    const a = pos(l.from);
    const b = pos(l.to);
    return Math.hypot(b[0] - a[0], b[1] - a[1]);
  });
  const lineStartD = new Float64Array(lines.length).fill(Infinity);
  const lineEndD = new Float64Array(lines.length).fill(Infinity);

  // Relax along powered lines until nothing changes (graphs are tiny).
  for (let pass = 0; pass <= lines.length; pass++) {
    let changed = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]!;
      if (!state.powered.has(l.id)) continue;
      const src = state.flowFrom.get(l.id);
      if (src === undefined) continue;
      const si = nodeIdx.get(src);
      if (si === undefined) continue;
      const sd = dist[si]!;
      if (!Number.isFinite(sd)) continue;
      const other = src === l.from ? l.to : l.from;
      const oi = nodeIdx.get(other);
      if (oi === undefined) continue;
      const ed = sd + lineLen[i]!;
      if (lineEndD[i] !== ed) {
        lineStartD[i] = sd;
        lineEndD[i] = ed;
        changed = true;
      }
      if (ed < dist[oi]!) {
        dist[oi] = ed;
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Only lit lamps set the pace; everything reachable gets a time.
  let maxD = 0;
  for (let i = 0; i < nodes.length; i++) {
    const d = dist[i]!;
    if (Number.isFinite(d) && d > maxD) maxD = d;
  }
  const speed = maxD > 0 ? maxD / RELIGHT_TRAVEL_SECONDS : 1;

  const lineStart = new Float64Array(lines.length);
  const lineEnd = new Float64Array(lines.length);
  for (let i = 0; i < lines.length; i++) {
    lineStart[i] = RELIGHT_LEAD_SECONDS + lineStartD[i]! / speed;
    lineEnd[i] = RELIGHT_LEAD_SECONDS + lineEndD[i]! / speed;
  }
  const nodeArrive = new Float64Array(nodes.length);
  for (let i = 0; i < nodes.length; i++) nodeArrive[i] = RELIGHT_LEAD_SECONDS + dist[i]! / speed;

  const lamps: { id: string; t: number; order: number }[] = [];
  nodes.forEach((n, i) => {
    if (n.type === "lamp" && state.lit.has(n.id) && Number.isFinite(nodeArrive[i]!)) {
      lamps.push({ id: n.id, t: nodeArrive[i]!, order: i });
    }
  });
  lamps.sort((a, b) => a.t - b.t || a.order - b.order);
  const last = lamps.length ? lamps[lamps.length - 1]!.t : RELIGHT_LEAD_SECONDS;
  return {
    lineStart,
    lineEnd,
    nodeArrive,
    lampOrder: lamps.map((l) => l.id),
    duration: last + FLARE_SECONDS,
  };
}
