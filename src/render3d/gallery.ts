/**
 * The building gallery (ticket 043 B, debug only): `/?puzzle=<any>&view=3d&gallery=<pack-id>` shows every building-sized entry of one converted pack
 * in ONE straight line along x, at WORLD_PER_METRE. Each model stands four times side by side, one copy turned so each of its four sides ("+z", "+x",
 * "-z", "-x") faces the camera, captioned `door: f`. The copy whose real door faces the camera is that model's true front: Josh names it per model
 * (for example "Preset_03: -x") and that becomes its BUILDING_FRONTS line (keyed `pack:name`; ticket 045 saves the choice to disk). The copy that matches the table now is marked `current` and has a green
 * outline; a name with no line yet keeps its `?` (the "+z" guess).
 *
 * Two halves. The first is pure (no three, no DOM): which entries count, their order, and where each copy stands (`galleryLayout`). The second is
 * three: it places clones at those slots, frames the first few groups on a low, straight-on camera (its own small rig: 15 degrees up, the town's
 * lens, pan along the row only) and loads only that pack's GLB. It is off unless the page asks for it, never a pick target, and never part of a
 * playtest. Nothing here reads the page's address: renderer.ts passes the query string in.
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
import {
  CALIBRATION_ENDPOINT,
  applyCalibrationPatch,
  calibrationKey,
  parseCalibrationKey,
  validateCalibration,
  type AssetEntry,
  type AssetManifest,
  type CalibrationFile,
  type CalibrationKey,
  type CalibrationPatch,
} from "../core";
import { ZOOM_STEP, type Insets, type Pan } from "../render/geometry";
import { FOV_DEG } from "./camera";
import { effectiveFronts, loadSavedCalibration } from "./calibration";
import { scaleForPx } from "./captions";
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
  type FrontTable,
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

/** The pack id the query string asks for (`gallery=town-pack`), the default pack for an empty value, or null when the flag is absent. */
export function galleryRequested(search: string): string | null {
  const v = new URLSearchParams(search).get("gallery");
  if (v === null) return null;
  const id = v.trim();
  return id === "" ? GALLERY_DEFAULT_PACK : id;
}

function positiveInt(v: string | null): number | null {
  const n = v === null ? NaN : Number(v);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

/**
 * `&page=N` (1-based, default 1) and `&per=N` (models per page). With no `per` the whole pack is one page (`pageSize` null): the gallery is one
 * line you scroll along, and paging is only there for a pack too big to build in one go.
 */
export function galleryPageRequested(search: string): { page: number; pageSize: number | null } {
  const q = new URLSearchParams(search);
  return { page: positiveInt(q.get("page")) ?? 1, pageSize: positiveInt(q.get("per")) };
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
  /** `pack:name`, the key of this model in the front tables and the saved file. */
  key: CalibrationKey;
  family: string;
  /** Which of the model's axes its door faces now: its BUILDING_FRONTS line (or the saved file's), or the "+z" guess. */
  front: ModelFront;
  /** True when no table has a line for this pack:name (the front is the guess). */
  guessed: boolean;
  /** True when the saved calibration file (ticket 045) gave the front. */
  saved: boolean;
  /** True when the saved file has any entry for this model (a front, an exclusion, or both): it counts in the title's "N of M marked". */
  marked: boolean;
  /** True when the saved file itself (not the code's table) excludes this model: what a click keeps and Shift+click toggles. */
  savedExclude: boolean;
  corner: false | "+x" | "-x";
  excluded: boolean;
  /** The lot type its size fits once its current front is turned to the road, or null (a dashed outline). */
  lotType: LotType | null;
  /** The model's size in metres: width (x), height (y), depth (z). */
  size: readonly [number, number, number];
  /** Has a part word in its name (the family's name, so a family stays together). */
  part: boolean;
}

/**
 * The building-sized entries of `packId`, in line order: whole-looking buildings first, then modular parts; within each, by mesh family then name,
 * so the members of one family are neighbours. An entry counts when a MODEL_TABLE building row of this pack or BUILDING_FRONTS names it, or when it is at
 * least BUILDING_MIN_FOOTPRINT_M on both ground axes and BUILDING_MIN_HEIGHT_M high and its name has no NON_BUILDING_PREFIXES prefix.
 * An entry the converter marked `scale-suspect` never counts (the town's own planner skips them too). Empty when the manifest or the pack is missing.
 */
export function galleryEntries(
  manifest: AssetManifest | null,
  packId: string,
  fronts: FrontTable = BUILDING_FRONTS,
  exclude: readonly CalibrationKey[] = BUILDING_EXCLUDE,
  table: readonly ModelChoice[] = MODEL_TABLE,
  saved: CalibrationFile | null = null,
): GalleryEntry[] {
  const pack = manifest?.packs.find((p) => p.pack === packId);
  if (!pack) return [];
  const listed = new Set<string>();
  for (const key of Object.keys(fronts)) {
    const parsed = parseCalibrationKey(key);
    if (parsed && parsed.pack === packId) listed.add(parsed.name);
  }
  for (const row of table) if (row.slot === "building" && row.pack === packId) for (const n of row.names) listed.add(n);
  const out: GalleryEntry[] = [];
  for (const entry of pack.assets) {
    if (entry.warnings.includes("scale-suspect")) continue;
    const [w, h, d] = sizeOf(entry);
    if (![w, h, d].every((v) => Number.isFinite(v) && v >= 0)) continue;
    const lower = entry.name.toLowerCase();
    const sized = w >= BUILDING_MIN_FOOTPRINT_M && d >= BUILDING_MIN_FOOTPRINT_M && h >= BUILDING_MIN_HEIGHT_M && !NON_BUILDING_PREFIXES.some((p) => lower.startsWith(p));
    if (!listed.has(entry.name) && !sized) continue;
    const key = calibrationKey(packId, entry.name);
    const bf = Object.prototype.hasOwnProperty.call(fronts, key) ? fronts[key as CalibrationKey] : undefined;
    const front: ModelFront = bf?.front ?? "+z";
    const mark = saved && Object.prototype.hasOwnProperty.call(saved.entries, key) ? saved.entries[key] : undefined;
    const family = meshFamily(pack.assets, entry);
    out.push({
      entry,
      key,
      family,
      front,
      guessed: bf === undefined,
      saved: mark?.front !== undefined,
      marked: mark !== undefined,
      savedExclude: mark?.exclude === true,
      corner: bf?.corner ? (bf.open ?? "+x") : false,
      excluded: exclude.includes(key),
      lotType: lotTypeOf(entry, front),
      size: [w, h, d],
      part: isPartName(family),
    });
  }
  const byName = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
  return out.sort((a, b) => Number(a.part) - Number(b.part) || byName(a.family, b.family) || byName(a.entry.name, b.entry.name));
}

/** How many pages `total` models make at `pageSize` per page (at least 1, so an empty pack still has a page to say so on). */
export function galleryPageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
}

// ---- the layout: one line of groups, four copies to a group ----

/** The four copies of every model, in the order they stand, left to right. Each is turned by `frontYaw(f)` so its own side `f` faces the camera. */
export const GALLERY_FRONTS: readonly ModelFront[] = ["+z", "+x", "-z", "-x"];

/** World units of screen height one caption line takes, for a copy's caption and for a group's (larger) caption and the title. */
export const COPY_LINE_UNITS = 0.8;
export const GROUP_LINE_UNITS = 1.1;
/** World units one character reserves across, in the same two sizes (a little over what the font needs). */
export const COPY_CHAR_UNITS = 0.38;
export const GROUP_CHAR_UNITS = 0.52;
/** A name's lines are wrapped (at underscores) to at most this many characters. */
export const CAPTION_WRAP = 18;
/** Ground between two copies of one model, and between two models. The second is larger, so the groups read as groups. */
export const COPY_GAP = 0.8;
export const GROUP_GAP = 4;
const CAPTION_PAD = 0.5;
const OUTLINE_PAD = 0.2;
/** Lines under every copy: `door: f`, and `current` on the one the table has. */
const COPY_CAPTION_LINES = 2;

/** The camera's elevation: low, so facades and doors are seen, not roofs. */
export const GALLERY_ELEVATION_DEG = 15;
const ELEVATION = (GALLERY_ELEVATION_DEG * Math.PI) / 180;
const SIN_E = Math.sin(ELEVATION);
const COS_E = Math.cos(ELEVATION);
const TAN_HALF = Math.tan((FOV_DEG * Math.PI) / 360);

/** How far under the ground line (world y, negative) a group's caption hangs: just under its copies' two-line captions as the camera sees them. */
export const GROUP_CAPTION_DROP = -((COPY_CAPTION_LINES + 0.2) * COPY_LINE_UNITS + 0.35) / COS_E;
/** A caption stands a little in front of the front edge of the lots. */
const CAPTION_Z = 0.3;

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
 * The caption written once for a model's whole group: its name (wrapped), its size in metres (so a whole building reads differently from a part),
 * the lot type it fits with its current front, which model it is a copy of, `corner, open` for a corner model and `excluded` when BUILDING_EXCLUDE or the saved file excludes it.
 */
export function galleryGroupCaption(g: GalleryEntry): string[] {
  const lines = wrapName(g.entry.name);
  lines.push(`${m1(g.size[0])} x ${m1(g.size[1])} x ${m1(g.size[2])} m`);
  lines.push(g.lotType ? `lot: ${g.lotType}` : "lot: none fits");
  if (g.family !== g.entry.name) for (const l of wrapName(`copy of ${g.family}`)) lines.push(l);
  if (g.corner !== false) lines.push(`corner, open ${g.corner}`);
  if (g.excluded) lines.push("excluded");
  return lines;
}

/**
 * One copy's caption: `door: f`, then on the copy whose front is in force now where that front came from: `current` (the code's table),
 * `current, saved` (the saved file, ticket 045) or `current ?` (no line anywhere: only the "+z" guess). A guess wins over `saved`.
 */
export function galleryCopyCaption(front: ModelFront, current: boolean, guessed: boolean, saved = false): string[] {
  return current ? [`door: ${front}`, guessed ? "current ?" : saved ? "current, saved" : "current"] : [`door: ${front}`];
}

/** A rectangle on the ground, centre and size, world units. */
export interface GalleryRect {
  cx: number;
  cz: number;
  w: number;
  d: number;
}

/** Where a caption hangs: x and z on the ground line, y up (negative: under the ground line). */
export interface GalleryAnchor {
  x: number;
  y: number;
  z: number;
}

/** One copy of a model, turned so its side `front` faces the camera. */
export interface GallerySlot {
  name: string;
  /** The model's own side this copy shows the camera. */
  front: ModelFront;
  /** True on the copy whose `front` is the table's front now (or the "+z" guess when the table has no line). */
  current: boolean;
  /** Where the model's base centre stands, and the yaw (frontYaw(front)) that turns its side `front` toward +z, the camera. */
  x: number;
  z: number;
  yaw: number;
  /** The lot type's size in world units for this turning, or null when the model fits no lot type (then `outline` is its own footprint and dashed). */
  lot: { w: number; d: number } | null;
  caption: string[];
  /** The rectangle drawn round it: the lot, or the footprint of a model that fits no lot. */
  outline: GalleryRect;
  dashed: boolean;
  captionAt: GalleryAnchor;
  /** The ground this copy owns across the line: its outline and its caption both sit inside `cell`'s x range. */
  cell: GalleryRect;
  /** The width its caption takes across, world units. */
  captionW: number;
  scale: number;
  /** The model's place in the pack's order, and this copy's place in the whole line (4 to a model). */
  group: number;
  index: number;
  entry: GalleryEntry;
}

/** The four copies of one model, with the one caption that names it. */
export interface GalleryGroup {
  name: string;
  entry: GalleryEntry;
  /** Place in the pack's order (not the page's). */
  index: number;
  page: number;
  /** The ground it owns: across x from `cx - w / 2`, the width between its neighbours' gaps. */
  box: GalleryRect;
  caption: string[];
  captionAt: GalleryAnchor;
  captionW: number;
  slots: GallerySlot[];
}

/** A box in the world: x along the line, y up, z toward the camera. */
export interface GalleryBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

/** What the camera needs: the whole line, and the box round the first one, two and three groups (`screens`), from which it picks the first screen. */
export interface GalleryView {
  world: GalleryBounds;
  screens: GalleryBounds[];
}

export interface GalleryOptions {
  /** The 1-based page to lay out. Default 1. With no `pageSize` the page is the whole pack. */
  page?: number;
  /** Models per page. Default: all of them. */
  pageSize?: number;
  /** Default: MODEL_TABLE. */
  table?: readonly ModelChoice[];
  /** The saved calibration file the tables were merged with (ticket 045); it tells the captions which front came from it. Default: none. */
  saved?: CalibrationFile | null;
  /** A change that could not be written (ticket 045 C): the title and that model's group caption say `not saved: <reason>`. */
  notSaved?: { key: CalibrationKey; reason: string } | null;
}

export interface GalleryLayout {
  groups: GalleryGroup[];
  /** Every copy, group by group, four to a group, in line order. */
  slots: GallerySlot[];
  /** The text over the line's start: which pack, what the marks mean. */
  title: string[];
  titleAt: GalleryAnchor;
  titleW: number;
  view: GalleryView;
  page: number;
  pageCount: number;
  total: number;
}

/** True when two rectangles share ground (touching edges do not count). */
export function galleryRectsOverlap(a: GalleryRect, b: GalleryRect, eps = 1e-9): boolean {
  return Math.abs(a.cx - b.cx) < (a.w + b.w) / 2 - eps && Math.abs(a.cz - b.cz) < (a.d + b.d) / 2 - eps;
}

/** The click help line (ticket 045 C). */
export const GALLERY_HELP = "click a copy: its door faces you; shift-click: exclude; Delete: clear";

const clip = (text: string, max: number): string => (text.length <= max ? text : `${text.slice(0, max - 3)}...`);

/** `text` cut into lines of at most `max` characters at spaces (a word longer than `max` is cut). */
function wrapWords(text: string, max: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (let word of text.split(" ")) {
    while (word.length > max) {
      if (cur) lines.push(cur);
      cur = "";
      lines.push(word.slice(0, max));
      word = word.slice(max);
    }
    if (cur && cur.length + 1 + word.length > max) {
      lines.push(cur);
      cur = word;
    } else cur = cur ? `${cur} ${word}` : word;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** The lines over the line's start. */
export function galleryTitle(packId: string, page: number, pageCount: number, first: number, last: number, total: number, marked = 0, notSaved: string | null = null): string[] {
  const lines = [pageCount > 1 ? `${packId}: ${first} to ${last} of ${total} (page ${page} of ${pageCount})` : `${packId}: ${total} models, four sides each`];
  lines.push(`${marked} of ${total} marked`);
  if (notSaved !== null) lines.push(clip(`not saved: ${notSaved}`, 70));
  lines.push("door: f = that side of the model faces you", "current = the front now (saved = from your file); ? = no line yet", GALLERY_HELP, "drag or arrows to move, Home and End to jump");
  if (page < pageCount) lines.push(`&page=${page + 1} for the next page`);
  return lines;
}

/** The message when there is nothing to lay out: no manifest at all, or a pack the manifest lacks. */
export function galleryMessage(manifest: AssetManifest | null, packId: string): string[] | null {
  if (!manifest || manifest.packs.length === 0) return ["no converted packs"];
  if (!manifest.packs.some((p) => p.pack === packId)) return [`no pack "${packId}" in the manifest`, `converted: ${manifest.packs.map((p) => p.pack).join(", ")}`];
  return null;
}

const widest = (lines: readonly string[]): number => Math.max(0, ...lines.map((l) => l.length));

/**
 * Where every copy stands (pure, deterministic). All the models of the page are in one line along x, in the order of `galleryEntries`, so a family's
 * members are neighbours. Each model is four copies side by side in the order +z, +x, -z, -x, copy `f` turned by `frontYaw(f)` so its side `f` faces
 * +z, the camera. Each copy stands on the lot outline its size fits when that side is the front (`LOT_TYPES` x WORLD_PER_METRE, its front face on the
 * lot's front edge at z = 0, as in the town), or in a dashed outline round its footprint when none fits. A copy's cell is as wide as its outline or
 * its caption, a group as wide as its four cells and gaps or its own caption, and groups are GROUP_GAP apart, copies COPY_GAP, so nothing overlaps.
 * With no manifest or pack the groups are empty and the title says why.
 */
export function galleryLayout(
  manifest: AssetManifest | null,
  packId: string,
  fronts: FrontTable = BUILDING_FRONTS,
  exclude: readonly CalibrationKey[] = BUILDING_EXCLUDE,
  opts: GalleryOptions = {},
): GalleryLayout {
  const all = galleryEntries(manifest, packId, fronts, exclude, opts.table, opts.saved ?? null);
  const pageSize = Math.max(1, Math.floor(opts.pageSize ?? Math.max(1, all.length)));
  const pageCount = galleryPageCount(all.length, pageSize);
  const page = Math.min(Math.max(1, Math.floor(opts.page ?? 1)), pageCount);
  const from = (page - 1) * pageSize;
  const chosen = all.slice(from, from + pageSize);

  const groups: GalleryGroup[] = [];
  const slots: GallerySlot[] = [];
  let x = 0;
  let deepest = 0;
  let tallest = 0;
  let groupLines = 0;
  chosen.forEach((g, k) => {
    const scale = modelScale(g.entry, "building");
    const [w, h, d] = g.size;
    const groupCaption = galleryGroupCaption(g);
    if (opts.notSaved && opts.notSaved.key === g.key) groupCaption.push(...wrapWords(`not saved: ${clip(opts.notSaved.reason, 60)}`, CAPTION_WRAP));
    const groupCapW = widest(groupCaption) * GROUP_CHAR_UNITS + CAPTION_PAD;
    interface Copy {
      front: ModelFront;
      lot: { w: number; d: number } | null;
      outline: { w: number; d: number };
      footprint: { w: number; d: number };
      caption: string[];
      capW: number;
      cellW: number;
    }
    const copies: Copy[] = GALLERY_FRONTS.map((front) => {
      const quarter = frontIsQuarter(front);
      const footprint = { w: (quarter ? d : w) * scale, d: (quarter ? w : d) * scale };
      const type = lotTypeOf(g.entry, front);
      const lot = type ? { w: LOT_TYPES[type].frontage * WORLD_PER_METRE, d: LOT_TYPES[type].depth * WORLD_PER_METRE } : null;
      const outline = lot ?? { w: footprint.w + 2 * OUTLINE_PAD, d: footprint.d + 2 * OUTLINE_PAD };
      const caption = galleryCopyCaption(front, front === g.front, g.guessed, g.saved);
      const capW = widest(caption) * COPY_CHAR_UNITS + CAPTION_PAD;
      return { front, lot, outline, footprint, caption, capW, cellW: Math.max(outline.w, capW) };
    });
    const inner = copies.reduce((s, c) => s + c.cellW, 0) + COPY_GAP * (copies.length - 1);
    const width = Math.max(inner, groupCapW);
    const cx = x + width / 2;
    let cursor = x + (width - inner) / 2;
    const own: GallerySlot[] = [];
    copies.forEach((c, i) => {
      const sx = cursor + c.cellW / 2;
      cursor += c.cellW + COPY_GAP;
      const outline: GalleryRect = { cx: sx, cz: -c.outline.d / 2, w: c.outline.w, d: c.outline.d };
      // A model in a lot is pushed to the lot's front edge (the town's `atFront`); one with no lot sits in the middle of its dashed outline.
      const z = c.lot ? -c.footprint.d / 2 : outline.cz;
      own.push({
        name: g.entry.name,
        front: c.front,
        current: c.front === g.front,
        x: sx,
        z,
        yaw: frontYaw(c.front),
        lot: c.lot,
        caption: c.caption,
        outline,
        dashed: c.lot === null,
        captionAt: { x: sx, y: 0, z: CAPTION_Z },
        cell: { cx: sx, cz: outline.cz, w: c.cellW, d: c.outline.d },
        captionW: c.capW,
        scale,
        group: from + k,
        index: (from + k) * GALLERY_FRONTS.length + i,
        entry: g,
      });
      deepest = Math.max(deepest, c.outline.d);
    });
    slots.push(...own);
    groups.push({
      name: g.entry.name,
      entry: g,
      index: from + k,
      page,
      box: { cx, cz: -Math.max(...copies.map((c) => c.outline.d)) / 2, w: width, d: Math.max(...copies.map((c) => c.outline.d)) },
      caption: groupCaption,
      captionAt: { x: cx, y: GROUP_CAPTION_DROP, z: CAPTION_Z },
      captionW: groupCapW,
      slots: own,
    });
    tallest = Math.max(tallest, h * scale);
    groupLines = Math.max(groupLines, groupCaption.length);
    x += width + GROUP_GAP;
  });

  const message = groups.length === 0 ? galleryMessage(manifest, packId) ?? [`no building-sized entries in "${packId}"`] : null;
  const title = message ?? galleryTitle(packId, page, pageCount, from + 1, from + groups.length, all.length, all.filter((g) => g.marked).length, opts.notSaved?.reason ?? null);
  const titleW = widest(title) * COPY_CHAR_UNITS + CAPTION_PAD;
  const titleH = (title.length + 0.2) * COPY_LINE_UNITS;
  const lineEnd = groups.length === 0 ? 0 : x - GROUP_GAP;

  /** The box round groups `i0` to `i1` (exclusive), their captions and, when asked, the title above them. */
  const around = (i0: number, i1: number): GalleryBounds => {
    const gs = groups.slice(i0, i1);
    if (gs.length === 0) return { minX: 0, maxX: titleW, minY: -0.5, maxY: 0.5 + titleH, minZ: -1, maxZ: CAPTION_Z };
    const top = Math.max(...gs.map((g) => g.entry.size[1] * g.slots[0]!.scale));
    return {
      minX: gs[0]!.box.cx - gs[0]!.box.w / 2,
      maxX: gs[gs.length - 1]!.box.cx + gs[gs.length - 1]!.box.w / 2,
      minY: GROUP_CAPTION_DROP - (Math.max(...gs.map((g) => g.caption.length)) + 0.2) * GROUP_LINE_UNITS / COS_E,
      maxY: top + 0.6 + titleH,
      minZ: -Math.max(...gs.map((g) => g.box.d)),
      maxZ: CAPTION_Z,
    };
  };
  const titleY = Math.max(0, ...groups.slice(0, 3).map((g) => g.entry.size[1] * g.slots[0]!.scale)) + 0.6;
  const world: GalleryBounds = {
    ...around(0, groups.length),
    minX: 0,
    maxX: Math.max(lineEnd, titleW),
    minY: groups.length === 0 ? -0.5 : GROUP_CAPTION_DROP - (groupLines + 0.2) * GROUP_LINE_UNITS / COS_E,
    maxY: Math.max(tallest, titleY) + (groups.length === 0 ? titleH : titleH + 0.2),
    minZ: -Math.max(deepest, 1),
  };
  return {
    groups,
    slots,
    title,
    titleAt: { x: titleW / 2, y: groups.length === 0 ? 0.5 : titleY, z: 0 },
    titleW,
    view: { world, screens: [around(0, 1), around(0, 2), around(0, 3)] },
    page,
    pageCount,
    total: all.length,
  };
}

// ---- outlines ----

/** The strip width of a lot outline, world units: wide enough to read in a small screenshot. The `current` copy's is thicker. */
export const OUTLINE_STRIP = 0.09;
export const OUTLINE_STRIP_CURRENT = 0.16;
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

const FIT_PAD_FRACTION = 0.04;
/** The first screen shows at least this many pixels per world unit across (a copy's caption line then reads about 14 px tall in an 800 px screenshot and a group's about 17; the fit pad and the nearer captions take about 15 percent), unless the first group alone is wider. */
export const MIN_PX_PER_UNIT = 20;
/** How far the wheel zooms in and out from the first screen's framing. */
const ZOOM_IN_LIMIT = 0.25;
const ZOOM_OUT_LIMIT = 6;

export interface GalleryRig {
  camera: PerspectiveCamera;
  resize(width: number, height: number, insets?: Insets): void;
  /** A new line: reframe on these bounds. */
  setView(view: GalleryView): void;
  /** The same line with a few captions changed (a click): keeps the pan and zoom, only re-clamping the pan to the new line's ends. */
  updateView(view: GalleryView): void;
  getPan(): Pan;
  /** Moves along the line only: `y` is ignored. */
  setPan(x: number, y: number): Pan;
  /** Back to the first screen (the start of the line). */
  resetView(): void;
  getScale(): number;
  zoomStep(dir: 1 | -1): number;
  /** Look at this x along the line, clamped to the line. */
  centreOn(x: number): Pan;
  /** Jump so the line's end is at the right edge of the screen. */
  jumpToEnd(): Pan;
  /** Pixels per world unit at the point looked at. */
  pxPerUnit(): number;
  /** The x range the screen shows at the looked-at depth. */
  visibleX(): readonly [number, number];
}

/**
 * A low camera looking along -z at the line: the town's lens, GALLERY_ELEVATION_DEG up. On load it frames the first screen (up to three whole groups, as
 * wide as MIN_PX_PER_UNIT allows, but at least the whole first group); it pans along x only, within the line, and zooms about the looked-at point.
 */
export function createGalleryRig(initial: GalleryView, width = 1280, height = 720, startInsets?: Insets): GalleryRig {
  const camera = new PerspectiveCamera(FOV_DEG, width / height, 0.1, 4000);
  const size = { width, height };
  let insets: Insets = { ...(startInsets ?? {}) };
  let v = initial;
  let tx = 0;
  let dist = 20;
  let fitDist = 20;
  let baseX = 0;
  let frame: GalleryBounds = initial.screens[0]!;
  const target = new Vector3();
  const probe = new Vector3();
  const scale = (): number => size.height / 2 / (TAN_HALF * dist);
  const midY = (): number => (frame.minY + frame.maxY) / 2;
  const midZ = (): number => (frame.minZ + frame.maxZ) / 2;

  function apply(): void {
    target.set(tx, midY(), midZ());
    camera.position.set(tx, midY() + dist * SIN_E, midZ() + dist * COS_E);
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
    for (const x of [frame.minX, frame.maxX]) {
      for (const z of [frame.minZ, frame.maxZ]) {
        for (const y of [frame.minY, frame.maxY]) {
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
    const freeW = size.width - (insets.left ?? 0) - (insets.right ?? 0);
    // As many whole groups (up to three) as read at MIN_PX_PER_UNIT, but never less than the whole first group.
    let pick = v.screens[0]!;
    for (const s of v.screens) if (s.maxX - s.minX <= freeW / MIN_PX_PER_UNIT) pick = s;
    frame = pick;
    baseX = (frame.minX + frame.maxX) / 2;
    tx = baseX;
    let lo = 1;
    let hi = 4000;
    for (let i = 0; i < 36; i++) {
      dist = (lo + hi) / 2;
      apply();
      if (fits()) hi = dist;
      else lo = dist;
    }
    dist = hi;
    fitDist = hi;
    apply();
  }
  /** The camera's x stays between the line's start and the point that puts its end at the right of the first screen's width. */
  const limits = (): readonly [number, number] => {
    const half = baseX - v.world.minX;
    return [baseX, Math.max(baseX, v.world.maxX - half)];
  };
  const clampT = (): void => {
    const [lo, hi] = limits();
    tx = Math.min(Math.max(tx, lo), hi);
  };
  const getPan = (): Pan => ({ x: -(tx - baseX) * scale(), y: 0 });
  fit();
  return {
    camera,
    resize(w, h, next) {
      size.width = Math.max(w, 1);
      size.height = Math.max(h, 1);
      if (next) insets = { ...next };
      fit();
    },
    setView(next) {
      v = next;
      fit();
    },
    updateView(next) {
      v = next;
      clampT();
      apply();
    },
    getPan,
    setPan(x) {
      tx = baseX - x / scale();
      clampT();
      apply();
      return getPan();
    },
    resetView: fit,
    getScale: scale,
    zoomStep(dir) {
      const next = dir === 1 ? dist / ZOOM_STEP : dist * ZOOM_STEP;
      dist = Math.min(Math.max(next, fitDist * ZOOM_IN_LIMIT), fitDist * ZOOM_OUT_LIMIT);
      apply();
      return scale();
    },
    centreOn(x) {
      tx = x;
      clampT();
      apply();
      return getPan();
    },
    jumpToEnd() {
      tx = limits()[1];
      apply();
      return getPan();
    },
    pxPerUnit: scale,
    visibleX() {
      const half = (size.width / scale() / 2) * 1;
      return [tx - half, tx + half];
    },
  };
}

// ---- clicking a copy (ticket 045 C, dev only) ----

/** A press and release this close (css px) is a click; further is a pan. */
export const CLICK_SLOP_PX = 5;

/** True when a left press and its release are within CLICK_SLOP_PX of each other. Pure. */
export function isGalleryClick(down: { x: number; y: number }, up: { x: number; y: number }): boolean {
  return Math.hypot(up.x - down.x, up.y - down.y) <= CLICK_SLOP_PX;
}

/** A hit reaches this far above a model's top, world units, so a click just over its roof counts. */
const HIT_ABOVE_TOP = 0.5;

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

const rayOrigin = new Vector3();
const rayDir = new Vector3();

/**
 * The ray from the camera through a point of the screen, `ndcX` and `ndcY` in -1..1 (y up), by three's own unprojection: no WebGL, no scene raycast.
 * The two vectors returned are reused by the next call.
 */
export function galleryRayAt(camera: PerspectiveCamera, ndcX: number, ndcY: number): { origin: Vector3; dir: Vector3 } {
  camera.updateMatrixWorld();
  rayOrigin.setFromMatrixPosition(camera.matrixWorld);
  rayDir.set(ndcX, ndcY, 0.5).unproject(camera).sub(rayOrigin).normalize();
  return { origin: rayOrigin, dir: rayDir };
}

/** Where a ray meets the plane `axis` = `value` (axis "y" for the ground), or null when it is parallel or the plane is behind the origin. */
function planePoint(origin: Vec3, dir: Vec3, axis: "y" | "z", value: number): Vec3 | null {
  const d = dir[axis];
  if (Math.abs(d) < 1e-12) return null;
  const t = (value - origin[axis]) / d;
  return t > 0 ? { x: origin.x + dir.x * t, y: origin.y + dir.y * t, z: origin.z + dir.z * t } : null;
}

/**
 * Which copy a ray points at, or null (pure). The scene stays unraycastable; this is the gallery's own test, made on the layout. A copy is hit by a
 * ray that, inside its cell's x range, meets any of: the vertical plane through the middle of its outline (z = `outline.cz`) from the ground up to the
 * model's top plus HIT_ABOVE_TOP; the vertical plane of its caption (z = CAPTION_Z) from the ground down to the foot of the group caption's line; or the
 * floor of its outline. So a click on the model, on its `door: f` caption or on its lot counts; the gaps between copies and between groups hit nothing.
 */
export function galleryHitAt(layout: GalleryLayout, origin: Vec3, dir: Vec3): GallerySlot | null {
  const ground = planePoint(origin, dir, "y", 0);
  const caption = planePoint(origin, dir, "z", CAPTION_Z);
  for (const s of layout.slots) {
    const lo = s.cell.cx - s.cell.w / 2;
    const hi = s.cell.cx + s.cell.w / 2;
    if (ground && ground.x >= lo && ground.x <= hi && Math.abs(ground.z - s.outline.cz) <= s.outline.d / 2) return s;
    if (caption && caption.x >= lo && caption.x <= hi && caption.y <= 0 && caption.y >= GROUP_CAPTION_DROP) return s;
    const body = planePoint(origin, dir, "z", s.outline.cz);
    if (body && body.x >= lo && body.x <= hi && body.y >= 0 && body.y <= s.entry.size[1] * s.scale + HIT_ABOVE_TOP) return s;
  }
  return null;
}

export type GalleryGesture = "click" | "shift-click" | "delete";

/**
 * The patch a gesture makes, or null when it changes nothing (pure). `slot` is the copy under the pointer (null for Delete).
 * - click: the model's `front` is the copy's side; `exclude` stays as the saved file has it. Clicking another copy is the undo. Clicking the copy
 *   that is already `current, saved` does nothing; clicking the `current` copy whose front is only the code's or the guess saves it (a confirmation),
 *   so a `current ?` can be settled without choosing another side first.
 * - shift-click: the front is the copy's side and `exclude` is toggled.
 * - delete: the model's entry is cleared, so the code's table applies again; nothing to do when the file has no entry for it.
 * `exclude` toggles on the saved file's own flag; an exclusion the code's table makes cannot be undone from here (the table's is empty).
 */
export function galleryAction(entry: GalleryEntry, slot: GallerySlot | null, gesture: GalleryGesture): CalibrationPatch | null {
  if (gesture === "delete") return entry.marked ? { key: entry.key, entry: null } : null;
  if (!slot || slot.name !== entry.entry.name) return null;
  if (gesture === "click") {
    if (slot.current && entry.saved) return null;
    return { key: entry.key, entry: { front: slot.front, ...(entry.savedExclude ? { exclude: true as const } : {}) } };
  }
  return { key: entry.key, entry: { front: slot.front, ...(entry.savedExclude ? {} : { exclude: true as const }) } };
}

// ---- saving: a queue to the dev endpoint ----

export interface SaveDeps {
  /** POSTs `body` as JSON to `url`; resolves to the parsed reply, rejects on a network error, a non-OK status or a body that is not JSON. */
  postJson(url: string, body: unknown): Promise<unknown>;
  /** The clock for the optimistic copy's `at` stamps. Default: the real one. */
  now?: () => Date;
}

export type SaveResult = { ok: true; file: CalibrationFile } | { ok: false; reason: string };

/** Posts one patch to CALIBRATION_ENDPOINT. Never throws: a failure of any kind is `{ ok: false, reason }`, and a reply that is not a calibration file counts as one. */
export async function saveCalibrationPatch(patch: CalibrationPatch, deps: SaveDeps): Promise<SaveResult> {
  let reply: unknown;
  try {
    reply = await deps.postJson(CALIBRATION_ENDPOINT, patch);
  } catch (e) {
    return { ok: false, reason: describe(e) };
  }
  const checked = validateCalibration(reply);
  return checked.ok ? { ok: true, file: checked.file } : { ok: false, reason: "the dev server's reply is not a calibration file" };
}

export type SaverEvent = "queued" | "saved" | "failed";

export interface CalibrationSaver {
  /** Queues a patch. It shows at once in `file()`; the queue posts it after the ones before it. */
  enqueue(patch: CalibrationPatch): void;
  /** What the gallery shows: the server's last copy with every patch not yet written laid over it. */
  file(): CalibrationFile | null;
  /** The patch at the head of the queue that the server did not take, with why; cleared by the next success. */
  failure(): { key: CalibrationKey; reason: string } | null;
  /** How many patches are not yet written (the failed one included). */
  pending(): number;
  /** Resolves when the queue has stopped: empty, or stopped at a failure. */
  idle(): Promise<void>;
}

/**
 * The gallery's writer. Patches are posted one at a time in click order, so two quick clicks cannot land out of order; the server's reply to each
 * replaces the gallery's copy of the file. A patch the server refuses stays at the head: nothing is lost, the mark stays shown (the patches not yet
 * written are laid over the last reply), `failure()` says why, and the next `enqueue` retries it first. Nothing throws.
 */
export function createCalibrationSaver(initial: CalibrationFile | null, deps: SaveDeps, onChange: (event: SaverEvent) => void = () => {}): CalibrationSaver {
  const now = deps.now ?? (() => new Date());
  let confirmed = initial;
  const queue: { patch: CalibrationPatch; at: Date }[] = [];
  let failed: { key: CalibrationKey; reason: string } | null = null;
  let running: Promise<void> | null = null;

  async function drain(): Promise<void> {
    while (queue.length > 0) {
      const head = queue[0]!;
      const result = await saveCalibrationPatch(head.patch, deps);
      if (!result.ok) {
        failed = { key: head.patch.key, reason: result.reason };
        onChange("failed");
        return;
      }
      queue.shift();
      confirmed = result.file;
      failed = null;
      onChange("saved");
    }
  }

  return {
    enqueue(patch) {
      queue.push({ patch, at: now() });
      onChange("queued");
      if (!running) {
        running = drain().finally(() => {
          running = null;
        });
      }
    },
    file: () => queue.reduce<CalibrationFile | null>((f, q) => applyCalibrationPatch(f, q.patch, q.at), confirmed),
    failure: () => failed,
    pending: () => queue.length,
    idle: async () => {
      while (running) await running;
    },
  };
}

export interface GalleryEditor {
  /** A click at a ray (Shift held or not): queues the patch for the copy it hits. True when a patch was queued. */
  click(origin: Vec3, dir: Vec3, shift: boolean): boolean;
  /** Delete: queues the clearing of the last-clicked model's entry. True when a patch was queued. */
  clear(): boolean;
  /** The key of the model last clicked, or null. */
  last(): CalibrationKey | null;
}

/** Joins the hit test, the actions and the saver: what the pointer and the Delete key do. `layout()` must be the layout on screen now. */
export function createGalleryEditor(layout: () => GalleryLayout, saver: CalibrationSaver): GalleryEditor {
  let last: CalibrationKey | null = null;
  return {
    click(origin, dir, shift) {
      const slot = galleryHitAt(layout(), origin, dir);
      if (!slot) return false;
      last = slot.entry.key;
      const patch = galleryAction(slot.entry, slot, shift ? "shift-click" : "click");
      if (!patch) return false;
      saver.enqueue(patch);
      return true;
    },
    clear() {
      const entry = last === null ? undefined : layout().groups.find((g) => g.entry.key === last)?.entry;
      const patch = entry ? galleryAction(entry, null, "delete") : null;
      if (!patch) return false;
      saver.enqueue(patch);
      return true;
    },
    last: () => last,
  };
}

/** The real POST: JSON in, JSON out; a non-OK status rejects with the server's first error when it sent some. */
export async function defaultPostJson(url: string, body: unknown): Promise<unknown> {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const text = await r.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(r.ok ? "the dev server sent no JSON (is it `npm run dev`?)" : `HTTP ${r.status}`);
  }
  if (!r.ok) {
    const errors = (json as { errors?: unknown } | null)?.errors;
    throw new Error(`HTTP ${r.status}${Array.isArray(errors) && typeof errors[0] === "string" ? `: ${errors[0]}` : ""}`);
  }
  return json;
}

// ---- the scene ----

export const GALLERY_FONT_PX = 28;
/** Pixels per world unit at a point `depth` in front of the camera, on a canvas `heightPx` tall (the town camera's lens). */
export function captionPx(heightPx: number, depth: number): number {
  return heightPx / 2 / (TAN_HALF * depth);
}
const BACKGROUND = 0x2b3240;
const STRIP = 0x3d4658;
const OUTLINE_SOLID = 0xeef1f7;
const OUTLINE_DASHED = 0xffc247;
/** The copy the table has now: green, thick, and captioned `current`, so colour is never the only mark. */
const OUTLINE_CURRENT = 0x5ee08a;
const OUTLINE_CURRENT_DASHED = 0x5ee08a;

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
 * The gallery's scene: a thin ground strip under the line on a plain backdrop, lights from the front, and for every copy its lot outline, its model (a
 * clone from `lookup`, turned and scaled as the town does) and its caption, with each group's caption and the title once. Nothing in it can be raycast.
 * `lookup` may be null (the GLB is missing): outlines and captions still show, so the layout can be read.
 */
export function buildGalleryScene(layout: GalleryLayout, lookup: ModelLookup | null, opts: { surface?: TextSurfaceFactory; dpr?: number } = {}): GalleryScene {
  const surface = opts.surface ?? defaultTextSurface;
  const dpr = opts.dpr ?? 1;
  const scene = new Scene();
  scene.name = "gallery";
  scene.background = new Color(BACKGROUND);
  scene.add(new AmbientLight(0xffffff, 1.5));
  const sun = new DirectionalLight(0xffffff, 2.2);
  sun.position.set(-8, 14, 22);
  scene.add(sun);

  const owned: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(o: T): T => {
    owned.push(o);
    return o;
  };

  const { world } = layout.view;
  const ground = new Mesh(
    own(new PlaneGeometry(world.maxX - world.minX + 4, world.maxZ - world.minZ + 1)),
    own(new MeshStandardMaterial({ color: STRIP, roughness: 1, metalness: 0 })),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((world.minX + world.maxX) / 2, -0.01, (world.minZ + world.maxZ) / 2);
  ground.name = "gallery-ground";
  scene.add(ground);

  const material = (c: number): MeshBasicMaterial => own(new MeshBasicMaterial({ color: c, side: DoubleSide }));
  const solid = material(OUTLINE_SOLID);
  const dashed = material(OUTLINE_DASHED);
  const current = material(OUTLINE_CURRENT);
  const currentDashed = material(OUTLINE_CURRENT_DASHED);
  const sprites: { cs: CaptionSprite; at: readonly [number, number, number]; line: number }[] = [];
  const probe = new Vector3();
  /** `anchorY` 1 hangs the text below its anchor, 0 stands it on the anchor. */
  const captionOf = (lines: readonly string[], at: GalleryAnchor, anchorY: 0 | 1, line: number): void => {
    const cs = createCaptionSprite(surface, GALLERY_FONT_PX, dpr, false, anchorY);
    cs.draw(lines, "text");
    cs.sprite.position.set(at.x, at.y, at.z);
    own(cs.sprite.material);
    sprites.push({ cs, at: [at.x, at.y, at.z], line });
    scene.add(cs.sprite);
  };
  captionOf(layout.title, layout.titleAt, 0, COPY_LINE_UNITS);

  const models: Group[] = [];
  for (const group of layout.groups) {
    captionOf(group.caption, group.captionAt, 1, GROUP_LINE_UNITS);
    for (const s of group.slots) {
      const strip = s.current ? OUTLINE_STRIP_CURRENT : OUTLINE_STRIP;
      const o = new Mesh(own(flatGeometry(outlineStrips(s.outline.w, s.outline.d, s.dashed, strip), s.outline.cx, s.outline.cz, 0.02)), s.dashed ? (s.current ? currentDashed : dashed) : s.current ? current : solid);
      o.name = `outline:${s.name}:${s.front}`;
      scene.add(o);

      const wrap = new Group();
      wrap.name = `model:${s.name}:${s.front}`;
      wrap.position.set(s.x, 0, s.z);
      wrap.rotation.y = s.yaw;
      wrap.scale.setScalar(s.scale);
      const root = lookup?.(s.name);
      if (root) wrap.add(root.clone(true));
      scene.add(wrap);
      models.push(wrap);

      captionOf(s.caption, s.captionAt, 1, COPY_LINE_UNITS);
    }
  }
  noRay(scene);

  const lineH = Math.round(GALLERY_FONT_PX * 1.3);
  return {
    scene,
    models,
    setViewport(camera, heightPx) {
      // A caption line is `line` world units tall on screen at its own depth (the same perspective as the ground it sits on), so the text grows and
      // shrinks with the zoom and never outgrows the group it names.
      camera.updateMatrixWorld(true);
      for (const { cs, at, line } of sprites) {
        const depth = Math.max(0.1, -probe.set(at[0], at[1], at[2]).applyMatrix4(camera.matrixWorldInverse).z);
        cs.setUnit(scaleForPx((captionPx(heightPx, depth) * line) / lineH, heightPx, FOV_DEG));
      }
    },
    dispose() {
      for (const o of owned) o.dispose();
      for (const { cs } of sprites) cs.sprite.material.map?.dispose();
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
  /** Whether this is a dev build (ticket 045: the saved calibration is read only then). Default: `import.meta.env.DEV`. */
  dev?: boolean;
  /** How a choice is written (ticket 045 C). Default: a POST to the dev server's endpoint. */
  postJson?: SaveDeps["postJson"];
}

/**
 * The 3D view's gallery mode: the same interface as the town's renderer, so play and ui are unchanged. Draws the line instead of the puzzle;
 * the state, hover and Relight it is handed are ignored; nothing in the scene can be picked (`hitTest` is null). The wheel, the arrows, right-drag
 * and Home come from play's pan handler through getPan, setPan, zoomStep and resetView; the gallery adds, on its own canvas and document:
 * left-drag (a pan), End, and in a dev build the click (ticket 045 C: a press and release within CLICK_SLOP_PX on a copy chooses its side as the
 * door; Shift excludes), and Delete or Backspace (clears the last-clicked model). Choices are written through `createCalibrationSaver`.
 */
export function createGalleryRenderer3d(gl: WebGLRenderer, canvas: HTMLCanvasElement, packId: string, opts: GalleryRendererOptions): MapRenderer3d {
  const w0 = Math.max(canvas.clientWidth, 1);
  const h0 = Math.max(canvas.clientHeight, 1);
  const { page, pageSize } = galleryPageRequested(opts.search);
  let insets: Insets = { ...(opts.insets ?? {}) };
  const empty: GalleryLayout = galleryLayout(null, packId);
  let current: GalleryScene = buildGalleryScene({ ...empty, title: [`loading ${packId} ...`] }, null, { dpr: opts.dpr });
  const rig = createGalleryRig(empty.view, w0, h0, insets);
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

  const deps = opts.deps ?? defaultGalleryDeps();
  const dev = opts.dev ?? import.meta.env.DEV;
  const pageOpts = pageSize === null ? { page } : { page, pageSize };
  /** The layout on screen, the saver and editor (dev only, once the pack has loaded). */
  let onScreen: GalleryLayout = empty;
  let saver: CalibrationSaver | null = null;
  let editor: GalleryEditor | null = null;
  let shownFailure: string | null = null;

  /** Lays the line out again from the saver's copy of the file and swaps the scene in, keeping the camera's pan and zoom when `keepCamera`. */
  function show(pack: GalleryPack, file: CalibrationFile | null, info: ((m: string) => void) | undefined, keepCamera: boolean): void {
    const tables = effectiveFronts({ fronts: BUILDING_FRONTS, exclude: BUILDING_EXCLUDE }, file, info ?? (() => {}));
    const failure = saver?.failure() ?? null;
    shownFailure = failure?.reason ?? null;
    const layout = galleryLayout(pack.manifest, packId, tables.fronts, tables.exclude, { ...pageOpts, saved: file, notSaved: failure });
    const root = pack.root;
    const next = buildGalleryScene(layout, root ? (name) => root.getObjectByName(name) ?? undefined : null, { dpr: opts.dpr });
    current.dispose();
    current = next;
    onScreen = layout;
    if (keepCamera) rig.updateView(layout.view);
    else rig.setView(layout.view);
    sizeCaptions();
  }

  void Promise.all([loadGalleryPack(packId, deps), loadSavedCalibration({ dev, fetchJson: deps.fetchJson, ...(deps.info ? { info: deps.info } : {}) })])
    .then(([pack, saved]) => {
      if (disposed) {
        if (pack.root) freeModel(pack.root);
        return;
      }
      loaded = pack;
      if (dev && pack.manifest) {
        saver = createCalibrationSaver(saved, { postJson: opts.postJson ?? defaultPostJson }, (event) => {
          if (disposed || !loaded) return;
          // A reply that changes nothing on screen needs no new scene; a queued patch, a failure, or the end of one does.
          if (event === "saved" && shownFailure === null) return;
          show(loaded, saver?.file() ?? null, undefined, true);
        });
        editor = createGalleryEditor(() => onScreen, saver);
      }
      show(pack, saved, deps.info ?? ((m) => console.info(m)), false);
    })
    .catch((e: unknown) => console.info(`3D gallery: ${describe(e)}.`));

  // Left-drag along the line (a touch drag too), and End. Right-drag, the arrows, Home and the wheel are play's.
  // A left press and release within CLICK_SLOP_PX is a click, not a pan (dev only, ticket 045 C).
  let drag: { id: number; startX: number; startY: number; startPan: number } | null = null;
  const onDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    drag = { id: e.pointerId, startX: e.clientX, startY: e.clientY, startPan: rig.getPan().x };
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // A pointer that is already gone cannot be captured; the drag still works inside the canvas.
    }
  };
  const onMove = (e: PointerEvent): void => {
    if (!drag || e.pointerId !== drag.id) return;
    rig.setPan(drag.startPan + (e.clientX - drag.startX), 0);
  };
  const onUp = (e: PointerEvent): void => {
    if (!drag || e.pointerId !== drag.id) return;
    const down = drag;
    drag = null;
    if (!editor || !isGalleryClick({ x: down.startX, y: down.startY }, { x: e.clientX, y: e.clientY })) return;
    // A click does not move the line: undo the few pixels of pan it made.
    rig.setPan(down.startPan, 0);
    const r = canvas.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    const { origin, dir } = galleryRayAt(rig.camera, ((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    editor.click(origin, dir, e.shiftKey);
  };
  const onCancel = (e: PointerEvent): void => {
    if (drag && e.pointerId === drag.id) drag = null;
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const clear = e.key === "Delete" || e.key === "Backspace";
    if (e.key !== "End" && !(clear && editor)) return;
    const tag = (e.target as { tagName?: string } | null)?.tagName?.toLowerCase();
    if (tag === "select" || tag === "input" || tag === "textarea") return;
    if (clear) {
      if (editor?.clear()) e.preventDefault();
      return;
    }
    e.preventDefault();
    rig.jumpToEnd();
  };
  const doc = canvas.ownerDocument;
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onCancel);
  doc.addEventListener("keydown", onKey);
  const touchAction = canvas.style.touchAction;
  canvas.style.touchAction = "none";

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
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
      doc.removeEventListener("keydown", onKey);
      canvas.style.touchAction = touchAction;
      current.dispose();
      if (loaded?.root) freeModel(loaded.root);
    },
  };
}
