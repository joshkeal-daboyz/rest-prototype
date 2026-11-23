/**
 * The shared named cities (ticket 076 A): the lists and label the switched test files use, each profile's plan read back from the cache `toStrictEqual`s a direct build, the era runs do too, and the guard: everything a
 * shared run hands out is frozen, a write throws, and the file on disk is never changed by a test. HEAVY: each profile of two cities and the three eras of one are built directly once.
 */
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { CityEraRun, CityPlanRun } from "../../core";
import { CITY_STAGES } from "../../core";
import { digestOf } from "../pipeline/digest";
import type { CityStageDef } from "../pipeline/types";
import { BUILT_STAGES, runCity, runCityEra } from "../stages";
import { streetsStageWith } from "../streets/stage";
import { createCityCache, fileOf } from "./cache";
import { DEFAULT, label, NAMED, PINNED, PROFILE_STAGES, sharedCity, sharedEra, type CityProfile, type NamedCity } from "./namedcities";

// Direct builds of whole cities, several to a test: a longer limit than the default.
vi.setConfig({ testTimeout: 120_000 });

let dir = "";
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "rest-city-cache-test-"));
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const PROFILES = Object.keys(PROFILE_STAGES) as CityProfile[];
const SEED1_OFF: NamedCity = { blocksX: 6, blocksZ: 6, seed: 1, way: "off" };
const TINY: NamedCity = { blocksX: 1, blocksZ: 1, seed: 1, way: "on" };
const options = (o: NamedCity): { blocksX: number; blocksZ: number; seed: number } => ({ blocksX: o.blocksX, blocksZ: o.blocksZ, seed: o.seed });

/** The stage list a profile names, written out here and not taken from the helper's own function. */
function directStages(profile: CityProfile, way: "on" | "off"): CityStageDef[] {
  return PROFILE_STAGES[profile].map((n) => (n === "streets" && way === "off" ? (streetsStageWith(0) as unknown as CityStageDef) : BUILT_STAGES.find((s) => s.name === n)!));
}
const direct = (o: NamedCity, profile: CityProfile): CityPlanRun => runCity(options(o), PROFILE_STAGES[profile].at(-1), directStages(profile, o.way));

/** Every object reachable from `root` through own enumerable values, once each. A Map, a Set or a typed array would escape `deepFreeze`, so one fails the walk. */
function walk(root: unknown): { objects: number; unfrozen: string[]; odd: string[] } {
  const seen = new Set<object>();
  const unfrozen: string[] = [];
  const odd: string[] = [];
  const stack: { v: unknown; at: string }[] = [{ v: root, at: "$" }];
  while (stack.length > 0) {
    const { v, at } = stack.pop()!;
    if (typeof v !== "object" || v === null || seen.has(v)) continue;
    seen.add(v);
    if (v instanceof Map || v instanceof Set || ArrayBuffer.isView(v) || v instanceof Date) odd.push(at);
    if (!Object.isFrozen(v)) unfrozen.push(at);
    for (const [k, c] of Object.entries(v)) stack.push({ v: c, at: `${at}.${k}` });
  }
  return { objects: seen.size, unfrozen, odd };
}

describe("the lists", () => {
  it("NAMED is the 20 runs, 6 x 6 seeds 1 to 10, one-way on then off", () => {
    expect(NAMED).toHaveLength(20);
    expect(NAMED.slice(0, 10).map((o) => [o.seed, o.way])).toStrictEqual(Array.from({ length: 10 }, (_, n) => [n + 1, "on"]));
    expect(NAMED.slice(10).map((o) => [o.seed, o.way])).toStrictEqual(Array.from({ length: 10 }, (_, n) => [n + 1, "off"]));
    expect(NAMED.every((o) => o.blocksX === 6 && o.blocksZ === 6)).toBe(true);
  });
  it("PINNED is seeds 1, 2, 3 and 8, one-way on; DEFAULT is seed 1 one-way on", () => {
    expect(PINNED).toStrictEqual([1, 2, 3, 8].map((seed) => ({ blocksX: 6, blocksZ: 6, seed, way: "on" })));
    expect(DEFAULT).toStrictEqual({ blocksX: 6, blocksZ: 6, seed: 1, way: "on" });
  });
  it("label is the text every helper uses today", () => {
    expect(label(DEFAULT)).toBe("6 x 6 seed 1 one-way on");
    expect(label(SEED1_OFF)).toBe("6 x 6 seed 1 one-way off");
    expect(label({ blocksX: 3, blocksZ: 4, seed: 9, way: "on" })).toBe("3 x 4 seed 9 one-way on");
  });
  it("each profile is the built stages, in CITY_STAGES order, up to the stage it stops at", () => {
    const built = CITY_STAGES.filter((s) => BUILT_STAGES.some((b) => b.name === s));
    expect(PROFILE_STAGES.clean).toStrictEqual(built);
    expect(PROFILE_STAGES.ground).toStrictEqual(built.filter((s) => s !== "traffic"));
    expect(PROFILE_STAGES.facades).toStrictEqual(built.slice(0, built.indexOf("facades") + 1));
    expect(PROFILE_STAGES.edge).toStrictEqual(["streets", "land", "mass", "edge"]);
    expect(PROFILE_STAGES.buildings).toStrictEqual(["streets", "land", "mass", "buildings"]);
  });
});

describe("a plan read back from the cache is a direct build", () => {
  for (const o of [DEFAULT, SEED1_OFF]) {
    for (const profile of PROFILES) {
      it(`${profile} on ${label(o)}: toStrictEqual a direct runCity, and every layer's digest is the recorded one`, () => {
        const want = direct(o, profile);
        expect(want.ok).toBe(true);
        const key = `${profile}:${label(o)}`;
        const built = createCityCache(dir, undefined).cached(key, () => direct(o, profile));
        const read = createCityCache(dir, undefined).cached<CityPlanRun>(key, () => {
          throw new Error("the second instance must read the file, not build");
        });
        expect(readdirSync(dir)).toContain(fileOf(dir, key).slice(dir.length + 1));
        expect(read).toStrictEqual(want);
        expect(built).toStrictEqual(want);
        for (const stage of PROFILE_STAGES[profile]) {
          expect(read.plan.digests[stage]).toBe(digestOf(read.plan.layers[stage]));
          expect(read.plan.digests[stage]).toBe(want.plan.digests[stage]);
        }
        expect(Object.keys(read.plan.layers)).toStrictEqual(PROFILE_STAGES[profile]);
      });
    }
  }

  it("sharedCity is the same run, the same object on a second call, for every profile of the default city", () => {
    for (const profile of PROFILES) {
      const a = sharedCity(DEFAULT, profile);
      expect(sharedCity(DEFAULT, profile)).toBe(a);
      expect(a).toStrictEqual(direct(DEFAULT, profile));
    }
  });

  it("a failed run is kept as it is, failure included", () => {
    const want = runCity(options(TINY), undefined, directStages("clean", "on"));
    expect(want.ok).toBe(false);
    const a = createCityCache(dir, undefined).cached("failed", () => want);
    const b = createCityCache(dir, undefined).cached<CityPlanRun>("failed", () => {
      throw new Error("must read");
    });
    expect(b).toStrictEqual(want);
    expect(a).toStrictEqual(want);
    expect(sharedCity(TINY, "clean")).toStrictEqual(want);
  });
});

describe("era runs", () => {
  const ERAS = ["tech", "holdout", "ruin"] as const;
  it("sharedEra on the default city is runCityEra, on a first build and on a second read in a fresh module", async () => {
    const dirE = mkdtempSync(join(tmpdir(), "rest-city-cache-test-"));
    try {
      const wants = ERAS.map((era) => runCityEra(options(DEFAULT), era));
      for (const w of wants) expect(w.ok).toBe(true);
      const log = join(dirE, "eras.log");
      const results: CityEraRun[][] = [];
      for (const pass of [0, 1]) {
        vi.resetModules();
        const cache = await import("./cache");
        cache.useCityCache(cache.createCityCache(dirE, log));
        const named = await import("./namedcities");
        results.push(ERAS.map((era) => named.sharedEra(DEFAULT, era)));
        expect(named.sharedEra(DEFAULT, "tech")).toBe(results[pass]![0]);
      }
      for (const run of results) ERAS.forEach((_, n) => expect(run[n]).toStrictEqual(wants[n]));
      // the second pass built nothing: each key was logged once (the clean city once, each era once)
      const keys = readFileSync(log, "utf8").trim().split("\n").map((l) => l.split("\t")[0]!);
      expect(keys.filter((k) => k.startsWith("era-"))).toHaveLength(3);
      expect(new Set(keys).size).toBe(keys.length);
    } finally {
      rmSync(dirE, { recursive: true, force: true });
    }
  });

  it("an era run of a city whose clean stages fail is the failure runCityEra returns", () => {
    const want = runCityEra(options(TINY), "tech");
    expect(want.ok).toBe(false);
    expect(sharedEra(TINY, "tech")).toStrictEqual(want);
  });
});

describe("the guard: a shared run is frozen and nothing a test does reaches the file", () => {
  it("every object reachable from a sharedCity and a sharedEra result is frozen, on a build and on a read", async () => {
    const dirG = mkdtempSync(join(tmpdir(), "rest-city-cache-test-"));
    try {
      for (const pass of [0, 1]) {
        vi.resetModules();
        const cache = await import("./cache");
        cache.useCityCache(cache.createCityCache(dirG, undefined));
        const named = await import("./namedcities");
        const city = named.sharedCity(DEFAULT, "facades");
        const era = named.sharedEra(DEFAULT, "ruin");
        for (const r of [city, era]) {
          const w = walk(r);
          expect(w.odd).toStrictEqual([]);
          expect(w.unfrozen).toStrictEqual([]);
          expect(w.objects).toBeGreaterThan(1000);
        }
        expect(readdirSync(dirG).length).toBeGreaterThan(0);
        expect(pass).toBeLessThan(2);
      }
    } finally {
      rmSync(dirG, { recursive: true, force: true });
    }
  });

  it("assigning to a nested layer field, pushing to a layer's array and deleting a key each throw TypeError, the file's bytes stay and a fresh read still equals a direct build", async () => {
    const dirG = mkdtempSync(join(tmpdir(), "rest-city-cache-test-"));
    try {
      vi.resetModules();
      const cache = await import("./cache");
      cache.useCityCache(cache.createCityCache(dirG, undefined));
      const named = await import("./namedcities");
      const run = named.sharedCity(DEFAULT, "edge");
      if (!run.ok) throw new Error("the default city must be ok");
      const file = fileOf(dirG, "edge:6x6:1:on");
      const before = readFileSync(file);
      const streets = run.plan.layers.streets as unknown as Record<string, unknown>;
      const arrayKey = Object.keys(streets).find((k) => Array.isArray(streets[k]))!;
      const nestedKey = Object.keys(streets).find((k) => typeof streets[k] === "object" && streets[k] !== null && !Array.isArray(streets[k]))!;
      expect(() => {
        streets["stage"] = "changed";
      }).toThrow(TypeError);
      expect(() => (streets[arrayKey] as unknown[]).push(1)).toThrow(TypeError);
      expect(() => {
        delete streets[arrayKey];
      }).toThrow(TypeError);
      expect(() => {
        (streets[nestedKey] as Record<string, unknown>)["extra"] = 1;
      }).toThrow(TypeError);
      expect(() => {
        (run.plan.digests as Record<string, string>)["streets"] = "x";
      }).toThrow(TypeError);
      expect(readFileSync(file).equals(before)).toBe(true);
      vi.resetModules();
      const fresh = await import("./cache");
      const read = fresh.createCityCache(dirG, undefined).cached<CityPlanRun>("edge:6x6:1:on", () => {
        throw new Error("must read");
      });
      expect(read).toStrictEqual(direct(DEFAULT, "edge"));
    } finally {
      rmSync(dirG, { recursive: true, force: true });
    }
  });
});

describe("the folder's imports", () => {
  it("every non-test file in src/city/testing/ imports only src/core/, src/city/, vitest and node built-ins, and none mentions .biome", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const files = readdirSync(here).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    expect(files.length).toBeGreaterThanOrEqual(3);
    for (const f of files) {
      const text = readFileSync(join(here, f), "utf8");
      expect(text.includes(".biome")).toBe(false);
      for (const m of text.matchAll(/from\s+"([^"]+)"/g)) {
        const spec = m[1]!;
        const ok = spec.startsWith("node:") || spec === "vitest" || spec === "vitest/node" || spec.startsWith("./") || /^(\.\.\/)+core(\/|$)/.test(spec) || /^\.\.\/[a-z]+(\/|$)/.test(spec);
        expect(ok, `${f} imports ${spec}`).toBe(true);
      }
    }
  });
});
