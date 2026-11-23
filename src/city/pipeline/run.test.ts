import { describe, expect, it } from "vitest";
import type { CityLandLayer, CityPlan } from "../../core";
import { streetsStage } from "../streets/stage";
import { CityRunError, CityStageError } from "./error";
import { runCity } from "../stages";
import type { CityStageDef } from "./types";

const landLayer: CityLandLayer = { stage: "land", blocks: [], parts: [], lanes: [], parks: [] };
const emptyPicture = (): ReturnType<CityStageDef["picture"]> => ({ stage: "land", w: 0, h: 0, cells: [], points: [], legend: [{ name: "none", rgb: 0 }] });
const landStage = (run: (plan: CityPlan) => CityLandLayer): CityStageDef => ({ name: "land", run, picture: emptyPicture }) as unknown as CityStageDef;
const streets = streetsStage as unknown as CityStageDef;
const SMALL = { blocksX: 1, blocksZ: 1, seed: 1 };

describe("runCity (R-1, R-2)", () => {
  it("runs stage 1 and records its digest and a frozen layer", () => {
    const r = runCity(SMALL, "streets");
    expect(r.ok).toBe(true);
    expect(Object.keys(r.plan.layers)).toEqual(["streets"]);
    expect(r.plan.digests.streets).toMatch(/^[0-9a-f]{8}$/);
    expect(Object.isFrozen(r.plan.layers.streets)).toBe(true);
    expect(Object.isFrozen(r.plan.layers.streets!.cells)).toBe(true);
    expect(Object.isFrozen(r.plan.layers.streets!.streets[0])).toBe(true);
  });
  it("normalises the options (clamped blocks, integer seed)", () => {
    const r = runCity({ blocksX: 99, blocksZ: 0, seed: 2.9 }, undefined, []);
    expect(r.plan.options).toEqual({ blocksX: 6, blocksZ: 1, seed: 2 });
  });
  it("is a typed error when `until` is a stage that is not built", () => {
    expect(() => runCity(SMALL, "circuit")).toThrow(CityRunError);
  });
  it("hands each stage only the layers before it", () => {
    let seen: string[] = [];
    let seenDigests: string[] = [];
    const spy = landStage((plan) => {
      seen = Object.keys(plan.layers);
      seenDigests = Object.keys(plan.digests);
      return landLayer;
    });
    const r = runCity(SMALL, "land", [streets, spy]);
    expect(r.ok).toBe(true);
    expect(seen).toEqual(["streets"]);
    expect(seenDigests).toEqual(["streets"]);
    expect(Object.keys(r.plan.layers)).toEqual(["streets", "land"]);
  });
  it("stops at `until`", () => {
    let ran = false;
    const later = landStage(() => {
      ran = true;
      return landLayer;
    });
    const r = runCity(SMALL, "streets", [streets, later]);
    expect(r.ok).toBe(true);
    expect(ran).toBe(false);
  });
  it("catches a CityStageError as a failure with the stage, seed, blocks, reason and cells", () => {
    const bad = landStage(() => {
      throw new CityStageError("V3: no alley", [{ i: 4, j: 5 }]);
    });
    const r = runCity({ blocksX: 2, blocksZ: 3, seed: 7 }, undefined, [streets, bad]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.failure).toEqual({ stage: "land", seed: 7, blocksX: 2, blocksZ: 3, reason: "V3: no alley", cells: [{ i: 4, j: 5 }] });
    expect(Object.keys(r.plan.layers)).toEqual(["streets"]);
  });
  it("catches any other throw as a failure whose reason begins bug:", () => {
    const bad = landStage(() => {
      throw new Error("boom");
    });
    const r = runCity(SMALL, undefined, [streets, bad]);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.failure.stage).toBe("land");
      expect(r.failure.reason.startsWith("bug:")).toBe(true);
    }
  });
  it("R-1: a stage that assigns into plan.layers.streets fails the run, naming that stage", () => {
    const vandal = landStage((plan) => {
      (plan.layers.streets as unknown as { w: number }).w = 999;
      return landLayer;
    });
    const r = runCity(SMALL, undefined, [streets, vandal]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.failure.stage).toBe("land");
    expect(r.failure.reason.startsWith("bug:")).toBe(true);
    expect(r.plan.layers.streets!.w).not.toBe(999);
  });
  it("R-1: a stage that pushes into an earlier layer's list fails the run", () => {
    const vandal = landStage((plan) => {
      (plan.layers.streets!.cells as unknown as unknown[]).push({});
      return landLayer;
    });
    const r = runCity(SMALL, undefined, [streets, vandal]);
    expect(r.ok).toBe(false);
  });
  it("R-4: a test double for a later stage leaves every earlier digest equal to the standard run's", () => {
    const standard = runCity({ blocksX: 3, blocksZ: 3, seed: 2 });
    const doubled = runCity({ blocksX: 3, blocksZ: 3, seed: 2 }, "land", [streets, landStage(() => landLayer)]);
    expect(doubled.plan.digests.streets).toBe(standard.plan.digests.streets);
    expect(doubled.plan.digests.land).toMatch(/^[0-9a-f]{8}$/);
  });
  it("takes stages in any order and runs them in CITY_STAGES order", () => {
    const r = runCity(SMALL, "land", [landStage(() => landLayer), streets]);
    expect(Object.keys(r.plan.layers)).toEqual(["streets", "land"]);
  });
});
