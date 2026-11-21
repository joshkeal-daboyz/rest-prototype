/**
 * Ticket 070 I, criterion 1: stage 8's furniture kit, constants and stage 7 bounds (src/city/ground/) are pinned to the tile city's and stage 7's (R-6, R-9).
 * Always (no GLB): the kit's keys equal `furnitureKeys()` less `Sidewalk_Panel_02` (PZ); each bound equals `furniture.test.ts`' fixture (typed into this test); the key lists equal `furniture.ts`' and the tile city's (`TILE_TREES`,
 * `TILE_BENCH`, `TILE_BINS`); every ported constant equals its `furniture.ts` or `tilecity.ts` original; `facadebounds.ts` equals stage 7's `DRESS_BOUNDS`, `WALL_BOUNDS` and `NOVELTY_BOUNDS` key by key for its keys; no kit key is
 * never-used (16.6).
 * Inside `it.skipIf(!HAVE_GLB)`, read lazily as `roofpin.test.ts` does: every kit key's bounds equal the converted GLB's within 0.005 m.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CalibrationKey } from "../core";
import * as C from "../city/ground/constants";
import * as FB from "../city/ground/facadebounds";
import * as KIT from "../city/ground/kit";
import { DRESS_BOUNDS } from "../city/facades/dresskit";
import { NOVELTY_BOUNDS } from "../city/facades/noveltykit";
import { CODE_ESCAPE, CODE_ESCAPE_KEY, WALL_BOUNDS } from "../city/facades/wallkit";
import { isNeverUsed } from "./citymetrics";
import * as OLD from "./furniture";
import * as TILE from "./tilecity";
import { TILE_BENCH, TILE_BINS, TILE_TREES } from "./tileslots";

/** The furniture's own sizes, as `furniture.test.ts` holds them: [name, width, height, depth] in metres. The paving panel is in the old table and not in the kit (PZ). */
const FURN_SIZES: readonly (readonly [string, number, number, number])[] = [
  ["SM_Prop_Trashbin_01", 0.647, 1.178, 0.647],
  ["SM_Prop_Trashbin_02", 0.721, 1.595, 0.582],
  ["SM_Prop_Planter_01", 2.301, 0.81, 0.701],
  ["SM_Prop_Planter_02", 1.511, 0.782, 0.463],
  ["SM_Prop_PotPlant_01", 0.565, 0.797, 0.578],
  ["SM_Prop_PotPlant_02", 0.694, 1.555, 0.639],
  ["SM_Prop_ParkBench_01", 2.079, 1.048, 0.624],
  ["SM_Prop_Mailbox_01", 0.666, 1.216, 0.586],
  ["SM_Prop_Newspaper_02", 0.613, 1.172, 0.478],
  ["SM_Prop_ParkingMeter_01", 0.225, 1.455, 0.128],
  ["SM_Prop_Hydrant_01", 0.551, 1.053, 0.54],
  ["SM_Env_Tree_01", 1.866, 4.208, 2.511],
  ["SM_Env_Tree_02", 2.236, 4.676, 1.54],
  ["SM_Env_Tree_03", 2.217, 3.845, 1.894],
  ["SM_Prop_SidewalkPoles_02", 0.209, 1.124, 0.209],
  ["SM_Prop_BusStop_01", 4.511, 3.073, 1.571],
  ["SM_Env_Road_ParkingLines_01", 10, 0, 5],
  ["SM_Prop_Barrier_01", 1.435, 0.983, 0.664],
  ["SM_Prop_ParkingMeter_02", 0.772, 1.869, 0.526],
  ["SM_Prop_Billboard_Pole_01", 0.606, 6.897, 0.606],
  ["SM_Prop_Billboard_01", 4.428, 2.345, 0.82],
  ["SM_Env_Sidewalk_Panel_02", 5, 0.094, 5],
  ["SM_Prop_PicnicTable_01", 2.483, 1.008, 1.687],
  ["SM_Prop_Umbrella_01", 1.597, 1.349, 1.597],
  ["SM_Prop_HotdogStand_01", 2.961, 3.662, 2.393],
];

describe("the ground kit equals the old path's furniture (070 I, criterion 1)", () => {
  it("the kit's keys are furnitureKeys() less the paving panel (24 keys)", () => {
    const want = OLD.furnitureKeys().filter((k) => k !== OLD.PLAZA_PANEL);
    expect(want).toHaveLength(24);
    expect([...KIT.KIT_KEYS].sort()).toEqual([...want].sort());
    expect(Object.keys(KIT.KIT_BOUNDS)).not.toContain(OLD.PLAZA_PANEL);
  });

  it("each key's bounds equal furniture.test.ts' fixture", () => {
    for (const [n, w, h, d] of FURN_SIZES) {
      const key = `city-pack:${n}` as CalibrationKey;
      if (key === OLD.PLAZA_PANEL) continue;
      expect(KIT.KIT_BOUNDS[key], n).toEqual({ w, h, d });
    }
  });

  it("each key list equals furniture.ts' and the tile city's (TILE_TREES, TILE_BENCH, TILE_BINS)", () => {
    expect(KIT.BINS).toEqual(OLD.BINS);
    expect(KIT.PLANTERS).toEqual(OLD.PLANTERS);
    expect(KIT.POT_PLANTS).toEqual(OLD.POT_PLANTS);
    expect(KIT.BENCHES).toEqual(OLD.BENCHES);
    expect(KIT.MAILBOXES).toEqual(OLD.MAILBOXES);
    expect(KIT.NEWSPAPERS).toEqual(OLD.NEWSPAPERS);
    expect(KIT.METERS).toEqual(OLD.METERS);
    expect(KIT.HYDRANTS).toEqual(OLD.HYDRANTS);
    expect(KIT.TREES).toEqual(OLD.TREES);
    expect(KIT.BOLLARDS).toEqual(OLD.BOLLARDS);
    expect(KIT.BUS_STOPS).toEqual(OLD.BUS_STOPS);
    expect(KIT.PARKING_LINES).toBe(OLD.PARKING_LINES);
    expect(KIT.BARRIERS).toEqual(OLD.BARRIERS);
    expect(KIT.LOT_METERS).toEqual(OLD.LOT_METERS);
    expect(KIT.BILLBOARD_POLE).toBe(OLD.BILLBOARD_POLE);
    expect(KIT.BILLBOARD_BOARD).toBe(OLD.BILLBOARD_BOARD);
    expect(KIT.PICNIC_TABLE).toBe(OLD.PICNIC_TABLE);
    expect(KIT.UMBRELLA).toBe(OLD.UMBRELLA);
    expect(KIT.HOTDOG_STAND).toBe(OLD.HOTDOG_STAND);
    expect(KIT.GREEN_TREES).toEqual(TILE_TREES);
    expect(KIT.GREEN_BENCH).toBe(TILE_BENCH);
    expect(KIT.LANE_BINS).toEqual(TILE_BINS);
  });

  it("every key is in exactly one kind's list, and the kinds' lists cover the kit", () => {
    const all = Object.values(KIT.KEYS_OF_KIND).flat();
    expect(new Set(all).size).toBe(all.length);
    expect([...all].sort()).toEqual([...KIT.KIT_KEYS].sort());
  });

  it("no kit key is on the never-used list (16.6)", () => {
    for (const k of KIT.KIT_KEYS) expect(isNeverUsed(k), k).toBe(false);
    for (const k of KIT.KIT_KEYS) expect(k.includes("LightPole"), k).toBe(false);
  });

  it("every ported constant equals its furniture.ts or tilecity.ts original", () => {
    expect(C.FURN_KERB_M).toBe(OLD.FURN_KERB_M);
    expect(C.FURN_WALL_M).toBe(OLD.FURN_WALL_M);
    expect(C.FURN_PITCH_M).toBe(OLD.FURN_PITCH_M);
    expect(C.TREE_PITCH_M).toBe(OLD.TREE_PITCH_M);
    expect(C.BUS_STOP_MIN_RUN_M).toBe(OLD.BUS_STOP_MIN_RUN_M);
    expect(C.FURN_KEEP_M).toBe(OLD.FURN_KEEP_M);
    expect(C.FURN_CORNER_M).toBe(OLD.FURN_CORNER_M);
    expect(C.FURN_MAX_H_M).toBe(OLD.FURN_MAX_H_M);
    expect(C.P_FURN).toBe(OLD.P_FURN);
    expect(C.FURN_GAP_SPAN_M).toBe(OLD.FURN_GAP_SPAN_M);
    expect(C.FURN_GAP_M).toBe(OLD.FURN_GAP_M);
    expect(C.P_BOLLARD).toBe(OLD.P_BOLLARD);
    expect(C.BOLLARD_PER_RUN).toBe(OLD.BOLLARD_PER_RUN);
    expect(C.HYDRANT_PER_RUN).toBe(OLD.HYDRANT_PER_RUN);
    expect(C.MAILBOX_PER_RUN).toBe(OLD.MAILBOX_PER_RUN);
    expect(C.NEWSPAPER_PER_RUN).toBe(OLD.NEWSPAPER_PER_RUN);
    expect(C.BUS_STOP_PER_RUN).toBe(OLD.BUS_STOP_PER_RUN);
    expect(C.P_PARKING_BILLBOARD).toBe(OLD.P_PARKING_BILLBOARD);
    expect(C.BILLBOARD_BOARD_LIFT_M).toBe(OLD.BILLBOARD_BOARD_LIFT_M);
    expect(C.SLAB_MAX_M).toBe(OLD.SLAB_MAX_M);
    expect(C.GREEN_TREE_ONE_IN).toBe(TILE.GREEN_TREE_ONE_IN);
    expect(C.BENCH_FROM_PATH_M).toBe(TILE.BENCH_FROM_PATH_M);
    expect(C.ALLEY_BIN_EVERY_M).toBe(TILE.ALLEY_BIN_EVERY_M);
    expect(C.CELL_M).toBe(TILE.TILE_M);
  });

  it("the numbers Q28 added are pinned, not compared: a half cell, and the lane walk's first place 12.5 m", () => {
    expect(C.HALF_CELL_M).toBe(2.5);
    expect(C.LANE_BIN_FIRST_M).toBe(12.5);
    // the tile city's walk (first place 10 m) is a cell edge; the pipeline's is a building bay's middle
    expect(TILE.TILE_M + TILE.ALLEY_BIN_EVERY_M / 2).toBe(10);
  });
});

describe("the stage 7 bounds stage 8 keeps clear of equal stage 7's (070 I, criterion 1)", () => {
  it("15 dressing keys, 8 wall keys and 17 novelty keys, each equal to DRESS_BOUNDS, WALL_BOUNDS and NOVELTY_BOUNDS", () => {
    expect(Object.keys(FB.AVOID_DRESS_BOUNDS)).toHaveLength(15);
    expect(Object.keys(FB.AVOID_WALL_BOUNDS)).toHaveLength(8);
    expect(Object.keys(FB.AVOID_NOVELTY_BOUNDS)).toHaveLength(17);
    for (const [k, v] of Object.entries(FB.AVOID_DRESS_BOUNDS)) expect(DRESS_BOUNDS[k as CalibrationKey], k).toEqual(v);
    for (const [k, v] of Object.entries(FB.AVOID_WALL_BOUNDS)) expect(WALL_BOUNDS[k as CalibrationKey], k).toEqual(v);
    for (const [k, v] of Object.entries(FB.AVOID_NOVELTY_BOUNDS)) expect(NOVELTY_BOUNDS[k as CalibrationKey], k).toEqual(v);
  });

  it("the dressing keys are every DRESS_BOUNDS key but the glass (the 22 less the 7 glass keys), and the wall and novelty keys are all of theirs", () => {
    const nonGlass = Object.keys(DRESS_BOUNDS).filter((k) => !k.endsWith("_Glass"));
    expect(Object.keys(FB.AVOID_DRESS_BOUNDS).sort()).toEqual(nonGlass.sort());
    expect(Object.keys(FB.AVOID_WALL_BOUNDS).sort()).toEqual(Object.keys(WALL_BOUNDS).sort());
    expect(Object.keys(FB.AVOID_NOVELTY_BOUNDS).sort()).toEqual(Object.keys(NOVELTY_BOUNDS).sort());
  });

  it("the code-drawn escape's key and footprint equal wallkit's", () => {
    expect(FB.CODE_ESCAPE_KEY).toBe(CODE_ESCAPE_KEY);
    expect(FB.CODE_ESCAPE_W_M).toBe(CODE_ESCAPE.w);
    expect(FB.CODE_ESCAPE_D_M).toBe(CODE_ESCAPE.d);
  });
});

// ---- the GLB, when this machine has it ----

interface Gltf {
  nodes: { name?: string; mesh?: number; children?: number[] }[];
  meshes: { primitives: { attributes: { POSITION: number } }[] }[];
  accessors: { bufferView: number; byteOffset?: number; count: number }[];
  bufferViews: { byteOffset?: number; byteStride?: number }[];
}

const CITY_GLB = join("assets", "private", "out", "city-pack.glb");
/** True when the converted City Pack is on this machine (a fresh checkout and CI have none). Only the file's presence is looked at here; it is read inside the test. */
const HAVE_GLB = existsSync(CITY_GLB);

function readGlb(): { gltf: Gltf; bin: Buffer } {
  const glb = readFileSync(CITY_GLB);
  const jsonLen = glb.readUInt32LE(12);
  return { gltf: JSON.parse(glb.subarray(20, 20 + jsonLen).toString("utf8")) as Gltf, bin: glb.subarray(20 + jsonLen + 8) };
}

/** The bounds (min and max) of every vertex of the node called `name` and its children. */
function glbBounds(gltf: Gltf, bin: Buffer, name: string): { min: number[]; max: number[] } {
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
          const v = bin.readFloatLE(at + 4 * c);
          min[c] = Math.min(min[c]!, v);
          max[c] = Math.max(max[c]!, v);
        }
      }
    }
    for (const c of q.children ?? []) walk(gltf.nodes[c]!);
  };
  walk(root!);
  return { min, max };
}

describe("the ground kit equals the converted GLB (070 I, criterion 1; skipped without the GLB)", () => {
  it.skipIf(!HAVE_GLB)("every kit key's bounds (w, h, d) equal the GLB's within 0.005 m", { timeout: 120000 }, () => {
    const { gltf, bin } = readGlb();
    const bad: string[] = [];
    for (const k of KIT.KIT_KEYS) {
      const { min, max } = glbBounds(gltf, bin, k.slice("city-pack:".length));
      const t = KIT.KIT_BOUNDS[k]!;
      for (const [n, want, got] of [["w", t.w, max[0]! - min[0]!], ["h", t.h, max[1]! - min[1]!], ["d", t.d, max[2]! - min[2]!]] as const) {
        if (Math.abs(want - got) > 0.005) bad.push(`${k} ${n}: table ${want}, GLB ${got.toFixed(3)}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
