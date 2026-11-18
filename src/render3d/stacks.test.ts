/**
 * Ticket 050 A: the City Pack stack recipes and their assembly. Pure: fixture entries with names and sizes typed in as numbers from the converted
 * City Pack manifest (18 Nov 2026), no GLB, no WebGL, no timers. Nothing is read from assets/private/ except inside the one manifest check,
 * which skips when the file is absent (CI, a fresh checkout).
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ASSET_MANIFEST_VERSION, type AssetEntry, type CalibrationKey } from "../core";
import { frontAxis, frontYaw, type BuildingFront, type FrontTable } from "./models";
import { STACK_FLOORS, STACK_STYLES, assembleStack, stackKeys, stackRange, type Stack, type StackPiece, type StackSide, type StackStyle } from "./stacks";
import { LOT_TYPES, LOT_TYPE_NAMES, type CornerSide, type LotType } from "./town";

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
const keyOf = (name: string): CalibrationKey => `city-pack:${name}`;
const ENTRIES: ReadonlyMap<CalibrationKey, AssetEntry> = new Map(SIZES.map(([n, w, h, d]) => [keyOf(n), entryOf(n, w, h, d)]));
const without = (...names: string[]): ReadonlyMap<CalibrationKey, AssetEntry> => new Map([...ENTRIES].filter(([key]) => !names.some((n) => key === keyOf(n))));

const NO_FRONTS: FrontTable = {};
const cs = (...sides: StackSide[]): CornerSide[] => sides.map((side) => ({ side, road: "x" }));
const SIDE_SETS: StackSide[][] = [[], ["+x"], ["-x"], ["-x", "+x"]];
const STYLE = (id: string): StackStyle => STACK_STYLES.find((s) => s.id === id)!;
const sizeOfKey = (key: CalibrationKey): [number, number, number] => {
  const b = ENTRIES.get(key)!.bounds;
  return [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]];
};

// ---- the maths the tests check against, written out on their own ----
const rot = (yaw: number, [x, z]: readonly [number, number]): [number, number] => [x * Math.cos(yaw) + z * Math.sin(yaw), -x * Math.sin(yaw) + z * Math.cos(yaw)];
const angleToPlusZ = ([x, z]: readonly [number, number]): number => (Math.atan2(Math.abs(x), z) * 180) / Math.PI;
/** A piece's size (along the road, away from the road) after its yaw, from the fixture's own numbers. */
function turned(p: StackPiece): [number, number] {
  const [w, , d] = sizeOfKey(p.key);
  return Math.abs(Math.sin(p.yaw)) > 0.5 ? [d, w] : [w, d];
}
const frontOf = (fronts: FrontTable, key: CalibrationKey): BuildingFront => fronts[key] ?? { front: "+z" };

interface Combo {
  style: StackStyle;
  type: LotType;
  sides: StackSide[];
  fronts: FrontTable;
  key: string;
  stack: Stack;
}

/** Every style x type x corner-side set x `keys` (default 8) lot keys that assemble, under the given fronts (and style variants). */
function sweep(styles: readonly StackStyle[], fronts: FrontTable, keys = 8): Combo[] {
  const out: Combo[] = [];
  for (const style of styles) {
    for (const type of LOT_TYPE_NAMES) {
      for (const sides of SIDE_SETS) {
        for (let i = 0; i < keys; i++) {
          const key = `r${i}:${type}:${sides.join("")}`;
          const stack = assembleStack(style, { type, key, cornerSides: cs(...sides) }, ENTRIES, fronts);
          if (stack) out.push({ style, type, sides, fronts, key, stack });
        }
      }
    }
  }
  return out;
}

// fixtures for the front tests: a "-z" and a "+x" among the floor, base and roof pieces, and a quarter-turned corner
const MIXED: FrontTable = {
  [keyOf("SM_Bld_Apartment_01")]: { front: "+x" },
  [keyOf("SM_Bld_Apartment_Stack_01")]: { front: "+x" },
  [keyOf("SM_Bld_Apartment_Roof_01")]: { front: "-x" },
  [keyOf("SM_Bld_Shop_01")]: { front: "-z" },
  [keyOf("SM_Bld_Shop_04")]: { front: "+x" },
  [keyOf("SM_Bld_Shop_Corner_01")]: { front: "-z", corner: true, open: "-x" },
  [keyOf("SM_Bld_Apartment_Corner_01")]: { front: "-x" },
  [keyOf("SM_Bld_Apartment_Door_01")]: { front: "-z" },
  [keyOf("SM_Bld_OfficeOld_Small_Floor_01")]: { front: "-z" },
};
const OPEN_MINUS: StackStyle[] = STACK_STYLES.map((s) => ({ ...s, open: Object.fromEntries(Object.keys(s.open ?? {}).map((c) => [c, "-x" as const])) }));
const ALL_COMBOS = [...sweep(STACK_STYLES, NO_FRONTS), ...sweep(STACK_STYLES, MIXED), ...sweep(OPEN_MINUS, NO_FRONTS), ...sweep(OPEN_MINUS, MIXED)];

describe("the recipes", () => {
  it("every key is city-pack:<name>, is in the fixture, and none is dressing or a whole building", () => {
    const dressing = /Cover|FireEscape|Roof_Access|Stairs|Glass|SM_Prop_|Billboard|Aircon|Vents|ATM|Sign|CityHall|Station/;
    expect(STACK_STYLES.length).toBeGreaterThan(0);
    for (const style of STACK_STYLES) {
      expect(style.pack).toBe("city-pack");
      // Dressing keys in a `props` slot belong to a later ticket (052) and are allowed; only the base, floor and roof roles are checked.
      const props = new Set((style.props ?? []).flatMap((p) => p.keys));
      for (const key of stackKeys(style).filter((q) => !props.has(q))) {
        expect(key, `${style.id} ${key}`).toMatch(/^city-pack:SM_Bld_(Apartment|Shop|OfficeOld|OfficeOctagon)/);
        expect(ENTRIES.has(key), `${style.id}: ${key} is not in the fixture`).toBe(true);
        expect(key).not.toMatch(dressing);
        // a whole tower is SM_Bld_Office<Kind>_NN with no Base/Floor/Roof part
        if (/Office/.test(key)) expect(key).toMatch(/_(Base|Floor|Roof)_\d+$/);
      }
    }
  });

  it("every style has base, floor and roof pieces, and corner pieces in every role or in none", () => {
    for (const style of STACK_STYLES) {
      expect(style.base.mid.length, style.id).toBeGreaterThan(0);
      expect(style.floor.mid.length, style.id).toBeGreaterThan(0);
      expect(style.roof.mid.length, style.id).toBeGreaterThan(0);
      const corners = [style.base.corner.length, style.floor.corner.length, style.roof.corner.length];
      expect(corners.every((n) => n > 0) || corners.every((n) => n === 0), `${style.id}: ${corners}`).toBe(true);
      expect(style.pitch_m.base).toBeGreaterThan(0);
      expect(style.pitch_m.floor).toBeGreaterThan(0);
      expect(style.pitch_m.roof).toBeGreaterThan(0);
    }
    expect(new Set(STACK_STYLES.map((s) => s.id)).size).toBe(STACK_STYLES.length);
  });

  it("a corner piece's open side is in the recipe (a guess), and the door never doubles as a corner piece", () => {
    for (const style of STACK_STYLES.filter((s) => s.base.corner.length > 0)) {
      for (const key of [...style.base.corner, ...style.floor.corner, ...style.roof.corner]) expect(style.open?.[key], `${style.id} ${key}`).toBeDefined();
      for (const d of style.base.door ?? []) expect(style.base.corner).not.toContain(d);
    }
  });
});

describe("floors and fit", () => {
  const APT = ["apartment-01", "apartment-02", "apartment-03"];
  // finding 3 of the ticket: bays across, and floors over the base from the minimum to what the cap allows
  const TABLE: Record<string, Partial<Record<LotType, { bays: number; min: number; max: number } | null>>> = {
    // _01 on large is 4, not 5: five 5.00 m floors fill 25.0 m but the 5.31 m roofs would overhang the lot by 0.155 m
    "apartment-*": { small: { bays: 2, min: 1, max: 2 }, house: { bays: 3, min: 1, max: 3 }, large: { bays: 4, min: 2, max: 4 }, tall: { bays: 2, min: 5, max: 8 } },
    "office-old-small": { small: null, house: { bays: 1, min: 1, max: 1 }, large: { bays: 1, min: 1, max: 1 }, tall: { bays: 1, min: 3, max: 5 } },
    "office-old-large": { small: null, house: null, large: { bays: 1, min: 1, max: 1 }, tall: null },
    "office-octagon": { small: null, house: null, large: { bays: 1, min: 1, max: 2 }, tall: null },
  };

  it("stackRange gives the table's bays and floor range for every style and lot type, and none where the table has none", () => {
    for (const style of STACK_STYLES) {
      const row = TABLE[APT.includes(style.id) ? "apartment-*" : style.id]!;
      for (const type of LOT_TYPE_NAMES) expect(stackRange(style, type, ENTRIES, NO_FRONTS), `${style.id} on ${type}`).toEqual(row[type]);
    }
    expect(STACK_FLOORS).toEqual({ small: 1, house: 1, large: 2, tall: 5 });
  });

  it("a missing piece drops only the styles that need it, and a scale-suspect piece counts as missing", () => {
    expect(stackRange(STYLE("apartment-01"), "large", without("SM_Bld_Apartment_Roof_01"))).toBeNull();
    expect(stackRange(STYLE("apartment-02"), "large", without("SM_Bld_Apartment_Roof_01"))).not.toBeNull();
    const suspect = new Map(ENTRIES);
    const e = ENTRIES.get(keyOf("SM_Bld_Apartment_02"))!;
    suspect.set(keyOf("SM_Bld_Apartment_02"), { ...e, warnings: ["scale-suspect"] });
    expect(stackRange(STYLE("apartment-02"), "large", suspect)).toBeNull();
    expect(stackRange(STYLE("apartment-03"), "large", suspect)).not.toBeNull();
    // one shop missing leaves the others; every shop missing leaves no ground floor
    expect(stackRange(STYLE("apartment-01"), "large", without("SM_Bld_Shop_01"))).not.toBeNull();
    expect(stackRange(STYLE("apartment-01"), "large", without("SM_Bld_Shop_01", "SM_Bld_Shop_02", "SM_Bld_Shop_03", "SM_Bld_Shop_04", "SM_Bld_Shop_05", "SM_Bld_Shop_06"))).toBeNull();
  });

  it("a missing corner piece drops the corner stack but not the mid-row stack", () => {
    const lot = (sides: StackSide[]) => ({ type: "large" as const, key: "k", cornerSides: cs(...sides) });
    const entries = without("SM_Bld_Shop_Corner_01", "SM_Bld_Shop_Corner_02");
    expect(assembleStack(STYLE("apartment-01"), lot([]), entries, NO_FRONTS)).not.toBeNull();
    expect(assembleStack(STYLE("apartment-01"), lot(["+x"]), entries, NO_FRONTS)).toBeNull();
  });

  it("every assembled stack's turned footprint lies inside the lot, and its top is under the cap", () => {
    expect(ALL_COMBOS.length).toBeGreaterThan(1000);
    for (const { style, type, stack, key } of ALL_COMBOS) {
      const spec = LOT_TYPES[type];
      const where = `${style.id} on ${type} (${key})`;
      expect(stack.pieces.length, where).toBeGreaterThan(0);
      for (const p of stack.pieces) {
        const [w, d] = turned(p);
        expect(p.w, where).toBeCloseTo(w, 6);
        expect(p.d, where).toBeCloseTo(d, 6);
        expect(p.x - w / 2, where).toBeGreaterThanOrEqual(-spec.frontage / 2 - 1e-6);
        expect(p.x + w / 2, where).toBeLessThanOrEqual(spec.frontage / 2 + 1e-6);
        expect(p.z + d / 2, where).toBeLessThanOrEqual(1e-6);
        expect(p.z - d / 2, where).toBeGreaterThanOrEqual(-spec.depth - 1e-6);
      }
      const top = Math.max(...stack.pieces.map((p) => p.y + sizeOfKey(p.key)[1]));
      expect(top, where).toBeLessThanOrEqual(spec.cap + 1e-6);
      expect(stack.height_m, where).toBeCloseTo(top, 6);
      expect(stack.family).toBe(`city-pack:stack:${style.id}`);
      const range = stackRange(style, type, ENTRIES, NO_FRONTS);
      if (range) {
        expect(stack.floors).toBeGreaterThanOrEqual(range.min);
        expect(stack.floors).toBeLessThanOrEqual(range.max);
      }
    }
  });

  it("every floor count in each style's range is reached, and the picked count is deterministic per lot key", () => {
    for (const style of STACK_STYLES) {
      for (const type of LOT_TYPE_NAMES) {
        const range = stackRange(style, type, ENTRIES, NO_FRONTS);
        if (!range) continue;
        const seen = new Set<number>();
        for (let i = 0; i < 50; i++) {
          const lot = { type, key: `road-${i}:+1:${i % 7}`, cornerSides: cs() };
          const a = assembleStack(style, lot, ENTRIES, NO_FRONTS)!;
          const b = assembleStack(style, lot, ENTRIES, NO_FRONTS)!;
          expect(b).toEqual(a);
          seen.add(a.floors);
        }
        for (let f = range.min; f <= range.max; f++) expect(seen.has(f), `${style.id} on ${type}: ${f} floors`).toBe(true);
      }
    }
  });

  it("floors vary from block to block on tall (more than one value over 50 fixture keys)", () => {
    const counts = new Set<number>();
    for (let i = 0; i < 50; i++) counts.add(assembleStack(STYLE("apartment-01"), { type: "tall", key: `tall-${i}`, cornerSides: cs() }, ENTRIES, NO_FRONTS)!.floors);
    expect(counts.size).toBeGreaterThan(1);
  });

  it("a stack with a nudge stays inside the lot: the frontmost face is on the lot's front edge", () => {
    const nudged: StackStyle = { ...STYLE("apartment-01"), nudge_m: { [keyOf("SM_Bld_Apartment_01")]: 0.3, [keyOf("SM_Bld_Apartment_Roof_01")]: -0.2 } };
    const s = assembleStack(nudged, { type: "large", key: "n", cornerSides: cs() }, ENTRIES, NO_FRONTS)!;
    const front = Math.max(...s.pieces.map((p) => p.z + p.d / 2));
    expect(front).toBeCloseTo(0, 6);
    const backOf = (p: StackPiece) => p.z - p.d / 2;
    const plain = s.pieces.find((p) => p.key === keyOf("SM_Bld_Shop_05") || p.key === keyOf("SM_Bld_Shop_02") || p.key === keyOf("SM_Bld_Shop_06"));
    const floor = s.pieces.find((p) => p.key === keyOf("SM_Bld_Apartment_01"))!;
    const roof = s.pieces.find((p) => p.key === keyOf("SM_Bld_Apartment_Roof_01"))!;
    const line = plain ? backOf(plain) : backOf(floor) - 0.3;
    expect(backOf(floor)).toBeCloseTo(line + 0.3, 6);
    expect(backOf(roof)).toBeCloseTo(line - 0.2, 6);
  });
});

describe("no gaps", () => {
  it("each storey's bottom is the top of the one under it, and the roof sits on the last storey", () => {
    for (const { style, stack, key } of ALL_COMBOS) {
      const where = `${style.id} (${key})`;
      for (let i = 0; i < stack.columns.length; i++) {
        const col = stack.pieces.filter((p) => p.column === i);
        expect(col.filter((p) => p.role === "roof").length, where).toBe(1);
        for (const b of col.filter((p) => p.role === "base")) expect(b.y, where).toBeCloseTo(0, 6); // none in a column a double-bay shop covers
        let y = style.pitch_m.base;
        let storeys = 0;
        for (const p of col.filter((q) => q.role === "floor").sort((a, b) => a.y - b.y)) {
          expect(p.y, where).toBeCloseTo(y, 6);
          const n = /_Stack_/.test(p.key) ? 3 : 1;
          y += n * style.pitch_m.floor;
          storeys += n;
        }
        expect(storeys, where).toBe(stack.floors);
        expect(col.find((p) => p.role === "roof")!.y, where).toBeCloseTo(y, 6);
      }
    }
  });

  it("a run of three mid floors is one Stack piece where the style has one, and a corner column never has one", () => {
    const tall = ALL_COMBOS.filter((c) => c.type === "tall" && c.style.id === "apartment-02" && c.sides.length === 0 && c.stack.floors >= 6);
    expect(tall.length).toBeGreaterThan(0);
    for (const { stack } of tall) {
      const stacks = stack.pieces.filter((p) => /_Stack_/.test(p.key));
      expect(stacks.length).toBeGreaterThan(0);
      for (const p of stacks) expect(stack.columns[p.column]!.corner).toBeNull();
    }
    for (const { stack } of ALL_COMBOS) for (const p of stack.pieces) if (stack.columns[p.column]!.corner) expect(p.key).not.toMatch(/_Stack_/);
  });

  it("neighbouring columns touch along x, and each column is as wide as its floor piece", () => {
    for (const { style, stack, key } of ALL_COMBOS) {
      const where = `${style.id} (${key})`;
      for (let i = 0; i < stack.columns.length; i++) {
        const col = stack.columns[i]!;
        const floor = stack.pieces.find((p) => p.column === i && p.role === "floor")!;
        expect(col.w, where).toBeCloseTo(turned(floor)[0], 6);
        if (i > 0) expect(col.x - stack.columns[i - 1]!.x, where).toBeCloseTo((col.w + stack.columns[i - 1]!.w) / 2, 6);
      }
      const sum = stack.columns.reduce((s, c) => s + c.w, 0);
      expect(stack.width_m, where).toBeCloseTo(sum, 6);
      expect(stack.columns[0]!.x - stack.columns[0]!.w / 2, where).toBeCloseTo(-sum / 2, 6);
    }
  });

  it("pieces in a column share its axis (a double-bay shop sits on its two columns' middle), and every back face lies on one line (an office's centres do)", () => {
    for (const { stack, key, style } of ALL_COMBOS) {
      const where = `${style.id} (${key})`;
      const footprint = style.depth === "footprint";
      const line = footprint ? stack.pieces[0]!.z : stack.pieces[0]!.z - stack.pieces[0]!.d / 2;
      for (const p of stack.pieces) {
        const col = stack.columns[p.column]!;
        if (p.role === "base" && turned(p)[0] > 1.5 * col.w) {
          const next = stack.columns[p.column + 1]!;
          expect(p.x, where).toBeCloseTo((col.x + next.x) / 2, 6);
        } else expect(p.x, where).toBeCloseTo(col.x, 6);
        expect(footprint ? p.z : p.z - p.d / 2, where).toBeCloseTo(line, 6);
      }
      expect(stack.depth_m, where).toBeCloseTo(Math.max(...stack.pieces.map((p) => p.d)), 6);
    }
  });

  it("an office is centred in z: base, floors and roof share one middle, and the deepest piece's front is on the lot's front edge", () => {
    const offices = ALL_COMBOS.filter((c) => c.style.depth === "footprint");
    expect(offices.length).toBeGreaterThan(0);
    for (const { stack, style, key } of offices) {
      const where = `${style.id} (${key})`;
      const mid = stack.pieces[0]!.z;
      for (const p of stack.pieces) expect(p.z, where).toBeCloseTo(mid, 6);
      expect(Math.max(...stack.pieces.map((p) => p.z + p.d / 2)), where).toBeCloseTo(0, 6);
      expect(mid, where).toBeCloseTo(-stack.depth_m / 2, 6);
    }
  });

  it("the ground row has no overlap: pieces in it cover the columns exactly once", () => {
    for (const { stack, key, style } of ALL_COMBOS) {
      const covered = new Array<number>(stack.columns.length).fill(0);
      for (const p of stack.pieces.filter((q) => q.role === "base")) {
        const span = Math.max(1, Math.round(turned(p)[0] / stack.columns[p.column]!.w));
        for (let j = 0; j < span; j++) covered[p.column + j]! += 1;
      }
      expect(covered, `${style.id} (${key})`).toEqual(new Array(stack.columns.length).fill(1));
    }
  });
});

describe("faces the street", () => {
  /** The directions, in the lot frame, of a piece's declared front and (for a corner piece) its open side. */
  function faces(style: StackStyle, fronts: FrontTable, p: StackPiece): { front: [number, number]; open: [number, number] | null } {
    const bf = frontOf(fronts, p.key);
    const front = rot(p.yaw, frontAxis(bf.front));
    const o = bf.open ?? style.open?.[p.key]; // the table's open wins over the recipe's guess
    const isCorner = style.base.corner.includes(p.key) || style.floor.corner.includes(p.key) || style.roof.corner.includes(p.key);
    if (!isCorner) return { front, open: null };
    // the open side is on `o` in the lot frame once the front is turned to the road: in the model's frame that is rot(-frontYaw)
    const own = rot(-frontYaw(bf.front), [o === "-x" ? -1 : 1, 0]);
    return { front, open: rot(p.yaw, own) };
  }

  it("every non-corner piece's declared front points to the lot's +z, within half a degree", () => {
    let seen = 0;
    for (const { style, fronts, stack, key } of ALL_COMBOS) {
      for (const p of stack.pieces) {
        const { front, open } = faces(style, fronts, p);
        if (open === null) {
          expect(Math.abs(angleToPlusZ(front)), `${style.id} ${p.key} (${key})`).toBeLessThan(0.5);
          seen++;
        }
      }
    }
    expect(seen).toBeGreaterThan(1000);
  });

  it("the yaw and the width/depth swap follow the front (a -z and a +x fixture piece)", () => {
    const style = STYLE("apartment-01");
    // a key that picks two floors, so the mid columns use single floor pieces and no Stack piece
    let stack = assembleStack(style, { type: "large", key: "q0", cornerSides: cs() }, ENTRIES, MIXED)!;
    for (let i = 1; stack.floors !== 2 && i < 200; i++) stack = assembleStack(style, { type: "large", key: `q${i}`, cornerSides: cs() }, ENTRIES, MIXED)!;
    expect(stack.floors).toBe(2);
    const floor = stack.pieces.find((p) => p.key === keyOf("SM_Bld_Apartment_01"))!;
    expect(floor.yaw).toBeCloseTo(-Math.PI / 2, 9); // front +x
    expect([floor.w, floor.d]).toEqual([5.196, 5.0]); // its depth now runs along the road
    expect(stack.columns[0]!.w).toBeCloseTo(5.196, 6);
    const roof = stack.pieces.find((p) => p.key === keyOf("SM_Bld_Apartment_Roof_01"))!;
    expect(roof.yaw).toBeCloseTo(Math.PI / 2, 9); // front -x
    expect([roof.w, roof.d]).toEqual([5.918, 5.31]);
    // every mid-row piece in the sweep: yaw is frontYaw(front), and the width and depth swap exactly on a quarter turn
    const seen = new Set<string>();
    for (const { fronts, stack } of ALL_COMBOS.filter((c) => c.fronts === MIXED && c.stack.cornerSides.length === 0)) {
      for (const p of stack.pieces) {
        const f = frontOf(MIXED, p.key).front;
        const [w, h, d] = sizeOfKey(p.key);
        expect(Math.cos(p.yaw)).toBeCloseTo(Math.cos(frontYaw(f)), 9);
        expect(Math.sin(p.yaw)).toBeCloseTo(Math.sin(frontYaw(f)), 9);
        expect([p.w, p.h, p.d]).toEqual(f === "+x" || f === "-x" ? [d, h, w] : [w, h, d]);
        seen.add(f);
        void fronts;
      }
    }
    expect([...seen].sort()).toEqual(["+x", "+z", "-x", "-z"]);
    // five columns of 5.196 do not fit 25 m with the overhang: the fronts changed the bays
    expect(stack.bays).toBe(4);
  });

  it("a corner piece shows the road a face and the corner side the other, at both ends", () => {
    let corners = 0;
    for (const { style, fronts, stack, key } of ALL_COMBOS) {
      for (const p of stack.pieces) {
        const side = stack.columns[p.column]!.corner;
        if (!side) continue;
        const { front, open } = faces(style, fronts, p);
        expect(open, p.key).not.toBeNull();
        const sx = side === "+x" ? 1 : -1;
        const dirs = [front, open!];
        const has = (v: [number, number]) => dirs.some((d) => Math.abs(d[0] - v[0]) < 1e-6 && Math.abs(d[1] - v[1]) < 1e-6);
        expect(has([0, 1]), `${style.id} ${p.key} (${key}) has a face to the road`).toBe(true);
        expect(has([sx, 0]), `${style.id} ${p.key} (${key}) has a face to ${side}`).toBe(true);
        // `street` says which of the two points at the road
        const road = p.street === "front" ? front : open!;
        expect(Math.abs(road[0]) + Math.abs(road[1] - 1), `${p.key} street`).toBeLessThan(1e-6);
        corners++;
      }
    }
    expect(corners).toBeGreaterThan(500);
  });
});

describe("corners", () => {
  it("a corner column is on exactly the sides in cornerSides, in apartment styles only, and its pieces are all corner keys", () => {
    for (const { style, sides, stack, key } of ALL_COMBOS) {
      const where = `${style.id} (${key})`;
      const expected = style.base.corner.length > 0 ? SIDE_SETS.find((s) => s.length === sides.length && s.every((x) => sides.includes(x)))! : [];
      expect(stack.cornerSides, where).toEqual(expected);
      const cornerCols = stack.columns.map((c, i) => [c.corner, i] as const).filter(([c]) => c !== null);
      expect(cornerCols.map(([c]) => c), where).toEqual(expected);
      for (const [side, i] of cornerCols) {
        expect(i, where).toBe(side === "-x" ? 0 : stack.columns.length - 1);
        const pcs = stack.pieces.filter((p) => p.column === i);
        expect(pcs.length, where).toBeGreaterThan(0);
        for (const p of pcs) {
          const keys = p.role === "base" ? style.base.corner : p.role === "floor" ? style.floor.corner : style.roof.corner;
          expect(keys, `${where} ${p.key}`).toContain(p.key);
        }
      }
    }
    expect(ALL_COMBOS.some((c) => c.stack.cornerSides.length === 2)).toBe(true);
  });

  it("a mid-row stack has no corner key, and an office never has a corner column", () => {
    for (const { style, sides, stack } of ALL_COMBOS) {
      if (stack.cornerSides.length === 0) {
        for (const p of stack.pieces) expect(p.key).not.toMatch(/Corner/);
        expect(stack.columns.every((c) => c.corner === null)).toBe(true);
      }
      if (style.base.corner.length === 0) {
        expect(stack.cornerSides).toEqual([]);
        expect(stack.bays).toBe(1);
        void sides;
      }
    }
    expect(ALL_COMBOS.some((c) => c.stack.cornerSides.length === 0 && c.sides.length > 0)).toBe(true); // an office on a corner lot
  });

  it("the residents' door is never in a corner column, and a stack with a mid column has one door", () => {
    let doors = 0;
    for (const { style, stack, key } of ALL_COMBOS.filter((c) => c.style.base.corner.length > 0)) {
      const door = stack.pieces.filter((p) => (style.base.door ?? []).includes(p.key));
      for (const p of door) expect(stack.columns[p.column]!.corner, `${style.id} (${key})`).toBeNull();
      const mids = stack.columns.filter((c) => c.corner === null).length;
      expect(door.length, `${style.id} (${key})`).toBe(mids > 0 ? 1 : 0);
      doors += door.length;
    }
    expect(doors).toBeGreaterThan(0);
  });

  it("the second face is on the lot's corner side at its own end, and a quarter turn at the other end", () => {
    const style = STYLE("apartment-01"); // every open side is "+x" (a guess)
    const lot = { type: "large" as const, key: "c", cornerSides: cs("-x", "+x") };
    const s = assembleStack(style, lot, ENTRIES, NO_FRONTS)!;
    const at = (side: StackSide, role: "base" | "floor" | "roof") => s.pieces.find((p) => p.column === (side === "-x" ? 0 : s.columns.length - 1) && p.role === role)!;
    for (const role of ["base", "floor", "roof"] as const) {
      expect(at("+x", role).yaw).toBeCloseTo(0, 9); // open "+x" at the +x end: no turn
      expect(at("+x", role).street).toBe("front");
      expect(at("-x", role).yaw).toBeCloseTo(-Math.PI / 2, 9); // at the -x end: a quarter turn
      expect(at("-x", role).street).toBe("open");
    }
    const flipped: StackStyle = { ...style, open: Object.fromEntries(Object.keys(style.open ?? {}).map((c) => [c, "-x" as const])) };
    const t = assembleStack(flipped, lot, ENTRIES, NO_FRONTS)!;
    const first = t.pieces.find((p) => p.column === 0 && p.role === "floor")!;
    const last = t.pieces.find((p) => p.column === t.columns.length - 1 && p.role === "floor")!;
    expect(first.yaw).toBeCloseTo(0, 9);
    expect(last.yaw).toBeCloseTo(Math.PI / 2, 9);
  });

  it("the fronts table's open side wins over the recipe's guess, and the recipe's (then \"+x\") is used when the table has none", () => {
    const lot = { type: "large" as const, key: "c", cornerSides: cs("+x") };
    const key = keyOf("SM_Bld_Apartment_Corner_01");
    const fronts: FrontTable = { [key]: { front: "+z", corner: true, open: "-x" } };
    const bare: StackStyle = { ...STYLE("apartment-01"), open: {} };
    const corner = (st: StackStyle, f: FrontTable) => assembleStack(st, lot, ENTRIES, f)!.pieces.find((p) => p.key === key)!;
    expect(corner(bare, fronts).yaw).toBeCloseTo(Math.PI / 2, 9); // the table says "-x", the end is "+x": turned
    expect(corner(STYLE("apartment-01"), fronts).yaw).toBeCloseTo(Math.PI / 2, 9); // the table still wins over the recipe's "+x"
    expect(corner(STYLE("apartment-01"), NO_FRONTS).yaw).toBeCloseTo(0, 9); // no table line: the recipe says "+x"
    expect(corner(bare, NO_FRONTS).yaw).toBeCloseTo(0, 9); // neither: "+x"
    const plain: FrontTable = { [key]: { front: "+z" } }; // a saved front has no open: the recipe's guess stays
    expect(corner(STYLE("apartment-01"), plain).yaw).toBeCloseTo(0, 9);
  });
});

describe("the fixture against the manifest", () => {
  it("every fixture number is within 5 cm of the converted manifest (skipped when the manifest is absent)", (ctx) => {
    const file = join(process.cwd(), "assets", "private", "out", "manifest.json");
    if (!existsSync(file)) return ctx.skip();
    const manifest = JSON.parse(readFileSync(file, "utf8")) as { version: number; packs: { pack: string; assets: AssetEntry[] }[] };
    if (manifest.version !== ASSET_MANIFEST_VERSION) return ctx.skip();
    const pack = manifest.packs.find((p) => p.pack === "city-pack");
    if (!pack) return ctx.skip();
    for (const [name, w, h, d] of SIZES) {
      const e = pack.assets.find((a) => a.name === name);
      expect(e, name).toBeDefined();
      const b = e!.bounds;
      expect(b.max[0] - b.min[0], `${name} width`).toBeCloseTo(w, 1);
      expect(b.max[1] - b.min[1], `${name} height`).toBeCloseTo(h, 1);
      expect(b.max[2] - b.min[2], `${name} depth`).toBeCloseTo(d, 1);
    }
  });
});
