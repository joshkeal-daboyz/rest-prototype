/** What the 3D view draws, from GridState only (ticket 037). Pure: no three, no DOM. */

import type { GridState } from "../grid";
import { flicker } from "../render/motion";

export type WireLook = "live" | "dead" | "faulted";

function readableFaultAt(state: GridState, id: string): boolean {
  for (const f of state.faults) if (f.at === id && state.readableFaults.has(f.id)) return true;
  return false;
}

/** A readable fault on the line (the cable sparks) beats live; otherwise carrying current is live. */
export function wireLook(state: GridState, lineId: string): WireLook {
  if (state.sparking.has(lineId) || readableFaultAt(state, lineId)) return "faulted";
  return state.powered.has(lineId) ? "live" : "dead";
}

export interface NodeLook {
  /** Current reaches the node. */
  live: boolean;
  /** A readable fault sits at the node. */
  faulted: boolean;
  /** A lamp that is lit (power and no fault, brownout or not). */
  lit: boolean;
  /** A breaker's state: true closed, false open; null if the node is not a breaker. */
  closed: boolean | null;
  /** A switch's selected output; null if the node is not a switch. */
  selected: 0 | 1 | null;
}

/** Fill `out` with the node's look (allocation-free, for the draw loop). */
export function nodeLookInto(state: GridState, nodeId: string, out: NodeLook): NodeLook {
  const closed = state.breakers.get(nodeId);
  const selected = state.switches.get(nodeId);
  out.live = state.powered.has(nodeId);
  out.faulted = readableFaultAt(state, nodeId);
  out.lit = state.lit.has(nodeId);
  out.closed = closed === undefined ? null : closed;
  out.selected = selected === undefined ? null : selected;
  return out;
}

export function nodeLook(state: GridState, nodeId: string): NodeLook {
  return nodeLookInto(state, nodeId, { live: false, faulted: false, lit: false, closed: null, selected: null });
}

/** How far a lamp dips: 0 outside a brownout; in one, 1 minus the 2D view's flicker (0.15..1), so always above 0. `index` is the lamp's place in the file. */
export function lampFlicker(state: GridState, index: number, timeSeconds: number): number {
  return state.brownout ? 1 - flicker(timeSeconds, index) : 0;
}

/** A lamp's brightness 0..1: dark unless lit, dipping in a brownout. */
export function lampBrightness(state: GridState, lampId: string, index: number, timeSeconds: number): number {
  return state.lit.has(lampId) ? 1 - lampFlicker(state, index, timeSeconds) : 0;
}
