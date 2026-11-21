/**
 * Stage 8: the furniture kit (R-6; ticket 070 I criterion 1). The 24 City Pack furniture keys (`furniture.ts`' `furnitureKeys()` less `Sidewalk_Panel_02`: stage 3's plaza is paved as the apron and E draws it, PZ), each with its
 * bounds (width, height, depth; metres; the converted manifest, typed in as `furniture.test.ts`' fixture has them) and the prop kind it is. Every key's own front is +z (the tile city's guess: no furniture key is in `BUILDING_FRONTS`),
 * and its pivot is its bounds' centre in x and z with its base at y (the converter centres every pivot). `src/render3d/furnpin.test.ts` pins every list and number.
 */

import type { CalibrationKey, CityGroundPropKind } from "../../core";

const k = (name: string): CalibrationKey => `city-pack:${name}`;
const seq = (prefix: string, ...nn: string[]): CalibrationKey[] => nn.map((n) => k(`${prefix}${n}`));

export const BINS: readonly CalibrationKey[] = seq("SM_Prop_Trashbin_", "01", "02");
export const PLANTERS: readonly CalibrationKey[] = seq("SM_Prop_Planter_", "01", "02");
export const POT_PLANTS: readonly CalibrationKey[] = seq("SM_Prop_PotPlant_", "01", "02");
export const BENCHES: readonly CalibrationKey[] = seq("SM_Prop_ParkBench_", "01");
export const MAILBOXES: readonly CalibrationKey[] = seq("SM_Prop_Mailbox_", "01");
export const NEWSPAPERS: readonly CalibrationKey[] = seq("SM_Prop_Newspaper_", "02");
export const METERS: readonly CalibrationKey[] = seq("SM_Prop_ParkingMeter_", "01");
export const HYDRANTS: readonly CalibrationKey[] = seq("SM_Prop_Hydrant_", "01");
export const TREES: readonly CalibrationKey[] = seq("SM_Env_Tree_", "01", "02", "03");
export const BOLLARDS: readonly CalibrationKey[] = seq("SM_Prop_SidewalkPoles_", "02");
export const BUS_STOPS: readonly CalibrationKey[] = seq("SM_Prop_BusStop_", "01");
export const PARKING_LINES: CalibrationKey = k("SM_Env_Road_ParkingLines_01");
export const BARRIERS: readonly CalibrationKey[] = seq("SM_Prop_Barrier_", "01");
export const LOT_METERS: readonly CalibrationKey[] = seq("SM_Prop_ParkingMeter_", "02");
export const BILLBOARD_POLE: CalibrationKey = k("SM_Prop_Billboard_Pole_01");
export const BILLBOARD_BOARD: CalibrationKey = k("SM_Prop_Billboard_01");
export const PICNIC_TABLE: CalibrationKey = k("SM_Prop_PicnicTable_01");
export const UMBRELLA: CalibrationKey = k("SM_Prop_Umbrella_01");
export const HOTDOG_STAND: CalibrationKey = k("SM_Prop_HotdogStand_01");

/** The tile city's green and lane keys (`tileslots.ts`' `TILE_TREES`, `TILE_BENCH`, `TILE_BINS`). */
export const GREEN_TREES: readonly CalibrationKey[] = TREES;
export const GREEN_BENCH: CalibrationKey = BENCHES[0]!;
export const LANE_BINS: readonly CalibrationKey[] = BINS;

export interface KitBounds {
  readonly w: number;
  readonly h: number;
  readonly d: number;
}

const b = (w: number, h: number, d: number): KitBounds => ({ w, h, d });

/** The bounds of the 24 keys (width, height, depth; metres). `ParkingLines` is a flat 10 x 5 m tile with no height. */
export const KIT_BOUNDS: Readonly<Record<CalibrationKey, KitBounds>> = {
  [k("SM_Prop_Trashbin_01")]: b(0.647, 1.178, 0.647),
  [k("SM_Prop_Trashbin_02")]: b(0.721, 1.595, 0.582),
  [k("SM_Prop_Planter_01")]: b(2.301, 0.81, 0.701),
  [k("SM_Prop_Planter_02")]: b(1.511, 0.782, 0.463),
  [k("SM_Prop_PotPlant_01")]: b(0.565, 0.797, 0.578),
  [k("SM_Prop_PotPlant_02")]: b(0.694, 1.555, 0.639),
  [k("SM_Prop_ParkBench_01")]: b(2.079, 1.048, 0.624),
  [k("SM_Prop_Mailbox_01")]: b(0.666, 1.216, 0.586),
  [k("SM_Prop_Newspaper_02")]: b(0.613, 1.172, 0.478),
  [k("SM_Prop_ParkingMeter_01")]: b(0.225, 1.455, 0.128),
  [k("SM_Prop_Hydrant_01")]: b(0.551, 1.053, 0.54),
  [k("SM_Env_Tree_01")]: b(1.866, 4.208, 2.511),
  [k("SM_Env_Tree_02")]: b(2.236, 4.676, 1.54),
  [k("SM_Env_Tree_03")]: b(2.217, 3.845, 1.894),
  [k("SM_Prop_SidewalkPoles_02")]: b(0.209, 1.124, 0.209),
  [k("SM_Prop_BusStop_01")]: b(4.511, 3.073, 1.571),
  [k("SM_Env_Road_ParkingLines_01")]: b(10, 0, 5),
  [k("SM_Prop_Barrier_01")]: b(1.435, 0.983, 0.664),
  [k("SM_Prop_ParkingMeter_02")]: b(0.772, 1.869, 0.526),
  [k("SM_Prop_Billboard_Pole_01")]: b(0.606, 6.897, 0.606),
  [k("SM_Prop_Billboard_01")]: b(4.428, 2.345, 0.82),
  [k("SM_Prop_PicnicTable_01")]: b(2.483, 1.008, 1.687),
  [k("SM_Prop_Umbrella_01")]: b(1.597, 1.349, 1.597),
  [k("SM_Prop_HotdogStand_01")]: b(2.961, 3.662, 2.393),
};

/** The kit's keys, once each. */
export const KIT_KEYS: readonly CalibrationKey[] = Object.keys(KIT_BOUNDS) as CalibrationKey[];

/** The keys of each prop kind (R10's keys check: a prop's key is in its kind's list). */
export const KEYS_OF_KIND: Readonly<Record<CityGroundPropKind, readonly CalibrationKey[]>> = {
  tree: TREES,
  bench: BENCHES,
  bin: BINS,
  planter: PLANTERS,
  potPlant: POT_PLANTS,
  mailbox: MAILBOXES,
  newspaper: NEWSPAPERS,
  meter: METERS,
  hydrant: HYDRANTS,
  busStop: BUS_STOPS,
  bollard: BOLLARDS,
  lotLines: [PARKING_LINES],
  barrier: BARRIERS,
  lotMeter: LOT_METERS,
  billboardPole: [BILLBOARD_POLE],
  billboardBoard: [BILLBOARD_BOARD],
  picnicTable: [PICNIC_TABLE],
  umbrella: [UMBRELLA],
  hotdogStand: [HOTDOG_STAND],
};

/** The prop kind a key is. */
export const KIND_OF_KEY: ReadonlyMap<CalibrationKey, CityGroundPropKind> = new Map(
  (Object.entries(KEYS_OF_KIND) as [CityGroundPropKind, readonly CalibrationKey[]][]).flatMap(([kind, keys]) => keys.map((key) => [key, kind] as const)),
);

/** A kit key's bounds: throws on a key that is not in the kit. */
export function boundsOf(key: CalibrationKey): KitBounds {
  const e = KIT_BOUNDS[key];
  if (!e) throw new Error(`${key} is not in the ground kit`);
  return e;
}
