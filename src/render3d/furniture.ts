/**
 * Ticket 052 C: street furniture on the terrace pavements, and dressing for the parking lots, the corner plazas and the 1.0 to 1.5 m alleys 051 C leaves at a run's far end.
 * Pure data and pure maths: no three, no DOM, no fetch, no GLB. Pieces are named by `city-pack:<name>` keys, sizes come from the manifest entries the caller passes (typed-in
 * fixtures in tests), fronts from the `FrontTable` the caller passes (a missing line is the guess "+z", like the dressing's). Nothing here draws; `models3d.ts` draws what
 * `furnitureLayout` returns, through the same InstancedMesh instancer as 052 B.
 *
 * Where it stands (the ticket's defaults; nobody was available to answer):
 *  - Only the pavements in front of 051's terrace runs (the outer blocks), never the circuit's own streets or the ring's inside, so nothing new stands near a node or a wire.
 *  - Two lines along a run: a wall-side line (the item's back edge `FURN_WALL_M` in from the pavement's wall edge) and a kerb-side line (its front edge `FURN_KERB_M` in from the
 *    kerb). Distances are measured in the run's own frame: `s` along the run from its start, `t` from the lots' front line toward the road (pavement from `SETBACK_M` to the kerb).
 *    The ticket says "FURN_WALL_M out from the fronts"; the lots' fronts stand `SETBACK` short of the pavement, so that reads from the pavement's edge here, so an item stands ON the pavement.
 *  - Items on a line are `FURN_PITCH_M` apart (centre to centre), trees `TREE_PITCH_M`, nothing within `FURN_CORNER_M` of a run's ends, `FURN_KEEP_M` of a pole, lamp post, node, pad
 *    or service drop, and nothing taller than `FURN_MAX_H_M` within `WIRE_CLEAR` of a wire span. An item taller than a piece of the building's dressing (an awning, a sign, a fire
 *    escape) stays out from under it (`avoid`), so a tree never grows through an awning.
 *  - A run's per-kind caps hold (one hydrant, one mailbox, one bus stop on a run of at least `BUS_STOP_MIN_RUN_M`, ...); every choice is `dressUnit(run.id, ...)`: deterministic.
 *  - The pack's lamps, signals and electrical cabinets are never used here (they would read as puzzle parts), and neither is any person, animal or vehicle: a parking lot has
 *    markings, barriers, a meter and a pole billboard, and no cars. Nothing here glows; nothing is picked.
 *
 * Open lots: a parking lot gets `ParkingLines` tiles that cover it, barriers along its back edge, one or two meters and (under its run's lowest height cap) a pole billboard;
 * a plaza gets paving, one or two trees, benches, planters, and a picnic table with an umbrella or a hot-dog stand. Everything stands inside its own rectangle.
 * An alley (a gap of `ALLEY_MIN_M` to `ALLEY_MAX_M` between a run's last block and the next row's wall) gets one or two bins against its walls. The pack has no gate that fits a
 * 1.0 to 1.5 m way (its fence is 5 m long and is not scaled), so there is none.
 */

import type { AssetEntry, CalibrationKey } from "../core";
import { KERB_FROM_FRONT_M, dressUnit } from "./dressing";
import { frontYaw, sizeOf, type FrontTable, type ModelFront } from "./models";
import { PARKING_D_M, PARKING_W_M, PLAZA_W_M, SETBACK, WIRE_CLEAR, WORLD_PER_METRE, type Lot, type OpenLot, type Pt, type TerraceRun } from "./kitunits";

// ---- constants (every one a one-line tuning change; 053 pins them in its Numbers table) ----

export const FURN_KERB_M = 0.5;
export const FURN_WALL_M = 0.4;
export const FURN_PITCH_M = 7;
export const TREE_PITCH_M = 12;
export const BUS_STOP_MIN_RUN_M = 40;
export const FURN_KEEP_M = 1.5;
export const FURN_CORNER_M = 4;
export const FURN_MAX_H_M = 3.2;
/** The share of candidate places along a line that get an item (the rest stay empty: busy, not cluttered). */
export const P_FURN = 0.7;
/** Past the pitch, a hashed gap of up to this many metres before the next candidate. */
export const FURN_GAP_SPAN_M = 6;
/** Clear space between two items' footprints, metres. */
export const FURN_GAP_M = 0.3;
/** The share of corner ends that get a bollard just beyond the corner keep-out, and the most a run takes. */
export const P_BOLLARD = 0.5;
export const BOLLARD_PER_RUN = 2;
/** Per-run caps. */
export const HYDRANT_PER_RUN = 1;
export const MAILBOX_PER_RUN = 1;
export const NEWSPAPER_PER_RUN = 2;
export const BUS_STOP_PER_RUN = 1;
/** The share of alleys that hold a bin, and the share of those with a second. */
export const P_ALLEY = 0.85;
export const P_ALLEY_SECOND = 0.5;
/** A parking lot's pole billboard: its share, and the board's base height on the pole, metres. */
export const P_PARKING_BILLBOARD = 0.6;
export const BILLBOARD_BOARD_LIFT_M = 4.55;
/** A piece lower than this (a parking tile, a paving slab) is ground: things stand on it, and it may lie under them and beside its own kind. */
export const SLAB_MAX_M = 0.2;
/** The most draw calls the furniture may add (one InstancedMesh per key and sub-mesh), on top of the building dressing's. */
export const FURN_DRAW_CALLS_MAX = 80;

const SC = WORLD_PER_METRE;
const EPS = 1e-9;
/** Metres from a lot's front line to the pavement's wall edge (the setback) and to the kerb. */
export const WALL_EDGE_M = SETBACK / SC;
export const KERB_M = KERB_FROM_FRONT_M;

// ---- the keys ----

const k = (name: string): CalibrationKey => `city-pack:${name}`;
const seq = (prefix: string, ...nn: string[]): CalibrationKey[] => nn.map((n) => k(`${prefix}${n}`));

export const BINS: readonly CalibrationKey[] = seq("SM_Prop_Trashbin_", "01", "02");
export const PLANTERS: readonly CalibrationKey[] = seq("SM_Prop_Planter_", "01", "02");
export const POT_PLANTS: readonly CalibrationKey[] = seq("SM_Prop_PotPlant_", "01", "02");
export const BENCHES: readonly CalibrationKey[] = seq("SM_Prop_ParkBench_", "01");
export const MAILBOXES: readonly CalibrationKey[] = seq("SM_Prop_Mailbox_", "01");
export const NEWSPAPERS: readonly CalibrationKey[] = seq("SM_Prop_Newspaper_", "02");
export const METERS: readonly CalibrationKey[] = seq("SM_Prop_ParkingMeter_", "01");
export const HYDRANTS: readonly CalibrationKey[] = seq("SM_Prop_Hydrant_", "01");
export const TREES: readonly CalibrationKey[] = seq("SM_Env_Tree_", "01", "02", "03");
export const BOLLARDS: readonly CalibrationKey[] = seq("SM_Prop_SidewalkPoles_", "02");
export const BUS_STOPS: readonly CalibrationKey[] = seq("SM_Prop_BusStop_", "01");
/** Open lots. `ParkingLines` is a flat 10 x 5 m tile with no height. */
export const PARKING_LINES: CalibrationKey = k("SM_Env_Road_ParkingLines_01");
export const BARRIERS: readonly CalibrationKey[] = seq("SM_Prop_Barrier_", "01");
export const LOT_METERS: readonly CalibrationKey[] = seq("SM_Prop_ParkingMeter_", "02");
export const BILLBOARD_POLE: CalibrationKey = k("SM_Prop_Billboard_Pole_01");
export const BILLBOARD_BOARD: CalibrationKey = k("SM_Prop_Billboard_01");
export const PLAZA_PANEL: CalibrationKey = k("SM_Env_Sidewalk_Panel_02");
export const PICNIC_TABLE: CalibrationKey = k("SM_Prop_PicnicTable_01");
export const UMBRELLA: CalibrationKey = k("SM_Prop_Umbrella_01");
export const HOTDOG_STAND: CalibrationKey = k("SM_Prop_HotdogStand_01");

/** Every key this module can place, once each (for loading, and for the tests' fixture check). */
export function furnitureKeys(): CalibrationKey[] {
  return [
    ...new Set<CalibrationKey>([
      ...BINS,
      ...PLANTERS,
      ...POT_PLANTS,
      ...BENCHES,
      ...MAILBOXES,
      ...NEWSPAPERS,
      ...METERS,
      ...HYDRANTS,
      ...TREES,
      ...BOLLARDS,
      ...BUS_STOPS,
      PARKING_LINES,
      ...BARRIERS,
      ...LOT_METERS,
      BILLBOARD_POLE,
      BILLBOARD_BOARD,
      PLAZA_PANEL,
      PICNIC_TABLE,
      UMBRELLA,
      HOTDOG_STAND,
    ]),
  ];
}

// ---- types ----

/** An axis-aligned rectangle on the ground, world units. */
export interface Rect {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

export type FurnitureKind = "pavement" | "parking" | "plaza" | "alley";

/** One piece of furniture. `x`, `z` are world units (the base centre); `w`, `h`, `d` are its size after the turn, metres (`w` along the road it faces, `d` away from it). */
export interface FurniturePiece {
  key: CalibrationKey;
  x: number;
  z: number;
  yaw: number;
  w: number;
  h: number;
  d: number;
  kind: FurnitureKind;
  /** The terrace run it stands by (a parking lot's is the run it ends; a plaza's, the run that ends at it or starts after it). */
  run: string;
  /** Which ground layer it stands on: the pavement, or the yard (open lots and alleys). */
  ground: "pavement" | "yard";
  /** Metres above that layer where its base is (a pole billboard's board). */
  lift: number;
  /** A flat tile with no height (parking lines, paving): it may lie under other pieces. */
  flat: boolean;
}

/** A gap of 1.0 to 1.5 m at a run's far end, between its last block's pieces and the next row's wall, in the run's own frame: metres from the run's start along it, and its width. */
export interface Alley {
  s0: number;
  gap: number;
}

/** A piece of the building dressing a tall item stays out from under: its footprint, and the height of its base above the ground, metres. */
export interface AvoidBox extends Rect {
  y: number;
}

export interface FurnitureInput {
  runs: readonly TerraceRun[];
  lots: readonly Lot[];
  /** Parking lots and plazas (`Town.openLots`, or `openLotsOf` where a caller has only the runs). */
  openLots: readonly Pick<OpenLot, "kind" | "run" | "x" | "z" | "w" | "d" | "yaw">[];
  /** By run id. */
  alleys?: ReadonlyMap<string, Alley>;
  /** Poles, lamp posts and nodes. */
  keepPoints?: readonly Pt[];
  /** Service drops' ground lines. */
  keepSegments?: readonly (readonly [Pt, Pt])[];
  /** Junction pads. */
  keepRects?: readonly Rect[];
  /** Wire spans (a box over each). Only an item taller than `FURN_MAX_H_M` keeps `WIRE_CLEAR` from one. */
  wireRects?: readonly Rect[];
  /** The building dressing's footprints. */
  avoid?: readonly AvoidBox[];
}

type Entries = ReadonlyMap<CalibrationKey, AssetEntry>;

// ---- geometry ----

const rectDist = (a: Rect, b: Rect): number => Math.hypot(Math.max(0, a.minX - b.maxX, b.minX - a.maxX), Math.max(0, a.minZ - b.maxZ, b.minZ - a.maxZ));
const overlaps = (a: Rect, b: Rect, margin = 0): boolean => a.minX < b.maxX + margin && b.minX < a.maxX + margin && a.minZ < b.maxZ + margin && b.minZ < a.maxZ + margin;
const grow = (r: Rect, m: number): Rect => ({ minX: r.minX - m, minZ: r.minZ - m, maxX: r.maxX + m, maxZ: r.maxZ + m });

/** A frame on the ground: an origin, an axis `a` along the road and an axis `b` toward it (unit vectors), and the yaw that turns a model's front to `b`. Positions are in metres. */
interface Frame {
  ox: number;
  oz: number;
  ax: number;
  az: number;
  bx: number;
  bz: number;
  yaw: number;
}

const at = (f: Frame, p: number, q: number): Pt => ({ x: f.ox + (f.ax * p + f.bx * q) * SC, z: f.oz + (f.az * p + f.bz * q) * SC });
/** The world rectangle over a `w` x `d` metre footprint centred at (p, q) of the frame. */
function rectIn(f: Frame, p: number, q: number, w: number, d: number): Rect {
  const c = at(f, p, q);
  const hx = (Math.abs(f.ax) * w + Math.abs(f.bx) * d) * 0.5 * SC;
  const hz = (Math.abs(f.az) * w + Math.abs(f.bz) * d) * 0.5 * SC;
  return { minX: c.x - hx, minZ: c.z - hz, maxX: c.x + hx, maxZ: c.z + hz };
}

/** The frame of a lot (open lot or terrace lot): origin at its centre or front, `b` toward the road. */
function frameOf(ox: number, oz: number, yaw: number, along: 1 | -1 = 1): Frame {
  return { ox, oz, ax: Math.cos(yaw) * along, az: -Math.sin(yaw) * along, bx: Math.sin(yaw), bz: Math.cos(yaw), yaw };
}

function weightedOrder<T extends { weight: number }>(xs: readonly T[], unit: number): T[] {
  const total = xs.reduce((s, x) => s + x.weight, 0);
  let acc = 0;
  let start = 0;
  for (let i = 0; i < xs.length; i++) {
    acc += xs[i]!.weight;
    if (unit * total < acc) {
      start = i;
      break;
    }
  }
  return [...xs.slice(start), ...xs.slice(0, start)];
}

// ---- the layout ----

interface Spec {
  w: number;
  h: number;
  d: number;
  yawF: number;
}

/**
 * Every piece of furniture on a town's terrace pavements, parking lots, plazas and alleys, in run order, then the open lots. Deterministic. A key missing from `entries` drops only
 * its own placements. `fronts` names a key's door side where "+z" is wrong (a line for the key wins over the guess).
 */
export function furnitureLayout(input: FurnitureInput, entries: Entries, fronts: FrontTable = {}): FurniturePiece[] {
  const out: FurniturePiece[] = [];
  const spec = (key: CalibrationKey, flatOk = false): Spec | null => {
    const e = entries.get(key);
    if (!e || e.warnings.includes("scale-suspect")) return null;
    const s = sizeOf(e);
    if (!s.every((v) => Number.isFinite(v) && v >= 0) || s[0] <= 0 || s[2] <= 0 || (!flatOk && s[1] <= 0)) return null;
    const front: ModelFront = (Object.prototype.hasOwnProperty.call(fronts, key) ? fronts[key]?.front : undefined) ?? "+z";
    const quarter = front === "+x" || front === "-x";
    return { w: quarter ? s[2] : s[0], h: s[1], d: quarter ? s[0] : s[2], yawF: frontYaw(front) };
  };

  const points = input.keepPoints ?? [];
  const segments = input.keepSegments ?? [];
  const keepRects = input.keepRects ?? [];
  const wireRects = input.wireRects ?? [];
  const avoid = input.avoid ?? [];
  const keep = FURN_KEEP_M * SC;

  /** Is this footprint free of the circuit's things (a pole, lamp post, node, pad or drop within the keep-out; a wire span under a tall item), and out from under the dressing? */
  const clearOfBuildings = (r: Rect, h: number): boolean => {
    for (const p of points) if (rectDist(r, { minX: p.x, minZ: p.z, maxX: p.x, maxZ: p.z }) < keep - EPS) return false;
    for (const [a, b] of segments) {
      const n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (keep * 0.25)));
      for (let i = 0; i <= n; i++) {
        const x = a.x + ((b.x - a.x) * i) / n;
        const z = a.z + ((b.z - a.z) * i) / n;
        if (rectDist(r, { minX: x, minZ: z, maxX: x, maxZ: z }) < keep - EPS) return false;
      }
    }
    for (const q of keepRects) if (rectDist(r, q) < keep - EPS) return false;
    if (h > FURN_MAX_H_M) for (const q of wireRects) if (overlaps(r, grow(q, WIRE_CLEAR))) return false;
    for (const a of avoid) if (h > a.y + EPS && overlaps(r, a)) return false;
    return true;
  };

  // ---- pavements, runs ----
  interface Group {
    id: string;
    keys: readonly CalibrationKey[];
    weight: number;
    cap?: number;
    minRun?: number;
  }
  const WALL_GROUPS: readonly Group[] = [
    { id: "bin", keys: BINS, weight: 3 },
    { id: "planter", keys: PLANTERS, weight: 2 },
    { id: "pot", keys: POT_PLANTS, weight: 2 },
    { id: "bench", keys: BENCHES, weight: 2 },
    { id: "mailbox", keys: MAILBOXES, weight: 1, cap: MAILBOX_PER_RUN },
    { id: "news", keys: NEWSPAPERS, weight: 1, cap: NEWSPAPER_PER_RUN },
  ];
  const KERB_GROUPS: readonly Group[] = [
    { id: "meter", keys: METERS, weight: 3 },
    { id: "tree", keys: TREES, weight: 2 },
    { id: "hydrant", keys: HYDRANTS, weight: 1, cap: HYDRANT_PER_RUN },
    { id: "busstop", keys: BUS_STOPS, weight: 1, cap: BUS_STOP_PER_RUN, minRun: BUS_STOP_MIN_RUN_M },
  ];

  for (const run of input.runs) {
    const lot0 = input.lots[run.lots[0] ?? -1];
    if (!lot0) continue;
    const len = run.len / SC;
    // The pavement's wall edge and kerb, metres from the run's front line: the run's own frame (the tile city's 5 m pavement), or today's.
    const wallM = run.frame?.wall_m ?? WALL_EDGE_M;
    const kerbM = run.frame?.kerb_m ?? KERB_M;
    const frame: Frame = { ox: run.ax, oz: run.az, ax: run.ux, az: run.uz, bx: Math.sin(lot0.yaw), bz: Math.cos(lot0.yaw), yaw: lot0.yaw };
    const alley = input.alleys?.get(run.id) ?? null;
    const placed: { s: number; line: string; rect: Rect; tree: boolean }[] = [];
    const counts = new Map<string, number>();

    const tryPlace = (g: { id: string; cap?: number }, key: CalibrationKey, line: "wall" | "kerb", s: number): boolean => {
      const sp = spec(key);
      if (!sp) return false;
      if ((counts.get(g.id) ?? 0) >= (g.cap ?? Infinity)) return false;
      if (s - sp.w / 2 < FURN_CORNER_M - EPS || s + sp.w / 2 > len - FURN_CORNER_M + EPS) return false;
      const t = line === "wall" ? wallM + FURN_WALL_M + sp.d / 2 : kerbM - FURN_KERB_M - sp.d / 2;
      if (t - sp.d / 2 < -EPS || t + sp.d / 2 > kerbM - FURN_KERB_M + EPS) return false;
      if (alley && s + sp.w / 2 > alley.s0 - 0.5 && s - sp.w / 2 < alley.s0 + alley.gap + 0.5) return false;
      for (const o of placed) {
        if (o.line === line && Math.abs(o.s - s) < FURN_PITCH_M - EPS) return false;
        if (g.id === "tree" && o.tree && Math.abs(o.s - s) < TREE_PITCH_M - EPS) return false;
      }
      const rect = rectIn(frame, s, t, sp.w, sp.d);
      if (!clearOfBuildings(rect, sp.h)) return false;
      const gap = FURN_GAP_M * SC;
      for (const o of placed) if (overlaps(rect, o.rect, gap)) return false;
      const c = at(frame, s, t);
      out.push({ key, x: c.x, z: c.z, yaw: frame.yaw + sp.yawF, w: sp.w, h: sp.h, d: sp.d, kind: "pavement", run: run.id, ground: "pavement", lift: 0, flat: false });
      placed.push({ s, line, rect, tree: g.id === "tree" });
      counts.set(g.id, (counts.get(g.id) ?? 0) + 1);
      return true;
    };

    // Bollards, just beyond each corner's keep-out.
    let bollards = 0;
    for (const [n, s] of [FURN_CORNER_M + 0.4, len - FURN_CORNER_M - 0.4].entries()) {
      if (bollards >= BOLLARD_PER_RUN || dressUnit(run.id, "bollard", n) >= P_BOLLARD) continue;
      const key = BOLLARDS[0]!;
      if (tryPlace({ id: "bollard", cap: BOLLARD_PER_RUN }, key, "kerb", s)) bollards++;
    }

    for (const line of ["wall", "kerb"] as const) {
      const groups = line === "wall" ? WALL_GROUPS : KERB_GROUPS;
      let s = FURN_CORNER_M + 0.5 + dressUnit(run.id, line, "first") * FURN_PITCH_M;
      for (let n = 0; s <= len - FURN_CORNER_M; n++) {
        if (dressUnit(run.id, line, n, "fill") < P_FURN) {
          for (const g of weightedOrder(
            groups.filter((x) => (x.minRun ?? 0) <= len),
            dressUnit(run.id, line, n, "item"),
          )) {
            const key = g.keys[Math.min(g.keys.length - 1, Math.floor(dressUnit(run.id, line, n, "key") * g.keys.length))]!;
            if (tryPlace(g, key, line, s)) break;
          }
        }
        s += FURN_PITCH_M + dressUnit(run.id, line, n, "gap") * FURN_GAP_SPAN_M;
      }
    }

    // The alley: one or two bins against its walls, set back from the mouth.
    if (alley && dressUnit(run.id, "alley") < P_ALLEY) {
      const count = dressUnit(run.id, "alley2") < P_ALLEY_SECOND ? 2 : 1;
      const first = dressUnit(run.id, "alleyside") < 0.5 ? -1 : 1;
      const rects: Rect[] = [];
      for (let i = 0; i < count; i++) {
        const key = BINS[Math.min(BINS.length - 1, Math.floor(dressUnit(run.id, "alleykey", i) * BINS.length))]!;
        const sp = spec(key);
        if (!sp || sp.w > alley.gap - 0.2) continue;
        const side = i % 2 === 0 ? first : -first;
        const p = side < 0 ? alley.s0 + sp.w / 2 + 0.1 : alley.s0 + alley.gap - sp.w / 2 - 0.1;
        const q = -(1.2 + 1.7 * i);
        const rect = rectIn(frame, p, q, sp.w, sp.d);
        if (rects.some((r) => overlaps(r, rect, FURN_GAP_M * SC))) continue;
        rects.push(rect);
        const c = at(frame, p, q);
        out.push({ key, x: c.x, z: c.z, yaw: frame.yaw + sp.yawF, w: sp.w, h: sp.h, d: sp.d, kind: "alley", run: run.id, ground: "yard", lift: 0, flat: false });
      }
    }
  }

  // ---- open lots ----
  for (const open of input.openLots) {
    const frame = frameOf(open.x, open.z, open.yaw);
    const W = (open.w / SC) * 0.5;
    const D = (open.d / SC) * 0.5;
    const mine: { rect: Rect; lo: number; hi: number; low: boolean }[] = [];
    const seed = `${open.kind}:${open.run}`;

    /** A group of pieces goes in together or not at all: each must be inside the lot and clear of what is already there (the group's own pieces excepted). */
    const accept = (parts: readonly { key: CalibrationKey; p: number; q: number; extraYaw?: number; lift?: number; flatOk?: boolean }[]): boolean => {
      const made: { piece: FurniturePiece; rect: Rect; lo: number; hi: number; low: boolean }[] = [];
      for (const part of parts) {
        const sp = spec(part.key, part.flatOk === true);
        if (!sp) return false;
        if (Math.abs(part.p) + sp.w / 2 > W + EPS || Math.abs(part.q) + sp.d / 2 > D + EPS) return false;
        const c = at(frame, part.p, part.q);
        const lift = part.lift ?? 0;
        made.push({
          piece: { key: part.key, x: c.x, z: c.z, yaw: frame.yaw + sp.yawF + (part.extraYaw ?? 0), w: sp.w, h: sp.h, d: sp.d, kind: open.kind, run: open.run, ground: "yard", lift, flat: sp.h <= 0 },
          rect: rectIn(frame, part.p, part.q, sp.w, sp.d),
          lo: lift,
          hi: lift + sp.h,
          low: sp.h < SLAB_MAX_M,
        });
      }
      for (const m of made) {
        if (m.low) continue;
        for (const o of mine) {
          if (o.low) continue;
          if (overlaps(m.rect, o.rect, FURN_GAP_M * 0.5 * SC) && m.lo < o.hi - EPS && o.lo < m.hi - EPS) return false;
        }
      }
      for (const m of made) {
        mine.push({ rect: m.rect, lo: m.lo, hi: m.hi, low: m.low });
        out.push(m.piece);
      }
      return true;
    };
    const pick = <T>(xs: readonly T[], ...parts: (string | number)[]): T => xs[Math.min(xs.length - 1, Math.floor(dressUnit(seed, ...parts) * xs.length))]!;
    const sign = (...parts: (string | number)[]): 1 | -1 => (dressUnit(seed, ...parts) < 0.5 ? -1 : 1);

    if (open.kind === "parking") {
      // Markings: two 10 x 5 m tiles stacked across the 10 x 10 m lot.
      const tile = spec(PARKING_LINES, true);
      if (tile) {
        const dz = tile.d;
        for (const q of [-dz / 2, dz / 2]) accept([{ key: PARKING_LINES, p: 0, q, flatOk: true }]);
      }
      // Barriers along the back edge, two or three.
      const skip = dressUnit(seed, "barrierskip") < 0.5 ? Math.floor(dressUnit(seed, "barrierwhich") * 3) : -1;
      [-3.6, 0, 3.6].forEach((x, i) => {
        if (i !== skip) accept([{ key: pick(BARRIERS, "barrier", i), p: x, q: -D + 0.5 }]);
      });
      // A meter near the front, and sometimes a second on the other side.
      const ms = sign("meter");
      accept([{ key: pick(LOT_METERS, "meterkey"), p: ms * 4.3, q: D - 1.1 }]);
      if (dressUnit(seed, "meter2") < 0.4) accept([{ key: pick(LOT_METERS, "meterkey2"), p: -ms * 4.3, q: D - 1.1 }]);
      // A pole billboard, under the run's lowest height cap.
      const caps = input.lots.filter((l) => l.terrace?.run === open.run).map((l) => l.hMax / SC);
      const pole = spec(BILLBOARD_POLE);
      const board = spec(BILLBOARD_BOARD);
      if (pole && board && caps.length > 0 && dressUnit(seed, "billboard") < P_PARKING_BILLBOARD) {
        const top = Math.max(pole.h, BILLBOARD_BOARD_LIFT_M + board.h);
        if (top <= Math.min(...caps) + EPS) {
          const x = sign("billboardside") * (W - 0.5 - board.w / 2);
          accept([
            { key: BILLBOARD_POLE, p: x, q: -D * 0.45 },
            { key: BILLBOARD_BOARD, p: x, q: -D * 0.45, lift: BILLBOARD_BOARD_LIFT_M },
          ]);
        }
      }
    } else {
      // Paving: four 5 x 5 m panels.
      const panel = spec(PLAZA_PANEL);
      if (panel) for (const sx of [-1, 1]) for (const sz of [-1, 1]) accept([{ key: PLAZA_PANEL, p: (sx * panel.w) / 2, q: (sz * panel.d) / 2 }]);
      // Everything else stands on the paving.
      const slab = panel?.h ?? 0;
      const on = (parts: readonly { key: CalibrationKey; p: number; q: number; extraYaw?: number }[]): boolean => accept(parts.map((x) => ({ ...x, lift: slab })));
      // Trees at the back corners: both, or one by hash.
      const both = dressUnit(seed, "trees") < 0.5;
      const one = sign("tree1");
      for (const sx of [-1, 1]) if (both || sx === one) on([{ key: pick(TREES, "treekey", sx), p: sx * 3.6, q: -3.5 }]);
      // A picnic table with an umbrella, or a hot-dog stand.
      if (dressUnit(seed, "centre") < 0.5) {
        const s = sign("tableside");
        on([
          { key: PICNIC_TABLE, p: -0.6 * s, q: -0.2 },
          { key: UMBRELLA, p: 1.9 * s, q: -0.2 },
        ]);
      } else on([{ key: HOTDOG_STAND, p: 0, q: -0.6 }]);
      // Benches at the front corners, facing in.
      for (const sx of [-1, 1]) if (dressUnit(seed, "bench", sx) < 0.75) on([{ key: BENCHES[0]!, p: sx * 3.2, q: 3.7, extraYaw: Math.PI }]);
      // A planter along the back, and pots at the sides.
      on([{ key: pick(PLANTERS, "planter"), p: 0, q: -4.5 }]);
      for (const sx of [-1, 1]) if (dressUnit(seed, "pot", sx) < 0.6) on([{ key: pick(POT_PLANTS, "potkey", sx), p: sx * 4.4, q: 0.5 }]);
    }
  }

  return out;
}

// ---- derived inputs ----

/**
 * The parking lots and plazas of a town, from its terrace runs alone (`Town.openLots` is not on the scene bundle, and 052 may not edit the scene): a run that ends at a parking lot
 * (`endAbuts` "parking") has it from its far end, and a run that ends at a plaza has the plaza at the corner past that end, on the next row. Same numbers as `town.ts` lays them
 * (a test pins every map on the ladder); a plaza whose row before has no run ending at it is not found. Each is `{ kind, run, x, z, w, d, yaw }`; a plaza's `run` is the run that ends at it.
 */
export function openLotsOf(runs: readonly TerraceRun[], lots: readonly Lot[]): OpenLot[] {
  const out: OpenLot[] = [];
  const parkW = PARKING_W_M * SC;
  const parkD = PARKING_D_M * SC;
  const plazaW = PLAZA_W_M * SC;
  for (const run of runs) {
    const lot0 = lots[run.lots[0] ?? -1];
    if (!lot0 || (run.endAbuts !== "parking" && run.endAbuts !== "plaza")) continue;
    const fx = Math.sin(lot0.yaw);
    const fz = Math.cos(lot0.yaw);
    if (run.endAbuts === "parking") {
      const c = { x: run.ax + run.ux * (run.len + parkW / 2) - fx * (parkD / 2), z: run.az + run.uz * (run.len + parkW / 2) - fz * (parkD / 2) };
      out.push({ kind: "parking", run: run.id, x: c.x, z: c.z, w: parkW, d: parkD, yaw: Math.atan2(fx, fz) });
    } else {
      // E is where the row's front line ends; the plaza is on the next row: E + u * plazaW / 2 (along the corner) - f * plazaW / 2 (into the block).
      const ex = run.ax + run.ux * run.len;
      const ez = run.az + run.uz * run.len;
      out.push({ kind: "plaza", run: run.id, x: ex + run.ux * (plazaW / 2) - fx * (plazaW / 2), z: ez + run.uz * (plazaW / 2) - fz * (plazaW / 2), w: plazaW, d: plazaW, yaw: Math.atan2(run.ux, run.uz) });
    }
  }
  return out;
}

/**
 * The alley at a run's far end, in the run's own frame, or null: only a run that ends at a corner has a wall to leave one to, and the gap must be `alleyMin` to `alleyMax` metres.
 * `lastBlock` is the last packed block's lot (its centre and width, world units); `farGap_m` and `farOverhang_m` are the packer's (`PackResult`): the pieces end `farOverhang_m` past the
 * block's columns, and the gap runs from there.
 */
export function alleyOf(
  run: Pick<TerraceRun, "ax" | "az" | "ux" | "uz" | "endAbuts">,
  lastBlock: Pick<Lot, "x" | "z" | "w"> | null,
  farGap_m: number,
  farOverhang_m: number,
  alleyMin: number,
  alleyMax: number,
): Alley | null {
  if (!lastBlock || run.endAbuts !== "corner" || farGap_m < alleyMin - 1e-9 || farGap_m > alleyMax + 1e-9) return null;
  const centre = ((lastBlock.x - run.ax) * run.ux + (lastBlock.z - run.az) * run.uz) / SC;
  return { s0: centre + lastBlock.w / SC / 2 + farOverhang_m, gap: farGap_m };
}
