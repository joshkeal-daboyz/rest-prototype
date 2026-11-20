import { describe, expect, it } from "vitest";
import type { CityPlanRun, CityStreetRole } from "../../core";
import { pictureProblems } from "../pipeline/picture";
import { runCity } from "../stages";
import { CITY_BLOCKS_DEFAULT, CITY_BLOCKS_MAX, PLAN_BLOCKS_DEFAULT } from "./constants";
import { STREETS_LEGEND, streetsStage } from "./stage";
import { laySplit } from "./split";

const cache = new Map<string, CityPlanRun>();
const city = (blocksX: number, blocksZ: number, seed: number): CityPlanRun => {
  const key = `${blocksX}x${blocksZ}:${seed}`;
  let r = cache.get(key);
  if (!r) {
    r = runCity({ blocksX, blocksZ, seed }, "streets");
    cache.set(key, r);
  }
  return r;
};
const layerOf = (blocksX: number, blocksZ: number, seed: number) => {
  const r = city(blocksX, blocksZ, seed);
  if (!r.ok) throw new Error(`failed: ${JSON.stringify(r.failure)}`);
  return r.plan.layers.streets!;
};

describe("stage 1 picture (criterion 8, R-5)", () => {
  it("has the legend lane, parking band, junction, crossing, pavement, pavement corner, block, and from A4b one-way lane and one-way arrow", () => {
    expect(STREETS_LEGEND.map((e) => e.name)).toEqual(["lane", "parking band", "junction", "crossing", "pavement", "pavement corner", "block", "one-way lane", "one-way arrow"]);
  });
  for (const [x, z, s] of [[6, 6, 1], [6, 6, 2], [6, 6, 3], [6, 6, 8]] as const) {
    it(`${x} x ${z} seed ${s}: the size is the lattice's, every index is in the legend, each cell matches the layer`, () => {
      const layer = layerOf(x, z, s);
      const r = city(x, z, s);
      const pic = streetsStage.picture(r.plan);
      expect(pic.stage).toBe("streets");
      expect(pictureProblems(pic, layer.w, layer.h)).toEqual([]);
      const index: Record<CityStreetRole, number> = { lane: 0, parkingPlain: 1, junction: 2, crossing: 3, pavement: 4, pavementCorner: 5 };
      const listed = new Set<number>();
      const oneWay = new Set(layer.streets.filter((s) => s.section !== "twoWay").map((s) => s.id));
      for (const c of layer.cells) {
        listed.add(c.j * layer.w + c.i);
        expect(pic.cells[c.j * layer.w + c.i]).toBe(c.role === "lane" && oneWay.has(c.street!) ? 7 : index[c.role]);
      }
      for (const b of layer.blocks) {
        for (let j = b.j0; j < b.j1; j++) for (let i = b.i0; i < b.i1; i++) {
          expect(listed.has(j * layer.w + i)).toBe(false);
          expect(pic.cells[j * layer.w + i]).toBe(6);
        }
      }
      const blockCells = layer.blocks.reduce((n, b) => n + (b.i1 - b.i0) * (b.j1 - b.j0), 0);
      expect(listed.size + blockCells).toBe(layer.w * layer.h);
      // each cell kind appears; the one-way lane (7) only where the plan has a one-way street (a named city may have none); the ninth entry is the arrows' points
      expect(new Set(pic.cells)).toEqual(new Set(oneWay.size > 0 ? [0, 1, 2, 3, 4, 5, 6, 7] : [0, 1, 2, 3, 4, 5, 6]));
      expect(pic.points).toHaveLength(layer.arrows.length);
    });
  }
});

describe("stage 1 layer shape", () => {
  it("is the lattice, the streets with ends, every street cell once, the blocks with sides, the junctions and the outline", () => {
    const layer = layerOf(6, 6, 1);
    expect(layer.stage).toBe("streets");
    expect(layer.streets.length).toBeGreaterThanOrEqual(4);
    expect(layer.blocks.length).toBeGreaterThan(0);
    expect(layer.junctions.length).toBeGreaterThan(0);
    expect(layer.outline.i0).toBeLessThan(layer.outline.i1);
    expect("sizes" in layer).toBe(false);
    for (const c of layer.cells) {
      expect(c.i).toBeGreaterThanOrEqual(0);
      expect(c.i).toBeLessThan(layer.w);
      expect(c.j).toBeLessThan(layer.h);
      if (c.role === "junction" || c.role === "pavementCorner") expect(c.street).toBeNull();
      if (c.role === "crossing") expect(c.band).toBe(-1);
    }
  });
  it("is what the layout gives (the stage adds nothing and takes nothing away)", () => {
    expect(layerOf(6, 6, 1)).toEqual(laySplit(1, 6, 6).layer);
  });
});

describe("stage 1 digest pins (R-4), moved by ticket 070 A4d: the 6 x 6 named cities, seeds 1, 2, 3 and 8 with one-way on; the split limit 128", () => {
  const PINS: readonly (readonly [number, number, number, string])[] = [
    [6, 6, 1, "d13a5101"],
    [6, 6, 2, "d039a14d"],
    [6, 6, 3, "d804a9ef"],
    [6, 6, 8, "3e7f947b"],
  ];
  for (const [x, z, s, digest] of PINS) {
    it(`${x} x ${z} seed ${s} has digest ${digest}`, () => {
      expect(city(x, z, s).plan.digests.streets).toBe(digest);
    });
  }
  it("runCity's own default stays 3 x 3 seed 1 (CITY_BLOCKS_DEFAULT, city=tiles); the plan view's default is PLAN_BLOCKS_DEFAULT, below", () => {
    expect(runCity({}, "streets").plan.digests.streets).toBe(runCity({ blocksX: CITY_BLOCKS_DEFAULT, blocksZ: CITY_BLOCKS_DEFAULT, seed: 1 }, "streets").plan.digests.streets);
  });
  it("PLAN_BLOCKS_DEFAULT is 6 (Josh, 20 Nov 2026, Q17: the default 6 x 6 seed 1, \"yes\"), at most CITY_BLOCKS_MAX; CITY_BLOCKS_DEFAULT stays 3", () => {
    expect(PLAN_BLOCKS_DEFAULT).toBe(6);
    expect(PLAN_BLOCKS_DEFAULT).toBeLessThanOrEqual(CITY_BLOCKS_MAX);
    expect(CITY_BLOCKS_DEFAULT).toBe(3);
  });
});

describe("stage 1 on every named run (R-2, R-7)", () => {
  it("the default 6 x 6 seed 1 ends ok", () => {
    expect(city(6, 6, 1).ok).toBe(true);
  });
});
