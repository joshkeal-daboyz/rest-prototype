/**
 * Camera-facing text for the 3D view (ticket 037 B): a Sprite with a CanvasTexture, fixed pixel size at any dolly
 * (sizeAttenuation off), drawn over the scene. The surface is injected so tests run in Node with no DOM. Kept for the tile sheet's labels (ticket 081 A2c).
 */

import { CanvasTexture, LinearFilter, Sprite, SpriteMaterial } from "three";
/** Caption tones. (Moved here from the deleted captions.ts, ticket 081 A2c: the tile sheet's labels use them.) */
export type CaptionTone = "text" | "dim" | "alarm";

export type TextSurfaceFactory = () => HTMLCanvasElement;

const TEXT = "#d3dae6";
const TEXT_DIM = "#7b879a";
const ALARM = "#ff5a4d";
const OUTLINE = "rgba(11,15,23,0.9)";
const FONT = "system-ui, sans-serif";

const toneColour = (tone: CaptionTone): string => (tone === "alarm" ? ALARM : tone === "dim" ? TEXT_DIM : TEXT);

/**
 * The texture to draw into. A GPU texture is allocated once at its first size and cannot be resized, so a caption whose text
 * changes size (`ON` to `OFF`, `using 3 of 4` to `! using 6 of 4 !`) gets a new texture; the old one is freed. Same size: reuse.
 */
function freshTexture(sprite: Sprite, canvas: HTMLCanvasElement, old: CanvasTexture | null, resized: boolean): CanvasTexture {
  if (old && !resized) return old;
  old?.dispose();
  const t = new CanvasTexture(canvas);
  t.minFilter = LinearFilter;
  t.magFilter = LinearFilter;
  t.generateMipmaps = false;
  const m = sprite.material;
  m.map = t;
  m.needsUpdate = true;
  return t;
}

/** A surface that draws nothing, with a fixed text width: for Node (no document) and for tests. */
export function stubTextSurface(): HTMLCanvasElement {
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (t, k) => (k === "measureText" ? (s: string) => ({ width: s.length * 8 }) : k in t ? t[k as string] : () => undefined),
    set: (t, k, v) => {
      t[k as string] = v;
      return true;
    },
  });
  return { width: 0, height: 0, getContext: () => ctx } as unknown as HTMLCanvasElement;
}

/** The browser's surface; in Node (no document) the stub. */
export function defaultTextSurface(): HTMLCanvasElement {
  return typeof document !== "undefined" ? document.createElement("canvas") : stubTextSurface();
}

export interface CaptionSprite {
  sprite: Sprite;
  /** Redraw the words. Call only when they change. */
  draw(lines: readonly string[], tone: CaptionTone): void;
  /** Set the css-px-to-scale factor (from the viewport) and resize the sprite to its text. */
  setUnit(unit: number): void;
}

/** `bold` for the feed. `anchorY` 0 puts the text above the anchor, 1 below it. */
export function createCaptionSprite(surface: TextSurfaceFactory, fontPx: number, dpr: number, bold: boolean, anchorY: number): CaptionSprite {
  const canvas = surface();
  const sprite = new Sprite(new SpriteMaterial({ map: null, transparent: true, depthTest: false, depthWrite: false, sizeAttenuation: false }));
  let texture: CanvasTexture | null = null;
  let texW = -1;
  let texH = -1;
  sprite.center.set(0.5, anchorY);
  sprite.renderOrder = 10;
  let cssW = 1;
  let cssH = 1;
  let unit = 0.001;
  const lineH = Math.round(fontPx * 1.3);
  const apply = (): void => {
    sprite.scale.set(cssW * unit, cssH * unit, 1);
  };
  sprite.userData["fontPx"] = fontPx;
  return {
    sprite,
    draw(lines, tone) {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.font = `${bold ? "bold " : ""}${fontPx}px ${FONT}`;
      let w = 0;
      for (const l of lines) w = Math.max(w, ctx.measureText(l).width);
      cssW = Math.ceil(w) + 8;
      cssH = lines.length * lineH + 6;
      canvas.width = Math.ceil(cssW * dpr);
      canvas.height = Math.ceil(cssH * dpr);
      texture = freshTexture(sprite, canvas, texture, canvas.width !== texW || canvas.height !== texH);
      texW = canvas.width;
      texH = canvas.height;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `${bold ? "bold " : ""}${fontPx}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.strokeStyle = OUTLINE;
      ctx.fillStyle = toneColour(tone);
      lines.forEach((l, i) => {
        const y = 3 + lineH * (i + 0.5);
        ctx.strokeText(l, cssW / 2, y);
        ctx.fillText(l, cssW / 2, y);
      });
      texture.needsUpdate = true;
      sprite.userData["text"] = lines.join("\n");
      sprite.userData["tone"] = tone;
      sprite.userData["cssW"] = cssW;
      sprite.userData["cssH"] = cssH;
      apply();
    },
    setUnit(u) {
      unit = u;
      apply();
    },
  };
}
