/**
 * The city plan's flat picture on screen (ticket 070, section A2). `?city=plan&stage=<name or 1 to 8>&blocks=WxD&seed=N` runs the pipeline up to that stage and draws the stage's
 * `CityPicture` as coloured cells on a 2D canvas, fitted to the window, with its legend under it. Dev builds only, like the gallery (renderer.ts routes it behind `import.meta.env.DEV`).
 *
 * The plan is drawn here, never decided: this file reads what `src/city/` produced. When a stage fails it draws the last good layer's picture under a banner naming the stage, the seed and
 * the reason. An unknown stage lists the stages that are built. Josh looks at it on his phone: the text is sized from the canvas width (never under 14 CSS px), the picture takes the
 * whole width, and the legend wraps under it.
 */

import { CITY_STAGES, type CityPicture, type CityPlanRun, type CityPlanStage } from "../core";
import { BUILT_STAGES, runCity } from "../city/pipeline";
import { CITY_BLOCKS_MAX, PLAN_BLOCKS_DEFAULT, TILE_M } from "../city/streets";
import type { MapRenderer3d } from "./renderer";

// ---- the page's flags ----

export interface PlanViewRequest {
  blocksX: number;
  blocksZ: number;
  seed: number;
  /** The stage asked for, or null when `stage` is not a plan stage (the viewer then lists the built ones). */
  stage: CityPlanStage | null;
  /** What `stage` said, as typed (empty when absent). */
  stageText: string;
}

/** The plan stages, in order: `CITY_STAGES` without "assemble". Stage numbers 1 to 8 index this list. */
const PLAN_STAGES: readonly CityPlanStage[] = CITY_STAGES.filter((s): s is CityPlanStage => s !== "assemble");

/** True exactly when the page draws the plan view: a dev build, `view=3d` and a `city=plan` request. Then the puzzle HUD is hidden. Pure. */
export function planHidesHud(search: string, dev: boolean): boolean {
  return dev && new URLSearchParams(search).get("view") === "3d" && planViewRequested(search) !== null;
}

/** The names of the stages that are built, in order. */
export const builtStageNames = (): string[] => BUILT_STAGES.map((s) => s.name);

/**
 * What the page asks of the plan view, or null when it does not ask: `city=plan`, `stage` (a name, or 1 to 8 for the stages in order; absent means the last stage built), `blocks=WxD` (each clamped to
 * 1..CITY_BLOCKS_MAX; anything else is the default 6 x 6) and `seed=N` (an integer; anything else is 1), read as `cityTilesRequested` reads them. Pure.
 */
export function planViewRequested(search: string): PlanViewRequest | null {
  const q = new URLSearchParams(search);
  if (q.get("city") !== "plan") return null;
  let blocksX = PLAN_BLOCKS_DEFAULT;
  let blocksZ = PLAN_BLOCKS_DEFAULT;
  const m = /^(\d+)x(\d+)$/i.exec((q.get("blocks") ?? "").trim());
  if (m) {
    const clamp = (v: number): number => Math.min(CITY_BLOCKS_MAX, Math.max(1, v));
    blocksX = clamp(Number.parseInt(m[1]!, 10));
    blocksZ = clamp(Number.parseInt(m[2]!, 10));
  }
  const seedText = (q.get("seed") ?? "").trim();
  const seed = /^-?\d+$/.test(seedText) ? Number.parseInt(seedText, 10) : 1;
  const stageText = (q.get("stage") ?? "").trim();
  let stage: CityPlanStage | null;
  if (stageText === "") stage = BUILT_STAGES[BUILT_STAGES.length - 1]!.name;
  else if (/^\d+$/.test(stageText)) stage = PLAN_STAGES[Number.parseInt(stageText, 10) - 1] ?? null;
  else stage = PLAN_STAGES.find((s) => s === stageText.toLowerCase()) ?? null;
  return { blocksX, blocksZ, seed: Number.isSafeInteger(seed) ? seed : 1, stage, stageText };
}

// ---- the picture as pixels ----

export interface PictureRgba {
  width: number;
  height: number;
  /** RGBA, row-major, 4 bytes a pixel: what `ImageData` takes. */
  data: Uint8ClampedArray;
}

/**
 * The picture as pixels: each lattice cell is a `scale` x `scale` square of its legend colour, and each point is a small square (a third of a cell, at least one pixel) of its legend colour
 * centred on its place (`x_m`, `z_m` over `TILE_M` cells). An index outside the legend is magenta so a broken picture is seen. Pure.
 */
export function pictureToRgba(picture: CityPicture, scale: number): PictureRgba {
  const s = Math.max(1, Math.floor(scale));
  const width = picture.w * s;
  const height = picture.h * s;
  const data = new Uint8ClampedArray(width * height * 4);
  const put = (x: number, y: number, rgb: number): void => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const o = (y * width + x) * 4;
    data[o] = (rgb >> 16) & 0xff;
    data[o + 1] = (rgb >> 8) & 0xff;
    data[o + 2] = rgb & 0xff;
    data[o + 3] = 255;
  };
  const colour = (index: number): number => picture.legend[index]?.rgb ?? 0xff00ff;
  for (let j = 0; j < picture.h; j++) {
    for (let i = 0; i < picture.w; i++) {
      const rgb = colour(picture.cells[j * picture.w + i] ?? -1);
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) put(i * s + x, j * s + y, rgb);
    }
  }
  const dot = Math.max(1, Math.floor(s / 3));
  for (const p of picture.points) {
    const rgb = colour(p.legend);
    const x0 = Math.round((p.x_m / TILE_M) * s - dot / 2);
    const y0 = Math.round((p.z_m / TILE_M) * s - dot / 2);
    for (let y = 0; y < dot; y++) for (let x = 0; x < dot; x++) put(x0 + x, y0 + y, rgb);
  }
  return { width, height, data };
}

/** Breaks `text` into lines of at most `max` characters at spaces (a word longer than `max` is split). Pure. */
export function wrapLines(text: string, max: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter((w) => w !== "")) {
    let w = word;
    while (w.length > max) {
      if (line !== "") {
        out.push(line);
        line = "";
      }
      out.push(w.slice(0, max));
      w = w.slice(max);
    }
    if (line === "") line = w;
    else if (line.length + 1 + w.length <= max) line += ` ${w}`;
    else {
      out.push(line);
      line = w;
    }
  }
  if (line !== "") out.push(line);
  return out;
}

// ---- what to show ----

export interface PlanShown {
  /** The picture to draw, or null when there is none (an unknown stage, or the first stage failed). */
  picture: CityPicture | null;
  /** The banner's text, or null when all is well. */
  banner: string | null;
  /** The header line over the picture. */
  title: string;
}

/** The picture of the last layer a run holds (a stage that failed leaves the ones before it), or null. */
export function lastGoodPicture(run: CityPlanRun): CityPicture | null {
  for (let k = BUILT_STAGES.length - 1; k >= 0; k--) {
    const stage = BUILT_STAGES[k]!;
    if (run.plan.layers[stage.name] !== undefined) return stage.picture(run.plan);
  }
  return null;
}

/** What the request shows: the stage's picture, or the last good layer under a banner (stage, seed and reason), or the list of built stages for an unknown or unbuilt one. Runs the pipeline; no canvas. */
export function planShown(req: PlanViewRequest): PlanShown {
  const built = builtStageNames();
  const where = `${req.blocksX}x${req.blocksZ} seed ${req.seed}`;
  const unknown = (what: string): PlanShown => ({ picture: null, banner: `${what}. Built stages: ${built.join(", ")}.`, title: `city plan ${where}` });
  if (req.stage === null) return unknown(`Unknown stage "${req.stageText}"`);
  if (!built.includes(req.stage)) return unknown(`Stage "${req.stage}" is not built yet`);
  let run: CityPlanRun;
  try {
    run = runCity({ blocksX: req.blocksX, blocksZ: req.blocksZ, seed: req.seed }, req.stage);
  } catch (e) {
    return unknown(e instanceof Error ? e.message : String(e));
  }
  if (run.ok) return { picture: BUILT_STAGES.find((s) => s.name === req.stage)!.picture(run.plan), banner: null, title: `${req.stage} - ${where}` };
  const f = run.failure;
  return {
    picture: lastGoodPicture(run),
    banner: `Stage ${f.stage} failed (seed ${f.seed}, ${f.blocksX}x${f.blocksZ}): ${f.reason}`,
    title: `${f.stage} failed - showing ${lastGoodPicture(run)?.stage ?? "nothing"}`,
  };
}

// ---- the canvas ----

const BG = "#14161a";
const INK = "#e6e3da";
const BANNER_BG = "#8a1f1f";

export interface PlanRendererOptions {
  dpr?: number;
}

/**
 * The plan view as a `MapRenderer3d` the page can hold in place of the map (it draws nothing of the puzzle). It takes a canvas that has no WebGL context yet: renderer.ts routes here first. It draws on
 * a 2D context, once, and again when the canvas changes size.
 */
export function createPlanRenderer3d(canvas: HTMLCanvasElement, req: PlanViewRequest, opts: PlanRendererOptions = {}): MapRenderer3d {
  const dpr = opts.dpr ?? 1;
  const shown = planShown(req);
  const ctx = canvas.getContext("2d");
  let drawnW = -1;
  let drawnH = -1;

  function paint(): void {
    const cssW = Math.max(canvas.clientWidth, 1);
    const cssH = Math.max(canvas.clientHeight, 1);
    drawnW = cssW;
    drawnH = cssH;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, cssW, cssH);
    const pad = 12;
    const font = Math.max(14, Math.min(20, Math.round(cssW / 28)));
    const lineH = Math.round(font * 1.35);
    const maxChars = Math.max(12, Math.floor((cssW - 2 * pad) / (font * 0.55)));
    ctx.textBaseline = "top";
    ctx.font = `${font}px sans-serif`;
    let y = pad;
    ctx.fillStyle = INK;
    for (const line of wrapLines(shown.title, maxChars)) {
      ctx.fillText(line, pad, y);
      y += lineH;
    }
    y += 4;
    if (shown.banner !== null) {
      const lines = wrapLines(shown.banner, maxChars);
      const h = lines.length * lineH + 8;
      ctx.fillStyle = BANNER_BG;
      ctx.fillRect(pad / 2, y, cssW - pad, h);
      ctx.fillStyle = "#ffffff";
      lines.forEach((line, k) => ctx.fillText(line, pad, y + 4 + k * lineH));
      y += h + 8;
    }
    const pic = shown.picture;
    if (!pic) return;
    // The legend under the picture: swatch and name, in as many columns as fit.
    const colW = Math.max(120, Math.round(font * 9));
    const cols = Math.max(1, Math.floor((cssW - 2 * pad) / colW));
    const legendRows = Math.ceil(pic.legend.length / cols);
    const legendH = legendRows * lineH + 4;
    const availW = cssW - 2 * pad;
    const availH = Math.max(1, cssH - y - legendH - pad);
    const scale = Math.max(1, Math.floor(Math.min((availW * dpr) / pic.w, (availH * dpr) / pic.h)));
    const px = pictureToRgba(pic, scale);
    const img = new ImageData(px.data as unknown as Uint8ClampedArray<ArrayBuffer>, px.width, px.height);
    const x0 = Math.round(pad + (availW - px.width / dpr) / 2);
    const tmp = document.createElement("canvas");
    tmp.width = px.width;
    tmp.height = px.height;
    tmp.getContext("2d")?.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, x0, y, px.width / dpr, px.height / dpr);
    const ly = y + px.height / dpr + 8;
    ctx.font = `${font}px sans-serif`;
    pic.legend.forEach((entry, k) => {
      const cx = pad + (k % cols) * colW;
      const cy = ly + Math.floor(k / cols) * lineH;
      ctx.fillStyle = `#${entry.rgb.toString(16).padStart(6, "0")}`;
      ctx.fillRect(cx, cy + 2, font, font);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.strokeRect(cx + 0.5, cy + 2.5, font - 1, font - 1);
      ctx.fillStyle = INK;
      ctx.fillText(entry.name, cx + font + 6, cy);
    });
  }

  paint();
  return {
    draw() {
      if (canvas.clientWidth !== drawnW || canvas.clientHeight !== drawnH) paint();
    },
    hitTest: () => null,
    resize: paint,
    setInsets() {},
    notify() {},
    setBlockers() {},
    placeAt: () => null,
    getPan: () => ({ x: 0, y: 0 }),
    setPan: () => ({ x: 0, y: 0 }),
    resetView() {},
    getScale: () => 1,
    zoomStep: () => 1,
    fitWhole() {},
    centreOn: () => ({ x: 0, y: 0 }),
    dispose() {},
  };
}
