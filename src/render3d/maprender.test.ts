import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("the city view stands on its own (ticket 081 X1a)", () => {
  it("no file in src/render3d/, tests included, imports from the 2D map in src/render/", () => {
    const dir = __dirname;
    const old = /(?:from|import)\s*\(?\s*["']\.\.\/render(?:\/[^"']*)?["']/;
    const bad = readdirSync(dir)
      .filter((f) => /\.ts$/.test(f) && f !== "maprender.test.ts")
      .filter((f) => old.test(readFileSync(join(dir, f), "utf8")));
    expect(bad).toEqual([]);
  });
});
