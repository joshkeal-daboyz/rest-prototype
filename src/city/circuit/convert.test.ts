/**
 * Ticket 081 K2c: a city puzzle laid on the circuit (CK12 to CK15). The fixture is `city-two-ways-round` written as a city puzzle on 6 x 6 seed 1, one-way on, with its corner junctions turned into carriers (answer 5);
 * each rule fails on that fixture with one thing changed (test policy rule 2).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { EventBus, loadCityPuzzle, loadPuzzle, parseCheckBlock, validateCheck, type CityPlan, type CityPuzzle, type GridNode } from "../../core";
import { createGrid } from "../../grid";
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
  puzzle = loadCityPuzzle(JSON.parse(readFileSync(join(ROOT, "puzzles", "city", "city-two-ways-round.city.json"), "utf8")));
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
    const home = line("l_homes");
    const start = "pole:z:6:hi:264.33";
    const step = layer().spans.find((s) => (s.a === start || s.b === start))!;
    const lastPole = step.a === start ? step.b : step.a;
    const moved = { ...layer(), drops: layer().drops.map((d) => (d.id === `drop:${home.run.drop}` ? { ...d, pole: lastPole } : d)) };
    const atDrop: CityPuzzle = {
      ...puzzle,
      nodes: [...puzzle.nodes, { id: "j_end", type: "junction", place: { pole: lastPole } }],
      lines: puzzle.lines.map((l) => (l.id === home.id ? { ...l, run: { ...l.run, spans: [step.id] } } : l)),
    };
    expect(runProblems(atDrop, moved).some((p) => p.id === home.id && p.reason.includes("holds node j_end"))).toBe(true);
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

  it("CK15 steps 1 to 6, 081 S1: the output passes validatePuzzle, every file id stays with its type, load and rating, the ids that are not the file's are exactly hidden, and each pos is its place's metres over CELL_M", () => {
    const c = convertCityPuzzle(puzzle, plan);
    expect(loadPuzzle(c.puzzle).id).toBe("city-two-ways-round");
    type Loose = { type: string; load?: number; rating?: number; capacity?: number };
    const traits = (n: Loose) => [n.type, n.load, n.rating, n.capacity];
    for (const n of puzzle.nodes) expect(traits(c.puzzle.nodes.find((o) => o.id === n.id) as Loose)).toEqual(traits(n as Loose));
    for (const l of puzzle.lines) expect(c.puzzle.lines.some((o) => o.id === l.id)).toBe(true);
    const file = new Set([...puzzle.nodes.map((n) => n.id), ...puzzle.lines.map((l) => l.id)]);
    const added = [...c.puzzle.nodes.map((n) => n.id), ...c.puzzle.lines.map((l) => l.id)].filter((id) => !file.has(id));
    expect([...c.hidden!].sort()).toEqual(added.sort());
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

  it("plays the same, raised (081 S1): P0 hangs 22 scenery buildings, and its check block replays as the schematic's does but for the feed's load, 2 + 22 of 25", () => {
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
    expect(Object.keys(convertCityPuzzle(puzzle, plan).scenery!).length).toBe(22);
    const strip = (r: (typeof reports)[number]) => ({ ...r!, solution: { ...r!.solution, feeds: [] } });
    expect(strip(reports[1]!)).toEqual(strip(reports[0]!));
    expect(reports[1]!.solution.feeds).toEqual([{ id: "feed", load: 24, capacity: 25 }]);
  });

  it("081 S1 rule 2: every line splits into L~a, L and L~b with the hidden junctions at 1/3 and 2/3, the switch's outputs name the ~a segments, and places and runs keep the file's ids", () => {
    const c = convertCityPuzzle(puzzle, plan);
    const ln = (id: string) => c.puzzle.lines.find((l) => l.id === id)!;
    const nd = (id: string) => c.puzzle.nodes.find((n) => n.id === id)!;
    expect([ln("l_s~a"), ln("l_s"), ln("l_s~b")].map((l) => [l.from, l.to])).toEqual([["sw", "l_s~h1"], ["l_s~h1", "l_s~h2"], ["l_s~h2", "j_h"]]);
    expect((nd("sw") as unknown as { outputs: string[] }).outputs).toEqual(["l_s~a", "l_n~a"]);
    const [a, b, h1, h2] = [nd("sw").pos, nd("j_h").pos, nd("l_s~h1").pos, nd("l_s~h2").pos];
    for (const [h, t] of [[h1, 1 / 3], [h2, 2 / 3]] as const) {
      expect(Math.abs(h[0] - (a[0] + (b[0] - a[0]) * t))).toBeLessThan(1e-3);
      expect(Math.abs(h[1] - (a[1] + (b[1] - a[1]) * t))).toBeLessThan(1e-3);
    }
    expect(Object.keys(c.places).sort()).toEqual(puzzle.nodes.map((n) => n.id).sort());
    expect(Object.keys(c.runs).sort()).toEqual(puzzle.lines.map((l) => l.id).sort());
    expect(c.hidden!.length).toBe(4 * puzzle.lines.length + 2 * new Set(Object.values(c.scenery!)).size);
  });

  it("081 S1 rule 3 and the Decided \"current up to a sparking break\": carriers before a cut hang on ~h1 and are lit; those past it hang on ~h2 and stay dark", () => {
    const l = line("l_n");
    const lampBuildings = new Set(puzzle.nodes.flatMap((n) => ("building" in n.place ? [n.place.building] : [])));
    let cur = "pole:z:6:hi:242.50";
    const carriers = l.run.spans
      .slice(0, -1)
      .map((sid, m) => {
        const s = layer().spans.find((x) => x.id === sid)!;
        cur = cur === s.a ? s.b : s.a;
        const pole = cur;
        return { m, building: layer().drops.find((d) => d.pole === pole && !lampBuildings.has(d.building))?.building };
      })
      .filter((c) => c.building !== undefined);
    expect(carriers.length).toBeGreaterThanOrEqual(3);
    const cutFault = { id: "z", at: "l_n", kind: "damaged-cable" as const, span: l.run.spans[carriers[1]!.m]! };
    const c = convertCityPuzzle({ ...puzzle, faults: [...puzzle.faults, cutFault] }, plan);
    expect(carriers.slice(0, 3).map((x) => c.scenery![x.building!])).toEqual(["l_n~h1~s", "l_n~h2~s", "l_n~h2~s"]);
    const grid = createGrid(c.puzzle, new EventBus());
    grid.throwSwitch("sw");
    grid.advance(2);
    expect(grid.state().lit.has("l_n~h1~s")).toBe(true);
    expect(grid.state().lit.has("l_n~h2~s")).toBe(false);
  });

  it("081 S1 rule 3 and the Decided \"Fuse rating: over it, blows on power\": a building hangs on a junction, on a switch's input line, and on a fusebox, where it counts toward the rating", () => {
    const lampBuildings = new Set(puzzle.nodes.flatMap((n) => ("building" in n.place ? [n.place.building] : [])));
    const at = (pole: string) => layer().drops.filter((d) => d.pole === pole && !lampBuildings.has(d.building)).map((d) => d.building);
    const polePlace = (id: string) => (puzzle.nodes.find((n) => n.id === id)!.place as { pole: string }).pole;
    const fuse: CityPuzzle = { ...puzzle, nodes: puzzle.nodes.map((n) => (n.id === "j_sh" ? ({ id: "j_sh", type: "fusebox", rating: 1, place: n.place } as CityPuzzle["nodes"][number]) : n)) };
    const c = convertCityPuzzle(fuse, plan);
    expect(at(polePlace("j_inf")).map((b) => c.scenery![b])).toEqual(["j_inf~s"]);
    expect(at(polePlace("sw")).map((b) => c.scenery![b])).toEqual(["l_feed~h2~s"]);
    expect(at(polePlace("j_sh")).map((b) => c.scenery![b])).toEqual(["j_sh~s"]);
    const grid = createGrid(c.puzzle, new EventBus());
    grid.throwSwitch("sw");
    grid.advance(2);
    expect(grid.state().faults.some((f) => f.kind === "blown-fuse" && f.at === "j_sh")).toBe(true);
  });

  it("081 S1 rule 1: the feed's pole (Dark), a job lamp's building and a drop on a pole no line uses stay out of scenery", () => {
    const jobPoles = new Set<string>(puzzle.nodes.flatMap((n) => ("pole" in n.place ? [n.place.pole] : [])));
    for (const l of puzzle.lines) for (const sid of l.run.spans) for (const p of sid.slice(5).split("~")) jobPoles.add(p);
    const stray = layer().drops.find((d) => !jobPoles.has(d.pole))!;
    const feedDrop = { ...stray, id: "drop:feed-neighbour", building: "feed-neighbour", pole: "pole:z:6:lo:242.50" };
    const plan2 = { ...plan, layers: { ...plan.layers, circuit: { ...layer(), drops: [...layer().drops, feedDrop] } } } as CityPlan;
    const got = convertCityPuzzle(puzzle, plan2).scenery!;
    expect(Object.keys(got).length).toBe(22);
    expect(got[feedDrop.building]).toBeUndefined();
    expect(got[stray.building]).toBeUndefined();
    expect(got["block:6:6/a|outer|+x|67,54"]).toBeUndefined();
  });

  it("081 S1 rules 4 and 5: a hidden lamp is a leaf and never a target, one live scenery building browns the feed out at the file lamps' capacity, and raised by 1 the win completes", () => {
    const only = {
      ...puzzle,
      capacity: 1,
      target: undefined,
      nodes: puzzle.nodes.filter((n) => ["feed", "sw", "j_h", "homes"].includes(n.id)).map((n) => (n.id === "sw" ? { id: "sw", type: "junction", place: n.place } : n)),
      lines: puzzle.lines.filter((l) => ["l_feed", "l_s", "l_homes"].includes(l.id)),
      faults: [],
    } as unknown as CityPuzzle;
    const play = (p: CityPuzzle) => {
      const c = convertCityPuzzle(p, plan);
      const grid = createGrid(c.puzzle, new EventBus());
      grid.advance(2);
      return { c, state: grid.state() };
    };
    const tight = play(only);
    expect(tight.c.puzzle.target).toEqual(["homes"]);
    expect(Object.values(tight.c.scenery!)).toEqual(["sw~s"]);
    expect(tight.c.puzzle.nodes.find((n: GridNode) => n.id === "sw~s")!.type).toBe("lamp");
    expect(tight.state.brownout).toBe(true);
    const raised = play({ ...only, capacity: 2 });
    expect(raised.state.brownout).toBe(false);
    expect(raised.state.complete).toBe(true);
    expect(raised.state.lit.has("sw~s")).toBe(true);
  });

  it("a problem names the line and the CK rule, and the conversion refuses a puzzle that has one", () => {
    const bad = withLines((ls) => ls.map((l) => (l.id === "l_x" ? { ...l, run: { spans: l.run.spans.slice(0, -1) } } : l)));
    const found = cityPuzzleProblems(bad, plan);
    expect(found.some((p) => p.rule === "CK13" && p.id === "l_x")).toBe(true);
    expect(() => convertCityPuzzle(bad, plan)).toThrow(CityPuzzleError);
  });

  it("084 A1b: a city file with a guide and a tips box converts, and the plain map has neither key", () => {
    const guided = {
      ...puzzle,
      guide: [{ at: null, text: "Look at the feed.", until: { next: true } }, { at: null, text: "Throw it.", until: { complete: true } }],
      tips: { title: "Your first job", lines: ["Get power to Building 1."] },
    } as CityPuzzle;
    const out = convertCityPuzzle(guided, plan).puzzle as unknown as Record<string, unknown>;
    expect("guide" in out).toBe(false);
    expect("tips" in out).toBe(false);
  });

  it("src/city/circuit/ never imports src/grid/, except in tests", () => {
    const { readdirSync } = require("node:fs") as typeof import("node:fs");
    const files = readdirSync(__dirname).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    for (const f of files) expect(readFileSync(join(__dirname, f), "utf8"), f).not.toMatch(/from\s+["'][^"']*\/grid(\/|["'])/);
  });
});
