/**
 * Ticket 073 F1, criteria 8, 11 and 13 on the named runs (6 x 6 seeds 1 to 10, one-way off and on): the stage runs through the era runner, T-1 and T-2 hold, the clean layers and the earlier passes' layers are as they
 * were, the layer is frozen, the digest of the "growth" part is pinned on the four pin cities, and the numbers are printed (reported, not asserted).
 *
 * Until K2 gives stage 6 its layer, the circuit is empty on these runs: T-1, T-2, option G and the under-span set find no pole, light, lamp-post place, drop or span to judge (so nothing is left out and the
 * under-span set is empty). They are proven on fixtures in `grow.test.ts`, `walk.test.ts` and `stage.test.ts`. Each city is built once for this file.
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { CITY_RUIN_STEP_OF, CITY_RUIN_STEPS, CITY_STAGES, type CityEraPlan, type CityPlanStage, type CityRuinLayer } from "../../core";
import { digestOf } from "../pipeline/digest";
import { resolveBefore } from "../pipeline/eras";
import { boxHit, s7Boxes } from "../tech/boxes";
import { stageRand } from "../pipeline/seeds";
import { BUILT_STAGES, ERA_STAGES, runCity, runCityEra } from "../stages";
import { KIT_KEYS } from "./kit";
import { buildRuin, ruinStage, stepPart } from "./stage";
import { NAMED, PINNED, eraRun, label, type City } from "./testcities";

interface Run {
  readonly city: City;
  readonly layer: CityRuinLayer;
  readonly digest: string;
  readonly cleanOk: boolean;
  readonly frozen: boolean;
  readonly stats: Readonly<Record<string, number>>;
  readonly roofsOn: number;
  readonly ms: number;
  readonly earlierOk: boolean;
  readonly wild: ReadonlyMap<string, number>;
  readonly before: CityEraPlan;
}

/**
 * Re-taken in F1b2 (22 Nov 2026) for Josh's two rulings: roof growth on ("Yes, switch it on") and ruin trees under spans ("Through any dead line", "Poles too"); the roof pieces move the growth digests. FLAG for K2 and F2g: a tree may now stand over a job's own pole, line or drop end; each cut should say whether that stays, is listed for the puzzle-designer, or goes back to Josh.
 * What the pin test pins: the digest of the layer's "growth" part on each pin city, one-way on (taken 22 Nov 2026 night, on the clean city, `history`, the tech and hold-out layers, and no circuit. Re-taken when D2,
 * E1 or E2's barricade step changes what stands before it, and when K2's circuit lands: the ruin-pass, in a one-line follow-up named in that merge).
 */
const PIN_GROWTH: Readonly<Record<number, string>> = {
  1: "e51a4fe7",
  2: "ca840282",
  3: "50153fce",
  8: "47ee6639",
};

const CLEAN_STAGES = CITY_STAGES.filter((s): s is CityPlanStage => s !== "assemble");
const runs: Run[] = [];
const pinned = new Map<number, { plan: CityEraPlan; layer: CityRuinLayer }>();

describe("the named runs (X-4, X-1, R-1)", { timeout: 1_800_000 }, () => {
  it("builds the 20 named cities through the era runner: the stage returns on every one, so T-1 and T-2 held", () => {
    for (const c of NAMED) {
      const run = eraRun(c, "ruin");
      const layer = run.plan.layers.ruin;
      expect(layer, label(c)).toBeDefined();
      const before: CityEraPlan = { plan: run.plan.plan, layers: { history: run.plan.layers.history!, tech: run.plan.layers.tech!, holdout: run.plan.layers.holdout! }, digests: {} };
      const t = performance.now();
      const rebuilt = buildRuin(before, stageRand("ruin", c.seed));
      const ms = performance.now() - t;
      expect(JSON.stringify(rebuilt.layer), label(c)).toBe(JSON.stringify(layer));
      const roofsOn = buildRuin(before, stageRand("ruin", c.seed), { roofGrowth: true }).layer.adds.filter((a) => a.kind === "roof").length;
      // X-1: no clean layer moved while the eras ran (each digest is of the layer as its stage wrote it)
      const cleanOk = CLEAN_STAGES.filter((s) => run.plan.plan.digests[s] !== undefined).every((s) => digestOf(run.plan.plan.layers[s]) === run.plan.plan.digests[s]);
      // the earlier passes' layers are as the run recorded them: the tech and hold-out digests equal the digests of the layers the ruin read
      const earlierOk = digestOf(run.plan.layers.tech) === run.plan.digests.tech && digestOf(run.plan.layers.holdout) === run.plan.digests.holdout && digestOf(run.plan.layers.history) === run.plan.digests.history;
      runs.push({
        city: c,
        layer: layer!,
        digest: run.plan.digests.ruin!,
        cleanOk,
        frozen: Object.isFrozen(layer) && Object.isFrozen(layer!.adds) && (layer!.adds.length === 0 || Object.isFrozen(layer!.adds[0])),
        stats: rebuilt.stats,
        roofsOn,
        ms,
        earlierOk,
        before,
        wild: new Map(run.plan.layers.history!.districts.map((d) => [d.id, d.wild] as const)),
      });
      if (PINNED.some((p) => p.seed === c.seed) && c.way === "on") pinned.set(c.seed, { plan: before, layer: layer! });
    }
    expect(runs).toHaveLength(20);
  });

  it("every layer is frozen (R-1) with the digest the runner recorded; every clean digest, and the history, tech and hold-out layers' digests, are as their stages wrote them (X-1)", () => {
    for (const r of runs) {
      expect(r.frozen, label(r.city)).toBe(true);
      expect(r.cleanOk, label(r.city)).toBe(true);
      expect(r.earlierOk, label(r.city)).toBe(true);
      expect(r.digest, label(r.city)).toBe(digestOf(r.layer));
    }
  });

  it("each layer meets the layer rules: unique ids, no change, only kit keys, steps summing, every kind in its step", () => {
    for (const r of runs) {
      const l = r.layer;
      const ids = l.adds.map((a) => a.id);
      expect(new Set(ids).size, label(r.city)).toBe(ids.length);
      expect(l.adds.length, label(r.city)).toBeGreaterThan(300);
      for (const s of CITY_RUIN_STEPS) for (const a of stepPart(l, s).adds) expect(CITY_RUIN_STEP_OF[a.kind]).toBe(s);
      for (const a of l.adds) expect(KIT_KEYS.has(a.placement.key), a.placement.key).toBe(true);
      expect(l.changes).toEqual([]);
      expect(l.steps!.map((s) => s.step)).toEqual([...CITY_RUIN_STEPS]);
      expect(l.steps![1]).toEqual({ step: "remnants", adds: 0, changes: 0 });
      expect(l.steps!.reduce((n, s) => n + s.adds, 0)).toBe(l.adds.length);
    }
  });

  it("no non-patch add meets a stage 7 piece (the tech pass's own boxes, read from the plan's layers), a ground prop, a traffic piece, or an earlier era's add; a patch meets none of them but a ground piece's lower part", () => {
    const eps = 1e-6;
    const meets = (a: CityRuinLayer["adds"][number], r: { x0: number; x1: number; z0: number; z1: number }, y0: number, y1: number): boolean => {
      const hx = a.size.x_m / 2;
      const hz = a.size.z_m / 2;
      return a.placement.x_m - hx < r.x1 - eps && a.placement.x_m + hx > r.x0 + eps && a.placement.z_m - hz < r.z1 - eps && a.placement.z_m + hz > r.z0 + eps && a.placement.y_m < y1 - eps && a.placement.y_m + a.size.h_m > y0 + eps;
    };
    for (const r of runs) {
      const resolved = resolveBefore(r.before, "ruin");
      const L = resolved.plan.layers;
      const boxes = s7Boxes({ facades: L.facades! });
      const earlier = [...(resolved.adds.tech ?? []), ...(resolved.adds.holdout ?? [])];
      const ground = [...(L.ground?.props ?? []).filter((p) => !p.flat), ...(L.traffic?.pieces ?? [])];
      const bad: string[] = [];
      for (const a of r.layer.adds) {
        if (a.kind === "roof") continue;
        const hostVine = a.kind === "vine" && /^ruin:vine:(awning|canopy):/.test(a.id);
        const rect = { x0: a.placement.x_m - a.size.x_m / 2, x1: a.placement.x_m + a.size.x_m / 2, z0: a.placement.z_m - a.size.z_m / 2, z1: a.placement.z_m + a.size.z_m / 2 };
        if (a.kind !== "patch" && !hostVine && !a.id.startsWith("ruin:tree-vine:") && !a.id.startsWith("ruin:vine:post:")) {
          const hit = boxHit(boxes, rect, a.placement.y_m + eps, a.placement.y_m + a.size.h_m - eps);
          if (hit !== null) bad.push(`${a.id} meets stage 7 ${hit.src}`);
        }
        const exempt = a.id.startsWith("ruin:tree-vine:") || a.id.startsWith("ruin:vine:post:"); // they hang on their own tree or post
        for (const e of earlier) {
          if (exempt) continue;
          if (meets(a, { x0: e.placement.x_m - e.size.x_m / 2, x1: e.placement.x_m + e.size.x_m / 2, z0: e.placement.z_m - e.size.z_m / 2, z1: e.placement.z_m + e.size.z_m / 2 }, e.placement.y_m, e.placement.y_m + e.size.h_m)) bad.push(`${a.id} meets earlier add ${e.id}`);
        }
        for (const p of ground) {
          if (exempt) continue;
          if (a.kind === "patch") continue; // a patch may lie up to a piece; it never lies under one (the stage tests that)
          if (meets(a, { x0: p.placement.x_m - p.size.x_m / 2, x1: p.placement.x_m + p.size.x_m / 2, z0: p.placement.z_m - p.size.z_m / 2, z1: p.placement.z_m + p.size.z_m / 2 }, p.placement.y_m, p.placement.y_m + p.size.h_m)) bad.push(`${a.id} meets a ground piece`);
        }
      }
      expect(bad.slice(0, 5), label(r.city)).toEqual([]);
    }
  });

  it("no circuit on the named runs until K2: nothing is left out by option G, and the under-span set is empty", () => {
    for (const r of runs) {
      expect(r.stats["underSpanSpots"] ?? 0, label(r.city)).toBe(0);
      for (const k of Object.keys(r.stats)) expect(k.startsWith("leftOutT2:") || k.startsWith("skippedCircuit:"), `${label(r.city)} ${k}`).toBe(false);
    }
  });

  it("a district that held to the end (wild under 1/6) takes no spread growth: every patch, clump and sapling is in a district of wild 1/6 or more", () => {
    for (const r of runs) {
      for (const a of r.layer.adds) if (a.kind === "patch" || a.kind === "clump" || a.kind === "sapling") expect(r.wild.get(a.district)!, a.id).toBeGreaterThanOrEqual(1 / 6 - 1e-9);
    }
  });
});

describe("R-3, R-4, X-7: determinism, the pins, the clean run", { timeout: 900_000 }, () => {
  it("the same city twice gives the same layer, on the four pin cities", () => {
    for (const [seed, p] of pinned) {
      const again = buildRuin(p.plan, stageRand("ruin", seed));
      expect(JSON.stringify(again.layer), `seed ${seed}`).toBe(JSON.stringify(p.layer));
    }
    expect(pinned.size).toBe(4);
  });

  it("pins, on the four pin cities, the digest of the layer's growth part", () => {
    const lines: string[] = [];
    const got: Record<number, string> = {};
    for (const [seed, p] of pinned) {
      got[seed] = digestOf(stepPart(p.layer, "growth"));
      lines.push(`seed ${seed}: growth ${got[seed]} layer ${digestOf(p.layer)}`);
    }
    console.info(`pins\n${lines.join("\n")}`);
    expect(got).toEqual(PIN_GROWTH);
  });

  it("runCity() and a clean era run run no ruin code; the stage is registered after holdout and is not in the clean list", () => {
    const spy = vi.spyOn(ruinStage, "run");
    try {
      expect(runCity({ blocksX: 6, blocksZ: 6, seed: 2 }, "streets").ok).toBe(true);
      expect(runCityEra({ blocksX: 6, blocksZ: 6, seed: 2 }, "clean", ERA_STAGES, [BUILT_STAGES[0]!]).ok).toBe(true);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
    expect(BUILT_STAGES.some((s) => (s.name as string) === "ruin")).toBe(false);
    expect(ERA_STAGES.map((s) => s.name).indexOf("ruin")).toBeGreaterThan(ERA_STAGES.map((s) => s.name).indexOf("holdout"));
  });

  it("the clean digests of the four pin cities are the same with and without the pass", () => {
    for (const [seed, p] of pinned) {
      const plain = runCity({ blocksX: 6, blocksZ: 6, seed });
      expect(plain.ok).toBe(true);
      expect(p.plan.plan.digests, `seed ${seed}`).toEqual(plain.plan.digests);
    }
  });
});

describe("R-6, R-7: the folder's files", () => {
  const DIR = fileURLToPath(new URL("./", import.meta.url));
  const files = readdirSync(DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "testcities.ts" && f !== "fixtures.ts");
  const codeOf = (f: string): string =>
    readFileSync(`${DIR}${f}`, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .map((l) => l.replace(/\/\/.*$/, ""))
      .join("\n");
  it("import only src/core, the pipeline's helpers and their own files; no clock, random, file, DOM; no bi, bj or street line", () => {
    expect(files.length).toBeGreaterThan(8);
    for (const f of files) {
      for (const m of codeOf(f).matchAll(/from\s+"([^"]+)"/g)) {
        const path = m[1]!;
        expect(path.startsWith("./") || path === "../../core" || path.startsWith("../pipeline/"), `${f} imports ${path}`).toBe(true);
      }
      expect(codeOf(f), f).not.toMatch(/Math\.random|Date\.now|performance\.now|\bdocument\b|\bwindow\b|\bfetch\b|readFileSync|from\s+"three"/);
      expect(codeOf(f), f).not.toMatch(/\.(bi|bj)\b|\bstreets?\.line\b|\bs\.line\b/);
    }
  });
});

describe("criterion 13: the numbers (reported, not asserted)", { timeout: 900_000 }, () => {
  it("prints the cells grown, the pieces by kind, the patches, the vines by slot, the keys, what option G left out, the under-span set and the time per city", () => {
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
