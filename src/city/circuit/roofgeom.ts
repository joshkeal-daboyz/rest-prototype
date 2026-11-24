/**
 * Stage 6, roof spans: what a span passes over, how high it hangs, and what it clears (ticket 081 K2d1; CK7 and CK17b to d of `docs/design/081-B1-roof-spans.md`). Pure.
 * One `judgeSpan` serves the layer that offers roof span places and the check that judges them, so the two cannot differ.
 */

import type { CityCircuitLayer, CityWireSpan } from "../../core";
import type { CircuitInput } from "./check";
import { CELL_M, ROOF_CLEAR_M, ROOF_JUNCTION_FLOOR_M, ROOF_SPAN_MAX_M, SAG_RATIO, WALK_FLOOR_M } from "./constants";
import { cellKey, indexCells, type CellIndex } from "./geometry";
import { poleEndHeight } from "./polemodel";

export interface Pt {
  readonly x: number;
  readonly z: number;
}

/** One cell a plan segment passes through, and the stretch (t0 to t1, 0 to 1 along the segment) it spends there. */
export interface Run {
  readonly i: number;
  readonly j: number;
  readonly t0: number;
  readonly t1: number;
}

/** The cells a plan segment passes through, in order, exactly (it cuts the lattice lines). */
export function traverse(a: Pt, b: Pt): Run[] {
  const ts = [0, 1];
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  if (dx !== 0) for (let k = Math.floor(Math.min(a.x, b.x) / CELL_M) + 1; k * CELL_M < Math.max(a.x, b.x); k++) ts.push((k * CELL_M - a.x) / dx);
  if (dz !== 0) for (let k = Math.floor(Math.min(a.z, b.z) / CELL_M) + 1; k * CELL_M < Math.max(a.z, b.z); k++) ts.push((k * CELL_M - a.z) / dz);
  ts.sort((p, q) => p - q);
  const out: Run[] = [];
  for (let n = 0; n + 1 < ts.length; n++) {
    const t0 = ts[n]!;
    const t1 = ts[n + 1]!;
    if (t1 - t0 < 1e-9) continue;
    const tm = (t0 + t1) / 2;
    out.push({ i: Math.floor((a.x + dx * tm) / CELL_M), j: Math.floor((a.z + dz * tm) / CELL_M), t0, t1 });
  }
  return out;
}

/** An end of a span in space: a point in plan and its height (the wire's, above the ground). */
export interface End {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly y: number;
  /** A roof end: the cell it stands in (its own cell may be passed over). */
  readonly cell?: { readonly i: number; readonly j: number };
}

/** The wire's height at `t` of a span of 3-D length `len`: the kit's parabola. */
export const hangAt = (ya: number, yb: number, len: number, t: number): number => ya + (yb - ya) * t - 4 * SAG_RATIO * len * t * (1 - t);

/** The lowest the wire gets over t0 to t1 (the parabola is convex, so its low point is the clamped vertex or an end). */
export function lowestOver(ya: number, yb: number, len: number, t0: number, t1: number): number {
  const c = 4 * SAG_RATIO * len;
  const tv = c === 0 ? t0 : Math.min(t1, Math.max(t0, (c - (yb - ya)) / (2 * c)));
  return Math.min(hangAt(ya, yb, len, t0), hangAt(ya, yb, len, t1), hangAt(ya, yb, len, tv));
}

export const len3 = (a: End, b: End): number => Math.hypot(b.x - a.x, b.z - a.z, b.y - a.y);

/** Where two plan segments cross properly (not at a shared end): t along the first and along the second, or null. */
function cross(a: Pt, b: Pt, c: Pt, d: Pt): { readonly t: number; readonly u: number } | null {
  const rx = b.x - a.x;
  const rz = b.z - a.z;
  const sx = d.x - c.x;
  const sz = d.z - c.z;
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c.x - a.x) * sz - (c.z - a.z) * sx) / den;
  const u = ((c.x - a.x) * rz - (c.z - a.z) * rx) / den;
  return t > 1e-6 && t < 1 - 1e-6 && u > 1e-6 && u < 1 - 1e-6 ? { t, u } : null;
}

const distToSegment = (p: Pt, a: Pt, b: Pt): number => {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const l2 = dx * dx + dz * dz;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / l2));
  return Math.hypot(p.x - (a.x + dx * t), p.z - (a.z + dz * t));
};

interface Mark {
  readonly id: string;
  readonly x: number;
  readonly z: number;
}

const CARRIAGE: ReadonlySet<string> = new Set(["lane", "parking", "parkingPlain", "buildout", "crossing"]);

/** What a span is judged against: the street cells, the junctions and their zone, and the pole spans, poles, lights and posts, indexed by cell. */
export interface RoofContext {
  readonly ix: CellIndex;
  /** Street cell to the street it belongs to (null for a junction or pavement corner). */
  readonly streetOf: ReadonlyMap<string, string | null>;
  readonly junctionAt: ReadonlyMap<string, string>;
  readonly junctionStreets: ReadonlyMap<string, ReadonlySet<string>>;
  readonly zone: ReadonlySet<string>;
  readonly poleEnd: ReadonlyMap<string, End>;
  readonly spanEnds: ReadonlyMap<string, readonly [End, End]>;
  readonly spansAt: ReadonlyMap<string, readonly CityWireSpan[]>;
  readonly marksAt: ReadonlyMap<string, readonly Mark[]>;
}

type Judged = Pick<CityCircuitLayer, "poles" | "spans" | "lights" | "posts" | "poleModels">;

export function roofContext(layer: Judged, input: CircuitInput): RoofContext {
  const ix = indexCells(input.edge);
  const streetOf = new Map<string, string | null>(input.edge.cells.map((c) => [cellKey(c.i, c.j), c.street] as const));
  const junctionAt = new Map<string, string>();
  const junctionStreets = new Map<string, ReadonlySet<string>>();
  const zone = new Set<string>();
  for (const jn of input.streets.junctions) {
    junctionStreets.set(jn.id, new Set(jn.streets.map((s) => s.street)));
    for (const c of jn.cells) {
      junctionAt.set(cellKey(c.i, c.j), jn.id);
      zone.add(cellKey(c.i, c.j));
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) if (CARRIAGE.has(ix.role.get(cellKey(c.i + di, c.j + dj)) ?? "")) zone.add(cellKey(c.i + di, c.j + dj));
    }
  }
  const poleEnd = new Map<string, End>();
  for (const p of layer.poles) {
    const h = poleEndHeight(layer.poleModels[p.id]);
    if (h !== null) poleEnd.set(p.id, { id: p.id, x: p.x_m, z: p.z_m, y: h });
  }
  const spanEnds = new Map<string, readonly [End, End]>();
  const spansAt = new Map<string, CityWireSpan[]>();
  for (const s of layer.spans) {
    const a = poleEnd.get(s.a);
    const b = poleEnd.get(s.b);
    if (a === undefined || b === undefined) continue;
    spanEnds.set(s.id, [a, b]);
    for (const r of traverse({ x: a.x, z: a.z }, { x: b.x, z: b.z })) {
      const k = cellKey(r.i, r.j);
      const list = spansAt.get(k);
      if (list === undefined) spansAt.set(k, [s]);
      else if (!list.includes(s)) list.push(s);
    }
  }
  const marksAt = new Map<string, Mark[]>();
  const mark = (m: Mark): void => {
    const k = cellKey(Math.floor(m.x / CELL_M), Math.floor(m.z / CELL_M));
    const list = marksAt.get(k);
    if (list === undefined) marksAt.set(k, [m]);
    else list.push(m);
  };
  for (const p of layer.poles) mark({ id: p.id, x: p.x_m, z: p.z_m });
  for (const l of layer.lights) mark({ id: l.id, x: l.x_m, z: l.z_m });
  for (const q of layer.posts) mark({ id: `post:${q.span}`, x: q.x_m, z: q.z_m });
  return { ix, streetOf, junctionAt, junctionStreets, zone, poleEnd, spanEnds, spansAt, marksAt };
}

export interface Judgement {
  readonly len_m: number;
  readonly over: "pavement" | "street" | "junction";
  readonly street: string | null;
  readonly junction: string | null;
  /** "CK17b" or "CK17d", with why. Empty when the span may be offered. */
  readonly problems: readonly { readonly rule: "CK17b" | "CK17d"; readonly reason: string }[];
}

const round4 = (n: number): number => Math.round(n * 10000) / 10000;

/** CK17b and CK17d on one roof span place from `a` to `b`. A roof end carries its `cell`; a pole end's id is its pole's (its own spans and place are exempt from the plan clearances). */
export function judgeSpan(ctx: RoofContext, a: End, b: End): Judgement {
  const problems: { rule: "CK17b" | "CK17d"; reason: string }[] = [];
  const pa = { x: a.x, z: a.z };
  const pb = { x: b.x, z: b.z };
  const len = Math.hypot(pb.x - pa.x, pb.z - pa.z);
  if (len > ROOF_SPAN_MAX_M + 1e-9) problems.push({ rule: "CK17b", reason: `${round4(len)} m is longer than ${ROOF_SPAN_MAX_M} m` });
  const runs = traverse(pa, pb);
  const own = (r: Run): boolean => [a, b].some((e) => e.cell !== undefined && e.cell.i === r.i && e.cell.j === r.j);
  const streets = new Set<string>();
  const junctions = new Set<string>();
  for (const r of runs) {
    if (own(r)) continue;
    const k = cellKey(r.i, r.j);
    const role = ctx.ix.role.get(k);
    if (role === undefined) {
      problems.push({ rule: "CK17b", reason: `passes over a block (cell ${r.i},${r.j})` });
      break;
    }
    const jn = ctx.junctionAt.get(k);
    if (jn !== undefined) junctions.add(jn);
    else if (CARRIAGE.has(role)) {
      const s = ctx.streetOf.get(k);
      if (s !== undefined && s !== null) streets.add(s);
    }
  }
  if (junctions.size > 1) problems.push({ rule: "CK17b", reason: `crosses ${junctions.size} junctions` });
  if (junctions.size === 0 && streets.size > 1) problems.push({ rule: "CK17b", reason: `crosses ${streets.size} streets` });
  if (junctions.size === 1) {
    const sts = ctx.junctionStreets.get([...junctions][0]!);
    for (const s of streets) if (sts === undefined || !sts.has(s)) problems.push({ rule: "CK17b", reason: `crosses ${s}, not a street of its junction` });
  }
  const over = junctions.size > 0 ? "junction" : streets.size > 0 ? "street" : "pavement";
  const street = over === "street" ? [...streets][0]! : null;
  const junction = over === "junction" ? [...junctions][0]! : null;

  // CK7 / CK17d: heights.
  const l3 = len3(a, b);
  const low = lowestOver(a.y, b.y, l3, 0, 1);
  if (low < WALK_FLOOR_M - 1e-9) problems.push({ rule: "CK17d", reason: `its lowest point is ${round4(low)} m, under ${WALK_FLOOR_M} m` });
  for (const r of runs) {
    if (own(r) || !ctx.zone.has(cellKey(r.i, r.j))) continue;
    const m = lowestOver(a.y, b.y, l3, r.t0, r.t1);
    if (m < ROOF_JUNCTION_FLOOR_M - 1e-9) {
      problems.push({ rule: "CK17d", reason: `${round4(m)} m over the junction zone (cell ${r.i},${r.j}), under ${ROOF_JUNCTION_FLOOR_M} m` });
      break;
    }
  }

  // CK17d: in plan.
  const cells = new Set<string>();
  const near = new Set<string>();
  for (const r of runs) {
    cells.add(cellKey(r.i, r.j));
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) near.add(cellKey(r.i + di, r.j + dj));
  }
  const ownPoles = new Set([a, b].map((e) => e.id));
  const seen = new Set<string>();
  for (const k of cells) {
    for (const s of ctx.spansAt.get(k) ?? []) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      if (ownPoles.has(s.a) || ownPoles.has(s.b)) continue;
      const [sa, sb] = ctx.spanEnds.get(s.id)!;
      const x = cross(pa, pb, { x: sa.x, z: sa.z }, { x: sb.x, z: sb.z });
      if (x === null) continue;
      const hr = hangAt(a.y, b.y, l3, x.t);
      const hp = hangAt(sa.y, sb.y, len3(sa, sb), x.u);
      if (hr < hp + ROOF_CLEAR_M - 1e-9) problems.push({ rule: "CK17d", reason: `passes over ${s.id} at ${round4(hr)} m, ${round4(hr - hp)} m above it, under ${ROOF_CLEAR_M} m` });
    }
  }
  const seenMark = new Set<string>();
  for (const k of near) {
    for (const m of ctx.marksAt.get(k) ?? []) {
      if (seenMark.has(m.id)) continue;
      seenMark.add(m.id);
      if (ownPoles.has(m.id)) continue;
      const d = distToSegment(m, pa, pb);
      if (d < ROOF_CLEAR_M - 1e-9) problems.push({ rule: "CK17d", reason: `passes ${round4(d)} m from ${m.id}, under ${ROOF_CLEAR_M} m` });
    }
  }
  return { len_m: round4(len), over, street, junction, problems };
}
