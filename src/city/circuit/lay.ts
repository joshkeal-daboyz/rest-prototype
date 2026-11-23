/**
 * Stage 6, poles and spans (ticket 081 K2a; CK1 to CK3 and CK4 to CK6 of `docs/design/070-K1-circuit.md`). Pure: reads `streets` and `edge`, writes poles and spans; drops, lights and lamp-post places are K2b's.
 *
 * - A **pole line** is a block side whose pavement is its street's pole pavement (CK1). Its fixed points are its two end slots and every landing a crossing makes on it; between them slots are laid at an even pitch (CK2),
 *   and a slot on a forbidden cell moves along the pavement (CK3).
 * - A **corner** of a block takes a corner span (CK5) when both of its sides are pole lines. When only one is, the other side's end slot holds a crossing pole, joined to the line by a corner span, and a crossing span
 *   runs square across that street to the facing block's line (CK6).
 */

import type { CityBlockSide, CityPlanBlock, CityPlanStreet, CityPole, CityPoleKind, CitySide, CityWireSpan, CityWireSpanKind } from "../../core";
import { CityStageError } from "../pipeline/error";
import type { CircuitInput } from "./check";
import { CELL_M, POLE_END_CLEAR_M, POLE_NUDGE_M, POLE_PITCH_M } from "./constants";
import { allowedCell, cellAt, indexCells, oppositeSide, pointOf, polePavement, sidePavement, spanM, streetsById, type CellIndex, type Pavement } from "./geometry";

const round4 = (n: number): number => Math.round(n * 10000) / 10000;

/** A pole's id: `pole:<street>:<lo|hi>:<along_m, 2 decimals>` (`citycircuit.ts`), `along_m` being metres on the street's axis. */
export const poleId = (street: string, pavement: Pavement, along: number): string => `pole:${street}:${pavement}:${along.toFixed(2)}`;
/** A span's id: `span:<pole id a>~<pole id b>`, the ids in sorted order. */
export const spanId = (a: string, b: string): string => (a < b ? `span:${a}~${b}` : `span:${b}~${a}`);

interface Line {
  readonly block: CityPlanBlock;
  readonly side: CitySide;
  readonly sideInfo: CityBlockSide;
  readonly street: CityPlanStreet;
  readonly pavement: Pavement;
  readonly lo: number;
  readonly hi: number;
  readonly landings: number[];
}

interface Home {
  readonly street: string;
  readonly pavement: Pavement;
  readonly block: string;
  readonly side: CitySide;
}

const CORNERS: readonly (readonly [CitySide, CitySide])[] = [
  ["+x", "+z"],
  ["+x", "-z"],
  ["-x", "+z"],
  ["-x", "-z"],
];

/** The along metres of a side's end slot at the corner it shares with `other`: the high end when `other` is a "+" side. */
const endAlong = (s: CityBlockSide, other: CitySide): number => {
  const m = spanM(s);
  return round4(other.startsWith("+") ? m.hi - POLE_END_CLEAR_M : m.lo + POLE_END_CLEAR_M);
};

export interface Laid {
  readonly poles: CityPole[];
  readonly spans: CityWireSpan[];
}

const byId = <T extends { readonly id: string }>(m: ReadonlyMap<string, T>): T[] => [...m.values()].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));

/** Lay every pole and span of the city (CK1 to CK6). Throws `CityStageError` where an open end finds no line across its street. */
export function layPoles(input: CircuitInput): Laid {
  const { streets, edge } = input;
  const ix = indexCells(edge);
  const byStreet = streetsById(streets);
  const lines = new Map<string, Line>();
  const keyOf = (block: string, side: CitySide): string => `${block}|${side}`;
  for (const b of streets.blocks) {
    for (const side of ["+x", "-x", "+z", "-z"] as const) {
      const sideInfo = b.sides[side];
      const street = byStreet.get(sideInfo.street)!;
      if (polePavement(street, ix) !== sidePavement(side)) continue;
      const m = spanM(sideInfo);
      lines.set(keyOf(b.id, side), { block: b, side, sideInfo, street, pavement: sidePavement(side), lo: m.lo, hi: m.hi, landings: [] });
    }
  }

  const poles = new Map<string, CityPole>();
  const spans = new Map<string, CityWireSpan>();
  const addPole = (home: Home, kind: CityPoleKind, along: number, nudged: number): CityPole => {
    const id = poleId(home.street, home.pavement, along);
    const known = poles.get(id);
    if (known !== undefined) return known;
    const p = pointOf(byStreet.get(home.street)!, home.pavement, along);
    const pole: CityPole = { id, kind, street: home.street, pavement: home.pavement, along_m: along, x_m: p.x_m, z_m: p.z_m, block: home.block, side: home.side, nudged_m: round4(nudged) };
    poles.set(id, pole);
    return pole;
  };
  const addSpan = (kind: CityWireSpanKind, p: CityPole, q: CityPole, street: string | null): void => {
    const id = spanId(p.id, q.id);
    if (spans.has(id)) return;
    const [a, b] = p.id < q.id ? [p, q] : [q, p];
    spans.set(id, { id, kind, a: a.id, b: b.id, len_m: round4(Math.hypot(p.x_m - q.x_m, p.z_m - q.z_m)), street });
  };
  const homeOf = (l: Line): Home => ({ street: l.street.id, pavement: l.pavement, block: l.block.id, side: l.side });

  // Corners. A crossing's landing is noted on the facing line first, so that its slots are laid with the landing as a fixed point.
  const corners: (() => void)[] = [];
  for (const b of streets.blocks) {
    for (const [sa, sb] of CORNERS) {
      const la = lines.get(keyOf(b.id, sa));
      const lb = lines.get(keyOf(b.id, sb));
      if (la === undefined && lb === undefined) continue;
      if (la !== undefined && lb !== undefined) {
        corners.push(() => addSpan("corner", addPole(homeOf(la), "end", endAlong(la.sideInfo, sb), 0), addPole(homeOf(lb), "end", endAlong(lb.sideInfo, sa), 0), null));
        continue;
      }
      // One side is a pole line (`own`); the other (`far`) is not. Its end slot holds a crossing pole, and the line crosses that street.
      const own = (la ?? lb)!;
      const ownSide = la !== undefined ? sa : sb;
      const farSide = la !== undefined ? sb : sa;
      const farInfo = b.sides[farSide];
      const farStreet = byStreet.get(farInfo.street)!;
      const along = endAlong(farInfo, ownSide);
      const target = farInfo.across.find((x) => x.span.lo * CELL_M <= along && along < x.span.hi * CELL_M);
      const facing = target === undefined ? undefined : lines.get(keyOf(target.block, oppositeSide(farSide)));
      if (facing === undefined) throw new CityStageError(`CK6: ${b.id} ${farSide} has an open end at ${along.toFixed(2)} m and no pole line across ${farStreet.id}`, []);
      facing.landings.push(along);
      corners.push(() => {
        const crossing = addPole({ street: farStreet.id, pavement: sidePavement(farSide), block: b.id, side: farSide }, "crossing", along, 0);
        addSpan("corner", addPole(homeOf(own), "end", endAlong(own.sideInfo, farSide), 0), crossing, null);
        addSpan("cross", crossing, addPole(homeOf(facing), "landing", along, 0), farStreet.id);
      });
    }
  }

  for (const l of lines.values()) {
    const first = round4(l.lo + POLE_END_CLEAR_M);
    const last = round4(l.hi - POLE_END_CLEAR_M);
    const fixed = [...new Set<number>([first, last, ...l.landings])].sort((x, y) => x - y);
    for (const a of fixed) addPole(homeOf(l), a === first || a === last ? "end" : "landing", a, 0);
    for (let k = 0; k + 1 < fixed.length; k++) {
      const from = fixed[k]!;
      const gap = fixed[k + 1]! - from;
      const n = Math.max(1, Math.ceil(gap / POLE_PITCH_M - 1e-9));
      for (let s = 1; s < n; s++) {
        const want = round4(from + (gap * s) / n);
        const at = nudge(want, l, ix);
        addPole(homeOf(l), "slot", at, Math.abs(at - want));
      }
    }
  }
  for (const f of corners) f();

  // Along spans: consecutive poles of one line.
  const along = new Map<string, CityPole[]>();
  for (const p of poles.values()) {
    if (p.kind === "crossing") continue;
    const k = keyOf(p.block, p.side);
    const list = along.get(k);
    if (list === undefined) along.set(k, [p]);
    else list.push(p);
  }
  for (const list of along.values()) {
    list.sort((x, y) => x.along_m - y.along_m);
    for (let k = 0; k + 1 < list.length; k++) addSpan("along", list[k]!, list[k + 1]!, list[k]!.street);
  }
  return { poles: byId(poles), spans: byId(spans) };
}

/**
 * CK2's nudge over CK3's cells: a slot on, or within 0.5 m of, a cell a pole may not stand on moves along the pavement, in `POLE_NUDGE_M` steps, the lower position first, to the nearest point on an allowed cell and at least 0.5 m from
 * any forbidden cell of the side. It is never dropped; when no point of the side serves it stays, and `circuitProblems` names it.
 */
function nudge(want: number, l: Line, ix: CellIndex): number {
  const forbidden: number[] = [];
  for (let k = Math.floor(l.lo / CELL_M); k < Math.ceil(l.hi / CELL_M); k++) if (!allowedCell(ix, cellAt(l.street, l.pavement, k * CELL_M))) forbidden.push(k * CELL_M);
  const clear = (p: number): boolean => {
    if (p < l.lo + POLE_NUDGE_M || p > l.hi - POLE_NUDGE_M) return false;
    return forbidden.every((lo) => (p < lo ? lo - p : p > lo + CELL_M ? p - lo - CELL_M : 0) >= POLE_NUDGE_M);
  };
  if (clear(want)) return want;
  const steps = Math.ceil((l.hi - l.lo) / POLE_NUDGE_M);
  for (let s = 1; s <= steps; s++) {
    const below = round4(want - s * POLE_NUDGE_M);
    if (clear(below)) return below;
    const above = round4(want + s * POLE_NUDGE_M);
    if (clear(above)) return above;
  }
  return want;
}
