/**
 * What a puzzle may do with roofs (ticket 081 K2d2; CK14 for roofs, CK17d in one job, CK17e's usable spans). Pure, and it reads only the layer's `roofs` and `roofSpans`.
 * A roof span a job uses must be one the layer offers; its ends must be on the district, or its roof end on a neighbouring block (B1-Q5: "Neighbouring blocks too").
 * A neighbouring block is one across one district street (`sides[*].across`), or the block a `junction` roof span reaches from a district roof (the block diagonally across the junction at a district block's corner).
 */

import type { CityCircuitLayer, CityPlanBlock, CityPuzzle, CityRoofMast, CityRoofSpan } from "../../core";
import type { CircuitProblem } from "./check";
import { ROOF_CLEAR_M } from "./constants";
import { crossesInPlan, distToSegment } from "./roofgeom";

export type RoofLayer = Pick<CityCircuitLayer, "poles"> & Partial<Pick<CityCircuitLayer, "roofs" | "roofSpans">>;

/** The district's reach on a layer: which blocks are inside, which neighbour, and who stands where. */
export interface Reach {
  readonly inside: ReadonlySet<string>;
  readonly near: ReadonlySet<string>;
  /** A pole's or roof's block, by id. */
  readonly blockOf: ReadonlyMap<string, string>;
  readonly roofs: ReadonlyMap<string, CityRoofMast>;
  readonly roofSpans: ReadonlyMap<string, CityRoofSpan>;
}

export function reachOf(district: readonly string[], blocks: readonly CityPlanBlock[], layer: RoofLayer): Reach {
  const inside = new Set(district);
  const blockOf = new Map<string, string>(layer.poles.map((p) => [p.id, p.block] as const));
  for (const r of layer.roofs ?? []) blockOf.set(r.id, r.block);
  const near = new Set<string>();
  for (const b of blocks) if (inside.has(b.id)) for (const side of Object.values(b.sides)) for (const a of side.across) near.add(a.block);
  const roofSpans = new Map((layer.roofSpans ?? []).map((s) => [s.id, s] as const));
  for (const s of roofSpans.values()) {
    if (s.over !== "junction") continue;
    const ba = blockOf.get(s.a);
    const bb = blockOf.get(s.b);
    if (ba !== undefined && bb !== undefined && inside.has(ba) !== inside.has(bb)) near.add(inside.has(ba) ? bb : ba);
  }
  for (const b of inside) near.delete(b);
  return { inside, near, blockOf, roofs: new Map((layer.roofs ?? []).map((r) => [r.id, r] as const)), roofSpans };
}

/** CK14 for one roof span: why a job may not use it, or null. At least one end is on the district; a roof end may be on a neighbouring block; a pole end must be on the district. */
export function roofSpanFault(reach: Reach, s: CityRoofSpan): string | null {
  const ends = [s.a, s.b].map((id) => ({ id, block: reach.blockOf.get(id), roof: reach.roofs.has(id) }));
  if (!ends.some((e) => e.block !== undefined && reach.inside.has(e.block))) return "is wholly past the district (a roof span has at least one end on a district block)";
  for (const e of ends) {
    if (e.block === undefined) return `${e.id} is not on the city`;
    if (reach.inside.has(e.block)) continue;
    if (!e.roof) return `${e.id} is a pole of a neighbouring block (a job uses no pole, pole span or drop of one)`;
    if (!reach.near.has(e.block)) return `${e.id} is on ${e.block}, which is more than one street past the district`;
  }
  return null;
}

/** CK17d across one job: no two roof spans it uses cross in plan, none passes within `ROOF_CLEAR_M` of a roof structure it does not end at, and at most one `junction` span per junction. */
export function jobRoofProblems(puzzle: CityPuzzle, layer: RoofLayer): CircuitProblem[] {
  const out: CircuitProblem[] = [];
  const add = (id: string, reason: string): number => out.push({ rule: "CK17d", id, reason });
  const offered = new Map((layer.roofSpans ?? []).map((s) => [s.id, s] as const));
  const roofs = new Map((layer.roofs ?? []).map((r) => [r.id, r] as const));
  const poles = new Map(layer.poles.map((p) => [p.id, p] as const));
  const used = new Map<string, { span: CityRoofSpan; line: string }>();
  for (const l of puzzle.lines) for (const sid of l.run.spans) if (offered.has(sid) && !used.has(sid)) used.set(sid, { span: offered.get(sid)!, line: l.id });
  if (used.size === 0) return out;
  const point = (id: string): { x: number; z: number } | undefined => {
    const r = roofs.get(id);
    const p = poles.get(id);
    return r !== undefined ? { x: r.x_m, z: r.z_m } : p !== undefined ? { x: p.x_m, z: p.z_m } : undefined;
  };
  const list = [...used.values()];
  const byJunction = new Map<string, string>();
  for (const { span, line } of list) {
    if (span.junction === null) continue;
    const first = byJunction.get(span.junction);
    if (first !== undefined) add(line, `${span.id} and ${first} are both junction spans over ${span.junction} (a job uses one per junction)`);
    else byJunction.set(span.junction, span.id);
  }
  for (let m = 0; m < list.length; m++) {
    for (let n = m + 1; n < list.length; n++) {
      const [pa, pb, pc, pd] = [list[m]!.span.a, list[m]!.span.b, list[n]!.span.a, list[n]!.span.b].map(point);
      if (pa && pb && pc && pd && crossesInPlan(pa, pb, pc, pd)) add(list[n]!.line, `${list[n]!.span.id} crosses ${list[m]!.span.id} in plan (a job's roof spans do not cross)`);
    }
  }
  const standing = new Set<string>([...roofs.values()].filter((r) => r.row === "corner").map((r) => r.id));
  for (const n of puzzle.nodes) if ("roof" in n.place) standing.add(n.place.roof);
  for (const { span } of list) for (const e of [span.a, span.b]) if (roofs.has(e)) standing.add(e);
  for (const { span, line } of list) {
    const a = point(span.a);
    const b = point(span.b);
    if (a === undefined || b === undefined) continue;
    for (const id of standing) {
      const r = roofs.get(id);
      if (r === undefined || id === span.a || id === span.b) continue;
      const d = distToSegment({ x: r.x_m, z: r.z_m }, a, b);
      if (d < ROOF_CLEAR_M - 1e-9) add(line, `${span.id} passes ${Math.round(d * 1000) / 1000} m from ${id}, a roof structure it does not end at (under ${ROOF_CLEAR_M} m)`);
    }
  }
  return out;
}
