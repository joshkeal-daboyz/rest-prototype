/**
 * Ticket 081 P1: the fit tool, the mid-row clearance check, the raised numbers and the sweep over puzzles/city/. One city (6 x 6 seed 1, one-way on, through stage 7) built once through the module cache.
 * A rule fails on a fixture with one thing changed (test policy rule 2); the sweep is the one place the city puzzles' play is held (criterion 7).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { loadCityPuzzle, parseCheckBlock, validateCityPuzzle, validatePuzzle } from "../src/core";
import type { CityPlan, CityPuzzle, CityPuzzleCity, Puzzle } from "../src/core";
import { convertCityPuzzle } from "../src/city/circuit/convert";
import { cityPuzzleProblems } from "../src/city/circuit/checkpuzzle";
import { DEFAULT, sharedCity } from "../src/city/testing/namedcities";
import { PUZZLES_DIR, checkFile } from "./check";
import { replayMoves } from "./checkrun";
import { crossesInPlan, distToSegment } from "../src/city/circuit/roofgeom";
import { FEED_CLEAR_M, FIT_BUDGET, READ_BACK_M, buildingTargetProblems, cityCheckProblems, fitPuzzle, midRowClashes, midRowProblems, raiseForScenery } from "./fit";

const CITY: CityPuzzleCity = { blocksX: 6, blocksZ: 6, seed: 1, oneWay: true };
const ONE_BLOCK = ["block:0:0"];
const P0_FILE = join(PUZZLES_DIR, "city", "city-two-ways-round.city.json");
const P0_WIN = ["sw", "repair:l_e2"];
let plan: CityPlan;

beforeAll(() => {
  const run = sharedCity(DEFAULT, "facades");
  if (!run.ok) throw new Error(run.failure.reason);
  plan = run.plan;
}, 60_000);

/** Five nodes in a chain, with a fuse, a cut cable, one wire and a capacity: feed, breaker (open), junction, fuse box, lamp. */
const CHAIN: Puzzle = {
  id: "chain-5",
  name: "Chain of five",
  version: 5,
  scope: "map",
  capacity: 3,
  startingParts: ["wire"],
  target: ["lamp"],
  nodes: [
    { id: "feed", type: "feed", pos: [0, 0] },
    { id: "br", type: "breaker", pos: [1, 0], closed: false },
    { id: "j", type: "junction", pos: [2, 0] },
    { id: "fb", type: "fusebox", pos: [3, 0], rating: 2 },
    { id: "lamp", type: "lamp", pos: [4, 0], load: 1 },
  ],
  lines: [
    { id: "l1", from: "feed", to: "br" },
    { id: "l2", from: "br", to: "j" },
    { id: "l3", from: "j", to: "fb" },
    { id: "l4", from: "fb", to: "lamp" },
  ],
  faults: [{ id: "cut", at: "l3", kind: "damaged-cable" }],
};
const CHAIN_WIN = ["br", "repair:l3"];

const fit = (p: Puzzle, o: Parameters<typeof fitPuzzle>[3] = {}) => fitPuzzle(p, plan, CITY, { blocks: ONE_BLOCK, ...o });
const loaded = (path: string): CityPuzzle => loadCityPuzzle(JSON.parse(readFileSync(path, "utf8")));

describe("the fit tool (081 P1)", () => {
  it("criterion 1: a 5-node chain fits a district, and its draft validates and converts", () => {
    const r = fit(CHAIN);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(validateCityPuzzle(JSON.parse(JSON.stringify(r.draft))).ok).toBe(true);
    expect(r.draft.from).toBe("chain-5");
    expect(cityPuzzleProblems(r.draft, plan)).toEqual([]);
    expect(() => convertCityPuzzle(r.draft, plan)).not.toThrow();
  });

  it("criterion 2: a miss names the shortfall (more switches than the district has 3-attachment poles) and gives no draft", () => {
    const switches: Puzzle = {
      ...CHAIN,
      nodes: [CHAIN.nodes[0]!, ...Array.from({ length: 60 }, (_, i) => ({ id: `s${i}`, type: "switch" as const, pos: [i, 0] as [number, number], outputs: [`a${i}`, `b${i}`] as [string, string], selected: 0 as const }))],
      lines: [],
      faults: [],
    };
    const r = fit(switches);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/^no fit: switch, needs 60, district has \d+$/);
  });

  it("criterion 3: the fitted draft converts with the schematic's ids, types, loads, ratings, capacity, parts, targets and line endpoints, and only hidden ids added", () => {
    const r = fit(CHAIN);
    if (!r.ok) throw new Error(r.message);
    const c = convertCityPuzzle(r.draft, plan);
    const hidden = new Set(c.hidden);
    const node = (id: string) => ({ ...c.puzzle.nodes.find((n) => n.id === id)!, pos: 0 });
    expect(CHAIN.nodes.map((n) => node(n.id))).toEqual(CHAIN.nodes.map((n) => ({ ...n, pos: 0 })));
    // A line keeps its id and its ends: its first piece `<id>~a` starts at its from node and its last `<id>~b` ends at its to node.
    const line = (id: string) => c.puzzle.lines.find((l) => l.id === id)!;
    expect(CHAIN.lines.map((l) => [l.id, line(`${l.id}~a`).from, line(`${l.id}~b`).to])).toEqual(CHAIN.lines.map((l) => [l.id, l.from, l.to]));
    expect(c.puzzle.lines.filter((l) => !hidden.has(l.id)).map((l) => l.id)).toEqual(CHAIN.lines.map((l) => l.id));
    expect(c.puzzle.nodes.filter((n) => !hidden.has(n.id)).map((n) => n.id)).toEqual(CHAIN.nodes.map((n) => n.id));
    expect(c.puzzle.faults).toEqual(CHAIN.faults);
    expect([c.puzzle.capacity, c.puzzle.startingParts, c.puzzle.target]).toEqual([3, ["wire"], ["lamp"]]);
    expect(hidden.size).toBeGreaterThan(0);
  });

  it("criterion 3 (amended by section S): given the solution, the draft differs from the unraised one only in capacities and ratings", () => {
    const base = fit(CHAIN);
    const raised = fit(CHAIN, { solution: CHAIN_WIN });
    if (!base.ok || !raised.ok) throw new Error("no fit");
    const numbers = (p: CityPuzzle) => ({ ...p, capacity: 0, nodes: p.nodes.map((n) => (n.type === "fusebox" ? { ...n, rating: 0 } : n)) });
    expect(numbers(raised.draft)).toEqual(numbers(base.draft));
    expect(raised.draft.capacity).toBeGreaterThanOrEqual(3);
  });

  it("criterion 4: the same inputs give the same draft", () => {
    expect(JSON.stringify(fit(CHAIN, { solution: CHAIN_WIN }))).toBe(JSON.stringify(fit(CHAIN, { solution: CHAIN_WIN })));
  });

  it("criterion 5: the search stops at its budget and reports gave up (FIT_BUDGET is the default)", () => {
    const r = fit(CHAIN, { budget: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.kind).toBe("gave-up");
      expect(r.message).toMatch(/^gave up after \d+ steps \(FIT_BUDGET 1\)/);
    }
    expect(FIT_BUDGET).toBeGreaterThan(1);
  });
});

describe("buildings are the targets (081 W1)", () => {
  const p0 = (): CityPuzzle => loaded(P0_FILE);
  const p0Win = (p: CityPuzzle) => replayMoves(convertCityPuzzle(p, plan).puzzle, P0_WIN).state;

  it("criterion 1: a lamp on a post fails with the city's message and the same lamp on a building passes", () => {
    const on = p0();
    const post: CityPuzzle = { ...on, nodes: on.nodes.map((n) => (n.id === "shrine" ? { ...n, place: { post: "span:x" } } : n)) } as CityPuzzle;
    expect(buildingTargetProblems(post, plan, undefined, false).map((p) => `${p.rule} ${p.id}: ${p.reason}`)).toEqual(["lamp shrine: a city lamp stands on a building, fed by its drop (Josh, 25 Nov 2026)"]);
    expect(buildingTargetProblems(on, plan, undefined, false)).toEqual([]);
  });

  it("criterion 2a: a run that enters at the far end and comes back towards its feed fails naming the line; read outward it passes", () => {
    const r = fit(CHAIN, { solution: CHAIN_WIN });
    if (!r.ok) throw new Error(r.message);
    const win = replayMoves(CHAIN, CHAIN_WIN).state;
    expect(cityCheckProblems(r.draft, plan, win)).toEqual([]);
    const line = r.draft.lines.find((l) => l.id === "l3")!;
    const backwards = { ...win, flowFrom: new Map([...win.flowFrom, [line.id, line.to]]) };
    const found = buildingTargetProblems(r.draft, plan, backwards).filter((p) => p.rule === "reads-outward");
    expect(found.map((p) => p.id)).toEqual(["l3"]);
    expect(found[0]!.reason).toContain(`at most ${READ_BACK_M} m`);
  });

  it("criterion 2b: a ring line is read from where it takes its power, and the same current on a line not on a cycle fails", () => {
    const on = p0();
    expect(buildingTargetProblems(on, plan, p0Win(on))).toEqual([]);
    const open: CityPuzzle = { ...on, lines: on.lines.filter((l) => l.id !== "l_s") };
    expect(buildingTargetProblems(open, plan, p0Win(on)).filter((p) => p.rule === "reads-outward").map((p) => p.id)).toEqual(["l_e2", "l_x"]);
  });

  it("criterion 3: a roof span over the feed's entering span (sharing no pole) fails, one sharing its pole and ending beyond it passes, and two crossing job spans fail", () => {
    const layer = plan.layers.circuit!;
    const at = new Map<string, { x: number; z: number }>();
    for (const p of layer.poles) at.set(p.id, { x: p.x_m, z: p.z_m });
    for (const r of layer.roofs ?? []) at.set(r.id, { x: r.x_m, z: r.z_m });
    const placeOf = (v: string) => (v.startsWith("roof:") ? { roof: v } : { pole: v });
    // A feed on E.a, its line over the street span E to a junction, and a roof span R as a second line.
    const job = (E: { id: string; a: string; b: string }, R: { id: string; a: string; b: string }, withFeed: boolean): CityPuzzle => ({ nodes: [{ id: "f", type: "feed", place: placeOf(E.a) }, { id: "j", type: "junction", place: placeOf(E.b) }, { id: "k", type: "junction", place: placeOf(R.a) }, { id: "m", type: "junction", place: placeOf(R.b) }], lines: [{ id: "l1", from: withFeed ? "f" : "j", to: withFeed ? "j" : "f", run: { spans: [E.id] } }, { id: "l2", from: "k", to: "m", run: { spans: [R.id] } }] }) as unknown as CityPuzzle;
    const sharing = (layer.roofSpans ?? []).slice(0, 400).flatMap((R) => layer.spans.filter((E) => [E.a, E.b].some((x) => x === R.a || x === R.b)).map((E) => [E, R] as const));
    const outcome = ([E, R]: (typeof sharing)[number]) => buildingTargetProblems(job(E, R, true), plan, undefined).filter((p) => p.rule === "feed-clear").length;
    // P2a's 03: a roof span at least 6 m from the feed's pole that crosses or nears the entering span, sharing no pole with it.
    const apart = (layer.roofSpans ?? []).flatMap((R) => layer.spans.filter((E) => ![E.a, E.b].some((x) => x === R.a || x === R.b) && distToSegment(at.get(E.a)!, at.get(R.a)!, at.get(R.b)!) >= FEED_CLEAR_M && (crossesInPlan(at.get(E.a)!, at.get(E.b)!, at.get(R.a)!, at.get(R.b)!) || distToSegment(at.get(E.b)!, at.get(R.a)!, at.get(R.b)!) < FEED_CLEAR_M)).map((E) => [E, R] as const));
    const near = apart.find((x) => outcome(x) > 0);
    const clear = sharing.find((x) => outcome(x) === 0);
    expect(near, "a roof span over the entering span, sharing no pole with it").toBeDefined();
    expect(clear, "a roof span sharing the entering span's pole and ending beyond the clearance").toBeDefined();
    expect(FEED_CLEAR_M).toBe(6);
    const roofs = (layer.roofSpans ?? []).slice(0, 600);
    let crossing: [(typeof roofs)[number], (typeof roofs)[number]] | undefined;
    for (let i = 0; i < roofs.length && !crossing; i++) for (let j = i + 1; j < roofs.length && !crossing; j++) {
      const a = roofs[i]!;
      const b = roofs[j]!;
      if (![a.a, a.b].some((x) => x === b.a || x === b.b) && crossesInPlan(at.get(a.a)!, at.get(a.b)!, at.get(b.a)!, at.get(b.b)!)) crossing = [a, b];
    }
    expect(crossing, "two roof spans of the city cross in plan").toBeDefined();
    expect(buildingTargetProblems(job(crossing![0], crossing![1], false), plan, undefined).filter((p) => p.rule === "crossing")).toHaveLength(1);
  });

  it("criteria 5 and 6: a fit puts every lamp on a building, its draft passes the rules, and --avoid keeps the district off a named block", () => {
    const two: Puzzle = { ...CHAIN, id: "chain-2", nodes: [...CHAIN.nodes, { id: "lamp2", type: "lamp", pos: [2, 1], load: 1 }], lines: [...CHAIN.lines, { id: "l5", from: "j", to: "lamp2" }] };
    const r = fit(two, { solution: CHAIN_WIN });
    if (!r.ok) throw new Error(r.message);
    expect(r.draft.nodes.filter((n) => n.type === "lamp").map((n) => Object.keys(n.place))).toEqual([["building"], ["building"]]);
    expect(r.draft.lines.every((l) => l.run.lead === undefined)).toBe(true);
    expect(cityCheckProblems(r.draft, plan, replayMoves(two, CHAIN_WIN).state)).toEqual([]);
    const away = fitPuzzle(CHAIN, plan, CITY, { maxBlocks: 1, avoid: ONE_BLOCK });
    if (!away.ok) throw new Error(away.message);
    expect(away.district).not.toContain(ONE_BLOCK[0]);
  });
});

describe("the mid-row clearance check (081 P1, B1b K2 check 11)", () => {
  it("criterion 9: a used mid-row roof structure with a stage 7 roof piece in its keep square fails; a clear one does not", () => {
    const clashes = midRowClashes(plan);
    const blocked = [...clashes].find(([, hits]) => hits.length > 0);
    const clear = [...clashes].find(([, hits]) => hits.length === 0);
    expect(blocked, "the city has a mid-row place under a roof prop").toBeDefined();
    expect(clear).toBeDefined();
    const on = (roof: string): CityPuzzle => ({ nodes: [{ id: "j", type: "junction", place: { roof } }], lines: [] }) as unknown as CityPuzzle;
    expect(midRowProblems(on(blocked![0]), plan).map((p) => [p.rule, p.id])).toEqual([["CK17a", blocked![0]]]);
    expect(midRowProblems(on(clear![0]), plan)).toEqual([]);
  });
});

describe("the raised numbers (081 P1, section S)", () => {
  it("criterion 10: a feed and a rated fuse box are raised by exactly the scenery they carry; scenery on a carrier before the fuse raises the feed only", () => {
    // P0 with its junction j_sh (where l_n arrives) made a fuse box of rating 4, from the schematic's capacity 3.
    const p0 = loaded(P0_FILE);
    const fused: CityPuzzle = { ...p0, nodes: p0.nodes.map((n) => (n.id === "j_sh" ? { id: "j_sh", type: "fusebox", rating: 4, place: n.place } : n)) };
    const raised = raiseForScenery(fused, plan, P0_WIN, { capacity: 3, nodes: [{ id: "j_sh", type: "fusebox", rating: 4 }] });
    // The same solution on the conversion with every number lifted, to read which scenery lamps are lit at the end.
    const conv = convertCityPuzzle(fused, plan);
    const open: Puzzle = { ...conv.puzzle, capacity: null, nodes: conv.puzzle.nodes.map((n) => (n.type === "fusebox" ? { id: n.id, type: n.type, pos: n.pos } : n)) };
    const end = replayMoves(open, P0_WIN).state;
    const load = new Map(conv.puzzle.nodes.map((n) => [n.id, n.type === "lamp" ? (n.load ?? 1) : 0] as const));
    const sum = (ids: string[]) => ids.reduce((t, id) => t + load.get(id)!, 0);
    const lit = [...new Set(Object.values(conv.scenery ?? {}))].filter((id) => end.lit.has(id));
    const before = lit.filter((id) => /^(l_feed|l_n|sw)~/.test(id));
    expect(before.length, "the fixture has scenery on the carriers before the fuse").toBeGreaterThan(0);
    expect(lit.length - before.length, "and scenery past it").toBeGreaterThan(0);
    expect(raised.capacity).toBe(3 + sum(lit));
    expect(raised.nodes.find((n) => n.id === "j_sh")).toMatchObject({ rating: 4 + sum(lit) - sum(before) });
  });

  it("criterion 11: P0's file, raised from its schematic by its note's solution, comes back unchanged", () => {
    const p0 = loaded(P0_FILE);
    const schematic = validatePuzzle(JSON.parse(readFileSync(join(PUZZLES_DIR, "city-two-ways-round.json"), "utf8")));
    const note = parseCheckBlock(readFileSync(P0_FILE.replace(/\.city\.json$/, ".md"), "utf8"));
    if (!schematic.ok || note === null || !note.ok) throw new Error("fixture files");
    const solution = (note.json as { solution: string[] }).solution;
    expect(raiseForScenery(p0, plan, solution, schematic.puzzle)).toEqual(p0);
  });
});

describe("the raise on a timed map (081 TB2)", () => {
  it("a timed map's feed is raised by the largest scenery load at any settle along the solution, not only at its end", () => {
    // P0 with its junction j_inf a timed breaker closed for 2 s of every 6: the solution's second click ends with it open and the infirmary's scenery dark, but the settle just before is the untimed end state.
    const p0 = loaded(P0_FILE);
    const timed: CityPuzzle = { ...p0, nodes: p0.nodes.map((n) => (n.id === "j_inf" ? ({ id: "j_inf", type: "breaker", closed: true, timer: { closed: 2, open: 4 }, place: n.place } as unknown as CityPuzzle["nodes"][number]) : n)) };
    const base = { capacity: 3, nodes: [] };
    const atEnd = raiseForScenery(p0, plan, P0_WIN, base).capacity!;
    const atPeak = raiseForScenery(timed, plan, P0_WIN, base).capacity!;
    expect(atEnd).toBeGreaterThan(3);
    expect(atPeak).toBe(atEnd);
  });
});

describe("the sweep (081 P1, criterion 7)", () => {
  it("every puzzles/city/*.city.json validates, passes the city check on 6 x 6 seed 1 and replays its note's check block through the conversion", () => {
    const started = Date.now();
    const files = readdirSync(join(PUZZLES_DIR, "city")).filter((f) => f.endsWith(".city.json")).sort();
    expect(files.length).toBeGreaterThan(0);
    const failures: string[] = [];
    for (const f of files) {
      const path = join(PUZZLES_DIR, "city", f);
      const city = loaded(path).city;
      if (city.blocksX !== 6 || city.blocksZ !== 6 || city.seed !== 1 || !city.oneWay) failures.push(`${f}: not on 6 x 6 seed 1 one-way`);
      const r = checkFile(path, { planFor: () => plan });
      if (r.status !== "checked") failures.push(`${f}: ${r.status} ${r.status === "invalid" ? r.errors.join("; ") : ""}`);
      else if (!r.report.ok) failures.push(r.lines.join("\n"));
    }
    expect(failures).toEqual([]);
    console.log(`city sweep: ${files.length} puzzles in ${Date.now() - started} ms`);
  });
});

