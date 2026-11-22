/**
 * Ticket 073 B: stage 10 on the named cities and on a hand-worked fixture; the picture (R-5); R-1 to R-7, X-1 and X-7.
 * The stage reads only the streets layer, so the named runs are built through stage 1 alone (one full clean run, for the clean digests).
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CityHistoryLayer, CityPlan, CityPlanBlock } from "../../core";
import { digestOf } from "../pipeline/digest";
import { pictureProblems } from "../pipeline/picture";
import { runCity, runCityEra } from "../stages";
import { historyHash, historyUnit, sizeOf } from "./districts";
import { buildHistory, historyFailures, historyPicture, historyStage, runHistory } from "./stage";
import { NAMED, PINNED, FIXTURE_H, FIXTURE_W, fixtureBlocks, label, planOf } from "./testcities";

const layerOf = (c: (typeof NAMED)[number]): CityHistoryLayer => runHistory(planOf(c));

describe("criterion 1: the districts on the 20 named runs", { timeout: 120_000 }, () => {
  it("every block is in exactly one district; each has 1 to 4 blocks that touch across a street; the id is its first block's in streets.blocks order", () => {
    for (const c of NAMED) {
      const plan = planOf(c);
      const blocks = plan.layers.streets!.blocks;
      const layer = layerOf(c);
      expect(historyFailures(layer, blocks), label(c)).toEqual([]);
      // independent of historyFailures: count each block once, and walk each district's blocks over `sides[*].across`
      const seen = new Map<string, number>();
      const index = new Map(blocks.map((b, k) => [b.id, k] as const));
      let last = -1;
      for (const d of layer.districts) {
        expect(d.blocks.length, `${label(c)} ${d.id}`).toBeGreaterThanOrEqual(1);
        expect(d.blocks.length, `${label(c)} ${d.id}`).toBeLessThanOrEqual(4);
        expect(d.id).toBe(`district:${d.blocks[0]}`);
        expect(d.blocks.map((b) => index.get(b)!)).toEqual([...d.blocks.map((b) => index.get(b)!)].sort((a, b) => a - b));
        expect(index.get(d.blocks[0]!)!, "districts in the order of their first block").toBeGreaterThan(last);
        last = index.get(d.blocks[0]!)!;
        for (const b of d.blocks) seen.set(b, (seen.get(b) ?? 0) + 1);
        const byId = new Map(blocks.map((b) => [b.id, b] as const));
        const reach = new Set([d.blocks[0]!]);
        for (let again = true; again; ) {
          again = false;
          for (const id of [...reach]) {
            for (const side of Object.values(byId.get(id)!.sides)) {
              for (const a of side.across) if (d.blocks.includes(a.block) && !reach.has(a.block)) (reach.add(a.block), (again = true));
            }
          }
        }
        expect(reach.size, `${label(c)} ${d.id} touches across a street`).toBe(d.blocks.length);
      }
      expect([...seen.keys()].sort(), label(c)).toEqual(blocks.map((b) => b.id).sort());
      expect([...seen.values()].every((n) => n === 1), label(c)).toBe(true);
    }
  });

  it("criterion 2: a district stops at its hashed size or when no neighbour is free: a short district's neighbours all belong to districts that started earlier", () => {
    for (const c of NAMED) {
      const plan = planOf(c);
      const seed = plan.options.seed;
      const blocks = plan.layers.streets!.blocks;
      const rank = new Map([...blocks].sort((a, b) => historyHash(seed, "order", a.id) - historyHash(seed, "order", b.id) || blocks.indexOf(a) - blocks.indexOf(b)).map((b, k) => [b.id, k] as const));
      const layer = layerOf(c);
      const districtOf = new Map(layer.districts.flatMap((d) => d.blocks.map((b) => [b, d] as const)));
      const startOf = (blockIds: readonly string[]): string => [...blockIds].sort((a, b) => rank.get(a)! - rank.get(b)!)[0]!;
      for (const d of layer.districts) {
        const start = startOf(d.blocks);
        expect(d.blocks.length, `${label(c)} ${d.id}`).toBeLessThanOrEqual(sizeOf(seed, start));
        if (d.blocks.length < sizeOf(seed, start)) {
          for (const b of d.blocks) {
            for (const side of Object.values(blocks.find((x) => x.id === b)!.sides)) {
              for (const a of side.across) {
                const other = districtOf.get(a.block)!;
                if (other !== d) expect(rank.get(startOf(other.blocks))!, `${label(c)} ${d.id} left ${a.block} free`).toBeLessThan(rank.get(start)!);
              }
            }
          }
        }
      }
    }
  });

  it("criterion 2: each story follows the story rule: held 0 where its hash is under 0.25 (and only just above it, where (u - 0.25) / 0.75 rounds to 0); wild within 0.15 of 1 - held; tech within 0.1 of 1 - step / (most + 1), steps counted independently", () => {
    for (const c of NAMED) {
      const plan = planOf(c);
      const seed = plan.options.seed;
      const blocks = plan.layers.streets!.blocks;
      const layer = layerOf(c);
      const byId = new Map(blocks.map((b) => [b.id, b] as const));
      const inner = blocks.filter((b) => Object.values(b.sides).every((s) => s.across.length > 0));
      expect(inner.length, `${label(c)} has an inner block`).toBeGreaterThan(0);
      const first = [...inner].sort((a, b) => historyHash(seed, "order", a.id) - historyHash(seed, "order", b.id) || blocks.indexOf(a) - blocks.indexOf(b))[0]!;
      const centre = layer.districts.find((d) => d.blocks.includes(first.id))!;
      const dist = new Map<string, number>(centre.blocks.map((b) => [b, 0] as const));
      for (let queue = [...centre.blocks]; queue.length > 0; ) {
        const next: string[] = [];
        for (const id of queue) {
          for (const side of Object.values(byId.get(id)!.sides)) {
            for (const a of side.across) if (!dist.has(a.block)) (dist.set(a.block, dist.get(id)! + 1), next.push(a.block));
          }
        }
        queue = next;
      }
      const steps = layer.districts.map((d) => Math.min(...d.blocks.map((b) => dist.get(b)!)));
      const most = Math.max(...steps);
      layer.districts.forEach((d, k) => {
        for (const v of [d.tech, d.held, d.wild]) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
          expect(Math.abs(v * 100 - Math.round(v * 100)), `${d.id} at 2 decimals`).toBeLessThan(1e-9);
        }
        const u = historyUnit(seed, "held", d.id);
        if (u < 0.25) expect(d.held, `${label(c)} ${d.id}`).toBe(0);
        else expect(d.held === 0, `${label(c)} ${d.id} held ${d.held}, u ${u}`).toBe(u < 0.25 + 0.005 * 0.75);
        expect(Math.abs(d.wild - (1 - d.held)), `${d.id} wild`).toBeLessThanOrEqual(0.15 + 0.0051);
        expect(Math.abs(d.tech - (1 - steps[k]! / (most + 1))), `${d.id} tech`).toBeLessThanOrEqual(0.1 + 0.0051);
      });
      expect(centre.tech, `${label(c)} the centre district has step 0`).toBeGreaterThanOrEqual(0.9 - 0.0051);
    }
  });
});

describe("criterion 2: a hand-worked fixture city (3 x 3 blocks, one inner), seed 3", () => {
  // Hashes, typed in (and pinned against the real function below), as fractions of 2^32. Block (c, r) is "block:c:r".
  //   hashed order (`history:3:order:<id>`): 0:2, 0:1, 0:0, 1:2, 1:0, 1:1, 2:1, 2:0, 2:2
  //   size draw u (`history:3:size:<id>`): 0:2 2 blocks, 0:1 2, 0:0 1, 1:0 1, 2:1 4 (the others are never a start)
  const ORDER = ["block:0:2", "block:0:1", "block:0:0", "block:1:2", "block:1:0", "block:1:1", "block:2:1", "block:2:0", "block:2:2"];
  const SIZE: Record<string, number> = { "block:0:2": 2, "block:0:1": 2, "block:0:0": 1, "block:1:0": 1, "block:2:1": 4 };
  // Story hashes of the five districts (`history:3:tech|held|wild:<district id>`), 4 decimals.
  const STORY_U: Record<string, readonly [number, number, number]> = {
    "district:block:0:0": [0.0174, 0.4404, 0.4344],
    "district:block:0:1": [0.0135, 0.4443, 0.4305],
    "district:block:0:2": [0.0096, 0.4482, 0.4266],
    "district:block:1:0": [0.9918, 0.2782, 0.5289],
    "district:block:2:0": [0.8545, 0.0405, 0.7667],
  };

  it("the typed-in hashes are the real ones", () => {
    const blocks = fixtureBlocks();
    const real = [...blocks].sort((a, b) => historyHash(3, "order", a.id) - historyHash(3, "order", b.id)).map((b) => b.id);
    expect(real).toEqual(ORDER);
    for (const [id, n] of Object.entries(SIZE)) expect(sizeOf(3, id), id).toBe(n);
    for (const [id, u] of Object.entries(STORY_U)) {
      expect(Math.round(historyUnit(3, "tech", id) * 1e4) / 1e4, id).toBe(u[0]);
      expect(Math.round(historyUnit(3, "held", id) * 1e4) / 1e4, id).toBe(u[1]);
      expect(Math.round(historyUnit(3, "wild", id) * 1e4) / 1e4, id).toBe(u[2]);
    }
  });

  it("the districts, worked by hand", () => {
    // Widths 10, 25, 40 (columns 0 to 2), heights 10, 20, 30 (rows 0 to 2). Side by side (+x) two blocks share their row's height; stacked (+z) their column's width.
    expect([FIXTURE_W, FIXTURE_H]).toEqual([[10, 25, 40], [10, 20, 30]]);
    // 1. Start 0:2 (size 2): free neighbours 1:2 across +x (shares the height of row 2, 30 cells) and 0:1 across -z (the width of column 0, 10). The longest wins: 1:2. District {0:2, 1:2}.
    // 2. Start 0:1 (size 2): 0:2 is taken. Free: 0:0 (width 10), 1:1 (height of row 1, 20). 1:1 wins. District {0:1, 1:1}.
    // 3. Start 0:0 (size 1): alone. 1:2 is taken. Start 1:0 (size 1): alone. 1:1 is taken.
    // 4. Start 2:1 (size 4): free 2:0 and 2:2 both share the width of column 2, 40 cells: a tie, and block:2:0 is the least id. Then 2:2 (shares 40 with 2:1). Then nothing is free
    //    (1:0, 1:1, 1:2 are taken): it stops at 3 blocks, short of its size 4.
    // Ids are the first block in streets.blocks order (column by column): 0:0, 0:1, 0:2, 1:0, 2:0.
    const layer = buildHistory(fixtureBlocks(), 3);
    expect(layer.stage).toBe("history");
    expect(layer.districts.map((d) => [d.id, d.blocks])).toEqual([
      ["district:block:0:0", ["block:0:0"]],
      ["district:block:0:1", ["block:0:1", "block:1:1"]],
      ["district:block:0:2", ["block:0:2", "block:1:2"]],
      ["district:block:1:0", ["block:1:0"]],
      ["district:block:2:0", ["block:2:0", "block:2:1", "block:2:2"]],
    ]);
  });

  it("the stories, worked by hand", () => {
    // The only inner block is 1:1 (every side has a block across it), so the centre district is district:block:0:1 (step 0). Streets crossed from {0:1, 1:1}:
    // 0:0, 0:2, 1:0, 1:2 and 2:1 are one street away; 2:0 and 2:2 two. So the steps are 1 (0:0), 0 (0:1), 1 (0:2), 1 (1:0) and 1 (2:0, through 2:1); the city's most is 1.
    // tech = 1 - step / 2 + (u - 0.5) * 0.2:  0:0 0.5 + (0.0174 * 2 - 1) * 0.1 = 0.4035 -> 0.4;  0:1 1 - 0.0973 = 0.9;  0:2 0.5 - 0.0981 = 0.4;  1:0 0.5 + 0.0984 = 0.6;  2:0 0.5 + 0.0709 = 0.57.
    // held: u under 0.25 gives 0 (2:0, u 0.0405); else (u - 0.25) / 0.75: 0:0 0.2539 -> 0.25;  0:1 0.2591 -> 0.26;  0:2 0.2643 -> 0.26;  1:0 0.0376 -> 0.04.
    // wild = 1 - held + (u * 2 - 1) * 0.15, clamped: 0:0 0.75 - 0.0197 = 0.73;  0:1 0.74 - 0.0209 = 0.72;  0:2 0.74 - 0.0220 = 0.72;  1:0 0.96 + 0.0087 = 0.97;  2:0 1 + 0.0800 -> clamped 1.
    const layer = buildHistory(fixtureBlocks(), 3);
    expect(layer.districts.map((d) => [d.id, d.tech, d.held, d.wild])).toEqual([
      ["district:block:0:0", 0.4, 0.25, 0.73],
      ["district:block:0:1", 0.9, 0.26, 0.72],
      ["district:block:0:2", 0.4, 0.26, 0.72],
      ["district:block:1:0", 0.6, 0.04, 0.97],
      ["district:block:2:0", 0.57, 0, 1],
    ]);
  });
});

describe("criterion 3: the picture (R-5)", { timeout: 120_000 }, () => {
  it("has the lattice's size, one legend entry per district plus nothing, and each cell carries its district's index", () => {
    for (const c of [NAMED[0]!, NAMED[10]!]) {
      const plan = planOf(c);
      const streets = plan.layers.streets!;
      const layer = layerOf(c);
      const pic = historyPicture(plan, layer);
      expect(pictureProblems({ ...pic, stage: "streets" }, streets.w, streets.h), label(c)).toEqual([]);
      expect(pic.stage).toBe("history");
      expect(pic.legend).toHaveLength(layer.districts.length + 1);
      expect(pic.legend[0]!.name).toBe("nothing");
      layer.districts.forEach((d, k) => expect(pic.legend[k + 1]!.name.startsWith(d.id + " "), d.id).toBe(true));
      const want = new Array<number>(streets.w * streets.h).fill(0);
      layer.districts.forEach((d, k) => {
        for (const id of d.blocks) {
          const b = streets.blocks.find((x) => x.id === id)!;
          for (let j = b.j0; j < b.j1; j++) for (let i = b.i0; i < b.i1; i++) want[j * streets.w + i] = k + 1;
        }
      });
      expect(pic.cells).toEqual(want);
      for (let k = 0; k < layer.districts.length; k++) expect(pic.cells.includes(k + 1), `legend ${k + 1} is used`).toBe(true);
      // touching districts are told apart by colour
      const colour = (id: string): number => pic.legend[layer.districts.findIndex((d) => d.blocks.includes(id)) + 1]!.rgb;
      for (const b of streets.blocks) {
        for (const side of Object.values(b.sides)) {
          for (const a of side.across) {
            const mine = layer.districts.find((d) => d.blocks.includes(b.id))!;
            const theirs = layer.districts.find((d) => d.blocks.includes(a.block))!;
            if (mine !== theirs) expect(colour(b.id), `${b.id} and ${a.block}`).not.toBe(colour(a.block));
          }
        }
      }
    }
  });
});

describe("criterion 4: R-1 to R-7, X-1, X-7", { timeout: 120_000 }, () => {
  it("R-1: the layer is deep-frozen", () => {
    const layer = layerOf(NAMED[0]!);
    expect(Object.isFrozen(layer)).toBe(true);
    expect(Object.isFrozen(layer.districts)).toBe(true);
    expect(Object.isFrozen(layer.districts[0])).toBe(true);
    expect(Object.isFrozen(layer.districts[0]!.blocks)).toBe(true);
  });

  it("R-4: the digest is pinned on 6 x 6 seeds 1, 2, 3 and 8, one-way on", () => {
    const PINS: readonly (readonly [number, string])[] = [
      [1, "11f95e7f"],
      [2, "a3a26e0c"],
      [3, "d6856fe2"],
      [8, "9cb1f3bf"],
    ];
    expect(PINNED.map((c) => c.seed)).toEqual([1, 2, 3, 8]);
    for (const [seed, pin] of PINS) {
      const c = PINNED.find((p) => p.seed === seed)!;
      expect(digestOf(layerOf(c)), `seed ${seed}`).toBe(pin);
    }
  });

  it("R-3: the same city twice gives the same layer, another seed another", () => {
    const a = layerOf(NAMED[0]!);
    const b = runHistory(planOf(NAMED[0]!));
    expect(b).toEqual(a);
    expect(digestOf(b)).toBe(digestOf(a));
    expect(digestOf(layerOf(NAMED[1]!))).not.toBe(digestOf(a));
  });

  it("R-7: the stage reads only the streets layer (and the seed), never its own layer or another stage's", () => {
    const plan = planOf(NAMED[0]!);
    const read = new Set<string>();
    const layers = new Proxy(plan.layers, {
      get(target, key, receiver) {
        read.add(String(key));
        return Reflect.get(target, key, receiver);
      },
    });
    runHistory({ ...plan, layers });
    expect([...read]).toEqual(["streets"]);
  });

  it("X-1: running history leaves every clean digest as it was, and a double for history changes only its own digest (6 x 6 seed 1, the whole clean run)", () => {
    const r = runCity({ blocksX: 6, blocksZ: 6, seed: 1 });
    if (!r.ok) throw new Error("default city failed");
    const before = { ...r.plan.digests };
    const layer = runHistory(r.plan);
    const double: CityHistoryLayer = { stage: "history", districts: [] };
    expect(digestOf(double)).not.toBe(digestOf(layer));
    expect(r.plan.digests).toEqual(before);
    for (const [stage, d] of Object.entries(before)) expect(digestOf(r.plan.layers[stage as keyof CityPlan["layers"]]), stage).toBe(d);
    expect(Object.keys(r.plan.layers)).not.toContain("history");
    expect(Object.keys(r.plan.digests)).not.toContain("history");
  });

  it("X-7: a clean run builds no history layer and the clean stage list does not name it", () => {
    const r = runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, "streets");
    if (!r.ok) throw new Error("streets failed");
    expect(Object.keys(r.plan.layers)).toEqual(["streets"]);
    expect(() => runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, "history" as never)).toThrow();
  });

  it("fails, naming its stage, when the plan has no streets or no block", () => {
    const plan = planOf(NAMED[0]!);
    expect(() => runHistory({ ...plan, layers: {} })).toThrow(/streets/);
    expect(() => buildHistory([] as CityPlanBlock[], 1)).toThrow(/no block/);
  });

  const DIR = fileURLToPath(new URL("./", import.meta.url));
  const FILES = readdirSync(DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "testcities.ts");
  const codeOf = (f: string): string =>
    readFileSync(`${DIR}${f}`, "utf8")
      .split("\n")
      .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*"))
      .join("\n");

  it("R-6, R-7: the files import only src/core, the pipeline's helpers and their own files; no clock, random, file, DOM; no bi, bj or street line", () => {
    expect(FILES.length).toBeGreaterThanOrEqual(5);
    for (const f of FILES) {
      for (const m of codeOf(f).matchAll(/from\s+"([^"]+)"/g)) {
        const path = m[1]!;
        expect(path.startsWith("./") || path === "../../core" || path.startsWith("../pipeline/"), `${f} imports ${path}`).toBe(true);
      }
      expect(codeOf(f), f).not.toMatch(/Math\.random|Date\.now|performance\.now|\bdocument\b|\bwindow\b|\bfetch\b|readFileSync|from\s+"three"/);
      expect(codeOf(f), f).not.toMatch(/\.(bi|bj)\b|\bstreets?\.line\b|\bs\.line\b/);
      expect(codeOf(f), f).not.toMatch(/layers\.(?!streets\b|history\b)[a-z]+/);
    }
  });
});

describe("criterion 5: the era runner runs history", { timeout: 120_000 }, () => {
  it("runCityEra(options, \"tech\") on 6 x 6 seed 1 writes the history layer with the pinned digest, and its picture has the district legend", () => {
    const r = runCityEra({ blocksX: 6, blocksZ: 6, seed: 1 }, "tech");
    if (!r.ok) throw new Error(`era run failed at ${r.failure.stage}: ${r.failure.reason}`);
    expect(Object.keys(r.plan.layers)).toEqual(["history"]);
    expect(r.plan.digests.history).toBe("11f95e7f");
    const layer = r.plan.layers.history!;
    expect(Object.isFrozen(layer)).toBe(true);
    expect(digestOf(layer)).toBe("11f95e7f");
    const pic = historyStage.picture(r.plan);
    expect(pic.stage).toBe("history");
    expect(pic.legend).toHaveLength(layer.districts.length + 1);
    expect(Object.keys(r.plan.plan.layers)).not.toContain("history");
  });

  it("X-7: era \"clean\" runs no era stage, and the clean run builds no history", () => {
    const r = runCityEra({ blocksX: 6, blocksZ: 6, seed: 1 }, "clean");
    if (!r.ok) throw new Error("clean failed");
    expect(r.plan.layers).toEqual({});
    expect(Object.keys(r.plan.plan.layers)).not.toContain("history");
  });
});
