/** Ticket 043 B: the building gallery (debug only). No WebGL: the layout is pure, the scene is built with a stub text surface and a fake model root. */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { Group, Object3D, Raycaster, Sprite, Vector3 } from "three";
import { ASSET_MANIFEST_VERSION, type AssetEntry, type AssetManifest } from "../core";
import { declaredFrontDirection } from "./debug3d";
import {
  CAPTION_LINE_UNITS,
  CAPTION_WRAP,
  GALLERY_DEFAULT_PACK,
  GALLERY_PAGE_SIZE,
  NON_BUILDING_PREFIXES,
  buildGalleryScene,
  createGalleryRig,
  galleryCaption,
  galleryColumns,
  galleryEntries,
  galleryLayout,
  galleryMessage,
  galleryPageCount,
  galleryPageRequested,
  galleryRectsOverlap,
  galleryRequested,
  isPartName,
  loadGalleryPack,
  outlineStrips,
  wrapName,
  captionPx,
  type GalleryLoadDeps,
  type GallerySlot,
} from "./gallery";
import { BUILDING_FRONTS, MODEL_TABLE, atFront, frontAxis, frontIsQuarter, isManifest, lotTypeOf, type BuildingFront, type ModelFront } from "./models";
import { stubTextSurface } from "./text";
import { LOT_TYPES, type Lot } from "./town";
import { WORLD_PER_METRE } from "./models";

function entry(name: string, w: number, h: number, d: number, triangles: number, warnings: AssetEntry["warnings"] = []): AssetEntry {
  return { name, source: `${name}.fbx`, bounds: { min: [-w / 2, 0, -d / 2], max: [w / 2, h, d / 2] }, triangles, textures: [], missingTextures: [], warnings };
}

/** Names and bounds copied from the real manifest (17 Nov 2026), a few of each kind: whole buildings, modular parts, props, a character, a mismeasured scene. */
const MANIFEST: AssetManifest = {
  version: ASSET_MANIFEST_VERSION,
  generatedAt: "2026-01-01T00:00:00Z",
  blenderVersion: "5.0.0",
  packs: [
    {
      pack: "city-pack",
      glb: "city-pack.glb",
      atlas: null,
      scale: 100,
      failures: [],
      assets: [
        entry("SK_Character_BusinessMan_Shirt", 205, 183, 34, 1610, ["scale-suspect"]),
        entry("SM_Bld_CityHall_01", 20.4, 9.2, 18.1, 3000),
        entry("SM_Bld_OfficeOld_Large_01", 16, 25, 16, 2000),
        entry("SM_Bld_OfficeOld_Large_02", 16, 25, 16, 2000),
        entry("SM_Bld_OfficeOld_Large_Base_01", 16, 6, 16, 400),
        entry("SM_Bld_OfficeOld_Large_Floor_01", 15, 3, 15, 300),
        entry("SM_Bld_OfficeOld_Large_Roof_01", 16, 4, 16, 300),
        entry("SM_Bld_OfficeRound_01", 22, 38, 22, 5000),
        entry("SM_Bld_Shop_01", 5, 3, 6, 200),
        entry("SM_Bld_Apartment_Stairs_01", 5, 4, 10, 200),
        entry("SM_Prop_Bin_01", 6, 4, 6, 100),
        entry("SM_Env_Road_Straight_01", 20, 0.3, 20, 10),
        entry("SM_Veh_Truck_01", 6, 4, 14, 900),
        entry("SM_Bld_Tiny_01", 3, 5, 3, 100),
      ],
    },
    {
      pack: "town-pack",
      glb: "town-pack.glb",
      atlas: null,
      scale: 1,
      failures: [],
      assets: [
        entry("SM_Bld_Church_01", 10.2, 17, 14.3, 4000),
        entry("SM_Bld_House_Preset_01", 6, 6, 9, 800),
        entry("SM_Bld_House_Preset_03", 14, 6, 14, 1500),
        entry("SM_Bld_House_Preset_04", 14, 6, 14, 1500),
        entry("SM_Bld_House_Preset_11", 18, 9, 14, 2500),
        entry("SM_Bld_House_ExteriorWall_GarageDoor_01", 5, 4, 5, 200),
        entry("SM_Generic_Tree_Patch_01", 16, 11, 14, 700),
        entry("POLYGON_Town_Demo", 648, 92, 449, 90000, ["scale-suspect"]),
      ],
    },
    {
      pack: "simple-town",
      glb: "simple-town.glb",
      atlas: null,
      scale: 100,
      failures: [],
      assets: [
        entry("Building_Shop_01", 10.5, 11.4, 10.2, 278),
        entry("Building_Shop_02", 10.5, 11.4, 10.2, 278),
        entry("Building_Gym", 10.5, 11.4, 12, 386),
        entry("store_small_mesh", 11.6, 6.7, 8.4, 218),
        entry("store_corner_mesh", 11, 7, 11, 300),
        entry("house_mesh", 11.8, 8.5, 13.4, 478),
        entry("Building_House_01", 10.6, 14.5, 18.5, 788),
        entry("Building_House_05", 19.6, 16, 25.7, 2244),
        entry("apartment_large_mesh", 11.6, 16.7, 11.8, 930),
        entry("office_stepped_mesh", 20.3, 20, 15.2, 900),
        entry("Building_Mall_A", 47, 10, 43, 2000),
        entry("Env_Beach_Corner", 20, 3, 20, 100),
        entry("Prop_Umbrella_01", 5, 4, 5, 100),
        entry("Vehicle_Boat_01", 5, 7, 14, 100),
        entry("ST_Veh_Fire_Truck_Z", 5, 5, 9, 100),
        entry("memorial_mesh", 5, 5, 5, 100),
        entry("Building_Small_Hut", 3, 3, 3, 100),
      ],
    },
  ],
};

const names = (m: AssetManifest, id: string, fronts: Readonly<Record<string, BuildingFront>> = BUILDING_FRONTS, exclude: readonly string[] = []): string[] =>
  galleryEntries(m, id, fronts, exclude).map((g) => g.entry.name);

describe("the page's flags", () => {
  it("gallery=<pack> names a pack, an empty value is simple-town, and no flag is no gallery", () => {
    expect(galleryRequested("?puzzle=09-shrine-circuit&view=3d&gallery=city-pack")).toBe("city-pack");
    expect(galleryRequested("?gallery=town-pack&view=3d")).toBe("town-pack");
    expect(galleryRequested("?gallery=")).toBe(GALLERY_DEFAULT_PACK);
    expect(GALLERY_DEFAULT_PACK).toBe("simple-town");
    expect(galleryRequested("")).toBeNull();
    expect(galleryRequested("?view=3d&fronts=1")).toBeNull();
  });

  it("page and per are positive whole numbers, with defaults", () => {
    expect(galleryPageRequested("")).toEqual({ page: 1, pageSize: GALLERY_PAGE_SIZE });
    expect(galleryPageRequested("?gallery=x&page=3&per=100")).toEqual({ page: 3, pageSize: 100 });
    expect(galleryPageRequested("?page=0&per=-2")).toEqual({ page: 1, pageSize: GALLERY_PAGE_SIZE });
    expect(galleryPageRequested("?page=abc&per=1.5")).toEqual({ page: 1, pageSize: GALLERY_PAGE_SIZE });
  });
});

describe("which entries are buildings", () => {
  it("lists table and front names, and anything 4 m by 4 m by 3 m, minus props, roads, vehicles and the like", () => {
    const city = names(MANIFEST, "city-pack");
    expect(city).toContain("SM_Bld_CityHall_01");
    expect(city).toContain("SM_Bld_OfficeOld_Large_Base_01");
    expect(city).toContain("SM_Bld_Apartment_Stairs_01");
    expect(city).toContain("SM_Bld_Shop_01");
    // 5 x 3 x 6 is exactly on the limits and counts; 3 x 5 x 3 is too narrow.
    expect(city).not.toContain("SM_Bld_Tiny_01");
    for (const gone of ["SM_Prop_Bin_01", "SM_Env_Road_Straight_01", "SM_Veh_Truck_01", "SK_Character_BusinessMan_Shirt"]) expect(city, gone).not.toContain(gone);
    const town = names(MANIFEST, "town-pack");
    expect(town).toContain("SM_Bld_Church_01");
    expect(town).toContain("SM_Bld_House_ExteriorWall_GarageDoor_01");
    expect(town).not.toContain("SM_Generic_Tree_Patch_01");
    expect(town).not.toContain("POLYGON_Town_Demo");
    const simple = names(MANIFEST, "simple-town");
    for (const gone of ["Env_Beach_Corner", "Prop_Umbrella_01", "Vehicle_Boat_01", "ST_Veh_Fire_Truck_Z", "Building_Small_Hut"]) expect(simple, gone).not.toContain(gone);
    expect(simple).toContain("Building_Mall_A");
    expect(simple).toContain("office_stepped_mesh");
  });

  it("counts a name BUILDING_FRONTS or a MODEL_TABLE building row lists even when it is small or has a prop prefix; never a scale-suspect one", () => {
    const small = entry("Building_Small_Hut", 3, 3, 3, 100);
    const m: AssetManifest = { ...MANIFEST, packs: [{ ...MANIFEST.packs[2]!, assets: [small, entry("Env_Listed", 9, 9, 9, 10), entry("Building_Shop_01", 10, 10, 10, 1, ["scale-suspect"])] }] };
    expect(names(m, "simple-town", {})).toEqual([]);
    expect(names(m, "simple-town", { Building_Small_Hut: { front: "-z" }, Env_Listed: { front: "+x" } })).toEqual(["Building_Small_Hut", "Env_Listed"]);
    // Building_Shop_01 is a MODEL_TABLE name but the converter said its scale is suspect.
    expect(MODEL_TABLE.some((r) => r.names.includes("Building_Shop_01"))).toBe(true);
    expect(names(m, "simple-town", {})).not.toContain("Building_Shop_01");
  });

  it("the prefix list has the ticket's five and ignores case", () => {
    for (const p of ["road_", "path_", "sm_prop_", "sm_env_", "sm_veh_"]) expect(NON_BUILDING_PREFIXES).toContain(p);
    const m: AssetManifest = { ...MANIFEST, packs: [{ ...MANIFEST.packs[0]!, assets: [entry("SM_PROP_Big_01", 9, 9, 9, 1), entry("Road_Plain", 9, 9, 9, 1)] }] };
    expect(names(m, "city-pack", {})).toEqual([]);
  });

  it("puts whole-looking buildings first, then modular parts, and a family's members next to each other", () => {
    const city = names(MANIFEST, "city-pack");
    const firstPart = city.findIndex((n) => isPartName(n));
    expect(firstPart).toBeGreaterThan(0);
    for (let i = 0; i < city.length; i++) expect(isPartName(city[i]!), city[i]).toBe(i >= firstPart);
    // Large_01 and Large_02 are one mesh: neighbours, with the family named by its smaller name.
    const g = galleryEntries(MANIFEST, "city-pack");
    const a = g.findIndex((x) => x.entry.name === "SM_Bld_OfficeOld_Large_01");
    expect(g[a + 1]!.entry.name).toBe("SM_Bld_OfficeOld_Large_02");
    expect(g[a]!.family).toBe(g[a + 1]!.family);
    const simple = galleryEntries(MANIFEST, "simple-town");
    const shop = simple.findIndex((x) => x.entry.name === "Building_Shop_01");
    expect(simple[shop + 1]!.entry.name).toBe("Building_Shop_02");
  });

  it("splits part words by underscore and capital: Door in GarageDoor, none in Trailer", () => {
    for (const n of ["SM_Bld_Apartment_Door_02", "SM_Bld_X_GarageDoor_01", "A_Base", "SM_Roof", "OfficeRound_Floor_01", "Deck_01", "Rail_02", "Planter_1", "Chimney_A", "Stairs"]) expect(isPartName(n), n).toBe(true);
    for (const n of ["SM_Bld_CityHall_01", "Trailer_01", "SM_Bld_Church_01", "Building_BaberShop", "Basement_01", "Floorplan_1"]) expect(isPartName(n), n).toBe(false);
  });

  it("is empty with no manifest or an unknown pack", () => {
    expect(galleryEntries(null, "city-pack")).toEqual([]);
    expect(galleryEntries(MANIFEST, "nope")).toEqual([]);
  });
});

const layout = (id: string, fronts: Readonly<Record<string, BuildingFront>> = BUILDING_FRONTS, exclude: readonly string[] = [], opts = {}) => galleryLayout(MANIFEST, id, fronts, exclude, opts);

describe("galleryLayout: every building of a pack is shown", () => {
  it.each(["simple-town", "city-pack", "town-pack"])("has one slot per building-sized entry of %s, in entry order, and no two outlines overlap", (id) => {
    const l = layout(id);
    const wanted = galleryEntries(MANIFEST, id);
    expect(l.slots.map((s) => s.name)).toEqual(wanted.map((g) => g.entry.name));
    expect(l.slots.length).toBeGreaterThan(5);
    expect(l.total).toBe(wanted.length);
    for (let i = 0; i < l.slots.length; i++) {
      for (let j = i + 1; j < l.slots.length; j++) {
        expect(galleryRectsOverlap(l.slots[i]!.outline, l.slots[j]!.outline), `${l.slots[i]!.name} / ${l.slots[j]!.name}`).toBe(false);
      }
    }
  });

  it("keeps every caption's ground clear of every outline and of every other caption, at any number of columns", () => {
    for (const columns of [1, 2, 3, 4, 5]) {
      const l = layout("simple-town", BUILDING_FRONTS, [], { columns });
      l.slots.forEach((a, i) => {
        l.slots.forEach((b, j) => {
          if (i !== j) expect(galleryRectsOverlap(a.box, b.box), `${columns}: ${a.name} / ${b.name}`).toBe(false);
          expect(galleryRectsOverlap(a.box, b.outline), `${columns}: caption of ${a.name} on outline of ${b.name}`).toBe(false);
        });
      });
    }
  });

  it("puts family members side by side in reading order, and fills a grid of the asked columns", () => {
    const l = layout("simple-town", BUILDING_FRONTS, [], { columns: 3 });
    const shop = l.slots.findIndex((s) => s.name === "Building_Shop_01");
    expect(l.slots[shop + 1]!.name).toBe("Building_Shop_02");
    const next = l.slots[shop + 1]!;
    const here = l.slots[shop]!;
    // Neighbours in a row share a front edge; a wrap goes to the next row.
    if (shop % 3 < 2) expect(next.outline.cz + next.outline.d / 2).toBeCloseTo(here.outline.cz + here.outline.d / 2, 9);
    else expect(next.outline.cz).toBeGreaterThan(here.outline.cz);
    expect(new Set(l.slots.map((s) => s.outline.cx)).size).toBe(3);
  });

  it("stands each model on the lot type its size fits, its front face against the lot's front edge; a model that fits none gets a dashed outline round its footprint", () => {
    const l = layout("simple-town");
    for (const s of l.slots) {
      const e = s.entry.entry;
      const t = lotTypeOf(e, s.entry.front);
      expect(s.entry.lotType, s.name).toBe(t);
      if (t) {
        expect(s.lot, s.name).toEqual({ w: LOT_TYPES[t].frontage * WORLD_PER_METRE, d: LOT_TYPES[t].depth * WORLD_PER_METRE });
        expect(s.dashed, s.name).toBe(false);
        expect(s.outline.w).toBeCloseTo(s.lot!.w, 9);
        // atFront from the town: the lot's centre moved toward its front by (lot depth - model depth) / 2.
        const [w, , d] = s.entry.size;
        const depth = (frontIsQuarter(s.entry.front) ? w : d) * WORLD_PER_METRE;
        const lot = { x: s.outline.cx, z: s.outline.cz, yaw: 0, d: s.lot!.d } as unknown as Lot;
        const spot = atFront(lot, depth);
        expect(s.x, s.name).toBeCloseTo(spot.x, 9);
        expect(s.z, s.name).toBeCloseTo(spot.z, 9);
      } else {
        expect(s.lot, s.name).toBeNull();
        expect(s.dashed, s.name).toBe(true);
        expect(s.outline.w, s.name).toBeGreaterThan(s.entry.size[0] * WORLD_PER_METRE);
      }
      expect(s.scale).toBe(WORLD_PER_METRE);
    }
    const dashed = l.slots.filter((s) => s.dashed).map((s) => s.name);
    expect(dashed).toContain("Building_Mall_A");
    expect(dashed).toContain("office_stepped_mesh");
  });

  it("has no manifest, a missing pack, or a pack with nothing building-sized: no slots, a message, no throw", () => {
    expect(galleryLayout(null, "city-pack").slots).toEqual([]);
    expect(galleryLayout(null, "city-pack").title).toEqual(["no converted packs"]);
    expect(galleryLayout({ ...MANIFEST, packs: [] }, "x").title).toEqual(["no converted packs"]);
    const missing = galleryLayout(MANIFEST, "nope");
    expect(missing.slots).toEqual([]);
    expect(missing.title[0]).toBe('no pack "nope" in the manifest');
    expect(missing.title[1]).toContain("city-pack");
    expect(galleryMessage(MANIFEST, "city-pack")).toBeNull();
    const none: AssetManifest = { ...MANIFEST, packs: [{ ...MANIFEST.packs[0]!, assets: [entry("SM_Prop_A", 9, 9, 9, 1)] }] };
    expect(galleryLayout(none, "city-pack").title[0]).toContain("no building-sized entries");
  });
});

/** The unit direction a slot's clone's declared front faces in the gallery's frame: its model-space axis turned by the slot's yaw. */
const frontOf = (s: GallerySlot): readonly [number, number] => declaredFrontDirection(s.entry.front, s.yaw);

describe("galleryLayout: turned to the camera", () => {
  // The camera looks from +z toward -z (camera.ts), so a model faces it when its front points along +z.
  const SCRAMBLED: Readonly<Record<string, BuildingFront>> = {
    Building_Shop_01: { front: "+x" },
    Building_Shop_02: { front: "-x" },
    Building_Gym: { front: "-z" },
    store_small_mesh: { front: "+z" },
    house_mesh: { front: "+x" },
  };

  it.each([
    ["the shipped table", BUILDING_FRONTS],
    ["a table that uses all four faces", SCRAMBLED],
    ["no table", {}],
  ])("turns each slot's declared front toward the camera (+z) to under 0.5 degrees: %s", (_label, fronts) => {
    const seen = new Set<ModelFront>();
    for (const id of ["simple-town", "city-pack", "town-pack"]) {
      for (const s of layout(id, fronts).slots) {
        const [dx, dz] = frontOf(s);
        const degrees = (Math.acos(Math.min(1, Math.max(-1, dz / Math.hypot(dx, dz)))) * 180) / Math.PI;
        expect(degrees, `${id} ${s.name}`).toBeLessThan(0.5);
        seen.add(s.entry.front);
      }
    }
    if (_label === "a table that uses all four faces") expect(seen.size).toBe(4);
  });

  it("turns a clone's own front marker (one metre along the declared front, in the model's frame) to +z in the built scene", () => {
    const fronts: Readonly<Record<string, BuildingFront>> = { ...SCRAMBLED, Building_House_01: { front: "-z" } };
    const l = layout("simple-town", fronts);
    const root = (name: string): Object3D => {
      const g = new Group();
      const marker = new Object3D();
      marker.name = "front-marker";
      const [ax, az] = frontAxis((fronts[name]?.front ?? "+z") as ModelFront);
      marker.position.set(ax, 0, az);
      g.add(marker);
      return g;
    };
    const built = buildGalleryScene(l, root, { surface: stubTextSurface });
    built.scene.updateMatrixWorld(true);
    expect(built.models).toHaveLength(l.slots.length);
    built.models.forEach((wrap, i) => {
      const at = wrap.getWorldPosition(new Vector3());
      const tip = wrap.getObjectByName("front-marker")!.getWorldPosition(new Vector3());
      expect(at.x).toBeCloseTo(l.slots[i]!.x, 9);
      expect(at.z).toBeCloseTo(l.slots[i]!.z, 9);
      const dx = tip.x - at.x;
      const dz = tip.z - at.z;
      expect(dz / Math.hypot(dx, dz), l.slots[i]!.name).toBeGreaterThan(Math.cos((0.5 * Math.PI) / 180));
    });
    built.dispose();
  });

  it("captions an uncalibrated name with the +z guess and a ?, a calibrated one without, a corner model and an excluded one as such", () => {
    const l = layout("simple-town", BUILDING_FRONTS, ["Building_Gym"]);
    const cap = (n: string): string[] => l.slots.find((s) => s.name === n)!.caption;
    // Building_Mall_A has no BUILDING_FRONTS line: the guess.
    const mall = l.slots.find((s) => s.name === "Building_Mall_A")!;
    expect(mall.entry.front).toBe("+z");
    expect(mall.entry.guessed).toBe(true);
    expect(cap("Building_Mall_A")).toContain("door: +z ?");
    // store_small_mesh is calibrated at +z: no question mark. Building_Shop_01 is "-z".
    expect(cap("store_small_mesh")).toContain("door: +z");
    expect(cap("Building_Shop_01")).toContain("door: -z");
    expect(cap("Building_Shop_01").some((x) => x.includes("?"))).toBe(false);
    expect(cap("store_corner_mesh")).toContain("corner, open -x");
    expect(cap("Building_Gym")).toContain("excluded");
    expect(cap("Building_Shop_01")).not.toContain("excluded");
    expect(cap("Building_Shop_02").slice(-2)).toEqual(["copy of Building_", "Shop_01"]);
    expect(cap("Building_Shop_01").some((x) => x.startsWith("copy of"))).toBe(false);
  });

  it("captions the size in metres and the lot type, so a part reads differently from a whole building", () => {
    const l = layout("city-pack");
    const hall = l.slots.find((s) => s.name === "SM_Bld_CityHall_01")!;
    expect(hall.caption).toContain("20 x 9.2 x 18 m");
    const tower = l.slots.find((s) => s.name === "SM_Bld_OfficeRound_01")!;
    expect(tower.caption).toContain("22 x 38 x 22 m");
    expect(tower.caption).toContain("lot: none fits");
    expect(l.slots.find((s) => s.name === "SM_Bld_OfficeOld_Large_Floor_01")!.caption).toContain("15 x 3 x 15 m");
  });

  it("wraps long names at underscores to the caption width and never loses a character", () => {
    expect(wrapName("SM_Bld_OfficeOld_Large_Base_01")).toEqual(["SM_Bld_OfficeOld_", "Large_Base_01"]);
    expect(wrapName("Building_Shop_01")).toEqual(["Building_Shop_01"]);
    for (const n of ["SM_Bld_House_ExteriorWall_GarageDoor_01", "Averyveryveryveryverylongwordwithoutbreaks", "a", "SM_Bld_OfficeRound_Base_01_Glass"]) {
      const lines = wrapName(n);
      expect(lines.join(""), n).toBe(n);
      for (const line of lines) expect(line.length, n).toBeLessThanOrEqual(CAPTION_WRAP);
    }
    expect(galleryCaption(galleryEntries(MANIFEST, "simple-town")[0]!)[0]).toBeTruthy();
  });
});

describe("galleryLayout: deterministic, paged", () => {
  it("returns the same layout every time", () => {
    const a = JSON.stringify(layout("city-pack", BUILDING_FRONTS, [], { columns: 3, pageSize: 7, page: 2 }));
    const b = JSON.stringify(layout("city-pack", BUILDING_FRONTS, [], { columns: 3, pageSize: 7, page: 2 }));
    expect(a).toBe(b);
  });

  it("pages cover every entry once, in order, and say which page they are on; a page past the end is the last", () => {
    const total = galleryEntries(MANIFEST, "city-pack").length;
    const pages = galleryPageCount(total, 5);
    expect(pages).toBe(Math.ceil(total / 5));
    const seen: string[] = [];
    for (let p = 1; p <= pages; p++) {
      const l = layout("city-pack", BUILDING_FRONTS, [], { page: p, pageSize: 5 });
      expect(l.page).toBe(p);
      expect(l.pageCount).toBe(pages);
      expect(l.slots.length).toBeLessThanOrEqual(5);
      for (const s of l.slots) expect(s.page).toBe(p);
      seen.push(...l.slots.map((s) => s.name));
      expect(l.title[0]).toBe(`city-pack: page ${p} of ${pages}`);
      expect(l.title.some((t) => t.includes("&page="))).toBe(p < pages);
    }
    expect(seen).toEqual(galleryEntries(MANIFEST, "city-pack").map((g) => g.entry.name));
    expect(layout("city-pack", BUILDING_FRONTS, [], { page: 99, pageSize: 5 }).page).toBe(pages);
    expect(layout("city-pack", BUILDING_FRONTS, [], { page: 0, pageSize: 5 }).page).toBe(1);
    expect(galleryPageCount(0, 12)).toBe(1);
  });

  it("with no page options every entry is on the one page", () => {
    const l = layout("simple-town");
    expect(l.pageCount).toBe(1);
    expect(l.slots).toHaveLength(galleryEntries(MANIFEST, "simple-town").length);
  });

  it("chooses columns from the canvas shape: a wide one more, a tall one two", () => {
    expect(galleryColumns(16 / 9)).toBe(4);
    expect(galleryColumns(0.46)).toBe(2);
    expect(galleryColumns(1)).toBe(2);
    expect(galleryColumns(21 / 9)).toBe(5);
    expect(galleryColumns(NaN)).toBe(4);
  });
});

describe("outlines", () => {
  it("a solid outline is four strips on the rectangle's edges; a dashed one is the same edges cut into dashes with gaps", () => {
    const solid = outlineStrips(4, 3, false);
    expect(solid).toHaveLength(4);
    const dashed = outlineStrips(4, 3, true);
    expect(dashed.length).toBeGreaterThan(8);
    for (const [x0, z0, x1, z1] of [...solid, ...dashed]) {
      expect(x1).toBeGreaterThan(x0);
      expect(z1).toBeGreaterThan(z0);
      expect(Math.abs(x0)).toBeLessThanOrEqual(2.1);
      expect(Math.abs(z0)).toBeLessThanOrEqual(1.6);
    }
    // Dashes on one side do not touch.
    const top = dashed.filter(([, z0, , z1]) => z0 < 0 && z1 - z0 < 0.2 && z0 < -1.4).sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < top.length; i++) expect(top[i]![0]).toBeGreaterThan(top[i - 1]![2]);
  });
});

describe("the scene: isolated, unpickable, safe", () => {
  it("has a ground, an outline, a clone wrapper, an arrow and a caption per slot, and no object can be picked", () => {
    const l = layout("town-pack");
    const built = buildGalleryScene(l, () => new Group(), { surface: stubTextSurface });
    const sprites: Sprite[] = [];
    built.scene.traverse((o) => {
      if (o instanceof Sprite) sprites.push(o);
    });
    expect(sprites).toHaveLength(l.slots.length + 1);
    expect(sprites[0]!.userData["text"]).toBe(l.title.join("\n"));
    for (const s of l.slots) {
      expect(built.scene.getObjectByName(`outline:${s.name}`), s.name).toBeDefined();
      expect(built.scene.getObjectByName(`model:${s.name}`), s.name).toBeDefined();
    }
    built.scene.updateMatrixWorld(true);
    const hits: Object3D[] = [];
    built.scene.traverse((o) => {
      for (const origin of [new Vector3(0, 30, 0), new Vector3(l.slots[0]!.x, 30, l.slots[0]!.z)]) {
        if (new Raycaster(origin, new Vector3(0, -1, 0)).intersectObject(o, false).length > 0) hits.push(o);
      }
    });
    expect(hits).toEqual([]);
    expect(new Raycaster(new Vector3(l.slots[0]!.x, 30, l.slots[0]!.z), new Vector3(0, -1, 0)).intersectObject(built.scene, true)).toEqual([]);
    built.dispose();
    built.dispose();
  });

  it("with no model lookup (the GLB is missing) still shows outlines, arrows and captions; with no manifest it shows one caption and throws nothing", () => {
    const l = layout("city-pack");
    const built = buildGalleryScene(l, null, { surface: stubTextSurface });
    expect(built.models.every((g) => g.children.length === 0)).toBe(true);
    built.dispose();
    const none = galleryLayout(null, "city-pack");
    expect(() => buildGalleryScene(none, null, { surface: stubTextSurface }).dispose()).not.toThrow();
    const sprites: Sprite[] = [];
    buildGalleryScene(none, null, { surface: stubTextSurface }).scene.traverse((o) => {
      if (o instanceof Sprite) sprites.push(o);
    });
    expect(sprites).toHaveLength(1);
    expect(sprites[0]!.userData["text"]).toBe("no converted packs");
  });

  it("clones its models: the lookup's own root is never added to the scene", () => {
    const l = layout("town-pack");
    const root = new Group();
    const built = buildGalleryScene(l, () => root, { surface: stubTextSurface });
    expect(root.parent).toBeNull();
    expect(built.models.every((g) => g.children.length === 1 && g.children[0] !== root)).toBe(true);
    built.dispose();
  });
});

describe("the camera and the caption size", () => {
  it.each([
    [1280, 720],
    [390, 844],
    [900, 1200],
  ])("frames the whole page, tallest model included, on a %i x %i canvas", (w, h) => {
    const l = galleryLayout(MANIFEST, "simple-town", BUILDING_FRONTS, [], { pageSize: 12, columns: galleryColumns(w / h) });
    const rig = createGalleryRig(l.bounds, w, h);
    const p = new Vector3();
    for (const x of [l.bounds.minX, l.bounds.maxX]) {
      for (const z of [l.bounds.minZ, l.bounds.maxZ]) {
        for (const y of [0, l.bounds.maxY]) {
          p.set(x, y, z).project(rig.camera);
          expect(Math.abs(p.x)).toBeLessThanOrEqual(1);
          expect(Math.abs(p.y)).toBeLessThanOrEqual(1);
        }
      }
    }
    // The camera looks from +z: screen down is world +z, like the town's.
    expect(rig.camera.position.z).toBeGreaterThan((l.bounds.minZ + l.bounds.maxZ) / 2);
  });

  it("pans, zooms within limits and resets", () => {
    const l = layout("city-pack");
    const rig = createGalleryRig(l.bounds, 1280, 720);
    const s0 = rig.getScale();
    expect(rig.zoomStep(1)).toBeGreaterThan(s0);
    for (let i = 0; i < 40; i++) rig.zoomStep(1);
    const max = rig.getScale();
    rig.zoomStep(1);
    expect(rig.getScale()).toBe(max);
    for (let i = 0; i < 80; i++) rig.zoomStep(-1);
    expect(rig.getScale()).toBeLessThan(s0);
    rig.resetView();
    expect(rig.getScale()).toBeCloseTo(s0, 6);
    rig.setPan(-100, 0);
    expect(rig.getPan().x).toBeCloseTo(-100, 6);
    rig.resetView();
    expect(rig.getPan().x).toBeCloseTo(0, 6);
  });

  it("keeps each caption's text inside the ground it reserves, at its own depth, near rows and far", () => {
    for (const [w, h] of [[1280, 720], [390, 844], [900, 1200]] as const) {
      const l = galleryLayout(MANIFEST, "simple-town", BUILDING_FRONTS, [], { pageSize: 12, columns: galleryColumns(w / h) });
      const rig = createGalleryRig(l.bounds, w, h);
      const a = new Vector3();
      const b = new Vector3();
      for (const s of l.slots) {
        // The caption's screen height is its lines x CAPTION_LINE_UNITS x px per unit at its anchor's depth (what setViewport does).
        a.set(s.captionAt.x, 0, s.captionAt.z).project(rig.camera);
        b.set(s.box.cx, 0, s.box.cz + s.box.d / 2).project(rig.camera);
        const depth = -new Vector3(s.captionAt.x, 0, s.captionAt.z).applyMatrix4(rig.camera.matrixWorldInverse).z;
        const textPx = s.caption.length * CAPTION_LINE_UNITS * captionPx(h, depth);
        const reservedPx = ((a.y - b.y) / 2) * h;
        expect(reservedPx, `${w}x${h} ${s.name}`).toBeGreaterThanOrEqual(textPx);
      }
    }
  });

  it("sizes every caption sprite larger at a closer zoom", () => {
    const l = layout("town-pack");
    const rig = createGalleryRig(l.bounds, 1280, 720);
    const built = buildGalleryScene(l, null, { surface: stubTextSurface });
    built.setViewport(rig.camera, 720);
    const sprite = [...(function* () {
      const out: Sprite[] = [];
      built.scene.traverse((o) => {
        if (o instanceof Sprite) out.push(o);
      });
      yield* out;
    })()][1]!;
    const a = sprite.scale.y;
    rig.zoomStep(1);
    built.setViewport(rig.camera, 720);
    expect(sprite.scale.y).toBeGreaterThan(a);
    built.dispose();
  });
});

describe("loading only the asked pack", () => {
  const dir = "assets/private/out/";
  function deps(over: Partial<GalleryLoadDeps> = {}): { deps: GalleryLoadDeps; infos: string[]; glbs: string[]; json: string[] } {
    const infos: string[] = [];
    const glbs: string[] = [];
    const json: string[] = [];
    return {
      infos,
      glbs,
      json,
      deps: {
        dir,
        info: (m) => infos.push(m),
        fetchJson: async (u) => {
          json.push(u);
          return MANIFEST;
        },
        loadGlb: async (u) => {
          glbs.push(u);
          return new Group();
        },
        ...over,
      },
    };
  }

  it("fetches the manifest and that one pack's GLB, and logs nothing", async () => {
    for (const id of ["town-pack", "city-pack", "simple-town"]) {
      const d = deps();
      const pack = await loadGalleryPack(id, d.deps);
      expect(d.glbs).toEqual([`${dir}${id}.glb`]);
      expect(d.json).toEqual([`${dir}manifest.json`]);
      expect(pack.root).toBeInstanceOf(Group);
      expect(pack.manifest).toBe(MANIFEST);
      expect(d.infos).toEqual([]);
    }
  });

  it("with no manifest: one info line, no GLB asked for, no throw", async () => {
    const d = deps({
      fetchJson: async () => {
        throw new Error("HTTP 404");
      },
    });
    const pack = await loadGalleryPack("city-pack", d.deps);
    expect(pack).toEqual({ manifest: null, root: null });
    expect(d.infos).toHaveLength(1);
    expect(d.infos[0]).toContain("HTTP 404");
    expect(d.glbs).toEqual([]);
  });

  it("with a manifest of another version, or one that is not a manifest: one info line", async () => {
    for (const body of [{ version: 99, packs: [] }, "nope", null]) {
      const d = deps({ fetchJson: async () => body });
      expect((await loadGalleryPack("city-pack", d.deps)).manifest).toBeNull();
      expect(d.infos).toHaveLength(1);
    }
  });

  it("with a pack the manifest lacks: one info line, no GLB asked for, the manifest kept", async () => {
    const d = deps();
    const pack = await loadGalleryPack("no-such-pack", d.deps);
    expect(pack.root).toBeNull();
    expect(pack.manifest).toBe(MANIFEST);
    expect(d.infos).toHaveLength(1);
    expect(d.infos[0]).toContain("no-such-pack");
    expect(d.glbs).toEqual([]);
  });

  it("with the GLB absent: one info line, no throw, outlines and captions still laid out", async () => {
    const d = deps({
      loadGlb: async () => {
        throw new Error("HTTP 404");
      },
    });
    const pack = await loadGalleryPack("town-pack", d.deps);
    expect(pack.root).toBeNull();
    expect(pack.manifest).toBe(MANIFEST);
    expect(d.infos).toHaveLength(1);
    expect(d.infos[0]).toContain("town-pack.glb");
    expect(galleryLayout(pack.manifest, "town-pack").slots.length).toBeGreaterThan(0);
  });
});

describe("isolation from the town", () => {
  it("is switched on in renderer.ts only, by the page's query string, before the town's scene is built", () => {
    const text = readFileSync("src/render3d/renderer.ts", "utf8");
    expect(text).toMatch(/galleryRequested\(location\.search\)/);
    expect(text.indexOf("createGalleryRenderer3d(")).toBeGreaterThan(-1);
    expect(text.indexOf("createGalleryRenderer3d(")).toBeLessThan(text.indexOf("buildScene(puzzle"));
    // main.ts and the 2D renderer know nothing of it.
    for (const f of ["src/main.ts", "src/render/index.ts"]) expect(/gallery/i.test(readFileSync(f, "utf8")), f).toBe(false);
  });

  it("is never imported by the scene, the town or the models: nothing in the play path reaches it", () => {
    for (const f of ["scene.ts", "town.ts", "models.ts", "models3d.ts", "pick.ts", "layout.ts", "camera.ts"]) {
      expect(/from "\.\/gallery"/.test(readFileSync(`src/render3d/${f}`, "utf8")), f).toBe(false);
    }
  });
});

// The real manifest is gitignored and only on the machine that converted the packs: these run there and skip elsewhere.
const REAL = "assets/private/out/manifest.json";
describe.skipIf(!existsSync(REAL))("against the real manifest", () => {
  const real = JSON.parse(readFileSync(REAL, "utf8")) as unknown;
  it.each(["simple-town", "city-pack", "town-pack", "apocalypse-power"])("%s: lays out without overlap, every front toward the camera", (id) => {
    expect(isManifest(real)).toBe(true);
    const m = real as AssetManifest;
    if (!m.packs.some((p) => p.pack === id)) return;
    const l = galleryLayout(m, id, BUILDING_FRONTS, [], { pageSize: 100, columns: 5 });
    expect(l.slots.length).toBeGreaterThan(0);
    expect(l.slots.length).toBeLessThanOrEqual(100);
    for (const s of l.slots) {
      const [dx, dz] = frontOf(s);
      expect(dz / Math.hypot(dx, dz), s.name).toBeGreaterThan(0.99996);
    }
    for (let i = 0; i < l.slots.length; i++) for (let j = i + 1; j < l.slots.length; j++) expect(galleryRectsOverlap(l.slots[i]!.outline, l.slots[j]!.outline)).toBe(false);
    console.info(`gallery ${id}: ${galleryEntries(m, id).length} building-sized entries, ${galleryEntries(m, id).filter((g) => !g.part).length} whole-looking`);
  });
});
