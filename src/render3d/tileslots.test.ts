/**
 * Ticket 055 C, the pure half: `tileslots.ts` (which City Pack piece draws each tile role, the turn of each piece, the levels, the draw-call cap, the page's flags and the sheet's list).
 * No three, no WebGL, no assets. Files read: this folder's own source, and (inside one `it`, skipped when absent) the converted City Pack GLB.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CalibrationKey } from "../core";
import { CITY_BLOCKS_DEFAULT, CITY_BLOCKS_MAX, type InteriorRole, type TileRole } from "./tilecity";
import { SIDEWALK_WALK_M, TILE_M, tileCity } from "./tilecity";
import { TREES } from "./furniture";
import {
  SHEET_BUILDOUT_NOTE,
  SHEET_LEGEND,
  SHEET_LEGEND_CHARS,
  SHEET_SHAPES,
  SHEET_WIDE_ASPECT,
  INTERIOR_DRAW_CALLS_MAX,
  INTERIOR_KEYS,
  PASSAGE_FLOOR_KEYS,
  TILE_DRAW_CALLS_MAX,
  TILE_FRONTS,
  TILE_BASE_M,
  TILE_FRONT_TEXT,
  TILE_LEVELS,
  TILE_PACK,
  TILE_PATCH,
  TILE_SHEET_EXTRA,
  TILE_SLOTS,
  TILE_TREES,
  TILE_WALK_M,
  cityTilesRequested,
  inletCells,
  passageFloorCells,
  sheetColumns,
  sheetLabel,
  sheetLayout,
  sheetLegend,
  sheetPieces,
  sheetShortName,
  tileFront,
  tileKeys,
  tileLevelY_m,
  tileWalkM,
} from "./tileslots";

const ROLES: readonly TileRole[] = ["lane", "parking", "parkingPlain", "junction", "crossing", "pavement", "pavementCorner", "kerbCut", "buildout", "lotSurface", "plaza"];
/** The block interiors' roles (057 D), which the tile view merges into its tables. */
const INTERIOR: readonly InteriorRole[] = ["apron", "court", "drive", "green", "greenPath", "alley", "parkEdge"];

describe("TILE_SLOTS", () => {
  it("gives every tile role and every block-interior role at least one City Pack key, and no role anything else", () => {
    expect(Object.keys(TILE_SLOTS).sort()).toEqual([...ROLES, ...INTERIOR].sort());
    for (const role of [...ROLES, ...INTERIOR]) {
      const keys = TILE_SLOTS[role];
      expect(keys.length, role).toBeGreaterThan(0);
      expect(new Set(keys).size, role).toBe(keys.length);
      for (const key of keys) expect(key.startsWith(`${TILE_PACK}:SM_Env_`), key).toBe(true);
    }
  });

  it("names the pieces the ticket names: lines for the lanes, the parking lines, the bare road for a junction, the zebra, the plain straight and the grate, the dipped corner and kerb cut", () => {
    const names = (r: TileRole): string[] => TILE_SLOTS[r].map((k) => k.slice(TILE_PACK.length + 1));
    // E, Q8 (Josh, 18 Nov 2026): the yellow pieces carry the centre line; the white ones (no centre mark) moved to the sheet's extras.
    expect(names("lane")).toEqual(["SM_Env_Road_YellowLines_01", "SM_Env_Road_YellowLines_02"]);
    expect(TILE_SHEET_EXTRA).toContain(`${TILE_PACK}:SM_Env_Road_Lines_01`);
    expect(TILE_SHEET_EXTRA).toContain(`${TILE_PACK}:SM_Env_Road_Lines_02`);
    expect(names("parking")).toEqual(["SM_Env_Road_ParkingLines_01"]);
    expect(names("parkingPlain")).toEqual(["SM_Env_Road_01"]);
    expect(names("junction")).toEqual(["SM_Env_Road_Bare_01"]);
    expect(names("crossing")).toEqual(["SM_Env_Road_Crossing_01"]);
    // 063 A: one plain straight (Straight_01 is the translucent one), and the grate.
    expect(names("pavement")).toEqual(["SM_Env_Sidewalk_Straight_02", "SM_Env_Sidewalk_Grate_01"]);
    expect(names("pavementCorner")).toEqual(["SM_Env_Sidewalk_Dip_Corner_01"]);
    expect(names("kerbCut")).toEqual(["SM_Env_Sidewalk_Dip_01"]);
    expect(TILE_PATCH).toBe(`${TILE_PACK}:SM_Env_Road_Patch_01`);
  });

  it("shares Road_Bare_01 between a junction and a lot surface (the ticket's own design), the one plain straight between a pavement and a build-out, and no other key between roles", () => {
    const users = new Map<string, string[]>();
    for (const role of [...ROLES, ...INTERIOR]) for (const key of TILE_SLOTS[role]) users.set(key, [...(users.get(key) ?? []), role]);
    const shared = [...users].filter(([, roles]) => roles.length > 1);
    // 056 A and 063 A: a build-out is drawn from the one plain sidewalk straight, which it shares with the pavement. 057 D: the interiors share the bare road (a court's floor, a drive, an alley lane), the flat slab (an apron, a path, a park edge; 063 D: Sidewalk_01) and the parking lines (a court's stalls).
    expect(shared).toEqual([
      [`${TILE_PACK}:SM_Env_Road_ParkingLines_01`, ["parking", "court"]],
      [`${TILE_PACK}:SM_Env_Road_Bare_01`, ["junction", "lotSurface", "court", "drive", "alley"]],
      [`${TILE_PACK}:SM_Env_Sidewalk_Straight_02`, ["pavement", "buildout"]],
      [`${TILE_PACK}:SM_Env_Sidewalk_01`, ["apron", "greenPath", "parkEdge"]],
    ]);
  });
});

describe("levels and the draw-call cap", () => {
  it("puts the roads at the carriageway level, the pavements with their top at 0, and a parking lot's surface beside the pavement at 0", () => {
    for (const r of ["lane", "parking", "parkingPlain", "junction", "crossing"] as const) expect(TILE_LEVELS[r], r).toBe("carriage");
    for (const r of ["pavement", "pavementCorner", "kerbCut", "buildout", "plaza"] as const) expect(TILE_LEVELS[r], r).toBe("pavement");
    expect(TILE_LEVELS.lotSurface).toBe("ground");
  });

  it("measures the walk at 0.23 m and stands every sidewalk-family piece on the carriageway, so its walk is at 0 and the road is 0.23 m below it (E, criterion 28)", () => {
    expect(SIDEWALK_WALK_M).toBe(0.23);
    expect(Object.keys(TILE_WALK_M), "no key is more than 0.02 m off the common walk").toEqual([]);
    for (const role of ["lane", "parking", "parkingPlain", "junction", "crossing"] as const) expect(tileLevelY_m(role, TILE_SLOTS[role][0]), role).toBe(-SIDEWALK_WALK_M);
    for (const role of ["pavement", "pavementCorner", "kerbCut", "buildout", "plaza"] as const) expect(tileLevelY_m(role, TILE_SLOTS[role][0]), role).toBe(-0.23);
    expect(tileLevelY_m("lotSurface", TILE_SLOTS.lotSurface[0])).toBe(0);
    // A key with its own walk stands that far down; the table is read by key and never by prototype.
    const key = TILE_SLOTS.pavement[0]!;
    expect(tileWalkM(key)).toBe(0.23);
    expect(tileWalkM("constructor" as CalibrationKey)).toBe(0.23);
    expect(tileWalkM()).toBe(0.23);
  });

  it("stands the block interiors' ground at 0, flush with the walk: the plain slab 0.01 m down and the grass 0.11 m down so their own surfaces are at the walk (057 D, measured from the converted City Pack), everything else at its origin", () => {
    for (const r of INTERIOR) expect(TILE_LEVELS[r], r).toBe("ground");
    expect(TILE_BASE_M).toEqual({ [TILE_SLOTS.apron[0]!]: -0.01, [TILE_SLOTS.green[0]!]: -0.11 });
    expect(tileLevelY_m("apron", TILE_SLOTS.apron[0])).toBe(-0.01);
    expect(tileLevelY_m("greenPath", TILE_SLOTS.greenPath[0])).toBe(-0.01);
    expect(tileLevelY_m("parkEdge", TILE_SLOTS.parkEdge[0])).toBe(-0.01);
    expect(tileLevelY_m("green", TILE_SLOTS.green[0])).toBe(-0.11);
    for (const r of ["court", "drive", "alley"] as const) expect(tileLevelY_m(r, TILE_SLOTS[r][0]), r).toBe(0);
    expect(tileLevelY_m("court", TILE_SLOTS.court[1])).toBe(0);
    // A key that is not in the table (and a prototype name) stands at 0, as a lot surface does.
    expect(tileLevelY_m("green", "constructor" as CalibrationKey)).toBe(0);
    expect(tileLevelY_m("lotSurface", TILE_SLOTS.lotSurface[0])).toBe(0);
  });

  it("draws the apron, the paths and the park edge from the flat slab and not the plaza's Panel_01, whose +z kerb would drop 0.23 m every 5 m across an apron (057 D)", () => {
    // 063 D: the plain slab Sidewalk_01, not Panel_02 (inset service plates, which read as tree plots).
    expect(TILE_SLOTS.apron.map((k) => k.slice(TILE_PACK.length + 1))).toEqual(["SM_Env_Sidewalk_01"]);
    expect(TILE_SLOTS.greenPath).toEqual(TILE_SLOTS.apron);
    expect(TILE_SLOTS.parkEdge).toEqual(TILE_SLOTS.apron);
    expect(TILE_SLOTS.plaza.map((k) => k.slice(TILE_PACK.length + 1))).toEqual(["SM_Env_Sidewalk_Panel_01"]);
    expect(TILE_SLOTS.green.map((k) => k.slice(TILE_PACK.length + 1))).toEqual(["SM_Env_Grass_01"]);
    expect(TILE_SLOTS.court.map((k) => k.slice(TILE_PACK.length + 1))).toEqual(["SM_Env_Road_Bare_01", "SM_Env_Road_ParkingLines_01"]);
    expect(TILE_SLOTS.drive).toEqual(TILE_SLOTS.alley);
    for (const r of INTERIOR) expect(tileFront(TILE_SLOTS[r][0]!), r).toBe(0);
  });

  it("caps the tiles at 40 draw calls and the interiors at 24 more", () => {
    expect(TILE_DRAW_CALLS_MAX).toBe(40);
    expect(INTERIOR_DRAW_CALLS_MAX).toBe(24);
  });
});

// ---- TILE_FRONTS, pinned against what the converted City Pack geometry shows (read 18 Nov 2026) ----

type Side = "+x" | "-x" | "+z" | "-z";
const VEC: Record<Side, readonly [number, number]> = { "+x": [1, 0], "-x": [-1, 0], "+z": [0, 1], "-z": [0, -1] };
/** A vector (x, z) turned by `deg` as three's `rotation.y` turns it (a piece's local +z lands on (sin, cos)). */
const turned = ([x, z]: readonly [number, number], deg: number): [number, number] => {
  const t = (deg * Math.PI) / 180;
  return [Math.round(x * Math.cos(t) + z * Math.sin(t)), Math.round(-x * Math.sin(t) + z * Math.cos(t))];
};
const sideOf = (v: readonly [number, number]): Side => (v[0] === 1 ? "+x" : v[0] === -1 ? "-x" : v[1] === 1 ? "+z" : "-z");

/**
 * What each directional piece looks like in its own frame (turn 0), typed in from the converted geometry, and the frame it must be in once turned: in a cell's frame the street
 * runs along x and the front is +z (toward the centre line, the carriageway, or the walkers' direction, by role).
 * - `lines`: the axis the piece's lines, dashes or stripes run along. `dashed`: the side its dashed edge is on. `kerb`: the sides its kerb (the raised lip and the drop to the road) is on.
 */
interface Piece {
  key: string;
  lines?: "x" | "z";
  /** The side the yellow line is on (YellowLines pieces). */
  yellow?: Side;
  dashed?: Side;
  kerb?: readonly Side[];
  /** After the turn: the axis the lines must run along, the side the dashed edge must be on, the sides the kerb must be on. */
  want: { lines?: "x" | "z"; yellow?: Side; dashed?: Side; kerb?: readonly Side[] };
}
const PIECES: readonly Piece[] = [
  // Road pieces: the edge strips (Lines_01 at x = +-2.34; Lines_02 at +-2.36 and +-2.18) and Road_01's dashes (on its +x edge) all run along the piece's z.
  { key: "SM_Env_Road_Lines_01", lines: "z", want: { lines: "x" } },
  { key: "SM_Env_Road_Lines_02", lines: "z", want: { lines: "x" } },
  // The yellow pieces (E, 18 Nov 2026): one continuous strip 0.14 m in from the +x edge of _01 (x = 2.09..2.36) and from the -x edge of _02 (x = -2.36..-2.13); _02 has two dashes on its +x edge.
  // Turned, the yellow is on the front (+z: toward the centre line) for both, so two lanes lay their yellow strips side by side at the centre.
  { key: "SM_Env_Road_YellowLines_01", lines: "z", yellow: "+x", want: { lines: "x", yellow: "+z" } },
  { key: "SM_Env_Road_YellowLines_02", lines: "z", yellow: "-x", dashed: "+x", want: { lines: "x", yellow: "+z", dashed: "-z" } },
  { key: "SM_Env_Road_01", lines: "z", dashed: "+x", want: { lines: "x", dashed: "+z" } },
  // The parking lines: 10 m along x, bay dividers (at x = -5, -1.75, 1.6, 5) along z, so across the street.
  { key: "SM_Env_Road_ParkingLines_01", lines: "z", want: { lines: "z" } },
  // The zebra: bars 3 m long along x, 0.75 m wide and spaced along z: traffic along x, walkers along z.
  { key: "SM_Env_Road_Crossing_01", lines: "x", want: { lines: "x" } },
  // Pavements: the raised lip and the slope down to the road are on the +z edge. (063 A: Straight_01, the translucent one, is in no role.)
  { key: "SM_Env_Sidewalk_Straight_02", kerb: ["+z"], want: { kerb: ["+z"] } },
  { key: "SM_Env_Sidewalk_Grate_01", kerb: ["+z"], want: { kerb: ["+z"] } },
  { key: "SM_Env_Sidewalk_Dip_01", kerb: ["+z"], want: { kerb: ["+z"] } },
  { key: "SM_Env_Sidewalk_Panel_01", kerb: ["+z"], want: { kerb: ["+z"] } },
  // Corners: the dipped corner's kerb is on +x and +z; the plain corner's on -x and +z.
  { key: "SM_Env_Sidewalk_Dip_Corner_01", kerb: ["+x", "+z"], want: { kerb: ["+x", "+z"] } },
  { key: "SM_Env_Sidewalk_Corner_01", kerb: ["-x", "+z"], want: { kerb: ["+x", "+z"] } },
];

describe("TILE_FRONTS", () => {
  const keyOf = (name: string): CalibrationKey => `${TILE_PACK}:${name}`;

  it("turns every directional piece so the street runs along x, the dashed edge and the kerbs are on the front sides, and the parking dividers and zebra bars are where the city wants them", () => {
    const bad: string[] = [];
    for (const p of PIECES) {
      const deg = tileFront(keyOf(p.key));
      if (p.lines !== undefined && p.want.lines !== undefined) {
        const after = sideOf(turned(p.lines === "x" ? [1, 0] : [0, 1], deg));
        if (after.slice(1) !== p.want.lines) bad.push(`${p.key}: lines run along ${after.slice(1)} after turn ${deg}, want ${p.want.lines}`);
      }
      if (p.yellow !== undefined && p.want.yellow !== undefined) {
        const after = sideOf(turned(VEC[p.yellow], deg));
        if (after !== p.want.yellow) bad.push(`${p.key}: yellow edge on ${after} after turn ${deg}, want ${p.want.yellow}`);
      }
      if (p.dashed !== undefined && p.want.dashed !== undefined) {
        const after = sideOf(turned(VEC[p.dashed], deg));
        if (after !== p.want.dashed) bad.push(`${p.key}: dashed edge on ${after} after turn ${deg}, want ${p.want.dashed}`);
      }
      if (p.kerb !== undefined && p.want.kerb !== undefined) {
        const after = p.kerb.map((s) => sideOf(turned(VEC[s], deg))).sort();
        if (after.join() !== [...p.want.kerb].sort().join()) bad.push(`${p.key}: kerb on ${after.join()} after turn ${deg}, want ${p.want.kerb.join()}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("holds exactly the lines the pieces above need: the road pieces whose lines run along z (270, and 90 for the second yellow piece, whose yellow is on its -x edge) and the plain corner (90), and nothing else", () => {
    expect({ ...TILE_FRONTS }).toEqual({
      [keyOf("SM_Env_Road_YellowLines_01")]: 270,
      [keyOf("SM_Env_Road_YellowLines_02")]: 90,
      [keyOf("SM_Env_Road_Lines_01")]: 270,
      [keyOf("SM_Env_Road_Lines_02")]: 270,
      [keyOf("SM_Env_Road_01")]: 270,
      [keyOf("SM_Env_Sidewalk_Corner_01")]: 90,
    });
    for (const p of PIECES) expect(tileKeys(), p.key).toContain(keyOf(p.key));
    // Every key with a line is described above, so no line goes unpinned.
    for (const k of Object.keys(TILE_FRONTS)) expect(PIECES.map((p) => keyOf(p.key)), k).toContain(k);
  });

  it("does not turn a piece with no line, and reads a line when the table has one", () => {
    expect(tileFront(TILE_SLOTS.pavement[0]!)).toBe(0);
    const key = TILE_SLOTS.pavement[0]!;
    expect(tileFront(key, { [key]: 180 })).toBe(180);
    expect(tileFront(TILE_SLOTS.lane[0]!, { [key]: 180 })).toBe(0);
    for (const [k, v] of Object.entries(TILE_FRONTS)) {
      expect(tileKeys(), k).toContain(k);
      expect([0, 90, 180, 270], k).toContain(v);
    }
  });

  it("agrees with the converted City Pack geometry when this machine has it (skipped when it does not)", () => {
    const file = join("assets", "private", "out", "city-pack.glb");
    if (!existsSync(file)) return;
    const glb = readFileSync(file);
    const jsonLen = glb.readUInt32LE(12);
    const gltf = JSON.parse(glb.subarray(20, 20 + jsonLen).toString("utf8")) as {
      nodes: { name?: string; mesh?: number; children?: number[] }[];
      meshes: { primitives: { attributes: { POSITION: number } }[] }[];
      accessors: { bufferView: number; byteOffset?: number; count: number }[];
      bufferViews: { byteOffset?: number; byteStride?: number }[];
    };
    const bin = glb.subarray(20 + jsonLen + 8);
    type V3 = [number, number, number];
    const vertices = (name: string): V3[] => {
      const root = gltf.nodes.find((n) => n.name === name);
      expect(root, name).toBeDefined();
      const out: V3[] = [];
      const walk = (n: { mesh?: number; children?: number[] }): void => {
        for (const prim of n.mesh !== undefined ? gltf.meshes[n.mesh]!.primitives : []) {
          const a = gltf.accessors[prim.attributes.POSITION]!;
          const bv = gltf.bufferViews[a.bufferView]!;
          const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
          for (let i = 0; i < a.count; i++) {
            const at = base + i * (bv.byteStride ?? 12);
            out.push([bin.readFloatLE(at), bin.readFloatLE(at + 4), bin.readFloatLE(at + 8)]);
          }
        }
        for (const c of n.children ?? []) walk(gltf.nodes[c]!);
      };
      walk(root!);
      return out;
    };
    const spread = (xs: number[]): number => (xs.length === 0 ? 0 : Math.max(...xs) - Math.min(...xs));
    const bad: string[] = [];
    for (const name of ["SM_Env_Road_Lines_01", "SM_Env_Road_Lines_02", "SM_Env_Road_01"]) {
      const v = vertices(name);
      // Marks near the x edges reach along z; there are none near the z edges reaching along x.
      const alongZ = spread(v.filter((p) => Math.abs(p[0]) > 2.2 && Math.abs(p[0]) < 2.45).map((p) => p[2]));
      const alongX = spread(v.filter((p) => Math.abs(p[2]) > 2.2 && Math.abs(p[2]) < 2.45).map((p) => p[0]));
      if (!(alongZ >= 3.5 && alongX < 1)) bad.push(`${name}: marks run ${alongZ.toFixed(2)} m along z and ${alongX.toFixed(2)} m along x`);
    }
    {
      const v = vertices("SM_Env_Road_ParkingLines_01");
      if (Math.abs(spread(v.map((p) => p[0])) - 10) > 0.01 || Math.abs(spread(v.map((p) => p[2])) - 5) > 0.01) bad.push("ParkingLines is not 10 x 5 m");
      // Dividers have vertices at both z edges, away from the x ends.
      const ends = v.filter((p) => Math.abs(Math.abs(p[2]) - 2.5) < 0.01 && Math.abs(p[0]) < 4.5).length;
      if (ends < 6) bad.push(`ParkingLines has ${ends} divider ends on its z edges`);
    }
    // The lowest vertex height in a band along a tile edge (0.05 to 0.7 m in): the walking surface is 0.23 m and the kerb face drops to 0.00 m, so below 0.05 m means the kerb is on that side.
    const lowest = (name: string, pick: (p: V3) => boolean): number => Math.min(...vertices(name).filter(pick).map((p) => p[1]));
    for (const name of ["SM_Env_Sidewalk_Straight_01", "SM_Env_Sidewalk_Straight_02", "SM_Env_Sidewalk_Grate_01", "SM_Env_Sidewalk_Dip_01", "SM_Env_Sidewalk_Panel_01"]) {
      if (!(lowest(name, (p) => p[2] > 1.8 && p[2] < 2.45) < 0.05)) bad.push(`${name}: no drop on +z`);
      const others: [string, (p: V3) => boolean][] = [
        ["-z", (p) => p[2] < -1.8 && p[2] > -2.45 && Math.abs(p[0]) < 1.5],
        ["+x", (p) => p[0] > 1.8 && p[0] < 2.45 && Math.abs(p[2]) < 1.5],
        ["-x", (p) => p[0] < -1.8 && p[0] > -2.45 && Math.abs(p[2]) < 1.5],
      ];
      for (const [label, pick] of others) if (lowest(name, pick) < 0.05) bad.push(`${name}: drop on ${label}`);
    }
    // Corners: the road-level vertices (the gutter) lie along one diagonal, perpendicular to the diagonal the kerb corner points along, and a little toward the kerb corner.
    const gutter = (name: string): { diagonal: number; x: number; z: number } => {
      const low = vertices(name).filter((p) => p[1] < 0.05);
      const sum = low.reduce((acc, p) => ({ x: acc.x + p[0], z: acc.z + p[2], d: acc.d + Math.sign(p[0] * p[2]) }), { x: 0, z: 0, d: 0 });
      return { diagonal: sum.d, x: sum.x / low.length, z: sum.z / low.length };
    };
    // The yellow strip is the one whose vertices span the whole piece along z at 2.05 to 2.40 m from the centre line's side (the dashes of _02 span 3.76 m): +x for _01, -x for _02.
    for (const [name, want] of [["SM_Env_Road_YellowLines_01", 1], ["SM_Env_Road_YellowLines_02", -1]] as const) {
      const v = vertices(name);
      const strip = (sign: 1 | -1): number => spread(v.filter((p) => p[0] * sign > 2.05 && p[0] * sign < 2.4).map((p) => p[2]));
      if (!(strip(want) > 4.9 && strip(-want as 1 | -1) < 4.9)) bad.push(`${name}: yellow strip spans ${strip(1).toFixed(2)} m at +x and ${strip(-1).toFixed(2)} m at -x, want it on ${want > 0 ? "+x" : "-x"}`);
    }
    const dipCorner = gutter("SM_Env_Sidewalk_Dip_Corner_01");
    if (!(dipCorner.diagonal < 0 && dipCorner.x > 0 && dipCorner.z > 0)) bad.push(`Dip_Corner gutter ${JSON.stringify(dipCorner)}: want along (+x,-z), toward +x +z`);
    const plainCorner = gutter("SM_Env_Sidewalk_Corner_01");
    if (!(plainCorner.diagonal > 0 && plainCorner.x < 0 && plainCorner.z > 0)) bad.push(`Corner gutter ${JSON.stringify(plainCorner)}: want along (+x,+z), toward -x +z`);
    expect(bad).toEqual([]);
  });
});

describe("the build-out's pieces and its trees (056 B)", () => {
  it("draws a build-out from the pavement's one plain straight, with no front line of its own (the unturned straights' kerb is on +z, the cell's yaw turns it to the lane)", () => {
    expect(TILE_SLOTS.buildout).toEqual(TILE_SLOTS.pavement.slice(0, 1));
    for (const key of TILE_SLOTS.buildout) expect(tileFront(key), key).toBe(0);
    expect(TILE_FRONT_TEXT.buildout).toContain("carriageway");
    expect(TILE_LEVELS.buildout).toBe("pavement");
  });

  it("names the three street trees of the City Pack, as furniture's TREES does, and keeps them off the sheet and out of the loaded tile keys", () => {
    expect(TILE_TREES.map((k) => k.slice(TILE_PACK.length + 1))).toEqual(["SM_Env_Tree_01", "SM_Env_Tree_02", "SM_Env_Tree_03"]);
    expect([...TILE_TREES]).toEqual([...TREES]);
    for (const key of TILE_TREES) expect(tileKeys()).not.toContain(key);
    for (const p of sheetPieces()) expect(TILE_TREES).not.toContain(p.key);
  });

  it("says in the legend what a build-out is, in a line of at most SHEET_LEGEND_CHARS, and notes it on its pieces' labels in both sheet shapes", () => {
    expect(SHEET_LEGEND.some((l) => l.startsWith("build-out"))).toBe(true);
    const straight = TILE_SLOTS.buildout[0]!;
    expect(sheetLabel(straight, true, undefined, ["pavement", "buildout"])).toEqual(["Straight_02", `turn 0 ${SHEET_BUILDOUT_NOTE}`]);
    expect(sheetLabel(straight, false, undefined, ["pavement", "buildout"])).toEqual(["Straight_02", "NOT IN PACK"]);
    const lines = sheetLegend(true, [{ key: straight, present: true, roles: ["pavement", "buildout"] }, { key: TILE_SLOTS.lane[0]!, present: true, roles: ["lane"] }]);
    expect(lines[SHEET_LEGEND.length]).toBe(`1 Straight_02 turn 0 ${SHEET_BUILDOUT_NOTE}`);
    expect(lines[SHEET_LEGEND.length + 1]).toBe("2 YellowLines_01 turn 270");
    for (const l of lines) expect(l.length, l).toBeLessThanOrEqual(SHEET_LEGEND_CHARS);
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
    expect(bare.roles).toEqual(["junction", "lotSurface", "court", "drive", "alley"]);
    expect(pieces.filter((p) => p.cells === 2).map((p) => p.key)).toEqual([TILE_SLOTS.parking[0]]);
    expect(pieces.filter((p) => p.roles.length === 0).map((p) => p.key)).toEqual([...TILE_SHEET_EXTRA]);
    for (const role of [...ROLES, ...INTERIOR]) expect(TILE_FRONT_TEXT[role].length, role).toBeGreaterThan(0);
  });
});

describe("the sheet's names, legend and grid (E, criterion 30)", () => {
  const pieces = sheetPieces();

  it("shortens a name to at most 15 characters, without the family, and keeps Road_01 whole", () => {
    expect(sheetShortName(TILE_SLOTS.pavementCorner[0]!)).toBe("Dip_Corner_01");
    expect(sheetShortName(TILE_SLOTS.lane[0]!)).toBe("YellowLines_01");
    expect(sheetShortName(TILE_SLOTS.parkingPlain[0]!)).toBe("Road_01");
    expect(sheetShortName(TILE_PATCH)).toBe("Patch_01");
    for (const p of pieces) expect(sheetShortName(p.key).length, p.key).toBeLessThanOrEqual(15);
  });

  it("labels a piece with its name and its turn, or says it is missing", () => {
    const key = TILE_SLOTS.lane[1]!;
    expect(sheetLabel(key, true)).toEqual(["YellowLines_02", "turn 90"]);
    expect(sheetLabel(key, true, { [key]: 180 })).toEqual(["YellowLines_02", "turn 180"]);
    expect(sheetLabel(key, false)).toEqual(["YellowLines_02", "NOT IN PACK"]);
  });

  it("opens the legend with what each kind of piece must show, in lines of at most SHEET_LEGEND_CHARS, and lists every piece after it in a numbered sheet", () => {
    for (const l of SHEET_LEGEND) expect(l.length, l).toBeLessThanOrEqual(SHEET_LEGEND_CHARS);
    expect(SHEET_LEGEND.join(" ")).toContain("yellow");
    expect(SHEET_LEGEND.join(" ")).toContain("TILE_FRONTS");
    const have = pieces.map((p, i) => ({ key: p.key, present: i !== 2 }));
    expect(sheetLegend(false, have)).toEqual([...SHEET_LEGEND]);
    const numbered = sheetLegend(true, have);
    expect(numbered.slice(0, SHEET_LEGEND.length)).toEqual([...SHEET_LEGEND]);
    expect(numbered).toHaveLength(SHEET_LEGEND.length + pieces.length);
    expect(numbered[SHEET_LEGEND.length]).toBe("1 YellowLines_01 turn 270");
    expect(numbered[SHEET_LEGEND.length + 2]).toBe("3 ParkingLines_01 NOT IN PACK");
    for (const l of numbered.slice(SHEET_LEGEND.length)) expect(l.length, l).toBeLessThanOrEqual(SHEET_LEGEND_CHARS);
  });

  it("lays the pieces on a grid, not a row: five columns in a wide window (four until 057 D added two pieces: a fifth row), three (numbered) in a tall one, at least one cell of ground between any two pieces", () => {
    expect(SHEET_WIDE_ASPECT).toBe(1.25);
    expect(sheetColumns(16 / 9)).toBe(5);
    expect(sheetColumns(390 / 844)).toBe(3);
    expect(sheetColumns(1)).toBe(3);
    expect(sheetColumns(SHEET_WIDE_ASPECT)).toBe(5);
    for (const aspect of [16 / 9, 390 / 844, 1, 4 / 3]) {
      const L = sheetLayout(aspect);
      expect(L.slots).toHaveLength(pieces.length);
      expect(L.rows).toBe(Math.ceil(pieces.length / L.cols));
      expect(L.rows, "a grid").toBeGreaterThan(1);
      expect(L.numbered).toBe(aspect < SHEET_WIDE_ASPECT);
      L.slots.forEach((s, i) => expect(s.piece.key).toBe(pieces[i]!.key));
      // The footprints are TILE_M by TILE_M, or twice that along x for the parking lines.
      const box = (s: (typeof L.slots)[number]): { x0: number; x1: number; z0: number; z1: number } => ({ x0: s.x_m - (s.piece.cells * TILE_M) / 2, x1: s.x_m + (s.piece.cells * TILE_M) / 2, z0: s.z_m - TILE_M / 2, z1: s.z_m + TILE_M / 2 });
      for (let i = 0; i < L.slots.length; i++) {
        for (let j = i + 1; j < L.slots.length; j++) {
          const a = box(L.slots[i]!);
          const b = box(L.slots[j]!);
          const gapX = Math.max(b.x0 - a.x1, a.x0 - b.x1);
          const gapZ = Math.max(b.z0 - a.z1, a.z0 - b.z1);
          expect(Math.max(gapX, gapZ), `${aspect}: ${i} and ${j}`).toBeGreaterThanOrEqual(TILE_M - 1e-9);
        }
      }
      // The frame holds every piece.
      for (const s of L.slots) {
        const b = box(s);
        expect(b.x0).toBeGreaterThanOrEqual(L.frame_m.minX);
        expect(b.x1).toBeLessThanOrEqual(L.frame_m.maxX);
        expect(b.z0).toBeGreaterThanOrEqual(L.frame_m.minZ);
        expect(b.z1).toBeLessThanOrEqual(L.frame_m.maxZ);
      }
    }
    expect(SHEET_SHAPES.wide.cols).toBe(5);
    expect(SHEET_SHAPES.tall.cols).toBe(3);
  });

  it("is about square in a wide window (the grid's frame is within 1.5 : 1)", () => {
    const f = sheetLayout(16 / 9).frame_m;
    const ratio = (f.maxX - f.minX) / (f.maxZ - f.minZ);
    expect(ratio).toBeGreaterThan(1 / 1.5);
    expect(ratio).toBeLessThan(1.5);
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

// ---- ticket 063 A, D and H: one sidewalk colour, plain interior paving, paved inlets ----

const GLB_FILE = join("assets", "private", "out", "city-pack.glb");
const haveGlb = existsSync(GLB_FILE);
const PLAIN_STRAIGHT: CalibrationKey = `${TILE_PACK}:SM_Env_Sidewalk_Straight_02`;
const GRATE: CalibrationKey = `${TILE_PACK}:SM_Env_Sidewalk_Grate_01`;
const SLAB: CalibrationKey = `${TILE_PACK}:SM_Env_Sidewalk_01`;

describe("one sidewalk colour (063 A, Josh, 19 Nov 2026: \"Make the side walk one uniform color.\")", () => {
  /** The plain walking pieces of the two roles: every key of a role that is not the grate. A city with more than one would draw two shades. */
  const plainKeys = (slots: { pavement: readonly CalibrationKey[]; buildout: readonly CalibrationKey[] }): CalibrationKey[] => [...new Set([...slots.pavement, ...slots.buildout])].filter((k) => k !== GRATE);

  it("draws every plain pavement and build-out cell from the one straight, Straight_02, and keeps the grate; Straight_01 is in no role and is not loaded", () => {
    expect(TILE_SLOTS.pavement).toEqual([PLAIN_STRAIGHT, GRATE]);
    expect(TILE_SLOTS.buildout).toEqual([PLAIN_STRAIGHT]);
    expect(plainKeys(TILE_SLOTS)).toEqual([PLAIN_STRAIGHT]);
    const straight01 = `${TILE_PACK}:SM_Env_Sidewalk_Straight_01`;
    expect(tileKeys()).not.toContain(straight01);
    for (const keys of Object.values(TILE_SLOTS)) expect(keys).not.toContain(straight01);
    for (const keys of Object.values(INTERIOR_KEYS)) expect(keys).not.toContain(straight01);
    for (const p of sheetPieces()) expect(p.key).not.toBe(straight01);
  });

  it("fails a fixture of the slots as they were (two plain straights, one of them the translucent Straight_01)", () => {
    const straight01: CalibrationKey = `${TILE_PACK}:SM_Env_Sidewalk_Straight_01`;
    const before = { pavement: [straight01, PLAIN_STRAIGHT, GRATE], buildout: [straight01, PLAIN_STRAIGHT] };
    expect(plainKeys(before)).toHaveLength(2);
  });
});

describe("plain interior paving (063 D)", () => {
  it("lays the apron, the paths, the park edges and the ring-2 strip from Sidewalk_01, and the passage floors from the same key", () => {
    for (const kind of ["apron", "path", "parkEdge", "strip"] as const) expect(INTERIOR_KEYS[kind], kind).toEqual([SLAB]);
    expect(TILE_SLOTS.apron).toEqual([SLAB]);
    expect(TILE_SLOTS.greenPath).toEqual([SLAB]);
    expect(TILE_SLOTS.parkEdge).toEqual([SLAB]);
    expect(PASSAGE_FLOOR_KEYS).toEqual([SLAB]);
    expect(tileKeys()).toContain(SLAB);
    expect(tileKeys()).not.toContain(`${TILE_PACK}:SM_Env_Sidewalk_Panel_02`);
    for (const keys of Object.values(INTERIOR_KEYS)) expect(keys).not.toContain(`${TILE_PACK}:SM_Env_Sidewalk_Panel_02`);
  });

  it("pins the slab's base at 0.01 m below its origin (measured 19 Nov 2026: its largest up-facing level is 0.01 m up), and it has no front", () => {
    expect(TILE_BASE_M[SLAB]).toBe(-0.01);
    expect(tileFront(SLAB)).toBe(0);
  });

  it("cuts a passage floor into whole 5 m cells and part cells that together are the floor, scaling nothing", () => {
    const area = (r: { w_m: number; d_m: number }): number => r.w_m * r.d_m;
    const cases = [
      { x_m: 42.5, z_m: 12.5, w_m: 3.7, d_m: TILE_M },
      { x_m: 50, z_m: 12.5, w_m: 5, d_m: TILE_M },
      { x_m: 50.1, z_m: 12.5, w_m: 5.2, d_m: TILE_M },
      { x_m: 55, z_m: 12.5, w_m: 12.6, d_m: TILE_M },
      { x_m: 60, z_m: 7, w_m: 11, d_m: 12 },
      { x_m: 60, z_m: 3, w_m: 11, d_m: 3 },
    ];
    for (const f of cases) {
      const cut = passageFloorCells(f);
      const total = cut.whole.length * TILE_M * TILE_M + cut.part.reduce((s, r) => s + area(r), 0);
      expect(total, JSON.stringify(f)).toBeCloseTo(area(f), 9);
      // Every whole cell is inside the floor.
      for (const c of cut.whole) {
        expect(c.x_m - TILE_M / 2).toBeGreaterThanOrEqual(f.x_m - f.w_m / 2 - 1e-9);
        expect(c.x_m + TILE_M / 2).toBeLessThanOrEqual(f.x_m + f.w_m / 2 + 1e-9);
        expect(c.z_m - TILE_M / 2).toBeGreaterThanOrEqual(f.z_m - f.d_m / 2 - 1e-9);
        expect(c.z_m + TILE_M / 2).toBeLessThanOrEqual(f.z_m + f.d_m / 2 + 1e-9);
      }
    }
    expect(passageFloorCells(cases[0]!).whole).toEqual([]);
    expect(passageFloorCells(cases[0]!).part).toEqual([cases[0]]);
    expect(passageFloorCells(cases[1]!).whole).toEqual([{ x_m: 50, z_m: 12.5 }]);
    expect(passageFloorCells(cases[1]!).part).toEqual([]);
    expect(passageFloorCells(cases[3]!).whole).toHaveLength(2);
    expect(passageFloorCells(cases[3]!).part).toHaveLength(1);
    expect(passageFloorCells(cases[5]!).whole, "a floor under a cell deep has no whole cell").toEqual([]);
  });
});

describe("the paved inlets' cells (063 H)", () => {
  const cities = [tileCity(), ...[1, 2, 3, 4, 5].map((seed) => tileCity({ blocksX: 3, blocksZ: 3, seed })), tileCity({ blocksX: 6, blocksZ: 4, seed: 1 })];

  it("are the two cells of every street court's drive and the first and last cell of every alley's lane, nothing else", () => {
    let drives = 0;
    let mouths = 0;
    for (const city of cities) {
      const got = inletCells(city);
      const want = city.courts.filter((c) => !c.street.startsWith("alley:")).flatMap((c) => c.drive.map((q) => `${q.i},${q.j}`));
      expect(got.drives.map((q) => `${q.i},${q.j}`)).toEqual(want);
      expect(want.length % 2).toBe(0);
      drives += want.length;
      const alleys = city.blocks.filter((b) => b.alley !== null);
      expect(got.mouths).toHaveLength(2 * alleys.length);
      mouths += got.mouths.length;
      // Every mouth cell is an alley lane cell of the interior, and every drive cell is a lot cell of the street layer.
      const lane = new Set(city.interior.filter((c) => c.role === "alley").map((c) => `${c.i},${c.j}`));
      for (const q of got.mouths) expect(lane.has(`${q.i},${q.j}`), `${q.i},${q.j}`).toBe(true);
      const lot = new Set(city.cells.filter((c) => c.role === "lotSurface").map((c) => `${c.i},${c.j}`));
      for (const q of got.drives) expect(lot.has(`${q.i},${q.j}`), `${q.i},${q.j}`).toBe(true);
    }
    expect(drives).toBeGreaterThan(20);
    expect(mouths).toBeGreaterThan(4);
  });

  it("leave a court's stalls and aisle, and an alley block's own court, as they are: none is an inlet cell", () => {
    for (const city of cities) {
      const inlet = new Set([...inletCells(city).drives, ...inletCells(city).mouths].map((q) => `${q.i},${q.j}`));
      for (const court of city.courts) {
        for (const pair of [court.stallsNear, court.aisle, court.stallsFar]) for (const q of pair) expect(inlet.has(`${q.i},${q.j}`), `${court.run}`).toBe(false);
        if (court.street.startsWith("alley:")) for (const q of court.drive) expect(inlet.has(`${q.i},${q.j}`), "an alley court's drive").toBe(false);
      }
    }
  });
});

describe("the converted City Pack agrees with 063's pieces when this machine has it (skipped when it does not)", () => {
  interface Prim {
    pts: [number, number, number][];
    tris: number[][];
    material: { name: string; alphaMode: string };
  }
  /** Reads the GLB lazily, inside the test (never at describe level). */
  const readPack = (): { prims: (name: string) => Prim[] } => {
    const glb = readFileSync(GLB_FILE);
    const jsonLen = glb.readUInt32LE(12);
    const gltf = JSON.parse(glb.subarray(20, 20 + jsonLen).toString("utf8")) as {
      nodes: { name?: string; mesh?: number; children?: number[] }[];
      meshes: { primitives: { attributes: { POSITION: number }; indices?: number; material?: number }[] }[];
      materials: { name?: string; alphaMode?: string }[];
      accessors: { bufferView: number; byteOffset?: number; count: number; componentType: number }[];
      bufferViews: { byteOffset?: number; byteStride?: number }[];
    };
    const bin = glb.subarray(20 + jsonLen + 8);
    const prims = (name: string): Prim[] => {
      const root = gltf.nodes.find((n) => n.name === name);
      expect(root, name).toBeDefined();
      const out: Prim[] = [];
      const walk = (n: { mesh?: number; children?: number[] }): void => {
        for (const prim of n.mesh !== undefined ? gltf.meshes[n.mesh]!.primitives : []) {
          const a = gltf.accessors[prim.attributes.POSITION]!;
          const bv = gltf.bufferViews[a.bufferView]!;
          const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
          const pts: [number, number, number][] = [];
          for (let i = 0; i < a.count; i++) {
            const at = base + i * (bv.byteStride ?? 12);
            pts.push([bin.readFloatLE(at), bin.readFloatLE(at + 4), bin.readFloatLE(at + 8)]);
          }
          const tris: number[][] = [];
          const ia = gltf.accessors[prim.indices!]!;
          const ib = gltf.bufferViews[ia.bufferView]!;
          const at0 = (ib.byteOffset ?? 0) + (ia.byteOffset ?? 0);
          for (let i = 0; i + 2 < ia.count; i += 3) tris.push([0, 1, 2].map((k) => (ia.componentType === 5125 ? bin.readUInt32LE(at0 + (i + k) * 4) : bin.readUInt16LE(at0 + (i + k) * 2))));
          const m = gltf.materials[prim.material ?? 0] ?? {};
          out.push({ pts, tris, material: { name: m.name ?? "", alphaMode: m.alphaMode ?? "OPAQUE" } });
        }
        for (const c of n.children ?? []) walk(gltf.nodes[c]!);
      };
      walk(root!);
      return out;
    };
    return { prims };
  };
  const nameOf = (key: CalibrationKey): string => key.slice(key.indexOf(":") + 1);
  /** The up-facing area (m2) of a piece by the height of its triangles' centres, in centimetre bins. */
  const upAreas = (ps: Prim[]): Map<number, number> => {
    const area = new Map<number, number>();
    for (const { pts, tris } of ps) {
      for (const [a, b, c] of tris) {
        const [p, q, r] = [pts[a!]!, pts[b!]!, pts[c!]!];
        const u = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
        const v = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
        const n = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
        const len = Math.hypot(n[0]!, n[1]!, n[2]!);
        if (len < 1e-12 || n[1]! / len < 0.9) continue;
        const y = Math.round(((p[1] + q[1] + r[1]) / 3) * 100) / 100;
        area.set(y, (area.get(y) ?? 0) + len / 2);
      }
    }
    return area;
  };
  const topOf = (area: Map<number, number>): number => [...area].sort((x, y) => y[1] - x[1])[0]![0];
  /** The up-facing area more than 0.02 m below the piece's top level (an inset plate or a sunk panel). */
  const sunkArea = (area: Map<number, number>): number => {
    const top = topOf(area);
    return [...area].filter(([y]) => top - y > 0.02 + 1e-9).reduce((s, [, a]) => s + a, 0);
  };

  it.skipIf(!haveGlb)("has no see-through piece: every key the tiles and the interiors load has only materials whose alphaMode is not BLEND", { timeout: 120000 }, () => {
    const { prims } = readPack();
    const bad: string[] = [];
    const keys = new Set<CalibrationKey>([...tileKeys(), ...Object.values(INTERIOR_KEYS).flat()]);
    expect(keys.size).toBeGreaterThan(15);
    for (const key of keys) {
      const ps = prims(nameOf(key));
      expect(ps.length, key).toBeGreaterThan(0);
      for (const p of ps) if (p.material.alphaMode === "BLEND") bad.push(`${key}: ${p.material.name} is BLEND`);
    }
    expect(bad).toEqual([]);
  });

  it.skipIf(!haveGlb)("stands Sidewalk_01's largest up-facing level within 0.01 m of TILE_BASE_M's, and has no inset plate (nothing more than 0.02 m below its top covers over 0.1 m2), where Panel_02 has", { timeout: 120000 }, () => {
    const { prims } = readPack();
    for (const kind of ["apron", "path", "parkEdge", "strip"] as const) {
      for (const key of INTERIOR_KEYS[kind]) {
        const area = upAreas(prims(nameOf(key)));
        expect(Math.abs(topOf(area) + (TILE_BASE_M[key] ?? 0)), `${key}: top ${topOf(area)}`).toBeLessThanOrEqual(0.01);
        expect(sunkArea(area), `${key}: a sunk plate`).toBeLessThanOrEqual(0.1);
      }
    }
    // The check bites: the piece 063 D replaced has two plates 0.04 m below its slab, 3.8 m2 in all.
    expect(sunkArea(upAreas(prims("SM_Env_Sidewalk_Panel_02")))).toBeGreaterThan(0.1);
  });
});
