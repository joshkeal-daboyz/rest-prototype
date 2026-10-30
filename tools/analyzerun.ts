/**
 * The puzzle analyzer's search (ticket 027 D2). Pure (no file access): `tools/analyze.ts` reads files and prints.
 *
 * A bounded breadth-first search over play states on the real `createGrid`.
 *   - A move is a click (a breaker, a switch, a battery, or a repair of a fault) or, on a map with a battery, a
 *     `wait` of `waitSeconds`. The same time rules as the check contract (puzzles/SCHEMA.md, "Design checks"): each
 *     click is followed by `clickSeconds` of game time, a wait is `waitSeconds` (0.5), and Undo adds no time.
 *   - Undo is not a move of the search. A state's "dead end" means it cannot win without Undo, as in the ladder's notes.
 *   - States are deduplicated on (breakers, switches, faults, parts, each battery's charge and released flag). The
 *     elapsed time is not part of the key: nothing but a battery's charge depends on it.
 *   - Cost is ordered (clicks, then waits), so "shortest" means fewest clicks and, among those, fewest waits.
 *
 * Under the state cap the search is exhaustive and every number is exact. Past it, it stops and proves a lower bound:
 * every state within `noWinBelow - 1` clicks was fully expanded, so no win takes fewer than `noWinBelow` clicks.
 *
 * Extension point for D3 (`--sections`): `analyzePuzzle(puzzle, options)` takes any valid Puzzle, so a sub-puzzle built
 * from a section is analysed by the same call.
 */

import { CHECK_CLICK_SECONDS, EventBus } from "../src/core";
import type { Part, Puzzle } from "../src/core";
import { createGrid } from "../src/grid";
import type { Grid, GridState } from "../src/grid";

export const DEFAULT_CAP = 500_000;
export const WAIT_SECONDS = 0.5;

export interface AnalyzeOptions {
  /** Most states to hold. Default 500 000. */
  cap?: number;
  /** Seconds after each click. Default 1. */
  clickSeconds?: number;
  /** Seconds in a `wait` move (battery maps only). Default 0.5. */
  waitSeconds?: number;
  /** Test hook: replay every state from the start instead of stepping back with Undo. Same answers, slower. */
  replayOnly?: boolean;
}

export interface WinSummary {
  /** One shortest winning move list, in the check block's syntax (`wait:0.5` for a wait). */
  moves: string[];
  clicks: number;
  waits: number;
  partsUsed: Part[];
  feeds: { id: string; load: number; capacity: number | null }[];
}

export interface AnalysisResult {
  puzzleId: string;
  exhaustive: boolean;
  cap: number;
  /** States held (all of them when exhaustive; a lower bound otherwise). */
  states: number;
  solvable: boolean;
  /** Fewest clicks to win. Null when no win is known, or when one is known but not proved shortest (see `bestKnown`). */
  minClicks: number | null;
  /** Past the cap with a win found that is not proved shortest: the fewest clicks of any win found. */
  bestKnown: number | null;
  /** Past the cap: no win takes fewer than this many clicks. Null when exhaustive. */
  noWinBelow: number | null;
  /** Shortest winning click sequences (fewest clicks, then fewest waits). Exact only when exhaustive. */
  winningOrders: number;
  /** Distinct (breaker, switch, fault) settings among the winning states. Exact only when exhaustive. */
  winningConfigs: number;
  /** Winning states (battery charge may differ between two with the same setting). */
  winningStates: number;
  /** States that can no longer win (without Undo). Null unless exhaustive. */
  deadStates: number | null;
  /** deadStates / states. Null unless exhaustive. */
  deadShare: number | null;
  /** First moves from the start that lead to a state that cannot win. Null unless exhaustive. */
  deadFirstMoves: string[] | null;
  /** Every first move that changes anything. */
  firstMoves: string[];
  /** Fuseboxes that blow on some shortest win. */
  blowOnShortestWin: string[];
  /** Fuseboxes that blow on any move anywhere in the search. */
  blowAnywhere: string[];
  /** One shortest win, replayed. Null when no win is known. */
  win: WinSummary | null;
}

interface Move { name: string; kind: "click" | "repair" | "wait"; id: string }

const W_CLICK = 1 << 16; // cost of a click; a wait costs 1 (fewer than 65 536 waits ever separate two clicks)
const W_WAIT = 1;

class Sim {
  readonly grid: Grid;
  readonly types = new Map<string, string>();
  /** Fuseboxes that blew during the last `apply`. */
  blown: string[] = [];
  won = false;

  constructor(readonly puzzle: Puzzle, readonly clickSeconds: number, readonly waitSeconds: number) {
    const bus = new EventBus();
    bus.on("fuse:blown", (e) => this.blown.push(e.nodeId));
    bus.on("job:completed", () => { this.won = true; });
    this.grid = createGrid(puzzle, bus);
    for (const n of puzzle.nodes) this.types.set(n.id, n.type);
  }

  /** Back to the start state. */
  restart(): void { this.grid.reset(); this.blown = []; this.won = false; }

  /** Try one move. False if the game refuses it (nothing then changes). */
  apply(m: Move): boolean {
    this.blown = [];
    this.won = false;
    if (m.kind === "wait") { this.grid.advance(this.waitSeconds); return true; }
    let ok: boolean;
    if (m.kind === "repair") ok = this.grid.repairAt(m.id).ok;
    else {
      const t = this.types.get(m.id);
      ok = t === "breaker" ? this.grid.throwBreaker(m.id)
        : t === "switch" ? this.grid.throwSwitch(m.id)
        : this.grid.release(m.id);
    }
    if (ok) this.grid.advance(this.clickSeconds);
    return ok;
  }
}

function keyOf(s: GridState): string {
  let k = "";
  for (const v of s.breakers.values()) k += v ? "1" : "0";
  k += "|";
  for (const v of s.switches.values()) k += v;
  k += "|" + s.faults.map((f) => f.id).sort().join(",");
  k += "|" + [...s.parts].sort().join(",");
  k += "|";
  for (const b of s.batteries.values()) k += `${Math.round(b.charge * 1000)}${b.released ? "r" : ""};`;
  return k;
}

/** The setting of the controls and faults only (what the ladder's notes call a winning configuration). */
function configOf(s: GridState): string {
  let k = "";
  for (const v of s.breakers.values()) k += v ? "1" : "0";
  k += "|";
  for (const v of s.switches.values()) k += v;
  return k + "|" + s.faults.map((f) => f.id).sort().join(",");
}

export function analyzePuzzle(puzzle: Puzzle, options: AnalyzeOptions = {}): AnalysisResult {
  const cap = options.cap ?? DEFAULT_CAP;
  const clickSeconds = options.clickSeconds ?? CHECK_CLICK_SECONDS;
  const waitSeconds = options.waitSeconds ?? WAIT_SECONDS;
  const sim = new Sim(puzzle, clickSeconds, waitSeconds);
  const hasBattery = puzzle.nodes.some((n) => n.type === "battery");
  const stepBack = !hasBattery && !options.replayOnly; // Undo restores a state exactly only when no battery holds charge
  const staticMoves: Move[] = puzzle.nodes
    .filter((n) => n.type === "breaker" || n.type === "switch" || n.type === "battery")
    .map((n) => ({ name: n.id, kind: "click", id: n.id }));
  const waitMove: Move = { name: `wait:${waitSeconds}`, kind: "wait", id: "" };

  // ---- the state table ----
  const index = new Map<string, number>();
  const dist: number[] = [];
  const parent: number[] = [];
  const pmove: (Move | null)[] = [];
  const isWin: boolean[] = [];
  const expanded: boolean[] = [];
  const winConfigs = new Set<string>();
  // ---- edges ----
  const eFrom: number[] = [];
  const eTo: number[] = [];
  const eW: number[] = [];
  const eMove: string[] = [];
  const eBlown: string[] = []; // comma-joined fuseboxes that blew on this move; "" for none

  const buckets = new Map<number, number[]>();
  const push = (cost: number, id: number): void => {
    const b = buckets.get(cost);
    if (b) b.push(id); else buckets.set(cost, [id]);
  };

  const rootState = sim.grid.state();
  index.set(keyOf(rootState), 0);
  dist.push(0); parent.push(-1); pmove.push(null); isWin.push(false); expanded.push(false);
  push(0, 0);

  const pathTo = (id: number): Move[] => {
    const out: Move[] = [];
    for (let v = id; parent[v]! >= 0; v = parent[v]!) out.push(pmove[v]!);
    return out.reverse();
  };
  const replay = (path: readonly Move[]): void => { sim.restart(); for (const m of path) sim.apply(m); };

  let truncated = false;
  let truncatedAtClicks = 0;
  const blowAll = new Set<string>();

  search: while (buckets.size > 0) {
    let cost = Infinity;
    for (const c of buckets.keys()) if (c < cost) cost = c;
    const bucket = buckets.get(cost)!;
    buckets.delete(cost);
    for (const id of bucket) {
      if (expanded[id] || dist[id] !== cost) continue; // a stale entry: this state was reached more cheaply
      expanded[id] = true;
      if (isWin[id]) continue; // the job is done; the game takes no more moves
      const path = pathTo(id);
      replay(path);
      const moves = [...staticMoves];
      const seen = new Set<string>();
      for (const f of sim.grid.state().faults) {
        if (seen.has(f.at)) continue;
        seen.add(f.at);
        moves.push({ name: `repair:${f.at}`, kind: "repair", id: f.at });
      }
      if (hasBattery) moves.push(waitMove);
      let dirty = false;
      for (const m of moves) {
        if (dirty) { replay(path); dirty = false; }
        if (!sim.apply(m)) continue;
        const s = sim.grid.state();
        const k = keyOf(s);
        const won = sim.won;
        const blown = sim.blown.join(",");
        const w = m.kind === "wait" ? W_WAIT : W_CLICK;
        const cfg = won ? configOf(s) : "";
        // Step back: Undo restores the pre-move state exactly on a map without a battery, unless the job just ended.
        if (stepBack && !won && sim.grid.undo()) dirty = false; else dirty = true;
        let to = index.get(k);
        if (to === undefined) {
          if (index.size >= cap) { truncated = true; truncatedAtClicks = Math.floor(cost / W_CLICK); break search; }
          to = dist.length;
          index.set(k, to);
          dist.push(cost + w); parent.push(id); pmove.push(m); isWin.push(won); expanded.push(false);
          push(cost + w, to);
        } else {
          if (to === id) continue; // changes nothing (e.g. a wait with the battery full)
          if (won) isWin[to] = true;
          if (cost + w < dist[to]! && !expanded[to]) {
            dist[to] = cost + w; parent[to] = id; pmove[to] = m;
            push(cost + w, to);
          }
        }
        if (won) winConfigs.add(cfg);
        eFrom.push(id); eTo.push(to); eW.push(w); eMove.push(m.name); eBlown.push(blown);
        if (blown) for (const b of sim.blown) blowAll.add(b);
      }
    }
  }

  const n = dist.length;
  const exhaustive = !truncated;

  // ---- adjacency (forward and reverse, in edge order so every walk is deterministic) ----
  const outStart = new Int32Array(n + 1);
  const inStart = new Int32Array(n + 1);
  for (let e = 0; e < eFrom.length; e++) { outStart[eFrom[e]! + 1]!++; inStart[eTo[e]! + 1]!++; }
  for (let i = 0; i < n; i++) { outStart[i + 1]! += outStart[i]!; inStart[i + 1]! += inStart[i]!; }
  const outE = new Int32Array(eFrom.length);
  const inE = new Int32Array(eFrom.length);
  const oc = outStart.slice(0, n);
  const ic = inStart.slice(0, n);
  for (let e = 0; e < eFrom.length; e++) { outE[oc[eFrom[e]!]!++] = e; inE[ic[eTo[e]!]!++] = e; }

  // ---- wins and the shortest-win DAG ----
  const winners: number[] = [];
  for (let i = 0; i < n; i++) if (isWin[i]) winners.push(i);
  let minCost = Infinity;
  for (const w of winners) minCost = Math.min(minCost, dist[w]!);
  const solvable = winners.length > 0;
  const foundClicks = solvable ? Math.floor(minCost / W_CLICK) : null;
  // Layers up to truncatedAtClicks - 1 were fully expanded, so a win found at that many clicks or fewer is the shortest.
  const proved = exhaustive || (foundClicks !== null && foundClicks <= truncatedAtClicks);
  const minClicks = proved ? foundClicks : null;
  const bestKnown = !proved ? foundClicks : null;

  const tight = (e: number): boolean => dist[eFrom[e]!]! + eW[e]! === dist[eTo[e]!]!;
  const onPath = new Uint8Array(n);
  const blowShort = new Set<string>();
  let winningOrders = 0;
  let win: WinSummary | null = null;
  if (solvable) {
    const best = winners.filter((w) => dist[w] === minCost);
    const stack: number[] = [];
    for (const w of best) { onPath[w] = 1; stack.push(w); }
    while (stack.length) {
      const v = stack.pop()!;
      for (let j = inStart[v]!; j < inStart[v + 1]!; j++) {
        const e = inE[j]!;
        if (!tight(e)) continue;
        if (eBlown[e]) for (const b of eBlown[e]!.split(",")) blowShort.add(b);
        const u = eFrom[e]!;
        if (!onPath[u]) { onPath[u] = 1; stack.push(u); }
      }
    }
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => dist[a]! - dist[b]! || a - b);
    const cnt = new Float64Array(n);
    cnt[0] = 1;
    for (const v of order) {
      if (!cnt[v]) continue;
      for (let j = outStart[v]!; j < outStart[v + 1]!; j++) {
        const e = outE[j]!;
        if (tight(e)) cnt[eTo[e]!]! += cnt[v]!;
      }
    }
    for (const w of best) winningOrders += cnt[w]!;

    const first = best[0]!;
    const path = pathTo(first);
    replay(path);
    const s = sim.grid.state();
    const left = [...s.parts];
    const used: Part[] = [];
    for (const p of puzzle.startingParts ?? []) {
      const i = left.indexOf(p);
      if (i >= 0) left.splice(i, 1); else used.push(p);
    }
    const waits = path.filter((m) => m.kind === "wait").length;
    win = {
      moves: path.map((m) => m.name),
      clicks: path.length - waits,
      waits,
      partsUsed: used,
      feeds: [...s.feeds].map(([id, f]) => ({ id, load: f.load, capacity: f.capacity })),
    };
  }

  // ---- dead ends: states from which no win can be reached ----
  let deadStates: number | null = null;
  let deadFirstMoves: string[] | null = null;
  const firstMoves: string[] = [];
  for (let j = outStart[0]!; j < outStart[1]!; j++) {
    const name = eMove[outE[j]!]!;
    if (!firstMoves.includes(name)) firstMoves.push(name);
  }
  if (exhaustive) {
    const alive = new Uint8Array(n);
    const stack: number[] = [];
    for (const w of winners) { alive[w] = 1; stack.push(w); }
    while (stack.length) {
      const v = stack.pop()!;
      for (let j = inStart[v]!; j < inStart[v + 1]!; j++) {
        const u = eFrom[inE[j]!]!;
        if (!alive[u]) { alive[u] = 1; stack.push(u); }
      }
    }
    deadStates = 0;
    for (let i = 0; i < n; i++) if (!alive[i]) deadStates++;
    deadFirstMoves = [];
    for (let j = outStart[0]!; j < outStart[1]!; j++) {
      const e = outE[j]!;
      if (!alive[eTo[e]!] && !deadFirstMoves.includes(eMove[e]!)) deadFirstMoves.push(eMove[e]!);
    }
  }

  return {
    puzzleId: puzzle.id,
    exhaustive,
    cap,
    states: n,
    solvable,
    minClicks,
    bestKnown,
    noWinBelow: exhaustive ? null : (minClicks ?? truncatedAtClicks),
    winningOrders,
    winningConfigs: winConfigs.size,
    winningStates: winners.length,
    deadStates,
    deadShare: deadStates === null ? null : deadStates / n,
    deadFirstMoves,
    firstMoves,
    blowOnShortestWin: [...blowShort].sort(),
    blowAnywhere: [...blowAll].sort(),
    win,
  };
}
