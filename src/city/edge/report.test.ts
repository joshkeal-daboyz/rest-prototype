/**
 * Stage 4, section D1, criterion 4's report (HEAVY: 40 cities, each laid on the old path and on the pipeline; its own file, a 120 s timeout). It measures P1 to P6 on the 13 named cities and on 3 x 3 seeds 11 to 20 and
 * 6 x 4 seeds 4 to 20, old path (`tileCity`) beside the pipeline, and prints the table. The named cities must hold. The others are reported, never pinned: no city outside the named ones is named by an expectation here.
 */
import { describe, expect, it } from "vitest";
import { evaluateParking, parkingMetrics } from "../../render3d/parkmetrics";
import { tileCity } from "../../render3d/tilecity";
import { runCity } from "../stages";
import { buildEdge } from "./band";
import { edgeVerdicts, edgeMetrics, supplyOverDemand } from "./check";
import { stageRand } from "../pipeline/seeds";

interface City {
  readonly blocksX: number;
  readonly blocksZ: number;
  readonly seed: number;
}
const NAMED: City[] = [];
for (let seed = 1; seed <= 10; seed++) NAMED.push({ blocksX: 3, blocksZ: 3, seed });
for (let seed = 1; seed <= 3; seed++) NAMED.push({ blocksX: 6, blocksZ: 4, seed });
const OTHERS: City[] = [];
for (let seed = 11; seed <= 20; seed++) OTHERS.push({ blocksX: 3, blocksZ: 3, seed });
for (let seed = 4; seed <= 20; seed++) OTHERS.push({ blocksX: 6, blocksZ: 4, seed });
const label = (o: City): string => `${o.blocksX}x${o.blocksZ} s${o.seed}`;

function oldPath(o: City): string {
  const city = tileCity(o);
  const v = evaluateParking(parkingMetrics(city));
  const m = parkingMetrics(city);
  return `old ${v.filter((x) => x.id !== "P2").map((x) => `${x.id}=${x.id === "P6" ? x.value.toFixed(2) : x.value}`).join(" ")} s/d=${(m.bayDemand > 0 ? m.kerbBays / m.bayDemand : 1).toFixed(3)}`;
}
function pipeline(o: City): { text: string; p1: number | null; ok: boolean } {
  const r = runCity(o, "mass");
  if (!r.ok) return { text: `pipe mass failed: ${r.failure.reason.slice(0, 90)}`, p1: null, ok: false };
  const { streets, land, mass } = r.plan.layers;
  const edge = buildEdge(streets!, land!, mass!, o, stageRand("edge", o.seed));
  const m = edgeMetrics(edge, streets!, mass!, o);
  const v = edgeVerdicts(m);
  return { text: `pipe ${v.map((x) => `${x.id}=${x.id === "P6" ? x.value.toFixed(2) : x.value}`).join(" ")} s/d=${supplyOverDemand(m).toFixed(3)}`, p1: v[0]!.value, ok: v.every((x) => x.pass) };
}

describe("criterion 4's report: P1 to P6, old path beside pipeline", { timeout: 120_000 }, () => {
  it("prints the table; the 13 named cities hold on the pipeline", () => {
    const lines: string[] = [];
    for (const o of [...NAMED, ...OTHERS]) {
      const p = pipeline(o);
      lines.push(`${label(o).padEnd(8)} ${oldPath(o)} | ${p.text}`);
      if (NAMED.includes(o)) expect(p.ok, label(o)).toBe(true);
    }
    console.log(`D1 REPORT\n${lines.join("\n")}`);
  });
});
