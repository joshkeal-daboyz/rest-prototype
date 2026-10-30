import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));

const importsOf = (src: string): string[] => {
  const out: string[] = [];
  const re = /(?:import|export)\s[^"'`;]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s*["']([^"']+)["']/g;
  for (const m of src.matchAll(re)) out.push((m[1] ?? m[2] ?? m[3]) as string);
  return out;
};

describe("render import fence (ticket 032)", () => {
  it("covers the render files, tests included", () => {
    expect(files).toEqual(expect.arrayContaining(["map-renderer.ts", "motion.ts", "fence.test.ts", "render.test.ts"]));
  });

  it("no render file imports audio", () => {
    for (const f of files) {
      for (const i of importsOf(readFileSync(join(dir, f), "utf8"))) {
        expect(i, `${f} imports ${i}`).not.toMatch(/(^|\/)audio(\/|$)/);
      }
    }
  });
});
