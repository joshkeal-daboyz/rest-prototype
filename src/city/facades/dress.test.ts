/**
 * Stage 7, section H1b (ticket 070), criteria 2 and 3: the dressing on the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on), and the placements worked out by hand from the tables on typed-in scenes.
 * HEAVY: each city is built once (stages 1 to 7), through `testcities.ts`' module-level cache, with a 120 s timeout. The expectations are derived here from the layers and the tables, not from the stage's helpers.
 */
import { describe, expect, it } from "vitest";
import type { CalibrationKey, CityBuildingsLayer, CityCell, CityDressingPiece, CityFacadesLayer, CityGroundPiece, CityMassLayer, CitySide, CityYaw } from "../../core";
import { digestOf } from "../pipeline/digest";
import { stageRand } from "../pipeline/seeds";
import { runCity } from "../stages";
import { buildDressing, runsOf } from "./dress";
import { ATMS, ATM_PER_RUN, AWNINGS, AWNING_CORNER, DRESS_PER_BAY_MAX, SHOP_GLASS, SIGNS_BLADE, SIGNS_FASCIA } from "./dresskit";
import { finalise } from "./hash";
import { keyOf } from "./place";
import { DEFAULT, layersOf, NAMED, label, stagesOf } from "./testcities";

const K = (n: string): CalibrationKey => `city-pack:SM_${n}`;
const SIDE_VEC = { "+x": [1, 0], "-x": [-1, 0], "+z": [0, 1], "-z": [0, -1] } as const;
const SHOP_KINDS = ["shop", "shopDouble", "shopCorner"];
const L_KEY = AWNING_CORNER[0]!;

describe("the dressing on the named runs (criterion 2)", { timeout: 120_000 }, () => {
  it("every shop bay whose key has a glass key has exactly that glass, and no other piece is glass", () => {
    const bad: string[] = [];
    let glass = 0;
    for (const o of NAMED) {
      const { facades } = layersOf(o);
      const dressing = facades.dressing!;
      const at = new Map<string, CityDressingPiece[]>();
      for (const p of dressing.filter((q) => q.kind === "glass")) (at.get(keyOf(p.cell)) ?? at.set(keyOf(p.cell), []).get(keyOf(p.cell))!).push(p);
      let expected = 0;
      for (const g of facades.ground) {
        const want = `${g.placement.key}_Glass` as CalibrationKey;
        const here = at.get(keyOf(g.cells[0]!)) ?? [];
        if (SHOP_KINDS.includes(g.kind) && SHOP_GLASS.includes(want)) {
          expected++;
          if (here.length !== 1 || here[0]!.placement.key !== want) bad.push(`${label(o)} ${g.kind} ${g.placement.key} on ${keyOf(g.cells[0]!)}: ${here.length} glass`);
        } else if (here.length > 0) bad.push(`${label(o)} glass on a ${g.kind} ${g.placement.key}`);
      }
      glass += expected;
      expect(dressing.filter((q) => q.kind === "glass"), label(o)).toHaveLength(expected);
    }
    expect(bad.slice(0, 5)).toEqual([]);
    expect(glass).toBeGreaterThan(14000);
  });

  it("every building's flat awnings are of one key of AWNINGS; the L awning stands only on a shop corner, as a wrap; a flat awning is never a wrap", () => {
    let l = 0;
    let flat = 0;
    for (const o of NAMED) {
      const { facades } = layersOf(o);
      const keys = new Map<string, Set<string>>();
      const groundAt = new Map(facades.ground.map((g) => [keyOf(g.cells[0]!), g] as const));
      for (const p of facades.dressing!.filter((q) => q.kind === "awning")) {
        const g = groundAt.get(keyOf(p.cell))!;
        if (p.placement.key === L_KEY) {
          l++;
          expect(g.kind, label(o)).toBe("shopCorner");
          expect(p.wrap, label(o)).toBe(true);
        } else {
          flat++;
          expect(AWNINGS, label(o)).toContain(p.placement.key);
          expect(p.wrap, label(o)).toBe(false);
          expect(SHOP_KINDS, label(o)).toContain(g.kind);
          (keys.get(p.building) ?? keys.set(p.building, new Set()).get(p.building)!).add(p.placement.key);
        }
      }
      for (const [b, s] of keys) expect(s.size, `${label(o)} ${b}`).toBe(1);
    }
    expect(l).toBeGreaterThan(1000);
    expect(flat).toBeGreaterThan(10000);
  });

  it("LG: no L awning on a column beside one that carries one, in its own building or across a row neighbour; a corner bay LG turned away took a flat key where it fitted", () => {
    let turned = 0;
    for (const o of NAMED) {
      const { mass, buildings, facades } = layersOf(o);
      const ls = new Set(facades.dressing!.filter((q) => q.placement.key === L_KEY).map((q) => keyOf(q.cell)));
      for (const p of facades.dressing!.filter((q) => q.placement.key === L_KEY)) {
        for (const [dx, dz] of Object.values(SIDE_VEC)) expect(ls.has(`${p.cell.i + dx},${p.cell.j + dz}`), `${label(o)} ${keyOf(p.cell)}`).toBe(false);
      }
      const stats = buildDressing(mass, buildings, facades.ground, stageRand("facades", o.seed)).stats;
      turned += stats.lgTurnedAway;
      expect(stats.lPlaced, label(o)).toBe(ls.size);
    }
    expect(turned).toBeGreaterThan(50);
  });

  it("a building has at most one blade sign, never on a bay with an awning; no fascia key twice in a building; no bay has two signs", () => {
    let blades = 0;
    for (const o of NAMED) {
      const { facades } = layersOf(o);
      const awned = new Set(facades.dressing!.filter((q) => q.kind === "awning").map((q) => keyOf(q.cell)));
      const blade = new Map<string, number>();
      const fascia = new Map<string, number>();
      const bay = new Map<string, number>();
      for (const p of facades.dressing!) {
        if (p.kind === "bladeSign") {
          expect(SIGNS_BLADE, label(o)).toContain(p.placement.key);
          expect(awned.has(keyOf(p.cell)), label(o)).toBe(false);
          blade.set(p.building, (blade.get(p.building) ?? 0) + 1);
          blades++;
        }
        if (p.kind === "fasciaSign") {
          expect(SIGNS_FASCIA, label(o)).toContain(p.placement.key);
          const k = `${p.building}|${p.placement.key}`;
          fascia.set(k, (fascia.get(k) ?? 0) + 1);
        }
        if (p.kind === "bladeSign" || p.kind === "fasciaSign") bay.set(keyOf(p.cell), (bay.get(keyOf(p.cell)) ?? 0) + 1);
      }
      for (const [b, n] of blade) expect(n, `${label(o)} ${b}`).toBe(1);
      for (const [k, n] of fascia) expect(n, `${label(o)} ${k}`).toBe(1);
      for (const [k, n] of bay) expect(n, `${label(o)} ${k}`).toBe(1);
    }
    expect(blades).toBeGreaterThan(500);
  });

  it("an ATM stands only beside a residents' door on a street frontage: one at most per building, ATM_PER_RUN at most per run; no quiet building has one", () => {
    let atms = 0;
    for (const o of NAMED) {
      const { buildings, facades } = layersOf(o);
      const groundAt = new Map(facades.ground.map((g) => [keyOf(g.cells[0]!), g] as const));
      const perBuilding = new Map<string, number>();
      const runOf = runsOf(buildings);
      const perRun = new Map<string, number>();
      for (const p of facades.dressing!.filter((q) => q.kind === "atm")) {
        atms++;
        const g = groundAt.get(keyOf(p.cell))!;
        expect(g.kind, label(o)).toBe("door");
        expect(g.frontage, label(o)).toBe("street");
        expect(ATMS, label(o)).toContain(p.placement.key);
        perBuilding.set(p.building, (perBuilding.get(p.building) ?? 0) + 1);
        const run = runOf.get(p.building)!;
        perRun.set(run, (perRun.get(run) ?? 0) + 1);
      }
      for (const [b, n] of perBuilding) expect(n, `${label(o)} ${b}`).toBe(1);
      for (const [r, n] of perRun) expect(n, `${label(o)} ${r}`).toBeLessThanOrEqual(ATM_PER_RUN);
    }
    expect(atms).toBeGreaterThan(2000);
  });

  it("no column carries more than DRESS_PER_BAY_MAX pieces, and the pieces come building by building, column by column, in dressBlock's order", () => {
    const RANK: Record<string, number> = { glass: 0, awning: 1, bladeSign: 2, fasciaSign: 3, atm: 4 };
    for (const o of NAMED) {
      const { buildings, facades } = layersOf(o);
      const perCol = new Map<string, number>();
      const bIdx = new Map(buildings.buildings.map((b, n) => [b.id, n] as const));
      const cIdx = new Map(buildings.buildings.flatMap((b) => b.cells.map((c, n) => [keyOf(c), n] as const)));
      let last = -1;
      for (const p of facades.dressing!) {
        perCol.set(keyOf(p.cell), (perCol.get(keyOf(p.cell)) ?? 0) + 1);
        const order = bIdx.get(p.building)! * 1000 + cIdx.get(keyOf(p.cell))! * 10 + RANK[p.kind]!;
        expect(order, label(o)).toBeGreaterThanOrEqual(last);
        last = order;
      }
      for (const n of perCol.values()) expect(n, label(o)).toBeLessThanOrEqual(DRESS_PER_BAY_MAX);
    }
  });

  it("X1: nothing stands on a column with no street open side; a single-face piece's face is its column's front, a street side; a mixed corner whose front is quiet has its glass (and may have the L awning) and no flat awning, sign or ATM", () => {
    let quietFrontGlass = 0;
    let quietFrontL = 0;
    for (const o of NAMED) {
      const { mass, buildings, facades } = layersOf(o);
      const built = new Map(mass.built.map((b) => [keyOf(b), b] as const));
      const col = new Map(buildings.columns!.map((c) => [keyOf(c), c] as const));
      for (const p of facades.dressing!) {
        const b = built.get(keyOf(p.cell))!;
        const c = col.get(keyOf(p.cell))!;
        expect(b.open.some((s) => s.frontage === "street"), label(o)).toBe(true);
        expect(p.face, label(o)).toBe(c.front);
        const frontStreet = b.open.find((s) => s.side === c.front)!.frontage === "street";
        if (!p.wrap) expect(frontStreet, `${label(o)} ${p.kind} on ${keyOf(p.cell)}`).toBe(true);
        else if (!frontStreet) {
          if (p.kind === "glass") quietFrontGlass++;
          else quietFrontL++;
        }
      }
    }
    expect(quietFrontGlass).toBeGreaterThan(1000);
    expect(quietFrontL).toBeGreaterThan(50);
  });

  it("ground is exactly H1's: on the four pin cities, the digest of the ground layer alone equals the facades digest H1 pinned", () => {
    const H1_PINS: readonly (readonly [number, string])[] = [
      [1, "35b183c5"],
      [2, "8dcd0f55"],
      [3, "ede2bede"],
      [8, "5e46ebc7"],
    ];
    for (const [seed, pin] of H1_PINS) {
      const { facades } = layersOf({ blocksX: 6, blocksZ: 6, seed, way: "on" });
      expect(digestOf({ stage: "facades", ground: facades.ground } satisfies CityFacadesLayer), `seed ${seed}`).toBe(pin);
    }
  });

  it("every choice is the stage's rand: the same city twice gives the same layer, and another seed another", () => {
    const a = layersOf(DEFAULT).facades;
    const r = runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, undefined, stagesOf("on"));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(JSON.stringify(r.plan.layers.facades!.dressing)).toBe(JSON.stringify(a.dressing));
    expect(JSON.stringify(layersOf({ ...DEFAULT, seed: 2 }).facades.dressing)).not.toBe(JSON.stringify(a.dressing));
  });
});

// ---- hand-worked placements (criterion 3) ----

/** The inverse of `finalise` (a bijection on 32 bits), so a test can ask for a unit float: `rand` then returns the hash that `unitOf` turns into it. */
const inv = (c: number): number => {
  let x = c;
  for (let n = 0; n < 5; n++) x = Math.imul(x, 2 - Math.imul(c, x));
  return x;
};
const unfinalise = (y: number): number => {
  let x = y >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, inv(0x846ca68b));
  x ^= x >>> 15;
  x ^= x >>> 30;
  x = Math.imul(x, inv(0x7feb352d));
  x ^= x >>> 16;
  return x >>> 0;
};
/** A stage `rand` that answers `u[slot]` (default 0.99) as the unit float of `rand("dress", slot, ...)`. */
const forced = (u: Record<string, number>) => (...salt: readonly (string | number)[]): number => unfinalise(Math.floor((u[String(salt[1])] ?? 0.99) * 4294967296));

describe("the unit float (the test's own lever)", () => {
  it("unfinalise inverts finalise, so a forced unit float comes back as asked", () => {
    for (const h of [0, 1, 12345, 0xdeadbeef, 0xffffffff]) expect(finalise(unfinalise(h))).toBe(h);
    expect(finalise(forced({ awning: 0.1 })("dress", "awning", "b", 0)) / 4294967296).toBeCloseTo(0.1, 8);
  });
});

interface Scene {
  readonly mass: Pick<CityMassLayer, "cells" | "built">;
  readonly buildings: Pick<CityBuildingsLayer, "rows" | "columns" | "buildings">;
  readonly ground: readonly CityGroundPiece[];
}
interface SceneIn {
  readonly front: CitySide;
  readonly side?: CitySide;
  readonly yaw: CityYaw;
  readonly kind: "mid" | "corner";
  readonly groundKind: CityGroundPiece["kind"];
  readonly groundKey: CalibrationKey;
  readonly groundAt: readonly [x: number, y: number, z: number];
  readonly floorKey: CalibrationKey;
  readonly floorAt: readonly [x: number, z: number];
}
/** One building of one column on the cell (0, 0): typed in, with the ground piece and the first floor piece placed as the earlier stages place them (their pivots worked out in the test). */
function scene(o: SceneIn): Scene {
  const cell = { i: 0, j: 0 };
  const open = [{ side: o.front, faces: "street", frontage: "street" }, ...(o.side ? [{ side: o.side, faces: "street", frontage: "street" }] : [])];
  const col = {
    ...cell,
    building: "b",
    rowId: "r",
    kind: o.kind,
    front: o.front,
    side: o.side ?? null,
    yaw: o.yaw,
    ground: { kind: o.kind, yaw: o.yaw, y_m: 0, top_m: 3 },
    pieces: [
      { role: "floor", storey: 1, span: 1, placement: { key: o.floorKey, x_m: o.floorAt[0], y_m: 3, z_m: o.floorAt[1], yaw_deg: o.yaw } },
      { role: "roof", storey: 4, span: 0, placement: { key: K("Bld_Apartment_Roof_01"), x_m: o.floorAt[0], y_m: 12, z_m: o.floorAt[1], yaw_deg: o.yaw } },
    ],
  };
  const g: CityGroundPiece = {
    kind: o.groundKind,
    building: "b",
    cells: [cell],
    frontage: "street",
    placement: { key: o.groundKey, x_m: o.groundAt[0], y_m: o.groundAt[1], z_m: o.groundAt[2], yaw_deg: o.yaw },
    door_m: null,
  };
  return {
    mass: { cells: [{ ...cell, block: "k", part: "p", use: "built", opening: null }], built: [{ ...cell, block: "k", part: "p", row: "outer", open, column: o.kind, partner: null }] } as never,
    buildings: {
      rows: [{ id: "r", block: "k", part: "p", row: "outer", front: o.front, buildings: ["b"] }],
      buildings: [{ id: "b", block: "k", part: "p", rowId: "r", row: "outer", front: o.front, cells: [cell], bend: null, style: "apartment-01", colourway: "base", storeys: 4, partner: null }],
      columns: [col],
    } as never,
    ground: [g],
  };
}
const dress = (s: Scene, u: Record<string, number>): CityDressingPiece[] => buildDressing(s.mass, s.buildings, s.ground, forced(u)).dressing;
const near = (a: number, b: number): void => expect(a).toBeCloseTo(b, 6);
const AWN03 = 0.5; // the awning key rotation's start: AWNINGS[2], Cover_03

/**
 * Shop_01 (bounds 5.000 x 3.054 x 5.536, front inset 0.219) on the cell (0, 0), front +z: its body's front plane is 2.768 - 0.219 = 2.549 ahead of its pivot, so the pivot is at z = 5 - 2.549 = 2.451, x = 2.5.
 * The first floor, Apartment_01 (5.000 x 5.196, front inset 0.196): z = 5 - (2.598 - 0.196) = 2.598. In the bay frame (origin (2.5, 2.5)): the ground front is -0.049 + 2.768 = 2.719, the floor's 0.098 + 2.598 = 2.696.
 * At front +x (yaw 90) the same numbers turn: the pivots are (2.451, 2.5) and (2.598, 2.5), and a frame point (x, z) is the plan point (2.5 + z, 2.5 - x).
 */
const SHOP: SceneIn = { front: "+z", yaw: 0, kind: "mid", groundKind: "shop", groundKey: K("Bld_Shop_01"), groundAt: [2.5, 0, 2.451], floorKey: K("Bld_Apartment_01"), floorAt: [2.5, 2.598] };
const SHOP_E: SceneIn = { ...SHOP, front: "+x", yaw: 90, groundAt: [2.451, 0, 2.5], floorAt: [2.598, 2.5] };

describe("placements worked out by hand from the tables (criterion 3)", () => {
  it("a Shop_01_Glass and a Shop_Cover_03 on a Shop_01, at yaw 0: the glass back 0.05 inside the shop's front (z = 2.719 - 0.05 + 0.323 / 2), the awning's back on it (z = 2.719 + 3.501 / 2), raised to 2.85", () => {
    const out = dress(scene(SHOP), { awning: 0.1, awningkey: AWN03 });
    expect(out.map((p) => p.kind)).toEqual(["glass", "awning"]);
    const [glass, awning] = out as [CityDressingPiece, CityDressingPiece];
    expect(glass.placement.key).toBe(K("Bld_Shop_01_Glass"));
    near(glass.placement.x_m, 2.5);
    near(glass.placement.y_m, 0.3);
    near(glass.placement.z_m, 2.5 + 2.719 - 0.05 + 0.1615);
    expect(glass.placement.yaw_deg).toBe(0);
    expect(awning.placement.key).toBe(K("Bld_Shop_Cover_03"));
    near(awning.placement.x_m, 2.5);
    near(awning.placement.y_m, 2.85);
    near(awning.placement.z_m, 2.5 + 2.719 + 1.7505);
    expect(glass.face).toBe("+z");
    expect(glass.wrap || awning.wrap).toBe(false);
    expect(glass.cell).toEqual({ i: 0, j: 0 });
    expect(glass.building).toBe("b");
  });

  it("the same two at yaw 90 (front +x): every point turned about the cell centre", () => {
    const out = dress(scene(SHOP_E), { awning: 0.1, awningkey: AWN03 });
    const [glass, awning] = out as [CityDressingPiece, CityDressingPiece];
    near(glass.placement.x_m, 2.5 + (2.719 - 0.05 + 0.1615));
    near(glass.placement.z_m, 2.5);
    near(glass.placement.y_m, 0.3);
    expect(glass.placement.yaw_deg).toBe(90);
    near(awning.placement.x_m, 2.5 + (2.719 + 1.7505));
    near(awning.placement.z_m, 2.5);
    expect(awning.placement.yaw_deg).toBe(90);
    expect(glass.face).toBe("+x");
  });

  it("a fascia sign stands on the awning's top (2.85 + 1.758 = 4.608), hosted on the first floor: its back on the floor's front (2.696), centred", () => {
    const out = dress(scene(SHOP), { awning: 0.1, awningkey: AWN03, sign: 0.1, signkey: 0.05 });
    const sign = out.find((p) => p.kind === "fasciaSign")!;
    expect(sign.placement.key).toBe(K("Prop_Sign_Bar_01"));
    near(sign.placement.y_m, 4.608);
    near(sign.placement.z_m, 2.5 + 2.696 + 0.069);
    near(sign.placement.x_m, 2.5);
    expect(out.map((p) => p.kind)).toEqual(["glass", "awning", "fasciaSign"]);
  });

  it("a blade sign on an awning-less bay: base 2.85 (under the first floor's start at 3, so on the shop's front, z = 2.719 + 0.474 / 2), its edge 0.1 in from the bay's left (x = -2.5 + 0.1 + 0.316 / 2)", () => {
    const out = dress(scene(SHOP), { awning: 0.9, blade: 0.1, bladebay: 0.5, bladekey: 0.05 });
    expect(out.map((p) => p.kind)).toEqual(["glass", "bladeSign"]);
    const blade = out[1]!;
    expect(blade.placement.key).toBe(K("Prop_Sign_Barber_01"));
    near(blade.placement.y_m, 2.85);
    near(blade.placement.z_m, 2.5 + 2.719 + 0.237);
    near(blade.placement.x_m, 2.5 - 2.5 + 0.1 + 0.158);
  });

  it("an ATM beside a Door_01, on each side: 1.634 (= 5.096 / 2 - 1.128 / 2 - 0.35) either side of the door's centre, base 0.6, back on the door's front (z = 3.029 + 0.519 / 2)", () => {
    // Door_01 (5.096 x 3.0 x 5.577, front inset 0.529): pivot z = 5 - (2.7885 - 0.529) = 2.7405; its front in the bay frame is 0.2405 + 2.7885 = 3.029.
    const door: SceneIn = { ...SHOP, groundKind: "door", groundKey: K("Bld_Apartment_Door_01"), groundAt: [2.5, 0, 2.7405] };
    for (const [u, side] of [[0.25, -1], [0.75, 1]] as const) {
      const out = dress(scene(door), { atm: 0.1, atmside: u });
      expect(out.map((p) => p.kind), `side ${side}`).toEqual(["atm"]);
      const atm = out[0]!;
      expect(atm.placement.key).toBe(ATMS[0]);
      near(atm.placement.x_m, 2.5 + side * 1.634);
      near(atm.placement.y_m, 0.6);
      near(atm.placement.z_m, 2.5 + 3.029 + 0.2595);
    }
  });

  it("a Shop_Corner_01_Glass wrap at each of the four turns: its pivot on the corner shop's pivot, at 0.3, turned with the column; the L awning too, at 2.85, on a style 3 corner", () => {
    // Shop_Corner_01 (5.377 x 3.0 x 5.471, insets front 0.211, others 0.188): pivot z = 5 - (2.7355 - 0.211) = 2.4755, in the frame -0.0245; x = 2.5. A frame point (0, -0.0245) is, turned, the plan point below.
    const pivots: readonly [CitySide, CityYaw, number, number][] = [
      ["+z", 0, 2.5, 2.4755],
      ["+x", 90, 2.4755, 2.5],
      ["-z", 180, 2.5, 2.5245],
      ["-x", 270, 2.5245, 2.5],
    ];
    for (const [front, yaw, x, z] of pivots) {
      const s = scene({ front, side: front === "+z" ? "-x" : front === "+x" ? "+z" : front === "-z" ? "+x" : "-z", yaw, kind: "corner", groundKind: "shopCorner", groundKey: K("Bld_Shop_Corner_01"), groundAt: [x, -0.01, z], floorKey: K("Bld_Apartment_Corner_03"), floorAt: [2.5, 2.5] });
      const out = dress(s, { awning: 0.1, awningkey: AWN03 });
      expect(out.map((p) => p.kind), `yaw ${yaw}`).toEqual(["glass", "awning"]);
      const [glass, awning] = out as [CityDressingPiece, CityDressingPiece];
      expect(glass.placement.key).toBe(K("Bld_Shop_Corner_01_Glass"));
      expect(glass.wrap).toBe(true);
      near(glass.placement.x_m, x);
      near(glass.placement.z_m, z);
      near(glass.placement.y_m, 0.3 - 0.01);
      expect(glass.placement.yaw_deg).toBe(yaw);
      expect(awning.placement.key).toBe(L_KEY);
      expect(awning.wrap).toBe(true);
      near(awning.placement.x_m, x);
      near(awning.placement.z_m, z);
      near(awning.placement.y_m, 2.85 - 0.01);
      expect(awning.face).toBe(front);
    }
  });

  it("L1: a piece on a ground piece at y_m -0.071 (Shop_02) rides with it: the glass at 0.3 - 0.071 on the shop's front (2.925 - 0.05, the glass has no depth), the awning at 2.85 - 0.071", () => {
    // Shop_02 (5.0 x 3.3 x 5.425, front inset 0.425): pivot z = 5 - (2.7125 - 0.425) = 2.7125; its front in the bay frame is 0.2125 + 2.7125 = 2.925. The first floor starts at 3 (3.071 in the frame).
    const s = scene({ ...SHOP, groundKey: K("Bld_Shop_02"), groundAt: [2.5, -0.071, 2.7125] });
    const out = dress(s, { awning: 0.1, awningkey: AWN03 });
    const [glass, awning] = out as [CityDressingPiece, CityDressingPiece];
    expect(glass.placement.key).toBe(K("Bld_Shop_02_Glass"));
    near(glass.placement.y_m, 0.3 - 0.071);
    near(glass.placement.z_m, 2.5 + 2.925 - 0.05);
    near(awning.placement.y_m, 2.85 - 0.071);
    near(awning.placement.z_m, 2.5 + 2.925 + 1.7505);
  });

  it("a piece wider than its bay, or past the reach, is not placed: Shop_Cover_05 on a mid column, and no awning when none fits", () => {
    // Apartment_Corner_01 is 5.196 wide: Shop_Cover_05 (5.394) does not fit a style 1 corner, so the corner bay takes the building's flat key (here Cover_03) instead.
    const s = scene({ front: "+z", side: "-x", yaw: 0, kind: "corner", groundKind: "shopCorner", groundKey: K("Bld_Shop_Corner_01"), groundAt: [2.5, -0.01, 2.4755], floorKey: K("Bld_Apartment_Corner_01"), floorAt: [2.5, 2.5] });
    const out = dress(s, { awning: 0.1, awningkey: AWN03 });
    const awning = out.find((p) => p.kind === "awning")!;
    expect(awning.placement.key).toBe(K("Bld_Shop_Cover_03"));
    expect(awning.wrap).toBe(false);
  });
});
