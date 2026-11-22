import { describe, expect, it } from "vitest";
import { ASSET_GALLERY_USES, type AssetGalleryNote, type AssetGalleryPack, type AssetGalleryPiece, type AssetGalleryQuery } from "../core";
import {
  FLAG_FILTERS,
  NOTE_SUMMARY_MAX,
  SURE_WORDS,
  USE_FILTERS,
  USE_LABELS,
  assetGalleryRequested,
  assetGalleryUrl,
  copyText,
  cutText,
  failureLines,
  flagLabels,
  groupDigits,
  inspectKey,
  noteLines,
  noteSummary,
  packTabLabel,
  rangeText,
  sizeText,
  stepIndex,
  storeLinkText,
  trianglesText,
  useLabels,
} from "./assetgallerylogic";

// Hand-typed fixtures: no pack, no manifest, no file read.

function piece(over: Partial<AssetGalleryPiece> = {}): AssetGalleryPiece {
  return {
    key: "sci-fi-city-pack:SM_Prop_Powerpoll_01",
    pack: "sci-fi-city-pack",
    name: "SM_Prop_Powerpoll_01",
    size_m: [1.5, 5.1, 1.2],
    triangles: 1234,
    textured: true,
    warnings: [],
    missingTextures: [],
    neverUsed: false,
    uses: [],
    notes: [],
    ...over,
  };
}

const note = (over: Partial<AssetGalleryNote> = {}): AssetGalleryNote => ({ text: "A pole on the pavement.", images: "Screenshot_11", sure: "seen", departure: null, ...over });

function pack(over: Partial<AssetGalleryPack> = {}): AssetGalleryPack {
  return { pack: "city-pack", title: "POLYGON City", storeUrl: null, glb: "city-pack.glb", pieceCount: 355, failures: [], ...over };
}

describe("assetGalleryRequested", () => {
  it("is null unless assets is in the address", () => {
    expect(assetGalleryRequested("")).toBeNull();
    expect(assetGalleryRequested("?puzzle=09-shrine-circuit&view=3d")).toBeNull();
  });

  it("reads the pack and the defaults", () => {
    expect(assetGalleryRequested("?assets=city-pack")).toEqual({ pack: "city-pack", text: "", use: "any", flag: "any", page: 1, piece: null });
  });

  it("gives an empty pack for a bare assets (the page then opens the first pack)", () => {
    expect(assetGalleryRequested("?assets")?.pack).toBe("");
    expect(assetGalleryRequested("?assets=")?.pack).toBe("");
  });

  it("reads every field", () => {
    expect(
      assetGalleryRequested("?assets=sci-fi-city-pack&q=pole%20crossarm&use=ladder&flag=warnings&page=3&piece=SM_Prop_Powerpoll_01"),
    ).toEqual({ pack: "sci-fi-city-pack", text: "pole crossarm", use: "ladder", flag: "warnings", page: 3, piece: "SM_Prop_Powerpoll_01" });
  });

  it("falls back to the default for an unknown use, flag or page, and for an empty piece", () => {
    expect(assetGalleryRequested("?assets=x&use=bogus&flag=nope&page=abc&piece=")).toEqual({ pack: "x", text: "", use: "any", flag: "any", page: 1, piece: null });
    expect(assetGalleryRequested("?assets=x&page=0")?.page).toBe(1);
    expect(assetGalleryRequested("?assets=x&page=-2")?.page).toBe(1);
    expect(assetGalleryRequested("?assets=x&page=2.5")?.page).toBe(1);
  });

  it("accepts the unused filter and every use", () => {
    expect(assetGalleryRequested("?assets=x&use=unused")?.use).toBe("unused");
    for (const u of ASSET_GALLERY_USES) expect(assetGalleryRequested(`?assets=x&use=${u}`)?.use).toBe(u);
  });
});

describe("assetGalleryUrl", () => {
  const base: AssetGalleryQuery = { pack: "city-pack", text: "", use: "any", flag: "any", page: 1 };

  it("leaves the defaults out", () => {
    expect(assetGalleryUrl(base, null)).toBe("?assets=city-pack");
  });

  it("writes every non-default field, and the piece", () => {
    const url = assetGalleryUrl({ pack: "sci-fi-city-pack", text: "pole crossarm", use: "ladder", flag: "warnings", page: 3 }, "SM_Prop_Powerpoll_01");
    expect(url.startsWith("?")).toBe(true);
    expect(url).toContain("piece=SM_Prop_Powerpoll_01");
    expect(url).toContain("page=3");
  });

  it("round-trips through assetGalleryRequested", () => {
    const states: [AssetGalleryQuery, string | null][] = [
      [base, null],
      [{ ...base, text: "pole crossarm" }, "SM_Prop_Powerpoll_01"],
      [{ ...base, use: "unused", flag: "untextured", page: 7 }, null],
      [{ pack: "palm-city-pack", text: "", use: "ruin", flag: "warnings", page: 2 }, "SM_Env_Vines_06"],
    ];
    for (const [q, p] of states) {
      expect(assetGalleryRequested(assetGalleryUrl(q, p))).toEqual({ ...q, piece: p });
    }
  });
});

describe("card text", () => {
  it("sizeText gives w × h × d m with two decimals", () => {
    expect(sizeText([0.1, 5, 73.4])).toBe("0.10 × 5.00 × 73.40 m");
    expect(sizeText([1.5, 182, 0.7])).toBe("1.50 × 182.00 × 0.70 m");
  });

  it("groups digits and says triangle or triangles", () => {
    expect(groupDigits(999)).toBe("999");
    expect(groupDigits(1234)).toBe("1,234");
    expect(groupDigits(1234567)).toBe("1,234,567");
    expect(trianglesText(0)).toBe("0 triangles");
    expect(trianglesText(1)).toBe("1 triangle");
    expect(trianglesText(1234)).toBe("1,234 triangles");
  });

  it("flagLabels gives nothing for a clean textured piece", () => {
    expect(flagLabels(piece())).toEqual([]);
  });

  it("flagLabels gives one word label per flag, in a fixed order", () => {
    expect(flagLabels(piece({ textured: false }))).toEqual(["untextured"]);
    expect(flagLabels(piece({ missingTextures: ["Wood_D", "Brick_N"], warnings: ["missing-texture"] }))).toEqual(["missing texture: Wood_D, Brick_N"]);
    expect(flagLabels(piece({ warnings: ["missing-texture"] }))).toEqual(["missing texture"]);
    expect(flagLabels(piece({ warnings: ["no-uv", "scale-suspect", "texture-guessed"] }))).toEqual(["scale-suspect", "texture-guessed", "no-uv"]);
    expect(flagLabels(piece({ textured: false, neverUsed: true, warnings: ["scale-suspect"] }))).toEqual(["untextured", "scale-suspect", "never used"]);
  });

  it("useLabels says unused for no uses, and marks a typed-only use", () => {
    expect(useLabels([])).toEqual(["unused"]);
    expect(useLabels([{ use: "ladder", placed: true }, { use: "tech", placed: false }])).toEqual(["ladder", "tech (typed, not placed)"]);
  });

  it("cutText leaves a short text alone and cuts a long one to the limit, with an ellipsis", () => {
    expect(cutText("short")).toBe("short");
    const long = "word ".repeat(80);
    const cut = cutText(long);
    expect(cut.length).toBeLessThanOrEqual(NOTE_SUMMARY_MAX);
    expect(cut.endsWith("…")).toBe(true);
    expect(cut.startsWith("word word")).toBe(true);
  });

  it("noteSummary gives the first note's sureness word and its cut text, or null with no note", () => {
    expect(noteSummary(piece())).toBeNull();
    expect(noteSummary(piece({ notes: [note()] }))).toBe("Seen clearly: A pole on the pavement.");
    const long = note({ sure: "inferred", text: "x".repeat(300) });
    const s = noteSummary(piece({ notes: [long, note({ sure: "seen" })] })) ?? "";
    expect(s.startsWith("Inferred: ")).toBe(true);
    expect(s.length).toBe("Inferred: ".length + NOTE_SUMMARY_MAX);
  });

  it("SURE_WORDS names the three confidence words of the note", () => {
    expect(SURE_WORDS).toEqual({ seen: "Seen clearly", inferred: "Inferred", "not-shown": "Not shown" });
  });

  it("copyText is the key, pack:name", () => {
    expect(copyText(piece())).toBe("sci-fi-city-pack:SM_Prop_Powerpoll_01");
  });

  it("noteLines gives the whole note, its images and its departure", () => {
    const departure = "Josh, 22 Nov 2026, Allow both.";
    expect(noteLines(note({ sure: "not-shown", departure }))).toEqual({ sure: "Not shown", text: "A pole on the pavement.", images: "Screenshot_11", departure });
  });
});

describe("header text", () => {
  it("rangeText gives a to b of N, and 0 pieces when nothing matches", () => {
    expect(rangeText(1, 24, 0)).toBe("0 pieces");
    expect(rangeText(1, 24, 355)).toBe("1 to 24 of 355");
    expect(rangeText(15, 24, 355)).toBe("337 to 355 of 355");
    expect(rangeText(2, 24, 30)).toBe("25 to 30 of 30");
  });

  it("packTabLabel gives the title, the piece count and the failure count", () => {
    expect(packTabLabel(pack({ failures: [{ source: "a.fbx", error: "no mesh" }, { source: "b.fbx", error: "bad" }] }))).toBe("POLYGON City · 355 pieces · 2 failed");
  });

  it("failureLines gives one line per failure", () => {
    expect(failureLines(pack({ failures: [{ source: "a.fbx", error: "no mesh" }] }))).toEqual(["a.fbx: no mesh"]);
  });

  it("storeLinkText names the store page, or says there is none", () => {
    expect(storeLinkText(pack({ storeUrl: null }))).toBe("No store page on file");
    expect(storeLinkText(pack({ storeUrl: "https://syntystore.com/products/polygon-city-pack" }))).toBe("Store page for POLYGON City");
  });

  it("the filter menus have a label for every value", () => {
    expect(USE_FILTERS).toEqual(["any", ...ASSET_GALLERY_USES, "unused"]);
    expect(FLAG_FILTERS).toEqual(["any", "untextured", "warnings"]);
    expect(Object.keys(USE_LABELS).sort()).toEqual([...USE_FILTERS].sort());
  });
});

describe("keys and steps", () => {
  it("Escape closes, even from a field", () => {
    expect(inspectKey("Escape", false)).toBe("close");
    expect(inspectKey("Escape", true)).toBe("close");
  });

  it("the arrows step the piece, but not while a field has the keys", () => {
    expect(inspectKey("ArrowLeft", false)).toBe("prev");
    expect(inspectKey("ArrowRight", false)).toBe("next");
    expect(inspectKey("ArrowLeft", true)).toBeNull();
    expect(inspectKey("ArrowRight", true)).toBeNull();
    expect(inspectKey("a", false)).toBeNull();
  });

  it("stepIndex moves one and stays put at either end", () => {
    expect(stepIndex(5, 24, 1)).toBe(6);
    expect(stepIndex(5, 24, -1)).toBe(4);
    expect(stepIndex(0, 24, -1)).toBe(0);
    expect(stepIndex(23, 24, 1)).toBe(23);
  });
});
