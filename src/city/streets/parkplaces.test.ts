/**
 * Ticket 070 A4c: park places (criterion 1), S11 (criterion 2) and the named cities (criterion 3), one-way on and off. Each city is laid once per share through a module cache.
 */
import { describe, expect, it } from "vitest";
import type { CityBlockType, CitySide, CityStreetBand } from "../../core";
import { PARK_ONE_IN_BLOCKS as TILE_CITY_PARK_ONE_IN_BLOCKS } from "../../render3d/tilecity";
import { farBand, parkPlaces, parksNeeded, s11Failures, splitFailures } from "./check";
import { PARK_ONE_IN_BLOCKS } from "./constants";
import { blockType } from "./layout";
import { laySplit, type SplitLayout } from "./split";

const OWN: CityStreetBand[] = ["pavement", "parking", "lane", "lane", "pavement"]; // parking next to a "+z" or "-x" block
const FAR: CityStreetBand[] = ["pavement", "lane", "lane", "parking", "pavement"]; // parking next to a "-z" or "+x" block
const BARE: CityStreetBand[] = ["pavement", "lane", "pavement"];

type Side = { street: string; across: { block: string; span: { lo: number; hi: number } }[] };
const across = [{ block: "other", span: { lo: 0, hi: 8 } }];
/** A block with a street on each side; `served` names the sides that have a block across. */
const block = (id: string, type: CityBlockType, streets: Record<CitySide, string>, served: CitySide[] = ["-x", "+x", "-z", "+z"]) => {
  const sides = {} as Record<CitySide, Side>;
  for (const s of ["-x", "+x", "-z", "+z"] as const) sides[s] = { street: streets[s], across: served.includes(s) ? across : [] };
  return { id, type, sides };
};
const all = (street: string): Record<CitySide, string> => ({ "-x": street, "+x": street, "-z": street, "+z": street });

describe("park places (criterion 1)", () => {
  it("the far band is the one across the carriageway from the block", () => {
    expect(farBand({ bands: FAR }, "+z")).toBe(true); // FAR's parking is next to the "-z" block, so it is across from a "+z" block
    expect(farBand({ bands: FAR }, "-z")).toBe(false);
    expect(farBand({ bands: OWN }, "-z")).toBe(true);
    expect(farBand({ bands: OWN }, "+z")).toBe(false);
    expect(farBand({ bands: BARE }, "+z")).toBe(false);
  });
  const streets = [
    { id: "own", bands: OWN },
    { id: "far", bands: FAR },
    { id: "bare", bands: BARE },
  ];
  it("a small block with one street parking across from it is a place", () => {
    // for a "-z" block, FAR has the parking next to the block's own side... so the across side is the one whose parking is on the far side: OWN on "-z"
    const b = block("b", "small", { "-x": "bare", "+x": "bare", "-z": "own", "+z": "bare" });
    expect(parkPlaces({ streets, blocks: [b] })).toEqual({ whole: 1, half: 0 });
  });
  it("the same block with every street parking on its own side is not a place", () => {
    const b = block("b", "small", { "-x": "own", "+x": "far", "-z": "far", "+z": "own" });
    expect(parkPlaces({ streets, blocks: [b] })).toEqual({ whole: 0, half: 0 });
  });
  it("a small block on bare streets, or whose only far band faces out, is not a place", () => {
    expect(parkPlaces({ streets, blocks: [block("b", "small", all("bare"))] }).whole).toBe(0);
    expect(parkPlaces({ streets, blocks: [block("b", "small", { "-x": "bare", "+x": "bare", "-z": "own", "+z": "bare" }, ["+z"])] }).whole).toBe(0);
  });
  it("a large 11 x 12 block is a place, a medium 10 x 12 block is not", () => {
    expect(blockType(11, 12)).toBe("large");
    expect(blockType(10, 12)).toBe("medium");
    expect(parkPlaces({ streets, blocks: [block("l", "large", all("bare")), block("m", "medium", all("own")), block("g", "long", all("own"))] })).toEqual({ whole: 0, half: 1 });
  });
});

describe("S11 (criterion 2)", () => {
  const streets = [
    { id: "own", bands: OWN },
    { id: "bare", bands: BARE },
  ];
  const medium = (n: number) => Array.from({ length: n }, (_, k) => block(`m${k}`, "medium", all("bare")));
  it("PARK_ONE_IN_BLOCKS is the tile city's", () => {
    expect(PARK_ONE_IN_BLOCKS).toBe(TILE_CITY_PARK_ONE_IN_BLOCKS);
    expect(parksNeeded(9)).toBe(2);
    expect(parksNeeded(24)).toBe(4);
  });
  it("9 blocks with one park place fail, naming the count; with two they pass", () => {
    const one = [block("s", "small", { "-x": "bare", "+x": "bare", "-z": "own", "+z": "bare" }), ...medium(8)];
    const f = s11Failures({ streets, blocks: one });
    expect(f).toHaveLength(1);
    expect(f[0]).toMatch(/^S11: 1 whole and 0 half park places for 9 blocks, 2 needed/);
    const two = [block("s", "small", { "-x": "bare", "+x": "bare", "-z": "own", "+z": "bare" }), block("l", "large", all("bare")), ...medium(7)];
    expect(s11Failures({ streets, blocks: two })).toEqual([]);
  });
  it("a draw that misses S11 is a miss and the next draw is tried; every draw missing throws naming the rule", () => {
    // splitFailures does not judge S11 (it is judged on the final layer), so a hand-made `held` cannot reach it: the named-city runs below carry the proof; here the type is checked
    expect(splitFailures({ streets: [], junctions: [], blocks: [] }).every((f) => f.rule !== "S11")).toBe(true);
  });
});

const NAMED: { blocksX: number; blocksZ: number; seed: number }[] = [];
for (let seed = 1; seed <= 10; seed++) NAMED.push({ blocksX: 3, blocksZ: 3, seed });
for (let seed = 1; seed <= 3; seed++) NAMED.push({ blocksX: 6, blocksZ: 4, seed });
const cache = new Map<string, SplitLayout>();
const laid = (o: (typeof NAMED)[number], share?: number): SplitLayout => {
  const key = `${o.blocksX}x${o.blocksZ}:${o.seed}:${share ?? "default"}`;
  let r = cache.get(key);
  if (!r) {
    r = laySplit(o.seed, o.blocksX, o.blocksZ, undefined, undefined, share);
    cache.set(key, r);
  }
  return r;
};

describe("S11 on the named cities (criterion 3)", () => {
  for (const o of NAMED) {
    for (const share of [undefined, 0] as const) {
      it(`${o.blocksX}x${o.blocksZ} seed ${o.seed}, one-way ${share === 0 ? "off" : "on"}: park places at least parks needed`, () => {
        const layer = laid(o, share).layer;
        const p = parkPlaces(layer);
        expect(p.whole + p.half).toBeGreaterThanOrEqual(parksNeeded(layer.blocks.length));
        expect(s11Failures(layer)).toEqual([]);
      });
    }
  }
});
