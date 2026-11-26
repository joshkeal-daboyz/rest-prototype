import { describe, expect, it } from "vitest";
import { EventBus, type Fault, type GridNode, type Line, type Puzzle } from "../core";
import { createGrid, loadPreview } from "./index";

/** The timed breaker (ticket 081 TB1). Small inline maps; positions don't matter to the simulator. */
function mini(
  nodes: Array<{ id: string; type: GridNode["type"] } & Record<string, unknown>>,
  lines: Array<[id: string, from: string, to: string]>,
  over: Partial<Puzzle> = {},
  faults: Fault[] = [],
): Puzzle {
  return {
    id: "mini",
    name: "mini",
    version: 4,
    scope: "map",
    capacity: null,
    // `never` is an unreached lamp that keeps the job open unless a test names its own target.
    nodes: [...nodes, { id: "never", type: "lamp" }].map((n, i) => ({ pos: [i, 0], ...n }) as unknown as GridNode),
    lines: lines.map(([id, from, to]): Line => ({ id, from, to })),
    faults,
    target: ["never"],
    ...over,
  };
}

const tb = (id: string, closed: number, open: number, offset = 0) => ({
  id,
  type: "breaker" as const,
  closed: ((offset % (closed + open)) < closed),
  timer: { closed, open, offset },
});

/** The player's own move that starts the clock: a breaker to a lamp that carries no load. */
const starter = [{ id: "br", type: "breaker" as const, closed: true }, { id: "lx", type: "lamp" as const, load: 0 }];
const starterLines: Array<[string, string, string]> = [["l_br", "feed", "br"], ["l_x", "br", "lx"]];

function record(bus: EventBus) {
  const log: Array<[string, unknown]> = [];
  for (const name of ["grid:changed", "breaker:thrown", "grid:brownout", "fuse:blown", "job:completed"] as const) bus.on(name, (p) => log.push([name, p]));
  return log;
}

describe("the timed breaker's schedule (081 TB)", () => {
  const map = () => mini([{ id: "feed", type: "feed" }, ...starter, tb("tb", 2, 2), { id: "l", type: "lamp" }], [...starterLines, ["l_t", "feed", "tb"], ["l_l", "tb", "l"]]);

  it("the clock starts at the first move; the clock throws the breaker, never the player; a flip is no action and Reset stops the clock", () => {
    const bus = new EventBus();
    const log = record(bus);
    const g = createGrid(map(), bus);
    g.advance(5);
    expect(g.state().clock).toBeNull();
    expect(g.state().breakers.get("tb")).toBe(true);
    expect(g.state().timers.get("tb")).toEqual({ closed: true, next: 2 });
    expect(g.throwBreaker("tb")).toBe(false);
    expect(log).toEqual([]);
    g.throwBreaker("br");
    expect(g.state().clock).toBe(0);
    log.length = 0;
    g.advance(2);
    expect(g.state().breakers.get("tb")).toBe(false);
    expect(g.state().timers.get("tb")).toEqual({ closed: false, next: 2 });
    expect(log).toEqual([["breaker:thrown", { nodeId: "tb", closed: false, timer: true }], ["grid:changed", { reason: "time" }]]);
    expect(g.state().actions).toBe(1);
    g.reset();
    expect(g.state().clock).toBeNull();
    expect(g.state().breakers.get("tb")).toBe(true);
  });

  it("time is not undoable: Undo restores the player's last move but leaves the clock and the timed breaker", () => {
    const g = createGrid(map());
    g.throwBreaker("br");
    g.advance(2);
    expect(g.undo()).toBe(true);
    expect(g.state().breakers.get("br")).toBe(true);
    expect(g.state().breakers.get("tb")).toBe(false);
    expect(g.state().clock).toBe(2);
  });

  it("flips at one moment are one settle: an alternating pair is never closed together or open together, and one grid:changed", () => {
    const bus = new EventBus();
    const log = record(bus);
    const grid = createGrid(mini([{ id: "feed", type: "feed" }, ...starter, tb("a", 2, 2, 0), tb("b", 2, 2, 2)], [...starterLines, ["l_a", "feed", "a"], ["l_b", "feed", "b"]]), bus);
    const seen: string[] = [];
    bus.on("grid:changed", () => seen.push(`${grid.state().breakers.get("a")}/${grid.state().breakers.get("b")}`));
    grid.throwBreaker("br");
    log.length = 0;
    seen.length = 0;
    grid.advance(2);
    grid.advance(2);
    expect(seen).toEqual(["false/true", "true/false"]);
    expect(log.filter(([n]) => n === "grid:changed")).toHaveLength(2);
  });
});

describe("the timed breaker meets the other rules (081 TB)", () => {
  it("a relay past it is refused while the window is shut and keeps its place; a spring falls back when it closes; a battery charges only in the window", () => {
    const g = createGrid(
      mini(
        [
          { id: "feed", type: "feed" }, ...starter, tb("tb", 2, 4), { id: "hub", type: "junction" },
          { id: "rel", type: "switch", outputs: ["r0", "r1"], selected: 0, relay: true },
          { id: "sp", type: "switch", outputs: ["s0", "s1"], selected: 0, spring: true },
          { id: "bat", type: "battery", capacity: 5, charge: 0, input: "h_bat" },
          { id: "lr0", type: "lamp" }, { id: "lr1", type: "lamp" }, { id: "ls0", type: "lamp" }, { id: "ls1", type: "lamp" },
        ],
        [
          ...starterLines, ["l_t", "feed", "tb"], ["l_h", "tb", "hub"], ["h_rel", "hub", "rel"], ["h_sp", "hub", "sp"], ["h_bat", "hub", "bat"],
          ["r0", "rel", "lr0"], ["r1", "rel", "lr1"], ["s0", "sp", "ls0"], ["s1", "sp", "ls1"],
        ],
      ),
    );
    g.throwBreaker("br");
    expect(g.throwSwitch("rel")).toBe(true);
    expect(g.throwSwitch("sp")).toBe(true);
    g.advance(2); // the window shuts
    expect(g.state().switches.get("sp")).toBe(0);
    expect(g.state().switches.get("rel")).toBe(1);
    expect(g.state().batteries.get("bat")!.charge).toBe(2);
    expect(g.throwSwitch("rel")).toBe(false);
    g.advance(3);
    expect(g.state().batteries.get("bat")!.charge).toBe(2);
    g.advance(1); // the window opens again
    expect(g.throwSwitch("rel")).toBe(true);
    g.advance(1);
    expect(g.state().batteries.get("bat")!.charge).toBe(3);
  });

  it("a flip can brown the feed out and the next clears it; a flip that powers too much load blows a rated fuse, the culprit the lamp it fed", () => {
    const bus = new EventBus();
    const log = record(bus);
    const g = createGrid(
      mini([{ id: "feed", type: "feed" }, ...starter, tb("a", 2, 4, 0), tb("b", 2, 4, 5), { id: "la", type: "lamp", load: 2 }, { id: "lb", type: "lamp", load: 2 }], [...starterLines, ["l_a", "feed", "a"], ["l_b", "feed", "b"], ["l_la", "a", "la"], ["l_lb", "b", "lb"]], { capacity: 2 }),
      bus,
    );
    g.throwBreaker("br");
    g.advance(1);
    expect(g.state().brownout).toBe(true);
    g.advance(1);
    expect(g.state().brownout).toBe(false);
    expect(log.filter(([n]) => n === "grid:brownout").map(([, p]) => (p as { brownout: boolean }).brownout)).toEqual([true, false]);

    const bus2 = new EventBus();
    const log2 = record(bus2);
    const f = createGrid(
      mini([{ id: "feed", type: "feed" }, ...starter, tb("t", 2, 2, 2), { id: "fb", type: "fusebox", rating: 1 }, { id: "small", type: "lamp", load: 1 }, { id: "big", type: "lamp", load: 2 }], [...starterLines, ["l_t", "feed", "t"], ["l_f", "t", "fb"], ["l_s", "fb", "small"], ["l_b", "fb", "big"]]),
      bus2,
    );
    f.throwBreaker("br");
    f.advance(2);
    expect(log2.find(([n]) => n === "fuse:blown")![1]).toMatchObject({ nodeId: "fb", culprit: "big" });
    expect(f.state().faults.map((x) => x.id)).toEqual(["blown-fb"]);
  });
});

describe("faults hide faults, the Relight, and the preview (081 TB)", () => {
  it("a cable past an open timer is unreadable until its window; after the win the clock stops; a timed breaker's preview entry is its next flip", () => {
    const bus = new EventBus();
    const log = record(bus);
    const p = mini(
      [{ id: "feed", type: "feed" }, ...starter, tb("tb", 2, 4, 2), { id: "lt", type: "lamp" }],
      [...starterLines, ["l_t", "feed", "tb"], ["l_dmg", "tb", "lt"]],
      { target: ["lt"], startingParts: ["wire"] },
      [{ id: "f1", at: "l_dmg", kind: "damaged-cable" }],
    );
    const g = createGrid(p, bus);
    expect(g.repairAt("l_dmg")).toEqual({ ok: false, reason: "unreadable" });
    g.throwBreaker("br");
    g.advance(4); // the window opens at t = 4
    expect(g.state().breakers.get("tb")).toBe(true);
    expect(g.repairAt("l_dmg").ok).toBe(true);
    expect(g.state().complete).toBe(true);
    const entry = loadPreview(p, g.state(), new Set()).get("tb")!;
    expect(entry).toMatchObject({ kind: "breaker", timed: true });
    expect(entry.delta).toBeLessThan(0);
    expect(loadPreview(p, g.state(), new Set()).get("br")!.timed).toBeUndefined();
    log.length = 0;
    g.advance(10);
    expect(g.state().breakers.get("tb")).toBe(true);
    expect(log).toEqual([]);
  });

  it("rule 6 and TB1b1: an alternating pair that flips together previews as one joint flip, so neither entry warns of a brownout the pair does not cause", () => {
    const p = mini(
      // c and d flip before the pair does (m = 6): c twice (closed again), d three times (open). Their lamps carry no load.
      [{ id: "feed", type: "feed", capacity: 1 }, tb("a", 6, 6, 0), tb("b", 6, 6, 6), tb("c", 2, 3, 0), tb("d", 2, 2, 1), { id: "la", type: "lamp", load: 1 }, { id: "lb", type: "lamp", load: 1 }, { id: "lc", type: "lamp", load: 0 }, { id: "ld", type: "lamp", load: 0 }],
      [["l_a", "feed", "a"], ["l_b", "feed", "b"], ["l_c", "feed", "c"], ["l_d", "feed", "d"], ["l_la", "a", "la"], ["l_lb", "b", "lb"], ["l_lc", "c", "lc"], ["l_ld", "d", "ld"]],
    );
    const g = createGrid(p, new EventBus());
    const out = loadPreview(p, g.state(), new Set());
    const a = out.get("a")!;
    expect(a).toMatchObject({ timed: true, delta: 0, over: false, blows: [] });
    expect(out.get("b")).toEqual(a);
    expect(a.lines?.on).toEqual(["l_lb"]);
    expect(a.lines?.off).toEqual(["l_la", "l_ld"]);
  });
});
