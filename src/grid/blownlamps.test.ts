import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EventBus, loadPuzzle, type GridNode, type Line, type Puzzle } from "../core";
import { createGrid } from "./index";

type Blow = { load: number; culprit: string | null; path: readonly string[]; lamps?: readonly { id: string; path: readonly string[] }[] };

const ladder08 = (): Puzzle =>
  loadPuzzle(JSON.parse(readFileSync(join(__dirname, "..", "..", "puzzles", "ladder-08-why-it-blew.json"), "utf8")) as unknown);

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

  it("blown lamps: with no earlier settle (culprit null, path empty) the lamps are still listed", () => {
    const p = mini(
      [{ id: "feed", type: "feed" }, { id: "fb", type: "fusebox", rating: 1, }, { id: "a", type: "lamp" }, { id: "b", type: "lamp" }],
      [["l0", "feed", "fb"], ["la", "fb", "a"], ["lb", "fb", "b"]],
    );
    const bus = new EventBus();
    const log = blows(bus);
    createGrid(p, bus);
    // Construction blows silently; force an emitted blow by repairing at the start of an inline map.
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
    expect(log2[0]!.lamps!.map((l) => l.id)).toEqual(["a", "b"]);
    expect(log).toEqual([]);
  });
});
