/** Ticket 042 A: the fronts overlay (debug only). No WebGL. */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Box3, Group, Object3D, Raycaster, Sprite, Vector3 } from "three";
import { ASSET_MANIFEST_VERSION, loadPuzzle, type AssetEntry, type AssetManifest } from "../core";
import { FRONT_ARROW_LENGTH, declaredFrontDirection, frontCaption, frontsOverlay, frontsRequested } from "./debug3d";
import { BUILDING_FRONTS, MODEL_TABLE, frontAxis, planModels, type FrontTable } from "./models";
import { applyModels, type LoadedModel, type ModelSet } from "./models3d";
import type { SceneBundle } from "./scene";
import { townLayout } from "./town";
import { LOT_TYPE_NAMES, type LotType } from "./kitunits";
import { stubTextSurface } from "./text";

const puzzle = loadPuzzle(JSON.parse(readFileSync("puzzles/09-shrine-circuit.json", "utf8")));

function entry(name: string, w: number, h: number, d: number, triangles: number): AssetEntry {
  return { name, source: `${name}.fbx`, bounds: { min: [-w / 2, 0, -d / 2], max: [w / 2, h, d / 2] }, triangles, textures: [], missingTextures: [], warnings: [] };
}
const MANIFEST: AssetManifest = {
  version: ASSET_MANIFEST_VERSION,
  generatedAt: "2026-01-01T00:00:00Z",
  blenderVersion: "5.0.0",
  packs: [
    {
      pack: "simple-town",
      glb: "simple-town.glb",
      atlas: null,
      failures: [],
      assets: [
        entry("Building_Shop_01", 10.5, 11.4, 10.2, 278),
        entry("Building_Shop_02", 10.5, 11.4, 10.2, 278),
        entry("Building_Gym", 10.5, 11.4, 12, 386),
        entry("Building_BaberShop", 10.4, 11.3, 10.9, 600),
        entry("store_small_mesh", 11.6, 6.7, 8.4, 218),
        entry("apartment_small_mesh", 11.6, 12, 11.8, 690),
        entry("house_mesh", 11.8, 8.5, 13.4, 478),
        entry("Building_House_01", 10.6, 14.5, 18.5, 788),
        entry("Building_Garage_01", 12.4, 11.6, 14.7, 464),
        entry("office_small_mesh", 13.6, 12.8, 15.2, 460),
        entry("Building_House_09", 14.2, 10.1, 16.1, 834),
        entry("Building_AutoRepair", 21.5, 10.7, 10.8, 1618),
        entry("Building_StripClub", 21, 7.9, 15.9, 1800),
        entry("Building_PoliceStation", 24.3, 9.9, 15, 1866),
        entry("Building_PetrolStation", 22.5, 9.4, 27.8, 804),
        entry("Building_House_05", 19.6, 16, 25.7, 2244),
        entry("apartment_large_mesh", 11.6, 16.7, 11.8, 930),
        entry("office_medium_mesh", 13.6, 20, 15.2, 620),
        entry("office_large_mesh", 13.6, 27.2, 15.2, 780),
      ],
    },
  ],
};

function set(fronts: FrontTable): ModelSet {
  const plan = planModels(MANIFEST, MODEL_TABLE, fronts);
  const building: LoadedModel[] = (plan.building ?? []).map((p) => ({ ...p, root: new Group() }));
  return { pole: null, lamp: null, building };
}
function standIn(): SceneBundle {
  // 051 D: the lots a model stands on (a terrace lot is stood by its run's packed stacks).
  const lots = townLayout(puzzle).lots.filter((l) => l.terrace === undefined);
  const byType = Object.fromEntries(LOT_TYPE_NAMES.map((t) => [t, new Group()])) as Record<LotType, Group>;
  return { slots: { poles: { spots: [], placeholders: [] }, lamps: [], blocks: { list: lots, placeholder: new Group(), byType }, models: new Group() } } as unknown as SceneBundle;
}

describe("frontsRequested", () => {
  it("is true only for fronts=1 in the query string", () => {
    expect(frontsRequested("?fronts=1")).toBe(true);
    expect(frontsRequested("?puzzle=56-whole-ward&view=3d&fronts=1")).toBe(true);
    expect(frontsRequested("")).toBe(false);
    expect(frontsRequested("?view=3d")).toBe(false);
    expect(frontsRequested("?fronts=0")).toBe(false);
    expect(frontsRequested("?fronts=true")).toBe(false);
  });

  it("is read in renderer.ts only: no other source file of the 3D view touches location.search", () => {
    const files = readdirSync("src/render3d").filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    for (const f of files) {
      const text = readFileSync(join("src/render3d", f), "utf8");
      expect(/location\.search/.test(text), f).toBe(f === "renderer.ts");
    }
  });

  it("is off in the renderer unless asked for: the overlay is only built when the page's query string says fronts=1", () => {
    const text = readFileSync("src/render3d/renderer.ts", "utf8");
    expect(text).toMatch(/frontsRequested\(location\.search\)/);
    expect(text).toMatch(/wantFronts && applied\.buildings\.length > 0/);
  });
});

describe("frontsOverlay", () => {
  it("has one red arrow and one caption per building clone, the caption naming the model", () => {
    const bundle = standIn();
    const applied = applyModels(bundle, set(BUILDING_FRONTS));
    expect(applied.buildings.length).toBeGreaterThan(10);
    const overlay = frontsOverlay(bundle, applied, { surface: stubTextSurface });
    const sprites: Sprite[] = [];
    overlay.traverse((o) => {
      if (o instanceof Sprite) sprites.push(o);
    });
    expect(sprites).toHaveLength(applied.buildings.length);
    expect(overlay.children).toHaveLength(applied.buildings.length * 2);
    sprites.forEach((s, i) => expect((s.userData["text"] as string).split("\n")[0], String(i)).toBe(applied.buildings[i]!.model.entry.name));
    overlay.dispose();
  });

  it("points each arrow along its model's declared front, turned by the clone's yaw, and with the table right that is toward the road", () => {
    const bundle = standIn();
    const lots = bundle.slots.blocks.list;
    for (const fronts of [BUILDING_FRONTS, { "simple-town:Building_Gym": { front: "-x" as const }, "simple-town:house_mesh": { front: "-z" as const } }]) {
      const applied = applyModels(bundle, set(fronts));
      const overlay = frontsOverlay(bundle, applied, { surface: stubTextSurface });
      const arrows = overlay.children.filter((o) => !(o instanceof Sprite));
      arrows.forEach((a, i) => {
        const p = applied.buildings[i]!;
        const lot = lots[p.lot]!;
        const [dx, dz] = declaredFrontDirection(p.model.front, p.yaw);
        const dir = new Vector3(0, 1, 0).applyQuaternion(a.quaternion);
        expect(dir.x).toBeCloseTo(dx, 6);
        expect(dir.z).toBeCloseTo(dz, 6);
        expect(a.position.x).toBeCloseTo(p.x, 9);
        expect(a.position.z).toBeCloseTo(p.z, 9);
        // Declared right (+z everywhere): the arrow is the lot's own front, toward its road. Declared otherwise: it is that axis turned, which is
        // toward the road only because the clone is turned to match.
        const [ax, az] = frontAxis(p.model.front);
        expect(Math.hypot(ax, az)).toBeCloseTo(1, 9);
        expect(dx).toBeCloseTo(Math.sin(lot.yaw), 6);
        expect(dz).toBeCloseTo(Math.cos(lot.yaw), 6);
      });
      overlay.dispose();
      applied.remove();
    }
  });

  it("is red, sits over the roof, and cannot be picked: a ray through it hits nothing", () => {
    const bundle = standIn();
    const applied = applyModels(bundle, set(BUILDING_FRONTS));
    const overlay = frontsOverlay(bundle, applied, { surface: stubTextSurface });
    overlay.updateMatrixWorld(true);
    const p = applied.buildings[0]!;
    const arrow = overlay.children.find((o) => !(o instanceof Sprite))!;
    expect(new Box3().setFromObject(arrow).min.y).toBeGreaterThan(0.5);
    const ray = new Raycaster(new Vector3(p.x, 20, p.z), new Vector3(0, -1, 0));
    expect(ray.intersectObject(overlay, true)).toEqual([]);
    const hits: Object3D[] = [];
    overlay.traverse((o) => {
      const ray2 = new Raycaster(new Vector3(0, 20, 0), new Vector3(0, -1, 0));
      if (ray2.intersectObject(o, false).length > 0) hits.push(o);
    });
    expect(hits).toEqual([]);
    expect(FRONT_ARROW_LENGTH).toBeGreaterThan(0);
    overlay.dispose();
  });

  it("sets the caption's size from the viewport and never throws on dispose", () => {
    const bundle = standIn();
    const applied = applyModels(bundle, set(BUILDING_FRONTS));
    const overlay = frontsOverlay(bundle, applied, { surface: stubTextSurface });
    const sprite = overlay.children.find((o) => o instanceof Sprite) as Sprite;
    overlay.setViewport(800, 600, 40);
    const a = sprite.scale.y;
    overlay.setViewport(800, 1200, 40);
    expect(sprite.scale.y).toBeLessThan(a);
    overlay.dispose();
    overlay.dispose();
  });

  it("an overlay with no buildings is empty", () => {
    const bundle = standIn();
    const applied = applyModels(bundle, { pole: null, lamp: null, building: null });
    expect(applied.buildings).toEqual([]);
    expect(frontsOverlay(bundle, applied, { surface: stubTextSurface }).children).toHaveLength(0);
  });

  it("captions the model's name, which model it is a copy of, a corner lot with its cross street's side, and a corner model's second face", () => {
    expect(frontCaption("Building_Shop_04", "Building_Shop_03", [])).toEqual(["Building_Shop_04", "same mesh as Building_Shop_03"]);
    expect(frontCaption("Building_Gym", "Building_Gym", [{ side: "+x", road: "r" }])).toEqual(["Building_Gym", "corner lot, cross street on +x"]);
    expect(frontCaption("house_mesh", "house_mesh", [])).toEqual(["house_mesh"]);
    expect(frontCaption("store_corner_mesh", "store_corner_mesh", [{ side: "-x", road: "a" }, { side: "-x", road: "b" }], "-x")).toEqual([
      "store_corner_mesh",
      "corner lot, cross street on -x",
      "second face on -x",
    ]);
    expect(frontCaption("x", "x", [{ side: "+x", road: "a" }, { side: "-x", road: "b" }])).toEqual(["x", "corner lot, cross street on +x and -x"]);
  });
});
