/**
 * The per-run disk cache of built cities (ticket 076 A). Test support only: a stage never imports it.
 *
 * `cached(key, build)` looks for the key in the run's folder (made by `globalsetup.ts` and handed over with vitest's `provide`). On a miss it runs `build`, writes the value with `node:v8` `serialize` (to a temporary name,
 * then linked into place, so an existing file is never overwritten and a reader never sees half a file) and returns it. On a hit it reads and deserialises the file. Either way the value is deep-frozen before it
 * is returned and is kept in memory for the rest of the test file. A file that cannot be read back (truncated, corrupt, or from another format) is rebuilt, never thrown. With no folder (for example under the
 * playtest harness's own config) it builds in memory only and writes nothing.
 *
 * Imports node built-ins, vitest's `inject` and `../pipeline/run` (for `deepFreeze`) only.
 */
import { appendFileSync, existsSync, linkSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deserialize, serialize } from "node:v8";
import { inject } from "vitest";
import { deepFreeze } from "../pipeline/run";

declare module "vitest" {
  export interface ProvidedContext {
    cityCacheDir?: string;
  }
}

/** A file starts with this and the payload's byte length, so a truncated file is told apart without parsing it. */
const MAGIC = "RCC1";
const HEADER_BYTES = 4 + 8;

export interface CityCache {
  /** The value for `key`, built at most once per worker per run, deep-frozen. */
  cached<T>(key: string, build: () => T): T;
}

/** The file a key lives in: no characters a file system objects to. */
export const fileOf = (dir: string, key: string): string => join(dir, `${key.replace(/[^A-Za-z0-9._-]/g, "-")}.v8`);

function encode(value: unknown): Buffer {
  const payload = serialize(value);
  const out = Buffer.alloc(HEADER_BYTES + payload.length);
  out.write(MAGIC, 0, "latin1");
  out.writeBigUInt64LE(BigInt(payload.length), 4);
  payload.copy(out, HEADER_BYTES);
  return out;
}

/** The value in `file`, or `undefined` when the file is absent, truncated or corrupt. */
function read(file: string): { value: unknown } | undefined {
  let bytes: Buffer;
  try {
    bytes = readFileSync(file);
  } catch {
    return undefined;
  }
  if (bytes.length < HEADER_BYTES || bytes.toString("latin1", 0, 4) !== MAGIC) return undefined;
  if (BigInt(bytes.length - HEADER_BYTES) !== bytes.readBigUInt64LE(4)) return undefined;
  try {
    return { value: deserialize(bytes.subarray(HEADER_BYTES)) };
  } catch {
    return undefined;
  }
}

/** Writes `bytes` for `file` unless a good file is already there. A bad file (one `read` rejects) is replaced. Never throws: a cache that cannot write simply does not cache. */
function write(file: string, bytes: Buffer): void {
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    if (existsSync(file) && read(file) !== undefined) return;
    writeFileSync(tmp, bytes);
    if (existsSync(file)) {
      // a bad file: replace it (rename overwrites)
      renameSync(tmp, file);
      return;
    }
    try {
      linkSync(tmp, file); // fails if another worker got there first, so a good file is never overwritten
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST" && !existsSync(file)) renameSync(tmp, file);
    }
    try {
      unlinkSync(tmp);
    } catch {
      // already gone
    }
  } catch {
    try {
      unlinkSync(tmp);
    } catch {
      // nothing to remove
    }
  }
}

/** A cache over `dir` (`undefined`: memory only), with its own in-memory map. */
export function createCityCache(dir: string | undefined, logFile: string | undefined = process.env["REST_CITY_CACHE_LOG"]): CityCache {
  const memory = new Map<string, unknown>();
  return {
    cached<T>(key: string, build: () => T): T {
      if (memory.has(key)) return memory.get(key) as T;
      let value: T | undefined;
      let have = false;
      if (dir !== undefined) {
        const hit = read(fileOf(dir, key));
        if (hit !== undefined) {
          value = hit.value as T;
          have = true;
        }
      }
      if (!have) {
        value = build();
        if (logFile !== undefined && logFile !== "") {
          try {
            appendFileSync(logFile, `${key}\t${process.pid}\n`);
          } catch {
            // the log is a measuring aid; never fail a test for it
          }
        }
        if (dir !== undefined) write(fileOf(dir, key), encode(value));
      }
      deepFreeze(value);
      memory.set(key, value);
      return value as T;
    },
  };
}

/** The folder this run's `globalSetup` made, or `undefined` when none was provided. */
function injectedDir(): string | undefined {
  try {
    const d = inject("cityCacheDir");
    return typeof d === "string" && d !== "" ? d : undefined;
  } catch {
    return undefined;
  }
}

let shared: CityCache | undefined;
/** The cache over the run's folder, one per test file (a module-level instance). */
export function cached<T>(key: string, build: () => T): T {
  shared ??= createCityCache(injectedDir());
  return shared.cached(key, build);
}

/** Replaces the module-level cache (a test's own folder); `undefined` goes back to the run's folder. Tests of the cache itself only. */
export function useCityCache(c: CityCache | undefined): void {
  shared = c;
}
