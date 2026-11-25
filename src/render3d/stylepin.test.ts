/**
 * Ticket 070 F1, criterion 2: the buildings stage's typed-in tables (src/city/buildings/constants.ts) equal the old path's while both exist: the apartment ("bay") styles of `STACK_STYLES`, `TERRACE_BAYS`, `CITY_STOREYS`,
 * `COLOURWAY_POOL`, and the R2 and R13 thresholds; and the stage's finaliser is `colourwayStart`'s (criterion 3, N5). It reads no GLB, so nothing here is skipped.
 */
import { describe, expect, it } from "vitest";
import { BUILDING_STYLES, CITY_CHECK as STAGE_CHECK, CITY_STOREYS as STAGE_STOREYS, COLOURWAY_POOL as STAGE_POOL, TERRACE_BAYS as STAGE_BAYS } from "../city/buildings/constants";
import { finalise } from "../city/buildings/hash";
import { stableHash } from "../city/pipeline/hash";
import { CITY_CHECK, CITY_STOREYS } from "./citymetrics";
import { COLOURWAY_POOL, colourwayStart } from "./colourway";
import { STACK_STYLES } from "./stacks";
/** The ladder town's `TERRACE_BAYS` (town.ts, deleted in ticket 081 A2c): grammar rule 1, a building is 2 to 4 columns. */
const TERRACE_BAYS = { min: 2, max: 4 } as const;

describe("the buildings stage's tables equal the old path's (070 F1, criterion 2)", () => {
  it("the styles are exactly the apartment (bay) styles of STACK_STYLES, with the same keys by role and the same pitches", () => {
    const bay = STACK_STYLES.filter((s) => s.depth === "bay");
    expect(BUILDING_STYLES.map((s) => s.id)).toEqual(bay.map((s) => s.id));
    for (const mine of BUILDING_STYLES) {
      const old = bay.find((s) => s.id === mine.id)!;
      expect(mine.base.mid, mine.id).toEqual(old.base.mid);
      expect(mine.base.door, mine.id).toEqual(old.base.door);
      expect(mine.base.corner, mine.id).toEqual(old.base.corner);
      expect(mine.floor.mid, mine.id).toEqual(old.floor.mid);
      expect(mine.floor.corner, mine.id).toEqual(old.floor.corner);
      expect(mine.roof.mid, mine.id).toEqual(old.roof.mid);
      expect(mine.roof.corner, mine.id).toEqual(old.roof.corner);
      expect(mine.pitch_m, mine.id).toEqual(old.pitch_m);
    }
  });

  it("offices are not row styles (as in terrace.ts)", () => {
    expect(STACK_STYLES.filter((s) => s.depth === "footprint").length).toBeGreaterThan(0);
    for (const s of BUILDING_STYLES) expect(s.id.startsWith("apartment-")).toBe(true);
  });

  it("TERRACE_BAYS, CITY_STOREYS, COLOURWAY_POOL and the R2 and R13 thresholds are equal", () => {
    expect(STAGE_BAYS).toEqual(TERRACE_BAYS);
    expect(STAGE_STOREYS).toEqual(CITY_STOREYS);
    expect([...STAGE_POOL]).toEqual([...COLOURWAY_POOL]);
    expect(STAGE_CHECK.R2).toBe(CITY_CHECK.R2);
    expect(STAGE_CHECK.R13).toBe(CITY_CHECK.R13);
  });

  it("the stage's finaliser of stableHash(\"colourway|\" + key), modulo n, is colourwayStart(key, n) on 10 typed-in keys", () => {
    const keys = ["a", "block:0:0", "lot-17", "6x6:1:3", "x", "terrace|run|4", "", "Apartment", "9999", "block:5:11|outer|-z|12,4"];
    expect(keys).toHaveLength(10);
    for (const key of keys) for (const n of [1, 2, 3, 8]) expect(finalise(stableHash(`colourway|${key}`)) % n, `${key} mod ${n}`).toBe(colourwayStart(key, n));
  });
});
