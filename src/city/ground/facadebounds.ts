/**
 * Stage 8: the bounds of the stage 7 keys it keeps clear of (AV; R-6; ticket 070 I criterion 1), typed in as stage 7's kit tables have them (this folder never imports `src/city/facades/`).
 * 15 non-glass dressing keys (`DRESS_BOUNDS`), 8 wall keys (`WALL_BOUNDS`) and 17 novelty keys (`NOVELTY_BOUNDS`), width, height, depth in metres, each piece's pivot at its bounds' centre in x and z.
 * The code-drawn escape (`CODE_ESCAPE_KEY`) is its own footprint, `CODE_ESCAPE_W_M` by `CODE_ESCAPE_D_M`. `src/render3d/furnpin.test.ts` pins every number to stage 7's.
 */

import type { CalibrationKey } from "../../core";

export interface FacadeBounds {
  readonly w: number;
  readonly h: number;
  readonly d: number;
}
const b = (w: number, h: number, d: number): FacadeBounds => ({ w, h, d });
const key = (name: string): CalibrationKey => `city-pack:${name}`;
const sign = (name: string): CalibrationKey => key(`SM_Prop_LargeSign_${name}`);

/** H1b's dressing but glass: the five covers, the ATM and the nine trade signs. */
export const AVOID_DRESS_BOUNDS: Readonly<Record<CalibrationKey, FacadeBounds>> = {
  [key("SM_Bld_Shop_Cover_01")]: b(4.574, 0.297, 2.815),
  [key("SM_Bld_Shop_Cover_02")]: b(4.706, 1.202, 3.235),
  [key("SM_Bld_Shop_Cover_03")]: b(5.0, 1.758, 3.501),
  [key("SM_Bld_Shop_Cover_04")]: b(5.104, 0.663, 0.732),
  [key("SM_Bld_Shop_Cover_05")]: b(5.394, 0.682, 5.394),
  [key("SM_Prop_ATM_01")]: b(1.128, 1.537, 0.519),
  [key("SM_Prop_Sign_Bar_01")]: b(1.327, 0.673, 0.138),
  [key("SM_Prop_Sign_Cafe_01")]: b(1.347, 0.553, 0.11),
  [key("SM_Prop_Sign_Chinese_Noodles_01")]: b(0.853, 0.507, 0.179),
  [key("SM_Prop_Sign_Pizza_01")]: b(2.211, 0.704, 0.144),
  [key("SM_Prop_Sign_Pub_01")]: b(1.13, 0.547, 0.112),
  [key("SM_Prop_Sign_Entrance_01")]: b(1.0, 0.436, 0.063),
  [key("SM_Prop_Sign_Barber_01")]: b(0.316, 0.948, 0.474),
  [key("SM_Prop_Sign_DeliPizza_01")]: b(0.301, 1.551, 0.14),
  [key("SM_Prop_Sign_Hotel_01")]: b(1.267, 3.801, 0.3),
};

/** H2's eight wall keys: the covers (door canopies), the three escape pieces, the air-conditioner and the two window planters. */
export const AVOID_WALL_BOUNDS: Readonly<Record<CalibrationKey, FacadeBounds>> = {
  [key("SM_Bld_Cover_01")]: b(4.832, 1.075, 1.0),
  [key("SM_Bld_Cover_02")]: b(1.366, 0.974, 0.701),
  [key("SM_Bld_FireEscape_01")]: b(3.251, 1.492, 1.644),
  [key("SM_Bld_FireEscape_02")]: b(3.251, 3.609, 1.644),
  [key("SM_Bld_FireEscape_03")]: b(4.252, 3.802, 1.76),
  [key("SM_Prop_Aircon_01")]: b(0.823, 0.995, 0.651),
  [key("SM_Prop_PlanterWindow_01")]: b(0.988, 0.743, 0.37),
  [key("SM_Prop_PlanterWindow_02")]: b(0.87, 0.743, 0.332),
};

/** H1c's 17 novelty keys. */
export const AVOID_NOVELTY_BOUNDS: Readonly<Record<CalibrationKey, FacadeBounds>> = {
  [sign("Beer_01")]: b(2.005, 3.333, 2.019),
  [sign("Bottle_01")]: b(1.8, 5.818, 1.8),
  [sign("BowlingBall_01")]: b(3.019, 3.174, 3.174),
  [sign("BowlingPin_01")]: b(1.631, 5.156, 1.631),
  [sign("Burger_01")]: b(3.715, 2.178, 3.717),
  [sign("Coffee_01")]: b(2.194, 1.346, 1.625),
  [sign("Donut_01")]: b(3.818, 1.355, 3.818),
  [sign("Guitar_01")]: b(2.098, 6.378, 0.377),
  [sign("Hotdog_01")]: b(1.411, 1.143, 3.926),
  [sign("Icecream_01")]: b(1.93, 5.04, 1.93),
  [sign("Lollypop_01")]: b(3.365, 6.36, 0.512),
  [sign("Milkshake_01")]: b(2.238, 4.699, 1.721),
  [sign("Noodles_01")]: b(2.948, 3.601, 2.515),
  [sign("Pizza_01")]: b(3.368, 0.562, 2.957),
  [sign("Popcorn_01")]: b(1.737, 2.797, 1.737),
  [sign("Soda_01")]: b(1.915, 5.595, 1.915),
  [sign("Taco_01")]: b(1.215, 2.223, 3.701),
};

/** The key a code-drawn escape's piece carries (wallkit's `CODE_ESCAPE_KEY`), and its footprint (`CODE_ESCAPE`'s w and d). */
export const CODE_ESCAPE_KEY: CalibrationKey = "code:escape";
export const CODE_ESCAPE_W_M = 3.25;
export const CODE_ESCAPE_D_M = 1.64;

/** The bounds of a stage 7 key AV reads, or undefined (the code escape has its own footprint). */
export function avoidBounds(k: CalibrationKey): FacadeBounds | undefined {
  return AVOID_DRESS_BOUNDS[k] ?? AVOID_WALL_BOUNDS[k] ?? AVOID_NOVELTY_BOUNDS[k];
}
