/**
 * Ticket 055 section F: door sills, measured per building (pure: no three, no DOM, no fetch, no GLB).
 *
 * Josh, 18 Nov 2026: "That's going to have to be a variable that we measure for each individual building." A building's sill is the height of the floor its door opens onto, above
 * the model's base (the converter grounds min y at 0). A sill over `SILL_MAX_M` leaves the door out of reach of the walk in front of it, so the building is sunk by it (a house keeps its
 * lowest window at least `SILL_WINDOW_CLEAR_M` over the walk and stands the Town Pack's concrete steps for what is left over; a City Pack stack always sinks, as one, by the largest sill of
 * its ground pieces, and never takes steps). `DOOR_SILLS` is the table of measured values, read from the converted GLBs by `measureDoor` (the same function `sills.test.ts` re-measures with
 * when the GLBs are on the machine); `houseSill` and `stackSill` turn a table into what to draw. `models3d.ts` draws it.
 *
 * Frames. A model's own frame is the GLB's (centred pivot, base at y 0). The front frame of a model is the one `BUILDING_FRONTS` gives it: `u` runs along the front face to the right as seen from
 * outside, `d` away from the building through the front face, and `v` is the depth behind the front face (`v` = 0 on the front face, growing inward). A steps plan is in the front frame:
 * `x_m` is `u` and `z_m` is `d` measured out from the front face to the steps' centre; `modelPoint` turns it into the model's own frame.
 */

import type { CalibrationKey } from "../core";
import { frontAxis, frontYaw, type ModelFront } from "./models";
import type { Stack } from "./stacks";

/** A sill up to this high is left alone: a door step (ticket 055 F, Josh's Q11 at its default). */
export const SILL_MAX_M = 0.15;
/** A house's lowest ground-floor window stays at least this far above the walk after sinking; the rest of the rise is steps (Q12). */
export const SILL_WINDOW_CLEAR_M = 0.3;
/** The steps model (Q13): the Town Pack's house steps, 1.2 x 0.5 x 0.9 m. `SM_Bld_House_DeckSteps_01` converts to 0 x 0 x 0 and is not used. */
export const STEPS_KEY: CalibrationKey = "town-pack:SM_Bld_House_Concrete_Steps_01";
/** The steps' measured height (0.5126 m in the GLB): the rise they make at scale 1. */
export const STEPS_RISE_M = 0.5;
/** The steps are scaled in y alone, between these. */
export const STEPS_SCALE_Y = { min: 0.5, max: 1.5 } as const;
/** The steps' footprint, metres: 1.2 wide along the front and 0.9 out from it. */
export const STEPS_W_M = 1.2;
export const STEPS_D_M = 0.9;
/** How far the steps' back edge tucks in behind the front face, so no gap shows between them and the wall. */
export const STEPS_TUCK_M = 0.05;
/** A door's rise has to be made up by the steps' scaled top to within this. */
export const STEPS_FIT_M = 0.05;

// ---- how a sill is measured (the method of `measureDoor`; 16.10 of the guide) ----

/** Only upward-facing surfaces up to this far behind the front face are door floors. */
export const SILL_DEPTH_M = 1;
/** Only upward-facing surfaces up to this high are door floors (a counter or a window ledge is above it). */
export const SILL_CEIL_M = 1.5;
/** A cluster of upward-facing surface smaller than this is a fitting, not a floor (a door's kick plate, a stair nosing). */
export const DOOR_MIN_AREA_M2 = 0.2;
/** The door opening, either side of its centre, along the front. */
export const SILL_DOOR_HALF_M = 0.45;
/** Surfaces within this height of each other are one level. */
export const SILL_LEVEL_GAP_M = 0.03;
/** Two surfaces on one level that are this close along the front are one cluster. */
export const SILL_JOIN_GAP_M = 0.1;

/** One ground-floor model's door: the sill's height, the lowest window of its front (null when none can be told), and the door's centre along the front, all in metres in the model's frame. */
export interface DoorSill {
  sill_m: number;
  window_m: number | null;
  door_x_m: number;
}

export type SillTable = Readonly<Partial<Record<CalibrationKey, DoorSill>>>;

/**
 * The measured table (ticket 055 F, from the converted GLBs of 18 Nov 2026, by `measureDoor`; `sills.test.ts` pins every value and re-measures them where the GLBs are). A key with no entry
 * could not be settled by the geometry and is drawn unchanged (the reason for each is in 16.10 of the guide).
 */
export const DOOR_SILLS: SillTable = {
  "city-pack:SM_Bld_Shop_01": { sill_m: 0.106, window_m: null, door_x_m: 0 },
  "city-pack:SM_Bld_Shop_02": { sill_m: 0.071, window_m: null, door_x_m: 0 },
  "city-pack:SM_Bld_Shop_03": { sill_m: 0.043, window_m: null, door_x_m: 0 },
  "city-pack:SM_Bld_Shop_04": { sill_m: 0.077, window_m: null, door_x_m: 0 },
  "city-pack:SM_Bld_Shop_05": { sill_m: 0.361, window_m: null, door_x_m: 0 },
  "city-pack:SM_Bld_Apartment_Door_01": { sill_m: 0.029, window_m: null, door_x_m: 0 },
  "city-pack:SM_Bld_Apartment_Door_02": { sill_m: 0.206, window_m: null, door_x_m: 0 },
  "city-pack:SM_Bld_Shop_Corner_01": { sill_m: 0.159, window_m: null, door_x_m: 0 },
  "city-pack:SM_Bld_Shop_Corner_02": { sill_m: 0.376, window_m: null, door_x_m: 0 },
  "city-pack:SM_Bld_OfficeOld_Small_Base_01": { sill_m: 0.915, window_m: null, door_x_m: 2.5 },
  "city-pack:SM_Bld_OfficeOld_Large_Base_01": { sill_m: 0.915, window_m: null, door_x_m: 0 },
  "city-pack:SM_Bld_OfficeOctagon_Base_01": { sill_m: 0.085, window_m: null, door_x_m: 0 },
  "town-pack:SM_Bld_House_Preset_01": { sill_m: 1.151, window_m: 1.851, door_x_m: 0 },
  "town-pack:SM_Bld_House_Preset_02": { sill_m: 1.052, window_m: 1.752, door_x_m: 1.271 },
  "town-pack:SM_Bld_House_Preset_03": { sill_m: 1.151, window_m: 1.851, door_x_m: -2.479 },
  "town-pack:SM_Bld_House_Preset_05": { sill_m: 1.166, window_m: 1.866, door_x_m: -2.479 },
  "town-pack:SM_Bld_House_Preset_06": { sill_m: 1.052, window_m: 1.752, door_x_m: 0 },
  "town-pack:SM_Bld_House_Preset_07": { sill_m: 1.052, window_m: 1.752, door_x_m: 2.521 },
  "town-pack:SM_Bld_House_Preset_08": { sill_m: 1.102, window_m: 1.802, door_x_m: -4.979 },
  "town-pack:SM_Bld_House_Preset_09": { sill_m: 1.052, window_m: 1.752, door_x_m: -1.229 },
  "simple-town:Building_Shop_01": { sill_m: 0.337, window_m: null, door_x_m: 0 },
  "simple-town:Building_Shop_02": { sill_m: 0.337, window_m: null, door_x_m: 0 },
  "simple-town:apartment_small_mesh": { sill_m: 0.212, window_m: null, door_x_m: 0 },
  "simple-town:Building_House_01": { sill_m: 1.035, window_m: null, door_x_m: 0 },
  "simple-town:Building_House_02": { sill_m: 1.035, window_m: null, door_x_m: 0 },
  "simple-town:Building_House_03": { sill_m: 1.035, window_m: null, door_x_m: 0 },
  "simple-town:Building_House_04": { sill_m: 1.035, window_m: null, door_x_m: 0 },
  "simple-town:Building_House_09": { sill_m: 0.426, window_m: null, door_x_m: 0 },
  "simple-town:Building_House_010": { sill_m: 0.426, window_m: null, door_x_m: 0 },
  "simple-town:Building_House_011": { sill_m: 0.426, window_m: null, door_x_m: 0 },
  "simple-town:Building_House_012": { sill_m: 1.053, window_m: null, door_x_m: 0 },
  "simple-town:Building_House_013": { sill_m: 1.053, window_m: null, door_x_m: 0 },
  "simple-town:Building_House_014": { sill_m: 1.053, window_m: null, door_x_m: 0 },
  "simple-town:Building_House_015": { sill_m: 1.053, window_m: null, door_x_m: 0 },
  "simple-town:office_small_mesh": { sill_m: 0.505, window_m: null, door_x_m: -2.991 },
  "simple-town:Building_AutoRepair": { sill_m: 0.138, window_m: null, door_x_m: -5.965 },
  "simple-town:Building_StripClub": { sill_m: 0.138, window_m: null, door_x_m: 0 },
  "simple-town:Building_PoliceStation": { sill_m: 0.402, window_m: null, door_x_m: 0 },
  "simple-town:apartment_large_mesh": { sill_m: 0.212, window_m: null, door_x_m: 0 },
  "simple-town:office_medium_mesh": { sill_m: 0.505, window_m: null, door_x_m: -2.991 },
  "simple-town:office_large_mesh": { sill_m: 0.505, window_m: null, door_x_m: -2.991 },
};

// ---- the plan: what a sill and a window make of a building ----

/** Steps in the building's front frame (see the file's head) and the y-scale of the steps' model. */
export interface StepsPlan {
  x_m: number;
  z_m: number;
  scaleY: number;
}

export interface SillPlan {
  /** How far the building sinks, metres (zero: not changed). */
  sink_m: number;
  steps: StepsPlan | null;
  /** The rise left between the walk and the door after sinking: the sill less the sink. */
  leftOver_m: number;
}

const NO_CHANGE: SillPlan = { sink_m: 0, steps: null, leftOver_m: 0 };
const STEPS_MIN_RISE_M = STEPS_RISE_M * STEPS_SCALE_Y.min;
const STEPS_MAX_RISE_M = STEPS_RISE_M * STEPS_SCALE_Y.max;

/**
 * What to do with a house (a whole model) whose door floor is `sill_m` over its base, whose lowest ground-floor window is `window_m` (null: none known), and whose door is at `door_x_m`.
 * - a sill up to `SILL_MAX_M`: nothing;
 * - otherwise sink it by the sill, but no further than leaves the window `SILL_WINDOW_CLEAR_M` over the walk;
 * - what is left over, if more than `SILL_MAX_M`, is made up by the steps scaled in y so their top meets the door (within the scale range; a rise under the steps' smallest is made by sinking
 *   less, down to a sink of zero, so the steps' top still meets the door).
 */
export function planHouse(sill_m: number, window_m: number | null, door_x_m: number): SillPlan {
  if (!(sill_m > SILL_MAX_M)) return { sink_m: 0, steps: null, leftOver_m: Math.max(0, sill_m) };
  const room = window_m === null ? sill_m : Math.min(sill_m, Math.max(0, window_m - SILL_WINDOW_CLEAR_M));
  let sink = room;
  let rest = sill_m - sink;
  if (rest <= SILL_MAX_M + 1e-9) return { sink_m: sink, steps: null, leftOver_m: rest };
  if (rest < STEPS_MIN_RISE_M) {
    // The smallest steps are taller than the rise: sink less so the steps' top meets the door; with a sill under their height, no steps can meet it.
    sink = Math.max(0, sill_m - STEPS_MIN_RISE_M);
    rest = sill_m - sink;
    if (rest < STEPS_MIN_RISE_M - STEPS_FIT_M) return { sink_m: sink, steps: null, leftOver_m: rest };
  }
  const scaleY = Math.min(STEPS_SCALE_Y.max, Math.max(STEPS_SCALE_Y.min, rest / STEPS_RISE_M));
  return { sink_m: sink, steps: { x_m: door_x_m, z_m: STEPS_D_M / 2 - STEPS_TUCK_M, scaleY }, leftOver_m: rest };
}

/** The plan for a whole model by its key: no change for a key with no entry. */
export function houseSill(key: CalibrationKey, table: SillTable = DOOR_SILLS): SillPlan {
  const row = Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
  return row ? planHouse(row.sill_m, row.window_m, row.door_x_m) : NO_CHANGE;
}

/**
 * The plan for a stack: it sinks as one by the largest sill of its ground pieces (the pieces of role "base" that the table has), never takes steps (a terrace's front is the walk, and steps
 * would stand in the walkers' way), and is left alone when that sill is within `SILL_MAX_M`. A stack with no measured ground piece is not changed.
 */
export function stackSill(stack: Pick<Stack, "pieces">, table: SillTable = DOOR_SILLS): SillPlan {
  let sill = -1;
  for (const p of stack.pieces) {
    if (p.role !== "base") continue;
    const row = Object.prototype.hasOwnProperty.call(table, p.key) ? table[p.key] : undefined;
    if (row && row.sill_m > sill) sill = row.sill_m;
  }
  if (sill < 0) return NO_CHANGE;
  return sill > SILL_MAX_M ? { sink_m: sill, steps: null, leftOver_m: 0 } : { sink_m: 0, steps: null, leftOver_m: sill };
}

/** True when a plan leaves a door out of reach: a rise over `SILL_MAX_M` that no steps make up to within `STEPS_FIT_M`. The builder lists these keys from the real table for Josh. */
export function leavesGap(plan: SillPlan): boolean {
  if (plan.leftOver_m <= SILL_MAX_M + 1e-9) return false;
  if (!plan.steps) return true;
  return plan.leftOver_m - STEPS_RISE_M * plan.steps.scaleY > STEPS_FIT_M + 1e-9;
}

// ---- the front frame ----

/** The point of the model's own frame (x, z; metres) that is `u` along the front and `d` out from the centre of the model, along the front's axis. */
export function modelPoint(front: ModelFront, u_m: number, d_m: number): { x: number; z: number } {
  const [ax, az] = frontAxis(front);
  // `u` runs to the right as seen from outside: that is the axis turned a quarter, (az, -ax) in (x, z).
  return { x: ax * d_m + az * u_m, z: az * d_m - ax * u_m };
}

/** The turn about y that stands the steps' model (which descends toward its own +z) with its outward side along the model's front axis. */
export function stepsYaw(front: ModelFront): number {
  return -frontYaw(front);
}

// ---- measuring ----

/** A mesh as flat arrays: three numbers a vertex, three vertex indices a triangle. `glass` is the index list of the triangles of a glass material, when the model has one. */
export interface SillMesh {
  pos: ArrayLike<number>;
  idx: ArrayLike<number>;
  glass?: ArrayLike<number>;
}

interface Level {
  y: number;
  u0: number;
  u1: number;
  area: number;
}

/** (u, d) of a vertex in the front frame: along the front to the right as seen from outside, and out through the front face. */
function frontCoords(front: ModelFront, x: number, z: number): [number, number] {
  switch (front) {
    case "+z":
      return [x, z];
    case "-z":
      return [-x, -z];
    case "+x":
      return [-z, x];
    case "-x":
      return [z, -x];
  }
}

/**
 * Read a ground-floor model's door from its mesh (the method of 16.10):
 * - the front face is the model's furthest vertex along the front's axis; `v` is the depth behind it;
 * - a door floor is a level, horizontal, upward-facing surface up to `SILL_CEIL_M` high and starting within `SILL_DEPTH_M` behind the front face; surfaces within `SILL_LEVEL_GAP_M` in height
 *   are one level, and those on a level within `SILL_JOIN_GAP_M` of each other along the front are one cluster; a cluster under `DOOR_MIN_AREA_M2` is a fitting and is dropped;
 * - the door is at the front's centre when a floor cluster covers it, else at the centre of the nearest floor cluster (a house's threshold slab, an office's lobby);
 * - the sill is the highest floor cluster within `SILL_DOOR_HALF_M` of the door's centre; `window_m` is the lowest vertex of the glass triangles that lie within `SILL_DEPTH_M` of the front face.
 * Returns null when the model has no door floor (the geometry cannot settle it). Values are rounded to a millimetre.
 */
export function measureDoor(mesh: SillMesh, front: ModelFront): DoorSill | null {
  const n = Math.floor(mesh.idx.length / 3);
  if (n === 0) return null;
  let dMax = -Infinity;
  let uMin = Infinity;
  let uMax = -Infinity;
  for (let i = 0; i < mesh.pos.length; i += 3) {
    const [u, d] = frontCoords(front, mesh.pos[i]!, mesh.pos[i + 2]!);
    if (d > dMax) dMax = d;
    if (u < uMin) uMin = u;
    if (u > uMax) uMax = u;
  }
  const tri = (t: ArrayLike<number>, i: number): { u: number[]; v: number[]; y: number[]; ny: number; area: number } => {
    const u: number[] = [];
    const v: number[] = [];
    const y: number[] = [];
    const p: number[][] = [];
    for (let k = 0; k < 3; k++) {
      const o = t[i * 3 + k]! * 3;
      const x = mesh.pos[o]!;
      const z = mesh.pos[o + 2]!;
      const c = frontCoords(front, x, z);
      u.push(c[0]);
      v.push(dMax - c[1]);
      y.push(mesh.pos[o + 1]!);
      p.push([x, mesh.pos[o + 1]!, z]);
    }
    const ab = [p[1]![0]! - p[0]![0]!, p[1]![1]! - p[0]![1]!, p[1]![2]! - p[0]![2]!];
    const ac = [p[2]![0]! - p[0]![0]!, p[2]![1]! - p[0]![1]!, p[2]![2]! - p[0]![2]!];
    const nx = ab[1]! * ac[2]! - ab[2]! * ac[1]!;
    const ny = ab[2]! * ac[0]! - ab[0]! * ac[2]!;
    const nz = ab[0]! * ac[1]! - ab[1]! * ac[0]!;
    const len = Math.hypot(nx, ny, nz);
    return { u, v, y, ny: len > 0 ? ny / len : 0, area: len / 2 };
  };
  // The upward-facing horizontal triangles that could be a door floor.
  const floors: { y: number; u0: number; u1: number; area: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = tri(mesh.idx, i);
    if (t.ny < 0.9 || t.area <= 0) continue;
    const y = (t.y[0]! + t.y[1]! + t.y[2]!) / 3;
    if (Math.max(...t.y) - Math.min(...t.y) > SILL_LEVEL_GAP_M || y < 0 || y > SILL_CEIL_M) continue;
    if (Math.min(...t.v) > SILL_DEPTH_M) continue;
    floors.push({ y, u0: Math.min(...t.u), u1: Math.max(...t.u), area: t.area });
  }
  // Levels, then clusters along the front on each level.
  floors.sort((a, b) => a.y - b.y);
  const clusters: Level[] = [];
  let group: typeof floors = [];
  const flush = (): void => {
    group.sort((a, b) => a.u0 - b.u0);
    let cur: (Level & { w: number }) | null = null;
    const close = (): void => {
      if (cur) clusters.push({ y: cur.y / cur.w, u0: cur.u0, u1: cur.u1, area: cur.area });
      cur = null;
    };
    for (const f of group) {
      if (cur && f.u0 <= cur.u1 + SILL_JOIN_GAP_M) {
        cur.u1 = Math.max(cur.u1, f.u1);
        cur.area += f.area;
        cur.y += f.y * f.area;
        cur.w += f.area;
      } else {
        close();
        cur = { y: f.y * f.area, u0: f.u0, u1: f.u1, area: f.area, w: f.area };
      }
    }
    close();
    group = [];
  };
  for (const f of floors) {
    if (group.length > 0 && f.y - group[group.length - 1]!.y > SILL_LEVEL_GAP_M) flush();
    group.push(f);
  }
  flush();
  const real = clusters.filter((c) => c.area >= DOOR_MIN_AREA_M2);
  if (real.length === 0) return null;
  const centre = (uMin + uMax) / 2;
  const gap = (c: Level): number => (centre < c.u0 ? c.u0 - centre : centre > c.u1 ? centre - c.u1 : 0);
  let door = centre;
  if (!real.some((c) => gap(c) === 0)) {
    const near = [...real].sort((a, b) => gap(a) - gap(b) || b.y - a.y)[0]!;
    door = (near.u0 + near.u1) / 2;
  }
  const inDoor = real.filter((c) => c.u1 >= door - SILL_DOOR_HALF_M && c.u0 <= door + SILL_DOOR_HALF_M);
  if (inDoor.length === 0) return null;
  const sill = Math.max(...inDoor.map((c) => c.y));
  let window: number | null = null;
  const glass = mesh.glass ?? [];
  for (let i = 0; i < Math.floor(glass.length / 3); i++) {
    const t = tri(glass, i);
    if (Math.max(...t.v) > SILL_DEPTH_M) continue;
    const low = Math.min(...t.y);
    if (window === null || low < window) window = low;
  }
  const mm = (v: number): number => Math.round(v * 1000) / 1000 + 0;
  return { sill_m: mm(sill), window_m: window === null ? null : mm(window), door_x_m: mm(door) };
}
