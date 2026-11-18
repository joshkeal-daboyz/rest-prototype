/**
 * The street camera (ticket 051, section A; debug only): `/?puzzle=<id>&view=3d&cam=street[&run=N][&at=T][&light=day]` stands the eye in the road, 9 m up,
 * turned along one row of buildings and looking at its front, a little above the pavement, like a city-builder promo shot. The main session uses it to judge
 * the rows by screenshot. It renders through its own PerspectiveCamera: the play rig and the picker are not touched, nothing can be picked while it is on,
 * and pan and zoom do nothing. `light=day` is read here and acted on by the light rig (`lightrig.ts`, ticket 060), which owns every global light: this module adds none.
 *
 * Two halves. The first is pure (no three, no DOM): which rows there are, where the eye stands and how wide the lens must be to frame the row. The
 * second is three: the camera and the one console line `street camera: run N of M, <row id>, K blocks`, logged once the models are applied
 * AND one frame has been drawn through the street camera, so a screenshot that waits for the line shows the finished picture. Nothing here reads the
 * page's address: renderer.ts passes the query string in, behind `import.meta.env.DEV`, so none of it is in `npm run build`.
 *
 * A row is a terrace run (`town.terraces`, 051 B) or, for lots that are not in one, a chain of consecutive lots of one road side that share a front line (a
 * loop street serves several blocks, so a chain ends where the street is crossed).
 */

import { Camera, PerspectiveCamera, type Scene } from "three";
import type { MapRenderer3d } from "./renderer";
import { WORLD_PER_METRE, type Town } from "./town";

// ---- constants (metres; the pose turns them into world units) ----

/** How far back from the row's front line the eye would stand at most, metres. A town road with its two pavements is about 12 m wide, so the eye ends on the far pavement. */
export const STREET_CAM_BACK_M = 26;
export const STREET_CAM_EYE_M = 9;
/** The look point stands this high on the front line, metres. */
export const STREET_CAM_LOOK_M = 6;
/** The view runs this many degrees along the row from straight across it. */
export const STREET_CAM_YAW_DEG = 35;
/** The lens opens from this (vertical, degrees) up to `STREET_CAM_FOV_MAX_DEG` until three whole lots fit the frame. */
export const STREET_CAM_FOV_DEG = 50;
export const STREET_CAM_FOV_MAX_DEG = 85;

/** The look point rises to this fraction of the row's median lot cap when that is above `STREET_CAM_LOOK_M`. */
const LOOK_CAP_FRACTION = 0.65;
/** The aspect the pose assumes when the caller gives none. */
const DEFAULT_ASPECT = 16 / 9;
/** The eye's search along the line of sight, world units. */
const SCAN_STEP = 0.02;
/** The eye stands this far inside the far edge of the pavement. */
const EDGE_MARGIN = 0.05;
/** The eye must stand at least this far from the front line (in the road, not on the near pavement's edge). */
const MIN_BACK = 0.5;
/** Fractions of the along-row shift to try, from the full yaw down to straight across. */
const SHIFTS: readonly number[] = [1, 0.75, 0.5, 0.25, 0];
/** Lots of one row whose gap (along the row, world units) is under this belong to the same row; a cross street is at least 2.3 across. */
const ROW_GAP_MAX = 1.5;
/** Two lots share a front line when their fronts differ by less than this across the row. */
const FRONT_TOL = 0.05;
/** Views to try, degrees along the row: the ticket's first, then more oblique ones for a row too close to frame. */
const YAW_TRIES: readonly number[] = [STREET_CAM_YAW_DEG, 45, 55, 65];
/** Lens degrees one degree of extra yaw is worth. */
const YAW_COST = 0.5;
/** Whole lots to frame. */
const LOTS_TO_FRAME = 3;

// ---- the page's flags ----

export interface StreetCamOptions {
  /** Which row: an index into `streetRows`, wrapped. */
  run: number;
  /** Where the look point stands along the row, 0 (its start, the corner end) to 1. */
  at: number;
  /** The page asked for `light=day`. The light rig acts on it (renderer.ts asks `lightModeFor`); the street view itself adds no light. */
  day: boolean;
}

/** The options the query string asks for (`cam=street`, `run`, `at` clamped to 0..1, `light=day`), or null when it does not ask for the street camera. */
export function streetCamRequested(search: string): StreetCamOptions | null {
  const q = new URLSearchParams(search);
  if (q.get("cam") !== "street") return null;
  const runText = q.get("run");
  const run = runText !== null && /^-?\d+$/.test(runText.trim()) ? Number.parseInt(runText, 10) : 0;
  const atText = q.get("at");
  const atRaw = atText !== null && atText.trim() !== "" ? Number(atText) : Number.NaN;
  const at = Number.isFinite(atRaw) ? Math.min(Math.max(atRaw, 0), 1) : 0.5;
  return { run, at, day: q.get("light") === "day" };
}

// ---- rows ----

export interface StreetRow {
  /** `road:side:k`, k counting the rows of that road side. */
  id: string;
  street: string;
  side: 1 | -1;
  /** Indices into `town.lots`, in order along the row. */
  lots: readonly number[];
  /** The start of the front line (the first lot's start edge, at its front). */
  sx: number;
  sz: number;
  /** Unit direction along the row, then the unit normal from the building's front toward its road. */
  ux: number;
  uz: number;
  nx: number;
  nz: number;
  len: number;
}

const rowCache = new WeakMap<Town, readonly StreetRow[]>();

/** The rows of a town, longest first, ties by id: its terrace runs, then chains of the other lots that share a street, a side and a front line. */
export function streetRows(town: Town): readonly StreetRow[] {
  const hit = rowCache.get(town);
  if (hit) return hit;
  const rows: StreetRow[] = [];
  const counts = new Map<string, number>();
  let cur: number[] = [];
  let ux = 0;
  let uz = 0;
  const flush = (): void => {
    if (cur.length === 0) return;
    const first = town.lots[cur[0]!]!;
    const nx = Math.sin(first.yaw);
    const nz = Math.cos(first.yaw);
    // One lot: the fill direction is against the lot's own +x axis (the row's start is at its own corner).
    const ex = Math.cos(first.yaw);
    const ez = -Math.sin(first.yaw);
    const dx = cur.length > 1 ? ux : -ex;
    const dz = cur.length > 1 ? uz : -ez;
    let t0 = Infinity;
    let t1 = -Infinity;
    for (const i of cur) {
      const l = town.lots[i]!;
      const t = (l.x - first.x) * dx + (l.z - first.z) * dz;
      t0 = Math.min(t0, t - l.w / 2);
      t1 = Math.max(t1, t + l.w / 2);
    }
    const key = `${first.street}:${first.side}`;
    const k = counts.get(key) ?? 0;
    counts.set(key, k + 1);
    rows.push({
      id: `${key}:${k}`,
      street: first.street,
      side: first.side,
      lots: cur,
      sx: first.x + nx * (first.d / 2) + dx * t0,
      sz: first.z + nz * (first.d / 2) + dz * t0,
      ux: dx,
      uz: dz,
      nx,
      nz,
      len: t1 - t0,
    });
    cur = [];
  };
  town.lots.forEach((l, i) => {
    // A terrace lot belongs to its run (below), not to a chain.
    if (l.terrace) {
      flush();
      return;
    }
    if (cur.length > 0) {
      const first = town.lots[cur[0]!]!;
      const prev = town.lots[cur[cur.length - 1]!]!;
      const same = l.street === first.street && l.side === first.side;
      const fx = Math.sin(first.yaw);
      const fz = Math.cos(first.yaw);
      const sameFront = same && Math.abs((l.x + Math.sin(l.yaw) * (l.d / 2) - first.x - fx * (first.d / 2)) * fx + (l.z + Math.cos(l.yaw) * (l.d / 2) - first.z - fz * (first.d / 2)) * fz) < FRONT_TOL;
      if (sameFront) {
        if (cur.length === 1) {
          const ex = Math.cos(first.yaw);
          const ez = -Math.sin(first.yaw);
          const s = (l.x - first.x) * ex + (l.z - first.z) * ez;
          ux = s >= 0 ? ex : -ex;
          uz = s >= 0 ? ez : -ez;
        }
        const along = (l.x - prev.x) * ux + (l.z - prev.z) * uz;
        const gap = along - prev.w / 2 - l.w / 2;
        if (along > 0 && gap > -1e-6 && gap < ROW_GAP_MAX) {
          cur.push(i);
          return;
        }
      }
      flush();
    }
    cur = [i];
  });
  flush();
  // Terrace runs (051 B) are rows as the layout made them: abutting lots on one front line, from the run's start to its far end.
  for (const run of town.terraces) {
    const first = town.lots[run.lots[0]!]!;
    rows.push({ id: run.id, street: run.road, side: run.side, lots: run.lots, sx: run.ax, sz: run.az, ux: run.ux, uz: run.uz, nx: Math.sin(first.yaw), nz: Math.cos(first.yaw), len: run.len });
  }
  rows.sort((a, b) => b.len - a.len || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  rowCache.set(town, rows);
  return rows;
}

// ---- where the eye stands ----

interface Convex {
  pts: readonly { x: number; z: number }[];
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function convex(pts: readonly { x: number; z: number }[]): Convex | null {
  if (pts.length < 3) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  return { pts, minX, maxX, minZ, maxZ };
}

function inside(c: Convex, x: number, z: number): boolean {
  if (x < c.minX || x > c.maxX || z < c.minZ || z > c.maxZ) return false;
  let pos = false;
  let neg = false;
  for (let i = 0; i < c.pts.length; i++) {
    const a = c.pts[i]!;
    const b = c.pts[(i + 1) % c.pts.length]!;
    const cross = (b.x - a.x) * (z - a.z) - (b.z - a.z) * (x - a.x);
    if (cross > 1e-12) pos = true;
    else if (cross < -1e-12) neg = true;
    if (pos && neg) return false;
  }
  return true;
}

/** A box (a lot or a place) by centre, size and yaw: local +z is its front, local +x is (cos yaw, -sin yaw). */
function boxPoly(b: { x: number; z: number; w: number; d: number; yaw: number }): Convex | null {
  const ex = Math.cos(b.yaw);
  const ez = -Math.sin(b.yaw);
  const fx = Math.sin(b.yaw);
  const fz = Math.cos(b.yaw);
  const pts: { x: number; z: number }[] = [];
  for (const [sw, sd] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
    pts.push({ x: b.x + (ex * sw * b.w) / 2 + (fx * sd * b.d) / 2, z: b.z + (ez * sw * b.w) / 2 + (fz * sd * b.d) / 2 });
  }
  return convex(pts);
}

interface Ground {
  /** Roads, pavements and junction pads: where the eye may stand. */
  open: Convex[];
  /** Lots and place boxes: where it may not. */
  solid: Convex[];
}

const groundCache = new WeakMap<Town, Ground>();

function groundOf(town: Town): Ground {
  const hit = groundCache.get(town);
  if (hit) return hit;
  const open: Convex[] = [];
  for (const r of town.roads) {
    const c = convex(r.corners);
    if (c) open.push(c);
  }
  for (const p of town.pavements) {
    const c = convex(p.pts);
    if (c) open.push(c);
  }
  for (const p of town.pads) {
    const c = convex(p.pts);
    if (c) open.push(c);
  }
  const solid: Convex[] = [];
  for (const l of town.lots) {
    const c = boxPoly(l);
    if (c) solid.push(c);
  }
  for (const pl of town.places) {
    for (const b of pl.boxes) {
      const c = boxPoly(b);
      if (c) solid.push(c);
    }
  }
  const g = { open, solid };
  groundCache.set(town, g);
  return g;
}

function standable(g: Ground, x: number, z: number): boolean {
  let over = false;
  for (const c of g.open) {
    if (inside(c, x, z)) {
      over = true;
      break;
    }
  }
  if (!over) return false;
  for (const c of g.solid) if (inside(c, x, z)) return false;
  return true;
}

// ---- the lens ----

interface Basis {
  fx: number;
  fy: number;
  fz: number;
  rx: number;
  ry: number;
  rz: number;
  ux: number;
  uy: number;
  uz: number;
}

/** The camera's axes, as Three's `lookAt` makes them for a world-up camera. */
function basisOf(eye: readonly [number, number, number], look: readonly [number, number, number]): Basis {
  let fx = look[0] - eye[0];
  let fy = look[1] - eye[1];
  let fz = look[2] - eye[2];
  const fl = Math.hypot(fx, fy, fz) || 1;
  fx /= fl;
  fy /= fl;
  fz /= fl;
  // right = forward x up(0,1,0)
  let rx = -fz;
  let rz = fx;
  const rl = Math.hypot(rx, rz) || 1;
  rx /= rl;
  rz /= rl;
  // up = right x forward
  const ux = -rz * fy;
  const uy = rz * fx - rx * fz;
  const uz = rx * fy;
  return { fx, fy, fz, rx, ry: 0, rz, ux, uy, uz };
}

/** True when the point projects inside the frame of a camera with this basis, vertical lens and aspect. */
export function projectsInside(eye: readonly [number, number, number], look: readonly [number, number, number], fovDeg: number, aspect: number, x: number, y: number, z: number): boolean {
  const b = basisOf(eye, look);
  return insideBasis(b, eye, Math.tan((fovDeg * Math.PI) / 360), aspect, x, y, z);
}

function insideBasis(b: Basis, eye: readonly [number, number, number], tanV: number, aspect: number, x: number, y: number, z: number): boolean {
  const vx = x - eye[0];
  const vy = y - eye[1];
  const vz = z - eye[2];
  const depth = vx * b.fx + vy * b.fy + vz * b.fz;
  if (depth <= 1e-6) return false;
  const sx = vx * b.rx + vy * b.ry + vz * b.rz;
  const sy = vx * b.ux + vy * b.uy + vz * b.uz;
  return Math.abs(sx) <= tanV * aspect * depth && Math.abs(sy) <= tanV * depth;
}

/** The row's lots whose two front corners, at the ground and at the lot's cap, are all inside the frame. */
export function framedLots(town: Town, row: StreetRow, eye: readonly [number, number, number], look: readonly [number, number, number], fovDeg: number, aspect: number): number {
  const b = basisOf(eye, look);
  const tanV = Math.tan((fovDeg * Math.PI) / 360);
  let n = 0;
  for (const i of row.lots) {
    const l = town.lots[i]!;
    const ex = Math.cos(l.yaw);
    const ez = -Math.sin(l.yaw);
    const cx = l.x + Math.sin(l.yaw) * (l.d / 2);
    const cz = l.z + Math.cos(l.yaw) * (l.d / 2);
    let ok = true;
    for (const s of [-1, 1]) {
      for (const y of [0, l.hMax]) {
        if (!insideBasis(b, eye, tanV, aspect, cx + (ex * s * l.w) / 2, y, cz + (ez * s * l.w) / 2)) ok = false;
      }
    }
    if (ok) n++;
  }
  return n;
}

// ---- the pose ----

export interface StreetPose {
  /** World position of the eye. */
  eye: [number, number, number];
  /** The point looked at, on the row's front line. */
  look: [number, number, number];
  /** Vertical field of view, degrees. */
  fov: number;
  /** The row's id. */
  row: string;
  /** The row's index (the URL's `run`, wrapped) and how many rows there are. */
  run: number;
  of: number;
  /** How many lots stand in the row. */
  blocks: number;
}

/**
 * Where the camera stands for one row. The look point is on the row's front line, `at` of the way along it, at least `STREET_CAM_LOOK_M` up (a row of tall lots raises it to 0.65 of the row's median cap, so the roofline fits). Past the middle of the row (`at` over 0.5) the view is mirrored, from beyond the row's end looking back, so the row is always ahead. The eye is across the
 * road: as far back as the road's far pavement allows (at most `STREET_CAM_BACK_M`), shifted back along the row so the line of sight runs
 * `STREET_CAM_YAW_DEG` along it, `STREET_CAM_EYE_M` up. It never stands inside a lot or place. The lens opens from `STREET_CAM_FOV_DEG` until three whole lots
 * fit (at most `STREET_CAM_FOV_MAX_DEG`); a row too close to frame three tries a more oblique view (45, 55, 65 degrees) before the lens goes wider. Null when the town has no row. Pure and deterministic.
 */
export function streetPose(town: Town, opts: Partial<StreetCamOptions> & { aspect?: number }): StreetPose | null {
  const rows = streetRows(town);
  if (rows.length === 0) return null;
  const run = (((Math.trunc(opts.run ?? 0)) % rows.length) + rows.length) % rows.length;
  const row = rows[run]!;
  const at = Math.min(Math.max(opts.at ?? 0.5, 0), 1);
  const aspect = opts.aspect !== undefined && opts.aspect > 0 ? opts.aspect : DEFAULT_ASPECT;
  const flip = at > 0.5 ? -1 : 1;
  const px = row.sx + row.ux * row.len * at;
  const pz = row.sz + row.uz * row.len * at;
  // The look point is at least STREET_CAM_LOOK_M up; for a row of tall lots it rises to LOOK_CAP_FRACTION of the row's median cap, so the roofline fits the frame.
  const caps = row.lots.map((i) => town.lots[i]!.hMax).sort((a, b) => a - b);
  const median = caps[Math.floor(caps.length / 2)]!;
  const lookY = Math.max(STREET_CAM_LOOK_M * WORLD_PER_METRE, LOOK_CAP_FRACTION * median);
  const look: [number, number, number] = [px, lookY, pz];
  const g = groundOf(town);
  const maxBack = STREET_CAM_BACK_M * WORLD_PER_METRE;
  const need = Math.min(LOTS_TO_FRAME, row.lots.length);

  /** The eye for a view that runs `yawDeg` along the row; null when no ground serves. */
  const eyeFor = (yawDeg: number): [number, number, number] | null => {
    const tanYaw = Math.tan((yawDeg * Math.PI) / 180);
    for (const shift of SHIFTS) {
      const sx = -flip * row.ux * tanYaw * shift;
      const sz = -flip * row.uz * tanYaw * shift;
      // The first stretch of ground (road, pavement, pad) in the line from the front line outward; the eye ends it, just inside its far edge.
      let started = false;
      let runEnd = 0;
      for (let b = 0; b <= maxBack + 1e-9; b += SCAN_STEP) {
        if (standable(g, px + (row.nx + sx) * b, pz + (row.nz + sz) * b)) {
          started = true;
          runEnd = b;
        } else if (started) break;
      }
      if (!started || runEnd < MIN_BACK) continue;
      let back = runEnd - EDGE_MARGIN;
      if (back < MIN_BACK || !standable(g, px + (row.nx + sx) * back, pz + (row.nz + sz) * back)) back = runEnd;
      return [px + (row.nx + sx) * back, STREET_CAM_EYE_M * WORLD_PER_METRE, pz + (row.nz + sz) * back];
    }
    return null;
  };

  // The view that runs STREET_CAM_YAW_DEG along the row with the narrowest lens that frames three whole lots wins. A row too close to frame three (a short
  // road, tall lots) tries a more oblique view, which costs a little lens each degree; when nothing frames three the best count wins.
  let eye: [number, number, number] | null = null;
  let fov = STREET_CAM_FOV_DEG;
  let bestScore = -Infinity;
  for (const yaw of YAW_TRIES) {
    const e = eyeFor(yaw);
    if (!e) continue;
    let f0 = STREET_CAM_FOV_DEG;
    let n0 = -1;
    for (let f = STREET_CAM_FOV_DEG; f <= STREET_CAM_FOV_MAX_DEG; f++) {
      const n = framedLots(town, row, e, look, f, aspect);
      if (n > n0) {
        n0 = n;
        f0 = f;
      }
      if (n >= need) break;
    }
    const score = Math.min(n0, need) * 1000 - (f0 - STREET_CAM_FOV_DEG) - (yaw - STREET_CAM_YAW_DEG) * YAW_COST;
    if (score > bestScore) {
      bestScore = score;
      eye = e;
      fov = f0;
    }
  }
  if (!eye) {
    // No ground along any line of sight: stand straight across the road, over its centre as 041 lays it out.
    const back = 0.15 + 0.45 + 0.55;
    eye = [px + row.nx * back, STREET_CAM_EYE_M * WORLD_PER_METRE, pz + row.nz * back];
  }
  return { eye, look, fov, row: row.id, run, of: rows.length, blocks: row.lots.length };
}

// ---- three: the view ----

export interface StreetView {
  camera: PerspectiveCamera;
  pose: StreetPose;
  /** The canvas size changed: reframe for its aspect. */
  resize(width: number, height: number): void;
  /** The models are applied (or will never be): the next frame drawn through this camera logs the ready line. */
  markReady(): void;
  /** Render the scene through the street camera; logs the ready line once, after the first frame that follows `markReady`. */
  draw(gl: { render(scene: Scene, camera: Camera): void }, scene: Scene): void;
  dispose(): void;
}

/** The street camera over a town's scene, or null when the town has no row. `log` is `console.info` unless a test passes its own. */
export function createStreetView(town: Town, opts: StreetCamOptions, _scene: Scene, width: number, height: number, log: (line: string) => void = (s) => console.info(s)): StreetView | null {
  const aspectOf = (w: number, h: number): number => Math.max(w, 1) / Math.max(h, 1);
  let pose = streetPose(town, { ...opts, aspect: aspectOf(width, height) });
  if (!pose) return null;
  const camera = new PerspectiveCamera(pose.fov, aspectOf(width, height), 0.05, 400);
  const place = (p: StreetPose, w: number, h: number): void => {
    camera.fov = p.fov;
    camera.aspect = aspectOf(w, h);
    camera.position.set(p.eye[0], p.eye[1], p.eye[2]);
    camera.lookAt(p.look[0], p.look[1], p.look[2]);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  };
  place(pose, width, height);
  let ready = false;
  let logged = false;
  const view: StreetView = {
    camera,
    get pose(): StreetPose {
      return pose!;
    },
    resize(w, h) {
      pose = streetPose(town, { ...opts, aspect: aspectOf(w, h) }) ?? pose;
      place(pose!, w, h);
    },
    markReady() {
      ready = true;
    },
    draw(gl, s) {
      gl.render(s, camera);
      if (ready && !logged) {
        logged = true;
        log(`street camera: run ${pose!.run} of ${pose!.of}, ${pose!.row}, ${pose!.blocks} blocks`);
      }
    },
    dispose() {},
  };
  return view;
}

/**
 * The renderer while the street camera is on: draws through `draw` (which uses the street camera), picks nothing, and pan, zoom and fit leave the play
 * rig exactly where it is. Everything else (resize, insets, blockers, dispose) is the base renderer's.
 */
export function streetMode(base: MapRenderer3d, view: StreetView, draw: MapRenderer3d["draw"]): MapRenderer3d {
  return {
    ...base,
    draw,
    hitTest: () => null,
    setPan: () => base.getPan(),
    resetView() {},
    fitWhole() {},
    getScale: () => base.getScale(),
    zoomStep: () => base.getScale(),
    centreOn: () => base.getPan(),
    dispose() {
      view.dispose();
      base.dispose();
    },
  };
}
