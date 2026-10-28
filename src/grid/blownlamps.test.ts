import { describe, expect, it } from "vitest";
import { EventBus, loadPuzzle, type GridNode, type Line, type Puzzle } from "../core";
import { createGrid } from "./index";

type Blow = { load: number; culprit: string | null; path: readonly string[]; lamps?: readonly { id: string; path: readonly string[] }[] };

// Inline copy of puzzles/ladder-08-why-it-blew.json (that file may be untracked; tests must not read it).
const ladder08 = (): Puzzle =>
  loadPuzzle({
    id: "ladder-08-why-it-blew", name: "08 · Why it blew", version: 4, scope: "map", capacity: 4,
    startingParts: ["fuse", "fuse"], target: ["shrine", "gate"], priority: ["home"],
    nodes: [
      { id: "feed", type: "feed", pos: [0, 0] },
      { id: "j0", type: "junction", pos: [2.5, 0] },
      { id: "br_gate", type: "breaker", pos: [5, -4], closed: true },
      { id: "gate", type: "lamp", pos: [8, -4], load: 1 },
      { id: "fb_1", type: "fusebox", pos: [5, 1], rating: 2 },
      { id: "j1", type: "junction", pos: [7.5, 1] },
      { id: "br_mill", type: "breaker", pos: [10, -2.5], closed: true },
      { id: "mill", type: "lamp", pos: [14, -2.5], load: 2 },
      { id: "br_home", type: "breaker", pos: [10, 0], closed: true },
      { id: "home", type: "lamp", pos: [14, 0], load: 1 },
      { id: "br_market", type: "breaker", pos: [10, 2.5], closed: true },
      { id: "market", type: "lamp", pos: [14, 2.5], load: 1 },
      { id: "sw_1", type: "switch", pos: [10, 5], outputs: ["l_lantern", "l_shrine"], selected: 0 },
      { id: "lantern", type: "lamp", pos: [14, 4.5], load: 1 },
      { id: "shrine", type: "lamp", pos: [14, 6.5], load: 2 },
    ],
    lines: [
      { id: "l_feed", from: "feed", to: "j0" },
      { id: "l_g0", from: "j0", to: "br_gate" },
      { id: "l_gate", from: "br_gate", to: "gate" },
      { id: "l_fa", from: "j0", to: "fb_1" },
      { id: "l_fb", from: "fb_1", to: "j1" },
      { id: "l_m0", from: "j1", to: "br_mill" },
      { id: "l_mill", from: "br_mill", to: "mill" },
      { id: "l_h0", from: "j1", to: "br_home" },
      { id: "l_home", from: "br_home", to: "home" },
      { id: "l_k0", from: "j1", to: "br_market" },
      { id: "l_market", from: "br_market", to: "market" },
      { id: "l_sw", from: "j1", to: "sw_1" },
      { id: "l_lantern", from: "sw_1", to: "lantern" },
      { id: "l_shrine", from: "sw_1", to: "shrine" },
    ],
    faults: [{ id: "f1", at: "fb_1", kind: "blown-fuse" }],
  } as unknown);

function blows(bus: EventBus): Blow[] {
  const log: Blow[] = [];
  bus.on("fuse:blown", (e) => log.push({ ...e }));
  return log;
}

function mini(
  nodes: Array<{ id: string; type: GridNode["type"] } & Record<string, unknown>>,
  lines: Array<[id: string, from: string, to: string]>,
  faults: Puzzle["faults"] = [],
): Puzzle {
  return {
    id: "mini", name: "mini", version: 4, scope: "map", capacity: null,
    nodes: nodes.map((n, i) => ({ pos: [i, 0], ...n }) as unknown as GridNode),
    lines: lines.map(([id, from, to]): Line => ({ id, from, to })),
    faults,
  };
}

describe("fuse:blown lists every lamp that counted toward the load (ticket 016 A)", () => {
  it("blown lamps: ladder-08 repaired at the start lists mill, home, market, lantern summing to the load 5, paths from l_fb", () => {
    const p = ladder08();
    const bus = new EventBus();
    const log = blows(bus);
    const g = createGrid(p, bus);
    g.repairAt("fb_1");
    expect(log).toHaveLength(1);
    const e = log[0]!;
    expect(e.lamps!.map((l) => l.id)).toEqual(["mill", "home", "market", "lantern"]);
    expect(e.lamps!.map((l) => l.path)).toEqual([
      ["l_fb", "l_m0", "l_mill"], ["l_fb", "l_h0", "l_home"], ["l_fb", "l_k0", "l_market"], ["l_fb", "l_sw", "l_lantern"],
    ]);
    const load = (id: string): number => (p.nodes.find((n) => n.id === id) as { load: number }).load;
    expect(e.lamps!.reduce((a, l) => a + load(l.id), 0)).toBe(e.load);
    expect(e.load).toBe(5);
  });

  it("blown lamps: the culprit's entry has the same path as the event's path", () => {
    const bus = new EventBus();
    const log = blows(bus);
    createGrid(ladder08(), bus).repairAt("fb_1");
    const e = log[0]!;
    expect(e.culprit).toBe("mill");
    expect(e.lamps!.find((l) => l.id === e.culprit)!.path).toEqual(e.path);
  });

  it("blown lamps: the ladder-08 second trap (mill and market off, switch to shrine) lists home and shrine summing to 3", () => {
    const bus = new EventBus();
    const log = blows(bus);
    const g = createGrid(ladder08(), bus);
    g.throwBreaker("br_mill");
    g.throwBreaker("br_market");
    g.throwSwitch("sw_1");
    g.repairAt("fb_1");
    expect(log).toHaveLength(1);
    expect(log[0]!.load).toBe(3);
    expect(log[0]!.lamps!.map((l) => l.id)).toEqual(["home", "shrine"]);
  });

  it("blown lamps: a dead lamp (bulb fault) and a lamp behind an open breaker are not listed", () => {
    const p = mini(
      [
        { id: "feed", type: "feed" }, { id: "fb", type: "fusebox", rating: 2 },
        { id: "a", type: "lamp", load: 2 }, { id: "dead", type: "lamp", load: 2 },
        { id: "br", type: "breaker", closed: false }, { id: "off", type: "lamp", load: 2 },
        { id: "br2", type: "breaker", closed: false }, { id: "c", type: "lamp", load: 1 },
      ],
      [["l0", "feed", "fb"], ["la", "fb", "a"], ["ld", "fb", "dead"], ["l1", "fb", "br"], ["lo", "br", "off"], ["l2", "fb", "br2"], ["lc", "br2", "c"]],
      [{ id: "bulb", at: "dead", kind: "dead-lamp" }],
    );
    const bus = new EventBus();
    const log = blows(bus);
    const g = createGrid(p, bus);
    expect(log).toEqual([]); // 2 on a 2
    g.throwBreaker("br2"); // a 2 + c 1 = 3
    expect(log).toHaveLength(1);
    expect(log[0]!.lamps!.map((l) => l.id)).toEqual(["a", "c"]);
    expect(log[0]!.load).toBe(3);
  });

  it("blown lamps: a repair-triggered blow on a two-lamp box lists both lamps and names the first as culprit with its path", () => {
    const p2 = mini(
      [{ id: "feed", type: "feed" }, { id: "fb", type: "fusebox", rating: 1 }, { id: "a", type: "lamp" }, { id: "b", type: "lamp" }],
      [["l0", "feed", "fb"], ["la", "fb", "a"], ["lb", "fb", "b"]],
      [{ id: "f", at: "fb", kind: "blown-fuse" }] as Puzzle["faults"],
    );
    const bus2 = new EventBus();
    const log2 = blows(bus2);
    const g = createGrid({ ...p2, startingParts: ["fuse"] } as Puzzle, bus2);
    g.repairAt("fb");
    expect(log2).toHaveLength(1);
    const e = log2[0]!;
    expect(e.lamps!.map((l) => l.id)).toEqual(["a", "b"]);
    expect(e.culprit).toBe("a");
    expect(e.lamps!.find((l) => l.id === e.culprit)!.path).toEqual(e.path);
  });
});
