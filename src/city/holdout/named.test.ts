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
import { CITY_HOLDOUT_STEP_OF, CITY_HOLDOUT_STEPS, CITY_STAGES, type CityEraPlan, type CityHoldoutLayer, type CityHoldoutPieceKind, type CityPlanStage } from "../../core";
import { digestOf } from "../pipeline/digest";
import { stageRand } from "../pipeline/seeds";
import { BUILT_STAGES, ERA_STAGES, runCity, runCityEra } from "../stages";
import { KIT_KEYS } from "./kit";
import { buildHoldout, holdoutStage, stepPart } from "./stage";
import { NAMED, PINNED, eraRun, label, type City } from "./testcities";

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
}

/** What the pin test pins: the digest of the "power" and "settle" parts on each pin city, one-way on (taken 22 Nov 2026 night, on the clean city and `history` alone, with no circuit; re-taken 22 Nov 2026 once D1 merged, since the tech layer's removes now reach the plan; K2 re-takes them). The power part is the same on every city: it is empty until E1. */
const PIN_PARTS: Readonly<Record<number, { readonly power: string; readonly settle: string }>> = {
  1: { power: "5aa380c8", settle: "87b76815" },
  2: { power: "5aa380c8", settle: "849c7c3f" },
  3: { power: "5aa380c8", settle: "733a2555" },
  8: { power: "5aa380c8", settle: "d0be899e" },
};

const CLEAN_STAGES = CITY_STAGES.filter((s): s is CityPlanStage => s !== "assemble");
const runs: Run[] = [];
const pinned = new Map<number, { plan: CityEraPlan; layer: CityHoldoutLayer }>();
/** The districts at held 0, per run. */
const eraHeld0 = new Map<string, string[]>();

describe("the named runs (X-4, X-1, R-1)", { timeout: 900_000 }, () => {
  it("builds the 20 named cities through the era runner: the stage returns on every one, so T-1 and T-2 held", () => {
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
        parks: (L.mass?.openings ?? []).filter((o) => o.kind === "park").length,
      });
      const p = PINNED.find((x) => x.seed === c.seed && c.way === "on");
      if (p !== undefined) pinned.set(c.seed, { plan: before, layer });
    }
    expect(runs).toHaveLength(20);
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
      expect(l.adds.length, label(r.city)).toBeGreaterThan(300);
      for (const s of CITY_HOLDOUT_STEPS) for (const a of stepPart(l, s).adds) expect(CITY_HOLDOUT_STEP_OF[a.kind]).toBe(s);
      for (const a of l.adds) expect(KIT_KEYS.has(a.placement.key), a.placement.key).toBe(true);
      expect(l.changes.every((c) => c.op === "remove")).toBe(true);
      expect(l.steps!.map((s) => s.step)).toEqual([...CITY_HOLDOUT_STEPS]);
      expect(l.steps![0]).toEqual({ step: "power", adds: 0, changes: 0 });
      expect(l.steps!.reduce((n, s) => n + s.adds, 0)).toBe(l.adds.length);
      expect(l.steps!.reduce((n, s) => n + s.changes, 0)).toBe(l.changes.length);
    }
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
    expect(pinned.size).toBe(4);
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

describe("criterion 10: the numbers (reported, not asserted)", { timeout: 900_000 }, () => {
  it("prints the pieces by kind, the keys, the removes, the skipped mouths, the closed cells and the time per city", () => {
    const range = (xs: number[]): string => `${Math.min(...xs)} to ${Math.max(...xs)}`;
    const total = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
    const kinds: CityHoldoutPieceKind[] = ["camp", "water-tower", "farm", "irrigator", "stall", "container", "clutter", "roof", "barricade"];
    const count = (r: Run, k: CityHoldoutPieceKind): number => r.layer.adds.filter((a) => a.kind === k).length;
    const lines: string[] = [];
    lines.push(`pieces a city: ${range(runs.map((r) => r.layer.adds.length))} (total ${total(runs.map((r) => r.layer.adds.length))})`);
    lines.push(`distinct keys: ${range(runs.map((r) => new Set(r.layer.adds.map((a) => a.placement.key)).size))}`);
    for (const k of kinds) lines.push(`${k}: ${range(runs.map((r) => count(r, k)))} (total ${total(runs.map((r) => count(r, k)))})`);
    lines.push(`parks a city / farm parks / their removes: ${range(runs.map((r) => r.parks))} / ${range(runs.map((r) => r.stats.settle.farmParksFilled))} / ${range(runs.map((r) => r.stats.settle.farmRemoves))}`);
    lines.push(`stall places / removes: ${range(runs.map((r) => r.stats.settle.stallPlaces))} / ${range(runs.map((r) => r.stats.settle.stallRemoves))}`);
    lines.push(`containers rolled with no room: ${range(runs.map((r) => r.stats.settle.containersNoRoom))}`);
    lines.push(`clutter rolled with no room: ${range(runs.map((r) => r.stats.settle.clutterNoRoom))}`);
    lines.push(`roof items per held building: ${runs.map((r) => (count(r, "roof") / Math.max(1, r.held.heldBuildings)).toFixed(2)).join(" ")}`);
    lines.push(`roof spots rolled with no room: ${range(runs.map((r) => r.stats.settle.roofNoRoom))}`);
    lines.push(`camp places offered / filled: ${range(runs.map((r) => r.stats.settle.campPlaces))} / ${range(runs.map((r) => r.stats.settle.campPlacesFilled))}`);
    lines.push(`barricade lines (placed): ${range(runs.map((r) => r.stats.barricade.placed))}; walls: ${range(runs.map((r) => count(r, "barricade")))}; walls a line: ${range(runs.map((r) => r.stats.barricade.wallsMin))} to ${Math.max(...runs.map((r) => r.stats.barricade.wallsMax))}`);
    lines.push(`street mouths of districts at the barricade band / candidates: ${range(runs.map((r) => r.stats.barricade.mouths))} / ${range(runs.map((r) => r.stats.barricade.candidates))}`);
    lines.push(`mouths option C skipped: T-1 ${range(runs.map((r) => r.stats.barricade.skippedT1))}, T-2 ${range(runs.map((r) => r.stats.barricade.skippedT2))} (no circuit on the named runs until K2: so none); skipped for overlap ${range(runs.map((r) => r.stats.barricade.skippedOverlap))}; arm already taken ${range(runs.map((r) => r.stats.barricade.skippedTaken))}`);
    lines.push(`stage 9 pieces removed by barricades: ${range(runs.map((r) => r.stats.barricade.trafficRemoves))} (total ${total(runs.map((r) => r.stats.barricade.trafficRemoves))})`);
    lines.push(`street cells closed by ground pieces: settle ${range(runs.map((r) => r.closed.settle))}; barricades ${range(runs.map((r) => r.closed.barricade))}`);
    lines.push(`time a city (the stage alone): ${range(runs.map((r) => Math.round(r.ms)))} ms`);
    console.info(`E2 numbers\n${lines.join("\n")}`);
    expect(lines.length).toBeGreaterThan(10);
  });
});
