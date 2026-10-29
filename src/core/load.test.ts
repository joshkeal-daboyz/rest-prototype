import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadPuzzle, puzzleFeeds, validatePuzzle } from "./load";

const PUZZLES = join(__dirname, "..", "..", "puzzles");
const files = readdirSync(PUZZLES).filter((f) => f.endsWith(".json"));
const read = (f: string) => JSON.parse(readFileSync(join(PUZZLES, f), "utf8")) as unknown;

describe("every puzzle file in puzzles/ validates", () => {
  for (const f of files) {
    it(f, () => {
      const r = validatePuzzle(read(f));
      expect(r.ok, r.ok ? "" : r.errors.join("\n")).toBe(true);
    });
  }
});

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

  it("puzzleFeeds: one-feed maps give the old capacity, unchanged", () => {
    for (const f of files) {
      const r = validatePuzzle(read(f));
      if (!r.ok) continue;
      const feeds = puzzleFeeds(r.puzzle);
      const feedNodes = (read(f) as { nodes: N[] }).nodes.filter((n) => n.type === "feed");
      if (feedNodes.length > 1) continue; // multi-feed maps: see the next test
      expect(feeds, f).toHaveLength(1);
      expect(feeds[0]!.capacity, f).toBe(r.puzzle.capacity);
    }
  });

  it("puzzleFeeds: multi-feed maps give one entry per feed node, with its own capacity", () => {
    let seen = 0;
    for (const f of files) {
      const r = validatePuzzle(read(f));
      if (!r.ok) continue;
      const feedNodes = (read(f) as { nodes: N[] }).nodes.filter((n) => n.type === "feed");
      if (feedNodes.length < 2) continue;
      seen++;
      const feeds = puzzleFeeds(r.puzzle);
      expect(feeds.map((x) => x.id), f).toEqual(feedNodes.map((n) => n.id));
      expect(feeds.map((x) => x.capacity), f).toEqual(feedNodes.map((n) => n.capacity ?? null));
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("puzzleFeeds: per-feed capacity and names, in file order; the id stands in for a missing name", () => {
    const p = twoFeeds();
    const north = (p["nodes"] as N[]).find((n) => n.type === "feed")!;
    delete north.name;
    north.id = "north_feed";
    for (const l of p["lines"] as { from: string; to: string }[]) {
      if (l.from === "feed") l.from = "north_feed";
      if (l.to === "feed") l.to = "north_feed";
    }
    const puzzle = loadPuzzle(p);
    expect(puzzleFeeds(puzzle)).toEqual([
      { id: "north_feed", name: "north feed", capacity: 2 },
      { id: "south", name: "South", capacity: 2 },
    ]);
  });

  it("puzzleFeeds: a one-feed draft-5 map's own capacity overrides the top level", () => {
    const p = structuredClone(read("09-shrine-circuit.json")) as Record<string, unknown>;
    p["version"] = 5;
    (p["nodes"] as N[]).find((n) => n.type === "feed")!.capacity = null;
    expect(puzzleFeeds(loadPuzzle(p))[0]!.capacity).toBeNull();
  });
});
