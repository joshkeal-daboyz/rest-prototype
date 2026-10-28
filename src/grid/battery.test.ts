import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EventBus, loadPuzzle, type Fault, type GridNode, type Line, type Puzzle } from "../core";
import { createGrid } from "./index";

/** Batteries and relay switches (ticket 008). Small inline maps; positions don't matter to the simulator. */
function mini(
  nodes: Array<{ id: string; type: GridNode["type"] } & Record<string, unknown>>,
  lines: Array<[id: string, from: string, to: string]>,
  faults: Fault[] = [],
  over: Partial<Puzzle> = {},
): Puzzle {
  return {
    id: "mini",
    name: "mini",
    version: 4,
    scope: "map",
    capacity: null,
    nodes: nodes.map((n, i) => ({ pos: [i, 0], ...n }) as unknown as GridNode),
    lines: lines.map(([id, from, to]): Line => ({ id, from, to })),
    faults,
    ...over,
  };
}

/** feed -l_in-> bat -l_out-> lamp. */
const batMap = (batOver: Record<string, unknown> = {}, over: Partial<Puzzle> = {}): Puzzle =>
  mini(
    [
      { id: "feed", type: "feed" },
      { id: "bat", type: "battery", capacity: 5, charge: 0, input: "l_in", ...batOver },
      { id: "lamp", type: "lamp" },
      { id: "unreached", type: "lamp" }, // keeps the job from completing unless a test narrows `target`
    ],
    [["l_in", "feed", "bat"], ["l_out", "bat", "lamp"]],
    [],
    over,
  );

function record(bus: EventBus) {
  const log: Array<[string, unknown]> = [];
  for (const name of [
    "grid:changed", "battery:released", "battery:flat", "breaker:thrown", "switch:thrown", "grid:brownout", "job:completed",
  ] as const) {
    bus.on(name, (p) => log.push([name, p]));
  }
  return log;
}

describe("battery charging", () => {
  it("a battery charges at 1/s only while connected to live power on its feed side and not released; it stops at capacity", () => {
    const g = createGrid(batMap());
    expect(g.state().batteries.get("bat")).toEqual({ charge: 0, capacity: 5, released: false, charging: true });
    g.advance(2);
    expect(g.state().batteries.get("bat")!.charge).toBe(2);
    g.advance(10);
    expect(g.state().batteries.get("bat")).toEqual({ charge: 5, capacity: 5, released: false, charging: false });
  });

  it("a battery does not charge when its feed side is cut off (open breaker)", () => {
    const p = mini(
      [
        { id: "feed", type: "feed" },
        { id: "br", type: "breaker", closed: false },
        { id: "bat", type: "battery", capacity: 5, input: "l_in" },
      ],
      [["l_f", "feed", "br"], ["l_in", "br", "bat"]],
    );
    const g = createGrid(p);
    g.advance(3);
    expect(g.state().batteries.get("bat")).toEqual({ charge: 0, capacity: 5, released: false, charging: false });
    g.throwBreaker("br");
    expect(g.state().batteries.get("bat")!.charging).toBe(true);
    g.advance(3);
    expect(g.state().batteries.get("bat")!.charge).toBe(3);
  });

  it("the feed's current does not pass through a charging battery to its far side", () => {
    const g = createGrid(batMap());
    expect(g.state().powered.has("bat")).toBe(true);
    expect(g.state().powered.has("l_out")).toBe(false);
    expect(g.state().lit.has("lamp")).toBe(false);
  });

  it("a battery is not charged through its far side", () => {
    // feed -> junction -> battery's far line; its input line goes nowhere live.
    const p = mini(
      [
        { id: "feed", type: "feed" },
        { id: "j", type: "junction" },
        { id: "bat", type: "battery", capacity: 5, input: "l_in" },
        { id: "dead", type: "junction" },
      ],
      [["l_f", "feed", "j"], ["l_out", "j", "bat"], ["l_in", "dead", "bat"]],
    );
    const g = createGrid(p);
    g.advance(2);
    expect(g.state().batteries.get("bat")).toMatchObject({ charge: 0, charging: false });
  });

  it("charge starts at the file's value (clamped to capacity), reset returns to it, and undo leaves charge alone", () => {
    expect(createGrid(batMap({ charge: 9 })).state().batteries.get("bat")!.charge).toBe(5);
    const p = mini(
      [
        { id: "feed", type: "feed" },
        { id: "br", type: "breaker", closed: true },
        { id: "bat", type: "battery", capacity: 5, charge: 2, input: "l_in" },
        { id: "unreached", type: "lamp" },
      ],
      [["l_f", "feed", "br"], ["l_in", "br", "bat"]],
    );
    const g = createGrid(p);
    g.throwBreaker("br");
    g.advance(0); // no-op
    g.release("bat");
    g.advance(1); // charge 1 (draining), released
    g.undo(); // undoes the breaker; time and the battery are not undoable
    expect(g.state().batteries.get("bat")).toMatchObject({ charge: 1, released: true });
    g.reset();
    expect(g.state().batteries.get("bat")).toMatchObject({ charge: 2, released: false });
  });
});

describe("battery release", () => {
  it("release(nodeId) makes a battery a source for its far side while charge > 0; it drains at 1/s and at 0 stops and battery:flat fires", () => {
    const bus = new EventBus();
    const log = record(bus);
    const g = createGrid(batMap({ charge: 3 }), bus);
    expect(g.state().lit.has("lamp")).toBe(false);
    expect(g.release("bat")).toBe(true);
    expect(g.state().lit.has("lamp")).toBe(true);
    expect(g.state().batteries.get("bat")).toEqual({ charge: 3, capacity: 5, released: true, charging: false });
    g.advance(1);
    expect(g.state().batteries.get("bat")!.charge).toBe(2);
    expect(g.state().lit.has("lamp")).toBe(true);
    g.advance(2); // 2 seconds left: it runs flat exactly at the end of the step
    expect(g.state().batteries.get("bat")).toMatchObject({ charge: 0, released: false });
    expect(g.state().lit.has("lamp")).toBe(false);
    expect(log.filter(([n]) => n === "battery:flat")).toEqual([["battery:flat", { nodeId: "bat", stopped: false }]]);
    expect(log.filter(([n]) => n === "battery:released")).toEqual([["battery:released", { nodeId: "bat", charge: 3 }]]);
  });

  it("release on a battery with no charge, or on a non-battery, does nothing", () => {
    const g = createGrid(batMap());
    expect(g.release("bat")).toBe(false);
    expect(g.release("lamp")).toBe(false);
    expect(g.release("nope")).toBe(false);
  });

  it("release again stops the battery early and keeps what is left", () => {
    const bus = new EventBus();
    const log = record(bus);
    const g = createGrid(batMap({ charge: 4 }), bus);
    g.release("bat");
    g.advance(1);
    expect(g.release("bat")).toBe(true);
    expect(g.state().batteries.get("bat")).toMatchObject({ charge: 3, released: false });
    expect(g.state().lit.has("lamp")).toBe(false);
    expect(log.filter(([n]) => n === "battery:flat")).toEqual([["battery:flat", { nodeId: "bat", stopped: true }]]);
    const reasons = log.filter(([n]) => n === "grid:changed").map(([, p]) => (p as { reason: string }).reason);
    expect(reasons).toEqual(["battery", "time", "battery"]);
    g.advance(1); // stopped, it charges again from the feed
    expect(g.state().batteries.get("bat")!.charge).toBe(4);
  });

  it("a released battery does not charge while it is released", () => {
    const g = createGrid(batMap({ charge: 2 }));
    g.release("bat");
    g.advance(1);
    expect(g.state().batteries.get("bat")).toMatchObject({ charge: 1, charging: false });
  });
});

describe("relay switches", () => {
  /** feed -l1-> br(open) -l2-> sw (la / lb) -> lamps. */
  const relayMap = (relay = true): Puzzle =>
    mini(
      [
        { id: "feed", type: "feed" },
        { id: "br", type: "breaker", closed: false },
        { id: "sw", type: "switch", outputs: ["la", "lb"], selected: 0, ...(relay ? { relay: true } : {}) },
        { id: "A", type: "lamp" },
        { id: "B", type: "lamp" },
      ],
      [["l1", "feed", "br"], ["l2", "br", "sw"], ["la", "sw", "A"], ["lb", "sw", "B"]],
    );

  it("a relay switch's throwSwitch returns false and changes nothing while no current reaches it", () => {
    const bus = new EventBus();
    const log = record(bus);
    const g = createGrid(relayMap(), bus);
    expect(g.throwSwitch("sw")).toBe(false);
    expect(g.state().switches.get("sw")).toBe(0);
    expect(g.state().actions).toBe(0);
    expect(g.undo()).toBe(false);
    expect(log).toEqual([]);
  });

  it("a plain switch in a dead section can still be thrown (only relays are stuck)", () => {
    const g = createGrid(relayMap(false));
    expect(g.throwSwitch("sw")).toBe(true);
    expect(g.state().switches.get("sw")).toBe(1);
  });

  it("a relay switch throws normally while the feed powers it, and stays thrown after power is lost", () => {
    const g = createGrid(relayMap());
    g.throwBreaker("br");
    expect(g.throwSwitch("sw")).toBe(true);
    expect(g.state().switches.get("sw")).toBe(1);
    g.throwBreaker("br"); // power lost
    expect(g.state().powered.has("sw")).toBe(false);
    expect(g.state().switches.get("sw")).toBe(1);
    expect(g.throwSwitch("sw")).toBe(false);
  });

  it("a relay switch can be thrown while a released battery powers it, and stays thrown when the battery goes flat", () => {
    const p = mini(
      [
        { id: "feed", type: "feed" },
        { id: "bat", type: "battery", capacity: 4, charge: 2, input: "l_in" },
        { id: "sw", type: "switch", outputs: ["la", "lb"], selected: 0, relay: true },
        { id: "A", type: "lamp" },
        { id: "B", type: "lamp" },
      ],
      [["l_in", "feed", "bat"], ["l_out", "bat", "sw"], ["la", "sw", "A"], ["lb", "sw", "B"]],
    );
    const g = createGrid(p);
    expect(g.throwSwitch("sw")).toBe(false);
    g.release("bat");
    expect(g.throwSwitch("sw")).toBe(true);
    expect(g.state().lit.has("B")).toBe(true);
    g.advance(2);
    expect(g.state().lit.size).toBe(0);
    expect(g.state().switches.get("sw")).toBe(1);
    expect(g.throwSwitch("sw")).toBe(false); // the window was for setting the section; flat, the relay is stuck again
  });
});

describe("battery load accounting", () => {
  it("lamps powered only by a released battery do not count toward the feed's capacity", () => {
    const p = mini(
      [
        { id: "feed", type: "feed" },
        { id: "A", type: "lamp" },
        { id: "bat", type: "battery", capacity: 5, charge: 5, input: "l_in" },
        { id: "B", type: "lamp" },
      ],
      [["l_a", "feed", "A"], ["l_in", "feed", "bat"], ["l_out", "bat", "B"]],
      [],
      { capacity: 1 },
    );
    const g = createGrid(p);
    g.release("bat");
    const s = g.state();
    expect([...s.lit].sort()).toEqual(["A", "B"]);
    expect(s.load).toBe(1);
    expect(s.brownout).toBe(false);
  });

  it("a charging battery adds no load", () => {
    const g = createGrid(batMap({}, { capacity: 0 }));
    g.advance(1);
    expect(g.state().load).toBe(0);
    expect(g.state().brownout).toBe(false);
  });

  it("a lamp reachable from both the feed and a released battery counts once", () => {
    const p = mini(
      [
        { id: "feed", type: "feed" },
        { id: "jx", type: "junction" },
        { id: "lamp", type: "lamp" },
        { id: "bat", type: "battery", capacity: 5, charge: 5, input: "l_in" },
      ],
      [["l_f", "feed", "jx"], ["l_j", "jx", "lamp"], ["l_in", "feed", "bat"], ["l_out", "bat", "jx"]],
      [],
      { capacity: 1 },
    );
    const g = createGrid(p);
    g.release("bat");
    expect(g.state().load).toBe(1);
    expect(g.state().brownout).toBe(false);
    expect(g.state().lit.has("lamp")).toBe(true);
  });

  it("a battery-only section can win the job (targets lit, no brownout)", () => {
    const bus = new EventBus();
    const log = record(bus);
    const g = createGrid(batMap({ charge: 3 }, { target: ["lamp"] }), bus);
    g.release("bat");
    expect(log.some(([n]) => n === "job:completed")).toBe(true);
    expect(g.state().complete).toBe(true);
  });
});

describe("battery readability", () => {
  const faultyFar = (): Puzzle =>
    mini(
      [
        { id: "feed", type: "feed" },
        { id: "bat", type: "battery", capacity: 5, charge: 3, input: "l_in" },
        { id: "j", type: "junction" },
        { id: "lamp", type: "lamp" },
      ],
      [["l_in", "feed", "bat"], ["l_out", "bat", "j"], ["l_j", "j", "lamp"]],
      [{ id: "f_j", at: "j", kind: "dead-junction" }],
      { startingParts: ["wire", "wire"] },
    );

  it("faults on the battery's far side become readable while it is released (current reaches them)", () => {
    const g = createGrid(faultyFar());
    expect(g.state().readableFaults.has("f_j")).toBe(false);
    expect(g.repairAt("j")).toEqual({ ok: false, reason: "unreadable" });
    g.release("bat");
    expect(g.state().readableFaults.has("f_j")).toBe(true);
    g.advance(3);
    expect(g.state().readableFaults.has("f_j")).toBe(false); // flat: nothing reaches it any more
  });

  it("a fault read while the battery is released can be repaired inside that window", () => {
    const g = createGrid(faultyFar());
    g.release("bat");
    expect(g.repairAt("j").ok).toBe(true);
    expect(g.state().lit.has("lamp")).toBe(true);
  });
});

describe("advance is the only time input", () => {
  const shrine = (): Puzzle =>
    loadPuzzle(JSON.parse(readFileSync(join(__dirname, "..", "..", "puzzles", "shrine-circuit.json"), "utf8")) as unknown);

  it("a map with no battery is unchanged by advance, and emits nothing", () => {
    const bus = new EventBus();
    const log = record(bus);
    const g = createGrid(shrine(), bus);
    const before = g.state();
    g.advance(5);
    g.advance(0.016);
    expect(g.state()).toBe(before);
    expect(before.batteries.size).toBe(0);
    expect(g.release("anything")).toBe(false);
    expect(log).toEqual([]);
  });

  it("advance emits grid:changed with reason time when a battery changes, and nothing when nothing does", () => {
    const bus = new EventBus();
    const log = record(bus);
    const g = createGrid(batMap({ capacity: 2 }), bus);
    g.advance(1);
    expect(log).toEqual([["grid:changed", { reason: "time" }]]);
    g.advance(5); // fills at 2s: one event for the whole call
    g.advance(5); // already full: nothing changes
    g.advance(0);
    g.advance(-1);
    expect(log.map(([n]) => n)).toEqual(["grid:changed", "grid:changed"]);
  });

  it("advance is deterministic: the same total time in any chunking gives the same state", () => {
    const run = (chunks: number[]) => {
      const g = createGrid(batMap({ charge: 4, capacity: 6 }));
      g.release("bat");
      for (const c of chunks) g.advance(c);
      return g.state().batteries.get("bat");
    };
    expect(run([1.5])).toEqual(run([0.5, 0.5, 0.5]));
    expect(run([3, 3])).toEqual(run([6]));
    expect(run([6])).toEqual(run([6]));
  });
});
