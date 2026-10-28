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

const fixture = (f: string): Puzzle =>
  loadPuzzle(JSON.parse(readFileSync(join(__dirname, "..", "..", "puzzles", f), "utf8")) as unknown);

/** A switch sends the feed to fbA (lamps 1 and 2) or fbB (lamp 3). */
const twoFuses = (ratingA = 5, ratingB = 5): Puzzle =>
  mini(
    [
      { id: "feed", type: "feed" }, { id: "s", type: "switch", outputs: ["sa", "sb"], selected: 0 },
      { id: "fbA", type: "fusebox", rating: ratingA }, { id: "fbB", type: "fusebox", rating: ratingB },
      { id: "a1", type: "lamp", load: 1 }, { id: "a2", type: "lamp", load: 2 }, { id: "b3", type: "lamp", load: 3 },
    ],
    [["l0", "feed", "s"], ["sa", "s", "fbA"], ["sb", "s", "fbB"], ["la1", "fbA", "a1"], ["la2", "fbA", "a2"], ["lb3", "fbB", "b3"]],
  );

describe("fuseLoad (ticket 012 A)", () => {
  it("fuseLoad rule: each fusebox reports the feed-lit load downstream of it; an unpowered fuse reports 0", () => {
    const g = createGrid(twoFuses());
    const s = g.state();
    expect([...s.fuseLoad.keys()].sort()).toEqual(["fbA", "fbB"]);
    expect(s.fuseLoad.get("fbA")).toBe(3);
    expect(s.fuseLoad.get("fbB")).toBe(0);
    g.throwSwitch("s");
    expect(g.state().fuseLoad.get("fbA")).toBe(0);
    expect(g.state().fuseLoad.get("fbB")).toBe(3);
  });

  it("fuseLoad rule: a switch that moves a lamp between two fuses moves its load with it", () => {
    const p = mini(
      [
        { id: "feed", type: "feed" }, { id: "s", type: "switch", outputs: ["sa", "sb"], selected: 0 },
        { id: "fbA", type: "fusebox", rating: 3 }, { id: "fbB", type: "fusebox", rating: 3 },
        { id: "j", type: "junction" }, { id: "m", type: "lamp", load: 2 },
        { id: "a", type: "lamp", load: 1 },
      ],
      [["l0", "feed", "s"], ["sa", "s", "fbA"], ["sb", "s", "fbB"], ["ja", "fbA", "a"], ["jb", "fbB", "j"], ["jm", "j", "m"]],
    );
    const g = createGrid(p);
    expect(g.state().fuseLoad.get("fbA")).toBe(1);
    expect(g.state().fuseLoad.get("fbB")).toBe(0);
    expect(g.throwSwitch("s")).toBe(true);
    expect(g.state().fuseLoad.get("fbA")).toBe(0);
    expect(g.state().fuseLoad.get("fbB")).toBe(2);
  });

  it("fuseLoad rule: a fuse at its rating carries exactly the rating without blowing; a blown fuse carries 0", () => {
    const ok = createGrid(twoFuses(3, 5));
    expect(ok.state().faults).toEqual([]);
    expect(ok.state().fuseLoad.get("fbA")).toBe(3);
    const bad = createGrid(twoFuses(2, 5));
    expect(bad.state().faults.map((f) => f.kind)).toEqual(["blown-fuse"]);
    expect(bad.state().fuseLoad.get("fbA")).toBe(0);
  });

  it("fuseLoad rule: lamps lit only by a released battery add nothing to a fuse's load", () => {
    const g = createGrid(fixture("battery-run.json"));
    g.advance(8);
    g.release("bat");
    expect(g.state().lit.has("mill")).toBe(true);
    expect(g.state().fuseLoad.get("fb_east")).toBe(0);
  });

  it("battery-run: fb_east carries 0 at the start and 1 after the winning sequence", () => {
    const g = createGrid(fixture("battery-run.json"));
    expect(g.state().fuseLoad.get("fb_east")).toBe(0);
    g.advance(8);
    g.release("bat");
    g.throwSwitch("rl_2");
    g.throwSwitch("rl_1");
    g.throwBreaker("br_east");
    expect(g.state().complete).toBe(true);
    expect(g.state().fuseLoad.get("fb_east")).toBe(1);
  });

  it("battery-run: the fuse:blown load equals the fuseLoad the same position shows with that fuse unblowable (3); the blown fuse then carries 0", () => {
    const p = fixture("battery-run.json");
    const roomy = createGrid({ ...p, nodes: p.nodes.map((n) => (n.id === "fb_east" ? ({ ...n, rating: 9 } as GridNode) : n)) });
    roomy.throwBreaker("br_east");
    const before = roomy.state().fuseLoad.get("fb_east");
    expect(before).toBe(3);

    const blown: number[] = [];
    const bus = new EventBus();
    bus.on("fuse:blown", (e) => blown.push(e.load));
    const g = createGrid(p, bus);
    g.throwBreaker("br_east");
    expect(blown).toEqual([before]);
    expect(g.state().fuseLoad.get("fb_east")).toBe(0);
  });

  it("shrine-circuit: fb_A carries 3 at the start", () => {
    expect(createGrid(fixture("shrine-circuit.json")).state().fuseLoad.get("fb_A")).toBe(3);
  });
});
