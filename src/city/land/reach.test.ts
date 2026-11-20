/** Ticket 070 B3 on typed-in fixtures: S6 for lanes (criterion 1) and the served park (criterion 2). Light: no city is built. */
import { describe, expect, it } from "vitest";
import type { CityJunctionFacing, CityPlanBlock, CitySide, CityStreetBand } from "../../core";
import { BAY_JUNCTION_CLEAR as TILE_CLEAR } from "../../render3d/tilecity";
import { laneMouthsAtJunctions, unservedWholeParks } from "./check";
import { BAY_JUNCTION_CLEAR } from "./constants";
import { lanePlaces, planBlocks, planLand } from "./plan";
import { farParking, isServed } from "./reach";

interface Facing {
  readonly street: string;
  readonly across: CityPlanBlock["sides"]["-x"]["across"];
  readonly junctions: readonly CityJunctionFacing[];
}
const side = (street = "s", across = true, junctions: readonly CityJunctionFacing[] = []): Facing => ({ street, across: across ? [{ block: "other", span: { lo: 0, hi: 1 } }] : [], junctions });
const at = (lo: number, hi: number): CityJunctionFacing[] => [{ junction: "junction:0:0", street: "t", span: { lo, hi } }];
const zero = (): number => 0;

const block = (id: string, type: CityPlanBlock["type"], w: number, d: number, i0 = 0, j0 = 0, sides: Partial<Record<CitySide, Facing>> = {}): CityPlanBlock => ({
  id,
  bi: 0,
  bj: 0,
  i0,
  i1: i0 + w,
  j0,
  j1: j0 + d,
  type,
  sides: { "-x": side(), "+x": side(), "-z": side(), "+z": side(), ...sides } as unknown as CityPlanBlock["sides"],
});

/** Parks on both sides of the carriageway. */
const BOTH: CityStreetBand[] = ["pavement", "parking", "lane", "lane", "parking", "pavement"];
/** Parks only on the row 1 side: the far side for a -z or +x block, the block's own side for a +z or -x one. */
const LOW: CityStreetBand[] = ["pavement", "parking", "lane", "pavement"];
/** Parks only on the row n - 2 side: the far side for a +z or -x block. */
const HIGH: CityStreetBand[] = ["pavement", "lane", "parking", "pavement"];
const streets = (...s: [string, CityStreetBand[]][]) => s.map(([id, bands]) => ({ id, bands }));
const ST = streets(["s", BOTH]);

describe("land: S6 for lanes (B3 criterion 1)", () => {
  it("BAY_JUNCTION_CLEAR is a copy of tilecity.ts's", () => {
    expect(BAY_JUNCTION_CLEAR).toBe(TILE_CLEAR);
    expect(BAY_JUNCTION_CLEAR).toBe(1);
  });

  it("a lane place whose mouth lies in a junction-facing span, widened by one cell either side, is dropped", () => {
    // a 13 x 9 block (lane along z): places 2, 6, 10 cells from i0 = 0
    expect(lanePlaces(block("b", "long", 13, 9))).toEqual([2, 6, 10]);
    expect(lanePlaces(block("b", "long", 13, 9, 0, 0, { "-z": side("s", true, at(6, 9)) }))).toEqual([2, 10]); // [5, 10): 6 goes, 10 stays
    expect(lanePlaces(block("b", "long", 13, 9, 0, 0, { "-z": side("s", true, at(7, 10)) }))).toEqual([2]); // [6, 11): 6 and 10 go
    expect(lanePlaces(block("b", "long", 13, 9, 0, 0, { "+z": side("s", true, at(1, 4)) }))).toEqual([6, 10]); // [0, 5): 2 goes
    expect(lanePlaces(block("b", "long", 13, 9, 0, 0, { "-z": side("s", true, at(3, 6)) }))).toEqual([10]); // [2, 7): 2 and 6 go
  });

  it("the widening is one cell each side and the span's high end is exclusive", () => {
    const only = (lo: number, hi: number) => lanePlaces(block("b", "long", 13, 9, 0, 0, { "-z": side("s", true, at(lo, hi)) }));
    expect(only(3, 4)).toEqual([6, 10]); // [2, 5): 2 goes
    expect(only(4, 5)).toEqual([2, 6, 10]); // [3, 6): none
    expect(only(7, 8)).toEqual([2, 10]); // [6, 9): 6 goes
  });

  it("a junction facing a side the lane does not open onto does not matter", () => {
    expect(lanePlaces(block("b", "long", 13, 9, 0, 0, { "-x": side("s", true, at(0, 9)), "+x": side("s", true, at(0, 9)) }))).toEqual([2, 6, 10]);
  });

  it("a tall block's lane (along x) is judged on its -x and +x sides, by j", () => {
    // 9 wide, 13 deep from j0 = 20: places at j 22, 26, 30
    expect(lanePlaces(block("b", "long", 9, 13, 0, 20))).toEqual([2, 6, 10]);
    expect(lanePlaces(block("b", "long", 9, 13, 0, 20, { "+x": side("s", true, at(26, 29)) }))).toEqual([2, 10]); // [25, 30): 26 goes, 30 stays
  });

  it("fixture: a block whose one lane place opens onto a junction-facing span has no place, so it takes no alley", () => {
    const one = block("b", "long", 9, 8, 0, 0, { "-z": side("s", true, at(1, 4)) }); // places 2 and 6; [0, 5) takes 2
    expect(lanePlaces(one)).toEqual([6]);
    expect(planBlocks([one], zero, ST).alleys.size).toBe(1);
    expect(planLand([one], zero, ST).lanes).toEqual([{ block: "b", axis: "z", at: 6 }]);
    const none = block("b", "long", 9, 8, 0, 0, { "-z": side("s", true, at(1, 9)) });
    expect(lanePlaces(none)).toEqual([]);
    expect(planBlocks([none], zero, ST).alleys.size).toBe(0);
    expect(planLand([none], zero, ST).blocks[0]!.treatment).toBe("court");
  });

  it("the check names a lane mouth that faces a junction", () => {
    const b = block("b", "long", 13, 9, 0, 0, { "+z": side("s", true, at(5, 8)) });
    expect(laneMouthsAtJunctions({ lanes: [{ block: "b", axis: "z", at: 6 }] }, [b])).toEqual(["b +z"]);
    expect(laneMouthsAtJunctions({ lanes: [{ block: "b", axis: "z", at: 10 }] }, [b])).toEqual([]);
  });
});

describe("land: the served park (B3 criterion 2)", () => {
  it("the far band is row 1 for a -z or +x side, row n - 2 for a +z or -x side", () => {
    expect((["+z", "-x", "-z", "+x"] as const).map((s) => farParking({ bands: HIGH }, s))).toEqual([true, true, false, false]);
    expect((["+z", "-x", "-z", "+x"] as const).map((s) => farParking({ bands: LOW }, s))).toEqual([false, false, true, true]);
  });

  /** A small block served by none of its four streets: each street parks only on the block's own side. */
  const lone = block("lone", "small", 7, 7, 0, 0, { "-x": side("low"), "+z": side("low"), "-z": side("high"), "+x": side("high") });
  const own = streets(["low", LOW], ["high", HIGH]);

  it("failing fixture: a small block whose four streets all park on its side takes no whole park, and the quota goes down the list", () => {
    expect(isServed(lone, new Map(own.map((x) => [x.id, x])))).toBe(false);
    const other = block("other", "small", 7, 7, 10);
    const bigger = block("bigger", "large", 14, 12, 20);
    // three blocks need one park: the served small takes it, the unserved one never does
    expect([...planBlocks([lone, other, bigger], zero, [...own, ...ST]).parks]).toEqual([["other", "whole"]]);
    // the only small block is unserved: the large block takes the park
    expect([...planBlocks([lone, bigger], zero, [...own, ...ST]).parks]).toEqual([["bigger", "half"]]);
    expect(planLand([lone, bigger], zero, [...own, ...ST]).blocks.map((x) => x.treatment)).toEqual(["court", "parkHalf"]);
  });

  it("a block whose streets all face out (no block across) is not served", () => {
    const edge = block("edge", "small", 7, 7, 0, 0, { "-x": side("s", false), "+x": side("s", false), "-z": side("s", false), "+z": side("s", false) });
    expect(isServed(edge, new Map(ST.map((x) => [x.id, x])))).toBe(false);
    expect(planBlocks([edge], zero, ST).parks.size).toBe(0);
  });

  it("one served side is enough", () => {
    const b = block("b", "small", 7, 7, 0, 0, { "-x": side("low"), "+z": side("low"), "-z": side("high"), "+x": side("s") });
    expect(isServed(b, new Map([...own, ...ST].map((x) => [x.id, x])))).toBe(true);
  });

  it("the check names a whole park on an unserved block", () => {
    const layer = { parks: [{ block: "lone", kind: "whole" as const, i0: 0, i1: 7, j0: 0, j1: 7, side: null }] };
    expect(unservedWholeParks(layer, [lone], own)).toEqual(["lone"]);
    expect(unservedWholeParks(layer, [lone], [...own, ...ST].map((x) => (x.id === "high" ? { id: "high", bands: BOTH } : x)))).toEqual([]);
  });
});
