import { describe, expect, it } from "vitest";
import { EventBus, validatePuzzle, type Fault, type GridNode, type Line, type Part, type Puzzle } from "../core";
import { createGrid } from "./index";
import type { Grid } from "./types";

/**
 * Ticket 027 G: the simulator at size (4 feeds, about 400 nodes) and draft 5's multi-feed rules at 4 feeds.
 * The generator lives here; positions are spread on a grid and mean nothing to the simulator.
 */

// ---------------------------------------------------------------------------------------------------------------
// The generated map
// ---------------------------------------------------------------------------------------------------------------

const SECTIONS = 4;
const BRANCHES = 6; // one breaker + fusebox + junction per branch
const LAMPS_PER_BRANCH = 12;
const BATTERIES = [2, 2, 1, 1]; // 6 in all
const CASCADE_SECTION = 3; // behind the open master breaker "mb"; every fuse here is rated to blow

interface Big {
  puzzle: Puzzle;
  /** Controls the random walk may throw (never the one that guards the unwinnable target). */
  throwable: string[];
  faultAts: string[];
  cascadeFuses: string[];
}

function bigMap(): Big {
  const nodes: GridNode[] = [];
  const lines: Line[] = [];
  const faults: Fault[] = [];
  const throwable: string[] = [];
  const cascadeFuses: string[] = [];
  let k = 0;
  const pos = (): [number, number] => [(k % 40) * 2, Math.floor(k++ / 40) * 2];
  const node = (n: Record<string, unknown> & { id: string; type: GridNode["type"] }): void => {
    nodes.push({ pos: pos(), ...n } as unknown as GridNode);
  };
  const line = (id: string, from: string, to: string): void => {
    lines.push({ id, from, to });
  };

  for (let s = 0; s < SECTIONS; s++) {
    const feed = `f${s}`;
    node({ id: feed, type: "feed", capacity: 90 });
    let head = feed;
    if (s === CASCADE_SECTION) {
      node({ id: "mb", type: "breaker", closed: false });
      line("l_mb_in", feed, "mb");
      throwable.push("mb");
      head = "mb";
    }
    for (let i = 0; i < BRANCHES; i++) {
      node({ id: `t${s}_${i}`, type: "junction" });
      line(`l_t${s}_${i}`, i === 0 ? head : `t${s}_${i - 1}`, `t${s}_${i}`);
    }
    for (let i = 0; i < BRANCHES; i++) {
      const t = `t${s}_${i}`;
      const br = `br${s}_${i}`;
      const fu = `fu${s}_${i}`;
      const jn = `jn${s}_${i}`;
      node({ id: br, type: "breaker", closed: true });
      node({ id: fu, type: "fusebox", rating: s === CASCADE_SECTION ? 3 : 30 });
      node({ id: jn, type: "junction" });
      line(`l_${br}`, t, br);
      line(`l_${fu}`, br, fu);
      line(`l_${jn}`, fu, jn);
      throwable.push(br);
      if (s === CASCADE_SECTION) cascadeFuses.push(fu);
      for (let j = 0; j < LAMPS_PER_BRANCH; j++) {
        node({ id: `lm${s}_${i}_${j}`, type: "lamp", load: 1 });
        line(`l_lm${s}_${i}_${j}`, jn, `lm${s}_${i}_${j}`);
      }
    }
    for (let b = 0; b < BATTERIES[s]!; b++) {
      const bt = `bt${s}_${b}`;
      node({ id: bt, type: "battery", capacity: 5, charge: 0, input: `l_${bt}_in` });
      node({ id: `bl${s}_${b}`, type: "lamp", load: 1 });
      line(`l_${bt}_in`, `t${s}_${b + 1}`, bt);
      line(`l_${bt}_out`, bt, `bl${s}_${b}`);
    }
    // Faults to find and mend along the way.
    faults.push({ id: `fl${s}_a`, at: `lm${s}_1_3`, kind: "dead-lamp" });
    if (s === CASCADE_SECTION) continue; // every branch here must be live for the cascade
    faults.push({ id: `fl${s}_b`, at: `l_br${s}_2`, kind: "damaged-cable" });
    faults.push({ id: `fl${s}_c`, at: `jn${s}_4`, kind: "dead-junction" });
  }
  // Tie switches: section s's trunk end -> sw -> (a dead stub | section s+1's trunk end).
  for (let s = 0; s < SECTIONS - 1; s++) {
    node({ id: `sw${s}`, type: "switch", outputs: [`l_sw${s}_stub`, `l_sw${s}_tie`], selected: 0 });
    node({ id: `stub${s}`, type: "junction" });
    line(`l_sw${s}_in`, `t${s}_${BRANCHES - 1}`, `sw${s}`);
    line(`l_sw${s}_stub`, `sw${s}`, `stub${s}`);
    line(`l_sw${s}_tie`, `sw${s}`, `t${s + 1}_${BRANCHES - 1}`);
    throwable.push(`sw${s}`);
  }
  // A target nothing can reach: its breaker is never thrown, so the job is never done and the grid never locks.
  node({ id: "never_br", type: "breaker", closed: false });
  node({ id: "never", type: "lamp", load: 1 });
  line("l_never_in", "f0", "never_br");
  line("l_never_out", "never_br", "never");

  const startingParts: Part[] = ["bulb", "bulb", "bulb", "bulb", "wire", "wire", "wire", "wire", "wire", "fuse", "fuse"];
  const puzzle: Puzzle = {
    id: "big",
    name: "big",
    version: 5,
    scope: "map",
    capacity: null,
    nodes,
    lines,
    faults,
    startingParts,
    target: ["never"],
  };
  return { puzzle, throwable, faultAts: faults.map((f) => f.at), cascadeFuses };
}

/** A small deterministic generator (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Action = { kind: "throw"; id: string } | { kind: "repair"; at: string } | { kind: "undo" };

function randomActions(big: Big, n: number, seed: number, withUndo: boolean): Action[] {
  const r = rng(seed);
  const out: Action[] = [];
  for (let i = 0; i < n; i++) {
    const x = r();
    if (withUndo && x < 0.2) out.push({ kind: "undo" });
    else if (x < 0.3) out.push({ kind: "repair", at: big.faultAts[Math.floor(r() * big.faultAts.length)]! });
    else out.push({ kind: "throw", id: big.throwable[Math.floor(r() * big.throwable.length)]! });
  }
  return out;
}

/** Runs one action; true if it changed anything. */
function apply(g: Grid, a: Action): boolean {
  if (a.kind === "undo") return g.undo();
  if (a.kind === "repair") return g.repairAt(a.at).ok;
  return a.id.startsWith("sw") ? g.throwSwitch(a.id) : g.throwBreaker(a.id);
}

const median = (xs: number[]): number => [...xs].sort((p, q) => p - q)[Math.floor(xs.length / 2)]!;

describe("the generated map is what the ticket asks for", () => {
  const big = bigMap();
  it("is a valid version-5 puzzle with 4 feeds, about 400 nodes, 24 fuseboxes and 6 batteries", () => {
    const v = validatePuzzle(JSON.parse(JSON.stringify(big.puzzle)));
    expect(v.ok ? [] : v.errors).toEqual([]);
    const count = (t: string) => big.puzzle.nodes.filter((n) => n.type === t).length;
    expect(count("feed")).toBe(4);
    expect(count("fusebox")).toBe(24);
    expect(count("battery")).toBe(6);
    expect(big.puzzle.nodes.length).toBeGreaterThanOrEqual(390);
    expect(big.puzzle.nodes.length).toBeLessThanOrEqual(430);
    expect(count("switch")).toBe(3); // four sections joined by tie switches
  });
});

describe("027 G budget: the simulator stays fast at 4 feeds and about 400 nodes", () => {
  it("median settle of 200 random actions (throw, repair, undo) is under 5 ms", () => {
    const big = bigMap();
    const g = createGrid(big.puzzle, new EventBus());
    const actions = randomActions(big, 200, 27, true);
    const times: number[] = [];
    for (const a of actions) {
      const t0 = performance.now();
      apply(g, a);
      times.push(performance.now() - t0);
    }
    const med = median(times);
    const max = Math.max(...times);
    console.log(`[027 G] ${big.puzzle.nodes.length} nodes, ${big.puzzle.lines.length} lines: median ${med.toFixed(3)} ms, max ${max.toFixed(3)} ms over ${times.length} actions`);
    expect(med).toBeLessThan(5);
  });

  it("the starting settle and a full reset are also cheap (under 50 ms each)", () => {
    const big = bigMap();
    createGrid(big.puzzle).reset(); // warm up, so the timings below are not a cold JIT sample
    const makes: number[] = [];
    const resets: number[] = [];
    for (let i = 0; i < 9; i++) {
      const t0 = performance.now();
      const g = createGrid(big.puzzle);
      makes.push(performance.now() - t0);
      const t1 = performance.now();
      g.reset();
      resets.push(performance.now() - t1);
    }
    const median = (xs: number[]): number => xs.slice().sort((a, b) => a - b)[xs.length >> 1]!;
    const make = median(makes);
    const reset = median(resets);
    console.log(`[027 G] createGrid ${make.toFixed(3)} ms, reset ${reset.toFixed(3)} ms`);
    expect(make).toBeLessThan(50);
    expect(reset).toBeLessThan(50);
  });

  it("four feeds are all live and judged on their own: loads add up to the total through a random walk", () => {
    const big = bigMap();
    const g = createGrid(big.puzzle);
    expect(g.state().feeds.size).toBe(4);
    for (const a of randomActions(big, 200, 99, true)) {
      apply(g, a);
      const s = g.state();
      let sum = 0;
      for (const f of s.feeds.values()) sum += f.load;
      expect(sum).toBe(s.load);
      expect(s.brownout).toBe([...s.feeds.values()].some((f) => f.over));
    }
  });
});

describe("027 G long undo: 500 actions then 500 undos restore the opening state", () => {
  it("state() equals the initial state (lit, powered, faults, parts, switches, breakers)", () => {
    const big = bigMap();
    const g = createGrid(big.puzzle);
    const initial = g.state();
    const snapshot = {
      lit: new Set(initial.lit),
      powered: new Set(initial.powered),
      faults: initial.faults.map((f) => ({ ...f })),
      parts: [...initial.parts],
      switches: new Map(initial.switches),
      breakers: new Map(initial.breakers),
      feeds: new Map([...initial.feeds].map(([k, v]) => [k, { ...v }])),
    };
    let done = 0;
    for (const a of randomActions(big, 500, 5, false)) if (apply(g, a)) done++;
    expect(done).toBeGreaterThan(300); // the walk really did move things
    expect(g.state().breakers).not.toEqual(snapshot.breakers);
    let undone = 0;
    for (let i = 0; i < 500; i++) if (g.undo()) undone++;
    expect(undone).toBe(done);
    const s = g.state();
    expect(s.lit).toEqual(snapshot.lit);
    expect(s.powered).toEqual(snapshot.powered);
    expect(s.faults).toEqual(snapshot.faults);
    expect(s.parts).toEqual(snapshot.parts);
    expect(s.switches).toEqual(snapshot.switches);
    expect(s.breakers).toEqual(snapshot.breakers);
    expect(s.feeds).toEqual(snapshot.feeds);
    expect(s.actions).toBe(0);
    expect(s).toEqual(initial);
  });
});

describe("027 G cascade: one action that blows 6 fuses", () => {
  it("settles, emits 6 fuse:blown in discovery order, leaves 6 blown-fuse faults, and stays within the budget", () => {
    const big = bigMap();
    const bus = new EventBus();
    const blown: string[] = [];
    bus.on("fuse:blown", (p) => blown.push(p.nodeId));
    const g = createGrid(big.puzzle, bus);
    expect(blown).toEqual([]);
    const t0 = performance.now();
    expect(g.throwBreaker("mb")).toBe(true);
    const dt = performance.now() - t0;
    console.log(`[027 G] cascade of ${blown.length} fuses in one action: ${dt.toFixed(3)} ms`);
    expect(blown).toEqual(big.cascadeFuses);
    const s = g.state();
    expect(s.faults.filter((f) => f.kind === "blown-fuse").map((f) => f.at)).toEqual(big.cascadeFuses);
    for (const fu of big.cascadeFuses) expect(s.fuseLoad.get(fu)).toBe(0);
    // The first run is cold (nothing compiled yet); the budget is the median of several.
    const runs = [dt];
    for (let i = 0; i < 59; i++) {
      const h = createGrid(big.puzzle);
      const t = performance.now();
      h.throwBreaker("mb");
      runs.push(performance.now() - t);
    }
    console.log(`[027 G] cascade median of ${runs.length} runs: ${median(runs).toFixed(3)} ms`);
    expect(median(runs)).toBeLessThan(5);
    // And it undoes in one step.
    expect(g.undo()).toBe(true);
    expect(g.state().faults.some((f) => f.kind === "blown-fuse")).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Draft 5's rules at four feeds
// ---------------------------------------------------------------------------------------------------------------

function mini(
  nodes: Array<{ id: string; type: GridNode["type"] } & Record<string, unknown>>,
  lines: Array<[id: string, from: string, to: string]>,
  over: Partial<Puzzle> = {},
): Puzzle {
  return {
    id: "mini4",
    name: "mini4",
    version: 5,
    scope: "map",
    capacity: null,
    nodes: nodes.map((n, i) => ({ pos: [i, 0], ...n }) as unknown as GridNode),
    lines: lines.map(([id, from, to]): Line => ({ id, from, to })),
    faults: [],
    ...over,
  };
}
const lamp = (id: string, load = 1) => ({ id, type: "lamp" as const, load });
const feed = (id: string, capacity: number | null) => ({ id, type: "feed" as const, capacity });
const sumOfFeeds = (g: Grid): number => [...g.state().feeds.values()].reduce((a, f) => a + f.load, 0);

describe("027 G four feeds: separate pools", () => {
  /** Each feed lights its own lamps; a breaker adds `n` more Lv1 lamps to a feed. */
  const pools = (): Puzzle =>
    mini(
      [
        feed("fa", 2), feed("fb", 5), feed("fc", 1), feed("fd", 9),
        { id: "bra", type: "breaker", closed: false }, lamp("a1"), lamp("a2"), lamp("a3"),
        lamp("b1"), lamp("c1"), lamp("d1"),
      ],
      [
        ["la1", "fa", "a1"], ["la2", "fa", "a2"], ["lbr", "fa", "bra"], ["la3", "bra", "a3"],
        ["lb1", "fb", "b1"], ["lc1", "fc", "c1"], ["ld1", "fd", "d1"],
      ],
    );

  it("no load moves between feeds: spare room on three feeds does not save the fourth", () => {
    const g = createGrid(pools());
    expect([...g.state().feeds.entries()].map(([k, v]) => [k, v.load, v.over])).toEqual([
      ["fa", 2, false], ["fb", 1, false], ["fc", 1, false], ["fd", 1, false],
    ]);
    g.throwBreaker("bra"); // fa: 3 > 2
    const s = g.state();
    expect(s.feeds.get("fa")).toEqual({ load: 3, capacity: 2, over: true });
    expect(s.feeds.get("fb")).toEqual({ load: 1, capacity: 5, over: false });
    expect(s.feeds.get("fc")).toEqual({ load: 1, capacity: 1, over: false });
    expect(s.feeds.get("fd")).toEqual({ load: 1, capacity: 9, over: false });
    expect(s.brownout).toBe(true);
    expect(s.capacity).toBe(17); // the summary: 17 in all, total load 6, yet browned out
    expect(s.load).toBe(6);
    expect(s.complete).toBe(false);
  });

  it("the loads in feeds add up to load", () => {
    const g = createGrid(pools());
    expect(sumOfFeeds(g)).toBe(g.state().load);
    g.throwBreaker("bra");
    expect(sumOfFeeds(g)).toBe(g.state().load);
  });
});

describe("027 G four feeds: the nearest feed by hops carries a node", () => {
  /**
   * A hub junction h with a lamp x; arms to the four feeds of 3, 2, 2 and 4 lines. The order of the feed nodes
   * is a parameter. fb and fc tie at 2 lines.
   */
  const hub = (order: string[]): Puzzle => {
    const arm = (f: string, hops: number): Array<[string, string, string]> => {
      const out: Array<[string, string, string]> = [];
      let prev = f;
      for (let i = 1; i < hops; i++) {
        out.push([`${f}_l${i}`, prev, `${f}_j${i}`]);
        prev = `${f}_j${i}`;
      }
      out.push([`${f}_l${hops}`, prev, "h"]);
      return out;
    };
    const juncs = (f: string, hops: number) => Array.from({ length: hops - 1 }, (_, i) => ({ id: `${f}_j${i + 1}`, type: "junction" as const }));
    const feeds = new Map([["fa", 3], ["fb", 2], ["fc", 2], ["fd", 4]]);
    return mini(
      [
        ...order.map((f) => feed(f, 5)),
        { id: "h", type: "junction" }, lamp("x"),
        ...[...feeds].flatMap(([f, hops]) => juncs(f, hops)),
      ],
      [...[...feeds].flatMap(([f, hops]) => arm(f, hops)), ["lx", "h", "x"]],
    );
  };

  it("the nearest feed wins over a farther one regardless of file order", () => {
    // Only fa (3) and fd (4) in reach: fa.
    const p = hub(["fd", "fa", "fb", "fc"]);
    p.lines = p.lines.filter((l) => !l.id.startsWith("fb_") && !l.id.startsWith("fc_"));
    p.nodes = p.nodes.filter((n) => !n.id.startsWith("fb_") && !n.id.startsWith("fc_"));
    expect(createGrid(p).state().feedOf.get("x")).toBe("fa");
  });

  it("a two-way tie between the nearest goes to the feed listed first in nodes", () => {
    expect(createGrid(hub(["fa", "fb", "fc", "fd"])).state().feedOf.get("x")).toBe("fb");
    expect(createGrid(hub(["fa", "fc", "fb", "fd"])).state().feedOf.get("x")).toBe("fc");
    expect(createGrid(hub(["fc", "fd", "fa", "fb"])).state().feedOf.get("x")).toBe("fc");
  });

  it("a tie is broken by file order of feeds first: a four-way tie goes to the first feed in nodes", () => {
    const ring = (order: string[]): Puzzle =>
      mini(
        [...order.map((f) => feed(f, 5)), { id: "h", type: "junction" }, lamp("x")],
        [...["fa", "fb", "fc", "fd"].map((f): [string, string, string] => [`l_${f}`, f, "h"]), ["lx", "h", "x"]],
      );
    expect(createGrid(ring(["fa", "fb", "fc", "fd"])).state().feedOf.get("x")).toBe("fa");
    expect(createGrid(ring(["fd", "fc", "fb", "fa"])).state().feedOf.get("x")).toBe("fd");
    expect(createGrid(ring(["fb", "fd", "fa", "fc"])).state().feedOf.get("x")).toBe("fb");
  });

  /**
   * fa reaches lamp x by two equal paths through fuseboxes (rating 0) fm_a and fm_b; the other three feeds sit
   * far away. The first path in line order carries x, so its fuse is the first to blow.
   */
  const paths = (first: "a" | "b"): Puzzle => {
    const la: [string, string, string] = ["l_fa_ma", "fa", "fm_a"];
    const lb: [string, string, string] = ["l_fa_mb", "fa", "fm_b"];
    return mini(
      [
        feed("fa", null), feed("fb", null), feed("fc", null), feed("fd", null),
        { id: "fm_a", type: "fusebox", rating: 0 }, { id: "fm_b", type: "fusebox", rating: 0 },
        { id: "j", type: "junction" }, lamp("x"),
        { id: "fb1", type: "junction" }, { id: "fb2", type: "junction" }, { id: "fb3", type: "junction" },
      ],
      [
        ...(first === "a" ? [la, lb] : [lb, la]),
        ["l_ma_j", "fm_a", "j"], ["l_mb_j", "fm_b", "j"], ["lx", "j", "x"],
        ["l_fb", "fb", "fb1"], ["l_fb1", "fb1", "fb2"], ["l_fb2", "fb2", "fb3"], ["l_fb3", "fb3", "j"],
        ["l_fc", "fc", "fb1"], ["l_fd", "fd", "fb2"],
      ],
    );
  };

  it("a tie between two paths of the same feed is broken by line order", () => {
    for (const first of ["a", "b"] as const) {
      const bus = new EventBus();
      const blown: string[] = [];
      bus.on("fuse:blown", (p) => blown.push(p.nodeId));
      const g = createGrid(paths(first), bus);
      expect(g.state().feedOf.get("fm_a")).toBe("fa");
      expect(g.state().feedOf.get("fm_b")).toBe("fa");
      // The starting settle emits nothing, so read what the first path in line order was from the state: the
      // lamp's fuse that carries it blew, the other one did not.
      expect(blown).toEqual([]);
      const faulted = g.state().faults.map((f) => f.at);
      expect(faulted[0]).toBe(first === "a" ? "fm_a" : "fm_b");
    }
  });

  it("changing which feed a node is nearest to (a switch lengthens one arm) moves the load to the next", () => {
    // fa - sw -(short | long)- j; fb - j directly with 2 lines; the short side ties, the long side loses.
    const p = mini(
      [
        feed("fa", 5), feed("fb", 5), feed("fc", 5), feed("fd", 5),
        { id: "sw", type: "switch", outputs: ["s_short", "s_long"], selected: 0 },
        { id: "m1", type: "junction" }, { id: "m2", type: "junction" }, { id: "k", type: "junction" }, { id: "j", type: "junction" },
        lamp("x"),
      ],
      [
        ["s_in", "fa", "sw"], ["s_short", "sw", "j"], ["s_long", "sw", "m1"], ["m_12", "m1", "m2"], ["m_2j", "m2", "j"],
        ["b_k", "fb", "k"], ["k_j", "k", "j"], ["lx", "j", "x"],
      ],
    );
    const g = createGrid(p);
    expect(g.state().feedOf.get("x")).toBe("fa"); // 2 hops vs 3: fa
    g.throwSwitch("sw");
    expect(g.state().feedOf.get("x")).toBe("fb"); // now 4 hops vs 3
    expect(g.state().feeds.get("fa")!.load).toBe(0);
    expect(g.state().feeds.get("fb")!.load).toBe(1);
    expect(g.state().feeds.get("fc")!.load).toBe(0);
    expect(g.state().feeds.get("fd")!.load).toBe(0);
  });
});

describe("027 G four feeds: the meeting line is live and carries no load across", () => {
  /** fa - a1 - a2 - fb - b1 - b2 - fc - c1 - c2 - fd - d1 - d2 - fa. Each junction has a lamp; each pair meets mid-way. */
  const ringMap = (caps: number[] = [2, 2, 2, 2]): Puzzle => {
    const f = ["fa", "fb", "fc", "fd"];
    const pairs = ["a", "b", "c", "d"];
    const nodes: Array<{ id: string; type: GridNode["type"] } & Record<string, unknown>> = [];
    const lines: Array<[string, string, string]> = [];
    f.forEach((id, i) => nodes.push(feed(id, caps[i]!)));
    pairs.forEach((p, i) => {
      nodes.push({ id: `${p}1`, type: "junction" }, { id: `${p}2`, type: "junction" }, lamp(`x${p}1`), lamp(`x${p}2`));
      lines.push([`in_${p}`, f[i]!, `${p}1`], [`meet_${p}`, `${p}1`, `${p}2`], [`out_${p}`, `${p}2`, f[(i + 1) % 4]!]);
      lines.push([`lx_${p}1`, `${p}1`, `x${p}1`], [`lx_${p}2`, `${p}2`, `x${p}2`]);
    });
    return mini(nodes, lines);
  };

  it("each meeting line is powered, each side's lamps belong to their own feed, and no feed carries the other's", () => {
    const g = createGrid(ringMap());
    const s = g.state();
    for (const p of ["a", "b", "c", "d"]) expect(s.powered.has(`meet_${p}`)).toBe(true);
    // pair a sits between fa and fb, b between fb and fc, ...
    expect(s.feedOf.get("a1")).toBe("fa");
    expect(s.feedOf.get("a2")).toBe("fb");
    expect(s.feedOf.get("b1")).toBe("fb");
    expect(s.feedOf.get("b2")).toBe("fc");
    expect(s.feedOf.get("c1")).toBe("fc");
    expect(s.feedOf.get("c2")).toBe("fd");
    expect(s.feedOf.get("d1")).toBe("fd");
    expect(s.feedOf.get("d2")).toBe("fa");
    // fa carries xa1 and xd2; fb carries xa2 and xb1; nothing crosses the meeting lines.
    for (const f of ["fa", "fb", "fc", "fd"]) expect(s.feeds.get(f)).toEqual({ load: 2, capacity: 2, over: false });
    expect(s.load).toBe(8);
    expect(s.brownout).toBe(false);
    expect(s.lit.size).toBe(8);
  });

  it("a meeting line stays live and loadless when a neighbour is shut: open one feed's side and the line still conducts from the other", () => {
    // Make fb's far side a broken junction: a2's lamp loses fb; it is then reached from fa across the meeting line.
    const p = ringMap();
    p.faults = [{ id: "dj", at: "a2", kind: "dead-junction" }];
    const s = createGrid(p).state();
    expect(s.powered.has("meet_a")).toBe(true); // current runs up to the fault from a1
    expect(s.readableFaults.has("dj")).toBe(true);
    expect(s.feeds.get("fa")!.load + s.feeds.get("fb")!.load + s.feeds.get("fc")!.load + s.feeds.get("fd")!.load).toBe(s.load);
  });
});

describe("027 G four feeds: brownout when any one feed is over, `over` lists exactly those", () => {
  /** Feed nodes are listed fc, fa, fd, fb; each has one steady Lv1 lamp and a breaker to a second Lv1 lamp. */
  const order = ["fc", "fa", "fd", "fb"];
  const overMap = (): Puzzle =>
    mini(
      [
        ...order.map((f) => feed(f, 1)),
        ...order.flatMap((f) => [{ id: `br_${f}`, type: "breaker" as const, closed: false }, lamp(`s_${f}`), lamp(`e_${f}`)]),
      ],
      order.flatMap((f): Array<[string, string, string]> => [[`ls_${f}`, f, `s_${f}`], [`lb_${f}`, f, `br_${f}`], [`le_${f}`, `br_${f}`, `e_${f}`]]),
    );

  it("one feed over browns the whole map out; `over` names only it", () => {
    const bus = new EventBus();
    const events: Array<{ brownout: boolean; over?: readonly string[]; load: number; capacity: number }> = [];
    bus.on("grid:brownout", (p) => events.push(p));
    const g = createGrid(overMap(), bus);
    expect(g.state().brownout).toBe(false);
    g.throwBreaker("br_fd");
    expect(g.state().brownout).toBe(true);
    expect([...g.state().feeds].filter(([, v]) => v.over).map(([k]) => k)).toEqual(["fd"]);
    expect(events).toEqual([{ brownout: true, load: 5, capacity: 4, over: ["fd"] }]);
  });

  it("several over: `over` lists exactly those, in file order (not alphabetical, not the order they went over)", () => {
    const bus = new EventBus();
    const events: Array<{ brownout: boolean; over?: readonly string[] }> = [];
    bus.on("grid:brownout", (p) => events.push(p));
    const g = createGrid(overMap(), bus);
    g.throwBreaker("br_fb");
    g.throwBreaker("br_fc");
    g.throwBreaker("br_fd");
    expect(events.map((e) => e.over)).toEqual([["fb"], ["fc", "fb"], ["fc", "fd", "fb"]]);
    expect(events.every((e) => e.brownout)).toBe(true);
    g.throwBreaker("br_fa");
    expect(events[3]!.over).toEqual(["fc", "fa", "fd", "fb"]);
    expect(sumOfFeeds(g)).toBe(g.state().load);
    expect(g.state().load).toBe(8);
  });

  it("clearing the over feeds one at a time re-fires with the shrinking list, and the last clears it with over: []", () => {
    const bus = new EventBus();
    const events: Array<{ brownout: boolean; over?: readonly string[] }> = [];
    const g = createGrid(overMap(), bus);
    g.throwBreaker("br_fa");
    g.throwBreaker("br_fb");
    bus.on("grid:brownout", (p) => events.push(p));
    g.throwBreaker("br_fa");
    expect(events.at(-1)).toMatchObject({ brownout: true, over: ["fb"] });
    g.throwBreaker("br_fb");
    expect(events.at(-1)).toMatchObject({ brownout: false, over: [] });
    expect(g.state().brownout).toBe(false);
  });

  it("while any feed is over nothing wins, even with every target lit", () => {
    const g = createGrid(overMap());
    g.throwBreaker("br_fa");
    for (const f of order.filter((x) => x !== "fa")) g.throwBreaker(`br_${f}`);
    // every feed is over now
    expect(g.state().lit.size).toBe(8);
    expect(g.state().complete).toBe(false);
  });
});
