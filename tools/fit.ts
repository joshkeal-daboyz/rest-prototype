/**
 * The fit tool and the city check (ticket 081 P1). Pure (no file access, no timers): `tools/fitrun.ts` and `tools/check.ts` read and write the files.
 *
 * - `fitPuzzle` searches a city for a district of 1 to `maxBlocks` blocks and an embedding of a schematic puzzle on it (CK12 places, CK13 runs as carriers, CK14's district, CK17's roofs),
 *   and returns a draft city puzzle, or says why there is none. It proposes; the designer decides.
 * - `midRowProblems` is B1b's K2 check 11 (Josh, B1q: "Only where clear (Recommended)"): a mid-row roof structure may be used only where stage 7 left its keep square clear. Stage 6 can't see stage 7, so it is here.
 * - `raiseForScenery` is section S's raise (Josh, 24 Nov 2026: "Raise (Recommended)", "Whole"): each feed's capacity and each rated fusebox's rating grow by the scenery load the solution lights.
 * - `playSummary` and `playDifferences` are the stop rule's measure: does a raised puzzle play the same as its schematic.
 */

import { EventBus, SCENERY_BUILDING_LOAD, validateCityPuzzle } from "../src/core";
import type { CityCircuitLayer, CityNodePlace, CityPlan, CityPlanBlock, CityPuzzle, CityPuzzleCity, CityPuzzleFault, CityPuzzleLine, CityPuzzleNode, CityRoofMast, CityRoofSpan, CityWireSpan, GridNode, Puzzle } from "../src/core";
import { convertCityPuzzle } from "../src/city/circuit/convert";
import type { GridState } from "../src/grid";
import type { CircuitProblem } from "../src/city/circuit/check";
import { cityPuzzleProblems } from "../src/city/circuit/checkpuzzle";
import { reachOf, roofSpanFault } from "../src/city/circuit/roofjobs";
import { ROOF_CLEAR_M } from "../src/city/circuit/constants";
import { crossesInPlan, distToSegment } from "../src/city/circuit/roofgeom";
import { clearDeckOf, footprintOf } from "../src/city/facades/roofs";
import { centreOf, rotate } from "../src/city/facades/place";
import type { CityStageDef } from "../src/city/pipeline/types";
import { BUILT_STAGES, runCity } from "../src/city/stages";
import { streetsStageWith } from "../src/city/streets/stage";
import { analyzePuzzle } from "./analyzerun";
import { replayMoves } from "./checkrun";

/** The most search steps one `fitPuzzle` may take over all its districts. Past it the search says "gave up". */
export const FIT_BUDGET = 300_000;
/** The most steps one district may take before the search moves to the next. */
export const FIT_DISTRICT_STEPS = 4_000;
/** The most blocks a district may have (answer 4: 1 to 4 blocks, no other fallback). */
export const FIT_MAX_BLOCKS = 4;

/** W1 (Josh, 25 Nov 2026): a run may come back towards its reference point by no more than this, in plan (W0's number). */
export const READ_BACK_M = 3;
/** W1: no job roof span comes nearer than this, in plan, to the feed's pole or its entering span (W0's number). */
export const FEED_CLEAR_M = 6;

const EPS = 1e-9;

// ---- the city a puzzle is laid on ----

const planMemo = new Map<string, CityPlan>();

/** The plan a city puzzle names, built through stage 7 (the circuit and the facades), once per process: `6x6:1:oneway` is the pilot's. */
export function cityPlanFor(city: CityPuzzleCity): CityPlan {
  const key = `${city.blocksX}x${city.blocksZ}:${city.seed}:${city.oneWay ? "on" : "off"}`;
  const known = planMemo.get(key);
  if (known !== undefined) return known;
  const stages: CityStageDef[] = BUILT_STAGES.slice(0, BUILT_STAGES.findIndex((s) => s.name === "facades") + 1).map((s) => (s.name === "streets" && !city.oneWay ? (streetsStageWith(0) as unknown as CityStageDef) : s));
  const r = runCity({ blocksX: city.blocksX, blocksZ: city.blocksZ, seed: city.seed }, "facades", stages);
  if (!r.ok) throw new Error(`the city ${key} does not build: ${r.failure.reason}`);
  planMemo.set(key, r.plan);
  return r.plan;
}

// ---- the mid-row clearance check (B1b K2 check 11) ----

type Rect = { readonly x0: number; readonly x1: number; readonly z0: number; readonly z1: number };

const clashCache = new WeakMap<CityPlan, ReadonlyMap<string, readonly string[]>>();

/** For each mid-row roof structure place of the plan: what stage 7 stands in its keep square (the kinds of roof piece, "exit door" for an exit's clear deck). Empty when it is clear. */
export function midRowClashes(plan: CityPlan): ReadonlyMap<string, readonly string[]> {
  const known = clashCache.get(plan);
  if (known !== undefined) return known;
  const out = new Map<string, readonly string[]>();
  const layer = plan.layers.circuit;
  const columns = new Map((plan.layers.buildings?.columns ?? []).map((c) => [`${c.i},${c.j}`, c] as const));
  const pieces = new Map<string, NonNullable<NonNullable<CityPlan["layers"]["facades"]>["roofs"]>[number][]>();
  for (const p of plan.layers.facades?.roofs ?? []) {
    const k = `${p.cell.i},${p.cell.j}`;
    pieces.set(k, [...(pieces.get(k) ?? []), p]);
  }
  for (const m of layer?.roofs ?? []) {
    if (m.row !== "mid") continue;
    const col = columns.get(`${m.cell.i},${m.cell.j}`);
    const hits: string[] = [];
    if (col !== undefined) {
      const c = centreOf(col);
      const at = rotate(-col.yaw, m.x_m - c.x, m.z_m - c.z);
      const keep: Rect = { x0: at.x - m.keep_half_m, x1: at.x + m.keep_half_m, z0: at.z - m.keep_half_m, z1: at.z + m.keep_half_m };
      const meets = (r: Rect): boolean => Math.min(r.x1, keep.x1) - Math.max(r.x0, keep.x0) > EPS && Math.min(r.z1, keep.z1) - Math.max(r.z0, keep.z0) > EPS;
      for (const p of pieces.get(`${m.cell.i},${m.cell.j}`) ?? []) {
        if (meets(footprintOf(col, p.placement))) hits.push(p.kind);
        else if (p.kind === "exit") {
          const d = clearDeckOf(col, p.placement);
          if (meets({ x0: d.left, x1: d.right, z0: d.back, z1: d.front })) hits.push("exit door");
        }
      }
    }
    out.set(m.id, hits);
  }
  clashCache.set(plan, out);
  return out;
}

/** The roof structures a puzzle uses: a node on one, or the end of a span of a run. */
function usedRoofs(puzzle: CityPuzzle, layer: Pick<CityCircuitLayer, "roofSpans"> & Partial<Pick<CityCircuitLayer, "roofs">>): Set<string> {
  const ids = new Set((layer.roofs ?? []).map((r) => r.id));
  const roofSpans = new Map((layer.roofSpans ?? []).map((s) => [s.id, s] as const));
  const used = new Set<string>();
  for (const n of puzzle.nodes) if ("roof" in n.place) used.add(n.place.roof);
  for (const l of puzzle.lines) for (const sid of l.run.spans) {
    const s = roofSpans.get(sid);
    if (s !== undefined) for (const e of [s.a, s.b]) if (ids.has(e)) used.add(e);
  }
  return used;
}

/** B1b's K2 check 11: a mid-row roof structure a puzzle uses has its keep square clear of stage 7's roof pieces. Runs on the plan after stage 7. */
export function midRowProblems(puzzle: CityPuzzle, plan: CityPlan): CircuitProblem[] {
  const layer = plan.layers.circuit;
  if (layer === undefined) return [];
  const clashes = midRowClashes(plan);
  const out: CircuitProblem[] = [];
  for (const id of [...usedRoofs(puzzle, layer)].sort()) {
    const hit = clashes.get(id);
    if (hit !== undefined && hit.length > 0) out.push({ rule: "CK17a", id, reason: `a mid-row roof structure that stage 7 left a ${[...new Set(hit)].join(", ")} on, inside its keep square (a mid-row place is used only where the roof is clear)` });
  }
  return out;
}

// ---- the building-target rules (ticket 081 W1) ----

interface Pt2 {
  readonly x: number;
  readonly z: number;
}

/** The part of a winning state the read-outward rule reads: which lines carry power, from which feed, entered at which node. */
export type WinningState = Pick<GridState, "powered" | "flowFrom" | "feedOf">;

const segDist = (a: Pt2, b: Pt2, c: Pt2, d: Pt2): number => (crossesInPlan(a, b, c, d) ? 0 : Math.min(distToSegment(a, c, d), distToSegment(b, c, d), distToSegment(c, a, b), distToSegment(d, a, b)));

/** How far a walk comes back towards `ref`: the most any point falls short of the farthest one before it. */
function readBack(seq: readonly Pt2[], ref: Pt2): number {
  let far = -Infinity;
  let worst = 0;
  for (const p of seq) {
    const d = Math.hypot(p.x - ref.x, p.z - ref.z);
    worst = Math.max(worst, far - d);
    far = Math.max(far, d);
  }
  return worst;
}

/** Lines on a cycle of the graph, all feeds counted as one node (W0; Josh: ring lines read outward from where they take power). */
export function ringLinesOf(lines: readonly { readonly id: string; readonly from: string; readonly to: string }[], feeds: ReadonlySet<string>): Set<string> {
  const key = (id: string): string => (feeds.has(id) ? "~feeds" : id);
  const out = new Set<string>();
  for (const l of lines) {
    const a = key(l.from);
    const b = key(l.to);
    if (a === b) {
      out.add(l.id);
      continue;
    }
    const adj = new Map<string, string[]>();
    for (const x of lines) {
      if (x.id === l.id) continue;
      const u = key(x.from);
      const w = key(x.to);
      adj.set(u, [...(adj.get(u) ?? []), w]);
      adj.set(w, [...(adj.get(w) ?? []), u]);
    }
    const seen = new Set([a]);
    const q = [a];
    while (q.length > 0) {
      const u = q.shift()!;
      for (const w of adj.get(u) ?? []) if (!seen.has(w)) (seen.add(w), q.push(w));
    }
    if (seen.has(b)) out.add(l.id);
  }
  return out;
}

/**
 * How far a line's run (in the order from its `from` node) comes back. With a winning state the line is read from the end current enters by (a powered non-ring line from its feed, a ring line from its own
 * first structure); a line dead in it, or no state, passes if it reads outward from either end. Null when a feed the reading needs is not placed yet (the search asks early).
 */
function backOfLine(seq: readonly Pt2[], line: { readonly id: string; readonly to: string }, ring: boolean, win: WinningState | undefined, feedPt: (feedId: string) => Pt2 | undefined, allFeeds: readonly string[]): number | null {
  if (seq.length === 0) return 0;
  const rev = [...seq].reverse();
  if (win !== undefined && win.powered.has(line.id)) {
    // Current enters the converted line (split by S1 into `L~a`, `L`, `L~b`) at `L~h2` when it runs backwards; on a plain schematic line, at its `to` node.
    const entered = win.flowFrom.get(line.id);
    const s = entered === line.to || entered === `${line.id}~h2` ? rev : seq;
    if (ring) return readBack(s, s[0]!);
    const f = feedPt(win.feedOf.get(line.id) ?? "");
    return f === undefined ? null : readBack(s, f);
  }
  if (ring) return Math.min(readBack(seq, seq[0]!), readBack(rev, rev[0]!));
  const pts = allFeeds.map(feedPt);
  if (pts.some((p) => p === undefined)) return null;
  return Math.min(...pts.flatMap((f) => [readBack(seq, f!), readBack(rev, f!)]));
}

/** A roof span's plan distance from the feed's pole and its entering span; one sharing a pole with the entering span is judged by its far end (W0). */
function feedClearance(F: Pt2, E: { a: string; b: string }, R: { a: string; b: string }, at: ReadonlyMap<string, Pt2>): number {
  const ea = at.get(E.a)!;
  const eb = at.get(E.b)!;
  const ra = at.get(R.a)!;
  const rb = at.get(R.b)!;
  const dist = distToSegment(F, ra, rb);
  const shared = [R.a, R.b].find((x) => x === E.a || x === E.b);
  if (shared === undefined) return Math.min(dist, segDist(ra, rb, ea, eb));
  const rFar = at.get(R.a === shared ? R.b : R.a)!;
  const eFar = at.get(E.a === shared ? E.b : E.a)!;
  return Math.min(dist, distToSegment(rFar, ea, eb), distToSegment(eFar, ra, rb));
}

const LAMP_REASON = "a city lamp stands on a building, fed by its drop (Josh, 25 Nov 2026)";

/** W1's rules for an authored city puzzle: lamps on buildings; every line reads outward; no roof span near the feed; no two job spans cross. `geometry` false skips all but the lamp rule. */
export function buildingTargetProblems(puzzle: CityPuzzle, plan: CityPlan, win?: WinningState, geometry = true): CircuitProblem[] {
  const out: CircuitProblem[] = [];
  const bad = new Set<string>();
  for (const n of puzzle.nodes) if (n.type === "lamp" && !("building" in n.place)) bad.add(n.id);
  for (const l of puzzle.lines) if (l.run.lead !== undefined) bad.add(l.to);
  for (const id of [...bad].sort()) out.push({ rule: "lamp", id, reason: LAMP_REASON });
  const layer = plan.layers.circuit;
  if (!geometry || layer === undefined) return out;

  const at = new Map<string, Pt2>();
  for (const p of layer.poles) at.set(p.id, { x: p.x_m, z: p.z_m });
  for (const r of layer.roofs ?? []) at.set(r.id, { x: r.x_m, z: r.z_m });
  const ends = new Map<string, { a: string; b: string; roof: boolean }>();
  for (const s of layer.spans) ends.set(s.id, { a: s.a, b: s.b, roof: false });
  for (const s of layer.roofSpans ?? []) ends.set(s.id, { a: s.a, b: s.b, roof: true });
  const vertexOf = new Map<string, string | undefined>();
  for (const n of puzzle.nodes) vertexOf.set(n.id, "pole" in n.place ? n.place.pole : "roof" in n.place ? n.place.roof : undefined);
  const feeds = puzzle.nodes.filter((n) => n.type === "feed").map((n) => n.id);
  const feedPt = (id: string): Pt2 | undefined => {
    const v = vertexOf.get(id);
    return v === undefined ? undefined : at.get(v);
  };
  const ring = ringLinesOf(puzzle.lines, new Set(feeds));

  for (const l of puzzle.lines) {
    const seq: Pt2[] = [];
    let v = vertexOf.get(l.from);
    if (v !== undefined && at.has(v)) seq.push(at.get(v)!);
    let broken = false;
    for (const sid of l.run.spans) {
      const e = ends.get(sid);
      if (e === undefined || v === undefined || (e.a !== v && e.b !== v)) {
        broken = true;
        break;
      }
      v = e.a === v ? e.b : e.a;
      seq.push(at.get(v)!);
    }
    if (broken) continue;
    const back = backOfLine(seq, l, ring.has(l.id), win, feedPt, feeds);
    if (back !== null && back > READ_BACK_M + 1e-9) out.push({ rule: "reads-outward", id: l.id, reason: `line ${l.id} comes back ${back.toFixed(1)} m towards ${ring.has(l.id) ? "where it takes its power" : "its feed"} (at most ${READ_BACK_M} m; Josh, 25 Nov 2026: a route reads outward)` });
  }

  const jobSpans = [...new Set(puzzle.lines.flatMap((l) => l.run.spans))].filter((s) => ends.has(s));
  for (const fid of feeds) {
    const F = feedPt(fid);
    const fl = puzzle.lines.find((l) => l.from === fid || l.to === fid);
    if (F === undefined || fl === undefined || fl.run.spans.length === 0) continue;
    const eid = fl.from === fid ? fl.run.spans[0]! : fl.run.spans[fl.run.spans.length - 1]!;
    const E = ends.get(eid);
    if (E === undefined) continue;
    for (const sid of jobSpans) {
      const R = ends.get(sid)!;
      if (!R.roof || sid === eid) continue;
      const d = feedClearance(F, E, R, at);
      if (d < FEED_CLEAR_M - 1e-9) out.push({ rule: "feed-clear", id: sid, reason: `roof span ${sid} comes within ${d.toFixed(1)} m of feed ${fid}'s pole or entering span (at least ${FEED_CLEAR_M} m)` });
    }
  }
  for (let i = 0; i < jobSpans.length; i++) {
    for (let j = i + 1; j < jobSpans.length; j++) {
      const A = ends.get(jobSpans[i]!)!;
      const B = ends.get(jobSpans[j]!)!;
      if (A.a === B.a || A.a === B.b || A.b === B.a || A.b === B.b) continue;
      if (crossesInPlan(at.get(A.a)!, at.get(A.b)!, at.get(B.a)!, at.get(B.b)!)) out.push({ rule: "crossing", id: jobSpans[i]!, reason: `spans ${jobSpans[i]} and ${jobSpans[j]} cross in plan` });
    }
  }
  return out;
}

/**
 * Every problem the city check finds: CK12 to CK14 and CK17d (the circuit's own), CK17a's mid-row clearance, then W1's building-target rules. Empty when the puzzle converts and its roofs are clear.
 * `win` is the winning state of the note's solution: with it the read-outward rule is exact; without it each line passes if it reads outward from either end.
 */
export function cityCheckProblems(puzzle: CityPuzzle, plan: CityPlan, win?: WinningState): CircuitProblem[] {
  const base = [...cityPuzzleProblems(puzzle, plan), ...midRowProblems(puzzle, plan)];
  return [...base, ...buildingTargetProblems(puzzle, plan, win, base.length === 0)];
}

// ---- the raised numbers (section S) ----

const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;

/** A schematic's unlimited twin: no feed capacity and no fuse rating. */
function unlimited(p: Puzzle): Puzzle {
  // A lamp no line reaches is a target that is never lit, so the job is never complete and the solution's every move is taken (the real win may need a move that unlimited numbers make unnecessary).
  const never: GridNode = { id: "~never", type: "lamp", pos: [0, 0], load: 1 };
  return {
    ...p,
    capacity: null,
    target: [...(p.target ?? []), never.id],
    nodes: [
      ...p.nodes.map((n): GridNode => {
        if (n.type === "feed") return { ...n, capacity: null };
        if (n.type === "fusebox") {
          const { rating: _rating, ...rest } = n;
          return rest;
        }
        return n;
      }),
      never,
    ],
  };
}

/**
 * Section S's raise: convert the puzzle (S1), replay `solution` on `src/grid/` with every capacity and rating unlimited, once with the scenery lamps and once without, and return the file with
 * each feed's `capacity` (or the top-level `capacity`) and each rated fusebox's `rating` raised by the extra load at the end of the solution. `base` is the file whose numbers are raised (default: `puzzle`
 * itself); give the schematic or the unraised draft to raise from its numbers, so a file already raised comes back as it was.
 */
export function raiseForScenery(puzzle: CityPuzzle, plan: CityPlan, solution: readonly string[], base: { readonly capacity: number | null; readonly nodes: readonly { readonly id: string; readonly type: string; readonly capacity?: number | null; readonly rating?: number }[] } = puzzle): CityPuzzle {
  const conv = convertCityPuzzle(puzzle, plan);
  const lamps = new Set(Object.values(conv.scenery ?? {}));
  const withScenery = unlimited(conv.puzzle);
  const without: Puzzle = {
    ...withScenery,
    nodes: withScenery.nodes.filter((n) => !lamps.has(n.id)),
    lines: withScenery.lines.filter((l) => !lamps.has(l.to)),
  };
  const a = replayMoves(withScenery, solution);
  const b = replayMoves(without, solution);
  if (a.failure !== undefined || b.failure !== undefined) throw new Error(`the solution does not play on ${puzzle.id}: ${a.failure ?? b.failure}`);
  const baseNode = new Map(base.nodes.map((n) => [n.id, n] as const));
  let extraTop = 0;
  const nodes = puzzle.nodes.map((n): CityPuzzleNode => {
    const was = baseNode.get(n.id);
    if (n.type === "feed") {
      const extra = (a.state.feeds.get(n.id)?.load ?? 0) - (b.state.feeds.get(n.id)?.load ?? 0);
      const cap = was?.capacity;
      if (cap !== undefined && cap !== null) return { ...n, capacity: round6(cap + extra) };
      if (cap === undefined) extraTop += extra;
      return n;
    }
    if (n.type === "fusebox" && was?.rating !== undefined) {
      const extra = (a.state.fuseLoad.get(n.id) ?? 0) - (b.state.fuseLoad.get(n.id) ?? 0);
      return { ...n, rating: round6(was.rating + extra) };
    }
    return n;
  });
  const capacity = base.capacity === null ? null : round6(base.capacity + extraTop);
  return { ...puzzle, capacity, nodes };
}

/** The numbers of a puzzle that the raise changes, as "feed capacity 3", "fb_A rating 3": for a "What changed" line. */
export function numbersOf(p: { readonly capacity: number | null; readonly nodes: readonly { readonly id: string; readonly type: string; readonly capacity?: number | null; readonly rating?: number }[] }): string[] {
  const out: string[] = [];
  if (p.capacity !== null) out.push(`capacity ${p.capacity}`);
  for (const n of p.nodes) {
    if (n.type === "feed" && n.capacity !== undefined && n.capacity !== null) out.push(`${n.id} capacity ${n.capacity}`);
    if (n.type === "fusebox" && n.rating !== undefined) out.push(`${n.id} rating ${n.rating}`);
  }
  return out;
}

// ---- the fit ----

/**
 * Does the draft, raised by the solution, start as its schematic starts (the same lit lamps, readable faults, blown fuses and brownout, scenery left out) and win by the solution? A fit that does not is
 * passed over for the next embedding: a fuse that blows at power-up under scenery is the pre-check's failure for 09 and 12, and a re-lay (answer 4's order, (a)) is another embedding.
 */
function playsLikeSchematic(schematic: Puzzle, draft: CityPuzzle, plan: CityPlan, solution: readonly string[]): boolean {
  const conv = convertCityPuzzle(raiseForScenery(draft, plan, solution), plan);
  const hidden = new Set(conv.hidden ?? []);
  const a = replayMoves(schematic, []).state;
  const b = replayMoves(conv.puzzle, []).state;
  const same = (x: Iterable<string>, y: Iterable<string>): boolean => [...x].sort().join() === [...y].sort().join();
  const blown = (s: typeof a): string[] => s.faults.filter((f) => f.kind === "blown-fuse").map((f) => f.at);
  if (a.brownout !== b.brownout || !same(a.lit, [...b.lit].filter((id) => !hidden.has(id))) || !same(a.readableFaults, b.readableFaults) || !same(blown(a), blown(b))) return false;
  const end = replayMoves(conv.puzzle, solution);
  return end.failure === undefined && end.state.complete;
}

export interface FitOptions {
  /** Only this district's blocks (`--blocks`). */
  readonly blocks?: readonly string[];
  readonly maxBlocks?: number;
  /** Total search steps; default `FIT_BUDGET`. */
  readonly budget?: number;
  /** The intended solution (the check block's moves). Given, the draft's numbers are raised by it (section S). */
  readonly solution?: readonly string[];
  /** Blocks the search keeps out of (`--avoid`, W1): no district holds any of them. */
  readonly avoid?: readonly string[];
}

export type FitResult =
  | { readonly ok: true; readonly draft: CityPuzzle; readonly district: readonly string[]; readonly steps: number; readonly districtsTried: number }
  | { readonly ok: false; readonly kind: "no-fit" | "gave-up"; readonly message: string; readonly steps: number };

interface Edge {
  readonly id: string;
  readonly a: string;
  readonly b: string;
  /** Set on a roof span: the junction it passes over, if any (CK17d allows one such span a junction in a job). */
  readonly roof?: { readonly junction: string | null };
}

/** The plan's attachments per pole (CK12's count: spans and drops), once. */
const attachCache = new WeakMap<CityPlan, ReadonlyMap<string, number>>();
function attachments(layer: CityCircuitLayer, plan: CityPlan): ReadonlyMap<string, number> {
  const known = attachCache.get(plan);
  if (known !== undefined) return known;
  const m = new Map<string, number>();
  const bump = (id: string): void => void m.set(id, (m.get(id) ?? 0) + 1);
  for (const s of layer.spans) (bump(s.a), bump(s.b));
  for (const d of layer.drops) bump(d.pole);
  attachCache.set(plan, m);
  return m;
}

/** CK17e's roof needs, as `checkplaces.ts` has them. */
const roofNeed = (type: GridNode["type"], degree: number): number => (type === "switch" ? 3 : type === "breaker" || type === "battery" || type === "fusebox" ? 2 : type === "junction" ? Math.max(3, degree) : 1);
const poleNeed = (type: GridNode["type"]): number => (type === "switch" ? 3 : type === "breaker" || type === "battery" || type === "fusebox" ? 2 : 0);

/** Connected sets of 1 to `n` blocks that touch across streets, smallest first, in a stable order. */
function districtsOf(blocks: readonly CityPlanBlock[], n: number): string[][] {
  const across = new Map<string, string[]>();
  for (const b of blocks) across.set(b.id, [...new Set(Object.values(b.sides).flatMap((s) => s.across.map((a) => a.block)))].sort());
  const seen = new Set<string>();
  const out: string[][] = [];
  let frontier: string[][] = blocks.map((b) => [b.id]);
  for (const f of frontier) (seen.add(f.join(",")), out.push(f));
  for (let k = 2; k <= n; k++) {
    const next: string[][] = [];
    for (const f of frontier) {
      for (const b of f) {
        for (const c of across.get(b) ?? []) {
          if (f.includes(c)) continue;
          const g = [...f, c].sort();
          const key = g.join(",");
          if (seen.has(key)) continue;
          seen.add(key);
          next.push(g);
        }
      }
    }
    next.sort((x, y) => (x.join(",") < y.join(",") ? -1 : 1));
    out.push(...next);
    frontier = next;
  }
  return out;
}

/** What one district offers, and the shortfall of a schematic against it (CK12's table). */
interface Offer {
  readonly edges: readonly Edge[];
  readonly inc: ReadonlyMap<string, readonly Edge[]>;
  readonly terms: ReadonlyMap<string, readonly string[]>;
  readonly vertices: readonly string[];
  readonly feedPlaces: readonly { readonly q: string; readonly e: Edge }[];
  readonly at: ReadonlyMap<string, { readonly x: number; readonly z: number }>;
  readonly inD: (v: string) => boolean;
  readonly usable: (v: string) => readonly Edge[];
  readonly att: (v: string) => number;
  readonly isRoof: (v: string) => boolean;
  readonly reach: ReturnType<typeof reachOf>;
}

function offerOf(plan: CityPlan, district: readonly string[], clash: ReadonlyMap<string, readonly string[]>): Offer {
  const layer = plan.layers.circuit!;
  const blocks = plan.layers.streets!.blocks;
  const reach = reachOf(district, blocks, layer);
  const attach = attachments(layer, plan);
  const masts = new Map<string, CityRoofMast>();
  for (const r of layer.roofs ?? []) if (r.row === "corner" || (clash.get(r.id)?.length ?? 1) === 0) masts.set(r.id, r);
  const isRoof = (v: string): boolean => v.startsWith("roof:");
  const inD = (v: string): boolean => reach.inside.has(reach.blockOf.get(v) ?? "");
  const inJ = (v: string): boolean => inD(v) || (isRoof(v) && masts.has(v) && reach.near.has(reach.blockOf.get(v) ?? ""));
  const edges: Edge[] = [];
  const add = (s: CityWireSpan | CityRoofSpan): void => void edges.push(s.kind === "roof" ? { id: s.id, a: s.a, b: s.b, roof: { junction: s.junction } } : { id: s.id, a: s.a, b: s.b });
  const at = new Map<string, { x: number; z: number }>();
  for (const p of layer.poles) at.set(p.id, { x: p.x_m, z: p.z_m });
  for (const r of layer.roofs ?? []) at.set(r.id, { x: r.x_m, z: r.z_m });
  // CK17d: a roof span that passes within ROOF_CLEAR_M of a corner structure (always standing) it does not end at is never offered.
  const corners = (layer.roofs ?? []).filter((r) => r.row === "corner");
  for (const s of layer.spans) if (inD(s.a) || inD(s.b)) add(s);
  for (const s of layer.roofSpans ?? []) {
    if ((isRoof(s.a) && !masts.has(s.a)) || (isRoof(s.b) && !masts.has(s.b))) continue;
    if (roofSpanFault(reach, s) !== null) continue;
    const pa = at.get(s.a);
    const pb = at.get(s.b);
    if (pa !== undefined && pb !== undefined && corners.some((r) => r.id !== s.a && r.id !== s.b && distToSegment({ x: r.x_m, z: r.z_m }, pa, pb) < ROOF_CLEAR_M - 1e-9)) continue;
    add(s);
  }
  const inc = new Map<string, Edge[]>();
  for (const e of edges) for (const v of [e.a, e.b]) inc.set(v, [...(inc.get(v) ?? []), e]);
  const usableMap = new Map<string, Edge[]>();
  for (const [v, es] of inc) usableMap.set(v, es.filter((e) => inJ(e.a) && inJ(e.b) && (inD(e.a) || inD(e.b))));
  const terms = new Map<string, string[]>();
  const poleBlock = new Map(layer.poles.map((p) => [p.id, p.block] as const));
  for (const d of layer.drops) if (reach.inside.has(poleBlock.get(d.pole) ?? "")) terms.set(d.pole, [...(terms.get(d.pole) ?? []), `b:${d.building}`]);
  // W1: a lamp stands on a building by its drop; a lamp post is never offered.
  const vertices = [...layer.poles.filter((p) => inD(p.id)).map((p) => p.id), ...[...masts.keys()].filter(inJ)];
  const feedPlaces: { q: string; e: Edge }[] = [];
  for (const e of edges) {
    const ia = inD(e.a);
    const ib = inD(e.b);
    if (ia === ib) continue;
    const q = ia ? e.b : e.a;
    if (isRoof(q) && !inJ(q)) continue;
    feedPlaces.push({ q, e });
  }
  return { edges, inc, terms, vertices, feedPlaces, at, inD, usable: (v) => usableMap.get(v) ?? [], att: (v) => attach.get(v) ?? 0, isRoof, reach };
}

/** The ports a vertex offers: usable spans and terminals. */
const portsOf = (o: Offer, v: string): number => o.usable(v).length + (o.terms.get(v)?.length ?? 0);

/** Can a node of this type and degree stand on this vertex (CK12 and CK17e)? */
function allowed(o: Offer, type: GridNode["type"], degree: number, v: string): boolean {
  if (type === "lamp") return false;
  if (o.isRoof(v)) return type !== "feed" && o.usable(v).length >= roofNeed(type, degree);
  return type === "feed" || o.att(v) >= poleNeed(type);
}

/** A shortfall: what the schematic needs more of than the district has. Null when the district has enough in count. */
function shortfall(p: Puzzle, o: Offer): { readonly text: string; readonly deficit: number } | null {
  const deg = new Map<string, number>();
  for (const l of p.lines) for (const id of [l.from, l.to]) deg.set(id, (deg.get(id) ?? 0) + 1);
  const found: { text: string; deficit: number }[] = [];
  const feeds = p.nodes.filter((n) => n.type === "feed");
  const entering = new Set(o.feedPlaces.map((f) => f.q));
  if (feeds.length > entering.size) found.push({ text: `feed, needs ${feeds.length}, district has ${entering.size}`, deficit: feeds.length - entering.size });
  const lamps = p.nodes.filter((n) => n.type === "lamp").length;
  const terminals = [...o.terms.values()].reduce((s, t) => s + t.length, 0);
  const terminalPlaces = new Set([...o.terms.values()].flat().map((t) => t.slice(2))).size;
  if (lamps > terminalPlaces) found.push({ text: `lamp, needs ${lamps}, district has ${terminalPlaces}`, deficit: lamps - terminalPlaces });
  void terminals;
  for (const type of ["switch", "breaker", "fusebox", "battery", "junction"] as const) {
    for (const n of p.nodes) {
      if (n.type !== type) continue;
      const d = deg.get(n.id) ?? 0;
      const best = Math.max(0, ...o.vertices.filter((v) => allowed(o, type, d, v)).map((v) => portsOf(o, v)));
      if (best < d) found.push({ text: `${type} ${n.id}, needs ${d} lines at one place, district's best is ${best}`, deficit: d - best });
    }
  }
  // Counts: nodes needing 3 attachments (switches), then 2 or more (and the switches).
  const placesWith = (min: number): number => o.vertices.filter((v) => (o.isRoof(v) ? o.usable(v).length >= min : o.att(v) >= min)).length;
  const count = (types: readonly string[]): number => p.nodes.filter((n) => types.includes(n.type)).length;
  const c3 = count(["switch"]);
  if (c3 > placesWith(3)) found.push({ text: `switch, needs ${c3}, district has ${placesWith(3)}`, deficit: c3 - placesWith(3) });
  const c2 = count(["switch", "breaker", "fusebox", "battery"]);
  if (c2 > placesWith(2)) found.push({ text: `switch, breaker, fusebox and battery, needs ${c2}, district has ${placesWith(2)} places with 2 or more attachments`, deficit: c2 - placesWith(2) });
  const nonLamp = p.nodes.filter((n) => n.type !== "lamp" && n.type !== "feed").length;
  if (nonLamp > o.vertices.length) found.push({ text: `places, needs ${nonLamp}, district has ${o.vertices.length}`, deficit: nonLamp - o.vertices.length });
  if (found.length === 0) return null;
  found.sort((x, y) => y.deficit - x.deficit);
  return { text: found[0]!.text, deficit: found.reduce((s, f) => s + f.deficit, 0) };
}

interface Route {
  /** The vertex the walk starts from. */
  readonly from: string;
  readonly edges: readonly Edge[];
}

type Searched = { readonly ok: true; readonly draft: CityPuzzle; readonly steps: number } | { readonly ok: false; readonly why: "exhausted" | "budget"; readonly steps: number };

/** One district's search: nodes placed breadth-first from the feeds, each line a shortest free walk over spans that are carriers. Every full embedding is judged by the city check before it is taken. */
function searchDistrict(p: Puzzle, plan: CityPlan, city: CityPuzzleCity, district: readonly string[], o: Offer, steps0: number, limit: number, accept: (d: CityPuzzle) => boolean, win?: WinningState): Searched {
  const type = new Map(p.nodes.map((n) => [n.id, n.type] as const));
  const deg = new Map<string, number>();
  const nbrs = new Map<string, { l: string; o: string }[]>();
  for (const l of p.lines) {
    for (const [x, y] of [[l.from, l.to], [l.to, l.from]] as const) {
      deg.set(x, (deg.get(x) ?? 0) + 1);
      nbrs.set(x, [...(nbrs.get(x) ?? []), { l: l.id, o: y }]);
    }
  }
  const order: string[] = [];
  const seen = new Set<string>();
  const roots = [...p.nodes.filter((n) => n.type === "feed"), ...p.nodes.filter((n) => n.type !== "feed" && n.type !== "lamp")].map((n) => n.id);
  for (const r of roots) {
    if (seen.has(r)) continue;
    const q = [r];
    seen.add(r);
    while (q.length > 0) {
      const u = q.shift()!;
      order.push(u);
      for (const { o: w } of nbrs.get(u) ?? []) if (!seen.has(w)) (seen.add(w), q.push(w));
    }
  }
  const place = new Map<string, string>();
  const vOwner = new Map<string, string>();
  const eUsed = new Set<string>();
  const tUsed = new Set<string>();
  const tTaken = new Set<string>();
  const routes = new Map<string, Route>();
  /** The roof spans the job uses so far, for CK17d: no two cross in plan, one junction span a junction. */
  const usedRoof: Edge[] = [];
  /** Every span the job uses so far (W1: no two cross in plan), and each placed feed's entering span (W1: no roof span near it). */
  const usedAll: Edge[] = [];
  const entering = new Map<string, Edge>();
  const feedIds = p.nodes.filter((n) => n.type === "feed").map((n) => n.id);
  const ringSet = ringLinesOf(p.lines, new Set(feedIds));
  const lineById = new Map(p.lines.map((l) => [l.id, l] as const));
  const blocked = (e: Edge): boolean => {
    const a = o.at.get(e.a)!;
    const b = o.at.get(e.b)!;
    const shares = (u: Edge): boolean => u.a === e.a || u.a === e.b || u.b === e.a || u.b === e.b;
    if (usedAll.some((u) => !shares(u) && (e.roof !== undefined || u.roof !== undefined) && crossesInPlan(a, b, o.at.get(u.a)!, o.at.get(u.b)!))) return true;
    if (e.roof === undefined) return false;
    if (usedRoof.some((u) => e.roof!.junction !== null && u.roof!.junction === e.roof!.junction)) return true;
    for (const [fid, E] of entering) {
      const fv = place.get(fid);
      const F = fv === undefined ? undefined : o.at.get(fv);
      if (F !== undefined && e.id !== E.id && feedClearance(F, E, e, o.at) < FEED_CLEAR_M - 1e-9) return true;
    }
    return false;
  };
  /** W1's read-outward rule on one routed line, as early as its feed is placed: the walk `edges` from vertex `from` is a line of the schematic. */
  const routeReads = (lineId: string, from: string, edges: readonly Edge[]): boolean => {
    const l = lineById.get(lineId)!;
    const seq: Pt2[] = [];
    let v = from;
    if (o.at.has(v)) seq.push(o.at.get(v)!);
    for (const e of edges) {
      v = e.a === v ? e.b : e.a;
      seq.push(o.at.get(v)!);
    }
    // The walk runs from the placed end of the line; give it in the line's own order (from -> to).
    const lineSeq = place.get(l.from) === from ? seq : [...seq].reverse();
    const feedPt = (id: string): Pt2 | undefined => {
      const fv = place.get(id);
      return fv === undefined ? undefined : o.at.get(fv);
    };
    const back = backOfLine(lineSeq, l, ringSet.has(lineId), win, feedPt, feedIds);
    return back === null || back <= READ_BACK_M + 1e-9;
  };
  let steps = 0;
  const freeTerm = (v: string): string | undefined => (o.terms.get(v) ?? []).find((t) => !tTaken.has(t) && !tUsed.has(t.slice(2)));
  const freePorts = (v: string): number => o.usable(v).filter((e) => !eUsed.has(e.id)).length + (o.terms.get(v) ?? []).filter((t) => !tTaken.has(t)).length;

  const bfs = (s: string, isTarget: (v: string) => boolean, startEdge?: Edge): { path: Edge[]; end: string } | null => {
    steps++;
    const prev = new Map<string, { v: string; e: Edge }>();
    const start = startEdge ? (startEdge.a === s ? startEdge.b : startEdge.a) : s;
    if (startEdge) {
      if (eUsed.has(startEdge.id)) return null;
      prev.set(start, { v: s, e: startEdge });
      if (isTarget(start)) return { path: [startEdge], end: start };
      if (vOwner.has(start)) return null;
    }
    const q = [start];
    const vis = new Set([s, start]);
    while (q.length > 0) {
      const u = q.shift()!;
      for (const e of o.usable(u)) {
        if (eUsed.has(e.id) || blocked(e)) continue;
        const w = e.a === u ? e.b : e.a;
        if (vis.has(w)) continue;
        vis.add(w);
        prev.set(w, { v: u, e });
        if (isTarget(w)) {
          const path: Edge[] = [];
          let x = w;
          while (x !== s) {
            const pr = prev.get(x)!;
            path.unshift(pr.e);
            x = pr.v;
          }
          return { path, end: w };
        }
        if (vOwner.has(w)) continue;
        q.push(w);
      }
    }
    return null;
  };
  const commit = (path: readonly Edge[], ends: readonly string[]): string[] => {
    for (const e of path) (eUsed.add(e.id), usedAll.push(e), e.roof !== undefined && usedRoof.push(e));
    const inner: string[] = [];
    for (const e of path) for (const v of [e.a, e.b]) if (!ends.includes(v) && !vOwner.has(v)) (vOwner.set(v, "carrier"), inner.push(v));
    return inner;
  };
  const undo = (path: readonly Edge[], inner: readonly string[]): void => {
    for (const e of path) (eUsed.delete(e.id), usedAll.splice(usedAll.lastIndexOf(e), 1), e.roof !== undefined && usedRoof.splice(usedRoof.lastIndexOf(e), 1));
    for (const v of inner) vOwner.delete(v);
  };
  function placeLamp(w: string, lamp: string, line: string): (() => void) | null {
    const pw = place.get(w)!;
    const here = freeTerm(pw);
    if (here !== undefined && !o.isRoof(pw) && type.get(w) !== "feed" && routeReads(line, pw, [])) {
      tTaken.add(here);
      tUsed.add(here.slice(2));
      place.set(lamp, here);
      routes.set(line, { from: pw, edges: [] });
      return () => (tTaken.delete(here), tUsed.delete(here.slice(2)), place.delete(lamp), routes.delete(line), undefined);
    }
    const fp = type.get(w) === "feed" ? o.feedPlaces.find((f) => f.q === pw)?.e : undefined;
    const res = bfs(pw, (v) => !vOwner.has(v) && !o.isRoof(v) && o.inD(v) && freeTerm(v) !== undefined, fp);
    if (res === null || !routeReads(line, pw, res.path)) return null;
    const t = freeTerm(res.end)!;
    const inner = commit(res.path, [pw]);
    if (!vOwner.has(res.end)) (vOwner.set(res.end, "carrier"), inner.push(res.end));
    tTaken.add(t);
    tUsed.add(t.slice(2));
    place.set(lamp, t);
    routes.set(line, { from: pw, edges: res.path });
    return () => (undo(res.path, inner), tTaken.delete(t), tUsed.delete(t.slice(2)), place.delete(lamp), routes.delete(line), undefined);
  }

  const draftOf = (): CityPuzzle => {
    const placeOf = (id: string): CityNodePlace => {
      const v = place.get(id)!;
      return v.startsWith("b:") ? { building: v.slice(2) } : v.startsWith("p:") ? { post: v.slice(2) } : o.isRoof(v) ? { roof: v } : { pole: v };
    };
    const nodes = p.nodes.map((n): CityPuzzleNode => {
      const { pos: _pos, ...rest } = n;
      return { ...rest, place: placeOf(n.id) } as CityPuzzleNode;
    });
    const lines = p.lines.map((l): CityPuzzleLine => {
      const r = routes.get(l.id)!;
      const fromV = place.get(l.from)!;
      const edges = r.from === fromV || r.edges.length === 0 ? r.edges : [...r.edges].reverse();
      const to = place.get(l.to)!;
      const lampEnd = type.get(l.to) === "lamp" ? to : undefined;
      const run = lampEnd?.startsWith("b:") ? { spans: edges.map((e) => e.id), drop: lampEnd.slice(2) } : lampEnd?.startsWith("p:") ? { spans: edges.map((e) => e.id), lead: lampEnd.slice(2) } : { spans: edges.map((e) => e.id) };
      return { ...l, run };
    });
    const faults = p.faults.map((f): CityPuzzleFault => ({ ...f }));
    const { nodes: _nodes, lines: _lines, faults: _faults, decor: _decor, ...rest } = p as Puzzle & { decor?: unknown };
    return { ...rest, scope: "map", from: p.id, city, district: [...district], nodes, lines, faults } as unknown as CityPuzzle;
  };

  const remaining = (x: string): number => (nbrs.get(x) ?? []).filter(({ l }) => !routes.has(l)).length;
  function rec(k: number): boolean {
    if (steps0 + steps > limit || steps > FIT_DISTRICT_STEPS) return false;
    if (k === order.length) {
      steps++;
      const d = draftOf();
      return cityCheckProblems(d, plan, win).length === 0 && accept(d);
    }
    const u = order[k]!;
    if (place.has(u)) return rec(k + 1);
    const t = type.get(u)!;
    if (t === "lamp") {
      const first = nbrs.get(u)?.[0];
      if (first === undefined || !place.has(first.o) || type.get(first.o) === "lamp") return false;
      if (p.lines.find((l) => l.id === first.l)!.from === u) return false;
      const un = placeLamp(first.o, u, first.l);
      if (un === null) return false;
      if (rec(k + 1)) return true;
      un();
      return false;
    }
    const placedN = (nbrs.get(u) ?? []).filter(({ o: w }) => place.has(w) && type.get(w) !== "lamp");
    const d = deg.get(u) ?? 0;
    let cands: string[];
    if (t === "feed") cands = [...new Set(o.feedPlaces.map((f) => f.q))].filter((q) => !vOwner.has(q));
    else {
      const ok = (v: string): boolean => !vOwner.has(v) && allowed(o, t, d, v) && freePorts(v) >= d;
      if (placedN.length === 0) cands = o.vertices.filter(ok);
      else {
        const s = place.get(placedN[0]!.o)!;
        const fp = type.get(placedN[0]!.o) === "feed" ? o.feedPlaces.find((f) => f.q === s)?.e : undefined;
        cands = [];
        const st0 = fp ? (fp.a === s ? fp.b : fp.a) : s;
        const vis = new Set([s, st0]);
        const q = [st0];
        if (fp && ok(st0)) cands.push(st0);
        while (q.length > 0 && cands.length < 10) {
          const x = q.shift()!;
          if (x !== st0 && vOwner.has(x)) continue;
          for (const e of o.usable(x)) {
            if (eUsed.has(e.id)) continue;
            const w = e.a === x ? e.b : e.a;
            if (vis.has(w)) continue;
            vis.add(w);
            if (ok(w)) cands.push(w);
            if (!vOwner.has(w)) q.push(w);
          }
        }
      }
    }
    for (const v of cands.slice(0, 10)) {
      if (steps0 + steps > limit || steps > FIT_DISTRICT_STEPS) return false;
      vOwner.set(v, u);
      place.set(u, v);
      const undos: (() => void)[] = [];
      let good = true;
      for (const { l, o: w } of placedN) {
        const po = place.get(w)!;
        let res: { path: Edge[]; end: string } | null = null;
        if (t === "feed") {
          // The feed stands outside: the walk goes to the inside end of one entering span, then over it.
          for (const f of o.feedPlaces.filter((x) => x.q === v)) {
            if (eUsed.has(f.e.id)) continue;
            const inside = f.e.a === v ? f.e.b : f.e.a;
            const r = po === inside ? { path: [] as Edge[], end: inside } : bfs(po, (x) => x === inside);
            if (r !== null) {
              res = { path: [...r.path, f.e], end: v };
              break;
            }
          }
        } else {
          for (const se of type.get(w) === "feed" ? o.feedPlaces.filter((f) => f.q === po).map((f) => f.e) : [undefined]) {
            res = bfs(po, (x) => x === v, se);
            if (res) break;
          }
        }
        if (res === null || !routeReads(l, po, res.path)) {
          good = false;
          break;
        }
        const found = res;
        const inner = commit(found.path, [po, v]);
        routes.set(l, { from: po, edges: found.path });
        // The feed's entering span is its line's span at the feed's end.
        const feedEnd = t === "feed" ? u : type.get(w) === "feed" ? w : undefined;
        if (feedEnd !== undefined) entering.set(feedEnd, t === "feed" ? found.path[found.path.length - 1]! : found.path[0]!);
        undos.push(() => (undo(found.path, inner), routes.delete(l), feedEnd !== undefined && entering.delete(feedEnd), undefined));
      }
      if (good) {
        for (const [x, pv] of place) {
          const tx = type.get(x);
          if (tx === "lamp") continue;
          if (tx === "feed") {
            if (remaining(x) > 0 && !o.feedPlaces.some((f) => f.q === pv && !eUsed.has(f.e.id))) good = false;
            continue;
          }
          if (remaining(x) > freePorts(pv)) {
            good = false;
            break;
          }
        }
      }
      if (good && rec(k + 1)) return true;
      for (const un of undos.reverse()) un();
      vOwner.delete(v);
      place.delete(u);
    }
    return false;
  }
  const found = rec(0);
  if (found) return { ok: true, draft: draftOf(), steps };
  return { ok: false, why: steps0 + steps > limit || steps > FIT_DISTRICT_STEPS ? "budget" : "exhausted", steps };
}

/** Embed a schematic puzzle on a city (6 x 6 seed 1 one-way, for the pilot). The first district, fewest blocks first, with a full embedding that the city check passes. */
export function fitPuzzle(schematic: Puzzle, plan: CityPlan, city: CityPuzzleCity, options: FitOptions = {}): FitResult {
  const layer = plan.layers.circuit;
  const streets = plan.layers.streets;
  if (layer === undefined || streets === undefined) return { ok: false, kind: "no-fit", message: "no fit: the plan has no circuit layer", steps: 0 };
  const budget = options.budget ?? FIT_BUDGET;
  const clash = midRowClashes(plan);
  const avoid = new Set(options.avoid ?? []);
  const wanted = (options.blocks !== undefined ? [[...options.blocks].sort()] : districtsOf(streets.blocks, options.maxBlocks ?? FIT_MAX_BLOCKS)).filter((d) => !d.some((b) => avoid.has(b)));
  const win: WinningState | undefined = options.solution === undefined ? undefined : replayMoves(schematic, options.solution).state;
  const lampFrom = schematic.lines.find((l) => schematic.nodes.find((n) => n.id === l.from)?.type === "lamp");
  if (lampFrom !== undefined) return { ok: false, kind: "no-fit", message: `no fit: ${lampFrom.id} runs from a lamp; a city line runs from a pole or roof, so the line is written the other way`, steps: 0 };
  const solution = options.solution;
  const accept = (d: CityPuzzle): boolean => solution === undefined || playsLikeSchematic(schematic, d, plan, solution);
  const manyLines = schematic.nodes.find((n) => n.type === "feed" && schematic.lines.filter((l) => l.from === n.id || l.to === n.id).length > 1);
  if (manyLines !== undefined) return { ok: false, kind: "no-fit", message: `no fit: feed ${manyLines.id}, has ${schematic.lines.filter((l) => l.from === manyLines.id || l.to === manyLines.id).length} lines; a city feed has one line over one entering span (CK14)`, steps: 0 };
  let steps = 0;
  let tried = 0;
  let best: { text: string; deficit: number } | null = null;
  let searched = 0;
  let gaveUp = false;
  for (const district of wanted) {
    if (steps >= budget) {
      gaveUp = true;
      break;
    }
    const o = offerOf(plan, district, clash);
    const short = shortfall(schematic, o);
    if (short !== null) {
      if (best === null || short.deficit < best.deficit) best = short;
      continue;
    }
    tried++;
    searched++;
    const r = searchDistrict(schematic, plan, city, district, o, steps, budget, accept, win);
    steps += r.steps;
    if (r.ok) {
      const unraised: CityPuzzle = r.draft;
      const valid = validateCityPuzzle(JSON.parse(JSON.stringify(unraised)));
      if (!valid.ok) return { ok: false, kind: "no-fit", message: `no fit: the draft is not a valid city puzzle: ${valid.errors.join("; ")}`, steps };
      const draft = options.solution !== undefined ? raiseForScenery(unraised, plan, options.solution) : unraised;
      return { ok: true, draft, district, steps, districtsTried: tried };
    }
    if (r.why === "budget") gaveUp = true;
  }
  if (gaveUp || steps >= budget) return { ok: false, kind: "gave-up", message: `gave up after ${steps} steps (FIT_BUDGET ${budget}), in ${searched} districts searched`, steps };
  return { ok: false, kind: "no-fit", message: best !== null && searched === 0 ? `no fit: ${best.text}` : `no fit: no embedding in ${searched} districts searched${best !== null ? `; the others fall short, nearest: ${best.text}` : ""}`, steps };
}

// ---- does a raised puzzle play the same (the stop rule) ----

export interface PlaySummary {
  readonly solvable: boolean;
  readonly minClicks: number | null;
  readonly winningConfigs: number;
  readonly deadFirstMoves: readonly string[];
  readonly blowOnShortestWin: readonly string[];
  readonly lit: readonly string[];
  readonly readable: readonly string[];
  readonly brownout: boolean;
  readonly blown: readonly string[];
}

/** The start state and the analyzer's numbers of a puzzle, over its own lamps and faults (hidden lamps are left out). */
export function playSummary(p: Puzzle, hidden: ReadonlySet<string> = new Set(), cap = 200_000): PlaySummary {
  const bus = new EventBus();
  const blown: string[] = [];
  bus.on("fuse:blown", (e) => blown.push(e.nodeId));
  const { state } = replayMoves(p, []);
  const a = analyzePuzzle(p, { cap });
  return {
    solvable: a.solvable,
    minClicks: a.minClicks ?? a.bestKnown,
    winningConfigs: a.winningConfigs,
    deadFirstMoves: [...(a.deadFirstMoves ?? [])].sort(),
    blowOnShortestWin: [...a.blowOnShortestWin].sort(),
    lit: [...state.lit].filter((id) => !hidden.has(id)).sort(),
    readable: [...state.readableFaults].sort(),
    brownout: state.brownout,
    blown: state.faults.filter((f) => f.kind === "blown-fuse").map((f) => f.at).sort(),
  };
}

/** What differs between the schematic's play and the raised puzzle's: empty when they play the same. */
export function playDifferences(before: PlaySummary, after: PlaySummary): string[] {
  const out: string[] = [];
  for (const k of Object.keys(before) as (keyof PlaySummary)[]) {
    const x = JSON.stringify(before[k]);
    const y = JSON.stringify(after[k]);
    if (x !== y) out.push(`${k}: schematic ${x}, raised ${y}`);
  }
  return out;
}

/** Convenience for the CLI and the sweep: a city puzzle's converted puzzle and its hidden ids. */
export function convertedOf(puzzle: CityPuzzle, plan: CityPlan): { readonly puzzle: Puzzle; readonly hidden: ReadonlySet<string>; readonly scenery: number } {
  const c = convertCityPuzzle(puzzle, plan);
  return { puzzle: c.puzzle, hidden: new Set(c.hidden ?? []), scenery: Object.keys(c.scenery ?? {}).length * SCENERY_BUILDING_LOAD };
}
