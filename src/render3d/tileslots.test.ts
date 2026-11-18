/**
 * Ticket 055 C, the pure half: `tileslots.ts` (which City Pack piece draws each tile role, the turn of each piece, the levels, the draw-call cap, the page's flags and the sheet's list).
 * No three, no WebGL, no assets. The only file read is this folder's own source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CITY_BLOCKS_DEFAULT, CITY_BLOCKS_MAX, type TileRole } from "./tilecity";
import { TILE_DRAW_CALLS_MAX, TILE_FRONTS, TILE_FRONT_TEXT, TILE_LEVELS, TILE_PACK, TILE_PATCH, TILE_SHEET_EXTRA, TILE_SLOTS, cityTilesRequested, sheetPieces, tileFront, tileKeys } from "./tileslots";

const ROLES: readonly TileRole[] = ["lane", "parking", "parkingPlain", "junction", "crossing", "pavement", "pavementCorner", "kerbCut", "lotSurface", "plaza"];

describe("TILE_SLOTS", () => {
  it("gives every tile role at least one City Pack key, and no role anything else", () => {
    expect(Object.keys(TILE_SLOTS).sort()).toEqual([...ROLES].sort());
    for (const role of ROLES) {
      const keys = TILE_SLOTS[role];
      expect(keys.length, role).toBeGreaterThan(0);
      expect(new Set(keys).size, role).toBe(keys.length);
      for (const key of keys) expect(key.startsWith(`${TILE_PACK}:SM_Env_`), key).toBe(true);
    }
  });

  it("names the pieces the ticket names: lines for the lanes, the parking lines, the bare road for a junction, the zebra, the three pavements, the dipped corner and kerb cut", () => {
    const names = (r: TileRole): string[] => TILE_SLOTS[r].map((k) => k.slice(TILE_PACK.length + 1));
    expect(names("lane")).toEqual(["SM_Env_Road_Lines_01", "SM_Env_Road_Lines_02"]);
    expect(names("parking")).toEqual(["SM_Env_Road_ParkingLines_01"]);
    expect(names("parkingPlain")).toEqual(["SM_Env_Road_01"]);
    expect(names("junction")).toEqual(["SM_Env_Road_Bare_01"]);
    expect(names("crossing")).toEqual(["SM_Env_Road_Crossing_01"]);
    expect(names("pavement")).toEqual(["SM_Env_Sidewalk_Straight_01", "SM_Env_Sidewalk_Straight_02", "SM_Env_Sidewalk_Grate_01"]);
    expect(names("pavementCorner")).toEqual(["SM_Env_Sidewalk_Dip_Corner_01"]);
    expect(names("kerbCut")).toEqual(["SM_Env_Sidewalk_Dip_01"]);
    expect(TILE_PATCH).toBe(`${TILE_PACK}:SM_Env_Road_Patch_01`);
  });

  it("shares Road_Bare_01 between a junction and a lot surface (the ticket's own design) and no other key between roles", () => {
    const users = new Map<string, TileRole[]>();
    for (const role of ROLES) for (const key of TILE_SLOTS[role]) users.set(key, [...(users.get(key) ?? []), role]);
    const shared = [...users].filter(([, roles]) => roles.length > 1);
    expect(shared).toEqual([[`${TILE_PACK}:SM_Env_Road_Bare_01`, ["junction", "lotSurface"]]]);
  });
});

describe("levels and the draw-call cap", () => {
  it("puts the roads at the carriageway level, the pavements with their top at 0, and a parking lot's surface beside the pavement at 0", () => {
    for (const r of ["lane", "parking", "parkingPlain", "junction", "crossing"] as const) expect(TILE_LEVELS[r], r).toBe("carriage");
    for (const r of ["pavement", "pavementCorner", "kerbCut", "plaza"] as const) expect(TILE_LEVELS[r], r).toBe("pavement");
    expect(TILE_LEVELS.lotSurface).toBe("ground");
  });

  it("caps the tiles at 40 draw calls", () => {
    expect(TILE_DRAW_CALLS_MAX).toBe(40);
  });
});

describe("TILE_FRONTS", () => {
  it("is empty until the tile sheet has been checked by eye, and a piece with no line is not turned", () => {
    expect(Object.keys(TILE_FRONTS)).toEqual([]);
    expect(tileFront(TILE_SLOTS.pavement[0]!)).toBe(0);
  });

  it("reads a line when the table has one, and every line is a quarter turn of a key the tiles use", () => {
    const key = TILE_SLOTS.pavement[0]!;
    expect(tileFront(key, { [key]: 180 })).toBe(180);
    expect(tileFront(TILE_SLOTS.lane[0]!, { [key]: 180 })).toBe(0);
    for (const [k, v] of Object.entries(TILE_FRONTS)) {
      expect(tileKeys(), k).toContain(k);
      expect([0, 90, 180, 270], k).toContain(v);
    }
  });
});

describe("tileKeys and the sheet's list", () => {
  it("lists every role's key, the patch and the sheet's extras once each", () => {
    const keys = tileKeys();
    expect(new Set(keys).size).toBe(keys.length);
    for (const role of ROLES) for (const key of TILE_SLOTS[role]) expect(keys).toContain(key);
    expect(keys).toContain(TILE_PATCH);
    for (const key of TILE_SHEET_EXTRA) expect(keys).toContain(key);
  });

  it("shows each piece once on the sheet, a shared key once with both its roles, the parking lines two cells long, and says what the front of every role means", () => {
    const pieces = sheetPieces();
    expect(pieces.map((p) => p.key)).toEqual(tileKeys());
    const bare = pieces.find((p) => p.key.endsWith("Road_Bare_01"))!;
    expect(bare.roles).toEqual(["junction", "lotSurface"]);
    expect(pieces.filter((p) => p.cells === 2).map((p) => p.key)).toEqual([TILE_SLOTS.parking[0]]);
    expect(pieces.filter((p) => p.roles.length === 0).map((p) => p.key)).toEqual([...TILE_SHEET_EXTRA]);
    for (const role of ROLES) expect(TILE_FRONT_TEXT[role].length, role).toBeGreaterThan(0);
  });
});

describe("cityTilesRequested", () => {
  it("is null unless the page asks for city=tiles", () => {
    for (const s of ["", "?puzzle=01-first-light&view=3d", "?city=", "?city=town", "?city=Tiles", "?blocks=2x2&seed=3&sheet=1", "?gallery=city-pack"]) expect(cityTilesRequested(s), s).toBeNull();
  });

  it("defaults to the 3 x 3 city, seed 1, no sheet", () => {
    expect(cityTilesRequested("?puzzle=01-first-light&view=3d&city=tiles")).toEqual({ blocksX: CITY_BLOCKS_DEFAULT, blocksZ: CITY_BLOCKS_DEFAULT, seed: 1, sheet: false });
    expect(CITY_BLOCKS_DEFAULT).toBe(3);
  });

  it("reads blocks=WxD clamped to 1..6, an integer seed (negative too) and sheet=1", () => {
    expect(cityTilesRequested("?city=tiles&blocks=5x4&seed=2")).toEqual({ blocksX: 5, blocksZ: 4, seed: 2, sheet: false });
    expect(cityTilesRequested("?city=tiles&blocks=0x99")).toEqual({ blocksX: 1, blocksZ: CITY_BLOCKS_MAX, seed: 1, sheet: false });
    expect(cityTilesRequested("?city=tiles&blocks=2X6&seed=-7&sheet=1")).toEqual({ blocksX: 2, blocksZ: 6, seed: -7, sheet: true });
    expect(cityTilesRequested("&city=tiles&sheet=1")?.sheet).toBe(true);
  });

  it("falls back to the defaults on anything malformed: a size that is not WxD, a seed that is not an integer, a sheet that is not 1", () => {
    for (const s of ["blocks=3", "blocks=3x", "blocks=axb", "blocks=3x3x3", "blocks=-2x2", "blocks=2.5x2"]) expect(cityTilesRequested(`?city=tiles&${s}`), s).toEqual({ blocksX: 3, blocksZ: 3, seed: 1, sheet: false });
    for (const s of ["seed=1.5", "seed=abc", "seed=", "seed=0x10", "seed=99999999999999999999"]) expect(cityTilesRequested(`?city=tiles&${s}`)?.seed, s).toBe(1);
    for (const s of ["sheet=0", "sheet=true", "sheet="]) expect(cityTilesRequested(`?city=tiles&${s}`)?.sheet, s).toBe(false);
  });
});

describe("the module is pure", () => {
  const src = readFileSync("src/render3d/tileslots.ts", "utf8");
  it("imports no three, no DOM, no grid, night, play or ui, and reads no address", () => {
    const imports = [...src.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]!);
    expect(imports.sort()).toEqual(["./tilecity", "../core"].sort());
    expect(/\blocation\b|\bdocument\b|\bwindow\b/.test(src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""))).toBe(false);
  });
});
