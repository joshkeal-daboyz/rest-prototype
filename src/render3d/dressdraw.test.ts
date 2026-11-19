/**
 * Ticket 052 B: drawing the City Pack dressing. `loadModels` loads the dressing keys into `ModelSet.dress`; `applyModels` stands every block's `dressTown` pieces as InstancedMeshes
 * (one per key and sub-mesh) in a group of their own; the stack gallery shows the same with `&dress=1`. No WebGL: the GLBs are fake groups (a one-box mesh per dressing key, an empty
 * node per stack piece) and every size is typed in as a number copied from the converted City Pack manifest (18 Nov 2026). Nothing here reads assets/private/, no timer, no path.
 * The maps are the repo's own puzzles.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BoxGeometry, DoubleSide, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Raycaster, Vector3, type Material, type Object3D } from "three";
import { ASSET_MANIFEST_VERSION, loadPuzzle, type AssetEntry, type AssetManifest, type CalibrationKey, type Puzzle } from "../core";
import { createCameraRig } from "./camera";
import { DRESS_DRAW_CALLS_MAX, KERB_FROM_FRONT_M, NOVELTY_SIGNS, dressKeys } from "./dressing";
import { NODE_BODY_Y, wireLayout } from "./layout";
import { WORLD_PER_METRE } from "./models";
import { NO_MODELS, allStackKeys, applyModels, dressGroup, dressInput, dressMatrix, dressPlacements, dressSites, loadModels, partMatrix, type DressPlacement, type ModelSet } from "./models3d";
import { CODE_ESCAPE_KEY, ESCAPE_FIRST, ESCAPE_MID } from "./escapes";
import { buildScene } from "./scene";
import { dressRequested, buildGalleryScene, stackGalleryLayout } from "./gallery";
import { stubTextSurface } from "./text";

// ---- fixture: [name, width, height, depth] in metres, centred bounds ----
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
  // dressing
  ["SM_Bld_Cover_01", 4.832, 1.075, 1.0],
  ["SM_Bld_Cover_02", 1.366, 0.974, 0.701],
  ["SM_Bld_FireEscape_01", 3.251, 1.492, 1.644],
  ["SM_Bld_FireEscape_02", 3.251, 3.609, 1.644],
  ["SM_Bld_FireEscape_03", 4.252, 3.802, 1.76],
  ["SM_Bld_Roof_Access_01", 2.758, 2.744, 2.851],
  ["SM_Bld_Shop_01_Glass", 4.891, 1.863, 0.323],
  ["SM_Bld_Shop_02_Glass", 4.311, 2.513, 0],
  ["SM_Bld_Shop_03_Glass", 8.738, 2.211, 0.293],
  ["SM_Bld_Shop_04_Glass", 4.765, 2.442, 0.705],
  ["SM_Bld_Shop_05_Glass", 4.817, 2.017, 0.054],
  ["SM_Bld_Shop_Corner_01_Glass", 4.809, 1.698, 4.787],
  ["SM_Bld_Shop_Corner_02_Glass", 4.729, 2.189, 4.729],
  ["SM_Bld_Shop_Cover_01", 4.574, 0.297, 2.815],
  ["SM_Bld_Shop_Cover_02", 4.706, 1.202, 3.235],
  ["SM_Bld_Shop_Cover_03", 5.0, 1.758, 3.501],
  ["SM_Bld_Shop_Cover_04", 5.104, 0.663, 0.732],
  ["SM_Bld_Shop_Cover_05", 5.394, 0.682, 5.394],
  ["SM_Prop_ATM_01", 1.128, 1.537, 0.519],
  ["SM_Prop_Aircon_01", 0.823, 0.995, 0.651],
  ["SM_Prop_Billboard_Roof_01", 4.428, 3.063, 1.611],
  ...(["01", "02", "03", "04", "05", "06", "07"].map((n) => [`SM_Prop_Billboard_Sign_${n}`, 4.193, 2.028, 0.118]) as [string, number, number, number][]),
  ["SM_Prop_LargeSign_Beer_01", 2.005, 3.333, 2.019],
  ["SM_Prop_LargeSign_Bottle_01", 1.8, 5.818, 1.8],
  ["SM_Prop_LargeSign_BowlingBall_01", 3.019, 3.174, 3.174],
  ["SM_Prop_LargeSign_BowlingPin_01", 1.631, 5.156, 1.631],
  ["SM_Prop_LargeSign_Burger_01", 3.715, 2.178, 3.717],
  ["SM_Prop_LargeSign_Coffee_01", 2.194, 1.346, 1.625],
  ["SM_Prop_LargeSign_Donut_01", 3.818, 1.355, 3.818],
  ["SM_Prop_LargeSign_Guitar_01", 2.098, 6.378, 0.377],
  ["SM_Prop_LargeSign_Hotdog_01", 1.411, 1.143, 3.926],
  ["SM_Prop_LargeSign_Icecream_01", 1.93, 5.04, 1.93],
  ["SM_Prop_LargeSign_Lollypop_01", 3.365, 6.36, 0.512],
  ["SM_Prop_LargeSign_Milkshake_01", 2.238, 4.699, 1.721],
  ["SM_Prop_LargeSign_Noodles_01", 2.948, 3.601, 2.515],
  ["SM_Prop_LargeSign_Pizza_01", 3.368, 0.562, 2.957],
  ["SM_Prop_LargeSign_Popcorn_01", 1.737, 2.797, 1.737],
  ["SM_Prop_LargeSign_Soda_01", 1.915, 5.595, 1.915],
  ["SM_Prop_LargeSign_Taco_01", 1.215, 2.223, 3.701],
  ["SM_Prop_PlanterWindow_01", 0.988, 0.743, 0.37],
  ["SM_Prop_PlanterWindow_02", 0.87, 0.743, 0.332],
  ["SM_Prop_Roof_Aircon_01", 0.948, 0.592, 0.467],
  ["SM_Prop_Roof_Aircon_02", 1.586, 1.073, 0.798],
  ["SM_Prop_Roof_Aircon_03", 1.546, 1.05, 1.0],
  ["SM_Prop_SatDish_01", 1.21, 1.344, 0.682],
  ["SM_Prop_Sign_Bar_01", 1.327, 0.673, 0.138],
  ["SM_Prop_Sign_Barber_01", 0.316, 0.948, 0.474],
  ["SM_Prop_Sign_Cafe_01", 1.347, 0.553, 0.11],
  ["SM_Prop_Sign_Chinese_Noodles_01", 0.853, 0.507, 0.179],
  ["SM_Prop_Sign_DeliPizza_01", 0.301, 1.551, 0.14],
  ["SM_Prop_Sign_Entrance_01", 1.0, 0.436, 0.063],
  ["SM_Prop_Sign_Hotel_01", 1.267, 3.801, 0.3],
  ["SM_Prop_Sign_Pizza_01", 2.211, 0.704, 0.144],
  ["SM_Prop_Sign_Pub_01", 1.13, 0.547, 0.112],
  ["SM_Prop_Vents_Exhaust_01", 0.868, 1.63, 2.727],
  ["SM_Prop_Vents_Straight_01", 0.868, 0.803, 2.5],
  ["SM_Prop_Water_Tower_01", 2.42, 5.509, 2.419],
];
const entryOf = ([name, w, h, d]: [string, number, number, number], i: number): AssetEntry => ({
  name,
  source: `${name}.fbx`,
  bounds: { min: [-w / 2, 0, -d / 2], max: [w / 2, h, d / 2] },
  triangles: 100 + i,
  textures: [],
  missingTextures: [],
  warnings: [],
});
const manifestOf = (assets: AssetEntry[], pack = "city-pack"): AssetManifest => ({
  version: ASSET_MANIFEST_VERSION,
  generatedAt: "2026-01-01T00:00:00Z",
  blenderVersion: "5.0.0",
  packs: [{ pack, glb: `${pack}.glb`, atlas: null, assets, failures: [] }],
});

const DRESS_NAMES: ReadonlySet<string> = new Set(dressKeys().map((k) => k.slice("city-pack:".length)));
/** A dressing key whose model is two sub-meshes, the second offset in its root; one whose material carries emission (it must not light); one whose GLB node is absent. */
const TWO = "SM_Prop_Roof_Aircon_01";
const LIT = "SM_Prop_Sign_Pizza_01";
const OFFSET = new Matrix4().makeTranslation(1, 2, 3);

const BOX = new BoxGeometry(1, 1, 1);
const PLAIN = new MeshStandardMaterial({ color: 0x888888 });
const GLOWING = new MeshStandardMaterial({ color: 0x888888, emissive: 0xffffff, emissiveIntensity: 1 });

/** A GLB's scene: an empty node per stack piece, a one-box mesh node per dressing key (two meshes for `TWO`), less the names in `lack`. */
function glbOf(manifest: AssetManifest, lack: readonly string[] = []): Group {
  const g = new Group();
  for (const e of manifest.packs[0]?.assets ?? []) {
    if (lack.includes(e.name)) continue;
    const n = new Group();
    n.name = e.name;
    if (DRESS_NAMES.has(e.name)) {
      n.add(new Mesh(BOX, e.name === LIT ? GLOWING : PLAIN));
      if (e.name === TWO) {
        const m2 = new Mesh(BOX, PLAIN);
        m2.applyMatrix4(OFFSET);
        n.add(m2);
      }
    }
    g.add(n);
  }
  return g;
}

async function setOf(manifest: AssetManifest, opts: { dress?: boolean; lack?: readonly string[] } = {}): Promise<ModelSet> {
  return loadModels({
    fetchJson: async (): Promise<unknown> => manifest,
    loadGlb: async () => glbOf(manifest, opts.lack),
    stackKeys: allStackKeys(),
    ...(opts.dress === false ? {} : { dressKeys: dressKeys() }),
    info: () => {},
  });
}

const ALL = SIZES.map(entryOf);
const SET = await setOf(manifestOf(ALL));
const SET_NO_DRESS_ASKED = await setOf(manifestOf(ALL), { dress: false });
const SET_NO_PIZZA = await setOf(manifestOf(ALL.filter((e) => e.name !== LIT)));
const SET_NO_CITY = await setOf(manifestOf(ALL, "town-pack"));

const W = WORLD_PER_METRE;
const loadMap = (file: string): Puzzle => loadPuzzle(JSON.parse(readFileSync(join("puzzles", `${file}.json`), "utf8")));
const MAPS = ["01-first-light", "09-shrine-circuit", "64-the-whole-chain"];

const dressGroupOf = (bundle: { scene: Object3D }): Object3D | undefined => bundle.scene.getObjectByName("city-dressing");
const instanced = (g: Object3D): InstancedMesh[] => g.children.filter((c): c is InstancedMesh => c instanceof InstancedMesh);
const pickTargets = (scene: Object3D): string[] => {
  const out: string[] = [];
  scene.traverse((o) => {
    if (o.userData["pickKind"] !== undefined) out.push(`${String(o.userData["pickKind"])}|${String(o.userData["pickId"])}|${o.matrixWorld.elements.join(",")}`);
  });
  return out;
};

describe("loadModels puts the dressing keys in ModelSet.dress", () => {
  it("loads every key the manifest and its GLB have, in dressKeys order, and offers them to the placer with their entries and roots", () => {
    expect(SET.dress).not.toBeNull();
    expect(SET.dress!.map((m) => `${m.pack}:${m.entry.name}`)).toEqual(dressKeys());
    const input = dressInput(SET)!;
    expect([...input.entries.keys()]).toEqual(dressKeys());
    expect([...input.roots.keys()]).toEqual(dressKeys());
    expect(input.roots.get(`city-pack:${LIT}`)!.name).toBe(LIT);
    // A flat pane (a shop's glass is 0.00 m deep in the pack) loads, though a building of no depth would not.
    expect(input.entries.get("city-pack:SM_Bld_Shop_02_Glass")!.bounds.max[2]).toBe(0);
    expect(input.fronts).toEqual({});
  });

  it("leaves the slot absent when the dressing was not asked for, and null when it was asked for and the manifest has no City Pack", () => {
    expect(SET_NO_DRESS_ASKED.dress).toBeUndefined();
    expect(dressInput(SET_NO_DRESS_ASKED)).toBeNull();
    expect(SET_NO_CITY.dress).toBeNull();
    expect(dressInput(SET_NO_CITY)).toBeNull();
    expect(NO_MODELS.dress).toBeUndefined();
  });

  it("drops only the missing key: a key absent from the manifest, or whose node is absent from the GLB, is skipped and every other key loads", async () => {
    const names = SET_NO_PIZZA.dress!.map((m) => m.entry.name);
    expect(names).not.toContain(LIT);
    expect(names).toHaveLength(dressKeys().length - 1);
    const noNode = await setOf(manifestOf(ALL), { lack: [TWO] });
    expect(noNode.dress!.map((m) => m.entry.name)).not.toContain(TWO);
    expect(noNode.dress).toHaveLength(dressKeys().length - 1);
    // The placer never uses the missing key and still dresses the town with the rest.
    const bundle = buildScene(loadMap("64-the-whole-chain"), { text: stubTextSurface });
    const applied = applyModels(bundle, SET_NO_PIZZA);
    expect(applied.dress.length).toBeGreaterThan(50);
    expect(applied.dress.some((p) => p.piece.key === `city-pack:${LIT}`)).toBe(false);
    expect(applied.dress.some((p) => p.piece.slot === "sign" && p.piece.key !== `city-pack:${LIT}`)).toBe(true);
    applied.remove();
    bundle.dispose();
  });
});

describe("applyModels draws the dressing as instanced meshes at the pure placements", () => {
  for (const file of MAPS) {
    it(`on ${file}: every instance's world matrix is dressMatrix(frame, piece) within 1e-6, and the position is the frame turned and the piece's metres at WORLD_PER_METRE`, () => {
      const bundle = buildScene(loadMap(file), { text: stubTextSurface });
      const applied = applyModels(bundle, SET);
      const group = dressGroupOf(bundle)!;
      expect(group, file).toBeDefined();
      expect(group.name).toBe("city-dressing");
      expect(applied.dress.length, file).toBeGreaterThan(file === "01-first-light" ? 20 : 100);
      // One mesh per key (two for TWO); the instances of a key are its placements in order.
      const meshesOf = new Map<string, InstancedMesh[]>();
      for (const im of instanced(group)) meshesOf.set(im.name, [...(meshesOf.get(im.name) ?? []), im]);
      const used = new Map<string, DressPlacement[]>();
      for (const p of applied.dress) used.set(p.piece.key, [...(used.get(p.piece.key) ?? []), p]);
      expect(meshesOf.size, "one name per key that has a placement").toBe(used.size);
      const m = new Matrix4();
      const want = new Matrix4();
      let checked = 0;
      for (const [key, list] of used) {
        const name = key.slice("city-pack:".length);
        const meshes = meshesOf.get(`dress:${name}`)!;
        expect(meshes, name).toHaveLength(name === TWO ? 2 : 1);
        meshes.forEach((im, k) => {
          expect(im.count, name).toBe(list.length);
          list.forEach((p, i) => {
            im.getMatrixAt(i, m);
            want.copy(dressMatrix(p.frame, p.piece));
            if (k === 1) want.multiply(OFFSET);
            // An instance matrix is stored as a float32, so the double result is compared as that float32 (never more than 1e-6 off it).
            for (let e = 0; e < 16; e++) expect(Math.abs(m.elements[e]! - Math.fround(want.elements[e]!)), `${name} #${i} element ${e}`).toBeLessThan(1e-6);
            if (k === 0) {
              // The same position and turn, worked out without the matrix helper (a float32 holds about 7 digits, so the bound is relative).
              const near = (got: number, exact: number): void => expect(Math.abs(got - exact), name).toBeLessThan(1e-6 * Math.max(1, Math.abs(exact)));
              const c = Math.cos(p.frame.yaw);
              const s = Math.sin(p.frame.yaw);
              const lx = p.piece.x * W;
              const lz = p.piece.z * W;
              near(m.elements[12]!, p.frame.x + lx * c + lz * s);
              near(m.elements[13]!, p.piece.y * W);
              near(m.elements[14]!, p.frame.z - lx * s + lz * c);
              near(new Vector3().setFromMatrixScale(m).x, W);
              checked++;
            }
          });
        });
      }
      expect(checked, file).toBe(applied.dress.length);
      applied.remove();
      bundle.dispose();
    });
  }

  it("adds at most DRESS_DRAW_CALLS_MAX draw calls on 64-the-whole-chain, and every InstancedMesh is counted", () => {
    const bundle = buildScene(loadMap("64-the-whole-chain"), { text: stubTextSurface });
    const applied = applyModels(bundle, SET);
    const group = dressGroupOf(bundle)!;
    expect(instanced(group).length).toBe(applied.dressCalls);
    expect(group.children.length).toBe(applied.dressCalls);
    expect(applied.dressCalls).toBeGreaterThan(10);
    expect(applied.dressCalls).toBeLessThanOrEqual(DRESS_DRAW_CALLS_MAX);
    applied.remove();
    bundle.dispose();
  });

  it("leaves out the keys with the fewest instances first when there are more meshes than the cap", () => {
    const bundle = buildScene(loadMap("64-the-whole-chain"), { text: stubTextSurface });
    const applied = applyModels(bundle, SET);
    const input = dressInput(SET)!;
    const full = dressGroup(applied.dress, input.roots);
    const small = dressGroup(applied.dress, input.roots, 6);
    expect(small.calls).toBeLessThanOrEqual(6);
    expect(small.calls).toBeGreaterThan(0);
    const kept = new Set(small.group.children.map((c) => c.name));
    const count = (n: string): number => full.group.children.filter((c) => c.name === n).map((c) => (c as InstancedMesh).count).reduce((a, b) => a + b, 0) / Math.max(1, full.group.children.filter((c) => c.name === n).length);
    const smallestKept = Math.min(...[...kept].map(count));
    const biggestLeft = Math.max(0, ...full.group.children.map((c) => c.name).filter((n) => !kept.has(n)).map(count));
    expect(smallestKept).toBeGreaterThanOrEqual(biggestLeft);
    full.dispose();
    small.dispose();
    applied.remove();
    bundle.dispose();
  });

  it("takes no ray and glows with nothing: every dressing object's raycast is a no-op, a ray from above hits none, and no material is emissive", () => {
    for (const file of MAPS) {
      const bundle = buildScene(loadMap(file), { text: stubTextSurface });
      const applied = applyModels(bundle, SET);
      const group = dressGroupOf(bundle)!;
      expect(group.userData["sharedModel"], "not disposed with the scene").toBe(true);
      expect(group.parent, "a sibling of the lots' models and the terrace row").toBe(bundle.scene);
      const caster = new Raycaster();
      const probe = new Vector3();
      const first = new Matrix4();
      let fired = 0;
      let materials = 0;
      group.traverse((o) => {
        expect(o.raycast, `${file} ${o.name}`).not.toBe(Mesh.prototype.raycast);
        expect(o.raycast, `${file} ${o.name}`).not.toBe(InstancedMesh.prototype.raycast);
        const mesh = o as InstancedMesh;
        if (!mesh.isInstancedMesh) return;
        for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          const std = mat as MeshStandardMaterial;
          expect(std.emissive.getHex(), `${file} ${o.name} emissive`).toBe(0);
          expect(std.emissiveMap ?? null, `${file} ${o.name} emissiveMap`).toBeNull();
          materials++;
        }
        mesh.getMatrixAt(0, first);
        probe.setFromMatrixPosition(first);
        caster.set(new Vector3(probe.x, probe.y + 30, probe.z), new Vector3(0, -1, 0));
        expect(caster.intersectObject(o, false), `${file} ${o.name}`).toHaveLength(0);
        fired++;
      });
      expect(fired, file).toBeGreaterThan(5);
      expect(materials, file).toBeGreaterThan(5);
      applied.remove();
      bundle.dispose();
    }
  });

  it("swaps a material that carries emission for a dark clone, leaves the cached material alone, and gives every shop glass one shared dark see-through material", () => {
    const bundle = buildScene(loadMap("64-the-whole-chain"), { text: stubTextSurface });
    const applied = applyModels(bundle, SET);
    const group = dressGroupOf(bundle)!;
    const lit = instanced(group).filter((im) => im.name === `dress:${LIT}`);
    expect(lit.length, "the glowing fixture sign is placed on this map").toBe(1);
    expect(lit[0]!.material).not.toBe(GLOWING);
    expect((lit[0]!.material as MeshStandardMaterial).emissive.getHex()).toBe(0);
    expect(GLOWING.emissive.getHex(), "the cached model's own material is untouched").toBe(0xffffff);
    const glassMats = new Set(instanced(group).filter((im) => /_Glass$/.test(im.name)).map((im) => im.material as Material));
    expect(glassMats.size, "one shared glass material").toBe(1);
    const glass = [...glassMats][0] as MeshStandardMaterial;
    expect(glass.transparent).toBe(true);
    expect(glass.opacity).toBeLessThan(1);
    expect(glass.emissive.getHex()).toBe(0);
    expect(glass.side).toBe(DoubleSide);
    // An ordinary dressing key keeps the cached root's own material and geometry.
    const aircon = instanced(group).find((im) => im.name === "dress:SM_Prop_Roof_Aircon_02");
    if (aircon) expect(aircon.material).toBe(PLAIN);
    applied.remove();
    bundle.dispose();
  });

  it("remove() takes the group away and frees only what the dressing made (the glass and swapped materials), never the cached model's geometry or material", () => {
    const bundle = buildScene(loadMap("09-shrine-circuit"), { text: stubTextSurface });
    const kids = bundle.scene.children.length;
    let geometryDisposed = 0;
    let plainDisposed = 0;
    BOX.addEventListener("dispose", () => geometryDisposed++);
    PLAIN.addEventListener("dispose", () => plainDisposed++);
    const applied = applyModels(bundle, SET);
    const group = dressGroupOf(bundle)!;
    let ownedDisposed = 0;
    for (const im of instanced(group)) {
      const mat = im.material as Material;
      if (mat !== PLAIN) mat.addEventListener("dispose", () => ownedDisposed++);
    }
    expect(bundle.scene.children.length).toBeGreaterThan(kids);
    applied.remove();
    expect(group.parent).toBeNull();
    expect(bundle.scene.getObjectByName("city-dressing")).toBeUndefined();
    expect(bundle.scene.children.length).toBe(kids);
    expect(ownedDisposed, "the glass and the swapped material are freed").toBeGreaterThan(0);
    expect(geometryDisposed).toBe(0);
    expect(plainDisposed).toBe(0);
    bundle.dispose();
  });
});

describe("with no dressing the town is exactly as it was", () => {
  it("adds no group, no placement and no draw call without a City Pack, with stacks but no dressing asked for, or with no dressing loaded", () => {
    for (const file of MAPS) {
      const reference = buildScene(loadMap(file), { text: stubTextSurface });
      const refApplied = applyModels(reference, SET_NO_DRESS_ASKED);
      const refKids = reference.scene.children.length;
      for (const set of [NO_MODELS, SET_NO_CITY, SET_NO_DRESS_ASKED]) {
        const bundle = buildScene(loadMap(file), { text: stubTextSurface });
        const applied = applyModels(bundle, set);
        expect(dressGroupOf(bundle), file).toBeUndefined();
        expect(applied.dress, file).toEqual([]);
        expect(applied.dressCalls, file).toBe(0);
        applied.remove();
        bundle.dispose();
      }
      // The dressed town differs from the stacks-only town by exactly the dressing group.
      const dressed = buildScene(loadMap(file), { text: stubTextSurface });
      const applied = applyModels(dressed, SET);
      expect(dressed.scene.children.length, file).toBe(refKids + 1);
      expect(applied.terrace.length, file).toBe(refApplied.terrace.length);
      expect(applied.buildings.length, file).toBe(refApplied.buildings.length);
      applied.remove();
      dressed.dispose();
      refApplied.remove();
      reference.dispose();
    }
  });

  it("changes no pick target: the same ids, kinds and world matrices, in the same order, with and without the dressing", () => {
    for (const file of MAPS) {
      const without = buildScene(loadMap(file), { text: stubTextSurface });
      const a = applyModels(without, SET_NO_DRESS_ASKED);
      const before = pickTargets(without.scene);
      expect(before.length, file).toBeGreaterThan(5);
      const withDress = buildScene(loadMap(file), { text: stubTextSurface });
      const b = applyModels(withDress, SET);
      expect(b.dress.length, file).toBeGreaterThan(0);
      expect(pickTargets(withDress.scene), file).toEqual(before);
      // And nothing in the dressing is a pick target at all.
      const group = dressGroupOf(withDress)!;
      group.traverse((o) => expect(o.userData["pickKind"], o.name).toBeUndefined());
      a.remove();
      b.remove();
      without.dispose();
      withDress.dispose();
    }
  });
});

describe("dressSites and dressPlacements", () => {
  const sitesOf = (file: string): { sites: ReturnType<typeof dressSites>; bundleDone: () => void } => {
    const bundle = buildScene(loadMap(file), { text: stubTextSurface });
    const applied = applyModels(bundle, SET_NO_DRESS_ASKED);
    return {
      sites: dressSites(applied.terrace, applied.buildings, bundle.slots.blocks.list),
      bundleDone: () => {
        applied.remove();
        bundle.dispose();
      },
    };
  };

  it("lists the terrace blocks run by run, then the stacks on lots; each run's blocks are numbered in order with exactly one lowest, and every site has the road's kerb distance", () => {
    let onLots = 0;
    for (const file of ["09-shrine-circuit", "64-the-whole-chain"]) {
      const { sites, bundleDone } = sitesOf(file);
      expect(sites.length, file).toBeGreaterThan(20);
      const runs = new Map<string, typeof sites>();
      for (const s of sites) runs.set(s.run.id, [...(runs.get(s.run.id) ?? []), s]);
      for (const [id, list] of runs) {
        expect(list.map((s) => s.run.index), `${file} ${id}`).toEqual(list.map((_, i) => i));
        const low = list.filter((s) => s.run.lowest);
        expect(low, `${file} ${id}`).toHaveLength(1);
        expect(Math.min(...list.map((s) => s.stack.height_m)), `${file} ${id}`).toBe(low[0]!.stack.height_m);
      }
      for (const s of sites) {
        expect(s.kerbM).toBe(KERB_FROM_FRONT_M);
        expect(Number.isFinite(s.frame.x + s.frame.z + s.frame.yaw)).toBe(true);
      }
      expect(sites.some((s) => !s.run.id.startsWith("lots:")), `${file}: terrace blocks are dressed too`).toBe(true);
      const firstLots = sites.findIndex((s) => s.run.id.startsWith("lots:"));
      if (firstLots >= 0) {
        onLots++;
        expect(sites.slice(firstLots).every((s) => s.run.id.startsWith("lots:")), `${file}: terrace first, then lots`).toBe(true);
      }
      bundleDone();
    }
    expect(onLots, "some map stands a stack on a lot that is not a terrace lot").toBeGreaterThan(0);
  });

  it("is deterministic, keeps every cap that spans a run (one novelty sign per run), and dresses both the terrace blocks and the stacks on lots", () => {
    const { sites, bundleDone } = sitesOf("64-the-whole-chain");
    const input = dressInput(SET)!;
    const a = dressPlacements(sites, input.entries, input.fronts);
    const b = dressPlacements(sites, input.entries, input.fronts);
    expect(b).toEqual(a);
    expect(a.length).toBeGreaterThan(100);
    const novelty = new Set<string>(NOVELTY_SIGNS);
    const perRun = new Map<string, number>();
    // Every placement is in a site's frame, and the novelty signs counted by the run of the site that holds them are at most one per run.
    const owner = new Map<DressPlacement["frame"], string>();
    sites.forEach((s) => owner.set(s.frame, s.run.id));
    for (const p of a) if (novelty.has(p.piece.key)) perRun.set(owner.get(p.frame)!, (perRun.get(owner.get(p.frame)!) ?? 0) + 1);
    for (const [run, n] of perRun) expect(n, run).toBeLessThanOrEqual(1);
    expect(a.some((p) => owner.get(p.frame)!.startsWith("lots:"))).toBe(true);
    expect(a.some((p) => !owner.get(p.frame)!.startsWith("lots:"))).toBe(true);
    bundleDone();
  });
});

describe("the dressing in the 041 B occlusion test: nothing stands between the camera and a wire's middle or a node's pick point", () => {
  for (const file of ["09-shrine-circuit", "64-the-whole-chain"]) {
    it(`holds on ${file} with every stack at its fixture height and every dressing piece as a box of its size`, () => {
      const puzzle = loadMap(file);
      const bundle = buildScene(puzzle, { text: stubTextSurface });
      const applied = applyModels(bundle, SET);
      expect(applied.dress.length, file).toBeGreaterThan(100);
      const solids: Object3D[] = [];
      for (const b of applied.terrace) {
        const s = b.stack;
        const box = new Mesh(new BoxGeometry(s.width_m * W, s.height_m * W, s.depth_m * W), new MeshBasicMaterial({ side: DoubleSide }));
        const half = (s.depth_m * W) / 2;
        box.position.set(b.lot.x + Math.sin(b.lot.yaw) * (b.lot.d / 2 - half), (s.height_m * W) / 2, b.lot.z + Math.cos(b.lot.yaw) * (b.lot.d / 2 - half));
        box.rotation.y = b.lot.yaw;
        box.updateMatrixWorld(true);
        solids.push(box);
      }
      for (const p of applied.dress) {
        const { piece } = p;
        // The box in metres, scaled to the scene by the matrix; its centre is half its height above the piece's base, its sides the turned width and depth.
        const box = new Mesh(new BoxGeometry(piece.w, piece.h, piece.d), new MeshBasicMaterial({ side: DoubleSide }));
        box.matrixAutoUpdate = false;
        box.matrix.copy(dressMatrix(p.frame, { x: piece.x, y: piece.y + piece.h / 2, z: piece.z, yaw: 0 }));
        box.matrixWorld.copy(box.matrix);
        solids.push(box);
      }
      const rig = createCameraRig(puzzle, 1280, 720, { top: 120, bottom: 90 });
      const eye = rig.camera.position;
      const targets: { name: string; p: Vector3 }[] = [
        ...wireLayout(puzzle).map((r) => ({ name: r.id, p: new Vector3(r.mid.x, r.mid.y, r.mid.z) })),
        ...puzzle.nodes.map((n) => ({ name: n.id, p: new Vector3(n.pos[0], NODE_BODY_Y, n.pos[1]) })),
      ];
      const caster = new Raycaster();
      for (const t of targets) {
        const dir = t.p.clone().sub(eye);
        const dist = dir.length();
        caster.set(eye, dir.normalize());
        caster.far = dist - 1e-6;
        const hits = caster.intersectObjects(solids, true);
        expect(hits.length, `${t.name} behind a stack or its dressing at ${hits[0]?.distance}`).toBe(0);
      }
      applied.remove();
      bundle.dispose();
    });
  }
});

describe("the stack gallery's &dress=1", () => {
  const MANIFEST = manifestOf(ALL);
  const root = glbOf(MANIFEST);
  const lookup = (name: string): Object3D | undefined => root.getObjectByName(name) ?? undefined;
  const filter = { style: "apartment-01", type: null } as const;

  it("is a flag of the stack gallery only: it counts with gallery=city-pack&stacks=1 and with nothing else", () => {
    expect(dressRequested("?gallery=city-pack&stacks=1&dress=1")).toBe(true);
    expect(dressRequested("?gallery=city-pack&stacks=1")).toBe(false);
    expect(dressRequested("?gallery=city-pack&stacks=1&dress=0")).toBe(false);
    expect(dressRequested("?gallery=city-pack&dress=1")).toBe(false);
    expect(dressRequested("?gallery=simple-town&stacks=1&dress=1")).toBe(false);
    expect(dressRequested("?dress=1")).toBe(false);
  });

  it("without dress the layout is what it was (no dress field, no dressing keys); with dress each stack carries its pieces and the keys are asked for", () => {
    const plain = stackGalleryLayout(MANIFEST, undefined, undefined, { filter });
    expect(stackGalleryLayout(MANIFEST, undefined, undefined, { filter, dress: false })).toEqual(plain);
    expect(plain.stacks!.cells.every((c) => c.dress === undefined)).toBe(true);
    expect(plain.stacks!.keys.some((k) => dressKeys().includes(k))).toBe(false);
    const dressed = stackGalleryLayout(MANIFEST, undefined, undefined, { filter, dress: true });
    expect(dressed.stacks!.cells.length).toBe(plain.stacks!.cells.length);
    expect(dressed.stacks!.cells.every((c) => c.dress !== undefined)).toBe(true);
    expect(dressed.stacks!.cells.reduce((n, c) => n + c.dress!.length, 0)).toBeGreaterThan(20);
    expect(dressKeys().every((k: CalibrationKey) => dressed.stacks!.keys.includes(k))).toBe(true);
    // Placement is a pure function of the shown stack: the same layout twice.
    expect(stackGalleryLayout(MANIFEST, undefined, undefined, { filter, dress: true })).toEqual(dressed);
  });

  it("draws the dressing in one instanced group that nothing can pick, beside the stacks, and none without dress", () => {
    const dressed = stackGalleryLayout(MANIFEST, undefined, undefined, { filter, dress: true });
    const built = buildGalleryScene(dressed, lookup, { surface: stubTextSurface });
    const group = built.scene.getObjectByName("city-dressing")!;
    expect(group).toBeDefined();
    const meshes = instanced(group);
    expect(meshes.length).toBeGreaterThan(5);
    expect(meshes.length).toBeLessThanOrEqual(DRESS_DRAW_CALLS_MAX);
    const total = dressed.stacks!.cells.reduce((n, c) => n + c.dress!.length, 0);
    expect(meshes.reduce((n, m) => n + m.count, 0)).toBeGreaterThanOrEqual(total);
    group.traverse((o) => expect(o.raycast, o.name).not.toBe(InstancedMesh.prototype.raycast));
    expect(built.stacks.length).toBe(dressed.stacks!.cells.length);
    built.dispose();
    const plainScene = buildGalleryScene(stackGalleryLayout(MANIFEST, undefined, undefined, { filter }), lookup, { surface: stubTextSurface });
    expect(plainScene.scene.getObjectByName("city-dressing")).toBeUndefined();
    plainScene.dispose();
    // No GLB (the pack is missing): the stacks and their captions still show, with nothing to draw the dressing from.
    const bare = buildGalleryScene(dressed, null, { surface: stubTextSurface });
    expect(bare.scene.getObjectByName("city-dressing")).toBeUndefined();
    bare.dispose();
  });
});

describe("fire escapes: a y-scale, the ladder to the walk and the code-drawn escape (ticket 058)", () => {
  const FRAME = { x: 3, z: -2, yaw: 0.5 };
  const boxesOf = (list: readonly DressPlacement[]): number => list.reduce((n, p) => n + (p.piece.parts?.length ?? 0), 0);
  const boxMeshOf = (group: Object3D): InstancedMesh => group.getObjectByName("dress:escape-code") as InstancedMesh;
  const noEscapePack = setOf(manifestOf(ALL.filter((e) => !/FireEscape/.test(e.name))));

  it("scales a piece in y about its base and leaves x and z at WORLD_PER_METRE (dressMatrix and the instanced mesh agree)", () => {
    const piece = { x: 1, y: 2, z: 3, yaw: 0, scaleY: 1.1 };
    const e = dressMatrix(FRAME, piece).elements;
    const flat = dressMatrix(FRAME, { x: 1, y: 2, z: 3, yaw: 0 }).elements;
    // The y axis of the matrix is (0, WORLD_PER_METRE * 1.1, 0): its length is the y-scale, the x and z columns are as for an unscaled piece.
    expect(Math.hypot(e[4]!, e[5]!, e[6]!)).toBeCloseTo(W * 1.1, 9);
    expect(Math.hypot(e[0]!, e[1]!, e[2]!)).toBeCloseTo(W, 9);
    expect(Math.hypot(e[8]!, e[9]!, e[10]!)).toBeCloseTo(W, 9);
    for (const i of [12, 13, 14]) expect(e[i]).toBeCloseTo(flat[i]!, 9);
    // A piece with no scaleY is as it was.
    expect(dressMatrix(FRAME, { x: 1, y: 2, z: 3, yaw: 0, scaleY: 1 }).elements).toEqual(flat);
    // Drawn: a placement with a y-scale gets its instance matrix from dressMatrix with it.
    const input = dressInput(SET)!;
    const placement: DressPlacement = { frame: FRAME, piece: { key: ESCAPE_MID, slot: "escape", x: 1, y: 2, z: 3, yaw: 0, column: 0, w: 3.251, h: 3.609 * 1.1, d: 1.644, scaleY: 1.1 } };
    const drawn = dressGroup([placement], input.roots);
    const im = drawn.group.children.find((c) => c.name === "dress:SM_Bld_FireEscape_02") as InstancedMesh;
    const m = new Matrix4();
    im.getMatrixAt(0, m);
    const want = dressMatrix(FRAME, placement.piece);
    for (let i = 0; i < 16; i++) expect(Math.abs(m.elements[i]! - Math.fround(want.elements[i]!)), `element ${i}`).toBeLessThan(1e-6);
    drawn.dispose();
  });

  it("draws every ladder's boxes on the maps in one InstancedMesh hung under the first landing's mesh: the group keeps one child per drawn mesh, and one extra draw call at most", () => {
    for (const file of MAPS) {
      const bundle = buildScene(loadMap(file), { text: stubTextSurface });
      const applied = applyModels(bundle, SET);
      const group = dressGroupOf(bundle)!;
      const ladders = applied.dress.filter((p) => p.piece.parts !== undefined);
      expect(ladders.length, file).toBeGreaterThan(5);
      for (const p of ladders) expect(p.piece.key, file).toBe(ESCAPE_FIRST);
      const boxes = boxMeshOf(group);
      expect(boxes, file).toBeDefined();
      expect(boxes.count, file).toBe(boxesOf(applied.dress));
      expect(boxes.parent!.name, file).toBe("dress:SM_Bld_FireEscape_03");
      expect(group.children.length, file).toBe(applied.dressCalls);
      expect(boxes.raycast, file).not.toBe(InstancedMesh.prototype.raycast);
      expect((boxes.material as MeshStandardMaterial).emissive.getHex(), file).toBe(0);
      // The first ladder's first rail: its instance stands from the walk (the lowest point of the box is the frame's y 0) and is 0.04 m thick, at WORLD_PER_METRE.
      const first = ladders[0]!;
      const m = new Matrix4();
      boxes.getMatrixAt(0, m);
      const want = dressMatrix(first.frame, { x: first.piece.x, y: first.piece.y, z: first.piece.z, yaw: first.piece.yaw }).multiply(partMatrix(first.piece.parts![0]!));
      for (let i = 0; i < 16; i++) expect(Math.abs(m.elements[i]! - Math.fround(want.elements[i]!)), `${file} element ${i}`).toBeLessThan(1e-6);
      const part = first.piece.parts![0]!;
      expect((first.piece.y + part.y - part.h / 2) * 1, `${file} rail foot`).toBeCloseTo(0, 9);
      applied.remove();
      bundle.dispose();
    }
  });

  it("draws an escape in code when the set has no escape piece, from no model: a code piece's boxes only, one InstancedMesh, the group still one child per drawn mesh", async () => {
    const set = await noEscapePack;
    for (const file of MAPS) {
      const bundle = buildScene(loadMap(file), { text: stubTextSurface });
      const applied = applyModels(bundle, set);
      const group = dressGroupOf(bundle)!;
      const code = applied.dress.filter((p) => p.piece.key === CODE_ESCAPE_KEY);
      expect(code.length, file).toBeGreaterThan(5);
      expect(applied.dress.some((p) => /FireEscape/.test(p.piece.key)), file).toBe(false);
      const boxes = boxMeshOf(group);
      expect(boxes.count, file).toBe(boxesOf(applied.dress));
      expect(boxes.count, file).toBeGreaterThan(code.length * 60);
      expect(group.children.length, file).toBe(applied.dressCalls);
      // Not a pick target and not emissive, like the rest of the dressing.
      group.traverse((o) => expect(o.userData["pickKind"], o.name).toBeUndefined());
      applied.remove();
      bundle.dispose();
    }
  });

  it("draws a pack piece's ladder boxes only with the piece: with no roots nothing is drawn, and a code piece draws without any", () => {
    const bundle = buildScene(loadMap("09-shrine-circuit"), { text: stubTextSurface });
    const applied = applyModels(bundle, SET);
    const pack = applied.dress.filter((p) => p.piece.key !== CODE_ESCAPE_KEY);
    const none = dressGroup(pack, new Map());
    expect(none.calls).toBe(0);
    expect(none.boxCalls).toBe(0);
    expect(none.group.children).toHaveLength(0);
    none.dispose();
    const code: DressPlacement = { frame: FRAME, piece: { key: CODE_ESCAPE_KEY, slot: "escape", x: 0, y: 3, z: 0, yaw: 0, column: 0, w: 3.25, h: 4, d: 1.64, parts: [{ kind: "deck", x: 0, y: 0, z: 0, w: 3, h: 0.08, d: 1 }] } };
    const only = dressGroup([code], new Map());
    expect(only.boxCalls).toBe(1);
    expect(only.group.children).toHaveLength(1);
    expect(only.calls).toBe(1);
    expect((only.group.children[0] as InstancedMesh).count).toBe(1);
    only.dispose();
    // At most 3 draw calls for the boxes of the whole town.
    expect(dressGroup(applied.dress, dressInput(SET)!.roots).boxCalls).toBeLessThanOrEqual(3);
    applied.remove();
    bundle.dispose();
  });
});
