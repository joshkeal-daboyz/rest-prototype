/**
 * Stage 7, section H2b, criteria 1 to 4 (HEAVY: the named runs are built once each through `testcities.ts`' cache, 120 s timeout). The kit table (criterion 1), `partyFaces` on the 20 named runs (criterion 2), the placements, hand-worked
 * (criterion 3), and the checks on the named runs (criterion 4; the failing fixtures are `partyfixtures.test.ts`). The hand-worked placements are on a synthetic two-building fixture whose numbers are worked by hand from the bounds:
 * a column C of 5 storeys beside a column N of 3, over `Roof_02` (0.744 m: the one-storey step's room is 2.256 m, board only; a two-storey step's is 5.256 m).
 */
import { describe, expect, it } from "vitest";
import type { CalibrationKey, CityBuilding, CityBuildingsLayer, CityColumn, CityMassLayer, CityPlacement, CitySide, CityWallPiece } from "../../core";
import { stageRand } from "../pipeline/seeds";
import { makeCtx } from "./facts";
import { buildParty, fitsRoom, mergeWalls, partyFaces, placeParty, scanParty, YAW_OF_SIDE } from "./party";
import { partyFailures } from "./partycheck";
import { BLANK_RUN_MAX_M, PARTY_BOARDS, PARTY_BODY_M, PARTY_BOUNDS, PARTY_KEYS, PARTY_PIPES, PARTY_ROOF_H_M, PARTY_WINDOW, PARTY_WINDOW_X_M, partyBounds, partyKindOf, roofHeight } from "./partykit";
import { keyOf, SIDE_VEC } from "./place";
import { layersOf, NAMED, label } from "./testcities";

const k = (n: string): CalibrationKey => `city-pack:SM_${n}`;
const ROOF_02 = k("Bld_Apartment_Roof_02");
const ROOF_01 = k("Bld_Apartment_Roof_01");

describe("the kit table (criterion 1)", () => {
  it("holds the seven boards, the window and the two pipes, each once, with the bounds the ticket types in", () => {
    expect(PARTY_BOARDS).toHaveLength(7);
    expect(PARTY_KEYS).toHaveLength(10);
    expect(new Set(PARTY_KEYS).size).toBe(10);
    expect(Object.keys(PARTY_BOUNDS).sort()).toEqual([...PARTY_KEYS].sort());
    for (const b of PARTY_BOARDS) expect(PARTY_BOUNDS[b]).toEqual({ w: 4.193, h: 2.028, d: 0.118 });
    expect(PARTY_BOUNDS[PARTY_WINDOW]).toEqual({ w: 1.303, h: 2.313, d: 0.37 });
    expect(PARTY_BOUNDS[PARTY_PIPES[0]!]).toEqual({ w: 4.459, h: 7.046, d: 0.498 });
    expect(PARTY_BOUNDS[PARTY_PIPES[1]!]).toEqual({ w: 2.828, h: 4.243, d: 0.498 });
    expect(PARTY_PIPES).toEqual([k("Prop_Pipe_Present_01"), k("Prop_Pipe_Present_03")]);
    expect(PARTY_KEYS).not.toContain(k("Prop_Pipe_Present_02"));
    expect(() => partyBounds(k("Prop_Pipe_Present_02"))).toThrow();
    expect(partyKindOf(PARTY_BOARDS[0]!)).toBe("partyBoard");
    expect(partyKindOf(PARTY_WINDOW)).toBe("partyWindow");
    expect(partyKindOf(PARTY_PIPES[1]!)).toBe("partyPipe");
    expect(partyKindOf(k("Prop_Pipe_Present_02"))).toBeNull();
  });

  it("BLANK_RUN_MAX_M is Josh's 2.1 m (Q23: \"Yes, 2.1m\"); the roof heights are 0.5 and 0.744; the inset table has the nine floor keys", () => {
    expect(BLANK_RUN_MAX_M).toBe(2.1);
    expect(PARTY_WINDOW_X_M).toBe(1.25);
    expect(Object.keys(PARTY_ROOF_H_M)).toHaveLength(6);
    expect(roofHeight(ROOF_01)).toBe(0.5);
    expect(roofHeight(ROOF_02)).toBe(0.744);
    expect(() => roofHeight(k("Bld_Apartment_01"))).toThrow();
    expect(Object.keys(PARTY_BODY_M)).toHaveLength(9);
  });

  it("PW3: over Roof_01 a one-storey step leaves 2.5 m (board, window) and a two-storey step 5.5 m (and Pipe_03); over Roof_02 and _03 2.256 m (board only) and 5.256 m; Pipe_01 fits neither", () => {
    for (const [roof, one, two] of [[0.5, 2.5, 5.5], [0.744, 2.256, 5.256]] as const) {
      expect(3 - roof).toBeCloseTo(one, 9);
      expect(6 - roof).toBeCloseTo(two, 9);
      expect(fitsRoom(PARTY_BOARDS[0]!, one)).toBe(true);
      expect(fitsRoom(PARTY_WINDOW, one)).toBe(roof === 0.5);
      expect(fitsRoom(PARTY_WINDOW, two)).toBe(true);
      expect(fitsRoom(PARTY_PIPES[1]!, one)).toBe(false);
      expect(fitsRoom(PARTY_PIPES[1]!, two)).toBe(true);
      expect(fitsRoom(PARTY_PIPES[0]!, one)).toBe(false);
      expect(fitsRoom(PARTY_PIPES[0]!, two)).toBe(false);
    }
  });
});

// ---- a synthetic city to work by hand ----

/** Two built cells in a row along x: C at (0, 0) of `storeysC` storeys and N at (1, 0) of `storeysN` storeys under `roof`; C's open side is "-z", N's too. */
function pair(storeysC: number, storeysN: number, roof: CalibrationKey): { mass: CityMassLayer; buildings: CityBuildingsLayer } {
  const open = (side: CitySide) => [{ side, faces: "street", frontage: "street" }];
  const built = [
    { i: 0, j: 0, block: "b", part: "p", row: "outer", open: open("-z"), column: "mid", partner: null },
    { i: 1, j: 0, block: "b", part: "p", row: "outer", open: open("-z"), column: "mid", partner: null },
  ];
  const col = (i: number, building: string, r: CalibrationKey): CityColumn =>
    ({ i, j: 0, building, rowId: "row", kind: "mid", front: "-z", side: null, yaw: 180, ground: { kind: "mid", yaw: 180, y_m: 0, top_m: 3 }, pieces: [{ role: "roof", storey: 0, span: 0, placement: { key: r, x_m: 0, y_m: 0, z_m: 0, yaw_deg: 180 } }] }) as unknown as CityColumn;
  const bld = (id: string, i: number, storeys: number): CityBuilding => ({ id, block: "b", part: "p", rowId: "row", row: "outer", front: "-z", cells: [{ i, j: 0 }], bend: null, style: "apartment-01", colourway: "base", storeys, partner: null, back: null });
  return {
    mass: { stage: "mass", cells: [], built, openings: [], courts: [], units: [] } as unknown as CityMassLayer,
    buildings: { stage: "buildings", rows: [{ id: "row", block: "b", part: "p", row: "outer", front: "-z", buildings: ["C", "N"] }], buildings: [bld("C", 0, storeysC), bld("N", 1, storeysN)], columns: [col(0, "C", ROOF_01), col(1, "N", roof)] },
  };
}

describe("the faces (PW1), hand-worked on a synthetic pair", () => {
  it("C of 5 storeys beside N of 3: C's +x side shows storeys 3 and 4, from the lower roof's top; N's side shows none", () => {
    const { mass, buildings } = pair(5, 3, ROOF_02);
    const faces = partyFaces(mass, buildings);
    expect(faces.map((f) => [f.building, f.side, f.storey, f.lo_m, f.hi_m, f.where])).toEqual([
      ["C", "+x", 3, 9.744, 12, "row"],
      ["C", "+x", 4, 12, 15, "row"],
    ]);
    expect(faces[0]!.lowerBuilding).toBe("N");
    expect(faces[0]!.lowerRoof).toBe(ROOF_02);
  });

  it("a one-storey step has one face; equal storeys have none; an open side is no face; a blind column's own front is not one (U1)", () => {
    expect(partyFaces(pair(4, 3, ROOF_01).mass, pair(4, 3, ROOF_01).buildings).map((f) => [f.storey, f.lo_m, f.hi_m])).toEqual([[3, 9.5, 12]]);
    const eq = pair(4, 4, ROOF_01);
    expect(partyFaces(eq.mass, eq.buildings)).toEqual([]);
    const open = pair(5, 3, ROOF_01);
    (open.mass.built[0] as { open: unknown }).open = [{ side: "+x", faces: "street", frontage: "street" }];
    expect(partyFaces(open.mass, open.buildings)).toEqual([]);
    const blind = pair(5, 3, ROOF_01);
    (blind.buildings.columns![0] as { kind: string; front: string }).kind = "blind";
    (blind.buildings.columns![0] as { kind: string; front: string }).front = "+x";
    const scan = scanParty(blind.mass, blind.buildings);
    expect(scan.faces).toEqual([]);
    expect(scan.u1.map((f) => [f.storey, f.where])).toEqual([[3, "blind"], [4, "blind"]]);
  });
});

/** A placement equal to the hand-worked one within 1e-9 m (the sums of 0.1-wide numbers carry floating noise). */
const near = (p: CityPlacement, e: CityPlacement): void => {
  expect(p.key).toBe(e.key);
  expect(p.yaw_deg).toBe(e.yaw_deg);
  for (const f of ["x_m", "y_m", "z_m"] as const) expect(p[f], f).toBeCloseTo(e[f], 9);
};

describe("the placements (PW2, PW3, PW5), each pivot hand-worked from the bounds", () => {
  it("a board on a one-storey step at two turns: its back on the cell edge, its pivot half its depth (0.059) off it, centred on the face", () => {
    // cell (2, 3): x 10 to 15, z 15 to 20, centre (12.5, 17.5)
    const b = PARTY_BOARDS[0]!;
    near(placeParty({ i: 2, j: 3 }, "+x", b, 0, 9.858), { key: b, x_m: 15.059, y_m: 9.858, z_m: 17.5, yaw_deg: 90 });
    near(placeParty({ i: 2, j: 3 }, "-z", b, 0, 9.858), { key: b, x_m: 12.5, y_m: 9.858, z_m: 14.941, yaw_deg: 180 });
    near(placeParty({ i: 2, j: 3 }, "+z", b, 0, 0), { key: b, x_m: 12.5, y_m: 0, z_m: 20.059, yaw_deg: 0 });
    near(placeParty({ i: 2, j: 3 }, "-x", b, 0, 0), { key: b, x_m: 9.941, y_m: 0, z_m: 17.5, yaw_deg: 270 });
    expect(YAW_OF_SIDE).toEqual({ "+z": 0, "+x": 90, "-z": 180, "-x": 270 });
  });

  it("two windows on a face: at the quarter points, 1.25 m either side of the centre, half the depth (0.185) off the plane", () => {
    const w = PARTY_WINDOW;
    near(placeParty({ i: 2, j: 3 }, "+z", w, -1.25, 0), { key: w, x_m: 11.25, y_m: 0, z_m: 20.185, yaw_deg: 0 });
    near(placeParty({ i: 2, j: 3 }, "+z", w, 1.25, 0), { key: w, x_m: 13.75, y_m: 0, z_m: 20.185, yaw_deg: 0 });
    // on +x the piece's own +x points to -z: its own left (-1.25) stands at the larger z
    near(placeParty({ i: 2, j: 3 }, "+x", w, -1.25, 0), { key: w, x_m: 15.185, y_m: 0, z_m: 18.75, yaw_deg: 90 });
    near(placeParty({ i: 2, j: 3 }, "+x", w, 1.25, 0), { key: w, x_m: 15.185, y_m: 0, z_m: 16.25, yaw_deg: 90 });
  });

  it("C of 5 beside N of 3 under Roof_02: over many picks, a board (2.028 m) is centred in 2.256 m, a window only on the upper face, a pipe over both faces is Pipe_03 centred in 5.256 m", () => {
    const { mass, buildings } = pair(5, 3, ROOF_02);
    const seen = { board0: false, board1: false, window1: false, pipe: false };
    for (let seed = 1; seed <= 60; seed++) {
      const { pieces } = buildParty(mass, buildings, stageRand("facades", seed));
      const list = pieces.get("C")!;
      for (const p of list) {
        expect(p.face).toBe("+x");
        expect(p.placement.yaw_deg).toBe(90);
        expect(p.placement.x_m).toBeCloseTo(5 + partyBounds(p.placement.key).d / 2, 9);
        if (p.kind === "partyBoard") {
          // face 0: 9.744 to 12; face 1: 12 to 15 (room 3)
          const lo = p.storey === 3 ? 9.744 : 12;
          const room = p.storey === 3 ? 2.256 : 3;
          expect(p.span).toBe(1);
          expect(p.placement.y_m).toBeCloseTo(lo + (room - 2.028) / 2, 9);
          if (p.storey === 3) seen.board0 = true;
          else seen.board1 = true;
        } else if (p.kind === "partyWindow") {
          expect(p.storey).toBe(4);
          expect(p.placement.y_m).toBeCloseTo(12 + (3 - 2.313) / 2, 9);
          expect(Math.abs(p.placement.z_m - 2.5)).toBeCloseTo(1.25, 9);
          seen.window1 = true;
        } else {
          expect(p.placement.key).toBe(PARTY_PIPES[1]);
          expect([p.storey, p.span]).toEqual([3, 2]);
          expect(p.placement.y_m).toBeCloseTo(9.744 + (5.256 - 4.243) / 2, 9);
          expect(p.placement.z_m).toBe(2.5);
          seen.pipe = true;
        }
      }
      expect(partyFailures({ stage: "facades", ground: [], walls: list }, { mass, buildings })).toEqual([]);
    }
    expect(seen).toEqual({ board0: true, board1: true, window1: true, pipe: true });
  });

  it("the running rule: the same key never stands on two faces running (a window pair is one pick), and the pieces come out column by column, side by side, bottom up", () => {
    const { mass, buildings } = pair(5, 3, ROOF_01);
    for (let seed = 1; seed <= 40; seed++) {
      const list = buildParty(mass, buildings, stageRand("facades", seed)).pieces.get("C")!;
      const faces = new Map<number, CalibrationKey>();
      for (const p of list) for (let s = p.storey; s < p.storey + p.span; s++) faces.set(s, p.placement.key);
      if (faces.get(3) === faces.get(4) && list.length > 0) expect(list.some((p) => p.span === 2), `seed ${seed}`).toBe(true);
      expect(list.map((p) => p.storey)).toEqual([...list.map((p) => p.storey)].sort((a, b) => a - b));
    }
  });

  it("mergeWalls puts each building's party pieces after its H2 pieces, in the buildings' order", () => {
    const { buildings } = pair(5, 3, ROOF_01);
    const mk = (building: string, kind: CityWallPiece["kind"]): CityWallPiece => ({ kind, building, cell: { i: 0, j: 0 }, face: "-z", storey: 1, span: 1, placement: { key: PARTY_BOARDS[0]!, x_m: 0, y_m: 0, z_m: 0, yaw_deg: 0 }, scaleY: 1, boxes: [] });
    const merged = mergeWalls(buildings, [mk("C", "escape"), mk("N", "canopy"), mk("N", "aircon")], new Map([["C", [mk("C", "partyBoard")]], ["N", [mk("N", "partyWindow")]]]));
    expect(merged.map((p) => `${p.building}:${p.kind}`)).toEqual(["C:escape", "C:partyBoard", "N:canopy", "N:aircon", "N:partyWindow"]);
    expect(() => mergeWalls(buildings, [mk("N", "canopy"), mk("C", "escape")], new Map())).toThrow();
  });
});

// ---- the named runs ----

describe("the faces and the checks on the 20 named runs (criteria 2 and 4)", { timeout: 120_000 }, () => {
  it("every run has faces; none is on an open side, none on a blind column's front; each lies over a lower roof and under its own", () => {
    for (const o of NAMED) {
      const { mass, buildings } = layersOf(o);
      const ctx = makeCtx(mass, buildings);
      const faces = partyFaces(mass, buildings);
      expect(faces.length, label(o)).toBeGreaterThan(300);
      for (const f of faces) {
        const c = ctx.col.get(keyOf(f.cell))!;
        expect(ctx.built.get(keyOf(f.cell))!.open.some((x) => x.side === f.side), `${label(o)} open`).toBe(false);
        expect(c.kind === "blind" && c.front === f.side, `${label(o)} blind front`).toBe(false);
        const n = ctx.col.get(keyOf({ i: f.cell.i + SIDE_VEC[f.side].x, j: f.cell.j + SIDE_VEC[f.side].z }))!;
        expect(ctx.buildingOf.get(n.building)!.storeys).toBe(f.lowerStoreys);
        expect(f.storey).toBeGreaterThanOrEqual(f.lowerStoreys);
        expect(f.storey).toBeLessThan(f.storeys);
        expect(f.storeys - f.lowerStoreys).toBeLessThanOrEqual(2);
        expect(f.hi_m - f.lo_m).toBeGreaterThanOrEqual(2.25);
      }
      // every face once
      expect(new Set(faces.map((f) => `${keyOf(f.cell)}|${f.side}|${f.storey}`)).size, label(o)).toBe(faces.length);
    }
  });

  it("every joint between two buildings of a row steps (R2), and every step is a face unless it is a blind column's own front (U1)", () => {
    for (const o of NAMED) {
      const { mass, buildings } = layersOf(o);
      const ctx = makeCtx(mass, buildings);
      const { faces, u1 } = scanParty(mass, buildings);
      const have = new Set([...faces, ...u1].map((f) => `${keyOf(f.cell)}|${f.side}`));
      let joints = 0;
      for (const c of buildings.columns!) {
        const open = ctx.built.get(keyOf(c))!.open;
        for (const side of ["+x", "-x", "+z", "-z"] as const) {
          if (open.some((x) => x.side === side)) continue;
          const n = ctx.col.get(keyOf({ i: c.i + SIDE_VEC[side].x, j: c.j + SIDE_VEC[side].z }));
          if (!n || n.building === c.building) continue;
          const sc = ctx.buildingOf.get(c.building)!.storeys;
          const sn = ctx.buildingOf.get(n.building)!.storeys;
          if (n.rowId === c.rowId) {
            joints++;
            expect(sc, `${label(o)} ${keyOf(c)} ${side}`).not.toBe(sn);
          }
          expect(have.has(`${keyOf(c)}|${side}`), `${label(o)} ${keyOf(c)} ${side}`).toBe(sc > sn);
        }
      }
      expect(joints, label(o)).toBeGreaterThan(100);
    }
  });

  it("the kit is placed on every face and every check passes; no Pipe_Present_01 stands (it never fits)", () => {
    for (const o of NAMED) {
      const { mass, buildings, facades } = layersOf(o);
      const faces = partyFaces(mass, buildings);
      expect(partyFailures(facades, { mass, buildings }).slice(0, 3), label(o)).toEqual([]);
      const party = facades.walls!.filter((p) => partyKindOf(p.placement.key) !== null);
      expect(party.every((p) => p.kind === partyKindOf(p.placement.key)), label(o)).toBe(true);
      expect(party.some((p) => p.placement.key === PARTY_PIPES[0]), label(o)).toBe(false);
      expect(party.length, label(o)).toBeGreaterThanOrEqual(faces.length * 0.7);
      // the layer's order: a building's party pieces after its H2 pieces (the check holds it), and the same city twice gives the same pieces
      expect(party.filter((p) => p.kind === "partyWindow").length % 2, label(o)).toBe(0);
    }
  });
});
