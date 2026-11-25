import { describe, expect, it } from "vitest";
import shrine from "../../puzzles/09-shrine-circuit.json";
import { collectCityMaps } from "./maps";

/** A small city puzzle in C1's shape (a feed, a breaker, a lamp on a building; a damaged cable). In-test, so the picker tests need no real city file. */
const P1 = "pole:s_a:lo:4.00", P2 = "pole:s_a:lo:12.00", P3 = "pole:s_b:hi:3.50";
const S1 = `span:${P1}~${P2}`, S2 = `span:${P2}~${P3}`;
const cityFile = (id: string, name: string) => ({
  id, name, version: 3, scope: "map", capacity: 2, startingParts: ["wire"], target: ["house"],
  from: "09-shrine-circuit",
  city: { blocksX: 6, blocksZ: 6, seed: 1, oneWay: true },
  district: ["b_1_1", "b_1_2"],
  nodes: [
    { id: "feed", type: "feed", place: { pole: P1 } },
    { id: "br", type: "breaker", closed: false, place: { pole: P2 } },
    { id: "house", type: "lamp", load: 1, place: { building: "bld_7" } },
  ],
  lines: [
    { id: "l1", from: "feed", to: "br", run: { spans: [S1] } },
    { id: "l2", from: "br", to: "house", run: { spans: [S2], drop: "bld_7" } },
  ],
  faults: [{ id: "f1", at: "l2", kind: "damaged-cable", span: S2 }],
});

describe("collectCityMaps (081 U1)", () => {
  it("lists only city files: a schematic sharing the city file's id is left out, with no problem", () => {
    const { entries, problems } = collectCityMaps({
      "../puzzles/09-shrine-circuit.json": shrine,
      "../puzzles/city/09-shrine-circuit.city.json": cityFile("09-shrine-circuit", "Shrine, city"),
    });
    expect(problems).toEqual([]);
    expect(entries.map((m) => [m.key, m.locked, m.from])).toEqual([["09-shrine-circuit", false, "09-shrine-circuit"]]);
  });

  it("reports a bad city file and a repeated key as one line each, and keeps the valid entries", () => {
    const { entries, problems } = collectCityMaps({
      "../puzzles/city/a.city.json": cityFile("c-a", "A"),
      "../puzzles/city/b.city.json": cityFile("c-a", "B"),
      "../puzzles/city/broken.city.json": { ...cityFile("c-broken", "Broken"), scope: "street" },
    });
    expect(entries.map((m) => m.key)).toEqual(["c-a"]);
    // Problems come in path order: b.city.json (the repeat) before broken.city.json.
    expect(problems).toHaveLength(2);
    expect(problems[0]).toBe("../puzzles/city/b.city.json: duplicate map key c-a");
    expect(problems[1]).toMatch(/^\.\.\/puzzles\/city\/broken\.city\.json: .*scope/);
  });

  it("lists open city maps first, locked ones after, each in path order, under their own names", () => {
    const { entries } = collectCityMaps({
      "../puzzles/city/locked/01-old.city.json": cityFile("01-old", "Old, locked"),
      "../puzzles/city/02-b.city.json": cityFile("02-b", "Second"),
      "../puzzles/city/01-a.city.json": cityFile("01-a", "First"),
    });
    expect(entries.map((m) => [m.key, m.locked, m.name])).toEqual([
      ["01-a", false, "First"],
      ["02-b", false, "Second"],
      ["locked/01-old", true, "Old, locked"],
    ]);
  });
});
