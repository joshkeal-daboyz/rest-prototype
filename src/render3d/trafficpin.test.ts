/**
 * Ticket 070 TR1, criterion 1: stage 9's traffic kit, constants and stage 7 bounds (src/city/traffic/) are pinned (R-6, R-9).
 * Always (no GLB): each bound and fix point equals a typed fixture; every kit key that `isNeverUsed` names is in the kit's `TRAFFIC_ALLOWED` list, which holds exactly Josh's Q33 five (21 Nov 2026), and no other key is; `facadebounds.ts` equals
 * ground's copy key by key; the four numbers equal Q43's and the two copied equal ground's.
 * Inside `it.skipIf(!HAVE_GLB)`, read lazily as `furnpin.test.ts` does: every bound equals the converted GLB's within 0.005 m; the arm's two heads lie `ARM.headsAlong` from its clamp's pole axis within 0.05 m (the pre-check estimated 4.26 and
 * 6.0; the vertices say 4.32 and 6.01); the mast's pole, collars and the arm's clamp are where the kit types them.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CalibrationKey } from "../core";
import * as GROUND_C from "../city/ground/constants";
import * as GROUND_FB from "../city/ground/facadebounds";
import * as C from "../city/traffic/constants";
import * as FB from "../city/traffic/facadebounds";
import * as KIT from "../city/traffic/kit";
import { isNeverUsed } from "./citymetrics";

/** The kit's own sizes, as typed from the GLB: [name, width, height, depth] in metres. */
const SIZES: readonly (readonly [string, number, number, number])[] = [
  ["SM_Prop_LightPole_Base_01", 0.346, 6.483, 2.478],
  ["SM_Prop_LightPole_Arm_01", 0.404, 0.92, 6.278],
  ["SM_Prop_LightPole_CrossLights_01", 0.452, 0.397, 0.314],
  ["SM_Prop_LightPole_CrossButton_01", 0.162, 0.299, 0.17],
  ["SM_Prop_LightPole_Box_01", 0.228, 0.527, 0.39],
  ["SM_Prop_Sign_Stop_01", 0.77, 2.271, 0.124],
];
const Q33_FIVE = ["SM_Prop_LightPole_Base_01", "SM_Prop_LightPole_Arm_01", "SM_Prop_LightPole_CrossLights_01", "SM_Prop_LightPole_CrossButton_01", "SM_Prop_LightPole_Box_01"].map((n) => `city-pack:${n}`);

describe("the traffic kit (070 TR1, criterion 1)", () => {
  it("the kit has the six keys and each bound equals the typed fixture", () => {
    expect(KIT.TRAFFIC_KEYS).toHaveLength(6);
    for (const [n, w, h, d] of SIZES) expect(KIT.TRAFFIC_BOUNDS[`city-pack:${n}` as CalibrationKey], n).toEqual({ w, h, d });
    expect([...KIT.TRAFFIC_KEYS].sort()).toEqual(SIZES.map(([n]) => `city-pack:${n}`).sort());
  });

  it("each kind's key is its key, once each, and every key is the key of one kind", () => {
    expect(KIT.KEY_OF_KIND).toEqual({
      signalMast: "city-pack:SM_Prop_LightPole_Base_01",
      signalArm: "city-pack:SM_Prop_LightPole_Arm_01",
      walkHead: "city-pack:SM_Prop_LightPole_CrossLights_01",
      pushButton: "city-pack:SM_Prop_LightPole_CrossButton_01",
      signalBox: "city-pack:SM_Prop_LightPole_Box_01",
      stopSign: "city-pack:SM_Prop_Sign_Stop_01",
    });
    expect([...Object.values(KIT.KEY_OF_KIND)].sort()).toEqual([...KIT.TRAFFIC_KEYS].sort());
  });

  it("the fix points equal the typed fixtures", () => {
    expect(KIT.MAST).toEqual({ axis: { x: 0, z: -1.0665 }, foot: { w: 0.346, d: 0.345 }, radius: 0.09, armY: 5.3835, walkHeadY: [3.201, 3.701], buttonY: 1.1, hookY: 6.0, clampFace: "-z" });
    expect(KIT.ARM).toEqual({ axis: { x: 0.095, z: -3.033 }, clampY: 0.5793, headsAlong: [4.318, 6.009], headLowY: 0.015, reach: 6.172, lens: "-x" });
    expect(KIT.ARM_BASE_Y).toBeCloseTo(4.8042, 4);
    expect(KIT.HEAD_LOW_Y).toBeCloseTo(4.8192, 4);
    // the foot is the pole's base plate: inside the mast's bounds on its own -z side
    expect(KIT.MAST.axis.z - KIT.MAST.foot.d / 2).toBeCloseTo(-KIT.boundsOf(KIT.SIGNAL_MAST_KEY).d / 2, 2);
  });

  it("every kit key the never-used list names is in TRAFFIC_ALLOWED, which holds exactly Josh's five (Q33), and no other key is", () => {
    expect([...KIT.TRAFFIC_ALLOWED].sort()).toEqual([...Q33_FIVE].sort());
    for (const k of KIT.TRAFFIC_KEYS) expect(isNeverUsed(k) ? KIT.TRAFFIC_ALLOWED.includes(k) : !KIT.TRAFFIC_ALLOWED.includes(k), k).toBe(true);
    expect(isNeverUsed(KIT.STOP_SIGN_KEY)).toBe(false);
    // the stem stays listed for every other use: a lights or traffic-light key, a second pole, is still never used
    for (const n of ["SM_Prop_LightPole_Lights_01", "SM_Prop_LightPole_Base_02", "SM_Prop_TrafficLight_01"]) expect(isNeverUsed(`city-pack:${n}`), n).toBe(true);
    expect(KIT.TRAFFIC_ALLOWED).not.toContain("city-pack:SM_Prop_LightPole_Lights_01");
  });

  it("the four numbers equal Josh's (Q43), and the two copied from stage 8 equal ground's", () => {
    expect(C.SIGN_KERB_M).toBe(0.5);
    expect(C.SIGN_CORNER_M).toBe(1.0);
    expect(C.MAST_INSET_M).toBe(0.75);
    expect(C.SIGNAL_HEAD_MIN_M).toBe(4.6);
    expect(C.SIGN_KERB_M).toBe(GROUND_C.FURN_KERB_M);
    expect(C.FURN_GAP_M).toBe(GROUND_C.FURN_GAP_M);
    expect(C.FURN_KEEP_M).toBe(GROUND_C.FURN_KEEP_M);
    expect(C.CELL_M).toBe(GROUND_C.CELL_M);
  });

  it("facadebounds.ts equals ground's copy key by key (15 dressing keys, 8 wall keys, 17 novelty keys, the code escape)", () => {
    expect(Object.keys(FB.AVOID_DRESS_BOUNDS)).toHaveLength(15);
    expect(Object.keys(FB.AVOID_WALL_BOUNDS)).toHaveLength(8);
    expect(Object.keys(FB.AVOID_NOVELTY_BOUNDS)).toHaveLength(17);
    expect(FB.AVOID_DRESS_BOUNDS).toEqual(GROUND_FB.AVOID_DRESS_BOUNDS);
    expect(FB.AVOID_WALL_BOUNDS).toEqual(GROUND_FB.AVOID_WALL_BOUNDS);
    expect(FB.AVOID_NOVELTY_BOUNDS).toEqual(GROUND_FB.AVOID_NOVELTY_BOUNDS);
    expect(FB.CODE_ESCAPE_KEY).toBe(GROUND_FB.CODE_ESCAPE_KEY);
    expect(FB.CODE_ESCAPE_W_M).toBe(GROUND_FB.CODE_ESCAPE_W_M);
    expect(FB.CODE_ESCAPE_D_M).toBe(GROUND_FB.CODE_ESCAPE_D_M);
    for (const k of [...Object.keys(FB.AVOID_DRESS_BOUNDS), ...Object.keys(FB.AVOID_WALL_BOUNDS), ...Object.keys(FB.AVOID_NOVELTY_BOUNDS)]) expect(FB.avoidBounds(k as CalibrationKey), k).toEqual(GROUND_FB.avoidBounds(k as CalibrationKey));
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

/** Every vertex of the node called `name` and its children. */
function verticesOf(gltf: Gltf, bin: Buffer, name: string): number[][] {
  const root = gltf.nodes.find((q) => q.name === name);
  expect(root, name).toBeDefined();
  const out: number[][] = [];
  const walk = (q: { mesh?: number; children?: number[] }): void => {
    for (const prim of q.mesh !== undefined ? gltf.meshes[q.mesh]!.primitives : []) {
      const a = gltf.accessors[prim.attributes.POSITION]!;
      const bv = gltf.bufferViews[a.bufferView]!;
      const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
      for (let i = 0; i < a.count; i++) {
        const at = base + i * (bv.byteStride ?? 12);
        out.push([bin.readFloatLE(at), bin.readFloatLE(at + 4), bin.readFloatLE(at + 8)]);
      }
    }
    for (const c of q.children ?? []) walk(gltf.nodes[c]!);
  };
  walk(root!);
  return out;
}

const range = (vs: readonly number[][], axis: number): [number, number] => [Math.min(...vs.map((v) => v[axis]!)), Math.max(...vs.map((v) => v[axis]!))];
const mid = (r: readonly [number, number]): number => (r[0] + r[1]) / 2;

describe("the traffic kit equals the converted GLB (070 TR1, criterion 1; skipped without the GLB)", () => {
  it.skipIf(!HAVE_GLB)("every kit key's bounds (w, h, d) equal the GLB's within 0.005 m", { timeout: 120000 }, () => {
    const { gltf, bin } = readGlb();
    const bad: string[] = [];
    for (const k of KIT.TRAFFIC_KEYS) {
      const vs = verticesOf(gltf, bin, k.slice("city-pack:".length));
      const t = KIT.TRAFFIC_BOUNDS[k]!;
      for (const [n, want, axis] of [["w", t.w, 0], ["h", t.h, 1], ["d", t.d, 2]] as const) {
        const r = range(vs, axis);
        if (Math.abs(want - (r[1] - r[0])) > 0.005) bad.push(`${k} ${n}: table ${want}, GLB ${(r[1] - r[0]).toFixed(3)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it.skipIf(!HAVE_GLB)("the arm's two heads lie ARM.headsAlong from its clamp's pole axis within 0.05 m, its lenses face -x, and the clamp's centre height is typed", { timeout: 120000 }, () => {
    const { gltf, bin } = readGlb();
    const vs = verticesOf(gltf, bin, "SM_Prop_LightPole_Arm_01");
    const clamp = vs.filter((v) => v[2]! < -2.7);
    const axis = { x: mid(range(clamp, 0)), z: mid(range(clamp, 2)) };
    expect(axis.x).toBeCloseTo(KIT.ARM.axis.x, 2);
    expect(axis.z).toBeCloseTo(KIT.ARM.axis.z, 2);
    expect(mid(range(clamp, 1))).toBeCloseTo(KIT.ARM.clampY, 2);
    // the heads hang on the -x side of the truss: their vertices at x < 0; each head is one cluster along z
    const heads = vs.filter((v) => v[0]! < -0.013);
    const near = heads.filter((v) => v[2]! > 0.8 && v[2]! < 1.7);
    const far = heads.filter((v) => v[2]! > 2.6);
    const meanZ = (a: readonly number[][]): number => a.reduce((s, v) => s + v[2]!, 0) / a.length;
    expect(meanZ(near) - axis.z).toBeCloseTo(KIT.ARM.headsAlong[0]!, 1);
    expect(Math.abs(meanZ(near) - axis.z - KIT.ARM.headsAlong[0]!)).toBeLessThan(0.05);
    expect(Math.abs(meanZ(far) - axis.z - KIT.ARM.headsAlong[1]!)).toBeLessThan(0.05);
    expect(Math.abs(range(vs, 2)[1] - axis.z - KIT.ARM.reach)).toBeLessThan(0.01);
    // the lens discs (the densest plane of the head's vertices) are on the -x face
    const xs = new Map<number, number>();
    for (const v of near) xs.set(Math.round(v[0]! * 50) / 50, (xs.get(Math.round(v[0]! * 50) / 50) ?? 0) + 1);
    const densest = [...xs.entries()].sort((a, b) => b[1] - a[1])[0]![0];
    expect(densest).toBeLessThan(-0.1);
    expect(Math.min(...heads.map((v) => v[1]!))).toBeCloseTo(KIT.ARM.headLowY, 2);
  });

  it.skipIf(!HAVE_GLB)("the mast's pole axis, foot and collars are where the kit types them", { timeout: 120000 }, () => {
    const { gltf, bin } = readGlb();
    const vs = verticesOf(gltf, bin, "SM_Prop_LightPole_Base_01");
    const foot = vs.filter((v) => v[1]! < 0.1);
    expect(mid(range(foot, 0))).toBeCloseTo(KIT.MAST.axis.x, 2);
    expect(mid(range(foot, 2))).toBeCloseTo(KIT.MAST.axis.z, 2);
    expect(range(foot, 0)[1] - range(foot, 0)[0]).toBeCloseTo(KIT.MAST.foot.w, 2);
    expect(range(foot, 2)[1] - range(foot, 2)[0]).toBeCloseTo(KIT.MAST.foot.d, 2);
    // the upper collar spans 5.345 to 5.422 m, the lower 3.126 to 3.201 m: the arm's clamp centre and the first walk head's base are fixed there
    const ys = [...new Set(vs.map((v) => Number(v[1]!.toFixed(3))))].sort((a, b) => a - b);
    const near = (y: number): boolean => ys.some((v) => Math.abs(v - y) < 0.01);
    expect(near(5.345) && near(5.422)).toBe(true);
    expect(near(3.126) && near(3.201)).toBe(true);
    expect(KIT.MAST.armY).toBeCloseTo((5.345 + 5.422) / 2, 2);
    expect(KIT.MAST.walkHeadY[0]).toBeCloseTo(3.201, 3);
    // the hook leans toward the piece's own +z: the lamp head's vertices are at z > the pole's
    const top = vs.filter((v) => v[1]! > 6.2);
    expect(mid(range(top, 2))).toBeGreaterThan(KIT.MAST.axis.z + 0.5);
  });
});
