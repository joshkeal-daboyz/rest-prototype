/** Ticket 043 B: the building gallery (debug only), one straight line of models with four copies each. No WebGL: the layout is pure, the scene is built with a stub text surface and a fake model root. */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { Group, Mesh, Object3D, PlaneGeometry, Raycaster, Sprite, Vector3 } from "three";
import { ASSET_MANIFEST_VERSION, applyCalibrationPatch, type AssetEntry, type AssetManifest, type CalibrationFile, type CalibrationKey, type CalibrationPatch } from "../core";
import { declaredFrontDirection } from "./debug3d";
import {
  COPY_GAP,
  COPY_LINE_UNITS,
  CAPTION_WRAP,
  GALLERY_DEFAULT_PACK,
  GALLERY_ELEVATION_DEG,
  GALLERY_FRONTS,
  GROUP_GAP,
  GROUP_LINE_UNITS,
  MIN_PX_PER_UNIT,
  NON_BUILDING_PREFIXES,
  buildGalleryScene,
  captionPx,
  createGalleryRig,
  galleryCopyCaption,
  galleryEntries,
  galleryGroupCaption,
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
  type GalleryLayout,
  type GalleryLoadDeps,
  type GallerySlot,
} from "./gallery";
import { effectiveFronts } from "./calibration";
import { BUILDING_FRONTS, MODEL_TABLE, WORLD_PER_METRE, atFront, frontAxis, frontIsQuarter, frontYaw, isManifest, lotTypeOf, type FrontTable, type ModelFront } from "./models";
import { stubTextSurface } from "./text";
import { LOT_TYPES, type Lot } from "./town";

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

const names = (m: AssetManifest, id: string, fronts: FrontTable = BUILDING_FRONTS, exclude: readonly CalibrationKey[] = []): string[] =>
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
    expect(galleryPageRequested("")).toEqual({ page: 1, pageSize: null });
    expect(galleryPageRequested("?gallery=x&page=3&per=100")).toEqual({ page: 3, pageSize: 100 });
    expect(galleryPageRequested("?page=0&per=-2")).toEqual({ page: 1, pageSize: null });
    expect(galleryPageRequested("?page=abc&per=1.5")).toEqual({ page: 1, pageSize: null });
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
    expect(names(m, "simple-town", { "simple-town:Building_Small_Hut": { front: "-z" }, "simple-town:Env_Listed": { front: "+x" } })).toEqual(["Building_Small_Hut", "Env_Listed"]);
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
const layout = (id: string, fronts: FrontTable = BUILDING_FRONTS, exclude: readonly CalibrationKey[] = [], opts = {}) => galleryLayout(MANIFEST, id, fronts, exclude, opts);
const PACKS = ["simple-town", "city-pack", "town-pack"] as const;
const FRONTS: readonly ModelFront[] = ["+z", "+x", "-z", "-x"];

// The camera looks from +z toward -z, so a copy faces it when its turned side points along +z.
const SCRAMBLED: FrontTable = {
  "simple-town:Building_Shop_01": { front: "+x" },
  "simple-town:Building_Shop_02": { front: "-x" },
  "simple-town:Building_Gym": { front: "-z" },
  "simple-town:store_small_mesh": { front: "+z" },
  "simple-town:house_mesh": { front: "+x" },
};

/** The unit direction a copy's declared side faces in the gallery's frame: its model-space axis turned by the copy's yaw. */
const frontOf = (s: GallerySlot): readonly [number, number] => declaredFrontDirection(s.front, s.yaw);
/** The angle, in degrees, between a copy's turned side and +z, the camera. */
const offCamera = (s: GallerySlot): number => {
  const [dx, dz] = frontOf(s);
  return (Math.acos(Math.min(1, Math.max(-1, dz / Math.hypot(dx, dz)))) * 180) / Math.PI;
};
/** Every layout rule that must hold whatever the pack: used on the fixture and on the real manifest. */
function expectSoundLine(l: GalleryLayout, label: string): void {
  expect(l.slots, label).toHaveLength(l.groups.length * 4);
  l.groups.forEach((g, i) => {
    expect(g.slots.map((s) => s.front), `${label} ${g.name}`).toEqual(FRONTS);
    expect(l.slots.slice(i * 4, i * 4 + 4), label).toEqual(g.slots);
    for (const s of g.slots) {
      expect(offCamera(s), `${label} ${g.name} ${s.front}`).toBeLessThan(0.5);
      // Every outline's front edge is on the one line z = 0, inside its cell, and its caption is no wider than the cell.
      expect(s.outline.cz + s.outline.d / 2, `${label} ${g.name} ${s.front}`).toBeCloseTo(0, 9);
      expect(s.outline.w).toBeLessThanOrEqual(s.cell.w + 1e-9);
      expect(s.captionW).toBeLessThanOrEqual(s.cell.w + 1e-9);
      expect(s.cell.cx - s.cell.w / 2).toBeGreaterThanOrEqual(g.box.cx - g.box.w / 2 - 1e-9);
      expect(s.cell.cx + s.cell.w / 2).toBeLessThanOrEqual(g.box.cx + g.box.w / 2 + 1e-9);
    }
    expect(g.captionW, `${label} ${g.name}`).toBeLessThanOrEqual(g.box.w + 1e-9);
    // Copies are in order left to right with at least COPY_GAP between their cells.
    for (let k = 1; k < 4; k++) {
      const gap = g.slots[k]!.cell.cx - g.slots[k]!.cell.w / 2 - (g.slots[k - 1]!.cell.cx + g.slots[k - 1]!.cell.w / 2);
      expect(gap, `${label} ${g.name}`).toBeGreaterThanOrEqual(COPY_GAP - 1e-9);
    }
    if (i > 0) {
      const p = l.groups[i - 1]!;
      expect(g.box.cx - g.box.w / 2 - (p.box.cx + p.box.w / 2), `${label} ${p.name} / ${g.name}`).toBeCloseTo(GROUP_GAP, 9);
    }
  });
  // No two outlines, no two groups, no two captions share ground along the line.
  for (let i = 0; i < l.slots.length; i++) {
    for (let j = i + 1; j < l.slots.length; j++) {
      const a = l.slots[i]!;
      const b = l.slots[j]!;
      expect(galleryRectsOverlap(a.outline, b.outline), `${label} ${a.name} ${a.front} / ${b.name} ${b.front}`).toBe(false);
      expect(Math.abs(a.captionAt.x - b.captionAt.x), `${label} caption ${a.name} ${a.front} / ${b.name} ${b.front}`).toBeGreaterThanOrEqual((a.captionW + b.captionW) / 2 - 1e-9);
    }
  }
  for (let i = 0; i < l.groups.length; i++) {
    for (let j = i + 1; j < l.groups.length; j++) {
      const a = l.groups[i]!;
      const b = l.groups[j]!;
      expect(galleryRectsOverlap(a.box, b.box), `${label} ${a.name} / ${b.name}`).toBe(false);
      expect(Math.abs(a.captionAt.x - b.captionAt.x), `${label} group caption ${a.name} / ${b.name}`).toBeGreaterThanOrEqual((a.captionW + b.captionW) / 2 - 1e-9);
    }
  }
}

describe("galleryLayout: one straight line, every entry shown", () => {
  it("separates groups by more than twice the gap between copies", () => {
    expect(GROUP_GAP).toBeGreaterThan(COPY_GAP * 2);
  });

  it.each(PACKS)("%s: one group per building-sized entry, in entry order, along x, with no overlap", (id) => {
    const l = layout(id);
    const wanted = galleryEntries(MANIFEST, id);
    expect(l.groups.map((g) => g.name)).toEqual(wanted.map((g) => g.entry.name));
    expect(l.groups.length).toBeGreaterThan(5);
    expect(l.total).toBe(wanted.length);
    expectSoundLine(l, id);
    // Left to right: each group starts after the last one ends.
    for (let i = 1; i < l.groups.length; i++) expect(l.groups[i]!.box.cx).toBeGreaterThan(l.groups[i - 1]!.box.cx);
  });

  it("holds at a table that uses all four faces, and with no table", () => {
    for (const fronts of [SCRAMBLED, {}]) for (const id of PACKS) expectSoundLine(layout(id, fronts), id);
  });

  it("puts family members side by side, whole-looking buildings before parts", () => {
    const l = layout("simple-town");
    const shop = l.groups.findIndex((g) => g.name === "Building_Shop_01");
    expect(l.groups[shop + 1]!.name).toBe("Building_Shop_02");
    const city = layout("city-pack").groups.map((g) => g.name);
    const firstPart = city.findIndex((n) => isPartName(n));
    for (let i = 0; i < city.length; i++) expect(isPartName(city[i]!), city[i]).toBe(i >= firstPart);
  });

  it("stands each copy on the lot its size fits when that side is the front, its front face against the lot's front edge; a copy that fits none gets a dashed outline round its footprint", () => {
    const l = layout("simple-town");
    let dashed = 0;
    for (const s of l.slots) {
      const e = s.entry.entry;
      const t = lotTypeOf(e, s.front);
      const [w, , d] = s.entry.size;
      const depth = (frontIsQuarter(s.front) ? w : d) * WORLD_PER_METRE;
      if (t) {
        expect(s.lot, s.name).toEqual({ w: LOT_TYPES[t].frontage * WORLD_PER_METRE, d: LOT_TYPES[t].depth * WORLD_PER_METRE });
        expect(s.dashed, s.name).toBe(false);
        expect(s.outline.w).toBeCloseTo(s.lot!.w, 9);
        // atFront from the town: the lot's centre moved toward its front by (lot depth - model depth) / 2.
        const lot = { x: s.outline.cx, z: s.outline.cz, yaw: 0, d: s.lot!.d } as unknown as Lot;
        const spot = atFront(lot, depth);
        expect(s.x, s.name).toBeCloseTo(spot.x, 9);
        expect(s.z, s.name).toBeCloseTo(spot.z, 9);
      } else {
        dashed++;
        expect(s.lot, s.name).toBeNull();
        expect(s.dashed, s.name).toBe(true);
        expect(s.outline.w, s.name).toBeGreaterThan((frontIsQuarter(s.front) ? d : w) * WORLD_PER_METRE);
      }
      expect(s.scale).toBe(WORLD_PER_METRE);
    }
    // The 47 x 43 m mall fits no lot at any turning.
    const mall = l.groups.find((g) => g.name === "Building_Mall_A")!;
    expect(mall.slots.every((s) => s.dashed)).toBe(true);
    expect(dashed).toBeGreaterThanOrEqual(4);
  });

  it("has no manifest, a missing pack, or a pack with nothing building-sized: no groups, a message, no throw", () => {
    expect(galleryLayout(null, "city-pack").slots).toEqual([]);
    expect(galleryLayout(null, "city-pack").title).toEqual(["no converted packs"]);
    expect(galleryLayout({ ...MANIFEST, packs: [] }, "x").title).toEqual(["no converted packs"]);
    const missing = galleryLayout(MANIFEST, "nope");
    expect(missing.groups).toEqual([]);
    expect(missing.title[0]).toBe('no pack "nope" in the manifest');
    expect(missing.title[1]).toContain("city-pack");
    expect(galleryMessage(MANIFEST, "city-pack")).toBeNull();
    const none: AssetManifest = { ...MANIFEST, packs: [{ ...MANIFEST.packs[0]!, assets: [entry("SM_Prop_A", 9, 9, 9, 1)] }] };
    expect(galleryLayout(none, "city-pack").title[0]).toContain("no building-sized entries");
  });
});

describe("galleryLayout: four copies, one per front, each turned to the camera", () => {
  it.each([
    ["the shipped table", BUILDING_FRONTS],
    ["a table that uses all four faces", SCRAMBLED],
    ["no table", {}],
  ])("every model has exactly four copies, one per front, in the order +z +x -z -x, each with frontYaw and its caption, under 0.5 degrees from the camera: %s", (_label, fronts) => {
    for (const id of PACKS) {
      for (const g of layout(id, fronts).groups) {
        expect(g.slots, `${id} ${g.name}`).toHaveLength(4);
        expect(g.slots.map((s) => s.front)).toEqual(GALLERY_FRONTS);
        expect(new Set(g.slots.map((s) => s.front)).size).toBe(4);
        g.slots.forEach((s, k) => {
          expect(s.yaw, `${id} ${g.name} ${s.front}`).toBe(frontYaw(FRONTS[k]!));
          expect(s.caption[0], `${id} ${g.name} ${s.front}`).toMatch(new RegExp(`^door: \\${s.front}( \\?)?$`));
          expect(offCamera(s), `${id} ${g.name} ${s.front}`).toBeLessThan(0.5);
        });
      }
    }
  });

  it("marks exactly one copy `current`, the one whose side is the table's front now, with a `current` caption line and no other copy marked", () => {
    for (const fronts of [BUILDING_FRONTS, SCRAMBLED, {} as FrontTable]) {
      for (const g of layout("simple-town", fronts).groups) {
        const now = (fronts[`simple-town:${g.name}`]?.front ?? "+z") as ModelFront;
        const marked = g.slots.filter((s) => s.current);
        expect(marked.map((s) => s.front), g.name).toEqual([now]);
        expect(g.entry.front).toBe(now);
        for (const s of g.slots) expect(s.caption.some((c) => c.startsWith("current")), `${g.name} ${s.front}`).toBe(s.current);
      }
    }
  });

  it("keeps the ? on an uncalibrated name's current copy (the +z guess), and nowhere else", () => {
    const l = layout("simple-town");
    const mall = l.groups.find((g) => g.name === "Building_Mall_A")!;
    expect(mall.entry.guessed).toBe(true);
    expect(mall.slots.map((s) => s.caption[0])).toEqual(["door: +z", "door: +x", "door: -z", "door: -x"]);
    const shop = l.groups.find((g) => g.name === "Building_Shop_01")!;
    expect(shop.slots.map((s) => s.caption[0])).toEqual(["door: +z", "door: +x", "door: -z", "door: -x"]);
    expect(shop.slots.find((s) => s.current)!.front).toBe("-z");
    expect(l.slots.filter((s) => s.caption.some((c) => c.includes("?"))).every((s) => s.current && s.entry.guessed)).toBe(true);
    expect(mall.slots.find((s) => s.current)!.caption).toEqual(["door: +z", "current ?"]);
    expect(galleryCopyCaption("-x", true, false)).toEqual(["door: -x", "current"]);
    expect(galleryCopyCaption("-x", false, true)).toEqual(["door: -x"]);
  });

  it("turns a clone's own marker for each side (one metre along that side, in the model's frame) to +z in the built scene", () => {
    const l = layout("simple-town", SCRAMBLED);
    const root = (): Object3D => {
      const g = new Group();
      for (const f of FRONTS) {
        const marker = new Object3D();
        marker.name = `front-marker:${f}`;
        const [ax, az] = frontAxis(f);
        marker.position.set(ax, 0, az);
        g.add(marker);
      }
      return g;
    };
    const built = buildGalleryScene(l, root, { surface: stubTextSurface });
    built.scene.updateMatrixWorld(true);
    expect(built.models).toHaveLength(l.slots.length);
    const seen = new Set<ModelFront>();
    built.models.forEach((wrap, i) => {
      const s = l.slots[i]!;
      seen.add(s.front);
      const at = wrap.getWorldPosition(new Vector3());
      const tip = wrap.children[0]!.getObjectByName(`front-marker:${s.front}`)!.getWorldPosition(new Vector3());
      expect(at.x).toBeCloseTo(s.x, 9);
      expect(at.z).toBeCloseTo(s.z, 9);
      const dx = tip.x - at.x;
      const dz = tip.z - at.z;
      expect(dz / Math.hypot(dx, dz), `${s.name} ${s.front}`).toBeGreaterThan(Math.cos((0.5 * Math.PI) / 180));
    });
    expect(seen.size).toBe(4);
    built.dispose();
  });

  it("captions a group once: name, size, lot, family, corner and excluded; the copies carry only `door: f`", () => {
    const l = layout("simple-town", BUILDING_FRONTS, ["simple-town:Building_Gym"]);
    const cap = (n: string): string[] => l.groups.find((g) => g.name === n)!.caption;
    expect(cap("Building_Shop_01")).toContain("lot: small");
    expect(cap("store_corner_mesh")).toContain("corner, open -x");
    expect(cap("Building_Gym")).toContain("excluded");
    expect(cap("Building_Shop_01")).not.toContain("excluded");
    expect(cap("Building_Shop_02").slice(-2)).toEqual(["copy of Building_", "Shop_01"]);
    expect(cap("Building_Shop_01").some((x) => x.startsWith("copy of"))).toBe(false);
    expect(cap("Building_Shop_01")[0]).toBe("Building_Shop_01");
    for (const s of l.slots) {
      expect(s.caption.length).toBeLessThanOrEqual(2);
      expect(s.caption.some((c) => c.includes(s.name) || c.includes("excluded") || c.includes("lot:"))).toBe(false);
    }
  });

  it("captions the size in metres and the lot type, so a part reads differently from a whole building", () => {
    const l = layout("city-pack");
    const cap = (n: string): string[] => l.groups.find((g) => g.name === n)!.caption;
    expect(cap("SM_Bld_CityHall_01")).toContain("20 x 9.2 x 18 m");
    expect(cap("SM_Bld_OfficeRound_01")).toContain("22 x 38 x 22 m");
    expect(cap("SM_Bld_OfficeRound_01")).toContain("lot: none fits");
    expect(cap("SM_Bld_OfficeOld_Large_Floor_01")).toContain("15 x 3 x 15 m");
  });

  it("wraps long names at underscores to the caption width and never loses a character", () => {
    expect(wrapName("SM_Bld_OfficeOld_Large_Base_01")).toEqual(["SM_Bld_OfficeOld_", "Large_Base_01"]);
    expect(wrapName("Building_Shop_01")).toEqual(["Building_Shop_01"]);
    for (const n of ["SM_Bld_House_ExteriorWall_GarageDoor_01", "Averyveryveryveryverylongwordwithoutbreaks", "a", "SM_Bld_OfficeRound_Base_01_Glass"]) {
      const lines = wrapName(n);
      expect(lines.join(""), n).toBe(n);
      for (const line of lines) expect(line.length, n).toBeLessThanOrEqual(CAPTION_WRAP);
    }
    expect(galleryGroupCaption(galleryEntries(MANIFEST, "simple-town")[0]!)[0]).toBeTruthy();
  });
});

describe("galleryLayout: deterministic, paged only on request", () => {
  it("returns the same layout every time", () => {
    const a = JSON.stringify(layout("city-pack", BUILDING_FRONTS, [], { pageSize: 3, page: 2 }));
    const b = JSON.stringify(layout("city-pack", BUILDING_FRONTS, [], { pageSize: 3, page: 2 }));
    expect(a).toBe(b);
    expect(JSON.stringify(layout("town-pack"))).toBe(JSON.stringify(layout("town-pack")));
  });

  it("with no page options every model is on the one page", () => {
    const l = layout("simple-town");
    expect(l.pageCount).toBe(1);
    expect(l.page).toBe(1);
    expect(l.groups).toHaveLength(galleryEntries(MANIFEST, "simple-town").length);
    expect(galleryPageRequested("?gallery=simple-town")).toEqual({ page: 1, pageSize: null });
  });

  it("pages, when asked, cover every model once and in order; a page past the end is the last", () => {
    const total = galleryEntries(MANIFEST, "city-pack").length;
    const pages = galleryPageCount(total, 3);
    expect(pages).toBe(Math.ceil(total / 3));
    const seen: string[] = [];
    for (let p = 1; p <= pages; p++) {
      const l = layout("city-pack", BUILDING_FRONTS, [], { page: p, pageSize: 3 });
      expect(l.page).toBe(p);
      expect(l.pageCount).toBe(pages);
      expect(l.groups.length).toBeLessThanOrEqual(3);
      for (const g of l.groups) expect(g.page).toBe(p);
      seen.push(...l.groups.map((g) => g.name));
      expect(l.title.some((t) => t.includes("&page="))).toBe(p < pages);
      expectSoundLine(l, `page ${p}`);
    }
    expect(seen).toEqual(galleryEntries(MANIFEST, "city-pack").map((g) => g.entry.name));
    expect(layout("city-pack", BUILDING_FRONTS, [], { page: 99, pageSize: 3 }).page).toBe(pages);
    expect(layout("city-pack", BUILDING_FRONTS, [], { page: 0, pageSize: 3 }).page).toBe(1);
    expect(galleryPageCount(0, 12)).toBe(1);
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
  it("has an outline, a clone wrapper and a caption per copy, a caption per group and one title; no object can be picked", () => {
    const l = layout("town-pack");
    const built = buildGalleryScene(l, () => new Group(), { surface: stubTextSurface });
    const sprites: Sprite[] = [];
    built.scene.traverse((o) => {
      if (o instanceof Sprite) sprites.push(o);
    });
    expect(sprites).toHaveLength(l.slots.length + l.groups.length + 1);
    expect(sprites[0]!.userData["text"]).toBe(l.title.join("\n"));
    const texts = new Set(sprites.map((s) => s.userData["text"] as string));
    for (const g of l.groups) expect(texts.has(g.caption.join("\n")), g.name).toBe(true);
    for (const s of l.slots) {
      expect(built.scene.getObjectByName(`outline:${s.name}:${s.front}`), s.name).toBeDefined();
      expect(built.scene.getObjectByName(`model:${s.name}:${s.front}`), s.name).toBeDefined();
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

  it("the ground is a thin strip along the row, not a big square", () => {
    const l = layout("city-pack");
    const built = buildGalleryScene(l, null, { surface: stubTextSurface });
    const ground = built.scene.getObjectByName("gallery-ground") as Mesh;
    const geo = ground.geometry as PlaneGeometry;
    const { world } = l.view;
    expect(geo.parameters.width).toBeCloseTo(world.maxX - world.minX + 4, 6);
    expect(geo.parameters.height).toBeCloseTo(world.maxZ - world.minZ + 1, 6);
    expect(geo.parameters.height).toBeLessThan(geo.parameters.width / 4);
    built.dispose();
  });

  it("with no model lookup (the GLB is missing) still shows outlines and captions; with no manifest it shows one caption and throws nothing", () => {
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
    expect(() => createGalleryRig(none.view, 800, 450)).not.toThrow();
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

describe("the camera: low, straight on, fitted to the first screen, panned along the row", () => {
  const dir = new Vector3();

  it.each([
    [800, 450],
    [1280, 720],
    [390, 844],
  ])("looks along -z from the elevation, on a %i x %i canvas, with the first group, its captions and the title all on screen", (w, h) => {
    for (const id of PACKS) {
      const l = layout(id);
      const rig = createGalleryRig(l.view, w, h);
      rig.camera.getWorldDirection(dir);
      expect(Math.abs(dir.x)).toBeLessThan(1e-9);
      expect(dir.z).toBeLessThan(0);
      expect((Math.asin(-dir.y) * 180) / Math.PI).toBeCloseTo(GALLERY_ELEVATION_DEG, 6);
      expect(GALLERY_ELEVATION_DEG).toBeGreaterThanOrEqual(12);
      expect(GALLERY_ELEVATION_DEG).toBeLessThanOrEqual(18);
      const first = l.view.screens[0]!;
      const p = new Vector3();
      for (const x of [first.minX, first.maxX]) {
        for (const z of [first.minZ, first.maxZ]) {
          for (const y of [first.minY, first.maxY]) {
            p.set(x, y, z).project(rig.camera);
            expect(Math.abs(p.x), `${id} ${w}x${h}`).toBeLessThanOrEqual(1);
            expect(Math.abs(p.y), `${id} ${w}x${h}`).toBeLessThanOrEqual(1);
          }
        }
      }
      const [lo, hi] = rig.visibleX();
      expect(lo).toBeLessThanOrEqual(l.groups[0]!.box.cx - l.groups[0]!.box.w / 2 + 1e-6);
      expect(hi).toBeGreaterThanOrEqual(l.groups[0]!.box.cx + l.groups[0]!.box.w / 2 - 1e-6);
    }
  });

  it("at 800 px wide shows one to four whole groups (two where the first two fit in 40 units, as the small-lot ones do) at a size you can read: a copy's caption line at least 13 px, a group's at least 16", () => {
    for (const id of ["simple-town", "city-pack"] as const) {
      const l = layout(id);
      const rig = createGalleryRig(l.view, 800, 450);
      const [lo, hi] = rig.visibleX();
      const inView = l.groups.filter((g) => g.box.cx - g.box.w / 2 >= lo && g.box.cx + g.box.w / 2 <= hi);
      expect(inView.length, id).toBeGreaterThanOrEqual(id === "simple-town" ? 2 : 1);
      expect(inView.length, id).toBeLessThanOrEqual(4);
      const depthOf = (x: number, y: number, z: number): number => -new Vector3(x, y, z).applyMatrix4(rig.camera.matrixWorldInverse).z;
      const g0 = l.groups[0]!;
      const copyPx = COPY_LINE_UNITS * captionPx(450, depthOf(g0.slots[0]!.captionAt.x, 0, g0.slots[0]!.captionAt.z));
      const groupPx = GROUP_LINE_UNITS * captionPx(450, depthOf(g0.captionAt.x, g0.captionAt.y, g0.captionAt.z));
      expect(copyPx, id).toBeGreaterThanOrEqual(13);
      expect(groupPx, id).toBeGreaterThanOrEqual(16);
      expect(rig.pxPerUnit()).toBeGreaterThanOrEqual(MIN_PX_PER_UNIT * 0.8);
    }
  });

  it("pans along the row only: y is ignored, the start and the end are the limits, Home is the start, End shows the last group", () => {
    const l = layout("city-pack");
    const rig = createGalleryRig(l.view, 800, 450);
    const y0 = rig.camera.position.y;
    const z0 = rig.camera.position.z;
    const x0 = rig.camera.position.x;
    rig.setPan(-300, 500);
    expect(rig.camera.position.y).toBeCloseTo(y0, 9);
    expect(rig.camera.position.z).toBeCloseTo(z0, 9);
    expect(rig.camera.position.x).toBeGreaterThan(x0);
    expect(rig.getPan().x).toBeCloseTo(-300, 6);
    expect(rig.getPan().y).toBe(0);
    // Dragging past the start stays at the start.
    rig.setPan(1e6, 0);
    expect(rig.camera.position.x).toBeCloseTo(x0, 9);
    // Dragging past the end stops where the line ends.
    rig.setPan(-1e9, 0);
    expect(rig.visibleX()[1]).toBeGreaterThanOrEqual(l.view.world.maxX - 1e-6);
    rig.resetView();
    expect(rig.getPan().x).toBeCloseTo(0, 9);
    rig.jumpToEnd();
    const last = l.groups[l.groups.length - 1]!;
    const [lo, hi] = rig.visibleX();
    expect(lo).toBeLessThanOrEqual(last.box.cx - last.box.w / 2 + 1e-6);
    expect(hi).toBeGreaterThanOrEqual(last.box.cx + last.box.w / 2 - 1e-6);
    rig.resetView();
    expect(rig.camera.position.x).toBeCloseTo(x0, 9);
  });

  it("a keyboard step (a third of the canvas, as play's arrows move it) moves along the row, and the wheel zooms within limits", () => {
    const l = layout("city-pack");
    const rig = createGalleryRig(l.view, 800, 450);
    const x0 = rig.camera.position.x;
    rig.setPan(rig.getPan().x - 800 / 3, 0);
    expect(rig.camera.position.x).toBeGreaterThan(x0);
    rig.resetView();
    const s0 = rig.getScale();
    expect(rig.zoomStep(1)).toBeGreaterThan(s0);
    for (let i = 0; i < 60; i++) rig.zoomStep(1);
    const max = rig.getScale();
    rig.zoomStep(1);
    expect(rig.getScale()).toBe(max);
    for (let i = 0; i < 100; i++) rig.zoomStep(-1);
    expect(rig.getScale()).toBeLessThan(s0);
    const min = rig.getScale();
    rig.zoomStep(-1);
    expect(rig.getScale()).toBe(min);
    rig.resetView();
    expect(rig.getScale()).toBeCloseTo(s0, 6);
  });

  it("sizes every caption sprite larger at a closer zoom", () => {
    const l = layout("town-pack");
    const rig = createGalleryRig(l.view, 800, 450);
    const built = buildGalleryScene(l, null, { surface: stubTextSurface });
    built.setViewport(rig.camera, 450);
    const sprites: Sprite[] = [];
    built.scene.traverse((o) => {
      if (o instanceof Sprite) sprites.push(o);
    });
    // Order: the title, then per group its caption and four copy captions.
    expect(sprites[1]!.userData["text"]).toBe(l.groups[0]!.caption.join("\n"));
    const group = sprites[1]!;
    const copy = sprites[2]!;
    const g0 = group.scale.y / (group.userData["cssH"] as number);
    const c0 = copy.scale.y / (copy.userData["cssH"] as number);
    // A group's line is taller than a copy's.
    expect(g0).toBeGreaterThan(c0);
    rig.zoomStep(1);
    built.setViewport(rig.camera, 450);
    expect(copy.scale.y / (copy.userData["cssH"] as number)).toBeGreaterThan(c0);
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
  // skipIf still runs this callback while collecting, so the file is read only inside a test, never here.
  let memo: unknown;
  const readReal = (): unknown => (memo ??= JSON.parse(readFileSync(REAL, "utf8")) as unknown);
  it.each(["simple-town", "city-pack", "town-pack", "apocalypse-power"])("%s: one line, four copies each, no overlap, every side toward the camera", (id) => {
    const real = readReal();
    expect(isManifest(real)).toBe(true);
    const m = real as AssetManifest;
    if (!m.packs.some((p) => p.pack === id)) return;
    const l = galleryLayout(m, id, BUILDING_FRONTS, []);
    expect(l.groups.length).toBeGreaterThan(0);
    expectSoundLine(l, id);
    const widths = l.groups.map((g) => g.box.w).sort((a, b) => a - b);
    const len = l.view.world.maxX - l.view.world.minX;
    console.info(
      `gallery ${id}: ${l.groups.length} models x 4 copies, group width min ${widths[0]!.toFixed(1)} median ${widths[Math.floor(widths.length / 2)]!.toFixed(1)} max ${widths[widths.length - 1]!.toFixed(1)}, total length ${len.toFixed(0)} units, ` +
        `${galleryEntries(m, id).filter((g) => !g.part).length} whole-looking`,
    );
    const rig = createGalleryRig(l.view, 800, 450);
    const [lo, hi] = rig.visibleX();
    const whole = l.groups.filter((g) => g.box.cx - g.box.w / 2 >= lo && g.box.cx + g.box.w / 2 <= hi).length;
    console.info(`gallery ${id}: first screen at 800 px shows x ${lo.toFixed(1)} to ${hi.toFixed(1)} (${whole} whole groups), ${rig.pxPerUnit().toFixed(1)} px per unit`);
  });
});

describe("the gallery reads the saved calibration file (ticket 045 A)", () => {
  const NOW = new Date("2026-11-18T10:00:00.000Z");
  const SAVED = [
    { key: "simple-town:Building_Gym", entry: { front: "+x" } },
    { key: "simple-town:Building_Mall_A", entry: { front: "-x" } },
    { key: "simple-town:house_mesh", entry: { front: "+z", exclude: true } },
  ] as const;
  const file = SAVED.reduce<CalibrationFile | null>((f, p) => applyCalibrationPatch(f, p as CalibrationPatch, NOW), null)!;
  const withFile = (saved: CalibrationFile | null) => {
    const t = effectiveFronts({ fronts: BUILDING_FRONTS, exclude: [] }, saved, () => {});
    return galleryLayout(MANIFEST, "simple-town", t.fronts, t.exclude, { saved });
  };
  const currentLine = (l: GalleryLayout, name: string): string[] => l.groups.find((g) => g.name === name)!.slots.find((s) => s.current)!.caption;

  it("captions the current copy by where its front came from: `current` (code), `current, saved` (the file), `current ?` (the guess)", () => {
    const none = withFile(null);
    expect(currentLine(none, "Building_Gym")).toEqual(["door: -z", "current"]);
    expect(currentLine(none, "Building_Mall_A")).toEqual(["door: +z", "current ?"]);
    const saved = withFile(file);
    expect(currentLine(saved, "Building_Gym")).toEqual(["door: +x", "current, saved"]);
    // A saved front on a name the code had no line for is no longer a guess.
    expect(currentLine(saved, "Building_Mall_A")).toEqual(["door: -x", "current, saved"]);
    expect(currentLine(saved, "Building_Shop_01")).toEqual(["door: -z", "current"]);
    expect(galleryCopyCaption("+x", true, false, true)).toEqual(["door: +x", "current, saved"]);
    expect(galleryCopyCaption("+x", false, false, true)).toEqual(["door: +x"]);
  });

  it("turns the current copy to the saved front: exactly one copy is current, and it is that side", () => {
    const gym = withFile(file).groups.find((g) => g.name === "Building_Gym")!;
    expect(gym.slots.filter((s) => s.current).map((s) => s.front)).toEqual(["+x"]);
  });

  it("says `excluded` on a group the file excludes, and on no other", () => {
    const l = withFile(file);
    expect(l.groups.find((g) => g.name === "house_mesh")!.caption).toContain("excluded");
    expect(l.groups.filter((g) => g.caption.includes("excluded")).map((g) => g.name)).toEqual(["house_mesh"]);
    expect(withFile(null).groups.some((g) => g.caption.includes("excluded"))).toBe(false);
  });

  it("keeps the order of the groups the same with and without a file", () => {
    expect(withFile(file).groups.map((g) => g.name)).toEqual(withFile(null).groups.map((g) => g.name));
  });

  it("puts `N of M marked` in the title: N models of the pack with an entry in the file, M all of them", () => {
    const m = withFile(null).total;
    expect(withFile(null).title).toContain(`0 of ${m} marked`);
    expect(withFile(file).title).toContain(`3 of ${m} marked`);
    // Entries for other packs do not count here.
    const other = applyCalibrationPatch(file, { key: "city-pack:SM_Bld_Shop_01", entry: { front: "-x" } }, NOW);
    expect(withFile(other).title).toContain(`3 of ${m} marked`);
  });
});
