/**
 * The city plan, drawn in 3D (ticket 070, section E; dev only: `?view=3d&city=plan&stage=assemble`, or `stage=9`). Stage 9 of the pipeline: it draws the plan and decides nothing. Everything here is read from the layers
 * `src/city/` wrote (`streets`, `mass`, `edge`, `buildings`); nothing is chosen, moved or dropped that a layer placed. Where a layer does not say what to draw, `PlanStopError` names the cells (the ticket's stop rule) and the gap is a
 * re-cut of that layer's section.
 *
 * Five things are drawn, each from the plan's own records:
 * - the street pieces: every `edge.ground` record, through `tileGroupOf` (the tile city's own instancing), with `planKeyOf` choosing the piece. It is `tileKeyOf` except: a `pavementDip` pavement cell is `Sidewalk_Dip_01`;
 *   a lane of a one-way street is `Road_Lines_01` (`Road_Bare_01` when that is absent), never a yellow-line piece; and a lane cell of `streets.arrows` is `SM_Env_Road_Arrow_01`, a whole 5 m road tile (measured: 25 m2 of
 *   asphalt, the arrow painted on it, 0 m high) turned so its arrow points with the traffic (`PLAN_FRONTS`);
 * - the kerb: `planKerbPlan` turns `edge.kerb` into the faces the pieces and code strips stand on, recomputing no line;
 * - the interiors: every `mass.cells` cell that is not built, through `interiorGroupOf` (`massInteriorItems`), with `ParkingLines_01` over each row of a court's stalls;
 * - the buildings (G): every piece of every column of the `buildings` layer, cloned from the pack at the placement stage 5 wrote (key, position, turn; never scaled), one group per building painted in its colourway;
 * - the ground storeys (G2): every `facades.ground` piece, cloned and placed the same way into its building's group;
 *   and one grey `InstancedMesh` of boxes (a ground slot whose piece is not drawn, or the whole column where a model above the ground is missing);
 * - the facades and the ground (J): every piece of `facades.dressing`, `walls`, `roofs` and `novelty` (stage 7) and every `ground.props` entry (stage 8), at its placement, through the tile city's own per-key instancer
 *   (`dressGroup`): no colourway, no grey fallback, nothing emissive. `planAudit` (R12) refuses a plan that places a never-used key (one allowance: the party-wall pipe).
 * - the traffic pieces (TR2, stage 9): every `traffic.pieces` entry at its placement, in the same instancer call as stage 8's props (props first; one cap), dark, with the stop sign on the `01_A` atlas when it loaded. `planAudit` allows
 *   Q33's five signal keys on their own piece kinds in the traffic layer and nowhere else.
 * No gates or passage floors are drawn.
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
  type Texture,
  type WebGLRenderer,
} from "three";
import { type AssetEntry, type CalibrationKey, type CityBuildingsLayer, type CityCell, type CityEra, type CityEraPiece, type CityEraRun, type CityEraStageFailure, type CityFacadesLayer, type CityGroundPieceKind, type CityGroundCell, type CityGroundPlace, type CityGroundProp, type CityWallBox, type CityKerbPath, type CityMassLayer, type CityPieceRole, type CityPlacement, type CityPlan, type CityPlanRun, type CitySide, type CityStageFailure, type CityStreetsLayer, type CityTechPieceKind, type CityTrafficPieceKind } from "../core";
import { CITY_ERAS } from "../core";
import { CityResolveError, resolvePlan, runCity, runCityEra } from "../city/pipeline";
import { TECH_BOUNDS } from "../city/tech/kit";
import type { Insets } from "../render/geometry";
import { createDayToggle, pageDayToggleHost, type DayToggle, type DayToggleHost } from "./daytoggle";
import { applyLightMode, addSurface, newLightOwners, setRendererMode, type LightOwners } from "./lightrig";
import { lightModeFor, type LightModeId } from "./lighting";
import { WORLD_PER_METRE } from "./models";
import { CODE_ESCAPE_KEY, type EscapePart } from "./escapes";
import { isNeverUsed } from "./citymetrics";
import { DRESS_DRAW_CALLS_MAX, dressKeys, type DressPiece } from "./dressing";
import { FURN_DRAW_CALLS_MAX, furnitureKeys, type FurniturePiece } from "./furniture";
import { STOP_SIGN_COLOURWAY } from "./colourway";
import { allStackKeys, createColourwayCache, dressGroup, dressInput, furniturePlacement, paintStack, sharedTileModels, stackRoots, tileInput, type DressPlacement, type ModelSet } from "./models3d";
import { planViewRequested } from "./planview";
import type { MapRenderer3d } from "./renderer";
import { GROUND } from "./scene";
import { STREET_CAM_BACK_M, STREET_CAM_EYE_M, STREET_CAM_FOV_DEG, STREET_CAM_LOOK_M } from "./streetcam";
import { SIDEWALK_WALK_M, TILE_M, type TileCell, type TileYaw } from "./tilecity";
import { createCityRig, interiorGroupOf, propInput, tileGroupOf, tileKeyOf, type CityRig, type InteriorDraw, type TileDraw } from "./tilecity3d";
import { CITY_GROUND_VARIANT as V } from "../core";
import type { KerbFace, KerbPlan, Mp } from "./kerbline";
import {
  INTERIOR_DRAW_CALLS_MAX,
  KERB_FACES_M,
  KERB_INSET_M,
  KERB_LIP_TOP_M,
  STALL_LINES_LIFT_M,
  INTERIOR_KEYS,
  TILE_DRAW_CALLS_MAX,
  TILE_FRONTS,
  TILE_PROPS,
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

/** The two corner-door keys stage 7 may place on a quiet corner. No stack style names them, so `allStackKeys()` does not bring them: the plan loads them by name with the tile keys. */
export const PLAN_DOOR_CORNERS: readonly CalibrationKey[] = [k("SM_Bld_Apartment_Door_Corner_01"), k("SM_Bld_Apartment_Door_Corner_02")];

/** The party-wall kit's two keys that no dressing or furniture list names (H2b): the window, and the one pipe that fits a party wall (`_01` never fits and is never drawn; Q23's PW3). */
export const PLAN_PARTY_WINDOW: CalibrationKey = k("SM_Prop_Window_01");
export const PLAN_PARTY_PIPE: CalibrationKey = k("SM_Prop_Pipe_Present_03");

/**
 * The seven keys stage 9 places, one per piece kind (070 TR2; the traffic kit's `KEY_OF_KIND`, which `plan3d.test.ts` compares; this file imports nothing from `src/city/traffic/`): the five signal keys (Josh's Q33, narrowed) and the stop
 * and parking signs.
 */
export const PLAN_TRAFFIC_KEYS: Readonly<Record<CityTrafficPieceKind, CalibrationKey>> = {
  signalMast: k("SM_Prop_LightPole_Base_01"),
  signalArm: k("SM_Prop_LightPole_Arm_01"),
  walkHead: k("SM_Prop_LightPole_CrossLights_01"),
  pushButton: k("SM_Prop_LightPole_CrossButton_01"),
  signalBox: k("SM_Prop_LightPole_Box_01"),
  stopSign: k("SM_Prop_Sign_Stop_01"),
  parkingSign: k("SM_Prop_Sign_Parking_01"),
};

/** R12's allowance (Josh, Q33, narrowed; 070 TR2): the five signal keys the never-used stem `SM_Prop_LightPole_` would refuse, each on its own piece kind only and only on a `traffic` piece. */
export const PLAN_TRAFFIC_ALLOWED: Readonly<Record<"signalMast" | "signalArm" | "walkHead" | "pushButton" | "signalBox", CalibrationKey>> = {
  signalMast: PLAN_TRAFFIC_KEYS.signalMast,
  signalArm: PLAN_TRAFFIC_KEYS.signalArm,
  walkHead: PLAN_TRAFFIC_KEYS.walkHead,
  pushButton: PLAN_TRAFFIC_KEYS.pushButton,
  signalBox: PLAN_TRAFFIC_KEYS.signalBox,
};

/** The keys the street pieces and the corner doors are drawn from (`tileGroupOf`'s active keys, before the trees): the tile city's, the arrow and the two corner doors. */
export function planTileKeys(): CalibrationKey[] {
  return [...tileKeys(), PLAN_ARROW, ...PLAN_DOOR_CORNERS];
}

/** The keys the plan's renderer loads by name: the tile keys, the party window and the party pipe (J), and the seven traffic keys (TR2). */
export function planKeys(): CalibrationKey[] {
  return [...planTileKeys(), PLAN_PARTY_WINDOW, PLAN_PARTY_PIPE, ...Object.values(PLAN_TRAFFIC_KEYS)];
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
  /** `era=clean|tech|holdout|ruin` (ticket 073 C2); "clean" when absent or unknown. */
  era: CityEra;
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
    era: base.era,
    dir: dir === "+x" || dir === "-x" || dir === "+z" || dir === "-z" ? dir : null,
  };
}

/**
 * What `city=tiles` asks (ticket 070 L1, Josh, 21 Nov 2026: "We need to integrate the new city design with the game itself."): the pipeline's city, exactly what `planAssembleRequested` gives for the same query with
 * `city=plan&stage=assemble`. `sheet=1` is the tile sheet (a piece-orientation tool, `tileslots.ts`'s) and any other `city` is not this view: null. Pure; renderer.ts passes the address in, behind `import.meta.env.DEV`.
 */
export function tilesPlanRequested(search: string): PlanAssembleRequest | null {
  const q = new URLSearchParams(search);
  if (q.get("city") !== "tiles" || q.get("sheet") === "1") return null;
  q.set("city", "plan");
  q.set("stage", "assemble");
  return planAssembleRequested(`?${q.toString()}`);
}

/** The line the failure is shown as: the stage, the seed and the size, and the reason (nothing is drawn). Pure. */
export function planFailureText(f: CityStageFailure | CityEraStageFailure): string {
  return `City plan failed at stage "${f.stage}" (seed ${f.seed}, ${f.blocksX} x ${f.blocksZ}): ${f.reason}`;
}

// ---- the era (ticket 073 C2) ----

/** The era the switch steps to from `era`: clean, tech, holdout, ruin, then round to clean. Pure. */
export function nextEra(era: CityEra): CityEra {
  return CITY_ERAS[(CITY_ERAS.indexOf(era) + 1) % CITY_ERAS.length]!;
}

const NO_TECH: readonly CityEraPiece<CityTechPieceKind>[] = Object.freeze([]);

/** What the draw reads at an era: the plan to draw, or the text that says why there is none. */
export type PlanAtEra =
  | { readonly plan: CityPlan; readonly text: null; readonly techAdds: readonly CityEraPiece<CityTechPieceKind>[] }
  | { readonly plan: null; readonly text: string; readonly techAdds: readonly CityEraPiece<CityTechPieceKind>[] };

/**
 * The plan the draw reads at `era`. "clean" is the clean plan itself, with no era stage run (X-7). An era above it reads `resolvePlan(eraRun.plan, era).plan`, never the raw layers (ticket 073 C2, criterion 2);
 * with no pass built, that plan is the clean one. The tech pass's adds (D1g) come from the same `resolvePlan` and are drawn beside the plan; at "clean" there are none. `eraRun` is the era run for that era (the caller runs it). A failed run or a failed resolve gives the text and no plan. Pure.
 */
export function planAtEra(clean: CityPlan, era: CityEra, eraRun: CityEraRun | null): PlanAtEra {
  if (era === "clean") return { plan: clean, text: null, techAdds: NO_TECH };
  if (eraRun === null) return { plan: null, text: `City plan at era "${era}" has no era run`, techAdds: NO_TECH };
  if (!eraRun.ok) return { plan: null, text: planFailureText(eraRun.failure), techAdds: NO_TECH };
  try {
    const resolved = resolvePlan(eraRun.plan, era);
    return { plan: resolved.plan, text: null, techAdds: resolved.adds.tech ?? NO_TECH };
  } catch (e) {
    if (e instanceof CityResolveError) return { plan: null, text: `City plan cannot be resolved at era "${era}": ${e.message}`, techAdds: NO_TECH };
    throw e;
  }
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

// ---- the buildings (ticket 070 G) ----

/** The grey of the placeholder: a plain grey box (the ground storey until stage 7 places its pieces, and a whole column whose models are missing). */
export const MASS_GREY = 0x8f949c;

/** One piece of one column, as `plan3dGroups` draws it: the building it belongs to, its column's cell, its role, its placement as stage 5 wrote it, and its own building's colourway. */
export interface PlanPieceDraw {
  readonly building: string;
  readonly column: CityCell;
  readonly role: CityPieceRole;
  readonly placement: CityPlacement;
  readonly colourway: string;
}

/**
 * Every piece of every column of the buildings layer, in `columns` order and each column's pieces bottom up: the list `plan3dGroups` draws exactly. A layer with no `columns`, a column whose building is not in the layer,
 * a column with no roof (or more than one), or a piece whose key is not one the page loads for stacks (`allStackKeys`) is a gap in stage 5's layer: `PlanStopError`, the cells named. Pure.
 */
export function planPieceDraws(buildings: CityBuildingsLayer): PlanPieceDraw[] {
  const columns = buildings.columns;
  if (!columns) throw new PlanStopError("the buildings layer has no columns (stage 5 writes them from F2)", []);
  const colourway = new Map(buildings.buildings.map((b) => [b.id, b.colourway] as const));
  const known = new Set<CalibrationKey>(allStackKeys());
  const out: PlanPieceDraw[] = [];
  for (const c of columns) {
    const cell = { i: c.i, j: c.j };
    const own = colourway.get(c.building);
    if (own === undefined) throw new PlanStopError(`column ${c.i},${c.j} is in building ${c.building}, which the layer does not hold`, [cell]);
    if (c.pieces.filter((p) => p.role === "roof").length !== 1) throw new PlanStopError(`column ${c.i},${c.j} has no single roof piece`, [cell]);
    for (const p of c.pieces) {
      if (!known.has(p.placement.key)) throw new PlanStopError(`column ${c.i},${c.j} has a piece (${p.placement.key}) that is not a stack key the page loads`, [cell]);
      out.push({ building: c.building, column: cell, role: p.role, placement: p.placement, colourway: own });
    }
  }
  return out;
}

/** One ground-storey piece (stage 7), as `plan3dGroups` draws it: its kind, building, the columns it fills, its placement as stage 7 wrote it, and its own building's colourway. */
export interface PlanGroundDraw {
  readonly kind: CityGroundPieceKind;
  readonly building: string;
  readonly cells: readonly CityCell[];
  readonly placement: CityPlacement;
  readonly colourway: string;
}

/** The keys a ground piece may be drawn from: the stack pieces the page loads, and the two corner doors the plan adds. */
const groundKnown = (): Set<CalibrationKey> => new Set<CalibrationKey>([...allStackKeys(), ...PLAN_DOOR_CORNERS]);

/**
 * Every ground piece of the facades layer, in its order and with its own building's colourway: the list `plan3dGroups` draws exactly (G2). Each column of the buildings layer must be filled by exactly one piece (a
 * `shopDouble` fills two), and every piece must be on columns of its own building and use a key the page loads: anything else is a gap in stage 7's layer, `PlanStopError`, the cells named. Pure.
 */
export function planGroundDraws(facades: CityFacadesLayer, buildings: CityBuildingsLayer): PlanGroundDraw[] {
  const columns = buildings.columns;
  if (!columns) throw new PlanStopError("the buildings layer has no columns (stage 5 writes them from F2)", []);
  const ground = facades.ground;
  if (!ground) throw new PlanStopError("the facades layer has no ground pieces (stage 7 writes them from H1)", []);
  const colourway = new Map(buildings.buildings.map((b) => [b.id, b.colourway] as const));
  const owner = new Map(columns.map((c) => [colId(c), c.building] as const));
  const known = groundKnown();
  const filled = new Map<string, number>();
  const out: PlanGroundDraw[] = [];
  for (const g of ground) {
    const own = colourway.get(g.building);
    if (own === undefined) throw new PlanStopError(`a ground piece is in building ${g.building}, which the layer does not hold`, g.cells);
    if (!known.has(g.placement.key)) throw new PlanStopError(`the ground piece at ${g.cells.map(colId).join(" ")} has a key (${g.placement.key}) that is not one the page loads`, g.cells);
    for (const c of g.cells) {
      if (owner.get(colId(c)) !== g.building) throw new PlanStopError(`the ground piece at ${colId(c)} is not on a column of its building ${g.building}`, [c]);
      filled.set(colId(c), (filled.get(colId(c)) ?? 0) + 1);
    }
    out.push({ kind: g.kind, building: g.building, cells: g.cells, placement: g.placement, colourway: own });
  }
  const bad = columns.filter((c) => filled.get(colId(c)) !== 1);
  if (bad.length > 0) throw new PlanStopError(`${bad.length} column(s) of the buildings layer have no ground piece, or more than one, in the facades layer (first: ${colId(bad[0]!)})`, bad.map((c) => ({ i: c.i, j: c.j })));
  return out;
}

export interface GreyDraw {
  mesh: InstancedMesh;
  /** The instances drawn, in `columns` order (a column has none, or one: its ground slot or the whole column). */
  count: number;
  /** The columns drawn whole in grey, with none of their pieces cloned (a model above the ground missing, or no models at all). */
  fallback: number;
  /** The columns whose ground slot is a grey box because their ground piece is not drawn (its root did not load, or it shares a `shopDouble` with a fallback column). */
  slots: number;
  dispose(): void;
}

export interface BuildingsDraw {
  /** One group per building (`building:<id>`), in the layer's order. */
  groups: readonly Group[];
  /** Every piece of every column, as listed; `pieces` of them are cloned (the rest are in columns that fell back to grey). */
  draws: readonly PlanPieceDraw[];
  pieces: number;
  /** G2: every ground piece of the facades layer, as listed; `groundPieces` of them are cloned (the rest are grey slots). */
  groundDraws: readonly PlanGroundDraw[];
  groundPieces: number;
  dispose(): void;
}

interface BuildingsBuilt {
  buildings: BuildingsDraw;
  grey: GreyDraw;
  /** By column (`i,j`): true when every one of its pieces above the ground has a loaded root, so it is drawn from the pack and not as a whole grey box. Stage 7's pieces on a grey column would float, so they are not drawn. */
  whole: ReadonlyMap<string, boolean>;
}

const colId = (c: CityCell): string => `${c.i},${c.j}`;

/** A wrapper at the placement's position, turn and `WORLD_PER_METRE` scale holding a clone of the key's root (shared geometry and materials; nothing can pick it). */
function placedClone(placement: CityPlacement, root: Object3D): Group {
  const wrap = new Group();
  wrap.name = `piece:${placement.key}`;
  wrap.position.set(placement.x_m * S, placement.y_m * S, placement.z_m * S);
  wrap.rotation.y = (placement.yaw_deg * Math.PI) / 180;
  wrap.scale.setScalar(S);
  wrap.raycast = () => {};
  const clone = root.clone(true);
  clone.traverse((o) => {
    o.raycast = () => {};
  });
  wrap.add(clone);
  return wrap;
}

/**
 * The buildings: one `Group` per building holding one wrapper per piece (at the placement's position, turn and `WORLD_PER_METRE` scale, a clone of the key's root), painted in the building's colourway; and the grey
 * instances. A column whose pieces above the ground are not all loaded is one grey box from 0 to its roof piece's height, and none of its pieces is cloned, its ground piece included. Otherwise its ground piece is
 * cloned (once, for a `shopDouble`) when its root loaded and every column it fills is whole; when it is not drawn, the column has its ground slot as a grey box. The floors' wrappers come first in a group, then the ground pieces'.
 */
function buildingBoxes(layer: CityBuildingsLayer, facades: CityFacadesLayer, mass: CityMassLayer, roots: ReadonlyMap<CalibrationKey, Object3D>, colourways: ReadonlyMap<string, Texture> | undefined): BuildingsBuilt {
  const draws = planPieceDraws(layer);
  const groundDraws = planGroundDraws(facades, layer);
  const columns = layer.columns!;
  const at = new Set(columns.map(colId));
  for (const b of mass.built) if (!at.has(colId(b))) throw new PlanStopError(`built cell ${b.i},${b.j} has no column in the buildings layer`, [{ i: b.i, j: b.j }]);
  const cache = createColourwayCache();
  const groups = new Map<string, Group>();
  for (const b of layer.buildings) {
    const g = new Group();
    g.name = `building:${b.id}`;
    g.raycast = () => {};
    groups.set(b.id, g);
  }
  const geometry = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const material = new MeshStandardMaterial({ color: MASS_GREY, roughness: 1 });
  const mesh = new InstancedMesh(geometry, material, Math.max(columns.length, 1));
  mesh.name = "plan:grey";
  const m = new Matrix4();
  const q = new Quaternion();
  const p = new Vector3();
  const sc = new Vector3();
  const whole = new Map(columns.map((c) => [colId(c), c.pieces.every((pc) => roots.has(pc.placement.key))] as const));
  // A ground piece is drawn when its root loaded and every column it fills has all its pieces above the ground.
  const drawn = groundDraws.map((g) => roots.has(g.placement.key) && g.cells.every((c) => whole.get(colId(c)) === true));
  const drawnAt = new Map<string, boolean>();
  groundDraws.forEach((g, n) => g.cells.forEach((c) => drawnAt.set(colId(c), drawn[n]!)));
  let pieces = 0;
  let groundPieces = 0;
  let fallback = 0;
  let slots = 0;
  let used = 0;
  const grey = (c: CityCell, base: number, top: number): void => {
    mesh.setMatrixAt(used++, m.compose(p.set((c.i + 0.5) * TILE_M * S, base * S, (c.j + 0.5) * TILE_M * S), q, sc.set(TILE_M * S, (top - base) * S, TILE_M * S)));
  };
  for (const c of columns) {
    if (!whole.get(colId(c))) {
      fallback++;
      grey(c, 0, c.pieces.find((pc) => pc.role === "roof")!.placement.y_m);
      continue;
    }
    const group = groups.get(c.building)!;
    for (const pc of c.pieces) {
      group.add(placedClone(pc.placement, roots.get(pc.placement.key)!));
      pieces++;
    }
    if (drawnAt.get(colId(c)) !== true) {
      slots++;
      grey(c, c.ground.y_m, c.ground.top_m);
    }
  }
  groundDraws.forEach((g, n) => {
    if (!drawn[n]) return;
    groups.get(g.building)!.add(placedClone(g.placement, roots.get(g.placement.key)!));
    groundPieces++;
  });
  mesh.count = used;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.raycast = () => {};
  for (const b of layer.buildings) paintStack(groups.get(b.id)!, b.colourway, colourways ? { colourways } : {}, cache);
  return {
    whole,
    buildings: {
      groups: [...groups.values()],
      draws,
      pieces,
      groundDraws,
      groundPieces,
      dispose() {
        cache.dispose();
      },
    },
    grey: {
      mesh,
      count: used,
      fallback,
      slots,
      dispose() {
        geometry.dispose();
        material.dispose();
        mesh.dispose();
      },
    },
  };
}

// ---- the facades and the ground (ticket 070 J) ----

export type PlanDressList = "dressing" | "walls" | "roofs" | "novelty";

/** One piece of stage 7's dressing, walls, roofs or novelty lists, as `plan3dGroups` draws it: which list and where in it, its kind, its building, its host column, its placement as stage 7 wrote it; a wall piece also its y-scale and boxes. */
export interface PlanDressDraw {
  readonly list: PlanDressList;
  readonly index: number;
  readonly kind: string;
  readonly building: string;
  readonly cell: CityCell;
  readonly placement: CityPlacement;
  readonly scaleY?: number;
  readonly boxes?: readonly CityWallBox[];
}

/** One stage 8 prop, as `plan3dGroups` draws it. */
export interface PlanPropDraw {
  readonly index: number;
  readonly kind: CityGroundProp["kind"];
  readonly on: CityGroundPlace;
  readonly host: string;
  readonly flat: boolean;
  readonly cell: CityCell;
  readonly placement: CityPlacement;
  readonly size: CityGroundProp["size"];
}

/** The keys a stage 7 piece may be drawn from: the dressing keys and the plan's named ones the page loads, and the code-drawn escape. */
const dressKnown = (): Set<CalibrationKey> => new Set<CalibrationKey>([...dressKeys(), ...planKeys(), CODE_ESCAPE_KEY]);
/** The keys a stage 8 prop may be drawn from: the furniture and dressing keys the page loads, the plan's named ones, and the tile city's own props. */
const propKnown = (): Set<CalibrationKey> => new Set<CalibrationKey>([...furnitureKeys(), ...dressKeys(), ...planKeys(), ...TILE_PROPS]);

/**
 * Every piece of `facades.dressing`, `walls`, `roofs` and `novelty` once each, in those lists' order: the list `plan3dGroups` draws exactly (J). A missing list, a piece whose key the page does not load (`dressKeys()`, `planKeys()`,
 * or `code:escape`), or whose host `cell` is not a column of the buildings layer is a gap in stage 7's layer: `PlanStopError`, the cells named. Pure.
 */
export function planDressDraws(plan: CityPlan): PlanDressDraw[] {
  const { facades, buildings } = plan.layers;
  if (!facades || !buildings?.columns) throw new PlanStopError("the plan has no facades layer or no buildings columns to dress", []);
  const known = dressKnown();
  const columns = new Set(buildings.columns.map(colId));
  const out: PlanDressDraw[] = [];
  const add = (list: PlanDressList, index: number, kind: string, building: string, cell: CityCell, placement: CityPlacement, extra: { scaleY?: number; boxes?: readonly CityWallBox[] } = {}): void => {
    if (!known.has(placement.key)) throw new PlanStopError(`the ${list} piece ${index} at ${colId(cell)} has a key (${placement.key}) that is not one the page loads`, [cell]);
    if (!columns.has(colId(cell))) throw new PlanStopError(`the ${list} piece ${index} (${kind}) is on ${colId(cell)}, which is not a column of the buildings layer`, [cell]);
    out.push({ list, index, kind, building, cell, placement, ...extra });
  };
  const lists = { dressing: facades.dressing, walls: facades.walls, roofs: facades.roofs, novelty: facades.novelty };
  for (const [name, list] of Object.entries(lists)) if (!list) throw new PlanStopError(`the facades layer has no ${name} list (stage 7 writes it from H1b to H1c)`, []);
  facades.dressing!.forEach((p, n) => add("dressing", n, p.kind, p.building, p.cell, p.placement));
  facades.walls!.forEach((p, n) => add("walls", n, p.kind, p.building, p.cell, p.placement, { scaleY: p.scaleY, boxes: p.boxes }));
  facades.roofs!.forEach((p, n) => add("roofs", n, p.kind, p.building, p.cell, p.placement));
  facades.novelty!.forEach((p, n) => add("novelty", n, p.kind, p.building, p.cell, p.placement));
  return out;
}

/**
 * Every `ground.props` entry once each, in order: the list `plan3dGroups` draws exactly (J). No `ground` layer, or a prop whose key the page does not load (`furnitureKeys()`, `dressKeys()`, `planKeys()`), is a gap in stage 8's
 * layer: `PlanStopError`, the cells named. Pure.
 */
export function planPropDraws(plan: CityPlan): PlanPropDraw[] {
  const ground = plan.layers.ground;
  if (!ground) throw new PlanStopError("the plan has no ground layer to dress (stage 8 writes it from I)", []);
  const known = propKnown();
  return ground.props.map((p, index) => {
    if (!known.has(p.placement.key)) throw new PlanStopError(`the ground prop ${index} at ${colId(p.cell)} has a key (${p.placement.key}) that is not one the page loads`, [p.cell]);
    return { index, kind: p.kind, on: p.on, host: p.host, flat: p.flat, cell: p.cell, placement: p.placement, size: p.size };
  });
}

/** One stage 9 piece, as `plan3dGroups` draws it. */
export interface PlanTrafficDraw {
  readonly index: number;
  readonly kind: CityTrafficPieceKind;
  readonly host: string;
  readonly group: string;
  readonly grounded: boolean;
  readonly cell: CityCell;
  readonly placement: CityPlacement;
  readonly size: { readonly x_m: number; readonly z_m: number; readonly h_m: number };
}

/**
 * Every `traffic.pieces` entry once each, in order: the list `plan3dGroups` draws exactly (TR2). No `traffic` layer, or a piece whose key the page does not load (`planKeys()`), is a gap in stage 9's layer: `PlanStopError`, the
 * cells named. Pure.
 */
export function planTrafficDraws(plan: CityPlan): PlanTrafficDraw[] {
  const traffic = plan.layers.traffic;
  if (!traffic) throw new PlanStopError("the plan has no traffic layer to draw (stage 9 writes it from TR1)", []);
  const known = new Set<CalibrationKey>(planKeys());
  return traffic.pieces.map((p, index) => {
    if (!known.has(p.placement.key)) throw new PlanStopError(`the traffic piece ${index} (${p.kind}) at ${colId(p.cell)} has a key (${p.placement.key}) that is not one the page loads`, [p.cell]);
    return { index, kind: p.kind, host: p.host, group: p.group, grounded: p.grounded, cell: p.cell, placement: p.placement, size: p.size };
  });
}

/** The tech pass's adds and the era they are drawn at (what `plan3dGroups` and `planAudit` read beside the plan). */
export interface PlanTech {
  readonly era: CityEra;
  readonly adds: readonly CityEraPiece<CityTechPieceKind>[];
}

/** One never-used key the tech pass may place, as dark scenery, and the one kind of its adds that may carry it (X-9; B2: dark lamps, signs, neon). */
export interface PlanTechAllowance {
  readonly key: CalibrationKey;
  readonly kind: CityTechPieceKind;
}

/** B2's allowance, era-scoped (ticket 073 X-9): the eras it holds in. At "clean" the audit is exactly today's. */
export const PLAN_AUDIT_TECH_ERAS: readonly CityEra[] = ["tech", "holdout", "ruin"];

/**
 * B2's allowance, as one typed table: the never-used keys the tech pass may use, each on its own kind of add. D1's kit (a Sci-Fi City set, none of whose names starts with a never-used stem) needs none, so the
 * table is empty today; D2's lamps and holograms, if any is on the list, join it here (D3). A never-used key on any other kind, or at `clean`, is still a finding.
 */
export const PLAN_AUDIT_TECH_ALLOWED: readonly PlanTechAllowance[] = [];

/** One never-used key the plan places: the layer and list it is in, its cell (null for a key the street pieces and interiors are drawn from), and the key. */
export interface PlanAuditEntry {
  readonly layer: string;
  readonly list: string;
  readonly cell: CityCell | null;
  readonly key: CalibrationKey;
}

/** The audit's one allowance: the party-wall pipe the kit places on a party wall (grammar rule 8; Josh, 19 Nov 2026: "Yes, dress it"; Q23's PW3). `_01` and `_02` are never allowed, on a party pipe too. */
export const PLAN_AUDIT_ALLOWED = { key: PLAN_PARTY_PIPE, kind: "partyPipe" } as const;

/**
 * R12, the whole-plan audit (the checklist's own check at its own stage): every key the plan places that `isNeverUsed` names, with its layer, list and cell. It reads the buildings' pieces, `facades.ground`, `dressing`, `walls`,
 * `roofs` and `novelty`, `ground.props`, and the keys the street pieces and interiors are drawn from. Empty when the plan is clean; never filtered. Pure.
 */
export function planAudit(plan: CityPlan, tech?: PlanTech, allowed: readonly PlanTechAllowance[] = PLAN_AUDIT_TECH_ALLOWED): PlanAuditEntry[] {
  const { buildings, facades, ground, traffic } = plan.layers;
  const out: PlanAuditEntry[] = [];
  const check = (layer: string, list: string, cell: CityCell | null, key: CalibrationKey, kind?: string): void => {
    if (!isNeverUsed(key)) return;
    if (key === PLAN_AUDIT_ALLOWED.key && kind === PLAN_AUDIT_ALLOWED.kind) return;
    // Q33, narrowed: a signal key on its own kind of piece, and only in the traffic layer.
    if (layer === "traffic" && kind !== undefined && Object.prototype.hasOwnProperty.call(PLAN_TRAFFIC_ALLOWED, kind) && PLAN_TRAFFIC_ALLOWED[kind as keyof typeof PLAN_TRAFFIC_ALLOWED] === key) return;
    out.push({ layer, list, cell, key });
  };
  for (const key of [...tileKeys(), PLAN_ARROW, ...TILE_TREES, ...TILE_PROPS, ...Object.values(INTERIOR_KEYS).flat()]) check("edge", "street pieces and interiors", null, key);
  for (const c of buildings?.columns ?? []) for (const p of c.pieces) check("buildings", "columns", { i: c.i, j: c.j }, p.placement.key);
  for (const g of facades?.ground ?? []) check("facades", "ground", g.cells[0] ?? null, g.placement.key);
  for (const p of facades?.dressing ?? []) check("facades", "dressing", p.cell, p.placement.key, p.kind);
  for (const p of facades?.walls ?? []) check("facades", "walls", p.cell, p.placement.key, p.kind);
  for (const p of facades?.roofs ?? []) check("facades", "roofs", p.cell, p.placement.key, p.kind);
  for (const p of facades?.novelty ?? []) check("facades", "novelty", p.cell, p.placement.key, p.kind);
  for (const p of ground?.props ?? []) check("ground", "props", p.cell, p.placement.key, p.kind);
  for (const p of traffic?.pieces ?? []) check("traffic", "pieces", p.cell, p.placement.key, p.kind);
  // The tech pass's adds (D1g; X-9): a never-used key among them is a finding unless the era-scoped table allows it for that kind.
  for (const p of tech?.adds ?? []) {
    if (!isNeverUsed(p.placement.key)) continue;
    if (PLAN_AUDIT_TECH_ERAS.includes(tech!.era) && allowed.some((a) => a.key === p.placement.key && a.kind === p.kind)) continue;
    out.push({ layer: "tech", list: "adds", cell: p.cell, key: p.placement.key });
  }
  return out;
}

/** One tech add as `plan3dGroups` draws it: the era piece itself (a kit key, at the placement D1 wrote). */
export interface PlanTechDraw {
  readonly id: string;
  readonly kind: CityTechPieceKind;
  readonly district: string;
  readonly cell: CityCell;
  readonly placement: CityPlacement;
}

/** The most InstancedMeshes the tech pass's pieces may take (its own group, so no other cap rises). The kit has 33 keys; a key is one call per sub-mesh. */
export const TECH_DRAW_CALLS_MAX = 100;

/** Every tech add once each, in order. A key that is not in the tech kit is a gap in D1's layer: `PlanStopError`, the cell named. Pure. */
export function planTechDraws(adds: readonly CityEraPiece<CityTechPieceKind>[]): PlanTechDraw[] {
  return adds.map((p) => {
    if (TECH_BOUNDS[p.placement.key] === undefined) throw new PlanStopError(`the tech add ${p.id} has a key (${p.placement.key}) that is not in the tech kit`, [p.cell]);
    return { id: p.id, kind: p.kind, district: p.district, cell: p.cell, placement: p.placement };
  });
}

/** What the per-key instancer made of one stage's pieces. */
export interface PlanInstanced {
  /** The `dressGroup`'s group, named `plan:dress` or `plan:furniture`. */
  group: Group;
  /** InstancedMeshes (draw calls), and the one more call of the code-drawn boxes (`DressDraw`'s). */
  calls: number;
  boxCalls: number;
  /** The pieces the layer lists; those sent to the instancer (their root loaded, and for stage 7 their host column drawn from the pack); those that are in the group (a key the cap leaves out is not). */
  listed: number;
  placed: number;
  drawn: number;
  /** The instances drawn, by key. */
  perKey: ReadonlyMap<CalibrationKey, number>;
  /** The keys sent to the instancer that have nothing in the group (a root with no mesh, or more meshes than the cap leaves room for). None expected. */
  leftOut: readonly CalibrationKey[];
  dispose(): void;
}

const RAD = Math.PI / 180;

/** The boxes of a wall piece as `escapes.ts`' parts (the names differ by the `_m` and `_rad` suffixes). */
const partOf = (b: CityWallBox): EscapePart => ({ kind: b.kind, x: b.x_m, y: b.y_m, z: b.z_m, w: b.w_m, h: b.h_m, d: b.d_m, rz: b.rz_rad });

/**
 * A stage 7 piece as the instancer's placement: the identity frame, the piece at its placement in metres, its turn in radians, a wall piece's y-scale and boxes (`DressPlacement`'s piece fields `w`, `h`, `d`, `column` and
 * `slot` are what `dressGroup` does not read: the instancer chooses glass by key).
 */
function dressPlacementOf(d: PlanDressDraw): DressPlacement {
  const pl = d.placement;
  const piece: DressPiece = {
    key: pl.key,
    slot: "wall",
    x: pl.x_m,
    y: pl.y_m,
    z: pl.z_m,
    yaw: pl.yaw_deg * RAD,
    column: 0,
    w: 0,
    h: 0,
    d: 0,
    ...(d.scaleY !== undefined ? { scaleY: d.scaleY } : {}),
    ...(d.boxes !== undefined && d.boxes.length > 0 ? { parts: d.boxes.map(partOf) } : {}),
  };
  return { frame: { x: 0, z: 0, yaw: 0 }, piece };
}

/** Which furniture group a surface is, for `FurniturePiece.kind` (`furniturePlacement` does not read it). */
const FURN_KIND: Readonly<Record<CityGroundPlace, FurniturePiece["kind"]>> = { pavement: "pavement", lane: "alley", plaza: "plaza", green: "parking", frontLot: "parking" };

/**
 * A stage 8 prop as the instancer's placement, through `furniturePlacement` with the surfaces at the levels E draws them (the walk, and every interior ground, at 0): its base is that level plus `placement.y_m` (a pole
 * billboard's board), and a flat piece takes `furniturePlacement`'s own lift.
 */
function propPlacementOf(d: PlanPropDraw): DressPlacement {
  const pl = d.placement;
  const piece: FurniturePiece = { key: pl.key, x: pl.x_m * S, z: pl.z_m * S, yaw: pl.yaw_deg * RAD, w: d.size.x_m, h: d.size.h_m, d: d.size.z_m, kind: FURN_KIND[d.on], run: d.host, ground: d.on === "pavement" ? "pavement" : "yard", lift: pl.y_m, flat: d.flat };
  return furniturePlacement(piece, { pavement_m: 0, yard_m: 0 });
}

/** A tech add as the instancer's placement: the identity frame, the piece at its placement in metres and its turn (a kit piece's front is its +z, so a turn by D1's `SIDE_YAW` puts it out from its wall). */
function techPlacementOf(d: PlanTechDraw): DressPlacement {
  const pl = d.placement;
  return { frame: { x: 0, z: 0, yaw: 0 }, piece: { key: pl.key, slot: "wall", x: pl.x_m, y: pl.y_m, z: pl.z_m, yaw: pl.yaw_deg * RAD, column: 0, w: 0, h: 0, d: 0 } };
}

const shortName = (key: CalibrationKey): string => key.slice(key.indexOf(":") + 1);

/** One `dressGroup` call over `placements`, and what is in it by key. */
function instancedOf(name: string, listed: number, placements: readonly DressPlacement[], roots: ReadonlyMap<CalibrationKey, Object3D>, cap: number): PlanInstanced {
  const drawn = dressGroup(placements, roots, cap);
  drawn.group.name = name;
  const byName = new Map<string, CalibrationKey>(placements.map((p) => [`dress:${shortName(p.piece.key)}`, p.piece.key] as const));
  const perKey = new Map<CalibrationKey, number>();
  for (const c of drawn.group.children) {
    const key = byName.get(c.name);
    if (key !== undefined && (c as InstancedMesh).isInstancedMesh === true) perKey.set(key, (c as InstancedMesh).count);
  }
  const sent = new Map<CalibrationKey, number>();
  for (const p of placements) if (p.piece.key !== CODE_ESCAPE_KEY) sent.set(p.piece.key, (sent.get(p.piece.key) ?? 0) + 1);
  const leftOut = [...sent.keys()].filter((key) => !perKey.has(key));
  const lost = leftOut.reduce((n, key) => n + sent.get(key)!, 0);
  return { group: drawn.group, calls: drawn.calls, boxCalls: drawn.boxCalls, listed, placed: placements.length, drawn: placements.length - lost, perKey, leftOut, dispose: () => drawn.dispose() };
}

/** Stage 7: each listed piece whose root loaded (`code:escape` needs none) and whose host column is drawn from the pack, in one `dressGroup` call under `DRESS_DRAW_CALLS_MAX`. A piece not drawn gets no grey box. */
export function dressStage(draws: readonly PlanDressDraw[], roots: ReadonlyMap<CalibrationKey, Object3D>, whole: ReadonlyMap<string, boolean>): PlanInstanced {
  const placements = draws.filter((d) => (d.placement.key === CODE_ESCAPE_KEY || roots.has(d.placement.key)) && whole.get(colId(d.cell)) === true).map(dressPlacementOf);
  return instancedOf("plan:dress", draws.length, placements, roots, DRESS_DRAW_CALLS_MAX);
}

/**
 * A stage 9 piece as the instancer's placement, as a stage 8 prop on the walk: through `furniturePlacement` with both surfaces at 0, its `lift` the `y_m` stage 9 typed (a grounded piece's is the walk; a fixed piece hangs at its own
 * height), never flat. Its size is the layer's. TR2 types no level, offset or turn.
 */
function trafficPlacementOf(d: PlanTrafficDraw): DressPlacement {
  const pl = d.placement;
  const piece: FurniturePiece = { key: pl.key, x: pl.x_m * S, z: pl.z_m * S, yaw: pl.yaw_deg * RAD, w: d.size.x_m, h: d.size.h_m, d: d.size.z_m, kind: "pavement", run: d.host, ground: "pavement", lift: pl.y_m, flat: false };
  return furniturePlacement(piece, { pavement_m: 0, yard_m: 0 });
}

/** Stages 8 and 9 in the one `dressGroup` call: what each stage lists, places and draws, split from the shared group by key. */
export interface PlanFurnitureStages {
  /** Stage 8's props. `group` is the shared group (`plan:furniture`), which holds stage 9's pieces too. `dispose` frees the shared group. */
  furniture: PlanInstanced;
  /** Stage 9's pieces. Its `group` is the same shared group; its `dispose` does nothing. */
  traffic: PlanInstanced;
}

/**
 * Stages 8 and 9 (the props first, then the traffic pieces): each listed piece whose root loaded, in one `dressGroup` call under `FURN_DRAW_CALLS_MAX`. `roots` is what the instancer draws from (the caller may have painted the stop
 * sign's). A piece not drawn gets no grey box. The two stages' keys are disjoint (a test checks it), so each summary is the shared group's, cut by key.
 */
export function furnitureStages(props: readonly PlanPropDraw[], traffic: readonly PlanTrafficDraw[], roots: ReadonlyMap<CalibrationKey, Object3D>): PlanFurnitureStages {
  const pp = props.filter((d) => roots.has(d.placement.key)).map(propPlacementOf);
  const tp = traffic.filter((d) => roots.has(d.placement.key)).map(trafficPlacementOf);
  const all = instancedOf("plan:furniture", props.length + traffic.length, [...pp, ...tp], roots, FURN_DRAW_CALLS_MAX);
  const part = (listed: number, ps: readonly DressPlacement[], dispose: () => void): PlanInstanced => {
    const keys = new Set(ps.map((p) => p.piece.key));
    const names = new Set([...keys].map((key) => `dress:${shortName(key)}`));
    const perKey = new Map([...all.perKey].filter(([key]) => keys.has(key)));
    const leftOut = all.leftOut.filter((key) => keys.has(key));
    const lost = ps.filter((p) => leftOut.includes(p.piece.key)).length;
    let calls = 0;
    for (const c of all.group.children) if ((c as InstancedMesh).isInstancedMesh === true && names.has(c.name)) calls++;
    return { group: all.group, calls, boxCalls: 0, listed, placed: ps.length, drawn: ps.length - lost, perKey, leftOut, dispose };
  };
  return { furniture: part(props.length, pp, () => all.dispose()), traffic: part(traffic.length, tp, () => {}) };
}

/** The tech pass's pieces (D1g): each add whose root loaded, in one `dressGroup` call under `TECH_DRAW_CALLS_MAX`, dark (the instancer swaps any emissive material for one with none). */
export function techStage(draws: readonly PlanTechDraw[], roots: ReadonlyMap<CalibrationKey, Object3D>): PlanInstanced {
  const placements = draws.filter((d) => roots.has(d.placement.key)).map(techPlacementOf);
  return instancedOf("plan:tech", draws.length, placements, roots, TECH_DRAW_CALLS_MAX);
}

/** Stage 8: each listed prop whose root loaded, in one `dressGroup` call under `FURN_DRAW_CALLS_MAX` (the call `plan3dGroups` shares with stage 9's pieces; this one has none of them). */
export function propStage(draws: readonly PlanPropDraw[], roots: ReadonlyMap<CalibrationKey, Object3D>): PlanInstanced {
  return furnitureStages(draws, [], roots).furniture;
}

// ---- plan to scene ----

export interface PlanDraw {
  /** The tiles, the interiors, the buildings, the grey boxes, and stage 7's and stage 8's pieces, in one group. */
  group: Group;
  tiles: TileDraw;
  interior: InteriorDraw;
  buildings: BuildingsDraw;
  grey: GreyDraw;
  /** J: stage 7's pieces (`dressDraws`) and stage 8's (`propDraws`), as listed and as drawn. */
  dress: PlanInstanced;
  furniture: PlanInstanced;
  /** TR2: stage 9's pieces, as listed and as drawn. They are in `furniture.group`, the one group stages 8 and 9 share. */
  traffic: PlanInstanced;
  /** True when the stop sign was drawn on the `01_A` atlas (`plan3dGroups`' `stopAtlas` was given and a stop sign root loaded). */
  stopPainted: boolean;
  /** D1g: the tech pass's adds, as listed and as drawn, in `tech.group` (`plan:tech`, in `group` too). Null at "clean" and wherever the plan is drawn with no tech adds. */
  tech: PlanInstanced | null;
  techDraws: readonly PlanTechDraw[];
  dressDraws: readonly PlanDressDraw[];
  propDraws: readonly PlanPropDraw[];
  trafficDraws: readonly PlanTrafficDraw[];
  /** The ground cells the street pieces were drawn from, and the interior items, as the drawing took them. */
  cells: readonly TileCell[];
  items: readonly InteriorItem[];
  kerb: KerbPlan;
  dispose(): void;
}

const NO_PROPS: readonly PropPlace[] = [];

/**
 * The plan as a group (see the file's header). `roots` and `entries` are the pack's pieces by key (empty: every cell in code), `colourways` the loaded colourway atlases by id (none: every building keeps its pack
 * materials). Needs the `streets`, `mass`, `edge`, `buildings`, `facades` and `ground` layers, with the edge's `ground` and `kerb` (D2), the buildings' `columns` (F2), the facades' `ground` (H1) and its `dressing`,
 * `walls`, `roofs` and `novelty` lists (H1b to H1c), and the ground layer's `props` (I). Draws only: it reads the layers and writes none. Throws `PlanStopError` where a layer does not say how to draw something, and where
 * `planAudit` (R12) finds a never-used key.
 */
export function plan3dGroups(plan: CityPlan, roots: ReadonlyMap<CalibrationKey, Object3D>, entries: ReadonlyMap<CalibrationKey, AssetEntry>, colourways?: ReadonlyMap<string, Texture>, stopAtlas?: Texture, tech?: PlanTech): PlanDraw {
  const { streets, mass, edge, buildings, facades, ground: groundLayer } = plan.layers;
  if (!streets || !mass || !edge || !buildings || !facades || !groundLayer) throw new PlanStopError("the plan has no streets, mass, edge, buildings, facades and ground layers to draw", []);
  if (!edge.ground || !edge.kerb) throw new PlanStopError("the edge layer has no ground and kerb (stage 4 writes them from D2)", []);
  // R12: a never-used key is a gap in the layer that placed it, and is never filtered out here.
  const audit = planAudit(plan, tech);
  if (audit.length > 0) {
    const first = audit[0]!;
    throw new PlanStopError(`R12: ${audit.length} never-used key(s) in the plan (first: ${first.key} in ${first.layer} ${first.list}${first.cell ? ` at ${colId(first.cell)}` : ""})`, audit.flatMap((a) => (a.cell ? [a.cell] : [])));
  }
  const set = planCells(streets, edge.ground);
  const kerb = edge.kerb;
  const tiles = tileGroupOf(
    {
      cells: set.cells,
      buildoutTrees: edge.buildoutTrees,
      seed: plan.options.seed,
      keys: [...planTileKeys(), ...TILE_TREES],
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
  const built = buildingBoxes(buildings, facades, mass, roots, colourways);
  const dressDraws = planDressDraws(plan);
  const propDraws = planPropDraws(plan);
  const dress = dressStage(dressDraws, roots, built.whole);
  const trafficDraws = planTrafficDraws(plan);
  // The stop sign's root is replaced, in the roots the instancer sees only, by a clone painted in `01_A` (Q42): shared geometry, cloned materials; the loaded root, its materials and its maps are never written.
  const stopKey = PLAN_TRAFFIC_KEYS.stopSign;
  const stopRoot = roots.get(stopKey);
  const paint = createColourwayCache();
  let stopPainted = false;
  let sharedRoots = roots;
  if (stopAtlas && stopRoot && trafficDraws.some((d) => d.placement.key === stopKey)) {
    const clone = stopRoot.clone();
    paintStack(clone, STOP_SIGN_COLOURWAY, { colourways: new Map([[STOP_SIGN_COLOURWAY, stopAtlas]]) }, paint);
    const painted = new Map(roots);
    painted.set(stopKey, clone);
    sharedRoots = painted;
    stopPainted = true;
  }
  const stages89 = furnitureStages(propDraws, trafficDraws, sharedRoots);
  const furniture = stages89.furniture;
  const traffic = stages89.traffic;
  // D1g: the tech pass's adds, at an era above clean only. Nothing is added to the group at "clean".
  const techDraws = tech !== undefined && tech.era !== "clean" ? planTechDraws(tech.adds) : [];
  const techDrawn = techDraws.length > 0 ? techStage(techDraws, roots) : null;
  const group = new Group();
  group.name = "plan3d";
  group.add(tiles.group, interior.group, ...built.buildings.groups, built.grey.mesh, dress.group, furniture.group);
  if (techDrawn) group.add(techDrawn.group);
  return {
    group,
    dress,
    furniture,
    traffic,
    stopPainted,
    tech: techDrawn,
    techDraws,
    dressDraws,
    propDraws,
    trafficDraws,
    tiles,
    interior,
    buildings: built.buildings,
    grey: built.grey,
    cells: set.cells,
    items,
    kerb: tiles.kerb,
    dispose() {
      tiles.dispose();
      interior.dispose();
      built.buildings.dispose();
      built.grey.dispose();
      dress.dispose();
      furniture.dispose();
      techDrawn?.dispose();
      paint.dispose();
    },
  };
}

/**
 * The pieces `planKeys` names that a loaded model set offers, with the trees and the stack pieces the buildings stand on: roots and entries by key (the way the tile city's renderer reads them), and the loaded colourway
 * atlases by id (none when the set has none).
 */
export function planInput(set: ModelSet): { roots: Map<CalibrationKey, Object3D>; entries: Map<CalibrationKey, AssetEntry>; colourways: ReadonlyMap<string, Texture> | undefined; stopAtlas: Texture | undefined } {
  const input = tileInput(set);
  const props = propInput(set);
  // The dressing and furniture keys of stages 7 and 8 are `ModelSet.dress` (the page loads `dressKeys()` and `furnitureKeys()` there); `propInput` offers only the tile props among them.
  const dress = dressInput(set);
  return { roots: new Map([...stackRoots(set), ...(input?.roots ?? []), ...props.roots, ...(dress?.roots ?? [])]), entries: new Map([...(input?.entries ?? []), ...props.entries, ...(dress?.entries ?? [])]), colourways: set.colourways, stopAtlas: set.signColourways?.get(STOP_SIGN_COLOURWAY) };
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
  /** The era run for an era above clean (default: `runCityEra` for the era asked). A test passes its own. */
  eraRun?: (era: CityEra) => CityEraRun;
}

/** The ground under the whole city reaches this far (metres) past its edge, and lies this far (metres) under the carriageway surface. */
const GROUND_MARGIN_M = 60;
const GROUND_BELOW_M = 0.02;

/**
 * The 3D view of the assembled plan (dev only): the same interface as the tile city's renderer. It runs the pipeline up to the ground stage; a run that fails draws nothing and shows the failure's stage and reason as text
 * over the page. The city opens from above on the tile city's rig (day, `light=night` for the game's night; the L key and the button flip it) or, with `cam=street`, from the street (`planStreetPose`). The models load once
 * the view is up; until they do (and if they never do) every piece is code-drawn.
 */
export function createPlanAssembleRenderer3d(gl: WebGLRenderer, canvas: HTMLCanvasElement, req: PlanAssembleRequest, opts: PlanRendererOptions): MapRenderer3d {
  const w0 = Math.max(canvas.clientWidth, 1);
  const h0 = Math.max(canvas.clientHeight, 1);
  // The plan page has no HUD to keep clear (the puzzle HUD is not the plan's), and the page's insets measure that HUD: a tall one leaves the rig no room to fit the city and it backs off past the far plane (blank sky). They are ignored.
  let insets: Insets = {};
  let disposed = false;
  const run = opts.run ?? runCity({ blocksX: req.blocksX, blocksZ: req.blocksZ, seed: req.seed }, "traffic");
  const lightId0: LightModeId = lightModeFor("tiles", opts.search, import.meta.env.DEV);
  const scene = new Scene();
  const owners: LightOwners = newLightOwners();
  applyLightMode(scene, gl, lightId0, owners);

  let draw: PlanDraw | null = null;
  let note: { remove(): void } | null = null;
  let frame = { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  let ground: Mesh | null = null;
  let stopText: string | null = null;
  /** The console line the next frame prints, once the models have swapped in (it needs the frame's own draw-call count). */
  let report: ((calls: number) => string) | null = null;
  const cleanPlan: CityPlan | null = run.ok ? run.plan : null;
  const streetsLayer = cleanPlan?.layers.streets;
  if (!run.ok) stopText = planFailureText(run.failure);
  // The era (ticket 073 C2): what the draw reads is `resolvePlan`'s plan for an era above clean. A change of era swaps the drawn pieces; the camera, the light and the models stay.
  let era: CityEra = req.era;
  const eraRuns = new Map<CityEra, CityEraRun>();
  const eraRunOf = (e: CityEra): CityEraRun => {
    let r = eraRuns.get(e);
    if (!r) {
      r = (opts.eraRun ?? ((x: CityEra) => runCityEra({ blocksX: req.blocksX, blocksZ: req.blocksZ, seed: req.seed }, x)))(e);
      eraRuns.set(e, r);
    }
    return r;
  };
  const atEra = (e: CityEra): PlanAtEra => (cleanPlan ? planAtEra(cleanPlan, e, e === "clean" ? null : eraRunOf(e)) : { plan: null, text: stopText ?? "", techAdds: NO_TECH });
  const cleanFailed = stopText !== null;
  let eraText: string | null = null;
  let plan: CityPlan | null = cleanPlan;
  let techAdds: readonly CityEraPiece<CityTechPieceKind>[] = NO_TECH;
  if (stopText === null && cleanPlan) {
    const first = atEra(era);
    plan = first.plan;
    techAdds = first.techAdds;
    eraText = first.text;
    if (eraText !== null) stopText = eraText;
  }
  let lastBuild: Parameters<typeof build> | null = null;
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
  const build = (roots: ReadonlyMap<CalibrationKey, Object3D>, entries: ReadonlyMap<CalibrationKey, AssetEntry>, colourways?: ReadonlyMap<string, Texture>, stopAtlas?: Texture): void => {
    if (!plan || stopText !== null) return;
    lastBuild = [roots, entries, colourways, stopAtlas];
    try {
      const next = plan3dGroups(plan, roots, entries, colourways, stopAtlas, { era, adds: techAdds });
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

  // The era switch: a small control on the page that steps clean, tech, holdout, ruin and back, and writes `era` into the address. It swaps the drawn pieces only: the rig, the street camera, the light and the
  // loaded models stay as they are, so the camera does not move (ticket 073 C2, criterion 3).
  let eraButton: { remove(): void } | null = null;
  const setEra = (next: CityEra, label: (e: CityEra) => void): void => {
    if (cleanFailed) return;
    era = next;
    label(era);
    if (typeof history !== "undefined" && typeof location !== "undefined") {
      try {
        const u = new URL(location.href);
        u.searchParams.set("era", era);
        history.replaceState(history.state, "", u);
      } catch {
        // An address that cannot be rewritten still leaves the switch working.
      }
    }
    const r = atEra(era);
    if (r.plan === null) {
      eraText = r.text;
      stopText = r.text;
      showText(r.text);
      return;
    }
    eraText = null;
    if (stopText !== null) {
      stopText = null;
      note?.remove();
      note = null;
    }
    plan = r.plan;
    techAdds = r.techAdds;
    if (lastBuild) build(...lastBuild);
    else build(new Map(), new Map());
  };
  if (typeof document !== "undefined" && canvas.parentElement && !cleanFailed) {
    const host = canvas.parentElement;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.style.cssText = "position:absolute;right:12px;bottom:12px;z-index:6;padding:10px 16px;min-height:44px;font:16px sans-serif;border-radius:6px;border:1px solid #888;background:rgba(20,22,26,0.88);color:#e6e3da;cursor:pointer;";
    btn.setAttribute("data-era-switch", "");
    const label = (e: CityEra): void => {
      btn.textContent = `era: ${e} (tap for ${nextEra(e)})`;
      btn.setAttribute("data-era", e);
    };
    label(era);
    btn.addEventListener("click", () => setEra(nextEra(era), label));
    host.appendChild(btn);
    eraButton = { remove: () => btn.remove() };
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
  const load = opts.load ?? ((): Promise<ModelSet> => sharedTileModels(planKeys(), [STOP_SIGN_COLOURWAY]));
  void load()
    .then((set) => {
      if (disposed || stopText !== null) return;
      const input = planInput(set);
      build(input.roots, input.entries, input.colourways, input.stopAtlas);
      if (draw) {
        const d = draw;
        report = (calls) => `plan 3d: ${d.tiles.fromPack} street pieces from the pack, ${d.tiles.codeDrawn} code-drawn, ${d.tiles.calls} + ${d.interior.calls} draw calls (caps ${TILE_DRAW_CALLS_MAX} and ${INTERIOR_DRAW_CALLS_MAX}), ${d.buildings.groups.length} building groups, ${d.buildings.pieces} pieces cloned, ${d.buildings.groundPieces} of ${d.buildings.groundDraws.length} ground pieces cloned, ${d.grey.fallback} columns fell back to grey and ${d.grey.slots} ground slots are grey (${d.grey.count} grey boxes), stage 7: ${d.dress.drawn} of ${d.dress.listed} pieces drawn in ${d.dress.calls} calls (+${d.dress.boxCalls} box, cap ${DRESS_DRAW_CALLS_MAX}), stage 8: ${d.furniture.drawn} of ${d.furniture.listed} props drawn in ${d.furniture.calls} calls (cap ${FURN_DRAW_CALLS_MAX} shared with stage 9), stage 9: ${d.traffic.drawn} of ${d.traffic.listed} traffic pieces drawn in ${d.traffic.calls} calls, stop sign on 01_A: ${d.stopPainted ? "yes" : "no"}, keys left out: ${[...d.dress.leftOut, ...d.furniture.leftOut, ...d.traffic.leftOut].join(", ") || "none"}, ${calls} draw calls in the next frame`;
      }
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
      if (report) {
        const line = report(gl.info?.render.calls ?? 0);
        report = null;
        console.info(line);
      }
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
      eraButton?.remove();
      eraButton = null;
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
