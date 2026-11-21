/**
 * Stage 7, section H1b, criterion 4's failing fixtures. Each is built from the default city's layers (6 x 6 seed 1, one-way on), typed in from the run in the test (not pinned by hash), with one thing changed, and must
 * fail the named check. The unchanged layer must pass (the sanity test), so a fixture fails for its own change and nothing else that matters. The checks also hold on the 20 named runs through the stage itself
 * (`dressreport.test.ts` and `stage.test.ts` run them; the stage fails a run that breaks one).
 */
import { describe, expect, it } from "vitest";
import type { CalibrationKey, CityDressingPiece, CityFacadesLayer, CityGroundPiece } from "../../core";
import { runsOf } from "./dress";
import { dressFailures, dressReport } from "./dresscheck";
import { ATM_PER_RUN, AWNINGS, AWNING_CORNER } from "./dresskit";
import { keyOf, rotate } from "./place";
import { DEFAULT, layersOf } from "./testcities";

const L = layersOf(DEFAULT);
const groundAt = new Map<string, CityGroundPiece>(L.facades.ground.map((g) => [keyOf(g.cells[0]!), g] as const));
const colAt = new Map(L.buildings.columns!.map((c) => [keyOf(c), c] as const));
const builtAt = new Map(L.mass.built.map((b) => [keyOf(b), b] as const));
const buildingOf = new Map(L.buildings.buildings.map((b) => [b.id, b] as const));
const runOf = runsOf(L.buildings);
const dressing = L.facades.dressing!;
const input = { mass: L.mass, buildings: L.buildings };

const layerOf = (d: readonly CityDressingPiece[]): CityFacadesLayer => ({ ...L.facades, dressing: d });
const checksOf = (d: readonly CityDressingPiece[], mass = L.mass): Set<string> => new Set(dressFailures(layerOf(d), { mass, buildings: L.buildings }).map((f) => f.check));
const reasonsOf = (d: readonly CityDressingPiece[]): string[] => dressFailures(layerOf(d), input).map((f) => f.reason);
const without = (pred: (p: CityDressingPiece) => boolean): CityDressingPiece[] => dressing.filter((p) => !pred(p));
const first = (pred: (p: CityDressingPiece) => boolean): CityDressingPiece => {
  const p = dressing.find(pred);
  if (!p) throw new Error("the default city has no such piece");
  return p;
};
/** A copy of `p` moved `m` metres along its own +z (its front). */
const pushed = (p: CityDressingPiece, m: number): CityDressingPiece => {
  const r = rotate(p.placement.yaw_deg, 0, m);
  return { ...p, placement: { ...p.placement, x_m: p.placement.x_m + r.x, z_m: p.placement.z_m + r.z } };
};
const swap = (from: CityDressingPiece, to: CityDressingPiece): CityDressingPiece[] => dressing.map((p) => (p === from ? to : p));
/** A copy of `p` re-aimed at the ground piece `g` (its building, cell and face), for a failing fixture only. */
const onto = (p: CityDressingPiece, g: CityGroundPiece): CityDressingPiece => ({ ...p, building: g.building, cell: g.cells[0]!, face: colAt.get(keyOf(g.cells[0]!))!.front });
const key = (n: string): CalibrationKey => `city-pack:SM_${n}`;
const isRing2 = (id: string): boolean => buildingOf.get(id)!.cells.every((c) => builtAt.get(keyOf(c))!.row === "inner");

describe("the failing fixtures (criterion 4)", { timeout: 120_000 }, () => {
  it("sanity: the default city's own layer passes every check, and the report's numbers are as the stage's", () => {
    const rep = dressReport(L.facades, input);
    expect(rep.failures).toEqual([]);
    expect(rep.metrics.glassed).toBe(rep.metrics.glassKeyBays);
    expect(rep.metrics.awned / rep.metrics.shopBays).toBeGreaterThanOrEqual(0.55);
    expect(rep.metrics.signed / rep.metrics.shopBays).toBeGreaterThanOrEqual(0.45);
    expect(rep.metrics.atmBuildings / rep.metrics.streetBuildings).toBeGreaterThanOrEqual(0.15);
  });

  it("a layer with no dressing fails the shape check", () => {
    expect(new Set(dressFailures({ stage: "facades", ground: L.facades.ground }, input).map((f) => f.check))).toEqual(new Set(["H1b"]));
  });

  it("an awning on a ring-2 building's door fails M8", () => {
    const door = L.facades.ground.find((g) => g.kind === "door" && g.frontage === "quiet" && isRing2(g.building))!;
    expect(door).toBeDefined();
    const awning = first((p) => p.kind === "awning" && !p.wrap);
    expect(checksOf([...dressing, onto(awning, door)]).has("M8")).toBe(true);
  });

  it("a fascia sign on a quiet building's mid column fails M8", () => {
    const mid = L.facades.ground.find((g) => (g.kind === "floor" || g.kind === "door") && g.frontage === "quiet" && colAt.get(keyOf(g.cells[0]!))!.kind === "mid")!;
    expect(mid).toBeDefined();
    const sign = first((p) => p.kind === "fasciaSign");
    expect(checksOf([...dressing, onto(sign, mid)]).has("M8")).toBe(true);
  });

  it("an ATM beside a quiet building's door fails M8", () => {
    const door = L.facades.ground.find((g) => g.kind === "door" && g.frontage === "quiet")!;
    expect(door).toBeDefined();
    const atm = first((p) => p.kind === "atm");
    expect(checksOf([...dressing, onto(atm, door)]).has("M8")).toBe(true);
  });

  it("a flat awning on a mixed corner whose front is quiet fails M8 (X1), where the glass and the L awning on it pass", () => {
    const corner = L.facades.ground.find((g) => {
      if (g.kind !== "shopCorner") return false;
      const col = colAt.get(keyOf(g.cells[0]!))!;
      const open = builtAt.get(keyOf(col))!.open;
      return open.find((o) => o.side === col.front)!.frontage === "quiet" && open.find((o) => o.side === col.side)!.frontage === "street";
    })!;
    expect(corner).toBeDefined();
    const ck = keyOf(corner.cells[0]!);
    // the corner's own glass is on it and the layer passes
    expect(dressing.some((p) => p.kind === "glass" && keyOf(p.cell) === ck && p.wrap)).toBe(true);
    const flat = first((p) => p.kind === "awning" && !p.wrap);
    const bad = checksOf([...dressing, onto(flat, corner)]);
    expect(bad.has("M8")).toBe(true);
    expect(reasonsOf([...dressing, onto(flat, corner)]).some((r) => /front .* is not a street side/.test(r))).toBe(true);
  });

  it("one shop's glass removed fails R4", () => {
    const glass = first((p) => p.kind === "glass");
    expect(checksOf(without((p) => p === glass)).has("R4")).toBe(true);
  });

  it("one building's second awning changed to another key of AWNINGS fails R5", () => {
    const byBuilding = new Map<string, CityDressingPiece[]>();
    for (const p of dressing.filter((q) => q.kind === "awning" && !q.wrap)) (byBuilding.get(p.building) ?? byBuilding.set(p.building, []).get(p.building)!).push(p);
    const two = [...byBuilding.values()].find((l) => l.length >= 2)!;
    expect(two).toBeDefined();
    const other = AWNINGS.find((k) => k !== two[1]!.placement.key)!;
    const bad = swap(two[1]!, { ...two[1]!, placement: { ...two[1]!.placement, key: other } });
    expect(checksOf(bad).has("R5")).toBe(true);
    expect(reasonsOf(bad).some((r) => /keys of flat awnings/.test(r))).toBe(true);
  });

  it("every awning removed fails R5's share; every sign removed fails R6's; every ATM removed fails R6's ATM share", () => {
    const noAwning = reasonsOf(without((p) => p.kind === "awning"));
    expect(noAwning.some((r) => /awning share/.test(r))).toBe(true);
    const noSign = reasonsOf(without((p) => p.kind === "fasciaSign" || p.kind === "bladeSign"));
    expect(noSign.some((r) => /signed share/.test(r))).toBe(true);
    const noAtm = reasonsOf(without((p) => p.kind === "atm"));
    expect(noAtm.some((r) => /ATM share/.test(r))).toBe(true);
    expect(checksOf(without((p) => p.kind === "awning")).has("R5")).toBe(true);
    expect(checksOf(without((p) => p.kind === "atm")).has("R6")).toBe(true);
  });

  it("two L awnings side by side fail LG: an L awning added on the column beside one that carries one (a typed-in pair of neighbours, as no corner of the default city has an L beside another)", () => {
    const l = first((p) => p.placement.key === AWNING_CORNER[0]);
    const near = [
      { i: l.cell.i + 1, j: l.cell.j },
      { i: l.cell.i - 1, j: l.cell.j },
      { i: l.cell.i, j: l.cell.j + 1 },
      { i: l.cell.i, j: l.cell.j - 1 },
    ].find((c) => groundAt.has(keyOf(c)))!;
    expect(near).toBeDefined();
    const g = groundAt.get(keyOf(near))!;
    const bad = [...dressing, onto(l, g)];
    expect(checksOf(bad).has("LG")).toBe(true);
    expect(checksOf(dressing).has("LG")).toBe(false);
  });

  it("a third ATM on a run that has two fails the run cap; a second ATM on one building fails the building cap", () => {
    const atmsByRun = new Map<string, CityDressingPiece[]>();
    for (const p of dressing.filter((q) => q.kind === "atm")) (atmsByRun.get(runOf.get(p.building)!) ?? atmsByRun.set(runOf.get(p.building)!, []).get(runOf.get(p.building)!)!).push(p);
    const withAtm = new Set(dressing.filter((q) => q.kind === "atm").map((q) => q.building));
    // a run that has two ATMs and a third building with a street door of its own and no ATM
    let full: [string, CityDressingPiece[]] | undefined;
    let door: CityGroundPiece | undefined;
    for (const e of atmsByRun.entries()) {
      if (e[1].length !== ATM_PER_RUN) continue;
      const d = L.facades.ground.find((g) => g.kind === "door" && g.frontage === "street" && runOf.get(g.building) === e[0] && !withAtm.has(g.building));
      if (d) {
        full = e;
        door = d;
        break;
      }
    }
    expect(full).toBeDefined();
    expect(door).toBeDefined();
    const third = onto(full![1][0]!, door!);
    const bad = [...dressing, third];
    expect(reasonsOf(bad).some((r) => /the run .* has 3 ATMs/.test(r))).toBe(true);
    const dup = [...dressing, { ...full![1][0]! }];
    expect(reasonsOf(dup).some((r) => /has 2 ATMs/.test(r))).toBe(true);
    expect(checksOf(dup).has("cap")).toBe(true);
  });

  it("an awning moved 0.6 m further out fails the attachment (its back no longer on its host's face), and one moved 1.2 m past the front cell edge's reach fails the reach (T1) by name", () => {
    const cover3 = first((p) => p.placement.key === key("Bld_Shop_Cover_03") && !p.wrap);
    const out6 = swap(cover3, pushed(cover3, 0.6));
    expect(checksOf(out6).has("attach")).toBe(true);
    // the furthest awning of the layer is 4.058 m out, 0.64 m inside the 4.70 m limit: 0.6 m more is still inside it, 1.2 m is not
    const out12 = swap(cover3, pushed(cover3, 1.2));
    expect(reasonsOf(out12).some((r) => /reaches .* over 4\.7 for an awning/.test(r))).toBe(true);
    expect(checksOf(dressing).has("attach")).toBe(false);
  });

  it("a sign moved 0.1 m off its host's face fails attachment", () => {
    const sign = first((p) => p.kind === "fasciaSign");
    const bad = swap(sign, pushed(sign, 0.1));
    expect(checksOf(bad).has("attach")).toBe(true);
    expect(reasonsOf(bad).some((r) => /back plane/.test(r))).toBe(true);
  });

  it("a sign standing over its column's roof fails the roof cap", () => {
    const sign = first((p) => p.kind === "fasciaSign");
    const high = swap(sign, { ...sign, placement: { ...sign.placement, y_m: 40 } });
    expect(reasonsOf(high).some((r) => /over its column's roof/.test(r))).toBe(true);
  });
});
