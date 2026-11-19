/**
 * Ticket 058: fire escapes that connect and meet the windows (`escapes.ts`, and the escape block of `dressing.ts`). Pure: every number is typed in from the converted City Pack (18 Nov 2026) and
 * every measurement has a synthetic mesh to run on, so CI needs no asset. The real `city-pack.glb` is read only inside the `it`s that say so, which skip when it is absent; no timer, no path
 * but forward slashes.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadPuzzle, type AssetEntry, type CalibrationKey } from "../core";
import { DRESS_PER_BAY_MAX, ESCAPES, ESCAPE_MIN_BAYS, KERB_FROM_FRONT_M, dressBlock, dressStack, dressTown, type DressBlockInput, type DressPiece } from "./dressing";
import {
  CODE_ESCAPE,
  CODE_ESCAPE_KEY,
  ESCAPE_DECK_BELOW_SILL_M,
  ESCAPE_DECK_TOL_M,
  ESCAPE_FIRST,
  ESCAPE_GEOMETRY,
  ESCAPE_GROUND_TOL_M,
  ESCAPE_JOINT_TOL_M,
  ESCAPE_MID,
  ESCAPE_SCALE_Y,
  ESCAPE_TABLES,
  ESCAPE_TOP,
  LADDER_RAIL_M,
  LADDER_RUNG_PITCH_M,
  WINDOW_SILL_M,
  codeEscape,
  deckCovers,
  escapeCheck,
  ladderParts,
  measureEscape,
  measureSills,
  planEscape,
  sillOf,
  storeysOfColumn,
  storeysOfPiece,
  upLevels,
  type EscapeGeometry,
  type EscapePart,
} from "./escapes";
import { runBlocks } from "./citymetrics";
import { BUILDING_FRONTS } from "./models";
import { STACK_STYLES, assembleStack, type Stack } from "./stacks";
import { packTown, type PackedBlock } from "./terrace";
import { TILE_CITY_R7_MIN, tileCity } from "./tilecity";
import { LOT_TYPE_NAMES, WORLD_PER_METRE, townLayout, type TerraceRun } from "./town";

const k = (name: string): CalibrationKey => `city-pack:${name}`;
const CITY_PACK_GLB = join("assets", "private", "out", "city-pack.glb");

// ---- the fixtures: the escape pieces' bounds (the ticket's table), and the building pieces a stack needs ----

/** [name, width, height, depth] in metres, centred bounds, minimum y 0. */
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
const ESCAPE_SIZES: [string, number, number, number][] = [
  ["SM_Bld_FireEscape_01", 3.251, 1.492, 1.644],
  ["SM_Bld_FireEscape_02", 3.251, 3.609, 1.644],
  ["SM_Bld_FireEscape_03", 4.252, 3.802, 1.76],
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
const entriesOf = (rows: [string, number, number, number][]): Map<CalibrationKey, AssetEntry> => new Map(rows.map(([n, w, h, d]) => [k(n), entryOf(n, w, h, d)]));
const BUILDINGS = entriesOf(SIZES);
const ENTRIES = entriesOf([...SIZES, ...ESCAPE_SIZES]);
const sizeOfKey = (key: CalibrationKey): [number, number, number] => {
  const b = ENTRIES.get(key)!.bounds;
  return [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]];
};

describe("the keys", () => {
  it("names the three pieces the dressing's ESCAPES table does, in the order top, middle, first landing", () => {
    expect([ESCAPE_TOP, ESCAPE_MID, ESCAPE_FIRST]).toEqual([...ESCAPES]);
    expect(Object.keys(ESCAPE_GEOMETRY).sort()).toEqual([...ESCAPES].sort());
    expect(CODE_ESCAPE_KEY).toBe("code:escape");
  });
});

// ---- A. the measured numbers, pinned ----

/** What `measureEscape` read from `city-pack.glb` of 18 Nov 2026, typed in. */
const PINNED: Record<string, EscapeGeometry> = {
  SM_Bld_FireEscape_01: { deck_m: 0.609, deckX0_m: -1.616, deckX1_m: 1.567, flightFoot_m: null, flightTop_m: null, flightFootX_m: null, flightTopX_m: null, hatchX_m: -0.939, ladderFoot_m: null, ladder_m: null, railTop_m: 1.492 },
  SM_Bld_FireEscape_02: { deck_m: 0.609, deckX0_m: -1.616, deckX1_m: 1.567, flightFoot_m: 0.609, flightTop_m: 3.609, flightFootX_m: 0.867, flightTopX_m: -0.939, hatchX_m: -0.939, ladderFoot_m: null, ladder_m: null, railTop_m: 1.492 },
  SM_Bld_FireEscape_03: { deck_m: 0.609, deckX0_m: -0.584, deckX1_m: 2.067, flightFoot_m: 0.609, flightTop_m: 3.609, flightFootX_m: -0.215, flightTopX_m: -2.02, hatchX_m: null, ladderFoot_m: 0.099, ladder_m: [0.853, 1.303, 0.798, 0.858], railTop_m: 1.492 },
};
/** The sills of the converted apartment pieces, above each piece's base. */
const PINNED_SILLS: Record<string, number | number[]> = {
  SM_Bld_Apartment_01: 0.756,
  SM_Bld_Apartment_Corner_01: 0.756,
  SM_Bld_Apartment_Stack_01: [0.756, 0.756, 0.756],
  SM_Bld_Apartment_02: 0.417,
  SM_Bld_Apartment_Corner_02: 0.417,
  SM_Bld_Apartment_Stack_02: [0.417, 0.417, 0.417],
  SM_Bld_Apartment_03: 0.517,
  SM_Bld_Apartment_Corner_03: 0.517,
  SM_Bld_Apartment_Stack_03: [0.517, 0.517, 0.517],
};

describe("ESCAPE_GEOMETRY and WINDOW_SILL_M (criteria 1 and 2)", () => {
  it("holds, for each escape piece, the numbers read from the converted GLB", () => {
    for (const [name, want] of Object.entries(PINNED)) expect(G(k(name)), name).toEqual(want);
    expect(Object.keys(ESCAPE_GEOMETRY)).toHaveLength(3);
    expect(ESCAPE_TABLES.geometry).toBe(ESCAPE_GEOMETRY);
  });

  it("is consistent with the pieces' bounds and with the storey pitch: the deck and the rail are inside the bound, the flight rises exactly one storey (3 m, every apartment style's floor pitch)", () => {
    const bound = (name: string): [number, number, number] => {
      const e = ESCAPE_SIZES.find((r) => r[0] === name)!;
      return [e[1], e[2], e[3]];
    };
    for (const [name, g] of Object.entries(PINNED)) {
      const [w, h] = bound(name);
      expect(g.deck_m, name).toBeLessThan(g.railTop_m);
      expect(g.railTop_m, name).toBeLessThanOrEqual(h);
      expect(g.deckX0_m, name).toBeGreaterThanOrEqual(-w / 2 - 0.01);
      expect(g.deckX1_m, name).toBeLessThanOrEqual(w / 2 + 0.01);
      if (g.flightTop_m !== null) {
        expect(g.flightTop_m - g.flightFoot_m!, name).toBeCloseTo(3, 6);
        expect(g.flightTop_m, name).toBeLessThanOrEqual(h + 1e-9);
      }
    }
    for (const s of STACK_STYLES.filter((q) => q.id.startsWith("apartment"))) expect(s.pitch_m.floor).toBe(3);
    // The flight of the middle piece arrives where a hatch is: the hatch x is the flight's top x, on the two pieces that have a hatch.
    expect(G(ESCAPE_MID).hatchX_m).toBe(G(ESCAPE_MID).flightTopX_m);
    expect(G(ESCAPE_TOP).hatchX_m).toBe(G(ESCAPE_MID).flightTopX_m);
    expect(G(ESCAPE_FIRST).hatchX_m).toBeNull();
    // Only the first landing has a drop ladder, and its rails stand past the deck's front edge.
    expect(G(ESCAPE_FIRST).ladder_m![2]).toBeGreaterThan(0.76);
  });

  it("holds every apartment floor, corner floor and Stack piece's sill, one per storey (three on a Stack piece), and every key of the three styles is there", () => {
    for (const [name, want] of Object.entries(PINNED_SILLS)) expect(WINDOW_SILL_M[k(name)], name).toEqual(want);
    for (const s of STACK_STYLES.filter((q) => q.id.startsWith("apartment"))) {
      for (const key of [...s.floor.mid, ...s.floor.corner, ...(s.floor.stack3 ?? [])]) {
        const v = WINDOW_SILL_M[key];
        expect(v, key).toBeDefined();
        expect(typeof v === "number" ? 1 : v!.length, key).toBe(storeysOfPiece(key));
      }
    }
    expect(storeysOfPiece(k("SM_Bld_Apartment_Stack_02"))).toBe(3);
    expect(storeysOfPiece(k("SM_Bld_Apartment_02"))).toBe(1);
  });

  it("takes a storey's sill from the piece, and from the style's median for a piece with no entry (every entry's median when the style has none)", () => {
    expect(sillOf(k("SM_Bld_Apartment_Stack_02"), 2)).toBe(0.417);
    expect(sillOf(k("SM_Bld_Apartment_01"), 0)).toBe(0.756);
    const sills = { [k("SM_Bld_Apartment_01")]: 0.7, [k("SM_Bld_Apartment_Corner_01")]: 0.8, [k("SM_Bld_Apartment_Stack_01")]: [0.6, 0.9, 1] };
    // Style 01 has four sills (0.6, 0.7, 0.8, 0.9, 1: five), a median of 0.8; an unlisted style 04 piece falls back to the median of everything.
    expect(sillOf(k("SM_Bld_Apartment_Roof_01"), 0, sills)).toBe(0.8);
    expect(sillOf(k("SM_Bld_Apartment_04"), 0, sills)).toBe(0.8);
    expect(sillOf(k("SM_Bld_Apartment_04"), 0, {})).toBe(0);
  });

  // Shown as skipped, not passed, where the converted City Pack is absent (CI, a fresh checkout).
  it.skipIf(!existsSync(CITY_PACK_GLB))("re-measures every escape piece and every sill from the converted City Pack within 0.02 m (skipped when this machine has no GLB)", () => {
    const file = CITY_PACK_GLB;
    const glb = readFileSync(file);
    const jsonLen = glb.readUInt32LE(12);
    const gltf = JSON.parse(glb.subarray(20, 20 + jsonLen).toString("utf8")) as {
      nodes: { name?: string; mesh?: number; children?: number[] }[];
      meshes: { primitives: { attributes: { POSITION: number }; indices: number }[] }[];
      accessors: { bufferView: number; byteOffset?: number; count: number; componentType: number }[];
      bufferViews: { byteOffset?: number; byteStride?: number }[];
    };
    const bin = glb.subarray(20 + jsonLen + 8);
    const mesh = (name: string): { pos: number[]; idx: number[] } => {
      const root = gltf.nodes.find((n) => n.name === name);
      expect(root, name).toBeDefined();
      const pos: number[] = [];
      const idx: number[] = [];
      const walk = (n: { mesh?: number; children?: number[] }): void => {
        for (const prim of n.mesh !== undefined ? gltf.meshes[n.mesh]!.primitives : []) {
          const a = gltf.accessors[prim.attributes.POSITION]!;
          const bv = gltf.bufferViews[a.bufferView]!;
          const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
          const first = pos.length / 3;
          for (let i = 0; i < a.count; i++) {
            const at = base + i * (bv.byteStride ?? 12);
            pos.push(bin.readFloatLE(at), bin.readFloatLE(at + 4), bin.readFloatLE(at + 8));
          }
          const ia = gltf.accessors[prim.indices]!;
          const ibv = gltf.bufferViews[ia.bufferView]!;
          const ib = (ibv.byteOffset ?? 0) + (ia.byteOffset ?? 0);
          for (let i = 0; i < ia.count; i++) idx.push(first + (ia.componentType === 5123 ? bin.readUInt16LE(ib + i * 2) : bin.readUInt32LE(ib + i * 4)));
        }
        for (const c of n.children ?? []) walk(gltf.nodes[c]!);
      };
      walk(root!);
      return { pos, idx };
    };
    const bad: string[] = [];
    const near = (label: string, got: number | null, want: number | null): void => {
      if ((got === null) !== (want === null) || (got !== null && want !== null && Math.abs(got - want) > 0.02)) bad.push(`${label}: measured ${String(got)}, table ${String(want)}`);
    };
    for (const [name, want] of Object.entries(PINNED)) {
      const m = mesh(name);
      const got = measureEscape(m)!;
      for (const f of ["deck_m", "deckX0_m", "deckX1_m", "flightFoot_m", "flightTop_m", "flightFootX_m", "flightTopX_m", "ladderFoot_m", "railTop_m"] as const) near(`${name}.${f}`, got[f], want[f]);
      (got.ladder_m ?? [null, null, null, null]).forEach((v, i) => near(`${name}.ladder_m[${i}]`, v, want.ladder_m?.[i] ?? null));
      // A hatch: the point just in from the arrival x, on the flight's line, is not over the deck.
      if (want.hatchX_m !== null) {
        if (deckCovers(m, want.hatchX_m + 0.2, 0.35)) bad.push(`${name}: the deck covers the hatch at x ${want.hatchX_m + 0.2}`);
        if (!deckCovers(m, want.hatchX_m - 0.4, 0.35)) bad.push(`${name}: no deck just past the hatch's end`);
      }
    }
    for (const [name, want] of Object.entries(PINNED_SILLS)) {
      const got = measureSills(mesh(name), typeof want === "number" ? 1 : want.length);
      const list = typeof want === "number" ? [want] : want;
      list.forEach((w, i) => near(`${name} sill ${i}`, got?.[i] ?? null, w));
    }
    expect(bad).toEqual([]);
  });
});

// ---- the measuring functions, on meshes built here ----

/** An upward-facing quad at height y over [x0, x1] x [z0, z1], as two triangles. */
function upQuad(pos: number[], idx: number[], y: number, x0: number, x1: number, z0: number, z1: number): void {
  const b = pos.length / 3;
  pos.push(x0, y, z0, x0, y, z1, x1, y, z1, x1, y, z0);
  idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
}
/** A quad facing +z at depth z over [x0, x1] x [y0, y1]. */
function frontQuad(pos: number[], idx: number[], z: number, x0: number, x1: number, y0: number, y1: number): void {
  const b = pos.length / 3;
  pos.push(x0, y0, z, x1, y0, z, x1, y1, z, x0, y1, z);
  idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
}

describe("measureEscape on a mesh built to the rules (criterion 1's rules)", () => {
  // A deck 3.2 x 1.6 at 0.6, a hatch on it (two slabs), a rail top at 1.5, four treads from 0.7 up, a stringer sliver to 3.6 and a ladder past the front edge from 0.1.
  const mesh = (): { pos: number[]; idx: number[] } => {
    const pos: number[] = [];
    const idx: number[] = [];
    upQuad(pos, idx, 0.6, -1.6, 1.6, -0.8, 0.0);
    upQuad(pos, idx, 0.6, -1.6, -0.9, 0.0, 0.8);
    upQuad(pos, idx, 0.6, 1, 1.6, 0.0, 0.8);
    upQuad(pos, idx, 1.5, -1.6, 1.6, 0.78, 0.8);
    for (const [y, x] of [[0.7, 0.8], [1.0, 0.4], [1.3, 0], [1.6, -0.4]] as const) upQuad(pos, idx, y, x - 0.1, x + 0.1, 0.1, 0.7);
    // A vertical sliver (not a horizontal face): the stringer's top at (x -0.5, y 3.6) and the ladder's foot past the front edge.
    const b = pos.length / 3;
    pos.push(-0.5, 3.6, 0.3, -0.5, 1.0, 0.3, -0.45, 1.0, 0.3, 0.9, 0.1, 0.84, 0.9, 1.2, 0.84, 1.3, 0.1, 0.86);
    idx.push(b, b + 1, b + 2, b + 3, b + 4, b + 5);
    return { pos, idx };
  };

  it("reads the deck as the largest horizontal face, the flight as the run of treads, the top of the flight and the rail, and the ladder as what stands past the deck's front edge", () => {
    const g = measureEscape(mesh())!;
    expect(g.deck_m).toBeCloseTo(0.6, 3);
    expect([g.deckX0_m, g.deckX1_m]).toEqual([-1.6, 1.6]);
    expect(g.flightFoot_m).toBeCloseTo(0.6, 3);
    expect(g.flightTop_m).toBeCloseTo(3.6, 3);
    expect(g.flightFootX_m).toBeCloseTo(0.8, 3);
    expect(g.flightTopX_m).toBeCloseTo(-0.4, 3);
    expect(g.railTop_m).toBeCloseTo(1.5, 3);
    expect(g.ladderFoot_m).toBeCloseTo(0.1, 3);
    expect(g.ladder_m).toEqual([0.9, 1.3, 0.84, 0.86]);
    expect(g.hatchX_m).toBeNull();
  });

  it("finds no flight and no ladder on a bare deck, and nothing on a mesh with no horizontal face", () => {
    const pos: number[] = [];
    const idx: number[] = [];
    upQuad(pos, idx, 0.6, -1.6, 1.6, -0.8, 0.8);
    upQuad(pos, idx, 1.5, -1.6, 1.6, 0.78, 0.8);
    const g = measureEscape({ pos, idx })!;
    expect([g.flightFoot_m, g.flightTop_m, g.flightFootX_m, g.flightTopX_m, g.ladderFoot_m, g.ladder_m]).toEqual([null, null, null, null, null, null]);
    expect(g.railTop_m).toBeCloseTo(1.5, 3);
    expect(measureEscape({ pos: [0, 0, 0, 1, 0, 0, 1, 1, 0], idx: null })).toBeNull();
    expect(upLevels({ pos: [0, 0, 0, 1, 1, 0, 1, 1, 1], idx: null })).toEqual([]);
  });

  it("tells a hatch from a deck with deckCovers", () => {
    const m = mesh();
    expect(deckCovers(m, 0, 0.4)).toBe(false);
    expect(deckCovers(m, 0, -0.4)).toBe(true);
    expect(deckCovers(m, -1.2, 0.4)).toBe(true);
    expect(deckCovers({ pos: [], idx: [] }, 0, 0)).toBe(false);
  });
});

describe("measureSills on a wall built to the rules (criterion 2's rules)", () => {
  // A wall at z 2.4 of two storeys, a frame at z 2.3 and glass at z 2.2 (deepest) in each storey, a pilaster in front.
  const wall = (): { pos: number[]; idx: number[] } => {
    const pos: number[] = [];
    const idx: number[] = [];
    frontQuad(pos, idx, 2.4, -2.5, 2.5, 0, 6);
    frontQuad(pos, idx, 2.6, -2.5, -2.2, 0, 6);
    for (const y0 of [0, 3]) {
      frontQuad(pos, idx, 2.3, -1, 1, y0 + 0.6, y0 + 2.4);
      frontQuad(pos, idx, 2.2, -0.9, 0.9, y0 + 0.7, y0 + 2.2);
    }
    return { pos, idx };
  };
  it("takes the lowest point of the deepest large front-facing plane in each storey's band", () => {
    expect(measureSills(wall(), 2)).toEqual([0.7, 0.7]);
    expect(measureSills(wall(), 1)).toEqual([0.7]);
  });
  it("counts every window of the front as glass, whatever its depth: a deeper side window does not hide a lower, shallower central one (Apartment_03), and a frame in front of its glass is not glass", () => {
    const pos: number[] = [];
    const idx: number[] = [];
    frontQuad(pos, idx, 2.4, -2.5, 2.5, 0, 3);
    // Two narrow deep side windows (sill 0.85) and a wide central one, shallower, with its frame in front (sill 0.5).
    frontQuad(pos, idx, 2.2, -2.4, -1.3, 0.85, 2.7);
    frontQuad(pos, idx, 2.2, 1.3, 2.4, 0.85, 2.7);
    frontQuad(pos, idx, 2.35, -0.9, 0.9, 0.5, 2.5);
    frontQuad(pos, idx, 2.45, -1, 1, 0.4, 2.6);
    expect(measureSills({ pos, idx }, 1)).toEqual([0.5]);
  });
  it("gives null when the geometry cannot settle it: no plane of the least area, or a storey with no glass", () => {
    const pos: number[] = [];
    const idx: number[] = [];
    frontQuad(pos, idx, 2.4, -0.5, 0.5, 0, 0.5);
    expect(measureSills({ pos, idx }, 1)).toBeNull();
    expect(measureSills(wall(), 3)).toBeNull();
  });
});

// ---- B. placing ----

/** A column's storeys: `n` floors from y 3, each with the sill. */
const storeysOf = (n: number, sill: number | ((j: number) => number)): { y: number; sill: number }[] => Array.from({ length: n }, (_, j) => ({ y: 3 + 3 * j, sill: typeof sill === "number" ? sill : sill(j) }));
/** A table entry that must be there. */
const G = (key: CalibrationKey): EscapeGeometry => ESCAPE_GEOMETRY[key]!;
/** A piece with no y-scale and no boxes. */
const plain = (p: DressPiece): DressPiece => {
  const { scaleY, parts, ...rest } = p;
  void scaleY;
  void parts;
  return rest;
};
const sizes = (key: CalibrationKey): [number, number, number] | null => (ENTRIES.has(key) ? sizeOfKey(key) : null);

describe("planEscape (criterion 3)", () => {
  it("puts one platform on every storey, 0.15 m under its sill, from 2 to 5 floors", () => {
    expect(ESCAPE_DECK_BELOW_SILL_M).toBe(0.15);
    for (let n = 2; n <= 5; n++) {
      const plan = planEscape(storeysOf(n, 0.756), sizes)!;
      expect(plan.slots, `${n} floors`).toHaveLength(n);
      expect(plan.decks, `${n} floors`).toHaveLength(n);
      plan.decks.forEach((d, j) => expect(d).toBeCloseTo(3 + 3 * j + 0.756 - 0.15, 9));
      plan.slots.forEach((s, j) => {
        const g = G(s.key);
        expect(s.key).toBe(j === 0 ? ESCAPE_FIRST : j === n - 1 ? ESCAPE_TOP : ESCAPE_MID);
        // The deck of the piece, scaled about its base, is the storey's deck.
        expect(s.y + g.deck_m * s.scaleY, `${n} floors, piece ${j}`).toBeCloseTo(plan.decks[j]!, 9);
        expect(s.scaleY).toBeGreaterThanOrEqual(ESCAPE_SCALE_Y.min);
        expect(s.scaleY).toBeLessThanOrEqual(ESCAPE_SCALE_Y.max);
      });
    }
  });

  it("scales each piece so its flight's top meets the deck above, within 0.02 m, and shifts it so the flight arrives at the upper deck's hatch", () => {
    // Storeys with different sills (a stack3 piece beside single floors): the scale absorbs it inside the 0.8 to 1.2 limits.
    const storeys = storeysOf(4, (j) => [0.756, 0.9, 0.6, 0.756][j]!);
    const plan = planEscape(storeys, sizes)!;
    expect(plan).not.toBeNull();
    plan.slots.forEach((s, j) => {
      if (j === plan.slots.length - 1) return;
      const g = G(s.key);
      const top = s.y + g.flightTop_m! * s.scaleY;
      expect(Math.abs(top - plan.decks[j + 1]!), `flight ${j}`).toBeLessThanOrEqual(ESCAPE_JOINT_TOL_M);
      const up = plan.slots[j + 1]!;
      expect(Math.abs(s.x + g.flightTopX_m! - (up.x + G(up.key).hatchX_m!)), `flight ${j} x`).toBeLessThanOrEqual(ESCAPE_JOINT_TOL_M);
    });
    // The top piece is not scaled.
    expect(plan.slots[3]!.scaleY).toBe(1);
  });

  it("centres the whole escape and keeps it inside a 5 m column: the first landing 1.08 m to one side of the flights above, 4.84 m in all", () => {
    const plan = planEscape(storeysOf(3, 0.756), sizes)!;
    const lo = Math.min(...plan.slots.map((s) => s.x - s.w / 2));
    const hi = Math.max(...plan.slots.map((s) => s.x + s.w / 2));
    expect(lo + hi).toBeCloseTo(0, 9);
    expect(plan.span_m).toBeCloseTo(hi - lo, 9);
    expect(plan.span_m).toBeCloseTo(4.835, 2);
    expect(plan.span_m).toBeLessThan(5);
    expect(plan.slots[1]!.x - plan.slots[0]!.x).toBeCloseTo(G(ESCAPE_FIRST).flightTopX_m! - G(ESCAPE_MID).hatchX_m!, 9);
    // The flights above are one over the other.
    expect(plan.slots[1]!.x).toBeCloseTo(plan.slots[2]!.x, 9);
  });

  it("gives null (the escape is drawn in code) where a piece must be scaled outside 0.8 to 1.2, a piece is missing, or there is no storey to climb", () => {
    expect(planEscape(storeysOf(3, (j) => [0.756, 3.2, 0.756][j]!), sizes)).toBeNull();
    expect(planEscape(storeysOf(3, (j) => [0.756, -1.5, 0.756][j]!), sizes)).toBeNull();
    expect(planEscape(storeysOf(3, 0.756), (key) => (key === ESCAPE_MID ? null : sizes(key)))).toBeNull();
    expect(planEscape(storeysOf(1, 0.756), sizes)).toBeNull();
    expect(planEscape([], sizes)).toBeNull();
  });
});

describe("the drop ladder and the code-drawn escape", () => {
  it("draws a ladder from the walk up to the pack ladder's foot: two rails 0.04 square, rungs 0.3 apart, none when the foot is on the walk", () => {
    const parts = ladderParts(3.1, 2.997, 0.853, 1.303, 0.828);
    const rails = parts.filter((p) => p.kind === "ladderRail");
    const rungs = parts.filter((p) => p.kind === "rung");
    expect(rails).toHaveLength(2);
    for (const r of rails) {
      // In world y (the piece's base is at 2.997): from 0 to the foot.
      expect(2.997 + r.y - r.h / 2).toBeCloseTo(0, 9);
      expect(2.997 + r.y + r.h / 2).toBeGreaterThanOrEqual(3.1);
      expect(r.w).toBe(LADDER_RAIL_M);
    }
    expect(rails.map((r) => r.x)).toEqual([0.853 + LADDER_RAIL_M / 2, 1.303 - LADDER_RAIL_M / 2]);
    expect(rungs.length).toBeGreaterThanOrEqual(9);
    rungs.forEach((r, i) => expect(2.997 + r.y).toBeCloseTo(LADDER_RUNG_PITCH_M * (i + 1), 9));
    expect(2.997 + rungs[rungs.length - 1]!.y).toBeLessThan(3.1);
    expect(ladderParts(0.01, 0, 0.853, 1.303, 0.828)).toEqual([]);
  });

  it("draws a whole escape in boxes: three deck slabs round a hatch, rails and posts on every storey, a flight between decks, the ladder from the walk", () => {
    const decks = [3.606, 6.606, 9.606];
    const parts = codeEscape(decks, decks[0]! - CODE_ESCAPE.deck);
    const of = (kind: EscapePart["kind"]): EscapePart[] => parts.filter((p) => p.kind === kind);
    expect(of("deck")).toHaveLength(9);
    expect(of("rail")).toHaveLength(9);
    expect(of("post")).toHaveLength(12);
    expect(of("stringer")).toHaveLength(4);
    expect(of("tread").length).toBeGreaterThan(20);
    expect(of("ladderRail")).toHaveLength(2);
    // The decks' tops are the given heights; the hatch is open between the slabs.
    const base = decks[0]! - CODE_ESCAPE.deck;
    for (const d of decks) expect(of("deck").some((p) => Math.abs(base + p.y + p.h / 2 - d) < 1e-9)).toBe(true);
    // The first flight's stringer runs from deck 0 to deck 1 at its two ends.
    const s = of("stringer")[0]!;
    const half = (s.w / 2) * Math.sin(s.rz!);
    expect(base + s.y - half).toBeCloseTo(decks[0]!, 9);
    expect(base + s.y + half).toBeCloseTo(decks[1]!, 9);
    for (const p of parts) expect(Number.isFinite(p.x + p.y + p.z + p.w + p.h + p.d), p.kind).toBe(true);
  });
});

// ---- the placement in the dressing, and the check ----

const stackAt = (n: number, styleId = "apartment-01", key = "e"): Stack => {
  const style = STACK_STYLES.find((q) => q.id === styleId)!;
  // The stack must hold exactly n floors over the base: ask each lot type for n (clamped into its range) and keep the one that gets there.
  for (const type of LOT_TYPE_NAMES) {
    for (let i = 0; i < 200; i++) {
      const stack = assembleStack(style, { type, key: `${key}${i}`, cornerSides: [] }, ENTRIES, {}, { floors: n, bays: 3 });
      if (stack && stack.floors === n && stack.bays >= ESCAPE_MIN_BAYS) return stack;
    }
  }
  throw new Error(`no ${n}-floor ${styleId} stack`);
};
/** A block's dressing with every chance forced in: the first lot key (from `tries`) that gets an escape. */
function withEscape(stack: Stack, entries: ReadonlyMap<CalibrationKey, AssetEntry> = ENTRIES, kerb = KERB_FROM_FRONT_M): { pieces: DressPiece[]; key: string } {
  for (let i = 0; i < 400; i++) {
    const key = `esc${i}`;
    const pieces = dressStack(stack, { key, hMax: 60 * WORLD_PER_METRE }, { id: "r", index: 0, lowest: false }, entries, {}, kerb);
    if (pieces.some((p) => p.slot === "escape")) return { pieces, key };
  }
  throw new Error("no lot key gives an escape");
}

describe("dressStack's escape and escapeCheck (criteria 3 and 4)", () => {
  it("places every escape on 2, 3, 4 and 5 floors of all three styles on the rule, and the check passes", () => {
    let seen = 0;
    for (const id of ["apartment-01", "apartment-02", "apartment-03"]) {
      for (const n of [2, 3, 4, 5]) {
        const stack = stackAt(n, id);
        const { pieces } = withEscape(stack);
        const esc = pieces.filter((p) => p.slot === "escape");
        expect(esc, `${id} ${n} floors`).toHaveLength(n);
        const [r] = escapeCheck(stack, pieces);
        expect(r, `${id} ${n}`).toMatchObject({ ok: true, missing: [], storeys: n, platforms: n });
        expect(r!.worstDeck_m, `${id} ${n} deck`).toBeLessThanOrEqual(ESCAPE_DECK_TOL_M);
        expect(r!.worstJoint_m, `${id} ${n} joint`).toBeLessThanOrEqual(ESCAPE_JOINT_TOL_M);
        expect(Math.abs(r!.ladderFoot_m!), `${id} ${n} ladder`).toBeLessThanOrEqual(ESCAPE_GROUND_TOL_M);
        // The first piece carries the ladder boxes; every other piece is plain.
        expect(esc[0]!.parts?.length, `${id} ${n}`).toBeGreaterThan(8);
        for (const p of esc.slice(1)) expect(p.parts, `${id} ${n}`).toBeUndefined();
        seen++;
      }
    }
    expect(seen).toBe(12);
  });

  it("stands each platform's deck 0.15 m under that storey's measured sill, a hand's height under the window (the deck is the pack piece's 0.609 m scaled, over the piece's base)", () => {
    const stack = stackAt(4, "apartment-01");
    const { pieces } = withEscape(stack);
    const esc = pieces.filter((p) => p.slot === "escape").sort((a, b) => a.y - b.y);
    esc.forEach((p, j) => {
      const deck = p.y + G(p.key).deck_m * (p.scaleY ?? 1);
      expect(deck, `storey ${j}`).toBeCloseTo(3 + 3 * j + 0.756 - 0.15, 9);
    });
    // Apartment_02's low sills put the first piece under its floor.
    const low = stackAt(3, "apartment-02");
    const lowEsc = withEscape(low).pieces.filter((p) => p.slot === "escape").sort((a, b) => a.y - b.y);
    expect(lowEsc[0]!.y).toBeCloseTo(3 + 0.417 - 0.15 - 0.609, 9);
  });

  it("keeps 052's eligibility: an apartment block of three bays and two floors, a mid column that is not a door or corner column, never on the block after one", () => {
    let blocks = 0;
    for (const id of ["apartment-01", "apartment-02", "apartment-03"]) {
      const style = STACK_STYLES.find((s) => s.id === id)!;
      for (const type of LOT_TYPE_NAMES) {
        for (let i = 0; i < 40; i++) {
          const stack = assembleStack(style, { type, key: `elig${i}`, cornerSides: i % 3 === 0 ? [{ side: "+x", road: "x" }] : [] }, ENTRIES, {});
          if (!stack) continue;
          blocks++;
          const lot = { key: `elig${i}`, hMax: 60 * WORLD_PER_METRE };
          const run = { id: "r", index: 0, lowest: false };
          const alone = dressBlock(stack, lot, run, ENTRIES, {});
          const esc = alone.pieces.filter((p) => p.slot === "escape");
          if (stack.bays < ESCAPE_MIN_BAYS || stack.floors < 2) expect(esc, `${id} ${type} ${i}`).toEqual([]);
          if (esc.length > 0) {
            const col = stack.columns[esc[0]!.column]!;
            expect(col.corner, `${id} ${type} ${i}`).toBeNull();
            expect(alone.used.escapePrev).toBe(true);
            // Never on the block after one.
            const next = dressBlock(stack, lot, { ...run, used: alone.used }, ENTRIES, {});
            expect(next.pieces.some((p) => p.slot === "escape")).toBe(false);
          }
          // Every piece of the escape is in one column, and the column's ground row has no glass-less gap: its shop stays plain (no awning, no sign).
          expect(new Set(esc.map((p) => p.column)).size).toBeLessThanOrEqual(1);
        }
      }
    }
    expect(blocks).toBeGreaterThan(200);
  });

  it("fails on 793bbf7's placement, the pieces stacked by their bounds: decks 0.80 and 1.41 m high on the way up, and the top floor with no platform", () => {
    const stack = stackAt(4, "apartment-01");
    const { pieces } = withEscape(stack);
    const base = pieces.find((p) => p.slot === "escape")!;
    // The old rule: the first landing on the base's top, then each piece on top of the last by its bound, the middle piece while it and the top still fit, then the top.
    const old: DressPiece[] = [];
    let y = 3;
    for (const key of [ESCAPE_FIRST, ESCAPE_MID, ESCAPE_TOP]) {
      const [w, h, d] = sizeOfKey(key);
      old.push({ ...plain(base), key, y, w, h, d });
      y += h;
    }
    expect(old.map((p) => p.y)).toEqual([3, 3 + 3.802, 3 + 3.802 + 3.609]);
    const others = pieces.filter((p) => p.slot !== "escape");
    const [r] = escapeCheck(stack, [...others, ...old]);
    expect(r!.ok).toBe(false);
    expect(r!.missing).toEqual([3]);
    // Pieces 1 and 2 sit 0.80 and 1.41 m above their floors' decks (the second by the third deck of the old stack), the first on the floor's deck within a few millimetres.
    expect(r!.worstDeck_m).toBeGreaterThan(1.4);
    expect(r!.worstDeck_m).toBeLessThan(1.42);
    expect(r!.platforms).toBe(3);
    expect(r!.ladderFoot_m).toBeGreaterThan(3);
    const first = escapeCheck(stack, [...others, old[0]!, old[1]!])[0]!;
    expect(first.worstDeck_m).toBeGreaterThan(0.79);
    expect(first.worstDeck_m).toBeLessThan(0.81);
  });

  it("fails on a flight short by 0.1 m (a piece's scale 0.1 m short of the deck above) and on a ladder whose foot is 0.5 m up", () => {
    const stack = stackAt(3, "apartment-01");
    const { pieces } = withEscape(stack);
    const [good] = escapeCheck(stack, pieces);
    expect(good!.ok).toBe(true);
    const shortFlight = pieces.map((p) => (p.slot === "escape" && p.key === ESCAPE_MID ? { ...p, scaleY: (p.scaleY ?? 1) * (1 - 0.1 / 3), h: p.h * (1 - 0.1 / 3) } : p));
    const [a] = escapeCheck(stack, shortFlight);
    expect(a!.ok).toBe(false);
    expect(a!.worstJoint_m).toBeGreaterThan(0.09);
    // A ladder whose foot is 0.5 m up: the first piece without its ladder boxes, lowered so its pack ladder's foot (0.099 m up the piece) is at 0.5.
    const raised = pieces.map((p) => (p.slot === "escape" && p.key === ESCAPE_FIRST ? { ...plain(p), y: 0.5 - G(ESCAPE_FIRST).ladderFoot_m! } : p));
    const [b] = escapeCheck(stack, raised);
    expect(b!.ok).toBe(false);
    expect(b!.ladderFoot_m).toBeCloseTo(0.5, 9);
    // The same escape with the ladder on the walk passes the ladder (its deck still does not).
    const near = pieces.map((p) => (p.slot === "escape" && p.key === ESCAPE_FIRST ? plain(p) : p));
    expect(escapeCheck(stack, near)[0]!.ladderFoot_m).toBeGreaterThan(3);
  });

  it("fails on a deck off its sill and on a joint off in x, and gives no report for a block with no escape", () => {
    const stack = stackAt(3, "apartment-03");
    const { pieces } = withEscape(stack);
    expect(escapeCheck(stack, pieces.filter((p) => p.slot !== "escape"))).toEqual([]);
    const lifted = pieces.map((p) => (p.slot === "escape" && p.key === ESCAPE_TOP ? { ...p, y: p.y + 0.1 } : p));
    expect(escapeCheck(stack, lifted)[0]).toMatchObject({ ok: false });
    expect(escapeCheck(stack, lifted)[0]!.worstDeck_m).toBeGreaterThan(0.09);
    const shifted = pieces.map((p) => (p.slot === "escape" && p.key === ESCAPE_TOP ? { ...p, x: p.x + 0.3 } : p));
    expect(escapeCheck(stack, shifted)[0]).toMatchObject({ ok: false });
    expect(escapeCheck(stack, shifted)[0]!.worstJoint_m).toBeGreaterThan(0.29);
  });

  it("holds the per-column cap with the escape in it, and an escape that does not fit under a nearer kerb is not placed", () => {
    for (const n of [2, 5]) {
      const stack = stackAt(n, "apartment-02");
      for (let i = 0; i < 60; i++) {
        const pieces = dressStack(stack, { key: `cap${i}`, hMax: 60 * WORLD_PER_METRE }, { id: "r", index: 0, lowest: i % 2 === 0 }, ENTRIES, {});
        const per = new Map<number, number>();
        for (const p of pieces) per.set(p.column, (per.get(p.column) ?? 0) + 1);
        for (const c of per.values()) expect(c).toBeLessThanOrEqual(DRESS_PER_BAY_MAX);
      }
    }
    const stack = stackAt(3, "apartment-01");
    const lot = withEscape(stack).key;
    const near = dressStack(stack, { key: lot, hMax: 60 * WORLD_PER_METRE }, { id: "r", index: 0, lowest: false }, ENTRIES, {}, 0.9);
    expect(near.some((p) => p.slot === "escape")).toBe(false);
  });

  it("draws the escape in code (one piece, key code:escape, with its parts) when the pack's pieces are missing from the entries, and the check passes on it", () => {
    const stack = stackAt(4, "apartment-01");
    const { pieces, key } = withEscape(stack, BUILDINGS);
    const esc = pieces.filter((p) => p.slot === "escape");
    expect(esc).toHaveLength(1);
    const code = esc[0]!;
    expect(code.key).toBe(CODE_ESCAPE_KEY);
    expect(code.parts!.length).toBeGreaterThan(60);
    expect(code.w).toBe(CODE_ESCAPE.w);
    expect(key).toBeTruthy();
    const [r] = escapeCheck(stack, pieces);
    expect(r).toMatchObject({ ok: true, missing: [], storeys: 4, platforms: 4 });
    expect(r!.worstDeck_m).toBeLessThan(1e-6);
    expect(Math.abs(r!.ladderFoot_m!)).toBeLessThan(1e-6);
    // The stack stands against its host's face and short of the kerb, as every front prop does.
    expect(code.z + code.d / 2).toBeLessThanOrEqual(KERB_FROM_FRONT_M + 1e-6);
    // With nothing loaded at all, there is no dressing and no escape.
    expect(dressStack(stack, { key, hMax: 60 * WORLD_PER_METRE }, { id: "r", index: 0, lowest: false }, new Map(), {})).toEqual([]);
  });

  it("draws the escape in code when any one of the pack's three pieces is missing (a style the pack does not fill is never silently skipped), and keeps the pack's pieces when all three are there", () => {
    const stack = stackAt(3, "apartment-01");
    const { key } = withEscape(stack);
    const lot = { key, hMax: 60 * WORLD_PER_METRE };
    const run = { id: "r", index: 0, lowest: false };
    for (const gone of ESCAPES) {
      const entries = new Map([...ENTRIES].filter(([q]) => q !== gone));
      const esc = dressStack(stack, lot, run, entries, {}).filter((p) => p.slot === "escape");
      expect(esc.map((p) => p.key), gone).toEqual([CODE_ESCAPE_KEY]);
    }
    expect(dressStack(stack, lot, run, ENTRIES, {}).filter((p) => p.slot === "escape").every((p) => p.key !== CODE_ESCAPE_KEY)).toBe(true);
    // A piece the converter flagged scale-suspect is as good as missing.
    const odd = new Map(ENTRIES);
    odd.set(ESCAPE_MID, { ...ENTRIES.get(ESCAPE_MID)!, warnings: ["scale-suspect"] } as AssetEntry);
    expect(dressStack(stack, lot, run, odd, {}).filter((p) => p.slot === "escape").map((p) => p.key)).toEqual([CODE_ESCAPE_KEY]);
  });
});

// ---- the whole town ----

/** The blocks of a plan as `dressTown` sites, as `dressSites` makes them (models3d.ts, which imports three), plus the run's frame. */
function sitesOf(list: readonly { run: TerraceRun; block: PackedBlock }[]): DressBlockInput[] {
  const count = new Map<string, number>();
  const lowest = new Map<string, number>();
  const index: number[] = [];
  list.forEach((r, i) => {
    const id = r.block.lot.terrace?.run ?? "";
    const n = count.get(id) ?? 0;
    index.push(n);
    count.set(id, n + 1);
    const low = lowest.get(id);
    if (low === undefined || r.block.stack.height_m < list[low]!.block.stack.height_m) lowest.set(id, i);
  });
  return list.map((r, i) => {
    const id = r.block.lot.terrace?.run ?? "";
    return { stack: r.block.stack, lot: { key: r.block.lot.key, hMax: r.block.lot.hMax }, run: { id, index: index[i]!, lowest: lowest.get(id) === i, ...(r.run.frame ? { frame: r.run.frame } : {}) }, kerbM: KERB_FROM_FRONT_M };
  });
}

interface Town {
  terraces: readonly TerraceRun[];
  lots: Parameters<typeof packTown>[0]["lots"];
}
/** Every escape of a town: checked against its block's stack, with the block's escapes counted against the qualifying blocks. */
function townReport(t: Town, label: string): { escapes: number; qualifying: number; failures: string[]; codeDrawn: number } {
  const packed = packTown({ terraces: t.terraces, lots: t.lots }, STACK_STYLES, ENTRIES, BUILDING_FRONTS);
  const list = runBlocks(t.terraces, packed);
  const sites = sitesOf(list);
  const dressed = dressTown(sites, ENTRIES, BUILDING_FRONTS);
  const failures: string[] = [];
  let escapes = 0;
  let qualifying = 0;
  let codeDrawn = 0;
  sites.forEach((s, i) => {
    if (s.stack.bays >= ESCAPE_MIN_BAYS && s.stack.floors >= 2 && s.stack.style.startsWith("apartment")) qualifying++;
    for (const r of escapeCheck(s.stack, dressed[i]!)) {
      escapes++;
      if (!r.ok) failures.push(`${label} ${s.lot.key}: ${JSON.stringify(r)}`);
    }
    if (dressed[i]!.some((p) => p.key === CODE_ESCAPE_KEY)) codeDrawn++;
  });
  return { escapes, qualifying, failures, codeDrawn };
}

describe("every escape of the town passes the check (criteria 4 and 5)", () => {
  it("passes on the default tile city and seeds 1 to 10 at 3 x 3, and the share of qualifying blocks with an escape holds the tile city's floor", { timeout: 300000 }, () => {
    expect(TILE_CITY_R7_MIN).toBe(0.4);
    let escapes = 0;
    for (const seed of [undefined, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const c = seed === undefined ? tileCity() : tileCity({ blocksX: 3, blocksZ: 3, seed });
      const r = townReport(c.town, `seed ${String(seed)}`);
      expect(r.failures, `seed ${String(seed)}`).toEqual([]);
      expect(r.codeDrawn, `seed ${String(seed)} has the pack's pieces`).toBe(0);
      expect(r.qualifying, `seed ${String(seed)}`).toBeGreaterThan(30);
      expect(r.escapes, `seed ${String(seed)}`).toBeGreaterThan(10);
      escapes += r.escapes;
    }
    expect(escapes).toBeGreaterThan(150);
  });

  it("passes on the three protocol maps", { timeout: 300000 }, () => {
    for (const file of ["09-shrine-circuit", "64-the-whole-chain", "01-first-light"]) {
      const puzzle = loadPuzzle(JSON.parse(readFileSync(join("puzzles", `${file}.json`), "utf8")));
      const r = townReport(townLayout(puzzle), file);
      expect(r.failures, file).toEqual([]);
      expect(r.escapes, file).toBeGreaterThan(5);
    }
  });
});

// ---- the module's own source ----

describe("escapes.ts", () => {
  const src = readFileSync("src/render3d/escapes.ts", "utf8");
  it("imports no three, no DOM, no grid, night, play, ui or render, and the dressing only as a type", () => {
    const imports = [...src.matchAll(/^import (?:type )?[^;]*from\s+"([^"]+)"/gm)].map((m) => m[1]!);
    expect(imports.sort()).toEqual(["../core", "./dressing", "./stacks"]);
    expect(src).toMatch(/^import type \{ DressPiece \} from "\.\/dressing";/m);
    expect(src).not.toMatch(/from "three"|document\.|window\./);
  });
});
