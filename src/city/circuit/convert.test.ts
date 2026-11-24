/**
 * Ticket 081 K2c: a city puzzle laid on the circuit (CK12 to CK15). The fixture is `city-two-ways-round` written as a city puzzle on 6 x 6 seed 1, one-way on, with its corner junctions turned into carriers (answer 5);
 * each rule fails on that fixture with one thing changed (test policy rule 2).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { loadCityPuzzle, loadPuzzle, parseCheckBlock, validateCheck, type CityPlan, type CityPuzzle } from "../../core";
import { runCheck } from "../../../tools/checkrun";
import { runCity } from "../stages";
import { stagesOfProfile } from "../testing/namedcities";
import { convertCityPuzzle, CityPuzzleError } from "./convert";
import { cityPuzzleProblems, districtProblems, runProblems } from "./checkpuzzle";

const ROOT = join(__dirname, "..", "..", "..");
let plan: CityPlan;
let puzzle: CityPuzzle;

beforeAll(() => {
  const upto = stagesOfProfile("facades", "on");
  const r = runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, "circuit", upto.slice(0, upto.findIndex((d) => d.name === "circuit") + 1));
  if (!r.ok) throw new Error(r.failure.reason);
  plan = r.plan;
  puzzle = loadCityPuzzle(JSON.parse(readFileSync(join(__dirname, "fixtures", "city-two-ways-round.city.json"), "utf8")));
}, 60_000);

const layer = () => plan.layers.circuit!;
const blocks = () => plan.layers.streets!.blocks;
const withLines = (f: (lines: CityPuzzle["lines"]) => CityPuzzle["lines"]): CityPuzzle => ({ ...puzzle, lines: f(puzzle.lines) });
const line = (id: string) => puzzle.lines.find((l) => l.id === id)!;

describe("a city puzzle on the circuit (081 K2c)", () => {
  it("CK13 as changed: a run that goes along, round corners on carriers and on is valid, and the whole fixture holds", () => {
    expect(line("l_n").run.spans.length).toBe(13);
    expect(runProblems(puzzle, layer())).toEqual([]);
    expect(cityPuzzleProblems(puzzle, plan)).toEqual([]);
  });

  it("CK13: a run with a span missing from its chain fails at the gap", () => {
    const gap = withLines((ls) => ls.map((l) => (l.id === "l_s" ? { ...l, run: { spans: l.run.spans.slice(1) } } : l)));
    const found = runProblems(gap, layer());
    expect(found.some((p) => p.rule === "CK13" && p.id === "l_s" && p.reason.includes("does not join"))).toBe(true);
  });

  it("CK13: two lines on one span, and a carrier that holds a node, fail", () => {
    const twice = withLines((ls) => [...ls, { id: "l_dup", from: "sw", to: "j_h", run: line("l_s").run }]);
    expect(runProblems(twice, layer()).some((p) => p.id === "l_dup" && p.reason.includes("shares"))).toBe(true);
    const onCarrier: CityPuzzle = { ...puzzle, nodes: [...puzzle.nodes, { id: "j_extra", type: "junction", place: { pole: "pole:z:6:hi:254.17" } }] };
    expect(runProblems(onCarrier, layer()).some((p) => p.id === "l_s" && p.reason.includes("holds node j_extra"))).toBe(true);
    const ends = puzzle.lines.find((l) => l.run.drop !== undefined)!;
    const lastPole = layer().drops.find((d) => d.id === `drop:${ends.run.drop}`)!.pole;
    const atDrop: CityPuzzle = { ...puzzle, nodes: [...puzzle.nodes, { id: "j_end", type: "junction", place: { pole: lastPole } }] };
    expect(runProblems(atDrop, layer()).some((p) => p.id === ends.id && p.reason.includes("holds node j_end"))).toBe(true);
  });

  it("CK14: a district of blocks that do not touch fails", () => {
    const near = new Set(Object.values(blocks().find((b) => b.id === "block:6:6")!.sides).flatMap((s) => s.across.map((a) => a.block)));
    const away = blocks().find((b) => b.id !== "block:6:6" && !near.has(b.id))!.id;
    const far = { ...puzzle, district: ["block:6:6", away] };
    expect(districtProblems(far, layer(), blocks()).some((p) => p.rule === "CK14" && p.id === "district")).toBe(true);
    expect(districtProblems(puzzle, layer(), blocks())).toEqual([]);
  });

  it("CK14: a pole line that runs on past the district's edge fails", () => {
    const outside = "pole:x:7:lo:242.50";
    const long = {
      ...puzzle,
      nodes: puzzle.nodes.map((n) => (n.id === "feed" ? { ...n, place: { pole: outside } } : n)),
      lines: puzzle.lines.map((l) => (l.id === "l_feed" ? { ...l, run: { spans: [`span:${outside}~pole:z:6:lo:242.50`, ...l.run.spans] } } : l)),
    };
    const found = districtProblems(long, layer(), blocks());
    expect(found.some((p) => p.rule === "CK14" && p.id === "l_feed" && p.reason.includes("wholly past"))).toBe(true);
  });

  it("CK15 steps 1 to 6: the output passes validatePuzzle with the file's ids, none added, and each pos is its place's metres over CELL_M", () => {
    const c = convertCityPuzzle(puzzle, plan);
    expect(loadPuzzle(c.puzzle).id).toBe("city-two-ways-round");
    expect(c.puzzle.nodes.map((n) => n.id)).toEqual(puzzle.nodes.map((n) => n.id));
    expect(c.puzzle.lines.map((l) => l.id)).toEqual(puzzle.lines.map((l) => l.id));
    expect(c.puzzle.faults.map((f) => f.id)).toEqual(["x", "y"]);
    expect(c.origin_m).toEqual({ x_m: 245, z_m: 210 });
    const pos = (id: string) => c.puzzle.nodes.find((n) => n.id === id)!.pos;
    const at = (x: number, z: number, id: string) => {
      expect(Math.abs(pos(id)[0] - (x - 245) / 5)).toBeLessThan(1e-4);
      expect(Math.abs(pos(id)[1] - (z - 210) / 5)).toBeLessThan(1e-4);
    };
    at(249.25, 242.5, "feed");
    at(265.75, 264.3333, "j_h");
    at(270, 262.5, "homes");
    at(292.5, 315, "infirmary");
  });

  it("CK15: the cut spans, the places and the scenery go beside the puzzle, and a node's id never moves", () => {
    const c = convertCityPuzzle(puzzle, plan);
    expect(c.cuts["y"]).toBe(line("l_e2").run.spans[0]);
    expect(c.cuts["x"]).toBe(line("l_x").run.spans.at(-1));
    expect(c.runs["l_n"]).toEqual(line("l_n").run);
    expect(c.places["shrine"]).toEqual({ building: "block:6:6/a|outer|+x|67,54" });
    expect(c.puzzle.decor!.length).toBeGreaterThan(8);
    expect(c.puzzle.decor!.every((d) => d.path.length === 2)).toBe(true);
  });

  it("plays the same: the converted puzzle's check block replays as the schematic's does", () => {
    const md = readFileSync(join(ROOT, "puzzles", "city-two-ways-round.md"), "utf8");
    const parsed = parseCheckBlock(md);
    expect(parsed?.ok).toBe(true);
    const schematic = loadPuzzle(JSON.parse(readFileSync(join(ROOT, "puzzles", "city-two-ways-round.json"), "utf8")));
    const converted = convertCityPuzzle(puzzle, plan).puzzle;
    const reports = [schematic, converted].map((p) => {
      const v = validateCheck((parsed as { json: unknown }).json, p);
      if (!v.ok) throw new Error(v.errors.join("; "));
      return runCheck(p, v.check);
    });
    expect(reports[0]!.ok).toBe(true);
    expect(reports[1]).toEqual(reports[0]);
  });

  it("a problem names the line and the CK rule, and the conversion refuses a puzzle that has one", () => {
    const bad = withLines((ls) => ls.map((l) => (l.id === "l_x" ? { ...l, run: { spans: l.run.spans.slice(0, -1) } } : l)));
    const found = cityPuzzleProblems(bad, plan);
    expect(found.some((p) => p.rule === "CK13" && p.id === "l_x")).toBe(true);
    expect(() => convertCityPuzzle(bad, plan)).toThrow(CityPuzzleError);
  });

  it("src/city/circuit/ never imports src/grid/, except in tests", () => {
    const { readdirSync } = require("node:fs") as typeof import("node:fs");
    const files = readdirSync(__dirname).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    for (const f of files) expect(readFileSync(join(__dirname, f), "utf8"), f).not.toMatch(/from\s+["'][^"']*\/grid(\/|["'])/);
  });
});
