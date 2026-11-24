/**
 * Ticket 073 E2, criteria 5 to 10 on the named runs (6 x 6 seeds 1 to 10, one-way off and on): the stage runs through the era runner, T-1 and T-2 hold, the clean layers are as they were, the layer is frozen, the digests
 * of the "power" and "settle" parts are pinned on the four pin cities, the "barricade" part's is reported and not pinned (until E1 merges), and the numbers are printed (reported, not asserted).
 *
 * Until K2 gives stage 6 its layer, the circuit is empty on these runs: T-1 and T-2 find no pole, light or lamp-post place to judge, and option C skips no mouth. The keeps are proven on fixtures in `stage.test.ts`.
 * Each city is built once for this file.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { CITY_HOLDOUT_STEP_OF, CITY_HOLDOUT_STEPS, CITY_STAGES, type CityEraPlan, type CityFacadesLayer, type CityHoldoutLayer, type CityHoldoutPieceKind, type CityPlanStage } from "../../core";
import { digestOf } from "../pipeline/digest";
import { resolveBefore } from "../pipeline/eras";
import { boxHit, s7Boxes } from "../tech/boxes";
import { stageRand } from "../pipeline/seeds";
import { BUILT_STAGES, ERA_STAGES, runCity, runCityEra } from "../stages";
import { KIT_KEYS } from "./kit";
import { buildHoldout, holdoutStage, stepPart } from "./stage";
import { FULL_CITIES } from "../testing/namedcities";
import { DEFAULT, NAMED, acrossProblems, eraRun, label, type City } from "./testcities";
import { yieldToWorker } from "../testing/yield";

interface Run {
  readonly city: City;
  readonly layer: CityHoldoutLayer;
  readonly digest: string;
  readonly cleanOk: boolean;
  readonly frozen: boolean;
  readonly stats: ReturnType<typeof buildHoldout>;
  readonly ms: number;
  readonly held: { readonly heldBuildings: number };
  readonly closed: { readonly settle: number; readonly barricade: number };
  readonly parks: number;
  readonly across: ReturnType<typeof acrossProblems>;
  readonly facades: CityFacadesLayer;
}

/** What the pin test pins: the digest of the "power" and "settle" parts on each pin city, one-way on (taken 22 Nov 2026 night, on the clean city and `history` alone, with no circuit; re-taken 22 Nov 2026 once D1 merged, since the tech layer's removes now reach the plan; re-taken 22 Nov 2026 once the pass kept clear of stage 7's facade pieces; re-taken in 081 K2a2 (23 Nov 2026) when stage 6 was switched on: settle 'f4f14a15' to '1d4f5972'). The power part is the same on every city: it is empty until E1. */
const PIN_PARTS: Readonly<Record<number, { readonly power: string; readonly settle: string }>> = {
  1: { power: "5aa380c8", settle: "aa731cfa" },
};

const CLEAN_STAGES = CITY_STAGES.filter((s): s is CityPlanStage => s !== "assemble");
const runs: Run[] = [];
const pinned = new Map<number, { plan: CityEraPlan; layer: CityHoldoutLayer }>();
/** The districts at held 0, per run. */
const eraHeld0 = new Map<string, string[]>();

describe("the named runs (X-4, X-1, R-1)", { timeout: 900_000 }, () => {
  it("builds the named cities through the era runner: the stage returns on every one, so T-1 and T-2 held", async () => {
    for (const c of NAMED) {
      const run = eraRun(c, "holdout");
      const layer = run.plan.layers.holdout!;
      eraHeld0.set(label(c), run.plan.layers.history!.districts.filter((d) => d.held === 0).map((d) => d.id));
      expect(layer, label(c)).toBeDefined();
      const before: CityEraPlan = { plan: run.plan.plan, layers: { history: run.plan.layers.history!, ...(run.plan.layers.tech === undefined ? {} : { tech: run.plan.layers.tech }) }, digests: {} };
      const t = performance.now();
      const stats = buildHoldout(before, stageRand("holdout", c.seed));
      const ms = performance.now() - t;
      expect(JSON.stringify(stats.layer), label(c)).toBe(JSON.stringify(layer));
      // X-1: no clean layer moved while the eras ran (each digest is of the layer as its stage wrote it)
      const cleanOk = CLEAN_STAGES.filter((s) => run.plan.plan.digests[s] !== undefined).every((s) => digestOf(run.plan.plan.layers[s]) === run.plan.plan.digests[s]);
      const L = run.plan.plan.layers;
      const heldDistricts = new Set(run.plan.layers.history!.districts.filter((d) => d.held > 0).flatMap((d) => d.blocks));
      const heldBuildings = (L.buildings?.buildings ?? []).filter((b) => heldDistricts.has(b.block)).length;
      // closed street cells: a ground add whose footprint holds the cell's centre (the T-2 reading), by step
      const streets = L.streets!;
      const closedBy = (adds: CityHoldoutLayer["adds"]): number => {
        const hit = new Set<number>();
        for (const cell of streets.cells) {
          const cx = (cell.i + 0.5) * 5;
          const cz = (cell.j + 0.5) * 5;
          if (adds.some((a) => a.placement.y_m < 2 && Math.abs(cx - a.placement.x_m) <= a.size.x_m / 2 && Math.abs(cz - a.placement.z_m) <= a.size.z_m / 2)) hit.add(cell.j * streets.w + cell.i);
        }
        return hit.size;
      };
      runs.push({
        city: c,
        layer,
        digest: run.plan.digests.holdout!,
        cleanOk,
        frozen: Object.isFrozen(layer) && Object.isFrozen(layer.adds) && (layer.adds.length === 0 || Object.isFrozen(layer.adds[0])),
        stats,
        ms,
        held: { heldBuildings },
        closed: { settle: closedBy(stepPart(layer, "settle").adds), barricade: closedBy(stepPart(layer, "barricade").adds) },
        facades: resolveBefore(before, "holdout").plan.layers.facades!,
        across: acrossProblems(before, layer),
        parks: (L.mass?.openings ?? []).filter((o) => o.kind === "park").length,
      });
      if (c.seed === DEFAULT.seed && c.way === DEFAULT.way) pinned.set(c.seed, { plan: before, layer });
      await yieldToWorker();
    }
    expect(runs).toHaveLength(NAMED.length);
  });

  it("every layer is frozen (R-1) with the digest the runner recorded; every clean digest is as the clean stage wrote it (X-1)", () => {
    for (const r of runs) {
      expect(r.frozen, label(r.city)).toBe(true);
      expect(r.cleanOk, label(r.city)).toBe(true);
      expect(r.digest, label(r.city)).toBe(digestOf(r.layer));
    }
  });

  it("each layer meets the layer rules: unique ids, kinds in their steps, only kit keys, only removes, steps summing", () => {
    for (const r of runs) {
      const l = r.layer;
      const ids = l.adds.map((a) => a.id);
      expect(new Set(ids).size, label(r.city)).toBe(ids.length);
      expect(l.adds.length, label(r.city)).toBeGreaterThan(250);
      for (const s of CITY_HOLDOUT_STEPS) for (const a of stepPart(l, s).adds) expect(CITY_HOLDOUT_STEP_OF[a.kind]).toBe(s);
      for (const a of l.adds) expect(KIT_KEYS.has(a.placement.key), a.placement.key).toBe(true);
      expect(l.changes.every((c) => c.op === "remove")).toBe(true);
      expect(l.steps!.map((s) => s.step)).toEqual([...CITY_HOLDOUT_STEPS]);
      expect(l.steps![0]).toEqual({ step: "power", adds: 0, changes: 0 });
      expect(l.steps!.reduce((n, s) => n + s.adds, 0)).toBe(l.adds.length);
      expect(l.steps!.reduce((n, s) => n + s.changes, 0)).toBe(l.changes.length);
    }
  });

  it("no hold-out add meets a stage 7 piece (the tech pass's own boxes, read from the plan's facades layer as the era before the pass resolves it: the tech pass may have removed some): plan and height, every add on every run", () => {
    const eps = 1e-6;
    let checked = 0;
    for (const r of runs) {
      const boxes = s7Boxes({ facades: r.facades });
      const bad: string[] = [];
      for (const a of r.layer.adds) {
        const rect = { x0: a.placement.x_m - a.size.x_m / 2, x1: a.placement.x_m + a.size.x_m / 2, z0: a.placement.z_m - a.size.z_m / 2, z1: a.placement.z_m + a.size.z_m / 2 };
        const hit = boxHit(boxes, rect, a.placement.y_m + eps, a.placement.y_m + a.size.h_m - eps);
        if (hit !== null) bad.push(`${a.id} meets stage 7 ${hit.src}`);
        checked++;
      }
      expect(bad, label(r.city)).toEqual([]);
    }
    if (FULL_CITIES) expect(checked).toBeGreaterThan(6000);
  });

  it("every barricade line of the 20 named runs lies across its street and spans the carriageway", () => {
    let lines = 0;
    for (const r of runs) {
      expect(r.across.problems, label(r.city)).toEqual([]);
      lines += r.across.lines;
    }
    if (FULL_CITIES) expect(lines).toBeGreaterThan(200);
    expect(runs.some((r) => r.across.xStreets > 0) && runs.some((r) => r.across.zStreets > 0)).toBe(true);
  });

  it("nothing goes where a district was left at once (held 0)", () => {
    for (const r of runs) {
      const held0 = new Set(eraHeld0.get(label(r.city)) ?? []);
      for (const a of r.layer.adds) expect(held0.has(a.district), a.id).toBe(false);
    }
  });
});

describe("R-3, R-4, X-7: determinism, the pins, the clean run", { timeout: 900_000 }, () => {
  it("the same city twice gives the same layer, on the four pin cities", () => {
    for (const [seed, p] of pinned) {
      const again = buildHoldout(p.plan, stageRand("holdout", seed));
      expect(JSON.stringify(again.layer), `seed ${seed}`).toBe(JSON.stringify(p.layer));
    }
    expect(pinned.size).toBe(1);
  });

  it("pins, on the four pin cities, the digest of the layer's power and settle parts (the barricade part's is reported, not pinned until E1 merges)", () => {
    const lines: string[] = [];
    for (const [seed, p] of pinned) {
      const power = digestOf(stepPart(p.layer, "power"));
      const settle = digestOf(stepPart(p.layer, "settle"));
      const barricade = digestOf(stepPart(p.layer, "barricade"));
      lines.push(`seed ${seed}: power ${power} settle ${settle} barricade ${barricade} (not pinned) layer ${digestOf(p.layer)}`);
      expect({ power, settle }, `seed ${seed}`).toEqual(PIN_PARTS[seed]);
    }
    console.info(`pins\n${lines.join("\n")}`);
  });

  it("runCity() and a clean era run run no hold-out code; the stage is registered after history and is not in the clean list", () => {
    const spy = vi.spyOn(holdoutStage, "run");
    try {
      expect(runCity({ blocksX: 6, blocksZ: 6, seed: 2 }, "streets").ok).toBe(true);
      expect(runCityEra({ blocksX: 6, blocksZ: 6, seed: 2 }, "clean", ERA_STAGES, [BUILT_STAGES[0]!]).ok).toBe(true);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
    expect(BUILT_STAGES.some((s) => (s.name as string) === "holdout")).toBe(false);
    expect(ERA_STAGES.map((s) => s.name)).toContain("holdout");
    expect(ERA_STAGES.map((s) => s.name).indexOf("holdout")).toBeGreaterThan(ERA_STAGES.map((s) => s.name).indexOf("history"));
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
  const files = readdirSync(DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "testcities.ts");
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
