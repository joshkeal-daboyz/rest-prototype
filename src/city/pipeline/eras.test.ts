import { describe, expect, it } from "vitest";
import { BUILT_STAGES, ERA_STAGES, runCity, runCityEra } from "../stages";
import { CITY_ERA_STAGES, type CityEraLayers, type CityEraStage } from "../../core";
import { add, eraPlan, fixturePlan, history, k } from "./erafixtures";
import { assertEraReadable, resolveBefore, type CityEraStageDef } from "./eras";
import { CityStageError } from "./error";
import { EMPTY_CIRCUIT } from "./readable";
import type { CityStageDef } from "./types";

const SMALL = { blocksX: 1, blocksZ: 1, seed: 3 };
/** Only stage 1 as the clean list: a 1 x 1 city has no later stage to build, and these tests are about the era runner. */
const CLEAN: readonly CityStageDef[] = [BUILT_STAGES[0]!];
const emptyPicture = (stage: CityEraStage) => ({ stage, w: 0, h: 0, cells: [], points: [], legend: [{ name: "none", rgb: 0 }] });
/** A test double for an era stage: writes `layer` and records the layer names it was handed. */
function double<S extends CityEraStage>(name: S, layer: CityEraLayers[S], seen: string[][] = [], hook?: () => void): CityEraStageDef {
  return {
    name,
    run: (plan) => {
      seen.push(Object.keys(plan.layers));
      hook?.();
      return layer as never;
    },
    picture: () => emptyPicture(name),
  };
}
const hist = history([{ id: "district:a", blocks: ["block:0:0"] }]);
const tech = { stage: "tech", adds: [add("tech:a:1", k("a"), 1, 1)], changes: [] } as const;
const holdout = { stage: "holdout", adds: [], changes: [] } as const;
const ruin = { stage: "ruin", adds: [], changes: [] } as const;

describe("runCityEra (C1, criterion 3)", () => {
  it("a clean run, and runCity, call no era stage; the clean stage list holds none", () => {
    let calls = 0;
    const spies = CITY_ERA_STAGES.map((n) => double(n, { stage: n, districts: [], adds: [], changes: [] } as never, [], () => calls++));
    const r = runCityEra(SMALL, "clean", spies, CLEAN);
    expect(r.ok).toBe(true);
    expect(calls).toBe(0);
    expect(r.plan.layers).toEqual({});
    expect(runCity(SMALL, undefined, CLEAN).ok).toBe(true);
    expect(BUILT_STAGES.some((s) => (CITY_ERA_STAGES as readonly string[]).includes(s.name))).toBe(false);
    expect(ERA_STAGES.map((s) => s.name)).toEqual(CITY_ERA_STAGES.filter((n) => ERA_STAGES.some((s) => s.name === n)));
  });
  it("runCity until a clean stage runs exactly the clean stages; an era run's clean plan has the same digests", () => {
    const plain = runCity(SMALL, undefined, CLEAN);
    const viaEra = runCityEra(SMALL, "ruin", [], CLEAN);
    expect(viaEra.ok).toBe(true);
    expect(viaEra.plan.plan.digests).toEqual(plain.plan.digests);
    expect(Object.keys(runCity(SMALL, "streets").plan.layers)).toEqual(["streets"]);
  });
  it("runs history and the passes up to the era's last stage, each handed only the layers before it, each layer frozen with a digest", () => {
    const seen: string[][] = [];
    const stages = [double("ruin", ruin, seen), double("tech", tech, seen), double("history", hist, seen), double("holdout", holdout, seen)];
    const r = runCityEra(SMALL, "holdout", stages, CLEAN);
    expect(r.ok).toBe(true);
    expect(seen).toEqual([[], ["history"], ["history", "tech"]]);
    expect(Object.keys(r.plan.layers)).toEqual(["history", "tech", "holdout"]);
    expect(Object.keys(r.plan.digests)).toEqual(["history", "tech", "holdout"]);
    expect(r.plan.digests.tech).toMatch(/^[0-9a-f]{8}$/);
    expect(Object.isFrozen(r.plan.layers.tech)).toBe(true);
    expect(Object.isFrozen(r.plan.layers.tech!.adds[0])).toBe(true);
    expect(runCityEra(SMALL, "tech", stages, CLEAN).plan.layers.holdout).toBeUndefined();
  });
  it("runs while history is not built: the list may be empty or hold only some stages", () => {
    expect(runCityEra(SMALL, "ruin", [], CLEAN).plan.layers).toEqual({});
    expect(Object.keys(runCityEra(SMALL, "ruin", [double("tech", tech)], CLEAN).plan.layers)).toEqual(["tech"]);
  });
  it("a CityStageError is a failure naming the era stage; any other throw begins bug:", () => {
    const bad = double("tech", tech, [], () => {
      throw new CityStageError("T-1: a pole", [{ i: 1, j: 2 }]);
    });
    const r = runCityEra({ blocksX: 1, blocksZ: 1, seed: 7 }, "ruin", [double("history", hist), bad], CLEAN);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.failure).toEqual({ stage: "tech", seed: 7, blocksX: 1, blocksZ: 1, reason: "T-1: a pole", cells: [{ i: 1, j: 2 }] });
    expect(Object.keys(r.plan.layers)).toEqual(["history"]);
    const bug = runCityEra(SMALL, "tech", [double("tech", tech, [], () => {
      throw new Error("boom");
    })], CLEAN);
    expect(bug.ok === false && bug.failure.reason.startsWith("bug:")).toBe(true);
  });
  it("an era stage that writes into an earlier frozen layer fails the run", () => {
    const vandal: CityEraStageDef = {
      name: "tech",
      run: (plan) => {
        (plan.layers.history!.districts as unknown as unknown[]).push({});
        return tech as never;
      },
      picture: () => emptyPicture("tech"),
    };
    const r = runCityEra(SMALL, "tech", [double("history", hist), vandal], CLEAN);
    expect(r.ok === false && r.failure.stage === "tech" && r.failure.reason.startsWith("bug:")).toBe(true);
  });
  it("a failed clean stage is the run's failure, with no era stage run", () => {
    let calls = 0;
    const bad = { name: "land", run: () => { throw new CityStageError("V3: no alley"); }, picture: () => ({}) } as unknown as CityStageDef;
    const streets = BUILT_STAGES[0]!;
    const r = runCityEra(SMALL, "tech", [double("tech", tech, [], () => calls++)], [streets, bad]);
    expect(r.ok === false && r.failure.stage === "land").toBe(true);
    expect(calls).toBe(0);
  });
});

describe("the pass helpers (C1, criterion 5)", () => {
  const plan = fixturePlan();
  const ep = eraPlan(plan, { tech: { stage: "tech", adds: [add("tech:a:1", k("a"), 5, 5)], changes: [] } });
  it("resolveBefore gives the plan at the era before the pass", () => {
    expect(resolveBefore(ep, "tech").era).toBe("clean");
    expect(resolveBefore(ep, "holdout").adds.tech).toHaveLength(1);
    expect(resolveBefore(ep, "ruin").era).toBe("holdout");
  });
  it("assertEraReadable returns the resolved plan when T-1 and T-2 hold, and throws CityStageError naming the rule otherwise", () => {
    const own = { stage: "holdout" as const, adds: [add("holdout:b:1", k("box"), 20, 20)], changes: [] };
    const c = { ...EMPTY_CIRCUIT, poles: [{ id: "pole:1", x_m: 40, z_m: 40 }] };
    expect(assertEraReadable(ep, "holdout", own, { circuit: c }).adds.holdout).toHaveLength(1);
    const forced = { stage: "holdout" as const, adds: [add("holdout:b:1", k("box"), 40, 40)], changes: [] };
    expect(() => assertEraReadable(ep, "holdout", forced, { circuit: c })).toThrow(/^T-1/);
    expect(() => assertEraReadable(ep, "holdout", forced, { circuit: c })).toThrow(CityStageError);
  });
  it("assertEraReadable throws CityStageError for a change that cannot apply (X-2)", () => {
    const bad = { stage: "holdout" as const, adds: [], changes: [{ ref: { id: "nope" }, op: "remove" as const }] };
    expect(() => assertEraReadable(ep, "holdout", bad)).toThrow(/X-2/);
  });
});

describe("the era's last stage bounds the run", () => {
  it("with a pass missing, later passes still do not run: tech with history and holdout in the list writes no holdout layer", () => {
    const r = runCityEra(SMALL, "tech", [double("history", hist), double("holdout", holdout)], CLEAN);
    expect(r.ok).toBe(true);
    expect(Object.keys(r.plan.layers)).toEqual(["history"]);
  });
});
