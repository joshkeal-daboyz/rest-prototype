/**
 * Ticket 055 C, the pure half: `tileslots.ts` (which City Pack piece draws each tile role, the turn of each piece, the levels, the draw-call cap, the page's flags and the sheet's list).
 * No three, no WebGL, no assets. Files read: this folder's own source, and (inside one `it`, skipped when absent) the converted City Pack GLB.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CalibrationKey } from "../core";
import { CITY_BLOCKS_DEFAULT, CITY_BLOCKS_MAX, type TileRole } from "./tilecity";
import { SIDEWALK_WALK_M, TILE_M } from "./tilecity";
import {
  SHEET_LEGEND,
  SHEET_LEGEND_CHARS,
  SHEET_SHAPES,
  SHEET_WIDE_ASPECT,
  TILE_DRAW_CALLS_MAX,
  TILE_FRONTS,
  TILE_FRONT_TEXT,
  TILE_LEVELS,
  TILE_PACK,
  TILE_PATCH,
  TILE_SHEET_EXTRA,
  TILE_SLOTS,
  TILE_WALK_M,
  cityTilesRequested,
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
    // E, Q8 (Josh, 18 Nov 2026): the yellow pieces carry the centre line; the white ones (no centre mark) moved to the sheet's extras.
    expect(names("lane")).toEqual(["SM_Env_Road_YellowLines_01", "SM_Env_Road_YellowLines_02"]);
    expect(TILE_SHEET_EXTRA).toContain(`${TILE_PACK}:SM_Env_Road_Lines_01`);
    expect(TILE_SHEET_EXTRA).toContain(`${TILE_PACK}:SM_Env_Road_Lines_02`);
    expect(names("parking")).toEqual(["SM_Env_Road_ParkingLines_01"]);
    expect(names("parkingPlain")).toEqual(["SM_Env_Road_01"]);
    expect(names("junction")).toEqual(["SM_Env_Road_Bare_01"]);
    expect(names("crossing")).toEqual(["SM_Env_Road_Crossing_01"]);
    expect(names("pavement")).toEqual(["SM_Env_Sidewalk_Straight_01", "SM_Env_Sidewalk_Straight_02", "SM_Env_Sidewalk_Grate_01"]);
    expect(names("pavementCorner")).toEqual(["SM_Env_Sidewalk_Dip_Corner_01"]);
    expect(names("kerbCut")).toEqual(["SM_Env_Sidewalk_Dip_01"]);
    expect(TILE_PATCH).toBe(`${TILE_PACK}:SM_Env_Road_Patch_01`);
  });

  it("shares Road_Bare_01 between a junction and a lot surface (the ticket's own design), the two plain straights between a pavement and a build-out, and no other key between roles", () => {
    const users = new Map<string, TileRole[]>();
    for (const role of ROLES) for (const key of TILE_SLOTS[role]) users.set(key, [...(users.get(key) ?? []), role]);
    const shared = [...users].filter(([, roles]) => roles.length > 1);
    // 056 A: a build-out is drawn from the two plain sidewalk straights, which it shares with the pavement.
    expect(shared).toEqual([
      [`${TILE_PACK}:SM_Env_Road_Bare_01`, ["junction", "lotSurface"]],
      [`${TILE_PACK}:SM_Env_Sidewalk_Straight_01`, ["pavement", "buildout"]],
      [`${TILE_PACK}:SM_Env_Sidewalk_Straight_02`, ["pavement", "buildout"]],
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

  it("caps the tiles at 40 draw calls", () => {
    expect(TILE_DRAW_CALLS_MAX).toBe(40);
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
  // Pavements: the raised lip and the slope down to the road are on the +z edge.
  { key: "SM_Env_Sidewalk_Straight_01", kerb: ["+z"], want: { kerb: ["+z"] } },
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

  it("lays the pieces on a grid, not a row: four columns in a wide window, three (numbered) in a tall one, at least one cell of ground between any two pieces", () => {
    expect(SHEET_WIDE_ASPECT).toBe(1.25);
    expect(sheetColumns(16 / 9)).toBe(4);
    expect(sheetColumns(390 / 844)).toBe(3);
    expect(sheetColumns(1)).toBe(3);
    expect(sheetColumns(SHEET_WIDE_ASPECT)).toBe(4);
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
    expect(SHEET_SHAPES.wide.cols).toBe(4);
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
