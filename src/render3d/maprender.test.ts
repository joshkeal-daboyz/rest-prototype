import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

function ts(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? ts(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []));
}

describe("nothing imports the deleted 2D map (ticket 081 X1c)", () => {
  it("no file in src/ or tests/playtest/, tests included, imports from src/render/", () => {
    const root = join(__dirname, "..", "..");
    const old = /(?:from|import)\s*\(?\s*["'](?:\.{1,2}\/)+(?:src\/)?render(?:\/[^"']*)?["']/;
    const bad = [...ts(join(root, "src")), ...ts(join(root, "tests", "playtest"))]
      .filter((f) => !f.endsWith("maprender.test.ts"))
      .filter((f) => old.test(readFileSync(f, "utf8")))
      .map((f) => relative(root, f));
    expect(bad).toEqual([]);
  });
});
