/**
 * Stage 5, section F1, on the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on; the default city, 6 x 6 seed 1, first): rows and buildings, lead and follow, M4c, R2, R13, the picture, the digest pins and R-1 to R-7.
 * HEAVY: each city is built once, through a module-level cache. Stages 1 to 3 and 5 are run for the named loop (stage 5 reads no edge layer, so its layer does not depend on stage 4); the standard run through edge
 * is built once for the default city.
 *
 * R-2: the stage returns ok on all 20 named runs. Nothing is loosened and no city is pinned as an exception.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CityBuildingsLayer, CityBuilding, CityLandLayer, CityMassLayer, CityPlanRun } from "../../core";
import { landStage } from "../land/stage";
import { massStage } from "../mass/stage";
import { digestOf } from "../pipeline/digest";
import { pictureProblems } from "../pipeline/picture";
import { stageRand } from "../pipeline/seeds";
import type { CityStageDef } from "../pipeline/types";
import { BUILT_STAGES, runCity } from "../stages";
import { streetsStage, streetsStageWith } from "../streets/stage";
import { buildingFailures, neighbourShares } from "./check";
import { CITY_STOREYS, COLOURWAY_POOL, COLOURWAY_SWATCH, TERRACE_BAYS } from "./constants";
import { tightCornersOf } from "./group";
import { keyOf, rowsOfPart } from "./rows";
import { BUILDINGS_LEGEND, buildBuildings, buildingsStage, legendOf } from "./stage";

interface City {
  readonly blocksX: number;
  readonly blocksZ: number;
  readonly seed: number;
  readonly way: "on" | "off";
}
const NAMED: City[] = [];
for (const way of ["on", "off"] as const) for (let seed = 1; seed <= 10; seed++) NAMED.push({ blocksX: 6, blocksZ: 6, seed, way });
const DEFAULT: City = { blocksX: 6, blocksZ: 6, seed: 1, way: "on" };
const label = (o: City): string => `${o.blocksX} x ${o.blocksZ} seed ${o.seed} one-way ${o.way}`;
const optionsOf = (o: City): { blocksX: number; blocksZ: number; seed: number } => ({ blocksX: o.blocksX, blocksZ: o.blocksZ, seed: o.seed });

const stagesOf = (way: "on" | "off", last: CityStageDef = buildingsStage as unknown as CityStageDef): CityStageDef[] => [
  (way === "on" ? streetsStage : streetsStageWith(0)) as unknown as CityStageDef,
  landStage as unknown as CityStageDef,
  massStage as unknown as CityStageDef,
  last,
];
const cache = new Map<string, CityPlanRun>();
function cityOf(o: City): CityPlanRun {
  const k = `${o.blocksX}x${o.blocksZ}:${o.seed}:${o.way}`;
  if (!cache.has(k)) cache.set(k, runCity(optionsOf(o), "buildings", stagesOf(o.way)));
  return cache.get(k)!;
}
interface Layers {
  readonly land: CityLandLayer;
  readonly mass: CityMassLayer;
  readonly buildings: CityBuildingsLayer;
}
function layersOf(o: City): Layers {
  const r = cityOf(o);
  if (!r.ok) throw new Error(`${label(o)} failed at ${r.failure.stage}: ${r.failure.reason}`);
  const l = r.plan.layers;
  return { land: l.land!, mass: l.mass!, buildings: l.buildings! };
}
const inputOf = (l: Layers) => ({ land: l.land, mass: l.mass });
const patch = (layer: CityBuildingsLayer, id: string, change: Partial<CityBuilding>): CityBuildingsLayer => ({ ...layer, buildings: layer.buildings.map((b) => (b.id === id ? { ...b, ...change } : b)) });

describe("stage 5 on the named runs (R-2)", { timeout: 120_000 }, () => {
  it("the stage returns ok on all 20 named runs, the default city first", () => {
    for (const o of [DEFAULT, ...NAMED]) {
      const r = cityOf(o);
      expect(r.ok, r.ok ? label(o) : `${label(o)}: ${r.failure.stage}: ${r.failure.reason}`).toBe(true);
    }
  });

  it("every check holds on every named run (rule 1, N1, L1, N3, M4c, R2, R13)", () => {
    for (const o of NAMED) {
      const l = layersOf(o);
      expect(buildingFailures(l.buildings, inputOf(l)).map((f) => `${f.check}: ${f.reason}`), label(o)).toEqual([]);
    }
  });
});

describe("rows and buildings (criterion 1)", { timeout: 120_000 }, () => {
  it("every built cell is in exactly one building, of 2 to 4 consecutive cells of one row, or the L of a tight corner", () => {
    for (const o of NAMED) {
      const { land, mass, buildings } = layersOf(o);
      const seen = new Map<string, number>();
      for (const b of buildings.buildings) for (const c of b.cells) seen.set(keyOf(c), (seen.get(keyOf(c)) ?? 0) + 1);
      expect(seen.size, label(o)).toBe(mass.built.length);
      for (const m of mass.built) expect(seen.get(keyOf(m)), `${label(o)} (${m.i}, ${m.j})`).toBe(1);
      const rowsOfId = new Map(land.parts.flatMap((p) => rowsOfPart(p)).map((r) => [r.id, r] as const));
      for (const b of buildings.buildings) {
        if (b.bend !== null) {
          expect(b.cells, b.id).toHaveLength(3);
          continue;
        }
        expect(b.cells.length, b.id).toBeGreaterThanOrEqual(TERRACE_BAYS.min);
        expect(b.cells.length, b.id).toBeLessThanOrEqual(TERRACE_BAYS.max);
        const along = rowsOfId.get(b.rowId)!.along.map(keyOf);
        const at = b.cells.map((c) => along.indexOf(keyOf(c)));
        at.forEach((x, n) => {
          expect(x, `${b.id} cell ${n}`).toBeGreaterThanOrEqual(0);
          if (n > 0) expect(x).toBe(at[n - 1]! + 1);
        });
      }
    }
  });

  it("an L stands exactly at each tight corner of the mass (computed apart from the stage), and nowhere else", () => {
    for (const o of NAMED) {
      const { land, mass, buildings } = layersOf(o);
      const built = new Map(mass.built.map((b) => [keyOf(b), b] as const));
      const tight = land.parts.flatMap((p) => tightCornersOf(p, rowsOfPart(p), built, mass.built.filter((b) => b.part === p.id)));
      const ls = buildings.buildings.filter((b) => b.bend !== null);
      expect(ls.map((b) => keyOf(b.cells[1]!)).sort(), label(o)).toEqual(tight.map((t) => keyOf(t.corner)).sort());
      for (const l of ls) {
        expect(l.row).toBe("inner");
        for (const id of [l.rowId, l.bend!]) expect(buildings.rows.find((r) => r.id === id)!.buildings).toContain(l.id);
      }
    }
  });

  it("the rows are as cityplan.ts defines them: ring and front, each building listed in its row, in order", () => {
    const { land, buildings } = layersOf(DEFAULT);
    const byId = new Map(buildings.buildings.map((b) => [b.id, b] as const));
    const defs = new Map(land.parts.flatMap((p) => rowsOfPart(p)).map((r) => [r.id, r] as const));
    for (const r of buildings.rows) {
      const d = defs.get(r.id)!;
      expect([r.block, r.part, r.row, r.front]).toEqual([d.block, d.part, d.row, d.front]);
      const at = d.along.map(keyOf);
      let last = -1;
      for (const id of r.buildings) {
        const lo = Math.min(...byId.get(id)!.cells.map((c) => at.indexOf(keyOf(c))).filter((x) => x >= 0));
        expect(lo, `${r.id} ${id}`).toBeGreaterThan(last);
        last = lo;
      }
    }
    expect(new Set(buildings.rows.map((r) => r.id)).size).toBe(buildings.rows.length);
  });
});

describe("lead and follow (criterion 4)", { timeout: 120_000 }, () => {
  it("a court part's outer buildings lead and its inner buildings follow; partner and back are null exactly on the leaders", () => {
    for (const o of NAMED) {
      const { land, buildings } = layersOf(o);
      const court = new Set(land.parts.filter((p) => p.shape === "court").map((p) => p.id));
      for (const b of buildings.buildings) {
        expect(b.partner === null, b.id).toBe(b.back === null);
        if (court.has(b.part)) expect(b.row === "outer", b.id).toBe(b.partner === null);
      }
    }
  });

  it("in a strip exactly one row leads: the one with street frontage, else the one fronting -x or -z", () => {
    for (const o of NAMED) {
      const { land, mass, buildings } = layersOf(o);
      const built = new Map(mass.built.map((b) => [keyOf(b), b] as const));
      for (const p of land.parts.filter((x) => x.shape === "strip")) {
        const rows = rowsOfPart(p);
        const street = rows.map((r) => r.along.some((c) => built.get(keyOf(c))?.open.some((x) => x.side === r.front && x.frontage === "street")));
        const lead = street[0] !== street[1] ? (street[0] ? 0 : 1) : rows[0]!.front === "-x" || rows[0]!.front === "-z" ? 0 : 1;
        for (const b of buildings.buildings.filter((x) => x.part === p.id)) expect(b.rowId === rows[lead]!.id, `${p.id} ${b.id}`).toBe(b.partner === null);
      }
    }
  });

  it("column for column: a following building's non-blind cells all back onto its one partner, and no two followers share one", () => {
    for (const o of NAMED) {
      const { mass, buildings } = layersOf(o);
      const built = new Map(mass.built.map((b) => [keyOf(b), b] as const));
      const of = new Map<string, CityBuilding>();
      for (const b of buildings.buildings) for (const c of b.cells) of.set(keyOf(c), b);
      const used = new Set<string>();
      for (const b of buildings.buildings.filter((x) => x.partner !== null && x.bend === null)) {
        const back = new Set(b.cells.map((c) => built.get(keyOf(c))!).filter((c) => c.column !== "blind").map((c) => of.get(keyOf(c.partner!))!.id));
        expect([...back], b.id).toEqual([b.partner]);
        expect(used.has(b.partner!), b.id).toBe(false);
        used.add(b.partner!);
      }
      for (const l of buildings.buildings.filter((x) => x.bend !== null)) {
        expect(used.has(l.partner!), l.id).toBe(false);
        used.add(l.partner!);
        expect(buildings.buildings.find((x) => x.id === l.partner)!.partner).toBeNull();
      }
    }
  });
});

describe("M4c, R2 and R13 (criterion 5), recomputed apart from the stage", { timeout: 120_000 }, () => {
  it("every built cell has the storeys of its mass partner's building; a through building has its partner's style and colourway; another does not have its colourway", () => {
    for (const o of NAMED) {
      const { mass, buildings } = layersOf(o);
      const of = new Map<string, CityBuilding>();
      for (const b of buildings.buildings) for (const c of b.cells) of.set(keyOf(c), b);
      const byId = new Map(buildings.buildings.map((b) => [b.id, b] as const));
      for (const m of mass.built) if (m.partner) expect(of.get(keyOf(m))!.storeys, `${label(o)} (${m.i}, ${m.j})`).toBe(of.get(keyOf(m.partner))!.storeys);
      for (const b of buildings.buildings.filter((x) => x.back !== null)) {
        const p = byId.get(b.partner!)!;
        if (b.back === "through") expect([b.style, b.colourway], b.id).toEqual([p.style, p.colourway]);
        else expect(b.colourway, b.id).not.toBe(p.colourway);
      }
    }
  });

  it("R2: 3 to 5 storeys, and consecutive buildings of a row that touch differ in style and storeys; R13: in colourway", () => {
    for (const o of NAMED) {
      const { buildings } = layersOf(o);
      const byId = new Map(buildings.buildings.map((b) => [b.id, b] as const));
      let touching = 0;
      for (const b of buildings.buildings) {
        expect(b.storeys).toBeGreaterThanOrEqual(CITY_STOREYS.min);
        expect(b.storeys).toBeLessThanOrEqual(CITY_STOREYS.max);
      }
      for (const row of buildings.rows) {
        const list = row.buildings.map((id) => byId.get(id)!).filter((b) => b.bend === null);
        const axis = row.front === "-x" || row.front === "+x" ? "j" : "i";
        for (let n = 1; n < list.length; n++) {
          const a = list[n - 1]!;
          const b = list[n]!;
          if (b.cells[0]![axis] !== a.cells[a.cells.length - 1]![axis] + 1) continue;
          touching++;
          expect(a.style, `${a.id} ${b.id}`).not.toBe(b.style);
          expect(a.storeys, `${a.id} ${b.id}`).not.toBe(b.storeys);
          expect(a.colourway, `${a.id} ${b.id}`).not.toBe(b.colourway);
        }
      }
      expect(touching, label(o)).toBeGreaterThan(100);
      expect(neighbourShares(buildings, { land: layersOf(o).land, mass: layersOf(o).mass })).toMatchObject({ r2: 1, r13: 1 });
    }
  });

  it("failing fixtures, from the default city's layer with one building changed", () => {
    const l = layersOf(DEFAULT);
    const input = inputOf(l);
    const checks = (layer: CityBuildingsLayer): string[] => [...new Set(buildingFailures(layer, input).map((f) => f.check))];
    expect(checks(l.buildings)).toEqual([]);
    const follower = l.buildings.buildings.find((b) => b.back === "through" && b.bend === null)!;
    const another = l.buildings.buildings.find((b) => b.back === "another" && b.bend === null)!;
    const partnerOf = (b: CityBuilding): CityBuilding => l.buildings.buildings.find((x) => x.id === b.partner)!;
    // a following building given its partner's storeys plus one
    expect(checks(patch(l.buildings, follower.id, { storeys: partnerOf(follower).storeys === 5 ? 3 : partnerOf(follower).storeys + 1 }))).toContain("M4c");
    // an "another" building given its partner's colourway
    expect(checks(patch(l.buildings, another.id, { colourway: partnerOf(another).colourway }))).toContain("M4c");
    // a "through" building given a different style
    const other = (s: string): string => (s === "apartment-01" ? "apartment-02" : "apartment-01");
    expect(checks(patch(l.buildings, follower.id, { style: other(follower.style) }))).toContain("M4c");
    // two row neighbours given one style, one storey count, one colourway
    const row = l.buildings.rows.find((r) => r.buildings.length > 3)!;
    const [a, b] = [row.buildings[0]!, row.buildings[1]!].map((id) => l.buildings.buildings.find((x) => x.id === id)!) as [CityBuilding, CityBuilding];
    const axis = row.front === "-x" || row.front === "+x" ? "j" : "i";
    expect(b.cells[0]![axis]).toBe(a.cells[a.cells.length - 1]![axis] + 1);
    expect(checks(patch(l.buildings, b.id, { style: a.style }))).toContain("R2");
    expect(buildingFailures(patch(l.buildings, b.id, { storeys: a.storeys }), input).some((f) => f.check === "R2" && /storey count/.test(f.reason))).toBe(true);
    expect(checks(patch(l.buildings, b.id, { colourway: a.colourway }))).toContain("R13");
    // a building of 6 storeys
    expect(buildingFailures(patch(l.buildings, a.id, { storeys: 6 }), input).some((f) => f.check === "R2" && /6 storeys/.test(f.reason))).toBe(true);
  });
});

describe("style, storeys and colourway (criterion 3)", { timeout: 120_000 }, () => {
  it("the same plan gives the same layer twice, and another seed another layer", () => {
    const l = layersOf(DEFAULT);
    const again = buildBuildings(l.land, l.mass, stageRand("buildings", 1));
    // `buildBuildings` is F1's rows and buildings; F2's `columns` come on top of them.
    const { columns: _columns, ...f1 } = l.buildings;
    expect(again).toEqual(f1);
    expect(buildBuildings(l.land, l.mass, stageRand("buildings", 2))).not.toEqual(f1);
  });

  it("every style is a row style, every colourway is of the pool, and the storeys are spread over 3, 4 and 5", () => {
    for (const o of NAMED) {
      const { buildings } = layersOf(o);
      const hist = new Map<number, number>();
      for (const b of buildings.buildings) {
        expect(["apartment-01", "apartment-02", "apartment-03"]).toContain(b.style);
        expect(COLOURWAY_POOL).toContain(b.colourway);
        hist.set(b.storeys, (hist.get(b.storeys) ?? 0) + 1);
      }
      for (let s = CITY_STOREYS.min; s <= CITY_STOREYS.max; s++) expect(hist.get(s) ?? 0, `${label(o)} ${s} storeys`).toBeGreaterThan(buildings.buildings.length / 6);
    }
  });

  it("through and another both occur (BACK_SAME_SHARE's value is not pinned)", () => {
    const { buildings } = layersOf(DEFAULT);
    expect(buildings.buildings.some((b) => b.back === "through")).toBe(true);
    expect(buildings.buildings.some((b) => b.back === "another")).toBe(true);
  });
});

describe("the picture (R-5, criterion 7)", { timeout: 120_000 }, () => {
  const plan = (() => {
    const r = cityOf(DEFAULT);
    if (!r.ok) throw new Error("default city failed");
    return r.plan;
  })();
  const pic = buildingsStage.picture(plan);

  it("is the lattice's size, every index is in the legend, and index 0 is not built", () => {
    expect(pictureProblems(pic, plan.layers.streets!.w, plan.layers.streets!.h)).toEqual([]);
    expect(BUILDINGS_LEGEND[0]!.name).toBe("not built");
    expect(pic.stage).toBe("buildings");
    const built = new Set(plan.layers.mass!.built.map((b) => b.j * pic.w + b.i));
    pic.cells.forEach((c, n) => expect(c === 0, `cell ${n}`).toBe(!built.has(n)));
  });

  it("each built cell's entry is its building's colourway and storeys, named \"<colourway>, <n> storeys\"", () => {
    for (const b of plan.layers.buildings!.buildings) {
      for (const c of b.cells) {
        const index = pic.cells[c.j * pic.w + c.i]!;
        expect(index).toBe(legendOf(b.colourway, b.storeys));
        expect(pic.legend[index]!.name).toBe(`${b.colourway}, ${b.storeys} storeys`);
      }
    }
    expect(BUILDINGS_LEGEND.filter((e) => / storeys$/.test(e.name))).toHaveLength(COLOURWAY_POOL.length * 3);
  });

  it("the swatch is the colourway's: lighter at 3 storeys, darker at 5", () => {
    const lum = (rgb: number): number => ((rgb >> 16) & 255) + ((rgb >> 8) & 255) + (rgb & 255);
    for (const cw of COLOURWAY_POOL) {
      expect(COLOURWAY_SWATCH[cw]).toBeDefined();
      const at = (s: number): number => BUILDINGS_LEGEND[legendOf(cw, s)]!.rgb;
      expect(BUILDINGS_LEGEND[legendOf(cw, 4)]!.rgb).toBe(COLOURWAY_SWATCH[cw]);
      expect(lum(at(3))).toBeGreaterThan(lum(at(4)));
      expect(lum(at(5))).toBeLessThan(lum(at(4)));
    }
  });

  it("each following building has one point at its middle cell's centre, \"through\" or \"another\"", () => {
    const followers = plan.layers.buildings!.buildings.filter((b) => b.back !== null);
    expect(pic.points).toHaveLength(followers.length);
    followers.forEach((b, n) => {
      const mid = b.cells[Math.floor(b.cells.length / 2)]!;
      const p = pic.points[n]!;
      expect([p.x_m, p.z_m]).toEqual([(mid.i + 0.5) * 5, (mid.j + 0.5) * 5]);
      expect(pic.legend[p.legend]!.name).toBe(b.back);
    });
    if (followers.some((b) => b.bend !== null)) {
      const l = followers.find((b) => b.bend !== null)!;
      expect(l.cells[Math.floor(l.cells.length / 2)]).toEqual(l.cells[1]);
    }
  });
});

describe("R-1 to R-7 for buildings", { timeout: 120_000 }, () => {
  it("the standard run (stages 1 to 5, edge included) is ok on the default city, its layer is frozen, and equals the layer of the run without edge", () => {
    const r = runCity(optionsOf(DEFAULT), "buildings");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.plan.digests)).toEqual(["streets", "land", "mass", "edge", "buildings"]);
    expect(Object.isFrozen(r.plan.layers.buildings)).toBe(true);
    expect(Object.isFrozen(r.plan.layers.buildings!.buildings)).toBe(true);
    expect(Object.isFrozen(r.plan.layers.buildings!.buildings[0])).toBe(true);
    const ok = cityOf(DEFAULT);
    expect(ok.ok && r.plan.digests.buildings === ok.plan.digests.buildings).toBe(true);
  });

  it("a test double for buildings leaves the digests of streets, land, mass and edge equal to the standard run's (R-4)", () => {
    const r = runCity(optionsOf(DEFAULT), "buildings");
    if (!r.ok) throw new Error("default city failed");
    const double: CityStageDef = { name: "buildings", run: () => ({ stage: "buildings", rows: [], buildings: [] }), picture: buildingsStage.picture };
    const d = runCity(optionsOf(DEFAULT), "buildings", [...BUILT_STAGES.slice(0, -1), double]);
    expect(d.ok).toBe(true);
    expect(d.plan.digests.streets).toBe(r.plan.digests.streets);
    expect(d.plan.digests.land).toBe(r.plan.digests.land);
    expect(d.plan.digests.mass).toBe(r.plan.digests.mass);
    expect(d.plan.digests.edge).toBe(r.plan.digests.edge);
    expect(d.plan.digests.buildings).not.toBe(r.plan.digests.buildings);
  });

  it("an earlier layer is not edited by the stage: a stage that writes into mass fails the run naming itself", () => {
    const writer: CityStageDef = {
      name: "buildings",
      run: (plan) => {
        (plan.layers.mass as unknown as { built: unknown[] }).built.length = 0;
        return { stage: "buildings", rows: [], buildings: [] };
      },
      picture: buildingsStage.picture,
    };
    const r = runCity(optionsOf(DEFAULT), "buildings", stagesOf("on", writer));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.failure.stage).toBe("buildings");
  });

  it("the digest pins (R-4): 6 x 6 seeds 1 (the default), 2, 3 and 8, one-way on; re-taken once with `columns` (F2), and F1's four pins held by the layer with `columns` removed", () => {
    // F2's pins: the layer with its columns.
    const PINS: readonly (readonly [number, string])[] = [
      [1, "8a702264"],
      [2, "8511fb2f"],
      [3, "9af6a96f"],
      [8, "6564b680"],
    ];
    // F1's pins, unchanged: the same layer without `columns`.
    const F1_PINS: readonly (readonly [number, string])[] = [
      [1, "c549bddc"],
      [2, "6e87a01e"],
      [3, "3c9e46b3"],
      [8, "0bc406f9"],
    ];
    for (const [seed, pin] of PINS) {
      const r = cityOf({ blocksX: 6, blocksZ: 6, seed, way: "on" });
      expect(r.ok && r.plan.digests.buildings, `seed ${seed}`).toBe(pin);
    }
    for (const [seed, pin] of F1_PINS) {
      const l = layersOf({ blocksX: 6, blocksZ: 6, seed, way: "on" }).buildings;
      expect(l.columns, `seed ${seed}`).toBeDefined();
      const { columns: _columns, ...f1 } = l;
      expect(digestOf(f1), `seed ${seed} without columns`).toBe(pin);
    }
    // the layers before it are as their own stages pin them: stage 5 changed none of them
    const r = cityOf(DEFAULT);
    expect(r.ok && Object.keys(r.plan.digests)).toEqual(["streets", "land", "mass", "buildings"]);
  });

  it("the same city twice gives the same digest, and another seed another (R-3)", () => {
    const a = cityOf(DEFAULT);
    const b = runCity(optionsOf(DEFAULT), "buildings", stagesOf("on"));
    expect(a.ok && b.ok && a.plan.digests.buildings === b.plan.digests.buildings).toBe(true);
    const c = cityOf({ ...DEFAULT, seed: 2 });
    expect(a.ok && c.ok && a.plan.digests.buildings !== c.plan.digests.buildings).toBe(true);
  });

  it("R-7: 6 x 6 seed 1, the default named city, ends ok", () => {
    expect(cityOf(DEFAULT).ok).toBe(true);
  });

  const FILES = ["assign.ts", "check.ts", "columncheck.ts", "columns.ts", "constants.ts", "draft.ts", "group.ts", "hash.ts", "index.ts", "kit.ts", "place.ts", "rows.ts", "stage.ts"];
  const codeOf = (f: string): string =>
    readFileSync(fileURLToPath(new URL(`./${f}`, import.meta.url)), "utf8")
      .split("\n")
      .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*"))
      .join("\n");

  it("R-6: every file imports only src/core and src/city (the pipeline's helpers and its own files), and none reads a clock, the DOM or Math.random", () => {
    for (const f of FILES) {
      for (const m of codeOf(f).matchAll(/from\s+"([^"]+)"/g)) {
        const path = m[1]!;
        expect(path.startsWith("./") || path === "../../core" || path.startsWith("../pipeline/"), `${f} imports ${path}`).toBe(true);
      }
      expect(codeOf(f), f).not.toMatch(/Math\.random|Date\.now|performance\.now|\bdocument\b|\bwindow\b|\bfetch\b/);
    }
  });

  it("no file reads a block's rank (bi, bj), a street's line, or the edge layer; stage 5 reads streets only for the lattice's size", () => {
    for (const f of FILES) {
      const code = codeOf(f);
      expect(code, f).not.toMatch(/\.(bi|bj|line)\b/);
      expect(code, f).not.toMatch(/layers\.edge|\.kerb\b|\.bays\b/);
      for (const m of code.matchAll(/layers\.streets|streets\.(\w+)/g)) if (m[1] !== undefined) expect(["w", "h"], `${f}: ${m[0]}`).toContain(m[1]);
    }
  });
});
