import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { EventBus, loadPuzzle, type Puzzle } from "../core";
import { createGrid } from "../grid";
import { lampFlicker, nodeLook, wireLook } from "./look";

const puzzle: Puzzle = loadPuzzle(JSON.parse(readFileSync("puzzles/09-shrine-circuit.json", "utf8")));
const lamps = puzzle.nodes.filter((n) => n.type === "lamp").map((n) => n.id);

function fresh() {
  return createGrid(puzzle, new EventBus());
}

describe("looks from state", () => {
  it("start: the street side is live, current stops at the dead junction on l_a, l_b is dead, no flicker", () => {
    const s = fresh().state();
    expect(wireLook(s, "l_feed")).toBe("live");
    expect(wireLook(s, "l_st1")).toBe("live");
    expect(wireLook(s, "l_a")).toBe("live");
    expect(wireLook(s, "l_a2")).toBe("dead");
    expect(wireLook(s, "l_b")).toBe("dead");
    expect(nodeLook(s, "br_main")).toMatchObject({ live: true, closed: true, selected: null });
    expect(nodeLook(s, "sw_1")).toMatchObject({ selected: 0, closed: null });
    expect(nodeLook(s, "street_1")).toMatchObject({ lit: true });
    expect(nodeLook(s, "shrine")).toMatchObject({ lit: false, live: false });
    lamps.forEach((_, i) => expect(lampFlicker(s, i, 1.3)).toBe(0));
  });

  it("after sw_1: current reaches the damaged l_b, which looks faulted", () => {
    const g = fresh();
    expect(g.throwSwitch("sw_1")).toBe(true);
    const s = g.state();
    expect(nodeLook(s, "sw_1").selected).toBe(1);
    expect(wireLook(s, "l_b")).toBe("faulted");
    expect(wireLook(s, "l_a")).toBe("dead");
  });

  it("after repair:l_b: brownout, every lamp flickers, l_b is live again", () => {
    const g = fresh();
    g.throwSwitch("sw_1");
    expect(g.repairAt("l_b").ok).toBe(true);
    const s = g.state();
    expect(s.brownout).toBe(true);
    expect(wireLook(s, "l_b")).toBe("live");
    for (const t of [0, 0.37, 1.9, 5.2]) lamps.forEach((_, i) => expect(lampFlicker(s, i, t)).toBeGreaterThan(0));
  });

  it("after br_street: won, shrine and flood lit, street dark, breaker open", () => {
    const g = fresh();
    g.throwSwitch("sw_1");
    g.repairAt("l_b");
    expect(g.throwBreaker("br_street")).toBe(true);
    const s = g.state();
    expect(s.complete).toBe(true);
    expect(nodeLook(s, "shrine").lit).toBe(true);
    expect(nodeLook(s, "flood").lit).toBe(true);
    expect(nodeLook(s, "street_1").lit).toBe(false);
    expect(nodeLook(s, "br_street")).toMatchObject({ closed: false });
    expect(wireLook(s, "l_s1")).toBe("dead");
    lamps.forEach((_, i) => expect(lampFlicker(s, i, 2.2)).toBe(0));
  });
});
