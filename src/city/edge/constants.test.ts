/** Stage 4's typed-in parking constants, each pinned equal to the old tile city's (ticket 070 D1, criterion 2), while both existed; the old values are now typed in below. Light. */
import { describe, expect, it } from "vitest";
import { CITY_GROUND_VARIANT } from "../../core";
import { GRATE_ONE_IN, PATCH_ONE_IN, RETURN_WALL_TOL_M } from "./constants";
import { BAYS_PER_100M_MAX, BAYS_PER_PARKING_TILE, BAY_JUNCTION_CLEAR, BAY_RUN_TILES_MAX, BAY_TILES_PER_BLOCK_MIN, BUILDOUT_TREE_EVERY, KERB_BAY_SHARE_MAX, KERB_GAP_MIN_M, PARK_PER_SHOP, PARK_SUPPLY_BAND, TILE_M } from "./constants";

/**
 * The old tile city's values, typed in (ticket 070 L2b). Each is the value of the constant of the same name in `src/render3d/tilecity.ts` at b42b65f, with its line there.
 * The old file is no longer read; these numbers stand for it.
 */
const OLD_TILE_M = 5; // src/core/cityplan.ts line 7 at b42b65f (tilecity.ts re-exported it; imported at its line 66)
const OLD_PER_TILE = 3; // tilecity.ts line 114, BAYS_PER_PARKING_TILE
const OLD_CLEAR = 1; // tilecity.ts line 112, BAY_JUNCTION_CLEAR
const OLD_GRATE = 6; // tilecity.ts line 116, GRATE_ONE_IN
const OLD_PATCH = 12; // tilecity.ts line 118, PATCH_ONE_IN
const OLD_PER_SHOP = 1 / 3; // tilecity.ts line 164, PARK_PER_SHOP
const OLD_TILES_MIN = 1; // tilecity.ts line 171, BAY_TILES_PER_BLOCK_MIN
const OLD_RUN = 2; // tilecity.ts line 173, BAY_RUN_TILES_MAX
const OLD_GAP = 10; // tilecity.ts line 174, KERB_GAP_MIN_M
const OLD_SHARE = { avenue: 0.4, street: 0.3 }; // tilecity.ts line 176, KERB_BAY_SHARE_MAX
const OLD_BAYS_100 = 6; // tilecity.ts line 177, BAYS_PER_100M_MAX
const OLD_BAND = { lo: 0.75, hi: 1.5 }; // tilecity.ts line 182, PARK_SUPPLY_BAND
const OLD_TREE = 2; // tilecity.ts line 184, BUILDOUT_TREE_EVERY
const OLD_LANE_RIGHT = 1; // tilecity.ts line 241, LANE_RIGHT
const OLD_LANE_PATCH = 2; // tilecity.ts line 242, LANE_PATCH
const OLD_GRATE_BIT = 1; // tilecity.ts line 249, PAVEMENT_GRATE
const OLD_RETURN_NEAR = 2; // tilecity.ts line 250, PAVEMENT_RETURN_NEAR
const OLD_RETURN_FAR = 4; // tilecity.ts line 251, PAVEMENT_RETURN_FAR
const OLD_FLUSH = 8; // tilecity.ts line 252, PAVEMENT_FLUSH

describe("the parking constants moved from the tile city keep their values", () => {
  it("every one equals tilecity.ts's", () => {
    expect(TILE_M).toBe(OLD_TILE_M);
    expect(BAYS_PER_PARKING_TILE).toBe(OLD_PER_TILE);
    expect(PARK_PER_SHOP).toBe(OLD_PER_SHOP);
    expect(BAY_TILES_PER_BLOCK_MIN).toBe(OLD_TILES_MIN);
    expect(BAY_RUN_TILES_MAX).toBe(OLD_RUN);
    expect(KERB_GAP_MIN_M).toBe(OLD_GAP);
    expect(KERB_BAY_SHARE_MAX).toEqual(OLD_SHARE);
    expect(BAYS_PER_100M_MAX).toBe(OLD_BAYS_100);
    expect(BAY_JUNCTION_CLEAR).toBe(OLD_CLEAR);
    expect(BUILDOUT_TREE_EVERY).toBe(OLD_TREE);
    expect(PARK_SUPPLY_BAND.hi).toBe(OLD_BAND.hi);
  });

  it("P1's supply floor is 0.69 on the pipeline (Josh, 20 Nov 2026: \"yes lower it\"); the old tile city keeps 0.75 until section L", () => {
    expect(PARK_SUPPLY_BAND).toEqual({ lo: 0.69, hi: 1.5 });
    expect(OLD_BAND.lo).toBe(0.75);
  });
});

describe("the ground constants moved from the tile city keep their values (ticket 070 D2, criterion 1)", () => {
  it("GRATE_ONE_IN and PATCH_ONE_IN equal tilecity.ts's", () => {
    expect(GRATE_ONE_IN).toBe(OLD_GRATE);
    expect(PATCH_ONE_IN).toBe(OLD_PATCH);
  });

  it("the six old variant bits of CITY_GROUND_VARIANT have the values of the tile city's constants, and pavementDip is the new fifth pavement bit", () => {
    expect(CITY_GROUND_VARIANT.laneRight).toBe(OLD_LANE_RIGHT);
    expect(CITY_GROUND_VARIANT.lanePatch).toBe(OLD_LANE_PATCH);
    expect(CITY_GROUND_VARIANT.pavementGrate).toBe(OLD_GRATE_BIT);
    expect(CITY_GROUND_VARIANT.pavementReturnNear).toBe(OLD_RETURN_NEAR);
    expect(CITY_GROUND_VARIANT.pavementReturnFar).toBe(OLD_RETURN_FAR);
    expect(CITY_GROUND_VARIANT.pavementFlush).toBe(OLD_FLUSH);
    expect(CITY_GROUND_VARIANT.pavementDip).toBe(16);
  });

  it("a return's end may be 0.05 m from the wall plane (grammar rule 10's second addition)", () => {
    expect(RETURN_WALL_TOL_M).toBe(0.05);
  });
});
