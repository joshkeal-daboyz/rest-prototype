import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadCityPuzzle, loadPuzzle, puzzleFeeds, validateCityPuzzle, validatePuzzle } from "./load";

const PUZZLES = join(__dirname, "..", "..", "puzzles", "fixtures");
const files = readdirSync(PUZZLES).filter((f) => f.endsWith(".json"));
const read = (f: string) => JSON.parse(readFileSync(join(PUZZLES, f), "utf8")) as unknown;

describe("the validator catches broken puzzles", () => {
  const base = () => structuredClone(read("09-shrine-circuit.json")) as Record<string, unknown>;

  it("a lamp with two lines is not a leaf", () => {
    const p = base();
    (p["lines"] as unknown[]).push({ id: "bad", from: "shrine", to: "flood" });
    const r = validatePuzzle(p);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join("\n")).toMatch(/lamp shrine must be a leaf/);
  });

  it("a blown fuse must sit on a fusebox", () => {
    const p = base();
    (p["faults"] as unknown[]).push({ id: "f9", at: "j1", kind: "blown-fuse" });
    const r = validatePuzzle(p);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join("\n")).toMatch(/blown-fuse must sit on a fusebox/);
  });

  it("a damaged cable must sit on a line", () => {
    const p = base();
    (p["faults"] as unknown[]).push({ id: "f9", at: "j1", kind: "damaged-cable" });
    expect(validatePuzzle(p).ok).toBe(false);
  });

  it("targets must be lamps", () => {
    const p = base();
    p["target"] = ["j1"];
    const r = validatePuzzle(p);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join("\n")).toMatch(/target: j1 is a junction/);
  });

  it("at least one feed", () => {
    const p = base();
    (p["nodes"] as { type: string }[]).find((n) => n.type === "feed")!.type = "junction";
    const r = validatePuzzle(p);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join("\n")).toMatch(/at least one feed/);
  });

  it("line endpoints must be nodes", () => {
    const p = base();
    (p["lines"] as unknown[]).push({ id: "bad", from: "nowhere", to: "t1" });
    expect(validatePuzzle(p).ok).toBe(false);
  });

  it("a battery needs a capacity, an input line that touches it, and a far side", () => {
    const p = base();
    p["version"] = 4;
    (p["nodes"] as unknown[]).push({ id: "bat", type: "battery", pos: [3, 3], capacity: 8, input: "l_bat_in" });
    (p["lines"] as unknown[]).push({ id: "l_bat_in", from: "j1", to: "bat" });
    let r = validatePuzzle(p);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join("\n")).toMatch(/needs its input line and at least one far-side line/);
    (p["lines"] as unknown[]).push({ id: "l_bat_out", from: "bat", to: "j4" });
    expect(validatePuzzle(p).ok).toBe(true);
    (p["nodes"] as { id: string; input?: string }[]).find((n) => n.id === "bat")!.input = "l_main";
    r = validatePuzzle(p);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join("\n")).toMatch(/doesn't touch the battery/);
  });

  it("a relay flag must be boolean", () => {
    const p = base();
    (p["nodes"] as { id: string; relay?: unknown }[]).find((n) => n.id === "sw_1")!.relay = "yes";
    expect(validatePuzzle(p).ok).toBe(false);
  });

  it("a spring flag must be boolean; spring and relay together are allowed", () => {
    const p = base();
    const sw = (p["nodes"] as { id: string; spring?: unknown; relay?: unknown }[]).find((n) => n.id === "sw_1")!;
    sw.spring = "yes";
    const r = validatePuzzle(p);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join("\n")).toMatch(/switch sw_1: spring must be true or false/);
    sw.spring = true;
    sw.relay = true;
    expect(validatePuzzle(p).ok).toBe(true);
  });

  it("a timed breaker's schedule (081 TB0): whole seconds 2 to 30, an offset below the cycle, closed where it stands, only on a breaker, a map cycle of 60 s at most", () => {
    type N = { id: string; type: string; closed?: boolean; timer?: unknown };
    const withTimers = (set: (byId: (id: string) => N) => void) => {
      const p = base();
      const nodes = p["nodes"] as N[];
      set((id) => nodes.find((n) => n.id === id)!);
      return validatePuzzle(p);
    };
    const errs = (r: ReturnType<typeof validatePuzzle>): string => (r.ok ? "" : r.errors.join("\n"));
    // Good: an alternating pair (closed 6, open 6, offsets 0 and 6), each node's closed where its timer stands.
    const good = withTimers((n) => {
      n("br_street").timer = { closed: 6, open: 6 };
      n("br_main").timer = { closed: 6, open: 6, offset: 6 };
      n("br_main").closed = false;
    });
    expect(good.ok, errs(good)).toBe(true);
    const bad: [(byId: (id: string) => N) => void, RegExp][] = [
      [(n) => { n("sw_1").timer = { closed: 6, open: 6 }; }, /node sw_1: only a breaker may have a timer/],
      [(n) => { n("br_street").timer = { closed: 2.5, open: 6 }; }, /breaker br_street: timer.closed must be a whole number of seconds from 2 to 30/],
      [(n) => { n("br_street").timer = { closed: 6, open: 31 }; }, /breaker br_street: timer.open must be a whole number of seconds from 2 to 30/],
      [(n) => { n("br_street").timer = { closed: 6, open: 6, offset: 12 }; }, /breaker br_street: timer.offset must be a whole number of seconds from 0 to below 12/],
      [(n) => { n("br_street").timer = { closed: 6, open: 6, offset: 7 }; }, /breaker br_street: closed must be false, where its timer stands at offset 7/],
      // 7 + 6 = 13 and 5 + 6 = 11: the cycle is 143 s.
      [(n) => { n("br_street").timer = { closed: 7, open: 6 }; n("br_main").timer = { closed: 5, open: 6 }; }, /the timers' cycle is 143 s .* at most 60/],
    ];
    for (const [set, re] of bad) {
      const r = withTimers(set);
      expect(r.ok).toBe(false);
      expect(errs(r)).toMatch(re);
    }
  });

  it("a street needs its start, night, satchel and favor", () => {
    const p = base();
    p["scope"] = "street";
    const r = validatePuzzle(p);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join("\n")).toMatch(/street: start/);
  });

  it("loadPuzzle throws with every error listed", () => {
    expect(() => loadPuzzle({})).toThrow(/invalid puzzle/);
  });
});

describe("draft 5: more than one powersource (ticket 015)", () => {
  type N = { id: string; type: string; capacity?: unknown; name?: unknown };
  /** 09-shrine-circuit plus a second feed `south` wired to j1, version 5, each feed with its own capacity. */
  const twoFeeds = () => {
    const p = structuredClone(read("09-shrine-circuit.json")) as Record<string, unknown>;
    p["version"] = 5;
    p["capacity"] = null;
    const nodes = p["nodes"] as N[];
    const feed = nodes.find((n) => n.type === "feed")!;
    feed.capacity = 2;
    feed.name = "North";
    nodes.push({ id: "south", type: "feed", pos: [0, 6], capacity: 2, name: "South" } as N);
    (p["lines"] as unknown[]).push({ id: "l_south", from: "south", to: "j1" });
    return p;
  };
  const errorsOf = (p: unknown) => {
    const r = validatePuzzle(p);
    return r.ok ? "" : r.errors.join("\n");
  };

  it("a well-formed two-feed map validates", () => {
    expect(errorsOf(twoFeeds())).toBe("");
  });

  it("two feeds without a per-feed capacity is an error", () => {
    const p = twoFeeds();
    delete (p["nodes"] as N[]).find((n) => n.id === "south")!.capacity;
    expect(errorsOf(p)).toMatch(/feed south: capacity is required when a map has two or more feeds/);
  });

  it("a feed with capacity null (no limit) beside a limited one is allowed", () => {
    const p = twoFeeds();
    (p["nodes"] as N[]).find((n) => n.id === "south")!.capacity = null;
    expect(errorsOf(p)).toBe("");
  });

  it("a feed capacity must be null or positive", () => {
    const p = twoFeeds();
    (p["nodes"] as N[]).find((n) => n.id === "south")!.capacity = 0;
    expect(errorsOf(p)).toMatch(/feed south: capacity must be null or a positive number/);
  });

  it("more than one feed with version below 5 is an error", () => {
    const p = twoFeeds();
    p["version"] = 4;
    expect(errorsOf(p)).toMatch(/2 feeds need version 5/);
  });

  it("a per-feed capacity with version below 5 is an error, even on a one-feed map", () => {
    const p = structuredClone(read("09-shrine-circuit.json")) as Record<string, unknown>;
    (p["nodes"] as N[]).find((n) => n.type === "feed")!.capacity = 3;
    expect(errorsOf(p)).toMatch(/a feed's own capacity needs version 5/);
    p["version"] = 5;
    expect(errorsOf(p)).toBe("");
  });

  it("a feed name with version below 5 is an error", () => {
    const p = structuredClone(read("09-shrine-circuit.json")) as Record<string, unknown>;
    (p["nodes"] as N[]).find((n) => n.type === "feed")!.name = "North";
    expect(errorsOf(p)).toMatch(/a feed name needs version 5/);
  });

  it("a non-string feed name is an error", () => {
    const p = twoFeeds();
    (p["nodes"] as N[]).find((n) => n.id === "south")!.name = 7;
    expect(errorsOf(p)).toMatch(/feed south: name must be a non-empty string/);
    (p["nodes"] as N[]).find((n) => n.id === "south")!.name = "";
    expect(errorsOf(p)).toMatch(/feed south: name must be a non-empty string/);
  });

  it("two feeds shown under the same name is an error", () => {
    const p = twoFeeds();
    (p["nodes"] as N[]).find((n) => n.id === "south")!.name = "North";
    expect(errorsOf(p)).toMatch(/would both be shown as "North"/);
  });

  it("the top-level capacity must be null on a multi-feed map", () => {
    const p = twoFeeds();
    p["capacity"] = 4;
    expect(errorsOf(p)).toMatch(/capacity \(top level\) must be null/);
  });

  it("puzzleFeeds: one-feed maps give the old capacity, unchanged", { timeout: 60000 }, () => {
    for (const f of files) {
      const r = validatePuzzle(read(f));
      if (!r.ok) continue;
      const feeds = puzzleFeeds(r.puzzle);
      const feedNodes = (read(f) as { nodes: N[] }).nodes.filter((n) => n.type === "feed");
      if (feedNodes.length > 1) continue; // multi-feed maps: see the built two-feed cases
      expect(feeds, f).toHaveLength(1);
      expect(feeds[0]!.capacity, f).toBe(r.puzzle.capacity);
    }
  });

  it("puzzleFeeds: per-feed capacity and names, in file order; the id stands in for a missing name", () => {
    const p = twoFeeds();
    const north = (p["nodes"] as N[]).find((n) => n.type === "feed")!;
    delete north.name;
    north.id = "north_feed";
    (p["nodes"] as N[]).find((n) => n.id === "south")!.capacity = 3; // a different capacity, so a shared one would show
    for (const l of p["lines"] as { from: string; to: string }[]) {
      if (l.from === "feed") l.from = "north_feed";
      if (l.to === "feed") l.to = "north_feed";
    }
    const puzzle = loadPuzzle(p);
    expect(puzzleFeeds(puzzle)).toEqual([
      { id: "north_feed", name: "north feed", capacity: 2 },
      { id: "south", name: "South", capacity: 3 },
    ]);
  });

  it("puzzleFeeds: a one-feed draft-5 map's own capacity overrides the top level", () => {
    const p = structuredClone(read("09-shrine-circuit.json")) as Record<string, unknown>;
    p["version"] = 5;
    (p["nodes"] as N[]).find((n) => n.type === "feed")!.capacity = null;
    expect(puzzleFeeds(loadPuzzle(p))[0]!.capacity).toBeNull();
  });
});

describe("city puzzles (081 C1)", () => {
  const P1 = "pole:s_a:lo:4.00", P2 = "pole:s_a:lo:12.00", P3 = "pole:s_b:hi:3.50";
  const S1 = `span:${P1}~${P2}`, S2 = `span:${P2}~${P3}`;
  /** Feed, breaker, lamp on a building: a two-span line round a carrier pole, then a drop; a damaged cable on its second span. */
  const good = () => ({
    id: "c-test", name: "City test", version: 3, scope: "map", capacity: 2, startingParts: ["wire"], target: ["house"],
    from: "09-shrine-circuit",
    city: { blocksX: 6, blocksZ: 6, seed: 1, oneWay: true },
    district: ["b_1_1", "b_1_2"],
    nodes: [
      { id: "feed", type: "feed", place: { pole: P1 } },
      { id: "br", type: "breaker", closed: false, place: { pole: P2 } },
      { id: "house", type: "lamp", load: 1, place: { building: "bld_7" } },
    ] as Record<string, unknown>[],
    lines: [
      { id: "l1", from: "feed", to: "br", run: { spans: [S1] } },
      { id: "l2", from: "br", to: "house", run: { spans: [S2], drop: "bld_7" } },
    ] as Record<string, unknown>[],
    faults: [{ id: "f1", at: "l2", kind: "damaged-cable", span: S2 }] as Record<string, unknown>[],
  });
  const errorsOf = (p: unknown) => {
    const r = validateCityPuzzle(p);
    return r.ok ? [] : r.errors;
  };

  it("a well-formed city puzzle validates", () => {
    expect(errorsOf(good())).toEqual([]);
  });

  it("city, district and scope: each problem has its own message", () => {
    const p = { ...good(), scope: "street", city: { blocksX: 0, blocksZ: 6, seed: 1, oneWay: "yes" }, district: ["b_1_1", "b_1_1"] };
    const e = errorsOf(p).join("\n");
    for (const m of [/scope must be "map"/, /city.blocksX/, /city.oneWay/, /district: a block id is listed twice/]) expect(e).toMatch(m);
    expect(errorsOf({ ...good(), district: ["a", "b", "c", "d", "e"] }).join("\n")).toMatch(/district must be 1 to 4/);
  });

  it("nodes: a place of exactly one kind and no pos; the schematic checks still run", () => {
    const p = good();
    p.nodes[0] = { id: "feed", type: "feed", pos: [0, 0], place: { pole: P1, building: "bld_7" } };
    p.nodes[1] = { id: "br", type: "breaker", place: { pole: P2 } };
    const e = errorsOf(p).join("\n");
    for (const m of [/node feed: a city node has a place, not a pos/, /node feed: place must be exactly one/, /breaker br: closed/]) expect(e).toMatch(m);
  });

  it("runs and fault spans: a missing run, both ends, an empty run, a span off its line or off a cable", () => {
    const p = good();
    p.lines[0] = { id: "l1", from: "feed", to: "br" };
    p.lines[1] = { id: "l2", from: "br", to: "house", run: { spans: [], drop: "bld_7", lead: S1 } };
    p.lines.push({ id: "l3", from: "br", to: "house", run: { spans: [] } });
    p.faults[0] = { id: "f1", at: "l2", kind: "damaged-cable", span: S1 };
    p.faults.push({ id: "f2", at: "house", kind: "dead-lamp", span: S2 });
    const e = errorsOf(p).join("\n");
    for (const m of [/line l1: run must be/, /line l2: run has both a drop and a lead/, /line l3: run.spans is empty/, /fault f1: span ".*" is not in line l2's run/, /fault f2: span is only for a damaged-cable/])
      expect(e).toMatch(m);
  });

  it("loadCityPuzzle throws with every message listed", () => {
    expect(loadCityPuzzle(good()).district).toEqual(["b_1_1", "b_1_2"]);
    expect(() => loadCityPuzzle({ ...good(), scope: "street", district: [] })).toThrow(/invalid city puzzle:[\s\S]*scope[\s\S]*district/);
  });

  it("loadPuzzle still refuses the city shape", () => {
    expect(() => loadPuzzle(good())).toThrow(/node feed: pos must be \[x, y\]/);
  });

  it("guide (084 A1): a valid guide loads; an unknown at, a two-key until and a throw on a lamp are one message each", () => {
    const steps = [
      { at: "br", text: "Throw the breaker.", until: { throw: "br" } },
      { at: "house", text: "Building 1 is lit.", until: { lit: "house" } },
    ];
    expect(errorsOf({ ...good(), guide: steps })).toEqual([]);
    const bad = [
      ...steps,
      { at: "nowhere", text: "Look here.", until: { next: true } },
      { at: null, text: "Two waits.", until: { next: true, complete: true } },
      { at: "house", text: "Throw the lamp.", until: { throw: "house" } },
    ];
    expect(errorsOf({ ...good(), guide: bad })).toEqual([
      'guide step 3: at "nowhere" is not null or a node or line id',
      "guide step 4: until must have exactly one key: next, throw, repair, lit, complete",
      'guide step 5: until.throw "house" is not a breaker without a timer, or a switch',
    ]);
  });

  it("tips (084 T1): a valid box loads; an extra key, an empty title and a fifth line are one message each", () => {
    const tips = { title: "New: the breaker", lines: ["The priests want Building 1 lit.", "Click a breaker to close it."] };
    expect(errorsOf({ ...good(), tips })).toEqual([]);
    expect(errorsOf({ ...good(), tips: { ...tips, title: "", lines: [...tips.lines, "c", "d", "e"], extra: 1 } })).toEqual([
      "tips: must have exactly the keys title, lines",
      "tips: title must be a non-empty string of at most 40 characters",
      "tips: lines must be a list of 1 to 4 strings",
    ]);
  });
});
