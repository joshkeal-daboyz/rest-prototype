// The static check of the dev-only branch in src/main.ts (ticket 074 C). It reads the source, as streetcam.test.ts does for renderer.ts: the gallery's
// code is reached only behind import.meta.env.DEV, so `npm run build` drops it, and no puzzle is started on that path.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const main = readFileSync("src/main.ts", "utf8");
const GUARD = "import.meta.env.DEV && assetGalleryRequested(location.search) !== null";
const at = main.indexOf(GUARD);
const start = main.indexOf("startPuzzle();");
const branch = main.slice(at, start);

describe("main.ts: the dev-only asset gallery branch (ticket 074 C)", () => {
  it("is guarded by import.meta.env.DEV, which the production build makes false", () => {
    expect(at).toBeGreaterThan(-1);
    expect(main.split(GUARD).length - 1).toBe(1);
  });

  it("is decided before any puzzle is started, and the else path is the only call to startPuzzle()", () => {
    expect(start).toBeGreaterThan(at);
    expect(main.split("startPuzzle();").length - 1).toBe(1);
    expect(main.indexOf("function startPuzzle(): void {")).toBeLessThan(at);
    expect(branch).toContain("} else {");
  });

  it("lazy-imports the renderer and the page inside the branch, and never at the top of the file", () => {
    expect(branch).toContain('import("./render3d")');
    expect(branch).toContain('import("./ui/assetgallery")');
    expect(main).not.toMatch(/^import [^;]*from "\.\/render3d"/m);
    expect(main).not.toMatch(/^import [^;]*from "\.\/ui\/assetgallery"/m);
  });

  it("makes no puzzle, HUD or map renderer on the gallery path", () => {
    for (const word of ["createMapRenderer", "createMapRenderer3d", "mountUI", "createGrid", "createMapPlay", "createAudio"]) {
      expect(branch).not.toContain(word);
    }
  });
});
