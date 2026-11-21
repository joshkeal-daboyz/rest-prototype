/**
 * Ticket 070 H2, criterion 1: the facades stage's wall table (src/city/facades/wallkit.ts) and its ported escape functions (src/city/facades/escape.ts) are pinned to the tile city's (R-6).
 * Always (no GLB): each key list, each number and both tables (`ESCAPE_GEOMETRY`, `WINDOW_SILL_M`) equal `escapes.ts`' and `dressing.ts'`; `TILE_CITY_R7_MIN` equals `tilecity.ts'`; `ESCAPE_MIN_BAYS` equals `dressing.ts'`;
 * the folder's `planEscape`, `codeEscape`, `ladderParts` and `sillOf` give `escapes.ts`' results on fixture columns (3, 4 and 5 storeys, each style), and its `escapeBlocks` gives `escapes.ts`' choice on fixture sites when both
 * are given `escapeRank`'s ranks (058 and 061 moved unchanged); `DRESS_NUDGE_M` and `DRESS_FRONTS` name none of these keys, so every key's own front is +z. Inside `it.skipIf(!HAVE_GLB)`, read lazily as
 * `shopfrontpin.test.ts` does: every key's bounds equal the converted GLB's within 0.005 m.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CalibrationKey } from "../core";
import { DRESS_PER_BAY_MAX } from "../city/facades/dresskit";
import * as NEW from "../city/facades/escape";
import * as KIT from "../city/facades/wallkit";
import * as OLD from "./dressing";
import * as OLDE from "./escapes";
import { BUILDING_FRONTS } from "./models";
import { TILE_CITY_R7_MIN } from "./tilecity";

describe("the wall table equals the old path's numbers (070 H2, criterion 1)", () => {
  it("each key list equals dressing.ts' and escapes.ts' (the escape pieces, the door canopies, the air-conditioner, the planters)", () => {
    expect(KIT.ESCAPES).toEqual(OLD.ESCAPES);
    expect([KIT.ESCAPE_TOP, KIT.ESCAPE_MID, KIT.ESCAPE_FIRST, KIT.CODE_ESCAPE_KEY]).toEqual([OLDE.ESCAPE_TOP, OLDE.ESCAPE_MID, OLDE.ESCAPE_FIRST, OLDE.CODE_ESCAPE_KEY]);
    expect(KIT.DOOR_CANOPIES).toEqual(OLD.DOOR_CANOPIES);
    expect(KIT.WALL_ACS).toEqual(OLD.WALL_ACS);
    expect(KIT.WALL_PLANTERS).toEqual(OLD.WALL_PLANTERS);
  });

  it("each chance, cap and attachment number equals dressing.ts'; DRESS_PER_BAY_MAX and ESCAPE_MIN_BAYS too", () => {
    expect([KIT.P_CANOPY, KIT.P_WALL_AC, KIT.P_PLANTER, KIT.ESCAPE_MIN_BAYS, KIT.WALL_PROPS_PER_BLOCK, KIT.WALL_MIN_LEVEL, KIT.WALL_AC_LIFT_M, KIT.PLANTER_LIFT_M, KIT.WALL_AC_OFFSET_M, KIT.DOOR_CANOPY_Y_M]).toEqual([
      OLD.P_CANOPY,
      OLD.P_WALL_AC,
      OLD.P_PLANTER,
      OLD.ESCAPE_MIN_BAYS,
      OLD.WALL_PROPS_PER_BLOCK,
      OLD.WALL_MIN_LEVEL,
      OLD.WALL_AC_LIFT_M,
      OLD.PLANTER_LIFT_M,
      OLD.WALL_AC_OFFSET_M,
      OLD.DOOR_CANOPY_Y_M,
    ]);
    expect(DRESS_PER_BAY_MAX).toBe(OLD.DRESS_PER_BAY_MAX);
  });

  it("each escape number, the code-drawn escape's table, ESCAPE_GEOMETRY and WINDOW_SILL_M equal escapes.ts'; TILE_CITY_R7_MIN is tilecity.ts' 0.4", () => {
    expect([KIT.ESCAPE_DECK_BELOW_SILL_M, KIT.ESCAPE_DECK_TOL_M, KIT.ESCAPE_JOINT_TOL_M, KIT.ESCAPE_GROUND_TOL_M, KIT.LADDER_RUNG_PITCH_M, KIT.LADDER_RAIL_M, KIT.LADDER_RUNG_M]).toEqual([
      OLDE.ESCAPE_DECK_BELOW_SILL_M,
      OLDE.ESCAPE_DECK_TOL_M,
      OLDE.ESCAPE_JOINT_TOL_M,
      OLDE.ESCAPE_GROUND_TOL_M,
      OLDE.LADDER_RUNG_PITCH_M,
      OLDE.LADDER_RAIL_M,
      OLDE.LADDER_RUNG_M,
    ]);
    expect(KIT.ESCAPE_SCALE_Y).toEqual(OLDE.ESCAPE_SCALE_Y);
    expect(KIT.CODE_ESCAPE).toEqual(OLDE.CODE_ESCAPE);
    expect(KIT.ESCAPE_GEOMETRY).toEqual(OLDE.ESCAPE_GEOMETRY);
    expect(KIT.WINDOW_SILL_M).toEqual(OLDE.WINDOW_SILL_M);
    expect(KIT.TILE_CITY_R7_MIN).toBe(TILE_CITY_R7_MIN);
    expect(KIT.TILE_CITY_R7_MIN).toBe(0.4);
  });

  it("the table holds the eight keys, once each, with the bounds dressing.test.ts' fixture has", () => {
    const fixture: Record<string, [number, number, number]> = {
      SM_Bld_Cover_01: [4.832, 1.075, 1.0],
      SM_Bld_Cover_02: [1.366, 0.974, 0.701],
      SM_Bld_FireEscape_01: [3.251, 1.492, 1.644],
      SM_Bld_FireEscape_02: [3.251, 3.609, 1.644],
      SM_Bld_FireEscape_03: [4.252, 3.802, 1.76],
      SM_Prop_Aircon_01: [0.823, 0.995, 0.651],
      SM_Prop_PlanterWindow_01: [0.988, 0.743, 0.37],
      SM_Prop_PlanterWindow_02: [0.87, 0.743, 0.332],
    };
    const all = [...KIT.ESCAPES, ...KIT.DOOR_CANOPIES, ...KIT.WALL_ACS, ...KIT.WALL_PLANTERS];
    expect(all).toHaveLength(8);
    expect(new Set(all).size).toBe(8);
    expect(Object.keys(KIT.WALL_BOUNDS).sort()).toEqual([...all].sort());
    for (const [name, [w, h, d]] of Object.entries(fixture)) expect(KIT.WALL_BOUNDS[`city-pack:${name}`], name).toEqual({ w, h, d });
  });

  it("every key's own front is +z: DRESS_NUDGE_M and DRESS_FRONTS are empty and BUILDING_FRONTS names none of the eight keys", () => {
    expect(Object.keys(OLD.DRESS_NUDGE_M)).toEqual([]);
    expect(Object.keys(OLD.DRESS_FRONTS)).toEqual([]);
    const names = Object.keys(KIT.WALL_BOUNDS);
    for (const k of Object.keys(BUILDING_FRONTS)) expect(names, k).not.toContain(k);
  });
});

describe("the ported functions give escapes.ts' results (058 and 061 moved unchanged)", () => {
  const STYLES = [
    { style: "01", sill: 0.756 },
    { style: "02", sill: 0.417 },
    { style: "03", sill: 0.517 },
  ];
  /** The floors over the ground of a building of `storeys` storeys: storey k at y = 3 k. */
  const storeysOf = (storeys: number, sill: number): { y: number; sill: number }[] => Array.from({ length: storeys - 1 }, (_, n) => ({ y: 3 * (n + 1), sill }));
  const sizes = (key: CalibrationKey): [number, number, number] | null => {
    const e = KIT.WALL_BOUNDS[key];
    return e ? [e.w, e.h, e.d] : null;
  };

  it("planEscape, codeEscape and ladderParts agree on 3, 4 and 5 storeys of each style", () => {
    for (const { sill } of STYLES) {
      for (const storeys of [3, 4, 5]) {
        const list = storeysOf(storeys, sill);
        const plan = NEW.planEscape(list, sizes);
        const old = OLDE.planEscape(list, sizes);
        expect(plan, `${storeys} storeys, sill ${sill}`).toEqual(old);
        expect(plan).not.toBeNull();
        const decks = list.map((s) => s.y + s.sill - KIT.ESCAPE_DECK_BELOW_SILL_M);
        expect(NEW.codeEscape(decks, decks[0]! - KIT.CODE_ESCAPE.deck)).toEqual(OLDE.codeEscape(decks, decks[0]! - KIT.CODE_ESCAPE.deck));
        const first = plan!.slots[0]!;
        const g = KIT.ESCAPE_GEOMETRY[KIT.ESCAPE_FIRST]!;
        const foot = first.y + g.ladderFoot_m! * first.scaleY;
        expect(NEW.ladderParts(foot, first.y, g.ladder_m![0], g.ladder_m![1], (g.ladder_m![2] + g.ladder_m![3]) / 2)).toEqual(OLDE.ladderParts(foot, first.y, g.ladder_m![0], g.ladder_m![1], (g.ladder_m![2] + g.ladder_m![3]) / 2));
        for (let j = 0; j < 3; j++) expect(NEW.sillOf(`city-pack:SM_Bld_Apartment_Stack_0${STYLES.findIndex((q) => q.sill === sill) + 1}`, j)).toBe(OLDE.sillOf(`city-pack:SM_Bld_Apartment_Stack_0${STYLES.findIndex((q) => q.sill === sill) + 1}`, j));
      }
    }
    // a piece that must be scaled out of range, and a missing piece: both are null (code-drawn)
    expect(NEW.planEscape(storeysOf(4, 0.417).map((s, n) => ({ ...s, y: s.y + n * 1.5 })), sizes)).toBeNull();
    expect(OLDE.planEscape(storeysOf(4, 0.417).map((s, n) => ({ ...s, y: s.y + n * 1.5 })), sizes)).toBeNull();
    expect(NEW.planEscape(storeysOf(4, 0.417), () => null)).toBeNull();
    expect(NEW.sillOf("city-pack:SM_Bld_Apartment_Mystery_02", 0)).toBe(OLDE.sillOf("city-pack:SM_Bld_Apartment_Mystery_02", 0));
  });

  it("escapeBlocks gives the same choice on fixture sites, at 0.4 and 0.5, when given escapeRank's ranks", () => {
    let seed = 12345;
    const next = (): number => {
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
      return seed / 4294967296;
    };
    for (let round = 0; round < 6; round++) {
      const old: OLDE.EscapeSite[] = [];
      const sites: NEW.EscapeSite[] = [];
      let n = 0;
      for (let run = 0; run < 9; run++) {
        const len = 1 + Math.floor(next() * 6);
        for (let i = 0; i < len; i++, n++) {
          const qualifies = next() > 0.2;
          const hosts = next() > 0.15;
          const key = `lot${round}-${n}`;
          old.push({ id: `b${n}`, key, run: `run${run}`, qualifies, hosts });
          sites.push({ id: `b${n}`, rank: OLDE.escapeRank(key), run: `run${run}`, qualifies, hosts });
        }
      }
      for (const share of [0.4, 0.5, 0.9, 0]) {
        const a = NEW.escapeBlocks(sites, share);
        const b = OLDE.escapeBlocks(old, share);
        expect([...a.chosen].sort(), `round ${round}, share ${share}`).toEqual([...b.chosen].sort());
        expect([a.qualifying, a.target, a.escapeShort]).toEqual([b.qualifying, b.target, b.escapeShort]);
      }
    }
  });
});

// ---- the GLB, when this machine has it ----

interface Gltf {
  nodes: { name?: string; mesh?: number; children?: number[] }[];
  meshes: { primitives: { attributes: { POSITION: number }; indices?: number }[] }[];
  accessors: { bufferView: number; byteOffset?: number; count: number; componentType: number }[];
  bufferViews: { byteOffset?: number; byteStride?: number }[];
}

const CITY_GLB = join("assets", "private", "out", "city-pack.glb");
/** True when the converted City Pack is on this machine (a fresh checkout and CI have none). Only the file's presence is looked at here; it is read inside the test. */
const HAVE_GLB = existsSync(CITY_GLB);

/** The bounds of every vertex of the node called `name` and its children in the converted City Pack, read lazily. */
function glbBounds(names: readonly string[]): Map<string, { w: number; h: number; d: number }> {
  const glb = readFileSync(CITY_GLB);
  const jsonLen = glb.readUInt32LE(12);
  const gltf = JSON.parse(glb.subarray(20, 20 + jsonLen).toString("utf8")) as Gltf;
  const bin = glb.subarray(20 + jsonLen + 8);
  const out = new Map<string, { w: number; h: number; d: number }>();
  for (const name of names) {
    const root = gltf.nodes.find((q) => q.name === name);
    expect(root, name).toBeDefined();
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    const walk = (q: { mesh?: number; children?: number[] }): void => {
      for (const prim of q.mesh !== undefined ? gltf.meshes[q.mesh]!.primitives : []) {
        const a = gltf.accessors[prim.attributes.POSITION]!;
        const bv = gltf.bufferViews[a.bufferView]!;
        const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
        for (let i = 0; i < a.count; i++) {
          const at = base + i * (bv.byteStride ?? 12);
          for (let c = 0; c < 3; c++) {
            const v = bin.readFloatLE(at + c * 4);
            min[c] = Math.min(min[c]!, v);
            max[c] = Math.max(max[c]!, v);
          }
        }
      }
      for (const c of q.children ?? []) walk(gltf.nodes[c]!);
    };
    walk(root!);
    out.set(name, { w: max[0]! - min[0]!, h: max[1]! - min[1]!, d: max[2]! - min[2]! });
  }
  return out;
}

describe("the wall table equals the converted GLB (070 H2, criterion 1; skipped without the GLB)", () => {
  it.skipIf(!HAVE_GLB)("every wall key's bounds (w, h, d) equal the GLB's within 0.005 m", { timeout: 120000 }, () => {
    const keys = Object.keys(KIT.WALL_BOUNDS);
    const found = glbBounds(keys.map((k) => k.slice("city-pack:".length)));
    const bad: string[] = [];
    for (const k of keys) {
      const b = found.get(k.slice("city-pack:".length))!;
      const t = KIT.WALL_BOUNDS[k as keyof typeof KIT.WALL_BOUNDS]!;
      for (const [n, want, got] of [["w", t.w, b.w], ["h", t.h, b.h], ["d", t.d, b.d]] as const) if (Math.abs(want - got) > 0.005) bad.push(`${k} ${n}: table ${want}, GLB ${got.toFixed(3)}`);
    }
    expect(bad).toEqual([]);
  });
});
