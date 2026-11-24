/**
 * Ticket 070 TR1, criteria 6 and 7: R-1 to R-7 for stage 9, the stage list, the digest pins and the picture.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import type { CityPlanRun } from "../../core";
import { digestOf } from "../pipeline/digest";
import { pictureProblems } from "../pipeline/picture";
import { stageRand } from "../pipeline/seeds";
import type { CityStageDef } from "../pipeline/types";
import { BUILT_STAGES, runCity } from "../stages";
import { poleOf } from "./clear";
import { TRAFFIC_LEGEND, legendOf, trafficStage } from "./stage";
import { DEFAULT, PINNED, cityOf, layersOf, stagesOf, warm } from "./testcities";

describe("R-1 to R-7 for stage 9 (criterion 7)", { timeout: 120_000 }, () => {
  beforeAll(() => warm([DEFAULT, ...PINNED.map((c) => ({ ...c }))]), 120_000);
  it("the stage list ends with traffic, and stage 6 (circuit) sits after buildings", () => {
    expect(BUILT_STAGES.map((s) => s.name)).toEqual(["streets", "land", "mass", "edge", "buildings", "circuit", "facades", "ground", "traffic"]);
    expect(() => runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, "assemble" as never)).toThrow();
  });

  it("R-7: 6 x 6 seed 1, the default named city, ends ok with traffic, its layer is frozen, and every digest is there", () => {
    const r = cityOf(DEFAULT);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.plan.digests)).toEqual(["streets", "land", "mass", "edge", "buildings", "circuit", "facades", "ground", "traffic"]);
    const t = r.plan.layers.traffic!;
    expect(Object.isFrozen(t)).toBe(true);
    expect(Object.isFrozen(t.junctions)).toBe(true);
    expect(Object.isFrozen(t.junctions[0]!.approaches[0])).toBe(true);
    expect(Object.isFrozen(t.pieces)).toBe(true);
    expect(Object.isFrozen(t.pieces[0])).toBe(true);
    expect(Object.isFrozen(t.pieces[0]!.placement)).toBe(true);
    expect(Object.isFrozen(t.pieces[0]!.size)).toBe(true);
    expect(t.junctions).toHaveLength(r.plan.layers.streets!.junctions.length);
    expect(t.pieces.length).toBeGreaterThan(100);
  });

  it("a test double for traffic leaves the digests of streets to ground equal to the standard run's (R-4), its list built by replacing the stage named traffic", () => {
    const r = cityOf(DEFAULT);
    if (!r.ok) throw new Error("default city failed");
    const double: CityStageDef = { name: "traffic", run: () => ({ stage: "traffic", junctions: [], pieces: [] }), picture: trafficStage.picture };
    const list = stagesOf("on", double);
    expect(list.map((s) => s.name)).toEqual(["streets", "land", "mass", "edge", "buildings", "circuit", "facades", "ground", "traffic"]);
    expect(list[list.length - 1]).toBe(double);
    const d = runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, undefined, list);
    expect(d.ok).toBe(true);
    for (const s of ["streets", "land", "mass", "edge", "buildings", "facades", "ground"] as const) expect(d.plan.digests[s], s).toBe(r.plan.digests[s]);
    expect(d.plan.digests.traffic).not.toBe(r.plan.digests.traffic);
  });

  it("R-1: an earlier layer is not edited by the stage: a stage that writes into ground fails the run naming itself", () => {
    const writer: CityStageDef = {
      name: "traffic",
      run: (plan) => {
        (plan.layers.ground as unknown as { props: unknown[] }).props.length = 0;
        return { stage: "traffic", junctions: [], pieces: [] };
      },
      picture: trafficStage.picture,
    };
    const r: CityPlanRun = runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, undefined, stagesOf("on", writer));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.failure.stage).toBe("traffic");
  });

  it("the digest pins (R-4): 6 x 6 seeds 1 (the default), 2, 3 and 8, one-way on; the layers before it are as their stages pin them", () => {
    const PINS: readonly (readonly [number, string])[] = [
      [1, "784fd70b"],
      [2, "b044bc91"],
      [3, "f8203309"],
      [8, "8d9be3b4"],
    ];
    // stages 7 and 8's pins, unchanged by stage 9 (their own tests pin them as well)
    const GROUND_PINS: readonly (readonly [number, string])[] = [
      [1, "7f01ba46"],
      [2, "8e10c8e7"],
      [3, "f2fe9c97"],
      [8, "3d7f06f1"],
    ];
    const FACADES_PINS: readonly (readonly [number, string])[] = [
      [1, "e96db65b"],
      [2, "25f96f25"],
      [3, "68430a02"],
      [8, "53f33a18"],
    ];
    expect(PINNED.map((c) => c.seed)).toEqual([1, 2, 3, 8]);
    const got = PINS.map(([seed]) => {
      const r = cityOf({ blocksX: 6, blocksZ: 6, seed, way: "on" });
      return [seed, r.ok && r.plan.digests.traffic] as const;
    });
    expect(got).toEqual(PINS);
    for (const [seed, pin] of GROUND_PINS) expect(cityOf({ blocksX: 6, blocksZ: 6, seed, way: "on" }).plan.digests.ground, `seed ${seed} ground`).toBe(pin);
    for (const [seed, pin] of FACADES_PINS) expect(cityOf({ blocksX: 6, blocksZ: 6, seed, way: "on" }).plan.digests.facades, `seed ${seed} facades`).toBe(pin);
  });

  it("the same city twice gives the same digest, and another seed another (R-3)", () => {
    const a = cityOf(DEFAULT);
    const b = runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, undefined, stagesOf("on"));
    expect(a.ok && b.ok && a.plan.digests.traffic === b.plan.digests.traffic).toBe(true);
    const c = cityOf({ ...DEFAULT, seed: 2 });
    expect(a.ok && c.ok && a.plan.digests.traffic !== c.plan.digests.traffic).toBe(true);
    if (a.ok) expect(digestOf(a.plan.layers.traffic!)).toBe(a.plan.digests.traffic);
  });

  it("R-7: the stage reads only streets, mass, edge, facades and ground (nothing of circuit, not its own layer), and gives the same layer from the same plan", () => {
    const r = cityOf(DEFAULT);
    if (!r.ok) throw new Error("default city failed");
    const read = new Set<string>();
    const layers = new Proxy(r.plan.layers, {
      get(target, key, receiver) {
        read.add(String(key));
        return Reflect.get(target, key, receiver);
      },
    });
    const layer = trafficStage.run({ ...r.plan, layers }, stageRand("traffic", 1));
    expect([...read].sort()).toEqual(["edge", "facades", "ground", "mass", "streets"]);
    expect(digestOf(layer)).toBe(r.plan.digests.traffic);
  });

  const DIR = fileURLToPath(new URL("./", import.meta.url));
  const FILES = readdirSync(DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "testcities.ts");
  const codeOf = (f: string): string =>
    readFileSync(`${DIR}${f}`, "utf8")
      .split("\n")
      .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*"))
      .join("\n");

  it("R-6: the stage's files import only src/core, the pipeline's helpers and their own files (no other stage folder, no renderer, no three, no DOM), and read no clock, file or random", () => {
    expect(FILES.length).toBeGreaterThanOrEqual(11);
    for (const f of FILES) {
      for (const m of codeOf(f).matchAll(/from\s+"([^"]+)"/g)) {
        const path = m[1]!;
        expect(path.startsWith("./") || path === "../../core" || path.startsWith("../pipeline/"), `${f} imports ${path}`).toBe(true);
      }
      expect(codeOf(f), f).not.toMatch(/Math\.random|Date\.now|performance\.now|\bdocument\b|\bwindow\b|\bfetch\b|readFileSync|from\s+"three"/);
    }
  });

  it("no file reads a block's rank (bi, bj) or a street's line, the circuit layer, or another stage's code", () => {
    for (const f of FILES) {
      const code = codeOf(f);
      expect(code, f).not.toMatch(/\.(bi|bj)\b|\bstreets?\.line\b|\bs\.line\b/);
      expect(code, f).not.toMatch(/layers\.circuit|facades\/|ground\//);
    }
  });
});

describe("the picture (criterion 6, R-5)", { timeout: 120_000 }, () => {
  it("has the lattice's size and the legend of the ticket, marks each junction's cells by its control, and has one point per grounded piece", () => {
    const r = cityOf(DEFAULT);
    if (!r.ok) throw new Error("default city failed");
    const pic = trafficStage.picture(r.plan);
    const { streets, traffic } = r.plan.layers;
    expect(pictureProblems(pic, streets!.w, streets!.h)).toEqual([]);
    expect(pic.stage).toBe("traffic");
    expect(pic.legend.map((e) => e.name)).toEqual(["nothing", "signal junction", "all-way stop", "T, side street stops", "corner, no control", "signal mast", "stop sign", "signal box", "parking sign"]);
    expect(pic.legend).toBe(TRAFFIC_LEGEND);
    const want = new Map<number, number>();
    const control = new Map(traffic!.junctions.map((t) => [t.junction, t.control] as const));
    for (const j of streets!.junctions) {
      const c = control.get(j.id);
      for (const cell of j.cells) want.set(cell.j * streets!.w + cell.i, c === "signals" ? 1 : c === "allStop" ? 2 : c === "stop" ? 3 : 4);
    }
    pic.cells.forEach((c, k) => expect(c, `cell ${k}`).toBe(want.get(k) ?? 0));
    for (const index of [1, 2, 3, 4]) expect(pic.cells.includes(index), `legend ${index} is used`).toBe(true);
    const grounded = traffic!.pieces.filter((p) => p.grounded);
    expect(pic.points).toHaveLength(grounded.length);
    pic.points.forEach((pt, k) => {
      const p = grounded[k]!;
      const at = p.kind === "signalMast" ? poleOf(p) : { x: p.placement.x_m, z: p.placement.z_m };
      expect(pt).toEqual({ x_m: at.x, z_m: at.z, legend: legendOf(p) });
    });
    expect(new Set(pic.points.map((q) => q.legend))).toEqual(new Set([5, 6, 7, 8]));
    expect(layersOf(DEFAULT).traffic).toBe(traffic);
  });
});
