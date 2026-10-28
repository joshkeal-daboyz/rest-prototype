/**
 * The map-scope grid simulator. Pure: no DOM, no timers, no randomness.
 * Rules: puzzles/SCHEMA.md and docs/prototype-brief.md.
 */

import { DEFAULTS, EventBus, FAULT_RULES, type BatteryNode, type Fault, type GridNode, type Line, type Part, type Puzzle } from "../core";
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
  const feed = puzzle.nodes.find((n) => n.type === "feed");
  if (!feed) throw new Error("puzzle has no feed node");
  const feedId = feed.id;
  const lampIds = puzzle.nodes.filter((n) => n.type === "lamp").map((n) => n.id);
  const targets: readonly string[] = puzzle.target && puzzle.target.length > 0 ? [...puzzle.target] : lampIds;
  const capacity = puzzle.capacity;
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

  /** Current spreading from one source: the feed, or a released battery (out of every line but its input). */
  function flow(m: Mutable, rootId: string): Flow {
    const faultAt = new Map<string, Fault>(m.faults.map((f) => [f.at, f]));
    const powered = new Set<string>([rootId]);
    const flowFrom = new Map<string, string>();
    const parent = new Map<string, string>();
    const parentLine = new Map<string, string>();
    const order: string[] = [rootId];

    const conducts = (n: GridNode): boolean => {
      switch (n.type) {
        case "feed":
        case "switch":
          return true;
        case "breaker":
          return m.breakers.get(n.id) === true;
        case "fusebox":
        case "junction":
          return !faultAt.has(n.id);
        case "lamp":
        case "battery": // never passes the feed's current on; it only sources when it is a root
          return false;
      }
    };

    for (let i = 0; i < order.length; i++) {
      const id = order[i]!;
      const n = nodes.get(id)!;
      if (!(i === 0 && n.type === "battery") && !conducts(n)) continue;
      const out =
        n.type === "switch"
          ? [n.outputs[m.switches.get(n.id) ?? n.selected]]
          : n.type === "battery"
            ? (adjacency.get(id) ?? []).filter((l) => l !== n.input)
            : (adjacency.get(id) ?? []);
      for (const lineId of out) {
        if (powered.has(lineId)) continue;
        const line = lines.get(lineId)!;
        const otherId = line.from === id ? line.to : line.from;
        const other = nodes.get(otherId)!;
        // A switch only sends current out of its outputs; it can't be entered through one.
        if (other.type === "switch" && other.outputs.includes(lineId)) continue;
        powered.add(lineId);
        flowFrom.set(lineId, id);
        // A battery is entered only through its input line; from its far side the current stops at it.
        if (other.type === "battery" && other.input !== lineId) continue;
        // Current runs up to a damaged cable and stops there.
        if (faultAt.get(lineId)?.kind === "damaged-cable") continue;
        if (powered.has(otherId)) continue;
        powered.add(otherId);
        parent.set(otherId, id);
        parentLine.set(otherId, lineId);
        order.push(otherId);
      }
    }
    return { powered, flowFrom, order, parent, parentLine };
  }

  /**
   * The lamp newly fed through `fuseId` (downstream of it now, not under that fuse before the action); the
   * largest load wins, ties by discovery order. `null` with no earlier settle or no new lamp.
   */
  function nameCulprit(
    f: Flow,
    fuseId: string,
    before: ReadonlyMap<string, ReadonlySet<string>> | null,
    loadOf: (id: string) => number,
  ): { culprit: string | null; path: string[] } {
    if (before === null) return { culprit: null, path: [] };
    const was = before.get(fuseId) ?? new Set<string>();
    let best: string | null = null;
    let bestLoad = 0;
    for (const id of f.order) {
      const w = loadOf(id);
      if (w <= bestLoad || was.has(id)) continue;
      for (let c: string | undefined = id; c !== undefined; c = f.parent.get(c)) {
        if (c === fuseId && c !== id) {
          best = id;
          bestLoad = w;
          break;
        }
      }
    }
    if (best === null) return { culprit: null, path: [] };
    const path: string[] = [];
    for (let c = best; c !== fuseId; c = f.parent.get(c)!) path.push(f.parentLine.get(c)!);
    return { culprit: best, path: path.reverse() };
  }

  /** Recompute, blowing overloaded fuses (outermost first) until stable. Mutates `m.faults`. */
  function settle(m: Mutable, emit: boolean): GridState {
    const before = m.prevUnder;
    for (;;) {
      const f = flow(m, feedId);
      const faulted = new Set(m.faults.map((x) => x.at));
      const loadOf = (id: string): number => {
        const n = nodes.get(id)!;
        return n.type === "lamp" && f.powered.has(id) && !faulted.has(id) ? (n.load ?? DEFAULTS.lampLoad) : 0;
      };
      // Would-be-lit load downstream of every powered node.
      const sub = new Map<string, number>();
      for (let i = f.order.length - 1; i >= 0; i--) {
        const id = f.order[i]!;
        const total = (sub.get(id) ?? 0) + loadOf(id);
        sub.set(id, total);
        const p = f.parent.get(id);
        if (p !== undefined) sub.set(p, (sub.get(p) ?? 0) + total);
      }
      let blew = false;
      for (const id of f.order) {
        const n = nodes.get(id)!;
        if (n.type !== "fusebox" || faulted.has(id)) continue;
        const rating = n.rating ?? DEFAULTS.fuseRating;
        const load = sub.get(id) ?? 0;
        if (load > rating) {
          const fault: Fault = { id: `blown-${id}`, at: id, kind: "blown-fuse" };
          m.faults.push(fault);
          if (emit) {
            const { culprit, path } = nameCulprit(f, id, before, loadOf);
            bus.emit("fuse:blown", { nodeId: id, faultId: fault.id, load, rating, culprit, path });
          }
          blew = true;
          break;
        }
      }
      if (blew) continue;

      // Released batteries with charge left are further sources; only the feed's own flow sets the load.
      const powered = new Set(f.powered);
      const flowFrom = new Map(f.flowFrom);
      for (const bid of batteryIds) {
        const b = bat.get(bid)!;
        if (!b.released || b.charge <= 0) continue;
        const bf = flow(m, bid);
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
      for (const id of lampIds) {
        if (powered.has(id) && !faulted.has(id)) {
          lit.add(id);
          if (f.powered.has(id)) load += loadOf(id);
        }
      }
      // The same `sub` totals the blow check compared against each rating; 0 when unpowered or blown.
      const fuseLoad = new Map<string, number>();
      for (const fid of fuseIds) fuseLoad.set(fid, f.powered.has(fid) && !faulted.has(fid) ? (sub.get(fid) ?? 0) : 0);
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
        const tf = flow(trial, feedId);
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
      const brownout = capacity !== null && load > capacity;
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

  function emitBrownoutIfChanged(before: GridState): void {
    if (capacity !== null && derived.brownout !== before.brownout) {
      bus.emit("grid:brownout", { brownout: derived.brownout, load: derived.load, capacity });
    }
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
