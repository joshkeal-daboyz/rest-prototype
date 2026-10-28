import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EventBus, loadPuzzle, type GridNode, type Line, type Puzzle } from "../core";
import { createGrid } from "./index";

function mini(
  nodes: Array<{ id: string; type: GridNode["type"] } & Record<string, unknown>>,
  lines: Array<[id: string, from: string, to: string]>,
  extra: Partial<Puzzle> = {},
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
    ...extra,
  };
}

/** feed -> brk -> fb(rating 1) -> sw(spring) -> lampA (1) | lampB (2). */
const springMap = (): Puzzle =>
  mini(
    [
      { id: "feed", type: "feed" }, { id: "brk", type: "breaker", closed: true },
      { id: "fb", type: "fusebox", rating: 1 },
      { id: "sw", type: "switch", outputs: ["sa", "sb"], selected: 0, spring: true },
      { id: "a", type: "lamp", load: 1 }, { id: "b", type: "lamp", load: 2 },
    ],
    [["l0", "feed", "brk"], ["l1", "brk", "fb"], ["l2", "fb", "sw"], ["sa", "sw", "a"], ["sb", "sw", "b"]],
    { startingParts: ["fuse", "fuse"] },
  );

describe("spring switches (ticket 013 A)", () => {
  it("spring rule: a powered spring switch stays where the player put it", () => {
    const g = createGrid(springMap());
    // Powered, thrown to a lamp that fits: use a rating that holds.
    const p = springMap();
    (p.nodes.find((n) => n.id === "fb") as unknown as { rating: number }).rating = 5;
    const g2 = createGrid(p);
    expect(g2.throwSwitch("sw")).toBe(true);
    expect(g2.state().switches.get("sw")).toBe(1);
    expect(g2.state().lit.has("b")).toBe(true);
    expect(g.state().switches.get("sw")).toBe(0);
  });

  it("spring rule: losing power (open breaker) returns the spring switch to its file position and emits spring: true", () => {
    const p = springMap();
    (p.nodes.find((n) => n.id === "fb") as unknown as { rating: number }).rating = 5;
    const bus = new EventBus();
    const sw: Array<{ nodeId: string; selected: 0 | 1; spring?: true }> = [];
    bus.on("switch:thrown", (e) => sw.push(e));
    const g = createGrid(p, bus);
    g.throwSwitch("sw");
    g.throwBreaker("brk");
    expect(g.state().switches.get("sw")).toBe(0);
    expect(sw).toEqual([{ nodeId: "sw", selected: 1 }, { nodeId: "sw", selected: 0, spring: true }]);
  });

  it("spring rule: a blown fuse upstream springs the switch back and the repair then holds (wouldBlow 0)", () => {
    const g = createGrid(springMap());
    g.throwSwitch("sw"); // lamp b carries 2 on a 1 fuse
    const s = g.state();
    expect(s.faults.some((f) => f.kind === "blown-fuse" && f.at === "fb")).toBe(true);
    expect(s.switches.get("sw")).toBe(0);
    expect(s.readableFaults.has("blown-fb")).toBe(true);
    expect(s.wouldBlow.get("fb")).toBe(0);
    expect(g.repairAt("fb").ok).toBe(true);
    expect(g.state().faults).toHaveLength(0);
    expect(g.state().lit.has("a")).toBe(true);
  });

  it("spring rule: a spring return is not an action or an undo step", () => {
    const g = createGrid(springMap());
    g.throwSwitch("sw");
    expect(g.state().actions).toBe(1);
    expect(g.undo()).toBe(true);
    expect(g.state().switches.get("sw")).toBe(0);
    expect(g.state().faults).toHaveLength(0);
    expect(g.state().actions).toBe(0);
    expect(g.undo()).toBe(false);
  });

  it("spring rule: throwing a spring switch no current reaches returns false and changes nothing", () => {
    const p = springMap();
    (p.nodes.find((n) => n.id === "brk") as unknown as { closed: boolean }).closed = false;
    const bus = new EventBus();
    const seen: string[] = [];
    bus.on("switch:thrown", () => seen.push("t"));
    bus.on("grid:changed", () => seen.push("c"));
    const g = createGrid(p, bus);
    expect(g.throwSwitch("sw")).toBe(false);
    expect(g.state().actions).toBe(0);
    expect(g.state().switches.get("sw")).toBe(0);
    expect(seen).toEqual([]);
    expect(g.undo()).toBe(false);
  });

  it("spring rule: a spring return that unpowers another spring switch makes settle repeat until none moves", () => {
    // feed -> brk -> s1(spring) -> [out0: lamp x | out1: s2(spring) -> lamp y | lamp z]
    const p = mini(
      [
        { id: "feed", type: "feed" }, { id: "brk", type: "breaker", closed: true },
        { id: "s1", type: "switch", outputs: ["x", "m"], selected: 0, spring: true },
        { id: "s2", type: "switch", outputs: ["y", "z"], selected: 0, spring: true },
        { id: "lx", type: "lamp" }, { id: "ly", type: "lamp" }, { id: "lz", type: "lamp" },
      ],
      [["l0", "feed", "brk"], ["l1", "brk", "s1"], ["x", "s1", "lx"], ["m", "s1", "s2"], ["y", "s2", "ly"], ["z", "s2", "lz"]],
    );
    const g = createGrid(p);
    expect(g.throwSwitch("s1")).toBe(true); // s1 now feeds s2
    expect(g.throwSwitch("s2")).toBe(true); // s2 -> lz
    expect(g.state().lit.has("lz")).toBe(true);
    // Un-power s1 only: open the breaker. Both lose power in one settle.
    g.throwBreaker("brk");
    expect(g.state().switches.get("s1")).toBe(0);
    expect(g.state().switches.get("s2")).toBe(0);
  });

  it("spring rule: a battery going flat counts as power lost for a spring switch it fed", () => {
    // feed -> br(open) -> bat -> sw(spring) -> lamp
    const p = mini(
      [
        { id: "feed", type: "feed" }, { id: "br", type: "breaker", closed: true },
        { id: "bat", type: "battery", capacity: 5, charge: 5, input: "l1" },
        { id: "sw", type: "switch", outputs: ["sa", "sb"], selected: 0, spring: true },
        { id: "a", type: "lamp" }, { id: "b", type: "lamp" },
      ],
      [["l0", "feed", "br"], ["l1", "br", "bat"], ["l2", "bat", "sw"], ["sa", "sw", "a"], ["sb", "sw", "b"]],
    );
    const g = createGrid(p);
    g.throwBreaker("br"); // cut the feed
    expect(g.release("bat")).toBe(true);
    expect(g.state().powered.has("sw")).toBe(true);
    expect(g.throwSwitch("sw")).toBe(true);
    expect(g.state().switches.get("sw")).toBe(1);
    g.advance(10); // battery runs flat
    expect(g.state().powered.has("sw")).toBe(false);
    expect(g.state().switches.get("sw")).toBe(0);
  });

  it("spring rule: a relay can also be a spring switch (both flags)", () => {
    const p = mini(
      [
        { id: "feed", type: "feed" }, { id: "br", type: "breaker", closed: true },
        { id: "sw", type: "switch", outputs: ["sa", "sb"], selected: 0, spring: true, relay: true },
        { id: "a", type: "lamp" }, { id: "b", type: "lamp" },
      ],
      [["l0", "feed", "br"], ["l1", "br", "sw"], ["sa", "sw", "a"], ["sb", "sw", "b"]],
    );
    const g = createGrid(p);
    g.throwSwitch("sw");
    expect(g.state().switches.get("sw")).toBe(1);
    g.throwBreaker("br");
    expect(g.state().switches.get("sw")).toBe(0);
    expect(g.throwSwitch("sw")).toBe(false);
  });

  it("spring rule: a switch without spring stays put when power is lost", () => {
    const p = springMap();
    (p.nodes.find((n) => n.id === "sw") as unknown as { spring: boolean }).spring = false;
    (p.nodes.find((n) => n.id === "fb") as unknown as { rating: number }).rating = 5;
    const g = createGrid(p);
    g.throwSwitch("sw");
    g.throwBreaker("brk");
    expect(g.state().switches.get("sw")).toBe(1);
  });
});

describe("wouldBlow (ticket 013 A)", () => {
  it("wouldBlow rule: keys are only readable blown fuses; a healthy fuse has no entry", () => {
    const g = createGrid(springMap());
    expect([...g.state().wouldBlow.keys()]).toEqual([]);
  });

  it("wouldBlow rule: a blown fuse that would blow again reports the load it would carry", () => {
    // Non-spring switch left pointing at the 2-load lamp: repair would re-blow with 2 on 1.
    const p = springMap();
    (p.nodes.find((n) => n.id === "sw") as unknown as { spring: boolean }).spring = false;
    const g = createGrid(p);
    g.throwSwitch("sw");
    expect(g.state().wouldBlow.get("fb")).toBe(2);
    g.throwSwitch("sw");
    expect(g.state().wouldBlow.get("fb")).toBe(0);
  });

  it("wouldBlow rule: an unreadable blown fuse is not in the map", () => {
    const p = springMap();
    (p as { faults: unknown }).faults = [{ id: "bf", at: "fb", kind: "blown-fuse" }];
    (p.nodes.find((n) => n.id === "brk") as unknown as { closed: boolean }).closed = false;
    const g = createGrid(p);
    expect(g.state().readableFaults.has("bf")).toBe(false);
    expect(g.state().wouldBlow.size).toBe(0);
    g.throwBreaker("brk");
    expect(g.state().wouldBlow.get("fb")).toBe(0);
  });

  it("wouldBlow rule: only that fuse's fault is removed, so a second blown fuse downstream blocks its load (no cascade)", () => {
    const p = mini(
      [
        { id: "feed", type: "feed" }, { id: "f1", type: "fusebox", rating: 1 }, { id: "f2", type: "fusebox", rating: 1 },
        { id: "l", type: "lamp", load: 3 },
      ],
      [["a", "feed", "f1"], ["b", "f1", "f2"], ["c", "f2", "l"]],
      { faults: [{ id: "x1", at: "f1", kind: "blown-fuse" }, { id: "x2", at: "f2", kind: "blown-fuse" }] },
    );
    const s = createGrid(p).state();
    expect(s.wouldBlow.get("f1")).toBe(0); // f2 is still blown: nothing under f1 carries load
    expect(s.wouldBlow.has("f2")).toBe(false); // unreadable behind f1
  });

  it("wouldBlow rule: an unrated fusebox always maps to 0", () => {
    const p = mini(
      [{ id: "feed", type: "feed" }, { id: "f", type: "fusebox" }, { id: "l", type: "lamp", load: 9 }],
      [["a", "feed", "f"], ["b", "f", "l"]],
      { faults: [{ id: "x", at: "f", kind: "blown-fuse" }] },
    );
    expect(createGrid(p).state().wouldBlow.get("f")).toBe(0);
  });

  it("wouldBlow rule: computed after springs have returned (11-which-fuse with sw_1 made spring)", () => {
    const p = loadPuzzle(JSON.parse(readFileSync(join(__dirname, "..", "..", "puzzles", "11-which-fuse.json"), "utf8")) as unknown);
    for (const n of p.nodes) if (n.id === "sw_1" || n.id === "sw_2") (n as unknown as { spring: boolean }).spring = true;
    const bus = new EventBus();
    const springs: string[] = [];
    bus.on("switch:thrown", (e) => e.spring && springs.push(e.nodeId));
    const g = createGrid(p, bus);
    g.throwSwitch("sw_1"); // the trap: shrine (2) on fb_1 (1)
    const s = g.state();
    expect(s.faults.some((f) => f.id === "blown-fb_1")).toBe(true);
    expect(springs).toEqual(["sw_1"]);
    expect(s.switches.get("sw_1")).toBe(0);
    expect(s.wouldBlow.get("fb_1")).toBe(0);
    expect(g.repairAt("fb_1").ok).toBe(true);
    expect(g.state().faults).toHaveLength(0);
    expect(g.state().lit.has("well")).toBe(true);
    expect(g.state().parts).toEqual(["fuse"]);
    // The win is unchanged: sw_2, sw_3, br_3.
    g.throwSwitch("sw_2");
    g.throwSwitch("sw_3");
    g.throwBreaker("br_3");
    expect(g.state().complete).toBe(true);
  });

  it("wouldBlow rule: 11-which-fuse as filed (no spring) reports 2 on a 1 fuse while sw_1 points at the shrine", () => {
    const p = loadPuzzle(JSON.parse(readFileSync(join(__dirname, "..", "..", "puzzles", "11-which-fuse.json"), "utf8")) as unknown);
    for (const n of p.nodes) if (n.id === "sw_1") (n as unknown as { spring?: boolean }).spring = false;
    const g = createGrid(p);
    g.throwSwitch("sw_1");
    expect(g.state().switches.get("sw_1")).toBe(1);
    expect(g.state().wouldBlow.get("fb_1")).toBe(2);
  });
});
