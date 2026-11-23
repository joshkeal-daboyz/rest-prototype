/**
 * The per-run disk cache (ticket 076 A): a miss builds and writes one file, a hit in a fresh module instance reads it without building, a bad file is rebuilt, an existing file is never overwritten, and with no
 * folder nothing is written. Each test has its own temporary folder under the OS temp folder.
 */
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCityCache, fileOf } from "./cache";
import { emptyDir, PREFIX, pruneOld } from "./globalsetup";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "rest-city-cache-test-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const value = (): { a: number[]; b: { n: number; z: number; u: undefined } } => ({ a: [1, 2, 3], b: { n: 7, z: -0, u: undefined } });

describe("the cache", () => {
  it("writes one file on a miss, and a fresh module instance reads it without calling the builder", async () => {
    let calls = 0;
    const first = createCityCache(dir, undefined).cached("k:1", () => (calls++, value()));
    expect(calls).toBe(1);
    expect(readdirSync(dir)).toHaveLength(1);
    vi.resetModules();
    const fresh = await import("./cache");
    const second = fresh.createCityCache(dir, undefined).cached("k:1", () => (calls++, { a: [], b: { n: 0, z: 0, u: undefined } }));
    expect(calls).toBe(1);
    expect(second).toStrictEqual(first);
    expect(Object.is(second.b.z, -0)).toBe(true);
    expect(readdirSync(dir)).toHaveLength(1);
  });

  it("keeps a value in memory for the rest of the file: one build, the same object", () => {
    const c = createCityCache(dir, undefined);
    let calls = 0;
    const a = c.cached("k", () => (calls++, value()));
    expect(c.cached("k", () => (calls++, value()))).toBe(a);
    expect(calls).toBe(1);
  });

  it("rebuilds a corrupt, empty or truncated file instead of throwing, and leaves a good file behind", () => {
    const file = fileOf(dir, "k");
    for (const bad of [Buffer.from("not a cache file at all"), Buffer.alloc(0), null]) {
      createCityCache(dir, undefined).cached("seed", () => value());
      const good = readFileSync(fileOf(dir, "seed"));
      rmSync(fileOf(dir, "seed"));
      writeFileSync(file, bad ?? good.subarray(0, good.length - 5));
      let calls = 0;
      const got = createCityCache(dir, undefined).cached("k", () => (calls++, value()));
      expect(calls).toBe(1);
      expect(got).toStrictEqual(value());
      let again = 0;
      expect(createCityCache(dir, undefined).cached("k", () => (again++, value()))).toStrictEqual(value());
      expect(again).toBe(0);
      rmSync(file);
    }
  });

  it("with no folder builds in memory only and writes nothing", () => {
    const before = readdirSync(dir);
    let calls = 0;
    const c = createCityCache(undefined, undefined);
    expect(c.cached("k", () => (calls++, value()))).toStrictEqual(value());
    expect(c.cached("k", () => (calls++, value()))).toStrictEqual(value());
    expect(calls).toBe(1);
    expect(readdirSync(dir)).toStrictEqual(before);
  });

  it("never overwrites an existing file: two builds of one key leave one file, byte for byte the first", () => {
    createCityCache(dir, undefined).cached("k", () => ({ n: 1 }));
    const first = readFileSync(fileOf(dir, "k"));
    // a second worker that missed the same key at the same moment builds and writes a different value
    createCityCache(dir, undefined).cached("other", () => ({ n: 2 }));
    rmSync(fileOf(dir, "other"));
    const writer = createCityCache(dir, undefined);
    writer.cached("k", () => ({ n: 99 })); // hits the file: no write
    expect(readdirSync(dir)).toStrictEqual(["k.v8"]);
    expect(readFileSync(fileOf(dir, "k")).equals(first)).toBe(true);
  });

  it("does not replace a good file even when a build runs after it appeared", () => {
    const c = createCityCache(dir, undefined);
    // the file appears between this worker's read and its write (the race): the builder itself writes it
    const got = c.cached("k", () => {
      createCityCache(dir, undefined).cached("k", () => ({ n: 1 }));
      return { n: 2 };
    });
    expect(got).toStrictEqual({ n: 2 });
    expect(createCityCache(dir, undefined).cached("k", () => ({ n: 3 }))).toStrictEqual({ n: 1 });
    expect(readdirSync(dir)).toHaveLength(1);
  });

  it("deep-freezes what it hands out, on a miss and on a hit", () => {
    const miss = createCityCache(dir, undefined).cached("k", () => ({ list: [{ n: 1 }] }));
    const hit = createCityCache(dir, undefined).cached("k", () => ({ list: [] as { n: number }[] }));
    for (const v of [miss, hit]) {
      expect(Object.isFrozen(v)).toBe(true);
      expect(Object.isFrozen(v.list)).toBe(true);
      expect(Object.isFrozen(v.list[0])).toBe(true);
    }
  });

  it("appends one line a build (key, process id) to the log file when one is named, and none on a hit", () => {
    const log = join(dir, "build.log");
    createCityCache(dir, log).cached("k", () => ({ n: 1 }));
    createCityCache(dir, log).cached("k", () => ({ n: 1 }));
    createCityCache(dir, log).cached("j", () => ({ n: 1 }));
    expect(readFileSync(log, "utf8").trim().split("\n")).toStrictEqual([`k\t${process.pid}`, `j\t${process.pid}`]);
  });

  it("makes key names safe for a file system", () => {
    createCityCache(dir, undefined).cached("ground:6x6:1:on", () => ({ n: 1 }));
    expect(readdirSync(dir)).toStrictEqual(["ground-6x6-1-on.v8"]);
  });
});

describe("the global setup helpers", () => {
  it("deletes only rest-city-cache folders older than a day, and empties a folder without removing it", () => {
    for (const n of [`${PREFIX}a`, `${PREFIX}b`, "something-else"]) mkdirSync(join(dir, n));
    expect(pruneOld(dir, Date.now())).toBe(0);
    expect(readdirSync(dir).sort()).toStrictEqual([`${PREFIX}a`, `${PREFIX}b`, "something-else"]);
    expect(pruneOld(dir, Date.now() + 2 * 24 * 60 * 60 * 1000)).toBe(2);
    expect(readdirSync(dir)).toStrictEqual(["something-else"]);
    writeFileSync(join(dir, "x.v8"), "x");
    emptyDir(dir);
    expect(readdirSync(dir)).toStrictEqual([]);
  });
});
