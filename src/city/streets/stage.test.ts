import { describe, expect, it } from "vitest";
import type { CityPlanRun, CityStreetRole } from "../../core";
import { pictureProblems } from "../pipeline/picture";
import { runCity } from "../stages";
import { STREETS_LEGEND, streetsStage } from "./stage";

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
  it("has the legend lane, parking band, junction, crossing, pavement, pavement corner, block", () => {
    expect(STREETS_LEGEND.map((e) => e.name)).toEqual(["lane", "parking band", "junction", "crossing", "pavement", "pavement corner", "block"]);
  });
  for (const [x, z, s] of [[3, 3, 1], [3, 3, 2], [3, 3, 3], [6, 4, 1]] as const) {
    it(`${x} x ${z} seed ${s}: the size is the lattice's, every index is in the legend, each cell matches the layer`, () => {
      const layer = layerOf(x, z, s);
      const r = city(x, z, s);
      const pic = streetsStage.picture(r.plan);
      expect(pic.stage).toBe("streets");
      expect(pictureProblems(pic, layer.w, layer.h)).toEqual([]);
      const index: Record<CityStreetRole, number> = { lane: 0, parkingPlain: 1, junction: 2, crossing: 3, pavement: 4, pavementCorner: 5 };
      const listed = new Set<number>();
      for (const c of layer.cells) {
        listed.add(c.j * layer.w + c.i);
        expect(pic.cells[c.j * layer.w + c.i]).toBe(index[c.role]);
      }
      for (const b of layer.blocks) {
        for (let j = b.j0; j < b.j1; j++) for (let i = b.i0; i < b.i1; i++) {
          expect(listed.has(j * layer.w + i)).toBe(false);
          expect(pic.cells[j * layer.w + i]).toBe(6);
        }
      }
      // every lattice cell is a street cell or a block cell
      const blockCells = layer.blocks.reduce((n, b) => n + (b.i1 - b.i0) * (b.j1 - b.j0), 0);
      expect(listed.size + blockCells).toBe(layer.w * layer.h);
      // each of the seven kinds appears
      expect(new Set(pic.cells)).toEqual(new Set([0, 1, 2, 3, 4, 5, 6]));
    });
  }
});

describe("stage 1 layer shape", () => {
  it("is the lattice, the streets, every street cell once, the blocks and the sizes", () => {
    const layer = layerOf(3, 3, 1);
    expect(layer.stage).toBe("streets");
    expect(layer.streets).toHaveLength(8);
    expect(layer.blocks).toHaveLength(9);
    expect(layer.sizes.widths).toHaveLength(3);
    expect(layer.sizes.depths).toHaveLength(3);
    for (const c of layer.cells) {
      expect(c.i).toBeGreaterThanOrEqual(0);
      expect(c.i).toBeLessThan(layer.w);
      expect(c.j).toBeLessThan(layer.h);
      if (c.role === "junction" || c.role === "pavementCorner") expect(c.street).toBeNull();
      if (c.role === "crossing") expect(c.band).toBe(-1);
    }
  });
});

describe("stage 1 digest pins (R-4)", () => {
  const PINS: readonly (readonly [number, number, number, string])[] = [
    [3, 3, 1, "74b42aad"],
    [3, 3, 2, "c2d2b771"],
    [3, 3, 3, "bbc2ff15"],
    [6, 4, 1, "20192658"],
  ];
  for (const [x, z, s, digest] of PINS) {
    it(`${x} x ${z} seed ${s} has digest ${digest}`, () => {
      expect(city(x, z, s).plan.digests.streets).toBe(digest);
    });
  }
  it("the default city is 3 x 3 seed 1", () => {
    expect(runCity({}, "streets").plan.digests.streets).toBe(city(3, 3, 1).plan.digests.streets);
  });
});

describe("stage 1 at the largest size (R-7)", () => {
  it("runs on one 6 x 6 city, seed 1, and ends ok or with a stage failure, never an uncaught error", () => {
    const r = runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, "streets");
    if (!r.ok) {
      expect(r.failure.stage).toBe("streets");
      expect(r.failure.reason.startsWith("bug:")).toBe(false);
    } else {
      expect(r.plan.layers.streets!.blocks).toHaveLength(36);
    }
  });
});
