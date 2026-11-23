/**
 * Stage 7, section H1c (ticket 070), criterion 9: the numbers the pre-check's expectations are measured against, per named run (6 x 6 seeds 1 to 10, one-way off and on) and the lowest or highest with its run. REPORTED, not
 * asserted (the three numbers of NP are the agent's, PROPOSED; no share is met anywhere): shops by kind and by source; buildings with two shops of one kind; signs face and roof, runs with a sign; signs by key; what each roof
 * sign replaced (the no-plan big prop of that building); towers and exits against the no-plan layer; R8's two numbers against it; the tries turned away by fit (each F part; for a roof, no `P_ROOF_LARGE` draw, a corner, the
 * deck, RK, RC) and the planned face signs the cap turned away after the roofs; dressing plus walls plus face signs against `DRESS_MAX` (reported as passed). The named runs must be ok (R-2).
 * HEAVY: each city is built once through `testcities.ts`' module-level cache; `buildRoofs` runs once more on each without the plan.
 */
import { describe, expect, it } from "vitest";
import type { CityBuildingsLayer, CityFacadesLayer, CityMassLayer, CityRoofPiece } from "../../core";
import { stageRand } from "../pipeline/seeds";
import { runsOf } from "./dress";
import { DRESS_MAX } from "./dresskit";
import { placeFaceSigns, planNovelty, type NoveltyStats } from "./novelty";
import { roofReport } from "./roofcheck";
import { buildRoofs } from "./roofs";
import { cityOf, label, layersOf, NAMED, type City } from "./testcities";

const BIG = ["waterTower", "exit", "billboard"];
const short = (k: string): string => k.slice("city-pack:SM_Prop_LargeSign_".length);
const count = (xs: readonly CityRoofPiece[], kind: string): number => xs.filter((p) => p.kind === kind).length;

interface Row {
  readonly name: string;
  readonly shopsByKind: Record<string, number>;
  readonly shopsBySource: Record<string, number>;
  readonly twoOfAKind: number;
  readonly face: number;
  readonly roof: number;
  readonly runsWith: number;
  readonly runs: number;
  readonly byKey: Record<string, number>;
  readonly replaced: Record<string, number>;
  readonly towers: [number, number];
  readonly exits: [number, number];
  readonly billboards: [number, number];
  readonly r8: [number, number, number, number];
  readonly stats: NoveltyStats;
  readonly dressWallsFace: number;
  /** The buildings whose roof pieces differ from the no-plan layer's: those that gained their first roof piece, those that lost their last, and the kinds a lost building had in the no-plan layer. */
  readonly moved: { gained: string[]; lost: string[]; lostHad: string[] };
}

function rowOf(o: City, mass: CityMassLayer, buildings: CityBuildingsLayer, layer: CityFacadesLayer): Row {
  const rand = stageRand("facades", o.seed);
  const ground = layer.ground;
  const dressing = layer.dressing!;
  const walls = layer.walls!;
  const shops = layer.shops!;
  const plan = planNovelty(mass, buildings, { ground, dressing, walls, shops }, rand);
  const placed = placeFaceSigns(plan, layer.roofs!, { dressing, walls }, buildings);
  const noPlan = buildRoofs(mass, buildings, { dressing, walls }, rand).roofs;
  const runOf = runsOf(buildings);
  const shopsByKind: Record<string, number> = {};
  const shopsBySource: Record<string, number> = {};
  for (const s of shops) {
    shopsByKind[s.kind] = (shopsByKind[s.kind] ?? 0) + 1;
    shopsBySource[s.source] = (shopsBySource[s.source] ?? 0) + 1;
  }
  let twoOfAKind = 0;
  for (const b of buildings.buildings) {
    const kinds = shops.filter((s) => s.building === b.id).map((s) => s.kind);
    if (new Set(kinds).size < kinds.length) twoOfAKind++;
  }
  const roofSigns = layer.roofs!.filter((p) => p.kind === "novelty");
  const byKey: Record<string, number> = {};
  for (const s of layer.novelty!) byKey[short(s.placement.key)] = (byKey[short(s.placement.key)] ?? 0) + 1;
  for (const p of roofSigns) byKey[short(p.placement.key)] = (byKey[short(p.placement.key)] ?? 0) + 1;
  const replaced: Record<string, number> = {};
  for (const p of roofSigns) {
    const was = noPlan.find((q) => q.building === p.building && BIG.includes(q.kind));
    const k = was?.kind ?? "none";
    replaced[k] = (replaced[k] ?? 0) + 1;
  }
  const runsWith = new Set([...layer.novelty!.map((s) => runOf.get(s.building) ?? s.building), ...roofSigns.map((p) => runOf.get(p.building) ?? p.building)]);
  const now = roofReport(layer, { mass, buildings }).metrics;
  const before = roofReport({ stage: "facades", ground: layer.ground, dressing: layer.dressing!, walls: layer.walls!, roofs: noPlan }, { mass, buildings }).metrics;
  return {
    name: label(o),
    shopsByKind,
    shopsBySource,
    twoOfAKind,
    face: layer.novelty!.length,
    roof: roofSigns.length,
    runsWith: runsWith.size,
    runs: now.runs,
    byKey,
    replaced,
    towers: [count(noPlan, "waterTower"), count(layer.roofs!, "waterTower")],
    exits: [count(noPlan, "exit"), count(layer.roofs!, "exit")],
    billboards: [count(noPlan, "billboard"), count(layer.roofs!, "billboard")],
    r8: [before.dressed / before.buildings, now.dressed / now.buildings, before.bigRuns / before.runs, now.bigRuns / now.runs],
    stats: placed.stats,
    dressWallsFace: dressing.length + walls.length + layer.novelty!.length,
    moved: (() => {
      const a = new Set(noPlan.map((p) => p.building));
      const c = new Set(layer.roofs!.map((p) => p.building));
      const lost = [...a].filter((x) => !c.has(x));
      return { gained: [...c].filter((x) => !a.has(x)), lost, lostHad: lost.map((x) => noPlan.filter((p) => p.building === x).map((p) => p.kind).join("+")) };
    })(),
  };
}

describe("the numbers of H1c on the named runs (criterion 9; reported, not asserted)", { timeout: 300_000 }, () => {
  it("every named run is ok, and the numbers are printed", () => {
    const rows: Row[] = [];
    for (const o of NAMED) {
      const r = cityOf(o);
      expect(r.ok, label(o)).toBe(true);
      const { mass, buildings, facades } = layersOf(o);
      rows.push(rowOf(o, mass, buildings, facades));
    }
    const sum = (f: (r: Row) => number): number => rows.reduce((s, r) => s + f(r), 0);
    const merge = (f: (r: Row) => Record<string, number>): Record<string, number> => {
      const out: Record<string, number> = {};
      for (const r of rows) for (const [k, n] of Object.entries(f(r))) out[k] = (out[k] ?? 0) + n;
      return out;
    };
    const extreme = (f: (r: Row) => number): string => {
      const lo = rows.reduce((a, b) => (f(b) < f(a) ? b : a));
      const hi = rows.reduce((a, b) => (f(b) > f(a) ? b : a));
      return `lowest ${f(lo)} (${lo.name}), highest ${f(hi)} (${hi.name})`;
    };
    const lines: string[] = [];
    lines.push(`H1c numbers over the ${rows.length} named runs (totals; a city is the total / ${rows.length})`);
    lines.push(`shops by kind: ${JSON.stringify(merge((r) => r.shopsByKind))}`);
    lines.push(`shops by source: ${JSON.stringify(merge((r) => r.shopsBySource))}`);
    lines.push(`buildings with two shops of one kind: ${sum((r) => r.twoOfAKind)} (${extreme((r) => r.twoOfAKind)})`);
    lines.push(`face signs: ${sum((r) => r.face)} (${extreme((r) => r.face)})`);
    lines.push(`roof signs: ${sum((r) => r.roof)} (${extreme((r) => r.roof)})`);
    lines.push(`runs with a sign: ${sum((r) => r.runsWith)} of ${sum((r) => r.runs)} (${extreme((r) => r.runsWith)})`);
    lines.push(`signs by key: ${JSON.stringify(merge((r) => r.byKey))}`);
    lines.push(`roof signs replaced (the no-plan big prop): ${JSON.stringify(merge((r) => r.replaced))}`);
    lines.push(`towers before/after: ${sum((r) => r.towers[0])} / ${sum((r) => r.towers[1])}; exits ${sum((r) => r.exits[0])} / ${sum((r) => r.exits[1])}; billboards ${sum((r) => r.billboards[0])} / ${sum((r) => r.billboards[1])}`);
    lines.push(`R8 first number, lowest before ${Math.min(...rows.map((r) => r.r8[0])).toFixed(3)}, after ${Math.min(...rows.map((r) => r.r8[1])).toFixed(3)}; second number, lowest before ${Math.min(...rows.map((r) => r.r8[2])).toFixed(3)}, after ${Math.min(...rows.map((r) => r.r8[3])).toFixed(3)}`);
    lines.push(`R8 moved on: ${rows.filter((r) => r.r8[0] !== r.r8[1] || r.r8[2] !== r.r8[3]).map((r) => r.name).join("; ") || "no run"}`);
    const st = (f: (s: NoveltyStats) => number): number => sum((r) => f(r.stats));
    lines.push(`shops ${st((s) => s.shops)}, with keys ${st((s) => s.withKeys)}, tries ${st((s) => s.tries)}, planned face ${st((s) => s.plannedFace)}, planned roof ${st((s) => s.plannedRoof)}, no spot ${st((s) => s.noSpot)}`);
    lines.push(`face turned away: not a street bay or an escape's ${st((s) => s.faceNoSpot)}; by F's part, span ${st((s) => s.faceTurned.span)}, reach ${st((s) => s.faceTurned.reach)}, top ${st((s) => s.faceTurned.top)}, clash ${st((s) => s.faceTurned.clash)}`);
    lines.push(`roof turned away: no P_ROOF_LARGE draw ${st((s) => s.roofTurned.noDraw)}, corner ${st((s) => s.roofTurned.corner)}, deck ${st((s) => s.roofTurned.deck)}, RK ${st((s) => s.roofTurned.rk)}, RC ${st((s) => s.roofTurned.rc)}`);
    lines.push(`planned face signs the cap turned away after the roofs: ${st((s) => s.capTurned)}`);
    lines.push(`dressing plus walls plus face signs, the most: ${Math.max(...rows.map((r) => r.dressWallsFace))} of DRESS_MAX ${DRESS_MAX} (reported as passed)`);
    console.log(lines.join("\n"));
    for (const r of rows.filter((x) => x.r8[0] !== x.r8[1] || x.r8[2] !== x.r8[3])) console.log(`R8 moved, ${r.name}: ${JSON.stringify(r.r8)} ${JSON.stringify(r.moved)}`);
    for (const r of rows) console.log(`${r.name}: shops ${JSON.stringify(r.shopsBySource)} face ${r.face} roof ${r.roof} replaced ${JSON.stringify(r.replaced)} R8 ${r.r8.map((x) => x.toFixed(3)).join("/")} cap ${r.stats.capTurned}`);
    expect(rows).toHaveLength(NAMED.length);
  });
});
