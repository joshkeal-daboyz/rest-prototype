/** Ticket 070 L2b: no file under src/city/edge/, tests included, imports an old-path module. Light. */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const OLD_PATH_MODULES = ["tilecity", "tilecity3d", "tileslots", "tileintegrate", "tileinterior", "kerbline", "frontage", "alleys", "parkmetrics"];

/** Every module specifier a source text imports or re-exports from, or loads with import(). */
export function importSpecs(src: string): string[] {
  const out: string[] = [];
  const re = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']/g;
  for (let m = re.exec(src); m; m = re.exec(src)) out.push(m[1]!);
  return out;
}

/** The specifiers that name an old-path module under src/render3d/ (a relative `./kerbline` inside edge is its own file and is not one). */
export function oldPathImports(specs: readonly string[]): string[] {
  return specs.filter((s) => {
    if (!/render3d\//.test(s)) return false;
    const base = s.split("/").pop()!.replace(/\.[jt]s$/, "");
    return OLD_PATH_MODULES.includes(base);
  });
}

describe("no file under src/city/edge/ imports an old-path module (ticket 070 L2b, criterion 2)", () => {
  it("the grep catches a fixture import of each old-path module and ignores edge's own ./kerbline", () => {
    const RD = "../../render3d" + "/"; // built at run time, so this file's own text holds no such import
    for (const name of OLD_PATH_MODULES) {
      expect(oldPathImports(importSpecs("import { x } from \"" + RD + name + "\";"))).toEqual([RD + name]);
    }
    expect(oldPathImports(importSpecs("export * from \"" + RD + "tilecity\";"))).toHaveLength(1);
    expect(oldPathImports(importSpecs("const m = await import(\"" + RD + "kerbline\");"))).toHaveLength(1);
    expect(oldPathImports(importSpecs("import { kerbLine } from \"./kerbline\"; import { TILE_M } from \"../../core\";"))).toEqual([]);
  });

  it("every .ts file in the folder is clean", () => {
    const dir = fileURLToPath(new URL(".", import.meta.url));
    const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
    expect(files.length).toBeGreaterThan(5);
    for (const f of files) {
      expect({ file: f, bad: oldPathImports(importSpecs(readFileSync(fileURLToPath(new URL(`./${f}`, import.meta.url)), "utf8"))) }).toEqual({ file: f, bad: [] });
    }
  });
});
