/**
 * Ticket 081 A2c: the ladder town is gone. No file under src/ imports one of its deleted files, `kitunits.ts` (the shared units) imports no three and no DOM,
 * and `createMapRenderer3d` with no `city=` route says so by name instead of drawing a town.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { Puzzle } from "../core";
import { NO_CITY_ROUTE, createMapRenderer3d } from "./renderer";

const DELETED = ["town", "terrace", "scene", "layout", "camera", "captions", "streetcam", "gallery", "stackgallery", "debug3d"].map((n) => resolve("src/render3d", n));

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.tsx?$/.test(name) ? [p] : [];
  });
}

describe("the ladder town is gone (081 A2c)", () => {
  it("no file under src/ imports a deleted file, and kitunits.ts imports no three and no DOM", () => {
    // A real import or re-export: a line that starts with `import` or `export` (a string inside a test's fixture does not count).
    const from = /^\s*(?:import|export)\b[^\n"']*?from\s*["'](\.[^"']*)["']/gm;
    for (const file of sources("src")) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(from)) {
        const target = resolve(dirname(file), m[1]!).replace(/\.(ts|js)$/, "");
        expect(DELETED, `${file} imports ${m[1]}, a deleted ladder file`).not.toContain(target);
      }
    }
    const kit = readFileSync("src/render3d/kitunits.ts", "utf8");
    expect(/from\s+["']three/.test(kit), "kitunits.ts imports three").toBe(false);
    expect(/\b(document|window|HTMLCanvasElement)\b/.test(kit), "kitunits.ts touches the DOM").toBe(false);
  });

  it("createMapRenderer3d with no city= route throws its named error, before any WebGL context is made", () => {
    expect(() => createMapRenderer3d({} as HTMLCanvasElement, {} as Puzzle)).toThrow(NO_CITY_ROUTE);
  });
});
