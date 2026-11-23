/**
 * Ticket 070 I, criterion 6: the plazas and frontage lots on the 20 named runs (PZ, FL, AV), and hand-worked pieces.
 */
import { describe, expect, it } from "vitest";
import type { CityGroundProp } from "../../core";
import { BILLBOARD_BOARD_LIFT_M } from "./constants";
import { groundFailures } from "./groundcheck";
import { buildKeepouts } from "./keepout";
import { SIDE_VEC, cellKey } from "./geom";
import { BILLBOARD_BOARD, BILLBOARD_POLE, KIT_BOUNDS } from "./kit";
import { layoutLots } from "./lots";
import { newStats } from "./stats";
import { NAMED, label, layersOf } from "./testcities";

describe("the plazas and frontage lots on the 20 named runs (criterion 6)", { timeout: 120_000 }, () => {
  const seen = { plazas: 0, lots: 0, plazaTrees: 0, billboards: 0 };
  for (const o of NAMED) {
    it(`${label(o)}: every plaza and every frontage lot is dressed, every piece is inside its opening and clear, there is no paving panel, and a billboard stands under its lot's lowest eave`, () => {
      const l = layersOf(o);
      expect(groundFailures(l.ground, { mass: l.mass, edge: l.edge, facades: l.facades })).toEqual([]);
      const byHost = new Map<string, CityGroundProp[]>();
      for (const p of l.ground.props) {
        if (p.on !== "plaza" && p.on !== "frontLot") continue;
        const list = byHost.get(p.host);
        if (list) list.push(p);
        else byHost.set(p.host, [p]);
      }
      const storeysAt = new Map<string, number>();
      for (const b of l.buildings.buildings) for (const c of b.cells) storeysAt.set(cellKey(c.i, c.j), b.storeys);
      for (const op of l.mass.openings) {
        if (op.kind !== "plaza" && op.kind !== "frontLot") continue;
        const pieces = byHost.get(op.id) ?? [];
        expect(pieces.length, `${op.id} is not dressed`).toBeGreaterThan(0);
        const i0 = Math.min(...op.cells.map((c) => c.i)) * 5;
        const i1 = (Math.max(...op.cells.map((c) => c.i)) + 1) * 5;
        const j0 = Math.min(...op.cells.map((c) => c.j)) * 5;
        const j1 = (Math.max(...op.cells.map((c) => c.j)) + 1) * 5;
        for (const p of pieces) {
          expect(p.on).toBe(op.kind === "plaza" ? "plaza" : "frontLot");
          expect(p.placement.x_m - p.size.x_m / 2).toBeGreaterThanOrEqual(i0 - 1e-6);
          expect(p.placement.x_m + p.size.x_m / 2).toBeLessThanOrEqual(i1 + 1e-6);
          expect(p.placement.z_m - p.size.z_m / 2).toBeGreaterThanOrEqual(j0 - 1e-6);
          expect(p.placement.z_m + p.size.z_m / 2).toBeLessThanOrEqual(j1 + 1e-6);
        }
        if (op.kind === "plaza") {
          seen.plazas++;
          seen.plazaTrees += pieces.filter((p) => p.kind === "tree").length;
        } else {
          seen.lots++;
          // the lot's two markings tiles are always there (nothing stands over a flat piece)
          expect(pieces.filter((p) => p.kind === "lotLines")).toHaveLength(2);
          const pole = pieces.find((p) => p.kind === "billboardPole");
          if (pole) {
            seen.billboards++;
            let eave = Infinity;
            for (const c of op.cells) for (const v of Object.values(SIDE_VEC)) eave = Math.min(eave, 3 * (storeysAt.get(cellKey(c.i + v[0], c.j + v[1])) ?? Infinity));
            expect(Math.max(KIT_BOUNDS[BILLBOARD_POLE]!.h, BILLBOARD_BOARD_LIFT_M + KIT_BOUNDS[BILLBOARD_BOARD]!.h)).toBeLessThanOrEqual(eave);
          }
        }
      }
      for (const p of l.ground.props) expect(p.placement.key.includes("Sidewalk_Panel")).toBe(false);
    });
  }

  it("the named runs have plazas and frontage lots, and plaza trees (some groups are left out under stage 7: fewer trees than the old city would place)", () => {
    expect(seen.plazas).toBeGreaterThan(0);
    expect(seen.lots).toBeGreaterThan(0);
    expect(seen.plazaTrees).toBeGreaterThan(0);
  });
});

// ---- hand-worked: a 2 by 2 opening on cells (3, 3) to (4, 4): x and z from 15 m to 25 m, centre (20, 20), the street on its +z side ----

const cells = [
  { i: 3, j: 3 },
  { i: 4, j: 3 },
  { i: 3, j: 4 },
  { i: 4, j: 4 },
];
const edge = { cells: [3, 4].map((i) => ({ i, j: 5, role: "pavement", street: "x:1", band: 0, faces: "block:0:0" })) };
const opening = (kind: "plaza" | "frontLot"): unknown => ({ id: `${kind}:1`, kind, block: "block:0:0", cells, mouth: kind === "frontLot" ? [{ street: "x:1", cells: [] }] : [] });
const keep = (dressing: unknown[] = []) => buildKeepouts({ mass: { built: [] }, edge: { cells: [], ground: [] }, facades: { ground: [], dressing, walls: [], novelty: [] } } as never);
/** Every chance 0.1: both trees, the picnic table with its umbrella on the - side, both benches, both pots; the first of every pick. */
const unit = (): number => 0.1;
const r6 = (n: number): number => Math.round(n * 1e6) / 1e6;
const rand = (): number => 0;

function dress(kind: "plaza" | "frontLot", storeys = 3, dressing: unknown[] = []): { props: CityGroundProp[]; stats: ReturnType<typeof newStats> } {
  const stats = newStats();
  const layers = { mass: { openings: [opening(kind)] }, edge, buildings: { buildings: [{ id: "b", storeys, cells: [{ i: 2, j: 3 }] }] } } as never;
  return { props: layoutLots(layers, keep(dressing), rand, unit, stats), stats };
}

describe("hand-worked plaza and lot pieces (criterion 6)", () => {
  it("a plaza's trees stand at the back corners, p = +-3.6 and q = -3.5 in its frame (front +z: x = 20 +- 3.6, z = 16.5), and its front benches at p = +-3.2, q = 3.7 facing in", () => {
    const { props } = dress("plaza");
    const trees = props.filter((p) => p.kind === "tree");
    expect(trees.map((p) => [r6(p.placement.x_m), r6(p.placement.z_m)])).toEqual([
      [16.4, 16.5],
      [23.6, 16.5],
    ]);
    for (const t of trees) {
      expect(t.placement.key).toBe("city-pack:SM_Env_Tree_01");
      expect(t.placement.yaw_deg).toBe(0);
      expect(t.on).toBe("plaza");
      expect(t.placement.y_m).toBe(0);
    }
    const benches = props.filter((p) => p.kind === "bench");
    expect(benches.map((p) => [r6(p.placement.x_m), r6(p.placement.z_m), p.placement.yaw_deg])).toEqual([
      [16.8, 23.7, 180],
      [23.2, 23.7, 180],
    ]);
    // the picnic table at p = 0.6, the umbrella at p = -1.9 (the - side), both at q = -0.2: z = 19.8
    expect(props.find((p) => p.kind === "picnicTable")!.placement.x_m).toBeCloseTo(20.6, 12);
    expect(props.find((p) => p.kind === "umbrella")!.placement.x_m).toBeCloseTo(18.1, 12);
    expect(props.find((p) => p.kind === "picnicTable")!.placement.z_m).toBeCloseTo(19.8, 12);
    expect(props.some((p) => p.placement.key.includes("Panel"))).toBe(false);
  });

  it("a group under a stage 7 box is left out whole: an awning over the left tree takes that tree (AV) and not the right one", () => {
    const awning = { kind: "awning", building: "b", cell: { i: 0, j: 0 }, face: "+z", wrap: false, placement: { key: "city-pack:SM_Bld_Shop_Cover_05", x_m: 16.4, y_m: 2.85, z_m: 16.5, yaw_deg: 0 } };
    const { props, stats } = dress("plaza", 3, [awning]);
    expect(props.filter((p) => p.kind === "tree").map((p) => r6(p.placement.x_m))).toEqual([23.6]);
    expect(stats.plazaLost["tree:AV"]).toBe(1);
    // the benches stand 1 m under the box's base: kept
    expect(props.filter((p) => p.kind === "bench")).toHaveLength(2);
  });

  it("a frontage lot's two ParkingLines tiles are flat, 10 by 5 m, at q = -2.5 and 2.5: z = 17.5 and 22.5", () => {
    const { props } = dress("frontLot");
    const lines = props.filter((p) => p.kind === "lotLines");
    expect(lines.map((p) => [p.placement.x_m, p.placement.z_m])).toEqual([
      [20, 17.5],
      [20, 22.5],
    ]);
    for (const t of lines) {
      expect(t.flat).toBe(true);
      expect(t.size).toEqual({ x_m: 10, z_m: 5, h_m: 0 });
      expect(t.on).toBe("frontLot");
    }
  });

  it("a billboard stands only where its 6.9 m fits under the lowest eave beside the lot: 3 storeys (9 m) has one, 2 storeys (6 m) has none", () => {
    const tall = dress("frontLot", 3);
    expect(tall.props.some((p) => p.kind === "billboardPole")).toBe(true);
    const board = tall.props.find((p) => p.kind === "billboardBoard")!;
    expect(board.placement.y_m).toBe(BILLBOARD_BOARD_LIFT_M);
    expect(tall.stats.lotEaveMin).toBe(9);
    const low = dress("frontLot", 2);
    expect(low.props.some((p) => p.kind === "billboardPole")).toBe(false);
    expect(low.stats.lotLost["billboard:eave"]).toBe(1);
    expect(low.stats.lotEaveMin).toBe(6);
  });
});
