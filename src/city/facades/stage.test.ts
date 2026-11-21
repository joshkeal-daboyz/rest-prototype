/**
 * Stage 7, section H1 (ticket 070), on the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on): kinds and keys (criterion 2), placements (3), the checks (4), the picture (5) and R-1 to R-7 (6).
 * HEAVY: each city is built once (stages 1 to 7), through a module-level cache. R-2: the stage returns ok on all 20 named runs; nothing is loosened and no city is pinned as an exception.
 * The expectations are derived here from the mass layer and the kit's numbers, independently of the stage's own helpers.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CityBuiltCell, CityCell, CityFacadesLayer, CityGroundPiece, CityPlanRun } from "../../core";
import { digestOf } from "../pipeline/digest";
import { pictureProblems } from "../pipeline/picture";
import type { CityStageDef } from "../pipeline/types";
import { BUILT_STAGES, runCity } from "../stages";
import { groundFailures, groundReport } from "./check";
import { FRONTAGE_TOL_M, GROUND_GAP_MAX_M, OVERLAP_MAX_M, SILL_MAX_M, SILL_UNDER_M, WALL_JOINT_TOL_M } from "./constants";
import { DEEP_KEYS, groundEntry } from "./kit";
import { bodyBoxOf, cellsBox, keyOf, planeOf } from "./place";
import { facadesStage, FACADES_LEGEND, legendOf } from "./stage";
import { type City, cityOf, DEFAULT, label, layersOf, NAMED, stagesOf } from "./testcities";

const SIDE_VEC = { "+x": [1, 0], "-x": [-1, 0], "+z": [0, 1], "-z": [0, -1] } as const;
const OPP = { "+x": "-x", "-x": "+x", "+z": "-z", "-z": "+z" } as const;
const NEVER = ["Shop_05", "Apartment_Door_02", "Apartment_Door_Corner_02", "Shop_Corner_02"].map((n) => `city-pack:SM_Bld_${n}`);

describe("stage 7 on the named runs (R-2)", { timeout: 120_000 }, () => {
  it("the stage returns ok on all 20 named runs, and every H1 check holds", () => {
    const bad: string[] = [];
    for (const o of NAMED) {
      const r = cityOf(o);
      if (!r.ok) {
        bad.push(`${label(o)}: ${r.failure.stage}: ${r.failure.reason}`);
        continue;
      }
      const l = r.plan.layers;
      const f = groundFailures(l.facades!, { mass: l.mass!, buildings: l.buildings! });
      if (f.length > 0) bad.push(`${label(o)}: ${f[0]!.check}: ${f[0]!.reason}`);
    }
    expect(bad).toEqual([]);
  });
});

/** The independent view of one city: the mass's built cells and uses, the pieces by cell. */
function viewOf(o: City): {
  built: Map<string, CityBuiltCell>;
  use: Map<string, string>;
  pieceAt: Map<string, CityGroundPiece>;
  layer: CityFacadesLayer;
  buildings: ReturnType<typeof layersOf>["buildings"];
  mass: ReturnType<typeof layersOf>["mass"];
} {
  const { mass, buildings, facades } = layersOf(o);
  const pieceAt = new Map<string, CityGroundPiece>();
  for (const p of facades.ground) for (const c of p.cells) pieceAt.set(keyOf(c), p);
  return { built: new Map(mass.built.map((b) => [keyOf(b), b] as const)), use: new Map(mass.cells.map((c) => [keyOf(c), c.use] as const)), pieceAt, layer: facades, buildings, mass };
}
const stallsAcross = (v: ReturnType<typeof viewOf>, c: CityCell): boolean => v.built.get(keyOf(c))!.open.some((o) => v.use.get(`${c.i + SIDE_VEC[o.side][0]},${c.j + SIDE_VEC[o.side][1]}`) === "stalls");
const streetSide = (v: ReturnType<typeof viewOf>, c: CityCell): boolean => v.built.get(keyOf(c))!.open.some((o) => o.frontage === "street");

describe("kinds, doors and keys (criterion 2)", { timeout: 120_000 }, () => {
  it("every column's slot is filled by exactly one piece, and the pieces are in columns order of their first cell", () => {
    for (const o of NAMED) {
      const { layer, buildings, pieceAt } = viewOf(o);
      const counts = new Map<string, number>();
      for (const p of layer.ground) for (const c of p.cells) counts.set(keyOf(c), (counts.get(keyOf(c)) ?? 0) + 1);
      expect(counts.size, label(o)).toBe(buildings.columns!.length);
      for (const [k, n] of counts) expect(n, `${label(o)} ${k}`).toBe(1);
      expect(pieceAt.size, label(o)).toBe(buildings.columns!.length);
      const at = new Map(buildings.columns!.map((c, n) => [keyOf(c), n] as const));
      const firsts = layer.ground.map((p) => at.get(keyOf(p.cells[0]!))!);
      expect(firsts, label(o)).toEqual([...firsts].sort((a, b) => a - b));
    }
  });

  it("the kind follows the column: blind floor; a corner with a street open side shopCorner; a quiet corner doorCorner or floorCorner; a street mid shop, shopDouble or door; a quiet mid door or floor", () => {
    const wrong: string[] = [];
    for (const o of NAMED) {
      const v = viewOf(o);
      for (const col of v.buildings.columns!) {
        const p = v.pieceAt.get(keyOf(col))!;
        const b = v.built.get(keyOf(col))!;
        const okKinds = col.kind === "blind" ? ["floor"] : col.kind === "corner" ? (streetSide(v, col) ? ["shopCorner"] : ["doorCorner", "floorCorner"]) : b.open[0]!.frontage === "street" ? ["shop", "shopDouble", "door"] : ["door", "floor"];
        if (!okKinds.includes(p.kind)) wrong.push(`${label(o)} (${col.i}, ${col.j}) ${col.kind}: ${p.kind}`);
        const frontage = col.kind === "blind" ? null : col.kind === "mid" ? b.open[0]!.frontage : streetSide(v, col) ? "street" : "quiet";
        if (p.frontage !== frontage) wrong.push(`${label(o)} (${col.i}, ${col.j}) frontage ${String(p.frontage)} not ${String(frontage)}`);
      }
    }
    expect(wrong.slice(0, 5)).toEqual([]);
  });

  it("a shopDouble fills two consecutive mid columns of one building along its row, on a street front, with one turn", () => {
    let seen = 0;
    for (const o of NAMED) {
      const v = viewOf(o);
      for (const p of v.layer.ground.filter((q) => q.kind === "shopDouble")) {
        seen++;
        expect(p.cells, label(o)).toHaveLength(2);
        const b = v.buildings.buildings.find((x) => x.id === p.building)!;
        const n = b.cells.findIndex((c) => keyOf(c) === keyOf(p.cells[0]!));
        expect(keyOf(b.cells[n + 1]!), label(o)).toBe(keyOf(p.cells[1]!));
        const cols = p.cells.map((c) => v.buildings.columns!.find((x) => keyOf(x) === keyOf(c))!);
        expect(cols.map((c) => c.kind)).toEqual(["mid", "mid"]);
        expect(cols[0]!.yaw).toBe(cols[1]!.yaw);
        expect(p.frontage).toBe("street");
        expect(p.placement.key).toBe("city-pack:SM_Bld_Shop_03");
      }
    }
    expect(seen).toBeGreaterThan(500);
  });

  it("no shop on a column whose open sides are all quiet; a street building has at most one door and exactly one when it has a mid column; a quiet building has one door, or none when it has no door place", () => {
    const wrong: string[] = [];
    let doorless = 0;
    for (const o of NAMED) {
      const v = viewOf(o);
      for (const p of v.layer.ground) {
        if (["shop", "shopDouble", "shopCorner"].includes(p.kind) && p.cells.some((c) => v.built.get(keyOf(c))!.open.every((s) => s.frontage === "quiet"))) wrong.push(`${label(o)} shop on a quiet front ${keyOf(p.cells[0]!)}`);
        if ((p.kind === "door" || p.kind === "doorCorner") && p.cells.some((c) => stallsAcross(v, c))) wrong.push(`${label(o)} door behind stalls ${keyOf(p.cells[0]!)}`);
      }
      for (const b of v.buildings.buildings) {
        const cols = b.cells.map((c) => v.buildings.columns!.find((x) => keyOf(x) === keyOf(c))!);
        const doors = new Set(cols.map((c) => v.pieceAt.get(keyOf(c))!).filter((p) => p.kind === "door" || p.kind === "doorCorner"));
        const mids = cols.filter((c) => c.kind === "mid");
        const front = v.buildings.rows.find((r) => r.id === cols.find((c) => c.kind !== "blind")!.rowId)!.front;
        const street = v.built.get(keyOf(cols.find((c) => c.kind !== "blind")!))!.open.find((s) => s.side === front)!.frontage === "street";
        if (street) {
          if (doors.size !== (mids.length > 0 ? 1 : 0)) wrong.push(`${label(o)} street building ${b.id}: ${doors.size} doors, ${mids.length} mids`);
        } else {
          const places = cols.filter((c) => (c.kind === "mid" || (c.kind === "corner" && !streetSide(v, c))) && !stallsAcross(v, c)).length;
          if (doors.size !== (places > 0 ? 1 : 0)) wrong.push(`${label(o)} quiet building ${b.id}: ${doors.size} doors, ${places} door places`);
          if (places === 0) {
            doorless++;
            if (!b.cells.every((c) => v.built.get(keyOf(c))!.row === "inner")) wrong.push(`${label(o)} doorless building ${b.id} is not on ring 2`);
          }
        }
      }
    }
    expect(wrong.slice(0, 5)).toEqual([]);
    // the no-door case is exercised on the named runs, not only allowed (the pre-check found 58)
    expect(doorless).toBeGreaterThanOrEqual(1);
  });

  it("a quiet building's door is the corner door on its first quiet corner with no stalls when it has one (D1), else a residents' door on a mid column with no stalls; its other quiet corners are corner floors", () => {
    let cornerDoors = 0;
    let midDoors = 0;
    for (const o of NAMED) {
      const v = viewOf(o);
      for (const b of v.buildings.buildings) {
        const cols = b.cells.map((c) => v.buildings.columns!.find((x) => keyOf(x) === keyOf(c))!);
        const first = cols.find((c) => c.kind !== "blind")!;
        const front = v.buildings.rows.find((r) => r.id === first.rowId)!.front;
        if (v.built.get(keyOf(first))!.open.find((s) => s.side === front)!.frontage === "street") continue;
        const quietCorners = cols.filter((c) => c.kind === "corner" && !streetSide(v, c));
        const okCorners = quietCorners.filter((c) => !stallsAcross(v, c));
        if (okCorners.length > 0) {
          cornerDoors++;
          expect(v.pieceAt.get(keyOf(okCorners[0]!))!.kind, `${label(o)} ${b.id}`).toBe("doorCorner");
          for (const c of quietCorners.slice(1)) expect(v.pieceAt.get(keyOf(c))!.kind).toBe("floorCorner");
          for (const c of cols.filter((x) => x.kind === "mid")) expect(v.pieceAt.get(keyOf(c))!.kind).toBe("floor");
        } else {
          for (const c of quietCorners) expect(v.pieceAt.get(keyOf(c))!.kind).toBe("floorCorner");
          if (cols.some((c) => c.kind === "mid" && !stallsAcross(v, c))) midDoors++;
        }
      }
    }
    expect(cornerDoors).toBeGreaterThan(1000);
    expect(midDoors).toBeGreaterThan(1000);
  });

  it("each key is of its kind's list and the building's own style for a floor; the four keys with an empty window are never placed", () => {
    const wrong: string[] = [];
    const lists: Record<string, readonly string[]> = {
      shop: ["Shop_01", "Shop_02", "Shop_04", "Shop_05", "Shop_06"],
      shopDouble: ["Shop_03"],
      shopCorner: ["Shop_Corner_01", "Shop_Corner_02"],
      door: ["Apartment_Door_01", "Apartment_Door_02"],
      doorCorner: ["Apartment_Door_Corner_01", "Apartment_Door_Corner_02"],
    };
    for (const o of NAMED) {
      const v = viewOf(o);
      for (const p of v.layer.ground) {
        const style = v.buildings.buildings.find((b) => b.id === p.building)!.style.slice(-2);
        const name = p.placement.key.slice("city-pack:SM_Bld_".length);
        const want = p.kind === "floor" ? [`Apartment_${style}`] : p.kind === "floorCorner" ? [`Apartment_Corner_${style}`] : lists[p.kind]!;
        if (!want.includes(name)) wrong.push(`${label(o)} ${p.kind} ${name}`);
        if (NEVER.includes(p.placement.key)) wrong.push(`${label(o)} placed ${name}`);
      }
    }
    expect(wrong.slice(0, 5)).toEqual([]);
  });
});

describe("placements (criterion 3)", { timeout: 120_000 }, () => {
  it("every body is front-aligned: its front and side planes on its cells' edges, its back plane on the back edge (a deep key's up to 0.6 m past it, into a built partner), its turn the column's", () => {
    const wrong: string[] = [];
    let deep = 0;
    for (const o of NAMED) {
      const v = viewOf(o);
      for (const p of v.layer.ground) {
        const cols = p.cells.map((c) => v.buildings.columns!.find((x) => keyOf(x) === keyOf(c))!);
        const front = cols[0]!.front;
        const box = cellsBox(p.cells);
        const body = bodyBoxOf(p.placement);
        if (p.placement.yaw_deg !== cols[0]!.yaw) wrong.push(`${label(o)} turn`);
        const across = front === "+z" || front === "-z" ? (["-x", "+x"] as const) : (["-z", "+z"] as const);
        for (const s of [front, ...across]) if (Math.abs(planeOf(body, s) - planeOf(box, s)) > FRONTAGE_TOL_M / 2) wrong.push(`${label(o)} ${s} plane ${keyOf(p.cells[0]!)}`);
        const back = OPP[front];
        const over = (planeOf(body, back) - planeOf(box, back)) * (back === "+x" || back === "+z" ? 1 : -1);
        if (DEEP_KEYS.includes(p.placement.key)) {
          deep++;
          if (over < -WALL_JOINT_TOL_M || over > OVERLAP_MAX_M || cols.some((c) => v.built.get(keyOf(c))!.partner === null)) wrong.push(`${label(o)} deep back ${over}`);
        } else if (Math.abs(over) > WALL_JOINT_TOL_M) wrong.push(`${label(o)} back plane off by ${over}`);
      }
    }
    expect(wrong.slice(0, 5)).toEqual([]);
    expect(deep).toBeGreaterThan(10000);
  });

  it("each level is S1's: the door from -0.05 to 0.15 over the walk, the top at most 0.01 short of the first floor, door_m the level plus the key's sill (null with no door)", () => {
    const wrong: string[] = [];
    for (const o of NAMED) {
      const v = viewOf(o);
      for (const p of v.layer.ground) {
        const e = groundEntry(p.placement.key);
        const y = p.placement.y_m;
        if (e.sill === null ? p.door_m !== null : Math.abs(p.door_m! - (y + e.sill)) > 1e-6) wrong.push(`${label(o)} door_m ${String(p.door_m)}`);
        if (p.door_m !== null && (p.door_m < -SILL_UNDER_M - 1e-9 || p.door_m > SILL_MAX_M + 1e-9)) wrong.push(`${label(o)} door ${p.door_m}`);
        if (y + e.h < 3 - GROUND_GAP_MAX_M - 1e-9) wrong.push(`${label(o)} top ${y + e.h}`);
        if (e.sill === null && y !== 0) wrong.push(`${label(o)} a no-door key at ${y}`);
      }
    }
    expect(wrong.slice(0, 5)).toEqual([]);
  });

  it("the ground pieces stand where the kit says: every Shop_Corner_01 at y -0.010 with its door at 0.149, every Door_01 at -0.010 (door 0.019)", () => {
    let corners = 0;
    for (const o of NAMED) {
      for (const p of viewOf(o).layer.ground) {
        if (p.placement.key === "city-pack:SM_Bld_Shop_Corner_01") {
          corners++;
          expect(p.placement.y_m).toBeCloseTo(-0.01, 9);
          expect(p.door_m).toBeCloseTo(0.149, 9);
        }
        if (p.placement.key === "city-pack:SM_Bld_Apartment_Door_01") expect(p.door_m).toBeCloseTo(0.019, 9);
      }
    }
    expect(corners).toBeGreaterThan(5000);
  });
});

describe("the checks hold on the named runs (criterion 4)", { timeout: 120_000 }, () => {
  it("M1, G1, M6, R9, M8, R3, S1 and the stall rule have no failure on any named run, and the worst numbers are inside their limits", () => {
    let backOver = 0;
    for (const o of NAMED) {
      const { mass, buildings, facades } = layersOf(o);
      const rep = groundReport(facades, { mass, buildings });
      expect(rep.failures.slice(0, 3), label(o)).toEqual([]);
      expect(rep.worst.m1, label(o)).toBeLessThanOrEqual(WALL_JOINT_TOL_M);
      expect(rep.worst.g1Recess, label(o)).toBeLessThanOrEqual(FRONTAGE_TOL_M);
      expect(rep.worst.g1Over, label(o)).toBeLessThanOrEqual(OVERLAP_MAX_M + FRONTAGE_TOL_M);
      backOver = Math.max(backOver, rep.worst.backOver);
    }
    // D5: expected at most 0.390 (Shop_03)
    expect(backOver).toBeLessThanOrEqual(0.39 + 1e-9);
  });
});

describe("the picture (criterion 5, R-5)", { timeout: 120_000 }, () => {
  it("has one legend entry per ground kind and 0 elsewhere, and (H1b) four entries for the dressing's points; its size is the lattice's; each built cell's entry is its piece's kind; each point is a piece's, with its own legend", () => {
    expect(FACADES_LEGEND).toHaveLength(15);
    expect(FACADES_LEGEND.map((e) => e.name)).toEqual(["no ground piece", "shop", "double shop", "shop corner", "residents' door", "corner door", "floor", "corner floor", "awning", "fascia sign", "blade sign", "ATM", "fire escape", "door canopy", "wall prop"]);
    for (const o of [DEFAULT, { ...DEFAULT, seed: 2 }]) {
      const r = cityOf(o);
      if (!r.ok) throw new Error(label(o));
      const pic = facadesStage.picture(r.plan);
      const s = r.plan.layers.streets!;
      expect(pictureProblems(pic, s.w, s.h)).toEqual([]);
      expect(pic.stage).toBe("facades");
      const v = viewOf(o);
      // one point per awning, fascia sign, blade sign and ATM, at the piece's x_m, z_m, in the dressing's order; glass has none (H1b's points are unchanged); then (H2) one per escape at its first piece, one per canopy and one per wall prop, in the walls' order
      const marked = v.layer.dressing!.filter((p) => p.kind !== "glass");
      const wallMarked = v.layer.walls!.filter((p) => p.kind !== "escape" || p.storey === 1);
      expect(pic.points).toHaveLength(marked.length + wallMarked.length);
      expect(wallMarked.filter((p) => p.kind === "escape").length).toBeGreaterThan(100);
      expect(marked.length).toBeGreaterThan(1000);
      const legendOfKind = { awning: "awning", fasciaSign: "fascia sign", bladeSign: "blade sign", atm: "ATM" } as const;
      marked.forEach((p, n) => {
        const pt = pic.points[n]!;
        expect(pt.x_m).toBe(p.placement.x_m);
        expect(pt.z_m).toBe(p.placement.z_m);
        expect(pic.legend[pt.legend]!.name).toBe(legendOfKind[p.kind as keyof typeof legendOfKind]);
      });
      const legendOfWall = { escape: "fire escape", canopy: "door canopy", aircon: "wall prop", planter: "wall prop" } as const;
      wallMarked.forEach((p, n) => {
        const pt = pic.points[marked.length + n]!;
        expect(pt.x_m).toBe(p.placement.x_m);
        expect(pt.z_m).toBe(p.placement.z_m);
        expect(pic.legend[pt.legend]!.name).toBe(legendOfWall[p.kind as keyof typeof legendOfWall]);
      });
      let nonzero = 0;
      for (let j = 0; j < s.h; j++) {
        for (let i = 0; i < s.w; i++) {
          const p = v.pieceAt.get(`${i},${j}`);
          expect(pic.cells[j * s.w + i], `(${i}, ${j})`).toBe(p ? legendOf(p.kind) : 0);
          if (p) nonzero++;
        }
      }
      expect(nonzero).toBe(r.plan.layers.mass!.built.length);
    }
  });
});

describe("R-1 to R-7 for facades (criterion 6)", { timeout: 120_000 }, () => {
  it("the standard run is ok on the default city, ends with facades, its layer is frozen, and the stage list ends with it", () => {
    expect(BUILT_STAGES.map((s) => s.name)).toEqual(["streets", "land", "mass", "edge", "buildings", "facades"]);
    const r = cityOf(DEFAULT);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.plan.digests)).toEqual(["streets", "land", "mass", "edge", "buildings", "facades"]);
    expect(Object.isFrozen(r.plan.layers.facades)).toBe(true);
    expect(Object.isFrozen(r.plan.layers.facades!.ground)).toBe(true);
    expect(Object.isFrozen(r.plan.layers.facades!.ground[0])).toBe(true);
    expect(Object.isFrozen(r.plan.layers.facades!.ground[0]!.placement)).toBe(true);
    expect(Object.isFrozen(r.plan.layers.facades!.dressing)).toBe(true);
    expect(Object.isFrozen(r.plan.layers.facades!.dressing![0]!.placement)).toBe(true);
    expect(Object.isFrozen(r.plan.layers.facades!.walls)).toBe(true);
    expect(Object.isFrozen(r.plan.layers.facades!.walls![0]!.placement)).toBe(true);
  });

  it("stage 6 (circuit) is still not built: asking for it throws, as run.test.ts's example says", () => {
    expect(() => runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, "circuit")).toThrow();
  });

  it("a test double for facades leaves the digests of streets, land, mass, edge and buildings equal to the standard run's (R-4)", () => {
    const r = cityOf(DEFAULT);
    if (!r.ok) throw new Error("default city failed");
    const double: CityStageDef = { name: "facades", run: () => ({ stage: "facades", ground: [] }), picture: facadesStage.picture };
    const d = runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, undefined, stagesOf("on", double));
    expect(d.ok).toBe(true);
    for (const s of ["streets", "land", "mass", "edge", "buildings"] as const) expect(d.plan.digests[s], s).toBe(r.plan.digests[s]);
    expect(d.plan.digests.facades).not.toBe(r.plan.digests.facades);
  });

  it("an earlier layer is not edited by the stage: a stage that writes into buildings fails the run naming itself", () => {
    const writer: CityStageDef = {
      name: "facades",
      run: (plan) => {
        (plan.layers.buildings as unknown as { buildings: unknown[] }).buildings.length = 0;
        return { stage: "facades", ground: [] };
      },
      picture: facadesStage.picture,
    };
    const r: CityPlanRun = runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, undefined, stagesOf("on", writer));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.failure.stage).toBe("facades");
  });

  it("the digest pins (R-4): 6 x 6 seeds 1 (the default), 2, 3 and 8, one-way on; the layers before it are as their stages pin them", () => {
    const PINS: readonly (readonly [number, string])[] = [
      // H2 re-pin: `walls` is new and EP changes `dressing` on escape buildings (H1b's pins were 7a95c899, 2281779d, f965837b, 9a3c4f10)
      [1, "ce662196"],
      [2, "e5d43765"],
      [3, "9f4fa9c4"],
      [8, "d0d30400"],
    ];
    const BUILDINGS_PINS: readonly (readonly [number, string])[] = [
      [1, "8a702264"],
      [2, "8511fb2f"],
      [3, "9af6a96f"],
      [8, "6564b680"],
    ];
    for (const [seed, pin] of PINS) {
      const r = cityOf({ blocksX: 6, blocksZ: 6, seed, way: "on" });
      expect(r.ok && r.plan.digests.facades, `seed ${seed}`).toBe(pin);
    }
    for (const [seed, pin] of BUILDINGS_PINS) {
      const r = cityOf({ blocksX: 6, blocksZ: 6, seed, way: "on" });
      expect(r.ok && r.plan.digests.buildings, `seed ${seed} buildings`).toBe(pin);
      const before = runCity({ blocksX: 6, blocksZ: 6, seed }, "buildings");
      for (const s of ["streets", "land", "mass", "edge", "buildings"] as const) expect(r.ok && before.ok && r.plan.digests[s] === before.plan.digests[s], `${s} ${seed}`).toBe(true);
    }
  });

  it("the same city twice gives the same digest, and another seed another (R-3)", () => {
    const a = cityOf(DEFAULT);
    const b = runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, undefined, stagesOf("on"));
    expect(a.ok && b.ok && a.plan.digests.facades === b.plan.digests.facades).toBe(true);
    const c = cityOf({ ...DEFAULT, seed: 2 });
    expect(a.ok && c.ok && a.plan.digests.facades !== c.plan.digests.facades).toBe(true);
    if (a.ok) expect(digestOf(a.plan.layers.facades!)).toBe(a.plan.digests.facades);
  });

  it("R-7: 6 x 6 seed 1, the default named city, ends ok", () => {
    expect(cityOf(DEFAULT).ok).toBe(true);
  });

  const FILES = ["check.ts", "constants.ts", "facts.ts", "hash.ts", "index.ts", "kit.ts", "place.ts", "stage.ts", "dress.ts", "dresscheck.ts", "dresskit.ts", "wallkit.ts", "escape.ts", "walls.ts", "wallcheck.ts"];
  const codeOf = (f: string): string =>
    readFileSync(fileURLToPath(new URL(`./${f}`, import.meta.url)), "utf8")
      .split("\n")
      .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*"))
      .join("\n");

  it("R-6: every file imports only src/core and src/city (the pipeline's helpers and its own files), and none reads a clock, the DOM or Math.random", () => {
    for (const f of FILES) {
      for (const m of codeOf(f).matchAll(/from\s+"([^"]+)"/g)) {
        const path = m[1]!;
        expect(path.startsWith("./") || path === "../../core" || path.startsWith("../pipeline/"), `${f} imports ${path}`).toBe(true);
      }
      expect(codeOf(f), f).not.toMatch(/Math\.random|Date\.now|performance\.now|\bdocument\b|\bwindow\b|\bfetch\b|readFileSync/);
    }
  });

  it("the stage reads only mass, buildings, and the streets' w and h (for the picture); no file reads a block's rank, a street's line or the edge layer", () => {
    for (const f of FILES) {
      const code = codeOf(f);
      expect(code, f).not.toMatch(/\.(bi|bj|line)\b/);
      expect(code, f).not.toMatch(/layers\.(edge|land|circuit|ground)|\.kerb\b|\.bays\b/);
      for (const m of code.matchAll(/layers\.streets|streets\.(\w+)/g)) if (m[1] !== undefined) expect(["w", "h"], `${f}: ${m[0]}`).toContain(m[1]);
    }
  });
});
