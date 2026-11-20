/** Stage 4's typed-in parking constants, each pinned equal to the old tile city's (ticket 070 D1, criterion 2), while both exist. Light. */
import { describe, expect, it } from "vitest";
import { CITY_GROUND_VARIANT } from "../../core";
import {
  BAYS_PER_100M_MAX as OLD_BAYS_100,
  BAYS_PER_PARKING_TILE as OLD_PER_TILE,
  BAY_JUNCTION_CLEAR as OLD_CLEAR,
  BAY_RUN_TILES_MAX as OLD_RUN,
  BAY_TILES_PER_BLOCK_MIN as OLD_TILES_MIN,
  BUILDOUT_TREE_EVERY as OLD_TREE,
  GRATE_ONE_IN as OLD_GRATE,
  LANE_PATCH as OLD_LANE_PATCH,
  LANE_RIGHT as OLD_LANE_RIGHT,
  PATCH_ONE_IN as OLD_PATCH,
  PAVEMENT_FLUSH as OLD_FLUSH,
  PAVEMENT_GRATE as OLD_GRATE_BIT,
  PAVEMENT_RETURN_FAR as OLD_RETURN_FAR,
  PAVEMENT_RETURN_NEAR as OLD_RETURN_NEAR,
  KERB_BAY_SHARE_MAX as OLD_SHARE,
  KERB_GAP_MIN_M as OLD_GAP,
  PARK_PER_SHOP as OLD_PER_SHOP,
  PARK_SUPPLY_BAND as OLD_BAND,
  TILE_M as OLD_TILE_M,
} from "../../render3d/tilecity";
import { GRATE_ONE_IN, PATCH_ONE_IN, RETURN_WALL_TOL_M } from "./constants";
import { BAYS_PER_100M_MAX, BAYS_PER_PARKING_TILE, BAY_JUNCTION_CLEAR, BAY_RUN_TILES_MAX, BAY_TILES_PER_BLOCK_MIN, BUILDOUT_TREE_EVERY, KERB_BAY_SHARE_MAX, KERB_GAP_MIN_M, PARK_PER_SHOP, PARK_SUPPLY_BAND, TILE_M } from "./constants";

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
