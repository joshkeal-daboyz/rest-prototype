/**
 * Ticket 081 T1: the title backdrop. `createTitleView` draws the night sky (SK's dome, stars, moon and moonlight, from `lightrig.ts`) and, in the title mode, one lit building of the game's own city: stage 01's
 * target building, lit gold through W2 and W3's path, with only its window of blocks drawn (no circuit, no overlay, no particles). The page's words are DOM over it (`src/ui/`, T3).
 *
 * The plan is drawn, never decided: `windowedPlan` only leaves out what lies outside the window and keeps everything else as the plan placed it. Pure parts (testable without a canvas): `titleTarget`, `titleWindow`,
 * `windowedPlan`, `titlePoses`, `titleTurn`, `splashTurn`, `projectPoint`, `titleRequested`, `settleBlend`.
 */

import { BoxGeometry, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, WebGLRenderer, type Material, type Object3D } from "three";
import { loadCityPuzzle, type CalibrationKey, type CityCell, type CityPlan, type CityPuzzleView } from "../core";
import { GROUND, FOV_DEG } from "./kitunits";
import { loadCityView } from "./cityview";
import { lampBuildings, setBuildingGlow, litGlass, glowCards, glowCardMesh, lightPlaces, streetLights, setStreetLights, targetBuildings, roofOffsets, dimBuildings, STREET_LIGHTS_MAX, type BuildingGlow, type GlowCards, type LitGlass, type StreetLights } from "./windows";
import { moonDirection, NIGHT_SKY } from "./nightsky";
import { WORLD_PER_METRE } from "./models";
import { meshParts, sharedTileModels, type ModelSet } from "./models3d";
import { PlanStopError, plan3dGroups, planInput, planKeys } from "./plan3d";
import { addSurface, applyLightMode, newLightOwners, releaseSky, setRendererMode, setSkyTurn } from "./lightrig";
import { STOP_SIGN_COLOURWAY } from "./colourway";
import { SIDEWALK_WALK_M, TILE_M } from "./tilecity";
import type { Pan } from "./maprender";
import type { MapRenderer3d } from "./renderer";
import type { TitleMode, TitleView, TitleViewOptions } from "./titleview";

const S = WORLD_PER_METRE;
const D = Math.PI / 180;

/** Splash to title eases the camera down over this long (seconds). */
export const TITLE_SETTLE_S = 1.5;

/**
 * The title's numbers, for Josh to tune by eye (`?title=title`). Metres and degrees. The camera stands in the street the building faces, `street_m` from its front face, `back_m` south of its centre, `eye_m`
 * high, looking north (yaw 0, which is also the moon's azimuth 0): `title_pitch_deg` up on the title, `splash_pitch_deg` on the splash (high enough that no ground is in view). The title's sky does not turn
 * round for good, as the splash's does (that would carry the moon out of view within half a minute): it holds the moon `moon_east_deg` east of north and sways `sway_deg` either side of it, once in
 * `sway_period_s`. `window_blocks` is how many blocks round the building's own are drawn (1: a 3 x 3 window).
 */
export const TITLE_VIEW = {
  eye_m: 1.8,
  back_m: 42.5,
  street_m: 10,
  splash_pitch_deg: 30,
  title_pitch_deg: 6,
  moon_east_deg: 4,
  sway_deg: 3,
  sway_period_s: 40,
  window_blocks: 1,
} as const;

// ---- the route ----

/** `?title=splash` or `?title=title` in a dev build (before T3's screens exist): the view alone, for tuning. Null for anything else. Pure. */
export function titleRequested(search: string, dev: boolean): TitleMode | null {
  if (!dev) return null;
  const v = new URLSearchParams(search).get("title");
  return v === "splash" || v === "title" ? v : null;
}

// ---- the target building ----

export interface TitleTarget {
  /** The first target lamp's own building: the one the camera frames. */
  readonly building: string;
  /** Every building the target lamps light (the building, its lead and the buildings backed onto it). */
  readonly lit: ReadonlySet<string>;
}

/** Stage 01's target building and the buildings that light with it (T-Q6). Throws when the puzzle's first target lamp is not on a building. Pure. */
export function titleTarget(view: CityPuzzleView): TitleTarget {
  const { plan, converted } = view;
  const puzzle = converted.puzzle;
  const roofs = plan.layers.circuit?.roofs ?? [];
  const buildings = plan.layers.buildings?.buildings ?? [];
  const lampsOf = lampBuildings(puzzle.nodes, converted.places, roofs, buildings);
  const first = (puzzle.target ?? [])[0];
  const place = first === undefined ? undefined : converted.places[first];
  const own = place === undefined ? undefined : "building" in place ? place.building : "roof" in place ? roofs.find((r) => r.id === place.roof)?.building : undefined;
  if (own === undefined) throw new Error("the title view needs a puzzle whose first target lamp is on a building");
  return { building: own, lit: targetBuildings(lampsOf, puzzle.target ?? []) };
}

// ---- the window ----

/** The blocks drawn and the cell rectangle round them (high ends exclusive): the 3 x 3 blocks round the building's, and a street's width past them on every side. */
export interface TitleWindow {
  readonly blocks: ReadonlySet<string>;
  readonly i0: number;
  readonly i1: number;
  readonly j0: number;
  readonly j1: number;
}

export function titleWindow(plan: CityPlan, building: string, around: number = TITLE_VIEW.window_blocks): TitleWindow {
  const streets = plan.layers.streets;
  const b = plan.layers.buildings?.buildings.find((x) => x.id === building);
  const home = b === undefined ? undefined : streets?.blocks.find((k) => k.id === b.block);
  if (!streets || !home) throw new Error(`the title view cannot find building ${building} in the plan`);
  const near = streets.blocks.filter((k) => Math.abs(k.bi - home.bi) <= around && Math.abs(k.bj - home.bj) <= around);
  const pad = Math.max(...streets.streets.map((s) => s.bands.length));
  return {
    blocks: new Set(near.map((k) => k.id)),
    i0: Math.min(...near.map((k) => k.i0)) - pad,
    i1: Math.max(...near.map((k) => k.i1)) + pad,
    j0: Math.min(...near.map((k) => k.j0)) - pad,
    j1: Math.max(...near.map((k) => k.j1)) + pad,
  };
}

const cellKey = (c: CityCell): string => `${c.i},${c.j}`;

/**
 * The plan with everything outside `win` left out and nothing else changed: the ground cells, kerb stretches, trees, interiors, props and traffic pieces inside the rectangle, the buildings of the window's blocks
 * with their columns and every facade piece on them, and no circuit. Whatever it keeps is exactly as the plan placed it. Throws `PlanStopError` where a layer `plan3dGroups` needs is missing. Pure.
 */
export function windowedPlan(plan: CityPlan, win: TitleWindow): CityPlan {
  const { streets, mass, edge, buildings, facades, ground, traffic } = plan.layers;
  if (!streets || !mass || !edge || !buildings || !facades || !ground || !traffic) throw new PlanStopError("the plan has no streets, mass, edge, buildings, facades, ground and traffic layers to draw", []);
  const inRect = (c: CityCell): boolean => c.i >= win.i0 && c.i < win.i1 && c.j >= win.j0 && c.j < win.j1;
  const inRectM = (p: { x: number; z: number }): boolean => inRect({ i: Math.floor(p.x / TILE_M), j: Math.floor(p.z / TILE_M) });
  const kept = new Set(buildings.buildings.filter((b) => win.blocks.has(b.block)).map((b) => b.id));
  const columns = (buildings.columns ?? []).filter((c) => kept.has(c.building));
  const built = new Set(columns.map(cellKey));
  const { circuit: _circuit, ...layers } = plan.layers;
  void _circuit;
  return {
    ...plan,
    layers: {
      ...layers,
      streets: { ...streets, arrows: streets.arrows.filter(inRect) },
      mass: {
        ...mass,
        cells: mass.cells.filter((c) => inRect(c) && (c.use !== "built" || built.has(cellKey(c)))),
        built: mass.built.filter((c) => built.has(cellKey(c))),
        courts: mass.courts.filter((c) => [...c.stallCells, ...c.aisleCells].every(inRect)),
      },
      edge: {
        ...edge,
        buildoutTrees: edge.buildoutTrees.filter((t) => inRect(t.cell)),
        ...(edge.ground ? { ground: edge.ground.filter(inRect) } : {}),
        ...(edge.kerb
          ? { kerb: edge.kerb.map((p) => ({ ...p, segs: p.segs.filter((s) => (s.cell ? inRect(s.cell) : inRectM(s.a))) })).filter((p) => p.segs.length > 0) }
          : {}),
      },
      buildings: { ...buildings, buildings: buildings.buildings.filter((b) => kept.has(b.id)), ...(buildings.columns ? { columns } : {}) },
      facades: {
        ...facades,
        ground: facades.ground.filter((g) => g.cells.every((c) => built.has(cellKey(c)))),
        ...(facades.dressing ? { dressing: facades.dressing.filter((p) => kept.has(p.building)) } : {}),
        ...(facades.walls ? { walls: facades.walls.filter((p) => kept.has(p.building)) } : {}),
        ...(facades.roofs ? { roofs: facades.roofs.filter((p) => kept.has(p.building)) } : {}),
        ...(facades.novelty ? { novelty: facades.novelty.filter((p) => kept.has(p.building)) } : {}),
      },
      ground: { ...ground, props: ground.props.filter((p) => inRect(p.cell)) },
      traffic: { ...traffic, pieces: traffic.pieces.filter((p) => inRect(p.cell)) },
    },
  };
}

// ---- the poses ----

/** A camera: where it stands (metres), the turn east of north and the pitch up from level (degrees). */
export interface TitlePose {
  readonly x_m: number;
  readonly y_m: number;
  readonly z_m: number;
  readonly yaw_deg: number;
  readonly pitch_deg: number;
}

/** The building's centre (metres, plan) and the two poses: the camera in the street in front of it, on the splash looking up at the sky and on the title looking north over the street. Pure. */
export function titlePoses(plan: CityPlan, building: string): { centre: { x_m: number; z_m: number }; title: TitlePose; splash: TitlePose } {
  const b = plan.layers.buildings?.buildings.find((x) => x.id === building);
  if (!b) throw new Error(`the title view cannot find building ${building} in the plan`);
  const xs = b.cells.map((c) => (c.i + 0.5) * TILE_M);
  const zs = b.cells.map((c) => (c.j + 0.5) * TILE_M);
  const centre = { x_m: (Math.min(...xs) + Math.max(...xs)) / 2, z_m: (Math.min(...zs) + Math.max(...zs)) / 2 };
  const lo = Math.min(...xs) - TILE_M / 2;
  const hi = Math.max(...xs) + TILE_M / 2;
  // In the street the building faces: `street_m` out from the front face when it fronts on a street that runs north and south; otherwise beside it by the same distance.
  const x_m = b.front === "-x" ? lo - TITLE_VIEW.street_m : b.front === "+x" ? hi + TITLE_VIEW.street_m : centre.x_m - TITLE_VIEW.street_m;
  const base = { x_m, y_m: TITLE_VIEW.eye_m, z_m: centre.z_m + TITLE_VIEW.back_m, yaw_deg: 0 };
  return { centre, title: { ...base, pitch_deg: TITLE_VIEW.title_pitch_deg }, splash: { ...base, pitch_deg: TITLE_VIEW.splash_pitch_deg } };
}

/**
 * A world point in a pose's camera at `aspect` (width over height): its x and y in -1..1 over the screen (y up), or null when it is behind the camera. `dir` true takes the point as a direction from the camera.
 * Pure.
 */
export function projectPoint(pose: TitlePose, aspect: number, p: { x: number; y: number; z: number }, dir = false, fov_deg: number = FOV_DEG): { x: number; y: number } | null {
  const yaw = pose.yaw_deg * D;
  const pitch = pose.pitch_deg * D;
  const f = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)] as const;
  const r = [Math.cos(yaw), 0, Math.sin(yaw)] as const;
  const u = [-Math.sin(yaw) * Math.sin(pitch), Math.cos(pitch), Math.cos(yaw) * Math.sin(pitch)] as const;
  const d = dir ? [p.x, p.y, p.z] : [p.x - pose.x_m, p.y - pose.y_m, p.z - pose.z_m];
  const depth = d[0]! * f[0] + d[1]! * f[1] + d[2]! * f[2];
  if (depth <= 1e-6) return null;
  const tanV = Math.tan((fov_deg * D) / 2);
  return { x: (d[0]! * r[0] + d[2]! * r[2]) / (depth * tanV * aspect), y: (d[0]! * u[0] + d[1]! * u[1] + d[2]! * u[2]) / (depth * tanV) };
}

/** True when nothing below the horizon is in view: the lowest edge of the screen looks above level. Pure. */
export function skyOnly(pose: TitlePose, fov_deg: number = FOV_DEG): boolean {
  return pose.pitch_deg * D > Math.atan(Math.tan((fov_deg * D) / 2));
}

// ---- the sky's turn and the settle ----

/** The splash's turn (degrees): the sky scrolls at `NIGHT_SKY.drift_deg_s`. */
export const splashTurn = (t: number): number => NIGHT_SKY.drift_deg_s * t;

/** The title's turn (degrees): the moon `moon_east_deg` east of north, swaying `sway_deg` either side. */
export const titleTurn = (t: number): number => -TITLE_VIEW.moon_east_deg + TITLE_VIEW.sway_deg * Math.sin((2 * Math.PI * t) / TITLE_VIEW.sway_period_s);

/** The settle's ease from the splash's pose to the title's: 0 to 1 over `TITLE_SETTLE_S`, smooth at both ends. `elapsed` is seconds since the mode changed. */
export function settleBlend(elapsed: number): number {
  const w = elapsed <= 0 ? 0 : elapsed >= TITLE_SETTLE_S ? 1 : elapsed / TITLE_SETTLE_S;
  return w * w * (3 - 2 * w);
}

/** `from` (degrees) turned by whole turns to lie within 180 of `to`: easing from the splash's accumulated turn takes the shortest way, however long the splash ran. */
export const nearTurn = (from: number, to: number): number => to + ((((from - to) % 360) + 540) % 360) - 180;

/** The direction of the moon (unit, from the camera) at a turn. */
export const moonAt = (turn_deg: number): { x: number; y: number; z: number } => {
  const d = moonDirection(turn_deg);
  return { x: d[0], y: d[1], z: d[2] };
};

// ---- the canvas's renderer ----

/** One WebGLRenderer per canvas, kept for the page's life, shared by every view on it (a canvas has one context for good). `renderer.ts` takes its renderers from here too. */
const glByCanvas = new WeakMap<HTMLCanvasElement, WebGLRenderer>();
export function glForCanvas(canvas: HTMLCanvasElement): WebGLRenderer {
  let gl = glByCanvas.get(canvas);
  if (!gl) {
    gl = new WebGLRenderer({ canvas, antialias: true });
    glByCanvas.set(canvas, gl);
  }
  return gl;
}

// ---- the view ----

const GROUND_MARGIN_M = 60;
const lerp = (a: number, b: number, w: number): number => a + (b - a) * w;

export function createTitleView(canvas: HTMLCanvasElement, view: CityPuzzleView, opts: TitleViewOptions): TitleView {
  const gl = opts.gl ?? glForCanvas(canvas);
  const { plan } = view;
  const target = titleTarget(view);
  const win = titleWindow(plan, target.building);
  const wplan = windowedPlan(plan, win);
  const poses = titlePoses(plan, target.building);
  const dpr = Math.min(Math.max(opts.dpr, 1), 2);

  const scene = new Scene();
  const owners = newLightOwners();
  applyLightMode(scene, gl, "night", owners);
  const camera = new PerspectiveCamera(FOV_DEG, Math.max(canvas.clientWidth, 1) / Math.max(canvas.clientHeight, 1), 0.1, 2000);

  // The ground under the window, so the street does not end in a void.
  const gx0 = (win.i0 * TILE_M - GROUND_MARGIN_M) * S;
  const gx1 = (win.i1 * TILE_M + GROUND_MARGIN_M) * S;
  const gz0 = (win.j0 * TILE_M - GROUND_MARGIN_M) * S;
  const gz1 = (win.j1 * TILE_M + GROUND_MARGIN_M) * S;
  const ground = new Mesh(new BoxGeometry(gx1 - gx0, 0.1, gz1 - gz0), new MeshStandardMaterial({ color: GROUND, roughness: 1 }));
  ground.position.set((gx0 + gx1) / 2, -SIDEWALK_WALK_M * S - 0.02 * S - 0.05, (gz0 + gz1) / 2);
  ground.raycast = () => {};
  addSurface(owners, "ground", ground.material as Material);
  scene.add(ground);

  let disposed = false;
  let built = false;
  let city: ReturnType<typeof plan3dGroups> | null = null;
  let litShop: LitGlass | null = null;
  let litCards: GlowCards | null = null;
  let pool: StreetLights | null = null;

  const free = (): void => {
    if (pool) for (const l of pool.lights) l.removeFromParent();
    pool = null;
    if (litCards) {
      if (litCards.mesh) litCards.mesh.removeFromParent();
      litCards.dispose();
      litCards = null;
    }
    if (litShop) {
      if (litShop.mesh) litShop.mesh.removeFromParent();
      litShop.dispose();
      litShop = null;
    }
    if (city) {
      scene.remove(city.group);
      city.dispose();
      city = null;
    }
  };

  const build = (set: ModelSet | null): void => {
    const input = set ? planInput(set) : null;
    try {
      const next = plan3dGroups(wplan, input?.roots ?? new Map(), input?.entries ?? new Map(), input?.colourways, input?.stopAtlas);
      free();
      city = next;
      next.group.visible = mode === "title";
      scene.add(next.group);
      for (const key of ["street", "pavement", "kerb", "grass"]) {
        const mats = [...(next.tiles.surfaces.get(key) ?? []), ...(next.interior.surfaces.get(key) ?? [])];
        if (mats.length > 0) owners.materials.set(key, mats);
        else owners.materials.delete(key);
      }
      applyLightMode(scene, null, "night", owners);
      standLight(next, input?.roots ?? new Map<CalibrationKey, Object3D>());
    } catch (e) {
      if (!(e instanceof PlanStopError)) throw e;
      console.info(`City plan cannot be drawn: ${e.message}`, e.cells);
    }
    built = true;
  };

  /** The target building lit gold, steady: its windows, shop glass, glow cards and street lights, set once. */
  const standLight = (next: NonNullable<typeof city>, roots: ReadonlyMap<CalibrationKey, Object3D>): void => {
    const ids = [...target.lit];
    const skip = roofOffsets(dimBuildings(next.buildings.draws, (k) => (roots.get(k) ? meshParts(roots.get(k)!).length : 0)));
    litShop = litGlass(next.dressDraws, target.lit, roots);
    litCards = glowCardMesh(glowCards(wplan, ids), S);
    if (litShop.mesh) next.group.add(litShop.mesh);
    if (litCards.mesh) next.group.add(litCards.mesh);
    pool = streetLights(lightPlaces(wplan, ids, STREET_LIGHTS_MAX), S);
    for (const l of pool.lights) next.group.add(l);
    const glow: BuildingGlow = { level: 1, flare: 0, target: true };
    const glows = new Map<string, BuildingGlow>();
    for (const id of ids) {
      setBuildingGlow(next.buildings, id, glow, skip.get(id));
      litShop.set(id, glow);
      litCards.set(id, glow);
      glows.set(id, glow);
    }
    setStreetLights(pool, glows);
    litShop.commit();
    litCards.commit();
  };

  const load = opts.load ?? ((): Promise<ModelSet> => sharedTileModels(planKeys(), [STOP_SIGN_COLOURWAY]));
  void load()
    .then((set) => {
      if (!disposed) build(set);
    })
    .catch((e: unknown) => {
      console.info(`3D models: not applied (${e instanceof Error ? e.message : String(e)}).`);
      if (!disposed) build(null);
    });

  // ---- the mode, the clock and the frame ----
  let mode: TitleMode = "splash";
  let t0 = -1;
  let lastT = 0;
  let modeAt = -Infinity;
  let fromTurn = 0;
  let drawnW = -1;
  let drawnH = -1;

  function resize(): void {
    const w = Math.max(canvas.clientWidth, 1);
    const h = Math.max(canvas.clientHeight, 1);
    gl.setPixelRatio(dpr);
    gl.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    drawnW = w;
    drawnH = h;
  }
  resize();

  // perf=1 (dev only): a log after PERF_FRAMES frames of the title once the backdrop is ready, and the programs compiled by then against the first frame's.
  const perf = import.meta.env.DEV && /[?&]perf=1(&|$)/.test(opts.search ?? "");
  const PERF_FRAMES = 300;
  const perfMs = new Float64Array(PERF_FRAMES);
  const perfGap = new Float64Array(PERF_FRAMES);
  let perfFrames = 0;
  let perfLast = 0;
  let perfPrograms = -1;

  return {
    setMode(next) {
      if (next === mode) return;
      mode = next;
      fromTurn = splashTurn(lastT);
      modeAt = t0 < 0 ? -Infinity : lastT; // before the first frame there is nothing to ease from
      if (city) city.group.visible = mode === "title";
    },
    draw(timeSeconds) {
      const t1 = perf ? performance.now() : 0;
      if (t0 < 0) t0 = timeSeconds;
      const t = timeSeconds - t0;
      lastT = t;
      if (canvas.clientWidth !== drawnW || canvas.clientHeight !== drawnH) resize();
      const w = mode === "title" ? settleBlend(t - modeAt) : 0;
      setSkyTurn(scene, mode === "title" ? lerp(nearTurn(fromTurn, titleTurn(t)), titleTurn(t), w) : splashTurn(t));
      const p = poses.title;
      camera.position.set(p.x_m * S, p.y_m * S, p.z_m * S);
      camera.rotation.set(lerp(poses.splash.pitch_deg, poses.title.pitch_deg, w) * D, -p.yaw_deg * D, 0, "YXZ");
      if (city) city.group.visible = mode === "title";
      gl.render(scene, camera);
      if (perf && built && mode === "title" && perfFrames < PERF_FRAMES) {
        if (perfFrames === 0) perfPrograms = gl.info.programs?.length ?? 0;
        perfGap[perfFrames] = t1 - perfLast;
        perfLast = t1;
        perfMs[perfFrames++] = performance.now() - t1;
        if (perfFrames === PERF_FRAMES) {
          const ms = Float64Array.from(perfMs).sort();
          const gaps = Float64Array.from(perfGap).sort();
          const programs = gl.info.programs?.length ?? 0;
          console.info(`perf=1 (title): ${gl.info.render.calls} draw calls, ${gl.info.render.triangles} triangles, ${programs} programs (${programs - perfPrograms} compiled after the first frame), median frame ${ms[PERF_FRAMES >> 1]!.toFixed(2)} ms (CPU, draw call to render end), after ${PERF_FRAMES} frames`);
          console.info(`perf=1 (title) whole frame: median interval between draw calls ${gaps[PERF_FRAMES >> 1]!.toFixed(2)} ms (includes GPU waits), canvas ${canvas.width} x ${canvas.height} px, pixel ratio ${gl.getPixelRatio()}`);
        }
      }
    },
    ready: () => built,
    resize,
    dispose() {
      disposed = true;
      releaseSky(scene);
      free();
      setRendererMode(gl, "night");
      scene.remove(ground);
      ground.geometry.dispose();
      (ground.material as Material).dispose();
    },
  };
}

// ---- the dev route ----

const stageOne = import.meta.glob("../../puzzles/city/01-first-light.city.json", { eager: true, import: "default" }) as Record<string, unknown>;

/** Stage 01 as the page loads it (the title's building is its target), or null when the file is not there. */
export function stageOneView(): CityPuzzleView | null {
  const json = Object.values(stageOne)[0];
  return json === undefined ? null : loadCityView(loadCityPuzzle(json));
}

/**
 * `?title=splash` / `?title=title` (dev): the title view as the `MapRenderer3d` the page already holds, so `src/main.ts` runs it with no change. It draws the backdrop on stage 01's city whatever puzzle the
 * page opened, takes no input and has no puzzle to show; `planHidesHud` hides the HUD for the same route.
 */
export function createTitleRenderer3d(canvas: HTMLCanvasElement, mode: TitleMode, fallback: CityPuzzleView | undefined, opts: TitleViewOptions): MapRenderer3d {
  const view = stageOneView() ?? fallback;
  if (!view) throw new Error("the title view needs stage 01 (puzzles/city/01-first-light.city.json)");
  const title = createTitleView(canvas, view, opts);
  title.setMode(mode);
  const pan: Pan = { x: 0, y: 0 };
  return {
    draw: (_state, _overlay, timeSeconds) => title.draw(timeSeconds),
    hitTest: () => null,
    resize: () => title.resize(),
    setInsets() {},
    notify() {},
    setBlockers() {},
    placeAt: () => null,
    getPan: () => pan,
    setPan: () => pan,
    resetView() {},
    getScale: () => 1,
    zoomStep: () => 1,
    fitWhole() {},
    centreOn: () => pan,
    setLoadPreview() {},
    dispose: () => title.dispose(),
  };
}
