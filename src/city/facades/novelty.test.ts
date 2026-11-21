/**
 * Stage 7, section H1c (ticket 070), on the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on): the shop kinds (criterion 2), NP, F and RS (3) and the placements, worked by hand (4).
 * HEAVY: each city is built once (stages 1 to 7), through `testcities.ts`' module-level cache; `buildRoofs` is rerun with and without the plan on each. R-2: the stage returns ok on all 20 named runs; nothing is loosened.
 * The expectations are derived here from the layers and the kit's numbers, in plan coordinates and by hand, as far as the stage's own helpers can be left out (`baysOf` finds a bay, `faceFit` is run on the hand-worked cases).
 * Josh's words (21 Nov 2026, Q26): "Yes, all four"; Q27: "Yes" to the one-building R8 change.
 */
import { describe, expect, it } from "vitest";
import type { CityBuildingsLayer, CityCell, CityColumn, CityFacadesLayer, CityMassLayer, CityRoofPiece, CityShop } from "../../core";
import { digestOf } from "../pipeline/digest";
import { stageRand } from "../pipeline/seeds";
import { baysOf, runsOf } from "./dress";
import { DRESS_PER_BAY_MAX, FLOOR_HOST, dressBounds } from "./dresskit";
import { makeCtx } from "./facts";
import { unitOf } from "./hash";
import { NOVELTY_BY_KIND, NOVELTY_PER_RUN, SHOP_KINDS, noveltyBounds } from "./noveltykit";
import { faceFit, nearBoxes, placedBoxes, placeFaceSigns, planNovelty } from "./novelty";
import { roofReport } from "./roofcheck";
import { P_ROOF_LARGE, ROOF_BOUNDS } from "./roofkit";
import { buildRoofs, roofInsets } from "./roofs";
import { buildShops } from "./shops";
import { cityOf, label, layersOf, NAMED, type City } from "./testcities";
import { wallBounds } from "./wallkit";
import { partyBounds, PARTY_WALL_KINDS } from "./partykit";

const key = (c: CityCell): string => `${c.i},${c.j}`;
const TOL = 1e-6;
const SHOPS = ["shop", "shopDouble", "shopCorner"];
const BIG = ["waterTower", "exit", "billboard", "novelty"];

/** A point of a column's own frame in the plan, by hand (three.js's turn: at 90 a piece's own +z faces +x). */
const turn = (yaw: number, x: number, z: number): { x: number; z: number } => {
  const q = ((Math.round(yaw / 90) % 4) + 4) % 4;
  const r = [
    { x, z },
    { x: z, z: -x },
    { x: -x, z: -z },
    { x: -z, z: x },
  ][q]!;
  return { x: r.x + 0, z: r.z + 0 };
};
const centre = (c: CityCell): { x: number; z: number } => ({ x: (c.i + 0.5) * 5, z: (c.j + 0.5) * 5 });
/** The signed difference of two angles, as a quarter count 0 to 3. */
const quarter = (from: number, to: number): number => ((((Math.round((to - from) / 90) % 4) + 4) % 4) as number);

interface View {
  readonly o: City;
  readonly mass: CityMassLayer;
  readonly buildings: CityBuildingsLayer;
  readonly layer: CityFacadesLayer;
  readonly colAt: Map<string, CityColumn>;
  readonly shopOf: Map<string, CityShop>;
}
const views = new Map<string, View>();
function viewOf(o: City): View {
  const k = label(o);
  if (!views.has(k)) {
    const { mass, buildings, facades } = layersOf(o);
    const shopOf = new Map<string, CityShop>();
    for (const s of facades.shops!) for (const c of s.cells) shopOf.set(key(c), s);
    views.set(k, { o, mass, buildings, layer: facades, colAt: new Map(buildings.columns!.map((c) => [key(c), c] as const)), shopOf });
  }
  return views.get(k)!;
}
/** H3b's roofs: `buildRoofs` with no plan. */
const noPlanOf = (v: View): CityRoofPiece[] => buildRoofs(v.mass, v.buildings, { dressing: v.layer.dressing!, walls: v.layer.walls! }, stageRand("facades", v.o.seed)).roofs;

/** What H1b's nine sign keys say about a trade, by hand. */
const tradeOf = (k: string): string | null => {
  if (/Sign_(Bar|Pub)_01$/.test(k)) return "bar";
  if (/Sign_Cafe_01$/.test(k)) return "cafe";
  if (/Sign_Chinese_Noodles_01$/.test(k)) return "noodles";
  if (/Sign_(Pizza|DeliPizza)_01$/.test(k)) return "pizza";
  if (/Sign_Barber_01$/.test(k)) return "barber";
  if (/Sign_Hotel_01$/.test(k)) return "hotel";
  return null;
};

describe("stage 7 on the named runs with the shops and novelty signs (R-2)", { timeout: 300_000 }, () => {
  it("the stage returns ok on all 20 named runs, and the shops and novelty layers are present", () => {
    const bad: string[] = [];
    for (const o of NAMED) {
      const r = cityOf(o);
      if (!r.ok) bad.push(`${label(o)}: ${r.failure.stage}: ${r.failure.reason}`);
      else if (!r.plan.layers.facades!.shops || !r.plan.layers.facades!.novelty) bad.push(`${label(o)}: no shops or novelty`);
    }
    expect(bad).toEqual([]);
  });
});

describe("SK, the shop kinds (criterion 2)", { timeout: 300_000 }, () => {
  it("one shop for every shop ground piece, in ground's order, with its cells; a trade-signed shop has its sign's kind from the sign; every other shop is from the hash and, where its building has fewer than 16 shops, has a kind no other shop of its building has; both sources on every run", () => {
    const wrong: string[] = [];
    for (const o of NAMED) {
      const v = viewOf(o);
      const grounds = v.layer.ground.filter((g) => SHOPS.includes(g.kind));
      const shops = v.layer.shops!;
      expect(shops.length, label(o)).toBe(grounds.length);
      const signAt = new Map<string, string>();
      for (const p of v.layer.dressing!) if (p.kind === "fasciaSign" || p.kind === "bladeSign") signAt.set(key(p.cell), p.placement.key);
      let sign = 0;
      let hash = 0;
      grounds.forEach((g, n) => {
        const s = shops[n]!;
        if (s.building !== g.building || s.cells.map(key).join("|") !== g.cells.map(key).join("|")) wrong.push(`${label(o)} shop ${n} is not its ground piece's`);
        if (!SHOP_KINDS.includes(s.kind)) wrong.push(`${label(o)} ${key(s.cells[0]!)}: ${s.kind} is not a kind`);
        const sk = signAt.get(key(g.cells[0]!));
        const trade = sk === undefined ? null : tradeOf(sk);
        if (trade !== null) {
          sign++;
          if (s.kind !== trade || s.source !== "sign" || s.sign !== sk) wrong.push(`${label(o)} ${key(s.cells[0]!)}: sign ${sk} but ${s.kind} from ${s.source}`);
        } else {
          hash++;
          if (s.source !== "hash" || s.sign !== null) wrong.push(`${label(o)} ${key(s.cells[0]!)}: no trade sign but from ${s.source}`);
          const same = shops.filter((q) => q.building === s.building && q !== s && q.kind === s.kind);
          if (grounds.filter((q) => q.building === g.building).length < 16 && same.length > 0) wrong.push(`${label(o)} ${key(s.cells[0]!)}: ${s.kind} twice in building ${s.building}`);
        }
      });
      expect(sign, `${label(o)} has shops read from a sign`).toBeGreaterThan(0);
      expect(hash, `${label(o)} has shops from the hash`).toBeGreaterThan(0);
    }
    expect(wrong.slice(0, 5)).toEqual([]);
  });

  it("the same ground, dressing and rand give the same shops again (R-3)", () => {
    const v = viewOf(NAMED[0]!);
    expect(buildShops(v.buildings, v.layer.ground, v.layer.dressing!, stageRand("facades", v.o.seed))).toEqual(v.layer.shops);
  });
});

describe("NP, F and RS (criterion 3)", { timeout: 300_000 }, () => {
  it("at most one sign (face or roof) a B2 run and one a shop; every sign's key is of its shop's kind (NM); no barber or hotel shop has one; face and roof signs are both found on the named runs", () => {
    let face = 0;
    let roof = 0;
    const wrong: string[] = [];
    for (const o of NAMED) {
      const v = viewOf(o);
      const runOf = runsOf(v.buildings);
      const perRun = new Map<string, number>();
      const perShop = new Map<CityShop, number>();
      const note = (building: string, shop: CityShop | undefined, k: string, what: string): void => {
        perRun.set(runOf.get(building)!, (perRun.get(runOf.get(building)!) ?? 0) + 1);
        if (!shop) return void wrong.push(`${label(o)} ${what} has no shop`);
        perShop.set(shop, (perShop.get(shop) ?? 0) + 1);
        if (shop.kind === "barber" || shop.kind === "hotel") wrong.push(`${label(o)} ${what} on a ${shop.kind}`);
        if (!NOVELTY_BY_KIND[shop.kind].includes(k as never)) wrong.push(`${label(o)} ${what}: ${k} is not a ${shop.kind} key`);
      };
      for (const s of v.layer.novelty!) {
        face++;
        note(s.building, v.shopOf.get(key(s.cell)), s.placement.key, `face sign ${key(s.cell)}`);
        if (s.kind !== v.shopOf.get(key(s.cell))?.kind) wrong.push(`${label(o)} face sign ${key(s.cell)}: kind field`);
      }
      for (const p of v.layer.roofs!.filter((q) => q.kind === "novelty")) {
        roof++;
        note(p.building, v.shopOf.get(key(p.cell)), p.placement.key, `roof sign ${key(p.cell)}`);
      }
      for (const [r, n] of perRun) if (n > NOVELTY_PER_RUN) wrong.push(`${label(o)} run ${r}: ${n} signs`);
      for (const [s, n] of perShop) if (n > 1) wrong.push(`${label(o)} shop ${key(s.cells[0]!)}: ${n} signs`);
    }
    expect(wrong.slice(0, 5)).toEqual([]);
    expect(face).toBeGreaterThan(100);
    expect(roof).toBeGreaterThan(20);
  });

  it("every face sign holds F's every part, worked by hand from the kit's bounds: its back on storey 1's wall plane, centred, broad side out, base on the shopfront's tallest piece (never under top_m), top under the roof, within the shop's width, front within CELL_M of the cell edge, street front, not an escape's column, clear of every dressing and wall piece nearby", () => {
    const wrong: string[] = [];
    for (const o of NAMED) {
      const v = viewOf(o);
      const escapes = new Set(v.layer.walls!.filter((p) => p.kind === "escape").map((p) => key(p.cell)));
      for (const s of v.layer.novelty!) {
        const where = `${label(o)} ${key(s.cell)} ${s.placement.key.slice(-12)}`;
        const shop = v.shopOf.get(key(s.cell))!;
        const g = v.layer.ground.find((q) => key(q.cells[0]!) === key(s.cell))!;
        const col = v.colAt.get(key(s.cell))!;
        if (g.frontage !== "street" || s.face !== col.front || shop.cells.some((c) => escapes.has(key(c)))) wrong.push(`${where}: street front or escape`);
        // the shop's frame: origin the mean of its cells' centres, +z the column's front
        const ox = shop.cells.reduce((a, c) => a + centre(c).x, 0) / shop.cells.length;
        const oz = shop.cells.reduce((a, c) => a + centre(c).z, 0) / shop.cells.length;
        const inv = (x: number, z: number): { x: number; z: number } => turn(-col.yaw, x - ox, z - oz);
        // the wall plane: the first floor piece's bounds front
        const floor = col.pieces[0]!.placement;
        const host = FLOOR_HOST[floor.key]!;
        const fo = inv(floor.x_m, floor.z_m);
        const plane = fo.z + host.d / 2;
        const e = noveltyBounds(s.placement.key);
        const turned = quarter(col.yaw, s.placement.yaw_deg);
        const wantTurned = e.w < e.d ? 1 : 0;
        if (turned !== wantTurned) wrong.push(`${where}: turned ${turned} quarters, expected ${wantTurned}`);
        const along = wantTurned ? e.d : e.w;
        const out = wantTurned ? e.w : e.d;
        const at = inv(s.placement.x_m, s.placement.z_m);
        if (Math.abs(at.x) > TOL) wrong.push(`${where}: ${at.x} off centre`);
        if (Math.abs(at.z - out / 2 - plane) > TOL) wrong.push(`${where}: back ${at.z - out / 2} not on the plane ${plane}`);
        if (plane + out - 2.5 > 5 + 1e-9) wrong.push(`${where}: reach`);
        if (along > 5 * shop.cells.length + 1e-9) wrong.push(`${where}: width`);
        let base = col.ground.top_m;
        for (const p of v.layer.dressing!) if (key(p.cell) === key(s.cell) && ["glass", "awning", "fasciaSign"].includes(p.kind)) base = Math.max(base, p.placement.y_m + dressBounds(p.placement.key).h);
        if (Math.abs(s.placement.y_m - base) > TOL) wrong.push(`${where}: base ${s.placement.y_m} not ${base}`);
        const roofY = col.pieces[col.pieces.length - 1]!.placement.y_m;
        if (s.placement.y_m + e.h > roofY + 1e-9) wrong.push(`${where}: top over the roof`);
        // clear: its box against every dressing and wall piece on the cells around
        const quarterOdd = turned % 2 === 1;
        const box = { x0: s.placement.x_m - (quarterOdd ? e.d : e.w) / 2, x1: s.placement.x_m + (quarterOdd ? e.d : e.w) / 2, z0: s.placement.z_m - (quarterOdd ? e.w : e.d) / 2, z1: s.placement.z_m + (quarterOdd ? e.w : e.d) / 2, y0: s.placement.y_m, y1: s.placement.y_m + e.h };
        const hit = (p: { cell: CityCell; placement: { key: string; x_m: number; y_m: number; z_m: number; yaw_deg: number } }, b: { w: number; h: number; d: number }, sy: number): boolean => {
          if (shop.cells.every((c) => Math.abs(c.i - p.cell.i) > 1 || Math.abs(c.j - p.cell.j) > 1)) return false;
          const odd = (((Math.round(p.placement.yaw_deg / 90) % 4) + 4) % 2) === 1;
          const dx = odd ? b.d : b.w;
          const dz = odd ? b.w : b.d;
          const ox2 = Math.min(box.x1, p.placement.x_m + dx / 2) - Math.max(box.x0, p.placement.x_m - dx / 2);
          const oz2 = Math.min(box.z1, p.placement.z_m + dz / 2) - Math.max(box.z0, p.placement.z_m - dz / 2);
          const oy = Math.min(box.y1, p.placement.y_m + b.h * sy) - Math.max(box.y0, p.placement.y_m);
          return ox2 > TOL && oz2 > TOL && oy > TOL;
        };
        for (const p of v.layer.dressing!) if (hit(p, dressBounds(p.placement.key), 1)) wrong.push(`${where}: clashes with ${p.kind}`);
        for (const p of v.layer.walls!) {
          const b = PARTY_WALL_KINDS.includes(p.kind) ? partyBounds(p.placement.key) : p.placement.key === "code:escape" ? null : wallBounds(p.placement.key);
          if (b && hit(p, b, p.scaleY)) wrong.push(`${where}: clashes with ${p.kind}`);
        }
      }
    }
    expect(wrong.slice(0, 5)).toEqual([]);
  });

  it("every face sign's column, with the roofs and face signs counted, holds at most DRESS_PER_BAY_MAX (RC, placed last)", () => {
    for (const o of NAMED) {
      const v = viewOf(o);
      const rep = roofReport(v.layer, { mass: v.mass, buildings: v.buildings });
      expect(rep.failures.filter((f) => f.check === "cap"), label(o)).toEqual([]);
      const perCell = new Map<string, number>();
      for (const s of v.layer.novelty!) perCell.set(key(s.cell), (perCell.get(key(s.cell)) ?? 0) + 1);
      for (const [k, n] of perCell) expect(n, `${label(o)} ${k}`).toBeLessThanOrEqual(DRESS_PER_BAY_MAX);
    }
  });

  it("every roof novelty piece holds RS: its building drew P_ROOF_LARGE, it stands on its shop's mid column (a double's first, else its second), and it is its building's only big prop", () => {
    const wrong: string[] = [];
    for (const o of NAMED) {
      const v = viewOf(o);
      const rand = stageRand("facades", o.seed);
      for (const p of v.layer.roofs!.filter((q) => q.kind === "novelty")) {
        const shop = v.shopOf.get(key(p.cell))!;
        if (unitOf(rand("roof", "large", p.building)) >= P_ROOF_LARGE) wrong.push(`${label(o)} ${p.building}: no P_ROOF_LARGE draw`);
        const col = v.colAt.get(key(p.cell))!;
        if (col.kind !== "mid" || shop.building !== p.building) wrong.push(`${label(o)} ${key(p.cell)}: not a mid column of its shop`);
        const firstMid = shop.cells.find((c) => v.colAt.get(key(c))!.kind === "mid")!;
        if (key(firstMid) !== key(p.cell)) wrong.push(`${label(o)} ${key(p.cell)}: not the shop's first mid column`);
        if (v.layer.roofs!.filter((q) => q.building === p.building && BIG.includes(q.kind)).length !== 1) wrong.push(`${label(o)} ${p.building}: not its only big prop`);
        const rel = quarter(col.yaw, p.placement.yaw_deg);
        if (rel !== 0 && rel !== 1) wrong.push(`${label(o)} ${key(p.cell)}: turned ${rel} quarters`);
        expect(Math.abs(p.placement.y_m - (col.pieces[col.pieces.length - 1]!.placement.y_m + 0.5)), `${label(o)} base`).toBeLessThan(TOL);
      }
    }
    expect(wrong.slice(0, 5)).toEqual([]);
  });

  it("with no plan buildRoofs is H3b's exactly: on the four pin cities digestOf({ stage, ground, dressing, walls, roofs }) is H3b's pins (88cc62e0, d424e8df, ea9ad368, a6511846)", () => {
    const H3B: readonly (readonly [number, string])[] = [
      [1, "88cc62e0"],
      [2, "d424e8df"],
      [3, "ea9ad368"],
      [8, "a6511846"],
    ];
    for (const [seed, pin] of H3B) {
      const v = viewOf({ blocksX: 6, blocksZ: 6, seed, way: "on" });
      const layer: CityFacadesLayer = { stage: "facades", ground: v.layer.ground, dressing: v.layer.dressing!, walls: v.layer.walls!, roofs: noPlanOf(v) };
      expect(digestOf(layer), `seed ${seed}`).toBe(pin);
    }
  });

  it("with the plan: a building whose street block holds no roof sign has the same roof pieces as with no plan; TC holds; R8's second number is the no-plan layer's, run by run, and its first is at least 0.9 (its change is reported, Q27)", () => {
    const wrong: string[] = [];
    for (const o of NAMED) {
      const v = viewOf(o);
      const none = noPlanOf(v);
      const signBlocks = new Set(v.layer.roofs!.filter((p) => p.kind === "novelty").map((p) => v.buildings.buildings.find((b) => b.id === p.building)!.block));
      const by = (rs: readonly CityRoofPiece[]): Map<string, CityRoofPiece[]> => {
        const m = new Map<string, CityRoofPiece[]>();
        for (const p of rs) (m.get(p.building) ?? m.set(p.building, []).get(p.building)!).push(p);
        return m;
      };
      const a = by(none);
      const b = by(v.layer.roofs!);
      for (const bl of v.buildings.buildings) {
        if (signBlocks.has(bl.block)) continue;
        if (JSON.stringify(a.get(bl.id) ?? []) !== JSON.stringify(b.get(bl.id) ?? [])) wrong.push(`${label(o)} ${bl.id} differs with the plan`);
      }
      const now = roofReport(v.layer, { mass: v.mass, buildings: v.buildings });
      expect(now.failures.slice(0, 2), label(o)).toEqual([]);
      const before = roofReport({ stage: "facades", ground: v.layer.ground, dressing: v.layer.dressing!, walls: v.layer.walls!, roofs: none }, { mass: v.mass, buildings: v.buildings }).metrics;
      expect(now.metrics.bigRuns / now.metrics.runs, `${label(o)} R8 second`).toBe(before.bigRuns / before.runs);
      expect(now.metrics.dressed / now.metrics.buildings, `${label(o)} R8 first`).toBeGreaterThanOrEqual(0.9);
    }
    expect(wrong.slice(0, 5)).toEqual([]);
  });

  it("the same city twice gives the same shops, novelty and roofs (R-3)", () => {
    for (const o of [NAMED[0]!, NAMED[11]!]) {
      const v = viewOf(o);
      const rand = stageRand("facades", o.seed);
      const { ground, dressing, walls } = v.layer;
      const shops = buildShops(v.buildings, ground, dressing!, rand);
      const plan = planNovelty(v.mass, v.buildings, { ground, dressing: dressing!, walls: walls!, shops }, rand);
      const roofs = buildRoofs(v.mass, v.buildings, { dressing: dressing!, walls: walls! }, rand, undefined, plan.roofs).roofs;
      const novelty = placeFaceSigns(plan, roofs, { dressing: dressing!, walls: walls! }, v.buildings).novelty;
      expect(shops).toEqual(v.layer.shops);
      expect(roofs).toEqual(v.layer.roofs);
      expect(novelty).toEqual(v.layer.novelty);
    }
  });
});

describe("placements, worked by hand (criterion 4)", { timeout: 300_000 }, () => {
  const AWNING_FREE = ["fasciaSign", "bladeSign"];
  /** The street bays of the named runs, with what the hand-worked cases need: found by what they are. */
  function bays(kinds: readonly string[], storeys: number): { v: View; bay: ReturnType<typeof baysOf>[number]; awningTop: number | null }[] {
    const out: { v: View; bay: ReturnType<typeof baysOf>[number]; awningTop: number | null }[] = [];
    for (const o of NAMED) {
      const v = viewOf(o);
      const ctx = makeCtx(v.mass, v.buildings);
      const escapes = new Set(v.layer.walls!.filter((p) => p.kind === "escape").map((p) => key(p.cell)));
      for (const b of v.buildings.buildings) {
        if (b.storeys !== storeys) continue;
        for (const bay of baysOf(ctx, b, v.layer.ground.filter((g) => g.building === b.id))) {
          if (!kinds.includes(bay.g.kind) || !bay.frontStreet || bay.g.frontage !== "street" || bay.g.cells.some((c) => escapes.has(key(c)))) continue;
          const mine = v.layer.dressing!.filter((p) => key(p.cell) === key(bay.g.cells[0]!));
          if (mine.some((p) => AWNING_FREE.includes(p.kind))) continue;
          const awning = mine.find((p) => p.kind === "awning" && !p.wrap);
          out.push({ v, bay, awningTop: awning ? awning.placement.y_m + dressBounds(awning.placement.key).h : null });
        }
      }
    }
    return out;
  }
  /** The sign's expected pivot in the plan, by hand: its column's frame (x across from the shop's middle, z from the wall plane), turned by the column's yaw. */
  const expected = (v: View, bay: ReturnType<typeof baysOf>[number], out: number): { x: number; z: number } => {
    const col = bay.col;
    const cells = bay.g.cells;
    const mid = { x: cells.reduce((a, c) => a + centre(c).x, 0) / cells.length, z: cells.reduce((a, c) => a + centre(c).z, 0) / cells.length };
    const f = col.pieces[0]!.placement;
    const fo = turn(-col.yaw, f.x_m - mid.x, f.z_m - mid.z);
    const plane = fo.z + FLOOR_HOST[f.key]!.d / 2;
    const r = turn(col.yaw, 0, plane + out / 2);
    return { x: mid.x + r.x, z: mid.z + r.z };
  };
  const fitOn = (v: View, bay: ReturnType<typeof baysOf>[number], k: string, base: number) => faceFit(bay, k as never, base, nearBoxes(placedBoxes(v.layer), bay.g.cells));

  it("a Burger_01 face sign over a flat awning on a 3-storey shop, at two turns: its base the awning's top, its back on the wall plane, centred, its 3.717 m along the wall (a quarter turn from the column's yaw, the key's w being the narrower)", () => {
    const k = "city-pack:SM_Prop_LargeSign_Burger_01";
    const found: number[] = [];
    for (const { v, bay, awningTop } of bays(["shop"], 3)) {
      if (awningTop === null || found.includes(bay.col.yaw)) continue;
      const r = fitOn(v, bay, k, awningTop);
      if (!r.ok) continue;
      found.push(bay.col.yaw);
      const at = expected(v, bay, 3.715);
      expect(r.placement.x_m).toBeCloseTo(at.x, 6);
      expect(r.placement.z_m).toBeCloseTo(at.z, 6);
      expect(r.placement.y_m).toBeCloseTo(awningTop, 6);
      expect(quarter(bay.col.yaw, r.placement.yaw_deg)).toBe(1);
      if (found.length === 2) break;
    }
    expect(found.length, "two columns of different turns have a shop with a flat awning where a burger fits").toBe(2);
  });

  it("a Hotdog_01 face sign turned a quarter: its 3.926 m along the wall, 1.411 m out, centred over its shop", () => {
    const k = "city-pack:SM_Prop_LargeSign_Hotdog_01";
    const hit = bays(["shop"], 3).find(({ v, bay }) => fitOn(v, bay, k, bay.col.ground.top_m).ok);
    expect(hit).toBeDefined();
    const { v, bay } = hit!;
    const r = fitOn(v, bay, k, bay.col.ground.top_m);
    if (!r.ok) throw new Error("unreachable");
    const at = expected(v, bay, 1.411);
    expect(r.placement.x_m).toBeCloseTo(at.x, 6);
    expect(r.placement.z_m).toBeCloseTo(at.z, 6);
    expect(quarter(bay.col.yaw, r.placement.yaw_deg)).toBe(1);
    // along the wall it is 3.926: its box's extent along the column's x axis in the frame
    const e = noveltyBounds(k as never);
    expect(Math.max(e.w, e.d)).toBe(3.926);
  });

  it("a Pizza_01 face sign centred over a shopDouble: on the midpoint of its two cells, not turned, 2.957 m out", () => {
    const k = "city-pack:SM_Prop_LargeSign_Pizza_01";
    const hit = bays(["shopDouble"], 3).find(({ v, bay }) => fitOn(v, bay, k, bay.col.ground.top_m).ok);
    expect(hit, "a shopDouble has room for the pizza slice").toBeDefined();
    const { v, bay } = hit!;
    const r = fitOn(v, bay, k, bay.col.ground.top_m);
    if (!r.ok) throw new Error("unreachable");
    expect(bay.g.cells).toHaveLength(2);
    const at = expected(v, bay, 2.957);
    expect(r.placement.x_m).toBeCloseTo(at.x, 6);
    expect(r.placement.z_m).toBeCloseTo(at.z, 6);
    expect(quarter(bay.col.yaw, r.placement.yaw_deg)).toBe(0);
  });

  it("a Bottle_01 roof sign on a mid column: base 3 x storeys + 0.5, its front edge on the deck's front edge (0.3 m in), centred, not turned", () => {
    const k = "city-pack:SM_Prop_LargeSign_Bottle_01";
    let seen = 0;
    for (const o of NAMED.slice(0, 3)) {
      const v = viewOf(o);
      const rand = stageRand("facades", o.seed);
      const insets = roofInsets(v.layer.walls!);
      for (const b of v.buildings.buildings) {
        if (unitOf(rand("roof", "large", b.id)) >= P_ROOF_LARGE || seen >= 3) continue;
        const n = b.cells.findIndex((c) => v.colAt.get(key(c))!.kind === "mid" && !insets.has(key(c)));
        if (n < 0) continue;
        const roofs = buildRoofs(v.mass, v.buildings, { dressing: v.layer.dressing!, walls: v.layer.walls! }, rand, undefined, new Map([[b.id, { n, key: k as never }]])).roofs;
        const p = roofs.find((q) => q.kind === "novelty" && q.building === b.id);
        if (!p) continue; // no room on that column (RC)
        seen++;
        const col = v.colAt.get(key(b.cells[n]!))!;
        expect(p.placement.y_m).toBeCloseTo(3 * b.storeys + 0.5, 6);
        const at = turn(col.yaw, 0, 2.2 - 1.8 / 2);
        expect(p.placement.x_m).toBeCloseTo(centre(col).x + at.x, 6);
        expect(p.placement.z_m).toBeCloseTo(centre(col).z + at.z, 6);
        expect(p.placement.yaw_deg).toBe(col.yaw);
        expect(ROOF_BOUNDS[k as never]).toBeUndefined();
      }
    }
    expect(seen).toBeGreaterThanOrEqual(3);
  });
});
