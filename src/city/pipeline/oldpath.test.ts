/** Ticket 070 L2a: no file under src/city/streets/, land/, mass/ or pipeline/, tests included, imports an old-path module (render3d/tilecity, tilecity3d, tileslots, kerbline, frontage, parkmetrics). */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const OLD = ["tilecity", "tilecity3d", "tileslots", "kerbline", "frontage", "parkmetrics"];
const FOLDERS = ["streets", "land", "mass", "pipeline"];

/** The specifiers of every import, export-from and dynamic import in `src` that name an old-path module of src/render3d/. */
export function oldPathImports(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
    const spec = m[1]!;
    const last = spec.replace(/\.(ts|js)$/, "").split("/").pop()!;
    if (spec.includes("render3d/") && OLD.includes(last)) out.push(spec);
  }
  return out;
}

describe("L2a: the planner's folders never import an old-path module", () => {
  it("the check catches an import of each old-path module and ignores the ladder's", () => {
    for (const n of OLD) {
      expect(oldPathImports(`import { x } from "../../render3d/${n}";`)).toHaveLength(1);
      expect(oldPathImports(`export { x } from "../../render3d/${n}.ts";`)).toHaveLength(1);
      expect(oldPathImports(`const m = await import("../../render3d/${n}");`)).toHaveLength(1);
    }
    expect(oldPathImports(`import { TERRACE_BAYS } from "../../render3d/town";`)).toHaveLength(0);
  });
  for (const folder of FOLDERS) {
    it(`src/city/${folder}/ imports none`, () => {
      const dir = fileURLToPath(new URL(`../${folder}/`, import.meta.url));
      const files = readdirSync(dir).filter((n) => n.endsWith(".ts"));
      expect(files.length).toBeGreaterThan(0);
      for (const f of files) expect(oldPathImports(readFileSync(dir + f, "utf8")), `${folder}/${f}`).toEqual([]);
    });
  }
});
