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

describe("import fence", () => {
  it("covers the audio files, tests included", () => {
    expect(files).toEqual(expect.arrayContaining(["engine.ts", "shell.ts", "mixer.ts", "fence.test.ts", "engine.test.ts"]));
  });

  it("no audio file imports render, grid, play, ui, night, main, an audio asset, or a package", () => {
    for (const f of files) {
      const imports = importsOf(readFileSync(join(dir, f), "utf8"));
      for (const i of imports) {
        const ok = i === "../core" || i.startsWith("./") || i.startsWith("node:") || i === "vitest";
        expect(ok, `${f} imports ${i}`).toBe(true);
        expect(i, `${f} imports ${i}`).not.toMatch(/(render|grid|play|ui|night|main)(\/|$)/);
        expect(i, `${f} imports ${i}`).not.toMatch(/\.(mp3|wav|ogg|m4a|flac|aac|webm)$/i);
      }
    }
  });

  it("no Math.random and no localStorage in the non-test sources", () => {
    for (const f of files.filter((x) => !x.endsWith(".test.ts"))) {
      const src = readFileSync(join(dir, f), "utf8");
      expect(src, f).not.toMatch(/Math\.random/);
      expect(src, f).not.toMatch(/localStorage/);
    }
  });
});
