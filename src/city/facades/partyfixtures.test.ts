/**
 * Stage 7, section H2b, criterion 4's failing fixtures. Each is built from the default city's layers (6 x 6 seed 1, one-way on), typed in from the run in the test (not pinned by hash), with one thing changed, and must fail the
 * named check. The unchanged layer must pass (the sanity test), so a fixture fails for its own change. The checks also hold on the 20 named runs through the stage itself (`party.test.ts`).
 */
import { describe, expect, it } from "vitest";
import type { CityFacadesLayer, CityWallPiece } from "../../core";
import { partyFaces, placeParty, scanParty, type PartyFace } from "./party";
import { partyFailures, partyReport } from "./partycheck";
import { BLANK_RUN_MAX_M, PARTY_PIPES, PARTY_WINDOW, partyBounds } from "./partykit";
import { keyOf, rotate } from "./place";
import { DEFAULT, layersOf } from "./testcities";

const L = layersOf(DEFAULT);
const walls = L.facades.walls!;
const input = { mass: L.mass, buildings: L.buildings };
const colAt = new Map(L.buildings.columns!.map((c) => [keyOf(c), c] as const));
const faces = partyFaces(L.mass, L.buildings);
const isParty = (p: CityWallPiece): boolean => p.kind === "partyBoard" || p.kind === "partyPipe" || p.kind === "partyWindow";
const layerOf = (w: readonly CityWallPiece[]): CityFacadesLayer => ({ ...L.facades, walls: w });
const failuresOf = (w: readonly CityWallPiece[]) => partyFailures(layerOf(w), input);
const checksOf = (w: readonly CityWallPiece[]): Set<string> => new Set(failuresOf(w).map((f) => f.check));
const swap = (from: readonly CityWallPiece[], to: (p: CityWallPiece) => CityWallPiece): CityWallPiece[] => walls.map((p) => (from.includes(p) ? to(p) : p));
/** `p` moved `dx` across its face and `dz` along its own front (+z in its frame). */
const moved = (p: CityWallPiece, dx: number, dz: number): CityWallPiece => {
  const r = rotate(p.placement.yaw_deg, dx, dz);
  return { ...p, placement: { ...p.placement, x_m: p.placement.x_m + r.x, z_m: p.placement.z_m + r.z } };
};
const faceOf = (p: CityWallPiece): PartyFace => faces.find((f) => keyOf(f.cell) === keyOf(p.cell) && f.side === p.face && f.storey === p.storey)!;
const first = <T>(xs: readonly T[], what: string): T => {
  const x = xs[0];
  if (x === undefined) throw new Error(`the default city has no ${what}`);
  return x;
};

describe("the failing fixtures (criterion 4)", { timeout: 120_000 }, () => {
  it("sanity: the default city's own layer passes every check, and the report's numbers are as the stage's", () => {
    const rep = partyReport(L.facades, input);
    expect(rep.failures).toEqual([]);
    expect(rep.metrics.faces).toBe(faces.length);
    expect(rep.metrics.pieces).toBe(walls.filter(isParty).length);
    expect(rep.metrics.widestBare).toBeLessThanOrEqual(BLANK_RUN_MAX_M);
    expect(rep.metrics.pipe01).toBe(0);
    expect(rep.metrics.nothingFits).toBe(0);
    expect(rep.metrics.u1Faces).toBeGreaterThan(0);
  });

  it("a layer with no walls fails the shape check", () => {
    expect(new Set(partyFailures({ stage: "facades", ground: L.facades.ground }, input).map((f) => f.check))).toEqual(new Set(["H2b"]));
  });

  it("every kit piece removed (every height step bare) fails M7 on every face", () => {
    const bad = failuresOf(walls.filter((p) => !isParty(p)));
    expect(new Set(bad.map((f) => f.check))).toEqual(new Set(["M7"]));
    expect(bad).toHaveLength(faces.length);
  });

  it("one face's piece removed fails M7 on that face and no other", () => {
    const board = first(walls.filter((p) => p.kind === "partyBoard" && p.span === 1), "single-face board");
    const bad = failuresOf(walls.filter((p) => p !== board));
    expect(bad.map((f) => f.check)).toEqual(["M7"]);
    expect(bad[0]!.reason).toContain(`(${board.cell.i}, ${board.cell.j}) side ${board.face} storey ${board.storey}`);
  });

  it("a board moved 0.1 m off the wall fails attachment (PW2)", () => {
    const board = first(walls.filter((p) => p.kind === "partyBoard"), "board");
    const bad = failuresOf(swap([board], (p) => moved(p, 0, 0.1)));
    expect(bad.map((f) => f.check)).toEqual(["PW2"]);
    expect(bad[0]!.reason).toContain("attachment");
    expect(failuresOf(swap([board], (p) => moved(p, 0, -0.1))).map((f) => f.check)).toEqual(["PW2"]);
  });

  it("two windows pushed to one end of their face (2.39 m bare, over BLANK_RUN_MAX_M 2.1) fail M7's stretch, and nothing else", () => {
    const at = walls.findIndex((p, n) => p.kind === "partyWindow" && walls[n + 1]?.kind === "partyWindow" && keyOf(walls[n + 1]!.cell) === keyOf(p.cell) && walls[n + 1]!.face === p.face && walls[n + 1]!.storey === p.storey);
    expect(at).toBeGreaterThanOrEqual(0);
    const [a, b] = [walls[at]!, walls[at + 1]!];
    const w = partyBounds(PARTY_WINDOW).w;
    // the left window against the left edge (centre -2.5 + w / 2), the right one flush beside it: the bare stretch is what is left of the 5 m
    const left = -2.5 + w / 2;
    const bad = failuresOf(swap([a, b], (p) => moved(p, p === a ? left - -1.25 : left + w - 1.25, 0)));
    expect(bad.map((f) => f.check)).toEqual(["M7"]);
    expect(bad[0]!.reason).toMatch(/bare stretch of 2\.39\d m, over 2\.1/);
  });

  it("two windows at the quarter points are inside the limit (1.2 m between them), and a pipe or a pair at one end would not be", () => {
    const w = partyBounds(PARTY_WINDOW).w;
    expect(1.25 - w / 2 - (-1.25 + w / 2)).toBeCloseTo(1.197, 3);
    expect(1.25 - w / 2 - (-1.25 + w / 2)).toBeLessThan(BLANK_RUN_MAX_M);
    // Pipe_Present_03 at one end leaves 5 - 2.828 = 2.172 m bare, a pair of windows flush at one end 2.394 m
    expect(5 - partyBounds(PARTY_PIPES[1]!).w).toBeGreaterThan(BLANK_RUN_MAX_M);
    expect(5 - 2 * w).toBeGreaterThan(BLANK_RUN_MAX_M);
  });

  it("a piece raised past C's roof base, and one lowered into N's roof, fail PW3", () => {
    const top = first(walls.filter((p) => isParty(p) && p.storey + p.span === faceOf(p).storeys), "piece on a top face");
    const raised = failuresOf(swap([top], (p) => ({ ...p, placement: { ...p.placement, y_m: p.placement.y_m + 3 } })));
    expect(raised.map((f) => f.check)).toContain("PW3");
    expect(raised.some((f) => f.check === "PW3" && /past the taller roof's base/.test(f.reason))).toBe(true);
    const low = first(walls.filter((p) => isParty(p) && faceOf(p).lo_m > 3 * faceOf(p).storey), "piece on a lowest face");
    const sunk = failuresOf(swap([low], (p) => ({ ...p, placement: { ...p.placement, y_m: faceOf(p).lo_m - 0.2 } })));
    expect(sunk.some((f) => f.check === "PW3" && /sinks into the lower roof/.test(f.reason))).toBe(true);
    expect(checksOf(walls).has("PW3")).toBe(false);
  });

  it("a piece pushed off the face's 5 m fails PW3 across", () => {
    const board = first(walls.filter((p) => p.kind === "partyBoard"), "board");
    expect(failuresOf(swap([board], (p) => moved(p, 1, 0))).some((f) => f.check === "PW3" && /along its face/.test(f.reason))).toBe(true);
  });

  it("the same board key put on two faces running fails PW5", () => {
    const ofFace = (f: PartyFace): CityWallPiece | undefined => walls.find((p) => isParty(p) && keyOf(p.cell) === keyOf(f.cell) && p.face === f.side && p.storey <= f.storey && f.storey < p.storey + p.span);
    let pair: [CityWallPiece, CityWallPiece] | null = null;
    for (let n = 0; n + 1 < faces.length && !pair; n++) {
      const a = ofFace(faces[n]!);
      const b = ofFace(faces[n + 1]!);
      if (a && b && a !== b && a.kind === "partyBoard" && b.kind === "partyBoard") pair = [a, b];
    }
    const [a, b] = pair!;
    expect(a.placement.key).not.toBe(b.placement.key);
    const bad = failuresOf(swap([b], (p) => ({ ...p, placement: { ...p.placement, key: a.placement.key } })));
    expect(bad.map((f) => f.check)).toEqual(["PW5"]);
  });

  it("a pipe moved onto a street front fails PW6", () => {
    const pipe = first(walls.filter((p) => p.kind === "partyPipe"), "pipe");
    const col = colAt.get(keyOf(pipe.cell))!;
    const bad = failuresOf(swap([pipe], (p) => ({ ...p, face: col.front, placement: placeParty(p.cell, col.front, p.placement.key, 0, p.placement.y_m) })));
    expect(new Set(bad.map((f) => f.check)).has("PW6")).toBe(true);
    expect(checksOf(walls).has("PW6")).toBe(false);
    // a pipe key on a piece that is not a party-wall pipe run fails PW6 too
    expect(checksOf(swap([pipe], (p) => ({ ...p, kind: "partyBoard" }))).has("PW6")).toBe(true);
  });

  it("an escape moved onto a party face fails 16.11, and onto any side that is not open", () => {
    const escape = first(walls.filter((p) => p.kind === "escape"), "escape");
    const f = faces[0]!;
    const onParty = failuresOf([...walls, { ...escape, building: f.building, cell: f.cell, face: f.side }]);
    expect(onParty.some((x) => x.check === "16.11" && /party wall/.test(x.reason))).toBe(true);
    const col = colAt.get(keyOf(escape.cell))!;
    const closed = (["+x", "-x", "+z", "-z"] as const).find((s) => !L.mass.built.find((b) => keyOf(b) === keyOf(col))!.open.some((o) => o.side === s))!;
    expect(checksOf(swap([escape], (p) => ({ ...p, face: closed }))).has("16.11")).toBe(true);
    expect(checksOf(walls).has("16.11")).toBe(false);
  });

  it("positive (U1): a blind column's front above a lower roof carries no kit piece, is no face, and passes", () => {
    const u1 = scanParty(L.mass, L.buildings).u1;
    expect(u1.length).toBeGreaterThan(0);
    for (const f of u1) {
      expect(colAt.get(keyOf(f.cell))!.kind).toBe("blind");
      expect(colAt.get(keyOf(f.cell))!.front).toBe(f.side);
      expect(walls.some((p) => isParty(p) && keyOf(p.cell) === keyOf(f.cell) && p.face === f.side)).toBe(false);
      expect(faces.some((g) => keyOf(g.cell) === keyOf(f.cell) && g.side === f.side)).toBe(false);
    }
    expect(failuresOf(walls)).toEqual([]);
  });
});
