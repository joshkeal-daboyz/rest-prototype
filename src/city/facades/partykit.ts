/**
 * Stage 7, H2b: the party-wall kit table (R-6; ticket 070 H2b criterion 1). The painted boards, the window and the pipe runs that dress a wall standing above a lower roof (grammar rule 8), their bounds, the floor keys' side and
 * back insets and the roof keys' heights (copies of the buildings stage's, which this folder cannot import: R-1), and `BLANK_RUN_MAX_M`. The boards' keys and bounds are `dressing.ts`' (`BILLBOARD_FACES`) and its test's fixture's; the
 * window's and the pipes' are measured from the converted GLB (`docs/design/070-H2-precheck.md`, section 2, Q9). `src/render3d/partywallpin.test.ts` pins every number. A piece's pivot is its bounds' centre in x and z and its
 * base at y; its own front is +z, its back -z.
 */

import type { CalibrationKey, CityWallPieceKind } from "../../core";

const key = (name: string): CalibrationKey => `city-pack:${name}`;

/** The wall piece kinds H2b places (PW7: H2's checks and the column cap skip them; `partyFailures` judges them). */
export const PARTY_WALL_KINDS: readonly CityWallPieceKind[] = ["partyBoard", "partyPipe", "partyWindow"];

/** The painted boards (one to a face). */
export const PARTY_BOARDS: readonly CalibrationKey[] = ["01", "02", "03", "04", "05", "06", "07"].map((n) => key(`SM_Prop_Billboard_Sign_${n}`));
/** The window (two to a face). */
export const PARTY_WINDOW: CalibrationKey = key("SM_Prop_Window_01");
/**
 * The pipe runs (one or two faces). `_01` is in the table and never fits a face (PW3; Josh, 21 Nov 2026, Q23 answer 6): the stage does not special-case it. `SM_Prop_Pipe_Present_02` stands 3.17 m off the wall and is not in the table.
 */
export const PARTY_PIPES: readonly CalibrationKey[] = [key("SM_Prop_Pipe_Present_01"), key("SM_Prop_Pipe_Present_03")];
/** Every key of the kit. */
export const PARTY_KEYS: readonly CalibrationKey[] = [...PARTY_BOARDS, PARTY_WINDOW, ...PARTY_PIPES];

/**
 * PW4 (Decided; Josh, 21 Nov 2026, Q23 answer 7: "Yes, 2.1m"): the widest bare stretch of a dressed party wall, metres. 067 A's rule (the apartment fronts' window pitch plus 0.5 m: 2.11, 2.14 and 1.68 m by style) rounded down.
 * The grammar called 3 m "section C's provisional number"; it is 2.1.
 */
export const BLANK_RUN_MAX_M = 2.1;

/** The two windows of a face stand at the quarter points of its 5 m: this far either side of its centre, metres. */
export const PARTY_WINDOW_X_M = 1.25;

export interface PartyBounds {
  readonly w: number;
  readonly h: number;
  readonly d: number;
}
const b = (w: number, h: number, d: number): PartyBounds => ({ w, h, d });

/** The bounds of the kit's keys (width, height, depth; metres). */
export const PARTY_BOUNDS: Readonly<Record<CalibrationKey, PartyBounds>> = {
  ...Object.fromEntries(PARTY_BOARDS.map((k) => [k, b(4.193, 2.028, 0.118)] as const)),
  [PARTY_WINDOW]: b(1.303, 2.313, 0.37),
  [PARTY_PIPES[0]!]: b(4.459, 7.046, 0.498),
  [PARTY_PIPES[1]!]: b(2.828, 4.243, 0.498),
};

/** The bounds of a kit key: throws on a key that is not in the table. */
export function partyBounds(k: CalibrationKey): PartyBounds {
  const e = PARTY_BOUNDS[k];
  if (!e) throw new Error(`${k} is not in the party-wall kit`);
  return e;
}

/** What a kit key is, as the wall piece's kind. */
export function partyKindOf(k: CalibrationKey): "partyBoard" | "partyPipe" | "partyWindow" | null {
  return PARTY_BOARDS.includes(k) ? "partyBoard" : k === PARTY_WINDOW ? "partyWindow" : PARTY_PIPES.includes(k) ? "partyPipe" : null;
}

/** How far inside its bounds a floor key's side walls and back stand, metres (the buildings kit's `body`, PW2: the trim past the wall plane). */
export interface PartyInset {
  readonly back: number;
  readonly nx: number;
  readonly px: number;
}
const i = (back: number, nx: number, px: number): PartyInset => ({ back, nx, px });

export const PARTY_BODY_M: Readonly<Record<CalibrationKey, PartyInset>> = {
  [key("SM_Bld_Apartment_01")]: i(0, 0, 0),
  [key("SM_Bld_Apartment_Corner_01")]: i(0, 0.196, 0),
  [key("SM_Bld_Apartment_Stack_01")]: i(0, 0, 0),
  [key("SM_Bld_Apartment_02")]: i(0.085, 0.085, 0.085),
  [key("SM_Bld_Apartment_Corner_02")]: i(0.085, 0.129, 0.085),
  [key("SM_Bld_Apartment_Stack_02")]: i(0.085, 0.085, 0.085),
  [key("SM_Bld_Apartment_03")]: i(0.146, 0.14, 0.14),
  [key("SM_Bld_Apartment_Corner_03")]: i(0.146, 0.351, 0.14),
  [key("SM_Bld_Apartment_Stack_03")]: i(0.146, 0.14, 0.14),
};

/** The roof keys' bounds heights, metres (the buildings kit's `h`): the lowest a kit piece's base may stand over a lower building's roof is 3 storeys plus this. */
export const PARTY_ROOF_H_M: Readonly<Record<CalibrationKey, number>> = {
  [key("SM_Bld_Apartment_Roof_01")]: 0.5,
  [key("SM_Bld_Apartment_Roof_Corner_01")]: 0.5,
  [key("SM_Bld_Apartment_Roof_02")]: 0.744,
  [key("SM_Bld_Apartment_Roof_Corner_02")]: 0.744,
  [key("SM_Bld_Apartment_Roof_03")]: 0.744,
  [key("SM_Bld_Apartment_Roof_Corner_03")]: 0.744,
};

/** A roof key's height: throws on a key that is not a roof of the buildings kit. */
export function roofHeight(k: CalibrationKey): number {
  const h = PARTY_ROOF_H_M[k];
  if (h === undefined) throw new Error(`${k} is not a roof key of the party-wall table`);
  return h;
}
