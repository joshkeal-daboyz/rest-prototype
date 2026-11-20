import { describe, expect, it } from "vitest";
import type { CityPicture } from "../core";
import { BUILT_STAGES } from "../city/pipeline";
import { builtStageNames, lastGoodPicture, pictureToRgba, planShown, planViewRequested, wrapLines } from "./planview";

describe("planViewRequested", () => {
  it("is null unless city=plan", () => {
    expect(planViewRequested("")).toBeNull();
    expect(planViewRequested("?city=tiles")).toBeNull();
    expect(planViewRequested("?stage=streets")).toBeNull();
  });

  it("defaults to 3 x 3, seed 1 and the last built stage", () => {
    expect(planViewRequested("?city=plan")).toEqual({ blocksX: 3, blocksZ: 3, seed: 1, stage: BUILT_STAGES[BUILT_STAGES.length - 1]!.name, stageText: "" });
  });

  it("reads a stage by name or by number 1 to 8", () => {
    expect(planViewRequested("?city=plan&stage=streets")?.stage).toBe("streets");
    expect(planViewRequested("?city=plan&stage=STREETS")?.stage).toBe("streets");
    expect(planViewRequested("?city=plan&stage=1")?.stage).toBe("streets");
    expect(planViewRequested("?city=plan&stage=3")?.stage).toBe("mass");
    expect(planViewRequested("?city=plan&stage=8")?.stage).toBe("ground");
  });

  it("gives null for a stage that is not a plan stage", () => {
    for (const text of ["0", "9", "assemble", "roads", "-1", "1.5"]) {
      const r = planViewRequested(`?city=plan&stage=${text}`);
      expect(r?.stage).toBeNull();
      expect(r?.stageText).toBe(text);
    }
  });

  it("reads blocks and seed as city=tiles does", () => {
    expect(planViewRequested("?city=plan&stage=streets&blocks=6x4&seed=3")).toMatchObject({ blocksX: 6, blocksZ: 4, seed: 3 });
    expect(planViewRequested("?city=plan&blocks=9x0")).toMatchObject({ blocksX: 6, blocksZ: 1 });
    expect(planViewRequested("?city=plan&blocks=big&seed=abc")).toMatchObject({ blocksX: 3, blocksZ: 3, seed: 1 });
    expect(planViewRequested("?city=plan&seed=-7")?.seed).toBe(-7);
    expect(planViewRequested("?city=plan&seed=99999999999999999999")?.seed).toBe(1);
  });
});

/** A 3 x 2 picture: legend 0 black, 1 red, 2 green; one point of legend 2 in the middle of cell (1, 0); the last cell has an index outside the legend. */
const FIXTURE: CityPicture = {
  stage: "streets",
  w: 3,
  h: 2,
  cells: [0, 1, 0, 2, 0, 9],
  points: [{ x_m: 7.5, z_m: 2.5, legend: 2 }],
  legend: [
    { name: "a", rgb: 0x000000 },
    { name: "b", rgb: 0xff0000 },
    { name: "c", rgb: 0x00ff00 },
  ],
};

describe("pictureToRgba", () => {
  const px = (r: { width: number; data: Uint8ClampedArray }, x: number, y: number): number[] => Array.from(r.data.slice((y * r.width + x) * 4, (y * r.width + x) * 4 + 4));

  it("is cells times scale in each direction, 4 bytes a pixel", () => {
    const r = pictureToRgba(FIXTURE, 3);
    expect(r.width).toBe(9);
    expect(r.height).toBe(6);
    expect(r.data.length).toBe(9 * 6 * 4);
  });

  it("fills each cell with its legend colour, opaque", () => {
    const r = pictureToRgba(FIXTURE, 3);
    expect(px(r, 4, 0)).toEqual([255, 0, 0, 255]); // cell (1, 0)
    expect(px(r, 0, 0)).toEqual([0, 0, 0, 255]); // cell (0, 0)
    expect(px(r, 0, 3)).toEqual([0, 255, 0, 255]); // cell (0, 1)
    expect(px(r, 2, 2)).toEqual([0, 0, 0, 255]); // the cell's last pixel
  });

  it("shows an index outside the legend as magenta", () => {
    const r = pictureToRgba(FIXTURE, 3);
    expect(px(r, 8, 5)).toEqual([255, 0, 255, 255]);
  });

  it("draws a point as a small square over the cells", () => {
    const r = pictureToRgba(FIXTURE, 6); // a dot of 2 pixels, centred on (7.5 / 5 * 6, 2.5 / 5 * 6) = (9, 3)
    expect(px(r, 9, 3)).toEqual([0, 255, 0, 255]);
    expect(px(r, 8, 2)).toEqual([0, 255, 0, 255]);
    expect(px(r, 11, 0)).toEqual([255, 0, 0, 255]); // inside the red cell, away from the dot
  });

  it("treats a scale under 1 as 1 and rounds a fraction down", () => {
    expect(pictureToRgba(FIXTURE, 0).width).toBe(3);
    expect(pictureToRgba(FIXTURE, 2.9).width).toBe(6);
  });
});

describe("wrapLines", () => {
  it("wraps at spaces and splits a word longer than the line", () => {
    expect(wrapLines("one two three", 7)).toEqual(["one two", "three"]);
    expect(wrapLines("abcdefghij", 4)).toEqual(["abcd", "efgh", "ij"]);
    expect(wrapLines("", 10)).toEqual([]);
  });
});

describe("planShown", () => {
  it("draws the streets picture for a good city, with no banner", () => {
    const s = planShown(planViewRequested("?city=plan&stage=streets&blocks=3x3&seed=1")!);
    expect(s.banner).toBeNull();
    expect(s.picture?.stage).toBe("streets");
    expect(s.picture!.cells.length).toBe(s.picture!.w * s.picture!.h);
  });

  it("lists the built stages for an unknown stage and for one not built", () => {
    for (const text of ["bogus", "9", "mass"]) {
      const s = planShown(planViewRequested(`?city=plan&stage=${text}`)!);
      expect(s.picture).toBeNull();
      expect(s.banner).toContain(builtStageNames().join(", "));
    }
  });

  it("is what a 6 x 6 city runs to: a picture, or a banner naming stage and seed, never a throw", () => {
    const s = planShown(planViewRequested("?city=plan&stage=streets&blocks=6x6&seed=1")!);
    if (s.banner !== null) expect(s.banner).toMatch(/Stage streets failed \(seed 1/);
    else expect(s.picture).not.toBeNull();
  });
});

describe("lastGoodPicture", () => {
  it("is null when no layer was written", () => {
    expect(lastGoodPicture({ ok: false, plan: { options: { blocksX: 3, blocksZ: 3, seed: 1 }, layers: {}, digests: {} }, failure: { stage: "streets", seed: 1, blocksX: 3, blocksZ: 3, reason: "x", cells: [] } })).toBeNull();
  });
});
