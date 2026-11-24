/**
 * Ticket 074 A: the asset gallery's catalogue. Typed-in fixture manifests only; the one check against the real manifest reads it lazily and skips when it is absent (CI has no assets).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ASSET_GALLERY_PAGE_SIZE, ASSET_GALLERY_USES, type AssetEntry, type AssetGalleryPiece, type AssetGalleryQuery, type AssetGalleryUse, type AssetManifest, type AssetPack, type AssetWarning, type CalibrationKey } from "../core";
import { KIT as BUILDINGS_KIT } from "../city/buildings/kit";
import { DRESS_BOUNDS } from "../city/facades/dresskit";
import { GROUND_KIT } from "../city/facades/kit";
import { NOVELTY_KEYS } from "../city/facades/noveltykit";
import { PARTY_KEYS } from "../city/facades/partykit";
import { ROOF_BOUNDS } from "../city/facades/roofkit";
import { WALL_BOUNDS } from "../city/facades/wallkit";
import { KIT_KEYS as GROUND_KIT_KEYS } from "../city/ground/kit";
import { KIT as HOLDOUT_KIT } from "../city/holdout/kit";
import { KIT as RUIN_KIT } from "../city/ruin/kit";
import { TECH_KIT } from "../city/tech/kit";
import { TRAFFIC_KEYS } from "../city/traffic/kit";
import { PACK_PAGES, PIECE_NOTES, assetGalleryPacks, assetGalleryPage, assetGalleryPieces, notesFor, pieceUses } from "./assetcatalogue";
import { planTileKeys } from "./plan3d";
import { POWER_LINES, POWER_POLES } from "./powerkit";
import { INTERIOR_KEYS, TILE_PROPS } from "./tileslots";

function entry(name: string, size: readonly [number, number, number], over: Partial<AssetEntry> = {}): AssetEntry {
  return {
    name,
    source: `${name}.fbx`,
    bounds: { min: [-size[0] / 2, 0, -size[2] / 2], max: [size[0] / 2, size[1], size[2] / 2] },
    triangles: 100,
    textures: ["atlas.png"],
    missingTextures: [],
    warnings: [],
    ...over,
  };
}

function pack(id: string, assets: AssetEntry[], over: Partial<AssetPack> = {}): AssetPack {
  return { pack: id, glb: `${id}.glb`, atlas: null, assets, failures: [], ...over };
}

const FIXTURE: AssetManifest = {
  version: 1,
  generatedAt: "2026-11-22T00:00:00Z",
  blenderVersion: "x",
  packs: [
    pack("sci-fi-city-pack", [entry("SM_Prop_Powerpoll_01", [1.5, 5.1, 1.2]), entry("SM_Prop_Pipes_03", [0.545, 0.633, 0.436]), entry("SM_Prop_Pipes_01", [0.5, 0.6, 0.4]), entry("SM_Zzz_Unknown_01", [1, 1, 1])]),
    pack("palm-city-pack", [entry("SM_Env_Vines_06", [0.6, 3, 0.6]), entry("SM_Prop_Powerpole_01", [1, 6, 1])], { failures: [{ source: "x/Bad.fbx", error: "boom" }] }),
    pack(
      "city-pack",
      [
        entry("SK_Character_01", [100, 182, 100], { scale: 100, warnings: ["scale-suspect"], textures: [] }),
        entry("SM_Veh_Car_01", [2, 1.5, 4], { warnings: ["no-uv", "missing-texture"], missingTextures: ["car.png"] }),
        entry("SM_Prop_Bin_01", [0.5, 1, 0.5]),
      ],
      { scale: 100 },
    ),
    pack("mystery-pack", [entry("SM_A", [1, 1, 1])]),
    pack("sci-fi-frontier-pack", []),
  ],
};

describe("assetGalleryPacks", () => {
  const packs = assetGalleryPacks(FIXTURE);

  it("gives one entry per manifest pack, in manifest order, with the count and failures from the manifest", () => {
    expect(packs.map((p) => p.pack)).toEqual(["sci-fi-city-pack", "palm-city-pack", "city-pack", "mystery-pack", "sci-fi-frontier-pack"]);
    expect(packs.map((p) => p.pieceCount)).toEqual([4, 2, 3, 1, 0]);
    expect(packs[1]!.failures).toEqual([{ source: "x/Bad.fbx", error: "boom" }]);
    expect(packs[0]!.glb).toBe("sci-fi-city-pack.glb");
  });

  it("takes title and store page from PACK_PAGES, and a pack the table does not know keeps its id and has no link", () => {
    expect(packs[0]).toMatchObject({ title: "POLYGON Sci-Fi City", storeUrl: "https://syntystore.com/products/polygon-sci-fi-city" });
    expect(packs[3]).toMatchObject({ title: "mystery-pack", storeUrl: null });
  });

  it("pins all eight store pages (the research note's five and Josh's three, 22 Nov 2026), every pack of the manifest having one", () => {
    const urls = Object.fromEntries(Object.entries(PACK_PAGES).map(([k, v]) => [k, v.storeUrl]));
    expect(urls).toEqual({
      "apocalypse-power": "https://syntystore.com/products/polygon-apocalypse-pack",
      "apocalypse-ruin": "https://syntystore.com/products/polygon-apocalypse-pack",
      "city-pack": "https://syntystore.com/products/polygon-city-pack",
      "nature-pack": "https://syntystore.com/products/polygon-nature-pack",
      "palm-city-pack": "https://syntystore.com/products/polygon-palm-city",
      "sci-fi-city-pack": "https://syntystore.com/products/polygon-sci-fi-city",
      "sci-fi-frontier-pack": "https://syntystore.com/products/polygon-sci-fi-frontier",
      "simple-town": "https://syntystore.com/products/simple-town-cartoon-assets",
      "town-pack": "https://syntystore.com/products/polygon-town-pack",
    });
    expect(new Set(Object.values(urls)).size).toBe(8);
  });

  it("does not take a title from the prototype chain", () => {
    const m: AssetManifest = { ...FIXTURE, packs: [pack("constructor", [])] };
    expect(assetGalleryPacks(m)[0]).toMatchObject({ title: "constructor", storeUrl: null });
  });
});

describe("assetGalleryPieces", () => {
  const sci = assetGalleryPieces(FIXTURE, "sci-fi-city-pack");
  const city = assetGalleryPieces(FIXTURE, "city-pack");

  it("gives one piece per asset, with the key, the exact name, the triangles and the flags", () => {
    expect(sci.map((p) => p.key)).toEqual(["sci-fi-city-pack:SM_Prop_Powerpoll_01", "sci-fi-city-pack:SM_Prop_Pipes_03", "sci-fi-city-pack:SM_Prop_Pipes_01", "sci-fi-city-pack:SM_Zzz_Unknown_01"]);
    expect(sci[0]).toMatchObject({ pack: "sci-fi-city-pack", name: "SM_Prop_Powerpoll_01", triangles: 100, textured: true, warnings: [], missingTextures: [] });
    expect(city[0]).toMatchObject({ textured: false });
    expect(city[1]).toMatchObject({ warnings: ["no-uv", "missing-texture"], missingTextures: ["car.png"] });
  });

  it("takes the size from the bounds' extents, never rescaled, even in a scale-100 pack with a scale-suspect entry", () => {
    expect(sci[0]!.size_m[0]).toBeCloseTo(1.5, 9);
    expect(sci[0]!.size_m[1]).toBeCloseTo(5.1, 9);
    expect(sci[0]!.size_m[2]).toBeCloseTo(1.2, 9);
    expect(city[0]!.size_m).toEqual([100, 182, 100]);
    expect(city[0]!.warnings).toEqual(["scale-suspect"]);
    expect(city[2]!.size_m).toEqual([0.5, 1, 0.5]);
  });

  it("sets neverUsed for City Pack keys on the never-used list, and false for anything else", () => {
    expect(city.map((p) => p.neverUsed)).toEqual([true, true, false]);
    const other: AssetManifest = { ...FIXTURE, packs: [pack("palm-city-pack", [entry("SK_Character_01", [1, 2, 1]), entry("SM_Veh_Car_01", [1, 1, 1])])] };
    expect(assetGalleryPieces(other, "palm-city-pack").map((p) => p.neverUsed)).toEqual([false, false]);
  });

  it("gives its uses and notes, and an unknown pack gives no pieces", () => {
    const pipes = sci.find((p) => p.name === "SM_Prop_Pipes_03")!;
    expect(pipes.uses).toEqual([{ use: "tech", placed: true }]);
    expect(pipes.notes).toHaveLength(1);
    expect(sci.find((p) => p.name === "SM_Zzz_Unknown_01")).toMatchObject({ uses: [], notes: [] });
    expect(assetGalleryPieces(FIXTURE, "nope")).toEqual([]);
  });

  it("copies warnings and missing textures rather than sharing the manifest's arrays", () => {
    expect(city[1]!.warnings).not.toBe(FIXTURE.packs[2]!.assets[1]!.warnings);
  });
});

describe("pieceUses", () => {
  const uses = pieceUses();
  const has = (key: string, use: AssetGalleryUse): boolean => (uses.get(key as CalibrationKey) ?? []).some((u) => u.use === use);
  const walk = (use: AssetGalleryUse, keys: Iterable<string>): void => {
    for (const k of keys) {
      if (k.startsWith("code:")) continue;
      expect(has(k, use), `${k} should have use ${use}`).toBe(true);
    }
  };

  it("has every key of each table with that table's use", () => {
    walk("edge", planTileKeys());
    walk("edge", TILE_PROPS);
    walk("edge", Object.values(INTERIOR_KEYS).flat());
    walk("buildings", BUILDINGS_KIT.map((e) => e.key));
    walk("circuit", Object.keys(POWER_POLES));
    walk("circuit", Object.keys(POWER_LINES));
    walk("facades", GROUND_KIT.map((e) => e.key));
    walk("facades", Object.keys(DRESS_BOUNDS));
    walk("facades", NOVELTY_KEYS);
    walk("facades", PARTY_KEYS);
    walk("facades", Object.keys(ROOF_BOUNDS));
    walk("facades", Object.keys(WALL_BOUNDS));
    walk("ground", GROUND_KIT_KEYS);
    walk("traffic", TRAFFIC_KEYS);
    walk("tech", TECH_KIT.map((e) => e.key));
    walk("holdout", Object.keys(HOLDOUT_KIT));
    walk("ruin", Object.keys(RUIN_KIT));
  });

  it("carries the tech kit's placed flag per key", () => {
    for (const e of TECH_KIT) {
      const u = uses.get(e.key)!.find((x) => x.use === "tech")!;
      expect(u.placed, e.key).toBe(e.placed);
    }
    expect(TECH_KIT.some((e) => !e.placed)).toBe(true);
  });

  it("lists each key's uses once each, in ASSET_GALLERY_USES order, and never a code key", () => {
    for (const [key, list] of uses) {
      const idx = list.map((u) => ASSET_GALLERY_USES.indexOf(u.use));
      expect(idx.every((i) => i >= 0), key).toBe(true);
      expect(idx, key).toEqual([...new Set(idx)].sort((a, b) => a - b));
      expect(key.startsWith("code:"), key).toBe(false);
    }
  });

  it("gives a key no table names no entry, and is built once", () => {
    expect(uses.get("sci-fi-city-pack:SM_Zzz_Unknown_01")).toBeUndefined();
    expect(pieceUses()).toBe(uses);
  });
});

describe("PIECE_NOTES and notesFor", () => {
  it("gives the Sci-Fi City pole the seen-clearly row with Josh's Allow both departure", () => {
    const notes = notesFor("sci-fi-city-pack:SM_Prop_Powerpoll_01");
    expect(notes.length).toBeGreaterThanOrEqual(1);
    expect(notes[0]!.sure).toBe("seen");
    expect(notes[0]!.images).toContain("Screenshot_11");
    expect(notes[0]!.departure).toContain("Allow both");
    expect(notesFor("sci-fi-city-pack:SM_Prop_Powerpoll_02")).toHaveLength(notes.length);
  });

  it("gives Palm City vines their row", () => {
    const notes = notesFor("palm-city-pack:SM_Env_Vines_06");
    expect(notes).toHaveLength(2);
    expect(notes[0]!.text).toContain("vines");
    expect(notes[0]!.images).toContain("Screenshot_06");
    // the 06 limits are shown in full, and only on 06
    expect(notes[1]!.departure).toContain("only _08");
    expect(notes[1]!.departure).toContain("lamp post");
    expect(notesFor("palm-city-pack:SM_Env_Vines_08")).toHaveLength(1);
    expect(notesFor("palm-city-pack:SM_Env_Vines_08")[0]!.departure ?? "").not.toContain("sign posts");
  });

  it("lands each ruin-pass departure only on the pieces it names", () => {
    const dep = (key: string): string[] => notesFor(key as never).map((n) => n.departure ?? "").filter((d) => d !== "");
    // roof growth: Tree_Dead_01/02 and Plant_Bush_01 only
    expect(dep("nature-pack:SM_Tree_Dead_01").some((d) => d.includes("roofs"))).toBe(true);
    expect(dep("nature-pack:SM_Tree_Dead_02").some((d) => d.includes("roofs"))).toBe(true);
    expect(dep("nature-pack:SM_Tree_Dead_03")).toEqual([]);
    expect(notesFor("nature-pack:SM_Tree_Dead_03")).toHaveLength(1);
    expect(dep("nature-pack:SM_Plant_Bush_01").some((d) => d.includes("roofs"))).toBe(true);
    expect(dep("nature-pack:SM_Plant_Bush_02")).toEqual([]);
    expect(dep("nature-pack:SM_Plant_Bush_03")).toEqual([]);
    expect(notesFor("nature-pack:SM_Plant_Bush_02")).toHaveLength(1);
    // the mound patch and the saplings
    expect(dep("nature-pack:SM_Terrain_Ground_Mound_Small_02").some((d) => d.includes("cell-sized"))).toBe(true);
    expect(dep("nature-pack:SM_Terrain_Ground_Mound_Small_01")).toEqual([]);
    expect(notesFor("nature-pack:SM_Terrain_Ground_Mound_Small_01")).toHaveLength(1);
    expect(dep("nature-pack:SM_Tree_Birch_01")[0]).toContain("Saplings");
    expect(dep("nature-pack:SM_Tree_Large_01")).toEqual([]);
    // the sapling note, as the note now words it (crowns are a separate bullet there)
    expect(dep("nature-pack:SM_Tree_Round_01")[0]).toContain("Never on a junction or crossing; never scaled.");
    // the street-mouth wall
    expect(dep("sci-fi-frontier-pack:SM_Bld_Wall_02")[0]).toContain("street mouth");
    expect(dep("sci-fi-frontier-pack:SM_Bld_Wall_01")).toEqual([]);
    expect(dep("sci-fi-frontier-pack:SM_Bld_Wall_Tower_01")).toEqual([]);
    expect(notesFor("sci-fi-frontier-pack:SM_Bld_Wall_Tower_01")).toHaveLength(1);
  });

  it("gives a piece with no row no notes, and does not cross packs", () => {
    expect(notesFor("sci-fi-city-pack:SM_Zzz_Unknown_01")).toEqual([]);
    expect(notesFor("city-pack:SM_Prop_Powerpoll_01")).toEqual([]);
    expect(notesFor("palm-city-pack:SM_Prop_Powerpoll_01")).toEqual([]);
  });

  it("shows the ruin tree crowns ruling on the saplings and the park trees only", () => {
    const crowns = (key: string): string[] => notesFor(key as never).map((n) => n.text).filter((t) => t.startsWith("Ruin tree crowns are free; only the trunk is checked"));
    for (const k of ["Tree_Birch_01", "Tree_Round_03", "Tree_Large_01", "Tree_Generic_Giant_01"]) expect(crowns("nature-pack:SM_" + k), k).toHaveLength(1);
    expect(crowns("nature-pack:SM_Tree_Dead_01")).toEqual([]);
    expect(crowns("nature-pack:SM_Tree_Pine_01")).toEqual([]);
    const text = crowns("nature-pack:SM_Tree_Large_01")[0]!;
    expect(text).toContain("Hold no, trees crowns can absolutely grow into buildings, but the trunks should not grow out of buildings");
    expect(text).toContain("T-2");
  });

  it("matches with or without the SM_ prefix, and whole names only", () => {
    const row = PIECE_NOTES.find((r) => r.pack === "sci-fi-city-pack" && r.pattern.test("Prop_Powerpoll_01"))!;
    expect(row.pattern.test("SM_Prop_Powerpoll_01")).toBe(true);
    expect(row.pattern.test("SM_Prop_Powerpoll_011")).toBe(false);
    expect(row.pattern.test("XSM_Prop_Powerpoll_01")).toBe(false);
  });

  it("returns every matching row, in table order", () => {
    const m = PIECE_NOTES.filter((r) => r.pack === "sci-fi-city-pack" && r.pattern.test("SM_Prop_Pipes_03"));
    expect(notesFor("sci-fi-city-pack:SM_Prop_Pipes_03").map((n) => n.text)).toEqual(m.map((r) => r.text));
  });

  it("carries every row's text, images and departure exactly as docs/design/073-pack-intended-use.md has them (markdown marks aside), so nothing is shortened", () => {
    const doc = readFileSync(join(process.cwd(), "docs/design/073-pack-intended-use.md"), "utf8").split("\r").join("").split("**").join("").split("`").join("");
    const bad: string[] = [];
    for (const r of PIECE_NOTES) {
      for (const line of r.text.split("\n")) if (!doc.includes(line.replace(/^Sureness: /, ""))) bad.push(`${r.pattern.source} text: ${line.slice(0, 60)}`);
      if (r.images !== "" && !doc.includes(r.images)) bad.push(`${r.pattern.source} images: ${r.images.slice(0, 60)}`);
      if (r.departure !== null && !doc.includes(r.departure)) bad.push(`${r.pattern.source} departure: ${r.departure.slice(0, 60)}`);
    }
    expect(bad, bad.join(String.fromCharCode(10))).toEqual([]);
  });

  it("keeps the limits a pass relies on: the roof-growth fallback and Josh's words, the mound's hard ground, the pole's single clear case", () => {
    const roof = notesFor("nature-pack:SM_Tree_Dead_01")[0]!.departure!;
    expect(roof).toContain("dead trees are dropped and bushes kept (the main session's call from the picture)");
    expect(roof).toContain("Pieces must fit the roof unscaled and never sit over a rooftop pole or line.");
    expect(roof).toContain("Ruin roof growth is on (RUIN_ROOF_GROWTH, ticket 073 F1b2)");
    expect(notesFor("nature-pack:SM_Plant_Bush_01")[0]!.departure).toBe(roof);
    expect(notesFor("nature-pack:SM_Terrain_Ground_Mound_Small_02")[0]!.departure).toContain("(road, parking band, open paving)");
    expect(notesFor("sci-fi-city-pack:SM_Prop_Powerpoll_01")[0]!.text).toContain("the base sits directly on the paving with a small square foot");
    expect(notesFor("palm-city-pack:SM_Env_Vines_01")[0]!.text).toContain("On the layout sheet they are sheets, clumps and a single column-wrap strand.");
  });

  it("has well-formed rows: a known sureness word, text, and a pack in the table", () => {
    for (const r of PIECE_NOTES) {
      expect(["seen", "inferred", "not-shown"]).toContain(r.sure);
      expect(r.text.length, r.pattern.source).toBeGreaterThan(0);
      expect(r.pack in PACK_PAGES, r.pack).toBe(true);
    }
  });
});

describe("assetGalleryPage", () => {
  const names = ["SM_Apple_01", "SM_apple_Pie", "SM_Banana_01", "SM_Cherry_01", "SM_Date_01"];
  const mk = (name: string, over: Partial<AssetGalleryPiece> = {}): AssetGalleryPiece => ({
    key: `p:${name}`,
    pack: "p",
    name,
    size_m: [1, 1, 1],
    triangles: 1,
    textured: true,
    warnings: [],
    missingTextures: [],
    neverUsed: false,
    uses: [],
    notes: [],
    ...over,
  });
  const pieces: AssetGalleryPiece[] = [
    mk("SM_Date_01", { uses: [{ use: "ruin", placed: true }] }),
    mk("SM_Cherry_01", { textured: false, uses: [{ use: "holdout", placed: true }, { use: "tech", placed: false }] }),
    mk("SM_Banana_01", { warnings: ["no-uv"] }),
    mk("SM_Apple_01"),
    mk("SM_apple_Pie", { uses: [{ use: "ruin", placed: true }] }),
    mk("SM_Other", { pack: "q" }),
  ];
  const q = (over: Partial<AssetGalleryQuery> = {}): AssetGalleryQuery => ({ pack: "p", text: "", use: "any", flag: "any", page: 1, ...over });
  const namesOf = (query: AssetGalleryQuery): string[] => assetGalleryPage(pieces, query).pieces.map((p) => p.name);

  it("keeps only the query's pack, sorted by name in code-unit order (capitals before lower case)", () => {
    expect(namesOf(q())).toEqual(["SM_Apple_01", "SM_Banana_01", "SM_Cherry_01", "SM_Date_01", "SM_apple_Pie"]);
    expect(assetGalleryPage(pieces, q()).total).toBe(5);
  });

  it("needs every space-separated term in the name, ignoring case; empty text matches all", () => {
    expect(namesOf(q({ text: "APPLE" }))).toEqual(["SM_Apple_01", "SM_apple_Pie"]);
    expect(namesOf(q({ text: "apple  01" }))).toEqual(["SM_Apple_01"]);
    expect(namesOf(q({ text: "   " }))).toHaveLength(5);
    expect(namesOf(q({ text: "apple zzz" }))).toEqual([]);
  });

  it("filters by use: a use, unused, or any", () => {
    expect(namesOf(q({ use: "ruin" }))).toEqual(["SM_Date_01", "SM_apple_Pie"]);
    expect(namesOf(q({ use: "tech" }))).toEqual(["SM_Cherry_01"]);
    expect(namesOf(q({ use: "unused" }))).toEqual(["SM_Apple_01", "SM_Banana_01"]);
  });

  it("filters by flag: untextured means not textured, warnings means any warning", () => {
    expect(namesOf(q({ flag: "untextured" }))).toEqual(["SM_Cherry_01"]);
    expect(namesOf(q({ flag: "warnings" }))).toEqual(["SM_Banana_01"]);
  });

  it("combines the filters", () => {
    expect(namesOf(q({ text: "e", use: "ruin", flag: "any" }))).toEqual(["SM_Date_01", "SM_apple_Pie"]);
    expect(namesOf(q({ use: "holdout", flag: "warnings" }))).toEqual([]);
  });

  it("cuts pages of ASSET_GALLERY_PAGE_SIZE and clamps the page to 1..pageCount", () => {
    const many = Array.from({ length: ASSET_GALLERY_PAGE_SIZE * 2 + 1 }, (_, i) => mk(`SM_N_${String(i).padStart(3, "0")}`));
    const p1 = assetGalleryPage(many, q());
    expect(p1.pieces).toHaveLength(ASSET_GALLERY_PAGE_SIZE);
    expect(p1.total).toBe(ASSET_GALLERY_PAGE_SIZE * 2 + 1);
    expect(p1.pageCount).toBe(3);
    expect(assetGalleryPage(many, q({ page: 3 })).pieces.map((p) => p.name)).toEqual(["SM_N_048"]);
    expect(assetGalleryPage(many, q({ page: 99 })).query.page).toBe(3);
    expect(assetGalleryPage(many, q({ page: 0 })).query.page).toBe(1);
    expect(assetGalleryPage(many, q({ page: -4 })).query.page).toBe(1);
    expect(assetGalleryPage(many, q({ page: Number.NaN })).query.page).toBe(1);
    expect(assetGalleryPage(many, q({ page: 2 })).pieces[0]!.name).toBe(`SM_N_${String(ASSET_GALLERY_PAGE_SIZE).padStart(3, "0")}`);
  });

  it("reports a page count of at least 1 for an empty result, and an unknown pack gives an empty page", () => {
    const none = assetGalleryPage(pieces, q({ text: "zzz", page: 5 }));
    expect(none).toMatchObject({ total: 0, pageCount: 1, pieces: [] });
    expect(none.query.page).toBe(1);
    expect(assetGalleryPage(pieces, q({ pack: "nope" }))).toMatchObject({ total: 0, pageCount: 1, pieces: [] });
  });

  it("does not change the input order", () => {
    const before = pieces.map((p) => p.name);
    assetGalleryPage(pieces, q());
    expect(pieces.map((p) => p.name)).toEqual(before);
  });
});

// Lazy: read only when a real manifest is on this machine (never in CI).
const MANIFEST_PATH = join(process.cwd(), "assets", "private", "out", "manifest.json");
const HAVE_MANIFEST = existsSync(MANIFEST_PATH);
if (!HAVE_MANIFEST) console.info("assetcatalogue.test: assets/private/out/manifest.json is absent; the real-manifest checks are skipped");

describe.skipIf(!HAVE_MANIFEST)("against the real manifest (lazy)", () => {
  const load = (): AssetManifest => JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as AssetManifest;

  it("every key pieceUses() names is in the manifest", () => {
    const m = load();
    const known = new Set<string>(m.packs.flatMap((p) => p.assets.map((a) => `${p.pack}:${a.name}`)));
    const missing = [...pieceUses().keys()].filter((k) => !known.has(k));
    expect(missing, `keys the tables name that the manifest lacks:\n${missing.join("\n")}`).toEqual([]);
  });

  it("every PIECE_NOTES pattern matches at least one piece of its pack", () => {
    const m = load();
    const unmatched = PIECE_NOTES.filter((r) => !(m.packs.find((p) => p.pack === r.pack)?.assets ?? []).some((a) => r.pattern.test(a.name))).map((r) => `${r.pack}: ${r.pattern.source}`);
    expect(unmatched, `note rows that match no piece:\n${unmatched.join("\n")}`).toEqual([]);
  });

  it("each split note row matches only the pieces its note names", () => {
    const m = load();
    const named: [string, string, (n: string) => boolean][] = [
      ["nature-pack", "Tree_Dead_0[12]", (n) => n === "Tree_Dead_01" || n === "Tree_Dead_02"],
      ["nature-pack", "Plant_Bush_01", (n) => n === "Plant_Bush_01"],
      ["nature-pack", "Terrain_Ground_Mound_Small_02", (n) => n === "Terrain_Ground_Mound_Small_02"],
      ["nature-pack", "Tree_(?:Birch|Round)_.*", (n) => /^Tree_(?:Birch|Round)_/.test(n)],
      ["nature-pack", "Tree_Large_01|Tree_Generic_Giant_01", (n) => /^Tree_(?:Birch|Round)_/.test(n) || n === "Tree_Large_01" || n === "Tree_Generic_Giant_01"],
      ["sci-fi-frontier-pack", "Bld_Wall_02", (n) => n === "Bld_Wall_02"],
      ["palm-city-pack", "Env_Vines_06", (n) => n === "Env_Vines_06"],
      ["palm-city-pack", "Env_Vines_0[1-8]", (n) => /^Env_Vines_0[1-8]$/.test(n)],
      ["sci-fi-city-pack", "Prop_Powerpoll_0[12]", (n) => n === "Prop_Powerpoll_01" || n === "Prop_Powerpoll_02"],
      ["nature-pack", "Tree_Dead_(?!0[12]$).*", (n) => /^Tree_Dead_/.test(n) && !/^Tree_Dead_0[12]$/.test(n)],
    ];
    const stray: string[] = [];
    for (const [pk, src, ok] of named) {
      const r = PIECE_NOTES.find((x) => x.pack === pk && x.pattern.source.includes(src));
      expect(r, `${pk}: no row for ${src}`).toBeDefined();
      for (const a of m.packs.find((p) => p.pack === pk)?.assets ?? []) {
        if (r!.pattern.test(a.name) && !ok(a.name.replace(/^SM_/, ""))) stray.push(`${pk}:${a.name} matched by ${src}`);
      }
    }
    expect(stray, stray.join(", ")).toEqual([]);
  });

  it("builds a piece for every asset, with the manifest's own counts", () => {
    const m = load();
    for (const g of assetGalleryPacks(m)) {
      const p = m.packs.find((x) => x.pack === g.pack)!;
      expect(g.pieceCount).toBe(p.assets.length);
      expect(assetGalleryPieces(m, g.pack)).toHaveLength(p.assets.length);
    }
  });
});

// A typed-in warning, so a change to the union breaks here and not silently.
const _warning: AssetWarning = "scale-suspect";
void _warning;
