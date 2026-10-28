import { describe, expect, it } from "vitest";
import { EventBus, loadPuzzle, type Puzzle } from "../core";
import { createGrid } from "../grid";
import { promptFor } from "./prompt";

/** North (Lv4, named) and south (Lv2, unnamed) feeds, each with a lamp; a dead lamp keeps the job open. */
const twoFeeds = (): Puzzle =>
  loadPuzzle({
    version: 5,
    scope: "map",
    id: "two",
    name: "two",
    capacity: null,
    startingParts: [],
    nodes: [
      { id: "n_feed", type: "feed", pos: [0, 0], capacity: 4, name: "North" },
      { id: "n_lamp", type: "lamp", pos: [2, 0], load: 2 },
      { id: "south_feed", type: "feed", pos: [0, 6], capacity: 2 },
      { id: "s_lamp", type: "lamp", pos: [2, 6], load: 1 },
      { id: "br", type: "breaker", pos: [4, 6], closed: false },
      { id: "cold", type: "lamp", pos: [6, 6] },
    ],
    lines: [
      { id: "l1", from: "n_feed", to: "n_lamp" },
      { id: "l2", from: "south_feed", to: "br" },
      { id: "l3", from: "br", to: "cold" },
      { id: "l4", from: "south_feed", to: "s_lamp" },
    ],
    faults: [],
  } as unknown);

describe("multi-feed hover", () => {
  const p = twoFeeds();
  const st = createGrid(p, new EventBus()).state();

  it("a feed reads its name, level and live load", () => {
    expect(promptFor(p, st, "n_feed")).toBe("North · Lv4 Powersource — using 2 of 4");
    expect(promptFor(p, st, "south_feed")).toBe("south feed · Lv2 Powersource — using 1 of 2");
  });

  it("a powered lamp names the feed that carries it", () => {
    expect(promptFor(p, st, "n_lamp")).toBe("Lv2 Lamp · on North");
    expect(promptFor(p, st, "s_lamp")).toBe("Lv1 Lamp · on south feed");
  });

  it("an unpowered lamp is just its level", () => {
    expect(promptFor(p, st, "cold")).toBe("Lv1 Lamp");
  });

  it("a feed with no limit says so", () => {
    const q = loadPuzzle({
      ...JSON.parse(JSON.stringify(p)),
      nodes: p.nodes.map((n) => (n.id === "south_feed" ? { ...n, capacity: null } : n)),
    } as unknown);
    const s = createGrid(q, new EventBus()).state();
    expect(promptFor(q, s, "south_feed")).toBe("south feed · Powersource — using 1 (no limit)");
  });
});
