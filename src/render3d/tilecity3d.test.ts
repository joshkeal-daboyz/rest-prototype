/**
 * Ticket 055 C: the tile city, drawn (`tilecity3d.ts`, `tileslots.ts`, the tile keys of `models3d.ts`, the dev-only branch of `renderer.ts`). No WebGL: every GLB is a fake group
 * (a one-box mesh per tile key, an empty node per stack piece) and every size is a number typed in from the converted City Pack manifest (18 Nov 2026: tiles 5 x 0 x 5, the parking
 * lines 10 x 0 x 5, sidewalks 5 x 0.30 x 5). Nothing here reads assets/private/ except inside an `it` that skips when the manifest is absent; no timer, no path but forward slashes.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Sprite, Vector3, type Object3D } from "three";
import { ASSET_MANIFEST_VERSION, loadPuzzle, type AssetEntry, type AssetManifest, type CalibrationKey } from "../core";
import { createGalleryRig } from "./gallery";
import { WORLD_PER_METRE } from "./models";
import { NO_MODELS, allStackKeys, applyModels, loadModels, stackInput, tileInput, type ModelSet } from "./models3d";
import { packTown } from "./terrace";
import { STACK_STYLES } from "./stacks";
import { LANE_PATCH, LANE_RIGHT, PAVEMENT_GRATE, PAVEMENT_STRAIGHT_2, SIDEWALK_TOP_M, TILE_M, tileCity, type TileCell, type TileCity, type TileRole } from "./tilecity";
import { buildCityScene, buildSheetScene, cellFootprint, createCityRig, kerbStrips, sheetLabel, tileCityLine, tileGroup, tileKeyOf, tileMatrix, tileOriginY_m } from "./tilecity3d";
import { TILE_DRAW_CALLS_MAX, TILE_FRONTS, TILE_PATCH, TILE_SLOTS, sheetPieces, tileKeys } from "./tileslots";
import { stubTextSurface } from "./text";
import { townLayout } from "./town";

const S = WORLD_PER_METRE;
const ROLES: readonly TileRole[] = ["lane", "parking", "parkingPlain", "junction", "crossing", "pavement", "pavementCorner", "kerbCut", "lotSurface", "plaza"];

// ---- fixtures ----

/** [width, height, depth] in metres of every tile key (centred bounds, minimum y 0). */
const sizeOfKey = (key: CalibrationKey): [number, number, number] => {
  const name = key.slice(key.indexOf(":") + 1);
  if (name.includes("ParkingLines")) return [10, 0, 5];
  if (name.includes("Patch")) return [1.8, 0, 1.8];
  if (name.includes("Sidewalk")) return [5, 0.3, 5];
  return [5, 0, 5];
};
const entryOf = (key: CalibrationKey, i: number): AssetEntry => {
  const [w, h, d] = sizeOfKey(key);
  const name = key.slice(key.indexOf(":") + 1);
  return { name, source: `${name}.fbx`, bounds: { min: [-w / 2, 0, -d / 2], max: [w / 2, h, d / 2] }, triangles: 10 + i, textures: [], missingTextures: [], warnings: [] };
};
const BOX = new BoxGeometry(1, 1, 1);
const MAT = new MeshBasicMaterial();
/** A tile root: `meshes` one-box meshes, the second offset in the root so the sub-mesh matrix shows. */
const rootOf = (key: CalibrationKey, meshes = 1): Object3D => {
  const g = new Group();
  g.name = key.slice(key.indexOf(":") + 1);
  for (let i = 0; i < meshes; i++) {
    const m = new Mesh(BOX, MAT);
    m.position.set(0, i, 0);
    m.updateMatrix();
    g.add(m);
  }
  return g;
};

interface Pack {
  roots: Map<CalibrationKey, Object3D>;
  entries: Map<CalibrationKey, AssetEntry>;
}
/** Every tile key in the pack, less `lack`. */
const pack = (lack: readonly CalibrationKey[] = [], meshes = 1): Pack => {
  const roots = new Map<CalibrationKey, Object3D>();
  const entries = new Map<CalibrationKey, AssetEntry>();
  tileKeys().forEach((key, i) => {
    if (lack.includes(key)) return;
    roots.set(key, rootOf(key, meshes));
    entries.set(key, entryOf(key, i));
  });
  return { roots, entries };
};

/** A city with every role in it: the generated cells and one cell each of the three roles section B will add (kerb cut, lot surface, plaza). */
const extra = (role: TileRole, n: number): TileCell => ({ i: n, j: -3, cells: 1, role, variant: 0, x_m: (n + 0.5) * TILE_M, z_m: -2.5 * TILE_M, yaw: 90, street: null });
const baseCity = tileCity({ blocksX: 4, blocksZ: 3, seed: 2 });
const city: TileCity = { ...baseCity, cells: [...baseCity.cells, extra("kerbCut", 0), extra("lotSurface", 1), extra("plaza", 2)] };

/** The key a cell should be drawn from, from the ticket's rule written out here (not `tileKeyOf`). */
const wantKey = (c: TileCell): CalibrationKey => {
  const keys = TILE_SLOTS[c.role];
  if (c.role === "lane") return keys[c.variant & LANE_RIGHT]!;
  if (c.role === "pavement") return keys[c.variant & 3]!;
  return keys[0]!;
};

const instances = (g: Group): InstancedMesh[] => g.children.filter((c): c is InstancedMesh => (c as InstancedMesh).isInstancedMesh === true);
const named = (g: Group, name: string): InstancedMesh[] => instances(g).filter((im) => im.name === name);
const shortName = (key: CalibrationKey): string => key.slice(key.indexOf(":") + 1);

describe("the fixture city holds every case the tests mean", () => {
  it("has every role, both lanes, a patch, a grate and the second straight pavement", () => {
    expect(new Set(city.cells.map((c) => c.role))).toEqual(new Set(ROLES));
    expect(city.cells.some((c) => c.role === "lane" && (c.variant & LANE_RIGHT) === 0)).toBe(true);
    expect(city.cells.some((c) => c.role === "lane" && (c.variant & LANE_RIGHT) !== 0)).toBe(true);
    expect(city.cells.some((c) => c.role === "lane" && (c.variant & LANE_PATCH) !== 0)).toBe(true);
    expect(city.cells.some((c) => c.role === "pavement" && c.variant === PAVEMENT_GRATE)).toBe(true);
    expect(city.cells.some((c) => c.role === "pavement" && c.variant === PAVEMENT_STRAIGHT_2)).toBe(true);
    expect(city.cells.some((c) => c.cells === 2)).toBe(true);
  });
});

// ---- criterion 13: per-role fallback ----

describe("per-role fallback", () => {
  it("with the whole pack, every cell is drawn from it and each key has one instance per cell that wants it", () => {
    const p = pack();
    const draw = tileGroup(city, p.roots, p.entries);
    expect(draw.codeDrawn).toBe(0);
    expect(draw.fromPack).toBe(city.cells.length);
    const want = new Map<CalibrationKey, number>();
    for (const c of city.cells) want.set(wantKey(c), (want.get(wantKey(c)) ?? 0) + 1);
    expect([...draw.perKey].sort()).toEqual([...want].sort());
    for (const [key, n] of want) {
      const ims = named(draw.group, `tile:${shortName(key)}`);
      expect(ims, key).toHaveLength(1);
      expect(ims[0]!.count, key).toBe(n);
      expect(ims[0]!.instanceMatrix.count, key).toBeGreaterThanOrEqual(n);
    }
    // No code-drawn mesh at all.
    expect(instances(draw.group).filter((im) => im.name.startsWith("tile:code"))).toHaveLength(0);
    draw.dispose();
  });

  it("draws the patch decals on the lane cells that carry one, one per cell, and none when the patch piece is absent", () => {
    const patched = city.cells.filter((c) => c.role === "lane" && (c.variant & LANE_PATCH) !== 0).length;
    expect(patched).toBeGreaterThan(0);
    const p = pack();
    const draw = tileGroup(city, p.roots, p.entries);
    expect(named(draw.group, "tile:patch")[0]!.count).toBe(patched);
    expect(draw.fromPack, "a decal is not a cell").toBe(city.cells.length);
    draw.dispose();
    const q = pack([TILE_PATCH]);
    const without = tileGroup(city, q.roots, q.entries);
    expect(named(without.group, "tile:patch")).toHaveLength(0);
    expect(without.codeDrawn).toBe(0);
    without.dispose();
  });

  for (const role of ROLES) {
    it(`with ${role}'s keys absent, exactly the cells of the roles left with no key are drawn in code and the rest are from the pack`, () => {
      const lack = TILE_SLOTS[role];
      const p = pack(lack);
      const draw = tileGroup(city, p.roots, p.entries);
      const lost = new Set(ROLES.filter((r) => TILE_SLOTS[r].every((k) => lack.includes(k))));
      expect(lost.has(role)).toBe(true);
      const codeCells = city.cells.filter((c) => lost.has(c.role));
      expect(draw.codeDrawn).toBe(codeCells.length);
      expect(draw.fromPack).toBe(city.cells.length - codeCells.length);
      for (const c of city.cells) expect(tileKeyOf(c, new Set(p.roots.keys())) === null, `${c.role} ${c.i},${c.j}`).toBe(lost.has(c.role));
      // The code-drawn meshes exist exactly for the lost roads and pavements.
      const roads = codeCells.filter((c) => c.role !== "pavement" && c.role !== "pavementCorner" && c.role !== "kerbCut" && c.role !== "plaza");
      const boxes = codeCells.length - roads.length;
      expect(named(draw.group, "tile:code-road")[0]?.count ?? 0).toBe(roads.length);
      expect(named(draw.group, "tile:code-pavement")[0]?.count ?? 0).toBe(boxes);
      draw.dispose();
    });
  }

  it("with one of a role's keys absent the cells that wanted it use the role's other key and stay in the pack", () => {
    const [first, second, grate] = TILE_SLOTS.pavement as readonly [CalibrationKey, CalibrationKey, CalibrationKey];
    const p = pack([second]);
    const draw = tileGroup(city, p.roots, p.entries);
    expect(draw.codeDrawn).toBe(0);
    const wanted = (key: CalibrationKey): number => city.cells.filter((c) => wantKey(c) === key).length;
    expect(wanted(second)).toBeGreaterThan(0);
    expect(draw.perKey.get(first)).toBe(wanted(first) + wanted(second));
    expect(draw.perKey.get(grate)).toBe(wanted(grate));
    expect(draw.perKey.has(second)).toBe(false);
    draw.dispose();
  });

  it("with no pieces at all (CI) draws every cell in code, in three meshes at the most, and the scene's tile meshes are within TILE_DRAW_CALLS_MAX", () => {
    const draw = tileGroup(city, new Map(), new Map());
    expect(draw.fromPack).toBe(0);
    expect(draw.codeDrawn).toBe(city.cells.length);
    expect(draw.calls).toBeLessThanOrEqual(TILE_DRAW_CALLS_MAX);
    expect(draw.calls).toBeLessThanOrEqual(3);
    expect(instances(draw.group)).toHaveLength(draw.calls);
    expect(draw.perKey.size).toBe(0);
    const bundle = buildCityScene(city);
    expect(bundle.tileDraw().codeDrawn).toBe(city.cells.length);
    expect(instances(bundle.tileDraw().group).length).toBeLessThanOrEqual(TILE_DRAW_CALLS_MAX);
    bundle.dispose();
    draw.dispose();
  });

  it("treats a piece with an entry but no mesh in its root, or a root with no entry, as absent", () => {
    const p = pack();
    const key = TILE_SLOTS.crossing[0]!;
    p.roots.set(key, new Group());
    const noEntry = TILE_SLOTS.junction[0]!;
    p.entries.delete(noEntry);
    const draw = tileGroup(city, p.roots, p.entries);
    const lost = city.cells.filter((c) => c.role === "crossing" || c.role === "junction" || c.role === "lotSurface");
    expect(draw.codeDrawn).toBe(lost.length);
    draw.dispose();
  });

  it("when the pieces would take more than the cap, drops the keys with the fewest cells first and draws their cells in code or from the role's other key", () => {
    const p = pack([], 4);
    const draw = tileGroup(city, p.roots, p.entries);
    expect(draw.calls).toBeLessThanOrEqual(TILE_DRAW_CALLS_MAX);
    expect(draw.fromPack + draw.codeDrawn).toBe(city.cells.length);
    expect(draw.calls).toBeGreaterThan(20);
    draw.dispose();
    const tight = tileGroup(city, p.roots, p.entries, 8);
    expect(tight.calls).toBeLessThanOrEqual(8);
    expect(tight.fromPack + tight.codeDrawn).toBe(city.cells.length);
    // One key's four sub-meshes and the (at most three) code-drawn meshes are what fits; the rest of the cells are drawn in code.
    expect(tight.perKey.size).toBeGreaterThan(0);
    expect(tight.perKey.size).toBeLessThanOrEqual(1);
    expect(tight.codeDrawn).toBeGreaterThan(0);
    tight.dispose();
  });

  it("is deterministic and frees what it made", () => {
    const p = pack();
    const a = tileGroup(city, p.roots, p.entries);
    const b = tileGroup(city, p.roots, p.entries);
    expect(a.perKey).toEqual(b.perKey);
    const first = instances(a.group)[0]!;
    expect([...first.instanceMatrix.array.slice(0, 16)]).toEqual([...instances(b.group)[0]!.instanceMatrix.array.slice(0, 16)]);
    a.dispose();
    expect(instances(a.group).length, "the group still lists them; the buffers are freed").toBe(a.calls);
    b.dispose();
  });
});

// ---- criterion 14: levels and seams ----

describe("levels and seams", () => {
  const Y = new Vector3(0, 1, 0);
  const expectedMatrix = (c: TileCell, yM: number, turnDeg = 0): Matrix4 => new Matrix4().compose(new Vector3(c.x_m * S, yM * S, c.z_m * S), new Quaternion().setFromAxisAngle(Y, ((c.yaw + turnDeg) * Math.PI) / 180), new Vector3(S, S, S));

  it("puts every pack tile at its cell centre, turned by its yaw, scaled by WORLD_PER_METRE on every axis and nothing else", () => {
    const p = pack();
    const draw = tileGroup(city, p.roots, p.entries);
    const lookup = new Map<CalibrationKey, TileCell[]>();
    for (const c of city.cells) lookup.set(wantKey(c), [...(lookup.get(wantKey(c)) ?? []), c]);
    const bad: string[] = [];
    for (const [key, cells] of lookup) {
      const im = named(draw.group, `tile:${shortName(key)}`)[0]!;
      const m = new Matrix4();
      const pos = new Vector3();
      const quat = new Quaternion();
      const scale = new Vector3();
      cells.forEach((c, i) => {
        im.getMatrixAt(i, m);
        m.decompose(pos, quat, scale);
        for (const s of [scale.x, scale.y, scale.z]) if (Math.abs(s / S - 1) > 1e-6) bad.push(`${key} scale ${s}`);
        if (Math.abs(pos.x - c.x_m * S) > 1e-5 || Math.abs(pos.z - c.z_m * S) > 1e-5) bad.push(`${key} at ${pos.x},${pos.z}`);
        const want = expectedMatrix(c, tileOriginY_m(c.role, p.entries.get(key)), TILE_FRONTS[key] ?? 0);
        for (let k = 0; k < 16; k++) if (Math.abs(m.elements[k]! - want.elements[k]!) > 1e-5) bad.push(`${key} cell ${c.i},${c.j} element ${k}`);
      });
    }
    expect(bad).toEqual([]);
    draw.dispose();
  });

  it("stands the carriageway at -SIDEWALK_TOP_M, a pavement piece with its top at 0, and a parking lot's surface at 0", () => {
    const p = pack();
    const draw = tileGroup(city, p.roots, p.entries);
    const read = (key: CalibrationKey, i: number): number => {
      const m = new Matrix4();
      named(draw.group, `tile:${shortName(key)}`)[0]!.getMatrixAt(i, m);
      return new Vector3().setFromMatrixPosition(m).y;
    };
    for (const role of ["lane", "parking", "parkingPlain", "crossing"] as const) {
      const key = TILE_SLOTS[role][0]!;
      const idx = city.cells.filter((c) => wantKey(c) === key).findIndex((c) => c.role === role);
      expect(idx, role).toBeGreaterThanOrEqual(0);
      expect(read(key, idx), role).toBeCloseTo(-SIDEWALK_TOP_M * S, 6);
    }
    for (const role of ["pavement", "pavementCorner", "kerbCut", "plaza"] as const) {
      const key = TILE_SLOTS[role][0]!;
      const idx = city.cells.filter((c) => wantKey(c) === key).findIndex((c) => c.role === role);
      expect(idx, role).toBeGreaterThanOrEqual(0);
      // The piece's top (its origin plus its own height) is at 0.
      expect(read(key, idx) + (p.entries.get(key)!.bounds.max[1] - p.entries.get(key)!.bounds.min[1]) * S, role).toBeCloseTo(0, 6);
    }
    // Road_Bare_01 serves the junction boxes (carriageway) and the lot surfaces (ground): one instanced mesh, two levels.
    const bare = TILE_SLOTS.junction[0]!;
    const cells = city.cells.filter((c) => wantKey(c) === bare);
    cells.forEach((c, i) => expect(read(bare, i), `${c.role} ${i}`).toBeCloseTo(c.role === "lotSurface" ? 0 : -SIDEWALK_TOP_M * S, 6));
    draw.dispose();
  });

  it("lays the road pieces along their street: a lane or plain road piece's own z (its lines) ends up along the street, a parking piece's (its bay dividers) across it, a crossing's own x (its zebra bars) along it", () => {
    const p = pack();
    const draw = tileGroup(city, p.roots, p.entries);
    const by = new Map<CalibrationKey, TileCell[]>();
    for (const c of city.cells) by.set(wantKey(c), [...(by.get(wantKey(c)) ?? []), c]);
    const bad: string[] = [];
    let checked = 0;
    const m = new Matrix4();
    for (const role of ["lane", "parkingPlain", "parking", "crossing"] as const) {
      for (const key of TILE_SLOTS[role]) {
        const cells = by.get(key) ?? [];
        const im = named(draw.group, `tile:${shortName(key)}`)[0];
        cells.forEach((c, i) => {
          if (c.role !== role) return;
          im!.getMatrixAt(i, m);
          const own = role === "crossing" ? new Vector3(1, 0, 0) : new Vector3(0, 0, 1);
          const d = own.transformDirection(m);
          // The street of a cell runs along x when its yaw is 0 or 180 (the cell frame) and along z when 90 or 270.
          const streetAlongX = c.yaw === 0 || c.yaw === 180;
          const alongStreet = streetAlongX ? Math.abs(d.x) : Math.abs(d.z);
          const want = role === "parking" ? 0 : 1;
          if (Math.abs(alongStreet - want) > 1e-6) bad.push(`${key} cell ${c.i},${c.j} yaw ${c.yaw}: ${alongStreet.toFixed(3)} along its street, want ${want}`);
          checked++;
        });
      }
    }
    expect(checked).toBeGreaterThan(100);
    expect(bad).toEqual([]);
    draw.dispose();
  });

  it("lifts a patch decal a hair above its lane and turns a piece by its key's quarter turn", () => {
    const p = pack();
    const draw = tileGroup(city, p.roots, p.entries);
    const im = named(draw.group, "tile:patch")[0]!;
    const lane = city.cells.find((c) => c.role === "lane" && (c.variant & LANE_PATCH) !== 0)!;
    const m = new Matrix4();
    im.getMatrixAt(0, m);
    const at = new Vector3().setFromMatrixPosition(m);
    expect(at.y).toBeGreaterThan(-SIDEWALK_TOP_M * S);
    expect(at.y).toBeLessThan(-SIDEWALK_TOP_M * S + 0.01);
    expect(at.x).toBeCloseTo(lane.x_m * S, 4);
    for (const turn of [0, 90, 180, 270]) {
      const got = tileMatrix(lane, 0, turn);
      const want = expectedMatrix(lane, 0, turn);
      for (let k = 0; k < 16; k++) expect(got.elements[k]!).toBeCloseTo(want.elements[k]!, 9);
    }
    draw.dispose();
  });

  it("makes a two-cell piece 10 m long along its street and a one-cell piece 5 m square", () => {
    for (const c of city.cells) {
      const f = cellFootprint(c);
      if (c.cells === 1) expect([f.w_m, f.d_m]).toEqual([TILE_M, TILE_M]);
      else expect([f.w_m, f.d_m].sort((a, b) => a - b)).toEqual([TILE_M, 2 * TILE_M]);
    }
    const along = city.cells.find((c) => c.cells === 2 && c.yaw === 0)!;
    expect(cellFootprint(along)).toEqual({ w_m: 10, d_m: 5 });
    const down = city.cells.find((c) => c.cells === 2 && c.yaw === 90)!;
    expect(cellFootprint(down)).toEqual({ w_m: 5, d_m: 10 });
  });

  it("draws the code-drawn cells at the same cells and levels: a road quad at the carriageway, a pavement box from there up to 0", () => {
    const draw = tileGroup(city, new Map(), new Map());
    const roads = named(draw.group, "tile:code-road")[0]!;
    const boxes = named(draw.group, "tile:code-pavement")[0]!;
    const m = new Matrix4();
    const pos = new Vector3();
    const q = new Quaternion();
    const sc = new Vector3();
    const roadCells = city.cells.filter((c) => c.role !== "pavement" && c.role !== "pavementCorner" && c.role !== "kerbCut" && c.role !== "plaza");
    const bad: string[] = [];
    roadCells.forEach((c, i) => {
      roads.getMatrixAt(i, m);
      m.decompose(pos, q, sc);
      const f = cellFootprint(c);
      const y = c.role === "lotSurface" ? 0 : -SIDEWALK_TOP_M * S;
      if (Math.abs(pos.x - c.x_m * S) + Math.abs(pos.z - c.z_m * S) + Math.abs(pos.y - y) > 1e-5) bad.push(`road ${i} at ${pos.toArray()}`);
      if (Math.abs(sc.x - f.w_m * S) + Math.abs(sc.z - f.d_m * S) > 1e-5) bad.push(`road ${i} size`);
    });
    const boxCells = city.cells.filter((c) => c.role === "pavement" || c.role === "pavementCorner" || c.role === "kerbCut" || c.role === "plaza");
    boxCells.forEach((c, i) => {
      boxes.getMatrixAt(i, m);
      m.decompose(pos, q, sc);
      // The unit box stands on y = 0, so its base is the origin and its top is the origin plus the scale.
      if (Math.abs(pos.y - -SIDEWALK_TOP_M * S) > 1e-5 || Math.abs(pos.y + sc.y) > 1e-5) bad.push(`box ${i} level`);
      if (Math.abs(pos.x - c.x_m * S) + Math.abs(pos.z - c.z_m * S) > 1e-5) bad.push(`box ${i} at`);
    });
    expect(bad).toEqual([]);
    draw.dispose();
  });

  it("puts a kerb strip on every code-drawn pavement edge that meets a lane or parking cell and on no other", () => {
    // Independent of the code: a map of unit cells, expanded from the cell list.
    const roleAt = new Map<string, TileRole>();
    for (const c of baseCity.cells) {
      roleAt.set(`${c.i},${c.j}`, c.role);
      if (c.cells === 2) roleAt.set(c.yaw === 0 || c.yaw === 180 ? `${c.i + 1},${c.j}` : `${c.i},${c.j + 1}`, c.role);
    }
    let want = 0;
    for (const c of baseCity.cells) {
      if (c.role !== "pavement") continue;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = roleAt.get(`${c.i + di!},${c.j + dj!}`);
        if (n === "lane" || n === "parking" || n === "parkingPlain") want++;
      }
    }
    expect(want).toBeGreaterThan(50);
    const strips = kerbStrips(baseCity, baseCity.cells);
    expect(strips).toHaveLength(want);
    // Each lies on its pavement cell's edge, along it: 5 m long, narrow across, never over a junction or crossing.
    for (const s of strips) {
      const long = Math.max(s.w, s.d);
      const narrow = Math.min(s.w, s.d);
      expect(long).toBeCloseTo(TILE_M * S, 6);
      expect(narrow).toBeLessThan(0.1);
      const ci = Math.floor(s.x / (TILE_M * S));
      const cj = Math.floor(s.z / (TILE_M * S));
      expect(roleAt.get(`${ci},${cj}`)).toBe("pavement");
    }
    expect(kerbStrips(baseCity, baseCity.cells.filter((c) => c.role !== "pavement"))).toEqual([]);
  });
});

// ---- the models: tile keys load only when asked ----

describe("loadModels and the tile keys", () => {
  const manifestOf = (keys: readonly CalibrationKey[]): AssetManifest => ({
    version: ASSET_MANIFEST_VERSION,
    generatedAt: "2026-01-01T00:00:00Z",
    blenderVersion: "5.0.0",
    packs: [{ pack: "city-pack", glb: "city-pack.glb", atlas: null, assets: keys.map(entryOf), failures: [] }],
  });
  const load = async (manifest: AssetManifest, ask: boolean, lackNodes: readonly string[] = []): Promise<ModelSet> =>
    loadModels({
      fetchJson: async (): Promise<unknown> => manifest,
      loadGlb: async () => {
        const g = new Group();
        for (const e of manifest.packs[0]!.assets) {
          if (lackNodes.includes(e.name)) continue;
          g.add(rootOf(`city-pack:${e.name}`));
        }
        return g;
      },
      table: [],
      ...(ask ? { tileKeys: tileKeys() } : {}),
      info: () => {},
    });

  it("loads every tile key the manifest and its GLB have, in tileKeys order, and offers them with their entries and roots", async () => {
    const set = await load(manifestOf(tileKeys()), true);
    expect(set.tile!.map((m) => `${m.pack}:${m.entry.name}`)).toEqual(tileKeys());
    const input = tileInput(set)!;
    expect([...input.entries.keys()]).toEqual(tileKeys());
    expect([...input.roots.keys()]).toEqual(tileKeys());
    expect(input.roots.get(tileKeys()[0]!)!.name).toBe(shortName(tileKeys()[0]!));
  });

  it("leaves the set exactly as it was when the tile view does not ask: no tile slot, so no page but the dev tile city ever reads a tile", async () => {
    const set = await load(manifestOf(tileKeys()), false);
    expect("tile" in set).toBe(false);
    expect(tileInput(set)).toBeNull();
  });

  it("drops a key missing from the manifest or from its GLB alone, and gives null when none loaded", async () => {
    const missingEntry = tileKeys().slice(1);
    const a = await load(manifestOf(missingEntry), true);
    expect(a.tile!.map((m) => `${m.pack}:${m.entry.name}`)).toEqual(missingEntry);
    const b = await load(manifestOf(tileKeys()), true, [shortName(tileKeys()[2]!)]);
    expect(b.tile!).toHaveLength(tileKeys().length - 1);
    expect(b.tile!.some((m) => m.entry.name === shortName(tileKeys()[2]!))).toBe(false);
    const none = await load({ ...manifestOf([]), packs: [{ pack: "town-pack", glb: "t.glb", atlas: null, assets: [], failures: [] }] }, true);
    expect(none.tile).toBeNull();
    expect(tileInput(none)).toBeNull();
  });

  it("with an empty table loads no building, pole or lamp model, so a city with no puzzle never fetches the Town Pack", async () => {
    const set = await load(manifestOf(tileKeys()), true);
    expect([set.building, set.pole, set.lamp]).toEqual([null, null, null]);
  });

  it("plans the flat 5 x 0 x 5 road tiles and the 5 x 0.30 x 5 sidewalks alike, and skips a scale-suspect one", async () => {
    const manifest = manifestOf(tileKeys());
    const flat = manifest.packs[0]!.assets;
    const suspect = flat.map((e, i) => (i === 0 ? { ...e, warnings: ["scale-suspect" as const] } : e));
    const set = await load({ ...manifest, packs: [{ ...manifest.packs[0]!, assets: suspect }] }, true);
    expect(set.tile!.map((m) => m.entry.name)).not.toContain(flat[0]!.name);
    expect(set.tile!).toHaveLength(flat.length - 1);
  });
});

// ---- criterion 15: the switch ----

describe("the dev switch", () => {
  const renderer = readFileSync("src/render3d/renderer.ts", "utf8");

  it("renderer.ts reads the flag only in a dev build, and takes the tile branch before the town's scene is built", () => {
    expect(renderer).toMatch(/import\.meta\.env\.DEV && typeof location !== "undefined" \? cityTilesRequested\(location\.search\)/);
    expect(renderer).toMatch(/if \(cityTiles !== null\) \{[^}]*return createCityRenderer3d\(/);
    expect(renderer.indexOf("createCityRenderer3d(")).toBeGreaterThan(renderer.indexOf("createGalleryRenderer3d("));
    expect(renderer.indexOf("createCityRenderer3d(")).toBeLessThan(renderer.indexOf("buildScene(puzzle"));
    expect(renderer.indexOf("createCityRenderer3d(")).toBeLessThan(renderer.indexOf("createCameraRig(puzzle"));
  });

  it("takes no other branch: with no city= the flag is null and the path after it is the town's own, untouched", () => {
    const lines = renderer.split(/\r?\n/).filter((l) => /cityTiles|createCityRenderer3d|cityTilesRequested/.test(l) && !/^\s*(\/\/|import )/.test(l));
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) expect(/import\.meta\.env\.DEV|cityTiles !== null|return createCityRenderer3d\(/.test(l), l).toBe(true);
    // Everything after the branch is the town's, as before: the camera rig and the scene are made from the puzzle.
    const after = renderer.slice(renderer.indexOf("return createCityRenderer3d("));
    expect(after).toContain("createCameraRig(puzzle");
    expect(after).toContain("buildScene(puzzle, { dpr: ratio })");
  });

  it("only renderer.ts imports the tile view, and neither the scene, the town, the models nor the picker names it", () => {
    for (const f of ["scene.ts", "town.ts", "models.ts", "models3d.ts", "pick.ts", "layout.ts", "camera.ts", "gallery.ts", "streetcam.ts"]) {
      expect(/from "\.\/tile(city3d|slots)"/.test(readFileSync(`src/render3d/${f}`, "utf8")), f).toBe(false);
    }
  });

  it("neither new module reads the address, and tileslots imports no three", () => {
    for (const f of ["tilecity3d.ts", "tileslots.ts"]) expect(/location\./.test(readFileSync(`src/render3d/${f}`, "utf8")), f).toBe(false);
    expect(/from "three"/.test(readFileSync("src/render3d/tileslots.ts", "utf8"))).toBe(false);
  });

  it("answers no hit test in the tile view and never swaps the models' loader for the town's (the tile loader asks for tile keys and an empty table)", () => {
    const src = readFileSync("src/render3d/tilecity3d.ts", "utf8");
    expect(src).toMatch(/hitTest: \(\) => null/);
    expect(src).toMatch(/sharedTileModels\(tileKeys\(\)\)/);
    expect(readFileSync("src/render3d/models3d.ts", "utf8")).toMatch(/loadPageModels\(\{ table: \[\], tileKeys \}\)/);
    expect(readFileSync("src/render3d/models3d.ts", "utf8")).toMatch(/sharedModels\(\): Promise<ModelSet> \{\s+shared \?\?= loadPageModels\(\{\}\);/);
  });

  it("takes no ray: a ray from above through every tile, the ground, the yards and the placeholders hits nothing", () => {
    const p = pack();
    const bundle = buildCityScene(city);
    bundle.useTiles(p.roots, p.entries);
    const caster = new Raycaster();
    let fired = 0;
    for (const c of city.cells.slice(0, 120)) {
      caster.set(new Vector3(c.x_m * S, 40, c.z_m * S), new Vector3(0, -1, 0));
      expect(caster.intersectObject(bundle.scene, true), `${c.role} ${c.i},${c.j}`).toHaveLength(0);
      fired++;
    }
    expect(fired).toBe(120);
    const picked: string[] = [];
    bundle.scene.traverse((o) => {
      if (o.userData["pickKind"] !== undefined) picked.push(o.name);
    });
    expect(picked).toEqual([]);
    bundle.dispose();
  });
});

// ---- criterion 16: the puzzle-free bundle ----

const STACK_PIECES: [string, number, number, number][] = [
  ["SM_Bld_Apartment_01", 5.0, 3.0, 5.196],
  ["SM_Bld_Apartment_02", 5.17, 3.0, 5.214],
  ["SM_Bld_Apartment_03", 5.281, 3.0, 5.497],
  ["SM_Bld_Apartment_Corner_01", 5.196, 3.0, 5.196],
  ["SM_Bld_Apartment_Corner_02", 5.214, 3.0, 5.214],
  ["SM_Bld_Apartment_Corner_03", 5.491, 3.0, 5.497],
  ["SM_Bld_Apartment_Door_01", 5.096, 3.0, 5.577],
  ["SM_Bld_Apartment_Door_02", 5.114, 3.0, 5.115],
  ["SM_Bld_Apartment_Roof_01", 5.31, 0.5, 5.918],
  ["SM_Bld_Apartment_Roof_02", 5.252, 0.744, 5.488],
  ["SM_Bld_Apartment_Roof_03", 5.31, 0.744, 5.624],
  ["SM_Bld_Apartment_Roof_Corner_01", 5.904, 0.5, 5.918],
  ["SM_Bld_Apartment_Roof_Corner_02", 5.611, 0.744, 5.624],
  ["SM_Bld_Apartment_Roof_Corner_03", 5.462, 0.744, 5.488],
  ["SM_Bld_Apartment_Stack_01", 5.0, 9.0, 5.196],
  ["SM_Bld_Apartment_Stack_02", 5.17, 9.0, 5.214],
  ["SM_Bld_Apartment_Stack_03", 5.281, 9.0, 5.497],
  ["SM_Bld_Shop_01", 5.0, 3.054, 5.536],
  ["SM_Bld_Shop_02", 5.0, 3.3, 5.425],
  ["SM_Bld_Shop_03", 10.087, 3.084, 5.493],
  ["SM_Bld_Shop_04", 5.106, 3.17, 5.886],
  ["SM_Bld_Shop_05", 5.108, 3.0, 5.224],
  ["SM_Bld_Shop_06", 5.175, 3.0, 5.877],
  ["SM_Bld_Shop_Corner_01", 5.377, 3.0, 5.471],
  ["SM_Bld_Shop_Corner_02", 5.332, 3.0, 5.332],
  ["SM_Bld_OfficeOld_Small_Base_01", 10.936, 6.0, 10.936],
  ["SM_Bld_OfficeOld_Small_Floor_01", 10.0, 3.193, 10.0],
  ["SM_Bld_OfficeOld_Small_Roof_01", 11.12, 4.215, 11.2],
  ["SM_Bld_OfficeOld_Large_Base_01", 15.936, 6.0, 15.936],
  ["SM_Bld_OfficeOld_Large_Floor_01", 15.0, 3.193, 15.0],
  ["SM_Bld_OfficeOld_Large_Roof_01", 16.087, 4.227, 16.123],
  ["SM_Bld_OfficeOctagon_Base_01", 20.781, 3.896, 20.781],
  ["SM_Bld_OfficeOctagon_Floor_01", 20.465, 3.0, 20.465],
  ["SM_Bld_OfficeOctagon_Roof_01", 20.465, 5.382, 20.465],
];
const stackEntry = ([name, w, h, d]: [string, number, number, number], i: number): AssetEntry => ({
  name,
  source: `${name}.fbx`,
  bounds: { min: [-w / 2, 0, -d / 2], max: [w / 2, h, d / 2] },
  triangles: 100 + i,
  textures: [],
  missingTextures: [],
  warnings: [],
});
const STACK_MANIFEST: AssetManifest = {
  version: ASSET_MANIFEST_VERSION,
  generatedAt: "2026-01-01T00:00:00Z",
  blenderVersion: "5.0.0",
  packs: [{ pack: "city-pack", glb: "city-pack.glb", atlas: null, assets: [...STACK_PIECES.map(stackEntry), ...tileKeys().map((k, i) => entryOf(k, 100 + i))], failures: [] }],
};
const STACK_SET: ModelSet = await loadModels({
  fetchJson: async (): Promise<unknown> => STACK_MANIFEST,
  loadGlb: async () => {
    const g = new Group();
    for (const e of STACK_MANIFEST.packs[0]!.assets) {
      const n = tileKeys().includes(`city-pack:${e.name}`) ? rootOf(`city-pack:${e.name}`) : new Group();
      n.name = e.name;
      g.add(n);
    }
    return g;
  },
  table: [],
  stackKeys: allStackKeys(),
  tileKeys: tileKeys(),
  info: () => {},
});

describe("the puzzle-free bundle", () => {
  /** A tile city whose town also holds a ladder map's terrace rows, lots and parking lots: what section B will lay on the tile streets, in the same shape. */
  const ladder = townLayout(loadPuzzle(JSON.parse(readFileSync(join("puzzles", "01-first-light.json"), "utf8"))));
  const withRows: TileCity = { ...baseCity, town: { ...baseCity.town, lots: ladder.lots, terraces: ladder.terraces, openLots: ladder.openLots } };

  it("has no wires, places, poles, hardware, captions or node parts, and nothing that can be picked", () => {
    const b = buildCityScene(baseCity);
    expect(b.wires.size).toBe(0);
    expect(b.places.size).toBe(0);
    expect(b.parts.size).toBe(0);
    expect(b.captions).toEqual([]);
    expect(b.slots.poles.spots).toEqual([]);
    expect(b.slots.lamps).toEqual([]);
    expect(b.poles.poles.count + b.poles.arms.count).toBe(0);
    expect([b.hardware.insulators.count, b.hardware.cans.count, b.hardware.drops.count, b.hardware.canList.length, b.hardware.dropList.length]).toEqual([0, 0, 0, 0, 0]);
    expect(b.streets.pads).toHaveLength(baseCity.town.pads.length);
    expect(b.streets.yards.count).toBe(baseCity.town.blocks.length + 4);
    let sprites = 0;
    let lights = 0;
    b.scene.traverse((o) => {
      if (o instanceof Sprite) sprites++;
      if ((o as { isLight?: boolean }).isLight) lights++;
      expect(o.userData["pickKind"]).toBeUndefined();
    });
    expect(sprites).toBe(0);
    expect(lights).toBe(2);
    expect(() => b.update(null as never, null, 0)).not.toThrow();
    expect(() => b.setViewport(800, 600, 40)).not.toThrow();
    b.dispose();
  });

  it("is the town's lots and terrace runs, as the bundle's slots", () => {
    const b = buildCityScene(withRows);
    expect(b.slots.blocks.list).toBe(withRows.town.lots);
    expect(b.slots.blocks.terraces).toBe(withRows.town.terraces);
    expect(b.slots.blocks.terraces!.length).toBeGreaterThan(0);
    for (const t of ["small", "house", "large", "tall"] as const) expect(b.slots.blocks.byType[t]).toBeDefined();
    expect(b.slots.blocks.placeholder.getObjectByName("placeholders:terrace")!.children).toHaveLength(4);
    b.dispose();
  });

  it("applyModels swaps the terrace placeholders for packed stacks as on a ladder map, and remove() brings them back", () => {
    const b = buildCityScene(withRows);
    const input = stackInput(STACK_SET)!;
    const packed = packTown({ terraces: b.slots.blocks.terraces!, lots: b.slots.blocks.list }, STACK_STYLES, input.entries, input.fronts);
    const want = b.slots.blocks.terraces!.flatMap((r) => packed.get(r.id)!.blocks);
    expect(want.length).toBeGreaterThan(10);
    const applied = applyModels(b, STACK_SET);
    const row = b.scene.getObjectByName("terrace-stacks")!;
    expect(row).toBeDefined();
    expect(row.children).toHaveLength(want.length);
    expect(applied.terrace).toHaveLength(want.length);
    row.children.forEach((g, k) => {
      expect(g.name).toBe(`stack:${want[k]!.style}`);
      expect(g.rotation.y).toBeCloseTo(want[k]!.lot.yaw, 9);
    });
    const placeholders = b.slots.blocks.placeholder.getObjectByName("placeholders:terrace")!;
    expect(placeholders.visible).toBe(false);
    applied.remove();
    expect(row.parent).toBeNull();
    expect(placeholders.visible).toBe(true);
    b.dispose();
  });

  it("with no City Pack applyModels leaves the placeholders and adds nothing", () => {
    const b = buildCityScene(withRows);
    const kids = b.scene.children.length;
    for (const set of [NO_MODELS, { ...NO_MODELS, stack: null } as ModelSet]) {
      const applied = applyModels(b, set);
      expect(applied.terrace).toEqual([]);
      expect(applied.furniture).toEqual([]);
      expect(b.scene.getObjectByName("terrace-stacks")).toBeUndefined();
      expect(b.scene.children).toHaveLength(kids);
      expect(b.slots.blocks.placeholder.getObjectByName("placeholders:terrace")!.visible).toBe(true);
      applied.remove();
    }
    b.dispose();
  });

  it("useTiles swaps the code-drawn tiles for the pack's in place: the scene keeps one tile group, and the line counts add up", () => {
    const b = buildCityScene(city);
    const before = b.scene.children.length;
    expect(b.scene.getObjectByName("city-tiles")).toBe(b.tileDraw().group);
    const p = pack();
    const draw = b.useTiles(p.roots, p.entries);
    expect(b.scene.children).toHaveLength(before);
    expect(b.scene.getObjectByName("city-tiles")).toBe(draw.group);
    expect(draw.fromPack).toBe(city.cells.length);
    expect(tileCityLine(city, draw)).toBe(`tile city: 4x3 blocks, seed 2, ${city.cells.length} cells, ${city.cells.length} from the pack, 0 code-drawn`);
    expect(tileCityLine(baseCity, { fromPack: 0, codeDrawn: baseCity.cells.length })).toContain("0 from the pack");
    b.dispose();
  });

  it("is not a node's group: the furniture layout reads the scene's other groups as nodes, so the tile group is marked shared", () => {
    const b = buildCityScene(city);
    const groups = b.scene.children.filter((o) => o.type === "Group");
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) expect(g.userData["sharedModel"], g.name).toBe(true);
    b.dispose();
  });
});

// ---- the sheet ----

describe("the tile sheet", () => {
  const pieces = sheetPieces();

  it("shows every piece once, with an outline, an arrow and a label, and says which are not in the pack", () => {
    const full = pack();
    const sheet = buildSheetScene(full.roots, full.entries, { surface: stubTextSurface });
    expect(sheet.present).toBe(pieces.length);
    expect(sheet.missing).toBe(0);
    expect(sheet.labels).toHaveLength(pieces.length + 1);
    expect(sheet.scene.children.filter((o) => o.name.startsWith("tile-piece:")).map((o) => o.name)).toEqual(pieces.map((p) => `tile-piece:${p.key}`));
    const text = sheet.labels.map((l) => String(l.sprite.userData["text"]));
    pieces.forEach((p, i) => {
      expect(text[i]!.split("\n")[0], p.key).toBe(shortName(p.key).replace(/^SM_Env_/, ""));
      expect(text[i]!).not.toContain("NOT IN THE PACK");
    });
    expect(text[text.length - 1]).toContain("TILE_FRONTS");
    sheet.dispose();

    const lacking = pack([TILE_SLOTS.crossing[0]!, TILE_SLOTS.kerbCut[0]!]);
    const some = buildSheetScene(lacking.roots, lacking.entries, { surface: stubTextSurface });
    expect(some.missing).toBe(2);
    expect(some.present).toBe(pieces.length - 2);
    expect(some.labels.map((l) => String(l.sprite.userData["text"])).filter((t) => t.includes("NOT IN THE PACK"))).toHaveLength(2);
    expect(some.scene.children.filter((o) => o.name.startsWith("tile-piece:"))).toHaveLength(pieces.length - 2);
    some.dispose();

    const empty = buildSheetScene(new Map(), new Map(), { surface: stubTextSurface });
    expect(empty.present).toBe(0);
    expect(empty.missing).toBe(pieces.length);
    empty.dispose();
  });

  it("stands each piece at the city's level (a road at the carriageway, a sidewalk with its top at 0), turned by its TILE_FRONTS line, in a row left to right", () => {
    const full = pack();
    const sheet = buildSheetScene(full.roots, full.entries, { surface: stubTextSurface });
    const wraps = sheet.scene.children.filter((o) => o.name.startsWith("tile-piece:"));
    let lastX = -Infinity;
    wraps.forEach((w, i) => {
      const p = pieces[i]!;
      expect(w.position.x, p.key).toBeGreaterThan(lastX);
      lastX = w.position.x;
      expect(w.scale.x, p.key).toBeCloseTo(S, 12);
      expect(w.rotation.y, p.key).toBeCloseTo(((TILE_FRONTS[p.key] ?? 0) * Math.PI) / 180, 12);
      const role = p.roles[0];
      if (role === "pavement" || role === "pavementCorner" || role === "kerbCut" || p.key.endsWith("Corner_01")) expect(w.position.y + 0.3 * S, p.key).toBeCloseTo(0, 9);
      else if (role === "lane" || role === "parking" || role === "crossing" || role === "parkingPlain" || role === "junction") expect(w.position.y, p.key).toBeCloseTo(-SIDEWALK_TOP_M * S, 9);
    });
    // The parking lines are two cells long, so the next piece starts a full gap after them.
    const parking = pieces.findIndex((p) => p.roles.includes("parking"));
    expect(wraps[parking + 1]!.position.x - wraps[parking]!.position.x).toBeCloseTo((2 * TILE_M * S) / 2 + (TILE_M * S) / 2 + 1, 9);
    sheet.dispose();
  });

  it("labels a piece with its name, its roles, its turn and what its front must show", () => {
    const key = TILE_SLOTS.pavement[0]!;
    expect(sheetLabel(key, ["pavement"], true).slice(0, 3)).toEqual(["Sidewalk_Straight_01", "pavement", "turn 0"]);
    expect(sheetLabel(key, ["pavement"], true).slice(3).join(" ")).toBe("arrow = toward the kerb (the carriageway)");
    expect(sheetLabel(key, ["pavement"], true, { [key]: 180 })[2]).toBe("turn 180");
    expect(sheetLabel(key, ["pavement"], false).slice(-1)).toEqual(["NOT IN THE PACK"]);
    expect(sheetLabel(TILE_PATCH, [], true)[1]).toBe("(not used by a role yet)");
    const lane = sheetLabel(TILE_SLOTS.lane[0]!, ["lane"], true);
    expect(lane.join(" ")).toContain("centre line");
  });

  it("is framed by the gallery's rig: the first screen is the first few pieces, the whole row is the world, and the labels size to the canvas", () => {
    const sheet = buildSheetScene(new Map(), new Map(), { surface: stubTextSurface });
    expect(sheet.view.screens).toHaveLength(1);
    expect(sheet.view.screens[0]!.maxX).toBeLessThan(sheet.view.world.maxX);
    expect(sheet.view.world.maxX).toBeGreaterThan(pieces.length * TILE_M * S);
    const rig = createGalleryRig(sheet.view, 1280, 720);
    expect(Number.isFinite(rig.camera.position.x + rig.camera.position.y + rig.camera.position.z)).toBe(true);
    // The first tile is inside the picture.
    const p = new Vector3(0.45, 0, 0).project(rig.camera);
    expect(Math.abs(p.x)).toBeLessThan(1);
    expect(Math.abs(p.y)).toBeLessThan(1);
    sheet.setViewport(720);
    const unit = sheet.labels[0]!.sprite.scale.x / (sheet.labels[0]!.sprite.userData["cssW"] as number);
    expect(unit).toBeGreaterThan(0);
    sheet.setViewport(1440);
    expect(sheet.labels[0]!.sprite.scale.x / (sheet.labels[0]!.sprite.userData["cssW"] as number)).toBeCloseTo(unit / 2, 9);
    sheet.dispose();
  });
});

// ---- the overhead camera ----

describe("the city rig", () => {
  const win = baseCity.town.window;
  const frame = { minX: win.minX, minY: win.minY, maxX: win.maxX, maxY: win.maxY };

  it("opens with the whole city inside the picture, in a wide, a square and a tall window", () => {
    for (const [w, h] of [[1280, 720], [800, 800], [600, 900]] as const) {
      const rig = createCityRig(frame, w, h);
      for (const x of [frame.minX, frame.maxX]) {
        for (const z of [frame.minY, frame.maxY]) {
          const p = new Vector3(x, 0, z).project(rig.camera);
          expect(Math.abs(p.x), `${w}x${h} ${x},${z}`).toBeLessThanOrEqual(1);
          expect(Math.abs(p.y), `${w}x${h} ${x},${z}`).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("pans, zooms and resets: a pan round-trips, zooming in raises the scale, centring on a point moves the picture, resetView restores the opening", () => {
    const rig = createCityRig(frame, 1280, 720);
    const scale0 = rig.getScale();
    const before = rig.camera.position.clone();
    const pan = rig.setPan(120, 60);
    expect(pan.x).toBeCloseTo(120, 6);
    expect(pan.y).toBeCloseTo(60, 6);
    expect(rig.camera.position.x).toBeLessThan(before.x);
    expect(rig.zoomStep(1)).toBeGreaterThan(scale0);
    expect(rig.zoomStep(-1)).toBeCloseTo(scale0, 6);
    rig.resetView();
    expect(rig.getScale()).toBeCloseTo(scale0, 6);
    expect(rig.getPan().x).toBeCloseTo(0, 9);
    rig.centreOn(frame.maxX * 2, frame.maxY * 2);
    expect(rig.camera.position.x).toBeLessThanOrEqual(frame.maxX + 1e-6);
    for (let i = 0; i < 40; i++) rig.zoomStep(1);
    expect(rig.getScale()).toBeLessThan(scale0 * 40);
  });

  it("reframes when the canvas changes and respects the insets", () => {
    const rig = createCityRig(frame, 1280, 720, { top: 80 });
    const scale0 = rig.getScale();
    rig.resize(640, 360, { top: 40 });
    expect(rig.getScale()).toBeLessThan(scale0);
    rig.resize(1280, 720, { top: 80 });
    expect(rig.getScale()).toBeCloseTo(scale0, 6);
  });
});

// ---- the real manifest, when this machine has one ----

describe("the real City Pack manifest", () => {
  it("has every tile key, 5 m or 10 m by 5 m on the ground, the sidewalk pieces 0.30 m high", () => {
    const file = join("assets", "private", "out", "manifest.json");
    if (!existsSync(file)) return;
    const manifest = JSON.parse(readFileSync(file, "utf8")) as AssetManifest;
    const pack = manifest.packs.find((p) => p.pack === "city-pack");
    if (!pack) return;
    const bad: string[] = [];
    const roleKeys = new Set(ROLES.flatMap((r) => TILE_SLOTS[r]));
    for (const key of roleKeys) {
      const entry = pack.assets.find((a) => `city-pack:${a.name}` === key);
      if (!entry) {
        bad.push(`${key} is not in the manifest`);
        continue;
      }
      const w = entry.bounds.max[0] - entry.bounds.min[0];
      const h = entry.bounds.max[1] - entry.bounds.min[1];
      const d = entry.bounds.max[2] - entry.bounds.min[2];
      const two = TILE_SLOTS.parking.includes(key);
      if (Math.abs(w - (two ? 2 * TILE_M : TILE_M)) > 0.01 || Math.abs(d - TILE_M) > 0.01) bad.push(`${key} is ${w} x ${d} m`);
      if (key.includes("Sidewalk") && Math.abs(h - SIDEWALK_TOP_M) > 0.01) bad.push(`${key} is ${h} m high`);
    }
    expect(bad).toEqual([]);
  });
});
