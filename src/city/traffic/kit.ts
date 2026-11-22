/**
 * Stage 9: the traffic kit (R-6; ticket 070 TR1 criterion 1). The seven City Pack keys stage 9 places: the five `SM_Prop_LightPole_*` signal keys (Josh's Q33 lift, narrowed), `SM_Prop_Sign_Stop_01` (TR1) and `SM_Prop_Sign_Parking_01` (TR1b), each with its bounds (width, height,
 * depth; metres; read from `city-pack.glb`) and the typed fix points the placement uses. Every key's own front is +z, but the arm's heads: their lenses face the arm's own -x (read from the GLB: the lens discs are on the x = -0.2 side).
 * A piece's pivot is its bounds' centre in x and z with its base at y (the converter centres every pivot), so a fix point is a local (x, z) from the pivot. `src/render3d/trafficpin.test.ts` pins every number.
 */

import type { CalibrationKey, CityTrafficPieceKind } from "../../core";

const k = (name: string): CalibrationKey => `city-pack:${name}`;

export const SIGNAL_MAST_KEY = k("SM_Prop_LightPole_Base_01");
export const SIGNAL_ARM_KEY = k("SM_Prop_LightPole_Arm_01");
export const WALK_HEAD_KEY = k("SM_Prop_LightPole_CrossLights_01");
export const PUSH_BUTTON_KEY = k("SM_Prop_LightPole_CrossButton_01");
export const SIGNAL_BOX_KEY = k("SM_Prop_LightPole_Box_01");
export const STOP_SIGN_KEY = k("SM_Prop_Sign_Stop_01");
export const PARKING_SIGN_KEY = k("SM_Prop_Sign_Parking_01");

export interface TrafficBounds {
  readonly w: number;
  readonly h: number;
  readonly d: number;
}
const b = (w: number, h: number, d: number): TrafficBounds => ({ w, h, d });

/** The bounds of the seven keys (width, height, depth; metres). */
export const TRAFFIC_BOUNDS: Readonly<Record<CalibrationKey, TrafficBounds>> = {
  [SIGNAL_MAST_KEY]: b(0.346, 6.483, 2.478),
  [SIGNAL_ARM_KEY]: b(0.404, 0.92, 6.278),
  [WALK_HEAD_KEY]: b(0.452, 0.397, 0.314),
  [PUSH_BUTTON_KEY]: b(0.162, 0.299, 0.17),
  [SIGNAL_BOX_KEY]: b(0.228, 0.527, 0.39),
  [STOP_SIGN_KEY]: b(0.77, 2.271, 0.124),
  // the plate stands on a post, its own +z the face; the pivot is on the post's axis (read from the GLB: x -0.221 to 0.221, z -0.059 to 0.059)
  [PARKING_SIGN_KEY]: b(0.443, 1.717, 0.119),
};

/** The traffic kit's keys, once each. */
export const TRAFFIC_KEYS: readonly CalibrationKey[] = Object.keys(TRAFFIC_BOUNDS) as CalibrationKey[];

/** The key of each piece kind stage 9 places. */
export const KEY_OF_KIND: Readonly<Partial<Record<CityTrafficPieceKind, CalibrationKey>>> = {
  signalMast: SIGNAL_MAST_KEY,
  signalArm: SIGNAL_ARM_KEY,
  walkHead: WALK_HEAD_KEY,
  pushButton: PUSH_BUTTON_KEY,
  signalBox: SIGNAL_BOX_KEY,
  stopSign: STOP_SIGN_KEY,
  parkingSign: PARKING_SIGN_KEY,
};

/** Josh's lift (Q33, narrowed, 21 Nov 2026: "I will take all of the recommendations"): exactly the five `SM_Prop_LightPole_*` keys, each for its own kind only, always drawn dark. The stem `SM_Prop_LightPole_` stays on the never-used list for every other use. */
export const TRAFFIC_ALLOWED: readonly CalibrationKey[] = [SIGNAL_MAST_KEY, SIGNAL_ARM_KEY, WALK_HEAD_KEY, PUSH_BUTTON_KEY, SIGNAL_BOX_KEY];

/** The bounds of a kit key: throws on a key that is not in the kit. */
export function boundsOf(key: CalibrationKey): TrafficBounds {
  const e = TRAFFIC_BOUNDS[key];
  if (!e) throw new Error(`${key} is not in the traffic kit`);
  return e;
}

// ---- the mast, `SM_Prop_LightPole_Base_01` ----
// A 6.483 m pole whose top hooks 2.3 m sideways, toward its own +z, to a downward lamp head (drawn unlit). The pole stands at the -z end of the bounds. Collars at 3.126 to 3.201 m (the walk heads' mount) and 5.345 to 5.422 m (the arm's clamp).

export const MAST = {
  /** The pole's axis, from the pivot (the bounds' centre), in the piece's own x and z. */
  axis: { x: 0, z: -1.0665 },
  /** The pole's foot (the base plate), width (own x) and depth (own z); what CL's footprint tests. */
  foot: { w: 0.346, d: 0.345 },
  /** The pole's radius at the collars, where a fixed piece's back meets it. */
  radius: 0.09,
  /** The height of the upper collar's centre: the arm's clamp centre is fixed here. */
  armY: 5.3835,
  /** The base heights of the walk heads on the lower collar (the first on its top, the second 0.5 m above), one per crossing that lands at the mast's corner. */
  walkHeadY: [3.201, 3.701] as readonly number[],
  /** The push button's base height (the US 42 in reach). */
  buttonY: 1.1,
  /** The lamp hook starts at this height (a profile of the GLB: the pole narrows to the hook between 5.75 and 6.0 m). */
  hookY: 6.0,
  /** The local direction of the collar's clamp face (the side without the lamp): the yaw puts this toward the arm. */
  clampFace: "-z",
} as const;

// ---- the arm, `SM_Prop_LightPole_Arm_01` ----
// A tapered truss, its pole clamp at the -z end, two signal heads hung on its -x side, lenses toward -x, and a blank name plate.

export const ARM = {
  /** The clamp ring's axis, from the pivot, in the piece's own x and z. */
  axis: { x: 0.095, z: -3.033 },
  /** The clamp ring's centre height: with `MAST.armY` it gives the arm's base height. */
  clampY: 0.5793,
  /** The two heads' distances from the clamp's axis along the arm (the near one, then the far one). */
  headsAlong: [4.318, 6.009] as readonly number[],
  /** The heads' lowest point above the arm's base. */
  headLowY: 0.015,
  /** The arm's free end, from the clamp's axis along the arm. */
  reach: 6.172,
  /** The local direction the heads' lenses face. */
  lens: "-x",
} as const;

/** The arm's base height over the carriageway: the clamp centre on the upper collar's centre. */
export const ARM_BASE_Y = MAST.armY - ARM.clampY;
/** The lowest point of a signal head over the carriageway. */
export const HEAD_LOW_Y = ARM_BASE_Y + ARM.headLowY;
