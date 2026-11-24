/**
 * Ticket 081 K2d2: what a city puzzle may do with roofs (CK17e, CK13 through roofs, CK14 for roofs, CK17d in one job, CK15 for roofs). Fixtures are real roofs of 6 x 6 seed 1, one-way on, in district block:6:6;
 * each rule fails with one thing changed (test policy rule 2).
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { CityCircuitLayer, CityPlan, CityPuzzle, CityPuzzleNode, CityRoofMast, CityRoofSpan } from "../../core";
import { runCity } from "../stages";
import { stagesOfProfile } from "../testing/namedcities";
import { nodePlaceProblems } from "./checkplaces";
import { cityPuzzleProblems, districtProblems, runProblems } from "./checkpuzzle";
import { convertCityPuzzle } from "./convert";
import { jobRoofProblems, reachOf, roofSpanFault } from "./roofjobs";
import { roofSpanId } from "./roofplaces";

let plan: CityPlan;
let layer: CityCircuitLayer;
const D = "block:6:6";
const district = [D];

beforeAll(() => {
  const upto = stagesOfProfile("facades", "on");
  const r = runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, "circuit", upto.slice(0, upto.findIndex((d) => d.name === "circuit") + 1));
  if (!r.ok) throw new Error(r.failure.reason);
  plan = r.plan;
  layer = plan.layers.circuit!;
}, 60_000);

const blocks = () => plan.layers.streets!.blocks;
const roof = (id: string): CityRoofMast | undefined => layer.roofs!.find((r) => r.id === id);
const spansOf = (id: string): CityRoofSpan[] => layer.roofSpans!.filter((s) => s.a === id || s.b === id);
const other = (s: CityRoofSpan, id: string): string => (s.a === id ? s.b : s.a);
const nodeAt = (id: string, type: CityPuzzleNode["type"], place: CityPuzzleNode["place"]): CityPuzzleNode => ({ id, type, place }) as CityPuzzleNode;
const base = (nodes: CityPuzzleNode[], lines: CityPuzzle["lines"], faults: CityPuzzle["faults"] = [], district: readonly string[] = [D]): CityPuzzle => ({
  id: "roof-job",
  name: "Roof job",
  version: 5,
  scope: "map",
  city: { blocksX: 6, blocksZ: 6, seed: 1, oneWay: true },
  district,
  capacity: 3,
  startingParts: ["wire"],
  target: [],
  priority: [],
  nodes,
  lines,
  faults,
});
/** A corner roof with a pavement span to a pole, a junction span to a roof that has one too: pole, pavement span, roof, junction span, roof, pavement span, pole. */
function chain() {
  const poleOf = (r: string): string | undefined => {
    const s = spansOf(r).find((x) => x.over === "pavement");
    return s === undefined ? undefined : other(s, r);
  };
  for (const jn of layer.roofSpans!.filter((x) => x.over === "junction" && roof(x.a) !== undefined && roof(x.b) !== undefined)) {
    const p1 = poleOf(jn.a);
    const p2 = poleOf(jn.b);
    if (p1 !== undefined && p2 !== undefined) return { d: roof(jn.a)!.block, r1: jn.a, r2: jn.b, p1, p2, jn, spans: [roofSpanId(p1, jn.a), jn.id, roofSpanId(p2, jn.b)] };
  }
  throw new Error("no chain on seed 1");
}
/** A roof outside the district with a roof span into `into`. */
const outsideOf = (into: string): string => other(spansOf(into).find((s) => roof(other(s, into)) !== undefined && roof(other(s, into))!.block !== D)!, into);

describe("a city puzzle on roofs (081 K2d2)", () => {
  it("CK17e: a node on a roof needs its roof span places the job may use, and a feed on a roof stands outside the district", () => {
    const job = { district, blocks: blocks() };
    const usable = (id: string) => spansOf(id).filter((s) => roofSpanFault(reachOf(district, blocks(), layer), s) === null).length;
    expect([usable("roof:54:51"), usable("roof:54:52")]).toEqual([2, 3]);
    const at = (type: CityPuzzleNode["type"], r: string) => nodePlaceProblems(layer, [{ id: "n", type, place: { roof: r } }], job);
    expect(at("breaker", "roof:54:51")).toEqual([]);
    expect(at("lamp", "roof:54:51")).toEqual([]);
    expect(at("switch", "roof:54:51").some((p) => p.rule === "CK12" && p.reason.includes("needs 3"))).toBe(true);
    expect(at("switch", "roof:54:52")).toEqual([]);
    expect(at("feed", "roof:54:52").some((p) => p.reason.includes("outside the district"))).toBe(true);
    expect(at("feed", outsideOf("roof:54:52"))).toEqual([]);
  });

  it("CK13 through roofs: pole, pavement span, roof, junction span, roof, pavement span, pole passes; a second line through a roof carrier fails; a run never ends on a drop at a roof", () => {
    const c = chain();
    const nodes = [nodeAt("a", "junction", { pole: c.p1 }), nodeAt("b", "junction", { pole: c.p2 })];
    const one = base(nodes, [{ id: "l1", from: "a", to: "b", run: { spans: c.spans } }]);
    expect(runProblems(one, layer)).toEqual([]);
    const q = spansOf(c.r1).filter((s) => s.over === "pavement" && other(s, c.r1) !== c.p1).map((s) => other(s, c.r1));
    const second = { id: "l2", from: "c", to: "d", run: { spans: [roofSpanId(q[0]!, c.r1), roofSpanId(q[1]!, c.r1)] } };
    const two = base([...nodes, nodeAt("c", "junction", { pole: q[0]! }), nodeAt("d", "junction", { pole: q[1]! })], [one.lines[0]!, second]);
    expect(runProblems(two, layer).some((p) => p.id === "l2" && p.reason.includes("also carries l1"))).toBe(true);
    const drop = layer.drops[0]!;
    const atDrop = base([nodes[0]!, nodeAt("h", "lamp", { building: drop.building })], [{ id: "l1", from: "a", to: "h", run: { spans: c.spans.slice(0, 2), drop: drop.building } }]);
    expect(runProblems(atDrop, layer).some((p) => p.id === "l1" && p.reason.includes("never leaves a roof"))).toBe(true);
  });

  it("CK14 for roofs: a roof on a neighbouring block passes; a roof two streets away, and a pole of a neighbouring block, fail", () => {
    const c = chain();
    expect(roof(c.r2)!.block).not.toBe(c.d);
    const lamp = base([nodeAt("a", "junction", { pole: c.p1 }), nodeAt("b", "lamp", { roof: c.r2 })], [{ id: "l1", from: "a", to: "b", run: { spans: c.spans.slice(0, 2) } }], [], [c.d]);
    expect(districtProblems(lamp, layer, blocks())).toEqual([]);
    const near = reachOf([c.d], blocks(), layer).near;
    const reach = (id: string): string => roof(id)?.block ?? "";
    const far = layer.roofSpans!.find((x) => roof(x.a) !== undefined && roof(x.b) !== undefined && near.has(reach(x.a)) && reach(x.b) !== c.d && !near.has(reach(x.b)))!;
    const away = base(lamp.nodes, [{ id: "l1", from: "a", to: "b", run: { spans: [...c.spans.slice(0, 2), far.id] } }], [], [c.d]);
    expect(districtProblems(away, layer, blocks()).some((p) => p.rule === "CK14" && p.reason.includes("wholly past"))).toBe(true);
    const across = spansOf(c.r1).find((x) => roof(other(x, c.r1)) === undefined && layer.poles.find((q) => q.id === other(x, c.r1))!.block !== c.d)!;
    const pole = base(lamp.nodes, [{ id: "l1", from: "a", to: "b", run: { spans: [across.id] } }], [], [c.d]);
    expect(districtProblems(pole, layer, blocks()).some((p) => p.rule === "CK14" && p.reason.includes("pole of a neighbouring block"))).toBe(true);
  });

  it("CK17d in one job: two junction spans over one junction fail", () => {
    const byJunction = new Map<string, CityRoofSpan[]>();
    for (const s of layer.roofSpans!) if (s.junction !== null && roof(s.a) !== undefined && roof(s.b) !== undefined) byJunction.set(s.junction, [...(byJunction.get(s.junction) ?? []), s]);
    const two = [...byJunction.values()].find((v) => v.length >= 2);
    expect(two).toBeDefined();
    const puzzle = base([], [{ id: "l1", from: "a", to: "b", run: { spans: [two![0]!.id] } }, { id: "l2", from: "c", to: "d", run: { spans: [two![1]!.id] } }]);
    expect(jobRoofProblems(puzzle, layer).some((p) => p.rule === "CK17d" && p.reason.includes("junction spans over"))).toBe(true);
    expect(jobRoofProblems({ ...puzzle, lines: puzzle.lines.slice(0, 1) }, layer).filter((p) => p.reason.includes("junction spans over"))).toEqual([]);
  });

  it("CK15 for roofs: a roof node's pos is its structure's point over CELL_M, places keep { roof }, a roof span may be a cut, and the scenery adds nothing for roofs", () => {
    const feedRoof = outsideOf("roof:54:52");
    const sid = roofSpanId(feedRoof, "roof:54:52");
    const puzzle: CityPuzzle = {
      ...base([nodeAt("feed", "feed", { roof: feedRoof }), nodeAt("lamp", "lamp", { roof: "roof:54:52" })], [{ id: "l1", from: "feed", to: "lamp", run: { spans: [sid] } }], [{ id: "cut", at: "l1", kind: "damaged-cable", span: sid }]),
      target: ["lamp"],
    };
    expect(cityPuzzleProblems(puzzle, plan)).toEqual([]);
    const c = convertCityPuzzle(puzzle, plan);
    const pos = c.puzzle.nodes.find((n) => n.id === "lamp")!.pos;
    const r = roof("roof:54:52")!;
    expect(Math.abs(pos[0] - (r.x_m - c.origin_m.x_m) / 5)).toBeLessThan(1e-4);
    expect(Math.abs(pos[1] - (r.z_m - c.origin_m.z_m) / 5)).toBeLessThan(1e-4);
    expect(c.places["feed"]).toEqual({ roof: feedRoof });
    expect(c.cuts["cut"]).toBe(sid);
    const poles = new Map(layer.poles.map((p) => [p.id, p] as const));
    const wanted = layer.spans.filter((s) => poles.get(s.a)!.block === D || poles.get(s.b)!.block === D).length + layer.drops.filter((d) => poles.get(d.pole)!.block === D).length;
    expect(c.puzzle.decor!.length).toBe(wanted);
  });
});
