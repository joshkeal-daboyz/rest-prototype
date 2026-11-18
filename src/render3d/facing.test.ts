/**
 * Ticket 042 A: buildings face their road and no model dominates. No WebGL: a fake model set whose roots carry a marker one metre along
 * the declared front (and, on a corner model, another along its second face), `applyModels` on a stand-in bundle, and the town's own roads.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Group, Object3D, Vector3 } from "three";
import { ASSET_MANIFEST_VERSION, applyCalibrationPatch, loadPuzzle, type AssetEntry, type AssetManifest, type CalibrationFile, type Puzzle } from "../core";
import { effectiveFronts } from "./calibration";
import {
  BUILDING_EXCLUDE,
  BUILDING_FRONTS,
  FAMILY_SHARE_MAX,
  MODEL_TABLE,
  NEIGHBOUR_GAP,
  STREET_REPEAT_GAP,
  buildingPlan,
  frontAxis,
  frontYaw,
  lotGap,
  meshFamily,
  pickBuildings,
  planModels,
  traitsOf,
  type BuildingFront,
  type FrontTable,
  type ModelFront,
} from "./models";
import { applyModels, buildingPlacements, loadModels, type LoadedModel, type ModelSet } from "./models3d";
import type { SceneBundle } from "./scene";
import { CORNER_GAP, LOT_TYPE_NAMES, townLayout, type Lot, type LotType, type Town } from "./town";

// ---- a fixture copied from the converted SIMPLE Town manifest (17 Nov 2026): size in metres (w, h, d) and triangles; bounds are centred ----
const SIZES: [string, number, number, number, number][] = [
  ["Building_AutoRepair", 21.489, 10.6657, 10.8053, 1618],
  ["Building_BaberShop", 10.3994, 11.2909, 10.906, 600],
  ["Building_CoffeeShop", 10.3994, 15.6313, 12.9223, 776],
  ["Building_Garage_01", 12.3739, 11.6069, 14.7409, 464],
  ["Building_Garage_02", 12.3739, 11.6069, 14.7409, 464],
  ["Building_Garage_03", 12.3739, 11.6069, 14.7409, 464],
  ["Building_Gym", 10.5082, 11.4185, 11.985, 386],
  ["Building_House_01", 10.6301, 14.5245, 18.5211, 788],
  ["Building_House_010", 14.1854, 10.1431, 16.1033, 834],
  ["Building_House_011", 14.1854, 10.1431, 16.1033, 834],
  ["Building_House_012", 15.8606, 10.8695, 14.8303, 753],
  ["Building_House_013", 15.8606, 10.8695, 14.8303, 753],
  ["Building_House_014", 15.8606, 10.8695, 14.8303, 753],
  ["Building_House_015", 15.8606, 10.8695, 14.8303, 753],
  ["Building_House_02", 10.6301, 14.5245, 18.5211, 788],
  ["Building_House_03", 10.6301, 14.5245, 18.5211, 788],
  ["Building_House_04", 10.6301, 14.5245, 18.5211, 788],
  ["Building_House_05", 19.5643, 15.9763, 25.7115, 2244],
  ["Building_House_06", 19.5643, 15.9763, 25.7115, 2244],
  ["Building_House_07", 19.5643, 15.9763, 25.7115, 2244],
  ["Building_House_08", 19.5643, 15.9763, 25.7115, 2244],
  ["Building_House_09", 14.1854, 10.1431, 16.1033, 834],
  ["Building_PetrolStation", 22.4742, 9.4097, 27.7504, 804],
  ["Building_PoliceStation", 24.3111, 9.855, 14.9959, 1866],
  ["Building_Shop_01", 10.5082, 11.4185, 10.1611, 278],
  ["Building_Shop_02", 10.5082, 11.4185, 10.1611, 278],
  ["Building_Shop_03", 10.9169, 10.4123, 11.8753, 588],
  ["Building_Shop_04", 10.9169, 10.4123, 11.8753, 588],
  ["Building_Shop_05", 10.9169, 10.4123, 11.8753, 588],
  ["Building_StripClub", 20.9971, 7.9244, 15.8742, 1800],
  ["apartment_large_mesh", 11.632, 16.7468, 11.8194, 930],
  ["apartment_small_mesh", 11.632, 11.9546, 11.8194, 690],
  ["house_mesh", 11.8211, 8.4526, 13.4194, 478],
  ["memorial_mesh", 4.6843, 4.648, 4.6843, 124],
  ["office_large_mesh", 13.6209, 27.237, 15.1668, 780],
  ["office_medium_mesh", 13.6209, 20.0433, 15.1668, 620],
  ["office_small_mesh", 13.6209, 12.829, 15.1668, 460],
  ["store_corner_mesh", 11.0614, 6.6556, 11.2561, 247],
  ["store_small_mesh", 11.6319, 6.6556, 8.3694, 218],
];

function entryOf([name, w, h, d, triangles]: (typeof SIZES)[number]): AssetEntry {
  return { name, source: `${name}.fbx`, bounds: { min: [-w / 2, 0, -d / 2], max: [w / 2, h, d / 2] }, triangles, textures: [], missingTextures: [], warnings: [] };
}
const ENTRIES = SIZES.map(entryOf);
const MANIFEST: AssetManifest = {
  version: ASSET_MANIFEST_VERSION,
  generatedAt: "2026-01-01T00:00:00Z",
  blenderVersion: "5.0.0",
  packs: [{ pack: "simple-town", glb: "simple-town.glb", atlas: null, assets: ENTRIES, failures: [] }],
};
const entryNamed = (name: string): AssetEntry => ENTRIES.find((e) => e.name === name)!;

/** A model set from the fixture. Each root has a child marker one metre along the declared front, in the model's own frame. */
function fakeSet(fronts: FrontTable = BUILDING_FRONTS): ModelSet {
  const plan = planModels(MANIFEST, MODEL_TABLE, fronts);
  const building: LoadedModel[] = (plan.building ?? []).map((p) => {
    const root = new Group();
    root.name = p.entry.name;
    const marker = new Object3D();
    marker.name = "front-marker";
    const [ax, az] = frontAxis(p.front);
    marker.position.set(ax, 0, az);
    root.add(marker);
    if (p.corner !== false) {
      // The second face, in the model's own frame: the lot-frame open side (read after the front is turned to the road) turned back by the front's yaw.
      const second = new Object3D();
      second.name = "side-marker";
      second.position.copy(new Vector3(p.corner === "+x" ? 1 : -1, 0, 0).applyAxisAngle(new Vector3(0, 1, 0), -frontYaw(p.front)));
      root.add(second);
    }
    return { ...p, root };
  });
  return { pole: null, lamp: null, building };
}

/** The scene slots `applyModels` reads, with no scene: the lots, a group per type, and the group the clones go in. */
function standIn(lots: readonly Lot[]): SceneBundle {
  const byType = Object.fromEntries(LOT_TYPE_NAMES.map((t) => [t, new Group()])) as Record<LotType, Group>;
  return { slots: { poles: { spots: [], placeholders: [] }, lamps: [], blocks: { list: lots, placeholder: new Group(), byType }, models: new Group() } } as unknown as SceneBundle;
}

const mapFiles = [...readdirSync("puzzles").filter((f) => f.endsWith(".json")), "lamp-row.grid.json"].map((f) => join("puzzles", f)).filter((f, i, all) => existsSync(f) && all.indexOf(f) === i);
const maps: { name: string; puzzle: Puzzle; town: Town }[] = mapFiles.map((f) => {
  const puzzle = loadPuzzle(JSON.parse(readFileSync(f, "utf8")));
  return { name: f, puzzle, town: townLayout(puzzle, { terraces: false }) };
});

/** The nearest point of a road's centreline to (px, pz). */
function nearestOnRoad(r: { ax: number; az: number; bx: number; bz: number }, px: number, pz: number): { x: number; z: number } {
  const dx = r.bx - r.ax;
  const dz = r.bz - r.az;
  const t = Math.max(0, Math.min(1, ((px - r.ax) * dx + (pz - r.az) * dz) / (dx * dx + dz * dz)));
  return { x: r.ax + dx * t, z: r.az + dz * t };
}

/** Distance from a point to a convex polygon: 0 inside. */
function pointPolyDistance(px: number, pz: number, pts: readonly { x: number; z: number }[]): number {
  let inside = true;
  let best = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    if ((b.x - a.x) * (pz - a.z) - (b.z - a.z) * (px - a.x) < 0) inside = false;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(px - (a.x + dx * t), pz - (a.z + dz * t)));
  }
  return inside ? 0 : best;
}
/** A lot's side edge (the lot's own +x for sgn 1, -x for -1) sampled front to back; the least distance of any sample to a polygon. */
function sideEdgeDistance(lot: Lot, sgn: 1 | -1, pts: readonly { x: number; z: number }[]): number {
  const ex = Math.cos(lot.yaw);
  const ez = -Math.sin(lot.yaw);
  const fx = Math.sin(lot.yaw);
  const fz = Math.cos(lot.yaw);
  let best = Infinity;
  for (let k = 0; k <= 24; k++) {
    const t = (k / 24 - 0.5) * lot.d;
    best = Math.min(best, pointPolyDistance(lot.x + (ex * lot.w * sgn) / 2 + fx * t, lot.z + (ez * lot.w * sgn) / 2 + fz * t, pts));
  }
  return best;
}
/** The angle, in degrees, between a lot side's outward axis and the way from the lot's centre to a road's nearest centreline point. */
function crossAngle(lot: Lot, sgn: 1 | -1, r: { ax: number; az: number; bx: number; bz: number }): number {
  const q = nearestOnRoad(r, lot.x, lot.z);
  const vx = q.x - lot.x;
  const vz = q.z - lot.z;
  const cos = (vx * Math.cos(lot.yaw) * sgn - vz * Math.sin(lot.yaw) * sgn) / Math.hypot(vx, vz);
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

describe("every building has a front", () => {
  it("has a BUILDING_FRONTS entry for every name in a building row of MODEL_TABLE, and for ticket 042 B's default place models", () => {
    for (const row of MODEL_TABLE) {
      if (row.slot !== "building") continue;
      for (const n of row.names) expect(BUILDING_FRONTS[`${row.pack}:${n}`], n).toBeDefined();
    }
    for (const n of ["memorial_mesh", "Building_Garage_01", "Building_AutoRepair", "Building_Shop_01", "store_small_mesh", "apartment_small_mesh", "office_small_mesh", "house_mesh", "Building_House_09"]) {
      expect(BUILDING_FRONTS[`simple-town:${n}`], n).toBeDefined();
    }
  });

  it("maps +z, -z, +x and -x to 0, pi, -pi/2 and +pi/2, and each yaw turns that axis onto +z", () => {
    expect(frontYaw("+z")).toBe(0);
    expect(frontYaw("-z")).toBe(Math.PI);
    expect(frontYaw("+x")).toBe(-Math.PI / 2);
    expect(frontYaw("-x")).toBe(Math.PI / 2);
    for (const f of ["+z", "-z", "+x", "-x"] as ModelFront[]) {
      const [ax, az] = frontAxis(f);
      const v = new Vector3(ax, 0, az).applyAxisAngle(new Vector3(0, 1, 0), frontYaw(f));
      expect(v.x, f).toBeCloseTo(0, 9);
      expect(v.z, f).toBeCloseTo(1, 9);
    }
  });

  it("holds Josh's 17 Nov 2026 calibration: every model faces -z except store_small_mesh and memorial_mesh (+z), and only store_corner_mesh is a corner model, open on the lot's -x", () => {
    // Only SIMPLE Town's lines: the POLYGON Town Pack lines (ticket 048) are checked in polygon.test.ts.
    for (const [key, f] of Object.entries(BUILDING_FRONTS).filter(([k]) => k.startsWith("simple-town:"))) {
      const n = key.slice("simple-town:".length);
      expect(f.front, n).toBe(n === "store_small_mesh" || n === "memorial_mesh" ? "+z" : "-z");
      expect(f.corner === true, n).toBe(n === "store_corner_mesh");
    }
    expect(BUILDING_FRONTS["simple-town:store_corner_mesh"]!.open).toBe("-x");
  });
});

/** Every fake model's front, scrambled through all four faces, so the test can't pass by every model facing +z. */
const SCRAMBLED: Record<string, BuildingFront> = Object.fromEntries(
  ENTRIES.map((e, i) => [`simple-town:${e.name}`, { front: (["+z", "-z", "+x", "-x"] as const)[i % 4]!, ...(e.name === "store_corner_mesh" ? { corner: true as const, open: "+x" as const } : {}) }]),
);

describe("every placed building faces its road (every map)", () => {
  it.each([
    ["the shipped table", BUILDING_FRONTS],
    ["a table that turns models through all four faces", SCRAMBLED],
  ])("turns each clone's declared front toward the nearest point of its own road, to under 0.5 degrees: %s", (_label, fronts) => {
    const set = fakeSet(fronts);
    expect(new Set(set.building!.map((m) => m.front)).size).toBe(_label === "the shipped table" ? 2 : 4);
    let clones = 0;
    const turned = new Set<ModelFront>();
    for (const { name, town } of maps) {
      const bundle = standIn(town.lots);
      const applied = applyModels(bundle, set);
      const models = bundle.slots.models;
      models.updateMatrixWorld(true);
      expect(models.children, name).toHaveLength(applied.buildings.length);
      const roads = new Map(town.roads.map((r) => [r.id, r] as const));
      applied.buildings.forEach((p, k) => {
        const lot = town.lots[p.lot]!;
        const clone = models.children[k]!;
        const marker = clone.getObjectByName("front-marker")!;
        const at = clone.getWorldPosition(new Vector3());
        const tip = marker.getWorldPosition(new Vector3());
        // The declared front's direction as the scene has it, from the marker alone: no lot.yaw in it.
        const dx = tip.x - at.x;
        const dz = tip.z - at.z;
        // The lot centre to the nearest point of its own road's centreline.
        const road = roads.get(lot.street)!;
        expect(road, `${name} ${lot.key} road`).toBeDefined();
        const q = nearestOnRoad(road, lot.x, lot.z);
        const wx = q.x - lot.x;
        const wz = q.z - lot.z;
        const cos = (dx * wx + dz * wz) / (Math.hypot(dx, dz) * Math.hypot(wx, wz));
        const degrees = (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
        expect(degrees, `${name} ${lot.key} ${p.model.entry.name}`).toBeLessThan(0.5);
        turned.add(p.model.front);
        clones++;
      });
    }
    expect(clones).toBeGreaterThan(5000);
    // The shipped table's only "+z" model placed on a map was the video rental store (047); memorial_mesh is not placed yet.
    expect(turned.size).toBe(_label === "the shipped table" ? 1 : 4);
  });
});

describe("corner lots and corner models", () => {
  it("a lot is a corner exactly where a side edge meets another road: every recorded side does, every meeting is recorded, and a row end that meets no road is not a corner", () => {
    let lots = 0;
    let corners = 0;
    let bareRowEnds = 0;
    let meetings = 0;
    for (const { name, town } of maps) {
      const roads = new Map(town.roads.map((r) => [r.id, r] as const));
      // Service strips are footpaths: only a real road's pavement counts.
      const pavements = town.pavements.filter((pv) => roads.has(pv.road));
      for (const l of town.lots) {
        lots++;
        expect(l.corner, `${name} ${l.key}`).toBe(l.cornerSides.length > 0);
        if (l.corner) corners++;
        for (const sgn of [1, -1] as const) {
          const side = sgn === 1 ? "+x" : "-x";
          // Sound: a recorded side has its cross road (not its own) within the gap, that road's centreline lying toward the side.
          for (const c of l.cornerSides.filter((x) => x.side === side)) {
            const r = roads.get(c.road)!;
            expect(r, `${name} ${l.key} cross road`).toBeDefined();
            expect(c.road, `${name} ${l.key} is its own road`).not.toBe(l.street);
            const near = Math.min(...pavements.filter((pv) => pv.road === c.road).map((pv) => sideEdgeDistance(l, sgn, pv.pts)));
            expect(near, `${name} ${l.key} ${side} to ${c.road}`).toBeLessThanOrEqual(CORNER_GAP + 0.1);
            expect(crossAngle(l, sgn, r), `${name} ${l.key} ${side} to ${c.road}`).toBeLessThanOrEqual(45 + 1e-6);
          }
          // Complete: every other road whose pavement a sample of the edge comes within the gap of, toward that side, is recorded.
          for (const r of town.roads) {
            if (r.id === l.street || crossAngle(l, sgn, r) > 45 - 1e-6) continue;
            if (!pavements.some((pv) => pv.road === r.id && sideEdgeDistance(l, sgn, pv.pts) <= CORNER_GAP)) continue;
            meetings++;
            expect(l.cornerSides.some((c) => c.side === side && c.road === r.id), `${name} ${l.key} ${side} meets ${r.id}`).toBe(true);
          }
        }
      }
      // The first and last lot of a road side's row are only corners where a cross road is there.
      const sides = new Map<string, Lot[]>();
      for (const l of town.lots) sides.set(`${l.street}:${l.side}`, [...(sides.get(`${l.street}:${l.side}`) ?? []), l]);
      for (const row of sides.values()) for (const l of [row[0]!, row[row.length - 1]!]) if (!l.corner) bareRowEnds++;
    }
    expect(meetings).toBeGreaterThan(500);
    expect(bareRowEnds).toBeGreaterThan(50);
    // Far fewer than the 80 percent the first and last lot of every row made.
    expect(corners / lots).toBeGreaterThan(0.05);
    expect(corners / lots).toBeLessThan(0.6);
  });

  it("every map that has an intersection (a junction of three or more roads) has a corner lot", () => {
    let withIntersection = 0;
    for (const { name, town } of maps) {
      if (town.pads.some((p) => p.roads.length >= 3)) {
        withIntersection++;
        expect(town.lots.some((l) => l.corner), name).toBe(true);
      }
    }
    expect(withIntersection).toBeGreaterThan(10);
  });

  it("uses the same gap as the neighbour rule", () => {
    expect(CORNER_GAP).toBe(NEIGHBOUR_GAP);
  });

  it.each([
    ["the shipped table (open on -x)", BUILDING_FRONTS],
    ["a table that turns models through all four faces (corner shop open on +x)", SCRAMBLED],
  ])("puts a corner model only where its open side meets a cross street and its second face points at that street, to within 45 degrees: %s", (_label, fronts) => {
    const set = fakeSet(fronts);
    let used = 0;
    for (const { name, town } of maps) {
      const bundle = standIn(town.lots);
      const applied = applyModels(bundle, set);
      const models = bundle.slots.models;
      models.updateMatrixWorld(true);
      const roads = new Map(town.roads.map((r) => [r.id, r] as const));
      applied.buildings.forEach((p, k) => {
        if (p.model.corner === false) return;
        used++;
        const lot = town.lots[p.lot]!;
        expect(lot.corner, `${name} ${lot.key}`).toBe(true);
        const clone = models.children[k]!;
        const at = clone.getWorldPosition(new Vector3());
        const tip = clone.getObjectByName("side-marker")!.getWorldPosition(new Vector3());
        const dx = tip.x - at.x;
        const dz = tip.z - at.z;
        // The cross roads on the lot side the model is open on; its second face must point (within 45 degrees) at the nearest point of one's centreline.
        const crosses = lot.cornerSides.filter((c) => c.side === p.model.corner);
        expect(crosses.length, `${name} ${lot.key} open side meets no road`).toBeGreaterThan(0);
        const best = Math.min(
          ...crosses.map((c) => {
            const q = nearestOnRoad(roads.get(c.road)!, lot.x, lot.z);
            const wx = q.x - lot.x;
            const wz = q.z - lot.z;
            const cos = (dx * wx + dz * wz) / (Math.hypot(dx, dz) * Math.hypot(wx, wz));
            return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
          }),
        );
        expect(best, `${name} ${lot.key} ${p.model.entry.name} second face to its cross street`).toBeLessThanOrEqual(45 + 1e-6);
      });
    }
    expect(used).toBeGreaterThan(0);
  });

  it("an ordinary model goes on any lot, a corner model only on a lot whose open side meets a cross road, and a type with only corner models leaves other lots bare", () => {
    const row = (sides: Lot["cornerSides"][]): Lot[] =>
      sides.map((cs, i) => ({ x: i * 20, z: 0, w: 2.1, d: 2.3, yaw: 0, type: "small", hMax: 2, key: `r${i}:1:0`, street: `r${i}`, side: 1, corner: cs.length > 0, cornerSides: cs }));
    const plan = { small: ["Corner", "Plain"], house: [], large: [], tall: [] } as const;
    const traits = (open: "+x" | "-x") =>
      new Map([
        ["Corner", { family: "Corner", corner: open }],
        ["Plain", { family: "Plain", corner: false as const }],
      ]);
    const none: Lot["cornerSides"] = [];
    const plus: Lot["cornerSides"] = [{ side: "+x", road: "x" }];
    const minus: Lot["cornerSides"] = [{ side: "-x", road: "x" }];
    // Far apart (no neighbour rule) and not corners: only the ordinary model, anywhere.
    expect(pickBuildings(row([none, none, none]), plan, traits("+x"))).toEqual(["Plain", "Plain", "Plain"]);
    // A corner on the other side does not take it either.
    expect(pickBuildings(row([minus, minus, minus]), plan, traits("+x"))).toEqual(["Plain", "Plain", "Plain"]);
    // Where the open side meets a cross road it is an add-on that takes the lot by the least-used rule: with two to choose from, both appear.
    const picks = pickBuildings(row([plus, plus, none, plus]), plan, traits("+x"));
    expect(picks[2]).toBe("Plain");
    expect(picks).toContain("Corner");
    expect(picks).toContain("Plain");
    expect(pickBuildings(row([plus, plus, plus]), plan, traits("-x"))).toEqual(["Plain", "Plain", "Plain"]);
    expect(pickBuildings(row([minus, minus, minus]), plan, traits("-x"))).toContain("Corner");
    // A type with only corner models: a lot that is not a valid corner gets none (it keeps its placeholder), one that is takes it.
    const only = { small: ["Corner"], house: [], large: [], tall: [] } as const;
    expect(pickBuildings(row([none, plus, minus]), only, traits("+x"))).toEqual([null, "Corner", null]);
  });
});

describe("meshFamily", () => {
  it("groups Building_Shop_03/04/05 into one family and _01/02 into another, with Building_Gym in neither", () => {
    const fam = (n: string): string => meshFamily(ENTRIES, entryNamed(n));
    expect(new Set(["03", "04", "05"].map((s) => fam(`Building_Shop_${s}`))).size).toBe(1);
    expect(fam("Building_Shop_01")).toBe(fam("Building_Shop_02"));
    expect(fam("Building_Shop_01")).not.toBe(fam("Building_Shop_03"));
    expect(fam("Building_Gym")).toBe("Building_Gym");
    expect(fam("Building_Gym")).not.toBe(fam("Building_Shop_01"));
    expect(fam("Building_Gym")).not.toBe(fam("Building_Shop_03"));
  });

  it("agrees to a centimetre in bounds and needs equal triangle counts", () => {
    const a = entryNamed("Building_Shop_01");
    const near: AssetEntry = { ...a, name: "near", bounds: { min: [a.bounds.min[0] + 0.009, 0, a.bounds.min[2]], max: a.bounds.max } };
    const far: AssetEntry = { ...a, name: "far", bounds: { min: [a.bounds.min[0] + 0.011, 0, a.bounds.min[2]], max: a.bounds.max } };
    const fewer: AssetEntry = { ...a, name: "fewer", triangles: a.triangles - 1 };
    expect(meshFamily([a, near, far, fewer], near)).toBe("Building_Shop_01");
    expect(meshFamily([a, near, far, fewer], far)).toBe("far");
    expect(meshFamily([a, near, far, fewer], fewer)).toBe("fewer");
  });

  it("gives the small row's nine names (the video rental store excluded) six families, and every planned model its family", () => {
    const set = fakeSet();
    const plan = buildingPlan(set.building);
    const fam = new Map(set.building!.map((m) => [m.entry.name, m.family] as const));
    expect(plan.small).not.toContain("store_small_mesh");
    expect(new Set(plan.small.map((n) => fam.get(n))).size).toBe(6);
    expect(plan.small.length).toBe(9);
  });
});

describe("variety (every map)", () => {
  const set = fakeSet();
  const plan = buildingPlan(set.building);
  const traits = traitsOf(set.building);
  const familyOf = (n: string): string => traits.get(n)!.family;
  const familiesIn = (t: LotType): number => new Set(plan[t].map(familyOf)).size;

  it("has at least three families in every lot type, four or more in all but the tall type", () => {
    for (const t of LOT_TYPE_NAMES) expect(familiesIn(t), t).toBeGreaterThanOrEqual(3);
    for (const t of ["small", "house", "large"] as const) expect(familiesIn(t), t).toBeGreaterThanOrEqual(4);
  });

  it("is deterministic and gives every lot a model of its own type", () => {
    for (const { name, town } of maps.filter((m) => /09-|56-/.test(m.name))) {
      const a = pickBuildings(town.lots, plan, traits);
      expect(pickBuildings(town.lots, plan, traits), name).toEqual(a);
      town.lots.forEach((l, i) => expect(a[i] === null || plan[l.type].includes(a[i]!), `${name} ${l.key}`).toBe(true));
      expect(a.filter((x) => x === null).length, name).toBe(0);
    }
  });

  it("gives no two neighbours the same family when their type has three or more", () => {
    let pairs = 0;
    for (const { name, town } of maps) {
      const names = pickBuildings(town.lots, plan, traits);
      const lots = town.lots;
      for (let i = 0; i < lots.length; i++) {
        for (let j = i + 1; j < lots.length; j++) {
          const a = lots[i]!;
          const b = lots[j]!;
          if (a.type !== b.type || Math.hypot(a.x - b.x, a.z - b.z) > 9 || lotGap(a, b) > NEIGHBOUR_GAP) continue;
          pairs++;
          expect(familyOf(names[i]!), `${name} ${a.key} beside ${b.key}`).not.toBe(familyOf(names[j]!));
        }
      }
    }
    expect(pairs).toBeGreaterThan(1000);
  });

  it("does not bring a family back within STREET_REPEAT_GAP lots on one road side (types with four or more families)", () => {
    let checked = 0;
    for (const { name, town } of maps) {
      const names = pickBuildings(town.lots, plan, traits);
      const rows = new Map<string, number[]>();
      town.lots.forEach((l, i) => rows.set(`${l.street}:${l.side}`, [...(rows.get(`${l.street}:${l.side}`) ?? []), i]));
      for (const [k, row] of rows) {
        row.forEach((i, p) => {
          if (familiesIn(town.lots[i]!.type) <= STREET_REPEAT_GAP) return;
          for (let q = Math.max(0, p - STREET_REPEAT_GAP); q < p; q++) {
            checked++;
            expect(familyOf(names[i]!), `${name} ${k} lots ${q} and ${p}`).not.toBe(familyOf(names[row[q]!]!));
          }
        });
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it("keeps every family within FAMILY_SHARE_MAX of its type's lots on a map (types with four or more families)", () => {
    for (const { name, town } of maps) {
      const names = pickBuildings(town.lots, plan, traits);
      for (const t of LOT_TYPE_NAMES) {
        if (familiesIn(t) < 4) continue;
        const idx = town.lots.map((l, i) => (l.type === t ? i : -1)).filter((i) => i >= 0);
        const counts = new Map<string, number>();
        for (const i of idx) counts.set(familyOf(names[i]!), (counts.get(familyOf(names[i]!)) ?? 0) + 1);
        // A type with a handful of lots cannot be spread thinner than its ordinary (not corner-only) families allow.
        const ordinary = new Set(plan[t].filter((n) => traits.get(n)!.corner === false).map(familyOf)).size;
        const most = Math.max(Math.floor(FAMILY_SHARE_MAX * idx.length), Math.ceil(idx.length / ordinary));
        for (const [f, c] of counts) expect(c, `${name} ${t} ${f} of ${idx.length}`).toBeLessThanOrEqual(most);
      }
    }
  });

  it("never places a name in the exclude list, and gives its lots to the others", () => {
    expect(BUILDING_EXCLUDE).toEqual(["simple-town:store_small_mesh"]);
    // The default plan (the code's list) never offers the video rental store, so no map places it (ticket 047).
    for (const { name, town } of maps) expect(pickBuildings(town.lots, plan, traits), name).not.toContain("store_small_mesh");
    const without = buildingPlan(set.building, ["simple-town:Building_Gym", "simple-town:Building_Shop_03"]);
    expect(without.small).not.toContain("Building_Gym");
    expect(without.small).not.toContain("Building_Shop_03");
    expect(without.small).toContain("Building_Shop_04");
    for (const { name, town } of maps.slice(0, 20)) {
      const names = pickBuildings(town.lots, without, traits);
      expect(names, name).not.toContain("Building_Gym");
      expect(names, name).not.toContain("Building_Shop_03");
    }
  });

  it("spreads the small type's ordinary families evenly over all maps: the most used is at most 1.5 times the least used; the corner shop is an add-on on the few valid corner lots", () => {
    const counts = new Map<string, number>();
    let mapsWithCorner = 0;
    const cornerFamily = familyOf("store_corner_mesh");
    for (const { town } of maps) {
      const names = pickBuildings(town.lots, plan, traits);
      if (names.includes("store_corner_mesh")) mapsWithCorner++;
      town.lots.forEach((l, i) => {
        if (l.type === "small") counts.set(familyOf(names[i]!), (counts.get(familyOf(names[i]!)) ?? 0) + 1);
      });
    }
    // The evenness is over the non-corner families: a corner model takes a lot only where it is valid, so its count is the number of such lots, not a share.
    const ordinary = [...counts].filter(([f]) => f !== cornerFamily).map(([, c]) => c);
    expect(ordinary.length).toBe(5);
    expect(Math.max(...ordinary) / Math.min(...ordinary)).toBeLessThanOrEqual(1.5);
    // It does appear on maps that have a valid lot (its open side, -x, meets a cross street) and on no other.
    expect(counts.get(cornerFamily) ?? 0).toBeGreaterThan(0);
    expect(counts.get(cornerFamily) ?? 0).toBeLessThan(Math.min(...ordinary) / 4);
    expect(mapsWithCorner).toBeGreaterThan(0);
    expect(mapsWithCorner).toBeLessThan(maps.length);
  });

  it("no longer favours a name that has three: Building_Shop_03..05 together are one family's share, not three names'", () => {
    const counts = new Map<string, number>();
    for (const { town } of maps) {
      const names = pickBuildings(town.lots, plan, traits);
      town.lots.forEach((l, i) => {
        if (l.type === "small") counts.set(names[i]!, (counts.get(names[i]!) ?? 0) + 1);
      });
    }
    const shopB = ["03", "04", "05"].reduce((s, n) => s + (counts.get(`Building_Shop_${n}`) ?? 0), 0);
    const gym = counts.get("Building_Gym") ?? 0;
    // One family against one family: close, where 041's per-name hash made the three-name shop about three times the gym.
    expect(shopB / gym).toBeLessThan(1.5);
    expect(shopB / gym).toBeGreaterThan(0.66);
  });
});

describe("the town follows the saved calibration file (ticket 045 A)", () => {
  const NOW = new Date("2026-11-18T10:00:00.000Z");
  const SAVED = applyCalibrationPatch(
    applyCalibrationPatch(null, { key: "simple-town:Building_Gym", entry: { front: "+x" } }, NOW),
    { key: "simple-town:house_mesh", entry: { exclude: true } },
    NOW,
  );

  /** The fake model set through the real loader: tables merged with `saved`, fake GLB roots, each given a marker one metre along its (merged) front. */
  async function loaded(saved: CalibrationFile | null): Promise<ModelSet> {
    const tables = effectiveFronts({ fronts: BUILDING_FRONTS, exclude: BUILDING_EXCLUDE }, saved, () => {});
    const set = await loadModels({
      fetchJson: async () => MANIFEST,
      loadGlb: async () => {
        const glb = new Group();
        for (const e of ENTRIES) {
          const root = new Group();
          root.name = e.name;
          glb.add(root);
        }
        return glb;
      },
      dir: "models/",
      info: () => {},
      fronts: tables.fronts,
      exclude: tables.exclude,
    });
    for (const m of set.building ?? []) {
      const marker = new Object3D();
      marker.name = "front-marker";
      const [ax, az] = frontAxis(m.front);
      marker.position.set(ax, 0, az);
      m.root.add(marker);
    }
    return set;
  }

  it("turns every Building_Gym clone to its road with the saved +x front, and places no house_mesh, on every map (09-shrine-circuit included)", async () => {
    const set = await loaded(SAVED);
    expect(set.building!.find((m) => m.entry.name === "Building_Gym")!.front).toBe("+x");
    expect(set.building!.some((m) => m.entry.name === "house_mesh")).toBe(false);
    let gyms = 0;
    let shrineClones = 0;
    for (const { name, town } of maps) {
      const bundle = standIn(town.lots);
      const applied = applyModels(bundle, set);
      const models = bundle.slots.models;
      models.updateMatrixWorld(true);
      const roads = new Map(town.roads.map((r) => [r.id, r] as const));
      if (name.includes("09-shrine-circuit")) shrineClones = applied.buildings.length;
      applied.buildings.forEach((p, k) => {
        expect(p.model.entry.name, name).not.toBe("house_mesh");
        if (p.model.entry.name !== "Building_Gym") return;
        const lot = town.lots[p.lot]!;
        const clone = models.children[k]!;
        const at = clone.getWorldPosition(new Vector3());
        const tip = clone.getObjectByName("front-marker")!.getWorldPosition(new Vector3());
        const q = nearestOnRoad(roads.get(lot.street)!, lot.x, lot.z);
        const dx = tip.x - at.x;
        const dz = tip.z - at.z;
        const wx = q.x - lot.x;
        const wz = q.z - lot.z;
        const cos = (dx * wx + dz * wz) / (Math.hypot(dx, dz) * Math.hypot(wx, wz));
        expect((Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI, `${name} ${lot.key}`).toBeLessThan(0.5);
        gyms++;
      });
    }
    expect(shrineClones).toBeGreaterThan(0);
    expect(gyms).toBeGreaterThan(20);
  });

  it("with no file, the clones are exactly the code's: the same lots, models, spots and turns as the table alone", async () => {
    const none = await loaded(null);
    const code = fakeSet(BUILDING_FRONTS);
    // The loaded set leaves out BUILDING_EXCLUDE (047); the fake set lists every model.
    const kept = code.building!.filter((m) => !BUILDING_EXCLUDE.includes(`${m.pack}:${m.entry.name}`));
    expect(none.building!.map((m) => [m.entry.name, m.front, m.corner])).toEqual(kept.map((m) => [m.entry.name, m.front, m.corner]));
    for (const { name, town } of maps.slice(0, 12)) {
      const a = applyModels(standIn(town.lots), none).buildings.map((p) => [p.lot, p.model.entry.name, p.x, p.z, p.yaw]);
      const b = applyModels(standIn(town.lots), code).buildings.map((p) => [p.lot, p.model.entry.name, p.x, p.z, p.yaw]);
      expect(a, name).toEqual(b);
    }
  });
});
