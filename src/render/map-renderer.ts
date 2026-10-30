/**
 * Canvas 2D drawing of a map-scope puzzle from Puzzle + GridState only.
 * Geometry is precomputed (per puzzle, again on resize); the draw loop
 * allocates nothing: typed arrays, cached strings, constant colour strings.
 */

import { FAULT_RULES, type Events, type FaultKind, type Puzzle } from "../core";
import type { GridState } from "../grid";
import {
  MAX_ZOOM_SCALE,
  PADDING,
  buildGeometry,
  CAPTION_MIN_SCALE,
  captionFloor,
  captionsShown,
  clampPan,
  computeFit,
  fitScale,
  freeArea,
  openScale,
  zoomAbout,
  zoomLevels,
  hitTestGeometry,
  inArea,
  initialPan,
  mapBox,
  panToCentre,
  puzzleBounds,
  visibleLinesInto,
  visibleNodesInto,
  type Geometry,
  type Insets,
  type Pan,
} from "./geometry";
import { FUSE_BAR_HEIGHT, FUSE_BAR_TOP, FUSE_BAR_WIDTH, fuseFill, fuseStep, fuseTickOffsets } from "./fusebar";
import { createFeedCaptions } from "./feedcaps";
import { MARKER_SIZE, offscreenMarkers, type OffscreenMarker } from "./markers";
import { fuseCaption, lampCaption } from "./labels";
import { bulbOffsets, bulbRadius, clusterRadius, poolAlpha, poolRadiusScale } from "./load";
import {
  LAMP_DROPPED,
  LAMP_STREAK_AND_FLARE,
  MAX_BLOW_LAMPS,
  lampTreatment,
  MAX_FLARE_LAMPS,
  MAX_PATH_POINTS,
  LAMP_SPARK_AT,
  MAX_GLOW_LINES,
  SPARK_RAYS,
  collectGlowLines,
  lampSpark,
  lineGlow,
  sparkRay,
  streakFade,
  blowTargets,
  fuseIntact,
  headDistance,
  lampFlare,
  popFraction,
  pointAlong,
  polylineLength,
  sequenceTotal,
  streakLength,
  sliceVertices,
} from "./shock";
import {
  AVENUE_PX,
  CITY_AVENUE_COLOUR,
  CITY_BLOCK,
  CITY_BUILDING,
  CITY_BG,
  CITY_PLACE_EDGE,
  CITY_PLACE_FILL,
  CITY_STREET_LINE,
  CITY_WARM,
  GLOW_MAX,
  GLOW_SPRITE_PX,
  HUB_R,
  LIT_FILL_ALPHA,
  POOL_PX,
  STREET_PX,
  avenuePieces,
  circuitStreets,
  cityForMap,
  easeGlow,
  feedLanes,
  footprintLayout,
  glowRadiusPx,
  glowSpriteData,
  glowTarget,
  gridStreetLines,
  lampPlaceStubs,
  mapOrigin,
  spokeDir,
  visibleMapRect,
  type Place,
} from "./city";
import { LABEL_FONT_PX, placeAtPoint, placeShapes, type Prim } from "./places";
import { createLabelCache } from "./labelcache";
import { chargeFraction, popProgress, wentFlat } from "./battery";
import { clamp01, flicker, hash01, pulsePhase, pulseCount, PULSE_SPACING } from "./motion";
import { FLARE_SECONDS, planRelight, type RelightPlan } from "./relight";
import { sprangBack, twangOffset } from "./spring";

export interface MapOverlay {
  /** Id of the node or line the pointer is over (from hitTest). */
  hover?: string | null;
  /** Seconds since the job completed. Undefined = no Relight running. */
  relightT?: number;
  /** Lamp id whose place and lamp to pick out with a focus-coloured outline (ticket 024); null or undefined = none. */
  highlight?: string | null;
}

export interface MapRenderer {
  draw(state: GridState, overlay: MapOverlay, timeSeconds: number): void;
  /** x, y in CSS pixels relative to the canvas's top-left. */
  hitTest(x: number, y: number): string | null;
  resize(): void;
  /** Reserve CSS px at the edges for overlays (the HUD); refits the map. */
  setInsets(insets: Insets): void;
  /**
   * Forwarded events. `fuse:blown` plays the shock, then the pop; `switch:thrown` with `spring: true`
   * plays the lever twang. The renderer stays bus-free. (A spring return is also noticed from the
   * state alone, so forwarding `switch:thrown` is optional.)
   */
  notify(
    event:
      | { type: "fuse:blown"; payload: Events["fuse:blown"] }
      | { type: "switch:thrown"; payload: Events["switch:thrown"] },
  ): void;
}

/** Place lookup for the list-to-map link (ticket 024). Separate from MapRenderer so existing fakes still compile. */
export interface MapPlaces {
  /** Lamp id whose place is under the canvas point (CSS px), via the same fit and pan as drawing; null otherwise. */
  placeAt(x: number, y: number): string | null;
}

/** View control for the pan (ticket 022). Separate from MapRenderer so existing fakes still compile. */
export interface MapPanView {
  /** Current pan in CSS px, added to the centred fit. {0,0} = centred in the free area. */
  getPan(): Pan;
  /** Pan to (x, y), clamped (clampPan); rebuilds geometry so drawing and hitTest move together. Returns the clamped pan. */
  setPan(x: number, y: number): Pan;
  /** Back to the opening view: a map that fits is centred ({0,0}); one that overflows opens with its first feed at the free area's centre. */
  resetView(): void;
  /** Current scale in px per unit (ticket 027 A4). */
  getScale(): number;
  /** One zoom level in (+1) or out (-1) about canvas point (x, y), default the free area's centre; clamped at the ends. Returns the new scale. */
  zoomStep(dir: 1 | -1, x?: number, y?: number): number;
  /** The whole map: the smallest zoom scale, map centred. */
  fitWhole(): void;
}

/** Centre the view on a node (ticket 027). Separate from MapPanView so existing fakes still compile. */
export interface MapCentre {
  /** Pan so the node sits at the free area's centre (clamped); an unknown id changes nothing. Returns the pan. */
  centreOn(nodeId: string): Pan;
}

export interface MapRendererOptions {
  insets?: Insets;
}

/** Lines and nodes whose screen box is further than this from the canvas are not drawn. A node's margin is wider: its glow, caption and pool reach beyond its centre. */
const LINE_CULL_PX = 32;
const NODE_CULL_PX = 96;
const MARKER_VISIBLE_PAD = 24;
/** A place's silhouette is not painted when its box is further than this off the canvas. */
const PLACE_CULL_PX = 16;
const SHOCK_CORE = "#f2fbff";
const SHOCK_GLOW = "#5aa8ff";
const SCORCH = "#05070b";
const LAMP_FAULT_RED = "#a8322b";
const SLOTS = 4;

const BG = "#0b0f17";
const DECOR = "#161d2a";
const LINE_DEAD = "#2a3445";
const LINE_REPAIRED = "#5a6f92";
const LINE_LIVE_GLOW = "#2aa9d8";
const LINE_LIVE = "#4fd1ff";
const PULSE = "#e6fbff";
const NODE_FILL = "#121826";
const NODE_DEAD = "#4a586f";
const NODE_REPAIRED = "#a9bde0";
const NODE_LIVE = "#7fdcff";
const TEXT = "#d3dae6";
const TEXT_DIM = "#7b879a";
const WARM = "#ffd37a";
const WARM_HOT = "#fff3c9";
const ALARM = "#ff5a4d";
const TARGET = "#ffe9a8";
const RIBBON = "#ff3df0";
const HOVER = "#ffffff";
/** The UI's --focus colour (index.html). */
const FOCUS = "#8fd3ff";
const LABEL_FONT = `${LABEL_FONT_PX}px system-ui, sans-serif`;
const LABEL_ALPHA = 0.7;
const TAU2 = Math.PI * 2;
const BATT_GLOW = "#ffa21f";
const BATT_LINE = "#ffc457";
const BATT_FILL = "#3ddc97";
const BATT_FILL_RELEASED = "#ffb02e";
const FONT = "12px system-ui, sans-serif";
const FONT_BIG = "bold 13px system-ui, sans-serif";
const FONT_LAMP = "10px system-ui, sans-serif";
const FONT_STAR = "bold 11px system-ui, sans-serif";
const DASH_LAMP_TARGET: number[] = [3, 3];
const FONT_FEED = "bold 15px system-ui, sans-serif";

const DASH_TARGET: number[] = [4, 4];
const DASH_NONE: number[] = [];
const DASH_PLACE: number[] = [5, 4];

const K_NONE = 0;
const K_LAMP = 1;
const K_FUSE = 2;
const K_CABLE = 3;
const K_JUNCTION = 4;

function kindCode(kind: FaultKind): number {
  switch (kind) {
    case "dead-lamp":
      return K_LAMP;
    case "blown-fuse":
      return K_FUSE;
    case "damaged-cable":
      return K_CABLE;
    case "dead-junction":
      return K_JUNCTION;
  }
}

export function createMapRenderer(canvas: HTMLCanvasElement, puzzle: Puzzle, opts?: MapRendererOptions): MapRenderer & MapPanView & MapPlaces & MapCentre {
  let insets: Insets = { ...(opts?.insets ?? {}) };
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  const c: CanvasRenderingContext2D = ctx;

  const nodes = puzzle.nodes;
  const lines = puzzle.lines;
  const nNodes = nodes.length;
  const nLines = lines.length;

  let width = 0;
  let height = 0;
  const mapBounds = puzzleBounds(puzzle);
  let pan: Pan = { x: 0, y: 0 };
  /** The scale the player zoomed to, or null for the opening scale (which follows the window and the insets). */
  let userScale: number | null = null;
  /** Whether Lv captions are drawn at the current scale (rebuilt with the geometry). */
  let capsOn = true;
  let capFloor = CAPTION_MIN_SCALE;
  /** The canvas as a rect, and the lines and nodes near it (rebuilt with the geometry). */
  const canvasRect = { left: 0, top: 0, right: 1, bottom: 1 };
  /** The canvas grown by the lamp's radius, ring and star: a target inside it is drawn, so it gets no edge marker. */
  const markerVisible = { left: -MARKER_VISIBLE_PAD, top: -MARKER_VISIBLE_PAD, right: 1, bottom: 1 };
  const visLines = new Int32Array(puzzle.lines.length);
  const visNodes = new Int32Array(puzzle.nodes.length);
  let nVisLines = 0;
  let nVisNodes = 0;
  let geo: Geometry = buildGeometry(puzzle, 1, 1, PADDING, insets);
  /** Edge stars for off-screen targets (A3), rebuilt with the geometry; `filled` is taken from the state at draw time. */
  let markers: OffscreenMarker[] = [];
  const NO_LIT: ReadonlySet<string> = new Set<string>();
  const markerTargets: string[] = [];

  // ---- per-puzzle precomputation ----
  const targetSet = new Set(puzzle.target && puzzle.target.length ? puzzle.target : []);
  const allTargets = !puzzle.target || puzzle.target.length === 0;
  const isTarget = new Uint8Array(nNodes);
  nodes.forEach((n, i) => {
    if (n.type === "lamp" && (allTargets || targetSet.has(n.id))) isTarget[i] = 1;
  });
  nodes.forEach((n, i) => {
    if (isTarget[i] === 1) markerTargets.push(n.id);
  });
  const hadFaultNode = new Uint8Array(nNodes);
  const hadFaultLine = new Uint8Array(nLines);
  for (const f of puzzle.faults) {
    const ni = geo.nodeIndex.get(f.at);
    if (ni !== undefined) hadFaultNode[ni] = 1;
    const li = geo.lineIndex.get(f.at);
    if (li !== undefined) hadFaultLine[li] = 1;
  }
  const lampLoad = new Int32Array(nNodes);
  nodes.forEach((n, i) => {
    if (n.type === "lamp") lampLoad[i] = n.load ?? 1;
  });
  const loadLabel: string[] = nodes.map((n) => (n.type === "lamp" ? lampCaption(n.load ?? 1) : ""));
  // Stubs a dead junction needs (one gap per part), from the rules.
  const junctionStubs = FAULT_RULES["dead-junction"].count;
  const bulbScratch = new Float64Array(6);
  const ratingLabel: string[] = nodes.map((n) => (n.type === "fusebox" ? fuseCaption(n.rating) : ""));
  // Fuse load bar geometry, once per fusebox (null = unrated: no bar).
  const fuseTicks: (Float32Array | null)[] = nodes.map((n) => (n.type === "fusebox" && n.rating !== undefined ? fuseTickOffsets(n.rating) : null));
  const fuseRating = new Float64Array(nNodes);
  nodes.forEach((n, i) => {
    if (n.type === "fusebox" && n.rating !== undefined) fuseRating[i] = n.rating;
  });
  const BAR_COLOURS = [BATT_FILL, BATT_FILL_RELEASED, ALARM] as const;
  const lineFromId: string[] = lines.map((l) => l.from);
  const isBattery = new Uint8Array(nNodes);
  nodes.forEach((n, i) => {
    if (n.type === "battery") isBattery[i] = 1;
  });
  // Battery readout text, rebuilt only when the whole-second charge changes.
  const battLabel: string[] = nodes.map(() => "");
  const battLabelCharge = new Int32Array(nNodes).fill(-1);
  const prevReleased = new Uint8Array(nNodes);
  const flatStart = new Float64Array(nNodes).fill(-100);

  // Spring switches: flag, last seen position, and when the current twang began (NaN = start next frame).
  const isSpring = new Uint8Array(nNodes);
  nodes.forEach((n, i) => {
    if (n.type === "switch" && n.spring === true) isSpring[i] = 1;
  });
  const prevSel = new Int8Array(nNodes).fill(-1);
  const twangStart = new Float64Array(nNodes).fill(-100);

  // Switch pointer directions (unit vectors), [2*i + sel], rebuilt with geometry.
  let swDx = new Float64Array(nNodes * 2);
  let swDy = new Float64Array(nNodes * 2);
  function buildSwitchDirs(): void {
    swDx = new Float64Array(nNodes * 2);
    swDy = new Float64Array(nNodes * 2);
    nodes.forEach((n, i) => {
      if (n.type !== "switch") return;
      for (let sel = 0; sel < 2; sel++) {
        const li = geo.lineIndex.get(n.outputs[sel]!);
        if (li === undefined) continue;
        const other = geo.fromIdx[li] === i ? geo.toIdx[li]! : geo.fromIdx[li]!;
        const dx = geo.nx[other]! - geo.nx[i]!;
        const dy = geo.ny[other]! - geo.ny[i]!;
        const l = Math.hypot(dx, dy) || 1;
        swDx[i * 2 + sel] = dx / l;
        swDy[i * 2 + sel] = dy / l;
      }
    });
  }

  // ---- per-frame scratch (preallocated) ----
  const faultNode = new Uint8Array(nNodes);
  const readableNode = new Uint8Array(nNodes);
  const faultLine = new Uint8Array(nLines);
  const prevBlown = new Uint8Array(nNodes);
  // Fuse-blow sequence slots (preallocated). start: NaN = waiting for the next frame's clock.
  const slotActive = new Uint8Array(SLOTS);
  const slotNode = new Int32Array(SLOTS);
  const slotStart = new Float64Array(SLOTS);
  /** Longest line count over a slot's lamps: > 0 means the sequence has a shock phase. */
  const slotLineCount = new Int32Array(SLOTS);
  /** Lamps in a slot (up to MAX_FLARE_LAMPS) and its longest path in screen px. */
  const slotLampCount = new Int32Array(SLOTS);
  const slotLongest = new Float64Array(SLOTS);
  const lampNode = new Int32Array(SLOTS * MAX_FLARE_LAMPS);
  const lampLineN = new Int32Array(SLOTS * MAX_FLARE_LAMPS);
  const lampLines = new Int32Array(SLOTS * MAX_FLARE_LAMPS * MAX_PATH_POINTS);
  const lampLen = new Float64Array(SLOTS * MAX_FLARE_LAMPS);
  /** Per slot: distinct line indices on all lamp paths (they glow together), and how many. */
  const glowLines: Int32Array[] = [];
  for (let s = 0; s < SLOTS; s++) glowLines.push(new Int32Array(MAX_GLOW_LINES));
  const glowN = new Int32Array(SLOTS);
  const sparkOut = new Float64Array(4);
  /** Streak branches (first MAX_BLOW_LAMPS lamps of a slot): screen polylines. */
  const branchN = new Int32Array(SLOTS * MAX_BLOW_LAMPS);
  const branchX = new Float64Array(SLOTS * MAX_BLOW_LAMPS * MAX_PATH_POINTS);
  const branchY = new Float64Array(SLOTS * MAX_BLOW_LAMPS * MAX_PATH_POINTS);
  const holdIntact = new Uint8Array(nNodes);
  /** Per node: flare level 0..1 this frame (a lamp that counted toward the blown fuse). */
  const lampGlow = new Float64Array(nNodes);
  let nextSlot = 0;
  const ptX = new Float64Array(MAX_PATH_POINTS);
  const ptY = new Float64Array(MAX_PATH_POINTS);
  const sliceOut = new Float64Array(2 * (MAX_PATH_POINTS + 2));
  const headOut = new Float64Array(2);

  // ---- the city under the map (tickets 023, 024) ----
  const cityOrigin = mapOrigin(puzzle.id, mapBounds);
  const streets = circuitStreets(puzzle);
  const feedStreets = feedLanes(puzzle);
  /** The places at the current scale: one per lamp in `nodes` order, so every array below keeps its size. */
  let places: Place[] = lampPlaceStubs(puzzle);
  const nPlaces = places.length;
  const placeNode = new Int32Array(nPlaces);
  places.forEach((p, i) => {
    placeNode[i] = puzzle.nodes.findIndex((n) => n.id === p.lamp);
  });
  /** Glow 0..1 per node (only lamps with a place use theirs). */
  const cityGlow = new Float64Array(nNodes);
  const relScratch = { t: 0, arriveAt: 0 };
  let cityLastT = NaN;
  /** Each place's pieces in map units, remade whenever the layout is. */
  let placeShapeList: Prim[][] = places.map((p) => placeShapes(p));
  let shapesFor: unknown = null;
  /** Screen rects [x, y, w, h] per place (the highlight outline). */
  const placeRects = new Float64Array(nPlaces * 4);
  /** The lit tint pieces of every place in screen px: kind (0 rect, 1 disc), then x, y, w, h (a disc's x, y is its centre, w its radius); place i owns [glowStart[i], glowStart[i + 1]). */
  let glowKind = new Uint8Array(0);
  let glowBox = new Float64Array(0);
  /** The layout the shapes and glow arrays were made for: remade only when it changes (a new scale), never on a pan. */
  let builtLayout: unknown = null;
  const labelCache = createLabelCache(puzzle);
  const measureLabel = (text: string): number => c.measureText(text).width;
  const glowStart = new Int32Array(nPlaces + 1);
  /** Per place: the glow sprite's centre x, y and radius in px (a street light's pool uses POOL_PX). */
  const glowC = new Float64Array(nPlaces * 3);
  /** A target's label per place, in canvas px: the box centre (x, y); `labelShown` is 0 when hidden. */
  const labelXY = new Float64Array(nPlaces * 2);
  const labelShown = new Uint8Array(nPlaces);
  const labelText: string[] = places.map((p) => p.label ?? "");
  /** Per node: its place index, or -1. */
  const nodePlace = new Int32Array(nNodes).fill(-1);
  places.forEach((p, i) => {
    const ni = puzzle.nodes.findIndex((n) => n.id === p.lamp);
    if (ni >= 0) nodePlace[ni] = i;
  });
  /** Node index of the lamp being highlighted this frame, or -1. */
  let hiNode = -1;
  let cityLayer: HTMLCanvasElement | OffscreenCanvas | null = null;
  let cityLayerOk = true;
  let cityBuildings: readonly { x: number; y: number; w: number; h: number }[] = [];
  /** The round warm glow, pre-rendered once (128 px, alpha (1 - r)^2). */
  let glowSprite: HTMLCanvasElement | OffscreenCanvas | null = null;
  let glowSpriteTried = false;

  function makeLayer(w: number, h: number): HTMLCanvasElement | OffscreenCanvas | null {
    try {
      if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
      if (typeof document !== "undefined") {
        const el = document.createElement("canvas");
        el.width = w;
        el.height = h;
        return el;
      }
    } catch {
      /* fall through: draw directly */
    }
    return null;
  }

  function makeGlowSprite(): HTMLCanvasElement | OffscreenCanvas | null {
    const sp = makeLayer(GLOW_SPRITE_PX, GLOW_SPRITE_PX);
    if (!sp) return null;
    try {
      const g = sp.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
      if (!g || typeof g.createImageData !== "function") return null;
      const img = g.createImageData(GLOW_SPRITE_PX, GLOW_SPRITE_PX);
      img.data.set(glowSpriteData(GLOW_SPRITE_PX));
      g.putImageData(img, 0, 0);
      return sp;
    } catch {
      return null;
    }
  }

  /** Paint the dark city (streets, avenues, ring road, lots, place silhouettes) with the current fit. */
  function paintCity(g: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, buildings: readonly { x: number; y: number; w: number; h: number }[]): void {
    const f = geo.fit;
    const sc = f.scale;
    const ox = cityOrigin.x;
    const oy = cityOrigin.y;
    const X = (mx: number): number => mx * sc + f.offsetX;
    const Y = (my: number): number => my * sc + f.offsetY;
    g.fillStyle = BG;
    g.fillRect(0, 0, width, height);
    const vis = visibleMapRect(f, width, height, CITY_BLOCK);
    // The open map's footprint (city units): its edge is the ring road, and the shared streets stop on it.
    const fpMap = streets.footprint;
    const hole = { minX: fpMap.minX + ox, minY: fpMap.minY + oy, maxX: fpMap.maxX + ox, maxY: fpMap.maxY + oy };
    g.lineCap = "butt";
    g.lineJoin = "miter";
    // Shared-grid streets: thin faint lines on the cell edges.
    g.strokeStyle = CITY_STREET_LINE;
    g.lineWidth = STREET_PX;
    g.beginPath();
    for (const r of gridStreetLines({ minX: vis.minX + ox, minY: vis.minY + oy, maxX: vis.maxX + ox, maxY: vis.maxY + oy }, hole)) {
      g.moveTo(X(r.ax - ox), Y(r.ay - oy));
      g.lineTo(X(r.bx - ox), Y(r.by - oy));
    }
    g.stroke();
    // Avenues: a wider line along each spoke's ray from the hub's edge outward, stopping at the ring road.
    const far = Math.max(
      Math.hypot(vis.minX + ox, vis.minY + oy),
      Math.hypot(vis.maxX + ox, vis.minY + oy),
      Math.hypot(vis.minX + ox, vis.maxY + oy),
      Math.hypot(vis.maxX + ox, vis.maxY + oy),
    );
    if (far > HUB_R) {
      g.strokeStyle = CITY_AVENUE_COLOUR;
      g.lineWidth = AVENUE_PX;
      g.beginPath();
      for (let s = 0; s < 8; s++) {
        const d = spokeDir(s);
        for (const [a0, a1] of avenuePieces(s, far + 4, hole)) {
          g.moveTo(X(d.x * a0 - ox), Y(d.y * a0 - oy));
          g.lineTo(X(d.x * a1 - ox), Y(d.y * a1 - oy));
        }
      }
      g.stroke();
    }
    // The ring road, every circuit lane (lines, decor) and each feed's lane out to the ring.
    g.strokeStyle = CITY_STREET_LINE;
    g.lineWidth = STREET_PX;
    g.beginPath();
    g.rect(X(fpMap.minX), Y(fpMap.minY), (fpMap.maxX - fpMap.minX) * sc, (fpMap.maxY - fpMap.minY) * sc);
    for (let pass = 0; pass < 2; pass++) {
      const set = pass === 0 ? streets.lanes : feedStreets;
      for (let i = 0; i < set.length; i++) {
        const l = set[i]!;
        const x0 = X(l.ax);
        const x1 = X(l.bx);
        const y0 = Y(l.ay);
        const y1 = Y(l.by);
        // A street wholly off the canvas is not drawn: the work is the screen's, not the map's.
        if (Math.max(x0, x1) < -STREET_PX || Math.min(x0, x1) > width + STREET_PX || Math.max(y0, y1) < -STREET_PX || Math.min(y0, y1) > height + STREET_PX) continue;
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
      }
    }
    g.stroke();
    g.fillStyle = CITY_BUILDING;
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i]!;
      g.fillRect(X(b.x - b.w / 2), Y(b.y - b.h / 2), b.w * sc, b.h * sc);
    }
    // Places: each kind's own top-down plan, filled, with a 1 px edge.
    for (let i = 0; i < placeShapeList.length; i++) {
      const shapes = placeShapeList[i]!;
      // placeRects is the place's screen box (rebuildCity); skip one wholly off the canvas.
      const rx0 = placeRects[i * 4]!;
      const ry0 = placeRects[i * 4 + 1]!;
      if (rx0 > width + PLACE_CULL_PX || rx0 + placeRects[i * 4 + 2]! < -PLACE_CULL_PX || ry0 > height + PLACE_CULL_PX || ry0 + placeRects[i * 4 + 3]! < -PLACE_CULL_PX) continue;
      for (let k = 0; k < shapes.length; k++) {
        const pr = shapes[k]!;
        g.strokeStyle = CITY_PLACE_EDGE;
        g.fillStyle = pr.role === "edge" ? CITY_PLACE_EDGE : CITY_PLACE_FILL;
        if (pr.s === "line") {
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(X(pr.x), Y(pr.y));
          g.lineTo(X(pr.w), Y(pr.h));
          g.stroke();
        } else if (pr.s === "rect") {
          const rx = X(pr.x - pr.w / 2);
          const ry = Y(pr.y - pr.h / 2);
          if (pr.role === "outline") {
            g.lineWidth = 1;
            g.setLineDash(pr.dashed ? DASH_PLACE : DASH_NONE);
            g.strokeRect(rx + 0.5, ry + 0.5, pr.w * sc - 1, pr.h * sc - 1);
            g.setLineDash(DASH_NONE);
          } else {
            g.fillRect(rx, ry, pr.w * sc, pr.h * sc);
            if (pr.role === "body") {
              g.lineWidth = 1;
              g.strokeRect(rx + 0.5, ry + 0.5, pr.w * sc - 1, pr.h * sc - 1);
            }
          }
        } else if (pr.s === "disc") {
          g.beginPath();
          g.arc(X(pr.x), Y(pr.y), (pr.w / 2) * sc, 0, TAU2);
          g.fill();
          if (pr.role === "body") {
            g.lineWidth = 1;
            g.stroke();
          }
        } else {
          // 3 px stroke kept inside the box (water's ring fills its quarter lot).
          g.lineWidth = 3;
          g.beginPath();
          g.arc(X(pr.x), Y(pr.y), Math.max((pr.w / 2) * sc - 1.5, 1), 0, TAU2);
          g.stroke();
        }
      }
    }
  }

  /** Where each target's label goes: beside its place, wholly inside the free area, off every wire, node, caption and star. */
  function placeLabels(): void {
    c.font = LABEL_FONT;
    // On a pan at the same scale the cached boxes just slide; they are recomputed only when the pan could change a choice.
    labelCache.update(places, geo.fit, freeArea(width, height, insets), measureLabel, labelXY, labelShown, capFloor);
  }

  /** Recompute the city for the current fit: layout at this scale, screen data for what glows, the cached dark layer. */
  function rebuildCity(): void {
    const f = geo.fit;
    const sc = f.scale;
    const layout = footprintLayout(puzzle, cityOrigin, sc);
    places = layout.places;
    if (shapesFor !== layout) {
      shapesFor = layout;
      placeShapeList = places.map((p) => placeShapes(p));
    }
    const buildings = cityForMap(puzzle, cityOrigin, visibleMapRect(f, width, height, CITY_BLOCK), sc);
    if (builtLayout !== layout) {
      builtLayout = layout;
      let nGlow = 0;
      for (let i = 0; i < nPlaces; i++) for (const pr of placeShapeList[i]!) if (pr.glow) nGlow++;
      glowKind = new Uint8Array(nGlow);
      glowBox = new Float64Array(nGlow * 4);
    }
    let gi = 0;
    places.forEach((p, i) => {
      placeRects[i * 4] = (p.x - p.w / 2) * sc + f.offsetX;
      placeRects[i * 4 + 1] = (p.y - p.h / 2) * sc + f.offsetY;
      placeRects[i * 4 + 2] = p.w * sc;
      placeRects[i * 4 + 3] = p.h * sc;
      glowStart[i] = gi;
      glowC[i * 3] = p.x * sc + f.offsetX;
      glowC[i * 3 + 1] = p.y * sc + f.offsetY;
      glowC[i * 3 + 2] = p.pool ? POOL_PX : glowRadiusPx((Math.hypot(p.w, p.h) / 2) * sc);
      for (const pr of placeShapeList[i]!) {
        if (!pr.glow) continue;
        const disc = pr.s === "disc";
        glowKind[gi] = disc ? 1 : 0;
        glowBox[gi * 4] = (disc ? pr.x : pr.x - pr.w / 2) * sc + f.offsetX;
        glowBox[gi * 4 + 1] = (disc ? pr.y : pr.y - pr.h / 2) * sc + f.offsetY;
        glowBox[gi * 4 + 2] = disc ? (pr.w / 2) * sc : pr.w * sc;
        glowBox[gi * 4 + 3] = disc ? (pr.w / 2) * sc : pr.h * sc;
        gi++;
      }
    });
    glowStart[nPlaces] = gi;
    placeLabels();
    cityBuildings = buildings;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const pw = Math.max(Math.round(width * dpr), 1);
    const ph = Math.max(Math.round(height * dpr), 1);
    if (cityLayerOk && !cityLayer) {
      cityLayer = makeLayer(pw, ph);
      if (!cityLayer) cityLayerOk = false;
    }
    if (cityLayer && cityLayerOk) {
      if (cityLayer.width !== pw || cityLayer.height !== ph) {
        cityLayer.width = pw;
        cityLayer.height = ph;
      }
      const g = cityLayer.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
      if (g) {
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        paintCity(g, buildings);
      } else {
        cityLayerOk = false;
      }
    }
  }

  function drawCity(state: GridState, relT: number | undefined, rp: RelightPlan | null, t: number): void {
    // Ease each lamp's glow toward its target (snap on the first frame).
    const dt = cityLastT === cityLastT ? t - cityLastT : -1;
    cityLastT = t;
    for (let i = 0; i < nPlaces; i++) {
      const ni = placeNode[i]!;
      if (ni < 0) continue;
      let rel: typeof relScratch | null = null;
      if (rp && relT !== undefined) {
        relScratch.t = relT;
        relScratch.arriveAt = rp.nodeArrive[ni]!;
        rel = relScratch;
      }
      const target = glowTarget(places[i]!.lamp, state, rel);
      cityGlow[ni] = dt < 0 ? target : easeGlow(cityGlow[ni]!, target, dt);
    }
    if (cityLayer && cityLayerOk) {
      c.drawImage(cityLayer, 0, 0, width, height);
    } else {
      paintCity(c, cityBuildings);
    }
    // Only a lamp's own place glows: one round sprite, and a warm tint on its silhouette.
    if (glowSprite === null && !glowSpriteTried) {
      glowSpriteTried = true;
      glowSprite = makeGlowSprite();
    }
    c.fillStyle = CITY_WARM;
    for (let i = 0; i < nPlaces; i++) {
      const ni = placeNode[i]!;
      if (ni < 0) continue;
      const gl = cityGlow[ni]!;
      if (gl < 0.004) continue;
      if (glowSprite) {
        const r = glowC[i * 3 + 2]!;
        c.globalAlpha = gl * GLOW_MAX;
        c.drawImage(glowSprite, glowC[i * 3]! - r, glowC[i * 3 + 1]! - r, 2 * r, 2 * r);
      }
      c.globalAlpha = LIT_FILL_ALPHA * gl;
      for (let k = glowStart[i]!; k < glowStart[i + 1]!; k++) {
        const o = k * 4;
        if (glowKind[k] === 0) c.fillRect(glowBox[o]!, glowBox[o + 1]!, glowBox[o + 2]!, glowBox[o + 3]!);
        else {
          c.beginPath();
          c.arc(glowBox[o]!, glowBox[o + 1]!, glowBox[o + 2]!, 0, TAU2);
          c.fill();
        }
      }
    }
    c.globalAlpha = 1;
    // Quiet names beside the targets' places: drawn after the city, before the circuit, so wires cross over them.
    c.font = LABEL_FONT;
    c.textBaseline = "middle";
    c.textAlign = "center";
    for (let i = 0; i < nPlaces; i++) {
      if (labelShown[i] === 0) continue;
      const ni = placeNode[i]!;
      const lit = ni >= 0 && cityGlow[ni]! > 0.5;
      c.fillStyle = lit ? TEXT : TEXT_DIM;
      c.globalAlpha = lit ? 1 : LABEL_ALPHA;
      c.fillText(labelText[i]!, labelXY[i * 2]!, labelXY[i * 2 + 1]!);
    }
    c.globalAlpha = 1;
    // The list-to-map link: a focus-coloured outline round the highlighted lamp's place.
    if (hiNode >= 0) {
      const pi = nodePlace[hiNode]!;
      if (pi >= 0) {
        const pad = 0.12 * geo.fit.scale;
        c.strokeStyle = FOCUS;
        c.lineWidth = 1.5;
        if (places[pi]!.pool) {
          c.beginPath();
          c.arc(glowC[pi * 3]!, glowC[pi * 3 + 1]!, POOL_PX * 0.5 + pad, 0, TAU2);
          c.stroke();
        } else {
          c.strokeRect(placeRects[pi * 4]! - pad, placeRects[pi * 4 + 1]! - pad, placeRects[pi * 4 + 2]! + 2 * pad, placeRects[pi * 4 + 3]! + 2 * pad);
        }
      }
    }
  }

  let plan: RelightPlan | null = null;
  const feedCaps = createFeedCaptions(puzzle);

  function resize(): void {
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    width = Math.max(canvas.clientWidth, 1);
    height = Math.max(canvas.clientHeight, 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    rebuildGeometry();
  }

  /** Re-clamp the pan to the current free area and rebuild everything that depends on the fit. */
  function rebuildGeometry(): void {
    const sc = currentScale();
    const box = mapBox(mapBounds, computeFit(mapBounds, width, height, PADDING, insets, undefined, sc));
    pan = clampPan(pan, box, freeArea(width, height, insets), undefined, PADDING);
    geo = buildGeometry(puzzle, width, height, PADDING, insets, pan, sc);
    capFloor = captionFloor(openScale(fitScale(mapBounds, width, height, PADDING, insets)));
    capsOn = captionsShown(sc, capFloor);
    canvasRect.right = width;
    canvasRect.bottom = height;
    nVisLines = visibleLinesInto(geo, canvasRect, LINE_CULL_PX, visLines);
    nVisNodes = visibleNodesInto(geo, canvasRect, NODE_CULL_PX, visNodes);
    markerVisible.right = width + MARKER_VISIBLE_PAD;
    markerVisible.bottom = height + MARKER_VISIBLE_PAD;
    markers = offscreenMarkers(geo, freeArea(width, height, insets), markerTargets, NO_LIT, markerVisible);
    buildSwitchDirs();
    for (let s = 0; s < SLOTS; s++) if (slotActive[s] === 1) rebuildSlotPath(s);
    rebuildCity();
  }

  /** The scale now: the player's zoom kept inside the current range, else the opening scale. */
  function currentScale(): number {
    const whole = fitScale(mapBounds, width, height, PADDING, insets);
    const open = openScale(whole);
    if (userScale === null) return open;
    return Math.min(Math.max(userScale, Math.min(whole, open)), MAX_ZOOM_SCALE);
  }

  function levelsNow(): number[] {
    const whole = fitScale(mapBounds, width, height, PADDING, insets);
    const open = openScale(whole);
    return zoomLevels(Math.min(whole, open), open, MAX_ZOOM_SCALE);
  }

  function zoomStep(dir: 1 | -1, x?: number, y?: number): number {
    const cur = currentScale();
    const levels = levelsNow();
    let target = cur;
    if (dir > 0) {
      for (let i = 0; i < levels.length; i++) {
        if (levels[i]! > cur * (1 + 1e-9)) {
          target = levels[i]!;
          break;
        }
      }
    } else {
      for (let i = levels.length - 1; i >= 0; i--) {
        if (levels[i]! < cur * (1 - 1e-9)) {
          target = levels[i]!;
          break;
        }
      }
    }
    if (target === cur) return cur;
    const area = freeArea(width, height, insets);
    const px = x ?? (area.left + area.right) / 2;
    const py = y ?? (area.top + area.bottom) / 2;
    pan = zoomAbout(mapBounds, width, height, PADDING, insets, pan, cur, px, py, target);
    userScale = target;
    rebuildGeometry();
    return geo.fit.scale;
  }

  function fitWhole(): void {
    const whole = fitScale(mapBounds, width, height, PADDING, insets);
    userScale = Math.min(whole, openScale(whole));
    pan = { x: 0, y: 0 };
    rebuildGeometry();
  }

  function setPan(x: number, y: number): Pan {
    pan = { x, y };
    rebuildGeometry();
    return { x: pan.x, y: pan.y };
  }

  function setInsets(next: Insets): void {
    insets = { ...next };
    resize();
  }

  /**
   * Screen-space polylines for a slot's lamps (fuse node, then each line's far end), their
   * lengths, the longest, and each lamp's arrival time. Branch polylines are kept for the first
   * MAX_BLOW_LAMPS lamps; the rest only need a length for their flare timing.
   */
  function rebuildSlotPath(s: number): void {
    const fuse = slotNode[s]!;
    let longest = 0;
    const count = slotLampCount[s]!;
    for (let k = 0; k < count; k++) {
      const li0 = s * MAX_FLARE_LAMPS + k;
      let cur = fuse;
      ptX[0] = geo.nx[cur]!;
      ptY[0] = geo.ny[cur]!;
      let n = 1;
      for (let j = 0; j < lampLineN[li0]! && n < MAX_PATH_POINTS; j++) {
        const li = lampLines[li0 * MAX_PATH_POINTS + j]!;
        cur = geo.fromIdx[li] === cur ? geo.toIdx[li]! : geo.fromIdx[li]!;
        ptX[n] = geo.nx[cur]!;
        ptY[n] = geo.ny[cur]!;
        n++;
      }
      const len = polylineLength(ptX, ptY, n);
      lampLen[li0] = len;
      if (len > longest) longest = len;
      if (lampTreatment(k) === LAMP_STREAK_AND_FLARE) {
        const b = (s * MAX_BLOW_LAMPS + k) * MAX_PATH_POINTS;
        for (let p = 0; p < n; p++) {
          branchX[b + p] = ptX[p]!;
          branchY[b + p] = ptY[p]!;
        }
        branchN[s * MAX_BLOW_LAMPS + k] = n;
      }
    }
    slotLongest[s] = longest;
  }

  function slotFor(nodeIdx: number): number {
    for (let s = 0; s < SLOTS; s++) if (slotActive[s] === 1 && slotNode[s] === nodeIdx) return s;
    return -1;
  }

  function startSlot(nodeIdx: number, start: number): number {
    let s = slotFor(nodeIdx);
    if (s < 0) {
      s = nextSlot;
      nextSlot = (nextSlot + 1) % SLOTS;
    }
    slotActive[s] = 1;
    slotNode[s] = nodeIdx;
    slotStart[s] = start;
    slotLineCount[s] = 0;
    slotLampCount[s] = 0;
    glowN[s] = 0;
    slotLongest[s] = 0;
    return s;
  }

  function notify(
    event:
      | { type: "fuse:blown"; payload: Events["fuse:blown"] }
      | { type: "switch:thrown"; payload: Events["switch:thrown"] },
  ): void {
    if (event.type === "switch:thrown") {
      const si = geo.nodeIndex.get(event.payload.nodeId);
      if (si !== undefined && event.payload.spring === true && isSpring[si] === 1) twangStart[si] = NaN;
      return;
    }
    const p = event.payload;
    const ni = geo.nodeIndex.get(p.nodeId);
    if (ni === undefined) return;
    const s = startSlot(ni, NaN);
    let count = 0;
    let maxLines = 0;
    for (const target of blowTargets(p)) {
      if (lampTreatment(count) === LAMP_DROPPED) break;
      const k = s * MAX_FLARE_LAMPS + count;
      const ci = target.id === null ? undefined : geo.nodeIndex.get(target.id);
      lampNode[k] = ci ?? -1;
      let m = 0;
      for (const id of target.path) {
        const li = geo.lineIndex.get(id);
        if (li === undefined || m >= MAX_PATH_POINTS - 1) continue;
        lampLines[k * MAX_PATH_POINTS + m++] = li;
      }
      lampLineN[k] = m;
      if (m > maxLines) maxLines = m;
      count++;
    }
    slotLampCount[s] = count;
    glowN[s] = collectGlowLines(lampLines, lampLineN, s * MAX_FLARE_LAMPS, count, MAX_PATH_POINTS, glowLines[s]!, MAX_GLOW_LINES);
    slotLineCount[s] = maxLines;
    rebuildSlotPath(s);
  }

  // ---- drawing helpers ----

  function drawX(x: number, y: number, r: number): void {
    c.lineCap = "round";
    c.strokeStyle = BG;
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(x - r, y - r);
    c.lineTo(x + r, y + r);
    c.moveTo(x + r, y - r);
    c.lineTo(x - r, y + r);
    c.stroke();
    c.strokeStyle = ALARM;
    c.lineWidth = 3;
    c.stroke();
  }

  function drawRibbon(x: number, y: number): void {
    c.fillStyle = RIBBON;
    c.fillRect(x, y, 5, 11);
    c.beginPath();
    c.moveTo(x, y + 11);
    c.lineTo(x + 2.5, y + 8);
    c.lineTo(x + 5, y + 11);
    c.fill();
  }

  function drawLine(i: number, state: GridState, t: number, relT: number, rp: RelightPlan | null, hover: string | null): void {
    const id = geo.lineIds[i]!;
    const ax = geo.ax[i]!;
    const ay = geo.ay[i]!;
    const bx = geo.bx[i]!;
    const by = geo.by[i]!;
    const len = geo.len[i]!;
    const hovered = hover === id;

    // Base cable: flat and dull.
    c.lineCap = "round";
    c.strokeStyle = hadFaultLine[i] === 1 && faultLine[i] === K_NONE ? LINE_REPAIRED : LINE_DEAD;
    c.lineWidth = hovered ? 6 : 3;
    c.beginPath();
    c.moveTo(ax, ay);
    c.lineTo(bx, by);
    c.stroke();
    if (hovered) {
      c.strokeStyle = HOVER;
      c.globalAlpha = 0.5;
      c.lineWidth = 2;
      c.stroke();
      c.globalAlpha = 1;
    }

    if (len <= 0 || !state.powered.has(id)) return;
    const src = state.flowFrom.get(id);
    if (src === undefined) return;
    const fromA = src === lineFromId[i];
    let frac = 1;
    if (rp) {
      const s = rp.lineStart[i]!;
      const e = rp.lineEnd[i]!;
      frac = e > s ? clamp01((relT - s) / (e - s)) : relT >= e ? 1 : 0;
    }
    // A damaged cable carries current only up to the break (mid-line).
    if (faultLine[i] === K_CABLE && frac > 0.5) frac = 0.5;
    if (frac <= 0) return;

    const sx = fromA ? ax : bx;
    const sy = fromA ? ay : by;
    const ex = fromA ? bx : ax;
    const ey = fromA ? by : ay;
    const ux = (ex - sx) / len;
    const uy = (ey - sy) / len;
    const liveLen = len * frac;
    const px = sx + ux * liveLen;
    const py = sy + uy * liveLen;

    // Current from a released battery runs amber and a little wider, so its time-limited source reads.
    const srcIdx = geo.nodeIndex.get(src);
    const fromBattery = srcIdx !== undefined && isBattery[srcIdx] === 1;
    c.globalAlpha = fromBattery ? 0.3 + 0.1 * Math.sin(t * 6) : 0.25;
    c.strokeStyle = fromBattery ? BATT_GLOW : LINE_LIVE_GLOW;
    c.lineWidth = fromBattery ? 11 : 9;
    c.beginPath();
    c.moveTo(sx, sy);
    c.lineTo(px, py);
    c.stroke();
    c.globalAlpha = 1;
    c.strokeStyle = fromBattery ? BATT_LINE : LINE_LIVE;
    c.lineWidth = 3;
    c.stroke();

    // Pulses: chevrons that travel away from the feed. Direction is shape, not colour.
    const phase = pulsePhase(t);
    const count = pulseCount(liveLen, phase);
    if (count > 0) {
      const vx = -uy;
      const vy = ux;
      c.fillStyle = fromBattery ? WARM_HOT : PULSE;
      c.beginPath();
      for (let k = 0; k < count; k++) {
        const d = phase + k * PULSE_SPACING;
        if (d >= liveLen) break;
        const cx = sx + ux * d;
        const cy = sy + uy * d;
        c.moveTo(cx + ux * 7, cy + uy * 7);
        c.lineTo(cx - ux * 4 + vx * 5, cy - uy * 4 + vy * 5);
        c.lineTo(cx - ux * 1, cy - uy * 1);
        c.lineTo(cx - ux * 4 - vx * 5, cy - uy * 4 - vy * 5);
        c.closePath();
      }
      c.fill();
    }

    if (rp && frac < 1) {
      // The head of the travelling Relight.
      c.fillStyle = WARM_HOT;
      c.globalAlpha = 0.9;
      c.beginPath();
      c.arc(px, py, 5, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 0.3;
      c.beginPath();
      c.arc(px, py, 12, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    }

    // Sparks at the break of a damaged cable that is live.
    if (state.sparking.has(id) && frac >= 0.5) {
      const mx = sx + ux * len * 0.5;
      const my = sy + uy * len * 0.5;
      const step = Math.floor(t * 18);
      c.strokeStyle = WARM_HOT;
      c.lineWidth = 2;
      c.beginPath();
      for (let k = 0; k < 5; k++) {
        const h = step * 7.7 + i * 3.1 + k * 1.7;
        if (hash01(h) < 0.3) continue;
        const a = hash01(h + 0.5) * Math.PI * 2;
        const r0 = 3 + hash01(h + 1.5) * 3;
        const r1 = r0 + 4 + hash01(h + 2.5) * 8;
        c.moveTo(mx + Math.cos(a) * r0, my + Math.sin(a) * r0);
        c.lineTo(mx + Math.cos(a) * r1, my + Math.sin(a) * r1);
      }
      c.stroke();
      // The break itself: a gap mark, visible even between sparks.
      c.strokeStyle = BG;
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(mx - uy * 6 - ux * 2, my + ux * 6 - uy * 2);
      c.lineTo(mx + uy * 6 + ux * 2, my - ux * 6 + uy * 2);
      c.stroke();
    }
  }

  function nodeOutline(i: number, live: boolean): string {
    if (live) return NODE_LIVE;
    return hadFaultNode[i] === 1 && faultNode[i] === K_NONE ? NODE_REPAIRED : NODE_DEAD;
  }

  function drawLamp(i: number, state: GridState, t: number, relT: number, rp: RelightPlan | null, hover: string | null): void {
    const x = geo.nx[i]!;
    const y = geo.ny[i]!;
    const id = geo.nodeIds[i]!;
    const load = lampLoad[i]!;
    let k = 0;
    let flareAge = -1;
    if (rp) {
      const arrive = rp.nodeArrive[i]!;
      if (state.lit.has(id) && relT >= arrive) {
        k = 1;
        flareAge = relT - arrive;
      }
    } else if (state.lit.has(id)) {
      k = state.brownout ? flicker(t, i) : 1;
    }
    // The lamp that blew a fuse flares: full lit look plus a hot white core, fading back.
    const glow = lampGlow[i]!;
    if (glow > 0 && k < 1) k = 1;
    const powered = state.powered.has(id) && (!rp || relT >= rp.nodeArrive[i]!);
    const nb = bulbOffsets(load, bulbScratch);
    const br = bulbRadius(load);
    const cr = clusterRadius(load);
    const ps = poolRadiusScale(load);
    const TAU = Math.PI * 2;

    if (k > 0) {
      // Light pool: stacked translucent discs (no gradient allocation). Radius and alpha scale with load.
      c.fillStyle = WARM;
      c.globalAlpha = poolAlpha(0.07 * k, load);
      c.beginPath();
      c.arc(x, y, 24 * ps, 0, TAU);
      c.fill();
      c.globalAlpha = poolAlpha(0.11 * k, load);
      c.beginPath();
      c.arc(x, y, 18 * ps, 0, TAU);
      c.fill();
      c.globalAlpha = poolAlpha(0.18 * k, load);
      c.beginPath();
      c.arc(x, y, 12 * ps, 0, TAU);
      c.fill();
      c.globalAlpha = 1;
    } else {
      // Dark: a faint footprint so the hungry lamp reads as hungry while off.
      c.fillStyle = TEXT_DIM;
      c.globalAlpha = 0.05 + 0.02 * nb;
      c.beginPath();
      c.arc(x, y, cr + 6, 0, TAU);
      c.fill();
      c.globalAlpha = 1;
    }
    if (flareAge >= 0 && flareAge < FLARE_SECONDS) {
      const f = flareAge / FLARE_SECONDS;
      c.strokeStyle = WARM_HOT;
      c.globalAlpha = 1 - f;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(x, y, cr + 3 + f * 24 * ps, 0, TAU);
      c.stroke();
      c.fillStyle = WARM_HOT;
      c.globalAlpha = (1 - f) * 0.5;
      c.beginPath();
      c.arc(x, y, cr + 8 * (1 - f), 0, TAU);
      c.fill();
      c.globalAlpha = 1;
    }

    // The bulbs: one, two or three, by load.
    c.lineWidth = hover === id ? 3 : 2;
    for (let b = 0; b < nb; b++) {
      const bx = x + bulbScratch[b * 2]!;
      const by = y + bulbScratch[b * 2 + 1]!;
      c.fillStyle = k > 0 ? WARM : NODE_FILL;
      if (k > 0 && k < 1) c.globalAlpha = 0.35 + 0.65 * k;
      c.beginPath();
      c.arc(bx, by, br, 0, TAU);
      c.fill();
      c.globalAlpha = 1;
      if (k > 0) {
        // Hotter core, stronger with load.
        c.fillStyle = WARM_HOT;
        c.globalAlpha = Math.min(0.25 * nb * k + 0.75 * glow, glow > 0 ? 1 : 0.8);
        c.beginPath();
        c.arc(bx, by, br * (0.6 + 0.3 * glow), 0, TAU);
        c.fill();
        c.globalAlpha = 1;
      }
      c.strokeStyle = k > 0 ? WARM_HOT : nodeOutline(i, powered);
      c.beginPath();
      c.arc(bx, by, br, 0, TAU);
      c.stroke();
    }
    if (hover === id) {
      c.strokeStyle = HOVER;
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(x, y, cr + 3, 0, TAU);
      c.stroke();
    }

    if (hiNode === i) {
      c.strokeStyle = FOCUS;
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(x, y, cr + 8, 0, TAU);
      c.stroke();
    }

    // Lv caption: "Lv<n> Lamp", same wording as the feed's readout.
    c.textAlign = "center";
    c.textBaseline = "middle";
    if (capsOn) {
      c.font = FONT_LAMP;
      c.lineJoin = "round";
      c.strokeStyle = CITY_BG;
      c.lineWidth = 3;
      c.strokeText(loadLabel[i]!, x, y + cr + 10);
      c.fillStyle = k > 0 ? WARM_HOT : TEXT_DIM;
      c.fillText(loadLabel[i]!, x, y + cr + 10);
    }

    if (isTarget[i] === 1) {
      c.strokeStyle = TARGET;
      c.lineWidth = 1.5;
      c.setLineDash(DASH_LAMP_TARGET);
      c.beginPath();
      c.arc(x, y, cr + 5, 0, TAU);
      c.stroke();
      c.setLineDash(DASH_NONE);
      c.font = FONT_STAR;
      c.strokeStyle = CITY_BG;
      c.lineWidth = 3;
      c.strokeText("★", x, y - cr - 13);
      c.fillStyle = TARGET;
      c.fillText("★", x, y - cr - 13);
    }
    if (readableNode[i] === 1 && faultNode[i] === K_LAMP) {
      drawX(x, y, 5);
      // A dead lamp that current reaches flickers a dull red at the socket.
      const fl = flicker(t * 1.3, i + 50);
      c.fillStyle = LAMP_FAULT_RED;
      c.globalAlpha = 0.15 + 0.4 * fl;
      c.beginPath();
      c.arc(x, y + 1, 5 + 2 * fl, 0, TAU);
      c.fill();
      c.globalAlpha = 1;
    }
  }

  /** Ten-point star outline, unit radius, [x0, y0, x1, y1, ...]. */
  const STAR_PTS = new Float64Array(20);
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const r = k % 2 === 0 ? 1 : 0.45;
    STAR_PTS[2 * k] = Math.cos(a) * r;
    STAR_PTS[2 * k + 1] = Math.sin(a) * r;
  }

  /** Edge stars: filled when the lamp is lit, hollow when not. The shape differs, so colour is not needed to read it. */
  function drawMarkers(state: GridState): void {
    const rad = MARKER_SIZE / 2;
    c.lineJoin = "round";
    for (let k = 0; k < markers.length; k++) {
      const m = markers[k]!;
      c.beginPath();
      c.moveTo(m.x + STAR_PTS[0]! * rad, m.y + STAR_PTS[1]! * rad);
      for (let j = 1; j < 10; j++) c.lineTo(m.x + STAR_PTS[2 * j]! * rad, m.y + STAR_PTS[2 * j + 1]! * rad);
      c.closePath();
      c.strokeStyle = CITY_BG;
      c.lineWidth = 4;
      c.stroke();
      if (state.lit.has(m.lamp)) {
        c.fillStyle = TARGET;
        c.fill();
      } else {
        c.strokeStyle = TARGET;
        c.lineWidth = 1.5;
        c.stroke();
      }
    }
  }

  function drawNode(i: number, state: GridState, t: number, relT: number, rp: RelightPlan | null, hover: string | null): void {
    const n = nodes[i]!;
    if (n.type === "lamp") {
      drawLamp(i, state, t, relT, rp, hover);
      return;
    }
    const x = geo.nx[i]!;
    const y = geo.ny[i]!;
    const id = geo.nodeIds[i]!;
    const live = state.powered.has(id) && (!rp || relT >= rp.nodeArrive[i]!);
    const hovered = hover === id;
    c.lineWidth = hovered ? 4 : 2.5;
    c.strokeStyle = nodeOutline(i, live);
    c.fillStyle = NODE_FILL;
    c.textAlign = "center";
    c.textBaseline = "middle";

    switch (n.type) {
      case "feed": {
        c.fillRect(x - 15, y - 15, 30, 30);
        c.strokeRect(x - 15, y - 15, 30, 30);
        c.fillStyle = live ? WARM : TEXT_DIM;
        c.beginPath();
        c.moveTo(x + 3, y - 11);
        c.lineTo(x - 6, y + 2);
        c.lineTo(x - 1, y + 2);
        c.lineTo(x - 3, y + 11);
        c.lineTo(x + 6, y - 3);
        c.lineTo(x + 1, y - 3);
        c.closePath();
        c.fill();
        break;
      }
      case "breaker": {
        c.fillRect(x - 13, y - 10, 26, 20);
        c.strokeRect(x - 13, y - 10, 26, 20);
        const closed = state.breakers.get(id) ?? n.closed;
        c.strokeStyle = closed ? (live ? LINE_LIVE : TEXT) : TEXT_DIM;
        c.lineWidth = 3;
        c.lineCap = "round";
        c.beginPath();
        if (closed) {
          c.moveTo(x - 8, y);
          c.lineTo(x + 8, y);
        } else {
          c.moveTo(x - 8, y + 4);
          c.lineTo(x + 6, y - 6);
        }
        c.stroke();
        c.fillStyle = closed ? TEXT : TEXT_DIM;
        c.font = FONT;
        c.fillText(closed ? "ON" : "OFF", x, y + 22);
        drawRibbon(x + 9, y - 19);
        break;
      }
      case "switch": {
        const stuck = n.relay === true && !live;
        if (stuck) {
          c.globalAlpha = 0.5;
          c.setLineDash(DASH_TARGET);
        }
        c.beginPath();
        c.arc(x, y, 12, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        if (stuck) c.setLineDash(DASH_NONE);
        const sel = state.switches.get(id) ?? n.selected;
        const other = sel === 0 ? 1 : 0;
        c.lineCap = "round";
        c.strokeStyle = TEXT_DIM;
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x + swDx[i * 2 + other]! * 4, y + swDy[i * 2 + other]! * 4);
        c.lineTo(x + swDx[i * 2 + other]! * 13, y + swDy[i * 2 + other]! * 13);
        c.stroke();
        // Lever tip: at rest, or mid-twang (from the old position, through rest, overshooting).
        let lx = swDx[i * 2 + sel]!;
        let ly = swDy[i * 2 + sel]!;
        if (isSpring[i] === 1) {
          const k = twangOffset(t - twangStart[i]!);
          if (k !== 0) {
            lx += (swDx[i * 2 + other]! - lx) * k;
            ly += (swDy[i * 2 + other]! - ly) * k;
            const ll = Math.hypot(lx, ly) || 1;
            lx /= ll;
            ly /= ll;
          }
        }
        c.strokeStyle = live ? LINE_LIVE : TEXT;
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + lx * 20, y + ly * 20);
        c.stroke();
        c.fillStyle = c.strokeStyle;
        c.beginPath();
        c.arc(x, y, 3, 0, Math.PI * 2);
        c.fill();
        drawRibbon(x + 9, y - 21);
        if (isSpring[i] === 1) {
          // Coiled ribbon under the switch: a zigzag coil, a shape so it reads without colour.
          c.strokeStyle = RIBBON;
          c.lineWidth = 2;
          c.lineJoin = "round";
          c.beginPath();
          c.moveTo(x - 10, y + 19);
          for (let k = 0; k < 6; k++) {
            c.lineTo(x - 8 + k * 3.2, y + (k % 2 === 0 ? 14 : 24));
          }
          c.lineTo(x + 10, y + 19);
          c.stroke();
        }
        if (n.relay === true) {
          // Second tribe mark; a stuck relay also shows a bar across it (shape, not just dimness).
          drawRibbon(x - 14, y - 21);
          if (stuck) {
            c.strokeStyle = TEXT_DIM;
            c.lineWidth = 3;
            c.beginPath();
            c.moveTo(x - 14, y + 14);
            c.lineTo(x + 14, y - 14);
            c.stroke();
          }
        }
        c.globalAlpha = 1;
        break;
      }
      case "battery": {
        const bs = state.batteries.get(id);
        const charge = bs ? bs.charge : n.charge ?? 0;
        const cap = bs ? bs.capacity : n.capacity;
        const released = bs ? bs.released : false;
        const frac = chargeFraction(charge, cap);
        const pulse = 0.5 + 0.5 * Math.sin(t * 7);
        // Terminal nub and cell body.
        c.fillStyle = NODE_FILL;
        c.fillRect(x - 5, y - 24, 10, 5);
        c.fillRect(x - 14, y - 19, 28, 38);
        if (released) {
          c.globalAlpha = 0.25 + 0.2 * pulse;
          c.fillStyle = BATT_GLOW;
          c.fillRect(x - 20, y - 25, 40, 50);
          c.globalAlpha = 1;
        }
        c.strokeStyle = released ? BATT_GLOW : nodeOutline(i, live);
        c.lineWidth = released ? 3 : hovered ? 4 : 2.5;
        c.strokeRect(x - 14, y - 19, 28, 38);
        // Charge bar, filling from the bottom.
        const barH = 30;
        const fillH = barH * frac;
        if (fillH > 0) {
          c.fillStyle = released ? BATT_FILL_RELEASED : BATT_FILL;
          c.fillRect(x - 9, y + 15 - fillH, 18, fillH);
          if (released) {
            // Draining edge: a bright cap on the falling level.
            c.fillStyle = WARM_HOT;
            c.fillRect(x - 9, y + 15 - fillH, 18, 2);
          }
        }
        // Quarter ticks so the level reads without colour.
        c.strokeStyle = BG;
        c.lineWidth = 1;
        c.beginPath();
        for (let k = 1; k < 4; k++) {
          c.moveTo(x - 9, y + 15 - (barH * k) / 4);
          c.lineTo(x + 9, y + 15 - (barH * k) / 4);
        }
        c.stroke();
        // Direction glyph: down while draining, up while charging.
        c.font = FONT;
        c.fillStyle = released ? WARM_HOT : TEXT_DIM;
        if (released) c.fillText("▼", x + 24, y);
        else if (bs && bs.charging) c.fillText("▲", x + 24, y);
        // Readout, rebuilt only when the whole-second charge changes.
        const whole = Math.ceil(charge - 1e-9);
        if (battLabelCharge[i] !== whole) {
          battLabelCharge[i] = whole;
          battLabel[i] = `${whole}/${n.capacity}`;
        }
        c.fillStyle = released ? WARM_HOT : TEXT;
        c.fillText(battLabel[i]!, x, y + 32);
        // Flat pop.
        const pp = popProgress(t - flatStart[i]!);
        if (pp >= 0) {
          c.strokeStyle = WARM_HOT;
          c.globalAlpha = 1 - pp;
          c.lineWidth = 3;
          c.beginPath();
          for (let k = 0; k < 10; k++) {
            const a = (k / 10) * Math.PI * 2;
            c.moveTo(x + Math.cos(a) * (16 + pp * 12), y + Math.sin(a) * (16 + pp * 12));
            c.lineTo(x + Math.cos(a) * (24 + pp * 30), y + Math.sin(a) * (24 + pp * 30));
          }
          c.stroke();
          c.beginPath();
          c.arc(x, y, 20 + pp * 34, 0, Math.PI * 2);
          c.stroke();
          c.globalAlpha = 1;
        }
        break;
      }
      case "fusebox": {
        const broken = readableNode[i] === 1 && faultNode[i] === K_FUSE && holdIntact[i] === 0;
        c.fillRect(x - 14, y - 11, 28, 22);
        c.strokeRect(x - 14, y - 11, 28, 22);
        if (broken) {
          // Scorch mark, then the bar snapped in two with a gap and curled ends.
          c.fillStyle = SCORCH;
          c.globalAlpha = 0.75;
          c.beginPath();
          c.arc(x, y + 1, 10, 0, Math.PI * 2);
          c.fill();
          c.globalAlpha = 1;
          c.strokeStyle = ALARM;
          c.lineWidth = 2.5;
          c.lineCap = "round";
          c.beginPath();
          c.moveTo(x - 11, y);
          c.lineTo(x - 4, y);
          c.lineTo(x - 2, y - 5);
          c.moveTo(x + 11, y + 1);
          c.lineTo(x + 4, y + 1);
          c.lineTo(x + 2, y + 6);
          c.stroke();
          if (live) {
            // Buzz: a faint, irregular flicker at the snapped ends.
            const step = Math.floor(t * 14);
            if (hash01(step * 2.3 + i * 5.1) > 0.45) {
              c.strokeStyle = WARM_HOT;
              c.globalAlpha = 0.55;
              c.lineWidth = 1.5;
              c.beginPath();
              c.moveTo(x - 2, y - 5);
              c.lineTo(x + (hash01(step + i) - 0.5) * 3, y + (hash01(step + i + 3) - 0.5) * 4);
              c.lineTo(x + 2, y + 6);
              c.stroke();
              c.globalAlpha = 1;
            }
          }
          if (capsOn) {
            c.fillStyle = ALARM;
            c.font = FONT_BIG;
            c.fillText(ratingLabel[i]!, x, y + 25);
          }
        } else {
          c.beginPath();
          c.moveTo(x - 8, y);
          c.lineTo(x + 8, y);
          c.strokeStyle = nodeOutline(i, live);
          c.lineWidth = 2;
          c.stroke();
          if (capsOn) {
            c.fillStyle = TEXT;
            c.font = FONT;
            c.fillText(ratingLabel[i]!, x, y + 23);
          }
        }
        if (fuseTicks[i] !== null) {
          // Load bar: fill length and ticks carry the reading, colour only backs it up.
          const bx = x - FUSE_BAR_WIDTH / 2;
          const by = y + FUSE_BAR_TOP;
          const fill = broken ? 0 : fuseFill(state.fuseLoad.get(id) ?? 0, fuseRating[i]);
          c.fillStyle = NODE_FILL;
          c.fillRect(bx, by, FUSE_BAR_WIDTH, FUSE_BAR_HEIGHT);
          if (fill > 0) {
            c.fillStyle = BAR_COLOURS[fuseStep(fill)]!;
            c.fillRect(bx, by, FUSE_BAR_WIDTH * fill, FUSE_BAR_HEIGHT);
          }
          const ticks = fuseTicks[i]!;
          c.strokeStyle = BG;
          c.lineWidth = 1;
          c.beginPath();
          for (let k = 0; k < ticks.length; k++) {
            c.moveTo(bx + ticks[k]!, by);
            c.lineTo(bx + ticks[k]!, by + FUSE_BAR_HEIGHT);
          }
          c.stroke();
          c.lineWidth = 1.5;
          c.beginPath();
          if (broken) {
            // Broken outline: two halves with a gap and slanted ends, bar empty.
            c.strokeStyle = ALARM;
            const mx = bx + FUSE_BAR_WIDTH / 2;
            c.moveTo(mx - 3, by - 1);
            c.lineTo(bx, by - 1);
            c.lineTo(bx, by + FUSE_BAR_HEIGHT + 1);
            c.lineTo(mx - 5, by + FUSE_BAR_HEIGHT + 1);
            c.moveTo(mx + 3, by - 1);
            c.lineTo(bx + FUSE_BAR_WIDTH, by - 1);
            c.lineTo(bx + FUSE_BAR_WIDTH, by + FUSE_BAR_HEIGHT + 1);
            c.lineTo(mx + 1, by + FUSE_BAR_HEIGHT + 1);
          } else {
            c.strokeStyle = fill >= 1 ? ALARM : NODE_DEAD;
            c.rect(bx - 0.5, by - 0.5, FUSE_BAR_WIDTH + 1, FUSE_BAR_HEIGHT + 1);
          }
          c.stroke();
        }
        break;
      }
      case "junction": {
        if (readableNode[i] === 1 && faultNode[i] === K_JUNCTION) {
          // A box with one broken stub per part the repair needs.
          c.fillRect(x - 11, y - 8, 22, 16);
          c.strokeRect(x - 11, y - 8, 22, 16);
          const step = Math.floor(t * 9);
          for (let s = 0; s < junctionStubs; s++) {
            const a = (s / junctionStubs) * Math.PI * 2;
            const ux = Math.cos(a);
            const uy = Math.sin(a);
            const sx0 = x + ux * 13;
            const sy0 = y + uy * 10;
            c.strokeStyle = TEXT_DIM;
            c.lineWidth = 2.5;
            c.lineCap = "round";
            c.beginPath();
            c.moveTo(sx0, sy0);
            c.lineTo(sx0 + ux * 6, sy0 + uy * 6);
            c.moveTo(sx0 + ux * 15, sy0 + uy * 15);
            c.lineTo(sx0 + ux * 19, sy0 + uy * 19);
            c.stroke();
            // Char mark at the stub's torn end.
            c.fillStyle = ALARM;
            c.beginPath();
            c.arc(sx0 + ux * 7.5, sy0 + uy * 7.5, 2, 0, Math.PI * 2);
            c.fill();
            // Fizz: small intermittent arcs across the gap, fewer and rarer than a cable's spark.
            const h = step * 3.7 + i * 2.9 + s * 11.3;
            if (live && hash01(h) > 0.55) {
              const off = (hash01(h + 1) - 0.5) * 7;
              c.strokeStyle = WARM_HOT;
              c.lineWidth = 1.5;
              c.beginPath();
              c.moveTo(sx0 + ux * 6, sy0 + uy * 6);
              c.lineTo(sx0 + ux * 10.5 - uy * off, sy0 + uy * 10.5 + ux * off);
              c.lineTo(sx0 + ux * 15, sy0 + uy * 15);
              c.stroke();
            }
          }
        } else {
          c.beginPath();
          c.arc(x, y, 5, 0, Math.PI * 2);
          c.fill();
          c.stroke();
        }
        break;
      }
    }
    if (hovered) {
      c.strokeStyle = HOVER;
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(x, y, 22, 0, Math.PI * 2);
      c.stroke();
    }
  }

  /** Shock streak, crackle at every lamp that counted, then the pop with sparks flying out. Allocation-free. */
  function drawSequences(t: number): void {
    for (let s = 0; s < SLOTS; s++) {
      if (slotActive[s] === 0) continue;
      const hasPath = slotLineCount[s]! > 0;
      const age = t - slotStart[s]!;
      const ni = slotNode[s]!;
      if (hasPath) {
        const longest = slotLongest[s]!;
        const nb = Math.min(slotLampCount[s]!, MAX_BLOW_LAMPS);
        const fade = streakFade(age);
        if (fade > 0 && longest > 0) {
          // All streaks share one speed and wait at their lamp; one path per pass so a shared trunk is stroked once.
          const head = headDistance(age, longest);
          const slen = streakLength(longest);
          c.beginPath();
          let drawn = 0;
          for (let k = 0; k < nb; k++) {
            const len = lampLen[s * MAX_FLARE_LAMPS + k]!;
            if (len <= 0) continue;
            const bh = head < len ? head : len;
            const b = (s * MAX_BLOW_LAMPS + k) * MAX_PATH_POINTS;
            const bn = branchN[s * MAX_BLOW_LAMPS + k]!;
            for (let p = 0; p < bn; p++) {
              ptX[p] = branchX[b + p]!;
              ptY[p] = branchY[b + p]!;
            }
            const m = sliceVertices(ptX, ptY, bn, (bh - slen) / len, bh / len, sliceOut);
            if (m < 2) continue;
            c.moveTo(sliceOut[0]!, sliceOut[1]!);
            for (let p = 1; p < m; p++) c.lineTo(sliceOut[p * 2]!, sliceOut[p * 2 + 1]!);
            drawn++;
          }
          if (drawn > 0) {
            c.lineCap = "round";
            c.lineJoin = "round";
            c.strokeStyle = SHOCK_GLOW;
            c.globalAlpha = 0.55 * fade;
            c.lineWidth = 12;
            c.stroke();
            c.globalAlpha = fade;
            c.strokeStyle = SHOCK_CORE;
            c.lineWidth = 3.5;
            c.stroke();
            c.fillStyle = SHOCK_CORE;
            c.beginPath();
            for (let k = 0; k < nb; k++) {
              const len = lampLen[s * MAX_FLARE_LAMPS + k]!;
              if (len <= 0) continue;
              const b = (s * MAX_BLOW_LAMPS + k) * MAX_PATH_POINTS;
              const bn = branchN[s * MAX_BLOW_LAMPS + k]!;
              for (let p = 0; p < bn; p++) {
                ptX[p] = branchX[b + p]!;
                ptY[p] = branchY[b + p]!;
              }
              pointAlong(ptX, ptY, bn, (head < len ? head : len) / len, headOut);
              c.moveTo(headOut[0]! + 5, headOut[1]!);
              c.arc(headOut[0]!, headOut[1]!, 5, 0, Math.PI * 2);
            }
            c.fill();
            c.globalAlpha = 1;
          }
        }
        // Every line the shock ran along glows brightly together: one path, two strokes.
        const lg = lineGlow(age);
        if (lg > 0 && glowN[s]! > 0) {
          const gl = glowLines[s]!;
          c.beginPath();
          for (let q = 0; q < glowN[s]!; q++) {
            const li = gl[q]!;
            c.moveTo(geo.ax[li]!, geo.ay[li]!);
            c.lineTo(geo.bx[li]!, geo.by[li]!);
          }
          c.lineCap = "round";
          c.lineJoin = "round";
          c.strokeStyle = SHOCK_GLOW;
          c.globalAlpha = 0.6 * lg;
          c.lineWidth = 16;
          c.stroke();
          c.globalAlpha = lg;
          c.strokeStyle = SHOCK_CORE;
          c.lineWidth = 4.5;
          c.stroke();
          c.globalAlpha = 1;
        }
        // Every lamp that counted sparks at once: radiating rays plus a flickering crackle.
        const sp = lampSpark(age);
        if (sp > 0) {
          const step = Math.floor(t * 30);
          c.lineCap = "round";
          c.strokeStyle = SHOCK_CORE;
          c.globalAlpha = 0.35 + 0.65 * sp;
          c.lineWidth = 2.5;
          c.beginPath();
          for (let lk = 0; lk < slotLampCount[s]!; lk++) {
            const ci = lampNode[s * MAX_FLARE_LAMPS + lk]!;
            if (ci < 0) continue;
            const ex = geo.nx[ci]!;
            const ey = geo.ny[ci]!;
            for (let r = 0; r < SPARK_RAYS; r++) {
              if (!sparkRay(lk, r, age, sparkOut)) continue;
              c.moveTo(ex + sparkOut[0]!, ey + sparkOut[1]!);
              c.lineTo(ex + sparkOut[2]!, ey + sparkOut[3]!);
            }
            for (let k = 0; k < 7; k++) {
              const h = step * 5.3 + s * 3.1 + lk * 7.7 + k * 1.9;
              if (hash01(h) < 0.25) continue;
              const a = hash01(h + 0.5) * Math.PI * 2;
              const r0 = 6 + hash01(h + 1.5) * 4;
              const r1 = r0 + 6 + hash01(h + 2.5) * 12;
              c.moveTo(ex + Math.cos(a) * r0, ey + Math.sin(a) * r0);
              c.lineTo(ex + Math.cos(a) * r1, ey + Math.sin(a) * r1);
            }
          }
          c.stroke();
          c.globalAlpha = 1;
        }
      }
      const pf = popFraction(age, hasPath);
      if (pf >= 0) {
        const x = geo.nx[ni]!;
        const y = geo.ny[ni]!;
        const TAU = Math.PI * 2;
        // Flash and shock ring.
        c.fillStyle = SHOCK_CORE;
        c.globalAlpha = Math.max(0, 0.7 * (1 - pf * 3));
        c.beginPath();
        c.arc(x, y, 14 + pf * 24, 0, TAU);
        c.fill();
        c.globalAlpha = 1 - pf;
        c.strokeStyle = WARM_HOT;
        c.lineWidth = 3;
        c.beginPath();
        c.arc(x, y, 16 + pf * 70, 0, TAU);
        c.stroke();
        // Sparks flying out in all directions, each a streak that decelerates and fades.
        c.lineWidth = 2.5;
        c.beginPath();
        for (let k = 0; k < 18; k++) {
          const a = hash01(k * 3.7 + ni * 1.3) * TAU;
          const sp = 50 + hash01(k * 5.9 + 1) * 90;
          const e0 = 1 - (1 - pf) * (1 - pf);
          const e1 = 1 - (1 - Math.max(pf - 0.15, 0)) * (1 - Math.max(pf - 0.15, 0));
          const r1 = 10 + sp * e0;
          const r0 = 10 + sp * e1;
          c.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
          c.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
        }
        c.stroke();
        c.globalAlpha = 1;
      }
    }
  }

  function draw(state: GridState, overlay: MapOverlay, t: number): void {
    // Classify faults for this frame (loop over a handful of entries).
    faultNode.fill(0);
    readableNode.fill(0);
    faultLine.fill(0);
    for (let k = 0; k < state.faults.length; k++) {
      const f = state.faults[k]!;
      const code = kindCode(f.kind);
      const ni = geo.nodeIndex.get(f.at);
      if (ni !== undefined) {
        faultNode[ni] = code;
        if (state.readableFaults.has(f.id)) readableNode[ni] = 1;
      } else {
        const li = geo.lineIndex.get(f.at);
        if (li !== undefined) faultLine[li] = code;
      }
    }
    // A fuse that just blew (not blown in the puzzle file) pops. If notify() already queued a
    // sequence for it, that plays; otherwise a pop-only sequence starts now.
    for (let i = 0; i < nNodes; i++) {
      const blown = faultNode[i] === K_FUSE ? 1 : 0;
      if (blown === 1 && prevBlown[i] === 0 && hadFaultNode[i] === 0 && slotFor(i) < 0) startSlot(i, t);
      prevBlown[i] = blown;
    }
    // Spring returns: a spring switch that moved while unpowered has sprung back. An event from
    // notify() may already have queued the twang (NaN); then it is only stamped, not restarted.
    for (let i = 0; i < nNodes; i++) {
      if (isSpring[i] === 0) continue;
      const nd = nodes[i]!;
      if (nd.type !== "switch") continue;
      const sel = state.switches.get(geo.nodeIds[i]!) ?? nd.selected;
      if (prevSel[i]! >= 0 && twangStart[i] === twangStart[i] && sprangBack(true, prevSel[i]!, sel, state.powered.has(geo.nodeIds[i]!))) {
        twangStart[i] = t;
      }
      prevSel[i] = sel;
      if (twangStart[i] !== twangStart[i]) twangStart[i] = t;
    }
    // Advance sequences: stamp pending starts, free finished or undone ones, hold fuses intact until the pop.
    holdIntact.fill(0);
    lampGlow.fill(0);
    for (let s = 0; s < SLOTS; s++) {
      if (slotActive[s] === 0) continue;
      if (slotStart[s] !== slotStart[s]) slotStart[s] = t;
      const ni = slotNode[s]!;
      const age = t - slotStart[s]!;
      if (faultNode[ni] !== K_FUSE || age >= sequenceTotal(slotLineCount[s]! > 0)) {
        slotActive[s] = 0;
        continue;
      }
      if (fuseIntact(age, slotLineCount[s]! > 0)) holdIntact[ni] = 1;
      if (slotLineCount[s]! > 0) {
        for (let k = 0; k < slotLampCount[s]!; k++) {
          const ci = lampNode[s * MAX_FLARE_LAMPS + k]!;
          if (ci < 0) continue;
          const fl = lampFlare(age, LAMP_SPARK_AT);
          if (fl > lampGlow[ci]!) lampGlow[ci] = fl;
        }
      }
    }

    // Detect a battery that just ran flat (released -> not released at charge 0) to pop it.
    for (let i = 0; i < nNodes; i++) {
      if (isBattery[i] === 0) continue;
      const bs = state.batteries.get(geo.nodeIds[i]!);
      const rel = bs !== undefined && bs.released;
      if (bs !== undefined && wentFlat(prevReleased[i] === 1, rel, bs.charge)) flatStart[i] = t;
      prevReleased[i] = rel ? 1 : 0;
    }

    const hover = overlay.hover ?? null;
    hiNode = overlay.highlight ? (geo.nodeIndex.get(overlay.highlight) ?? -1) : -1;
    const relT = overlay.relightT;
    let rp: RelightPlan | null = null;
    if (relT !== undefined) {
      if (!plan) plan = planRelight(puzzle, state);
      if (relT < plan.duration) rp = plan;
    } else {
      plan = null;
    }
    const rt = relT ?? 0;

    // The city is the first layer: dark, cached, with only the lit places and linked buildings drawn per frame.
    drawCity(state, relT, rp, t);

    // Decor: not grid cables, so faint and unconnected.
    c.strokeStyle = DECOR;
    c.lineWidth = 2;
    c.lineCap = "round";
    c.lineJoin = "round";
    for (let d = 0; d < geo.decor.length; d++) {
      const path = geo.decor[d]!;
      c.beginPath();
      c.moveTo(path[0]!, path[1]!);
      for (let p = 2; p < path.length; p += 2) c.lineTo(path[p]!, path[p + 1]!);
      c.stroke();
    }

    for (let k = 0; k < nVisLines; k++) drawLine(visLines[k]!, state, t, rt, rp, hover);
    for (let k = 0; k < nVisNodes; k++) drawNode(visNodes[k]!, state, t, rt, rp, hover);
    drawSequences(t);
    drawMarkers(state);

    // Feed readout: "using N of M" (Lv wording). Alarm state adds a "!" and a shake, not just colour.
    feedCaps.update(state);
    c.font = FONT_FEED;
    c.textAlign = "center";
    c.textBaseline = "middle";
    for (let k = 0; k < feedCaps.nodeIdx.length && capsOn; k++) {
      const ni = feedCaps.nodeIdx[k]!;
      if (ni < 0) continue;
      const fx = geo.nx[ni]!;
      const fy = geo.ny[ni]!;
      const over = feedCaps.isOver(k, state);
      if (feedCaps.heading[k] !== "") {
        c.fillStyle = over ? ALARM : TEXT;
        c.fillText(feedCaps.heading[k]!, fx, fy - 26);
      }
      if (over) {
        const shake = Math.sin(t * 40) * 1.5;
        c.fillStyle = ALARM;
        c.fillText(feedCaps.name[k]!, fx, fy + 32);
        c.fillText(feedCaps.alarm[k]!, fx + shake, fy + 46);
      } else {
        c.fillStyle = TEXT;
        c.fillText(feedCaps.name[k]!, fx, fy + 32);
        c.fillText(feedCaps.using[k]!, fx, fy + 46);
      }
    }
  }

  function openingPan(): Pan {
    return initialPan(puzzle, width, height, PADDING, insets);
  }

  function centreOn(nodeId: string): Pan {
    const ni = geo.nodeIndex.get(nodeId);
    if (ni === undefined) return { x: pan.x, y: pan.y };
    const n = nodes[ni]!;
    const fit0 = computeFit(mapBounds, width, height, PADDING, insets, undefined, currentScale());
    const p = panToCentre(n.pos[0], n.pos[1], fit0, freeArea(width, height, insets));
    return setPan(p.x, p.y);
  }

  resize();
  {
    const p0 = openingPan();
    setPan(p0.x, p0.y);
  }
  return {
    draw,
    // Nothing under the HUD or the parts panel can be picked: the free area is the only live part of the canvas.
    hitTest: (x, y) => (inArea(freeArea(width, height, insets), x, y) ? hitTestGeometry(geo, x, y) : null),
    placeAt: (x, y) => (inArea(freeArea(width, height, insets), x, y) ? placeAtPoint(places, geo.fit, x, y) : null),
    resize,
    setInsets,
    notify,
    getPan: () => ({ x: pan.x, y: pan.y }),
    setPan,
    resetView: () => {
      userScale = null;
      const p0 = openingPan();
      setPan(p0.x, p0.y);
    },
    centreOn,
    getScale: () => geo.fit.scale,
    zoomStep,
    fitWhole,
  };
}
