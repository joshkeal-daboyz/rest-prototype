/**
 * Stage 12, section E2: what the hold-out reads of the plan before it, gathered once: the districts, the cells' blocks, the buildings' cells, the obstacles on the ground, and the places a held district can use
 * (courts, parks, plazas and front lots, parking bays, pavement cells, roof decks, street mouths). Pure; imports `src/core/` and the pipeline's helpers only. Reads no `bi`, `bj` or street `line`.
 *
 * The plan it reads is the plan at the era before the pass (`resolveBefore`: the clean city, and the tech era's pieces once D1 merges). A change a pass lists is a reference into the CLEAN lists as their stages
 * wrote them (the resolver's contract), so each piece it may remove keeps its index in the clean list (`cleanIndex`).
 */

import type {
  CityBuildingsLayer,
  CityCell,
  CityDistrict,
  CityEdgeLayer,
  CityFacadesLayer,
  CityGroundLayer,
  CityGroundProp,
  CityLandLayer,
  CityMassCell,
  CityMassLayer,
  CityPlan,
  CityResolvedPlan,
  CitySide,
  CityStreetsLayer,
  CityTrafficLayer,
  CityTrafficPiece,
} from "../../core";
import { CityStageError } from "../pipeline/error";
import type { CircuitPoints } from "../pipeline/readable";
import { CELL_M, ROOF_DECK_M, ROOF_EDGE_M } from "./constants";
import { CLEAN_ROOF_BOUNDS, CODE_ESCAPE_D_M, CODE_ESCAPE_KEY, CODE_ESCAPE_W_M, FACADE_BOUNDS, PARTY_BOUNDS } from "./kit";
import { cellKey, grow, rectAt, RectIndex, turned, type Rect } from "./geom";

/** A piece standing on the ground: its footprint, its base and its top. */
export interface Obstacle {
  readonly rect: Rect;
  readonly base: number;
  readonly top: number;
  /** The traffic piece it is, or null: a barricade removes the traffic pieces under it and keeps clear of every other obstacle. */
  readonly piece: CityTrafficPiece | null;
}

/** A stage 7 piece in plan, with the heights it fills. */
export interface FacadeBox {
  readonly rect: Rect;
  readonly base: number;
  readonly top: number;
  /** A party-wall piece (on a wall above the lower roof across it, never over a street): only a roof item keeps clear of it. */
  readonly party: boolean;
}

/** A point turned by a quarter yaw, as the tech pass's `rotate`. */
function rotateQuarter(yaw: number, x: number, z: number): readonly [number, number] {
  const q = ((Math.round(yaw / 90) % 4) + 4) % 4;
  const n = (v: number): number => (v === 0 ? 0 : v);
  return q === 0 ? [n(x), n(z)] : q === 1 ? [n(z), n(-x)] : q === 2 ? [n(-x), n(-z)] : [n(-z), n(x)];
}

/** A court (a block part of shape "court"): the cells a camp or water tower may use. */
export interface Court {
  readonly id: string;
  readonly block: string;
  /** Its apron, lawn and path cells. */
  readonly cells: readonly CityCell[];
}

/** A park: the block, the opening id its props are hosted by, and its green interior (the cells inside the pavement edge). */
export interface Park {
  readonly id: string;
  readonly block: string;
  readonly cells: readonly CityCell[];
  /** The interior's rectangle, when its cells fill it; null when they do not. */
  readonly rect: Rect | null;
}

/** A plaza or a front lot: a 2 by 2 opening. */
export interface Square {
  readonly id: string;
  readonly kind: "plaza" | "frontLot";
  readonly block: string;
  readonly rect: Rect;
}

/** One parking bay: its centre, the unit direction along the street, and its extents along and across. */
export interface Bay {
  /** "court:<opening>:<n>" or "kerb:<n>"; stable plan data, used to key hashes. */
  readonly id: string;
  readonly block: string;
  readonly x: number;
  readonly z: number;
  /** True when the bays run along x (a container's long side then runs along z). */
  readonly alongX: boolean;
  readonly along: number;
  readonly across: number;
  /** The court's opening id for a court bay; null for a kerb bay. */
  readonly court: string | null;
}

/** A pavement cell fronting a block. */
export interface PavementCell {
  readonly i: number;
  readonly j: number;
  readonly block: string;
}

/** A column's roof deck. */
export interface Deck {
  readonly building: string;
  readonly block: string;
  readonly i: number;
  readonly j: number;
  /** The cell less `ROOF_EDGE_M` on every side. */
  readonly rect: Rect;
  /** The deck's surface: the roof piece's base plus `ROOF_DECK_M`. */
  readonly y: number;
  /** The footprints already on the deck: H3's roof pieces, and the tech era's roof pieces. */
  readonly taken: readonly Rect[];
}

/** A junction's square (its cells and the ring of crossings and corners round them) and which blocks front it. */
export interface JunctionRing {
  readonly id: string;
  readonly arms: readonly CitySide[];
  /** The junction cells' extent, in cells: i0 to i1 and j0 to j1, exclusive at the high end. */
  readonly i0: number;
  readonly i1: number;
  readonly j0: number;
  readonly j1: number;
}

export interface World {
  readonly w: number;
  readonly h: number;
  /** The clean plan (the lists the changes' references read). */
  readonly clean: CityPlan;
  readonly resolved: CityResolvedPlan;
  readonly streets: CityStreetsLayer;
  readonly districts: readonly CityDistrict[];
  readonly districtOfBlock: ReadonlyMap<string, CityDistrict>;
  readonly massAt: ReadonlyMap<number, CityMassCell>;
  readonly built: ReadonlySet<number>;
  /** The cells of every junction's square: clutter keeps out of them, so a barricade line never meets a settle piece. */
  readonly ring: ReadonlySet<number>;
  /** Pieces standing on the ground: the ground layer's props (flat ones left out), the traffic pieces, and the tech era's ground adds. */
  readonly obstacles: RectIndex<Obstacle>;
  /** Stage 7's facade pieces (non-glass dressing, walls with the escapes' ladder boxes, face novelty signs), each with its height range: a piece keeps 0.3 m clear of them in plan and height. */
  readonly facadeBoxes: RectIndex<FacadeBox>;
  readonly courts: readonly Court[];
  readonly parks: readonly Park[];
  readonly squares: readonly Square[];
  readonly bays: readonly Bay[];
  readonly pavement: readonly PavementCell[];
  readonly decks: readonly Deck[];
  readonly junctions: readonly JunctionRing[];
  /** The blocks that front each junction: those with a cell in the one-cell border round its square. */
  readonly junctionBlocks: ReadonlyMap<string, ReadonlySet<string>>;
  /** Ground props by their `host`, each with its index in the clean list. */
  readonly propsByHost: ReadonlyMap<string, readonly { readonly prop: CityGroundProp; readonly index: number; readonly rect: Rect }[]>;
  /** The traffic pieces of the plan before the pass, each with its index in the clean list. */
  readonly traffic: readonly { readonly piece: CityTrafficPiece; readonly index: number; readonly rect: Rect }[];
  readonly circuit: CircuitPoints;
}

const need = <T>(v: T | undefined, what: string): T => {
  if (v === undefined) throw new CityStageError(`holdout: the plan has no ${what} layer`);
  return v;
};

const GROUND_BASE_M = 2;

export function buildWorld(resolved: CityResolvedPlan, clean: CityPlan, districts: readonly CityDistrict[], circuit: CircuitPoints): World {
  const L = resolved.plan.layers;
  const streets: CityStreetsLayer = need(L.streets, "streets");
  const land: CityLandLayer = need(L.land, "land");
  const mass: CityMassLayer = need(L.mass, "mass");
  const edge: CityEdgeLayer = need(L.edge, "edge");
  const buildings: CityBuildingsLayer = need(L.buildings, "buildings");
  const facades: CityFacadesLayer = need(L.facades, "facades");
  const ground: CityGroundLayer = need(L.ground, "ground");
  const traffic: CityTrafficLayer = need(L.traffic, "traffic");
  const cleanGround = need(clean.layers.ground, "ground");
  const cleanTraffic = need(clean.layers.traffic, "traffic");

  const districtOfBlock = new Map<string, CityDistrict>();
  for (const d of districts) for (const b of d.blocks) districtOfBlock.set(b, d);

  const massAt = new Map<number, CityMassCell>();
  const built = new Set<number>();
  for (const c of mass.cells) {
    massAt.set(cellKey(c.i, c.j), c);
    if (c.use === "built") built.add(cellKey(c.i, c.j));
  }

  // ---- junction squares ----
  const ring = new Set<number>();
  const junctions: JunctionRing[] = streets.junctions.map((j) => {
    const is = j.cells.map((c) => c.i);
    const js = j.cells.map((c) => c.j);
    const i0 = Math.min(...is);
    const i1 = Math.max(...is) + 1;
    const j0 = Math.min(...js);
    const j1 = Math.max(...js) + 1;
    for (let q = j0 - 1; q <= j1; q++) for (let p = i0 - 1; p <= i1; p++) ring.add(cellKey(p, q));
    return { id: j.id, arms: j.arms, i0, i1, j0, j1 };
  });
  // The blocks that front a junction: those with a cell in the one-cell border round its square (the ring reading).
  const junctionBlocks = new Map<string, Set<string>>();
  for (const j of junctions) {
    const set = new Set<string>();
    for (let q = j.j0 - 2; q <= j.j1 + 1; q++) {
      for (let p = j.i0 - 2; p <= j.i1 + 1; p++) {
        if (ring.has(cellKey(p, q))) continue;
        const m = massAt.get(cellKey(p, q));
        if (m !== undefined) set.add(m.block);
      }
    }
    junctionBlocks.set(j.id, set);
  }

  // ---- ground obstacles, and the props and traffic pieces a change may remove ----
  const obstacles = new RectIndex<Obstacle>();
  const cleanPropIndex = new Map<object, number>();
  cleanGround.props.forEach((p, n) => cleanPropIndex.set(p, n));
  const cleanTrafficIndex = new Map<object, number>();
  cleanTraffic.pieces.forEach((p, n) => cleanTrafficIndex.set(p, n));

  const propsByHost = new Map<string, { prop: CityGroundProp; index: number; rect: Rect }[]>();
  for (const p of ground.props) {
    const rect = rectAt(p.placement.x_m, p.placement.z_m, p.size.x_m, p.size.z_m);
    const index = cleanPropIndex.get(p);
    if (index !== undefined) {
      const list = propsByHost.get(p.host);
      const entry = { prop: p, index, rect };
      if (list === undefined) propsByHost.set(p.host, [entry]);
      else list.push(entry);
    }
    if (!p.flat) obstacles.add(rect, { rect, base: p.placement.y_m, top: p.placement.y_m + p.size.h_m, piece: null });
  }
  const trafficList: { piece: CityTrafficPiece; index: number; rect: Rect }[] = [];
  for (const p of traffic.pieces) {
    const rect = rectAt(p.placement.x_m, p.placement.z_m, p.size.x_m, p.size.z_m);
    const index = cleanTrafficIndex.get(p);
    if (index !== undefined) trafficList.push({ piece: p, index, rect });
    obstacles.add(rect, { rect, base: p.placement.y_m, top: p.placement.y_m + p.size.h_m, piece: p });
  }
  for (const a of resolved.adds.tech ?? []) {
    if (a.placement.y_m >= GROUND_BASE_M) continue;
    const rect = rectAt(a.placement.x_m, a.placement.z_m, a.size.x_m, a.size.z_m);
    obstacles.add(rect, { rect, base: a.placement.y_m, top: a.placement.y_m + a.size.h_m, piece: null });
  }

  // ---- stage 7's facade pieces: dressing but glass, walls (escapes with their ladder boxes, canopies, air-conditioners, planters), face novelty signs ----
  const facadeBoxes = new RectIndex<FacadeBox>();
  const unknown = (key: string, what: string): never => {
    throw new CityStageError(`holdout: the ${what} key ${key} is not in the hold-out stage's copy of stage 7's bounds`);
  };
  const fbox = (x: number, z: number, w: number, d: number, yaw: number, y0: number, y1: number, party = false): void => {
    const t = turned(w, d, yaw);
    const rect = rectAt(x, z, t.x, t.z);
    facadeBoxes.add(rect, { rect, base: y0, top: y1, party });
  };
  for (const p of facades.dressing ?? []) {
    if (p.kind === "glass") continue;
    const b = FACADE_BOUNDS[p.placement.key] ?? unknown(p.placement.key, "dressing");
    fbox(p.placement.x_m, p.placement.z_m, b.w, b.d, p.placement.yaw_deg, p.placement.y_m, p.placement.y_m + b.h);
  }
  for (const p of facades.novelty ?? []) {
    const b = CLEAN_ROOF_BOUNDS[p.placement.key] ?? unknown(p.placement.key, "novelty");
    fbox(p.placement.x_m, p.placement.z_m, b.w, b.d, p.placement.yaw_deg, p.placement.y_m, p.placement.y_m + b.h);
  }
  for (const p of facades.walls ?? []) {
    const party = p.kind === "partyBoard" || p.kind === "partyPipe" || p.kind === "partyWindow";
    const pl = p.placement;
    if (pl.key === CODE_ESCAPE_KEY) {
      const top = Math.max(pl.y_m, ...p.boxes.map((bx) => pl.y_m + bx.y_m + bx.h_m / 2));
      fbox(pl.x_m, pl.z_m, CODE_ESCAPE_W_M, CODE_ESCAPE_D_M, pl.yaw_deg, pl.y_m, top);
      continue;
    }
    const b = (party ? (PARTY_BOUNDS[pl.key] ?? CLEAN_ROOF_BOUNDS[pl.key]) : FACADE_BOUNDS[pl.key]) ?? unknown(pl.key, "wall");
    fbox(pl.x_m, pl.z_m, b.w, b.d, pl.yaw_deg, pl.y_m, pl.y_m + b.h * p.scaleY, party);
    for (const bx of p.boxes) {
      const c = rotateQuarter(pl.yaw_deg, bx.x_m, bx.z_m);
      fbox(pl.x_m + c[0], pl.z_m + c[1], bx.w_m, bx.d_m, pl.yaw_deg, pl.y_m + bx.y_m - bx.h_m / 2, pl.y_m + bx.y_m + bx.h_m / 2, party);
    }
  }

  // ---- courts ----
  const COURT_USES = new Set(["apron", "green", "greenPath"]);
  const courtCells = new Map<string, CityCell[]>();
  for (const c of mass.cells) {
    if (c.part !== null && COURT_USES.has(c.use)) {
      const list = courtCells.get(c.part);
      if (list === undefined) courtCells.set(c.part, [{ i: c.i, j: c.j }]);
      else list.push({ i: c.i, j: c.j });
    }
  }
  const courts: Court[] = [];
  for (const part of land.parts) {
    if (part.shape !== "court") continue;
    const cells = courtCells.get(part.id);
    if (cells !== undefined && cells.length > 0) courts.push({ id: part.id, block: part.block, cells });
  }

  // ---- parks, plazas and front lots ----
  const parks: Park[] = [];
  const squares: Square[] = [];
  const parkCells = new Map<string, CityCell[]>();
  for (const c of mass.cells) {
    if (c.opening !== null && (c.use === "green" || c.use === "greenPath")) {
      const list = parkCells.get(c.opening);
      if (list === undefined) parkCells.set(c.opening, [{ i: c.i, j: c.j }]);
      else list.push({ i: c.i, j: c.j });
    }
  }
  for (const op of mass.openings) {
    if (op.kind === "park") {
      const cells = parkCells.get(op.id) ?? [];
      let rect: Rect | null = null;
      if (cells.length > 0) {
        const i0 = Math.min(...cells.map((c) => c.i));
        const i1 = Math.max(...cells.map((c) => c.i)) + 1;
        const j0 = Math.min(...cells.map((c) => c.j));
        const j1 = Math.max(...cells.map((c) => c.j)) + 1;
        if ((i1 - i0) * (j1 - j0) === cells.length) rect = { x0: i0 * CELL_M, x1: i1 * CELL_M, z0: j0 * CELL_M, z1: j1 * CELL_M };
      }
      parks.push({ id: op.id, block: op.block, cells, rect });
    } else if (op.kind === "plaza" || op.kind === "frontLot") {
      const is = op.cells.map((c) => c.i);
      const js = op.cells.map((c) => c.j);
      squares.push({ id: op.id, kind: op.kind, block: op.block, rect: { x0: Math.min(...is) * CELL_M, x1: (Math.max(...is) + 1) * CELL_M, z0: Math.min(...js) * CELL_M, z1: (Math.max(...js) + 1) * CELL_M } });
    }
  }

  // ---- bays: court stalls (parking tiles of two cells, three bays each) and kerb bays ----
  const bays: Bay[] = [];
  const tileBays = (idBase: string, block: string, court: string | null, cx: number, cz: number, alongX: boolean, n0: number): void => {
    const step = (2 * CELL_M) / 3;
    for (let k = 0; k < 3; k++) {
      const o = (k - 1) * step;
      bays.push({ id: `${idBase}:${n0 + k}`, block, x: alongX ? cx + o : cx, z: alongX ? cz : cz + o, alongX, along: step, across: CELL_M, court });
    }
  };
  for (const court of mass.courts) {
    const lot = ground.props.filter((p) => p.host === court.opening && p.kind === "lotLines");
    let n = 0;
    if (lot.length > 0) {
      for (const p of lot) {
        tileBays(`court:${court.opening}`, court.block, court.opening, p.placement.x_m, p.placement.z_m, p.size.x_m > p.size.z_m, n);
        n += 3;
      }
      continue;
    }
    const used = new Set<number>();
    court.stallCells.forEach((a, ai) => {
      if (used.has(ai)) return;
      const bi = court.stallCells.findIndex((b, k) => k !== ai && !used.has(k) && Math.abs(a.i - b.i) + Math.abs(a.j - b.j) === 1);
      if (bi < 0) return;
      used.add(ai);
      used.add(bi);
      const b = court.stallCells[bi]!;
      tileBays(`court:${court.opening}`, court.block, court.opening, ((a.i + b.i) / 2 + 0.5) * CELL_M, ((a.j + b.j) / 2 + 0.5) * CELL_M, a.j === b.j, n);
      n += 3;
    });
  }
  const axisOf = new Map(streets.streets.map((s) => [s.id, s.axis] as const));
  edge.bays.forEach((b, n) => {
    bays.push({ id: `kerb:${n}`, block: b.block, x: b.x_m, z: b.z_m, alongX: axisOf.get(b.street) === "x", along: b.w_m, across: b.d_m, court: null });
  });

  // ---- pavement cells fronting a block ----
  const pavement: PavementCell[] = [];
  const NEIGHBOURS: readonly (readonly [number, number])[] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const c of edge.cells) {
    if (c.role !== "pavement") continue;
    if (ring.has(cellKey(c.i, c.j))) continue;
    for (const [di, dj] of NEIGHBOURS) {
      const m = massAt.get(cellKey(c.i + di, c.j + dj));
      if (m !== undefined) {
        pavement.push({ i: c.i, j: c.j, block: m.block });
        break;
      }
    }
  }

  // ---- roof decks ----
  const buildingBlock = new Map(buildings.buildings.map((b) => [b.id, b.block] as const));
  const roofsAt = new Map<number, Rect[]>();
  for (const r of facades.roofs ?? []) {
    const bounds = CLEAN_ROOF_BOUNDS[r.placement.key];
    if (bounds === undefined) continue;
    const t = turned(bounds.w, bounds.d, r.placement.yaw_deg);
    const list = roofsAt.get(cellKey(r.cell.i, r.cell.j));
    const rect = rectAt(r.placement.x_m, r.placement.z_m, t.x, t.z);
    if (list === undefined) roofsAt.set(cellKey(r.cell.i, r.cell.j), [rect]);
    else list.push(rect);
  }
  const decks: Deck[] = [];
  for (const col of buildings.columns ?? []) {
    const roof = col.pieces.find((p) => p.role === "roof");
    const block = buildingBlock.get(col.building);
    if (roof === undefined || block === undefined) continue;
    const y = roof.placement.y_m + ROOF_DECK_M;
    const taken = [...(roofsAt.get(cellKey(col.i, col.j)) ?? [])];
    for (const a of resolved.adds.tech ?? []) {
      if (a.cell.i === col.i && a.cell.j === col.j && a.placement.y_m >= y - 0.01) taken.push(rectAt(a.placement.x_m, a.placement.z_m, a.size.x_m, a.size.z_m));
    }
    decks.push({
      building: col.building,
      block,
      i: col.i,
      j: col.j,
      rect: { x0: col.i * CELL_M + ROOF_EDGE_M, x1: (col.i + 1) * CELL_M - ROOF_EDGE_M, z0: col.j * CELL_M + ROOF_EDGE_M, z1: (col.j + 1) * CELL_M - ROOF_EDGE_M },
      y,
      taken,
    });
  }

  return {
    w: streets.w,
    h: streets.h,
    clean,
    resolved,
    streets,
    districts,
    districtOfBlock,
    massAt,
    built,
    ring,
    obstacles,
    facadeBoxes,
    courts,
    parks,
    squares,
    bays,
    pavement,
    decks,
    junctions,
    junctionBlocks,
    propsByHost,
    traffic: trafficList,
    circuit,
  };
}

/** True when a rectangle (grown by `m`) meets a building cell. */
export function meetsBuilding(world: World, r: Rect, m: number): boolean {
  const g = grow(r, m);
  const i0 = Math.floor(g.x0 / CELL_M);
  const i1 = Math.floor((g.x1 - 1e-9) / CELL_M);
  const j0 = Math.floor(g.z0 / CELL_M);
  const j1 = Math.floor((g.z1 - 1e-9) / CELL_M);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (world.built.has(cellKey(i, j))) return true;
  return false;
}

/** True when a piece over [`y0`, `y1`) in plan `r` comes within `gap` of a stage 7 facade piece, in plan and in height. */
export function meetsFacade(world: World, r: Rect, y0: number, y1: number, gap: number, roof = false): boolean {
  for (const hit of world.facadeBoxes.query(grow(r, gap))) if ((roof || !hit.tag.party) && hit.tag.base < y1 + gap && hit.tag.top > y0 - gap) return true;
  return false;
}
