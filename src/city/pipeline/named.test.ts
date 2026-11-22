import { describe, expect, it } from "vitest";
import type { CityPlan } from "../../core";
import { runCity } from "../stages";
import { streetsStageWith } from "../streets/stage";
import { BUILT_STAGES } from "../stages";
import type { CityStageDef } from "./types";
import { eraPlan } from "./erafixtures";
import { CELL_M, EMPTY_CIRCUIT, t1CleanClashes, t1Failures, t2Failures } from "./readable";
import { resolvePlan } from "./resolve";

/** The 20 named runs: 6 x 6 seeds 1 to 10, one-way off and on. Each built once for this file. */
const RUNS = (["on", "off"] as const).flatMap((way) => Array.from({ length: 10 }, (_, n) => ({ way, seed: n + 1 })));
const plans = new Map<string, CityPlan>();
const planOf = (way: "on" | "off", seed: number): CityPlan => {
  const id = `${way}:${seed}`;
  if (!plans.has(id)) {
    const stages: CityStageDef[] = way === "on" ? [...BUILT_STAGES] : [streetsStageWith(0) as unknown as CityStageDef, ...BUILT_STAGES.slice(1)];
    const r = runCity({ blocksX: 6, blocksZ: 6, seed }, undefined, stages);
    if (!r.ok) throw new Error(`${id}: ${r.failure.reason}`);
    plans.set(id, r.plan);
  }
  return plans.get(id)!;
};

describe("the 20 named runs (C1, criteria 2 and 4)", () => {
  for (const { way, seed } of RUNS) {
    it(`6 x 6 seed ${seed} one-way ${way}: clean resolves to the plan itself; T-1 and T-2 find nothing to fail`, () => {
      const plan = planOf(way, seed);
      const ep = eraPlan(plan, {});
      const clean = resolvePlan(ep, "clean");
      expect(clean.plan).toBe(plan);
      expect(clean.plan).toEqual(plan);
      expect(clean.plan.digests).toEqual(plan.digests);
      expect(clean.history).toBeNull();
      expect(clean.adds).toEqual({});
      expect(clean.states).toEqual([]);
      // an era above clean, with no era layer written, is the same plan (the passes are unbuilt)
      expect(resolvePlan(ep, "ruin").plan).toBe(plan);
      // Stage 6 is empty until K2, so there is no point to judge: both checks are empty, and so is the clean report.
      expect(t1Failures(clean)).toEqual([]);
      expect(t2Failures(clean)).toEqual([]);
      expect(t1CleanClashes(clean)).toEqual([]);
      // The cell convention T-2 reads: a prop's cell is where its position falls on the 5 m lattice.
      for (const p of plan.layers.ground!.props) {
        expect(Math.floor(p.placement.x_m / CELL_M)).toBe(p.cell.i);
        expect(Math.floor(p.placement.z_m / CELL_M)).toBe(p.cell.j);
      }
    });
  }
  it("T-2's walk graph joins every street cell of the clean city: hand-placed poles at the street cells' two ends and middle reach each other, on every run", () => {
    for (const { way, seed } of RUNS) {
      const plan = planOf(way, seed);
      const cells = plan.layers.streets!.cells;
      const at = (n: number) => ({ id: `pole:${n}`, x_m: (cells[n]!.i + 0.5) * CELL_M, z_m: (cells[n]!.j + 0.5) * CELL_M });
      const circuit = { ...EMPTY_CIRCUIT, poles: [at(0), at(Math.floor(cells.length / 2)), at(cells.length - 1)] };
      expect(t2Failures(resolvePlan(eraPlan(plan, {}), "clean"), { circuit }), `${way} ${seed}`).toEqual([]);
    }
  });
});

describe("runCityEra on a named run", () => {
  it("6 x 6 seed 1: an era run with no era stage built has the clean run's digests and no era layer", async () => {
    const { runCityEra } = await import("../stages");
    const plain = planOf("on", 1);
    const r = runCityEra({ blocksX: 6, blocksZ: 6, seed: 1 }, "tech", []);
    expect(r.ok).toBe(true);
    expect(r.plan.plan.digests).toEqual(plain.digests);
    expect(r.plan.layers).toEqual({});
  });
});
