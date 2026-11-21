/**
 * Ticket 070 I, criterion 4: the lane bins on the 20 named runs (LB, DK, EL, AV), and hand-worked bins.
 */
import { describe, expect, it } from "vitest";
import type { CityGroundProp } from "../../core";
import { stageRand } from "../pipeline/seeds";
import { groundFailures } from "./groundcheck";
import { buildKeepouts } from "./keepout";
import { cellKey, overlaps } from "./geom";
import { layoutLanes } from "./lanes";
import { propRect } from "./props";
import { buildGround } from "./stage";
import { newStats } from "./stats";
import { NAMED, label, layersOf } from "./testcities";

describe("the lane bins on the 20 named runs (criterion 4)", { timeout: 120_000 }, () => {
  const refused: Record<string, number> = {};
  for (const o of NAMED) {
    it(`${label(o)}: every bin holds LB, DK, EL and AV, none is in a lane mouth or beside a drive, and the city has bins`, () => {
      const l = layersOf(o);
      expect(groundFailures(l.ground, { mass: l.mass, edge: l.edge, facades: l.facades })).toEqual([]);
      const bins = l.ground.props.filter((p) => p.on === "lane");
      expect(bins.length).toBeGreaterThanOrEqual(10);
      const useAt = new Map(l.mass.cells.map((c) => [cellKey(c.i, c.j), c.use] as const));
      const built = new Set(l.mass.built.map((c) => cellKey(c.i, c.j)));
      const keep = buildKeepouts({ mass: l.mass, edge: l.edge, facades: l.facades });
      for (const p of bins) {
        expect(p.kind).toBe("bin");
        expect(p.line).toBe("wall");
        expect(useAt.get(cellKey(p.cell.i, p.cell.j))).toBe("lane");
        // the cell beside (on the side its back is against) is built: never a drive, never open
        const [, axis, at] = p.host.split("|") as [string, "x" | "z", string];
        const plus = axis === "z" ? p.placement.yaw_deg === 270 : p.placement.yaw_deg === 180;
        const beside = axis === "z" ? { i: Number(at) + (plus ? 1 : -1), j: p.cell.j } : { i: p.cell.i, j: Number(at) + (plus ? 1 : -1) };
        expect(built.has(cellKey(beside.i, beside.j))).toBe(true);
        // DK, EL and AV: no strip, no stage 7 piece
        expect(keep.doors.near(propRect(p)).some((d) => overlaps(propRect(p), d))).toBe(false);
        expect(keep.avoid.near(propRect(p)).some((b) => overlaps(propRect(p), b) && p.size.h_m > Math.min(b.base, b.low))).toBe(false);
        // its place on the walk: 12.5, 22.5, ... from the lane's low end
        const b = l.streets.blocks.find((q) => q.id === p.block)!;
        const along = (axis === "z" ? p.placement.z_m - b.j0 * 5 : p.placement.x_m - b.i0 * 5) - 12.5;
        expect(Math.abs(along / 10 - Math.round(along / 10))).toBeLessThan(1e-9);
      }
      const stats = buildGround(l, stageRand("ground", o.seed)).stats;
      expect(stats.lane.placed).toBe(bins.length);
      for (const [k, v] of Object.entries(stats.lane.refused)) refused[k.split(":")[0]!] = (refused[k.split(":")[0]!] ?? 0) + v;
    });
  }

  it("between them the named runs refuse places for each reason: a cell beside that is not built, a door, an escape", () => {
    expect(refused.notBuilt, JSON.stringify(refused)).toBeGreaterThan(0);
    expect(refused.DK, JSON.stringify(refused)).toBeGreaterThan(0);
    expect((refused.EL ?? 0) + (refused.AV ?? 0), JSON.stringify(refused)).toBeGreaterThan(0);
  });
});

// ---- hand-worked: a lane along z in cell column 2 of a block of columns 0 to 4 and rows 0 to 5 (30 m): bins at s = 12.5 m (the + side) and 22.5 m (the - side) ----

interface Opts {
  readonly drive?: boolean;
  readonly mouth?: boolean;
  readonly door?: boolean;
  readonly escape?: boolean;
}

function lane(o: Opts = {}): { props: CityGroundProp[]; refused: Record<string, number> } {
  const cells: unknown[] = [];
  const built: unknown[] = [];
  for (let j = 0; j < 6; j++) {
    cells.push({ i: 2, j, block: "block:0:0", part: null, use: o.mouth && j === 2 ? "laneMouth" : j === 0 || j === 5 ? "laneMouth" : "lane", opening: "lane" });
    for (const i of [1, 3]) {
      if (o.drive && i === 3 && j === 2) {
        cells.push({ i, j, block: "block:0:0", part: null, use: "drive", opening: "drive" });
        continue;
      }
      cells.push({ i, j, block: "block:0:0", part: "p", use: "built", opening: null });
      built.push({ i, j, open: i === 3 && j === 2 && o.door ? [{ side: "-x", faces: "lane", frontage: "quiet" }] : [] });
    }
  }
  const facades = {
    ground: o.door ? [{ kind: "door", building: "b", cells: [{ i: 3, j: 2 }], frontage: "quiet", placement: {}, door_m: 0 }] : [],
    dressing: [],
    walls: o.escape
      ? [
          {
            kind: "escape",
            building: "b",
            cell: { i: 3, j: 2 },
            face: "-x",
            storey: 1,
            span: 1,
            scaleY: 1,
            // a first landing at 3 m over the walk, turned to face -x, its drop ladder's foot 0.1 m over the walk
            placement: { key: "city-pack:SM_Bld_FireEscape_03", x_m: 14, y_m: 3, z_m: 12.5, yaw_deg: 90 },
            boxes: [{ kind: "ladderRail", x_m: 0, y_m: -1.4, z_m: 0, w_m: 0.1, h_m: 3, d_m: 0.1, rz_rad: 0 }],
          },
        ]
      : [],
    novelty: [],
  };
  const keep = buildKeepouts({ mass: { built }, edge: { cells: [], ground: [] }, facades } as never);
  const stats = newStats();
  const props = layoutLanes({ lanes: [{ block: "block:0:0", axis: "z", at: 2 }] }, [{ id: "block:0:0", i0: 0, i1: 5, j0: 0, j1: 6 }], { cells, built } as never, keep, () => 0, stats);
  return { props, refused: stats.lane.refused };
}

describe("hand-worked lane bins (criterion 4)", () => {
  it("a bin against the + side wall at s = 12.5 m (the walk's first place: a building bay's middle), and one against the - side at 22.5 m, each facing into the lane", () => {
    const { props } = lane();
    expect(props).toHaveLength(2);
    const [a, b] = props;
    // Trashbin_01 is 0.647 m square. + side: the wall at x = 15 m, the back 0.4 m off it, so the centre at 15 - 0.4 - 0.3235 = 14.2765, facing -x (yaw 270)
    expect(a!.placement.key).toBe("city-pack:SM_Prop_Trashbin_01");
    expect(a!.placement.x_m).toBeCloseTo(14.2765, 12);
    expect(a!.placement.z_m).toBe(12.5);
    expect(a!.placement.yaw_deg).toBe(270);
    expect(a!.cell).toEqual({ i: 2, j: 2 });
    expect(a!.on).toBe("lane");
    expect(a!.line).toBe("wall");
    expect(a!.host).toBe("block:0:0|z|2");
    // - side: the wall at x = 10 m, so the centre at 10 + 0.4 + 0.3235 = 10.7235, facing +x (yaw 90)
    expect(b!.placement.x_m).toBeCloseTo(10.7235, 12);
    expect(b!.placement.z_m).toBe(22.5);
    expect(b!.placement.yaw_deg).toBe(90);
    // it takes about 1.1 m of the lane's 5 m (the bin is 0.4 m off the wall and 0.647 m deep): 3.9 m stay clear
    expect(15 - (a!.placement.x_m - 0.3235)).toBeCloseTo(1.0470, 3);
  });

  it("a place whose cell beside is a drive is skipped (not built)", () => {
    const { props, refused } = lane({ drive: true });
    expect(props.map((p) => p.placement.z_m)).toEqual([22.5]);
    expect(refused).toEqual({ "notBuilt:drive": 1 });
  });

  it("a place whose pivot is a lane mouth is skipped", () => {
    const { props, refused } = lane({ mouth: true });
    expect(props.map((p) => p.placement.z_m)).toEqual([22.5]);
    expect(refused).toEqual({ mouth: 1 });
  });

  it("a place in front of a residents' door (DK: the strip 1.5 m out from the wall, 5 m along) is skipped", () => {
    const { props, refused } = lane({ door: true });
    expect(props.map((p) => p.placement.z_m)).toEqual([22.5]);
    expect(refused).toEqual({ DK: 1 });
  });

  it("a place under a fire escape (EL: its drop ladder's foot is 0.1 m up, under the bin's 1.178 m) is skipped", () => {
    const { props, refused } = lane({ escape: true });
    expect(props.map((p) => p.placement.z_m)).toEqual([22.5]);
    expect(refused).toEqual({ EL: 1 });
  });
});
