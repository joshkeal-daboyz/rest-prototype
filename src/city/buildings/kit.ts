/**
 * Stage 5, F2: the kit table (R-6; ticket 070 F2 criterion 1). The 15 City Pack keys the stage places: each apartment style's mid floor, corner floor, three-storey piece, mid roof and corner roof. Typed in from the converted
 * manifest (bounds, as `facade.test.ts`'s fixture has them) and `BODY_M` (facade.ts, 063 E2: how far inside its bounds each wall plane stands, in the piece's own frame, its front on +z) plus
 * `OPEN_SIDE_MEASURED` (a corner piece's second face is its own -x). `src/render3d/kitpin.test.ts` pins every number equal to the old path's, and the bounds to the GLB when it is on the machine.
 *
 * A piece's pivot is its bounds' centre in x and z and its base at y (the converter centres every pivot, src/core/assets.ts). Own frame: front +z, a corner's second face -x.
 */

import type { CalibrationKey } from "../../core";

/** What a kit key is for. */
export type KitRole = "floor" | "floor3" | "roof";

/** The distances, metres, from a piece's bounds in to its four wall planes (`BODY_M`'s `Body`). */
export interface KitBody {
  readonly front: number;
  readonly back: number;
  readonly nx: number;
  readonly px: number;
}

export interface KitEntry {
  readonly key: CalibrationKey;
  readonly role: KitRole;
  /** A corner piece: its second face (its open side) is its own -x. */
  readonly corner: boolean;
  /** Bounds as the manifest has them, metres: width (x), height (y), depth (z). */
  readonly w: number;
  readonly h: number;
  readonly d: number;
  readonly body: KitBody;
  /** A corner key's second face (`OPEN_SIDE_MEASURED`); null on every other key. */
  readonly face: "-x" | null;
}

const key = (name: string): CalibrationKey => `city-pack:${name}`;
const entry = (name: string, role: KitRole, corner: boolean, w: number, h: number, d: number, front: number, back: number, nx: number, px: number): KitEntry => ({
  key: key(name),
  role,
  corner,
  w,
  h,
  d,
  body: { front, back, nx, px },
  face: corner ? "-x" : null,
});

/** The kit, in style order: for each style, mid floor, corner floor, three-storey piece, mid roof, corner roof. */
export const KIT: readonly KitEntry[] = [
  entry("SM_Bld_Apartment_01", "floor", false, 5.0, 3.0, 5.196, 0.196, 0, 0, 0),
  entry("SM_Bld_Apartment_Corner_01", "floor", true, 5.196, 3.0, 5.196, 0.196, 0, 0.196, 0),
  entry("SM_Bld_Apartment_Stack_01", "floor3", false, 5.0, 9.0, 5.196, 0.196, 0, 0, 0),
  entry("SM_Bld_Apartment_Roof_01", "roof", false, 5.31, 0.5, 5.918, 0.715, 0.125, 0.143, 0.143),
  entry("SM_Bld_Apartment_Roof_Corner_01", "roof", true, 5.904, 0.5, 5.918, 0.715, 0.125, 0.715, 0.143),
  entry("SM_Bld_Apartment_02", "floor", false, 5.17, 3.0, 5.214, 0.129, 0.085, 0.085, 0.085),
  entry("SM_Bld_Apartment_Corner_02", "floor", true, 5.214, 3.0, 5.214, 0.129, 0.085, 0.129, 0.085),
  entry("SM_Bld_Apartment_Stack_02", "floor3", false, 5.17, 9.0, 5.214, 0.129, 0.085, 0.085, 0.085),
  entry("SM_Bld_Apartment_Roof_02", "roof", false, 5.252, 0.744, 5.488, 0.285, 0.095, 0.115, 0.115),
  entry("SM_Bld_Apartment_Roof_Corner_02", "roof", true, 5.611, 0.744, 5.624, 0.421, 0.125, 0.421, 0.143),
  entry("SM_Bld_Apartment_03", "floor", false, 5.281, 3.0, 5.497, 0.351, 0.146, 0.14, 0.14),
  entry("SM_Bld_Apartment_Corner_03", "floor", true, 5.491, 3.0, 5.497, 0.351, 0.146, 0.351, 0.14),
  entry("SM_Bld_Apartment_Stack_03", "floor3", false, 5.281, 9.0, 5.497, 0.351, 0.146, 0.14, 0.14),
  entry("SM_Bld_Apartment_Roof_03", "roof", false, 5.31, 0.744, 5.624, 0.421, 0.125, 0.143, 0.143),
  entry("SM_Bld_Apartment_Roof_Corner_03", "roof", true, 5.462, 0.744, 5.488, 0.285, 0.095, 0.285, 0.115),
];

const BY_KEY = new Map<CalibrationKey, KitEntry>(KIT.map((e) => [e.key, e] as const));

/** The kit entry of a key, or undefined when the key is not one of the 15. */
export function kitOf(k: CalibrationKey): KitEntry | undefined {
  return BY_KEY.get(k);
}

/** The kit entry of a key the stage placed itself: throws on a key that is not in the table. */
export function kitEntry(k: CalibrationKey): KitEntry {
  const e = BY_KEY.get(k);
  if (!e) throw new Error(`${k} is not in the kit table`);
  return e;
}
