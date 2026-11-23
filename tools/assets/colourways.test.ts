import { describe, expect, it } from "vitest";
import { COLOURWAY_SOURCES, colourwayEntry, planColourways, pngSize } from "./colourways";

/** A 24-byte PNG header: the signature, an IHDR chunk's length and type, then width and height. */
function header(width: number, height: number): Uint8Array {
  const b = new Uint8Array(24);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const view = new DataView(b.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return b;
}

describe("Ticket 054 A: planColourways", () => {
  it("the city-pack table gives 12 entries, ids 01_A to 04_C, forward-slash out paths, and base PolygonCity_Texture", () => {
    const plan = planColourways("city-pack", COLOURWAY_SOURCES);
    expect(plan).not.toBeNull();
    expect(plan?.base).toBe("PolygonCity_Texture");
    expect(plan?.baseFile).toBe("Textures/PolygonCity_Texture.png");
    expect(plan?.entries).toHaveLength(12);
    expect(plan?.entries.map((e) => e.id)).toEqual(["01_A", "01_B", "01_C", "02_A", "02_B", "02_C", "03_A", "03_B", "03_C", "04_A", "04_B", "04_C"]);
    const second = plan?.entries.find((e) => e.id === "02_A");
    expect(second).toEqual({ id: "02_A", file: "Textures/PolygonCity_Texture_02_A.png", out: "city-pack/colourways/PolygonCity_Texture_02_A.png" });
    for (const e of plan?.entries ?? []) {
      expect(e.out).not.toContain("\\");
      expect(e.file).not.toContain("\\");
    }
  });

  it("a pack with no table entry gives null", () => {
    expect(planColourways("town-pack", COLOURWAY_SOURCES)).toBeNull();
    expect(planColourways("constructor", COLOURWAY_SOURCES)).toBeNull();
  });

  it("a table file that does not extend the base stem, or repeats an id, is a mistake in the table and throws", () => {
    expect(() => planColourways("p", { p: { base: "Textures/Atlas.png", files: ["Textures/Other_01.png"] } })).toThrow(/not named Atlas_<id>/);
    expect(() => planColourways("p", { p: { base: "Textures/Atlas.png", files: ["Textures/Atlas_01.png", "Textures/Atlas_01.png"] } })).toThrow(/twice/);
    expect(() => planColourways("p", { p: { base: "Atlas.png", files: ["Atlas_.png"] } })).toThrow();
  });
});

describe("Ticket 054 A: pngSize", () => {
  it("reads width and height from the signature and IHDR chunk", () => {
    expect(pngSize(header(1024, 1024))).toEqual({ width: 1024, height: 1024 });
    expect(pngSize(header(512, 256))).toEqual({ width: 512, height: 256 });
  });

  it("rejects bytes that are not a PNG header: too short, wrong signature, no IHDR, zero size", () => {
    expect(pngSize(new Uint8Array(0))).toBeNull();
    expect(pngSize(header(4, 4).subarray(0, 23))).toBeNull();
    const badSignature = header(4, 4);
    badSignature[1] = 0x51;
    expect(pngSize(badSignature)).toBeNull();
    const badChunk = header(4, 4);
    badChunk[13] = 0x45; // not IHDR
    expect(pngSize(badChunk)).toBeNull();
    expect(pngSize(header(0, 8))).toBeNull();
  });
});

describe("Ticket 054 A: colourwayEntry", () => {
  it("is the AssetColourway the manifest holds", () => {
    const plan = planColourways("city-pack", COLOURWAY_SOURCES)?.entries[3];
    expect(plan).toBeDefined();
    if (!plan) return;
    expect(colourwayEntry(plan, "PolygonCity_Texture", { width: 1024, height: 1024 })).toEqual({
      id: "02_A",
      image: "city-pack/colourways/PolygonCity_Texture_02_A.png",
      base: "PolygonCity_Texture",
      width: 1024,
      height: 1024,
    });
  });
});
