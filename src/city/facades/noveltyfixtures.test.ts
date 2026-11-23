/**
 * Stage 7, section H1c (ticket 070), criterion 5's failing fixtures. Each is built from the default city's layer (6 x 6 seed 1, one-way on) with one thing changed, found by what it is, and must fail the check the ticket
 * names and only that one, unless its test says otherwise. The unchanged layer is the positive control: it passes `noveltyFailures` and `roofFailures`. A fixture that adds a sign starts from the layer with its own signs taken
 * away, so that NR is not the failure; a fixture that needs a shop of a given kind takes a shop whose kind came from the hash (SK only reads the sign-read ones) and gives it that kind.
 */
import { describe, expect, it } from "vitest";
import type { CalibrationKey, CityFacadesLayer, CityNoveltySign, CityRoofPiece, CityShop, CityShopKind } from "../../core";
import { type Bay, baysOf, runsOf } from "./dress";
import { makeCtx } from "./facts";
import { NOVELTY_BY_KIND, noveltyBounds } from "./noveltykit";
import { dressingByCell, faceBase, faceFit, loadsWithRoofs, nearBoxes, placedBoxes } from "./novelty";
import { type NoveltyFailure, noveltyFailures } from "./noveltycheck";
import { roofFailures } from "./roofcheck";
import { keyOf } from "./place";
import { DEFAULT, layersOf } from "./testcities";
import { DRESS_PER_BAY_MAX } from "./dresskit";

const { mass, buildings, facades } = layersOf(DEFAULT);
const ctx = makeCtx(mass, buildings);
const input = { mass, buildings };
const key = keyOf;
const check = (layer: CityFacadesLayer): NoveltyFailure[] => noveltyFailures(layer, input);
const names = (f: readonly NoveltyFailure[]): string[] => [...new Set(f.map((x) => x.check))].sort();
const sign = (name: string): CalibrationKey => `city-pack:SM_Prop_LargeSign_${name}`;

const bayOf = new Map<string, Bay>();
for (const b of buildings.buildings) for (const bay of baysOf(ctx, b, facades.ground.filter((g) => g.building === b.id))) bayOf.set(key(bay.g.cells[0]!), bay);
const escapes = new Set(facades.walls!.filter((p) => p.kind === "escape").map((p) => key(p.cell)));
const index = placedBoxes(facades);
const dressAt = dressingByCell(facades.dressing!);
const ground = (s: CityShop): Bay | undefined => bayOf.get(key(s.cells[0]!));
const streetBay = (s: CityShop): boolean => {
  const bay = ground(s);
  return !!bay && bay.kind !== "door" && bay.frontStreet && bay.g.frontage === "street" && !bay.g.cells.some((c) => escapes.has(key(c)));
};
/** The layer with its own novelty signs (face and roof) taken away. */
const clean: CityFacadesLayer = { ...facades, novelty: [], roofs: facades.roofs!.filter((p) => p.kind !== "novelty") };
const withKind = (layer: CityFacadesLayer, shop: CityShop, kind: CityShopKind): CityFacadesLayer => ({ ...layer, shops: layer.shops!.map((s) => (s === shop ? { ...s, kind } : s)) });
const signOf = (shop: CityShop, kind: CityShopKind, k: CalibrationKey, placement: CityNoveltySign["placement"]): CityNoveltySign => ({ building: shop.building, cell: { ...shop.cells[0]! }, face: ground(shop)!.col.front, kind, placement: { ...placement, key: k } });
/** F's placement of `k` on the shop's bay: with the real roof and neighbours, or (forced) with neither. */
const fit = (shop: CityShop, k: CalibrationKey, forced = false): CityNoveltySign["placement"] | null => {
  const bay = ground(shop)!;
  const r = forced ? faceFit({ ...bay, roofY: 1e9 }, k, faceBase(bay, dressAt), []) : faceFit(bay, k, faceBase(bay, dressAt), nearBoxes(index, bay.g.cells));
  return r.ok ? r.placement : null;
};
const turn = (yaw: number, x: number, z: number): { x: number; z: number } => {
  const q = ((Math.round(yaw / 90) % 4) + 4) % 4;
  const r = [{ x, z }, { x: z, z: -x }, { x: -x, z: -z }, { x: -z, z: x }][q]!;
  return { x: r.x + 0, z: r.z + 0 };
};
const hashShops = facades.shops!.filter((s) => s.source === "hash" && streetBay(s));
const kindOfKey = (k: CalibrationKey): CityShopKind => (Object.entries(NOVELTY_BY_KIND).find(([, ks]) => ks.includes(k))![0] as CityShopKind);
const s0 = facades.novelty![0]!;
const shop0 = facades.shops!.find((s) => key(s.cells[0]!) === key(s0.cell))!;
const col0 = ground(shop0)!.col;
const replaceS0 = (p: Partial<CityNoveltySign["placement"]>): CityFacadesLayer => ({ ...facades, novelty: facades.novelty!.map((s, n) => (n === 0 ? { ...s, placement: { ...s.placement, ...p } } : s)) });

describe("the failing fixtures (criterion 5)", { timeout: 120_000 }, () => {
  it("positive control: the default city's layer passes noveltyFailures and roofFailures, and has face signs, roof signs and both shop sources", () => {
    expect(check(facades)).toEqual([]);
    expect(roofFailures(facades, input)).toEqual([]);
    expect(facades.novelty!.length).toBeGreaterThan(5);
    expect(facades.roofs!.some((p) => p.kind === "novelty")).toBe(true);
    expect(new Set(facades.shops!.map((s) => s.source))).toEqual(new Set(["sign", "hash"]));
  });

  it("a face sign's key swapped for a key of another kind (a guitar on a pizza shop, or the nearest such swap that fits) fails NM, and only NM", () => {
    // a key that is not its shop's kind's, placed by F so that nothing else is wrong
    const other = Object.values(NOVELTY_BY_KIND).flat().find((k) => !NOVELTY_BY_KIND[shop0.kind].includes(k) && fit(shop0, k) !== null)!;
    expect(other).toBeDefined();
    const layer: CityFacadesLayer = { ...facades, novelty: facades.novelty!.map((s, n) => (n === 0 ? { ...s, placement: { ...fit(shop0, other)!, key: other } } : s)) };
    expect(names(check(layer))).toEqual(["NM"]);
  });

  it("a roof novelty piece's key swapped the same way fails NM", () => {
    const p = facades.roofs!.find((q) => q.kind === "novelty")!;
    const shop = facades.shops!.find((s) => s.cells.some((c) => key(c) === key(p.cell)))!;
    const other = sign("Soda_01");
    const swapped = NOVELTY_BY_KIND[shop.kind].includes(other) ? sign("Guitar_01") : other;
    const roofs = facades.roofs!.map((q) => (q === p ? ({ ...q, placement: { ...q.placement, key: swapped } } as CityRoofPiece) : q));
    expect(names(check({ ...facades, roofs }))).toEqual(["NM"]);
  });

  it("a trade-signed shop's kind changed (a shop under H1b's SM_Prop_Sign_Pizza_01 given \"bar\") fails SK, and only SK", () => {
    const shop = facades.shops!.find((s) => s.source === "sign" && s.sign === "city-pack:SM_Prop_Sign_Pizza_01" && !facades.novelty!.some((n) => key(n.cell) === key(s.cells[0]!)))!;
    expect(shop, "the default city has a pizza-signed shop with no novelty sign").toBeDefined();
    expect(names(check(withKind(facades, shop, "bar")))).toEqual(["SK"]);
  });

  it("a face sign moved 0.5 m along the wall fails F (centred), and only F", () => {
    const d = turn(col0.yaw, 0.5, 0);
    const layer = replaceS0({ x_m: s0.placement.x_m + d.x, z_m: s0.placement.z_m + d.z });
    const f = check(layer);
    expect(names(f)).toEqual(["F"]);
    expect(f.some((x) => x.reason.includes("middle"))).toBe(true);
  });

  it("a face sign turned a quarter so its narrow side is out (its back kept on the wall) fails F (broad side), and only F", () => {
    const { w, d } = noveltyBounds(s0.placement.key);
    // the sign's own turn is wrong: a quarter more; its depth out changes from `out` to the other side, so the pivot moves out or in by half the difference
    const wasTurned = w < d;
    const out = wasTurned ? w : d;
    const nowOut = wasTurned ? d : w;
    const back = turn(col0.yaw, 0, (nowOut - out) / 2);
    const layer = replaceS0({ yaw_deg: (s0.placement.yaw_deg + 90) % 360, x_m: s0.placement.x_m + back.x, z_m: s0.placement.z_m + back.z });
    const f = check(layer);
    expect(f.some((x) => x.check === "F" && x.reason.includes("broad side"))).toBe(true);
    expect(names(f)).toEqual(["F"]);
  });

  it("a face sign lowered 0.2 m into the awning (or the shopfront) fails F (base), and only F", () => {
    const f = check(replaceS0({ y_m: s0.placement.y_m - 0.2 }));
    expect(names(f)).toEqual(["F"]);
    expect(f.some((x) => x.reason.includes("base"))).toBe(true);
  });

  it("a Lollypop_01 on a 3-storey shop's face (top 3 + 6.36 over 9) fails F (top), and only F", () => {
    const shop = hashShops.find((s) => buildings.buildings.find((b) => b.id === s.building)!.storeys === 3 && fit(s, sign("Lollypop_01"), true) !== null)!;
    expect(shop, "the default city has a hash shop on a 3-storey building").toBeDefined();
    const k = sign("Lollypop_01");
    const layer = withKind({ ...clean, novelty: [signOf(shop, "sweets", k, fit(shop, k, true)!)] }, shop, "sweets");
    const f = check(layer);
    expect(names(f)).toEqual(["F"]);
    expect(f.some((x) => x.reason.includes("roof"))).toBe(true);
  });

  it("a face sign moved onto an escape's column fails F (EP), and only F", () => {
    const shop = facades.shops!.find((s) => s.source === "hash" && ground(s) && ground(s)!.kind !== "door" && s.cells.some((c) => escapes.has(key(c))) && ground(s)!.frontStreet);
    expect(shop, "the default city has a hash shop on an escape's column").toBeDefined();
    const k = sign("Pizza_01");
    const placement = fit(shop!, k, true)!;
    const f = check(withKind({ ...clean, novelty: [signOf(shop!, "pizza", k, placement)] }, shop!, "pizza"));
    expect(names(f)).toEqual(["F"]);
    expect(f.some((x) => x.reason.includes("EP"))).toBe(true);
  });

  it("a face sign put where it overlaps the bay's blade sign fails F (clear)", () => {
    const blade = facades.dressing!.find((p) => p.kind === "bladeSign" && facades.shops!.some((s) => key(s.cells[0]!) === key(p.cell) && streetBay(s)))!;
    expect(blade, "the default city has a street bay with a blade sign").toBeDefined();
    const shop = facades.shops!.find((s) => key(s.cells[0]!) === key(blade.cell))!;
    const k = sign("Pizza_01");
    const base = fit(shop, k, true)!;
    // centred on the blade sign instead of the shop, at the blade sign's own height
    const placement = { ...base, x_m: blade.placement.x_m, z_m: base.z_m, y_m: blade.placement.y_m };
    const bay = ground(shop)!;
    const shifted = { ...placement, ...(() => { const r = turn(bay.col.yaw, 0, 0); return { x_m: blade.placement.x_m + r.x, z_m: base.z_m }; })() };
    const f = check({ ...withKind({ ...clean, novelty: [signOf(shop, "pizza", k, shifted)] }, shop, "pizza") });
    expect(f.some((x) => x.check === "F" && x.reason.includes("clear"))).toBe(true);
  });

  it("a face sign moved 0.1 m off the wall fails attach, and only attach", () => {
    const d = turn(col0.yaw, 0, 0.1);
    expect(names(check(replaceS0({ x_m: s0.placement.x_m + d.x, z_m: s0.placement.z_m + d.z })))).toEqual(["attach"]);
  });

  it("a face sign moved out 5 m, past CELL_M from the cell edge, fails reach (and attach)", () => {
    const d = turn(col0.yaw, 0, 5);
    const f = names(check(replaceS0({ x_m: s0.placement.x_m + d.x, z_m: s0.placement.z_m + d.z })));
    expect(f).toContain("reach");
    expect(f).toContain("attach");
  });

  it("a face sign added on a column already at DRESS_PER_BAY_MAX with the roof pieces counted fails the cap, and only the cap", () => {
    // the shop of the default city's first sign, its column filled with six small roof pieces to the cap
    const have = loadsWithRoofs(clean, buildings, clean.roofs!).get(key(shop0.cells[0]!)) ?? 0;
    const col = ctx.col.get(key(shop0.cells[0]!))!;
    const filler: CityRoofPiece[] = Array.from({ length: DRESS_PER_BAY_MAX - have }, () => ({ kind: "small", building: shop0.building, cell: { ...shop0.cells[0]! }, facing: col.front, placement: { key: "city-pack:SM_Prop_Roof_Aircon_01", x_m: 0, y_m: 0, z_m: 0, yaw_deg: col.yaw } }));
    const layer: CityFacadesLayer = { ...clean, roofs: [...clean.roofs!, ...filler], novelty: [{ ...s0, placement: { ...s0.placement } }] };
    expect(loadsWithRoofs(layer, buildings, layer.roofs!).get(key(shop0.cells[0]!))).toBe(DRESS_PER_BAY_MAX);
    expect(names(check(layer))).toEqual(["cap"]);
  });

  it("a second face sign on another shop of a run that has one fails NR, and only NR", () => {
    const runOf = runsOf(buildings);
    const run = runOf.get(s0.building)!;
    const k = sign("Pizza_01");
    const other = hashShops.find((s) => s !== shop0 && runOf.get(s.building) === run && fit(s, k) !== null);
    expect(other, "the run of the default city's first sign has another hash shop where a pizza slice fits").toBeDefined();
    const layer = withKind({ ...facades, novelty: [...facades.novelty!, signOf(other!, kindOfKey(k), k, fit(other!, k)!)] }, other!, kindOfKey(k));
    expect(names(check(layer))).toEqual(["NR"]);
  });
});

