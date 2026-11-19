/**
 * Ticket 051 section D: the packed terrace stacks in the town. `applyModels` stands each terrace run's packed blocks (`packTown`, section C) as `stack:<style>` groups and takes the
 * placeholders of the covered lots out of sight; with no City Pack stack (a fresh checkout, CI) the abutting placeholder boxes of 051 B stay as they were. No WebGL: the GLBs are
 * fake groups with one empty node per entry and every size is typed in as a number copied from the converted City Pack manifest (18 Nov 2026). Nothing here reads assets/private/.
 * The maps are the repo's own puzzles.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { BoxGeometry, DoubleSide, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, Raycaster, Vector3, type Object3D } from "three";
import { ASSET_MANIFEST_VERSION, loadPuzzle, type AssetEntry, type AssetManifest, type CalibrationKey, type Puzzle } from "../core";
import { createCameraRig } from "./camera";
import { NODE_BODY_Y, wireLayout } from "./layout";
import { WORLD_PER_METRE, buildingPlan, pickBuildings, traitsOf } from "./models";
import { NO_MODELS, allStackKeys, applyModels, buildingPlacements, loadModels, stackInput, type ModelSet } from "./models3d";
import { buildScene } from "./scene";
import { STACK_STYLES, offeredStacks } from "./stacks";
import { packTown } from "./terrace";
import { stubTextSurface } from "./text";
import { townLayout } from "./town";

// ---- a fixture copied from the converted City Pack manifest: [name, width, height, depth] in metres; bounds are centred ----
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
const manifestOf = (assets: AssetEntry[]): AssetManifest => ({
  version: ASSET_MANIFEST_VERSION,
  generatedAt: "2026-01-01T00:00:00Z",
  blenderVersion: "5.0.0",
  packs: [{ pack: "city-pack", glb: "city-pack.glb", atlas: null, assets, failures: [] }],
});

/** Every GLB is a group with one empty node per entry, so `loadModels` finds each planned root. */
async function setOf(manifest: AssetManifest): Promise<ModelSet> {
  return loadModels({
    fetchJson: async (): Promise<unknown> => manifest,
    loadGlb: async () => {
      const g = new Group();
      for (const e of manifest.packs[0]!.assets) {
        const n = new Group();
        n.name = e.name;
        g.add(n);
      }
      return g;
    },
    stackKeys: allStackKeys(),
    info: () => {},
  });
}

const ALL = SIZES.map(entryOf);
const SET = await setOf(manifestOf(ALL));
/** Every corner piece is missing: a run that starts at a corner cannot stand its corner block, so it packs nothing; the other runs of the same map still do. */
const SET_NO_CORNER = await setOf(manifestOf(ALL.filter((e) => !e.name.includes("Corner"))));
/** No City Pack at all: a loaded set with no stack slot (a fresh checkout, CI). */
const SET_NO_STACK: ModelSet = { pole: null, lamp: null, building: null };

const W = WORLD_PER_METRE;
const loadMap = (file: string): Puzzle => loadPuzzle(JSON.parse(readFileSync(join("puzzles", `${file}.json`), "utf8")));
const MAPS = ["01-first-light", "09-shrine-circuit", "64-the-whole-chain"];

/** The terrace placeholder group's instance matrices, concatenated: what the boxes look like. */
function terraceBoxes(root: Object3D): number[] {
  const group = root.getObjectByName("placeholders:terrace");
  expect(group).toBeDefined();
  return group!.children.flatMap((c) => [...(c as InstancedMesh).instanceMatrix.array.slice(0, (c as InstancedMesh).count * 16)]);
}

describe("applyModels stands each terrace run as its packed stacks", () => {
  for (const file of MAPS) {
    it(`on ${file}: one stack:<style> group per packed block, in run order, each at its block's front-centre and yaw; the terrace placeholders go; remove() brings it all back`, () => {
      const puzzle = loadMap(file);
      const bundle = buildScene(puzzle, { text: stubTextSurface });
      const lots = bundle.slots.blocks.list;
      const runs = bundle.slots.blocks.terraces!;
      expect(runs.length, file).toBeGreaterThan(0);
      const input = stackInput(SET)!;
      const packed = packTown({ terraces: runs, lots }, STACK_STYLES, input.entries, input.fronts);
      const want = runs.flatMap((r) => packed.get(r.id)!.blocks);
      expect(want.length, file).toBeGreaterThan(20);
      const before = bundle.slots.models.children.length;
      const applied = applyModels(bundle, SET);
      const row = bundle.scene.getObjectByName("terrace-stacks")!;
      expect(row, file).toBeDefined();
      expect(row.parent, "a sibling of the lots' models, not inside them").toBe(bundle.scene);
      expect(bundle.slots.models.children.length, "the lots' clones are the non-terrace placements, as before").toBe(before + applied.buildings.length);
      expect(row.children).toHaveLength(want.length);
      expect(applied.terrace).toHaveLength(want.length);
      want.forEach((b, k) => {
        const g = row.children[k]!;
        expect(g.name).toBe(`stack:${b.style}`);
        // The block as drawn: the packer's, with its ground row assembled again within a sill band where the lift needs it (ticket 062 B), so its piece count may differ from the packer's.
        const drawn = applied.terrace[k]!;
        expect(drawn.lot).toEqual(b.lot);
        expect(drawn.style).toBe(b.style);
        expect(g.children).toHaveLength(drawn.stack.pieces.length);
        expect(g.position.x).toBeCloseTo(b.lot.x + Math.sin(b.lot.yaw) * (b.lot.d / 2), 6);
        expect(g.position.z).toBeCloseTo(b.lot.z + Math.cos(b.lot.yaw) * (b.lot.d / 2), 6);
        expect(g.rotation.y).toBeCloseTo(b.lot.yaw, 9);
      });
      // Every terrace lot's placeholder is covered by a block of its run, so the whole terrace group is out of sight; the type groups are the models' business, not this one's.
      expect(bundle.slots.blocks.placeholder.getObjectByName("placeholders:terrace")!.visible).toBe(false);
      applied.remove();
      expect(row.parent).toBeNull();
      expect(bundle.slots.blocks.placeholder.getObjectByName("placeholders:terrace")!.visible).toBe(true);
      bundle.dispose();
    });
  }

  it("makes no piece of any stack raycast, and leaves the pick targets as they were (the same objects, matrices and bounds, in the same order)", () => {
    for (const file of MAPS) {
      const bundle = buildScene(loadMap(file), { text: stubTextSurface });
      const targets = (): string[] => {
        const out: string[] = [];
        bundle.scene.traverse((o) => {
          if (o.userData["pickKind"] !== undefined) out.push(`${String(o.userData["pickKind"])}|${String(o.userData["pickId"])}|${o.matrixWorld.elements.join(",")}`);
        });
        return out;
      };
      const before = targets();
      expect(before.length, file).toBeGreaterThan(5);
      const applied = applyModels(bundle, SET);
      const row = bundle.scene.getObjectByName("terrace-stacks")!;
      expect(row.userData["sharedModel"], "not disposed with the scene").toBe(true);
      expect(targets(), file).toEqual(before);
      // Nothing under the terrace stacks takes a ray: fire at the row from above and sideways.
      const caster = new Raycaster();
      const box = new Vector3();
      let fired = 0;
      for (const g of row.children.slice(0, 40)) {
        g.getWorldPosition(box);
        for (const dir of [new Vector3(0, -1, 0), new Vector3(0.3, -1, 0.2).normalize()]) {
          caster.set(new Vector3(box.x, box.y + 20, box.z), dir);
          expect(caster.intersectObject(row, true), file).toHaveLength(0);
          fired++;
        }
      }
      expect(fired).toBeGreaterThan(20);
      applied.remove();
      bundle.dispose();
    }
  });

  it("without a City Pack stack (the CI case) adds nothing and leaves the terrace placeholder boxes exactly as 051 B made them", () => {
    for (const file of MAPS) {
      const fresh = buildScene(loadMap(file), { text: stubTextSurface });
      const reference = terraceBoxes(fresh.slots.blocks.placeholder);
      for (const set of [NO_MODELS, SET_NO_STACK]) {
        const bundle = buildScene(loadMap(file), { text: stubTextSurface });
        const kids = bundle.scene.children.length;
        const applied = applyModels(bundle, set);
        expect(applied.terrace, file).toEqual([]);
        expect(bundle.scene.getObjectByName("terrace-stacks"), file).toBeUndefined();
        expect(bundle.scene.children.length, file).toBe(kids);
        expect(bundle.slots.blocks.placeholder.getObjectByName("placeholders:terrace")!.visible, file).toBe(true);
        expect(terraceBoxes(bundle.slots.blocks.placeholder), file).toEqual(reference);
        applied.remove();
        bundle.dispose();
      }
      fresh.dispose();
    }
  });

  it("takes out of sight only the placeholders of the lots a packed run covers: a run that packs nothing keeps its boxes, and remove() restores every one", () => {
    let partial = 0;
    for (const file of readdirSync("puzzles").filter((f) => f.endsWith(".json"))) {
      const puzzle = loadPuzzle(JSON.parse(readFileSync(join("puzzles", file), "utf8")));
      const bundle = buildScene(puzzle, { text: stubTextSurface });
      const lots = bundle.slots.blocks.list;
      const runs = bundle.slots.blocks.terraces!;
      const input = stackInput(SET_NO_CORNER);
      const packed = packTown({ terraces: runs, lots }, STACK_STYLES, input!.entries, input!.fronts);
      const covered = new Set<number>();
      for (const r of runs) if (packed.get(r.id)!.blocks.length > 0) for (const i of r.lots) covered.add(i);
      const mine = lots.map((l, i) => (l.terrace ? i : -1)).filter((i) => i >= 0);
      if (mine.every((i) => covered.has(i)) || mine.every((i) => !covered.has(i))) {
        bundle.dispose();
        continue;
      }
      partial++;
      const group = bundle.slots.blocks.placeholder.getObjectByName("placeholders:terrace")!;
      const bodies = group.children[0] as InstancedMesh;
      const reference = bodies.instanceMatrix.array.slice(0, mine.length * 16);
      const applied = applyModels(bundle, SET_NO_CORNER);
      expect(group.visible, file).toBe(true);
      const m = new Matrix4();
      mine.forEach((li, k) => {
        bodies.getMatrixAt(k, m);
        const scale = new Vector3().setFromMatrixScale(m);
        if (covered.has(li)) expect(scale.length(), `${file} ${lots[li]!.key} is covered`).toBe(0);
        else expect([...m.elements], `${file} ${lots[li]!.key} stays`).toEqual([...reference.slice(k * 16, k * 16 + 16)]);
      });
      applied.remove();
      expect([...bodies.instanceMatrix.array.slice(0, mine.length * 16)], file).toEqual([...reference]);
      bundle.dispose();
      if (partial >= 3) break;
    }
    expect(partial, "some map has both a run that packs and a run that cannot").toBeGreaterThan(0);
  });
});

describe("pickBuildings never sees a terrace lot", () => {
  it("gives the same placements on every lot that is not a terrace lot as on the town's other lots alone, and none on a terrace lot", () => {
    let placed = 0;
    for (const file of MAPS) {
      const town = townLayout(loadMap(file));
      const own = town.lots.map((l, i) => (l.terrace ? -1 : i)).filter((i) => i >= 0);
      expect(own.length, file).toBeLessThan(town.lots.length);
      const input = stackInput(SET)!;
      const all = buildingPlacements(town.lots, null, input);
      const only = buildingPlacements(
        own.map((i) => town.lots[i]!),
        null,
        input,
      );
      placed += only.length;
      expect(all.length, file).toBe(only.length);
      all.forEach((p, k) => {
        expect(town.lots[p.lot]!.terrace, file).toBeUndefined();
        expect(p.lot, file).toBe(own[only[k]!.lot]);
        expect([p.model.entry.name, p.x, p.z, p.yaw], file).toEqual([only[k]!.model.entry.name, only[k]!.x, only[k]!.z, only[k]!.yaw]);
      });
      // And the picker itself is handed no terrace lot: its answer on the full list is its answer on the non-terrace ones.
      const offers = offeredStacks(input.entries, input.fronts);
      const plan = buildingPlan([], undefined, offers);
      const names = pickBuildings(
        own.map((i) => town.lots[i]!),
        plan,
        traitsOf([], offers),
      );
      expect(names.length).toBe(own.length);
    }
    expect(placed, "some map has a non-terrace lot that stands a stack").toBeGreaterThan(0);
  });
});

describe("the packed stacks in the 041 B occlusion test: nothing stands between the camera and a wire's middle or a node's pick point", () => {
  for (const file of ["09-shrine-circuit", "64-the-whole-chain"]) {
    it(`holds on ${file} with every terrace block at its fixture height`, () => {
      const puzzle = loadMap(file);
      const bundle = buildScene(puzzle, { text: stubTextSurface });
      const applied = applyModels(bundle, SET);
      expect(applied.terrace.length, file).toBeGreaterThan(20);
      const solids: Object3D[] = applied.terrace.map((b) => {
        const s = b.stack;
        const box = new Mesh(new BoxGeometry(s.width_m * W, s.height_m * W, s.depth_m * W), new MeshBasicMaterial({ side: DoubleSide }));
        // The box stands on the block's footprint: centred across the front, its front face on the lot's front edge.
        const half = (s.depth_m * W) / 2;
        box.position.set(b.lot.x + Math.sin(b.lot.yaw) * (b.lot.d / 2 - half), (s.height_m * W) / 2, b.lot.z + Math.cos(b.lot.yaw) * (b.lot.d / 2 - half));
        box.rotation.y = b.lot.yaw;
        box.updateMatrixWorld(true);
        return box;
      });
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
        expect(hits.length, `${t.name} behind a terrace block at ${hits[0]?.distance}`).toBe(0);
      }
      applied.remove();
      bundle.dispose();
    });
  }
});
