/**
 * Vitest `globalSetup` (ticket 076 A): makes the run's empty cache folder under the OS temp folder, hands its path to the workers with `provide`, and deletes it at the end. Deletes any `rest-city-cache-*` folder
 * more than a day old first (a crashed run's). In watch mode a rerun empties the folder, so a rerun after a code change never reads a city built by older code. Test support only.
 */
import { mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { GlobalSetupContext } from "vitest/node";

export const PREFIX = "rest-city-cache-";
const DAY_MS = 24 * 60 * 60 * 1000;

/** Removes the cache folders in `root` last touched more than a day before `now`. */
export function pruneOld(root: string, now: number = Date.now()): number {
  let removed = 0;
  let names: string[] = [];
  try {
    names = readdirSync(root);
  } catch {
    return 0;
  }
  for (const n of names) {
    if (!n.startsWith(PREFIX)) continue;
    try {
      const p = join(root, n);
      if (now - statSync(p).mtimeMs > DAY_MS) {
        rmSync(p, { recursive: true, force: true });
        removed++;
      }
    } catch {
      // another run is using it, or it is gone
    }
  }
  return removed;
}

/** Deletes everything in `dir` and keeps the folder. */
export function emptyDir(dir: string): void {
  try {
    for (const n of readdirSync(dir)) rmSync(join(dir, n), { recursive: true, force: true });
  } catch {
    // the folder is gone; the next write recreates nothing, and a read misses
  }
}

export default function setup(project: GlobalSetupContext): () => void {
  pruneOld(tmpdir());
  const dir = mkdtempSync(join(tmpdir(), PREFIX));
  project.provide("cityCacheDir", dir);
  project.onTestsRerun(() => emptyDir(dir));
  return () => rmSync(dir, { recursive: true, force: true });
}

declare module "vitest" {
  export interface ProvidedContext {
    cityCacheDir?: string;
  }
}
