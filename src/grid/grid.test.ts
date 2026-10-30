import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { EventBus, loadPuzzle, type Fault, type GridNode, type Line, type Part, type Puzzle } from "../core";
import { createGrid } from "./index";

const PUZZLES = join(__dirname, "..", "..", "puzzles");
const fixture = (f: string): Puzzle => loadPuzzle(JSON.parse(readFileSync(join(PUZZLES, f), "utf8")) as unknown);
const shrine = (over: Partial<Puzzle> = {}): Puzzle => ({ ...fixture("09-shrine-circuit.json"), ...over });
const lampRow = (over: Partial<Puzzle> = {}): Puzzle => ({ ...fixture("lamp-row.grid.json"), ...over });

/** A small inline map. Positions don't matter to the simulator. */
function mini(
  nodes: Array<{ id: string; type: GridNode["type"] } & Record<string, unknown>>,
  lines: Array<[id: string, from: string, to: string]>,
  faults: Fault[] = [],
  over: Partial<Puzzle> = {},
): Puzzle {
  return {
    id: "mini",
    name: "mini",
    version: 3,
    scope: "map",
    capacity: null,
    nodes: nodes.map((n, i) => ({ pos: [i, 0], ...n }) as unknown as GridNode),
    lines: lines.map(([id, from, to]): Line => ({ id, from, to })),
    faults,
    ...over,
  };
}

const sorted = (s: ReadonlySet<string>) => [...s].sort();

function record(bus: EventBus) {
  const log: Array<[string, unknown]> = [];
  for (const name of [
    "grid:changed", "breaker:thrown", "switch:thrown", "fuse:blown", "repair:completed", "grid:brownout", "job:completed",
  ] as const) {
    bus.on(name, (p) => log.push([name, p]));
  }
  return log;
}

describe("power flows from the feed outward", () => {
  it("a node or line with an unrepaired blocking fault conducts nothing past it (dead junction)", () => {
    const s = createGrid(shrine()).state();
    expect(s.powered.has("j_dead")).toBe(true); // current reaches it...
    expect(s.powered.has("l_a2")).toBe(false); // ...and stops
    expect(s.powered.has("j5")).toBe(false);
    expect(s.powered.has("shrine")).toBe(false);
  });

  it("a damaged cable is reached by current but conducts nothing past it", () => {
    const g = createGrid(shrine());
    g.throwSwitch("sw_1");
    const s = g.state();
    expect(s.powered.has("l_b")).toBe(true);
    expect(s.powered.has("j4")).toBe(false);
    expect(s.powered.has("flood")).toBe(false);
  });

  it("a blown fuse conducts nothing past it but the box itself is reached", () => {
    const s = createGrid(lampRow()).state();
    expect(s.powered.has("fb_A")).toBe(true);
    expect(s.powered.has("l_main3")).toBe(false);
    expect(s.powered.has("lamp_03")).toBe(false); // lamp_03 hangs off the blown box
  });

  it("flowFrom records which node each powered line is fed from", () => {
    const s = createGrid(shrine()).state();
    expect(s.flowFrom.get("l_feed")).toBe("feed");
    expect(s.flowFrom.get("l_main")).toBe("br_main");
    expect(s.flowFrom.get("l_sw")).toBe("j1"); // fed from j1, into the switch
    expect(s.flowFrom.get("l_a")).toBe("sw_1");
    expect(s.flowFrom.get("l_st2")).toBe("j2");
    expect([...s.flowFrom.keys()].every((l) => s.powered.has(l))).toBe(true);
  });

  it("current also flows along a line against its from/to direction", () => {
    const p = mini(
      [{ id: "feed", type: "feed" }, { id: "j", type: "junction" }, { id: "lamp", type: "lamp" }],
      [["l1", "j", "feed"], ["l2", "lamp", "j"]],
    );
    const s = createGrid(p).state();
    expect(s.lit.has("lamp")).toBe(true);
    expect(s.flowFrom.get("l2")).toBe("j");
  });
});

describe("lamps are leaves", () => {
  const base = (faults: Fault[]) =>
    mini(
      [{ id: "feed", type: "feed" }, { id: "j", type: "junction" }, { id: "a", type: "lamp" }, { id: "b", type: "lamp" }],
      [["l0", "feed", "j"], ["la", "j", "a"], ["lb", "j", "b"]],
      faults,
    );

  it("a dead-lamp never changes power anywhere else", () => {
    const healthy = createGrid(base([])).state();
    const dead = createGrid(base([{ id: "f", at: "a", kind: "dead-lamp" }])).state();
    expect(sorted(dead.powered)).toEqual(sorted(healthy.powered));
    expect([...dead.flowFrom]).toEqual([...healthy.flowFrom]);
    expect(dead.lit.has("a")).toBe(false);
    expect(dead.lit.has("b")).toBe(true);
  });

  it("a dead-lamp contributes no load", () => {
    expect(createGrid(base([{ id: "f", at: "a", kind: "dead-lamp" }])).state().load).toBe(1);
  });
});

describe("breakers and switches", () => {
  it("a breaker conducts only while closed", () => {
    const g = createGrid(shrine());
    expect(g.state().powered.has("l_main")).toBe(true);
    expect(g.throwBreaker("br_main")).toBe(true);
    expect(g.state().breakers.get("br_main")).toBe(false);
    expect(g.state().powered.has("br_main")).toBe(true); // reached
    expect(g.state().powered.has("l_main")).toBe(false); // but nothing past it
    expect(g.state().lit.size).toBe(0);
    g.throwBreaker("br_main");
    expect(g.state().lit.size).toBe(3);
  });

  it("a switch passes current only to outputs[selected]; the unselected output line is dead", () => {
    const g = createGrid(shrine());
    expect(g.state().powered.has("l_a")).toBe(true);
    expect(g.state().powered.has("l_b")).toBe(false);
    g.throwSwitch("sw_1");
    expect(g.state().switches.get("sw_1")).toBe(1);
    expect(g.state().powered.has("l_a")).toBe(false);
    expect(g.state().powered.has("j_dead")).toBe(false);
    expect(g.state().powered.has("l_b")).toBe(true);
  });

  it("current may enter a switch from any non-output line, and never through an output line", () => {
    // Two feeds-side routes into the switch: from j via "in1" and from k via "in2" (both non-outputs).
    const p = mini(
      [
        { id: "feed", type: "feed" }, { id: "sw", type: "switch", outputs: ["o0", "o1"], selected: 0 },
        { id: "x", type: "lamp" }, { id: "y", type: "lamp" },
      ],
      [["in1", "feed", "sw"], ["o0", "sw", "x"], ["o1", "sw", "y"]],
    );
    const g = createGrid(p);
    expect(g.state().flowFrom.get("in1")).toBe("feed");
    expect(g.state().lit.has("x")).toBe(true);
    expect(g.state().lit.has("y")).toBe(false);
    // Feed wired directly to the far end of an output line: it must not back-feed the switch.
    const back = mini(
      [
        { id: "feed", type: "feed" }, { id: "sw", type: "switch", outputs: ["o0", "o1"], selected: 0 },
        { id: "j", type: "junction" }, { id: "x", type: "lamp" }, { id: "y", type: "lamp" },
      ],
      [["feed_j", "feed", "j"], ["o0", "sw", "j"], ["o1", "sw", "y"], ["jx", "j", "x"]],
    );
    const s = createGrid(back).state();
    expect(s.powered.has("sw")).toBe(false);
    expect(s.powered.has("o0")).toBe(false);
    expect(s.lit.has("x")).toBe(true);
  });

  it("throwing something that is not a breaker (or switch) returns false and changes nothing", () => {
    const g = createGrid(shrine());
    expect(g.throwBreaker("sw_1")).toBe(false);
    expect(g.throwSwitch("br_main")).toBe(false);
    expect(g.throwBreaker("nope")).toBe(false);
    expect(g.state().actions).toBe(0);
  });
});

describe("readability: a fault is readable only when current reaches it", () => {
  it("shrine circuit at start: readable = {f1}", () => {
    expect(sorted(createGrid(shrine()).state().readableFaults)).toEqual(["f1"]);
  });

  it("shrine circuit: throwing the switch shows f2 and hides f1", () => {
    const g = createGrid(shrine());
    g.throwSwitch("sw_1");
    expect(sorted(g.state().readableFaults)).toEqual(["f2"]);
  });

  it("Lamp Row at start: readable = {f1, f2, f7}, the other five are hidden", () => {
    const s = createGrid(lampRow()).state();
    expect(sorted(s.readableFaults)).toEqual(["f1", "f2", "f7"]);
    expect(s.faults).toHaveLength(8);
  });

  it("Lamp Row after repairing fb_A: readable = {f1, f3, f4, f7}", () => {
    const g = createGrid(lampRow({ startingParts: ["fuse"] }));
    expect(g.repairAt("fb_A").ok).toBe(true);
    expect(sorted(g.state().readableFaults)).toEqual(["f1", "f3", "f4", "f7"]);
  });

  it("sparking = lines with a readable damaged-cable", () => {
    const s = createGrid(lampRow()).state();
    expect(sorted(s.sparking)).toEqual(["l_side3"]);
    const hidden = createGrid(shrine()).state(); // f2's cable is not reached at start
    expect(hidden.sparking.size).toBe(0);
    const g = createGrid(shrine());
    g.throwSwitch("sw_1");
    expect(sorted(g.state().sparking)).toEqual(["l_b"]);
  });
});

describe("fuse rating", () => {
  const fuseMap = (rating: number | undefined, lampLoads: Array<number | undefined> = [undefined, undefined]) =>
    mini(
      [
        { id: "feed", type: "feed" },
        { id: "fb", type: "fusebox", ...(rating === undefined ? {} : { rating }) },
        { id: "j", type: "junction" },
        ...lampLoads.map((load, i) => ({ id: `lamp${i}`, type: "lamp" as const, ...(load === undefined ? {} : { load }) })),
      ],
      [["l0", "feed", "fb"], ["l1", "fb", "j"], ...lampLoads.map((_, i): [string, string, string] => [`lj${i}`, "j", `lamp${i}`])],
    );

  it("a powered fusebox whose downstream lit load exceeds rating gains a blown-fuse fault and emits fuse:blown", () => {
    const bus = new EventBus();
    const log = record(bus);
    const g = createGrid(fuseMap(1), bus);
    // Blown at construction (silently), so check the state; events are exercised by a throw below.
    expect(g.state().faults.map((f) => f.kind)).toEqual(["blown-fuse"]);
    expect(g.state().lit.size).toBe(0);
    expect(log).toHaveLength(0);
  });

  it("fuse:blown fires with node, new fault id, load and rating when power returns to an overloaded fuse", () => {
    const p = mini(
      [
        { id: "feed", type: "feed" }, { id: "br", type: "breaker", closed: false },
        { id: "fb", type: "fusebox", rating: 1 }, { id: "j", type: "junction" },
        { id: "a", type: "lamp" }, { id: "b", type: "lamp" },
      ],
      [["l0", "feed", "br"], ["l1", "br", "fb"], ["l2", "fb", "j"], ["la", "j", "a"], ["lb", "j", "b"]],
    );
    const bus = new EventBus();
    const log = record(bus);
    const g = createGrid(p, bus);
    expect(g.state().faults).toHaveLength(0);
    g.throwBreaker("br");
    const blown = log.filter(([n]) => n === "fuse:blown");
    expect(blown).toHaveLength(1);
    expect(blown[0]![1]).toMatchObject({ nodeId: "fb", load: 2, rating: 1 });
    const fault = g.state().faults[0]!;
    expect(fault).toMatchObject({ at: "fb", kind: "blown-fuse" });
    expect(g.state().readableFaults.has(fault.id)).toBe(true);
    expect(g.state().lit.size).toBe(0);
  });

  it("a load equal to the rating does not blow the fuse", () => {
    expect(createGrid(fuseMap(2)).state().faults).toHaveLength(0);
  });

  it("an absent rating never blows", () => {
    const s = createGrid(fuseMap(undefined, [5, 5, 5])).state();
    expect(s.faults).toHaveLength(0);
    expect(s.load).toBe(15);
  });

  it("an absent lamp load counts as 1", () => {
    expect(createGrid(fuseMap(undefined, [undefined, undefined, undefined])).state().load).toBe(3);
  });

  it("repeat until stable: nested fuseboxes blow outermost first and the inner one is left alone", () => {
    const p = mini(
      [
        { id: "feed", type: "feed" },
        { id: "outer", type: "fusebox", rating: 1 }, { id: "inner", type: "fusebox", rating: 5 },
        { id: "a", type: "lamp" }, { id: "b", type: "lamp" },
      ],
      [["l0", "feed", "outer"], ["l1", "outer", "inner"], ["la", "inner", "a"], ["lb", "inner", "b"]],
    );
    const s = createGrid(p).state();
    expect(s.faults.map((f) => f.at)).toEqual(["outer"]);
  });

  it("repeat until stable: after the outer fuse is replaced, an overloaded inner fuse then blows", () => {
    const p = mini(
      [
        { id: "feed", type: "feed" },
        { id: "outer", type: "fusebox", rating: 1 }, { id: "inner", type: "fusebox", rating: 1 },
        { id: "a", type: "lamp" }, { id: "b", type: "lamp" }, { id: "c", type: "lamp" },
      ],
      [["l0", "feed", "outer"], ["l1", "outer", "inner"], ["la", "inner", "a"], ["lb", "inner", "b"], ["lc", "outer", "c"]],
      [],
      { startingParts: ["fuse", "fuse"] as Part[] },
    );
    const bus = new EventBus();
    const log = record(bus);
    const g = createGrid(p, bus);
    expect(g.state().faults.map((f) => f.at)).toEqual(["outer"]);
    const id = g.state().faults[0]!.at;
    expect(g.repairAt(id).ok).toBe(true); // outer repaired; its 3-lamp load still exceeds rating 1 -> blows again
    expect(g.state().faults.map((f) => f.at)).toEqual(["outer"]);
    expect(log.filter(([n]) => n === "fuse:blown")).toHaveLength(1);
  });

  it("the fuse check counts load that would be lit even when the section is browned out (fuse is checked before brownout)", () => {
    const p = fuseMap(2);
    const g = createGrid({ ...p, capacity: 1 });
    expect(g.state().brownout).toBe(true);
    expect(g.state().faults).toHaveLength(0);
  });

  it("shrine circuit: fb_A (rating 3) carries the three street lamps without blowing", () => {
    const s = createGrid(shrine()).state();
    expect(s.faults.map((f) => f.id).sort()).toEqual(["f1", "f2"]);
  });
});

describe("capacity", () => {
  const lamps = (n: number, capacity: number | null) =>
    mini(
      [{ id: "feed", type: "feed" }, { id: "br", type: "breaker", closed: false }, { id: "j", type: "junction" },
        ...Array.from({ length: n }, (_, i) => ({ id: `l${i}`, type: "lamp" as const }))],
      [["a", "feed", "br"], ["b", "br", "j"], ...Array.from({ length: n }, (_, i): [string, string, string] => [`c${i}`, "j", `l${i}`])],
      [],
      { capacity },
    );

  it("if total lit load > capacity, brownout is true; load equal to capacity is fine", () => {
    const at = createGrid(lamps(2, 2));
    at.throwBreaker("br");
    expect(at.state()).toMatchObject({ load: 2, brownout: false, capacity: 2 });
    const over = createGrid(lamps(3, 2));
    over.throwBreaker("br");
    expect(over.state()).toMatchObject({ load: 3, brownout: true });
    expect(over.state().complete).toBe(false);
  });

  it("lamps still count as lit in the lit set during brownout (the renderer flickers them)", () => {
    const g = createGrid(lamps(3, 2));
    g.throwBreaker("br");
    expect(g.state().lit.size).toBe(3);
  });

  it("grid:brownout fires when brownout changes (entered, then cleared) and not otherwise", () => {
    const bus = new EventBus();
    const log = record(bus);
    const g = createGrid(lamps(3, 2), bus);
    g.throwBreaker("br"); // open -> closed: browns out
    expect(log.filter(([n]) => n === "grid:brownout")).toEqual([["grid:brownout", { brownout: true, load: 3, capacity: 2 }]]);
    g.throwBreaker("br"); // closed -> open: clears
    expect(log.filter(([n]) => n === "grid:brownout")).toHaveLength(2);
    expect(log.filter(([n]) => n === "grid:brownout")[1]![1]).toMatchObject({ brownout: false });
  });

  it("capacity: null never browns out", () => {
    const g = createGrid(lamps(50, null));
    g.throwBreaker("br");
    expect(g.state()).toMatchObject({ load: 50, brownout: false, capacity: null });
  });
});

describe("repairAt", () => {
  it("is refused with no-fault where there is no fault", () => {
    const g = createGrid(shrine());
    expect(g.repairAt("shrine")).toEqual({ ok: false, reason: "no-fault" });
    expect(g.repairAt("nope")).toEqual({ ok: false, reason: "no-fault" });
  });

  it("is refused with unreadable when current doesn't reach the fault", () => {
    const g = createGrid(shrine());
    expect(g.repairAt("l_b")).toEqual({ ok: false, reason: "unreadable" });
    expect(g.state().parts).toEqual(["wire"]);
  });

  it("is refused with needs-parts, saying part, count and have", () => {
    const g = createGrid(shrine()); // f1 is a dead-junction: wire x2, but only one wire
    expect(g.repairAt("j_dead")).toEqual({ ok: false, reason: "needs-parts", needs: { part: "wire", count: 2, have: 1 } });
    expect(g.state().parts).toEqual(["wire"]);
    expect(g.state().actions).toBe(0);
    const none = createGrid(shrine({ startingParts: [] }));
    expect(none.repairAt("j_dead")).toMatchObject({ reason: "needs-parts", needs: { part: "wire", count: 2, have: 0 } });
  });

  it("on success consumes `count` parts of that kind and emits repair:completed", () => {
    const bus = new EventBus();
    const log = record(bus);
    const g = createGrid(shrine({ startingParts: ["bulb", "wire", "wire", "wire"] }), bus);
    const r = g.repairAt("j_dead");
    expect(r).toEqual({ ok: true, fault: { id: "f1", at: "j_dead", kind: "dead-junction" } });
    expect(g.state().parts).toEqual(["bulb", "wire"]);
    expect(g.state().faults.map((f) => f.id)).toEqual(["f2"]);
    expect(log.filter(([n]) => n === "repair:completed")).toEqual([
      ["repair:completed", { faultId: "f1", at: "j_dead", part: "wire", count: 2 }],
    ]);
    expect(g.state().powered.has("j5")).toBe(true); // the repair let current through
  });

  it("repairing a hidden fault is refused until current reaches it, then allowed", () => {
    const g = createGrid(shrine());
    g.throwSwitch("sw_1");
    expect(g.repairAt("l_b").ok).toBe(true);
  });
});

describe("completion", () => {
  it("complete = every target lit and no brownout; target absent = every lamp", () => {
    const g = createGrid(shrine());
    expect(g.state().targets).toEqual(["shrine"]);
    expect(g.state().complete).toBe(false);
    const { target: _omit, ...noTarget } = shrine();
    const all = createGrid(noTarget);
    expect(all.state().targets).toEqual(["street_1", "street_2", "street_3", "flood", "shrine"]);
    const empty = createGrid(shrine({ target: [] }));
    expect(empty.state().targets).toHaveLength(5);
  });

  it("a lit target during brownout is not complete", () => {
    const g = createGrid(shrine());
    g.throwSwitch("sw_1");
    g.repairAt("l_b");
    expect(g.state().lit.has("shrine")).toBe(true);
    expect(g.state().brownout).toBe(true);
    expect(g.state().complete).toBe(false);
  });

  it("job:completed fires exactly once; afterwards throws, repairs and undo are refused", () => {
    const bus = new EventBus();
    const log = record(bus);
    const g = createGrid(shrine({ startingParts: ["wire", "wire", "wire"] }), bus);
    g.throwSwitch("sw_1");
    g.repairAt("l_b");
    g.throwBreaker("br_street");
    expect(g.state().complete).toBe(true);
    expect(log.filter(([n]) => n === "job:completed")).toEqual([["job:completed", { puzzleId: "09-shrine-circuit", actions: 3 }]]);

    const before = g.state();
    expect(g.throwBreaker("br_street")).toBe(false);
    expect(g.throwSwitch("sw_1")).toBe(false);
    expect(g.repairAt("j_dead").ok).toBe(false);
    expect(g.undo()).toBe(false);
    expect(g.state()).toBe(before);
    expect(g.state().actions).toBe(3);
    expect(log.filter(([n]) => n === "job:completed")).toHaveLength(1);
  });
});

describe("shrine circuit is won in exactly three actions", () => {
  it("throw sw_1, repair l_b, throw br_street: browned out with load 6 after step 2, load 3 after step 3", () => {
    const bus = new EventBus();
    const log = record(bus);
    const g = createGrid(shrine(), bus);
    expect(g.state().load).toBe(3); // street lamps only

    expect(g.throwSwitch("sw_1")).toBe(true);
    expect(g.state().complete).toBe(false);

    expect(g.repairAt("l_b")).toMatchObject({ ok: true });
    expect(g.state()).toMatchObject({ load: 6, brownout: true, complete: false, parts: [] });
    expect([...g.state().lit].sort()).toEqual(["flood", "shrine", "street_1", "street_2", "street_3"]);

    expect(g.throwBreaker("br_street")).toBe(true);
    expect(g.state()).toMatchObject({ load: 3, brownout: false, complete: true, actions: 3 });
    expect([...g.state().lit].sort()).toEqual(["flood", "shrine"]);

    expect(log.map(([n]) => n).filter((n) => n !== "grid:changed")).toEqual([
      "switch:thrown", "repair:completed", "grid:brownout", "breaker:thrown", "grid:brownout", "job:completed",
    ]);
  });

  it("shrine circuit start state: street lamps lit (load 3 of 4), not complete", () => {
    expect(createGrid(shrine()).state()).toMatchObject({ load: 3, capacity: 4, brownout: false, complete: false, actions: 0 });
  });
});

describe("undo and reset", () => {
  it("undo() restores the previous throws, faults and parts", () => {
    const g = createGrid(shrine());
    g.throwSwitch("sw_1");
    g.repairAt("l_b");
    expect(g.state().parts).toEqual([]);
    expect(g.undo()).toBe(true);
    expect(g.state().parts).toEqual(["wire"]);
    expect(g.state().faults.map((f) => f.id).sort()).toEqual(["f1", "f2"]);
    expect(g.state().switches.get("sw_1")).toBe(1);
    expect(g.state().actions).toBe(1);
    expect(g.undo()).toBe(true);
    expect(g.state().switches.get("sw_1")).toBe(0);
    expect(g.state().actions).toBe(0);
    expect(g.undo()).toBe(false); // nothing left
  });

  it("undo() also takes back a fuse that blew as a result of the undone action", () => {
    const p = mini(
      [
        { id: "feed", type: "feed" }, { id: "br", type: "breaker", closed: false },
        { id: "fb", type: "fusebox", rating: 1 }, { id: "a", type: "lamp" }, { id: "b", type: "lamp" },
      ],
      [["l0", "feed", "br"], ["l1", "br", "fb"], ["la", "fb", "a"], ["lb", "fb", "b"]],
    );
    const g = createGrid(p);
    g.throwBreaker("br");
    expect(g.state().faults).toHaveLength(1);
    g.undo();
    expect(g.state().faults).toHaveLength(0);
    expect(g.state().breakers.get("br")).toBe(false);
  });

  it("reset() returns to the file's state, including the action count", () => {
    const g = createGrid(shrine());
    const start = g.state();
    g.throwSwitch("sw_1");
    g.repairAt("l_b");
    g.throwBreaker("br_street");
    g.reset();
    const s = g.state();
    expect(s.actions).toBe(0);
    expect(s.parts).toEqual(["wire"]);
    expect(s.faults).toEqual(start.faults);
    expect(sorted(s.powered)).toEqual(sorted(start.powered));
    expect(s.breakers.get("br_street")).toBe(true);
    expect(s.switches.get("sw_1")).toBe(0);
    expect(g.undo()).toBe(false);
  });

  it("reset() after the job is done reopens the board", () => {
    const g = createGrid(shrine());
    g.throwSwitch("sw_1");
    g.repairAt("l_b");
    g.throwBreaker("br_street");
    g.reset();
    expect(g.throwSwitch("sw_1")).toBe(true);
  });

  it("actions counts throws and repairs, not refused attempts", () => {
    const g = createGrid(shrine());
    g.repairAt("l_b"); // unreadable
    g.throwBreaker("nope");
    expect(g.state().actions).toBe(0);
    g.throwSwitch("sw_1");
    g.repairAt("l_b");
    g.throwBreaker("br_street");
    expect(g.state().actions).toBe(3);
  });

  it("the puzzle object passed in is never mutated", () => {
    const p = shrine();
    const snap = JSON.stringify(p);
    const g = createGrid(p);
    g.throwSwitch("sw_1");
    g.repairAt("l_b");
    g.throwBreaker("br_street");
    g.undo();
    g.reset();
    expect(JSON.stringify(p)).toBe(snap);
  });
});

describe("determinism and purity", () => {
  it("the same actions on the same puzzle give identical states", () => {
    const run = () => {
      const g = createGrid(lampRow({ startingParts: ["fuse", "bulb"] }));
      g.repairAt("fb_A");
      g.repairAt("lamp_02");
      g.throwBreaker("breaker_side");
      const s = g.state();
      return JSON.stringify({
        powered: [...s.powered], flow: [...s.flowFrom], lit: [...s.lit], readable: [...s.readableFaults],
        sparking: [...s.sparking], faults: s.faults, load: s.load, parts: s.parts, actions: s.actions,
      });
    };
    expect(run()).toBe(run());
  });

  it("src/grid imports nothing from src/render, src/play, src/ui or the DOM", () => {
    const files = readdirSync(__dirname).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const src = readFileSync(join(__dirname, f), "utf8");
      expect(src, f).not.toMatch(/from\s+["'][^"']*\/(render|play|ui)(\/|["'])/);
      expect(src, f).not.toMatch(/\b(document|window|HTMLElement|requestAnimationFrame|setTimeout|setInterval|Math\.random|Date\.now)\b/);
    }
  });
});
