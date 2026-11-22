/**
 * T-1 and T-2 (ticket 073, section C1; rules every era holds, Josh's card 5 and Q13; readings B-Q3 and B-Q5 of the B pre-check, answered on Josh's delegation). Pure, over a resolved plan.
 * Imports `src/core/` and the resolver only.
 *
 * - **T-1, the circuit stays readable.** Judges only what an era adds or swaps (X-1: a pass is never judged by a clean check); `t1CleanClashes` reports the clean pieces by the same reading, never failing.
 *   - A solid piece covers a pole, a street light or a lamp-post place when its plan footprint (turned), widened by `COVER_M`, contains the point. Its height does not matter.
 *   - A drop end is covered when a piece whose top is over `DROP_HIGH_M` stands over any point of the drop's first `DROP_REACH_M` from the wall.
 *   - A canopy (a tree) is a disc of half the key's wider bound. It covers a point within its radius plus `COVER_M`, and closes over a pole line when it meets an along, corner or crossing span in plan.
 *   - Wires never cover (Q13): `t1WireCrossings` reports a wire over a pole line, never a failure.
 * - **T-2, every node place stays reachable.** The walk graph is every `streets.cells` cell joined to its four neighbours; a cell is closed when a piece standing on the ground (base under `GROUND_BASE_M`)
 *   covers its centre. From a district's first pole (by id) every other pole of the district must be reachable on foot. With no `history` layer the whole city is one group.
 *
 * Where the points come from. The circuit layer is empty until K2 (`CityCircuitLayer` is `{ stage }`), so `circuitPoints` returns none and both checks find nothing to judge on the named runs; K2 fills that one reader.
 * Fixtures pass their own `CircuitPoints`. Where the footprints come from. A piece with a `size` (ground props, traffic pieces, every era add) uses it; a piece without one (facade and building pieces) and a swapped
 * piece use `options.bounds`, the key's kit bounds, which the caller owns (this folder imports no stage's kit).
 */

import type { CalibrationKey, CityPieceList, CityPlacement, CityResolvedPlan } from "../../core";
import { swappedOf, type ResolvedSwap } from "./resolve";

/** A cell is 5 m (the streets' lattice). */
export const CELL_M = 5;
/** A pole's own width: a footprint or canopy is widened by this before it covers a point (B-Q3). */
export const COVER_M = 0.15;
/** A drop's wall point height, and how far from the wall its first stretch runs. */
export const DROP_HIGH_M = 5.5;
export const DROP_REACH_M = 2;
/** Sampling step along a drop's first stretch, metres. */
const DROP_STEP_M = 0.25;
/** A piece whose base is under this stands on the ground for T-2. */
export const GROUND_BASE_M = 2;

export interface KitBounds {
  readonly x_m: number;
  readonly z_m: number;
  readonly h_m: number;
}
/** A key's kit bounds (unturned), or undefined when unknown. */
export type BoundsOf = (key: CalibrationKey) => KitBounds | undefined;

export interface PlanPoint {
  readonly x_m: number;
  readonly z_m: number;
}
export interface CircuitPole extends PlanPoint {
  readonly id: string;
  /** The block whose pavement it stands on, when known; else the nearest block. */
  readonly block?: string;
}
export interface CircuitPoint extends PlanPoint {
  readonly id: string;
}
/** A drop's end on a wall: the wall point (at `DROP_HIGH_M`) and the unit direction out from the wall. */
export interface CircuitDrop {
  readonly id: string;
  readonly wall: PlanPoint;
  readonly out: PlanPoint;
}
export interface CircuitSegment {
  readonly id: string;
  readonly a: PlanPoint;
  readonly b: PlanPoint;
}
/** What T-1 and T-2 read of stage 6 (and of the eras' own wires). */
export interface CircuitPoints {
  readonly poles: readonly CircuitPole[];
  readonly lights: readonly CircuitPoint[];
  readonly lampPlaces: readonly CircuitPoint[];
  readonly drops: readonly CircuitDrop[];
  /** The pole line's spans: along, corner and crossing. */
  readonly lines: readonly CircuitSegment[];
  /** Thin wires (the roof net, makeshift lines): they never cover. */
  readonly wires: readonly CircuitSegment[];
}
export const EMPTY_CIRCUIT: CircuitPoints = Object.freeze({ poles: [], lights: [], lampPlaces: [], drops: [], lines: [], wires: [] });

/** The circuit of a resolved plan. Empty until K2 gives stage 6 its layer. */
export function circuitPoints(_resolved: CityResolvedPlan): CircuitPoints {
  return EMPTY_CIRCUIT;
}

export interface ReadableOptions {
  readonly bounds?: BoundsOf;
  /** Which keys are trees (default: a key with a `Tree` word in its name, as `SM_Env_Tree_01`). */
  readonly isTree?: (key: CalibrationKey) => boolean;
  /** The footprint of a stage 4 build-out tree (its record carries no key). Without it they are not judged or counted. */
  readonly buildoutTree?: { readonly x_m: number; readonly z_m: number; readonly h_m: number };
  /** The circuit to read; default `circuitPoints(resolved)`. */
  readonly circuit?: CircuitPoints;
  /** The swapped pieces; default what `resolvePlan` recorded. */
  readonly swapped?: readonly ResolvedSwap[];
}

export type T1What = "pole" | "light" | "lampPlace" | "dropEnd" | "canopyOverLine";
export interface T1Failure {
  readonly rule: "T-1";
  readonly what: T1What;
  /** The piece that covers: an era add's id, or "<list>[index]" for a swapped or clean piece. */
  readonly piece: string;
  readonly source: "add" | "swap" | "clean";
  /** The pole, light, lamp-post place, drop or span it covers. */
  readonly at: string;
  readonly reason: string;
}
export interface T2Failure {
  readonly rule: "T-2";
  /** The district id, or "city" with no history. */
  readonly district: string;
  /** The pole that cannot be reached from `from`. */
  readonly pole: string;
  readonly from: string;
  readonly reason: string;
}

// ---- pieces ----

interface Placed {
  readonly ref: string;
  readonly source: "add" | "swap" | "clean";
  readonly x: number;
  readonly z: number;
  /** Half the extent in plan, after the turn. */
  readonly hx: number;
  readonly hz: number;
  readonly base: number;
  readonly top: number;
  /** A canopy's radius, or 0 for a solid piece. */
  readonly canopy: number;
}

const item0 = (item: unknown): string => (item as Sized).placement.key;
const DEFAULT_TREE = /(^|[:_])tree(_|$)/i;

function turned(p: CityPlacement, b: KitBounds): { hx: number; hz: number } {
  const r = (p.yaw_deg * Math.PI) / 180;
  const c = Math.abs(Math.cos(r));
  const s = Math.abs(Math.sin(r));
  return { hx: (c * b.x_m + s * b.z_m) / 2, hz: (s * b.x_m + c * b.z_m) / 2 };
}

type Sized = { readonly placement: CityPlacement; readonly size?: KitBounds };

function place(ref: string, source: Placed["source"], item: Sized, useBounds: boolean, o: ReadableOptions, isTree: (k: CalibrationKey) => boolean, treeKind: boolean): Placed | null {
  const pl = item.placement;
  let hx: number;
  let hz: number;
  let h: number;
  const kb = useBounds || item.size === undefined ? o.bounds?.(pl.key) : undefined;
  if (useBounds && kb === undefined) return null;
  if (kb !== undefined) {
    ({ hx, hz } = turned(pl, kb));
    h = kb.h_m;
  } else if (item.size !== undefined) {
    hx = item.size.x_m / 2;
    hz = item.size.z_m / 2;
    h = item.size.h_m;
  } else return null;
  const tree = treeKind || isTree(pl.key);
  return { ref, source, x: pl.x_m, z: pl.z_m, hx, hz, base: pl.y_m, top: pl.y_m + h, canopy: tree ? Math.max(hx, hz) : 0 };
}

interface Collected {
  readonly clean: Placed[];
  readonly judged: Placed[];
}

function collect(resolved: CityResolvedPlan, o: ReadableOptions): Collected {
  const isTree = o.isTree ?? ((k: CalibrationKey): boolean => DEFAULT_TREE.test(k));
  const swaps = o.swapped ?? swappedOf(resolved);
  const swapKeys = new Set(swaps.map((s) => ("id" in s ? s.id : `${s.list}|${s.column ?? ""}|${s.index}`)));
  const clean: Placed[] = [];
  const judged: Placed[] = [];
  const L = resolved.plan.layers;
  const push = (list: CityPieceList, column: number | null, index: number, item: unknown, treeKind = false): void => {
    const swap = swapKeys.has(`${list}|${column ?? ""}|${index}`);
    const ref = column === null ? `${list}[${index}]` : `${list}[${column}][${index}]`;
    const p = place(ref, swap ? "swap" : "clean", item as Sized, swap, o, isTree, treeKind);
    if (p === null && swap) throw new Error(`T-1/T-2: swapped piece ${ref} (key ${item0(item)}) has no kit bounds in options.bounds`);
    if (p !== null) (swap ? judged : clean).push(p);
  };
  L.ground?.props.forEach((it, i) => push("ground.props", null, i, it, it.kind === "tree"));
  L.traffic?.pieces.forEach((it, i) => push("traffic.pieces", null, i, it));
  L.facades?.ground.forEach((it, i) => push("facades.ground", null, i, it));
  L.facades?.dressing?.forEach((it, i) => push("facades.dressing", null, i, it));
  L.facades?.walls?.forEach((it, i) => push("facades.walls", null, i, it));
  L.facades?.roofs?.forEach((it, i) => push("facades.roofs", null, i, it));
  L.facades?.novelty?.forEach((it, i) => push("facades.novelty", null, i, it));
  L.buildings?.columns?.forEach((col, c) => col.pieces.forEach((it, i) => push("buildings.pieces", c, i, it)));
  if (o.buildoutTree !== undefined) {
    const t = o.buildoutTree;
    L.edge?.buildoutTrees.forEach((tr, i) =>
      clean.push({ ref: `edge.buildoutTrees[${i}]`, source: "clean", x: tr.x_m, z: tr.z_m, hx: t.x_m / 2, hz: t.z_m / 2, base: 0, top: t.h_m, canopy: Math.max(t.x_m, t.z_m) / 2 }),
    );
  }
  for (const list of [resolved.adds.tech, resolved.adds.holdout, resolved.adds.ruin]) {
    for (const a of list ?? []) {
      const swap = swapKeys.has(a.id);
      const p = place(a.id, "add", a, swap, o, isTree, false);
      if (p === null) throw new Error(`T-1/T-2: era add ${a.id} (key ${a.placement.key}) has no size and no kit bounds in options.bounds`);
      judged.push(p);
    }
  }
  return { clean, judged };
}

// ---- T-1 ----

const near = (p: Placed, x: number, z: number): boolean => {
  if (p.canopy > 0) return Math.hypot(x - p.x, z - p.z) <= p.canopy + COVER_M;
  return Math.abs(x - p.x) <= p.hx + COVER_M && Math.abs(z - p.z) <= p.hz + COVER_M;
};

function segDist(c: PlanPoint, a: PlanPoint, b: PlanPoint): number {
  const dx = b.x_m - a.x_m;
  const dz = b.z_m - a.z_m;
  const len2 = dx * dx + dz * dz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((c.x_m - a.x_m) * dx + (c.z_m - a.z_m) * dz) / len2));
  return Math.hypot(c.x_m - (a.x_m + t * dx), c.z_m - (a.z_m + t * dz));
}

function judge(pieces: readonly Placed[], c: CircuitPoints): T1Failure[] {
  const out: T1Failure[] = [];
  const hit = (p: Placed, what: T1What, at: string, reason: string): void => {
    out.push({ rule: "T-1", what, piece: p.ref, source: p.source, at, reason });
  };
  for (const p of pieces) {
    for (const q of c.poles) if (near(p, q.x_m, q.z_m)) hit(p, "pole", q.id, `covers pole ${q.id}`);
    for (const q of c.lights) if (near(p, q.x_m, q.z_m)) hit(p, "light", q.id, `covers street light ${q.id}`);
    for (const q of c.lampPlaces) if (near(p, q.x_m, q.z_m)) hit(p, "lampPlace", q.id, `covers lamp-post place ${q.id}`);
    if (p.top > DROP_HIGH_M) {
      for (const d of c.drops) {
        for (let t = 0; t <= DROP_REACH_M + 1e-9; t += DROP_STEP_M) {
          if (near(p, d.wall.x_m + t * d.out.x_m, d.wall.z_m + t * d.out.z_m)) {
            hit(p, "dropEnd", d.id, `stands over drop ${d.id}'s first ${DROP_REACH_M} m from the wall`);
            break;
          }
        }
      }
    }
    if (p.canopy > 0) for (const s of c.lines) if (segDist({ x_m: p.x, z_m: p.z }, s.a, s.b) <= p.canopy) hit(p, "canopyOverLine", s.id, `canopy closes over pole line span ${s.id}`);
  }
  return out;
}

/** The T-1 failures of what the plan's eras add or swap, against the circuit. Empty when nothing is judged. */
export function t1Failures(resolved: CityResolvedPlan, options: ReadableOptions = {}): readonly T1Failure[] {
  const c = options.circuit ?? circuitPoints(resolved);
  if (c.poles.length + c.lights.length + c.lampPlaces.length + c.drops.length + c.lines.length === 0) return [];
  return judge(collect(resolved, options).judged, c);
}

/** The clean pieces that cover the circuit by the same reading: reported each run, never failed (X-1). */
export function t1CleanClashes(resolved: CityResolvedPlan, options: ReadableOptions = {}): readonly T1Failure[] {
  const c = options.circuit ?? circuitPoints(resolved);
  if (c.poles.length + c.lights.length + c.lampPlaces.length + c.drops.length + c.lines.length === 0) return [];
  return judge(collect(resolved, options).clean, c);
}

const cross = (a: PlanPoint, b: PlanPoint, c: PlanPoint): number => (b.x_m - a.x_m) * (c.z_m - a.z_m) - (b.z_m - a.z_m) * (c.x_m - a.x_m);
function segmentsCross(a: PlanPoint, b: PlanPoint, c: PlanPoint, d: PlanPoint): boolean {
  const d1 = cross(a, b, c);
  const d2 = cross(a, b, d);
  const d3 = cross(c, d, a);
  const d4 = cross(c, d, b);
  return d1 * d2 < 0 && d3 * d4 < 0;
}
/** Each thin wire that crosses a pole line in plan, reported and never failed (Q13). */
export function t1WireCrossings(circuit: CircuitPoints): readonly { readonly wire: string; readonly line: string }[] {
  const out: { wire: string; line: string }[] = [];
  for (const w of circuit.wires) for (const l of circuit.lines) if (segmentsCross(w.a, w.b, l.a, l.b)) out.push({ wire: w.id, line: l.id });
  return out;
}

// ---- T-2 ----

/** The cells (as `j * w + i`) closed by a piece standing on the ground: its footprint contains the cell's centre. */
function closedCells(pieces: readonly Placed[], w: number, h: number): Set<number> {
  const closed = new Set<number>();
  for (const p of pieces) {
    if (p.base >= GROUND_BASE_M) continue;
    const i0 = Math.max(0, Math.floor((p.x - p.hx) / CELL_M));
    const i1 = Math.min(w - 1, Math.floor((p.x + p.hx) / CELL_M));
    const j0 = Math.max(0, Math.floor((p.z - p.hz) / CELL_M));
    const j1 = Math.min(h - 1, Math.floor((p.z + p.hz) / CELL_M));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const cx = (i + 0.5) * CELL_M;
        const cz = (j + 0.5) * CELL_M;
        if (Math.abs(cx - p.x) <= p.hx && Math.abs(cz - p.z) <= p.hz) closed.add(j * w + i);
      }
    }
  }
  return closed;
}

/** The T-2 failures of the whole resolved plan: a pole of a district that cannot reach its district's first pole on foot. Empty when there is no pole. */
export function t2Failures(resolved: CityResolvedPlan, options: ReadableOptions = {}): readonly T2Failure[] {
  const c = options.circuit ?? circuitPoints(resolved);
  const streets = resolved.plan.layers.streets;
  if (c.poles.length === 0 || streets === undefined) return [];
  const { w, h } = streets;
  const { clean, judged } = collect(resolved, options);
  const closed = closedCells([...clean, ...judged], w, h);
  const walk = new Set<number>();
  for (const cell of streets.cells) if (!closed.has(cell.j * w + cell.i)) walk.add(cell.j * w + cell.i);

  const blockDistrict = new Map<string, string>();
  for (const d of resolved.history?.districts ?? []) for (const b of d.blocks) blockDistrict.set(b, d.id);
  const districtOf = (p: CircuitPole): string => {
    if (resolved.history === null) return "city";
    let block = p.block;
    if (block === undefined) {
      const pi = Math.floor(p.x_m / CELL_M);
      const pj = Math.floor(p.z_m / CELL_M);
      let best = Infinity;
      for (const b of streets.blocks) {
        const d = Math.max(Math.max(b.i0 - pi, 0, pi - (b.i1 - 1)), Math.max(b.j0 - pj, 0, pj - (b.j1 - 1)));
        if (d < best) {
          best = d;
          block = b.id;
        }
      }
    }
    return (block !== undefined ? blockDistrict.get(block) : undefined) ?? "city";
  };

  const groups = new Map<string, CircuitPole[]>();
  for (const p of c.poles) {
    const d = districtOf(p);
    const g = groups.get(d);
    if (g === undefined) groups.set(d, [p]);
    else g.push(p);
  }
  const cellOf = (p: PlanPoint): number => Math.floor(p.z_m / CELL_M) * w + Math.floor(p.x_m / CELL_M);
  const out: T2Failure[] = [];
  for (const [district, poles] of [...groups].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    poles.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const root = poles[0]!;
    const poleCells = new Set(poles.map(cellOf));
    const start = cellOf(root);
    const seen = new Set<number>([start]);
    const queue = [start];
    for (let q = 0; q < queue.length; q++) {
      const at = queue[q]!;
      // A pole's cell that is closed or off the street is an end, not a way through (the start is the exception).
      if (at !== start && !walk.has(at)) continue;
      const i = at % w;
      const j = (at - i) / w;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue;
        const n = nj * w + ni;
        if (seen.has(n) || !(walk.has(n) || poleCells.has(n))) continue;
        seen.add(n);
        queue.push(n);
      }
    }
    for (const p of poles.slice(1)) {
      if (!seen.has(cellOf(p))) out.push({ rule: "T-2", district, pole: p.id, from: root.id, reason: `pole ${p.id} cannot be reached on foot from pole ${root.id} (district ${district})` });
    }
  }
  return out;
}
