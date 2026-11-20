/**
 * Stage 3, section C2, on typed-in fixtures (light): the moved constants pinned to the old tile city's, `lotQuota`, `unitsOf` (18.2 on cells), where a lot fits (`sites.ts`), a court laid whole, `buildMass`'s rounds on one
 * block, a lane part with no place for a drive, and P2 with its failing fixtures. The named cities are in `stage.test.ts`.
 */
import { describe, expect, it } from "vitest";
import type { CityBlock, CityCourt, CityLandLayer, CityMassLayer, CityOpening, CityPart, CityStreetCell, CityStreetsLayer, CityBlockUnits } from "../../core";
import { CITY_FRONT_LOT_BLOCKS_MAX as OLD_FRONT, COURT_CELLS as OLD_COURT, DRIVE_CELLS as OLD_DRIVE, HOME_COLUMN_FLOORS as OLD_HCF, LOTS_PER_BLOCK_MAX as OLD_LOTS, LOT_STALLS as OLD_STALLS, PARK_PER_HOME as OLD_PPH, PARK_SUPPLY_BAND as OLD_BAND, UNIT_FLOORS_NOMINAL as OLD_UFN } from "../../render3d/tilecity";
import { TERRACE_BAYS } from "../../render3d/town";
import { massFailures, p2Value, parkingNumbers, type ParkingNumbers } from "./check";
import { CITY_FRONT_LOT_BLOCKS_MAX, COURT_CELLS, DRIVE_CELLS, HOME_COLUMN_FLOORS, LOTS_PER_BLOCK_MAX, LOT_STALLS, PARK_PER_HOME, PARK_SUPPLY_BAND, TERRACE_BAYS_MAX, UNIT_FLOORS_NOMINAL } from "./constants";
import { buildMass, lotQuota, unitsOf } from "./lots";
import { planMass } from "./plan";
import { offsetsOf, siteCells, siteFits, type LotSite } from "./sites";

const block = (i0: number, i1: number, j0: number, j1: number, bi = 0, bj = 0): CityBlock => ({ id: `block:${bi}:${bj}`, bi, bj, i0, i1, j0, j1, type: "medium" });
const part = (id: string, b: CityBlock, r: Pick<CityPart, "i0" | "i1" | "j0" | "j1">, edges: Partial<CityPart["edges"]> = {}): CityPart => ({
  id,
  block: b.id,
  ...r,
  shape: Math.min(r.i1 - r.i0, r.j1 - r.j0) === 2 ? "strip" : "court",
  edges: { "+x": "street", "-x": "street", "+z": "street", "-z": "street", ...edges },
});
const landOf = (parts: CityPart[], lanes: CityLandLayer["lanes"] = []): CityLandLayer => ({ stage: "land", blocks: [], parts, lanes, parks: [] });
const streetsOf = (blocks: CityBlock[], cells: CityStreetCell[] = []): Pick<CityStreetsLayer, "blocks" | "cells"> => ({ blocks, cells });
const pavement = (i: number, j: number, street: string): CityStreetCell => ({ i, j, role: "pavement", street, band: 0 });

describe("the constants moved from the tile city keep their values", () => {
  it("PARK_PER_HOME, the unit and lot constants, the supply band and the front-lot share equal tilecity.ts's", () => {
    expect(PARK_PER_HOME).toBe(OLD_PPH);
    expect(PARK_PER_HOME).toBe(0.15);
    expect(HOME_COLUMN_FLOORS).toBe(OLD_HCF);
    expect(UNIT_FLOORS_NOMINAL).toBe(OLD_UFN);
    expect(LOTS_PER_BLOCK_MAX).toBe(OLD_LOTS);
    expect(LOT_STALLS).toBe(OLD_STALLS);
    expect(PARK_SUPPLY_BAND).toEqual(OLD_BAND);
    expect(CITY_FRONT_LOT_BLOCKS_MAX).toBe(OLD_FRONT);
    expect(TERRACE_BAYS_MAX).toBe(TERRACE_BAYS.max);
    expect(DRIVE_CELLS).toBe(OLD_DRIVE);
    expect(COURT_CELLS).toEqual(OLD_COURT);
  });
});

describe("lotQuota (18.4)", () => {
  it("a block wants clamp(round(homes x 0.15 / 6), 1, 2) lots", () => {
    expect(lotQuota(0)).toBe(1);
    expect(lotQuota(40)).toBe(1);
    expect(lotQuota(60)).toBe(2); // 1.5 rounds up
    expect(lotQuota(84)).toBe(2);
    expect(lotQuota(400)).toBe(LOTS_PER_BLOCK_MAX);
  });
});

describe("unitsOf (18.2 on 5 m cells)", () => {
  it("a 10 by 2 strip: 20 columns, shops are the street-frontage columns less a door column per run of up to 4, homes are floor(columns x 3 / 2)", () => {
    const b = block(0, 10, 0, 2);
    const land = landOf([part("block:0:0", b, b)]);
    const p = planMass(streetsOf([b]), land, () => 1);
    const u = unitsOf(p, [b]).get(b.id)!;
    // every one of the 20 cells is on a street. Runs: the -z row (10 cells: 3 doors), the +z row (3 doors), and the two end columns (2 cells each: 1 door each)
    expect(u).toEqual({ columns: 20, shops: 20 - (3 + 3 + 1 + 1), homes: 30 });
  });

  it("a block with no built cell holds no units", () => {
    const b = block(0, 8, 0, 8);
    expect(unitsOf({ built: [] }, [b]).get(b.id)).toEqual({ columns: 0, shops: 0, homes: 0 });
  });
});

describe("where a lot fits (sites.ts)", () => {
  const b = block(2, 18, 2, 13);
  const p = part("block:0:0", b, b);

  it("a court needs a drive window with a building at each end, and room for stalls, aisle and stalls from ring 3", () => {
    // the long side of a 16 by 11 part is 16 cells: the drive and the two ring-2 corners leave offsets 3 to 11
    const on = offsetsOf(p, [], [], "-z", "court");
    expect(on[0]).toBe(3);
    expect(on[on.length - 1]).toBe(16 - 2 - 3);
    // its short side is 11 cells and the court is 3 deep from ring 3: it fits (11 deep)
    expect(offsetsOf(p, [], [], "+x", "court").length).toBeGreaterThan(0);
    const cells = siteCells(p, "-z", 6, "court");
    expect(cells.drive).toEqual([{ i: 8, j: 2 }, { i: 9, j: 2 }, { i: 8, j: 3 }, { i: 9, j: 3 }]);
    expect(cells.stalls).toEqual([{ i: 8, j: 4 }, { i: 9, j: 4 }, { i: 8, j: 6 }, { i: 9, j: 6 }]);
    expect(cells.aisle).toEqual([{ i: 8, j: 5 }, { i: 9, j: 5 }]);
    expect(cells.pads).toEqual([{ i: 7, j: 5 }, { i: 10, j: 5 }]);
  });

  it("a part 6 deep has an interior 2 deep: no court from its long side, but a frontage lot", () => {
    const narrow = block(2, 8, 2, 15);
    const q = part("block:0:0", narrow, narrow);
    expect(offsetsOf(q, [], [], "-x", "court")).toEqual([]);
    expect(offsetsOf(q, [], [], "-x", "frontLot").length).toBeGreaterThan(0);
    // and a side of 6 cells has no drive window at all
    expect(offsetsOf(q, [], [], "-z", "frontLot")).toEqual([]);
  });

  it("a drive is never at a row's end, and never beside another opening closer than a building", () => {
    expect(siteFits(p, [], [], "-z", 0, "frontLot")).toBe(false);
    expect(siteFits(p, [], [], "-z", 2, "frontLot")).toBe(false);
    expect(siteFits(p, [], [], "-z", 3, "frontLot")).toBe(true);
    const first: LotSite = { part: p.id, block: b.id, serves: b.id, kind: "court", side: "-z", t: 5 };
    expect(siteFits(p, [], [first], "-z", 7, "court")).toBe(false); // the two openings would touch
    expect(siteFits(p, [], [first], "-z", 8, "court")).toBe(false); // one cell of building between them
    expect(siteFits(p, [], [first], "-z", 9, "court")).toBe(true);
  });

  it("a plaza's cells are not a drive's", () => {
    const plaza = [{ i: 2, j: 2 }, { i: 3, j: 2 }, { i: 2, j: 3 }, { i: 3, j: 3 }];
    expect(siteFits(p, plaza, [], "-z", 3, "frontLot")).toBe(false); // a plaza leaves less than a building before the drive
    expect(siteFits(p, plaza, [], "-z", 5, "frontLot")).toBe(true);
  });
});

describe("a court laid", () => {
  const b = block(2, 18, 2, 13);
  const land = landOf([part("block:0:0", b, b)]);
  const cells: CityStreetCell[] = [pavement(8, 1, "x:0"), pavement(9, 1, "x:0")];
  const lot: LotSite = { part: "block:0:0", block: b.id, serves: b.id, kind: "court", side: "-z", t: 6 };
  const plan = planMass(streetsOf([b], cells), land, () => 1, [lot]);
  const mass: CityMassLayer = { stage: "mass", cells: plan.cells, built: plan.built, openings: plan.openings, courts: [], units: [] };

  it("is a drive through both rings, then stalls, aisle and stalls, with the aisle's ends paved; the part needs no walk-through; every check but P2 holds", () => {
    const use = new Map<string, string>(mass.cells.map((c) => [`${c.i},${c.j}`, c.use] as const));
    for (const [i, j] of [[8, 2], [9, 2], [8, 3], [9, 3]]) expect(use.get(`${i},${j}`)).toBe("drive");
    for (const [i, j] of [[8, 4], [9, 4], [8, 6], [9, 6]]) expect(use.get(`${i},${j}`)).toBe("stalls");
    for (const [i, j] of [[8, 5], [9, 5]]) expect(use.get(`${i},${j}`)).toBe("aisle");
    for (const [i, j] of [[7, 5], [10, 5]]) expect(use.get(`${i},${j}`)).toBe("apron");
    expect(mass.openings.map((o) => o.kind)).toEqual(["drive"]);
    expect(massFailures(mass, [b], land)).toEqual([]);
    expect(plan.laid).toHaveLength(1);
    expect(plan.laid[0]!.opening).toBe("block:0:0/drive/0");
  });

  it("records the street it opens on and its two mouth cells on the building line", () => {
    const drive = mass.openings.find((o) => o.kind === "drive")!;
    expect(drive.mouth).toEqual({ street: "x:0", cells: [{ i: 8, j: 2 }, { i: 9, j: 2 }] });
  });

  it("the columns beside the drive are corner columns that face it, and the ring-2 corners stay blind", () => {
    const beside = plan.built.find((c) => c.i === 7 && c.j === 2)!;
    expect(beside.column).toBe("corner");
    expect(beside.open.map((o) => [o.side, o.faces])).toEqual([["+x", "drive"], ["-z", "street"]]);
    for (const [i, j] of [[3, 3], [16, 3], [3, 11], [16, 11]]) expect(plan.built.find((c) => c.i === i && c.j === j)!.column).toBe("blind");
  });

  it("failing fixture, M5: the drive's record removed fails at that opening, and its mouth removed fails too", () => {
    const drive = mass.openings.find((o) => o.kind === "drive")!;
    const gone = massFailures({ ...mass, openings: mass.openings.filter((o) => o !== drive) }, [b], land);
    expect(gone.some((f) => f.id === "M5" && /no recorded opening owns it/.test(f.reason))).toBe(true);
    const noMouth = massFailures({ ...mass, openings: mass.openings.map((o) => (o === drive ? { ...o, mouth: null } : o)) }, [b], land);
    expect(noMouth.some((f) => f.id === "M5" && /has no mouth/.test(f.reason))).toBe(true);
  });

  it("a drive with no street beyond its mouth stops the stage, naming the cell", () => {
    expect(() => planMass(streetsOf([b]), land, () => 1, [lot])).toThrow(/M5: the court of block:0:0 has no street beyond its mouth at \(8, 1\)|M5: the court of block:0:0 has no street beyond its mouth/);
  });
});

describe("buildMass on one court block", () => {
  const b = block(2, 18, 2, 13);
  const land = landOf([part("block:0:0", b, b)]);
  const cells: CityStreetCell[] = [];
  for (let i = 2; i < 18; i++) cells.push(pavement(i, 1, "x:0"), pavement(i, 13, "x:1"));
  for (let j = 2; j < 13; j++) cells.push(pavement(1, j, "z:0"), pavement(18, j, "z:1"));
  const built = buildMass(streetsOf([b], cells), land, () => 1);

  it("lays the two lots its homes call for, as courts, and records the units of the laid layout", () => {
    expect(built.courts).toHaveLength(2);
    for (const c of built.courts) {
      expect(c.stalls).toBe(LOT_STALLS);
      expect(c.stallCells).toHaveLength(4);
      expect(c.aisleCells).toHaveLength(2);
      expect(c.block).toBe(b.id);
      expect(c.serves).toBe(b.id);
    }
    const u = built.units[0]!;
    expect(u.block).toBe(b.id);
    expect(u.lotsWanted).toBe(lotQuota(u.homes));
    expect(u.lots).toBe(2);
    expect(u.stallsShort).toBe(0);
    // the units are the laid layout's: its built cells, not the nominal ring's
    expect(u.columns).toBe(built.plan.built.length);
    expect(u.homes).toBe(Math.floor((u.columns * UNIT_FLOORS_NOMINAL) / HOME_COLUMN_FLOORS));
  });

  it("every check but P2 holds on it (a block alone has demand for two lots and the city a band of one)", () => {
    const layer: CityMassLayer = { stage: "mass", cells: built.plan.cells, built: built.plan.built, openings: built.plan.openings, courts: built.courts, units: built.units };
    expect(massFailures(layer, [b], land).filter((f) => f.id !== "P2")).toEqual([]);
  });

  it("is the same twice (no hidden state)", () => {
    const again = buildMass(streetsOf([b], cells), land, () => 1);
    expect(JSON.stringify(again.courts)).toBe(JSON.stringify(built.courts));
    expect(JSON.stringify(again.units)).toBe(JSON.stringify(built.units));
  });
});

describe("a lane part with no place for a drive stops the stage (M5, R-2): nothing is patched", () => {
  it("a lane across a block 6 cells long leaves parts whose lane sides are too short for a drive", () => {
    const b = block(2, 16, 2, 8);
    const land = landOf([part("block:0:0/a", b, { i0: 2, i1: 8, j0: 2, j1: 8 }, { "+x": "lane" }), part("block:0:0/b", b, { i0: 9, i1: 16, j0: 2, j1: 8 }, { "-x": "lane" })], [{ block: b.id, axis: "z", at: 8 }]);
    const cells: CityStreetCell[] = [pavement(8, 1, "x:0"), pavement(8, 8, "x:1")];
    expect(() => buildMass(streetsOf([b], cells), land, () => 1)).toThrow(/^M5: part block:0:0\/a has a lane edge and no place for a drive onto it/);
  });
});

describe("P2 (ported from parkmetrics.ts)", () => {
  const nine: CityBlock[] = [];
  for (let bj = 0; bj < 3; bj++) for (let bi = 0; bi < 3; bi++) nine.push(block(bi * 20, bi * 20 + 14, bj * 20, bj * 20 + 14, bi, bj));
  const unit = (id: string, homes: number, lots: number, wanted = lots): CityBlockUnits => ({ block: id, columns: 0, shops: 0, homes, lotsWanted: wanted, lots, stallsShort: Math.max(0, wanted - lots) * LOT_STALLS });
  const court = (block: string, serves: string, opening = `${block}/drive/0`): CityCourt => ({ block, serves, opening, stallCells: [], aisleCells: [], stalls: LOT_STALLS });
  const drive = (c: CityCourt): CityOpening => ({ id: c.opening, kind: "drive", block: c.block, cells: [], mouth: null });
  /** Every block with homes for two lots and two courts of its own: 18 lots, 108 stalls, 720 homes (demand 108). */
  const ideal = (): { courts: CityCourt[]; units: CityBlockUnits[] } => ({
    courts: nine.flatMap((b) => [court(b.id, b.id, `${b.id}/drive/0`), court(b.id, b.id, `${b.id}/drive/1`)]),
    units: nine.map((b) => unit(b.id, 80, 2)),
  });
  const value = (courts: CityCourt[], units: CityBlockUnits[], openings?: CityOpening[]): { n: ParkingNumbers; v: number } => {
    const n = parkingNumbers({ courts, units, openings: openings ?? courts.map(drive) }, nine);
    return { n, v: p2Value(n) };
  };

  it("holds with two courts a block and homes for them", () => {
    const { courts, units } = ideal();
    const { n, v } = value(courts, units);
    expect(n.homes).toBe(720);
    expect(n.stallDemand).toBeCloseTo(108, 9);
    expect(n.lotStalls).toBe(108);
    expect(v).toBe(0);
  });

  it("failing fixture: stalls under the band (0.75 of the demand) fail", () => {
    const { courts, units } = ideal();
    const more = units.map((u) => ({ ...u, homes: 100 })); // demand 135, floor 101.25, laid 108: holds
    expect(value(courts, more).v).toBe(0);
    const most = units.map((u) => ({ ...u, homes: 120 })); // demand 162, floor 121.5 > 108
    expect(value(courts, most).v).toBe(1);
  });

  it("failing fixture: more than LOTS_PER_BLOCK_MAX lots served, or held, in one block", () => {
    const { courts, units } = ideal();
    const extra = [...courts, court("block:0:0", "block:0:0", "block:0:0/drive/2")];
    expect(value(extra, units).n.blocksOverLots).toBe(1);
    expect(value(extra, units).v).toBeGreaterThanOrEqual(1);
  });

  it("failing fixture: a stall served two blocks away", () => {
    const { courts, units } = ideal();
    const far = courts.map((c, n) => (n === 0 ? { ...c, serves: "block:2:2" } : c));
    expect(value(far, units).n.stallServedFar).toBe(LOT_STALLS);
  });

  it("failing fixture: more blocks short than ceil(blocks / 9)", () => {
    const { courts, units } = ideal();
    const short = units.map((u, n) => (n < 2 ? unit(u.block, 80, 0, 2) : u));
    const fewer = courts.filter((c) => c.block !== nine[0]!.id && c.block !== nine[1]!.id);
    const { n, v } = value(fewer, short);
    expect(n.shortBlocks).toBe(2);
    expect(v).toBeGreaterThanOrEqual(1);
  });

  it("failing fixture: more frontage-lot blocks than ceil(blocks / 9)", () => {
    const { courts, units } = ideal();
    const hostsFront = new Set([courts[0]!.block, courts[2]!.block]);
    const openings = courts.map((c): CityOpening => ({ ...drive(c), kind: hostsFront.has(c.block) ? "frontLot" : "drive" }));
    const { n } = value(courts, units, openings);
    expect(n.frontLotBlocks).toBe(2);
    expect(p2Value(n)).toBe(1);
  });
});
