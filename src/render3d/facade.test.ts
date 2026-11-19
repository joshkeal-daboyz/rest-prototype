/**
 * Ticket 057 A: the measured wall planes (`facade.ts`) and `assembleStack`'s `align: "wall"`. Pure: fixture entries typed in from the converted City Pack manifest (18 Nov 2026), no WebGL, no
 * timers. `assets/private/` is read only inside the one geometry check, which skips when the GLB is absent (CI, a fresh checkout).
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { AssetEntry, CalibrationKey } from "../core";
import { WALL_BAND_M, WALL_FLOOR_REACH_M, WALL_FRONT_M, WALL_GROUND_Y_M, WALL_MIN_AREA_M2, WALL_REACH_M, WALL_SIDE_M, measureWallPlane, wallOffset, type WallRule } from "./facade";
import { BUILDING_FRONTS, type FrontTable } from "./models";
import { STACK_STYLES, assembleStack, stackKeys, type StackStyle } from "./stacks";
import type { CornerSide } from "./town";

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
const entryOf = (name: string, w: number, h: number, d: number): AssetEntry => ({
  name,
  source: `${name}.fbx`,
  bounds: { min: [-w / 2, 0, -d / 2], max: [w / 2, h, d / 2] },
  triangles: 100,
  textures: [],
  missingTextures: [],
  warnings: [],
});
const ENTRIES: ReadonlyMap<CalibrationKey, AssetEntry> = new Map(SIZES.map((s) => [`city-pack:${s[0]}` as CalibrationKey, entryOf(...s)] as const));

const style = (id: string): StackStyle => STACK_STYLES.find((s) => s.id === id)!;
const k = (name: string): CalibrationKey => `city-pack:${name}`;

describe("the pinned wall planes (criterion 1)", () => {
  // The values measured on the converted City Pack (18 Nov 2026), typed in: a change to the table must change this too.
  const FRONT: Record<string, number> = {
    SM_Bld_Shop_01: 0.219,
    SM_Bld_Shop_02: 0.425,
    SM_Bld_Shop_03: 0.103,
    SM_Bld_Shop_04: 0.557,
    SM_Bld_Shop_05: 0.076,
    SM_Bld_Shop_06: 0.52,
    SM_Bld_Apartment_Door_01: 0.529,
    SM_Bld_Apartment_Door_02: 0.058,
    SM_Bld_Shop_Corner_01: 0.211,
    SM_Bld_Shop_Corner_02: 0.166,
    SM_Bld_Apartment_01: 0.196,
    SM_Bld_Apartment_Corner_01: 0.196,
    SM_Bld_Apartment_Stack_01: 0.196,
    SM_Bld_Apartment_02: 0.129,
    SM_Bld_Apartment_Corner_02: 0.129,
    SM_Bld_Apartment_Stack_02: 0.129,
    SM_Bld_Apartment_03: 0.351,
    SM_Bld_Apartment_Corner_03: 0.351,
    SM_Bld_Apartment_Stack_03: 0.351,
    SM_Bld_OfficeOld_Small_Base_01: 0.348,
    SM_Bld_OfficeOld_Small_Floor_01: 0,
    SM_Bld_OfficeOld_Large_Base_01: 0.348,
    SM_Bld_OfficeOld_Large_Floor_01: 0,
    SM_Bld_OfficeOctagon_Base_01: 0.595,
    SM_Bld_OfficeOctagon_Floor_01: 0.232,
  };
  const SIDE: Record<string, number> = {
    SM_Bld_Shop_Corner_01: 0.188,
    SM_Bld_Shop_Corner_02: 0.166,
    SM_Bld_Apartment_Corner_01: 0,
    SM_Bld_Apartment_Corner_02: 0.085,
    SM_Bld_Apartment_Corner_03: 0.14,
  };

  it("holds exactly the measured front and side distances, and no other key", () => {
    expect(Object.fromEntries(Object.entries(WALL_FRONT_M).map(([key, v]) => [key.slice("city-pack:".length), v]))).toEqual(FRONT);
    expect(Object.fromEntries(Object.entries(WALL_SIDE_M).map(([key, v]) => [key.slice("city-pack:".length), v]))).toEqual(SIDE);
  });

  it("has a wall for every base, door, corner, shop, floor and stack3 piece of every recipe, and none for a roof", () => {
    const missing: string[] = [];
    for (const s of STACK_STYLES) {
      for (const key of [...s.base.mid, ...(s.base.door ?? []), ...s.base.corner, ...s.floor.mid, ...s.floor.corner, ...(s.floor.stack3 ?? [])]) {
        if (!(key in WALL_FRONT_M)) missing.push(`${s.id} ${key}`);
      }
      for (const key of [...s.base.corner, ...s.floor.corner]) if (!(key in WALL_SIDE_M)) missing.push(`${s.id} ${key} side`);
      for (const key of [...s.roof.mid, ...s.roof.corner]) {
        expect(key in WALL_FRONT_M, key).toBe(false);
        expect(key in WALL_SIDE_M, key).toBe(false);
      }
    }
    expect(missing).toEqual([]);
  });

  it("keeps every wall within the reach a sill, frame or sign may stand past it, and every recipe key in the table is a recipe key", () => {
    for (const [key, v] of [...Object.entries(WALL_FRONT_M), ...Object.entries(WALL_SIDE_M)]) {
      expect(v, key).toBeGreaterThanOrEqual(0);
      expect(v, key).toBeLessThanOrEqual(WALL_REACH_M);
    }
    const all = new Set(STACK_STYLES.flatMap((s) => stackKeys(s)));
    for (const key of [...Object.keys(WALL_FRONT_M), ...Object.keys(WALL_SIDE_M)]) expect(all.has(key as CalibrationKey), key).toBe(true);
  });
});

describe("wallOffset", () => {
  const shop2 = k("SM_Bld_Shop_02");
  const corner = k("SM_Bld_Shop_Corner_01");

  it("reads the front table on a piece whose front faces the road, and the side table on one whose open side does", () => {
    expect(wallOffset(shop2, "front")).toBe(0.425);
    expect(wallOffset(corner, "front")).toBe(0.211);
    expect(wallOffset(corner, "open")).toBe(0.188);
    expect(wallOffset(corner, "open", BUILDING_FRONTS, "+x")).toBe(0.188);
  });

  it("is 0 for a key with no entry (a roof, an unknown key) and for an open side that is not the measured +x", () => {
    expect(wallOffset(k("SM_Bld_Apartment_Roof_01"), "front")).toBe(0);
    expect(wallOffset(k("SM_Bld_Nothing_01"), "front")).toBe(0);
    expect(wallOffset(corner, "open", BUILDING_FRONTS, "-x")).toBe(0);
  });

  it("is 0 when the front in the table passed is not the face that was measured (a front recalibrated in the gallery)", () => {
    const turned: FrontTable = { ...BUILDING_FRONTS, [shop2]: { front: "-z" } };
    expect(wallOffset(shop2, "front", turned)).toBe(0);
    expect(wallOffset(corner, "open", { ...BUILDING_FRONTS, [corner]: { front: "+x", corner: true, open: "+x" } })).toBe(0);
  });
});

describe("measureWallPlane on a typed-in mesh", () => {
  // A front-facing quad (two triangles) at z = `z` from x0 to x1 and y0 to y1, normal +z.
  const quad = (z: number, x0: number, x1: number, y0: number, y1: number): number[] => [x0, y0, z, x1, y0, z, x1, y1, z, x0, y0, z, x1, y1, z, x0, y1, z];

  it("picks the largest front-facing plane within the reach of the front bound, ignoring a bigger one deeper inside", () => {
    const sign = quad(2.5, -2, 2, 2.2, 2.8); // 2.4 m2, the front bound
    const frame = quad(2.3, -2, 2, 0, 2.1); // 8.4 m2, 0.2 behind
    const interior = quad(0.5, -2, 2, 0, 2.1); // 8.4 m2 too, but 2.0 behind
    const m = measureWallPlane([...sign, ...frame, ...interior], null, "+z");
    expect(m).not.toBeNull();
    expect(m!.bound).toBeCloseTo(2.5, 9);
    expect(m!.plane).toBeCloseTo(2.3, 9);
    expect(m!.offset).toBeCloseTo(0.2, 9);
    expect(m!.area).toBeCloseTo(8.4, 9);
  });

  it("reads an index list, groups centroids within the tolerance into one plane, and breaks a tie by the frontmost plane", () => {
    const pos = [...quad(1, 0, 1, 0, 1), ...quad(1.01, 1, 2, 0, 1), ...quad(0.9, 3, 4, 0, 1)];
    const idx = Array.from({ length: pos.length / 3 }, (_, i) => i);
    const m = measureWallPlane(pos, idx, "+z");
    // The first two quads are one plane of 2 m2 at about 1.005; the third (1 m2) is out of reach of nothing but smaller.
    expect(m!.area).toBeCloseTo(2, 9);
    expect(m!.plane).toBeCloseTo(1.005, 3);
    const tie = measureWallPlane([...quad(1, 0, 1, 0, 1), ...quad(0.8, 3, 4, 0, 1)], null, "+z");
    expect(tie!.plane).toBeCloseTo(1, 9);
  });

  it("ignores back-facing triangles, triangles above the band, planes under the least area, and planes past the reach", () => {
    const back = quad(2, 0, 3, 0, 3); // rewound below, so its normal points at -z
    const flipped: number[] = [];
    for (let t = 0; t < back.length; t += 9) flipped.push(...back.slice(t, t + 3), ...back.slice(t + 6, t + 9), ...back.slice(t + 3, t + 6));
    expect(measureWallPlane(flipped, null, "+z")).toBeNull();
    expect(measureWallPlane(quad(2, 0, 3, WALL_BAND_M + 0.1, WALL_BAND_M + 3), null, "+z")).toBeNull();
    expect(measureWallPlane(quad(2, 0, 0.6, 0, 1), null, "+z")!.area).toBeGreaterThanOrEqual(WALL_MIN_AREA_M2);
    expect(measureWallPlane(quad(2, 0, 0.4, 0, 1), null, "+z")).toBeNull();
    // A big plane 0.6 m behind the bound is out of reach, so the small bound plane (too small) leaves nothing.
    expect(measureWallPlane([...quad(2, 0, 0.2, 0, 1), ...quad(1.4, 0, 4, 0, 2)], null, "+z")).toBeNull();
  });

  it("a sign band at the front bound loses to a shopfront that reaches the ground, under the ground rule (057 A review)", () => {
    const sign = quad(2.8, -2.4, 2.4, 2.2, 2.84); // 3.07 m2, y 2.2 to 2.84: the bound, but it hangs in the air
    const shopfront = quad(2.5, -2.4, 2.4, 0, 2.1); // 10.1 m2, 0.3 back, reaches y = 0
    const pos = [...sign, ...shopfront];
    const ground = measureWallPlane(pos, null, "+z", "ground");
    expect(ground!.offset).toBeCloseTo(0.3, 9);
    expect(ground!.area).toBeCloseTo(10.08, 9);
    // With only the sign in reach (the shopfront too small) the ground rule finds no wall at all, where the floor rule takes the sign.
    const small = [...sign, ...quad(2.5, -0.2, 0.2, 0, 1)];
    expect(measureWallPlane(small, null, "+z", "ground")).toBeNull();
    expect(measureWallPlane(small, null, "+z", "floor")!.offset).toBeCloseTo(0, 9);
    expect(WALL_GROUND_Y_M).toBe(0.3);
  });

  it("reaches 0.6 m for a ground piece and 0.5 m for a floor piece", () => {
    const pos = quad(1.45, -2, 2, 0, 2); // 0.55 behind a bound of 2.0 set by a small plane
    const all = [...pos, ...quad(2, -0.1, 0.1, 0, 0.2)];
    expect(WALL_REACH_M).toBe(0.6);
    expect(WALL_FLOOR_REACH_M).toBe(0.5);
    expect(measureWallPlane(all, null, "+z", "ground")!.offset).toBeCloseTo(0.55, 9);
    expect(measureWallPlane(all, null, "+z", "floor")).toBeNull();
  });

  it("measures the +x face of a mesh the same way", () => {
    // A quad in the plane x = 2, normal +x: vertices wound (y, z) counter-clockwise seen from +x.
    const wall = [2, 0, 0, 2, 2, 0, 2, 2, 3, 2, 0, 0, 2, 2, 3, 2, 0, 3];
    const m = measureWallPlane(wall, null, "+x");
    expect(m!.plane).toBeCloseTo(2, 9);
    expect(m!.area).toBeCloseTo(6, 9);
    expect(measureWallPlane(wall, null, "-x")).toBeNull();
  });
});

describe("assembleStack's align option (criterion 2)", () => {
  const lot = (key: string, cornerSides: CornerSide[] = []): { type: "large"; key: string; cornerSides: CornerSide[] } => ({ type: "large", key, cornerSides });
  const SPEC = { frontage: 40, depth: 6, cap: 16 };
  const cs = (side: "+x" | "-x"): CornerSide => ({ side, road: "r" });

  it("is back-aligned by default: an explicit \"back\" gives exactly the stack with no option, on every style and type (the ladder's stacks are unchanged)", () => {
    for (const s of STACK_STYLES) {
      for (const type of ["small", "house", "large", "tall"] as const) {
        const key = `${s.id}:${type}`;
        const none = assembleStack(s, { type, key, cornerSides: [] }, ENTRIES);
        const back = assembleStack(s, { type, key, cornerSides: [] }, ENTRIES, BUILDING_FRONTS, { align: "back" });
        expect(back, key).toEqual(none);
      }
    }
  });

  it("lays every piece's wall plane on z = 0 with the wall: a piece's front bound stands its wall offset in front of it, and a roof (no wall) puts its front bound on z = 0", () => {
    for (const id of ["apartment-01", "apartment-02", "apartment-03"]) {
      for (const bays of [2, 3, 4]) {
        const st = assembleStack(style(id), lot(`${id}:${bays}`), ENTRIES, BUILDING_FRONTS, { spec: SPEC, bays, align: "wall" });
        expect(st, `${id} ${bays}`).not.toBeNull();
        for (const p of st!.pieces) {
          const front = p.z + p.d / 2;
          if (p.role === "roof") expect(front, p.key).toBeCloseTo(0, 9);
          else expect(front - wallOffset(p.key, p.street), `${p.key} ${p.role}`).toBeCloseTo(0, 9);
          expect(front, p.key).toBeLessThanOrEqual(WALL_REACH_M + 1e-9);
        }
        // Behind the line: depth_m is the backmost face to z = 0.
        expect(st!.depth_m).toBeCloseTo(Math.max(...st!.pieces.map((p) => -(p.z - p.d / 2))), 9);
        expect(st!.depth_m).toBeLessThanOrEqual(SPEC.depth);
      }
    }
  });

  it("puts a corner piece's open-side wall on the line when it is turned to show that side to the road, at either end", () => {
    for (const side of ["-x", "+x"] as const) {
      const st = assembleStack(style("apartment-03"), lot(`corner${side}`, [cs(side)]), ENTRIES, BUILDING_FRONTS, { spec: SPEC, bays: 3, align: "wall" });
      expect(st).not.toBeNull();
      const turned = st!.pieces.filter((p) => p.street === "open");
      const straight = st!.pieces.filter((p) => p.street === "front" && st!.columns[p.column]!.corner !== null);
      expect(turned.length + straight.length).toBeGreaterThan(0);
      for (const p of turned) expect(p.z + p.d / 2 - wallOffset(p.key, "open"), p.key).toBeCloseTo(0, 9);
      for (const p of straight) expect(p.z + p.d / 2 - wallOffset(p.key, "front"), p.key).toBeCloseTo(0, 9);
    }
  });

  it("moves each piece by exactly the difference between the two alignments, and no piece in x or y", () => {
    const common = { spec: SPEC, bays: 3, floors: 3 };
    const a = assembleStack(style("apartment-02"), lot("same"), ENTRIES, BUILDING_FRONTS, { ...common, align: "back" })!;
    const b = assembleStack(style("apartment-02"), lot("same"), ENTRIES, BUILDING_FRONTS, { ...common, align: "wall" })!;
    expect(b.pieces.map((p) => p.key)).toEqual(a.pieces.map((p) => p.key));
    expect(b.pieces.map((p) => [p.x, p.y, p.yaw])).toEqual(a.pieces.map((p) => [p.x, p.y, p.yaw]));
    expect(b.pieces.map((p) => p.z)).not.toEqual(a.pieces.map((p) => p.z));
    expect(b.columns).toEqual(a.columns);
    expect(b.width_m).toBe(a.width_m);
  });

  it("is no deeper behind the line than back alignment is front to back (the wall line cuts off the sills), so a row still closes to a corner block's back wall", () => {
    for (const id of ["apartment-01", "apartment-02", "apartment-03"]) {
      const a = assembleStack(style(id), lot(id), ENTRIES, BUILDING_FRONTS, { spec: SPEC, bays: 3, align: "back" })!;
      const b = assembleStack(style(id), lot(id), ENTRIES, BUILDING_FRONTS, { spec: SPEC, bays: 3, align: "wall" })!;
      expect(b.depth_m).toBeLessThanOrEqual(a.depth_m + 1e-9);
    }
  });

  it("aligns an office on its wall too (the footprint styles are not centred in wall mode)", () => {
    const st = assembleStack(style("office-old-small"), { type: "tall", key: "office", cornerSides: [] }, ENTRIES, BUILDING_FRONTS, { floors: "max", align: "wall" });
    expect(st).not.toBeNull();
    for (const p of st!.pieces) if (p.role !== "roof") expect(p.z + p.d / 2 - wallOffset(p.key, p.street), p.key).toBeCloseTo(0, 9);
  });

  it("falls back to the bounds for a front recalibrated away from the measured face", () => {
    const floor = k("SM_Bld_Apartment_02");
    const odd: FrontTable = { ...BUILDING_FRONTS, [floor]: { front: "-z" } };
    const st = assembleStack(style("apartment-02"), lot("odd"), ENTRIES, odd, { spec: SPEC, bays: 3, floors: 2, align: "wall" });
    const floors = st!.pieces.filter((p) => p.key === floor);
    expect(floors.length).toBeGreaterThan(0);
    // A recalibrated key has wall offset 0: its front bound is on the line, not its measured wall.
    for (const p of floors) expect(p.z + p.d / 2).toBeCloseTo(0, 9);
  });
});

// ---- the real geometry ----

interface Gltf {
  nodes: { name?: string; mesh?: number; children?: number[] }[];
  meshes: { primitives: { attributes: { POSITION: number }; indices?: number }[] }[];
  accessors: { bufferView: number; byteOffset?: number; count: number; componentType: number }[];
  bufferViews: { byteOffset?: number; byteStride?: number }[];
}

describe("the wall planes agree with the converted City Pack geometry when this machine has it (skipped when it does not)", () => {
  it("re-measures every key within 0.02 m, on the front face and, for a corner key, the open side", { timeout: 120000 }, (ctx) => {
    const file = join("assets", "private", "out", "city-pack.glb");
    if (!existsSync(file)) ctx.skip();
    const glb = readFileSync(file);
    const jsonLen = glb.readUInt32LE(12);
    const gltf = JSON.parse(glb.subarray(20, 20 + jsonLen).toString("utf8")) as Gltf;
    const bin = glb.subarray(20 + jsonLen + 8);
    const mesh = (name: string): { positions: number[]; indices: number[] } => {
      const root = gltf.nodes.find((n) => n.name === name);
      expect(root, name).toBeDefined();
      const positions: number[] = [];
      const indices: number[] = [];
      const walk = (n: { mesh?: number; children?: number[] }): void => {
        for (const prim of n.mesh !== undefined ? gltf.meshes[n.mesh]!.primitives : []) {
          const a = gltf.accessors[prim.attributes.POSITION]!;
          const bv = gltf.bufferViews[a.bufferView]!;
          const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
          const first = positions.length / 3;
          for (let i = 0; i < a.count; i++) {
            const at = base + i * (bv.byteStride ?? 12);
            positions.push(bin.readFloatLE(at), bin.readFloatLE(at + 4), bin.readFloatLE(at + 8));
          }
          const ia = gltf.accessors[prim.indices!]!;
          const ib = gltf.bufferViews[ia.bufferView]!;
          const at0 = (ib.byteOffset ?? 0) + (ia.byteOffset ?? 0);
          for (let i = 0; i < ia.count; i++) indices.push(first + (ia.componentType === 5125 ? bin.readUInt32LE(at0 + i * 4) : bin.readUInt16LE(at0 + i * 2)));
        }
        for (const c of n.children ?? []) walk(gltf.nodes[c]!);
      };
      walk(root!);
      return { positions, indices };
    };
    const bad: string[] = [];
    // A key that is a base in any recipe is measured by the ground rule; every other is a floor.
    const grounds = new Set<string>(STACK_STYLES.flatMap((st) => [...st.base.mid, ...(st.base.door ?? []), ...st.base.corner]));
    for (const [table, face] of [
      [WALL_FRONT_M, "+z"],
      [WALL_SIDE_M, "+x"],
    ] as const) {
      for (const [key, want] of Object.entries(table)) {
        const m = mesh(key.slice("city-pack:".length));
        const rule: WallRule = grounds.has(key) ? "ground" : "floor";
        const got = measureWallPlane(m.positions, m.indices, face, rule);
        if (!got) bad.push(`${key} ${face}: no wall found`);
        else if (Math.abs(got.offset - want!) > 0.02) bad.push(`${key} ${face}: measured ${got.offset.toFixed(3)}, table ${want}`);
      }
    }
    // The front a piece's wall was measured on is the one BUILDING_FRONTS names.
    for (const key of Object.keys(WALL_FRONT_M)) if (BUILDING_FRONTS[key as CalibrationKey]?.front !== "+z") bad.push(`${key}: front is not +z`);
    expect(bad).toEqual([]);
  });
});
