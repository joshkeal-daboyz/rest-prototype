import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EventBus, loadPuzzle, type GridNode, type Line, type Puzzle } from "../core";
import { createGrid } from "./index";

function mini(
  nodes: Array<{ id: string; type: GridNode["type"] } & Record<string, unknown>>,
  lines: Array<[id: string, from: string, to: string]>,
): Puzzle {
  return {
    id: "mini",
    name: "mini",
    version: 4,
    scope: "map",
    capacity: null,
    nodes: nodes.map((n, i) => ({ pos: [i, 0], ...n }) as unknown as GridNode),
    lines: lines.map(([id, from, to]): Line => ({ id, from, to })),
    faults: [],
  };
}

const runMap = (): Puzzle =>
  loadPuzzle(JSON.parse(readFileSync(join(__dirname, "..", "..", "puzzles", "20-battery-run.json"), "utf8")) as unknown);

function blows(bus: EventBus): Array<Record<string, unknown>> {
  const log: Array<Record<string, unknown>> = [];
  bus.on("fuse:blown", (e) => log.push({ ...e }));
  return log;
}

describe("fuse:blown names the culprit (ticket 011 D)", () => {
  it("culprit rule: the lamp newly powered through the fuse by the action is named, with the line path fuse -> lamp", () => {
    const p = mini(
      [
        { id: "feed", type: "feed" }, { id: "fb", type: "fusebox", rating: 2 }, { id: "j", type: "junction" },
        { id: "a", type: "lamp", load: 1 }, { id: "br", type: "breaker", closed: false }, { id: "b", type: "lamp", load: 2 },
      ],
      [["l0", "feed", "fb"], ["l1", "fb", "j"], ["la", "j", "a"], ["l2", "j", "br"], ["lb", "br", "b"]],
    );
    const bus = new EventBus();
    const log = blows(bus);
    const g = createGrid(p, bus);
    expect(g.state().lit.has("a")).toBe(true); // already lit: not the culprit
    g.throwBreaker("br");
    expect(log).toEqual([{ nodeId: "fb", faultId: "blown-fb", load: 3, rating: 2, culprit: "b", path: ["l1", "l2", "lb"], lamps: [{ id: "a", path: ["l1", "la"] }, { id: "b", path: ["l1", "l2", "lb"] }] }]);
  });

  it("culprit rule: with several new lamps the largest load is named", () => {
    const p = mini(
      [
        { id: "feed", type: "feed" }, { id: "br", type: "breaker", closed: false }, { id: "fb", type: "fusebox", rating: 1 },
        { id: "s", type: "lamp", load: 1 }, { id: "big", type: "lamp", load: 3 }, { id: "m", type: "lamp", load: 2 },
      ],
      [["l0", "feed", "br"], ["l1", "br", "fb"], ["ls", "fb", "s"], ["lbig", "fb", "big"], ["lm", "fb", "m"]],
    );
    const bus = new EventBus();
    const log = blows(bus);
    createGrid(p, bus).throwBreaker("br");
    expect(log[0]).toMatchObject({ culprit: "big", path: ["lbig"] });
  });

  it("culprit rule: a fuse that blows at construction blows silently, with no culprit to name", () => {
    const p = mini(
      [{ id: "feed", type: "feed" }, { id: "fb", type: "fusebox", rating: 1 }, { id: "a", type: "lamp" }, { id: "b", type: "lamp" }],
      [["l0", "feed", "fb"], ["la", "fb", "a"], ["lb", "fb", "b"]],
    );
    const bus = new EventBus();
    const log = blows(bus);
    expect(createGrid(p, bus).state().faults.map((f) => f.kind)).toEqual(["blown-fuse"]);
    expect(log).toEqual([]);
  });

  it("20-battery-run: throwing the east breaker at the start blows fb_east with culprit mill and a path ending at the line into mill", () => {
    const bus = new EventBus();
    const log = blows(bus);
    createGrid(runMap(), bus).throwBreaker("br_east");
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ nodeId: "fb_east", culprit: "mill", load: 3, rating: 1 });
    expect(log[0]!.path).toEqual(["l_e2", "l_mill"]);
  });

  it("20-battery-run: the relay section set during the battery window is then won by the feed (charge 8, release, rl_2, rl_1, breaker -> complete)", () => {
    const bus = new EventBus();
    const log = blows(bus);
    const g = createGrid(runMap(), bus);
    g.advance(8);
    expect(g.state().batteries.get("bat")!.charge).toBe(8);
    expect(g.release("bat")).toBe(true);
    expect(g.throwSwitch("rl_2")).toBe(true);
    expect(g.throwSwitch("rl_1")).toBe(true);
    expect(g.state().lit.has("shrine")).toBe(true); // held by the battery alone
    expect(g.state().complete).toBe(false);
    expect(g.throwBreaker("br_east")).toBe(true);
    expect(log).toEqual([]); // fb_east carries only the shrine's 1
    expect(g.state().faults).toEqual([]);
    expect(g.state().complete).toBe(true);
  });

  it("culprit rule: a lamp rerouted from one fuse onto another is new under the second fuse", () => {
    const p = mini(
      [
        { id: "feed", type: "feed" }, { id: "s", type: "switch", outputs: ["la", "lb"], selected: 0 },
        { id: "fbA", type: "fusebox", rating: 5 }, { id: "fbB", type: "fusebox", rating: 1 },
        { id: "j", type: "junction" }, { id: "m", type: "lamp", load: 3 },
      ],
      [["l0", "feed", "s"], ["la", "s", "fbA"], ["lb", "s", "fbB"], ["ja", "fbA", "j"], ["jb", "fbB", "j"], ["lm", "j", "m"]],
    );
    const bus = new EventBus();
    const log = blows(bus);
    const g = createGrid(p, bus);
    expect(g.state().lit.has("m")).toBe(true);
    g.throwSwitch("s");
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ nodeId: "fbB", culprit: "m", path: ["jb", "lm"] });
  });

  it("culprit rule: repairing a blown fuse under the same overload blows it again and names the culprit", () => {
    const bus = new EventBus();
    const log = blows(bus);
    const g = createGrid(runMap(), bus);
    g.throwBreaker("br_east");
    expect(g.repairAt("fb_east").ok).toBe(true);
    expect(log).toHaveLength(2);
    expect(log[1]).toMatchObject({ nodeId: "fb_east", culprit: "mill", path: ["l_e2", "l_mill"] });
  });
});
