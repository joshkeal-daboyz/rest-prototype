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
import { t1Failures, t1RuinTreeCovers, t2Failures, type CircuitPoints } from "../pipeline/readable";
import { stageRand } from "../pipeline/seeds";
import { ERA_STAGES } from "../stages";
import { RUIN_ROOF_GROWTH } from "./constants";
import { ruinBounds, ruinIsTree } from "./kit";
import { buildRuin, crownSized, makeRuinStage, ruinPicture, ruinStage, stepPart, stepParts } from "./stage";
import { handCircuit } from "./fixtures";
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

  it("as built (RUIN_ROOF_GROWTH true) the layer has roof adds; with it off (through the options) it has none, and every other add is the same", () => {
    expect(RUIN_ROOF_GROWTH).toBe(true);
    expect(layer.adds.filter((a) => a.kind === "roof").length).toBeGreaterThan(100);
    const off = buildRuin(BASE, rand, { roofGrowth: false }).layer;
    expect(off.adds.filter((a) => a.kind === "roof")).toHaveLength(0);
    expect(layer.adds.filter((a) => a.kind !== "roof")).toEqual(off.adds);
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
  const wildPlan = withWild(BASE, () => 0.9);
  // The saplings keep off the frontage pavements the hand-placed spans follow, so the fixture adds one more span: a short line straight through the first tree a first run placed, to prove the listing.
  const plain: CircuitPoints = handCircuit(BASE);
  const probe = buildRuin(wildPlan, rand, { circuit: plain }).layer.adds.find((a) => a.kind === "sapling" || a.kind === "park-tree");
  const circuit: CircuitPoints = probe
    ? { ...plain, lines: [...plain.lines, { id: "span:tree", a: { x_m: probe.placement.x_m - 4, z_m: probe.placement.z_m }, b: { x_m: probe.placement.x_m + 4, z_m: probe.placement.z_m } }] }
    : plain;
  const out = buildRuin(wildPlan, rand, { circuit });
  const off = buildRuin(wildPlan, rand, { circuit, treesUnderSpans: false });

  it("the stage returns (T-1 and T-2 hold by the real checks, run on the whole layer inside it) and places a layer", () => {
    expect(circuit.poles.length).toBeGreaterThan(20);
    expect(circuit.lights.length + circuit.lampPlaces.length + circuit.drops.length).toBeGreaterThan(10);
    expect(out.layer.adds.length).toBeGreaterThan(500);
  });

  it("an under-span spot is listed only once its tree is placed (a saplings or a park tree); the off switch (F1's crown-clear rule) lists none and places none through a line", () => {
    expect(out.underSpanSpots.length).toBeGreaterThan(0);
    const placed = new Set(out.layer.adds.filter((a) => a.kind === "sapling" || a.kind === "park-tree").map((a) => a.id));
    for (const s of out.underSpanSpots) expect(placed.has(s.id)).toBe(true);
    expect(out.underSpanSpots).toHaveLength(out.stats["crownOverSpan"] ?? 0);
    expect(off.underSpanSpots).toHaveLength(0);
    expect(off.stats["crownOverSpan"] ?? 0).toBe(0);
  });

  it("trees are refused by the trunk rule, by what, and counted; pieces are left out by option G, and counted", () => {
    const refused = Object.entries(out.stats).filter(([k]) => k.startsWith("refusedTrunk:") || k.startsWith("leftOutT2:"));
    expect(refused.length).toBeGreaterThan(0);
  });

  it("the crowns over the circuit are reported by t1RuinTreeCovers from each tree's full crown, and the stage does not throw on them", () => {
    const own: CityEraPlan = { plan: wildPlan.plan, layers: { ...wildPlan.layers, ruin: out.layer }, digests: wildPlan.digests };
    const resolved = resolveBefore(own, "ruin");
    const crowned = { ...resolved, adds: { ...resolved.adds, ruin: crownSized(out.layer.adds) } };
    const covers = t1RuinTreeCovers(crowned, { bounds: ruinBounds, isTree: ruinIsTree, circuit });
    const byWhat: Record<string, number> = {};
    for (const f of covers) byWhat[f.what] = (byWhat[f.what] ?? 0) + 1;
    expect(covers.length).toBeGreaterThan(0);
    expect(byWhat["canopyOverLine"] ?? 0).toBe(out.stats["crownOverSpan"] ?? 0);
  });

  it("the independent checks, called by name on the resolved era, find nothing", () => {
    const own: CityEraPlan = { plan: wildPlan.plan, layers: { ...wildPlan.layers, ruin: out.layer }, digests: wildPlan.digests };
    const resolved = resolveBefore(own, "ruin");
    const withRuin = { ...resolved, adds: { ...resolved.adds, ruin: out.layer.adds } };
    const options = { bounds: ruinBounds, isTree: ruinIsTree, circuit, era: "ruin" as const };
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
