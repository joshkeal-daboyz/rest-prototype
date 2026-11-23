/**
 * The clean clash report (ticket 073 C1, moved here by ticket 079): `t1CleanClashes` per named run, printed and not asserted. Run it with `npm run report`.
 */
import { describe, expect, it } from "vitest";
import { runCity, BUILT_STAGES } from "../stages";
import { streetsStageWith } from "../streets/stage";
import { NAMED } from "../testing/namedcities";
import type { CityStageDef } from "./types";
import { eraPlan } from "./erafixtures";
import { t1CleanClashes } from "./readable";
import { resolvePlan } from "./resolve";

describe("the clean clash report", () => {
  it("is reported per run (not asserted; empty until K2 gives stage 6 a layer)", { timeout: 120_000 }, () => {
    const clashes: number[] = [];
    for (const { way, seed } of NAMED) {
      const stages: CityStageDef[] = way === "on" ? [...BUILT_STAGES] : [streetsStageWith(0) as unknown as CityStageDef, ...BUILT_STAGES.slice(1)];
      const r = runCity({ blocksX: 6, blocksZ: 6, seed }, undefined, stages);
      if (!r.ok) throw new Error(`${way}:${seed}: ${r.failure.reason}`);
      clashes.push(t1CleanClashes(resolvePlan(eraPlan(r.plan, {}), "clean")).length);
    }
    console.log(`t1CleanClashes per named run: ${clashes.join(", ")}`);
    expect(clashes.every((n) => n >= 0)).toBe(true);
  });
});
