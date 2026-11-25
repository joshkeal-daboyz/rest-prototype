/**
 * Ticket 070 I, criterion 9 and 8: R-1 to R-7 for stage 8, the stage list, the digest pins and the picture.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CityPlanRun } from "../../core";
import { digestOf } from "../pipeline/digest";
import { pictureProblems } from "../pipeline/picture";
import { stageRand } from "../pipeline/seeds";
import type { CityStageDef } from "../pipeline/types";
import { BUILT_STAGES, runCity } from "../stages";
import { FURN_KEEP_M } from "./constants";
import { rectDist } from "./geom";
import { propRect } from "./props";
import { GROUND_LEGEND, groundStage, legendOf } from "./stage";
import { DEFAULT, PINNED, cityOf, layersOf, stagesOf } from "./testcities";

describe("R-1 to R-7 for stage 8 (criterion 9)", { timeout: 120_000 }, () => {
  it("the stage list ends with ground, and stage 6 (circuit) sits after buildings", () => {
    expect(BUILT_STAGES.map((s) => s.name)).toEqual(["streets", "land", "mass", "edge", "buildings", "circuit", "facades", "ground", "traffic"]);
    expect(() => runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, "assemble" as never)).toThrow();
  });

  it("R-7: 6 x 6 seed 1, the default named city, ends ok with ground, its layer is frozen, and every digest is there", () => {
    const r = cityOf(DEFAULT);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.plan.digests)).toEqual(["streets", "land", "mass", "edge", "buildings", "circuit", "facades", "ground"]);
    const g = r.plan.layers.ground!;
    expect(Object.isFrozen(g)).toBe(true);
    expect(Object.isFrozen(g.runs)).toBe(true);
    expect(Object.isFrozen(g.runs[0])).toBe(true);
    expect(Object.isFrozen(g.props)).toBe(true);
    expect(Object.isFrozen(g.props[0])).toBe(true);
    expect(Object.isFrozen(g.props[0]!.placement)).toBe(true);
    expect(Object.isFrozen(g.props[0]!.size)).toBe(true);
    expect(g.props.length).toBeGreaterThan(500);
  });

  it("a test double for ground leaves the digests of streets to facades equal to the standard run's (R-4), its list built by replacing the stage named ground", () => {
    const r = cityOf(DEFAULT);
    if (!r.ok) throw new Error("default city failed");
    const double: CityStageDef = { name: "ground", run: () => ({ stage: "ground", runs: [], props: [] }), picture: groundStage.picture };
    const list = stagesOf("on", double);
    expect(list.map((s) => s.name)).toEqual(["streets", "land", "mass", "edge", "buildings", "circuit", "facades", "ground"]);
    expect(list[list.length - 1]).toBe(double);
    const d = runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, undefined, list);
    expect(d.ok).toBe(true);
    for (const s of ["streets", "land", "mass", "edge", "buildings", "facades"] as const) expect(d.plan.digests[s], s).toBe(r.plan.digests[s]);
    expect(d.plan.digests.ground).not.toBe(r.plan.digests.ground);
  });

  it("R-1: an earlier layer is not edited by the stage: a stage that writes into facades fails the run naming itself", () => {
    const writer: CityStageDef = {
      name: "ground",
      run: (plan) => {
        (plan.layers.facades as unknown as { ground: unknown[] }).ground.length = 0;
        return { stage: "ground", runs: [], props: [] };
      },
      picture: groundStage.picture,
    };
    const r: CityPlanRun = runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, undefined, stagesOf("on", writer));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.failure.stage).toBe("ground");
  });

  it("the digest pins (R-4): 6 x 6 seeds 1 (the default), 2, 3 and 8, one-way on; the layers before it are as their stages pin them", () => {
    const PINS: readonly (readonly [number, string])[] = [
      [1, "7f01ba46"],
      [2, "8e10c8e7"],
      [3, "f2fe9c97"],
      [8, "3d7f06f1"],
    ];
    // the facades pins are stage 7's, unchanged by stage 8 (facades' own tests pin them as well)
    const FACADES_PINS: readonly (readonly [number, string])[] = [
      [1, "c264e65d"],
      [2, "b0402815"],
      [3, "00744cfe"],
      [8, "5f077cb3"],
    ];
    expect(PINNED.map((c) => c.seed)).toEqual([1, 2, 3, 8]);
    for (const [seed, pin] of PINS) {
      const r = cityOf({ blocksX: 6, blocksZ: 6, seed, way: "on" });
      expect(r.ok && r.plan.digests.ground, `seed ${seed} ground`).toBe(pin);
    }
    for (const [seed, pin] of FACADES_PINS) {
      const r = cityOf({ blocksX: 6, blocksZ: 6, seed, way: "on" });
      expect(r.ok && r.plan.digests.facades, `seed ${seed} facades`).toBe(pin);
    }
  });

  it("I2: on seed 1 (6 x 6, one-way on) no stage 8 piece stands within FURN_KEEP_M of a pole or light", () => {
    const r = cityOf(DEFAULT);
    if (!r.ok) throw new Error("default city failed");
    const keep = r.plan.layers.circuit!.keep;
    expect(keep.length).toBeGreaterThan(0);
    for (const p of r.plan.layers.ground!.props) {
      const q = propRect(p);
      for (const k of keep) expect(rectDist(q, { x0: k.x_m, x1: k.x_m, z0: k.z_m, z1: k.z_m }), `${p.kind} at ${p.placement.x_m}, ${p.placement.z_m}`).toBeGreaterThanOrEqual(FURN_KEEP_M - 1e-6);
    }
  });

  it("the same city twice gives the same digest, and another seed another (R-3)", () => {
    const a = cityOf(DEFAULT);
    const b = runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, undefined, stagesOf("on"));
    expect(a.ok && b.ok && a.plan.digests.ground === b.plan.digests.ground).toBe(true);
    const c = cityOf({ ...DEFAULT, seed: 2 });
    expect(a.ok && c.ok && a.plan.digests.ground !== c.plan.digests.ground).toBe(true);
    if (a.ok) expect(digestOf(a.plan.layers.ground!)).toBe(a.plan.digests.ground);
  });

  it("R-7: the stage reads only streets, land, mass, edge, buildings, facades and circuit (I2: only its keep list; not its own layer)", () => {
    const r = cityOf(DEFAULT);
    if (!r.ok) throw new Error("default city failed");
    const read = new Set<string>();
    const layers = new Proxy(r.plan.layers, {
      get(target, key, receiver) {
        read.add(String(key));
        return Reflect.get(target, key, receiver);
      },
    });
    const layer = groundStage.run({ ...r.plan, layers }, stageRand("ground", 1));
    expect([...read].sort()).toEqual(["buildings", "circuit", "edge", "facades", "land", "mass", "streets"]);
    expect(digestOf(layer)).toBe(r.plan.digests.ground);
  });

  const DIR = fileURLToPath(new URL("./", import.meta.url));
  const FILES = readdirSync(DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "testcities.ts");
  const codeOf = (f: string): string =>
    readFileSync(`${DIR}${f}`, "utf8")
      .split("\n")
      .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*"))
      .join("\n");

  it("R-6: the stage's files import only src/core, the pipeline's helpers and their own files (no other stage folder, no renderer, no three, no DOM), and read no clock, file or random", () => {
    expect(FILES.length).toBeGreaterThanOrEqual(14);
    for (const f of FILES) {
      for (const m of codeOf(f).matchAll(/from\s+"([^"]+)"/g)) {
        const path = m[1]!;
        expect(path.startsWith("./") || path === "../../core" || path.startsWith("../pipeline/"), `${f} imports ${path}`).toBe(true);
      }
      expect(codeOf(f), f).not.toMatch(/Math\.random|Date\.now|performance\.now|\bdocument\b|\bwindow\b|\bfetch\b|readFileSync|from\s+"three"/);
    }
  });

  it("no file reads a block's rank (bi, bj) or a street's line, any of the circuit layer but its keep list (I2), or stage 7's code", () => {
    for (const f of FILES) {
      const code = codeOf(f);
      expect(code, f).not.toMatch(/\.(bi|bj)\b|\bstreets?\.line\b|\bstreets\.streets\b/);
      expect(code, f).not.toMatch(/layers\.circuit(?!\?\.keep\b)|facades\//);
    }
  });

  it("no lamp: no kit key is a light pole, a signal or a cabinet, and no prop of the default city is one (NL)", () => {
    const { ground } = layersOf(DEFAULT);
    for (const p of ground.props) expect(/LightPole|TrafficLight|PowerBox|Cabinet/.test(p.placement.key), p.placement.key).toBe(false);
  });
});

describe("the picture (criterion 8, R-5)", { timeout: 120_000 }, () => {
  it("has the lattice's size and the legend of the ticket, marks each run's pavement cells, and has one point per prop with its kind's legend index", () => {
    const r = cityOf(DEFAULT);
    if (!r.ok) throw new Error("default city failed");
    const pic = groundStage.picture(r.plan);
    const { streets, ground } = r.plan.layers;
    expect(pictureProblems(pic, streets!.w, streets!.h)).toEqual([]);
    expect(pic.stage).toBe("ground");
    expect(pic.legend.map((e) => e.name)).toEqual(["nothing", "pavement run", "tree", "bench", "bin", "planter or pot plant", "mailbox or newspaper box", "meter", "hydrant", "bus stop", "bollard", "lot piece", "plaza piece"]);
    expect(pic.legend).toBe(GROUND_LEGEND);
    const run = new Set(ground!.runs.flatMap((q) => q.pavement.map((c) => c.j * streets!.w + c.i)));
    pic.cells.forEach((c, k) => expect(c, `cell ${k}`).toBe(run.has(k) ? 1 : 0));
    expect(run.size).toBeGreaterThan(500);
    expect(pic.points).toHaveLength(ground!.props.length);
    pic.points.forEach((pt, k) => {
      const p = ground!.props[k]!;
      expect(pt).toEqual({ x_m: p.placement.x_m, z_m: p.placement.z_m, legend: legendOf(p) });
    });
    // the default city uses most of the legend, every index in 2 to 12
    const used = new Set(pic.points.map((q) => q.legend));
    expect(used.size).toBeGreaterThanOrEqual(8);
    for (const u of used) expect(u >= 2 && u <= 12).toBe(true);
  });
});
