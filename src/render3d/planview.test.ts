import { describe, expect, it } from "vitest";
import { CITY_STAGES } from "../core";
import type { CityPicture } from "../core";
import { BUILT_STAGES } from "../city/pipeline";
import { builtStageNames, lastGoodPicture, legendColumnWidth, planHidesHud, pictureToRgba, planShown, planViewRequested, wrapLines } from "./planview";

describe("planViewRequested", () => {
  it("is null unless city=plan", () => {
    expect(planViewRequested("")).toBeNull();
    expect(planViewRequested("?city=tiles")).toBeNull();
    expect(planViewRequested("?stage=streets")).toBeNull();
  });

  it("defaults to 6 x 6, seed 1 and the last built stage", () => {
    expect(planViewRequested("?city=plan")).toEqual({ blocksX: 6, blocksZ: 6, seed: 1, stage: BUILT_STAGES[BUILT_STAGES.length - 1]!.name, stageText: "", era: "clean" });
  });

  it("reads a stage by name or by number 1 to 8", () => {
    expect(planViewRequested("?city=plan&stage=streets")?.stage).toBe("streets");
    expect(planViewRequested("?city=plan&stage=STREETS")?.stage).toBe("streets");
    expect(planViewRequested("?city=plan&stage=1")?.stage).toBe("streets");
    expect(planViewRequested("?city=plan&stage=3")?.stage).toBe("mass");
    expect(planViewRequested("?city=plan&stage=8")?.stage).toBe("ground");
  });

  it("gives null for a stage that is not a plan stage", () => {
    for (const text of ["0", "10", "assemble", "roads", "-1", "1.5"]) {
      const r = planViewRequested(`?city=plan&stage=${text}`);
      expect(r?.stage).toBeNull();
      expect(r?.stageText).toBe(text);
    }
  });

  it("reads blocks and seed as city=tiles does", () => {
    expect(planViewRequested("?city=plan&stage=streets&blocks=6x4&seed=3")).toMatchObject({ blocksX: 6, blocksZ: 4, seed: 3 });
    expect(planViewRequested("?city=plan&blocks=9x0")).toMatchObject({ blocksX: 6, blocksZ: 1 });
    expect(planViewRequested("?city=plan&blocks=big&seed=abc")).toMatchObject({ blocksX: 6, blocksZ: 6, seed: 1 });
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
    const unbuilt = CITY_STAGES.find((name) => !builtStageNames().includes(name));
    for (const text of unbuilt === undefined ? ["bogus", "10"] : ["bogus", "10", unbuilt]) {
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

describe("planHidesHud", () => {
  it.each([
    "?view=3d&city=plan&stage=streets",
    "?view=3d&city=plan&stage=1&blocks=6x4&seed=3",
    "?view=3d&city=plan",
    "?view=3d&city=plan&stage=nope",
  ])("hides the HUD on %s in a dev build", (search) => {
    expect(planHidesHud(search, true)).toBe(true);
  });

  it.each([
    ["?view=3d&city=plan&stage=streets", false],
    ["?city=plan&stage=streets", true],
    ["?view=3d&city=tiles-old", true], // was city=tiles: that address is the pipeline's city since ticket 070 L1 (criterion 3)
    ["?view=3d", true],
    ["?view=3d&gallery=city", true],
    ["", true],
  ] as const)("keeps the HUD on %j (dev %s)", (search, dev) => {
    expect(planHidesHud(search, dev)).toBe(false);
  });
});

describe("planHidesHud on city=tiles (ticket 070 L1, criterion 3)", () => {
  it.each(["?view=3d&city=tiles", "?view=3d&city=tiles&blocks=5x4&seed=2", "?view=3d&city=tiles&cam=street"])("hides the HUD on %s in a dev build", (search) => {
    expect(planHidesHud(search, true)).toBe(true);
  });

  it.each([
    ["?view=3d&city=tiles&sheet=1", true],
    ["?view=3d&city=tiles-old", true],
    ["?view=3d&city=tiles-old&sheet=1", true],
    ["?view=3d&city=tiles", false],
    ["?city=tiles", true],
  ] as const)("keeps the HUD on %j (dev %s)", (search, dev) => {
    expect(planHidesHud(search, dev)).toBe(false);
  });
});

describe("legendColumnWidth (ticket 070 L1, criterion 4)", () => {
  const GROUND_LEGEND = ["nothing", "pavement run", "tree", "bench", "bin", "planter or pot plant", "mailbox or newspaper box", "meter", "hydrant", "bus stop", "bollard", "lot piece", "plaza piece"];
  const measure = (name: string, font: number): number => name.length * font * 0.6;

  it("is never under today's Math.max(120, font x 9)", () => {
    for (const font of [14, 17, 20]) expect(legendColumnWidth(["a"], font, measure)).toBe(Math.max(120, Math.round(font * 9)));
    expect(legendColumnWidth([], 14, measure)).toBe(126);
  });

  it("is the widest name plus the swatch and its gap when that is wider", () => {
    const font = 14;
    const w = legendColumnWidth(GROUND_LEGEND, font, measure);
    expect(w).toBeGreaterThanOrEqual(measure("mailbox or newspaper box", font) + font + 6);
  });

  it.each([1000, 390])("draws no two names of the stage=ground legend over each other at %i px wide", (cssW) => {
    const pad = 12;
    const font = Math.max(14, Math.min(20, Math.round(cssW / 28)));
    const colW = legendColumnWidth(GROUND_LEGEND, font, measure);
    const cols = Math.max(1, Math.floor((cssW - 2 * pad) / colW));
    // Where each name is drawn: the same arithmetic as the painter's (swatch, gap, then the name).
    const span = (k: number): { row: number; left: number; right: number } => {
      const left = pad + (k % cols) * colW + font + 6;
      return { row: Math.floor(k / cols), left, right: left + measure(GROUND_LEGEND[k]!, font) };
    };
    for (let a = 0; a < GROUND_LEGEND.length; a++) {
      for (let b = a + 1; b < GROUND_LEGEND.length; b++) {
        const A = span(a);
        const B = span(b);
        if (A.row !== B.row) continue;
        expect(A.right <= B.left - font - 6 || B.right <= A.left - font - 6, `${GROUND_LEGEND[a]} / ${GROUND_LEGEND[b]}`).toBe(true);
      }
    }
    const mailbox = span(GROUND_LEGEND.indexOf("mailbox or newspaper box"));
    const meter = span(GROUND_LEGEND.indexOf("meter"));
    if (mailbox.row === meter.row) expect(mailbox.right).toBeLessThanOrEqual(meter.left - font - 6);
  });
});
