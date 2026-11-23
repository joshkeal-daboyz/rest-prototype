/**
 * Ticket 050 B: loading the City Pack stack pieces, one placed stack as one Group, and the stack gallery. Fixtures only: the City Pack's names and sizes typed in
 * as numbers from the converted manifest (18 Nov 2026), a fake GLB made of boxes, no WebGL, no timers, no files. Nothing is read from assets/private/.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { BoxGeometry, Euler, Group, Matrix4, Mesh, MeshBasicMaterial, Object3D, Quaternion, Raycaster, Sprite, Vector3 } from "three";
import { ASSET_MANIFEST_VERSION, type AssetEntry, type AssetManifest, type CalibrationFile, type CalibrationKey } from "../core";
import { effectiveFronts } from "./calibration";
import {
  GALLERY_FRONTS,
  buildGalleryScene,
  galleryAction,
  galleryEntries,
  galleryHitAt,
  galleryLayout,
  galleryRectsOverlap,
  galleryRequested,
  stackGalleryLayout,
  stackGalleryRequested,
  type GalleryLayout,
} from "./gallery";
import { NO_MODELS, loadModels, stackEntries, stackGroup, stackRoots, type ModelSet } from "./models3d";
import { WORLD_PER_METRE, planStackPieces, type FrontTable } from "./models";
import { STACK_STYLES, assembleStack, stackRange, type StackSide } from "./stacks";
import { STACK_VARIANTS, frontIsGuess, openOf, pieceCaption, recipePieceKeys, shownStacks, stackCaption, stackPieceEntries } from "./stackgallery";
import { stubTextSurface } from "./text";
import { LOT_TYPE_NAMES, type CornerSide } from "./town";

// ---- the fixture: [name, width, height, depth] in metres, copied from the converted City Pack manifest ----
const SIZES: [string, number, number, number][] = [
  ["SM_Bld_Apartment_01", 5.0, 3.0, 5.196],
  ["SM_Bld_Apartment_02", 5.17, 3.0, 5.214],
  ["SM_Bld_Apartment_03", 5.281, 3.0, 5.497],
  ["SM_Bld_Apartment_Corner_01", 5.196, 3.0, 5.196],
  ["SM_Bld_Apartment_Corner_02", 5.214, 3.0, 5.214],
  ["SM_Bld_Apartment_Corner_03", 5.491, 3.0, 5.497],
  ["SM_Bld_Apartment_Door_01", 5.096, 3.0, 5.577],
  ["SM_Bld_Apartment_Door_02", 5.114, 3.0, 5.115],
  ["SM_Bld_Apartment_Roof_01", 5.31, 0.5, 5.918],
  ["SM_Bld_Apartment_Roof_02", 5.252, 0.744, 5.488],
  ["SM_Bld_Apartment_Roof_03", 5.31, 0.744, 5.624],
  ["SM_Bld_Apartment_Roof_Corner_01", 5.904, 0.5, 5.918],
  ["SM_Bld_Apartment_Roof_Corner_02", 5.611, 0.744, 5.624],
  ["SM_Bld_Apartment_Roof_Corner_03", 5.462, 0.744, 5.488],
  ["SM_Bld_Apartment_Stack_01", 5.0, 9.0, 5.196],
  ["SM_Bld_Apartment_Stack_02", 5.17, 9.0, 5.214],
  ["SM_Bld_Apartment_Stack_03", 5.281, 9.0, 5.497],
  ["SM_Bld_Shop_01", 5.0, 3.054, 5.536],
  ["SM_Bld_Shop_02", 5.0, 3.3, 5.425],
  ["SM_Bld_Shop_03", 10.087, 3.084, 5.493],
  ["SM_Bld_Shop_04", 5.106, 3.17, 5.886],
  ["SM_Bld_Shop_05", 5.108, 3.0, 5.224],
  ["SM_Bld_Shop_06", 5.175, 3.0, 5.877],
  ["SM_Bld_Shop_Corner_01", 5.377, 3.0, 5.471],
  ["SM_Bld_Shop_Corner_02", 5.332, 3.0, 5.332],
  ["SM_Bld_OfficeOld_Small_Base_01", 10.936, 6.0, 10.936],
  ["SM_Bld_OfficeOld_Small_Floor_01", 10.0, 3.193, 10.0],
  ["SM_Bld_OfficeOld_Small_Roof_01", 11.12, 4.215, 11.2],
  ["SM_Bld_OfficeOld_Large_Base_01", 15.936, 6.0, 15.936],
  ["SM_Bld_OfficeOld_Large_Floor_01", 15.0, 3.193, 15.0],
  ["SM_Bld_OfficeOld_Large_Roof_01", 16.087, 4.227, 16.123],
  ["SM_Bld_OfficeOctagon_Base_01", 20.781, 3.896, 20.781],
  ["SM_Bld_OfficeOctagon_Floor_01", 20.465, 3.0, 20.465],
  ["SM_Bld_OfficeOctagon_Roof_01", 20.465, 5.382, 20.465],
  // not in any recipe: dressing and a whole tower
  ["SM_Bld_Shop_Cover_01", 5.2, 1.0, 2.0],
  ["SM_Bld_FireEscape_01", 2.0, 9.0, 1.0],
  ["SM_Bld_Office_01", 12, 40, 12],
];

const entryOf = (name: string, w: number, h: number, d: number): AssetEntry => ({
  name,
  source: `${name}.fbx`,
  bounds: { min: [-w / 2, 0, -d / 2], max: [w / 2, h, d / 2] },
  triangles: 100,
  textures: [],
  missingTextures: [],
  warnings: [],
});
const keyOf = (name: string): CalibrationKey => `city-pack:${name}`;

function manifestOf(omit: readonly string[] = [], packId = "city-pack"): AssetManifest {
  return {
    version: ASSET_MANIFEST_VERSION,
    generatedAt: "2026-01-01T00:00:00Z",
    blenderVersion: "5.0.0",
    packs: [{ pack: packId, glb: `${packId}.glb`, atlas: null, scale: 100, failures: [], assets: SIZES.filter(([n]) => !omit.includes(n)).map(([n, w, h, d]) => entryOf(n, w, h, d)) }],
  };
}
const MANIFEST = manifestOf();
const ENTRIES = stackPieceEntries(MANIFEST);

/** A fake GLB scene: one Group per name holding a box of the piece's size standing on y = 0 (the converter's pivots), geometry and material shared by every clone. */
function fakeGlb(omit: readonly string[] = []): Object3D {
  const scene = new Group();
  for (const [name, w, h, d] of SIZES) {
    if (omit.includes(name)) continue;
    const root = new Group();
    root.name = name;
    const geometry = new BoxGeometry(w, h, d);
    geometry.translate(0, h / 2, 0);
    root.add(new Mesh(geometry, new MeshBasicMaterial()));
    scene.add(root);
  }
  return scene;
}

async function loadSet(opts: { manifest?: AssetManifest; omitRoots?: readonly string[]; stackKeys?: readonly CalibrationKey[] | null } = {}): Promise<{ set: ModelSet; glbs: string[]; info: string[] }> {
  const glbs: string[] = [];
  const info: string[] = [];
  const set = await loadModels({
    fetchJson: async () => opts.manifest ?? MANIFEST,
    loadGlb: async (url) => {
      glbs.push(url);
      return fakeGlb(opts.omitRoots ?? []);
    },
    table: [],
    fronts: {},
    exclude: [],
    dir: "/x/",
    info: (m) => info.push(m),
    ...(opts.stackKeys === null ? {} : { stackKeys: opts.stackKeys ?? recipePieceKeys() }),
  });
  return { set, glbs, info };
}

const cs = (...sides: StackSide[]): CornerSide[] => sides.map((side) => ({ side, road: "x" }));

describe("loading the stack pieces (ticket 050 B)", () => {
  it("the recipe pieces load into ModelSet.stack, in key order, and every other slot is as before", async () => {
    const keys = recipePieceKeys();
    const { set, glbs } = await loadSet();
    expect(glbs).toEqual(["/x/city-pack.glb"]);
    expect(set.stack?.map((m) => `${m.pack}:${m.entry.name}`)).toEqual(keys);
    expect({ pole: set.pole, lamp: set.lamp, building: set.building }).toEqual({ pole: null, lamp: null, building: null });
    for (const m of set.stack!) expect(m.root.name).toBe(m.entry.name);
    // the dressing and the whole tower are in the manifest but never loaded
    expect(set.stack!.some((m) => /Cover|FireEscape|Office_01/.test(m.entry.name))).toBe(false);
  });

  it("without stackKeys nothing extra is fetched and the set has no stack slot, so a set made today is unchanged", async () => {
    const { set, glbs } = await loadSet({ stackKeys: null });
    expect(glbs).toEqual([]);
    expect("stack" in set).toBe(false);
    expect(set).toEqual({ pole: null, lamp: null, building: null });
    const literal: ModelSet = { pole: null, lamp: null, building: null }; // an existing literal still types
    expect(literal.stack).toBeUndefined();
    expect(NO_MODELS.stack).toBeUndefined();
  });

  it("a piece whose root is missing from the GLB drops only the styles that need it", async () => {
    const { set, info } = await loadSet({ omitRoots: ["SM_Bld_Apartment_Roof_01"] });
    expect(info.some((m) => m.includes("SM_Bld_Apartment_Roof_01"))).toBe(true);
    const entries = stackEntries(set);
    expect(entries.has(keyOf("SM_Bld_Apartment_Roof_01"))).toBe(false);
    expect(entries.has(keyOf("SM_Bld_Apartment_Roof_02"))).toBe(true);
    const style = (id: string) => STACK_STYLES.find((s) => s.id === id)!;
    expect(stackRange(style("apartment-01"), "large", entries, {})).toBeNull();
    expect(stackRange(style("apartment-02"), "large", entries, {})).not.toBeNull();
    expect(stackRange(style("office-old-small"), "large", entries, {})).not.toBeNull();
  });

  it("a piece missing from the manifest is skipped with one line, and a failed GLB leaves the slot null", async () => {
    const { set, info } = await loadSet({ manifest: manifestOf(["SM_Bld_Shop_01", "SM_Bld_Shop_02"]) });
    expect(stackEntries(set).has(keyOf("SM_Bld_Shop_01"))).toBe(false);
    expect(info.filter((m) => m.includes("not in the manifest"))).toHaveLength(1);
    const failed = await loadModels({
      fetchJson: async () => MANIFEST,
      loadGlb: async () => {
        throw new Error("boom");
      },
      table: [],
      fronts: {},
      exclude: [],
      stackKeys: recipePieceKeys(),
      info: () => {},
    });
    expect(failed.stack).toBeNull();
  });

  it("with no city-pack in the manifest the slot is null and nothing else changes", async () => {
    const { set, glbs } = await loadSet({ manifest: manifestOf([], "simple-town") });
    expect(glbs).toEqual([]);
    expect(set.stack).toBeNull();
    expect({ pole: set.pole, lamp: set.lamp, building: set.building }).toEqual({ pole: null, lamp: null, building: null });
    expect(stackEntries(set).size).toBe(0);
    expect(stackRoots(set).size).toBe(0);
  });

  it("planStackPieces reads each key's front from the table and skips what the manifest lacks", () => {
    const fronts: FrontTable = { [keyOf("SM_Bld_Shop_Corner_01")]: { front: "-z", corner: true, open: "-x" } };
    const plan = planStackPieces(MANIFEST, [keyOf("SM_Bld_Shop_Corner_01"), keyOf("SM_Bld_Shop_01"), keyOf("SM_Bld_Nope_01"), "other:SM_Bld_Shop_01", "bad" as CalibrationKey], fronts)!;
    expect(plan.map((p) => p.entry.name)).toEqual(["SM_Bld_Shop_Corner_01", "SM_Bld_Shop_01"]);
    expect(plan[0]).toMatchObject({ front: "-z", corner: "-x", glb: "city-pack.glb" });
    expect(plan[1]).toMatchObject({ front: "+z", corner: false });
    expect(planStackPieces(MANIFEST, [], fronts)).toBeNull();
  });
});

describe("one placed stack is one Group (ticket 050 B)", () => {
  async function roots() {
    return stackRoots((await loadSet()).set);
  }

  it("is named stack:<style>, has one child per piece, and each child's world transform is the assembly's", async () => {
    const r = await roots();
    for (const sides of [[], ["+x"], ["-x"], ["-x", "+x"]] as StackSide[][]) {
      for (const style of STACK_STYLES) {
        const stack = assembleStack(style, { type: "large", key: "u", cornerSides: cs(...sides) }, ENTRIES, {});
        if (!stack) continue;
        const group = stackGroup(stack, r);
        expect(group.name).toBe(`stack:${style.id}`);
        expect(group.children).toHaveLength(stack.pieces.length);
        group.updateMatrixWorld(true);
        stack.pieces.forEach((p, i) => {
          const want = new Matrix4().compose(
            new Vector3(p.x * WORLD_PER_METRE, p.y * WORLD_PER_METRE, p.z * WORLD_PER_METRE),
            new Quaternion().setFromEuler(new Euler(0, p.yaw, 0)),
            new Vector3(WORLD_PER_METRE, WORLD_PER_METRE, WORLD_PER_METRE),
          );
          const got = group.children[i]!.matrixWorld.elements;
          want.elements.forEach((v, k) => expect(got[k]!, `${style.id} piece ${i} (${p.key}) element ${k}`).toBeCloseTo(v, 6));
        });
      }
    }
  });

  it("its clones share the cached roots' geometry and materials, and nothing in it can be picked", async () => {
    const r = await roots();
    const stack = assembleStack(STACK_STYLES[0]!, { type: "large", key: "u", cornerSides: cs() }, ENTRIES, {})!;
    const group = stackGroup(stack, r);
    group.updateMatrixWorld(true);
    stack.pieces.forEach((p, i) => {
      const rootMesh = r.get(p.key)!.children[0] as Mesh;
      const cloneMesh = group.children[i]!.children[0]!.children[0] as Mesh;
      expect(cloneMesh.geometry).toBe(rootMesh.geometry);
      expect(cloneMesh.material).toBe(rootMesh.material);
    });
    const hits = new Raycaster(new Vector3(0, 50, 0), new Vector3(0, -1, 0)).intersectObject(group, true);
    expect(hits).toEqual([]);
    group.traverse((o) => {
      const probe: unknown[] = [];
      expect(() => o.raycast(new Raycaster(), probe as never)).not.toThrow();
      expect(probe).toEqual([]);
    });
  });

  it("a piece whose root is missing leaves a bare wrapper: the child count still equals the assembly's, and it never throws", async () => {
    const r = new Map(await roots());
    r.delete(keyOf("SM_Bld_Apartment_Roof_01"));
    const stack = assembleStack(STACK_STYLES[0]!, { type: "large", key: "u", cornerSides: cs() }, ENTRIES, {})!;
    const group = stackGroup(stack, r);
    expect(group.children).toHaveLength(stack.pieces.length);
    expect(group.children.some((c) => c.children.length === 0)).toBe(true);
  });
});

describe("the page's flags (ticket 050 B)", () => {
  it("stacks=1 counts only alongside gallery=city-pack, and the filters name a recipe or a lot type", () => {
    expect(stackGalleryRequested("?puzzle=09-shrine-circuit&view=3d&gallery=city-pack&stacks=1")).toEqual({ style: null, type: null });
    expect(stackGalleryRequested("?stacks=1")).toBeNull();
    expect(stackGalleryRequested("?view=3d&stacks=1")).toBeNull();
    expect(stackGalleryRequested("?gallery=city-pack")).toBeNull();
    expect(stackGalleryRequested("?gallery=city-pack&stacks=0")).toBeNull();
    expect(stackGalleryRequested("?gallery=town-pack&stacks=1")).toBeNull();
    expect(stackGalleryRequested("?gallery=city-pack&stacks=1&style=apartment-02&type=tall")).toEqual({ style: "apartment-02", type: "tall" });
    expect(stackGalleryRequested("?gallery=city-pack&stacks=1&style=nope&type=huge")).toEqual({ style: null, type: null });
    // the pack gallery's own flag is untouched
    expect(galleryRequested("?gallery=city-pack&stacks=1")).toBe("city-pack");
  });
});

describe("the stack gallery's layout (ticket 050 B)", () => {
  const layout = (fronts: FrontTable = {}, extra: Parameters<typeof stackGalleryLayout>[3] = {}): GalleryLayout => stackGalleryLayout(MANIFEST, fronts, [], extra);

  it("holds every style on each lot type it serves, at its most floors, as a mid-row stack and as a corner stack at each end", () => {
    const l = layout();
    const cells = l.stacks!.cells;
    expect(cells.length).toBeGreaterThan(20);
    for (const type of LOT_TYPE_NAMES) {
      for (const style of STACK_STYLES) {
        const range = stackRange(style, type, ENTRIES, {});
        const mine = cells.filter((c) => c.shown.style.id === style.id && c.shown.type === type);
        const variants = mine.map((c) => c.shown.variant.label);
        if (!range) {
          expect(mine, `${style.id} on ${type}`).toHaveLength(0);
          continue;
        }
        expect(variants[0], `${style.id} on ${type}`).toBe("mid row");
        for (const c of mine) expect(c.shown.stack.floors, `${style.id} on ${type}`).toBe(range.max);
        const hasCorner = style.base.corner.length > 0;
        if (hasCorner) {
          // a corner variant is left out only when the recipe cannot make it on that lot type
          for (const v of STACK_VARIANTS.filter((x) => x.sides.length > 0)) {
            const can = assembleStack(style, { type, key: "k", cornerSides: cs(...v.sides) }, ENTRIES, {}) !== null;
            expect(variants.includes(v.label), `${style.id} ${v.label} on ${type}`).toBe(can);
          }
        } else expect(variants).toEqual(["mid row"]);
      }
    }
    expect(cells.some((c) => c.shown.variant.label === "corner -x")).toBe(true);
    expect(cells.some((c) => c.shown.variant.label === "corner +x")).toBe(true);
    // a corner stack really has its corner column on the side it is shown for
    for (const c of cells) expect(c.shown.stack.cornerSides).toEqual(c.shown.variant.sides);
  });

  it("no two cells, outlines or click-line cells overlap, and the click line comes after the stacks", () => {
    const l = layout();
    const cells = l.stacks!.cells;
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        expect(galleryRectsOverlap(cells[i]!.cell, cells[j]!.cell), `${i} and ${j}`).toBe(false);
        expect(galleryRectsOverlap(cells[i]!.outline, cells[j]!.outline), `${i} and ${j}`).toBe(false);
      }
      const o = cells[i]!.outline;
      const c = cells[i]!.cell;
      expect(c.cx - c.w / 2).toBeLessThanOrEqual(o.cx - o.w / 2 + 1e-9); // the cell holds the outline
      expect(c.cx + c.w / 2).toBeGreaterThanOrEqual(o.cx + o.w / 2 - 1e-9);
      expect(o.cz + o.d / 2).toBeCloseTo(0, 9); // the lot's front edge is on z = 0
      for (const s of l.slots) expect(galleryRectsOverlap(cells[i]!.cell, s.cell), `cell ${i} and a click copy`).toBe(false);
    }
    const lastStack = Math.max(...cells.map((c) => c.cell.cx + c.cell.w / 2));
    expect(Math.min(...l.slots.map((s) => s.cell.cx - s.cell.w / 2))).toBeGreaterThan(lastStack);
    for (let i = 0; i < l.slots.length; i++) for (let j = i + 1; j < l.slots.length; j++) expect(galleryRectsOverlap(l.slots[i]!.cell, l.slots[j]!.cell)).toBe(false);
  });

  it("the camera's first screen holds the first stacks, and the world holds the whole row and the click line", () => {
    const l = layout();
    const first = l.view.screens[0]!;
    const c0 = l.stacks!.cells[0]!;
    expect(first.minX).toBeLessThanOrEqual(c0.cell.cx - c0.cell.w / 2 + 1e-9);
    expect(first.maxX).toBeGreaterThanOrEqual(c0.cell.cx + c0.cell.w / 2 - 1e-9);
    expect(first.maxY).toBeGreaterThanOrEqual(c0.shown.stack.height_m * WORLD_PER_METRE);
    for (const c of l.stacks!.cells) {
      expect(l.view.world.minX).toBeLessThanOrEqual(c.cell.cx - c.cell.w / 2 + 1e-9);
      expect(l.view.world.maxY).toBeGreaterThanOrEqual(c.shown.stack.height_m * WORLD_PER_METRE);
    }
    for (const s of l.slots) expect(l.view.world.maxX).toBeGreaterThanOrEqual(s.cell.cx + s.cell.w / 2 - 1e-9);
  });

  it("is deterministic, and the filters narrow the row", () => {
    expect(layout()).toEqual(layout());
    const only = layout({}, { filter: { style: "apartment-02", type: "tall" } }).stacks!.cells;
    expect(only.length).toBeGreaterThan(0);
    for (const c of only) expect([c.shown.style.id, c.shown.type]).toEqual(["apartment-02", "tall"]);
    expect(only.length).toBeLessThan(layout().stacks!.cells.length);
  });

  it("a style whose piece has no root in the GLB is left out, as in the town", () => {
    const hasRoot = (n: string) => n !== "SM_Bld_Apartment_Roof_01";
    const cells = layout({}, { hasRoot }).stacks!.cells;
    expect(cells.some((c) => c.shown.style.id === "apartment-01")).toBe(false);
    expect(cells.some((c) => c.shown.style.id === "apartment-02")).toBe(true);
  });

  it("says why when there is nothing to show", () => {
    expect(stackGalleryLayout(null).title).toEqual(["no converted packs"]);
    expect(stackGalleryLayout(manifestOf([], "simple-town")).title[0]).toMatch(/no pack "city-pack"/);
    const none = stackGalleryLayout(MANIFEST, {}, [], { filter: { style: "office-octagon", type: "tall" } });
    expect(none.stacks!.cells).toHaveLength(0);
    expect(none.title[0]).toMatch(/no stack matches/);
    expect(() => buildGalleryScene(none, null, { surface: stubTextSurface }).dispose()).not.toThrow();
  });
});

describe("the stack gallery's click line (ticket 050 B)", () => {
  const l = stackGalleryLayout(MANIFEST, {}, []);

  it("lists exactly the recipe pieces, roofs included, four copies each", () => {
    const want = recipePieceKeys().sort();
    expect(l.groups.map((g) => g.entry.key).sort()).toEqual(want);
    expect(want).toContain(keyOf("SM_Bld_Apartment_Roof_01")); // the pack gallery's size filter leaves roofs out
    expect(want).toContain(keyOf("SM_Bld_Apartment_Roof_Corner_03"));
    expect(want.some((k) => /Cover|FireEscape|Office_01$/.test(k))).toBe(false);
    expect(l.slots).toHaveLength(want.length * GALLERY_FRONTS.length);
    const plain = galleryEntries(MANIFEST, "city-pack", {}, []).map((g) => g.entry.name);
    expect(plain).not.toContain("SM_Bld_Apartment_Roof_01");
  });

  it("a click on a copy gives the same patch as in the pack gallery", () => {
    const pack = galleryLayout(MANIFEST, "city-pack", {}, [], { only: recipePieceKeys() });
    for (const key of [keyOf("SM_Bld_Shop_01"), keyOf("SM_Bld_Apartment_Roof_02"), keyOf("SM_Bld_Shop_Corner_01")]) {
      for (const front of GALLERY_FRONTS) {
        const a = l.slots.find((s) => s.entry.key === key && s.front === front)!;
        const b = pack.slots.find((s) => s.entry.key === key && s.front === front)!;
        expect(galleryAction(a.entry, a, "click")).toEqual({ key, entry: { front } });
        expect(galleryAction(a.entry, a, "click")).toEqual(galleryAction(b.entry, b, "click"));
        expect(galleryAction(a.entry, a, "shift-click")).toEqual(galleryAction(b.entry, b, "shift-click"));
      }
    }
  });

  it("a ray at a copy of the line hits it, and one at a stack hits nothing", () => {
    const s = l.slots.find((x) => x.entry.key === keyOf("SM_Bld_Apartment_Roof_01") && x.front === "-z")!;
    const from = { x: s.outline.cx, y: 6, z: 12 };
    const dir = new Vector3(0, -6, s.outline.cz - 12).normalize();
    expect(galleryHitAt(l, from, dir)?.index).toBe(s.index);
    const c = l.stacks!.cells[0]!;
    const toStack = new Vector3(0, -6, c.outline.cz - 12).normalize();
    expect(galleryHitAt(l, { x: c.outline.cx, y: 6, z: 12 }, toStack)).toBeNull();
  });
});

describe("what the captions say (ticket 050 B)", () => {
  const style = (id: string) => STACK_STYLES.find((s) => s.id === id)!;
  const shownOne = (id: string, type: (typeof LOT_TYPE_NAMES)[number], sides: StackSide[], fronts: FrontTable) =>
    shownStacks(ENTRIES, fronts, { style: id, type }).find((s) => s.variant.sides.join() === sides.join())!;

  it("names the style, lot type, shape, floors and height against the cap", () => {
    const s = shownOne("apartment-01", "large", [], {});
    const lines = stackCaption(s, {});
    expect(lines[0]).toBe("apartment-01");
    expect(lines[1]).toBe("large: mid row");
    expect(lines[2]).toMatch(new RegExp(`^${s.stack.floors} floors, ${s.stack.bays} bays$`));
    expect(lines[3]).toMatch(/^h [\d.]+ of 16 m cap$/);
    expect(stackCaption(shownOne("office-old-small", "tall", [], {}), {})).toContain("z: centred (office)");
    expect(lines).toContain("z: back-aligned");
    expect(stackCaption(shownOne("apartment-01", "large", ["+x"], {}), {})[1]).toBe("large: corner +x");
  });

  it("lists every distinct piece the stack uses, once, with its front", () => {
    const s = shownOne("apartment-03", "large", ["-x"], {});
    const lines = stackCaption(s, {}).join("\n");
    const keys = [...new Set(s.stack.pieces.map((p) => p.key))];
    expect(keys.length).toBeGreaterThan(4);
    for (const k of keys) expect(lines, k).toContain(pieceCaption(style("apartment-03"), {}, k).split(" ")[0]);
    expect(lines).toMatch(/Roof_Corner_03/);
  });

  it("marks guess exactly where neither the code's table nor the saved file has the key", () => {
    const code: FrontTable = { [keyOf("SM_Bld_Shop_01")]: { front: "-z" } };
    const saved: CalibrationFile = {
      version: 1,
      savedAt: "2026-11-18T10:00:00.000Z",
      entries: { [keyOf("SM_Bld_Apartment_Roof_01")]: { front: "+x", at: "2026-11-18T10:00:00.000Z" } },
    } as CalibrationFile;
    const merged = effectiveFronts({ fronts: code, exclude: [] }, saved, () => {}).fronts;
    expect(frontIsGuess(merged, keyOf("SM_Bld_Shop_01"))).toBe(false);
    expect(frontIsGuess(merged, keyOf("SM_Bld_Apartment_Roof_01"))).toBe(false);
    expect(frontIsGuess(merged, keyOf("SM_Bld_Shop_02"))).toBe(true);
    expect(pieceCaption(style("apartment-01"), merged, keyOf("SM_Bld_Shop_01"))).toBe("Shop_01: -z");
    expect(pieceCaption(style("apartment-01"), merged, keyOf("SM_Bld_Apartment_Roof_01"))).toBe("Apartment_Roof_01: +x");
    expect(pieceCaption(style("apartment-01"), merged, keyOf("SM_Bld_Shop_02"))).toBe("Shop_02: +z guess");
    // over every stack: the caption's piece lines (wrapped at spaces, so joined they read whole) say guess for every key except the two the tables name
    const known = new Set<string>([keyOf("SM_Bld_Shop_01"), keyOf("SM_Bld_Apartment_Roof_01")]);
    let marked = 0;
    let unmarked = 0;
    for (const s of shownStacks(ENTRIES, merged)) {
      const text = stackCaption(s, merged).slice(5).join(" ");
      for (const k of new Set(s.stack.pieces.map((p) => p.key))) {
        const front = known.has(k) ? (k.endsWith("Shop_01") ? "-z" : "+x") : "+z";
        const mine = new RegExp(`${k.replace("city-pack:SM_Bld_", "")}: \\${front}( guess)?(, open [+-]x( guess)?)?(?= |$)`).exec(text);
        expect(mine, k).not.toBeNull();
        expect(mine![1] !== undefined, k).toBe(!known.has(k));
        if (mine![1] === undefined) unmarked++;
        else marked++;
      }
    }
    expect(marked).toBeGreaterThan(0);
    expect(unmarked).toBeGreaterThan(0);
  });

  it("a corner piece's open side says guess while it is the recipe's, and not once the table gives it", () => {
    const corner = keyOf("SM_Bld_Shop_Corner_01");
    // 063 E1: the recipe's side is the measured one ("-x"); the caption still says it is not Josh's (he has not confirmed it in the gallery).
    expect(openOf(style("apartment-01"), {}, corner)).toEqual({ side: "-x", guess: true });
    expect(pieceCaption(style("apartment-01"), {}, corner)).toBe("Shop_Corner_01: +z guess, open -x guess");
    const table: FrontTable = { [corner]: { front: "-z", corner: true, open: "+x" } };
    expect(openOf(style("apartment-01"), table, corner)).toEqual({ side: "+x", guess: false });
    expect(pieceCaption(style("apartment-01"), table, corner)).toBe("Shop_Corner_01: -z, open +x");
    // a saved front has no open: the recipe's side stands
    expect(openOf(style("apartment-01"), { [corner]: { front: "-z" } }, corner)).toEqual({ side: "-x", guess: true });
    // a non-corner piece says nothing about open
    expect(pieceCaption(style("apartment-01"), {}, keyOf("SM_Bld_Shop_01"))).not.toMatch(/open/);
  });

  it("the open the caption names is the open the assembly turns the piece by", () => {
    const corner = keyOf("SM_Bld_Apartment_Corner_01");
    for (const open of ["+x", "-x"] as const) {
      const fronts: FrontTable = { [corner]: { front: "+z", corner: true, open } };
      const stack = assembleStack(style("apartment-01"), { type: "large", key: "c", cornerSides: cs("+x") }, ENTRIES, fronts)!;
      const p = stack.pieces.find((x) => x.key === corner)!;
      expect(openOf(style("apartment-01"), fronts, corner).side).toBe(open);
      expect(p.street).toBe(open === "+x" ? "front" : "open"); // the corner stands at +x: its open side is on the road only when it is "+x"
    }
  });
});

describe("the stack gallery's scene (ticket 050 B)", () => {
  const l = stackGalleryLayout(MANIFEST, {}, []);
  const roots = stackRoots(
    ((): ModelSet => {
      const scene = fakeGlb();
      const set: ModelSet = { pole: null, lamp: null, building: null, stack: [] };
      for (const e of ENTRIES.values()) set.stack!.push({ pack: "city-pack", glb: "city-pack.glb", entry: e, front: "+z", corner: false, family: e.name, root: scene.getObjectByName(e.name)! });
      return set;
    })(),
  );
  const lookup = (name: string): Object3D | undefined => roots.get(keyOf(name));

  it("draws one stack:<style> group per stack, with one child per piece, at the lot's front-centre", () => {
    const built = buildGalleryScene(l, lookup, { surface: stubTextSurface });
    built.scene.updateMatrixWorld(true);
    expect(built.stacks).toHaveLength(l.stacks!.cells.length);
    built.stacks.forEach((g, i) => {
      const cell = l.stacks!.cells[i]!;
      expect(g.name).toBe(`stack:${cell.shown.style.id}`);
      expect(g.children).toHaveLength(cell.shown.stack.pieces.length);
      expect(g.position.x).toBeCloseTo(cell.outline.cx, 9);
      expect(g.position.z).toBe(0);
      expect(g.children.every((c) => c.children.length === 1)).toBe(true);
    });
    expect(built.models).toHaveLength(l.slots.length);
    built.dispose();
  });

  it("nothing in it can be raycast, a corner stack's lot edge is marked, and there is a caption for every stack", () => {
    const built = buildGalleryScene(l, lookup, { surface: stubTextSurface });
    built.scene.updateMatrixWorld(true);
    const hits = new Raycaster(new Vector3(0, 40, 0), new Vector3(0, -1, 0));
    for (const g of built.stacks) expect(hits.intersectObject(g, true)).toEqual([]);
    const edges: string[] = [];
    let sprites = 0;
    built.scene.traverse((o) => {
      if (o.name.startsWith("corner-side:")) edges.push(o.name);
      if (o instanceof Sprite) sprites++;
    });
    const corners = l.stacks!.cells.filter((c) => c.cornerSide !== null);
    expect(edges).toHaveLength(corners.length);
    expect(sprites).toBeGreaterThanOrEqual(l.stacks!.cells.length + l.groups.length + 2);
    built.dispose();
  });

  it("with no GLB the outlines and captions still draw, and the stacks are empty wrappers", () => {
    const built = buildGalleryScene(l, null, { surface: stubTextSurface });
    expect(built.stacks).toHaveLength(l.stacks!.cells.length);
    expect(built.stacks.every((g) => g.children.every((c) => c.children.length === 0))).toBe(true);
    expect(() => built.dispose()).not.toThrow();
  });

  it("the pack gallery's scene has no stacks", () => {
    const pack = galleryLayout(MANIFEST, "city-pack", {}, []);
    expect(pack.stacks).toBeUndefined();
    expect(buildGalleryScene(pack, null, { surface: stubTextSurface }).stacks).toEqual([]);
  });
});

describe("what a screenshot of the stack gallery has to show (pure checks on the layout)", () => {
  const style = (id: string) => STACK_STYLES.find((s) => s.id === id)!;

  it("every shown stack has no gap: each storey stands on the top of the one under it, and each column has a roof", () => {
    for (const s of shownStacks(ENTRIES, {})) {
      const { stack } = s;
      for (let i = 0; i < stack.columns.length; i++) {
        const col = stack.pieces.filter((p) => p.column === i);
        const roofs = col.filter((p) => p.role === "roof");
        expect(roofs, `${s.style.id} ${s.type} ${s.variant.label}`).toHaveLength(1);
        let y = s.style.pitch_m.base;
        for (const f of col.filter((p) => p.role === "floor").sort((a, b) => a.y - b.y)) {
          expect(f.y).toBeCloseTo(y, 6);
          y += (/_Stack_/.test(f.key) ? 3 : 1) * s.style.pitch_m.floor;
        }
        expect(roofs[0]!.y).toBeCloseTo(y, 6);
      }
    }
  });

  it("every shown stack's ground row is shops (or one residents' door) and its street side is +z, with corner pieces at the ends only", () => {
    for (const s of shownStacks(ENTRIES, {})) {
      const base = s.stack.pieces.filter((p) => p.role === "base");
      expect(base.length).toBeGreaterThan(0);
      for (const p of base) expect(p.y).toBe(0);
      const corner = s.stack.columns.map((c) => c.corner);
      expect(corner.filter((c) => c !== null)).toEqual(s.variant.sides);
      if (s.style.depth === "bay") for (const p of base) expect(/_Shop_|_Door_/.test(p.key)).toBe(true);
    }
  });

  it("a corner stack's second street face is on the lot side it is shown for, at both ends, under the table's open", () => {
    const corner = keyOf("SM_Bld_Apartment_Corner_01");
    for (const open of ["+x", "-x"] as const) {
      const fronts: FrontTable = { [corner]: { front: "+z", corner: true, open } };
      for (const side of ["-x", "+x"] as StackSide[]) {
        const s = shownStacks(ENTRIES, fronts, { style: "apartment-01", type: "large" }).find((x) => x.variant.sides[0] === side)!;
        const p = s.stack.pieces.find((x) => x.key === corner)!;
        // its road-facing face is the front when open is the lot's corner side, else its open side after a quarter turn
        expect(p.street).toBe(open === side ? "front" : "open");
        expect(Math.abs(Math.sin(p.yaw)) > 0.5).toBe(open !== side);
      }
    }
    expect(style("apartment-01").open?.[corner]).toBe("-x"); // measured, 063 E1
  });
});

// The real manifest is gitignored and only on the machine that converted the packs: this runs there and skips elsewhere (CI, a fresh checkout).
const REAL = "assets/private/out/manifest.json";
describe.skipIf(!existsSync(REAL))("against the real manifest (ticket 050 B)", () => {
  // skipIf still runs this callback while collecting, so the file is read only inside a test, never here.
  it("the fixture's numbers agree with it, and the stack gallery lays out without overlap", () => {
    const real = JSON.parse(readFileSync(REAL, "utf8")) as AssetManifest;
    if (real.version !== ASSET_MANIFEST_VERSION || !real.packs.some((p) => p.pack === "city-pack")) return;
    const pack = real.packs.find((p) => p.pack === "city-pack")!;
    for (const [name, w, h, d] of SIZES.slice(0, 34)) {
      const e = pack.assets.find((a) => a.name === name);
      expect(e, name).toBeDefined();
      const b = e!.bounds;
      expect(b.max[0] - b.min[0], `${name} width`).toBeCloseTo(w, 1);
      expect(b.max[1] - b.min[1], `${name} height`).toBeCloseTo(h, 1);
      expect(b.max[2] - b.min[2], `${name} depth`).toBeCloseTo(d, 1);
    }
    const l = stackGalleryLayout(real, {}, []);
    const cells = l.stacks!.cells;
    expect(cells.length).toBeGreaterThan(20);
    for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) expect(galleryRectsOverlap(cells[i]!.cell, cells[j]!.cell)).toBe(false);
    console.info(`stack gallery: ${cells.length} stacks, ${l.groups.length} click-line models, ${(l.view.world.maxX - l.view.world.minX).toFixed(0)} units long`);
  });
});
