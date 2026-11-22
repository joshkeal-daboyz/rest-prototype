/**
 * Ticket 073 section F1: the ruin stage on one real city (6 x 6 seed 1, one-way on), built once for this file; districts get hand-set `wild` values and circuits get hand-placed poles and spans
 * (stage 6 is empty until K2, so the named runs find no circuit and T-1, T-2 and option G are proven on fixtures in `grow.test.ts` and here).
 * Criteria 1, 2, 11 (the layer, the same city twice) and 12 (the picture); the named runs, the pins and the numbers are in `named.test.ts`.
 */
import { describe, expect, it } from "vitest";
import { CITY_RUIN_PIECE_KINDS, CITY_RUIN_STEP_OF, CITY_RUIN_STEPS, type CityEraPlan, type CityRuinLayer } from "../../core";
import { digestOf } from "../pipeline/digest";
import { resolveBefore } from "../pipeline/eras";
import { pictureProblems } from "../pipeline/picture";
import { t1Failures, t2Failures, type CircuitPoints } from "../pipeline/readable";
import { stageRand } from "../pipeline/seeds";
import { ERA_STAGES } from "../stages";
import { RUIN_ROOF_GROWTH } from "./constants";
import { ruinBounds, ruinIsTree } from "./kit";
import { buildRuin, makeRuinStage, ruinPicture, ruinStage, stepPart, stepParts } from "./stage";
import { beforeRuin, PINNED, withWild } from "./testcities";

const CITY = PINNED[0]!;
const rand = stageRand("ruin", CITY.seed);
const BASE: CityEraPlan = beforeRuin(CITY);
const history = BASE.layers.history!;
const built = buildRuin(BASE, rand);
const layer = built.layer;

describe("criterion 1: the layer", { timeout: 300_000 }, () => {
  it("is a CityRuinLayer with no change, adds with ids `ruin:<kind>:<plan data>` (unique), each kind from CityRuinPieceKind and its district a history district", () => {
    expect(layer.stage).toBe("ruin");
    expect(layer.changes).toEqual([]);
    expect(layer.adds.length).toBeGreaterThan(500);
    const ids = layer.adds.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    const districts = new Set(history.districts.map((d) => d.id));
    for (const a of layer.adds) {
      expect(a.id.startsWith(`ruin:${a.kind}:`), a.id).toBe(true);
      expect(CITY_RUIN_PIECE_KINDS).toContain(a.kind);
      expect(districts.has(a.district), a.id).toBe(true);
      expect(Number.isInteger(a.cell.i) && Number.isInteger(a.cell.j)).toBe(true);
      expect(CITY_RUIN_STEP_OF[a.kind]).toBe("growth");
    }
  });

  it("steps lists growth and remnants (0, 0), its counts summing to the layer's; the growth part holds every add", () => {
    expect(layer.steps!.map((s) => s.step)).toEqual([...CITY_RUIN_STEPS]);
    expect(layer.steps).toEqual([{ step: "growth", adds: layer.adds.length, changes: 0 }, { step: "remnants", adds: 0, changes: 0 }]);
    expect(stepPart(layer, "growth").adds).toEqual(layer.adds);
    expect(stepPart(layer, "remnants")).toEqual({ stage: "ruin", step: "remnants", adds: [], changes: [] });
    expect(stepParts(layer).map((p) => p.step)).toEqual([...CITY_RUIN_STEPS]);
    expect(() => stepPart({ stage: "ruin", adds: [], changes: [] } as CityRuinLayer, "growth")).toThrow();
  });

  it("as built (RUIN_ROOF_GROWTH false) the layer has no roof add; with it on (through the options) it has, and every other add is the same", () => {
    expect(RUIN_ROOF_GROWTH).toBe(false);
    expect(layer.adds.filter((a) => a.kind === "roof")).toHaveLength(0);
    const on = buildRuin(BASE, rand, { roofGrowth: true }).layer;
    expect(on.adds.filter((a) => a.kind === "roof").length).toBeGreaterThan(100);
    expect(on.adds.filter((a) => a.kind !== "roof")).toEqual(layer.adds);
  });

  it("is registered as the era stage ruin, after holdout, with one line in ERA_STAGES; a ruin stage with options is the same stage", () => {
    expect(ERA_STAGES.map((s) => s.name)).toEqual(["history", "tech", "holdout", "ruin"]);
    expect(ERA_STAGES.at(-1)).toBe(ruinStage);
    expect(makeRuinStage().name).toBe("ruin");
  });

  it("reads the plan before it through resolveBefore: the clean city with the tech and hold-out layers; with no history it throws a CityStageError", () => {
    expect(resolveBefore(BASE, "ruin").era).toBe("holdout");
    expect(() => buildRuin({ plan: BASE.plan, layers: {}, digests: {} }, rand)).toThrow(/history/);
  });

  it("the same city twice gives the same layer", () => {
    expect(JSON.stringify(buildRuin(BASE, rand).layer)).toBe(JSON.stringify(layer));
    expect(digestOf(buildRuin(BASE, rand).layer)).toBe(digestOf(layer));
  });
});

describe("criterion 2: density reads wild only (X-6)", { timeout: 300_000 }, () => {
  const at = (wild: number) => buildRuin(withWild(BASE, () => wild), rand).stats;
  const s02 = at(0.2);
  const s05 = at(0.5);
  const s09 = at(0.9);

  it("the same districts with a higher wild never get fewer candidates, of any kind a roll or a reach feeds", () => {
    for (const what of ["candidates:patch", "candidates:clump", "candidates:sapling", "candidates:vine-face", "candidates:vine-host", "candidates:vine-post", "candidates:tree-vine"]) {
      const a = s02[what] ?? 0;
      const b = s05[what] ?? 0;
      const c = s09[what] ?? 0;
      expect(b, what).toBeGreaterThanOrEqual(a);
      expect(c, what).toBeGreaterThanOrEqual(b);
    }
    for (const cls of ["lane", "parking", "pavement", "open"]) {
      expect(s05[`grown:${cls}`] ?? 0).toBeGreaterThanOrEqual(s02[`grown:${cls}`] ?? 0);
      expect(s09[`grown:${cls}`] ?? 0).toBeGreaterThanOrEqual(s05[`grown:${cls}`] ?? 0);
    }
    expect(s09["candidates:patch"]).toBeGreaterThan(s02["candidates:patch"]!);
  });

  it("and never fewer pieces placed: patches, saplings and clumps across 0.2, 0.5 and 0.9", () => {
    for (const what of ["placed:patch", "placed:sapling", "placed:clump"]) {
      expect(s05[what] ?? 0, what).toBeGreaterThanOrEqual(s02[what] ?? 0);
      expect(s09[what] ?? 0, what).toBeGreaterThanOrEqual(s05[what] ?? 0);
    }
  });

  it("park trees only from wild 1/3", () => {
    expect(at(0.3)["candidates:park-tree"] ?? 0).toBe(0);
    expect(at(1 / 3 + 0.001)["candidates:park-tree"] ?? 0).toBeGreaterThan(0);
  });

  it("a city that held to the end (wild 0) grows nothing: the layer is empty", () => {
    const none = buildRuin(withWild(BASE, () => 0), rand);
    expect(none.layer.adds).toHaveLength(0);
  });
});

describe("T-1 and T-2 with a hand-placed circuit on the real city (stage 6 is empty until K2)", { timeout: 600_000 }, () => {
  // a pole beside every 40th pavement cell's middle, and a span between consecutive poles that are near each other
  const edge = BASE.plan.layers.edge!;
  const pave = edge.cells.filter((c) => c.role === "pavement");
  // (a pole an earlier pass's piece covers is left out: T-1 judges every era's adds, and this fixture is about the ruin's)
  const before = resolveBefore(BASE, "ruin");
  const earlier = [...(before.adds.tech ?? []), ...(before.adds.holdout ?? [])];
  const covered = (x: number, z: number): boolean => earlier.some((a) => Math.abs(x - a.placement.x_m) <= a.size.x_m / 2 + 1 && Math.abs(z - a.placement.z_m) <= a.size.z_m / 2 + 1);
  let poles = pave
    .map((c) => ({ x_m: (c.i + 0.5) * 5 + 1, z_m: (c.j + 0.5) * 5 + 1 }))
    .filter((p) => !covered(p.x_m, p.z_m))
    .filter((_, n) => n % 40 === 0)
    .map((p, n) => ({ id: `pole:${n}`, ...p }));
  // and a pole an earlier pass's piece already cuts off on foot is left out too (the hold-out was built with no circuit)
  for (let round = 0; round < 8; round++) {
    const f = t2Failures(before, { bounds: ruinBounds, isTree: ruinIsTree, circuit: { poles, lights: [], lampPlaces: [], drops: [], lines: [], wires: [] } });
    if (f.length === 0) break;
    const bad = new Set(f.map((x) => x.pole));
    poles = poles.filter((p) => !bad.has(p.id));
  }
  const lines = poles
    .slice(1)
    .map((p, n) => ({ p, q: poles[n]! }))
    .filter(({ p, q }) => Math.hypot(p.x_m - q.x_m, p.z_m - q.z_m) < 60)
    .map(({ p, q }, n) => ({ id: `span:${n}`, a: { x_m: q.x_m, z_m: q.z_m }, b: { x_m: p.x_m, z_m: p.z_m } }));
  const circuit: CircuitPoints = { poles, lights: [], lampPlaces: [], drops: [], lines, wires: [] };
  const wildPlan = withWild(BASE, () => 0.9);
  const out = buildRuin(wildPlan, rand, { circuit });

  it("the stage returns (T-1 and T-2 hold by the real checks, run on the whole layer inside it) and places a layer", () => {
    expect(poles.length).toBeGreaterThan(20);
    expect(out.layer.adds.length).toBeGreaterThan(500);
  });

  it("some tree spots are under a span (B8) and are not placed", () => {
    expect(out.underSpanSpots.length).toBeGreaterThan(0);
    const placed = new Set(out.layer.adds.filter((a) => a.kind === "sapling").map((a) => a.id));
    for (const s of out.underSpanSpots) expect(placed.has(s.id)).toBe(false);
  });

  it("pieces were left out by option G or by the circuit, and are counted", () => {
    const leftOut = Object.entries(out.stats).filter(([k]) => k.startsWith("leftOutT2:") || k.startsWith("skippedCircuit:"));
    expect(leftOut.length).toBeGreaterThan(0);
  });

  it("with the under-span constant on, the same city throws a CityStageError naming T-1", () => {
    expect(() => buildRuin(wildPlan, rand, { circuit, treesUnderSpans: true })).toThrow(/T-1/);
  });

  it("the independent checks, called by name on the resolved era, find nothing", () => {
    const own: CityEraPlan = { plan: wildPlan.plan, layers: { ...wildPlan.layers, ruin: out.layer }, digests: wildPlan.digests };
    const resolved = resolveBefore(own, "ruin");
    const withRuin = { ...resolved, adds: { ...resolved.adds, ruin: out.layer.adds } };
    const options = { bounds: ruinBounds, isTree: ruinIsTree, circuit };
    expect(t1Failures(withRuin, options)).toHaveLength(0);
    expect(t2Failures(withRuin, options)).toHaveLength(0);
  });
});

describe("criterion 12: the picture (R-5)", () => {
  it("is a flat CityEraPicture of stage ruin, one legend entry per kind, the lattice's size, no index outside the legend", () => {
    const pic = ruinPicture(BASE, layer);
    expect(pic.stage).toBe("ruin");
    expect(pic.legend.map((l) => l.name)).toEqual(["nothing", ...CITY_RUIN_PIECE_KINDS]);
    const streets = BASE.plan.layers.streets!;
    expect(pictureProblems(pic as never, streets.w, streets.h)).toEqual([]);
    expect(pic.points).toHaveLength(layer.adds.length);
    expect(pic.cells.some((c) => c > 0)).toBe(true);
  });
  it("the stage's own picture reads the plan's ruin layer, and fails without one", () => {
    const plan: CityEraPlan = { plan: BASE.plan, layers: { ...BASE.layers, ruin: layer }, digests: BASE.digests };
    expect(ruinStage.picture(plan).stage).toBe("ruin");
    expect(() => ruinStage.picture(BASE)).toThrow(/no ruin layer/);
  });
});
