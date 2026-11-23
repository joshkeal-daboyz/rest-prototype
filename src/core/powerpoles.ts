/**
 * The ground poles stage 6 stands on the city (ticket 081 PK1; a re-cut of merged ticket 071 B). Typed data only: no logic.
 *
 * Why it is here. Josh, 23 Nov 2026, on a card (081 B1p-A, a roof wire over an intersection): "Tall poles too". A roof-to-pole span over a junction is allowed where the
 * ground pole's model clears 7.5 m, so stage 6 (`src/city/circuit/`, which may import only `src/core/` and `src/city/`) must know each pole's model and its attachment
 * heights. They lived in `src/render3d/powerkit.ts` (`POWER_MIX`, `POWER_POLES`); the values are copied here unchanged, and 081 PK2 makes `powerkit.ts` read them back
 * from this file, with a pin that the two agree.
 *
 * The choosing rule is not here (core holds no logic): stage 6 implements `poleAt`'s rule (`powerkit.ts`: `stableHash(spotId) % n`, or its `<run>#<index>` stepping)
 * in `src/city/circuit/` (081 K2d) and writes its answer to `CityCircuitLayer.poleModels`, so the renderer draws the model stage 6 judged.
 */

/**
 * The three ground pole keys, in `POWER_MIX`'s order (`src/render3d/powerkit.ts` lines 136 to 140 at 609e573). The order matters: the pick indexes it.
 * The Sci-Fi City poles left this mix (Josh, 21 Nov 2026: "The scifi power poles are intended to be atop buildings and other objects they are not intended to come out of the ground").
 */
export const GROUND_POLE_MIX = ["apocalypse-power:SM_Prop_Powerpole_01", "palm-city-pack:SM_Prop_Powerpole_01", "palm-city-pack:SM_Prop_Powerpole_02"] as const;
export type GroundPoleKey = (typeof GROUND_POLE_MIX)[number];

/**
 * Each ground pole's three wire attachment heights above its base, in metres: `POWER_POLES[key].attach_m[i].up`, in its order (centre first, then the outer with the lower
 * `across`, then the higher). Copied from `src/render3d/powerkit.ts` at 609e573: Apocalypse lines 85 to 87, Palm `_01` lines 98 to 100, Palm `_02` lines 112 to 114.
 * A span's end height on a pole is the kit's (071: "the layer gives spots and spans, and the kit gives poles and pieces"); stage 6 reads these only to judge clearances
 * (CK7's 4.2 m floor, CK17's 7.5 m over a junction).
 */
export const GROUND_POLE_ATTACH_UP_M: Readonly<Record<GroundPoleKey, readonly [number, number, number]>> = {
  "apocalypse-power:SM_Prop_Powerpole_01": [5.862, 5.862, 5.862],
  "palm-city-pack:SM_Prop_Powerpole_01": [8.53, 8.548, 8.548],
  "palm-city-pack:SM_Prop_Powerpole_02": [8.47, 8.407, 8.731],
};
