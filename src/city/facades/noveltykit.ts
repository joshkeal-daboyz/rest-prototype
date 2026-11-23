/**
 * Stage 7, H1c: the novelty kit table (R-6; ticket 070 H1c criterion 1; Josh, 21 Nov 2026, Q26 "Yes, all four"). The 17 `SM_Prop_LargeSign_*` keys and their bounds (as `dressing.test.ts`' fixture has them, from the converted
 * manifest), the 16 shop kinds and which keys stand for which kind (SN, Q26 answer 2), H1b's nine sign keys read as a trade (SIGN_KIND, answer 3), the quarter a face sign turns to show its broad side (F, answer 4), and the
 * three numbers of the plan (NP). Every key list and bound is pinned by `src/render3d/noveltypin.test.ts` (this folder cannot import `src/render3d/`, R-1). A piece's pivot is its bounds' centre in x and z and its base
 * at y, and every key's own front is +z, as the roof kit's are.
 */

import type { CalibrationKey, CityShopKind } from "../../core";

const key = (name: string): CalibrationKey => `city-pack:${name}`;
const sign = (name: string): CalibrationKey => key(`SM_Prop_LargeSign_${name}`);

/** The 17 novelty keys, in `dressing.ts`' `NOVELTY_SIGNS` order. The bowling ball and pin are in no kind's list. */
export const NOVELTY_KEYS: readonly CalibrationKey[] = ["Pizza_01", "Burger_01", "Donut_01", "Coffee_01", "Hotdog_01", "Icecream_01", "Milkshake_01", "Noodles_01", "Popcorn_01", "Soda_01", "Taco_01", "Beer_01", "Bottle_01", "Guitar_01", "Lollypop_01", "BowlingBall_01", "BowlingPin_01"].map(sign);

export interface NoveltyBounds {
  readonly w: number;
  readonly h: number;
  readonly d: number;
}
const b = (w: number, h: number, d: number): NoveltyBounds => ({ w, h, d });

/** The bounds of the 17 keys (width, height, depth; metres). */
export const NOVELTY_BOUNDS: Readonly<Record<CalibrationKey, NoveltyBounds>> = {
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

/** The bounds of a novelty key: throws on a key that is not in the table. */
export function noveltyBounds(k: CalibrationKey): NoveltyBounds {
  const e = NOVELTY_BOUNDS[k];
  if (!e) throw new Error(`${k} is not in the novelty table`);
  return e;
}

/** The 16 shop kinds (`CityShopKind`), in the order the hash picks over: the 14 with a key, then barber and hotel. */
export const SHOP_KINDS: readonly CityShopKind[] = ["pizza", "burger", "hotDog", "taco", "noodles", "cafe", "donut", "iceCream", "diner", "sweets", "bar", "liquorStore", "cornerStore", "musicShop", "barber", "hotel"];

/** SN (Q26 answer 2): which keys stand for which shop kind. Barber and hotel have none, so such a shop never carries a novelty sign. `Bottle_01` is the green beer bottle, `Beer_01` the pint. */
export const NOVELTY_BY_KIND: Readonly<Record<CityShopKind, readonly CalibrationKey[]>> = {
  pizza: [sign("Pizza_01")],
  burger: [sign("Burger_01")],
  hotDog: [sign("Hotdog_01")],
  taco: [sign("Taco_01")],
  noodles: [sign("Noodles_01")],
  cafe: [sign("Coffee_01")],
  donut: [sign("Donut_01")],
  iceCream: [sign("Icecream_01"), sign("Milkshake_01")],
  diner: [sign("Milkshake_01"), sign("Soda_01")],
  sweets: [sign("Popcorn_01"), sign("Lollypop_01")],
  bar: [sign("Beer_01")],
  liquorStore: [sign("Bottle_01")],
  cornerStore: [sign("Bottle_01"), sign("Soda_01")],
  musicShop: [sign("Guitar_01")],
  barber: [],
  hotel: [],
};

/** SK (Q26 answer 3): what H1b's nine sign keys say about a shop's trade; `Entrance_01` names none (the shop's kind then comes from the hash). */
export const SIGN_KIND: Readonly<Record<CalibrationKey, CityShopKind | null>> = {
  [key("SM_Prop_Sign_Bar_01")]: "bar",
  [key("SM_Prop_Sign_Pub_01")]: "bar",
  [key("SM_Prop_Sign_Cafe_01")]: "cafe",
  [key("SM_Prop_Sign_Chinese_Noodles_01")]: "noodles",
  [key("SM_Prop_Sign_Pizza_01")]: "pizza",
  [key("SM_Prop_Sign_Entrance_01")]: null,
  [key("SM_Prop_Sign_Barber_01")]: "barber",
  [key("SM_Prop_Sign_DeliPizza_01")]: "pizza",
  [key("SM_Prop_Sign_Hotel_01")]: "hotel",
};

/** F (Q26 answer 4): the quarter a face sign turns, from its column's yaw, where its own x is the narrower side (so its larger side runs along the wall). One fixed quarter. */
export const FACE_QUARTER_DEG = 90;

// ---- NP: how often and where (the facades agent's; "per the discretion of the storefront agent", Josh, 21 Nov 2026) ----
/** PROPOSED (Josh: a novelty sign "doesn't always have to be placed with a shop", "an added detail", "per the discretion of the storefront agent"; no share is met anywhere): the chance a shop with a key tries for a sign. */
export const NOVELTY_CHANCE = 0.1;
/** PROPOSED, as above (the tile city's rule): at most this many signs, face or roof, in a B2 run. */
export const NOVELTY_PER_RUN = 1;
/** PROPOSED, as above: the share of tries that go to the roof first, the face otherwise (each falls back to the other). */
export const NOVELTY_ROOF_SHARE = 0.3;
