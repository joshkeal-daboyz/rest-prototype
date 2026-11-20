/**
 * Stage 2's planner: which blocks take an alley or a park (moved from `planBlocks` in `src/render3d/tilecity.ts`, re-keyed on the stage's `rand`), where a lane cuts, and the parts a block is laid in
 * (moved from `tileCity`'s parts loop). Grammar rule 4 is the one change in the moving: every part has a short side of exactly `STRIP_CELLS` or `COURT_PART_MIN_CELLS` and more. Pure.
 */

import type { CityBlock, CityLane, CityLandBlock, CityPark, CityPart, CityPartEdge, CitySide, CityTreatment } from "../../core";
import { CityStageError } from "../pipeline/error";
import type { StageRand } from "../pipeline/seeds";
import { ALLEY_CELLS, ALLEY_ONE_IN_BLOCKS, ALLEY_SIDE_LONG_M, ALLEY_SIDE_MIN_CELLS, COURT_LONG_MIN_CELLS, COURT_PART_MIN_CELLS, PARK_HALF_SIDE_MIN_CELLS, PARK_ONE_IN_BLOCKS, STRIP_CELLS, TILE_M } from "./constants";

export type ParkKind = "whole" | "half";

export interface BlockPlan {
  /** The blocks an alley splits. */
  readonly alleys: ReadonlySet<string>;
  /** The blocks a park takes whole or by half. */
  readonly parks: ReadonlyMap<string, ParkKind>;
}

type PlanBlock = Pick<CityBlock, "id" | "type" | "i0" | "i1" | "j0" | "j1">;
const wOf = (b: PlanBlock): number => b.i1 - b.i0;
const dOf = (b: PlanBlock): number => b.j1 - b.j0;
const longOf = (b: PlanBlock): number => Math.max(wOf(b), dOf(b));
const shortOf = (b: PlanBlock): number => Math.min(wOf(b), dOf(b));

/** A side length, in cells, a part may have across a cut: 2 (a strip) or `COURT_PART_MIN_CELLS` and more (rule 4). */
export const partSideOk = (cells: number): boolean => cells === STRIP_CELLS || cells >= COURT_PART_MIN_CELLS;

/** A court part (short side `COURT_PART_MIN_CELLS` or more) `depth` cells from a lane, across a block side of `across`, needs a long side of `COURT_LONG_MIN_CELLS` or more so a drive fits (B2). A strip is judged as in B. */
export const courtPartRoomy = (depth: number, across: number): boolean => Math.min(depth, across) < COURT_PART_MIN_CELLS || Math.max(depth, across) >= COURT_LONG_MIN_CELLS;

/** The built part a half park leaves is the short side less its half (rounded down); it must be a court part. */
const halfParkLeaves = (short: number): number => short - Math.floor(short / 2);

/**
 * Which blocks get an alley and which a park (19.6), from the blocks' own types and sides and the seed, so one size and seed give one city. Moved from `planBlocks`, with the one change rule 4 asks for:
 * a block takes a half park only where the built part it leaves has a short side of `COURT_PART_MIN_CELLS` or more. (Every side of 9 cells or more can be cut into parts of 2 and 6 or more, so an alley
 * block always finds a place for its lane.) Parks first, at least one per `PARK_ONE_IN_BLOCKS` blocks: small blocks (whole-block parks) by hash, then large blocks with a short side of at least
 * `PARK_HALF_SIDE_MIN_CELLS` (half-block parks) by hash, those with no claim to an alley first. Then alleys: every long block, and every block with a side of `ALLEY_SIDE_LONG_M` or more, that no park has
 * taken; and where that leaves fewer than one per `ALLEY_ONE_IN_BLOCKS` blocks, the longest of the others (a side of at least `ALLEY_SIDE_MIN_CELLS`) in id order. A block never has both.
 */
export function planBlocks(blocks: readonly PlanBlock[], rand: StageRand): BlockPlan {
  const n = blocks.length;
  const byId = (p: PlanBlock, q: PlanBlock): number => (p.id < q.id ? -1 : p.id > q.id ? 1 : 0);
  const byHash = (kind: string) => (p: PlanBlock, q: PlanBlock): number => rand(kind, p.id) - rand(kind, q.id) || byId(p, q);
  // B2: a block with no lane place (every court part its lane leaves is at least COURT_LONG_MIN_CELLS long) takes no alley.
  const hasPlace = (b: PlanBlock): boolean => lanePositions(longOf(b), shortOf(b)).length > 0;
  const claimsAlley = (b: PlanBlock): boolean => hasPlace(b) && longOf(b) >= ALLEY_SIDE_MIN_CELLS && (b.type === "long" || longOf(b) * TILE_M >= ALLEY_SIDE_LONG_M);
  const parks = new Map<string, ParkKind>();
  const parkQuota = Math.ceil(n / PARK_ONE_IN_BLOCKS);
  const smalls = blocks.filter((b) => b.type === "small").sort(byHash("park"));
  const larges = blocks.filter((b) => b.type === "large" && shortOf(b) >= PARK_HALF_SIDE_MIN_CELLS && halfParkLeaves(shortOf(b)) >= COURT_PART_MIN_CELLS);
  const largeOrder = [...larges.filter((b) => !claimsAlley(b)).sort(byHash("park")), ...larges.filter(claimsAlley).sort(byHash("park"))];
  for (const b of smalls) if (parks.size < parkQuota) parks.set(b.id, "whole");
  for (const b of largeOrder) if (parks.size < parkQuota) parks.set(b.id, "half");
  const alleys = new Set<string>();
  for (const b of blocks) if (!parks.has(b.id) && claimsAlley(b)) alleys.add(b.id);
  const alleyQuota = Math.ceil(n / ALLEY_ONE_IN_BLOCKS);
  const rest = blocks.filter((b) => !parks.has(b.id) && !alleys.has(b.id) && longOf(b) >= ALLEY_SIDE_MIN_CELLS && hasPlace(b)).sort((p, q) => longOf(q) - longOf(p) || byId(p, q));
  for (const b of rest) if (alleys.size < alleyQuota) alleys.add(b.id);
  return { alleys, parks };
}

/**
 * Where a lane may cut a side of `len` cells: the number of cells before it, such that both parts it leaves (`before` and `len - ALLEY_CELLS - before`) are a strip's or a court part's side.
 * A 9-cell side gives 2 and 6, or 6 and 2. Empty where the side is too short.
 */
export function lanePositions(len: number, across: number): number[] {
  const out: number[] = [];
  for (let before = 0; before <= len - ALLEY_CELLS; before++) {
    const after = len - ALLEY_CELLS - before;
    if (partSideOk(before) && partSideOk(after) && courtPartRoomy(before, across) && courtPartRoomy(after, across)) out.push(before);
  }
  return out;
}

const SIDE_OF_NUMBER: readonly CitySide[] = ["-z", "+x", "+z", "-x"];

/** What each block is given, its parts, lanes and parks. Order follows `blocks`. */
export interface LandPlan {
  readonly blocks: CityLandBlock[];
  readonly parts: CityPart[];
  readonly lanes: CityLane[];
  readonly parks: CityPark[];
}

const shapeOf = (a: number, b: number): CityPart["shape"] => (Math.min(a, b) === STRIP_CELLS ? "strip" : "court");

function mkPart(id: string, b: PlanBlock, r: Pick<CityPart, "i0" | "i1" | "j0" | "j1">, edges: Partial<Record<CitySide, CityPartEdge>>): CityPart {
  return {
    id,
    block: b.id,
    i0: r.i0,
    i1: r.i1,
    j0: r.j0,
    j1: r.j1,
    shape: shapeOf(r.i1 - r.i0, r.j1 - r.j0),
    edges: { "+x": edges["+x"] ?? "street", "-x": edges["-x"] ?? "street", "+z": edges["+z"] ?? "street", "-z": edges["-z"] ?? "street" },
  };
}

/** Lays every block: its treatment, and the parts, lane and park it gives. Moved from `tileCity`'s parts loop, re-keyed on `rand`. */
export function planLand(blocks: readonly CityBlock[], rand: StageRand): LandPlan {
  const plan = planBlocks(blocks, rand);
  const out: LandPlan = { blocks: [], parts: [], lanes: [], parks: [] };
  for (const b of blocks) {
    const w = wOf(b);
    const d = dOf(b);
    const kind = plan.parks.get(b.id);
    let treatment: CityTreatment = "court";
    const options = lanePositions(Math.max(w, d), Math.min(w, d));
    if (kind === "whole") {
      treatment = "parkWhole";
      out.parks.push({ block: b.id, kind, i0: b.i0, i1: b.i1, j0: b.j0, j1: b.j1, side: null });
    } else if (kind === "half") {
      treatment = "parkHalf";
      // The park takes the half along one long side (the short side halved, rounded down); the built half is the rest and fronts the park's pavement edge.
      const hash = rand("parkside", b.id) % 2;
      if (w >= d) {
        const pd = Math.floor(d / 2);
        const side = hash === 0 ? 0 : 2;
        out.parks.push({ block: b.id, kind, i0: b.i0, i1: b.i1, j0: side === 0 ? b.j0 : b.j1 - pd, j1: side === 0 ? b.j0 + pd : b.j1, side: SIDE_OF_NUMBER[side]! });
        out.parts.push(mkPart(`${b.id}/built`, b, { i0: b.i0, i1: b.i1, j0: side === 0 ? b.j0 + pd : b.j0, j1: side === 0 ? b.j1 : b.j1 - pd }, { [side === 0 ? "-z" : "+z"]: "park" }));
      } else {
        const pd = Math.floor(w / 2);
        const side = hash === 0 ? 3 : 1;
        out.parks.push({ block: b.id, kind, i0: side === 3 ? b.i0 : b.i1 - pd, i1: side === 3 ? b.i0 + pd : b.i1, j0: b.j0, j1: b.j1, side: SIDE_OF_NUMBER[side]! });
        out.parts.push(mkPart(`${b.id}/built`, b, { i0: side === 3 ? b.i0 + pd : b.i0, i1: side === 3 ? b.i1 : b.i1 - pd, j0: b.j0, j1: b.j1 }, { [side === 3 ? "-x" : "+x"]: "park" }));
      }
    } else if (plan.alleys.has(b.id)) {
      if (options.length === 0) throw new CityStageError(`M4a: block ${b.id} is chosen for an alley but no lane place leaves parts of 2 or 6 and more with every court part 8 long or more (side ${Math.max(w, d)} cells)`, [{ i: b.i0, j: b.j0 }]);
      treatment = "alley";
      // The lane runs across the short side, at a place along the long one that leaves parts of 2 or 6 and more, by hash; a square block's runs along z.
      const before = options[rand("lane", b.id) % options.length]!;
      if (w >= d) {
        const at = b.i0 + before;
        out.lanes.push({ block: b.id, axis: "z", at });
        out.parts.push(mkPart(`${b.id}/a`, b, { i0: b.i0, i1: at, j0: b.j0, j1: b.j1 }, { "+x": "lane" }), mkPart(`${b.id}/b`, b, { i0: at + ALLEY_CELLS, i1: b.i1, j0: b.j0, j1: b.j1 }, { "-x": "lane" }));
      } else {
        const at = b.j0 + before;
        out.lanes.push({ block: b.id, axis: "x", at });
        out.parts.push(mkPart(`${b.id}/a`, b, { i0: b.i0, i1: b.i1, j0: b.j0, j1: at }, { "+z": "lane" }), mkPart(`${b.id}/b`, b, { i0: b.i0, i1: b.i1, j0: at + ALLEY_CELLS, j1: b.j1 }, { "-z": "lane" }));
      }
    } else {
      out.parts.push(mkPart(b.id, b, b, {}));
    }
    out.blocks.push({ block: b.id, biome: "town", treatment });
  }
  return out;
}
