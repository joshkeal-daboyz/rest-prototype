/** Stage 2's planner on typed-in fixtures: the parts rule (grammar rule 4), lane places, edges, half parks. Light: no city is built. */
import { describe, expect, it } from "vitest";
import type { CityLandLayer, CityPlanBlock, CityStreetBand } from "../../core";
import { evaluateLand, landVariety } from "./check";
import { lanePositions, partSideOk, planBlocks, planLand } from "./plan";

/** A block with every side on street "s" (parked on both sides, see ST), a block across each, and no junction facing it. Its `bi` and `bj` are never read. */
const side = { street: "s", across: [{ block: "other", span: { lo: 0, hi: 1 } }], junctions: [] } as unknown as CityPlanBlock["sides"]["-x"];
const block = (id: string, type: CityPlanBlock["type"], w: number, d: number, i0 = 0, j0 = 0): CityPlanBlock => ({
  id, bi: 0, bj: 0, i0, i1: i0 + w, j0, j1: j0 + d, type,
  sides: { "-x": side, "+x": side, "-z": side, "+z": side },
});
const PARKED: CityStreetBand[] = ["pavement", "parking", "lane", "lane", "parking", "pavement"];
const ST = [{ id: "s", bands: PARKED }];
const zero = (): number => 0;

describe("land: the parts rule (criterion 2, M4a)", () => {
  it("a part's side is 2, or 6 and more", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 20].map(partSideOk)).toEqual([false, true, false, false, false, true, true, true]);
  });
  it("a 9-cell side is cut 2, lane, 6 (or 6, lane, 2), never 4, lane, 4", () => {
    expect(lanePositions(9, 8)).toEqual([2, 6]);
    expect(lanePositions(10, 8)).toEqual([2, 7]);
    expect(lanePositions(13, 9)).toEqual([2, 6, 10]);
    expect(lanePositions(14, 9)).toEqual([2, 6, 7, 11]);
    expect(lanePositions(8, 9)).toEqual([]);
    for (let len = 9; len <= 40; len++) for (const at of lanePositions(len, 12)) expect([partSideOk(at), partSideOk(len - 1 - at)]).toEqual([true, true]);
  });
  it("every side of 9 cells or more has a place for a lane when the block is 8 or more across (B2)", () => {
    for (let len = 9; len <= 40; len++) expect(lanePositions(len, 8).length).toBeGreaterThan(0);
  });
  it("B2: a place is dropped when a court part it leaves has a long side under 8 (criterion 1)", () => {
    expect(lanePositions(13, 6)).toEqual([2, 10]); // 6, lane, 6 would leave two 6 x 6 parts
    expect(lanePositions(9, 7)).toEqual([]); // 2, lane, 6 leaves a 6 x 7 part
    expect(lanePositions(12, 6)).toEqual([2, 9]);
    expect(lanePositions(14, 7)).toEqual([2, 11]);
  });
  it("B2: a block with no lane place takes no alley, though its side is long", () => {
    const tight = block("block:0:0", "long", 9, 7);
    expect(planBlocks([tight], zero, ST).alleys.size).toBe(0);
    expect(planLand([tight], zero, ST).blocks[0]!.treatment).toBe("court");
    expect(planBlocks([block("block:0:0", "long", 9, 8)], zero, ST).alleys.size).toBe(1);
    // a block that a quota would give an alley, with a place, still takes one; one without is passed over
    const rest = [block("block:0:0", "medium", 9, 7), block("block:1:0", "medium", 9, 8, 20)];
    expect([...planBlocks(rest, zero, ST).alleys]).toEqual(["block:1:0"]);
  });
  it("B2 failing fixture: a 6 by 13 block cut 6, lane, 6 (two 6 x 6 parts) fails M4a with the long-side clause named", () => {
    const layer: CityLandLayer = {
      stage: "land",
      blocks: [{ block: "block:0:0", biome: "town", treatment: "alley" }],
      parts: [
        { id: "block:0:0/a", block: "block:0:0", i0: 0, i1: 6, j0: 0, j1: 6, shape: "court", edges: { "+x": "street", "-x": "street", "+z": "lane", "-z": "street" } },
        { id: "block:0:0/b", block: "block:0:0", i0: 0, i1: 6, j0: 7, j1: 13, shape: "court", edges: { "+x": "street", "-x": "street", "+z": "street", "-z": "lane" } },
      ],
      lanes: [{ block: "block:0:0", axis: "x", at: 6 }],
      parks: [],
    };
    const m = landVariety(layer, [block("block:0:0", "long", 6, 13)]);
    expect(m.badParts).toEqual([]);
    expect(m.cramped).toEqual(["block:0:0/a", "block:0:0/b"]);
    expect(evaluateLand(m).find((v) => v.id === "M4a")).toEqual({ id: "M4a", value: 2, pass: false });
  });
  it("B2: a whole block no lane cuts (6 x 6) is not judged by the long-side clause (Q7)", () => {
    const layer: CityLandLayer = { stage: "land", blocks: [{ block: "block:0:0", biome: "town", treatment: "court" }], parts: [{ id: "block:0:0", block: "block:0:0", i0: 0, i1: 6, j0: 0, j1: 6, shape: "court", edges: { "+x": "street", "-x": "street", "+z": "street", "-z": "street" } }], lanes: [], parks: [] };
    expect(landVariety(layer, [block("block:0:0", "small", 6, 6)]).cramped).toEqual([]);
  });
  it("failing fixture: a 9-cell side cut into two parts of 4 fails M4a, naming both parts", () => {
    const layer: CityLandLayer = {
      stage: "land",
      blocks: [{ block: "block:0:0", biome: "town", treatment: "alley" }],
      parts: [
        { id: "block:0:0/a", block: "block:0:0", i0: 0, i1: 4, j0: 0, j1: 12, shape: "court", edges: { "+x": "lane", "-x": "street", "+z": "street", "-z": "street" } },
        { id: "block:0:0/b", block: "block:0:0", i0: 5, i1: 9, j0: 0, j1: 12, shape: "court", edges: { "+x": "street", "-x": "lane", "+z": "street", "-z": "street" } },
      ],
      lanes: [{ block: "block:0:0", axis: "z", at: 4 }],
      parks: [],
    };
    const m = landVariety(layer, [block("block:0:0", "long", 9, 7)]);
    expect(m.badParts).toEqual(["block:0:0/a", "block:0:0/b"]);
    expect(evaluateLand(m).find((v) => v.id === "M4a")).toEqual({ id: "M4a", value: 2, pass: false });
  });
  it("the planner cuts a 9 x 8 block into a strip and a 6-cell court, by the hash's pick among the places", () => {
    const b = block("block:0:0", "long", 9, 8);
    const first = planLand([b], zero, ST); // the first place: 2 cells before the lane
    expect(first.lanes).toEqual([{ block: b.id, axis: "z", at: 2 }]);
    expect(first.parts.map((p) => [p.id, p.i0, p.i1, p.shape])).toEqual([[`${b.id}/a`, 0, 2, "strip"], [`${b.id}/b`, 3, 9, "court"]]);
    const second = planLand([b], () => 1, ST);
    expect(second.lanes).toEqual([{ block: b.id, axis: "z", at: 6 }]);
    expect(second.parts.map((p) => p.shape)).toEqual(["court", "strip"]);
  });
  it("the lane's place follows the hash: every place is reached by some value", () => {
    const b = block("block:0:0", "long", 13, 9);
    const ats = new Set([0, 1, 2].map((k) => planLand([b], () => k, ST).lanes[0]!.at));
    expect(ats).toEqual(new Set([2, 6, 10]));
  });
});

describe("land: edges (criterion 3)", () => {
  it("a strip has one street edge and one lane edge on its long sides; its short ends are streets", () => {
    const b = block("block:0:0", "long", 9, 8);
    const strip = planLand([b], zero, ST).parts[0]!;
    expect(strip.edges).toEqual({ "-x": "street", "+x": "lane", "-z": "street", "+z": "street" });
    const stripHigh = planLand([b], () => 1, ST).parts[1]!;
    expect(stripHigh.edges).toEqual({ "-x": "lane", "+x": "street", "-z": "street", "+z": "street" });
  });
  it("a lane along x puts its edges on the z sides", () => {
    const b = block("block:0:0", "long", 8, 12);
    const p = planLand([b], zero, ST);
    expect(p.lanes[0]!.axis).toBe("x");
    expect(p.parts[0]!.edges).toEqual({ "-x": "street", "+x": "street", "-z": "street", "+z": "lane" });
    expect(p.parts[1]!.edges).toEqual({ "-x": "street", "+x": "street", "-z": "lane", "+z": "street" });
  });
  it("a half park's built part has a park edge toward the park and street edges elsewhere", () => {
    const b = block("block:0:0", "large", 14, 12);
    const p = planLand([b], zero, ST); // hash 0: the park takes the -z half (6 cells), the built part the rest (6)
    expect(p.blocks[0]!.treatment).toBe("parkHalf");
    expect(p.parks).toEqual([{ block: b.id, kind: "half", i0: 0, i1: 14, j0: 0, j1: 6, side: "-z" }]);
    expect(p.parts).toHaveLength(1);
    expect(p.parts[0]).toMatchObject({ id: `${b.id}/built`, j0: 6, j1: 12, shape: "court", edges: { "-z": "park", "+z": "street", "-x": "street", "+x": "street" } });
    const q = planLand([b], () => 1, ST);
    expect(q.parks[0]).toMatchObject({ j0: 6, j1: 12, side: "+z" });
    expect(q.parts[0]!.edges["+z"]).toBe("park");
  });
  it("a half park on a tall block takes an x side", () => {
    const b = block("block:0:0", "large", 12, 14);
    const p = planLand([b], zero, ST);
    expect(p.parks[0]).toMatchObject({ i0: 0, i1: 6, side: "-x" });
    expect(p.parts[0]).toMatchObject({ i0: 6, i1: 12, edges: { "-x": "park" } });
  });
  it("a whole park has a park and no part; a plain block is one court part with street edges", () => {
    const p = planLand([block("block:0:0", "small", 7, 7), block("block:1:0", "medium", 8, 8, 10)], zero, ST);
    expect(p.blocks.map((x) => x.treatment)).toEqual(["parkWhole", "court"]);
    expect(p.parks).toEqual([{ block: "block:0:0", kind: "whole", i0: 0, i1: 7, j0: 0, j1: 7, side: null }]);
    expect(p.parts).toHaveLength(1);
    expect(p.parts[0]).toMatchObject({ id: "block:1:0", shape: "court", edges: { "+x": "street", "-x": "street", "+z": "street", "-z": "street" } });
  });
});

describe("land: half parks leave a court part (criterion 2)", () => {
  it("a large block whose half would leave 5 cells takes no half park", () => {
    // short side 9 or 10: the park takes 4 or 5, the built part keeps 5 or 5.
    expect(planBlocks([block("block:0:0", "large", 12, 10)], zero, ST).parks.size).toBe(0);
    expect(planBlocks([block("block:0:0", "large", 12, 9)], zero, ST).parks.size).toBe(0);
    expect(planBlocks([block("block:0:0", "large", 12, 11)], zero, ST).parks.get("block:0:0")).toBe("half");
  });
});
