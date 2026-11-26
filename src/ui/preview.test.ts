import { describe, expect, it } from "vitest";
import type { Fault, GridNode, Line, Puzzle } from "../core";
import { createGrid } from "../grid";
import { previewFor, previewKey } from "./preview";

type N = { id: string; type: GridNode["type"] } & Record<string, unknown>;

function mini(nodes: N[], lines: Array<[string, string, string]>, faults: Fault[] = []): Puzzle {
  return {
    id: "mini",
    name: "mini",
    version: 4,
    scope: "map",
    capacity: null,
    nodes: nodes.map((n, i) => ({ pos: [i, 0], ...n }) as unknown as GridNode),
    lines: lines.map(([id, from, to]): Line => ({ id, from, to })),
    faults,
  };
}

describe("previewFor (ticket 081 V4)", () => {
  it("a fault read at one state stays known after current is routed away; an empty known (Reset) forgets it; relighting gives no numbers", () => {
    const p = mini(
      [{ id: "feed", type: "feed" }, { id: "j", type: "junction" }, { id: "br", type: "breaker", closed: true }, { id: "e", type: "lamp", load: 2 }],
      [["l0", "feed", "j"], ["lb", "j", "br"], ["cab1", "br", "e"]],
      [{ id: "k1", at: "cab1", kind: "damaged-cable" }],
    );
    const g = createGrid(p);
    const first = previewFor(p, g.state(), new Set(), false);
    expect(first.known.has("k1")).toBe(true);
    expect(first.preview?.has("k1")).toBe(true);

    g.throwBreaker("br");
    expect(g.state().readableFaults.has("k1")).toBe(false);
    expect(previewFor(p, g.state(), first.known, false).known.has("k1")).toBe(true);
    expect(previewFor(p, g.state(), new Set(), false).known.has("k1")).toBe(false);
    expect(previewFor(p, g.state(), first.known, true).preview).toBeNull();
  });
});

describe("previewKey (ticket 081 TB1b3)", () => {
  it("the key changes with a flip, a throw, a repair and a Reset's timer order, and not with 0.3 s that flips nothing", () => {
    const p: Puzzle = {
      id: "timed",
      name: "timed",
      version: 4,
      scope: "map",
      capacity: null,
      startingParts: ["wire", "wire"],
      nodes: [
        { id: "feed", type: "feed", pos: [0, 0] },
        { id: "br", type: "breaker", pos: [1, 0], closed: false },
        { id: "j", type: "junction", pos: [2, 0] },
        { id: "l1", type: "lamp", pos: [3, 0], load: 1 },
        { id: "tb", type: "breaker", pos: [1, 1], closed: true, timer: { closed: 2, open: 2, offset: 0 } },
        { id: "tb2", type: "breaker", pos: [1, 2], closed: true, timer: { closed: 3, open: 3, offset: 0 } },
      ] as GridNode[],
      lines: [
        { id: "l_br", from: "feed", to: "br" },
        { id: "l_j", from: "br", to: "j" },
        { id: "l_l1", from: "j", to: "l1" },
        { id: "l_tb", from: "feed", to: "tb" },
        { id: "l_tb2", from: "feed", to: "tb2" },
      ],
      faults: [{ id: "f_j", at: "j", kind: "dead-junction" }],
    };
    const g = createGrid(p);
    const key = () => previewKey(g.state(), false);
    const k0 = key();
    g.throwBreaker("br"); // the first move starts the clock and closes br
    const k1 = key();
    expect(k1).not.toBe(k0);
    g.advance(0.3); // no flip yet: tb is due at 2 s
    expect(key()).toBe(k1);
    g.advance(1.8); // clock 2.1: tb has flipped open at 2 s
    expect(g.state().timers.get("tb")?.closed).toBe(false);
    const k3 = key();
    expect(k3).not.toBe(k1);
    expect(g.repairAt("j").ok).toBe(true);
    expect(key()).not.toBe(k3);

    // A Reset whose breakers match but whose timers flip in another order is a different key; coincident flips are one moment, so the insertion order does not matter.
    const s = g.state();
    const withTimers = (order: Array<[string, number]>) => ({ ...s, timers: new Map(order.map(([id, next]) => [id, { closed: s.timers.get(id)!.closed, next }])) });
    expect(previewKey(withTimers([["tb", 0.5], ["tb2", 4]]), false)).not.toBe(previewKey(s, false));
    expect(previewKey(withTimers([["tb", 1], ["tb2", 1]]), false)).toBe(previewKey(withTimers([["tb2", 1], ["tb", 1]]), false));
  });
});

describe("previewKey (ticket 081 BC2)", () => {
  it("a battery's release, stop, running flat and first charge from 0 change the key; charging above 0 does not", () => {
    const battery = (charge: number): Puzzle => ({
      id: "bat",
      name: "bat",
      version: 4,
      scope: "map",
      capacity: null,
      nodes: [
        { id: "feed", type: "feed", pos: [0, 0] },
        { id: "b", type: "battery", pos: [1, 0], capacity: 4, charge, input: "l_in" },
        { id: "e", type: "lamp", pos: [2, 0], load: 1 },
      ] as GridNode[],
      lines: [
        { id: "l_in", from: "feed", to: "b" },
        { id: "l_out", from: "b", to: "e" },
      ],
      faults: [],
    });
    const g = createGrid(battery(2));
    const key = () => previewKey(g.state(), false);
    const charging = key();
    g.advance(0.3);
    expect(g.state().batteries.get("b")!.charge).toBeGreaterThan(2);
    expect(key()).toBe(charging);
    g.release("b");
    const running = key();
    expect(running).not.toBe(charging);
    g.release("b"); // a stop: back to charging
    expect(key()).toBe(charging);
    g.release("b");
    expect(key()).toBe(running);
    g.advance(3); // drains the charge: running flat
    expect(key()).not.toBe(running);

    const empty = createGrid(battery(0));
    const k0 = previewKey(empty.state(), false);
    empty.advance(0.5);
    expect(empty.state().batteries.get("b")!.charge).toBeGreaterThan(0);
    expect(previewKey(empty.state(), false)).not.toBe(k0);
  });
});
