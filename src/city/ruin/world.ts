/**
 * Stage 13, section F1: what the ruin's growth reads of the plan before it, gathered once: the districts, the soil, the cells growth may cross, the standing pieces, the parks, the roof decks, and the slots
 * the vines hang from (roof edges, awnings and canopies, posts, trees). Pure; imports `src/core/` and the pipeline's helpers only. Reads no `bi`, `bj` or street `line`.
 *
 * The plan it reads is the plan at the era before the pass (`resolveBefore`: the clean city, the tech era's pieces and the hold-out's). Soil, cells and slots come from the plan; the circuit is the caller's.
 */

import type {
  CityCell,
  CityDistrict,
  CityEraPiece,
  CityResolvedPlan,
  CitySide,
  CityStreetsLayer,
} from "../../core";
import { CityStageError } from "../pipeline/error";
import type { CalibrationKey } from "../../core";
import { CELL_M, ROOF_DECK_M, ROOF_EDGE_M } from "./constants";
import { cellKey, rectAt, RectIndex, turned, type Rect } from "./geom";
import { CLEAN_ROOF_BOUNDS, CODE_ESCAPE_D_M, CODE_ESCAPE_KEY, CODE_ESCAPE_W_M, FACADE_BOUNDS, HOST_BOUNDS } from "./kit";
import type { SoilSource } from "./spread";
import type { Standing } from "./walk";

/** What a street or open cell is, for what grows on it. */
export type CellClass = "lane" | "parking" | "junction" | "crossing" | "pavement" | "open";

/** A piece standing: its footprint, its base and its top. */
export interface Obstacle {
  readonly rect: Rect;
  readonly base: number;
  readonly top: number;
  /** A facade piece's own place ("<x*10>,<z*10>", rounded): the awning or canopy a vine on it may ignore. */
  readonly at?: string;
}

/** A park: its district, and the cells of its green interior. */
export interface Park {
  readonly id: string;
  readonly block: string;
  readonly district: string;
  readonly wild: number;
  readonly cells: ReadonlySet<number>;
}

/** A column's roof deck. */
export interface Deck {
  readonly building: string;
  readonly district: string;
  readonly wild: number;
  readonly i: number;
  readonly j: number;
  /** The cell less `ROOF_EDGE_M` on every side. */
  readonly rect: Rect;
  /** The deck's surface: the roof piece's base plus `ROOF_DECK_M`. */
  readonly y: number;
  /** The footprints already on the deck: H3's roof pieces and the earlier passes' roof pieces. */
  readonly taken: readonly Rect[];
}

/** A roof-edge slot: a built cell's open face (street or court) a vine may hang from. */
export interface FaceSlot {
  /** "<i>,<j>,<side>". */
  readonly id: string;
  readonly cell: CityCell;
  readonly side: CitySide;
  readonly district: string;
  readonly wild: number;
  /** The roof piece's base: the top of the wall the vine hangs from. */
  readonly roofY: number;
  /** A fire escape stands on this face, or a face novelty sign does. */
  readonly escape: boolean;
  readonly novelty: boolean;
}

/** An awning or a door canopy a vine may drape over: the host piece's plan rectangle and top, on a face. */
export interface HostSlot {
  /** "awning:<i>,<j>,<side>" or "canopy:...". */
  readonly id: string;
  readonly cell: CityCell;
  readonly side: CitySide;
  readonly district: string;
  readonly wild: number;
  /** The host's centre in plan, its extent after the turn, and its top. */
  readonly x: number;
  readonly z: number;
  readonly size: { readonly x_m: number; readonly z_m: number };
  readonly top: number;
  /** A fascia or blade sign on its building's cell: no vine. */
  readonly signed: boolean;
}

/** A traffic post (a signal mast, a stop sign or a parking sign) a post vine may wrap. */
export interface PostSlot {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly district: string;
  readonly wild: number;
}

/** A tree already standing (a clean ground tree) a tree-vine may hang from. */
export interface TreeSlot {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  /** Its crown's radius and its height. */
  readonly radius: number;
  readonly h: number;
  readonly district: string;
  readonly wild: number;
}

export interface World {
  readonly w: number;
  readonly h: number;
  readonly resolved: CityResolvedPlan;
  readonly streets: CityStreetsLayer;
  readonly districts: readonly CityDistrict[];
  readonly districtById: ReadonlyMap<string, CityDistrict>;
  readonly built: ReadonlySet<number>;
  /** The class of every street cell and every open block cell; a building cell is not in it. */
  readonly classOf: ReadonlyMap<number, CellClass>;
  readonly soil: readonly SoilSource[];
  readonly soilKeys: ReadonlySet<number>;
  /** The first mass cell on a side of a pavement cell, building first, as `[di, dj]`; used for the wall line. */
  readonly wallDir: (i: number, j: number) => readonly [number, number] | null;
  readonly obstacles: RectIndex<Obstacle>;
  readonly parks: readonly Park[];
  readonly decks: readonly Deck[];
  readonly faces: readonly FaceSlot[];
  readonly hosts: readonly HostSlot[];
  readonly posts: readonly PostSlot[];
  readonly trees: readonly TreeSlot[];
  /** Every piece standing on the ground in the plan before the pass, for the walk (T-2). */
  readonly standing: readonly Standing[];
}

const need = <T>(v: T | undefined, what: string): T => {
  if (v === undefined) throw new CityStageError(`ruin: the plan has no ${what} layer`);
  return v;
};

/** A point turned by a quarter yaw, as the tech pass's `rotate`. */
function rotateQuarter(yaw: number, x: number, z: number): readonly [number, number] {
  const q = ((Math.round(yaw / 90) % 4) + 4) % 4;
  const n = (v: number): number => (v === 0 ? 0 : v);
  return q === 0 ? [n(x), n(z)] : q === 1 ? [n(z), n(-x)] : q === 2 ? [n(-x), n(-z)] : [n(-z), n(x)];
}

const SIDE_DIR: Readonly<Record<CitySide, readonly [number, number]>> = { "+x": [1, 0], "-x": [-1, 0], "+z": [0, 1], "-z": [0, -1] };
export const sideDir = (s: CitySide): readonly [number, number] => SIDE_DIR[s];

export function buildWorld(resolved: CityResolvedPlan, districts: readonly CityDistrict[]): World {
  const L = resolved.plan.layers;
  const streets = need(L.streets, "streets");
  const mass = need(L.mass, "mass");
  const edge = need(L.edge, "edge");
  const buildings = need(L.buildings, "buildings");
  const facades = need(L.facades, "facades");
  const ground = need(L.ground, "ground");
  const traffic = need(L.traffic, "traffic");

  const districtById = new Map(districts.map((d) => [d.id, d] as const));
  const districtOfBlock = new Map<string, CityDistrict>();
  for (const d of districts) for (const b of d.blocks) districtOfBlock.set(b, d);

  // nearest block to a cell, for a cell no block owns (a street cell, a traffic post)
  const nearCache = new Map<number, CityDistrict | undefined>();
  const districtNear = (i: number, j: number): CityDistrict | undefined => {
    const k = cellKey(i, j);
    if (nearCache.has(k)) return nearCache.get(k);
    let best = Infinity;
    let block: string | undefined;
    for (const b of streets.blocks) {
      const d = Math.max(Math.max(b.i0 - i, 0, i - (b.i1 - 1)), Math.max(b.j0 - j, 0, j - (b.j1 - 1)));
      if (d < best) {
        best = d;
        block = b.id;
      }
    }
    const r = block === undefined ? undefined : districtOfBlock.get(block);
    nearCache.set(k, r);
    return r;
  };
  const districtOfCell = (i: number, j: number, block?: string): CityDistrict | undefined => (block !== undefined ? districtOfBlock.get(block) : undefined) ?? districtNear(i, j);

  // ---- cells ----
  const massAt = new Map<number, (typeof mass.cells)[number]>();
  const built = new Set<number>();
  for (const c of mass.cells) {
    massAt.set(cellKey(c.i, c.j), c);
    if (c.use === "built") built.add(cellKey(c.i, c.j));
  }
  const classOf = new Map<number, CellClass>();
  for (const c of edge.cells) {
    const cls: CellClass =
      c.role === "lane" ? "lane" : c.role === "junction" ? "junction" : c.role === "crossing" ? "crossing" : c.role === "pavement" || c.role === "pavementCorner" || c.role === "kerbCut" ? "pavement" : "parking";
    classOf.set(cellKey(c.i, c.j), cls);
  }
  for (const c of mass.cells) if (c.use !== "built") classOf.set(cellKey(c.i, c.j), "open");

  const DIRS: readonly (readonly [number, number])[] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const wallDir = (i: number, j: number): readonly [number, number] | null => {
    let open: readonly [number, number] | null = null;
    for (const [di, dj] of DIRS) {
      const m = massAt.get(cellKey(i + di, j + dj));
      if (m === undefined) continue;
      if (m.use === "built") return [di, dj];
      if (open === null) open = [di, dj];
    }
    return open;
  };

  // ---- soil ----
  const soil: SoilSource[] = [];
  const soilKeys = new Set<number>();
  const addSoil = (i: number, j: number, d: CityDistrict | undefined): void => {
    const k = cellKey(i, j);
    if (soilKeys.has(k) || d === undefined) return;
    soilKeys.add(k);
    soil.push({ i, j, district: d.id, wild: d.wild });
  };
  for (const c of mass.cells) if (c.use === "green") addSoil(c.i, c.j, districtOfBlock.get(c.block));
  const edgeAt = new Map(edge.cells.map((c) => [cellKey(c.i, c.j), c] as const));
  for (const t of edge.buildoutTrees) {
    const faces = edgeAt.get(cellKey(t.cell.i, t.cell.j))?.faces ?? undefined;
    addSoil(t.cell.i, t.cell.j, districtOfCell(t.cell.i, t.cell.j, faces));
  }
  for (const p of ground.props) {
    if (p.kind === "tree" || p.kind === "planter" || p.kind === "potPlant") addSoil(p.cell.i, p.cell.j, districtOfCell(p.cell.i, p.cell.j, p.block));
  }

  // ---- standing pieces ----
  const obstacles = new RectIndex<Obstacle>();
  const standing: Standing[] = [];
  for (const p of ground.props) {
    standing.push(p);
    if (p.flat) continue;
    const rect = rectAt(p.placement.x_m, p.placement.z_m, p.size.x_m, p.size.z_m);
    obstacles.add(rect, { rect, base: p.placement.y_m, top: p.placement.y_m + p.size.h_m });
  }
  for (const p of traffic.pieces) {
    standing.push(p);
    const rect = rectAt(p.placement.x_m, p.placement.z_m, p.size.x_m, p.size.z_m);
    obstacles.add(rect, { rect, base: p.placement.y_m, top: p.placement.y_m + p.size.h_m });
  }
  const eras: readonly (readonly CityEraPiece[])[] = [resolved.adds.tech ?? [], resolved.adds.holdout ?? []];
  for (const list of eras) {
    for (const a of list) {
      standing.push(a);
      const rect = rectAt(a.placement.x_m, a.placement.z_m, a.size.x_m, a.size.z_m);
      obstacles.add(rect, { rect, base: a.placement.y_m, top: a.placement.y_m + a.size.h_m });
    }
  }

  // ---- stage 7's pieces: dressing but glass, walls (escapes with their ladder boxes, canopies, air-conditioners, planters), face novelty signs ----
  const unknown = (key: CalibrationKey, what: string): never => {
    throw new CityStageError(`R-6: the ${what} key ${key} is not in the ruin stage's copy of stage 7's bounds`);
  };
  const box = (x: number, z: number, w: number, d: number, yaw: number, y0: number, y1: number, at?: string): void => {
    const t = turned(w, d, yaw);
    const rect = rectAt(x, z, t.x, t.z);
    obstacles.add(rect, at === undefined ? { rect, base: y0, top: y1 } : { rect, base: y0, top: y1, at });
  };
  const spot = (x: number, z: number): string => `${Math.round(x * 10)},${Math.round(z * 10)}`;
  for (const p of facades.dressing ?? []) {
    if (p.kind === "glass") continue;
    const b = FACADE_BOUNDS[p.placement.key] ?? unknown(p.placement.key, "dressing");
    box(p.placement.x_m, p.placement.z_m, b.w, b.d, p.placement.yaw_deg, p.placement.y_m, p.placement.y_m + b.h, spot(p.placement.x_m, p.placement.z_m));
  }
  for (const p of facades.novelty ?? []) {
    const b = CLEAN_ROOF_BOUNDS[p.placement.key] ?? unknown(p.placement.key, "novelty");
    box(p.placement.x_m, p.placement.z_m, b.w, b.d, p.placement.yaw_deg, p.placement.y_m, p.placement.y_m + b.h);
  }
  for (const p of facades.walls ?? []) {
    if (p.kind === "partyBoard" || p.kind === "partyPipe" || p.kind === "partyWindow") continue; // on a wall above the lower roof across it, never over a street
    const pl = p.placement;
    if (pl.key === CODE_ESCAPE_KEY) {
      const top = Math.max(pl.y_m, ...p.boxes.map((bx) => pl.y_m + bx.y_m + bx.h_m / 2));
      box(pl.x_m, pl.z_m, CODE_ESCAPE_W_M, CODE_ESCAPE_D_M, pl.yaw_deg, pl.y_m, top);
      continue;
    }
    const b = FACADE_BOUNDS[pl.key] ?? unknown(pl.key, "wall");
    box(pl.x_m, pl.z_m, b.w, b.d, pl.yaw_deg, pl.y_m, pl.y_m + b.h * p.scaleY, spot(pl.x_m, pl.z_m));
    for (const bx of p.boxes) {
      const c = rotateQuarter(pl.yaw_deg, bx.x_m, bx.z_m);
      box(pl.x_m + c[0], pl.z_m + c[1], bx.w_m, bx.d_m, pl.yaw_deg, pl.y_m + bx.y_m - bx.h_m / 2, pl.y_m + bx.y_m + bx.h_m / 2);
    }
  }

  // ---- parks ----
  const parkCells = new Map<string, number[]>();
  for (const c of mass.cells) {
    if (c.opening !== null && (c.use === "green" || c.use === "greenPath")) {
      const list = parkCells.get(c.opening);
      if (list === undefined) parkCells.set(c.opening, [cellKey(c.i, c.j)]);
      else list.push(cellKey(c.i, c.j));
    }
  }
  const parks: Park[] = [];
  for (const op of mass.openings) {
    if (op.kind !== "park") continue;
    const cells = parkCells.get(op.id);
    const d = districtOfBlock.get(op.block);
    if (cells === undefined || cells.length === 0 || d === undefined) continue;
    parks.push({ id: op.id, block: op.block, district: d.id, wild: d.wild, cells: new Set(cells) });
  }

  // ---- roof decks ----
  const buildingBlock = new Map(buildings.buildings.map((b) => [b.id, b.block] as const));
  const roofsAt = new Map<number, Rect[]>();
  for (const r of facades.roofs ?? []) {
    const b = CLEAN_ROOF_BOUNDS[r.placement.key];
    if (b === undefined) throw new CityStageError(`R-6: the roof key ${r.placement.key} is not in the ruin stage's copy of stage 7's roof bounds`);
    const t = turned(b.w, b.d, r.placement.yaw_deg);
    const k = cellKey(r.cell.i, r.cell.j);
    const rect = rectAt(r.placement.x_m, r.placement.z_m, t.x, t.z);
    const list = roofsAt.get(k);
    if (list === undefined) roofsAt.set(k, [rect]);
    else list.push(rect);
  }
  const decks: Deck[] = [];
  const roofY = new Map<number, number>();
  for (const col of buildings.columns ?? []) {
    const roof = col.pieces.find((p) => p.role === "roof");
    const block = buildingBlock.get(col.building);
    if (roof === undefined || block === undefined) continue;
    roofY.set(cellKey(col.i, col.j), roof.placement.y_m);
    const d = districtOfBlock.get(block);
    if (d === undefined) continue;
    const y = roof.placement.y_m + ROOF_DECK_M;
    const taken = [...(roofsAt.get(cellKey(col.i, col.j)) ?? [])];
    for (const list of eras) {
      for (const a of list) {
        if (a.cell.i === col.i && a.cell.j === col.j && a.placement.y_m >= y - 0.01) taken.push(rectAt(a.placement.x_m, a.placement.z_m, a.size.x_m, a.size.z_m));
      }
    }
    decks.push({
      building: col.building,
      district: d.id,
      wild: d.wild,
      i: col.i,
      j: col.j,
      rect: { x0: col.i * CELL_M + ROOF_EDGE_M, x1: (col.i + 1) * CELL_M - ROOF_EDGE_M, z0: col.j * CELL_M + ROOF_EDGE_M, z1: (col.j + 1) * CELL_M - ROOF_EDGE_M },
      y,
      taken,
    });
  }

  // ---- the vines' slots ----
  const sideKey = (i: number, j: number, s: CitySide): string => `${i},${j},${s}`;
  const escapes = new Set<string>();
  for (const w of facades.walls ?? []) if (w.kind === "escape") escapes.add(sideKey(w.cell.i, w.cell.j, w.face));
  const novelty = new Set<string>();
  for (const n of facades.novelty ?? []) novelty.add(sideKey(n.cell.i, n.cell.j, n.face));
  const faces: FaceSlot[] = [];
  const blockOfBuilt = new Map(mass.built.map((c) => [cellKey(c.i, c.j), c.block] as const));
  for (const c of mass.built) {
    const y = roofY.get(cellKey(c.i, c.j));
    const d = districtOfBlock.get(c.block);
    if (y === undefined || d === undefined) continue;
    for (const o of c.open) {
      if (o.faces !== "street" && o.faces !== "court") continue;
      const k = sideKey(c.i, c.j, o.side);
      faces.push({ id: k, cell: { i: c.i, j: c.j }, side: o.side, district: d.id, wild: d.wild, roofY: y, escape: escapes.has(k), novelty: novelty.has(k) });
    }
  }

  const signed = new Set<string>();
  for (const p of facades.dressing ?? []) if (p.kind === "fasciaSign" || p.kind === "bladeSign") signed.add(`${p.building}|${p.cell.i},${p.cell.j}`);
  const hosts: HostSlot[] = [];
  const hostOf = (kind: "awning" | "canopy", building: string, cell: CityCell, side: CitySide, key: CalibrationKey, x: number, y: number, z: number, yaw: number): void => {
    const b = HOST_BOUNDS[key];
    const bl = blockOfBuilt.get(cellKey(cell.i, cell.j));
    const d = bl === undefined ? undefined : districtOfBlock.get(bl);
    if (b === undefined || d === undefined) return;
    const t = turned(b.w, b.d, yaw);
    hosts.push({ id: `${kind}:${sideKey(cell.i, cell.j, side)}:${Math.round(x * 10)},${Math.round(z * 10)}`, cell, side, district: d.id, wild: d.wild, x, z, size: { x_m: t.x, z_m: t.z }, top: y + b.h, signed: signed.has(`${building}|${cell.i},${cell.j}`) });
  };
  for (const p of facades.dressing ?? []) {
    if (p.kind !== "awning" || p.wrap) continue;
    hostOf("awning", p.building, p.cell, p.face, p.placement.key, p.placement.x_m, p.placement.y_m, p.placement.z_m, p.placement.yaw_deg);
  }
  for (const p of facades.walls ?? []) {
    if (p.kind !== "canopy") continue;
    hostOf("canopy", p.building, p.cell, p.face, p.placement.key, p.placement.x_m, p.placement.y_m, p.placement.z_m, p.placement.yaw_deg);
  }

  const posts: PostSlot[] = [];
  for (const p of traffic.pieces) {
    if (!p.grounded || (p.kind !== "signalMast" && p.kind !== "stopSign" && p.kind !== "parkingSign")) continue;
    const d = districtOfCell(p.cell.i, p.cell.j);
    if (d === undefined) continue;
    posts.push({ id: `${p.kind}:${p.group}`, x: p.placement.x_m, z: p.placement.z_m, district: d.id, wild: d.wild });
  }
  const trees: TreeSlot[] = [];
  for (const p of ground.props) {
    if (p.kind !== "tree") continue;
    const d = districtOfCell(p.cell.i, p.cell.j, p.block);
    if (d === undefined) continue;
    trees.push({ id: `tree:${Math.round(p.placement.x_m * 10)},${Math.round(p.placement.z_m * 10)}`, x: p.placement.x_m, z: p.placement.z_m, radius: Math.max(p.size.x_m, p.size.z_m) / 2, h: p.size.h_m, district: d.id, wild: d.wild });
  }

  return { w: streets.w, h: streets.h, resolved, streets, districts, districtById, built, classOf, soil, soilKeys, wallDir, obstacles, parks, decks, faces, hosts, posts, trees, standing };
}
