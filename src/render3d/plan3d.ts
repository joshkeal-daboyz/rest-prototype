/**
 * The city plan, drawn in 3D (ticket 070, section E; dev only: `?view=3d&city=plan&stage=assemble`, or `stage=9`). Stage 9 of the pipeline: it draws the plan and decides nothing. Everything here is read from the layers
 * `src/city/` wrote (`streets`, `mass`, `edge`); nothing is chosen, moved or dropped that a layer placed. Where a layer does not say what to draw, `PlanStopError` names the cells (the ticket's stop rule) and the gap is a
 * re-cut of that layer's section.
 *
 * Four things are drawn, each from the plan's own records:
 * - the street pieces: every `edge.ground` record, through `tileGroupOf` (the tile city's own instancing), with `planKeyOf` choosing the piece. It is `tileKeyOf` except: a `pavementDip` pavement cell is `Sidewalk_Dip_01`;
 *   a lane of a one-way street is `Road_Lines_01` (`Road_Bare_01` when that is absent), never a yellow-line piece; and a lane cell of `streets.arrows` is `SM_Env_Road_Arrow_01`, a whole 5 m road tile (measured: 25 m2 of
 *   asphalt, the arrow painted on it, 0 m high) turned so its arrow points with the traffic (`PLAN_FRONTS`);
 * - the kerb: `planKerbPlan` turns `edge.kerb` into the faces the pieces and code strips stand on, recomputing no line;
 * - the interiors: every `mass.cells` cell that is not built, through `interiorGroupOf` (`massInteriorItems`), with `ParkingLines_01` over each row of a court's stalls;
 * - the mass: every built cell is a plain grey box, `CITY_STOREYS.min` storeys high, one `InstancedMesh`.
 * No props, gates or passage floors are drawn (stages 7 and 8 have none yet).
 */

import {
  BoxGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Vector3,
  type Material,
  type WebGLRenderer,
} from "three";
import { type AssetEntry, type CalibrationKey, type CityCell, type CityGroundCell, type CityKerbPath, type CityMassLayer, type CityPlan, type CityPlanRun, type CitySide, type CityStageFailure, type CityStreetsLayer } from "../core";
import { runCity } from "../city/pipeline";
import type { Insets } from "../render/geometry";
import { CITY_STOREYS } from "./citymetrics";
import { createDayToggle, pageDayToggleHost, type DayToggle, type DayToggleHost } from "./daytoggle";
import { applyLightMode, addSurface, newLightOwners, setRendererMode, type LightOwners } from "./lightrig";
import { lightModeFor, type LightModeId } from "./lighting";
import { WORLD_PER_METRE } from "./models";
import { sharedTileModels, tileInput, type ModelSet } from "./models3d";
import { planViewRequested } from "./planview";
import type { MapRenderer3d } from "./renderer";
import { GROUND } from "./scene";
import { STREET_CAM_BACK_M, STREET_CAM_EYE_M, STREET_CAM_FOV_DEG, STREET_CAM_LOOK_M } from "./streetcam";
import { SIDEWALK_WALK_M, TILE_M, type TileCell, type TileYaw } from "./tilecity";
import { createCityRig, interiorGroupOf, propInput, tileGroupOf, tileKeyOf, type CityRig, type InteriorDraw, type TileDraw } from "./tilecity3d";
import { STOREY_M } from "./town";
import { CITY_GROUND_VARIANT as V } from "../core";
import type { KerbFace, KerbPlan, Mp } from "./kerbline";
import {
  INTERIOR_DRAW_CALLS_MAX,
  KERB_FACES_M,
  KERB_INSET_M,
  KERB_LIP_TOP_M,
  STALL_LINES_LIFT_M,
  TILE_DRAW_CALLS_MAX,
  TILE_FRONTS,
  TILE_SLOTS,
  TILE_TREES,
  tileKeys,
  type InteriorItem,
  type InteriorKind,
} from "./tileslots";
import type { PropPlace } from "./tilecity3d";

const S = WORLD_PER_METRE;
const k = (name: string): CalibrationKey => `city-pack:${name}`;

// ---- the pieces E adds to the tile city's ----

/** The painted arrow of a one-way street: a whole 5 m road tile (the arrow on asphalt, edge lines both sides), not a decal. */
export const PLAN_ARROW: CalibrationKey = k("SM_Env_Road_Arrow_01");
/** A one-way street's lane: white edge lines both sides and no centre mark (it already has a `TILE_FRONTS` turn). */
export const PLAN_LINES: CalibrationKey = k("SM_Env_Road_Lines_01");
const PLAN_BARE: CalibrationKey = k("SM_Env_Road_Bare_01");
const PLAN_DIP: CalibrationKey = TILE_SLOTS.kerbCut[0]!;

/**
 * The turn, degrees, added to a cell's yaw so a piece's own axes land where the plan says, as `TILE_FRONTS` does (in a cell's own frame the street runs along x). Measured from the converted City Pack (20 Nov 2026,
 * `plan3d.test.ts` re-measures it when the GLB is on the machine): `Road_Arrow_01`'s arrow is painted along the piece's +z (the stem at -z, the head at +z), with its edge lines along z. Turned 90 it points along the
 * cell frame's +x, which is the traffic's direction once the cell's yaw puts that frame's +x on the street's flow (`arrowYaw`). Every other key keeps `TILE_FRONTS`'s line.
 */
export const PLAN_FRONTS: Readonly<Partial<Record<CalibrationKey, 0 | 90 | 180 | 270>>> = { ...TILE_FRONTS, [PLAN_ARROW]: 90 };

/** The cell yaw that puts the cell frame's +x (the arrow's direction once turned by `PLAN_FRONTS`) on `toward`: the frame's +x under yaw p is (cos p, -sin p) in (x, z). */
export function arrowYaw(toward: CitySide): TileYaw {
  return toward === "+x" ? 0 : toward === "-x" ? 180 : toward === "+z" ? 270 : 90;
}

/** The keys the plan's renderer loads: the tile city's, plus the arrow. */
export function planKeys(): CalibrationKey[] {
  return [...tileKeys(), PLAN_ARROW];
}

/** A plan the drawing cannot draw as given (the stop rule): what, and the cells. */
export class PlanStopError extends Error {
  readonly cells: readonly CityCell[];
  constructor(message: string, cells: readonly CityCell[]) {
    super(message);
    this.name = "PlanStopError";
    this.cells = cells;
  }
}

// ---- the page's flags ----

export interface PlanAssembleRequest {
  blocksX: number;
  blocksZ: number;
  seed: number;
  /** `cam=street`: the street camera (see `planStreetPose`); else the overhead one. */
  street: boolean;
  /** `at=i,j` (a cell) and `dir` (`+x`, `-x`, `+z`, `-z`), or null. Only the street camera reads them. */
  at: CityCell | null;
  dir: CitySide | null;
}

/**
 * What the page asks of the assembled plan, or null when it does not ask: `city=plan` and `stage=assemble` (or 9). `blocks` and `seed` are read as `planViewRequested` reads them (the default is 6 x 6 seed 1, one-way
 * on). `cam=street`, `at=i,j` and `dir=+x|-x|+z|-z` steer the street camera. Pure; renderer.ts passes the address in, behind `import.meta.env.DEV`.
 */
export function planAssembleRequested(search: string): PlanAssembleRequest | null {
  const base = planViewRequested(search);
  if (base === null) return null;
  const stage = base.stageText.toLowerCase();
  if (stage !== "assemble" && stage !== "9") return null;
  const q = new URLSearchParams(search);
  const m = /^(\d+),(\d+)$/.exec((q.get("at") ?? "").trim());
  const dir = (q.get("dir") ?? "").trim();
  return {
    blocksX: base.blocksX,
    blocksZ: base.blocksZ,
    seed: base.seed,
    street: q.get("cam") === "street",
    at: m ? { i: Number.parseInt(m[1]!, 10), j: Number.parseInt(m[2]!, 10) } : null,
    dir: dir === "+x" || dir === "-x" || dir === "+z" || dir === "-z" ? dir : null,
  };
}

/** The line the failure is shown as: the stage, the seed and the size, and the reason (nothing is drawn). Pure. */
export function planFailureText(f: CityStageFailure): string {
  return `City plan failed at stage "${f.stage}" (seed ${f.seed}, ${f.blocksX} x ${f.blocksZ}): ${f.reason}`;
}

// ---- the street pieces ----

/** The street pieces as `TileCell`s: one per `edge.ground` record (the same fields), and which of them carry an arrow and which are a one-way street's lane. */
export interface PlanCells {
  cells: TileCell[];
  /** The cells of `streets.arrows`, drawn from `PLAN_ARROW` (their yaw is `arrowYaw`'s). */
  arrows: ReadonlySet<TileCell>;
  /** The lane cells of a street whose `flow` is not "both". */
  oneWay: ReadonlySet<TileCell>;
}

const cellId = (i: number, j: number): string => `${i},${j}`;

/**
 * The ground records as cells (`CityGroundCell` has `TileCell`'s fields, so each is copied as it is), the arrow cells turned by `arrowYaw` (the patch bit the layer set stays), and the one-way lanes marked. Throws
 * `PlanStopError` when an arrow is on no lane record. Pure.
 */
export function planCells(streets: CityStreetsLayer, ground: readonly CityGroundCell[]): PlanCells {
  const flowOf = new Map(streets.streets.map((s) => [s.id, s.flow] as const));
  const arrowAt = new Map(streets.arrows.map((a) => [cellId(a.i, a.j), a] as const));
  const arrows = new Set<TileCell>();
  const oneWay = new Set<TileCell>();
  const seen = new Set<string>();
  const cells = ground.map((g) => {
    const a = g.role === "lane" ? arrowAt.get(cellId(g.i, g.j)) : undefined;
    const cell: TileCell = { i: g.i, j: g.j, cells: g.cells, role: g.role, variant: g.variant, x_m: g.x_m, z_m: g.z_m, yaw: g.yaw, street: g.street };
    if (a !== undefined) {
      seen.add(cellId(g.i, g.j));
      cell.yaw = arrowYaw(a.toward);
      arrows.add(cell);
    }
    if (g.role === "lane" && g.street !== null && (flowOf.get(g.street) ?? "both") !== "both") oneWay.add(cell);
    return cell;
  });
  const lost = streets.arrows.filter((a) => !seen.has(cellId(a.i, a.j)));
  if (lost.length > 0) throw new PlanStopError(`${lost.length} arrow cell(s) of the streets layer are on no lane record of the edge layer's ground`, lost.map((a) => ({ i: a.i, j: a.j })));
  return { cells, arrows, oneWay };
}

/**
 * The key a street cell is drawn from among the `active` ones (null: in code): `tileKeyOf`'s, except an arrow cell is the arrow, a one-way street's lane is `Road_Lines_01` (or `Road_Bare_01` when that is absent: never a
 * yellow-line piece), and a `pavementDip` cell with no flush build-out is `Sidewalk_Dip_01` (null when it is not active, the cell then drawn in code).
 */
export function planKeyOf(cell: TileCell, active: ReadonlySet<CalibrationKey>, set: Pick<PlanCells, "arrows" | "oneWay">): CalibrationKey | null {
  if (cell.role === "lane") {
    if (set.arrows.has(cell) && active.has(PLAN_ARROW)) return PLAN_ARROW;
    if (set.oneWay.has(cell)) return active.has(PLAN_LINES) ? PLAN_LINES : active.has(PLAN_BARE) ? PLAN_BARE : null;
  }
  if (cell.role === "pavement" && (cell.variant & V.pavementDip) !== 0 && (cell.variant & V.pavementFlush) !== 0) throw new PlanStopError(`pavement cell (${cell.i}, ${cell.j}) is both a dropped kerb and flush: the layer does not say which to draw`, [{ i: cell.i, j: cell.j }]);
  if (cell.role === "pavement" && (cell.variant & V.pavementDip) !== 0) return active.has(PLAN_DIP) ? PLAN_DIP : null;
  return tileKeyOf(cell, active);
}

// ---- the kerb ----

const plus = (p: Mp, d: Mp, m: number): Mp => ({ x: p.x + d.x * m, z: p.z + d.z * m });

/** The inset of a piece's kerb face on +z (its carriageway side): `KERB_FACES_M`'s, or `KERB_INSET_M` when the key has none. */
function insetOf(key: CalibrationKey | null): { inset: number; top: number } {
  const f = key === null ? undefined : KERB_FACES_M[key]?.find((q) => q.side === "+z");
  return f ? { inset: f.inset_m, top: f.top_m } : { inset: KERB_INSET_M, top: KERB_LIP_TOP_M };
}

/**
 * The faces one seg of the kerb line brings, as `tileKerbPlan` puts them on the old path's: an `edge`, `crossingDip` or `dip` seg's cell brings its piece's face at the piece's inset (none for a flush pavement cell; a build-out's
 * `under` cell brings its own, one cell in), a `flank` is a code strip, a `return` a code strip from the street kerb face to its building-line end, an `opening` nothing. Recomputes no line.
 */
export function kerbSegFaces(path: Pick<CityKerbPath, "across" | "segs">, seg: CityKerbPath["segs"][number], cellOf: (c: CityCell) => TileCell | null, keyOf: (c: TileCell) => CalibrationKey | null): KerbFace[] {
  const out: KerbFace[] = [];
  if (seg.kind === "opening") return out;
  if (seg.kind === "edge" || seg.kind === "crossingDip" || seg.kind === "dip") {
    const c = seg.cell === null ? null : cellOf(seg.cell);
    if (c === null) return out;
    const add = (cell: TileCell, shift: number): void => {
      if (cell.role === "pavement" && (cell.variant & V.pavementFlush) !== 0) return;
      const key = keyOf(cell);
      const { inset, top } = insetOf(key);
      out.push({ kind: key === null ? "code" : "pack", part: seg.kind === "dip" ? "dip" : "edge", a: plus(seg.a, seg.walk, shift + inset), b: plus(seg.b, seg.walk, shift + inset), walk: seg.walk, top_m: key === null ? KERB_LIP_TOP_M : top, inset_m: inset, cell: { i: cell.i, j: cell.j } });
    };
    add(c, 0);
    const under = seg.under === null ? null : cellOf(seg.under);
    if (under !== null) add(under, TILE_M);
  } else if (seg.kind === "flank") {
    out.push({ kind: "code", part: "flank", a: plus(seg.a, path.across, KERB_INSET_M), b: plus(seg.b, path.across, KERB_INSET_M), walk: seg.walk, top_m: KERB_LIP_TOP_M, inset_m: 0, cell: null });
  } else {
    // A return: the path runs in along the near one and out along the far one, so the street end is the near one's first point and the far one's last; its other end is `CityKerbReturn.end`, on the building line.
    const streetEnd = seg.which === "near" ? seg.a : seg.b;
    const buildingLine = seg.which === "near" ? seg.b : seg.a;
    out.push({ kind: "code", part: "return", a: plus(streetEnd, path.across, KERB_INSET_M), b: buildingLine, walk: seg.walk, top_m: KERB_LIP_TOP_M, inset_m: 0, cell: seg.cell === null ? null : { i: seg.cell.i, j: seg.cell.j } });
  }
  return out;
}

/** The cell at a lattice cell, a two-cell tile on both its cells. */
export function cellLookup(ground: readonly TileCell[]): (c: CityCell) => TileCell | null {
  const at = new Map<string, TileCell>();
  for (const c of ground) {
    at.set(cellId(c.i, c.j), c);
    if (c.cells === 2) {
      const alongX = c.yaw === 0 || c.yaw === 180;
      at.set(alongX ? cellId(c.i + 1, c.j) : cellId(c.i, c.j + 1), c);
    }
  }
  return (c) => at.get(cellId(c.i, c.j)) ?? null;
}

/** What the drawing puts on `edge.kerb`: every seg's faces (`kerbSegFaces`), in the paths' order. `keyOf` is the key each ground cell is drawn from (null: in code). Pure. */
export function planKerbPlan(kerb: readonly CityKerbPath[], ground: readonly TileCell[], keyOf: (c: TileCell) => CalibrationKey | null): KerbPlan {
  const cellOf = cellLookup(ground);
  const faces: KerbFace[] = [];
  for (const p of kerb) for (const seg of p.segs) faces.push(...kerbSegFaces(p, seg, cellOf, keyOf));
  return { faces };
}

// ---- the interiors ----

/** Mass use to interior kind (the ticket's table). `lane`, `stalls`, `aisle` and `frontLot` are the bare road; a drive, walk-through and lane mouth are the paved inlet. */
const KIND_OF_USE: Readonly<Record<Exclude<CityMassLayer["cells"][number]["use"], "built">, { kind: InteriorKind; role: InteriorItem["role"] }>> = {
  apron: { kind: "apron", role: "apron" },
  plaza: { kind: "apron", role: "apron" },
  green: { kind: "green", role: "green" },
  greenPath: { kind: "path", role: "greenPath" },
  parkEdge: { kind: "parkEdge", role: "parkEdge" },
  drive: { kind: "inlet", role: "drive" },
  walk: { kind: "inlet", role: "drive" },
  laneMouth: { kind: "inlet", role: "drive" },
  lane: { kind: "bare", role: "alley" },
  stalls: { kind: "bare", role: "court" },
  aisle: { kind: "bare", role: "court" },
  frontLot: { kind: "bare", role: "court" },
};

/**
 * The interior items of a mass layer: one per cell that is not built (`KIND_OF_USE`), then the `stalls` items: each court's stall cells that the mass layer calls `stalls` (a frontage lot's are `frontLot` cells: bare,
 * with no row to line) are runs along a row, paired from the run's low end (`ParkingLines_01` is two cells) and turned toward the row's aisle cells. A run that is not one straight row, is of odd length, or has aisle cells
 * on both of its sides or on neither is not a row the layer says how to draw: `PlanStopError`. Pure.
 */
export function massInteriorItems(mass: CityMassLayer): InteriorItem[] {
  const items: InteriorItem[] = [];
  const use = new Map<string, string>();
  for (const c of mass.cells) {
    use.set(cellId(c.i, c.j), c.use);
    if (c.use === "built") continue;
    const m = KIND_OF_USE[c.use];
    items.push({ kind: m.kind, role: m.role, i: c.i, j: c.j, x_m: (c.i + 0.5) * TILE_M, z_m: (c.j + 0.5) * TILE_M, yaw: 0, cells: 1 });
  }
  for (const court of mass.courts) {
    const stall = court.stallCells.filter((c) => use.get(cellId(c.i, c.j)) === "stalls");
    const left = new Map(stall.map((c) => [cellId(c.i, c.j), c] as const));
    const aisle = new Set(court.aisleCells.map((c) => cellId(c.i, c.j)));
    for (const first of stall) {
      if (!left.has(cellId(first.i, first.j))) continue;
      const run: CityCell[] = [first];
      left.delete(cellId(first.i, first.j));
      for (let q = 0; q < run.length; q++) {
        const a = run[q]!;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const n = left.get(cellId(a.i + di, a.j + dj));
          if (n === undefined) continue;
          left.delete(cellId(n.i, n.j));
          run.push(n);
        }
      }
      const alongX = run.every((c) => c.j === run[0]!.j);
      const alongZ = run.every((c) => c.i === run[0]!.i);
      if (!alongX && !alongZ) throw new PlanStopError(`court ${court.opening}: stall cells that are not one straight row`, run);
      if (run.length % 2 !== 0) throw new PlanStopError(`court ${court.opening}: a row of ${run.length} stall cells cannot be paired into two-cell stalls`, run);
      run.sort((p, q) => (alongX ? p.i - q.i : p.j - q.j));
      let plusSide = 0;
      let minusSide = 0;
      for (const c of run) {
        if (aisle.has(alongX ? cellId(c.i, c.j + 1) : cellId(c.i + 1, c.j))) plusSide++;
        if (aisle.has(alongX ? cellId(c.i, c.j - 1) : cellId(c.i - 1, c.j))) minusSide++;
      }
      if ((plusSide > 0) === (minusSide > 0)) throw new PlanStopError(`court ${court.opening}: a row of stalls with aisle cells on ${plusSide > 0 ? "both sides" : "neither side"}`, run);
      // The front of a piece at yaw 0 is +z: the aisle on +z is yaw 0 and on -z 180 (a row along x); on +x 90 and on -x 270 (a row along z).
      const yaw: TileYaw = alongX ? (plusSide > 0 ? 0 : 180) : plusSide > 0 ? 90 : 270;
      for (let n = 0; n < run.length; n += 2) {
        const a = run[n]!;
        const b = run[n + 1]!;
        items.push({ kind: "stalls", role: "court", i: a.i, j: a.j, x_m: ((a.i + b.i + 1) / 2) * TILE_M, z_m: ((a.j + b.j + 1) / 2) * TILE_M, yaw, cells: 2 });
      }
    }
  }
  return items;
}

// ---- the mass ----

/** The grey of the massing: a plain grey box (no style, no colourway: those are stages 5 and later). */
export const MASS_GREY = 0x8f949c;
/** How high a built cell stands, metres: `CITY_STOREYS.min` storeys. */
export const MASS_HEIGHT_M = CITY_STOREYS.min * STOREY_M;

export interface MassDraw {
  mesh: InstancedMesh;
  /** One instance per built cell, in `mass.built`'s order. */
  count: number;
  dispose(): void;
}

function massBoxes(mass: CityMassLayer): MassDraw {
  const geometry = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const material = new MeshStandardMaterial({ color: MASS_GREY, roughness: 1 });
  const mesh = new InstancedMesh(geometry, material, Math.max(mass.built.length, 1));
  mesh.name = "plan:mass";
  const m = new Matrix4();
  const q = new Quaternion();
  const p = new Vector3();
  const sc = new Vector3(TILE_M * S, MASS_HEIGHT_M * S, TILE_M * S);
  mass.built.forEach((b, i) => mesh.setMatrixAt(i, m.compose(p.set((b.i + 0.5) * TILE_M * S, 0, (b.j + 0.5) * TILE_M * S), q, sc)));
  mesh.count = mass.built.length;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.raycast = () => {};
  return {
    mesh,
    count: mass.built.length,
    dispose() {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    },
  };
}

// ---- plan to scene ----

export interface PlanDraw {
  /** The tiles, the interiors and the mass, in one group. */
  group: Group;
  tiles: TileDraw;
  interior: InteriorDraw;
  mass: MassDraw;
  /** The ground cells the street pieces were drawn from, and the interior items, as the drawing took them. */
  cells: readonly TileCell[];
  items: readonly InteriorItem[];
  kerb: KerbPlan;
  dispose(): void;
}

const NO_PROPS: readonly PropPlace[] = [];

/**
 * The plan as a group (see the file's header). `roots` and `entries` are the pack's pieces by key (empty: every cell in code). Needs the `streets`, `mass` and `edge` layers, with the edge's `ground` and `kerb` (D2).
 * Draws only: it reads the layers and writes none. Throws `PlanStopError` where a layer does not say how to draw something.
 */
export function plan3dGroups(plan: CityPlan, roots: ReadonlyMap<CalibrationKey, Object3D>, entries: ReadonlyMap<CalibrationKey, AssetEntry>): PlanDraw {
  const { streets, mass, edge } = plan.layers;
  if (!streets || !mass || !edge) throw new PlanStopError("the plan has no streets, mass and edge layers to draw", []);
  if (!edge.ground || !edge.kerb) throw new PlanStopError("the edge layer has no ground and kerb (stage 4 writes them from D2)", []);
  const set = planCells(streets, edge.ground);
  const kerb = edge.kerb;
  const tiles = tileGroupOf(
    {
      cells: set.cells,
      buildoutTrees: edge.buildoutTrees,
      seed: plan.options.seed,
      keys: [...planKeys(), ...TILE_TREES],
      keyOf: (c, active) => planKeyOf(c, active, set),
      kerb: (keyOf) => planKerbPlan(kerb, set.cells, keyOf),
      fronts: PLAN_FRONTS,
    },
    roots,
    entries,
    TILE_DRAW_CALLS_MAX,
  );
  const items = massInteriorItems(mass);
  const interior = interiorGroupOf(items, NO_PROPS, [], [], plan.options.seed, roots, entries, INTERIOR_DRAW_CALLS_MAX);
  const boxes = massBoxes(mass);
  const group = new Group();
  group.name = "plan3d";
  group.add(tiles.group, interior.group, boxes.mesh);
  return {
    group,
    tiles,
    interior,
    mass: boxes,
    cells: set.cells,
    items,
    kerb: tiles.kerb,
    dispose() {
      tiles.dispose();
      interior.dispose();
      boxes.dispose();
    },
  };
}

/** The pieces `planKeys` names that a loaded model set offers, with the trees: roots and entries by key (the way the tile city's renderer reads them). */
export function planInput(set: ModelSet): { roots: Map<CalibrationKey, Object3D>; entries: Map<CalibrationKey, AssetEntry> } {
  const input = tileInput(set);
  const props = propInput(set);
  return { roots: new Map([...(input?.roots ?? []), ...props.roots]), entries: new Map([...(input?.entries ?? []), ...props.entries]) };
}

// ---- the street camera ----

export interface PlanStreetPose {
  /** World units. */
  eye: readonly [number, number, number];
  look: readonly [number, number, number];
  /** The way it looks along, on the lattice. */
  dir: CitySide;
}

const UNIT: Readonly<Record<CitySide, readonly [number, number]>> = { "+x": [1, 0], "-x": [-1, 0], "+z": [0, 1], "-z": [0, -1] };

/**
 * Where the street camera stands: on `at` (a cell, default the first arrow's, else the first street's middle lane cell) looking along `dir` (default the arrow's way, else the street's axis, +x or +z), `STREET_CAM_BACK_M` behind
 * the point and `STREET_CAM_EYE_M` up, at the point `STREET_CAM_LOOK_M` up (streetcam.ts's numbers, the tile city's street camera sans its row of buildings, which a plan has none of yet). Pure; null for a plan with no street.
 */
export function planStreetPose(streets: CityStreetsLayer, req: Pick<PlanAssembleRequest, "at" | "dir">): PlanStreetPose | null {
  const arrow = streets.arrows[0];
  const first = streets.streets[0];
  let at: CityCell | null = req.at;
  let dir: CitySide | null = req.dir;
  if (at === null) {
    if (arrow) at = { i: arrow.i, j: arrow.j };
    else if (first) {
      const mid = Math.floor((first.span.lo + first.span.hi) / 2);
      const lane = first.across0 + Math.max(0, first.bands.indexOf("lane"));
      at = first.axis === "x" ? { i: mid, j: lane } : { i: lane, j: mid };
    }
  }
  if (at === null) return null;
  if (dir === null) dir = arrow && req.at === null ? arrow.toward : (first?.axis ?? "x") === "x" ? "+x" : "+z";
  const [dx, dz] = UNIT[dir];
  const px = (at.i + 0.5) * TILE_M;
  const pz = (at.j + 0.5) * TILE_M;
  return { eye: [(px - dx * STREET_CAM_BACK_M) * S, STREET_CAM_EYE_M * S, (pz - dz * STREET_CAM_BACK_M) * S], look: [px * S, STREET_CAM_LOOK_M * S, pz * S], dir };
}

// ---- the renderer ----

export interface PlanRendererOptions {
  insets?: Insets | undefined;
  dpr: number;
  /** The page's query string (`light=night`); renderer.ts passes it in. */
  search: string;
  /** The models to load once the view is up (default: the page's shared tile load). A test passes its own so nothing is fetched. */
  load?: () => Promise<ModelSet>;
  /** The window's keys and the button maker for the day and night switch (default: the page's). */
  toggleHost?: DayToggleHost;
  /** The plan to draw (default: the one `req` asks for). */
  run?: CityPlanRun;
}

/** The ground under the whole city reaches this far (metres) past its edge, and lies this far (metres) under the carriageway surface. */
const GROUND_MARGIN_M = 60;
const GROUND_BELOW_M = 0.02;

/**
 * The 3D view of the assembled plan (dev only): the same interface as the tile city's renderer. It runs the pipeline up to the edge stage; a run that fails draws nothing and shows the failure's stage and reason as text
 * over the page. The city opens from above on the tile city's rig (day, `light=night` for the game's night; the L key and the button flip it) or, with `cam=street`, from the street (`planStreetPose`). The models load once
 * the view is up; until they do (and if they never do) every piece is code-drawn.
 */
export function createPlanAssembleRenderer3d(gl: WebGLRenderer, canvas: HTMLCanvasElement, req: PlanAssembleRequest, opts: PlanRendererOptions): MapRenderer3d {
  const w0 = Math.max(canvas.clientWidth, 1);
  const h0 = Math.max(canvas.clientHeight, 1);
  // The plan page has no HUD to keep clear (the puzzle HUD is not the plan's), and the page's insets measure that HUD: a tall one leaves the rig no room to fit the city and it backs off past the far plane (blank sky). They are ignored.
  let insets: Insets = {};
  let disposed = false;
  const run = opts.run ?? runCity({ blocksX: req.blocksX, blocksZ: req.blocksZ, seed: req.seed }, "edge");
  const lightId0: LightModeId = lightModeFor("tiles", opts.search, import.meta.env.DEV);
  const scene = new Scene();
  const owners: LightOwners = newLightOwners();
  applyLightMode(scene, gl, lightId0, owners);

  let draw: PlanDraw | null = null;
  let note: { remove(): void } | null = null;
  let frame = { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  let ground: Mesh | null = null;
  let stopText: string | null = null;
  const plan: CityPlan | null = run.ok ? run.plan : null;
  const streetsLayer = plan?.layers.streets;
  if (!run.ok) stopText = planFailureText(run.failure);
  if (stopText === null && streetsLayer) {
    frame = { minX: 0, minY: 0, maxX: streetsLayer.w * TILE_M * S, maxY: streetsLayer.h * TILE_M * S };
    ground = new Mesh(
      new BoxGeometry(frame.maxX - frame.minX + 2 * GROUND_MARGIN_M * S, 0.1, frame.maxY - frame.minY + 2 * GROUND_MARGIN_M * S),
      new MeshStandardMaterial({ color: GROUND, roughness: 1 }),
    );
    ground.position.set((frame.minX + frame.maxX) / 2, -SIDEWALK_WALK_M * S - GROUND_BELOW_M * S - 0.05, (frame.minY + frame.maxY) / 2);
    ground.raycast = () => {};
    addSurface(owners, "ground", ground.material as Material);
    scene.add(ground);
  }
  const build = (roots: ReadonlyMap<CalibrationKey, Object3D>, entries: ReadonlyMap<CalibrationKey, AssetEntry>): void => {
    if (!plan || stopText !== null) return;
    try {
      const next = plan3dGroups(plan, roots, entries);
      if (draw) {
        scene.remove(draw.group);
        draw.dispose();
      }
      draw = next;
      scene.add(draw.group);
      for (const key of ["street", "pavement", "kerb", "grass"]) {
        const mats = [...(draw.tiles.surfaces.get(key) ?? []), ...(draw.interior.surfaces.get(key) ?? [])];
        if (mats.length > 0) owners.materials.set(key, mats);
        else owners.materials.delete(key);
      }
      applyLightMode(scene, null, (scene.userData["lightMode"] as LightModeId | undefined) ?? lightId0, owners);
    } catch (e) {
      if (!(e instanceof PlanStopError)) throw e;
      stopText = `City plan cannot be drawn: ${e.message}`;
      console.info(stopText, e.cells);
      showText(stopText);
    }
  };
  const showText = (text: string): void => {
    note?.remove();
    note = null;
    console.info(text);
    const host = typeof document !== "undefined" ? canvas.parentElement : null;
    if (!host || typeof document === "undefined") return;
    const el = document.createElement("div");
    el.textContent = text;
    el.style.cssText = "position:absolute;left:12px;right:12px;top:12px;padding:10px 12px;background:rgba(20,10,10,0.88);color:#ffd9d0;font:14px/1.35 sans-serif;border-radius:6px;pointer-events:none;z-index:5;";
    host.appendChild(el);
    note = { remove: () => el.remove() };
  };
  if (stopText !== null) showText(stopText);
  else build(new Map(), new Map());

  const rig: CityRig = createCityRig(frame, w0, h0, insets);
  const pose = streetsLayer && req.street ? planStreetPose(streetsLayer, req) : null;
  const streetCam = pose ? new PerspectiveCamera(STREET_CAM_FOV_DEG, w0 / h0, 0.1, 2000) : null;
  if (streetCam && pose) {
    streetCam.position.set(...pose.eye);
    streetCam.lookAt(...pose.look);
  }
  const camera = (): PerspectiveCamera => streetCam ?? rig.camera;

  let toggle: DayToggle | null = null;
  if (import.meta.env.DEV) {
    let mode: LightModeId = lightId0;
    toggle = createDayToggle(opts.toggleHost ?? pageDayToggleHost(), mode, () => {
      mode = mode === "day" ? "night" : "day";
      applyLightMode(scene, gl, mode, owners);
      toggle?.sync(mode);
    });
  }

  function resize(): void {
    const w = Math.max(canvas.clientWidth, 1);
    const h = Math.max(canvas.clientHeight, 1);
    gl.setPixelRatio(opts.dpr);
    gl.setSize(w, h, false);
    rig.resize(w, h, insets);
    if (streetCam) {
      streetCam.aspect = w / h;
      streetCam.updateProjectionMatrix();
    }
  }
  resize();

  // The models: one load for the page, then the pieces swap in. A failure leaves every piece code-drawn and costs one line.
  const load = opts.load ?? ((): Promise<ModelSet> => sharedTileModels(planKeys()));
  void load()
    .then((set) => {
      if (disposed || stopText !== null) return;
      const input = planInput(set);
      build(input.roots, input.entries);
      if (draw) console.info(`plan 3d: ${draw.tiles.fromPack} street pieces from the pack, ${draw.tiles.codeDrawn} code-drawn, ${draw.tiles.calls} + ${draw.interior.calls} draw calls (caps ${TILE_DRAW_CALLS_MAX} and ${INTERIOR_DRAW_CALLS_MAX}), ${draw.mass.count} built cells`);
    })
    .catch((e: unknown) => {
      console.info(`3D models: not applied (${e instanceof Error ? e.message : String(e)}).`);
    });

  // Left-drag pans (a touch drag too); the street camera does not pan.
  let drag: { id: number; startX: number; startY: number; startPan: { x: number; y: number } } | null = null;
  const onDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    drag = { id: e.pointerId, startX: e.clientX, startY: e.clientY, startPan: rig.getPan() };
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // A pointer that is already gone cannot be captured; the drag still works inside the canvas.
    }
  };
  const onMove = (e: PointerEvent): void => {
    if (!drag || e.pointerId !== drag.id || streetCam) return;
    rig.setPan(drag.startPan.x + (e.clientX - drag.startX), drag.startPan.y + (e.clientY - drag.startY));
  };
  const onUp = (e: PointerEvent): void => {
    if (drag && e.pointerId === drag.id) drag = null;
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  const touchAction = canvas.style.touchAction;
  canvas.style.touchAction = "none";

  return {
    draw() {
      gl.render(scene, camera());
    },
    hitTest: () => null,
    resize,
    setInsets() {
      insets = {};
      rig.resize(Math.max(canvas.clientWidth, 1), Math.max(canvas.clientHeight, 1), insets);
    },
    notify() {},
    setBlockers() {},
    placeAt: () => null,
    getPan: () => rig.getPan(),
    setPan: (x, y) => rig.setPan(x, y),
    resetView: () => rig.resetView(),
    getScale: () => rig.getScale(),
    zoomStep: (dir) => rig.zoomStep(dir),
    fitWhole: () => rig.resetView(),
    centreOn: () => rig.getPan(),
    dispose() {
      disposed = true;
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.style.touchAction = touchAction;
      toggle?.dispose();
      toggle = null;
      note?.remove();
      note = null;
      setRendererMode(gl, "night");
      if (draw) {
        scene.remove(draw.group);
        draw.dispose();
        draw = null;
      }
      if (ground) {
        ground.geometry.dispose();
        (ground.material as Material).dispose();
      }
    },
  };
}
