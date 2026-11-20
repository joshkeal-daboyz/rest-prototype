/** Stage 4's typed-in parking constants, each pinned equal to the old tile city's (ticket 070 D1, criterion 2), while both exist. Light. */
import { describe, expect, it } from "vitest";
import {
  BAYS_PER_100M_MAX as OLD_BAYS_100,
  BAYS_PER_PARKING_TILE as OLD_PER_TILE,
  BAY_JUNCTION_CLEAR as OLD_CLEAR,
  BAY_RUN_TILES_MAX as OLD_RUN,
  BAY_TILES_PER_BLOCK_MIN as OLD_TILES_MIN,
  BUILDOUT_TREE_EVERY as OLD_TREE,
  KERB_BAY_SHARE_MAX as OLD_SHARE,
  KERB_GAP_MIN_M as OLD_GAP,
  PARK_PER_SHOP as OLD_PER_SHOP,
  PARK_SUPPLY_BAND as OLD_BAND,
  TILE_M as OLD_TILE_M,
} from "../../render3d/tilecity";
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
    expect(PARK_SUPPLY_BAND).toEqual(OLD_BAND);
  });
});
