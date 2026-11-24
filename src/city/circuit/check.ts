/**
 * Stage 6's checks (ticket 081 K2a): CK1 to CK6 and CK8 of `docs/design/070-K1-circuit.md`, judged on a layer by the streets and edge layers alone (CK7 and CK17 are in `checkroofs.ts`), so a fixture can tamper with a layer and see the rule fail (R-2). CK7's
 * floor is K2d's.
 */

import type { CityBuildingsLayer, CityCircuitLayer, CityEdgeLayer, CityMassLayer, CityPlanStreet, CityPole, CitySide, CityStreetsLayer } from "../../core";
import { CELL_M, CORNER_SPAN_M, POLE_END_CLEAR_M, SPAN_ALONG_MAX_M, TOL } from "./constants";
import { allowedCell, cellAt, indexCells, polePavement, sidePavement, spanM, streetsById, type Pavement } from "./geometry";
import { placeProblems } from "./checkplaces";
import { roofProblems } from "./checkroofs";
import { poleId, spanId } from "./lay";

/** What stage 6 reads of the layers before it. */
export interface CircuitInput {
  readonly streets: CityStreetsLayer;
  readonly edge: CityEdgeLayer;
  /** K2b: the built cells and their open sides (CK9). */
  readonly mass: CityMassLayer;
  /** K2b: the buildings and their fronts (CK9). */
  readonly buildings: CityBuildingsLayer;
}

export interface CircuitProblem {
  /** "CK1" to "CK8". */
  readonly rule: string;
  /** The pole, span or block the rule failed at. */
  readonly id: string;
  readonly reason: string;
}

const SIDES: readonly CitySide[] = ["+x", "-x", "+z", "-z"];
const CORNERS: readonly (readonly [CitySide, CitySide])[] = [
  ["+x", "+z"],
  ["+x", "-z"],
  ["-x", "+z"],
  ["-x", "-z"],
];
const other = (p: Pavement): Pavement => (p === "lo" ? "hi" : "lo");

/** The problems with a layer, empty when CK1 to CK6, CK8 and CK9 to CK11 hold. CK9 to CK11 are judged when the layer has them. */
export function circuitProblems(layer: Pick<CityCircuitLayer, "poles" | "spans"> & Partial<Pick<CityCircuitLayer, "drops" | "lights" | "posts" | "poleModels" | "roofs" | "roofSpans" | "roofKeep">>, input: CircuitInput): CircuitProblem[] {
  const out: CircuitProblem[] = [];
  const add = (rule: string, id: string, reason: string): number => out.push({ rule, id, reason });
  const ix = indexCells(input.edge);
  const byStreet = streetsById(input.streets);
  const poles = new Map(layer.poles.map((p) => [p.id, p] as const));
  const spans = new Map(layer.spans.map((s) => [s.id, s] as const));

  for (const p of layer.poles) {
    const st = byStreet.get(p.street);
    if (st === undefined) {
      add("CK1", p.id, `street ${p.street} does not exist`);
      continue;
    }
    // CK1: a street's poles stand on its one pole pavement; a crossing pole is on the other.
    const expected = polePavement(st, ix);
    if (p.kind === "crossing" ? p.pavement === expected : p.pavement !== expected) add("CK1", p.id, `${p.kind} pole on the ${p.pavement} pavement of ${st.id}, whose pole pavement is ${expected}`);
    // CK2: 0.75 m from the carriageway's edge.
    const across = st.axis === "x" ? p.z_m : p.x_m;
    const want = p.pavement === "lo" ? st.carriage.lo_m - 0.75 : st.carriage.hi_m + 0.75;
    if (Math.abs(across - want) > TOL) add("CK2", p.id, `stands ${across} across ${st.id}, not ${want}`);
    // CK3: on a pavement cell that is no corner, kerb cut or dip.
    if (!allowedCell(ix, cellAt(st, p.pavement, p.along_m))) add("CK3", p.id, "stands on a cell no pole may stand on (a corner, kerb cut, dip or not a pavement)");
  }

  // CK2, CK4: each pole line's end slots, and the along spans between its consecutive poles.
  const expectAlong = new Set<string>();
  for (const b of input.streets.blocks) {
    for (const side of SIDES) {
      const info = b.sides[side];
      const st = byStreet.get(info.street)!;
      if (polePavement(st, ix) !== sidePavement(side)) continue;
      const line = layer.poles.filter((p) => p.block === b.id && p.side === side && p.kind !== "crossing").sort((x, y) => x.along_m - y.along_m);
      const m = spanM(info);
      if (line.length < 2 || Math.abs(line[0]!.along_m - (m.lo + POLE_END_CLEAR_M)) > TOL || Math.abs(line[line.length - 1]!.along_m - (m.hi - POLE_END_CLEAR_M)) > TOL) {
        add("CK2", `${b.id} ${side}`, `its end slots are not ${POLE_END_CLEAR_M} m in from both ends of its span`);
      }
      for (let k = 0; k + 1 < line.length; k++) expectAlong.add(spanId(line[k]!.id, line[k + 1]!.id));
    }
  }
  const have = layer.spans.filter((s) => s.kind === "along");
  for (const s of have) {
    if (!expectAlong.has(s.id)) add("CK4", s.id, "an along span that does not join two consecutive poles of one line");
    if (s.len_m > SPAN_ALONG_MAX_M + TOL) add("CK2", s.id, `${s.len_m} m is longer than ${SPAN_ALONG_MAX_M} m`);
  }
  for (const id of expectAlong) if (!spans.has(id)) add("CK4", id, "two consecutive poles of a line with no along span");

  // CK5, CK6: every block corner with a pole line has one corner span; one with an open end also has its crossing.
  const expectCorner = new Set<string>();
  const expectCross = new Set<string>();
  for (const b of input.streets.blocks) {
    for (const [sa, sb] of CORNERS) {
      const sta = byStreet.get(b.sides[sa].street)!;
      const stb = byStreet.get(b.sides[sb].street)!;
      const lineA = polePavement(sta, ix) === sidePavement(sa);
      const lineB = polePavement(stb, ix) === sidePavement(sb);
      if (!lineA && !lineB) continue;
      const at = (s: CitySide, o: CitySide): number => {
        const m = spanM(b.sides[s]);
        return o.startsWith("+") ? m.hi - POLE_END_CLEAR_M : m.lo + POLE_END_CLEAR_M;
      };
      const pa = poleId(sta.id, sidePavement(sa), at(sa, sb));
      const pb = poleId(stb.id, sidePavement(sb), at(sb, sa));
      expectCorner.add(spanId(pa, pb));
      if (lineA && lineB) continue;
      const farSide = lineA ? sb : sa;
      const far = lineA ? stb : sta;
      const crossing = lineA ? pb : pa;
      const along = lineA ? at(sb, sa) : at(sa, sb);
      const target = b.sides[farSide].across.find((x) => x.span.lo * CELL_M <= along && along < x.span.hi * CELL_M);
      if (target === undefined) {
        add("CK6", `${b.id} ${farSide}`, `an open end at ${along} m with no block across ${far.id}`);
        continue;
      }
      const land = poleId(far.id, other(sidePavement(farSide)), along);
      expectCross.add(spanId(crossing, land));
    }
  }
  const corners = layer.spans.filter((s) => s.kind === "corner");
  for (const s of corners) {
    if (!expectCorner.has(s.id)) add("CK5", s.id, "a corner span that does not join the two end slots at one corner of one block");
    else if (Math.abs(s.len_m - CORNER_SPAN_M) > TOL) add("CK5", s.id, `${s.len_m} m is not ${CORNER_SPAN_M} m`);
  }
  for (const id of expectCorner) if (!spans.has(id)) add("CK5", id, "a block corner with a pole line and no corner span");
  const crosses = layer.spans.filter((s) => s.kind === "cross");
  for (const s of crosses) {
    if (!expectCross.has(s.id)) add("CK6", s.id, "a crossing span that is not an open end's, from its crossing pole to the facing line");
    else crossingProblems(s.id, poles.get(s.a), poles.get(s.b), s.len_m, byStreet, ix, add);
  }
  for (const id of expectCross) if (!spans.has(id)) add("CK6", id, "an open end with no crossing");

  // CK8: one connected network.
  const parent = new Map<string, string>(layer.poles.map((p) => [p.id, p.id] as const));
  const root = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    return r;
  };
  for (const s of layer.spans) {
    if (!parent.has(s.a) || !parent.has(s.b)) add("CK8", s.id, "a span with a pole that does not exist");
    else parent.set(root(s.a), root(s.b));
  }
  const roots = new Set(layer.poles.map((p) => root(p.id)));
  if (roots.size > 1) add("CK8", "city", `${roots.size} separate networks of poles, not one`);
  if (layer.drops !== undefined && layer.lights !== undefined && layer.posts !== undefined) out.push(...placeProblems({ ...layer, drops: layer.drops, lights: layer.lights, posts: layer.posts }, input));
  if (layer.lights !== undefined && layer.posts !== undefined && layer.poleModels !== undefined) out.push(...roofProblems({ ...layer, lights: layer.lights, posts: layer.posts, poleModels: layer.poleModels }, input));
  return out;
}

/** CK6: a crossing span is square to its street, 0.75 m behind both kerbs, and over no junction or crossing cell. */
function crossingProblems(id: string, a: CityPole | undefined, b: CityPole | undefined, len: number, byStreet: ReadonlyMap<string, CityPlanStreet>, ix: ReturnType<typeof indexCells>, add: (rule: string, id: string, reason: string) => number): void {
  if (a === undefined || b === undefined) return;
  const st = byStreet.get(a.street);
  if (st === undefined || a.street !== b.street || a.along_m !== b.along_m || a.pavement === b.pavement) {
    add("CK6", id, "a crossing span that is not square across one street");
    return;
  }
  if (Math.abs(len - (st.carriage.hi_m - st.carriage.lo_m + 1.5)) > TOL) add("CK6", id, `${len} m does not start and end 0.75 m behind the kerbs of ${st.id}`);
  for (let k = st.across0 + 1; k < st.across0 + st.bands.length - 1; k++) {
    const key = st.axis === "x" ? `${Math.floor(a.along_m / CELL_M)},${k}` : `${k},${Math.floor(a.along_m / CELL_M)}`;
    const role = ix.role.get(key);
    if (role === "junction" || role === "crossing") add("CK6", id, `passes over a ${role} cell`);
  }
}

