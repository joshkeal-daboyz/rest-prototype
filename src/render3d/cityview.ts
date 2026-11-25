/**
 * Ticket 081 E2: a city puzzle played on the city. `loadCityView` runs the pipeline once per city and converts the puzzle on it; `createCityPlayRenderer3d` draws that plan with K3's circuit, the job live (pulses
 * moving away from the feed, sparks at a cut, lit and dark lamps, brownout flicker, the Relight), and E1's icons and break icons on a 2D canvas over it. It is the `MapRenderer3d` the page already holds, so `src/play/` plays it
 * unchanged. Dev only, like the pipeline renderer (Synty licence, 16 Nov 2026). Everything outside the job is the dead circuit K3 draws: nothing in it ever glows.
 *
 * Pure parts (testable without a canvas): `loadCityView`, `renderRoute`, `jobWires`, `wireLit`, `pointOnWire`, `cityHit`, `overlayRequested`, `relightFrame`, `createOverlayLayer`.
 */

import {
  AdditiveBlending, BoxGeometry, BufferGeometry, Color, DynamicDrawUsage, Float32BufferAttribute, Frustum, GreaterDepth, Group, InstancedMesh, LineBasicMaterial, LineSegments, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  PerspectiveCamera, Quaternion, Scene, Sphere, Vector3, type Material, type Object3D, type WebGLRenderer,
} from "three";
import { type CalibrationKey, type CityCircuitLayer, type CityPlan, type CityPlanRun, type CityPuzzle, type CityStreetsLayer, type CityPuzzleCity, type CityPuzzleConverted, type CityPuzzleView } from "../core";
import { CityPuzzleError, convertCityPuzzle } from "../city/circuit";
import { SAG_RATIO } from "../city/circuit/constants";
import { BUILT_STAGES, runCity } from "../city/pipeline";
import { streetsStageWith } from "../city/streets/stage";
import type { CityStageDef } from "../city/pipeline/types";
import type { GridState } from "../grid";
import type { MapOverlay } from "../render";
import type { Insets, Rect } from "../render/geometry";
import { drawNodeGlyph, drawX, FONT, ALARM, WARM, TARGET } from "../render/glyphs";
import { hash01 } from "../render/motion";
import { circuitDraws, circuitGroup, COMPONENT_H_M, type CircuitDraws, type CircuitDrawn, type CircuitJob } from "./circuitdraw";
import { createDayToggle, pageDayToggleHost, type DayToggle, type DayToggleHost } from "./daytoggle";
import type { Vec3 } from "./kitunits";
import { GROUND } from "./kitunits";
import { lightModeFor, type LightModeId } from "./lighting";
import { addSurface, applyLightMode, newLightOwners, setRendererMode } from "./lightrig";
import { ARCS_AT_ONCE, arcSpots, blowBolts, blowBurstDue, createFxLayer, fxSwitch, newFxBolts, relightBursts, repairedFaults, sharedFx, sparkingCuts, type FxCut, type FxEmitter, type FxLamp, type FxPiece, type FxPort, type FxRoute } from "./fx";
import { lampFlicker } from "./look";
import { DIM_SHARE, STREET_LIGHTS_MAX, buildingGlow, dimBuildings, dimPieces, glowCardMesh, glowCards, roofOffsets, setDimWindows, lampBuildings, lightPlaces, litGlass, sceneryLamps, setBuildingGlow, setStreetLights, streetLights, targetBuildings, type BuildingGlow, type BuildingLamp, type GlowCards, type LitGlass, type StreetLights } from "./windows";
import { WORLD_PER_METRE } from "./models";
import { meshParts, sharedTileModels, type ModelSet } from "./models3d";
import { OVERLAY_HIT_PX, overlayLabels, overlayHit, overlayIcons, overlayBreakHit, overlayBreaks, placePoint, type OverlayBreak, type OverlayIcon, type OverlayLabel, type Project } from "./overlay";
import type { LoadPreview } from "../core/preview";
import { createPicker, type Picker } from "./pick";
import { PlanStopError, plan3dGroups, planInput, planKeys, planFailureText } from "./plan3d";
import { createRelightClock, lampIgnition, lineFraction, type LampIgnition } from "./relight3d";
import type { MapRenderer3d } from "./renderer";
import { SIDEWALK_WALK_M, TILE_M } from "./tilecity";
import { createCityRig, type CityRig } from "./tilecity3d";
import { STOP_SIGN_COLOURWAY } from "./colourway";

const S = WORLD_PER_METRE;

// ---- loadCityView ----

const plans = new Map<string, CityPlan>();

const cityKey = (c: CityPuzzleCity): string => `${c.blocksX}x${c.blocksZ}:${c.seed}:${c.oneWay ? "one-way" : "two-way"}`;

/** The pipeline for a city: every built stage, with stage 1 the all-two-way variant when `oneWay` is false. */
function runPlan(c: CityPuzzleCity): CityPlanRun {
  const stages = BUILT_STAGES.map((s) => (s.name === "streets" && !c.oneWay ? (streetsStageWith(0) as unknown as CityStageDef) : s));
  return runCity({ blocksX: c.blocksX, blocksZ: c.blocksZ, seed: c.seed }, undefined, stages);
}

/**
 * A city puzzle opened for play: the plan it names (the pipeline runs once per city per page; two puzzles on one city share one plan object) and the puzzle converted on it. Throws `CityPuzzleError` (every
 * problem, with its rule) when the puzzle does not hold on its city, and an `Error` naming the stage when the pipeline itself fails. `build` is for a test that has the plan already.
 */
export function loadCityView(city: CityPuzzle, build: (c: CityPuzzleCity) => CityPlanRun = runPlan): CityPuzzleView {
  const key = cityKey(city.city);
  let plan = plans.get(key);
  if (!plan) {
    const run = build(city.city);
    if (!run.ok) throw new Error(planFailureText(run.failure));
    plan = run.plan;
    plans.set(key, plan);
  }
  return { plan, converted: convertCityPuzzle(city, plan), district: city.district };
}

/** The opening frame, in world units: x and z (as minY and maxY) bounds. */
export interface JobFrame {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * The opening camera's frame (081 E3): the job's places, both ends of every span of its runs and its drop or lead, each district block out to the far side of the street on its four sides, and the
 * feed's origin, with `FRAME_MARGIN_M` round it all. Nothing else in the circuit counts. With none of those it is the whole city. Pure.
 */
export function jobFrame(view: CityPuzzleView, layer: CityCircuitLayer, streets: CityStreetsLayer): JobFrame {
  const { converted } = view;
  const frame: JobFrame = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const grow = (xm: number, zm: number): void => {
    frame.minX = Math.min(frame.minX, xm - FRAME_MARGIN_M);
    frame.maxX = Math.max(frame.maxX, xm + FRAME_MARGIN_M);
    frame.minY = Math.min(frame.minY, zm - FRAME_MARGIN_M);
    frame.maxY = Math.max(frame.maxY, zm + FRAME_MARGIN_M);
  };
  const xz = new Map<string, { x: number; z: number }>();
  for (const p of layer.poles) xz.set(p.id, { x: p.x_m, z: p.z_m });
  for (const r of layer.roofs ?? []) xz.set(r.id, { x: r.x_m, z: r.z_m });
  const growId = (id: string): void => {
    const p = xz.get(id);
    if (p) grow(p.x, p.z);
  };
  const spans = new Map<string, { a: string; b: string }>();
  for (const s of [...layer.spans, ...(layer.roofSpans ?? [])]) spans.set(s.id, s);
  const at = { x: 0, y: 0, z: 0 };
  for (const place of Object.values(converted.places)) if (placePoint(place, layer, at)) grow(at.x, at.z);
  for (const run of Object.values(converted.runs)) {
    for (const id of run.spans) {
      const s = spans.get(id);
      if (s) (growId(s.a), growId(s.b));
    }
    if (run.drop !== undefined) {
      const d = layer.drops.find((x) => x.building === run.drop);
      if (d) (growId(d.pole), grow(d.x_m, d.z_m));
    }
    if (run.lead !== undefined) {
      const p = layer.posts.find((x) => x.span === run.lead);
      if (p) grow(p.x_m, p.z_m);
    }
  }
  // The district's blocks, out to the far side of the street on each of their four sides.
  const streetById = new Map(streets.streets.map((s) => [s.id, s] as const));
  const inDistrict = new Set(view.district ?? []);
  for (const b of streets.blocks) {
    if (!inDistrict.has(b.id)) continue;
    let x0 = b.i0 * TILE_M;
    let x1 = b.i1 * TILE_M;
    let z0 = b.j0 * TILE_M;
    let z1 = b.j1 * TILE_M;
    for (const side of Object.values(b.sides)) {
      const st = streetById.get(side.street);
      if (!st) continue;
      const lo = st.across0 * TILE_M;
      const hi = (st.across0 + st.bands.length) * TILE_M;
      if (st.axis === "x") (z0 = Math.min(z0, lo), z1 = Math.max(z1, hi));
      else (x0 = Math.min(x0, lo), x1 = Math.max(x1, hi));
    }
    grow(x0, z0);
    grow(x1, z1);
  }
  if (Number.isFinite(frame.minX)) {
    grow(converted.origin_m.x_m, converted.origin_m.z_m);
    return { minX: frame.minX * S, minY: frame.minY * S, maxX: frame.maxX * S, maxY: frame.maxY * S };
  }
  return { minX: 0, minY: 0, maxX: streets.w * TILE_M * S, maxY: streets.h * TILE_M * S };
}

export { CityPuzzleError };

// ---- the route ----

export type RenderRoute = "play" | "assemble" | "plan" | "sheet" | "none";

/** What `createMapRenderer3d` draws: a city view given (dev only) is the play view, ahead of every address route; without one the routes are as before and no route at all is `none`. Pure. */
export function renderRoute(r: { city: boolean; dev: boolean; assemble: boolean; plan: boolean; sheet: boolean }): RenderRoute {
  if (r.dev && r.city) return "play";
  if (r.assemble) return "assemble";
  if (r.plan) return "plan";
  if (r.sheet) return "sheet";
  return "none";
}

/** `overlay=0` in the address hides the overlay's icons and break icons; the 3D pick still plays. Pure. */
export function overlayRequested(search: string): boolean {
  return new URLSearchParams(search).get("overlay") !== "0";
}

/** How far out the player may zoom, as a multiple of the distance at which the district fills the window (Josh, 25 Nov 2026: "1.5x"). */
export const CITY_PLAY_ZOOM_OUT = 1.5;

/** The play camera's limits: `{ limit }` always, except `cam=free` in a dev build, which gives today's unlimited rig for measuring wider views. `cam=street` is the plan route's and is ignored here. Pure. */
export function playRigOptions(search: string, dev: boolean): { limit?: { zoomOut: number } } {
  if (dev && new URLSearchParams(search).get("cam") === "free") return {};
  return { limit: { zoomOut: CITY_PLAY_ZOOM_OUT } };
}

// ---- the job's wires ----

const SAMPLES = 8;
/** A pulse moves this fast (m/s) and a new one follows every `PULSE_SPACING_M`. */
export const PULSE_SPEED_M = 7;
export const PULSE_SPACING_M = 3;
/** How strong the live runs show through what hides them (081 W4; the architect's start, Josh tunes it by eye). */
export const XRAY_OPACITY = 0.25;
/** 081 V1: every job wire (live or dead) wears the dim cyan (the live glow's hue, darker; Josh, 25 Nov 2026) at this strength, steady: no glow, no pulses. Josh tunes both by eye. */
export const JOB_WIRE_TINT = 0x2a7f99;
export const JOB_WIRE_DIM = 0.4;
/** The tint draws before the live layer (render order 0), so the glow and pulses add over it unchanged. */
export const JOB_WIRE_TINT_ORDER = -1;
/** The tint layer: an instanced mesh of `count` boxes, drawn before the live layer. */
export function tintLayer(geometry: BufferGeometry, count: number): InstancedMesh {
  const mesh = new InstancedMesh(geometry, new MeshBasicMaterial({ color: JOB_WIRE_TINT, transparent: true, opacity: JOB_WIRE_DIM, depthWrite: false, toneMapped: false }), Math.max(count, 1));
  mesh.renderOrder = JOB_WIRE_TINT_ORDER;
  return mesh;
}

/**
 * The faded second pass of an instanced live mesh (081 W4): the same geometry and the same instance attributes (so the first pass's per-frame writes are the only writes), a material that draws only where something is in front
 * (`GreaterDepth`, no depth write) at `XRAY_OPACITY`. The caller adds it to the scene and disposes the returned material. `base` must already hold its `instanceColor` if it uses one.
 */
export function xrayOf(base: InstancedMesh): { mesh: InstancedMesh; material: MeshBasicMaterial } {
  const src = base.material as MeshBasicMaterial;
  const material = new MeshBasicMaterial({ color: src.color, blending: src.blending, transparent: true, opacity: XRAY_OPACITY, depthWrite: false, depthFunc: GreaterDepth, toneMapped: false });
  const mesh = new InstancedMesh(base.geometry, material, base.count);
  mesh.instanceMatrix = base.instanceMatrix;
  mesh.instanceColor = base.instanceColor;
  mesh.raycast = () => {};
  mesh.frustumCulled = false;
  return { mesh, material };
}

/** One wire of a line's run (a span, a roof span or a drop) as the 3D view animates it. World units in `pts`, metres in `len_m` and `cum_m`. */
export interface JobWire {
  readonly id: string;
  readonly line: string;
  readonly lineIndex: number;
  /** The wire's from to end runs against the line's from to to. */
  readonly flip: boolean;
  /** Where the wire sits along its line, 0..1, in the line's own from to to order. */
  readonly a0: number;
  readonly a1: number;
  readonly len_m: number;
  /** SAMPLES + 1 points of the sagged wire, x y z flat, from the wire's from end to its to end. */
  readonly pts: readonly number[];
  readonly cum_m: readonly number[];
  /** The fault that cuts this span, or null. */
  readonly cutFault: string | null;
}

interface Ends {
  readonly a: string;
  readonly b: string;
}

/** A wire's SAMPLES + 1 sagged points (x y z flat, world units) and the running length in metres at each. Pure. */
function sagged(w: { readonly from: { x: number; y: number; z: number }; readonly to: { x: number; y: number; z: number } }): { pts: number[]; cum: number[] } {
  const len3 = Math.hypot(w.to.x - w.from.x, w.to.y - w.from.y, w.to.z - w.from.z);
  const pts: number[] = [];
  const cum: number[] = [];
  let px = w.from.x;
  let py = w.from.y;
  let pz = w.from.z;
  let c = 0;
  for (let j = 0; j <= SAMPLES; j++) {
    const t = j / SAMPLES;
    const x = w.from.x + (w.to.x - w.from.x) * t;
    const y = w.from.y + (w.to.y - w.from.y) * t - SAG_RATIO * len3 * 4 * t * (1 - t);
    const z = w.from.z + (w.to.z - w.from.z) * t;
    if (j > 0) c += Math.hypot(x - px, y - py, z - pz) / S;
    pts.push(x, y, z);
    cum.push(c);
    px = x;
    py = y;
    pz = z;
  }
  return { pts, cum };
}

/**
 * The live drop of each scenery building (081 S4): its wire, pole to building, lit by the hidden line that feeds the building's hidden lamp. So it is dark while that lamp is dark, lights from the pole end as the Relight's current
 * arrives, then glows and pulses like a job span. `line` is the hidden line's id (never a file line, and never picked). Only a building in `converted.scenery` has one. Pure.
 */
export function sceneryDropWires(layer: CityCircuitLayer, draws: CircuitDraws, converted: CityPuzzleConverted): JobWire[] {
  const scenery = converted.scenery;
  if (!scenery) return [];
  const wireOf = new Map(draws.wires.map((w) => [w.id, w] as const));
  const lineTo = new Map(converted.puzzle.lines.map((l, i) => [l.to, { id: l.id, i }] as const));
  const out: JobWire[] = [];
  for (const d of layer.drops) {
    const lamp = scenery[d.building];
    const w = lamp === undefined ? undefined : wireOf.get(d.id);
    const hl = lamp === undefined ? undefined : lineTo.get(lamp);
    if (!w || !hl) continue;
    const { pts, cum } = sagged(w);
    out.push({ id: d.id, line: hl.id, lineIndex: hl.i, flip: false, a0: 0, a1: 1, len_m: cum[SAMPLES]!, pts, cum_m: cum, cutFault: null });
  }
  return out;
}

/**
 * The wires of every line's run, ordered and turned for travel: each span's `flip` follows from walking the run from the node the line starts at, and `a0` to `a1` is its share of the run's length (the drop last).
 * Wires the circuit did not draw (a zero-length span, a roof span no job uses) are left out. Pure.
 */
export function jobWires(layer: CityCircuitLayer, draws: CircuitDraws, converted: CityPuzzleConverted): JobWire[] {
  const wireOf = new Map(draws.wires.map((w) => [w.id, w] as const));
  const ends = new Map<string, Ends>([...layer.spans, ...(layer.roofSpans ?? [])].map((s) => [s.id, s] as const));
  const xz = new Map<string, { x: number; z: number }>();
  for (const p of layer.poles) xz.set(p.id, { x: p.x_m, z: p.z_m });
  for (const r of layer.roofs ?? []) xz.set(r.id, { x: r.x_m, z: r.z_m });
  const cutOf = new Map(Object.entries(converted.cuts).map(([fault, span]) => [span, fault] as const));
  const out: JobWire[] = [];
  const w0 = { x: 0, y: 0, z: 0 };
  // The conversion (081 S1) turns each file line L into `L~a` (from to h1), `L` (h1 to h2: hidden nodes, no place) and `L~b`; the file's own from node is the `~a` segment's.
  const fileFrom = new Map(converted.puzzle.lines.map((l) => [l.id, l.from] as const));
  converted.puzzle.lines.forEach((line, lineIndex) => {
    const run = converted.runs[line.id];
    if (!run) return;
    const items: { id: string; flip: boolean }[] = [];
    const spans = run.spans.map((id) => ends.get(id)).filter((e): e is Ends => e !== undefined);
    if (spans.length === run.spans.length && spans.length > 0) {
      const first = spans[0]!;
      let start: string;
      const second = spans[1];
      const shared = second ? [first.a, first.b].filter((e) => e === second.a || e === second.b) : [];
      if (second && shared.length === 1) start = shared[0] === first.a ? first.b : first.a;
      else {
        const place = converted.places[fileFrom.get(`${line.id}~a`) ?? line.from];
        const here = place && placePoint(place, layer, w0) ? { x: w0.x, z: w0.z } : null;
        const da = here && xz.get(first.a) ? Math.hypot(xz.get(first.a)!.x - here.x, xz.get(first.a)!.z - here.z) : 0;
        const db = here && xz.get(first.b) ? Math.hypot(xz.get(first.b)!.x - here.x, xz.get(first.b)!.z - here.z) : 0;
        start = da <= db ? first.a : first.b;
      }
      let cur = start;
      run.spans.forEach((id, i) => {
        const e = spans[i]!;
        const flip = e.a !== cur;
        items.push({ id, flip });
        cur = flip ? e.a : e.b;
      });
    }
    if (run.drop !== undefined) {
      const d = layer.drops.find((x) => x.building === run.drop);
      if (d) items.push({ id: d.id, flip: false });
    }
    const placed = items.filter((it) => wireOf.has(it.id));
    const lens = placed.map((it) => {
      const w = wireOf.get(it.id)!;
      return Math.hypot(w.to.x - w.from.x, w.to.y - w.from.y, w.to.z - w.from.z) / S;
    });
    const total = lens.reduce((a, b) => a + b, 0);
    let acc = 0;
    placed.forEach((it, k) => {
      const w = wireOf.get(it.id)!;
      const len3 = lens[k]! * S;
      const pts: number[] = [];
      const cum: number[] = [];
      let px = w.from.x;
      let py = w.from.y;
      let pz = w.from.z;
      let c = 0;
      for (let j = 0; j <= SAMPLES; j++) {
        const t = j / SAMPLES;
        const x = w.from.x + (w.to.x - w.from.x) * t;
        const y = w.from.y + (w.to.y - w.from.y) * t - SAG_RATIO * len3 * 4 * t * (1 - t);
        const z = w.from.z + (w.to.z - w.from.z) * t;
        if (j > 0) c += Math.hypot(x - px, y - py, z - pz) / S;
        pts.push(x, y, z);
        cum.push(c);
        px = x;
        py = y;
        pz = z;
      }
      out.push({ id: it.id, line: line.id, lineIndex, flip: it.flip, a0: total > 0 ? acc / total : 0, a1: total > 0 ? (acc + lens[k]!) / total : 1, len_m: cum[SAMPLES]!, pts, cum_m: cum, cutFault: cutOf.get(it.id) ?? null });
      acc += lens[k]!;
    });
  });
  return out;
}

export interface WireLit {
  /** Current travels along the wire's from to to. */
  forward: boolean;
  /** How much of the wire, from the end current enters, is lit: 0..1. */
  frac: number;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * One wire's lit share. `fraction` is how much of its line is lit (0 dead, 1 live; the Relight's `lineFraction` between), `reversed` that current enters the line at its to end, Writes into `out`. A cut is not handled here: `lineFlow` caps the line's fraction at the break.
 */
export function wireLit(w: JobWire, reversed: boolean, fraction: number, out: WireLit): WireLit {
  const t0 = reversed ? 1 - w.a1 : w.a0;
  const t1 = reversed ? 1 - w.a0 : w.a1;
  const f = t1 > t0 ? clamp01((fraction - t0) / (t1 - t0)) : fraction >= t1 && fraction > 0 ? 1 : 0;
  out.forward = w.flip === reversed;
  out.frac = f;
  return out;
}

export interface WirePoint {
  x: number;
  y: number;
  z: number;
  /** The sample segment the point is in. */
  seg: number;
}

/** The point `s` metres along the wire from its from end (clamped), and its segment. Writes into `out`. */
export function pointOnWire(w: JobWire, s: number, out: WirePoint): WirePoint {
  const c = w.cum_m;
  const at = s < 0 ? 0 : s > w.len_m ? w.len_m : s;
  let j = 0;
  while (j < SAMPLES - 1 && c[j + 1]! < at) j++;
  const span = c[j + 1]! - c[j]!;
  const t = span > 0 ? (at - c[j]!) / span : 0;
  out.x = w.pts[j * 3]! + (w.pts[j * 3 + 3]! - w.pts[j * 3]!) * t;
  out.y = w.pts[j * 3 + 1]! + (w.pts[j * 3 + 4]! - w.pts[j * 3 + 1]!) * t;
  out.z = w.pts[j * 3 + 2]! + (w.pts[j * 3 + 5]! - w.pts[j * 3 + 2]!) * t;
  out.seg = j;
  return out;
}

// ---- the Relight and the state, per frame ----

export interface LineFlow {
  /** How much of the line is lit: 1 live, 0 dead; the Relight's fraction while it runs. */
  fraction: number;
  /** Current enters the line at its to end. */
  reversed: boolean;
}

/** The indices of the two hidden segments S1's conversion cuts a file line into: `L~a` (at its from end) and `L~b` (at its to end). The drawn run spans all three. */
export interface LineAround {
  readonly a: number;
  readonly b: number;
}

/**
 * The segments around each file line that has them (081 S1's `L~a`, `L`, `L~b`), by the line's id. A line the conversion did not split is not in it. Pure; built once.
 */
export function linesAround(lines: readonly { id: string }[]): Map<string, LineAround> {
  const at = new Map(lines.map((l, i) => [l.id, i] as const));
  const out = new Map<string, LineAround>();
  for (const [id] of at) {
    const a = at.get(`${id}~a`);
    const b = at.get(`${id}~b`);
    if (a !== undefined && b !== undefined) out.set(id, { a, b });
  }
  return out;
}

/**
 * How much of a drawn run is lit during the Relight, the run being `L~a`, `L`, `L~b` end to end (S1's split keeps `L` as the middle third, but its wires draw the whole run). Lit from the end current enters
 * until the far end of the segment past: the run's start is the entering segment's start, its end the leaving segment's end. A segment the Relight never reaches is skipped, so the line's own time is the fallback.
 */
export function wholeFraction(plan: Parameters<typeof lineFraction>[0], lineIndex: number, around: LineAround, reversed: boolean, relT: number): number {
  const first = reversed ? around.b : around.a;
  const last = reversed ? around.a : around.b;
  const s = plan.lineStart[first]!;
  const e = plan.lineEnd[last]!;
  if (!Number.isFinite(s) || !Number.isFinite(e)) return lineFraction(plan, lineIndex, relT);
  return e > s ? clamp01((relT - s) / (e - s)) : relT >= e ? 1 : 0;
}

/**
 * One frame's flow on a line: from the state in play, from the Relight's own plan while one runs (`plan` and `relT`, from `relight3d.ts`'s clock). A line that is not powered stays 0 either way.
 */
export function lineFlow(state: GridState, line: { id: string; to: string }, lineIndex: number, lineWires: readonly JobWire[], plan: Parameters<typeof lineFraction>[0] | null, relT: number, out: LineFlow, around?: LineAround): LineFlow {
  out.reversed = state.flowFrom.get(line.id) === line.to;
  let f = 0;
  if (state.powered.has(line.id)) f = !plan ? 1 : around ? wholeFraction(plan, lineIndex, around, out.reversed, relT) : lineFraction(plan, lineIndex, relT);
  // The grid keeps a damaged line powered up to its break; current does not cross a cut that is still there. Cap at the cut span's middle, counted from the end current enters.
  for (const w of lineWires) {
    if (w.cutFault === null) continue;
    let standing = false;
    for (const x of state.faults) if (x.id === w.cutFault) standing = true;
    if (!standing) continue;
    const mid = (w.a0 + w.a1) / 2;
    f = Math.min(f, out.reversed ? 1 - mid : mid);
  }
  out.fraction = f;
  return out;
}

/** A lamp's state this frame: lit from the state in play, from the Relight's plan (ignition and flare age) while one runs. The one function the renderer and the Relight case share. Writes into `out`. */
export function lampState(plan: Parameters<typeof lineFraction>[0] | null, state: GridState, lampId: string, index: number, relT: number, out: LampIgnition): LampIgnition {
  if (plan) return lampIgnition(plan, state, lampId, index, relT, out);
  out.on = state.lit.has(lampId);
  out.flareAge = -1;
  return out;
}

/** The lamp ids the Relight lights, in the order they ignite, at each time of `times`: what a player sees go on. Pure; for the case that holds "the Relight can't be interrupted". */
export function relightFrame(puzzle: CityPuzzleConverted["puzzle"], states: readonly GridState[], times: readonly number[]): { lit: string[]; fractions: number[] }[] {
  const clock = createRelightClock(puzzle);
  const ign: LampIgnition = { on: false, flareAge: -1 };
  const fl: LineFlow = { fraction: 0, reversed: false };
  const frames: { lit: string[]; fractions: number[] }[] = [];
  times.forEach((t, k) => {
    const state = states[Math.min(k, states.length - 1)]!;
    const plan = clock.update(state, t);
    const lit: string[] = [];
    puzzle.nodes.forEach((n, i) => {
      if (n.type === "lamp" && lampState(plan, state, n.id, i, t, ign).on) lit.push(n.id);
    });
    frames.push({ lit, fractions: puzzle.lines.map((l, i) => lineFlow(state, l, i, [], plan, t, fl).fraction) });
  });
  return frames;
}

// ---- the hit order ----

export interface HitInputs {
  width: number;
  height: number;
  blockers: readonly Rect[];
  icons: readonly OverlayIcon[];
  breaks: readonly OverlayBreak[];
  /** The 3D pick (`pick.ts`): the job's models give node ids, its spans give line ids, scenery gives null. */
  pick: (x: number, y: number) => string | null;
}

/** The piece under a canvas point: the overlay first (an icon, then a break), then the 3D pick. A point off the canvas or under a panel is dead to both. */
export function cityHit(x: number, y: number, i: HitInputs): string | null {
  if (x < 0 || y < 0 || x > i.width || y > i.height) return null;
  for (const r of i.blockers) if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return null;
  return overlayHit(i.icons, x, y) ?? overlayBreakHit(i.breaks, x, y) ?? i.pick(x, y);
}

// ---- the overlay canvas ----

export interface OverlayLayer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D | null;
  /** Match the source canvas: the same CSS box, at the device pixel ratio capped at 2. */
  resize(): void;
  remove(): void;
}

/** A 2D canvas laid over `source`, the same CSS size, taking no pointer input (clicks reach the WebGL canvas). Null when the source is not in a page. */
export function createOverlayLayer(source: HTMLCanvasElement, doc: Pick<Document, "createElement">, dpr: number): OverlayLayer | null {
  const parent = source.parentElement;
  if (!parent) return null;
  const ratio = Math.min(Math.max(dpr, 1), 2);
  const canvas = doc.createElement("canvas");
  canvas.setAttribute("data-city-overlay", "");
  canvas.style.cssText = "position:absolute;pointer-events:none;";
  parent.insertBefore(canvas, source.nextSibling);
  const ctx = canvas.getContext("2d");
  const layer: OverlayLayer = {
    canvas,
    ctx,
    resize() {
      const w = Math.max(source.clientWidth, 1);
      const h = Math.max(source.clientHeight, 1);
      canvas.style.left = `${source.offsetLeft}px`;
      canvas.style.top = `${source.offsetTop}px`;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) {
        canvas.width = Math.round(w * ratio);
        canvas.height = Math.round(h * ratio);
      }
    },
    remove() {
      canvas.remove();
    },
  };
  layer.resize();
  return layer;
}

/** Draws the overlay: each break (a red X, with sparks only while live), then the icons, the hovered and highlighted one ringed. */
function paintOverlay(c: CanvasRenderingContext2D, ratio: number, w: number, h: number, icons: readonly OverlayIcon[], breaks: readonly OverlayBreak[], labels: readonly OverlayLabel[], time: number, hover: string | null, highlight: string | null): void {
  c.setTransform(ratio, 0, 0, ratio, 0, 0);
  c.clearRect(0, 0, w, h);
  for (const k of breaks) {
    c.strokeStyle = ALARM;
    c.lineWidth = 3;
    drawX(c, k.x, k.y, 8);
    if (k.sparking) {
      c.strokeStyle = "#fff3c9";
      c.lineWidth = 2;
      for (let n = 0; n < 4; n++) {
        const a = hash01(Math.floor(time * 12) * 4 + n) * Math.PI * 2;
        const r = 10 + hash01(n + Math.floor(time * 12)) * 8;
        c.beginPath();
        c.moveTo(k.x + Math.cos(a) * 9, k.y + Math.sin(a) * 9);
        c.lineTo(k.x + Math.cos(a) * r, k.y + Math.sin(a) * r);
        c.stroke();
      }
    }
  }
  for (const o of icons) {
    drawNodeGlyph(c, o.spec, o.x, o.y, o.size);
    if (o.id === hover || o.id === highlight) {
      c.strokeStyle = o.id === highlight ? WARM : TARGET;
      c.lineWidth = 2.5;
      c.beginPath();
      c.arc(o.x, o.y, o.size * 0.7, 0, Math.PI * 2);
      c.stroke();
    }
  }
  // The numbers (081 V3): a dark halo under each so they read on any ground; red is never the only cue, the sign and the "of" carry the sense.
  c.font = FONT;
  c.textAlign = "left";
  c.textBaseline = "middle";
  c.lineJoin = "round";
  c.lineWidth = 3;
  c.strokeStyle = "rgba(10,12,18,0.85)";
  for (const l of labels) {
    c.strokeText(l.text, l.x, l.y);
    c.fillStyle = l.red ? ALARM : "#f2ead7";
    c.fillText(l.text, l.x, l.y);
  }
}

/** The camera's projection as E1 takes it: a world point in metres to canvas CSS px, false when it is behind the camera. */
export function cameraProject(camera: PerspectiveCamera, size: { width: number; height: number }): Project {
  const v = new Vector3();
  return (x, y, z, out) => {
    v.set(x * S, y * S, z * S).applyMatrix4(camera.matrixWorldInverse);
    if (v.z >= 0) return false;
    v.applyMatrix4(camera.projectionMatrix);
    out.x = ((v.x + 1) / 2) * size.width;
    out.y = ((1 - v.y) / 2) * size.height;
    return true;
  };
}

// ---- the renderer ----

export interface CityPlayOptions {
  insets?: Insets | undefined;
  dpr: number;
  /** The page's query string (`light=day`, `overlay=0`). */
  search: string;
  /** Draw the overlay (default: `overlayRequested(search)`). */
  overlay?: boolean;
  /** The models to load once the view is up (default: the page's shared tile load). A test passes its own so nothing is fetched. */
  load?: () => Promise<ModelSet>;
  toggleHost?: DayToggleHost;
}

const GROUND_MARGIN_M = 60;
const FRAME_MARGIN_M = 16;
const GLOW_COLOUR = new Color(0x4fd1ff);
const WIRE_THICK_M = 0.16;

const Z_AXIS = new Vector3(0, 0, 1);
const UP_AXIS = new Vector3(0, 1, 0);

/**
 * The play view of a city puzzle: the plan with K3's circuit and the job, live, through the same `MapRenderer3d` the page already holds. A circuit with no plan layers it needs throws before anything is made.
 */
export function createCityPlayRenderer3d(gl: WebGLRenderer, canvas: HTMLCanvasElement, view: CityPuzzleView, opts: CityPlayOptions): MapRenderer3d {
  const { plan, converted } = view;
  const puzzle = converted.puzzle;
  const layer = plan.layers.circuit;
  const streets = plan.layers.streets;
  if (!layer || !streets) throw new PlanStopError("the plan has no circuit layer to play on", []);
  const w0 = Math.max(canvas.clientWidth, 1);
  const h0 = Math.max(canvas.clientHeight, 1);
  const size = { width: w0, height: h0 };
  let insets: Insets = { ...(opts.insets ?? {}) };
  let disposed = false;
  let blockers: Rect[] = [];
  const job: CircuitJob = { converted };
  const draws = circuitDraws(layer, streets, job);
  const wires = jobWires(layer, draws, converted);
  // The live layer animates the job's wires and, after them, each scenery building's drop (081 S4); picking and the cuts read `wires` only.
  const liveWires = [...wires, ...sceneryDropWires(layer, draws, converted)];
  const around = linesAround(puzzle.lines);

  const scene = new Scene();
  const owners = newLightOwners();
  const lightId0: LightModeId = lightModeFor("puzzle", opts.search, import.meta.env.DEV);
  // dpr=N (dev only, F0): the pixel ratio the view renders at, in place of opts.dpr.
  const devDpr = import.meta.env.DEV ? /[?&]dpr=(\d+(?:\.\d+)?)(&|$)/.exec(opts.search ?? "") : null;
  const dpr = devDpr && Number(devDpr[1]) > 0 ? Number(devDpr[1]) : opts.dpr;
  applyLightMode(scene, gl, lightId0, owners);

  // The frame: the district, its four streets and the job's places and wires (081 E3), not every pole in the city.
  const frame = jobFrame(view, layer, streets);

  const cityW = streets.w * TILE_M * S;
  const cityH = streets.h * TILE_M * S;
  const ground = new Mesh(new BoxGeometry(cityW + 2 * GROUND_MARGIN_M * S, 0.1, cityH + 2 * GROUND_MARGIN_M * S), new MeshStandardMaterial({ color: GROUND, roughness: 1 }));
  ground.position.set(cityW / 2, -SIDEWALK_WALK_M * S - 0.02 * S - 0.05, cityH / 2);
  ground.raycast = () => {};
  addSurface(owners, "ground", ground.material as Material);
  scene.add(ground);

  // ---- the city and its circuit ----
  let city: ReturnType<typeof plan3dGroups> | null = null;
  let circuit: CircuitDrawn | null = null;
  let lastRoots: ReadonlyMap<CalibrationKey, Object3D> = new Map();
  const cutIds = Object.keys(converted.cuts);
  const cutReadable: boolean[] = cutIds.map(() => false);
  const readableNow = (state: GridState): boolean => {
    let changed = false;
    cutIds.forEach((id, i) => {
      const r = state.readableFaults.has(id);
      if (r !== cutReadable[i]) {
        cutReadable[i] = r;
        changed = true;
      }
    });
    return changed;
  };
  const standCircuit = (): void => {
    if (!city) return;
    if (circuit) {
      city.group.remove(circuit.group);
      circuit.dispose();
    }
    const readable = new Set(cutIds.filter((_, i) => cutReadable[i]));
    circuit = circuitGroup(circuitDraws(layer, streets, { converted, readable }), lastRoots as ReadonlyMap<string, Object3D>);
    city.group.add(circuit.group);
  };
  // The lit buildings (081 L1, F1b): each job lamp's building lights through its instances' window level (set each frame), and its shop glass is one more instanced layer.
  const lampsOf = lampBuildings(puzzle.nodes, converted.places, layer.roofs ?? [], plan.layers.buildings?.buildings ?? []);
  // The scenery buildings on the job's live poles join their hidden lamps in (081 S4), after the job lamps' buildings, so L1's windows, the shop glass, L2's lights and L3's exclusion all take them.
  for (const [id, list] of sceneryLamps(converted, plan.layers.buildings?.buildings ?? [])) {
    const have = lampsOf.get(id);
    if (!have) lampsOf.set(id, list);
    else for (const l of list) if (!have.some((x) => x.id === l.id)) have.push(l);
  }
  // 081 W3: the buildings a target lamp lights read gold (W-Q2).
  const targetOf = targetBuildings(lampsOf, puzzle.target ?? []);
  let litBuildings: { id: string; lamps: readonly BuildingLamp[] }[] = [];
  let litShop: LitGlass | null = null;
  // 081 W2: the glow cards, one instanced mesh for the job, in front of every storey's glass on the lit buildings' street faces.
  let litCards: GlowCards | null = null;
  let roofSkip: ReadonlyMap<string, ReadonlySet<number>> = new Map();
  // The street lights (081 L2): one real light per lit building with a street face, made at build at intensity 0 and never added, removed or hidden in play (the count is fixed, so no program recompiles).
  // `lights=N` (dev only) fills the pool to N lights, the spares on the first building.
  const lightsWanted = import.meta.env.DEV ? Number(/[?&]lights=(\d+)(&|$)/.exec(opts.search ?? "")?.[1] ?? NaN) : NaN;
  const lightGlows = new Map<string, BuildingGlow>();
  let pool: StreetLights | null = null;
  let modelsLoaded = false;
  const freeWindows = (): void => {
    litBuildings = [];
    if (pool) {
      for (const l of pool.lights) l.removeFromParent();
      pool = null;
    }
    lightGlows.clear();
    if (litCards) {
      if (litCards.mesh) city?.group.remove(litCards.mesh);
      litCards.dispose();
      litCards = null;
    }
    if (litShop) {
      if (litShop.mesh) city?.group.remove(litShop.mesh);
      litShop.dispose();
      litShop = null;
    }
  };
  const standWindows = (next: NonNullable<typeof city>, roots: ReadonlyMap<CalibrationKey, Object3D>): void => {
    for (const [id, lamps] of lampsOf) litBuildings.push({ id, lamps });
    litShop = litGlass(next.dressDraws, new Set(lampsOf.keys()), roots);
    if (litShop.mesh) next.group.add(litShop.mesh);
    roofSkip = roofOffsets(dimBuildings(next.buildings.draws, (k) => (roots.get(k) ? meshParts(roots.get(k)!).length : 0)));
    litCards = glowCardMesh(glowCards(plan, lampsOf.keys()), S);
    if (litCards.mesh) next.group.add(litCards.mesh);
    // 081 L3: a few dim windows in the dead city, set once at build, never on a job lamp's building.
    setDimWindows(next.buildings, dimPieces(dimBuildings(next.buildings.draws, (k) => (roots.get(k) ? meshParts(roots.get(k)!).length : 0)), DIM_SHARE, plan.options.seed, new Set(lampsOf.keys())));
    const max = Number.isFinite(lightsWanted) ? Math.min(lightsWanted, STREET_LIGHTS_MAX) : STREET_LIGHTS_MAX;
    const places = lightPlaces(plan, lampsOf.keys(), max);
    if (places.length >= max && lightPlaces(plan, lampsOf.keys(), Infinity).length > places.length) console.warn(`street lights: more lit-able buildings than the cap of ${max}; the first ${max} get a light`);
    pool = streetLights(places, S, Number.isFinite(lightsWanted) ? Math.max(0, lightsWanted - places.length) : 0);
    for (const l of pool.lights) next.group.add(l);
    for (const id of lampsOf.keys()) lightGlows.set(id, { level: 0, flare: 0 });
  };
  const build = (set: ModelSet | null): void => {
    const input = set ? planInput(set) : null;
    try {
      const next = plan3dGroups(plan, input?.roots ?? new Map(), input?.entries ?? new Map(), input?.colourways, input?.stopAtlas, undefined, job);
      freeWindows();
      if (city) {
        scene.remove(city.group);
        city.dispose();
      }
      circuit?.dispose();
      circuit = null;
      city = next;
      lastRoots = input?.roots ?? new Map();
      scene.add(city.group);
      standWindows(next, lastRoots);
      modelsLoaded = input !== null;
      for (const key of ["street", "pavement", "kerb", "grass"]) {
        const mats = [...(city.tiles.surfaces.get(key) ?? []), ...(city.interior.surfaces.get(key) ?? [])];
        if (mats.length > 0) owners.materials.set(key, mats);
        else owners.materials.delete(key);
      }
      applyLightMode(scene, null, (scene.userData["lightMode"] as LightModeId | undefined) ?? lightId0, owners);
      standCircuit();
    } catch (e) {
      if (!(e instanceof PlanStopError)) throw e;
      console.info(`City plan cannot be drawn: ${e.message}`, e.cells);
    }
  };
  build(null);

  // ---- the live layer: glow along the wires, pulses, sparks, lamps ----
  const live = new Group();
  live.name = "city-play:live";
  scene.add(live);
  const geoms: BufferGeometry[] = [];
  const mats: Material[] = [];
  const glowMat = new MeshBasicMaterial({ color: 0xffffff, blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false });
  const unitBox = new BoxGeometry(1, 1, 1);
  geoms.push(unitBox);
  mats.push(glowMat);
  const segTotal = liveWires.length * SAMPLES;
  const segQ: Quaternion[] = [];
  const segMid: Vector3[] = [];
  const segLen: number[] = [];
  const glowMesh = new InstancedMesh(unitBox, glowMat, Math.max(segTotal, 1));
  glowMesh.instanceMatrix.setUsage(DynamicDrawUsage);
  glowMesh.raycast = () => {};
  glowMesh.frustumCulled = false;
  const m4 = new Matrix4();
  const qScratch = new Quaternion();
  const vScratch = new Vector3();
  const sScratch = new Vector3();
  const colour = new Color();
  const dir = new Vector3();
  liveWires.forEach((w, wi) => {
    for (let j = 0; j < SAMPLES; j++) {
      const a = new Vector3(w.pts[j * 3]!, w.pts[j * 3 + 1]!, w.pts[j * 3 + 2]!);
      const b = new Vector3(w.pts[j * 3 + 3]!, w.pts[j * 3 + 4]!, w.pts[j * 3 + 5]!);
      dir.subVectors(b, a);
      const len = dir.length();
      const q = new Quaternion().setFromUnitVectors(Z_AXIS, len > 0 ? dir.normalize() : Z_AXIS);
      const mid = a.add(b).multiplyScalar(0.5);
      segQ.push(q);
      segMid.push(mid);
      segLen.push(len);
      glowMesh.setMatrixAt(wi * SAMPLES + j, m4.compose(mid, q, sScratch.set(WIRE_THICK_M * S, WIRE_THICK_M * S, len * 1.05)));
      glowMesh.setColorAt(wi * SAMPLES + j, colour.setRGB(0, 0, 0));
    }
  });
  live.add(glowMesh);
  const glowX = xrayOf(glowMesh);
  mats.push(glowX.material);
  live.add(glowX.mesh);

  // 081 V1: one static tint layer over the job's wires (not the scenery drops), made now and never written in play. Slightly thicker than the wire so it shows on the dark cable; the live glow draws over it.
  const tintMesh = tintLayer(unitBox, wires.length * SAMPLES);
  mats.push(tintMesh.material as Material);
  wires.forEach((_w, wi) => {
    for (let j = 0; j < SAMPLES; j++) {
      const k = wi * SAMPLES + j;
      tintMesh.setMatrixAt(k, m4.compose(segMid[k]!, segQ[k]!, sScratch.set(WIRE_THICK_M * 1.5 * S, WIRE_THICK_M * 1.5 * S, segLen[k]! * 1.05)));
    }
  });
  tintMesh.instanceMatrix.needsUpdate = true;
  tintMesh.raycast = () => {};
  tintMesh.frustumCulled = false;
  tintMesh.name = "city-play:wire-tint";
  live.add(tintMesh);

  const pulsesPer = liveWires.map((w) => Math.max(1, Math.ceil(w.len_m / PULSE_SPACING_M)));
  const pulseTotal = pulsesPer.reduce((a, b) => a + b, 0);
  const pulseMat = new MeshBasicMaterial({ color: 0xe8fbff, blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false });
  mats.push(pulseMat);
  const pulseMesh = new InstancedMesh(unitBox, pulseMat, Math.max(pulseTotal, 1));
  pulseMesh.instanceMatrix.setUsage(DynamicDrawUsage);
  pulseMesh.raycast = () => {};
  pulseMesh.frustumCulled = false;
  live.add(pulseMesh);
  const pulseX = xrayOf(pulseMesh);
  mats.push(pulseX.material);
  live.add(pulseX.mesh);

  // The spans a break cuts (the particle effects stand at the middle of each: 081 FX2).
  const cutWires = wires.map((w, wi) => ({ w, wi })).filter((c) => c.w.cutFault !== null);

  // A lamp is a building's windows, glow cards and light (081 W2); no lamp post or disc stands, and a `{ post }` lamp draws its overlay icon only.

  // ---- picking: invisible proxies for the job's models and spans ----
  const pickGroup = new Group();
  const hidden = new MeshBasicMaterial({ visible: false });
  const hiddenLine = new LineBasicMaterial({ visible: false });
  mats.push(hidden, hiddenLine);
  const nodePiece = new Map([...draws.pieces, ...draws.removed].map((p) => [p.id, p] as const));
  const lampPlaces = new Map<string, Vec3>();
  const nodeCentre = new Map<string, Vec3>();
  for (const n of puzzle.nodes) {
    const place = converted.places[n.id];
    const piece = n.type === "feed" && place && "pole" in place ? nodePiece.get(place.pole) : place && "roof" in place && n.type === "feed" ? nodePiece.get(place.roof) : nodePiece.get(n.id);
    if (!piece) continue;
    const component = piece.component;
    const h = Math.max(component ? COMPONENT_H_M[component] : 2, 1.8);
    const box = new BoxGeometry(2.0 * S, h * S, 2.0 * S);
    geoms.push(box);
    const m = new Mesh(box, hidden);
    m.position.set(piece.position.x, piece.position.y + (h / 2) * S, piece.position.z);
    m.userData["pickKind"] = "node";
    m.userData["pickId"] = n.id;
    pickGroup.add(m);
    if (n.type === "lamp") lampPlaces.set(n.id, { x: piece.position.x, y: piece.position.y + (h / 2) * S, z: piece.position.z });
    nodeCentre.set(n.id, { x: piece.position.x, y: piece.position.y + (h / 2) * S, z: piece.position.z });
  }
  const linePos = new Map<string, number[]>();
  for (const w of wires) {
    const arr = linePos.get(w.line) ?? [];
    for (let j = 0; j < SAMPLES; j++) arr.push(w.pts[j * 3]!, w.pts[j * 3 + 1]!, w.pts[j * 3 + 2]!, w.pts[j * 3 + 3]!, w.pts[j * 3 + 4]!, w.pts[j * 3 + 5]!);
    linePos.set(w.line, arr);
  }
  for (const [id, arr] of linePos) {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(arr, 3));
    geoms.push(g);
    const ls = new LineSegments(g, hiddenLine);
    ls.userData["pickKind"] = "wire";
    ls.userData["pickId"] = id;
    pickGroup.add(ls);
  }

  const rigOpts = playRigOptions(opts.search ?? "", import.meta.env.DEV);
  if (!rigOpts.limit) console.info("cam=free: the camera limits are off (dev only)");
  const rig: CityRig = createCityRig(frame, w0, h0, insets, rigOpts);
  const camera = rig.camera;
  scene.add(pickGroup);
  const picker: Picker = createPicker(pickGroup, camera, size);

  // ---- the overlay ----
  const wantOverlay = opts.overlay ?? overlayRequested(opts.search);
  const overlayLayer = wantOverlay && typeof document !== "undefined" ? createOverlayLayer(canvas, document, dpr) : null;
  const project = cameraProject(camera, size);
  let icons: readonly OverlayIcon[] = [];
  let breaks: readonly OverlayBreak[] = [];
  let preview: LoadPreview | null = null;
  const ratings = new Map<string, number>();
  for (const n of puzzle.nodes) if (n.type === "fusebox" && n.rating !== undefined) ratings.set(n.id, n.rating);
  let drawnW = -1;
  let drawnH = -1;

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
    size.width = w;
    size.height = h;
    gl.setPixelRatio(dpr);
    gl.setSize(w, h, false);
    rig.resize(w, h, insets);
    overlayLayer?.resize();
    drawnW = w;
    drawnH = h;
  }
  resize();

  const load = opts.load ?? ((): Promise<ModelSet> => sharedTileModels(planKeys(), [STOP_SIGN_COLOURWAY]));
  void load()
    .then((set) => {
      if (!disposed) build(set);
    })
    .catch((e: unknown) => {
      console.info(`3D models: not applied (${e instanceof Error ? e.message : String(e)}).`);
    });

  const clock = createRelightClock(puzzle);
  const flow: LineFlow = { fraction: 0, reversed: false };
  const lit: WireLit = { forward: true, frac: 0 };
  const wp: WirePoint = { x: 0, y: 0, z: 0, seg: 0 };
  const bg: BuildingGlow = { level: 0, flare: 0 };
  const wiresOfLine = new Map<string, JobWire[]>();
  for (const w of liveWires) (wiresOfLine.get(w.line) ?? wiresOfLine.set(w.line, []).get(w.line)!).push(w);
  const lineOf = new Map(puzzle.lines.map((l, i) => [l.id, { line: l, index: i }] as const));

  // ---- particle effects (081 FX2): live-break sparks and repair flashes, from the state alone ----
  const fxMode = fxSwitch(opts.search ?? "", import.meta.env.DEV);
  const fxCuts: FxCut[] = cutWires.map(({ w }) => ({ fault: w.cutFault!, line: w.line }));
  // Each cut's point (the cut span's middle sample, where the break icon sits) and each fault's place (a cut's point, or its node's pick place), in world units.
  const fxCutAt = new Float32Array(cutWires.length * 3);
  cutWires.forEach(({ w }, i) => {
    fxCutAt[i * 3] = w.pts[(SAMPLES / 2) * 3]!;
    fxCutAt[i * 3 + 1] = w.pts[(SAMPLES / 2) * 3 + 1]!;
    fxCutAt[i * 3 + 2] = w.pts[(SAMPLES / 2) * 3 + 2]!;
  });
  const faultAt = new Map<string, Vec3>();
  // The ground under each cut: the street height at its span's poles' feet (the lower of the two), else the ground plane.
  const poleFoot = new Map(draws.pieces.filter((p) => p.role === "pole" || p.role === "feed").map((p) => [p.id, p.position.y] as const));
  const fxEmitters: FxEmitter[] = cutWires.map(({ w }, i) => {
    const span = layer.spans.find((s) => s.id === w.id);
    const feet = span ? [poleFoot.get(span.a), poleFoot.get(span.b)].filter((y): y is number => y !== undefined) : [];
    return { id: i + 1, x: fxCutAt[i * 3]!, y: fxCutAt[i * 3 + 1]!, z: fxCutAt[i * 3 + 2]!, ground: feet.length > 0 ? Math.min(...feet) : ground.position.y + 0.05, span: { pts: w.pts, cum_m: w.cum_m, len_m: w.len_m } };
  });
  const fx = fxMode === "off" ? null : createFxLayer(fxEmitters);
  if (fxMode === "all") console.info("3D effects: fx=all: every cut sparks whatever its state (measure only).");
  for (const f of puzzle.faults) {
    const ci = fxCuts.findIndex((c) => c.fault === f.id);
    const at = ci >= 0 ? { x: fxCutAt[ci * 3]!, y: fxCutAt[ci * 3 + 1]!, z: fxCutAt[ci * 3 + 2]! } : nodeCentre.get(f.at);
    if (at) faultAt.set(f.id, at);
  }
  const faultPlaces = [...faultAt.values()];
  const fxAllNext = new Float64Array(faultPlaces.length);
  if (fx) {
    live.add(fx.group);
    void sharedFx()
      .then((loaded) => {
        if (disposed) return;
        fx.setTextures(loaded.textures);
        fx.setMeshes(loaded.meshes);
      })
      .catch((e: unknown) => {
        console.info(`3D effects: not applied (${e instanceof Error ? e.message : String(e)}).`);
      });
  }
  // ---- 081 FX4: a blown fuse (a bolt down the wires it served, then a burst at the box), FX3: brownout arcs at the poles and a burst at each target lamp as it lights ----
  interface Blow {
    readonly faultId: string;
    readonly synthetic: boolean;
    readonly routes: readonly FxRoute[];
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly ground: number;
    /** The page time of the first frame after the event (negative until then), and the blow clock of the frame before. */
    start: number;
    prevT: number;
  }
  const blows: Blow[] = [];
  const bolts = newFxBolts(16);
  /** The wires from `nodeId` along `path` (line ids, in order), each from the end nearer the fuse. */
  const routeOf = (nodeId: string, path: readonly string[]): FxRoute | null => {
    let cur = nodeId;
    const pieces: FxPiece[] = [];
    let len = 0;
    for (const lid of path) {
      const e = lineOf.get(lid);
      if (!e) continue;
      const fwd = e.line.from === cur;
      cur = fwd ? e.line.to : e.line.from;
      const ws = [...(wiresOfLine.get(lid) ?? [])].sort((a, b) => (fwd ? a.a0 - b.a0 : b.a0 - a.a0));
      for (const w of ws) {
        pieces.push({ pts: w.pts, cum_m: w.cum_m, len_m: w.len_m, rev: fwd ? w.flip : !w.flip });
        len += w.len_m;
      }
    }
    return pieces.length > 0 ? { pieces, len_m: len } : null;
  };
  const blowOf = (faultId: string, nodeId: string, paths: readonly (readonly string[])[], synthetic: boolean): Blow => {
    const routes: FxRoute[] = [];
    for (const path of paths) {
      const r = routeOf(nodeId, path);
      if (r && routes.length < bolts.length) routes.push(r);
    }
    const at = nodeCentre.get(nodeId) ?? { x: 0, y: 0, z: 0 };
    const piece = nodePiece.get(nodeId);
    return { faultId, synthetic, routes, x: at.x, y: at.y, z: at.z, ground: piece ? piece.position.y : ground.position.y + 0.05, start: -1, prevT: -1 };
  };
  // The pole ends of the job's live wires (a cut span's are left out): an insulator and the point 0.6 m along the wire.
  const arcPorts: FxPort[] = [];
  for (const w of wires) {
    if (w.cutFault !== null || w.len_m < 1.4) continue;
    const last = SAMPLES * 3;
    pointOnWire(w, 0.6, wp);
    arcPorts.push({ line: w.line, ax: w.pts[0]!, ay: w.pts[1]!, az: w.pts[2]!, bx: wp.x, by: wp.y, bz: wp.z });
    pointOnWire(w, w.len_m - 0.6, wp);
    arcPorts.push({ line: w.line, ax: w.pts[last]!, ay: w.pts[last + 1]!, az: w.pts[last + 2]!, bx: wp.x, by: wp.y, bz: wp.z });
  }
  const arcIdx: number[] = [];
  // The target lamps' bursts stand where the building's street light does (L2), else at the lamp.
  const burstLamps: FxLamp[] = [];
  for (const id of puzzle.target ?? []) {
    const index = puzzle.nodes.findIndex((n) => n.id === id);
    if (index < 0) continue;
    let at: Vec3 | undefined = lampPlaces.get(id);
    for (const [bid, list] of lampsOf) {
      if (!list.some((l) => l.id === id)) continue;
      const lp = lightPlaces(plan, [bid], 1)[0];
      if (lp) at = { x: lp.x * S, y: lp.y * S, z: lp.z * S };
      break;
    }
    if (at) burstLamps.push({ index, x: at.x, y: at.y, z: at.z });
  }
  const burstIdx: number[] = [];
  let fxRelPrev = -1;
  // fx=all: a blow on the job's first rated fuse box every 3 s.
  const allFuse = puzzle.nodes.find((n) => n.type === "fusebox" && n.rating !== undefined);
  const allFuseLine = allFuse ? puzzle.lines.find((l) => l.from === allFuse.id || l.to === allFuse.id) : undefined;
  let fxAllBlow = 0;
  let fxAllBloom = 0;
  const fxAllArcs = Math.min(arcPorts.length, 24);
  let fxLast = -1;
  let fxPrev: GridState | null = null;
  let fxState: GridState | null = null;
  let fxPlan: ReturnType<typeof clock.update> = null;
  let fxRelT = 0;
  const sparkIdx: number[] = [];
  const repairedIds: string[] = [];
  const fxReached = (cut: FxCut): boolean => {
    if (fxPlan === null || fxState === null) return true;
    const e = lineOf.get(cut.line)!;
    return lineFlow(fxState, e.line, e.index, wiresOfLine.get(cut.line)!, fxPlan, fxRelT, flow, around.get(cut.line)).fraction > 0;
  };
  function drawFx(state: GridState, plan_: ReturnType<typeof clock.update>, relT: number, time: number): void {
    if (!fx) return;
    const dt = fxLast < 0 ? 0 : Math.min(Math.max(time - fxLast, 0), 0.1);
    fxLast = time;
    if (fxMode === "all") {
      for (let i = 0; i < fxCuts.length; i++) fx.breakAt(i, time);
      if (allFuse && allFuseLine && time >= fxAllBlow) {
        fxAllBlow = time + 3;
        blows.push(blowOf("", allFuse.id, [[allFuseLine.id]], true));
      }
      if (burstLamps.length > 0 && time >= fxAllBloom) {
        const l = burstLamps[Math.floor(time * 2) % burstLamps.length]!;
        fxAllBloom = time + 0.5;
        fx.bloomAt(l.x, l.y, l.z);
      }
      const spots = arcSpots(state, arcPorts, time, fxAllArcs, arcIdx, true);
      for (let k = 0; k < spots.length; k++) {
        const a = arcPorts[spots[k]!]!;
        fx.arcAt(a.ax, a.ay, a.az, a.bx, a.by, a.bz, 0.3 * S, 0.8, 1.0, 1.4);
        fx.arcFlashAt((a.ax + a.bx) / 2, (a.ay + a.by) / 2, (a.az + a.bz) / 2);
      }
      for (let k = 0; k < faultPlaces.length; k++) {
        if (time < fxAllNext[k]!) continue;
        fx.repairAt(faultPlaces[k]!.x, faultPlaces[k]!.y, faultPlaces[k]!.z);
        fxAllNext[k] = time + 0.9 + (k % 4) * 0.1;
      }
    } else {
      fxState = state;
      fxPlan = plan_;
      fxRelT = relT;
      const cuts = sparkingCuts(state, fxCuts, fxReached, sparkIdx);
      for (let k = 0; k < cuts.length; k++) {
        const i = cuts[k]!;
        fx.breakAt(i, time);
      }
      const done = repairedFaults(fxPrev, state, repairedIds);
      for (let k = 0; k < done.length; k++) {
        const at = faultAt.get(done[k]!);
        if (at) fx.repairAt(at.x, at.y, at.z);
      }
      fxPrev = state;
      if (plan_ !== null) {
        const due = relightBursts(plan_, (i) => state.lit.has(puzzle.nodes[i]!.id), burstLamps, fxRelPrev, relT, burstIdx);
        for (let k = 0; k < due.length; k++) {
          const l = burstLamps[due[k]!]!;
          fx.bloomAt(l.x, l.y, l.z);
        }
        fxRelPrev = relT;
      } else fxRelPrev = -1;
      const spots = arcSpots(state, arcPorts, time, ARCS_AT_ONCE, arcIdx);
      for (let k = 0; k < spots.length; k++) {
        const a = arcPorts[spots[k]!]!;
        fx.arcAt(a.ax, a.ay, a.az, a.bx, a.by, a.bz, 0.3 * S, 0.8, 1.0, 1.4);
        fx.arcFlashAt((a.ax + a.bx) / 2, (a.ay + a.by) / 2, (a.az + a.bz) / 2);
      }
    }
    // The blows: a bolt towards the fuse, the burst at its pop. A repair, an undo or a reset takes the fault away and stops it at once (never on the frame it was stamped).
    for (let i = blows.length - 1; i >= 0; i--) {
      const b = blows[i]!;
      if (b.start < 0) b.start = time;
      else if (!b.synthetic && !state.faults.some((f) => f.id === b.faultId)) {
        blows.splice(i, 1);
        continue;
      }
      const t = time - b.start;
      if (blowBurstDue(b.routes.length > 0, b.prevT, t)) fx.blowAt(b.x, b.y, b.z, b.ground);
      b.prevT = t;
      const k = blowBolts(b.routes, t, bolts);
      for (let j = 0; j < k; j++) fx.bolt(b.routes[bolts[j]!.route]!, bolts[j]!.head, bolts[j]!.tail);
      if (k === 0 && t > 0) blows.splice(i, 1);
    }
    fx.update(dt, camera.quaternion);
  }

  function drawLive(state: GridState, plan_: ReturnType<typeof clock.update>, relT: number, time: number): void {
    // Wires: the glow and the pulses.
    let pi = 0;
    const phase = (time * PULSE_SPEED_M) % PULSE_SPACING_M;
    liveWires.forEach((w, wi) => {
      const entry = lineOf.get(w.line)!;
      lineFlow(state, entry.line, entry.index, wiresOfLine.get(w.line)!, plan_, relT, flow, around.get(w.line));
      wireLit(w, flow.reversed, flow.fraction, lit);
      const wob = state.brownout ? 1 - lampFlicker(state, entry.index, time) * 0.85 : 1;
      const litFrom = lit.forward ? 0 : w.len_m * (1 - lit.frac);
      const litTo = lit.forward ? w.len_m * lit.frac : w.len_m;
      for (let j = 0; j < SAMPLES; j++) {
        const mid = (w.cum_m[j]! + w.cum_m[j + 1]!) / 2;
        const on = lit.frac > 0 && mid >= litFrom && mid <= litTo;
        glowMesh.setColorAt(wi * SAMPLES + j, on ? colour.copy(GLOW_COLOUR).multiplyScalar(0.55 * wob) : colour.setRGB(0, 0, 0));
      }
      const n = pulsesPer[wi]!;
      for (let k = 0; k < n; k++) {
        const d = phase + k * PULSE_SPACING_M;
        const idx = pi++;
        const travelled = d <= w.len_m * lit.frac && lit.frac > 0;
        if (!travelled) {
          pulseMesh.setMatrixAt(idx, m4.makeScale(0, 0, 0));
          continue;
        }
        pointOnWire(w, lit.forward ? d : w.len_m - d, wp);
        const q = segQ[wi * SAMPLES + wp.seg]!;
        pulseMesh.setMatrixAt(idx, m4.compose(vScratch.set(wp.x, wp.y, wp.z), qScratch.copy(q), sScratch.set(WIRE_THICK_M * 2.2 * S, WIRE_THICK_M * 2.2 * S, 0.9 * S)));
      }
    });
    glowMesh.instanceColor!.needsUpdate = true;
    pulseMesh.instanceMatrix.needsUpdate = true;
    // Lit buildings: the windows and the shop glass.
    for (const b of litBuildings) {
      buildingGlow(plan_, state, b.lamps, relT, time, bg);
      bg.target = targetOf.has(b.id);
      if (city) setBuildingGlow(city.buildings, b.id, bg, roofSkip.get(b.id));
      litShop?.set(b.id, bg);
      litCards?.set(b.id, bg);
      const lg = lightGlows.get(b.id);
      if (lg) (lg.level = bg.level), (lg.flare = bg.flare), (lg.target = bg.target);
    }
    if (pool) setStreetLights(pool, lightGlows);
    litShop?.commit();
    litCards?.commit();
  }

  // perf=1 (dev only): a log after PERF_FRAMES frames of the loaded city (the grey-box city before the models load is not counted), "before power"; then again PERF_FRAMES frames after the Relight ends.
  const perf = import.meta.env.DEV && /[?&]perf=1(&|$)/.test(opts.search ?? "");
  const PERF_FRAMES = 300;
  const perfMs = new Float64Array(PERF_FRAMES);
  const perfGap = new Float64Array(PERF_FRAMES);
  let perfLastStart = 0;
  // F0: draw calls and triangles in view, per family, counted as three culls (a bounding sphere meets the frustum; an instancer counts all its instances; a mesh counts index or position / 3). Runs once per log.
  const perfFamilies = (): string => {
    const roots = new Map<Object3D, string>();
    if (city) {
      roots.set(city.tiles.group, "street tiles");
      roots.set(city.interior.group, "interior");
      for (const m of city.buildings.instancers) roots.set(m, "building pieces");
      roots.set(city.grey.mesh, "grey boxes");
      roots.set(city.dress.group, "dressing");
      roots.set(city.furniture.group, "furniture+traffic");
      for (const e of [city.tech, city.holdout, city.ruin]) if (e) roots.set(e.group, "era adds");
    }
    if (city?.circuit) roots.set(city.circuit.group, "circuit");
    if (circuit) roots.set(circuit.group, "circuit");
    if (litShop?.mesh) roots.set(litShop.mesh, "lit shop glass");
    if (litCards?.mesh) roots.set(litCards.mesh, "glow cards");
    roots.set(live, "live layer");
    const total = new Map<string, { calls: number; tris: number }>();
    const frustum = new Frustum();
    frustum.setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const sphere = new Sphere();
    const walk = (o: Object3D, parent: string): void => {
      if (!o.visible) return;
      const fam = roots.get(o) ?? parent;
      const m = o as Mesh;
      if (m.isMesh === true || (o as LineSegments).isLineSegments === true) {
        const geo = m.geometry as BufferGeometry;
        const inst = (o as InstancedMesh).isInstancedMesh === true ? (o as InstancedMesh) : null;
        let seen = true;
        if (o.frustumCulled) {
          if (inst) {
            if (inst.boundingSphere === null) inst.computeBoundingSphere();
            sphere.copy(inst.boundingSphere!).applyMatrix4(o.matrixWorld);
          } else {
            if (geo.boundingSphere === null) geo.computeBoundingSphere();
            sphere.copy(geo.boundingSphere!).applyMatrix4(o.matrixWorld);
          }
          seen = frustum.intersectsSphere(sphere);
        }
        if (seen) {
          const per = (geo.index ? geo.index.count : (geo.attributes["position"]?.count ?? 0)) / 3;
          const e = total.get(fam) ?? { calls: 0, tris: 0 };
          e.calls += Array.isArray(m.material) ? Math.max(geo.groups.length, 1) : 1;
          e.tris += per * (inst ? inst.count : 1);
          total.set(fam, e);
        }
      }
      for (const c of o.children) walk(c, fam);
    };
    walk(scene, "other");
    let calls = 0;
    let tris = 0;
    const parts: string[] = [];
    for (const [f, e] of total) {
      calls += e.calls;
      tris += e.tris;
      parts.push(`${f} ${e.calls}/${Math.round(e.tris)}`);
    }
    return `families (calls/triangles): ${parts.join(", ")}; sum ${calls}/${Math.round(tris)}`;
  };
  let perfFrames = 0;
  let perfLabel = "before power";
  let perfSawPlan = false;
  // The break icon's point: the middle sample of the cut span's wire (where E2's sparks fly), in metres.
  const cutPoint = new Map<string, { x: number; y: number; z: number }>();
  for (const w of wires) cutPoint.set(w.id, { x: w.pts[(SAMPLES / 2) * 3]! / S, y: w.pts[(SAMPLES / 2) * 3 + 1]! / S, z: w.pts[(SAMPLES / 2) * 3 + 2]! / S });
  const cutAt = (spanId: string): { x: number; y: number; z: number } | null => cutPoint.get(spanId) ?? null;
  const iconCtx = { width: 0, height: 0, time: 0, layer, pxPerMetre: 0 };
  return {
    setLoadPreview(p: LoadPreview | null) {
      preview = p;
    },
    draw(state: GridState, overlay: MapOverlay, timeSeconds: number) {
      const t0 = perf ? performance.now() : 0;
      const gap = t0 - perfLastStart;
      perfLastStart = t0;
      if (canvas.clientWidth !== drawnW || canvas.clientHeight !== drawnH) resize();
      const relT = overlay.relightT ?? 0;
      const plan_ = clock.update(state, overlay.relightT);
      if (readableNow(state)) standCircuit();
      drawLive(state, plan_, relT, timeSeconds);
      drawFx(state, plan_, relT, timeSeconds);
      gl.render(scene, camera);
      if (perf && plan_ !== null) {
        perfSawPlan = true;
        perfFrames = PERF_FRAMES;
      } else if (perf && perfSawPlan && perfFrames === PERF_FRAMES) {
        perfSawPlan = false;
        perfLabel = "after the Relight";
        perfFrames = 0;
      }
      if (perf && city && modelsLoaded && perfFrames < PERF_FRAMES) {
        perfGap[perfFrames] = gap;
        perfMs[perfFrames++] = performance.now() - t0;
        if (perfFrames === PERF_FRAMES) {
          const sorted = Float64Array.from(perfMs).sort();
          console.info(`perf=1 (${perfLabel}): ${gl.info.render.calls} draw calls, ${gl.info.render.triangles} triangles, ${gl.info.programs?.length ?? 0} programs, median frame ${sorted[PERF_FRAMES >> 1]!.toFixed(2)} ms (CPU, draw call to render end), after ${PERF_FRAMES} frames, fx=${fxMode === "all" ? "all: every cut sparks whatever its state (measure only)" : fxMode} (${fx?.alive() ?? 0} particles; ${fx?.peaks() ?? "none"})`);
          const gaps = Float64Array.from(perfGap).sort();
          console.info(`perf=1 (${perfLabel}) whole frame: median interval between draw calls ${gaps[PERF_FRAMES >> 1]!.toFixed(2)} ms (includes GPU waits and the overlay), canvas ${canvas.width} x ${canvas.height} px, pixel ratio ${gl.getPixelRatio()}`);
          console.info(`perf=1 (${perfLabel}) ${perfFamilies()}`);
        }
      }
      if (overlayLayer?.ctx) {
        iconCtx.width = size.width;
        iconCtx.height = size.height;
        iconCtx.time = timeSeconds;
        iconCtx.pxPerMetre = rig.getScale() * S;
        icons = overlayIcons(converted, state, project, iconCtx);
        breaks = overlayBreaks(converted, state, cutAt, project, iconCtx);
        paintOverlay(overlayLayer.ctx, Math.min(Math.max(dpr, 1), 2), size.width, size.height, icons, breaks, overlayLabels(icons, breaks, preview, state, ratings, overlay.relightT !== undefined), timeSeconds, overlay.hover ?? null, overlay.highlight ?? null);
        if (fxMode === "all") {
          // The measure-only notice, in the corner of the overlay canvas (the overlay is scaled by the same ratio as above).
          const c = overlayLayer.ctx;
          c.save();
          c.setTransform(Math.min(Math.max(dpr, 1), 2), 0, 0, Math.min(Math.max(dpr, 1), 2), 0, 0);
          c.font = "12px sans-serif";
          c.fillStyle = "#ffb347";
          c.fillText("fx=all: every cut sparks whatever its state (measure only)", 10, size.height - 10);
          c.restore();
        }
      }
    },
    hitTest(x, y) {
      return cityHit(x, y, { width: size.width, height: size.height, blockers, icons, breaks, pick: (px, py) => picker.hitTest(px, py) });
    },
    resize,
    setInsets(next) {
      insets = { ...next };
      rig.resize(Math.max(canvas.clientWidth, 1), Math.max(canvas.clientHeight, 1), insets);
    },
    notify(event) {
      if (!fx || event.type !== "fuse:blown") return;
      const e = event.payload;
      const paths = e.lamps ? e.lamps.map((l) => l.path) : e.path.length > 0 ? [e.path] : [];
      if (blows.length < 8) blows.push(blowOf(e.faultId, e.nodeId, paths, false));
    },
    setBlockers(rects) {
      blockers = rects.map((r) => ({ ...r }));
      picker.setBlockers(rects);
    },
    placeAt(x, y) {
      if (x < 0 || y < 0 || x > size.width || y > size.height) return null;
      for (const r of blockers) if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return null;
      let best: string | null = null;
      let bestD = Math.max(OVERLAY_HIT_PX, 48);
      const s = { x: 0, y: 0 };
      for (const [id, p] of lampPlaces) {
        if (!project(p.x / S, p.y / S, p.z / S, s)) continue;
        const d = Math.hypot(s.x - x, s.y - y);
        if (d < bestD) {
          best = id;
          bestD = d;
        }
      }
      return best;
    },
    getPan: () => rig.getPan(),
    setPan: (x, y) => rig.setPan(x, y),
    resetView: () => rig.resetView(),
    getScale: () => rig.getScale(),
    zoomStep: (d) => rig.zoomStep(d),
    fitWhole: () => rig.resetView(),
    centreOn(nodeId) {
      const p = lampPlaces.get(nodeId) ?? (nodePiece.get(nodeId)?.position ?? null);
      return p ? rig.centreOn(p.x, p.z) : rig.getPan();
    },
    dispose() {
      disposed = true;
      toggle?.dispose();
      toggle = null;
      overlayLayer?.remove();
      setRendererMode(gl, "night");
      if (city) {
        scene.remove(city.group);
        city.dispose();
        city = null;
      }
      freeWindows();
      circuit?.dispose();
      circuit = null;
      glowMesh.dispose();
      pulseMesh.dispose();
      fx?.dispose();
      for (const g of geoms) g.dispose();
      for (const m of mats) m.dispose();
      ground.geometry.dispose();
      (ground.material as Material).dispose();
      scene.remove(live, pickGroup, ground);
    },
  };
}
