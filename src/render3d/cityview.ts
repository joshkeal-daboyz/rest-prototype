/**
 * Ticket 081 E2: a city puzzle played on the city. `loadCityView` runs the pipeline once per city and converts the puzzle on it; `createCityPlayRenderer3d` draws that plan with K3's circuit, the job live (pulses
 * moving away from the feed, sparks at a cut, lit and dark lamps, brownout flicker, the Relight), and E1's icons and lines on a 2D canvas over it. It is the `MapRenderer3d` the page already holds, so `src/play/` plays it
 * unchanged. Dev only, like the pipeline renderer (Synty licence, 16 Nov 2026). Everything outside the job is the dead circuit K3 draws: nothing in it ever glows.
 *
 * Pure parts (testable without a canvas): `loadCityView`, `renderRoute`, `jobWires`, `wireLit`, `pointOnWire`, `cityHit`, `overlayRequested`, `relightFrame`, `createOverlayLayer`.
 */

import {
  AdditiveBlending, BoxGeometry, BufferGeometry, CircleGeometry, Color, DynamicDrawUsage, Float32BufferAttribute, Group, InstancedMesh, LineBasicMaterial, LineSegments, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  PerspectiveCamera, Quaternion, Scene, SphereGeometry, Vector3, type Material, type Object3D, type WebGLRenderer,
} from "three";
import { type CalibrationKey, type CityCircuitLayer, type CityPlan, type CityPlanRun, type CityPuzzle, type CityPuzzleCity, type CityPuzzleConverted, type CityPuzzleView } from "../core";
import { CityPuzzleError, convertCityPuzzle } from "../city/circuit";
import { SAG_RATIO } from "../city/circuit/constants";
import { BUILT_STAGES, runCity } from "../city/pipeline";
import { streetsStageWith } from "../city/streets/stage";
import type { CityStageDef } from "../city/pipeline/types";
import type { GridState } from "../grid";
import type { MapOverlay } from "../render";
import type { Insets, Rect } from "../render/geometry";
import { drawNodeGlyph, drawX, ALARM, LINE_LIVE, NODE_DEAD, WARM, TARGET } from "../render/glyphs";
import { PULSE_SPACING, hash01 } from "../render/motion";
import { FLARE_SECONDS } from "../render/relight";
import { circuitDraws, circuitGroup, COMPONENT_H_M, type CircuitDraws, type CircuitDrawn, type CircuitJob } from "./circuitdraw";
import { createDayToggle, pageDayToggleHost, type DayToggle, type DayToggleHost } from "./daytoggle";
import type { Vec3 } from "./kitunits";
import { GROUND } from "./kitunits";
import { lightModeFor, type LightModeId } from "./lighting";
import { addSurface, applyLightMode, newLightOwners, setRendererMode } from "./lightrig";
import { lampFlicker } from "./look";
import { WORLD_PER_METRE } from "./models";
import { sharedTileModels, type ModelSet } from "./models3d";
import { OVERLAY_HIT_PX, overlayHit, overlayIcons, overlayLineHit, overlayLines, placePoint, type OverlayIcon, type OverlayLine, type Project } from "./overlay";
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
  return { plan, converted: convertCityPuzzle(city, plan) };
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

/** `overlay=0` in the address hides the overlay's icons and lines; the 3D pick still plays. Pure. */
export function overlayRequested(search: string): boolean {
  return new URLSearchParams(search).get("overlay") !== "0";
}

// ---- the job's wires ----

const SAMPLES = 8;
/** A pulse moves this fast (m/s) and a new one follows every `PULSE_SPACING_M`. */
export const PULSE_SPEED_M = 7;
export const PULSE_SPACING_M = 3;

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
        const place = converted.places[line.from];
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
 * One wire's lit share. `fraction` is how much of its line is lit (0 dead, 1 live; the Relight's `lineFraction` between), `reversed` that current enters the line at its to end, `cut` that this span is cut and unrepaired:
 * a cut wire lights only up to its break (its middle). Writes into `out`.
 */
export function wireLit(w: JobWire, reversed: boolean, fraction: number, cut: boolean, out: WireLit): WireLit {
  const t0 = reversed ? 1 - w.a1 : w.a0;
  const t1 = reversed ? 1 - w.a0 : w.a1;
  const f = t1 > t0 ? clamp01((fraction - t0) / (t1 - t0)) : fraction >= t1 && fraction > 0 ? 1 : 0;
  out.forward = w.flip === reversed;
  out.frac = cut ? Math.min(f, 0.5) : f;
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

/**
 * One frame's flow on a line: from the state in play, from the Relight's own plan while one runs (`plan` and `relT`, from `relight3d.ts`'s clock). A line that is not powered stays 0 either way.
 */
export function lineFlow(state: GridState, line: { id: string; to: string }, lineIndex: number, plan: Parameters<typeof lineFraction>[0] | null, relT: number, out: LineFlow): LineFlow {
  out.fraction = state.powered.has(line.id) ? (plan ? lineFraction(plan, lineIndex, relT) : 1) : 0;
  out.reversed = state.flowFrom.get(line.id) === line.to;
  return out;
}

/** The lamp ids the Relight lights, in the order they ignite, at each time of `times`: what a player sees go on. Pure; for the case that holds "the Relight can't be interrupted". */
export function relightFrame(puzzle: CityPuzzleConverted["puzzle"], states: readonly GridState[], times: readonly number[]): { lit: string[]; fractions: number[] }[] {
  const clock = createRelightClock(puzzle);
  const ign: LampIgnition = { on: false, flareAge: -1 };
  const frames: { lit: string[]; fractions: number[] }[] = [];
  times.forEach((t, k) => {
    const state = states[Math.min(k, states.length - 1)]!;
    const plan = clock.update(state, t);
    const lit: string[] = [];
    puzzle.nodes.forEach((n, i) => {
      if (n.type === "lamp" && (plan ? lampIgnition(plan, state, n.id, i, t, ign).on : state.lit.has(n.id))) lit.push(n.id);
    });
    frames.push({ lit, fractions: puzzle.lines.map((l, i) => (plan && state.powered.has(l.id) ? lineFraction(plan, i, t) : state.powered.has(l.id) ? 1 : 0)) });
  });
  return frames;
}

// ---- the hit order ----

export interface HitInputs {
  width: number;
  height: number;
  blockers: readonly Rect[];
  icons: readonly OverlayIcon[];
  lines: readonly OverlayLine[];
  /** The 3D pick (`pick.ts`): the job's models give node ids, its spans give line ids, scenery gives null. */
  pick: (x: number, y: number) => string | null;
}

/** The piece under a canvas point: the overlay first (an icon, then a line), then the 3D pick. A point off the canvas or under a panel is dead to both. */
export function cityHit(x: number, y: number, i: HitInputs): string | null {
  if (x < 0 || y < 0 || x > i.width || y > i.height) return null;
  for (const r of i.blockers) if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return null;
  return overlayHit(i.icons, x, y) ?? overlayLineHit(i.lines, x, y) ?? i.pick(x, y);
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

function strokeLine(c: CanvasRenderingContext2D, l: OverlayLine): void {
  const x0 = l.points[0]!;
  const y0 = l.points[1]!;
  const x1 = l.points[2]!;
  const y1 = l.points[3]!;
  c.globalAlpha = l.live ? l.flicker : 0.75;
  c.lineCap = "round";
  if (!l.live) {
    c.setLineDash([6, 7]);
    c.strokeStyle = l.look === "faulted" ? ALARM : NODE_DEAD;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.stroke();
    c.setLineDash([]);
    c.globalAlpha = 1;
    return;
  }
  c.setLineDash([]);
  c.strokeStyle = LINE_LIVE;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(x1, y1);
  c.stroke();
  // Chevrons move away from the source: the same phase the 2D map uses, so direction is shape and motion, never colour.
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len > 1) {
    const ux = (x1 - x0) / len;
    const uy = (y1 - y0) / len;
    c.strokeStyle = "#e8fbff";
    c.lineWidth = 2.5;
    for (let d = l.phase * PULSE_SPACING; d < len; d += PULSE_SPACING) {
      const cx = x0 + ux * d;
      const cy = y0 + uy * d;
      c.beginPath();
      c.moveTo(cx - ux * 5 - uy * 5, cy - uy * 5 + ux * 5);
      c.lineTo(cx + ux * 3, cy + uy * 3);
      c.lineTo(cx - ux * 5 + uy * 5, cy - uy * 5 - ux * 5);
      c.stroke();
    }
  }
  c.globalAlpha = 1;
}

/** Draws the icons and lines on the overlay: lines first, then each cut's break (a red X, with sparks only while live), then the icons, the hovered and highlighted one ringed. */
function paintOverlay(c: CanvasRenderingContext2D, ratio: number, w: number, h: number, icons: readonly OverlayIcon[], lines: readonly OverlayLine[], time: number, hover: string | null, highlight: string | null): void {
  c.setTransform(ratio, 0, 0, ratio, 0, 0);
  c.clearRect(0, 0, w, h);
  for (const l of lines) {
    if (!l.visible[0] || !l.visible[1]) continue;
    strokeLine(c, l);
    if (l.id === hover) {
      c.strokeStyle = TARGET;
      c.lineWidth = 6;
      c.globalAlpha = 0.35;
      c.beginPath();
      c.moveTo(l.points[0]!, l.points[1]!);
      c.lineTo(l.points[2]!, l.points[3]!);
      c.stroke();
      c.globalAlpha = 1;
    }
    if (l.cut) {
      c.strokeStyle = ALARM;
      c.lineWidth = 3;
      drawX(c, l.cut.x, l.cut.y, 8);
      if (l.cut.sparking) {
        c.strokeStyle = "#fff3c9";
        c.lineWidth = 2;
        for (let k = 0; k < 4; k++) {
          const a = hash01(Math.floor(time * 12) * 4 + k) * Math.PI * 2;
          const r = 10 + hash01(k + Math.floor(time * 12)) * 8;
          c.beginPath();
          c.moveTo(l.cut.x + Math.cos(a) * 9, l.cut.y + Math.sin(a) * 9);
          c.lineTo(l.cut.x + Math.cos(a) * r, l.cut.y + Math.sin(a) * r);
          c.stroke();
        }
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
const POOL_COLOUR = 0xffd37a;
const LAMP_GLOW_M = 0.7;
const POOL_RADIUS_M = 3.4;
const WIRE_THICK_M = 0.16;
const SPARKS_PER_CUT = 5;

const Z_AXIS = new Vector3(0, 0, 1);
const UP_AXIS = new Vector3(0, 1, 0);

interface LampGlow {
  id: string;
  index: number;
  glow: Mesh;
  pool: Mesh;
}

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

  const scene = new Scene();
  const owners = newLightOwners();
  const lightId0: LightModeId = lightModeFor("puzzle", opts.search, import.meta.env.DEV);
  applyLightMode(scene, gl, lightId0, owners);

  // The frame: the job's wires and pieces, a margin round them, and the district's least corner.
  const frame = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const grow = (x: number, z: number): void => {
    frame.minX = Math.min(frame.minX, x - FRAME_MARGIN_M * S);
    frame.maxX = Math.max(frame.maxX, x + FRAME_MARGIN_M * S);
    frame.minY = Math.min(frame.minY, z - FRAME_MARGIN_M * S);
    frame.maxY = Math.max(frame.maxY, z + FRAME_MARGIN_M * S);
  };
  for (const w of draws.wires) {
    grow(w.from.x, w.from.z);
    grow(w.to.x, w.to.z);
  }
  for (const p of draws.pieces) if (p.role !== "light") grow(p.position.x, p.position.z);
  grow(converted.origin_m.x_m * S, converted.origin_m.z_m * S);
  if (!Number.isFinite(frame.minX)) Object.assign(frame, { minX: 0, minY: 0, maxX: streets.w * TILE_M * S, maxY: streets.h * TILE_M * S });

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
  const build = (set: ModelSet | null): void => {
    const input = set ? planInput(set) : null;
    try {
      const next = plan3dGroups(plan, input?.roots ?? new Map(), input?.entries ?? new Map(), input?.colourways, input?.stopAtlas, undefined, job);
      if (city) {
        scene.remove(city.group);
        city.dispose();
      }
      circuit?.dispose();
      circuit = null;
      city = next;
      lastRoots = input?.roots ?? new Map();
      scene.add(city.group);
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
  const segTotal = wires.length * SAMPLES;
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
  wires.forEach((w, wi) => {
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

  const pulsesPer = wires.map((w) => Math.max(1, Math.ceil(w.len_m / PULSE_SPACING_M)));
  const pulseTotal = pulsesPer.reduce((a, b) => a + b, 0);
  const pulseMat = new MeshBasicMaterial({ color: 0xe8fbff, blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false });
  mats.push(pulseMat);
  const pulseMesh = new InstancedMesh(unitBox, pulseMat, Math.max(pulseTotal, 1));
  pulseMesh.instanceMatrix.setUsage(DynamicDrawUsage);
  pulseMesh.raycast = () => {};
  pulseMesh.frustumCulled = false;
  live.add(pulseMesh);

  // Sparks: a few small flickering bits at the middle of each cut span.
  const cutWires = wires.map((w, wi) => ({ w, wi })).filter((c) => c.w.cutFault !== null);
  const sparkMesh = new InstancedMesh(unitBox, pulseMat, Math.max(cutWires.length * SPARKS_PER_CUT, 1));
  sparkMesh.instanceMatrix.setUsage(DynamicDrawUsage);
  sparkMesh.raycast = () => {};
  sparkMesh.frustumCulled = false;
  sparkMesh.count = cutWires.length * SPARKS_PER_CUT;
  live.add(sparkMesh);

  // Lamps: a warm glow and a light pool each, from the pieces K3 stood.
  const lamps: LampGlow[] = [];
  const glowGeom = new SphereGeometry(1, 12, 8);
  const poolGeom = new CircleGeometry(1, 28).rotateX(-Math.PI / 2);
  geoms.push(glowGeom, poolGeom);
  const lampIndex = new Map(puzzle.nodes.map((n, i) => [n.id, i] as const));
  for (const p of draws.pieces) {
    if (p.role !== "component" || (p.component !== "lampBuilding" && p.component !== "lampPost")) continue;
    const gm = new MeshBasicMaterial({ color: POOL_COLOUR, blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 });
    const pm = new MeshBasicMaterial({ color: POOL_COLOUR, blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 });
    mats.push(gm, pm);
    const glow = new Mesh(glowGeom, gm);
    const head = p.component === "lampPost" ? 5.0 : 0.45;
    glow.position.set(p.position.x, p.position.y + head * S, p.position.z);
    const pool = new Mesh(poolGeom, pm);
    pool.position.set(p.position.x, 0.25 * S, p.position.z);
    glow.raycast = () => {};
    pool.raycast = () => {};
    glow.visible = false;
    pool.visible = false;
    live.add(glow, pool);
    lamps.push({ id: p.id, index: lampIndex.get(p.id) ?? 0, glow, pool });
  }

  // ---- picking: invisible proxies for the job's models and spans ----
  const pickGroup = new Group();
  const hidden = new MeshBasicMaterial({ visible: false });
  const hiddenLine = new LineBasicMaterial({ visible: false });
  mats.push(hidden, hiddenLine);
  const nodePiece = new Map(draws.pieces.map((p) => [p.id, p] as const));
  const lampPlaces = new Map<string, Vec3>();
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

  const rig: CityRig = createCityRig(frame, w0, h0, insets);
  const camera = rig.camera;
  scene.add(pickGroup);
  const picker: Picker = createPicker(pickGroup, camera, size);

  // ---- the overlay ----
  const wantOverlay = opts.overlay ?? overlayRequested(opts.search);
  const overlayLayer = wantOverlay && typeof document !== "undefined" ? createOverlayLayer(canvas, document, opts.dpr) : null;
  const project = cameraProject(camera, size);
  let icons: readonly OverlayIcon[] = [];
  let lines: readonly OverlayLine[] = [];
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
    gl.setPixelRatio(opts.dpr);
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
  const ign: LampIgnition = { on: false, flareAge: -1 };
  const lineOf = new Map(puzzle.lines.map((l, i) => [l.id, { line: l, index: i }] as const));

  function drawLive(state: GridState, plan_: ReturnType<typeof clock.update>, relT: number, time: number): void {
    // Wires: the glow and the pulses.
    let pi = 0;
    const phase = (time * PULSE_SPEED_M) % PULSE_SPACING_M;
    wires.forEach((w, wi) => {
      const entry = lineOf.get(w.line)!;
      lineFlow(state, entry.line, entry.index, plan_, relT, flow);
      let cut = false;
      if (w.cutFault !== null) for (const f of state.faults) if (f.id === w.cutFault) cut = true;
      wireLit(w, flow.reversed, flow.fraction, cut, lit);
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
    // Sparks flicker only while current reaches a cut that is still there.
    let si = 0;
    for (const { w, wi } of cutWires) {
      const entry = lineOf.get(w.line)!;
      let cutNow = false;
      for (const f of state.faults) if (f.id === w.cutFault) cutNow = true;
      const sparking = cutNow && state.sparking.has(entry.line.id) && (plan_ === null || flow.fraction > 0);
      const mid = segMid[wi * SAMPLES + SAMPLES / 2]!;
      for (let k = 0; k < SPARKS_PER_CUT; k++) {
        const seed = Math.floor(time * 14) * SPARKS_PER_CUT + k + si;
        if (!sparking || hash01(seed) < 0.3) {
          sparkMesh.setMatrixAt(si++, m4.makeScale(0, 0, 0));
          continue;
        }
        const a = hash01(seed + 0.5) * Math.PI * 2;
        const r = (0.3 + hash01(seed + 1.5) * 0.9) * S;
        sparkMesh.setMatrixAt(si++, m4.compose(vScratch.set(mid.x + Math.cos(a) * r, mid.y + (hash01(seed + 2.5) - 0.3) * 1.2 * S, mid.z + Math.sin(a) * r), qScratch.identity(), sScratch.setScalar(0.22 * S)));
      }
    }
    sparkMesh.instanceMatrix.needsUpdate = true;
    // Lamps.
    for (const lamp of lamps) {
      let on: boolean;
      let flare = -1;
      if (plan_) {
        lampIgnition(plan_, state, lamp.id, lamp.index, relT, ign);
        on = ign.on;
        flare = ign.flareAge;
      } else on = state.lit.has(lamp.id);
      const b = on ? 1 - lampFlicker(state, lamp.index, time) : 0;
      const pop = flare >= 0 && flare < FLARE_SECONDS ? 1 + 1.6 * (1 - flare / FLARE_SECONDS) : 1;
      lamp.glow.visible = b > 0.01;
      lamp.pool.visible = b > 0.01;
      (lamp.glow.material as MeshBasicMaterial).opacity = Math.min(1, b * (flare >= 0 && flare < FLARE_SECONDS ? 1 : 0.8));
      (lamp.pool.material as MeshBasicMaterial).opacity = 0.34 * b * (flare >= 0 && flare < FLARE_SECONDS ? 1.4 : 1);
      lamp.glow.scale.setScalar(LAMP_GLOW_M * S * pop);
      lamp.pool.scale.setScalar(POOL_RADIUS_M * S * (flare >= 0 && flare < FLARE_SECONDS ? 1 + 0.3 * (1 - flare / FLARE_SECONDS) : 1));
    }
  }

  const iconCtx = { width: 0, height: 0, time: 0, layer, pxPerMetre: 0 };
  return {
    draw(state: GridState, overlay: MapOverlay, timeSeconds: number) {
      if (canvas.clientWidth !== drawnW || canvas.clientHeight !== drawnH) resize();
      const relT = overlay.relightT ?? 0;
      const plan_ = clock.update(state, overlay.relightT);
      if (readableNow(state)) standCircuit();
      drawLive(state, plan_, relT, timeSeconds);
      gl.render(scene, camera);
      if (overlayLayer?.ctx) {
        iconCtx.width = size.width;
        iconCtx.height = size.height;
        iconCtx.time = timeSeconds;
        iconCtx.pxPerMetre = rig.getScale() * S;
        icons = overlayIcons(converted, state, project, iconCtx);
        lines = overlayLines(converted, state, project, iconCtx);
        paintOverlay(overlayLayer.ctx, Math.min(Math.max(opts.dpr, 1), 2), size.width, size.height, icons, lines, timeSeconds, overlay.hover ?? null, overlay.highlight ?? null);
      }
    },
    hitTest(x, y) {
      return cityHit(x, y, { width: size.width, height: size.height, blockers, icons, lines, pick: (px, py) => picker.hitTest(px, py) });
    },
    resize,
    setInsets(next) {
      insets = { ...next };
      rig.resize(Math.max(canvas.clientWidth, 1), Math.max(canvas.clientHeight, 1), insets);
    },
    notify() {},
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
      circuit?.dispose();
      circuit = null;
      glowMesh.dispose();
      pulseMesh.dispose();
      sparkMesh.dispose();
      for (const g of geoms) g.dispose();
      for (const m of mats) m.dispose();
      ground.geometry.dispose();
      (ground.material as Material).dispose();
      scene.remove(live, pickGroup, ground);
    },
  };
}
