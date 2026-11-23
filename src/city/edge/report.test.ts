/**
 * Stage 4, section D1b, criterion 8's report (HEAVY: 100 runs; its own file, a 120 s timeout). It measures P1 to P6 on the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on) and on the outside cities (3 x 3 and 6 x 4
 * seeds 1 to 20, off and on) and prints the table. The named runs must hold. The outside cities are reported, never pinned: no outside city is named by an expectation here, and nothing is tuned for them.
 */
import { describe, expect, it } from "vitest";
import { landStage } from "../land/stage";
import { massStage } from "../mass/stage";
import type { CityStageDef } from "../pipeline/types";
import { runCity } from "../stages";
import { sharedCity } from "../testing/namedcities";
import { streetsStageWith } from "../streets/stage";
import { edgeMetrics, edgeVerdicts, supplyOverDemand } from "./check";
import { edgeStage } from "./stage";

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

const offStages = (): CityStageDef[] => [streetsStageWith(0) as unknown as CityStageDef, landStage as unknown as CityStageDef, massStage as unknown as CityStageDef, edgeStage as unknown as CityStageDef];

interface Row {
  readonly text: string;
  /** Stages 1 to 3 laid the city and every check held, and the stage returned ok. */
  readonly pass: boolean;
  readonly p1: number | null;
}
function measure(o: City): Row {
  const options = { blocksX: o.blocksX, blocksZ: o.blocksZ, seed: o.seed };
  const r = o.blocksX === 6 && o.blocksZ === 6 ? sharedCity(o, "edge") : o.way === "on" ? runCity(options, "edge") : runCity(options, "edge", offStages());
  if (!r.ok) return { text: `fail at ${r.failure.stage}: ${r.failure.reason.slice(0, 100)}`, pass: false, p1: null };
  const { streets, mass, edge } = r.plan.layers;
  const m = edgeMetrics(edge!, streets!, mass!, options);
  const v = edgeVerdicts(m);
  return { text: `${v.map((x) => `${x.id}=${x.id === "P6" ? x.value.toFixed(2) : x.value}`).join(" ")} s/d=${supplyOverDemand(m).toFixed(3)} (${m.kerbBays}/${m.bayDemand.toFixed(1)}) short=${edge!.blocks.filter((b) => b.shortTiles > 0).length}`, pass: v.every((x) => x.pass), p1: v[0]!.value };
}

describe("criterion 8's report: P1 to P6 on the named runs and the outside cities", { timeout: 120_000 }, () => {
  it("prints the table; the 20 named runs hold", () => {
    const lines: string[] = [];
    for (const o of NAMED) {
      const row = measure(o);
      lines.push(`${label(o).padEnd(14)} ${row.text}`);
      expect(row.pass, label(o)).toBe(true);
    }
    console.log(`D1b REPORT, named\n${lines.join("\n")}`);
  });

  it("prints the outside cities' counts, reported and not asserted", () => {
    const lines: string[] = [];
    const counts = new Map<string, { pass: number; total: number }>();
    for (const o of OUTSIDE) {
      const row = measure(o);
      const k = `${o.blocksX}x${o.blocksZ} ${o.way}`;
      const c = counts.get(k) ?? { pass: 0, total: 0 };
      c.total++;
      if (row.pass) c.pass++;
      else lines.push(`${label(o).padEnd(14)} ${row.text}`);
      counts.set(k, c);
    }
    console.log(`D1b REPORT, outside: ${[...counts].map(([k, c]) => `${k} ${c.pass}/${c.total}`).join(", ")}\nnot passing:\n${lines.join("\n")}`);
  });
});
