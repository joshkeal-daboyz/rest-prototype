/**
 * Stage 7, section H2 (ticket 070), on the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on): the escapes (criterion 2), their meeting with H1b's dressing (3), the canopies and wall props (4), the placements by
 * hand (5) and the checks holding (6). HEAVY: each city is built once (stages 1 to 7), through `testcities.ts`' module-level cache. R-2: nothing is loosened and no city is pinned as an exception.
 * The expectations are derived here from the mass and buildings layers and the tables' numbers, independently of the stage's own deciding functions where that can be done.
 */
import { describe, expect, it } from "vitest";
import type { CalibrationKey, CityBuilding, CityCell, CityColumn, CityGroundPiece, CitySide, CityWallPiece, CityYaw } from "../../core";
import { stageRand } from "../pipeline/seeds";
import { runCity } from "../stages";
import { buildDressing, runsOf, bayFrame } from "./dress";
import { DRESS_PER_BAY_MAX } from "./dresskit";
import { escapeBlocks, escapeCheck, escapeWeight, placeEscape, type EscapeSite } from "./escape";
import { facesStalls, makeCtx } from "./facts";
import { finalise, indexOf } from "./hash";
import { placeGround, keyOf, centreOf } from "./place";
import { buildGround } from "./stage";
import { cityOf, DEFAULT, label, layersOf, stagesOf } from "./testcities";
import { FULL_CITIES, NAMED } from "../testing/namedcities";
import { PARTY_WALL_KINDS } from "./partykit";
import { wallFailures } from "./wallcheck";
import {
  CODE_ESCAPE_KEY,
  DOOR_CANOPIES,
  DOOR_CANOPY_Y_M,
  ESCAPES,
  ESCAPE_DECK_TOL_M,
  ESCAPE_FIRST,
  ESCAPE_GROUND_TOL_M,
  ESCAPE_JOINT_TOL_M,
  ESCAPE_MID,
  ESCAPE_MIN_BAYS,
  ESCAPE_TOP,
  PLANTER_LIFT_M,
  TILE_CITY_R7_MIN,
  WALL_ACS,
  WALL_AC_LIFT_M,
  WALL_MIN_LEVEL,
  WALL_PLANTERS,
  WALL_PROPS_PER_BLOCK,
} from "./wallkit";
import { placeCanopy, placeProp } from "./walls";

const key = (n: string): CalibrationKey => `city-pack:SM_${n}`;

/** The independent view of one city. */
function viewOf(o: (typeof NAMED)[number]): {
  layers: ReturnType<typeof layersOf>;
  walls: readonly CityWallPiece[];
  byBuilding: Map<string, CityWallPiece[]>;
  colAt: Map<string, CityColumn>;
  groundAt: Map<string, CityGroundPiece>;
  buildingOf: Map<string, CityBuilding>;
} {
  const layers = layersOf(o);
  const byBuilding = new Map<string, CityWallPiece[]>();
  for (const p of layers.facades.walls!) (byBuilding.get(p.building) ?? byBuilding.set(p.building, []).get(p.building)!).push(p);
  const groundAt = new Map<string, CityGroundPiece>();
  for (const g of layers.facades.ground) for (const c of g.cells) groundAt.set(keyOf(c), g);
  return {
    layers,
    walls: layers.facades.walls!,
    byBuilding,
    colAt: new Map(layers.buildings.columns!.map((c) => [keyOf(c), c] as const)),
    groundAt,
    buildingOf: new Map(layers.buildings.buildings.map((b) => [b.id, b] as const)),
  };
}

describe("the escapes on the named runs (criterion 2)", { timeout: 120_000 }, () => {
  it("every escape stands on a host column (a mid column, its ground piece not a door, no open side onto stalls) of a building of at least 3 cells and 3 storeys; one escape at most per building; one piece per storey over the ground in ESCAPES' roles, its face its column's front", () => {
    let escapes = 0;
    for (const o of NAMED) {
      const v = viewOf(o);
      const ctx = makeCtx(v.layers.mass, v.layers.buildings);
      for (const [id, list] of v.byBuilding) {
        const esc = list.filter((p) => p.kind === "escape");
        if (esc.length === 0) continue;
        escapes++;
        const b = v.buildingOf.get(id)!;
        const col = v.colAt.get(keyOf(esc[0]!.cell))!;
        expect(new Set(esc.map((p) => keyOf(p.cell))).size, `${label(o)} ${id}`).toBe(1);
        expect(b.cells.length, `${label(o)} ${id}`).toBeGreaterThanOrEqual(ESCAPE_MIN_BAYS);
        expect(b.storeys, `${label(o)} ${id}`).toBeGreaterThanOrEqual(3);
        expect(col.kind, `${label(o)} ${id}`).toBe("mid");
        expect(v.groundAt.get(keyOf(col))!.kind, `${label(o)} ${id}`).not.toBe("door");
        expect(facesStalls(ctx, col), `${label(o)} ${id}`).toBe(false);
        expect(esc.map((p) => p.placement.key), `${label(o)} ${id}`).toEqual(esc.length === 1 && esc[0]!.placement.key === CODE_ESCAPE_KEY ? [CODE_ESCAPE_KEY] : [ESCAPE_FIRST, ...Array(Math.max(0, b.storeys - 3)).fill(ESCAPE_MID), ESCAPE_TOP]);
        expect(esc).toHaveLength(b.storeys - 1);
        esc.forEach((p, j) => {
          expect(p.face, `${label(o)} ${id}`).toBe(col.front);
          expect(p.storey).toBe(j + 1);
          expect(ESCAPES).toContain(p.placement.key);
          expect(p.placement.yaw_deg).toBe(col.yaw);
        });
        // the stage's choice of column: `rand("escape", "col", id)` among the hosts in row order
        const hosts = b.cells.map((c) => v.colAt.get(keyOf(c))!).filter((c) => c.kind === "mid" && v.groundAt.get(keyOf(c))!.kind !== "door" && !facesStalls(ctx, c));
        expect(keyOf(hosts[indexOf(stageRand("facades", o.seed)("escape", "col", id), hosts.length)]!), `${label(o)} ${id}`).toBe(keyOf(col));
      }
    }
    if (FULL_CITIES) expect(escapes).toBeGreaterThan(3000);
  });

  it("the street escapes are exactly escapeBlocks' choice over EQ's street sites at TILE_CITY_R7_MIN, the quiet ones its choice over EX's quiet sites; no two neighbours of a run both have one; the street target is met (escapeShort 0)", () => {
    let street = 0;
    let quiet = 0;
    for (const o of NAMED) {
      const v = viewOf(o);
      const { mass, buildings, facades } = v.layers;
      const ctx = makeCtx(mass, buildings);
      const rand = stageRand("facades", o.seed);
      const runOf = runsOf(buildings);
      const isStreet = (b: CityBuilding): boolean => {
        const first = b.cells.map((c) => v.colAt.get(keyOf(c))!).find((c) => c.kind !== "blind")!;
        return ctx.built.get(keyOf(first))!.open.find((s) => s.side === ctx.rowFront.get(first.rowId))!.frontage === "street";
      };
      const sitesOf = (wantStreet: boolean): EscapeSite[] =>
        buildings.buildings.map((b) => {
          const mids = b.cells.map((c) => v.colAt.get(keyOf(c))!).filter((c) => c.kind === "mid" && v.groundAt.get(keyOf(c))!.kind !== "door" && !facesStalls(ctx, c));
          return {
            id: b.id,
            rank: finalise(rand("escape", "rank", b.id)),
            run: runOf.get(b.id) ?? `solo:${b.id}`,
            qualifies: b.cells.length >= ESCAPE_MIN_BAYS && b.storeys >= 3 && isStreet(b) === wantStreet,
            hosts: mids.length > 0,
          };
        });
      const has = new Set([...v.byBuilding].filter(([, l]) => l.some((p) => p.kind === "escape")).map(([id]) => id));
      for (const wantStreet of [true, false]) {
        const choice = escapeBlocks(sitesOf(wantStreet), TILE_CITY_R7_MIN);
        const mine = [...has].filter((id) => isStreet(v.buildingOf.get(id)!) === wantStreet).sort();
        expect([...choice.chosen].sort(), `${label(o)} ${wantStreet ? "street" : "quiet"}`).toEqual(mine);
        if (wantStreet) {
          expect(choice.escapeShort, label(o)).toBe(0);
          expect(mine.length / choice.qualifying, label(o)).toBeGreaterThanOrEqual(TILE_CITY_R7_MIN);
          street += mine.length;
        } else quiet += mine.length;
      }
      const last = new Map<string, boolean>();
      for (const b of buildings.buildings) {
        const run = runOf.get(b.id) ?? `solo:${b.id}`;
        expect(last.get(run) === true && has.has(b.id), `${label(o)} ${b.id}`).toBe(false);
        last.set(run, has.has(b.id));
      }
      expect(facades.walls, label(o)).toBeDefined();
    }
    if (FULL_CITIES) expect(street).toBeGreaterThan(1500);
    if (FULL_CITIES) expect(quiet).toBeGreaterThan(1000);
  });

  it("every choice is the stage's rand (R-3): the same city twice gives the same walls and digest, another seed other walls", () => {
    const a = cityOf(DEFAULT);
    const b = runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, undefined, stagesOf("on"));
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(b.plan.layers.facades!.walls).toEqual(a.plan.layers.facades!.walls);
    expect(b.plan.digests.facades).toBe(a.plan.digests.facades);
    const c = cityOf({ ...DEFAULT, seed: 2 });
    expect(c.ok && c.plan.layers.facades!.walls).not.toEqual(a.plan.layers.facades!.walls);
  });
});

describe("the meeting with H1b's dressing (EP, criterion 3)", { timeout: 120_000 }, () => {
  it("ground is exactly H1's; on every building with no escape the dressing equals buildDressing with no escape columns, piece for piece; on an escape building no awning, L awning or sign stands on a bay that spans the escape column, and its glass stands", () => {
    let escapeBuildings = 0;
    let changed = 0;
    for (const o of NAMED) {
      const v = viewOf(o);
      const { mass, buildings, facades } = v.layers;
      const rand = stageRand("facades", o.seed);
      expect(buildGround(mass, buildings, rand), label(o)).toEqual(facades.ground);
      const plain = buildDressing(mass, buildings, facades.ground, rand).dressing;
      const escaped = new Set([...v.byBuilding].filter(([, l]) => l.some((p) => p.kind === "escape")).map(([id]) => id));
      const have = new Map<string, typeof plain>();
      const was = new Map<string, typeof plain>();
      for (const p of facades.dressing!) (have.get(p.building) ?? have.set(p.building, []).get(p.building)!).push(p);
      for (const p of plain) (was.get(p.building) ?? was.set(p.building, []).get(p.building)!).push(p);
      for (const b of buildings.buildings) {
        if (!escaped.has(b.id)) {
          expect(have.get(b.id) ?? [], `${label(o)} ${b.id}`).toEqual(was.get(b.id) ?? []);
          continue;
        }
        escapeBuildings++;
        const esc = v.byBuilding.get(b.id)!.find((p) => p.kind === "escape")!;
        const bay = v.groundAt.get(keyOf(esc.cell))!;
        const here = (have.get(b.id) ?? []).filter((p) => bay.cells.some((c) => keyOf(c) === keyOf(p.cell)) || keyOf(p.cell) === keyOf(bay.cells[0]!));
        expect(here.filter((p) => p.kind === "awning" || p.kind === "fasciaSign" || p.kind === "bladeSign"), `${label(o)} ${b.id}`).toEqual([]);
        // the glass stands exactly as without the escape
        expect(here.filter((p) => p.kind === "glass"), `${label(o)} ${b.id}`).toEqual((was.get(b.id) ?? []).filter((p) => p.kind === "glass" && keyOf(p.cell) === keyOf(bay.cells[0]!)));
        if ((have.get(b.id) ?? []).length !== (was.get(b.id) ?? []).length) changed++;
      }
    }
    if (FULL_CITIES) expect(escapeBuildings).toBeGreaterThan(3000);
    if (FULL_CITIES) expect(changed).toBeGreaterThan(500);
  });
});

describe("canopies and wall props (WP1 to WP3, criterion 4)", { timeout: 120_000 }, () => {
  it("every canopy is over a door at DOOR_CANOPY_Y_M plus its piece's level; a door corner has none; every wall prop is on a mid or corner column's front at storey 2 or higher, never on the escape column; at most WALL_PROPS_PER_BLOCK a building; at most DRESS_PER_BAY_MAX a column counting the dressing and the escape's weight", () => {
    let canopies = 0;
    let bare = 0;
    let props = 0;
    for (const o of NAMED) {
      const v = viewOf(o);
      const perCell = new Map<string, number>();
      for (const p of v.layers.facades.dressing!) perCell.set(keyOf(p.cell), (perCell.get(keyOf(p.cell)) ?? 0) + 1);
      const canopyAt = new Set(v.walls.filter((p) => p.kind === "canopy").map((p) => keyOf(p.cell)));
      for (const g of v.layers.facades.ground) if (g.kind === "doorCorner") {
        bare++;
        expect(canopyAt.has(keyOf(g.cells[0]!)), label(o)).toBe(false);
      }
      for (const [id, list] of v.byBuilding) {
        const b = v.buildingOf.get(id)!;
        const esc = list.filter((p) => p.kind === "escape");
        const escCol = esc.length > 0 ? keyOf(esc[0]!.cell) : null;
        const wp = list.filter((p) => p.kind === "aircon" || p.kind === "planter");
        expect(wp.length, `${label(o)} ${id}`).toBeLessThanOrEqual(WALL_PROPS_PER_BLOCK);
        for (const p of list) {
          if (p.kind === "canopy") {
            canopies++;
            const g = v.groundAt.get(keyOf(p.cell))!;
            expect(g.kind, label(o)).toBe("door");
            expect(DOOR_CANOPIES).toContain(p.placement.key);
            expect(p.placement.y_m, label(o)).toBeCloseTo(DOOR_CANOPY_Y_M + g.placement.y_m, 9);
            expect(p.storey).toBe(0);
          }
          if (p.kind === "aircon" || p.kind === "planter") {
            props++;
            const col = v.colAt.get(keyOf(p.cell))!;
            expect(col.kind, `${label(o)} ${id}`).not.toBe("blind");
            expect(p.storey, `${label(o)} ${id}`).toBeGreaterThanOrEqual(WALL_MIN_LEVEL);
            expect(p.storey, `${label(o)} ${id}`).toBeLessThanOrEqual(b.storeys - 1);
            expect(keyOf(p.cell), `${label(o)} ${id}`).not.toBe(escCol);
            expect(p.face).toBe(col.front);
            expect((p.kind === "aircon" ? WALL_ACS : WALL_PLANTERS) as readonly string[]).toContain(p.placement.key);
            expect(p.placement.y_m, `${label(o)} ${id}`).toBeCloseTo(3 * p.storey + (p.kind === "aircon" ? WALL_AC_LIFT_M : PLANTER_LIFT_M), 9);
          }
          if (p.kind !== "escape" && !PARTY_WALL_KINDS.includes(p.kind)) perCell.set(keyOf(p.cell), (perCell.get(keyOf(p.cell)) ?? 0) + 1);
        }
        if (esc.length > 0) perCell.set(escCol!, (perCell.get(escCol!) ?? 0) + escapeWeight(v.colAt.get(escCol!)!, esc));
      }
      for (const [k, n] of perCell) expect(n, `${label(o)} ${k}`).toBeLessThanOrEqual(DRESS_PER_BAY_MAX);
    }
    if (FULL_CITIES) expect(canopies).toBeGreaterThan(5000);
    if (FULL_CITIES) expect(bare).toBeGreaterThan(2000);
    if (FULL_CITIES) expect(props).toBeGreaterThan(15000);
  });
});

// ---- the placements, worked by hand (criterion 5) ----

const ORIGIN = { i: 3, j: 4 };
const FRONT_OF: Readonly<Record<number, CitySide>> = { 0: "+z", 90: "+x", 180: "-z", 270: "-x" };
/** The frame turn of (x, z) by `yaw` (three.js's: at 90 a piece's own +z faces +x). */
const turn = (yaw: number, x: number, z: number): [number, number] => ((): [number, number] => {
  const q = ((yaw / 90) % 4 + 4) % 4;
  return q === 0 ? [x, z] : q === 1 ? [z, -x] : q === 2 ? [-x, -z] : [-z, x];
})();

/** A mid column of cell (3, 4) over a ground slot to 3 m, with `floorKey` over it (a three-storey piece) and a roof at 3 x storeys; the floor's pivot is (0, `pz`) in the column's frame. */
function column(floorKey: CalibrationKey, pz: number, yaw: CityYaw, storeys: number): CityColumn {
  const c = centreOf(ORIGIN);
  const at = turn(yaw, 0, pz);
  return {
    ...ORIGIN,
    building: "b",
    rowId: "r",
    kind: "mid",
    front: FRONT_OF[yaw]!,
    side: null,
    yaw,
    ground: { kind: "mid", yaw, y_m: 0, top_m: 3 },
    pieces: [
      { role: "floor3", storey: 1, span: 3, placement: { key: floorKey, x_m: c.x + at[0], y_m: 3, z_m: c.z + at[1], yaw_deg: yaw } },
      { role: "roof", storey: storeys, span: 0, placement: { key: key("Bld_Roof_Mid_02"), x_m: c.x, y_m: 3 * storeys, z_m: c.z, yaw_deg: yaw } },
    ],
  };
}

describe("placements, worked by hand (criterion 5)", () => {
  const CX = 17.5;
  const CZ = 22.5;
  // Style 2: Apartment_Stack_02 is 5.17 x 5.214 m with its body's front 0.129 m inside its bounds: its front plane stands at 2.5 + 0.129 = 2.629 m from the cell's centre, its pivot at 2.629 - 2.607 = 0.022 m.
  // Four storeys: the floors are storeys 1 to 3 at y 3, 6, 9, the sill 0.417: the decks at 3.267, 6.267, 9.267 m. Each flight rises 3.0 m over its 3.0 m (scale 1). The pieces' x, before centring: 0 (the first
  // landing), -2.020 - -0.939 = -1.081 (the middle), -1.081 (the top: its hatch is where the flight below arrives). The widths 4.252 and 3.251 span from -2.7065 to 2.126, so every x moves by +0.29025.
  const X = [0.29025, -0.79075, -0.79075];
  const Y = [2.658, 5.658, 8.658];
  const Z = [2.629 + 0.88, 2.629 + 0.822, 2.629 + 0.822];

  for (const yaw of [0, 90] as const) {
    it(`a pack escape on a 4-storey style-2 column at turn ${yaw}: the decks, the x shift, the scales, the ladder to y 0`, () => {
      const col = column(key("Bld_Apartment_Stack_02"), 0.022, yaw, 4);
      const r = placeEscape(col, "b", 4);
      expect(r).not.toBeNull();
      const pieces = r!.pieces;
      expect(pieces.map((p) => p.placement.key)).toEqual([ESCAPE_FIRST, ESCAPE_MID, ESCAPE_TOP]);
      expect(pieces.map((p) => p.storey)).toEqual([1, 2, 3]);
      expect(r!.weight).toBe(3);
      pieces.forEach((p, j) => {
        const [px, pz] = turn(yaw, X[j]!, Z[j]!);
        expect(p.placement.x_m, `piece ${j} x`).toBeCloseTo(CX + px, 6);
        expect(p.placement.z_m, `piece ${j} z`).toBeCloseTo(CZ + pz, 6);
        expect(p.placement.y_m, `piece ${j} y`).toBeCloseTo(Y[j]!, 6);
        expect(p.placement.yaw_deg).toBe(yaw);
        expect(p.scaleY, `piece ${j} scale`).toBeCloseTo(1, 9);
        expect(p.face).toBe(FRONT_OF[yaw]);
      });
      // the decks: base + 0.609 x scale = sill - 0.15 over each floor
      expect(pieces.map((p) => p.placement.y_m + 0.609 * p.scaleY).map((d) => Math.round(d * 1000) / 1000)).toEqual([3.267, 6.267, 9.267]);
      // the first piece carries the drop ladder: two rails and 8 rungs, its foot on the walk (y 0)
      const ladder = pieces[0]!.boxes;
      expect(ladder.filter((b) => b.kind === "ladderRail")).toHaveLength(2);
      expect(ladder.filter((b) => b.kind === "rung")).toHaveLength(8);
      const rail = ladder.find((b) => b.kind === "ladderRail")!;
      expect(rail.h_m).toBeCloseTo(2.772, 9);
      expect(rail.y_m).toBeCloseTo(-1.272, 9);
      expect(rail.z_m).toBeCloseTo(0.828, 9);
      expect(Math.min(...ladder.filter((b) => b.kind === "ladderRail").map((b) => pieces[0]!.placement.y_m + b.y_m - b.h_m / 2))).toBeCloseTo(0, 9);
      expect(ladder.filter((b) => b.kind === "ladderRail").map((b) => b.x_m)).toEqual([0.873, 1.283].map((x) => expect.closeTo(x, 9)));
      expect(pieces[1]!.boxes).toEqual([]);
      // the reach: the first piece's outer face is 2.629 + 1.76 - 2.5 = 1.889 m past the front cell edge
      expect(2.629 + 1.76 - 2.5).toBeCloseTo(1.889, 9);
      // and the escape passes its own check
      const rep = escapeCheck(col, pieces)!;
      expect(rep.ok).toBe(true);
      expect(rep.missing).toEqual([]);
      expect(rep.worstDeck_m).toBeLessThanOrEqual(ESCAPE_DECK_TOL_M);
      expect(rep.worstJoint_m).toBeLessThanOrEqual(ESCAPE_JOINT_TOL_M);
      expect(Math.abs(rep.ladderFoot_m!)).toBeLessThanOrEqual(ESCAPE_GROUND_TOL_M);
    });
  }

  it("a code-drawn escape on a column too narrow for the pack's span (4.8325 m in a 4.5 m column): one piece, its boxes the whole escape, its decks the same", () => {
    const col = column(key("Bld_Apartment_Stack_02"), 0.022, 0, 4);
    expect(placeEscape(col, "b", 4, undefined, 4.5)!.pieces[0]!.placement.key).toBe(CODE_ESCAPE_KEY);
    const r = placeEscape(col, "b", 4, undefined, 4.5)!;
    expect(r.pieces).toHaveLength(1);
    expect(r.weight).toBe(1);
    const p = r.pieces[0]!;
    expect(p.storey).toBe(1);
    expect(p.scaleY).toBe(1);
    // base = the first deck 3.267 less the deck's 0.08; z = the front 2.629 + half of the code escape's 1.64 depth
    expect(p.placement.y_m).toBeCloseTo(3.187, 9);
    expect(p.placement.x_m).toBeCloseTo(CX, 9);
    expect(p.placement.z_m).toBeCloseTo(CZ + 2.629 + 0.82, 9);
    const count = (k: string): number => p.boxes.filter((b) => b.kind === k).length;
    // per deck: 3 slabs, 3 rails, 4 posts; per flight (a 3 m rise at 0.2 m a riser): 2 stringers and 14 treads; the ladder: 2 rails and rungs every 0.3 m up to the first deck plus its 0.9 m rail
    expect([count("deck"), count("rail"), count("post"), count("stringer"), count("tread"), count("ladderRail"), count("rung")]).toEqual([9, 9, 12, 4, 28, 2, 13]);
    expect(escapeCheck(col, r.pieces)!.ok).toBe(true);
    // the same column at its own width takes the pack
    expect(placeEscape(col, "b", 4)!.pieces[0]!.placement.key).toBe(ESCAPE_FIRST);
    // and a code escape wider than the column is not placed at all
    expect(placeEscape(col, "b", 4, undefined, 3)).toBeNull();
  });

  it("a canopy over a Door_01 at y_m 0 and one over a door at -0.071 (L1): its back on the ground piece's front 3.029 m out, centred, 2.3 m over the base plus the level", () => {
    // Door_01: 5.096 x 3.0 x 5.577 m, its body's front 0.529 inside its bounds: its pivot at 2.5 - (2.7885 - 0.529) = 0.2405 m, its front at 0.2405 + 2.7885 = 3.029 m.
    const cell: CityCell = ORIGIN;
    const doorKey = key("Bld_Apartment_Door_01");
    const floor = column(key("Bld_Apartment_Stack_01"), 0.098, 0, 4);
    for (const y of [0, -0.071]) {
      const g: CityGroundPiece = { kind: "door", building: "b", cells: [cell], frontage: "street", placement: placeGround(doorKey, [cell], "+z", 0, y), door_m: y + 0.029 };
      expect(g.placement.z_m - CZ).toBeCloseTo(0.2405, 9);
      const f = bayFrame({ g, yaw: 0, floors: [floor.pieces[0]!.placement], topM: 3 });
      const placement = placeCanopy(f, DOOR_CANOPIES[0]!)!;
      expect(placement).not.toBeNull();
      // Cover_01: 4.832 wide, 1.0 deep: its centre 3.029 + 0.5 out; its outer face 1.529 m past the front cell edge
      expect(placement.x_m).toBeCloseTo(CX, 9);
      expect(placement.z_m).toBeCloseTo(CZ + 3.029 + 0.5, 9);
      expect(placement.y_m).toBeCloseTo(2.3 + y, 9);
      expect(placement.yaw_deg).toBe(0);
      expect(3.029 + 1.0 - 2.5).toBeCloseTo(1.529, 9);
      // Cover_02: 0.701 deep
      expect(placeCanopy(f, DOOR_CANOPIES[1]!)!.z_m).toBeCloseTo(CZ + 3.029 + 0.3505, 9);
    }
  });

  it("an air-conditioner on each side of its column and a planter: 1.5 m left or right of the centre, 1 m or 0.9 m over the floor of its storey, their backs on the floor piece's front", () => {
    // Style 1: Apartment_Stack_01 is 5.0 x 5.196 m with its front inset 0.196: its front plane at 2.696 m, its pivot at 0.098 m.
    for (const yaw of [0, 90] as const) {
      const col = column(key("Bld_Apartment_Stack_01"), 0.098, yaw, 4);
      // Aircon_01: 0.823 wide, 0.651 deep: its centre 2.696 + 0.3255 out; storey 2 at y 6, so its base is at 7.0
      for (const side of [-1, 1]) {
        const p = placeProp(col, WALL_ACS[0]!, 2, side * 1.5, WALL_AC_LIFT_M)!;
        const [px, pz] = turn(yaw, side * 1.5, 2.696 + 0.3255);
        expect(p.x_m).toBeCloseTo(CX + px, 9);
        expect(p.z_m).toBeCloseTo(CZ + pz, 9);
        expect(p.y_m).toBeCloseTo(7, 9);
        expect(p.yaw_deg).toBe(yaw);
      }
      // PlanterWindow_01: 0.988 wide, 0.37 deep, centred, 0.9 over storey 3 (y 9): 9.9
      const q = placeProp(col, WALL_PLANTERS[0]!, 3, 0, PLANTER_LIFT_M)!;
      const [qx, qz] = turn(yaw, 0, 2.696 + 0.185);
      expect(q.x_m).toBeCloseTo(CX + qx, 9);
      expect(q.z_m).toBeCloseTo(CZ + qz, 9);
      expect(q.y_m).toBeCloseTo(9.9, 9);
    }
    // a prop is moved inside its column: an x of 2.4 clamps to 2.5 - 0.4115
    expect(placeProp(column(key("Bld_Apartment_Stack_01"), 0.098, 0, 4), WALL_ACS[0]!, 2, 2.4, WALL_AC_LIFT_M)!.x_m).toBeCloseTo(CX + 2.0885, 9);
  });
});

// ---- the checks hold ----

describe("the checks hold on the named runs (criterion 6)", { timeout: 120_000 }, () => {
  it("every check of the walls has no failure on any named run, and the escapes' worst numbers are inside their limits", () => {
    for (const o of NAMED) {
      const { mass, buildings, facades } = layersOf(o);
      expect(wallFailures(facades, { mass, buildings }).slice(0, 3), label(o)).toEqual([]);
    }
  });
});
