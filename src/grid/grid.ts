/**
 * The map-scope grid simulator. Pure: no DOM, no timers, no randomness.
 * Rules: puzzles/SCHEMA.md and docs/prototype-brief.md.
 */

import { DEFAULTS, EventBus, FAULT_RULES, type BatteryNode, type Fault, type GridNode, type Line, type Part, type Puzzle, type FeedReadout, puzzleFeeds } from "../core";
import type { Grid, GridState, RepairResult } from "./types";

interface Mutable {
  breakers: Map<string, boolean>;
  switches: Map<string, 0 | 1>;
  faults: Fault[];
  parts: Part[];
  actions: number;
  /** Per unfaulted fusebox at the last settle: the lit lamps downstream of it (null before the first settle). Decides which lamp is new under a fuse that blows. */
  prevUnder: ReadonlyMap<string, ReadonlySet<string>> | null;
}

const cloneMutable = (m: Mutable): Mutable => ({
  breakers: new Map(m.breakers),
  switches: new Map(m.switches),
  faults: m.faults.map((f) => ({ ...f })),
  parts: [...m.parts],
  actions: m.actions,
  prevUnder: m.prevUnder,
});

interface BatteryRun {
  charge: number;
  released: boolean;
}

const EPS = 1e-9;

interface Flow {
  powered: Set<string>;
  flowFrom: Map<string, string>;
  /** Powered nodes in discovery order (outermost first). */
  order: string[];
  parent: Map<string, string>;
  /** Node id -> the line the current entered it through. */
  parentLine: Map<string, string>;
  /** Powered node/line id -> the root (feed) whose flow carries it. */
  feedOf: Map<string, string>;
}

export function createGrid(puzzle: Puzzle, bus: EventBus = new EventBus()): Grid {
  const nodes = new Map<string, GridNode>(puzzle.nodes.map((n) => [n.id, n]));
  const lines = new Map<string, Line>(puzzle.lines.map((l) => [l.id, l]));
  const adjacency = new Map<string, string[]>();
  for (const l of puzzle.lines) {
    for (const end of [l.from, l.to]) {
      const a = adjacency.get(end);
      if (a) a.push(l.id);
      else adjacency.set(end, [l.id]);
    }
  }
  const feedInfos = puzzleFeeds(puzzle);
  if (feedInfos.length === 0) throw new Error("puzzle has no feed node");
  const feedIds = feedInfos.map((f) => f.id);
  const multi = feedInfos.length > 1;
  const capacities = feedInfos.map((f) => f.capacity);
  const capacity: number | null = capacities.some((c) => c === null) ? null : capacities.reduce<number>((a, c) => a + (c as number), 0);
  const limitedSum = capacities.reduce<number>((a, c) => a + (c ?? 0), 0);
  const anyLimited = capacities.some((c) => c !== null);
  const lampIds = puzzle.nodes.filter((n) => n.type === "lamp").map((n) => n.id);
  const targets: readonly string[] = puzzle.target && puzzle.target.length > 0 ? [...puzzle.target] : lampIds;
  const fuseIds = puzzle.nodes.filter((n) => n.type === "fusebox").map((n) => n.id);

  const initial = (): Mutable => {
    const breakers = new Map<string, boolean>();
    const switches = new Map<string, 0 | 1>();
    for (const n of puzzle.nodes) {
      if (n.type === "breaker") breakers.set(n.id, n.closed);
      else if (n.type === "switch") switches.set(n.id, n.selected);
    }
    return {
      breakers,
      switches,
      faults: puzzle.faults.map((f) => ({ ...f })),
      parts: [...(puzzle.startingParts ?? [])],
      actions: 0,
      prevUnder: null,
    };
  };

  // Index tables for the flow: the same walk as the id-keyed rules, over typed arrays, so a settle that restarts
  // (one blown fuse after another) costs little at hundreds of nodes. Built once; the rules are unchanged.
  const T_FEED = 0, T_BREAKER = 1, T_SWITCH = 2, T_FUSE = 3, T_JUNCTION = 4, T_LAMP = 5, T_BATTERY = 6;
  const typeCode = { feed: T_FEED, breaker: T_BREAKER, switch: T_SWITCH, fusebox: T_FUSE, junction: T_JUNCTION, lamp: T_LAMP, battery: T_BATTERY } as const;
  const nodeIds: string[] = puzzle.nodes.map((n) => n.id);
  const lineIds: string[] = puzzle.lines.map((l) => l.id);
  const nodeIdx = new Map<string, number>(nodeIds.map((id, i) => [id, i]));
  const lineIdx = new Map<string, number>(lineIds.map((id, i) => [id, i]));
  const nN = nodeIds.length;
  const nL = lineIds.length;
  const ntype = new Uint8Array(nN);
  const lampLoad = new Float64Array(nN);
  const fuseRating = new Float64Array(nN);
  const lineFrom = new Int32Array(nL);
  const lineTo = new Int32Array(nL);
  const swOut = new Int32Array(nN * 2).fill(-1); // a switch's two output lines
  const swSelected = new Uint8Array(nN); // a switch's file position
  const batInput = new Int32Array(nN).fill(-1); // a battery's input line
  const adj: number[][] = nodeIds.map(() => []); // incident lines in file order, as `adjacency`
  puzzle.lines.forEach((l, i) => {
    lineFrom[i] = nodeIdx.get(l.from)!;
    lineTo[i] = nodeIdx.get(l.to)!;
    adj[lineFrom[i]!]!.push(i);
    adj[lineTo[i]!]!.push(i);
  });
  puzzle.nodes.forEach((n, i) => {
    ntype[i] = typeCode[n.type];
    if (n.type === "lamp") lampLoad[i] = n.load ?? DEFAULTS.lampLoad;
    if (n.type === "fusebox") fuseRating[i] = n.rating ?? DEFAULTS.fuseRating;
    if (n.type === "switch") {
      swOut[i * 2] = lineIdx.get(n.outputs[0])!;
      swOut[i * 2 + 1] = lineIdx.get(n.outputs[1])!;
      swSelected[i] = n.selected;
    }
    if (n.type === "battery") batInput[i] = lineIdx.get(n.input) ?? -1;
  });
  const feedIdxs = feedIds.map((id) => nodeIdx.get(id)!);

  interface FlowIdx {
    nodes: Uint8Array; // 1 where powered
    lines: Uint8Array;
    flowFromL: Int32Array; // line -> node it was entered from
    parent: Int32Array; // node -> node (-1 for a root)
    parentL: Int32Array;
    feedOfN: Int32Array; // -> root node, -1 if unpowered
    feedOfL: Int32Array;
    order: Int32Array; // powered nodes in discovery order, first `count` valid
    count: number;
    faultNode: Uint8Array;
    /** Powered nodes and lines in discovery order: a node as i, a line as -(l + 1). */
    log: number[];
  }

  /**
   * Current spreading from its sources at once, seeded in the order given: every feed, or one released battery
   * (out of every line but its input). Each node and line is carried by the nearest root; ties go to the root
   * seeded first, then the file's line order.
   */
  function flowIdx(m: Mutable, roots: readonly number[]): FlowIdx {
    const faultNode = new Uint8Array(nN);
    const damaged = new Uint8Array(nL);
    for (const f of m.faults) {
      const ni = nodeIdx.get(f.at);
      if (ni !== undefined) faultNode[ni] = 1;
      if (f.kind === "damaged-cable") {
        const li = lineIdx.get(f.at);
        if (li !== undefined) damaged[li] = 1;
      }
    }
    const pn = new Uint8Array(nN);
    const pl = new Uint8Array(nL);
    const flowFromL = new Int32Array(nL).fill(-1);
    const parent = new Int32Array(nN).fill(-1);
    const parentL = new Int32Array(nN).fill(-1);
    const feedOfN = new Int32Array(nN).fill(-1);
    const feedOfL = new Int32Array(nL).fill(-1);
    const order = new Int32Array(nN);
    const log: number[] = [];
    let count = 0;
    for (const r of roots) {
      pn[r] = 1;
      feedOfN[r] = r;
      order[count++] = r;
      log.push(r);
    }
    for (let i = 0; i < count; i++) {
      const id = order[i]!;
      const t = ntype[id]!;
      if (!(i < roots.length && t === T_BATTERY)) {
        if (t === T_LAMP || t === T_BATTERY) continue; // never passes the feed's current on; it only sources when it is a root
        if (t === T_BREAKER && m.breakers.get(nodeIds[id]!) !== true) continue;
        if ((t === T_FUSE || t === T_JUNCTION) && faultNode[id]) continue;
      }
      let out: readonly number[];
      if (t === T_SWITCH) {
        const sel = m.switches.get(nodeIds[id]!) ?? swSelected[id]!;
        out = [swOut[id * 2 + sel]!];
      } else if (t === T_BATTERY) out = adj[id]!.filter((l) => l !== batInput[id]);
      else out = adj[id]!;
      for (const l of out) {
        if (pl[l]) continue;
        const other = lineFrom[l] === id ? lineTo[l]! : lineFrom[l]!;
        const ot = ntype[other]!;
        // A switch only sends current out of its outputs; it can't be entered through one.
        if (ot === T_SWITCH && (swOut[other * 2] === l || swOut[other * 2 + 1] === l)) continue;
        pl[l] = 1;
        log.push(-(l + 1));
        flowFromL[l] = id;
        feedOfL[l] = feedOfN[id]!;
        // A battery is entered only through its input line; from its far side the current stops at it.
        if (ot === T_BATTERY && batInput[other] !== l) continue;
        // Current runs up to a damaged cable and stops there.
        if (damaged[l]) continue;
        if (pn[other]) continue;
        pn[other] = 1;
        log.push(other);
        parent[other] = id;
        parentL[other] = l;
        feedOfN[other] = feedOfN[id]!;
        order[count++] = other;
      }
    }
    return { nodes: pn, lines: pl, flowFromL, parent, parentL, feedOfN, feedOfL, order, count, faultNode, log };
  }

  /** The id-keyed view of a flow. */
  function toFlow(fi: FlowIdx): Flow {
    const powered = new Set<string>();
    const feedOf = new Map<string, string>();
    for (const e of fi.log) {
      if (e >= 0) {
        powered.add(nodeIds[e]!);
        feedOf.set(nodeIds[e]!, nodeIds[fi.feedOfN[e]!]!);
      } else {
        const l = -e - 1;
        powered.add(lineIds[l]!);
        feedOf.set(lineIds[l]!, nodeIds[fi.feedOfL[l]!]!);
      }
    }
    const flowFrom = new Map<string, string>();
    for (let l = 0; l < nL; l++) if (fi.flowFromL[l]! >= 0) flowFrom.set(lineIds[l]!, nodeIds[fi.flowFromL[l]!]!);
    const order: string[] = [];
    const parent = new Map<string, string>();
    const parentLine = new Map<string, string>();
    for (let i = 0; i < fi.count; i++) {
      const id = fi.order[i]!;
      order.push(nodeIds[id]!);
      if (fi.parent[id]! >= 0) {
        parent.set(nodeIds[id]!, nodeIds[fi.parent[id]!]!);
        parentLine.set(nodeIds[id]!, lineIds[fi.parentL[id]!]!);
      }
    }
    return { powered, flowFrom, order, parent, parentLine, feedOf };
  }

  function flow(m: Mutable, roots: readonly string[]): Flow {
    return toFlow(flowIdx(m, roots.map((r) => nodeIdx.get(r)!)));
  }

  /** The load of lamp `i` in `fi`: its own load when powered and unfaulted, else 0. */
  const loadAt = (fi: FlowIdx, i: number): number => (ntype[i] === T_LAMP && fi.nodes[i] && !fi.faultNode[i] ? lampLoad[i]! : 0);

  /**
   * The lamp newly fed through `fuse` (downstream of it now, not under that fuse before the action); the
   * largest load wins, ties by discovery order. `null` with no earlier settle or no new lamp.
   */
  function nameCulprit(
    fi: FlowIdx,
    fuse: number,
    before: ReadonlyMap<string, ReadonlySet<string>> | null,
  ): { culprit: string | null; path: string[] } {
    if (before === null) return { culprit: null, path: [] };
    const was = before.get(nodeIds[fuse]!) ?? new Set<string>();
    let best = -1;
    let bestLoad = 0;
    for (let i = 0; i < fi.count; i++) {
      const id = fi.order[i]!;
      const w = loadAt(fi, id);
      if (w <= bestLoad || was.has(nodeIds[id]!)) continue;
      for (let c = id; c >= 0; c = fi.parent[c]!) {
        if (c === fuse && c !== id) {
          best = id;
          bestLoad = w;
          break;
        }
      }
    }
    if (best < 0) return { culprit: null, path: [] };
    const path: string[] = [];
    for (let c = best; c !== fuse; c = fi.parent[c]!) path.push(lineIds[fi.parentL[c]!]!);
    return { culprit: nodeIds[best]!, path: path.reverse() };
  }

  /**
   * Every lamp summed into the load that blew `fuse`: powered by `fi`, below the fuse, not faulted, load > 0,
   * in flow discovery order, each with its line path from the fuse.
   */
  function blownLamps(fi: FlowIdx, fuse: number): Array<{ id: string; path: string[] }> {
    const out: Array<{ id: string; path: string[] }> = [];
    for (let i = 0; i < fi.count; i++) {
      const id = fi.order[i]!;
      if (ntype[id] !== T_LAMP || loadAt(fi, id) <= 0) continue;
      const path: string[] = [];
      let c = id;
      for (; c >= 0 && c !== fuse; c = fi.parent[c]!) path.push(lineIds[fi.parentL[c]!]!);
      if (c === fuse) out.push({ id: nodeIds[id]!, path: path.reverse() });
    }
    return out;
  }

  /** Recompute, blowing overloaded fuses (outermost first) until stable. Mutates `m.faults`. */
  function settle(m: Mutable, emit: boolean): GridState {
    const before = m.prevUnder;
    for (;;) {
      const fi = flowIdx(m, feedIdxs);
      // Would-be-lit load downstream of every powered node.
      const sub = new Float64Array(nN);
      for (let i = fi.count - 1; i >= 0; i--) {
        const id = fi.order[i]!;
        const total = sub[id]! + loadAt(fi, id);
        sub[id] = total;
        const p = fi.parent[id]!;
        if (p >= 0) sub[p] = sub[p]! + total;
      }
      let blew = false;
      for (let i = 0; i < fi.count; i++) {
        const id = fi.order[i]!;
        if (ntype[id] !== T_FUSE || fi.faultNode[id]) continue;
        const load = sub[id]!;
        if (load > fuseRating[id]!) {
          const fuseId = nodeIds[id]!;
          const fault: Fault = { id: `blown-${fuseId}`, at: fuseId, kind: "blown-fuse" };
          m.faults.push(fault);
          if (emit) {
            const { culprit, path } = nameCulprit(fi, id, before);
            bus.emit("fuse:blown", { nodeId: fuseId, faultId: fault.id, load, rating: fuseRating[id]!, culprit, path, lamps: blownLamps(fi, id) });
          }
          blew = true;
          break;
        }
      }
      if (blew) continue;

      const f = toFlow(fi);
      const faulted = new Set(m.faults.map((x) => x.at));
      const loadOf = (id: string): number => {
        const n = nodes.get(id)!;
        return n.type === "lamp" && f.powered.has(id) && !faulted.has(id) ? (n.load ?? DEFAULTS.lampLoad) : 0;
      };

      // Released batteries with charge left are further sources; only the feed's own flow sets the load.
      const powered = new Set(f.powered);
      const flowFrom = new Map(f.flowFrom);
      for (const bid of batteryIds) {
        const b = bat.get(bid)!;
        if (!b.released || b.charge <= 0) continue;
        const bf = flow(m, [bid]);
        for (const x of bf.powered) powered.add(x);
        for (const [k, v] of bf.flowFrom) if (!flowFrom.has(k)) flowFrom.set(k, v);
      }

      // Spring switches with no current reaching them return to their file position; that can unpower
      // another spring switch, so settle again until none moves. Not an action, not an undo step.
      let sprang = false;
      for (const n of puzzle.nodes) {
        if (n.type !== "switch" || !n.spring || powered.has(n.id)) continue;
        if (m.switches.get(n.id) === n.selected) continue;
        m.switches.set(n.id, n.selected);
        if (emit) bus.emit("switch:thrown", { nodeId: n.id, selected: n.selected, spring: true });
        sprang = true;
      }
      if (sprang) continue;
      const batteries = new Map<string, { charge: number; capacity: number; released: boolean; charging: boolean }>();
      for (const bid of batteryIds) {
        const b = bat.get(bid)!;
        const cap = (nodes.get(bid) as BatteryNode).capacity;
        batteries.set(bid, {
          charge: b.charge,
          capacity: cap,
          released: b.released,
          charging: !b.released && b.charge < cap && f.powered.has(bid),
        });
      }

      const under = new Map<string, Set<string>>();
      for (const fid of f.order) {
        if (nodes.get(fid)!.type === "fusebox" && !faulted.has(fid)) under.set(fid, new Set());
      }
      for (const l of lampIds) {
        if (loadOf(l) <= 0) continue;
        for (let c = f.parent.get(l); c !== undefined; c = f.parent.get(c)) under.get(c)?.add(l);
      }
      m.prevUnder = under;
      const lit = new Set<string>();
      let load = 0;
      const feedLoad = new Map<string, number>(feedIds.map((id) => [id, 0]));
      for (const id of lampIds) {
        if (powered.has(id) && !faulted.has(id)) {
          lit.add(id);
          if (f.powered.has(id)) {
            const w = loadOf(id);
            load += w;
            const fid = f.feedOf.get(id)!;
            feedLoad.set(fid, feedLoad.get(fid)! + w);
          }
        }
      }
      const feeds = new Map<string, FeedReadout>();
      for (const fi of feedInfos) {
        const l = feedLoad.get(fi.id)!;
        feeds.set(fi.id, { load: l, capacity: fi.capacity, over: fi.capacity !== null && l > fi.capacity });
      }
      // The same `sub` totals the blow check compared against each rating; 0 when unpowered or blown.
      const fuseLoad = new Map<string, number>();
      for (const fid of fuseIds) fuseLoad.set(fid, f.powered.has(fid) && !faulted.has(fid) ? sub[nodeIdx.get(fid)!]! : 0);
      const readable = new Set<string>();
      const sparking = new Set<string>();
      for (const fault of m.faults) {
        if (powered.has(fault.at)) {
          readable.add(fault.id);
          if (fault.kind === "damaged-cable") sparking.add(fault.at);
        }
      }
      // Per readable blown fuse: the load it would carry with only its own fault removed (no cascade).
      const wouldBlow = new Map<string, number>();
      for (const fault of m.faults) {
        if (fault.kind !== "blown-fuse" || !powered.has(fault.at)) continue;
        const fb = nodes.get(fault.at);
        if (!fb || fb.type !== "fusebox") continue;
        const trial: Mutable = { ...m, faults: m.faults.filter((x) => x.id !== fault.id) };
        const tf = flow(trial, feedIds);
        const tFaulted = new Set(trial.faults.map((x) => x.at));
        let carried = 0;
        for (const id of tf.order) {
          const ln = nodes.get(id)!;
          if (ln.type !== "lamp" || tFaulted.has(id)) continue;
          for (let c = tf.parent.get(id); c !== undefined; c = tf.parent.get(c)) {
            if (c === fault.at) {
              carried += ln.load ?? DEFAULTS.lampLoad;
              break;
            }
          }
        }
        wouldBlow.set(fault.at, carried > (fb.rating ?? DEFAULTS.fuseRating) ? carried : 0);
      }
      const brownout = [...feeds.values()].some((x) => x.over);
      return {
        wouldBlow,
        powered,
        flowFrom,
        lit,
        readableFaults: readable,
        sparking,
        fuseLoad,
        faults: m.faults.map((x) => ({ ...x })),
        breakers: new Map(m.breakers),
        switches: new Map(m.switches),
        batteries,
        parts: [...m.parts],
        targets,
        load,
        capacity,
        feeds,
        feedOf: new Map(f.feedOf),
        brownout,
        complete: targets.every((t) => lit.has(t) && f.powered.has(t)) && !brownout,
        actions: m.actions,
      };
    }
  }

  const batteryIds = puzzle.nodes.filter((n) => n.type === "battery").map((n) => n.id);
  const bat = new Map<string, BatteryRun>();
  const resetBatteries = (): void => {
    for (const id of batteryIds) {
      const n = nodes.get(id) as BatteryNode;
      bat.set(id, { charge: Math.min(Math.max(n.charge ?? 0, 0), n.capacity), released: false });
    }
  };
  resetBatteries();

  let cur = initial();
  const history: Mutable[] = [];
  let finished = false; // job:completed has fired; the Relight can't be interrupted
  let derived = settle(cur, false);

  const overList = (s: GridState): string[] => feedIds.filter((id) => s.feeds.get(id)!.over);

  function emitBrownoutIfChanged(before: GridState): void {
    if (!anyLimited) return;
    if (!multi) {
      if (derived.brownout !== before.brownout) {
        bus.emit("grid:brownout", { brownout: derived.brownout, load: derived.load, capacity: capacity! });
      }
      return;
    }
    const over = overList(derived);
    const changed = derived.brownout !== before.brownout || (derived.brownout && over.join() !== overList(before).join());
    if (changed) bus.emit("grid:brownout", { brownout: derived.brownout, load: derived.load, capacity: limitedSum, over });
  }

  /** After an action: settle (blowing fuses), then emit changed / brownout / completion. */
  function finishIfComplete(): void {
    if (derived.complete && !finished) {
      finished = true;
      bus.emit("job:completed", { puzzleId: puzzle.id, actions: cur.actions });
    }
  }

  function commit(reason: "breaker" | "switch" | "repair" | "battery"): void {
    const before = derived;
    derived = settle(cur, true);
    bus.emit("grid:changed", { reason });
    emitBrownoutIfChanged(before);
    finishIfComplete();
  }

  return {
    state: () => derived,

    throwBreaker(nodeId) {
      const n = nodes.get(nodeId);
      if (finished || !n || n.type !== "breaker") return false;
      history.push(cloneMutable(cur));
      const closed = !cur.breakers.get(nodeId);
      cur.breakers.set(nodeId, closed);
      cur.actions++;
      bus.emit("breaker:thrown", { nodeId, closed });
      commit("breaker");
      return true;
    },

    throwSwitch(nodeId) {
      const n = nodes.get(nodeId);
      if (finished || !n || n.type !== "switch") return false;
      // A relay can only be thrown while current reaches it; so can a spring switch (else it would spring straight back).
      if ((n.relay || n.spring) &&!derived.powered.has(nodeId)) return false;
      history.push(cloneMutable(cur));
      const selected: 0 | 1 = cur.switches.get(nodeId) === 0 ? 1 : 0;
      cur.switches.set(nodeId, selected);
      cur.actions++;
      bus.emit("switch:thrown", { nodeId, selected });
      commit("switch");
      return true;
    },

    release(nodeId) {
      const n = nodes.get(nodeId);
      const b = bat.get(nodeId);
      if (finished || !n || n.type !== "battery" || !b) return false;
      if (b.released) {
        b.released = false;
        bus.emit("battery:flat", { nodeId, stopped: true });
      } else {
        if (b.charge <= 0) return false;
        b.released = true;
        bus.emit("battery:released", { nodeId, charge: b.charge });
      }
      // Time is not undoable, so a release is not pushed to the undo history.
      commit("battery");
      return true;
    },

    advance(dtSeconds) {
      if (!(dtSeconds > 0) || batteryIds.length === 0) return;
      const before = derived;
      let remaining = dtSeconds;
      let changed = false;
      for (let guard = 0; remaining > EPS && guard < 10_000; guard++) {
        // Run to the next moment a battery fills or runs flat, or to the end of the step.
        let step = remaining;
        for (const id of batteryIds) {
          const b = bat.get(id)!;
          const st = derived.batteries.get(id)!;
          if (b.released && b.charge > 0) step = Math.min(step, b.charge);
          else if (st.charging) step = Math.min(step, st.capacity - b.charge);
        }
        const flat: string[] = [];
        let moved = false;
        for (const id of batteryIds) {
          const b = bat.get(id)!;
          const st = derived.batteries.get(id)!;
          if (b.released && b.charge > 0) {
            b.charge -= step;
            moved = true;
            if (b.charge <= EPS) {
              b.charge = 0;
              b.released = false;
              flat.push(id);
            }
          } else if (st.charging) {
            b.charge += step;
            if (st.capacity - b.charge <= EPS) b.charge = st.capacity;
            moved = true;
          }
        }
        remaining -= step;
        if (!moved) break; // nothing is charging or draining: the rest of the step changes nothing
        changed = true;
        derived = settle(cur, true);
        for (const id of flat) bus.emit("battery:flat", { nodeId: id, stopped: false });
        finishIfComplete();
      }
      if (changed) {
        bus.emit("grid:changed", { reason: "time" });
        emitBrownoutIfChanged(before);
      }
    },

    repairAt(at): RepairResult {
      // The Relight can't be interrupted: once the job is done nothing is repairable.
      const fault = finished ? undefined : cur.faults.find((f) => f.at === at);
      if (!fault) return { ok: false, reason: "no-fault" };
      if (!derived.readableFaults.has(fault.id)) return { ok: false, reason: "unreadable" };
      const rule = FAULT_RULES[fault.kind];
      const have = cur.parts.filter((p) => p === rule.part).length;
      if (have < rule.count) {
        return { ok: false, reason: "needs-parts", needs: { part: rule.part, count: rule.count, have } };
      }
      history.push(cloneMutable(cur));
      for (let i = 0; i < rule.count; i++) cur.parts.splice(cur.parts.indexOf(rule.part), 1);
      cur.faults = cur.faults.filter((f) => f.id !== fault.id);
      cur.actions++;
      bus.emit("repair:completed", { faultId: fault.id, at: fault.at, part: rule.part, count: rule.count });
      commit("repair");
      return { ok: true, fault };
    },

    undo() {
      if (finished) return false;
      const prev = history.pop();
      if (!prev) return false;
      const before = derived;
      cur = prev;
      derived = settle(cur, false);
      bus.emit("grid:changed", { reason: "reset" });
      emitBrownoutIfChanged(before);
      return true;
    },

    reset() {
      const before = derived;
      cur = initial();
      history.length = 0;
      resetBatteries();
      finished = false;
      derived = settle(cur, false);
      bus.emit("grid:changed", { reason: "reset" });
      emitBrownoutIfChanged(before);
    },
  };
}
