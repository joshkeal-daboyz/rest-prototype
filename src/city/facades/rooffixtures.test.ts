/**
 * Stage 7, section H3 (ticket 070), criterion 5's failing fixtures. Each is built from the default city's layer (6 x 6 seed 1, one-way on), typed in from the run in the test (found by what it is, not pinned by hash), with one
 * thing changed, and must fail the check the ticket names. The unchanged layer is the positive control: it has no failure.
 */
import { describe, expect, it } from "vitest";
import type { CityCell, CityColumn, CityRoofPiece, CityWallPiece } from "../../core";
import { roofReport, type RoofFailure } from "./roofcheck";
import { ROOF_ACCESS, ROOF_SMALL, ROOF_WATER_TOWER, BILLBOARD_STRUCTURE, BILLBOARD_FACES, BILLBOARD_SIGN_Y_M, WATER_TOWER_PER_BUILDINGS, roofBounds } from "./roofkit";
import { columnLoads, deckY, placeOnRoof, roofInsets, streetMid } from "./roofs";
import { makeCtx } from "./facts";
import { runsOf } from "./dress";
import { DEFAULT, VARIED, label, layersOf, type Layers } from "./testcities";
import { ALL_NAMED } from "../testing/namedcities";

const { mass, buildings, facades } = layersOf(DEFAULT);
const ctx = makeCtx(mass, buildings);
const key = (c: CityCell): string => `${c.i},${c.j}`;
const colOf = (c: CityCell): CityColumn => ctx.col.get(key(c))!;
const roofsOf = (): CityRoofPiece[] => facades.roofs!.map((p) => ({ ...p, cell: { ...p.cell }, placement: { ...p.placement } }));
const wallsOf = (): CityWallPiece[] => facades.walls!.map((p) => ({ ...p, cell: { ...p.cell }, placement: { ...p.placement } }));
const checkWith = (roofs: readonly CityRoofPiece[], walls?: readonly CityWallPiece[]): RoofFailure[] => roofReport({ ...facades, roofs, walls: walls ?? facades.walls! }, { mass, buildings }).failures;
const has = (f: readonly RoofFailure[], check: string, text?: string): boolean => f.some((x) => x.check === check && (text === undefined || x.reason.includes(text)));
const OPP = { "+x": "-x", "-x": "+x", "+z": "-z", "-z": "+z" } as const;
const SIDE = { "+x": [1, 0], "-x": [-1, 0], "+z": [0, 1], "-z": [0, -1] } as const;
const frameOf = (col: CityColumn, p: CityRoofPiece): { cx: number; cz: number } => {
  const q = (((col.yaw / 90) % 4) + 4) % 4;
  const dx = p.placement.x_m - (col.i + 0.5) * 5;
  const dz = p.placement.z_m - (col.j + 0.5) * 5;
  // the inverse of the column's turn, by hand
  return [{ cx: dx, cz: dz }, { cx: -dz, cz: dx }, { cx: -dx, cz: -dz }, { cx: dz, cz: -dx }][q]!;
};
const replaceAt = (roofs: CityRoofPiece[], p: CityRoofPiece, q: CityRoofPiece): void => {
  roofs[roofs.indexOf(p)] = q;
};
const exits = (): CityRoofPiece[] => roofsOf().filter((p) => p.kind === "exit");

describe("the failing fixtures (criterion 5)", () => {
  it("positive control: the default city's layer has no roof failure", () => {
    expect(checkWith(roofsOf())).toEqual([]);
  });

  it("today's placement (068 criterion 3's fixture): an exit turned back to its column's yaw, its door toward the street, fails M9b on the door", () => {
    const roofs = roofsOf();
    const e = roofs.find((p) => p.kind === "exit" && colOf(p.cell).kind === "mid")!;
    const col = colOf(e.cell);
    replaceAt(roofs, e, { ...e, facing: col.front, placement: { ...e.placement, yaw_deg: col.yaw } });
    const f = checkWith(roofs);
    expect(has(f, "M9b", "door")).toBe(true);
  });

  it("an exit moved onto a mid column of a building that has a blind column fails RX", () => {
    const roofs = roofsOf();
    const e = roofs.find((p) => {
      if (p.kind !== "exit" || colOf(p.cell).kind !== "blind") return false;
      const b = buildings.buildings.find((x) => x.id === p.building)!;
      return b.cells.some((c) => colOf(c).kind === "mid");
    });
    expect(e, "the default city has an exit on a blind column of a building with a mid column").toBeDefined();
    const b = buildings.buildings.find((x) => x.id === e!.building)!;
    const mid = colOf(b.cells.find((c) => colOf(c).kind === "mid")!);
    const d = roofBounds(ROOF_ACCESS);
    replaceAt(roofs, e!, { ...e!, cell: { i: mid.i, j: mid.j }, facing: OPP[mid.front], placement: placeOnRoof(mid, ROOF_ACCESS, 0, 2.2 - d.d / 2, deckY(mid), 180) });
    expect(has(checkWith(roofs), "RX")).toBe(true);
  });

  it("a small prop moved onto an exit's clear deck fails M9b on the deck", () => {
    const roofs = roofsOf();
    const e = roofs.find((p) => p.kind === "exit")!;
    const col = colOf(e.cell);
    const s = roofs.find((p) => p.kind === "small")!;
    // the clear deck lies from z -1.851 to -0.651 in the frame: a small prop at z -1.25
    replaceAt(roofs, s, { ...s, building: e.building, cell: { i: col.i, j: col.j }, placement: placeOnRoof(col, ROOF_SMALL[0]!, 0, -1.25, deckY(col), 0) });
    expect(has(checkWith(roofs), "M9b", "clear deck")).toBe(true);
  });

  it("an exit moved 0.2 m toward its column's front edge (past 0.3 m) fails the deck", () => {
    const roofs = roofsOf();
    const e = roofs.find((p) => p.kind === "exit")!;
    const col = colOf(e.cell);
    const f = frameOf(col, e);
    replaceAt(roofs, e, { ...e, placement: placeOnRoof(col, ROOF_ACCESS, f.cx, f.cz + 0.2, e.placement.y_m, 180) });
    expect(has(checkWith(roofs), "deck")).toBe(true);
  });

  it("a small prop raised 0.1 m off the deck fails the deck's base", () => {
    const roofs = roofsOf();
    const s = roofs.find((p) => p.kind === "small")!;
    replaceAt(roofs, s, { ...s, placement: { ...s.placement, y_m: s.placement.y_m + 0.1 } });
    expect(has(checkWith(roofs), "deck", "base")).toBe(true);
  });

  it("a small prop moved into the footprint of a party window or pipe over its roof fails RK", () => {
    const roofs = roofsOf();
    const ins = roofInsets(facades.walls!);
    const s = roofs.find((p) => p.kind === "small" && ins.has(key(p.cell)))!;
    expect(s, "the default city has a small prop on a roof under a party-wall piece").toBeDefined();
    const col = colOf(s.cell);
    const [side] = [...ins.get(key(col))!.keys()];
    const v = SIDE[side!];
    // the side's direction in the column's frame, by hand (the inverse of the turn)
    const q = (((col.yaw / 90) % 4) + 4) % 4;
    const fv = [{ x: v[0], z: v[1] }, { x: -v[1], z: v[0] }, { x: -v[0], z: -v[1] }, { x: v[1], z: -v[0] }][q]!;
    const e = roofBounds(s.placement.key);
    const f = frameOf(col, s);
    // its extent toward that side reaches the plain deck's edge, 0.3 m in: past the inset the party-wall piece asks for
    const cx = fv.x !== 0 ? fv.x * (2.2 - e.w / 2) : f.cx;
    const cz = fv.z !== 0 ? fv.z * (2.2 - e.d / 2) : f.cz;
    replaceAt(roofs, s, { ...s, placement: placeOnRoof(col, s.placement.key, cx, cz, s.placement.y_m, ((s.placement.yaw_deg - col.yaw + 360) % 360) as 0 | 180) });
    const failed = checkWith(roofs);
    expect(has(failed, "RK")).toBe(true);
    expect(has(failed, "deck")).toBe(false);
  });

  it("a big prop moved onto a corner column fails the roofs", () => {
    const roofs = roofsOf();
    const t = roofs.find((p) => p.kind === "waterTower")!;
    const b = buildings.buildings.find((x) => x.cells.some((c) => colOf(c).kind === "corner"))!;
    const corner = colOf(b.cells.find((c) => colOf(c).kind === "corner")!);
    replaceAt(roofs, t, { ...t, building: b.id, cell: { i: corner.i, j: corner.j }, facing: corner.front, placement: placeOnRoof(corner, ROOF_WATER_TOWER, 0, 0, deckY(corner), 0) });
    expect(has(checkWith(roofs), "roofs", "corner")).toBe(true);
  });

  it("a second big prop on one building fails the roofs", () => {
    const roofs = roofsOf();
    const t = roofs.find((p) => p.kind === "waterTower")!;
    const b = buildings.buildings.find((x) => x.id === t.building)!;
    const other = b.cells.map(colOf).find((c) => c.kind !== "corner" && key(c) !== key(t.cell));
    expect(other, "the default city has a tower on a building with a second non-corner column").toBeDefined();
    roofs.push({ ...t, cell: { i: other!.i, j: other!.j }, placement: placeOnRoof(other!, ROOF_WATER_TOWER, 0, 0, deckY(other!), 0) });
    expect(has(checkWith(roofs), "roofs", "big roof props")).toBe(true);
  });

  /** A street mid column with no roof piece, in a building of the run of `run`, other than `except`. */
  const freeStreetMid = (pred: (c: CityColumn, b: (typeof buildings.buildings)[number]) => boolean): { col: CityColumn; building: string } | undefined => {
    const used = new Set(facades.roofs!.map((p) => key(p.cell)));
    for (const b of buildings.buildings) for (const c of b.cells.map(colOf)) if (!used.has(key(c)) && pred(c, b)) return { col: c, building: b.id };
    return undefined;
  };

  it("a second billboard in one run fails the roofs", () => {
    const runOf = runsOf(buildings);
    const roofs = roofsOf();
    const s = roofs.find((p) => p.kind === "billboard")!;
    const run = runOf.get(s.building)!;
    const spot = freeStreetMid((c, b) => streetMid(ctx, c) && runOf.get(b.id) === run && b.id !== s.building);
    expect(spot, "the run of a billboard has another building with a free street mid column").toBeDefined();
    const { col, building } = spot!;
    const fb = roofBounds(BILLBOARD_FACES[0]!);
    const sb = roofBounds(BILLBOARD_STRUCTURE);
    roofs.push(
      { kind: "billboard", building, cell: { i: col.i, j: col.j }, facing: col.front, placement: placeOnRoof(col, BILLBOARD_STRUCTURE, 0, 2.22 - fb.d - sb.d / 2, deckY(col), 0) },
      { kind: "billboardFace", building, cell: { i: col.i, j: col.j }, facing: col.front, placement: placeOnRoof(col, BILLBOARD_FACES[0]!, 0, 2.22 - fb.d / 2, deckY(col) + BILLBOARD_SIGN_Y_M, 0) },
    );
    expect(has(checkWith(roofs), "roofs", "billboards")).toBe(true);
  });

  it("a novelty piece (LargeSign_Pizza_01) put on a street mid column with room for it that is not a shop's (a door's or a floor's) fails the roofs (NV; H1c)", () => {
    const shopCells = new Set(facades.shops!.flatMap((s) => s.cells.map(key)));
    const spot = freeStreetMid((c) => streetMid(ctx, c) && !shopCells.has(key(c)));
    expect(spot, "the default city has a free street mid column that is not a shop's").toBeDefined();
    const { col, building } = spot!;
    const roofs = roofsOf();
    roofs.push({ kind: "novelty", building, cell: { i: col.i, j: col.j }, facing: col.front, placement: placeOnRoof(col, "city-pack:SM_Prop_LargeSign_Pizza_01", 0, 0, deckY(col), 0) });
    expect(has(checkWith(roofs), "roofs", "NV")).toBe(true);
  });

  it("a billboard moved 0.03 m toward a side edge (past 0.28 m) fails the deck", () => {
    const roofs = roofsOf();
    const s = roofs.find((p) => p.kind === "billboard" && !roofInsets(facades.walls!).has(key(p.cell)))!;
    const col = colOf(s.cell);
    const f = frameOf(col, s);
    replaceAt(roofs, s, { ...s, placement: placeOnRoof(col, BILLBOARD_STRUCTURE, f.cx + 0.03, f.cz, s.placement.y_m, 0) });
    expect(has(checkWith(roofs), "deck")).toBe(true);
  });

  it("a billboard (structure and face) put on a quiet front fails RB", () => {
    const roofs = roofsOf();
    const quiet = freeStreetMid((c) => c.kind === "mid" && !streetMid(ctx, c) && !roofInsets(facades.walls!).has(key(c)));
    expect(quiet, "the default city has a free quiet-front mid column").toBeDefined();
    const { col, building } = quiet!;
    const fb = roofBounds(BILLBOARD_FACES[0]!);
    const sb = roofBounds(BILLBOARD_STRUCTURE);
    // a run with no billboard of its own, so the only failure is RB: take the city's billboards away first
    const kept = roofs.filter((p) => p.kind !== "billboard" && p.kind !== "billboardFace");
    kept.push(
      { kind: "billboard", building, cell: { i: col.i, j: col.j }, facing: col.front, placement: placeOnRoof(col, BILLBOARD_STRUCTURE, 0, 2.22 - fb.d - sb.d / 2, deckY(col), 0) },
      { kind: "billboardFace", building, cell: { i: col.i, j: col.j }, facing: col.front, placement: placeOnRoof(col, BILLBOARD_FACES[0]!, 0, 2.22 - fb.d / 2, deckY(col) + BILLBOARD_SIGN_Y_M, 0) },
    );
    expect(has(checkWith(kept), "RB")).toBe(true);
  });

  it("a roof piece added to a column already at DRESS_PER_BAY_MAX fails the cap; a column whose only extra pieces are party-wall pieces passes it (PW7)", () => {
    const loads = columnLoads(facades, buildings);
    const perCol = new Map<string, number>();
    for (const p of facades.roofs!) perCol.set(key(p.cell), (perCol.get(key(p.cell)) ?? 0) + 1);
    const total = (k: string): number => (loads.get(k) ?? 0) + (perCol.get(k) ?? 0);
    const full = buildings.columns!.find((c) => c.kind !== "corner" && total(key(c)) === 6);
    expect(full, "the default city has a column at the cap").toBeDefined();
    const roofs = roofsOf();
    const b = buildings.buildings.find((x) => x.id === full!.building)!;
    roofs.push({ kind: "small", building: b.id, cell: { i: full!.i, j: full!.j }, facing: full!.front, placement: placeOnRoof(full!, ROOF_SMALL[0]!, 0, 0, deckY(full!), 0) });
    expect(has(checkWith(roofs), "cap")).toBe(true);
    // the positive test: eight party-wall pieces added to one column's cell do not count
    const walls = wallsOf();
    const party = walls.find((p) => p.kind === "partyBoard")!;
    for (let n = 0; n < 8; n++) walls.push({ ...party });
    const f = checkWith(roofsOf(), walls);
    expect(has(f, "cap")).toBe(false);
    expect(columnLoads({ dressing: facades.dressing!, walls }, buildings).get(key(party.cell))).toBe(columnLoads(facades, buildings).get(key(party.cell)));
  });

  /**
   * TC's fixtures: `target` is a layer, `pick` finds a block and a building of it with no big prop and a mid column to put a water tower on, placed as H3's tower is (its front edge on the deck's front, centred), the column's
   * small props removed so nothing else fails. Returns the roofs with the tower in its building's place in the order.
   */
  const withExtraTower = (l: Layers, want: (blockSize: number, towers: number, cap: number) => boolean): { roofs: CityRoofPiece[]; block: string } => {
    const c = makeCtx(l.mass, l.buildings);
    const col = (cell: CityCell): CityColumn => c.col.get(key(cell))!;
    const insets = roofInsets(l.facades.walls!);
    const loads = columnLoads(l.facades, l.buildings);
    const size = new Map<string, number>();
    for (const b of l.buildings.buildings) size.set(b.block, (size.get(b.block) ?? 0) + 1);
    const blockOf = new Map(l.buildings.buildings.map((b) => [b.id, b.block] as const));
    const towers = new Map<string, number>();
    for (const p of l.facades.roofs!) if (p.kind === "waterTower") towers.set(blockOf.get(p.building)!, (towers.get(blockOf.get(p.building)!) ?? 0) + 1);
    const hasBig = new Set(l.facades.roofs!.filter((p) => p.kind !== "small").map((p) => p.building));
    const e = roofBounds(ROOF_WATER_TOWER);
    for (const [idx, b] of l.buildings.buildings.entries()) {
      const n = size.get(b.block)!;
      if (hasBig.has(b.id) || !want(n, towers.get(b.block) ?? 0, Math.floor(n / WATER_TOWER_PER_BUILDINGS))) continue;
      const cell = b.cells.find((q) => {
        const m = col(q);
        if (m.kind !== "mid" || insets.has(key(m))) return false;
        return (loads.get(key(m)) ?? 0) + 1 <= 6;
      });
      if (!cell) continue;
      const m = col(cell);
      const roofs = l.facades.roofs!.filter((p) => key(p.cell) !== key(m)).map((p) => ({ ...p, cell: { ...p.cell }, placement: { ...p.placement } }));
      const tower: CityRoofPiece = { kind: "waterTower", building: b.id, cell: { i: m.i, j: m.j }, facing: m.front, placement: placeOnRoof(m, ROOF_WATER_TOWER, 0, 2.2 - e.d / 2, deckY(m), 0) };
      const at = roofs.findIndex((p) => l.buildings.buildings.findIndex((q) => q.id === p.building) >= idx);
      roofs.splice(at < 0 ? roofs.length : at, 0, tower);
      return { roofs, block: b.block };
    }
    throw new Error("no such building in this layer");
  };
  const checkOn = (l: Layers, roofs: readonly CityRoofPiece[]): RoofFailure[] => roofReport({ ...l.facades, roofs }, { mass: l.mass, buildings: l.buildings }).failures;

  it("TC, one over the cap: a water tower put on another building of a block that holds its cap (placed as H3's tower is, its column's small props removed) fails TC, and only TC; the positive control passes TC", () => {
    const l = layersOf(DEFAULT);
    expect(checkOn(l, l.facades.roofs!), "positive control, TC included").toEqual([]);
    const { roofs, block } = withExtraTower(l, (n, t, cap) => cap >= 1 && t === cap);
    const f = checkOn(l, roofs);
    expect([...new Set(f.map((x) => x.check))], f.map((x) => x.reason).join("; ")).toEqual(["TC"]);
    expect(f[0]!.reason).toContain(block);
    expect(f[0]!.cells.length).toBeGreaterThan(1);
  });

  it("TC, a small block: a water tower put on a block of fewer than 16 buildings (the default city's if it has one, else the first named run's that has one) fails TC, and only TC", () => {
    let l = layersOf(DEFAULT);
    const small = (x: Layers): boolean => {
      const size = new Map<string, number>();
      for (const b of x.buildings.buildings) size.set(b.block, (size.get(b.block) ?? 0) + 1);
      return [...size.values()].some((n) => n < WATER_TOWER_PER_BUILDINGS);
    };
    let from = label(DEFAULT);
    if (!small(l)) {
      const o = [...VARIED, ...ALL_NAMED].find((q) => small(layersOf(q)));
      expect(o, "a named run has a block under 16 buildings").toBeDefined();
      l = layersOf(o!);
      from = label(o!);
    }
    const { roofs, block } = withExtraTower(l, (n) => n < WATER_TOWER_PER_BUILDINGS);
    const f = checkOn(l, roofs);
    expect([...new Set(f.map((x) => x.check))], `${from}: ${f.map((x) => x.reason).join("; ")}`).toEqual(["TC"]);
    expect(f[0]!.reason).toContain(block);
  });

  it("every roof piece removed fails R8's first number; every big prop removed fails its second", () => {
    const none = checkWith([]);
    expect(has(none, "R8", "buildings with a roof piece")).toBe(true);
    const smallOnly = roofsOf().filter((p) => p.kind === "small");
    expect(has(checkWith(smallOnly), "R8", "runs with a big roof prop")).toBe(true);
  });
});
