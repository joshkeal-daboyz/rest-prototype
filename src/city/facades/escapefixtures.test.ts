/**
 * Stage 7, section H2, criterion 6's failing fixtures. Each is built from the default city's layers (6 x 6 seed 1, one-way on), typed in from the run in the test (not pinned by hash), with one thing changed, and must fail
 * the named check. The unchanged layer must pass (the sanity test), so a fixture fails for its own change. The checks also hold on the 20 named runs through the stage itself (`escape.test.ts` and `escapereport.test.ts`
 * run them; the stage fails a run that breaks one).
 */
import { describe, expect, it } from "vitest";
import type { CityCell, CityDressingPiece, CityFacadesLayer, CityMassLayer, CityWallPiece } from "../../core";
import { runsOf } from "./dress";
import { facesStalls, makeCtx } from "./facts";
import { keyOf, rotate } from "./place";
import { DEFAULT, layersOf } from "./testcities";
import { wallFailures, wallReport } from "./wallcheck";

const L = layersOf(DEFAULT);
const walls = L.facades.walls!;
const dressing = L.facades.dressing!;
const input = { mass: L.mass, buildings: L.buildings };
const ctx = makeCtx(L.mass, L.buildings);
const colAt = new Map(L.buildings.columns!.map((c) => [keyOf(c), c] as const));
const groundAt = new Map(L.facades.ground.flatMap((g) => g.cells.map((c) => [keyOf(c), g] as const)));
const buildingOf = new Map(L.buildings.buildings.map((b) => [b.id, b] as const));
const runOf = runsOf(L.buildings);

const layerOf = (w: readonly CityWallPiece[], d: readonly CityDressingPiece[] = dressing): CityFacadesLayer => ({ ...L.facades, walls: w, dressing: d });
const failuresOf = (w: readonly CityWallPiece[], d?: readonly CityDressingPiece[], mass: CityMassLayer = L.mass) => wallFailures(layerOf(w, d), { mass, buildings: L.buildings });
const checksOf = (w: readonly CityWallPiece[], d?: readonly CityDressingPiece[], mass?: CityMassLayer): Set<string> => new Set(failuresOf(w, d, mass).map((f) => f.check));
const reasonsOf = (w: readonly CityWallPiece[]): string[] => failuresOf(w).map((f) => f.reason);
const escapeOf = (id: string): CityWallPiece[] => walls.filter((p) => p.building === id && p.kind === "escape");
const swapAll = (from: readonly CityWallPiece[], to: (p: CityWallPiece) => CityWallPiece): CityWallPiece[] => walls.map((p) => (from.includes(p) ? to(p) : p));
const withCell = (p: CityWallPiece, building: string, cell: CityCell): CityWallPiece => ({ ...p, building, cell: { i: cell.i, j: cell.j } });
/** `p` moved `m` metres along its own front (+z in its frame) and `dx` across it. */
const moved = (p: CityWallPiece, dx: number, dz: number): CityWallPiece => {
  const r = rotate(p.placement.yaw_deg, dx, dz);
  return { ...p, placement: { ...p.placement, x_m: p.placement.x_m + r.x, z_m: p.placement.z_m + r.z } };
};
const streetEscapes = walls.filter((p) => p.kind === "escape" && p.storey === 1 && groundAt.get(keyOf(p.cell))!.frontage === "street");
const quietEscapes = walls.filter((p) => p.kind === "escape" && p.storey === 1 && groundAt.get(keyOf(p.cell))!.frontage === "quiet");
const firstEscape = streetEscapes[0]!;
const escapeIds = new Set(walls.filter((p) => p.kind === "escape").map((p) => p.building));

describe("the failing fixtures (criterion 6)", { timeout: 120_000 }, () => {
  it("sanity: the default city's own walls pass every check, and the report's numbers are as the stage's", () => {
    const rep = wallReport(L.facades, input);
    expect(rep.failures).toEqual([]);
    expect(rep.metrics.r7).toBeGreaterThanOrEqual(0.4);
    expect(rep.metrics.escapeShort).toBe(0);
    expect(rep.metrics.streetEscapes).toBeGreaterThan(50);
    expect(rep.metrics.quietEscapes).toBeGreaterThan(30);
    expect(rep.metrics.packEscapes).toBe(rep.metrics.streetEscapes + rep.metrics.quietEscapes);
    expect(rep.metrics.maxPerColumn).toBeLessThanOrEqual(6);
  });

  it("a layer with no walls fails the shape check", () => {
    expect(new Set(wallFailures({ stage: "facades", ground: L.facades.ground, dressing }, input).map((f) => f.check))).toEqual(new Set(["H2"]));
  });

  it("an escape moved onto a building's door column fails the hosts; one moved onto a corner column fails the hosts", () => {
    const door = L.facades.ground.find((g) => g.kind === "door" && escapeIds.has(g.building))!;
    expect(door).toBeDefined();
    const onDoor = swapAll(escapeOf(door.building), (p) => withCell(p, door.building, door.cells[0]!));
    expect(checksOf(onDoor).has("hosts")).toBe(true);
    expect(reasonsOf(onDoor).some((r) => /a door column/.test(r))).toBe(true);
    const b = L.buildings.buildings.find((x) => escapeIds.has(x.id) && x.cells.some((c) => colAt.get(keyOf(c))!.kind === "corner"))!;
    expect(b).toBeDefined();
    const corner = b.cells.find((c) => colAt.get(keyOf(c))!.kind === "corner")!;
    const onCorner = swapAll(escapeOf(b.id), (p) => withCell(p, b.id, corner));
    expect(checksOf(onCorner).has("hosts")).toBe(true);
    expect(reasonsOf(onCorner).some((r) => /a corner column/.test(r))).toBe(true);
  });

  it("one escape deck lowered 0.06 m fails escapeCheck on the deck", () => {
    const pieces = escapeOf(firstEscape.building);
    const bad = swapAll([pieces[1]!], (p) => ({ ...p, placement: { ...p.placement, y_m: p.placement.y_m - 0.06 } }));
    expect(checksOf(bad).has("escapeCheck")).toBe(true);
    expect(reasonsOf(bad).some((r) => /\(deck\)/.test(r))).toBe(true);
    expect(checksOf(walls).has("escapeCheck")).toBe(false);
  });

  it("one flight's piece shifted 0.03 m in x fails escapeCheck on the joint", () => {
    const pieces = escapeOf(firstEscape.building);
    const bad = swapAll([pieces[0]!], (p) => moved(p, 0.03, 0));
    expect(checksOf(bad).has("escapeCheck")).toBe(true);
    expect(reasonsOf(bad).some((r) => /\(joint\)/.test(r))).toBe(true);
    expect(reasonsOf(bad).some((r) => /\(deck\)/.test(r))).toBe(false);
  });

  it("the ladder's foot raised 0.03 m fails escapeCheck on the ladder", () => {
    const first = escapeOf(firstEscape.building)[0]!;
    expect(first.boxes.length).toBeGreaterThan(2);
    const bad = swapAll([first], (p) => ({ ...p, boxes: p.boxes.map((b) => ({ ...b, y_m: b.y_m + 0.03 })) }));
    expect(checksOf(bad).has("escapeCheck")).toBe(true);
    expect(reasonsOf(bad).some((r) => /\(ladder\)/.test(r))).toBe(true);
  });

  it("the top storey's piece removed fails escapeCheck on the missing storey", () => {
    const pieces = escapeOf(firstEscape.building);
    const top = pieces[pieces.length - 1]!;
    const bad = walls.filter((p) => p !== top);
    expect(checksOf(bad).has("escapeCheck")).toBe(true);
    expect(reasonsOf(bad).some((r) => /no platform/.test(r))).toBe(true);
  });

  it("an escape added on the row neighbour of an escape building in the same run fails the neighbour rule", () => {
    const list = L.buildings.buildings;
    const n = list.findIndex((b, k) => escapeIds.has(b.id) && k + 1 < list.length && !escapeIds.has(list[k + 1]!.id) && runOf.get(list[k + 1]!.id) === runOf.get(b.id) && list[k + 1]!.cells.some((c) => colAt.get(keyOf(c))!.kind === "mid"));
    expect(n).toBeGreaterThanOrEqual(0);
    const next = list[n + 1]!;
    const mid = next.cells.find((c) => colAt.get(keyOf(c))!.kind === "mid")!;
    const bad = [...walls, ...escapeOf(list[n]!.id).map((p) => withCell(p, next.id, mid))];
    expect(checksOf(bad).has("neighbour")).toBe(true);
    expect(checksOf(walls).has("neighbour")).toBe(false);
  });

  it("every street escape removed fails R7", () => {
    const street = new Set(streetEscapes.map((p) => p.building));
    const bad = walls.filter((p) => !(p.kind === "escape" && street.has(p.building)));
    expect(reasonsOf(bad).some((r) => /fire escape is 0\.000, under 0\.4/.test(r))).toBe(true);
    expect(checksOf(bad).has("R7")).toBe(true);
  });

  it("an awning put back on an escape bay fails EP", () => {
    const awning = dressing.find((p) => p.kind === "awning" && !p.wrap)!;
    const bay = groundAt.get(keyOf(firstEscape.cell))!;
    const back: CityDressingPiece = { ...awning, building: bay.building, cell: bay.cells[0]!, face: colAt.get(keyOf(bay.cells[0]!))!.front };
    expect(checksOf(walls, [...dressing, back]).has("EP")).toBe(true);
    expect(checksOf(walls).has("EP")).toBe(false);
  });

  it("a quiet escape moved onto a column facing stalls fails ET (one cell across set to stalls in the fixture's mass, as no such column is chosen)", () => {
    const q = quietEscapes[0]!;
    expect(q).toBeDefined();
    const col = colAt.get(keyOf(q.cell))!;
    expect(facesStalls(ctx, col)).toBe(false);
    const across = { i: col.i + (col.front === "+x" ? 1 : col.front === "-x" ? -1 : 0), j: col.j + (col.front === "+z" ? 1 : col.front === "-z" ? -1 : 0) };
    const mass: CityMassLayer = { ...L.mass, cells: L.mass.cells.map((c) => (c.i === across.i && c.j === across.j ? { ...c, use: "stalls" as const } : c)) };
    expect(checksOf(walls, undefined, mass).has("ET")).toBe(true);
    expect(checksOf(walls).has("ET")).toBe(false);
  });

  it("an escape turned onto a side that is not open fails the hosts (16.11)", () => {
    const col = colAt.get(keyOf(firstEscape.cell))!;
    const closed = (["+x", "-x", "+z", "-z"] as const).find((s) => !ctx.built.get(keyOf(col))!.open.some((o) => o.side === s))!;
    const bad = swapAll(escapeOf(firstEscape.building), (p) => ({ ...p, face: closed }));
    expect(checksOf(bad).has("hosts")).toBe(true);
    expect(reasonsOf(bad).some((r) => /not an open side/.test(r))).toBe(true);
  });

  it("an air-conditioner on the escape column, one on storey 1, a fifth wall prop on one building, and one on a blind column each fail WP1 or WP2 by name", () => {
    const prop = walls.find((p) => p.kind === "aircon")!;
    const esc = escapeOf(firstEscape.building)[0]!;
    const onEscape = [...walls, { ...withCell(prop, esc.building, esc.cell), storey: 2 }];
    expect(reasonsOf(onEscape).some((r) => /its building's escape column/.test(r))).toBe(true);
    expect(checksOf(onEscape).has("WP1")).toBe(true);
    const low = walls.map((p) => (p === prop ? { ...p, storey: 1 } : p));
    expect(reasonsOf(low).some((r) => /is on storey 1, outside 2 to/.test(r))).toBe(true);
    expect(checksOf(low).has("WP1")).toBe(true);
    const counts = new Map<string, number>();
    for (const p of walls) if (p.kind === "aircon" || p.kind === "planter") counts.set(p.building, (counts.get(p.building) ?? 0) + 1);
    const full = [...counts].find(([, n]) => n === 4)![0];
    const fifth = [...walls, walls.find((p) => p.building === full && p.kind !== "escape" && p.kind !== "canopy")!];
    expect(reasonsOf(fifth).some((r) => /has 5 wall props, over 4/.test(r))).toBe(true);
    const blind = L.buildings.columns!.find((c) => c.kind === "blind")!;
    expect(blind).toBeDefined();
    const onBlind = [...walls, withCell(prop, blind.building, blind)];
    expect(checksOf(onBlind).has("WP2")).toBe(true);
    expect(checksOf(walls).has("WP1") || checksOf(walls).has("WP2")).toBe(false);
  });

  it("a canopy on a doorCorner fails WP3; a canopy moved 0.1 m off its host's face fails attachment", () => {
    const canopy = walls.find((p) => p.kind === "canopy")!;
    const corner = L.facades.ground.find((g) => g.kind === "doorCorner")!;
    expect(corner).toBeDefined();
    const bad = [...walls, withCell(canopy, corner.building, corner.cells[0]!)];
    expect(checksOf(bad).has("WP3")).toBe(true);
    expect(reasonsOf(bad).some((r) => /not a residents' door/.test(r))).toBe(true);
    const off = walls.map((p) => (p === canopy ? moved(p, 0, 0.1) : p));
    expect(checksOf(off).has("attach")).toBe(true);
    expect(reasonsOf(off).some((r) => /back plane/.test(r))).toBe(true);
  });

  it("a wall piece that is not on a column of its building fails the shape check; a building's id is looked up (buildingOf)", () => {
    const stray = { ...walls[0]!, building: "nowhere" };
    expect(checksOf([...walls, stray]).has("H2")).toBe(true);
    expect(buildingOf.get(firstEscape.building)).toBeDefined();
  });
});
