/**
 * Ticket 073 F1, the reports (F1b3 on the hand-placed circuit of each pin city, and criterion 13, the numbers), printed and not asserted, moved here by ticket 079. Run with `npm run report`, which sets REST_CITIES=all.
 * Each builds its own runs through the era runner and the stage.
 */
import { describe, expect, it } from "vitest";
import type { CityEraPlan, CityRuinLayer } from "../../core";
import { stageRand } from "../pipeline/seeds";
import { PINNED } from "../testing/namedcities";
import { handCircuit } from "./fixtures";
import { buildRuin } from "./stage";
import { NAMED, eraRun, type City } from "./testcities";
import { yieldToWorker } from "../testing/yield";

interface Run {
  readonly city: City;
  readonly layer: CityRuinLayer;
  readonly stats: Readonly<Record<string, number>>;
  readonly ms: number;
}

/** The plan the ruin reads, for a city. */
function beforeOf(c: City): CityEraPlan {
  const run = eraRun(c, "ruin");
  return { plan: run.plan.plan, layers: { history: run.plan.layers.history!, tech: run.plan.layers.tech!, holdout: run.plan.layers.holdout! }, digests: {} };
}

const pinned = new Map<number, { plan: CityEraPlan }>();

describe("F1b3: the reports on the hand-placed circuit of each pin city (stage 6 is empty until K2; on the named runs these rows read 0)", { timeout: 900_000 }, () => {
  it("prints, per pin city, the trees placed, the crowns over each kind of circuit point and through a span, the crowns into a building, and the trees refused by the trunk rule", async () => {
    for (const c of PINNED) pinned.set(c.seed, { plan: beforeOf(c) });
    const lines: string[] = [];
    for (const [seed, p] of pinned) {
      const circuit = handCircuit(p.plan);
      const on = buildRuin(p.plan, stageRand("ruin", seed), { circuit });
      await yieldToWorker();
      const off = buildRuin(p.plan, stageRand("ruin", seed), { circuit, treesUnderSpans: false });
      await yieldToWorker();
      const trees = (b: typeof on): number => b.layer.adds.filter((a) => a.kind === "sapling" || a.kind === "park-tree").length;
      const s = on.stats;
      const g = (k: string): number => s[k] ?? 0;
      lines.push(
        `seed ${seed}: circuit poles ${circuit.poles.length}, lights ${circuit.lights.length}, lamp places ${circuit.lampPlaces.length}, drops ${circuit.drops.length}, spans ${circuit.lines.length}; trees placed ${trees(on)} (off: ${trees(off)}); crowns over a pole ${g("crownOverPole")}, a light ${g("crownOverLight")}, a lamp-post place ${g("crownOverLampPlace")}, a drop end ${g("crownOverDropEnd")}, through a span ${g("crownOverSpan")} (listed ${on.underSpanSpots.length}); crowns into a building ${g("crownIntoBuilding")}; refused by the trunk: building ${g("refusedTrunk:building")}, standing piece ${g("refusedTrunk:standing")}, circuit point ${g("refusedTrunk:circuit")}, T-2 ${g("leftOutT2:sapling") + g("leftOutT2:park-tree")}`,
      );
      expect(on.underSpanSpots).toHaveLength(g("crownOverSpan"));
      await yieldToWorker();
    }
    console.info(`F1b3 hand-placed circuit\n${lines.join("\n")}`);
    expect(lines).toHaveLength(4);
  });
});

describe("criterion 13: the numbers (reported, not asserted)", { timeout: 900_000 }, () => {
  const runs: Run[] = [];
  it("prints the cells grown, the pieces by kind, the patches, the vines by slot, the keys, what option G left out, the under-span set and the time per city", () => {
    for (const c of NAMED) {
      const before = beforeOf(c);
      const t = performance.now();
      const built = buildRuin(before, stageRand("ruin", c.seed));
      runs.push({ city: c, layer: built.layer, stats: built.stats, ms: performance.now() - t });
    }
    const range = (xs: number[]): string => `${Math.min(...xs)} to ${Math.max(...xs)}`;
    const total = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
    const kinds = ["patch", "clump", "sapling", "park-tree", "roof", "vine", "tree-vine"] as const;
    const count = (r: Run, k: string): number => r.layer.adds.filter((a) => a.kind === k).length;
    const stat = (r: Run, k: string): number => r.stats[k] ?? 0;
    const lines: string[] = [];
    lines.push(`pieces a city: ${range(runs.map((r) => r.layer.adds.length))} (total ${total(runs.map((r) => r.layer.adds.length))})`);
    lines.push(`soil cells a city: ${range(runs.map((r) => stat(r, "soil")))}`);
    const classes = ["lane", "parking", "junction", "crossing", "pavement", "open"];
    lines.push(`cells grown a city (all): ${range(runs.map((r) => total(classes.map((c) => stat(r, `grown:${c}`)))))}`);
    for (const c of classes) lines.push(`cells grown, ${c}: ${range(runs.map((r) => stat(r, `grown:${c}`)))}`);
    for (const k of kinds) lines.push(`${k}: ${range(runs.map((r) => count(r, k)))} (total ${total(runs.map((r) => count(r, k)))})`);
    lines.push(`park trees (giant, large): candidates ${range(runs.map((r) => stat(r, "candidates:park-tree")))}; placed ${range(runs.map((r) => count(r, "park-tree")))}; no room ${range(runs.map((r) => stat(r, "skippedFit:park-tree")))}`);
    lines.push(`patches that are overgrowth / mounds: ${range(runs.map((r) => stat(r, "patch:overgrowth")))} / ${range(runs.map((r) => stat(r, "patch:mound")))}`);
    lines.push(`vines by slot: roof edge ${range(runs.map((r) => stat(r, "vine:edge")))}; beside a drop ${range(runs.map((r) => stat(r, "vine:drop")))}; awning ${range(runs.map((r) => stat(r, "vine:awning")))}; canopy ${range(runs.map((r) => stat(r, "vine:canopy")))}; post ${range(runs.map((r) => stat(r, "vine:post")))}; tree-vines ${range(runs.map((r) => stat(r, "vine:tree")))}`);
    lines.push(`vine candidates (face / host / post / tree): ${range(runs.map((r) => stat(r, "candidates:vine-face")))} / ${range(runs.map((r) => stat(r, "candidates:vine-host")))} / ${range(runs.map((r) => stat(r, "candidates:vine-post")))} / ${range(runs.map((r) => stat(r, "candidates:tree-vine")))}`);
    lines.push(`crowns into a building a city (the trunk outside it; no circuit needed): ${range(runs.map((r) => stat(r, "crownIntoBuilding")))}; trees refused by the trunk: building ${range(runs.map((r) => stat(r, "refusedTrunk:building")))}, standing piece ${range(runs.map((r) => stat(r, "refusedTrunk:standing")))}`);
    lines.push(`crowns over a pole, light, lamp-post place, drop end or span (no circuit on the named runs: 0): ${range(runs.map((r) => stat(r, "crownOverPole") + stat(r, "crownOverLight") + stat(r, "crownOverLampPlace") + stat(r, "crownOverDropEnd") + stat(r, "crownOverSpan")))}`);
    lines.push(`distinct keys: ${range(runs.map((r) => new Set(r.layer.adds.map((a) => a.placement.key)).size))}`);
    lines.push(`left out for no room (patch / clump / sapling): ${range(runs.map((r) => stat(r, "skippedFit:patch")))} / ${range(runs.map((r) => stat(r, "skippedFit:clump")))} / ${range(runs.map((r) => stat(r, "skippedFit:sapling")))}`);
    lines.push(`left out by option G (T-2), per run: patch ${range(runs.map((r) => stat(r, "leftOutT2:patch")))}, sapling ${range(runs.map((r) => stat(r, "leftOutT2:sapling")))}, clump ${range(runs.map((r) => stat(r, "leftOutT2:clump")))} (no circuit on the named runs until K2: so none)`);
    lines.push(`under-span set (B8): ${range(runs.map((r) => stat(r, "underSpanSpots")))} (no circuit on the named runs until K2: so none)`);
    const roofKeys = [...new Set(runs.flatMap((r) => r.layer.adds.filter((a) => a.kind === "roof").map((a) => a.placement.key.split("SM_")[1]!)))].sort();
    lines.push(`roof pieces a city (RUIN_ROOF_GROWTH on as built): ${range(runs.map((r) => count(r, "roof")))}`);
    for (const k of roofKeys) lines.push(`  roof ${k}: ${range(runs.map((r) => r.layer.adds.filter((a) => a.kind === "roof" && a.placement.key.endsWith(k)).length))}`);
    lines.push(`time a city (the stage alone): ${range(runs.map((r) => Math.round(r.ms)))} ms`);
    console.info(`F1 numbers\n${lines.join("\n")}`);
    expect(lines.length).toBeGreaterThan(10);
  });
});
