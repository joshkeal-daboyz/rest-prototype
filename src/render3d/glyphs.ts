/**
 * The node, lamp and ribbon glyphs, drawn on any 2D context (ticket 081 E1, from 071 E). The 2D map calls these for its feed, breaker, switch, fuse box and
 * junction; the 3D overlay draws its icons with the same functions. Each assumes the caller has set the outline `lineWidth`, `strokeStyle`, `fillStyle` and text
 * alignment it wants, exactly as `map-renderer.ts` did before the move; `drawNodeGlyph` sets them itself. No allocation per call.
 */

export type GlyphContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export const SCORCH = "#05070b";
export const BG = "#0b0f17";
export const LINE_LIVE = "#4fd1ff";
export const NODE_FILL = "#121826";
export const NODE_DEAD = "#4a586f";
export const NODE_LIVE = "#7fdcff";
export const TEXT = "#d3dae6";
export const TEXT_DIM = "#7b879a";
export const WARM = "#ffd37a";
export const WARM_HOT = "#fff3c9";
export const ALARM = "#ff5a4d";
export const TARGET = "#ffe9a8";
export const RIBBON = "#ff3df0";
export const FONT = "12px system-ui, sans-serif";
export const DASH_TARGET: number[] = [4, 4];
export const DASH_NONE: number[] = [];
const DASH_LAMP_TARGET: number[] = [3, 3];

/** A red X on a dark ground: a fault the player can read. */
export function drawX(c: GlyphContext, x: number, y: number, r: number): void {
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

/** The tribe's ribbon: a short swallow-tailed tag. */
export function drawRibbon(c: GlyphContext, x: number, y: number): void {
  c.fillStyle = RIBBON;
  c.fillRect(x, y, 5, 11);
  c.beginPath();
  c.moveTo(x, y + 11);
  c.lineTo(x + 2.5, y + 8);
  c.lineTo(x + 5, y + 11);
  c.fill();
}

/** The feed: a box with a bolt, warm when current is on it. */
export function drawFeedGlyph(c: GlyphContext, x: number, y: number, live: boolean): void {
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
}

/** A breaker: a closed one has a flat bar and "ON"; an open one a raised lever and "OFF". */
export function drawBreakerGlyph(c: GlyphContext, x: number, y: number, closed: boolean, live: boolean): void {
  c.fillRect(x - 13, y - 10, 26, 20);
  c.strokeRect(x - 13, y - 10, 26, 20);
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
  drawRibbon(c, x + 9, y - 19);
}

/**
 * A switch. (`otherDx`, `otherDy`) is the unit direction of the output not chosen (a stub), (`leverDx`, `leverDy`) the lever's unit direction, at rest or mid-twang.
 * A stuck relay is dashed and dim, with a bar across its second mark; a spring has a coil under it.
 */
export function drawSwitchGlyph(
  c: GlyphContext,
  x: number,
  y: number,
  live: boolean,
  stuck: boolean,
  relay: boolean,
  spring: boolean,
  otherDx: number,
  otherDy: number,
  leverDx: number,
  leverDy: number,
): void {
  if (stuck) {
    c.globalAlpha = 0.5;
    c.setLineDash(DASH_TARGET);
  }
  c.beginPath();
  c.arc(x, y, 12, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  if (stuck) c.setLineDash(DASH_NONE);
  c.lineCap = "round";
  c.strokeStyle = TEXT_DIM;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(x + otherDx * 4, y + otherDy * 4);
  c.lineTo(x + otherDx * 13, y + otherDy * 13);
  c.stroke();
  c.strokeStyle = live ? LINE_LIVE : TEXT;
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x + leverDx * 20, y + leverDy * 20);
  c.stroke();
  c.fillStyle = c.strokeStyle;
  c.beginPath();
  c.arc(x, y, 3, 0, Math.PI * 2);
  c.fill();
  drawRibbon(c, x + 9, y - 21);
  if (spring) {
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
  if (relay) {
    // Second tribe mark; a stuck relay also shows a bar across it (shape, not just dimness).
    drawRibbon(c, x - 14, y - 21);
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
}

/** A sound junction: a small dot. */
export function drawJunctionGlyph(c: GlyphContext, x: number, y: number): void {
  c.beginPath();
  c.arc(x, y, 5, 0, Math.PI * 2);
  c.fill();
  c.stroke();
}

/**
 * A fuse box's body up to its bar: the box, then either the bar across it (`outline`, 2 px) or, when blown, a scorch and the bar snapped in two with curled ends.
 * The caller draws any buzz and the rating text after it.
 */
export function drawFuseBoxGlyph(c: GlyphContext, x: number, y: number, broken: boolean, outline: string): void {
  c.fillRect(x - 14, y - 11, 28, 22);
  c.strokeRect(x - 14, y - 11, 28, 22);
  if (broken) {
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
  } else {
    c.beginPath();
    c.moveTo(x - 8, y);
    c.lineTo(x + 8, y);
    c.strokeStyle = outline;
    c.lineWidth = 2;
    c.stroke();
  }
}

/** A lamp: dark is a hollow bulb; lit is a filled warm bulb with a light pool and rays. A target lamp has a dashed ring and a star. */
export function drawLampGlyph(c: GlyphContext, x: number, y: number, lit: boolean, target: boolean, size: number): void {
  const r = size * 0.28;
  const TAU = Math.PI * 2;
  if (lit) {
    c.fillStyle = WARM;
    c.globalAlpha = 0.25;
    c.beginPath();
    c.arc(x, y, size * 0.5, 0, TAU);
    c.fill();
    c.globalAlpha = 1;
    c.strokeStyle = WARM_HOT;
    c.lineWidth = 2;
    c.lineCap = "round";
    c.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      c.moveTo(x + Math.cos(a) * (r + 3), y + Math.sin(a) * (r + 3));
      c.lineTo(x + Math.cos(a) * (r + 7), y + Math.sin(a) * (r + 7));
    }
    c.stroke();
  }
  c.fillStyle = lit ? WARM : NODE_FILL;
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fill();
  c.strokeStyle = lit ? WARM_HOT : NODE_DEAD;
  c.lineWidth = 2;
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.stroke();
  if (target) {
    c.strokeStyle = TARGET;
    c.lineWidth = 1.5;
    c.setLineDash(DASH_LAMP_TARGET);
    c.beginPath();
    c.arc(x, y, r + 5, 0, TAU);
    c.stroke();
    c.setLineDash(DASH_NONE);
    c.fillStyle = TARGET;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("★", x, y - r - 9);
  }
}

/** A battery: a cell with a terminal nub and a charge bar filling from the bottom, `frac` 0..1, with quarter ticks. */
export function drawBatteryGlyph(c: GlyphContext, x: number, y: number, frac: number): void {
  c.fillStyle = NODE_FILL;
  c.fillRect(x - 5, y - 24, 10, 5);
  c.fillRect(x - 14, y - 19, 28, 38);
  c.strokeStyle = NODE_DEAD;
  c.lineWidth = 2.5;
  c.strokeRect(x - 14, y - 19, 28, 38);
  const fillH = 30 * (frac < 0 ? 0 : frac > 1 ? 1 : frac);
  if (fillH > 0) {
    c.fillStyle = WARM;
    c.fillRect(x - 9, y + 15 - fillH, 18, fillH);
  }
  c.strokeStyle = BG;
  c.lineWidth = 1;
  c.beginPath();
  for (let k = 1; k < 4; k++) {
    c.moveTo(x - 9, y + 15 - (30 * k) / 4);
    c.lineTo(x + 9, y + 15 - (30 * k) / 4);
  }
  c.stroke();
}

export type GlyphType = "feed" | "breaker" | "switch" | "fusebox" | "junction" | "battery" | "lamp";

/** What an icon needs to be drawn: the state is read from the shape (lever, chevron, bar, bulb, star), colour only backs it up. */
export interface GlyphSpec {
  type: GlyphType;
  /** Current reaches it. */
  live: boolean;
  /** A breaker is closed. */
  closed: boolean;
  /** A switch's chosen output, 0 or 1. */
  selected: 0 | 1;
  /** A fuse box with a readable blown fuse, or a junction with a readable fault (drawn as a broken box). */
  broken: boolean;
  /** A lamp is lit. */
  lit: boolean;
  /** A lamp is a target. */
  target: boolean;
  /** A battery's charge, 0..1. */
  charge: number;
  /** A readable fault is marked on it: a red X. */
  faulted: boolean;
}

/**
 * Draw one node icon centred on (x, y), at `size` px across (the 2D glyphs are about 30 px). Sets its own styles. A switch's lever points up-left for output 0
 * and up-right for output 1, so the choice reads by shape without a line to follow.
 */
export function drawNodeGlyph(c: GlyphContext, spec: GlyphSpec, x: number, y: number, size: number): void {
  const k = size / 30;
  c.save();
  c.translate(x, y);
  c.scale(k, k);
  c.lineWidth = 2.5;
  c.strokeStyle = spec.live ? NODE_LIVE : NODE_DEAD;
  c.fillStyle = NODE_FILL;
  c.textAlign = "center";
  c.textBaseline = "middle";
  switch (spec.type) {
    case "feed":
      drawFeedGlyph(c, 0, 0, spec.live);
      break;
    case "breaker":
      drawBreakerGlyph(c, 0, 0, spec.closed, spec.live);
      break;
    case "switch":
      drawSwitchGlyph(c, 0, 0, spec.live, false, false, false, spec.selected === 0 ? 0.7 : -0.7, -0.7, spec.selected === 0 ? -0.7 : 0.7, -0.7);
      break;
    case "fusebox":
      drawFuseBoxGlyph(c, 0, 0, spec.broken, spec.live ? NODE_LIVE : NODE_DEAD);
      break;
    case "junction":
      if (spec.broken) {
        c.fillRect(-11, -8, 22, 16);
        c.strokeRect(-11, -8, 22, 16);
        c.strokeStyle = ALARM;
        c.beginPath();
        c.moveTo(-8, 0);
        c.lineTo(-2, 0);
        c.moveTo(2, 0);
        c.lineTo(8, 0);
        c.stroke();
      } else drawJunctionGlyph(c, 0, 0);
      break;
    case "battery":
      drawBatteryGlyph(c, 0, 0, spec.charge);
      break;
    case "lamp":
      c.font = FONT;
      drawLampGlyph(c, 0, 0, spec.lit, spec.target, 30);
      break;
  }
  if (spec.faulted) drawX(c, 0, 0, 5);
  c.restore();
}
