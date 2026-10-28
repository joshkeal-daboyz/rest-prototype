/**
 * The map-scope grid simulator. Pure: no DOM, no timers, no randomness.
 * Rules: puzzles/SCHEMA.md and docs/prototype-brief.md.
 */

import { DEFAULTS, EventBus, FAULT_RULES, type Fault, type GridNode, type Line, type Part, type Puzzle } from "../core";
import type { Grid, GridState, RepairResult } from "./types";

interface Mutable {
  breakers: Map<string, boolean>;
  switches: Map<string, 0 | 1>;
  faults: Fault[];
  parts: Part[];
  actions: number;
}

const cloneMutable = (m: Mutable): Mutable => ({
  breakers: new Map(m.breakers),
  switches: new Map(m.switches),
  faults: m.faults.map((f) => ({ ...f })),
  parts: [...m.parts],
  actions: m.actions,
});

interface Flow {
  powered: Set<string>;
  flowFrom: Map<string, string>;
  /** Powered nodes in discovery order (outermost first). */
  order: string[];
  parent: Map<string, string>;
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
    };
  };

  function flow(m: Mutable): Flow {
    const faultAt = new Map<string, Fault>(m.faults.map((f) => [f.at, f]));
    const powered = new Set<string>([feedId]);
    const flowFrom = new Map<string, string>();
    const parent = new Map<string, string>();
    const order: string[] = [feedId];

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
          return false;
      }
    };

    for (let i = 0; i < order.length; i++) {
      const id = order[i]!;
      const n = nodes.get(id)!;
      if (!conducts(n)) continue;
      const out = n.type === "switch" ? [n.outputs[m.switches.get(n.id) ?? n.selected]] : (adjacency.get(id) ?? []);
      for (const lineId of out) {
        if (powered.has(lineId)) continue;
        const line = lines.get(lineId)!;
        const otherId = line.from === id ? line.to : line.from;
        const other = nodes.get(otherId)!;
        // A switch only sends current out of its outputs; it can't be entered through one.
        if (other.type === "switch" && other.outputs.includes(lineId)) continue;
        powered.add(lineId);
        flowFrom.set(lineId, id);
        // Current runs up to a damaged cable and stops there.
        if (faultAt.get(lineId)?.kind === "damaged-cable") continue;
        if (powered.has(otherId)) continue;
        powered.add(otherId);
        parent.set(otherId, id);
        order.push(otherId);
      }
    }
    return { powered, flowFrom, order, parent };
  }

  /** Recompute, blowing overloaded fuses (outermost first) until stable. Mutates `m.faults`. */
  function settle(m: Mutable, emit: boolean): GridState {
    for (;;) {
      const f = flow(m);
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
          if (emit) bus.emit("fuse:blown", { nodeId: id, faultId: fault.id, load, rating });
          blew = true;
          break;
        }
      }
      if (blew) continue;

      const lit = new Set<string>();
      let load = 0;
      for (const id of lampIds) {
        if (f.powered.has(id) && !faulted.has(id)) {
          lit.add(id);
          load += loadOf(id);
        }
      }
      const readable = new Set<string>();
      const sparking = new Set<string>();
      for (const fault of m.faults) {
        if (f.powered.has(fault.at)) {
          readable.add(fault.id);
          if (fault.kind === "damaged-cable") sparking.add(fault.at);
        }
      }
      const brownout = capacity !== null && load > capacity;
      return {
        powered: f.powered,
        flowFrom: f.flowFrom,
        lit,
        readableFaults: readable,
        sparking,
        faults: m.faults.map((x) => ({ ...x })),
        breakers: new Map(m.breakers),
        switches: new Map(m.switches),
        parts: [...m.parts],
        targets,
        load,
        capacity,
        brownout,
        complete: targets.every((t) => lit.has(t)) && !brownout,
        actions: m.actions,
      };
    }
  }

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
  function commit(reason: "breaker" | "switch" | "repair"): void {
    const before = derived;
    derived = settle(cur, true);
    bus.emit("grid:changed", { reason });
    emitBrownoutIfChanged(before);
    if (derived.complete && !finished) {
      finished = true;
      bus.emit("job:completed", { puzzleId: puzzle.id, actions: cur.actions });
    }
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
      history.push(cloneMutable(cur));
      const selected: 0 | 1 = cur.switches.get(nodeId) === 0 ? 1 : 0;
      cur.switches.set(nodeId, selected);
      cur.actions++;
      bus.emit("switch:thrown", { nodeId, selected });
      commit("switch");
      return true;
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
      finished = false;
      derived = settle(cur, false);
      bus.emit("grid:changed", { reason: "reset" });
      emitBrownoutIfChanged(before);
    },
  };
}
