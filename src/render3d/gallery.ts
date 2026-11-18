/**
 * The building gallery (ticket 043 B, debug only): `/?puzzle=<any>&view=3d&gallery=<pack-id>` shows every building-sized entry of one converted pack,
 * in rows on a plain ground, at WORLD_PER_METRE, each on its lot outline and turned so its declared front (BUILDING_FRONTS) faces the camera, with
 * a red arrow along that front and a caption. A new pack's door sides are settled in one look instead of by hunting through a whole town.
 *
 * Two halves. The first is pure (no three, no DOM): which entries count, their order, and where each one stands (`galleryLayout`). The second is
 * three: it places clones at those slots, frames them (its own small camera rig, same tilt and lens as the town's) and loads only that pack's GLB.
 * It is off unless the page asks for it, never a pick target, and never part of a playtest. Nothing here reads the page's address: renderer.ts
 * passes the query string in.
 */

import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Vector3,
  type Material,
  type Object3D,
  type Texture,
  type WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { AssetEntry, AssetManifest } from "../core";
import { ZOOM_STEP, type Insets, type Pan } from "../render/geometry";
import { ELEVATION, FOV_DEG } from "./camera";
import { scaleForPx } from "./captions";
import { declaredFrontDirection, frontArrow } from "./debug3d";
import {
  BUILDING_EXCLUDE,
  BUILDING_FRONTS,
  MODEL_TABLE,
  WORLD_PER_METRE,
  frontIsQuarter,
  frontYaw,
  isManifest,
  lotTypeOf,
  meshFamily,
  modelScale,
  sizeOf,
  type BuildingFront,
  type ModelChoice,
  type ModelFront,
} from "./models";
import { defaultDir, nearestTextures } from "./models3d";
import type { MapRenderer3d } from "./renderer";
import { createCaptionSprite, defaultTextSurface, type CaptionSprite, type TextSurfaceFactory } from "./text";
import { LOT_TYPES, type LotType } from "./town";

// ---- the page's flags ----

/** The pack shown when the flag has no value: `gallery=`. */
export const GALLERY_DEFAULT_PACK = "simple-town";
/** Entries on one page when the page flags say nothing: a phone screenshot of 12 captions is still readable. `&per=N` changes it. */
export const GALLERY_PAGE_SIZE = 12;

/** The pack id the query string asks for (`gallery=town-pack`), the default pack for an empty value, or null when the flag is absent. */
export function galleryRequested(search: string): string | null {
  const v = new URLSearchParams(search).get("gallery");
  if (v === null) return null;
  const id = v.trim();
  return id === "" ? GALLERY_DEFAULT_PACK : id;
}

function positiveInt(v: string | null, fallback: number): number {
  const n = v === null ? NaN : Number(v);
  return Number.isInteger(n) && n >= 1 ? n : fallback;
}

/** `&page=N` (1-based, default 1) and `&per=N` (entries per page, default GALLERY_PAGE_SIZE). */
export function galleryPageRequested(search: string): { page: number; pageSize: number } {
  const q = new URLSearchParams(search);
  return { page: positiveInt(q.get("page"), 1), pageSize: positiveInt(q.get("per"), GALLERY_PAGE_SIZE) };
}

// ---- which entries are buildings ----

/**
 * Names that are never buildings, case-insensitive prefixes: the ticket's five (roads, paths, props, environment, vehicles), and the same classes in
 * SIMPLE Town's and the POLYGON packs' own spelling (`Env_`, `Prop_`, `Vehicle_`, `ST_Veh_`, skinned characters `SK_`, scenery `SM_Generic_`).
 * A name that BUILDING_FRONTS or a MODEL_TABLE building row lists is a building whatever its prefix.
 */
export const NON_BUILDING_PREFIXES: readonly string[] = ["road_", "path_", "sm_prop_", "sm_env_", "sm_veh_", "env_", "prop_", "vehicle_", "st_veh_", "sk_", "sm_generic_"];

/** A building must be at least this wide and deep, and this high, in metres (ticket 043 B), unless a table lists it. */
export const BUILDING_MIN_FOOTPRINT_M = 4;
export const BUILDING_MIN_HEIGHT_M = 3;

/** Words that mark a modular piece rather than a whole building. A name is split at `_` and at each capital, so `GarageDoor` has `Door` and `Trailer` has no `Rail`. */
const PART_WORDS = new Set(["base", "floor", "roof", "door", "stairs", "deck", "rail", "planter", "chimney"]);

/** True when the name has a part word (Base, Floor, Roof, Door, Stairs, Deck, Rail, Planter, Chimney): such entries come after the whole-looking ones. */
export function isPartName(name: string): boolean {
  for (const seg of name.split("_")) for (const w of seg.match(/[A-Z]+(?![a-z])|[A-Z]?[a-z0-9]+/g) ?? []) if (PART_WORDS.has(w.toLowerCase())) return true;
  return false;
}

/** One building-sized entry of a pack, with everything its caption says. */
export interface GalleryEntry {
  entry: AssetEntry;
  family: string;
  /** Which of the model's axes its door faces: its BUILDING_FRONTS line, or the "+z" guess. */
  front: ModelFront;
  /** True when BUILDING_FRONTS has no line for this name (the front is the guess). */
  guessed: boolean;
  corner: false | "+x" | "-x";
  excluded: boolean;
  /** The lot type its size fits once its front is turned to the road, or null (a dashed outline). */
  lotType: LotType | null;
  /** The model's size in metres: width (x), height (y), depth (z). */
  size: readonly [number, number, number];
  /** Has a part word in its name (the family's name, so a family stays together). */
  part: boolean;
}

/**
 * The building-sized entries of `packId`, in page order: whole-looking buildings first, then modular parts; within each, by mesh family then name,
 * so the members of one family are neighbours. An entry counts when a MODEL_TABLE building row of this pack or BUILDING_FRONTS names it, or when it is at
 * least BUILDING_MIN_FOOTPRINT_M on both ground axes and BUILDING_MIN_HEIGHT_M high and its name has no NON_BUILDING_PREFIXES prefix.
 * An entry the converter marked `scale-suspect` never counts (the town's own planner skips them too). Empty when the manifest or the pack is missing.
 */
export function galleryEntries(
  manifest: AssetManifest | null,
  packId: string,
  fronts: Readonly<Record<string, BuildingFront>> = BUILDING_FRONTS,
  exclude: readonly string[] = BUILDING_EXCLUDE,
  table: readonly ModelChoice[] = MODEL_TABLE,
): GalleryEntry[] {
  const pack = manifest?.packs.find((p) => p.pack === packId);
  if (!pack) return [];
  const listed = new Set<string>(Object.keys(fronts));
  for (const row of table) if (row.slot === "building" && row.pack === packId) for (const n of row.names) listed.add(n);
  const out: GalleryEntry[] = [];
  for (const entry of pack.assets) {
    if (entry.warnings.includes("scale-suspect")) continue;
    const [w, h, d] = sizeOf(entry);
    if (![w, h, d].every((v) => Number.isFinite(v) && v >= 0)) continue;
    const lower = entry.name.toLowerCase();
    const sized = w >= BUILDING_MIN_FOOTPRINT_M && d >= BUILDING_MIN_FOOTPRINT_M && h >= BUILDING_MIN_HEIGHT_M && !NON_BUILDING_PREFIXES.some((p) => lower.startsWith(p));
    if (!listed.has(entry.name) && !sized) continue;
    const bf = Object.prototype.hasOwnProperty.call(fronts, entry.name) ? fronts[entry.name] : undefined;
    const front: ModelFront = bf?.front ?? "+z";
    const family = meshFamily(pack.assets, entry);
    out.push({
      entry,
      family,
      front,
      guessed: bf === undefined,
      corner: bf?.corner ? (bf.open ?? "+x") : false,
      excluded: exclude.includes(entry.name),
      lotType: lotTypeOf(entry, front),
      size: [w, h, d],
      part: isPartName(family),
    });
  }
  const byName = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
  return out.sort((a, b) => Number(a.part) - Number(b.part) || byName(a.family, b.family) || byName(a.entry.name, b.entry.name));
}

/** How many pages `total` entries make at `pageSize` per page (at least 1, so an empty pack still has a page to say so on). */
export function galleryPageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
}

// ---- the layout ----

/** The columns that suit a canvas of this aspect (width over height): the page is a grid, and a wide screen takes more columns. */
export function galleryColumns(aspect: number): number {
  return Math.min(5, Math.max(2, Math.round((Number.isFinite(aspect) ? aspect : 16 / 9) * 2.2)));
}

/** World units of screen height one caption line takes (the text is sized to the page, so a caption never outgrows its cell at any zoom). */
export const CAPTION_LINE_UNITS = 0.62;
/** World units of ground a caption line reserves below a front edge: a line's screen height over sin(elevation) (0.88), with a little over. */
export const CAPTION_LINE_RESERVE = 1;
/** World units a caption's character reserves across. */
export const CAPTION_CHAR_UNITS = 0.29;
/** A name's lines are wrapped (at underscores) to at most this many characters. */
export const CAPTION_WRAP = 18;
const CELL_PAD_X = 0.8;
const ROW_PAD = 0.7;
const OUTLINE_PAD = 0.2;
const TITLE_GAP = 0.4;

/** Break `name` into lines of at most `max` characters, after an underscore where it can (or mid-word when one word is longer). */
export function wrapName(name: string, max: number = CAPTION_WRAP): string[] {
  const parts = name.split("_").map((p, i, all) => (i < all.length - 1 ? `${p}_` : p));
  const lines: string[] = [];
  let cur = "";
  for (let p of parts) {
    while (p.length > max) {
      if (cur) {
        lines.push(cur);
        cur = "";
      }
      lines.push(p.slice(0, max));
      p = p.slice(max);
    }
    if (cur.length + p.length > max) {
      lines.push(cur);
      cur = p;
    } else cur += p;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Metres to one decimal, or whole when 10 or more (or when the decimal is 0). */
const m1 = (v: number): string => (v >= 10 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));

/**
 * One building's caption: its name (wrapped), its size in metres (so a whole building reads differently from a part), the lot type it fits,
 * its door side with `?` when BUILDING_FRONTS has no line for it (the "+z" guess), then which model it is a copy of, `corner, open` for a corner
 * model and `excluded` when BUILDING_EXCLUDE lists it.
 */
export function galleryCaption(g: GalleryEntry): string[] {
  const lines = wrapName(g.entry.name);
  lines.push(`${m1(g.size[0])} x ${m1(g.size[1])} x ${m1(g.size[2])} m`);
  lines.push(g.lotType ? `lot: ${g.lotType}` : "lot: none fits");
  lines.push(g.guessed ? `door: ${g.front} ?` : `door: ${g.front}`);
  if (g.family !== g.entry.name) for (const l of wrapName(`copy of ${g.family}`)) lines.push(l);
  if (g.corner !== false) lines.push(`corner, open ${g.corner}`);
  if (g.excluded) lines.push("excluded");
  return lines;
}

/** A rectangle on the ground, centre and size, world units. */
export interface GalleryRect {
  cx: number;
  cz: number;
  w: number;
  d: number;
}

export interface GallerySlot {
  name: string;
  /** Where the model's base centre stands, and the yaw that turns its declared front toward +z (the camera). */
  x: number;
  z: number;
  yaw: number;
  /** The lot type's size in world units, or null when the model fits no lot type (then `outline` is its own footprint and dashed). */
  lot: { w: number; d: number } | null;
  caption: string[];
  /** The rectangle drawn round it: the lot, or the footprint of a model that fits no lot. */
  outline: GalleryRect;
  dashed: boolean;
  /** Under the front edge, at the front edge's middle. `box` is the ground the caption reserves, so no two captions overlap. */
  captionAt: { x: number; z: number };
  box: GalleryRect;
  scale: number;
  /** Which page of the pack this slot is on, and its place in the whole pack's order. */
  page: number;
  index: number;
  entry: GalleryEntry;
}

export interface GalleryOptions {
  /** The 1-based page to lay out. Default 1. With no `pageSize` the page is the whole pack. */
  page?: number;
  /** Entries per page. Default: all of them. */
  pageSize?: number;
  /** Columns of the grid. Default 4. */
  columns?: number;
  /** Default: MODEL_TABLE. */
  table?: readonly ModelChoice[];
}

export interface GalleryLayout {
  slots: GallerySlot[];
  /** The text over the page: which pack, which page, what the arrow and `?` mean. */
  title: string[];
  titleAt: { x: number; z: number };
  /** The ground the page covers, and the tallest model on it (metres x WORLD_PER_METRE, plus the arrow). */
  bounds: GalleryBounds;
  page: number;
  pageCount: number;
  total: number;
}

export interface GalleryBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  maxY: number;
}

/** True when two rectangles share ground (touching edges do not count). */
export function galleryRectsOverlap(a: GalleryRect, b: GalleryRect, eps = 1e-9): boolean {
  return Math.abs(a.cx - b.cx) < (a.w + b.w) / 2 - eps && Math.abs(a.cz - b.cz) < (a.d + b.d) / 2 - eps;
}

/** The lines over the page. */
export function galleryTitle(packId: string, page: number, pageCount: number, first: number, last: number, total: number): string[] {
  const lines = [`${packId}: page ${page} of ${pageCount}`, `entries ${first} to ${last} of ${total}`, "red arrow = door side as declared", "? = no line yet, drawn at +z"];
  if (page < pageCount) lines.push(`&page=${page + 1} for the next page`);
  return lines;
}

/** The message when there is nothing to lay out: no manifest at all, or a pack the manifest lacks, or a pack with no building-sized entry. */
export function galleryMessage(manifest: AssetManifest | null, packId: string): string[] | null {
  if (!manifest || manifest.packs.length === 0) return ["no converted packs"];
  if (!manifest.packs.some((p) => p.pack === packId)) return [`no pack "${packId}" in the manifest`, `converted: ${manifest.packs.map((p) => p.pack).join(", ")}`];
  return null;
}

/**
 * Where every building-sized entry of the page stands (pure, deterministic). The page is a grid read left to right, top to bottom, in the order of
 * `galleryEntries`, so a family's members are neighbours. Each model stands on its lot outline (`LOT_TYPES` x WORLD_PER_METRE, its front face against
 * the lot's front edge, as in the town), turned so its declared front faces +z, toward the camera. A model that fits no lot type gets a dashed outline
 * round its own footprint. A caption hangs under each row's front edge; each column is as wide as its widest outline or caption and each row as deep
 * as its deepest outline plus its longest caption, so nothing overlaps. With no manifest or pack the slots are empty.
 */
export function galleryLayout(
  manifest: AssetManifest | null,
  packId: string,
  fronts: Readonly<Record<string, BuildingFront>> = BUILDING_FRONTS,
  exclude: readonly string[] = BUILDING_EXCLUDE,
  opts: GalleryOptions = {},
): GalleryLayout {
  const all = galleryEntries(manifest, packId, fronts, exclude, opts.table);
  const pageSize = Math.max(1, Math.floor(opts.pageSize ?? Math.max(1, all.length)));
  const pageCount = galleryPageCount(all.length, pageSize);
  const page = Math.min(Math.max(1, Math.floor(opts.page ?? 1)), pageCount);
  const columns = Math.max(1, Math.floor(opts.columns ?? 4));
  const from = (page - 1) * pageSize;
  const chosen = all.slice(from, from + pageSize);

  interface Prep {
    g: GalleryEntry;
    caption: string[];
    scale: number;
    outline: { w: number; d: number };
    footprint: { w: number; d: number };
    lot: { w: number; d: number } | null;
    capW: number;
  }
  const prep: Prep[] = chosen.map((g) => {
    const scale = modelScale(g.entry, "building");
    const quarter = frontIsQuarter(g.front);
    const [w, , d] = g.size;
    const footprint = { w: (quarter ? d : w) * scale, d: (quarter ? w : d) * scale };
    const lot = g.lotType ? { w: LOT_TYPES[g.lotType].frontage * WORLD_PER_METRE, d: LOT_TYPES[g.lotType].depth * WORLD_PER_METRE } : null;
    const caption = galleryCaption(g);
    const capW = Math.max(...caption.map((l) => l.length)) * CAPTION_CHAR_UNITS + 0.4;
    return { g, caption, scale, outline: lot ?? { w: footprint.w + 2 * OUTLINE_PAD, d: footprint.d + 2 * OUTLINE_PAD }, footprint, lot, capW };
  });

  const rows = Math.ceil(prep.length / columns);
  const colW: number[] = new Array<number>(columns).fill(0);
  const rowD: number[] = new Array<number>(rows).fill(0);
  const rowCap: number[] = new Array<number>(rows).fill(0);
  prep.forEach((p, i) => {
    const c = i % columns;
    const r = Math.floor(i / columns);
    colW[c] = Math.max(colW[c]!, p.outline.w, p.capW);
    rowD[r] = Math.max(rowD[r]!, p.outline.d);
    rowCap[r] = Math.max(rowCap[r]!, p.caption.length * CAPTION_LINE_RESERVE + 0.3);
  });
  const used = Math.min(columns, prep.length);
  const colX: number[] = [];
  let x = 0;
  for (let c = 0; c < columns; c++) {
    colX.push(x + colW[c]! / 2);
    x += colW[c]! + (c < used ? CELL_PAD_X : 0);
  }
  const width = used === 0 ? 0 : x - CELL_PAD_X;

  const titleLines = galleryTitle(packId, page, pageCount, prep.length === 0 ? 0 : from + 1, from + prep.length, all.length);
  const message = prep.length === 0 ? galleryMessage(manifest, packId) ?? [`no building-sized entries in "${packId}"`] : null;
  const title = message ?? titleLines;
  const titleD = title.length * CAPTION_LINE_RESERVE + 0.3;
  const titleW = Math.max(...title.map((l) => l.length)) * CAPTION_CHAR_UNITS + 0.4;

  const slots: GallerySlot[] = [];
  let z0 = titleD + TITLE_GAP;
  for (let r = 0; r < rows; r++) {
    const front = z0 + rowD[r]!;
    for (let c = 0; c < columns; c++) {
      const p = prep[r * columns + c];
      if (!p) break;
      const cx = colX[c]!;
      const outline: GalleryRect = { cx, cz: front - p.outline.d / 2, w: p.outline.w, d: p.outline.d };
      // A model in a lot is pushed to the lot's front edge (the town's `atFront`); one with no lot sits in the middle of its dashed outline.
      const z = p.lot ? front - p.footprint.d / 2 : outline.cz;
      const capD = p.caption.length * CAPTION_LINE_RESERVE + 0.3;
      slots.push({
        name: p.g.entry.name,
        x: cx,
        z,
        yaw: frontYaw(p.g.front),
        lot: p.lot,
        caption: p.caption,
        outline,
        dashed: p.lot === null,
        captionAt: { x: cx, z: front + 0.15 },
        box: { cx, cz: front + capD / 2, w: p.capW, d: capD },
        scale: p.scale,
        page,
        index: from + r * columns + c,
        entry: p.g,
      });
    }
    z0 = front + rowCap[r]! + ROW_PAD;
  }

  const span = Math.max(width, titleW);
  const mid = width / 2;
  const tall = Math.max(0, ...prep.map((p) => p.g.size[1] * p.scale));
  const bounds: GalleryBounds = {
    minX: mid - span / 2,
    maxX: mid + span / 2,
    minZ: 0,
    maxZ: Math.max(z0 - ROW_PAD, titleD),
    maxY: tall + 1.2,
  };
  return { slots, title, titleAt: { x: mid, z: 0 }, bounds, page, pageCount, total: all.length };
}

// ---- outlines ----

/** The strip width of a lot outline, world units: wide enough to read in a small screenshot. */
export const OUTLINE_STRIP = 0.09;
const DASH = 0.55;
const DASH_GAP = 0.35;

/** An outline's flat strips as rectangles `[x0, z0, x1, z1]` about its centre: four solid sides, or the same sides cut into dashes. */
export function outlineStrips(w: number, d: number, dashed: boolean, strip: number = OUTLINE_STRIP): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  const hw = w / 2;
  const hd = d / 2;
  const side = (x0: number, z0: number, x1: number, z1: number): void => {
    const horizontal = z0 === z1;
    const len = horizontal ? x1 - x0 : z1 - z0;
    const pieces: [number, number][] = [];
    if (!dashed) pieces.push([0, len]);
    else {
      const n = Math.max(1, Math.round((len + DASH_GAP) / (DASH + DASH_GAP)));
      const dash = (len - (n - 1) * DASH_GAP) / n;
      for (let k = 0; k < n; k++) pieces.push([k * (dash + DASH_GAP), k * (dash + DASH_GAP) + dash]);
    }
    for (const [a, b] of pieces) {
      out.push(horizontal ? [x0 + a, z0 - strip / 2, x0 + b, z0 + strip / 2] : [x0 - strip / 2, z0 + a, x0 + strip / 2, z0 + b]);
    }
  };
  side(-hw, -hd, hw, -hd);
  side(-hw, hd, hw, hd);
  side(-hw, -hd, -hw, hd);
  side(hw, -hd, hw, hd);
  return out;
}

// ---- the camera ----

const SIN_E = Math.sin(ELEVATION);
const COS_E = Math.cos(ELEVATION);
const TAN_HALF = Math.tan((FOV_DEG * Math.PI) / 360);
const FIT_PAD_FRACTION = 0.04;

export interface GalleryRig {
  camera: PerspectiveCamera;
  resize(width: number, height: number, insets?: Insets): void;
  /** A new page: reframe on these bounds. */
  setBounds(bounds: GalleryBounds): void;
  getPan(): Pan;
  setPan(x: number, y: number): Pan;
  resetView(): void;
  getScale(): number;
  zoomStep(dir: 1 | -1): number;
  centreOn(x: number, z: number): Pan;
  /** Pixels per world unit at the point looked at. */
  pxPerUnit(): number;
}

/** The town's tilt and lens (camera.ts), framing the gallery's bounds: the closest dolly at which the whole page, the tallest model's top included, is on screen. */
export function createGalleryRig(initial: GalleryBounds, width = 1280, height = 720, startInsets?: Insets): GalleryRig {
  const camera = new PerspectiveCamera(FOV_DEG, width / height, 0.1, 2000);
  const size = { width, height };
  let insets: Insets = { ...(startInsets ?? {}) };
  let b = initial;
  let tx = 0;
  let tz = 0;
  let dist = 20;
  let fitDist = 20;
  const target = new Vector3();
  const probe = new Vector3();
  const scale = (): number => size.height / 2 / (TAN_HALF * dist);

  function apply(): void {
    target.set(tx, 0, tz);
    camera.position.set(tx, dist * SIN_E, tz + dist * COS_E);
    camera.lookAt(target);
    camera.aspect = size.width / size.height;
    const shift = ((insets.top ?? 0) - (insets.bottom ?? 0)) / 2;
    const side = ((insets.left ?? 0) - (insets.right ?? 0)) / 2;
    camera.setViewOffset(size.width, size.height, -side, -shift, size.width, size.height);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  }
  function fits(): boolean {
    const freeW = size.width - (insets.left ?? 0) - (insets.right ?? 0);
    const freeH = size.height - (insets.top ?? 0) - (insets.bottom ?? 0);
    const left = (insets.left ?? 0) + freeW * FIT_PAD_FRACTION;
    const right = size.width - (insets.right ?? 0) - freeW * FIT_PAD_FRACTION;
    const top = (insets.top ?? 0) + freeH * FIT_PAD_FRACTION;
    const bottom = size.height - (insets.bottom ?? 0) - freeH * FIT_PAD_FRACTION;
    for (const x of [b.minX, b.maxX]) {
      for (const z of [b.minZ, b.maxZ]) {
        for (const y of [0, b.maxY]) {
          probe.set(x, y, z).project(camera);
          const px = ((probe.x + 1) / 2) * size.width;
          const py = ((1 - probe.y) / 2) * size.height;
          if (px < left || px > right || py < top || py > bottom) return false;
        }
      }
    }
    return true;
  }
  function fit(): void {
    tx = (b.minX + b.maxX) / 2;
    tz = (b.minZ + b.maxZ) / 2;
    let lo = 3;
    let hi = 1500;
    for (let i = 0; i < 32; i++) {
      dist = (lo + hi) / 2;
      apply();
      if (fits()) hi = dist;
      else lo = dist;
    }
    dist = hi;
    fitDist = hi;
    apply();
  }
  const baseX = (): number => (b.minX + b.maxX) / 2;
  const baseZ = (): number => (b.minZ + b.maxZ) / 2;
  const clampT = (): void => {
    tx = Math.min(Math.max(tx, b.minX), b.maxX);
    tz = Math.min(Math.max(tz, b.minZ), b.maxZ);
  };
  const getPan = (): Pan => ({ x: -(tx - baseX()) * scale(), y: -(tz - baseZ()) * scale() * SIN_E });
  fit();
  return {
    camera,
    resize(w, h, next) {
      size.width = Math.max(w, 1);
      size.height = Math.max(h, 1);
      if (next) insets = { ...next };
      fit();
    },
    setBounds(next) {
      b = next;
      fit();
    },
    getPan,
    setPan(x, y) {
      const s = scale();
      tx = baseX() - x / s;
      tz = baseZ() - y / (s * SIN_E);
      clampT();
      apply();
      return getPan();
    },
    resetView: fit,
    getScale: scale,
    zoomStep(dir) {
      const next = dir === 1 ? dist / ZOOM_STEP : dist * ZOOM_STEP;
      dist = Math.min(Math.max(next, fitDist * 0.25), fitDist * 1.5);
      apply();
      return scale();
    },
    centreOn(x, z) {
      tx = x;
      tz = z;
      clampT();
      apply();
      return getPan();
    },
    pxPerUnit: scale,
  };
}

// ---- the scene ----

export const GALLERY_FONT_PX = 28;
/** Pixels per world unit at a point `depth` in front of the camera, on a canvas `heightPx` tall (the town camera's lens). */
export function captionPx(heightPx: number, depth: number): number {
  return heightPx / 2 / (TAN_HALF * depth);
}
const BACKGROUND = 0x2b3240;
const GROUND = 0x4b5466;
const OUTLINE_SOLID = 0xeef1f7;
const OUTLINE_DASHED = 0xffc247;
const ARROW_LENGTH = 1.7;
const ARROW_HEAD_LENGTH = 0.6;
const ARROW_HEAD_WIDTH = 0.5;

export interface GalleryScene {
  scene: Scene;
  /** One wrapper per slot, in slot order: the clone's group (empty when the model is not in the GLB). */
  models: Group[];
  /** Size the captions to the page: call after every change of zoom or canvas, with the camera and the canvas height in css px. */
  setViewport(camera: PerspectiveCamera, heightPx: number): void;
  dispose(): void;
}

/** Finds a model's root node by name, or undefined. */
export type ModelLookup = (name: string) => Object3D | undefined;

function noRay(root: Object3D): void {
  root.traverse((o) => {
    o.raycast = () => {};
  });
}

const flatGeometry = (rects: readonly (readonly [number, number, number, number])[], cx: number, cz: number, y: number): BufferGeometry => {
  const pos = new Float32Array(rects.length * 18);
  rects.forEach(([x0, z0, x1, z1], i) => {
    const v = [x0, z0, x1, z0, x1, z1, x0, z0, x1, z1, x0, z1];
    for (let k = 0; k < 6; k++) {
      pos[i * 18 + k * 3] = cx + v[k * 2]!;
      pos[i * 18 + k * 3 + 1] = y;
      pos[i * 18 + k * 3 + 2] = cz + v[k * 2 + 1]!;
    }
  });
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  return g;
};

/**
 * The gallery's scene: a plain ground, lights, and for every slot its lot outline, its model (a clone from `lookup`, turned and scaled as the town does),
 * a red arrow along its declared front and its caption. Nothing in it can be raycast. `lookup` may be null (the GLB is missing): outlines, arrows and
 * captions still show, so the layout can be read.
 */
export function buildGalleryScene(layout: GalleryLayout, lookup: ModelLookup | null, opts: { surface?: TextSurfaceFactory; dpr?: number } = {}): GalleryScene {
  const surface = opts.surface ?? defaultTextSurface;
  const dpr = opts.dpr ?? 1;
  const scene = new Scene();
  scene.name = "gallery";
  scene.background = new Color(BACKGROUND);
  scene.add(new AmbientLight(0xffffff, 1.4));
  const sun = new DirectionalLight(0xffffff, 2.2);
  sun.position.set(-8, 16, 18);
  scene.add(sun);

  const owned: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(o: T): T => {
    owned.push(o);
    return o;
  };

  const { bounds } = layout;
  const pad = 6;
  const ground = new Mesh(
    own(new PlaneGeometry(bounds.maxX - bounds.minX + 2 * pad, bounds.maxZ - bounds.minZ + 2 * pad)),
    own(new MeshStandardMaterial({ color: GROUND, roughness: 1, metalness: 0 })),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((bounds.minX + bounds.maxX) / 2, -0.01, (bounds.minZ + bounds.maxZ) / 2);
  ground.name = "gallery-ground";
  scene.add(ground);

  const solid = own(new MeshBasicMaterial({ color: OUTLINE_SOLID, side: DoubleSide }));
  const dashed = own(new MeshBasicMaterial({ color: OUTLINE_DASHED, side: DoubleSide }));
  const sprites: CaptionSprite[] = [];
  const anchors: [number, number, number][] = [];
  const probe = new Vector3();
  const captionOf = (lines: readonly string[], x: number, z: number, anchorY: 0 | 1): void => {
    const cs = createCaptionSprite(surface, GALLERY_FONT_PX, dpr, false, anchorY);
    cs.draw(lines, "text");
    cs.sprite.position.set(x, 0.02, z);
    own(cs.sprite.material);
    sprites.push(cs);
    anchors.push([x, 0.02, z]);
    scene.add(cs.sprite);
  };
  // The title hangs below its anchor, like each caption.
  captionOf(layout.title, layout.titleAt.x, layout.titleAt.z, 1);

  const models: Group[] = [];
  for (const s of layout.slots) {
    const o = new Mesh(own(flatGeometry(outlineStrips(s.outline.w, s.outline.d, s.dashed), s.outline.cx, s.outline.cz, 0.02)), s.dashed ? dashed : solid);
    o.name = `outline:${s.name}`;
    scene.add(o);

    const wrap = new Group();
    wrap.name = `model:${s.name}`;
    wrap.position.set(s.x, 0, s.z);
    wrap.rotation.y = s.yaw;
    wrap.scale.setScalar(s.scale);
    const root = lookup?.(s.name);
    if (root) wrap.add(root.clone(true));
    scene.add(wrap);
    models.push(wrap);

    const top = s.entry.size[1] * s.scale;
    const [dx, dz] = declaredFrontDirection(s.entry.front, s.yaw);
    const arrow = frontArrow(s.x, top + 0.05, s.z, dx, dz, ARROW_LENGTH, ARROW_HEAD_LENGTH, ARROW_HEAD_WIDTH);
    arrow.userData["model"] = s.name;
    own(arrow);
    scene.add(arrow);

    captionOf(s.caption, s.captionAt.x, s.captionAt.z, 1);
  }
  noRay(scene);

  const lineH = Math.round(GALLERY_FONT_PX * 1.3);
  return {
    scene,
    models,
    setViewport(camera, heightPx) {
      // A caption line is CAPTION_LINE_UNITS tall on screen at its own depth (the same perspective as the ground it sits on), so the text grows and
      // shrinks with the page and never outgrows its cell, near rows or far.
      camera.updateMatrixWorld(true);
      sprites.forEach((c, i) => {
        const at = anchors[i]!;
        const depth = Math.max(0.1, -probe.set(at[0], at[1], at[2]).applyMatrix4(camera.matrixWorldInverse).z);
        c.setUnit(scaleForPx((captionPx(heightPx, depth) * CAPTION_LINE_UNITS) / lineH, heightPx, FOV_DEG));
      });
    },
    dispose() {
      for (const o of owned) o.dispose();
      for (const c of sprites) c.sprite.material.map?.dispose();
      owned.length = 0;
    },
  };
}

// ---- loading only this pack ----

export interface GalleryLoadDeps {
  /** Resolves to the parsed JSON, and rejects on a network error, a non-OK status or a body that is not JSON. */
  fetchJson(url: string): Promise<unknown>;
  /** Resolves to the GLB's scene, and rejects if it cannot be fetched or parsed. */
  loadGlb(url: string): Promise<Object3D>;
  /** Folder of the manifest, ending in "/". Default: where the converter writes. */
  dir?: string;
  /** Where the one line saying why something is missing goes. Default: console.info. */
  info?: (message: string) => void;
}

export interface GalleryPack {
  /** Null when there is no readable manifest. */
  manifest: AssetManifest | null;
  /** Null when the pack, or its GLB, is not there. */
  root: Object3D | null;
}

const describe = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * The manifest, and the GLB of `packId` alone (never another pack's: the town pack's is 110 MB). Anything missing costs one console.info line and
 * resolves to what there is; it never rejects and never logs an error.
 */
export async function loadGalleryPack(packId: string, deps: GalleryLoadDeps): Promise<GalleryPack> {
  const info = deps.info ?? ((m: string) => console.info(m));
  const dir = deps.dir ?? defaultDir();
  try {
    let manifest: unknown;
    try {
      manifest = await deps.fetchJson(`${dir}manifest.json`);
    } catch (e) {
      info(`3D gallery: no manifest at ${dir}manifest.json (${describe(e)}).`);
      return { manifest: null, root: null };
    }
    if (!isManifest(manifest)) {
      info("3D gallery: the asset manifest is not the version this build reads.");
      return { manifest: null, root: null };
    }
    const pack = manifest.packs.find((p) => p.pack === packId);
    if (!pack) {
      info(`3D gallery: no pack "${packId}" in the manifest (it has ${manifest.packs.map((p) => p.pack).join(", ") || "none"}).`);
      return { manifest, root: null };
    }
    try {
      const root = await deps.loadGlb(`${dir}${pack.glb}`);
      nearestTextures(root);
      return { manifest, root };
    } catch (e) {
      info(`3D gallery: could not load ${pack.glb} (${describe(e)}); showing outlines and captions only.`);
      return { manifest, root: null };
    }
  } catch (e) {
    info(`3D gallery: ${describe(e)}.`);
    return { manifest: null, root: null };
  }
}

/** The real fetch and GLTFLoader. */
export function defaultGalleryDeps(): GalleryLoadDeps {
  return {
    fetchJson: async (url) => {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as unknown;
    },
    loadGlb: async (url) => (await new GLTFLoader().loadAsync(url)).scene,
  };
}

function freeModel(root: Object3D): void {
  root.traverse((o) => {
    const mesh = o as { geometry?: { dispose(): void }; material?: Material | Material[] };
    mesh.geometry?.dispose();
    for (const m of mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : []) {
      for (const v of Object.values(m)) if (v && (v as Texture).isTexture) (v as Texture).dispose();
      m.dispose();
    }
  });
}

// ---- the renderer ----

export interface GalleryRendererOptions {
  insets?: Insets | undefined;
  dpr: number;
  /** The page's query string; renderer.ts reads the address and passes it in. */
  search: string;
  deps?: GalleryLoadDeps;
}

/**
 * The 3D view's gallery mode: the same interface as the town's renderer, so play and ui are unchanged. Draws the gallery page instead of the puzzle;
 * the state, hover and Relight it is handed are ignored; nothing can be picked. Pan and zoom work on the page.
 */
export function createGalleryRenderer3d(gl: WebGLRenderer, canvas: HTMLCanvasElement, packId: string, opts: GalleryRendererOptions): MapRenderer3d {
  const w0 = Math.max(canvas.clientWidth, 1);
  const h0 = Math.max(canvas.clientHeight, 1);
  const { page, pageSize } = galleryPageRequested(opts.search);
  const columns = galleryColumns(w0 / h0);
  let insets: Insets = { ...(opts.insets ?? {}) };
  const empty: GalleryBounds = { minX: 0, maxX: 12, minZ: 0, maxZ: 6, maxY: 1 };
  const rig = createGalleryRig(empty, w0, h0, insets);
  let current: GalleryScene = buildGalleryScene(
    { slots: [], title: [`loading ${packId} ...`], titleAt: { x: 6, z: 0 }, bounds: empty, page: 1, pageCount: 1, total: 0 },
    null,
    { dpr: opts.dpr },
  );
  let loaded: GalleryPack | null = null;
  let disposed = false;

  const sizeCaptions = (): void => current.setViewport(rig.camera, Math.max(canvas.clientHeight, 1));
  function resize(): void {
    const w = Math.max(canvas.clientWidth, 1);
    const h = Math.max(canvas.clientHeight, 1);
    gl.setPixelRatio(opts.dpr);
    gl.setSize(w, h, false);
    rig.resize(w, h, insets);
    sizeCaptions();
  }
  resize();

  void loadGalleryPack(packId, opts.deps ?? defaultGalleryDeps())
    .then((pack) => {
      if (disposed) {
        if (pack.root) freeModel(pack.root);
        return;
      }
      loaded = pack;
      const layout = galleryLayout(pack.manifest, packId, BUILDING_FRONTS, BUILDING_EXCLUDE, { page, pageSize, columns });
      const root = pack.root;
      const next = buildGalleryScene(layout, root ? (name) => root.getObjectByName(name) ?? undefined : null, { dpr: opts.dpr });
      current.dispose();
      current = next;
      rig.setBounds(layout.bounds);
      sizeCaptions();
    })
    .catch((e: unknown) => console.info(`3D gallery: ${describe(e)}.`));

  return {
    draw() {
      gl.render(current.scene, rig.camera);
    },
    hitTest: () => null,
    resize,
    setInsets(next) {
      insets = { ...next };
      rig.resize(Math.max(canvas.clientWidth, 1), Math.max(canvas.clientHeight, 1), insets);
      sizeCaptions();
    },
    notify() {},
    setBlockers() {},
    placeAt: () => null,
    getPan: () => rig.getPan(),
    setPan: (x, y) => rig.setPan(x, y),
    resetView() {
      rig.resetView();
      sizeCaptions();
    },
    getScale: () => rig.getScale(),
    zoomStep(dir) {
      const s = rig.zoomStep(dir);
      sizeCaptions();
      return s;
    },
    fitWhole() {
      rig.resetView();
      sizeCaptions();
    },
    centreOn: () => rig.getPan(),
    dispose() {
      disposed = true;
      current.dispose();
      if (loaded?.root) freeModel(loaded.root);
    },
  };
}
