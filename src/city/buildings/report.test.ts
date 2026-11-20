/**
 * Stage 5, section F1, criterion 6's report (HEAVY: 100 runs; its own file, a 120 s timeout). For each of the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on) it prints the buildings (leading and following),
 * the rows, the tight corners (Ls), the through share, the storey histogram, the shortest and longest row stretch, and R2, R13 and M4c. For the outside cities (3 x 3 and 6 x 4, seeds 1 to 20, off and on) it prints
 * whether stage 5 is ok, and its failure if not. The named runs must be ok (R-2). Nothing about an outside city is asserted, and nothing is tuned for one.
 *
 * Stages 1 to 3 and 5 are run; stage 4 (edge) is left out, because stage 5 reads no edge layer and the buildings layer does not depend on it.
 */
import { describe, expect, it } from "vitest";
import type { CityPlanRun } from "../../core";
import { landStage } from "../land/stage";
import { massStage } from "../mass/stage";
import type { CityStageDef } from "../pipeline/types";
import { runCity } from "../stages";
import { streetsStage, streetsStageWith } from "../streets/stage";
import { buildingFailures, neighbourShares } from "./check";
import { CITY_STOREYS } from "./constants";
import { buildingsStage } from "./stage";

interface City {
  readonly blocksX: number;
  readonly blocksZ: number;
  readonly seed: number;
  readonly way: "on" | "off";
}
const NAMED: City[] = [];
for (const way of ["on", "off"] as const) for (let seed = 1; seed <= 10; seed++) NAMED.push({ blocksX: 6, blocksZ: 6, seed, way });
const OUTSIDE: City[] = [];
for (const [blocksX, blocksZ] of [
  [3, 3],
  [6, 4],
] as const)
  for (const way of ["off", "on"] as const) for (let seed = 1; seed <= 20; seed++) OUTSIDE.push({ blocksX, blocksZ, seed, way });
const label = (o: City): string => `${o.blocksX}x${o.blocksZ} s${o.seed} ${o.way}`;

const stagesOf = (way: "on" | "off"): CityStageDef[] => [(way === "on" ? streetsStage : streetsStageWith(0)) as unknown as CityStageDef, landStage as unknown as CityStageDef, massStage as unknown as CityStageDef, buildingsStage as unknown as CityStageDef];
const runOf = (o: City): CityPlanRun => runCity({ blocksX: o.blocksX, blocksZ: o.blocksZ, seed: o.seed }, "buildings", stagesOf(o.way));

function measure(o: City): { text: string; ok: boolean } {
  const r = runOf(o);
  if (!r.ok) return { text: `fail at ${r.failure.stage}: ${r.failure.reason.slice(0, 140)}`, ok: false };
  const { land, mass, buildings } = r.plan.layers;
  const input = { land: land!, mass: mass! };
  const failures = buildingFailures(buildings!, input);
  const followers = buildings!.buildings.filter((b) => b.back !== null);
  const through = followers.filter((b) => b.back === "through").length;
  const hist: number[] = [];
  for (let s = CITY_STOREYS.min; s <= CITY_STOREYS.max; s++) hist.push(buildings!.buildings.filter((b) => b.storeys === s).length);
  const ls = buildings!.buildings.filter((b) => b.bend !== null).length;
  // Row stretches: maximal runs of consecutive cells of one row held by its buildings.
  const lens: number[] = [];
  for (const row of buildings!.rows) {
    const cells = buildings!.buildings.filter((b) => b.rowId === row.id).flatMap((b) => b.cells.filter((_, n) => b.bend === null || n < 2));
    const along = row.front === "-x" || row.front === "+x" ? (c: { i: number; j: number }) => c.j : (c: { i: number; j: number }) => c.i;
    const at = cells.map(along).sort((a, b) => a - b);
    let run = 0;
    for (let n = 0; n < at.length; n++) {
      run = n > 0 && at[n] === at[n - 1]! + 1 ? run + 1 : 1;
      if (n === at.length - 1 || at[n + 1] !== at[n]! + 1) lens.push(run);
    }
  }
  const sh = neighbourShares(buildings!, input);
  const count = (c: string): number => failures.filter((f) => f.check === c).length;
  return {
    text: `buildings ${buildings!.buildings.length} (${buildings!.buildings.length - followers.length} lead, ${followers.length} follow) rows ${buildings!.rows.length} L ${ls} through ${through}/${followers.length}=${(through / Math.max(1, followers.length)).toFixed(3)} storeys ${hist.join("/")} stretch ${Math.min(...lens)}..${Math.max(...lens)} pairs ${sh.pairs} R2 ${sh.r2} R13 ${sh.r13} M4c-fails ${count("M4c")} all-fails ${failures.length}`,
    ok: failures.length === 0,
  };
}

describe("criterion 6's report: stage 5 on the named runs and the outside cities", { timeout: 120_000 }, () => {
  it("prints the table; the 20 named runs are ok", () => {
    const lines: string[] = [];
    for (const o of NAMED) {
      const row = measure(o);
      lines.push(`${label(o).padEnd(14)} ${row.text}`);
      expect(row.ok, label(o)).toBe(true);
    }
    console.log(`F1 REPORT, named\n${lines.join("\n")}`);
  });

  it("prints the outside cities' counts, reported and not asserted", () => {
    const lines: string[] = [];
    const tally: Record<string, { ok: number; fail: number; noMass: number }> = {};
    for (const o of OUTSIDE) {
      const key = `${o.blocksX}x${o.blocksZ} ${o.way}`;
      const t = (tally[key] ??= { ok: 0, fail: 0, noMass: 0 });
      const r = runOf(o);
      if (r.ok) {
        t.ok++;
      } else if (r.failure.stage === "buildings") {
        t.fail++;
        lines.push(`${label(o)}: buildings failed: ${r.failure.reason.slice(0, 140)}`);
      } else {
        t.noMass++;
      }
    }
    console.log(`F1 REPORT, outside\n${Object.entries(tally).map(([k, v]) => `${k}: stage 5 ok ${v.ok}, failed ${v.fail}, never reached ${v.noMass}`).join("\n")}\n${lines.join("\n")}`);
  });
});
