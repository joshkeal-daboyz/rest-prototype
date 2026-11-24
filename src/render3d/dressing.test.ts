/**
 * Ticket 052 A: the dressing slots and caps for the City Pack stacks. Pure: fixture entries with names and sizes typed in as numbers from the converted
 * City Pack manifest (18 Nov 2026), no GLB, no WebGL, no timers. Nothing is read from assets/private/. The only file read is this module's own source (to
 * check that no "never used" key appears in it).
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { AssetEntry, CalibrationKey } from "../core";
import { escapeCheck } from "./escapes";
import type { FrontTable } from "./models";
import { STACK_STYLES, assembleStack, type Stack, type StackSide, type StackStyle } from "./stacks";
import { LOT_TYPES, LOT_TYPE_NAMES, WORLD_PER_METRE, type CornerSide, type LotType } from "./kitunits";
import { AWNINGS, AWNING_CORNER, ATM_PER_RUN, BILLBOARD_FACES, BILLBOARD_STRUCTURE, DOOR_CANOPIES, DRESS_MAX, DRESS_PER_BAY_MAX, DRESS_SLOTS, ESCAPES, GLASS_INSET_M, KERB_FROM_FRONT_M, AWNING_KERB_M, NOVELTY_SIGNS, P_ATM, P_AWNING, P_CANOPY, P_PLANTER, P_ROOF_LARGE, P_ROOF_SMALL, P_SIGN, P_WALL_AC, ROOF_EDGE_M, SHOP_GLASS, SIGNS_BLADE, WALL_PROPS_PER_BLOCK, dressBlock, dressKeys, dressRoleOf, dressStack, dressTown, dressUnit, type DressPiece, type DressSlotKind, } from "./dressing";

// ---- fixture: [name, width, height, depth] in metres, centred bounds. Buildings are 050 A's; dressing is from the manifest (18 Nov 2026). ----
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
const ENTRIES: ReadonlyMap<CalibrationKey, AssetEntry> = new Map(SIZES.map(([n, w, h, d]) => [keyOf(n), entryOf(n, w, h, d)]));
const without = (pred: (key: CalibrationKey) => boolean): ReadonlyMap<CalibrationKey, AssetEntry> => new Map([...ENTRIES].filter(([key]) => !pred(key)));
const rawOf = (key: CalibrationKey): [number, number, number] => {
  const b = ENTRIES.get(key)!.bounds;
  return [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]];
};

const NO_FRONTS: FrontTable = {};
// a "-z" and a "+x" among the shop and floor pieces, as in 050 A's tests, and a "-z" glass
const MIXED: FrontTable = {
  [keyOf("SM_Bld_Apartment_01")]: { front: "+x" },
  [keyOf("SM_Bld_Apartment_Stack_01")]: { front: "+x" },
  [keyOf("SM_Bld_Apartment_Roof_01")]: { front: "-x" },
  [keyOf("SM_Bld_Shop_01")]: { front: "-z" },
  [keyOf("SM_Bld_Shop_04")]: { front: "+x" },
  [keyOf("SM_Bld_Shop_Corner_01")]: { front: "-z", corner: true, open: "-x" },
  [keyOf("SM_Bld_Apartment_Corner_01")]: { front: "-x" },
  [keyOf("SM_Bld_Apartment_Door_01")]: { front: "-z" },
  [keyOf("SM_Bld_Shop_01_Glass")]: { front: "-z" },
  [keyOf("SM_Prop_Sign_Cafe_01")]: { front: "-z" },
};
const cs = (...sides: StackSide[]): CornerSide[] => sides.map((side) => ({ side, road: "x" }));
const SIDE_SETS: StackSide[][] = [[], ["+x"], ["-x"], ["-x", "+x"]];
const BIG_H = 60 * WORLD_PER_METRE; // a cap that never binds
const hMaxOf = (type: LotType): number => LOT_TYPES[type].cap * WORLD_PER_METRE;

interface Block {
  style: StackStyle;
  type: LotType;
  key: string;
  stack: Stack;
  fronts: FrontTable;
}
function blocks(styles: readonly StackStyle[], types: readonly LotType[], sideSets: StackSide[][], fronts: FrontTable, n: number, tag = "b"): Block[] {
  const out: Block[] = [];
  for (const style of styles)
    for (const type of types)
      for (const sides of sideSets)
        for (let i = 0; i < n; i++) {
          const key = `${tag}${i}:${type}:${sides.join("")}`;
          const stack = assembleStack(style, { type, key, cornerSides: cs(...sides) }, ENTRIES, fronts);
          if (stack) out.push({ style, type, key, stack, fronts });
        }
  return out;
}
const RUN = { id: "r", index: 0, lowest: false };
const dress = (b: Block, hMax = BIG_H, run = RUN): DressPiece[] => dressStack(b.stack, { key: b.key, hMax }, run, ENTRIES, b.fronts);

const SWEEP: Block[] = [
  ...blocks(STACK_STYLES, LOT_TYPE_NAMES, SIDE_SETS, NO_FRONTS, 6),
  ...blocks(STACK_STYLES, LOT_TYPE_NAMES, SIDE_SETS, MIXED, 6),
];
const APT = STACK_STYLES.filter((s) => s.id.startsWith("apartment"));
const FIFTY = (types: readonly LotType[] = ["house", "large", "tall"]): Block[] => blocks(APT, types, [[]], NO_FRONTS, 50, "f");

const FRONT_SLOTS: DressSlotKind[] = ["glass", "awning", "sign", "wall", "escape", "wallUpper"];

describe("the keys", () => {
  const NEVER = /SK_|SM_Veh_|SM_Env_Skyline|PalmTree|LightPole|TrafficLight|PowerBox|Power_Cables|Apartment_Stairs|SM_Prop_Sign_(XXX|Police|Hospital|FireDepartment)|ShopInterior|Pipe_Present|Buger|SM_Prop_Soda_|SmartPhone|SM_Prop_Paper_|Police_Baton/;

  it("every key in the slot tables is city-pack:<name> and in the fixture", () => {
    const keys = dressKeys();
    expect(keys.length).toBeGreaterThan(60);
    for (const key of keys) {
      expect(key).toMatch(/^city-pack:SM_/);
      expect(ENTRIES.has(key), `${key} is not in the fixture`).toBe(true);
      expect(key).not.toMatch(NEVER);
    }
    expect(NOVELTY_SIGNS).toHaveLength(17);
    expect(SHOP_GLASS).toHaveLength(7);
    for (const role of Object.keys(DRESS_SLOTS)) expect(DRESS_SLOTS[role as keyof typeof DRESS_SLOTS].length, role).toBeGreaterThan(0);
  });

  it("no never-used key name appears anywhere in dressing.ts or furniture.ts", () => {
    for (const file of ["./dressing.ts", "./furniture.ts"]) {
      const path = fileURLToPath(new URL(file, import.meta.url));
      if (!existsSync(path)) continue;
      expect(readFileSync(path, "utf8"), file).not.toMatch(NEVER);
    }
  });

  it("dressRoleOf names the 050 roles", () => {
    const p = (key: string, role: "base" | "floor" | "roof") => dressRoleOf({ key: keyOf(key), role });
    expect(p("SM_Bld_Shop_01", "base")).toBe("base.mid");
    expect(p("SM_Bld_Apartment_Door_02", "base")).toBe("base.door");
    expect(p("SM_Bld_Shop_Corner_02", "base")).toBe("base.corner");
    expect(p("SM_Bld_Apartment_03", "floor")).toBe("floor.mid");
    expect(p("SM_Bld_Apartment_Corner_03", "floor")).toBe("floor.corner");
    expect(p("SM_Bld_Apartment_Roof_01", "roof")).toBe("roof.mid");
    expect(p("SM_Bld_Apartment_Roof_Corner_01", "roof")).toBe("roof.corner");
  });
});

describe("attachment", () => {
  const EPS = 1e-6;
  /** The columns a prop may span: its own, or (on the ground row) every column its shop piece spans (a two-bay shop). */
  const colRange = (stack: Stack, p: DressPiece): [number, number] => {
    const c = stack.columns[p.column]!;
    const base = stack.pieces.find((q) => q.role === "base" && Math.abs(q.x - c.x) <= q.w / 2 + EPS && ["glass", "awning", "sign", "wall"].includes(p.slot));
    const spanned = base ? stack.columns.filter((o) => Math.abs(o.x - base.x) <= base.w / 2 + EPS) : [c];
    return [Math.min(...spanned.map((o) => o.x - o.w / 2)), Math.max(...spanned.map((o) => o.x + o.w / 2))];
  };
  /** Ticket 058: an escape piece stands against the storey it serves, and where the sill is low its legs hang under that storey's floor by up to this much (Apartment_02: 0.34 m). */
  const ESCAPE_LEG_REACH_M = 0.4;
  const isWrap = (p: DressPiece): boolean => (p.slot === "glass" || AWNING_CORNER.includes(p.key)) && rawOf(p.key)[2] > 1;

  it("every front-face prop's back lies on its host's front face, inside its column, and short of the kerb", () => {
    let checked = 0;
    for (const b of SWEEP) {
      for (const p of dress(b)) {
        if (!FRONT_SLOTS.includes(p.slot)) continue;
        checked++;
        const [lo, hi] = colRange(b.stack, p);
        expect(p.x - p.w / 2, `${b.key} ${p.key} left`).toBeGreaterThanOrEqual(lo - EPS);
        expect(p.x + p.w / 2, `${b.key} ${p.key} right`).toBeLessThanOrEqual(hi + EPS);
        if (isWrap(p)) {
          const base = b.stack.pieces.find((q) => q.role === "base" && Math.abs(q.x - p.x) < EPS && Math.abs(q.z - p.z) < EPS);
          expect(base, `${b.key} ${p.key} wrap`).toBeDefined();
          continue;
        }
        const back = p.z - p.d / 2;
        const inset = p.slot === "glass" ? GLASS_INSET_M : 0;
        const host = b.stack.pieces.filter((q) => q.role !== "roof" && Math.abs(q.x - p.x) <= q.w / 2 + EPS && q.y <= p.y + (p.slot === "escape" ? ESCAPE_LEG_REACH_M : EPS) && Math.abs(q.z + q.d / 2 - inset - back) < EPS);
        expect(host.length, `${b.key} ${p.key} y=${p.y}: back ${back}`).toBeGreaterThan(0);
        expect(p.z + p.d / 2, `${b.key} ${p.key} kerb`).toBeLessThanOrEqual(KERB_FROM_FRONT_M + EPS);
        if (p.slot === "awning" && !DOOR_CANOPIES.includes(p.key)) expect(p.z + p.d / 2, `${b.key} awning`).toBeLessThanOrEqual(KERB_FROM_FRONT_M - AWNING_KERB_M + EPS);
      }
    }
    expect(checked).toBeGreaterThan(2000);
  });

  it("every roof prop's base is on the roof top, its footprint inside the roof inset and its column", () => {
    let checked = 0;
    for (const b of SWEEP) {
      for (const p of dress(b)) {
        if (p.slot !== "roofSmall" && p.slot !== "roofLarge") continue;
        checked++;
        const roof = b.stack.pieces.find((q) => q.role === "roof" && q.column === p.column)!;
        const col = b.stack.columns[p.column]!;
        const top = roof.y + roof.h;
        if (BILLBOARD_FACES.includes(p.key)) expect(p.y).toBeGreaterThan(top);
        else expect(p.y, `${b.key} ${p.key}`).toBeCloseTo(top, 6);
        expect(p.x - p.w / 2).toBeGreaterThanOrEqual(roof.x - roof.w / 2 + ROOF_EDGE_M - EPS);
        expect(p.x + p.w / 2).toBeLessThanOrEqual(roof.x + roof.w / 2 - ROOF_EDGE_M + EPS);
        expect(p.x - p.w / 2).toBeGreaterThanOrEqual(col.x - col.w / 2 - EPS);
        expect(p.x + p.w / 2).toBeLessThanOrEqual(col.x + col.w / 2 + EPS);
        expect(p.z - p.d / 2).toBeGreaterThanOrEqual(roof.z - roof.d / 2 + ROOF_EDGE_M - EPS);
        expect(p.z + p.d / 2).toBeLessThanOrEqual(roof.z + roof.d / 2 - ROOF_EDGE_M + EPS);
      }
    }
    expect(checked).toBeGreaterThan(500);
  });

  it("no two props' boxes overlap, over every style, floor count and corner variant", () => {
    const overlap = (a: DressPiece, b: DressPiece): boolean => {
      const o = (c1: number, h1: number, c2: number, h2: number): number => Math.min(c1 + h1, c2 + h2) - Math.max(c1 - h1, c2 - h2);
      return o(a.x, a.w / 2, b.x, b.w / 2) > EPS && o(a.y + a.h / 2, a.h / 2, b.y + b.h / 2, b.h / 2) > EPS && o(a.z, a.d / 2, b.z, b.d / 2) > EPS;
    };
    for (const b of SWEEP) {
      const ps = dress(b);
      // Ticket 058: an escape's pieces are placed by their decks and flights, not their bounds, so the bound of one (its ladder and rail reach 3.8 m) overlaps the next: that is the escape, not a clash.
      // Where a window's sill is low (Apartment_02) the first piece's legs, at the wall, start 0.08 m under the top of the shop glass below: its bound meets the glass's, its mesh does not.
      const own = (p: DressPiece, q: DressPiece): boolean => p.slot === "escape" && (q.slot === "escape" || q.slot === "glass");
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) if (!own(ps[i]!, ps[j]!) && !own(ps[j]!, ps[i]!)) expect(overlap(ps[i]!, ps[j]!), `${b.key}: ${ps[i]!.key} vs ${ps[j]!.key}`).toBe(false);
    }
  });

  it("a prop whose front is '-z' or '+x' in the fronts table is turned, and its size follows the turn", () => {
    let seen = 0;
    for (const b of blocks(APT, ["large"], [[]], MIXED, 30, "m")) {
      for (const p of dress(b, BIG_H)) {
        if (p.key === keyOf("SM_Prop_Sign_Cafe_01")) {
          seen++;
          expect(Math.abs(Math.abs(p.yaw) - Math.PI)).toBeLessThan(1e-9);
          expect(p.w).toBeCloseTo(rawOf(p.key)[0], 9);
        }
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});

/** How many pieces 052's stacking by bounds put on a block of `floors` floors over the base (3 m storeys, the roof at 3 + 3 x floors): the tall landing, a middle piece while it and the top still fit, the top. */
const legacyEscapeCount = (floors: number): number => {
  const [top, mid, first] = [rawOf(ESCAPES[0]!)[1], rawOf(ESCAPES[1]!)[1], rawOf(ESCAPES[2]!)[1]];
  const roof = 3 + 3 * floors;
  let n = 0;
  let y = 3;
  if (y + first <= roof + 1e-9) {
    n++;
    y += first;
  }
  while (y + mid + top <= roof + 1e-9) {
    n++;
    y += mid;
  }
  if (y + top <= roof + 1e-9) n++;
  return n;
};

describe("the caps", () => {
  const count = (ps: readonly DressPiece[], f: (p: DressPiece) => boolean): number => ps.filter(f).length;

  it("awnings match within a block (a corner may take the L-shaped one), at most one ATM, one blade sign, one escape column, one large roof prop", () => {
    for (const b of SWEEP) {
      const ps = dress(b);
      const keys = new Set(ps.filter((p) => p.slot === "awning" && AWNINGS.includes(p.key)).map((p) => p.key));
      expect(keys.size, b.key).toBeLessThanOrEqual(1);
      expect(count(ps, (p) => p.slot === "wall"), b.key).toBeLessThanOrEqual(1);
      expect(count(ps, (p) => SIGNS_BLADE.includes(p.key)), b.key).toBeLessThanOrEqual(1);
      expect(new Set(ps.filter((p) => p.slot === "escape").map((p) => p.column)).size, b.key).toBeLessThanOrEqual(1);
      const large = ps.filter((p) => p.slot === "roofLarge");
      expect(new Set(large.map((p) => p.column)).size, b.key).toBeLessThanOrEqual(1);
      expect(count(large, (p) => !BILLBOARD_FACES.includes(p.key)), b.key).toBeLessThanOrEqual(1);
      const signs = ps.filter((p) => p.slot === "sign").map((p) => p.key);
      expect(new Set(signs).size, `${b.key} a sign key twice`).toBe(signs.length);
    }
  });

  it("no bay holds more than DRESS_PER_BAY_MAX, wall props stop at WALL_PROPS_PER_BLOCK, and no fire escape is on a corner or door column", () => {
    for (const b of SWEEP) {
      const ps = dress(b);
      const per = new Map<number, number>();
      for (const p of ps) per.set(p.column, (per.get(p.column) ?? 0) + 1);
      // Ticket 058: a pack escape has a piece on every storey, and counts against its column what 052's stacking by bounds used (so no other piece of the block moves): a code-drawn one is one piece.
      for (const [c, n] of per) {
        const esc = ps.filter((p) => p.slot === "escape" && p.column === c).length;
        const held = esc === b.stack.floors ? n - esc + legacyEscapeCount(b.stack.floors) : n;
        expect(held, `${b.key} column ${c}`).toBeLessThanOrEqual(DRESS_PER_BAY_MAX);
      }
      expect(count(ps, (p) => p.slot === "wallUpper"), b.key).toBeLessThanOrEqual(WALL_PROPS_PER_BLOCK);
      for (const p of ps.filter((q) => q.slot === "escape")) {
        expect(b.stack.columns[p.column]!.corner, b.key).toBeNull();
        const base = b.stack.pieces.find((q) => q.role === "base" && Math.abs(q.x - b.stack.columns[p.column]!.x) <= q.w / 2);
        expect(base!.key, b.key).not.toMatch(/Door/);
      }
    }
  });

  it("a large prop never lifts a block over its lot's hMax, and a tight hMax allows none", () => {
    let large = 0;
    for (const b of SWEEP) {
      const hM = LOT_TYPES[b.type].cap;
      const ps = dress(b, hMaxOf(b.type));
      for (const p of ps.filter((q) => q.slot === "roofLarge")) {
        large++;
        expect(p.y + p.h, `${b.key} ${p.key}`).toBeLessThanOrEqual(hM + 1e-6);
      }
      expect(count(dress(b, b.stack.height_m * WORLD_PER_METRE), (p) => p.slot === "roofLarge"), b.key).toBe(0);
    }
    expect(large).toBeGreaterThan(0);
  });

  it("along a run: at most one billboard, one novelty sign and ATM_PER_RUN ATMs, the novelty on the lowest block, and no two escapes in a row", () => {
    const list: Block[] = [];
    for (let i = 0; i < 14; i++) {
      const key = `run:${i}`;
      const stack = assembleStack(APT[i % 3]!, { type: "large", key, cornerSides: [] }, ENTRIES, NO_FRONTS);
      if (stack) list.push({ style: APT[i % 3]!, type: "large", key, stack, fronts: NO_FRONTS });
    }
    expect(list.length).toBe(14);
    for (const lowestAt of [0, 5, 13]) {
      const out = dressTown(
        list.map((b, i) => ({ stack: b.stack, lot: { key: b.key, hMax: BIG_H }, run: { id: "A", index: i, lowest: i === lowestAt } })),
        ENTRIES,
      );
      const all = out.flat();
      expect(count(all, (p) => p.key === BILLBOARD_STRUCTURE)).toBeLessThanOrEqual(1);
      expect(count(all, (p) => NOVELTY_SIGNS.includes(p.key))).toBeLessThanOrEqual(1);
      expect(count(all, (p) => p.slot === "wall")).toBeLessThanOrEqual(ATM_PER_RUN);
      out.forEach((ps, i) => {
        if (i !== lowestAt) expect(count(ps, (p) => NOVELTY_SIGNS.includes(p.key)), `block ${i} is not the lowest`).toBe(0);
        if (i > 0) expect(count(ps, (p) => p.slot === "escape") > 0 && count(out[i - 1]!, (p) => p.slot === "escape") > 0, `escapes on blocks ${i - 1} and ${i}`).toBe(false);
      });
    }
    // two runs keep their own caps
    const two = dressTown(
      list.map((b, i) => ({ stack: b.stack, lot: { key: b.key, hMax: BIG_H }, run: { id: i < 7 ? "A" : "B", index: i % 7, lowest: i % 7 === 0 } })),
      ENTRIES,
    );
    expect(count(two.slice(0, 7).flat(), (p) => p.slot === "wall")).toBeLessThanOrEqual(ATM_PER_RUN);
    expect(count(two.slice(7).flat(), (p) => p.slot === "wall")).toBeLessThanOrEqual(ATM_PER_RUN);
  });

  it("the whole town stops at DRESS_MAX pieces", () => {
    const b = FIFTY(["large"])[0]!;
    // Every block alike: no escape on any (ticket 061: a share of 0), as `n` counts it.
    const n = dressBlock(b.stack, { key: b.key, hMax: BIG_H }, { ...RUN, escape: false }, ENTRIES, b.fronts).pieces.length;
    expect(n).toBeGreaterThan(0);
    const many = Math.ceil(DRESS_MAX / n) + 5;
    const sites = Array.from({ length: many }, (_, i) => ({ stack: b.stack, lot: { key: b.key, hMax: BIG_H }, run: { id: `r${i}`, index: 0, lowest: false } }));
    const out = dressTown(sites, ENTRIES, b.fronts, { escapeShare: 0 });
    const total = out.reduce((s, ps) => s + ps.length, 0);
    expect(total).toBeLessThanOrEqual(DRESS_MAX);
    expect(total).toBeGreaterThan(DRESS_MAX - n * 2);
    expect(out[out.length - 1]).toEqual([]);
  });

  it("a chosen block keeps its fire escape past DRESS_MAX, and the rest of the dressing stays plain (ticket 061)", () => {
    const b = FIFTY(["large"]).find((q) => dress(q).some((p) => p.slot === "escape"))!;
    const n = dressBlock(b.stack, { key: b.key, hMax: BIG_H }, { ...RUN, escape: false }, ENTRIES, b.fronts).pieces.length;
    const many = Math.ceil(DRESS_MAX / n) + 5;
    // One run of blocks of different keys is not needed: each block is its own run, so every one is hostable and a share of 1 chooses them all.
    const sites = Array.from({ length: many }, (_, i) => ({ stack: b.stack, lot: { key: b.key, hMax: BIG_H }, run: { id: `r${i}`, index: 0, lowest: false } }));
    const out = dressTown(sites, ENTRIES, b.fronts, { escapeShare: 1 });
    const last = out[out.length - 1]!;
    expect(last.length).toBeGreaterThan(0);
    expect(last.every((p) => p.slot === "escape")).toBe(true);
    expect(out.every((ps) => ps.some((p) => p.slot === "escape"))).toBe(true);
    expect(out.reduce((s, ps) => s + ps.filter((p) => p.slot !== "escape").length, 0)).toBeLessThanOrEqual(DRESS_MAX);
  });
});

describe("deterministic, busy and not noisy", () => {
  const blocksFifty = FIFTY();
  const share = (hit: number, of: number): number => (of === 0 ? NaN : hit / of);

  it("the same lot key gives the same dressing, a missing key drops only its own placements", () => {
    for (const b of blocksFifty.slice(0, 40)) {
      const a = dress(b);
      expect(dress(b)).toEqual(a);
      const noAtm = dressStack(b.stack, { key: b.key, hMax: BIG_H }, RUN, without((k) => k === keyOf("SM_Prop_ATM_01")), NO_FRONTS);
      expect(noAtm).toEqual(a.filter((p) => p.slot !== "wall"));
    }
    const b = blocksFifty[0]!;
    expect(dressStack(b.stack, { key: b.key, hMax: BIG_H }, RUN, new Map(), NO_FRONTS)).toEqual([]);
    expect(dressUnit("a", 1)).toBe(dressUnit("a", 1));
    expect(dressUnit("a", 1)).not.toBe(dressUnit("a", 2));
  });

  it("every shop whose key has glass gets it, and Shop_06 (no glass) gets none", () => {
    let glassed = 0;
    for (const b of blocksFifty) {
      const ps = dress(b);
      for (const base of b.stack.pieces.filter((p) => p.role === "base" && /Shop_(\d\d|Corner_\d\d)$/.test(p.key))) {
        const g = ps.filter((p) => p.slot === "glass" && p.key === `${base.key}_Glass` && Math.abs(p.x - base.x) < 1e-6);
        if (/Shop_06$/.test(base.key)) expect(ps.some((p) => p.key === `${base.key}_Glass`)).toBe(false);
        else {
          expect(g, `${b.key} ${base.key}`).toHaveLength(1);
          glassed++;
        }
      }
    }
    expect(glassed).toBeGreaterThan(100);
  });

  it("over 50 lot keys every slot kind is used and each probability lands within 0.15 of its constant", () => {
    const used = new Set<DressSlotKind>();
    let bays = 0;
    let awned = 0;
    let signed = 0;
    let doorBays = 0;
    let canopies = 0;
    let atmBlocks = 0;
    let roofCols = 0;
    let smallCols = 0;
    let largeBlocks = 0;
    let wallSlots = 0;
    let ac = 0;
    let planters = 0;
    for (const b of blocksFifty) {
      const ps = dress(b);
      for (const p of ps) used.add(p.slot);
      const escCol = ps.find((p) => p.slot === "escape")?.column;
      const shops = b.stack.pieces.filter((p) => p.role === "base" && /Shop_/.test(p.key));
      const colOf = (x: number): number => b.stack.columns.findIndex((c) => Math.abs(c.x - x) < c.w / 2);
      for (const s of shops) {
        if (colOf(s.x) === escCol) continue;
        bays++;
        if (ps.some((p) => p.slot === "awning" && p.column === colOf(s.x))) awned++;
        if (ps.some((p) => p.slot === "sign" && p.column === colOf(s.x))) signed++;
      }
      const doors = b.stack.pieces.filter((p) => p.role === "base" && /Door/.test(p.key));
      doorBays += doors.length;
      canopies += ps.filter((p) => DOOR_CANOPIES.includes(p.key)).length;
      if (doors.length > 0) atmBlocks += ps.some((p) => p.slot === "wall") ? 1 : 0;
      const doorsN = doors.length;
      if (b.stack.bays >= 3 && b.stack.floors >= 2 && b.stack.columns.some((c) => c.corner === null && !(doorsN > 0 && doors.some((d) => Math.abs(d.x - c.x) < d.w / 2)))) {
      }
      largeBlocks += ps.some((p) => p.slot === "roofLarge") ? 1 : 0;
      const largeCol = ps.find((p) => p.slot === "roofLarge")?.column;
      for (const [i] of b.stack.columns.entries()) {
        if (i === largeCol) continue;
        roofCols++;
        if (ps.some((p) => p.slot === "roofSmall" && p.column === i)) smallCols++;
        if (i !== escCol) for (let level = 2; level <= b.stack.floors; level++) wallSlots++;
      }
      ac += ps.filter((p) => p.key === keyOf("SM_Prop_Aircon_01")).length;
      planters += ps.filter((p) => /PlanterWindow/.test(p.key)).length;
    }
    for (const slot of ["glass", "awning", "sign", "wall", "escape", "wallUpper", "roofSmall", "roofLarge"] as DressSlotKind[]) expect(used.has(slot), slot).toBe(true);
    const near = (got: number, want: number, what: string): void => expect(Math.abs(got - want), `${what}: ${got} vs ${want}`).toBeLessThanOrEqual(0.15);
    near(share(awned, bays), P_AWNING, "awning");
    near(share(signed, bays), P_SIGN, "sign");
    near(share(canopies, doorBays), P_CANOPY, "canopy");
    near(share(atmBlocks, doorBays), P_ATM, "ATM");
    // The fire escape's share is no longer a per-block chance (ticket 061): `escapeBlocks` fixes it by rank, and escapes.test.ts pins it.
    near(share(smallCols, roofCols), P_ROOF_SMALL, "roof small");
    near(share(largeBlocks, blocksFifty.length), P_ROOF_LARGE, "roof large");
    near(share(ac, wallSlots), P_WALL_AC, "wall AC");
    near(share(planters, wallSlots), P_PLANTER, "planter");
  });

  it("is busy, not noisy: a block carries a handful of props per bay, never an empty or a crowded roof line", () => {
    for (const b of blocksFifty) {
      const ps = dress(b);
      expect(ps.length, b.key).toBeGreaterThan(0);
      expect(ps.length / b.stack.bays, b.key).toBeLessThanOrEqual(DRESS_PER_BAY_MAX);
    }
  });

  it("a block dressed alone uses at most one ATM, and the escape table has its three pieces", () => {
    expect(ESCAPES).toHaveLength(3);
    expect(dressBlock(blocksFifty[0]!.stack, { key: "k", hMax: BIG_H }, RUN, ENTRIES).used.atm).toBeLessThanOrEqual(1);
  });
});

describe("escapes, the kerb and the billboard", () => {
  it("a fire escape has one platform on every storey over the base (the tall landing, a middle piece for each storey between, the top piece), each deck under its window sill, each flight meeting the deck above and the ladder on the walk (ticket 058)", () => {
    let seen = 0;
    for (const b of FIFTY(["large", "tall"])) {
      const ps = dress(b);
      const esc = ps.filter((p) => p.slot === "escape").sort((p, q) => p.y - q.y);
      if (esc.length === 0) continue;
      seen++;
      expect(esc, b.key).toHaveLength(b.stack.floors);
      expect(esc[0]!.key, b.key).toBe(ESCAPES[2]);
      expect(esc[esc.length - 1]!.key, b.key).toBe(ESCAPES[0]);
      for (const p of esc.slice(1, -1)) expect(p.key, b.key).toBe(ESCAPES[1]);
      expect(escapeCheck(b.stack, ps), b.key).toMatchObject([{ ok: true, missing: [], platforms: b.stack.floors }]);
    }
    expect(seen).toBeGreaterThan(10);
  });

  it("dressStack takes the lot's own kerb distance: nothing reaches past a nearer kerb, and the default is unchanged", () => {
    const near = 2.08;
    let nearCount = 0;
    let farCount = 0;
    for (const b of SWEEP.slice(0, 400)) {
      const lot = { key: b.key, hMax: BIG_H };
      expect(dressStack(b.stack, lot, RUN, ENTRIES, b.fronts, KERB_FROM_FRONT_M)).toEqual(dress(b));
      const ps = dressStack(b.stack, lot, RUN, ENTRIES, b.fronts, near);
      nearCount += ps.length;
      farCount += dress(b).length;
      for (const p of ps) if (FRONT_SLOTS.includes(p.slot) && !(p.slot === "glass" && rawOf(p.key)[2] > 1)) expect(p.z + p.d / 2, `${b.key} ${p.key}`).toBeLessThanOrEqual(near + 1e-6);
    }
    expect(nearCount).toBeLessThan(farCount);
  });

  it("a roof billboard's face ends on the roof inset, not past it", () => {
    let seen = 0;
    for (const b of FIFTY(["large", "tall"])) {
      for (const face of dress(b).filter((p) => BILLBOARD_FACES.includes(p.key))) {
        seen++;
        const roof = b.stack.pieces.find((q) => q.role === "roof" && q.column === face.column)!;
        expect(face.z + face.d / 2, b.key).toBeLessThanOrEqual(roof.z + roof.d / 2 - ROOF_EDGE_M + 1e-6);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});
