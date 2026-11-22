/**
 * Stage 13, section F1: the growth. Enumerates the candidates from the world (a patch on each grown carriageway, parking, junction and open cell; a clump on a grown pavement cell's wall line; a sapling; a park's
 * two big trees; a roof piece (only behind `RUIN_ROOF_GROWTH`); a vine on a roof edge, an awning or canopy, a post; a tree-vine on a tree), puts them in one hashed order of their ids, and places each in turn:
 * - **T-1**: a piece goes only where it covers no pole, street light, lamp-post place or drop end (with a margin), and a tree's crown also stays clear of every span (B8, F1-Q1: beside a line, never over one). The
 *   spots whose crown meets a span and is otherwise clear are the named set `underSpanSpots`, not placed (`RUIN_TREES_UNDER_SPANS`).
 * - **Clearance**: every add stands `CLEAR_M` clear of every standing piece before it (clean, tech, hold-out and its own), save a patch, which may lie up to one and never under one.
 * - **T-2, option G**: a piece that closes a street cell is placed only if T-2 still holds (`WalkGuard`); otherwise it is left out and counted.
 * Apocalypse `Env_Overgrowth_*` first wherever it fits; nothing is scaled. Pure; every draw is hashed from plan data (never list order).
 */

import type { CalibrationKey, CityCell, CityEraPiece, CityRuinPieceKind, CitySide } from "../../core";
import type { StageRand } from "../pipeline/seeds";
import type { CircuitPoints } from "../pipeline/readable";
import {
  BAND_PARK_TREES,
  CELL_M,
  CIRCUIT_MARGIN_M,
  CLEAR_M,
  CLUMP_TRIES,
  CROWN_MARGIN_M,
  P_CLUMP,
  P_ROOF,
  P_SAPLING,
  P_TREE_VINE,
  P_VINE,
  PARK_TREE_TRIES,
  PATCH_TRIES,
  POST_VINE_MARGIN_M,
  ROOF_GAP_M,
  ROOF_POLE_CLEAR_M,
  TRUNK_CLEAR_M,
  ROOF_PER_COLUMN_MAX,
  ROOF_TRIES,
  TREE_VINE_TOP,
  VINE_TRIES,
} from "./constants";
import { cellKey, cellsOver, grow as growRect, inside, overlaps, rectAt, RectIndex, snap, turned, type Rect } from "./geom";
import { circuitHit, crownCovers, distToRect, segmentMeetsRect } from "./guard";
import {
  EDGE_KEYS,
  FERN_BUSH_KEYS,
  GIANT_KEY,
  KIT,
  LARGE_KEY,
  MOUND_KEY,
  OVERGROWTH_KEYS,
  ROOF_BUSH_KEY,
  ROOF_DEAD_KEYS,
  SAPLING_KEYS,
  TREE_VINE_KEYS,
  trunkOf,
  VINE_DRAPES,
  VINE_DROP_KEY,
  VINE_POST_KEY,
  VINE_SHEETS,
} from "./kit";
import { drawsOf } from "./rng";
import { spread, type Grown } from "./spread";
import { WalkGuard } from "./walk";
import type { CellClass, Deck, FaceSlot, HostSlot, Obstacle, Park, PostSlot, TreeSlot, World } from "./world";

export type RuinPiece = CityEraPiece<CityRuinPieceKind>;

export interface GrowOptions {
  readonly circuit: CircuitPoints;
  readonly roofGrowth: boolean;
  readonly roofDeadTrees: boolean;
  readonly treesUnderSpans: boolean;
  readonly vine06: boolean;
}

/** A tree spot whose crown meets a span and is otherwise clear: B8's "under a span", computed and not placed unless `RUIN_TREES_UNDER_SPANS`. */
export interface UnderSpanSpot {
  readonly id: string;
  readonly key: CalibrationKey;
  readonly x_m: number;
  readonly z_m: number;
}

export interface GrowResult {
  readonly adds: readonly RuinPiece[];
  readonly underSpanSpots: readonly UnderSpanSpot[];
  /** Counts, keyed "<what>:<kind or class>" (reported, not asserted). */
  readonly stats: Readonly<Record<string, number>>;
  readonly grown: ReadonlyMap<number, Grown>;
}

type Cand =
  | { readonly kind: "patch"; readonly id: string; readonly district: string; readonly cell: CityCell; readonly cls: CellClass }
  | { readonly kind: "clump"; readonly id: string; readonly district: string; readonly cell: CityCell; readonly dir: readonly [number, number] }
  | { readonly kind: "sapling"; readonly id: string; readonly district: string; readonly cell: CityCell }
  | { readonly kind: "park-tree"; readonly id: string; readonly district: string; readonly park: Park; readonly key: CalibrationKey }
  | { readonly kind: "roof"; readonly id: string; readonly district: string; readonly deck: Deck; readonly n: number }
  | { readonly kind: "vine-face"; readonly id: string; readonly district: string; readonly face: FaceSlot }
  | { readonly kind: "vine-host"; readonly id: string; readonly district: string; readonly host: HostSlot }
  | { readonly kind: "vine-post"; readonly id: string; readonly district: string; readonly post: PostSlot }
  | { readonly kind: "tree-vine"; readonly id: string; readonly district: string; readonly tree: TreeSlot };

/** A face's frame: the unit direction out from the wall, the wall's coordinate on that axis, the face's extent along it, and the turn that brings a piece's own +z out. */
export interface FaceFrame {
  readonly out: readonly [number, number];
  readonly wall: number;
  readonly alongX: boolean;
  readonly lo: number;
  readonly hi: number;
  readonly yaw: 0 | 90 | 180 | 270;
}
export function faceFrame(cell: CityCell, side: CitySide): FaceFrame {
  const x0 = cell.i * CELL_M;
  const z0 = cell.j * CELL_M;
  switch (side) {
    case "+z":
      return { out: [0, 1], wall: z0 + CELL_M, alongX: true, lo: x0, hi: x0 + CELL_M, yaw: 0 };
    case "-z":
      return { out: [0, -1], wall: z0, alongX: true, lo: x0, hi: x0 + CELL_M, yaw: 180 };
    case "+x":
      return { out: [1, 0], wall: x0 + CELL_M, alongX: false, lo: z0, hi: z0 + CELL_M, yaw: 90 };
    case "-x":
      return { out: [-1, 0], wall: x0, alongX: false, lo: z0, hi: z0 + CELL_M, yaw: 270 };
  }
}

const YAWS = [0, 90, 180, 270] as const;
const cellRectOf = (c: CityCell): Rect => ({ x0: c.i * CELL_M, x1: (c.i + 1) * CELL_M, z0: c.j * CELL_M, z1: (c.j + 1) * CELL_M });
/** A decimetre-rounded position that never leaves the range it was drawn in (a rounded position must not push a footprint out of its cell). */
const snapIn = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, snap(v)));
const cellAt = (x: number, z: number): CityCell => ({ i: Math.floor(x / CELL_M), j: Math.floor(z / CELL_M) });

/** Grows the ruin over the world. `rand` is the stage's. */
export function growRuin(world: World, rand: StageRand, o: GrowOptions): GrowResult {
  const { h, u, pick } = drawsOf(rand);
  const stats: Record<string, number> = {};
  const count = (what: string): void => {
    stats[what] = (stats[what] ?? 0) + 1;
  };
  const circuit = o.circuit;
  const obstacles: RectIndex<Obstacle> = world.obstacles;
  const guard = new WalkGuard(world.resolved, { circuit }, world.standing);
  const adds: RuinPiece[] = [];
  const underSpanSpots: UnderSpanSpot[] = [];

  // ---- the spread ----
  const grown = spread(world.soil, (i, j) => world.classOf.has(cellKey(i, j)));
  for (const [k, g] of grown) {
    if (world.soilKeys.has(k)) continue;
    const cls = world.classOf.get(k);
    if (cls !== undefined && g.dist > 0) count(`grown:${cls}`);
  }
  stats["soil"] = world.soil.length;

  // ---- helpers ----
  const make = (kind: CityRuinPieceKind, id: string, district: string, cell: CityCell, key: CalibrationKey, x: number, y: number, z: number, yaw: number): RuinPiece => {
    const k = KIT[key]!;
    const t = turned(k.w, k.d, yaw);
    return { id, kind, district, cell, placement: { key, x_m: x, y_m: y, z_m: z, yaw_deg: yaw }, size: { x_m: t.x, z_m: t.z, h_m: k.h } };
  };
  /** True when nothing standing meets the footprint (grown by `gap`) over the vertical span `base` to `top`, ignoring any obstacle that contains a point of `ignoreAt`. */
  const free = (rect: Rect, base: number, top: number, gap: number, ignoreAt?: readonly [number, number], ignoreTag?: string): boolean => {
    for (const hit of obstacles.query(growRect(rect, gap))) {
      if (hit.tag.base >= top || hit.tag.top <= base) continue;
      if (ignoreTag !== undefined && hit.tag.at === ignoreTag) continue;
      if (ignoreAt !== undefined && ignoreAt[0] >= hit.rect.x0 && ignoreAt[0] <= hit.rect.x1 && ignoreAt[1] >= hit.rect.z0 && ignoreAt[1] <= hit.rect.z1) continue;
      return false;
    }
    return true;
  };
  /**
   * What stops a tree's trunk (F1b3: the crown is unconstrained and only the trunk is judged). The trunk is the square of side 2 x `r` at the pivot (the disc's bounding square: what T-2 and the obstacle index also read, so a trunk the
   * guard lets through is one the checks accept), standing from 0 to `top`: "building" when it is under CLEAR_M from a built cell; "standing" when it is under CLEAR_M from a standing piece over that height; "circuit" when it is
   * under TRUNK_CLEAR_M from a pole, a street light or a lamp-post place; else "ok".
   */
  const trunkVerdict = (x: number, z: number, r: number, top: number): "ok" | "building" | "standing" | "circuit" => {
    const sq = rectAt(x, z, 2 * r, 2 * r);
    const gap = (b: Rect): number => Math.hypot(Math.max(sq.x0 - b.x1, b.x0 - sq.x1, 0), Math.max(sq.z0 - b.z1, b.z0 - sq.z1, 0));
    const reach = r + CLEAR_M;
    for (let j = Math.floor((z - reach) / CELL_M); j <= Math.floor((z + reach) / CELL_M); j++) {
      for (let i = Math.floor((x - reach) / CELL_M); i <= Math.floor((x + reach) / CELL_M); i++) {
        if (world.built.has(cellKey(i, j)) && gap(cellRectOf({ i, j })) < CLEAR_M) return "building";
      }
    }
    for (const hit of obstacles.query(growRect(sq, CLEAR_M))) {
      if (hit.tag.base >= top || hit.tag.top <= 0) continue;
      if (gap(hit.rect) < CLEAR_M) return "standing";
    }
    for (const q of [...circuit.poles, ...circuit.lights, ...circuit.lampPlaces]) if (distToRect(q.x_m, q.z_m, sq) < TRUNK_CLEAR_M) return "circuit";
    return "ok";
  };
  /** True when the crown's disc meets a built cell (reported as `crownIntoBuilding`; never a reason to refuse). */
  const crownMeetsBuilding = (x: number, z: number, radius: number): boolean => {
    for (let j = Math.floor((z - radius) / CELL_M); j <= Math.floor((z + radius) / CELL_M); j++) {
      for (let i = Math.floor((x - radius) / CELL_M); i <= Math.floor((x + radius) / CELL_M); i++) if (world.built.has(cellKey(i, j)) && distToRect(x, z, cellRectOf({ i, j })) <= radius) return true;
    }
    return false;
  };
  const meetsBuilt = (rect: Rect): boolean => cellsOver(rect).some((q) => world.built.has(cellKey(q.i, q.j)));
  const posIn = (r: Rect, tx: number, tz: number, ...key: (string | number)[]): [number, number] => {
    const loX = r.x0 + tx / 2;
    const hiX = r.x1 - tx / 2;
    const loZ = r.z0 + tz / 2;
    const hiZ = r.z1 - tz / 2;
    const x = hiX < loX ? (r.x0 + r.x1) / 2 : snapIn(loX + u(...key, "x") * (hiX - loX), loX, hiX);
    const z = hiZ < loZ ? (r.z0 + r.z1) / 2 : snapIn(loZ + u(...key, "z") * (hiZ - loZ), loZ, hiZ);
    return [x, z];
  };
  const shuffled = <T extends string>(list: readonly T[], ...key: (string | number)[]): T[] => [...list].sort((a, b) => h(...key, a) - h(...key, b) || (a < b ? -1 : 1));
  const add = (p: RuinPiece, patch: boolean): boolean => {
    // option G: a piece that closes a street cell is placed only where T-2 still holds
    if (!guard.tryAdd(p)) {
      count(`leftOutT2:${p.kind}`);
      return false;
    }
    adds.push(p);
    count(`placed:${p.kind}`);
    if (!patch) {
      const rect = rectAt(p.placement.x_m, p.placement.z_m, p.size.x_m, p.size.z_m);
      obstacles.add(rect, { rect, base: p.placement.y_m, top: p.placement.y_m + p.size.h_m });
    }
    return true;
  };

  // ---- the candidates ----
  const cands: Cand[] = [];
  const wildOf = (d: string): number => world.districtById.get(d)?.wild ?? 0;
  for (const [k, g] of grown) {
    if (world.soilKeys.has(k)) continue;
    const cls = world.classOf.get(k);
    if (cls === undefined || g.dist === 0) continue;
    const i = Math.floor(k / 100000) - 1000;
    const j = (k % 100000) - 1000;
    const cell = { i, j };
    const wild = wildOf(g.district);
    const at = `${i},${j}`;
    if (cls === "lane" || cls === "parking" || cls === "junction" || cls === "open") cands.push({ kind: "patch", id: `ruin:patch:${at}`, district: g.district, cell, cls });
    if (cls === "pavement") {
      const dir = world.wallDir(i, j);
      const id = `ruin:clump:${at}`;
      if (dir !== null && u("roll", id) < P_CLUMP * wild) cands.push({ kind: "clump", id, district: g.district, cell, dir });
    }
    if (cls !== "junction" && cls !== "crossing") {
      const id = `ruin:sapling:${at}`;
      if (u("roll", id) < P_SAPLING * wild) cands.push({ kind: "sapling", id, district: g.district, cell });
    }
  }
  for (const p of world.parks) {
    if (p.wild < BAND_PARK_TREES) continue;
    cands.push({ kind: "park-tree", id: `ruin:park-tree:${p.id}:giant`, district: p.district, park: p, key: GIANT_KEY });
    cands.push({ kind: "park-tree", id: `ruin:park-tree:${p.id}:large`, district: p.district, park: p, key: LARGE_KEY });
  }
  if (o.roofGrowth) {
    for (const deck of world.decks) {
      for (let n = 0; n < ROOF_PER_COLUMN_MAX; n++) {
        const id = `ruin:roof:${deck.i},${deck.j}:${n}`;
        if (u("roll", id) < P_ROOF * deck.wild) cands.push({ kind: "roof", id, district: deck.district, deck, n });
      }
    }
  }
  for (const f of world.faces) {
    const id = `ruin:vine:edge:${f.id}`;
    if (!f.escape && !f.novelty && u("roll", id) < P_VINE * f.wild) cands.push({ kind: "vine-face", id, district: f.district, face: f });
  }
  for (const s of world.hosts) {
    const id = `ruin:vine:${s.id}`;
    if (!s.signed && u("roll", id) < P_VINE * s.wild) cands.push({ kind: "vine-host", id, district: s.district, host: s });
  }
  for (const s of world.posts) {
    const id = `ruin:vine:post:${s.id}`;
    if (u("roll", id) < P_VINE * s.wild) cands.push({ kind: "vine-post", id, district: s.district, post: s });
  }
  for (const t of world.trees) {
    const id = `ruin:tree-vine:${t.id}`;
    if (u("roll", id) < P_TREE_VINE * t.wild) cands.push({ kind: "tree-vine", id, district: t.district, tree: t });
  }
  for (const c of cands) count(`candidates:${c.kind}`);
  const order = new Map(cands.map((c) => [c.id, h("order", c.id)] as const));
  cands.sort((a, b) => order.get(a.id)! - order.get(b.id)! || (a.id < b.id ? -1 : 1));

  // ---- the placements, one at a time ----
  const roofTaken = new Map<string, Rect[]>();
  const placedTrees: { id: string; x: number; z: number; radius: number; h: number; district: string; cell: CityCell }[] = [];

  const tryPatch = (c: Extract<Cand, { kind: "patch" }>): void => {
    const r = cellRectOf(c.cell);
    if (c.cls === "crossing") return; // only flat cover on a crossing, and no overgrowth piece is under FLAT_COVER_MAX_H_M
    let piece: RuinPiece | null = null;
    for (let k = 0; k < PATCH_TRIES && piece === null; k++) {
      const key = pick(OVERGROWTH_KEYS, c.id, "key", k);
      const yaw = pick(YAWS, c.id, "yaw", k);
      const kit = KIT[key]!;
      const t = turned(kit.w, kit.d, yaw);
      if (t.x > CELL_M || t.z > CELL_M) continue;
      const [x, z] = posIn(r, t.x, t.z, c.id, "pos", k);
      const rect = rectAt(x, z, t.x, t.z);
      if (!free(rect, 0, kit.h, 0) || circuitHit(circuit, rect, kit.h, CIRCUIT_MARGIN_M)) continue;
      piece = make("patch", c.id, c.district, c.cell, key, x, 0, z, yaw);
    }
    if (piece === null) {
      // the mound, only where no overgrowth fits; centred on the cell, never on a crossing
      const kit = KIT[MOUND_KEY]!;
      const x = (r.x0 + r.x1) / 2;
      const z = (r.z0 + r.z1) / 2;
      const rect = rectAt(x, z, kit.w, kit.d);
      if (free(rect, 0, kit.h, 0) && !circuitHit(circuit, rect, kit.h, CIRCUIT_MARGIN_M)) {
        piece = make("patch", c.id, c.district, c.cell, MOUND_KEY, x, 0, z, 0);
      }
    }
    if (piece === null) {
      count("skippedFit:patch");
      return;
    }
    if (add(piece, true)) count(piece.placement.key === MOUND_KEY ? "patch:mound" : "patch:overgrowth");
  };

  const tryClump = (c: Extract<Cand, { kind: "clump" }>): void => {
    const r = cellRectOf(c.cell);
    const [di, dj] = c.dir;
    const wallOnX = di !== 0; // the wall is a vertical line in plan: the clump's long side runs along z
    const keys = [...shuffled(EDGE_KEYS, c.id, "edge"), ...shuffled(FERN_BUSH_KEYS, c.id, "fern")];
    let placed = false;
    let tries = 0;
    for (const key of keys) {
      if (tries >= CLUMP_TRIES) break;
      const kit = KIT[key]!;
      const isEdge = key.includes("Env_Overgrowth_Edge");
      const yaw = isEdge ? (wallOnX ? pick([0, 180] as const, c.id, "yaw", key) : pick([90, 270] as const, c.id, "yaw", key)) : pick(YAWS, c.id, "yaw", key);
      const t = turned(kit.w, kit.d, yaw);
      const alongLen = wallOnX ? t.z : t.x;
      const acrossLen = wallOnX ? t.x : t.z;
      if (alongLen > CELL_M || acrossLen > CELL_M) continue;
      tries++;
      const lo = (wallOnX ? r.z0 : r.x0) + alongLen / 2;
      const hi = (wallOnX ? r.z1 : r.x1) - alongLen / 2;
      const along = snapIn(lo + u(c.id, "along", key) * (hi - lo), lo, hi);
      const wallAt = wallOnX ? (di < 0 ? r.x0 : r.x1) : dj < 0 ? r.z0 : r.z1;
      const sign = wallOnX ? (di < 0 ? 1 : -1) : dj < 0 ? 1 : -1;
      const across = wallAt + (sign * acrossLen) / 2;
      const x = wallOnX ? across : along;
      const z = wallOnX ? along : across;
      const rect = rectAt(x, z, t.x, t.z);
      if (!inside(rect, r)) continue;
      if (!free(rect, 0, kit.h, CLEAR_M) || circuitHit(circuit, rect, kit.h, CIRCUIT_MARGIN_M)) continue;
      placed = true;
      add(make("clump", c.id, c.district, c.cell, key, x, 0, z, yaw), false);
      break;
    }
    if (!placed) count("skippedFit:clump");
  };

  /**
   * Places a tree by its trunk (F1b3): its `size` is the trunk square and its height the trunk's, so the walk guard and the final T-2 check judge the trunk, and the obstacle index holds the trunk only. The crown (the key's full
   * bounds) is reported by what it covers and never refused, unless `treesUnderSpans` is off (a test double): then a crown over any circuit point or span is refused, as F1 did.
   */
  const treeAt = (kind: "sapling" | "park-tree", id: string, district: string, key: CalibrationKey, x: number, z: number): "placed" | "t2" | "crown" => {
    const kit = KIT[key]!;
    const tk = trunkOf(key);
    const crownR = Math.max(kit.w, kit.d) / 2;
    const cov = crownCovers(circuit, x, z, crownR, kit.h);
    if (!o.treesUnderSpans && (cov.pole || cov.light || cov.lampPlace || cov.dropEnd || cov.span)) {
      count(`skippedCircuit:${kind}`);
      return "crown";
    }
    const p: RuinPiece = { id, kind, district, cell: cellAt(x, z), placement: { key, x_m: x, y_m: 0, z_m: z, yaw_deg: 0 }, size: { x_m: 2 * tk.r_m, z_m: 2 * tk.r_m, h_m: tk.top_m } };
    if (!add(p, false)) return "t2";
    placedTrees.push({ id, x, z, radius: crownR, h: kit.h, district, cell: p.cell });
    if (cov.pole) count("crownOverPole");
    if (cov.light) count("crownOverLight");
    if (cov.lampPlace) count("crownOverLampPlace");
    if (cov.dropEnd) count("crownOverDropEnd");
    if (cov.span) {
      count("crownOverSpan");
      underSpanSpots.push({ id, key, x_m: x, z_m: z });
    }
    if (crownMeetsBuilding(x, z, crownR)) count("crownIntoBuilding");
    return "placed";
  };

  const trySapling = (c: Extract<Cand, { kind: "sapling" }>): void => {
    const r = cellRectOf(c.cell);
    const key = pick(SAPLING_KEYS, c.id, "key");
    const tk = trunkOf(key);
    // the spot is drawn so the trunk, not the crown, fits the cell
    const [x, z] = posIn(r, 2 * tk.r_m, 2 * tk.r_m, c.id, "spot");
    const why = trunkVerdict(x, z, tk.r_m, tk.top_m);
    if (why !== "ok") {
      count(`refusedTrunk:${why}`);
      count("skippedFit:sapling");
      return;
    }
    treeAt("sapling", c.id, c.district, key, x, z);
  };

  const tryParkTree = (c: Extract<Cand, { kind: "park-tree" }>): void => {
    const tk = trunkOf(c.key);
    let x0 = Infinity;
    let x1 = -Infinity;
    let z0 = Infinity;
    let z1 = -Infinity;
    for (const k of c.park.cells) {
      const i = Math.floor(k / 100000) - 1000;
      const j = (k % 100000) - 1000;
      x0 = Math.min(x0, i * CELL_M);
      x1 = Math.max(x1, (i + 1) * CELL_M);
      z0 = Math.min(z0, j * CELL_M);
      z1 = Math.max(z1, (j + 1) * CELL_M);
    }
    for (let k = 0; k < PARK_TREE_TRIES; k++) {
      const [x, z] = posIn({ x0, x1, z0, z1 }, 2 * tk.r_m, 2 * tk.r_m, c.id, "spot", k);
      // the trunk stands inside the park's cells; the crown may reach past them
      if (!cellsOver(rectAt(x, z, 2 * tk.r_m, 2 * tk.r_m)).every((q) => c.park.cells.has(cellKey(q.i, q.j)))) continue;
      const why = trunkVerdict(x, z, tk.r_m, tk.top_m);
      if (why !== "ok") {
        count(`refusedTrunk:${why}`);
        continue;
      }
      const placed = treeAt("park-tree", c.id, c.district, c.key, x, z);
      if (placed === "crown") continue;
      if (placed === "placed") return;
      return; // option G refused the trunk: the tree is left out, counted by treeAt
    }
    count("skippedFit:park-tree");
  };

  const tryRoof = (c: Extract<Cand, { kind: "roof" }>): void => {
    const d = c.deck;
    const taken = roofTaken.get(`${d.i},${d.j}`) ?? [];
    roofTaken.set(`${d.i},${d.j}`, taken);
    const fits = (rect: Rect): boolean => inside(rect, d.rect) && !d.taken.some((q) => overlaps(growRect(q, ROOF_GAP_M), rect)) && !taken.some((q) => overlaps(growRect(q, ROOF_GAP_M), rect));
    const fillers: readonly CalibrationKey[] = [ROOF_BUSH_KEY, ...ROOF_DEAD_KEYS];
    const sets: readonly (readonly CalibrationKey[])[] = [OVERGROWTH_KEYS, fillers];
    for (const set of sets) {
      for (let k = 0; k < ROOF_TRIES; k++) {
        const key = pick(set, c.id, "key", set === OVERGROWTH_KEYS ? 0 : 1, k);
        const yaw = pick(YAWS, c.id, "yaw", k);
        const kit = KIT[key]!;
        const t = turned(kit.w, kit.d, yaw);
        const [x, z] = posIn(d.rect, t.x, t.z, c.id, "pos", set === OVERGROWTH_KEYS ? 0 : 1, k);
        const rect = rectAt(x, z, t.x, t.z);
        // never over or against a rooftop pole (0.3 m clear of its point) or over a rooftop line (no footprint meets it in plan): a Tree_Dead_* included
        if (!fits(rect) || circuitHit(circuit, rect, d.y + kit.h, ROOF_POLE_CLEAR_M) || circuit.lines.some((s) => segmentMeetsRect(s.a, s.b, rect))) continue;
        taken.push(rect);
        adds.push(make("roof", c.id, c.district, { i: d.i, j: d.j }, key, x, d.y, z, yaw));
        count("placed:roof");
        return;
      }
    }
    count("skippedFit:roof");
  };

  /** A vine on a wall: tries the keys in hashed order. `keys` are the pieces allowed; `place` builds the vine's centre, base and top from a key. */
  const tryVineKeys = (c: Cand & { kind: "vine-face" | "vine-host" }, keys: readonly CalibrationKey[], frame: FaceFrame, hostCell: CityCell, shape: (key: CalibrationKey, k: number) => { x: number; z: number; top: number } | null, slot: string, ignoreTag?: string): void => {
    let tries = 0;
    for (const key of shuffled(keys, c.id, "vine")) {
      if (tries >= VINE_TRIES) break;
      const kit = KIT[key]!;
      const at = shape(key, tries);
      if (at === null) continue;
      tries++;
      const base = at.top - kit.h;
      const t = turned(kit.w, kit.d, frame.yaw);
      const rect = rectAt(at.x, at.z, t.x, t.z);
      if (!free(rect, base, at.top, CLEAR_M, undefined, ignoreTag) || circuitHit(circuit, rect, at.top, CIRCUIT_MARGIN_M)) continue;
      if (add(make("vine", c.id, c.district, hostCell, key, at.x, base, at.z, frame.yaw), false)) count(`vine:${slot}`);
      return;
    }
    count(`skippedFit:vine-${slot}`);
  };

  const tryVineFace = (c: Extract<Cand, { kind: "vine-face" }>): void => {
    const f = c.face;
    const fr = faceFrame(f.cell, f.side);
    // a drop on this face: only the narrow drape beside it, and only where it fits
    const hasDrop = circuit.drops.some((d) => {
      const along = fr.alongX ? d.wall.x_m : d.wall.z_m;
      const normal = fr.alongX ? d.wall.z_m : d.wall.x_m;
      return Math.abs(normal - fr.wall) <= 0.35 && along >= fr.lo - 0.1 && along <= fr.hi + 0.1;
    });
    const keys: readonly CalibrationKey[] = hasDrop ? [VINE_DROP_KEY] : [...VINE_SHEETS, ...VINE_DRAPES];
    tryVineKeys(c, keys, fr, f.cell, (key, k) => {
      const kit = KIT[key]!;
      const t = turned(kit.w, kit.d, fr.yaw);
      const alongLen = fr.alongX ? t.x : t.z;
      const lo = fr.lo + alongLen / 2;
      const hi = fr.hi - alongLen / 2;
      const along = snapIn(lo + u(c.id, "along", key, k) * Math.max(0, hi - lo), lo, Math.max(lo, hi));
      const normal = fr.wall + (fr.alongX ? fr.out[1] * (t.z / 2) : fr.out[0] * (t.x / 2));
      return { x: fr.alongX ? along : normal, z: fr.alongX ? normal : along, top: f.roofY };
    }, hasDrop ? "drop" : "edge");
  };

  const tryVineHost = (c: Extract<Cand, { kind: "vine-host" }>): void => {
    const s = c.host;
    const fr = faceFrame(s.cell, s.side);
    const depthOut = fr.alongX ? s.size.z_m : s.size.x_m;
    const keys = [...VINE_SHEETS, ...VINE_DRAPES].filter((k) => KIT[k]!.d <= depthOut + 1e-9 && KIT[k]!.h <= s.top);
    const outer = fr.alongX ? s.z + (fr.out[1] * s.size.z_m) / 2 : s.x + (fr.out[0] * s.size.x_m) / 2;
    tryVineKeys(c, keys, fr, s.cell, (key, k) => {
      const kit = KIT[key]!;
      const t = turned(kit.w, kit.d, fr.yaw);
      const jitter = (u(c.id, "jit", key, k) - 0.5) * 0.6;
      const normal = outer - (fr.alongX ? fr.out[1] * (t.z / 2) : fr.out[0] * (t.x / 2));
      return { x: fr.alongX ? s.x + jitter : normal, z: fr.alongX ? normal : s.z + jitter, top: s.top };
    }, s.id.startsWith("awning") ? "awning" : "canopy", `${Math.round(s.x * 10)},${Math.round(s.z * 10)}`); // a vine draped over a host ignores that host
  };

  const tryVinePost = (c: Extract<Cand, { kind: "vine-post" }>): void => {
    // with `vine06` off the vine is still tried and then dropped at the end, so every other add is the same either way
    const p = c.post;
    const kit = KIT[VINE_POST_KEY]!;
    const yaw = pick(YAWS, c.id, "yaw");
    const t = turned(kit.w, kit.d, yaw);
    const rect = rectAt(p.x, p.z, t.x, t.z);
    if (circuitHit(circuit, rect, kit.h, POST_VINE_MARGIN_M) || !free(rect, 0, kit.h, CLEAR_M, [p.x, p.z])) {
      count("skippedFit:vine-post");
      return;
    }
    if (add(make("vine", c.id, c.district, cellAt(p.x, p.z), VINE_POST_KEY, p.x, 0, p.z, yaw), false)) count("vine:post");
  };

  const tryTreeVine = (c: { id: string; district: string; tree: { x: number; z: number; radius: number; h: number; cell?: CityCell } }): void => {
    const key = pick(TREE_VINE_KEYS, c.id, "key");
    const kit = KIT[key]!;
    const yaw = pick(YAWS, c.id, "yaw");
    const t = turned(kit.w, kit.d, yaw);
    const theta = u(c.id, "theta") * Math.PI * 2;
    const r = 0.45 * c.tree.radius;
    const x = snap(c.tree.x + r * Math.cos(theta));
    const z = snap(c.tree.z + r * Math.sin(theta));
    const top = Math.max(kit.h, TREE_VINE_TOP * c.tree.h);
    const base = top - kit.h;
    const rect = rectAt(x, z, t.x, t.z);
    if (meetsBuilt(rect) || circuitHit(circuit, rect, top, CIRCUIT_MARGIN_M) || !free(rect, base, top, 0, [c.tree.x, c.tree.z])) {
      count("skippedFit:tree-vine");
      return;
    }
    if (add(make("tree-vine", c.id, c.district, cellAt(x, z), key, x, base, z, yaw), false)) count("vine:tree");
  };

  for (const c of cands) {
    switch (c.kind) {
      case "patch":
        tryPatch(c);
        break;
      case "clump":
        tryClump(c);
        break;
      case "sapling":
        trySapling(c);
        break;
      case "park-tree":
        tryParkTree(c);
        break;
      case "roof":
        tryRoof(c);
        break;
      case "vine-face":
        tryVineFace(c);
        break;
      case "vine-host":
        tryVineHost(c);
        break;
      case "vine-post":
        tryVinePost(c);
        break;
      case "tree-vine":
        tryTreeVine({ id: c.id, district: c.district, tree: c.tree });
        break;
    }
  }

  // a tree-vine is a candidate only once its tree stands: the placed trees', in one hashed order
  const late = placedTrees
    .map((t) => ({ t, id: `ruin:tree-vine:${t.id}` }))
    .filter(({ t, id }) => u("roll", id) < P_TREE_VINE * wildOf(t.district))
    .sort((a, b) => h("order", a.id) - h("order", b.id) || (a.id < b.id ? -1 : 1));
  for (const { t, id } of late) {
    count("candidates:tree-vine");
    tryTreeVine({ id, district: t.district, tree: t });
  }

  // ---- the switches that only drop pieces: dropped after the placing, so every other add is the same ----
  const kept = adds.filter((p) => {
    if (p.kind === "vine" && p.placement.key === VINE_POST_KEY && !o.vine06) return false;
    if (p.kind === "roof" && !o.roofDeadTrees && ROOF_DEAD_KEYS.includes(p.placement.key)) return false;
    return true;
  });
  stats["distinctKeys"] = new Set(kept.map((p) => p.placement.key)).size;
  stats["underSpanSpots"] = underSpanSpots.length;
  return { adds: kept, underSpanSpots, stats, grown };
}
