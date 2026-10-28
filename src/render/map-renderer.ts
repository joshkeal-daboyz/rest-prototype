/**
 * Canvas 2D drawing of a map-scope puzzle from Puzzle + GridState only.
 * Geometry is precomputed (per puzzle, again on resize); the draw loop
 * allocates nothing: typed arrays, cached strings, constant colour strings.
 */

import type { FaultKind, Puzzle } from "../core";
import type { GridState } from "../grid";
import { buildGeometry, hitTestGeometry, type Geometry } from "./geometry";
import { clamp01, flicker, hash01, pulseCount, pulsePhase, PULSE_SPACING } from "./motion";
import { FLARE_SECONDS, planRelight, type RelightPlan } from "./relight";

export interface MapOverlay {
  /** Id of the node or line the pointer is over (from hitTest). */
  hover?: string | null;
  /** Seconds since the job completed. Undefined = no Relight running. */
  relightT?: number;
}

export interface MapRenderer {
  draw(state: GridState, overlay: MapOverlay, timeSeconds: number): void;
  /** x, y in CSS pixels relative to the canvas's top-left. */
  hitTest(x: number, y: number): string | null;
  resize(): void;
}

const PADDING = 64;

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
const FONT = "12px system-ui, sans-serif";
const FONT_BIG = "bold 13px system-ui, sans-serif";
const FONT_FEED = "bold 15px system-ui, sans-serif";

const DASH_TARGET: number[] = [4, 4];
const DASH_NONE: number[] = [];

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

export function createMapRenderer(canvas: HTMLCanvasElement, puzzle: Puzzle): MapRenderer {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  const c: CanvasRenderingContext2D = ctx;

  const nodes = puzzle.nodes;
  const lines = puzzle.lines;
  const nNodes = nodes.length;
  const nLines = lines.length;

  let width = 0;
  let height = 0;
  let geo: Geometry = buildGeometry(puzzle, 1, 1, PADDING);

  // ---- per-puzzle precomputation ----
  const feedIdx = nodes.findIndex((n) => n.type === "feed");
  const targetSet = new Set(puzzle.target && puzzle.target.length ? puzzle.target : []);
  const allTargets = !puzzle.target || puzzle.target.length === 0;
  const isTarget = new Uint8Array(nNodes);
  nodes.forEach((n, i) => {
    if (n.type === "lamp" && (allTargets || targetSet.has(n.id))) isTarget[i] = 1;
  });
  const hadFaultNode = new Uint8Array(nNodes);
  const hadFaultLine = new Uint8Array(nLines);
  for (const f of puzzle.faults) {
    const ni = geo.nodeIndex.get(f.at);
    if (ni !== undefined) hadFaultNode[ni] = 1;
    const li = geo.lineIndex.get(f.at);
    if (li !== undefined) hadFaultLine[li] = 1;
  }
  const loadLabel: string[] = nodes.map((n) => (n.type === "lamp" ? String(n.load ?? 1) : ""));
  const ratingLabel: string[] = nodes.map((n) => (n.type === "fusebox" && n.rating !== undefined ? `≤${n.rating}` : ""));
  const lineFromId: string[] = lines.map((l) => l.from);

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
  const popStart = new Float64Array(nNodes).fill(-100);

  let plan: RelightPlan | null = null;
  let feedLabel = "";
  let feedAlarmLabel = "";
  let feedLoad = NaN;
  let feedCap: number | null = -1;

  function resize(): void {
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    width = Math.max(canvas.clientWidth, 1);
    height = Math.max(canvas.clientHeight, 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    geo = buildGeometry(puzzle, width, height, PADDING);
    buildSwitchDirs();
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

    c.globalAlpha = 0.25;
    c.strokeStyle = LINE_LIVE_GLOW;
    c.lineWidth = 9;
    c.beginPath();
    c.moveTo(sx, sy);
    c.lineTo(px, py);
    c.stroke();
    c.globalAlpha = 1;
    c.strokeStyle = LINE_LIVE;
    c.lineWidth = 3;
    c.stroke();

    // Pulses: chevrons that travel away from the feed. Direction is shape, not colour.
    const phase = pulsePhase(t);
    const count = pulseCount(liveLen, phase);
    if (count > 0) {
      const vx = -uy;
      const vy = ux;
      c.fillStyle = PULSE;
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
    const powered = state.powered.has(id) && (!rp || relT >= rp.nodeArrive[i]!);
    const r = 14;

    if (k > 0) {
      // Light pool: stacked translucent discs (no gradient allocation).
      c.fillStyle = WARM;
      c.globalAlpha = 0.07 * k;
      c.beginPath();
      c.arc(x, y, 50, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 0.11 * k;
      c.beginPath();
      c.arc(x, y, 36, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 0.18 * k;
      c.beginPath();
      c.arc(x, y, 25, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    }
    if (flareAge >= 0 && flareAge < FLARE_SECONDS) {
      const f = flareAge / FLARE_SECONDS;
      c.strokeStyle = WARM_HOT;
      c.globalAlpha = 1 - f;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(x, y, r + 4 + f * 40, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = WARM_HOT;
      c.globalAlpha = (1 - f) * 0.5;
      c.beginPath();
      c.arc(x, y, r + 14 * (1 - f), 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    }

    c.fillStyle = k > 0 ? WARM : NODE_FILL;
    if (k > 0 && k < 1) c.globalAlpha = 0.35 + 0.65 * k;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
    c.strokeStyle = k > 0 ? WARM_HOT : nodeOutline(i, powered);
    c.lineWidth = hover === id ? 4 : 2.5;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.stroke();
    if (hover === id) {
      c.strokeStyle = HOVER;
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(x, y, r + 5, 0, Math.PI * 2);
      c.stroke();
    }

    c.font = FONT_BIG;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = k > 0 ? BG : TEXT_DIM;
    c.fillText(loadLabel[i]!, x, y + 1);

    if (isTarget[i] === 1) {
      c.strokeStyle = TARGET;
      c.lineWidth = 2;
      c.setLineDash(DASH_TARGET);
      c.beginPath();
      c.arc(x, y, r + 8, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash(DASH_NONE);
      c.fillStyle = TARGET;
      c.font = FONT_BIG;
      c.fillText("★", x, y - r - 17);
    }
    if (readableNode[i] === 1 && faultNode[i] === K_LAMP) drawX(x, y, 8);
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
        c.beginPath();
        c.arc(x, y, 12, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        const sel = state.switches.get(id) ?? n.selected;
        const other = sel === 0 ? 1 : 0;
        c.lineCap = "round";
        c.strokeStyle = TEXT_DIM;
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x + swDx[i * 2 + other]! * 4, y + swDy[i * 2 + other]! * 4);
        c.lineTo(x + swDx[i * 2 + other]! * 13, y + swDy[i * 2 + other]! * 13);
        c.stroke();
        c.strokeStyle = live ? LINE_LIVE : TEXT;
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + swDx[i * 2 + sel]! * 20, y + swDy[i * 2 + sel]! * 20);
        c.stroke();
        c.fillStyle = c.strokeStyle;
        c.beginPath();
        c.arc(x, y, 3, 0, Math.PI * 2);
        c.fill();
        drawRibbon(x + 9, y - 21);
        break;
      }
      case "fusebox": {
        c.fillRect(x - 14, y - 11, 28, 22);
        c.strokeRect(x - 14, y - 11, 28, 22);
        c.beginPath();
        c.moveTo(x - 8, y);
        c.lineTo(x + 8, y);
        c.strokeStyle = faultNode[i] === K_FUSE && readableNode[i] === 1 ? TEXT_DIM : nodeOutline(i, live);
        c.lineWidth = 2;
        c.stroke();
        c.fillStyle = TEXT;
        c.font = FONT;
        c.fillText(ratingLabel[i]!, x, y + 23);
        if (readableNode[i] === 1 && faultNode[i] === K_FUSE) {
          const age = t - popStart[i]!;
          if (age >= 0 && age < 0.5) {
            const f = age / 0.5;
            c.strokeStyle = WARM_HOT;
            c.globalAlpha = 1 - f;
            c.lineWidth = 3;
            c.beginPath();
            for (let k = 0; k < 8; k++) {
              const a = (k / 8) * Math.PI * 2;
              c.moveTo(x + Math.cos(a) * (14 + f * 10), y + Math.sin(a) * (14 + f * 10));
              c.lineTo(x + Math.cos(a) * (20 + f * 26), y + Math.sin(a) * (20 + f * 26));
            }
            c.stroke();
            c.globalAlpha = 1;
          }
          drawX(x, y, 8);
        }
        break;
      }
      case "junction": {
        c.beginPath();
        c.arc(x, y, 5, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        if (readableNode[i] === 1 && faultNode[i] === K_JUNCTION) drawX(x, y, 8);
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
    // Detect a fuse that just blew (not blown in the puzzle file) to pop it.
    for (let i = 0; i < nNodes; i++) {
      const blown = faultNode[i] === K_FUSE ? 1 : 0;
      if (blown === 1 && prevBlown[i] === 0 && hadFaultNode[i] === 0) popStart[i] = t;
      prevBlown[i] = blown;
    }

    const hover = overlay.hover ?? null;
    const relT = overlay.relightT;
    let rp: RelightPlan | null = null;
    if (relT !== undefined) {
      if (!plan) plan = planRelight(puzzle, state);
      if (relT < plan.duration) rp = plan;
    } else {
      plan = null;
    }
    const rt = relT ?? 0;

    c.fillStyle = BG;
    c.fillRect(0, 0, width, height);

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

    for (let i = 0; i < nLines; i++) drawLine(i, state, t, rt, rp, hover);
    for (let i = 0; i < nNodes; i++) drawNode(i, state, t, rt, rp, hover);

    // Feed readout: load / capacity. Alarm state adds a "!" and a shake, not just colour.
    if (feedIdx >= 0) {
      if (feedLoad !== state.load || feedCap !== state.capacity) {
        feedLoad = state.load;
        feedCap = state.capacity;
        feedLabel = `${state.load} / ${state.capacity === null ? "∞" : state.capacity}`;
        feedAlarmLabel = `! ${feedLabel} !`;
      }
      const fx = geo.nx[feedIdx]!;
      const fy = geo.ny[feedIdx]!;
      c.font = FONT_FEED;
      c.textAlign = "center";
      c.textBaseline = "middle";
      if (state.brownout) {
        const shake = Math.sin(t * 40) * 1.5;
        c.fillStyle = ALARM;
        c.fillText(feedAlarmLabel, fx + shake, fy + 32);
      } else {
        c.fillStyle = TEXT;
        c.fillText(feedLabel, fx, fy + 32);
      }
    }
  }

  resize();
  return {
    draw,
    hitTest: (x, y) => hitTestGeometry(geo, x, y),
    resize,
  };
}
