import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { EventBus, loadPuzzle, puzzleFeeds, type Fault, type GridNode, type Line, type Puzzle } from "../core";
import { createGrid } from "./index";

/** Ticket 015 A: more than one powersource. Small inline maps; positions don't matter to the simulator. */
function mini(
  nodes: Array<{ id: string; type: GridNode["type"] } & Record<string, unknown>>,
  lines: Array<[id: string, from: string, to: string]>,
  faults: Fault[] = [],
  over: Partial<Puzzle> = {},
): Puzzle {
  return {
    id: "mini",
    name: "mini",
    version: 5,
    scope: "map",
    capacity: null,
    nodes: nodes.map((n, i) => ({ pos: [i, 0], ...n }) as unknown as GridNode),
    lines: lines.map(([id, from, to]): Line => ({ id, from, to })),
    faults,
    ...over,
  };
}

const lamp = (id: string, load = 1) => ({ id, type: "lamp" as const, load });

function record(bus: EventBus) {
  const log: Array<[string, any]> = [];
  for (const name of ["grid:brownout", "fuse:blown", "job:completed"] as const) bus.on(name, (p) => log.push([name, p]));
  return log;
}
const only = (log: Array<[string, any]>, name: string) => log.filter(([n]) => n === name).map(([, p]) => p);

/** fa carries three Lv1 lamps and fb one: the load split is 3 + 1 under the sum 2 + 2. */
const lopsided = (capA: number | null, capB: number | null, over: Partial<Puzzle> = {}): Puzzle =>
  mini(
    [
      { id: "fa", type: "feed", capacity: capA },
      { id: "fb", type: "feed", capacity: capB },
      lamp("a1"), lamp("a2"), lamp("a3"), lamp("b1"),
    ],
    [["la1", "fa", "a1"], ["la2", "fa", "a2"], ["la3", "fa", "a3"], ["lb1", "fb", "b1"]],
    [],
    over,
  );

/**
 * fa -l1- sw -(l2 | l2b,jx,l2c)- j; fb -l3- k -l4- j; a lamp x on j; a1 on fa, b1 on fb.
 * With the switch at 0, j is two hops from each feed (a tie, so fa carries x); at 1 the fa side is longer, so fb does.
 */
const swMap = (capA: number, capB: number): Puzzle =>
  mini(
    [
      { id: "fa", type: "feed", capacity: capA },
      { id: "fb", type: "feed", capacity: capB },
      { id: "sw", type: "switch", outputs: ["l2", "l2b"], selected: 0 },
      { id: "jx", type: "junction" },
      { id: "j", type: "junction" },
      { id: "k", type: "junction" },
      lamp("x"), lamp("a1"), lamp("b1"),
    ],
    [
      ["l1", "fa", "sw"], ["l2", "sw", "j"], ["l2b", "sw", "jx"], ["l2c", "jx", "j"],
      ["l3", "fb", "k"], ["l4", "k", "j"], ["lx", "j", "x"], ["la1", "fa", "a1"], ["lb1", "fb", "b1"],
    ],
  );

describe("separate pools: each feed is judged against its own capacity", () => {
  it("two Lv2 feeds with three Lv1 lamps nearest the first brown out though the total (4) is within the sum (4)", () => {
    const bus = new EventBus();
    const log = record(bus);
    const s = createGrid(lopsided(2, 2), bus).state();
    expect(s.load).toBe(4);
    expect(s.capacity).toBe(4);
    expect(s.brownout).toBe(true);
    expect(s.feeds.get("fa")).toEqual({ load: 3, capacity: 2, over: true });
    expect(s.feeds.get("fb")).toEqual({ load: 1, capacity: 2, over: false });
    expect([...s.feeds.keys()]).toEqual(["fa", "fb"]);
    expect(log).toEqual([]); // the starting settle emits nothing
  });

  it("a load spread inside each limit does not brown out", () => {
    const s = createGrid(lopsided(3, 1)).state();
    expect(s.brownout).toBe(false);
    expect(s.feeds.get("fa")!.over).toBe(false);
  });

  it("capacity is the sum of the feeds' limits, null if any feed has none", () => {
    expect(createGrid(lopsided(2, 3)).state().capacity).toBe(5);
    expect(createGrid(lopsided(2, null)).state().capacity).toBeNull();
    expect(createGrid(lopsided(null, null)).state().brownout).toBe(false);
  });

  it("a feed with no limit is never over while the other is judged", () => {
    const s = createGrid(lopsided(2, null)).state();
    expect(s.feeds.get("fb")).toEqual({ load: 1, capacity: null, over: false });
    expect(s.brownout).toBe(true);
  });

  it("an unpowered feed still has an entry with load 0", () => {
    const p = mini(
      [{ id: "fa", type: "feed", capacity: 1 }, { id: "fb", type: "feed", capacity: 1 }, { id: "br", type: "breaker", closed: false }, lamp("x")],
      [["l1", "fa", "br"], ["l2", "br", "x"]],
    );
    expect(createGrid(p).state().feeds.get("fb")).toEqual({ load: 0, capacity: 1, over: false });
  });
});

describe("the nearer feed carries a node (ties: feed order, then line order)", () => {
  /** fa -l1- j1 -l2- j2 -l3- fb, a lamp on each junction. */
  const chain = (): Puzzle =>
    mini(
      [{ id: "fa", type: "feed", capacity: 5 }, { id: "j1", type: "junction" }, { id: "j2", type: "junction" }, { id: "fb", type: "feed", capacity: 5 }, lamp("x"), lamp("y")],
      [["l1", "fa", "j1"], ["l2", "j1", "j2"], ["l3", "j2", "fb"], ["lx", "j1", "x"], ["ly", "j2", "y"]],
    );

  it("a ring between two feeds puts each lamp on the nearer feed, and feedOf reports it", () => {
    const s = createGrid(chain()).state();
    expect(s.feedOf.get("x")).toBe("fa");
    expect(s.feedOf.get("y")).toBe("fb");
    expect(s.feedOf.get("l1")).toBe("fa");
    expect(s.feedOf.get("l3")).toBe("fb");
    expect(s.feedOf.get("fa")).toBe("fa");
    expect(s.feedOf.get("fb")).toBe("fb");
    expect(s.feeds.get("fa")!.load).toBe(1);
    expect(s.feeds.get("fb")!.load).toBe(1);
  });

  it("the meeting line is live and carries no load across", () => {
    const s = createGrid(chain()).state();
    expect(s.powered.has("l2")).toBe(true);
    expect(s.feedOf.get("j1")).toBe("fa");
    expect(s.feedOf.get("j2")).toBe("fb");
  });

  /** fa and fb both one line from j, which has a lamp. */
  const tie = (order: "ab" | "ba"): Puzzle => {
    const feeds = [{ id: "fa", type: "feed" as const, capacity: 5 }, { id: "fb", type: "feed" as const, capacity: 5 }];
    if (order === "ba") feeds.reverse();
    return mini([...feeds, { id: "j", type: "junction" }, lamp("x")], [["l1", "fa", "j"], ["l2", "fb", "j"], ["lx", "j", "x"]]);
  };

  it("a tie goes to the feed listed first in nodes", () => {
    expect(createGrid(tie("ab")).state().feedOf.get("x")).toBe("fa");
    expect(createGrid(tie("ba")).state().feedOf.get("x")).toBe("fb");
  });

  it("a lamp counts toward exactly one feed, never both", () => {
    const s = createGrid(tie("ab")).state();
    expect(s.feeds.get("fa")!.load + s.feeds.get("fb")!.load).toBe(1);
    expect(s.load).toBe(1);
  });

  it("throwing a switch that lengthens one side moves the lamp to the other feed", () => {
    const g = createGrid(swMap(5, 5));
    expect(g.state().feedOf.get("x")).toBe("fa");
    g.throwSwitch("sw");
    expect(g.state().feedOf.get("x")).toBe("fb");
    expect(g.state().feeds.get("fa")!.load).toBe(1);
    expect(g.state().feeds.get("fb")!.load).toBe(2);
  });

  it("a lamp nearer the second feed is carried by it, open breaker or not", () => {
    const p = mini(
      [{ id: "fa", type: "feed", capacity: 5 }, { id: "br", type: "breaker", closed: true }, { id: "fb", type: "feed", capacity: 5 }, lamp("x")],
      [["l1", "fa", "br"], ["l2", "br", "x"], ["l3", "fb", "x"]],
    );
    const g = createGrid(p);
    expect(g.state().feedOf.get("x")).toBe("fb");
    g.throwBreaker("br");
    expect(g.state().feedOf.get("x")).toBe("fb");
  });

  it("a node powered only by a released battery is absent from feedOf and counts toward no feed", () => {
    const p = mini(
      [{ id: "fa", type: "feed", capacity: 1 }, { id: "fb", type: "feed", capacity: 1 }, { id: "bat", type: "battery", capacity: 5, charge: 5, input: "l_in" }, lamp("y"), lamp("z")],
      [["l_in", "fa", "bat"], ["l_out", "bat", "y"], ["lz", "fb", "z"]],
    );
    const g = createGrid(p);
    g.release("bat");
    const s = g.state();
    expect(s.lit.has("y")).toBe(true);
    expect(s.feedOf.has("y")).toBe(false);
    expect(s.feedOf.has("l_out")).toBe(false);
    expect(s.feeds.get("fa")!.load).toBe(0);
    expect(s.load).toBe(1);
  });
});

describe("grid:brownout carries the over feeds on a multi-feed map", () => {
  it("one feed over: brownout true; moving the load clears it with over: [] and the summary capacity", () => {
    const bus = new EventBus();
    const log = record(bus);
    const g = createGrid(swMap(1, 3), bus);
    expect(g.state().brownout).toBe(true);
    expect(g.state().feeds.get("fa")!.over).toBe(true);
    g.throwSwitch("sw"); // x moves to fb: fa 1, fb 2
    expect(only(log, "grid:brownout")).toEqual([{ brownout: false, load: 3, capacity: 4, over: [] }]);
  });

  it("entering a brownout fires with the over feed; clearing fires with over: []", () => {
    const bus = new EventBus();
    const log = record(bus);
    const g = createGrid(swMap(2, 1), bus);
    expect(g.state().brownout).toBe(false);
    g.throwSwitch("sw"); // x to fb: b1 + x = 2 > 1
    expect(only(log, "grid:brownout")).toEqual([{ brownout: true, load: 3, capacity: 3, over: ["fb"] }]);
    g.throwSwitch("sw");
    expect(only(log, "grid:brownout")[1]).toEqual({ brownout: false, load: 3, capacity: 3, over: [] });
  });

  it("moving the over-load from one feed to the other during a brownout fires again with the new over", () => {
    const bus = new EventBus();
    const log = record(bus);
    const g = createGrid(swMap(1, 1), bus);
    expect(g.state().feeds.get("fa")!.over).toBe(true);
    expect(g.state().feeds.get("fb")!.over).toBe(false);
    expect(only(log, "grid:brownout")).toEqual([]);
    g.throwSwitch("sw");
    expect(g.state().feeds.get("fb")!.over).toBe(true);
    expect(g.state().feeds.get("fa")!.over).toBe(false);
    expect(only(log, "grid:brownout")).toEqual([{ brownout: true, load: 3, capacity: 2, over: ["fb"] }]);
  });

  it("both feeds over lists them in file order", () => {
    const bus = new EventBus();
    const log = record(bus);
    const p = mini(
      [{ id: "fb", type: "feed", capacity: 0 }, { id: "fa", type: "feed", capacity: 1 }, { id: "br", type: "breaker", closed: false }, lamp("a1"), lamp("a2"), lamp("b1")],
      [["l1", "fa", "a1"], ["l2", "fa", "br"], ["l3", "br", "a2"], ["l4", "fb", "b1"]],
    );
    const g = createGrid(p, bus);
    expect(g.state().brownout).toBe(true); // fb already over (1 > 0)
    g.throwBreaker("br"); // fa over as well
    expect(only(log, "grid:brownout")).toEqual([{ brownout: true, load: 3, capacity: 1, over: ["fb", "fa"] }]);
  });

  it("does not fire when an action leaves the over set as it was", () => {
    const bus = new EventBus();
    const log = record(bus);
    // fa over (a1 + a2 = 2 > 1) whether or not the breaker feeds the extra fb lamp
    const p = mini(
      [{ id: "fa", type: "feed", capacity: 1 }, { id: "fb", type: "feed", capacity: 5 }, { id: "br", type: "breaker", closed: false }, lamp("a1"), lamp("a2"), lamp("b1")],
      [["l1", "fa", "a1"], ["l2", "fa", "a2"], ["l3", "fb", "br"], ["l4", "br", "b1"]],
    );
    const g = createGrid(p, bus);
    g.throwBreaker("br");
    expect(g.state().feeds.get("fb")!.load).toBe(1);
    expect(only(log, "grid:brownout")).toEqual([]);
  });
});

describe("a fusebox is judged on the load carried through it, from whichever feed", () => {
  /** fa lights a1; fb feeds a fusebox (rating 2) behind a breaker with three Lv1 lamps. */
  const fuseMap = (): Puzzle =>
    mini(
      [
        { id: "fa", type: "feed", capacity: 10 },
        { id: "fb", type: "feed", capacity: 10 },
        { id: "br", type: "breaker", closed: false },
        { id: "fuse", type: "fusebox", rating: 2 },
        lamp("x1"), lamp("x2"), lamp("x3"), lamp("a1"),
      ],
      [["la", "fa", "a1"], ["lf", "fb", "br"], ["lb", "br", "fuse"], ["l1", "fuse", "x1"], ["l2", "fuse", "x2"], ["l3", "fuse", "x3"]],
    );

  it("a fusebox fed from the second feed blows on that feed's load", () => {
    const bus = new EventBus();
    const log = record(bus);
    const g = createGrid(fuseMap(), bus);
    g.throwBreaker("br");
    const blown = only(log, "fuse:blown");
    expect(blown).toHaveLength(1);
    expect(blown[0]).toMatchObject({ nodeId: "fuse", load: 3, rating: 2 });
    expect(g.state().faults.map((f) => f.at)).toEqual(["fuse"]);
    expect(g.state().feeds.get("fb")!.load).toBe(0);
    expect(g.state().feeds.get("fa")!.load).toBe(1);
  });

  it("a fusebox that holds reports the load carried through it", () => {
    const g = createGrid(fuseMap());
    g.throwBreaker("br");
    // blown above; use a lighter fuse map: rating 3 holds
    const p = fuseMap();
    (p.nodes.find((n) => n.id === "fuse") as unknown as { rating: number }).rating = 3;
    const h = createGrid(p);
    h.throwBreaker("br");
    expect(h.state().fuseLoad.get("fuse")).toBe(3);
    expect(h.state().feeds.get("fb")!.load).toBe(3);
    expect(g.state().fuseLoad.get("fuse")).toBe(0);
  });
});

describe("batteries charge from any feed", () => {
  it("a battery whose input is on the second feed charges", () => {
    const p = mini(
      [
        { id: "fa", type: "feed", capacity: 5 },
        { id: "fb", type: "feed", capacity: 5 },
        { id: "bat", type: "battery", capacity: 5, charge: 0, input: "l_in" },
        lamp("a1"), lamp("y"),
      ],
      [["la", "fa", "a1"], ["l_in", "fb", "bat"], ["l_out", "bat", "y"]],
    );
    const g = createGrid(p);
    g.advance(2);
    expect(g.state().batteries.get("bat")).toMatchObject({ charge: 2, charging: true });
    g.advance(10);
    expect(g.state().batteries.get("bat")!.charge).toBe(5);
  });
});

describe("win needs every target lit and no feed over", () => {
  it("every lamp lit but a feed over: not complete; within every limit: complete and job:completed fires", () => {
    const over = createGrid(lopsided(2, 2));
    expect(over.state().lit.size).toBe(4);
    expect(over.state().complete).toBe(false);
    const bus = new EventBus();
    const log = record(bus);
    const p = mini(
      [{ id: "fa", type: "feed", capacity: 1 }, { id: "fb", type: "feed", capacity: 1 }, { id: "br", type: "breaker", closed: false }, lamp("a1"), lamp("b1")],
      [["l1", "fa", "br"], ["l2", "br", "a1"], ["l3", "fb", "b1"]],
    );
    const g = createGrid(p, bus);
    expect(g.state().complete).toBe(false);
    g.throwBreaker("br");
    expect(g.state().complete).toBe(true);
    expect(only(log, "job:completed")).toHaveLength(1);
  });

  it("a target lit by the second feed counts", () => {
    expect(createGrid(lopsided(3, 1, { target: ["b1"] })).state().complete).toBe(true);
  });

  it("a target lit only by a released battery does not win", () => {
    const p = mini(
      [{ id: "fa", type: "feed", capacity: 1 }, { id: "fb", type: "feed", capacity: 1 }, { id: "bat", type: "battery", capacity: 5, charge: 5, input: "l_in" }, lamp("y")],
      [["l_in", "fa", "bat"], ["l_out", "bat", "y"]],
      [],
      { target: ["y"] },
    );
    const g = createGrid(p);
    g.release("bat");
    expect(g.state().lit.has("y")).toBe(true);
    expect(g.state().complete).toBe(false);
  });
});

describe("readability: a fault can be read from either feed's side", () => {
  it("a fault behind feed A's open breaker is readable from feed B's side", () => {
    const fault: Fault = { id: "f1", at: "j", kind: "dead-junction" };
    const two = mini(
      [{ id: "fa", type: "feed", capacity: 5 }, { id: "br", type: "breaker", closed: false }, { id: "j", type: "junction" }, { id: "fb", type: "feed", capacity: 5 }],
      [["l1", "fa", "br"], ["l2", "br", "j"], ["l3", "fb", "j"]],
      [fault],
    );
    expect(createGrid(two).state().readableFaults.has("f1")).toBe(true);
    const one = mini(
      [{ id: "fa", type: "feed", capacity: 5 }, { id: "br", type: "breaker", closed: false }, { id: "j", type: "junction" }],
      [["l1", "fa", "br"], ["l2", "br", "j"]],
      [fault],
      { version: 3 },
    );
    expect(createGrid(one).state().readableFaults.has("f1")).toBe(false);
  });
});

describe("every map in puzzles/ behaves as before on one feed", () => {
  const dir = join(__dirname, "..", "..", "puzzles");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  it("finds the maps", () => expect(files.length).toBeGreaterThan(50));
  for (const file of files) {
    it(`${file}: feeds has one entry equal to load/capacity; grid:brownout has no over key`, () => {
      const puzzle = loadPuzzle(JSON.parse(readFileSync(join(dir, file), "utf8")) as unknown);
      const feedId = puzzle.nodes.find((n) => n.type === "feed")!.id;
      const bus = new EventBus();
      const events: any[] = [];
      bus.on("grid:brownout", (p) => events.push(p));
      const g = createGrid(puzzle, bus);
      if (puzzleFeeds(puzzle).length > 1) {
        const ids = new Set(puzzleFeeds(puzzle).map((f: any) => (typeof f === "string" ? f : f.id)));
        const checkMulti = () => {
          const s = g.state();
          expect(s.feeds.size).toBe(ids.size);
          for (const owner of new Set(s.feedOf.values())) expect(ids.has(owner)).toBe(true);
        };
        checkMulti();
        for (const n of puzzle.nodes) {
          if (n.type === "breaker") g.throwBreaker(n.id);
          else if (n.type === "switch") g.throwSwitch(n.id);
          else continue;
          checkMulti();
        }
        for (const e of events) expect(Array.isArray(e.over)).toBe(true);
        return;
      }
      expect(puzzleFeeds(puzzle)).toHaveLength(1);
      const check = () => {
        const s = g.state();
        expect(s.feeds.size).toBe(1);
        const entry = [...s.feeds.values()][0]!;
        expect(entry.load).toBe(s.load);
        expect(entry.capacity).toBe(s.capacity);
        expect(entry.over).toBe(s.brownout);
        for (const id of s.feedOf.keys()) expect(s.powered.has(id)).toBe(true);
        for (const owner of new Set(s.feedOf.values())) expect(owner).toBe(feedId);
      };
      check();
      for (const n of puzzle.nodes) {
        if (n.type === "breaker") g.throwBreaker(n.id);
        else if (n.type === "switch") g.throwSwitch(n.id);
        else continue;
        check();
      }
      for (const e of events) expect("over" in e).toBe(false);
    });
  }
});
