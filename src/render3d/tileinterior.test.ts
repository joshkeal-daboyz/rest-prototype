/**
 * Ticket 057 D: the block interiors, drawn. `interiorItems`, `gatePlan`, `passageFloors` (tileslots.ts, pure), `propPlan` and `interiorGroup` (tilecity3d.ts), and the scene that holds them. No WebGL: every GLB is a
 * fake group (a one-box mesh per key) and every size is a number typed in from the converted City Pack manifest (19 Nov 2026). Nothing here reads assets/private/; no timer, no path but forward slashes.
 * The passages are typed in (`withPassages`): `tileCity` itself returns none, and the packed runs that find them are `tileintegrate.test.ts`'s.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Quaternion, Vector3, type Object3D } from "three";
import type { AssetEntry, CalibrationKey } from "../core";
import { BENCHES, BINS, TREES } from "./furniture";
import { LIGHT_MODES } from "./lighting";
import { applyLightMode } from "./lightrig";
import { WORLD_PER_METRE } from "./models";
import { APRON_STRIP, COURT_STALLS, TILE_M, tileCity, withPassages, type TileCity, type TilePassage } from "./tilecity";
import { INTERIOR_DRAW_CALLS_MAX, STALL_DIVIDERS_X_M, STALL_LINES_LIFT_M, TILE_BASE_M, TILE_BENCH, TILE_BINS, TILE_DRAW_CALLS_MAX, TILE_PROPS, TILE_SLOTS, TILE_TREES, GATE_H_M, GATE_POST_W_M, GATE_SMALL_H_M, alleyMouths, inletCells, gateParts, gatePlan, interiorItems, passageFloors, sheetLabel, sheetLegend, sheetPieces, tileKeys, type InteriorItem } from "./tileslots";
import { buildCityScene, interiorGroup, interiorLine, propInput, propPlan } from "./tilecity3d";
import { tilePassages } from "./frontage";

const S = WORLD_PER_METRE;
const BOX = new BoxGeometry(1, 1, 1);
const MAT = new MeshBasicMaterial();

// ---- fixtures ----

/** [width, height, depth] in metres by name (centred bounds, minimum y 0), from the converted City Pack manifest. */
const sizeOf = (name: string): [number, number, number] => {
  if (name.includes("ParkingLines")) return [10, 0, 5];
  if (name.includes("Grass")) return [5, 0.14, 5];
  if (name === "SM_Env_Sidewalk_01") return [5, 0.034, 5];
  if (name.includes("Sidewalk")) return [5, 0.3, 5];
  if (name.includes("Tree")) return [1.9, 4.2, 2.5];
  if (name.includes("ParkBench")) return [2.08, 1.05, 0.62];
  if (name.includes("Trashbin")) return [0.65, 1.18, 0.65];
  return [5, 0, 5];
};
const entryOf = (key: CalibrationKey, i: number): AssetEntry => {
  const name = key.slice(key.indexOf(":") + 1);
  const [w, h, d] = sizeOf(name);
  return { name, source: `${name}.fbx`, bounds: { min: [-w / 2, 0, -d / 2], max: [w / 2, h, d / 2] }, triangles: 10 + i, textures: [], missingTextures: [], warnings: [] };
};
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
/** Every tile key and prop key in the pack, less `lack`. */
const pack = (lack: readonly CalibrationKey[] = [], meshes = 1): Pack => {
  const roots = new Map<CalibrationKey, Object3D>();
  const entries = new Map<CalibrationKey, AssetEntry>();
  [...tileKeys(), ...TILE_PROPS].forEach((key, i) => {
    if (lack.includes(key)) return;
    roots.set(key, rootOf(key, meshes));
    entries.set(key, entryOf(key, i));
  });
  return { roots, entries };
};

const cityAt = (seed: number, bx = 3, bz = 3): TileCity => tileCity({ blocksX: bx, blocksZ: bz, seed });
const defaultCity = tileCity();
const CITIES: TileCity[] = [defaultCity, cityAt(2), cityAt(3), cityAt(1, 6, 4)];

const instances = (g: Group): InstancedMesh[] => g.children.filter((c): c is InstancedMesh => (c as InstancedMesh).isInstancedMesh === true);
const named = (g: Group, name: string): InstancedMesh[] => instances(g).filter((im) => im.name === name);
const shortName = (key: CalibrationKey): string => key.slice(key.indexOf(":") + 1);
const at = (im: InstancedMesh, i: number): { pos: Vector3; quat: Quaternion; scale: Vector3 } => {
  const m = new Matrix4();
  im.getMatrixAt(i, m);
  const out = { pos: new Vector3(), quat: new Quaternion(), scale: new Vector3() };
  m.decompose(out.pos, out.quat, out.scale);
  return out;
};
const cellKey = (i: number, j: number): string => `${i},${j}`;

/** A passage of the fixture: its middle on a block's back edge, its width, its turn, a floor `depth` deep inward (the way `tilePassages` records it). */
const passage = (x_m: number, z_m: number, w_m: number, yaw: 0 | 90 | 180 | 270, run: string): TilePassage => {
  const f = { minX_m: x_m - w_m / 2, maxX_m: x_m + w_m / 2, minZ_m: z_m, maxZ_m: z_m + TILE_M };
  return { x_m, z_m, w_m, yaw, run, floor: f };
};

// ---- interiorItems ----

describe("interiorItems: every cell of a block's inside is drawn once", () => {
  it("gives every interior cell one item, except a court's drive and near row, which are the lotSurface cells the street layer drew (the default city and three more)", () => {
    for (const city of CITIES) {
      const lot = new Set(city.cells.filter((c) => c.role === "lotSurface").map((c) => cellKey(c.i, c.j)));
      const items = interiorItems(city).filter((it) => it.cells === 1);
      const seen = new Set<string>();
      for (const it of items) {
        const k = cellKey(it.i, it.j);
        expect(seen.has(k), `${city.seed}: ${k} twice`).toBe(false);
        seen.add(k);
        expect(lot.has(k), `${city.seed}: ${k} is a lotSurface cell and is drawn again`).toBe(false);
      }
      const skipped = city.interior.filter((c) => !seen.has(cellKey(c.i, c.j)));
      expect(skipped.length, `${city.seed}: some court cells stand on lot cells`).toBeGreaterThan(0);
      for (const c of skipped) {
        expect(lot.has(cellKey(c.i, c.j)), `${city.seed}: ${cellKey(c.i, c.j)} ${c.role}`).toBe(true);
        expect(["court", "drive"], `${city.seed}: ${cellKey(c.i, c.j)}`).toContain(c.role);
      }
      expect(items.length + skipped.length).toBe(city.interior.length);
    }
  });

  it("covers every interior cell with the street layer's lot cells or an item, so nothing in a block's inside is left bare (G3's own fill, from the drawing's side)", () => {
    for (const city of CITIES) {
      const drawn = new Set(interiorItems(city).filter((it) => it.cells === 1).map((it) => cellKey(it.i, it.j)));
      for (const c of city.cells) if (c.role === "lotSurface") drawn.add(cellKey(c.i, c.j));
      for (const c of city.interior) expect(drawn.has(cellKey(c.i, c.j)), `${city.seed}: ${cellKey(c.i, c.j)} ${c.role}`).toBe(true);
    }
  });

  it("names each kind from its role: the ring-2 strip, the apron, a path, a park edge, a green, a bare road for a court, drive or alley lane cell, and the paved inlet for an alley lane's two mouth cells (063 H)", () => {
    for (const city of CITIES) {
      const items = interiorItems(city).filter((it) => it.cells === 1);
      const mouths = new Set(inletCells(city).mouths.map((c) => cellKey(c.i, c.j)));
      const role = new Map(city.interior.map((c) => [cellKey(c.i, c.j), c] as const));
      for (const it of items) {
        const c = role.get(cellKey(it.i, it.j))!;
        expect(it.role).toBe(c.role);
        const want = c.role === "apron" ? (c.variant === APRON_STRIP ? "strip" : "apron") : c.role === "greenPath" ? "path" : c.role === "parkEdge" ? "parkEdge" : c.role === "green" ? "green" : c.role === "alley" && mouths.has(cellKey(c.i, c.j)) ? "inlet" : "bare";
        expect(it.kind, `${city.seed}: ${c.role} ${cellKey(c.i, c.j)}`).toBe(want);
        expect([it.x_m, it.z_m, it.yaw]).toEqual([c.x_m, c.z_m, c.yaw]);
      }
      const kinds = new Set(items.map((it) => it.kind));
      for (const k of ["strip", "apron", "path", "parkEdge", "green", "bare"] as const) expect(kinds.has(k), `${city.seed}: a ${k}`).toBe(true);
      // Every alley lane cell is bare road (no lotSurface cell is under a lane) but its two mouth cells, which are paved.
      expect(items.filter((it) => it.role === "alley").every((it) => it.kind === (mouths.has(cellKey(it.i, it.j)) ? "inlet" : "bare"))).toBe(true);
      expect(items.filter((it) => it.role === "alley").length).toBe(city.interior.filter((c) => c.role === "alley").length);
    }
  });

  it("lays one row of stalls per near and far row of every court, over its two cells, turned toward the aisle as the court's own cell is", () => {
    for (const city of CITIES) {
      const rows = interiorItems(city).filter((it) => it.kind === "stalls");
      expect(rows).toHaveLength(2 * city.courts.length);
      const role = new Map(city.interior.map((c) => [cellKey(c.i, c.j), c] as const));
      city.courts.forEach((court, n) => {
        [court.stallsNear, court.stallsFar].forEach((pair, r) => {
          const it = rows[2 * n + r]!;
          const [a, b] = pair;
          expect(it.cells).toBe(2);
          expect(it.x_m).toBeCloseTo(((a.i + b.i + 1) / 2) * TILE_M, 9);
          expect(it.z_m).toBeCloseTo(((a.j + b.j + 1) / 2) * TILE_M, 9);
          // The two cells are neighbours, both stall cells of this court, and the row's yaw is theirs.
          expect(Math.abs(a.i - b.i) + Math.abs(a.j - b.j)).toBe(1);
          for (const q of pair) {
            const c = role.get(cellKey(q.i, q.j))!;
            expect(c.role).toBe("court");
            expect(c.variant).toBe(COURT_STALLS);
            expect(c.yaw).toBe(it.yaw);
          }
        });
      });
    }
  });

  it("is deterministic and leaves the city alone", () => {
    const a = interiorItems(defaultCity);
    expect(interiorItems(defaultCity)).toEqual(a);
    expect(Object.isFrozen(defaultCity.interior)).toBe(true);
    expect(a.length).toBeGreaterThan(500);
  });
});

// ---- gates, floors, mouths ----

describe("gated passages: floors, gates and alley mouths", () => {
  it("finds each alley's two mouths on its block's edges, at the lane's centre line", () => {
    for (const city of CITIES) {
      const alleys = city.blocks.filter((b) => b.alley !== null);
      expect(alleys.length, `${city.seed}`).toBeGreaterThan(0);
      const mouths = alleyMouths(city);
      expect(mouths).toHaveLength(2 * alleys.length);
      alleys.forEach((b, n) => {
        const al = b.alley!;
        for (const m of [mouths[2 * n]!, mouths[2 * n + 1]!]) {
          if (al.axis === "z") {
            expect(m.x_m).toBe((al.at + 0.5) * TILE_M);
            expect([b.j0 * TILE_M, b.j1 * TILE_M]).toContain(m.z_m);
          } else {
            expect(m.z_m).toBe((al.at + 0.5) * TILE_M);
            expect([b.i0 * TILE_M, b.i1 * TILE_M]).toContain(m.x_m);
          }
        }
      });
    }
  });

  it("gives each passage a gate, the small one when it opens on an alley's mouth and the full one anywhere else, and each floor as a rectangle", () => {
    const m = alleyMouths(defaultCity)[0]!;
    const near = passage(m.x_m + 3.2, m.z_m, 3.7, 0, "r:near");
    // A point on the back edge of the city's first block that is far from every mouth.
    const mouths = alleyMouths(defaultCity);
    const spot = [{ x: 1, z: 1 }, { x: 30, z: 1 }, { x: 60, z: 1 }, { x: 1, z: 40 }, { x: 100, z: 90 }, { x: 150, z: 150 }].find((c) => mouths.every((q) => Math.hypot(q.x_m - c.x, q.z_m - c.z) > 12))!;
    expect(spot).toBeDefined();
    const far = passage(spot.x, spot.z, 3.7, 0, "r:far");
    const city = withPassages(defaultCity, [near, far]);
    const g = gatePlan(city);
    expect(g.map((x) => [x.run, x.small])).toEqual([["r:near", true], ["r:far", false]]);
    expect(g[0]).toMatchObject({ x_m: near.x_m, z_m: near.z_m, yaw: 0, w_m: 3.7 });
    expect(gatePlan(withPassages(defaultCity, []))).toEqual([]);
    const floors = passageFloors(city);
    expect(floors).toHaveLength(2);
    [near, far].forEach((q, i) => {
      expect(floors[i]!.x_m).toBeCloseTo(q.x_m, 9);
      expect(floors[i]!.z_m).toBeCloseTo(q.z_m + TILE_M / 2, 9);
      expect(floors[i]!.w_m).toBeCloseTo(3.7, 9);
      expect(floors[i]!.d_m).toBeCloseTo(TILE_M, 9);
    });
  });

  it("builds a gate from two posts and a panel that fill the passage's width, the small gate lower, and a gap narrower than two posts as one panel", () => {
    for (const small of [false, true]) {
      const parts = gateParts({ w_m: 3.7, small });
      expect(parts.map((p) => p.kind)).toEqual(["post", "post", "panel"]);
      const panel = parts[2]!;
      const h = small ? GATE_SMALL_H_M : GATE_H_M;
      expect(panel.h_m).toBe(h);
      expect(parts[0]!.h_m).toBeGreaterThan(h);
      // The posts stand at the passage's edges (their outer faces on it) and the panel fills what is between them.
      expect(parts[0]!.x_m - GATE_POST_W_M / 2).toBeCloseTo(-3.7 / 2, 9);
      expect(parts[1]!.x_m + GATE_POST_W_M / 2).toBeCloseTo(3.7 / 2, 9);
      expect(panel.w_m + 2 * GATE_POST_W_M).toBeCloseTo(3.7, 9);
    }
    expect(gateParts({ w_m: 0.3, small: false })).toEqual([{ kind: "panel", x_m: 0, w_m: 0.3, h_m: GATE_H_M, d_m: expect.any(Number) as number }]);
  });
});

// ---- props ----

describe("propPlan: the trees, benches and bins", () => {
  it("is one prop for each green prop and each alley bin, a tree from the three, the bench the park bench and a bin one of the two, by hash and the same every time", () => {
    for (const city of CITIES) {
      const plan = propPlan(city);
      expect(plan).toHaveLength(city.greenProps.length + city.alleyBins.length);
      expect(propPlan(city)).toEqual(plan);
      for (const p of plan) {
        if (p.what === "tree") expect(TILE_TREES).toContain(p.key);
        else if (p.what === "bench") expect(p.key).toBe(TILE_BENCH);
        else expect(TILE_BINS).toContain(p.key);
      }
      expect(plan.filter((p) => p.what === "tree").length).toBe(city.greenProps.filter((g) => g.key === "tree").length);
      expect(plan.filter((p) => p.what === "bench").length).toBe(city.greenProps.filter((g) => g.key === "bench").length);
      expect(plan.filter((p) => p.what === "bin").length).toBe(city.alleyBins.length);
    }
    const trees = new Set(propPlan(defaultCity).filter((p) => p.what === "tree").map((p) => p.key));
    expect(trees.size, "not one tree repeated").toBeGreaterThan(1);
  });

  it("names the keys the page already loads as furniture (the same trees, bench and bins), and puts none on the tile sheet or among the tile keys", () => {
    expect([...TILE_TREES]).toEqual([...TREES]);
    expect([TILE_BENCH]).toEqual([...BENCHES]);
    expect([...TILE_BINS]).toEqual([...BINS]);
    expect(TILE_PROPS).toHaveLength(6);
    for (const key of TILE_PROPS) {
      expect(tileKeys()).not.toContain(key);
      expect(sheetPieces().map((p) => p.key)).not.toContain(key);
    }
  });

  it("reads the props from a model set's furniture (`dress`) and nothing else", () => {
    const piece = (key: CalibrationKey, i: number): NonNullable<Parameters<typeof propInput>[0]["dress"]>[number] => ({ pack: "city-pack", glb: "city-pack.glb", entry: entryOf(key, i), front: "+z", corner: false, family: key, root: rootOf(key) });
    const dress = [...TILE_PROPS, TILE_SLOTS.crossing[0]!].map(piece);
    const input = propInput({ dress });
    expect([...input.roots.keys()]).toEqual([...TILE_PROPS]);
    expect([...input.entries.keys()]).toEqual([...TILE_PROPS]);
    expect(propInput({}).roots.size).toBe(0);
  });
});

// ---- interiorGroup ----

describe("interiorGroup with the whole pack", () => {
  const city = withPassages(defaultCity, [passage(42.5, 12.5, 3.7, 0, "r:a"), passage(80, 12.5, 2.4, 0, "r:b")]);
  const items = interiorItems(city);
  const props = propPlan(city);

  it("draws every item from the pack but the ragged strip, one InstancedMesh per key, and counts each key's instances", () => {
    const p = pack();
    const draw = interiorGroup(city, p.roots, p.entries);
    // 063 D: the ring-2 strip is the plain slab too, so with the whole pack every item is from it.
    const strips = items.filter((it) => it.kind === "strip").length;
    expect(strips).toBeGreaterThan(100);
    expect(draw.codeDrawn).toBe(0);
    expect(draw.fromPack).toBe(items.length);
    const want = new Map<CalibrationKey, number>();
    const keyOf = (it: InteriorItem): CalibrationKey => (it.kind === "green" ? TILE_SLOTS.green[0]! : it.kind === "stalls" ? TILE_SLOTS.court[1]! : it.kind === "bare" ? TILE_SLOTS.alley[0]! : TILE_SLOTS.apron[0]!);
    for (const it of items) want.set(keyOf(it), (want.get(keyOf(it)) ?? 0) + 1);
    for (const pr of props) want.set(pr.key, (want.get(pr.key) ?? 0) + 1);
    expect([...draw.perKey].sort()).toEqual([...want].sort());
    for (const [key, n] of want) {
      const ims = named(draw.group, `interior:${shortName(key)}`);
      expect(ims, key).toHaveLength(1);
      expect(ims[0]!.count, key).toBe(n);
    }
    expect(draw.props).toBe(props.length);
    expect(draw.floors).toBe(2);
    expect(draw.gates).toBe(2);
    expect(instances(draw.group)).toHaveLength(draw.calls);
    expect(draw.calls).toBeLessThanOrEqual(INTERIOR_DRAW_CALLS_MAX);
    draw.dispose();
  });

  it("stands every tile at its item's centre on the ground: the grass 0.11 m down, the slabs 0.01 m down, the bare road at 0, the stall lines a hair over it, and the props at 0, at WORLD_PER_METRE and never otherwise scaled", () => {
    const p = pack();
    const draw = interiorGroup(city, p.roots, p.entries);
    const grass = TILE_SLOTS.green[0]!;
    const slab = TILE_SLOTS.apron[0]!;
    const bare = TILE_SLOTS.alley[0]!;
    const lines = TILE_SLOTS.court[1]!;
    const bad: string[] = [];
    const check = (key: CalibrationKey, list: InteriorItem[], y_m: number): void => {
      const im = named(draw.group, `interior:${shortName(key)}`)[0]!;
      list.forEach((it, i) => {
        const m = at(im, i);
        if (Math.abs(m.pos.x - it.x_m * S) > 1e-5 || Math.abs(m.pos.z - it.z_m * S) > 1e-5) bad.push(`${key} ${i} at ${m.pos.x},${m.pos.z}`);
        if (Math.abs(m.pos.y - y_m * S) > 1e-6) bad.push(`${key} ${i} y ${m.pos.y}`);
        for (const s of [m.scale.x, m.scale.y, m.scale.z]) if (Math.abs(s / S - 1) > 1e-6) bad.push(`${key} ${i} scale ${s}`);
      });
    };
    check(grass, items.filter((it) => it.kind === "green"), TILE_BASE_M[grass]!);
    check(slab, items.filter((it) => it.kind === "strip" || it.kind === "apron" || it.kind === "path" || it.kind === "parkEdge" || it.kind === "inlet"), TILE_BASE_M[slab]!);
    check(bare, items.filter((it) => it.kind === "bare"), 0);
    check(lines, items.filter((it) => it.kind === "stalls"), STALL_LINES_LIFT_M);
    expect(TILE_BASE_M[grass]).toBe(-0.11);
    expect(TILE_BASE_M[slab]).toBe(-0.01);
    expect(bad).toEqual([]);
    // A prop stands at its point on the walk.
    const bench = named(draw.group, `interior:${shortName(TILE_BENCH)}`)[0]!;
    const benches = props.filter((q) => q.key === TILE_BENCH);
    benches.forEach((b, i) => {
      const m = at(bench, i);
      expect([m.pos.x, m.pos.y, m.pos.z].map((v) => Math.round(v * 1e5))).toEqual([b.x_m * S, 0, b.z_m * S].map((v) => Math.round(v * 1e5)));
    });
    draw.dispose();
  });

  it("lays each row of stalls with its own x along the row and its front toward the aisle (the way a cell's yaw turns a road piece), and turns the greens by quarter turns so a lawn is not one tile repeated", () => {
    const p = pack();
    const draw = interiorGroup(city, p.roots, p.entries);
    const rows = items.filter((it) => it.kind === "stalls");
    const im = named(draw.group, `interior:${shortName(TILE_SLOTS.court[1]!)}`)[0]!;
    rows.forEach((it, i) => {
      const m = new Matrix4();
      im.getMatrixAt(i, m);
      const x = new Vector3(1, 0, 0).transformDirection(m);
      const z = new Vector3(0, 0, 1).transformDirection(m);
      const a = (it.yaw * Math.PI) / 180;
      expect(x.x).toBeCloseTo(Math.cos(a), 6);
      expect(x.z).toBeCloseTo(-Math.sin(a), 6);
      expect(z.x).toBeCloseTo(Math.sin(a), 6);
      expect(z.z).toBeCloseTo(Math.cos(a), 6);
    });
    const gim = named(draw.group, `interior:${shortName(TILE_SLOTS.green[0]!)}`)[0]!;
    const turns = new Set<string>();
    for (let i = 0; i < gim.count; i++) {
      const q = at(gim, i).quat;
      turns.add(`${Math.round(q.y * 100)},${Math.round(q.w * 100)}`);
    }
    expect(turns.size, "the quarter turns by hash").toBeGreaterThan(1);
    expect(turns.size).toBeLessThanOrEqual(4);
    draw.dispose();
  });

  it("draws a passage floor narrower than a cell as one pavement quad (a part cell) and each gate as boxes, in code", () => {
    const p = pack();
    const draw = interiorGroup(city, p.roots, p.entries);
    const pave = named(draw.group, "interior:code-pavement")[0]!;
    expect(pave.count, "the two floors, each under one whole cell wide: part cells").toBe(2);
    // A floor is a flat quad at the walk's level, as wide and deep as the passage's floor rectangle.
    const floor = at(pave, 0);
    expect([floor.scale.x, floor.scale.z].map((v) => Math.round(v / S * 1000) / 1000)).toEqual([3.7, TILE_M]);
    expect(floor.pos.y).toBe(0);
    const gates = named(draw.group, "interior:code-gates")[0]!;
    expect(gates.count).toBe(gateParts({ w_m: 3.7, small: false }).length + gateParts({ w_m: 2.4, small: false }).length);
    draw.dispose();
  });
});

describe("interiorGroup with no pack, or part of it (CI)", () => {
  const city = withPassages(defaultCity, [passage(42.5, 12.5, 3.7, 0, "r:a")]);
  const items = interiorItems(city);

  it("draws every item in code, in five meshes at the most (pavement, grass, bare road, stall lines, gates), none from the pack", () => {
    const draw = interiorGroup(city, new Map(), new Map());
    expect(draw.fromPack).toBe(0);
    expect(draw.codeDrawn).toBe(items.length);
    expect(draw.perKey.size).toBe(0);
    expect(draw.props, "trees, benches and bins are optional dressing: none without their pieces").toBe(0);
    expect(draw.calls).toBe(5);
    expect(draw.calls).toBeLessThanOrEqual(INTERIOR_DRAW_CALLS_MAX);
    expect(instances(draw.group)).toHaveLength(draw.calls);
    const by = (k: InteriorItem["kind"][]): number => items.filter((it) => k.includes(it.kind)).length;
    expect(named(draw.group, "interior:code-pavement")[0]!.count).toBe(by(["strip", "apron", "path", "parkEdge", "inlet"]) + 1);
    expect(named(draw.group, "interior:code-grass")[0]!.count).toBe(by(["green"]));
    expect(named(draw.group, "interior:code-bare")[0]!.count).toBe(by(["bare"]));
    expect(named(draw.group, "interior:code-stalls")[0]!.count).toBe(by(["stalls"]) * STALL_DIVIDERS_X_M.length);
    expect(named(draw.group, "interior:code-gates")[0]!.count).toBe(3);
    draw.dispose();
  });

  it("registers its code-drawn materials under the surface keys the light rig recolours: pavement, grass, street and kerb", () => {
    const draw = interiorGroup(city, new Map(), new Map());
    expect([...draw.surfaces.keys()].sort()).toEqual(["grass", "kerb", "pavement", "street"]);
    for (const mats of draw.surfaces.values()) expect(mats).toHaveLength(1);
    draw.dispose();
    // The gate's wood is not a surface key: the rig leaves it as it is.
    const gates = interiorGroup(city, new Map(), new Map());
    const wood = named(gates.group, "interior:code-gates")[0]!.material as MeshStandardMaterial;
    for (const mats of gates.surfaces.values()) expect(mats).not.toContain(wood);
    gates.dispose();
  });

  it("with one kind's piece absent draws only that kind in code, and with a role's pieces all absent every other kind stays in the pack", () => {
    const grass = TILE_SLOTS.green[0]!;
    const p = pack([grass]);
    const draw = interiorGroup(city, p.roots, p.entries);
    const greens = items.filter((it) => it.kind === "green").length;
    expect(draw.codeDrawn).toBe(greens);
    expect(named(draw.group, "interior:code-grass")[0]!.count).toBe(greens);
    expect(draw.perKey.has(grass)).toBe(false);
    draw.dispose();
    const slab = TILE_SLOTS.apron[0]!;
    const q = pack([slab]);
    const no = interiorGroup(city, q.roots, q.entries);
    const slabs = items.filter((it) => it.kind === "strip" || it.kind === "apron" || it.kind === "path" || it.kind === "parkEdge" || it.kind === "inlet").length;
    expect(no.codeDrawn).toBe(slabs);
    expect(no.perKey.has(grass)).toBe(true);
    no.dispose();
    // The stall lines absent: each row gets its dividers, and the bare road under it stays in the pack.
    const lines = TILE_SLOTS.court[1]!;
    const r = pack([lines]);
    const dv = interiorGroup(city, r.roots, r.entries);
    const rows = items.filter((it) => it.kind === "stalls").length;
    expect(named(dv.group, "interior:code-stalls")[0]!.count).toBe(rows * STALL_DIVIDERS_X_M.length);
    expect(dv.perKey.has(TILE_SLOTS.alley[0]!)).toBe(true);
    dv.dispose();
  });

  it("gives a tree whose own piece is missing to another of the three, and draws no bench or bin whose piece is missing", () => {
    const first = TILE_TREES[0]!;
    const p = pack([first, TILE_BENCH]);
    const draw = interiorGroup(city, p.roots, p.entries);
    const plan = propPlan(city);
    expect(plan.some((q) => q.key === first)).toBe(true);
    expect(draw.perKey.has(first)).toBe(false);
    expect(draw.perKey.has(TILE_BENCH)).toBe(false);
    const trees = plan.filter((q) => q.what === "tree").length;
    const bins = plan.filter((q) => q.what === "bin").length;
    expect(draw.props).toBe(trees + bins);
    draw.dispose();
  });

  it("keeps within a tight cap, dropping the keys with the fewest instances first, every item still drawn once", () => {
    const p = pack([], 4);
    const loose = interiorGroup(city, p.roots, p.entries);
    expect(loose.calls).toBeGreaterThan(8);
    expect(loose.calls).toBeLessThanOrEqual(INTERIOR_DRAW_CALLS_MAX);
    loose.dispose();
    for (const cap of [5, 9, 14]) {
      const draw = interiorGroup(city, p.roots, p.entries, cap);
      expect(draw.calls, `cap ${cap}`).toBeLessThanOrEqual(cap);
      expect(draw.fromPack + draw.codeDrawn, `cap ${cap}`).toBe(items.length);
      draw.dispose();
    }
  });

  it("is deterministic, takes no ray, and frees what it made", () => {
    const p = pack();
    const a = interiorGroup(city, p.roots, p.entries);
    const b = interiorGroup(city, p.roots, p.entries);
    expect(a.perKey).toEqual(b.perKey);
    expect([...instances(a.group)[0]!.instanceMatrix.array.slice(0, 16)]).toEqual([...instances(b.group)[0]!.instanceMatrix.array.slice(0, 16)]);
    const hits: unknown[] = [];
    a.group.raycast(undefined as never, hits as never);
    for (const im of instances(a.group)) im.raycast(undefined as never, hits as never);
    expect(hits).toHaveLength(0);
    expect(a.group.userData["sharedModel"], "the page's geometry is not this group's to free").toBe(true);
    a.dispose();
    b.dispose();
  });
});

// ---- the scene ----

describe("the city scene holds the interiors", () => {
  it("opens with the interiors in code in a group of their own beside the tiles, and every frame's draw calls within the two caps", () => {
    const bundle = buildCityScene(defaultCity);
    const interior = bundle.scene.children.find((c) => c.name === "city-interior");
    expect(interior).toBeDefined();
    const draw = bundle.interiorDraw();
    expect(draw.group).toBe(interior);
    expect(draw.fromPack).toBe(0);
    expect(draw.codeDrawn).toBe(interiorItems(defaultCity).length);
    expect(draw.floors, "no gated passage is known before the runs are packed").toBe(0);
    expect(bundle.tileDraw().calls).toBeLessThanOrEqual(TILE_DRAW_CALLS_MAX);
    expect(draw.calls).toBeLessThanOrEqual(INTERIOR_DRAW_CALLS_MAX);
    bundle.dispose();
  });

  it("swaps the interiors with the tiles when the pack arrives, with the passages the packed runs found, and brings its code-drawn grass to the light mode", () => {
    const bundle = buildCityScene(defaultCity);
    const first = bundle.interiorDraw();
    const passages = [passage(42.5, 12.5, 3.7, 0, "r:a")];
    const p = pack();
    bundle.useTiles(p.roots, p.entries, passages);
    const next = bundle.interiorDraw();
    expect(next).not.toBe(first);
    expect(bundle.scene.children.filter((c) => c.name === "city-interior")).toEqual([next.group]);
    expect(next.floors).toBe(1);
    expect(next.gates).toBe(1);
    expect(next.perKey.size).toBeGreaterThan(5);
    // With every piece present no grass is code-drawn: the rig has no grass material to recolour.
    expect(bundle.lightOwners.materials.has("grass")).toBe(false);
    // Part of the pack: the lawn alone is code-drawn, and the rig recolours it with the mode.
    const q = pack([TILE_SLOTS.green[0]!]);
    bundle.useTiles(q.roots, q.entries, passages);
    const grass = bundle.lightOwners.materials.get("grass");
    expect(grass).toHaveLength(1);
    applyLightMode(bundle.scene, null, "day", bundle.lightOwners);
    expect((grass![0] as MeshStandardMaterial).color.getHex()).toBe(LIGHT_MODES.day.surfaces.grass);
    applyLightMode(bundle.scene, null, "night", bundle.lightOwners);
    expect((grass![0] as MeshStandardMaterial).color.getHex()).toBe(LIGHT_MODES.night.surfaces.grass);
    // The pavement key is the tiles' and the interiors' materials together.
    const mats = bundle.lightOwners.materials.get("pavement")!;
    expect(mats.length).toBeGreaterThanOrEqual(1);
    bundle.dispose();
  });

  it("with no passages given keeps the city's own (none), and asks packTown's result for none when nothing was packed", () => {
    const bundle = buildCityScene(defaultCity);
    const p = pack();
    bundle.useTiles(p.roots, p.entries);
    expect(bundle.interiorDraw().floors).toBe(0);
    expect(bundle.interiorDraw().gates).toBe(0);
    // `tilePassages` on a run-less packing (no City Pack stack: nothing is packed) returns none and does not throw.
    expect(tilePassages(defaultCity, new Map())).toEqual([]);
    bundle.dispose();
  });
});

// ---- the sheet ----

describe("the sheet shows each interior role once, labelled (criterion 11)", () => {
  const INTERIOR = ["apron", "court", "drive", "green", "greenPath", "alley", "parkEdge"] as const;

  it("lists a piece for every interior role that has one, once each, so the sheet's pieces serve all seven roles", () => {
    const pieces = sheetPieces();
    for (const role of INTERIOR) expect(pieces.filter((p) => p.roles.includes(role)).length, role).toBe(TILE_SLOTS[role].length);
    expect(new Set(pieces.map((p) => p.key)).size).toBe(pieces.length);
    expect(pieces.filter((p) => p.cells === 2).map((p) => p.key)).toEqual([TILE_SLOTS.parking[0]]);
  });

  it("labels each of them with the interior roles it serves, in a second line at most 26 characters, and its legend line in a numbered sheet at most 41", () => {
    const pieces = sheetPieces();
    const slab = pieces.find((p) => p.key === TILE_SLOTS.apron[0])!;
    const grass = pieces.find((p) => p.key === TILE_SLOTS.green[0])!;
    const bare = pieces.find((p) => p.key === TILE_SLOTS.alley[0])!;
    const lines = pieces.find((p) => p.key === TILE_SLOTS.court[1])!;
    expect(sheetLabel(slab.key, true, undefined, slab.roles)).toEqual(["Sidewalk_01", "turn 0 + apron path edge"]);
    expect(sheetLabel(grass.key, true, undefined, grass.roles)).toEqual(["Grass_01", "turn 0 + green"]);
    expect(sheetLabel(bare.key, true, undefined, bare.roles)).toEqual(["Bare_01", "turn 0 + court drive alley"]);
    expect(sheetLabel(lines.key, true, undefined, lines.roles)).toEqual(["ParkingLines_01", "turn 0 + court"]);
    expect(sheetLabel(grass.key, false, undefined, grass.roles)).toEqual(["Grass_01", "NOT IN PACK"]);
    for (const p of pieces) expect(sheetLabel(p.key, true, undefined, p.roles)[1]!.length, p.key).toBeLessThanOrEqual(26);
    const have = pieces.map((p) => ({ key: p.key, present: true, roles: p.roles }));
    const legend = sheetLegend(true, have);
    expect(legend.some((l) => l.includes("Sidewalk_01 turn 0 + apron path edge"))).toBe(true);
    for (const l of legend) expect(l.length, l).toBeLessThanOrEqual(41);
  });
});

describe("the interiors' levels and the bench's front agree with the converted City Pack geometry when this machine has it (skipped when it does not)", () => {
  it("has the slab's top 0.07 m up, the grass's blades 0.10 to 0.14 m up, the bare road and the stall lines flat at 0, and the bench's backrest at its -z side (its front is +z)", { timeout: 120000 }, (ctx) => {
    const file = join("assets", "private", "out", "city-pack.glb");
    if (!existsSync(file)) ctx.skip();
    const glb = readFileSync(file);
    const jsonLen = glb.readUInt32LE(12);
    const gltf = JSON.parse(glb.subarray(20, 20 + jsonLen).toString("utf8")) as {
      nodes: { name?: string; mesh?: number; children?: number[] }[];
      meshes: { primitives: { attributes: { POSITION: number }; indices?: number }[] }[];
      accessors: { bufferView: number; byteOffset?: number; count: number; componentType: number }[];
      bufferViews: { byteOffset?: number; byteStride?: number }[];
    };
    const bin = glb.subarray(20 + jsonLen + 8);
    const mesh = (name: string): { pts: number[][]; tris: number[][] } => {
      const root = gltf.nodes.find((n) => n.name === name);
      expect(root, name).toBeDefined();
      const pts: number[][] = [];
      const tris: number[][] = [];
      const walk = (n: { mesh?: number; children?: number[] }): void => {
        for (const prim of n.mesh !== undefined ? gltf.meshes[n.mesh]!.primitives : []) {
          const a = gltf.accessors[prim.attributes.POSITION]!;
          const bv = gltf.bufferViews[a.bufferView]!;
          const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
          const first = pts.length;
          for (let i = 0; i < a.count; i++) {
            const at = base + i * (bv.byteStride ?? 12);
            pts.push([bin.readFloatLE(at), bin.readFloatLE(at + 4), bin.readFloatLE(at + 8)]);
          }
          const ia = gltf.accessors[prim.indices!]!;
          const ib = gltf.bufferViews[ia.bufferView]!;
          const at0 = (ib.byteOffset ?? 0) + (ia.byteOffset ?? 0);
          for (let i = 0; i + 2 < ia.count; i += 3) tris.push([0, 1, 2].map((k) => first + (ia.componentType === 5125 ? bin.readUInt32LE(at0 + (i + k) * 4) : bin.readUInt16LE(at0 + (i + k) * 2))));
        }
        for (const c of n.children ?? []) walk(gltf.nodes[c]!);
      };
      walk(root!);
      return { pts, tris };
    };
    /** The height (metres, 3 decimals) the most up-facing area stands at. */
    const topLevel = (name: string): number => {
      const { pts, tris } = mesh(name);
      const area = new Map<string, number>();
      for (const [a, b, c] of tris) {
        const [p, q, r] = [pts[a!]!, pts[b!]!, pts[c!]!];
        const u = [q[0]! - p[0]!, q[1]! - p[1]!, q[2]! - p[2]!];
        const v = [r[0]! - p[0]!, r[1]! - p[1]!, r[2]! - p[2]!];
        const n = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
        const len = Math.hypot(n[0]!, n[1]!, n[2]!);
        if (len < 1e-12 || n[1]! / len < 0.9) continue;
        const y = ((p[1]! + q[1]! + r[1]!) / 3).toFixed(2);
        area.set(y, (area.get(y) ?? 0) + len / 2);
      }
      return Number([...area].sort((x, y) => y[1] - x[1])[0]![0]);
    };
    const name = (key: CalibrationKey): string => key.slice(key.indexOf(":") + 1);
    expect(Math.abs(topLevel(name(TILE_SLOTS.apron[0]!)) + TILE_BASE_M[TILE_SLOTS.apron[0]!]!)).toBeLessThanOrEqual(0.01);
    const grass = topLevel(name(TILE_SLOTS.green[0]!));
    expect(grass).toBeGreaterThanOrEqual(0.1);
    expect(grass).toBeLessThanOrEqual(0.14);
    expect(topLevel(name(TILE_SLOTS.alley[0]!))).toBe(0);
    expect(topLevel(name(TILE_SLOTS.court[1]!))).toBe(0);
    const bench = mesh(name(TILE_BENCH)).pts;
    const mean = (rows: number[][]): number => rows.reduce((s, p) => s + p[2]!, 0) / rows.length;
    expect(mean(bench.filter((p) => p[1]! > 0.7)), "the backrest is behind the seat").toBeLessThan(mean(bench.filter((p) => p[1]! < 0.55 && p[1]! > 0.35)));
  });
});

describe("the dev view's line about the interiors", () => {
  it("says what stands inside the blocks: surfaces from the pack and in code, props, passage floors, gates and draw calls", () => {
    const draw = interiorGroup(withPassages(defaultCity, [passage(42.5, 12.5, 3.7, 0, "r:a")]), new Map(), new Map());
    expect(interiorLine(draw)).toBe(`tile city interiors: 0 surfaces from the pack, ${interiorItems(defaultCity).length} code-drawn, 0 props, 1 passage floors, 1 gates, 5 draw calls`);
    draw.dispose();
  });
});

describe("the interior cities are the ones the ticket names", () => {
  it("has courts, alleys with bins, parks with benches and trees on the default city (what the draw is shown)", () => {
    expect(defaultCity.courts.length).toBeGreaterThan(5);
    expect(defaultCity.alleyBins.length).toBeGreaterThan(5);
    expect(defaultCity.greenProps.some((g) => g.key === "bench")).toBe(true);
    expect(defaultCity.greenProps.some((g) => g.key === "tree")).toBe(true);
    expect(gatePlan(defaultCity)).toEqual([]);
  });
});

// ---- ticket 063 D and H: the passage floors from the slab, the alley mouths paved ----

describe("the passage floors are the plain slab, a whole cell at a time (063 D)", () => {
  it("lays one slab for each whole 5 m of a wide floor and a code quad for the part cell, each slab flat on the walk at the apron's level", () => {
    // A floor 12.6 m wide and one cell deep: two whole cells and a 2.6 m part cell.
    const wide = withPassages(defaultCity, [passage(55, 12.5, 12.6, 0, "r:w")]);
    const p = pack();
    const base = interiorGroup(withPassages(defaultCity, []), p.roots, p.entries);
    const draw = interiorGroup(wide, p.roots, p.entries);
    const slab = TILE_SLOTS.apron[0]!;
    expect(draw.perKey.get(slab)).toBe(base.perKey.get(slab)! + 2);
    const pave = named(draw.group, "interior:code-pavement")[0]!;
    expect(pave.count, "the one part cell").toBe(1);
    const part = at(pave, 0);
    expect([part.scale.x, part.scale.z].map((v) => Math.round((v / S) * 1000) / 1000)).toEqual([2.6, TILE_M]);
    // The two whole slabs are the last two instances of the slab's mesh, side by side from the floor's low x, at the apron's level.
    const im = named(draw.group, `interior:${shortName(slab)}`)[0]!;
    const last = [at(im, im.count - 2), at(im, im.count - 1)];
    expect(last.map((m) => Math.round((m.pos.x / S) * 1000) / 1000)).toEqual([55 - 6.3 + 2.5, 55 - 6.3 + 7.5]);
    for (const m of last) {
      expect(m.pos.z / S).toBeCloseTo(15, 6);
      expect(m.pos.y / S).toBeCloseTo(TILE_BASE_M[slab]!, 6);
      for (const s of [m.scale.x, m.scale.y, m.scale.z]) expect(s / S).toBeCloseTo(1, 6);
    }
    // Without the slab in the pack the whole floor is one code quad, as before.
    const q = pack([slab]);
    const code = interiorGroup(wide, q.roots, q.entries);
    expect(named(code.group, "interior:code-pavement")[0]!.count).toBe(items0(wide).filter((it) => ["strip", "apron", "path", "parkEdge", "inlet"].includes(it.kind)).length + 1);
    base.dispose();
    draw.dispose();
    code.dispose();
  });
});

const items0 = (city: TileCity): InteriorItem[] => interiorItems(city);

describe("the paved inlets (063 H, Josh, 19 Nov 2026: \"If you're going to have an inlet to areas between buildings it needs to be paved\")", () => {
  it("draws an alley's two mouth cells from the slab at the walk, and the lane beyond them from the bare road", () => {
    const p = pack();
    const draw = interiorGroup(defaultCity, p.roots, p.entries);
    const slab = TILE_SLOTS.apron[0]!;
    const bare = TILE_SLOTS.alley[0]!;
    const items = interiorItems(defaultCity);
    const mouth = items.filter((it) => it.kind === "inlet");
    const lane = items.filter((it) => it.kind === "bare" && it.role === "alley");
    expect(mouth.length).toBeGreaterThan(0);
    expect(mouth.every((it) => it.role === "alley")).toBe(true);
    expect(lane.length, "the lane beyond ring 1 stays the bare road").toBeGreaterThan(mouth.length);
    // Each mouth cell is the first or last cell of its lane, in the block's outermost ring.
    const cells = new Set(inletCells(defaultCity).mouths.map((q) => cellKey(q.i, q.j)));
    for (const it of mouth) expect(cells.has(cellKey(it.i, it.j))).toBe(true);
    expect(mouth).toHaveLength(cells.size);
    const im = named(draw.group, `interior:${shortName(slab)}`)[0]!;
    const slabItems = items.filter((it) => ["strip", "apron", "path", "parkEdge", "inlet"].includes(it.kind));
    expect(im.count).toBe(slabItems.length);
    slabItems.forEach((it, i) => {
      if (it.kind !== "inlet") return;
      const m = at(im, i);
      expect([m.pos.x / S, m.pos.z / S, m.pos.y / S].map((v) => Math.round(v * 1e4) / 1e4)).toEqual([it.x_m, it.z_m, TILE_BASE_M[slab]!]);
    });
    const bareMesh = named(draw.group, `interior:${shortName(bare)}`)[0]!;
    expect(bareMesh.count).toBe(items.filter((it) => it.kind === "bare").length);
    draw.dispose();
  });

  it("draws an alley's mouth cells in code as pavement when the slab is absent, and the lane beyond as the bare road", () => {
    const slab = TILE_SLOTS.apron[0]!;
    const q = pack([slab]);
    const draw = interiorGroup(defaultCity, q.roots, q.entries);
    const items = interiorItems(defaultCity);
    const flat = items.filter((it) => ["strip", "apron", "path", "parkEdge", "inlet"].includes(it.kind)).length;
    expect(named(draw.group, "interior:code-pavement")[0]!.count).toBe(flat);
    expect(draw.perKey.has(slab)).toBe(false);
    draw.dispose();
  });

  it("changes no city data: drawing the tiles and the interiors leaves the city exactly as it was", () => {
    const before = JSON.stringify(defaultCity);
    const p = pack();
    interiorGroup(defaultCity, p.roots, p.entries).dispose();
    expect(JSON.stringify(defaultCity)).toBe(before);
    expect(JSON.stringify(tileCity())).toBe(before);
  });
});
